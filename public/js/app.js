document.addEventListener("DOMContentLoaded", () => {
  // Persistent appearance controls shared by every page.
  // Theme / night mode / language are applied before first paint by js/theme-init.js (window.LCAppearance).
  const navActions = document.querySelector(".nav-actions");
  if (navActions && !document.getElementById("appearanceControls")) {
    const controls = document.createElement("div");
    controls.id = "appearanceControls";
    controls.className = "d-flex align-items-center gap-1 appearance-controls";
    controls.innerHTML = '<div class="dropdown"><button class="btn appearance-btn" type="button" data-bs-toggle="dropdown" aria-label="Choose color theme" title="Choose color theme"><i class="bi bi-palette2"></i><span class="appearance-label"> Theme</span></button><ul class="dropdown-menu dropdown-menu-end appearance-menu"><li><button class="dropdown-item" type="button" data-set-theme="classic"><i class="bi bi-heart-fill me-2"></i>Classic pink</button></li><li><button class="dropdown-item" type="button" data-set-theme="hinge"><i class="bi bi-circle-half me-2"></i>Black &amp; white</button></li></ul></div><button class="btn appearance-btn" id="nightModeToggle" type="button" aria-label="Toggle night mode" title="Toggle night mode"><i class="bi bi-moon-stars-fill"></i><span class="appearance-label"> Night</span></button>';
    const languageDropdown = navActions.querySelector(".dropdown");
    if (languageDropdown) languageDropdown.insertAdjacentElement("afterend", controls); else navActions.prepend(controls);
  }
  function refreshAppearanceButtons() {
    const night = document.documentElement.dataset.mode === "night";
    const theme = document.documentElement.dataset.theme || "classic";
    const button = document.getElementById("nightModeToggle");
    if (button) { button.innerHTML = night ? '<i class="bi bi-sun-fill"></i><span class="appearance-label"> Day</span>' : '<i class="bi bi-moon-stars-fill"></i><span class="appearance-label"> Night</span>'; button.title = night ? "Switch to day mode" : "Switch to night mode"; button.setAttribute("aria-pressed", String(night)); }
    document.querySelectorAll("[data-set-theme]").forEach(item => item.classList.toggle("active", item.dataset.setTheme === theme));
  }
  document.querySelectorAll("[data-set-theme]").forEach(button => button.addEventListener("click", () => { LCAppearance.setTheme(button.dataset.setTheme); }));
  document.getElementById("nightModeToggle")?.addEventListener("click", () => { LCAppearance.toggleMode(); });
  refreshAppearanceButtons();
  document.addEventListener("lc:appearance", refreshAppearanceButtons);
  const protectedPages = new Set(["discover.html", "member.html", "likes.html", "messages.html", "notifications.html", "chat.html", "settings.html", "settings-profile.html", "settings-photos.html", "settings-privacy.html", "settings-notifications.html", "settings-preferences.html", "settings-blocked.html", "my-profile.html", "view-profile.html", "favorites.html", "profile-views.html", "blocked.html"]);
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const signedIn = sessionStorage.getItem("loveconnect_signed_in") === "yes";
  if (protectedPages.has(currentPage) && !signedIn) {
    location.replace("index.html?loginRequired=1");
    return;
  }
  const navActionsEl = document.querySelector(".nav-actions");
  if (navActionsEl && !document.getElementById("profileDropdown")) {
    const profile = document.createElement("div");
    profile.className = "dropdown"; profile.id = "profileDropdown";
    profile.innerHTML = '<button class="nav-profile-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="User menu"><span class="nav-profile-photo" id="navProfilePhoto">U</span></button><div class="dropdown-menu dropdown-menu-end profile-menu"><div class="px-3 py-2 border-bottom mb-1"><strong id="navProfileName">My account</strong><div class="small text-muted">Manage your profile</div></div><a class="dropdown-item" href="settings-profile.html"><i class="bi bi-person-gear me-2"></i>Edit Profile</a><a class="dropdown-item" href="view-profile.html"><i class="bi bi-eye me-2"></i>View Profile</a><a class="dropdown-item" href="settings-photos.html"><i class="bi bi-images me-2"></i>Add Photos</a><a class="dropdown-item" href="settings.html"><i class="bi bi-gear me-2"></i>Settings</a><div class="dropdown-divider"></div><button class="dropdown-item text-danger" type="button" id="logoutButton"><i class="bi bi-box-arrow-right me-2"></i>Log Out</button></div>';
    navActionsEl.appendChild(profile);
  }
  const authButtons = document.querySelectorAll('[data-bs-target="#loginModal"], [data-bs-target="#signupModal"]');
  authButtons.forEach(button => button.classList.toggle("d-none", signedIn));
  document.querySelector(".lc-main-nav")?.classList.toggle("d-none", !signedIn);
  document.getElementById("profileDropdown")?.classList.toggle("d-none", !signedIn);
  if (signedIn) document.getElementById("notificationDropdown")?.classList.remove("d-none");
  const savedProfileName = sessionStorage.getItem("loveconnect_profile_name") || "My account";
  const navName = document.getElementById("navProfileName"); if (navName) navName.textContent = savedProfileName;
  const navPhoto = document.getElementById("navProfilePhoto"); if (navPhoto) { const savedPhoto = sessionStorage.getItem("loveconnect_profile_photo"); if (savedPhoto) { navPhoto.textContent = ""; navPhoto.style.backgroundImage = `url("${savedPhoto}")`; navPhoto.style.backgroundSize = "cover"; navPhoto.style.backgroundPosition = "center"; } else navPhoto.textContent = savedProfileName === "My account" ? "U" : savedProfileName.trim().charAt(0).toUpperCase(); }
  document.getElementById("accountSettingsForm")?.addEventListener("submit", event => { event.preventDefault(); const name = document.getElementById("settingsDisplayName")?.value.trim(); if (name) { sessionStorage.setItem("loveconnect_profile_name", name); const label = document.getElementById("navProfileName"); if (label) label.textContent = name; const photo = document.getElementById("navProfilePhoto"); if (photo) photo.textContent = name.charAt(0).toUpperCase(); } bootstrap.Modal.getInstance(document.getElementById("accountSettingsModal"))?.hide(); notify("Demo settings saved on this session."); });
  document.getElementById("logoutButton")?.addEventListener("click", () => { sessionStorage.removeItem("loveconnect_signed_in"); location.href = "index.html"; });
  document.getElementById("profilePhotoFiles")?.addEventListener("change", event => { const preview = document.getElementById("photoUploadPreview"); if (!preview) return; preview.innerHTML = ""; [...event.target.files].slice(0,8).forEach(file => { const image = document.createElement("img"); image.alt = "Photo preview"; image.src = URL.createObjectURL(file); image.style.cssText = "width:72px;height:72px;object-fit:cover;border-radius:12px"; preview.appendChild(image); }); });
  if (new URLSearchParams(location.search).get("loginRequired") === "1") {
    const loginModal = document.getElementById("loginModal");
    if (loginModal) bootstrap.Modal.getOrCreateInstance(loginModal).show();
  }

  const toastEl = document.getElementById("siteToast");
  const toastMessage = document.getElementById("toastMessage");
  const toast = toastEl ? bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 }) : null;

  function notify(message) {
    if (toastMessage) toastMessage.textContent = message;
    toast?.show();
  }

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  document.querySelectorAll(".choice-btn").forEach(button => {
    button.addEventListener("click", () => {
      const group = button.dataset.group;
      document.querySelectorAll(`.choice-btn[data-group="${group}"]`).forEach(item => {
        item.classList.remove("selected");
      });
      button.classList.add("selected");
    });
  });

  document.getElementById("quickSignupForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const ageFrom = Number(document.getElementById("ageFrom").value);
    const ageToText = document.getElementById("ageTo").value;
    const ageTo = ageToText === "50+" ? 50 : Number(ageToText);
    if (ageFrom > ageTo) {
      notify("Please choose an age range that makes sense.");
      return;
    }
    const goal = document.querySelector('.choice-btn[data-group="goal"].selected')?.dataset.value || "serious";
    sessionStorage.setItem("loveconnect_goal", goal);
    const modalEl = document.getElementById("signupModal");
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  });

  document.querySelectorAll(".like-btn").forEach(button => {
    button.addEventListener("click", () => {
      const liked = button.classList.toggle("liked");
      button.innerHTML = liked
        ? '<i class="bi bi-heart-fill me-1"></i> Liked'
        : '<i class="bi bi-heart me-1"></i> Like profile';
      notify(liked ? `You liked ${button.dataset.name}'s sample profile.` : `Like removed from ${button.dataset.name}'s sample profile.`);
    });
  });

  document.getElementById("signupModalForm")?.addEventListener("submit", event => {
    event.preventDefault();
    // Front-end demo session only; production authentication must be handled by a backend.
    sessionStorage.setItem("loveconnect_signed_in", "yes");
    sessionStorage.setItem("loveconnect_profile_name", document.getElementById("signupName")?.value.trim() || "My account");
    notify("Demo account session started.");
    const modal = document.getElementById("signupModal");
    if (modal) bootstrap.Modal.getInstance(modal)?.hide();
    event.target.reset();
    setTimeout(() => location.href = "discover.html", 250);
  });

  document.getElementById("loginForm")?.addEventListener("submit", event => {
    event.preventDefault();
    // Front-end demo session only; this does not verify credentials against a server.
    sessionStorage.setItem("loveconnect_signed_in", "yes");
    sessionStorage.setItem("loveconnect_profile_name", document.getElementById("loginEmail")?.value.split("@")[0] || "My account");
    notify("Demo login successful.");
    const modal = document.getElementById("loginModal");
    if (modal) bootstrap.Modal.getInstance(modal)?.hide();
    event.target.reset();
    setTimeout(() => location.href = "discover.html", 250);
  });

  // Language: persisted, sets <html lang>/<html dir> and swaps Bootstrap to its RTL build for Arabic.
  const showLanguage = code => {
    const item = document.querySelector(`[data-language][data-lang-code="${code}"]`);
    const label = document.querySelector(".btn-language");
    if (item && label) label.innerHTML = `<i class="bi bi-globe2 me-1"></i> ${item.dataset.language}`;
  };
  showLanguage(document.documentElement.lang || "en");
  document.querySelectorAll("[data-language]").forEach(item => {
    item.addEventListener("click", event => {
      event.preventDefault();
      const code = item.dataset.langCode || "en";
      LCAppearance.setLanguage(code);
      showLanguage(code);
      notify(`Language selected: ${item.dataset.language}.`);
    });
  });

  document.querySelectorAll('.nav-links .nav-link').forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-links .nav-link").forEach(item => item.classList.remove("active"));
      link.classList.add("active");
    });
  });

  // Discover quick tabs: there is deliberately no name-search feature.
  const discoverMembers = [...document.querySelectorAll(".discover-member")];
  function updateDiscover(predicate) {
    let visible = 0;
    discoverMembers.forEach(card => {
      const show = predicate(card);
      card.classList.toggle("d-none", !show);
      if (show) visible++;
    });
    document.getElementById("discoverEmpty")?.classList.toggle("d-none", visible > 0);
    const count = document.getElementById("filterResultCount");
    if (count) count.textContent = `${visible} sample profile${visible === 1 ? "" : "s"}`;
  }
  document.querySelectorAll("[data-discover-tab]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-discover-tab]").forEach(item => {
        item.classList.remove("active", "btn-pink");
        item.classList.add("btn-outline-pink");
      });
      button.classList.add("active", "btn-pink");
      button.classList.remove("btn-outline-pink");
      const tab = button.dataset.discoverTab;
      updateDiscover(card => tab === "all" || (tab === "online" && card.dataset.online === "yes") || (tab === "new" && card.dataset.new === "yes") || card.dataset.goal === tab);
    });
  });

  const filtersForm = document.getElementById("filtersForm");
  filtersForm?.addEventListener("submit", event => {
    event.preventDefault();
    const min = Number(document.getElementById("filterAgeMin").value);
    const maxText = document.getElementById("filterAgeMax").value;
    const max = maxText === "50+" ? 100 : Number(maxText);
    if (min > max) { notify("Please choose a valid age range."); return; }
    const country = document.getElementById("filterCountry").value;
    const gender = document.getElementById("filterGender").value;
    const goal = document.getElementById("filterGoal").value;
    const activity = document.getElementById("filterActivity").value;
    const city = document.getElementById("filterCity").value.toLowerCase();
    const interest = document.getElementById("filterInterests").value.toLowerCase();
    updateDiscover(card => {
      const age = Number(card.dataset.age);
      const cardCity = card.querySelector(".profile-info > p")?.textContent.toLowerCase() || "";
      const text = card.querySelector(".interest-list")?.textContent.toLowerCase() || "";
      return age >= min && age <= max && (country === "all" || card.dataset.country === country) &&
        (gender === "all" || card.dataset.gender === gender) && (goal === "all" || card.dataset.goal === goal) &&
        (activity === "all" || card.dataset[activity] === "yes") &&
        (city === "all" || cardCity.includes(city)) && (interest === "all" || text.includes(interest));
    });
    document.getElementById("discoverMembers")?.scrollIntoView({ behavior: "smooth" });
    notify("Filters applied to the sample profiles.");
  });
  filtersForm?.addEventListener("reset", () => setTimeout(() => {
    updateDiscover(() => true);
    document.querySelectorAll("[data-discover-tab]").forEach(item => item.classList.remove("active"));
    document.querySelector('[data-discover-tab="all"]')?.classList.add("active");
  }, 0));

  document.querySelectorAll(".profile-open").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const name = button.dataset.profile || "Member";
    location.href = `member.html?name=${encodeURIComponent(name)}`;
  }));

  // A card opens the member profile, except when an interactive control is clicked.
  document.querySelectorAll(".discover-member .profile-card").forEach(card => {
    card.addEventListener("click", event => {
      if (event.target.closest("button, a, .photo-open")) return;
      const name = card.querySelector(".profile-info h3")?.textContent.split(",")[0].trim() || "Member";
      location.href = `member.html?name=${encodeURIComponent(name)}`;
    });
  });
  document.querySelectorAll(".message-member").forEach(link => { if (!link.closest(".discover-member")) link.addEventListener("click", event => event.stopPropagation()); });

  // Photo gallery: sample gallery images per profile, with previous/next navigation.
  const galleries = {
    Sophia: ["https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1400&q=90", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=90", "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=90"],
    Daniel: ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1400&q=90", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1400&q=90", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1400&q=90"],
    Emma: ["https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=90", "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=90", "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1400&q=90"],
    Alex: ["https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1400&q=90", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1400&q=90", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1400&q=90"]
  };
  let galleryPerson = "Sophia", galleryIndex = 0;
  const galleryModalEl = document.getElementById("photoGalleryModal");
  function showGalleryImage() {
    const photos = galleries[galleryPerson] || galleries.Sophia;
    const img = document.getElementById("galleryImage");
    if (img) { img.src = photos[galleryIndex]; img.alt = `${galleryPerson} photo ${galleryIndex + 1}`; }
    const title = document.getElementById("photoGalleryTitle"); if (title) title.textContent = `${galleryPerson} · Photos`;
    const counter = document.getElementById("galleryCounter"); if (counter) counter.textContent = `${galleryIndex + 1} / ${photos.length}`;
  }
  document.querySelectorAll(".photo-open").forEach(photo => {
    const open = () => { galleryPerson = photo.dataset.photoPerson || "Sophia"; galleryIndex = 0; showGalleryImage(); if (galleryModalEl) bootstrap.Modal.getOrCreateInstance(galleryModalEl).show(); };
    photo.addEventListener("click", event => { event.stopPropagation(); open(); });
    photo.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
  });
  document.getElementById("galleryPrev")?.addEventListener("click", () => { const photos = galleries[galleryPerson] || galleries.Sophia; galleryIndex = (galleryIndex - 1 + photos.length) % photos.length; showGalleryImage(); });
  document.getElementById("galleryNext")?.addEventListener("click", () => { const photos = galleries[galleryPerson] || galleries.Sophia; galleryIndex = (galleryIndex + 1) % photos.length; showGalleryImage(); });
  document.querySelectorAll(".like-back-btn").forEach(button => button.addEventListener("click", () => {
    button.classList.remove("btn-pink"); button.classList.add("btn-light", "border");
    button.textContent = "Liked back"; button.disabled = true;
    notify("Sample mutual like created. A real match requires backend storage.");
  }));

  const sampleChats = {
    Daniel: ['<div class="chat-date">Today</div><div class="message received">Hey! I noticed we both love hiking.<small>10:38</small></div><div class="message sent">That’s my favorite weekend plan 😊<small>10:40 · Read</small></div><div class="message received">That sounds like a great plan!<small>10:42</small></div>'],
    Sophia: ['<div class="chat-date">Yesterday</div><div class="message received">Hey, how was your weekend?<small>Yesterday</small></div><div class="message sent">Really nice, I explored a new café.<small>Yesterday · Read</small></div>'],
    Emma: ['<div class="chat-date">Monday</div><div class="message received">Thanks for the recommendation.<small>Monday</small></div>']
  };
  document.querySelectorAll("[data-conversation]").forEach(button => button.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 767.98px)").matches) {
      location.href = `chat.html?person=${encodeURIComponent(button.dataset.conversation)}`;
      return;
    }
    document.querySelectorAll("[data-conversation]").forEach(item => item.classList.toggle("active", item === button));
    const name = button.dataset.conversation;
    document.getElementById("chatPersonName").textContent = name;
    document.getElementById("chatPersonStatus").textContent = "Sample conversation · Demo status";
    document.getElementById("chatMessages").innerHTML = sampleChats[name][0];
    document.getElementById("chatAvatar").className = `mini-avatar ${name === "Sophia" ? "photo-one" : name === "Emma" ? "photo-three" : "photo-two"}`;
  }));
  document.getElementById("messageForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const input = document.getElementById("messageInput");
    const value = input.value.trim();
    if (!value) return;
    const bubble = document.createElement("div");
    bubble.className = "message sent";
    bubble.textContent = value;
    const time = document.createElement("small"); time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    bubble.appendChild(time);
    document.getElementById("chatMessages").appendChild(bubble);
    input.value = "";
    document.getElementById("chatMessages").scrollTop = document.getElementById("chatMessages").scrollHeight;
    notify("Demo message added locally. It was not sent to another member.");
  });

  function updateNotificationCount() {
    const count = document.querySelectorAll(".notification-menu-items .notification-item.unread").length;
    const badge = document.getElementById("notificationCount");
    if (badge) { badge.textContent = count; badge.classList.toggle("d-none", count === 0); }
    document.querySelectorAll(".notification-dot").forEach(dot => dot.classList.toggle("d-none", count === 0));
  }
  document.querySelectorAll(".notification-menu-items [data-notification]").forEach(item => item.addEventListener("click", () => {
    item.classList.remove("unread"); item.querySelector(".unread-dot")?.remove(); updateNotificationCount();
    const href = item.dataset.href || "notifications.html"; location.href = href;
  }));
  document.getElementById("notificationBell")?.addEventListener("click", event => {
    if (window.matchMedia("(max-width: 767.98px)").matches) {
      event.preventDefault(); event.stopPropagation();
      const modal = document.getElementById("notificationModal");
      if (modal) bootstrap.Modal.getOrCreateInstance(modal).show();
    } else {
      bootstrap.Dropdown.getOrCreateInstance(event.currentTarget).toggle();
    }
  });
  document.getElementById("markAllRead")?.addEventListener("click", event => {
    event.preventDefault(); event.stopPropagation();
    document.querySelectorAll(".notification-menu-items .notification-item").forEach(item => { item.classList.remove("unread"); item.querySelector(".unread-dot")?.remove(); });
    document.querySelectorAll("#notificationModal .notification-item").forEach(item => { item.classList.remove("unread"); item.querySelector(".unread-dot")?.remove(); });
    updateNotificationCount(); notify("All notifications marked as read.");
  });
  document.querySelectorAll("[data-mark-all-read]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("#notificationModal .notification-item").forEach(item => { item.classList.remove("unread"); item.querySelector(".unread-dot")?.remove(); });
    document.querySelectorAll(".notification-menu-items .notification-item").forEach(item => { item.classList.remove("unread"); item.querySelector(".unread-dot")?.remove(); });
    updateNotificationCount(); notify("All notifications marked as read.");
  }));
  document.querySelectorAll("#notificationModal .notification-item").forEach((item, index) => item.addEventListener("click", () => {
    const links = ["likes.html", "chat.html?person=Daniel", "likes.html"];
    item.classList.remove("unread"); item.querySelector(".unread-dot")?.remove(); updateNotificationCount();
    location.href = links[index] || "notifications.html";
  }));
  document.getElementById("filtersForm")?.addEventListener("submit", () => {
    const modal = document.getElementById("filterModal");
    if (modal) bootstrap.Modal.getInstance(modal)?.hide();
  });
  // Activity tabs and message folders are client-side demo views.
  function activateActivityTab(tab) {
    document.querySelectorAll("[data-like-tab]").forEach(button => button.classList.toggle("active", button.dataset.likeTab === tab));
    let count = 0;
    document.querySelectorAll(".like-entry").forEach(entry => { const visible = entry.dataset.list === tab; entry.classList.toggle("d-none", !visible); if (visible) count++; });
    document.getElementById("likesEmpty")?.classList.toggle("d-none", count > 0);
  }
  document.querySelectorAll("[data-like-tab]").forEach(button => button.addEventListener("click", () => { activateActivityTab(button.dataset.likeTab); const hash = button.dataset.hash; if (hash) history.replaceState(null, "", `#${hash}`); }));
  if (document.getElementById("likesContent")) {
    const tabByHash = {"#liked-me":"received", "#my-likes":"sent", "#favorites":"favorited-me", "#my-favorites":"my-favorites", "#profile-views":"viewed-me", "#blocked":"blocked"};
    activateActivityTab(tabByHash[location.hash] || "received");
  }
  document.getElementById("activitySort")?.addEventListener("change", event => {
    const container = document.getElementById("likesContent"); if (!container) return;
    [...container.querySelectorAll(".like-entry")].sort((a,b) => event.target.value === "oldest" ? a.dataset.date.localeCompare(b.dataset.date) : b.dataset.date.localeCompare(a.dataset.date)).forEach(el => container.appendChild(el));
  });
  document.querySelectorAll("[data-message-tab]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-message-tab]").forEach(item => item.classList.toggle("active", item === button));
    document.querySelectorAll(".conversation-item").forEach(item => { const folder = button.dataset.messageTab; item.classList.toggle("d-none", !(folder === "inbox" ? item.dataset.folder === "inbox" : folder === "sent" ? item.dataset.folder === "sent" : folder === "favorites" ? item.dataset.favorite === "yes" : item.dataset.folder === "trash")); });
  }));
  document.querySelectorAll(".unblock-btn").forEach(button => button.addEventListener("click", () => { button.closest(".like-entry")?.remove(); notify("Member removed from the demo blocked list."); }));
  document.querySelectorAll(".favorite-btn").forEach(button => button.addEventListener("click", () => { const saved = button.classList.toggle("active"); button.innerHTML = saved ? '<i class="bi bi-bookmark-fill"></i> Saved' : '<i class="bi bi-bookmark"></i> Favorite'; notify(saved ? "Added to your demo favorites." : "Removed from your demo favorites."); }));
  document.querySelectorAll(".report-btn").forEach(button => button.addEventListener("click", () => notify("Report form preview: connect moderation tools before launch.")));
  document.querySelectorAll(".block-btn").forEach(button => button.addEventListener("click", () => notify("Block action preview: real blocking must be saved securely on the backend.")));
  document.getElementById("loadMoreProfiles")?.addEventListener("click", () => notify("You’ve reached the end of the sample profiles."));
});


document.addEventListener("DOMContentLoaded", () => {
  if ((location.pathname.split("/").pop() || "") !== "chat.html") return;
  const person = new URLSearchParams(location.search).get("person") || "Daniel";
  const nameEl = document.getElementById("chatPersonName");
  const avatar = document.getElementById("chatAvatar");
  if (nameEl) nameEl.textContent = person;
  if (avatar) avatar.className = `mini-avatar ${person === "Sophia" ? "photo-one" : person === "Emma" ? "photo-three" : "photo-two"}`;
  const messages = {
    Daniel: '<div class="chat-date">Today</div><div class="message received">Hey! I noticed we both love hiking.<small>10:38</small></div><div class="message sent">That’s my favorite weekend plan 😊<small>10:40 · Read</small></div><div class="message received">That sounds like a great plan!<small>10:42</small></div>',
    Sophia: '<div class="chat-date">Yesterday</div><div class="message received">Hey, how was your weekend?<small>Yesterday</small></div><div class="message sent">Really nice, I explored a new café.<small>Yesterday · Read</small></div>',
    Emma: '<div class="chat-date">Monday</div><div class="message received">Thanks for the recommendation.<small>Monday</small></div>'
  };
  const box = document.getElementById("chatMessages"); if (box && messages[person]) box.innerHTML = messages[person];
});


document.addEventListener("DOMContentLoaded", () => {
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const notifyLocal = message => { const el=document.getElementById("toastMessage"); if(el) el.textContent=message; const toast=document.getElementById("siteToast"); if(toast && window.bootstrap) bootstrap.Toast.getOrCreateInstance(toast,{delay:3000}).show(); };
  const readProfile = () => { try { return JSON.parse(sessionStorage.getItem("loveconnect_profile") || "{}"); } catch { return {}; } };
  const saveProfile = data => sessionStorage.setItem("loveconnect_profile", JSON.stringify(data));
  const profile = readProfile();
  const profileForm = document.getElementById("myProfileForm");
  if (profileForm) {
    ["name","age","city","country","bio","goal","interests"].forEach(key => { const el = profileForm.elements[key]; if (el && profile[key]) el.value = profile[key]; });
    const photo = sessionStorage.getItem("loveconnect_profile_photo");
    const cover = document.getElementById("ownProfilePhoto"); const initial = document.getElementById("ownProfileInitial");
    if (photo && cover) { cover.style.backgroundImage = `url("${photo}")`; if (initial) initial.hidden = true; }
    const grid = document.getElementById("ownPhotoGrid"); try { (JSON.parse(sessionStorage.getItem("loveconnect_profile_photos")||"[]")).forEach(src=>{const img=document.createElement("img");img.src=src;img.alt="Your profile photo";grid?.appendChild(img);}); } catch {}
    const editBtn=document.getElementById("editProfileToggle"), cancelBtn=document.getElementById("cancelProfileEdit"), saveBtn=document.getElementById("saveProfileButton"), files=document.getElementById("ownPhotoFiles");
    const toggleEdit=enabled=>{profileForm.querySelectorAll(".profile-editable").forEach(el=>el.disabled=!enabled);if(files)files.disabled=!enabled;if(saveBtn)saveBtn.hidden=!enabled;if(cancelBtn)cancelBtn.hidden=!enabled;};
    editBtn?.addEventListener("click",()=>{location.href="settings.html";});
    cancelBtn?.addEventListener("click",()=>{location.reload();});
    profileForm.addEventListener("submit",e=>{e.preventDefault();const data={};["name","age","city","country","bio","goal","interests"].forEach(k=>data[k]=profileForm.elements[k]?.value.trim()||"");saveProfile(data);if(data.name)sessionStorage.setItem("loveconnect_profile_name",data.name);if(initial)initial.textContent=(data.name||"U").charAt(0).toUpperCase();toggleEdit(false);notifyLocal("Profile changes saved in this browser session.");});
    files?.addEventListener("change",async e=>{const list=JSON.parse(sessionStorage.getItem("loveconnect_profile_photos")||"[]");for(const file of [...e.target.files].slice(0,8)){if(!file.type.startsWith("image/"))continue;const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});list.push(data);}sessionStorage.setItem("loveconnect_profile_photos",JSON.stringify(list.slice(-8)));if(grid){grid.innerHTML="";list.slice(-8).forEach(src=>{const img=document.createElement("img");img.src=src;img.alt="Your profile photo";grid.appendChild(img);});}if(list.length){sessionStorage.setItem("loveconnect_profile_photo",list[list.length-1]);if(cover)cover.style.backgroundImage=`url("${list[list.length-1]}")`;if(initial)initial.hidden=true;const nav=document.getElementById("navProfilePhoto");if(nav){nav.textContent="";nav.style.backgroundImage=`url("${list[list.length-1]}")`;nav.style.backgroundSize="cover";}}});
  }
  const view = document.getElementById("publicName");
  if(view){const d=readProfile();view.textContent=d.name||sessionStorage.getItem("loveconnect_profile_name")||"Your name";document.getElementById("publicLocation").textContent=[d.city,d.country].filter(Boolean).join(", ")||"Add your city and country";document.getElementById("publicBio").textContent=d.bio||"Your introduction will appear here after you edit your profile.";document.getElementById("publicGoal").textContent=d.goal||"Looking for connections";const interests=document.getElementById("publicInterests");if(interests)interests.innerHTML=(d.interests||"").split(",").map(x=>x.trim()).filter(Boolean).map(x=>`<span>${x.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}</span>`).join("")||"<span>Add your interests</span>";const photo=sessionStorage.getItem("loveconnect_profile_photo");if(photo){document.getElementById("publicProfileCover").style.backgroundImage=`url("${photo}")`;document.getElementById("publicProfileInitial").hidden=true;}const grid=document.getElementById("publicPhotoGrid");try{(JSON.parse(sessionStorage.getItem("loveconnect_profile_photos")||"[]")).forEach(src=>{const img=document.createElement("img");img.src=src;img.alt="Profile photo";grid?.appendChild(img);});}catch{}}
  const settingsForm=document.getElementById("settingsPageForm");if(settingsForm){const d=readProfile();const name=document.getElementById("settingsName");if(name)name.textContent=d.name||sessionStorage.getItem("loveconnect_profile_name")||"Your profile";const avatar=document.getElementById("settingsAvatar");const photo=sessionStorage.getItem("loveconnect_profile_photo");if(photo&&avatar){avatar.style.backgroundImage=`url("${photo}")`;avatar.textContent="";}else if(avatar)avatar.textContent=(d.name||"U").charAt(0).toUpperCase();settingsForm.addEventListener("submit",e=>{e.preventDefault();const prefs={email:document.getElementById("settingEmail").value,phone:document.getElementById("settingPhone").value,language:document.getElementById("settingLanguage").value,emailAlerts:document.getElementById("emailAlerts").checked,showMe:settingsForm.querySelector('input[name="showMe"]:checked')?.value||"Everyone"};sessionStorage.setItem("loveconnect_settings",JSON.stringify(prefs));notifyLocal("Settings saved in this browser session.");});document.querySelectorAll("[data-settings-theme]").forEach(btn=>btn.addEventListener("click",()=>{LCAppearance.setTheme(btn.dataset.settingsTheme);notifyLocal("Theme updated.");}));document.querySelectorAll("[data-settings-mode]").forEach(btn=>btn.addEventListener("click",()=>{const m=btn.dataset.settingsMode==="light"?"light":"night";LCAppearance.setMode(m);notifyLocal(m==="night"?"Night mode enabled.":"Day mode enabled.");}));}
  // Settings sidebar: Photos is a real tab on the Settings page, not a separate page or modal.
  const settingsLayout=document.querySelector(".settings-layout");
  const settingsSidebar=document.querySelector(".settings-nav");
  const settingsAccountPanel=document.querySelector(".settings-panel");
  if(settingsLayout && settingsSidebar && settingsAccountPanel){
    let photosPanel=document.getElementById("photosSettingsPanel");
    if(!photosPanel){photosPanel=document.createElement("section");photosPanel.className="settings-panel photos-settings-panel";photosPanel.id="photosSettingsPanel";photosPanel.hidden=true;photosPanel.innerHTML='<h1 class="h3 mb-1">Photos</h1><p class="text-muted mb-4">Manage the photos shown on your profile.</p><div class="card border-0 rounded-4 p-3 p-md-4"><label class="form-label" for="settingsPhotosInput">Add photos</label><input class="form-control" type="file" id="settingsPhotosInput" accept="image/*" multiple><p class="small text-muted mt-2">Choose one or more images to preview them on your profile.</p><div class="own-photo-grid mt-3" id="settingsPhotosPreview"></div></div>';settingsLayout.appendChild(photosPanel);}
    const showSettingsTab=(tab)=>{const photos=tab==="photos";settingsAccountPanel.hidden=photos;photosPanel.hidden=!photos;settingsSidebar.querySelectorAll("a").forEach(a=>a.classList.toggle("active",(photos&&a.getAttribute("href")==="#photos")||(!photos&&a.getAttribute("href")==="#account")));if(photos)history.replaceState(null,"",location.pathname+"#photos");else if(location.hash==="#photos")history.replaceState(null,"",location.pathname);};
    const photosLink=settingsSidebar.querySelector('a[href="#photos"]');
    if(photosLink){photosLink.removeAttribute("data-open-photos");photosLink.addEventListener("click",e=>{e.preventDefault();showSettingsTab("photos");});}
    const accountLink=settingsSidebar.querySelector('a[href="#account"]');accountLink?.addEventListener("click",e=>{e.preventDefault();showSettingsTab("account");});
    document.getElementById("settingsPhotosInput")?.addEventListener("change",async e=>{const grid=document.getElementById("settingsPhotosPreview");if(!grid)return;const current=JSON.parse(sessionStorage.getItem("loveconnect_profile_photos")||"[]");for(const file of [...e.target.files]){if(!file.type.startsWith("image/"))continue;const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});current.push(data);}const list=current.slice(-8);sessionStorage.setItem("loveconnect_profile_photos",JSON.stringify(list));if(list.length)sessionStorage.setItem("loveconnect_profile_photo",list[list.length-1]);grid.innerHTML="";list.forEach(src=>{const img=document.createElement("img");img.src=src;img.alt="Profile photo preview";grid.appendChild(img);});const nav=document.getElementById("navProfilePhoto");if(nav&&list.length){nav.textContent="";nav.style.backgroundImage=`url("${list[list.length-1]}")`;nav.style.backgroundSize="cover";nav.style.backgroundPosition="center";}notifyLocal("Photos updated in this browser session.");});
    if(location.hash==="#photos")showSettingsTab("photos");
  }

  // Discover inline chat: open a compact docked conversation without leaving the page.
  function openInlineChat(person) {
    let dock = document.getElementById('inlineChatDock');
    if (!dock) {
      dock = document.createElement('section');
      dock.id = 'inlineChatDock';
      dock.className = 'inline-chat-dock';
      dock.setAttribute('aria-label', 'Chat conversation');
      dock.innerHTML = '<header class="inline-chat-header"><span class="inline-chat-avatar" id="inlineChatAvatar">U</span><div class="inline-chat-person"><strong id="inlineChatPerson">Member</strong><small><i class="bi bi-circle-fill"></i> LoveConnect chat</small></div><button type="button" class="inline-chat-close" id="inlineChatClose" aria-label="Close chat"><i class="bi bi-x-lg"></i></button></header><div class="inline-chat-messages" id="inlineChatMessages"><div class="inline-chat-date">Today</div><div class="inline-bubble received">Hi! Thanks for stopping by my profile.</div></div><form class="inline-chat-compose" id="inlineChatForm"><input class="form-control" id="inlineChatInput" maxlength="1000" placeholder="Write a message…" aria-label="Write a message" required><button class="btn btn-pink" type="submit" aria-label="Send message"><i class="bi bi-send-fill"></i></button></form>';
      document.body.appendChild(dock);
      document.getElementById('inlineChatClose').addEventListener('click', () => dock.classList.remove('is-open'));
      document.getElementById('inlineChatForm').addEventListener('submit', e => {
        e.preventDefault(); const input=document.getElementById('inlineChatInput'); const value=input.value.trim(); if(!value)return;
        const bubble=document.createElement('div'); bubble.className='inline-bubble sent'; bubble.textContent=value; document.getElementById('inlineChatMessages').appendChild(bubble); input.value='';
        const messages=document.getElementById('inlineChatMessages'); messages.scrollTop=messages.scrollHeight;
      });
    }
    document.getElementById('inlineChatPerson').textContent = person || 'Member';
    document.getElementById('inlineChatAvatar').textContent = (person || 'M').trim().charAt(0).toUpperCase();
    dock.classList.add('is-open');
    const messages=document.getElementById('inlineChatMessages'); messages.scrollTop=messages.scrollHeight;
    document.getElementById('inlineChatInput').focus();
  }
  if (currentPage === 'discover.html' && !document.getElementById('floatingChat')) {
    document.querySelectorAll('.message-member').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault(); const params=new URLSearchParams(link.getAttribute('href').split('?')[1] || '');
        openInlineChat(params.get('person') || link.getAttribute('aria-label')?.replace(/^Message\s+/i,'') || 'Member');
      });
    });
  }

});
