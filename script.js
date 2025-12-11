// data (same as before)
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

function random(a,b){ return +(Math.random()*(b-a)+a).toFixed(2) }

// local storage
let portfolio = JSON.parse(localStorage.getItem('nivesh_portfolio') || '{"stocks":{},"funds":{}}');
function save(){ localStorage.setItem('nivesh_portfolio', JSON.stringify(portfolio)); }

// elements
const stockList = document.getElementById('stockList');
const mfList = document.getElementById('mfList');
const portfolioList = document.getElementById('portfolioList');
const portfolioSummary = document.getElementById('portfolioSummary');
const details = document.getElementById('details');

const totalAmountEl = document.getElementById('totalAmount');
const oneDayChangeEl = document.getElementById('oneDayChange');
const changePctEl = document.getElementById('changePercent');

// tabs
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click', ()=> {
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    showPanel(t.dataset.target);
  })
});
document.querySelectorAll('.nav-item').forEach(n=>{
  n.addEventListener('click', ()=> {
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    n.classList.add('active');
    if(n.dataset.target) showPanel(n.dataset.target);
  })
});
document.getElementById('navAssets').addEventListener('click', ()=> showPanel('stocksTab'));
document.getElementById('navFunds').addEventListener('click', ()=> showPanel('mfTab'));
document.getElementById('navPort').addEventListener('click', ()=> showPanel('portfolioTab'));
document.getElementById('fab').addEventListener('click', ()=> { showPanel('portfolioTab'); document.getElementById('navPort').classList.add('active'); });

// initial
function showPanel(id){
  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  document.querySelectorAll('.active-panel').forEach(x=>x.classList.remove('active-panel'));
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('hidden');
  el.classList.add('active-panel');
  if(id==='portfolioTab') renderPortfolio();
}
showPanel('stocksTab');

// render stocks
for(let name in stocks){
  const price = stocks[name];
  const card = document.createElement('div'); card.className = 'card';
  card.innerHTML = `
    <div class="meta">
      <div class="title">${name}</div>
      <div class="price">₹${price}</div>
    </div>
    <div class="controls">
      <input class="qty" type="number" min="1" value="1" aria-label="qty ${name}">
      <button class="btn buy" data-name="${name}">Buy</button>
    </div>
  `;
  stockList.appendChild(card);
}

// buy handler
stockList.addEventListener('click', e=>{
  const name = e.target.dataset.name;
  if(!name) return;
  const qty = Math.max(1, parseInt(e.target.parentElement.querySelector('.qty').value||1,10));
  portfolio.stocks[name] = (portfolio.stocks[name]||0) + qty;
  save();
  toast(`Bought ${qty} × ${name}`);
  updateTotals();
});

// render funds
mutualFunds.forEach(name=>{
  const card = document.createElement('div'); card.className = 'card';
  card.innerHTML = `
    <div class="meta">
      <div class="title">${name}</div>
    </div>
    <div class="controls">
      <button class="btn add" data-name="${name}">Add</button>
    </div>
  `;
  mfList.appendChild(card);
});
mfList.addEventListener('click', e=>{
  const name = e.target.dataset.name;
  if(!name) return;
  portfolio.funds[name] = (portfolio.funds[name]||0) + 1;
  save();
  toast(`Added 1 unit to ${name}`);
  updateTotals();
});

// portfolio view
function renderPortfolio(){
  portfolioList.innerHTML=''; details.innerHTML='';
  let total=0;
  for(let name in portfolio.stocks){
    const qty = portfolio.stocks[name];
    const price = stocks[name]||0;
    total += qty*price;
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <div class="meta">
        <div class="title">${name}</div>
        <div class="price">Qty: ${qty} • ₹${price} each</div>
      </div>
      <div class="controls">
        <button class="btn sell" data-type="stock" data-name="${name}">Sell 1</button>
        <button class="btn chart" data-chart="${name}">Chart</button>
      </div>
    `;
    portfolioList.appendChild(card);
  }
  for(let name in portfolio.funds){
    const units = portfolio.funds[name];
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <div class="meta">
        <div class="title">${name}</div>
        <div class="price">Units: ${units}</div>
      </div>
      <div class="controls">
        <button class="btn sell" data-type="fund" data-name="${name}">Redeem</button>
      </div>
    `;
    portfolioList.appendChild(card);
  }

  portfolioSummary.innerHTML = `<div style="font-weight:800">Total value: ₹${total.toFixed(2)}</div><div style="color:var(--muted)">Stored locally</div>`;
  if(!portfolioList.children.length) portfolioList.innerHTML = '<div class="card">No holdings</div>';
}

// sell/redeem & charts
portfolioList.addEventListener('click', e=>{
  const type = e.target.dataset.type;
  const name = e.target.dataset.name;
  if(type==='stock'){
    if(!portfolio.stocks[name]) return;
    portfolio.stocks[name]--;
    if(portfolio.stocks[name]===0) delete portfolio.stocks[name];
    save(); renderPortfolio(); toast(`Sold 1 × ${name}`); updateTotals();
  } else if(type==='fund'){
    if(!portfolio.funds[name]) return;
    portfolio.funds[name]--;
    if(portfolio.funds[name]===0) delete portfolio.funds[name];
    save(); renderPortfolio(); toast(`Redeemed 1 unit`); updateTotals();
  } else if(e.target.dataset.chart){
    showChart(e.target.dataset.chart);
  }
});

// chart
function showChart(name){
  details.innerHTML = '';
  const box = document.createElement('div'); box.className='card';
  box.innerHTML = `<div style="width:100%"><h4 style="margin:0 0 8px">${name} — 30d</h4><canvas id="chartCanvas" style="width:100%;height:200px"></canvas></div>`;
  details.appendChild(box);
  const ctx = document.getElementById('chartCanvas').getContext('2d');
  const price = stocks[name]||100;
  const labels=[]; const data=[];
  let cur = price;
  for(let i=30;i>=1;i--){ cur += (Math.random()-0.5)*(price*0.02); data.push(+cur.toFixed(2)); labels.push(`${i}d`); }
  new Chart(ctx,{type:'line',data:{labels,datasets:[{label:name,data,borderColor:'#16c784',fill:false,tension:0.25}]},options:{plugins:{legend:{display:false}},responsive:true,maintainAspectRatio:false}});
}

// totals
function updateTotals(){
  let total=0;
  for(let k in portfolio.stocks){ total += (stocks[k]||0)*portfolio.stocks[k]; }
  totalAmountEl.textContent = `₹${total.toFixed(2)}`;
  // random 1-day change for demo
  const change = +(Math.random()*40-20).toFixed(2);
  oneDayChangeEl.textContent = Math.abs(change);
  changePctEl.textContent = `${change>=0?'▲':'▼'} ${((Math.abs(change)/Math.max(total,1))*100).toFixed(2)}%`;
  changePctEl.className = 'change-pct ' + (change>=0?'up':'down');
}

updateTotals();
renderPortfolio();

// helper toast
function toast(text){
  const el = document.createElement('div');
  el.textContent = text;
  el.style.position='fixed'; el.style.left='50%'; el.style.transform='translateX(-50%)';
  el.style.bottom='100px'; el.style.background='rgba(0,0,0,0.7)'; el.style.color='white'; el.style.padding='10px 14px'; el.style.borderRadius='10px'; el.style.zIndex=9999;
  document.body.appendChild(el); setTimeout(()=> el.style.opacity=0,1400); setTimeout(()=> el.remove(),2000);
}
