// GET /api/auth/authorize
// Inicia el flujo OAuth 2.0 (Authorization Code Flow con PKCE)
// Redirige al usuario a la pantalla de consentimiento de Google

export async function GET(req) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return Response.json(
      { error: 'Faltan GOOGLE_OAUTH_CLIENT_ID o GOOGLE_OAUTH_REDIRECT_URI en variables de entorno' },
      { status: 500 }
    );
  }

  // Scopes necesarios para Gemini Spark (perfil + email + openid)
  const scopes = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  // Generamos state aleatorio para CSRF protection
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const codeChallenge = await sha256Base64Url(codeVerifier);

  // Guardamos code_verifier y state en Redis con TTL corto (10 min)
  const redis = (await import('../../../../lib/db')).getRedis();
  await redis.set(`oauth:pkce:${state}`, JSON.stringify({ codeVerifier, redirectUri }), { ex: 600 });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // Para obtener refresh_token
    prompt: 'consent', // Fuerza consentimiento para asegurar refresh_token
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return Response.redirect(googleAuthUrl, 302);
}

// Helper: SHA-256 + base64url (para PKCE)
async function sha256Base64Url(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64 = btoa(String.fromCharCode(...hashArray));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}