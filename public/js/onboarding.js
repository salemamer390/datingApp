(function () {
  'use strict';
  var LC = window.LC || {}, me = LC.me;
  if (!me) return;
  var form = document.getElementById('onboardingForm'), step = 1, busy = false, photoUrl;
  var fields = Array.from(form.querySelectorAll('fieldset')), error = document.getElementById('onboardingError');
  var next = document.getElementById('setupContinue'), back = document.getElementById('setupBack');
  var profile = me.profile || {}, prefs = me.settings || {};
  ['name', 'age', 'country', 'city', 'bio', 'interests'].forEach(function (key) { form.elements[key].value = profile[key] || ''; });
  form.elements.gender.value = me.gender || '';
  var goals = { 'Serious relationship': 'serious', 'Friendship': 'friendship', 'Casual dating': 'casual' };
  // An existing explicit preference can be resumed. The model's default goal is not a new member's answer.
  form.elements.goal.value = prefs.prefGender ? goals[profile.goal] || '' : '';
  form.elements.prefGender.value = prefs.prefGender || '';
  function showError(message) { error.textContent = message; error.hidden = !message; if (message) error.scrollIntoView({ block: 'nearest' }); }
  function request(url, body) {
    var headers = { Accept: 'application/json', 'X-CSRF-TOKEN': LC.csrf };
    if (!(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    return fetch(url, { method: body instanceof FormData ? 'POST' : 'PUT', headers: headers, credentials: 'same-origin', body: body }).then(function (r) {
      if (r.status === 401) { location.href = '/index.html?loginRequired=1'; throw new Error('Please log in again.'); }
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) { throw new Error(r.status === 419 ? 'Your session expired. Reload this page and try again. Your saved answers are safe.' : Object.values(data.errors || {}).flat().join(' ') || data.message || 'Could not save. Please try again.'); }
        return data;
      });
    });
  }
  function show(n) {
    step = n; showError('');
    fields.forEach(function (field, i) { field.hidden = i + 1 !== step; field.disabled = field.hidden; });
    document.getElementById('onboardingProgress').textContent = 'Step ' + step + ' of 4: ' + ['About you', 'Your connection', 'Your interests', 'Your introduction'][step - 1];
    var bar = document.getElementById('onboardingBar'); bar.style.width = step * 25 + '%'; bar.parentElement.setAttribute('aria-valuenow', step);
    back.hidden = step === 1;
    next.textContent = step === 4 ? 'Finish and enter' : 'Save and continue';
  }
  var suggestions = ['Travel', 'Music', 'Books', 'Cooking', 'Movies', 'Fitness', 'Nature', 'Art', 'Gaming', 'Photography', 'Sports', 'Coffee'];
  function interests() { return form.elements.interests.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
  function syncChips() {
    var selected = interests().map(function (s) { return s.toLowerCase(); });
    document.querySelectorAll('[data-interest]').forEach(function (b) { var active = selected.includes(b.dataset.interest.toLowerCase()); b.classList.toggle('btn-pink', active); b.classList.toggle('btn-outline-pink', !active); b.setAttribute('aria-pressed', String(active)); });
  }
  suggestions.forEach(function (text) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-outline-pink rounded-pill btn-sm'; b.textContent = text; b.dataset.interest = text;
    b.addEventListener('click', function () {
      var items = interests(), index = items.findIndex(function (s) { return s.toLowerCase() === text.toLowerCase(); });
      if (index >= 0) items.splice(index, 1); else items.push(text);
      if (items.length > 12 || items.join(', ').length > 200) { showError('Choose up to 12 interests, within 200 characters.'); return; }
      form.elements.interests.value = items.join(', '); syncChips(); showError('');
    });
    document.getElementById('interestSuggestions').appendChild(b);
  });
  form.elements.interests.addEventListener('input', syncChips); syncChips();
  var photo = document.getElementById('setupPhoto');
  function clearPhoto() { if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = null; photo.value = ''; document.getElementById('setupPhotoPreview').hidden = true; }
  photo.addEventListener('change', function () {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    var file = photo.files[0];
    if (!file) { clearPhoto(); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { clearPhoto(); showError('Choose a JPG, PNG or WebP photo up to 5 MB.'); return; }
    photoUrl = URL.createObjectURL(file); document.getElementById('setupPhotoImage').src = photoUrl; document.getElementById('setupPhotoPreview').hidden = false; showError('');
  });
  document.getElementById('setupRemovePhoto').addEventListener('click', clearPhoto);
  back.addEventListener('click', function () { if (!busy) show(step - 1); });
  form.addEventListener('submit', async function (event) {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    busy = true; next.disabled = true; back.disabled = true; next.textContent = 'Saving...'; showError('');
    try {
      var body = {}, keys = [[], ['name', 'age', 'gender', 'country', 'city'], ['goal', 'prefGender'], ['interests'], ['bio']][step];
      keys.forEach(function (key) { body[key] = form.elements[key].value.trim(); });
      if (step === 4 && photo.files.length) {
        var fd = new FormData(); fd.append('photos[]', photo.files[0]); await request('/api/account/photos', fd);
        clearPhoto(); // A saved upload is not uploaded twice if completing the profile fails.
      }
      var result = await request('/api/onboarding/' + step, body);
      if (step === 4) { location.href = result.redirect || '/discover.html'; return; }
      show(step + 1);
    } catch (e) { showError(e.message || 'Could not save. Please try again.'); }
    finally { busy = false; next.disabled = false; back.disabled = false; next.textContent = step === 4 ? 'Finish and enter' : 'Save and continue'; }
  });
  document.getElementById('onboardingLogout').addEventListener('click', async function () {
    if (busy) return;
    try {
      var r = await fetch('/api/logout', { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': LC.csrf } });
      if (!r.ok) throw new Error('Could not log out. Reload and try again.');
      sessionStorage.clear(); location.href = '/index.html';
    } catch (e) { showError(e.message); }
  });
  var basicDone = profile.name && Number(profile.age) >= 18 && me.gender && profile.city && profile.country;
  show(!basicDone ? 1 : !prefs.prefGender ? 2 : !profile.interests ? 3 : 4);
})();
