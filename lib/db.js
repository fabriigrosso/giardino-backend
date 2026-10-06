import { Redis } from '@upstash/redis';

// Soporta tanto el naming de Upstash directo como el que a veces
// expone la integración de Vercel Marketplace (KV_REST_API_*).
const url =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let redis = null;
export function getRedis() {
  if (!redis) {
    if (!url || !token) {
      throw new Error(
        'Faltan las variables de Redis (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). ' +
        'Agregá la integración de Redis desde Vercel Marketplace.'
      );
    }
    redis = new Redis({ url, token });
  }
  return redis;
}

const KEYS = {
  clientes: 'giardino:clientes',
  transacciones: 'giardino:transacciones',
  config: 'giardino:config',
};

export async function getClientes() {
  const data = await getRedis().get(KEYS.clientes);
  return Array.isArray(data) ? data : [];
}
export async function setClientes(list) {
  await getRedis().set(KEYS.clientes, Array.isArray(list) ? list : []);
}

export async function getTransacciones() {
  const data = await getRedis().get(KEYS.transacciones);
  return Array.isArray(data) ? data : [];
}
export async function setTransacciones(list) {
  await getRedis().set(KEYS.transacciones, Array.isArray(list) ? list : []);
}

export async function getConfig() {
  const data = await getRedis().get(KEYS.config);
  return data && typeof data === 'object' ? data : null;
}
export async function setConfig(cfg) {
  await getRedis().set(KEYS.config, cfg || {});
}
