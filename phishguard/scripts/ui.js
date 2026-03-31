// ui.js — DOM rendering with zarcerog-inspired design & GSAP animations

function renderStats(results) {
  const counts = {
    total:      results.length,
    safe:       results.filter(r => r.riskLevel === 'SAFE' || r.riskLevel === 'LOW').length,
    suspicious: results.filter(r => r.riskLevel === 'SUSPICIOUS').length,
    high:       results.filter(r => r.riskLevel === 'HIGH').length
  };

  // Animate numbers counting up with GSAP
  Object.entries(counts).forEach(([key, val]) => {
    const el = document.getElementById(`stat-${key}`);
    if (el) {
      gsap.to({ n: 0 }, {
        n: val,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate() {
          el.textContent = String(Math.round(this.targets()[0].n)).padStart(3, '0');
        }
      });
    }
  });
}

function riskBadge(level) {
  const map = {
    HIGH:       { cls: 'badge--high',       label: '● HIGH' },
    SUSPICIOUS: { cls: 'badge--suspicious', label: '◐ WARN' },
    LOW:        { cls: 'badge--low',        label: '◌ LOW'  },
    SAFE:       { cls: 'badge--safe',       label: '○ SAFE' }
  };
  const { cls, label } = map[level] || map['SAFE'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderEmailList(results, onSelectCallback) {
  const list = document.getElementById('email-list');
  list.innerHTML = '';

  if (results.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">◇</div>
        <div class="empty-state__text">NO EMAILS SCANNED YET</div>
        <div class="empty-state__sub">Click RUN SCAN to analyze your inbox</div>
      </div>
    `;
    return;
  }

  results.forEach((email, i) => {
    const row = document.createElement('div');
    row.className = `email-row email-row--${email.riskLevel.toLowerCase()}`;
    row.id = `email-row-${i}`;
    row.innerHTML = `
      <div class="email-row__badge">${riskBadge(email.riskLevel)}</div>
      <div class="email-row__meta">
        <span class="email-row__sender">${escapeHtml(email.senderName || email.senderEmail)}</span>
        <span class="email-row__subject">${escapeHtml(email.subject)}</span>
      </div>
      <div class="email-row__score">${email.riskScore}<span>/100</span></div>
    `;
    row.addEventListener('click', () => {
      document.querySelectorAll('.email-row').forEach(r => r.classList.remove('active'));
      row.classList.add('active');
      renderDetail(email);
    });
    list.appendChild(row);
  });

  // Stagger animate in
  gsap.from('.email-row', { opacity: 0, x: -20, duration: 0.4, stagger: 0.04 });

  // Auto-select first email
  if (results.length > 0) {
    document.querySelector('.email-row')?.classList.add('active');
    renderDetail(results[0]);
  }
}

function renderDetail(email) {
  const panel = document.getElementById('detail-panel');

  const flagsHTML = email.flags.length
    ? email.flags.map(f => `<li class="flag-item">▸ ${escapeHtml(f)}</li>`).join('')
    : '<li class="flag-item flag-item--safe">No suspicious signals detected</li>';

  const barWidth = email.riskScore + '%';
  const barClass = email.riskLevel === 'HIGH' ? 'bar--danger'
                 : (email.riskLevel === 'SUSPICIOUS' ? 'bar--warn' : 'bar--safe');

  const actionClass = email.riskLevel === 'HIGH' ? 'action-tag--high'
                    : (email.riskLevel === 'SUSPICIOUS' ? 'action-tag--suspicious'
                    : (email.riskLevel === 'LOW' ? 'action-tag--low' : 'action-tag--safe'));

  // Build links sandbox section
  const linksHTML = (email.links && email.links.length > 0)
    ? `
      <div class="detail__divider"></div>
      <div class="detail__links-section">
        <span class="detail__label">LINKS FOUND (${email.links.length})</span>
        <ul class="link-list" id="sandbox-link-list">
          ${email.links.map((link, idx) => `
            <li class="link-item">
              <span class="link-item__url" title="${escapeHtml(link)}">${escapeHtml(link)}</span>
              <button class="btn-sandbox" data-sandbox-url="${escapeHtml(link)}" type="button">
                ◈ SANDBOX
              </button>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : '';

  // Build security tips section
  const tips = email.securityTips || [];
  const tipsHTML = tips.length > 0
    ? `
      <div class="detail__divider"></div>
      <div class="security-tips">
        <span class="detail__label">🛡️ SECURITY TIPS</span>
        <ul class="security-tips__list">
          ${tips.map((tip, idx) => {
            const tipClass = email.riskLevel === 'HIGH' ? 'security-tip--danger'
                           : (email.riskLevel === 'SUSPICIOUS' ? 'security-tip--warn' : 'security-tip--safe');
            return `
              <li class="security-tip ${tipClass}">
                <span class="security-tip__icon">💡</span>
                <span class="security-tip__text">${escapeHtml(tip)}</span>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    ` : '';

  panel.innerHTML = `
    <div class="detail__header">
      <div class="detail__risk-level">${email.riskLevel}</div>
      ${riskBadge(email.riskLevel)}
    </div>

    <div class="detail__field">
      <span class="detail__label">FROM</span>
      <span class="detail__value">${escapeHtml(email.senderName)} &lt;${escapeHtml(email.senderEmail)}&gt;</span>
    </div>
    <div class="detail__field">
      <span class="detail__label">SUBJECT</span>
      <span class="detail__value">${escapeHtml(email.subject)}</span>
    </div>
    <div class="detail__field">
      <span class="detail__label">DATE</span>
      <span class="detail__value">${escapeHtml(email.date)}</span>
    </div>

    <div class="detail__divider"></div>

    <div class="detail__score-section">
      <span class="detail__label">RISK SCORE</span>
      <div class="score-bar">
        <div class="score-bar__fill ${barClass}" style="width: 0%"
             data-target="${barWidth}"></div>
      </div>
      <span class="score-number">${email.riskScore}<span>/100</span></span>
    </div>

    <div class="detail__divider"></div>

    <div class="detail__flags">
      <span class="detail__label">RULES TRIGGERED (${email.flags.length})</span>
      <ul class="flags-list">${flagsHTML}</ul>
    </div>

    <div class="detail__divider"></div>

    <div class="detail__explanation">
      <span class="detail__label">ANALYSIS</span>
      <p>${escapeHtml(email.explanation || 'No analysis available.')}</p>
    </div>

    <div class="detail__action">
      <span class="detail__label">RECOMMENDED ACTION</span>
      ${email.action === 'VERIFY SENDER'
        ? `<button class="action-tag action-tag--clickable ${actionClass}" id="btn-verify-sender" type="button">
             <span class="action-tag__icon">◈</span> ${escapeHtml(email.action)}
             <span class="action-tag__hint">CLICK TO VERIFY</span>
           </button>`
        : `<div class="action-tag ${actionClass}">${escapeHtml(email.action || 'N/A')}</div>`
      }
    </div>

    ${linksHTML}
    ${tipsHTML}
  `;

  // Animate score bar fill
  requestAnimationFrame(() => {
    gsap.to('.score-bar__fill', {
      width: barWidth, duration: 1, ease: 'power2.out', delay: 0.2
    });
  });

  // Animate detail children in
  gsap.from('#detail-panel > *', {
    opacity: 0, y: 12, duration: 0.35, stagger: 0.06
  });

  // Bind sandbox buttons via event delegation
  requestAnimationFrame(() => {
    document.querySelectorAll('.btn-sandbox').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-sandbox-url');
        if (url) openSandbox(url);
      });
    });

    // Bind Verify Sender button
    const verifyBtn = document.getElementById('btn-verify-sender');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => openVerifySender(email));
    }
  });
}

function showEmptyDetail() {
  const panel = document.getElementById('detail-panel');
  panel.innerHTML = `
    <div class="empty-detail">
      <div class="empty-detail__icon">◈</div>
      <div class="empty-detail__text">SELECT AN EMAIL</div>
      <div class="empty-detail__sub">Click an email from the list to view its analysis</div>
    </div>
  `;
}

// ── Sandbox URL Analyzer ───────────────────────────────────────
function analyzeUrl(url) {
  const risks = [];
  const info = {};

  try {
    const parsed = new URL(url);
    info.protocol = parsed.protocol.replace(':', '').toUpperCase();
    info.hostname = parsed.hostname;
    info.pathname = parsed.pathname;
    info.search = parsed.search;
    info.port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    info.fullDomain = parsed.hostname;

    const subdomains = parsed.hostname.split('.');
    info.subdomainCount = subdomains.length - 2; // exclude domain.tld
    info.tld = '.' + subdomains.slice(-1)[0];
    info.domain = subdomains.slice(-2).join('.');

    // Risk checks
    if (parsed.protocol === 'http:') {
      risks.push({ level: 'high', text: 'Uses insecure HTTP (no encryption)' });
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
      risks.push({ level: 'high', text: 'Uses raw IP address instead of domain name' });
    }

    const suspiciousTLDs = ['.xyz', '.top', '.click', '.loan', '.gq', '.ml', '.cf', '.tk', '.ga', '.buzz', '.club', '.pw'];
    if (suspiciousTLDs.includes(info.tld)) {
      risks.push({ level: 'high', text: `Uses high-abuse TLD: ${info.tld}` });
    }

    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'shorte.st', 'rb.gy'];
    if (shorteners.some(s => parsed.hostname === s)) {
      risks.push({ level: 'warn', text: 'Uses URL shortener (hides real destination)' });
    }

    if (info.subdomainCount >= 3) {
      risks.push({ level: 'warn', text: `Excessive subdomains (${info.subdomainCount}) — may impersonate a legitimate site` });
    }

    const suspKeywords = ['login', 'verify', 'secure', 'update', 'confirm', 'banking', 'password', 'signin', 'authenticate'];
    const matchedKw = suspKeywords.filter(kw => parsed.pathname.toLowerCase().includes(kw));
    if (matchedKw.length > 0) {
      risks.push({ level: 'warn', text: `URL path contains suspicious keywords: ${matchedKw.join(', ')}` });
    }

    const domainName = subdomains.slice(0, -1).join('.');
    if (/\d{4,}/.test(domainName)) {
      risks.push({ level: 'warn', text: 'Domain contains suspicious number patterns' });
    }

    if (parsed.search && parsed.search.length > 100) {
      risks.push({ level: 'info', text: 'Long query string — may contain tracking parameters' });
    }

    if (parsed.port && !['80', '443', ''].includes(parsed.port)) {
      risks.push({ level: 'warn', text: `Non-standard port: ${parsed.port}` });
    }

    if (risks.length === 0) {
      risks.push({ level: 'safe', text: 'No obvious risk indicators detected' });
    }

  } catch {
    info.protocol = '???';
    info.hostname = url;
    info.pathname = '';
    info.domain = url;
    info.tld = '';
    info.subdomainCount = 0;
    risks.push({ level: 'high', text: 'Invalid or malformed URL' });
  }

  return { risks, info };
}

function openSandbox(url) {
  // Remove existing sandbox
  document.querySelector('.sandbox-overlay')?.remove();

  const { risks, info } = analyzeUrl(url);

  const overallRisk = risks.some(r => r.level === 'high') ? 'HIGH RISK'
    : risks.some(r => r.level === 'warn') ? 'MODERATE RISK' : 'LOW RISK';

  const overallClass = risks.some(r => r.level === 'high') ? 'danger'
    : risks.some(r => r.level === 'warn') ? 'warn' : 'safe';

  const riskIcons = { high: '🔴', warn: '🟡', info: '🔵', safe: '🟢' };
  const riskClasses = { high: 'security-tip--danger', warn: 'security-tip--warn', info: '', safe: 'security-tip--safe' };

  const risksHTML = risks.map(r => `
    <li class="security-tip ${riskClasses[r.level] || ''}">
      <span class="security-tip__icon">${riskIcons[r.level] || '⚪'}</span>
      <span class="security-tip__text">${escapeHtml(r.text)}</span>
    </li>
  `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'sandbox-overlay';
  overlay.id = 'sandbox-overlay';

  overlay.innerHTML = `
    <div class="sandbox-modal">
      <div class="sandbox-header">
        <span class="sandbox-header__title">◈ SANDBOX — URL ANALYSIS</span>
        <button class="sandbox-header__close" id="btn-close-sandbox" type="button">✕ CLOSE</button>
      </div>
      <div class="sandbox-warning">
        <span class="sandbox-warning__icon">🔒</span>
        <span>SAFE ANALYSIS — This URL is inspected without visiting it. No connection is made to the destination. Your data is safe.</span>
      </div>
      <div class="sandbox-iframe-container" style="background: var(--bg); overflow-y: auto; padding: 32px;">
        
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="font-family: var(--font-display); font-size: 36px; letter-spacing: 0.05em; color: var(--${overallClass});">${overallRisk}</div>
        </div>

        <div style="background: var(--surface); border: 1px solid var(--border); padding: 20px; margin-bottom: 20px; word-break: break-all;">
          <div style="font-size: 11px; letter-spacing: 0.2em; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase;">FULL URL</div>
          <div style="font-size: 14px; color: var(--text); line-height: 1.6;">${escapeHtml(url)}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div style="background: var(--surface); border: 1px solid var(--border); padding: 16px;">
            <div style="font-size: 10px; letter-spacing: 0.2em; color: var(--text-muted); margin-bottom: 6px;">PROTOCOL</div>
            <div style="font-family: var(--font-display); font-size: 24px; color: ${info.protocol === 'HTTPS' ? 'var(--safe)' : 'var(--danger)'};">${escapeHtml(info.protocol)}</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); padding: 16px;">
            <div style="font-size: 10px; letter-spacing: 0.2em; color: var(--text-muted); margin-bottom: 6px;">PORT</div>
            <div style="font-family: var(--font-display); font-size: 24px; color: var(--text);">${escapeHtml(info.port || 'Default')}</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); padding: 16px;">
            <div style="font-size: 10px; letter-spacing: 0.2em; color: var(--text-muted); margin-bottom: 6px;">DOMAIN</div>
            <div style="font-size: 14px; color: var(--text); word-break: break-all;">${escapeHtml(info.domain || info.hostname)}</div>
          </div>
          <div style="background: var(--surface); border: 1px solid var(--border); padding: 16px;">
            <div style="font-size: 10px; letter-spacing: 0.2em; color: var(--text-muted); margin-bottom: 6px;">SUBDOMAINS</div>
            <div style="font-family: var(--font-display); font-size: 24px; color: ${info.subdomainCount >= 3 ? 'var(--warn)' : 'var(--text)'};">${info.subdomainCount || 0}</div>
          </div>
        </div>

        ${info.pathname && info.pathname !== '/' ? `
        <div style="background: var(--surface); border: 1px solid var(--border); padding: 16px; margin-bottom: 20px; word-break: break-all;">
          <div style="font-size: 10px; letter-spacing: 0.2em; color: var(--text-muted); margin-bottom: 6px;">PATH</div>
          <div style="font-size: 13px; color: var(--text);">${escapeHtml(info.pathname)}</div>
        </div>
        ` : ''}

        ${info.search ? `
        <div style="background: var(--surface); border: 1px solid var(--border); padding: 16px; margin-bottom: 20px; word-break: break-all;">
          <div style="font-size: 10px; letter-spacing: 0.2em; color: var(--text-muted); margin-bottom: 6px;">QUERY PARAMETERS</div>
          <div style="font-size: 13px; color: var(--text);">${escapeHtml(info.search)}</div>
        </div>
        ` : ''}

        <div style="margin-bottom: 20px;">
          <div style="font-size: 11px; letter-spacing: 0.2em; color: var(--text-muted); margin-bottom: 12px; text-transform: uppercase;">RISK INDICATORS</div>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${risksHTML}
          </ul>
        </div>

        <div style="background: var(--surface); border: 1px solid var(--border); padding: 16px; text-align: center;">
          <div style="font-size: 10px; letter-spacing: 0.2em; color: var(--text-muted); margin-bottom: 10px;">LOOKUP TOOLS</div>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a href="https://www.virustotal.com/gui/url/${btoa(url)}/detection" target="_blank" rel="noopener noreferrer" 
               style="font-size: 11px; color: var(--accent); border: 1px solid var(--accent); padding: 6px 16px; text-decoration: none; letter-spacing: 0.08em;">
              VIRUSTOTAL ↗
            </a>
            <a href="https://www.google.com/safebrowsing/static/faq.html" target="_blank" rel="noopener noreferrer"
               style="font-size: 11px; color: var(--accent); border: 1px solid var(--accent); padding: 6px 16px; text-decoration: none; letter-spacing: 0.08em;">
              SAFE BROWSING ↗
            </a>
            <a href="https://urlscan.io/search/#${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer"
               style="font-size: 11px; color: var(--accent); border: 1px solid var(--accent); padding: 6px 16px; text-decoration: none; letter-spacing: 0.08em;">
              URLSCAN.IO ↗
            </a>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Animate in
  gsap.from(overlay, { opacity: 0, duration: 0.3 });
  gsap.from('.sandbox-modal', { y: 30, opacity: 0, duration: 0.4, delay: 0.1 });

  // Close button
  document.getElementById('btn-close-sandbox').addEventListener('click', closeSandbox);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSandbox();
  });

  // Close on Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeSandbox();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function closeSandbox() {
  const overlay = document.getElementById('sandbox-overlay');
  if (overlay) {
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => overlay.remove()
    });
  }
}

// ── Verify Sender Modal ────────────────────────────────────────

async function dnsLookup(name, type) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function rdapLookup(domain) {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function getDomainAge(rdapData) {
  if (!rdapData || !rdapData.events) return null;
  const regEvent = rdapData.events.find(e => e.eventAction === 'registration');
  if (!regEvent || !regEvent.eventDate) return null;
  const regDate = new Date(regEvent.eventDate);
  const now = new Date();
  const diffMs = now - regDate;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return { date: regDate, days };
}

const KNOWN_BRANDS = {
  'google':    ['google.com', 'gmail.com', 'youtube.com', 'googlemail.com'],
  'microsoft': ['microsoft.com', 'outlook.com', 'hotmail.com', 'live.com', 'office365.com'],
  'apple':     ['apple.com', 'icloud.com', 'me.com', 'mac.com'],
  'amazon':    ['amazon.com', 'amazon.co.uk', 'amazon.in', 'amazonses.com'],
  'paypal':    ['paypal.com', 'paypal.me'],
  'netflix':   ['netflix.com'],
  'facebook':  ['facebook.com', 'fb.com', 'meta.com', 'facebookmail.com'],
  'instagram': ['instagram.com'],
  'twitter':   ['twitter.com', 'x.com'],
  'linkedin':  ['linkedin.com'],
  'bank':      [],
  'irs':       ['irs.gov'],
  'fbi':       ['fbi.gov']
};

function checkBrandMatch(displayName, senderDomain) {
  const dn = (displayName || '').toLowerCase();
  const sd = senderDomain.toLowerCase();
  for (const [brand, officialDomains] of Object.entries(KNOWN_BRANDS)) {
    if (dn.includes(brand)) {
      if (officialDomains.some(d => sd === d || sd.endsWith('.' + d))) {
        return { matched: true, brand, legit: true };
      }
      return { matched: true, brand, legit: false };
    }
  }
  return { matched: false };
}

async function openVerifySender(email) {
  // Remove existing overlay
  document.querySelector('.verify-overlay')?.remove();

  const domain = email.senderEmail.split('@')[1]?.toLowerCase() || '';
  const displayName = email.senderName || '';

  // Create overlay immediately with loading state
  const overlay = document.createElement('div');
  overlay.className = 'verify-overlay';
  overlay.id = 'verify-overlay';

  overlay.innerHTML = `
    <div class="verify-modal">
      <div class="verify-header">
        <span class="verify-header__title">◈ SENDER VERIFICATION</span>
        <button class="verify-header__close" id="btn-close-verify" type="button">✕ CLOSE</button>
      </div>
      <div class="verify-info-bar">
        <span class="verify-info-bar__icon">🔍</span>
        <span>VERIFYING — Performing DNS, DMARC, SPF, and domain checks for <strong>${escapeHtml(domain)}</strong></span>
      </div>
      <div class="verify-body" id="verify-body">
        <div class="verify-loading">
          <div class="verify-loading__spinner"></div>
          <div class="verify-loading__text">RUNNING VERIFICATION CHECKS...</div>
          <div class="verify-loading__sub">Querying DNS records via dns.google</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  gsap.from(overlay, { opacity: 0, duration: 0.3 });
  gsap.from('.verify-modal', { y: 30, opacity: 0, duration: 0.4, delay: 0.1 });

  // Wire close
  document.getElementById('btn-close-verify').addEventListener('click', closeVerifySender);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeVerifySender(); });
  const escHandler = (e) => {
    if (e.key === 'Escape') { closeVerifySender(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  // ── Run all checks in parallel ──
  const [spfRes, dmarcRes, mxRes, rdapRes] = await Promise.all([
    dnsLookup(domain, 'TXT'),
    dnsLookup(`_dmarc.${domain}`, 'TXT'),
    dnsLookup(domain, 'MX'),
    rdapLookup(domain)
  ]);

  // ── Parse results ──
  const checks = [];

  // SPF
  const spfRecords = (spfRes?.Answer || []).filter(a => a.data && a.data.includes('v=spf1'));
  if (spfRecords.length > 0) {
    const spfData = spfRecords[0].data.replace(/"/g, '');
    const hasHardFail = spfData.includes('-all');
    const hasSoftFail = spfData.includes('~all');
    checks.push({
      name: 'SPF RECORD',
      icon: '🛡️',
      status: hasHardFail ? 'pass' : (hasSoftFail ? 'warn' : 'info'),
      verdict: hasHardFail ? 'STRICT (−all)' : (hasSoftFail ? 'SOFT FAIL (~all)' : 'PRESENT'),
      detail: spfData,
      description: hasHardFail
        ? 'Domain enforces strict SPF — only authorized servers can send email as this domain.'
        : hasSoftFail
        ? 'Domain uses soft-fail SPF — emails from unauthorized servers may still be delivered.'
        : 'SPF record is present but does not specify a strict policy.'
    });
  } else {
    checks.push({
      name: 'SPF RECORD',
      icon: '🛡️',
      status: 'fail',
      verdict: 'NOT FOUND',
      detail: 'No SPF record found for this domain',
      description: 'This domain has no SPF record, meaning anyone can send email appearing to be from this domain.'
    });
  }

  // DMARC
  const dmarcRecords = (dmarcRes?.Answer || []).filter(a => a.data && a.data.includes('v=DMARC1'));
  if (dmarcRecords.length > 0) {
    const dmarcData = dmarcRecords[0].data.replace(/"/g, '');
    const policy = dmarcData.match(/p=([^;\s]+)/)?.[1] || 'none';
    const isReject = policy === 'reject';
    const isQuarantine = policy === 'quarantine';
    checks.push({
      name: 'DMARC POLICY',
      icon: '📋',
      status: isReject ? 'pass' : (isQuarantine ? 'warn' : 'info'),
      verdict: `POLICY: ${policy.toUpperCase()}`,
      detail: dmarcData,
      description: isReject
        ? 'Domain uses the strictest DMARC policy — fraudulent emails are rejected entirely.'
        : isQuarantine
        ? 'Domain quarantines failed emails — suspicious messages go to spam.'
        : 'Domain monitors DMARC but does not block fraudulent emails.'
    });
  } else {
    checks.push({
      name: 'DMARC POLICY',
      icon: '📋',
      status: 'fail',
      verdict: 'NOT FOUND',
      detail: 'No DMARC record found for this domain',
      description: 'This domain has no DMARC policy, making it easier for attackers to spoof emails from this domain.'
    });
  }

  // MX Records
  const mxRecords = (mxRes?.Answer || []).filter(a => a.type === 15);
  if (mxRecords.length > 0) {
    const mxList = mxRecords.map(r => {
      const parts = r.data.trim().split(/\s+/);
      return { priority: parts[0], host: (parts[1] || '').replace(/\.$/, '') };
    }).sort((a, b) => a.priority - b.priority);

    const knownProviders = {
      'google': /google\.com$|googlemail\.com$/i,
      'microsoft': /outlook\.com$|microsoft\.com$/i,
      'protonmail': /protonmail\.ch$|proton\.me$/i,
      'zoho': /zoho\.com$/i,
      'yahoo': /yahoodns\.net$/i
    };
    let provider = 'Unknown';
    for (const [name, regex] of Object.entries(knownProviders)) {
      if (mxList.some(mx => regex.test(mx.host))) {
        provider = name.charAt(0).toUpperCase() + name.slice(1);
        break;
      }
    }

    checks.push({
      name: 'MX RECORDS',
      icon: '📬',
      status: 'pass',
      verdict: `${mxRecords.length} RECORD${mxRecords.length > 1 ? 'S' : ''} — ${provider}`,
      detail: mxList.map(mx => `Priority ${mx.priority}: ${mx.host}`).join('\n'),
      description: `This domain has valid mail exchange records and uses ${provider} as its email provider.`
    });
  } else {
    checks.push({
      name: 'MX RECORDS',
      icon: '📬',
      status: 'fail',
      verdict: 'NO MX RECORDS',
      detail: 'No MX records found for this domain',
      description: 'This domain has no MX records — it may not be configured to receive email, which is suspicious for a sender.'
    });
  }

  // Domain Age (RDAP)
  const age = getDomainAge(rdapRes);
  if (age) {
    const years = Math.floor(age.days / 365);
    const months = Math.floor((age.days % 365) / 30);
    const ageStr = years > 0 ? `${years}y ${months}m` : `${months} months`;
    const isNew = age.days < 90;
    const isVeryNew = age.days < 30;
    checks.push({
      name: 'DOMAIN AGE',
      icon: '📅',
      status: isVeryNew ? 'fail' : (isNew ? 'warn' : 'pass'),
      verdict: isVeryNew ? `VERY NEW (${ageStr})` : (isNew ? `NEW (${ageStr})` : `ESTABLISHED (${ageStr})`),
      detail: `Registered: ${age.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} — ${age.days} days ago`,
      description: isVeryNew
        ? 'This domain was registered very recently. Newly created domains are frequently used in phishing attacks.'
        : isNew
        ? 'This domain is relatively new. Exercise caution with emails from recently registered domains.'
        : 'This domain has been registered for a significant time, which is typical of legitimate organizations.'
    });
  } else {
    checks.push({
      name: 'DOMAIN AGE',
      icon: '📅',
      status: 'info',
      verdict: 'UNAVAILABLE',
      detail: 'Could not retrieve registration data for this domain',
      description: 'Domain age information is not available. Some registrars or TLDs do not expose this data.'
    });
  }

  // Brand cross-ref
  const brandCheck = checkBrandMatch(displayName, domain);
  if (brandCheck.matched) {
    checks.push({
      name: 'BRAND VERIFICATION',
      icon: '🏢',
      status: brandCheck.legit ? 'pass' : 'fail',
      verdict: brandCheck.legit ? `VERIFIED — ${brandCheck.brand.toUpperCase()}` : `MISMATCH — NOT OFFICIAL ${brandCheck.brand.toUpperCase()}`,
      detail: brandCheck.legit
        ? `Sender domain "${domain}" is a known official domain of ${brandCheck.brand}.`
        : `Display name claims "${brandCheck.brand}" but sender domain "${domain}" is NOT an official domain.`,
      description: brandCheck.legit
        ? 'The sender domain matches a known official domain for this brand.'
        : 'WARNING: The display name impersonates a known brand, but the sender domain is NOT official. This is a strong phishing indicator.'
    });
  }

  // ── Compute overall verdict ──
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const passCount = checks.filter(c => c.status === 'pass').length;

  let overallVerdict, overallClass, overallIcon, overallDesc;
  if (failCount >= 2 || (brandCheck.matched && !brandCheck.legit)) {
    overallVerdict = 'UNVERIFIED — HIGH RISK';
    overallClass = 'danger';
    overallIcon = '🔴';
    overallDesc = 'Multiple critical checks failed. This sender could not be verified and shows strong indicators of being fraudulent.';
  } else if (failCount >= 1 || warnCount >= 2) {
    overallVerdict = 'PARTIALLY VERIFIED';
    overallClass = 'warn';
    overallIcon = '🟡';
    overallDesc = 'Some verification checks raised concerns. Proceed with caution and verify through a separate channel before trusting this sender.';
  } else {
    overallVerdict = 'VERIFIED — LOW RISK';
    overallClass = 'safe';
    overallIcon = '🟢';
    overallDesc = 'All critical checks passed. This sender appears to be legitimate based on domain authentication and records.';
  }

  // ── Render results ──
  const statusIcons = { pass: '✅', warn: '⚠️', fail: '❌', info: 'ℹ️' };
  const statusClasses = { pass: 'verify-check--pass', warn: 'verify-check--warn', fail: 'verify-check--fail', info: 'verify-check--info' };

  const checksHTML = checks.map(c => `
    <div class="verify-check ${statusClasses[c.status]}">
      <div class="verify-check__header">
        <span class="verify-check__icon">${c.icon}</span>
        <span class="verify-check__name">${c.name}</span>
        <span class="verify-check__status">${statusIcons[c.status]} ${c.verdict}</span>
      </div>
      <div class="verify-check__detail">${escapeHtml(c.detail)}</div>
      <div class="verify-check__desc">${escapeHtml(c.description)}</div>
    </div>
  `).join('');

  const body = document.getElementById('verify-body');
  body.innerHTML = `
    <div class="verify-results">
      <div class="verify-verdict verify-verdict--${overallClass}">
        <span class="verify-verdict__icon">${overallIcon}</span>
        <div class="verify-verdict__text">
          <div class="verify-verdict__title">${overallVerdict}</div>
          <div class="verify-verdict__desc">${escapeHtml(overallDesc)}</div>
        </div>
      </div>

      <div class="verify-sender-info">
        <div class="verify-sender-info__row">
          <span class="verify-sender-info__label">DISPLAY NAME</span>
          <span class="verify-sender-info__value">${escapeHtml(displayName)}</span>
        </div>
        <div class="verify-sender-info__row">
          <span class="verify-sender-info__label">EMAIL</span>
          <span class="verify-sender-info__value">${escapeHtml(email.senderEmail)}</span>
        </div>
        <div class="verify-sender-info__row">
          <span class="verify-sender-info__label">DOMAIN</span>
          <span class="verify-sender-info__value">${escapeHtml(domain)}</span>
        </div>
      </div>

      <div class="verify-checks-grid">
        ${checksHTML}
      </div>

      <div class="verify-lookup-tools">
        <div class="verify-lookup-tools__label">EXTERNAL LOOKUP</div>
        <div class="verify-lookup-tools__links">
          <a href="https://www.virustotal.com/gui/domain/${encodeURIComponent(domain)}" target="_blank" rel="noopener noreferrer" class="verify-lookup-link">
            VIRUSTOTAL ↗
          </a>
          <a href="https://mxtoolbox.com/SuperTool.aspx?action=mx:${encodeURIComponent(domain)}" target="_blank" rel="noopener noreferrer" class="verify-lookup-link">
            MXTOOLBOX ↗
          </a>
          <a href="https://who.is/whois/${encodeURIComponent(domain)}" target="_blank" rel="noopener noreferrer" class="verify-lookup-link">
            WHOIS ↗
          </a>
          <a href="https://www.google.com/search?q=%22${encodeURIComponent(domain)}%22+scam+OR+phishing" target="_blank" rel="noopener noreferrer" class="verify-lookup-link">
            SCAM REPORTS ↗
          </a>
        </div>
      </div>
    </div>
  `;

  // Animate results in
  gsap.from('.verify-verdict', { opacity: 0, y: 20, duration: 0.5 });
  gsap.from('.verify-sender-info', { opacity: 0, y: 15, duration: 0.4, delay: 0.15 });
  gsap.from('.verify-check', { opacity: 0, y: 12, duration: 0.35, stagger: 0.08, delay: 0.25 });
  gsap.from('.verify-lookup-tools', { opacity: 0, y: 10, duration: 0.3, delay: 0.6 });
}
function closeVerifySender() {
  const overlay = document.getElementById('verify-overlay');
  if (overlay) {
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => overlay.remove()
    });
  }
}

// Make sandbox functions globally accessible
window.openSandbox = openSandbox;
window.closeSandbox = closeSandbox;
window.openVerifySender = openVerifySender;
window.closeVerifySender = closeVerifySender;

// Utility: escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Help Modal ─────────────────────────────────────────────────

function openHelpModal() {
  document.querySelector('.help-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.id = 'help-overlay';
  overlay.innerHTML = `
    <div class="help-modal">
      <div class="help-header">
        <span class="help-header__title">◈ USER MANUAL</span>
        <button class="help-header__close" id="btn-close-help" type="button">✕ CLOSE</button>
      </div>
      <div class="help-body">

        <div class="help-section">
          <div class="help-section__title">1 — OVERVIEW</div>
          <p><strong style="color:var(--text)">Phishing Email Detector</strong> is a client-side Gmail phishing scanner. It connects to your Gmail inbox via Google OAuth 2.0 (read-only), fetches your recent emails, and runs each one through a comprehensive <strong style="color:var(--accent)">rule-based detection engine</strong> that scores every email from 0 to 100 for phishing risk.</p>
          <div class="help-note help-note--safe">
            <span class="help-note__icon">🔒</span>
            <span>Your data never leaves your browser. No information is stored on any server. The app only requests read-only access to your inbox.</span>
          </div>
        </div>
        <hr class="help-divider">

        <div class="help-section">
          <div class="help-section__title">2 — GETTING STARTED</div>
          <div class="help-section__subtitle">Step 1: Sign In</div>
          <p>Click <span class="help-badge help-badge--accent">SIGN IN WITH GOOGLE</span> on the login screen. Grant <strong style="color:var(--text)">read-only</strong> access to your Gmail.</p>
          <div class="help-section__subtitle">Step 2: Run a Scan</div>
          <p>Click <span class="help-badge help-badge--accent">▶ RUN SCAN</span> to fetch and analyze your recent emails.</p>
          <div class="help-section__subtitle">Step 3: Review Results</div>
          <p>Emails appear in the left panel sorted by risk. Click any email to view its detailed analysis.</p>
        </div>
        <hr class="help-divider">

        <div class="help-section">
          <div class="help-section__title">3 — DASHBOARD</div>
          <div class="help-section__subtitle">Navbar</div>
          <p>Shows connection status, this Help button, and Sign Out.</p>
          <div class="help-section__subtitle">Stats Bar</div>
          <p>Animated counters for total scanned, safe, suspicious, and high-risk emails.</p>
          <div class="help-section__subtitle">Inbox Results (Left Panel)</div>
          <p>Each row shows a risk badge, sender, subject, and score out of 100.</p>
          <div class="help-section__subtitle">Detail Panel (Right Panel)</div>
          <p>Full analysis: risk level, score bar, triggered rules, analysis summary, recommended action, links found, and security tips.</p>
        </div>
        <hr class="help-divider">

        <div class="help-section">
          <div class="help-section__title">4 — RISK LEVELS</div>
          <table class="help-table">
            <thead><tr><th>Score</th><th>Verdict</th><th>Meaning</th></tr></thead>
            <tbody>
              <tr><td>0 — 29</td><td><span class="help-badge help-badge--safe">✅ SAFE</span></td><td>No phishing signals detected.</td></tr>
              <tr><td>30 — 59</td><td><span class="help-badge help-badge--warn">⚠️ SUSPICIOUS</span></td><td>Some indicators found. Verify the sender.</td></tr>
              <tr><td>60 — 79</td><td><span class="help-badge help-badge--warn">🔶 LIKELY PHISHING</span></td><td>Multiple signals. Do not click links.</td></tr>
              <tr><td>80 — 100</td><td><span class="help-badge help-badge--danger">🚨 PHISHING</span></td><td>Strong indicators. Report and delete.</td></tr>
            </tbody>
          </table>
          <div class="help-note help-note--warn">
            <span class="help-note__icon">⚡</span>
            <span><strong>Auto-Phishing:</strong> Some rules (dangerous attachments, IP-based URLs, 419 scams, double extensions) instantly classify an email as 🚨 Phishing regardless of score.</span>
          </div>
        </div>
        <hr class="help-divider">

        <div class="help-section">
          <div class="help-section__title">5 — DETECTION RULES</div>
          <p>The engine evaluates 7 categories of rules:</p>
          <div class="help-section__subtitle">📧 Sender Analysis (SA)</div>
          <p>Lookalike domains, free email impersonation, display name mismatches, suspicious TLDs, random-character domains.</p>
          <div class="help-section__subtitle">📌 Subject Line Analysis (SB)</div>
          <p>Urgency keywords, financial bait, security alert bait, excessive punctuation, all-caps subjects.</p>
          <div class="help-section__subtitle">📝 Body Content Analysis (BC)</div>
          <p>Credential harvesting, urgency pressure, generic greetings, grammar errors, brand impersonation, 419 scams, crypto scams.</p>
          <div class="help-section__subtitle">🔗 Link & URL Analysis (LA)</div>
          <p>URL/display mismatches, raw IP URLs, shorteners, suspicious keywords, excessive subdomains, non-HTTPS.</p>
          <div class="help-section__subtitle">📎 Attachment Analysis (AT)</div>
          <p>Dangerous types (<code>.exe</code>, <code>.bat</code>, <code>.js</code>), macro-enabled Office files, double extensions, password archives.</p>
          <div class="help-section__subtitle">📋 Header Analysis (HA)</div>
          <p>SPF/DKIM/DMARC failures, Reply-To mismatches, suspicious X-Mailer, received header anomalies.</p>
          <div class="help-section__subtitle">🔍 Behavioral Signals (BS)</div>
          <p>Unsolicited emails, unusual hours, mass BCC, missing unsubscribe, tracking pixels.</p>
          <div class="help-note">
            <span class="help-note__icon">📋</span>
            <span>Each rule has a weighted score (5—35 pts). Scores are summed and capped at 100.</span>
          </div>
        </div>
        <hr class="help-divider">

        <div class="help-section">
          <div class="help-section__title">6 — VERIFY SENDER</div>
          <p>When an email is suspicious, click <span class="help-badge help-badge--warn">◈ VERIFY SENDER</span> to run real-time checks:</p>
          <ul>
            <li><strong style="color:var(--text)">SPF Record</strong> — Confirms authorized mail servers.</li>
            <li><strong style="color:var(--text)">DMARC Policy</strong> — Checks domain enforcement policy.</li>
            <li><strong style="color:var(--text)">MX Records</strong> — Validates mail exchange records and email provider.</li>
            <li><strong style="color:var(--text)">Domain Age</strong> — Checks registration date. New domains are high risk.</li>
            <li><strong style="color:var(--text)">Brand Verification</strong> — Cross-references display name vs. official brand domains.</li>
          </ul>
          <p>Queries use <code>dns.google</code> and <code>rdap.org</code> — no API keys needed.</p>
        </div>
        <hr class="help-divider">

        <div class="help-section">
          <div class="help-section__title">7 — URL SANDBOX</div>
          <p>Click <span class="help-badge help-badge--accent">◈ SANDBOX</span> on any link to inspect it <strong style="color:var(--text)">without visiting it</strong>. Checks for:</p>
          <ul>
            <li>Insecure HTTP</li>
            <li>Raw IP addresses</li>
            <li>High-abuse TLDs (<code>.xyz</code>, <code>.top</code>, <code>.click</code>)</li>
            <li>URL shorteners (bit.ly, tinyurl.com, etc.)</li>
            <li>Excessive subdomains</li>
            <li>Suspicious path keywords (login, verify, password)</li>
            <li>Non-standard ports</li>
          </ul>
          <p>External lookup tools (VirusTotal, URLScan.io) are provided for deeper analysis.</p>
        </div>
        <hr class="help-divider">

        <div class="help-section">
          <div class="help-section__title">8 — SECURITY & PRIVACY</div>
          <table class="help-table">
            <thead><tr><th>Feature</th><th>Detail</th></tr></thead>
            <tbody>
              <tr><td>Gmail Access</td><td>Read-only — only <code>gmail.readonly</code> scope</td></tr>
              <tr><td>Data Storage</td><td>None — all analysis in your browser</td></tr>
              <tr><td>Backend</td><td>None — 100% client-side</td></tr>
              <tr><td>API Keys</td><td>Stay local in <code>config.js</code>, never sent to third parties</td></tr>
              <tr><td>External Calls</td><td>Only Google OAuth, Gmail API, <code>dns.google</code>, <code>rdap.org</code></td></tr>
            </tbody>
          </table>
          <div class="help-note help-note--safe">
            <span class="help-note__icon">✅</span>
            <span>Revoke access anytime at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">Google Account permissions ↗</a>.</span>
          </div>
        </div>
        <hr class="help-divider">

        <div class="help-section">
          <div class="help-section__title">9 — FAQ</div>
          <div class="help-section__subtitle">What should I do if an email is flagged?</div>
          <ol>
            <li>Do <strong style="color:var(--danger)">NOT</strong> click links or download attachments.</li>
            <li>Use <strong style="color:var(--text)">Verify Sender</strong> to check domain authenticity.</li>
            <li>Use the <strong style="color:var(--text)">Sandbox</strong> to inspect URLs.</li>
            <li>If phishing, report it in Gmail and delete.</li>
            <li>If unsure, contact the sender through a separate channel.</li>
          </ol>
          <div class="help-section__subtitle">Is this tool free?</div>
          <p>Yes — 100% free. No paid APIs, no subscriptions.</p>
          <div class="help-section__subtitle">Tips</div>
          <ul>
            <li>Press <code>Escape</code> to close any modal</li>
            <li>Click outside a modal to close it</li>
            <li>High-risk emails glow to draw attention</li>
          </ul>
        </div>

        <div style="text-align:center; margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">
          <span style="font-family:var(--font-display); font-size:14px; letter-spacing:0.12em; color:var(--text-muted);">PHISHING EMAIL DETECTOR — USER MANUAL v1.0</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  gsap.from(overlay, { opacity: 0, duration: 0.3 });
  gsap.from('.help-modal', { y: 30, opacity: 0, duration: 0.4, delay: 0.1 });
  document.getElementById('btn-close-help').addEventListener('click', closeHelpModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeHelpModal(); });
  const escH = (e) => { if (e.key === 'Escape') { closeHelpModal(); document.removeEventListener('keydown', escH); } };
  document.addEventListener('keydown', escH);
  gsap.from('.help-section', { opacity: 0, y: 12, duration: 0.3, stagger: 0.04, delay: 0.2 });
}

function closeHelpModal() {
  const overlay = document.getElementById('help-overlay');
  if (overlay) { gsap.to(overlay, { opacity: 0, duration: 0.25, onComplete: () => overlay.remove() }); }
}

window.openHelpModal = openHelpModal;
window.closeHelpModal = closeHelpModal;

export { renderStats, renderEmailList, renderDetail, showEmptyDetail, riskBadge, openSandbox, closeSandbox, openVerifySender, closeVerifySender, openHelpModal, closeHelpModal };

