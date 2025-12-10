// -------------------- Data --------------------
const stocks = {
  "Tata Motors": random(600, 950),
  "Adani Green": random(820, 1500),
  "Wipro": random(220, 360),
  "MRF": random(90000, 150000),
  "Reliance": random(1400, 1800),
  "HDFC": random(1100, 1600),
  "Affle 3i Ltd": random(100, 200)
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

function random(a, b) {
  return +(Math.random() * (b - a) + a).toFixed(2);
}

// -------------------- Local storage --------------------
let portfolio = JSON.parse(localStorage.getItem('nivesh_portfolio') || '{"stocks":{},"funds":{}}');

function save() { localStorage.setItem('nivesh_portfolio', JSON.stringify(portfolio)); }

// -------------------- Tabs --------------------
const tabStocks = document.getElementById('tabStocks');
const tabMF = document.getElementById('tabMF');
const tabPortfolio = document.getElementById('tabPortfolio');

const stocksTab = document.getElementById('stocksTab');
const mfTab = document.getElementById('mfTab');
const portfolioTab = document.getElementById('portfolioTab');

function switchTo(tabBtn, panelEl) {
  [tabStocks, tabMF, tabPortfolio].forEach(b => b.classList.remove('active'));
  tabBtn.classList.add('active');
  [stocksTab, mfTab, portfolioTab].forEach(p => p.classList.add('hidden'));
  panelEl.classList.remove('hidden');
}

tabStocks.addEventListener('click', () => switchTo(tabStocks, stocksTab));
tabMF.addEventListener('click', () => switchTo(tabMF, mfTab));
tabPortfolio.addEventListener('click', () => { switchTo(tabPortfolio, portfolioTab); renderPortfolio(); });

// -------------------- Render Stocks --------------------
const stockList = document.getElementById('stockList');

for (let name in stocks) {
  const card = document.createElement('div'); card.className = 'card';
  card.innerHTML = `
    <div class="meta">
      <div class="title">${name}</div>
      <div class="price">₹${stocks[name]}</div>
    </div>
    <div class="controls">
      <input class="qty" type="number" min="1" value="1">
      <button class="btn buy" data-name="${name}">Buy</button>
    </div>
  `;
  stockList.appendChild(card);
}

stockList.addEventListener('click', (e) => {
  if (!e.target.dataset.name) return;
  const name = e.target.dataset.name;
  const qtyInput = e.target.parentElement.querySelector('.qty');
  const qty = Math.max(1, parseInt(qtyInput.value || 1, 10));
  portfolio.stocks[name] = (portfolio.stocks[name] || 0) + qty;
  save();
  alert(`Bought ${qty} shares of ${name}`);
});

// -------------------- Render Mutual Funds --------------------
const mfList = document.getElementById('mfList');
mutualFunds.forEach(name => {
  const card = document.createElement('div'); card.className = 'card';
  card.innerHTML = `
    <div class="meta">
      <div class="title">${name}</div>
    </div>
    <div class="controls">
      <button class="btn add" data-name="${name}">Add Unit</button>
    </div>
  `;
  mfList.appendChild(card);
});

mfList.addEventListener('click', (e) => {
  if (!e.target.dataset.name) return;
  const name = e.target.dataset.name;
  portfolio.funds[name] = (portfolio.funds[name] || 0) + 1;
  save();
  alert(`Added 1 unit to ${name}`);
});

// -------------------- Portfolio --------------------
const portfolioSummary = document.getElementById('portfolioSummary');
const portfolioList = document.getElementById('portfolioList');
const details = document.getElementById('details');

function renderPortfolio() {
  portfolioList.innerHTML = '';
  details.innerHTML = '';

  let totalValue = 0;

  // Stocks
  for (let name in portfolio.stocks) {
    const qty = portfolio.stocks[name];
    const price = stocks[name];
    totalValue += qty * price;

    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `
      <div class="meta">
        <div class="title">${name}</div>
        <div class="price">Qty: ${qty} • ₹${price} each</div>
      </div>
      <div class="controls">
        <button class="btn sell" data-type="stock" data-name="${name}">Sell 1</button>
        <button class="btn" data-chart="${name}">Chart</button>
      </div>
    `;
    portfolioList.appendChild(card);
  }

  // Funds
  for (let name in portfolio.funds) {
    const units = portfolio.funds[name];
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `
      <div class="meta">
        <div class="title">${name}</div>
        <div class="price">Units: ${units}</div>
      </div>
      <div class="controls">
        <button class="btn sell" data-type="fund" data-name="${name}">Redeem 1</button>
      </div>
    `;
    portfolioList.appendChild(card);
  }

  portfolioSummary.innerHTML = `
    <div><strong>Total current portfolio value:</strong> ₹${totalValue.toFixed(2)}</div>
    <div style="margin-top:6px;font-size:13px;color:#555">Data stored locally (localStorage).</div>
  `;

  if (portfolioList.children.length === 0) {
    portfolioList.innerHTML = '<div class="card">You have no holdings.</div>';
  }
}

// sell / redeem actions and chart clicks
portfolioList.addEventListener('click', (e) => {
  const type = e.target.dataset.type;
  const name = e.target.dataset.name;
  if (type === 'stock') {
    if (!portfolio.stocks[name]) return;
    portfolio.stocks[name]--;
    if (portfolio.stocks[name] === 0) delete portfolio.stocks[name];
    save();
    renderPortfolio();
  } else if (type === 'fund') {
    if (!portfolio.funds[name]) return;
    portfolio.funds[name]--;
    if (portfolio.funds[name] === 0) delete portfolio.funds[name];
    save();
    renderPortfolio();
  } else if (e.target.dataset.chart) {
    showChart(e.target.dataset.chart);
  }
});

// -------------------- Chart --------------------
function showChart(stockName) {
  details.innerHTML = '';
  const box = document.createElement('div'); box.className = 'chartBox';
  box.innerHTML = `<h3>${stockName} — 30-day trend</h3><canvas id="chartCanvas"></canvas>`;
  details.appendChild(box);

  const ctx = document.getElementById('chartCanvas').getContext('2d');
  const price = stocks[stockName];
  const labels = [];
  const data = [];
  let cur = price;
  for (let i = 30; i >= 1; i--) {
    cur += (Math.random() - 0.5) * (price * 0.02);
    data.push(+cur.toFixed(2));
    labels.push(`${i}d`);
  }

  new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: stockName, data, borderColor: '#2f5873', tension: 0.25, fill:false }]},
    options: { responsive:true, maintainAspectRatio:false }
  });
}

// initial render
renderPortfolio();
