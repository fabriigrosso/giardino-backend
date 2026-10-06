import { requireAuth } from '../../../lib/auth';
import { getConfig, setConfig } from '../../../lib/db';

export async function GET(req) {
  const unauthorized = await requireAuth(req);
  if (unauthorized) return unauthorized;
  const cfg = await getConfig();
  return Response.json(cfg || {});
}

export async function PUT(req) {
  const unauthorized = await requireAuth(req);
  if (unauthorized) return unauthorized;
  const body = await req.json();
  await setConfig(body);
  return Response.json({ ok: true });
}
