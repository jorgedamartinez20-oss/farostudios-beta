/* Faro Workspace · Music Pro
 * Panel del trabajo de fin de semana en la tienda de instrumentos (Music Pro · Pradera Zona 10).
 *   1) Corte del día: captura cada factura (recibo, nombre, monto, efectivo / tarjeta / depósito y productos),
 *      y dibuja el CORTE DE CAJA con el mismo esquema que el de Numbers, listo para guardar como PNG tamaño oficio.
 *   2) Para el Drive: el texto del inventario en dos bloques (fecha + código · cantidad + FACTURADO + recibo).
 *   3) Ventas y comisión: ventas por fecha y por día, y comisión del mes (ventas × % − «no corresponde»).
 * Base de datos: sql/musicpro.sql (solo el director). Uso desde admin.html:
 *   FaroMusicPro.iniciar(contenedor, ctx)      ctx = { api, toast, errText }
 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, a, ...k) => {
    const e = document.createElement(t);
    for (const n in (a || {})) { const v = a[n]; if (v == null || v === false) continue; if (n === 'class') e.className = v; else if (n === 'style') e.style.cssText = v; else if (n.startsWith('on')) e.addEventListener(n.slice(2), v); else e.setAttribute(n, v === true ? '' : v); }
    k.flat(9).forEach(c => { if (c == null || c === false) return; e.append(c.nodeType ? c : document.createTextNode(c)); });
    return e;
  };
  const IC = {
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v.01M18 15v.01"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',
    bank: '<path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    img: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/>',
    down: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>', left: '<path d="m15 5-7 7 7 7"/>', right: '<path d="m9 5 7 7-7 7"/>',
    sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
    trend: '<path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/>', coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5C9.5 8.5 10.6 8 12 8s2.5.6 2.5 1.6c0 2.4-5 1.2-5 3.8 0 1 1.1 1.6 2.5 1.6s2.5-.5 2.5-1.5"/>',
    pct: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', warn: '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.5v.01"/>', box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2.5"/><path d="M16 2v4M8 2v4M3 10h18"/>'
  };
  const ico = k => { const s = el('span', { class: 'mp-i' }); s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[k] || '') + '</svg>'; return s; };
  const btn = (txt, k, fn, cls, title) => el('button', { type: 'button', class: 'btn btn-sm ' + (cls || 'btn-ghost'), onclick: fn, title: title || null }, k ? ico(k) : null, txt ? ' ' + txt : null);

  /* ---------- fechas y dinero ---------- */
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const DIA3 = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });
  const parte = iso => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d, dow: new Date(y, m - 1, d, 12).getDay() }; };
  const mover = (iso, n) => { const p = parte(iso); const d = new Date(p.y, p.m - 1, p.d + n, 12); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const fCorta = iso => { const p = parte(iso); return String(p.d).padStart(2, '0') + '/' + String(p.m).padStart(2, '0') + '/' + String(p.y).slice(2); };
  const fLarga = iso => { const p = parte(iso); return DIA[p.dow] + ', ' + p.d + ' de ' + MES[p.m - 1] + ' de ' + p.y; };
  const fDrive = iso => { const p = parte(iso); return DIA3[p.dow] + ', ' + p.d + '/' + MES3[p.m - 1] + '/' + String(p.y).slice(2); };
  const mesDe = iso => iso.slice(0, 7);
  const sumaMes = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1, 12); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const nombreMes = ym => { const [y, m] = ym.split('-').map(Number); return MES[m - 1] + ' ' + y; };
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[Qq,\s]/g, '')); return isFinite(n) ? n : 0; };
  const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const money = n => r2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const Q = n => 'Q ' + money(n);

  const DEN = [200, 100, 50, 20, 10, 5, 1];
  const S = {
    vista: 'corte', fecha: hoy(), mes: mesDe(hoy()),
    facs: [], egs: [], corte: null, saldoAuto: 0, prevInfo: '',
    mesFacs: [], mesCortes: [], mesEgs: [], cfg: { porcentaje: '3' }, nc: '',
    form: null, falta: false, error: '', cargando: false, confirmar: null
  };
  let host = null, ctx = null, css1 = false, logoImg = null, logoCargando = false, tok = 0;

  const formVacio = () => ({ id: null, recibo: '', nombre: '', metodo: 'tarjeta', monto: '', ref: '', obs: '', prods: [{ codigo: '', cant: 1 }] });

  /* ---------- acceso a datos ---------- */
  const get = async t => { const r = await ctx.api('/rest/v1/' + t); if (!r.ok) { const e = new Error(await ctx.errText(r)); e.status = r.status; throw e; } return r.json(); };
  const send = async (method, path, body, prefer) => {
    const r = await ctx.api('/rest/v1/' + path, { method, body, headers: { Prefer: prefer || 'return=representation' } });
    if (!r.ok) throw new Error(await ctx.errText(r));
    return method === 'DELETE' ? null : r.json();
  };

  /* ---------- cálculos ---------- */
  const totalesDe = (facs, egs, saldo) => {
    const ef = r2(facs.reduce((a, f) => a + num(f.efectivo), 0)), ta = r2(facs.reduce((a, f) => a + num(f.tarjeta), 0)), de = r2(facs.reduce((a, f) => a + num(f.deposito), 0));
    const eg = r2(egs.reduce((a, e) => a + num(e.cantidad), 0));
    return { ef, ta, de, eg, ventas: r2(ef + ta + de), ingresoEf: r2(ef + saldo), total: r2(saldo + ef - eg) };
  };
  const contado = b => { b = b || {}; return r2(DEN.reduce((a, d) => a + d * num(b[d]), 0) + num(b.mon) + num(b.extra)); };
  const ordenar = (a, b) => (a.creado || '').localeCompare(b.creado || '');

  async function cargar(quiet) {
    const mi = ++tok;
    if (!quiet) { S.cargando = true; pintar(); }
    try {
      const f = S.fecha, ym = mesDe(f), ym2 = S.vista === 'ventas' ? S.mes : ym;
      const desde = ym2 + '-01', hasta = sumaMes(ym2, 1) + '-01';
      const [facs, egs, cortes, cfg, mf, mc, me, prev] = await Promise.all([
        get('mp_facturas?select=*&fecha=eq.' + f + '&order=creado.asc'),
        get('mp_egresos?select=*&fecha=eq.' + f + '&order=creado.asc'),
        get('mp_cortes?select=*&fecha=eq.' + f),
        get('mp_config?select=*'),
        get('mp_facturas?select=*&fecha=gte.' + desde + '&fecha=lt.' + hasta + '&order=fecha.asc,creado.asc&limit=5000'),
        get('mp_cortes?select=*&fecha=gte.' + desde + '&fecha=lt.' + hasta + '&order=fecha.asc'),
        get('mp_egresos?select=*&fecha=gte.' + desde + '&fecha=lt.' + hasta + '&limit=5000'),
        get('mp_cortes?select=*&fecha=lt.' + f + '&order=fecha.desc&limit=1')
      ]);
      if (mi !== tok) return;
      S.facs = facs; S.egs = egs; S.corte = cortes[0] || null;
      S.cfg = { porcentaje: '3' }; cfg.forEach(c => { S.cfg[c.clave] = c.valor; });
      S.mesFacs = mf; S.mesCortes = mc; S.mesEgs = me;
      /* saldo inicial automático: lo que quedó en caja el día anterior (conteo si lo hay, si no el total del sistema) */
      S.saldoAuto = 0; S.prevInfo = '';
      if (prev[0]) {
        const pf = await get('mp_facturas?select=efectivo,tarjeta,deposito&fecha=eq.' + prev[0].fecha), pe = await get('mp_egresos?select=cantidad&fecha=eq.' + prev[0].fecha);
        if (mi !== tok) return;
        const t = totalesDe(pf, pe, num(prev[0].saldo_inicial)), c = contado(prev[0].billetes);
        S.saldoAuto = c > 0 ? c : t.total;
        S.prevInfo = (c > 0 ? 'conteo' : 'total en caja') + ' del ' + fCorta(prev[0].fecha);
      }
      S.falta = false; S.error = '';
      if (!S.form) { S.form = formVacio(); S.form.recibo = sugerirRecibo(); }
    } catch (e) {
      if (mi !== tok) return;
      S.falta = true; S.error = e.message || '';
    }
    S.cargando = false; pintar();
  }
  const saldoActual = () => S.corte ? num(S.corte.saldo_inicial) : S.saldoAuto;
  function sugerirRecibo() {
    const nums = (S.facs.length ? S.facs : S.mesFacs.slice(-1)).map(f => parseInt(f.recibo, 10)).filter(n => isFinite(n));
    if (!nums.length) return '';
    return String(Math.max(...nums) + 1);
  }
  async function asegurarCorte() {
    if (S.corte) return;
    const r = await send('POST', 'mp_cortes?on_conflict=fecha', { fecha: S.fecha, saldo_inicial: S.saldoAuto }, 'resolution=merge-duplicates,return=representation');
    S.corte = r[0];
  }
  async function guardarSaldo(v) {
    try {
      const r = await send('POST', 'mp_cortes?on_conflict=fecha', { fecha: S.fecha, saldo_inicial: r2(num(v)), billetes: (S.corte && S.corte.billetes) || {}, notas: (S.corte && S.corte.notas) || '' }, 'resolution=merge-duplicates,return=representation');
      S.corte = r[0]; ctx.toast('Saldo inicial guardado'); await cargar(true);
    } catch (e) { ctx.toast(e.message); }
  }
  async function guardarBilletes(b) {
    try {
      await asegurarCorte();
      const r = await send('PATCH', 'mp_cortes?fecha=eq.' + S.fecha, { billetes: b });
      S.corte = r[0]; await cargar(true);
    } catch (e) { ctx.toast(e.message); }
  }

  /* ---------- factura: guardar, editar, borrar ---------- */
  function leerForm() {
    const f = S.form, monto = r2(num(f.monto));
    return {
      fecha: S.fecha, recibo: f.recibo.trim(), nombre: f.nombre.trim().toUpperCase(),
      efectivo: f.metodo === 'efectivo' ? monto : 0, tarjeta: f.metodo === 'tarjeta' ? monto : 0, deposito: f.metodo === 'deposito' ? monto : 0,
      referencia: f.metodo === 'deposito' ? f.ref.trim() : '', observaciones: f.obs.trim(),
      productos: f.prods.map(p => ({ codigo: String(p.codigo || '').trim(), cant: Math.max(1, parseInt(p.cant, 10) || 1) })).filter(p => p.codigo)
    };
  }
  async function guardarFactura() {
    const d = leerForm();
    if (!d.recibo) { ctx.toast('Falta el número de recibo'); return; }
    if (!(num(S.form.monto) > 0)) { ctx.toast('Falta el monto de la factura'); return; }
    if (!d.nombre) d.nombre = 'CF';
    try {
      await asegurarCorte();
      if (S.form.id) await send('PATCH', 'mp_facturas?id=eq.' + S.form.id, d); else await send('POST', 'mp_facturas', d);
      ctx.toast(S.form.id ? 'Factura actualizada' : 'Factura agregada');
      S.form = formVacio(); await cargar(true); S.form.recibo = sugerirRecibo(); pintar();
      const n = $('.mp-fnombre', host); n && n.focus();
    } catch (e) { ctx.toast(e.message); }
  }
  function editarFactura(f) {
    const metodo = num(f.efectivo) > 0 ? 'efectivo' : num(f.deposito) > 0 ? 'deposito' : 'tarjeta';
    S.form = { id: f.id, recibo: f.recibo, nombre: f.nombre, metodo, monto: String(num(f.efectivo) + num(f.tarjeta) + num(f.deposito)), ref: f.referencia || '', obs: f.observaciones || '', prods: (f.productos && f.productos.length ? f.productos : [{ codigo: '', cant: 1 }]).map(p => ({ codigo: p.codigo, cant: p.cant })) };
    pintar(); window.scrollTo({ top: host.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
  }
  async function borrar(tabla, id, clave) {
    if (S.confirmar !== clave) { S.confirmar = clave; pintar(); setTimeout(() => { if (S.confirmar === clave) { S.confirmar = null; pintar(); } }, 3500); return; }
    S.confirmar = null;
    try { await send('DELETE', tabla + '?id=eq.' + id); ctx.toast('Eliminado'); await cargar(true); S.form && !S.form.id && !S.form.recibo && (S.form.recibo = sugerirRecibo()); pintar(); } catch (e) { ctx.toast(e.message); }
  }
  async function agregarEgreso(d) {
    try { await asegurarCorte(); await send('POST', 'mp_egresos', Object.assign({ fecha: S.fecha }, d)); ctx.toast('Egreso agregado'); await cargar(true); } catch (e) { ctx.toast(e.message); }
  }

  /* ---------- productos pegados desde la factura de la web ---------- */
  function parsearProductos(txt) {
    return String(txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
      const c = l.split('\t').map(x => x.trim());
      let cant = 1; for (let i = 1; i < c.length; i++) if (/^\d{1,3}$/.test(c[i])) { cant = parseInt(c[i], 10); break; }
      return { codigo: c[0], cant };
    }).filter(p => p.codigo);
  }

  /* ---------- texto para el Drive (2 bloques) ---------- */
  function textoDrive(facs, fecha) {
    const b1 = [], b2 = [], sin = [];
    facs.forEach(f => {
      const ps = (f.productos || []).filter(p => p.codigo);
      if (!ps.length) { sin.push(f.recibo); return; }
      ps.forEach(p => { b1.push(fDrive(fecha) + '\t' + p.codigo); b2.push('\t' + p.cant + '\t\tFACTURADO\tR-' + f.recibo); });
    });
    return { b1: b1.join('\n'), b2: b2.join('\n'), n: b1.length, sin };
  }
  const copiar = async (t, ok) => {
    try { await navigator.clipboard.writeText(t); ctx.toast(ok || 'Copiado'); }
    catch (e) { const ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); ctx.toast(ok || 'Copiado'); } catch (x) { ctx.toast('No se pudo copiar'); } ta.remove(); }
  };

  /* =====================================================================
   *  CORTE DE CAJA · dibujo (mismo esquema que Numbers) · espacio 2000 × 1307.7 → PNG 3900 × 2550 (oficio horizontal, 13 × 8.5 in a 300 ppp)
   * ===================================================================== */
  const W = 2000, H = 2550 / 1.95, PX = 1.95;
  const K2 = (H - 60 - 244) / (1030 - 244);
  const Y = y => y < 244 ? y : 244 + (y - 244) * K2;
  const FONT = "'Lato','Helvetica Neue',Arial,sans-serif";
  function dibujar(cv, d) {
    const c = cv.getContext('2d');
    cv.width = Math.round(W * PX); cv.height = Math.round(H * PX);
    c.setTransform(PX, 0, 0, PX, 0, 0);
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    c.lineJoin = 'miter'; c.textBaseline = 'middle';
    const caja = (x1, y1, x2, y2, fill, lw) => { const a = Y(y1), b = Y(y2); if (fill) { c.fillStyle = fill; c.fillRect(x1, a, x2 - x1, b - a); } c.strokeStyle = '#000'; c.lineWidth = lw || 1.4; c.strokeRect(x1, a, x2 - x1, b - a); };
    const txt = (t, x, y, o) => { o = o || {}; c.font = (o.w || '400') + ' ' + (o.s || 19) + 'px ' + FONT; c.fillStyle = o.c || '#000'; c.textAlign = o.a || 'center'; c.fillText(t, x, Y(y)); };
    const monto = (v, x1, x2, y, o) => { o = o || {}; txt('Q', x1 + (o.pad || 10), y, Object.assign({}, o, { a: 'left' })); txt(v, x2 - (o.pad || 12), y, Object.assign({}, o, { a: 'right' })); };
    const dash = v => v ? money(v) : '-';

    /* marco, logo, título */
    c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeRect(60, 70, 1880, H - 60 - 70);
    if (logoImg) c.drawImage(logoImg, 240, 96, 327, 126);
    txt('CORTE DE CAJA - PRADERA ZONA 10', 1000, 120, { s: 31, w: '700' });
    txt(fLarga(d.fecha), 1000, 163, { s: 29 });

    /* saldo inicial */
    caja(1535, 205, 1722, 231, '#FBEFA6'); caja(1722, 205, 1915, 231, '#FBEFA6');
    txt('SALDO INICIAL', 1628, 218, { s: 19 }); monto(money(d.saldo), 1722, 1915, 218);

    /* bandas */
    caja(90, 244, 816, 269, '#C6DBB5'); txt('INGRESOS', 453, 257, { w: '700' });
    caja(816, 244, 1915, 269, '#F8E4D6'); txt('MODALIDAD', 1365, 257, { w: '700' });
    const COL = [90, 135, 229, 340, 816, 966, 1149, 1341, 1535, 1915];
    const HD = ['NO.', 'FECHA', 'RECIBO', 'NOMBRE', 'EFECTIVO', 'TERJETA DE CRÉDITO', 'DEPÓSITO', 'REF. TRANSACCIÓN', 'OBSERVACIONES'];
    HD.forEach((h, i) => { caja(COL[i], 269, COL[i + 1], 295); txt(h, (COL[i] + COL[i + 1]) / 2, 282, { w: '700', s: i === 5 ? 18 : 19 }); });

    /* ingresos · 15 renglones (si hay más, se aprietan) */
    const N = Math.max(15, d.facs.length), top = 295, bot = 677, rh = (bot - top) / N;
    for (let i = 0; i < N; i++) {
      const y1 = top + i * rh, y2 = y1 + rh, ym = (y1 + y2) / 2, f = d.facs[i];
      for (let j = 0; j < 9; j++) caja(COL[j], y1, COL[j + 1], y2);
      if (!f) continue;
      const fs = N > 15 ? Math.max(12, 19 * 15 / N) : 19;
      txt(String(i + 1), (COL[0] + COL[1]) / 2, ym, { s: fs }); txt(fCorta(d.fecha), (COL[1] + COL[2]) / 2, ym, { s: fs });
      txt(f.recibo, (COL[2] + COL[3]) / 2, ym, { s: fs }); { const nm = String(f.nombre || '').toUpperCase(); c.font = '400 ' + fs + 'px ' + FONT; const aw = c.measureText(nm).width, mx = COL[4] - COL[3] - 24; txt(nm, (COL[3] + COL[4]) / 2, ym, { s: aw > mx ? fs * mx / aw : fs, c: '#222' }); }
      if (num(f.efectivo)) monto(money(f.efectivo), COL[4], COL[5], ym, { s: fs });
      if (num(f.tarjeta)) monto(money(f.tarjeta), COL[5], COL[6], ym, { s: fs });
      if (num(f.deposito)) monto(money(f.deposito), COL[6], COL[7], ym, { s: fs });
      if (f.referencia) txt(f.referencia, (COL[7] + COL[8]) / 2, ym, { s: fs });
      if (f.observaciones) txt(f.observaciones, (COL[8] + COL[9]) / 2, ym, { s: fs });
    }

    /* totales de ingresos */
    const Y1 = '#FBEFA6';
    caja(816, 693, 966, 718, Y1); monto(money(d.t.ef), 816, 966, 705.5); caja(966, 693, 1149, 718, Y1); monto(money(d.t.ta), 966, 1149, 705.5);
    caja(1149, 693, 1341, 718, Y1); monto(dash(d.t.de), 1149, 1341, 705.5); caja(1341, 693, 1535, 718, Y1);
    caja(1535, 693, 1722, 718, Y1); txt('INGESO EFECTIVO', 1628, 706, { s: 17 }); caja(1722, 693, 1915, 718, Y1); monto(money(d.t.ingresoEf), 1722, 1915, 705.5);

    /* egresos */
    caja(90, 733, 966, 758, '#DCE3F0'); txt('EGRESOS', 528, 745.5, { w: '700' });
    const EC = [90, 135, 229, 340, 816, 966], EH = ['NO.', 'FECHA', 'RECIBO', 'NOMBRE', 'CANTIDAD'];
    EH.forEach((h, i) => { caja(EC[i], 758, EC[i + 1], 783); txt(h, (EC[i] + EC[i + 1]) / 2, 770.5, { w: '700' }); });
    const NE = Math.max(5, d.egs.length), et = 783, eb = 910, eh = (eb - et) / NE;
    for (let i = 0; i < NE; i++) {
      const y1 = et + i * eh, y2 = y1 + eh, ym = (y1 + y2) / 2, e = d.egs[i];
      for (let j = 0; j < 5; j++) caja(EC[j], y1, EC[j + 1], y2);
      if (!e) continue;
      const fs = NE > 5 ? Math.max(12, 19 * 5 / NE) : 19;
      txt(String(i + 1), (EC[0] + EC[1]) / 2, ym, { s: fs }); txt(fCorta(d.fecha), (EC[1] + EC[2]) / 2, ym, { s: fs });
      txt(e.recibo || '', (EC[2] + EC[3]) / 2, ym, { s: fs }); txt(String(e.nombre || '').toUpperCase(), (EC[3] + EC[4]) / 2, ym, { s: fs });
      monto(money(e.cantidad), EC[4], EC[5], ym, { s: fs });
    }

    /* ventas del día */
    caja(1149, 758, 1341, 835, '#fff'); txt('VENTAS DEL DÍA', 1245, 796.5, { s: 21 });
    caja(1341, 758, 1723, 835, '#263A63'); txt('Q', 1357, 796.5, { s: 38, c: '#fff', a: 'left' }); txt(money(d.t.ventas), 1705, 796.5, { s: 40, c: '#fff', a: 'right' });

    /* egreso efectivo y total en caja */
    caja(816, 923, 966, 948, Y1); monto(dash(d.t.eg), 816, 966, 935.5); caja(966, 923, 1149, 948, Y1); caja(1149, 923, 1341, 948, Y1); caja(1341, 923, 1535, 948, Y1);
    caja(1535, 923, 1722, 948, Y1); txt('EGRESO EFECTIVO', 1628, 936, { s: 19 }); caja(1722, 923, 1915, 948, Y1); monto(dash(d.t.eg), 1722, 1915, 935.5);
    caja(1341, 963, 1722, 1005, '#E9B28A', 3.4); txt('TOTAL EN CAJA', 1531, 984, { s: 22, w: '700' });
    caja(1722, 963, 1915, 1005, '#FBEFA6', 3.4); c.fillStyle = '#FBEFA6'; c.fillRect(1722, Y(963), 193, Y(1005) - Y(963)); c.strokeStyle = '#000'; c.lineWidth = 3.4; c.strokeRect(1722, Y(963), 193, Y(1005) - Y(963));
    txt('Q', 1738, 984, { s: 30, w: '700', a: 'left' }); txt(money(d.t.total), 1900, 984, { s: 31, w: '700', a: 'right' });
  }
  function datosCorte(fecha, facs, egs, saldo) { return { fecha, facs, egs, saldo, t: totalesDe(facs, egs, saldo) }; }
  function cargarLogo() {
    if (logoImg || logoCargando) return; logoCargando = true;
    const i = new Image(); i.onload = () => { logoImg = i; logoCargando = false; repintarCorte(); }; i.onerror = () => { logoCargando = false; }; i.src = 'musicpro-logo.png';
  }
  function repintarCorte() { const cv = $('.mp-cv', host); if (cv) dibujar(cv, datosCorte(S.fecha, S.facs, S.egs, saldoActual())); }
  function blobPNG() { const cv = $('.mp-cv', host); return new Promise(ok => cv.toBlob(ok, 'image/png')); }
  async function descargarPNG() {
    await (document.fonts && document.fonts.ready); repintarCorte();
    const b = await blobPNG(); if (!b) { ctx.toast('No se pudo crear la imagen'); return; }
    const a = el('a', { href: URL.createObjectURL(b), download: 'corte-de-caja-' + S.fecha + '.png' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    ctx.toast('Imagen guardada · tamaño oficio (3900 × 2550 px)');
  }
  async function copiarPNG() {
    try { await (document.fonts && document.fonts.ready); repintarCorte(); const b = await blobPNG(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); ctx.toast('Imagen copiada: pégala en el correo'); }
    catch (e) { ctx.toast('Tu navegador no permite copiar la imagen; usa «Guardar PNG»'); }
  }

  /* =====================================================================
   *  VISTAS
   * ===================================================================== */
  function pintar() {
    if (!host) return;
    css(); cargarLogo();
    const y = window.scrollY;
    host.innerHTML = '';
    host.append(cabecera());
    if (S.falta) { host.append(avisoFalta()); return; }
    if (S.cargando) { host.append(el('p', { class: 'muted' }, 'Cargando…')); return; }
    if (S.vista === 'corte') host.append(vistaCorte());
    else if (S.vista === 'drive') host.append(vistaDrive());
    else host.append(vistaVentas());
    window.scrollTo({ top: y });
    if (S.vista === 'corte') setTimeout(async () => { await (document.fonts && document.fonts.ready); repintarCorte(); }, 0);
  }
  function avisoFalta() {
    const falla = /relation|does not exist|mp_|42P01|PGRST205/i.test(S.error || '') || /404/.test(String(S.error));
    return el('div', { class: 'card mp-aviso' }, el('h3', {}, 'Falta un paso en Supabase'),
      el('p', { class: 'muted' }, falla ? 'Las tablas de Music Pro aún no existen. Corre sql/musicpro.sql en Supabase → SQL Editor.' : 'No se pudieron leer los datos: ' + (S.error || 'error desconocido')),
      btn('Reintentar', null, () => cargar(), 'btn-gold'));
  }
  function cabecera() {
    const tabs = [['corte', 'Corte del día', 'cash'], ['drive', 'Para el Drive', 'sheet'], ['ventas', 'Ventas y comisión', 'trend']];
    return el('div', { class: 'mp-cab' },
      el('div', { class: 'mp-tit' }, el('img', { src: 'musicpro-logo.png', alt: 'Music Pro', class: 'mp-logo' }), el('div', {}, el('h2', {}, 'Music Pro'), el('p', { class: 'muted' }, 'Trabajo de fin de semana · Pradera Zona 10'))),
      el('div', { class: 'mp-seg', role: 'tablist' }, tabs.map(([k, t, i]) => el('button', { type: 'button', role: 'tab', 'aria-pressed': String(S.vista === k), onclick: () => { S.vista = k; S.confirmar = null; k === 'ventas' ? (S.mes = mesDe(S.fecha), cargar()) : pintar(); } }, ico(i), ' ', t))));
  }
  function selectorFecha() {
    const p = parte(S.fecha), esFin = p.dow === 0 || p.dow === 6;
    const inp = el('input', { type: 'date', value: S.fecha, onchange: e => { if (e.target.value) { S.fecha = e.target.value; S.form = null; cargar(); } } });
    return el('div', { class: 'mp-fecha' },
      btn('', 'left', () => { S.fecha = mover(S.fecha, -1); S.form = null; cargar(); }, 'btn-ghost', 'Día anterior'),
      el('div', { class: 'mp-fechab' }, ico('cal'), el('b', {}, fLarga(S.fecha)), !esFin ? el('span', { class: 'mp-tag mp-amar' }, 'no es fin de semana') : null),
      btn('', 'right', () => { S.fecha = mover(S.fecha, 1); S.form = null; cargar(); }, 'btn-ghost', 'Día siguiente'),
      inp, btn('Hoy', null, () => { S.fecha = hoy(); S.form = null; cargar(); }));
  }

  /* ---------- 1 · corte del día ---------- */
  function vistaCorte() {
    const t = totalesDe(S.facs, S.egs, saldoActual());
    const w = el('div', {});
    w.append(selectorFecha());
    w.append(el('div', { class: 'mp-kpis' },
      kpi('coin', 'Ventas del día', Q(t.ventas), 'mp-k1'), kpi('cash', 'Efectivo', Q(t.ef), 'mp-k2'), kpi('card', 'Tarjeta', Q(t.ta), 'mp-k3'),
      kpi('bank', 'Depósito', Q(t.de), 'mp-k4'), kpi('box', 'Total en caja', Q(t.total), 'mp-k5')));
    const g = el('div', { class: 'mp-grid' });
    const izq = el('div', { class: 'mp-col' }); izq.append(formFactura(), listaFacturas(), bloqueSaldo(), bloqueEgresos(), bloqueBilletes());
    const der = el('div', { class: 'mp-col mp-sticky' });
    const cv = el('canvas', { class: 'mp-cv', 'aria-label': 'Corte de caja' });
    der.append(el('div', { class: 'card' }, el('h3', {}, ico('img'), ' Corte de caja · vista previa'),
      el('p', { class: 'muted' }, 'Mismo esquema que tu Numbers, en horizontal tamaño oficio. Guarda la imagen o cópiala y pégala en el correo.'), cv,
      el('div', { class: 'mp-acts' }, btn('Guardar PNG (oficio)', 'down', descargarPNG, 'btn-gold'), btn('Copiar imagen', 'copy', copiarPNG))));
    g.append(izq, der); w.append(g);
    return w;
  }
  const kpi = (i, l, v, c) => el('div', { class: 'mp-kpi ' + c }, el('span', { class: 'mp-kl' }, ico(i), ' ', l), el('b', {}, v));

  function formFactura() {
    const f = S.form || (S.form = formVacio());
    const gap = (() => { const n = parseInt(f.recibo, 10); const prev = S.facs.filter(x => x.id !== f.id).map(x => parseInt(x.recibo, 10)).filter(isFinite); if (!isFinite(n) || !prev.length || f.id) return ''; const m = Math.max(...prev); return n > m + 1 || n <= m ? 'El último recibo de hoy fue el ' + m + '. ¿Seguro que es el ' + n + '?' : ''; })();
    const inRec = el('input', { class: 'mp-frec', inputmode: 'numeric', value: f.recibo, oninput: e => { f.recibo = e.target.value; } , onchange: () => pintar() });
    const inNom = el('input', { class: 'mp-fnombre', value: f.nombre, placeholder: 'Nombre completo o CF', autocomplete: 'off', oninput: e => { f.nombre = e.target.value; } });
    const inMonto = el('input', { class: 'mp-fmonto', inputmode: 'decimal', value: f.monto, placeholder: '0.00', oninput: e => { f.monto = e.target.value; }, onkeydown: e => { if (e.key === 'Enter') guardarFactura(); } });
    const met = el('div', { class: 'mp-met' }, [['efectivo', 'Efectivo', 'cash'], ['tarjeta', 'Tarjeta', 'card'], ['deposito', 'Depósito', 'bank']].map(([k, t, i]) =>
      el('button', { type: 'button', class: 'mp-m mp-m-' + k, 'aria-pressed': String(f.metodo === k), onclick: () => { f.metodo = k; pintar(); } }, ico(i), ' ', t)));
    const prods = el('div', { class: 'mp-prods' });
    f.prods.forEach((p, i) => {
      const c = el('input', { class: 'mp-pc', value: p.codigo, placeholder: 'Código (pega aquí)', autocomplete: 'off', oninput: e => { p.codigo = e.target.value; },
        onpaste: e => {
          const t = (e.clipboardData || window.clipboardData).getData('text'); if (!/[\r\n]/.test(t.trim())) return;
          e.preventDefault(); const ps = parsearProductos(t); if (!ps.length) return; f.prods.splice(i, 1, ...ps); pintar();
        } });
      const q = el('input', { class: 'mp-pq', type: 'number', min: '1', value: p.cant, 'aria-label': 'Cantidad', oninput: e => { p.cant = e.target.value; } });
      prods.append(el('div', { class: 'mp-pr' }, el('span', { class: 'mp-pn' }, String(i + 1)), c, q, f.prods.length > 1 ? btn('', 'x', () => { f.prods.splice(i, 1); pintar(); }, 'btn-ghost', 'Quitar') : null));
    });
    return el('div', { class: 'card' },
      el('h3', {}, ico(f.id ? 'edit' : 'plus'), f.id ? ' Editando factura ' + f.recibo : ' Agregar factura'),
      el('div', { class: 'mp-f3' }, field('Recibo', inRec), field('Nombre', inNom), field('Monto (Q)', inMonto)),
      gap ? el('p', { class: 'mp-warn' }, ico('warn'), ' ', gap) : null,
      el('div', { class: 'field' }, el('label', {}, 'Forma de pago'), met),
      f.metodo === 'deposito' ? el('div', { class: 'mp-f2' }, field('Ref. transacción', el('input', { value: f.ref, oninput: e => { f.ref = e.target.value; } })), field('Observaciones', el('input', { value: f.obs, oninput: e => { f.obs = e.target.value; } }))) : field('Observaciones (opcional)', el('input', { value: f.obs, oninput: e => { f.obs = e.target.value; } })),
      el('div', { class: 'field' }, el('label', {}, 'Productos de la factura (para el Drive)'), prods,
        el('div', { class: 'mp-acts' }, btn('Agregar producto', 'plus', () => { f.prods.push({ codigo: '', cant: 1 }); pintar(); const c = host.querySelectorAll('.mp-pc'); c[c.length - 1] && c[c.length - 1].focus(); }),
          el('small', { class: 'muted' }, 'Si pegas varias líneas de la factura en un código, se reparten solas.'))),
      el('div', { class: 'mp-acts' }, btn(f.id ? 'Guardar cambios' : 'Agregar factura', 'check', guardarFactura, 'btn-gold'), f.id ? btn('Cancelar', 'x', () => { S.form = formVacio(); S.form.recibo = sugerirRecibo(); pintar(); }) : null));
  }
  const field = (l, i) => el('div', { class: 'field' }, el('label', {}, l), i);

  function listaFacturas() {
    const c = el('div', { class: 'card' }, el('h3', {}, ico('sheet'), ' Facturas de este día ', el('span', { class: 'mp-n' }, String(S.facs.length))));
    if (!S.facs.length) { c.append(el('p', { class: 'muted' }, 'Aún no hay facturas. Agrega la primera arriba.')); return c; }
    const l = el('div', { class: 'mp-lista' });
    S.facs.forEach((f, i) => {
      const k = num(f.efectivo) > 0 ? ['efectivo', 'cash', 'Efectivo', f.efectivo] : num(f.deposito) > 0 ? ['deposito', 'bank', 'Depósito', f.deposito] : ['tarjeta', 'card', 'Tarjeta', f.tarjeta];
      const ps = (f.productos || []);
      l.append(el('div', { class: 'mp-fila' + (S.form && S.form.id === f.id ? ' mp-on' : '') },
        el('span', { class: 'mp-num' }, String(i + 1)),
        el('div', { class: 'mp-fi' }, el('b', {}, f.nombre || 'CF'), el('small', { class: 'muted' }, 'Recibo ' + f.recibo + ' · ' + (ps.length ? ps.map(p => p.codigo + (p.cant > 1 ? ' ×' + p.cant : '')).join(', ') : 'sin productos'), ps.length ? '' : ' ⚠')),
        el('span', { class: 'mp-tag mp-' + k[0] }, ico(k[1]), ' ', k[2]), el('b', { class: 'mp-mo' }, Q(k[3])),
        el('div', { class: 'mp-ac' }, btn('', 'edit', () => editarFactura(f), 'btn-ghost', 'Editar'), btn(S.confirmar === 'f' + f.id ? '¿Seguro?' : '', 'trash', () => borrar('mp_facturas', f.id, 'f' + f.id), S.confirmar === 'f' + f.id ? 'btn-gold' : 'btn-ghost', 'Borrar'))));
    });
    c.append(l); return c;
  }

  function bloqueSaldo() {
    const inp = el('input', { inputmode: 'decimal', value: String(saldoActual()), 'aria-label': 'Saldo inicial' });
    return el('div', { class: 'card' }, el('h3', {}, ico('coin'), ' Saldo inicial'),
      el('p', { class: 'muted' }, S.corte ? 'Guardado para este día.' : 'Automático: ' + (S.prevInfo ? 'viene del ' + S.prevInfo + '.' : 'no hay un día anterior registrado; escríbelo.')),
      el('div', { class: 'mp-acts' }, el('span', { class: 'mp-q' }, 'Q'), inp, btn('Guardar saldo', 'check', () => guardarSaldo(inp.value), 'btn-gold'), S.corte && S.saldoAuto && num(S.corte.saldo_inicial) !== S.saldoAuto ? btn('Usar el automático (' + Q(S.saldoAuto) + ')', null, () => guardarSaldo(S.saldoAuto)) : null));
  }

  function bloqueEgresos() {
    const nom = el('input', { placeholder: 'Nombre / concepto' }), rec = el('input', { placeholder: 'Recibo', inputmode: 'numeric' }), cant = el('input', { placeholder: '0.00', inputmode: 'decimal' });
    const c = el('details', { class: 'card mp-det', open: S.egs.length ? true : null }, el('summary', {}, ico('trash'), ' Egresos ', el('span', { class: 'mp-n' }, String(S.egs.length)), el('small', { class: 'muted' }, '  (restan del total en caja)')));
    S.egs.forEach((e, i) => c.append(el('div', { class: 'mp-fila' }, el('span', { class: 'mp-num' }, String(i + 1)), el('div', { class: 'mp-fi' }, el('b', {}, e.nombre || '—'), el('small', { class: 'muted' }, e.recibo ? 'Recibo ' + e.recibo : '')), el('b', { class: 'mp-mo' }, Q(e.cantidad)), btn(S.confirmar === 'e' + e.id ? '¿Seguro?' : '', 'trash', () => borrar('mp_egresos', e.id, 'e' + e.id), S.confirmar === 'e' + e.id ? 'btn-gold' : 'btn-ghost'))));
    c.append(el('div', { class: 'mp-f3' }, field('Recibo', rec), field('Nombre', nom), field('Cantidad (Q)', cant)),
      el('div', { class: 'mp-acts' }, btn('Agregar egreso', 'plus', () => { if (!(num(cant.value) > 0)) { ctx.toast('Falta la cantidad'); return; } agregarEgreso({ recibo: rec.value.trim(), nombre: nom.value.trim().toUpperCase(), cantidad: r2(num(cant.value)) }); })));
    return c;
  }

  function bloqueBilletes() {
    const b = Object.assign({}, (S.corte && S.corte.billetes) || {}), t = totalesDe(S.facs, S.egs, saldoActual());
    const ins = {}, tot = el('b', { class: 'mp-tb' }), dif = el('span', {});
    const calc = () => { const c = contado(leer()); tot.textContent = Q(c); const d = r2(c - t.total); dif.className = 'mp-tag ' + (c === 0 ? '' : d === 0 ? 'mp-ok' : 'mp-mal'); dif.textContent = c === 0 ? 'sin contar' : d === 0 ? 'Cuadra' : (d > 0 ? 'Sobra ' : 'Falta ') + Q(Math.abs(d)); };
    const leer = () => { const o = {}; DEN.forEach(d => { o[d] = Math.max(0, parseInt(ins[d].value, 10) || 0); }); o.mon = r2(num(ins.mon.value)); o.extra = r2(num(ins.extra.value)); return o; };
    const g = el('div', { class: 'mp-bill' });
    DEN.forEach(d => { ins[d] = el('input', { type: 'number', min: '0', value: b[d] || '', placeholder: '0', oninput: calc, 'aria-label': 'Billetes de ' + d }); g.append(el('label', {}, el('span', { class: 'mp-den' }, 'Q' + d), ins[d])); });
    ins.mon = el('input', { inputmode: 'decimal', value: b.mon || '', placeholder: '0.00', oninput: calc }); ins.extra = el('input', { inputmode: 'decimal', value: b.extra || '', placeholder: '0.00', oninput: calc });
    g.append(el('label', {}, el('span', { class: 'mp-den' }, 'Monedas Q'), ins.mon), el('label', {}, el('span', { class: 'mp-den' }, 'Extra Q'), ins.extra));
    const c = el('details', { class: 'card mp-det', open: contado(b) > 0 ? true : null }, el('summary', {}, ico('cash'), ' Conteo de billetes (dejo en caja)'), g,
      el('div', { class: 'mp-acts' }, el('span', {}, 'Contado: ', tot), el('span', {}, 'Sistema: ', el('b', {}, Q(t.total))), dif, btn('Guardar conteo', 'check', () => guardarBilletes(leer()), 'btn-gold')));
    calc(); return c;
  }

  /* ---------- 2 · para el Drive ---------- */
  function vistaDrive() {
    const w = el('div', {}); w.append(selectorFecha());
    const d = textoDrive(S.facs, S.fecha);
    w.append(el('div', { class: 'card mp-guia' }, el('h3', {}, ico('sheet'), ' Cómo pegarlo en el Drive'),
      el('div', { class: 'mp-pasos' },
        el('div', {}, el('b', {}, '1'), el('span', {}, 'Copia el Bloque 1 y pégalo en la primera casilla libre de la columna FECHA (el código queda a su lado).')),
        el('div', {}, el('b', {}, '2'), el('span', {}, 'Copia el Bloque 2 y pégalo en la misma fila, empezando en la casilla vacía a la derecha del nombre. Así no pisas la fórmula del nombre.')),
        el('div', {}, el('b', {}, '3'), el('span', {}, 'Cada producto lleva su renglón: cantidad · vacío · FACTURADO · R-recibo.')))));
    if (!d.n) { w.append(el('div', { class: 'card' }, el('p', { class: 'muted' }, 'No hay productos capturados en las facturas de este día. Agrégalos en «Corte del día».'))); }
    else {
      const blk = (n, t, tx, sub) => el('div', { class: 'card' }, el('h3', {}, el('span', { class: 'mp-bn' }, n), ' ', t), el('p', { class: 'muted' }, sub),
        el('textarea', { class: 'mp-ta', readonly: true, rows: Math.min(14, d.n + 1), onclick: e => e.target.select() }, tx),
        el('div', { class: 'mp-acts' }, btn('Copiar bloque ' + n, 'copy', () => copiar(tx, 'Bloque ' + n + ' copiado'), 'btn-gold')));
      w.append(el('div', { class: 'mp-grid2' }, blk(1, 'Fecha + código', d.b1, d.n + ' renglones · 2 columnas'), blk(2, 'Cantidad · FACTURADO · recibo', d.b2, d.n + ' renglones · 5 columnas (con las vacías)')));
    }
    if (d.sin.length) w.append(el('p', { class: 'mp-warn' }, ico('warn'), ' Sin productos (no salen en el texto): recibo ' + d.sin.join(', ') + '.'));
    return w;
  }

  /* ---------- 3 · ventas y comisión ---------- */
  function vistaVentas() {
    const pctv = num(S.cfg.porcentaje) || 0, nc = num(S.cfg['nc:' + S.mes]), nota = S.cfg['ncn:' + S.mes] || '';
    const porDia = {}; S.mesFacs.forEach(f => { (porDia[f.fecha] = porDia[f.fecha] || []).push(f); });
    const egsDia = {}; S.mesEgs.forEach(e => { (egsDia[e.fecha] = egsDia[e.fecha] || []).push(e); });
    const cortes = {}; S.mesCortes.forEach(c => { cortes[c.fecha] = c; });
    const dias = [...new Set([...Object.keys(porDia), ...Object.keys(cortes)])].sort();
    const filas = dias.map(f => { const t = totalesDe(porDia[f] || [], egsDia[f] || [], num((cortes[f] || {}).saldo_inicial)); const c = contado((cortes[f] || {}).billetes); return { f, t, c, n: (porDia[f] || []).length }; });
    const total = r2(filas.reduce((a, x) => a + x.t.ventas, 0)), com = r2(total * pctv / 100 - nc), max = Math.max(1, ...filas.map(x => x.t.ventas));
    const w = el('div', {});
    w.append(el('div', { class: 'mp-fecha' }, btn('', 'left', () => { S.mes = sumaMes(S.mes, -1); cargar(); }, 'btn-ghost', 'Mes anterior'), el('div', { class: 'mp-fechab' }, ico('cal'), el('b', {}, nombreMes(S.mes))), btn('', 'right', () => { S.mes = sumaMes(S.mes, 1); cargar(); }, 'btn-ghost', 'Mes siguiente'), btn('Este mes', null, () => { S.mes = mesDe(hoy()); cargar(); })));
    const pin = el('input', { inputmode: 'decimal', value: String(pctv), 'aria-label': 'Porcentaje' }), ncin = el('input', { inputmode: 'decimal', value: nc ? String(nc) : '', placeholder: '0.00', 'aria-label': 'No corresponde' });
    w.append(el('div', { class: 'mp-kpis' }, kpi('coin', 'Ventas del mes', Q(total), 'mp-k1'), kpi('pct', 'Comisión (' + pctv + '%)', Q(r2(total * pctv / 100)), 'mp-k3'), kpi('x', 'No corresponde', Q(nc), 'mp-k4'), kpi('check', 'Comisión a recibir', Q(com), 'mp-k5 mp-grande')));
    w.append(el('div', { class: 'card' }, el('h3', {}, ico('pct'), ' Cómo se calcula'),
      el('div', { class: 'mp-calc' }, el('span', {}, 'Ventas ', el('b', {}, Q(total))), el('i', {}, '×'), el('label', { class: 'mp-mini' }, pin, '%'), el('i', {}, '−'), el('label', { class: 'mp-mini' }, 'Q', ncin, ' no corresponde'), el('i', {}, '='), el('b', { class: 'mp-res' }, Q(com))),
      el('div', { class: 'mp-acts' }, btn('Guardar % y «no corresponde»', 'check', async () => {
        try {
          await send('POST', 'mp_config?on_conflict=clave', [{ clave: 'porcentaje', valor: String(num(pin.value)) }, { clave: 'nc:' + S.mes, valor: String(r2(num(ncin.value))) }], 'resolution=merge-duplicates,return=minimal');
          ctx.toast('Guardado'); await cargar(true);
        } catch (e) { ctx.toast(e.message); }
      }, 'btn-gold'), el('small', { class: 'muted' }, 'El porcentaje vale para todos los meses; «no corresponde» es de este mes.'))));
    /* tabla tipo REGISTRO DE VENTAS, agrupada por fin de semana */
    const c = el('div', { class: 'card' }, el('h3', {}, ico('sheet'), ' Registro de ventas por día'));
    if (!filas.length) c.append(el('p', { class: 'muted' }, 'No hay ventas registradas en este mes.'));
    else {
      const grupos = []; filas.forEach(x => { const p = parte(x.f); const lun = mover(x.f, -((p.dow + 6) % 7)); let g = grupos.find(z => z.lun === lun); if (!g) grupos.push(g = { lun, items: [] }); g.items.push(x); });
      const tb = el('div', { class: 'mp-reg' });
      tb.append(el('div', { class: 'mp-rh' }, el('span', {}, 'Fecha'), el('span', {}, 'Monto vendido'), el('span', { class: 'mp-bar-h' }, ''), el('span', {}, 'Comisión'), el('span', {}, 'Total en caja'), el('span', {}, 'Dejo en caja'), el('span', {}, 'Diferencia')));
      grupos.forEach(g => {
        const sub = r2(g.items.reduce((a, x) => a + x.t.ventas, 0));
        g.items.forEach(x => {
          const dif = x.c > 0 ? r2(x.c - x.t.total) : null;
          tb.append(el('button', { type: 'button', class: 'mp-rr', onclick: () => { S.fecha = x.f; S.vista = 'corte'; S.form = null; cargar(); }, title: 'Abrir este día' },
            el('span', { class: 'mp-rf' }, el('b', {}, fCorta(x.f)), el('small', { class: 'muted' }, ' ' + DIA[parte(x.f).dow] + ' · ' + x.n + ' fact.')),
            el('b', {}, Q(x.t.ventas)), el('span', { class: 'mp-bar' }, el('i', { style: 'width:' + Math.max(2, x.t.ventas / max * 100) + '%' })),
            el('span', {}, Q(x.t.ventas * pctv / 100)), el('span', {}, Q(x.t.total)), el('span', {}, x.c > 0 ? Q(x.c) : '—'), el('span', { class: dif == null ? '' : dif === 0 ? 'mp-okt' : 'mp-malt' }, dif == null ? '—' : dif === 0 ? 'Cuadra' : (dif > 0 ? '+' : '−') + money(Math.abs(dif)))));
        });
        if (g.items.length > 1) tb.append(el('div', { class: 'mp-sub' }, el('span', {}, 'Fin de semana · ' + fCorta(g.items[0].f) + ' al ' + fCorta(g.items[g.items.length - 1].f)), el('b', {}, Q(sub)), el('span', { class: 'mp-bar-h' }), el('span', {}, Q(sub * pctv / 100)), el('span'), el('span'), el('span')));
      });
      c.append(tb);
    }
    w.append(c);
    /* por día de la semana */
    const dw = {}; filas.forEach(x => { const k = parte(x.f).dow; (dw[k] = dw[k] || { n: 0, v: 0 }); dw[k].n++; dw[k].v += x.t.ventas; });
    if (filas.length) w.append(el('div', { class: 'card' }, el('h3', {}, ico('trend'), ' Por día de la semana'), el('div', { class: 'mp-dw' }, Object.keys(dw).sort((a, b) => ((+a + 6) % 7) - ((+b + 6) % 7)).map(k => el('div', { class: 'mp-dwc' }, el('small', { class: 'muted' }, DIA[k].toUpperCase()), el('b', {}, Q(dw[k].v)), el('small', { class: 'muted' }, dw[k].n + (dw[k].n === 1 ? ' día' : ' días') + ' · promedio ' + Q(dw[k].v / dw[k].n)))))));
    return w;
  }

  function css() {
    if (css1) return; css1 = true;
    document.head.append(el('style', {}, `
.mp-i{display:inline-block;vertical-align:-.2em}.mp-i svg{width:1.15em;height:1.15em}
.mp-cab{display:flex;gap:16px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.mp-tit{display:flex;gap:14px;align-items:center}.mp-tit h2{margin:0}.mp-tit p{margin:2px 0 0}.mp-logo{height:54px;width:auto;border-radius:12px;box-shadow:0 8px 20px -10px rgba(0,0,0,.6)}
.mp-seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;background:var(--soft)}
.mp-seg button{border:0;background:none;color:var(--text);padding:10px 18px;cursor:pointer;font:inherit;font-size:.95rem;display:flex;align-items:center;gap:6px}
.mp-seg button[aria-pressed="true"]{background:var(--oro);color:#252528;font-weight:700}
.mp-fecha{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.mp-fecha input[type=date]{width:auto}
.mp-fechab{display:flex;gap:8px;align-items:center;padding:8px 16px;border-radius:12px;background:var(--soft);border:1px solid var(--line);font-size:1.05rem}.mp-fechab b::first-letter{text-transform:uppercase}
.mp-tag{display:inline-flex;gap:5px;align-items:center;padding:3px 11px;border-radius:999px;font-size:.78rem;font-weight:700;border:1px solid var(--line);white-space:nowrap}
.mp-efectivo{background:rgba(94,158,107,.2);border-color:rgba(94,158,107,.7)}.mp-tarjeta{background:rgba(88,140,220,.2);border-color:rgba(88,140,220,.7)}.mp-deposito{background:rgba(226,190,70,.22);border-color:rgba(226,190,70,.8)}
.mp-amar{background:rgba(226,190,70,.2);border-color:rgba(226,190,70,.8);text-transform:none}.mp-ok{background:rgba(94,158,107,.22);border-color:rgba(94,158,107,.8)}.mp-mal{background:rgba(217,90,106,.2);border-color:rgba(217,90,106,.8)}
.mp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
.mp-kpi{padding:14px 16px;border-radius:16px;border:1px solid var(--line);display:grid;gap:4px;box-shadow:0 10px 24px -18px rgba(0,0,0,.6);background:var(--soft);border-left:5px solid var(--oro)}
.mp-kl{font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.mp-kpi b{font-size:1.45rem}
.mp-k1{border-left-color:#B8A06A}.mp-k2{border-left-color:#5E9E6B}.mp-k3{border-left-color:#588CDC}.mp-k4{border-left-color:#E2BE46}.mp-k5{border-left-color:#E9B28A}
.mp-grande b{font-size:1.9rem;color:var(--oro-t)}
.mp-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:16px;align-items:start}.mp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media (max-width:1100px){.mp-grid,.mp-grid2{grid-template-columns:1fr}}
.mp-col{display:grid;gap:14px;min-width:0}.mp-sticky{position:sticky;top:12px}@media (max-width:1100px){.mp-sticky{position:static}}
.mp-col input,.mp-col textarea,.mp-grid2 textarea{box-sizing:border-box;min-width:0;max-width:100%}.mp-f3>.field,.mp-f2>.field{min-width:0}.mp-col .card,.mp-grid2 .card{margin:0}.mp-col h3,.mp-grid2 h3,.mp-guia h3{display:flex;align-items:center;gap:8px;margin:0 0 10px}
.mp-cv{width:100%;height:auto;border:1px solid var(--line);border-radius:6px;background:#fff;box-shadow:0 12px 30px -18px rgba(0,0,0,.6)}
.mp-f3{display:grid;grid-template-columns:110px 1fr 140px;gap:10px}.mp-f2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:560px){.mp-f3,.mp-f2{grid-template-columns:1fr}}
.mp-met{display:flex;gap:8px;flex-wrap:wrap}.mp-m{flex:1;min-width:110px;display:flex;gap:6px;align-items:center;justify-content:center;padding:11px 12px;border-radius:12px;border:2px solid var(--line);background:var(--soft);color:var(--text);cursor:pointer;font:inherit;font-weight:700}
.mp-m[aria-pressed="true"].mp-m-efectivo{border-color:#5E9E6B;background:rgba(94,158,107,.25)}.mp-m[aria-pressed="true"].mp-m-tarjeta{border-color:#588CDC;background:rgba(88,140,220,.25)}.mp-m[aria-pressed="true"].mp-m-deposito{border-color:#E2BE46;background:rgba(226,190,70,.25)}
.mp-prods{display:grid;gap:8px;margin-bottom:8px}.mp-pr{display:grid;grid-template-columns:26px 1fr 78px auto;gap:8px;align-items:center}.mp-pn{color:var(--muted);text-align:center;font-weight:700}
.mp-acts{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px}.mp-acts input{flex:0 1 160px}.mp-q{font-weight:700}
.mp-warn{margin:8px 0;padding:9px 13px;border-radius:12px;background:rgba(226,190,70,.18);border:1px solid rgba(226,190,70,.7)}
.mp-n{display:inline-block;min-width:24px;padding:1px 8px;border-radius:999px;background:var(--borgona);color:#fff;font-size:.8rem;text-align:center}
.mp-lista{display:grid;gap:8px}.mp-fila{display:grid;grid-template-columns:30px 1fr auto auto auto;gap:10px;align-items:center;padding:9px 12px;border-radius:12px;border:1px solid var(--line);background:var(--soft)}
.mp-fila.mp-on{border-color:var(--oro);box-shadow:0 0 0 2px rgba(184,160,106,.35)}.mp-num{width:26px;height:26px;border-radius:50%;background:var(--oro);color:#252528;font-weight:700;display:grid;place-items:center;font-size:.8rem}
.mp-fi{display:grid;gap:2px;min-width:0}.mp-fi b{overflow:hidden;text-overflow:ellipsis}.mp-mo{white-space:nowrap}.mp-ac{display:flex;gap:4px}
@media (max-width:640px){.mp-fila{grid-template-columns:30px 1fr auto}.mp-fila .mp-tag{grid-column:2}.mp-fila .mp-ac{grid-column:3}}
.mp-det summary{cursor:pointer;font-weight:700;display:flex;gap:8px;align-items:center}.mp-det>*:not(summary){margin-top:10px}
.mp-bill{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px}.mp-bill label{display:grid;gap:4px}.mp-den{font-weight:700;color:var(--oro-t)}
.mp-tb{font-size:1.2rem}.mp-guia{margin-bottom:14px}.mp-pasos{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.mp-pasos div{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:var(--soft);border:1px solid var(--line)}.mp-pasos b,.mp-bn{flex:none;width:28px;height:28px;border-radius:50%;background:var(--oro);color:#252528;display:inline-grid;place-items:center}
.mp-ta{width:100%;font-family:ui-monospace,Menlo,monospace;font-size:.85rem;white-space:pre;overflow:auto}
.mp-calc{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:1.05rem}.mp-calc i{font-style:normal;font-size:1.4rem;color:var(--muted)}.mp-res{font-size:1.5rem;color:var(--oro-t)}
.mp-mini{display:inline-flex;gap:6px;align-items:center}.mp-mini input{width:90px}
.mp-reg{display:grid;gap:4px;overflow-x:auto}.mp-rh,.mp-rr,.mp-sub{display:grid;grid-template-columns:minmax(190px,1.5fr) minmax(120px,1fr) minmax(90px,1fr) minmax(100px,.9fr) minmax(110px,.9fr) minmax(110px,.9fr) minmax(90px,.8fr);gap:10px;align-items:center;padding:8px 12px;border-radius:10px;min-width:820px}
.mp-rh{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.mp-rr{border:1px solid var(--line);background:var(--soft);color:var(--text);font:inherit;cursor:pointer;text-align:left}.mp-rr:hover{border-color:var(--oro)}
.mp-sub{background:rgba(184,160,106,.18);border:1px dashed var(--oro);margin-bottom:8px}.mp-rf{display:grid}.mp-bar{display:block;height:10px;border-radius:99px;background:var(--line);overflow:hidden}.mp-bar i{display:block;height:100%;background:linear-gradient(90deg,#588CDC,#5E9E6B)}
.mp-okt{color:#5E9E6B;font-weight:700}.mp-malt{color:var(--red-t);font-weight:700}
.mp-dw{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.mp-dwc{display:grid;gap:4px;padding:12px 14px;border-radius:14px;background:var(--soft);border:1px solid var(--line)}.mp-dwc b{font-size:1.4rem}
.mp-aviso{border-color:rgba(217,90,106,.5)}
`));
  }

  window.FaroMusicPro = {
    iniciar(el_, c) { host = el_; ctx = c; S.fecha = S.fecha || hoy(); S.form = null; cargar(); }
  };
})();
