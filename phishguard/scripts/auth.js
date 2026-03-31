// auth.js — Google OAuth 2.0 flow using Google Identity Services (GIS)
// Completely free, no paid API required

const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email';
let tokenClient;
let accessToken = null;
let _onSuccessCallback = null;
let _onSignOutCallback = null;

function initAuth(clientId, onSuccess, onSignOut) {
  _onSuccessCallback = onSuccess;
  _onSignOutCallback = onSignOut;

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (response) => {
      if (response.error) {
        console.error('Auth error:', response.error);
        return;
      }
      if (response.access_token) {
        accessToken = response.access_token;

        // Fetch user info for display
        fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
          .then(r => r.json())
          .then(user => {
            if (_onSuccessCallback) {
              _onSuccessCallback(accessToken, user.email || 'user@gmail.com');
            }
          })
          .catch(() => {
            if (_onSuccessCallback) {
              _onSuccessCallback(accessToken, 'user@gmail.com');
            }
          });
      }
    }
  });
}

function signIn() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }
}

function signOut() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {
      accessToken = null;
      if (_onSignOutCallback) _onSignOutCallback();
    });
  }
}

function getAccessToken() {
  return accessToken;
}

export { initAuth, signIn, signOut, getAccessToken };
