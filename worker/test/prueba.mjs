// Pruebas locales del servicio de archivos (sin Cloudflare): R2 y Supabase simulados.
// Ejecutar:  node test/prueba.mjs
import assert from 'node:assert/strict';
import worker, { DESTINOS, slug, nombreArchivo, firmar, marcadoresPersona } from '../src/index.js';

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
  async head(key) { const o = this.m.get(key); return o ? { key, size: o.bytes.length, customMetadata: o.meta } : null; }
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

const jwtFalso = (aal) => 'x.' + btoa(JSON.stringify({ aal })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + '.y';
const TOKEN_AAL1 = jwtFalso('aal1'), TOKEN_AAL2 = jwtFalso('aal2');

/* ---- Supabase simulado ---- */
// Reglas de archivo_permiso simuladas: ana (alumna) lee/sube práctica propia; prof (docente) lee práctica y escribe respuestas; nadie más borra
const REGLAS = { 'alu-token': { leer: (k) => k.includes('ana-1111/'), escribir: (k) => k.includes('ana-1111/practicas/') || k.includes('ana-1111/mis-archivos/'), borrar: () => false },
  'doc-token': { leer: (k) => k.includes('ana-1111/'), escribir: (k) => k.includes('ana-1111/respuestas/') || k.includes('ana-1111/material/'), borrar: (k) => k.includes('ana-1111/respuestas/') || k.includes('ana-1111/material/') } };
globalThis.fetch = async (u, init) => {
  if (String(u).endsWith('/rest/v1/rpc/tiene_permiso')) { // permiso "ver_archivos": solo 'lector-token' lo tiene
    const t = (init.headers.Authorization || '').replace('Bearer ', ''); const b = JSON.parse(init.body);
    if (t !== 'lector-token' && t !== 'otro-token') return new Response('{}', { status: 401 });
    return new Response(JSON.stringify(t === 'lector-token' && b.p === 'ver_archivos'), { status: 200 });
  }
  if (String(u).endsWith('/rest/v1/rpc/archivo_permiso')) {
    const t = (init.headers.Authorization || '').replace('Bearer ', ''); const b = JSON.parse(init.body); const rg = REGLAS[t];
    if (!rg) return new Response('{}', { status: 401 });
    return new Response(JSON.stringify(!!rg[b.p_accion](b.p_key)), { status: 200 });
  }
  assert.ok(String(u).endsWith('/auth/v1/user'));
  const t = (init.headers.Authorization || '').replace('Bearer ', '');
  if (t === 'admin-token') return new Response(JSON.stringify({ email: 'reservas@farostudios.net' }), { status: 200 });
  if (t === 'otro-token') return new Response(JSON.stringify({ email: 'alguien@correo.com' }), { status: 200 });
  // cuenta del director con código de 2 pasos activado: el token trae aal1 (solo contraseña) o aal2 (con código)
  if (t === TOKEN_AAL1 || t === TOKEN_AAL2) return new Response(JSON.stringify({ email: 'reservas@farostudios.net', factors: [{ factor_type: 'totp', status: 'verified' }] }), { status: 200 });
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
assert.equal(DESTINOS.length, 3 + 2 * 7 + 5 + 3 + 6); ok('árbol: ' + DESTINOS.length + ' carpetas base');

// CORS
let r = await q('/api/arbol', { method: 'OPTIONS', headers: { Origin: ORI } });
assert.equal(r.status, 204); assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORI); ok('CORS permite el origen del beta');
r = await q('/api/arbol', { headers: { Origin: 'https://malo.com' } });
assert.equal(r.headers.get('Access-Control-Allow-Origin'), null); ok('CORS no permite otros orígenes');

// autenticación
r = await q('/api/init', { method: 'POST' }); assert.equal(r.status, 401); ok('sin sesión → 401');
r = await q('/api/init', { method: 'POST', headers: { Authorization: 'Bearer otro-token' } }); assert.equal(r.status, 401); ok('otro usuario → 401');
r = await q('/api/init', { method: 'POST', headers: A }); assert.equal((await r.json()).carpetas, DESTINOS.length); ok('admin crea carpetas base');
r = await q('/api/init', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN_AAL1 } }); assert.equal(r.status, 401); ok('con código activado y solo contraseña (aal1) → 401');
r = await q('/api/stats', { headers: { Authorization: 'Bearer ' + TOKEN_AAL1 } }); assert.equal(r.status, 401); ok('con solo contraseña tampoco ve las estadísticas');
r = await q('/api/init', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN_AAL2 } }); assert.equal(r.status, 200); ok('con código activado y código pasado (aal2) → entra');
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
// documentos del director: catálogos planos; SAT por año
for (const buena of ['documentos/catalogos/Catalogo-2026.pdf', 'documentos/sat/2026/2026-10-IVA.pdf']) {
  r = await q(`/api/subir?bucket=privado&key=${encodeURIComponent(buena)}`, { method: 'PUT', headers: { ...A, 'Content-Length': '8' }, body: cuerpo });
  assert.equal(r.status, 200, buena);
}
for (const mala of ['documentos/sat/IVA.pdf', 'documentos/catalogos/sub/x.pdf', 'documentos/otra/x.pdf']) {
  r = await q(`/api/subir?bucket=privado&key=${encodeURIComponent(mala)}`, { method: 'PUT', headers: { ...A, 'Content-Length': '8' }, body: cuerpo });
  assert.equal(r.status, 400, mala);
}
r = await q(`/api/subir?bucket=privado&key=${encodeURIComponent('documentos/catalogos/x.pdf')}`, { method: 'PUT', headers: { Origin: ORI, 'Content-Length': '8' }, body: cuerpo });
assert.equal(r.status, 401); ok('documentos: rutas válidas, SAT por año y solo administrador');
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

// borrar = papelera (se puede restaurar)
r = await q(`/api/objeto?bucket=privado&key=${encodeURIComponent(K)}`, { method: 'DELETE', headers: A }); assert.equal(r.status, 200); assert.ok(env.PRIVADO.m.has(K)); ok('borrar manda a la papelera (el archivo sigue en R2)');
r = await q('/api/lista?bucket=privado&prefix=' + encodeURIComponent('faro-studios/agencias/maxi-despensa/'), { headers: A }); assert.deepEqual((await r.json()).archivos, []); ok('lo borrado desaparece de la lista');
r = await q(`/api/enlace?bucket=privado&key=${encodeURIComponent(K)}`, { method: 'POST', headers: A }); assert.equal(r.status, 404); ok('no se generan enlaces de lo que está en la papelera');
r = await q(u1.pathname + u1.search); assert.equal(r.status, 404); ok('un enlace viejo tampoco sirve');
r = await q('/api/papelera'); assert.equal(r.status, 401);
r = await q('/api/papelera', { headers: A }); let pap = await r.json(); assert.equal(pap.items.length, 1); assert.equal(pap.items[0].key, K); ok('la papelera lista lo borrado');
r = await q('/api/lista?bucket=privado&prefix=', { headers: A }); assert.ok(!(await r.json()).carpetas.includes('_papelera/')); ok('_papelera oculta');
r = await q(`/api/restaurar?bucket=privado&key=${encodeURIComponent(K)}`, { method: 'POST', headers: A }); assert.equal(r.status, 200);
r = await q('/api/lista?bucket=privado&prefix=' + encodeURIComponent('faro-studios/agencias/maxi-despensa/'), { headers: A }); assert.equal((await r.json()).archivos.length, 1); ok('restaurar lo devuelve');
await q(`/api/objeto?bucket=privado&key=${encodeURIComponent(K)}`, { method: 'DELETE', headers: A });
r = await q(`/api/purgar?bucket=privado&key=${encodeURIComponent(K)}`, { method: 'POST', headers: A }); assert.equal(r.status, 200); assert.ok(!env.PRIVADO.m.has(K)); ok('purgar borra de verdad');
r = await q(`/api/purgar?bucket=privado&key=${encodeURIComponent(K2)}`, { method: 'POST', headers: A }); assert.equal(r.status, 404); ok('solo se purga lo que está en la papelera');
// purga automática de lo viejo
await q(`/api/objeto?bucket=privado&key=${encodeURIComponent(K2)}`, { method: 'DELETE', headers: A });
for (const [k, v] of env.PRIVADO.m) if (k.startsWith('_papelera/') && v.meta) v.meta.cuando = new Date(Date.now() - 40 * 864e5).toISOString();
r = await q('/api/purgar?viejos=1', { method: 'POST', headers: A }); assert.equal((await r.json()).borrados, 1); assert.ok(!env.PRIVADO.m.has(K2)); ok('purga automática de lo que lleva más de 30 días');

// carpetas por persona
const CA = 'faro-academy/estudiantes/ana-1111/';
r = await q('/api/carpeta-persona', { method: 'POST', headers: A, body: JSON.stringify({ carpeta: CA }) }); assert.equal((await r.json()).creadas, 1);
for (const t of ['material', 'respuestas', 'practicas', 'mis-archivos', 'diplomas', 'facturas']) assert.ok(env.PRIVADO.m.has(CA + t + '/.keep'), t);
ok('crea la carpeta del alumno con sus 6 subcarpetas');
assert.equal(marcadoresPersona('faro-academy/estudiantes/../x/'), null); assert.equal(marcadoresPersona('otra/ana/'), null); assert.equal(marcadoresPersona('faro-studios/clientes/boda-gomez-33/').length, 1); ok('solo acepta nombres de carpeta válidos');

// portal: la base de datos decide
const AL = { Authorization: 'Bearer alu-token', Origin: ORI }, DO = { Authorization: 'Bearer doc-token', Origin: ORI };
const KP = CA + 'practicas/p1.m4a', KR = CA + 'respuestas/r1.m4a', KB = 'faro-academy/estudiantes/beto-2222/practicas/p.m4a';
const aud = new Uint8Array([1, 2, 3, 4]);
const sub = (k, h, tipo = 'audio/mp4', len = 4) => q(`/p/subir?key=${encodeURIComponent(k)}`, { method: 'PUT', headers: { ...h, 'Content-Type': tipo, 'Content-Length': String(len) }, body: aud });
r = await q(`/p/subir?key=${encodeURIComponent(KP)}`, { method: 'PUT', headers: { Origin: ORI, 'Content-Length': '4' }, body: aud }); assert.equal(r.status, 401); ok('portal: sin sesión → 401');
r = await sub(KP, AL); assert.equal(r.status, 200); assert.ok(env.PRIVADO.m.has(KP)); ok('alumno sube su práctica');
r = await sub(KB, AL); assert.equal(r.status, 403); assert.ok(!env.PRIVADO.m.has(KB)); ok('alumno NO sube en la carpeta de otro');
r = await sub(KR, AL); assert.equal(r.status, 403); ok('alumno NO sube respuestas');
r = await sub(KR, DO); assert.equal(r.status, 200); ok('docente sube su respuesta en audio');
r = await sub(CA + 'practicas/x.m4a', AL, 'text/html'); assert.equal(r.status, 400); r = await sub(CA + 'practicas/x.m4a', AL, 'image/png'); assert.equal(r.status, 400); ok('en prácticas solo audio; nada de html');
r = await sub(CA + 'mis-archivos/x.html', AL, 'text/plain'); assert.equal(r.status, 400); ok('extensiones peligrosas rechazadas');
r = await sub('faro-academy/estudiantes/ana-1111/otro/x.m4a', AL); assert.equal(r.status, 400); r = await sub('faro-academy/ingles/videos/x.mp4', DO); assert.equal(r.status, 400); ok('portal: solo la estructura de personas');
r = await q(`/p/enlace?key=${encodeURIComponent(KP)}`, { method: 'POST', headers: DO }); const en = await r.json(); assert.equal(r.status, 200);
const ep = new URL(en.urlVer); r = await q(ep.pathname + ep.search, { headers: { Range: 'bytes=0-1' } }); assert.equal(r.status, 206); ok('docente escucha la práctica (enlace con rangos)');
r = await q(`/p/enlace?key=${encodeURIComponent(KB)}`, { method: 'POST', headers: AL }); assert.equal(r.status, 403); ok('alumno NO obtiene enlace de otro alumno');
r = await q(`/p/borrar?key=${encodeURIComponent(KP)}`, { method: 'POST', headers: AL }); assert.equal(r.status, 403); assert.ok(env.PRIVADO.m.has(KP)); ok('alumno NO borra');
r = await q(`/p/borrar?key=${encodeURIComponent(KP)}`, { method: 'POST', headers: DO }); assert.equal(r.status, 403); ok('docente NO borra la práctica del alumno');
r = await q(`/p/borrar?key=${encodeURIComponent(KR)}`, { method: 'POST', headers: DO }); assert.equal(r.status, 200); assert.ok(env.PRIVADO.m.has(KR));
r = await q('/api/papelera', { headers: A }); pap = await r.json(); assert.ok(pap.items.some((i) => i.key === KR)); ok('docente borra su respuesta → va a la papelera, el director la ve');
r = await q(`/p/enlace?key=${encodeURIComponent(KR)}`, { method: 'POST', headers: DO }); assert.equal(r.status, 404); ok('lo borrado ya no se sirve en el portal');

// equipo con permiso "ver_archivos": solo ver y descargar, dentro de Studios, Academy y landing
const LE = { Authorization: 'Bearer lector-token', Origin: ORI }, KL = 'faro-studios/agencias/lector/video.mp4';
await env.PRIVADO.put(KL, new Uint8Array([1, 2, 3, 4]));
await env.PRIVADO.put('documentos/sat/2026/declaracion.pdf', new Uint8Array([9]));
r = await q('/api/lista?bucket=privado&prefix=' + encodeURIComponent('faro-studios/agencias/lector/'), { headers: LE });
assert.equal(r.status, 200); assert.equal((await r.json()).archivos.length, 1); ok('lector: ve la lista de archivos de Studios');
r = await q(`/api/enlace?bucket=privado&key=${encodeURIComponent(KL)}&seg=99999&adm=1`, { method: 'POST', headers: LE });
assert.equal(r.status, 200); const jl = await r.json(); assert.ok(jl.vence_en <= 3600); assert.equal((await q(new URL(jl.url).pathname + new URL(jl.url).search)).status, 200); ok('lector: descarga con enlace que vence en máx. 1 hora');
const vistasAntes = (await (await q('/api/stats', { headers: A })).json()).archivos[KL]?.d || 0;
assert.equal(vistasAntes, 1); ok('lector: su descarga SÍ cuenta (no puede saltarse el conteo con adm=1)');
for (const [p, m, pf] of [['/api/lista?bucket=privado&prefix=documentos/', 'GET'], ['/api/lista?bucket=privado&prefix=', 'GET'], ['/api/lista?bucket=privado&prefix=_stats/', 'GET'], ['/api/lista?bucket=privado&prefix=_papelera/', 'GET'], ['/api/lista?bucket=privado&prefix=faro-studios/../documentos/', 'GET']]) {
  r = await q(p, { method: m, headers: LE }); assert.equal(r.status, 403, p);
}
ok('lector: no abre documentos, la raíz, estadísticas ni papelera');
r = await q(`/api/enlace?bucket=privado&key=${encodeURIComponent('documentos/sat/2026/declaracion.pdf')}`, { method: 'POST', headers: LE }); assert.equal(r.status, 403); ok('lector: tampoco genera enlaces de Documentos');
r = await q(`/api/objeto?bucket=privado&key=${encodeURIComponent(KL)}`, { method: 'DELETE', headers: LE }); assert.equal(r.status, 401); assert.ok(env.PRIVADO.m.has(KL)); ok('lector: no borra');
for (const [p, m] of [['/api/init', 'POST'], ['/api/subir?bucket=privado&key=' + encodeURIComponent('faro-studios/agencias/lector/x.txt'), 'PUT'], ['/api/stats', 'GET'], ['/api/papelera', 'GET'], ['/api/carpeta', 'POST'], ['/api/restaurar?bucket=privado&key=a', 'POST'], ['/api/purgar?viejos=1', 'POST']]) {
  r = await q(p, { method: m, headers: LE, body: m === 'GET' ? undefined : '{}' }); assert.equal(r.status, 401, p);
}
ok('lector: no sube, no crea carpetas, no ve estadísticas ni papelera');
r = await q('/api/lista?bucket=privado&prefix=' + encodeURIComponent('faro-studios/agencias/lector/'), { headers: { Authorization: 'Bearer otro-token', Origin: ORI } }); assert.equal(r.status, 401); ok('quien no tiene el permiso → 401');

console.log('\nTodo bien: ' + n + ' comprobaciones.');
