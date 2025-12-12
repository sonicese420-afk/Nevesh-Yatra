/* scripts/main.js - demo behaviors: populate list, header handling, modal chart */

/* sample stocks data */
const SAMPLE_STOCKS = [
  { id: 'reliance', symbol: 'RE', name: 'Reliance Industries Ltd', meta: 'STOCK | RELIANCE', price: 1398.07 },
  { id: 'tatamotors', symbol: 'TM', name: 'Tata Motors', meta: 'STOCK | TATAMOTORS', price: 1006.98 },
  { id: 'adani', symbol: 'AG', name: 'Adani Green', meta: 'STOCK | ADANIGREEN', price: 1181.45 }
];

document.addEventListener('DOMContentLoaded', () => {
  // 1) Populate stocks list
  const list = document.getElementById('stockList');
  SAMPLE_STOCKS.forEach(s => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.dataset.id = s.id;

    item.innerHTML = `
      <div class="list-left">
        <div class="avatar">${s.symbol.slice(0,2)}</div>
        <div>
          <div class="name">${s.name}</div>
          <div class="meta">${s.meta}</div>
        </div>
      </div>
      <div class="list-right">
        <div class="price">₹${s.price.toLocaleString(undefined,{minimumFractionDigits:2})}</div>
      </div>
    `;
    item.addEventListener('click', () => openModal(s));
    list.appendChild(item);
  });

  // 2) Basic header controls
  const guestChip = document.getElementById('nyGuestChip');
  guestChip.addEventListener('click', e => {
    // simulate login toggle: when clicked change name randomly
    const n = Math.floor(Math.random()*900)+100;
    document.getElementById('nyGuestName').textContent = 'Guest' + n;
  });

  // Hide duplicate header elements if present (defensive)
  Array.from(document.querySelectorAll('header')).forEach((h,i) => { if (i>0) h.remove(); });

  // 3) Modal + chart setup
  const modal = document.getElementById('detailModal');
  const closeBtn = document.getElementById('closeModal') || document.getElementById('closeModal');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Chart - create once
  let stockChart = null;
  const ctx = document.getElementById('stockChart')?.getContext('2d');

  function makeChart(labels, data) {
    if (!ctx) return;
    if (stockChart) stockChart.destroy();

    stockChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Price',
          data,
          fill: false,
          borderColor: '#23de9a',
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // chart container has fixed height in CSS
        scales: {
          x: { display: false },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: 'rgba(255,255,255,0.7)' }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  // open modal with data
  function openModal(stock) {
    document.getElementById('modalTitle').textContent = stock.name;
    document.getElementById('modalSub').textContent = stock.meta;
    document.getElementById('modalAvatar').textContent = stock.symbol.slice(0,2);
    modal.classList.remove('hide');

    // create simple sample price data that won't "stretch"
    const labels = Array.from({length:30}, (_,i)=>i+1);
    // generate a stable series around price
    const base = stock.price;
    const data = labels.map((_,i) => +(base + Math.sin(i/3)*5 + (Math.random()-0.5)*4).toFixed(2));

    makeChart(labels, data);
    // lock body scroll while modal open
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.add('hide');
    // destroy chart (optional)
    if (stockChart) { stockChart.destroy(); stockChart = null; }
    document.body.style.overflow = '';
  }

  // simple action buttons (non-functional demo)
  document.getElementById('buyBtn')?.addEventListener('click', () => alert('BUY pressed (demo)'));
  document.getElementById('sellBtn')?.addEventListener('click', () => alert('SELL pressed (demo)'));
  document.getElementById('sipBtn')?.addEventListener('click', () => alert('SIP pressed (demo)'));

  // bottom nav / tabs behaviour
  document.querySelectorAll('.bn, .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bn, .tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // if needed, would switch contents (demo keeps it simple)
    });
  });

  // close modal when click outside
  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) closeModal();
  });
});
