import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { requireAuth } from '../../../lib/auth';
import { getClientes } from '../../../lib/db';
import {
  agregarCliente,
  registrarCobro,
  registrarGasto,
  obtenerBalance,
  calcularProximaVisita,
} from '../../../lib/logic';
import { getTransacciones } from '../../../lib/db';

const texto = (obj) => ({
  content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }],
});

const mcpHandler = createMcpHandler((server) => {
  server.registerTool(
    'listar_clientes',
    {
      title: 'Listar clientes recurrentes',
      description:
        'Devuelve todos los clientes recurrentes de Giardino San Juan: nombre, frecuencia, monto, estado (Pendiente/Pagado) y próxima visita estimada.',
      inputSchema: z.object({}),
    },
    async () => {
      const clientes = await getClientes();
      const conProxima = clientes.map((c) => ({
        ...c,
        proximaVisita: calcularProximaVisita(c),
      }));
      return texto(conProxima);
    }
  );

  server.registerTool(
    'agregar_cliente',
    {
      title: 'Agregar cliente recurrente',
      description:
        'Da de alta un nuevo cliente recurrente en la agenda de Giardino San Juan.',
      inputSchema: z.object({
        nombre: z.string().describe('Nombre del cliente'),
        frecuencia: z
          .enum(['Semanal', 'Quincenal', 'Mensual'])
          .describe('Frecuencia del mantenimiento'),
        monto: z.number().describe('Monto que se cobra por cada visita, en pesos argentinos'),
        costoEstimado: z
          .number()
          .optional()
          .describe('Costo estimado de operación por visita (opcional, para calcular rentabilidad)'),
      }),
    },
    async (args) => texto(await agregarCliente(args))
  );

  server.registerTool(
    'registrar_cobro',
    {
      title: 'Registrar el cobro de un cliente',
      description:
        'Marca a un cliente recurrente como Pagado, registra el ingreso en Finanzas con el medio de pago usado y actualiza su próxima visita.',
      inputSchema: z.object({
        clienteId: z.string().describe('id del cliente (se obtiene con listar_clientes)'),
        medioPago: z.enum(['Efectivo', 'Mercado Pago']),
      }),
    },
    async (args) => texto(await registrarCobro(args))
  );

  server.registerTool(
    'registrar_gasto',
    {
      title: 'Registrar un gasto operativo',
      description:
        'Carga un gasto operativo de la empresa (combustible, insumos, mantenimiento de máquinas, almuerzo/varios, etc.) en el módulo Finanzas.',
      inputSchema: z.object({
        categoria: z
          .string()
          .describe('Ej: "Combustible camioneta", "Insumos / Nylon", "Mantenimiento de máquinas", "Almuerzo / Varios"'),
        monto: z.number(),
        medioPago: z.enum(['Efectivo', 'Mercado Pago']),
        fecha: z
          .string()
          .optional()
          .describe('Fecha en formato YYYY-MM-DD. Si no se indica, se usa la fecha de hoy.'),
      }),
    },
    async (args) => texto(await registrarGasto(args))
  );

  server.registerTool(
    'listar_transacciones',
    {
      title: 'Listar ingresos y gastos',
      description:
        'Devuelve el listado de transacciones (ingresos y gastos) de Finanzas, opcionalmente filtrado por rango de fechas.',
      inputSchema: z.object({
        desde: z.string().optional().describe('YYYY-MM-DD'),
        hasta: z.string().optional().describe('YYYY-MM-DD'),
      }),
    },
    async ({ desde, hasta }) => {
      let data = await getTransacciones();
      if (desde) data = data.filter((t) => t.fecha >= desde);
      if (hasta) data = data.filter((t) => t.fecha <= hasta);
      return texto(data);
    }
  );

  server.registerTool(
    'obtener_balance',
    {
      title: 'Obtener balance financiero',
      description:
        'Calcula el total de ingresos y gastos (desglosados por Efectivo y Mercado Pago) y el balance neto final, opcionalmente en un rango de fechas.',
      inputSchema: z.object({
        desde: z.string().optional().describe('YYYY-MM-DD'),
        hasta: z.string().optional().describe('YYYY-MM-DD'),
      }),
    },
    async (args) => texto(await obtenerBalance(args))
  );
});

async function withAuth(req) {
  const unauthorized = await requireAuth(req);
  if (unauthorized) return unauthorized;
  return mcpHandler(req);
}

export { withAuth as GET, withAuth as POST };
