import { requireAuth } from '../../../lib/auth';
import { getClientes, setClientes } from '../../../lib/db';
import { agregarCliente } from '../../../lib/logic';

export async function GET(req) {
  const unauthorized = requireAuth(req);
  if (unauthorized) return unauthorized;
  return Response.json(await getClientes());
}

export async function POST(req) {
  const unauthorized = requireAuth(req);
  if (unauthorized) return unauthorized;
  const body = await req.json();
  if (!body.nombre) {
    return Response.json({ error: 'Falta el nombre del cliente' }, { status: 400 });
  }
  const nuevo = await agregarCliente(body);
  return Response.json(nuevo, { status: 201 });
}

// Reemplazo masivo: lo usa el botón "Subir a la nube" de la app,
// que empuja todo el arreglo de clientes tal cual lo tiene localStorage.
export async function PUT(req) {
  const unauthorized = requireAuth(req);
  if (unauthorized) return unauthorized;
  const body = await req.json();
  await setClientes(Array.isArray(body) ? body : []);
  return Response.json({ ok: true, total: Array.isArray(body) ? body.length : 0 });
}
