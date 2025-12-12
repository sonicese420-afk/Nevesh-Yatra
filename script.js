// Simple demo JS: renders lists, handles modal, stores portfolio in localStorage
const stocks = [
  {id:'RELIANCE', name:'Reliance Industries Ltd', price:1398.07, symbol:'RE'},
  {id:'TATAMOT', name:'Tata Motors', price:1006.98, symbol:'TM'},
  {id:'ADANIGREEN', name:'Adani Green', price:1181.45, symbol:'AG'},
  {id:'WIPRO', name:'Wipro', price:1485.01, symbol:'W'},
  {id:'MRF', name:'MRF', price:1898.78, symbol:'M'}
];

const funds = [
  {id:'EDEL', name:'Edelweiss Nifty Midcap150 Momentum 50 Index Fund', price:232.4, symbol:'ED'},
  {id:'HDFC_MID', name:'HDFC Mid Cap Fund', price:132.76, symbol:'HD'},
  {id:'HDFC_SM', name:'HDFC Small Cap Fund', price:276.12, symbol:'HD2'},
  {id:'NIPPON_LC', name:'Nippon India Large Cap Fund', price:412.8, symbol:'NI'},
  {id:'SBI_LC', name:'SBI Large Cap Fund', price:299.5, symbol:'SB'},
  {id:'NIPPON_MC', name:'Nippon India Growth Mid Cap Fund', price:188.5, symbol:'NM'},
  {id:'NIPPON_SC', name:'Nippon India Small Cap Fund', price:172.2, symbol:'NS'},
  {id:'HDFC_LC', name:'HDFC Large Cap Fund', price:240.1, symbol:'HL'}
];

// localStorage portfolio
let portfolio = JSON.parse(localStorage.getItem('nv_portfolio')||'{}');

const listArea = document.getElementById('listArea');
const sectionTitle = document.getElementById('sectionTitle');
const summaryAssets = document.getElementById('totalAssets');
const holdingsCount = document.getElementById('holdingsCount');

function formatRupee(x){return '₹'+Number(x).toLocaleString(undefined,{maximumFractionDigits:2})}

function calcSummary(){
  let total=0, count=0;
  Object.values(portfolio).forEach(h=>{ total += h.qty*(h.current||h.price); count += h.qty?1:0});
  summaryAssets.textContent = formatRupee(total || 0);
  holdingsCount.textContent = `Holdings: ${Object.keys(portfolio).length}`;
}

function createCard(item, type){
  const card = document.createElement('div');card.className='card item';
  card.dataset.id = item.id; card.dataset.type = type;
  const left = document.createElement('div');left.className='item-left';
  const avatar = document.createElement('div');avatar.className='avatar';avatar.textContent = item.symbol.slice(0,2);
  const text = document.createElement('div');
  const title = document.createElement('div');title.className='item-title'; title.textContent = item.name;
  const sub = document.createElement('div'); sub.className='item-sub'; sub.textContent = (type==='stock'? 'Stock | ' : 'Fund | ') + item.id;
  text.append(title, sub);
  left.append(avatar, text);

  const right = document.createElement('div'); right.className='item-right';
  const price = document.createElement('div'); price.className='item-price'; price.textContent = formatRupee(item.price);
  const change = document.createElement('div'); change.className='item-change';

  // show arrow + percent only if owned in portfolio
  if(portfolio[item.id]){
    const p = Math.round(((item.price - (portfolio[item.id].avg||item.price))/ (portfolio[item.id].avg||item.price))*10000)/100;
    const sign = p>=0? '▲':'▼';
    change.textContent = `${sign} ${Math.abs(p)}%`;
    change.style.color = p>=0? 'var(--success)':'var(--danger)';
  }

  right.append(price, change);
  card.append(left, right);

  card.addEventListener('click', ()=> openDetail(item, type));
  return card;
}

function renderList(tab){
  listArea.innerHTML='';
  if(tab==='stocks'){ sectionTitle.textContent='Buy Stocks'; stocks.forEach(s=>listArea.appendChild(createCard(s,'stock'))) }
  else if(tab==='funds'){ sectionTitle.textContent='Mutual Funds'; funds.forEach(f=>listArea.appendChild(createCard(f,'fund'))) }
  else { sectionTitle.textContent='Your Portfolio';
    if(Object.keys(portfolio).length===0){ listArea.innerHTML='<div class="card">No holdings yet — buy from Stocks or Funds.</div>' }
    else{
      Object.values(portfolio).forEach(h=>{
        const item = (stocks.concat(funds)).find(x=>x.id===h.id) || {id:h.id,name:h.name,price:h.current||h.price,symbol:h.symbol||h.id.slice(0,2)};
        const card = createCard(item, h.type);
        // show qty and P/L in subtitle area
        const qty = document.createElement('div'); qty.className='item-sub'; qty.textContent = `Qty: ${h.qty} • Avg: ${formatRupee(h.avg)} • P/L: ${formatRupee((item.price - h.avg)*h.qty)}`;
        card.querySelector('.item-sub').replaceWith(qty);
        listArea.appendChild(card);
      })
    }
  }
}

// bottom nav
document.querySelectorAll('.bottom-nav .tab').forEach(btn=>btn.addEventListener('click', (e)=>{
  document.querySelectorAll('.bottom-nav .tab').forEach(t=>t.classList.remove('active'));
  e.currentTarget.classList.add('active'); renderList(e.currentTarget.dataset.tab);
}));

// detail modal and chart
const modal = document.getElementById('detailModal');
const closeDetail = document.getElementById('closeDetail');
const detailName = document.getElementById('detailName');
const detailSubtitle = document.getElementById('detailSubtitle');
const detailPrice = document.getElementById('detailPrice');
const detailPL = document.getElementById('detailPL');
let currentDetail=null;

closeDetail.addEventListener('click', ()=>{ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); });

function openDetail(item, type){
  currentDetail = { ...item, type };
  detailName.textContent = item.name;
  detailSubtitle.textContent = (type==='stock'?'Stock | ':'Fund | ') + item.id;
  detailPrice.textContent = formatRupee(item.price);
  const owned = portfolio[item.id];
  if(owned){ detailPL.textContent = `${owned.qty} held • P/L ${formatRupee((item.price - owned.avg)*owned.qty)}`; }
  else detailPL.textContent = '';
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false');
  renderChart(item);
}

let detailChart=null;
function renderChart(item, range='1d'){
  // create mock series for ranges
  const labels = []; const data = [];
  const points = range==='1d'? 60 : range==='1w'? 28 : range==='1m'?30: range==='6m'?180:365;
  for(let i=0;i<points;i++){ labels.push(i); const noise = (Math.sin(i/6)+Math.random()*0.6); data.push(Math.max(1,item.price*(1 + (noise-0.5)/50))); }

  const ctx = document.getElementById('detailChart').getContext('2d');
  if(detailChart) detailChart.destroy();
  detailChart = new Chart(ctx, { type:'line', data:{ labels, datasets:[{ label: item.name, data, borderColor: 'rgba(46, 203, 120,1)', backgroundColor:'rgba(46,203,120,0.06)', tension:0.3, pointRadius:0}]}, options:{ responsive:true, maintainAspectRatio:false, scales:{x:{display:false}, y:{grid:{color:'rgba(255,255,255,0.03)'}}}, plugins:{legend:{display:false}}});
}

// range buttons
document.querySelectorAll('.range').forEach(btn=>btn.addEventListener('click', e=>{
  document.querySelectorAll('.range').forEach(b=>b.classList.remove('active')); e.currentTarget.classList.add('active');
  if(currentDetail) renderChart(currentDetail, e.currentTarget.dataset.range);
}));

// trade buttons
document.getElementById('buyBtn').addEventListener('click', ()=>trade('buy'));
document.getElementById('sellBtn').addEventListener('click', ()=>trade('sell'));
document.getElementById('sipBtn').addEventListener('click', ()=>trade('sip'));

function trade(action){
  const qty = Number(document.getElementById('tradeQty').value)||1;
  if(!currentDetail) return;
  const id = currentDetail.id; const type=currentDetail.type; const price=currentDetail.price;
  if(action==='buy' || action==='sip'){
    if(!portfolio[id]) portfolio[id] = {id, name:currentDetail.name, type, qty:0, avg:0, price};
    const h = portfolio[id];
    const newQty = h.qty + qty;
    h.avg = (h.avg*h.qty + price*qty)/newQty; h.qty = newQty; h.current = price; localStorage.setItem('nv_portfolio', JSON.stringify(portfolio));
  } else if(action==='sell'){
    const h = portfolio[id]; if(!h || h.qty===0) return alert('No holdings to sell');
    h.qty = Math.max(0, h.qty - qty); if(h.qty===0) delete portfolio[id]; localStorage.setItem('nv_portfolio', JSON.stringify(portfolio));
  }
  calcSummary(); renderList(document.querySelector('.bottom-nav .tab.active').dataset.tab);
  openDetail(currentDetail, type); // refresh pl
}

// initial render
calcSummary(); renderList('stocks');

// refresh price mock every 10s
setInterval(()=>{
  [...stocks,...funds].forEach(it=>{ const delta = (Math.random()-0.5)*2; it.price = Math.max(1, it.price*(1+delta/200)); });
  renderList(document.querySelector('.bottom-nav .tab.active').dataset.tab);
  calcSummary();
},10000);

// expose for debugging
window._nv = {stocks,funds,portfolio};
