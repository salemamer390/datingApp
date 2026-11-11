/* LoveConnect demo-only directory: 3,000 fictional profiles. Higher-resolution remote demo portraits. */
(() => {
  const grid = document.getElementById('discoverGrid');
  if (!grid) return;
  // Members now come from the Laravel backend (GET /api/members), filtered and paginated on the server.
  const members = [];
  const csrf = () => (window.LC && LC.csrf) || '';
  const api = (url, opt = {}) => fetch(url, Object.assign({ headers: Object.assign({ 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() }, opt.headers || {}), credentials: 'same-origin' }, opt, { headers: Object.assign({ 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() }, opt.headers || {}) })).then(r => r.ok ? r.json() : Promise.reject(r));
  const remember = m => { const i = members.findIndex(x => x.id === m.id); if (i >= 0) members[i] = m; else members.push(m); };
  let page = 1, pageSize = 24, currentTab = 'all', activeFilters = null;
  let visible = [], totalCount = 0, totalPages = 1;
  const countEl = document.getElementById('discoverCount');
  const pager = document.getElementById('discoverPagination');
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function memberUrl(m){return 'member.html?id='+m.id;}
  function card(m){return `<div class="col-12 col-sm-6 col-xl-3 discover-member" data-id="${m.id}" data-age="${m.age}" data-country="${esc(m.country.toLowerCase())}" data-region="${m.region.toLowerCase()}" data-gender="${m.gender}" data-goal="${m.goal}" data-new="${m.isNew?'yes':'no'}" data-online="${m.online?'yes':'no'}"><article class="profile-card" data-profile-card="${m.id}"><div role="button" tabindex="0" aria-label="View ${esc(m.name)} photos" class="profile-photo photo-open generated-photo" data-photo-person="${esc(m.name)}" data-photo="${m.photo}" style="background-image:linear-gradient(180deg,transparent 55%,#24121f88)${m.photo?`,url('${esc(m.photo)}')`:''}"><span class="${m.online?'online-dot':''}"></span><span class="profile-tag">${m.goal==='serious'?'Serious relationship':'Friendship'}</span></div><div class="profile-info"><h3>${esc(m.name)}${m.age?', '+m.age:''}</h3><p><i class="bi bi-geo-alt"></i> ${esc([m.city,m.country].filter(Boolean).join(', '))}</p><p class="member-meta">${m.gender==='woman'?'Woman':'Man'} · Single${m.region?' · '+m.region:''}</p><div class="looking-for"><strong>Looking for</strong><span>People · 24–40 · ${esc(m.country||'Worldwide')} · ${m.goal==='serious'?'Serious relationship':'Friendship'}</span></div><p class="last-seen ${m.online?'text-success':''}"><i class="bi ${m.online?'bi-circle-fill':'bi-clock'}"></i> ${m.online?'Online now':'Recently active'}</p><div class="interest-list">${m.interests.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="d-flex gap-2"><button class="btn btn-pink flex-grow-1 like-btn${m.liked?' liked':''}" data-name="${esc(m.name)}">${m.liked?'<i class="bi bi-heart-fill me-1"></i> Liked':'<i class="bi bi-heart me-1"></i> Like'}</button><button aria-label="Message ${esc(m.name)}" class="btn btn-light border message-member" data-member-id="${m.id}"><i class="bi bi-chat-dots"></i></button><button aria-label="View ${esc(m.name)} profile" class="btn btn-light border profile-open" data-profile-id="${m.id}"><i class="bi bi-person-lines-fill"></i></button><button aria-label="Add ${esc(m.name)} to favorites" class="btn btn-light border favorite-btn${m.favorite?' active':''}"><i class="bi ${m.favorite?'bi-bookmark-fill':'bi-bookmark'}"></i></button></div></div></article></div>`}
  async function render(){
    const q=new URLSearchParams({tab:currentTab,page});
    if(activeFilters){q.set('filtered','1');q.set('min',activeFilters.min);q.set('max',activeFilters.max);['country','gender','goal','activity','city','interest'].forEach(k=>q.set(k,activeFilters[k]));}
    let res;
    try{res=await api('/api/members?'+q.toString(),{method:'GET'});}catch(err){if(err&&err.status===401){location.href='index.html?loginRequired=1';}return;}
    visible=res.data; visible.forEach(remember); totalCount=res.total; totalPages=Math.max(1,res.pages); page=Math.min(page,totalPages);
    const pages=totalPages, start=(page-1)*pageSize; grid.innerHTML=visible.map(card).join('');
    countEl.textContent=`Showing ${totalCount?start+1:0}–${Math.min(start+visible.length,totalCount)} of ${totalCount.toLocaleString()} profiles`;
    const rc=document.getElementById('filterResultCount'); if(rc) rc.textContent=`${totalCount.toLocaleString()} member${totalCount===1?'':'s'}`;
    pager.innerHTML='';
    const add=(label,p,disabled=false,active=false)=>{const li=document.createElement('li');li.className=`page-item ${disabled?'disabled':''} ${active?'active':''}`;li.innerHTML=`<button class="page-link" type="button">${label}</button>`;li.querySelector('button').disabled=disabled;li.querySelector('button').addEventListener('click',()=>{page=p;render();document.getElementById('discoverMembers').scrollIntoView({behavior:'smooth',block:'start'});});pager.appendChild(li)};
    add('‹',Math.max(1,page-1),page===1); const first=Math.max(1,page-2), last=Math.min(pages,first+4);for(let p=first;p<=last;p++)add(p,p,false,p===page);add('›',Math.min(pages,page+1),page===pages);
    document.getElementById('discoverEmpty')?.classList.toggle('d-none',totalCount>0);
  }
  document.querySelectorAll('[data-discover-tab]').forEach(btn=>btn.addEventListener('click',()=>{currentTab=btn.dataset.discoverTab;page=1;activeFilters=null;render()}));
  document.getElementById('filtersForm')?.addEventListener('submit',e=>{e.preventDefault();const maxVal=document.getElementById('filterAgeMax').value;activeFilters={min:+document.getElementById('filterAgeMin').value,max:maxVal==='50+'?100:+maxVal,country:document.getElementById('filterCountry').value,gender:document.getElementById('filterGender').value,goal:document.getElementById('filterGoal').value,activity:document.getElementById('filterActivity').value,city:document.getElementById('filterCity').value.toLowerCase(),interest:document.getElementById('filterInterests').value.toLowerCase()};page=1;render();bootstrap.Modal.getInstance(document.getElementById('filterModal'))?.hide();});
  document.getElementById('filtersForm')?.addEventListener('reset',()=>{activeFilters=null;currentTab='all';page=1;setTimeout(render,0)});
  grid.addEventListener('click',e=>{
    const msg=e.target.closest('.message-member'); if(msg){e.preventDefault();e.stopPropagation();const m=members.find(x=>x.id===+msg.dataset.memberId);if(m)openChat(m);return;}
    const prof=e.target.closest('.profile-open');if(prof){e.stopPropagation();const m=members.find(x=>x.id===+prof.dataset.profileId);if(m)location.href=memberUrl(m);return;}
    const photo=e.target.closest('.photo-open');if(photo){const m=members.find(x=>x.id===+photo.closest('.discover-member').dataset.id);if(m){const modal=document.getElementById('photoGalleryModal');document.getElementById('photoGalleryTitle').textContent=m.name+' · Photos';document.getElementById('galleryImage').src=m.photo||'';document.getElementById('galleryCounter').textContent='1 / 1';bootstrap.Modal.getOrCreateInstance(modal).show();}return;}
    const like=e.target.closest('.like-btn');if(like){const id=+like.closest('.discover-member').dataset.id;api('/api/members/'+id+'/like',{method:'POST'}).then(r=>{like.classList.toggle('liked',r.liked);like.innerHTML=r.liked?'<i class="bi bi-heart-fill me-1"></i> Liked':'<i class="bi bi-heart me-1"></i> Like';const m=members.find(x=>x.id===id);if(m)m.liked=r.liked;}).catch(()=>{});return;}
    const fav=e.target.closest('.favorite-btn');if(fav){const id=+fav.closest('.discover-member').dataset.id;api('/api/members/'+id+'/favorite',{method:'POST'}).then(r=>{fav.classList.toggle('active',r.favorite);fav.innerHTML=r.favorite?'<i class="bi bi-bookmark-fill"></i>':'<i class="bi bi-bookmark"></i>';}).catch(()=>{});return;}
    const cardEl=e.target.closest('.discover-member');if(cardEl){const m=members.find(x=>x.id===+cardEl.dataset.id);if(m)location.href=memberUrl(m);}
  });
  const legacyChat=document.getElementById('floatingChat');
  if(legacyChat) legacyChat.remove();
  const chatDock=document.createElement('div');
  chatDock.className='lc-chat-dock';
  chatDock.id='lcChatDock';
  chatDock.setAttribute('aria-live','polite');
  document.body.appendChild(chatDock);
  const activeChats=new Map();
  const MAX_CHATS=4;

  function chatMarkup(m){
    const panel=document.createElement('section');
    panel.className='lc-chat-window';
    panel.dataset.memberId=String(m.id);
    panel.innerHTML=`
      <header class="lc-chat-head">
        <img class="lc-chat-avatar" src="${esc(m.photo)}" alt="${esc(m.name)}" data-action="profile">
        <div class="lc-chat-person" data-action="profile"><strong>${esc(m.name)}</strong><small><span class="chat-online-dot"></span> LoveConnect member</small></div>
        <div class="lc-chat-controls">
          <button type="button" class="lc-chat-min" aria-label="Minimize chat" title="Minimize"><i class="bi bi-dash-lg"></i></button>
          <button type="button" class="lc-chat-close" aria-label="Close chat" title="Close"><i class="bi bi-x-lg"></i></button>
        </div>
      </header>
      <div class="lc-chat-messages"><div class="chat-hint">Say hello and start a conversation.</div></div>
      <form class="lc-chat-compose">
        <input class="form-control" maxlength="1000" placeholder="Write a message…" aria-label="Write a message" required>
        <button class="btn btn-pink" type="submit" aria-label="Send message"><i class="bi bi-send-fill"></i></button>
      </form>`;
    panel.querySelector('.lc-chat-avatar').dataset.profileUrl=memberUrl(m);
    panel.querySelector('.lc-chat-person').dataset.profileUrl=memberUrl(m);
    return panel;
  }

  function activateChat(memberId){
    activeChats.forEach((state,id)=>{ state.minimized = id !== memberId; });
    const selected=activeChats.get(memberId);
    if(selected) selected.minimized=false;
    renderChatDock();
    if(selected){
      const input=selected.panel.querySelector('input');
      requestAnimationFrame(()=>input.focus());
    }
  }

  function renderChatDock(){
    chatDock.innerHTML='';
    const minimizedStack=document.createElement('div');
    minimizedStack.className='lc-chat-minimized-stack';
    let openPanel=null;
    activeChats.forEach((chatState,id)=>{
      if(chatState.minimized){
        const bubble=document.createElement('button');
        bubble.type='button';
        bubble.className='lc-chat-bubble';
        bubble.title='Open '+chatState.member.name;
        bubble.setAttribute('aria-label','Open chat with '+chatState.member.name);
        bubble.innerHTML=`<img src="${esc(chatState.member.photo)}" alt=""><span class="lc-chat-bubble-dot"></span><span class="lc-chat-bubble-close" aria-hidden="true"><i class="bi bi-x"></i></span>`;
        bubble.addEventListener('click',()=>activateChat(id));
        const closeBubble=document.createElement('button');
        closeBubble.type='button';
        closeBubble.className='lc-chat-bubble-remove';
        closeBubble.setAttribute('aria-label','Close chat with '+chatState.member.name);
        closeBubble.title='Close conversation';
        closeBubble.innerHTML='<i class="bi bi-x"></i>';
        closeBubble.addEventListener('click',e=>{
          e.preventDefault();
          e.stopPropagation();
          activeChats.delete(id);
          renderChatDock();
        });
        bubble.appendChild(closeBubble);
        minimizedStack.appendChild(bubble);
      }else{
        openPanel=chatState.panel;
      }
    });
    // Keep the avatar stack visible beside the one active conversation.
    if(openPanel) chatDock.appendChild(openPanel);
    if(minimizedStack.childElementCount) chatDock.appendChild(minimizedStack);
  }

  function loadThread(m,panel){
    return api('/api/messages/'+m.id,{method:'GET'}).then(res=>{
      const box=panel.querySelector('.lc-chat-messages');
      if(!res.messages.length){box.innerHTML='<div class="chat-hint">Say hello and start a conversation.</div>';return;}
      const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<40, key=res.messages.map(x=>x.id).join();
      if(box.dataset.key===key)return; box.dataset.key=key;
      box.innerHTML=''; res.messages.forEach(x=>{const row=document.createElement('div');row.className='chat-bubble '+(x.mine?'outgoing':'incoming');row.textContent=x.body;if(!x.mine)row.style.cssText='margin:8px auto 0 0;background:#f1e7ed;color:#2b1b26;border-radius:12px 12px 12px 3px';box.appendChild(row);});
      if(atBottom||true)box.scrollTop=999999;
    }).catch(()=>{});
  }
  function openChat(m){
    if(!m) return;
    let state=activeChats.get(m.id);
    if(state){
      activateChat(m.id);
      return;
    }
    if(activeChats.size>=MAX_CHATS){
      const oldestId=activeChats.keys().next().value;
      activeChats.delete(oldestId);
    }
    const panel=chatMarkup(m);
    state={member:m,panel,minimized:true};
    activeChats.set(m.id,state);
    panel.querySelector('.lc-chat-min').addEventListener('click',()=>{state.minimized=true;renderChatDock();});
    panel.querySelector('.lc-chat-close').addEventListener('click',()=>{activeChats.delete(m.id);renderChatDock();});
    panel.querySelectorAll('[data-action="profile"]').forEach(el=>el.addEventListener('click',()=>location.href=el.dataset.profileUrl));
    panel.querySelector('form').addEventListener('submit',e=>{
      e.preventDefault();
      const input=panel.querySelector('input');
      const value=input.value.trim();
      if(!value) return;
      input.value='';
      api('/api/messages/'+m.id,{method:'POST',body:JSON.stringify({body:value})}).then(()=>loadThread(m,panel)).catch(err=>{const row=document.createElement('div');row.className='chat-bubble outgoing';row.textContent=value+' (not sent)';if(err&&err.json)err.json().then(j=>{row.textContent=value+' (not sent: '+(j.message||'error')+')';}).catch(()=>{});panel.querySelector('.lc-chat-messages').appendChild(row);});
    });
    loadThread(m,panel);
    state.timer=setInterval(()=>{if(activeChats.get(m.id)===state)loadThread(m,panel);else clearInterval(state.timer);},5000);
    activateChat(m.id);
  }

  // Capture message-button clicks before the profile-card navigation handler.
  document.addEventListener('click',e=>{
    const button=e.target.closest('.message-member');
    if(!button || !grid.contains(button)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const member=members.find(x=>x.id===Number(button.dataset.memberId));
    if(member) openChat(member);
  },true);
  render();
})();
