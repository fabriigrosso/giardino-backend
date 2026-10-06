// POST /api/auth/token
// Endpoint de token OAuth 2.0 (para refresh_token flow)
// Acepta grant_type=refresh_token y devuelve nuevo access_token

import { refreshAccessToken, storeOAuthTokens } from '../../../../lib/auth';
import { getRedis } from '../../../../lib/db';

export async function POST(req) {
  const contentType = req.headers.get('content-type') || '';
  let body;

  if (contentType.includes('application/json')) {
    body = await req.json();
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    body = Object.fromEntries(form);
  } else {
    return Response.json({ error: 'Content-Type debe ser application/json o application/x-www-form-urlencoded' }, { status: 400 });
  }

  const { grant_type, refresh_token, client_id, client_secret } = body;

  // Validamos client credentials (opcional, pero recomendado)
  const expectedClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const expectedClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (client_id && client_id !== expectedClientId) {
    return Response.json({ error: 'invalid_client' }, { status: 401 });
  }
  if (client_secret && client_secret !== expectedClientSecret) {
    return Response.json({ error: 'invalid_client' }, { status: 401 });
  }

  if (grant_type !== 'refresh_token') {
    return Response.json({ error: 'unsupported_grant_type' }, { status: 400 });
  }

  if (!refresh_token) {
    return Response.json({ error: 'invalid_request: falta refresh_token' }, { status: 400 });
  }

  try {
    // Refrescamos contra Google
    const { accessToken, expiresIn, scope } = await refreshAccessToken(refresh_token);

    // Obtenemos email del token anterior (guardado en Redis indexado por refresh_token)
    // Buscamos en Redis el registro que tenga este refresh_token
    const redis = getRedis();
    // Nota: en implementación real buscaríamos por refresh_token, pero por simplicidad
    // asumimos que el cliente nos manda el email o lo sacamos del token anterior
    // Para este caso, validamos el nuevo access_token contra Google para obtener email
    let email = 'unknown';
    try {
      const infoResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
      if (infoResp.ok) {
        const info = await infoResp.json();
        email = info.email || 'unknown';
      }
    } catch (e) {
      // ignore
    }

    // Guardamos el nuevo access_token (el refresh_token suele ser el mismo en Google)
    await storeOAuthTokens({
      accessToken,
      refreshToken: refresh_token, // Google suele devolver el mismo refresh_token
      expiresIn,
      scope,
      email,
    });

    return Response.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: scope,
    });
  } catch (err) {
    return Response.json({ error: 'invalid_grant', error_description: err.message }, { status: 400 });
  }
}