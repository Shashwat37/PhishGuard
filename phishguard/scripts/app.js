// app.js — Main orchestrator: wires auth, gmail, analyzer, and UI together

import { initAuth, signIn, signOut, getAccessToken } from './auth.js';
import { fetchEmailList, fetchEmailDetail, parseEmail } from './gmail.js';
import { analyzeEmail } from './analyzer.js';
import { renderStats, renderEmailList, renderDetail, showEmptyDetail, openHelpModal } from './ui.js';
import { GOOGLE_CLIENT_ID } from '../config.js';

let scanResults = [];
let isScanning = false;

// ── Custom Cursor ──────────────────────────────────────────────
function initCursor() {
  const dot  = document.createElement('div');
  const ring = document.createElement('div');
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    gsap.set(dot, { x: mouseX, y: mouseY });
  });

  // Smooth ring follow
  function animateRing() {
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;
    gsap.set(ring, { x: ringX, y: ringY });
    requestAnimationFrame(animateRing);
  }
  animateRing();

  // Expand cursor on interactive elements
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('button, a, .email-row, .btn-scan, .btn-google')) {
      gsap.to(ring, { width: 48, height: 48, opacity: 0.3, duration: 0.2 });
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('button, a, .email-row, .btn-scan, .btn-google')) {
      gsap.to(ring, { width: 28, height: 28, opacity: 0.5, duration: 0.2 });
    }
  });
}

// ── Auth Flow ──────────────────────────────────────────────────
function onAuthSuccess(token, email) {
  showDashboard(email);
}

function onAuthSignOut() {
  showLoginScreen();
}

function showDashboard(userEmail) {
  const loginScreen = document.getElementById('login-screen');
  const dashboard   = document.getElementById('dashboard');

  gsap.to(loginScreen, {
    opacity: 0,
    y: -30,
    duration: 0.4,
    onComplete: () => {
      loginScreen.style.display = 'none';
      dashboard.style.display = 'block';

      // Update connected status
      const statusEl = document.getElementById('navbar-status');
      if (statusEl) {
        statusEl.textContent = userEmail;
        statusEl.classList.add('connected');
      }

      // Animate dashboard in
      gsap.from('#dashboard > *', {
        opacity: 0,
        y: 24,
        duration: 0.5,
        stagger: 0.08
      });

      // Show empty detail state
      showEmptyDetail();
    }
  });
}

function showLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const dashboard   = document.getElementById('dashboard');
  
  dashboard.style.display = 'none';
  loginScreen.style.display = 'flex';
  loginScreen.style.opacity = '1';
  
  gsap.from('#login-screen > *', {
    opacity: 0,
    y: 20,
    duration: 0.5,
    stagger: 0.1
  });
}

// ── Scan Logic ─────────────────────────────────────────────────
async function runScan() {
  const token = getAccessToken();
  if (!token || isScanning) return;

  isScanning = true;
  const btn = document.getElementById('btn-scan');
  btn.disabled = true;
  btn.textContent = 'SCANNING...';
  showLoading(true);

  try {
    // 1. Fetch email list
    updateLoadingText('CONNECTING TO GMAIL...');
    const msgList = await fetchEmailList(token, 25);
    
    if (msgList.length === 0) {
      showToast('No emails found in inbox', 'error');
      return;
    }

    updateLoadingText(`FETCHING ${msgList.length} EMAILS...`);

    // 2. Fetch full details + parse
    const emails = [];
    for (let i = 0; i < msgList.length; i++) {
      updateLoadingProgress((i / msgList.length) * 50);
      updateLoadingSub(`Email ${i + 1} of ${msgList.length}`);
      try {
        const raw = await fetchEmailDetail(token, msgList[i].id);
        emails.push(parseEmail(raw));
      } catch (err) {
        console.warn(`Failed to fetch email ${msgList[i].id}:`, err);
      }
    }

    // 3. Analyze each email (instant rule-based — no API calls)
    updateLoadingText('SCANNING FOR PHISHING...');
    const results = [];
    for (let i = 0; i < emails.length; i++) {
      updateLoadingProgress(50 + (i / emails.length) * 45);
      updateLoadingSub(`Analyzing ${i + 1} of ${emails.length}`);
      const result = analyzeEmail(emails[i]);
      results.push(result);
    }

    updateLoadingProgress(98);
    updateLoadingText('RENDERING RESULTS...');

    // 4. Sort by risk score (highest first)
    results.sort((a, b) => b.riskScore - a.riskScore);
    scanResults = results;

    // 5. Render
    renderStats(results);
    renderEmailList(results);

    // 6. Update last scan time
    const now = new Date();
    document.getElementById('last-scan').textContent =
      `LAST SCAN: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // 7. Count threats
    const threats = results.filter(r => r.riskLevel === 'HIGH').length;
    if (threats > 0) {
      showToast(`⚠ ${threats} high-risk email${threats > 1 ? 's' : ''} detected!`, 'error');
    } else {
      showToast('✓ Scan complete — no high-risk emails found', 'success');
    }

  } catch (err) {
    console.error('Scan failed:', err);
    showToast('Scan failed. Check console for details.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'RUN SCAN';
    isScanning = false;
    showLoading(false);
  }
}

// ── Loading UI ─────────────────────────────────────────────────
function showLoading(show) {
  const el = document.getElementById('loading-overlay');
  if (show) {
    el.style.display = 'flex';
    gsap.from(el, { opacity: 0, duration: 0.3 });
  } else {
    gsap.to(el, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => { el.style.display = 'none'; el.style.opacity = '1'; }
    });
  }
}

function updateLoadingText(text) {
  const el = document.querySelector('.loading-text');
  if (el) el.textContent = text;
}

function updateLoadingSub(text) {
  const el = document.querySelector('.loading-sub');
  if (el) el.textContent = text;
}

function updateLoadingProgress(pct) {
  gsap.to('.loading-bar__fill', { width: pct + '%', duration: 0.3, ease: 'power1.out' });
}

// ── Toast Notification ─────────────────────────────────────────
function showToast(message, type = 'info') {
  // Remove existing toast
  document.querySelector('.toast')?.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ── Initialization ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Init custom cursor
  initCursor();

  // Animate login screen
  gsap.from('#login-screen > *', {
    opacity: 0,
    y: 30,
    duration: 0.6,
    stagger: 0.12,
    delay: 0.3
  });

  // Bind events
  document.getElementById('btn-scan')?.addEventListener('click', runScan);
  document.getElementById('btn-google-signin')?.addEventListener('click', signIn);
  document.getElementById('btn-signout')?.addEventListener('click', () => {
    signOut();
    scanResults = [];
  });
  document.getElementById('btn-help')?.addEventListener('click', openHelpModal);

  // Check if config is set
  if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
    console.warn('⚠ Phishing Email Detector: Set your GOOGLE_CLIENT_ID in config.js');
    const sub = document.querySelector('.login-screen__sub');
    if (sub) {
      sub.innerHTML += '<br><br><strong style="color: var(--accent);">⚠ Set your API keys in config.js first</strong>';
    }
  }
});

// ── Google Auth Library Load Callback ──────────────────────────
window.onGoogleLibraryLoad = () => {
  if (GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
    initAuth(GOOGLE_CLIENT_ID, onAuthSuccess, onAuthSignOut);
  }
};

// Make signIn available globally for the button
window.handleGoogleSignIn = signIn;
