// app.js - Nivesh Yatra Investment App

// ==================== DATA ARRAYS ====================
const STOCKS = [
  { id:'RELI', ticker:'RELIANCE', short:'RE', name:'Reliance Industries Ltd', price:1398.07 },
  { id:'TATM', ticker:'TATAMOTORS', short:'TM', name:'Tata Motors', price:1006.98 },
  { id:'ADGN', ticker:'ADANIGREEN', short:'AG', name:'Adani Green', price:1181.45 },
  { id:'WIPR', ticker:'WIPRO', short:'W', name:'Wipro', price:1485.01 },
  { id:'MRF', ticker:'MRF', short:'M', name:'MRF', price:1898.78 },
  { id:'HDFC', ticker:'HDFC', short:'H', name:'HDFC', price:1846.28 },
  { id:'AFFL', ticker:'AFFLE', short:'AF', name:'Affle 3i Ltd', price:410.22 }
];

const FUNDS = [
  { id:'EDEL', code:'EDEL', name:'Edelweiss Nifty Midcap150 Momentum 50 Index Fund', price:232.4 },
  { id:'HDFM', code:'HDFCMID', name:'HDFC Mid Cap Fund', price:132.76 },
  { id:'HDFSC', code:'HDFCSM', name:'HDFC Small Cap Fund', price:276.12 },
  { id:'NIPL', code:'NIPPL', name:'Nippon India Large Cap Fund', price:219.33 },
  { id:'SBIL', code:'SBIL', name:'SBI Large Cap Fund', price:189.44 },
  { id:'NIPM', code:'NIPPM', name:'Nippon India Mid Cap Fund', price:160.55 },
  { id:'NIPS', code:'NIPPS', name:'Nippon India Small Cap Fund', price:102.97 },
  { id:'HDFLC', code:'HDFLC', name:'HDFC Large Cap Fund', price:321.21 }
];

const STORAGE_KEY = 'ny_holdings_v1';

// ==================== STATE ====================
let currentTab = 'stocks';
let currentOverlayItem = null;
let currentTimeRange = '1D';

// ==================== STORAGE HELPERS ====================
function getHoldings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveHoldings(holdings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
}

function findHolding(id, type) {
  const holdings = getHoldings();
  return holdings.find(h => h.id === id && h.type === type);
}

function updateHolding(id, type, qty, price) {
  let holdings = getHoldings();
  const existing = holdings.find(h => h.id === id && h.type === type);
  
  if (existing) {
    const totalQty = existing.qty + qty;
    if (totalQty <= 0) {
      holdings = holdings.filter(h => !(h.id === id && h.type === type));
    } else {
      if (qty > 0) {
        existing.avgBuy = ((existing.avgBuy * existing.qty) + (price * qty)) / totalQty;
      }
      existing.qty = totalQty;
    }
  } else if (qty > 0) {
    holdings.push({ id, type, qty, avgBuy: price });
  }
  
  saveHoldings(holdings);
  updateAssetsCard();
  renderCurrentTab();
}

// ==================== CHART HELPERS ====================
function fitCanvas(canvas, container) {
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function generateChartData(basePrice, range) {
  const points = { '1D': 24, '1W': 7, '1M': 30, '6M': 180, '1Y': 365 }[range] || 24;
  const volatility = { '1D': 0.02, '1W': 0.05, '1M': 0.1, '6M': 0.2, '1Y': 0.3 }[range] || 0.02;
  
  const data = [];
  let price = basePrice * (1 - volatility / 2);
  
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.48) * basePrice * volatility / points;
    price = Math.max(price + change, basePrice * 0.5);
    data.push(price);
  }
  
  data[data.length - 1] = basePrice;
  return data;
}

function drawChart(ctx, data, width, height) {
  ctx.clearRect(0, 0, width, height);
  
  if (!data || data.length < 2) return;
  
  const padding = { top: 20, right: 20, bottom: 20, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;
  
  const getX = (i) => padding.left + (i / (data.length - 1)) * chartWidth;
  const getY = (val) => padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
  
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(76, 175, 80, 0.3)');
  gradient.addColorStop(1, 'rgba(76, 175, 80, 0)');
  
  ctx.beginPath();
  ctx.moveTo(getX(0), height - padding.bottom);
  data.forEach((val, i) => ctx.lineTo(getX(i), getY(val)));
  ctx.lineTo(getX(data.length - 1), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(data[0]));
  data.forEach((val, i) => ctx.lineTo(getX(i), getY(val)));
  ctx.strokeStyle = '#4caf50';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  const lastX = getX(data.length - 1);
  const lastY = getY(data[data.length - 1]);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#4caf50';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function drawMiniSparkline(canvas, data) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width = 60;
  const height = canvas.height = 30;
  
  ctx.clearRect(0, 0, width, height);
  
  if (!data || data.length < 2) return;
  
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;
  
  const getX = (i) => (i / (data.length - 1)) * width;
  const getY = (val) => height - ((val - minVal) / range) * height;
  
  const isPositive = data[data.length - 1] >= data[0];
  
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(data[0]));
  data.forEach((val, i) => ctx.lineTo(getX(i), getY(val)));
  ctx.strokeStyle = isPositive ? '#4caf50' : '#ef5350';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ==================== RENDER FUNCTIONS ====================
function formatCurrency(amount) {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateAssetsCard() {
  const holdings = getHoldings();
  let totalValue = 0;
  let totalCost = 0;
  
  holdings.forEach(h => {
    const instrument = h.type === 'stock' 
      ? STOCKS.find(s => s.id === h.id)
      : FUNDS.find(f => f.id === h.id);
    
    if (instrument) {
      totalValue += instrument.price * h.qty;
      totalCost += h.avgBuy * h.qty;
    }
  });
  
  const change = totalValue - totalCost;
  const changePercent = totalCost > 0 ? (change / totalCost) * 100 : 0;
  
  document.getElementById('totalValue').textContent = formatCurrency(totalValue);
  
  const changeEl = document.getElementById('dayChange');
  const sign = change >= 0 ? '+' : '';
  changeEl.textContent = `${sign}${formatCurrency(change)} (${sign}${changePercent.toFixed(2)}%)`;
  changeEl.className = 'assets-change' + (change < 0 ? ' negative' : '');
  
  document.getElementById('holdingsCount').textContent = `${holdings.length} Holdings`;
}

function renderStocksTab() {
  const container = document.getElementById('mainContent');
  const holdings = getHoldings();
  
  let html = '<div class="card-list">';
  
  STOCKS.forEach(stock => {
    const holding = holdings.find(h => h.id === stock.id && h.type === 'stock');
    const isOwned = !!holding;
    
    let changeHtml = '';
    if (isOwned) {
      const pl = ((stock.price - holding.avgBuy) / holding.avgBuy) * 100;
      const isPositive = pl >= 0;
      changeHtml = `<div class="card-change ${isPositive ? 'positive' : 'negative'}">
        ${isPositive ? '▲' : '▼'} ${Math.abs(pl).toFixed(2)}%
      </div>`;
    } else {
      changeHtml = '<div class="card-change hidden">-</div>';
    }
    
    html += `
      <div class="instrument-card" tabindex="0" data-id="${stock.id}" data-type="stock" role="button" aria-label="${stock.name}">
        <div class="card-avatar">${stock.short}</div>
        <div class="card-info">
          <div class="card-name">${stock.name}</div>
          <div class="card-meta">STOCK | ${stock.ticker}</div>
        </div>
        <div class="card-price-col">
          <div class="card-price">${formatCurrency(stock.price)}</div>
          ${changeHtml}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
  attachCardListeners();
}

function renderFundsTab() {
  const container = document.getElementById('mainContent');
  const holdings = getHoldings();
  
  let html = '<div class="card-list">';
  
  FUNDS.forEach(fund => {
    const holding = holdings.find(h => h.id === fund.id && h.type === 'fund');
    const isOwned = !!holding;
    
    let changeHtml = '';
    if (isOwned) {
      const pl = ((fund.price - holding.avgBuy) / holding.avgBuy) * 100;
      const isPositive = pl >= 0;
      changeHtml = `<div class="card-change ${isPositive ? 'positive' : 'negative'}">
        ${isPositive ? '▲' : '▼'} ${Math.abs(pl).toFixed(2)}%
      </div>`;
    } else {
      changeHtml = '<div class="card-change hidden">-</div>';
    }
    
    html += `
      <div class="instrument-card" tabindex="0" data-id="${fund.id}" data-type="fund" role="button" aria-label="${fund.name}">
        <div class="card-avatar">${fund.code.substring(0, 2)}</div>
        <div class="card-info">
          <div class="card-name">${fund.name}</div>
          <div class="card-meta">FUND | ${fund.code}</div>
        </div>
        <div class="card-price-col">
          <div class="card-price">${formatCurrency(fund.price)}</div>
          ${changeHtml}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
  attachCardListeners();
}

function renderPortfolioTab() {
  const container = document.getElementById('mainContent');
  const holdings = getHoldings();
  
  if (holdings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>No holdings yet</p>
        <p>Start investing to build your portfolio!</p>
      </div>
    `;
    return;
  }
  
  let html = '<div class="portfolio-list">';
  
  holdings.forEach(holding => {
    const instrument = holding.type === 'stock'
      ? STOCKS.find(s => s.id === holding.id)
      : FUNDS.find(f => f.id === holding.id);
    
    if (!instrument) return;
    
    const currentValue = instrument.price * holding.qty;
    const costBasis = holding.avgBuy * holding.qty;
    const pl = currentValue - costBasis;
    const plPercent = ((instrument.price - holding.avgBuy) / holding.avgBuy) * 100;
    const isPositive = pl >= 0;
    
    const sparkData = generateChartData(instrument.price, '1M');
    
    html += `
      <div class="portfolio-card">
        <div class="portfolio-header">
          <div class="portfolio-avatar">${instrument.short || instrument.code.substring(0, 2)}</div>
          <div class="portfolio-info">
            <div class="portfolio-name">${instrument.name}</div>
            <div class="portfolio-ticker">${holding.type.toUpperCase()} | ${instrument.ticker || instrument.code}</div>
          </div>
          <canvas class="portfolio-sparkline" data-spark='${JSON.stringify(sparkData)}'></canvas>
        </div>
        <div class="portfolio-details">
          <div class="portfolio-detail">
            <span class="portfolio-detail-label">Qty</span>
            <span class="portfolio-detail-value">${holding.qty}</span>
          </div>
          <div class="portfolio-detail">
            <span class="portfolio-detail-label">Avg Buy</span>
            <span class="portfolio-detail-value">${formatCurrency(holding.avgBuy)}</span>
          </div>
          <div class="portfolio-detail">
            <span class="portfolio-detail-label">Current</span>
            <span class="portfolio-detail-value">${formatCurrency(instrument.price)}</span>
          </div>
          <div class="portfolio-detail">
            <span class="portfolio-detail-label">P/L</span>
            <span class="portfolio-detail-value ${isPositive ? 'positive' : 'negative'}">
              ${isPositive ? '+' : ''}${formatCurrency(pl)} (${isPositive ? '+' : ''}${plPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
  
  document.querySelectorAll('.portfolio-sparkline').forEach(canvas => {
    try {
      const data = JSON.parse(canvas.dataset.spark);
      drawMiniSparkline(canvas, data);
    } catch (e) {}
  });
}

function renderCurrentTab() {
  if (currentTab === 'stocks') renderStocksTab();
  else if (currentTab === 'funds') renderFundsTab();
  else if (currentTab === 'portfolio') renderPortfolioTab();
}

// ==================== OVERLAY ====================
function openOverlay(id, type) {
  const instrument = type === 'stock'
    ? STOCKS.find(s => s.id === id)
    : FUNDS.find(f => f.id === id);
  
  if (!instrument) return;
  
  currentOverlayItem = { ...instrument, type };
  currentTimeRange = '1D';
  
  document.getElementById('overlayAvatar').textContent = instrument.short || instrument.code.substring(0, 2);
  document.getElementById('overlayName').textContent = instrument.name;
  document.getElementById('overlayTicker').textContent = instrument.ticker || instrument.code;
  document.getElementById('overlayPrice').textContent = formatCurrency(instrument.price);
  document.getElementById('qtyInput').value = 1;
  
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.range === '1D');
  });
  
  document.querySelectorAll('.details-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.detail === 'details');
  });
  
  const overlay = document.getElementById('overlay');
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  
  setTimeout(() => {
    updateChart();
  }, 50);
}

function closeOverlay() {
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  currentOverlayItem = null;
}

function updateChart() {
  if (!currentOverlayItem) return;
  
  const canvas = document.getElementById('chartCanvas');
  const container = document.getElementById('chartContainer');
  
  fitCanvas(canvas, container);
  
  const data = generateChartData(currentOverlayItem.price, currentTimeRange);
  const ctx = canvas.getContext('2d');
  const rect = container.getBoundingClientRect();
  drawChart(ctx, data, rect.width, rect.height);
}

// ==================== EVENT HANDLERS ====================
function attachCardListeners() {
  document.querySelectorAll('.instrument-card').forEach(card => {
    card.addEventListener('click', () => {
      openOverlay(card.dataset.id, card.dataset.type);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openOverlay(card.dataset.id, card.dataset.type);
      }
    });
  });
}

function initEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCurrentTab();
    });
  });
  
  document.getElementById('closeOverlay').addEventListener('click', closeOverlay);
  
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTimeRange = btn.dataset.range;
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateChart();
    });
  });
  
  document.getElementById('buyBtn').addEventListener('click', () => {
    if (!currentOverlayItem) return;
    const qty = parseInt(document.getElementById('qtyInput').value) || 0;
    if (qty <= 0) return alert('Enter a valid quantity');
    updateHolding(currentOverlayItem.id, currentOverlayItem.type, qty, currentOverlayItem.price);
    alert(`Bought ${qty} units of ${currentOverlayItem.name}`);
  });
  
  document.getElementById('sellBtn').addEventListener('click', () => {
    if (!currentOverlayItem) return;
    const qty = parseInt(document.getElementById('qtyInput').value) || 0;
    if (qty <= 0) return alert('Enter a valid quantity');
    
    const holding = findHolding(currentOverlayItem.id, currentOverlayItem.type);
    if (!holding || holding.qty < qty) {
      return alert('Insufficient holdings to sell');
    }
    
    updateHolding(currentOverlayItem.id, currentOverlayItem.type, -qty, currentOverlayItem.price);
    alert(`Sold ${qty} units of ${currentOverlayItem.name}`);
  });
  
  document.getElementById('sipBtn').addEventListener('click', () => {
    if (!currentOverlayItem) return;
    const qty = parseInt(document.getElementById('qtyInput').value) || 0;
    if (qty <= 0) return alert('Enter a valid quantity');
    updateHolding(currentOverlayItem.id, currentOverlayItem.type, qty, currentOverlayItem.price);
    alert(`SIP started: ${qty} units of ${currentOverlayItem.name} monthly`);
  });
  
  document.querySelectorAll('.details-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.details-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const detailsContent = document.getElementById('detailsContent');
      if (tab.dataset.detail === 'details') {
        detailsContent.innerHTML = `
          <div class="details-placeholder">
            <p><strong>Company Overview</strong></p>
            <p>Market Cap: ₹15,00,000 Cr</p>
            <p>P/E Ratio: 28.5</p>
            <p>52 Week High: ₹2,500</p>
            <p>52 Week Low: ₹1,200</p>
            <p>Dividend Yield: 0.5%</p>
          </div>
        `;
      } else if (tab.dataset.detail === 'orders') {
        detailsContent.innerHTML = '<div class="details-placeholder"><p>No recent orders</p></div>';
      } else {
        detailsContent.innerHTML = '<div class="details-placeholder"><p>No news available</p></div>';
      }
    });
  });
  
  window.addEventListener('resize', () => {
    if (document.getElementById('overlay').classList.contains('active')) {
      updateChart();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('overlay').classList.contains('active')) {
      closeOverlay();
    }
  });
}

// ==================== INIT ====================
function init() {
  updateAssetsCard();
  renderStocksTab();
  initEventListeners();
}

document.addEventListener('DOMContentLoaded', init);
