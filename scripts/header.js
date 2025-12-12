// scripts/header.js
// Defensive header adjustments: ensure only guest chip is visible and remove duplicates.

function forceHideElements() {
  try {
    // hide auth buttons group (if present)
    const authBtns = document.getElementById('nyAuthBtns');
    if (authBtns) authBtns.style.display = 'none';

    // hide the bell control if present
    const bell = document.getElementById('nyBellBtn') || document.querySelector('.ny-icon-btn#nyBellBtn');
    if (bell) bell.style.display = 'none';

    // hide any logged-in profile wrapper
    const profile = document.getElementById('nyProfile') || document.querySelector('.ny-profile');
    if (profile) profile.style.display = 'none';

    // hide avatar/button variations
    const avatarBtn = document.getElementById('nyAvatarBtn') || document.querySelector('.ny-avatar') || document.querySelector('.half-human');
    if (avatarBtn) avatarBtn.style.display = 'none';

    // show guest chip if exists
    const guest = document.getElementById('nyGuestChip') || document.querySelector('.ny-guest-chip');
    if (guest) {
      guest.style.display = 'inline-flex';
      guest.setAttribute('aria-pressed', 'false');
      guest.setAttribute('tabindex', '0');
    }

    // defensive: hide alternate header if present
    const altHeader = document.querySelector('.app-header');
    if (altHeader) altHeader.style.display = 'none';

  } catch (e) {
    console.warn('header force-hide error', e);
  }
}

// run on DOM ready
document.addEventListener('DOMContentLoaded', function () {
  forceHideElements();

  // If something else rerenders the header later (single-page), re-run once shortly after
  setTimeout(forceHideElements, 400);
  // final safety run
  setTimeout(forceHideElements, 1200);
});
