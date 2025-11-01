
import { BACKEND_PORT } from './config.js';
import { fileToDataUrl } from './helpers.js'; // kept for future tasks

// Step 1: Config and tiny DOM helpers
const API_BASE = `http://localhost:${BACKEND_PORT}`;
// Track membership locally when server response doesn't include a clear flag
const joinedChannelIds = new Set();
let selectedChannelId = '';

// Utilities to safely extract/normalize channel ids
function normalizeChannelId(raw) {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim();
  if (s === '') return '';
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  if (n <= 0) return '';
  return String(Math.trunc(n));
}
function getChannelIdFromObj(ch) {
  if (!ch) return '';
  const candidate = (ch.id ?? ch.channelId ?? ch.channelid ?? (ch.channel && ch.channel.id));
  return normalizeChannelId(candidate);
}
function $(s) { return document.querySelector(s); }
function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }

// Step 2: Error popup helpers
function showError(message) {
  const modalEl = $('#error-body');
  const msg = $('#error-msg');
  if (msg) msg.textContent = message || 'An error occurred';
  if (modalEl && window.bootstrap && window.bootstrap.Modal) {
    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  } else if (modalEl) {
    modalEl.setAttribute('aria-hidden', 'false');
    show(modalEl);
  }
}
function hideError() {
  const modalEl = $('#error-body');
  if (modalEl && window.bootstrap && window.bootstrap.Modal) {
    const modal = window.bootstrap.Modal.getInstance(modalEl) || window.bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();
  } else if (modalEl) {
    modalEl.setAttribute('aria-hidden', 'true');
    hide(modalEl);
  }
}

// Step 3: Auth functions
function login(email, password) {
  return fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        return Promise.reject(new Error(data.error));
      }
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.userId) {
        localStorage.setItem('userId', String(data.userId));
      }
      return Promise.resolve(data);
    });
}

function register(email, name, password) {
  return fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      name: name,
      password: password,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        return Promise.reject(new Error(data.error));
      }
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.userId) {
        localStorage.setItem('userId', String(data.userId));
      }
      return Promise.resolve(data);
    });
}
function logout() { 
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
}

// Step 5: Visibility control
function setVisibility(isAuthed) {
  const loginBox = $('#login-container');
  const registerBox = $('#register-container');
  const dash = $('#dashboard-container');
  const dashExtra = $('#dashboard-extra');
  hide(registerBox);
  if (isAuthed) {
    hide(loginBox);
    show(dash);
    if (dashExtra) show(dashExtra);
    // Ensure profile is visible when dashboard is shown
    const avatarImg = $('#avatar-image');
    const avatarText = $('#avatar-text');
    if (avatarImg) {
      avatarImg.src = avatarImg.src || DEFAULT_AVATAR;
      show(avatarImg);
    }
    if (avatarText) {
      avatarText.style.display = '';
    }
  } else {
    show(loginBox);
    hide(dash);
    if (dashExtra) hide(dashExtra);
  }
}

// Step 6: Wire UI events
function wireEvents() {
  const btnLoginSubmit = $('#login-submit');
  const btnRegisterLink = $('#register-link');
  const btnLoginLink = $('#login-link');
  const btnRegisterSubmit = $('#register-submit');
  const btnErrorClose = $('#error-close');
  const btnErrorCloseFooter = $('#error-close-footer');
  const btnLogout = $('#logout-button');
  const btnCreateChannelToggle = $('#create-channel-button');
  const createChannelBox = $('#create-channel-container');
  const btnCreateChannelSubmit = $('#create-channel-submit');

  btnErrorClose?.addEventListener('click', () => hideError());
  btnErrorCloseFooter?.addEventListener('click', () => hideError());

  btnRegisterLink?.addEventListener('click', () => { hide($('#login-container')); show($('#register-container')); hideError(); });
  btnLoginLink?.addEventListener('click', () => { hide($('#register-container')); show($('#login-container')); hideError(); });

  btnLoginSubmit?.addEventListener('click', () => {
    hideError();
    const email = /** @type {HTMLInputElement} */ ($('#login-email'))?.value?.trim();
    const password = /** @type {HTMLInputElement} */ ($('#login-password'))?.value || '';
    if (!email || !password) return showError('Please enter email and password');
    login(email, password)
      .then(() => { 
        setVisibility(true); 
        loadOwnProfile();
        return loadChannels(); 
      })
      .catch(e => showError(e.message));
  });

  btnRegisterSubmit?.addEventListener('click', () => {
    hideError();
    const email = /** @type {HTMLInputElement} */ ($('#register-email'))?.value?.trim();
    const name = /** @type {HTMLInputElement} */ ($('#register-name'))?.value?.trim();
    const password = /** @type {HTMLInputElement} */ ($('#register-password'))?.value || '';
    const confirm = /** @type {HTMLInputElement} */ ($('#register-password-confirm'))?.value || '';
    if (!email || !name || !password || !confirm) return showError('Please fill in all fields');
    if (password !== confirm) return showError('Passwords do not match');
    register(email, name, password)
      .then(() => localStorage.getItem('token') ? null : login(email, password))
      .then(() => { 
        setVisibility(true); 
        loadOwnProfile();
        return loadChannels(); 
      })
      .catch(e => showError(e.message));
  });

  btnLogout?.addEventListener('click', () => { logout(); setVisibility(false); });

  // Milestone 2: create channel toggle
  btnCreateChannelToggle?.addEventListener('click', () => {
    if (createChannelBox && createChannelBox.style.display === 'none') {
      show(createChannelBox);
    } else if (createChannelBox) {
      hide(createChannelBox);
    }
  });

  // Milestone 2: create channel submit
  btnCreateChannelSubmit?.addEventListener('click', () => {
    const nameEl = /** @type {HTMLInputElement} */ ($('#create-channel-name'));
    const descEl = /** @type {HTMLTextAreaElement} */ ($('#create-channel-description'));
    const privEl = /** @type {HTMLInputElement} */ ($('#create-channel-is-private'));
    const name = nameEl?.value?.trim();
    const description = (descEl?.value || '').trim();
    const isPrivate = !!privEl?.checked;
    if (!name) return showError('Channel name is required');
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: name, description: description || '(no description)', private: isPrivate })
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to create channel'));
        // Creator should be a member; record locally
        const newId = normalizeChannelId(d && (d.channelId || (d.channel && d.channel.id) || d.id));
        if (newId) { joinedChannelIds.add(newId); selectedChannelId = newId; }
        if (nameEl) nameEl.value = '';
        if (descEl) descEl.value = '';
        if (privEl) privEl.checked = false;
        if (createChannelBox) hide(createChannelBox);
        return loadChannels();
      })
      .catch(e => showError(e.message));
  });
}

// Step 7: Init
window.addEventListener('DOMContentLoaded', () => {
  wireEvents();
  wireMessageEvents();
  wireMilestone4Events();
  setVisibility(!!localStorage.getItem('token'));
  if (localStorage.getItem('token')) {
    loadChannels();
    loadOwnProfile();
  }
});

// Milestone 2: channels API and rendering
function loadChannels() {
  const token = localStorage.getItem('token');
  if (!token) return Promise.resolve();
  return fetch(`${API_BASE}/channel`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  })
    .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
    .then(({ ok, d }) => {
      if (!ok) return Promise.reject(new Error(d.error || 'Failed to load channels'));
      renderChannelList(d.channels || d || []);
    })
    .catch(e => showError(e.message));
}

function renderChannelList(channels) {
  const publicList = $('#public-channel-list');
  const privateList = $('#private-channel-list');
  if (!publicList || !privateList) return;
  
  // Clear both lists
  publicList.innerHTML = '';
  privateList.innerHTML = '';
  
  // Separate channels into public and private
  const publicChannels = [];
  const privateChannels = [];
  
  channels.forEach((ch) => {
    const cid = getChannelIdFromObj(ch);
    if (!cid) {
      // skip items without valid id
      return;
    }
    const isPrivate = !!(ch.private);
    if (isPrivate) {
      privateChannels.push(ch);
    } else {
      publicChannels.push(ch);
    }
  });
  
  // Render public channels
  publicChannels.forEach((ch) => {
    const item = createChannelItem(ch, false);
    if (item) publicList.appendChild(item);
  });
  
  // Render private channels
  privateChannels.forEach((ch) => {
    const item = createChannelItem(ch, true);
    if (item) privateList.appendChild(item);
  });
  
  // Show message if lists are empty
  if (publicChannels.length === 0) {
    publicList.innerHTML = '<div class="list-group-item text-muted small">No public channels</div>';
  }
  if (privateChannels.length === 0) {
    privateList.innerHTML = '<div class="list-group-item text-muted small">No private channels</div>';
  }
}

function createChannelItem(ch, isPrivate) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center channel-container';
  const cid = getChannelIdFromObj(ch);
  if (!cid) {
    return null;
  }
  item.dataset.channelId = cid;
  item.dataset.isPrivate = String(isPrivate);
  const name = ch.name || 'Untitled';
  item.innerHTML = `
    <span>${name}</span>
    <span class="badge ${isPrivate ? 'bg-warning text-dark' : 'bg-success'}">${isPrivate ? 'Private' : 'Public'}</span>
  `;
  item.addEventListener('click', () => {
    const id = item.dataset.channelId;
    const isPrivateChannel = item.dataset.isPrivate === 'true';
    if (!id) {
      console.error('Channel item has no id:', ch);
      showError('Invalid channel id');
      return;
    }
    console.log('Loading channel details for id:', id, 'isPrivate:', isPrivateChannel);
    selectedChannelId = id;
    loadChannelDetails(id, isPrivateChannel);
  });
  return item;
}

function loadChannelDetails(channelId, isPrivate = false) {
  const token = localStorage.getItem('token');
  if (!channelId) { showError('Invalid channel id'); return Promise.resolve(); }
  const cid = normalizeChannelId(channelId);
  if (!cid) { 
    console.error('Failed to normalize channel id:', channelId);
    showError('Invalid channel id: ' + channelId); 
    return Promise.resolve(); 
  }
  selectedChannelId = cid;
  // Load users first to ensure user cache is available
  return loadUsers()
    .then(() => fetch(`${API_BASE}/channel/${cid}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    }))
    .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
    .then(({ ok, d }) => {
      if (!ok) return Promise.reject(new Error(d.error || 'Failed to get channel'));
      renderChannelDetails(d);
    })
    .catch(e => {
      // If not a member
      const errorMsg = String(e.message || '').toLowerCase();
      if ((errorMsg.includes('not') && errorMsg.includes('member')) || errorMsg.includes('403') || errorMsg.includes('forbidden')) {
        // For public channels, automatically join and then load details
        if (!isPrivate) {
          return joinChannel(cid)
            .then(() => {
              // After joining, reload details
              return loadChannelDetails(cid, false);
            })
            .catch(err => {
              // If join fails, show the non-member UI
              renderNonMemberChannel(cid, false);
            });
        } else {
          // For private channels, show non-member UI with appropriate message
          renderNonMemberChannel(cid, true);
        }
        return;
      }
      showError(e.message);
    });
}


function renderChannelDetails(data) {
    const box = $('#channel-details-container');
    if (!box) return;
    const info = data.channel || data;
    const rawId = info.id || info.channelId || selectedChannelId;
    const id = normalizeChannelId(rawId);
    if (!id) { 
      console.error('Failed to get channel id from data:', data, 'selectedChannelId:', selectedChannelId);
      showError('Invalid channel id'); 
      return; 
    }
    selectedChannelId = id;
    const name = info.name;
    const description = info.description || '';
    const isPrivate = !!info.private;
    const createdAt = info.createdAt;
    // Try to get creatorId from various possible fields
    const creatorId = info.creatorId || info.ownerId || (typeof info.creator === 'number' ? info.creator : null) || (typeof info.owner === 'number' ? info.owner : null) || null;
    const currentUserId = localStorage.getItem('userId');
    const members = info.members || [];
    const userIdNum = currentUserId ? Number(currentUserId) : null;
    const isInMembersArray = Array.isArray(members) && userIdNum !== null && members.some(m => Number(m) === userIdNum);
    const isMember = !!(info.member || info.isMember || info.joined || joinedChannelIds.has(id) || isInMembersArray);
    const createdStr = createdAt ? new Date(createdAt).toLocaleString() : '';
  
    box.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'd-flex justify-content-between align-items-center mb-2';
    header.innerHTML = `<h5 class="mb-0">${name}</h5>`;
    box.appendChild(header);
  
    // Get creator name
    const loadCreatorName = (creatorIdNum) => {
      if (!creatorIdNum) return Promise.resolve(info.creatorName || info.creator || 'Unknown');
      const cached = userCache[creatorIdNum];
      if (cached && cached.name) {
        return Promise.resolve(cached.name);
      }
      // If not in cache, load user info
      const token = localStorage.getItem('token');
      return fetch(`${API_BASE}/user/${creatorIdNum}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      })
        .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (ok && d) {
            userCache[creatorIdNum] = {
              name: d.name || d.email || 'Unknown',
              image: d.image || null
            };
            return d.name || d.email || 'Unknown';
          }
          return info.creatorName || info.creator || 'Unknown';
        })
        .catch(() => info.creatorName || info.creator || 'Unknown');
    };
    
    const creatorIdNum = creatorId ? Number(creatorId) : null;
    let creatorName = info.creatorName || info.creator || 'Loading...';
    
    // Try to get creator name from cache or load it
    if (creatorIdNum) {
      const cached = userCache[creatorIdNum];
      if (cached && cached.name) {
        creatorName = cached.name;
      } else {
        // Load user info asynchronously and update display
        loadCreatorName(creatorIdNum).then(name => {
          const metaDiv = box.querySelector('.channel-meta');
          if (metaDiv) {
            const creatorDiv = metaDiv.querySelector('.creator-name');
            if (creatorDiv) creatorDiv.textContent = name;
          }
        });
      }
    }
  
    const meta = document.createElement('div');
    meta.className = 'mb-2 channel-meta';
    meta.innerHTML = `
      <div><strong>Privacy:</strong> ${isPrivate ? 'Private' : 'Public'}</div>
      <div><strong>Created:</strong> ${createdStr}</div>
      <div><strong>Creator:</strong> <span class="creator-name">${creatorName}</span></div>
    `;
    box.appendChild(meta);
  
    // Description display (view mode)
    const descView = document.createElement('div');
    descView.className = 'mb-3';
    descView.innerHTML = `<strong>Description:</strong> <span id="channel-desc-view">${description || '(none)'}</span>`;
    box.appendChild(descView);
    
    const actions = document.createElement('div');
    actions.className = 'd-flex flex-wrap gap-2 mb-2';
    if (isMember) {
      // Edit form container (hidden by default)
      const editFormContainer = document.createElement('div');
      editFormContainer.id = 'channel-edit-form';
      editFormContainer.style.display = 'none';
      editFormContainer.className = 'w-100 mb-3';
      
      const nameInput = document.createElement('input');
      nameInput.className = 'form-control mb-2';
      nameInput.value = name;
      nameInput.placeholder = 'Channel name';
      
      const descInput = document.createElement('textarea');
      descInput.className = 'form-control mb-2';
      descInput.rows = 2;
      descInput.value = description;
      descInput.placeholder = 'Channel description';
      
      const editActions = document.createElement('div');
      editActions.className = 'd-flex gap-2';
      
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        const newDesc = descInput.value.trim();
        if (!newName) {
          showError('Channel name is required');
          return;
        }
        
        const token = localStorage.getItem('token');
        const cid = normalizeChannelId(id);
        if (!cid) {
          showError('Invalid channel id');
          return;
        }
        
        fetch(`${API_BASE}/channel/${cid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: newName, description: newDesc || '(no description)' })
          })
            .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
            .then(({ ok, d }) => {
              if (!ok) return Promise.reject(new Error(d.error || 'Failed to update channel'));
              
              // Update displayed values without reloading
              const nameHeader = header.querySelector('h5');
              if (nameHeader) nameHeader.textContent = newName;
              const descViewSpan = document.getElementById('channel-desc-view');
              if (descViewSpan) descViewSpan.textContent = newDesc || '(none)';
              
              // Hide edit form and show edit button
              editFormContainer.style.display = 'none';
              const editBtn = document.getElementById('channel-edit-btn');
              if (editBtn) editBtn.style.display = '';
              
              // Reload channel list to reflect changes
              return loadChannels();
            })
            .catch(e => showError(e.message));
        });
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => {
          // Restore original values
          nameInput.value = name;
          descInput.value = description;
          editFormContainer.style.display = 'none';
          const editBtn = document.getElementById('channel-edit-btn');
          if (editBtn) editBtn.style.display = '';
        });
        
        editActions.appendChild(saveBtn);
        editActions.appendChild(cancelBtn);
        editFormContainer.appendChild(nameInput);
        editFormContainer.appendChild(descInput);
        editFormContainer.appendChild(editActions);
        box.appendChild(editFormContainer);
        
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.id = 'channel-edit-btn';
        editBtn.className = 'btn btn-outline-secondary';
        editBtn.textContent = 'Edit Channel';
        editBtn.addEventListener('click', () => {
          editFormContainer.style.display = '';
          editBtn.style.display = 'none';
        });
        
        const leaveBtn = document.createElement('button');
        leaveBtn.className = 'btn btn-outline-danger';
        leaveBtn.textContent = 'Leave';
        leaveBtn.addEventListener('click', () => leaveChannel(id));
  
        const inviteBtn = document.createElement('button');
        inviteBtn.id = 'invite-user-button';
        inviteBtn.className = 'btn btn-outline-primary';
        inviteBtn.textContent = 'Invite Users';
        inviteBtn.addEventListener('click', () => showInviteModal(id));
  
        actions.appendChild(editBtn);
        actions.appendChild(inviteBtn);
        actions.appendChild(leaveBtn);
        
        // Load messages for members
        loadMessages(id, 0);
        show($('#messages-container'));
        show($('#message-input-container'));
      } else {
        const joinBtn = document.createElement('button');
        joinBtn.className = 'btn btn-success';
        joinBtn.textContent = 'Join Channel';
        joinBtn.addEventListener('click', () => joinChannel(id));
        actions.appendChild(joinBtn);
      }
    box.appendChild(actions);
  }
  
function renderNonMemberChannel(channelId, isPrivate = false) {
  const box = $('#channel-details-container');
  if (!box) return;
  const cid = normalizeChannelId(channelId || selectedChannelId);
  if (!cid) { showError('Invalid channel id'); return; }
  selectedChannelId = cid;
  box.innerHTML = '';
  
  const card = document.createElement('div');
  card.className = 'card card-body text-center';
  
  if (isPrivate) {
    const msg = document.createElement('p');
    msg.className = 'mb-3 text-muted';
    msg.textContent = 'This is a private channel. You need to be invited to join.';
    card.appendChild(msg);
    
    const infoMsg = document.createElement('p');
    infoMsg.className = 'small text-muted mb-0';
    infoMsg.textContent = 'Ask a channel member to invite you.';
    card.appendChild(infoMsg);
  } else {
    const msg = document.createElement('p');
    msg.className = 'mb-3';
    msg.textContent = 'You are not a member of this channel.';
    card.appendChild(msg);
    
    const joinBtn = document.createElement('button');
    joinBtn.className = 'btn btn-success';
    joinBtn.textContent = 'Join Channel';
    joinBtn.addEventListener('click', () => {
      joinChannel(cid)
        .then(() => {
          // After joining, reload channel details
          loadChannelDetails(cid, false);
        })
        .catch(e => {
          // Error already shown by joinChannel
        });
    });
    card.appendChild(joinBtn);
  }
  
  box.appendChild(card);
  
  // Hide message areas for non-members
  hide($('#messages-container'));
  hide($('#message-input-container'));
  hide($('#pinned-messages-container'));
}

function updateChannel(channelId, name, description) {
    const token = localStorage.getItem('token');
    if (!name) {
      showError('Name is required');
      return Promise.reject(new Error('Name is required'));
    }
  const cid = normalizeChannelId(channelId || selectedChannelId);
  if (!cid) {
    showError('Invalid channel id');
    return Promise.reject(new Error('Invalid channel id'));
  }
  return fetch(`${API_BASE}/channel/${cid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: name, description: description || '(no description)' })
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to update channel'));
        return loadChannelDetails(channelId).then(() => loadChannels());
      })
      .catch(e => {
        showError(e.message);
        return Promise.reject(e);
      });
  }
  
  function joinChannel(channelId) {
    const token = localStorage.getItem('token');
  const cid = normalizeChannelId(channelId || selectedChannelId);
  if (!cid) { 
      showError('Invalid channel id'); 
      return Promise.reject(new Error('Invalid channel id')); 
    }
  return fetch(`${API_BASE}/channel/${cid}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) {
          const errorMsg = (d.error || 'Failed to join channel').toLowerCase();
          // If user is already a member, mark as joined and reload
          if (errorMsg.includes('already') && errorMsg.includes('member')) {
            joinedChannelIds.add(String(cid));
            // Determine if it's a private channel by checking channel list or trying to load details
            return loadUsers()
              .then(() => loadChannelDetails(cid))
              .then(() => loadChannels());
          }
          // For private channels, show appropriate error
          if (errorMsg.includes('private') || errorMsg.includes('invite') || errorMsg.includes('403')) {
            return Promise.reject(new Error('You need to be invited to join this private channel.'));
          }
          return Promise.reject(new Error(d.error || 'Failed to join channel'));
        }
      joinedChannelIds.add(String(cid));
      // After successful join, reload channel details
      return loadUsers()
        .then(() => loadChannelDetails(cid))
        .then(() => loadChannels());
      })
      .catch(e => {
        showError(e.message);
        return Promise.reject(e);
      });
  }
  
  function leaveChannel(channelId) {
    const token = localStorage.getItem('token');
  const cid = normalizeChannelId(channelId || selectedChannelId);
  if (!cid) { showError('Invalid channel id'); return Promise.resolve(); }
  return fetch(`${API_BASE}/channel/${cid}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to leave channel'));
        const details = $('#channel-details-container');
        if (details) details.innerHTML = '<p class="text-muted mb-0">Select a channel to view details and messages.</p>';
        hide($('#messages-container'));
        hide($('#message-input-container'));
        hide($('#pinned-messages-container'));
      joinedChannelIds.delete(String(cid));
        return loadChannels();
      })
      .catch(e => showError(e.message));
  }

// Milestone 3: Message functions
// Default profile photo as SVG data URL (user icon)
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0Ljc2MTQgMTIgMTcgOS43NjE0MiAxNyA3QzE3IDQuMjM4NTggMTQuNzYxNCAyIDEyIDJDOS4yMzg1OCAyIDcgNC4yMzg1OCA3IDdDNyA5Ljc2MTQyIDkuMjM4NTggMTIgMTIgMTJaIiBmaWxsPSIjNjY2NjY2Ii8+CjxwYXRoIGQ9Ik0xMiAxNEMxNS4zMzEzIDE0IDE4IDE1LjIzMjIgMTggMTdWMTlIMFYxN0MwIDE1LjIzMjIgMi42ODg2NyAxNCA2IDE0SDEyWiIgZmlsbD0iIzY2NjY2NiIvPgo8L3N2Zz4K';
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const userCache = {};

function loadUsers() {
  const token = localStorage.getItem('token');
  if (!token) return Promise.resolve({});
  // Load basic user list
  return fetch(`${API_BASE}/user`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  })
    .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
    .then(({ ok, d }) => {
      if (!ok) return {};
      const users = d.users || [];
      // Store basic info first
      users.forEach(u => {
        if (u.id) {
          if (!userCache[u.id]) {
            userCache[u.id] = { name: u.email || 'Unknown', image: null };
          }
        }
      });
      // Load detailed info for all users (in parallel)
      const detailPromises = users.map(u => {
        if (!u.id) return Promise.resolve();
        return fetch(`${API_BASE}/user/${u.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        })
          .then(r => r.json().catch(() => ({})).then(data => ({ ok: r.ok, data })))
          .then(({ ok, data }) => {
            if (ok && data && u.id) {
              userCache[u.id] = {
                name: data.name || userCache[u.id]?.name || data.email || 'Unknown',
                image: data.image || null
              };
            }
          })
          .catch(() => {});
      });
      return Promise.all(detailPromises).then(() => userCache);
    })
    .catch(() => ({}));
}
function loadMessages(channelId, start = 0) {
    const token = localStorage.getItem('token');
    const cid = normalizeChannelId(channelId || selectedChannelId);
    if (!cid) return Promise.resolve();
    // Load users first, then messages
    return loadUsers()
      .then(() => fetch(`${API_BASE}/message/${cid}?start=${start}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      }))
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to load messages'));
        renderMessages(d.messages || []);
        loadPinnedMessages(cid);
      })
      .catch(e => showError(e.message));
  }
  
  function renderMessages(messages) {
    const container = $('#messages-list');
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(messages) || messages.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">No messages yet</p>';
      return;
    }
    // Sort by sentAt (oldest first for reverse-chronological display - newest at bottom)
    const sorted = [...messages].sort((a, b) => {
      const timeA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const timeB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return timeA - timeB;
    });
    sorted.forEach(msg => renderMessage(msg, container));
    // Scroll to bottom to show newest messages
    container.scrollTop = container.scrollHeight;
  }
  
  function renderMessage(msg, container) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message-container mb-3 p-2 border-bottom';
    msgDiv.dataset.messageId = String(msg.id || '');
    
    const currentUserId = Number(localStorage.getItem('userId'));
    const isOwnMessage = msg.sender === currentUserId;
    const sentAt = msg.sentAt ? new Date(msg.sentAt).toLocaleString() : '';
    const editedAt = msg.edited && msg.editedAt ? new Date(msg.editedAt).toLocaleString() : '';
    
    // Get user info from cache or use defaults
    const senderId = msg.sender;
    const userInfo = senderId ? userCache[senderId] : null;
    const avatar = (userInfo && userInfo.image) || msg.senderImage || DEFAULT_AVATAR;
    const senderName = (userInfo && userInfo.name) || msg.senderName || 'Unknown';
    
    msgDiv.innerHTML = `
      <div class="d-flex">
        <img src="${avatar}" alt="${senderName}" class="rounded-circle me-2" style="width: 40px; height: 40px; object-fit: cover;">
      <div class="flex-grow-1">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong class="message-user-name" style="cursor: pointer;" data-user-id="${senderId}">${senderName}</strong>
            <small class="text-muted ms-2">${sentAt}</small>
            ${msg.edited ? `<small class="text-muted ms-2">(edited ${editedAt})</small>` : ''}
          </div>
            ${isOwnMessage ? `
              <div>
                <button class="btn btn-sm btn-outline-secondary message-edit-button" data-message-id="${msg.id}">Edit</button>
                <button class="btn btn-sm btn-outline-danger message-delete-button" data-message-id="${msg.id}">Delete</button>
              </div>
            ` : ''}
          </div>
        <div class="mt-1">${msg.message || ''}</div>
        ${msg.image ? `<img src="${msg.image}" alt="Message image" class="message-image img-thumbnail mt-2" style="max-width: 200px; cursor: pointer;" data-image-url="${msg.image}">` : ''}
          <div class="mt-2">
            <div class="reactions-container d-flex flex-wrap gap-1">
              ${renderReactions(msg.reacts || [], msg.id)}
            </div>
            <button class="btn btn-sm btn-link add-reaction-btn" data-message-id="${msg.id}">+ Add reaction</button>
            <button class="btn btn-sm btn-link ${msg.pinned ? 'text-warning' : ''}" data-message-id="${msg.id}" onclick="togglePin('${msg.id}')">
              ${msg.pinned ? '📌 Unpin' : '📌 Pin'}
            </button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(msgDiv);
  }
  function renderReactions(reacts, messageId) {
    if (!Array.isArray(reacts) || reacts.length === 0) return '';
    const reactionGroups = {};
    reacts.forEach(r => {
      const key = String(r.react || '');
      if (!reactionGroups[key]) reactionGroups[key] = [];
      reactionGroups[key].push(r.user);
    });
    return Object.entries(reactionGroups).map(([emoji, users]) => {
      const currentUserId = Number(localStorage.getItem('userId'));
      const hasReacted = users.includes(currentUserId);
      return `<span class="badge bg-secondary me-1 reaction-badge ${hasReacted ? 'reacted' : ''}" 
        data-message-id="${messageId}" data-react="${emoji}" style="cursor: pointer;">
        ${emoji} ${users.length}
      </span>`;
    }).join('');
  }
  
  function loadPinnedMessages(channelId) {
    const token = localStorage.getItem('token');
    const cid = normalizeChannelId(channelId || selectedChannelId);
    if (!cid) return Promise.resolve();
    return fetch(`${API_BASE}/message/${cid}?start=0`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return;
        const pinned = (d.messages || []).filter(m => m.pinned);
        const container = $('#pinned-messages-list');
        const pinContainer = $('#pinned-messages-container');
        if (pinned.length > 0) {
          container.innerHTML = '';
          pinned.forEach(msg => {
            const pinDiv = document.createElement('div');
            pinDiv.className = 'pinned-message border-bottom pb-2 mb-2';
            const sentAt = msg.sentAt ? new Date(msg.sentAt).toLocaleString() : '';
            const senderId = msg.sender;
            const userInfo = senderId ? userCache[senderId] : null;
            const senderName = (userInfo && userInfo.name) || msg.senderName || 'Unknown';
            pinDiv.innerHTML = `
              <div class="small">
                <strong>${senderName}</strong> <span class="text-muted">${sentAt}</span>
              </div>
              <div>${msg.message || ''}</div>
            `;
            container.appendChild(pinDiv);
          });
          show(pinContainer);
        } else {
          hide(pinContainer);
        }
      });
  }
  
  function wireMessageEvents() {
    const btnSend = $('#message-send-button');
    const inputMessage = $('#message-input');
    
    btnSend?.addEventListener('click', () => {
      const text = inputMessage?.value?.trim();
      if (!text) return showError('Message cannot be empty');
      sendMessage(selectedChannelId, text);
    });
    
    inputMessage?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        btnSend?.click();
      }
    });
    
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('message-delete-button')) {
      const msgId = e.target.dataset.messageId;
      if (msgId) deleteMessage(selectedChannelId, msgId);
    }
    if (e.target.classList.contains('message-edit-button')) {
      const msgId = e.target.dataset.messageId;
      if (msgId) startEditMessage(msgId);
    }
    if (e.target.classList.contains('add-reaction-btn')) {
      const msgId = e.target.dataset.messageId;
      if (msgId) showReactionPicker(msgId);
    }
    if (e.target.classList.contains('reaction-badge')) {
      const msgId = e.target.dataset.messageId;
      const react = e.target.dataset.react;
      if (msgId && react) toggleReaction(msgId, react);
    }
    if (e.target.classList.contains('message-user-name')) {
      const userId = e.target.dataset.userId;
      if (userId) showUserProfile(Number(userId));
    }
    if (e.target.classList.contains('message-image')) {
      const imgUrl = e.target.dataset.imageUrl;
      if (imgUrl) showImageViewer(imgUrl);
    }
  });
  
  // Image upload handler
  const imageInput = $('#message-image-input');
  imageInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      fileToDataUrl(file)
        .then(dataUrl => {
          const previewText = $('#image-preview-text');
          if (previewText) {
            previewText.textContent = `Selected: ${file.name}`;
          }
          imageInput.dataset.imageDataUrl = dataUrl;
        })
        .catch(err => showError('Failed to load image: ' + err.message));
    }
  });
  
}


function sendMessage(channelId, message) {
    const token = localStorage.getItem('token');
    const cid = normalizeChannelId(channelId);
    if (!cid) return Promise.resolve();
    const inputEl = $('#message-input');
    const imageInput = $('#message-image-input');
    const imageDataUrl = imageInput?.dataset.imageDataUrl;
    
    // Validate: need either message or image, but not both
    const trimmedMessage = message ? message.trim() : '';
    const hasText = !!trimmedMessage;
    const hasImage = !!imageDataUrl;
    
    // Validation: empty strings or whitespace-only messages cannot be sent
    if (!hasText && !hasImage) {
      showError('Message or image required');
      return Promise.resolve();
    }
    
    // Note: if sending text with image, backend should handle it, but spec says image messages don't include text
    // So we send either text OR image, not both
    const body = {};
    if (hasText && !hasImage) {
      body.message = trimmedMessage;
    } else if (hasImage && !hasText) {
      body.image = imageDataUrl;
    } else {
      // Both text and image - spec says image messages don't include text
      body.image = imageDataUrl;
    }
    
    return fetch(`${API_BASE}/message/${cid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body),
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to send message'));
        if (inputEl) inputEl.value = '';
        if (imageInput) {
          imageInput.value = '';
          delete imageInput.dataset.imageDataUrl;
          const previewText = $('#image-preview-text');
          if (previewText) previewText.textContent = '';
        }
        return loadMessages(cid, 0);
      })
      .catch(e => showError(e.message));
  }
  
  function deleteMessage(channelId, messageId) {
    const token = localStorage.getItem('token');
    const cid = normalizeChannelId(channelId);
    if (!cid || !messageId) return Promise.resolve();
    return fetch(`${API_BASE}/message/${cid}/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to delete message'));
        return loadMessages(cid, 0).then(() => loadPinnedMessages(cid));
      })
      .catch(e => showError(e.message));
  }
  
  function startEditMessage(messageId) {
    const msgContainer = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!msgContainer) return;
    const msgTextEl = msgContainer.querySelector('.mt-1');
    if (!msgTextEl) return;
    const originalText = msgTextEl.textContent.trim();
    const editInput = document.createElement('textarea');
    editInput.className = 'form-control';
    editInput.value = originalText;
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-sm btn-primary';
    saveBtn.textContent = 'Save';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-sm btn-secondary';
    cancelBtn.textContent = 'Cancel';
    const originalContent = msgTextEl.innerHTML;
    msgTextEl.innerHTML = '';
    msgTextEl.appendChild(editInput);
    msgTextEl.appendChild(document.createElement('br'));
    msgTextEl.appendChild(saveBtn);
    msgTextEl.appendChild(cancelBtn);
    
    const finishEdit = (save) => {
      if (save) {
        const newText = editInput.value.trim();
        if (!newText) {
          showError('Message cannot be empty');
          return;
        }
        if (newText === originalText) {
          showError('Message unchanged');
          return;
        }
        editMessage(selectedChannelId, messageId, newText);
      }
      msgTextEl.innerHTML = originalContent;
    };
    
    saveBtn.addEventListener('click', () => finishEdit(true));
    cancelBtn.addEventListener('click', () => finishEdit(false));
  }
  
  function editMessage(channelId, messageId, message) {
    const token = localStorage.getItem('token');
    const cid = normalizeChannelId(channelId);
    if (!cid || !messageId || !message) return Promise.resolve();
    return fetch(`${API_BASE}/message/${cid}/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ message: message }),
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to edit message'));
        return loadMessages(cid, 0);
      })
      .catch(e => showError(e.message));
  }

  function showReactionPicker(messageId) {
    const picker = document.createElement('div');
    picker.className = 'reaction-picker position-absolute bg-white border p-2';
    picker.style.cssText = 'z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
    REACTION_EMOJIS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm me-1';
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        reactToMessage(messageId, emoji);
        picker.remove();
      });
      picker.appendChild(btn);
    });
    const btn = document.querySelector(`[data-message-id="${messageId}"].add-reaction-btn`);
    if (btn) {
      const rect = btn.getBoundingClientRect();
      picker.style.left = rect.left + 'px';
      picker.style.top = (rect.bottom + 5) + 'px';
      document.body.appendChild(picker);
      setTimeout(() => {
        document.addEventListener('click', function removePicker(e) {
          if (!picker.contains(e.target) && e.target !== btn) {
            picker.remove();
            document.removeEventListener('click', removePicker);
          }
        });
      }, 0);
    }
  }
  
  function toggleReaction(messageId, react) {
    const token = localStorage.getItem('token');
    const currentUserId = Number(localStorage.getItem('userId'));
    const cid = normalizeChannelId(selectedChannelId);
    if (!cid) return Promise.resolve();
    
    // Check if user already reacted
    const msgContainer = document.querySelector(`[data-message-id="${messageId}"]`);
    const reactionBadge = msgContainer?.querySelector(`[data-react="${react}"]`);
    const hasReacted = reactionBadge?.classList.contains('reacted');
    const endpoint = hasReacted ? 'unreact' : 'react';
    
    return fetch(`${API_BASE}/message/${endpoint}/${cid}/${messageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ react: react }),
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to react'));
        return loadMessages(cid, 0);
      })
      .catch(e => showError(e.message));
  }
  
  function reactToMessage(messageId, react) {
    toggleReaction(messageId, react);
  }
  
  window.togglePin = function(messageId) {
    const token = localStorage.getItem('token');
    const cid = normalizeChannelId(selectedChannelId);
    if (!cid || !messageId) return Promise.resolve();
    const msgContainer = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!msgContainer) return;
    const isPinned = msgContainer.querySelector('.btn-link.text-warning') !== null;
    const endpoint = isPinned ? 'unpin' : 'pin';
    
    return fetch(`${API_BASE}/message/${endpoint}/${cid}/${messageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to pin/unpin message'));
        return loadMessages(cid, 0).then(() => loadPinnedMessages(cid));
      })
      .catch(e => showError(e.message));
  };


  // Milestone 4 & 5: Additional functions
let currentChannelImages = [];
let currentImageIndex = 0;

function showInviteModal(channelId) {
  const modalEl = $('#channel-invite-container');
  const listEl = $('#invite-users-list');
  if (!modalEl || !listEl) return;
  
  const token = localStorage.getItem('token');
  const cid = normalizeChannelId(channelId || selectedChannelId);
  if (!cid) return;
  
  // Load channel details to get members
  fetch(`${API_BASE}/channel/${cid}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  })
    .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
    .then(({ ok, d }) => {
      if (!ok) return Promise.reject(new Error(d.error || 'Failed to load channel'));
      const members = d.members || [];
      
      // Load all users
      return loadUsers().then(() => {
        const currentUserId = Number(localStorage.getItem('userId'));
        const allUsers = Object.keys(userCache).map(id => ({
          id: Number(id),
          ...userCache[id]
        }));
        
        // Filter out current user and existing members
        const availableUsers = allUsers.filter(u => {
          return u.id !== currentUserId && !members.includes(u.id);
        });
        
        // Sort alphabetically by name
        availableUsers.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        listEl.innerHTML = '';
        if (availableUsers.length === 0) {
          listEl.innerHTML = '<p class="text-muted">No users available to invite</p>';
          return;
        }
        
        availableUsers.forEach(user => {
          const item = document.createElement('div');
          item.className = 'form-check mb-2';
          item.innerHTML = `
            <input class="form-check-input invite-member-checkbox" type="checkbox" value="${user.id}" id="invite-${user.id}">
            <label class="form-check-label invite-member-name" for="invite-${user.id}">${user.name || 'Unknown'}</label>
          `;
          listEl.appendChild(item);
        });
        
        const modal = window.bootstrap?.Modal?.getOrCreateInstance(modalEl);
        if (modal) modal.show();
      });
    })
    .catch(e => showError(e.message));
}


function submitInvite(channelId) {
    const checkboxes = document.querySelectorAll('.invite-member-checkbox:checked');
    const userIds = Array.from(checkboxes).map(cb => Number(cb.value));
    if (userIds.length === 0) {
      showError('Please select at least one user');
      return;
    }
    
    const token = localStorage.getItem('token');
    const cid = normalizeChannelId(channelId || selectedChannelId);
    if (!cid) return;
    
    // Invite each user
    const invitePromises = userIds.map(userId => {
      return fetch(`${API_BASE}/channel/${cid}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: userId }),
      })
        .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) return Promise.reject(new Error(d.error || 'Failed to invite user'));
          return { userId, success: true };
        });
    });
    
    Promise.all(invitePromises)
      .then(() => {
        const modalEl = $('#channel-invite-container');
        const modal = window.bootstrap?.Modal?.getInstance(modalEl);
        if (modal) modal.hide();
        return loadChannelDetails(cid);
      })
      .catch(e => showError(e.message));
  }

  function showUserProfile(userId) {
    const modalEl = $('#profile-container');
    if (!modalEl) return;
    
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/user/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to load profile'));
        
        const imgEl = $('#profile-image');
        const nameEl = $('#profile-name');
        const emailEl = $('#profile-email');
        const bioEl = $('#profile-bio');
        
        if (imgEl) imgEl.src = d.image || DEFAULT_AVATAR;
        if (nameEl) nameEl.textContent = d.name || 'Unknown';
        if (emailEl) emailEl.textContent = d.email || '';
        if (bioEl) bioEl.textContent = d.bio || '(no bio)';
        
        const modal = window.bootstrap?.Modal?.getOrCreateInstance(modalEl);
        if (modal) modal.show();
      })
      .catch(e => showError(e.message));
  }
  
  function loadOwnProfile() {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    
    // Always show default avatar and text
    const avatarImg = $('#avatar-image');
    const avatarText = $('#avatar-text');
    
    if (avatarImg) {
      avatarImg.src = DEFAULT_AVATAR;
      show(avatarImg);
    }
    
    if (avatarText) {
      avatarText.textContent = 'User';
      avatarText.style.display = '';
    }
    
    if (!userId || !token) {
      return;
    }
    
    return fetch(`${API_BASE}/user/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        // Update avatar display
        if (avatarImg) {
          avatarImg.src = d.image || DEFAULT_AVATAR;
          show(avatarImg); // Always show avatar image (default or user's image)
        }
        
        if (avatarText) {
          avatarText.textContent = d.name || d.email || 'User';
          avatarText.style.display = '';
        }
        
        // Cache own user info
        if (userId && ok && d) {
          userCache[userId] = {
            name: d.name || d.email || 'Unknown',
            image: d.image || null
          };
        }
      })
      .catch(() => {
        // On error, keep default avatar and text already shown
      });
  }
  
  function showOwnProfile() {
    const modalEl = $('#own-profile-container');
    if (!modalEl) return;
    
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/user/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to load profile'));
        
        const imgEl = $('#own-profile-image-preview');
        const nameEl = $('#own-profile-name');
        const emailEl = $('#own-profile-email');
        const bioEl = $('#own-profile-bio');
        const pwdEl = $('#own-profile-password');
        
        if (imgEl) imgEl.src = d.image || DEFAULT_AVATAR;
        if (nameEl) nameEl.value = d.name || '';
        if (emailEl) emailEl.value = d.email || '';
        if (bioEl) bioEl.value = d.bio || '';
        if (pwdEl) pwdEl.value = '';
        
        const modal = window.bootstrap?.Modal?.getOrCreateInstance(modalEl);
        if (modal) modal.show();
      })
      .catch(e => showError(e.message));
  }

  function saveOwnProfile() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    const nameEl = $('#own-profile-name');
    const emailEl = $('#own-profile-email');
    const bioEl = $('#own-profile-bio');
    const pwdEl = $('#own-profile-password');
    const imgInput = $('#own-profile-image-input');
    
    const name = nameEl?.value?.trim();
    const email = emailEl?.value?.trim();
    const bio = bioEl?.value?.trim();
    const password = pwdEl?.value?.trim();
    const imageDataUrl = imgInput?.dataset.imageDataUrl;
    
    if (!name || !email) {
      showError('Name and email are required');
      return;
    }

    const token = localStorage.getItem('token');
    const body = { name, email };
    if (bio) body.bio = bio;
    if (password) body.password = password;
    if (imageDataUrl) body.image = imageDataUrl;
    
    return fetch(`${API_BASE}/user`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body),
    })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) return Promise.reject(new Error(d.error || 'Failed to update profile'));
        const modalEl = $('#own-profile-container');
        const modal = window.bootstrap?.Modal?.getInstance(modalEl);
        if (modal) modal.hide();
        loadOwnProfile();
        loadUsers(); // Refresh user cache
        if (selectedChannelId) loadMessages(selectedChannelId, 0); // Refresh messages
      })
      .catch(e => showError(e.message));
  }
  
  function showImageViewer(imageUrl) {
    const modalEl = $('#image-viewer-modal');
    const imgEl = $('#image-viewer-img');
    if (!modalEl || !imgEl) return;
    
    // Collect all images from current channel messages
    const messages = Array.from(document.querySelectorAll('.message-container'));
    currentChannelImages = [];
    messages.forEach(msgContainer => {
      const img = msgContainer.querySelector('.message-image');
      if (img && img.dataset.imageUrl) {
        currentChannelImages.push(img.dataset.imageUrl);
      }
    });
    
    currentImageIndex = currentChannelImages.indexOf(imageUrl);
    if (currentImageIndex === -1) currentImageIndex = 0;
    
    imgEl.src = currentChannelImages[currentImageIndex] || imageUrl;
    
    const modal = window.bootstrap?.Modal?.getOrCreateInstance(modalEl);
    if (modal) modal.show();
    
    // Update nav buttons
    const prevBtn = $('#image-viewer-prev');
    const nextBtn = $('#image-viewer-next');
    if (prevBtn) {
      prevBtn.style.display = currentChannelImages.length > 1 ? '' : 'none';
      prevBtn.onclick = () => {
        currentImageIndex = (currentImageIndex - 1 + currentChannelImages.length) % currentChannelImages.length;
        imgEl.src = currentChannelImages[currentImageIndex];
      };
    }
    if (nextBtn) {
      nextBtn.style.display = currentChannelImages.length > 1 ? '' : 'none';
      nextBtn.onclick = () => {
        currentImageIndex = (currentImageIndex + 1) % currentChannelImages.length;
        imgEl.src = currentChannelImages[currentImageIndex];
      };
    }
  }
  // Wire additional events
function wireMilestone4Events() {
    // Invite submit button
    $('#invite-submit-button')?.addEventListener('click', () => {
      submitInvite(selectedChannelId);
    });
    
    // Avatar click to show own profile
    $('#avatar-label')?.addEventListener('click', () => {
      showOwnProfile();
    });
    
    // Own profile image upload
    $('#own-profile-image-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        fileToDataUrl(file)
          .then(dataUrl => {
            const preview = $('#own-profile-image-preview');
            if (preview) preview.src = dataUrl;
            const input = $('#own-profile-image-input');
            if (input) input.dataset.imageDataUrl = dataUrl;
          })
          .catch(err => showError('Failed to load image: ' + err.message));
      }
    });
    
    // Own profile save button
    $('#own-profile-save-button')?.addEventListener('click', () => {
      saveOwnProfile();
    });
    
    // Password visibility toggle
    $('#toggle-password-visibility')?.addEventListener('click', () => {
      const pwdEl = $('#own-profile-password');
      if (!pwdEl) return;
      if (pwdEl.type === 'password') {
        pwdEl.type = 'text';
      } else {
        pwdEl.type = 'password';
      }
    });
  }
