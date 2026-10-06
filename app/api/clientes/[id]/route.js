import { requireAuth } from '../../../../lib/auth';
import { getClientes, setClientes } from '../../../../lib/db';

export async function PATCH(req, { params }) {
  const unauthorized = await requireAuth(req);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const body = await req.json();
  const clientes = await getClientes();
  const idx = clientes.findIndex((c) => c.id === id);
  if (idx === -1) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
  clientes[idx] = { ...clientes[idx], ...body };
  await setClientes(clientes);
  return Response.json(clientes[idx]);
}

export async function DELETE(req, { params }) {
  const unauthorized = await requireAuth(req);
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const clientes = (await getClientes()).filter((c) => c.id !== id);
  await setClientes(clientes);
  return Response.json({ ok: true });
}
