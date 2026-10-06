import { getClientes, setClientes, getTransacciones, setTransacciones } from './db';

const INTERVALO_DIAS = { Semanal: 7, Quincenal: 14, Mensual: 30 };

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export async function agregarCliente({ nombre, frecuencia, monto, costoEstimado }) {
  const clientes = await getClientes();
  const nuevo = {
    id: 'c' + Date.now() + Math.floor(Math.random() * 1000),
    nombre,
    frecuencia: frecuencia || 'Quincenal',
    monto: Number(monto) || 0,
    costoEstimado: Number(costoEstimado) || 0,
    estado: 'Pendiente',
    fechaAlta: hoyISO(),
  };
  clientes.unshift(nuevo);
  await setClientes(clientes);
  return nuevo;
}

export async function registrarCobro({ clienteId, medioPago }) {
  const clientes = await getClientes();
  const cliente = clientes.find((c) => c.id === clienteId);
  if (!cliente) throw new Error(`No existe un cliente con id "${clienteId}"`);

  const hoy = hoyISO();
  const transacciones = await getTransacciones();
  const registro = {
    id: 'ing' + Date.now(),
    tipo: 'ingreso',
    fecha: hoy,
    monto: cliente.monto,
    medioPago: medioPago || 'Efectivo',
    detalle: cliente.nombre,
    clienteId: cliente.id,
  };
  transacciones.push(registro);
  await setTransacciones(transacciones);

  cliente.estado = 'Pagado';
  cliente.ultimoMedioPago = registro.medioPago;
  cliente.ultimoIngresoId = registro.id;
  cliente.ultimaFecha = hoy;
  await setClientes(clientes);

  return { cliente, transaccion: registro };
}

export async function registrarGasto({ categoria, monto, medioPago, fecha }) {
  const transacciones = await getTransacciones();
  const registro = {
    id: 'gas' + Date.now(),
    tipo: 'gasto',
    fecha: fecha || hoyISO(),
    monto: Number(monto) || 0,
    medioPago: medioPago || 'Efectivo',
    detalle: categoria || 'Otro',
  };
  transacciones.push(registro);
  await setTransacciones(transacciones);
  return registro;
}

export async function obtenerBalance({ desde, hasta } = {}) {
  const transacciones = await getTransacciones();
  const dentroDeRango = (t) => {
    if (desde && t.fecha < desde) return false;
    if (hasta && t.fecha > hasta) return false;
    return true;
  };
  let ingEfectivo = 0, ingMP = 0, gasEfectivo = 0, gasMP = 0;
  transacciones.filter(dentroDeRango).forEach((t) => {
    const esEfectivo = t.medioPago === 'Efectivo';
    if (t.tipo === 'ingreso') {
      if (esEfectivo) ingEfectivo += t.monto; else ingMP += t.monto;
    } else {
      if (esEfectivo) gasEfectivo += t.monto; else gasMP += t.monto;
    }
  });
  const totalIngresos = ingEfectivo + ingMP;
  const totalGastos = gasEfectivo + gasMP;
  return {
    totalIngresos, ingEfectivo, ingMP,
    totalGastos, gasEfectivo, gasMP,
    balanceNeto: totalIngresos - totalGastos,
  };
}

export function calcularProximaVisita(c) {
  const dias = INTERVALO_DIAS[c.frecuencia] || 14;
  const baseStr = c.ultimaFecha || c.fechaAlta || hoyISO();
  const [y, m, d] = baseStr.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + dias);
  return `${String(base.getDate()).padStart(2, '0')}/${String(base.getMonth() + 1).padStart(2, '0')}/${base.getFullYear()}`;
}
