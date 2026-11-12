/* LoveConnect backend bridge.
 * Loaded after the original js/app.js on every page (injected by Laravel's PageController).
 * It does not change markup or styles: it connects the existing UI to the Laravel API and, where the
 * original page held static sample rows, fills the same markup with real data.
 * Server state comes from window.LC (set by the inline bootstrap script).
 */
(function () {
  'use strict';
  var LC = window.LC || {};
  var me = LC.me;
  // Apply the account's saved language on every page (fresh browsers have no local choice yet).
  if (me && me.language && window.LCAppearance) {
    try { if (localStorage.getItem('loveconnect_lang') !== me.language) window.LCAppearance.setLanguage(me.language); } catch (e) {}
  }
  // Optional wording fixes for sample text that is no longer true. OFF by default so the front end stays exactly as designed.
  var TEXT_FIXES = window.LC_TEXT_FIXES === true;
  var page = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  var qs = new URLSearchParams(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function api(url, opt) {
    opt = opt || {};
    var headers = { 'Accept': 'application/json', 'X-CSRF-TOKEN': LC.csrf || '' };
    var body = opt.body;
    if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    return fetch(url, { method: opt.method || 'GET', headers: headers, body: body, credentials: 'same-origin' }).then(function (r) {
      if (r.status === 401 && me) { location.href = 'index.html?loginRequired=1'; return Promise.reject(r); }
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { if (j.redirect === '/onboarding.html') { location.href = j.redirect; } var m = j && (j.message || (j.errors && Object.values(j.errors)[0][0])); return Promise.reject({ status: r.status, message: m || 'Something went wrong. Please try again.' }); }
        return j;
      });
    });
  }
  function toast(msg) {
    var el = $('toastMessage'); if (el) el.textContent = msg;
    var t = $('siteToast'); if (t && window.bootstrap) bootstrap.Toast.getOrCreateInstance(t, { delay: 3500 }).show();
  }
  function fail(e) { toast((e && e.message) || 'Something went wrong. Please try again.'); }
  if (qs.get('suspended') === '1') {
    var showSuspended = function () { toast('Your account is suspended.'); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showSuspended); else showSuspended();
  }
  function on(type, selector, handler) {
    document.addEventListener(type, function (e) {
      var t = e.target && e.target.closest ? e.target.closest(selector) : null;
      if (t) handler(e, t);
    }, true);
  }
  function stop(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  function avatar(m) { return m && m.photo ? ' style="background-image:url(\'' + esc(m.photo) + '\')"' : ''; }
  function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function fmtTime(iso) {
    var d = new Date(iso), n = new Date();
    if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    var y = new Date(n); y.setDate(n.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return (n - d) < 6 * 864e5 ? d.toLocaleDateString('en-US', { weekday: 'short' }) : fmtDate(iso);
  }
  function ago(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) { var m = Math.floor(s / 60); return m + (m === 1 ? ' minute ago' : ' minutes ago'); }
    if (s < 86400) { var h = Math.floor(s / 3600); return h + (h === 1 ? ' hour ago' : ' hours ago'); }
    return s < 172800 ? 'Yesterday' : fmtDate(iso);
  }
  var GOAL = { serious: 'Serious relationship', friendship: 'Friendship', casual: 'Casual dating' };
  function place(m) { return [m.city, m.country].filter(Boolean).join(', '); }

  /* ---------- Signed-out pages: sign up / log in ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.choice-btn[data-group="gender"]');
    if (b) sessionStorage.setItem('lc_quick_gender', b.dataset.value);
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'quickSignupForm') {
      var sel = f.querySelector('.choice-btn[data-group="gender"].selected');
      if (sel) sessionStorage.setItem('lc_quick_gender', sel.dataset.value);
      var goalBtn = f.querySelector('.choice-btn[data-group="goal"].selected');
      if (goalBtn) sessionStorage.setItem('loveconnect_goal', goalBtn.dataset.value);
      if ($('ageTo')) sessionStorage.setItem('lc_quick_age_to', $('ageTo').value);
      return; // original handler opens the sign-up modal
    }
    if (f.id === 'signupModalForm' || f.id === 'signupForm') {
      stop(e);
      var ins = f.querySelectorAll('input');
      var name = ($('signupName') && f.contains($('signupName')) ? $('signupName').value : ins[0].value).trim();
      var email = f.querySelector('input[type=email]').value;
      var pw = f.querySelector('input[type=password]').value;
      var body = { name: name, email: email, password: pw };
      // Choices made on the landing quick-start card are carried into the account.
      var qg = sessionStorage.getItem('lc_quick_gender');
      if (qg === 'man' || qg === 'woman') body.gender = qg;
      var qgoal = sessionStorage.getItem('loveconnect_goal');
      if (qgoal === 'serious' || qgoal === 'friendship' || qgoal === 'casual') body.goal = qgoal;
      api('/api/signup', { method: 'POST', body: body })
        .then(function (r) {
          sessionStorage.removeItem('lc_quick_gender');
          var ageTo = sessionStorage.getItem('lc_quick_age_to');
          sessionStorage.removeItem('lc_quick_age_to');
          // The quick-start age range becomes the saved discovery age preference.
          if (ageTo) {
            var max = ageTo === '50+' ? 70 : parseInt(ageTo, 10);
            if (max >= 18) api('/api/account/settings', { method: 'PUT', body: { settings: { ageRange: String(max) } } }).catch(function () {});
          }
          location.href = r.redirect || '/onboarding.html';
        }, fail);
    } else if (f.id === 'loginForm') {
      stop(e);
      api('/api/login', { method: 'POST', body: { email: f.querySelector('input[type=email]').value, password: f.querySelector('input[type=password]').value } })
        .then(function (r) { location.href = r.redirect || '/onboarding.html'; }, fail);
    } else if (f.id === 'accountSettingsForm') {
      stop(e);
      // Display name and the two visibility switches are real account settings; save them.
      var jobs = [];
      var dn = $('settingsDisplayName');
      if (dn && dn.value.trim() && dn.value.trim() !== me.name) {
        jobs.push(api('/api/account/profile', { method: 'PUT', body: { name: dn.value.trim() } }).then(function () {
          me.name = dn.value.trim();
          sessionStorage.setItem('loveconnect_profile_name', me.name);
          var label = $('navProfileName'); if (label) label.textContent = me.name;
          var photo = $('navProfilePhoto'); if (photo && !photo.style.backgroundImage) photo.textContent = me.name.charAt(0).toUpperCase();
        }));
      }
      var so = $('settingsShowOnline'), pv = $('settingsProfileVisible');
      if (so || pv) {
        var set = {};
        if (so) set.privacy5 = !!so.checked;   // Show when I'm online
        if (pv) set.privacy1 = !!pv.checked;   // Make my profile visible (discovery)
        jobs.push(api('/api/account/settings', { method: 'PUT', body: { settings: set } }).then(function () {
          me.settings = Object.assign({}, me.settings, set);
        }));
      }
      // settingsEmailAlerts stays inactive on purpose: no email service is connected yet.
      Promise.all(jobs).then(function () {
        toast('Settings saved to your account.');
        var modal = $('accountSettingsModal'); if (modal && window.bootstrap) bootstrap.Modal.getInstance(modal) && bootstrap.Modal.getInstance(modal).hide();
      }, fail);
    }
  }, true);
  on('click', '#logoutButton', function (e) {
    stop(e);
    api('/api/logout', { method: 'POST' }).then(function () { sessionStorage.clear(); location.href = 'index.html'; }, function () { location.href = 'index.html'; });
  });
  if (!me || page === 'onboarding') return;

  /* ---------- Likes, favorites, blocks, reports (everywhere except the Discover grid, which has its own handlers) ---------- */
  var pageMemberId = qs.get('id');
  function memberIdOf(el) {
    var h = el.closest('[data-member-id]');
    return (h && h.dataset.memberId) || (page === 'member' ? pageMemberId : null);
  }
  function inGrid(el) { return el.closest('#discoverGrid'); }
  on('click', '.like-btn, .like-back-btn', function (e, b) {
    if (inGrid(b)) return;
    var id = memberIdOf(b); if (!id) return; // sample cards keep their labelled demo behaviour
    stop(e);
    api('/api/members/' + id + '/like', { method: 'POST' }).then(function (r) {
      var big = b.closest('.member-profile-content');
      if (big) b.innerHTML = r.liked ? '<i class="bi bi-heart-fill me-1"></i>Liked' : '<i class="bi bi-heart me-1"></i>Like';
      else { b.textContent = r.liked ? 'Liked' : 'Like'; }
      b.classList.toggle('liked', r.liked);
      toast(r.match ? "It's a match! You can message each other now." : (r.liked ? 'Like sent.' : 'Like removed.'));
    }, fail);
  });
  on('click', '.favorite-btn', function (e, b) {
    if (inGrid(b)) return;
    var id = memberIdOf(b); if (!id) return; // sample cards keep their labelled demo behaviour
    stop(e);
    api('/api/members/' + id + '/favorite', { method: 'POST' }).then(function (r) {
      var big = b.closest('.member-profile-content');
      b.classList.toggle('active', r.favorite);
      b.innerHTML = big ? (r.favorite ? '<i class="bi bi-bookmark-fill me-1"></i>Saved' : '<i class="bi bi-bookmark me-1"></i>Save')
        : (r.favorite ? '<i class="bi bi-bookmark-fill"></i> Saved' : '<i class="bi bi-bookmark"></i> Favorite');
      toast(r.favorite ? 'Added to your favorites.' : 'Removed from your favorites.');
    }, fail);
  });
  on('click', '.block-btn', function (e) {
    var id = page === 'member' ? pageMemberId : (page === 'messages' ? (convo && convo.id) : qs.get('with'));
    if (!id) return;
    stop(e);
    if (!window.confirm('Block this member? They will no longer be able to see or contact you.')) return;
    api('/api/members/' + id + '/block', { method: 'POST' }).then(function () { toast('Member blocked.'); setTimeout(function () { location.href = 'discover.html'; }, 500); }, fail);
  });
  on('click', '.report-btn', function (e) {
    var id = page === 'member' ? pageMemberId : (page === 'messages' ? (convo && convo.id) : qs.get('with'));
    if (!id) return;
    stop(e);
    var reason = window.prompt('Tell us briefly what is wrong (optional):');
    if (reason === null) return;
    api('/api/members/' + id + '/report', { method: 'POST', body: { reason: reason } }).then(function () { toast('Thanks. Your report was sent to our team.'); }, fail);
  });
  on('click', '.unblock-btn, .unblock-local', function (e, b) {
    var id = memberIdOf(b); if (!id) return;
    stop(e);
    api('/api/members/' + id + '/block', { method: 'DELETE' }).then(function () {
      var row = b.closest('.like-entry, .blocked-user-row'); if (row) row.remove(); toast('Member unblocked.');
    }, fail);
  });

  // Prefill the quick account-settings modal with real account state each time it opens.
  document.addEventListener('show.bs.modal', function (e) {
    if (e.target && e.target.id === 'accountSettingsModal') {
      var dn = $('settingsDisplayName'); if (dn) dn.value = me.name || '';
      var so = $('settingsShowOnline'); if (so) so.checked = (me.settings || {}).privacy5 !== false;
      var pv = $('settingsProfileVisible'); if (pv) pv.checked = (me.settings || {}).privacy1 !== false;
    }
  }, true);

  // Keep the account language in sync when the menu language changes.
  on('click', '[data-language]', function (e, item) {
    var code = item.dataset.langCode || 'en';
    if (['en', 'ar', 'fr'].indexOf(code) < 0) return;
    api('/api/account/settings', { method: 'PUT', body: { language: code } }).then(function () { me.language = code; }, function () {});
  });

  /* ---------- Notifications (menu, modal, page) ---------- */
  var NI = { like: ['pink', 'bi-heart-fill'], match: ['purple', 'bi-heart-handshake'], message: ['blue', 'bi-chat-dots-fill'], favorite: ['pink', 'bi-bookmark-heart-fill'], view: ['blue', 'bi-eye-fill'], safety: ['green', 'bi-shield-check'], announcement: ['purple', 'bi-megaphone-fill'] };
  function notifItem(n, tag) {
    var i = NI[n.type] || NI.safety;
    return '<' + tag + ' class="notification-item' + (n.unread ? ' unread' : '') + '" data-notification="" data-nid="' + n.id + '" data-href="' + esc(n.href || 'notifications.html') + '"><span class="notification-icon ' + i[0] + '"><i class="bi ' + i[1] + '"></i></span><span class="notification-copy"><strong>' + esc(n.title) + '</strong>' + (n.body ? '<small>' + esc(n.body) + '</small>' : '') + '<time>' + esc(ago(n.at)) + '</time></span>' + (n.unread ? '<span class="unread-dot"></span>' : '') + '</' + tag + '>';
  }
  function setCount(c) {
    var badge = $('notificationCount');
    if (badge) { badge.textContent = c; badge.classList.toggle('d-none', c === 0); }
    document.querySelectorAll('.notification-dot').forEach(function (d) { d.classList.toggle('d-none', c === 0); });
  }
  function loadNotifications() {
    return api('/api/notifications').then(function (r) {
      var empty = '<div class="notification-item"><span class="notification-copy"><strong>No notifications yet</strong><small>Likes, matches and messages will show up here.</small></span></div>';
      var menu = document.querySelector('.notification-menu-items');
      if (menu) menu.innerHTML = r.notifications.slice(0, 5).map(function (n) { return notifItem(n, 'button'); }).join('') || empty;
      var modal = document.querySelector('#notificationModal .notification-panel');
      if (modal) {
        modal.innerHTML = r.notifications.slice(0, 5).map(function (n) { return notifItem(n, 'div'); }).join('') || empty;
        if (TEXT_FIXES) { var note = modal.parentElement.querySelector('p.small.text-muted'); if (note) note.remove(); }
      }
      var list = $('notificationList');
      if (list) list.innerHTML = r.notifications.map(function (n) { return notifItem(n, 'button'); }).join('') || empty;
      setCount(r.unread);
    });
  }
  on('click', '.notification-item[data-nid]', function (e, it) {
    stop(e);
    var go = function () { location.href = it.dataset.href || 'notifications.html'; };
    api('/api/notifications/' + it.dataset.nid + '/read', { method: 'POST' }).then(go, go);
  });
  on('click', '#markAllRead, [data-mark-all-read]', function (e) {
    e.preventDefault(); e.stopImmediatePropagation();
    api('/api/notifications/read-all', { method: 'POST' }).then(function () { return loadNotifications(); }).then(function () { toast('All notifications marked as read.'); }, fail);
  });
  loadNotifications().catch(function () {});
  setInterval(function () { if (document.hidden) return; loadNotifications().catch(function () {}); }, 30000);

  /* ---------- Page-specific wiring ---------- */
  // The preference switches at the bottom of notifications.html save to the account,
  // matching their counterparts in Settings > Notifications.
  function initNotificationPrefs() {
    var rows = document.querySelectorAll('.notification-settings .setting-row input[type="checkbox"]');
    if (!rows.length) return;
    var S = me.settings || {};
    var map = [
      ['notify2', 'notify5'], // Likes and matches
      ['notify1'],            // New messages
      ['notifySafety']        // Safety and account alerts
    ];
    rows.forEach(function (input, i) {
      var keys = map[i]; if (!keys) return;
      input.checked = keys.every(function (k) { return S[k] !== false; });
      input.addEventListener('change', function (e) {
        e.stopImmediatePropagation();
        var set = {}; keys.forEach(function (k) { set[k] = input.checked; });
        api('/api/account/settings', { method: 'PUT', body: { settings: set } }).then(function () {
          me.settings = Object.assign({}, me.settings, set);
          toast('Preference saved.');
          if (keys.indexOf('notifySafety') >= 0) loadNotifications().catch(function () {});
        }, function (err) { input.checked = !input.checked; fail(err); });
      }, true);
    });
  }

  /* ---------- Real photo gallery (Discover cards open the member's own photos) ---------- */
  var gallery = { photos: [], index: 0 };
  function paintGallery(title) {
    var img = $('galleryImage'); if (img && gallery.photos.length) { img.src = gallery.photos[gallery.index]; img.alt = (title || 'Member') + ' photo ' + (gallery.index + 1); }
    var counter = $('galleryCounter'); if (counter) counter.textContent = gallery.photos.length ? (gallery.index + 1) + ' / ' + gallery.photos.length : '';
    var prev = $('galleryPrev'), next = $('galleryNext');
    [prev, next].forEach(function (b) { if (b) b.classList.toggle('d-none', gallery.photos.length < 2); });
  }
  window.LCSetGallery = function (photos, title) {
    gallery.photos = (photos || []).filter(Boolean);
    gallery.index = 0;
    var t = $('photoGalleryTitle'); if (t) t.textContent = (title || 'Member') + ' · Photos';
    paintGallery(title);
  };
  on('click', '#galleryPrev', function (e) {
    if (!gallery.photos.length) return;
    stop(e);
    gallery.index = (gallery.index - 1 + gallery.photos.length) % gallery.photos.length;
    paintGallery();
  });
  on('click', '#galleryNext', function (e) {
    if (!gallery.photos.length) return;
    stop(e);
    gallery.index = (gallery.index + 1) % gallery.photos.length;
    paintGallery();
  });
  document.addEventListener('hidden.bs.modal', function (e) {
    if (e.target && e.target.id === 'photoGalleryModal') { gallery.photos = []; gallery.index = 0; }
  }, true);

  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function () {
    if (page === 'discover') {
      var lm = $('loadMoreProfiles');
      if (lm) lm.addEventListener('click', function (e) {
        e.stopImmediatePropagation();
        var next = document.querySelector('#discoverPagination li:last-child button');
        if (next && !next.disabled) next.click(); else toast("You've reached the end of the list.");
      }, true);
    }
    if (page === 'member') loadMember();
    if (page === 'notifications') initNotificationPrefs();
    if (['likes', 'favorites', 'profile-views', 'blocked'].indexOf(page) >= 0) loadActivity();
    if (page === 'messages' || page === 'chat') initMessages();
    if (page === 'my-profile') initMyProfile();
    if (page.indexOf('settings') === 0) initSettings();
    initUploads();
  });

  /* ---------- Member profile ---------- */
  function loadMember() {
    if (!pageMemberId) { return; } // no id: original static default profile is left exactly as designed
    api('/api/members/' + pageMemberId).then(function (r) {
      var m = r.member, root = $('memberProfile');
      var photo = root.querySelector('.member-profile-photo');
      photo.className = 'member-profile-photo';
      photo.style.backgroundImage = m.photo ? 'linear-gradient(0deg,#20152138,transparent 55%), url("' + m.photo + '")' : '';
      var tag = photo.querySelector('.profile-tag'); if (tag && m.verified !== true) tag.remove(); // verified state is shown only when a member is actually verified (no verification system yet)
      $('detailName').textContent = m.name + (m.age ? ', ' + m.age : '');
      var loc = root.querySelector('p.text-muted.mb-2'); if (loc) loc.innerHTML = '<i class="bi bi-geo-alt me-1"></i>' + esc(place(m));
      var meta = root.querySelector('p.mb-2:not(.text-muted)'); if (meta) meta.textContent = (m.gender === 'woman' ? 'Woman' : 'Man') + ' · Single';
      var st = root.querySelector('p.text-success'); if (st) { st.innerHTML = m.online ? '<i class="bi bi-circle-fill me-1"></i>Online now' : '<i class="bi bi-clock me-1"></i>Recently active'; st.classList.toggle('text-success', m.online); st.classList.toggle('text-muted', !m.online); }
      var like = root.querySelector('.like-btn'); like.dataset.name = m.name; like.classList.toggle('liked', m.liked);
      like.innerHTML = m.liked ? '<i class="bi bi-heart-fill me-1"></i>Liked' : '<i class="bi bi-heart me-1"></i>Like';
      root.querySelector('a[href^="chat.html"]').href = 'chat.html?person=' + encodeURIComponent(m.name) + '&with=' + m.id;
      var fav = root.querySelector('.favorite-btn'); fav.classList.toggle('active', m.favorite);
      fav.innerHTML = m.favorite ? '<i class="bi bi-bookmark-fill me-1"></i>Saved' : '<i class="bi bi-bookmark me-1"></i>Save';
      root.querySelectorAll('h3').forEach(function (h) {
        if (h.textContent.trim() === 'About me' && h.nextElementSibling) h.nextElementSibling.textContent = m.bio || 'This member has not written an introduction yet.';
      });
      var lf = root.querySelector('.looking-for.profile-looking');
      if (lf) { lf.querySelector('strong').textContent = GOAL[m.goal] || GOAL.serious; lf.querySelector('span').textContent = m.country || 'Worldwide'; }
      var ints = root.querySelector('.profile-interests');
      if (ints) ints.innerHTML = m.interests.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') || '<span>Not shared yet</span>';
      document.title = m.name + ' | LoveConnect';
    }, function () { toast('This profile is not available.'); setTimeout(function () { location.href = 'discover.html'; }, 1200); });
  }

  /* ---------- Likes / Favorites / Profile views / Blocked ---------- */
  var ACT = {
    likes: { received: ['liked-me', 'Liked you'], sent: ['my-likes', 'You liked '] },
    favorites: { 'favorited-me': ['favorited-me', 'Added you to favorites'], 'my-favorites': ['my-favorites', 'You saved '] },
    'profile-views': { 'viewed-me': ['viewed-me', 'Viewed your profile'], 'i-viewed': ['i-viewed', 'You viewed '] },
    blocked: { blocked: ['blocked', 'Blocked'] }
  };
  function entryHtml(list, x, text) {
    var m = x.member, name = esc(m.name);
    var right = '';
    if (list === 'received') right = m.liked ? '<span class="badge text-bg-light">Liked back</span>' : '<button class="btn btn-pink btn-sm rounded-pill like-btn" data-name="' + name + '">Like</button>';
    else if (list === 'sent') right = '<span class="badge text-bg-light">Sent</span>';
    if (list === 'blocked') right = '<button class="btn btn-outline-pink btn-sm rounded-pill unblock-btn" type="button">Unblock</button>';
    var actions = list === 'blocked' ? '' : '<div class="d-flex gap-2 mt-2"><a class="btn btn-light border btn-sm rounded-pill" href="member.html?id=' + m.id + '">Profile</a><a class="btn btn-light border btn-sm rounded-pill" href="chat.html?person=' + encodeURIComponent(m.name) + '&with=' + m.id + '">Message</a><button class="btn btn-light border btn-sm rounded-pill favorite-btn' + (m.favorite ? ' active' : '') + '"><i class="bi ' + (m.favorite ? 'bi-bookmark-fill' : 'bi-bookmark') + '"></i> ' + (m.favorite ? 'Saved' : 'Favorite') + '</button></div>';
    return '<div class="col-md-6 col-lg-4 like-entry" data-list="' + list + '" data-date="' + esc(x.at) + '" data-member-id="' + m.id + '"><div class="compact-person"><div class="mini-avatar"' + avatar(m) + '></div><div class="flex-grow-1"><h3>' + name + (m.age ? ', ' + m.age : '') + '</h3><p>' + esc(place(m)) + (place(m) ? ' · ' : '') + esc(GOAL[m.goal] || '') + '</p><small>' + esc(text) + (text.slice(-1) === ' ' ? name : '') + ' · ' + fmtDate(x.at) + '</small>' + actions + '</div>' + right + '</div></div>';
  }
  function loadActivity() {
    var lists = ACT[page], box = $('likesContent'); if (!box) return;
    var keys = Object.keys(lists), data = {};
    Promise.all(keys.map(function (k) { return api('/api/activity/' + lists[k][0]).then(function (r) { data[k] = r.entries; }); })).then(function () {
      box.innerHTML = '';
      keys.forEach(function (k) { data[k].forEach(function (x) { box.insertAdjacentHTML('beforeend', entryHtml(k, x, lists[k][1])); }); });
      var tabAttr = { likes: 'data-like-tab', favorites: 'data-favorite-tab', 'profile-views': 'data-views-tab' }[page];
      var current = keys[0];
      function show(tab) {
        current = tab;
        var n = 0;
        box.querySelectorAll('.like-entry').forEach(function (el) { var v = el.dataset.list === tab; el.classList.toggle('d-none', !v); if (v) n++; });
        document.querySelectorAll('[' + tabAttr + ']').forEach(function (b) { var on_ = b.getAttribute(tabAttr) === tab; b.classList.toggle('active', on_); b.setAttribute('aria-selected', on_); });
        var empty = $('lc-empty'); if (!empty) { box.insertAdjacentHTML('afterend', '<div class="empty-state d-none mt-4" id="lc-empty"><i class="bi bi-people"></i><h3>Nothing here yet</h3><p>When there is activity, it will appear on this page.</p></div>'); empty = $('lc-empty'); }
        empty.classList.toggle('d-none', n > 0);
        var le = $('likesEmpty'); if (le) le.classList.add('d-none');
      }
      if (tabAttr) {
        document.querySelectorAll('[' + tabAttr + ']').forEach(function (b) {
          var cnt = b.querySelector('.tab-count'); if (cnt) cnt.textContent = (data[b.getAttribute(tabAttr)] || []).length;
          b.addEventListener('click', function (e) { e.stopImmediatePropagation(); show(b.getAttribute(tabAttr)); }, true);
        });
        var hash = { '#liked-me': 'received', '#my-likes': 'sent' }[location.hash];
        show(hash || (document.querySelector('[' + tabAttr + '].active') || {}).getAttribute && document.querySelector('[' + tabAttr + '].active').getAttribute(tabAttr) || keys[0]);
      } else show(keys[0]);
      var sort = $('activitySort');
      if (sort) sort.addEventListener('change', function (e) {
        e.stopImmediatePropagation();
        var els = [].slice.call(box.querySelectorAll('.like-entry'));
        els.sort(function (a, b) { return e.target.value === 'oldest' ? a.dataset.date.localeCompare(b.dataset.date) : b.dataset.date.localeCompare(a.dataset.date); }).forEach(function (el) { box.appendChild(el); });
      }, true);
    }).catch(fail);
  }

  /* ---------- Messages / chat ---------- */
  var convo = null, convos = [], pollTimer = null;
  function bubble(m) { return '<div class="message ' + (m.mine ? 'sent' : 'received') + '">' + esc(m.body) + '<small>' + fmtTime(m.at).replace(/^Yesterday$/, 'Yesterday') + (m.mine && m.read ? ' · Read' : '') + '</small></div>'; }
  function renderThread(res) {
    var box = $('chatMessages'); if (!box) return;
    var html = '', last = '';
    res.messages.forEach(function (m) {
      var day = new Date(m.at).toDateString();
      if (day !== last) { last = day; html += '<div class="chat-date">' + (day === new Date().toDateString() ? 'Today' : fmtDate(m.at)) + '</div>'; }
      html += bubble(m);
    });
    if (!res.messages.length) html = '<div class="chat-date">Say hello</div>';
    var key = res.messages.map(function (m) { return m.id + (m.read ? 'r' : ''); }).join();
    if (box.dataset.key === key) return;
    box.dataset.key = key; box.innerHTML = html; box.scrollTop = box.scrollHeight;
  }
  function openConvo(m) {
    convo = m;
    var nm = $('chatPersonName'); if (nm) nm.textContent = m.name;
    var av = $('chatAvatar'); if (av) { av.className = 'mini-avatar'; av.style.backgroundImage = m.photo ? 'url("' + m.photo + '")' : ''; }
    var st = $('chatPersonStatus'); if (st) st.textContent = m.online ? 'Online now' : 'Recently active';
    document.querySelectorAll('.conversation-item').forEach(function (b) { b.classList.toggle('active', b.dataset.memberId === String(m.id)); });
    var box = $('chatMessages'); if (box) delete box.dataset.key;
    return api('/api/messages/' + m.id).then(function (r) { renderThread(r); convo = r.member; updateConvoMenu(r.member); loadConvos(true); }, fail);
  }
  function activeFolder() { var t = document.querySelector('[data-message-tab].active'); return t ? t.dataset.messageTab : 'inbox'; }
  function renderConvos() {
    var list = document.querySelector('.conversation-list'); if (!list) return;
    var head = list.querySelector('.conversation-heading');
    var unread = convos.reduce(function (n, c) { return n + c.unread; }, 0);
    var badge = head && head.querySelector('.badge'); if (badge) { badge.textContent = unread + ' new'; badge.classList.toggle('d-none', unread === 0); }
    list.querySelectorAll('.conversation-item').forEach(function (b) { b.remove(); });
    var trashView = activeFolder() === 'trash';
    convos.forEach(function (c) {
      var m = c.member;
      list.insertAdjacentHTML('beforeend', '<button class="conversation-item' + (convo && convo.id === m.id ? ' active' : '') + '" data-conversation="' + esc(m.name) + '" data-member-id="' + m.id + '" data-folder="' + (trashView ? 'trash' : (c.inbound ? 'inbox' : 'sent')) + '" data-favorite="' + (c.favorite ? 'yes' : 'no') + '"><span class="mini-avatar"' + avatar(m) + '></span><span class="conversation-summary"><strong>' + esc(m.name) + '</strong><small>' + esc(c.last) + '</small></span><time>' + esc(fmtTime(c.at)) + '</time></button>');
    });
    var f = activeFolder();
    list.querySelectorAll('.conversation-item').forEach(function (it) { it.classList.toggle('d-none', !(f === 'inbox' ? it.dataset.folder === 'inbox' : f === 'sent' ? it.dataset.folder === 'sent' : f === 'favorites' ? it.dataset.favorite === 'yes' : it.dataset.folder === 'trash')); });
  }
  function loadConvos(keepOpen) {
    return api('/api/conversations' + (activeFolder() === 'trash' ? '?trash=1' : '')).then(function (r) { convos = r.conversations; if (page === 'messages') renderConvos(); return r; });
  }
  function updateConvoMenu(m) {
    if (!m) return;
    var like = document.querySelector('.convo-like-btn'); if (like) like.textContent = m.liked ? 'Like sent ✓' : 'Like';
    var fav = document.querySelector('.convo-favorite-btn'); if (fav) fav.textContent = m.favorite ? 'In favorites ✓' : 'Add to favorites';
    var tr = document.querySelector('.convo-trash-btn'); if (tr) tr.textContent = m.trashed ? 'Restore conversation' : 'Move to trash';
  }
  on('click', '.convo-like-btn', function (e) {
    if (!convo) return;
    stop(e);
    api('/api/members/' + convo.id + '/like', { method: 'POST' }).then(function (r) {
      convo.liked = r.liked; updateConvoMenu(convo);
      toast(r.match ? "It's a match! You can message each other now." : (r.liked ? 'Like sent.' : 'Like removed.'));
    }, fail);
  });
  on('click', '.convo-favorite-btn', function (e) {
    if (!convo) return;
    stop(e);
    api('/api/members/' + convo.id + '/favorite', { method: 'POST' }).then(function (r) {
      convo.favorite = r.favorite; updateConvoMenu(convo);
      toast(r.favorite ? 'Added to your favorites.' : 'Removed from your favorites.');
    }, fail);
  });
  on('click', '.convo-trash-btn', function (e) {
    if (!convo) return;
    stop(e);
    var wasTrashed = !!convo.trashed;
    api('/api/conversations/' + convo.id + '/trash', { method: wasTrashed ? 'DELETE' : 'POST' }).then(function () {
      toast(wasTrashed ? 'Conversation restored.' : 'Conversation moved to trash.');
      convo = null;
      var nm = $('chatPersonName'); if (nm) nm.textContent = 'No conversation selected';
      var st = $('chatPersonStatus'); if (st) st.textContent = '';
      var box = $('chatMessages'); if (box) { box.innerHTML = ''; delete box.dataset.key; }
      var av = $('chatAvatar'); if (av) { av.className = 'mini-avatar'; av.style.backgroundImage = ''; }
      loadConvos();
    }, fail);
  });
  on('click', '[data-message-tab]', function (e, b) {
    var t = b.dataset.messageTab;
    api('/api/conversations' + (t === 'trash' ? '?trash=1' : '')).then(function (r) { convos = r.conversations; if (page === 'messages') renderConvos(); }, function () {});
  });
  function initMessages() {
    if (TEXT_FIXES) { var note = document.querySelector('.chat-demo-note'); if (note) note.remove(); }
    var want = qs.get('with');
    var form = $('messageForm');
    if (form) form.addEventListener('submit', function (e) {
      stop(e);
      var input = $('messageInput'), v = input.value.trim();
      if (!v || !convo) { if (!convo) toast('Pick a conversation first.'); return; }
      input.value = '';
      api('/api/messages/' + convo.id, { method: 'POST', body: { body: v } }).then(function () { return openConvo(convo); }, function (err) { input.value = v; fail(err); });
    }, true);
    on('click', '.conversation-item[data-member-id]', function (e, b) {
      stop(e);
      var c = convos.filter(function (x) { return String(x.member.id) === b.dataset.memberId; })[0];
      if (!c) return;
      if (window.matchMedia('(max-width: 767.98px)').matches) { location.href = 'chat.html?person=' + encodeURIComponent(c.member.name) + '&with=' + c.member.id; return; }
      openConvo(c.member);
    });
    loadConvos().then(function (r) {
      if (want) {
        return api('/api/messages/' + want).then(function (t) { renderThread(t); convo = t.member; document.querySelectorAll('.conversation-item').forEach(function (b) { b.classList.toggle('active', b.dataset.memberId === want); }); openConvo(t.member); });
      }
      if (page === 'messages' && convos.length) return openConvo(convos[0].member);
      if (page === 'messages') {
        $('chatPersonName').textContent = 'No conversations yet';
        $('chatPersonStatus').textContent = 'Message a member from Discover to start one';
        $('chatMessages').innerHTML = '';
        var av0 = $('chatAvatar'); if (av0) { av0.className = 'mini-avatar'; av0.style.backgroundImage = ''; }
      }
    }).catch(function () { var nm = $('chatPersonName'); if (nm) nm.textContent = 'Conversation unavailable'; });
    // Test-hosting build: refresh every 30 s, only while the tab is visible, plus once when it becomes visible again.
    function refreshChat() {
      if (document.hidden) return;
      loadConvos(); if (convo) api('/api/messages/' + convo.id).then(renderThread, function () {});
    }
    pollTimer = setInterval(refreshChat, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshChat(); });
  }

  /* ---------- Profile + settings ---------- */
  function saveProfile(p) { return api('/api/account/profile', { method: 'PUT', body: p }); }
  function goalKey(label) { for (var k in GOAL) if (GOAL[k] === label) return k; return 'serious'; }
  function initMyProfile() {
    var f = $('myProfileForm'); if (!f) return;
    var edit = $('editProfileToggle');
    if (edit) edit.addEventListener('click', function (e) {
      stop(e);
      f.querySelectorAll('.profile-editable').forEach(function (field) { field.disabled = false; });
      if ($('ownPhotoFiles')) $('ownPhotoFiles').disabled = false;
      if ($('saveProfileButton')) $('saveProfileButton').hidden = false;
      if ($('cancelProfileEdit')) $('cancelProfileEdit').hidden = false;
    }, true);
    f.addEventListener('submit', function (e) {
      stop(e);
      var g = function (k) { return (f.elements[k] && f.elements[k].value || '').trim(); };
      saveProfile({ name: g('name'), age: g('age') || null, city: g('city'), country: g('country'), bio: g('bio'), goal: goalKey(g('goal')), interests: g('interests') })
        .then(function () { toast('Profile saved.'); setTimeout(function () { location.reload(); }, 700); }, fail);
    }, true);
  }
  var LANG = { English: 'en', 'العربية': 'ar', 'Français': 'fr' }, LANG_R = { en: 'English', ar: 'العربية', fr: 'Français' };
  function collectSettings(panel) {
    var s = {};
    panel.querySelectorAll('input[id],select[id],textarea[id]').forEach(function (el) {
      if (/^(privacy|notify)\d$/.test(el.id)) s[el.id] = el.checked;
      else if (['lookingFor', 'ageRange', 'distanceRange', 'prefInterests'].indexOf(el.id) >= 0) s[el.id] = el.value;
    });
    var g = panel.querySelector('input[name="prefGender"]:checked'); if (g) s.prefGender = g.value;
    return s;
  }
  function initSettings() {
    var S = me.settings || {};
    // Prefill from the server instead of browser-local values.
    if ($('settingEmail')) $('settingEmail').value = me.email || '';
    if ($('settingPhone')) $('settingPhone').value = me.phone || '';
    if ($('settingLanguage')) $('settingLanguage').value = LANG_R[me.language] || 'English';
    if ($('settingPassword')) $('settingPassword').value = '';
    if ($('settingsName')) $('settingsName').textContent = me.name;
    Object.keys(S).forEach(function (k) {
      var el = $(k);
      if (el && el.type === 'checkbox') el.checked = !!S[k];
      else if (el && ['lookingFor', 'ageRange', 'distanceRange', 'prefInterests'].indexOf(k) >= 0) { el.value = S[k]; }
    });
    if (S.prefGender) { var r = document.querySelector('input[name="prefGender"][value="' + S.prefGender + '"]'); if (r) r.checked = true; }
    if ($('ageRange') && $('ageRangeValue')) $('ageRangeValue').textContent = $('ageRange').value;
    if ($('distanceRange') && $('distanceValue')) $('distanceValue').textContent = $('distanceRange').value;
    var af = $('settingsAccountForm');
    if (af) af.addEventListener('submit', function (e) {
      stop(e);
      var body = { email: $('settingEmail').value.trim() || undefined, phone: $('settingPhone').value.trim(), language: LANG[$('settingLanguage').value] || 'en' };
      if ($('settingPassword').value) { body.password = $('settingPassword').value; body.current_password = ($('settingCurrentPassword') && $('settingCurrentPassword').value) || ''; }
      api('/api/account/settings', { method: 'PUT', body: body }).then(function () { $('settingPassword').value = ''; if ($('settingCurrentPassword')) $('settingCurrentPassword').value = ''; toast('Account settings saved.'); }, fail);
    }, true);
    on('click', '[data-local-save]', function (e, b) {
      stop(e);
      api('/api/account/settings', { method: 'PUT', body: { settings: collectSettings(b.closest('.settings-panel')) } }).then(function () { toast('Settings saved.'); }, fail);
    });
    on('click', '#deleteAccountLink', function (e) {
      stop(e);
      if (!window.confirm('Delete your account permanently? This removes your profile, photos and messages and cannot be undone.')) return;
      var pw = window.prompt('Enter your password to confirm:'); if (!pw) return;
      api('/api/account', { method: 'DELETE', body: { password: pw } }).then(function () { sessionStorage.clear(); location.href = 'index.html'; }, fail);
    });
    if (page === 'settings-blocked') {
      api('/api/activity/blocked').then(function (r) {
        var list = document.querySelector('.blocked-user-list'); if (!list) return;
        list.innerHTML = r.entries.map(function (x) { return '<div class="blocked-user-row" data-member-id="' + x.member.id + '"><div class="blocked-avatar"' + avatar(x.member) + '></div><div class="flex-grow-1"><strong>' + esc(x.member.name) + '</strong><small>Blocked on ' + fmtDate(x.at) + '</small></div><button class="btn btn-outline-pink rounded-pill unblock-local" type="button">Unblock</button></div>'; }).join('') || '<p class="text-muted mb-0">You have not blocked anyone.</p>';
      }, fail);
    }
    if (page === 'settings-photos') {
      var grid = $('settingsPhotoGrid'), add = grid && grid.querySelector('.settings-photo-add');
      if (grid && me.photo_items.length) {
        var ph = grid.querySelector('.settings-photo-tile.main-photo'); if (ph) ph.remove();
        me.photo_items.forEach(function (p, i) {
          add.insertAdjacentHTML('beforebegin', '<div class="settings-photo-tile' + (i === 0 ? ' main-photo' : '') + '" data-photo-id="' + p.id + '"><img src="' + esc(p.url) + '" alt="Profile photo"><button class="photo-remove" type="button" aria-label="Remove photo">×</button></div>');
        });
      } else if (grid) { var ph2 = grid.querySelector('.settings-photo-tile.main-photo .photo-remove'); if (ph2) ph2.remove(); }
      if (TEXT_FIXES) { var note = document.querySelector('.settings-panel > p.small.text-muted'); if (note) note.textContent = 'Photos are saved to your account as soon as you add them.'; }
      on('click', '.settings-photo-tile[data-photo-id] .photo-remove', function (e, b) {
        stop(e);
        api('/api/account/photos/' + b.closest('.settings-photo-tile').dataset.photoId, { method: 'DELETE' }).then(function () { location.reload(); }, fail);
      });
      var sp = $('savePhotos'); if (sp) sp.addEventListener('click', function (e) { stop(e); toast('Photos saved.'); }, true);
    }
    if (page === 'settings-profile') initProfileQuestions();
  }

  var CORE = ['First Name', "I'm a", 'Birth month', 'Birth year', 'Country', 'Region', 'City', 'A little about yourself'];
  function initProfileQuestions() {
    var f = $('settingsProfileForm'); if (!f) return;
    var extra = (me.settings && me.settings.profileExtra) || {}, p = me.profile, MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    function el(n) { return [].slice.call(f.elements).filter(function (x) { return x.name === n; }); }
    // Blank unanswered choices instead of saving the template's sample answers as facts.
    f.querySelectorAll('select').forEach(function (select) {
      if (select.name === 'Birth year') {
        select.innerHTML = '';
        for (var year = new Date().getFullYear() - 18; year >= 1900; year--) {
          var option = document.createElement('option'); option.value = String(year); option.textContent = year; select.appendChild(option);
        }
      }
      var blank = document.createElement('option'); blank.value = ''; blank.textContent = 'Not shared'; select.prepend(blank); select.value = '';
    });
    // Replace the sample answers with this member's own.
    f.querySelectorAll('input.form-control, textarea').forEach(function (x) { x.value = ''; });
    el('First Name')[0].value = me.name;
    el("I'm a")[0].value = me.gender === 'woman' ? 'Female' : me.gender === 'man' ? 'Male' : '';
    function setSel(name, v) { var s = el(name)[0]; if (!s || !v) return; if (![].some.call(s.options, function (o) { return o.text === v; })) s.insertAdjacentHTML('beforeend', '<option>' + esc(v) + '</option>'); s.value = v; }
    setSel('Country', p.country); el('City')[0].value = p.city || ''; el('Region')[0].value = (extra.Region || '');
    el('A little about yourself')[0].value = p.bio || '';
    if (extra['Birth month']) el('Birth month')[0].value = extra['Birth month'];
    if (extra['Birth year']) el('Birth year')[0].value = extra['Birth year'];
    Object.keys(extra).forEach(function (n) {
      if (CORE.indexOf(n) >= 0) return;
      var els = el(n), v = extra[n];
      els.forEach(function (x) { if (x.type === 'checkbox' || x.type === 'radio') x.checked = Array.isArray(v) ? v.indexOf(x.value) >= 0 || v.indexOf(x.nextSibling && x.nextSibling.textContent && x.nextSibling.textContent.trim()) >= 0 : false; else x.value = v; });
    });
    f.addEventListener('submit', function (e) {
      stop(e);
      var ex = {};
      [].slice.call(f.elements).forEach(function (x) {
        if (!x.name || CORE.indexOf(x.name) >= 0 && x.name !== 'Region' && x.name !== 'Birth month' && x.name !== 'Birth year') return;
        if (x.type === 'checkbox') { (ex[x.name] = ex[x.name] || []); if (x.checked) ex[x.name].push(x.value || (x.nextSibling && x.nextSibling.textContent.trim())); }
        else if (x.type === 'radio') { if (x.checked) ex[x.name] = x.value; }
        else ex[x.name] = x.value === 'Please Select...' ? '' : x.value;
      });
      var year = Number(el('Birth year')[0].value), mon = MONTHS.indexOf(el('Birth month')[0].value), now = new Date();
      var age = year && mon >= 0 ? now.getFullYear() - year - (mon > now.getMonth() ? 1 : 0) : (p.age || null);
      if (age !== null && age < 18) { toast('You must be at least 18 years old.'); return; }
      var body = { name: el('First Name')[0].value.trim(), gender: el("I'm a")[0].value === 'Female' ? 'woman' : el("I'm a")[0].value === 'Male' ? 'man' : undefined, age: age, city: el('City')[0].value.trim(), country: el('Country')[0].value, region: el('Region')[0].value.trim(), bio: el('A little about yourself')[0].value.trim() };
      saveProfile(body).then(function () { return api('/api/account/settings', { method: 'PUT', body: { settings: { profileExtra: ex } } }); })
        .then(function () { toast('Profile saved.'); }, fail);
    }, true);
  }

  /* ---------- Photo uploads (all file inputs) ---------- */
  function initUploads() {
    ['ownPhotoFiles', 'accountPhotoUpload', 'profileMainPhoto', 'settingsPhotosUpload', 'settingsPhotosInput', 'profilePhotoFiles'].forEach(function (id) {
      document.addEventListener('change', function (e) {
        if (e.target.id !== id) return;
        e.stopImmediatePropagation();
        var files = [].slice.call(e.target.files).filter(function (f) { return /^image\//.test(f.type); });
        if (!files.length) return;
        var fd = new FormData(); files.slice(0, 9).forEach(function (f) { fd.append('photos[]', f); });
        toast('Uploading…');
        api('/api/account/photos', { method: 'POST', body: fd }).then(function () { location.reload(); }, fail);
      }, true);
    });
  }
})();
