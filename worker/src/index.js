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
  ['contenido', 'Contenido en redes'], // una carpeta por día: contenido/AAAA-MM-DD/archivo
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
  ['academy-descargas', 'Descargas de Academy'],
  ['hero', 'Portada (video)'],
  ['servicios', 'Servicios'],
  ['equipo', 'Equipo (Quiénes somos)'],
  ['resenas', 'Reseñas'],
  ['logos', 'Logos de pago'],
];

// Documentos propios del director (catálogos, afiches, datos de cuenta, SAT…). Siempre privados.
// Tercer valor: true = lleva una carpeta debajo (el SAT va por año).
const DOCUMENTOS = [
  ['catalogos', 'Catálogos', false],
  ['afiches', 'Afiches y diseños', false],
  ['datos-de-cuenta', 'Datos de cuenta', false],
  ['sat', 'SAT', true],
  ['otros', 'Otros documentos', false],
];

// Subcarpetas de cada alumno (deben coincidir con archivo_permiso en la base de datos).
export const TIPOS_ALUMNO = ['material', 'respuestas', 'practicas', 'mis-archivos', 'diplomas', 'facturas'];
const EXT_PROHIBIDAS = /\.(html?|xhtml|svg|js|mjs|exe|bat|cmd|sh|php|jar|apk|msi|dll)$/i;

// "entidad": la carpeta lleva debajo una carpeta por persona/empresa (se crea al darla de alta).
export const DESTINOS = [
  ...STUDIOS.map(([id, et]) => ({ id: 'studios/' + id, bucket: 'privado', prefijo: `faro-studios/${id}/`, etiqueta: `Faro Studios › ${et}`, entidad: true })),
  ...AREAS.flatMap(([a, aet]) => [
    ...CATS_ACADEMY.map(([id, et]) => ({ id: `academy/${a}/${id}`, bucket: 'privado', prefijo: `faro-academy/${a}/${id}/`, etiqueta: `Faro Academy › ${aet} › ${et}`, entidad: false })),
    ...PERSONAS.map(([id, et]) => ({ id: `academy/${a}/${id}`, bucket: 'privado', prefijo: `faro-academy/${a}/${id}/`, etiqueta: `Faro Academy › ${aet} › ${et}`, entidad: true })),
  ]),
  ...DOCUMENTOS.map(([id, et, ent]) => ({ id: 'documentos/' + id, bucket: 'privado', prefijo: `documentos/${id}/`, etiqueta: `Documentos › ${et}`, entidad: ent })),
  // Carpeta propia de cada alumno, docente y cliente (el nombre de la carpeta lo pone la base de datos: columna "carpeta").
  { id: 'academy/estudiantes', bucket: 'privado', prefijo: 'faro-academy/estudiantes/', etiqueta: 'Faro Academy › Alumnos (carpeta propia)', entidad: true, persona: 'estudiante' },
  { id: 'academy/docentes', bucket: 'privado', prefijo: 'faro-academy/docentes/', etiqueta: 'Faro Academy › Docentes (carpeta propia)', entidad: true, persona: 'docente' },
  { id: 'studios/clientes', bucket: 'privado', prefijo: 'faro-studios/clientes/', etiqueta: 'Faro Studios › Clientes (carpeta propia)', entidad: true, persona: 'cliente' },
  // Música de fondo de las galerías (ej. el piano): un archivo por galería, que el cliente solo escucha.
  { id: 'studios/musica-galerias', bucket: 'privado', prefijo: 'faro-studios/musica-galerias/', etiqueta: 'Faro Studios › Música de las galerías', entidad: false },
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
    if (d.persona === 'estudiante') {
      if (partes.length !== 3 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(partes[0]) || !TIPOS_ALUMNO.includes(partes[1]) || !partes[2]) continue;
      if (partes[2] !== nombreArchivo(partes[2])) continue;
    } else if (d.entidad) {
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
// Carpeta de una persona: "faro-academy/estudiantes/ana-perez-1a2b3c4d/" (la genera la base de datos).
const RE_CARPETA = /^(faro-academy\/(estudiantes|docentes)|faro-studios\/clientes)\/[a-z0-9]+(-[a-z0-9]+)*\/$/;
export function marcadoresPersona(carpeta) {
  if (!RE_CARPETA.test(carpeta || '') || carpeta.length > 120) return null;
  const subs = carpeta.startsWith('faro-academy/estudiantes/') ? TIPOS_ALUMNO.map((t) => carpeta + t + '/') : [];
  return [carpeta, ...subs].map((c) => c + '.keep');
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
    h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Range');
    h.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
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
/* Nivel de autenticación que trae el token de Supabase: aal1 = solo contraseña, aal2 = contraseña + código. */
function aalDelToken(tok) {
  try {
    const p = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(p)).aal || 'aal1';
  } catch (e) { return 'aal1'; }
}
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
  const correoOk = !!u.email && String(u.email).toLowerCase() === String(env.ADMIN_EMAIL || '').toLowerCase();
  // Igual que la base de datos (mfa_ok): si la cuenta tiene el código de 2 pasos activado,
  // la sesión debe haberlo pasado (aal2). Con solo la contraseña no se abren los archivos.
  const tieneCodigo = Array.isArray(u.factors) && u.factors.some((f) => f.factor_type === 'totp' && f.status === 'verified');
  const ok = correoOk && (!tieneCodigo || aalDelToken(tok) === 'aal2');
  if (ok) {
    if (CACHE_ADMIN.size > 50) CACHE_ADMIN.clear();
    CACHE_ADMIN.set(tok, Date.now() + 60000);
  }
  return ok;
}

/* ---------- Lectores del equipo (permiso "ver_archivos": solo ver y descargar) ---------- */
const CACHE_LECTOR = new Map();
async function esLector(request, env) {
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
  if (!m) return false;
  const tok = m[1];
  const hasta = CACHE_LECTOR.get(tok);
  if (hasta && hasta > Date.now()) return true;
  let ok = false;
  try {
    // la base decide (incluye cuenta activa y código de 2 pasos): tiene_permiso('ver_archivos')
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/tiene_permiso`, {
      method: 'POST', headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: 'ver_archivos' }),
    });
    ok = r.ok && (await r.json()) === true;
  } catch (e) { return false; }
  if (ok) {
    if (CACHE_LECTOR.size > 50) CACHE_LECTOR.clear();
    CACHE_LECTOR.set(tok, Date.now() + 60000);
  }
  return ok;
}
/* Lo único que puede ver un lector: Studios y Academy (privado) y el landing (público). Nunca documentos, estadísticas ni papelera. */
function alcanceLector(bucketNombre, ref) {
  if (typeof ref !== 'string' || ref.includes('..') || ref.includes('//') || ref.includes('\\') || ref.startsWith('/')) return false;
  if (bucketNombre === 'privado') return ref.startsWith('faro-studios/') || ref.startsWith('faro-academy/');
  if (bucketNombre === 'publico') return ref.startsWith('landing/');
  return false;
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


/* ---------- Versiones livianas de las fotos (se crean en el navegador del admin al subir) ---------- */
// _mini-<nombre>.jpg (≈900 px, para el muro) y _vista-<nombre>.jpg (≈2400 px, para verla grande) junto al original.
const baseSinExt = (k) => k.split('/').pop().replace(/\.[^.]+$/, '');
const carpetaDe = (k) => k.slice(0, k.lastIndexOf('/') + 1);
export async function derivadasDe(env, filas) {
  const por = new Map();
  for (const f of filas) { if (f.tipo === 'imagen' && f.key) por.set(carpetaDe(f.key), 1); }
  const hay = new Set();
  if (env.PRIVADO && typeof env.PRIVADO.list === 'function') {
    for (const c of por.keys()) {
      for (const pre of ['_mini-', '_vista-']) {
        try { const r = await env.PRIVADO.list({ prefix: c + pre, limit: 1000 }); for (const o of r.objects) hay.add(o.key); } catch (e) { /* sin versiones livianas: se usa el original */ }
      }
    }
  }
  return (key) => ({ mini: hay.has(carpetaDe(key) + '_mini-' + baseSinExt(key) + '.jpg') ? carpetaDe(key) + '_mini-' + baseSinExt(key) + '.jpg' : null, vista: hay.has(carpetaDe(key) + '_vista-' + baseSinExt(key) + '.jpg') ? carpetaDe(key) + '_vista-' + baseSinExt(key) + '.jpg' : null });
}
// Mismo enlace durante varias horas (se redondea el vencimiento) para que el navegador guarde las fotos en caché.
const vencimientoEstable = () => (Math.floor(Date.now() / 3600000) + 3) * 3600;

/* ---------- Contador de descargas y vistas (un archivo pequeño en el bucket privado) ---------- */
const STATS_KEY = '_stats/descargas.json';
const DIAS_GUARDADOS = 400;
function areaDe(key) { return key.startsWith('faro-studios/') ? 's' : key.startsWith('faro-academy/') ? 'a' : 'o'; }
async function leerStats(env) {
  const o = await env.PRIVADO.get(STATS_KEY);
  if (!o) return { archivos: {}, dias: {} };
  try { const j = JSON.parse(await new Response(o.body).text()); return { archivos: j.archivos || {}, dias: j.dias || {} }; } catch (e) { return { archivos: {}, dias: {} }; }
}
async function contar(env, key, tipo) { // tipo: 'd' descarga, 'v' reproducción/vista
  try {
    const st = await leerStats(env);
    const hoy = new Date().toISOString().slice(0, 10);
    const f = st.archivos[key] || (st.archivos[key] = { d: 0, v: 0 });
    f[tipo]++; f.u = hoy;
    const dia = st.dias[hoy] || (st.dias[hoy] = {});
    const a = dia[areaDe(key)] || (dia[areaDe(key)] = { d: 0, v: 0 });
    a[tipo]++;
    const limite = new Date(Date.now() - DIAS_GUARDADOS * 864e5).toISOString().slice(0, 10);
    for (const k of Object.keys(st.dias)) if (k < limite) delete st.dias[k];
    await env.PRIVADO.put(STATS_KEY, new TextEncoder().encode(JSON.stringify(st)), { httpMetadata: { contentType: 'application/json' } });
  } catch (e) { /* contar nunca debe romper una descarga */ }
}
// Recorre todo el bucket (por páginas) y resume cuántos archivos, peso y subidas por mes hay en cada área.
async function resumenBucket(bucket, areaDeKey, oculto = new Set(), nombre = '') {
  const areas = {}; let cursor, paginas = 0;
  do {
    const r = await bucket.list({ cursor, limit: 1000 });
    for (const o of r.objects) {
      if (o.key.endsWith('/.keep') || o.key.startsWith('_stats/') || o.key.startsWith('_papelera/') || o.key.startsWith('_respaldos/') || oculto.has(nombre + '|' + o.key)) continue;
      const a = areas[areaDeKey(o.key)] || (areas[areaDeKey(o.key)] = { n: 0, b: 0, meses: {} });
      a.n++; a.b += o.size;
      const m = new Date(o.uploaded).toISOString().slice(0, 7);
      a.meses[m] = (a.meses[m] || 0) + 1;
    }
    cursor = r.truncated ? r.cursor : undefined;
  } while (cursor && ++paginas < 30);
  return { areas, completo: !cursor };
}


/* ---------- Papelera general ----------
   Borrar nunca quita el archivo de R2: deja una marca en "_papelera/" y el archivo desaparece de las listas y de los enlaces.
   Se puede restaurar. Solo el director lo borra de verdad ("purgar"). */
const PAPELERA = '_papelera/';
const DIAS_PAPELERA = 30;
const marcaKey = (b, k) => PAPELERA + b64u(enc.encode(b + '|' + k));
async function enPapelera(env, b, k) { return !!(await env.PRIVADO.head(marcaKey(b, k))); }
async function clavesPapelera(env) { // Set "bucket|key" de todo lo que está en la papelera
  const out = new Set(); let cursor;
  do {
    const r = await env.PRIVADO.list({ prefix: PAPELERA, cursor, limit: 1000, include: ['customMetadata'] });
    for (const o of r.objects) if (o.customMetadata && o.customMetadata.k) out.add(o.customMetadata.b + '|' + o.customMetadata.k);
    cursor = r.truncated ? r.cursor : undefined;
  } while (cursor);
  return out;
}
async function aPapelera(env, b, k, por, size) {
  await env.PRIVADO.put(marcaKey(b, k), new Uint8Array(0), { customMetadata: { b, k, por: String(por || '').slice(0, 120), cuando: new Date().toISOString(), size: String(size || 0) } });
}
function usuarioDelToken(tok) {
  try { const j = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return j.email || j.sub || ''; } catch (e) { return ''; }
}

/* ---------- Portal (alumnos, familias, docentes, equipo): la base de datos decide quién puede qué ---------- */
async function permiso(env, tok, key, accion) {
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/archivo_permiso`, {
      method: 'POST', headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_key: key, p_accion: accion }),
    });
    return r.ok && (await r.json()) === true;
  } catch (e) { return false; }
}
function claveDePortal(key) { // estructura permitida en el portal (la base ya valida el dueño y el tipo)
  if (typeof key !== 'string' || !key || key.length > 400 || key.includes('..') || key.includes('//') || key.includes('\\') || key.startsWith('/')) return false;
  const d = claveValida('privado', key);
  if (!d || !d.persona) return false;
  const nom = key.split('/').pop();
  return !!nom && nom !== '.keep' && !EXT_PROHIBIDAS.test(nom);
}
async function portal(request, env, ctx, ruta, url) {
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
  if (!m) return err(request, env, 'Inicia sesión', 401);
  const tok = m[1];
  const key = url.searchParams.get('key') || '';
  if (!claveDePortal(key)) return err(request, env, 'Ruta no permitida');

  if (ruta === '/p/enlace' && request.method === 'POST') {
    if (!env.FIRMA_SECRETO) return err(request, env, 'Servicio sin configurar', 500);
    if (!(await permiso(env, tok, key, 'leer'))) return err(request, env, 'No tienes acceso a este archivo', 403);
    if (await enPapelera(env, 'privado', key)) return err(request, env, 'No existe ese archivo', 404);
    const t = await firmar(env, { b: 'privado', k: key, e: Math.floor(Date.now() / 1000) + 3600 });
    return json(request, env, { url: `${url.origin}/api/bajar?t=${t}`, urlVer: `${url.origin}/api/bajar?inline=1&t=${t}`, vence_en: 3600 });
  }
  if (ruta === '/p/subir' && request.method === 'PUT') {
    const largo = Number(request.headers.get('Content-Length') || 0);
    if (!largo) return err(request, env, 'Falta el tamaño del archivo');
    if (largo > UMBRAL_SIMPLE) return err(request, env, 'El archivo es muy pesado (máximo 40 MB)', 413);
    if (!(await permiso(env, tok, key, 'escribir'))) return err(request, env, 'No puedes subir aquí', 403);
    const tipo = (request.headers.get('Content-Type') || 'application/octet-stream').toLowerCase();
    if (/html|javascript|svg/.test(tipo)) return err(request, env, 'Tipo de archivo no permitido');
    if (key.includes('/practicas/') || key.includes('/respuestas/')) { if (!/^audio\//.test(tipo) && !/^video\/(webm|mp4)$/.test(tipo)) return err(request, env, 'Aquí solo van grabaciones de audio'); if (largo > 25 * MB) return err(request, env, 'La grabación es muy larga', 413); }
    if (await env.PRIVADO.head(key)) { await env.PRIVADO.delete(marcaKey('privado', key)); } // reemplazo: lo nuevo no queda oculto
    await env.PRIVADO.put(key, request.body, { httpMetadata: { contentType: tipo } });
    return json(request, env, { ok: true, key });
  }
  if (ruta === '/p/borrar' && request.method === 'POST') {
    if (!(await permiso(env, tok, key, 'borrar'))) return err(request, env, 'No puedes borrar este archivo', 403);
    const o = await env.PRIVADO.head(key);
    if (!o) return err(request, env, 'No existe ese archivo', 404);
    await aPapelera(env, 'privado', key, usuarioDelToken(tok), o.size);
    return json(request, env, { ok: true, papelera: true });
  }
  return err(request, env, 'No encontrado', 404);
}

/* ---------- Respaldos diarios (00:00 hora de Guatemala) ----------
   Cada día guarda en el bucket privado, carpeta "_respaldos/AAAA-MM-DD/":
   · codigo.zip            todo el código del repositorio de GitHub
   · datos/<tabla>.json    todas las tablas de Supabase (formularios, registros, landing, entregas…)
   · esquema.sql           estructura COMPLETA (tablas, llaves, índices, funciones, triggers, RLS, permisos, buckets, tareas programadas)
   · auth.json             usuarios (con contraseña y MFA) para restaurarlos tal cual
   · COMO-RESTAURAR.txt    guía para volver a cargar el respaldo
   · esquema-api.json      estructura de las tablas (vista API)
   · archivos-privado.json / archivos-publico.json   lista de todos los archivos de R2 (nombre, peso, fecha)
   · descargas.json        contador de descargas
   · resumen.json          qué se guardó y si hubo avisos
   Trabaja por pasos pequeños (así cabe en los límites de Cloudflare); los disparadores de las 00:00 lo van continuando. */
const RESP = '_respaldos/';
const RESP_DIAS = 30;
const RESP_LLAMADAS = 35;
const RESP_FASES = ['esquema', 'datos', 'codigo', 'archivos', 'cierre'];
const guiaRestaurar = (fecha) => `CÓMO RESTAURAR ESTE RESPALDO (Faro Studios)
Es la foto de la base de datos y del código a la medianoche (00:00, hora de Guatemala) del ${fecha}.

Lo más fácil: dile a Claude «restaura desde el respaldo del ${fecha}» y adjunta este ZIP.

A mano:
1. esquema.sql   → Supabase → SQL Editor → pegar completo → Run. Crea tablas, columnas, llaves, índices, funciones,
                   triggers, reglas de seguridad (RLS), permisos, buckets y tareas programadas. Se puede correr sobre
                   una base vacía o sobre la actual (no duplica nada).
2. auth.json     → usuarios con su contraseña y MFA. Se cargan con SQL (Claude lo hace por ti).
3. datos/        → un archivo JSON por tabla (las tablas grandes vienen en .p1, .p2…). Se cargan con SQL (Claude lo hace por ti).
4. codigo.zip    → todo el repositorio: la web, el Worker, las funciones de Supabase y los SQL.
5. Lo que NO está en este respaldo:
   · Las fotos, videos y archivos de R2: archivos-privado.json y archivos-publico.json son solo la LISTA (nombre, peso, fecha).
   · Los secretos: SUPABASE_SERVICE_KEY, FIRMA_SECRETO, GITHUB_TOKEN (Cloudflare) y push_secret (Supabase Vault).
     Guárdalos en tu gestor de contraseñas. Si se pierde FIRMA_SECRETO, los enlaces ya enviados dejan de abrir.
   · Ajustes de Supabase Auth (MFA obligatorio, correos, URLs permitidas) y los secretos de las funciones de Supabase.
`;
const hoyGT = () => new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
async function rLeer(env, k) { const o = await env.PRIVADO.get(k); if (!o) return null; try { return JSON.parse(await new Response(o.body).text()); } catch (e) { return null; } }
const rGuardar = (env, k, v, tipo = 'application/json') => env.PRIVADO.put(k, typeof v === 'string' || v instanceof ArrayBuffer ? v : JSON.stringify(v), { httpMetadata: { contentType: tipo } });
export async function respaldoPaso(env, { fecha = hoyGT(), nuevo = false } = {}) {
  const base = RESP + fecha + '/';
  let st = await rLeer(env, base + 'estado.json');
  if (st && st.fase === 'listo' && !nuevo) return st;
  if (st && st.bloqueo > Date.now() && !nuevo) return { ...st, ocupado: true };
  if (!st || nuevo) st = { fecha, fase: 'esquema', inicio: new Date().toISOString(), avisos: [], tablas: [], ti: 0, pag: 0, filas: {}, fallos: 0, manifiesto: {} };
  st.bloqueo = Date.now() + 90000;
  await rGuardar(env, base + 'estado.json', st);
  let llamadas = 0;
  const red = (...a) => { llamadas++; return fetch(...a); };
  const hay = () => llamadas < RESP_LLAMADAS;
  const SK = env.SUPABASE_SERVICE_KEY;
  // La llave nueva de Supabase (sb_secret_…) va solo en apikey; la antigua service_role (eyJ…) también como Bearer
  const cab = SK && String(SK).startsWith('eyJ') ? { apikey: SK, Authorization: `Bearer ${SK}` } : { apikey: SK };
  const sigue = () => { st.fase = RESP_FASES[RESP_FASES.indexOf(st.fase) + 1] || 'listo'; st.fallos = 0; };
  try {
    if (st.fase === 'esquema') {
      if (!SK) { st.avisos.push('Falta el secreto SUPABASE_SERVICE_KEY: no se respaldaron las tablas de la base de datos.'); st.fase = 'codigo'; }
      else {
        const r = await red(`${env.SUPABASE_URL}/rest/v1/`, { headers: cab });
        if (!r.ok) { st.avisos.push('No se pudo leer la estructura de la base (' + r.status + ').'); st.fase = 'codigo'; }
        else {
          const api = await r.json();
          await rGuardar(env, base + 'esquema-api.json', api);
          // Estructura completa (esquema.sql) y usuarios (auth.json): funciones SQL de sql/respaldo-esquema.sql
          const rpc = (nombre) => red(`${env.SUPABASE_URL}/rest/v1/rpc/${nombre}`, { method: 'POST', headers: { ...cab, 'Content-Type': 'application/json' }, body: '{}' });
          try {
            const e1 = await rpc('faro_respaldo_esquema');
            if (e1.ok) { const sql = String(await e1.json()); await rGuardar(env, base + 'esquema.sql', sql, 'text/plain; charset=utf-8'); st.estructura = sql.length; }
            else st.avisos.push(e1.status === 404 ? 'Falta ejecutar sql/respaldo-esquema.sql en Supabase: la estructura completa y los usuarios no se respaldaron.' : 'Estructura completa: error ' + e1.status);
            if (e1.ok) {
              const e2 = await rpc('faro_respaldo_auth');
              if (e2.ok) { const au = await e2.json(); await rGuardar(env, base + 'auth.json', au); st.usuarios = (au.usuarios || []).length; }
              else st.avisos.push('Usuarios: error ' + e2.status);
            }
          } catch (e) { st.avisos.push('Estructura y usuarios: ' + (e.message || e)); }
          st.tablas = Object.keys(api.paths || {}).filter((p) => p !== '/' && !p.startsWith('/rpc/')).map((p) => p.slice(1));
          st.fase = 'datos';
        }
      }
    }
    while (st.fase === 'datos' && hay()) {
      if (st.ti >= st.tablas.length) { sigue(); break; }
      const t = st.tablas[st.ti], desde = st.pag * 1000;
      const r = await red(`${env.SUPABASE_URL}/rest/v1/${encodeURIComponent(t)}?select=*`, { headers: { ...cab, 'Range-Unit': 'items', Range: `${desde}-${desde + 999}` } });
      let filas = [];
      if (r.ok) filas = await r.json(); else if (r.status !== 416) st.avisos.push(`Tabla ${t}: error ${r.status}`);
      if (filas.length || st.pag === 0) {
        if (r.ok) { await rGuardar(env, `${base}datos/${t}${st.pag ? '.p' + st.pag : ''}.json`, filas); st.filas[t] = (st.filas[t] || 0) + filas.length; }
      }
      if (filas.length >= 1000) st.pag++; else { st.ti++; st.pag = 0; }
    }
    if (st.fase === 'codigo' && hay()) {
      const repo = env.GITHUB_REPO || 'jorgedamartinez20-oss/farostudios-beta', rama = env.GITHUB_RAMA || 'main';
      const h = { 'User-Agent': 'faro-respaldo', Accept: 'application/vnd.github+json' };
      if (env.GITHUB_TOKEN) h.Authorization = 'Bearer ' + env.GITHUB_TOKEN;
      const r = await red(`https://api.github.com/repos/${repo}/zipball/${rama}`, { headers: h });
      if (r.ok) { const buf = await r.arrayBuffer(); await rGuardar(env, base + 'codigo.zip', buf, 'application/zip'); st.codigoBytes = buf.byteLength; }
      else st.avisos.push('No se pudo bajar el código de GitHub (' + r.status + ').' + (r.status === 404 ? ' Si el repositorio es privado, falta el secreto GITHUB_TOKEN.' : ''));
      sigue();
    }
    if (st.fase === 'archivos') {
      for (const [nom, b] of [['privado', env.PRIVADO], ['publico', env.PUBLICO]]) {
        const items = []; let cursor, pg = 0, bytes = 0;
        do {
          const r = await b.list({ cursor, limit: 1000 });
          for (const o of r.objects) { if (o.key.startsWith(RESP)) continue; items.push([o.key, o.size, o.uploaded]); bytes += o.size; }
          cursor = r.truncated ? r.cursor : undefined;
        } while (cursor && ++pg < 200);
        await rGuardar(env, `${base}archivos-${nom}.json`, { generado: new Date().toISOString(), total: items.length, bytes, completo: !cursor, archivos: items });
        st.manifiesto[nom] = { n: items.length, bytes };
      }
      const est = await env.PRIVADO.get(STATS_KEY);
      if (est) await rGuardar(env, base + 'descargas.json', await new Response(est.body).text());
      sigue();
    }
    if (st.fase === 'cierre') {
      const r = await env.PRIVADO.list({ prefix: base });
      const archivos = r.objects.filter((o) => !o.key.endsWith('/estado.json') && !o.key.endsWith('/resumen.json')).map((o) => ({ key: o.key, size: o.size }));
      const resumen = {
        fecha, inicio: st.inicio, fin: new Date().toISOString(), estado: st.avisos.length ? 'parcial' : 'completo',
        tablas: Object.keys(st.filas).length, filas: Object.values(st.filas).reduce((s, x) => s + x, 0), codigoBytes: st.codigoBytes || 0,
        estructura: !!st.estructura, usuarios: st.usuarios || 0,
        manifiesto: st.manifiesto, avisos: st.avisos, bytes: archivos.reduce((s, x) => s + x.size, 0), archivos,
      };
      await rGuardar(env, base + 'COMO-RESTAURAR.txt', guiaRestaurar(fecha), 'text/plain; charset=utf-8');
      await rGuardar(env, base + 'resumen.json', resumen);
      await rGuardar(env, RESP + 'ultimo.json', { fecha, estado: resumen.estado, fin: resumen.fin });
      // conserva los últimos RESP_DIAS respaldos y, para siempre, el del día 1 de cada mes
      const dias = (await env.PRIVADO.list({ prefix: RESP, delimiter: '/' })).delimitedPrefixes.sort();
      for (const d of dias.slice(0, Math.max(0, dias.length - RESP_DIAS)).filter(d => !/-01\/$/.test(d))) {
        const x = await env.PRIVADO.list({ prefix: d });
        for (const o of x.objects) await env.PRIVADO.delete(o.key);
      }
      st.fase = 'listo';
    }
  } catch (e) {
    st.fallos = (st.fallos || 0) + 1;
    st.avisos.push(`Paso "${st.fase}" con error: ${String((e && e.message) || e).slice(0, 120)}`);
    if (st.fallos >= 3) sigue();
  }
  st.bloqueo = 0;
  await rGuardar(env, base + 'estado.json', st);
  return st;
}
const estadoPublico = (st) => ({ fecha: st.fecha, fase: st.fase, listo: st.fase === 'listo', ocupado: !!st.ocupado, tablas: (st.tablas || []).length, hechas: st.ti || 0, avisos: st.avisos || [] });

/* ---------- Almacenamiento: cuánto ocupa todo, quién ocupa más y qué se puede limpiar sin riesgo ---------- */
const ALM_KEY = '_stats/almacenamiento.json';
const ALM_VIGENCIA = 5 * 60 * 1000;
const EXT_TIPO = {
  fotos: 'jpg jpeg png webp heic heif gif avif tif tiff bmp raw dng cr2 arw nef', videos: 'mp4 mov m4v webm mkv avi mts wmv',
  audios: 'mp3 wav m4a aac flac ogg aiff wma', documentos: 'pdf doc docx xls xlsx ppt pptx txt csv rtf odt key pages numbers zip json',
};
const TIPO_POR_EXT = Object.fromEntries(Object.entries(EXT_TIPO).flatMap(([t, l]) => l.split(' ').map((e) => [e, t])));
const esCopiaLiviana = (nombre) => /^_(mini|vista)-.+\.jpg$/i.test(nombre);
export function tipoDeArchivo(key) {
  const n = key.split('/').pop().toLowerCase();
  if (esCopiaLiviana(n)) return 'copias';
  const m = /\.([a-z0-9]+)$/.exec(n);
  return (m && TIPO_POR_EXT[m[1]]) || 'otros';
}
const ROL_STUDIOS = { agencias: 'Agencia', corporativo: 'Empresa', 'clientes-individuales': 'Cliente', clientes: 'Cliente' };
// Quién es el "dueño" de un archivo (agencia, cliente, alumno, docente…) y a qué área pertenece
export function duenoDe(bucket, key) {
  const p = key.split('/');
  if (bucket === 'publico') return { area: 'landing', grupo: 'Landing', id: 'publico|' + p.slice(0, 2).join('/'), slug: p[1] || 'landing' };
  if (key.startsWith(RESP)) return { area: 'respaldos', grupo: 'Respaldos', id: 'respaldos', slug: 'respaldos' };
  if (p[0] === 'faro-studios') {
    if (ROL_STUDIOS[p[1]] && p.length > 3) return { area: 'studios', grupo: ROL_STUDIOS[p[1]], id: p.slice(0, 3).join('/'), slug: p[2] };
    if (p[1] === 'contenido') return { area: 'studios', grupo: 'Contenido en redes', id: 'faro-studios/contenido', slug: 'contenido-en-redes' };
    if (p[1] === 'musica-galerias') return { area: 'studios', grupo: 'Música de galerías', id: 'faro-studios/musica-galerias', slug: 'musica-de-galerias' };
    return { area: 'studios', grupo: 'Faro Studios (otros)', id: p.slice(0, 2).join('/'), slug: p[1] || 'studios' };
  }
  if (p[0] === 'faro-academy') {
    if ((p[1] === 'estudiantes' || p[1] === 'docentes') && p.length > 3) return { area: 'academy', grupo: p[1] === 'estudiantes' ? 'Alumno' : 'Docente', id: p.slice(0, 3).join('/'), slug: p[2] };
    if ((p[2] === 'alumnos' || p[2] === 'docentes') && p.length > 4) return { area: 'academy', grupo: p[2] === 'alumnos' ? 'Alumno' : 'Docente', id: p.slice(0, 4).join('/'), slug: p[3] };
    return { area: 'academy', grupo: 'Academy (material general)', id: p.slice(0, 3).join('/'), slug: p.slice(1, 3).join(' · ') };
  }
  if (p[0] === 'documentos') return { area: 'documentos', grupo: 'Documentos', id: p.slice(0, 2).join('/'), slug: p[1] || 'documentos' };
  return { area: 'otros', grupo: 'Otros', id: p[0] || 'raiz', slug: p[0] || 'raiz' };
}
async function recorrerBuckets(env, fn) {
  for (const [nom, b] of [['privado', env.PRIVADO], ['publico', env.PUBLICO]]) {
    let cursor, pg = 0;
    do {
      const r = await b.list({ cursor, limit: 1000 });
      for (const o of r.objects) fn(nom, o);
      cursor = r.truncated ? r.cursor : undefined;
    } while (cursor && ++pg < 300);
  }
}
const llaveCopia = (key) => { const i = key.lastIndexOf('/'); return key.slice(0, i + 1) + key.slice(i + 1).replace(/^_(mini|vista)-/, '').replace(/\.[^.]+$/, ''); };
async function copiasHuerfanas(env) {
  const originales = new Set(), copias = [];
  await recorrerBuckets(env, (b, o) => {
    if (b !== 'privado') return;
    const nom = o.key.split('/').pop();
    if (esCopiaLiviana(nom)) copias.push({ key: o.key, size: o.size });
    else originales.add(llaveCopia(o.key));
  });
  return copias.filter((c) => !originales.has(llaveCopia(c.key)));
}
export async function analizarAlmacenamiento(env) {
  const papelera = await clavesPapelera(env);
  const tot = { n: 0, b: 0 }, bk = { privado: { n: 0, b: 0 }, publico: { n: 0, b: 0 } };
  const tipos = {}, areas = {}, duenos = new Map(), pesados = [], dups = new Map(), originales = new Set(), copias = [];
  const pap = { n: 0, b: 0 };
  await recorrerBuckets(env, (b, o) => {
    if (o.key.endsWith('/.keep')) return;
    const nom = o.key.split('/').pop(), size = o.size;
    tot.n++; tot.b += size; bk[b].n++; bk[b].b += size;
    const tp = tipoDeArchivo(o.key), enPap = papelera.has(b + '|' + o.key);
    const t = tipos[tp] || (tipos[tp] = { n: 0, b: 0 }); t.n++; t.b += size;
    if (enPap) { pap.n++; pap.b += size; const a = areas.papelera || (areas.papelera = { n: 0, b: 0 }); a.n++; a.b += size; return; }
    const d = duenoDe(b, o.key);
    const a = areas[d.area] || (areas[d.area] = { n: 0, b: 0 }); a.n++; a.b += size;
    const x = duenos.get(d.id) || { id: d.id, grupo: d.grupo, slug: d.slug, n: 0, b: 0, t: {} };
    x.n++; x.b += size; x.t[tp] = (x.t[tp] || 0) + size; duenos.set(d.id, x);
    if (d.area === 'respaldos') return;
    if (b === 'privado') { if (esCopiaLiviana(nom)) copias.push({ key: o.key, size }); else originales.add(llaveCopia(o.key)); }
    if (size > 1048576 && tp !== 'copias') {
      pesados.push({ bucket: b, key: o.key, size }); if (pesados.length > 60) { pesados.sort((p, q) => q.size - p.size); pesados.length = 30; }
      const k = nom.toLowerCase() + '|' + size; const g = dups.get(k); if (g) g.push(b + '|' + o.key); else dups.set(k, [b + '|' + o.key]);
    }
  });
  pesados.sort((p, q) => q.size - p.size);
  const huerf = copias.filter((c) => !originales.has(llaveCopia(c.key)));
  const duplicados = [...dups.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => { const i = k.lastIndexOf('|'); return { nombre: k.slice(0, i), size: Number(k.slice(i + 1)), copias: v.length, keys: v.slice(0, 6) }; })
    .sort((p, q) => q.size * (q.copias - 1) - p.size * (p.copias - 1)).slice(0, 15);
  return {
    generado: new Date().toISOString(), total: tot, buckets: bk, tipos, areas,
    duenos: [...duenos.values()].filter((x) => !['respaldos'].includes(x.id)).sort((p, q) => q.b - p.b).slice(0, 120),
    limpieza: { papelera: pap, huerfanas: { n: huerf.length, b: huerf.reduce((s, x) => s + x.size, 0), items: huerf.slice(0, 20) }, duplicados, pesados: pesados.slice(0, 15) },
  };
}
async function limpiarAlmacenamiento(env, que) {
  let n = 0, b = 0, restantes = 0; const TOPE = 400;
  if (que === 'papelera') {
    let cursor;
    do {
      const r = await env.PRIVADO.list({ prefix: PAPELERA, cursor, limit: 1000, include: ['customMetadata'] });
      for (const o of r.objects) {
        const c = o.customMetadata || {};
        if (!c.k || !({ privado: env.PRIVADO, publico: env.PUBLICO })[c.b]) continue;
        if (n >= TOPE) { restantes++; continue; }
        const x = await ({ privado: env.PRIVADO, publico: env.PUBLICO })[c.b].head(c.k);
        if (x) b += x.size;
        await ({ privado: env.PRIVADO, publico: env.PUBLICO })[c.b].delete(c.k); await env.PRIVADO.delete(o.key); n++;
      }
      cursor = r.truncated ? r.cursor : undefined;
    } while (cursor);
  } else if (que === 'huerfanas') {
    const lista = await copiasHuerfanas(env);
    for (const c of lista) { if (n >= TOPE) { restantes++; continue; } await env.PRIVADO.delete(c.key); n++; b += c.size; }
  } else return null;
  return { borrados: n, bytes: b, restantes };
}

/* ---------- Servicio ---------- */
export default {
  // Disparador de las 00:00 (hora de Guatemala): hace o continúa el respaldo del día
  async scheduled(event, env, ctx) { ctx.waitUntil(respaldoPaso(env).catch(() => {})); },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ruta = url.pathname.replace(/\/+$/, '') || '/';
    const B = { privado: env.PRIVADO, publico: env.PUBLICO };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) });

    // Archivos públicos del landing (sin sesión, con caché)
    if (ruta.startsWith('/pub/')) {
      const key = decodeURIComponent(ruta.slice(5));
      if (!key.startsWith('landing/') || key.includes('..') || key.endsWith('.keep')) return err(request, env, 'No existe ese archivo', 404);
      if (await enPapelera(env, 'publico', key)) return err(request, env, 'No existe ese archivo', 404);
      return entregar(request, env, env.PUBLICO, key, { cache: 'public, max-age=31536000, immutable' });
    }

    if (ruta.startsWith('/p/')) { try { return await portal(request, env, ctx, ruta, url); } catch (e) { return err(request, env, 'No se pudo completar la operación', 500); } }

    if (ruta === '/api/arbol') return json(request, env, { destinos: DESTINOS, umbralSimple: UMBRAL_SIMPLE });

    // Descarga por enlace firmado (no necesita sesión; el enlace caduca)
    if (ruta === '/api/bajar') {
      const p = await verificar(env, url.searchParams.get('t'));
      if (!p || !B[p.b]) return err(request, env, 'El enlace no es válido o ya venció', 403);
      if (await enPapelera(env, p.b, p.k)) return err(request, env, 'No existe ese archivo', 404);
      const descargar = url.searchParams.get('inline') !== '1';
      if (!p.a && !p.n && request.method === 'GET') { // vistas previas del admin y miniaturas del cliente no cuentan
        const rango = request.headers.get('Range');
        const primera = !rango || /^bytes=0-/.test(rango); // el video pide muchos trozos: cuenta solo el primero
        if (primera && p.b === 'privado') { const t = contar(env, p.k, descargar ? 'd' : 'v'); if (ctx && ctx.waitUntil) ctx.waitUntil(t); else await t; }
      }
      return entregar(request, env, B[p.b], p.k, { descargar, ...(p.n && !descargar ? { cache: 'private, max-age=7200' } : {}) });
    }

    // Clientes de Entregas: piden enlaces de SUS archivos. Supabase decide qué ven (RLS) con la sesión del cliente.
    if (ruta === '/api/mi/enlaces' && request.method === 'POST') {
      const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
      if (!m) return err(request, env, 'Necesitas entrar', 401);
      if (!env.FIRMA_SECRETO) return err(request, env, 'Falta configurar FIRMA_SECRETO en el servicio (ver LEEME)', 500);
      const b = await request.json().catch(() => ({}));
      const ids = (Array.isArray(b.ids) ? b.ids : []).filter((x) => /^[0-9a-f-]{36}$/i.test(String(x))).slice(0, 80);
      if (!ids.length) return json(request, env, { enlaces: {} });
      let r;
      try {
        r = await fetch(`${env.SUPABASE_URL}/rest/v1/en_archivos?id=in.(${ids.join(',')})&select=id,key,nombre,tipo,estado,proyecto:en_proyectos(estado,cuenta:en_cuentas(tipo))`, { headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${m[1]}` } });
      } catch (e) { return err(request, env, 'No se pudo consultar', 502); }
      if (r.status === 401 || r.status === 403) return err(request, env, 'Tu sesión venció. Vuelve a entrar.', 401);
      if (!r.ok) return err(request, env, 'No se pudo consultar', 502);
      const filas = await r.json().catch(() => []);
      const seg = Math.min(Math.max(Number(b.seg) || 7200, 300), TTL_ENLACE_MAX);
      const e = seg === 7200 ? vencimientoEstable() : Math.floor(Date.now() / 1000) + seg;
      const enlaces = {};
      const der = await derivadasDe(env, filas);
      const ver = async (k) => `${url.origin}/api/bajar?inline=1&t=${await firmar(env, { b: 'privado', k, e, n: 1 })}`;
      for (const f of filas) {
        if (!f.key || f.key.includes('..') || f.key.endsWith('/.keep') || !f.key.startsWith('faro-studios/')) continue;
        const td = await firmar(env, { b: 'privado', k: f.key, e });
        const tv = await firmar(env, { b: 'privado', k: f.key, e, ...(f.tipo === 'imagen' ? { n: 1 } : {}) });
        // Descargar: galerías siempre; revisión (empresa/agencia) solo lo aprobado
        const py = f.proyecto || {};
        const puede = (py.cuenta && py.cuenta.tipo === 'galeria') || f.estado === 'aprobado' || py.estado === 'aprobado' || py.estado === 'entregado';
        const d = f.tipo === 'imagen' ? der(f.key) : { mini: null, vista: null };
        const urlVer = d.vista ? await ver(d.vista) : `${url.origin}/api/bajar?inline=1&t=${tv}`;
        enlaces[f.id] = { nombre: f.nombre, puede, urlVer, urlMini: d.mini ? await ver(d.mini) : urlVer, ...(puede ? { url: `${url.origin}/api/bajar?t=${td}` } : {}) };
      }
      return json(request, env, { enlaces, vence_en: seg });
    }

    // Listas compartidas: quien tiene el enlace privado ve SOLO las fotos de esa lista. Supabase decide (función en_lista_publica).
    if (ruta === '/api/lista/enlaces' && request.method === 'POST') {
      if (!env.FIRMA_SECRETO) return err(request, env, 'Falta configurar FIRMA_SECRETO en el servicio (ver LEEME)', 500);
      const b = await request.json().catch(() => ({}));
      const token = String(b.token || '');
      if (!/^[a-z0-9]{20,64}$/i.test(token)) return err(request, env, 'El enlace no es válido', 404);
      let r;
      try {
        r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/en_lista_publica`, { method: 'POST', headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${env.SUPABASE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: token }) });
      } catch (e) { return err(request, env, 'No se pudo consultar', 502); }
      if (!r.ok) return err(request, env, 'No se pudo consultar', 502);
      const lista = await r.json().catch(() => null);
      if (!lista || !Array.isArray(lista.archivos)) return err(request, env, 'Esta lista ya no está disponible', 404);
      const e = vencimientoEstable();
      const archivos = [];
      const der = await derivadasDe(env, lista.archivos.slice(0, 300).map((f) => ({ ...f, tipo: 'imagen' })));
      const ver = async (k) => `${url.origin}/api/bajar?inline=1&t=${await firmar(env, { b: 'privado', k, e, n: 1 })}`;
      for (const f of lista.archivos.slice(0, 300)) {
        if (!f.key || f.key.includes('..') || f.key.endsWith('/.keep') || !f.key.startsWith('faro-studios/')) continue;
        const td = await firmar(env, { b: 'privado', k: f.key, e });
        const d = der(f.key);
        const urlVer = d.vista ? await ver(d.vista) : await ver(f.key);
        archivos.push({ id: f.id, nombre: f.nombre, meta: f.meta || {}, urlVer, urlMini: d.mini ? await ver(d.mini) : urlVer, url: `${url.origin}/api/bajar?t=${td}` });
      }
      const cfg = lista.config || {};
      return json(request, env, { lista: lista.lista, titulo: lista.titulo, config: { paleta: cfg.paleta, fuente: cfg.fuente, meta: cfg.meta }, archivos, vence_en: 7200 });
    }

    // Música de la galería: el cliente pide la canción de SU galería (Supabase decide con su sesión si la ve).
    if (ruta === '/api/mi/musica' && request.method === 'POST') {
      const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
      if (!m) return err(request, env, 'Necesitas entrar', 401);
      if (!env.FIRMA_SECRETO) return err(request, env, 'Falta configurar FIRMA_SECRETO en el servicio (ver LEEME)', 500);
      const b = await request.json().catch(() => ({}));
      const pid = String(b.proyecto || '');
      if (!/^[0-9a-f-]{36}$/i.test(pid)) return err(request, env, 'Galería no válida', 400);
      let r;
      try { r = await fetch(`${env.SUPABASE_URL}/rest/v1/en_proyectos?id=eq.${pid}&select=config`, { headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${m[1]}` } }); } catch (e) { return err(request, env, 'No se pudo consultar', 502); }
      if (r.status === 401 || r.status === 403) return err(request, env, 'Tu sesión venció. Vuelve a entrar.', 401);
      if (!r.ok) return err(request, env, 'No se pudo consultar', 502);
      const fila = (await r.json().catch(() => []))[0];
      const cfgM = (fila && fila.config) || {};
      const claves = (Array.isArray(cfgM.musicas) ? cfgM.musicas : typeof cfgM.musica === 'string' && cfgM.musica ? [cfgM.musica] : []).filter((k) => typeof k === 'string').slice(0, 3);
      const musicas = [];
      for (const key of claves) {
        if (!key || key.includes('..') || !key.startsWith('faro-studios/musica-galerias/') || key.endsWith('/.keep')) continue;
        const o = await env.PRIVADO.head(key);
        if (!o) continue;
        const t = await firmar(env, { b: 'privado', k: key, e: vencimientoEstable(), n: 1 });
        musicas.push({ url: `${url.origin}/api/bajar?inline=1&t=${t}`, nombre: key.split('/').pop(), size: o.size });
      }
      return json(request, env, { musicas, musica: musicas[0] || null });
    }

    // Todo lo demás es solo para el administrador
    if (!ruta.startsWith('/api/')) return err(request, env, 'No encontrado', 404);
    let lector = false;
    if (!(await esAdmin(request, env))) {
      // Equipo con permiso "ver_archivos": solo listar y pedir enlace de descarga, dentro de su alcance
      const lee = (ruta === '/api/lista' && request.method === 'GET') || (ruta === '/api/enlace' && request.method === 'POST');
      if (!lee || !(await esLector(request, env))) return err(request, env, 'Necesitas entrar como administrador', 401);
      const refL = ruta === '/api/lista' ? (url.searchParams.get('prefix') || '') : (url.searchParams.get('key') || '');
      if (!alcanceLector(url.searchParams.get('bucket') || '', refL)) return err(request, env, 'No tienes permiso para esta carpeta', 403);
      lector = true;
    }

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
        const oculto = await clavesPapelera(env);
        return json(request, env, {
          carpetas: r.delimitedPrefixes.filter((c) => c !== '_stats/' && c !== PAPELERA && c !== RESP),
          archivos: r.objects.filter((o) => !o.key.endsWith('/.keep') && !oculto.has(bucketNombre + '|' + o.key)).map((o) => ({ key: o.key, size: o.size, subido: o.uploaded })),
          nombres: Object.fromEntries(r.objects.filter((o) => o.customMetadata && o.customMetadata.nombre && !oculto.has(bucketNombre + '|' + o.key)).map((o) => [o.key, o.customMetadata.nombre])),
        });
      }

      // Descargas, vistas y resumen de archivos por área (para las gráficas del admin)
      if (ruta === '/api/stats' && request.method === 'GET') {
        const st = await leerStats(env);
        const oc = await clavesPapelera(env);
        const rp = await resumenBucket(env.PRIVADO, areaDe, oc, 'privado');
        const rl = await resumenBucket(env.PUBLICO, () => 'l', oc, 'publico');
        return json(request, env, { ...st, areas: { ...rp.areas, ...rl.areas }, completo: rp.completo && rl.completo });
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
        if (await enPapelera(env, bucketNombre, key)) return err(request, env, 'Ese archivo está en la papelera', 404);
        const seg = Math.min(Math.max(Number(url.searchParams.get('seg')) || 3600, 60), lector ? 3600 : TTL_ENLACE_MAX);
        const t = await firmar(env, { b: bucketNombre, k: key, e: Math.floor(Date.now() / 1000) + seg, ...(url.searchParams.get('adm') === '1' && !lector ? { a: 1 } : {}) });
        return json(request, env, { url: `${url.origin}/api/bajar?t=${t}`, urlVer: `${url.origin}/api/bajar?inline=1&t=${t}`, vence_en: seg });
      }

      // Borrar un archivo: va a la papelera (se puede restaurar)
      if (ruta === '/api/objeto' && request.method === 'DELETE') {
        if (!bucket || !key || key.includes('..') || key.endsWith('/.keep') || key.startsWith(PAPELERA) || key.startsWith('_stats/') || key.startsWith(RESP)) return err(request, env, 'Archivo inválido');
        const o = await bucket.head(key);
        if (!o) return err(request, env, 'No existe ese archivo', 404);
        await aPapelera(env, bucketNombre, key, env.ADMIN_EMAIL, o.size);
        return json(request, env, { ok: true, papelera: true });
      }

      // Almacenamiento: cuánto ocupa todo y qué se puede limpiar (con memoria de 5 min; ?fresco=1 recalcula)
      if (ruta === '/api/almacenamiento' && request.method === 'GET') {
        let d = url.searchParams.get('fresco') === '1' ? null : await rLeer(env, ALM_KEY);
        if (!d || Date.now() - Date.parse(d.generado) > ALM_VIGENCIA) { d = await analizarAlmacenamiento(env); await rGuardar(env, ALM_KEY, d); }
        return json(request, env, d);
      }
      if (ruta === '/api/limpiar' && request.method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const r = await limpiarAlmacenamiento(env, b.que);
        if (!r) return err(request, env, 'Limpieza no válida');
        await env.PRIVADO.delete(ALM_KEY);
        return json(request, env, r);
      }

      // Respaldos: ejecutar un paso, ver la lista
      if (ruta === '/api/respaldo/ejecutar' && request.method === 'POST') {
        const st = await respaldoPaso(env, { nuevo: url.searchParams.get('nuevo') === '1' });
        return json(request, env, estadoPublico(st));
      }
      if (ruta === '/api/respaldo/lista' && request.method === 'GET') {
        const todos = (await env.PRIVADO.list({ prefix: RESP, delimiter: '/' })).delimitedPrefixes.sort().reverse();
        const dias = todos.filter((d, i) => i < RESP_DIAS || /-01\/$/.test(d)); // últimos 30 días + el del día 1 de cada mes
        const items = [];
        for (const d of dias) { const r = await rLeer(env, d + 'resumen.json'); if (r) items.push(r); }
        const hoy = await rLeer(env, RESP + hoyGT() + '/estado.json');
        return json(request, env, { items, hoy: hoy ? estadoPublico(hoy) : null, hoyFecha: hoyGT(), datos: !!env.SUPABASE_SERVICE_KEY, dias: RESP_DIAS });
      }

      // Papelera: lista, restaurar, borrar de verdad
      if (ruta === '/api/papelera' && request.method === 'GET') {
        const items = []; let cursor;
        do {
          const r = await env.PRIVADO.list({ prefix: PAPELERA, cursor, limit: 1000, include: ['customMetadata'] });
          for (const o of r.objects) if (o.customMetadata && o.customMetadata.k) items.push({ bucket: o.customMetadata.b, key: o.customMetadata.k, por: o.customMetadata.por || '', cuando: o.customMetadata.cuando || '', size: Number(o.customMetadata.size || 0) });
          cursor = r.truncated ? r.cursor : undefined;
        } while (cursor);
        items.sort((a, b) => (a.cuando < b.cuando ? 1 : -1));
        return json(request, env, { items, dias: DIAS_PAPELERA });
      }
      if (ruta === '/api/restaurar' && request.method === 'POST') {
        if (!bucket || !key) return err(request, env, 'Archivo inválido');
        await env.PRIVADO.delete(marcaKey(bucketNombre, key));
        return json(request, env, { ok: true });
      }
      if (ruta === '/api/purgar' && request.method === 'POST') {
        // ?viejos=1 borra de verdad lo que lleva más de DIAS_PAPELERA días; si no, el archivo indicado
        let n = 0;
        if (url.searchParams.get('viejos') === '1') {
          const limite = Date.now() - DIAS_PAPELERA * 864e5; let cursor;
          do {
            const r = await env.PRIVADO.list({ prefix: PAPELERA, cursor, limit: 1000, include: ['customMetadata'] });
            for (const o of r.objects) {
              const c = o.customMetadata || {};
              if (c.k && B[c.b] && Date.parse(c.cuando) < limite) { await B[c.b].delete(c.k); await env.PRIVADO.delete(o.key); n++; }
            }
            cursor = r.truncated ? r.cursor : undefined;
          } while (cursor);
        } else {
          if (!bucket || !key || !(await enPapelera(env, bucketNombre, key))) return err(request, env, 'Ese archivo no está en la papelera', 404);
          await bucket.delete(key); await env.PRIVADO.delete(marcaKey(bucketNombre, key)); n = 1;
        }
        return json(request, env, { ok: true, borrados: n });
      }

      // Crea la carpeta de una persona (alumno, docente o cliente) con el nombre que generó la base de datos
      if (ruta === '/api/carpeta-persona' && request.method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const lista = (Array.isArray(b.carpetas) ? b.carpetas : [b.carpeta]).slice(0, 500);
        let creadas = 0;
        for (const c of lista) {
          const marcas = marcadoresPersona(c);
          if (!marcas) continue;
          for (const m of marcas) await env.PRIVADO.put(m, new Uint8Array(0), { customMetadata: { marcador: 'carpeta' } });
          creadas++;
        }
        return json(request, env, { ok: true, creadas });
      }
    } catch (e) {
      return err(request, env, 'No se pudo completar la operación', 500);
    }

    return err(request, env, 'No encontrado', 404);
  },
};
