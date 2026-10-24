/* Faro Workspace · Cupones
 * Un solo lugar para todos los códigos de descuento: los que salen de las reseñas, los de las galerías de Entregas y los que creas
 * tú (por ejemplo una campaña en redes con 5 descuentos). Aquí verificas un código, ves a quién se le dio y de qué día es,
 * lo marcas como canjeado o lo invalidas. Cada código se gasta solo las veces que tú definas.
 * Base de datos: sql/cupones.sql. Uso desde admin.html:
 *   FaroCupones.iniciar(contenedor, ctx)      ctx = { api, toast, errText }
 *   FaroCupones.abrirCodigo(codigo)           (desde otra pestaña) → busca el código y lo muestra
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
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    wa: '<path d="M21 12a9 9 0 0 1-13.4 7.8L3 21l1.3-4.4A9 9 0 1 1 21 12Z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4Z"/><path d="M14 6v12" stroke-dasharray="2 3"/>'
  };
  const ico = k => { const s = el('span', { class: 'cp-i' }); s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[k] || '') + '</svg>'; return s; };
  const btn = (txt, k, fn, cls) => el('button', { type: 'button', class: 'btn btn-sm ' + (cls || 'btn-ghost'), onclick: fn }, k ? ico(k) : null, txt ? ' ' + txt : null);

  const ORIGEN = { resena: 'Comentario en la web', galeria: 'Galería de Entregas', manual: 'Creado por ti' };
  const S = { lista: [], usos: [], cots: [], filtro: 'disponible', tipo: 'todos', q: '', sel: null, falta: false, error: '', cargando: false, nuevo: false, ver: '', vigMeses: '5', ajustes: false };
  let host = null, ctx = null, css1 = false;

  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });
  const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const fd = v => { if (!v) return '—'; try { const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T12:00:00') : new Date(v); return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Guatemala' }); } catch (e) { return ''; } };
  const fdh = v => { try { return new Date(v).toLocaleString('es-GT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Guatemala' }); } catch (e) { return ''; } };
  const pct = n => { const v = parseFloat(n); return (Math.round(v * 100) / 100).toString().replace(/\.0+$/, '') + '%'; };
  const sumar = (iso, meses) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + meses, 1)); const ult = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(d, ult)); return t.toISOString().slice(0, 10); };

  /* estado visible de un cupón */
  function estadoDe(c) {
    if (c.estado === 'invalidado') return { k: 'invalidado', t: 'Invalidado', tag: 'cancelada' };
    if (c.usos >= c.usos_max) return c.usos_max > 1 ? { k: 'canjeado', t: 'Agotado', tag: 'completada' } : { k: 'canjeado', t: 'Canjeado', tag: 'completada' };
    if (c.vence < hoy()) return { k: 'vencido', t: 'Vencido', tag: 'pendiente' };
    return { k: 'disponible', t: c.amigo ? 'Disponible · ' + (c.usos_max - c.usos) + ' de 2' : c.usos_max > 1 ? 'Disponible · ' + (c.usos_max - c.usos) + ' de ' + c.usos_max : 'Disponible', tag: 'confirmada' };
  }
  const diasPara = v => Math.round((new Date(v + 'T12:00:00') - new Date(hoy() + 'T12:00:00')) / 864e5);

  const get = async t => { const r = await ctx.api('/rest/v1/' + t); if (!r.ok) { const e = new Error(await ctx.errText(r)); e.status = r.status; throw e; } return r.json(); };
  async function cargar(quiet) {
    if (!quiet) { S.cargando = true; pintar(); }
    try {
      const [a, b, c, d] = await Promise.all([
        get('cupones?select=*&order=creado.desc&limit=1000'),
        get('cupon_usos?select=*&order=usado_en.desc&limit=2000'),
        get('cotizaciones?select=ref,nombre,creado,cupon,cupon_pct&cupon=not.is.null&order=creado.desc&limit=500').catch(() => []),
        get('rs_config?select=clave,valor&clave=eq.vigencia_meses').catch(() => [])
      ]);
      S.lista = a; S.usos = b; S.cots = c; S.vigMeses = (d[0] && d[0].valor) || '5'; S.falta = false;
      if (S.ver && !S.sel) { const k = norm(S.ver); const hit = k && S.lista.find(x => norm(x.codigo) === k); if (hit) S.sel = hit.id; }
    } catch (e) { S.falta = true; S.error = e.message || ''; }
    S.cargando = false; pintar();
  }
  const rpc = async (fn, body) => { const r = await ctx.api('/rest/v1/rpc/' + fn, { method: 'POST', body }); if (!r.ok) throw new Error(await ctx.errText(r)); return r.json(); };
  const patch = async (id, body) => { const r = await ctx.api('/rest/v1/cupones?id=eq.' + id, { method: 'PATCH', body, headers: { Prefer: 'return=representation' } }); if (!r.ok) throw new Error(await ctx.errText(r)); const j = await r.json(); return j[0]; };
  const copiar = async (t, ok) => { try { await navigator.clipboard.writeText(t); ctx.toast(ok || 'Copiado'); } catch (e) { const ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); ctx.toast(ok || 'Copiado'); } catch (x) { ctx.toast('No se pudo copiar'); } ta.remove(); } };
  const selC = () => S.lista.find(c => c.id === S.sel) || null;
  const MSG = {
    campana: c => '🎁 Descuento Faro Studios: ' + pct(c.porcentaje) + ' en tu cotización con el código ' + c.codigo + '. Escríbelo en farostudios.net → Cotizar. Válido hasta el ' + fd(c.vence) + (c.usos_max > 1 ? ' o hasta agotar existencias (' + c.usos_max + ' lugares).' : '.'),
    recordar: c => 'Hola' + (c.nombre ? ' ' + c.nombre.split(/[·\-–]/)[0].trim().split(/\s+/)[0] : '') + ', te recordamos que tu código ' + c.codigo + ' de Faro Studios (' + pct(c.porcentaje) + ' de descuento) vale hasta el ' + fd(c.vence) + '. Menciónalo al reservar 📸'
  };

  /* ¿ya lo conoce alguien? entonces cambiar el % necesita advertencia */
  function yaEntregado(c) {
    const m = [];
    if (c.origen === 'resena') m.push('lo recibió ' + (c.nombre || 'un cliente') + ' al dejar su reseña');
    if (c.origen === 'galeria') m.push('está visible para ' + (c.nombre || 'el cliente') + ' en su galería de Entregas');
    if (c.publicado && c.origen === 'manual') m.push('lo marcaste como ya publicado o compartido');
    if (c.usos > 0) m.push('ya se usó ' + c.usos + (c.usos === 1 ? ' vez' : ' veces'));
    return m;
  }

  /* ---------- vistas ---------- */
  function pintar() {
    if (!host) return; const keep = host.scrollTop;
    host.textContent = '';
    host.append(vCabecera());
    if (S.cargando && !S.lista.length) { host.append(el('p', { class: 'muted' }, 'Cargando…')); return; }
    if (S.falta) { host.append(el('div', { class: 'card cp-aviso' }, el('h3', {}, 'Falta activar los cupones'), el('p', {}, 'En Supabase abre SQL Editor, pega el contenido de sql/cupones.sql y dale Run. Después vuelve a esta pestaña.'), el('p', { class: 'muted' }, S.error), btn('Reintentar', null, () => cargar(), 'btn-gold'))); return; }
    host.append(vVerificar());
    if (S.nuevo) host.append(vNuevo());
    const c = selC(); if (c) host.append(vFicha(c));
    host.append(vLista(), vAjustes());
    host.scrollTop = keep;
  }
  function vCabecera() {
    const n = { disponible: 0, canjeado: 0, vencido: 0, invalidado: 0 }; S.lista.forEach(c => { n[estadoDe(c).k]++; });
    const porVencer = S.lista.filter(c => estadoDe(c).k === 'disponible' && diasPara(c.vence) <= 15).length;
    return el('div', { class: 'card cp-cab' }, el('div', {}, el('h2', {}, ico('ticket'), ' Cupones'), el('p', { class: 'muted' }, 'Todos los códigos de descuento en un solo lugar: de reseñas, de Entregas y los que creas tú. Cuando un cliente te diga su código, verifícalo aquí antes de aplicar el descuento.')),
      el('div', { class: 'cp-kp' }, el('b', {}, String(n.disponible)), el('small', {}, 'disponibles'), el('b', {}, String(n.canjeado)), el('small', {}, 'canjeados'), el('b', {}, String(n.vencido)), el('small', {}, 'vencidos'), porVencer ? el('b', { class: 'cp-w' }, String(porVencer)) : null, porVencer ? el('small', {}, 'vencen en 15 días') : null));
  }
  function vVerificar() {
    const c = el('div', { class: 'card cp-ver' });
    const inp = el('input', { type: 'text', placeholder: 'Escribe el código que te dio el cliente', 'aria-label': 'Código a verificar', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', value: S.ver });
    const res = el('div', { class: 'cp-res', 'aria-live': 'polite' });
    const buscar = () => {
      S.ver = inp.value; res.textContent = ''; const k = norm(inp.value); if (!k) return;
      const hit = S.lista.find(x => norm(x.codigo) === k);
      if (hit) { S.sel = hit.id; res.append(el('p', { class: 'cp-ok' }, 'Encontrado: ' + hit.codigo + ' · ' + estadoDe(hit).t)); pintarFicha(); }
      else res.append(el('p', { class: 'cp-no' }, 'Ese código no existe en tus registros. No lo apliques.'));
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
    inp.addEventListener('input', () => { S.ver = inp.value; if (norm(inp.value).length >= 6) buscar(); else res.textContent = ''; });
    c.append(el('h3', {}, ico('search'), ' Verificar un código'), el('div', { class: 'cp-bar' }, inp, btn('Verificar', 'search', buscar, 'btn-gold'), btn('Crear nuevo código', 'plus', () => { S.nuevo = !S.nuevo; pintar(); })), res);
    return c;
  }
  function pintarFicha() { pintar(); setTimeout(() => { const f = $('.cp-ficha', host); f && f.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 40); }

  /* ficha de un cupón */
  function vFicha(c) {
    const e = estadoDe(c), usos = S.usos.filter(u => u.cupon_id === c.id), cots = S.cots.filter(x => norm(x.cupon) === norm(c.codigo));
    const box = el('div', { class: 'card cp-ficha' });
    const ref = el('input', { type: 'text', maxlength: '60', placeholder: 'Referencia (opcional): cotización o nota', 'aria-label': 'Referencia del canje', value: cots[0] && !usos.some(u => u.cotizacion === cots[0].ref) ? cots[0].ref : '' });
    box.append(
      el('div', { class: 'cp-fh' }, el('div', {}, el('small', { class: 'muted' }, c.tipo === 'campana' ? 'CAMPAÑA' : 'CÓDIGO PERSONAL'), el('b', { class: 'cp-cod' }, c.codigo)),
        el('div', { class: 'cp-fr' }, el('span', { class: 'tag ' + e.tag }, e.t), el('b', { class: 'cp-pct' }, pct(c.porcentaje)), el('button', { class: 'cp-x', type: 'button', 'aria-label': 'Cerrar', onclick: () => { S.sel = null; pintar(); } }, ico('x')))),
      el('dl', { class: 'cp-dl' },
        el('div', {}, el('dt', {}, c.tipo === 'campana' ? 'Campaña' : 'Se le dio a'), el('dd', {}, c.nombre || '—')),
        el('div', {}, el('dt', {}, 'Origen'), el('dd', {}, ORIGEN[c.origen] || c.origen)),
        el('div', {}, el('dt', {}, 'Emitido'), el('dd', {}, fd(c.creado))),
        el('div', {}, el('dt', {}, 'Vale hasta'), el('dd', {}, fd(c.vence) + (e.k === 'disponible' && diasPara(c.vence) <= 15 ? ' (quedan ' + diasPara(c.vence) + ' días)' : ''))),
        el('div', {}, el('dt', {}, 'Usos'), el('dd', {}, c.amigo ? 'Cliente: ' + (usos.some(u => u.quien === 'cliente') ? 'canjeado ✓' : 'sin usar') + ' · Amigo: ' + (usos.some(u => u.quien === 'amigo') ? 'canjeado ✓' : 'sin usar') : c.usos + ' de ' + c.usos_max)),
        c.nota ? el('div', {}, el('dt', {}, 'Nota'), el('dd', {}, c.nota)) : null));
    if (e.k === 'disponible') {
      const canjear = async quien => {
        const lbl = quien === 'cliente' ? 'el cliente' : quien === 'amigo' ? 'un amigo' : null;
        if (!confirm('¿Aplicar el descuento de ' + pct(c.porcentaje) + (lbl ? ' para ' + lbl : '') + (c.nombre ? ' (' + c.nombre + ')' : '') + '? Después de canjearlo' + (c.usos_max > 1 ? ' ese uso ya no se podrá volver a usar.' : ' ya no se podrá usar otra vez.'))) return;
        try { const r = await rpc('cp_canjear', { p_id: c.id, p_nota: '', p_cotizacion: ref.value.trim() || null, p_quien: quien || null }); if (!r.ok) { ctx.toast('No se pudo canjear: ' + r.error); await cargar(true); return; } ctx.toast('Canjeado ✓'); await cargar(true); } catch (x) { ctx.toast(x.message); }
      };
      if (c.amigo) {
        const fila = (q, t) => { const u = usos.find(x => x.quien === q); return el('div', { class: 'cp-slot' + (u ? ' on' : '') }, el('b', {}, t), el('small', { class: 'muted' }, u ? 'Canjeado ' + fdh(u.usado_en) : 'Sin usar'), u ? null : btn('Canjear', 'check', () => canjear(q), 'btn-gold')); };
        box.append(el('div', { class: 'cp-canje cp-canje2' }, ref, el('div', { class: 'cp-slots' }, fila('cliente', 'Uso del cliente'), fila('amigo', 'Uso del amigo'))));
      } else
      box.append(el('div', { class: 'cp-canje' }, ref, btn(c.usos_max > 1 ? 'Canjear 1 uso' : 'Marcar como canjeado', 'check', () => canjear(null), 'btn-gold')));
    } else if (e.k === 'canjeado') box.append(el('p', { class: 'cp-nota' }, c.usos_max > 1 ? 'Este código ya no tiene usos disponibles.' : 'Este código ya fue usado. No lo apliques otra vez.'));
    else if (e.k === 'vencido') box.append(el('p', { class: 'cp-nota' }, 'Venció el ' + fd(c.vence) + '. Si decides respetarlo, puedes ampliar la fecha abajo.'));
    else box.append(el('p', { class: 'cp-nota cp-nota-r' }, 'Este código está invalidado. No lo apliques. Puedes reactivarlo si fue un error.'));
    if (usos.length || cots.length) {
      box.append(el('div', { class: 'cp-hist' }, el('h4', {}, 'Historial'),
        usos.map(u => el('p', {}, '✓ Canjeado' + (u.quien ? ' (' + (u.quien === 'amigo' ? 'amigo' : 'cliente') + ')' : '') + ' ' + fdh(u.usado_en) + (u.cotizacion ? ' · ' + u.cotizacion : '') + (u.nota ? ' · ' + u.nota : ''))),
        cots.map(x => el('p', { class: 'muted' }, '☆ Escrito en la cotización ' + x.ref + ' de ' + x.nombre + ' (' + fdh(x.creado) + ') con ' + pct(x.cupon_pct) + ' de descuento'))));
    }
    /* editar */
    const det = el('details', { class: 'cp-ed' }, el('summary', {}, 'Editar este código'));
    const iP = el('input', { type: 'number', min: '1', max: '90', step: '0.5', value: String(parseFloat(c.porcentaje)), 'aria-label': 'Porcentaje' });
    const iV = el('input', { type: 'date', value: c.vence, 'aria-label': 'Vale hasta' });
    const iU = el('input', { type: 'number', min: String(Math.max(1, c.usos)), max: '10000', step: '1', value: String(c.usos_max), 'aria-label': 'Usos', disabled: c.tipo === 'personal' ? '' : null });
    const iN = el('input', { type: 'text', maxlength: '120', value: c.nombre, 'aria-label': 'Nombre' });
    const iO = el('input', { type: 'text', maxlength: '300', value: c.nota, 'aria-label': 'Nota' });
    const iPub = el('input', { type: 'checkbox' }); iPub.checked = !!c.publicado;
    det.append(el('div', { class: 'cp-g' }, f('Descuento (%)', iP), f('Vale hasta', iV), f(c.tipo === 'campana' ? 'Usos totales' : 'Usos', iU)), f(c.tipo === 'campana' ? 'Nombre de la campaña' : 'A quién se le dio', iN), f('Nota para ti', iO),
      el('label', { class: 'cp-chk' }, iPub, ' Ya lo publiqué o se lo compartí a alguien'),
      el('div', { class: 'cp-acts' }, btn('Guardar cambios', 'check', async () => {
        const nuevoP = parseFloat(iP.value);
        if (!(nuevoP >= 1 && nuevoP <= 90)) { ctx.toast('El descuento debe estar entre 1 y 90'); return; }
        if (!iV.value) { ctx.toast('Elige hasta qué día vale'); return; }
        const body = { porcentaje: nuevoP, vence: iV.value, nombre: iN.value.trim().slice(0, 120), nota: iO.value.trim().slice(0, 300), publicado: iPub.checked };
        if (c.tipo === 'campana') { const u = parseInt(iU.value, 10); if (!(u >= Math.max(1, c.usos))) { ctx.toast('Los usos no pueden ser menos de los ya canjeados (' + c.usos + ')'); return; } body.usos_max = u; }
        if (Math.abs(nuevoP - parseFloat(c.porcentaje)) > 0.001) {
          const why = yaEntregado(c);
          if (why.length && !confirm('⚠ Ojo: este código ya está en manos de alguien (' + why.join('; ') + ').\n\nSi cambias el descuento de ' + pct(c.porcentaje) + ' a ' + pct(nuevoP) + ', esa persona verá o esperará otro descuento del que ya le dijiste.\n\n¿Cambiarlo de todos modos?')) return;
        }
        try { await patch(c.id, body); ctx.toast('Cambios guardados'); await cargar(true); } catch (x) { ctx.toast(x.message); }
      }, 'btn-gold')));
    box.append(det);
    /* acciones */
    const acts = el('div', { class: 'cp-acts' }, btn('Copiar código', 'copy', () => copiar(c.codigo, 'Código copiado')));
    if (e.k === 'disponible') {
      acts.append(btn('Copiar mensaje para compartir', 'copy', () => copiar(c.tipo === 'campana' ? MSG.campana(c) : MSG.recordar(c), 'Mensaje copiado')),
        el('a', { class: 'btn btn-sm btn-ghost', target: '_blank', rel: 'noopener', href: 'https://wa.me/?text=' + encodeURIComponent(c.tipo === 'campana' ? MSG.campana(c) : MSG.recordar(c)) }, ico('wa'), ' WhatsApp'));
    }
    if (c.amigo) usos.filter(u => u.quien).forEach(u => acts.append(btn('Deshacer canje del ' + (u.quien === 'amigo' ? 'amigo' : 'cliente'), 'undo', async () => {
      if (!confirm('¿Deshacer el canje del ' + (u.quien === 'amigo' ? 'amigo' : 'cliente') + ' de ' + c.codigo + '? Ese uso volverá a quedar disponible.')) return;
      try { const r = await rpc('cp_deshacer', { p_id: c.id, p_quien: u.quien }); if (!r.ok) { ctx.toast('No se pudo: ' + r.error); return; } ctx.toast('Canje deshecho'); await cargar(true); } catch (x) { ctx.toast(x.message); }
    })));
    else if (usos.length) acts.append(btn('Deshacer el último canje', 'undo', async () => {
      if (!confirm('¿Deshacer el último canje de ' + c.codigo + '? El código volverá a quedar disponible.')) return;
      try { const r = await rpc('cp_deshacer', { p_id: c.id }); if (!r.ok) { ctx.toast('No se pudo: ' + r.error); return; } ctx.toast('Canje deshecho'); await cargar(true); } catch (x) { ctx.toast(x.message); }
    }));
    if (c.estado === 'activo') acts.append(btn('Invalidar', 'x', async () => {
      if (!confirm('¿Invalidar ' + c.codigo + '? Dejará de funcionar de inmediato' + (c.usos_max > 1 ? ' para todos los que no lo hayan usado.' : '.'))) return;
      try { await patch(c.id, { estado: 'invalidado', invalidado_en: new Date().toISOString() }); ctx.toast('Código invalidado'); await cargar(true); } catch (x) { ctx.toast(x.message); }
    }, 'btn-red'));
    else acts.append(btn('Reactivar', 'undo', async () => { try { await patch(c.id, { estado: 'activo', invalidado_en: null }); ctx.toast('Código reactivado'); await cargar(true); } catch (x) { ctx.toast(x.message); } }));
    if (c.origen === 'manual' && c.usos === 0 && !c.publicado) acts.append(btn('Borrar', 'trash', async () => {
      if (!confirm('¿Borrar ' + c.codigo + '? Solo se puede porque nunca se usó ni se publicó.')) return;
      const r = await ctx.api('/rest/v1/cupones?id=eq.' + c.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); if (!r.ok) { ctx.toast(await ctx.errText(r)); return; } S.sel = null; ctx.toast('Código borrado'); await cargar(true);
    }, 'btn-red'));
    box.append(acts);
    return box;
  }
  const f = (lab, input) => el('div', { class: 'field' }, el('label', {}, lab), input);

  /* crear */
  function vNuevo() {
    const c = el('div', { class: 'card cp-nuevo' });
    let tipo = 'campana';
    const nom = el('input', { type: 'text', maxlength: '120', placeholder: 'Ej. Descuento de noviembre en Instagram' });
    const cod = el('input', { type: 'text', maxlength: '30', placeholder: 'Déjalo vacío para que se genere solo', autocapitalize: 'characters', spellcheck: 'false' });
    const p = el('input', { type: 'number', min: '1', max: '90', step: '0.5', value: '10' });
    const us = el('input', { type: 'number', min: '1', max: '10000', step: '1', value: '5' });
    const ve = el('input', { type: 'date', value: sumar(hoy(), parseInt(S.vigMeses, 10) || 5), min: hoy() });
    const no = el('input', { type: 'text', maxlength: '300', placeholder: 'Opcional, solo para ti' });
    const pu = el('input', { type: 'checkbox' });
    const am = el('input', { type: 'checkbox' }); const gAm = el('label', { class: 'cp-chk' }, am, ' Incluye un uso para un amigo (2 usos: cliente y amigo)');
    const gUs = f('Cuántas personas pueden usarlo', us);
    const lbN = el('label', {}, 'Nombre de la campaña'); const gN = el('div', { class: 'field' }, lbN, nom);
    const seg = el('div', { class: 'cp-seg', role: 'group', 'aria-label': 'Tipo de código' });
    const bC = el('button', { type: 'button', 'aria-pressed': 'true' }, 'Campaña (varias personas)'), bP = el('button', { type: 'button', 'aria-pressed': 'false' }, 'Para una persona');
    const set = t => { tipo = t; bC.setAttribute('aria-pressed', String(t === 'campana')); bP.setAttribute('aria-pressed', String(t === 'personal')); gUs.hidden = t === 'personal'; gAm.hidden = t !== 'personal'; lbN.textContent = t === 'campana' ? 'Nombre de la campaña' : 'A quién se lo das'; nom.placeholder = t === 'campana' ? 'Ej. Descuento de noviembre en Instagram' : 'Ej. Mirna · graduación'; };
    bC.addEventListener('click', () => set('campana')); bP.addEventListener('click', () => set('personal')); seg.append(bC, bP); set('campana');
    c.append(el('h3', {}, ico('gift'), ' Crear un código'), el('p', { class: 'muted' }, 'Para una campaña (por ejemplo 5 descuentos en redes) o para regalarle un código a una sola persona. Cada código se gasta solo las veces que indiques.'), seg, gN,
      el('div', { class: 'cp-g' }, f('Descuento (%)', p), gUs, f('Vale hasta', ve)), f('Código (opcional)', cod), f('Nota para ti', no),
      gAm, el('label', { class: 'cp-chk' }, pu, ' Ya lo voy a publicar o compartir ahora'),
      el('div', { class: 'cp-acts' }, btn('Crear código', 'plus', async () => {
        const n = parseFloat(p.value); if (!(n >= 1 && n <= 90)) { ctx.toast('El descuento debe estar entre 1 y 90'); return; }
        if (!ve.value || ve.value < hoy()) { ctx.toast('Elige una fecha de vencimiento que no haya pasado'); return; }
        const u = tipo === 'personal' ? 1 : parseInt(us.value, 10); if (!(u >= 1)) { ctx.toast('Indica cuántas personas pueden usarlo'); return; }
        try {
          const r = await rpc('cp_crear', { p_tipo: tipo, p_nombre: nom.value.trim(), p_codigo: cod.value.trim(), p_porcentaje: n, p_usos_max: u, p_vence: ve.value, p_nota: no.value.trim(), p_publicado: pu.checked, p_amigo: tipo === 'personal' && am.checked });
          if (!r.ok) { ctx.toast({ repetido: 'Ese código ya existe, elige otro', codigo: 'El código es muy corto (mínimo 3 letras o números)', vence: 'La fecha ya pasó', porcentaje: 'El descuento debe estar entre 1 y 90' }[r.error] || 'No se pudo crear (' + r.error + ')'); return; }
          S.nuevo = false; S.filtro = 'todos'; await cargar(true); S.sel = r.id; copiar(r.codigo, 'Código ' + r.codigo + ' creado y copiado'); pintarFicha();
        } catch (x) { ctx.toast(x.message); }
      }, 'btn-gold'), btn('Cancelar', null, () => { S.nuevo = false; pintar(); })));
    return c;
  }

  /* lista */
  function vLista() {
    const c = el('div', { class: 'card cp-lista' });
    const filtros = [['disponible', 'Disponibles'], ['canjeado', 'Canjeados'], ['vencido', 'Vencidos'], ['invalidado', 'Invalidados'], ['todos', 'Todos']];
    const tipos = [['todos', 'Todos los tipos'], ['resena', 'Reseñas'], ['galeria', 'Entregas'], ['manual', 'Creados por mí']];
    c.append(el('h3', {}, 'Todos los códigos'),
      el('div', { class: 'cp-fl' }, filtros.map(([k, t]) => el('button', { type: 'button', class: 'cp-f', 'aria-pressed': String(S.filtro === k), onclick: () => { S.filtro = k; pintar(); } }, t))),
      el('div', { class: 'cp-fl' }, tipos.map(([k, t]) => el('button', { type: 'button', class: 'cp-f cp-f2', 'aria-pressed': String(S.tipo === k), onclick: () => { S.tipo = k; pintar(); } }, t))));
    const q = norm(S.q), qt = S.q.trim().toLowerCase();
    const l = S.lista.filter(x => (S.filtro === 'todos' || estadoDe(x).k === S.filtro) && (S.tipo === 'todos' || x.origen === S.tipo) && (!qt || x.nombre.toLowerCase().includes(qt) || (q && norm(x.codigo).includes(q))));
    const rows = el('div', { class: 'cp-rows' });
    l.slice(0, 120).forEach(x => {
      const e = estadoDe(x);
      rows.append(el('button', { type: 'button', class: 'cp-row' + (x.id === S.sel ? ' sel' : ''), onclick: () => { S.sel = x.id; pintarFicha(); } },
        el('b', { class: 'cp-rc' }, x.codigo), el('span', { class: 'cp-rn' }, x.nombre || '—', el('small', { class: 'muted' }, ORIGEN[x.origen] + ' · emitido ' + fd(x.creado))),
        el('span', { class: 'cp-rp' }, pct(x.porcentaje)), el('span', { class: 'cp-rv' }, el('span', { class: 'tag ' + e.tag }, e.t), el('small', { class: 'muted' }, 'hasta ' + fd(x.vence)))));
    });
    if (!l.length) rows.append(el('p', { class: 'muted' }, S.lista.length ? 'No hay códigos con ese filtro.' : 'Todavía no hay códigos. Se crean solos cuando un cliente deja su reseña o cuando pones un código en una galería de Entregas; también puedes crear uno arriba.'));
    const bus = el('input', { type: 'search', placeholder: 'Buscar por nombre o por código…', 'aria-label': 'Buscar', value: S.q });
    bus.addEventListener('input', () => { S.q = bus.value; const pos = bus.selectionStart; pintar(); const n = $('.cp-lista input[type=search]', host); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } });
    c.insertBefore(bus, c.children[3]);
    c.append(rows);
    return c;
  }
  function vAjustes() {
    const d = el('details', { class: 'card cp-aj', open: S.ajustes ? '' : null }, el('summary', {}, 'Ajustes: cuánto duran los códigos de reseñas'));
    d.addEventListener('toggle', () => { S.ajustes = d.open; });
    const m = el('input', { type: 'number', min: '1', max: '36', step: '1', value: S.vigMeses, 'aria-label': 'Meses de vigencia' });
    d.append(el('p', { class: 'muted' }, 'Los códigos que reciben los clientes al dejar su reseña valen este número de meses desde el día que los reciben. Los códigos que ya se entregaron no cambian.'), f('Meses de vigencia', m),
      btn('Guardar', 'check', async () => {
        const v = Math.max(1, Math.min(36, parseInt(m.value, 10) || 5));
        const r = await ctx.api('/rest/v1/rs_config?on_conflict=clave', { method: 'POST', body: [{ clave: 'vigencia_meses', valor: String(v) }], headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
        if (!r.ok) { ctx.toast(await ctx.errText(r)); return; } S.vigMeses = String(v); ctx.toast('Vigencia guardada: ' + v + (v === 1 ? ' mes' : ' meses')); pintar();
      }, 'btn-gold'));
    return d;
  }

  function css() {
    if (css1) return; css1 = true;
    document.head.append(el('style', {}, `
.cp-i{display:inline-block;vertical-align:-.2em}.cp-i svg{width:1.15em;height:1.15em}
.cp-cab{display:flex;gap:18px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;margin-bottom:16px}.cp-cab h2{margin:0 0 6px}.cp-cab p{max-width:560px}
.cp-kp{display:grid;grid-template-columns:auto auto;gap:0 10px;align-items:baseline;background:var(--soft);padding:12px 18px;border-radius:14px;border:1px solid var(--line)}
.cp-kp b{font-size:1.4rem;color:var(--oro-t);text-align:right}.cp-kp small{color:var(--muted)}.cp-kp .cp-w{color:var(--red-t)}
.cp-aviso{border-color:rgba(217,90,106,.5)}
.cp-ver,.cp-nuevo,.cp-ficha,.cp-lista,.cp-aj{margin-bottom:16px}.cp-ver h3,.cp-nuevo h3,.cp-lista h3{margin:0 0 8px;display:flex;align-items:center;gap:8px}
.cp-bar{display:flex;gap:10px;flex-wrap:wrap}.cp-bar input{flex:1;min-width:240px;font-size:1.05rem;letter-spacing:.06em;text-transform:uppercase}
.cp-res{margin-top:8px}.cp-ok{margin:0;color:var(--verde-t,#5e9e6b);font-weight:700}.cp-no{margin:0;color:var(--red-t);font-weight:700}
.cp-ficha{border:2px solid var(--oro);box-shadow:0 18px 40px -22px rgba(0,0,0,.6)}
.cp-fh{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:flex-start}.cp-fh small{letter-spacing:.14em;font-size:.7rem}
.cp-cod{display:block;font-size:clamp(1.5rem,5vw,2.2rem);letter-spacing:.08em;color:var(--oro-t);word-break:break-all}
.cp-fr{display:flex;gap:12px;align-items:center}.cp-pct{font-size:1.8rem}.cp-x{border:0;background:none;color:var(--muted);cursor:pointer;padding:4px}
.cp-dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px 18px;margin:14px 0}.cp-dl dt{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.cp-dl dd{margin:2px 0 0;font-weight:600}
.cp-slots{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}.cp-slot{display:grid;gap:4px;align-content:start;padding:12px 14px;border-radius:14px;border:1px solid var(--line,rgba(0,0,0,.15))}.cp-slot.on{opacity:.65}.cp-slot .btn{justify-self:start;margin-top:6px}@media(max-width:560px){.cp-slots{grid-template-columns:1fr}}
.cp-canje{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0 10px}.cp-canje input{flex:1;min-width:220px}
.cp-nota{margin:6px 0 10px;padding:10px 14px;border-radius:12px;background:var(--soft);border:1px solid var(--line)}.cp-nota-r{border-color:rgba(217,90,106,.5)}
.cp-hist{margin:12px 0;border-top:1px solid var(--line);padding-top:10px}.cp-hist h4{margin:0 0 6px;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.cp-hist p{margin:4px 0;font-size:.92rem}
.cp-ed{margin:12px 0;border-top:1px solid var(--line);padding-top:10px}.cp-ed summary,.cp-aj summary{cursor:pointer;font-weight:700}
.cp-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.cp-chk{display:flex;gap:8px;align-items:center;margin:10px 0;font-size:.92rem}
.cp-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.cp-seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;margin:6px 0 12px}.cp-seg button{border:0;background:var(--soft);color:var(--text);padding:8px 16px;cursor:pointer;font:inherit;font-size:.9rem}.cp-seg button[aria-pressed="true"]{background:var(--oro);color:#252528;font-weight:700}
.cp-fl{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.cp-f{padding:7px 14px;border-radius:999px;border:1px solid var(--line);background:var(--soft);color:var(--text);cursor:pointer;font:inherit;font-size:.86rem}.cp-f2{font-size:.8rem;padding:5px 12px;opacity:.9}
.cp-f[aria-pressed="true"]{background:var(--oro);border-color:var(--oro);color:#252528;font-weight:700}
.cp-lista input[type=search]{width:100%;margin:6px 0 10px}
.cp-rows{display:grid;gap:8px}
.cp-row{display:grid;grid-template-columns:minmax(120px,auto) 1fr auto auto;gap:6px 14px;align-items:center;text-align:left;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--soft);color:var(--text);cursor:pointer;font:inherit}
.cp-row.sel,.cp-row:hover{border-color:var(--oro)}.cp-rc{letter-spacing:.06em}.cp-rn{display:grid;gap:2px}.cp-rp{font-weight:800;color:var(--oro-t)}.cp-rv{display:grid;gap:2px;justify-items:end}
@media(max-width:720px){.cp-row{grid-template-columns:1fr auto}.cp-rn{grid-column:1/-1;order:3}.cp-rv{justify-items:start;grid-column:1/-1;order:4}}
`));
  }

  window.FaroCupones = {
    iniciar(el_, c) { host = el_; ctx = c; css(); cargar(); },
    abrirCodigo(codigo) { S.ver = codigo || ''; const k = norm(codigo); const hit = S.lista.find(x => norm(x.codigo) === k); if (hit) S.sel = hit.id; if (host) pintar(); }
  };
})();
