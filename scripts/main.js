/* scripts/main.js
   Minimal page initializer for demo stocks/funds and modal behavior.
   Keeps everything guarded with existence checks to avoid JS errors.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Demo dataset (safe sample)
  const demoStocks = [
    { symbol: 'RE', name: 'Reliance Industries Ltd', tag: 'RELIANCE', price: 1398.07 },
    { symbol: 'TM', name: 'Tata Motors', tag: 'TATAMOTORS', price: 1006.98 },
    { symbol: 'AG', name: 'Adani Green', tag: 'ADANIGREEN', price: 1181.45 },
    { symbol: 'WIP', name: 'Wipro', tag: 'WIPRO', price: 574.44 },
    { symbol: 'MRF', name: 'MRF', tag: 'MRF', price: 1898.78 }
  ];

  // find the container where stock rows should go (use your element/class)
  const listContainer = document.getElementById('nyList') || document.querySelector('.ny-stock-list');

  if (listContainer) {
    demoStocks.forEach(s => {
      const row = document.createElement('div');
      row.className = 'ny-stock-row';
      row.innerHTML = `
        <div class="ny-stock-left">
          <div class="ny-stock-icon">${s.symbol.slice(0,2)}</div>
          <div class="ny-stock-meta">
            <div class="ny-stock-name">${s.name}</div>
            <div class="ny-stock-tag">STOCK | ${s.tag}</div>
          </div>
        </div>
        <div class="ny-stock-right">
          <div class="ny-stock-price">₹${Number(s.price).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
        </div>
      `;
      // open modal on click (safe guard)
      row.addEventListener('click', () => {
        openStockModal(s);
      });
      listContainer.appendChild(row);
    });
  } else {
    console.warn('No stock list container found (#nyList or .ny-stock-list).');
  }

  /* --------- Modal and trade controls (safe) --------- */

  const modal = document.getElementById('nyModal') || document.getElementById('nyStockModal');
  const modalContent = document.getElementById('modalContent') || document.getElementById('modalContent');
  const closeX = document.querySelector('.ny-modal-close') || null;

  function openStockModal(stock) {
    // fallback: if no modal element, create a simple overlay
    if (!modal) {
      alert(`${stock.name}\nPrice: ₹${stock.price}`);
      return;
    }

    // set content area (if exists)
    const titleEl = modal.querySelector('.modal-stock-title');
    if (titleEl) titleEl.textContent = `${stock.name}`;

    const priceEl = modal.querySelector('.modal-stock-price');
    if (priceEl) priceEl.textContent = `₹${stock.price}`;

    // set qty default
    const qtyInput = modal.querySelector('#tradeQty');
    if (qtyInput) qtyInput.value = '1';

    modal.classList.add('open');
    document.body.classList.add('ny-modal-open');
  }

  // close handlers
  if (closeX) {
    closeX.addEventListener('click', closeModal);
  }
  if (modal) {
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) closeModal();
    });
  }
  function closeModal() {
    if (modal) {
      modal.classList.remove('open');
      document.body.classList.remove('ny-modal-open');
    }
  }

  // trade buttons (demo)
  const buyBtn = document.getElementById('buyBtn') || document.getElementById('buyBtnDemo') || document.querySelector('.buy');
  const sellBtn = document.getElementById('sellBtn') || document.querySelector('.sell');
  const sipBtn = document.getElementById('sipBtn') || document.querySelector('.sip');

  [buyBtn, sellBtn, sipBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        alert(`${btn.textContent.trim()} action (demo).`);
      });
    }
  });

  // safe init complete
  console.log('NY demo main initialized.');
});
