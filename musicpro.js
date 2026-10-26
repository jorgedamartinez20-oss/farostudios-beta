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
    chart: '<path d="M4 20V11M10 20V4M16 20v-7M22 20H2"/>', out: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>', safe: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5v1.5M12 14v1.5M8.5 12H10M14 12h1.5"/>'
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
    form: null, edit: null, draft: {}, Yc: {}, anioE: null, mSel: null, falta: false, error: '', cargando: false, confirmar: null, extra: ''
  };
  let host = null, ctx = null, css1 = false, logoImg = null, logoCargando = false, tok = 0, modal = null, pegar = false;

  const formVacio = () => ({ id: null, recibo: '', nombre: '', metodo: 'tarjeta', mixto: false, mx: { efectivo: '', tarjeta: '', deposito: '' }, monto: '', ref: '', banco: '', aut: '', obs: '', prods: [{ codigo: '', cant: 1 }] });
  const montoDe = f => f.mixto ? r2(num(f.mx.efectivo) + num(f.mx.tarjeta) + num(f.mx.deposito)) : r2(num(f.monto));
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
  const esAnulada = f => /^\s*(RECIBO|FACTURA|VOUCHER)\s+ANULAD[OA]/i.test(String((f && f.nombre) || ''));
  const validas = a => a.filter(f => !esAnulada(f));
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

  let loadedKey = null, calKey = null;
  const claveMes = () => S.vista === 'ventas' ? S.mes : mesDe(S.fecha);
  const ocupado = on => { host && host.classList.toggle('mp-busy', on); };
  /* cargar(quiet, force): sin force, si el mes ya está en memoria solo se pinta (instantáneo); force vuelve a leer tras guardar */
  async function cargar(quiet, force) {
    const mi = ++tok, key = claveMes(), cy = S.calYm || mesDe(S.fecha);
    const nuevoMes = !!force || loadedKey !== key;
    if (!nuevoMes) {
      if (!S.form) { S.form = formVacio(); S.form.recibo = sugerirRecibo(); }
      S.cargando = false; pintar(); cargarCal(cy, mi); cargarHint(mi); return;
    }
    if (!quiet || !loadedKey) { S.cargando = !loadedKey; if (S.cargando) pintar(); }
    ocupado(true);
    try {
      const d0 = mover(key + '-01', -3), d1 = mover(sumaMes(key, 1) + '-01', 2), rng = 'fecha=gte.' + d0 + '&fecha=lt.' + d1;
      const [facs, egs, cs, cfg] = await Promise.all([
        get('mp_facturas?select=*&' + rng + '&order=fecha.asc,creado.asc&limit=5000'),
        get('mp_egresos?select=*&' + rng + '&order=creado.asc&limit=5000'),
        get('mp_cortes?select=*&' + rng),
        get('mp_config?select=*')
      ]);
      if (mi !== tok) return;
      const cortes = {}; cs.forEach(c => { cortes[c.fecha] = c; });
      S.D = { facs, egs, cortes }; S.cfg = { porcentaje: '3' }; cfg.forEach(c => { S.cfg[c.clave] = c.valor; });
      loadedKey = key; S.falta = false; S.error = '';
      if (force) { S.hint = null; calKey = null; S.Yc = {}; }
      if (!S.form) { S.form = formVacio(); S.form.recibo = sugerirRecibo(); }
    } catch (e) { if (mi !== tok) return; S.falta = true; S.error = e.message || ''; }
    S.cargando = false; ocupado(false); pintar();
    if (!S.falta) { cargarCal(cy, mi); cargarHint(mi); }
  }
  /* puntos verdes del calendario: aparte y sin bloquear nada */
  async function cargarCal(cy, mi) {
    if (calKey === cy) return;
    try {
      const cal = await get('mp_cortes?select=fecha&fecha=gte.' + cy + '-01&fecha=lt.' + sumaMes(cy, 1) + '-01');
      if (cy !== (S.calYm || mesDe(S.fecha))) return;
      S.calSet = new Set(cal.map(c => c.fecha)); calKey = cy;
      const old = $('.mp-calc2', host); if (old) old.replaceWith(calendario());
    } catch (e) { /* los puntos son solo un adorno */ }
  }
  /* referencia para el sábado: cómo terminó el último corte (solo si falta el ingreso en caja; no bloquea la pantalla) */
  const hintNodes = () => S.hint ? ['Referencia: el ' + fCorta(S.hint.fecha) + ' terminó con ' + Q(S.hint.monto) + ' (' + S.hint.tipo + '). ',
    btn('Usar ' + Q(S.hint.monto), null, () => { const i = $('.mp-ingin', host); if (i) { i.value = String(S.hint.monto); i.focus(); } })] : [];
  async function cargarHint(mi) {
    const f = S.fecha; if (S.vista === 'ventas' || S.vista === 'stats' || !f || !registrado(f) || saldoDe(f).estado !== 'pendiente') return;
    if (S.hint && S.hint.para === f) return;
    try {
      const p = await get('mp_cortes?select=*&fecha=lt.' + f + '&order=fecha.desc&limit=2'); if (!p.length || f !== S.fecha) return;
      const last = p[0], dd = [last.fecha]; if (p[1] && p[1].fecha === mover(last.fecha, -1)) dd.push(p[1].fecha);
      const [fa, eg] = await Promise.all([get('mp_facturas?select=*&fecha=in.(' + dd.join(',') + ')'), get('mp_egresos?select=*&fecha=in.(' + dd.join(',') + ')')]);
      if (f !== S.fecha) return;
      const cortes = {}; p.forEach(c => { cortes[c.fecha] = c; });
      const t = totalDia(last.fecha, { facs: fa, egs: eg, cortes }), cn = contado(last.billetes);
      S.hint = { para: f, fecha: last.fecha, monto: cn > 0 ? cn : t.total, tipo: cn > 0 ? 'lo que contaste' : 'el total en caja' };
      const box = $('.mp-hintbox', host); if (box) box.replaceChildren(...hintNodes());
    } catch (e) { /* es solo una referencia */ }
  }
  /* el recibo siguiente sigue al último del fin de semana (sábado + domingo); si aún no hay, al último anterior */
  const cicloFacs = () => diasSemana(S.fecha).flatMap(f => facsDe(f));
  function sugerirRecibo() {
    const ciclo = cicloFacs().map(f => parseInt(f.recibo, 10)).filter(isFinite);
    if (ciclo.length) return String(ciclo[ciclo.length - 1] + 1);
    const todos = S.D.facs.filter(f => f.fecha <= S.fecha).map(f => parseInt(f.recibo, 10)).filter(isFinite);
    return todos.length ? String(todos[todos.length - 1] + 1) : '';
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
  async function irA(f, vista) { S.open = null; S.hint = null; S.fecha = f; S.calYm = null; S.form = null; S.edit = null; S.confirmar = null; if (vista) S.vista = vista; await cargar(true); }

  /* ---------- guardar ---------- */
  async function guardarSaldo(f, v, manual) {
    try {
      const c = S.D.cortes[f];
      if (c) await send('PATCH', 'mp_cortes?fecha=eq.' + f, { saldo_inicial: r2(num(v)), saldo_manual: manual !== false }); else await send('POST', 'mp_cortes', { fecha: f, saldo_inicial: r2(num(v)), saldo_manual: manual !== false });
      ctx.toast(manual === false ? 'Saldo inicial automático' : 'Saldo inicial guardado'); await cargar(true, true); togglePaso(2, true);
    } catch (e) { ctx.toast(e.message); }
  }
  async function guardarBilletes(f, b) {
    try {
      if (!S.D.cortes[f]) await crearSql(f);
      await send('PATCH', 'mp_cortes?fecha=eq.' + f, { billetes: b }); ctx.toast('Conteo guardado'); delete S.draft[f]; await cargar(true, true);
    } catch (e) { ctx.toast(e.message); }
  }
  function leerForm(f) {
    const pa = f.mixto ? { efectivo: r2(num(f.mx.efectivo)), tarjeta: r2(num(f.mx.tarjeta)), deposito: r2(num(f.mx.deposito)) } : { efectivo: f.metodo === 'efectivo' ? r2(num(f.monto)) : 0, tarjeta: f.metodo === 'tarjeta' ? r2(num(f.monto)) : 0, deposito: f.metodo === 'deposito' ? r2(num(f.monto)) : 0 };
    const an = esAnulada(f);
    if (an) pa.efectivo = pa.tarjeta = pa.deposito = 0;
    return {
      fecha: S.fecha, recibo: limpiar(f.recibo), nombre: limpiar(f.nombre).toUpperCase(),
      efectivo: pa.efectivo, tarjeta: pa.tarjeta, deposito: pa.deposito,
      referencia: pa.deposito > 0 ? limpiar(f.ref) : '', banco: pa.deposito > 0 ? limpiar(f.banco).toUpperCase() : '', autorizacion: pa.deposito > 0 ? limpiar(f.aut) : '', observaciones: an ? '' : limpiar(f.obs),
      productos: an ? [] : f.prods.map(p => ({ codigo: limpiar(p.codigo), cant: Math.max(1, parseInt(p.cant, 10) || 1) })).filter(p => p.codigo)
    };
  }
  async function guardarFactura(f) {
    f = f || S.form;
    const d = leerForm(f);
    if (!d.recibo) { ctx.toast('Falta el número de recibo'); return; }
    if (!esAnulada(f) && !(montoDe(f) > 0)) { ctx.toast('Falta el monto de la factura'); return; }
    if (d.deposito > 0 && !d.referencia) { ctx.toast('Falta la referencia de la transacción del depósito'); return; }
    if (!d.nombre) d.nombre = 'CF';
    try {
      if (f.id) await send('PATCH', 'mp_facturas?id=eq.' + f.id, d); else await send('POST', 'mp_facturas', d);
      ctx.toast(f.id ? 'Factura actualizada' : 'Factura agregada');
      if (f.id) { S.edit = null; await cargar(true, true); pintar(); return; }
      S.form = formVacio(); await cargar(true, true); S.form.recibo = sugerirRecibo(); pintar();
      const n = $('.mp-fnombre', host); n && n.focus();
    } catch (e) { ctx.toast(e.message); }
  }
  function editarFactura(f) {
    const metodo = num(f.efectivo) > 0 ? 'efectivo' : num(f.deposito) > 0 ? 'deposito' : 'tarjeta', nPartes = [f.efectivo, f.tarjeta, f.deposito].filter(x => num(x) > 0).length, sx = x => num(x) > 0 ? String(r2(num(x))) : '';
    S.edit = { id: f.id, recibo: f.recibo, nombre: f.nombre, metodo, mixto: nPartes > 1, mx: { efectivo: sx(f.efectivo), tarjeta: sx(f.tarjeta), deposito: sx(f.deposito) }, monto: String(r2(num(f.efectivo) + num(f.tarjeta) + num(f.deposito))), ref: f.referencia || '', banco: f.banco || '', aut: f.autorizacion || '', obs: f.observaciones || '', prods: (f.productos && f.productos.length ? f.productos : [{ codigo: '', cant: 1 }]).map(p => ({ codigo: p.codigo, cant: p.cant })) };
    S.open = 2; pintar();
    const card = $('.mp-einline', host);
    if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.classList.add('mp-flash'); setTimeout(() => card.classList.remove('mp-flash'), 1600); }
    const nn = $('.mp-einline .mp-fnombre', host); nn && nn.focus({ preventScroll: true });
  }
  async function borrar(tabla, id, clave) {
    if (S.confirmar !== clave) { S.confirmar = clave; pintar(); setTimeout(() => { if (S.confirmar === clave) { S.confirmar = null; pintar(); } }, 3500); return; }
    S.confirmar = null;
    try { await send('DELETE', tabla + '?id=eq.' + id); ctx.toast('Eliminado'); await cargar(true, true); if (S.form && !S.form.id && !S.form.recibo) S.form.recibo = sugerirRecibo(); pintar(); } catch (e) { ctx.toast(e.message); }
  }
  async function agregarEgreso(d) {
    try { await send('POST', 'mp_egresos', Object.assign({ fecha: S.fecha }, d)); ctx.toast('Depósito/egreso agregado'); await cargar(true, true); } catch (e) { ctx.toast(e.message); }
  }
  function parsearProductos(txt) {
    return limpiar(txt, true).split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const c = l.split('\t').map(x => limpiar(x));
      let cant = 1; for (let i = 1; i < c.length; i++) if (/^\d{1,3}$/.test(c[i])) { cant = parseInt(c[i], 10); break; }
      return { codigo: c[0], cant };
    }).filter(p => p.codigo);
  }

  /* ---------- texto para el Drive (2 bloques, texto plano) ---------- */
  function textoDrive(grupos) {   /* grupos: [{ fecha, facs }] en orden: sábado y domingo juntos */
    const b1 = [], b2 = [], sin = [], filas = [];
    grupos.forEach(({ fecha, facs }) => facs.forEach(f => {
      if (esAnulada(f)) { const t = String(f.nombre).trim().toUpperCase(); b1.push(fDrive(fecha) + '\t' + t); b2.push('\t\t\t' + t + '\tR-' + f.recibo); filas.push([fDrive(fecha), t, '', '', '', '', t, 'R-' + f.recibo]); return; }
      const ps = (f.productos || []).filter(p => p.codigo);
      if (!ps.length) { sin.push(f.recibo); return; }
      ps.forEach(p => { b1.push(fDrive(fecha) + '\t' + p.codigo); b2.push('\t' + p.cant + '\t\tFACTURADO\tR-' + f.recibo); filas.push([fDrive(fecha), p.codigo, '', '', String(p.cant), '', 'FACTURADO', 'R-' + f.recibo]); });
    }));
    return { b1: b1.join('\n'), b2: b2.join('\n'), todo: b1.map((x, i) => x + '\t\t' + b2[i]).join('\n'), n: b1.length, sin, filas };
  }
  const copiar = async (t, ok) => {
    try { await navigator.clipboard.writeText(t); ctx.toast(ok || 'Copiado'); }
    catch (e) { const ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); ctx.toast(ok || 'Copiado'); } catch (x) { ctx.toast('No se pudo copiar'); } ta.remove(); }
  };

  /* =====================================================================
   *  CORTE DE CAJA · imagen (mismo esquema que Numbers, diseño moderno, Century Gothic)
   *  Espacio 2000 × 1307.7 → PNG 3900 × 2550 (oficio horizontal, 13 × 8.5 in a 300 ppp)
   * ===================================================================== */
  const PX = 1.95, FONT = "'Century Gothic','CenturyGothic','Questrial','Avenir Next','Helvetica Neue',Arial,sans-serif";
  const CL = { ink: '#0F172A', mut: '#475569', line: '#CBD5E1', navy: '#1E3A5F', navy2: '#3B5B85', head: '#E8EEF6', alt: '#F6F8FB', tot: '#DCE8F5', eg: '#2F6F7E', ok: '#1B7F4B', okbg: '#DDF3E6', ef: '#5E9E6B', ta: '#3B5B85', de: '#C9A227', oro: '#B8A06A' };
  /* CIERRE DEL DÍA (imagen para correo / jefes): fecha y lugar de héroe, ventas por forma de pago, detalle, caja y depósitos.
     Ancho de diseño 2600; el alto crece con las facturas. px conserva la escala de siempre (1.95 → 3900 px de ancho). */
  const CW = 2600, CNW = 620, COW = 300, CNS = 25;
  let _cm = null;
  const lineasDe = (txt, w) => {
    txt = String(txt || ''); if (!txt) return []; if (!_cm) _cm = document.createElement('canvas').getContext('2d');
    _cm.font = '400 ' + CNS + 'px ' + FONT; if (_cm.measureText(txt).width <= w) return [txt];
    const p = txt.split(' '), out = []; let a = '';
    for (let i = 0; i < p.length; i++) { const t = a ? a + ' ' + p[i] : p[i]; if (_cm.measureText(t).width > w && a) { out.push(a); a = p[i]; } else a = t; }
    out.push(a); return out;
  };
  const nomVis = n => { n = String(n || '').trim().toUpperCase(); return !n || n === 'CF' || n === 'C/F' ? 'CONSUMIDOR FINAL' : n; };
  const obsDe = f => [num(f.deposito) > 0 && f.referencia ? 'Ref. ' + f.referencia : '', num(f.deposito) > 0 ? f.banco : '', f.observaciones].filter(Boolean).join(' · ');
  function dibujar(cv, d, px) {
    px = px || PX; const k = px * 2000 / CW, W = CW, rowH = 64;
    const rows = d.facs.map(f => { const L = lineasDe(nomVis(f.nombre), CNW), O = lineasDe(obsDe(f), COW); return { f, L, O, h: Math.max(L.length, O.length) > 1 ? Math.max(L.length, O.length) * 30 + 32 : rowH }; });
    const deps = d.facs.filter(f => num(f.deposito) > 0), egs = d.egs;
    const sumH = rows.reduce((a, r) => a + r.h, 0), ch = Math.max(70 + 48 + sumH + rowH + 30, 540);
    const dh = egs.length ? 130 + egs.length * rowH : 210, eh = 0;
    const y1 = 720, y2 = y1 + ch + 30, y3 = y2 + dh, H = Math.round(y3 + 80);
    cv.width = Math.round(W * k); cv.height = Math.round(H * k); cv.style.setProperty('--r', (W / H).toFixed(4));
    const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0); c.textBaseline = 'middle';
    const m = v => num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), QQ = v => 'Q ' + m(v);
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    const box = (x, y, w, h, f, r, sh) => { c.save(); if (sh !== 0) { c.shadowColor = 'rgba(15,23,42,.14)'; c.shadowBlur = 22; c.shadowOffsetY = 5; } rr(x, y, w, h, r == null ? 22 : r); c.fillStyle = f; c.fill(); c.restore(); };
    const T = (t, x, y, s, w, col, a, mw) => { c.font = w + ' ' + s + 'px ' + FONT; if (mw) { const q = c.measureText(t).width; if (q > mw) { s *= mw / q; c.font = w + ' ' + s + 'px ' + FONT; } } c.fillStyle = col; c.textAlign = a || 'left'; c.fillText(t, x, y); };
    /* contabilidad: Q a la izquierda de la casilla, monto a la derecha; vacío si no hay */
    const AC = (v, x, y, sz, w, col, wd) => { if (!(num(v) > 0)) return; T('Q', x - (wd || 162), y, sz * .8, '400', col, 'left'); T(m(v), x, y, sz, w, col, 'right'); };
    const ef = d.t.ef, ta = d.t.ta, de = d.t.de, ven = d.t.ventas, p = parte(d.fecha);
    c.fillStyle = '#EEF2F8'; c.fillRect(0, 0, W, H);
    /* encabezado: fecha a la izquierda, lugar a la derecha */
    c.fillStyle = CL.navy; c.fillRect(0, 0, W, 230);
    if (logoImg) { c.save(); rr(50, 52, 327, 126, 16); c.clip(); c.drawImage(logoImg, 50, 52, 327, 126); c.restore(); }
    T('CORTE DE CAJA', 430, 36, 22, '700', '#C9D6EA');
    T(DIA[p.dow].toUpperCase() + ' ' + p.d, 430, 122, 104, '700', '#fff', 'left', 1000);
    T(MES[p.m - 1].toUpperCase() + ' ' + p.y, 430, 196, 54, '700', '#E3EBF7', 'left', 1000);
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(1650, 40, 3, 150);
    T('MUSIC PRO', 1710, 60, 30, '700', '#C9D6EA'); T('PRADERA', 1710, 130, 96, '700', '#fff', 'left', 780); T('ZONA 10', 1710, 196, 54, '700', '#E3EBF7', 'left', 780);
    /* ventas, ingreso del día y formas de pago */
    const cards = [['VENTAS DEL DÍA', ven, 700], ['SALDO INICIAL', d.saldo, 425, '#E2B100'], ['EFECTIVO', ef, 425, CL.ef], ['TARJETA', ta, 425, CL.ta], ['DEPÓSITO', de, 425, CL.de]];
    let X = 50;
    cards.forEach((q, i) => {
      const w = q[2];
      if (i === 0) { box(X, 260, w, 250, CL.navy); T(q[0], X + 30, 310, 26, '700', '#C9D6EA'); T(QQ(q[1]), X + 30, 395, 70, '700', '#fff', 'left', w - 60); T(validas(d.facs).length + (validas(d.facs).length === 1 ? ' factura' : ' facturas') + (d.facs.length > validas(d.facs).length ? ' · ' + (d.facs.length - validas(d.facs).length) + ' anulada' : ''), X + 30, 465, 26, '400', '#C9D6EA'); }
      else { box(X, 260, w, 250, i === 1 ? '#FFF1B8' : '#fff'); if (i === 1) { c.save(); rr(X, 260, w, 250, 22); c.strokeStyle = '#E2B100'; c.lineWidth = 4; c.stroke(); c.restore(); } c.fillStyle = q[3]; rr(X, 260, w, 12, 6); c.fill(); T(q[0], X + 26, 312, 24, '700', i === 1 ? '#7A5A00' : CL.mut); T(QQ(q[1]), X + 26, 385, i === 1 ? 46 : 44, '700', CL.ink, 'left', w - 50); T(i === 1 ? 'con esto arranca la caja' : (ven ? Math.round(q[1] / ven * 100) + '% de las ventas' : '—'), X + 26, 455, 22, '400', CL.mut, 'left', w - 50); }
      X += w + 25;
    });
    box(50, 540, 2500, 150, '#fff'); T('¿Cómo se pagó?', 80, 572, 26, '700', CL.navy);
    const fp = [['Efectivo', ef, CL.ef], ['Tarjeta', ta, CL.ta], ['Depósito', de, CL.de]];
    fp.forEach((q, i) => { const lx = 900 + i * 450; c.fillStyle = q[2]; rr(lx, 560, 22, 22, 6); c.fill(); T(q[0] + ' ' + (ven ? Math.round(q[1] / ven * 100) : 0) + '%', lx + 34, 572, 24, '700', CL.ink); });
    rr(80, 615, 2440, 40, 20); c.fillStyle = '#E2E8F0'; c.fill();
    if (ven > 0) { c.save(); rr(80, 615, 2440, 40, 20); c.clip(); let xx = 80; fp.forEach(q => { const w = 2440 * q[1] / ven; c.fillStyle = q[2]; c.fillRect(xx, 615, w, 40); xx += w; }); c.restore(); }
    /* detalle de ventas: columnas fijas efectivo · tarjeta · depósito (una factura combinada llena dos) */
    const DW = 1900, R = [1040, 1230, 1420, 1600], ty = y1 + 75;
    box(50, y1, DW, ch, '#fff'); T('Detalle de ventas', 80, y1 + 40, 32, '700', CL.navy);
    c.fillStyle = CL.head; c.fillRect(70, ty, DW - 40, 48);
    T('RECIBO', 90, ty + 24, 20, '700', CL.mut); T('CLIENTE', 200, ty + 24, 20, '700', CL.mut); T('OBSERVACIONES / REF.', 1640, ty + 24, 20, '700', CL.mut, 'left', 290);
    ['EFECTIVO', 'TARJETA', 'DEPÓSITO', 'TOTAL'].forEach((h, i) => T(h, R[i], ty + 24, 20, '700', CL.mut, 'right'));
    let yy = ty + 48;
    rows.forEach((r, i) => {
      const f = r.f, ym = yy + r.h / 2; if (i % 2) { c.fillStyle = CL.alt; c.fillRect(70, yy, DW - 40, r.h); }
      T(String(f.recibo), 90, ym, 26, '700', CL.ink);
      r.L.forEach((l, q) => T(l, 200, ym + (q - (r.L.length - 1) / 2) * 30, CNS, esAnulada(f) ? '700' : '400', esAnulada(f) ? '#C0283A' : CL.ink));
      r.O.forEach((l, q) => T(l, 1640, ym + (q - (r.O.length - 1) / 2) * 28, 22, '400', CL.mut));
      [f.efectivo, f.tarjeta, f.deposito].forEach((v, j) => AC(v, R[j], ym, 26, '400', CL.ink));
      AC(num(f.efectivo) + num(f.tarjeta) + num(f.deposito), R[3], ym, 27, '700', CL.ink); yy += r.h;
    });
    c.fillStyle = CL.tot; c.fillRect(70, yy, DW - 40, rowH); T('TOTAL', 90, yy + rowH / 2, 24, '700', CL.navy);
    [ef, ta, de, ven].forEach((v, j) => AC(v, R[j], yy + rowH / 2, 26, '700', CL.navy));
    /* caja del día */
    const CX = 50 + DW + 30, CWd = 2550 - CX; box(CX, y1, CWd, ch, '#fff'); T('Caja del día', CX + 30, y1 + 40, 32, '700', CL.navy);
    [['Saldo inicial', d.saldo, ''], ['Efectivo vendido', ef, ''], ['Depósitos/egresos', d.t.eg, '− ']].forEach((l, i) => { const y = y1 + 115 + i * 80; if (i === 0) { box(CX + 16, y - 34, CWd - 32, 68, '#FFF1B8', 14, 0); } T(l[0], CX + 30, y, 26, i === 0 ? '700' : '400', i === 0 ? '#7A5A00' : CL.mut); T(l[2] + QQ(l[1]), CX + CWd - 30, y, 36, '700', CL.ink, 'right', 300); });
    c.fillStyle = CL.line; c.fillRect(CX + 30, y1 + 115 + 3 * 80 - 30, CWd - 60, 2);
    const by = y1 + 115 + 3 * 80 + 4; box(CX + 30, by, CWd - 60, 140, CL.ok, 20, 0); T('TOTAL EN CAJA', CX + 60, by + 38, 24, '700', '#fff'); T(QQ(d.t.total), CX + CWd - 60, by + 95, 56, '700', '#fff', 'right', CWd - 120);
    /* detalle de depósitos (referencia · banco · monto · autorización); vacío si no hay */
    const tabla2 = (yTop, hh, titulo, filas, vacio, hRef, hBan) => {
      box(50, yTop, 2500, hh, '#fff'); T(titulo, 80, yTop + 42, 32, '700', CL.navy);
      const dy = yTop + 80, DC = [90, 560, 1100, 1500]; c.fillStyle = CL.head; c.fillRect(70, dy, 2460, 48);
      [[hRef, DC[0], 'left'], [hBan, DC[1], 'left'], ['MONTO', DC[2] + 240, 'right'], ['AUTORIZACIÓN', DC[3], 'left']].forEach(h => T(h[0], h[1], dy + 24, 20, '700', CL.mut, h[2]));
      if (!filas.length) T(vacio, 1300, dy + 48 + 55, 30, '400', CL.mut, 'center');
      filas.forEach((e, i) => { const y = dy + 48 + i * rowH + rowH / 2; T(String(e[0] || ''), DC[0], y, 26, '700', CL.ink, 'left', 440); T(String(e[1] || '').toUpperCase(), DC[1], y, CNS, '400', CL.ink, 'left', 500); AC(e[2], DC[2] + 240, y, 28, '700', CL.ink, 150); T(String(e[3] || ''), DC[3], y, 26, '400', CL.ink, 'left', 500); });
    };
    tabla2(y2, dh, 'Detalle de depósitos', egs.map(e => [e.recibo, e.nombre, e.cantidad, e.autorizacion]), 'No hay depósitos en este día', 'REFERENCIA', 'BANCO / CONCEPTO');
    T('Music Pro · Pradera Zona 10', W / 2, H - 34, 22, '400', '#64748B', 'center');
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
    const cv = $('.mp-cv', host); if (cv) dibujar(cv, d, 0.8);   /* vista previa liviana; el PNG sale a tamaño oficio completo */
    if (modal && modal.cv.isConnected) { dibujar(modal.cv, d, 1.5); modal.tit.textContent = 'Corte de caja · ' + fCorta(S.fecha); }
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
    else if (S.vista === 'stats') host.append(vistaStats());
    else {
      host.append(encabezadoDias());
      if (!registrado(S.fecha)) host.append(diaNoRegistrado());
      else host.append(S.vista === 'corte' ? vistaCorte() : S.vista === 'caja' ? vistaCaja() : vistaDrive());
    }
    window.scrollTo({ top: y });
    repintarCorte(); repintarLunes();
  }
  function avisoFalta() {
    const falla = /relation|does not exist|mp_|42P01|PGRST205/i.test(S.error || '') || /404/.test(String(S.error));
    return el('div', { class: 'card mp-aviso' }, el('h3', {}, 'Falta un paso en Supabase'),
      el('p', { class: 'muted' }, falla ? 'Las tablas de Music Pro aún no existen o no tienen permisos. Corre sql/musicpro.sql en Supabase → SQL Editor.' : 'No se pudieron leer los datos: ' + (S.error || 'error desconocido')),
      btn('Reintentar', null, () => cargar(false, true), 'btn-gold'));
  }
  function cabecera() {
    const tabs = [['corte', 'Corte del día', 'cash'], ['caja', 'Registro de caja', 'safe'], ['drive', 'Para el Drive', 'sheet'], ['ventas', 'Ventas y comisión', 'trend'], ['stats', 'Estadísticas del año', 'chart']];
    return el('div', { class: 'mp-cab' },
      el('div', { class: 'mp-tit' }, el('img', { src: 'musicpro-logo.png', alt: 'Music Pro', class: 'mp-logo' }), el('div', {}, el('h2', {}, 'Music Pro'), el('p', { class: 'muted' }, 'Trabajo de fin de semana · Pradera Zona 10'))),
      el('div', { class: 'mp-seg', role: 'tablist' }, tabs.map(([k, t, i]) => el('button', { type: 'button', role: 'tab', 'aria-pressed': String(S.vista === k), onclick: () => { S.vista = k; S.confirmar = null; if (k === 'ventas') S.mes = mesDe(S.fecha); if (k === 'stats') { S.anioE = S.anioE || S.mes.slice(0, 4); S.mSel = null; pintar(); } else cargar(true); } }, ico(i), ' ', t))));
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
      const est = reg ? (sd.estado === 'pendiente' ? chip('Falta saldo inicial', 'mp-mal', 'warn') : chip('Registrado', 'mp-ok', 'check')) : chip(f > n.f ? 'Aún no llega' : 'Sin registrar', 'mp-gris');
      return el('button', { type: 'button', class: 'mp-dia' + (f === S.fecha ? ' mp-sel' : '') + (reg ? '' : ' mp-vacio'), onclick: () => irA(f) },
        el('small', { class: 'muted' }, DIA[p.dow].toUpperCase() + (esFin(f) ? '' : ' · EXTRAORDINARIO')), el('b', { class: 'mp-dn' }, p.d + ' de ' + MES[p.m - 1]), est,
        reg ? el('div', { class: 'mp-dm' },
          el('span', {}, 'Ventas del día ', el('b', {}, Q(t.ventas))),
          el('div', { class: 'mp-dmef' },
            el('span', {}, 'Saldo inicial ', el('b', {}, Q(t.saldo))),
            el('span', {}, 'Efectivo vendido ', el('b', {}, '+ ' + Q(t.ef))),
            el('span', {}, 'Depósitos/egresos ', el('b', {}, '− ' + Q(t.eg))),
            el('span', { class: 'mp-dmf' }, 'Final de caja ', el('b', {}, Q(t.total))))) : null);
    });
    const regs = dias.filter(registrado), tv = r2(regs.reduce((a, f) => a + totalDia(f).ventas, 0)), last = regs.length ? totalDia(regs[regs.length - 1]) : null;
    return el('div', { class: 'mp-semana' },
      el('div', { class: 'mp-sh' }, ico('cal'), el('b', {}, dias.length > 1 ? 'Este fin de semana' : 'Día extraordinario'), el('span', { class: 'muted' }, dias.length > 1 ? fMini(dias[0]) + ' y ' + fMini(dias[1]) : fLarga(dias[0]))),
      el('div', { class: 'mp-dias' }, cards),
      regs.length ? el('div', { class: 'mp-fs' }, el('span', {}, ico('coin'), ' Ventas ', el('b', {}, Q(tv))), el('span', {}, ico('pct'), ' Comisión ', el('b', {}, Q(tv * pct / 100))), el('span', {}, ico('safe'), ' En caja al final ', el('b', {}, Q(last.total)))) : null);
  }
  function calendario() {
    const ym = S.calYm || mesDe(S.fecha), [y, m] = ym.split('-').map(Number), lead = (new Date(y, m - 1, 1, 12).getDay() + 6) % 7, dim = new Date(y, m, 0).getDate(), t = hoy();
    const cab = el('div', { class: 'mp-ch' }, btn('', 'left', () => { S.calYm = sumaMes(ym, -1); cargar(true); }, 'btn-ghost', 'Mes anterior'), el('div', { class: 'mp-chm' }, el('b', {}, mayus(nombreMes(ym))), btn('Hoy', null, () => irA(diaInicial()), 'btn-gold', 'Volver al fin de semana más reciente')), btn('', 'right', () => { S.calYm = sumaMes(ym, 1); cargar(true); }, 'btn-ghost', 'Mes siguiente'));
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
      null);
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
      paso('1', 'safe', 'Saldo inicial', Q(sd.v), sd.estado === 'pendiente' ? 'falta indicarlo' : sd.estado === 'auto' ? 'viene del sábado' : 'lo que te dieron', sd.estado === 'pendiente' ? 'mp-p1 mp-pend' : 'mp-p1'),
      paso('2', 'coin', 'Ventas del día', Q(t.ventas), 'Efectivo ' + money(t.ef) + ' · Tarjeta ' + money(t.ta) + ' · Depósito ' + money(t.de), 'mp-p2'),
      paso('3', 'out', 'Depósitos/egresos', Q(t.eg), 'egresos del día', 'mp-p3'),
      paso('4', 'box', 'Total en caja', Q(t.total), 'ingreso + efectivo − depósitos/egresos', 'mp-p4'));
  }
  function acc(n, tit, resumen, cls, fn) {
    const open = S.open === n;
    const h = el('button', { type: 'button', class: 'mp-ah', 'aria-expanded': String(open), onclick: () => togglePaso(n) },
      el('span', { class: 'mp-bn' }, String(n)), el('b', {}, tit), el('span', { class: 'mp-as' }, resumen),
      el('span', { class: 'mp-ed' }, ico('edit'), el('span', { class: 'mp-e1' }, ' Editar'), el('span', { class: 'mp-e2' }, ' Cerrar'), el('span', { class: 'mp-chev' }, ico('down'))));
    const inner = el('div', { class: 'mp-accb' });
    fn().forEach(c => { const t = c.querySelector(':scope > h3'); if (t) t.remove(); c.classList.add('mp-flat'); inner.append(c); });
    const wrap = el('div', { class: 'mp-accw' }, el('div', { class: 'mp-accm' }, inner));
    if (!open) wrap.setAttribute('inert', '');
    return el('div', { class: 'mp-acc ' + cls + (open ? ' mp-open' : ''), 'data-n': String(n) }, h, wrap);
  }
  /* abre/cierra sin volver a pintar todo: la transición es suave y la página no salta */
  function togglePaso(n, forzar) {
    const abre = forzar ? true : S.open !== n; S.open = abre ? n : 0; S.confirmar = null;
    host.querySelectorAll('.mp-acc').forEach(a => {
      const o = +a.dataset.n === S.open; a.classList.toggle('mp-open', o);
      a.querySelector('.mp-ah').setAttribute('aria-expanded', String(o));
      const w = a.querySelector('.mp-accw'); if (o) w.removeAttribute('inert'); else w.setAttribute('inert', '');
    });
    if (abre) setTimeout(() => { const a = host.querySelector('.mp-acc[data-n="' + n + '"]'); if (a) { const r = a.getBoundingClientRect(); if (r.top < 90 || r.bottom > innerHeight) a.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 320);
  }
  function vistaCorte() {
    const w = el('div', {}), sd = saldoDe(S.fecha), t = totalDia(S.fecha), nf = validas(facsDe(S.fecha)).length;
    if (S.open == null) S.open = sd.estado === 'pendiente' ? 1 : 2;
    const g = el('div', { class: 'mp-grid' });
    const izq = el('div', { class: 'mp-col' });
    izq.append(
      acc(1, 'Saldo inicial', sd.estado === 'pendiente' ? 'Falta indicarlo' : Q(sd.v), sd.estado === 'pendiente' ? 'mp-p1 mp-pend' : 'mp-p1', () => [bloqueIngreso()]),
      acc(2, 'Ventas', Q(t.ventas) + ' · ' + nf + (nf === 1 ? ' factura' : ' facturas'), 'mp-p2', () => [formFactura(), listaFacturas()]),
      acc(3, 'Depósitos/egresos', Q(t.eg), 'mp-p3', () => [bloqueEgresos()]),
      acc(4, 'Total en caja', Q(t.total), 'mp-p4', () => [bloqueTotal()]));
    const der = el('div', { class: 'mp-col mp-sticky' });
    der.append(el('div', { class: 'card' }, el('h3', {}, ico('img'), ' Corte de caja · vista previa'),
      el('p', { class: 'muted' }, 'Se actualiza sola mientras agregas facturas, depósitos/egresos o el saldo inicial. Tamaño oficio horizontal.'), el('canvas', { class: 'mp-cv', 'aria-label': 'Corte de caja' }),
      el('div', { class: 'mp-acts' }, btn('Ver en grande', 'zoom', abrirGrande, 'btn-gold'), btn('Guardar PNG (oficio)', 'down', descargarPNG), btn('Copiar imagen', 'copy', copiarPNG))));
    g.append(izq, der); w.append(g);
    return w;
  }

  function bloqueIngreso() {
    const sd = saldoDe(S.fecha), f = S.fecha, dom = parte(f).dow === 0, sab = mover(f, -1);
    const inp = el('input', { inputmode: 'decimal', value: sd.estado === 'pendiente' && !sd.v ? '' : String(sd.v), placeholder: '0.00', 'aria-label': 'Saldo inicial', class: 'mp-ingin', 'data-num': '1', onkeydown: e => { if (e.key === 'Enter') guardarSaldo(f, inp.value); } });
    const nota = sd.estado === 'pendiente'
      ? el('p', { class: 'mp-warn' }, ico('warn'), ' Falta el saldo inicial de hoy: es el dinero que te entrega tu compañero al empezar. ', el('span', { class: 'mp-hintbox' }, hintNodes()))
      : sd.estado === 'auto' ? el('p', { class: 'muted' }, 'Automático: es el total en caja del sábado ' + fCorta(sab) + ' (' + Q(sd.v) + '). Se corrige solo si cambias algo del sábado.')
        : el('p', { class: 'muted' }, dom && S.D.cortes[sab] ? 'Lo escribiste a mano para este día.' : 'Guardado para este día.');
    return el('div', { class: 'card' + (sd.estado === 'pendiente' ? ' mp-needs' : '') }, el('h3', {}, el('span', { class: 'mp-bn' }, '1'), ' Saldo inicial'), nota,
      el('div', { class: 'mp-acts' }, el('span', { class: 'mp-q' }, 'Q'), inp, btn('Guardar ingreso', 'check', () => guardarSaldo(f, inp.value), 'btn-gold'),
                dom && S.D.cortes[sab] && sd.estado === 'manual' ? btn('Volver al automático (' + Q(totalDia(sab).total) + ')', null, () => guardarSaldo(f, 0, false)) : null));
  }

  function formFactura(f) {
    f = f || S.form || (S.form = formVacio());
    const gap = (() => { const n = parseInt(f.recibo, 10); const prev = cicloFacs().filter(x => x.id !== f.id).map(x => parseInt(x.recibo, 10)).filter(isFinite); if (!isFinite(n) || !prev.length || f.id) return ''; const m = prev[prev.length - 1]; return n !== m + 1 ? 'El último recibo de este fin de semana fue el ' + m + ' (sigue el ' + (m + 1) + '). ¿Seguro que es el ' + n + '?' : ''; })();
    const inRec = el('input', { class: 'mp-frec', inputmode: 'numeric', value: f.recibo, oninput: e => { f.recibo = e.target.value; } });
    const inNom = el('input', { class: 'mp-fnombre', value: f.nombre, placeholder: 'Nombre completo o CF', autocomplete: 'off', oninput: e => { f.nombre = e.target.value; } });
    const inMonto = el('input', { class: 'mp-fmonto', inputmode: 'decimal', value: f.mixto ? (montoDe(f) || '') : f.monto, placeholder: f.mixto ? 'suma' : '0.00', readonly: f.mixto ? true : null, 'data-num': '1', oninput: e => { f.monto = e.target.value; }, onkeydown: e => { if (e.key === 'Enter') guardarFactura(f); } });
    const met = el('div', { class: 'mp-met' }, [['efectivo', 'Efectivo', 'cash'], ['tarjeta', 'Tarjeta', 'card'], ['deposito', 'Depósito', 'bank'], ['mixto', 'Combinado', 'coin']].map(([k, t, i]) =>
      el('button', { type: 'button', class: 'mp-m mp-m-' + k, 'aria-pressed': String(k === 'mixto' ? f.mixto : (!f.mixto && f.metodo === k)), onclick: () => { if (k === 'mixto') { if (!f.mixto) { f.mx = { efectivo: '', tarjeta: '', deposito: '' }; f.mx[f.metodo] = f.monto; f.mixto = true; } } else { if (f.mixto) f.monto = montoDe(f) ? String(montoDe(f)) : ''; f.mixto = false; f.metodo = k; } pintar(); } }, ico(i), ' ', t)));
    const mxBox = !f.mixto ? null : el('div', { class: 'mp-mx' }, [['efectivo', 'Efectivo Q'], ['tarjeta', 'Tarjeta Q'], ['deposito', 'Depósito Q']].map(([k, t]) =>
      el('label', { class: 'mp-mxc mp-mx-' + k }, el('span', {}, t), el('input', { inputmode: 'decimal', 'data-num': '1', value: f.mx[k], placeholder: '0.00', oninput: e => { f.mx[k] = e.target.value; inMonto.value = montoDe(f) || ''; } }))));
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
    return el('div', { class: 'card' + (f.id ? ' mp-einline' : '') },
      el('h3', {}, f.id ? null : el('span', { class: 'mp-bn' }, '2'), ' ', ico(f.id ? 'edit' : 'plus'), f.id ? ' Editando factura ' + f.recibo : ' Ventas · agregar factura'),
      el('div', { class: 'mp-f3' }, field('Recibo', inRec), field('Nombre', inNom), field('Monto (Q)', inMonto)),
      el('div', { class: 'mp-anu' }, el('small', { class: 'muted' }, 'Si se anuló:'), btn('Recibo anulado', 'x', () => { f.nombre = 'RECIBO ANULADO'; f.monto = ''; f.mixto = false; pintar(); }), btn('Factura anulada', 'x', () => { f.nombre = 'FACTURA ANULADA'; f.monto = ''; f.mixto = false; pintar(); }),
        esAnulada(f) ? el('small', { class: 'mp-warn2' }, 'Se guarda con el número de recibo y sin montos ni productos.') : null),
      gap ? el('p', { class: 'mp-warn' }, ico('warn'), ' ', gap) : null,
      el('div', { class: 'field' }, el('label', {}, 'Forma de pago'), met), mxBox,
      (f.metodo === 'deposito' && !f.mixto) || f.mixto ? el('div', { class: 'mp-dep' }, el('label', { class: 'mp-depl' }, ico('bank'), f.mixto ? ' Datos del depósito (solo si hay depósito)' : ' Datos del depósito'),
        el('div', { class: 'mp-f3' }, field('Referencia de la transacción', el('input', { class: 'mp-fref', value: f.ref, placeholder: 'Ej. 123456789', inputmode: 'numeric', oninput: e => { f.ref = e.target.value; } })),
          field('Banco', el('input', { class: 'mp-fbanco', value: f.banco, placeholder: 'Elige o escribe', list: 'mp-bancos', autocomplete: 'off', oninput: e => { f.banco = e.target.value; } })),
          field('Autorización', el('input', { class: 'mp-faut', value: f.aut, placeholder: 'Opcional', oninput: e => { f.aut = e.target.value; } }))), bancosList()) : null,
      field('Observaciones (opcional)', el('input', { class: 'mp-fobs', value: f.obs, oninput: e => { f.obs = e.target.value; } })),
      el('div', { class: 'field' }, el('label', {}, 'Productos de la factura (para el Drive)'), prods,
        el('div', { class: 'mp-acts' }, btn('Agregar producto', 'plus', () => { f.prods.push({ codigo: '', cant: 1 }); pintar(); const c = host.querySelectorAll('.mp-pc'); c[c.length - 1] && c[c.length - 1].focus(); }),
          el('small', { class: 'muted' }, 'Pega tal cual: si copias varias líneas de la factura, se reparten solas y el formato se limpia.'))),
      el('div', { class: 'mp-acts' }, btn(f.id ? 'Guardar cambios' : 'Agregar factura', 'check', () => guardarFactura(f), 'btn-gold'), f.id ? btn('Cancelar', 'x', () => { S.edit = null; pintar(); }) : null));
  }
  const BANCOS = ['BAC CREDOMATIC', 'BANRURAL', 'BANCO INDUSTRIAL', 'G&T CONTINENTAL', 'INTERBANCO', 'BANTRAB', 'BAM', 'PROMERICA'];
  const bancosList = () => { if (!document.getElementById('mp-bancos')) document.body.append(el('datalist', { id: 'mp-bancos' }, BANCOS.map(b => el('option', { value: b })))); return null; };
  const field = (l, i) => el('div', { class: 'field' }, el('label', {}, l), i);

  function listaFacturas() {
    const fa = facsDe(S.fecha);
    const c = el('div', { class: 'card' }, el('h3', {}, ico('sheet'), ' Facturas de este día ', el('span', { class: 'mp-n' }, String(fa.length))));
    if (!fa.length) { c.append(el('p', { class: 'muted' }, 'Aún no hay facturas. Agrega la primera arriba.')); return c; }
    const l = el('div', { class: 'mp-lista' });
    fa.forEach((f, i) => {
      const pt = [['efectivo', 'cash', 'Efectivo', f.efectivo], ['tarjeta', 'card', 'Tarjeta', f.tarjeta], ['deposito', 'bank', 'Depósito', f.deposito]].filter(x => num(x[3]) > 0), k = pt[0] || ['tarjeta', 'card', 'Tarjeta', 0], tot = r2(num(f.efectivo) + num(f.tarjeta) + num(f.deposito));
      const ps = (f.productos || []), dep = num(f.deposito) > 0 ? [f.referencia ? 'ref. ' + f.referencia : '', f.banco].filter(Boolean).join(' · ') : '';
      l.append(el('div', { class: 'mp-fila' + (S.edit && S.edit.id === f.id ? ' mp-on' : '') },
        el('span', { class: 'mp-num' }, String(i + 1)),
        el('div', { class: 'mp-fi' }, el('span', { class: 'mp-rec' }, 'RECIBO ', el('b', {}, String(f.recibo || '—'))), el('b', {}, nomVis(f.nombre)), (dep || f.observaciones) ? el('small', { class: 'muted' }, [dep ? 'Depósito ' + dep : '', f.observaciones || ''].filter(Boolean).join(' · ')) : null,
          ps.length ? el('div', { class: 'mp-pl' }, ps.map(p => el('span', {}, el('b', {}, p.codigo), p.cant > 1 ? el('i', {}, ' × ' + p.cant) : null))) : el('small', { class: 'mp-warn2' }, 'sin productos ⚠')),
        el('span', { class: 'mp-tags' }, esAnulada(f) ? el('span', { class: 'mp-tag mp-anut' }, 'Anulada') : null, pt.map(x => el('span', { class: 'mp-tag mp-' + x[0] }, ico(x[1]), ' ', x[2] + (pt.length > 1 ? ' ' + money(x[3]) : '')))), el('b', { class: 'mp-mo' }, Q(tot)),
        el('div', { class: 'mp-ac' }, btn('', 'edit', () => editarFactura(f), 'btn-ghost', 'Editar'), btn(S.confirmar === 'f' + f.id ? '¿Seguro?' : '', 'trash', () => borrar('mp_facturas', f.id, 'f' + f.id), S.confirmar === 'f' + f.id ? 'btn-gold' : 'btn-ghost', 'Borrar'))));
      if (S.edit && S.edit.id === f.id) l.append(formFactura(S.edit));
    });
    c.append(l); return c;
  }

  function bloqueEgresos() {
    const eg = egsDe(S.fecha), nom = el('input', { placeholder: 'Banco o concepto (gasto, depósito…)', list: 'mp-bancos', autocomplete: 'off' }), rec = el('input', { placeholder: 'Referencia / recibo', inputmode: 'numeric' }), aut = el('input', { placeholder: 'Opcional' }), cant = el('input', { placeholder: '0.00', inputmode: 'decimal', 'data-num': '1' });
    const c = el('div', { class: 'card' }, el('h3', {}, el('span', { class: 'mp-bn' }, '3'), ' ', ico('out'), ' Depósitos y egresos de efectivo ', el('span', { class: 'mp-n' }, String(eg.length))),
      el('p', { class: 'muted' }, 'Todo lo que sale de la caja en efectivo (gastos o si depositas efectivo al banco) resta del total en caja.'));
    eg.forEach((e, i) => c.append(el('div', { class: 'mp-fila' }, el('span', { class: 'mp-num' }, String(i + 1)), el('div', { class: 'mp-fi' }, el('b', {}, e.nombre || '—'), el('small', { class: 'muted' }, [e.recibo ? 'Ref. ' + e.recibo : '', e.autorizacion ? 'Autorización ' + e.autorizacion : ''].filter(Boolean).join(' · '))), el('b', { class: 'mp-mo' }, '− ' + Q(e.cantidad)), btn(S.confirmar === 'e' + e.id ? '¿Seguro?' : '', 'trash', () => borrar('mp_egresos', e.id, 'e' + e.id), S.confirmar === 'e' + e.id ? 'btn-gold' : 'btn-ghost'))));
    bancosList();
    c.append(el('div', { class: 'mp-f2' }, field('Referencia / recibo', rec), field('Autorización', aut)), el('div', { class: 'mp-f2' }, field('Banco o concepto', nom), field('Cantidad (Q)', cant)),
      el('div', { class: 'mp-acts' }, btn('Agregar depósito/egreso', 'plus', () => { if (!(num(cant.value) > 0)) { ctx.toast('Falta la cantidad'); return; } agregarEgreso({ recibo: limpiar(rec.value), nombre: limpiar(nom.value).toUpperCase(), cantidad: r2(num(cant.value)), autorizacion: limpiar(aut.value) }); })));
    return c;
  }

  function bloqueTotal() {
    const t = totalDia(S.fecha);
    const caja = (l, v, cls) => el('div', { class: 'mp-eq ' + (cls || '') }, el('small', { class: 'muted' }, l), el('b', {}, v));
    return el('div', { class: 'card mp-totalc' }, el('h3', {}, el('span', { class: 'mp-bn' }, '4'), ' ', ico('box'), ' Total en caja'),
      el('div', { class: 'mp-eqs' }, caja('Saldo inicial', Q(t.saldo)), el('i', {}, '+'), caja('Efectivo de ventas', Q(t.ef)), el('i', {}, '−'), caja('Depósitos/egresos', Q(t.eg)), el('i', {}, '='), caja('Total en caja', Q(t.total), 'mp-eqt')),
      el('p', { class: 'muted' }, 'Tarjeta (' + Q(t.ta) + ') y depósitos (' + Q(t.de) + ') se cuentan en las ventas pero no entran a la caja.'),
      conteoCard(S.fecha),
      el('div', { class: 'mp-acts' }, btn('Ver registro de caja', 'safe', () => { S.vista = 'caja'; cargar(true); window.scrollTo({ top: 0 }); })));
  }

  /* ---------- 2 · caja del fin de semana ---------- */
  function vistaCaja() {
    const dias = diasSemana(S.fecha), w = el('div', {});
    const regs = dias.filter(registrado);
    const tv = r2(regs.reduce((a, f) => a + totalDia(f).ventas, 0)), te = r2(regs.reduce((a, f) => a + totalDia(f).ef, 0)), tg = r2(regs.reduce((a, f) => a + totalDia(f).eg, 0)), last = totalDia(regs[regs.length - 1]);
    w.append(el('div', { class: 'mp-kpis' },
      kpi('coin', 'Ventas del fin de semana', Q(tv), 'mp-k1'), kpi('cash', 'Efectivo vendido', Q(te), 'mp-k2'), kpi('out', 'Depósitos/egresos', Q(tg), 'mp-k4'), kpi('box', 'Debe haber en caja', Q(last.total), 'mp-k5 mp-grande')));
    const cg = el('div', { class: 'mp-grid2' }); regs.forEach(f => cg.append(conteoCard(f))); w.append(cg);
    w.append(cardLunes(regs[regs.length - 1]));
    return w;
  }
  /* ---------- foto «Registro lunes»: corte del día anterior + billetes y monedas que quedan en caja ---------- */
  function cardLunes(f) {
    S.lunesF = f;
    return el('div', { class: 'card' }, el('h3', {}, ico('img'), ' Registro lunes · foto para tu compañero'),
      el('p', { class: 'muted' }, 'Lleva la copia del corte de ' + DIA[parte(f).dow] + ' ' + fCorta(f) + ', una gráfica y el conteo de billetes y monedas que quedan en caja. Se actualiza sola con tu conteo.'),
      el('canvas', { class: 'mp-cv mp-cvl', 'aria-label': 'Registro lunes' }),
      el('div', { class: 'mp-acts' }, btn('Copiar foto', 'copy', copiarLunes, 'btn-gold'), btn('Guardar PNG', 'down', descargarLunes)));
  }
  const LW = 2600, LH = 1700;
  function dibujarLunes(cv, f, px) {
    px = px || 1; const c = cv.getContext('2d');
    cv.width = Math.round(LW * px); cv.height = Math.round(LH * px); c.setTransform(px, 0, 0, px, 0, 0);
    const d = datosCorte(f), b = S.draft[f] || (S.D.cortes[f] || {}).billetes || {}, cn = contado(b), sis = d.t.total, dif = r2(cn - sis), hay = cn > 0;
    c.fillStyle = '#EEF2F8'; c.fillRect(0, 0, LW, LH); c.textBaseline = 'middle';
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    const caja = (x, y, w, h, fill, stroke, r, sh) => { c.save(); if (sh) { c.shadowColor = 'rgba(15,23,42,.16)'; c.shadowBlur = 18; c.shadowOffsetY = 4; } rr(x, y, w, h, r || 16); c.fillStyle = fill; c.fill(); c.restore(); if (stroke) { rr(x, y, w, h, r || 16); c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); } };
    const T = (t, x, y, o) => { o = o || {}; let sz = o.s || 24; const wt = o.w || '400'; c.font = wt + ' ' + sz + 'px ' + FONT; if (o.mw) { const m = c.measureText(t).width; if (m > o.mw) sz = Math.max(10, sz * o.mw / m); } c.font = wt + ' ' + sz + 'px ' + FONT; c.fillStyle = o.c || CL.ink; c.textAlign = o.a || 'left'; c.fillText(t, x, y); };
    /* encabezado */
    c.fillStyle = CL.navy; c.fillRect(0, 0, LW, 172);
    T('REGISTRO DOMINGO', 70, 70, { s: 70, w: '700', c: '#fff', mw: 1100 });
    T('Corte de caja del ' + DIA[parte(f).dow] + ' ' + parte(f).d + ' de ' + MES[parte(f).m - 1] + ' de ' + parte(f).y + ' · Music Pro Pradera Zona 10', 70, 128, { s: 28, c: '#C9D6EA', mw: 1400 });
    T(hay ? 'EN CAJA (CONTADO)' : 'EN CAJA (SISTEMA)', 2540, 56, { s: 24, w: '700', c: '#C9D6EA', a: 'right' });
    T(Q(hay ? cn : sis), 2540, 112, { s: 62, w: '700', c: '#fff', a: 'right', mw: 760 });
    /* corte del día anterior */
    T('Corte de caja del día anterior', 60, 214, { s: 30, w: '700', c: CL.navy });
    const tmp = document.createElement('canvas'); dibujar(tmp, d, Math.max(0.4, 0.72 * px));
    { const bw = 1440, bh = 941.6, ar = tmp.height / tmp.width; let dw = bw, dh2 = bw * ar; if (dh2 > bh) { dh2 = bh; dw = bh / ar; } const dx = 60 + (bw - dw) / 2, dy2 = 244 + (bh - dh2) / 2; caja(dx, dy2, dw, dh2, '#fff', null, 6, true); c.drawImage(tmp, dx, dy2, dw, dh2); }
    /* resumen de efectivo */
    const mini = [['SALDO INICIAL', d.t.saldo, '#E2B100'], ['EFECTIVO VENDIDO', d.t.ef, '#5E9E6B'], ['DEPÓSITOS/EGRESOS', d.t.eg, '#2F6F7E'], ['TOTAL EN CAJA', d.t.total, CL.ok]];
    mini.forEach((m, i) => { const x = 60 + i * 365; caja(x, 1218, 345, 150, '#fff', null, 16, true); c.fillStyle = m[2]; rr(x, 1218, 345, 10, 5); c.fill(); T(m[0], x + 22, 1262, { s: 21, w: '700', c: CL.mut, mw: 300 }); T(Q(m[1]), x + 22, 1322, { s: 44, w: '700', c: i === 3 ? CL.ok : CL.ink, mw: 300 }); });
    /* gráfica: ventas por forma de pago */
    caja(60, 1400, 1440, 240, '#fff', null, 16, true);
    T('Ventas del día por forma de pago · ' + Q(d.t.ventas), 90, 1438, { s: 26, w: '700', c: CL.navy });
    const fp = [['Efectivo', d.t.ef, '#5E9E6B'], ['Tarjeta', d.t.ta, '#3B5B85'], ['Depósito', d.t.de, '#C9A227']], tvv = fp.reduce((a, x) => a + x[1], 0);
    let bx = 90; const bw = 1380;
    rr(bx, 1470, bw, 50, 25); c.fillStyle = '#E2E8F0'; c.fill();
    if (tvv > 0) { c.save(); rr(bx, 1470, bw, 50, 25); c.clip(); let xx = bx; fp.forEach(x => { const ww = bw * x[1] / tvv; c.fillStyle = x[2]; c.fillRect(xx, 1470, ww, 50); xx += ww; }); c.restore(); }
    fp.forEach((x, i) => { const lx = 90 + i * 470; c.fillStyle = x[2]; rr(lx, 1556, 30, 30, 8); c.fill(); T(x[0], lx + 44, 1560, { s: 26, w: '700' }); T(Q(x[1]) + (tvv > 0 ? ' · ' + Math.round(x[1] / tvv * 100) + '%' : ''), lx + 44, 1598, { s: 26, c: CL.mut, mw: 400 }); });
    /* billetes y monedas */
    caja(1560, 214, 980, 1426, '#fff', null, 20, true);
    T('Billetes y monedas en caja', 1600, 270, { s: 40, w: '700', c: CL.navy });
    const filas = DEN.map(n => ({ l: 'Q' + n, n: Math.max(0, parseInt(b[n], 10) || 0), v: (parseInt(b[n], 10) || 0) * n, c: CL.navy2 }));
    filas.push({ l: 'Monedas', n: null, v: num(b.mon), c: '#2F6F7E' }); if (num(b.extra) > 0) filas.push({ l: 'Extra', n: null, v: num(b.extra), c: '#B8A06A' });
    const mx = Math.max(1, ...filas.map(x => x.v)), y0 = 345, rh = 88;
    filas.forEach((x, i) => {
      const y = y0 + i * rh; if (i % 2 === 0) { c.fillStyle = '#F6F8FB'; rr(1580, y - 34, 940, 74, 12); c.fill(); }
      T(x.l, 1604, y + 3, { s: 32, w: '700' });
      c.fillStyle = '#E2E8F0'; rr(1810, y - 10, 340, 26, 13); c.fill();
      if (x.v > 0) { c.fillStyle = x.c; rr(1810, y - 10, Math.max(26, 340 * x.v / mx), 26, 13); c.fill(); }
      T(x.n == null ? '' : '× ' + x.n, 2170, y + 3, { s: 30, c: CL.mut });
      T(Q(x.v), 2504, y + 3, { s: 32, w: '700', a: 'right', mw: 200 });
    });
    /* totales */
    const ty = y0 + filas.length * rh + 24;
    c.fillStyle = CL.line; c.fillRect(1600, ty, 900, 2);
    T('CONTADO', 1604, ty + 60, { s: 30, w: '700', c: CL.mut }); T(hay ? Q(cn) : '—', 2504, ty + 60, { s: 64, w: '700', a: 'right', c: CL.navy, mw: 560 });
    T('EN SISTEMA', 1604, ty + 138, { s: 30, w: '700', c: CL.mut }); T(Q(sis), 2504, ty + 138, { s: 44, w: '700', a: 'right', mw: 500 });
    const ok = hay && dif === 0, col = !hay ? CL.mut : ok ? CL.ok : '#C0283A', bg = !hay ? '#EEF2F8' : ok ? CL.okbg : '#FBE0E3';
    caja(1600, ty + 180, 900, 100, bg, col, 18);
    T(!hay ? 'Sin conteo de billetes todavía' : ok ? 'CUADRA EXACTO' : (dif > 0 ? 'SOBRANTE ' : 'FALTANTE ') + Q(Math.abs(dif)), 2050, ty + 232, { s: 42, w: '700', c: col, a: 'center', mw: 840 });
  }
  let lunesTk = 0;
  function repintarLunes() {
    const cv = $('.mp-cvl', host); if (!cv || !S.lunesF) return; const t = ++lunesTk;
    requestAnimationFrame(() => { if (t === lunesTk && cv.isConnected) dibujarLunes(cv, S.lunesF, 0.5); });
  }
  async function blobLunes() { await (document.fonts && document.fonts.ready); const cv = document.createElement('canvas'); dibujarLunes(cv, S.lunesF, 1.5); return new Promise(ok => cv.toBlob(ok, 'image/png')); }
  async function descargarLunes() {
    const b = await blobLunes(); if (!b) { ctx.toast('No se pudo crear la imagen'); return; }
    const a = el('a', { href: URL.createObjectURL(b), download: 'registro-lunes-' + S.lunesF + '.png' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); ctx.toast('Foto guardada');
  }
  async function copiarLunes() {
    try { const b = await blobLunes(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); ctx.toast('Foto copiada: pégala en el mensaje'); }
    catch (e) { ctx.toast('Tu navegador no permite copiar la imagen; usa «Guardar PNG»'); }
  }
  const kpi = (i, l, v, c) => el('div', { class: 'mp-kpi ' + c }, el('span', { class: 'mp-kl' }, ico(i), ' ', l), el('b', {}, v));

  /* conteo de billetes: cada billete suma solo, y te dice cuánto sobra o falta */
  function conteoCard(f) {
    const b = Object.assign({}, S.draft[f] || (S.D.cortes[f] || {}).billetes), t = totalDia(f), p = parte(f), ins = {}, subs = {};
    const tot = el('b', { class: 'mp-tb' }), dif = el('div', { class: 'mp-dif' }), barra = el('i');
    const leer = () => { const o = {}; DEN.forEach(d => { o[d] = Math.max(0, parseInt(ins[d].value, 10) || 0); }); o.mon = r2(num(ins.mon.value)); o.extra = r2(num(ins.extra.value)); return o; };
    const calc = guardar => {
      const o = leer(); if (guardar) { S.draft[f] = o; repintarLunes(); }
      DEN.forEach(d => { subs[d].textContent = o[d] ? '= ' + Q(o[d] * d) : ''; });
      const c = contado(o), d = r2(c - t.total); tot.textContent = Q(c); tot.className = 'mp-tb' + (c > 0 ? (d === 0 ? ' mp-okt' : ' mp-malt') : '');
      dif.className = 'mp-dif ' + (c === 0 ? 'mp-d0' : d === 0 ? 'mp-d1' : 'mp-d3');
      dif.textContent = c === 0 ? 'Cuenta tus billetes y verás aquí cuánto sobra o falta' : d === 0 ? '✓ Cuadra exacto con lo facturado' : d > 0 ? 'SOBRANTE ' + Q(d) + ' · ¿hay una venta en efectivo sin facturar?' : 'FALTANTE ' + Q(-d) + ' · revisa recibos y depósitos/egresos';
      barra.style.width = Math.min(100, t.total > 0 ? c / t.total * 100 : 0) + '%'; barra.className = c === 0 ? '' : d === 0 ? 'mp-bok' : 'mp-bmal';
    };
    const g = el('div', { class: 'mp-bill' }), on = () => calc(true);
    DEN.forEach(d => { ins[d] = el('input', { type: 'number', min: '0', inputmode: 'numeric', value: b[d] || '', placeholder: '0', oninput: on, 'aria-label': 'Billetes de ' + d }); subs[d] = el('small', { class: 'mp-sub2' }); g.append(el('label', {}, el('span', { class: 'mp-den' }, 'Q' + d), ins[d], subs[d])); });
    ins.mon = el('input', { inputmode: 'decimal', 'data-num': '1', value: b.mon || '', placeholder: '0.00', oninput: on }); ins.extra = el('input', { inputmode: 'decimal', 'data-num': '1', value: b.extra || '', placeholder: '0.00', oninput: on });
    g.append(el('label', {}, el('span', { class: 'mp-den' }, 'Monedas Q'), ins.mon), el('label', {}, el('span', { class: 'mp-den' }, 'Extra Q'), ins.extra));
    const deb = el('p', { class: 'muted mp-deb' }, 'Debe haber: ingreso ' + Q(t.saldo) + ' + efectivo vendido ' + Q(t.ef) + ' − depósitos/egresos ' + Q(t.eg) + ' = ', el('b', {}, Q(t.total)));
    const c = el('div', { class: 'card mp-conteo' }, el('h3', {}, ico('cash'), ' Conteo de billetes · ' + mayus(DIA[p.dow]) + ' ' + p.d), g,
      el('div', { class: 'mp-sumas' }, el('span', {}, 'Contado ', tot), el('span', {}, 'En sistema ', el('b', {}, Q(t.total)))), el('div', { class: 'mp-barra' }, barra), dif, deb,
      el('div', { class: 'mp-acts' }, btn('Guardar conteo', 'check', () => guardarBilletes(f, leer()), 'btn-gold')));
    calc(false); return c;
  }

  /* ---------- 3 · para el Drive ---------- */
  function vistaDrive() {
    const w = el('div', {});
    const dias = diasSemana(S.fecha), d = textoDrive(dias.map(f => ({ fecha: f, facs: facsDe(f) })));
    w.append(el('p', { class: 'muted' }, 'Todo el fin de semana junto: ' + dias.map(f => DIA[parte(f).dow] + ' ' + fCorta(f)).join(' + ') + '. Si estás en el domingo, aquí van sábado y domingo en la misma lista.'));
    const HD = ['FECHA', 'CÓDIGO', 'DESCRIPCIÓN', 'ENTRADA', 'SALIDA', 'ENTREGADO A', 'OBSERVACIONES', 'Nº HOJA'];
    const tabla = (c0, c1) => el('div', { class: 'mp-tw' }, el('table', { class: 'mp-tb2' },
      el('thead', {}, el('tr', {}, HD.slice(c0, c1).map(h => el('th', {}, h)))),
      el('tbody', {}, d.filas.map(r => el('tr', {}, r.slice(c0, c1).map(x => el('td', {}, x)))))));
    if (!d.n) { w.append(el('div', { class: 'card' }, el('p', { class: 'muted' }, 'No hay productos capturados en las facturas de este fin de semana. Agrégalos en «Corte del día».'))); }
    else {
      w.append(
        el('div', { class: 'card' }, el('h3', {}, el('span', { class: 'mp-bn' }, '1'), ' Fecha + código · pega en A ', el('span', { class: 'mp-n' }, String(d.n))), tabla(0, 2), el('div', { class: 'mp-acts' }, btn('Copiar bloque 1', 'copy', () => copiar(d.b1, 'Bloque 1 copiado'), 'btn-gold'))),
        el('div', { class: 'card', style: 'margin-top:14px' }, el('h3', {}, el('span', { class: 'mp-bn' }, '2'), ' Cantidad · FACTURADO · recibo · pega en D ', el('span', { class: 'mp-n' }, String(d.n))), tabla(3, 8), el('div', { class: 'mp-acts' }, btn('Copiar bloque 2', 'copy', () => copiar(d.b2, 'Bloque 2 copiado'), 'btn-gold'))));
    }
    if (d.sin.length) w.append(el('p', { class: 'mp-warn' }, ico('warn'), ' Sin productos (no salen en el texto): recibo ' + d.sin.join(', ') + '.'));
    return w;
  }

  /* gráfica isométrica (barras 3D) sin librerías */
  function isoBarras(it) {
    const w = 78, gap = 40, dp = 78, Hm = 190, c30 = Math.cos(Math.PI / 6), n = it.length, mx = Math.max(1, ...it.map(i => i.v)), st = w + gap, A = (n - 1) * st, m = 30;
    /* las barras van en fila de izquierda a derecha en pantalla: (x, y) = (a, -a) */
    const P = (x, y, z) => [(x - y) * c30, (x + y) * 0.5 - z], pts = a => a.map(q => P(...q).map(v => v.toFixed(1)).join(',')).join(' ');
    let g = '<polygon points="' + pts([[-m, -m, 0], [-m, dp + m, 0], [A + w + m, -A + dp + m, 0], [A + w + m, -A - m, 0]]) + '" fill="rgba(120,130,150,.14)" stroke="rgba(120,130,150,.35)"/>';
    let xs = [], ys = [];
    [[-m, -m], [-m, dp + m], [A + w + m, -A + dp + m], [A + w + m, -A - m]].forEach(([x, y]) => { const q = P(x, y, 0); xs.push(q[0]); ys.push(q[1]); });
    it.forEach((b, i) => {
      const x = i * st, y = -x, h = b.v > 0 ? Math.max(8, b.v / mx * Hm) : 3;
      g += '<polygon points="' + pts([[x, y + dp, 0], [x + w, y + dp, 0], [x + w, y + dp, h], [x, y + dp, h]]) + '" fill="' + b.c[1] + '"/>';
      g += '<polygon points="' + pts([[x + w, y, 0], [x + w, y + dp, 0], [x + w, y + dp, h], [x + w, y, h]]) + '" fill="' + b.c[2] + '"/>';
      g += '<polygon points="' + pts([[x, y, h], [x + w, y, h], [x + w, y + dp, h], [x, y + dp, h]]) + '" fill="' + b.c[0] + '"/>';
      const [lx, ly] = P(x + w / 2, y + dp / 2, h); ys.push(ly - 70); xs.push(lx - 60, lx + 60);
      g += '<text x="' + lx.toFixed(1) + '" y="' + (ly - 46).toFixed(1) + '" text-anchor="middle" font-size="19" font-weight="700" fill="currentColor">' + Q(b.v) + '</text>';
      const [bx, by] = P(x + w / 2, y + dp + m, 0); ys.push(by + 44);
      g += '<text x="' + bx.toFixed(1) + '" y="' + (by + 30).toFixed(1) + '" text-anchor="middle" font-size="19" font-weight="700" fill="currentColor">' + b.l + '</text>';
    });
    const x0 = Math.min(...xs) - 10, x1 = Math.max(...xs) + 10, y0 = Math.min(...ys) - 6, y1 = Math.max(...ys) + 6;
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('viewBox', [x0, y0, x1 - x0, y1 - y0].map(v => v.toFixed(0)).join(' ')); sv.setAttribute('class', 'mp-isos'); sv.setAttribute('role', 'img'); sv.setAttribute('aria-label', 'Ventas del mes por forma de pago'); sv.innerHTML = g; return sv;
  }

  /* ---------- 4 · ventas y comisión ---------- */
  function vistaVentas() {
    const pctv = num(S.cfg.porcentaje) || 0, nc = num(S.cfg['nc:' + S.mes]);
    const fin = new Set(), [yy, mm] = S.mes.split('-').map(Number);
    for (let k = 1; k <= new Date(yy, mm, 0).getDate(); k++) { const iso = S.mes + '-' + String(k).padStart(2, '0'); if (esFin(iso)) fin.add(iso); }
    [...Object.keys(S.D.cortes), ...S.D.facs.map(f => f.fecha)].forEach(f => { if (mesDe(f) === S.mes) fin.add(f); });
    const dias = [...fin].sort();   /* los días que faltan del mes salen en 0 */
    const filas = dias.map(f => ({ f, reg: registrado(f), t: totalDia(f), c: contado((S.D.cortes[f] || {}).billetes), n: facsDe(f).length }));
    const fm = S.D.facs.filter(f => mesDe(f.fecha) === S.mes), sm = k => r2(fm.reduce((a, f) => a + num(f[k]), 0));
    const mEf = sm('efectivo'), mTa = sm('tarjeta'), mDe = sm('deposito');
    const total = r2(filas.reduce((a, x) => a + x.t.ventas, 0)), com = r2(total * pctv / 100 - nc), max = Math.max(1, ...filas.map(x => x.t.ventas));
    const w = el('div', {});
    w.append(el('div', { class: 'mp-fecha' }, btn('', 'left', () => { S.mes = sumaMes(S.mes, -1); cargar(true); }, 'btn-ghost', 'Mes anterior'), el('div', { class: 'mp-fechab' }, ico('cal'), el('b', {}, mayus(nombreMes(S.mes)))), btn('', 'right', () => { S.mes = sumaMes(S.mes, 1); cargar(true); }, 'btn-ghost', 'Mes siguiente'), btn('Este mes', null, () => { S.mes = mesDe(hoy()); cargar(true); }), el('input', { type: 'month', value: S.mes, 'aria-label': 'Elegir mes', onchange: e => { if (e.target.value) { S.mes = e.target.value; cargar(true); } } })));
    w.append(calAnio()); { const y = S.mes.slice(0, 4); if (!S.Yc[y]) datosAnio(y).then(() => { const o = $('.mp-ycal', host); if (o && S.vista === 'ventas' && S.mes.slice(0, 4) === y) o.replaceWith(calAnio()); }).catch(() => {}); }
    const pin = el('input', { inputmode: 'decimal', value: String(pctv), 'aria-label': 'Porcentaje', 'data-num': '1' }), ncin = el('input', { inputmode: 'decimal', value: nc ? String(nc) : '', placeholder: '0.00', 'aria-label': 'No corresponde', 'data-num': '1' });
    w.append(el('div', { class: 'mp-kpis' }, kpi('coin', 'Ventas del mes', Q(total), 'mp-k1'), kpi('pct', 'Comisión (' + pctv + '%)', Q(r2(total * pctv / 100)), 'mp-k3'), kpi('x', 'No corresponde', Q(nc), 'mp-k4'), kpi('check', 'Comisión a recibir', Q(com), 'mp-k5 mp-grande')));
    const pm = [['Efectivo', mEf, ['#8FD3A1', '#4FA06A', '#2E7A4B'], 'cash'], ['Tarjeta', mTa, ['#9FC0F0', '#5B8FD6', '#3A68AE'], 'card'], ['Depósito', mDe, ['#F3DA85', '#D9B13A', '#B08A1C'], 'bank']], tm = r2(mEf + mTa + mDe);
    w.append(el('div', { class: 'card mp-iso' }, el('h3', {}, ico('trend'), ' Ventas de ' + nombreMes(S.mes) + ' por forma de pago'),
      el('div', { class: 'mp-isog' }, isoBarras(pm.map(x => ({ v: x[1], c: x[2], l: x[0] }))),
        el('div', { class: 'mp-isol' }, pm.map(x => el('div', { class: 'mp-il' }, el('i', { style: 'background:' + x[2][1] }), el('div', {}, el('small', { class: 'muted' }, x[0]), el('b', {}, Q(x[1])), el('small', { class: 'muted' }, (tm > 0 ? (x[1] / tm * 100).toFixed(1) : '0.0') + '% de las ventas')))),
          el('div', { class: 'mp-il mp-ilt' }, el('div', {}, el('small', { class: 'muted' }, 'Total del mes'), el('b', {}, Q(tm)), el('small', { class: 'muted' }, fm.length + (fm.length === 1 ? ' factura' : ' facturas'))))))));
    w.append(el('div', { class: 'card' }, el('h3', {}, ico('pct'), ' Cómo se calcula'),
      el('div', { class: 'mp-calc' }, el('span', {}, 'Ventas ', el('b', {}, Q(total))), el('i', {}, '×'), el('label', { class: 'mp-mini' }, pin, '%'), el('i', {}, '−'), el('label', { class: 'mp-mini' }, 'Q', ncin, ' no corresponde'), el('i', {}, '='), el('b', { class: 'mp-res' }, Q(com))),
      el('div', { class: 'mp-acts' }, btn('Guardar % y «no corresponde»', 'check', async () => {
        try {
          await send('POST', 'mp_config?on_conflict=clave', [{ clave: 'porcentaje', valor: String(num(pin.value)) }, { clave: 'nc:' + S.mes, valor: String(r2(num(ncin.value))) }], 'resolution=merge-duplicates,return=minimal');
          ctx.toast('Guardado'); await cargar(true, true);
        } catch (e) { ctx.toast(e.message); }
      }, 'btn-gold'), el('small', { class: 'muted' }, 'El porcentaje vale para todos los meses; «no corresponde» es de este mes.'))));
    const c = el('div', { class: 'card' }, el('h3', {}, ico('sheet'), ' Registro de ventas por día'));
    if (!filas.length) c.append(el('p', { class: 'muted' }, 'No hay días en este mes.'));
    else {
      const grupos = []; filas.forEach(x => { const p = parte(x.f); const lun = mover(x.f, -((p.dow + 6) % 7)); let g = grupos.find(z => z.lun === lun); if (!g) grupos.push(g = { lun, items: [] }); g.items.push(x); });
      const tb = el('div', { class: 'mp-reg' });
      tb.append(el('div', { class: 'mp-rh' }, el('span', {}, 'Fecha'), el('span', {}, 'Monto vendido'), el('span', {}, '% del mes'), el('span', {}, 'Comisión'), el('span', {}, 'Total en caja'), el('span', {}, 'Contado'), el('span', {}, 'Diferencia')));
      grupos.forEach(g => {
        const sub = r2(g.items.reduce((a, x) => a + x.t.ventas, 0));
        g.items.forEach(x => {
          const dif = x.c > 0 ? r2(x.c - x.t.total) : null;
          tb.append(el('button', { type: 'button', class: 'mp-rr' + (x.reg ? '' : ' mp-cero'), onclick: () => irA(x.f, 'corte'), title: 'Abrir este día' },
            el('span', { class: 'mp-rf' }, el('b', {}, fCorta(x.f)), el('small', { class: 'muted' }, ' ' + DIA[parte(x.f).dow] + (esFin(x.f) ? '' : ' (extraordinario)') + ' · ' + x.n + ' fact.')),
            el('b', {}, Q(x.t.ventas)), el('span', { class: 'mp-barc' }, el('span', { class: 'mp-bar' }, el('i', { style: 'width:' + (x.t.ventas > 0 ? Math.max(2, x.t.ventas / max * 100) : 0) + '%' })), el('small', {}, (total > 0 ? (x.t.ventas / total * 100).toFixed(1) : '0.0') + '%')),
            el('span', {}, Q(x.t.ventas * pctv / 100)), el('span', {}, Q(x.t.total)), el('span', {}, x.c > 0 ? Q(x.c) : '—'), el('span', { class: dif == null ? '' : dif === 0 ? 'mp-okt' : 'mp-malt' }, dif == null ? '—' : dif === 0 ? 'Cuadra' : (dif > 0 ? '+' : '−') + money(Math.abs(dif)))));
        });
        if (g.items.length > 1) tb.append(el('div', { class: 'mp-sub' }, el('span', {}, 'Fin de semana · ' + fCorta(g.items[0].f) + ' al ' + fCorta(g.items[g.items.length - 1].f)), el('b', {}, Q(sub)), el('span'), el('span', {}, Q(sub * pctv / 100)), el('span'), el('span'), el('span')));
      });
      c.append(tb);
    }
    w.append(c);
    const dw = {}; filas.filter(x => x.reg).forEach(x => { const k = parte(x.f).dow; (dw[k] = dw[k] || { n: 0, v: 0 }); dw[k].n++; dw[k].v += x.t.ventas; });
    if (filas.some(x => x.reg)) w.append(el('div', { class: 'card' }, el('h3', {}, ico('trend'), ' Por día de la semana'), el('div', { class: 'mp-dw' }, Object.keys(dw).sort((a, b) => ((+a + 6) % 7) - ((+b + 6) % 7)).map(k => el('div', { class: 'mp-dwc' }, el('small', { class: 'muted' }, DIA[k].toUpperCase()), el('b', {}, Q(dw[k].v)), el('small', { class: 'muted' }, dw[k].n + (dw[k].n === 1 ? ' día' : ' días') + ' · promedio ' + Q(dw[k].v / dw[k].n)))))));
    return w;
  }

  /* =====================================================================
   *  AÑO · calendario por mes y estadísticas (todo sale de lo capturado)
   * ===================================================================== */
  const yPend = {};
  async function datosAnio(y) {
    if (S.Yc[y]) return S.Yc[y];
    if (yPend[y]) return yPend[y];
    const rng = 'fecha=gte.' + y + '-01-01&fecha=lt.' + (+y + 1) + '-01-01';
    return (yPend[y] = Promise.all([
      get('mp_facturas?select=fecha,nombre,efectivo,tarjeta,deposito&' + rng + '&order=fecha.asc&limit=5000'),
      get('mp_egresos?select=fecha,cantidad&' + rng + '&limit=5000'),
      get('mp_cortes?select=*&' + rng),
      get('mp_config?select=*')
    ]).then(([facs, egs, cs, cf]) => {
      const cortes = {}; cs.forEach(c => { cortes[c.fecha] = c; });
      const cfg = { porcentaje: '3' }; cf.forEach(k => { cfg[k.clave] = k.valor; });
      const D = { facs, egs, cortes };
      return (S.Yc[y] = { y, D, cfg, R: resumenAnio(D, cfg, y) });
    }).finally(() => { delete yPend[y]; }));
  }
  function resumenAnio(D, cfg, y) {
    const pct = num(cfg.porcentaje) || 0, dias = {}, meses = [];
    for (let m = 1; m <= 12; m++) meses.push({ m, ym: y + '-' + String(m).padStart(2, '0'), ventas: 0, ef: 0, ta: 0, de: 0, eg: 0, nf: 0, dias: 0, com: 0, nc: 0 });
    const dd = f => dias[f] || (dias[f] = { f, ventas: 0, nf: 0, reg: false });
    D.facs.forEach(x => { const mo = meses[parte(x.fecha).m - 1]; if (!mo) return; const e = num(x.efectivo), t = num(x.tarjeta), p = num(x.deposito); mo.ef += e; mo.ta += t; mo.de += p; mo.ventas += e + t + p; const d = dd(x.fecha); d.ventas += e + t + p; if (!esAnulada(x)) { mo.nf++; d.nf++; } });
    D.egs.forEach(x => { const mo = meses[parte(x.fecha).m - 1]; if (mo) mo.eg += num(x.cantidad); });
    Object.keys(D.cortes).forEach(f => { dd(f).reg = true; const mo = meses[parte(f).m - 1]; if (mo) mo.dias++; });
    meses.forEach(mo => { ['ef', 'ta', 'de', 'eg', 'ventas'].forEach(k => { mo[k] = r2(mo[k]); }); mo.nc = num(cfg['nc:' + mo.ym]); mo.com = mo.ventas > 0 || mo.nc ? r2(mo.ventas * pct / 100 - mo.nc) : 0; });
    const lista = Object.values(dias).sort((a, b) => a.f < b.f ? -1 : 1).map(d => {
      const p = parte(d.f), c = D.cortes[d.f]; let dif = null;
      if (c) { const cn = contado(c.billetes); if (cn > 0) dif = r2(cn - totalDia(d.f, D).total); }
      return Object.assign(d, { ventas: r2(d.ventas), dow: p.dow, m: p.m, dif });
    });
    return { y, pct, meses, dias: lista };
  }
  function alcance(R, ms) {
    const mm = ms ? [R.meses[ms - 1]] : R.meses, dd = R.dias.filter(d => !ms || d.m === ms), reg = dd.filter(d => d.reg);
    const s = k => r2(mm.reduce((a, x) => a + x[k], 0)), ventas = s('ventas'), nf = mm.reduce((a, x) => a + x.nf, 0);
    const sd = dow => { const l = reg.filter(d => d.dow === dow); return { v: r2(l.reduce((a, d) => a + d.ventas, 0)), n: l.length }; };
    const ord = [...reg].sort((a, b) => b.ventas - a.ventas), cn = reg.filter(d => d.dif != null);
    return { ventas, ef: s('ef'), ta: s('ta'), de: s('de'), eg: s('eg'), com: s('com'), nc: s('nc'), nf, ticket: nf ? ventas / nf : 0, dias: reg.length, prom: reg.length ? ventas / reg.length : 0,
      sab: sd(6), dom: sd(0), mejor: ord[0] && ord[0].ventas > 0 ? ord[0] : null, top: ord.filter(d => d.ventas > 0).slice(0, 5), cuadra: cn.filter(d => d.dif === 0).length,
      sobra: cn.filter(d => d.dif > 0), falta: cn.filter(d => d.dif < 0), ncont: cn.length, lista: dd };
  }
  const kq = n => n >= 1000 ? 'Q' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : 'Q' + Math.round(n);
  const sinMov = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function contar(node, v, f) {
    f = f || Q; if (sinMov() || !v) { node.textContent = f(v); return; }
    const t0 = performance.now(), dur = 900; node.textContent = f(0);
    const st = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); node.textContent = f(k < 1 ? v * e : v); if (k < 1 && node.isConnected !== false) requestAnimationFrame(st); };
    requestAnimationFrame(st);
  }
  function tipEl() { let t = $('.mp-tip', document); if (!t) { t = el('div', { class: 'mp-tip', role: 'tooltip' }); document.body.append(t); } return t; }
  function conTip(node, fn) {
    const mv = e => { const t = tipEl(); t.innerHTML = fn(); t.classList.add('on'); const w = t.offsetWidth, h = t.offsetHeight; let x = e.clientX + 14, y = e.clientY - h - 12; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y < 8) y = e.clientY + 18; t.style.left = Math.max(8, x) + 'px'; t.style.top = y + 'px'; };
    node.addEventListener('pointerenter', mv); node.addEventListener('pointermove', mv); node.addEventListener('pointerleave', () => tipEl().classList.remove('on'));
  }
  const tipMes = (R, m) => '<b>' + mayus(MES[m.m - 1]) + ' ' + R.y + '</b><br>Ventas ' + Q(m.ventas) + '<br><span style="color:#8FD3A1">●</span> Efectivo ' + Q(m.ef) + '<br><span style="color:#9FC0F0">●</span> Tarjeta ' + Q(m.ta) + '<br><span style="color:#F3DA85">●</span> Depósito ' + Q(m.de) + '<br>Comisión ' + Q(m.com) + ' · ' + m.nf + ' fact.';
  const cambiarMes = ym => { S.mes = ym; cargar(true); };

  /* calendario por mes dentro de «Ventas y comisión»: tocar un mes cambia todas las gráficas de abajo */
  function calAnio() {
    const y = S.mes.slice(0, 4), Y = S.Yc[y], R = Y && Y.R, ahora = mesDe(hoy()), mx = R ? Math.max(1, ...R.meses.map(m => m.ventas)) : 1;
    const c = el('div', { class: 'card mp-ycal' + (R ? '' : ' mp-ycarga') });
    c.append(el('div', { class: 'mp-yh' }, el('h3', {}, ico('cal'), ' Calendario del año'),
      el('div', { class: 'mp-yn' }, btn('', 'left', () => cambiarMes(sumaMes(S.mes, -12)), 'btn-ghost', 'Año anterior'), el('b', {}, y), btn('', 'right', () => cambiarMes(sumaMes(S.mes, 12)), 'btn-ghost', 'Año siguiente'),
        btn('Estadísticas del año', 'chart', () => { S.anioE = y; S.mSel = parte(S.mes + '-01').m; S.vista = 'stats'; pintar(); window.scrollTo({ top: 0 }); }, 'btn-gold'))));
    const g = el('div', { class: 'mp-ym12' });
    for (let i = 0; i < 12; i++) {
      const ym = y + '-' + String(i + 1).padStart(2, '0'), m = R && R.meses[i], vac = !m || (!m.ventas && !m.dias);
      const b = el('button', { type: 'button', class: 'mp-ym' + (ym === S.mes ? ' mp-on' : '') + (ym === ahora ? ' mp-hoym' : '') + (vac ? ' mp-vac' : ''), style: '--i:' + i, 'aria-pressed': String(ym === S.mes), onclick: () => { if (ym !== S.mes) cambiarMes(ym); } },
        el('small', {}, mayus(MES[i])), el('b', {}, m ? (vac ? '—' : Q(m.ventas)) : '…'), el('em', {}, m && !vac ? 'Comisión ' + Q(m.com) : ' '),
        el('span', { class: 'mp-yb' }, el('i', { style: 'width:' + (m ? m.ventas / mx * 100 : 0) + '%' })));
      if (m) conTip(b, () => tipMes(R, m));
      g.append(b);
    }
    c.append(g);
    if (R) { const tv = r2(R.meses.reduce((a, m) => a + m.ventas, 0)), tc = r2(R.meses.reduce((a, m) => a + m.com, 0)); c.append(el('p', { class: 'mp-yt muted' }, 'Año ' + y + ': ventas ', el('b', {}, Q(tv)), ' · comisión ', el('b', {}, Q(tc)))); }
    return c;
  }

  /* estadísticas del año */
  const restats = () => { const o = $('.mp-st', host); if (!o) return; const y = window.scrollY; o.replaceWith(vistaStats()); window.scrollTo({ top: y }); };
  const elegirMes = m => { S.mSel = S.mSel === m ? null : m; restats(); };
  function vistaStats() {
    const y = S.anioE || (S.anioE = S.mes.slice(0, 4)), w = el('div', { class: 'mp-st' }), Y = S.Yc[y];
    const nav = el('div', { class: 'mp-stn' },
      el('div', { class: 'mp-fecha' }, btn('', 'left', () => { S.anioE = String(+y - 1); S.mSel = null; restats(); }, 'btn-ghost', 'Año anterior'), el('div', { class: 'mp-fechab' }, ico('chart'), el('b', {}, 'Año ' + y)), btn('', 'right', () => { S.anioE = String(+y + 1); S.mSel = null; restats(); }, 'btn-ghost', 'Año siguiente'),
        btn('Este año', null, () => { S.anioE = hoy().slice(0, 4); S.mSel = null; restats(); }), btn('Repetir animación', 'trend', () => restats(), 'btn-gold')),
      el('div', { class: 'mp-chips' }, el('button', { type: 'button', class: 'mp-chip' + (S.mSel ? '' : ' mp-on'), onclick: () => { S.mSel = null; restats(); } }, 'Todo el año'),
        MES3.map((t, i) => el('button', { type: 'button', class: 'mp-chip' + (S.mSel === i + 1 ? ' mp-on' : ''), onclick: () => { S.mSel = i + 1; restats(); } }, mayus(t)))));
    w.append(nav);
    if (!Y) {
      w.append(el('p', { class: 'muted' }, 'Cargando el año…'));
      datosAnio(y).then(() => { if (S.vista === 'stats' && S.anioE === y) restats(); }).catch(e => { w.append(el('p', { class: 'mp-warn' }, ico('warn'), ' No se pudo leer el año: ' + (e.message || ''))); });
      return w;
    }
    w.append(cuerpoStats(Y));
    return w;
  }
  function cuerpoStats(Y) {
    const R = Y.R, ms = S.mSel, A = alcance(R, ms), etq = ms ? mayus(MES[ms - 1]) + ' ' + Y.y : 'Todo ' + Y.y, b = el('div', { class: 'mp-stb' });
    if (!R.meses.some(m => m.ventas || m.dias)) { b.append(el('p', { class: 'muted' }, 'Todavía no hay registros en ' + Y.y + '.')); return b; }
    const kn = (i, l, v, c, f) => { const n = el('b', {}, ''); contar(n, v, f); return el('div', { class: 'mp-kpi ' + c }, el('span', { class: 'mp-kl' }, ico(i), ' ', l), n); };
    b.append(el('p', { class: 'muted mp-sth' }, el('b', {}, etq), ' · toca un mes en las gráficas (o arriba) para ver solo ese mes; tócalo otra vez para volver al año.'));
    b.append(el('div', { class: 'mp-kpis' }, kn('coin', 'Ventas', A.ventas, 'mp-k1'), kn('check', 'Comisión a recibir', A.com, 'mp-k5 mp-grande'), kn('sheet', 'Facturas', A.nf, 'mp-k2', n => String(Math.round(n))),
      kn('trend', 'Ticket promedio', A.ticket, 'mp-k3'), kn('cal', 'Promedio por día', A.prom, 'mp-k4'),
      el('div', { class: 'mp-kpi mp-k1' }, el('span', { class: 'mp-kl' }, ico('trend'), ' Mejor día'), el('b', {}, A.mejor ? Q(A.mejor.ventas) : '—'), A.mejor ? el('small', { class: 'muted' }, DIA[A.mejor.dow] + ' ' + fMini(A.mejor.f)) : null)));
    /* ventas por mes */
    const mxv = Math.max(1, ...R.meses.map(m => m.ventas)), cols = el('div', { class: 'mp-cols' });
    R.meses.forEach((m, i) => {
      const c = el('button', { type: 'button', class: 'mp-col' + (ms === m.m ? ' mp-on' : ms ? ' mp-dim' : ''), style: '--i:' + i, 'aria-pressed': String(ms === m.m), 'aria-label': mayus(MES[i]) + ' ' + Q(m.ventas), onclick: () => elegirMes(m.m) },
        el('small', { class: 'mp-cval' }, m.ventas ? kq(m.ventas) : ''),
        el('span', { class: 'mp-cb' }, el('span', { class: 'mp-cs', style: 'height:' + (m.ventas / mxv * 100) + '%' }, [['ef', '#4FA06A'], ['ta', '#5B8FD6'], ['de', '#D9B13A']].map(([k, col]) => m[k] > 0 ? el('i', { style: 'flex:' + m[k] + ';background:' + col }) : null))),
        el('small', { class: 'mp-cm' }, MES3[i]));
      conTip(c, () => tipMes(R, m)); cols.append(c);
    });
    b.append(el('div', { class: 'card' }, el('h3', {}, ico('trend'), ' Ventas por mes'), cols,
      el('div', { class: 'mp-leg' }, [['Efectivo', '#4FA06A'], ['Tarjeta', '#5B8FD6'], ['Depósito', '#D9B13A']].map(([t, c]) => el('span', {}, el('i', { style: 'background:' + c }), t)))));
    /* comisión por mes + acumulada */
    b.append(el('div', { class: 'card' }, el('h3', {}, ico('pct'), ' Comisión por mes y acumulada'), lineaCom(R, ms),
      el('div', { class: 'mp-leg' }, el('span', {}, el('i', { style: 'background:#E2BE46' }), 'Comisión del mes'), el('span', {}, el('i', { style: 'background:#B8603A' }), 'Acumulada del año'))));
    /* forma de pago + fin de semana + cuadre */
    const tp = A.ef + A.ta + A.de, it = [['Efectivo', A.ef, '#4FA06A'], ['Tarjeta', A.ta, '#5B8FD6'], ['Depósito', A.de, '#D9B13A']];
    let off = 0, dg = '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(120,130,150,.18)" stroke-width="5"/>';
    it.forEach(([l, v, c], i) => { const p = tp ? v / tp * 100 : 0; if (p > 0) dg += '<circle class="mp-ds" data-i="' + i + '" cx="21" cy="21" r="15.9155" fill="none" stroke="' + c + '" stroke-width="5" pathLength="100" stroke-dasharray="' + p.toFixed(2) + ' ' + (100 - p).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 21 21)" style="animation-delay:' + i * 200 + 'ms"/>'; off += p; });
    dg += '<text x="21" y="21" text-anchor="middle" font-size="4.6" font-weight="700" fill="currentColor">' + kq(tp) + '</text><text x="21" y="26" text-anchor="middle" font-size="2.6" fill="currentColor" opacity=".65">ventas</text>';
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('viewBox', '0 0 42 42'); sv.setAttribute('class', 'mp-don'); sv.setAttribute('role', 'img'); sv.setAttribute('aria-label', 'Ventas por forma de pago'); sv.innerHTML = dg;
    sv.querySelectorAll('.mp-ds').forEach(n => { const x = it[+n.dataset.i]; conTip(n, () => '<b>' + x[0] + '</b><br>' + Q(x[1]) + ' · ' + (tp ? (x[1] / tp * 100).toFixed(1) : '0.0') + '%'); });
    const mxs = Math.max(1, A.sab.v, A.dom.v), fila = (t, o, c) => el('div', { class: 'mp-sd' }, el('div', { class: 'mp-sdh' }, el('b', {}, t), el('span', { class: 'muted' }, o.n + (o.n === 1 ? ' día' : ' días') + (o.n ? ' · promedio ' + Q(o.v / o.n) : ''))), el('div', { class: 'mp-sdb' }, el('i', { style: 'width:' + o.v / mxs * 100 + '%;background:' + c }), el('b', {}, Q(o.v))));
    const dif = (l, arr, cls) => el('div', { class: 'mp-cq ' + cls }, el('small', { class: 'muted' }, l), el('b', {}, String(arr.length)), arr.length ? el('small', {}, Q(Math.abs(arr.reduce((a, d) => a + d.dif, 0)))) : null);
    b.append(el('div', { class: 'mp-g3' },
      el('div', { class: 'card' }, el('h3', {}, ico('card'), ' Forma de pago'), el('div', { class: 'mp-donw' }, sv, el('div', { class: 'mp-isol' }, it.map(([l, v, c]) => el('div', { class: 'mp-il' }, el('i', { style: 'background:' + c }), el('div', {}, el('small', { class: 'muted' }, l), el('b', {}, Q(v)), el('small', { class: 'muted' }, (tp ? (v / tp * 100).toFixed(1) : '0.0') + '%')))))) ),
      el('div', { class: 'card' }, el('h3', {}, ico('cal'), ' Sábado vs domingo'), fila('Sábado', A.sab, '#5B8FD6'), fila('Domingo', A.dom, '#E9B28A'), el('p', { class: 'muted mp-sm' }, 'Egresos (depósitos y egresos): ', el('b', {}, Q(A.eg)))),
      el('div', { class: 'card' }, el('h3', {}, ico('safe'), ' Cuadre de caja'), A.ncont ? el('div', { class: 'mp-cqs' }, el('div', { class: 'mp-cq mp-qok' }, el('small', { class: 'muted' }, 'Cuadran'), el('b', {}, String(A.cuadra))), dif('Sobrante', A.sobra, 'mp-qmal'), dif('Faltante', A.falta, 'mp-qmal')) : el('p', { class: 'muted' }, 'Aún no hay conteos de billetes guardados en este periodo.'),
        el('p', { class: 'muted mp-sm' }, A.ncont ? 'De ' + A.ncont + (A.ncont === 1 ? ' día contado.' : ' días contados.') : ''))));
    /* mejores días */
    if (A.top.length) { const t0 = A.top[0].ventas; b.append(el('div', { class: 'card' }, el('h3', {}, ico('trend'), ' Mejores días · ' + etq), el('div', { class: 'mp-top5' }, A.top.map((d, i) => el('button', { type: 'button', class: 'mp-t5', style: '--i:' + i, onclick: () => irA(d.f, 'corte'), title: 'Abrir este día' }, el('span', { class: 'mp-t5n' }, String(i + 1)), el('span', { class: 'mp-t5f' }, el('b', {}, DIA[d.dow] + ' ' + fMini(d.f)), el('small', { class: 'muted' }, d.nf + ' fact.')), el('span', { class: 'mp-sdb' }, el('i', { style: 'width:' + d.ventas / t0 * 100 + '%;background:#B8A06A' })), el('b', {}, Q(d.ventas))))))); }
    /* mes por mes */
    let ac = 0;
    const tb = el('tbody', {}); R.meses.forEach((m, i) => { ac += m.com; tb.append(el('tr', { class: 'mp-tr' + (ms === m.m ? ' mp-on' : ''), onclick: () => elegirMes(m.m), tabindex: '0', onkeydown: e => { if (e.key === 'Enter') elegirMes(m.m); } }, el('td', {}, el('b', {}, mayus(MES[i]))), el('td', {}, Q(m.ventas)), el('td', {}, Q(m.ef)), el('td', {}, Q(m.ta)), el('td', {}, Q(m.de)), el('td', {}, String(m.nf)), el('td', {}, Q(m.com)), el('td', {}, Q(ac)))); });
    const T = k => r2(R.meses.reduce((a, m) => a + m[k], 0));
    b.append(el('div', { class: 'card' }, el('h3', {}, ico('sheet'), ' Mes por mes'), el('div', { class: 'mp-tw' }, el('table', { class: 'mp-tb2' }, el('thead', {}, el('tr', {}, ['Mes', 'Ventas', 'Efectivo', 'Tarjeta', 'Depósito', 'Facturas', 'Comisión', 'Acumulada'].map(t => el('th', {}, t)))), tb,
      el('tfoot', {}, el('tr', {}, el('td', {}, el('b', {}, 'Total')), el('td', {}, el('b', {}, Q(T('ventas')))), el('td', {}, Q(T('ef'))), el('td', {}, Q(T('ta'))), el('td', {}, Q(T('de'))), el('td', {}, String(T('nf'))), el('td', {}, el('b', {}, Q(T('com')))), el('td', {})))))));
    /* detalle del mes elegido */
    if (ms) {
      const dm = A.lista.filter(d => d.reg || d.ventas), mx = Math.max(1, ...dm.map(d => d.ventas));
      b.append(el('div', { class: 'card' }, el('h3', {}, ico('cal'), ' Días de ' + etq), dm.length ? el('div', { class: 'mp-top5' }, dm.map((d, i) => el('button', { type: 'button', class: 'mp-t5', style: '--i:' + i, onclick: () => irA(d.f, 'corte'), title: 'Abrir este día' },
        el('span', { class: 'mp-t5n mp-t5e' }, String(i + 1)), el('span', { class: 'mp-t5f' }, el('b', {}, DIA[d.dow] + ' ' + fMini(d.f)), el('small', { class: 'muted' }, d.nf + ' fact.')), el('span', { class: 'mp-sdb' }, el('i', { style: 'width:' + d.ventas / mx * 100 + '%;background:#5B8FD6' })), el('b', {}, Q(d.ventas)),
        el('small', { class: d.dif == null ? 'muted' : d.dif === 0 ? 'mp-qokt' : 'mp-qmalt' }, d.dif == null ? 'sin conteo' : d.dif === 0 ? 'Cuadra' : (d.dif > 0 ? '+' : '−') + money(Math.abs(d.dif)))))) : el('p', { class: 'muted' }, 'Sin registros en este mes.'),
        el('div', { class: 'mp-acts' }, btn('Abrir en Ventas y comisión', 'trend', () => { S.mes = Y.y + '-' + String(ms).padStart(2, '0'); S.vista = 'ventas'; cargar(true); }, 'btn-gold'))));
    }
    return b;
  }
  function lineaCom(R, ms) {
    const W = 720, H = 260, L = 14, Rr = 14, T = 26, B = 30, n = 12, ac = [];
    let acc = 0; R.meses.forEach(m => { acc += m.com; ac.push(acc); });
    const last = R.meses.reduce((a, m, i) => (m.ventas || m.nc || m.dias) ? i : a, -1), mx = Math.max(1, ...ac, ...R.meses.map(m => m.com));
    const cw = (W - L - Rr) / n, x = i => L + cw * (i + .5), y = v => T + (H - T - B) * (1 - Math.max(0, v) / mx), bw = cw * .5, yb = H - B;
    let g = '';
    [0, .25, .5, .75, 1].forEach(k => { const yy = T + (H - T - B) * (1 - k); g += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + yy + '" y2="' + yy + '" stroke="rgba(120,130,150,.22)"' + (k ? ' stroke-dasharray="3 5"' : '') + '/>'; if (k) g += '<text x="' + (L + 2) + '" y="' + (yy - 4) + '" font-size="11" fill="currentColor" opacity=".55">' + kq(mx * k) + '</text>'; });
    R.meses.forEach((m, i) => {
      const sel = ms === m.m, h = Math.max(0, yb - y(m.com));
      if (sel) g += '<rect x="' + (x(i) - cw / 2 + 2) + '" y="' + T + '" width="' + (cw - 4) + '" height="' + (yb - T) + '" rx="8" fill="rgba(184,160,106,.16)"/>';
      if (h > 0) g += '<rect class="mp-lb" style="--i:' + i + ';opacity:' + (ms && !sel ? .35 : 1) + '" x="' + (x(i) - bw / 2) + '" y="' + y(m.com) + '" width="' + bw + '" height="' + h + '" rx="5" fill="#E2BE46"/>';
      g += '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="12" font-weight="' + (sel ? 800 : 600) + '" fill="currentColor" opacity="' + (ms && !sel ? .5 : .9) + '">' + MES3[i] + '</text>';
    });
    if (last >= 0) {
      const pts = ac.slice(0, last + 1).map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1));
      g += '<polyline class="mp-lp" pathLength="1" points="' + pts.join(' ') + '" fill="none" stroke="#B8603A" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>';
      ac.slice(0, last + 1).forEach((v, i) => { g += '<circle class="mp-ld" style="--i:' + i + '" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (ms === i + 1 ? 6 : 4) + '" fill="#B8603A" stroke="#fff" stroke-width="1.5"/>'; });
      g += '<text class="mp-ld" style="--i:' + last + '" x="' + Math.min(W - 40, x(last)).toFixed(1) + '" y="' + (y(ac[last]) - 11).toFixed(1) + '" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">' + Q(ac[last]) + '</text>';
    }
    R.meses.forEach((m, i) => { g += '<rect class="mp-hit" data-i="' + i + '" x="' + (x(i) - cw / 2) + '" y="' + T + '" width="' + cw + '" height="' + (H - T) + '" fill="transparent" style="cursor:pointer"/>'; });
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('viewBox', '0 0 ' + W + ' ' + H); sv.setAttribute('class', 'mp-lin'); sv.setAttribute('role', 'img'); sv.setAttribute('aria-label', 'Comisión por mes y acumulada'); sv.innerHTML = g;
    sv.querySelectorAll('.mp-hit').forEach(h => { const i = +h.dataset.i, m = R.meses[i]; h.addEventListener('click', () => elegirMes(m.m)); conTip(h, () => '<b>' + mayus(MES[i]) + ' ' + R.y + '</b><br>Comisión ' + Q(m.com) + (m.nc ? '<br>No corresponde ' + Q(m.nc) : '') + '<br>Acumulada ' + Q(ac[i])); });
    return sv;
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
.mp-acc{border:1px solid var(--line);border-left:6px solid var(--oro);border-radius:16px;background:var(--soft);overflow:hidden;box-shadow:0 10px 24px -20px rgba(0,0,0,.6)}
.mp-ah{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border:0;background:none;color:var(--text);font:inherit;cursor:pointer;text-align:left}
.mp-ah b{font-size:1.05rem}.mp-as{margin-left:auto;font-weight:700}.mp-ed{display:inline-flex;gap:5px;align-items:center;font-size:.8rem;color:var(--oro-t);padding:4px 10px;border:1px solid var(--line);border-radius:999px}
.mp-flash{animation:mpf 1.6s ease}@keyframes mpf{0%,60%{box-shadow:0 0 0 3px var(--oro)}100%{box-shadow:0 0 0 0 transparent}}
.mp-einline{margin:-2px 0 6px 18px!important;border:2px solid var(--oro)!important;background:var(--soft)}
.mp-flat{border:0!important;box-shadow:none!important;background:none!important;padding:0!important}
.mp-acc.mp-p2{border-left-color:#588CDC}.mp-acc.mp-p3{border-left-color:#2F6F7E}.mp-acc.mp-p4{border-left-color:#5E9E6B}.mp-acc.mp-pend{border-color:rgba(217,90,106,.7);background:rgba(217,90,106,.12)}
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
.mp-rec{justify-self:start;display:inline-flex;align-items:baseline;gap:6px;background:#1F4E8C;color:#fff;border-radius:8px;padding:3px 11px;font-size:.72rem;letter-spacing:.08em;font-weight:600;margin-bottom:3px}.mp-rec b{font-size:1.15rem;letter-spacing:.02em;overflow:visible}
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
.mp-mb{flex:1;overflow:auto;display:grid;place-items:center}.mp-cvg{background:#fff;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.6);width:min(100%,calc((100vh - 90px) * var(--r,1.5293)));height:auto}
.mp-modal.mp-z .mp-mb{place-items:start}  .mp-modal.mp-z .mp-cvg{width:2000px;max-width:none}

.mp-top{align-items:stretch!important;gap:16px!important}.mp-semana{grid-template-rows:auto 1fr auto}.mp-dias{align-items:stretch}.mp-dia{height:100%;align-content:start}
.mp-calc2{gap:6px;padding:12px 14px}.mp-c{aspect-ratio:1.25}.mp-cal{gap:3px}
.mp-chm{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center}.mp-chm .btn{padding:3px 12px}
.mp-sticky{position:sticky!important;top:86px;align-self:start;max-height:calc(100vh - 100px);overflow:auto}@media (max-width:1100px){.mp-sticky{position:static!important;max-height:none}}
.mp-col{gap:12px}
.mp-busy::before{content:'';position:fixed;left:0;top:0;height:3px;width:30%;background:var(--oro);z-index:99999;animation:mpb 1s ease-in-out infinite}
@keyframes mpb{0%{left:-30%}100%{left:100%}}
.mp-busy .mp-col,.mp-busy .mp-semana{opacity:.7;transition:opacity .2s}
.mp-accw{display:grid;grid-template-rows:0fr;transition:grid-template-rows .32s cubic-bezier(.4,0,.2,1)}
.mp-accm{min-height:0;overflow:hidden}.mp-accb{display:grid;gap:12px;padding:2px 14px 14px;opacity:0;transform:translateY(-6px);transition:opacity .22s ease,transform .3s ease}
.mp-acc.mp-open>.mp-accw{grid-template-rows:1fr}.mp-acc.mp-open .mp-accb{opacity:1;transform:none;transition-delay:.06s}
.mp-acc{transition:border-color .2s,box-shadow .2s}.mp-acc.mp-open{border-color:var(--oro);box-shadow:0 14px 30px -22px rgba(0,0,0,.55)}
.mp-ah{transition:background .15s}.mp-ah:hover{background:rgba(184,160,106,.12)}.mp-ah:active{transform:scale(.995)}
.mp-ed .mp-e2{display:none}.mp-acc.mp-open .mp-ed .mp-e1{display:none}.mp-acc.mp-open .mp-ed .mp-e2{display:inline}
.mp-chev{display:inline-flex;transition:transform .3s}.mp-acc.mp-open .mp-chev{transform:rotate(180deg)}
.btn{transition:transform .12s,box-shadow .15s,background .15s}.mp-top .btn:active,.mp-acc .btn:active,.mp-seg button:active{transform:scale(.97)}
.mp-c,.mp-dia,.mp-m,.mp-fila{transition:background .15s,border-color .15s,transform .12s,box-shadow .15s}.mp-c:active,.mp-dia:active{transform:scale(.96)}
.mp-vista{animation:mpv .25s ease}@keyframes mpv{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.mp-tags{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.mp-mx{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}.mp-mxc{display:grid;gap:3px;padding:8px 10px;border-radius:12px;border:2px solid var(--line)}.mp-mxc span{font-size:.78rem;font-weight:700}
.mp-mx-efectivo{border-color:#5E9E6B}.mp-mx-tarjeta{border-color:#588CDC}.mp-mx-deposito{border-color:#E2BE46}
@media (max-width:560px){.mp-mx{grid-template-columns:1fr}}
.mp-conteo{margin-top:12px!important;border:1px solid var(--line)!important}.mp-deb{margin:6px 0 0}
.mp-d3{background:rgba(217,60,76,.18)!important;border-color:#D93C4C!important;color:#9E1B2B}.mp-bmal{background:#D93C4C!important}
.mp-tb.mp-malt{color:#C0283A}.mp-tb.mp-okt{color:#1B7F4B}
.mp-tw{overflow-x:auto;border:1px solid var(--line);border-radius:12px}.mp-tb2{width:100%;border-collapse:collapse;font-size:.9rem;white-space:nowrap}.mp-tb2 th{background:#1E3A5F;color:#fff;text-align:left;padding:8px 12px;font-size:.74rem;letter-spacing:.06em}.mp-tb2 td{padding:8px 12px;border-top:1px solid var(--line);min-width:20px}.mp-tb2 tbody tr:nth-child(even){background:var(--soft)}.mp-tb2 td:empty::after{content:'·';color:var(--line)}
.mp-dmef{display:grid;gap:3px;margin-top:6px;padding-top:8px;border-top:1px dashed var(--line);font-size:.9rem}.mp-dmef span{display:flex;justify-content:space-between;gap:10px}.mp-dmf{margin-top:2px;padding:5px 9px;border-radius:9px;background:rgba(94,158,107,.2);border:1px solid #5E9E6B}.mp-dmf b{font-size:1.02rem}
.mp-calc2{align-content:start}.mp-cal{align-content:start}.mp-c{align-self:start;min-width:0}
.mp-dep .mp-f3{grid-template-columns:1fr 1fr 1fr}@media (max-width:700px){.mp-dep .mp-f3{grid-template-columns:1fr}}
.mp-anu{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:-2px 0 10px}.mp-anut{color:#C0283A;font-weight:700}
.mp-pl{display:grid;gap:3px;margin-top:6px;padding-left:10px;border-left:3px solid #B8A06A}.mp-pl span{font-size:.92rem}.mp-pl i{font-style:normal;color:var(--muted)}.mp-warn2{color:#B8603A}
.mp-dep{padding:12px;border-radius:14px;background:rgba(201,162,39,.1);border:1px solid rgba(201,162,39,.45);margin-bottom:10px}.mp-depl{display:block;font-weight:700;margin-bottom:6px}
.mp-iso{margin-bottom:14px}.mp-isog{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;align-items:center}@media (max-width:860px){.mp-isog{grid-template-columns:1fr}}
.mp-isos{width:100%;height:auto;max-height:340px;color:var(--text)}.mp-isol{display:grid;gap:10px}.mp-il{display:flex;gap:12px;align-items:center;padding:10px 14px;border-radius:14px;background:var(--soft);border:1px solid var(--line)}.mp-il i{flex:none;width:14px;height:44px;border-radius:7px}.mp-il>div{display:grid;gap:1px}.mp-il b{font-size:1.25rem}.mp-ilt{background:rgba(184,160,106,.16);border-color:var(--oro)}
.mp-barc{display:flex;gap:8px;align-items:center}.mp-barc .mp-bar{flex:1}.mp-barc small{min-width:44px;text-align:right;color:var(--muted);font-weight:700}.mp-cero{opacity:.55}.mp-fecha input[type=month]{width:auto}
.mp-cvl{aspect-ratio:2600/1700}
.mp-bloques{margin-top:12px}.mp-bloques .mp-grid2{margin-top:10px}
.mp-m{min-width:96px}
.mp-ycal{margin-bottom:14px}.mp-yh{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}.mp-yh h3{margin:0}.mp-yn{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.mp-yn>b{min-width:44px;text-align:center}
.mp-ym12{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}@media (max-width:900px){.mp-ym12{grid-template-columns:repeat(3,minmax(0,1fr))}}@media (max-width:520px){.mp-ym12{grid-template-columns:repeat(2,minmax(0,1fr))}}
.mp-ym{display:grid;gap:3px;text-align:left;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--soft);color:inherit;cursor:pointer;font:inherit;transition:transform .18s,box-shadow .18s,border-color .18s;animation:mpup .45s ease both;animation-delay:calc(var(--i)*35ms)}
.mp-ym:hover{transform:translateY(-2px);box-shadow:0 8px 18px -12px rgba(0,0,0,.6)}.mp-ym small{font-weight:700;color:var(--muted);text-transform:capitalize}.mp-ym b{font-size:1.05rem}.mp-ym em{font-style:normal;font-size:.76rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mp-ym.mp-on{border-color:#B8A06A;background:rgba(184,160,106,.2);box-shadow:0 0 0 2px rgba(184,160,106,.55)}.mp-ym.mp-hoym small::after{content:' · hoy';color:#B8603A}.mp-ym.mp-vac{opacity:.55}
.mp-yb{display:block;height:6px;border-radius:4px;background:rgba(120,130,150,.2);overflow:hidden;margin-top:3px}.mp-yb i{display:block;height:100%;background:#B8A06A;border-radius:4px;transform-origin:left;animation:mpsx .8s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*35ms + .15s)}
.mp-yt{margin:10px 2px 0;font-size:.92rem}.mp-ycarga .mp-ym b{opacity:.5}
@keyframes mpup{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes mpsx{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes mpsy{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.mp-st .mp-stn{display:grid;gap:10px;margin-bottom:14px}.mp-chips{display:flex;gap:6px;flex-wrap:wrap}.mp-chip{padding:6px 12px;border-radius:18px;border:1px solid var(--line);background:var(--soft);color:inherit;font:inherit;font-size:.86rem;cursor:pointer;transition:background .15s,transform .15s}.mp-chip:hover{transform:translateY(-1px)}.mp-chip.mp-on{background:#B8A06A;border-color:#B8A06A;color:#1b1608;font-weight:700}
.mp-sth{margin:0 0 10px}.mp-stb>.card{margin-bottom:14px;animation:mpup .5s ease both}.mp-stb .mp-kpis .mp-kpi{animation:mpup .45s ease both}.mp-stb .mp-kpis .mp-kpi:nth-child(2){animation-delay:.06s}.mp-stb .mp-kpis .mp-kpi:nth-child(3){animation-delay:.12s}.mp-stb .mp-kpis .mp-kpi:nth-child(4){animation-delay:.18s}.mp-stb .mp-kpis .mp-kpi:nth-child(5){animation-delay:.24s}.mp-stb .mp-kpis .mp-kpi:nth-child(6){animation-delay:.3s}
.mp-cols{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:8px;align-items:end}.mp-col{display:grid;gap:4px;justify-items:center;padding:0;border:0;background:none;color:inherit;font:inherit;cursor:pointer;transition:opacity .2s,transform .2s}.mp-col:hover{transform:translateY(-3px)}.mp-col.mp-dim{opacity:.4}
.mp-cb{display:flex;align-items:flex-end;justify-content:center;width:100%;height:210px;border-radius:10px;background:rgba(120,130,150,.1)}.mp-cs{display:flex;flex-direction:column-reverse;width:100%;min-height:0;border-radius:10px 10px 4px 4px;overflow:hidden;transform-origin:bottom;animation:mpsy .9s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*60ms)}.mp-cs i{display:block;min-height:0}
.mp-col.mp-on .mp-cb{box-shadow:0 0 0 2px #B8A06A}.mp-cval{font-weight:700;font-size:.76rem;min-height:1.1em}.mp-cm{text-transform:capitalize;font-weight:700;color:var(--muted)}.mp-col.mp-on .mp-cm{color:inherit}
.mp-leg{display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:.86rem}.mp-leg span{display:inline-flex;gap:6px;align-items:center}.mp-leg i{width:12px;height:12px;border-radius:4px;display:inline-block}
.mp-lin{width:100%;height:auto;color:var(--text)}.mp-lp{stroke-dasharray:1;animation:mpdraw 1.6s ease both}@keyframes mpdraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
.mp-ld{animation:mpfade .4s ease both;animation-delay:calc(var(--i)*110ms + .5s)}@keyframes mpfade{from{opacity:0}to{opacity:1}}.mp-lb{transform-box:fill-box;transform-origin:bottom;animation:mpsy .8s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*60ms)}
.mp-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:14px}@media (max-width:1100px){.mp-g3{grid-template-columns:1fr}}.mp-g3>.card{margin:0;animation:mpup .5s ease both}.mp-g3>.card:nth-child(2){animation-delay:.08s}.mp-g3>.card:nth-child(3){animation-delay:.16s}
.mp-donw{display:grid;grid-template-columns:minmax(0,150px) minmax(0,1fr);gap:14px;align-items:center}.mp-don{width:100%;height:auto;color:var(--text)}.mp-ds{animation:mpdon 1s cubic-bezier(.2,.8,.2,1) both;cursor:pointer}@keyframes mpdon{from{stroke-dasharray:0 100}}
.mp-donw .mp-il{padding:6px 10px}.mp-donw .mp-il i{height:34px}.mp-donw .mp-il b{font-size:1.02rem}
.mp-sd{margin:8px 0 12px}.mp-sdh{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px}.mp-sdb{display:flex;align-items:center;gap:10px;min-width:0}.mp-sdb i{display:block;height:14px;border-radius:7px;transform-origin:left;animation:mpsx .9s cubic-bezier(.2,.8,.2,1) both;flex:none;max-width:70%}.mp-sd .mp-sdb{flex-wrap:nowrap}.mp-sm{margin:10px 0 0;font-size:.9rem}
.mp-cqs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mp-cq{display:grid;gap:2px;padding:10px;border-radius:12px;background:var(--soft);border:1px solid var(--line)}.mp-cq b{font-size:1.5rem}.mp-qok b{color:#1B7F4B}.mp-qmal b{color:#C0283A}.mp-qokt{color:#1B7F4B;font-weight:700}.mp-qmalt{color:#C0283A;font-weight:700}
.mp-top5{display:grid;gap:8px}.mp-t5{display:grid;grid-template-columns:auto minmax(110px,170px) minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:9px 12px;border-radius:12px;border:1px solid var(--line);background:var(--soft);color:inherit;font:inherit;text-align:left;cursor:pointer;animation:mpup .45s ease both;animation-delay:calc(var(--i)*50ms);transition:transform .15s}.mp-t5:hover{transform:translateX(3px)}
.mp-t5n{width:26px;height:26px;border-radius:50%;background:#B8A06A;color:#1b1608;font-weight:800;display:grid;place-items:center}.mp-t5e{background:transparent;color:var(--muted);font-weight:600}.mp-t5f{display:grid}.mp-t5 .mp-sdb i{height:10px}@media (max-width:640px){.mp-t5{grid-template-columns:auto 1fr auto}.mp-t5 .mp-sdb{display:none}}
.mp-tr{cursor:pointer;transition:background .15s}.mp-tr:hover{background:rgba(184,160,106,.14)!important}.mp-tr.mp-on{background:rgba(184,160,106,.28)!important}.mp-tb2 tfoot td{border-top:2px solid var(--line);padding:8px 12px;background:var(--soft)}
.mp-tip{position:fixed;z-index:9999;pointer-events:none;background:#1E2330;color:#fff;padding:8px 11px;border-radius:10px;font-size:.82rem;line-height:1.45;box-shadow:0 10px 24px -8px rgba(0,0,0,.6);opacity:0;transform:translateY(4px);transition:opacity .12s,transform .12s;max-width:240px}.mp-tip.on{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.mp-ym,.mp-yb i,.mp-cs,.mp-lp,.mp-ld,.mp-lb,.mp-ds,.mp-sdb i,.mp-t5,.mp-stb>.card,.mp-g3>.card,.mp-stb .mp-kpi{animation:none!important}}
`));
  }

  window.FaroMusicPro = {
    async iniciar(el_, c) {
      host = el_; ctx = c; S.form = null; S.edit = null; S.draft = {}; S.calYm = null; S.hint = null; S.open = null; S.vista = 'corte'; S.Yc = {}; S.anioE = null; S.mSel = null; loadedKey = null; calKey = null;
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => repintarCorte());
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
