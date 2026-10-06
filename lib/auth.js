// Autenticación dual: API Key (Bearer) + OAuth 2.0 (Google)
// - API Key: para Gemini CLI, app web, scripts propios
// - OAuth: para Gemini Spark (web), otros clientes que usen OAuth

import { getRedis } from './db.js';

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

export async function requireAuth(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return Response.json({ error: 'Falta header Authorization: Bearer <token>' }, { status: 401 });
  }

  // 1) Primero intento: API Key estática (configurada en Vercel)
  const apiKey = process.env.API_KEY;
  if (apiKey && token === apiKey) {
    return null; // autorizado por API Key
  }

  // 2) Segundo intento: OAuth Access Token (Google)
  // Validamos contra Google tokeninfo y/o nuestro store en Redis
  const oauthValid = await validateOAuthToken(token);
  if (oauthValid) {
    return null; // autorizado por OAuth
  }

  // 3) Nada matched
  return Response.json({ error: 'No autorizado (API Key o OAuth token inválido)' }, { status: 401 });
}

async function validateOAuthToken(accessToken) {
  try {
    // Opción A: Validar contra Google tokeninfo (rápido, sin Redis)
    // Esto verifica que el token sea válido, no expirado, y nos da el email/scope
    const resp = await fetch(`${GOOGLE_TOKENINFO_URL}?access_token=${encodeURIComponent(accessToken)}`);
    if (resp.ok) {
      const info = await resp.json();
      // Verificamos que el token sea para nuestro cliente (audience)
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      if (clientId && info.aud === clientId) {
        // Token válido y pertenece a nuestra app
        return true;
      }
      // Si no tenemos clientId configurado, aceptamos cualquier token Google válido
      // (para desarrollo), pero en prod deberías tener clientId
      if (!clientId) return true;
    }
  } catch (e) {
    // tokeninfo falló, probamos opción B
  }

  // Opción B: Validar contra nuestro store en Redis (tokens que nosotros emitimos/guardamos)
  try {
    const redis = getRedis();
    const stored = await redis.get(`oauth:token:${accessToken}`);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.expiresAt && Date.now() < data.expiresAt) {
        return true;
      }
      // Expirado, limpiamos
      await redis.del(`oauth:token:${accessToken}`);
    }
  } catch (e) {
    // Redis no disponible o error
  }

  return false;
}

// Helper para guardar tokens OAuth en Redis (usado por callback/token endpoints)
export async function storeOAuthTokens({ accessToken, refreshToken, expiresIn, scope, email }) {
  const redis = getRedis();
  const expiresAt = Date.now() + (expiresIn * 1000);
  const data = {
    accessToken,
    refreshToken,
    expiresAt,
    scope,
    email,
    createdAt: Date.now(),
  };
  // Guardamos indexado por access_token para validación rápida
  await redis.set(`oauth:token:${accessToken}`, JSON.stringify(data), { ex: expiresIn + 60 });
  // También guardamos por email para poder revocar/listar
  await redis.set(`oauth:user:${email}`, JSON.stringify(data), { ex: 86400 * 30 }); // 30 días
  return data;
}

// Helper para refrescar access token usando refresh token
export async function refreshAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Faltan GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Error refrescando token: ${err}`);
  }

  const data = await resp.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}