// ensure code runs after DOM ready
document.addEventListener('DOMContentLoaded', function () {

  // ------------------- simulated data -------------------
  const stocks = {
    "Tata Motors": +(Math.random()*(950-600)+600).toFixed(2),
    "Adani Green": +(Math.random()*(1500-820)+820).toFixed(2),
    "Wipro": +(Math.random()*(360-220)+220).toFixed(2),
    "MRF": +(Math.random()*(150000-90000)+90000).toFixed(2),
    "Reliance": +(Math.random()*(1800-1400)+1400).toFixed(2),
    "HDFC": +(Math.random()*(1600-1100)+1100).toFixed(2),
    "Affle 3i Ltd": +(Math.random()*(220-100)+100).toFixed(2)
  };

  const funds = {
    "Edelweiss Nifty Midcap150 Momentum 50 Index Fund": +(Math.random()*(160-80)+80).toFixed(2),
    "HDFC Mid Cap Fund": +(Math.random()*(250-100)+100).toFixed(2),
    "HDFC Small Cap Fund": +(Math.random()*(200-90)+90).toFixed(2),
    "Nippon India Large Cap Fund": +(Math.random()*(180-90)+90).toFixed(2),
    "SBI Large Cap Fund": +(Math.random()*(175-85)+85).toFixed(2),
    "Nippon India Growth Mid Cap Fund": +(Math.random()*(210-100)+100).toFixed(2),
    "Nippon India Small Cap Fund": +(Math.random()*(160-80)+80).toFixed(2),
    "HDFC Large Cap Fund": +(Math.random()*(170-90)+90).toFixed(2)
  };

  // ------------------- local storage (portfolio) -------------------
  let portfolio = JSON.parse(localStorage.getItem('nv_portfolio_v3') || '{"stocks":{},"funds":{},"cash":0}');
  function save(){ localStorage.setItem('nv_portfolio_v3', JSON.stringify(portfolio)); }

  // ------------------- elements -------------------
  const el = (id)=>document.getElementById(id);
  const stockList = el('stockList'), fundList = el('fundList');
  const portfolioList = el('portfolioList'), portfolioSummary = el('portfolioSummary'), detailArea = el('detailArea');
  const totalAmountEl = el('totalAmount'), oneDayChangeEl = el('oneDayChange'), pctEl = el('pctChange');

  const navBtns = document.querySelectorAll('.nav-btn');

  // theme
  const root = document.documentElement;
  if(localStorage.getItem('nv_theme') === 'light') root.classList.add('light');
  document.getElementById('themeToggle').addEventListener('click', ()=>{
    root.classList.toggle('light');
    localStorage.setItem('nv_theme', root.classList.contains('light') ? 'light' : 'dark');
  });

  // bottom nav
  navBtns.forEach(b=>{
    b.addEventListener('click', ()=>{
      navBtns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const target = b.dataset.target;
      document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
      document.getElementById(target).classList.remove('hidden');
      if(target === 'portfolioPanel') renderPortfolio();
    });
  });

  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  document.getElementById('stocksPanel').classList.remove('hidden');

  // ------------------- render functions -------------------
  function renderStocks(){
    stockList.innerHTML = '';
    for(const name in stocks){
      const price = +stocks[name];
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div>
          <div class="title">${name}</div>
          <div class="price">₹${price.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
        </div>
        <div class="controls">
          <input class="qty" type="number" min="1" value="1" />
          <button class="btn primary buy" data-name="${name}">Buy</button>
        </div>
      `;
      stockList.appendChild(card);
    }
  }

  function renderFunds(){
    fundList.innerHTML = '';
    Object.keys(funds).forEach(name=>{
      const price = +funds[name];
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div style="max-width:68%">
          <div class="title">${name}</div>
          <div class="price">₹${price.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
        </div>
        <div class="controls">
          <input class="qty" type="number" min="1" value="1" />
          <button class="btn primary addfund" data-name="${name}">Add</button>
        </div>
      `;
      fundList.appendChild(card);
    });
  }

  function formatPL(val){
    const sign = val>0 ? '+' : (val<0 ? '−' : '');
    const abs = Math.abs(val);
    return `${sign}₹${abs.toLocaleString(undefined,{maximumFractionDigits:2})}`;
  }

  function renderPortfolio(){
    portfolioList.innerHTML = ''; detailArea.innerHTML = '';

    let holdingsValue = 0, invested = 0;
    for(const s in portfolio.stocks){
      const {qty, avg} = portfolio.stocks[s];
      const cur = +(stocks[s]||0);
      holdingsValue += cur*qty; invested += avg*qty;
    }
    for(const f in portfolio.funds){
      const {units, avg} = portfolio.funds[f];
      const cur = +(funds[f]||0);
      holdingsValue += cur*units; invested += avg*units;
    }
    const cash = +(portfolio.cash||0);
    const total = holdingsValue + cash;
    const plAmount = holdingsValue - invested;
    const plPct = invested? (plAmount/invested*100) : 0;

    totalAmountEl.textContent = `₹${total.toLocaleString(undefined,{maximumFractionDigits:2})}`;
    oneDayChangeEl.textContent = `1 Day Change: ₹${(Math.random()*50-25).toFixed(2)}`;
    pctEl.textContent = `${plAmount>=0? '▲':'▼'} ${Math.abs(plPct).toFixed(2)}%`;
    pctEl.className = plAmount>=0 ? 'pct up' : 'pct down';

    portfolioSummary.innerHTML = `
      <div style="font-weight:800">Total: ₹${total.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
      <div style="color:var(--muted)">Invested: ₹${invested.toLocaleString(undefined,{maximumFractionDigits:2})} • Cash: ₹${cash.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
      <div style="margin-top:8px">${formatPL(plAmount)} • ${plPct>=0?'+':''}${plPct.toFixed(2)}%</div>
    `;

    if(Object.keys(portfolio.stocks).length === 0 && Object.keys(portfolio.funds).length === 0){
      portfolioList.innerHTML = `<div class="card">No holdings yet.</div>`;
    } else {
      for(const s in portfolio.stocks){
        const {qty, avg} = portfolio.stocks[s];
        const cur = +(stocks[s]||0);
        const plPctLocal = avg? ((cur-avg)/avg*100):0;
        const card = document.createElement('div'); card.className='card';
        card.innerHTML = `
          <div>
            <div class="title">${s}</div>
            <div class="price">Qty: ${qty} • Cur: ₹${cur.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
            <div style="color:var(--muted);font-size:12px">Avg: ₹${avg.toLocaleString(undefined,{maximumFractionDigits:2})} • ${plPctLocal>=0?'+':''}${plPctLocal.toFixed(2)}%</div>
          </div>
          <div class="controls">
            <button class="btn ghost sell" data-name="${s}">Sell 1</button>
            <button class="btn ghost details" data-name="${s}">Details</button>
          </div>
        `;
        portfolioList.appendChild(card);
      }

      for(const f in portfolio.funds){
        const {units, avg} = portfolio.funds[f];
        const cur = +(funds[f]||0);
        const plPctLocal = avg? ((cur-avg)/avg*100):0;
        const card = document.createElement('div'); card.className='card';
        card.innerHTML = `
          <div>
            <div class="title">${f}</div>
            <div class="price">Units: ${units} • Cur NAV: ₹${cur.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
            <div style="color:var(--muted);font-size:12px">Avg: ₹${avg.toLocaleString(undefined,{maximumFractionDigits:2})} • ${plPctLocal>=0?'+':''}${plPctLocal.toFixed(2)}%</div>
          </div>
          <div class="controls">
            <button class="btn ghost redeem" data-name="${f}">Redeem 1</button>
            <button class="btn ghost details" data-name="${f}">Details</button>
          </div>
        `;
        portfolioList.appendChild(card);
      }
    }
  }

  // ------------------- actions (delegated listeners) -------------------
  stockList.addEventListener('click', (e)=>{
    const buyBtn = e.target.closest('.buy');
    if(!buyBtn) return;
    const name = buyBtn.dataset.name;
    const qtyEl = buyBtn.parentElement.querySelector('.qty');
    const q = Math.max(1, parseInt(qtyEl.value||1,10));
    const price = +(stocks[name]||0);

    const prev = portfolio.stocks[name] || {qty:0, avg:0};
    const newQty = prev.qty + q;
    const newAvg = newQty ? ((prev.qty*prev.avg) + q*price)/newQty : price;

    portfolio.stocks[name] = { qty: newQty, avg: +newAvg.toFixed(2) };
    save(); renderPortfolio(); showToast(`Bought ${q} × ${name}`);
  });

  fundList.addEventListener('click', (e)=>{
    const addBtn = e.target.closest('.addfund');
    if(!addBtn) return;
    const name = addBtn.dataset.name;
    const qtyEl = addBtn.parentElement.querySelector('.qty');
    const q = Math.max(1, parseInt(qtyEl.value||1,10));
    const price = +(funds[name]||0);

    const prev = portfolio.funds[name] || {units:0, avg:0};
    const newUnits = prev.units + q;
    const newAvg = newUnits ? ((prev.units*prev.avg) + q*price)/newUnits : price;

    portfolio.funds[name] = { units: newUnits, avg: +newAvg.toFixed(2) };
    save(); renderPortfolio(); showToast(`Added ${q} unit(s) of fund`);
  });

  portfolioList.addEventListener('click', (e)=>{
    const sellBtn = e.target.closest('.sell');
    const redeemBtn = e.target.closest('.redeem');
    const detailsBtn = e.target.closest('.details');
    if(sellBtn){
      const name = sellBtn.dataset.name;
      if(!portfolio.stocks[name]) return;
      portfolio.stocks[name].qty--;
      if(portfolio.stocks[name].qty <= 0) delete portfolio.stocks[name];
      save(); renderPortfolio(); showToast(`Sold 1 × ${name}`);
    } else if(redeemBtn){
      const name = redeemBtn.dataset.name;
      if(!portfolio.funds[name]) return;
      portfolio.funds[name].units--;
      if(portfolio.funds[name].units <= 0) delete portfolio.funds[name];
      save(); renderPortfolio(); showToast(`Redeemed 1 unit`);
    } else if(detailsBtn){
      const name = detailsBtn.dataset.name;
      showDetails(name);
    }
  });

  function showDetails(name){
    detailArea.innerHTML = '';
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<div style="width:100%"><h4 style="margin:0 0 8px">${name} — simulated 30d</h4><div style="height:140px;display:flex;align-items:center;justify-content:center;color:var(--muted)">Chart placeholder</div></div>`;
    detailArea.appendChild(card);
  }

  // ------------------- small utilities -------------------
  const toastEl = document.getElementById('toast');
  function showToast(txt){
    toastEl.textContent = txt; toastEl.classList.remove('hidden');
    setTimeout(()=> toastEl.classList.add('hidden'),1200);
  }

  // initial render
  renderStocks(); renderFunds(); renderPortfolio();

});
