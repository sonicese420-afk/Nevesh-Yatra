/* script.js - updated
   Shows ▲/▼ on cards only when the item is owned in portfolio
*/

/* small helpers */
function random(a,b){ return +(Math.random()*(b-a)+a).toFixed(2) }

/* sample data (symbol map) */
const stocks = {
  "Tata Motors":"TATAMOTORS",
  "Adani Green":"ADANIGREEN",
  "Wipro":"WIPRO",
  "MRF":"MRF",
  "Reliance":"RELIANCE",
  "HDFC":"HDFC",
  "Affle 3i Ltd":"AFFLE"
};

const mutualFunds = [
  "Edelweiss Nifty Midcap150 Momentum 50 Index Fund",
  "HDFC Mid Cap Fund",
  "HDFC Small Cap Fund",
  "Nippon India Large Cap Fund",
  "SBI Large Cap Fund"
];

/* current prices (simulate) */
const currentPrices = {};
Object.keys(stocks).forEach(name => currentPrices[name] = random(200,2000));

/* persisted portfolio */
let portfolio = JSON.parse(localStorage.getItem('ny_portfolio')) || { stocks:{}, funds:{} };
function save(){ localStorage.setItem('ny_portfolio', JSON.stringify(portfolio)) }

/* cached DOM */
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

/* tiny logo generator (initials) */
function makeLogoFor(name){
  const initials = name.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase();
  const div = document.createElement('div'); div.className='item-logo'; div.textContent = initials;
  return div;
}

/* Render a single stock row that matches your mock */
function renderStocks(){
  stocksList.innerHTML = '';
  Object.keys(stocks).forEach(name=>{
    const sym = stocks[name];
    const price = currentPrices[name] = currentPrices[name] || random(200,2000);
    const pct = random(-2.5,2.5); // simulated percent (we will only display if owned)

    const card = document.createElement('div'); card.className='list-item';

    const left = document.createElement('div'); left.className='item-left';
    left.appendChild(makeLogoFor(name));

    const meta = document.createElement('div'); meta.className='item-meta';
    const title = document.createElement('div'); title.className='item-title'; title.textContent = name;
    const badgeRow = document.createElement('div'); badgeRow.className='item-badge';
    const badge = document.createElement('span'); badge.className='badge-chip'; badge.textContent = 'Stock';
    const sib = document.createElement('span'); sib.style.color='var(--muted)'; sib.style.fontSize='12px'; sib.textContent = ` | ${sym}`;
    badgeRow.appendChild(badge); badgeRow.appendChild(sib);

    meta.appendChild(title); meta.appendChild(badgeRow);
    left.appendChild(meta);

    const rightBlock = document.createElement('div'); rightBlock.className='right-block';

    const controls = document.createElement('div'); controls.className='controls';
    const qty = document.createElement('input'); qty.type='number'; qty.min=1; qty.value=1; qty.className='qty';
    const buy = document.createElement('button'); buy.className='btn-buy'; buy.textContent='Buy';
    buy.onclick = ()=> buyStock(name, Number(qty.value), price);
    controls.appendChild(qty); controls.appendChild(buy);

    const priceArea = document.createElement('div'); priceArea.style.textAlign='right';
    const priceEl = document.createElement('div'); priceEl.className='item-price'; priceEl.textContent = `₹${price}`;
    priceArea.appendChild(priceEl);

    /* ONLY show pct chip if user OWNS this stock */
    if(portfolio.stocks && portfolio.stocks[name]){
      const pctEl = document.createElement('div'); pctEl.className='pct-chip ' + (pct>=0? 'pct-up':'pct-down');
      pctEl.textContent = `${pct>=0? '▲':'▼'} ${Math.abs(pct).toFixed(2)}%`;
      priceArea.appendChild(pctEl);
    }

    rightBlock.appendChild(controls);
    rightBlock.appendChild(priceArea);

    card.appendChild(left);
    card.appendChild(rightBlock);
    stocksList.appendChild(card);
  });
}

/* Render funds — similar layout with 'Fund' badge, pct only if owned */
function renderFunds(){
  fundsList.innerHTML = '';
  mutualFunds.forEach(name=>{
    const nav = random(50,350);
    const pct = random(-1.5,1.5);

    const card = document.createElement('div'); card.className='list-item';
    const left = document.createElement('div'); left.className='item-left';
    left.appendChild(makeLogoFor(name));
    const meta = document.createElement('div'); meta.className='item-meta';
    const title = document.createElement('div'); title.className='item-title'; title.textContent = name;
    const badgeRow = document.createElement('div'); badgeRow.className='item-badge';
    const badge = document.createElement('span'); badge.className='badge-chip'; badge.textContent = 'Fund';
    const sib = document.createElement('span'); sib.style.color='var(--muted)'; sib.style.fontSize='12px'; sib.textContent = ` | ${name.split(' ')[0].toUpperCase()}`;
    badgeRow.appendChild(badge); badgeRow.appendChild(sib);
    meta.appendChild(title); meta.appendChild(badgeRow);
    left.appendChild(meta);

    const rightBlock = document.createElement('div'); rightBlock.className='right-block';
    const controls = document.createElement('div'); controls.className='controls';
    const qty = document.createElement('input'); qty.type='number'; qty.min=1; qty.value=1; qty.className='qty';
    const add = document.createElement('button'); add.className='btn-buy'; add.textContent='Add';
    add.onclick = ()=> buyFund(name, Number(qty.value), nav);
    controls.appendChild(qty); controls.appendChild(add);

    const priceArea = document.createElement('div'); priceArea.style.textAlign='right';
    const priceEl = document.createElement('div'); priceEl.className='item-price'; priceEl.textContent = `₹${nav}`;
    priceArea.appendChild(priceEl);

    /* ONLY show pct chip if user OWNS this fund */
    if(portfolio.funds && portfolio.funds[name]){
      const pctEl = document.createElement('div'); pctEl.className='pct-chip ' + (pct>=0? 'pct-up':'pct-down');
      pctEl.textContent = `${pct>=0? '▲':'▼'} ${Math.abs(pct).toFixed(2)}%`;
      priceArea.appendChild(pctEl);
    }

    rightBlock.appendChild(controls); rightBlock.appendChild(priceArea);
    card.appendChild(left); card.appendChild(rightBlock);
    fundsList.appendChild(card);
  });
}

/* buy handlers (averaging) */
function buyStock(name, qty, price){
  if(qty<=0) return;
  if(!portfolio.stocks[name]) portfolio.stocks[name] = { qty:0, price:0 };
  const r = portfolio.stocks[name];
  const totalExisting = r.qty * r.price;
  const newQty = r.qty + qty;
  const newTotal = totalExisting + qty * price;
  r.qty = newQty; r.price = +(newTotal / newQty).toFixed(2);
  save(); renderPortfolio(); renderStocks(); showToast(`${qty} × ${name} added`);
}
function buyFund(name, units, nav){
  if(units<=0) return;
  if(!portfolio.funds[name]) portfolio.funds[name] = { units:0, price:0, nav };
  const r = portfolio.funds[name];
  const totalExisting = r.units * r.price;
  const newUnits = r.units + units;
  const newTotal = totalExisting + units * nav;
  r.units = newUnits; r.price = +(newTotal / newUnits).toFixed(2); r.nav = nav;
  save(); renderPortfolio(); renderFunds(); showToast(`${units} units of ${name} added`);
}

/* portfolio rendering with up/down arrow per holding */
function renderPortfolio(){
  portfolioList.innerHTML = '';
  let totalValue = 0, totalCost = 0;
  const frag = document.createDocumentFragment();

  Object.entries(portfolio.stocks).forEach(([name,rec])=>{
    const priceNow = currentPrices[name] || random(200,1200);
    const value = +(priceNow * rec.qty);
    const cost = +(rec.price * rec.qty);
    totalValue += value; totalCost += cost;

    const row = document.createElement('div'); row.className='port-row';
    const left = document.createElement('div'); left.className='port-left';
    const logo = makeLogoFor(name); logo.style.width='44px'; logo.style.height='44px';
    left.appendChild(logo);
    const meta = document.createElement('div'); meta.style.display='flex'; meta.style.flexDirection='column';
    const title = document.createElement('div'); title.className='port-title'; title.textContent = name;
    const sub = document.createElement('div'); sub.className='port-sub'; sub.textContent = `${rec.qty} qty @ ₹${rec.price.toFixed(2)}`;
    meta.appendChild(title); meta.appendChild(sub);
    left.appendChild(meta);

    const right = document.createElement('div'); right.className='port-right';
    right.innerHTML = `<div>₹${value.toFixed(2)}</div>`;
    const diff = +(value - cost);
    const arrow = document.createElement('span'); arrow.className='port-arrow'; arrow.textContent = diff >=0 ? '▲' : '▼';
    arrow.style.color = diff >=0 ? 'var(--success)' : 'var(--danger)';
    arrow.style.marginLeft = '8px';
    const pl = document.createElement('div'); pl.textContent = `${diff>=0?'+':'-'}₹${Math.abs(diff).toFixed(2)}`; pl.style.color = diff>=0 ? 'var(--success)':'var(--danger)';
    right.appendChild(arrow); right.appendChild(pl);

    row.appendChild(left); row.appendChild(right);
    frag.appendChild(row);
  });

  Object.entries(portfolio.funds).forEach(([name,rec])=>{
    const nav = rec.nav || random(60,300);
    const value = +(nav * rec.units);
    const cost = +(rec.price * rec.units);
    totalValue += value; totalCost += cost;

    const row = document.createElement('div'); row.className='port-row';
    const left = document.createElement('div'); left.className='port-left';
    const logo = makeLogoFor(name); logo.style.width='44px'; logo.style.height='44px';
    left.appendChild(logo);
    const meta = document.createElement('div'); meta.style.display='flex'; meta.style.flexDirection='column';
    const title = document.createElement('div'); title.className='port-title'; title.textContent = name;
    const sub = document.createElement('div'); sub.className='port-sub'; sub.textContent = `${rec.units} units @ ₹${rec.price.toFixed(2)}`;
    meta.appendChild(title); meta.appendChild(sub);
    left.appendChild(meta);

    const right = document.createElement('div'); right.className='port-right';
    right.innerHTML = `<div>₹${value.toFixed(2)}</div>`;
    const diff = +(value - cost);
    const arrow = document.createElement('span'); arrow.className='port-arrow'; arrow.textContent = diff >=0 ? '▲' : '▼';
    arrow.style.color = diff >=0 ? 'var(--success)' : 'var(--danger)';
    const pl = document.createElement('div'); pl.textContent = `${diff>=0?'+':'-'}₹${Math.abs(diff).toFixed(2)}`; pl.style.color = diff>=0 ? 'var(--success)':'var(--danger)';
    right.appendChild(arrow); right.appendChild(pl);

    row.appendChild(left); row.appendChild(right);
    frag.appendChild(row);
  });

  if(!frag.children || frag.children.length === 0){
    const e = document.createElement('div'); e.style.color='var(--muted)'; e.textContent='No holdings yet.'; portfolioList.appendChild(e);
  }else{
    portfolioList.appendChild(frag);
  }

  const plTotal = totalValue - totalCost;
  assetsTotalEl.textContent = `₹${totalValue.toFixed(2)}`;
  assetsPLEl.textContent = `${plTotal>=0?'+':'-'}₹${Math.abs(plTotal).toFixed(2)}`;
  assetsPLEl.style.background = plTotal >= 0 ? 'rgba(46,204,113,0.12)' : 'rgba(231,76,60,0.12)';
  assetsCountEl.textContent = `Holdings: ${Object.keys(portfolio.stocks).length + Object.keys(portfolio.funds).length}`;

  renderPortfolioChart(totalValue);
}

/* Chart: 6 month */
function renderPortfolioChart(totalValue){
  const labels = [];
  for(let i=5;i>=0;i--){
    const d = new Date(); d.setMonth(d.getMonth()-i);
    labels.push(d.toLocaleString('default', { month:'short' }));
  }
  let startVal = totalValue > 0 ? totalValue : 2000;
  const data = [];
  for(let i=0;i<labels.length;i++){
    const v = +(startVal * (1 + (random(-0.06,0.06))).toFixed(2));
    data.push(v);
    startVal = v;
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

/* navigation */
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

/* toast */
function showToast(txt){
  const t = document.createElement('div'); t.textContent = txt;
  Object.assign(t.style,{position:'fixed',left:'50%',transform:'translateX(-50%)',bottom:'120px',background:'rgba(0,0,0,0.75)',padding:'8px 14px',borderRadius:'10px',zIndex:999});
  document.body.appendChild(t); setTimeout(()=> t.remove(),1400);
}

/* init */
function init(){
  renderStocks(); renderFunds(); renderPortfolio();
  activateNav('stocks');
}
init();

/* expose for debug */
window._ny = { portfolio, renderPortfolio, renderStocks, renderFunds, currentPrices };
