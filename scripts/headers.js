// scripts/header.js
(function(){
  // element refs
  const btnGuest = document.getElementById('nyGuestBtn');
  const btnLogin = document.getElementById('nyLoginBtn');
  const btnSignup = document.getElementById('nySignupBtn');
  const authWrap = document.getElementById('nyAuthBtns');
  const profileWrap = document.getElementById('nyProfile');
  const profileMenu = document.getElementById('nyProfileMenu');
  const avatarEl = document.getElementById('nyAvatar');
  const usernameEl = document.getElementById('nyUsername');
  const logoutEl = document.getElementById('nyLogout');
  const viewProfile = document.getElementById('nyViewProfile');

  // localStorage key
  const KEY = 'ny_user';

  // helper: random guest name
  function makeGuestName(){
    const adj = ['Swift','Calm','Mint','Sonic','Silent','Brave','Lucky','Nova','Aqua'];
    const n = Math.floor(Math.random()*900)+100;
    return `${adj[Math.floor(Math.random()*adj.length)]}${n}`;
  }

  // render logged in state (simple)
  function setLoggedIn(user){
    if(!user) return setLoggedOut();
    // hide auth buttons, show profile
    authWrap.classList.add('hidden');
    profileWrap.classList.remove('hidden');
    profileWrap.setAttribute('aria-hidden', 'false');
    usernameEl.textContent = user.displayName || 'User';
    // avatar: show initials or generic icon
    const initials = (user.displayName || 'NY').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
    avatarEl.textContent = initials;
    // store
    localStorage.setItem(KEY, JSON.stringify(user));
  }

  function setLoggedOut(){
    localStorage.removeItem(KEY);
    authWrap.classList.remove('hidden');
    profileWrap.classList.add('hidden');
    profileWrap.setAttribute('aria-hidden', 'true');
    avatarEl.textContent = '';
  }

  // try to load user on start
  function initUser(){
    try{
      const raw = localStorage.getItem(KEY);
      if(raw){
        const u = JSON.parse(raw);
        setLoggedIn(u);
      } else {
        setLoggedOut();
      }
    } catch(e){
      console.error(e);
      setLoggedOut();
    }
  }

  // guest login click
  if(btnGuest){
    btnGuest.addEventListener('click', ()=>{
      const user = { provider: 'guest', displayName: makeGuestName(), createdAt: Date.now() };
      setLoggedIn(user);
    });
  }

  // login / signup — currently placeholders (can be wired later)
  if(btnLogin) btnLogin.addEventListener('click', ()=>{ alert('Login flow placeholder — will implement shortly.'); });
  if(btnSignup) btnSignup.addEventListener('click', ()=>{ alert('Signup flow placeholder — will implement shortly.'); });

  // profile menu toggle
  if(profileWrap){
    profileWrap.addEventListener('click', (e)=>{
      e.stopPropagation();
      profileMenu.classList.toggle('hidden');
    });
    // close menu when clicking outside
    document.addEventListener('click', ()=>{
      if(profileMenu && !profileMenu.classList.contains('hidden')){
        profileMenu.classList.add('hidden');
      }
    });
  }

  // logout
  if(logoutEl) logoutEl.addEventListener('click', ()=>{
    setLoggedOut();
    profileMenu.classList.add('hidden');
  });

  // view profile placeholder
  if(viewProfile) viewProfile.addEventListener('click', ()=>{
    alert('Profile page placeholder — will implement later.');
  });

  // init
  initUser();
})();
