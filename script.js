/* ============================================================================
   Nivesh Yatra — script.js
   - Render stocks & funds lists
   - Tab and navigation handling
   - Full-screen detail overlay with canvas chart
   - ResizeObserver + DPR-correct canvas sizing to prevent stretching
   - Buy / Sell / SIP flows (simulated) with localStorage persistence
   ============================================================================ */

'use strict';

/* ---------------------------
   Mock data sources (editable)
   --------------------------- */
const STOCKS = [
  { id: 'RELI', ticker: 'RELIANCE', short: 'RE', name: 'Reliance Industries Ltd', price: 1398.07 },
  { id: 'TATM', ticker: 'TATAMOTORS', short: 'TM', name: 'Tata Motors', price: 1006.98 },
  { id: 'ADGN', ticker: 'ADANIGREEN', short: 'AG', name: 'Adani Green', price: 1181.45 },
  { id: 'WIPR', ticker: 'WIPRO', short: 'W', name: 'Wipro', price: 1485.01 },
  { id: 'MRF', ticker: 'MRF', short: 'M', name: 'MRF', price: 1898.78 },
  { id: 'HDFC', ticker: 'HDFC', short: 'H', name: 'HDFC', price: 1846.28 },
  { id: 'AFFL', ticker: 'AFFLE', short: 'AF', name: 'Affle 3i Ltd', price: 410.22 }
];

const FUNDS = [
  { id: 'EDEL', code: 'EDEL', name: 'Edelweiss Nifty Midcap150 Momentum 50 Index Fund', price: 232.4 },
  { id: 'HDFM', code: 'HDFCMID', name: 'HDFC Mid Cap Fund', price: 132.76 },
  { id: 'HDFSC', code: 'HDFCSM', name: 'HDFC Small Cap Fund', price: 276.12 },
  { id: 'NIPL', code: 'NIPPL', name: 'Nippon India Large Cap Fund', price: 219.33 },
  { id: 'SBIL', code: 'SBIL', name: 'SBI Large Cap Fund', price: 189.44 },
  { id: 'NIPM', code: 'NIPPM', name: 'Nippon India Mid Cap Fund', price: 160.55 },
  { id: 'NIPS', code: 'NIPPS', name: 'Nippon India Small Cap Fund', price: 102.97 },
  { id: 'HDFLC', code: 'HDFLC', name: 'HDFC Large Cap Fund', price: 321.21 }
];

/* ---------------------------
   holdings / persistence
   --------------------------- */
const STORAGE_KEY = 'ny_holdings_v1';
function loadHoldings(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { stocks: {}, funds: {} };
    return JSON.parse(raw);
  }catch(e){
    console.error('loadHoldings parse error', e);
    return { stocks: {}, funds: {} };
  }
}
function saveHoldings(h){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  }catch(e){
    console.error('saveHoldings error', e);
  }
}
let holdings = loadHoldings();

/* ---------------------------
   tiny DOM helpers
   --------------------------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function formatINR(n){
  if(typeof n !== 'number') n = Number(n) || 0;
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

/* ---------------------------
   Render functions
   --------------------------- */

function renderStocks(){
  const root = $('#stocksList');
  if(!root) return console.error('stocksList root missing');
  root.innerHTML = '';
  STOCKS.forEach(stock => {
    const el = document.createElement('div');
    el.className = 'item';
    const owned = holdings.stocks[stock.short];
    const ownedHtml = owned ? `<div style="margin-top:8px;color:var(--muted);font-weight:700">Qty: ${owned.qty} @ ${formatINR(owned.avg)}</div>` : '';
    el.innerHTML = `
      <div class="left">
        <div class="avatar" aria-hidden="true">${stock.short}</div>
        <div class="meta">
          <div class="name">${stock.name}</div>
          <div class="sub">Stock | ${stock.ticker}</div>
          ${ownedHtml}
        </div>
      </div>
      <div class="price">${formatINR(stock.price)} ${owned ? '<small>owned</small>' : ''}</div>
    `;
    el.addEventListener('click', () => openDetail('stock', stock.id));
    root.appendChild(el);
  });
}

function renderFunds(){
  const root = $('#fundsList');
  if(!root) return console.error('fundsList root missing');
  root.innerHTML = '';
  FUNDS.forEach(fund => {
    const el = document.createElement('div');
    el.className = 'item';
    const owned = holdings.funds[fund.code];
    const ownedHtml = owned ? `<div style="margin-top:8px;color:var(--muted);font-weight:700">Units: ${owned.units} @ ${formatINR(owned.avg)}</div>` : '';
    el.innerHTML = `
      <div class="left">
        <div class="avatar">${fund.code.substring(0,2)}</div>
        <div class="meta">
          <div class="name">${fund.name}</div>
          <div class="sub">Fund | ${fund.code}</div>
          ${ownedHtml}
        </div>
      </div>
      <div class="price">${formatINR(fund.price)}</div>
    `;
    el.addEventListener('click', () => openDetail('fund', fund.id));
    root.appendChild(el);
  });
}

function renderPortfolio(){
  const root = $('#portfolioList');
  if(!root) return console.error('portfolioList root missing');
  root.innerHTML = '';
  const stkKeys = Object.keys(holdings.stocks || {});
  const fundKeys = Object.keys(holdings.funds || {});
  if(stkKeys.length === 0 && fundKeys.length === 0){
    root.innerHTML = '<div class="empty">You own nothing yet. Buy stocks or funds to see them here.</div>';
    return;
  }
  stkKeys.forEach(sym => {
    const h = holdings.stocks[sym];
    const s = STOCKS.find(x => x.short === sym);
    if(!s) return;
    const pl = computeMockPLPercent(s.price, h.avg);
    const arrow = pl >= 0 ? '▲' : '▼';
    const col = pl >= 0 ? 'var(--accent)' : '#ff5b5b';
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div class="left">
        <div class="avatar">${s.short}</div>
        <div class="meta">
          <div class="name">${s.name}</div>
          <div class="sub">Stock | ${s.ticker}</div>
          <div style="margin-top:8px;color:var(--muted) ;font-weight:700">Qty: ${h.qty} @ ${formatINR(h.avg)}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div class="price">${formatINR(s.price)}</div>
        <div style="margin-top:8px;color:${col};font-weight:800">${arrow} ${Math.abs(pl).toFixed(2)}%</div>
      </div>
    `;
    el.addEventListener('click', () => openDetail('stock', s.id));
    root.appendChild(el);
  });

  fundKeys.forEach(code => {
    const h = holdings.funds[code];
    const f = FUNDS.find(x => x.code === code);
    if(!f) return;
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div class="left">
        <div class="avatar">${f.code.substring(0,2)}</div>
        <div class="meta">
          <div class="name">${f.name}</div>
          <div class="sub">Fund | ${f.code}</div>
          <div style="margin-top:8px;color:var(--muted);font-weight:700">Units: ${h.units} @ ${formatINR(h.avg)}</div>
        </div>
      </div>
      <div class="price">${formatINR(f.price)}</div>
    `;
    el.addEventListener('click', () => openDetail('fund', f.id));
    root.appendChild(el);
  });
}

/* ---------------------------
   utilities
   --------------------------- */
function computeMockPLPercent(current, avg){
  if(!avg || avg === 0) return 0;
  return ((current - avg) / avg) * 100;
}

/* update assets top card */
function updateAssetsCard(){
  let total = 0;
  let holdingsCount = 0;
  Object.keys(holdings.stocks || {}).forEach(sym => {
    const h = holdings.stocks[sym];
    const s = STOCKS.find(x => x.short === sym);
    if(!s) return;
    total += s.price * h.qty;
    holdingsCount += h.qty;
  });
  Object.keys(holdings.funds || {}).forEach(code => {
    const h = holdings.funds[code];
    const f = FUNDS.find(x => x.code === code);
    if(!f) return;
    total += f.price * h.units;
    holdingsCount += h.units;
  });
  $('#assetsValue').textContent = formatINR(total);
  $('#assetsHoldings').textContent = 'Holdings: ' + holdingsCount;
  // small mock change
  const change = parseFloat(((Math.random() - 0.5) * 200).toFixed(2));
  const pct = total > 0 ? ((change / total) * 100).toFixed(2) : '0.00';
  $('#assetsChange').textContent = (change >= 0 ? '+' : '') + formatINR(change) + ' (' + (change >= 0 ? '+' : '') + pct + '%)';
}

/* ---------------------------
   tab / pill navigation
   --------------------------- */
function setActiveTab(tabName){
  $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  $$('.pill-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  $('#stocksSection').hidden = tabName !== 'stocks';
  $('#fundsSection').hidden = tabName !== 'funds';
  $('#portfolioSection').hidden = tabName !== 'portfolio';
}

$$('.tab').forEach(b => b.addEventListener('click', () => setActiveTab(b.dataset.tab)));
$$('.pill-btn').forEach(b => b.addEventListener('click', () => setActiveTab(b.dataset.tab)));

/* ---------------------------
   detail overlay & chart
   --------------------------- */
const detailOverlay = $('#detailOverlay');
const detailChartCanvas = $('#detailChart');
const detailState = { type: null, id: null, cache: {} };

/* fit canvas to container and DPR-correct it */
function fitCanvasToContainer(canvas){
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if(canvas.width !== w || canvas.height !== h){
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
  }
}

/* clear canvas */
function clearCanvas(canvas){
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* draw grid */
function drawGrid(ctx, w, h, lines = 6){
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for(let i = 0; i <= lines; i++){
    const y = (h / lines) * i + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

/* draw smoothed line using quadratic curves */
function drawLine(ctx, points, w, h, color = 'rgba(47,213,159,1)'){
  if(points.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.008));
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for(let i = 1; i < points.length - 1; i++){
    const xc = (points[i].x + points[i+1].x) / 2;
    const yc = (points[i].y + points[i+1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
  ctx.restore();
}

/* convert numeric series to canvas points */
function seriesToPoints(series, w, h, padding = 24){
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const pts = [];
  const innerW = w - padding * 2;
  const innerH = h - padding * 2;
  for(let i = 0; i < series.length; i++){
    const x = padding + (i / (series.length - 1)) * innerW;
    const y = padding + innerH - ((series[i] - min) / span) * innerH;
    pts.push({ x, y, v: series[i] });
  }
  return pts;
}

/* generate mock series for demo */
function generateMockSeries(basePrice, points = 100, vol = 0.02){
  const arr = [];
  let p = basePrice * (1 + (Math.random() - 0.5) * 0.01);
  for(let i = 0; i < points; i++){
    const change = (Math.random() - 0.5) * vol * basePrice;
    p = Math.max(1, p + change);
    arr.push(parseFloat(p.toFixed(2)));
  }
  return arr;
}

/* main draw function */
function drawDetailChart(rangeKey = '1d'){
  let base = 100;
  if(detailState.type === 'stock'){
    const s = STOCKS.find(x => x.id === detailState.id);
    if(s) base = s.price;
  } else if(detailState.type === 'fund'){
    const f = FUNDS.find(x => x.id === detailState.id);
    if(f) base = f.price;
  }

  let points = 100;
  if(rangeKey === '1w') points = 200;
  if(rangeKey === '1m') points = 300;
  if(rangeKey === '6m') points = 400;
  if(rangeKey === '1y') points = 500;

  const cacheKey = `${detailState.type}:${detailState.id}:${rangeKey}`;
  let data = detailState.cache[cacheKey];
  if(!data){
    data = generateMockSeries(base, points, rangeKey === '1d' ? 0.02 : 0.06);
    detailState.cache[cacheKey] = data;
  }

  fitCanvasToContainer(detailChartCanvas);
  const ctx = detailChartCanvas.getContext('2d');
  clearCanvas(detailChartCanvas);
  const w = detailChartCanvas.width;
  const h = detailChartCanvas.height;

  // grid
  drawGrid(ctx, w, h, 6);

  // points and line
  const pts = seriesToPoints(data, w, h, Math.round(Math.max(22, w * 0.03)));
  drawLine(ctx, pts, w, h, 'rgba(47,213,159,1)');

  // draw labels for last & first
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  ctx.font = (12 * dpr) + 'px sans-serif';
  ctx.textAlign = 'right';
  if(pts.length){
    ctx.fillText('' + pts[0].v.toFixed(2), w - 12 * dpr, pts[0].y - 6 * dpr);
    ctx.fillText('' + pts[pts.length - 1].v.toFixed(2), w - 12 * dpr, pts[pts.length - 1].y - 6 * dpr);
  }
  ctx.restore();
}

/* chart control listeners */
$$('.chart-btn').forEach(b => b.addEventListener('click', () => {
  $$('.chart-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  drawDetailChart(b.dataset.range);
}));

/* redraw chart on canvas resize / container resize */
(function(){
  if(!detailChartCanvas) return;
  const ro = new ResizeObserver(() => {
    if(!detailOverlay.hidden){
      const active = document.querySelector('.chart-btn.active');
      drawDetailChart(active ? active.dataset.range : '1d');
    }
  });
  ro.observe(detailChartCanvas);
})();

/* ---------------------------
   open / close detail overlay
   --------------------------- */
$('#closeDetail').addEventListener('click', () => {
  detailOverlay.hidden = true;
  clearCanvas(detailChartCanvas);
});

function populateDetailHeader(type, id){
  let item;
  if(type === 'stock') item = STOCKS.find(x => x.id === id);
  else if(type === 'fund') item = FUNDS.find(x => x.id === id);
  if(!item) return;
  $('#detailAvatar').textContent = (item.short || item.code || 'ND').substring(0,2);
  $('#detailName').textContent = item.name;
  $('#detailSub').textContent = type === 'stock' ? 'Stock | ' + item.ticker : 'Fund | ' + (item.code || '');
  $('#detailPrice').textContent = formatINR(item.price);
  if(type === 'stock'){
    const owned = holdings.stocks[item.short];
    if(owned){
      const change = computeMockPLPercent(item.price, owned.avg);
      $('#detailChangeBadge').hidden = false;
      $('#detailChangeBadge').textContent = (change >= 0 ? '▲ ' : '▼ ') + Math.abs(change).toFixed(2) + '%';
      $('#detailChangeBadge').style.color = change >= 0 ? 'var(--accent)' : '#ff5b5b';
    } else {
      $('#detailChangeBadge').hidden = true;
    }
  } else {
    $('#detailChangeBadge').hidden = true;
  }
}

function openDetail(type, id){
  detailState.type = type;
  detailState.id = id;
  populateDetailHeader(type, id);
  detailOverlay.hidden = false;
  // default chart range 1d
  drawDetailChart('1d');
}

/* clicking outside overlay content closes overlay */
detailOverlay.addEventListener('click', (ev) => {
  if(ev.target === detailOverlay) detailOverlay.hidden = true;
});

/* ---------------------------
   buy / sell / sip actions
   --------------------------- */
$('#buyBtn').addEventListener('click', () => {
  const qty = Math.max(1, parseInt($('#qtyInput').value || '1', 10));
  if(detailState.type === 'stock'){
    const s = STOCKS.find(x => x.id === detailState.id);
    if(!s) return;
    const sym = s.short;
    const existing = holdings.stocks[sym] || { qty: 0, avg: 0 };
    const newQty = existing.qty + qty;
    const newAvg = ((existing.avg * existing.qty) + (s.price * qty)) / newQty;
    holdings.stocks[sym] = { qty: newQty, avg: parseFloat(newAvg.toFixed(2)) };
    saveHoldings(holdings);
    renderAll();
    populateDetailHeader('stock', detailState.id);
    alert('Bought ' + qty + ' of ' + s.name);
  } else {
    const f = FUNDS.find(x => x.id === detailState.id);
    if(!f) return;
    const code = f.code;
    const existing = holdings.funds[code] || { units: 0, avg: 0 };
    const newUnits = existing.units + qty;
    const newAvg = ((existing.avg * existing.units) + (f.price * qty)) / newUnits;
    holdings.funds[code] = { units: newUnits, avg: parseFloat(newAvg.toFixed(2)) };
    saveHoldings(holdings);
    renderAll();
    alert('Bought ' + qty + ' units of ' + f.name);
  }
});

$('#sellBtn').addEventListener('click', () => {
  const qty = Math.max(1, parseInt($('#qtyInput').value || '1', 10));
  if(detailState.type === 'stock'){
    const s = STOCKS.find(x => x.id === detailState.id);
    if(!s) return;
    const sym = s.short;
    const existing = holdings.stocks[sym];
    if(!existing || existing.qty < qty){ alert('Not enough quantity to sell'); return; }
    const remaining = existing.qty - qty;
    if(remaining === 0) delete holdings.stocks[sym];
    else holdings.stocks[sym].qty = remaining;
    saveHoldings(holdings);
    renderAll();
    populateDetailHeader('stock', detailState.id);
    alert('Sold ' + qty + ' of ' + s.name);
  } else {
    const f = FUNDS.find(x => x.id === detailState.id);
    if(!f) return;
    const code = f.code;
    const existing = holdings.funds[code];
    if(!existing || existing.units < qty){ alert('Not enough units to redeem'); return; }
    const remaining = existing.units - qty;
    if(remaining === 0) delete holdings.funds[code];
    else holdings.funds[code].units = remaining;
    saveHoldings(holdings);
    renderAll();
    alert('Redeemed ' + qty + ' units of ' + f.name);
  }
});

$('#sipBtn').addEventListener('click', () => {
  // basic SIP simulation: buy 1 unit on click for funds; buy 1 share for stocks as demo
  const qty = 1;
  if(detailState.type === 'fund'){
    const f = FUNDS.find(x => x.id === detailState.id);
    if(!f) return;
    const code = f.code;
    const existing = holdings.funds[code] || { units: 0, avg: 0 };
    const newUnits = existing.units + qty;
    const newAvg = ((existing.avg * existing.units) + (f.price * qty)) / newUnits;
    holdings.funds[code] = { units: newUnits, avg: parseFloat(newAvg.toFixed(2)) };
    saveHoldings(holdings);
    renderAll();
    alert('SIP simulated: bought ' + qty + ' unit(s) of ' + f.name);
  } else {
    // for stock, treat sip as single share purchase for demo
    const s = STOCKS.find(x => x.id === detailState.id);
    if(!s) return;
    const sym = s.short;
    const existing = holdings.stocks[sym] || { qty: 0, avg: 0 };
    const newQty = existing.qty + qty;
    const newAvg = ((existing.avg * existing.qty) + (s.price * qty)) / newQty;
    holdings.stocks[sym] = { qty: newQty, avg: parseFloat(newAvg.toFixed(2)) };
    saveHoldings(holdings);
    renderAll();
    alert('SIP simulated: bought ' + qty + ' share(s) of ' + s.name);
  }
});

/* ---------------------------
   initial render and helpers
   --------------------------- */
function renderAll(){
  renderStocks();
  renderFunds();
  renderPortfolio();
  updateAssetsCard();
}

/* DOM loaded */
document.addEventListener('DOMContentLoaded', () => {
  renderAll();

  $('#toggleEye').addEventListener('click', () => {
    const vis = $('#assetsValue').style.visibility !== 'hidden';
    $('#assetsValue').style.visibility = vis ? 'hidden' : 'visible';
    $('#assetsHoldings').style.visibility = vis ? 'hidden' : 'visible';
  });

  // ensure default tab is stocks
  setActiveTab('stocks');
});

/* close overlay on escape */
window.addEventListener('keydown', e => {
  if(e.key === 'Escape' && !detailOverlay.hidden){
    detailOverlay.hidden = true;
  }
});

/* small defensive console logs to help debugging in case of blank page */
(function debugChecks(){
  if(!$('#stocksList')) console.warn('stocksList missing from DOM');
  if(!$('#fundsList')) console.warn('fundsList missing from DOM');
  if(!$('#portfolioList')) console.warn('portfolioList missing from DOM');
})();
