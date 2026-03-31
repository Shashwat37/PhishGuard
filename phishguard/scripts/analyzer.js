// analyzer.js — Rule-based phishing detection engine
// Rules defined from rule.md v1.0.0

// ── Auto-Phishing Rule IDs (instant phishing verdict) ──────────
const AUTO_PHISH_RULES = ['AT-001', 'AT-003', 'BC-006', 'LA-002'];

// ── Security Tips by risk level ────────────────────────────────
const SECURITY_TIPS = {
  SAFE: [
    'Even safe-looking emails can be spoofed — always verify unexpected requests through a separate channel.',
    'Keep your email client and browser updated to benefit from the latest phishing filters.',
    'Enable two-factor authentication (2FA) on all accounts for an extra layer of protection.'
  ],
  LOW: [
    'Hover over links before clicking to verify their actual destination.',
    'Be cautious of emails that ask you to act quickly or share personal information.',
    'When in doubt, visit the company\'s website directly by typing the URL instead of clicking email links.'
  ],
  SUSPICIOUS: [
    'Do NOT click any links or download attachments from this email until verified.',
    'Contact the sender through an official channel (not by replying) to confirm legitimacy.',
    'Report this email as phishing/spam using your email client\'s built-in reporting feature.',
    'Check the sender\'s email domain carefully — attackers often use look-alike domains.'
  ],
  HIGH: [
    'DELETE this email immediately and do NOT interact with any links or attachments.',
    'If you already clicked a link, change your passwords immediately and enable 2FA.',
    'Report this email as phishing to your email provider and to the impersonated organization.',
    'Run a full antivirus scan if you downloaded any attachments from this email.',
    'Monitor your bank and credit card statements for unauthorized transactions.'
  ]
};

// ── 1. Sender Analysis ─────────────────────────────────────────
function checkSenderRules(email) {
  const flags = [];
  const domain = email.senderEmail.split('@')[1]?.toLowerCase() || '';
  const displayName = (email.senderName || '').toLowerCase();
  const localPart = email.senderEmail.split('@')[0]?.toLowerCase() || '';

  // SA-001: Lookalike Domain
  const brandMimics = {
    'paypal': /p[a@]yp[a@][l1]/i,
    'amazon': /[a@]m[a@]z[o0]n/i,
    'google': /g[o0][o0]g[l1][e3]/i,
    'microsoft': /m[i1!]cr[o0]s[o0]ft/i,
    'apple': /[a@]pp[l1][e3]/i,
    'netflix': /n[e3]tf[l1][i1!]x/i,
    'facebook': /f[a@]c[e3]b[o0][o0]k/i,
    'instagram': /[i1!]nst[a@]gr[a@]m/i,
    'twitter': /tw[i1!]tt[e3]r/i,
    'linkedin': /[l1][i1!]nk[e3]d[i1!]n/i,
    'bank': /b[a@]nk/i
  };
  for (const [brand, regex] of Object.entries(brandMimics)) {
    if (regex.test(domain) && !domain.includes(brand + '.com') && !domain.includes(brand + '.org')) {
      flags.push({ id: 'SA-001', name: 'Lookalike Domain', weight: 25, reason: `Domain "${domain}" mimics "${brand}"` });
      break;
    }
  }

  // SA-002: Free Email Impersonation
  const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'mail.com', 'protonmail.com'];
  const officialTerms = ['support', 'admin', 'billing', 'security', 'service', 'helpdesk', 'noreply', 'no-reply', 'info', 'team', 'official'];
  if (freeProviders.includes(domain) && officialTerms.some(term => localPart.includes(term))) {
    flags.push({ id: 'SA-002', name: 'Free Email Impersonation', weight: 20, reason: `Official-looking sender "${email.senderEmail}" uses a free provider` });
  }

  // SA-003: Display Name Mismatch
  const knownBrands = ['paypal', 'apple', 'microsoft', 'google', 'amazon', 'netflix', 'facebook', 'irs', 'fbi', 'bank'];
  const displayMatchesBrand = knownBrands.some(b => displayName.includes(b));
  const domainMatchesBrand = knownBrands.some(b => domain.includes(b));
  if (displayMatchesBrand && !domainMatchesBrand) {
    flags.push({ id: 'SA-003', name: 'Display Name Mismatch', weight: 20, reason: `Display name "${email.senderName}" doesn't match domain "${domain}"` });
  }

  // SA-004: Suspicious TLD
  const suspiciousTLDs = ['.xyz', '.top', '.click', '.loan', '.gq', '.ml', '.cf', '.tk', '.ga', '.buzz', '.club', '.pw', '.work', '.party'];
  if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
    flags.push({ id: 'SA-004', name: 'Suspicious TLD', weight: 15, reason: `Domain uses high-abuse TLD: "${domain}"` });
  }

  // SA-005: Random Character Domain
  const domainName = domain.split('.')[0] || '';
  if (/^[a-z0-9]{8,}$/.test(domainName) && /\d{3,}/.test(domainName)) {
    flags.push({ id: 'SA-005', name: 'Random Character Domain', weight: 20, reason: `Domain "${domain}" appears auto-generated` });
  }

  return flags;
}

// ── 2. Subject Line Analysis ───────────────────────────────────
function checkSubjectRules(email) {
  const flags = [];
  const subj = email.subject;
  const subjLower = subj.toLowerCase();

  // SB-001: Urgency Keywords
  const urgencyWords = ['urgent', 'act now', 'account suspended', 'verify now', 'final notice',
    'last warning', 'expires today', 'immediate action required', 'action required'];
  urgencyWords.forEach(word => {
    if (subjLower.includes(word))
      flags.push({ id: 'SB-001', name: 'Urgency Keywords', weight: 15, reason: `Subject contains urgency phrase: "${word}"` });
  });

  // SB-002: Financial Bait Keywords
  const financialBait = ['you have won', 'claim your prize', 'free gift', 'lottery', 'inheritance',
    'million dollars', 'refund pending', 'tax refund', 'unclaimed funds'];
  financialBait.forEach(word => {
    if (subjLower.includes(word))
      flags.push({ id: 'SB-002', name: 'Financial Bait Keywords', weight: 20, reason: `Subject contains financial bait: "${word}"` });
  });

  // SB-003: Security Alert Bait
  const securityBait = ['account compromised', 'unusual sign-in', 'suspicious activity',
    'password reset required', 'unauthorized access', 'verify your identity'];
  securityBait.forEach(word => {
    if (subjLower.includes(word))
      flags.push({ id: 'SB-003', name: 'Security Alert Bait', weight: 15, reason: `Subject contains security alert bait: "${word}"` });
  });

  // SB-004: Excessive Punctuation
  if ((subj.match(/!/g) || []).length > 2 || (subj.match(/\?/g) || []).length > 2) {
    flags.push({ id: 'SB-004', name: 'Excessive Punctuation', weight: 10, reason: 'Subject has excessive punctuation (!!!/???)' });
  }

  // SB-005: All Caps Subject
  if (subj.length > 10 && subj === subj.toUpperCase() && /[A-Z]/.test(subj)) {
    flags.push({ id: 'SB-005', name: 'All Caps Subject', weight: 10, reason: 'Subject line is entirely in UPPERCASE' });
  }

  return flags;
}

// ── 3. Body Content Analysis ───────────────────────────────────
function checkBodyRules(email) {
  const flags = [];
  const body = email.bodyText.toLowerCase();

  // BC-001: Credential Harvesting Phrases
  const credPhrases = ['enter your password', 'confirm your credit card', 'provide your ssn',
    'verify your bank account', 'update your payment information', 'confirm your pin',
    'enter your credentials', 'confirm your password', 'social security number',
    'bank account number'];
  credPhrases.forEach(phrase => {
    if (body.includes(phrase))
      flags.push({ id: 'BC-001', name: 'Credential Harvesting Phrases', weight: 30, reason: `Body requests credentials: "${phrase}"` });
  });

  // BC-002: Urgency Pressure Tactics
  const urgencyBody = ['within 24 hours', 'account will be closed', 'failure to respond',
    'suspended unless', 'legal action will be taken', 'your account has been locked',
    'act immediately', 'will be terminated', 'will be deactivated'];
  urgencyBody.forEach(phrase => {
    if (body.includes(phrase))
      flags.push({ id: 'BC-002', name: 'Urgency Pressure Tactics', weight: 15, reason: `Body uses urgency pressure: "${phrase}"` });
  });

  // BC-003: Generic Greeting
  const genericGreetings = ['dear customer', 'dear user', 'dear account holder', 'dear member',
    'hello friend', 'to whom it may concern', 'dear valued client', 'dear sir', 'dear madam'];
  genericGreetings.forEach(greeting => {
    if (body.includes(greeting))
      flags.push({ id: 'BC-003', name: 'Generic Greeting', weight: 10, reason: `Body uses generic greeting: "${greeting}"` });
  });

  // BC-004: Grammar & Spelling Errors
  const badGrammar = ['kindly do the needful', 'revert back to us', 'do the necessary',
    'please to confirm', 'kindly revert', 'your good self', 'do the needful'];
  badGrammar.forEach(phrase => {
    if (body.includes(phrase))
      flags.push({ id: 'BC-004', name: 'Grammar & Spelling Errors', weight: 15, reason: `Body contains suspicious phrasing: "${phrase}"` });
  });

  // BC-005: Brand Impersonation
  const brandClaims = ['paypal team', 'apple support', 'microsoft security', 'google account team',
    'amazon customer service', 'internal revenue service', 'irs', 'fbi',
    'netflix billing', 'facebook security'];
  brandClaims.forEach(brand => {
    if (body.includes(brand))
      flags.push({ id: 'BC-005', name: 'Brand Impersonation', weight: 15, reason: `Body impersonates brand: "${brand}"` });
  });

  // BC-006: Advance Fee Fraud (419 Scam) ⚠️ AUTO-PHISH
  const advanceFee = ['i am the son of', 'dying widow', 'transfer of funds',
    'keep this transaction secret', 'percentage of the funds', 'died without a will',
    'next of kin', 'beneficiary of', 'unclaimed inheritance'];
  advanceFee.forEach(phrase => {
    if (body.includes(phrase))
      flags.push({ id: 'BC-006', name: 'Advance Fee Fraud (419 Scam)', weight: 30, reason: `Body contains 419 scam language: "${phrase}"` });
  });

  // BC-007: Cryptocurrency Scam Language
  const cryptoScam = ['send bitcoin to', 'pay in crypto', 'double your bitcoin',
    'send btc to address', 'crypto investment guaranteed', 'usdt transfer',
    'bitcoin wallet', 'send cryptocurrency'];
  cryptoScam.forEach(phrase => {
    if (body.includes(phrase))
      flags.push({ id: 'BC-007', name: 'Cryptocurrency Scam Language', weight: 20, reason: `Body contains crypto scam language: "${phrase}"` });
  });

  return flags;
}

// ── 4. Link & URL Analysis ─────────────────────────────────────
function checkLinkRules(email) {
  const flags = [];
  const senderDomain = email.senderEmail.split('@')[1]?.toLowerCase() || '';

  email.links.forEach(link => {
    try {
      const url = new URL(link);
      const hostname = url.hostname.toLowerCase();
      const fullUrl = link.toLowerCase();
      const pathname = url.pathname.toLowerCase();

      // LA-002: IP Address as URL ⚠️ AUTO-PHISH
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        flags.push({ id: 'LA-002', name: 'IP Address as URL', weight: 25, reason: `Link uses raw IP address: "${hostname}"` });
      }

      // LA-003: URL Shortener Service
      const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'shorte.st', 'rb.gy'];
      if (shorteners.some(s => hostname === s || hostname.endsWith('.' + s))) {
        flags.push({ id: 'LA-003', name: 'URL Shortener Service', weight: 20, reason: `Link uses URL shortener: "${hostname}"` });
      }

      // LA-004: Suspicious URL Keywords
      const suspKeywords = ['login', 'verify', 'secure', 'update', 'confirm', 'banking',
        'password', 'signin', 'authenticate', 'validate', 'recover'];
      const matchedKeyword = suspKeywords.find(kw => pathname.includes(kw));
      if (matchedKeyword && !hostname.includes(senderDomain.replace('www.', ''))) {
        flags.push({ id: 'LA-004', name: 'Suspicious URL Keywords', weight: 20, reason: `Link contains suspicious keyword "/${matchedKeyword}" on non-sender domain: "${hostname}"` });
      }

      // LA-005: Excessive Subdomains
      const subdomains = hostname.split('.');
      if (subdomains.length >= 5) {
        flags.push({ id: 'LA-005', name: 'Excessive Subdomains', weight: 20, reason: `Link has ${subdomains.length} subdomains: "${hostname}"` });
      }

      // LA-006: Non-HTTPS Link
      if (url.protocol === 'http:' && !hostname.includes('localhost')) {
        flags.push({ id: 'LA-006', name: 'Non-HTTPS Link', weight: 10, reason: `Link uses insecure HTTP: "${link.slice(0, 60)}"` });
      }

      // LA-001: URL and Display Text Mismatch (check if domain differs from sender)
      if (senderDomain
        && !hostname.includes(senderDomain.replace('www.', ''))
        && !hostname.includes('google.com')
        && !hostname.includes('googleapis.com')
        && !hostname.includes('gstatic.com')
        && !hostname.includes('unsubscribe')) {
        flags.push({ id: 'LA-001', name: 'URL Domain Mismatch', weight: 30, reason: `Link goes to "${hostname}" while sender is from "${senderDomain}"` });
      }
    } catch {
      // Invalid URL — skip
    }
  });

  // Deduplicate by rule ID (keep first occurrence)
  const seen = new Set();
  return flags.filter(f => {
    const key = f.id + f.reason;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── 5. Attachment Analysis (from email body text) ──────────────
function checkAttachmentRules(email) {
  const flags = [];
  const body = email.bodyText.toLowerCase();
  const subj = email.subject.toLowerCase();
  const combined = body + ' ' + subj;

  // AT-001: Dangerous Attachment Type ⚠️ AUTO-PHISH
  const dangerousExts = ['.exe', '.bat', '.cmd', '.vbs', '.js', '.jar', '.ps1', '.msi', '.scr', '.pif', '.hta', '.reg', '.lnk', '.iso', '.img'];
  dangerousExts.forEach(ext => {
    const regex = new RegExp(`\\w+\\${ext}(\\s|$|[,."'])`, 'i');
    if (regex.test(combined))
      flags.push({ id: 'AT-001', name: 'Dangerous Attachment Type', weight: 35, reason: `References dangerous file type: "${ext}"` });
  });

  // AT-002: Macro-Enabled Office File
  const macroExts = ['.xlsm', '.docm', '.pptm', '.xlsb', '.xltm', '.dotm', '.potm'];
  macroExts.forEach(ext => {
    if (combined.includes(ext))
      flags.push({ id: 'AT-002', name: 'Macro-Enabled Office File', weight: 25, reason: `References macro-enabled file: "${ext}"` });
  });

  // AT-003: Double Extension ⚠️ AUTO-PHISH
  if (/\w+\.\w+\.(exe|bat|cmd|scr|vbs|js|jar|ps1|msi|pif|hta)(\s|$)/i.test(combined)) {
    flags.push({ id: 'AT-003', name: 'Double Extension', weight: 30, reason: 'References file with suspicious double extension' });
  }

  return flags;
}

// ── 6. Email Header Analysis ───────────────────────────────────
function checkHeaderRules(email) {
  const flags = [];
  const domain = email.senderEmail.split('@')[1]?.toLowerCase() || '';
  const localPart = email.senderEmail.split('@')[0]?.toLowerCase() || '';

  // HA-004: Reply-To Header Mismatch (approximated by checking sender patterns)
  // Note: Full header analysis not possible from Gmail API basic data
  // We check if sender has suspicious number patterns
  if (/\d{4,}/.test(localPart)) {
    flags.push({ id: 'HA-006', name: 'Suspicious Sender Pattern', weight: 15, reason: `Sender "${email.senderEmail}" has suspicious number pattern` });
  }

  return flags;
}

// ── 7. Behavioral Signals ──────────────────────────────────────
function checkBehavioralRules(email) {
  const flags = [];

  // BS-002: Sent at Unusual Hours
  try {
    const date = new Date(email.date);
    const hours = date.getHours();
    if (hours >= 1 && hours <= 5) {
      flags.push({ id: 'BS-002', name: 'Sent at Unusual Hours', weight: 5, reason: `Email sent at ${hours}:00 AM` });
    }
  } catch {}

  // Check for excessive links (spam signal)
  if (email.links.length > 8) {
    flags.push({ id: 'BS-004', name: 'Excessive Links', weight: 10, reason: `Email contains ${email.links.length} links — possible spam/phishing` });
  }

  return flags;
}

// ── Generate Explanation ───────────────────────────────────────
function generateExplanation(flags, score, riskLevel) {
  if (flags.length === 0) {
    return 'This email shows no suspicious characteristics. The sender domain, content, and links all appear legitimate. No phishing indicators were detected by any of our detection rules.';
  }

  const categories = {};
  flags.forEach(f => {
    const cat = f.id.split('-')[0];
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(f.name);
  });

  const parts = [];
  if (categories['SA']) parts.push(`sender analysis flagged issues (${[...new Set(categories['SA'])].join(', ')})`);
  if (categories['SB']) parts.push(`subject line contains suspicious patterns (${[...new Set(categories['SB'])].join(', ')})`);
  if (categories['BC']) parts.push(`body content triggered alerts (${[...new Set(categories['BC'])].join(', ')})`);
  if (categories['LA']) parts.push(`link analysis found concerns (${[...new Set(categories['LA'])].join(', ')})`);
  if (categories['AT']) parts.push(`attachment indicators detected (${[...new Set(categories['AT'])].join(', ')})`);
  if (categories['HA']) parts.push(`header anomalies found (${[...new Set(categories['HA'])].join(', ')})`);
  if (categories['BS']) parts.push(`behavioral signals triggered (${[...new Set(categories['BS'])].join(', ')})`);

  const intro = riskLevel === 'HIGH'
    ? 'This email is highly likely to be a phishing attempt.'
    : riskLevel === 'SUSPICIOUS'
    ? 'This email shows multiple suspicious indicators.'
    : 'This email has some minor concerns worth noting.';

  return `${intro} Our rule engine detected ${flags.length} flag${flags.length > 1 ? 's' : ''}: ${parts.join('; ')}. Risk score: ${score}/100.`;
}

// ── Generate Recommended Action ────────────────────────────────
function getRecommendedAction(riskLevel) {
  switch (riskLevel) {
    case 'HIGH':   return 'REPORT AS PHISHING';
    case 'SUSPICIOUS': return 'VERIFY SENDER';
    case 'LOW':    return 'SAFE TO OPEN';
    default:       return 'SAFE TO OPEN';
  }
}

// ── COMBINED ANALYZER ──────────────────────────────────────────
function analyzeEmail(email) {
  // Run all rule checks
  const allFlags = [
    ...checkSenderRules(email),
    ...checkSubjectRules(email),
    ...checkBodyRules(email),
    ...checkLinkRules(email),
    ...checkAttachmentRules(email),
    ...checkHeaderRules(email),
    ...checkBehavioralRules(email)
  ];

  // Deduplicate flags by rule ID (keep first of each)
  const seenIds = new Set();
  const uniqueFlags = allFlags.filter(f => {
    if (seenIds.has(f.id)) return false;
    seenIds.add(f.id);
    return true;
  });

  // Check for Auto-Phishing rules
  const isAutoPhish = uniqueFlags.some(f => AUTO_PHISH_RULES.includes(f.id));

  // Calculate score
  let rawScore = uniqueFlags.reduce((sum, f) => sum + f.weight, 0);
  let score = Math.min(rawScore, 100);

  // Determine risk level
  let riskLevel;
  if (isAutoPhish || score >= 80) {
    riskLevel = 'HIGH';
    score = Math.max(score, 85); // ensure high score for auto-phish
  } else if (score >= 60) {
    riskLevel = 'SUSPICIOUS'; // Likely Phishing maps to SUSPICIOUS in UI
  } else if (score >= 30) {
    riskLevel = 'SUSPICIOUS';
  } else if (score >= 1) {
    riskLevel = 'LOW';
  } else {
    riskLevel = 'SAFE';
  }

  const explanation = generateExplanation(uniqueFlags, score, riskLevel);
  const action = getRecommendedAction(riskLevel);
  const tips = SECURITY_TIPS[riskLevel] || SECURITY_TIPS['SAFE'];

  return {
    ...email,
    riskScore:    score,
    riskLevel,
    flags:        uniqueFlags.map(f => `[${f.id}] ${f.name} (+${f.weight}) — ${f.reason}`),
    explanation,
    action,
    securityTips: tips
  };
}

export { analyzeEmail };
