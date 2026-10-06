import { requireAuth } from '../../../lib/auth';
import { getTransacciones, setTransacciones } from '../../../lib/db';
import { registrarGasto } from '../../../lib/logic';

export async function GET(req) {
  const unauthorized = await requireAuth(req);
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');
  let data = await getTransacciones();
  if (desde) data = data.filter((t) => t.fecha >= desde);
  if (hasta) data = data.filter((t) => t.fecha <= hasta);
  return Response.json(data);
}

// Crea un gasto operativo (categoria, monto, medioPago, fecha opcional)
export async function POST(req) {
  const unauthorized = await requireAuth(req);
  if (unauthorized) return unauthorized;
  const body = await req.json();
  if (!body.monto) return Response.json({ error: 'Falta el monto' }, { status: 400 });
  const registro = await registrarGasto(body);
  return Response.json(registro, { status: 201 });
}

// Reemplazo masivo: lo usa el botón "Subir a la nube" de la app.
export async function PUT(req) {
  const unauthorized = await requireAuth(req);
  if (unauthorized) return unauthorized;
  const body = await req.json();
  await setTransacciones(Array.isArray(body) ? body : []);
  return Response.json({ ok: true, total: Array.isArray(body) ? body.length : 0 });
}
