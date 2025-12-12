/* -------------------------
  Updated script.js
  Fixes:
   - Chart stretching by using explicit canvas height, maintainAspectRatio:false,
     ResizeObserver to resize chart to container size and re-create dataset.
   - Drawer always scrolls to top and occupies full sheet so chart visible.
   - Buy/Sell/SIP reliably wired with defensive listeners.
   - Safe chart destruction to avoid double instances.
------------------------- */

/* ---------- demo data ---------- */
const STOCKS = [
  { id:'RE', name:'Reliance Industries Ltd', sym:'RELIANCE', price: 1398.07 },
  { id:'TM', name:'Tata Motors', sym:'TATAMOTORS', price: 1006.98 },
  { id:'AG', name:'Adani Green', sym:'ADANIGREEN', price: 1181.45 },
  { id:'WI', name:'Wipro', sym:'WIPRO', price: 574.44 },
  { id:'MR', name:'MRF', sym:'MRF', price: 1898.78 },
  { id:'HD', name:'HDFC', sym:'HDFC', price: 1846.28 },
  { id:'AF', name:'Affle 3i Ltd', sym:'AFFLE', price: 410.22 }
];

const FUNDS = [
  { id:'ED', name:'Edelweiss Nifty Midcap150 Momentum 50 Index Fund', sym:'EDEL', price: 232.4 },
  { id:'HM', name:'HDFC Mid Cap Fund', sym:'HDFC_MID', price: 132.76 },
  { id:'HS', name:'HDFC Small Cap Fund', sym:'HDFC_SM', price: 276.12 },
  { id:'NL', name:'Nippon India Large Cap Fund', sym:'NIPPON_L', price: 98.34 },
  { id:'SB', name:'SBI Large Cap Fund', sym:'SBI_L', price: 110.45 },
  { id:'NM', name:'Nippon India Mid Cap Fund', sym:'NIPPON_M', price: 145.22 },
  { id:'NS', name:'Nippon India Small Cap Fund', sym:'NIPPON_S', price: 63.15 },
  { id:'HL', name:'HDFC Large Cap Fund', sym:'HDFC_L', price: 121.88 }
];

/* ---------- storage ---------- */
const STORAGE_KEY = 'nv_portfolio_v2';
let portfolio = {};
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  portfolio = raw ? JSON.parse(raw) : {};
} catch(e) {
  console.warn('Could not parse portfolio storage, starting fresh.');
  portfolio = {};
}

function savePortfolio() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  } catch(e) {
    console.error('Failed saving portfolio', e);
  }
}

/* ---------- DOM refs ---------- */
const cardsContainer = document.getElementById('cardsContainer');
const sectionTitle = document.getElementById('sectionTitle');
const totalAssetsEl = document.getElementById('totalAssets');
const holdingsCountEl = document.getElementById('holdingsCount');
const totalChangeEl = document.getElementById('totalChange');

const tabStocks = document.getElementById('tabStocks');
const tabFunds = document.getElementById('tabFunds');
const tabPortfolio = document.getElementById('tabPortfolio');

const detailDrawer = document.getElementById('detailDrawer');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const closeDrawer = document.getElementById('closeDrawer');

const detailName = document.getElementById('detailName');
const detailType = document.getElementById('detailType');
const detailPriceLarge = document.getElementById('detailPriceLarge');
const detailChangeLarge = document.getElementById('detailChangeLarge');
const detailAvatar = document.getElementById('detailAvatar');

const tradeQtyInput = document.getElementById('tradeQty');
const buyActionBtn = document.getElementById('buyAction');
const sellActionBtn = document.getElementById('sellAction');
const sipActionBtn = document.getElementById('sipAction');

const rangeButtons = Array.from(document.querySelectorAll('.range-btn'));

let activeContext = 'stocks';
let activeDetail = null;
let detailChart = null;
let chartResizeObserver = null;

/* ---------- small helpers ---------- */
function fmtMoney(v){
  if(typeof v !== 'number') v = Number(v) || 0;
  return '₹' + v.toLocaleString(undefined,{maximumFractionDigits:2});
}

/* avoid multiple event attachments */
function clearContainer(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
}

/* ---------- summary ---------- */
function updateSummary(){
  const all = [...STOCKS, ...FUNDS];
  let total = 0, holdings = 0;
  for(const id in portfolio){
    const pos = portfolio[id];
    const info = all.find(x=>x.id === id);
    if(!info) continue;
    total += info.price * pos.qty;
    holdings += pos.qty;
  }
  totalAssetsEl.textContent = fmtMoney(total);
  holdingsCountEl.textContent = 'Holdings: ' + holdings;
  totalChangeEl.textContent = (total === 0 ? '+₹0 (0.00%)' : `+₹${(total*0.02).toFixed(2)} (2.00%)`);
}

/* ---------- renderers ---------- */
function createCard(id, titleText, subtitleText, priceText, owned=false){
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = id;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = id.slice(0,2);

  const meta = document.createElement('div');
  meta.className = 'meta';
  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = titleText;
  const sub = document.createElement('div');
  sub.className = 'sub';
  sub.textContent = subtitleText;
  meta.appendChild(title);
  meta.appendChild(sub);

  const right = document.createElement('div');
  right.className = 'right';
  const price = document.createElement('div');
  price.className = 'price';
  price.textContent = priceText;
  right.appendChild(price);

  if(owned){
    const badge = document.createElement('div');
    badge.className = 'pct';
    const rnd = ((Math.random()*2)-1).toFixed(2);
    badge.textContent = (rnd >= 0 ? '▲ ' : '▼ ') + Math.abs(rnd) + '%';
    badge.style.color = rnd >= 0 ? 'var(--accent)' : 'var(--danger)';
    right.appendChild(badge);
  }

  card.appendChild(avatar);
  card.appendChild(meta);
  card.appendChild(right);
  return card;
}

function renderStocks(){
  sectionTitle.textContent = 'Buy Stocks';
  clearContainer(cardsContainer);
  STOCKS.forEach(s=>{
    const owned = portfolio[s.id] && portfolio[s.id].qty > 0;
    const c = createCard(s.id, s.name, `Stock | ${s.sym}`, fmtMoney(s.price), owned);
    c.addEventListener('click', ()=> openDetail('stock', s));
    cardsContainer.appendChild(c);
  });
  updateSummary();
}

function renderFunds(){
  sectionTitle.textContent = 'Mutual Funds';
  clearContainer(cardsContainer);
  FUNDS.forEach(f=>{
    const owned = portfolio[f.id] && portfolio[f.id].qty > 0;
    const c = createCard(f.id, f.name, `Fund | ${f.sym}`, fmtMoney(f.price), owned);
    c.addEventListener('click', ()=> openDetail('fund', f));
    cardsContainer.appendChild(c);
  });
  updateSummary();
}

function renderPortfolio(){
  sectionTitle.textContent = 'Your Portfolio';
  clearContainer(cardsContainer);
  const all = [...STOCKS, ...FUNDS];
  let any=false;
  for(const id in portfolio){
    const pos = portfolio[id];
    const info = all.find(x=>x.id===id);
    if(!info) continue;
    any = true;
    // create card but show holding & P/L
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = id;
    const avatar = document.createElement('div'); avatar.className='avatar'; avatar.textContent=id.slice(0,2);
    const meta = document.createElement('div'); meta.className='meta';
    const title = document.createElement('div'); title.className='title'; title.textContent=info.name;
    const sub = document.createElement('div'); sub.className='sub'; sub.textContent=`You own ${pos.qty} @ avg ${fmtMoney(pos.avg)}`;
    meta.appendChild(title); meta.appendChild(sub);
    const right = document.createElement('div'); right.className='right';
    const value = document.createElement('div'); value.className='price'; value.textContent = fmtMoney(info.price * pos.qty);
    const plPct = ((((info.price - pos.avg) / pos.avg) * 100)).toFixed(2);
    const pldom = document.createElement('div'); pldom.className='pct'; pldom.textContent = (plPct>=0 ? '▲ ':'▼ ') + Math.abs(plPct) + '%';
    pldom.style.color = plPct >= 0 ? 'var(--accent)' : 'var(--danger)';
    right.appendChild(value); right.appendChild(pldom);
    card.appendChild(avatar); card.appendChild(meta); card.appendChild(right);
    card.addEventListener('click', ()=> openDetail((STOCKS.find(s=>s.id===id)?'stock':'fund'), info));
    cardsContainer.appendChild(card);
  }
  if(!any){
    const el = document.createElement('div');
    el.style.padding='18px'; el.style.color='var(--muted)';
    el.textContent = 'No holdings yet — buy some stocks or funds to see them here.';
    cardsContainer.appendChild(el);
  }
  updateSummary();
}

/* ---------- drawer + chart ---------- */

function safeDestroyChart(){
  if(detailChart){
    try{
      detailChart.destroy();
    }catch(e){
      // ignore
    }
    detailChart = null;
  }
  if(chartResizeObserver){
    try{ chartResizeObserver.disconnect(); }catch(e){}
    chartResizeObserver = null;
  }
}

/* create dataset (placeholder random walk) */
function makeSeries(base, count){
  const arr = [];
  let v = base;
  for(let i=0;i<count;i++){
    v += (Math.random()-0.5) * (base * 0.008);
    arr.push(Number(v.toFixed(2)));
  }
  return arr;
}

/* Draw chart reliably sized to container */
function drawChartForPrice(basePrice, rangeKey){
  // Determine desired point count for range
  const count = rangeKey === '1D' ? 60 : rangeKey === '1W' ? 56 : rangeKey === '1M' ? 30 : rangeKey === '6M' ? 90 : 120;
  const canvas = document.getElementById('detailChart');
  // set explicit CSS height (prevents CSS scaling weirdness)
  const container = canvas.parentElement;
  canvas.style.width = '100%';
  canvas.style.display = 'block';
  // pick a height appropriate to screen
  const h = Math.min(380, Math.max(220, Math.floor(window.innerHeight * 0.33)));
  canvas.style.height = h + 'px';
  // destroy existing to prevent stacking
  safeDestroyChart();

  const ctx = canvas.getContext('2d');

  const data = makeSeries(basePrice, count);

  detailChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: new Array(count).fill(''),
      datasets: [{
        data,
        borderColor: '#2fd59f',
        backgroundColor: 'rgba(47,213,159,0.04)',
        pointRadius: 0,
        tension: 0.25,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // <-- critical to avoid stretching
      animation: { duration: 180 },
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: {
          ticks: { color: 'rgba(255,255,255,0.7)' },
          grid: { color: 'rgba(255,255,255,0.03)' }
        }
      },
      elements: {
        line: { borderWidth: 3 }
      }
    }
  });

  // Use ResizeObserver to monitor container size and call chart.resize()
  try {
    if (typeof ResizeObserver !== 'undefined') {
      chartResizeObserver = new ResizeObserver(()=> {
        if(detailChart && typeof detailChart.resize === 'function'){
          detailChart.resize();
        }
      });
      chartResizeObserver.observe(container);
    } else {
      // fallback: bind window resize
      window.addEventListener('resize', ()=> {
        if(detailChart && typeof detailChart.resize === 'function') detailChart.resize();
      });
    }
  } catch(e){
    console.warn('Resize observer not available', e);
  }
}

/* open detail drawer for an item (stock or fund) */
function openDetail(type, item){
  activeDetail = { type, item };
  // fill fields
  detailName.textContent = item.name;
  detailType.textContent = (type === 'stock' ? 'Stock' : 'Fund') + ' | ' + item.sym;
  detailPriceLarge.textContent = fmtMoney(item.price);

  // show change only if owned
  const pos = portfolio[item.id];
  if(pos && pos.qty > 0){
    const ch = (((item.price - pos.avg)/pos.avg) * 100).toFixed(2);
    detailChangeLarge.textContent = (ch >= 0 ? '▲ ' : '▼ ') + Math.abs(ch) + '%';
    detailChangeLarge.style.color = ch >= 0 ? 'var(--accent)' : 'var(--danger)';
  } else {
    detailChangeLarge.textContent = '';
  }

  detailAvatar.textContent = item.id.slice(0,2);
  tradeQtyInput.value = 1;

  // set default range active (1D)
  rangeButtons.forEach(b=>b.classList.remove('active'));
  const one = document.querySelector('.range-btn[data-range="1D"]');
  if(one) one.classList.add('active');

  // ensure drawer visible and scrolled to top
  detailDrawer.classList.remove('hidden');
  detailDrawer.setAttribute('aria-hidden','false');
  // scroll drawer-content to top to show chart always
  const drawerContent = detailDrawer.querySelector('.drawer-content');
  if(drawerContent) drawerContent.scrollTop = 0;

  // Draw the chart with correct sizing
  drawChartForPrice(item.price, '1D');

  // attach trade buttons defensively (remove existing then add)
  buyActionBtn.replaceWith(buyActionBtn.cloneNode(true));
  sellActionBtn.replaceWith(sellActionBtn.cloneNode(true));
  sipActionBtn.replaceWith(sipActionBtn.cloneNode(true));
  // rebind references
  const newBuy = document.getElementById('buyAction');
  const newSell = document.getElementById('sellAction');
  const newSip = document.getElementById('sipAction');

  const safeQty = ()=> Math.max(1, Number(tradeQtyInput.value) || 1);

  newBuy.addEventListener('click', function(e){
    e.preventDefault();
    newBuy.disabled = true;
    try {
      const qty = safeQty();
      const id = item.id;
      if(!portfolio[id]) portfolio[id] = { qty: 0, avg: item.price };
      const cur = portfolio[id];
      const newAvg = ((cur.avg * cur.qty) + (item.price * qty)) / (cur.qty + qty);
      cur.avg = newAvg; cur.qty += qty;
      savePortfolio();
      renderCurrent();
    } finally {
      newBuy.disabled = false;
      closeDetail();
    }
  });

  newSell.addEventListener('click', function(e){
    e.preventDefault();
    newSell.disabled = true;
    try {
      const qty = safeQty();
      const id = item.id;
      if(!portfolio[id]) return;
      portfolio[id].qty = Math.max(0, portfolio[id].qty - qty);
      if(portfolio[id].qty === 0) delete portfolio[id];
      savePortfolio();
      renderCurrent();
    } finally {
      newSell.disabled = false;
      closeDetail();
    }
  });

  newSip.addEventListener('click', function(e){
    e.preventDefault();
    newSip.disabled = true;
    try {
      const id = item.id;
      if(!portfolio[id]) portfolio[id] = { qty:0, avg: item.price };
      const cur = portfolio[id];
      // SIP add single unit at current price
      cur.avg = ((cur.avg * cur.qty) + item.price) / (cur.qty + 1);
      cur.qty += 1;
      savePortfolio();
      renderCurrent();
    } finally {
      newSip.disabled = false;
      closeDetail();
    }
  });
}

/* close drawer safely */
function closeDetail(){
  safeDestroyChart();
  detailDrawer.classList.add('hidden');
  detailDrawer.setAttribute('aria-hidden','true');
  activeDetail = null;
}

/* ---------- range button wiring ---------- */
rangeButtons.forEach(b=>{
  b.addEventListener('click', ()=>{
    rangeButtons.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    if(activeDetail && activeDetail.item){
      // redraw based on selected range
      drawChartForPrice(activeDetail.item.price, b.dataset.range);
    }
  });
});

/* ---------- bottom nav wiring ---------- */
tabStocks.addEventListener('click', ()=> { setActive('stocks'); });
tabFunds.addEventListener('click', ()=> { setActive('funds'); });
tabPortfolio.addEventListener('click', ()=> { setActive('portfolio'); });

function setActive(tab){
  activeContext = tab;
  document.querySelectorAll('.bottom-nav .tab').forEach(t=>t.classList.remove('active'));
  if(tab==='stocks') tabStocks.classList.add('active');
  if(tab==='funds') tabFunds.classList.add('active');
  if(tab==='portfolio') tabPortfolio.classList.add('active');
  renderCurrent();
}

/* ---------- render current ---------- */
function renderCurrent(){
  if(activeContext === 'stocks') renderStocks();
  else if(activeContext === 'funds') renderFunds();
  else renderPortfolio();
}

/* ---------- drawer close handlers ---------- */
drawerBackdrop.addEventListener('click', closeDetail);
closeDrawer.addEventListener('click', closeDetail);

/* ---------- initial render ---------- */
(function init(){
  // ensure portfolio is object
  if(!portfolio || typeof portfolio !== 'object') portfolio = {};
  renderCurrent();
  updateSummary();
})();

/* ---------- expose for debugging ---------- */
window._nv = {
  STOCKS, FUNDS, portfolio, savePortfolio, renderCurrent, openDetail, closeDetail
};
