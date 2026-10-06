// GET /api/auth/callback
// Callback de Google OAuth: recibe el authorization_code, lo intercambia por tokens,
// los guarda en Redis y muestra una página de éxito con el access_token para el usuario.

import { storeOAuthTokens } from '../../../../lib/auth';
import { getRedis } from '../../../../lib/db';

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return htmlResponse('Error en OAuth', `<pre>Google devolvió error: ${error}</pre>`, 400);
  }

  if (!code || !state) {
    return htmlResponse('Error', '<pre>Faltan parámetros code o state</pre>', 400);
  }

  // Recuperamos code_verifier y redirect_uri guardados en authorize
  const redis = getRedis();
  const pkceData = await redis.get(`oauth:pkce:${state}`);
  if (!pkceData) {
    return htmlResponse('Error', '<pre>State inválido o expirado (PKCE)</pre>', 400);
  }
  const { codeVerifier, redirectUri } = JSON.parse(pkceData);
  await redis.del(`oauth:pkce:${state}`); // Usar una sola vez

  // Intercambiamos code por access_token + refresh_token
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return htmlResponse('Error', '<pre>Faltan credenciales OAuth en servidor</pre>', 500);
  }

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams,
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    return htmlResponse('Error intercambiando código', `<pre>${errText}</pre>`, 500);
  }

  const tokenData = await tokenResp.json();
  const { access_token, refresh_token, expires_in, scope, id_token } = tokenData;

  // Decodificamos id_token (JWT) para obtener email del usuario
  let email = 'unknown';
  try {
    const payload = JSON.parse(atob(id_token.split('.')[1]));
    email = payload.email || 'unknown';
  } catch (e) {
    // Si no hay id_token o falla, intentamos con tokeninfo
    try {
      const infoResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${access_token}`);
      if (infoResp.ok) {
        const info = await infoResp.json();
        email = info.email || 'unknown';
      }
    } catch (e2) {
      // ignore
    }
  }

  // Guardamos tokens en Redis
  await storeOAuthTokens({
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresIn: expires_in,
    scope: scope,
    email: email,
  });

  // Página de éxito: mostramos el access_token para que el usuario lo copie
  // y lo pegue en Gemini Spark (o lo use en su cliente MCP)
  return htmlResponse(
    '✅ OAuth completado - Giardino San Juan',
    `
    <style>
      body { font-family: system-ui; max-width: 700px; margin: 3rem auto; padding: 0 1rem; line-height: 1.6; }
      .card { background: #f8f9fa; border-radius: 12px; padding: 1.5rem; margin: 1rem 0; }
      code { background: #e9ecef; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85rem; word-break: break-all; }
      .token-box { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 0.8rem; }
      button { background: #2563eb; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 1rem; }
      button:hover { background: #1d4ed8; }
      .label { font-weight: bold; color: #333; margin-bottom: 0.5rem; display: block; }
    </style>
    <h1>🎉 Conexión exitosa con Giardino San Juan</h1>
    <p>Tu cuenta <strong>${email}</strong> está ahora autorizada para acceder a la API MCP.</p>

    <div class="card">
      <span class="label">📋 Copia este Access Token y úsalo en Gemini Spark:</span>
      <div class="token-box" id="tokenBox">${access_token}</div>
      <button onclick="copyToken()">📋 Copiar token</button>
      <p style="margin-top:0.5rem; font-size:0.85rem; color:#666;">
        Este token expira en ${Math.floor(expires_in / 60)} minutos. 
        Tu cliente MCP debería refrescarlo automáticamente usando el refresh_token guardado en el servidor.
      </p>
    </div>

    <div class="card">
      <span class="label">🔗 Configuración para Gemini Spark:</span>
      <ul>
        <li><strong>MCP Server URL:</strong> <code>https://giardino-backend.vercel.app/api/mcp</code></li>
        <li><strong>Authorization:</strong> Bearer <code>[el token de arriba]</code></li>
      </ul>
      <p>En Gemini Spark: "Conectar app personalizada" → pega la URL → en autenticación selecciona "Bearer Token" → pega el token.</p>
    </div>

    <div class="card">
      <span class="label">🔄 Refresh Token (guardado en servidor):</span>
      <code>${refresh_token ? refresh_token.substring(0, 20) + '...' : 'No recibido (puede que ya hayas autorizado antes)'}</code>
      <p style="font-size:0.85rem; color:#666;">El servidor lo usará automáticamente para renovar tu access token cuando expire.</p>
    </div>

    <script>
      async function copyToken() {
        const token = document.getElementById('tokenBox').textContent.trim();
        await navigator.clipboard.writeText(token);
        alert('¡Token copiado al portapapeles!');
      }
    </script>
    `
  );
}

function htmlResponse(title, body, status = 200) {
  return new Response(
    `<!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body>${body}</body>
    </html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}