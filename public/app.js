/* ---------------- ICONS (minimal line SVGs) ---------------- */
const ICONS = {
  nature: '<path d="M4 20l6-11 4 6 2-3 4 8H4z"/><circle cx="17" cy="6" r="2"/>',
  food: '<path d="M6 3v8a2 2 0 0 0 4 0V3M6 3v18M10 3v6M17 3c-2 0-3 2-3 5s1 4 3 5v9"/>',
  nightlife: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 1 0 10.5 10.5z"/>',
  art: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10.5" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="15.5" cy="10.5" r="1"/><path d="M9 15c1 1 5 1 6 0"/>',
  adventure: '<path d="M3 20l6-14 3 7 2-4 7 11H3z"/>',
  wellness: '<path d="M12 3v18M6 8c2 0 4 1.5 4 4M18 8c-2 0-4 1.5-4 4M6 15c2 0 4 1.2 4 3M18 15c-2 0-4 1.2-4 3"/>',
  history: '<path d="M4 21h16M6 21V9l6-5 6 5v12M9 21v-6h6v6"/>',
  offbeat: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>',
  photo: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z"/><circle cx="12" cy="13.5" r="3.2"/>',
  spiritual: '<path d="M12 2c1.5 3 1.5 5-0 7 1.7 1.3 1.7 3.7 0 5-1.7-1.3-1.7-3.7 0-5-1.5-2-1.5-4 0-7z"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>'
};

const INTERESTS = [
  {id:'nature', label:'Nature & Scenery'},
  {id:'food', label:'Food & Local Eats'},
  {id:'nightlife', label:'Nightlife'},
  {id:'art', label:'Art & Culture'},
  {id:'adventure', label:'Adventure & Trekking'},
  {id:'wellness', label:'Relaxation & Wellness'},
  {id:'history', label:'History & Heritage'},
  {id:'offbeat', label:'Offbeat & Hidden'},
  {id:'photo', label:'Photography'},
  {id:'spiritual', label:'Spiritual & Sacred'}
];

// -------------------------------------------------------------
// STATE MANAGEMENT
// -------------------------------------------------------------
let state = {
  page: 'landing',          // landing | auth | home | compass | results | rewards | analytics
  authMode: 'login',        // login | register
  user: null,               // { name, email, points, badge, vouchers, token }
  interests: [],            // Active interest IDs
  destination: '',          // User typed query
  results: [],              // Recommended gems array [{ gem, score }]
  allVouchers: [],          // Vouchers list for rewards screen
  analyticsData: null,      // Statistics object
  activePlace: null,        // Selected gem object
  activePlaceReviews: [],   // Reviews for active place
  newReviewRating: 0,       // Hover/selected rating
  loading: false,
  errorMsg: ''
};

// -------------------------------------------------------------
// API CLIENT WRAPPER
// -------------------------------------------------------------
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  
  const token = state.user?.token || localStorage.getItem('vibe_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(endpoint, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  } catch (err) {
    console.error('API Error:', err.message);
    // Auto-logout on token expiration / unauthorized
    if (err.message.includes('token') || err.message.includes('unauthorized')) {
      logout();
    }
    throw err;
  }
}

// -------------------------------------------------------------
// AUTH OPERATIONS
// -------------------------------------------------------------
function logout() {
  localStorage.removeItem('vibe_token');
  state.user = null;
  state.interests = [];
  state.destination = '';
  state.results = [];
  state.page = 'landing';
  render();
}

async function checkSavedSession() {
  const token = localStorage.getItem('vibe_token');
  if (token) {
    try {
      state.loading = true;
      // We set a temporary token in state to allow apiCall to send it
      state.user = { token };
      const data = await apiCall('/api/auth/profile');
      state.user = { ...data.user, token };
      state.page = 'home';
    } catch (err) {
      console.log('Saved token invalid or expired');
      localStorage.removeItem('vibe_token');
      state.user = null;
    } finally {
      state.loading = false;
      render();
    }
  } else {
    render();
  }
}

// -------------------------------------------------------------
// GRAPHICS & HELPERS
// -------------------------------------------------------------
function starRow(rating) {
  const full = Math.round(rating);
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
}

function initials(name) {
  if (!name) return 'VC';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// -------------------------------------------------------------
// RENDER & HTML GENERATION
// -------------------------------------------------------------
function render() {
  const app = document.getElementById('app');
  app.innerHTML = topbarHTML() + navigationTabsHTML() + pageHTML() + footerHTML();
  attachEvents();
  if (state.page === 'compass') {
    layoutDial();
  }
}

function topbarHTML() {
  return `
  <div class="topbar">
    <div class="brand" id="brandLogo"><span class="dot"></span>Vibe Check<span class="brand-sub">travel, matched to you</span></div>
    <div class="top-actions">
      ${state.user ? `
        <div class="userchip" id="userChipBtn">
          <div class="avatar">${initials(state.user.name)}</div>
          ${state.user.name} (${state.user.points} pts)
        </div>
        <button class="btn btn-ghost" id="signOutBtn">Sign out</button>
      ` : `
        <button class="btn" id="signInTopBtn">Sign in</button>
      `}
    </div>
  </div>`;
}

function navigationTabsHTML() {
  if (!state.user || state.page === 'landing' || state.page === 'auth') return '';
  return `
  <div class="navigation-tabs">
    <button class="nav-tab ${state.page === 'compass' || state.page === 'results' ? 'active' : ''}" id="tabCompass">Vibe Compass</button>
    <button class="nav-tab ${state.page === 'rewards' ? 'active' : ''}" id="tabRewards">Rewards Club</button>
    <button class="nav-tab ${state.page === 'analytics' ? 'active' : ''}" id="tabAnalytics">Review Analytics</button>
  </div>`;
}

function footerHTML() {
  return `<div class="footer-note">Vibe Check — Global Place Discovery Platform Powered by AI Recommendations & Gamified Review Rewards.</div>`;
}

function pageHTML() {
  if (state.loading) {
    return `<div style="padding: 100px 0; text-align: center;"><div class="lede" style="font-style: italic; color: var(--sage)">Searching details...</div></div>`;
  }
  if (state.page === 'landing') return landingHTML();
  if (state.page === 'auth') return authHTML();
  if (state.page === 'home') return homeHTML();
  if (state.page === 'compass') return compassHTML();
  if (state.page === 'results') return resultsHTML();
  if (state.page === 'rewards') return rewardsHTML();
  if (state.page === 'analytics') return analyticsHTML();
  return '';
}

function landingHTML() {
  return `
  <section class="hero">
    <div class="hero-eyebrow">No more identical top-10 lists</div>
    <h1>Find the place<br>that actually fits<br><em>your kind of trip.</em></h1>
    <p class="lede">Tell Vibe Check what you're into — quiet nature, local food, hidden wellness retreats, or offbeat spots — and our recommendation engine surfaces high-rated, lesser-known gems, not the search engine junk.</p>
    <div class="hero-actions">
      <button class="btn btn-primary" id="getStartedBtn">Get started</button>
      <button class="btn" id="learnMoreBtn">See how it works</button>
    </div>
  </section>
  <div class="stripe">
    <div><div class="num">8</div><div class="lbl">States mapped</div></div>
    <div><div class="num">32</div><div class="lbl">Hidden gems</div></div>
    <div><div class="num">10</div><div class="lbl">Vibe categories</div></div>
    <div><div class="num">25pts</div><div class="lbl">Earned per review</div></div>
  </div>
  <section class="how" id="howSection">
    <div class="how-card"><div class="tag">Step one</div><h3>Set your vibe</h3><p>Select multiple vibe categories on the interactive compass like History, Wellness, Adventure, or Food.</p></div>
    <div class="how-card"><div class="tag">Step two</div><h3>Share reviews</h3><p>Post reviews to share real discovery findings and earn points. Earn +25 points specifically for "Hidden Gem" reviews.</p></div>
    <div class="how-card"><div class="tag">Step three</div><h3>Claim rewards</h3><p>Spend reward points to claim real vouchers like free guided walks, local tea invites, and boutique retreats discounts.</p></div>
  </section>`;
}

function authHTML() {
  const isLogin = state.authMode === 'login';
  return `
  <div class="auth-wrap">
    <div class="auth-card">
      <h2>${isLogin ? 'Sign in' : 'Create Account'}</h2>
      <p class="sub">${isLogin ? 'Welcome back! Enter your details to get traveling.' : 'Join VibeCheck, share discoveries & earn reward points.'}</p>
      
      ${state.errorMsg ? `<div style="color: var(--coral); font-size: 13px; margin-bottom: 15px; font-weight: 600;">${state.errorMsg}</div>` : ''}
      
      ${!isLogin ? `<div class="field"><label>Full Name</label><input id="authName" type="text" placeholder="e.g. Aanya Rao"></div>` : ''}
      <div class="field"><label>Email Address</label><input id="authEmail" type="email" placeholder="you@example.com"></div>
      <div class="field"><label>Password</label><input id="authPassword" type="password" placeholder="••••••••"></div>
      
      <button class="btn btn-primary" id="authSubmitBtn">${isLogin ? 'Sign In' : 'Sign Up'}</button>
      
      <p class="auth-note">
        ${isLogin ? `Don't have an account? <span class="auth-toggle-link" id="authToggleLink">Sign up here</span>` : `Already registered? <span class="auth-toggle-link" id="authToggleLink">Sign in here</span>`}
      </p>
    </div>
  </div>`;
}

function homeHTML() {
  const firstName = state.user.name.trim().split(/\s+/)[0];
  return `
  <section class="home-hero">
    <div class="greet">Welcome back, ${firstName} (${state.user.badge})</div>
    <h1>Where's the vibe<br>taking you today?</h1>
    <p>We analyze your past reviews and interest patterns to score and match places to your exact traveling needs. Open the compass to run a recommendation check.</p>
    <div style="display: flex; gap: 14px;">
      <button class="btn btn-primary" id="startCompassBtn">Start Vibe Check →</button>
      <button class="btn" id="viewRewardsBtn">View My Rewards</button>
    </div>
  </section>`;
}

function compassHTML() {
  const selectedLabels = INTERESTS.filter(i => state.interests.includes(i.id)).map(i => i.label);
  return `
  <section class="compass-block">
    <div class="section-label">Your vibe preferences</div>
    <div class="compass-wrap">
      <div class="dial" id="dial">
        <div class="dial-ring"></div>
        <div class="dial-ring inner"></div>
        <div class="dial-center"><div class="n">${state.interests.length}</div><div class="l">selected</div></div>
        ${INTERESTS.map(i => `
          <div class="dial-item ${state.interests.includes(i.id) ? 'active' : ''}" data-id="${i.id}">
            <div class="icon"><svg viewBox="0 0 24 24">${ICONS[i.id]}</svg></div>
            <div class="lbl">${i.label}</div>
          </div>`).join('')}
      </div>
      <div class="compass-side">
        <div class="selected-line">
          ${selectedLabels.length ? selectedLabels.join(' · ') : '<span class="none">Select interest areas on the compass ring</span>'}
        </div>
        <div class="dest-field">
          <label>Where are you looking to explore?</label>
          <input id="destInput" type="text" placeholder="Try Goa, Kerala, Ladakh, Rajasthan..." value="${state.destination}">
          <div class="dest-hint">Enter a mapped Indian state (Goa, Kerala, Rajasthan, Himachal Pradesh, Ladakh, Tamil Nadu, Meghalaya, Uttarakhand) or leave blank to search globally.</div>
        </div>
        
        ${state.errorMsg ? `<div style="color: var(--coral); font-size: 13px; margin-bottom: 12px;">${state.errorMsg}</div>` : ''}
        
        <button class="btn btn-primary" id="findVibeBtn" ${state.interests.length === 0 ? 'disabled' : ''}>Calculate Recommendations →</button>
      </div>
    </div>
  </section>`;
}

function resultsHTML() {
  return `
  <div class="results-head">
    <div>
      <h2>AI Vibe Matches ${state.destination ? `in ${state.destination}` : 'Globally'}</h2>
      <div class="meta">Showing ${state.results.length} spots matched to your selected preference patterns.</div>
    </div>
    <button class="btn" id="backToCompassBtn">← Adjust Compass</button>
  </div>
  
  ${state.results.length === 0 ? `
    <div class="empty">
      <h3>No matches found</h3>
      <p>We couldn't find any places matching your query. Try searching Goa, Kerala, Ladakh, or Uttarakhand.</p>
    </div>
  ` : `
    <div class="grid">
      ${state.results.map(r => cardHTML(r.gem, r.score)).join('')}
    </div>
  `}
  
  <div class="back-row">
    <button class="btn" id="newSearchBtn">Reset Compass</button>
  </div>`;
}

function cardHTML(gem, score) {
  const hue1 = 150 + (gem.name.length * 7) % 40;
  const hue2 = hue1 + 30;
  const isGem = gem.gem >= 0.8;
  
  // Convert custom calculated score (usually 10-35) into a readable match %
  // E.g. cap it between 50% and 99%
  const matchPercent = Math.min(99, Math.max(50, Math.round(score * 2.8)));

  return `
  <div class="card" onclick="openDetailsModal('${encodeURIComponent(gem.name)}')">
    <div class="card-scene" style="background:linear-gradient(135deg, hsl(${hue1} 45% 55%), hsl(${hue2} 55% 40%));">
      <span class="card-area">${gem.area}</span>
      ${isGem ? `<span class="stamp"><svg viewBox="0 0 24 24"><path d="M12 2l2.4 6.6L21 10l-5 4.4L17.4 21 12 17.3 6.6 21 8 14.4 3 10l6.6-1.4z"/></svg>Hidden gem</span>` : ''}
      <span class="match-badge">${matchPercent}% Vibe Match</span>
    </div>
    <div class="card-body" style="padding-top: 24px;">
      <h3>${gem.name}</h3>
      <p class="blurb">${gem.blurb}</p>
      <div class="card-meta">
        <div class="rating">
          <span class="stars">${starRow(gem.rating)}</span>
          <span class="rn">${gem.rating.toFixed(1)}</span>
          <span class="rc">(${gem.reviewsCount} reviews)</span>
        </div>
      </div>
      <div class="tagrow">
        ${gem.tags.map(t => `<span class="tagchip ${state.interests.includes(t) ? 'hit' : ''}">${INTERESTS.find(i => i.id === t)?.label || t}</span>`).join('')}
      </div>
    </div>
  </div>`;
}

function rewardsHTML() {
  return `
  <div class="rewards-header">
    <div class="points-balance">
      <div class="score">${state.user.points}</div>
      <div class="lbl">
        <div>Total Points</div>
        <div class="badge-name">${state.user.badge}</div>
      </div>
    </div>
    <div style="max-width: 400px; text-align: right;">
      <p style="margin: 0; font-size: 13.5px; color: var(--muted); line-height: 1.5;">
        You earn points by reviewing places. Reviews on <b style="color: var(--gold)">Hidden Gems</b> score a double bonus of <b style="color: var(--coral)">+25 points</b>! Redemptions subtract points immediately.
      </p>
    </div>
  </div>

  <h3 class="rewards-subheading">Available Vouchers</h3>
  <div class="vouchers-grid">
    ${state.allVouchers.map(v => `
      <div class="voucher-card">
        <div>
          <h4>${v.name}</h4>
          <p>${v.description}</p>
        </div>
        <div class="voucher-bottom">
          <span class="cost-badge">${v.cost} Points</span>
          <button class="btn btn-primary" style="padding: 7px 16px; font-size: 12px;" 
            id="redeemBtn-${v.id}"
            ${state.user.points < v.cost ? 'disabled' : ''}>
            Redeem
          </button>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="redeemed-codes-section">
    <h3 style="font-family: 'Fraunces', serif; margin-top: 0; margin-bottom: 16px;">Your Redeemed Vouchers</h3>
    ${!state.user.vouchers || state.user.vouchers.length === 0 ? `
      <p style="color: var(--muted); font-size: 14px; margin: 0; font-style: italic;">No vouchers claimed yet. Get reviewing to rack up points!</p>
    ` : `
      <div class="redeemed-list">
        ${state.user.vouchers.map(rv => `
          <div class="redeemed-item">
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">${rv.name}</div>
              <div style="font-size: 11.5px; color: var(--muted);">Redeemed on ${new Date(rv.redeemedAt).toLocaleDateString()}</div>
            </div>
            <div class="code">${rv.code}</div>
          </div>
        `).join('')}
      </div>
    `}
  </div>`;
}

function analyticsHTML() {
  if (!state.analyticsData) return '<div class="empty"><h3>Analytics database loading...</h3></div>';

  const data = state.analyticsData;
  
  // Calculate total points given
  const mostPopularVibe = Object.entries(data.vibeCounts).sort((a,b)=>b[1]-a[1])[0];
  const popularVibeLabel = mostPopularVibe ? INTERESTS.find(i=>i.id===mostPopularVibe[0])?.label : 'None';

  return `
  <div class="results-head" style="padding: 30px 0 6px;">
    <h2>Review Analytics & Insights</h2>
  </div>

  <div class="analytics-grid">
    <div class="analytics-stat-card">
      <div class="val">${data.totalReviews}</div>
      <div class="lbl">Global Reviews Posted</div>
    </div>
    <div class="analytics-stat-card">
      <div class="val">${data.avgRating}★</div>
      <div class="lbl">Average Rating Score</div>
    </div>
    <div class="analytics-stat-card">
      <div class="val">${popularVibeLabel || 'N/A'}</div>
      <div class="lbl">Most Reviewed Vibe Tag</div>
    </div>
  </div>

  <div class="analytics-charts">
    <div class="chart-card">
      <h3>Popular Vibes Breakdown (Reviews count)</h3>
      ${INTERESTS.map(i => {
        const count = data.vibeCounts[i.id] || 0;
        const percent = data.totalReviews > 0 ? (count / data.totalReviews) * 100 : 0;
        return `
          <div class="chart-bar-row">
            <div class="chart-bar-label">
              <span>${i.label}</span>
              <b>${count} review${count!==1?'s':''}</b>
            </div>
            <div class="chart-bar-bg">
              <div class="chart-bar-fill" style="width: ${percent}%"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="chart-card" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <h3>Travel Rewards Leaderboard</h3>
        <div class="leaderboard-list">
          ${data.leaderboard.map((user, idx) => `
            <div class="leaderboard-item">
              <div style="display: flex; align-items: center;">
                <span class="pos">${idx+1}</span>
                <div>
                  <div style="font-weight: 600; font-size: 13.5px;">${user.name}</div>
                  <div style="font-size: 11px; color: var(--muted);">${user.badge}</div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 700; color: var(--gold); font-size: 14px;">${user.points} pts</div>
                <div style="font-size: 10px; color: var(--muted);">${user.reviewsCount} review${user.reviewsCount!==1?'s':''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div style="margin-top: 24px;">
        <h3 style="border-bottom: none; margin-bottom: 12px; padding-bottom: 0;">Rating Profile Distributions</h3>
        ${[5,4,3,2,1].map(stars => {
          const count = data.ratingsDistribution[stars] || 0;
          const totalRatingCount = Object.values(data.ratingsDistribution).reduce((a,b)=>a+b, 0);
          const percent = totalRatingCount > 0 ? (count / totalRatingCount) * 100 : 0;
          return `
            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 6px;">
              <span style="width: 48px; color: var(--muted); text-align: right;">${stars} Stars</span>
              <div class="chart-bar-bg" style="flex: 1; height: 6px;">
                <div class="chart-bar-fill highlight" style="width: ${percent}%;"></div>
              </div>
              <span style="width: 24px; text-align: left; color: var(--muted);">${count}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  </div>`;
}

// -------------------------------------------------------------
// PLACE DETAILS MODAL RENDER & WORKFLOWS
// -------------------------------------------------------------
async function openDetailsModal(encodedName) {
  const name = decodeURIComponent(encodedName);
  state.activePlace = null;
  state.activePlaceReviews = [];
  state.newReviewRating = 0;
  
  const backdrop = document.getElementById('detailsModal');
  const content = document.getElementById('detailsModalContent');
  
  backdrop.classList.add('open');
  content.innerHTML = `<div style="padding: 60px; text-align: center;"><div class="lbl" style="font-style: italic;">Loading place insights...</div></div>`;

  try {
    const data = await apiCall(`/api/places/gem/${encodeURIComponent(name)}`);
    state.activePlace = data.gem;
    state.activePlaceReviews = data.reviews;
    
    renderModalContent();
  } catch (err) {
    content.innerHTML = `
      <button class="modal-close" onclick="closeDetailsModal()">×</button>
      <div style="padding: 40px; text-align: center; color: var(--coral);">
        <h3>Failed to load gem details</h3>
        <p>${err.message}</p>
      </div>`;
  }
}

function closeDetailsModal() {
  document.getElementById('detailsModal').classList.remove('open');
}

function renderModalContent() {
  const content = document.getElementById('detailsModalContent');
  if (!state.activePlace) return;

  const gem = state.activePlace;
  const reviews = state.activePlaceReviews;
  const isGem = gem.gem >= 0.8;
  const alreadyReviewed = reviews.some(r => r.userEmail === state.user?.email);

  const hue1 = 150 + (gem.name.length * 7) % 40;
  const hue2 = hue1 + 30;

  content.innerHTML = `
    <button class="modal-close" onclick="closeDetailsModal()">×</button>
    <div class="modal-hero" style="background: linear-gradient(135deg, hsl(${hue1} 45% 45%), hsl(${hue2} 55% 30%));">
      <div class="area-label">${gem.area} · ${gem.destination.toUpperCase()}</div>
      <h2>${gem.name}</h2>
    </div>
    <div class="modal-body">
      <div class="modal-description">
        ${gem.blurb}
      </div>
      
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px;">
        ${isGem ? `<span class="stamp" style="font-size: 11px;"><svg viewBox="0 0 24 24"><path d="M12 2l2.4 6.6L21 10l-5 4.4L17.4 21 12 17.3 6.6 21 8 14.4 3 10l6.6-1.4z"/></svg>Hidden Gem (Earns double rewards!)</span>` : ''}
        <span class="stamp" style="font-size: 11px; color: var(--sage); border-color: var(--sage);"><svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Rating: ${gem.rating} / 5</span>
      </div>

      <div class="tagrow" style="margin-bottom: 30px;">
        ${gem.tags.map(t => `<span class="tagchip">${INTERESTS.find(i => i.id === t)?.label || t}</span>`).join('')}
      </div>

      <h3 class="reviews-section-title">
        <span>Community Reviews</span>
        <span style="font-size: 14px; color: var(--muted); font-family: 'Public Sans'; font-weight: normal;">${reviews.length} reviews posted</span>
      </h3>

      <div id="modalReviewsList">
        ${reviews.length === 0 ? `
          <p style="color: var(--muted); font-size: 14.5px; font-style: italic; margin-bottom: 24px;">No reviews yet. Be the first to share your experience!</p>
        ` : `
          <div class="reviews-list">
            ${reviews.map(r => `
              <div class="review-item">
                <div class="review-meta">
                  <span class="reviewer-name">${r.userName} <span class="stars" style="font-size:11px; margin-left: 6px;">${starRow(r.rating)}</span></span>
                  <span class="review-date">${new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="review-comment">${r.comment}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      ${!state.user ? `
        <div style="background: var(--bg-card); padding: 18px; border-radius: 8px; text-align: center; margin-top: 30px; border: 1px dashed var(--line);">
          <span style="font-size: 13.5px; color: var(--muted);">Please <span class="auth-toggle-link" onclick="closeDetailsModal(); state.page='auth'; render();">sign in</span> to post a review and claim points.</span>
        </div>
      ` : alreadyReviewed ? `
        <div style="background: rgba(127,169,143,0.06); padding: 16px; border-radius: 8px; text-align: center; margin-top: 30px; border: 1px solid var(--line);">
          <span style="font-size: 13.5px; color: var(--sage); font-weight: 500;">✓ You have already reviewed this location. Thanks for making VibeCheck better!</span>
        </div>
      ` : `
        <form class="review-form" id="newReviewForm" onsubmit="submitReview(event)">
          <h3>Write a review</h3>
          <div class="field">
            <label>Select Rating</label>
            <div class="star-rating-select" id="starRatingSelect">
              <span data-val="1">★</span><span data-val="2">★</span><span data-val="3">★</span><span data-val="4">★</span><span data-val="5">★</span>
            </div>
          </div>
          <div class="field">
            <label>Share your experience</label>
            <textarea id="reviewComment" rows="3" required style="width:100%; background:var(--bg); border:1px solid var(--line-strong); border-radius:8px; padding:12px 14px; color:var(--cream); font-family:inherit; font-size:14px; resize: none; margin-top:6px;" placeholder="Tell other travelers about the road conditions, crowd, sunset timing..."></textarea>
          </div>
          <div id="reviewError" style="color: var(--coral); font-size: 12px; margin-bottom: 12px; display: none;"></div>
          <button class="btn btn-primary" type="submit" style="width:100%; padding:12px;">Submit Review & Claim Rewards</button>
        </form>
      `}
    </div>`;

  setupStarEvents();
}

function setupStarEvents() {
  const stars = document.querySelectorAll('#starRatingSelect span');
  stars.forEach(s => {
    s.onclick = () => {
      const val = parseInt(s.getAttribute('data-val'));
      state.newReviewRating = val;
      updateStarsUI(val);
    };
    s.onmouseenter = () => {
      const val = parseInt(s.getAttribute('data-val'));
      updateStarsUI(val);
    };
  });

  const starContainer = document.getElementById('starRatingSelect');
  if (starContainer) {
    starContainer.onmouseleave = () => {
      updateStarsUI(state.newReviewRating);
    };
  }
}

function updateStarsUI(val) {
  const stars = document.querySelectorAll('#starRatingSelect span');
  stars.forEach(s => {
    const starVal = parseInt(s.getAttribute('data-val'));
    if (starVal <= val) {
      s.classList.add('selected');
    } else {
      s.classList.remove('selected');
    }
  });
}

async function submitReview(e) {
  e.preventDefault();
  const errorEl = document.getElementById('reviewError');
  errorEl.style.display = 'none';

  if (state.newReviewRating === 0) {
    errorEl.textContent = 'Please choose a star rating.';
    errorEl.style.display = 'block';
    return;
  }

  const comment = document.getElementById('reviewComment').value.trim();
  if (comment.length < 5) {
    errorEl.textContent = 'Review content must be at least 5 characters.';
    errorEl.style.display = 'block';
    return;
  }

  try {
    const gemName = state.activePlace.name;
    const res = await apiCall(`/api/places/gem/${encodeURIComponent(gemName)}/reviews`, 'POST', {
      rating: state.newReviewRating,
      comment: comment
    });

    alert(res.message); // Nice feedback notification for reward points earned!
    
    // Update local state details
    state.activePlace = res.updatedGem;
    state.activePlaceReviews.push(res.review);
    
    // Sync points and user details
    state.user.points = res.updatedPoints;
    state.user.badge = res.updatedBadge;

    renderModalContent();
    
    // If the results page is active, let's refresh results behind the modal
    if (state.page === 'results') {
      const idx = state.results.findIndex(r => r.gem.name === gemName);
      if (idx !== -1) {
        state.results[idx].gem = res.updatedGem;
      }
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
}

// -------------------------------------------------------------
// DIAL LAYOUT (circular positioning)
// -------------------------------------------------------------
function layoutDial() {
  const dial = document.getElementById('dial');
  if (!dial) return;
  if (window.innerWidth <= 760) return; // Flex fallback on mobile

  const items = dial.querySelectorAll('.dial-item');
  const n = items.length;
  const radius = 148;
  const cx = 160, cy = 160;
  
  items.forEach((el, idx) => {
    const angle = (idx / n) * 2 * Math.PI - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  });
}

window.addEventListener('resize', () => {
  if (state.page === 'compass') {
    layoutDial();
  }
});

// -------------------------------------------------------------
// NAVIGATION & PAGE LOADS
// -------------------------------------------------------------
async function navigateToRewards() {
  try {
    state.loading = true;
    render();
    
    const [profileData, vouchersData] = await Promise.all([
      apiCall('/api/auth/profile'),
      apiCall('/api/vouchers')
    ]);
    
    state.user = { ...state.user, ...profileData.user };
    state.allVouchers = vouchersData;
    state.page = 'rewards';
  } catch (err) {
    console.error('Failed to load rewards view', err);
  } finally {
    state.loading = false;
    render();
  }
}

async function navigateToAnalytics() {
  try {
    state.loading = true;
    render();
    
    const data = await apiCall('/api/analytics');
    state.analyticsData = data;
    state.page = 'analytics';
  } catch (err) {
    console.error('Failed to load analytics dashboard', err);
  } finally {
    state.loading = false;
    render();
  }
}

async function runRecommendationEngine() {
  try {
    state.loading = true;
    state.errorMsg = '';
    render();

    // Query endpoint
    let url = `/api/recommendations?interests=${state.interests.join(',')}`;
    if (state.destination.trim()) {
      url += `&destination=${encodeURIComponent(state.destination.trim())}`;
    }

    const data = await apiCall(url);
    state.results = data;
    state.page = 'results';
  } catch (err) {
    state.errorMsg = err.message;
    state.page = 'compass';
  } finally {
    state.loading = false;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// -------------------------------------------------------------
// EVENT ATTACHMENTS
// -------------------------------------------------------------
function attachEvents() {
  const $ = id => document.getElementById(id);

  // Auth Page Switch
  if ($('authToggleLink')) {
    $('authToggleLink').onclick = () => {
      state.authMode = state.authMode === 'login' ? 'register' : 'login';
      state.errorMsg = '';
      render();
    };
  }

  // Auth Submission
  if ($('authSubmitBtn')) {
    $('authSubmitBtn').onclick = async () => {
      const email = $('authEmail').value.trim();
      const password = $('authPassword').value.trim();
      
      if (!email || !password) {
        state.errorMsg = 'Please complete all credentials fields.';
        render();
        return;
      }

      if (state.authMode === 'register') {
        const name = $('authName').value.trim();
        if (!name) {
          state.errorMsg = 'Name is required.';
          render();
          return;
        }
        
        try {
          state.loading = true;
          render();
          const res = await apiCall('/api/auth/register', 'POST', { name, email, password });
          state.user = res.user;
          state.user.token = res.token;
          localStorage.setItem('vibe_token', res.token);
          state.page = 'home';
        } catch (err) {
          state.errorMsg = err.message;
        } finally {
          state.loading = false;
          render();
        }
      } else {
        try {
          state.loading = true;
          render();
          const res = await apiCall('/api/auth/login', 'POST', { email, password });
          state.user = res.user;
          state.user.token = res.token;
          localStorage.setItem('vibe_token', res.token);
          state.page = 'home';
        } catch (err) {
          state.errorMsg = err.message;
        } finally {
          state.loading = false;
          render();
        }
      }
    };
  }

  // Topbar Actions
  if ($('signInTopBtn')) $('signInTopBtn').onclick = () => { state.page = 'auth'; state.authMode = 'login'; render(); };
  if ($('signOutBtn')) $('signOutBtn').onclick = logout;
  if ($('brandLogo')) $('brandLogo').onclick = () => { state.page = state.user ? 'home' : 'landing'; render(); };
  if ($('userChipBtn')) $('userChipBtn').onclick = navigateToRewards;

  // Landing Page Buttons
  if ($('getStartedBtn')) $('getStartedBtn').onclick = () => { state.page = state.user ? 'compass' : 'auth'; render(); };
  if ($('learnMoreBtn')) $('learnMoreBtn').onclick = () => { $('howSection').scrollIntoView({ behavior: 'smooth' }); };

  // Home Page Buttons
  if ($('startCompassBtn')) $('startCompassBtn').onclick = () => { state.page = 'compass'; render(); };
  if ($('viewRewardsBtn')) $('viewRewardsBtn').onclick = navigateToRewards;

  // Tabs Navigation
  if ($('tabCompass')) $('tabCompass').onclick = () => { state.page = 'compass'; render(); };
  if ($('tabRewards')) $('tabRewards').onclick = navigateToRewards;
  if ($('tabAnalytics')) $('tabAnalytics').onclick = navigateToAnalytics;

  // Dial Items Toggles
  document.querySelectorAll('.dial-item').forEach(el => {
    el.onclick = () => {
      const id = el.getAttribute('data-id');
      const idx = state.interests.indexOf(id);
      if (idx > -1) {
        state.interests.splice(idx, 1);
      } else {
        state.interests.push(id);
      }
      render();
    };
  });

  // Compass Controls
  if ($('destInput')) {
    $('destInput').oninput = (e) => { state.destination = e.target.value; };
    $('destInput').onkeydown = (e) => {
      if (e.key === 'Enter' && state.interests.length) {
        runRecommendationEngine();
      }
    };
  }

  if ($('findVibeBtn')) {
    $('findVibeBtn').onclick = runRecommendationEngine;
  }

  // Results Controls
  if ($('backToCompassBtn')) $('backToCompassBtn').onclick = () => { state.page = 'compass'; render(); };
  if ($('newSearchBtn')) {
    $('newSearchBtn').onclick = () => {
      state.interests = [];
      state.destination = '';
      state.results = [];
      state.page = 'compass';
      render();
    };
  }

  // Redeem Voucher Buttons
  state.allVouchers.forEach(v => {
    const el = $(`redeemBtn-${v.id}`);
    if (el) {
      el.onclick = async () => {
        try {
          const res = await apiCall('/api/auth/redeem', 'POST', { voucherId: v.id });
          alert(`Success! Voucher redeemed.\nYour code is: ${res.voucherCode}`);
          state.user = res.user;
          navigateToRewards();
        } catch (err) {
          alert(`Redemption failed: ${err.message}`);
        }
      };
    }
  });
}

// -------------------------------------------------------------
// INITIAL STARTUP
// -------------------------------------------------------------
checkSavedSession();
