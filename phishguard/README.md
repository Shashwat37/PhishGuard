# 🛡️ Phishing Email Detector — Gmail Phishing Scanner

A stunning, editorial-dark-themed Gmail phishing scanner that uses **AI + rule-based detection** to analyze your inbox for threats. Built with vanilla HTML/CSS/JS — zero frameworks, zero paid APIs.

![Design inspired by zarcerog.com](https://img.shields.io/badge/Design-zarcerog.com%20inspired-f37056?style=flat-square)
![100% Free](https://img.shields.io/badge/Cost-100%25%20Free-4caf76?style=flat-square)
![Read-Only](https://img.shields.io/badge/Gmail-Read--Only%20Access-e8b84b?style=flat-square)

---

## ✨ Features

- **Two-Layer Detection**: Fast rule-based checks + Gemini AI deep analysis
- **Real Gmail Integration**: Connects via OAuth 2.0 (read-only)
- **Editorial Dark Design**: zarcerog.com-inspired brutalist aesthetic
- **GSAP Animations**: Smooth enter transitions, count-up stats, score bar fills
- **Custom Cursor**: Coral dot + ring that reacts to interactive elements
- **Noise Grain Overlay**: SVG-based texture for that premium feel
- **Risk Scoring**: 0–100 weighted score (70% AI + 30% rules)
- **Zero Data Storage**: Everything processed client-side

---

## 🚀 Setup (5 minutes, 100% free)

### 1. Get Google OAuth Client ID (Free)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project → name it "Phishing Email Detector"
3. Go to **APIs & Services → Enable APIs** → search "Gmail API" → **Enable**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web Application**
6. Authorized JavaScript Origins: `http://localhost:3000`
7. Copy the Client ID

### 2. Get Gemini API Key (Free)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"** → Copy it

### 3. Configure the app
Open `config.js` and paste your keys:

```javascript
export const GOOGLE_CLIENT_ID = 'your-client-id.apps.googleusercontent.com';
export const GEMINI_API_KEY   = 'your-gemini-api-key';
```

### 4. Run the app
```bash
npx serve . -p 3000
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Sign in and scan
- Click **"SIGN IN WITH GOOGLE"**
- Authorize read-only Gmail access
- Click **"▶ RUN SCAN"**
- See your inbox analyzed for phishing

---

## 🏗️ Architecture

```
phishguard/
├── index.html          ← Main app shell
├── config.js           ← OAuth + Gemini API keys
├── styles/
│   ├── main.css        ← Global styles + design tokens
│   ├── layout.css      ← Grid, panels, sidebar
│   └── components.css  ← Badges, buttons, email rows
├── scripts/
│   ├── auth.js         ← Google OAuth 2.0 flow
│   ├── gmail.js        ← Gmail API calls
│   ├── analyzer.js     ← Phishing detection engine
│   ├── ui.js           ← DOM rendering + animations
│   └── app.js          ← Main orchestrator
└── README.md           ← This file
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0c0c0b` | Near-black background |
| `--surface` | `#131312` | Card/panel surfaces |
| `--accent` | `#f37056` | Coral primary accent |
| `--safe` | `#4caf76` | Green for safe emails |
| `--warn` | `#e8b84b` | Amber for suspicious |
| `--danger` | `#f37056` | Coral for high risk |

**Fonts**: Bebas Neue (display) · DM Mono (body) · Instrument Serif (accents)

---

## 🔒 Security

- **Read-only access**: Only `gmail.readonly` scope requested
- **No data stored**: All analysis happens in the browser
- **No backend**: Pure client-side app
- **API keys stay local**: Never transmitted anywhere except Google's APIs

---

## 📝 License

MIT — Use freely, modify freely, credit appreciated.
