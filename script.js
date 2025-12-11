/* ---------- Sample data ---------- */
function random(a,b){ return +(Math.random()*(b-a)+a).toFixed(2) }

const stocks = {
  "Reliance Industries Ltd":"RELIANCE",
  "Tata Motors":"TATAMOTORS",
  "Adani Green":"ADANIGREEN",
  "Wipro":"WIPRO",
  "MRF":"MRF",
  "HDFC":"HDFC",
  "Affle 3i Ltd":"AFFLE"
};

/* create a simple price map (separate from symbol map) */
const currentPrices = {};
Object.keys(stocks).forEach((name)=>{
  currentPrices[name] = random(200, 2000);
});

const mutualFunds = [
  "Edelweiss Nifty Midcap150 Momentum 50 Index Fund",
  "HDFC Mid Cap Fund",
  "HDFC Small Cap Fund",
  "Nippon India Large Cap Fund",
  "SBI Large Cap Fund"
];

/* ---------- persistence ---------- */
let portfolio = JSON.parse(localStorage.getItem('ny_portfolio')) || { stocks: {}, funds: {} };
function save(){ localStorage.setItem('ny_portfolio', JSON.stringify(portfolio)) }

/* ---------- DOM endpoints ---------- */
const stocksList = document.getElementById('stocksList');
const fundsList  = document.getElementById('fundsList');
const portfolioList = document.getElementById('portfolioList');
const assetsTotalEl = document.getElementById('assetsTotal');
const assetsPLEl = document.getElementById('assetsPL');
const assetsCountEl = document.getElementById('assetsCount');

const navStocks = document.getElementById('nav_stocks');
const navFunds  = document.getElementById('nav_funds');
const navPort   = document.getElementById('nav_portfolio');
const stocksPanel = document.getElementById('ny_stocks_panel');
const fundsPanel  = document.getElementById('ny_funds_panel');
const portPanel   = document.getElementById('ny_portfolio_panel');

let portfolioChart = null;

/* ---------- render single list item (stock) ---------- */
function makeLogoFor(name){
  // try first character(s)
  const initials = name.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase();
  const el = document.createElement('div'); el.className='item-logo'; el.textContent = initials;
  return el;
}

function renderStocks(){
  stocksList.innerHTML = '';
  Object.keys(stocks).forEach(name=>{
    const sym = stocks[name];
    const price = currentPrices[name] = currentPrices[name] || random(200, 2000);
    const pct = random(-2,2);
    const wrapper = document.createElement('div'); wrapper.className='list-item';

    const left = document.createElement('div'); left.className='item-left';
    left.appendChild(makeLogoFor(name));
    const meta = document.createElement('div'); meta.className='item-meta';
    const title = document.createElement('div'); title.className='item-title'; title.textContent = name;
    const sub = document.createElement('div'); sub.className='item-sub'; sub.textContent = `Stock | ${sym}`;
    meta.appendChild(title); meta.appendChild(sub);
    left.appendChild(meta);

    const right = document.createElement('div'); right.className='item-right';
    const priceEl = document.createElement('div'); priceEl.className='item-price'; priceEl.textContent = `₹${price}`;
    const change = document.createElement('div'); change.className='item-change ' + (pct>=0? 'change-up':'change-down');
    change.textContent = `${pct>=0? '▲':'▼'} ${Math.abs(pct).toFixed(2)}%`;
    right.appendChild(priceEl); right.appendChild(change);

    // controls (qty + buy)
    const ctr = document.createElement('div'); ctr.className='controls';
    const qty = document.createElement('input'); qty.type='number'; qty.min=1; qty.value=1; qty.className='qty';
    const btn = document.createElement('button'); btn.className='btn-buy'; btn.textContent='Buy';
    btn.onclick = ()=> buyStock(name, Number(qty.value), price);
    ctr.appendChild(qty); ctr.appendChild(btn);

    wrapper.appendChild(left);
    // right area + controls combined
    const rightBundle = document.createElement('div'); rightBundle.style.display='flex'; rightBundle.style.alignItems='center'; rightBundle.style.gap='12px';
    rightBundle.appendChild(ctr); rightBundle.appendChild(right);

    wrapper.appendChild(rightBundle);

    stocksList.appendChild(wrapper);
  });
}

/* ---------- funds renderer ---------- */
function renderFunds(){
  fundsList.innerHTML = '';
  mutualFunds.forEach(name=>{
    const nav = random(50,350);
    const pct = random(-1.5, 1.5);
    const wrapper = document.createElement('div'); wrapper.className='list-item';

    const left = document.createElement('div'); left.className='item-left';
    left.appendChild(makeLogoFor(name));
    const meta = document.createElement('div'); meta.className='item-meta';
    const title = document.createElement('div'); title.className='item-title'; title.textContent = name;
    const sub = document.createElement('div'); sub.className='item-sub'; sub.textContent = `Fund | ${name.split(' ')[0].toUpperCase()}`;
    meta.appendChild(title); meta.appendChild(sub);
    left.appendChild(meta);

    const right = document.createElement('div'); right.className='item-right';
    const priceEl = document.createElement('div'); priceEl.className='item-price'; priceEl.textContent = `₹${nav}`;
    const change = document.createElement('div'); change.className='item-change ' + (pct>=0? 'change-up':'change-down');
    change.textContent = `${pct>=0? '▲':'▼'} ${Math.abs(pct).toFixed(2)}%`;
    right.appendChild(priceEl); right.appendChild(change);

    const ctr = document.createElement('div'); ctr.className='controls';
    const qty = document.createElement('input'); qty.type='number'; qty.min=1; qty.value=1; qty.className='qty';
    const btn = document.createElement('button'); btn.className='btn-buy'; btn.textContent='Add';
    btn.onclick = ()=> buyFund(name, Number(qty.value), nav);
    ctr.appendChild(qty); ctr.appendChild(btn);

    wrapper.appendChild(left);
    const rightBundle = document.createElement('div'); rightBundle.style.display='flex'; rightBundle.style.alignItems='center'; rightBundle.style.gap='12px';
    rightBundle.appendChild(ctr); rightBundle.appendChild(right);
    wrapper.appendChild(rightBundle);

    fundsList.appendChild(wrapper);
  });
}

/* ---------- buy handlers ---------- */
function buyStock(name, qty, price){
  if(qty <= 0) return;
  if(!portfolio.stocks[name]) portfolio.stocks[name] = { qty:0, price:0 };
  const rec = portfolio.stocks[name];
  const totalExisting = rec.qty * rec.price;
  const newQty = rec.qty + qty;
  const newTotal = totalExisting + qty * price;
  rec.qty = newQty;
  rec.price = +(newTotal / newQty).toFixed(2);
  save(); renderPortfolio(); renderStocks(); showToast(`${qty} × ${name} added`);
}

function buyFund(name, units, nav){
  if(units <= 0) return;
  if(!portfolio.funds[name]) portfolio.funds[name] = { units:0, price:0, nav };
  const rec = portfolio.funds[name];
  const totalExisting = rec.units * rec.price;
  const newUnits = rec.units + units;
  const newTotal = totalExisting + units * nav;
  rec.units = newUnits;
  rec.price = +(newTotal / newUnits).toFixed(2);
  rec.nav = nav;
  save(); renderPortfolio(); renderFunds(); showToast(`${units} units of ${name} added`);
}

/* ---------- portfolio render + chart ---------- */
function renderPortfolio(){
  portfolioList.innerHTML = '';
  let totalValue = 0, totalCost = 0;
  const wrapper = document.createElement('div');

  // stocks
  Object.entries(portfolio.stocks).forEach(([name,rec])=>{
    const priceNow = currentPrices[name] || random(200,1200);
    const value = +(priceNow * rec.qty);
    const cost = +(rec.price * rec.qty);
    totalValue += value; totalCost += cost;

    const row = document.createElement('div'); row.className='port-row';
    const left = document.createElement('div'); left.className='port-left';
    const label = document.createElement('div'); label.textContent = name; label.style.fontWeight = 700;
    const sub = document.createElement('div'); sub.className='port-sub'; sub.textContent = `${rec.qty} qty @ ₹${rec.price.toFixed(2)}`;
    left.appendChild(label); left.appendChild(sub);

    const right = document.createElement('div'); right.className='port-right';
    right.innerHTML = `<div>₹${value.toFixed(2)}</div>`;
    const diff = +(value - cost);
    const pl = document.createElement('div');
    pl.textContent = `${diff>=0?'+':'-'}₹${Math.abs(diff).toFixed(2)}`;
    pl.style.color = diff>=0? 'var(--success)': 'var(--danger)';
    right.appendChild(pl);

    row.appendChild(left); row.appendChild(right);
    wrapper.appendChild(row);
  });

  // funds
  Object.entries(portfolio.funds).forEach(([name,rec])=>{
    const nav = rec.nav || random(60,300);
    const value = +(nav * rec.units);
    const cost = +(rec.price * rec.units);
    totalValue += value; totalCost += cost;

    const row = document.createElement('div'); row.className='port-row';
    const left = document.createElement('div'); left.className='port-left';
    const label = document.createElement('div'); label.textContent = name; label.style.fontWeight = 700;
    const sub = document.createElement('div'); sub.className='port-sub'; sub.textContent = `${rec.units} units @ ₹${rec.price.toFixed(2)}`;
    left.appendChild(label); left.appendChild(sub);

    const right = document.createElement('div'); right.className='port-right';
    right.innerHTML = `<div>₹${value.toFixed(2)}</div>`;
    const diff = +(value - cost);
    const pl = document.createElement('div');
    pl.textContent = `${diff>=0?'+':'-'}₹${Math.abs(diff).toFixed(2)}`;
    pl.style.color = diff>=0? 'var(--success)': 'var(--danger)';
    right.appendChild(pl);

    row.appendChild(left); row.appendChild(right);
    wrapper.appendChild(row);
  });

  if(wrapper.children.length === 0){
    const e = document.createElement('div'); e.style.color='var(--muted)'; e.textContent='No holdings yet.';
    portfolioList.appendChild(e);
  } else {
    portfolioList.appendChild(wrapper);
  }

  const plTotal = totalValue - totalCost;
  assetsTotalEl.textContent = `₹${totalValue.toFixed(2)}`;
  assetsPLEl.textContent = `${plTotal>=0?'+':'-'}₹${Math.abs(plTotal).toFixed(2)}`;
  assetsPLEl.style.background = plTotal >= 0 ? 'rgba(46,204,113,0.12)' : 'rgba(231,76,60,0.12)';
  assetsCountEl.textContent = `Holdings: ${Object.keys(portfolio.stocks).length + Object.keys(portfolio.funds).length}`;

  renderPortfolioChart(totalValue);
}

/* ---------- chart (6 month) ---------- */
function renderPortfolioChart(totalValue){
  const labels = [];
  for(let i=5;i>=0;i--){
    const d = new Date(); d.setMonth(d.getMonth()-i);
    labels.push(d.toLocaleString('default', { month:'short' }));
  }
  let base = totalValue > 0 ? totalValue : 2000;
  const data = [ +(base*0.98).toFixed(2) ];
  for(let i=1;i<labels.length;i++){
    const prev = data[i-1];
    const change = prev * (random(-0.06, 0.06));
    data.push( +(prev + change).toFixed(2) );
  }

  const wrap = document.getElementById('portfolioChartWrap');
  wrap.innerHTML = '<canvas id="portfolioChart"></canvas>';
  const ctx = document.getElementById('portfolioChart').getContext('2d');

  if(portfolioChart) portfolioChart.destroy();
  portfolioChart = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[{ label:'Portfolio', data, borderColor:'#2E8B7E', backgroundColor:'rgba(46,139,126,0.12)', fill:true, tension:0.3 }]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false}, ticks:{color:'#9fb3b0'}}, y:{ticks:{color:'#9fb3b0'}} } }
  });
  const c = document.getElementById('portfolioChart');
  c.style.width = '100%';
  c.style.height = '260px';
}

/* ---------- navigation ---------- */
navStocks.addEventListener('click', ()=> activateNav('stocks'));
navFunds.addEventListener('click', ()=> activateNav('funds'));
navPort.addEventListener('click', ()=> activateNav('portfolio'));

function activateNav(tab){
  navStocks.classList.remove('active'); navFunds.classList.remove('active'); navPort.classList.remove('active');
  stocksPanel.style.display = 'none'; fundsPanel.style.display = 'none'; portPanel.style.display = 'none';
  if(tab==='stocks'){ navStocks.classList.add('active'); stocksPanel.style.display='block' }
  if(tab==='funds'){  navFunds.classList.add('active');  fundsPanel.style.display='block' }
  if(tab==='portfolio'){ navPort.classList.add('active'); portPanel.style.display='block' }
}

/* ---------- toast ---------- */
function showToast(txt){
  const t = document.createElement('div'); t.textContent = txt;
  Object.assign(t.style,{position:'fixed',left:'50%',transform:'translateX(-50%)',bottom:'120px',background:'rgba(0,0,0,0.75)',padding:'8px 14px',borderRadius:'10px',zIndex:999});
  document.body.appendChild(t); setTimeout(()=> t.remove(),1500);
}

/* ---------- init ---------- */
function init(){
  renderStocks(); renderFunds(); renderPortfolio();
  activateNav('stocks');
}
init();

/* Expose for console debugging */
window._ny = { portfolio, renderPortfolio, renderStocks, renderFunds };
