/* script.js - self contained SPA with localStorage */

/* ---------- Data (stocks + funds) ---------- */
function random(a,b){ return +(Math.random()*(b-a)+a).toFixed(2); }

const STOCKS = {
  "Tata Motors": random(600,950),
  "Adani Green": random(820,1500),
  "Wipro": random(220,360),
  "MRF": random(90000,150000),
  "Reliance": random(1400,1800),
  "HDFC": random(1100,1600),
  "Affle 3i Ltd": random(100,200)
};

const FUNDS = [
  "Edelweiss Nifty Midcap150 Momentum 50 Index Fund",
  "HDFC Mid Cap Fund",
  "HDFC Small Cap Fund",
  "Nippon India Large Cap Fund",
  "SBI Large Cap Fund",
  "Nippon India Growth Mid Cap Fund",
  "Nippon India Small Cap Fund",
  "HDFC Large Cap Fund"
];

/* ---------- Local storage helpers ---------- */
const STORAGE_KEY = "nv_portfolio_v1"; // use versioned key
let portfolio = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); 
// portfolio array: {type:"stock"|"fund", name, qty, avgPrice, lastPrice, history: []}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
}

/* ---------- Helpers ---------- */
function formatINR(n){
  if(n===undefined || isNaN(n)) return "—";
  return "₹" + Number(n).toLocaleString('en-IN', {maximumFractionDigits:2});
}
function percent(a,b){ // percent change from a -> b
  if(!a) return "0.00%";
  return (( (b-a) / a ) * 100).toFixed(2) + "%";
}

/* ---------- Rendering ---------- */
const stocksListEl = document.getElementById('stocksList');
const fundsListEl = document.getElementById('fundsList');
const portfolioListEl = document.getElementById('portfolioList');
const totalAssetsEl = document.getElementById('totalAssets');
const dayChangeEl = document.getElementById('dayChange');
const holdCountEl = document.getElementById('holdCount');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalStats = document.getElementById('modalStats');
let chartInstance = null;

function renderStocks(){
  stocksListEl.innerHTML = "";
  Object.keys(STOCKS).forEach(name=>{
    const price = STOCKS[name];
    const card = document.createElement('div'); card.className='card';
    const left = document.createElement('div'); left.className='left';
    left.innerHTML = `<div class="name">${name}</div><div class="price">${formatINR(price)}</div>`;
    const controls = document.createElement('div'); controls.className='controls';
    const qty = document.createElement('input'); qty.className='qty'; qty.type='number'; qty.min=1; qty.value=1;
    const btn = document.createElement('button'); btn.className='btn'; btn.textContent='Buy';
    btn.onclick = ()=> buyStock(name, +qty.value);
    controls.appendChild(qty); controls.appendChild(btn);
    card.appendChild(left); card.appendChild(controls);
    stocksListEl.appendChild(card);
  });
}

function renderFunds(){
  fundsListEl.innerHTML = "";
  FUNDS.forEach(name=>{
    const price = random(100,200); // synthetic NAV
    const card = document.createElement('div'); card.className='card fund-card';
    const left = document.createElement('div'); left.className='left';
    left.innerHTML = `<div class="name">${name}</div><div class="small">NAV ${formatINR(price)}</div>`;
    const controls = document.createElement('div'); controls.className='controls';
    const btn = document.createElement('button'); btn.className='btn'; btn.textContent='Add Unit';
    btn.onclick = ()=> addFund(name, 1, price); // default 1 unit at this NAV
    controls.appendChild(btn);
    card.appendChild(left); card.appendChild(controls);
    fundsListEl.appendChild(card);
  });
}

function renderPortfolio(){
  portfolioListEl.innerHTML = "";
  if(portfolio.length===0){
    portfolioListEl.classList.add('empty');
    portfolioListEl.textContent = "No holdings yet.";
    updateAssetsSummary();
    return;
  }
  portfolioListEl.classList.remove('empty');

  let totalValue = 0;
  let totalCost = 0;

  portfolio.forEach((h, idx)=>{
    // update lastPrice (live)
    if(h.type === 'stock') {
      h.lastPrice = STOCKS[h.name]; // live price from STOCKS data
    } else {
      // fund - synthetic NAV fluctuates small
      h.lastPrice = +( (h.lastPrice || 120) * (1 + (Math.random()-0.5)/200) ).toFixed(2);
    }

    const value = h.qty * h.lastPrice;
    const cost = h.qty * h.avgPrice;
    totalValue += value;
    totalCost += cost;

    const row = document.createElement('div'); row.className='port-row';
    const left = document.createElement('div'); left.className='port-left';
    left.innerHTML = `<div class="name">${h.name}</div><div class="small">Qty: ${h.qty} · Avg: ${formatINR(h.avgPrice)}</div>`;
    const right = document.createElement('div'); right.className='port-right';
    const pnl = (value - cost);
    right.innerHTML = `<div class="price">${formatINR(value)}</div><div class="small">P/L ${formatINR(pnl)} · ${percent(cost, value)}</div>`;
    // clickable to open chart/modal
    row.tabIndex = 0;
    row.onclick = ()=> openModalForHolding(h);
    row.onkeypress = (e)=> { if(e.key==='Enter') openModalForHolding(h); };
    row.appendChild(left); row.appendChild(right);

    portfolioListEl.appendChild(row);
  });

  updateAssetsSummary(totalValue, totalValue - totalCost);
  save();
}

/* ---------- Actions: buy stock / add fund ---------- */
function buyStock(name, qty){
  if(!qty || qty<=0) return alert("Enter quantity >= 1");
  const price = STOCKS[name];
  // search if already in portfolio
  let p = portfolio.find(x=> x.type==='stock' && x.name===name);
  if(p){
    const newQty = p.qty + qty;
    p.avgPrice = +((p.avgPrice * p.qty + price * qty) / newQty).toFixed(2);
    p.qty = newQty;
  } else {
    p = {type:'stock', name, qty, avgPrice: price, lastPrice: price, history: []};
    portfolio.push(p);
  }
  save();
  renderPortfolio();
  flashSaved("Bought "+qty+" × "+name);
}

function addFund(name, units, nav){
  const price = nav || random(100,200);
  let p = portfolio.find(x=> x.type==='fund' && x.name===name);
  if(p){
    const newQty = p.qty + units;
    p.avgPrice = +((p.avgPrice * p.qty + price * units) / newQty).toFixed(2);
    p.qty = newQty;
  } else {
    p = {type:'fund', name, qty: units, avgPrice: price, lastPrice: price, history: []};
    portfolio.push(p);
  }
  save();
  renderPortfolio();
  flashSaved("Added "+units+" units of "+name);
}

/* ---------- Modal / Chart ---------- */
const ctx = document.getElementById('holdingChart').getContext('2d');

function openModalForHolding(h){
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  modalTitle.textContent = h.name;
  // generate 6 months synthetic series (6 points)
  const points = 6;
  const now = h.lastPrice || (h.avgPrice || 100);
  // build smooth historic with small daily-like noise (backwards)
  const arr = [];
  let cur = now;
  for(let i=0;i<points;i++){
    // drift gently away from avgPrice
    const drift = (Math.random()-0.5) * ( (h.type==='stock') ? 0.08 : 0.03 );
    cur = Math.max(1, +(cur * (1 + drift)).toFixed(2));
    arr.unshift(cur); // earliest at index 0
  }
  // labels: months (approx)
  const labels = [];
  const date = new Date();
  for(let i=points-1;i>=0;i--){
    const d = new Date(date.getFullYear(), date.getMonth()-i, 1);
    labels.push(d.toLocaleString('default', {month:'short'}));
  }

  // destroy previous chart
  if(chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: h.name,
        data: arr,
        fill: true,
        tension: 0.3,
        borderColor: 'rgba(46,180,143,0.95)',
        backgroundColor: 'rgba(46,180,143,0.12)',
        pointRadius: 3,
        pointBackgroundColor: 'rgba(255,255,255,0.9)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks:{color:'#cbd5d9'} , grid:{color:'rgba(255,255,255,0.03)'} },
        x: { ticks:{color:'#cbd5d9'} , grid:{display:false} }
      },
      plugins: { legend:{display:false} }
    }
  });

  const value = (h.qty * h.lastPrice).toFixed(2);
  const cost = (h.qty * h.avgPrice).toFixed(2);
  const pnl = (value - cost).toFixed(2);
  modalStats.innerHTML = `
    <div>Qty: <strong>${h.qty}</strong></div>
    <div>Avg price: <strong>${formatINR(h.avgPrice)}</strong></div>
    <div>Current price: <strong>${formatINR(h.lastPrice)}</strong></div>
    <div>Value: <strong>${formatINR(value)}</strong></div>
    <div>P/L: <strong>${formatINR(pnl)}</strong> (${percent(cost, value)})</div>
  `;
}

document.getElementById('closeModal').onclick = ()=> {
  modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true');
  if(chartInstance) chartInstance.destroy();
  chartInstance = null;
};

/* ---------- Assets summary ---------- */
function updateAssetsSummary(totalValue=0, change=0){
  // compute from portfolio current values
  if(totalValue===0){
    let tv=0;
    let tc=0;
    portfolio.forEach(h=>{
      const lp = (h.type==='stock') ? STOCKS[h.name] : h.lastPrice;
      tv += lp * h.qty;
      tc += h.avgPrice * h.qty;
    });
    totalValue = +tv.toFixed(2);
    change = +(tv - tc).toFixed(2);
  }
  totalAssetsEl.textContent = formatINR(totalValue);
  const pct = (change===0 ? "0.00%" : ((change/Math.max(1, totalValue-change))*100).toFixed(2) + "%");
  dayChangeEl.textContent = `1 Day Change: ${formatINR(change)} · ${pct}`;
  holdCountEl.textContent = `Holdings: ${portfolio.length}`;
}

/* ---------- Utils ---------- */
function flashSaved(msg){
  // small toast using browser alert substitute
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.position='fixed'; t.style.bottom='130px'; t.style.left='50%'; t.style.transform='translateX(-50%)';
  t.style.background='rgba(0,0,0,0.7)'; t.style.padding='10px 16px'; t.style.borderRadius='10px'; t.style.zIndex=70; t.style.color='#fff';
  document.body.appendChild(t);
  setTimeout(()=> t.remove(),1600);
}

/* ---------- Tab UI ---------- */
const navBtns = document.querySelectorAll('.nav-btn');
navBtns.forEach(b=>{
  b.addEventListener('click', ()=> {
    navBtns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const tab = b.dataset.tab;
    showPanel(tab);
  });
});

function showPanel(tab){
  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  if(tab==='stocks'){ document.getElementById('stocksPanel').classList.remove('hidden'); }
  if(tab==='funds'){ document.getElementById('fundsPanel').classList.remove('hidden'); }
  if(tab==='portfolio'){ document.getElementById('portfolioPanel').classList.remove('hidden'); }
}

/* ---------- Brand clickable (header) ---------- */
document.getElementById('brandBtn').onclick = (e)=>{
  e.preventDefault();
  // activate Stocks tab
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.nav-btn[data-tab="stocks"]').classList.add('active');
  showPanel('stocks');
  window.scrollTo({top:0,behavior:'smooth'});
};

/* ---------- Init ---------- */
function init(){
  renderStocks();
  renderFunds();
  renderPortfolio();
  // default to stocks
  showPanel('stocks');
}
init();

/* optional: update live stock prices periodically (simulate) */
setInterval(()=>{
  // wiggle STOCKS a bit
  Object.keys(STOCKS).forEach(k=>{
    const p = STOCKS[k];
    const change = (Math.random()-0.5)/100; // +/- ~0.5%
    STOCKS[k] = +(p * (1+change)).toFixed(2);
  });
  // rerender visible lists (stocks & portfolio)
  renderStocks();
  renderPortfolio();
}, 10000); // every 10s
