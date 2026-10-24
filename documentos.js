/* Faro Workspace · Documentos: cotización, confirmación de servicio y recibo de pago.
 * Formulario sencillo + vista previa en vivo + "Imprimir / guardar PDF". Correlativo y precios en Supabase
 * (sql/documentos.sql). Solo el director. Usa los colores del Workspace; el documento impreso lleva los de Faro.
 * Uso desde admin.html:  FaroDocumentos.iniciar(contenedor, { api, toast, errText })
 */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const r2 = n => Math.round((+n || 0) * 100) / 100;
  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : NaN; };
  const dmy = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dia = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? DIAS[new Date(+m[1], +m[2] - 1, +m[3], 12).getDay()] : ''; };
  const money = (n, mon) => (n < 0 ? '-' : '') + (mon === 'USD' ? 'US$ ' : 'Q ') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const abs = f => new URL(f, location.href).href;

  const TIPOS = {
    cotizacion: { n: 'Cotización', pl: 'Cotizaciones', titulo: 'Cotización', c: '#8B1A2A', i: 'file' },
    confirmacion: { n: 'Confirmación de servicio', pl: 'Confirmaciones', titulo: 'Confirmación de servicio', c: '#B8A06A', i: 'check' },
    recibo: { n: 'Recibo de pago', pl: 'Recibos', titulo: 'Recibo de pago', c: '#5E9E6B', i: 'card' }
  };
  const COND = {
    cotizacion: 'La fecha se reserva al recibir el anticipo acordado.\nEl saldo pendiente se cancela al obtener el material final.\nLos tiempos de entrega son de 5 a 7 días hábiles.\nServicios adicionales no incluidos se cotizan por separado.\nCotización sujeta a disponibilidad, vigente por el plazo indicado.',
    recibo: 'Este recibo certifica el pago recibido por los servicios indicados.\nEl pago se aplica al monto acordado en la confirmación de servicio.\nConserve este documento como comprobante de pago.'
  };
  COND.confirmacion = COND.cotizacion;
  const PAGO = 'Depósito o transferencia a nombre de Faro Studios · Banco Industrial (BI) · Cuenta monetaria 5210107024\nEnviar comprobante con nombre y número de documento para validar la reserva.';
  const CONTACTO = '+502 5269-5592 · info@farostudios.net · @faro_studios';

  const IC = {
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', ban: '<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>',
    back: '<path d="M15 18l-6-6 6-6"/>', tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  };
  const ico = k => '<svg class="fd-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[k] || IC.file) + '</svg>';

  /* ---------- cálculo (la suma se hace sola) ---------- */
  function calc(d) {
    const lines = d.items.map(it => {
      const q = num(it.cant), ok = isFinite(q) && q > 0, p = num(it.precio);
      return Object.assign({}, it, { qOk: ok, tot: r2((ok ? q : 1) * (isFinite(p) ? p : 0)) });
    });
    const sum = a => r2(a.reduce((s, l) => s + l.tot, 0));
    if (d.tipo === 'recibo') {
      const sub = sum(lines.filter(l => !l.antes)), dep = sum(lines.filter(l => l.antes));
      return { lines, sub, dep, desc: 0, ant: 0, total: r2(sub + dep) };
    }
    const sub = sum(lines), dv = Math.max(0, num(d.desc) || 0);
    const desc = d.descTipo === 'Q' ? r2(Math.min(dv, sub)) : r2(sub * Math.min(dv, 100) / 100);
    const total = r2(sub - desc), ap = Math.max(0, num(d.anticipoPct) || 0);
    return { lines, sub, dep: 0, desc, total, ant: ap > 0 ? r2(total * Math.min(ap, 100) / 100) : 0 };
  }

  /* ---------- el documento (lo mismo se ve en pantalla y se imprime) ---------- */
  const FONTS = 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap';
  function docCSS(tipo) {
    const q = tipo === 'cotizacion';
    return `
@page{size:A4;margin:0}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;background:#fff}
body{font:400 10.5pt/1.35 'Lato',Arial,sans-serif;color:#222}
.pg{position:relative;width:210mm;min-height:297mm;display:flex;flex-direction:column;background:#fff;overflow:hidden}
.hd{position:relative;height:${q ? '76mm' : '80mm'};flex:none;background:${q ? '#F3F0EA' : '#7F2530'};overflow:hidden}
.hd .orb{position:absolute;right:-34mm;top:-46mm;width:${q ? '112mm' : '118mm'};height:${q ? '118mm' : '96mm'};border-radius:50%;background:${q ? '#3A3A3C' : '#55222B'}}
.hd::after{content:'';position:absolute;left:-12%;right:-12%;bottom:-17mm;height:25mm;border-radius:50%;background:#fff}
.hd .logo{position:absolute;left:14mm;top:13mm;width:45mm;height:21.5mm;background:url(${abs(q ? 'doc-logo-borgona.png' : 'doc-logo.png')}) center/contain no-repeat}
.hd .ti{position:absolute;right:14mm;top:11mm;text-align:right;color:#fff}
.hd h1{margin:0;font:400 24pt/1.05 'Lato',Arial,sans-serif}
.hd .no{margin-top:3mm;font:400 14pt/1 'Lato',Arial,sans-serif;color:#C9B27A}
.hd .mt{margin-top:5mm;font-size:8.5pt;line-height:1.5;color:${q ? '#E8E2D6' : '#F1E6E6'}}
.hd .cl{position:absolute;left:14mm;top:${q ? '39mm' : '44mm'};max-width:${q ? '92mm' : '130mm'};font-size:${q ? '8.4pt' : '9pt'};letter-spacing:${q ? '.14em' : '.22em'};line-height:1.5;color:${q ? '#333' : '#fff'}}
.hd .cl b{color:${q ? '#222' : '#B8A06A'};font-weight:700}
.bd{padding:6mm 14mm 0;flex:none}
.inf{display:flex;gap:8mm;margin:2mm 0 6mm}
.inf>div{flex:1;min-width:0}
.inf h4{margin:0 0 1.5mm;font:700 8.5pt 'Lato',Arial;letter-spacing:.3em;color:#B8A06A;text-transform:uppercase}
.inf p{margin:0;font-size:9.5pt;white-space:pre-line}
.inf p.s{font-weight:700}
table{width:100%;border-collapse:collapse;font-size:9.5pt}
th{background:${q ? '#3A3A3C' : '#7F2530'};color:#fff;text-align:left;padding:2.6mm 2.4mm;font-weight:700}
th.r,td.r{text-align:right}
td{padding:2.2mm 2.4mm;height:9.2mm;vertical-align:middle;border-bottom:.2mm solid #E9E5DD;white-space:pre-line}
tbody tr:nth-child(odd) td{background:#F3F1ED}
td.n{width:14mm}td.q{width:26mm}td.t{width:34mm;white-space:nowrap}
.bt{display:flex;gap:8mm;margin-top:7mm;align-items:flex-start}
.cn{flex:1;min-width:0}
.cn h4{margin:0 0 2mm;font:700 8.5pt 'Lato',Arial;letter-spacing:.3em;color:#7F2530;text-transform:uppercase}
.cn ul{margin:0;padding-left:4mm;font-size:7.6pt;line-height:1.5;color:#6A655C}
.tt{width:78mm;flex:none}
.tt .rows{background:#F3F1ED;padding:3mm 4mm}
.tt .r1{display:flex;justify-content:space-between;gap:4mm;padding:1.4mm 0;font-size:9.5pt;color:#555}
.tt .r1 span:last-child{white-space:nowrap}
.tt .fin{display:flex;justify-content:space-between;align-items:center;padding:4.2mm 4mm;background:${q ? '#3A3A3C' : '#7F2530'};color:#fff}
.tt .fin span{font-size:9.5pt;letter-spacing:.04em}
.tt .fin b{font:700 14pt 'Lato',Arial;color:#E2C987}
.ft{margin-top:auto;position:relative;background:#262628;color:#F3EEE6;padding:8mm 14mm 7mm;min-height:50mm;break-inside:avoid}
.ft h4{margin:0 0 2mm;font:400 12pt 'Lato',Arial;letter-spacing:.3em;color:#B8A06A;text-transform:uppercase}
.ft .pago{font-size:8.5pt;line-height:1.55;color:#D9D3C8;white-space:pre-line;max-width:128mm}
.ft .sg{display:flex;justify-content:space-between;align-items:flex-end;margin-top:4mm;gap:8mm}
.ft .cf{width:62mm;border-top:.3mm solid #8d8a84;padding-top:1.5mm;font-size:8pt;color:#C9C4BA}
.ft .fm{margin-left:auto;text-align:right}
.ft .fi{width:34.5mm;height:28.7mm;margin:0 0 -9mm auto;background:url(${abs('doc-firma.png')}) center/contain no-repeat}
.ft .fm b{display:block;font-size:11pt;color:#C9B27A}
.ft .fm span{font-size:10.5pt;color:#C9B27A}
.ft .ct{margin-top:5mm;text-align:right;font-size:8pt;color:#C9C4BA}
.wm{position:absolute;left:0;right:0;top:120mm;text-align:center;transform:rotate(-24deg);font:700 70pt 'Lato',Arial;letter-spacing:.1em;color:rgba(139,26,42,.16);pointer-events:none}`;
  }
  function docBody(d) {
    const T = TIPOS[d.tipo], c = calc(d), mon = d.moneda, q = d.tipo === 'cotizacion', rec = d.tipo === 'recibo';
    const cli = [['Cliente', d.cliente], ['Tel', d.tel], ['Nit', d.nit], ['Correo', d.correo], ['Dirección', d.direccion]].filter(x => (x[1] || '').trim());
    const mt = ['Emisión: ' + dmy(d.emision)];
    if (!rec && num(d.vigencia) > 0) mt.push('Vigencia: ' + num(d.vigencia) + (num(d.vigencia) === 1 ? ' día' : ' días'));
    if (d.tipo === 'confirmacion' && num(d.anticipoPct) > 0) mt.push('Anticipo: ' + num(d.anticipoPct) + '%');
    const blk = (t, v, s) => (v || '').trim() ? '<div><h4>' + t + '</h4><p' + (s ? ' class="s"' : '') + '>' + esc(v) + '</p></div>' : '';
    let inf = '';
    if (q) inf = blk('Servicio', d.servicio, 1);
    else if (rec) inf = blk('Fecha de pago', dmy(d.fecha)) + blk('Ubicación', d.ubicacion) + blk('Concepto', d.servicio);
    else {
      const hr = d.horaIni ? d.horaIni + ' h.' + (d.horaFin ? ' – ' + d.horaFin + ' h.' : '') : '';
      inf = blk('Fecha y hora', [d.fecha ? dia(d.fecha) + ' ' + dmy(d.fecha) : '', hr].filter(Boolean).join('\n')) + blk('Ubicación', d.ubicacion) + blk('Servicio', d.servicio, 1);
    }
    const nrows = Math.max(6, c.lines.length);
    let rows = '';
    for (let i = 0; i < nrows; i++) {
      const l = c.lines[i];
      rows += l ? '<tr><td class="n">' + String(i + 1).padStart(2, '0') + '</td><td>' + esc(l.desc) + '</td><td class="r q">' + (l.qOk ? esc(String(num(l.cant))) : 'N/A') + '</td><td class="r t">' + money(l.tot, mon) + '</td></tr>'
        : '<tr><td class="n"></td><td></td><td class="q"></td><td class="t"></td></tr>';
    }
    const r1 = (a, b) => '<div class="r1"><span>' + esc(a) + '</span><span>' + b + '</span></div>';
    let tot = r1('Subtotal', money(c.sub, mon));
    if (rec) { if (c.dep > 0) tot += r1(d.depLabel || 'Depositado previamente', money(c.dep, mon)); }
    else {
      if (c.desc > 0) tot += r1('Descuento' + (d.descTipo === 'Q' ? '' : ' (' + num(d.desc) + '%)') + (d.cupon ? ' · cupón ' + d.cupon : ''), money(-c.desc, mon));
      if (c.ant > 0) tot += r1('Anticipo (' + num(d.anticipoPct) + '%)', money(c.ant, mon));
      if ((d.notaLabel || '').trim() && isFinite(num(d.notaMonto))) tot += r1(d.notaLabel, money(num(d.notaMonto), mon));
    }
    const li = String(d.condiciones || '').split('\n').map(s => s.trim()).filter(Boolean).map(s => '<li>' + esc(s) + '</li>').join('');
    return '<div class="pg">' + (d.estado === 'anulado' ? '<div class="wm">ANULADO</div>' : '') +
      '<header class="hd"><div class="orb"></div><div class="logo"></div><div class="ti"><h1>' + T.titulo + '</h1><div class="no">' + (d.numero ? (q ? 'No. ' : '') + esc(d.numero) : 'Borrador') + '</div><div class="mt">' + mt.join('<br>') + '</div></div>' +
      '<div class="cl">' + cli.map(x => (x[0] === 'Cliente' ? '<b>' : '') + esc(x[0]) + ': ' + esc(x[1]) + (x[0] === 'Cliente' ? '</b>' : '')).join('<br>') + '</div></header>' +
      '<section class="bd"><div class="inf">' + inf + '</div><table><thead><tr><th>No.</th><th>Descripción</th><th class="r">Cantidad</th><th class="r">Total</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="bt"><div class="cn"><h4>Condiciones y observaciones</h4><ul>' + li + '</ul></div><div class="tt"><div class="rows">' + tot + '</div><div class="fin"><span>' + (rec ? 'TOTAL PAGADO' : 'SALDO TOTAL') + '</span><b>' + money(c.total, mon) + '</b></div></div></div></section>' +
      '<footer class="ft">' + (rec ? '' : '<h4>Forma de pago</h4><div class="pago">' + esc(d.formaPago) + '</div>') +
      '<div class="sg">' + (d.tipo === 'confirmacion' ? '<div class="cf">Nombre y firma del cliente</div>' : '<span></span>') + '<div class="fm"><div class="fi"></div><b>David Martínez</b><span>Director creativo</span></div></div>' +
      '<div class="ct">' + CONTACTO + '</div></footer></div>';
  }
  const docHTML = d => '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + esc(nombreArchivo(d)) + '</title><link rel="stylesheet" href="' + FONTS + '"><style>' + docCSS(d.tipo) + '</style></head><body>' + docBody(d) + '</body></html>';
  const nombreArchivo = d => ('Faro Studios - ' + (d.tipo === 'recibo' ? 'Recibo' : d.tipo === 'confirmacion' ? 'Confirmación de servicio' : 'Cotización') + ' ' + (d.numero || 'borrador')).replace(/[\\/:*?"<>|]/g, '-');

  function imprimir(d) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none';
    document.body.append(f);
    f.onload = async () => {
      try { await f.contentDocument.fonts.ready; } catch (e) { /* sin fuentes: sigue */ }
      setTimeout(() => {
        const t = document.title; document.title = nombreArchivo(d);
        try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { ctx.toast('No se pudo abrir la impresión'); }
        document.title = t; setTimeout(() => f.remove(), 120000);
      }, 500);
    };
    f.srcdoc = docHTML(d);
  }

  /* ---------- estado ---------- */
  let ctx = null, root = null, started = false, uid = 0;
  const S = { vista: 'lista', filtro: 'todos', q: '', docs: [], svs: [], err: '', cargando: false, d: null, pv: null };

  function h(tag, a, ...kids) {
    const e = document.createElement(tag);
    for (const k in (a || {})) { if (k === 'class') e.className = a[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), a[k]); else if (a[k] !== false && a[k] != null) e.setAttribute(k, a[k] === true ? '' : a[k]); }
    kids.flat().forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
    return e;
  }
  const ic = (k, t) => { const s = h('span', { class: 'fd-ic' }); s.innerHTML = ico(k) + (t ? '<span>' + esc(t) + '</span>' : ''); return s; };
  const btn = (k, t, fn, cls) => h('button', { type: 'button', class: 'btn ' + (cls || 'btn-ghost') + ' btn-sm', onclick: fn }, ic(k, t));

  function css() {
    if (document.getElementById('fd-css')) return;
    const s = h('style', { id: 'fd-css' });
    s.textContent = `
.fd-i{width:18px;height:18px;flex:none}.fd-ic{display:inline-flex;align-items:center;gap:7px}
.fd-top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px}
.fd-chips{display:flex;flex-wrap:wrap;gap:8px}
.fd-chip{border:1.5px solid var(--line);background:transparent;border-radius:999px;padding:7px 14px;font-weight:700;cursor:pointer;display:inline-flex;gap:7px;align-items:center}
.fd-chip[aria-pressed=true]{background:var(--oro);color:var(--pizarra);border-color:var(--oro)}
.fd-new{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:18px}
.fd-nb{display:flex;align-items:center;gap:12px;text-align:left;padding:16px 18px;border-radius:14px;border:1.5px solid var(--line);background:var(--surface);cursor:pointer;box-shadow:var(--shadow);transition:transform .15s,border-color .15s}
.fd-nb:hover{transform:translateY(-2px);border-color:var(--oro)}
.fd-nb .b{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;color:#fff;flex:none}
.fd-nb b{display:block;font-size:1.02rem}.fd-nb small{color:var(--muted)}
.fd-row{display:grid;grid-template-columns:44px minmax(0,1.3fr) minmax(0,1.2fr) 120px 110px auto;gap:12px;align-items:center;padding:12px 4px;border-top:1px solid var(--line)}
.fd-row .b{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;color:#fff}
.fd-row .nm{font-weight:700}.fd-row .sm{color:var(--muted);font-size:.9rem}
.fd-tag{display:inline-block;border-radius:999px;padding:2px 10px;font-size:.78rem;font-weight:700;background:rgba(94,158,107,.2)}
.fd-tag.an{background:rgba(217,90,106,.25)}
.fd-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.fd-acts .btn,.fd-bar .btn{padding:6px 10px;white-space:nowrap;flex:none;width:auto;max-width:none}
.fd-ic{white-space:nowrap}
.fd-top .fd-acts input[type=search]{flex:1 1 220px;min-width:180px}
.fd-ed{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.95fr);gap:20px;align-items:start}
.fd-sec{margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
.fd-sec>h3{font:700 .8rem var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--oro-t);margin-bottom:4px;display:flex;gap:8px;align-items:center}
.fd-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fd-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.fd-g2>*,.fd-g3>*{min-width:0}
.fd-it{display:grid;grid-template-columns:minmax(0,1fr) 70px 110px 110px 34px;gap:8px;align-items:start;margin-top:10px;padding:10px;border-radius:12px;background:var(--soft)}
.fd-it .full{grid-column:1/-1}
.fd-it textarea{min-height:44px;resize:vertical}
.fd-it .tot{padding:12px 4px;text-align:right;font-weight:700;white-space:nowrap}
.fd-x{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:none;cursor:pointer;display:grid;place-items:center;color:var(--red-t)}
.fd-sum{margin-top:14px;padding:14px 16px;border-radius:14px;background:var(--soft)}
.fd-sum div{display:flex;justify-content:space-between;gap:10px;padding:3px 0}
.fd-sum .big{margin-top:6px;padding-top:8px;border-top:1px solid var(--line);font-size:1.25rem;font-weight:700}
.fd-pv{position:sticky;top:12px}
.fd-pvbox{position:relative;width:100%;overflow:hidden;border-radius:10px;border:1px solid var(--line);background:#fff;box-shadow:var(--shadow)}
.fd-pvbox iframe{position:absolute;left:0;top:0;width:794px;border:0;transform-origin:0 0;background:#fff}
.fd-bar{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;align-items:center}
.fd-lock{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:var(--soft);margin-bottom:14px;color:var(--muted);font-size:.92rem}
.fd-pr{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,2fr) 120px 70px auto;gap:10px;align-items:center;padding:10px 4px;border-top:1px solid var(--line)}
.fd-ct{font:700 .8rem var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--oro-t);margin:22px 0 4px}
@media (max-width:1100px){.fd-ed{grid-template-columns:1fr}.fd-pv{position:static}}
@media (max-width:760px){.fd-row{grid-template-columns:44px 1fr;}.fd-row>:nth-child(n+3){grid-column:2}.fd-acts{justify-content:flex-start}
.fd-it{grid-template-columns:1fr 1fr}.fd-it .tot{text-align:left}.fd-g2,.fd-g3{grid-template-columns:1fr}.fd-pr{grid-template-columns:1fr}}`;
    document.head.append(s);
  }

  /* ---------- datos ---------- */
  async function cargar() {
    S.cargando = true; S.err = ''; pintar();
    try {
      const [a, b] = await Promise.all([ctx.api('/rest/v1/doc_documentos?select=*&order=creado.desc&limit=500'), ctx.api('/rest/v1/doc_servicios?select=*&order=categoria.asc,orden.asc,nombre.asc')]);
      if (!a.ok || !b.ok) S.err = 'tablas'; else { S.docs = await a.json(); S.svs = await b.json(); }
    } catch (e) { if (e && e.message === 'sesion') return; S.err = 'conexion'; }
    S.cargando = false; pintar();
  }

  function nuevo(tipo, base) {
    const d = {
      tipo, moneda: 'GTQ', emision: hoy(), vigencia: tipo === 'recibo' ? '' : 7, cliente: '', tel: '', nit: '', correo: '', direccion: '',
      servicio: '', fecha: '', horaIni: '', horaFin: '', ubicacion: '', items: [{ desc: '', cant: tipo === 'recibo' ? '' : '1', precio: '', antes: false }],
      desc: '', descTipo: '%', anticipoPct: tipo === 'confirmacion' ? 50 : '', notaLabel: '', notaMonto: '', depLabel: 'Depositado previamente',
      condiciones: COND[tipo], formaPago: PAGO, estado: 'emitido'
    };
    if (base) {
      ['moneda', 'cliente', 'tel', 'nit', 'correo', 'direccion', 'servicio', 'fecha', 'horaIni', 'horaFin', 'ubicacion', 'desc', 'descTipo', 'anticipoPct', 'cupon'].forEach(k => { if (base[k] != null && base[k] !== '') d[k] = base[k]; });
      if (tipo === 'recibo') { d.anticipoPct = ''; d.desc = ''; if (base.ubicacion) d.ubicacion = base.ubicacion; d.fecha = hoy(); d.servicio = base.servicio || ''; }
      d.items = (base.items || []).map(i => ({ desc: i.desc, cant: tipo === 'recibo' ? '' : (i.cant || '1'), precio: i.precio, antes: false }));
      if (!d.items.length) d.items = [{ desc: '', cant: '1', precio: '', antes: false }];
    }
    return d;
  }
  const fila = x => Object.assign({}, x.datos, { id: x.id, tipo: x.tipo, serie: x.serie, numero: x.numero, estado: x.estado });
  function abrir(d) { S.d = d; S.vista = 'editor'; pintar(); window.scrollTo({ top: 0 }); }

  async function guardar(imp) {
    const d = S.d;
    if (!(d.cliente || '').trim()) { ctx.toast('Escribe el nombre del cliente'); return; }
    if (!d.items.some(i => (i.desc || '').trim())) { ctx.toast('Agrega al menos una línea con descripción'); return; }
    const c = calc(d);
    const { id, serie, numero, estado, ...datos } = d;
    try {
      let r;
      if (id) {
        r = await ctx.api('/rest/v1/doc_documentos?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { cliente: d.cliente.trim(), moneda: d.moneda, total: c.total, datos } });
      } else {
        const n = await ctx.api('/rest/v1/rpc/doc_siguiente_numero', { method: 'POST', body: { p_tipo: d.tipo } });
        if (!n.ok) { ctx.toast(await ctx.errText(n)); return; }
        const nn = (await n.json())[0];
        r = await ctx.api('/rest/v1/doc_documentos', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { tipo: d.tipo, serie: nn.serie, numero: nn.numero, cliente: d.cliente.trim(), moneda: d.moneda, total: c.total, datos } });
      }
      if (!r.ok) { ctx.toast(await ctx.errText(r)); return; }
      const g = (await r.json())[0];
      S.d = fila(g); ctx.toast('Guardado · ' + g.numero);
      const i = S.docs.findIndex(x => x.id === g.id); if (i >= 0) S.docs[i] = g; else S.docs.unshift(g);
      if (imp) imprimir(S.d); else { S.vista = 'lista'; }
      pintar();
    } catch (e) { if (!e || e.message !== 'sesion') ctx.toast('No se pudo guardar. Revisa tu conexión.'); }
  }
  async function anular(x) {
    if (!confirm('¿Anular ' + x.numero + '? Queda en la lista como ANULADO y el número no se reutiliza.')) return;
    try {
      const r = await ctx.api('/rest/v1/doc_documentos?id=eq.' + x.id, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { estado: 'anulado' } });
      if (!r.ok) { ctx.toast(await ctx.errText(r)); return; }
      const g = (await r.json())[0]; const i = S.docs.findIndex(z => z.id === g.id); if (i >= 0) S.docs[i] = g; ctx.toast('Documento anulado'); pintar();
    } catch (e) { /* sesión */ }
  }

  /* ---------- lista ---------- */
  function vLista() {
    const w = h('div');
    w.append(h('div', { class: 'fd-new' }, Object.keys(TIPOS).map(k => h('button', { type: 'button', class: 'fd-nb', onclick: () => abrir(nuevo(k)) },
      h('span', { class: 'b', style: 'background:' + TIPOS[k].c }, (() => { const s = h('span'); s.innerHTML = ico(TIPOS[k].i); return s; })()),
      h('span', {}, h('b', {}, (k === 'recibo' ? 'Nuevo recibo' : k === 'confirmacion' ? 'Nueva confirmación' : 'Nueva cotización')), h('small', {}, 'Con correlativo automático'))))));
    const top = h('div', { class: 'fd-top' });
    const chips = h('div', { class: 'fd-chips' }, [['todos', 'Todos']].concat(Object.keys(TIPOS).map(k => [k, TIPOS[k].pl])).map(([k, t]) =>
      h('button', { type: 'button', class: 'fd-chip', 'aria-pressed': String(S.filtro === k), onclick: () => { S.filtro = k; pintar(); } }, t)));
    const q = h('input', { type: 'search', placeholder: 'Buscar cliente o número…', value: S.q, 'aria-label': 'Buscar', style: 'max-width:280px;padding:9px 14px;border-radius:999px;border:1px solid var(--line);background:var(--input)' });
    q.addEventListener('input', () => { S.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { pintar(); const n = root.querySelector('input[type=search]'); if (n) { n.focus(); n.setSelectionRange(99, 99); } }, 250); });
    top.append(chips, h('div', { class: 'fd-acts' }, btn('tag', 'Catálogo de precios', () => { S.vista = 'precios'; pintar(); }), q));
    w.append(top);
    const card = h('div', { class: 'card' });
    const ql = S.q.trim().toLowerCase();
    const lista = S.docs.filter(x => (S.filtro === 'todos' || x.tipo === S.filtro) && (!ql || (x.cliente + ' ' + x.numero).toLowerCase().includes(ql)));
    if (!lista.length) card.append(h('p', { class: 'muted' }, S.docs.length ? 'Nada coincide con tu búsqueda.' : 'Todavía no hay documentos. Crea el primero arriba.'));
    lista.forEach(x => {
      const T = TIPOS[x.tipo], b = h('span', { class: 'b', style: 'background:' + T.c }); b.innerHTML = ico(T.i);
      card.append(h('div', { class: 'fd-row' },
        b,
        h('div', {}, h('div', { class: 'nm' }, x.numero), h('div', { class: 'sm' }, T.n)),
        h('div', {}, h('div', { class: 'nm' }, x.cliente), h('div', { class: 'sm' }, dmy((x.datos || {}).emision))),
        h('div', { class: 'nm' }, money(+x.total, x.moneda)),
        h('div', {}, h('span', { class: 'fd-tag' + (x.estado === 'anulado' ? ' an' : '') }, x.estado === 'anulado' ? 'Anulado' : 'Emitido')),
        h('div', { class: 'fd-acts' },
          btn('edit', 'Abrir', () => abrir(fila(x))), btn('print', 'PDF', () => imprimir(fila(x))), btn('copy', 'Duplicar', () => abrir(nuevo(x.tipo, fila(x)))),
          x.tipo === 'cotizacion' ? btn('check', 'Confirmar', () => abrir(nuevo('confirmacion', fila(x)))) : null,
          x.tipo !== 'recibo' ? btn('card', 'Recibo', () => abrir(nuevo('recibo', fila(x)))) : null,
          x.estado !== 'anulado' ? btn('ban', 'Anular', () => anular(x), 'btn-red') : null)));
    });
    w.append(card);
    return w;
  }

  /* ---------- editor ---------- */
  function vEditor() {
    const d = S.d, T = TIPOS[d.tipo], rec = d.tipo === 'recibo', q = d.tipo === 'cotizacion', cf = d.tipo === 'confirmacion';
    const w = h('div');
    w.append(h('div', { class: 'fd-top' },
      h('div', { class: 'fd-acts' }, btn('back', 'Volver', () => { S.vista = 'lista'; pintar(); }), h('h2', { style: 'margin:0 0 0 8px;font-size:1.7rem' }, T.n)),
      h('div', {}, d.numero ? h('b', {}, d.numero) : h('span', { class: 'muted' }, 'El número se asigna al guardar'))));
    if (d.estado === 'anulado') w.append(h('div', { class: 'msg' }, 'Este documento está anulado. Puedes verlo o imprimirlo, pero ya no se edita.'));
    const ed = h('div', { class: 'fd-ed' }), card = h('div', { class: 'card' }), pv = h('div', { class: 'fd-pv' });
    const lock = d.estado === 'anulado';

    const ins = {};
    const fld = (lab, key, o) => {
      o = o || {};
      const inp = o.area ? h('textarea', { rows: o.rows || 3 }) : h('input', { type: o.type || 'text', placeholder: o.ph || '', inputmode: o.im || null, list: o.list || null, step: o.step || null });
      inp.value = d[key] == null ? '' : d[key]; if (lock) inp.disabled = true; ins[key] = inp;
      inp.addEventListener('input', () => { d[key] = inp.value; if (o.on) o.on(inp.value); refrescar(); });
      inp.id = 'fd-f' + (++uid);
      return h('div', { class: 'field' }, h('label', { for: inp.id }, lab), inp);
    };
    const sec = (t, i) => h('div', { class: 'fd-sec' }, h('h3', {}, ic(i, t)));

    /* cliente */
    const dl = h('datalist', { id: 'fd-clientes' });
    const vistos = new Map(); S.docs.forEach(x => { const n = (x.cliente || '').trim(); if (n && !vistos.has(n.toLowerCase())) vistos.set(n.toLowerCase(), x.datos || {}); });
    [...vistos.keys()].forEach(k => dl.append(h('option', { value: (S.docs.find(x => (x.cliente || '').trim().toLowerCase() === k) || {}).cliente })));
    const gc = sec('Cliente', 'edit');
    gc.append(dl);
    const alElegir = v => { const p = vistos.get((v || '').trim().toLowerCase()); if (!p) return; let cambio = false; ['tel', 'nit', 'correo', 'direccion'].forEach(k => { if (!d[k] && p[k]) { d[k] = p[k]; if (ins[k]) ins[k].value = p[k]; cambio = true; } }); if (cambio) refrescar(); };
    gc.append(fld('Nombre del cliente', 'cliente', { list: 'fd-clientes', on: alElegir }));
    gc.append(h('div', { class: 'fd-g3' }, fld('Teléfono', 'tel', { im: 'tel' }), fld('NIT', 'nit'), fld('Correo', 'correo', { type: 'email' })));
    if (!rec) gc.append(fld('Dirección', 'direccion'));
    card.append(gc);

    /* datos del documento */
    const gd = sec('Datos del documento', 'file');
    const mon = h('select'); [['GTQ', 'Quetzales (Q)'], ['USD', 'Dólares (US$)']].forEach(([v, t]) => { const o = h('option', { value: v }, t); if (d.moneda === v) o.selected = true; mon.append(o); });
    mon.disabled = lock; mon.addEventListener('change', () => { d.moneda = mon.value; formRebuild(); });
    gd.append(h('div', { class: 'fd-g3' }, fld('Fecha de emisión', 'emision', { type: 'date' }), rec ? h('div') : fld('Vigencia (días)', 'vigencia', { type: 'number', im: 'numeric' }), h('div', { class: 'field' }, h('label', {}, 'Moneda'), mon)));
    if (q) gd.append(fld('Servicio (título del documento)', 'servicio', { ph: 'Ej. ACADEMIA | GUITARRA ELÉCTRICA CICLO I' }));
    if (cf) {
      gd.append(h('div', { class: 'fd-g3' }, fld('Fecha del servicio', 'fecha', { type: 'date' }), fld('Hora de inicio', 'horaIni', { type: 'time' }), fld('Hora de fin', 'horaFin', { type: 'time' })));
      gd.append(fld('Ubicación', 'ubicacion', { area: true, rows: 2 }), fld('Servicio', 'servicio', { ph: 'Ej. 01 | Sesiones y eventos sociales — OVERTURE' }));
    }
    if (rec) gd.append(h('div', { class: 'fd-g3' }, fld('Fecha de pago', 'fecha', { type: 'date' }), fld('Ubicación', 'ubicacion'), fld('Concepto', 'servicio', { ph: 'Ej. Producciones audiovisuales.' })));
    card.append(gd);

    /* líneas */
    const gl = sec('Detalle', 'tag');
    const lista = h('div'); gl.append(lista);
    const sumBox = h('div', { class: 'fd-sum' });
    const pintaItems = () => {
      lista.replaceChildren();
      const cal = calc(d);
      d.items.forEach((it, n) => {
        const row = h('div', { class: 'fd-it' });
        const ds = h('textarea', { placeholder: 'Descripción', 'aria-label': 'Descripción ' + (n + 1), rows: 2 }); ds.value = it.desc || ''; ds.disabled = lock;
        const qn = h('input', { type: 'text', inputmode: 'decimal', placeholder: rec ? 'N/A' : 'Cant.', 'aria-label': 'Cantidad' }); qn.value = it.cant || ''; qn.disabled = lock;
        const pr = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'Precio', 'aria-label': 'Precio' }); pr.value = it.precio === '' || it.precio == null ? '' : it.precio; pr.disabled = lock;
        const tot = h('div', { class: 'tot' }, money(cal.lines[n].tot, d.moneda));
        ds.addEventListener('input', () => { it.desc = ds.value; refrescar(); });
        const rc = () => { it.cant = qn.value; it.precio = pr.value; tot.textContent = money(calc(d).lines[n].tot, d.moneda); refrescar(); };
        qn.addEventListener('input', rc); pr.addEventListener('input', rc);
        const x = h('button', { type: 'button', class: 'fd-x', title: 'Quitar línea', 'aria-label': 'Quitar línea', disabled: lock, onclick: () => { d.items.splice(n, 1); if (!d.items.length) d.items.push({ desc: '', cant: rec ? '' : '1', precio: '', antes: false }); pintaItems(); refrescar(); } }); x.innerHTML = ico('x');
        row.append(ds, qn, pr, tot, x);
        const cat = S.svs.filter(s => s.activo && s.moneda === d.moneda);
        if (cat.length && !lock) {
          const sel = h('select', { 'aria-label': 'Elegir del catálogo', class: 'full' }, h('option', { value: '' }, '＋ Elegir del catálogo de precios…'));
          const cats = [...new Set(cat.map(s => s.categoria))];
          cats.forEach(c => { const g = h('optgroup', { label: c }); cat.filter(s => s.categoria === c).forEach(s => g.append(h('option', { value: s.id }, s.nombre + ' · ' + money(+s.precio, s.moneda)))); sel.append(g); });
          sel.addEventListener('change', () => { const s = cat.find(z => z.id === sel.value); if (!s) return; it.desc = s.descripcion || s.nombre; it.precio = String(+s.precio); if (!it.cant && !rec) it.cant = '1'; if (!(d.servicio || '').trim() && !rec) d.servicio = s.categoria.toUpperCase() + ' | ' + s.nombre.toUpperCase(); formRebuild(); });
          row.append(sel);
        }
        if (rec && !lock) {
          const lb = h('label', { class: 'full', style: 'display:flex;gap:8px;align-items:center;font-size:.92rem' });
          const cb = h('input', { type: 'checkbox' }); cb.checked = !!it.antes; cb.addEventListener('change', () => { it.antes = cb.checked; refrescar(); });
          lb.append(cb, 'Ya se había depositado antes (va en “Depositado previamente”, no en el subtotal)'); row.append(lb);
        }
        lista.append(row);
      });
    };
    gl.append(h('div', { class: 'fd-acts', style: 'justify-content:flex-start;margin-top:10px' }, btn('plus', 'Agregar línea', () => { d.items.push({ desc: '', cant: rec ? '' : '1', precio: '', antes: false }); pintaItems(); refrescar(); })));
    pintaItems();

    /* totales */
    const pintaSum = () => {
      const c = calc(d); sumBox.replaceChildren();
      const r = (a, b, cl) => sumBox.append(h('div', { class: cl || '' }, h('span', {}, a), h('span', {}, b)));
      r('Subtotal', money(c.sub, d.moneda));
      if (rec) { if (c.dep > 0) r(d.depLabel || 'Depositado previamente', money(c.dep, d.moneda)); }
      else { if (c.desc > 0) r('Descuento', money(-c.desc, d.moneda)); if (c.ant > 0) r('Anticipo', money(c.ant, d.moneda)); }
      r(rec ? 'Total pagado' : 'Saldo total', money(c.total, d.moneda), 'big');
    };
    gl.append(sumBox);
    if (!rec) {
      const tp = h('select'); [['%', 'Descuento en %'], ['Q', 'Descuento en monto']].forEach(([v, t]) => { const o = h('option', { value: v }, t); if (d.descTipo === v) o.selected = true; tp.append(o); });
      tp.disabled = lock; tp.addEventListener('change', () => { d.descTipo = tp.value; refrescar(); });
      gl.append(h('div', { class: 'fd-g3' }, h('div', { class: 'field' }, h('label', {}, 'Tipo de descuento'), tp), fld('Descuento', 'desc', { im: 'decimal', ph: '0' }), fld('Anticipo (%)', 'anticipoPct', { im: 'decimal', ph: 'Sin anticipo' })));
      /* cupón: si el cliente escribió un código en la cotización (o te lo dice después), aquí se verifica y se aplica su % */
      const cpIn = h('input', { type: 'text', placeholder: 'Ej. FARO-7K2M9Q', autocapitalize: 'characters', spellcheck: 'false' }); cpIn.value = d.cupon || ''; cpIn.disabled = lock;
      const cpMsg = h('small', { class: 'muted', style: 'display:block;margin-top:6px' }, d.cupon ? 'Cupón aplicado: ' + d.cupon + '. Cuando se confirme la sesión, márcalo como canjeado en Clientes → Cupones.' : 'Opcional. Se verifica en Cupones: que exista, que no haya vencido y que no se haya usado.');
      const cpOk = (m) => { cpMsg.style.color = ''; cpMsg.textContent = m; }, cpNo = (m) => { cpMsg.style.color = 'var(--red-t)'; cpMsg.textContent = m; };
      const cpGo = btn('check', 'Verificar y aplicar', async () => {
        const k = (cpIn.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!k) { d.cupon = ''; cpOk('Sin cupón. El descuento queda como lo pongas a mano.'); refrescar(); return; }
        try {
          const r = await ctx.api('/rest/v1/cupones?select=codigo,nombre,porcentaje,usos,usos_max,vence,estado&clave=eq.' + k);
          if (!r.ok) { cpNo(await ctx.errText(r) + ' (¿ya corriste sql/cupones.sql?)'); return; }
          const c = (await r.json())[0];
          if (!c) { cpNo('Ese código no existe en tus registros. No lo apliques.'); return; }
          if (c.estado !== 'activo') { cpNo('Ese código está invalidado.'); return; }
          if (c.usos >= c.usos_max) { cpNo('Ese código ya se usó' + (c.usos_max > 1 ? ' todas sus veces.' : '.')); return; }
          if (c.vence < hoy()) { cpNo('Ese código venció el ' + c.vence + '.'); return; }
          const p = String(parseFloat(c.porcentaje));
          d.cupon = c.codigo; d.descTipo = '%'; d.desc = p; tp.value = '%'; if (ins.desc) ins.desc.value = p;
          cpOk('✓ ' + c.codigo + (c.nombre ? ' · ' + c.nombre : '') + ' · ' + p + '% hasta el ' + c.vence + '. Cuando se confirme la sesión, márcalo como canjeado en Clientes → Cupones.');
          refrescar();
        } catch (e) { if (!e || e.message !== 'sesion') cpNo('No se pudo verificar. Revisa tu conexión.'); }
      });
      cpGo.disabled = lock;
      gl.append(h('div', { class: 'field' }, h('label', {}, 'Cupón de descuento'), h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, cpIn, cpGo), cpMsg));
      if (q) gl.append(h('div', { class: 'fd-g2' }, fld('Dato informativo (opcional)', 'notaLabel', { ph: 'Ej. Pago por clase' }), fld('Monto del dato', 'notaMonto', { im: 'decimal' })));
    } else gl.append(fld('Texto de la línea “depositado”', 'depLabel', { ph: 'Ej. Depositado por activación de snacks.' }));
    card.append(gl);

    /* textos */
    const gt = sec('Textos', 'file');
    gt.append(fld('Condiciones y observaciones (una por línea)', 'condiciones', { area: true, rows: 5 }));
    if (!rec) gt.append(fld('Forma de pago', 'formaPago', { area: true, rows: 3 }));
    card.append(gt);

    const bar = h('div', { class: 'fd-bar' });
    if (!lock) bar.append(btn('check', d.id ? 'Guardar cambios' : 'Guardar', () => guardar(false), 'btn-gold'), btn('print', 'Guardar e imprimir / PDF', () => guardar(true)));
    else bar.append(btn('print', 'Imprimir / PDF', () => imprimir(d), 'btn-gold'));
    if (d.id && !lock) bar.append(btn('print', 'Solo imprimir', () => imprimir(d)));
    card.append(bar);

    /* vista previa */
    const box = h('div', { class: 'fd-pvbox' }), fr = h('iframe', { title: 'Vista previa del documento', scrolling: 'no' });
    box.append(fr); pv.append(h('div', { class: 'muted', style: 'margin:0 0 8px;font-size:.9rem' }, 'Así se verá al imprimir (A4). Se actualiza mientras escribes.'), box);
    let listo = false;
    const ajusta = () => { const s = box.clientWidth / 794; let ah = 1123; try { ah = Math.max(1123, fr.contentDocument.documentElement.scrollHeight); } catch (e) { /* aún no */ } fr.style.height = ah + 'px'; fr.style.transform = 'scale(' + s + ')'; box.style.height = ah * s + 'px'; };
    fr.addEventListener('load', () => { listo = true; ajusta(); });
    fr.srcdoc = docHTML(d);
    let t = 0;
    function refrescar() {
      pintaSum();
      clearTimeout(t); t = setTimeout(() => { if (!listo) return; try { fr.contentDocument.body.innerHTML = docBody(d); ajusta(); } catch (e) { /* sigue */ } }, 120);
    }
    function formRebuild() { const y = window.scrollY; S.d = d; pintar(); window.scrollTo({ top: y }); }
    pintaSum();
    if (S.pv) S.pv.disconnect();
    try { S.pv = new ResizeObserver(() => { if (listo) ajusta(); }); S.pv.observe(box); } catch (e) { /* sin observer */ }
    ed.append(card, pv); w.append(ed);
    return w;
  }

  /* ---------- catálogo de precios ---------- */
  function vPrecios() {
    const w = h('div');
    w.append(h('div', { class: 'fd-top' }, h('div', { class: 'fd-acts' }, btn('back', 'Volver', () => { S.vista = 'lista'; pintar(); }), h('h2', { style: 'margin:0 0 0 8px;font-size:1.7rem' }, 'Catálogo de precios')),
      btn('plus', 'Nuevo precio', () => { S.svs.push({ _nuevo: true, categoria: S.svs.length ? S.svs[S.svs.length - 1].categoria : '', nombre: '', descripcion: '', precio: '', moneda: 'GTQ', activo: true, orden: 0 }); pintar(); }, 'btn-gold')));
    w.append(h('div', { class: 'fd-lock' }, (() => { const s = h('span'); s.innerHTML = ico('lock'); return s; })(),
      h('span', {}, 'Solo tú ves esta lista: está protegida con tu sesión (y tu código del teléfono, si lo activaste) y no se puede leer desde la página pública. Al crear un documento eliges de aquí el servicio y el precio se llena solo.')));
    const card = h('div', { class: 'card' });
    const cats = [...new Set(S.svs.map(s => s.categoria))];
    const dl = h('datalist', { id: 'fd-cats' }, cats.filter(Boolean).map(c => h('option', { value: c }))); card.append(dl);
    if (!S.svs.length) card.append(h('p', { class: 'muted' }, 'Aún no hay precios. Agrega el primero.'));
    S.svs.forEach(s => {
      const f = (k, o) => { const i = h('input', Object.assign({ type: 'text', 'aria-label': k }, o || {})); i.value = s[k] == null ? '' : s[k]; i.addEventListener('input', () => { s[k] = i.value; }); return i; };
      const mn = h('select', { 'aria-label': 'Moneda' }, ['GTQ', 'USD'].map(v => { const o = h('option', { value: v }, v === 'GTQ' ? 'Q' : 'US$'); if (s.moneda === v) o.selected = true; return o; }));
      mn.addEventListener('change', () => { s.moneda = mn.value; });
      const ac = h('input', { type: 'checkbox', 'aria-label': 'Activo' }); ac.checked = s.activo !== false; ac.addEventListener('change', () => { s.activo = ac.checked; });
      card.append(h('div', { class: 'fd-pr' },
        h('div', {}, f('categoria', { list: 'fd-cats', placeholder: 'Categoría' }), h('div', { style: 'height:6px' }), f('nombre', { placeholder: 'Nombre del servicio' })),
        h('textarea', { rows: 3, placeholder: 'Descripción que sale en el documento', 'aria-label': 'Descripción', oninput: e => { s.descripcion = e.target.value; } }, s.descripcion || ''),
        h('div', {}, f('precio', { inputmode: 'decimal', placeholder: 'Precio' }), h('div', { style: 'height:6px' }), mn),
        h('label', { style: 'display:flex;gap:6px;align-items:center;font-size:.9rem' }, ac, 'Activo'),
        h('div', { class: 'fd-acts' }, btn('check', 'Guardar', () => guardaPrecio(s), 'btn-gold'), btn('x', s._nuevo ? 'Quitar' : 'Borrar', () => borraPrecio(s), 'btn-red'))));
    });
    w.append(card);
    return w;
  }
  async function guardaPrecio(s) {
    const p = num(s.precio);
    if (!(s.categoria || '').trim() || !(s.nombre || '').trim() || !isFinite(p) || p < 0) { ctx.toast('Falta categoría, nombre o un precio válido'); return; }
    const body = { categoria: s.categoria.trim(), nombre: s.nombre.trim(), descripcion: (s.descripcion || '').trim(), precio: p, moneda: s.moneda, activo: s.activo !== false, orden: +s.orden || 0 };
    try {
      const r = s.id ? await ctx.api('/rest/v1/doc_servicios?id=eq.' + s.id, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body })
        : await ctx.api('/rest/v1/doc_servicios', { method: 'POST', headers: { Prefer: 'return=representation' }, body });
      if (!r.ok) { ctx.toast(await ctx.errText(r)); return; }
      Object.assign(s, (await r.json())[0]); delete s._nuevo; ctx.toast('Precio guardado'); pintar();
    } catch (e) { /* sesión */ }
  }
  async function borraPrecio(s) {
    if (!s.id) { S.svs.splice(S.svs.indexOf(s), 1); pintar(); return; }
    if (!confirm('¿Borrar “' + s.nombre + '” del catálogo? Los documentos ya hechos no cambian.')) return;
    try { const r = await ctx.api('/rest/v1/doc_servicios?id=eq.' + s.id, { method: 'DELETE' }); if (!r.ok) { ctx.toast(await ctx.errText(r)); return; } S.svs.splice(S.svs.indexOf(s), 1); ctx.toast('Precio borrado'); pintar(); } catch (e) { /* sesión */ }
  }

  function pintar() {
    if (!root) return;
    root.replaceChildren();
    if (S.cargando && !S.docs.length) { root.append(h('p', { class: 'muted' }, 'Cargando…')); return; }
    if (S.err) {
      root.append(h('div', { class: 'card' }, h('h2', {}, 'Formularios'), h('p', {}, S.err === 'tablas'
        ? 'Falta activar la base de datos de documentos. Abre Supabase › SQL Editor › New query, pega el contenido de sql/documentos.sql y pulsa Run. Después vuelve aquí.'
        : 'No hay conexión con el servidor.'), btn('search', 'Reintentar', cargar, 'btn-gold')));
      return;
    }
    root.append(S.vista === 'editor' && S.d ? vEditor() : S.vista === 'precios' ? vPrecios() : vLista());
  }

  window.FaroDocumentos = {
    iniciar(el, c) {
      root = el; ctx = c; css();
      if (!started) { started = true; cargar(); } else if (S.vista === 'lista') cargar(); else pintar();
    }
  };
})();
