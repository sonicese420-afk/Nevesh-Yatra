// script.js - simplified, robust UI, portfolio + charts
// Requires Chart.js (you already include it in index.html).

/* ---------- Data ---------- */
const stocks = {
  "Tata Motors": random(700, 950),
  "Adani Green": random(900, 1500),
  "Wipro": random(220, 360),
  "MRF": random(90000, 150000),
  "Reliance": random(1300, 1700),
  "HDFC": random(1100, 1600),
  "Affle 3i Ltd": random(80, 240)
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

// Local storage portfolio key
const STORAGE_KEY = 'ny_portfolio';

/* ---------- Helpers ---------- */
function random(a, b) {
  return Math.round((Math.random() * (b - a) + a) * 100) / 100;
}
function fmt(v) {
  return '₹' + Number(v).toLocaleString('en-IN', {maximumFractionDigits:2});
}
function getPortfolio() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {stocks:{}, funds:{}};
  } catch(e){ return {stocks:{}, funds:{}}; }
}
function savePortfolio(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
function nowPriceFor(name, type='stock') {
  // use base lists for stocks/funds
  if(type === 'stock') return stocks[name] || random(100,1000);
  // funds: give a pseudo NAV
  return random(300, 2000);
}

/* ---------- UI nodes ---------- */
const el = id => document.getElementById(id);
const panels = {
  stocks: el('ny_stocks_panel'),
  funds: el('ny_funds_panel'),
  portfolio: el('ny_portfolio_panel')
};
const navButtons = {
  stocks: el('nav_stocks'),
  funds: el('nav_funds'),
  portfolio: el('nav_portfolio')
};
const assetsTotalEl = el('assetsTotal');
const assetsPLEl = el('assetsPL');
const assetsHoldingsEl = el('assetsCount');

/* ---------- Renderers ---------- */
function renderStocks() {
  const wrapper = el('stocksList');
  wrapper.innerHTML = '';
  Object.keys(stocks).forEach(name => {
    const price = nowPriceFor(name,'stock');
    const card = document.createElement('div');
    card.className = 'ny-card';
    card.innerHTML = `
      <div class="name">${name}</div>
      <div class="price">${fmt(price)}</div>
      <div style="display:flex;gap:12px;align-items:center;margin-top:10px;">
        <input class="qty" type="number" min="1" value="1" data-name="${name}" data-type="stock">
        <button class="buy-btn" data-action="buy" data-name="${name}" data-type="stock">Buy</button>
      </div>
    `;
    wrapper.appendChild(card);
  });
}

function renderFunds() {
  const wrapper = el('fundsList');
  wrapper.innerHTML = '';
  mutualFunds.forEach(name => {
    const nav = nowPriceFor(name,'fund');
    const card = document.createElement('div');
    card.className = 'ny-card';
    card.innerHTML = `
      <div class="name">${name}</div>
      <div class="price">${fmt(nav)}</div>
      <div style="display:flex;gap:12px;align-items:center;margin-top:10px;">
        <input class="qty" type="number" min="1" value="1" data-name="${name}" data-type="fund">
        <button class="add-btn" data-action="addFund" data-name="${name}" data-type="fund">Add Unit</button>
      </div>
    `;
    wrapper.appendChild(card);
  });
}

function renderPortfolio() {
  const wrapper = el('portfolioList');
  wrapper.innerHTML = '';
  const p = getPortfolio();
  let sum = 0, cost = 0, holdings = 0;
  // Stocks
  Object.keys(p.stocks).forEach(name => {
    const item = p.stocks[name];
    const current = nowPriceFor(name,'stock');
    const value = current * item.qty;
    const pl = value - (item.price * item.qty);
    sum += value; cost += item.price * item.qty;
    holdings += item.qty;
    const card = document.createElement('div');
    card.className = 'ny-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="name">${name} <small style="color:var(--muted-text);font-weight:500"> (stock)</small></div>
          <div class="meta">Bought @ ${fmt(item.price)} × ${item.qty}</div>
        </div>
        <div style="text-align:right">
          <div class="price">${fmt(value)}</div>
          <div class="${pl>=0?'positive':'negative'} meta">${pl>=0?'+':''}${fmt(pl)}</div>
        </div>
      </div>
    `;
    wrapper.appendChild(card);
  });

  // Funds
  Object.keys(p.funds).forEach(name => {
    const item = p.funds[name];
    const nav = nowPriceFor(name,'fund');
    const value = nav * item.units;
    const pl = value - (item.nav * item.units);
    sum += value; cost += item.nav * item.units;
    holdings += item.units;
    const card = document.createElement('div');
    card.className = 'ny-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="name">${name} <small style="color:var(--muted-text);font-weight:500"> (fund)</small></div>
          <div class="meta">Bought NAV ${fmt(item.nav)} × ${item.units}</div>
        </div>
        <div style="text-align:right">
          <div class="price">${fmt(value)}</div>
          <div class="${pl>=0?'positive':'negative'} meta">${pl>=0?'+':''}${fmt(pl)}</div>
        </div>
      </div>
    `;
    wrapper.appendChild(card);
  });

  // Update top assets summary
  const plTotal = sum - cost;
  assetsTotalEl.textContent = fmt(sum || 0);
  assetsPLEl.textContent = `${plTotal>=0?'+':''}${fmt(plTotal)}`;
  assetsPLEl.className = plTotal>=0 ? 'positive' : 'negative';
  assetsHoldingsEl.textContent = `Holdings: ${holdings}`;
}

/* ---------- Actions ---------- */
function buyStock(name, qty) {
  qty = Number(qty) || 1;
  const price = nowPriceFor(name,'stock');
  const p = getPortfolio();
  if(!p.stocks[name]) p.stocks[name] = {qty:0, price:0};
  // We'll store average buy price:
  const existing = p.stocks[name];
  const newQty = existing.qty + qty;
  const newCost = (existing.price * existing.qty) + (price * qty);
  existing.qty = newQty;
  existing.price = Math.round((newCost / newQty) * 100) / 100;
  savePortfolio(p);
  renderPortfolio();
}

function addFundUnit(name, units) {
  units = Number(units) || 1;
  const nav = nowPriceFor(name,'fund');
  const p = getPortfolio();
  if(!p.funds[name]) p.funds[name] = {units:0, nav:0};
  const existing = p.funds[name];
  // store weighted average NAV
  const newUnits = existing.units + units;
  const newCost = (existing.nav * existing.units) + (nav * units);
  existing.units = newUnits;
  existing.nav = Math.round((newCost / newUnits) * 100) / 100;
  savePortfolio(p);
  renderPortfolio();
}

/* ---------- Navigation / Panels ---------- */
function showPanel(name) {
  Object.keys(panels).forEach(k => panels[k].style.display = (k === name) ? 'block' : 'none');
  Object.keys(navButtons).forEach(k => navButtons[k].classList.toggle('active', k === name));
}

function initNav() {
  navButtons.stocks.addEventListener('click', () => showPanel('stocks'));
  navButtons.funds.addEventListener('click', () => showPanel('funds'));
  navButtons.portfolio.addEventListener('click', () => showPanel('portfolio'));
}

/* ---------- Chart helpers (simple 6 month chart) ---------- */
let portfolioChart = null;
function renderPortfolioChart() {
  // remove existing if present
  const existing = document.getElementById('ny_portfolio_chart');
  if(existing && existing._chart) { existing._chart.destroy(); existing._chart = null; }
  // create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'ny_portfolio_chart';
  el('portfolioChartWrap').innerHTML = '';
  el('portfolioChartWrap').appendChild(canvas);

  // generate sample 6 months data (uniform random delta around current total)
  const months = ['-5m','-4m','-3m','-2m','-1m','now'];
  const p = getPortfolio();
  let base = 0;
  Object.keys(p.stocks).forEach(n => base += (nowPriceFor(n,'stock') * p.stocks[n].qty));
  Object.keys(p.funds).forEach(n => base += (nowPriceFor(n,'fund') * p.funds[n].units));
  if(base === 0) base = 1000; // placeholder

  const data = months.map((m,i) => Math.round((base * (0.9 + 0.02*i + (Math.random()*0.06 - 0.03))) * 100)/100);

  // Chart.js
  const cfg = {
    type: 'line',
    data: {labels: months, datasets:[{
      label: 'Portfolio value (6m)',
      data,
      fill: true,
      backgroundColor: 'rgba(46,203,172,0.12)',
      borderColor: 'rgba(46,203,172,0.9)',
      tension: 0.35,
      pointRadius:4
    }]},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {beginAtZero:false, ticks:{color:'rgba(255,255,255,0.85)'}},
        x: {ticks:{color:'rgba(255,255,255,0.7)'}}
      },
      plugins: {legend:{display:false}}
    }
  };
  // create chart with explicit size control to avoid stretching
  canvas.style.height = '260px';
  canvas.style.width = '100%';
  portfolioChart = new Chart(canvas.getContext('2d'), cfg);
  canvas._chart = portfolioChart;
}

/* ---------- Event delegation (buys/adds) ---------- */
function initActions() {
  // Stocks list click (event delegation)
  el('stocksList').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action="buy"]');
    if(!btn) return;
    const name = btn.dataset.name;
    const input = btn.parentElement.querySelector('.qty');
    const qty = input ? Number(input.value||1) : 1;
    buyStock(name, qty);
    // keep view in same panel (do NOT switch)
    showPanel('stocks');
    flashConfirm(`${qty} × ${name} bought`);
  });

  // Funds list click
  el('fundsList').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action="addFund"]');
    if(!btn) return;
    const name = btn.dataset.name;
    const input = btn.parentElement.querySelector('.qty');
    const units = input ? Number(input.value||1) : 1;
    addFundUnit(name, units);
    // keep view in same panel
    showPanel('funds');
    flashConfirm(`${units} units of ${name} added`);
  });
}

/* ---------- Small UI helpers ---------- */
function flashConfirm(msg) {
  const elFlash = document.createElement('div');
  elFlash.textContent = msg;
  Object.assign(elFlash.style, {position:'fixed',left:'50%',top:'20%',transform:'translateX(-50%)',padding:'10px 16px',background:'#0b2a20',color:'#bff1df',borderRadius:'8px',zIndex:9999});
  document.body.appendChild(elFlash);
  setTimeout(()=>elFlash.remove(),1600);
}

/* ---------- App init ---------- */
function initApp() {
  initNav();
  renderStocks();
  renderFunds();
  renderPortfolio();
  renderPortfolioChart();
  initActions();
  // start with stocks shown
  showPanel('stocks');

  // small auto-refresh of prices (simulate live ticks)
  setInterval(() => {
    // jitter base data slightly so prices "update" visually
    Object.keys(stocks).forEach(k => { stocks[k] = Math.round((stocks[k] * (1 + (Math.random()-0.5)/200)) * 100)/100; });
    renderStocks();
    renderFunds();
    renderPortfolio();
    renderPortfolioChart();
  }, 15000); // every 15s
}

/* ---------- Startup ---------- */
document.addEventListener('DOMContentLoaded', initApp);
