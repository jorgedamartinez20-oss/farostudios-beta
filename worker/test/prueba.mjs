// Pruebas locales del servicio de archivos (sin Cloudflare): R2 y Supabase simulados.
// Ejecutar:  node test/prueba.mjs
import assert from 'node:assert/strict';
import worker, { DESTINOS, slug, nombreArchivo, firmar } from '../src/index.js';

/* ---- R2 simulado ---- */
class R2Falso {
  constructor() { this.m = new Map(); this.mp = new Map(); }
  async put(key, body, opts = {}) {
    const bytes = body instanceof ReadableStream ? new Uint8Array(await new Response(body).arrayBuffer()) : new Uint8Array(body);
    this.m.set(key, { bytes, ct: opts.httpMetadata?.contentType, meta: opts.customMetadata, up: new Date() });
  }
  async get(key, { range } = {}) {
    const o = this.m.get(key); if (!o) return null;
    let bytes = o.bytes, r;
    const h = range && range.get && range.get('Range');
    if (h) { const mm = /bytes=(\d+)-(\d*)/.exec(h); const a = +mm[1], b = mm[2] ? +mm[2] : o.bytes.length - 1; bytes = o.bytes.slice(a, b + 1); r = { offset: a, length: bytes.length }; }
    return { key, size: o.bytes.length, httpEtag: '"x"', range: r, body: new Blob([bytes]).stream(), writeHttpMetadata: (hd) => o.ct && hd.set('Content-Type', o.ct) };
  }
  async list({ prefix = '', delimiter } = {}) {
    const objects = [], pref = new Set();
    for (const [k, v] of this.m) {
      if (!k.startsWith(prefix)) continue;
      const rest = k.slice(prefix.length);
      if (delimiter && rest.includes(delimiter)) { pref.add(prefix + rest.split(delimiter)[0] + delimiter); continue; }
      objects.push({ key: k, size: v.bytes.length, uploaded: v.up, customMetadata: v.meta });
    }
    return { objects, delimitedPrefixes: [...pref] };
  }
  async delete(k) { this.m.delete(k); }
  async createMultipartUpload(key, o) { const id = 'u' + this.mp.size; this.mp.set(id, { key, parts: new Map(), ct: o?.httpMetadata?.contentType }); return { uploadId: id }; }
  resumeMultipartUpload(key, id) {
    const u = this.mp.get(id); const self = this;
    return {
      async uploadPart(n, buf) { u.parts.set(n, new Uint8Array(buf)); return { partNumber: n, etag: 'e' + n }; },
      async complete(partes) { const tot = partes.map((p) => u.parts.get(p.partNumber)); const len = tot.reduce((s, x) => s + x.length, 0); const out = new Uint8Array(len); let o = 0; for (const x of tot) { out.set(x, o); o += x.length; } self.m.set(key, { bytes: out, ct: u.ct, up: new Date() }); return { size: len }; },
      async abort() { self.mp.delete(id); },
    };
  }
}

/* ---- Supabase simulado ---- */
globalThis.fetch = async (u, init) => {
  assert.ok(String(u).endsWith('/auth/v1/user'));
  const t = (init.headers.Authorization || '').replace('Bearer ', '');
  if (t === 'admin-token') return new Response(JSON.stringify({ email: 'reservas@farostudios.net' }), { status: 200 });
  if (t === 'otro-token') return new Response(JSON.stringify({ email: 'alguien@correo.com' }), { status: 200 });
  return new Response('{}', { status: 401 });
};

const env = {
  PRIVADO: new R2Falso(), PUBLICO: new R2Falso(),
  SUPABASE_URL: 'https://x.supabase.co', SUPABASE_KEY: 'k', ADMIN_EMAIL: 'reservas@farostudios.net',
  ORIGENES: 'https://jorgedamartinez20-oss.github.io,https://farostudios.net', FIRMA_SECRETO: 'secreto-de-prueba',
};
const ORI = 'https://jorgedamartinez20-oss.github.io';
const A = { Authorization: 'Bearer admin-token', Origin: ORI };
const q = (path, init = {}) => worker.fetch(new Request('https://w.test' + path, init), env);
let n = 0; const ok = (m) => console.log('  ✓ ' + m, ++n && '');

// utilidades
assert.equal(slug('Maxi Despensa — Mamá Lucha'), 'maxi-despensa-mama-lucha'); ok('slug quita tildes y símbolos');
assert.equal(nombreArchivo('Aftermovie Final (v2).mp4'), 'Aftermovie-Final-(v2).mp4'); ok('nombreArchivo limpia espacios');
assert.equal(DESTINOS.length, 3 + 2 * 7 + 6); ok('árbol: ' + DESTINOS.length + ' carpetas base');

// CORS
let r = await q('/api/arbol', { method: 'OPTIONS', headers: { Origin: ORI } });
assert.equal(r.status, 204); assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORI); ok('CORS permite el origen del beta');
r = await q('/api/arbol', { headers: { Origin: 'https://malo.com' } });
assert.equal(r.headers.get('Access-Control-Allow-Origin'), null); ok('CORS no permite otros orígenes');

// autenticación
r = await q('/api/init', { method: 'POST' }); assert.equal(r.status, 401); ok('sin sesión → 401');
r = await q('/api/init', { method: 'POST', headers: { Authorization: 'Bearer otro-token' } }); assert.equal(r.status, 401); ok('otro usuario → 401');
r = await q('/api/init', { method: 'POST', headers: A }); assert.equal((await r.json()).carpetas, DESTINOS.length); ok('admin crea carpetas base');
assert.ok(env.PRIVADO.m.has('faro-academy/ingles/videos/.keep') && env.PUBLICO.m.has('landing/portafolio/.keep')); ok('quedaron en el bucket correcto');

// carpeta por entidad
r = await q('/api/carpeta', { method: 'POST', headers: A, body: JSON.stringify({ destino: 'studios/agencias', nombre: 'Maxi Despensa' }) });
assert.equal((await r.json()).carpeta, 'faro-studios/agencias/maxi-despensa/'); ok('carpeta de agencia');
r = await q('/api/carpeta', { method: 'POST', headers: A, body: JSON.stringify({ destino: 'academy/ingles/videos', nombre: 'x' }) });
assert.equal(r.status, 400); ok('no crea carpetas de persona donde no corresponde');

// subida simple + validación de rutas
const K = 'faro-studios/agencias/maxi-despensa/Aftermovie_v1.mp4';
const cuerpo = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
r = await q(`/api/subir?bucket=privado&key=${encodeURIComponent(K)}`, { method: 'PUT', headers: { ...A, 'Content-Type': 'video/mp4', 'Content-Length': '8' }, body: cuerpo });
assert.equal(r.status, 200); assert.deepEqual([...env.PRIVADO.m.get(K).bytes], [...cuerpo]); ok('subida simple');
for (const mala of ['otra-carpeta/x.mp4', 'faro-studios/agencias/maxi-despensa/sub/x.mp4', 'faro-studios/agencias/../x.mp4', 'faro-studios/agencias/x.mp4', 'faro-studios/agencias/Maxi Despensa/x.mp4']) {
  r = await q(`/api/subir?bucket=privado&key=${encodeURIComponent(mala)}`, { method: 'PUT', headers: { ...A, 'Content-Length': '8' }, body: cuerpo });
  assert.equal(r.status, 400, mala);
}
ok('rechaza rutas fuera del árbol (y subcarpetas bajo cada agencia)');
r = await q(`/api/subir?bucket=privado&key=${encodeURIComponent(K)}`, { method: 'PUT', headers: { ...A, 'Content-Length': String(41 * 1024 * 1024) }, body: cuerpo });
assert.equal(r.status, 413); ok('archivo grande exige subida por partes');

// subida por partes
const K2 = 'faro-academy/musica/videos/clase-1.mov';
r = await q(`/api/multipart/inicio?bucket=privado&key=${encodeURIComponent(K2)}&tipo=video/quicktime`, { method: 'POST', headers: A });
const { uploadId } = await r.json();
const partes = [];
for (const [i, b] of [[1, [1, 1, 1]], [2, [2, 2]]]) {
  r = await q(`/api/multipart/parte?bucket=privado&key=${encodeURIComponent(K2)}&uploadId=${uploadId}&n=${i}`, { method: 'PUT', headers: A, body: new Uint8Array(b) });
  partes.push(await r.json());
}
r = await q(`/api/multipart/fin?bucket=privado&key=${encodeURIComponent(K2)}&uploadId=${uploadId}`, { method: 'POST', headers: A, body: JSON.stringify({ partes }) });
assert.equal((await r.json()).size, 5); assert.deepEqual([...env.PRIVADO.m.get(K2).bytes], [1, 1, 1, 2, 2]); ok('subida por partes ensambla bien');

// lista
r = await q('/api/lista?bucket=privado&prefix=' + encodeURIComponent('faro-studios/agencias/'), { headers: A });
let l = await r.json(); assert.deepEqual(l.carpetas, ['faro-studios/agencias/maxi-despensa/']); ok('lista carpetas de agencias');
r = await q('/api/lista?bucket=privado&prefix=' + encodeURIComponent('faro-studios/agencias/maxi-despensa/'), { headers: A });
l = await r.json(); assert.deepEqual(l.archivos.map((x) => x.key), [K]); ok('lista archivos y oculta .keep');

// enlace temporal
r = await q(`/api/enlace?bucket=privado&key=${encodeURIComponent(K)}&seg=600`, { method: 'POST', headers: A });
const { url } = await r.json(); const p = new URL(url);
r = await q(p.pathname + p.search); assert.equal(r.status, 200); assert.match(r.headers.get('Content-Disposition'), /attachment; filename\*=UTF-8''Aftermovie_v1\.mp4/); ok('enlace temporal descarga con nombre limpio');
r = await q(p.pathname + p.search.slice(0, -3) + 'abc'); assert.equal(r.status, 403); ok('enlace alterado → 403');
const vencido = await firmar(env, { b: 'privado', k: K, e: Math.floor(Date.now() / 1000) - 5 });
r = await q('/api/bajar?t=' + vencido); assert.equal(r.status, 403); ok('enlace vencido → 403');

// público
await env.PUBLICO.put('landing/portafolio/foto-1.jpg', new Uint8Array([9, 8, 7, 6, 5]), { httpMetadata: { contentType: 'image/jpeg' } });
r = await q('/pub/landing/portafolio/foto-1.jpg'); assert.equal(r.status, 200); assert.match(r.headers.get('Cache-Control'), /immutable/); ok('landing público con caché');
r = await q('/pub/landing/portafolio/foto-1.jpg', { headers: { Range: 'bytes=1-2' } }); assert.equal(r.status, 206); assert.equal(r.headers.get('Content-Range'), 'bytes 1-2/5'); ok('soporta rangos (audio/video)');
r = await q('/pub/faro-studios/agencias/maxi-despensa/Aftermovie_v1.mp4'); assert.equal(r.status, 404); ok('lo privado nunca sale por /pub');
r = await q('/pub/landing/portafolio/.keep'); assert.equal(r.status, 404); ok('marcadores ocultos');

// descargas contadas
r = await q(`/api/enlace?bucket=privado&key=${encodeURIComponent(K)}&seg=600`, { method: 'POST', headers: A });
const u1 = new URL((await r.json()).url);
await q(u1.pathname + u1.search); await q(u1.pathname + u1.search);
r = await q(`/api/enlace?bucket=privado&key=${encodeURIComponent(K)}&seg=600&adm=1`, { method: 'POST', headers: A });
const uAdm = new URL((await r.json()).url); await q(uAdm.pathname + uAdm.search);
const uVer = new URL(u1.href.replace('/api/bajar?', '/api/bajar?inline=1&')); await q(uVer.pathname + uVer.search);
await q(uVer.pathname + uVer.search, { headers: { Range: 'bytes=4-6' } });
r = await q('/api/stats', { headers: A }); const st = await r.json();
assert.equal(st.archivos[K].d, 3); assert.equal(st.archivos[K].v, 1); ok('cuenta descargas (las del admin no) y la primera vista');
assert.equal(st.areas.s.n, 1); assert.ok(st.areas.s.meses[new Date().toISOString().slice(0, 7)]); ok('resumen por área y por mes');
r = await q('/api/stats'); assert.equal(r.status, 401); ok('stats solo para admin');
r = await q('/api/lista?bucket=privado&prefix=', { headers: A }); assert.ok(!(await r.json()).carpetas.includes('_stats/')); ok('_stats oculto en la lista');

// borrar
r = await q(`/api/objeto?bucket=privado&key=${encodeURIComponent(K)}`, { method: 'DELETE', headers: A }); assert.equal(r.status, 200); assert.ok(!env.PRIVADO.m.has(K)); ok('borrado');

console.log('\nTodo bien: ' + n + ' comprobaciones.');
