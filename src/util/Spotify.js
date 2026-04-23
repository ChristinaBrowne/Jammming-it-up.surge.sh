const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const redirectUri =
  process.env.REACT_APP_SPOTIFY_REDIRECT_URI ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/'
    : 'https://jammming-it-up.vercel.app/callback');
const scopes = ['playlist-modify-public'];

const TOKEN_KEY = 'spotify_access_token';
const EXPIRY_KEY = 'spotify_token_expiry';
const VERIFIER_KEY = 'spotify_code_verifier';
let accessToken;

const parseResponseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) return response.json();

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
};

const getErrorMessage = (body, fallback) => {
  if (!body) return fallback;
  if (typeof body === 'string') return body;

  if (body.error && typeof body.error === 'string') return body.error;
  if (body.error && body.error.message) return body.error.message;

  if (body.message) return body.message;

  return fallback;
};

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = window.crypto.getRandomValues(new Uint8Array(length));

  return Array.from(values, (value) => possible[value % possible.length]).join('');
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64UrlEncode = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const buildAuthUrl = async () => {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(hashed);

  window.localStorage.setItem(VERIFIER_KEY, codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

const storeToken = (token, expiresIn) => {
  accessToken = token;
  const expiryTime = Date.now() + expiresIn * 1000;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(EXPIRY_KEY, String(expiryTime));
};

const clearToken = () => {
  accessToken = '';
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(EXPIRY_KEY);
};

const getStoredToken = () => {
  if (accessToken) {
    return accessToken;
  }

  const storedToken = window.localStorage.getItem(TOKEN_KEY);
  const expiry = Number(window.localStorage.getItem(EXPIRY_KEY));

  if (storedToken && expiry && Date.now() < expiry) {
    accessToken = storedToken;
    return storedToken;
  }

  clearToken();
  return null;
};

const exchangeCodeForToken = async (code) => {
  const codeVerifier = window.localStorage.getItem(VERIFIER_KEY);

  if (!codeVerifier) {
    throw new Error('Missing PKCE code verifier.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorBody = await parseResponseBody(response);
    throw new Error(getErrorMessage(errorBody, `Spotify token exchange failed with status ${response.status}.`));
  }

  const data = await parseResponseBody(response);
  window.localStorage.removeItem(VERIFIER_KEY);
  storeToken(data.access_token, data.expires_in);

  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('code');
  cleanUrl.searchParams.delete('state');
  window.history.replaceState({}, document.title, `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);

  return data.access_token;
};

const getAccessToken = async () => {
  const storedToken = getStoredToken();
  if (storedToken) {
    return storedToken;
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');

  if (code) {
    return exchangeCodeForToken(code);
  }

  const authUrl = await buildAuthUrl();
  window.location.assign(authUrl);
  return null;
};

const authorizedFetch = async (url, options = {}) => {
  const token = await getAccessToken();

  if (!token) {
    return Promise.reject(new Error('Spotify access token is not available.'));
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearToken();
    throw new Error('Spotify authorization expired. Please try again.');
  }

  if (!response.ok) {
    const errorBody = await parseResponseBody(response);
    throw new Error(getErrorMessage(errorBody, `Spotify request failed with status ${response.status}.`));
  }

  return response;
};

const Spotify = {
  getAccessToken,

  getTrack(id) {
    return authorizedFetch(`https://api.spotify.com/v1/tracks/${id}`)
      .then((response) => parseResponseBody(response));
  },

  search(term) {
    return authorizedFetch(`https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(term)}`)
      .then((response) => parseResponseBody(response))
      .then((jsonResponse) => {
        if (!jsonResponse.tracks) {
          return [];
        }

        return jsonResponse.tracks.items.map((track) => ({
          id: track.id,
          name: track.name,
          artist: track.artists[0].name,
          album: track.album.name,
          uri: track.uri,
          preview_url: track.preview_url
        }));
      });
  },

  savePlaylist(name, trackUris) {
    if (!name || !trackUris.length) {
      return Promise.resolve();
    }

    let userId;

    return authorizedFetch('https://api.spotify.com/v1/me')
      .then((response) => parseResponseBody(response))
      .then((jsonResponse) => {
        userId = jsonResponse.id;

        return authorizedFetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name })
        });
      })
      .then((response) => parseResponseBody(response))
      .then((jsonResponse) => {
        const playlistId = jsonResponse.id;

        return authorizedFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uris: trackUris })
        });
      });
  }
};

export default Spotify;
