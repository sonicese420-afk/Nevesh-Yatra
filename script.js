// script.js - improved init + quantity + top stats + toast + guaranteed initial render
(() => {
  const stocks = [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors' },
    { symbol: 'WIPRO', name: 'Wipro' },
    { symbol: 'MRF', name: 'MRF' },
    { symbol: 'HDFC', name: 'HDFC' },
    { symbol: 'AFFLE', name: 'Affle 3i Ltd' }
  ];

  function randPrice(min, max) { return +(Math.random() * (max-min) + min).toFixed(2); }
  function getLivePrices(){ const p={}; stocks.forEach(s=>{ const min=200+Math.random()*400; const max=min + (900*Math.random()); p[s.symbol]=randPrice(min,max);}); return p; }

  const LS_KEY = 'nv_portfolio_v1';
  function loadPortfolio(){ try{return JSON.parse(localStorage.getItem(LS_KEY))||{};}catch(e){return{};} }
  function savePortfolio(data){ localStorage.setItem(LS_KEY, JSON.stringify(data)); }

  // UI refs
  const listEl = document.getElementById('list');
  const totalAmountEl = document.getElementById('totalAmount');
  const holdingsCountEl = document.getElementById('holdingsCount');
  const dayChangeEl = document.getElementById('dayChange');
  const pageTitle = document.getElementById('pageTitle');

  const tabStocks = document.getElementById('tab-stocks');
  const tabFunds = document.getElementById('tab-funds');
  const tabPortfolio = document.getElementById('tab-portfolio');
  const bottomNav = document.getElementById('bottomNav');

  // detail page refs
  const detailPage = document.getElementById('detailPage');
  const backButton = document.getElementById('backButton');
  const detailName = document.getElementById('detailName');
  const detailSub = document.getElementById('detailSub');
  const detailPrice = document.getElementById('detailPrice');
  const detailPL = document.getElementById('detailPL');
  const historyCanvas = document.getElementById('historyChart');
  const timesBtns = document.querySelectorAll('.time');
  const qtyInput = document.getElementById('qtyInput');
  const detailTopStats = document.getElementById('detailTopStats');
  const toast = document.getElementById('toast');

  const btnBuy = document.getElementById('btnBuy');
  const btnSell = document.getElementById('btnSell');
  const btnSip = document.getElementById('btnSip');

  // state
  let livePrices = getLivePrices();
  let portfolio = loadPortfolio();
  let currentStock = null;
  let currentRange = '1d';
  let chart = null;

  function fmtRs(n){ return '₹' + (Math.round(n*100)/100).toLocaleString('en-IN'); }
  function fmtPerc(p){ return (Math.round(p*100)/100).toFixed(2) + '%'; }

  function showToast(text, timeout=1800){
    toast.textContent = text;
    toast.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> toast.classList.add('hidden'), timeout);
  }

  function renderStocksList(){
    pageTitle.textContent = 'Buy Stocks';
    listEl.innerHTML = '';
    stocks.forEach(s => {
      const card = document.createElement('div');
      card.className = 'stock-card card';

      const left = document.createElement('div');
      left.className = 'left';
      const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = s.symbol.slice(0,2);
      const info = document.createElement('div'); info.className = 'stock-info';
      info.innerHTML = `<div class="name">${s.name}</div><div class="sub">Stock | ${s.symbol}</div>`;
      left.appendChild(avatar); left.appendChild(info);

      const right = document.createElement('div'); right.className = 'right';
      const price = livePrices[s.symbol] || randPrice(100,1000);
      const priceEl = document.createElement('div'); priceEl.className='price'; priceEl.textContent = fmtRs(price);

      // show owned indicator only if owned
      const owned = portfolio[s.symbol];
      if(owned && owned.qty>0){
        const changePill = document.createElement('div');
        const plPerc = ((price - owned.avgPrice)/owned.avgPrice)*100;
        changePill.className = 'owned-pill';
        changePill.textContent = (plPerc>=0?'▲ ':'▼ ')+Math.abs(plPerc).toFixed(2)+'%';
        right.appendChild(changePill);
      }

      right.appendChild(priceEl);
      card.appendChild(left);
      card.appendChild(right);

      // click opens full detail page
      card.addEventListener('click', ()=> openDetail(s.symbol));
      listEl.appendChild(card);
    });
  }

  function renderFundsList(){
    pageTitle.textContent = 'Mutual Funds';
    listEl.innerHTML = '';
    const funds = [
      { id:'EDEL', name:'Edelweiss Nifty Midcap150 Momentum 50 Index Fund' },
      { id:'HDFC_MID', name:'HDFC Mid Cap Fund' },
      { id:'HDFC_SM', name:'HDFC Small Cap Fund' }
    ];
    funds.forEach(f=>{
      const card = document.createElement('div'); card.className='stock-card card';
      card.innerHTML = `<div class="left"><div class="avatar">${f.id.slice(0,2)}</div>
        <div class="stock-info"><div class="name">${f.name}</div><div class="sub">Fund | ${f.id}</div></div></div>
        <div class="right"><div class="price">${fmtRs(randPrice(60,300))}</div></div>`;
      card.addEventListener('click', ()=> openDetail(f.id));
      listEl.appendChild(card);
    });
  }

  function renderPortfolio(){
    pageTitle.textContent = 'Your Portfolio';
    listEl.innerHTML = '';
    let total=0, holdings=0, pnl=0;
    Object.keys(portfolio).forEach(sym=>{
      const it = portfolio[sym];
      if(!it || it.qty<=0) return;
      const price = livePrices[sym] || randPrice(100,1000);
      total += price*it.qty;
      holdings += it.qty;
      pnl += (price - it.avgPrice)*it.qty;
      const card = document.createElement('div'); card.className='stock-card card';
      card.innerHTML = `<div class="left"><div class="avatar">${sym.slice(0,2)}</div>
        <div class="stock-info"><div class="name">${stocks.find(s=>s.symbol===sym)?.name || sym}</div>
        <div class="sub">Owned • ${it.qty} @ ${fmtRs(it.avgPrice)}</div></div></div>
        <div class="right"><div class="price">${fmtRs(price)}</div><div class="owned-pill">${((price-it.avgPrice)/it.avgPrice*100).toFixed(2)}%</div></div>`;
      card.addEventListener('click', ()=> openDetail(sym));
      listEl.appendChild(card);
    });
    totalAmountEl.textContent = fmtRs(total);
    holdingsCountEl.textContent = 'Holdings: ' + holdings;
    dayChangeEl.textContent = (pnl>=0 ? '＋':'') + fmtRs(pnl) + ` (${ total ? fmtPerc((pnl/Math.max(total,1))*100) : '0.00%'})`;

    if(Object.keys(portfolio).filter(s=>portfolio[s].qty>0).length === 0){
      const info = document.createElement('div'); info.className='card'; info.style.margin='12px';
      info.textContent = 'You have no holdings yet. Buy from stocks or funds.';
      listEl.appendChild(info);
    }
  }

  // open full page detail
  function openDetail(symbol){
    currentStock = symbol;
    bottomNav.style.display = 'none'; // hide bottom nav for full-screen feel
    detailPage.classList.remove('hidden'); detailPage.setAttribute('aria-hidden','false');

    const sObj = stocks.find(s=>s.symbol===symbol) || { name:symbol, symbol };
    detailName.textContent = sObj.name;
    detailSub.textContent = `Stock | ${symbol}`;

    const price = livePrices[symbol] || randPrice(100,1000);
    detailPrice.textContent = fmtRs(price);

    const owned = portfolio[symbol];
    if(owned && owned.qty>0){
      const plPerc = ((price - owned.avgPrice)/owned.avgPrice)*100;
      detailPL.textContent = (plPerc>=0 ? '▲ ':'▼ ') + Math.abs(plPerc).toFixed(2) + '%';
      detailPL.style.color = plPerc>=0 ? 'var(--success)' : 'var(--danger)';
    } else {
      detailPL.textContent = '';
      detailPL.style.color = '';
    }

    // fill top stats with mock values
    detailTopStats.innerHTML = `
      <div class="stat"><div class="muted">Volume</div><div>${Math.floor(Math.random()*1000000).toLocaleString()}</div></div>
      <div class="stat"><div class="muted">1D Low / High</div><div>${fmtRs(price-40)} / ${fmtRs(price+40)}</div></div>
      <div class="stat"><div class="muted">Mkt Cap</div><div>₹${(Math.floor(Math.random()*2000000)).toLocaleString()} Cr</div></div>
    `;

    qtyInput.value = 1;
    // build chart with currentRange
    buildChart(symbol, currentRange);
  }

  function closeDetail(){
    currentStock = null;
    detailPage.classList.add('hidden'); detailPage.setAttribute('aria-hidden','true');
    bottomNav.style.display = 'flex';
    if(chart){ chart.destroy(); chart = null; }
  }
  backButton.addEventListener('click', closeDetail);

  // chart logic (line with random walk)
  function genSeries(range){
    const pts=[]; let count;
    if(range==='1d'){ count = 48; } // 48 points
    else if(range==='1w'){ count = 28; }
    else if(range==='1m'){ count = 30; }
    else if(range==='6m'){ count = 180; } else count = 48;
    let base = randPrice(200,1500);
    for(let i=0;i<count;i++){
      base = Math.max(1, base + (Math.random()-0.5)*(base*0.02));
      pts.push(+base.toFixed(2));
    }
    return pts;
  }

  function buildChart(symbol, range){
    const ctx = historyCanvas.getContext('2d');
    const data = genSeries(range);
    if(chart) { chart.destroy(); chart = null; }
    chart = new Chart(ctx, {
      type: 'line',
      data: { labels: data.map((_,i)=>i), datasets: [{ data, borderColor:'#2ecc71', backgroundColor:'rgba(46,204,113,0.03)', tension:0.25, pointRadius:0 }] },
      options: { maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{display:false}, y:{ grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'rgba(255,255,255,0.7)'} } } }
    });
  }

  // time buttons
  timesBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      timesBtns.forEach(b=>b.classList.remove('active')); btn.classList.add('active');
      currentRange = btn.dataset.range;
      if(currentStock) buildChart(currentStock, currentRange);
    });
  });

  // buy/sell/sip actions
  btnBuy.addEventListener('click', ()=> {
    if(!currentStock) return;
    const qty = Math.max(1, parseInt(qtyInput.value) || 1);
    const price = livePrices[currentStock] || randPrice(100,1000);
    const prev = portfolio[currentStock] || { qty:0, avgPrice:0 };
    const newQty = prev.qty + qty;
    const newAvg = ((prev.avgPrice * prev.qty) + price * qty) / newQty;
    portfolio[currentStock] = { qty:newQty, avgPrice:+newAvg.toFixed(2) };
    savePortfolio(portfolio); refreshAll();
    showToast(`Bought ${qty} ${currentStock} @ ${fmtRs(price)}`);
  });
  btnSell.addEventListener('click', ()=> {
    if(!currentStock) return;
    const prev = portfolio[currentStock] || { qty:0, avgPrice:0 };
    const qty = Math.min(Math.max(1, parseInt(qtyInput.value)||1), prev.qty || 0);
    if(!prev || prev.qty < 1) { showToast('No holdings to sell'); return; }
    const price = livePrices[currentStock] || randPrice(100,1000);
    const remaining = prev.qty - qty;
    if(remaining === 0) delete portfolio[currentStock];
    else portfolio[currentStock] = { qty: remaining, avgPrice: prev.avgPrice };
    savePortfolio(portfolio); refreshAll();
    showToast(`Sold ${qty} ${currentStock} @ ${fmtRs(price)}`);
  });
  btnSip.addEventListener('click', ()=> showToast('SIP action (placeholder)'));

  // tabs and render control
  function activateTab(tab){
    [tabStocks, tabFunds, tabPortfolio].forEach(t=>t.classList.remove('active'));
    if(tab==='stocks') tabStocks.classList.add('active');
    else if(tab==='funds') tabFunds.classList.add('active');
    else tabPortfolio.classList.add('active');

    if(tab==='stocks') renderStocksList();
    else if(tab==='funds') renderFundsList();
    else renderPortfolio();
  }
  tabStocks.addEventListener('click', ()=> activateTab('stocks'));
  tabFunds.addEventListener('click', ()=> activateTab('funds'));
  tabPortfolio.addEventListener('click', ()=> activateTab('portfolio'));

  // refresh / totals
  function refreshAll(){
    livePrices = getLivePrices();
    // totals
    let total=0, holdings=0, pnl=0;
    for(const sym in portfolio){
      const it = portfolio[sym];
      if(!it || it.qty<=0) continue;
      const price = livePrices[sym] || randPrice(100,1000);
      total += price*it.qty;
      holdings += it.qty;
      pnl += (price - it.avgPrice)*it.qty;
    }
    totalAmountEl.textContent = fmtRs(total);
    holdingsCountEl.textContent = 'Holdings: ' + holdings;
    dayChangeEl.textContent = (pnl>=0 ? '＋':'') + fmtRs(pnl) + ` (${ total? fmtPerc((pnl/Math.max(total,1))*100) : '0.00%'})`;

    const activeTab = document.querySelector('.tab.active')?.dataset?.tab || 'stocks';
    if(activeTab==='stocks') renderStocksList();
    else if(activeTab==='funds') renderFundsList();
    else renderPortfolio();
  }

  // hide/show toggle
  const toggleVisibilityBtn = document.getElementById('toggle-visibility');
  let hidden=false;
  toggleVisibilityBtn.addEventListener('click', ()=> {
    hidden = !hidden;
    if(hidden){ totalAmountEl.textContent='****'; dayChangeEl.textContent='****'; }
    else refreshAll();
  });

  // init
  function init(){
    // guarantee initial tab/render state
    activateTab('stocks');
    // periodic pseudo-live updates
    setInterval(()=> {
      livePrices = getLivePrices();
      if(detailPage.classList.contains('hidden')) refreshAll();
      else { if(currentStock) buildChart(currentStock, currentRange); }
    }, 20000);
  }

  init();
})();
