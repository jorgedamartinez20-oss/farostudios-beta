/* Faro · Servicio de correo (Cloudflare Worker "faro-correo")
 *
 * Conecta el Faro Workspace con el correo de iCloud+ del dominio farostudios.net
 * (info@, producciones@ y academia@ llegan a una sola cuenta de iCloud Mail).
 *   - Leer:   IMAP  imap.mail.me.com : 993 (TLS)
 *   - Enviar: SMTP  smtp.mail.me.com : 587 (STARTTLS)
 *
 * Secretos que van en el Worker (Settings > Variables and Secrets, tipo "Secret"; NUNCA en el código):
 *   ICLOUD_USUARIO   tu dirección principal de iCloud, la que termina en @icloud.com
 *   ICLOUD_CLAVE     contraseña específica de app creada en account.apple.com
 *
 * Seguridad: todas las rutas exigen la sesión del director (mismo control que el Worker de archivos:
 * se valida contra Supabase en cada petición y, si tiene el código de 2 pasos, debe haberlo pasado).
 * Es un solo archivo, sin dependencias, para poder pegarlo tal cual en el editor de Cloudflare.
 */
import { connect } from 'cloudflare:sockets';

/* Valores por defecto (nada de esto es secreto: la llave "publishable" de Supabase es pública por diseño).
   Si quieres cambiarlos, crea una variable con el mismo nombre en el Worker y esa tiene prioridad. */
const DEF = {
  SUPABASE_URL: 'https://keivqvsgdfhthouzlqxo.supabase.co',
  SUPABASE_KEY: 'sb_publishable_5nj3M7rjQs3phGU6u2uNqw_3tjTL6PE',
  ADMIN_EMAIL: 'reservas@farostudios.net',
  ORIGENES: 'https://jorgedamartinez20-oss.github.io,https://farostudios.net,https://www.farostudios.net,https://workspace.farostudios.net',
};
const cfg = (env, k) => (env && env[k]) || DEF[k];

const IMAP_HOST = 'imap.mail.me.com', IMAP_PORT = 993;
const SMTP_HOST = 'smtp.mail.me.com', SMTP_PORT = 587;
const DOMINIO = 'farostudios.net';
const CUENTAS = {
  info: { dir: 'info@farostudios.net', nombre: 'Faro Studios' },
  producciones: { dir: 'producciones@farostudios.net', nombre: 'Faro Studios' },
  academia: { dir: 'academia@farostudios.net', nombre: 'Faro Academy' },
};
const POR_PAGINA = 30;
const MAX_CUERPO = 300000; // bytes que se leen de un correo (los adjuntos grandes no se descargan; mantiene bajo el uso de proceso)
const MAX_LITERAL = 4 * 1024 * 1024;
const ESPERA_MS = 25000;

const enc = new TextEncoder();
class ErrorCorreo extends Error {}
class ErrorDatos extends ErrorCorreo {} // datos mal enviados por la página (400)

/* ---------- utilidades de texto/bytes ---------- */
const bin = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return s; };
const aBytes = (s) => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
const b64 = (u8) => btoa(bin(u8));
const b64Lineas = (u8) => (b64(u8).match(/.{1,76}/g) || []).join('\r\n');
function textoDe(bytes, charset) {
  const c = String(charset || 'utf-8').toLowerCase().replace(/^"|"$/g, '').trim();
  try { return new TextDecoder(c).decode(bytes); } catch (e) { try { return new TextDecoder('utf-8').decode(bytes); } catch (_) { return bin(bytes); } }
}
function qpBytes(s) {
  s = s.replace(/=\r?\n/g, '');
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; } else out.push(s.charCodeAt(i) & 255);
  }
  return Uint8Array.from(out);
}
const raw8 = (v) => (/[\x80-\xff]/.test(v) ? textoDe(aBytes(v), 'utf-8') : v);
function decPalabras(s) {
  if (!s) return '';
  s = s.replace(/(\?=)\s+(=\?)/g, '$1$2');
  return s.replace(/=\?([^?\s]+)\?([bBqQ])\?([^?]*)\?=/g, (m, cs, t, x) => {
    try {
      const bytes = t.toLowerCase() === 'b' ? aBytes(atob(x)) : qpBytes(x.replace(/_/g, ' '));
      return textoDe(bytes, cs.split('*')[0]);
    } catch (e) { return m; }
  });
}
const cabTexto = (v) => decPalabras(raw8(String(v || '')));
function codificaCab(s) { // RFC 2047 para asuntos y nombres con acentos
  s = String(s || '').replace(/[\r\n]+/g, ' ').trim();
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const partes = []; let cur = '', n = 0;
  for (const ch of s) {
    const l = enc.encode(ch).length;
    if (n + l > 42) { partes.push(cur); cur = ''; n = 0; }
    cur += ch; n += l;
  }
  if (cur) partes.push(cur);
  return partes.map((p) => '=?UTF-8?B?' + b64(enc.encode(p)) + '?=').join('\r\n ');
}
const qs = (s) => '"' + String(s).replace(/(["\\])/g, '\\$1') + '"';

/* ---------- lectura de correos (MIME) ---------- */
function parseCab(txt) {
  const h = {};
  for (const l of txt.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const i = l.indexOf(':');
    if (i < 1) continue;
    const k = l.slice(0, i).trim().toLowerCase();
    if (!(k in h)) h[k] = l.slice(i + 1).trim();
  }
  return h;
}
function parseParams(v) {
  const m = /^\s*([^;\s]*)\s*([\s\S]*)$/.exec(v || '');
  const params = {};
  const re = /;\s*([\w*.-]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;\s]*))/g;
  let r;
  while ((r = re.exec(m[2]))) params[r[1].toLowerCase()] = r[2] !== undefined ? r[2].replace(/\\(.)/g, '$1') : r[3];
  return { valor: m[1] || '', params };
}
function parseMime(raw) {
  let i = raw.indexOf('\r\n\r\n'), sep = 4;
  if (i < 0) { i = raw.indexOf('\n\n'); sep = 2; }
  const cab = parseCab(i < 0 ? raw : raw.slice(0, i));
  const ct = parseParams(cab['content-type'] || 'text/plain');
  const cd = parseParams(cab['content-disposition'] || '');
  return { cab, tipo: ct.valor.toLowerCase(), params: ct.params, disp: cd.valor.toLowerCase(), dparams: cd.params, cte: String(cab['content-transfer-encoding'] || '7bit').toLowerCase().trim(), cuerpo: i < 0 ? '' : raw.slice(i + sep) };
}
function nombreArchivo(p) {
  const f = p.dparams['filename*'] || p.params['name*'];
  if (f) { try { return decodeURIComponent(f.replace(/^[^']*'[^']*'/, '')); } catch (e) { /* sigue */ } }
  return cabTexto(p.dparams.filename || p.params.name || '');
}
function cuerpoTexto(p) {
  let bytes;
  if (p.cte === 'base64') {
    let t = p.cuerpo.replace(/[^A-Za-z0-9+/]/g, '');
    if (t.length % 4 === 1) t = t.slice(0, -1);
    while (t.length % 4) t += '=';
    try { bytes = aBytes(atob(t)); } catch (e) { bytes = aBytes(p.cuerpo); }
  }
  else if (p.cte === 'quoted-printable') bytes = qpBytes(p.cuerpo);
  else bytes = aBytes(p.cuerpo);
  return textoDe(bytes, p.params.charset);
}
function recorrer(raw, res, prof) {
  if (prof > 6) return;
  const p = parseMime(raw);
  if (p.tipo.startsWith('multipart/') && p.params.boundary) {
    const trozos = p.cuerpo.split('--' + p.params.boundary);
    for (let k = 1; k < trozos.length; k++) {
      if (trozos[k].startsWith('--')) break;
      recorrer(trozos[k].replace(/^\r?\n/, ''), res, prof + 1);
    }
    return;
  }
  const nombre = nombreArchivo(p);
  const esTexto = p.tipo === 'text/plain' || p.tipo === 'text/html';
  if (esTexto && p.disp !== 'attachment' && !nombre) {
    const t = cuerpoTexto(p);
    if (p.tipo === 'text/html') res.html += (res.html ? '\n' : '') + t; else res.texto += (res.texto ? '\n' : '') + t;
    return;
  }
  if (p.tipo.startsWith('multipart/')) return;
  res.adjuntos.push({ nombre: nombre || 'archivo', tipo: p.tipo, tam: Math.round((p.cuerpo.length * (p.cte === 'base64' ? 3 : 4)) / 4) });
}
function htmlATexto(h) {
  h = h.replace(/<(style|script|head)[\s\S]*?<\/\1\s*>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, '');
  h = h.replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (m, n) => { try { return String.fromCodePoint(+n); } catch (e) { return ''; } })
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch (e) { return ''; } })
    .replace(/&amp;/gi, '&');
  return h.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function leerMensajeCompleto(raw) {
  const p = parseMime(raw);
  const res = { texto: '', html: '', adjuntos: [] };
  recorrer(raw, res, 0);
  const cuerpo = (res.texto.trim() ? res.texto : htmlATexto(res.html)).replace(/\r\n/g, '\n').trim();
  return { cab: p.cab, cuerpo, adjuntos: res.adjuntos };
}
function dirs(v) { // "Nombre" <a@b.com>, otro@c.com  ->  [{nombre, correo}]
  const t = String(v || ''); const partes = []; let cur = '', q = false, ang = false;
  for (const ch of t) {
    if (ch === '"') q = !q;
    if (ch === '<' && !q) ang = true;
    if (ch === '>' && !q) ang = false;
    if (ch === ',' && !q && !ang) { partes.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) partes.push(cur);
  const out = [];
  for (const p of partes) {
    const m = /^\s*(?:"?([^"<]*?)"?\s*)?<([^<>\s]+)>\s*$/.exec(p);
    if (m) out.push({ nombre: cabTexto(m[1] || '').trim(), correo: m[2].toLowerCase() });
    else { const a = /[^\s<>"',;]+@[^\s<>"',;]+/.exec(p); if (a) out.push({ nombre: '', correo: a[0].toLowerCase() }); }
  }
  return out;
}
const MESES = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function isoDe(s) { // "17-Oct-2026 10:00:00 +0000"
  const m = /^\s*(\d{1,2})-(\w{3})-(\d{4}) (\d\d):(\d\d):(\d\d) ([+-])(\d\d)(\d\d)$/.exec(s);
  if (!m) return null;
  const t = Date.UTC(+m[3], MESES[m[2].toLowerCase()] ?? 0, +m[1], +m[4], +m[5], +m[6]) - (m[7] === '-' ? -1 : 1) * (+m[8] * 60 + +m[9]) * 60000;
  return new Date(t).toISOString();
}

/* ---------- conexión (sockets TCP de Cloudflare) ---------- */
const abrirCF = (host, port, modo) => connect({ hostname: host, port }, { secureTransport: modo, allowHalfOpen: false });
const indexCRLF = (u) => { for (let i = 0; i < u.length - 1; i++) if (u[i] === 13 && u[i + 1] === 10) return i; return -1; };
class Flujo {
  constructor(sock) { this.sock = sock; this.w = sock.writable.getWriter(); this.r = sock.readable.getReader(); this.buf = new Uint8Array(0); }
  async _mas() {
    let t; const espera = new Promise((_, rej) => { t = setTimeout(() => rej(new ErrorCorreo('El servidor de correo tardó demasiado en responder.')), ESPERA_MS); });
    try {
      const { value, done } = await Promise.race([this.r.read(), espera]);
      if (done) throw new ErrorCorreo('El servidor de correo cerró la conexión.');
      const n = new Uint8Array(this.buf.length + value.length); n.set(this.buf); n.set(value, this.buf.length); this.buf = n;
    } finally { clearTimeout(t); }
  }
  async linea() {
    for (;;) {
      const i = indexCRLF(this.buf);
      if (i >= 0) { const s = bin(this.buf.subarray(0, i)); this.buf = this.buf.subarray(i + 2); return s; }
      await this._mas();
    }
  }
  async bytes(n) { while (this.buf.length < n) await this._mas(); const s = this.buf.slice(0, n); this.buf = this.buf.subarray(n); return s; }
  async escribir(d) { await this.w.write(typeof d === 'string' ? aBytes(d) : d); }
  subirTls() { this.w.releaseLock(); this.r.releaseLock(); return new Flujo(this.sock.startTls()); }
  cerrar() { try { this.w.releaseLock(); } catch (e) { /* ya liberado */ } try { this.r.releaseLock(); } catch (e) { /* ya liberado */ } try { this.sock.close(); } catch (e) { /* ya cerrado */ } }
}

/* ---------- IMAP ---------- */
class Imap {
  constructor(f) { this.f = f; this.n = 0; this.cap = ''; }
  static async abrir(abrir) {
    const f = new Flujo(abrir(IMAP_HOST, IMAP_PORT, 'on'));
    const im = new Imap(f);
    const saludo = await f.linea();
    if (!/^\* (OK|PREAUTH)/i.test(saludo)) { f.cerrar(); throw new ErrorCorreo('iCloud no aceptó la conexión de lectura.'); }
    return im;
  }
  async cmd(...partes) { // partes: texto o {lit: Uint8Array}
    const tag = 'F' + (++this.n);
    let linea = tag + ' ';
    for (const p of partes) {
      if (typeof p === 'string') { linea += p; continue; }
      linea += '{' + p.lit.length + '}\r\n';
      await this.f.escribir(linea); linea = '';
      for (;;) {
        const l = await this.f.linea();
        if (l.startsWith('+')) break;
        if (l.startsWith(tag + ' ')) throw new ErrorCorreo('iCloud rechazó la orden.');
      }
      await this.f.escribir(p.lit);
    }
    await this.f.escribir(linea + '\r\n');
    return this.respuesta(tag);
  }
  async respuesta(tag) {
    const sin = [], lits = [];
    for (;;) {
      let l = await this.f.linea(), m;
      while ((m = /\{(\d+)\}$/.exec(l))) {
        const n = +m[1];
        if (n > MAX_LITERAL) throw new ErrorCorreo('Un correo es demasiado grande para mostrarlo.');
        lits.push(bin(await this.f.bytes(n)));
        l = l.slice(0, m.index) + '\u0000' + (lits.length - 1) + '\u0000' + await this.f.linea();
      }
      if (l.startsWith(tag + ' ')) {
        const r = /^\S+ (OK|NO|BAD)\s*([\s\S]*)$/i.exec(l);
        return { ok: !!r && r[1].toUpperCase() === 'OK', texto: r ? r[2] : l, sin, lits };
      }
      sin.push(l);
    }
  }
  async login(usuario, clave) {
    if (/[\r\n\0]/.test(usuario + clave)) throw new ErrorCorreo('El usuario o la contraseña guardados tienen caracteres no válidos.');
    let r = await this.cmd('LOGIN ', qs(usuario), ' ', qs(clave));
    if (!r.ok && usuario.includes('@')) r = await this.cmd('LOGIN ', qs(usuario.split('@')[0]), ' ', qs(clave));
    if (!r.ok) throw new ErrorCorreo('iCloud no aceptó el usuario o la contraseña de app. Revisa los secretos ICLOUD_USUARIO e ICLOUD_CLAVE.');
    const c = await this.cmd('CAPABILITY');
    this.cap = c.sin.join(' ').toUpperCase();
  }
  async carpetas() {
    const r = await this.cmd('LIST "" "*"');
    const m = { inbox: 'INBOX' }, porNombre = {};
    for (const l of r.sin) {
      const x = /^\* LIST \(([^)]*)\) (?:"(?:[^"\\]|\\.)"|NIL) (.+)$/i.exec(l);
      if (!x) continue;
      const flags = x[1].toLowerCase(); let nombre = x[2].trim();
      if (nombre[0] === '"') nombre = nombre.slice(1, -1).replace(/\\(.)/g, '$1');
      porNombre[nombre.toLowerCase()] = nombre;
      if (flags.includes('\\sent')) m.sent = nombre; else if (flags.includes('\\trash')) m.trash = nombre; else if (flags.includes('\\archive')) m.archive = nombre; else if (flags.includes('\\drafts')) m.drafts = nombre; else if (flags.includes('\\junk')) m.junk = nombre;
    }
    const por = (k, ...nombres) => { if (!m[k]) m[k] = nombres.map((n) => porNombre[n]).find(Boolean) || nombres[0]; };
    por('sent', 'sent messages', 'sent'); por('trash', 'deleted messages', 'trash'); por('archive', 'archive'); por('drafts', 'drafts'); por('junk', 'junk');
    return m;
  }
  async seleccionar(nombre) {
    const r = await this.cmd('SELECT ', qs(nombre));
    if (!r.ok) throw new ErrorCorreo('No se pudo abrir la carpeta de correo.');
    return r;
  }
  async buscar(partes, utf8) {
    const r = await this.cmd('UID SEARCH ', utf8 ? 'CHARSET UTF-8 ' : '', ...partes);
    if (!r.ok) throw new ErrorCorreo('No se pudo buscar en el correo.');
    const uids = [];
    for (const l of r.sin) { const m = /^\* SEARCH ?(.*)$/i.exec(l); if (m) for (const n of m[1].split(' ')) if (/^\d+$/.test(n)) uids.push(+n); }
    return uids;
  }
  async traer(uids, items, lits) {
    const r = await this.cmd('UID FETCH ', uids.join(','), ' (', items, ')');
    if (!r.ok) throw new ErrorCorreo('No se pudieron leer los correos.');
    return parseFetch(r.sin, r.lits);
  }
  async marcar(uid, signo, flag) {
    const r = await this.cmd('UID STORE ', String(uid), ' ', signo, 'FLAGS.SILENT (', flag, ')');
    if (!r.ok) throw new ErrorCorreo('No se pudo cambiar la marca del correo.');
  }
  async mover(uid, destino) {
    if (this.cap.includes(' MOVE')) {
      const r = await this.cmd('UID MOVE ', String(uid), ' ', qs(destino));
      if (!r.ok) throw new ErrorCorreo('No se pudo mover el correo.');
      return;
    }
    const c = await this.cmd('UID COPY ', String(uid), ' ', qs(destino));
    if (!c.ok) throw new ErrorCorreo('No se pudo mover el correo.');
    await this.eliminar(uid);
  }
  async eliminar(uid) {
    await this.marcar(uid, '+', '\\Deleted');
    await this.cmd(this.cap.includes('UIDPLUS') ? 'UID EXPUNGE ' + String(uid) : 'EXPUNGE');
  }
  async agregar(carpeta, flags, bytes) {
    const r = await this.cmd('APPEND ', qs(carpeta), flags ? ' (' + flags + ')' : '', ' ', { lit: bytes });
    return r.ok;
  }
  async cerrar() { try { await this.f.escribir('F' + (++this.n) + ' LOGOUT\r\n'); } catch (e) { /* ya cerrada */ } this.f.cerrar(); }
}
function parseFetch(sin, lits) {
  const out = [];
  for (const l of sin) {
    if (!/^\* \d+ FETCH /i.test(l)) continue;
    const uid = /\bUID (\d+)/i.exec(l);
    if (!uid) continue;
    const fl = /\bFLAGS \(([^)]*)\)/i.exec(l), fe = /\bINTERNALDATE "([^"]+)"/i.exec(l), ta = /\bRFC822\.SIZE (\d+)/i.exec(l);
    const li = /\bBODY\[[^\]]*\](?:<\d+>)?\s+\u0000(\d+)\u0000/.exec(l);
    out.push({ uid: +uid[1], flags: fl ? fl[1].split(/\s+/).filter(Boolean) : [], fecha: fe ? isoDe(fe[1]) : null, tam: ta ? +ta[1] : 0, cuerpo: li ? lits[+li[1]] : '' });
  }
  return out;
}

/* ---------- criterios de búsqueda ---------- */
function criterio(carpeta, cuenta, q) {
  const dir = (CUENTAS[cuenta] || {}).dir || DOMINIO;
  const partes = []; let utf8 = false;
  partes.push(carpeta === 'sent' ? 'FROM ' + qs(dir) : 'OR TO ' + qs(dir) + ' CC ' + qs(dir));
  if (carpeta === 'starred') partes.push(' FLAGGED');
  if (q) {
    if (/^[\x20-\x7e]*$/.test(q)) partes.push(' TEXT ' + qs(q));
    else { utf8 = true; partes.push(' TEXT ', { lit: enc.encode(q) }); }
  }
  return { partes, utf8 };
}
function cuentaDe(cab, saliente) {
  const lista = (saliente ? dirs(cab.from) : [...dirs(cab.to), ...dirs(cab.cc)]).map((d) => d.correo);
  for (const [k, v] of Object.entries(CUENTAS)) if (lista.includes(v.dir)) return k;
  return '';
}
const nombreCarpeta = (mapa, c) => (c === 'starred' ? mapa.inbox : mapa[c]);

/* ---------- envío (SMTP) ---------- */
class Smtp {
  constructor(abrir) { this.abrir = abrir; }
  async resp() {
    const txt = []; let l;
    for (;;) { l = await this.f.linea(); txt.push(l); if (/^\d{3} /.test(l) || l.length < 4) break; }
    return { codigo: +l.slice(0, 3), txt };
  }
  async esperar(ok) {
    const r = await this.resp();
    if (!ok.includes(r.codigo)) throw new ErrorCorreo('iCloud respondió: ' + r.txt.join(' ').replace(/\s+/g, ' ').slice(0, 220));
    return r;
  }
  async decir(l, ok) { await this.f.escribir(l + '\r\n'); return this.esperar(ok); }
  async conectar(usuario, clave) {
    this.f = new Flujo(this.abrir(SMTP_HOST, SMTP_PORT, 'starttls'));
    await this.esperar([220]);
    await this.decir('EHLO ' + DOMINIO, [250]);
    await this.decir('STARTTLS', [220]);
    this.f = this.f.subirTls();
    await this.decir('EHLO ' + DOMINIO, [250]);
    try { await this.decir('AUTH PLAIN ' + b64(enc.encode('\0' + usuario + '\0' + clave)), [235]); }
    catch (e) { throw new ErrorCorreo('iCloud no aceptó el usuario o la contraseña de app para enviar. Revisa ICLOUD_USUARIO (tu dirección @icloud.com completa) e ICLOUD_CLAVE.'); }
  }
  async enviar(de, para, mensaje) {
    await this.decir('MAIL FROM:<' + de + '>', [250]);
    for (const p of para) await this.decir('RCPT TO:<' + p + '>', [250, 251]);
    await this.decir('DATA', [354]);
    const cuerpo = mensaje.replace(/\r\n\./g, '\r\n..').replace(/^\./, '..');
    await this.f.escribir(cuerpo + (cuerpo.endsWith('\r\n') ? '' : '\r\n') + '.\r\n');
    await this.esperar([250]);
  }
  async cerrar() { try { await this.f.escribir('QUIT\r\n'); } catch (e) { /* ya cerrada */ } try { this.f.cerrar(); } catch (e) { /* ya cerrada */ } }
}
const RE_DIR = /^[^\s<>"',;()\\]+@[^\s<>"',;()\\]+\.[^\s<>"',;()\\]+$/;
const PERMITIDAS = new Set(['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'blockquote', 'a', 'h1', 'h2', 'h3']);
function limpiarHtml(h) {
  return String(h || '').slice(0, 400000).replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (m, tag, attrs) => {
      tag = tag.toLowerCase();
      if (!PERMITIDAS.has(tag)) return '';
      if (m[1] === '/') return '</' + tag + '>';
      if (tag === 'a') {
        const x = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs); const u = x ? (x[1] || x[2] || '').trim() : '';
        return /^(https?:|mailto:)/i.test(u) ? '<a href="' + u.replace(/"/g, '&quot;') + '">' : '<a>';
      }
      return '<' + tag + '>';
    });
}
function armarMensaje({ cuenta, para, cc, asunto, texto, html, enRespuestaA, referencias }) {
  const c = CUENTAS[cuenta];
  const fb = 'faro' + crypto.randomUUID().replace(/-/g, '');
  const cab = [
    'From: ' + codificaCab(c.nombre).replace(/^([^=].*)$/, '"$1"') + ' <' + c.dir + '>',
    'To: ' + para.join(', '),
  ];
  if (cc.length) cab.push('Cc: ' + cc.join(', '));
  cab.push('Subject: ' + codificaCab(asunto), 'Date: ' + new Date().toUTCString(), 'Message-ID: <' + crypto.randomUUID() + '@' + DOMINIO + '>', 'MIME-Version: 1.0');
  if (enRespuestaA) { cab.push('In-Reply-To: ' + enRespuestaA); cab.push('References: ' + (referencias ? referencias + ' ' : '') + enRespuestaA); }
  cab.push('Content-Type: multipart/alternative; boundary="' + fb + '"');
  const parte = (tipo, contenido) => '--' + fb + '\r\nContent-Type: ' + tipo + '; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n' + b64Lineas(enc.encode(contenido)) + '\r\n';
  const htmlFinal = '<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55">' + html + '</div>';
  return cab.join('\r\n') + '\r\n\r\n' + parte('text/plain', texto.replace(/\r?\n/g, '\r\n')) + parte('text/html', htmlFinal) + '--' + fb + '--\r\n';
}

/* ---------- respuestas HTTP y seguridad ---------- */
function cors(request, env, extra = {}) {
  const h = new Headers(extra);
  const o = request.headers.get('Origin') || '';
  if (String(cfg(env, 'ORIGENES')).split(',').map((x) => x.trim()).filter(Boolean).includes(o)) {
    h.set('Access-Control-Allow-Origin', o); h.set('Vary', 'Origin');
    h.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    h.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    h.set('Access-Control-Max-Age', '86400');
  }
  return h;
}
const json = (request, env, data, status = 200) => new Response(JSON.stringify(data), { status, headers: cors(request, env, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }) });
const err = (request, env, msg, status = 400) => json(request, env, { error: msg }, status);
function aalDelToken(tok) { try { return JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal || 'aal1'; } catch (e) { return 'aal1'; } }
const CACHE_ADMIN = new Map();
async function esAdmin(request, env) {
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
  if (!m) return false;
  const tok = m[1], hasta = CACHE_ADMIN.get(tok);
  if (hasta && hasta > Date.now()) return true;
  let r;
  try { r = await fetch(cfg(env, 'SUPABASE_URL') + '/auth/v1/user', { headers: { apikey: cfg(env, 'SUPABASE_KEY'), Authorization: 'Bearer ' + tok } }); } catch (e) { return false; }
  if (!r.ok) return false;
  const u = await r.json().catch(() => ({}));
  const correoOk = !!u.email && String(u.email).toLowerCase() === String(cfg(env, 'ADMIN_EMAIL')).toLowerCase();
  const tieneCodigo = Array.isArray(u.factors) && u.factors.some((f) => f.factor_type === 'totp' && f.status === 'verified');
  const ok = correoOk && (!tieneCodigo || aalDelToken(tok) === 'aal2');
  if (ok) { if (CACHE_ADMIN.size > 50) CACHE_ADMIN.clear(); CACHE_ADMIN.set(tok, Date.now() + 60000); }
  return ok;
}

/* ---------- operaciones ---------- */
const cuentaOk = (v) => (typeof v === 'string' && Object.hasOwn(CUENTAS, v) ? v : '');
const CARPETAS_OK = ['inbox', 'starred', 'sent', 'archive', 'trash', 'junk'];
const soloUid = (v) => { if (!/^\d{1,12}$/.test(String(v))) throw new ErrorDatos('Correo no válido.'); return String(v); };
const carpetaOk = (v) => { if (!CARPETAS_OK.includes(v)) throw new ErrorDatos('Carpeta no válida.'); return v; };

async function conImap(env, abrir, fn) {
  const im = await Imap.abrir(abrir);
  try { await im.login(env.ICLOUD_USUARIO, env.ICLOUD_CLAVE); return await fn(im); } finally { await im.cerrar(); }
}
async function opEstado(env, abrir, b) {
  const r = await conImap(env, abrir, async (im) => {
    const mapa = await im.carpetas();
    const s = await im.cmd('STATUS ', qs('INBOX'), ' (MESSAGES UNSEEN)');
    const st = /MESSAGES (\d+) UNSEEN (\d+)/i.exec(s.sin.join(' ')) || [];
    return { carpetas: mapa, mensajes: +st[1] || 0, sinLeer: +st[2] || 0 };
  });
  let smtp = null;
  if (b.smtp) { const s = new Smtp(abrir); try { await s.conectar(env.ICLOUD_USUARIO, env.ICLOUD_CLAVE); smtp = true; } finally { await s.cerrar(); } }
  return { ok: true, lectura: true, envio: smtp, cuentas: Object.fromEntries(Object.entries(CUENTAS).map(([k, v]) => [k, v.dir])), ...r };
}
async function opLista(env, abrir, b) {
  const carpeta = carpetaOk(String(b.carpeta || 'inbox')); const cuenta = cuentaOk(b.cuenta);
  const q = String(b.q || '').replace(/[\r\n\0]+/g, ' ').trim().slice(0, 100);
  const pagina = Math.max(0, Math.min(200, parseInt(b.pagina, 10) || 0));
  return conImap(env, abrir, async (im) => {
    const mapa = await im.carpetas();
    await im.seleccionar(nombreCarpeta(mapa, carpeta));
    const c = criterio(carpeta, cuenta, q);
    const uids = (await im.buscar(c.partes, c.utf8)).sort((x, y) => y - x);
    const pag = uids.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
    let mensajes = [];
    if (pag.length) {
      const filas = await im.traer(pag, 'UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT MESSAGE-ID)]');
      mensajes = filas.sort((x, y) => y.uid - x.uid).map((f) => {
        const cab = parseCab(f.cuerpo); const de = dirs(cab.from)[0] || { nombre: '', correo: '' };
        return {
          uid: f.uid, carpeta, cuenta: cuentaDe(cab, carpeta === 'sent'), de, para: dirs(cab.to), asunto: cabTexto(cab.subject) || '(sin asunto)',
          fecha: f.fecha, leido: f.flags.some((x) => x.toLowerCase() === '\\seen'), destacado: f.flags.some((x) => x.toLowerCase() === '\\flagged'), tam: f.tam,
        };
      });
    }
    let sinLeer = null;
    if (carpeta === 'inbox' && !q) { const cu = criterio('inbox', cuenta, ''); sinLeer = (await im.buscar([...cu.partes, ' UNSEEN'], false)).length; }
    return { ok: true, total: uids.length, pagina, hayMas: (pagina + 1) * POR_PAGINA < uids.length, mensajes, sinLeer };
  });
}
async function opMensaje(env, abrir, b) {
  const carpeta = carpetaOk(String(b.carpeta || 'inbox')); const uid = soloUid(b.uid);
  return conImap(env, abrir, async (im) => {
    const mapa = await im.carpetas();
    await im.seleccionar(nombreCarpeta(mapa, carpeta));
    const filas = await im.traer([uid], 'UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[]<0.' + MAX_CUERPO + '>');
    const f = filas[0];
    if (!f || !f.cuerpo) throw new ErrorCorreo('Ese correo ya no está en la carpeta.');
    const m = leerMensajeCompleto(f.cuerpo);
    const leido = f.flags.some((x) => x.toLowerCase() === '\\seen');
    if (b.marcar !== false && !leido) await im.marcar(uid, '+', '\\Seen');
    const cab = m.cab;
    return {
      ok: true, uid: f.uid, carpeta, fecha: f.fecha, asunto: cabTexto(cab.subject) || '(sin asunto)', de: dirs(cab.from)[0] || { nombre: '', correo: '' },
      para: dirs(cab.to), cc: dirs(cab.cc), idMensaje: /^<[^<>\s]{1,200}>$/.test(cab['message-id'] || '') ? cab['message-id'] : '', referencias: (cab.references || '').slice(0, 1000),
      cuerpo: m.cuerpo, adjuntos: m.adjuntos, recortado: f.tam > MAX_CUERPO, destacado: f.flags.some((x) => x.toLowerCase() === '\\flagged'), cuenta: cuentaDe(cab, carpeta === 'sent'),
    };
  });
}
async function opAccion(env, abrir, b) {
  const carpeta = carpetaOk(String(b.carpeta || 'inbox')); const uid = soloUid(b.uid); const a = String(b.accion || '');
  return conImap(env, abrir, async (im) => {
    const mapa = await im.carpetas();
    await im.seleccionar(nombreCarpeta(mapa, carpeta));
    if (a === 'leido') await im.marcar(uid, '+', '\\Seen');
    else if (a === 'noleido') await im.marcar(uid, '-', '\\Seen');
    else if (a === 'destacar') await im.marcar(uid, '+', '\\Flagged');
    else if (a === 'quitar_destacado') await im.marcar(uid, '-', '\\Flagged');
    else if (a === 'archivar') await im.mover(uid, mapa.archive);
    else if (a === 'papelera') { if (carpeta === 'trash') await im.eliminar(uid); else await im.mover(uid, mapa.trash); }
    else if (a === 'restaurar') await im.mover(uid, mapa.inbox);
    else throw new ErrorDatos('Acción no válida.');
    return { ok: true };
  });
}
async function opEnviar(env, abrir, b) {
  const cuenta = cuentaOk(b.cuenta) || null;
  if (!cuenta) throw new ErrorDatos('Elige desde qué dirección enviar.');
  const lista = (v) => String(v || '').split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
  const para = lista(b.para), cc = lista(b.cc);
  if (!para.length) throw new ErrorDatos('Escribe al menos un destinatario.');
  if (para.length + cc.length > 20) throw new ErrorDatos('Máximo 20 destinatarios por correo.');
  for (const d of [...para, ...cc]) if (!RE_DIR.test(d)) throw new ErrorDatos('Esta dirección no es válida: ' + d.slice(0, 60));
  const asunto = String(b.asunto || '').replace(/[\r\n]+/g, ' ').slice(0, 300) || '(sin asunto)';
  const texto = String(b.texto || '').slice(0, 200000), html = limpiarHtml(b.html || texto.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>'));
  if (!texto.trim() && !html.trim()) throw new ErrorDatos('El mensaje está vacío.');
  const enRespuestaA = /^<[^<>\s]{1,200}>$/.test(b.enRespuestaA || '') ? b.enRespuestaA : '';
  const referencias = String(b.referencias || '').split(/\s+/).filter((x) => /^<[^<>\s]{1,200}>$/.test(x)).slice(-10).join(' ');
  const msg = armarMensaje({ cuenta, para, cc, asunto, texto, html, enRespuestaA, referencias });
  const s = new Smtp(abrir);
  try { await s.conectar(env.ICLOUD_USUARIO, env.ICLOUD_CLAVE); await s.enviar(CUENTAS[cuenta].dir, [...para, ...cc], msg); } finally { await s.cerrar(); }
  // iCloud no guarda solo lo enviado por SMTP: dejamos la copia en "Enviados" como hace Apple Mail
  let guardado = false;
  try { guardado = await conImap(env, abrir, async (im) => im.agregar((await im.carpetas()).sent, '\\Seen', enc.encode(msg))); } catch (e) { guardado = false; }
  return { ok: true, guardado };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ruta = url.pathname.replace(/\/+$/, '') || '/';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) });
    if (ruta === '/') return json(request, env, { servicio: 'faro-correo', ok: true });
    if (!ruta.startsWith('/correo/')) return err(request, env, 'No existe', 404);
    if (request.method !== 'POST') return err(request, env, 'Método no permitido', 405);
    if (!(await esAdmin(request, env))) return err(request, env, 'Sin permiso', 401);
    if (!env.ICLOUD_USUARIO || !env.ICLOUD_CLAVE) return err(request, env, 'Faltan los secretos ICLOUD_USUARIO e ICLOUD_CLAVE en el Worker faro-correo.', 503);
    let b = {};
    try { b = await request.json(); } catch (e) { b = {}; }
    const ops = { '/correo/estado': opEstado, '/correo/lista': opLista, '/correo/mensaje': opMensaje, '/correo/accion': opAccion, '/correo/enviar': opEnviar };
    const op = ops[ruta];
    if (!op) return err(request, env, 'No existe', 404);
    try { return json(request, env, await op(env, abrirCF, b)); }
    catch (e) { return err(request, env, e instanceof ErrorCorreo ? e.message : 'No se pudo completar la operación de correo.', e instanceof ErrorDatos ? 400 : 502); }
  },
};
