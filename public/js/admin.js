/* LoveConnect admin dashboard.
 * Loaded only on admin.html (which the server sends to admins only).
 * Every number, row and action here is live data from /api/admin/*; there is no sample content.
 */
(function () {
  'use strict';
  var LC = window.LC || {};
  if (!LC.me) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function api(url, opt) {
    opt = opt || {};
    var headers = { 'Accept': 'application/json', 'X-CSRF-TOKEN': LC.csrf || '' };
    var body = opt.body;
    if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    return fetch(url, { method: opt.method || 'GET', headers: headers, body: body, credentials: 'same-origin' }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var m = j && (j.message || (j.errors && Object.values(j.errors)[0][0])); return Promise.reject({ status: r.status, message: m || 'Something went wrong. Please try again.' }); }
        return j;
      });
    });
  }
  function toast(msg) {
    var el = $('toastMessage'); if (el) el.textContent = msg;
    var t = $('siteToast'); if (t && window.bootstrap) bootstrap.Toast.getOrCreateInstance(t, { delay: 3500 }).show();
  }
  function fail(e) { toast((e && e.message) || 'Something went wrong. Please try again.'); }
  function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }
  function ago(iso) {
    if (!iso) return 'Never';
    var s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) { var m = Math.floor(s / 60); return m + (m === 1 ? ' minute ago' : ' minutes ago'); }
    if (s < 86400) { var h = Math.floor(s / 3600); return h + (h === 1 ? ' hour ago' : ' hours ago'); }
    return fmtDate(iso);
  }
  function avatarHtml(m, cls) {
    var style = m && m.photo ? ' style="background-image:url(\'' + esc(m.photo) + '\')"' : '';
    var initial = m && m.name ? esc(m.name.trim().charAt(0).toUpperCase()) : '?';
    return '<div class="' + cls + '"' + style + '>' + (m && m.photo ? '' : initial) + '</div>';
  }
  function statusBadge(status) {
    var map = { pending: 'text-bg-warning', resolved: 'text-bg-success', dismissed: 'text-bg-secondary' };
    return '<span class="badge ' + (map[status] || 'text-bg-light') + '">' + esc(status) + '</span>';
  }

  /* ---------- Section switching ---------- */
  var sections = ['overview', 'reports', 'members'];
  function showSection(name) {
    if (sections.indexOf(name) < 0) name = 'overview';
    document.querySelectorAll('#adminNav a').forEach(function (a) { a.classList.toggle('active', a.dataset.adminSection === name); });
    $('adminSectionOverview').classList.toggle('d-none', name !== 'overview');
    $('adminSectionReports').classList.toggle('d-none', name !== 'reports');
    $('adminSectionMembers').classList.toggle('d-none', name !== 'members');
    if (name === 'overview') loadOverview();
    if (name === 'reports') loadReports();
    if (name === 'members') loadMembers();
  }
  document.querySelectorAll('#adminNav a').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); location.hash = a.dataset.adminSection; });
  });
  window.addEventListener('hashchange', function () { showSection(location.hash.replace('#', '')); });

  /* ---------- Overview ---------- */
  function statCard(value, label, icon) {
    return '<div class="admin-stat"><div class="admin-stat-value">' + (icon ? '<i class="bi ' + icon + ' me-1"></i>' : '') + esc(value) + '</div><div class="admin-stat-label">' + esc(label) + '</div></div>';
  }
  function loadOverview() {
    api('/api/admin/overview').then(function (j) {
      var m = j.members, a = j.activity, r = j.reports;
      $('adminMemberStats').innerHTML =
        statCard(m.total, 'Real members', 'bi-people') +
        statCard(m.new_7d, 'Joined last 7 days', 'bi-person-plus') +
        statCard(m.new_30d, 'Joined last 30 days', 'bi-calendar-plus') +
        statCard(m.online_now, 'Online now', 'bi-circle-fill') +
        statCard(m.suspended, 'Suspended', 'bi-slash-circle') +
        statCard(m.demo, 'Demo members', 'bi-magic');
      $('adminActivityStats').innerHTML =
        statCard(a.messages, 'Messages sent', 'bi-chat-dots') +
        statCard(a.messages_7d, 'Messages last 7 days', 'bi-chat-left-text') +
        statCard(a.likes, 'Likes', 'bi-heart') +
        statCard(a.matches, 'Matches', 'bi-stars') +
        statCard(a.favorites, 'Favorites', 'bi-bookmark') +
        statCard(a.blocks, 'Blocks', 'bi-octagon') +
        statCard(a.profile_views, 'Profile views', 'bi-eye') +
        statCard(a.photos, 'Photos uploaded', 'bi-images');
      $('adminReportStats').innerHTML =
        statCard(r.pending, 'Pending reports', 'bi-flag') +
        statCard(r.resolved, 'Resolved', 'bi-check-circle') +
        statCard(r.dismissed, 'Dismissed', 'bi-x-circle') +
        statCard(r.total, 'Total reports', 'bi-collection');
      setPendingBadge(r.pending);
    }).catch(fail);
  }
  function setPendingBadge(n) {
    var b = $('adminPendingBadge');
    if (!b) return;
    b.textContent = n;
    b.classList.toggle('d-none', !n);
  }

  /* ---------- Reports ---------- */
  var reportsPage = 1;
  $('adminReportFilter').addEventListener('change', function () { reportsPage = 1; loadReports(); });
  $('adminReportsPrev').addEventListener('click', function () { if (reportsPage > 1) { reportsPage--; loadReports(); } });
  $('adminReportsNext').addEventListener('click', function () { reportsPage++; loadReports(); });

  function loadReports() {
    var status = $('adminReportFilter').value;
    api('/api/admin/reports?status=' + encodeURIComponent(status) + '&page=' + reportsPage).then(function (j) {
      setPendingBadge(j.counts.pending);
      reportsPage = j.page;
      var list = $('adminReportsList');
      $('adminReportsEmpty').classList.toggle('d-none', j.data.length > 0);
      list.innerHTML = j.data.map(reportRow).join('');
      var pager = $('adminReportsPager');
      pager.classList.toggle('d-none', j.pages < 2);
      $('adminReportsPageInfo').textContent = 'Page ' + j.page + ' of ' + Math.max(j.pages, 1) + ' · ' + j.total + ' total';
      $('adminReportsPrev').disabled = j.page <= 1;
      $('adminReportsNext').disabled = j.page >= j.pages;
    }).catch(fail);
  }
  function reportRow(r) {
    var t = r.target || {};
    var h = '<div class="admin-row" data-report-id="' + r.id + '">';
    h += avatarHtml(t, 'admin-avatar');
    h += '<div class="admin-row-main"><div class="d-flex align-items-center gap-2 flex-wrap"><strong>' + esc(t.name || 'Deleted member') + '</strong>' + statusBadge(r.status);
    if (t.suspended) h += '<span class="badge text-bg-danger">suspended</span>';
    if (t.is_demo) h += '<span class="badge text-bg-light">demo</span>';
    h += '</div>';
    if (t.email) h += '<div class="small text-muted">' + esc(t.email) + '</div>';
    h += '<div class="mt-1">' + (r.reason ? esc(r.reason) : '<span class="text-muted">No reason given</span>') + '</div>';
    h += '<div class="small text-muted mt-1">Reported by ' + esc(r.reporter ? r.reporter.name : 'Deleted member') + ' · ' + fmtDate(r.created_at);
    if (r.reviewer && r.reviewed_at) h += ' · ' + esc(r.status) + ' by ' + esc(r.reviewer) + ' · ' + fmtDate(r.reviewed_at);
    h += '</div>';
    h += '<div class="d-flex align-items-center gap-2 mt-2 flex-wrap"><input class="form-control form-control-sm admin-note-input" placeholder="Admin note (optional)" value="' + esc(r.admin_note || '') + '" maxlength="500">';
    if (r.status !== 'resolved') h += '<button class="btn btn-pink btn-sm rounded-pill" data-report-action="resolved">Mark resolved</button>';
    if (r.status !== 'dismissed') h += '<button class="btn btn-light border btn-sm rounded-pill" data-report-action="dismissed">Dismiss</button>';
    if (r.status !== 'pending') h += '<button class="btn btn-light border btn-sm rounded-pill" data-report-action="pending">Reopen</button>';
    if (t.id) {
      h += '<button class="btn btn-light border btn-sm rounded-pill" data-admin-view-member="' + t.id + '">View member</button>';
      if (!t.is_demo) h += t.suspended
        ? '<button class="btn btn-outline-secondary btn-sm rounded-pill" data-admin-unsuspend="' + t.id + '">Unsuspend</button>'
        : '<button class="btn btn-outline-danger btn-sm rounded-pill" data-admin-suspend="' + t.id + '">Suspend member</button>';
    }
    h += '</div></div></div>';
    return h;
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-report-action]');
    if (btn) {
      var row = btn.closest('[data-report-id]');
      var note = row.querySelector('.admin-note-input').value;
      btn.disabled = true;
      api('/api/admin/reports/' + row.dataset.reportId, { method: 'PUT', body: { status: btn.dataset.reportAction, admin_note: note } })
        .then(function () { toast('Report updated.'); loadReports(); })
        .catch(function (err) { btn.disabled = false; fail(err); });
      return;
    }
    var view = e.target.closest && e.target.closest('[data-admin-view-member]');
    if (view) { location.hash = 'members'; showSection('members'); openMember(view.dataset.adminViewMember); return; }
    var sus = e.target.closest && e.target.closest('[data-admin-suspend]');
    if (sus) { suspendMember(sus.dataset.adminSuspend, true); return; }
    var uns = e.target.closest && e.target.closest('[data-admin-unsuspend]');
    if (uns) { suspendMember(uns.dataset.adminUnsuspend, false); }
  });

  /* ---------- Members ---------- */
  var membersPage = 1, memberSearchTimer = null;
  $('adminMemberSearch').addEventListener('input', function () {
    clearTimeout(memberSearchTimer);
    memberSearchTimer = setTimeout(function () { membersPage = 1; loadMembers(); }, 350);
  });
  $('adminMemberTab').addEventListener('change', function () { membersPage = 1; loadMembers(); });
  $('adminMembersPrev').addEventListener('click', function () { if (membersPage > 1) { membersPage--; loadMembers(); } });
  $('adminMembersNext').addEventListener('click', function () { membersPage++; loadMembers(); });
  $('adminMemberBack').addEventListener('click', function () {
    $('adminMemberDetail').classList.add('d-none');
    $('adminMembersBrowser').classList.remove('d-none');
  });

  function loadMembers() {
    var q = $('adminMemberSearch').value.trim();
    var tab = $('adminMemberTab').value;
    api('/api/admin/members?q=' + encodeURIComponent(q) + '&tab=' + encodeURIComponent(tab) + '&page=' + membersPage).then(function (j) {
      membersPage = j.page;
      var list = $('adminMembersList');
      $('adminMembersEmpty').classList.toggle('d-none', j.data.length > 0);
      list.innerHTML = j.data.map(memberRow).join('');
      var pager = $('adminMembersPager');
      pager.classList.toggle('d-none', j.pages < 2);
      $('adminMembersPageInfo').textContent = 'Page ' + j.page + ' of ' + Math.max(j.pages, 1) + ' · ' + j.total + ' total';
      $('adminMembersPrev').disabled = j.page <= 1;
      $('adminMembersNext').disabled = j.page >= j.pages;
    }).catch(fail);
  }
  function memberRow(m) {
    var h = '<div class="admin-row" data-admin-member-row="' + m.id + '" style="cursor:pointer">';
    h += avatarHtml(m, 'admin-avatar');
    h += '<div class="admin-row-main"><div class="d-flex align-items-center gap-2 flex-wrap"><strong>' + esc(m.name) + '</strong>';
    if (m.is_admin) h += '<span class="badge text-bg-dark">admin</span>';
    if (m.suspended) h += '<span class="badge text-bg-danger">suspended</span>';
    if (m.is_demo) h += '<span class="badge text-bg-light">demo</span>';
    if (m.reports_pending) h += '<span class="badge text-bg-warning">' + m.reports_pending + ' pending report' + (m.reports_pending === 1 ? '' : 's') + '</span>';
    h += '</div><div class="small text-muted">' + esc(m.email) + '</div>';
    h += '<div class="small text-muted">' + esc([m.age ? m.age + ' y' : '', m.gender || '', [m.city, m.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')) + '</div>';
    h += '<div class="small text-muted">Joined ' + fmtDate(m.created_at) + ' · Last seen ' + ago(m.last_seen_at) + '</div>';
    h += '</div></div>';
    return h;
  }
  document.addEventListener('click', function (e) {
    var row = e.target.closest && e.target.closest('[data-admin-member-row]');
    if (row) openMember(row.dataset.adminMemberRow);
  });

  function openMember(id) {
    $('adminMembersBrowser').classList.add('d-none');
    var detail = $('adminMemberDetail');
    detail.classList.remove('d-none');
    var body = $('adminMemberDetailBody');
    body.innerHTML = '<p class="text-muted">Loading…</p>';
    api('/api/admin/members/' + id).then(function (j) {
      var m = j.member;
      var h = '<div class="d-flex align-items-center gap-3 flex-wrap">' + avatarHtml(m, 'settings-user-avatar') + '<div><h2 class="h4 mb-1">' + esc(m.name) + '</h2><div class="small text-muted">' + esc(m.email) + (m.phone ? ' · ' + esc(m.phone) : '') + '</div></div></div>';
      h += '<div class="admin-stats mt-3 mb-3">' +
        statCard(m.photos_count, 'Photos', 'bi-images') +
        statCard(m.reports_pending, 'Pending reports', 'bi-flag') +
        statCard(m.reports_total, 'Total reports', 'bi-collection') + '</div>';
      h += '<dl class="row small"><dt class="col-sm-3">Member ID</dt><dd class="col-sm-9">' + m.id + '</dd>' +
        '<dt class="col-sm-3">Age / gender</dt><dd class="col-sm-9">' + esc([m.age || '', m.gender || ''].filter(Boolean).join(' · ') || 'Not set') + '</dd>' +
        '<dt class="col-sm-3">Location</dt><dd class="col-sm-9">' + esc([m.city, m.country].filter(Boolean).join(', ') || 'Not set') + '</dd>' +
        '<dt class="col-sm-3">Looking for</dt><dd class="col-sm-9">' + esc(m.goal || 'Not set') + '</dd>' +
        '<dt class="col-sm-3">Interests</dt><dd class="col-sm-9">' + esc(m.interests || 'None') + '</dd>' +
        '<dt class="col-sm-3">Bio</dt><dd class="col-sm-9">' + esc(m.bio || 'None') + '</dd>' +
        '<dt class="col-sm-3">Joined</dt><dd class="col-sm-9">' + fmtDate(m.created_at) + '</dd>' +
        '<dt class="col-sm-3">Last seen</dt><dd class="col-sm-9">' + ago(m.last_seen_at) + '</dd>' +
        '<dt class="col-sm-3">Profile complete</dt><dd class="col-sm-9">' + (m.onboarding_complete ? 'Yes' : 'No') + '</dd></dl>';
      h += '<div class="d-flex gap-2 flex-wrap mb-3">';
      if (!m.is_admin && !m.is_demo) {
        h += m.suspended
          ? '<button class="btn btn-outline-secondary btn-sm rounded-pill" data-admin-unsuspend="' + m.id + '"><i class="bi bi-arrow-counterclockwise me-1"></i>Unsuspend account</button>'
          : '<button class="btn btn-outline-danger btn-sm rounded-pill" data-admin-suspend="' + m.id + '"><i class="bi bi-slash-circle me-1"></i>Suspend account</button>';
      }
      if (m.is_admin) h += '<span class="small text-muted">Admin accounts cannot be suspended.</span>';
      h += '</div>';
      if (j.reports.length) {
        h += '<h3 class="h6 mb-2">Recent reports about this member</h3>';
        h += j.reports.map(function (r) {
          return '<div class="admin-row"><div class="admin-row-main"><div class="d-flex align-items-center gap-2">' + statusBadge(r.status) + '<span class="small text-muted">' + fmtDate(r.created_at) + ' · by ' + esc(r.reporter || 'Deleted member') + '</span></div>' +
            '<div class="mt-1">' + (r.reason ? esc(r.reason) : '<span class="text-muted">No reason given</span>') + '</div>' +
            (r.admin_note ? '<div class="small text-muted mt-1">Note: ' + esc(r.admin_note) + (r.reviewer ? ' (' + esc(r.reviewer) + ')' : '') + '</div>' : '') + '</div></div>';
        }).join('');
      } else {
        h += '<p class="small text-muted">No reports about this member.</p>';
      }
      body.innerHTML = h;
    }).catch(function (e) { body.innerHTML = ''; fail(e); });
  }

  function suspendMember(id, on) {
    api('/api/admin/members/' + id + '/suspend', { method: on ? 'PUT' : 'DELETE' }).then(function () {
      toast(on ? 'Account suspended. The member can no longer log in.' : 'Account reactivated.');
      var hash = location.hash.replace('#', '');
      if (hash === 'reports') loadReports();
      else if (!$('adminMemberDetail').classList.contains('d-none')) openMember(id);
      else loadMembers();
    }).catch(fail);
  }

  /* ---------- Start ---------- */
  showSection(location.hash.replace('#', '') || 'overview');
})();
