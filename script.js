/* safer-script.js
   - Single-file replacement (safe to re-run)
   - Avoids duplicating headers/nav/modal
   - Removes any previous auto-injected UI created by this script
   - Keeps portfolio + stocks + funds + Chart.js (maintainAspectRatio:false)
*/

/* ---------- Config & Data ---------- */
const STORAGE_KEY = "ny_portfolio";
const stocks = {
  "Tata Motors": randomBetween(600, 950),
  "Adani Green": randomBetween(820, 1500),
  "Wipro": randomBetween(220, 360),
  "MRF": randomBetween(90000, 150000),
  "Reliance": randomBetween(1400, 1800),
  "HDFC": randomBetween(1100, 1600),
  "Affle 3i Ltd": randomBetween(100, 200)
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

/* ---------- Utilities ---------- */
function randomBetween(a,b){return +(Math.random()*(b-a)+a).toFixed(2);}
function formatCurrency(n){ return "₹"+Number(n).toLocaleString(); }
function loadPortfolio(){ try{ const r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):{stocks:{},funds:{}} }catch(e){return {stocks:{},funds:{}}}}
function savePortfolio(p){ localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

/* ---------- Clean previous injections (if any) ---------- */
["ny_header","ny_main","ny_nav","ny_modal"].forEach(id=>{
  const el=document.getElementById(id);
  if(el && el.dataset && el.dataset.nyAuto == "true") el.remove();
});

/* ---------- Create or reuse core containers ---------- */
function ensureContainer(id, tag="div", parent=document.body){
  let el=document.getElementById(id);
  if(!el){
    el=document.createElement(tag);
    el.id=id;
    el.dataset.nyAuto="true"; // mark auto-injected so future runs can remove safely
    parent.appendChild(el);
  }
  return el;
}

const header = ensureContainer("ny_header","header", document.body);
const main   = ensureContainer("ny_main","main", document.body);
const nav    = ensureContainer("ny_nav","nav", document.body);
const modalWrap = ensureContainer("ny_modal","div", document.body);

/* ---------- Apply minimal layout CSS (inline to avoid missing stylesheet) ---------- */
(function injectStyle(){
  const id="ny_injected_style";
  if(document.getElementById(id)) return;
  const s=document.createElement("style"); s.id=id;
  s.textContent = `
    #ny_header{padding:12px 16px;background:linear-gradient(180deg,#275a5f,#2e6b6f);color:#fff;display:flex;gap:12px;align-items:center;position:sticky;top:0;z-index:50}
    #ny_header img{width:56px;height:56px;border-radius:10px;object-fit:cover}
    #ny_assets_box{margin:14px 16px;padding:18px;background:rgba(255,255,255,0.04);border-radius:14px}
    #ny_main{padding:6px 16px 84px 16px;min-height:60vh}
    .ny-card{background:rgba(255,255,255,0.03);padding:14px;border-radius:12px;margin-bottom:12px}
    .ny-bottom-nav{position:fixed;left:0;right:0;bottom:16px;display:flex;justify-content:space-around;gap:12px;padding:10px 16px;background:linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.55));backdrop-filter:blur(6px);border-radius:28px;margin:0 16px;z-index:60}
    .ny-nav-btn{background:transparent;border:none;color:#fff;padding:8px 12px;border-radius:10px;min-width:72px}
    .ny-nav-btn.active{background:rgba(255,255,255,0.06)}
    .ny-card .buy-btn,.ny-card .add-btn{cursor:pointer}
    #ny_modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:80;pointer-events:none}
    #ny_modal .ny-modal-content{width:92%;max-width:760px;background:var(--card,#0b1820);border-radius:12px;padding:12px;pointer-events:auto}
    #ny_modal .close-modal{float:right}
    canvas{max-width:100%}
  `;
  document.head.appendChild(s);
})();

/* ---------- Portfolio state ---------- */
let portfolio = loadPortfolio();

/* ---------- Render helpers ---------- */
function renderHeader(){
  // if header already contains app HTML (maybe created manually), don't overwrite — but update logo if missing
  if(header.innerHTML.trim()){
    // attempt to ensure assets box present
    let box = document.getElementById("assetsTotal");
    if(!box){
      const assetsBox = document.createElement("div");
      assetsBox.id="ny_assets_box";
      assetsBox.innerHTML = `<div id="assetsTotal">${formatCurrency(0)}</div><div id="dailyChange">1 Day Change: ₹0 (0.00%)</div><div id="assetsCount">Holdings: 0</div>`;
      header.appendChild(assetsBox);
    }
    return;
  }
  header.innerHTML = `
    <img id="ny_logo_img" src="${getLogoBlobURL()}" alt="logo"/>
    <div>
      <div style="font-weight:700;font-size:18px">Nivesh Yatra</div>
      <div style="font-size:12px;opacity:.9">Turning dreams into Assets.</div>
    </div>
    <div style="margin-left:auto"></div>
  `;
  // assets box below header (in header area)
  const assetsBox = document.createElement("div");
  assetsBox.id = "ny_assets_box";
  assetsBox.style.width = "100%";
  assetsBox.innerHTML = `<div id="assetsTotal" style="font-size:22px;font-weight:700">${formatCurrency(0)}</div>
                        <div id="dailyChange" style="opacity:.9">1 Day Change: ₹0 (0.00%)</div>
                        <div id="assetsCount" style="opacity:.8">Holdings: 0</div>`;
  header.appendChild(assetsBox);
}

function renderBottomNav(){
  // remove existing ny_nav children if present and created by us
  while(nav.firstChild) nav.removeChild(nav.firstChild);
  nav.className = "ny-bottom-nav";
  nav.innerHTML = `
    <button id="navStocks" class="ny-nav-btn">Stocks</button>
    <button id="navFunds" class="ny-nav-btn">Funds</button>
    <button id="navPortfolio" class="ny-nav-btn">Portfolio</button>
  `;
  // attach handlers
  document.getElementById("navStocks").addEventListener("click", ()=> showPanel("stocks"));
  document.getElementById("navFunds").addEventListener("click", ()=> showPanel("funds"));
  document.getElementById("navPortfolio").addEventListener("click", ()=> showPanel("portfolio"));
}

function getLogoBlobURL(){
  // if host page provided img#ny_logo use it
  const host = document.getElementById("ny_logo");
  if(host && host.src) return host.src;
  // If you have uploaded file at known path, change the path here. Fallback a teal svg.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='100%' height='100%' fill='#476d75' rx='20'/><g fill='white' transform='translate(50,70)'><path d='M120 120 l50 -60 l40 20 l-50 60 z' opacity='.95'/></g></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/* ---------- Panel rendering ---------- */
function clearMain(){
  main.innerHTML = "";
  // create three panels
  const s=document.createElement("section"); s.id="ny_stocks_panel";
  const f=document.createElement("section"); f.id="ny_funds_panel";
  const p=document.createElement("section"); p.id="ny_portfolio_panel";
  main.appendChild(s); main.appendChild(f); main.appendChild(p);
}

function renderStocksPanel(){
  const panel = document.getElementById("ny_stocks_panel");
  panel.innerHTML = `<h2 style="margin-top:6px">Buy Stocks</h2><div id="ny_stocks_list"></div>`;
  const list = panel.querySelector("#ny_stocks_list");
  Object.keys(stocks).forEach(name=>{
    const price = stocks[name];
    const card = document.createElement("div"); card.className="ny-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${name}</div>
          <div style="margin-top:8px;font-size:18px">${formatCurrency(price)}</div>
        </div>
        <div style="text-align:right;min-width:150px">
          <input class="qty" type="number" min="1" value="1" style="width:72px;padding:8px;border-radius:8px"/>
          <button class="buy" style="margin-left:8px;padding:9px 12px;border-radius:10px;background:#1abc9c;border:none;color:#fff">Buy</button>
        </div>
      </div>
    `;
    list.appendChild(card);
    const buy = card.querySelector(".buy");
    buy.addEventListener("click", ()=>{
      const qty = Math.max(1, Number(card.querySelector(".qty").value) || 1);
      buyStock(name, qty, price);
    });
    // click shows chart
    card.addEventListener("click", (e)=> {
      if(e.target.classList.contains("buy") || e.target.classList.contains("qty")) return;
      showHoldingChart(name,"stock");
    });
  });
}

function renderFundsPanel(){
  const panel = document.getElementById("ny_funds_panel");
  panel.innerHTML = `<h2 style="margin-top:6px">Mutual Funds</h2><div id="ny_funds_list"></div>`;
  const list = panel.querySelector("#ny_funds_list");
  mutualFunds.forEach(name=>{
    const card = document.createElement("div"); card.className="ny-card";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${name}</div>
          <div style="font-size:13px;opacity:.85">Simulated NAV</div>
        </div>
        <div style="text-align:right;min-width:140px">
          <input class="qty" type="number" min="1" value="1" style="width:72px;padding:8px;border-radius:8px"/>
          <button class="add" style="margin-left:8px;padding:9px 12px;border-radius:10px;background:#2f8cff;border:none;color:#fff">Add</button>
        </div>
      </div>
    `;
    list.appendChild(card);
    card.querySelector(".add").addEventListener("click", ()=>{
      const units = Math.max(1, Number(card.querySelector(".qty").value) || 1);
      addFund(name, units, randomBetween(80,250));
    });
    card.addEventListener("click",(e)=>{
      if(e.target.classList.contains("add")||e.target.classList.contains("qty")) return;
      showHoldingChart(name,"fund");
    });
  });
}

function renderPortfolioPanel(){
  const panel = document.getElementById("ny_portfolio_panel");
  panel.innerHTML = `<h2 style="margin-top:6px">Your Portfolio</h2><div id="ny_portfolio_list"></div><div style="height:18px"></div><canvas id="ny_portfolio_chart" style="width:100%;height:260px"></canvas>`;
  const list = panel.querySelector("#ny_portfolio_list");
  list.innerHTML = "";

  let totalValue=0, totalInvested=0, count=0;

  // stocks
  for(const [n,d] of Object.entries(portfolio.stocks)){
    count++;
    const cur = stocks[n] || d.avgPrice;
    const value = cur * d.qty;
    totalValue += value;
    totalInvested += d.avgPrice * d.qty;

    const item=document.createElement("div"); item.className="ny-card";
    item.innerHTML = `<div style="display:flex;justify-content:space-between">
      <div>
        <div style="font-weight:700">${n} <span style="font-weight:400;font-size:12px;opacity:.8">(${d.qty} qty)</span></div>
        <div style="margin-top:6px;font-size:14px">${formatCurrency(cur)} <small style="opacity:.75">bought ${formatCurrency(d.avgPrice)}</small></div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">${formatCurrency(value)}</div>
        <div style="color:${value-(d.avgPrice*d.qty)>=0? '#2ecc71':'#e74c3c'}">${value-(d.avgPrice*d.qty)>=0? '▲':'▼'} ${formatCurrency(Math.abs(value-(d.avgPrice*d.qty)))}</div>
      </div>
    </div>`;
    list.appendChild(item);
    item.addEventListener("click", ()=> showHoldingChart(n,"stock"));
  }

  // funds
  for(const [n,d] of Object.entries(portfolio.funds)){
    count++;
    const cur = d.avgPrice + randomBetween(-10,30);
    const value = cur * d.units;
    totalValue += value;
    totalInvested += d.avgPrice * d.units;

    const item=document.createElement("div"); item.className="ny-card";
    item.innerHTML = `<div style="display:flex;justify-content:space-between">
      <div>
        <div style="font-weight:700">${n} <span style="font-weight:400;font-size:12px;opacity:.8">(${d.units} units)</span></div>
        <div style="margin-top:6px;font-size:14px">${formatCurrency(cur)} <small style="opacity:.75">bought ${formatCurrency(d.avgPrice)}</small></div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">${formatCurrency(value)}</div>
        <div style="color:${value-(d.avgPrice*d.units)>=0? '#2ecc71':'#e74c3c'}">${value-(d.avgPrice*d.units)>=0? '▲':'▼'} ${formatCurrency(Math.abs(value-(d.avgPrice*d.units)))}</div>
      </div>
    </div>`;
    list.appendChild(item);
    item.addEventListener("click", ()=> showHoldingChart(n,"fund"));
  }

  // update header summary
  document.getElementById("assetsTotal").textContent = formatCurrency(totalValue||0);
  document.getElementById("assetsCount").textContent = `Holdings: ${count}`;
  document.getElementById("dailyChange").textContent = `P/L: ${formatCurrency((totalValue||0)-(totalInvested||0))}`;

  // render combined portfolio chart (simulated 7 points)
  try{
    const canvas = document.getElementById("ny_portfolio_chart");
    if(canvas){
      if(window.__NY_PORTFOLIO_CHART) window.__NY_PORTFOLIO_CHART.destroy();
      canvas.style.height = "260px";
      const ctx = canvas.getContext("2d");
      const investedSeries = generate6MonthHistory(totalInvested || 1000);
      const currentSeries = generate6MonthHistory(totalValue || 1200);
      window.__NY_PORTFOLIO_CHART = new Chart(ctx, {
        type: "line",
        data:{ labels:["6m","5m","4m","3m","2m","1m","Now"], datasets:[
          {label:"Invested", data:investedSeries, borderColor:"#999", borderWidth:1.5, tension:0.25},
          {label:"Current", data:currentSeries, borderColor:"#2ecc71", borderWidth:2, tension:0.3}
        ]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},scales:{y:{ticks:{callback:v=>formatCurrency(v)}},x:{grid:{display:false}}}}
      });
    }
  }catch(e){console.warn("portfolio chart failed",e)}
}

/* ---------- Actions (buy/add) ---------- */
function buyStock(name, qty, price){
  if(!portfolio.stocks[name]) portfolio.stocks[name] = {qty:0, avgPrice:0};
  const existing = portfolio.stocks[name];
  const totalQty = existing.qty + qty;
  const totalCost = existing.avgPrice * existing.qty + price * qty;
  existing.qty = totalQty;
  existing.avgPrice = +(totalCost/totalQty).toFixed(2);
  savePortfolio(portfolio);
  renderAll();
}
function addFund(name, units, nav){
  if(!portfolio.funds[name]) portfolio.funds[name] = {units:0, avgPrice:0};
  const existing = portfolio.funds[name];
  const totalUnits = existing.units + units;
  const totalCost = existing.avgPrice * existing.units + nav * units;
  existing.units = totalUnits;
  existing.avgPrice = +(totalCost/totalUnits).toFixed(2);
  savePortfolio(portfolio);
  renderAll();
}

/* ---------- Chart utilities ---------- */
function generate6MonthHistory(basePrice){
  const out=[];
  let p = basePrice || 100;
  for(let i=6;i>=0;i--){
    const vol = Math.max(1, Math.abs(basePrice)*0.03) * (Math.random()*1.2);
    p = +(basePrice + (Math.random()-0.5)*vol*(i/3)).toFixed(2);
    out.push(Math.max(1,p));
  }
  out[out.length-1] = +(basePrice||out[out.length-1]).toFixed(2);
  return out;
}

/* ---------- Modal / detail chart ---------- */
function ensureModal(){
  // If modal content already exists and created by page, reuse; else create
  let cont = document.querySelector("#ny_modal_content");
  if(!cont){
    modalWrap.id = "ny_modal";
    modalWrap.innerHTML = `<div class="ny-modal-content" id="ny_modal_content" style="display:none">
      <button id="ny_modal_close" style="float:right">Close</button>
      <canvas id="ny_detail_chart" style="width:100%;height:260px"></canvas>
    </div>`;
    document.getElementById("ny_modal_close").addEventListener("click", ()=> {
      document.getElementById("ny_modal_content").style.display = "none";
    });
  }
}
function showHoldingChart(name, type){
  ensureModal();
  const canvas = document.getElementById("ny_detail_chart");
  if(!canvas) return;
  canvas.style.height = "260px";
  // compute base
  let base = 100;
  if(type==="stock"){ base = stocks[name] || (portfolio.stocks[name] && portfolio.stocks[name].avgPrice) || 100; }
  else base = (portfolio.funds[name] && portfolio.funds[name].avgPrice) || 120;
  const data = generate6MonthHistory(base);
  // destroy old
  try{ if(window.__NY_DETAIL_CHART) window.__NY_DETAIL_CHART.destroy(); }catch(e){}
  const ctx = canvas.getContext("2d");
  window.__NY_DETAIL_CHART = new Chart(ctx, {
    type:"line",
    data:{ labels:["6m","5m","4m","3m","2m","1m","Now"], datasets:[
      {label:`${name} (6m)`, data, borderColor:"#2f8cff", borderWidth:2, tension:0.3, pointRadius:3}
    ]},
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{ticks:{callback:v=>formatCurrency(v)}},x:{grid:{display:false}}}}
  });
  document.getElementById("ny_modal_content").style.display = "block";
}

/* ---------- Show/hide panels ---------- */
function showPanel(name){
  const s = document.getElementById("ny_stocks_panel");
  const f = document.getElementById("ny_funds_panel");
  const p = document.getElementById("ny_portfolio_panel");
  if(!s || !f || !p) return;
  s.style.display = f.style.display = p.style.display = "none";
  if(name==="stocks") s.style.display="block";
  if(name==="funds") f.style.display="block";
  if(name==="portfolio") p.style.display="block";
  document.querySelectorAll(".ny-nav-btn").forEach(b=>b.classList.remove("active"));
  const btn = document.getElementById("nav"+capitalize(name));
  if(btn) btn.classList.add("active");
}
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1) }

/* ---------- Master render ---------- */
function renderAll(){
  renderHeader();
  clearMain();
  renderStocksPanel();
  renderFundsPanel();
  renderPortfolioPanel();
  renderBottomNav();
  // default show stocks
  showPanel("stocks");
}

/* ---------- Init ---------- */
renderAll();

/* expose for debug */
window.NY = { portfolio, buyStock, addFund, renderAll, savePortfolio };
