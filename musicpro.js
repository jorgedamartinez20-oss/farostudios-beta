/* Faro Workspace · Music Pro
 * Panel del trabajo de fin de semana en la tienda de instrumentos (Music Pro · Pradera Zona 10).
 *   Corte del día : ① ingreso en caja → ② ventas (facturas) → ③ salidas (egresos) → ④ total en caja, y el CORTE DE CAJA en imagen tamaño oficio.
 *   Caja          : sábado + domingo juntos (el domingo arranca con lo que quedó el sábado) y conteo de billetes en vivo.
 *   Para el Drive : el texto del inventario en dos bloques (fecha + código · cantidad + FACTURADO + recibo).
 *   Ventas        : ventas por fecha y por día, y comisión del mes (ventas × % − «no corresponde»).
 * Solo se trabajan sábados y domingos (se crean solos desde las 10 am del día). Un día entre semana se agrega a mano como «día extraordinario».
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
    cal: '<rect x="3" y="4" width="18" height="18" rx="2.5"/><path d="M16 2v4M8 2v4M3 10h18"/>', zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
    out: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>', safe: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5v1.5M12 14v1.5M8.5 12H10M14 12h1.5"/>'
  };
  const ico = k => { const s = el('span', { class: 'mp-i' }); s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[k] || '') + '</svg>'; return s; };
  const btn = (txt, k, fn, cls, title) => el('button', { type: 'button', class: 'btn btn-sm ' + (cls || 'btn-ghost'), onclick: fn, title: title || null }, k ? ico(k) : null, txt ? ' ' + txt : null);
  const chip = (txt, cls, k) => el('span', { class: 'mp-tag ' + (cls || '') }, k ? ico(k) : null, k ? ' ' : null, txt);

  /* ---------- fechas y dinero ---------- */
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const DIA3 = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });
  const parte = iso => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d, dow: new Date(y, m - 1, d, 12).getDay() }; };
  const ahoraGT = () => { const f = hoy(); const h = parseInt(new Date().toLocaleString('en-GB', { timeZone: 'America/Guatemala', hour: '2-digit', hour12: false }), 10) % 24; return { f, h, dow: parte(f).dow }; };
  const mover = (iso, n) => { const p = parte(iso); const d = new Date(p.y, p.m - 1, p.d + n, 12); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const fCorta = iso => { const p = parte(iso); return String(p.d).padStart(2, '0') + '/' + String(p.m).padStart(2, '0') + '/' + String(p.y).slice(2); };
  const fLarga = iso => { const p = parte(iso); return DIA[p.dow] + ', ' + p.d + ' de ' + MES[p.m - 1] + ' de ' + p.y; };
  const fDrive = iso => { const p = parte(iso); return DIA3[p.dow] + ', ' + p.d + '/' + MES3[p.m - 1] + '/' + String(p.y).slice(2); };
  const fMini = iso => { const p = parte(iso); return p.d + ' ' + MES3[p.m - 1]; };
  const mesDe = iso => iso.slice(0, 7);
  const sumaMes = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1, 12); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const nombreMes = ym => { const [y, m] = ym.split('-').map(Number); return MES[m - 1] + ' ' + y; };
  const esFin = f => { const d = parte(f).dow; return d === 0 || d === 6; };
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[Qq,\s]/g, '')); return isFinite(n) ? n : 0; };
  const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const money = n => r2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const Q = n => 'Q ' + money(n);
  const mayus = s => s.charAt(0).toUpperCase() + s.slice(1);
  /* texto pegado desde cualquier lado: se limpia para que siempre quede con la letra y el formato del panel */
  const limpiar = (t, multi) => {
    t = String(t == null ? '' : t).normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/[   ]/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
    return multi ? t.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim() : t.replace(/\s+/g, ' ').trim();
  };

  const DEN = [200, 100, 50, 20, 10, 5, 1];
  const S = {
    vista: 'corte', fecha: null, mes: null, calYm: null, calSet: new Set(),
    D: { facs: [], egs: [], cortes: {} }, cfg: { porcentaje: '3' }, hint: null,
    form: null, falta: false, error: '', cargando: false, confirmar: null, extra: ''
  };
  let host = null, ctx = null, css1 = false, logoImg = null, logoCargando = false, tok = 0, modal = null, pegar = false;

  const formVacio = () => ({ id: null, recibo: '', nombre: '', metodo: 'tarjeta', monto: '', obs: '', prods: [{ codigo: '', cant: 1 }] });
  const diaInicial = () => { const f = hoy(), d = parte(f).dow; return d === 6 || d === 0 ? f : mover(f, -d); };

  /* ---------- acceso a datos ---------- */
  const get = async t => { const r = await ctx.api('/rest/v1/' + t); if (!r.ok) { const e = new Error(await ctx.errText(r)); e.status = r.status; throw e; } return r.json(); };
  const send = async (method, path, body, prefer) => {
    prefer = prefer || 'return=representation';
    const r = await ctx.api('/rest/v1/' + path, { method, body, headers: { Prefer: prefer } });
    if (!r.ok) throw new Error(await ctx.errText(r));
    return method === 'DELETE' || /return=minimal/.test(prefer) ? null : r.json();
  };

  /* ---------- cálculos (todos salen de lo capturado, nada se guarda doble) ---------- */
  const totalesDe = (facs, egs, saldo) => {
    const ef = r2(facs.reduce((a, f) => a + num(f.efectivo), 0)), ta = r2(facs.reduce((a, f) => a + num(f.tarjeta), 0)), de = r2(facs.reduce((a, f) => a + num(f.deposito), 0));
    const eg = r2(egs.reduce((a, e) => a + num(e.cantidad), 0));
    return { ef, ta, de, eg, ventas: r2(ef + ta + de), ingresoEf: r2(ef + saldo), total: r2(saldo + ef - eg), saldo };
  };
  const contado = b => { b = b || {}; return r2(DEN.reduce((a, d) => a + d * num(b[d]), 0) + num(b.mon) + num(b.extra)); };
  const facsDe = (f, D) => (D || S.D).facs.filter(x => x.fecha === f);
  const egsDe = (f, D) => (D || S.D).egs.filter(x => x.fecha === f);
  const registrado = f => !!S.D.cortes[f];
  /* ingreso en caja: el sábado (y un día extraordinario) lo indica David; el domingo arranca con el total en caja del sábado */
  function saldoDe(f, D) {
    D = D || S.D; const c = D.cortes[f]; if (!c) return { v: 0, estado: 'sin' };
    if (c.saldo_manual) return { v: num(c.saldo_inicial), estado: 'manual' };
    if (parte(f).dow === 0 && D.cortes[mover(f, -1)]) return { v: totalDia(mover(f, -1), D).total, estado: 'auto' };
    return { v: num(c.saldo_inicial), estado: 'pendiente' };
  }
  const totalDia = (f, D) => { D = D || S.D; return totalesDe(facsDe(f, D), egsDe(f, D), saldoDe(f, D).v); };
  const sabadoDe = f => { const d = parte(f).dow; return d === 6 ? f : d === 0 ? mover(f, -1) : null; };
  const diasSemana = f => { const s = sabadoDe(f); return s ? [s, mover(s, 1)] : [f]; };

  async function cargar(quiet) {
    const mi = ++tok;
    if (!quiet) { S.cargando = true; pintar(); }
    try {
      const ym = S.vista === 'ventas' ? S.mes : mesDe(S.fecha), d0 = mover(ym + '-01', -3), d1 = mover(sumaMes(ym, 1) + '-01', 2), rng = 'fecha=gte.' + d0 + '&fecha=lt.' + d1;
      const cy = S.calYm || mesDe(S.fecha);
      const [facs, egs, cs, cfg, cal] = await Promise.all([
        get('mp_facturas?select=*&' + rng + '&order=fecha.asc,creado.asc&limit=5000'),
        get('mp_egresos?select=*&' + rng + '&order=creado.asc&limit=5000'),
        get('mp_cortes?select=*&' + rng),
        get('mp_config?select=*'),
        get('mp_cortes?select=fecha&fecha=gte.' + cy + '-01&fecha=lt.' + sumaMes(cy, 1) + '-01')
      ]);
      if (mi !== tok) return;
      const cortes = {}; cs.forEach(c => { cortes[c.fecha] = c; });
      S.D = { facs, egs, cortes }; S.cfg = { porcentaje: '3' }; cfg.forEach(c => { S.cfg[c.clave] = c.valor; });
      S.calSet = new Set(cal.map(c => c.fecha));
      S.falta = false; S.error = '';
      await cargarHint(mi);
      if (mi !== tok) return;
      if (!S.form) { S.form = formVacio(); S.form.recibo = sugerirRecibo(); }
    } catch (e) { if (mi !== tok) return; S.falta = true; S.error = e.message || ''; }
    S.cargando = false; pintar();
  }
  /* referencia para el sábado: cómo terminó el último corte (solo para que lo veas; el ingreso en caja lo escribes tú) */
  async function cargarHint(mi) {
    S.hint = null; const f = S.fecha; if (S.vista === 'ventas' || !f) return;
    const p = await get('mp_cortes?select=*&fecha=lt.' + f + '&order=fecha.desc&limit=2'); if (!p.length || mi !== tok) return;
    const last = p[0], dd = [last.fecha]; if (p[1] && p[1].fecha === mover(last.fecha, -1)) dd.push(p[1].fecha);
    const [fa, eg] = await Promise.all([get('mp_facturas?select=*&fecha=in.(' + dd.join(',') + ')'), get('mp_egresos?select=*&fecha=in.(' + dd.join(',') + ')')]);
    const cortes = {}; p.forEach(c => { cortes[c.fecha] = c; });
    const t = totalDia(last.fecha, { facs: fa, egs: eg, cortes }), cn = contado(last.billetes);
    S.hint = { fecha: last.fecha, monto: cn > 0 ? cn : t.total, tipo: cn > 0 ? 'lo que contaste' : 'el total en caja' };
  }
  function sugerirRecibo() {
    const dia = facsDe(S.fecha).map(f => parseInt(f.recibo, 10)).filter(isFinite);
    const todos = S.D.facs.filter(f => f.fecha <= S.fecha).map(f => parseInt(f.recibo, 10)).filter(isFinite);
    const l = dia.length ? dia : todos.slice(-1); return l.length ? String(Math.max(...l) + 1) : '';
  }

  /* ---------- días: se crean solos al llegar (sáb y dom desde las 10 am) ---------- */
  const crearSql = f => send('POST', 'mp_cortes?on_conflict=fecha', { fecha: f, saldo_inicial: 0, saldo_manual: false }, 'resolution=ignore-duplicates,return=minimal');
  async function crearFinDeSemanaAuto() {
    const n = ahoraGT(), c = [];
    if (n.dow === 6 && n.h >= 10) c.push(n.f);
    if (n.dow === 0) { c.push(mover(n.f, -1)); if (n.h >= 10) c.push(n.f); }
    for (const f of c) { try { await crearSql(f); } catch (e) { /* si falla se reintenta al abrir */ } }
  }
  async function registrarDia(f) {
    if (!f) { ctx.toast('Elige la fecha del día extraordinario'); return; }
    if (f > hoy()) { ctx.toast('Ese día todavía no llega'); return; }
    try { await crearSql(f); ctx.toast('Día ' + fCorta(f) + ' registrado'); S.extra = ''; await irA(f); } catch (e) { ctx.toast(e.message); }
  }
  async function irA(f, vista) { S.fecha = f; S.calYm = null; S.form = null; S.confirmar = null; if (vista) S.vista = vista; await cargar(true); }

  /* ---------- guardar ---------- */
  async function guardarSaldo(f, v, manual) {
    try {
      const c = S.D.cortes[f];
      if (c) await send('PATCH', 'mp_cortes?fecha=eq.' + f, { saldo_inicial: r2(num(v)), saldo_manual: manual !== false }); else await send('POST', 'mp_cortes', { fecha: f, saldo_inicial: r2(num(v)), saldo_manual: manual !== false });
      ctx.toast(manual === false ? 'Ingreso en caja automático' : 'Ingreso en caja guardado'); await cargar(true);
    } catch (e) { ctx.toast(e.message); }
  }
  async function guardarBilletes(f, b) {
    try {
      if (!S.D.cortes[f]) await crearSql(f);
      await send('PATCH', 'mp_cortes?fecha=eq.' + f, { billetes: b }); ctx.toast('Conteo guardado'); await cargar(true);
    } catch (e) { ctx.toast(e.message); }
  }
  function leerForm() {
    const f = S.form, monto = r2(num(f.monto));
    return {
      fecha: S.fecha, recibo: limpiar(f.recibo), nombre: limpiar(f.nombre).toUpperCase(),
      efectivo: f.metodo === 'efectivo' ? monto : 0, tarjeta: f.metodo === 'tarjeta' ? monto : 0, deposito: f.metodo === 'deposito' ? monto : 0,
      referencia: '', observaciones: limpiar(f.obs),   /* en un depósito, observaciones = número de depósito */
      productos: f.prods.map(p => ({ codigo: limpiar(p.codigo), cant: Math.max(1, parseInt(p.cant, 10) || 1) })).filter(p => p.codigo)
    };
  }
  async function guardarFactura() {
    const d = leerForm();
    if (!d.recibo) { ctx.toast('Falta el número de recibo'); return; }
    if (!(num(S.form.monto) > 0)) { ctx.toast('Falta el monto de la factura'); return; }
    if (S.form.metodo === 'deposito' && !d.observaciones) { ctx.toast('Falta el número de depósito'); return; }
    if (!d.nombre) d.nombre = 'CF';
    try {
      if (S.form.id) await send('PATCH', 'mp_facturas?id=eq.' + S.form.id, d); else await send('POST', 'mp_facturas', d);
      ctx.toast(S.form.id ? 'Factura actualizada' : 'Factura agregada');
      S.form = formVacio(); await cargar(true); S.form.recibo = sugerirRecibo(); pintar();
      const n = $('.mp-fnombre', host); n && n.focus();
    } catch (e) { ctx.toast(e.message); }
  }
  function editarFactura(f) {
    const metodo = num(f.efectivo) > 0 ? 'efectivo' : num(f.deposito) > 0 ? 'deposito' : 'tarjeta';
    S.form = { id: f.id, recibo: f.recibo, nombre: f.nombre, metodo, monto: String(r2(num(f.efectivo) + num(f.tarjeta) + num(f.deposito))), obs: f.observaciones || f.referencia || '', prods: (f.productos && f.productos.length ? f.productos : [{ codigo: '', cant: 1 }]).map(p => ({ codigo: p.codigo, cant: p.cant })) };
    pintar(); window.scrollTo({ top: host.getBoundingClientRect().top + window.scrollY + 120, behavior: 'smooth' });
  }
  async function borrar(tabla, id, clave) {
    if (S.confirmar !== clave) { S.confirmar = clave; pintar(); setTimeout(() => { if (S.confirmar === clave) { S.confirmar = null; pintar(); } }, 3500); return; }
    S.confirmar = null;
    try { await send('DELETE', tabla + '?id=eq.' + id); ctx.toast('Eliminado'); await cargar(true); if (S.form && !S.form.id && !S.form.recibo) S.form.recibo = sugerirRecibo(); pintar(); } catch (e) { ctx.toast(e.message); }
  }
  async function agregarEgreso(d) {
    try { await send('POST', 'mp_egresos', Object.assign({ fecha: S.fecha }, d)); ctx.toast('Salida agregada'); await cargar(true); } catch (e) { ctx.toast(e.message); }
  }
  function parsearProductos(txt) {
    return limpiar(txt, true).split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const c = l.split('\t').map(x => limpiar(x));
      let cant = 1; for (let i = 1; i < c.length; i++) if (/^\d{1,3}$/.test(c[i])) { cant = parseInt(c[i], 10); break; }
      return { codigo: c[0], cant };
    }).filter(p => p.codigo);
  }

  /* ---------- texto para el Drive (2 bloques, texto plano) ---------- */
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
   *  CORTE DE CAJA · imagen (mismo esquema que Numbers, diseño moderno, Century Gothic)
   *  Espacio 2000 × 1307.7 → PNG 3900 × 2550 (oficio horizontal, 13 × 8.5 in a 300 ppp)
   * ===================================================================== */
  const W = 2000, H = 2550 / 1.95, PX = 1.95;
  const K2 = (H - 60 - 244) / (1030 - 244);
  const Y = y => y < 244 ? y : 244 + (y - 244) * K2;
  const FONT = "'Century Gothic','CenturyGothic','Questrial','Avenir Next','Helvetica Neue',Arial,sans-serif";
  const CL = { ink: '#0F172A', mut: '#475569', line: '#CBD5E1', navy: '#1E3A5F', navy2: '#3B5B85', head: '#E8EEF6', alt: '#F6F8FB', tot: '#DCE8F5', eg: '#2F6F7E', ok: '#1B7F4B', okbg: '#DDF3E6' };
  function dibujar(cv, d) {
    const c = cv.getContext('2d');
    cv.width = Math.round(W * PX); cv.height = Math.round(H * PX);
    c.setTransform(PX, 0, 0, PX, 0, 0);
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.textBaseline = 'middle';
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    const R = (x1, y1, x2, y2, o) => {
      o = o || {}; const a = Y(y1), b = Y(y2);
      if (o.r) rr(x1, a, x2 - x1, b - a, o.r); else { c.beginPath(); c.rect(x1, a, x2 - x1, b - a); }
      if (o.fill) { c.fillStyle = o.fill; c.fill(); }
      if (o.stroke !== null) { c.strokeStyle = o.stroke || CL.line; c.lineWidth = o.lw || 1.3; c.stroke(); }
    };
    const T = (t, x, y, o) => {
      o = o || {}; let s = o.s || 18; const w = o.w || '400'; c.font = w + ' ' + s + 'px ' + FONT;
      if (o.mw) { const m = c.measureText(t).width; if (m > o.mw) s = Math.max(8, s * o.mw / m); }
      c.font = w + ' ' + s + 'px ' + FONT; c.fillStyle = o.c || CL.ink; c.textAlign = o.a || 'center'; c.fillText(t, x, Y(y));
    };
    const M = (v, x1, x2, y, o) => { o = o || {}; T('Q', x1 + 12, y, Object.assign({}, o, { a: 'left', mw: 0 })); T(v, x2 - 14, y, Object.assign({}, o, { a: 'right', mw: (x2 - x1) - 50 })); };
    const dash = v => v ? money(v) : '-';

    /* marco, logo, título */
    c.save(); c.shadowColor = 'rgba(15,23,42,.14)'; c.shadowBlur = 18; c.shadowOffsetY = 4; rr(60, 70, 1880, H - 60 - 70, 22); c.fillStyle = '#fff'; c.fill(); c.restore();
    rr(60, 70, 1880, H - 60 - 70, 22); c.strokeStyle = '#94A3B8'; c.lineWidth = 2.5; c.stroke();
    if (logoImg) c.drawImage(logoImg, 240, 96, 327, 126);
    T('CORTE DE CAJA - PRADERA ZONA 10', 1000, 118, { s: 32, w: '700', c: CL.navy, mw: 900 });
    T(mayus(fLarga(d.fecha)), 1000, 163, { s: 26, c: CL.mut, mw: 900 });

    /* saldo inicial */
    R(1535, 205, 1722, 231, { fill: CL.head, r: 7 }); R(1722, 205, 1915, 231, { fill: CL.tot, r: 7 });
    T('SALDO INICIAL', 1628, 218, { s: 17, w: '700', mw: 165 }); M(money(d.saldo), 1722, 1915, 218, { s: 18, w: '700' });

    /* bandas */
    R(90, 244, 816, 269, { fill: CL.navy, stroke: CL.navy }); T('INGRESOS', 453, 257, { w: '700', c: '#fff', s: 18 });
    R(816, 244, 1915, 269, { fill: CL.navy2, stroke: CL.navy2 }); T('MODALIDAD', 1365, 257, { w: '700', c: '#fff', s: 18 });
    const COL = [90, 135, 229, 340, 816, 966, 1149, 1341, 1535, 1915];
    const HD = ['NO.', 'FECHA', 'RECIBO', 'NOMBRE', 'EFECTIVO', 'TERJETA DE CRÉDITO', 'DEPÓSITO', 'REF. TRANSACCIÓN', 'OBSERVACIONES'];
    HD.forEach((h, i) => { R(COL[i], 269, COL[i + 1], 295, { fill: CL.head }); T(h, (COL[i] + COL[i + 1]) / 2, 282, { w: '700', s: 16, mw: COL[i + 1] - COL[i] - 10 }); });

    /* ingresos · 15 renglones (si hay más, se aprietan) */
    const N = Math.max(15, d.facs.length), top = 295, bot = 677, rh = (bot - top) / N;
    for (let i = 0; i < N; i++) {
      const y1 = top + i * rh, y2 = y1 + rh, ym = (y1 + y2) / 2, f = d.facs[i], fill = i % 2 ? CL.alt : '#fff';
      for (let j = 0; j < 9; j++) R(COL[j], y1, COL[j + 1], y2, { fill });
      if (!f) continue;
      const fs = N > 15 ? Math.max(11, 17 * 15 / N) : 17;
      T(String(i + 1), (COL[0] + COL[1]) / 2, ym, { s: fs, c: CL.mut }); T(fCorta(d.fecha), (COL[1] + COL[2]) / 2, ym, { s: fs, mw: COL[2] - COL[1] - 8 });
      T(String(f.recibo), (COL[2] + COL[3]) / 2, ym, { s: fs, w: '700' }); T(String(f.nombre || '').toUpperCase(), (COL[3] + COL[4]) / 2, ym, { s: fs, mw: COL[4] - COL[3] - 24 });
      if (num(f.efectivo)) M(money(f.efectivo), COL[4], COL[5], ym, { s: fs });
      if (num(f.tarjeta)) M(money(f.tarjeta), COL[5], COL[6], ym, { s: fs });
      if (num(f.deposito)) M(money(f.deposito), COL[6], COL[7], ym, { s: fs });
      if (f.referencia) T(f.referencia, (COL[7] + COL[8]) / 2, ym, { s: fs, mw: COL[8] - COL[7] - 12 });
      if (f.observaciones) T(f.observaciones, (COL[8] + COL[9]) / 2, ym, { s: fs, mw: COL[9] - COL[8] - 16 });
    }
    R(90, 295, 1915, 677, { stroke: CL.navy2, lw: 2 });

    /* totales de ingresos */
    const tb = (a, b) => R(a, 693, b, 718, { fill: CL.tot, stroke: '#A9C0DA' });
    tb(816, 966); M(money(d.t.ef), 816, 966, 705.5, { s: 17, w: '700' }); tb(966, 1149); M(money(d.t.ta), 966, 1149, 705.5, { s: 17, w: '700' });
    tb(1149, 1341); M(dash(d.t.de), 1149, 1341, 705.5, { s: 17, w: '700' }); tb(1341, 1535);
    tb(1535, 1722); T('INGESO EFECTIVO', 1628, 706, { s: 15, w: '700', mw: 170 }); tb(1722, 1915); M(money(d.t.ingresoEf), 1722, 1915, 705.5, { s: 17, w: '700' });

    /* egresos */
    R(90, 733, 966, 758, { fill: CL.eg, stroke: CL.eg }); T('EGRESOS', 528, 745.5, { w: '700', c: '#fff', s: 18 });
    const EC = [90, 135, 229, 340, 816, 966], EH = ['NO.', 'FECHA', 'RECIBO', 'NOMBRE', 'CANTIDAD'];
    EH.forEach((h, i) => { R(EC[i], 758, EC[i + 1], 783, { fill: CL.head }); T(h, (EC[i] + EC[i + 1]) / 2, 770.5, { w: '700', s: 16, mw: EC[i + 1] - EC[i] - 10 }); });
    const NE = Math.max(5, d.egs.length), et = 783, eb = 910, eh = (eb - et) / NE;
    for (let i = 0; i < NE; i++) {
      const y1 = et + i * eh, y2 = y1 + eh, ym = (y1 + y2) / 2, e = d.egs[i], fill = i % 2 ? CL.alt : '#fff';
      for (let j = 0; j < 5; j++) R(EC[j], y1, EC[j + 1], y2, { fill });
      if (!e) continue;
      const fs = NE > 5 ? Math.max(11, 17 * 5 / NE) : 17;
      T(String(i + 1), (EC[0] + EC[1]) / 2, ym, { s: fs, c: CL.mut }); T(fCorta(d.fecha), (EC[1] + EC[2]) / 2, ym, { s: fs, mw: EC[2] - EC[1] - 8 });
      T(e.recibo || '', (EC[2] + EC[3]) / 2, ym, { s: fs }); T(String(e.nombre || '').toUpperCase(), (EC[3] + EC[4]) / 2, ym, { s: fs, mw: EC[4] - EC[3] - 24 });
      M(money(e.cantidad), EC[4], EC[5], ym, { s: fs });
    }
    R(90, 783, 966, 910, { stroke: CL.eg, lw: 2 });

    /* ventas del día */
    R(1149, 758, 1341, 835, { fill: '#fff', stroke: CL.navy2, lw: 2, r: 12 }); T('VENTAS DEL DÍA', 1245, 796.5, { s: 19, w: '700', c: CL.navy, mw: 170 });
    R(1341, 758, 1723, 835, { fill: CL.navy, stroke: CL.navy, r: 12 }); T('Q', 1362, 796.5, { s: 34, c: '#fff', a: 'left' }); T(money(d.t.ventas), 1704, 796.5, { s: 38, c: '#fff', a: 'right', w: '700', mw: 310 });

    /* egreso efectivo y total en caja */
    const eb2 = (a, b) => R(a, 923, b, 948, { fill: CL.tot, stroke: '#A9C0DA' });
    eb2(816, 966); M(dash(d.t.eg), 816, 966, 935.5, { s: 17, w: '700' }); eb2(966, 1149); eb2(1149, 1341); eb2(1341, 1535);
    eb2(1535, 1722); T('EGRESO EFECTIVO', 1628, 936, { s: 15, w: '700', mw: 170 }); eb2(1722, 1915); M(dash(d.t.eg), 1722, 1915, 935.5, { s: 17, w: '700' });
    R(1341, 963, 1722, 1005, { fill: CL.okbg, stroke: CL.ok, lw: 3, r: 12 }); T('TOTAL EN CAJA', 1531, 984, { s: 21, w: '700', c: CL.ok, mw: 330 });
    R(1722, 963, 1915, 1005, { fill: CL.ok, stroke: CL.ok, lw: 3, r: 12 }); T('Q', 1740, 984, { s: 27, w: '700', a: 'left', c: '#fff' }); T(money(d.t.total), 1898, 984, { s: 29, w: '700', a: 'right', c: '#fff', mw: 150 });
  }
  const datosCorte = f => { const s = saldoDe(f).v, fa = facsDe(f), eg = egsDe(f); return { fecha: f, facs: fa, egs: eg, saldo: s, t: totalesDe(fa, eg, s) }; };
  function cargarLogo() {
    if (logoImg || logoCargando) return; logoCargando = true;
    const i = new Image(); i.onload = () => { logoImg = i; logoCargando = false; repintarCorte(); }; i.onerror = () => { logoCargando = false; }; i.src = 'musicpro-logo.png';
  }
  /* la imagen se redibuja sola cada vez que agregas, editas o borras algo */
  function repintarCorte() {
    if (!registrado(S.fecha)) return;
    const d = datosCorte(S.fecha);
    const cv = $('.mp-cv', host); if (cv) dibujar(cv, d);
    if (modal && modal.cv.isConnected) { dibujar(modal.cv, d); modal.tit.textContent = 'Corte de caja · ' + fCorta(S.fecha); }
  }
  async function blobPNG() {
    await (document.fonts && document.fonts.ready);
    const cv = document.createElement('canvas'); dibujar(cv, datosCorte(S.fecha)); return new Promise(ok => cv.toBlob(ok, 'image/png'));
  }
  async function descargarPNG() {
    const b = await blobPNG(); if (!b) { ctx.toast('No se pudo crear la imagen'); return; }
    const a = el('a', { href: URL.createObjectURL(b), download: 'corte-de-caja-' + S.fecha + '.png' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    ctx.toast('Imagen guardada · tamaño oficio (3900 × 2550 px)');
  }
  async function copiarPNG() {
    try { const b = await blobPNG(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); ctx.toast('Imagen copiada: pégala en el correo'); }
    catch (e) { ctx.toast('Tu navegador no permite copiar la imagen; usa «Guardar PNG»'); }
  }
  function abrirGrande() {
    if (modal) modal.bg.remove();
    const cv = el('canvas', { class: 'mp-cvg' }), tit = el('b', {}), zoom = btn('Tamaño real', 'zoom', () => { const z = bg.classList.toggle('mp-z'); zoom.lastChild.textContent = z ? ' Ajustar a la pantalla' : ' Tamaño real'; }, 'btn-ghost');
    const cerrar = () => { bg.remove(); modal = null; document.removeEventListener('keydown', kd); };
    const kd = e => { if (e.key === 'Escape') cerrar(); };
    const bg = el('div', { class: 'mp-modal', onmousedown: e => { if (e.target === bg) cerrar(); } },
      el('div', { class: 'mp-mh' }, tit, el('span', { class: 'muted' }, ' · se actualiza mientras agregas'), el('span', { style: 'flex:1' }), btn('Guardar PNG', 'down', descargarPNG, 'btn-gold'), btn('Copiar', 'copy', copiarPNG), zoom, btn('Cerrar', 'x', cerrar)),
      el('div', { class: 'mp-mb' }, cv));
    document.addEventListener('keydown', kd); document.body.append(bg); modal = { bg, cv, tit }; repintarCorte();
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
    if (S.vista === 'ventas') host.append(vistaVentas());
    else {
      host.append(encabezadoDias());
      if (!registrado(S.fecha)) host.append(diaNoRegistrado());
      else host.append(S.vista === 'corte' ? vistaCorte() : S.vista === 'caja' ? vistaCaja() : vistaDrive());
    }
    window.scrollTo({ top: y });
    setTimeout(async () => { await (document.fonts && document.fonts.ready); repintarCorte(); }, 0);
  }
  function avisoFalta() {
    const falla = /relation|does not exist|mp_|42P01|PGRST205/i.test(S.error || '') || /404/.test(String(S.error));
    return el('div', { class: 'card mp-aviso' }, el('h3', {}, 'Falta un paso en Supabase'),
      el('p', { class: 'muted' }, falla ? 'Las tablas de Music Pro aún no existen o no tienen permisos. Corre sql/musicpro.sql en Supabase → SQL Editor.' : 'No se pudieron leer los datos: ' + (S.error || 'error desconocido')),
      btn('Reintentar', null, () => cargar(), 'btn-gold'));
  }
  function cabecera() {
    const tabs = [['corte', 'Corte del día', 'cash'], ['caja', 'Caja del fin de semana', 'safe'], ['drive', 'Para el Drive', 'sheet'], ['ventas', 'Ventas y comisión', 'trend']];
    return el('div', { class: 'mp-cab' },
      el('div', { class: 'mp-tit' }, el('img', { src: 'musicpro-logo.png', alt: 'Music Pro', class: 'mp-logo' }), el('div', {}, el('h2', {}, 'Music Pro'), el('p', { class: 'muted' }, 'Trabajo de fin de semana · Pradera Zona 10'))),
      el('div', { class: 'mp-seg', role: 'tablist' }, tabs.map(([k, t, i]) => el('button', { type: 'button', role: 'tab', 'aria-pressed': String(S.vista === k), onclick: () => { S.vista = k; S.confirmar = null; if (k === 'ventas') S.mes = mesDe(S.fecha); cargar(true); } }, ico(i), ' ', t))));
  }

  /* arriba: calendario para moverte + ambos días del fin de semana */
  function encabezadoDias() {
    return el('div', { class: 'mp-top' }, bloqueSemana(), calendario());
  }
  function bloqueSemana() {
    const dias = diasSemana(S.fecha), pct = num(S.cfg.porcentaje), n = ahoraGT();
    const cards = dias.map(f => {
      const reg = registrado(f), p = parte(f);
      const t = reg ? totalDia(f) : null, sd = reg ? saldoDe(f) : null;
      const est = reg ? (sd.estado === 'pendiente' ? chip('Falta ingreso en caja', 'mp-mal', 'warn') : chip('Registrado', 'mp-ok', 'check')) : chip(f > n.f ? 'Aún no llega' : 'Sin registrar', 'mp-gris');
      return el('button', { type: 'button', class: 'mp-dia' + (f === S.fecha ? ' mp-sel' : '') + (reg ? '' : ' mp-vacio'), onclick: () => irA(f) },
        el('small', { class: 'muted' }, DIA[p.dow].toUpperCase() + (esFin(f) ? '' : ' · EXTRAORDINARIO')), el('b', { class: 'mp-dn' }, p.d + ' de ' + MES[p.m - 1]), est,
        reg ? el('div', { class: 'mp-dm' }, el('span', {}, 'Ventas ', el('b', {}, Q(t.ventas))), el('span', {}, 'En caja ', el('b', {}, Q(t.total)))) : null);
    });
    const regs = dias.filter(registrado), tv = r2(regs.reduce((a, f) => a + totalDia(f).ventas, 0)), last = regs.length ? totalDia(regs[regs.length - 1]) : null;
    return el('div', { class: 'mp-semana' },
      el('div', { class: 'mp-sh' }, ico('cal'), el('b', {}, dias.length > 1 ? 'Este fin de semana' : 'Día extraordinario'), el('span', { class: 'muted' }, dias.length > 1 ? fMini(dias[0]) + ' y ' + fMini(dias[1]) : fLarga(dias[0]))),
      el('div', { class: 'mp-dias' }, cards),
      regs.length ? el('div', { class: 'mp-fs' }, el('span', {}, ico('coin'), ' Ventas ', el('b', {}, Q(tv))), el('span', {}, ico('pct'), ' Comisión ', el('b', {}, Q(tv * pct / 100))), el('span', {}, ico('safe'), ' En caja al final ', el('b', {}, Q(last.total)))) : null);
  }
  function calendario() {
    const ym = S.calYm || mesDe(S.fecha), [y, m] = ym.split('-').map(Number), lead = (new Date(y, m - 1, 1, 12).getDay() + 6) % 7, dim = new Date(y, m, 0).getDate(), t = hoy();
    const cab = el('div', { class: 'mp-ch' }, btn('', 'left', () => { S.calYm = sumaMes(ym, -1); cargar(true); }, 'btn-ghost', 'Mes anterior'), el('b', {}, mayus(nombreMes(ym))), btn('', 'right', () => { S.calYm = sumaMes(ym, 1); cargar(true); }, 'btn-ghost', 'Mes siguiente'));
    const g = el('div', { class: 'mp-cal' });
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((d, i) => g.append(el('span', { class: 'mp-cd' + (i > 4 ? ' mp-fin' : '') }, d)));
    for (let i = 0; i < lead; i++) g.append(el('span'));
    for (let d = 1; d <= dim; d++) {
      const iso = ym + '-' + String(d).padStart(2, '0'), fin = esFin(iso), reg = S.calSet.has(iso);
      g.append(el('button', { type: 'button', class: 'mp-c' + (fin ? ' mp-fin' : ' mp-sem') + (reg ? ' mp-reg' : '') + (iso === S.fecha ? ' mp-sel' : '') + (iso === t ? ' mp-hoy' : '') + (iso > t ? ' mp-fut' : ''), title: reg ? 'Registrado' : fin ? (iso > t ? 'Aún no llega' : 'Sin registrar') : 'Día no registrado', onclick: () => irA(iso) }, String(d)));
    }
    const ex = el('input', { type: 'date', max: t, value: S.extra, 'aria-label': 'Fecha del día extraordinario', onchange: e => { S.extra = e.target.value; } });
    return el('div', { class: 'mp-calc2' }, cab, g,
      el('div', { class: 'mp-leyenda' }, el('span', {}, el('i', { class: 'mp-pt mp-pt-reg' }), 'registrado'), el('span', {}, el('i', { class: 'mp-pt mp-pt-hoy' }), 'hoy'), el('span', {}, el('i', { class: 'mp-pt mp-pt-sem' }), 'entre semana')),
      el('details', { class: 'mp-ex', open: S.extra ? true : null }, el('summary', {}, ico('plus'), ' Agregar día extraordinario'), el('div', { class: 'mp-acts' }, ex, btn('Agregar', 'check', () => registrarDia(S.extra || ex.value), 'btn-gold'))),
      btn('Ir al último fin de semana', null, () => irA(diaInicial()), 'btn-ghost'));
  }
  function diaNoRegistrado() {
    const f = S.fecha, n = ahoraGT(), fin = esFin(f);
    const msg = !fin ? ['Día no registrado', 'Solo trabajas sábados y domingos, por eso este día no se crea. Si hubo un día extraordinario, agrégalo en el calendario con su fecha.']
      : f > n.f ? ['Aún no llega este día', 'El sábado y el domingo se crean solos desde las 10 am del propio día.']
        : ['Este día no se registró', 'Si trabajaste ese día y no se creó, puedes registrarlo ahora.'];
    return el('div', { class: 'card mp-nr' }, el('h3', {}, ico('cal'), ' ', msg[0], ' · ', fLarga(f)), el('p', { class: 'muted' }, msg[1]),
      el('div', { class: 'mp-acts' }, fin && f <= n.f ? btn('Registrar este día', 'plus', () => registrarDia(f), 'btn-gold') : null, btn('Ir al último fin de semana', null, () => irA(diaInicial()))));
  }

  /* ---------- 1 · corte del día · ① ingreso → ② ventas → ③ salidas → ④ total ---------- */
  function cadena() {
    const sd = saldoDe(S.fecha), t = totalDia(S.fecha);
    const paso = (n, ico_, tit, val, sub, cls) => el('div', { class: 'mp-paso ' + cls }, el('span', { class: 'mp-pn2' }, n), el('div', {}, el('small', { class: 'mp-kl' }, ico(ico_), ' ', tit), el('b', {}, val), el('small', { class: 'muted' }, sub)));
    return el('div', { class: 'mp-cadena' },
      paso('1', 'safe', 'Ingreso en caja', Q(sd.v), sd.estado === 'pendiente' ? 'falta indicarlo' : sd.estado === 'auto' ? 'viene del sábado' : 'lo que te dieron', sd.estado === 'pendiente' ? 'mp-p1 mp-pend' : 'mp-p1'),
      paso('2', 'coin', 'Ventas del día', Q(t.ventas), 'Efectivo ' + money(t.ef) + ' · Tarjeta ' + money(t.ta) + ' · Depósito ' + money(t.de), 'mp-p2'),
      paso('3', 'out', 'Salidas', Q(t.eg), 'egresos del día', 'mp-p3'),
      paso('4', 'box', 'Total en caja', Q(t.total), 'ingreso + efectivo − salidas', 'mp-p4'));
  }
  function vistaCorte() {
    const w = el('div', {}); w.append(cadena());
    const g = el('div', { class: 'mp-grid' });
    const izq = el('div', { class: 'mp-col' }); izq.append(bloqueIngreso(), formFactura(), listaFacturas(), bloqueEgresos(), bloqueTotal());
    const der = el('div', { class: 'mp-col mp-sticky' });
    der.append(el('div', { class: 'card' }, el('h3', {}, ico('img'), ' Corte de caja · vista previa'),
      el('p', { class: 'muted' }, 'Se actualiza sola mientras agregas facturas, salidas o el ingreso en caja. Tamaño oficio horizontal.'), el('canvas', { class: 'mp-cv', 'aria-label': 'Corte de caja' }),
      el('div', { class: 'mp-acts' }, btn('Ver en grande', 'zoom', abrirGrande, 'btn-gold'), btn('Guardar PNG (oficio)', 'down', descargarPNG), btn('Copiar imagen', 'copy', copiarPNG))));
    g.append(izq, der); w.append(g);
    return w;
  }

  function bloqueIngreso() {
    const sd = saldoDe(S.fecha), f = S.fecha, dom = parte(f).dow === 0, sab = mover(f, -1);
    const inp = el('input', { inputmode: 'decimal', value: sd.estado === 'pendiente' && !sd.v ? '' : String(sd.v), placeholder: '0.00', 'aria-label': 'Ingreso en caja', 'data-num': '1', onkeydown: e => { if (e.key === 'Enter') guardarSaldo(f, inp.value); } });
    const nota = sd.estado === 'pendiente'
      ? el('p', { class: 'mp-warn' }, ico('warn'), ' Falta el ingreso en caja de hoy: es el dinero que te entrega tu compañero al empezar. ' + (S.hint ? 'Referencia: el ' + fCorta(S.hint.fecha) + ' terminó con ' + Q(S.hint.monto) + ' (' + S.hint.tipo + ').' : ''))
      : sd.estado === 'auto' ? el('p', { class: 'muted' }, 'Automático: es el total en caja del sábado ' + fCorta(sab) + ' (' + Q(sd.v) + '). Se corrige solo si cambias algo del sábado.')
        : el('p', { class: 'muted' }, dom && S.D.cortes[sab] ? 'Lo escribiste a mano para este día.' : 'Guardado para este día.');
    return el('div', { class: 'card' + (sd.estado === 'pendiente' ? ' mp-needs' : '') }, el('h3', {}, el('span', { class: 'mp-bn' }, '1'), ' Ingreso en caja'), nota,
      el('div', { class: 'mp-acts' }, el('span', { class: 'mp-q' }, 'Q'), inp, btn('Guardar ingreso', 'check', () => guardarSaldo(f, inp.value), 'btn-gold'),
        S.hint && sd.estado === 'pendiente' ? btn('Usar ' + Q(S.hint.monto), null, () => { inp.value = String(S.hint.monto); inp.focus(); }) : null,
        dom && S.D.cortes[sab] && sd.estado === 'manual' ? btn('Volver al automático (' + Q(totalDia(sab).total) + ')', null, () => guardarSaldo(f, 0, false)) : null));
  }

  function formFactura() {
    const f = S.form || (S.form = formVacio());
    const gap = (() => { const n = parseInt(f.recibo, 10); const prev = facsDe(S.fecha).filter(x => x.id !== f.id).map(x => parseInt(x.recibo, 10)).filter(isFinite); if (!isFinite(n) || !prev.length || f.id) return ''; const m = Math.max(...prev); return n > m + 1 || n <= m ? 'El último recibo de hoy fue el ' + m + '. ¿Seguro que es el ' + n + '?' : ''; })();
    const inRec = el('input', { class: 'mp-frec', inputmode: 'numeric', value: f.recibo, oninput: e => { f.recibo = e.target.value; }, onchange: () => pintar() });
    const inNom = el('input', { class: 'mp-fnombre', value: f.nombre, placeholder: 'Nombre completo o CF', autocomplete: 'off', oninput: e => { f.nombre = e.target.value; } });
    const inMonto = el('input', { class: 'mp-fmonto', inputmode: 'decimal', value: f.monto, placeholder: '0.00', 'data-num': '1', oninput: e => { f.monto = e.target.value; }, onkeydown: e => { if (e.key === 'Enter') guardarFactura(); } });
    const met = el('div', { class: 'mp-met' }, [['efectivo', 'Efectivo', 'cash'], ['tarjeta', 'Tarjeta', 'card'], ['deposito', 'Depósito', 'bank']].map(([k, t, i]) =>
      el('button', { type: 'button', class: 'mp-m mp-m-' + k, 'aria-pressed': String(f.metodo === k), onclick: () => { f.metodo = k; pintar(); } }, ico(i), ' ', t)));
    const prods = el('div', { class: 'mp-prods' });
    f.prods.forEach((p, i) => {
      const c = el('input', { class: 'mp-pc', value: p.codigo, placeholder: 'Código (pega aquí)', autocomplete: 'off', oninput: e => { p.codigo = e.target.value; },
        onpaste: e => {
          const t = (e.clipboardData || window.clipboardData).getData('text'); if (!/[\r\n]/.test(String(t).trim())) return;
          e.preventDefault(); const ps = parsearProductos(t); if (!ps.length) return; f.prods.splice(i, 1, ...ps); pintar();
        } });
      const q = el('input', { class: 'mp-pq', type: 'number', min: '1', value: p.cant, 'aria-label': 'Cantidad', oninput: e => { p.cant = e.target.value; } });
      prods.append(el('div', { class: 'mp-pr' }, el('span', { class: 'mp-pn' }, String(i + 1)), c, q, f.prods.length > 1 ? btn('', 'x', () => { f.prods.splice(i, 1); pintar(); }, 'btn-ghost', 'Quitar') : null));
    });
    return el('div', { class: 'card' },
      el('h3', {}, el('span', { class: 'mp-bn' }, '2'), ' ', ico(f.id ? 'edit' : 'plus'), f.id ? ' Editando factura ' + f.recibo : ' Ventas · agregar factura'),
      el('div', { class: 'mp-f3' }, field('Recibo', inRec), field('Nombre', inNom), field('Monto (Q)', inMonto)),
      gap ? el('p', { class: 'mp-warn' }, ico('warn'), ' ', gap) : null,
      el('div', { class: 'field' }, el('label', {}, 'Forma de pago'), met),
      f.metodo === 'deposito'
        ? field('Número de depósito (va en observaciones)', el('input', { value: f.obs, placeholder: 'Ej. 123456789', inputmode: 'numeric', oninput: e => { f.obs = e.target.value; } }))
        : field('Observaciones (opcional)', el('input', { value: f.obs, oninput: e => { f.obs = e.target.value; } })),
      el('div', { class: 'field' }, el('label', {}, 'Productos de la factura (para el Drive)'), prods,
        el('div', { class: 'mp-acts' }, btn('Agregar producto', 'plus', () => { f.prods.push({ codigo: '', cant: 1 }); pintar(); const c = host.querySelectorAll('.mp-pc'); c[c.length - 1] && c[c.length - 1].focus(); }),
          el('small', { class: 'muted' }, 'Pega tal cual: si copias varias líneas de la factura, se reparten solas y el formato se limpia.'))),
      el('div', { class: 'mp-acts' }, btn(f.id ? 'Guardar cambios' : 'Agregar factura', 'check', guardarFactura, 'btn-gold'), f.id ? btn('Cancelar', 'x', () => { S.form = formVacio(); S.form.recibo = sugerirRecibo(); pintar(); }) : null));
  }
  const field = (l, i) => el('div', { class: 'field' }, el('label', {}, l), i);

  function listaFacturas() {
    const fa = facsDe(S.fecha);
    const c = el('div', { class: 'card' }, el('h3', {}, ico('sheet'), ' Facturas de este día ', el('span', { class: 'mp-n' }, String(fa.length))));
    if (!fa.length) { c.append(el('p', { class: 'muted' }, 'Aún no hay facturas. Agrega la primera arriba.')); return c; }
    const l = el('div', { class: 'mp-lista' });
    fa.forEach((f, i) => {
      const k = num(f.efectivo) > 0 ? ['efectivo', 'cash', 'Efectivo', f.efectivo] : num(f.deposito) > 0 ? ['deposito', 'bank', 'Depósito', f.deposito] : ['tarjeta', 'card', 'Tarjeta', f.tarjeta];
      const ps = (f.productos || []), ob = f.observaciones || f.referencia;
      l.append(el('div', { class: 'mp-fila' + (S.form && S.form.id === f.id ? ' mp-on' : '') },
        el('span', { class: 'mp-num' }, String(i + 1)),
        el('div', { class: 'mp-fi' }, el('b', {}, f.nombre || 'CF'), el('small', { class: 'muted' }, 'Recibo ' + f.recibo + (k[0] === 'deposito' && ob ? ' · Depósito ' + ob : '') + ' · ' + (ps.length ? ps.map(p => p.codigo + (p.cant > 1 ? ' ×' + p.cant : '')).join(', ') : 'sin productos ⚠'))),
        el('span', { class: 'mp-tag mp-' + k[0] }, ico(k[1]), ' ', k[2]), el('b', { class: 'mp-mo' }, Q(k[3])),
        el('div', { class: 'mp-ac' }, btn('', 'edit', () => editarFactura(f), 'btn-ghost', 'Editar'), btn(S.confirmar === 'f' + f.id ? '¿Seguro?' : '', 'trash', () => borrar('mp_facturas', f.id, 'f' + f.id), S.confirmar === 'f' + f.id ? 'btn-gold' : 'btn-ghost', 'Borrar'))));
    });
    c.append(l); return c;
  }

  function bloqueEgresos() {
    const eg = egsDe(S.fecha), nom = el('input', { placeholder: 'Concepto (gasto, depósito a banco…)' }), rec = el('input', { placeholder: 'Recibo', inputmode: 'numeric' }), cant = el('input', { placeholder: '0.00', inputmode: 'decimal', 'data-num': '1' });
    const c = el('div', { class: 'card' }, el('h3', {}, el('span', { class: 'mp-bn' }, '3'), ' ', ico('out'), ' Salidas de efectivo ', el('span', { class: 'mp-n' }, String(eg.length))),
      el('p', { class: 'muted' }, 'Todo lo que sale de la caja en efectivo (gastos o si depositas efectivo al banco) resta del total en caja.'));
    eg.forEach((e, i) => c.append(el('div', { class: 'mp-fila' }, el('span', { class: 'mp-num' }, String(i + 1)), el('div', { class: 'mp-fi' }, el('b', {}, e.nombre || '—'), el('small', { class: 'muted' }, e.recibo ? 'Recibo ' + e.recibo : '')), el('b', { class: 'mp-mo' }, '− ' + Q(e.cantidad)), btn(S.confirmar === 'e' + e.id ? '¿Seguro?' : '', 'trash', () => borrar('mp_egresos', e.id, 'e' + e.id), S.confirmar === 'e' + e.id ? 'btn-gold' : 'btn-ghost'))));
    c.append(el('div', { class: 'mp-f3' }, field('Recibo', rec), field('Concepto', nom), field('Cantidad (Q)', cant)),
      el('div', { class: 'mp-acts' }, btn('Agregar salida', 'plus', () => { if (!(num(cant.value) > 0)) { ctx.toast('Falta la cantidad'); return; } agregarEgreso({ recibo: limpiar(rec.value), nombre: limpiar(nom.value).toUpperCase(), cantidad: r2(num(cant.value)) }); })));
    return c;
  }

  function bloqueTotal() {
    const t = totalDia(S.fecha), cn = contado((S.D.cortes[S.fecha] || {}).billetes);
    const caja = (l, v, cls) => el('div', { class: 'mp-eq ' + (cls || '') }, el('small', { class: 'muted' }, l), el('b', {}, v));
    return el('div', { class: 'card mp-totalc' }, el('h3', {}, el('span', { class: 'mp-bn' }, '4'), ' ', ico('box'), ' Total en caja'),
      el('div', { class: 'mp-eqs' }, caja('Ingreso en caja', Q(t.saldo)), el('i', {}, '+'), caja('Efectivo de ventas', Q(t.ef)), el('i', {}, '−'), caja('Salidas', Q(t.eg)), el('i', {}, '='), caja('Total en caja', Q(t.total), 'mp-eqt')),
      el('p', { class: 'muted' }, 'Tarjeta (' + Q(t.ta) + ') y depósitos (' + Q(t.de) + ') se cuentan en las ventas pero no entran a la caja.'),
      el('div', { class: 'mp-acts' }, btn('Contar billetes y ver el fin de semana', 'safe', () => { S.vista = 'caja'; pintar(); window.scrollTo({ top: 0 }); }, 'btn-gold'), cn > 0 ? chip('Contado ' + Q(cn), 'mp-ok', 'check') : null));
  }

  /* ---------- 2 · caja del fin de semana ---------- */
  function vistaCaja() {
    const dias = diasSemana(S.fecha), w = el('div', {});
    const regs = dias.filter(registrado);
    const flujo = el('div', { class: 'mp-flujo' });
    regs.forEach((f, idx) => {
      const sd = saldoDe(f), t = totalDia(f), p = parte(f), cn = contado((S.D.cortes[f] || {}).billetes);
      const b = (l, v, c, sub) => el('div', { class: 'mp-fb ' + c }, el('small', {}, l), el('b', {}, v), sub ? el('small', { class: 'muted' }, sub) : null);
      if (idx) flujo.append(el('div', { class: 'mp-pasa' }, ico('right'), el('small', {}, 'pasa al ' + DIA[p.dow])));
      flujo.append(el('div', { class: 'card mp-fd' }, el('h3', {}, ico('cal'), ' ', mayus(DIA[p.dow]) + ' ' + p.d + ' de ' + MES[p.m - 1], ' ', sd.estado === 'pendiente' ? chip('Falta ingreso en caja', 'mp-mal', 'warn') : null),
        el('div', { class: 'mp-fr' },
          b('Ingreso en caja', Q(sd.v), 'mp-b1', sd.estado === 'auto' ? 'del sábado' : sd.estado === 'pendiente' ? 'falta indicarlo' : 'lo que te dieron'), el('i', {}, '+'),
          b('Efectivo de ventas', Q(t.ef), 'mp-b2', t.ef ? '' : 'sin ventas en efectivo'), el('i', {}, '−'),
          b('Salidas', Q(t.eg), 'mp-b3', t.eg ? 'egresos / depósitos de efectivo' : 'sin salidas'), el('i', {}, '='),
          b('Total en caja', Q(t.total), 'mp-b4', cn > 0 ? 'contado ' + Q(cn) : 'sin contar')),
        el('p', { class: 'muted' }, 'Aparte, no entran a la caja: tarjeta ' + Q(t.ta) + ' y depósitos ' + Q(t.de) + '.'),
        btn('Editar ' + DIA[p.dow], 'edit', () => irA(f, 'corte'))));
    });
    w.append(flujo);
    const tv = r2(regs.reduce((a, f) => a + totalDia(f).ventas, 0)), te = r2(regs.reduce((a, f) => a + totalDia(f).ef, 0)), tg = r2(regs.reduce((a, f) => a + totalDia(f).eg, 0)), last = totalDia(regs[regs.length - 1]);
    w.append(el('div', { class: 'mp-kpis' },
      kpi('coin', 'Ventas del fin de semana', Q(tv), 'mp-k1'), kpi('cash', 'Efectivo vendido', Q(te), 'mp-k2'), kpi('out', 'Salidas', Q(tg), 'mp-k4'), kpi('box', 'Debe haber en caja', Q(last.total), 'mp-k5 mp-grande')));
    const cg = el('div', { class: 'mp-grid2' }); regs.forEach(f => cg.append(conteoCard(f))); w.append(cg);
    return w;
  }
  const kpi = (i, l, v, c) => el('div', { class: 'mp-kpi ' + c }, el('span', { class: 'mp-kl' }, ico(i), ' ', l), el('b', {}, v));

  /* conteo de billetes: cada billete suma solo, y te dice cuánto sobra o falta */
  function conteoCard(f) {
    const b = Object.assign({}, (S.D.cortes[f] || {}).billetes), t = totalDia(f), p = parte(f), ins = {}, subs = {};
    const tot = el('b', { class: 'mp-tb' }), dif = el('div', { class: 'mp-dif' }), barra = el('i');
    const leer = () => { const o = {}; DEN.forEach(d => { o[d] = Math.max(0, parseInt(ins[d].value, 10) || 0); }); o.mon = r2(num(ins.mon.value)); o.extra = r2(num(ins.extra.value)); return o; };
    const calc = () => {
      const o = leer(); DEN.forEach(d => { subs[d].textContent = o[d] ? '= ' + Q(o[d] * d) : ''; });
      const c = contado(o), d = r2(c - t.total); tot.textContent = Q(c);
      dif.className = 'mp-dif ' + (c === 0 ? 'mp-d0' : d === 0 ? 'mp-d1' : d > 0 ? 'mp-d2' : 'mp-d3');
      dif.textContent = c === 0 ? 'Cuenta tus billetes y verás aquí cuánto sobra o falta' : d === 0 ? '✓ Cuadra exacto' : d > 0 ? 'Te sobra ' + Q(d) : 'Te falta ' + Q(-d);
      barra.style.width = Math.min(100, t.total > 0 ? c / t.total * 100 : 0) + '%'; barra.className = d === 0 && c > 0 ? 'mp-bok' : d > 0 ? 'mp-bsob' : '';
    };
    const g = el('div', { class: 'mp-bill' });
    DEN.forEach(d => { ins[d] = el('input', { type: 'number', min: '0', value: b[d] || '', placeholder: '0', oninput: calc, 'aria-label': 'Billetes de ' + d }); subs[d] = el('small', { class: 'mp-sub2' }); g.append(el('label', {}, el('span', { class: 'mp-den' }, 'Q' + d), ins[d], subs[d])); });
    ins.mon = el('input', { inputmode: 'decimal', 'data-num': '1', value: b.mon || '', placeholder: '0.00', oninput: calc }); ins.extra = el('input', { inputmode: 'decimal', 'data-num': '1', value: b.extra || '', placeholder: '0.00', oninput: calc });
    g.append(el('label', {}, el('span', { class: 'mp-den' }, 'Monedas Q'), ins.mon), el('label', {}, el('span', { class: 'mp-den' }, 'Extra Q'), ins.extra));
    const c = el('div', { class: 'card' }, el('h3', {}, ico('cash'), ' Conteo · ' + mayus(DIA[p.dow]) + ' ' + p.d), g,
      el('div', { class: 'mp-sumas' }, el('span', {}, 'Contado ', tot), el('span', {}, 'Sistema ', el('b', {}, Q(t.total)))), el('div', { class: 'mp-barra' }, barra), dif,
      el('div', { class: 'mp-acts' }, btn('Guardar conteo', 'check', () => guardarBilletes(f, leer()), 'btn-gold')));
    calc(); return c;
  }

  /* ---------- 3 · para el Drive ---------- */
  function vistaDrive() {
    const w = el('div', {});
    const d = textoDrive(facsDe(S.fecha), S.fecha);
    w.append(el('div', { class: 'card mp-guia' }, el('h3', {}, ico('sheet'), ' Cómo pegarlo en el Drive'),
      el('div', { class: 'mp-pasos' },
        el('div', {}, el('b', {}, '1'), el('span', {}, 'Copia el Bloque 1 y pégalo en la primera casilla libre de la columna FECHA (el código queda a su lado).')),
        el('div', {}, el('b', {}, '2'), el('span', {}, 'Copia el Bloque 2 y pégalo en la misma fila, empezando en la casilla vacía a la derecha del nombre. Así no pisas la fórmula del nombre.')),
        el('div', {}, el('b', {}, '3'), el('span', {}, 'Cada producto lleva su renglón: cantidad · vacío · FACTURADO · R-recibo. Es texto plano: toma la letra y el formato de tu hoja.')))));
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

  /* ---------- 4 · ventas y comisión ---------- */
  function vistaVentas() {
    const pctv = num(S.cfg.porcentaje) || 0, nc = num(S.cfg['nc:' + S.mes]);
    const dias = [...new Set([...Object.keys(S.D.cortes), ...S.D.facs.map(f => f.fecha)])].filter(f => mesDe(f) === S.mes).sort();
    const filas = dias.map(f => ({ f, t: totalDia(f), c: contado((S.D.cortes[f] || {}).billetes), n: facsDe(f).length }));
    const total = r2(filas.reduce((a, x) => a + x.t.ventas, 0)), com = r2(total * pctv / 100 - nc), max = Math.max(1, ...filas.map(x => x.t.ventas));
    const w = el('div', {});
    w.append(el('div', { class: 'mp-fecha' }, btn('', 'left', () => { S.mes = sumaMes(S.mes, -1); cargar(true); }, 'btn-ghost', 'Mes anterior'), el('div', { class: 'mp-fechab' }, ico('cal'), el('b', {}, mayus(nombreMes(S.mes)))), btn('', 'right', () => { S.mes = sumaMes(S.mes, 1); cargar(true); }, 'btn-ghost', 'Mes siguiente'), btn('Este mes', null, () => { S.mes = mesDe(hoy()); cargar(true); })));
    const pin = el('input', { inputmode: 'decimal', value: String(pctv), 'aria-label': 'Porcentaje', 'data-num': '1' }), ncin = el('input', { inputmode: 'decimal', value: nc ? String(nc) : '', placeholder: '0.00', 'aria-label': 'No corresponde', 'data-num': '1' });
    w.append(el('div', { class: 'mp-kpis' }, kpi('coin', 'Ventas del mes', Q(total), 'mp-k1'), kpi('pct', 'Comisión (' + pctv + '%)', Q(r2(total * pctv / 100)), 'mp-k3'), kpi('x', 'No corresponde', Q(nc), 'mp-k4'), kpi('check', 'Comisión a recibir', Q(com), 'mp-k5 mp-grande')));
    w.append(el('div', { class: 'card' }, el('h3', {}, ico('pct'), ' Cómo se calcula'),
      el('div', { class: 'mp-calc' }, el('span', {}, 'Ventas ', el('b', {}, Q(total))), el('i', {}, '×'), el('label', { class: 'mp-mini' }, pin, '%'), el('i', {}, '−'), el('label', { class: 'mp-mini' }, 'Q', ncin, ' no corresponde'), el('i', {}, '='), el('b', { class: 'mp-res' }, Q(com))),
      el('div', { class: 'mp-acts' }, btn('Guardar % y «no corresponde»', 'check', async () => {
        try {
          await send('POST', 'mp_config?on_conflict=clave', [{ clave: 'porcentaje', valor: String(num(pin.value)) }, { clave: 'nc:' + S.mes, valor: String(r2(num(ncin.value))) }], 'resolution=merge-duplicates,return=minimal');
          ctx.toast('Guardado'); await cargar(true);
        } catch (e) { ctx.toast(e.message); }
      }, 'btn-gold'), el('small', { class: 'muted' }, 'El porcentaje vale para todos los meses; «no corresponde» es de este mes.'))));
    const c = el('div', { class: 'card' }, el('h3', {}, ico('sheet'), ' Registro de ventas por día'));
    if (!filas.length) c.append(el('p', { class: 'muted' }, 'No hay ventas registradas en este mes.'));
    else {
      const grupos = []; filas.forEach(x => { const p = parte(x.f); const lun = mover(x.f, -((p.dow + 6) % 7)); let g = grupos.find(z => z.lun === lun); if (!g) grupos.push(g = { lun, items: [] }); g.items.push(x); });
      const tb = el('div', { class: 'mp-reg' });
      tb.append(el('div', { class: 'mp-rh' }, el('span', {}, 'Fecha'), el('span', {}, 'Monto vendido'), el('span', {}, ''), el('span', {}, 'Comisión'), el('span', {}, 'Total en caja'), el('span', {}, 'Contado'), el('span', {}, 'Diferencia')));
      grupos.forEach(g => {
        const sub = r2(g.items.reduce((a, x) => a + x.t.ventas, 0));
        g.items.forEach(x => {
          const dif = x.c > 0 ? r2(x.c - x.t.total) : null;
          tb.append(el('button', { type: 'button', class: 'mp-rr', onclick: () => irA(x.f, 'corte'), title: 'Abrir este día' },
            el('span', { class: 'mp-rf' }, el('b', {}, fCorta(x.f)), el('small', { class: 'muted' }, ' ' + DIA[parte(x.f).dow] + (esFin(x.f) ? '' : ' (extraordinario)') + ' · ' + x.n + ' fact.')),
            el('b', {}, Q(x.t.ventas)), el('span', { class: 'mp-bar' }, el('i', { style: 'width:' + Math.max(2, x.t.ventas / max * 100) + '%' })),
            el('span', {}, Q(x.t.ventas * pctv / 100)), el('span', {}, Q(x.t.total)), el('span', {}, x.c > 0 ? Q(x.c) : '—'), el('span', { class: dif == null ? '' : dif === 0 ? 'mp-okt' : 'mp-malt' }, dif == null ? '—' : dif === 0 ? 'Cuadra' : (dif > 0 ? '+' : '−') + money(Math.abs(dif)))));
        });
        if (g.items.length > 1) tb.append(el('div', { class: 'mp-sub' }, el('span', {}, 'Fin de semana · ' + fCorta(g.items[0].f) + ' al ' + fCorta(g.items[g.items.length - 1].f)), el('b', {}, Q(sub)), el('span'), el('span', {}, Q(sub * pctv / 100)), el('span'), el('span'), el('span')));
      });
      c.append(tb);
    }
    w.append(c);
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
.mp-seg{display:inline-flex;flex-wrap:wrap;border:1px solid var(--line);border-radius:22px;overflow:hidden;background:var(--soft)}
.mp-seg button{border:0;background:none;color:var(--text);padding:10px 16px;cursor:pointer;font:inherit;font-size:.93rem;display:flex;align-items:center;gap:6px}
.mp-seg button[aria-pressed="true"]{background:var(--oro);color:#252528;font-weight:700}
.mp-fecha{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.mp-fechab{display:flex;gap:8px;align-items:center;padding:8px 16px;border-radius:12px;background:var(--soft);border:1px solid var(--line);font-size:1.05rem}
.mp-tag{display:inline-flex;gap:5px;align-items:center;padding:3px 11px;border-radius:999px;font-size:.78rem;font-weight:700;border:1px solid var(--line);white-space:nowrap}
.mp-efectivo{background:rgba(94,158,107,.2);border-color:rgba(94,158,107,.7)}.mp-tarjeta{background:rgba(88,140,220,.2);border-color:rgba(88,140,220,.7)}.mp-deposito{background:rgba(226,190,70,.22);border-color:rgba(226,190,70,.8)}
.mp-ok{background:rgba(94,158,107,.22);border-color:rgba(94,158,107,.8)}.mp-mal{background:rgba(217,90,106,.2);border-color:rgba(217,90,106,.8)}.mp-gris{background:var(--soft);color:var(--muted)}
.mp-top{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:14px;margin-bottom:16px;align-items:start}@media (max-width:980px){.mp-top{grid-template-columns:1fr}}
.mp-semana{border:1px solid var(--line);border-radius:18px;padding:14px;background:var(--soft);display:grid;gap:12px}.mp-sh{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.mp-dias{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.mp-dia{display:grid;gap:6px;text-align:left;padding:14px 16px;border-radius:16px;border:2px solid var(--line);background:var(--surface,#fff);color:var(--text);cursor:pointer;font:inherit;justify-items:start;box-shadow:0 10px 24px -20px rgba(0,0,0,.6)}
.mp-dia:hover{border-color:var(--oro)}.mp-dia.mp-sel{border-color:var(--oro);box-shadow:0 0 0 3px rgba(184,160,106,.35)}.mp-dia.mp-vacio{opacity:.75;border-style:dashed}.mp-dn{font-size:1.2rem}
.mp-dm{display:grid;gap:2px;font-size:.92rem;width:100%}.mp-dm span{display:flex;justify-content:space-between;gap:10px}
.mp-fs{display:flex;gap:10px 22px;flex-wrap:wrap;padding-top:8px;border-top:1px dashed var(--line)}.mp-fs span{display:flex;gap:6px;align-items:center}
.mp-calc2{border:1px solid var(--line);border-radius:18px;padding:12px;background:var(--soft);display:grid;gap:8px}.mp-ch{display:flex;justify-content:space-between;align-items:center}
.mp-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center}.mp-cd{font-size:.72rem;color:var(--muted);font-weight:700;padding:2px 0}.mp-cd.mp-fin{color:var(--oro-t)}
.mp-c{position:relative;aspect-ratio:1;border-radius:10px;border:1px solid transparent;background:none;color:var(--muted);font:inherit;font-size:.86rem;cursor:pointer;opacity:.55}
.mp-c.mp-fin{opacity:1;color:var(--text);font-weight:700;background:rgba(184,160,106,.14)}.mp-c:hover{border-color:var(--oro)}
.mp-c.mp-reg::after{content:'';position:absolute;left:50%;bottom:3px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:#5E9E6B}
.mp-c.mp-hoy{border-color:#588CDC}.mp-c.mp-sel{background:var(--oro);color:#252528;opacity:1;font-weight:700}.mp-c.mp-fut.mp-fin{opacity:.6}
.mp-leyenda{display:flex;gap:10px;flex-wrap:wrap;font-size:.72rem;color:var(--muted)}.mp-leyenda span{display:flex;gap:4px;align-items:center}.mp-pt{display:inline-block;width:8px;height:8px;border-radius:50%}
.mp-pt-reg{background:#5E9E6B}.mp-pt-hoy{border:2px solid #588CDC;width:10px;height:10px;box-sizing:border-box}.mp-pt-sem{background:var(--line)}
.mp-ex summary{cursor:pointer;font-weight:700;display:flex;gap:6px;align-items:center}.mp-ex .mp-acts input{flex:1 1 130px;min-width:0}
.mp-cadena{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:26px;margin-bottom:16px}@media (max-width:980px){.mp-cadena{grid-template-columns:repeat(2,1fr);gap:14px}}@media (max-width:520px){.mp-cadena{grid-template-columns:1fr}}
.mp-paso{position:relative;display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:16px;border:1px solid var(--line);border-left:6px solid var(--oro);background:var(--soft);box-shadow:0 10px 24px -20px rgba(0,0,0,.6)}
.mp-paso:not(:last-child)::after{content:'›';position:absolute;right:-20px;top:50%;margin-top:-16px;font-size:2rem;color:var(--oro-t);line-height:1}@media (max-width:980px){.mp-paso::after{display:none}}
.mp-paso>div{display:grid;gap:3px;min-width:0}.mp-paso b{font-size:1.4rem}.mp-pn2{flex:none;width:28px;height:28px;border-radius:50%;background:var(--oro);color:#252528;font-weight:700;display:grid;place-items:center}
.mp-p1{border-left-color:#B8A06A}.mp-p2{border-left-color:#588CDC}.mp-p3{border-left-color:#D95A6A}.mp-p4{border-left-color:#5E9E6B}.mp-pend{border-color:rgba(217,90,106,.7);background:rgba(217,90,106,.12)}
.mp-needs{border:2px solid rgba(217,90,106,.7)}
.mp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:0 0 16px}
.mp-kpi{padding:14px 16px;border-radius:16px;border:1px solid var(--line);display:grid;gap:4px;box-shadow:0 10px 24px -18px rgba(0,0,0,.6);background:var(--soft);border-left:5px solid var(--oro)}
.mp-kl{font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.mp-kpi b{font-size:1.45rem}
.mp-k1{border-left-color:#B8A06A}.mp-k2{border-left-color:#5E9E6B}.mp-k3{border-left-color:#588CDC}.mp-k4{border-left-color:#E2BE46}.mp-k5{border-left-color:#E9B28A}
.mp-grande b{font-size:1.9rem;color:var(--oro-t)}
.mp-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:16px;align-items:start}.mp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
@media (max-width:1100px){.mp-grid,.mp-grid2{grid-template-columns:1fr}}
.mp-col{display:grid;gap:14px;min-width:0}.mp-sticky{position:sticky;top:12px}@media (max-width:1100px){.mp-sticky{position:static}}
.mp-col input,.mp-col textarea,.mp-grid2 textarea,.mp-grid2 input{box-sizing:border-box;min-width:0;max-width:100%}.mp-f3>.field,.mp-f2>.field{min-width:0}
.mp-col .card,.mp-grid2 .card{margin:0}.mp-col h3,.mp-grid2 h3,.mp-guia h3,.mp-nr h3,.mp-fd h3{display:flex;align-items:center;gap:8px;margin:0 0 10px;flex-wrap:wrap}
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
.mp-eqs,.mp-fr{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap}.mp-eqs i,.mp-fr i{align-self:center;font-style:normal;font-size:1.5rem;color:var(--muted)}
.mp-eq{display:grid;gap:3px;padding:10px 14px;border-radius:12px;background:var(--soft);border:1px solid var(--line);flex:1;min-width:110px}.mp-eq b{font-size:1.1rem}.mp-eqt{border-color:#5E9E6B;background:rgba(94,158,107,.2)}.mp-eqt b{font-size:1.35rem}
.mp-flujo{display:grid;gap:10px;margin-bottom:16px}.mp-pasa{display:flex;gap:8px;align-items:center;justify-content:center;color:var(--oro-t);font-weight:700}.mp-pasa .mp-i svg{width:1.6em;height:1.6em;transform:rotate(90deg)}
.mp-fd{margin:0}.mp-fb{display:grid;gap:3px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);border-top:5px solid var(--oro);background:var(--soft);flex:1;min-width:130px}.mp-fb b{font-size:1.25rem}.mp-fb small:first-child{letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-size:.7rem}
.mp-b1{border-top-color:#B8A06A}.mp-b2{border-top-color:#5E9E6B}.mp-b3{border-top-color:#D95A6A}.mp-b4{border-top-color:#588CDC;background:rgba(88,140,220,.12)}
.mp-bill{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}.mp-bill label{display:grid;gap:4px}.mp-den{font-weight:700;color:var(--oro-t)}.mp-sub2{color:var(--muted);min-height:1.1em}
.mp-sumas{display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;font-size:1.05rem}.mp-tb{font-size:1.3rem}
.mp-barra{height:12px;border-radius:99px;background:var(--line);overflow:hidden;margin:8px 0}.mp-barra i{display:block;height:100%;width:0;background:#588CDC;transition:width .25s}.mp-barra i.mp-bok{background:#5E9E6B}.mp-barra i.mp-bsob{background:#E2BE46}
.mp-dif{padding:10px 14px;border-radius:12px;font-weight:700;font-size:1.05rem;text-align:center;border:1px solid var(--line)}.mp-d0{background:var(--soft);color:var(--muted);font-weight:400}.mp-d1{background:rgba(94,158,107,.25);border-color:#5E9E6B}.mp-d2{background:rgba(226,190,70,.25);border-color:#E2BE46}.mp-d3{background:rgba(217,90,106,.22);border-color:#D95A6A}
.mp-guia{margin-bottom:14px}.mp-pasos{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.mp-pasos div{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;background:var(--soft);border:1px solid var(--line)}.mp-pasos b,.mp-bn{flex:none;width:28px;height:28px;border-radius:50%;background:var(--oro);color:#252528;display:inline-grid;place-items:center;font-size:.95rem}
.mp-ta{width:100%;font-family:ui-monospace,Menlo,monospace;font-size:.85rem;white-space:pre;overflow:auto}
.mp-calc{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:1.05rem}.mp-calc i{font-style:normal;font-size:1.4rem;color:var(--muted)}.mp-res{font-size:1.5rem;color:var(--oro-t)}
.mp-mini{display:inline-flex;gap:6px;align-items:center}.mp-mini input{width:90px}
.mp-reg{display:grid;gap:4px;overflow-x:auto}.mp-rh,.mp-rr,.mp-sub{display:grid;grid-template-columns:minmax(190px,1.5fr) minmax(120px,1fr) minmax(90px,1fr) minmax(100px,.9fr) minmax(110px,.9fr) minmax(110px,.9fr) minmax(90px,.8fr);gap:10px;align-items:center;padding:8px 12px;border-radius:10px;min-width:820px}
.mp-rh{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.mp-rr{border:1px solid var(--line);background:var(--soft);color:var(--text);font:inherit;cursor:pointer;text-align:left}.mp-rr:hover{border-color:var(--oro)}
.mp-sub{background:rgba(184,160,106,.18);border:1px dashed var(--oro);margin-bottom:8px}.mp-rf{display:grid}.mp-bar{display:block;height:10px;border-radius:99px;background:var(--line);overflow:hidden}.mp-bar i{display:block;height:100%;background:linear-gradient(90deg,#588CDC,#5E9E6B)}
.mp-okt{color:#5E9E6B;font-weight:700}.mp-malt{color:var(--red-t);font-weight:700}
.mp-dw{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.mp-dwc{display:grid;gap:4px;padding:12px 14px;border-radius:14px;background:var(--soft);border:1px solid var(--line)}.mp-dwc b{font-size:1.4rem}
.mp-aviso{border-color:rgba(217,90,106,.5)}.mp-nr{border:2px dashed var(--line)}
.mp-modal{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.82);display:flex;flex-direction:column;padding:12px;gap:10px}
.mp-mh{display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:#fff;background:rgba(15,23,42,.6);padding:8px 12px;border-radius:12px}.mp-mh .muted{color:#cbd5e1}
.mp-mb{flex:1;overflow:auto;display:grid;place-items:center}.mp-cvg{background:#fff;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.6);width:min(100%,calc((100vh - 90px) * 1.5293));height:auto}
.mp-modal.mp-z .mp-mb{place-items:start}.mp-modal.mp-z .mp-cvg{width:2000px;max-width:none}
`));
  }

  window.FaroMusicPro = {
    async iniciar(el_, c) {
      host = el_; ctx = c; S.form = null; S.calYm = null; S.hint = null; S.vista = 'corte';
      if (!pegar) {
        pegar = true;
        /* lo que pegues, de donde sea, entra como texto limpio con la letra del panel */
        host.addEventListener('paste', e => {
          const t = e.target; if (e.defaultPrevented || !t || !/^(INPUT|TEXTAREA)$/.test(t.tagName) || t.readOnly || ['date', 'number', 'checkbox'].includes(t.type)) return;
          const cb = e.clipboardData; if (!cb) return; let x = cb.getData('text/plain'); if (!x) return;
          e.preventDefault(); x = limpiar(x, false);
          if (t.dataset.num) x = x.replace(/[^\d.-]/g, '').replace(/(?!^)-/g, '');
          else if (t.classList.contains('mp-fnombre')) x = x.toUpperCase();
          const a = t.selectionStart == null ? t.value.length : t.selectionStart, b = t.selectionEnd == null ? a : t.selectionEnd;
          t.setRangeText(x, a, b, 'end'); t.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }
      S.fecha = S.fecha || diaInicial(); S.mes = mesDe(S.fecha);
      try { await crearFinDeSemanaAuto(); } catch (e) { /* se reintenta la próxima vez */ }
      cargar();
    }
  };
})();
