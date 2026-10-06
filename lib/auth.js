// Autenticación simple por token (Bearer) para todas las rutas.
// Tanto la app web como Gemini (vía MCP) deben mandar:
//   Authorization: Bearer <API_KEY>
export function requireAuth(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.API_KEY;

  if (!expected) {
    return Response.json(
      { error: 'El servidor no tiene configurada la variable API_KEY.' },
      { status: 500 }
    );
  }
  if (token !== expected) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }
  return null; // null = autorizado, seguí con el handler
}
