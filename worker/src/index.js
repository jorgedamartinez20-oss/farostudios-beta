// Faro — servicio de archivos (Cloudflare Worker + R2)
// Un solo lugar para los archivos: faro-privado (clientes, agencias, Academy) y faro-publico (landing).
// Los datos (quién es quién) viven en Supabase; aquí solo se guardan, listan y entregan archivos.

const MB = 1024 * 1024;
const UMBRAL_SIMPLE = 40 * MB; // por encima de esto el admin sube por partes
const TTL_ENLACE_MAX = 24 * 3600; // segundos

/* ---------- Estructura de carpetas (única definición) ---------- */
const STUDIOS = [
  ['agencias', 'Agencias'],
  ['corporativo', 'Corporativo'],
  ['clientes-individuales', 'Clientes individuales'],
];
const AREAS = [['ingles', 'Inglés'], ['musica', 'Música']];
const CATS_ACADEMY = [
  ['contenido-de-clase', 'Contenido de clase'],
  ['material-didactico', 'Material didáctico'],
  ['videos', 'Videos'],
  ['ejercicios', 'Ejercicios'],
  ['clases', 'Clases'],
];
const PERSONAS = [['alumnos', 'Alumnos'], ['docentes', 'Docentes']];
const LANDING = [
  ['fotos-studios', 'Fotos de Studios'],
  ['portafolio', 'Portafolio'],
  ['producciones-musicales', 'Producciones musicales'],
  ['recursos-gratis', 'Recursos gratis'],
  ['catalogo', 'Catálogo'],
  ['academy-fotos', 'Fotos de Academy'],
];

// "entidad": la carpeta lleva debajo una carpeta por persona/empresa (se crea al darla de alta).
export const DESTINOS = [
  ...STUDIOS.map(([id, et]) => ({ id: 'studios/' + id, bucket: 'privado', prefijo: `faro-studios/${id}/`, etiqueta: `Faro Studios › ${et}`, entidad: true })),
  ...AREAS.flatMap(([a, aet]) => [
    ...CATS_ACADEMY.map(([id, et]) => ({ id: `academy/${a}/${id}`, bucket: 'privado', prefijo: `faro-academy/${a}/${id}/`, etiqueta: `Faro Academy › ${aet} › ${et}`, entidad: false })),
    ...PERSONAS.map(([id, et]) => ({ id: `academy/${a}/${id}`, bucket: 'privado', prefijo: `faro-academy/${a}/${id}/`, etiqueta: `Faro Academy › ${aet} › ${et}`, entidad: true })),
  ]),
  ...LANDING.map(([id, et]) => ({ id: 'landing/' + id, bucket: 'publico', prefijo: `landing/${id}/`, etiqueta: `Landing › ${et}`, entidad: false })),
];

/* ---------- Utilidades de nombres y rutas ---------- */
export function slug(txt) {
  return String(txt || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
export function nombreArchivo(n) {
  let s = String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^A-Za-z0-9._()\-]+/g, '').replace(/-{2,}/g, '-').replace(/^[.\-]+/, '');
  if (s.length > 150) {
    const i = s.lastIndexOf('.');
    const ext = i > 0 && s.length - i <= 10 ? s.slice(i) : '';
    s = s.slice(0, 150 - ext.length) + ext;
  }
  return s;
}
function claveValida(bucket, key) {
  if (typeof key !== 'string' || !key || key.length > 400) return null;
  if (key.includes('..') || key.startsWith('/') || key.includes('//') || key.includes('\\')) return null;
  for (const d of DESTINOS) {
    if (d.bucket !== bucket || !key.startsWith(d.prefijo)) continue;
    const resto = key.slice(d.prefijo.length);
    const partes = resto.split('/');
    if (d.entidad) {
      if (partes.length !== 2 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(partes[0]) || !partes[1]) continue;
      if (partes[1] !== nombreArchivo(partes[1])) continue;
    } else {
      if (partes.length !== 1 || !partes[0] || partes[0] !== nombreArchivo(partes[0])) continue;
    }
    return d;
  }
  return null;
}
export function carpetasBase() {
  return DESTINOS.map((d) => ({ bucket: d.bucket, key: d.prefijo + '.keep' }));
}

/* ---------- Respuestas, CORS ---------- */
function origenPermitido(request, env) {
  const o = request.headers.get('Origin') || '';
  const lista = String(env.ORIGENES || '').split(',').map((x) => x.trim()).filter(Boolean);
  return lista.includes(o) ? o : '';
}
function cors(request, env, extra = {}) {
  const h = new Headers(extra);
  const o = origenPermitido(request, env);
  if (o) {
    h.set('Access-Control-Allow-Origin', o);
    h.set('Vary', 'Origin');
    h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    h.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    h.set('Access-Control-Max-Age', '86400');
  }
  return h;
}
function json(request, env, data, status = 200) {
  const h = cors(request, env, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  return new Response(JSON.stringify(data), { status, headers: h });
}
const err = (request, env, msg, status = 400) => json(request, env, { error: msg }, status);

/* ---------- Autenticación de administrador (Supabase) ---------- */
const CACHE_ADMIN = new Map();
async function esAdmin(request, env) {
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
  if (!m) return false;
  const tok = m[1];
  const hasta = CACHE_ADMIN.get(tok);
  if (hasta && hasta > Date.now()) return true;
  let r;
  try {
    r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${tok}` } });
  } catch (e) { return false; }
  if (!r.ok) return false;
  const u = await r.json().catch(() => ({}));
  const ok = !!u.email && String(u.email).toLowerCase() === String(env.ADMIN_EMAIL || '').toLowerCase();
  if (ok) {
    if (CACHE_ADMIN.size > 50) CACHE_ADMIN.clear();
    CACHE_ADMIN.set(tok, Date.now() + 60000);
  }
  return ok;
}

/* ---------- Enlaces firmados (temporales) ---------- */
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
async function hmac(secreto, data) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
function iguales(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function firmar(env, payload) {
  const data = b64u(enc.encode(JSON.stringify(payload)));
  return data + '.' + (await hmac(env.FIRMA_SECRETO, data));
}
export async function verificar(env, token) {
  if (!env.FIRMA_SECRETO || typeof token !== 'string') return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  if (!iguales(sig, await hmac(env.FIRMA_SECRETO, data))) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(deb64u(data)));
    return p.e > Date.now() / 1000 ? p : null;
  } catch (e) { return null; }
}

/* ---------- Entrega de un objeto (con soporte de Range) ---------- */
async function entregar(request, env, bucket, key, { descargar = false, nombre = '', cache = 'private, max-age=0' } = {}) {
  const obj = await bucket.get(key, { range: request.headers });
  if (!obj) return err(request, env, 'No existe ese archivo', 404);
  const h = cors(request, env);
  obj.writeHttpMetadata(h);
  h.set('ETag', obj.httpEtag);
  h.set('Accept-Ranges', 'bytes');
  h.set('Cache-Control', cache);
  const base = nombre || key.split('/').pop();
  h.set('Content-Disposition', `${descargar ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(base)}`);
  let status = 200;
  if (obj.range && obj.range.offset !== undefined) {
    status = 206;
    const off = obj.range.offset, len = obj.range.length ?? obj.size - off;
    h.set('Content-Range', `bytes ${off}-${off + len - 1}/${obj.size}`);
    h.set('Content-Length', String(len));
  } else {
    h.set('Content-Length', String(obj.size));
  }
  return new Response(request.method === 'HEAD' ? null : obj.body, { status, headers: h });
}

/* ---------- Servicio ---------- */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ruta = url.pathname.replace(/\/+$/, '') || '/';
    const B = { privado: env.PRIVADO, publico: env.PUBLICO };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) });

    // Archivos públicos del landing (sin sesión, con caché)
    if (ruta.startsWith('/pub/')) {
      const key = decodeURIComponent(ruta.slice(5));
      if (!key.startsWith('landing/') || key.includes('..') || key.endsWith('.keep')) return err(request, env, 'No existe ese archivo', 404);
      return entregar(request, env, env.PUBLICO, key, { cache: 'public, max-age=31536000, immutable' });
    }

    if (ruta === '/api/arbol') return json(request, env, { destinos: DESTINOS, umbralSimple: UMBRAL_SIMPLE });

    // Descarga por enlace firmado (no necesita sesión; el enlace caduca)
    if (ruta === '/api/bajar') {
      const p = await verificar(env, url.searchParams.get('t'));
      if (!p || !B[p.b]) return err(request, env, 'El enlace no es válido o ya venció', 403);
      return entregar(request, env, B[p.b], p.k, { descargar: url.searchParams.get('inline') !== '1' });
    }

    // Todo lo demás es solo para el administrador
    if (!ruta.startsWith('/api/')) return err(request, env, 'No encontrado', 404);
    if (!(await esAdmin(request, env))) return err(request, env, 'Necesitas entrar como administrador', 401);

    const bucketNombre = url.searchParams.get('bucket') || '';
    const bucket = B[bucketNombre];
    const key = url.searchParams.get('key') || '';

    try {
      // Crea las carpetas base (marcadores .keep) — se puede repetir sin problema
      if (ruta === '/api/init' && request.method === 'POST') {
        const lista = carpetasBase();
        for (const c of lista) await B[c.bucket].put(c.key, new Uint8Array(0), { customMetadata: { marcador: 'carpeta' } });
        return json(request, env, { ok: true, carpetas: lista.length });
      }

      // Crea la carpeta de una persona/empresa dentro de un destino "entidad"
      if (ruta === '/api/carpeta' && request.method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const d = DESTINOS.find((x) => x.id === b.destino && x.entidad);
        const s = slug(b.nombre);
        if (!d || !s) return err(request, env, 'Elige el destino y escribe un nombre');
        await B[d.bucket].put(`${d.prefijo}${s}/.keep`, new Uint8Array(0), { customMetadata: { marcador: 'carpeta', nombre: String(b.nombre).slice(0, 120) } });
        return json(request, env, { ok: true, carpeta: `${d.prefijo}${s}/`, slug: s });
      }

      // Lista carpetas y archivos de un prefijo
      if (ruta === '/api/lista' && request.method === 'GET') {
        if (!bucket) return err(request, env, 'Bucket inválido');
        const prefix = url.searchParams.get('prefix') || '';
        if (prefix.includes('..') || prefix.startsWith('/')) return err(request, env, 'Ruta inválida');
        const r = await bucket.list({ prefix, delimiter: '/', limit: 1000, include: ['customMetadata'] });
        return json(request, env, {
          carpetas: r.delimitedPrefixes,
          archivos: r.objects.filter((o) => !o.key.endsWith('/.keep')).map((o) => ({ key: o.key, size: o.size, subido: o.uploaded })),
          nombres: Object.fromEntries(r.objects.filter((o) => o.customMetadata && o.customMetadata.nombre).map((o) => [o.key, o.customMetadata.nombre])),
        });
      }

      // Subida simple (hasta el umbral)
      if (ruta === '/api/subir' && request.method === 'PUT') {
        if (!bucket || !claveValida(bucketNombre, key)) return err(request, env, 'Ruta de destino no permitida');
        const largo = Number(request.headers.get('Content-Length') || 0);
        if (!largo) return err(request, env, 'Falta el tamaño del archivo');
        if (largo > UMBRAL_SIMPLE) return err(request, env, 'Archivo grande: se sube por partes', 413);
        await bucket.put(key, request.body, { httpMetadata: { contentType: request.headers.get('Content-Type') || 'application/octet-stream' } });
        return json(request, env, { ok: true, key });
      }

      // Subida por partes (videos y producciones pesadas)
      if (ruta === '/api/multipart/inicio' && request.method === 'POST') {
        if (!bucket || !claveValida(bucketNombre, key)) return err(request, env, 'Ruta de destino no permitida');
        const mp = await bucket.createMultipartUpload(key, { httpMetadata: { contentType: url.searchParams.get('tipo') || 'application/octet-stream' } });
        return json(request, env, { uploadId: mp.uploadId });
      }
      if (ruta === '/api/multipart/parte' && request.method === 'PUT') {
        if (!bucket || !claveValida(bucketNombre, key)) return err(request, env, 'Ruta de destino no permitida');
        const n = Number(url.searchParams.get('n'));
        if (!Number.isInteger(n) || n < 1 || n > 10000) return err(request, env, 'Número de parte inválido');
        const mp = bucket.resumeMultipartUpload(key, url.searchParams.get('uploadId') || '');
        const parte = await mp.uploadPart(n, await request.arrayBuffer());
        return json(request, env, { partNumber: parte.partNumber, etag: parte.etag });
      }
      if (ruta === '/api/multipart/fin' && request.method === 'POST') {
        if (!bucket || !claveValida(bucketNombre, key)) return err(request, env, 'Ruta de destino no permitida');
        const b = await request.json().catch(() => ({}));
        if (!Array.isArray(b.partes) || !b.partes.length) return err(request, env, 'Faltan las partes');
        const mp = bucket.resumeMultipartUpload(key, url.searchParams.get('uploadId') || '');
        const o = await mp.complete(b.partes.map((p) => ({ partNumber: p.partNumber, etag: p.etag })));
        return json(request, env, { ok: true, key, size: o.size });
      }
      if (ruta === '/api/multipart/cancelar' && request.method === 'POST') {
        if (!bucket || !claveValida(bucketNombre, key)) return err(request, env, 'Ruta de destino no permitida');
        await bucket.resumeMultipartUpload(key, url.searchParams.get('uploadId') || '').abort();
        return json(request, env, { ok: true });
      }

      // Enlace temporal de descarga
      if (ruta === '/api/enlace' && request.method === 'POST') {
        if (!env.FIRMA_SECRETO) return err(request, env, 'Falta configurar FIRMA_SECRETO en el servicio (ver LEEME)', 500);
        if (!bucket || !key || key.includes('..') || key.endsWith('/.keep')) return err(request, env, 'Archivo inválido');
        const seg = Math.min(Math.max(Number(url.searchParams.get('seg')) || 3600, 60), TTL_ENLACE_MAX);
        const t = await firmar(env, { b: bucketNombre, k: key, e: Math.floor(Date.now() / 1000) + seg });
        return json(request, env, { url: `${url.origin}/api/bajar?t=${t}`, urlVer: `${url.origin}/api/bajar?inline=1&t=${t}`, vence_en: seg });
      }

      // Borrar un archivo
      if (ruta === '/api/objeto' && request.method === 'DELETE') {
        if (!bucket || !key || key.includes('..') || key.endsWith('/.keep')) return err(request, env, 'Archivo inválido');
        await bucket.delete(key);
        return json(request, env, { ok: true });
      }
    } catch (e) {
      return err(request, env, 'No se pudo completar la operación', 500);
    }

    return err(request, env, 'No encontrado', 404);
  },
};
