/* app.js — contains data, rendering, detail overlay, DPR-safe chart drawing and actions.
   Save as app.js and load from index.html (no external libs). */

(() => {
  'use strict';
  /* ---- mock data ---- */
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
  function loadHoldings(){ try{ const raw = localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):{stocks:{},funds:{}} }catch(e){return {stocks:{},funds:{}}}}
  function saveHoldings(h){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(h)); }catch(e){console.error(e)}}
  let holdings = loadHoldings();

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  function formatINR(n){ return '₹'+(Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}); }

  /* ---- render lists ---- */
  function renderStocks(){
    const root = $('#stocksList'); root.innerHTML='';
    STOCKS.forEach(s=>{
      const el = document.createElement('div'); el.className='item';
      const owned = holdings.stocks[s.short];
      const ownedHtml = owned?`<div style="margin-top:8px;color:var(--muted);font-weight:700">Qty: ${owned.qty} @ ${formatINR(owned.avg)}</div>`:'';
      el.innerHTML = `<div class="left"><div class="avatar">${s.short}</div><div class="meta"><div class="name">${s.name}</div><div class="sub">Stock | ${s.ticker}</div>${ownedHtml}</div></div><div class="price">${formatINR(s.price)}</div>`;
      el.addEventListener('click', ()=>openDetail('stock', s.id));
      root.appendChild(el);
    });
  }

  function renderFunds(){
    const root = $('#fundsList'); root.innerHTML='';
    FUNDS.forEach(f=>{
      const el=document.createElement('div'); el.className='item';
      const owned = holdings.funds[f.code];
      const ownedHtml = owned?`<div style="margin-top:8px;color:var(--muted);font-weight:700">Units: ${owned.units} @ ${formatINR(owned.avg)}</div>`:'';
      el.innerHTML = `<div class="left"><div class="avatar">${f.code.substring(0,2)}</div><div class="meta"><div class="name">${f.name}</div><div class="sub">Fund | ${f.code}</div>${ownedHtml}</div></div><div class="price">${formatINR(f.price)}</div>`;
      el.addEventListener('click', ()=>openDetail('fund', f.id));
      root.appendChild(el);
    });
  }

  function renderPortfolio(){
    const root = $('#portfolioList'); root.innerHTML='';
    const sKeys = Object.keys(holdings.stocks||{}), fKeys=Object.keys(holdings.funds||{});
    if(sKeys.length===0 && fKeys.length===0){ root.innerHTML='<div class="empty">You own nothing yet. Buy stocks or funds to see them here.</div>'; return; }
    sKeys.forEach(sym=>{
      const h=holdings.stocks[sym]; const s=STOCKS.find(x=>x.short===sym); if(!s) return;
      const pl = ((s.price - h.avg)/h.avg)*100; const arrow = pl>=0?'▲':'▼';
      const col = pl>=0?'var(--accent)':'#ff5b5b';
      const el=document.createElement('div'); el.className='item';
      el.innerHTML = `<div class="left"><div class="avatar">${s.short}</div><div class="meta"><div class="name">${s.name}</div><div class="sub">Stock | ${s.ticker}</div><div style="margin-top:8px;color:var(--muted);font-weight:700">Qty: ${h.qty} @ ${formatINR(h.avg)}</div></div></div><div style="text-align:right"><div class="price">${formatINR(s.price)}</div><div style="margin-top:8px;color:${col};font-weight:800">${arrow} ${Math.abs(pl).toFixed(2)}%</div></div>`;
      el.addEventListener('click', ()=>openDetail('stock', s.id));
      root.appendChild(el);
    });
    fKeys.forEach(code=>{
      const h=holdings.funds[code]; const f=FUNDS.find(x=>x.code===code); if(!f) return;
      const el=document.createElement('div'); el.className='item';
      el.innerHTML = `<div class="left"><div class="avatar">${f.code.substring(0,2)}</div><div class="meta"><div class="name">${f.name}</div><div class="sub">Fund | ${f.code}</div><div style="margin-top:8px;color:var(--muted);font-weight:700">Units: ${h.units} @ ${formatINR(h.avg)}</div></div></div><div class="price">${formatINR(f.price)}</div>`;
      el.addEventListener('click', ()=>openDetail('fund', f.id));
      root.appendChild(el);
    });
  }

  function updateAssets(){
    let total=0, holdingsCount=0;
    Object.keys(holdings.stocks||{}).forEach(sym=>{ const h=holdings.stocks[sym]; const s=STOCKS.find(x=>x.short===sym); if(!s) return; total+=s.price*h.qty; holdingsCount+=h.qty; });
    Object.keys(holdings.funds||{}).forEach(code=>{ const h=holdings.funds[code]; const f=FUNDS.find(x=>x.code===code); if(!f) return; total+=f.price*h.units; holdingsCount+=h.units; });
    $('#assetsValue').textContent = formatINR(total);
    $('#assetsHoldings').textContent = 'Holdings: '+holdingsCount;
    const change = ((Math.random()-0.5)*100).toFixed(2);
    const pct = total>0?((change/total)*100).toFixed(2):'0.00';
    $('#assetsChange').textContent = (change>=0?'+':'') + formatINR(change) + ' (' + (change>=0?'+':'') + pct + '%)';
  }

  /* ---- tabs wiring ---- */
  function setTab(tab){
    $$('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
    $$('.pill-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
    $('#stocksSection').hidden = tab!=='stocks';
    $('#fundsSection').hidden = tab!=='funds';
    $('#portfolioSection').hidden = tab!=='portfolio';
  }
  $$('.tab').forEach(b=>b.addEventListener('click', ()=>setTab(b.dataset.tab)));
  $$('.pill-btn').forEach(b=>b.addEventListener('click', ()=>setTab(b.dataset.tab)));

  /* ---- chart drawing helpers (DPR-safe) ---- */
  const detailChart = $('#detailChart');
  let detailState = { type:null, id:null, cache:{} };

  function fitCanvas(canvas){
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if(canvas.width !== width || canvas.height !== height){
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    }
  }
  function clearCanvas(c){ const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); }
  function drawGrid(ctx,w,h,lines=6){
    ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=1;
    for(let i=0;i<=lines;i++){ const y = (h/lines)*i + 0.5; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    ctx.restore();
  }
  function drawSmooth(ctx,pts,w,h,color='rgba(47,213,159,1)'){
    if(pts.length<2) return;
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w,h)*0.008));
    ctx.strokeStyle = color; ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length-1;i++){
      const xc=(pts[i].x+pts[i+1].x)/2, yc=(pts[i].y+pts[i+1].y)/2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
    ctx.stroke(); ctx.restore();
  }
  function seriesToPoints(series,w,h,pad=28){
    const max=Math.max(...series), min=Math.min(...series), span=max-min || 1;
    const innerW = w - pad*2, innerH = h - pad*2;
    return series.map((v,i)=>({ x: pad + (i/(series.length-1))*innerW, y: pad + innerH - ((v-min)/span)*innerH, v }));
  }
  function genSeries(base,n=150,vol=0.03){
    const arr=[]; let p=base*(1+(Math.random()-0.5)*0.01);
    for(let i=0;i<n;i++){ const change=(Math.random()-0.5)*vol*base; p = Math.max(1, p+change); arr.push(parseFloat(p.toFixed(2))); }
    return arr;
  }

  function drawDetail(range='1d'){
    let base = 100;
    if(detailState.type==='stock'){ const s = STOCKS.find(x=>x.id===detailState.id); if(s) base = s.price; }
    else if(detailState.type==='fund'){ const f = FUNDS.find(x=>x.id===detailState.id); if(f) base = f.price; }
    let points = (range==='1d'?150: range==='1w'?240: range==='1m'?360: range==='6m'?480:600);
    const cacheKey = detailState.type + ':' + detailState.id + ':' + range;
    if(!detailState.cache[cacheKey]) detailState.cache[cacheKey] = genSeries(base, points, range==='1d'?0.02:0.06);
    const series = detailState.cache[cacheKey];

    fitCanvas(detailChart);
    const ctx = detailChart.getContext('2d'); clearCanvas(detailChart);
    const w = detailChart.width, h = detailChart.height;
    ctx.fillStyle = 'rgba(2,9,11,0.0)'; ctx.fillRect(0,0,w,h);
    drawGrid(ctx,w,h,6);
    const pts = seriesToPoints(series, w, h, Math.round(Math.max(22, w*0.03)));
    drawSmooth(ctx, pts, w, h, 'rgba(47,213,159,1)');
  }

  $$('.chart-btn').forEach(b => b.addEventListener('click', ()=>{
    $$('.chart-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active');
    requestAnimationFrame(()=> drawDetail(b.dataset.range));
  }));

  window.addEventListener('resize', ()=>{ if(!$('#detailOverlay').classList.contains('open')) return; const active = document.querySelector('.chart-btn.active'); drawDetail(active?active.dataset.range:'1d'); });

  const ro = new ResizeObserver(()=>{ if($('#detailOverlay').classList.contains('open')){ const active = document.querySelector('.chart-btn.active'); drawDetail(active?active.dataset.range:'1d'); }});
  ro.observe(detailChart);

  /* ---- detail overlay open/close ---- */
  $('#closeDetail').addEventListener('click', ()=>{ $('#detailOverlay').classList.remove('open'); $('#detailOverlay').setAttribute('aria-hidden','true'); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') { $('#detailOverlay').classList.remove('open'); $('#detailOverlay').setAttribute('aria-hidden','true'); } });

  function openDetail(type,id){
    detailState.type=type; detailState.id=id;
    let item = null;
    if(type==='stock') item = STOCKS.find(x=>x.id===id);
    else item = FUNDS.find(x=>x.id===id);
    if(!item) return;
    $('#detailAvatar').textContent = (item.short||item.code||'ND').substring(0,2);
    $('#detailName').textContent = item.name;
    $('#detailSub').textContent = type==='stock'?('Stock | '+item.ticker):('Fund | '+(item.code||''));
    $('#detailPrice').textContent = formatINR(item.price);
    if(type==='stock' && holdings.stocks[item.short]) {
      const owned = holdings.stocks[item.short]; const change = ((item.price - owned.avg)/owned.avg)*100;
      $('#detailChangeBadge').hidden=false; $('#detailChangeBadge').textContent=(change>=0?'▲ ':'▼ ')+Math.abs(change).toFixed(2)+'%';
      $('#detailChangeBadge').style.color = change>=0 ? 'var(--accent)' : '#ff5b5b';
    } else $('#detailChangeBadge').hidden=true;

    $('#detailOverlay').classList.add('open'); $('#detailOverlay').setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ const active = document.querySelector('.chart-btn.active'); drawDetail(active?active.dataset.range:'1d'); }); });
    $('#detailOverlay').scrollTop = 0;
  }

  /* ---- buy / sell / sip ---- */
  $('#buyBtn').addEventListener('click', ()=>{ const qty = Math.max(1, parseInt($('#qtyInput').value||'1',10));
    if(detailState.type==='stock'){ const s = STOCKS.find(x=>x.id===detailState.id); if(!s) return; const sym=s.short; const existing=holdings.stocks[sym]||{qty:0,avg:0}; const newQty=existing.qty+qty; const newAvg = ((existing.avg*existing.qty) + (s.price*qty)) / (newQty||1); holdings.stocks[sym] = { qty:newQty, avg:parseFloat(newAvg.toFixed(2)) }; saveHoldings(holdings); renderAll(); populateDetailHeader(); alert('Bought '+qty+' of '+s.name); } else { const f=FUNDS.find(x=>x.id===detailState.id); if(!f) return; const code=f.code; const existing=holdings.funds[code]||{units:0,avg:0}; const newUnits=existing.units+qty; const newAvg = ((existing.avg*existing.units) + (f.price*qty)) / (newUnits||1); holdings.funds[code] = { units:newUnits, avg:parseFloat(newAvg.toFixed(2)) }; saveHoldings(holdings); renderAll(); alert('Bought '+qty+' units of '+f.name); } });

  $('#sellBtn').addEventListener('click', ()=>{ const qty = Math.max(1, parseInt($('#qtyInput').value||'1',10));
    if(detailState.type==='stock'){ const s=STOCKS.find(x=>x.id===detailState.id); if(!s) return; const sym=s.short; const existing=holdings.stocks[sym]; if(!existing||existing.qty<qty){ alert('Not enough quantity'); return;} const remaining = existing.qty-qty; if(remaining===0) delete holdings.stocks[sym]; else holdings.stocks[sym].qty = remaining; saveHoldings(holdings); renderAll(); populateDetailHeader(); alert('Sold '+qty+' of '+s.name);} else { const f=FUNDS.find(x=>x.id===detailState.id); if(!f) return; const code=f.code; const existing=holdings.funds[code]; if(!existing||existing.units<qty){ alert('Not enough units'); return;} const remaining=existing.units-qty; if(remaining===0) delete holdings.funds[code]; else holdings.funds[code].units = remaining; saveHoldings(holdings); renderAll(); alert('Redeemed '+qty+' units of '+f.name); }});

  $('#sipBtn').addEventListener('click', ()=>{ const qty=1;
    if(detailState.type==='fund'){ const f=FUNDS.find(x=>x.id===detailState.id); if(!f) return; const code=f.code; const existing=holdings.funds[code]||{units:0,avg:0}; const newUnits=existing.units+qty; const newAvg=((existing.avg*existing.units)+(f.price*qty))/newUnits; holdings.funds[code] = { units:newUnits, avg:parseFloat(newAvg.toFixed(2)) }; saveHoldings(holdings); renderAll(); alert('SIP: bought '+qty+' unit(s) of '+f.name); } else { const s=STOCKS.find(x=>x.id===detailState.id); if(!s) return; const sym=s.short; const existing=holdings.stocks[sym]||{qty:0,avg:0}; const newQty=existing.qty+qty; const newAvg=((existing.avg*existing.qty)+(s.price*qty))/newQty; holdings.stocks[sym] = { qty:newQty, avg:parseFloat(newAvg.toFixed(2)) }; saveHoldings(holdings); renderAll(); alert('SIP: bought '+qty+' share(s) of '+s.name); } });

  function populateDetailHeader(){
    if(!detailState.type) return;
    const id = detailState.id;
    let item = null;
    if(detailState.type==='stock') item = STOCKS.find(x=>x.id===id); else item = FUNDS.find(x=>x.id===id);
    if(!item) return;
    $('#detailAvatar').textContent = (item.short||item.code||'ND').substring(0,2);
    $('#detailName').textContent = item.name;
    $('#detailSub').textContent = detailState.type==='stock'?('Stock | '+item.ticker):('Fund | '+(item.code||''));
    $('#detailPrice').textContent = formatINR(item.price);
    if(detailState.type==='stock' && holdings.stocks[item.short]) {
      const h=holdings.stocks[item.short]; const change = ((item.price - h.avg)/h.avg)*100;
      $('#detailChangeBadge').hidden=false; $('#detailChangeBadge').textContent=(change>=0?'▲ ':'▼ ')+Math.abs(change).toFixed(2)+'%'; $('#detailChangeBadge').style.color = change>=0 ? 'var(--accent)' : '#ff5b5b';
    } else $('#detailChangeBadge').hidden=true;
  }

  function renderAll(){ renderStocks(); renderFunds(); renderPortfolio(); updateAssets(); }

  document.addEventListener('DOMContentLoaded', ()=>{ renderAll(); setTab('stocks'); });

  console.log('app.js loaded — detail overlay and dpr-safe chart active.');

})();
