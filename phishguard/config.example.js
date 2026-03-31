// config.js
// ──────────────────────────────────────────────────────────────────
//  Step 1: Get Google Client ID from https://console.cloud.google.com
//    → New Project → Enable Gmail API → Create OAuth 2.0 Credentials
//    → Authorized JavaScript Origins: http://localhost:3000
//
//  Step 2: Get FREE Gemini API Key from https://aistudio.google.com/app/apikey
//    → Create API Key → Copy it below
//
//  Step 3: Copy this file to config.js and fill in your keys
// ──────────────────────────────────────────────────────────────────

export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
export const GEMINI_API_KEY   = 'YOUR_GEMINI_API_KEY';
