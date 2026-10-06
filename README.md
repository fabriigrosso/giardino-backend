# Giardino San Juan — App + Backend (API + MCP)

Este proyecto incluye **todo en un solo deploy de Vercel**:

- La app (`public/index.html`) — la calculadora/gestor que ya venías usando.
- El backend: API REST + servidor MCP, para que Gemini (u otro agente de IA
  compatible con MCP) pueda leer y escribir clientes, cobros y gastos
  directamente, y la app los sincronice desde cualquier celular.

Una vez desplegado, la app va a vivir en:

```
https://TU-PROYECTO.vercel.app/index.html
```

(guardate ese link en el celular, es el que vas a usar para trabajar).

## Qué incluye

- **API REST** (`/api/clientes`, `/api/transacciones`, `/api/config`): la usa
  la app web para subir/bajar sus datos.
- **Servidor MCP** (`/api/mcp`): la usa Gemini (o Claude, o cualquier cliente
  MCP) para listar clientes, agregar clientes, registrar cobros y gastos, y
  consultar el balance.
- **Base de datos**: Redis (Upstash), gratis en el plan Hobby de Vercel.
- **Seguridad**: todo pedido (API o MCP) requiere el header
  `Authorization: Bearer <API_KEY>`. Sin esa clave, nadie puede leer ni tocar
  tus datos, aunque la URL sea pública.

## 1. Subir el proyecto a GitHub

```bash
cd giardino-backend
git init
git add .
git commit -m "Backend Giardino San Juan"
```

Creá un repo nuevo en GitHub (puede ser privado) y pusheá:

```bash
git remote add origin https://github.com/TU-USUARIO/giardino-backend.git
git push -u origin main
```

## 2. Importar el proyecto en Vercel

1. Entrá a [vercel.com/new](https://vercel.com/new) y elegí el repo que
   acabás de crear.
2. Framework Preset: Vercel lo detecta solo como **Next.js**. No cambies nada.
3. Todavía **no** hagas deploy — primero agregá la base de datos (paso 3).

## 3. Agregar la base de datos (Redis / Upstash)

Dentro del proyecto en Vercel: **Storage → Create Database → Redis**
(aparece como integración de Upstash en el Marketplace, tiene plan gratis).
Al crearla y conectarla al proyecto, Vercel agrega solo las variables
`UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (o `KV_REST_API_URL` /
`KV_REST_API_TOKEN`, el código soporta ambos nombres).

## 4. Variable de entorno `API_KEY`

En **Settings → Environment Variables** agregá:

```
API_KEY = (elegí cualquier texto largo y random, por ejemplo una contraseña generada)
```

Esta es la clave que vas a cargar tanto en la app (sección "Nube" de
Configuración) como en Gemini. Guardala en un lugar seguro — es la llave de
tu negocio.

## 5. Deploy

Hacé click en **Deploy**. Cuando termina, Vercel te da una URL tipo:

```
https://giardino-backend.vercel.app
```

Entrá a esa URL y debería verse la página de estado ("El servidor está
corriendo correctamente"). Eso confirma que el backend quedó bien.

Después entrá a `https://giardino-backend.vercel.app/index.html` — ahí está
la app de siempre. Agregala a la pantalla de inicio de tu celular (ahora sí
va a funcionar como app instalable de verdad, con ícono propio y offline).

## 6. Conectar Gemini (Gemini CLI) al servidor MCP

Instalá Gemini CLI si no lo tenés (`npm install -g @google/gemini-cli`) y
en `~/.gemini/settings.json` agregá:

```json
{
  "mcpServers": {
    "giardino-san-juan": {
      "url": "https://giardino-backend.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer TU_API_KEY_ACA"
      }
    }
  }
}
```

Reiniciá Gemini CLI y probá:

```
gemini
> Listame los clientes de Giardino San Juan
> Agregame un cliente nuevo: "Familia Ramírez", quincenal, $18000
> Registrame un gasto de $8000 en combustible, pagado en efectivo
```

Gemini va a usar las herramientas `listar_clientes`, `agregar_cliente`,
`registrar_cobro`, `registrar_gasto`, `listar_transacciones` y
`obtener_balance` según lo que le pidas.

## 7. Conectar la app (index.html) al mismo backend

En la app, pestaña **Configuración → 🔗 Sincronizar con la nube**, cargá:

- **URL del backend**: `https://giardino-backend.vercel.app`
- **API Key**: la misma que configuraste en el paso 4

Con eso vas a poder:
- **📤 Subir a la nube**: empuja tus clientes/transacciones locales al
  backend (pisa lo que haya ahí).
- **📥 Traer de la nube**: trae lo que haya en el backend (por ejemplo, lo
  que Gemini acaba de cargar) y lo mete en tu celular.

La app sigue funcionando 100% offline con `localStorage` aunque no
configures nada de esto — la nube es opcional, solo hace falta si querés
que Gemini pueda leer/escribir tus datos.

> ⚠️ Importante: la sincronización con la nube (botones "Subir"/"Traer")
> solo funciona abriendo la app desde su URL real
> (`https://.../index.html`), no desde una vista previa de artifact de
> Claude — los navegadores no dejan que una página hecha por otra IA llame
> a servidores externos arbitrarios por seguridad. Por eso este mismo
> `index.html` ahora se sirve también desde `public/`, para que quede
> hosteado en un dominio real.

## Notas de seguridad

- No compartas tu `API_KEY` ni la URL del backend públicamente.
- Si sospechás que se filtró la clave, cambiá la variable `API_KEY` en
  Vercel y volvé a cargarla en la app y en Gemini.
- Esta es una implementación simple (una sola clave para todo). Si en el
  futuro trabajás con más gente, conviene pasar a un sistema de usuarios
  real.
