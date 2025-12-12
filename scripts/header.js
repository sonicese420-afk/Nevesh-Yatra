// scripts/header.js
// Aggressive header cleanup: remove/hide duplicate bell/profile elements.

(function () {
  function removeByPredicate() {
    // remove by id/class list first (fast)
    const ids = ['nyBellBtn', 'nyProfile', 'nyAvatarBtn', 'nyAuthBtns', 'app-header'];
    ids.forEach(id => {
      const el = document.getElementById(id) || document.querySelector('#' + id);
      if (el) el.remove();
    });

    // remove any button whose title/aria-label contains common words
    const candidates = document.querySelectorAll('button,div[role="button"],a');
    candidates.forEach(el => {
      const t = (el.getAttribute('title') || '') + '|' + (el.getAttribute('aria-label') || '') + '|' + (el.textContent || '');
      const lower = t.toLowerCase();
      if (lower.includes('notify') || lower.includes('bell') || lower.includes('notification') || lower.includes('profile') || lower.includes('avatar') ) {
        try { el.remove(); } catch(e) { el.style.display='none'; el.style.visibility='hidden'; }
      }
    });

    // remove any svg paths that look like a bell — fallback: hide parent nodes that contain 'bell' in SVG title
    const svgs = document.querySelectorAll('svg, svg path');
    svgs.forEach(s => {
      const title = (s.getAttribute('title') || s.getAttribute('aria-label') || '').toLowerCase();
      if (title.includes('bell')) {
        const p = s.closest('button') || s.closest('div') || s.parentElement;
        if (p) try { p.remove(); } catch(e){ p.style.display='none'; }
      }
    });

    // Ensure guest chip remains visible
    const guest = document.getElementById('nyGuestChip') || document.querySelector('.ny-guest-chip') || document.querySelector('.ny-guest');
    if (guest) {
      guest.style.display = 'inline-flex';
      guest.style.visibility = 'visible';
    }
  }

  // run ASAP after DOM ready
  document.addEventListener('DOMContentLoaded', removeByPredicate);
  // re-run later in case something re-renders the header
  setTimeout(removeByPredicate, 350);
  setTimeout(removeByPredicate, 1000);
  setTimeout(removeByPredicate, 2500);
})();
