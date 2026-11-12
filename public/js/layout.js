/* Shared site header + footer. Written once here instead of being copied into 20 pages.
 * Uses document.write so it works from file:// (no fetch / server needed) and avoids layout shift.
 * Usage in a page:  <script src="js/layout.js" data-part="nav"></script>
 * Parts: nav (signed-in pages), nav-home (landing page), footer. */
(function () {
  var PARTS = {
    "nav": `<nav class="navbar navbar-dark site-nav sticky-top"><div class="container-fluid px-lg-4 px-3">
<a class="navbar-brand d-flex align-items-center gap-2" href="index.html" aria-label="LoveConnect home"><span class="brand-mark"><i class="bi bi-heart-fill"></i></span><span>LoveConnect</span></a>
<div class="lc-main-nav d-flex align-items-center gap-1 me-auto ms-lg-4"><a class="lc-nav-link" href="discover.html" data-page="discover.html">Home</a><a class="lc-nav-link" href="messages.html" data-page="messages.html">Messages</a><div class="dropdown"><button class="lc-nav-link dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">Activity</button><ul class="dropdown-menu"><li><a class="dropdown-item" href="likes.html">Likes</a></li><li><a class="dropdown-item" href="favorites.html">Favorites</a></li><li><a class="dropdown-item" href="profile-views.html">Profile views</a></li><li><a class="dropdown-item" href="blocked.html">Blocked list</a></li></ul></div></div>
<div class="d-flex align-items-center gap-2 nav-actions ms-auto"><div class="dropdown"><button class="btn btn-language dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-globe2 me-1"></i> English</button><ul class="dropdown-menu dropdown-menu-end"><li><a class="dropdown-item" href="#" data-language="English" data-lang-code="en">English</a></li><li><a class="dropdown-item" href="#" data-language="العربية" data-lang-code="ar">العربية</a></li><li><a class="dropdown-item" href="#" data-language="Français" data-lang-code="fr">Français</a></li></ul></div>
<div class="dropdown notification-dropdown d-none" id="notificationDropdown"><button class="btn btn-notification-icon position-relative" id="notificationBell" aria-label="Notifications" aria-expanded="false" type="button"><i class="bi bi-bell-fill"></i><span class="notification-count" id="notificationCount">3</span></button><div class="dropdown-menu dropdown-menu-end notification-menu p-0" aria-labelledby="notificationBell"><div class="d-flex align-items-center justify-content-between px-3 py-3 border-bottom"><strong>Notifications</strong><button class="btn btn-link btn-sm p-0 text-decoration-none" id="markAllRead">Mark all as read</button></div><div class="notification-menu-items"><button class="notification-item unread" data-notification="" data-href="likes.html"><span class="notification-icon pink"><i class="bi bi-heart-fill"></i></span><span class="notification-copy"><strong>Someone liked your profile</strong><small>A new person would like to connect.</small><time>Just now</time></span><span class="unread-dot"></span></button><button class="notification-item unread" data-notification="" data-href="chat.html?person=Daniel"><span class="notification-icon purple"><i class="bi bi-chat-dots-fill"></i></span><span class="notification-copy"><strong>New message from Daniel</strong><small>Open your conversation.</small><time>15 minutes ago</time></span><span class="unread-dot"></span></button><button class="notification-item unread" data-notification="" data-href="likes.html"><span class="notification-icon green"><i class="bi bi-stars"></i></span><span class="notification-copy"><strong>It’s a match!</strong><small>You and Daniel liked each other.</small><time>Yesterday</time></span><span class="unread-dot"></span></button></div><a class="notification-view-all" href="notifications.html">View all notifications</a></div></div>
<button class="btn btn-outline-light rounded-pill px-3 px-sm-4" data-bs-toggle="modal" data-bs-target="#loginModal">Log In</button><button class="btn btn-pink rounded-pill px-3 px-sm-4" data-bs-toggle="modal" data-bs-target="#signupModal">Sign Up</button></div></div></nav>`,
    "nav-home": `<nav class="navbar navbar-dark site-nav sticky-top"><div class="container-fluid px-lg-4 px-3">
<a class="navbar-brand d-flex align-items-center gap-2" href="index.html" aria-label="LoveConnect home"><span class="brand-mark"><i class="bi bi-heart-fill"></i></span><span>LoveConnect</span></a>
<div class="d-flex align-items-center gap-2 nav-actions ms-auto"><div class="dropdown"><button class="btn btn-language dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-globe2 me-1"></i> English</button><ul class="dropdown-menu dropdown-menu-end"><li><a class="dropdown-item" href="#" data-language="English" data-lang-code="en">English</a></li><li><a class="dropdown-item" href="#" data-language="العربية" data-lang-code="ar">العربية</a></li><li><a class="dropdown-item" href="#" data-language="Français" data-lang-code="fr">Français</a></li></ul></div>
<div class="dropdown notification-dropdown d-none" id="notificationDropdown"><button class="btn btn-notification-icon position-relative" id="notificationBell" aria-label="Notifications" aria-expanded="false" type="button"><i class="bi bi-bell-fill"></i><span class="notification-count" id="notificationCount">3</span></button><div class="dropdown-menu dropdown-menu-end notification-menu p-0" aria-labelledby="notificationBell"><div class="d-flex align-items-center justify-content-between px-3 py-3 border-bottom"><strong>Notifications</strong><button class="btn btn-link btn-sm p-0 text-decoration-none" id="markAllRead">Mark all as read</button></div><div class="notification-menu-items"><button class="notification-item unread" data-notification="" data-href="likes.html"><span class="notification-icon pink"><i class="bi bi-heart-fill"></i></span><span class="notification-copy"><strong>Someone liked your profile</strong><small>A new person would like to connect.</small><time>Just now</time></span><span class="unread-dot"></span></button><button class="notification-item unread" data-notification="" data-href="chat.html?person=Daniel"><span class="notification-icon purple"><i class="bi bi-chat-dots-fill"></i></span><span class="notification-copy"><strong>New message from Daniel</strong><small>Open your conversation.</small><time>15 minutes ago</time></span><span class="unread-dot"></span></button><button class="notification-item unread" data-notification="" data-href="likes.html"><span class="notification-icon green"><i class="bi bi-stars"></i></span><span class="notification-copy"><strong>It’s a match!</strong><small>You and Daniel liked each other.</small><time>Yesterday</time></span><span class="unread-dot"></span></button></div><a class="notification-view-all" href="notifications.html">View all notifications</a></div></div>
<button class="btn btn-outline-light rounded-pill px-3 px-sm-4" data-bs-toggle="modal" data-bs-target="#loginModal">Log In</button><button class="btn btn-pink rounded-pill px-3 px-sm-4" data-bs-toggle="modal" data-bs-target="#signupModal">Sign Up</button></div></div></nav>`,
    "footer": `<footer class="site-footer"><div class="container d-flex flex-column flex-md-row align-items-center justify-content-between gap-3"><a class="footer-brand" href="index.html"><span class="brand-mark"><i class="bi bi-heart-fill"></i></span> LoveConnect</a><p class="mb-0">© <span id="year"></span> LoveConnect. Made for meaningful connections.</p><div class="footer-links"><a href="discover.html">Discover</a><a href="likes.html">Matches</a><a href="index.html#stories">Stories</a><a href="#" data-bs-toggle="modal" data-bs-target="#privacyModal">Privacy</a></div></div></footer>`
  };
  var s = document.currentScript;
  var part = s && s.getAttribute("data-part");
  if (PARTS[part]) document.write(PARTS[part]);
  // GTranslate free website widget (https://gtranslate.io/website-translator-widget).
  // Skipped entirely on pages whose <body> carries data-no-translate (admin.html):
  // admin data such as member emails and reports must never leave for Google.
  // Visitor opt-in with up-front notice: no translation library loads and no page text
  // leaves the browser until the visitor reads the notice and taps Continue.
  // No account or API key needed. Consent and language choice are remembered on this device.
  if (part === "footer" && !(document.body && document.body.hasAttribute("data-no-translate"))) {
    document.write(
      '<div id="lc-gt-gate" style="position:fixed;bottom:20px;left:20px;z-index:999998">' +
        '<button type="button" id="lc-gt-open" style="display:inline-flex;align-items:center;gap:6px;background:#fff;color:#191427;border:1px solid #eee8ed;border-radius:999px;padding:8px 14px;font-size:14px;box-shadow:0 5px 15px rgba(0,0,0,.15);cursor:pointer">&#x1F310; Translate</button>' +
        '<div id="lc-gt-card" style="display:none;max-width:300px;background:#fff;color:#191427;border:1px solid #eee8ed;border-radius:14px;padding:14px;box-shadow:0 8px 24px rgba(0,0,0,.18);font-size:13px;line-height:1.5">' +
          '<p style="margin:0 0 6px">Translate this site with Google Translate. Page text (including visible chat messages) is sent to Google, and your choice is remembered on this device.</p>' +
          '<p style="margin:0 0 10px" dir="rtl">&#x062A;&#x0631;&#x062C;&#x0645;&#x0629; &#x0627;&#x0644;&#x0645;&#x0648;&#x0642;&#x0639; &#x0639;&#x0646; &#x0637;&#x0631;&#x064A;&#x0642; &#x062C;&#x0648;&#x062C;&#x0644;: &#x0646;&#x0635; &#x0627;&#x0644;&#x0635;&#x0641;&#x062D;&#x0629; (&#x0628;&#x0645;&#x0627; &#x0641;&#x064A;&#x0647; &#x0631;&#x0633;&#x0627;&#x0626;&#x0644; &#x0627;&#x0644;&#x0634;&#x0627;&#x062A; &#x0627;&#x0644;&#x0638;&#x0627;&#x0647;&#x0631;&#x0629;) &#x0628;&#x064A;&#x062A;&#x0628;&#x0639;&#x062A; &#x0644;&#x062C;&#x0648;&#x062C;&#x0644;&#x060C; &#x0648;&#x0627;&#x062E;&#x062A;&#x064A;&#x0627;&#x0631;&#x0643; &#x0628;&#x064A;&#x0641;&#x0636;&#x0644; &#x0645;&#x062D;&#x0641;&#x0648;&#x0638; &#x0639;&#x0644;&#x0649; &#x062C;&#x0647;&#x0627;&#x0632;&#x0643;.</p>' +
          '<button type="button" id="lc-gt-ok" style="background:#e83270;color:#fff;border:0;border-radius:999px;padding:8px 16px;font-weight:700;cursor:pointer">Continue &middot; &#x0645;&#x062A;&#x0627;&#x0628;&#x0639;&#x0629;</button>' +
          '<button type="button" id="lc-gt-cancel" style="background:transparent;color:#6c6c7a;border:0;padding:8px 10px;cursor:pointer">Not now &middot; &#x0644;&#x0627; &#x0627;&#x0644;&#x0622;&#x0646;</button>' +
        '</div>' +
      '</div>');
    (function () {
      function loadWidget() {
        var w = document.createElement('div'); w.className = 'gtranslate_wrapper'; document.body.appendChild(w);
        window.gtranslateSettings = {"default_language":"en","languages":["en","ar","fr"],"wrapper_selector":".gtranslate_wrapper"};
        var s = document.createElement('script'); s.src = 'https://cdn.gtranslate.net/widgets/latest/float.js'; s.defer = true; document.body.appendChild(s);
        var g = document.getElementById('lc-gt-gate'); if (g) g.remove();
        // Avoid double translation: when the visitor picks a non-English widget language,
        // return the site's own i18n to English first so the widget translates the original text.
        // Keep the float widget's marker in sync: it only refreshes on option clicks,
        // not on programmatic doGTranslate calls (including our post-reload pending pick).
        function updateMarker(code) {
          var sel = document.querySelector('.gtranslate_wrapper .gt-selected');
          if (!sel) return setTimeout(function(){ updateMarker(code); }, 300);
          var lbl = sel.querySelector('.gt-lang-code') || sel.querySelector('.gt-current-lang span');
          if (lbl) lbl.textContent = code;
          var img = sel.querySelector('img');
          if (img && /\/[a-z]{2}\.(svg|png)/.test(img.src)) img.src = img.src.replace(/\/[a-z]{2}\.(svg|png)/, '/' + code + '.$1');
          document.querySelectorAll('.gtranslate_wrapper .gt_options a').forEach(function (a) { a.classList.toggle('gt-current', a.getAttribute('data-gt-lang') === code); });
        }
        (function wrap(){ if (!window.doGTranslate) return setTimeout(wrap, 300);
          var orig = window.doGTranslate;
          window.doGTranslate = function (pair) {
            var tgt = String((pair && pair.value) || pair || '').split('|')[1];
            // The site i18n cannot revert Arabic text to English in place (its tree walker
            // skips non-Latin nodes), so switch back to English and reload; the widget
            // then translates the original English text. Prevents double translation.
            if (tgt && tgt !== 'en' && window.LCAppearance) {
              try {
                if (localStorage.getItem('loveconnect_lang') !== 'en') {
                  localStorage.setItem('lc_gt_pending', tgt);
                  LCAppearance.setLanguage('en');
                  location.reload();
                  return;
                }
              } catch (e) {}
            }
            var r = orig.apply(this, arguments);
            if (tgt) updateMarker(tgt);
            return r;
          };
        })();
        // After a language-switch reload, apply the visitor's pending widget choice.
        try {
          var pend = localStorage.getItem('lc_gt_pending');
          if (pend) {
            localStorage.removeItem('lc_gt_pending');
            (function fire(){ if (!window.doGTranslate) return setTimeout(fire, 300); window.doGTranslate('en|' + pend); })();
          }
        } catch (e) {}
      }
      function init() {
        var gate = document.getElementById('lc-gt-gate'); if (!gate) return;
        try { if (localStorage.getItem('lc_gt_consent') === '1') { loadWidget(); return; } } catch (e) {}
        var openBtn = document.getElementById('lc-gt-open'), card = document.getElementById('lc-gt-card'), ok = document.getElementById('lc-gt-ok'), cancel = document.getElementById('lc-gt-cancel');
        if (openBtn && card) openBtn.addEventListener('click', function () { card.style.display = 'block'; openBtn.style.display = 'none'; });
        if (cancel && card && openBtn) cancel.addEventListener('click', function () { card.style.display = 'none'; openBtn.style.display = 'inline-flex'; });
        if (ok) ok.addEventListener('click', function () { try { localStorage.setItem('lc_gt_consent', '1'); } catch (e) {} loadWidget(); });
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    })();
  }
})();
