// script.js - stable skeleton with defensive errors & insertion hooks
(function () {
  'use strict';

  // Defensive wrapper to avoid an uncaught error making the page blank
  try {
    /* ------------------------
       Simple app state and helpers
       ------------------------*/
    const appState = {
      stocks: [
        { id: 'reliance', symbol: 'RE', name: 'Reliance Industries Ltd', meta: 'STOCK | RELIANCE', price: 1398.07 },
        { id: 'tatamotors', symbol: 'TM', name: 'Tata Motors', meta: 'STOCK | TATAMOTORS', price: 1006.98 },
        { id: 'adanigreen', symbol: 'AG', name: 'Adani Green', meta: 'STOCK | ADANIGREEN', price: 1181.45 }
      ],
      currentStock: null,
      chart: null
    };

    /* ------------------------
       DOM refs
       ------------------------*/
    const stockListEl = document.getElementById('stockList');
    const detailModal = document.getElementById('detailModal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalSub = document.getElementById('modalSub');
    const modalAvatar = document.getElementById('modalAvatar');
    const stockChartCanvas = document.getElementById('stockChart').getContext?.('2d');
    const timeframeButtons = document.querySelectorAll('.timeframe .tf');

    /* ------------------------
       Render helpers
       ------------------------*/
    function renderStockList() {
      stockListEl.innerHTML = ''; // clear safely
      appState.stocks.forEach(s => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.setAttribute('data-id', s.id);
        item.setAttribute('data-symbol', s.symbol);

        item.innerHTML = `
          <div class="list-left"><div class="avatar">${s.symbol}</div></div>
          <div class="list-middle">
            <div class="name">${s.name}</div>
            <div class="meta">${s.meta}</div>
          </div>
          <div class="list-right">
            <div class="price">₹${s.price.toLocaleString()}</div>
          </div>
        `;

        // click opens modal detail (full screen)
        item.addEventListener('click', () => openStockDetail(s.id));
        stockListEl.appendChild(item);
      });
    }

    /* ------------------------
       Stock modal functions
       ------------------------*/
    function openStockDetail(stockId) {
      const stock = appState.stocks.find(x => x.id === stockId);
      if (!stock) return;
      appState.currentStock = stock;

      // fill modal header
      modalTitle.textContent = stock.name;
      modalSub.textContent = stock.meta;
      modalAvatar.textContent = stock.symbol;

      // show modal
      detailModal.classList.remove('hidden');
      detailModal.setAttribute('aria-hidden', 'false');

      // draw chart (sample data). Chart has fixed height in CSS to avoid stretch.
      drawChartFor(stock, '1D');
    }

    function closeModal() {
      detailModal.classList.add('hidden');
      detailModal.setAttribute('aria-hidden', 'true');
      if (appState.chart) {
        appState.chart.destroy();
        appState.chart = null;
      }
    }

    /* ------------------------
       Chart drawing (Chart.js)
       - uses fixed canvas height (CSS) to stop stretching.
       ------------------------*/
    function drawChartFor(stock, range) {
      const ctx = stockChartCanvas;
      if (!ctx) return;

      // Destroy existing chart if present
      if (appState.chart) {
        try { appState.chart.destroy(); } catch (e) { /* ignore */ }
      }

      // Generate sample data depending on 'range' (demo only).
      const points = range === '1D' ? 50 : range === '1W' ? 40 : range === '1M' ? 30 : range === '6M' ? 20 : 80;
      const labels = Array.from({ length: points }, (_, i) => (i + 1).toString());
      const base = stock.price || 100;
      // simple fluctuating dataset
      const data = labels.map((_, i) => {
        const jitter = Math.sin(i / 3) * (points / 100) * 10;
        return Math.round((base + jitter + (Math.random() - 0.5) * 8) * 100) / 100;
      });

      // Chart config (minimal, dark theme)
      const cfg = {
        type: 'line',
        data: { labels, datasets: [{ label: stock.symbol, data, borderWidth: 3, pointRadius: 0, fill: false }] },
        options: {
          maintainAspectRatio: false, // let CSS control height
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: {
              grid: { color: 'rgba(255,255,255,0.03)' },
              ticks: { color: 'rgba(255,255,255,0.45)' }
            }
          },
          elements: {
            line: { tension: 0.25, borderColor: '#18d39a' }
          }
        }
      };

      appState.chart = new Chart(ctx, cfg);
    }

    /* ------------------------
       Wire timeframe buttons
       ------------------------*/
    timeframeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        timeframeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const range = btn.getAttribute('data-range');
        if (appState.currentStock) drawChartFor(appState.currentStock, range);
      });
    });

    /* ------------------------
       Modal close
       ------------------------*/
    closeModalBtn.addEventListener('click', closeModal);
    detailModal.addEventListener('click', (e) => {
      // close if click on overlay
      if (e.target === detailModal) closeModal();
    });

    /* ------------------------
       Tab switching (top nav & bottom nav)
       ------------------------*/
    document.querySelectorAll('.tab, .bn').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const target = ev.currentTarget.getAttribute('data-tab');
        // simple active state
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === target));
        document.querySelectorAll('.bn').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === target));
        // For now, only 'stocks' renders
        // FUTURE HOOK: insert code here to render funds/portfolio
        if (target === 'stocks') {
          renderStockList();
        } else {
          stockListEl.innerHTML = `<div style="padding:18px;opacity:0.8">No items for "${target}" yet.</div>`;
        }
      });
    });

    /* ------------------------
       Initialize app
       ------------------------*/
    function init() {
      renderStockList();
      // safe initial DOM updates
      document.getElementById('totalValue').textContent = '₹0';
      document.getElementById('holdingsCount').textContent = 'Holdings: 0';
    }

    init();

    /* ------------------------
       EXPORT: small API for later patches
       ------------------------*/
    window.NYApp = {
      addStock(stockObj) { appState.stocks.push(stockObj); renderStockList(); },
      openStockById(id) { openStockDetail(id); },
      closeModal
    };

  } catch (err) {
    // if anything major breaks, log but don't kill page UI
    console.error('NYApp error:', err);
    // optional: show a non-blocking error banner
    const banner = document.createElement('div');
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.right = '0';
    banner.style.background = '#b91d1d';
    banner.style.color = '#fff';
    banner.style.padding = '8px';
    banner.style.zIndex = '99999';
    banner.textContent = 'An error occurred in the demo UI — check console.';
    document.body.appendChild(banner);
  }
})();
