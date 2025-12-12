/* app.js - Nivesh Yatra demo
   - Defensive initialization
   - Simple localStorage holdings
   - Responsive canvas chart (no external libs)
*/

(function () {
  // Prevent double init if script accidentally included twice
  if (window.__NY_APP_STARTED__) {
    console.warn("NY app already started — aborting duplicate init.");
    return;
  }
  window.__NY_APP_STARTED__ = true;

  // ---------- Sample data ----------
  const STOCKS = [
    { id: "RELIANCE", title: "Reliance Industries Ltd", ticker: "RE", type: "stock", price: 1398.07 },
    { id: "TATAMOTORS", title: "Tata Motors", ticker: "TM", type: "stock", price: 1006.98 },
    { id: "ADANIGREEN", title: "Adani Green", ticker: "AG", type: "stock", price: 1181.45 },
    { id: "WIPRO", title: "Wipro", ticker: "W", type: "stock", price: 1485.01 },
    { id: "MRF", title: "MRF", ticker: "M", type: "stock", price: 1898.78 },
    { id: "HDFC", title: "HDFC", ticker: "H", type: "stock", price: 1846.28 },
    { id: "AFFLE", title: "Affle 3i Ltd", ticker: "AF", type: "stock", price: 410.22 }
  ];

  const FUNDS = [
    { id: "EDELWEISS_MIDCAP", title: "Edelweiss Nifty Midcap150 Momentum 50 Index Fund", ticker: "ED", type: "fund", price: 232.40 },
    { id: "HDFC_MID", title: "HDFC Mid Cap Fund", ticker: "HD", type: "fund", price: 132.76 },
    { id: "HDFC_SMALL", title: "HDFC Small Cap Fund", ticker: "HD", type: "fund", price: 276.12 },
    { id: "NIPPON_LARGE", title: "Nippon India Large Cap Fund", ticker: "NI", type: "fund", price: 220.45 },
    { id: "SBI_LARGE", title: "SBI Large Cap Fund", ticker: "SB", type: "fund", price: 198.12 },
    { id: "NIPPON_MID", title: "Nippon India Mid Cap Fund", ticker: "NM", type: "fund", price: 246.80 },
    { id: "NIPPON_SMALL", title: "Nippon India Small Cap Fund", ticker: "NS", type: "fund", price: 185.2 },
    { id: "HDFC_LARGE", title: "HDFC Large Cap Fund", ticker: "HL", type: "fund", price: 211.8 }
  ];

  // Quick merged array for display when "Stocks" selected show stocks list, "Funds" show funds list
  const DATA = {
    stocks: STOCKS,
    funds: FUNDS,
    portfolio: [] // computed
  };

  // ---------- DOM references ----------
  const itemsContainer = document.getElementById("itemsContainer");
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const navItems = Array.from(document.querySelectorAll(".navItem"));
  const assetsValue = document.getElementById("assetsValue");
  const assetsChange = document.getElementById("assetsChange");
  const assetsHoldings = document.getElementById("assetsHoldings");

  // Modal elements
  const modal = document.getElementById("detailModal");
  const closeModalBtn = document.getElementById("closeModal");
  const modalName = document.getElementById("modalName");
  const modalSub = document.getElementById("modalSub");
  const modalBadge = document.getElementById("modalBadge");
  const modalPrice = document.getElementById("modalPrice");
  const detailChart = document.getElementById("detailChart");
  const periodButtons = document.getElementById("periodButtons");
  const tradeQty = document.getElementById("tradeQty");
  const buyBtn = document.getElementById("buyBtn");
  const sellBtn = document.getElementById("sellBtn");
  const sipBtn = document.getElementById("sipBtn");

  // Local storage key for holdings
  const STORAGE_KEY = "ny_holdings_v1";

  // Load holdings map: id -> { qty, avgPrice }
  function loadHoldings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (e) {
      console.error("Failed to parse holdings:", e);
      return {};
    }
  }
  function saveHoldings(map) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }
  let holdings = loadHoldings();

  // ---------- Helpers ----------
  function formatPrice(v) {
    return "₹" + Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  function pctChange(current, base) {
    if (!base || base === 0) return 0;
    return ((current - base) / base) * 100;
  }

  // Update header assets summary from holdings
  function recomputeAssets() {
    let totalValue = 0;
    let totalInvested = 0;
    let holdingCount = 0;
    for (const id in holdings) {
      const h = holdings[id];
      if (!h || !h.qty) continue;
      holdingCount += 1;
      // find price: search in stocks & funds
      const item = [...STOCKS, ...FUNDS].find(x => x.id === id);
      const currentPrice = item ? item.price : 0;
      totalValue += currentPrice * h.qty;
      totalInvested += (h.avgPrice || currentPrice) * h.qty;
    }
    const pl = totalValue - totalInvested;
    const pct = totalInvested ? (pl / totalInvested) * 100 : 0;
    assetsValue.textContent = formatPrice(totalValue || 0);
    const sign = pl >= 0 ? "+" : "-";
    assetsChange.textContent = `${sign}${formatPrice(Math.abs(pl))} (${pct.toFixed(2)}%)`;
    assetsHoldings.textContent = `Holdings: ${holdingCount}`;
  }

  // Build single item card
  function createItemCard(item) {
    const card = document.createElement("div");
    card.className = "itemCard clickable";
    card.setAttribute("role", "listitem");
    card.dataset.itemId = item.id;

    const left = document.createElement("div");
    left.className = "itemLeft";

    const badge = document.createElement("div");
    badge.className = "itemBadge";
    badge.textContent = item.ticker || item.id.slice(0, 2);

    const info = document.createElement("div");
    info.className = "itemInfo";

    const title = document.createElement("div");
    title.className = "itemTitle";
    title.textContent = item.title;

    const sub = document.createElement("div");
    sub.className = "itemSub";
    sub.textContent = (item.type === "stock" ? "Stock | " : "Fund | ") + item.id;

    info.appendChild(title);
    info.appendChild(sub);

    left.appendChild(badge);
    left.appendChild(info);

    const right = document.createElement("div");
    right.className = "itemRight";

    // If the item is currently owned, show P/L arrow indicator
    const owned = holdings[item.id] && holdings[item.id].qty > 0;
    if (owned) {
      const pl = computePLForItem(item);
      const arrow = document.createElement("div");
      arrow.className = "itemArrow " + (pl >= 0 ? "up" : "down");
      const arrowSym = pl >= 0 ? "▲" : "▼";
      arrow.textContent = `${arrowSym} ${Math.abs(pl).toFixed(2)}%`;
      right.appendChild(arrow);
    }

    const price = document.createElement("div");
    price.className = "itemPrice";
    price.textContent = formatPrice(item.price);
    right.appendChild(price);

    card.appendChild(left);
    card.appendChild(right);

    // Click shows details
    card.addEventListener("click", () => {
      openDetails(item);
    });

    return card;
  }

  function computePLForItem(item) {
    const h = holdings[item.id];
    if (!h || !h.qty) return 0;
    const current = item.price;
    const avg = h.avgPrice || current;
    return pctChange(current, avg);
  }

  // Render list for a tab
  function renderList(tab) {
    itemsContainer.innerHTML = ""; // clear
    let items = [];
    if (tab === "stocks") items = STOCKS.slice();
    else if (tab === "funds") items = FUNDS.slice();
    else items = [...STOCKS, ...FUNDS].filter(it => holdings[it.id] && holdings[it.id].qty > 0);

    if (!items.length) {
      const p = document.createElement("div");
      p.style.padding = "36px 6px";
      p.style.color = "rgba(255,255,255,0.7)";
      p.textContent = tab === "portfolio" ? "Your portfolio is empty." : `No ${tab} to display right now.`;
      itemsContainer.appendChild(p);
      return;
    }

    items.forEach(it => {
      const card = createItemCard(it);
      itemsContainer.appendChild(card);
    });
  }

  // Tab switching
  function setActiveTab(tabName) {
    // UI tab buttons
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabName));
    // nav bottom
    navItems.forEach(n => n.classList.toggle("active", n.dataset.section === tabName));
    // heading and content
    const h = document.querySelector(".pageHeading");
    h.textContent = tabName === "stocks" ? "Buy Stocks" : (tabName === "funds" ? "Mutual Funds" : "Your Portfolio");
    renderList(tabName);
  }

  // attach tab listeners
  tabs.forEach(t => t.addEventListener("click", () => setActiveTab(t.dataset.tab)));
  navItems.forEach(n => n.addEventListener("click", () => setActiveTab(n.dataset.section)));

  // Modal open/close
  let currentItem = null;
  function openDetails(item) {
    currentItem = item;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    modalName.textContent = item.title;
    modalSub.textContent = (item.type === "stock" ? "Stock | " : "Fund | ") + item.id;
    modalBadge.textContent = item.ticker || item.id.slice(0,2);
    modalPrice.textContent = formatPrice(item.price);

    // sync qty input default if own
    const own = holdings[item.id] || { qty: 1 };
    tradeQty.value = own.qty || 1;

    // Setup chart to current item
    chartRender(item, "1D");
  }
  function closeDetails() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    currentItem = null;
  }
  closeModalBtn.addEventListener("click", closeDetails);
  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) closeDetails();
  });

  // Period buttons
  periodButtons.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-period]");
    if (!btn) return;
    const period = btn.dataset.period;
    Array.from(periodButtons.querySelectorAll(".periodBtn")).forEach(b => b.classList.toggle("active", b === btn));
    if (currentItem) chartRender(currentItem, period);
  });

  // Trade operations
  function doTrade(type) {
    if (!currentItem) return;
    let qty = parseInt(tradeQty.value || 1, 10);
    if (!qty || qty <= 0) {
      alert("Enter a valid quantity");
      return;
    }
    const id = currentItem.id;
    if (type === "buy") {
      const prev = holdings[id] || { qty: 0, avgPrice: 0 };
      const newQty = prev.qty + qty;
      // weighted avg
      const newAvg = ((prev.avgPrice || 0) * prev.qty + currentItem.price * qty) / newQty;
      holdings[id] = { qty: newQty, avgPrice: Number(newAvg.toFixed(2)) };
      saveHoldings(holdings);
      recomputeAssets();
      setActiveTab("stocks"); // return to list and reflect arrow
    } else if (type === "sell") {
      const prev = holdings[id] || { qty: 0, avgPrice: 0 };
      const sellQty = Math.min(prev.qty, qty);
      if (!sellQty) { alert("You don't own any shares to sell."); return; }
      const newQty = prev.qty - sellQty;
      if (newQty <= 0) delete holdings[id];
      else holdings[id] = { qty: newQty, avgPrice: prev.avgPrice };
      saveHoldings(holdings);
      recomputeAssets();
      setActiveTab("portfolio");
    } else if (type === "sip") {
      // simple SIP: buy small recurring. For demo just buy current quantity
      doTrade("buy");
    }
    // re-render list so arrows and counts update
    setActiveTab(getActiveTabName());
  }
  buyBtn.addEventListener("click", () => doTrade("buy"));
  sellBtn.addEventListener("click", () => doTrade("sell"));
  sipBtn.addEventListener("click", () => doTrade("sip"));

  // utility: active tab name
  function getActiveTabName() {
    const t = tabs.find(x => x.classList.contains("active"));
    return t ? t.dataset.tab : "stocks";
  }

  // ---------- Chart rendering (simple canvas plot) ----------
  const ctx = detailChart.getContext("2d");
  let currentChartMesh = null;

  function resizeCanvasForDevicePixelRatio(canvas) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    // avoid zero sizes
    if (w === 0 || h === 0) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function generateFakeSeries(base, points = 40, volatility = 0.02) {
    // generate a plausible-looking series around base
    const arr = [];
    let val = base;
    for (let i = 0; i < points; i++) {
      const rnd = (Math.random() - 0.5) * volatility * base;
      val = Math.max(1, val + rnd + (Math.sin(i * 0.2) * base * volatility * 0.4));
      arr.push(val);
    }
    return arr;
  }

  // Draw grid + line
  function drawChart(series) {
    if (!Array.isArray(series) || series.length === 0) return;

    resizeCanvasForDevicePixelRatio(detailChart);

    const w = detailChart.width / (window.devicePixelRatio || 1);
    const h = detailChart.height / (window.devicePixelRatio || 1);
    const pad = { l: 36, r: 10, t: 12, b: 18 };

    // clear
    ctx.clearRect(0, 0, w, h);

    // background subtle grid
    ctx.fillStyle = "#061418";
    ctx.fillRect(0, 0, w, h);

    // grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    const rows = 4, cols = 4;
    for (let i = 0; i <= rows; i++) {
      const y = pad.t + (i * (h - pad.t - pad.b) / rows);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
    }

    // compute scale
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = Math.max(1, max - min);
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;

    // draw line
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#15d08a"; // green line
    ctx.lineJoin = ctx.lineCap = "round";
    for (let i = 0; i < series.length; i++) {
      const x = pad.l + (i / (series.length - 1)) * innerW;
      const y = pad.t + innerH - ((series[i] - min) / range) * innerH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // axis labels (right side) - sample ticks
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "12px system-ui, Arial";
    for (let i = 0; i <= rows; i++) {
      const v = (max - (i * range / rows));
      const y = pad.t + (i * (innerH / rows));
      ctx.fillText(Math.round(v).toString(), w - pad.r - 6 - ctx.measureText(Math.round(v).toString()).width, y + 4);
    }
  }

  // High-level: render chart for item + period
  function chartRender(item, period) {
    if (!item) return;
    // Simple mapping: more period => more points & different volatility
    let points = 40, vol = 0.02;
    if (period === "1D") { points = 40; vol = 0.012; }
    if (period === "1W") { points = 56; vol = 0.02; }
    if (period === "1M") { points = 80; vol = 0.035; }
    if (period === "6M") { points = 120; vol = 0.06; }
    if (period === "1Y") { points = 200; vol = 0.12; }

    // generate synthetic series but deterministic-ish by using seed from id & period
    const base = item.price || 100;
    const series = generateFakeSeries(base, points, vol);
    // draw
    drawChart(series);
    currentChartMesh = { itemId: item.id, period, series };
  }

  // Handle window resize (redraw chart)
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (currentChartMesh) drawChart(currentChartMesh.series);
    }, 200);
  });

  // ---------- Startup rendering ----------
  function init() {
    // Defensive: ensure container exists
    if (!itemsContainer) {
      console.error("Missing itemsContainer node - cannot render UI.");
      return;
    }

    // Compose initial list - default to stocks
    setActiveTab("stocks");
    recomputeAssets();

    // Attach modal keyboard closing
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        closeDetails();
      }
    });

    // Basic debug: show in console needed info
    console.info("Nivesh Yatra demo initialized. Holdings loaded:", holdings);
  }

  // Run init after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // expose minimal debug helpers (useful in dev console)
  window.__NY_DEBUG = {
    holdings,
    saveHoldings: () => saveHoldings(holdings),
    recomputeAssets,
    openDetails,
    renderList,
    setActiveTab
  };
})();
