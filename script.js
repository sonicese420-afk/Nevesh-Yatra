/* script.js — complete replacement
   Features:
   - Stocks + Mutual Funds lists (from your list)
   - Buy stocks / add fund units
   - Save/load portfolio from localStorage
   - Render Stocks | Funds | Portfolio tabs (bottom nav)
   - Portfolio: shows holdings, P/L, and opens 6-month Chart (fixed height)
   - Chart.js usage with maintainAspectRatio:false to avoid stretching
*/

/* -------------------- Data -------------------- */
const stocks = {
  "Tata Motors": randomBetween(600, 950),
  "Adani Green": randomBetween(820, 1500),
  "Wipro": randomBetween(220, 360),
  "MRF": randomBetween(90000, 150000),
  "Reliance": randomBetween(1400, 1800),
  "HDFC": randomBetween(1100, 1600),
  "Affle 3i Ltd": randomBetween(100, 200)
};

const mutualFunds = [
  "Edelweiss Nifty Midcap150 Momentum 50 Index Fund",
  "HDFC Mid Cap Fund",
  "HDFC Small Cap Fund",
  "Nippon India Large Cap Fund",
  "SBI Large Cap Fund",
  "Nippon India Growth Mid Cap Fund",
  "Nippon India Small Cap Fund",
  "HDFC Large Cap Fund"
];

/* portfolio structure saved in localStorage key 'ny_portfolio'
   {
     stocks: { "Tata Motors": { qty: 2, avgPrice: 800 } ... },
     funds: { "HDFC Mid Cap Fund": { units: 10, avgPrice: 200 } ... }
   }
*/
const STORAGE_KEY = "ny_portfolio";
let portfolio = loadPortfolio();

/* Chart instances */
let detailChart = null;
let portfolioChart = null;

/* -------------------- Utilities -------------------- */
function randomBetween(a, b) {
  return +(Math.random() * (b - a) + a).toFixed(2);
}
function formatCurrency(n) {
  return "₹" + Number(n).toLocaleString();
}
function savePortfolio() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
}
function loadPortfolio() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { stocks: {}, funds: {} };
  try { return JSON.parse(raw); } catch (e) { return { stocks: {}, funds: {} }; }
}

/* -------------------- DOM helpers (create if missing) -------------------- */
function ensureEl(selector, tag = "div", parent = document.body) {
  let e = document.querySelector(selector);
  if (!e) {
    e = document.createElement(tag);
    e.id = selector.replace("#", "");
    parent.appendChild(e);
  }
  return e;
}

/* Create layout containers if not present */
const header = ensureEl("#ny_header", "header");
const main = ensureEl("#ny_main", "main");
const footerNav = ensureEl("#ny_nav", "nav");

/* Panels */
const stocksPanel = ensureEl("#ny_stocks_panel", "section", main);
const fundsPanel = ensureEl("#ny_funds_panel", "section", main);
const portfolioPanel = ensureEl("#ny_portfolio_panel", "section", main);

/* Summary elements */
const assetsBox = ensureEl("#ny_assets_box", "div", header);
const assetsTotalEl = ensureEl("#assetsTotal", "div", assetsBox);
const assetsCountEl = ensureEl("#assetsCount", "div", assetsBox);
const dailyChangeEl = ensureEl("#dailyChange", "div", assetsBox);

/* Tab nav (bottom) — create 3 buttons if not present */
if (!document.querySelector("#navStocks")) {
  footerNav.className = "ny-bottom-nav";
  footerNav.innerHTML = `
    <button id="navStocks" class="ny-nav-btn">Stocks</button>
    <button id="navFunds" class="ny-nav-btn">Funds</button>
    <button id="navPortfolio" class="ny-nav-btn">Portfolio</button>
  `;
}

/* ensure a modal container for charts */
const modalWrap = ensureEl("#ny_modal", "div", document.body);
modalWrap.classList.add("ny-modal");
modalWrap.innerHTML = `
  <div class="ny-modal-content" id="ny_modal_content" style="display:none;">
    <button id="ny_modal_close">Close</button>
    <canvas id="ny_detail_chart" style="width:100%;height:260px;"></canvas>
  </div>
`;

/* -------------------- Rendering -------------------- */

function renderHeader() {
  header.innerHTML = `
    <div class="brand">
      <img src="${getLogoBlobURL()}" alt="logo" style="width:56px;height:56px;border-radius:8px;object-fit:cover;margin-right:12px"/>
      <div>
        <div style="font-weight:700;font-size:18px">Nivesh Yatra</div>
        <div style="font-size:12px;opacity:.8">Turning dreams into Assets.</div>
      </div>
    </div>
  `;
  // assets box
  assetsBox.style.marginTop = "12px";
  assetsBox.style.padding = "12px 0";
  updateAssetsSummary();
}

function renderNavActive(activeId) {
  document.querySelectorAll(".ny-nav-btn").forEach(b => b.classList.remove("active"));
  const el = document.querySelector(activeId);
  if (el) el.classList.add("active");
}

/* Create card for each stock with buy control */
function renderStocksPanel() {
  stocksPanel.innerHTML = `<h2>Buy Stocks</h2><div id="ny_stocks_list"></div>`;
  const list = stocksPanel.querySelector("#ny_stocks_list");
  list.innerHTML = "";
  Object.keys(stocks).forEach(name => {
    const price = stocks[name];
    const card = document.createElement("div");
    card.className = "ny-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${name}</div>
          <div style="font-size:18px;margin-top:6px">${formatCurrency(price)}</div>
        </div>
        <div style="min-width:160px;text-align:right">
          <input type="number" min="1" step="1" value="1" class="qty-input" style="width:72px;padding:8px;border-radius:8px"/>
          <button class="buy-btn" style="margin-left:8px;padding:10px 12px;border-radius:10px;background:#1abc9c;color:#fff;border:none">Buy</button>
        </div>
      </div>
    `;
    list.appendChild(card);

    const qtyInput = card.querySelector(".qty-input");
    const buyBtn = card.querySelector(".buy-btn");
    buyBtn.addEventListener("click", () => {
      const qty = Math.max(1, Number(qtyInput.value) || 1);
      buyStock(name, qty, stocks[name]);
    });
    // clicking the card title shows small history
    card.querySelector("div").addEventListener("click", (e) => {
      // only open details if clicked on left area (avoid when clicking buy)
      if (!e.target.closest(".buy-btn") && !e.target.closest(".qty-input")) {
        showHoldingChart(name, "stock");
      }
    });
  });
}

/* Create funds panel */
function renderFundsPanel() {
  fundsPanel.innerHTML = `<h2>Mutual Funds</h2><div id="ny_funds_list"></div>`;
  const list = fundsPanel.querySelector("#ny_funds_list");
  list.innerHTML = "";
  mutualFunds.forEach(name => {
    const card = document.createElement("div");
    card.className = "ny-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${name}</div>
          <div style="font-size:14px;margin-top:6px;opacity:.8">N/A (simulated)</div>
        </div>
        <div style="min-width:140px;text-align:right">
          <input type="number" min="1" step="1" value="1" class="qty-input" style="width:72px;padding:8px;border-radius:8px"/>
          <button class="add-btn" style="margin-left:8px;padding:10px 12px;border-radius:10px;background:#2f8cff;color:#fff;border:none">Add</button>
        </div>
      </div>
    `;
    list.appendChild(card);
    const qtyInput = card.querySelector(".qty-input");
    const addBtn = card.querySelector(".add-btn");
    addBtn.addEventListener("click", () => {
      const units = Math.max(1, Number(qtyInput.value) || 1);
      // simulate an NAV for this add action
      const price = randomBetween(80, 250);
      addFund(name, units, price);
    });
    card.querySelector("div").addEventListener("click", (e) => {
      if (!e.target.closest(".add-btn") && !e.target.closest(".qty-input")) showHoldingChart(name, "fund");
    });
  });
}

/* Portfolio panel: list holdings + totals + click to chart */
function renderPortfolioPanel() {
  portfolioPanel.innerHTML = `<h2>Your Portfolio</h2><div id="ny_portfolio_list"></div><canvas id="ny_portfolio_chart" style="width:100%;height:260px;margin-top:14px"></canvas>`;
  const list = portfolioPanel.querySelector("#ny_portfolio_list");
  list.innerHTML = "";

  let holdingsCount = 0, totalValue = 0, totalInvested = 0;

  // stocks
  for (const [name, data] of Object.entries(portfolio.stocks)) {
    holdingsCount++;
    const current = stocks[name] || randomBetween(100, 1000);
    const value = current * data.qty;
    totalValue += value;
    totalInvested += data.avgPrice * data.qty;

    const item = document.createElement("div");
    item.className = "ny-card ny-holding";
    item.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${name} <span style="font-weight:400;font-size:12px;color:var(--muted)">(${data.qty} qty)</span></div>
          <div style="margin-top:6px">${formatCurrency(current)} <span style="font-size:12px;opacity:.8"> (bought ${formatCurrency(data.avgPrice)})</span></div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700">${formatCurrency(value)}</div>
          <div style="font-size:12px;color:${value - data.avgPrice*data.qty >= 0 ? '#2ecc71' : '#e74c3c'}">${value - data.avgPrice*data.qty >= 0 ? '▲' : '▼'} ${formatCurrency(Math.abs(value - data.avgPrice*data.qty))}</div>
        </div>
      </div>
    `;
    list.appendChild(item);
    item.addEventListener("click", () => showHoldingChart(name, "stock"));
  }

  // funds
  for (const [name, data] of Object.entries(portfolio.funds)) {
    holdingsCount++;
    // simulate current NAV for display
    const currentNav = data.avgPrice + randomBetween(-10, 30);
    const value = currentNav * data.units;
    totalValue += value;
    totalInvested += data.avgPrice * data.units;

    const item = document.createElement("div");
    item.className = "ny-card ny-holding";
    item.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${name} <span style="font-weight:400;font-size:12px;color:var(--muted)">(${data.units} units)</span></div>
          <div style="margin-top:6px">${formatCurrency(currentNav)} <span style="font-size:12px;opacity:.8"> (bought ${formatCurrency(data.avgPrice)})</span></div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700">${formatCurrency(value)}</div>
          <div style="font-size:12px;color:${value - data.avgPrice*data.units >= 0 ? '#2ecc71' : '#e74c3c'}">${value - data.avgPrice*data.units >= 0 ? '▲' : '▼'} ${formatCurrency(Math.abs(value - data.avgPrice*data.units))}</div>
        </div>
      </div>
    `;
    list.appendChild(item);
    item.addEventListener("click", () => showHoldingChart(name, "fund"));
  }

  assetsTotalEl.textContent = formatCurrency(totalValue);
  assetsCountEl.textContent = `Holdings: ${holdingsCount}`;
  const change = totalValue - totalInvested;
  dailyChangeEl.textContent = `P/L: ${change >= 0 ? '▲' : '▼'} ${formatCurrency(Math.abs(change))}`;

  // portfolio combined chart: show total invested vs current value across months (simulate)
  renderPortfolioCombinedChart(totalInvested || 0, totalValue || 0);
}

/* -------------------- Actions -------------------- */

function buyStock(name, qty, price) {
  const existing = portfolio.stocks[name];
  if (!existing) {
    portfolio.stocks[name] = { qty, avgPrice: price };
  } else {
    // update avg price
    const totalQty = existing.qty + qty;
    const totalCost = existing.avgPrice * existing.qty + price * qty;
    existing.qty = totalQty;
    existing.avgPrice = +(totalCost / totalQty).toFixed(2);
  }
  savePortfolio();
  renderPortfolioPanel();
  renderStocksPanel();
  updateAssetsSummary();
}

function addFund(name, units, nav) {
  const existing = portfolio.funds[name];
  if (!existing) {
    portfolio.funds[name] = { units, avgPrice: nav };
  } else {
    const totalUnits = existing.units + units;
    const totalCost = existing.avgPrice * existing.units + nav * units;
    existing.units = totalUnits;
    existing.avgPrice = +(totalCost / totalUnits).toFixed(2);
  }
  savePortfolio();
  renderFundsPanel();
  renderPortfolioPanel();
  updateAssetsSummary();
}

function updateAssetsSummary() {
  // quick summary: compute current portfolio totals
  let totalValue = 0, invested = 0;
  for (const [name, d] of Object.entries(portfolio.stocks)) {
    const cur = stocks[name] || d.avgPrice;
    totalValue += cur * d.qty;
    invested += d.avgPrice * d.qty;
  }
  for (const [name, d] of Object.entries(portfolio.funds)) {
    const cur = d.avgPrice + randomBetween(-10, 30);
    totalValue += cur * d.units;
    invested += d.avgPrice * d.units;
  }
  assetsTotalEl.textContent = formatCurrency(totalValue);
  const pl = totalValue - invested;
  dailyChangeEl.textContent = `P/L ${pl >= 0 ? '▲' : '▼'} ${formatCurrency(Math.abs(pl))}`;
  assetsCountEl.textContent = `Holdings: ${Object.keys(portfolio.stocks).length + Object.keys(portfolio.funds).length}`;
}

/* -------------------- Charts -------------------- */

/* generate synthetic 7-point history for "6 months" (6 months + now) */
function generate6MonthHistory(basePrice) {
  const out = [];
  let p = basePrice;
  // go back 6 months by applying random changes
  for (let i = 6; i >= 0; i--) {
    // simulate some progression — less volatile for large-cap, more for small
    const vol = Math.max(1, basePrice * 0.04) * (Math.random() * 1.2);
    p = +(basePrice + (Math.random() - 0.5) * vol * (i / 3)).toFixed(2);
    out.push(Math.max(1, p));
  }
  // ensure last point near basePrice
  out[out.length - 1] = +basePrice.toFixed(2);
  return out;
}

function ensureCanvasHeight(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.style.height = "260px";
}

/* Show a chart for a single holding (stock or fund) */
function showHoldingChart(name, type) {
  const modalContent = document.getElementById("ny_modal_content");
  const modal = document.getElementById("ny_modal");
  const canvasId = "ny_detail_chart";
  const canvas = document.getElementById(canvasId);

  // determine base price
  let base = 100;
  if (type === "stock") base = stocks[name] || (portfolio.stocks[name] && portfolio.stocks[name].avgPrice) || 100;
  else base = (portfolio.funds[name] && portfolio.funds[name].avgPrice) || 120;

  const history = generate6MonthHistory(base);
  const labels = ["6m","5m","4m","3m","2m","1m","Now"];

  // set canvas height explicitly (fixes stretching)
  canvas.style.height = "260px";

  // destroy if exists
  if (detailChart) detailChart.destroy();

  const ctx = canvas.getContext("2d");
  detailChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: `${name} - last 6 months`,
        data: history,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#2f8cff",
        borderColor: "#2f8cff",
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // crucial to prevent stretching
      plugins: { legend: { display: true } },
      scales: {
        y: {
          ticks: { callback: v => formatCurrency(v) }
        },
        x: { grid: { display: false } }
      }
    }
  });

  // show modal
  modalContent.style.display = "block";
}

/* Combined portfolio chart (small simulation) */
function renderPortfolioCombinedChart(investedValue, currentValue) {
  const canvasId = "ny_portfolio_chart";
  ensureCanvasHeight(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (portfolioChart) portfolioChart.destroy();
  const ctx = canvas.getContext("2d");

  // create a simple 7-point line series for invested vs current
  const investedSeries = generate6MonthHistory(investedValue || 1000);
  const currentSeries = generate6MonthHistory(currentValue || 1200);

  portfolioChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["6m","5m","4m","3m","2m","1m","Now"],
      datasets: [
        { label: "Invested", data: investedSeries, borderColor: "#999", borderWidth: 1.5, tension:0.2 },
        { label: "Current", data: currentSeries, borderColor: "#2ecc71", borderWidth: 2, tension:0.3 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { ticks: { callback: v => formatCurrency(v) } }, x: { grid: { display: false } } }
    }
  });
}

/* -------------------- Modal hooks -------------------- */
document.getElementById("ny_modal_close").addEventListener("click", () => {
  document.getElementById("ny_modal_content").style.display = "none";
});

/* -------------------- Bottom nav hooks -------------------- */
document.getElementById("navStocks").addEventListener("click", () => {
  stocksPanel.style.display = "block";
  fundsPanel.style.display = "none";
  portfolioPanel.style.display = "none";
  renderNavActive("#navStocks");
});
document.getElementById("navFunds").addEventListener("click", () => {
  stocksPanel.style.display = "none";
  fundsPanel.style.display = "block";
  portfolioPanel.style.display = "none";
  renderNavActive("#navFunds");
});
document.getElementById("navPortfolio").addEventListener("click", () => {
  stocksPanel.style.display = "none";
  fundsPanel.style.display = "none";
  portfolioPanel.style.display = "block";
  renderNavActive("#navPortfolio");
});

/* -------------------- Init UI -------------------- */
function initialRender() {
  // apply minimal styling to created elements
  document.body.style.background = getComputedStyle(document.body).background || "#f5f8fa";
  stocksPanel.style.display = "block";
  fundsPanel.style.display = "none";
  portfolioPanel.style.display = "none";

  // render everything
  renderHeader();
  renderStocksPanel();
  renderFundsPanel();
  renderPortfolioPanel();

  // set active nav
  renderNavActive("#navStocks");
}

/* -------------------- Logo support -------------------- */
/* The script attempts to use a provided logo image path in a file input or the default blob we uploaded.
   We will try to load a global <img id="ny_logo"> if exists; otherwise use the uploaded design blob URL (fallback).
*/
function getLogoBlobURL() {
  // if the page has an element with id ny_logo and a src, use it
  const pageLogo = document.getElementById("ny_logo");
  if (pageLogo && pageLogo.src) return pageLogo.src;
  // fallback: use embedded base64 or placeholder (we use data-URL placeholder green box)
  // If you placed an image at /A_logo_design_design_features_a_square_icon_with_r.png on server, use that path:
  if (typeof window.NY_CUSTOM_LOGO_URL !== 'undefined') return window.NY_CUSTOM_LOGO_URL;
  // default placeholder (simple SVG data URL using teal background)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='100%' height='100%' fill='#476d75' rx='20'/><g fill='white' transform='translate(60,60)'><path d='M150 110 l50 -60 l40 20 l-50 60 z' opacity='.95'/></g></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/* -------------------- Start app -------------------- */
initialRender();

/* Expose some things for manual debugging in console */
window.NY = {
  portfolio,
  buyStock,
  addFund,
  savePortfolio,
  renderAll: () => { renderStocksPanel(); renderFundsPanel(); renderPortfolioPanel(); updateAssetsSummary(); }
};
