import { requireAuth } from '../../../../lib/auth';
import { getTransacciones, setTransacciones } from '../../../../lib/db';

export async function DELETE(req, { params }) {
  const unauthorized = await requireAuth(req);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const lista = (await getTransacciones()).filter((t) => t.id !== id);
  await setTransacciones(lista);
  return Response.json({ ok: true });
}
