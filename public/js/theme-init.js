/* LoveConnect appearance bootstrap.
 * Loaded in <head> BEFORE css/style.css so night mode / theme / language / direction
 * are applied before first paint (no white flash). Also exposes window.LCAppearance
 * so app.js and settings-pages.js share one implementation. */
(function () {
  var d = document.documentElement;
  var KEY = { theme: 'loveconnect_theme', mode: 'loveconnect_mode', lang: 'loveconnect_lang' };
  var RTL = ['ar', 'he', 'fa', 'ur'];
  var BS_LTR = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
  var BS_RTL = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css';

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function mq(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }

  function applyMode(m) {
    d.dataset.mode = m;
    d.setAttribute('data-bs-theme', m === 'night' ? 'dark' : 'light'); // lets Bootstrap theme its own components
  }
  function applyTheme(t) { d.dataset.theme = t; }
  function applyLang(code) {
    var rtl = RTL.indexOf(code) > -1;
    d.lang = code;
    d.dir = rtl ? 'rtl' : 'ltr';
    var link = document.querySelector('link[href*="bootstrap"][href$=".css"]:not([href*="icons"])');
    if (link) {
      var want = rtl ? BS_RTL : BS_LTR;
      if (link.getAttribute('href') !== want) link.setAttribute('href', want);
    }
  }

  var savedMode = get(KEY.mode);
  applyTheme(get(KEY.theme) || 'classic');
  applyMode(savedMode === 'night' || savedMode === 'light' ? savedMode : (mq('(prefers-color-scheme: dark)') ? 'night' : 'light'));
  applyLang(get(KEY.lang) || 'en');

  function announce() {
    try { document.dispatchEvent(new CustomEvent('lc:appearance')); } catch (e) {}
  }
  function animateSwitch() {
    if (mq('(prefers-reduced-motion: reduce)')) return;
    d.classList.add('lc-theme-transition');
    window.setTimeout(function () { d.classList.remove('lc-theme-transition'); }, 400);
  }

  var api = {
    getMode: function () { return d.dataset.mode; },
    setMode: function (m, remember) {
      animateSwitch();
      applyMode(m);
      if (remember !== false) set(KEY.mode, m);
      announce();
    },
    toggleMode: function () { api.setMode(d.dataset.mode === 'night' ? 'light' : 'night'); },
    setTheme: function (t) { animateSwitch(); applyTheme(t); set(KEY.theme, t); announce(); },
    setLanguage: function (code) { set(KEY.lang, code); applyLang(code); announce(); }
  };
  window.LCAppearance = api;

  // Follow the device setting until the visitor makes an explicit choice.
  if (window.matchMedia) {
    var m = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function (e) {
      var s = get(KEY.mode);
      if (s !== 'night' && s !== 'light') api.setMode(e.matches ? 'night' : 'light', false);
    };
    if (m.addEventListener) m.addEventListener('change', onChange);
    else if (m.addListener) m.addListener(onChange);
  }
})();
