// gmail.js — Gmail API integration (free REST API, no SDK needed)

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function fetchEmailList(accessToken, maxResults = 25) {
  const res = await fetch(
    `${GMAIL_API}/messages?maxResults=${maxResults}&q=in:inbox`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`Gmail API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.messages || [];
}

async function fetchEmailDetail(accessToken, messageId) {
  const res = await fetch(
    `${GMAIL_API}/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`Gmail detail error: ${res.status}`);
  }
  return await res.json();
}

function parseEmail(rawMessage) {
  const headers = rawMessage.payload?.headers || [];
  const getHeader = (name) =>
    headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  // Decode body
  let bodyText = '';
  function extractBody(parts) {
    if (!parts) return;
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        try {
          bodyText += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch (e) {
          // Base64 decode error — skip
        }
      }
      if (part.parts) extractBody(part.parts);
    }
  }

  if (rawMessage.payload?.body?.data) {
    try {
      bodyText = atob(rawMessage.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } catch (e) {
      bodyText = '';
    }
  } else {
    extractBody(rawMessage.payload?.parts);
  }

  // Extract all links from body
  const linkRegex = /https?:\/\/[^\s"'<>]+/g;
  const links = [...new Set(bodyText.match(linkRegex) || [])];

  // Parse sender
  const fromHeader = getHeader('From');
  let senderName = fromHeader.split('<')[0].trim().replace(/"/g, '');
  let senderEmail = '';
  const emailMatch = fromHeader.match(/<(.+?)>/);
  if (emailMatch) {
    senderEmail = emailMatch[1];
  } else {
    senderEmail = fromHeader;
  }

  return {
    id: rawMessage.id,
    subject:     getHeader('Subject') || '(no subject)',
    senderName:  senderName || senderEmail,
    senderEmail: senderEmail,
    date:        getHeader('Date'),
    bodyText:    bodyText.slice(0, 2000), // cap for analysis
    links:       links.slice(0, 10),
    snippet:     rawMessage.snippet || ''
  };
}

export { fetchEmailList, fetchEmailDetail, parseEmail };
