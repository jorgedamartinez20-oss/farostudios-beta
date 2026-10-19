// Pruebas del Worker de correo con servidores IMAP y SMTP SIMULADOS (no toca iCloud ni tu cuenta).
// Uso:  node test/prueba.mjs
// Valida el protocolo y la lectura/decodificación de correos contra respuestas con la forma que da un servidor IMAP real.
// Lo que NO puede probar: las particularidades reales de iCloud (eso se comprueba con "Probar conexión" en el Workspace).
import net from 'node:net';
import { Readable, Writable } from 'node:stream';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const dir = new URL('..', import.meta.url);
let src = readFileSync(new URL('index.js', dir), 'utf8');
src = src.replace("import { connect } from 'cloudflare:sockets';", 'const connect = (...a) => globalThis.__connect(...a);');
if (process.env.DEPURAR) src = src.replace('catch (e) { return err(request, env, e instanceof', 'catch (e) { console.error(e); return err(request, env, e instanceof');
const worker = (await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'))).default;

/* ---------- correos de ejemplo (crudos, como los entrega un servidor) ---------- */
const b64l = (s) => Buffer.from(s, 'utf8').toString('base64').match(/.{1,76}/g).join('\r\n');
const CORREOS = {
  1: ['From: =?UTF-8?B?THVjw61hIE3DqW5kZXo=?= <lucia@agenciaplanta.com>', 'To: producciones@farostudios.net', 'Subject: =?UTF-8?B?Q29ycmVjY2lvbmVzIGFmdGVybW92aWUgwrcgdmVyc2nDs24gMg==?=', 'Message-ID: <abc123@agenciaplanta.com>', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: quoted-printable', '',
    'Hola David,=0D=0A=0D=0AVimos la v2 y qued=C3=B3 muy bien. Solo tres ajustes: audio, r=C3=B3tulo y toma=\r\n de entrada.=0D=0A=0D=0AGracias,=0D=0ALuc=C3=ADa'].join('\r\n'),
  2: ['From: Carlos Orantes <carlos@gmail.com>', 'To: info@farostudios.net', 'Cc: otro@gmail.com', 'Subject: Reserva sesion', 'Content-Type: multipart/alternative; boundary="ALT"', '',
    '--ALT', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', b64l('Buenos días,\nYa hice la transferencia del adelanto.\n'),
    '--ALT', 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '', b64l('<p>otra versión html</p>'), '--ALT--', ''].join('\r\n'),
  3: ['From: Ana <ana@correo.com>', 'To: academia@farostudios.net', 'Subject: =?ISO-8859-1?Q?Horario_ingl=E9s?=', 'Content-Type: multipart/mixed; boundary="MIX"', '',
    '--MIX', 'Content-Type: text/plain; charset=iso-8859-1', 'Content-Transfer-Encoding: quoted-printable', '', 'Mi hijo quiere clases de ingl=E9s. =BFHorarios?', '--MIX',
    'Content-Type: application/pdf; name="voucher.pdf"', 'Content-Disposition: attachment; filename="voucher.pdf"', 'Content-Transfer-Encoding: base64', '', Buffer.from('%PDF-1.4 falso').toString('base64'), '--MIX--', ''].join('\r\n'),
  4: ['From: Porkbun <support@porkbun.com>', 'To: info@farostudios.net', 'Subject: Renovacion', 'Content-Type: text/html; charset=utf-8', '', '<html><head><style>p{}</style></head><body><p>Tu dominio&nbsp;se renueva &amp; vence <b>pronto</b>.</p><script>x()</script></body></html>'].join('\r\n'),
};
const FECHAS = { 1: '17-Oct-2026 10:42:00 +0000', 2: '17-Oct-2026 09:15:00 +0000', 3: '18-Oct-2026 18:20:00 -0600', 4: '08-Oct-2026 08:00:00 +0000' };

/* ---------- IMAP simulado ---------- */
const imapEstado = { msgs: null, comandos: [], appends: [], usuarioOk: 'jorge', clave: 'abcd-efgh-ijkl-mnop' };
function reiniciar() {
  imapEstado.msgs = { INBOX: { 1: { flags: ['\\Seen'] }, 2: { flags: [] }, 3: { flags: [] }, 4: { flags: ['\\Seen', '\\Flagged'] } }, Archive: {}, 'Deleted Messages': {}, 'Sent Messages': {} };
  imapEstado.comandos = []; imapEstado.appends = [];
}
function servidorImap() {
  return net.createServer((sock) => {
    sock.on('error', () => {});
    let carpeta = null, buf = Buffer.alloc(0), literal = null;
    const w = (t) => sock.write(t);
    w('* OK IMAP4rev1 simulado listo\r\n');
    const proceso = (linea) => {
      const m = /^(\S+) (\S+)(?: (.*))?$/.exec(linea); const tag = m[1], cmd = m[2].toUpperCase(), resto = m[3] || '';
      imapEstado.comandos.push(cmd + ' ' + resto);
      const ok = (t = 'completed') => w(`${tag} OK ${t}\r\n`);
      if (cmd === 'LOGIN') {
        const [u, p] = [...resto.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
        return u === imapEstado.usuarioOk && p === imapEstado.clave ? ok('LOGIN completed') : w(`${tag} NO [AUTHENTICATIONFAILED] login incorrecto\r\n`);
      }
      if (cmd === 'CAPABILITY') { w('* CAPABILITY IMAP4rev1 UIDPLUS MOVE\r\n'); return ok(); }
      if (cmd === 'LIST') { w('* LIST (\\HasNoChildren) "/" "INBOX"\r\n* LIST (\\HasNoChildren \\Sent) "/" "Sent Messages"\r\n* LIST (\\HasNoChildren \\Trash) "/" "Deleted Messages"\r\n* LIST (\\HasNoChildren \\Archive) "/" "Archive"\r\n* LIST (\\HasNoChildren \\Drafts) "/" "Drafts"\r\n'); return ok(); }
      if (cmd === 'STATUS') { const c = imapEstado.msgs.INBOX; w(`* STATUS "INBOX" (MESSAGES ${Object.keys(c).length} UNSEEN ${Object.values(c).filter((x) => !x.flags.includes('\\Seen')).length})\r\n`); return ok(); }
      if (cmd === 'SELECT') { carpeta = /"((?:[^"\\]|\\.)*)"/.exec(resto)[1]; if (!imapEstado.msgs[carpeta]) return w(`${tag} NO no existe\r\n`); w('* 4 EXISTS\r\n'); return ok('[READ-WRITE] SELECT completed'); }
      if (cmd === 'UID') {
        const [sub, ...r] = resto.split(' '); const SUB = sub.toUpperCase(); const arg = r.join(' ');
        const c = imapEstado.msgs[carpeta];
        if (SUB === 'SEARCH') {
          let uids = Object.keys(c).map(Number);
          if (/UNSEEN/.test(arg)) uids = uids.filter((u) => !c[u].flags.includes('\\Seen'));
          if (/FLAGGED/.test(arg)) uids = uids.filter((u) => c[u].flags.includes('\\Flagged'));
          if (/TO "info@farostudios\.net"/.test(arg)) uids = uids.filter((u) => /info@farostudios\.net/.test(CORREOS[u]));
          w('* SEARCH ' + uids.join(' ') + '\r\n'); return ok();
        }
        if (SUB === 'FETCH') {
          const uids = arg.split(' ')[0].split(',').map(Number);
          for (const u of uids) {
            if (!c[u]) continue;
            const f = c[u].flags.join(' ');
            if (/HEADER\.FIELDS/.test(arg)) {
              const cab = CORREOS[u].split('\r\n\r\n')[0].split('\r\n').filter((l) => /^(from|to|cc|subject|message-id):/i.test(l)).join('\r\n') + '\r\n\r\n';
              w(`* ${u} FETCH (UID ${u} FLAGS (${f}) INTERNALDATE "${FECHAS[u]}" RFC822.SIZE ${CORREOS[u].length} BODY[HEADER.FIELDS (FROM TO CC SUBJECT MESSAGE-ID)] {${Buffer.byteLength(cab)}}\r\n${cab})\r\n`);
            } else {
              const t = Buffer.from(CORREOS[u], 'binary');
              w(`* ${u} FETCH (UID ${u} FLAGS (${f}) INTERNALDATE "${FECHAS[u]}" RFC822.SIZE ${t.length} BODY[]<0> {${t.length}}\r\n`); sock.write(t); w(')\r\n');
            }
          }
          return ok();
        }
        if (SUB === 'STORE') { const u = +arg.split(' ')[0]; const mm = /([+-])FLAGS\.SILENT \((.*)\)/.exec(arg); const fl = mm[2]; if (mm[1] === '+') { if (!c[u].flags.includes(fl)) c[u].flags.push(fl); } else c[u].flags = c[u].flags.filter((x) => x !== fl); return ok(); }
        if (SUB === 'MOVE' || SUB === 'COPY') { const u = +arg.split(' ')[0]; const d = /"((?:[^"\\]|\\.)*)"/.exec(arg)[1]; imapEstado.msgs[d][u] = c[u]; if (SUB === 'MOVE') delete c[u]; return ok(); }
        if (SUB === 'EXPUNGE') { const u = +arg; if (c[u] && c[u].flags.includes('\\Deleted')) delete c[u]; return ok(); }
      }
      if (cmd === 'EXPUNGE') { for (const u of Object.keys(imapEstado.msgs[carpeta])) if (imapEstado.msgs[carpeta][u].flags.includes('\\Deleted')) delete imapEstado.msgs[carpeta][u]; return ok(); }
      if (cmd === 'LOGOUT') { w('* BYE\r\n'); ok(); return sock.end(); }
      w(`${tag} BAD comando no reconocido\r\n`);
    };
    // lector de líneas con literales de entrada ({n} -> '+ ' -> n bytes)
    let pendiente = null;
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        if (literal) {
          if (buf.length < literal.n) return;
          literal.datos.push(buf.subarray(0, literal.n)); buf = buf.subarray(literal.n); const l = literal; literal = null;
          // el resto de la línea llega después del literal
          pendiente = { texto: l.texto + '\u0001LIT' + (l.datos.length - 1) + '\u0001', datos: l.datos };
          continue;
        }
        const i = buf.indexOf('\r\n'); if (i < 0) return;
        const linea = buf.subarray(0, i).toString('latin1'); buf = buf.subarray(i + 2);
        const base = pendiente ? pendiente.texto + linea : linea; const datos = pendiente ? pendiente.datos : [];
        const mm = /\{(\d+)\}$/.exec(base);
        if (mm) { literal = { n: +mm[1], texto: base.slice(0, mm.index), datos }; pendiente = null; w('+ listo\r\n'); continue; }
        pendiente = null;
        if (/^\S+ APPEND /i.test(base)) { const d = /"([^"]+)"/.exec(base)[1]; imapEstado.appends.push({ carpeta: d, linea: base, datos: datos.map((x) => x.toString('latin1')) }); const tag = base.split(' ')[0]; w(`${tag} OK APPEND completed\r\n`); imapEstado.comandos.push('APPEND ' + base); continue; }
        if (datos.length) { imapEstado.comandos.push(base.replace(/\u0001LIT\d+\u0001/g, '<lit>')); imapEstado.comandos.push('LITERAL ' + datos.map((x) => x.toString('utf8')).join('|')); const tag = base.split(' ')[0]; if (/UID SEARCH/i.test(base)) { w('* SEARCH 1\r\n'); w(`${tag} OK SEARCH completed\r\n`); continue; } }
        proceso(base);
      }
    });
  });
}

/* ---------- SMTP simulado ---------- */
const smtpEstado = { recibidos: [], auth: null, tls: false };
function servidorSmtp() {
  return net.createServer((sock) => {
    sock.on('error', () => {});
    let datos = false, acumulado = '', rem = null, dest = [];
    sock.write('220 smtp simulado\r\n');
    let buf = '';
    sock.on('data', (d) => {
      buf += d.toString('latin1');
      for (;;) {
        if (datos) { const i = buf.indexOf('\r\n.\r\n'); if (i < 0) return; acumulado = buf.slice(0, i + 2); buf = buf.slice(i + 5); datos = false; smtpEstado.recibidos.push({ de: rem, para: dest, mensaje: acumulado }); sock.write('250 2.0.0 aceptado\r\n'); continue; }
        const i = buf.indexOf('\r\n'); if (i < 0) return; const l = buf.slice(0, i); buf = buf.slice(i + 2);
        if (/^EHLO/i.test(l)) sock.write('250-simulado\r\n250-STARTTLS\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (/^STARTTLS/i.test(l)) { smtpEstado.tls = true; sock.write('220 listo para TLS\r\n'); }
        else if (/^AUTH PLAIN/i.test(l)) { const [, u, p] = Buffer.from(l.split(' ')[2], 'base64').toString().split('\0'); smtpEstado.auth = { u, p }; sock.write(u === 'jorge@icloud.com' && p === imapEstado.clave ? '235 2.7.0 ok\r\n' : '535 5.7.8 credenciales malas\r\n'); }
        else if (/^MAIL FROM:/i.test(l)) { rem = /<([^>]*)>/.exec(l)[1]; dest = []; sock.write('250 ok\r\n'); }
        else if (/^RCPT TO:/i.test(l)) { dest.push(/<([^>]*)>/.exec(l)[1]); sock.write('250 ok\r\n'); }
        else if (/^DATA/i.test(l)) { datos = true; sock.write('354 siga\r\n'); }
        else if (/^QUIT/i.test(l)) { sock.write('221 adios\r\n'); sock.end(); }
        else sock.write('500 no entiendo\r\n');
      }
    });
  });
}

/* ---------- red falsa: connect() de Cloudflare apunta a los servidores simulados ---------- */
const imapSrv = servidorImap(), smtpSrv = servidorSmtp();
await new Promise((r) => imapSrv.listen(0, '127.0.0.1', r));
await new Promise((r) => smtpSrv.listen(0, '127.0.0.1', r));
const puertos = { 993: imapSrv.address().port, 587: smtpSrv.address().port };
const destinos = [];
globalThis.__connect = ({ hostname, port }, op) => {
  destinos.push({ hostname, port, modo: op.secureTransport });
  const s = net.connect(puertos[port], '127.0.0.1'); s.on('error', () => {});
  const readable = Readable.toWeb(s), writable = Writable.toWeb(s);
  return { readable, writable, startTls() { return { readable, writable, startTls() { throw new Error('doble TLS'); }, close() { s.destroy(); } }; }, close() { s.destroy(); } };
};

/* ---------- Supabase falso (validación de sesión) ---------- */
const fetchReal = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  if (String(u).includes('/auth/v1/user')) {
    const t = (o.headers.Authorization || '').replace('Bearer ', '');
    if (t === 'bueno') return new Response(JSON.stringify({ email: 'reservas@farostudios.net', factors: [] }), { status: 200 });
    if (t === 'ajeno') return new Response(JSON.stringify({ email: 'otra@persona.com', factors: [] }), { status: 200 });
    return new Response('{}', { status: 401 });
  }
  return fetchReal(u, o);
};

/* ---------- ayudantes de prueba ---------- */
const ENV = { ICLOUD_USUARIO: 'jorge@icloud.com', ICLOUD_CLAVE: imapEstado.clave };
const ORIG = 'https://farostudios.net';
async function llamar(ruta, cuerpo, { token = 'bueno', env = ENV, metodo = 'POST' } = {}) {
  const h = { Origin: ORIG, 'Content-Type': 'application/json' }; if (token) h.Authorization = 'Bearer ' + token;
  const r = await worker.fetch(new Request('https://faro-correo.test' + ruta, { method: metodo, headers: h, body: metodo === 'POST' ? JSON.stringify(cuerpo || {}) : undefined }), env);
  return { status: r.status, j: await r.json(), cors: r.headers.get('Access-Control-Allow-Origin') };
}
let n = 0; const ok = (nombre) => { n++; console.log('  ✓ ' + nombre); };

/* ---------- pruebas ---------- */
console.log('Seguridad');
reiniciar();
assert.equal((await llamar('/correo/lista', {}, { token: null })).status, 401); ok('sin sesión: 401');
assert.equal((await llamar('/correo/lista', {}, { token: 'malo' })).status, 401); ok('sesión inválida: 401');
assert.equal((await llamar('/correo/lista', {}, { token: 'ajeno' })).status, 401); ok('otra persona (no es el director): 401');
assert.equal((await llamar('/correo/lista', {}, { env: {} })).status, 503); ok('faltan secretos: 503 con mensaje claro');
assert.equal((await llamar('/correo/estado', {}, { metodo: 'GET' })).status, 405); ok('GET no permitido');
{ const r = await worker.fetch(new Request('https://x.test/correo/lista', { method: 'OPTIONS', headers: { Origin: 'https://sitio-malo.com' } }), ENV); assert.equal(r.headers.get('Access-Control-Allow-Origin'), null); ok('CORS: origen ajeno no recibe permiso'); }
assert.equal((await llamar('/correo/lista', {})).cors, ORIG); ok('CORS: origen propio permitido');

console.log('Conexión');
let r = await llamar('/correo/estado', { smtp: true });
assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.lectura, true); assert.equal(r.j.envio, true); assert.equal(r.j.mensajes, 4); assert.equal(r.j.sinLeer, 2);
assert.equal(r.j.carpetas.sent, 'Sent Messages'); assert.equal(r.j.carpetas.trash, 'Deleted Messages'); assert.equal(r.j.carpetas.archive, 'Archive'); ok('estado: lectura, envío, carpetas y sin leer');
assert.ok(destinos.some((d) => d.hostname === 'imap.mail.me.com' && d.port === 993 && d.modo === 'on')); assert.ok(destinos.some((d) => d.hostname === 'smtp.mail.me.com' && d.port === 587 && d.modo === 'starttls')); ok('usa los servidores y puertos de iCloud (993 TLS, 587 STARTTLS)');
assert.ok(imapEstado.comandos.some((c) => c.startsWith('LOGIN')) && smtpEstado.tls === true); ok('SMTP sube a TLS antes de autenticar');
assert.deepEqual(smtpEstado.auth, { u: 'jorge@icloud.com', p: imapEstado.clave }); ok('SMTP autentica con la dirección completa');
r = await llamar('/correo/estado', {}, { env: { ICLOUD_USUARIO: 'jorge@icloud.com', ICLOUD_CLAVE: 'incorrecta' } });
assert.equal(r.status, 502); assert.match(r.j.error, /contraseña de app/); assert.ok(!JSON.stringify(r.j).includes('incorrecta')); ok('contraseña mala: mensaje claro y sin filtrar la clave');

console.log('Lectura');
r = await llamar('/correo/lista', { carpeta: 'inbox' });
assert.equal(r.status, 200, JSON.stringify(r.j)); assert.deepEqual(r.j.mensajes.map((m) => m.uid), [4, 3, 2, 1]); ok('lista ordenada del más nuevo al más viejo');
const m1 = r.j.mensajes.find((m) => m.uid === 1), m2 = r.j.mensajes.find((m) => m.uid === 2), m3 = r.j.mensajes.find((m) => m.uid === 3), m4 = r.j.mensajes.find((m) => m.uid === 4);
assert.equal(m1.de.nombre, 'Lucía Méndez'); assert.equal(m1.de.correo, 'lucia@agenciaplanta.com'); assert.equal(m1.asunto, 'Correcciones aftermovie · versión 2'); ok('nombre y asunto con acentos (UTF-8 en base64)');
assert.equal(m3.asunto, 'Horario inglés'); ok('asunto ISO-8859-1 (Q) decodificado');
assert.equal(m1.cuenta, 'producciones'); assert.equal(m2.cuenta, 'info'); assert.equal(m3.cuenta, 'academia'); ok('detecta a qué dirección llegó (producciones, info, academia)');
assert.equal(m1.leido, true); assert.equal(m2.leido, false); assert.equal(m4.destacado, true); assert.equal(m1.fecha, '2026-10-17T10:42:00.000Z'); assert.equal(m3.fecha, '2026-10-19T00:20:00.000Z'); ok('leído, destacado y fecha (con zona horaria)');
assert.equal(r.j.sinLeer, 2); ok('contador de sin leer');
r = await llamar('/correo/lista', { carpeta: 'inbox', cuenta: 'info' });
assert.ok(imapEstado.comandos.some((c) => /UID SEARCH OR TO "info@farostudios\.net" CC "info@farostudios\.net"/.test(c))); ok('filtra por cuenta con TO/CC de esa dirección');
r = await llamar('/correo/lista', { carpeta: 'starred' }); assert.deepEqual(r.j.mensajes.map((m) => m.uid), [4]); ok('destacados');
r = await llamar('/correo/lista', { carpeta: 'inbox', q: 'Méndez' });
assert.ok(imapEstado.comandos.some((c) => /UID SEARCH CHARSET UTF-8 OR TO .* TEXT <lit>/.test(c)) && imapEstado.comandos.some((c) => c === 'LITERAL Méndez')); ok('búsqueda con acentos (UTF-8 como literal)');
r = await llamar('/correo/lista', { carpeta: 'inbox', q: 'a"b\r\nF9 DELETE INBOX' });
assert.ok(!imapEstado.comandos.some((c) => /^DELETE/.test(c))); assert.ok(imapEstado.comandos.some((c) => /TEXT "a\\"b F9 DELETE INBOX"/.test(c))); ok('inyección en la búsqueda: comillas escapadas y saltos de línea eliminados');

console.log('Un correo');
r = await llamar('/correo/mensaje', { carpeta: 'inbox', uid: 1 });
assert.equal(r.status, 200, JSON.stringify(r.j)); assert.match(r.j.cuerpo, /qued[óo] muy bien/); assert.match(r.j.cuerpo, /ajustes: audio, rótulo y toma de entrada/); assert.match(r.j.cuerpo, /Lucía$/); assert.equal(r.j.idMensaje, '<abc123@agenciaplanta.com>'); ok('quoted-printable UTF-8 con saltos suaves');
r = await llamar('/correo/mensaje', { carpeta: 'inbox', uid: 2 });
assert.equal(r.j.cuerpo, 'Buenos días,\nYa hice la transferencia del adelanto.'); assert.deepEqual(r.j.cc.map((x) => x.correo), ['otro@gmail.com']); ok('multipart/alternative en base64: usa el texto plano');
assert.equal(imapEstado.msgs.INBOX[2].flags.includes('\\Seen'), true); ok('al abrirlo se marca como leído');
r = await llamar('/correo/mensaje', { carpeta: 'inbox', uid: 3 });
assert.match(r.j.cuerpo, /clases de inglés\. ¿Horarios\?/); assert.deepEqual(r.j.adjuntos, [{ nombre: 'voucher.pdf', tipo: 'application/pdf', tam: r.j.adjuntos[0].tam }]); ok('ISO-8859-1 y lista de adjuntos (sin descargarlos)');
r = await llamar('/correo/mensaje', { carpeta: 'inbox', uid: 4 });
assert.equal(r.j.cuerpo, 'Tu dominio se renueva & vence pronto.'); ok('solo HTML: se convierte a texto sin scripts ni estilos');
r = await llamar('/correo/mensaje', { carpeta: 'inbox', uid: 99 }); assert.equal(r.status, 502); assert.match(r.j.error, /ya no está/); ok('correo inexistente: mensaje claro');

console.log('Acciones');
reiniciar();
await llamar('/correo/accion', { carpeta: 'inbox', uid: 2, accion: 'leido' }); assert.ok(imapEstado.msgs.INBOX[2].flags.includes('\\Seen'));
await llamar('/correo/accion', { carpeta: 'inbox', uid: 2, accion: 'noleido' }); assert.ok(!imapEstado.msgs.INBOX[2].flags.includes('\\Seen')); ok('leído / no leído');
await llamar('/correo/accion', { carpeta: 'inbox', uid: 2, accion: 'destacar' }); assert.ok(imapEstado.msgs.INBOX[2].flags.includes('\\Flagged'));
await llamar('/correo/accion', { carpeta: 'inbox', uid: 2, accion: 'quitar_destacado' }); assert.ok(!imapEstado.msgs.INBOX[2].flags.includes('\\Flagged')); ok('destacar / quitar');
await llamar('/correo/accion', { carpeta: 'inbox', uid: 3, accion: 'archivar' }); assert.ok(!imapEstado.msgs.INBOX[3] && imapEstado.msgs.Archive[3]); ok('archivar (UID MOVE)');
await llamar('/correo/accion', { carpeta: 'inbox', uid: 1, accion: 'papelera' }); assert.ok(!imapEstado.msgs.INBOX[1] && imapEstado.msgs['Deleted Messages'][1]); ok('a la papelera');
await llamar('/correo/accion', { carpeta: 'trash', uid: 1, accion: 'papelera' }); assert.ok(!imapEstado.msgs['Deleted Messages'][1]); ok('eliminar desde la papelera borra de verdad');
assert.equal((await llamar('/correo/accion', { carpeta: 'inbox', uid: 2, accion: 'formatear' })).status, 400); ok('acción desconocida: 400');
assert.equal((await llamar('/correo/accion', { carpeta: 'inbox', uid: '2 ; X', accion: 'leido' })).status, 400); ok('uid con texto raro: 400');
assert.equal((await llamar('/correo/lista', { carpeta: 'inbox" DELETE' })).status, 400); ok('carpeta fuera de la lista permitida: 400');

console.log('Envío');
reiniciar(); smtpEstado.recibidos.length = 0;
r = await llamar('/correo/enviar', { cuenta: 'producciones', para: 'cliente@empresa.com, otro@mail.com', cc: 'copia@x.org', asunto: 'Cotización boda · 2027', texto: 'Hola María,\n.punto al inicio\nTe envío los paquetes.', html: 'Hola <b>María</b>,<script>alert(1)</script><br><a href="javascript:alert(1)">malo</a> <a href="https://farostudios.net">sitio</a>', enRespuestaA: '<abc123@agenciaplanta.com>' });
assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.guardado, true); ok('envío correcto y copia guardada en Enviados');
const e = smtpEstado.recibidos[0];
assert.equal(e.de, 'producciones@farostudios.net'); assert.deepEqual(e.para, ['cliente@empresa.com', 'otro@mail.com', 'copia@x.org']); ok('remitente y destinatarios (con copia) correctos');
assert.match(e.mensaje, /^From: "Faro Studios" <producciones@farostudios\.net>\r\n/); assert.match(e.mensaje, /\r\nIn-Reply-To: <abc123@agenciaplanta\.com>\r\n/); assert.match(e.mensaje, /\r\nMessage-ID: <[0-9a-f-]+@farostudios\.net>\r\n/); ok('cabeceras From, In-Reply-To y Message-ID');
const asuntoB64 = /Subject: =\?UTF-8\?B\?([^?]+)\?=/.exec(e.mensaje)[1]; assert.equal(Buffer.from(asuntoB64, 'base64').toString(), 'Cotización boda · 2027'); ok('asunto con acentos codificado');
const partes = e.mensaje.split(/--faro[0-9a-f]+/); const txt = Buffer.from(/\r\n\r\n([\s\S]+?)\r\n$/.exec(partes[1].trimEnd() + '\r\n')[1].replace(/\r\n/g, ''), 'base64').toString(); assert.equal(txt, 'Hola María,\n.punto al inicio\nTe envío los paquetes.'.replace(/\n/g, '\r\n')); ok('cuerpo de texto íntegro (acentos, saltos de línea y línea que empieza con punto)');
const html = Buffer.from(/\r\n\r\n([\s\S]+?)\r\n$/.exec(partes[2].trimEnd() + '\r\n')[1].replace(/\r\n/g, ''), 'base64').toString(); assert.ok(!/script|javascript:/i.test(html)); assert.match(html, /<b>María<\/b>/); assert.match(html, /<a href="https:\/\/farostudios\.net">sitio<\/a>/); ok('HTML limpio: sin scripts ni enlaces peligrosos, conserva negrita y enlaces válidos');
assert.equal(imapEstado.appends.length, 1); assert.equal(imapEstado.appends[0].carpeta, 'Sent Messages'); assert.match(imapEstado.appends[0].linea, /\(\\Seen\)/); assert.match(imapEstado.appends[0].datos[0], /^From: "Faro Studios"/); ok('la copia en "Sent Messages" lleva la marca de leído');
for (const [malo, esperado] of [[{ cuenta: 'producciones', para: 'no-es-correo', asunto: 'x', texto: 'x' }, /no es válida/], [{ cuenta: 'producciones', para: 'a@b.com\r\nBcc: espia@x.com', asunto: 'x', texto: 'x' }, /no es válida/], [{ cuenta: 'otra', para: 'a@b.com', texto: 'x' }, /desde qué dirección/], [{ cuenta: 'constructor', para: 'a@b.com', texto: 'x' }, /desde qué dirección/], [{ cuenta: 'info', para: '', texto: 'x' }, /destinatario/], [{ cuenta: 'info', para: 'a@b.com', texto: '  ' }, /vacío/]]) {
  const x = await llamar('/correo/enviar', malo); assert.equal(x.status, 400); assert.match(x.j.error, esperado);
}
ok('rechaza direcciones inválidas, inyección de cabeceras (Bcc), remitente ajeno, sin destinatario y mensaje vacío');
assert.equal(smtpEstado.recibidos.length, 1); ok('lo rechazado no llegó a enviarse');
r = await llamar('/correo/enviar', { cuenta: 'info', para: 'a@b.com', asunto: 'x', texto: 'hola' }, { env: { ICLOUD_USUARIO: 'jorge@icloud.com', ICLOUD_CLAVE: 'mala' } });
assert.equal(r.status, 502); assert.match(r.j.error, /contraseña de app/); ok('envío con clave mala: error claro');

console.log('\n' + n + ' pruebas correctas.');
imapSrv.close(); smtpSrv.close(); process.exit(0);
