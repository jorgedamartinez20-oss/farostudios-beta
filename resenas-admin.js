/* Faro Workspace · Reseñas
 * · Un solo enlace público (farostudios.net/comentario) para todos: cada persona escribe su nombre y recibe su código único (cliente + amigo). Empresas: sin código.
 * · Bandeja de reseñas recibidas: editar, cargar la foto, encuadrarla, publicar en la web y exportar en PNG transparente.
 * · Encuadre de foto reutilizable (también lo usa Sitio web → Reseñas).
 * Base de datos: sql/resenas-publicas.sql. Uso desde admin.html:
 *   FaroResenas.iniciar(contenedor, ctx)     ctx = { api, toast, errText, cfg, recargar, subir, base }
 *   FaroResenas.encuadre({url, pos, onChange}) → { el, get, set }
 *   FaroResenas.contar(ctx)                  → pone el número de reseñas nuevas en la pestaña
 */
(function () {
  'use strict';
  const PHI = 1.618;
  const SERV = ['Boda', 'XV años', 'Graduación', 'Sesión familiar o retrato', 'Evento social', 'Video corporativo o de marca', 'Fotografía para negocio', 'Sonido en vivo', 'Grabación o producción musical', 'Cobertura de evento', 'Producción de audio o spot', 'Contenido para redes', 'Otro'];
  const POS0 = '50,35,1';
  const FORMATOS = { '16:9': [1920, 1080, 'Horizontal 16:9'], '9:16': [1080, 1920, 'Historia 9:16'], '1:1': [1080, 1080, 'Cuadrado 1:1'] };
  const TEMAS = {
    marfil: { n: 'Tarjeta marfil', tarjeta: true, card: '#F5F2EE', txt: '#252528', acc: '#8B1A2A', mut: '#6a655c', plate: '#FFFFFF', logo: 'doc-logo-borgona.png', grano: '0,0,0' },
    pizarra: { n: 'Tarjeta pizarra', tarjeta: true, card: '#252528', txt: '#F5F2EE', acc: '#B8A06A', mut: '#c9c4ba', plate: '#303034', logo: 'doc-logo.png', grano: '255,255,255' },
    claro: { n: 'Sin tarjeta · texto marfil', tarjeta: false, txt: '#F5F2EE', acc: '#D8C48E', mut: '#e6e0d3', plate: 'rgba(37,37,40,.62)', logo: 'doc-logo.png' },
    oscuro: { n: 'Sin tarjeta · texto pizarra', tarjeta: false, txt: '#252528', acc: '#8B1A2A', mut: '#4a463f', plate: 'rgba(255,255,255,.72)', logo: 'doc-logo-borgona.png' }
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (t, a, ...k) => {
    const e = document.createElement(t);
    for (const n in (a || {})) { const v = a[n]; if (v == null || v === false) continue; if (n === 'class') e.className = v; else if (n === 'style') e.style.cssText = v; else if (n.startsWith('on')) e.addEventListener(n.slice(2), v); else e.setAttribute(n, v === true ? '' : v); }
    k.flat(9).forEach(c => { if (c == null || c === false) return; e.append(c.nodeType ? c : document.createTextNode(c)); });
    return e;
  };
  const IC = {
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    wa: '<path d="M21 12a9 9 0 0 1-13.4 7.8L3 21l1.3-4.4A9 9 0 1 1 21 12Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>', image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5L5 20"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', center: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z"/>'
  };
  const ico = (k, cls) => { const s = el('span', { class: 'rs-i ' + (cls || '') }); s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[k] || '') + '</svg>'; return s; };
  const btn = (txt, k, fn, cls) => el('button', { type: 'button', class: 'btn btn-sm ' + (cls || 'btn-ghost'), onclick: fn }, k ? ico(k) : null, txt ? ' ' + txt : null);

  /* ---------- encuadre de foto: x %, y %, acercamiento ---------- */
  const parsePos = s => { const a = String(s || POS0).split(',').map(parseFloat); const c = (v, lo, hi, d) => isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; return { x: c(a[0], 0, 100, 50), y: c(a[1], 0, 100, 35), z: c(a[2], 1, 3, 1) }; };
  const fmtPos = p => [p.x, p.y, p.z].map(v => (Math.round(v * 100) / 100).toString()).join(',');
  const natCache = {};
  const natSize = url => natCache[url] || (natCache[url] = new Promise(res => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth || 1, h: im.naturalHeight || 1 }); im.onerror = () => res({ w: 1, h: 1 }); im.src = url; }));
  /* mismo cálculo que usa la página: la imagen cubre el círculo y luego se acerca y se mueve */
  function aplicarFondo(nodo, url, pos, nat) {
    const p = parsePos(pos);
    nodo.style.backgroundImage = url ? 'url("' + String(url).replace(/"/g, '%22') + '")' : '';
    nodo.style.backgroundRepeat = 'no-repeat';
    nodo.style.backgroundPosition = p.x + '% ' + p.y + '%';
    nodo.style.backgroundSize = nat ? (Math.max(1, nat.w / nat.h) * p.z * 100) + '% auto' : 'cover';
  }
  function encuadre(o) {
    let pos = parsePos(o.pos), nat = null, drag = null;
    const D = o.size || 220;
    const cir = el('div', { class: 'rs-enc', tabindex: '0', role: 'img', 'aria-label': 'Foto: arrastra para moverla', style: 'width:' + D + 'px;height:' + D + 'px' });
    const rg = el('input', { type: 'range', min: '1', max: '3', step: '0.01', 'aria-label': 'Acercar la foto' });
    const pinta = () => aplicarFondo(cir, o.url, fmtPos(pos), nat);
    const avisa = () => { pinta(); o.onChange && o.onChange(fmtPos(pos)); };
    const dims = () => { const w = nat ? nat.w : 1, h = nat ? nat.h : 1, c = Math.max(D / w, D / h) * pos.z; return { W: w * c, H: h * c }; };
    rg.value = String(pos.z);
    rg.addEventListener('input', () => { pos.z = parseFloat(rg.value) || 1; avisa(); });
    cir.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, p: { ...pos } }; try { cir.setPointerCapture(e.pointerId); } catch (x) { } cir.classList.add('mov'); });
    cir.addEventListener('pointermove', e => {
      if (!drag) return; const { W, H } = dims(), dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (W - D > 1) pos.x = Math.min(100, Math.max(0, drag.p.x - dx * 100 / (W - D)));
      if (H - D > 1) pos.y = Math.min(100, Math.max(0, drag.p.y - dy * 100 / (H - D)));
      avisa();
    });
    const suelta = () => { drag = null; cir.classList.remove('mov'); };
    cir.addEventListener('pointerup', suelta); cir.addEventListener('pointercancel', suelta);
    cir.addEventListener('keydown', e => {
      const m = { ArrowLeft: [2, 0], ArrowRight: [-2, 0], ArrowUp: [0, 2], ArrowDown: [0, -2] }[e.key]; if (!m) return; e.preventDefault();
      pos.x = Math.min(100, Math.max(0, pos.x + m[0])); pos.y = Math.min(100, Math.max(0, pos.y + m[1])); avisa();
    });
    const box = el('div', { class: 'rs-encw' }, cir,
      el('div', { class: 'rs-encc' }, el('label', {}, 'Acercar', rg),
        el('div', { class: 'acts' }, btn('Centrar', 'center', () => { pos = { x: 50, y: 50, z: 1 }; rg.value = '1'; avisa(); }), btn('↑ Subir', null, () => { pos.y = Math.min(100, pos.y + 8); avisa(); }),
          btn('↓ Bajar', null, () => { pos.y = Math.max(0, pos.y - 8); avisa(); })),
        el('small', { class: 'muted' }, 'Arrastra la foto dentro del círculo. La foto no se recorta ni se retoca: solo cambia qué parte se ve.')));
    const cargaNat = () => { if (!o.url) { pinta(); return; } pinta(); natSize(o.url).then(n => { nat = n; pinta(); }); };
    cargaNat();
    return { el: box, get: () => fmtPos(pos), set: (url, p) => { o.url = url; pos = parsePos(p); rg.value = String(pos.z); nat = null; cargaNat(); } };
  }

  /* ---------- estado ---------- */
  let host = null, ctx = null, started = false, css1 = false;
  const S = { cargando: false, falta: false, enlaces: [], res: [], cfg: {}, sel: null, ed: null, filtro: 'todas', nuevoEnlace: null, ajustes: false, ocupado: false };
  const cfgGet = (k, d) => (S.cfg[k] != null && S.cfg[k] !== '' ? S.cfg[k] : d);
  const get = async (t, ord) => { const r = await ctx.api('/rest/v1/' + t + '?select=*' + (ord ? '&order=' + ord : '')); if (!r.ok) { const e = new Error(await ctx.errText(r)); e.status = r.status; throw e; } return r.json(); };
  const linea = r => r.tipo === 'empresa' ? [r.cargo && r.empresa ? r.cargo + ', ' + r.empresa : r.empresa, r.servicio, r.pais].filter(Boolean).join(' · ') : [r.servicio, r.subtipo].filter(Boolean).join(' · ');
  const fdate = iso => { try { return new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Guatemala' }); } catch (e) { return ''; } };
  const estrellas = n => '★'.repeat(n) + '☆'.repeat(5 - n);

  async function cargar() {
    S.cargando = true; pintar();
    try {
      const [b, c] = await Promise.all([get('rs_resenas', 'creado.desc'), get('rs_config')]);
      S.res = b; S.cfg = {}; c.forEach(x => { S.cfg[x.clave] = x.valor; }); S.falta = false;
      if (S.sel && !S.res.some(x => x.id === S.sel)) { S.sel = null; S.ed = null; }
    } catch (e) { S.falta = true; S.error = e.message; }
    S.cargando = false; badge(); pintar();
  }
  function badge() { const n = S.res.filter(r => r.estado === 'nueva').length, b = $('#nrsn'); if (b) { b.textContent = n; b.hidden = !n; } }

  /* ---------- web: los 6 espacios de «Lo dicen nuestros clientes» ---------- */
  const W = n => { const c = ctx.cfg(); return { n, g: c['rv.' + n + '.g'] === 'emp' ? 'emp' : 'per', cat: c['rv.' + n + '.c'] || '', q: c['rv.' + n + '.q'] || '', nombre: c['rv.' + n + '.n'] || '', linea: c['rv.' + n + '.r'] || '', est: parseInt(c['rv.' + n + '.s'], 10) || 5, pos: c['rv.' + n + '.p'] || '', foto: c['img.t' + n] || '' }; };
  /* espacios de la web: sin límite. Cada uno es de Personas ('per') o de Empresas ('emp') */
  const nums = () => { const c = ctx.cfg(), set = new Set(); Object.keys(c).forEach(k => { const m = /^rv\.(\d+)\.q$/.exec(k); if (m && c[k]) set.add(+m[1]); }); S.res.forEach(r => { if (r.slot) set.add(r.slot); }); return [...set].sort((x, y) => x - y); };
  const slots = () => nums().map(W);
  const sigSlot = () => Math.max(0, ...nums(), ...S.res.map(r => r.slot || 0)) + 1;
  const etqSlot = n => (W(n).g === 'emp' ? 'Empresas' : 'Personas') + ' · espacio ' + n;
  const CATS = { individual: ['Boda', 'XV años', 'Graduación', 'Sesión familiar o retrato', 'Evento social', 'Producción musical', 'Otro'], empresa: ['Producciones de audio', 'Streaming', 'Podcast', 'Locuciones comerciales', 'Material sonoro de radio', 'Contenido para TV', 'Coberturas', 'Activaciones', 'Fotografía de producto', 'Inmobiliaria', 'Video corporativo o de marca', 'Contenido para redes', 'Otro'] };
  const SUBS = ['Banda', 'Iglesia', 'Agrupación', 'Solista', 'Sonido en vivo'];
  const PAISES = ['Guatemala', 'México', 'Belice', 'El Salvador', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panamá'];
  async function setCfg(k, v) {
    if (v) { const r = await ctx.api('/rest/v1/sitio_config?on_conflict=clave', { method: 'POST', body: { clave: k, valor: v, actualizado: new Date().toISOString() }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } }); if (!r.ok) throw new Error(await ctx.errText(r)); }
    else { const r = await ctx.api('/rest/v1/sitio_config?clave=eq.' + encodeURIComponent(k), { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); if (!r.ok) throw new Error(await ctx.errText(r)); }
  }
  async function aWeb(r, n) {
    await setCfg('rv.' + n + '.q', r.texto); await setCfg('rv.' + n + '.n', r.nombre); await setCfg('rv.' + n + '.r', linea(r));
    await setCfg('rv.' + n + '.s', String(r.estrellas)); await setCfg('rv.' + n + '.g', r.tipo === 'empresa' ? 'emp' : 'per'); await setCfg('rv.' + n + '.c', r.categoria || r.servicio || ''); await setCfg('rv.' + n + '.p', r.foto_pos || POS0); await setCfg('img.t' + n, r.foto || '');
  }
  async function quitarDeWeb(n) { for (const k of ['rv.' + n + '.q', 'rv.' + n + '.n', 'rv.' + n + '.r', 'rv.' + n + '.s', 'rv.' + n + '.p', 'rv.' + n + '.g', 'rv.' + n + '.c', 'img.t' + n]) await setCfg(k, ''); }
  const patch = async (id, body) => { const r = await ctx.api('/rest/v1/rs_resenas?id=eq.' + id, { method: 'PATCH', body, headers: { Prefer: 'return=representation' } }); if (!r.ok) throw new Error(await ctx.errText(r)); const j = await r.json(); return j[0]; };

  /* ---------- enlace único ---------- */
  const baseLink = () => (ctx.base ? ctx.base() : 'https://www.farostudios.net/comentario');
  const mensaje = () => {
    const pct = parseFloat(cfgGet('descuento', '10'));
    return 'Hola, gracias por confiar en Faro Studios 🤍 Nos encantaría conocer tu comentario: toma menos de un minuto' + (pct > 0 ? ' y como agradecimiento recibes ' + pct + '% de descuento en tu próxima sesión, con un uso para ti y otro para un amigo (vale ' + cfgGet('vigencia_meses', '5') + ' meses)' : '') + '. Aquí puedes dejarlo:\n' + baseLink();
  };
  const copiar = async (t, ok) => { try { await navigator.clipboard.writeText(t); ctx.toast(ok || 'Copiado'); } catch (e) { const ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); ctx.toast(ok || 'Copiado'); } catch (x) { ctx.toast('No se pudo copiar'); } ta.remove(); } };

  /* ---------- vistas ---------- */
  function pintar() {
    if (!host) return; const keep = host.scrollTop;
    host.textContent = '';
    host.append(vCabecera());
    if (S.cargando && !S.res.length) { host.append(el('p', { class: 'muted' }, 'Cargando…')); return; }
    if (S.falta) { host.append(el('div', { class: 'card rs-aviso' }, el('h3', {}, 'Falta activar los comentarios'), el('p', {}, 'En Supabase abre SQL Editor, pega el contenido de sql/cupones.sql y dale Run. Después vuelve a esta pestaña.'), el('p', { class: 'muted' }, S.error || ''), btn('Reintentar', null, cargar, 'btn-gold'))); return; }
    host.append(vEnlaces(), vBandeja(), vWeb());
    host.scrollTop = keep;
  }
  function vCabecera() {
    const n = S.res.filter(r => r.estado === 'nueva').length, pub = slots().filter(s => s.q).length;
    return el('div', { class: 'card rs-cab' }, el('div', {}, el('h2', {}, ico('star'), ' Reseñas'), el('p', { class: 'muted' }, 'Comparte un solo enlace con todos tus clientes, recibe sus comentarios, edítalos, ponles foto y publícalos en la web (Personas o Empresas). También puedes exportarlos como imagen para Instagram.')),
      el('div', { class: 'rs-kp' }, el('b', {}, String(S.res.length)), el('small', {}, 'recibidas'), el('b', {}, String(n)), el('small', {}, 'nuevas'), el('b', {}, pub), el('small', {}, 'en la web')));
  }
  function vEnlaces() {
    const c = el('div', { class: 'card rs-sec' });
    c.append(el('h3', {}, ico('link'), ' Tu enlace para comentarios'),
      el('p', { class: 'muted' }, 'Es el mismo enlace para todos. Cada persona escribe su nombre, y al enviar el sistema le genera su código único (un uso para ella y otro para un amigo) y lo guarda en Cupones. Las empresas dejan su comentario sin código.'));
    const u = baseLink();
    c.append(el('div', { class: 'rs-link' }, el('div', { class: 'rs-lt' }, el('b', {}, u.replace(/^https?:\/\//, '')), el('small', { class: 'muted' }, 'Publícalo en tu bio, envíalo por WhatsApp o ponlo en un QR.')),
      el('div', { class: 'acts' }, btn('Copiar enlace', 'copy', () => copiar(u, 'Enlace copiado')), btn('Copiar mensaje', 'copy', () => copiar(mensaje(), 'Mensaje copiado')),
        el('a', { class: 'btn btn-sm btn-ghost', target: '_blank', rel: 'noopener', href: 'https://wa.me/?text=' + encodeURIComponent(mensaje()) }, ico('wa'), ' WhatsApp'),
        el('a', { class: 'btn btn-sm btn-ghost', target: '_blank', rel: 'noopener', href: u }, ico('globe'), ' Ver página'))));
    c.append(vAjustes());
    return c;
  }
  function vAjustes() {
    const d = el('details', { class: 'rs-aj', open: S.ajustes ? '' : null }, el('summary', {}, ico('gift'), ' Regalo para quien deja su comentario'));
    d.addEventListener('toggle', () => { S.ajustes = d.open; });
    const pct = el('input', { type: 'number', min: '0', max: '100', step: '1', value: cfgGet('descuento', '10'), 'aria-label': 'Porcentaje de descuento' });
    const pre = el('input', { type: 'text', maxlength: '10', value: cfgGet('prefijo', 'FARO'), 'aria-label': 'Prefijo del código' });
    const con = el('textarea', { rows: '2', maxlength: '200' }); con.value = cfgGet('condicion', '');
    d.append(el('div', { class: 'rs-g3' }, el('div', { class: 'field' }, el('label', {}, '% de descuento'), pct), el('div', { class: 'field' }, el('label', {}, 'Prefijo del código'), pre)),
      el('div', { class: 'field' }, el('label', {}, 'Condición que ve el cliente'), con),
      el('p', { class: 'muted' }, 'Cada persona (no empresa) recibe un código único con 2 usos, cliente y amigo, por ejemplo ' + (pre.value || 'FARO').toUpperCase().replace(/[^A-Z0-9]/g, '') + '-7K2M9Q. Si pones 0, solo se le agradece, sin descuento.'),
      btn('Guardar regalo', 'check', async () => {
        const v = Math.max(0, Math.min(100, parseInt(pct.value, 10) || 0));
        const rows = [{ clave: 'descuento', valor: String(v) }, { clave: 'prefijo', valor: (pre.value || 'FARO').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'FARO' }, { clave: 'condicion', valor: con.value.trim().slice(0, 200) }];
        const r = await ctx.api('/rest/v1/rs_config?on_conflict=clave', { method: 'POST', body: rows, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
        if (!r.ok) { ctx.toast(await ctx.errText(r)); return; } rows.forEach(x => { S.cfg[x.clave] = x.valor; }); ctx.toast('Regalo guardado'); pintar();
      }, 'btn-gold'));
    return d;
  }

  function vBandeja() {
    const c = el('div', { class: 'card rs-sec' });
    c.append(el('h3', {}, ico('user'), ' Reseñas recibidas'));
    const fl = el('div', { class: 'rs-fl' });
    [['todas', 'Todas'], ['nueva', 'Nuevas'], ['web', 'En la web'], ['archivada', 'Archivadas']].forEach(([k, l]) => fl.append(el('button', { type: 'button', class: 'rs-f', 'aria-pressed': String(S.filtro === k), onclick: () => { S.filtro = k; pintar(); } }, l)));
    c.append(fl);
    const lista = S.res.filter(r => S.filtro === 'todas' ? r.estado !== 'archivada' : S.filtro === 'web' ? !!r.slot : r.estado === S.filtro);
    if (!lista.length) c.append(el('p', { class: 'muted' }, S.res.length ? 'No hay reseñas en este filtro.' : 'Cuando un cliente envíe su reseña, aparece aquí.'));
    const g = el('div', { class: 'mdg' });
    lista.forEach(r => g.append(el('button', { type: 'button', class: 'mdc' + (r.estado === 'nueva' ? '' : ' on'), 'aria-pressed': String(r.id === S.sel), title: r.nombre, onclick: () => { S.sel = r.id; S.ed = null; pintar(); } },
      el('span', { class: 'mdt' }, r.foto ? el('img', { src: r.foto, alt: '', loading: 'lazy' }) : ico('user')), el('b', {}, r.nombre), el('small', {}, estrellas(r.estrellas) + (r.slot ? ' · Web ' + r.slot : '')), r.estado === 'nueva' ? el('i', { class: 'mdk rs-nv' }, 'NUEVA') : null)));
    c.append(g);
    const r = S.res.find(x => x.id === S.sel);
    if (r) c.append(vEditor(r));
    return c;
  }

  function vEditor(r) {
    if (!S.ed || S.ed.id !== r.id) S.ed = { ...r };
    const E = S.ed, box = el('div', { class: 'rs-ed' });
    box.append(el('h3', {}, 'Reseña de ' + r.nombre), el('p', { class: 'muted' }, 'Recibida ' + fdate(r.creado) + (r.tipo === 'empresa' ? ' · Empresa (sin código)' : ' · Código ' + (r.codigo || '—'))));
    /* foto + encuadre */
    const enc = encuadre({ url: E.foto, pos: E.foto_pos, size: 230, onChange: p => { E.foto_pos = p; } });
    const fi = el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    fi.addEventListener('change', async () => { const f = fi.files[0]; if (!f) return; try { ctx.toast('Subiendo foto…'); E.foto = await ctx.subir(f, 'rs-' + r.id); E.foto_pos = POS0; enc.set(E.foto, E.foto_pos); pintarFotoAcc(); ctx.toast('Foto cargada. Encuádrala y guarda.'); } catch (e) { ctx.toast(e.message || 'No se pudo subir la foto'); } });
    const fotoAcc = el('div', { class: 'acts' });
    const pintarFotoAcc = () => { fotoAcc.textContent = ''; fotoAcc.append(btn(E.foto ? 'Cambiar foto' : 'Cargar foto', 'upload', () => fi.click(), 'btn-gold'), E.foto ? btn('Quitar', 'trash', () => { E.foto = ''; enc.set('', POS0); pintarFotoAcc(); }, 'btn-red') : null, fi); };
    pintarFotoAcc();
    const izq = el('div', { class: 'rs-foto' }, el('h4', {}, 'Foto del cliente'), enc.el, fotoAcc);
    /* campos */
    const tipo = el('select', { 'aria-label': 'Tipo de cliente' }, el('option', { value: 'individual' }, 'Cliente individual'), el('option', { value: 'empresa' }, 'Empresa')); tipo.value = E.tipo;
    const emp = el('input', { type: 'text', maxlength: '80', value: E.empresa, 'aria-label': 'Empresa' });
    const nom = el('input', { type: 'text', maxlength: '80', value: E.nombre, 'aria-label': 'Nombre' });
    const cargo = el('input', { type: 'text', maxlength: '80', value: E.cargo || '', 'aria-label': 'Cargo' });
    const ser = el('input', { type: 'text', maxlength: '80', value: E.servicio, list: 'rs-serv', 'aria-label': 'Trabajo realizado' });
    const dl = el('datalist', { id: 'rs-serv' }, SERV.map(s => el('option', { value: s })));
    const txt = el('textarea', { rows: '5', maxlength: '1500', 'aria-label': 'Opinión' }); txt.value = E.texto;
    const est = el('div', { class: 'rs-est', role: 'radiogroup', 'aria-label': 'Estrellas' });
    const pintaEst = () => { est.textContent = ''; for (let i = 1; i <= 5; i++) est.append(el('button', { type: 'button', class: 'rs-star' + (i <= E.estrellas ? ' on' : ''), 'aria-label': i + ' estrellas', onclick: () => { E.estrellas = i; pintaEst(); } }, '★')); };
    pintaEst();
    const cat = el('select', { 'aria-label': 'Categoría' });
    const subS = el('select', { 'aria-label': 'Tipo de proyecto musical' }, el('option', { value: '' }, '—'), SUBS.map(x => el('option', { value: x }, x)));
    const paisS = el('select', { 'aria-label': 'País' }, el('option', { value: '' }, '—'), PAISES.map(x => el('option', { value: x }, x)));
    const pintaCat = () => { const mu = E.tipo === 'empresa', sel = (E.categoria || '').split('|').filter(Boolean); cat.textContent = ''; cat.multiple = mu; cat.size = mu ? 6 : 1; if (!mu) cat.append(el('option', { value: '' }, 'Sin categoría')); (CATS[E.tipo] || []).forEach(x => cat.append(el('option', { value: x, selected: sel.includes(x) ? '' : null }, x))); if (!mu) cat.value = sel[0] && (CATS[E.tipo] || []).includes(sel[0]) ? sel[0] : ''; if (!mu && sel[0] && !(CATS[E.tipo] || []).includes(sel[0])) { cat.append(el('option', { value: sel[0] }, sel[0])); cat.value = sel[0]; } };
    const rowSub = el('div', { class: 'field' }, el('label', {}, 'Tipo de proyecto musical'), subS), rowPais = el('div', { class: 'field' }, el('label', {}, 'País'), paisS);
    const vis = () => { rowSub.hidden = !(E.tipo === 'individual' && E.categoria === 'Producción musical'); rowPais.hidden = E.tipo !== 'empresa'; };
    subS.value = E.subtipo || ''; paisS.value = E.pais || ''; pintaCat(); vis();
    cat.addEventListener('change', () => { E.categoria = [...cat.selectedOptions].map(o => o.value).filter(Boolean).join('|'); vis(); }); subS.addEventListener('change', () => { E.subtipo = subS.value; }); paisS.addEventListener('change', () => { E.pais = paisS.value; });
    const rowEmp = el('div', { class: 'field' }, el('label', {}, 'Nombre de la empresa'), emp);
    const rowCargo = el('div', { class: 'field' }, el('label', {}, 'Cargo (opcional)'), cargo); rowCargo.hidden = E.tipo !== 'empresa'; cargo.addEventListener('input', () => { E.cargo = cargo.value; });
    tipo.addEventListener('change', () => { E.tipo = tipo.value; rowEmp.hidden = E.tipo !== 'empresa'; rowCargo.hidden = E.tipo !== 'empresa'; pintaCat(); vis(); }); rowEmp.hidden = E.tipo !== 'empresa';
    emp.addEventListener('input', () => { E.empresa = emp.value; }); nom.addEventListener('input', () => { E.nombre = nom.value; }); ser.addEventListener('input', () => { E.servicio = ser.value; }); txt.addEventListener('input', () => { E.texto = txt.value; });
    const der = el('div', { class: 'rs-campos' },
      el('div', { class: 'field' }, el('label', {}, 'Tipo de cliente'), tipo), rowEmp,
      el('div', { class: 'field' }, el('label', {}, 'Nombre'), nom), rowCargo, el('div', { class: 'field' }, el('label', {}, E.tipo === 'empresa' ? 'Categorías (marca varias con Ctrl o ⌘)' : 'Categoría (para filtrar en la web)'), cat), rowSub, rowPais, el('div', { class: 'field' }, el('label', {}, 'Trabajo realizado (texto que se ve)'), ser, dl),
      el('div', { class: 'field' }, el('label', {}, 'Estrellas'), est), el('div', { class: 'field' }, el('label', {}, 'Opinión'), txt));
    box.append(el('div', { class: 'rs-cols' }, izq, der));
    if (r.mejora) box.append(el('div', { class: 'rs-mej' }, el('b', {}, '🔒 Qué podríamos mejorar (privado, no se publica)'), el('p', {}, r.mejora)));
    /* original */
    const o = r.original || {};
    if (o.texto && (o.texto !== E.texto || o.nombre !== E.nombre)) box.append(el('details', { class: 'rs-orig' }, el('summary', {}, 'Ver lo que escribió el cliente'), el('p', {}, o.texto), btn('Restaurar texto original', null, () => { E.texto = o.texto; E.nombre = o.nombre || E.nombre; E.servicio = o.servicio != null ? o.servicio : E.servicio; pintar(); })));
    /* guardar y publicar */
    const guardar = async (silencio) => {
      if (E.nombre.trim().length < 1 || E.texto.trim().length < 1) { ctx.toast('El nombre y la opinión no pueden quedar vacíos'); return null; }
      if (E.tipo === 'individual') E.empresa = '';
      const n = await patch(r.id, { tipo: E.tipo, empresa: E.empresa.trim(), nombre: E.nombre.trim(), servicio: E.servicio.trim(), cargo: E.tipo === 'empresa' ? (E.cargo || '').trim() : '', categoria: E.categoria || '', subtipo: E.tipo === 'individual' && E.categoria === 'Producción musical' ? (E.subtipo || '') : '', pais: E.tipo === 'empresa' ? (E.pais || '') : '', estrellas: E.estrellas, texto: E.texto.trim(), foto: E.foto || '', foto_pos: E.foto_pos || POS0, estado: r.estado === 'nueva' ? 'revisada' : r.estado });
      Object.assign(r, n); S.ed = { ...r };
      if (r.slot) { await aWeb(r, r.slot); await ctx.recargar(); if (!silencio) ctx.toast('Guardada y actualizada en la web'); } else if (!silencio) ctx.toast('Guardada');
      badge(); return n;
    };
    const acts = el('div', { class: 'acts rs-pub' }, btn('Guardar cambios', 'check', async () => { try { await guardar(); pintar(); } catch (e) { ctx.toast(e.message || 'No se pudo guardar'); } }, 'btn-gold'));
    /* publicar en un espacio */
    const selS = el('select', { 'aria-label': 'Espacio de la web' });
    const grupo = () => (E.tipo === 'empresa' ? 'emp' : 'per');
    const pintaSel = () => { selS.textContent = ''; selS.append(el('option', { value: 'nuevo' }, 'Espacio nuevo (al final de ' + (grupo() === 'emp' ? 'Empresas' : 'Personas') + ')')); slots().filter(x => x.g === grupo()).forEach(x => selS.append(el('option', { value: String(x.n) }, 'Reemplazar espacio ' + x.n + (S.res.find(z => z.slot === x.n && z.id === r.id) ? ' · esta reseña' : ' · ' + (x.nombre || 'otra reseña'))))); selS.value = r.slot ? String(r.slot) : 'nuevo'; };
    pintaSel(); tipo.addEventListener('change', pintaSel);
    acts.append(el('span', { class: 'rs-sp' }), selS, btn(r.slot ? 'Actualizar en la web' : 'Publicar en la web', 'globe', async () => {
      const n = selS.value === 'nuevo' ? sigSlot() : parseInt(selS.value, 10), cur = selS.value === 'nuevo' ? { q: '' } : W(n);
      if (cur.q && (!r.slot || r.slot !== n) && !confirm('El espacio ' + etqSlot(n) + ' ya tiene la reseña de «' + (cur.nombre || 'otro cliente') + '». ¿Reemplazarla?')) return;
      try {
        if (!(await guardar(true))) return;
        const otro = S.res.find(x => x.slot === n && x.id !== r.id); if (otro) { await patch(otro.id, { slot: null }); otro.slot = null; }
        if (r.slot && r.slot !== n) await quitarDeWeb(r.slot);
        await aWeb(r, n); const nr = await patch(r.id, { slot: n, estado: 'revisada' }); Object.assign(r, nr); S.ed = { ...r };
        await ctx.recargar(); ctx.toast('Publicada en la web (' + etqSlot(n) + ')'); pintar();
      } catch (e) { ctx.toast(e.message || 'No se pudo publicar'); }
    }, 'btn-gold'));
    if (r.slot) acts.append(btn('Quitar de la web', 'x', async () => { if (!confirm('¿Quitar esta reseña de la web? Se queda guardada aquí.')) return; try { await quitarDeWeb(r.slot); const nr = await patch(r.id, { slot: null }); Object.assign(r, nr); await ctx.recargar(); ctx.toast('Quitada de la web'); pintar(); } catch (e) { ctx.toast(e.message || 'No se pudo quitar'); } }, 'btn-red'));
    box.append(acts);
    const acts2 = el('div', { class: 'acts' }, btn('Exportar como imagen (PNG)', 'download', () => abrirExport({ nombre: E.nombre, linea: linea({ ...E }), texto: E.texto, estrellas: E.estrellas, foto: E.foto, pos: E.foto_pos }), 'btn-gold'));
    const cj = r.codigo ? el('div', { class: 'rs-chk' }, el('span', {}, 'Código ' + r.codigo), btn('Ver y canjear en Cupones', 'gift', () => { try { window.FaroCupones.abrirCodigo(r.codigo); } catch (e) { } if (window.showTab) window.showTab('cup'); })) : el('span', { class: 'muted' }, r.tipo === 'empresa' ? 'Empresa: sin código de descuento' : 'Sin código de descuento');
    acts2.append(cj, el('span', { class: 'rs-sp' }),
      r.estado !== 'archivada' ? btn('Archivar', null, async () => { try { if (r.slot) { await quitarDeWeb(r.slot); await ctx.recargar(); } const n = await patch(r.id, { estado: 'archivada', slot: null }); Object.assign(r, n); S.sel = null; S.ed = null; pintar(); ctx.toast('Archivada'); } catch (e) { ctx.toast(e.message); } }) : btn('Desarchivar', null, async () => { const n = await patch(r.id, { estado: 'revisada' }); Object.assign(r, n); pintar(); }),
      btn('Borrar', 'trash', async () => { if (!confirm('¿Borrar esta reseña para siempre?' + (r.slot ? ' También se quita de la web.' : ''))) return; try { if (r.slot) { await quitarDeWeb(r.slot); await ctx.recargar(); } const x = await ctx.api('/rest/v1/rs_resenas?id=eq.' + r.id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); if (!x.ok) throw new Error(await ctx.errText(x)); S.res = S.res.filter(z => z.id !== r.id); S.sel = null; S.ed = null; badge(); pintar(); } catch (e) { ctx.toast(e.message); } }, 'btn-red'));
    box.append(acts2);
    return box;
  }

  function vWeb() {
    const c = el('div', { class: 'card rs-sec' });
    c.append(el('h3', {}, ico('globe'), ' En la web ahora'), el('p', { class: 'muted' }, 'Lo que se ve en «Lo dicen nuestros clientes». No hay límite: cada comentario que publiques abre un espacio nuevo, de Personas o de Empresas, y la web los separa por categoría. Aquí también exportas cualquiera como imagen, aunque la hayas cargado a mano en Sitio web.'));
    const g = el('div', { class: 'rs-wg' });
    slots().forEach(s => {
      const ph = el('div', { class: 'rs-ph' }); if (s.foto) { aplicarFondo(ph, s.foto, s.pos || POS0, null); natSize(s.foto).then(n => aplicarFondo(ph, s.foto, s.pos || POS0, n)); } else ph.append(ico('user'));
      const r = S.res.find(x => x.slot === s.n);
      g.append(el('div', { class: 'rs-w' + (s.q ? '' : ' vacio') }, el('small', { class: 'muted' }, etqSlot(s.n)), ph,
        s.q ? [el('b', {}, s.nombre || 'Cliente'), el('small', { class: 'rs-wl' }, s.linea), s.cat ? el('small', { class: 'tag pendiente' }, s.cat) : null, el('span', { class: 'rs-wst' }, estrellas(s.est)),
          el('div', { class: 'acts' }, btn('PNG', 'download', () => abrirExport({ nombre: s.nombre || 'Cliente', linea: s.linea, texto: s.q, estrellas: s.est, foto: s.foto, pos: s.pos || POS0 }), 'btn-gold'),
            r ? btn('Editar', null, () => { S.sel = r.id; S.ed = null; pintar(); setTimeout(() => { const t = $('.rs-ed', host); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); }) : null,
            btn('', 'x', async () => { if (!confirm('¿Quitar de ' + etqSlot(s.n) + '?')) return; try { await quitarDeWeb(s.n); if (r) { const n = await patch(r.id, { slot: null }); Object.assign(r, n); } await ctx.recargar(); pintar(); ctx.toast('Quitada'); } catch (e) { ctx.toast(e.message); } }, 'btn-red'))]
          : el('small', { class: 'muted' }, 'Libre')));
    });
    c.append(g);
    const mas = el('input', { type: 'number', min: '0', max: '9999', step: '1', value: ctx.cfg()['rv.mas'] || '', placeholder: '0', 'aria-label': 'Reseñas adicionales' });
    c.append(el('div', { class: 'field' }, el('label', {}, 'Contador «+N reseñas» debajo del carrusel (opcional, no se puede tocar en la web)'), mas,
      el('p', { class: 'muted' }, 'Pon aquí el número de reseñas reales que tienes recibidas y no estás mostrando. Déjalo vacío para ocultarlo.')),
      btn('Guardar contador', 'check', async () => { try { const v = parseInt(mas.value, 10); await setCfg('rv.mas', v > 0 ? String(v) : ''); await ctx.recargar(); ctx.toast(v > 0 ? 'Contador guardado' : 'Contador oculto'); } catch (e) { ctx.toast(e.message || 'No se pudo guardar'); } }, 'btn-gold'));
    return c;
  }

  /* ---------- exportar a PNG transparente ---------- */
  const imgCache = {};
  const cargaImg = (url, cors) => { const k = url + '|' + !!cors; return imgCache[k] || (imgCache[k] = new Promise(res => { const im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = url; })); };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const estrella = (c, cx, cy, R) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.47 : R; c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.closePath(); };
  function lineas(c, texto, maxW) {
    const out = []; String(texto).replace(/\r/g, '').split('\n').forEach(par => {
      let cur = ''; par.split(/\s+/).filter(Boolean).forEach(w => {
        const t = cur ? cur + ' ' + w : w;
        if (c.measureText(t).width <= maxW || !cur) { cur = t; } else { out.push(cur); cur = w; }
      }); if (cur) out.push(cur);
    }); return out;
  }
  let grano = null;
  const granoTile = rgb => { if (grano && grano.k === rgb) return grano.c; const t = document.createElement('canvas'); t.width = t.height = 220; const x = t.getContext('2d'), d = x.createImageData(220, 220); for (let i = 0; i < d.data.length; i += 4) { const a = Math.random() < .5 ? 0 : Math.random() * 255; const p = rgb.split(','); d.data[i] = +p[0]; d.data[i + 1] = +p[1]; d.data[i + 2] = +p[2]; d.data[i + 3] = a; } x.putImageData(d, 0, 0); grano = { k: rgb, c: t }; return t; };

  /* dibuja la reseña; devuelve { corto: true } si el texto no cabe ni en el tamaño mínimo */
  function dibujar(cv, it, o, foto, logo) {
    const [W, H] = FORMATOS[o.fmt] || FORMATOS['16:9'], T = TEMAS[o.tema] || TEMAS.marfil, c = cv.getContext('2d');
    cv.width = W; cv.height = H; c.clearRect(0, 0, W, H);
    const horiz = W > H, M = Math.round(Math.min(W, H) * 0.06), P = Math.round(Math.min(W, H) * 0.06);
    const cx0 = M, cy0 = M, cw = W - 2 * M, ch = H - 2 * M;
    if (T.tarjeta) {
      c.save(); c.shadowColor = 'rgba(0,0,0,.42)'; c.shadowBlur = 80; c.shadowOffsetY = 30; rr(c, cx0, cy0, cw, ch, 56); c.fillStyle = T.card; c.fill(); c.restore();
      c.save(); rr(c, cx0, cy0, cw, ch, 56); c.clip();
      c.globalAlpha = .08; c.fillStyle = c.createPattern(granoTile(T.grano), 'repeat'); c.fillRect(cx0, cy0, cw, ch);
      c.globalAlpha = .06; c.fillStyle = 'rgb(' + T.grano + ')'; for (let y = cy0 + 30; y < cy0 + ch; y += 36) for (let x = cx0 + 30; x < cx0 + cw; x += 36) { c.beginPath(); c.arc(x, y, 1.3, 0, 7); c.fill(); }
      c.restore();
      c.save(); rr(c, cx0 + 14, cy0 + 14, cw - 28, ch - 28, 44); c.strokeStyle = 'rgba(184,160,106,.6)'; c.lineWidth = 2; c.stroke(); c.restore();
    }
    const bx = cx0 + P + 14, by = cy0 + P + 10, bw = cw - 2 * (P + 14), bh = ch - 2 * (P + 10);
    const logoH = horiz ? 88 : 100, logoY = by + bh - logoH;
    let tx = bx, ty = by, tw = bw, th = bh - logoH - 30;
    /* foto */
    if (foto || it.foto) {
      const D = horiz ? Math.min(bh - logoH - 70, Math.round(bw * 0.34)) : (o.fmt === '1:1' ? 330 : 470);
      const px = horiz ? bx + D / 2 + 30 : bx + bw / 2, py = horiz ? by + (bh - logoH - 20) / 2 : by + D / 2 + 26;
      c.save(); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 50; c.shadowOffsetY = 22; c.beginPath(); c.arc(px, py, D / 2 + 14, 0, 7); c.fillStyle = T.tarjeta ? '#fff' : (o.tema === 'claro' ? '#F5F2EE' : '#fff'); c.fill(); c.restore();
      c.save(); c.beginPath(); c.arc(px, py, D / 2, 0, 7); c.clip();
      if (foto) { const p = parsePos(it.pos), s = D, w = foto.naturalWidth, h = foto.naturalHeight, k = Math.max(s / w, s / h) * p.z, Wd = w * k, Hd = h * k; c.drawImage(foto, px - s / 2 + (s - Wd) * p.x / 100, py - s / 2 + (s - Hd) * p.y / 100, Wd, Hd); } else { c.fillStyle = '#d9d2c3'; c.fillRect(px - D / 2, py - D / 2, D, D); }
      c.restore();
      const g = c.createLinearGradient(px - D / 2, py - D / 2, px + D / 2, py + D / 2); g.addColorStop(0, '#E0CD9A'); g.addColorStop(.5, '#B8A06A'); g.addColorStop(1, '#A58E5A');
      c.beginPath(); c.arc(px, py, D / 2 + 14, 0, 7); c.strokeStyle = g; c.lineWidth = 9; c.stroke();
      c.save(); c.beginPath(); c.arc(px, py, D / 2 + 42, 0, 7); c.setLineDash([3, 16]); c.lineCap = 'round'; c.strokeStyle = T.acc; c.globalAlpha = .55; c.lineWidth = 4; c.stroke(); c.restore();
      if (horiz) { tx = bx + D + 130; tw = bx + bw - tx; } else { ty = by + D + 100; th = by + bh - logoH - 30 - ty; }
    }
    /* texto: la jerarquía sigue la proporción áurea (opinión → nombre → trabajo) */
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const cxT = tx + tw / 2, texto = (it.texto || '').trim(), nombre = (it.nombre || '').trim(), tipoL = (it.linea || '').trim();
    let A = horiz ? 84 : (o.fmt === '1:1' ? 68 : 78), res = null, corto = false;
    const MIN = 30;
    for (; A >= MIN; A -= 2) {
      const N = Math.max(A / PHI, 40), Tt = Math.max(N / PHI, 27), star = Math.max(A, 44), gap = A * 0.7;
      c.font = '400 ' + A + 'px Lato, system-ui, sans-serif'; const L = lineas(c, texto, tw - 20), lh = A * 1.36;
      c.font = '400 ' + N + 'px Lato, system-ui, sans-serif'; let wN = c.measureText(nombre).width;
      c.font = '400 ' + Tt + 'px Lato, system-ui, sans-serif'; let wT = c.measureText(tipoL).width;
      const padY = N * 0.5, plateH = padY * 2 + N * 1.15 + (tipoL ? Tt * 1.6 : 0), plateW = Math.min(tw, Math.max(wN, wT) + N * 2.4);
      const total = star + gap + L.length * lh + gap * 1.3 + plateH;
      if (total <= th) { res = { A, N, Tt, star, gap, L, lh, plateH, plateW, padY, total }; break; }
      if (A - 2 < MIN) { res = { A: MIN, N, Tt, star, gap, L, lh, plateH, plateW, padY, total }; corto = true; }
    }
    if (res) {
      let y = ty + Math.max(0, (th - res.total) / 2);
      /* comilla decorativa */
      c.save(); c.globalAlpha = .16; c.fillStyle = T.acc; c.font = '700 ' + (res.A * 4.6) + 'px Georgia, serif'; c.textAlign = 'left'; c.fillText('“', tx - 4, y + res.star + res.A * 2.6); c.restore(); c.textAlign = 'center';
      /* estrellas */
      const sg = c.createLinearGradient(0, y, 0, y + res.star); sg.addColorStop(0, '#E7D6A2'); sg.addColorStop(.55, '#B8A06A'); sg.addColorStop(1, '#A58E5A');
      const sp = res.star * 1.28, sx = cxT - sp * 2;
      for (let i = 0; i < 5; i++) { const on = i < it.estrellas; c.save(); if (on) { c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = 10; c.shadowOffsetY = 5; } estrella(c, sx + i * sp, y + res.star / 2, res.star * 0.5); c.fillStyle = on ? sg : (T.tarjeta && o.tema === 'marfil' ? 'rgba(37,37,40,.14)' : 'rgba(150,145,130,.35)'); c.fill(); c.restore(); }
      y += res.star + res.gap;
      c.fillStyle = T.txt; c.font = '400 ' + res.A + 'px Lato, system-ui, sans-serif';
      let L = res.L; const maxL = Math.max(1, Math.floor((th - res.star - res.gap * 2.3 - res.plateH) / res.lh));
      if (L.length > maxL) { L = L.slice(0, maxL); L[maxL - 1] = L[maxL - 1].replace(/[\s.,;:!?¡¿]*\S*$/, '') + '…'; }
      c.shadowColor = o.tema === 'claro' ? 'rgba(0,0,0,.45)' : 'transparent'; c.shadowBlur = o.tema === 'claro' ? 14 : 0;
      L.forEach((l, i) => c.fillText(l, cxT, y + res.A * 0.95 + i * res.lh)); c.shadowBlur = 0; c.shadowColor = 'transparent';
      y += L.length * res.lh + res.gap * 1.3;
      /* placa con nombre y trabajo: caja con profundidad, texto centrado */
      c.save(); c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = 30; c.shadowOffsetY = 14; rr(c, cxT - res.plateW / 2, y, res.plateW, res.plateH, res.plateH * 0.3); c.fillStyle = T.plate; c.fill(); c.restore();
      c.save(); rr(c, cxT - res.plateW / 2, y, res.plateW, res.plateH, res.plateH * 0.3); c.strokeStyle = 'rgba(184,160,106,.7)'; c.lineWidth = 2; c.stroke(); c.restore();
      c.fillStyle = T.acc; c.font = '400 ' + res.N + 'px Lato, system-ui, sans-serif'; c.fillText(nombre, cxT, y + res.padY + res.N * 0.92);
      if (tipoL) { c.fillStyle = T.mut; c.font = '400 ' + res.Tt + 'px Lato, system-ui, sans-serif'; c.fillText(tipoL, cxT, y + res.padY + res.N * 1.15 + res.Tt * 1.05); }
    }
    if (logo) { const lw = logoH * logo.naturalWidth / logo.naturalHeight; c.drawImage(logo, cx0 + cw / 2 - lw / 2, logoY, lw, logoH); }
    return { corto };
  }

  function abrirExport(item) {
    const o = { fmt: '16:9', tema: 'marfil' }; const it = { ...item };
    const cv = el('canvas', { class: 'rs-cv', 'aria-label': 'Vista previa de la imagen' }), aviso = el('p', { class: 'rs-warn', hidden: true }, 'El texto es largo: se reduce al mínimo y se corta. Acórtalo en la caja de abajo para que respire mejor.');
    let foto = null, logo = null, n = 0;
    const redibuja = async () => {
      const mi = ++n; await Promise.all([document.fonts && document.fonts.load('400 40px Lato'), document.fonts && document.fonts.load('700 40px Georgia')].filter(Boolean)).catch(() => { });
      const T = TEMAS[o.tema];
      if (it.foto && !foto) foto = await cargaImg(it.foto, true);
      logo = await cargaImg(T.logo, false);
      if (mi !== n) return; const r = dibujar(cv, it, o, foto, logo); aviso.hidden = !r.corto;
    };
    const fm = el('div', { class: 'rs-opt' }); const tm = el('div', { class: 'rs-opt' });
    const pintaOpt = () => {
      fm.textContent = ''; tm.textContent = '';
      Object.keys(FORMATOS).forEach(k => fm.append(el('button', { type: 'button', class: 'rs-f', 'aria-pressed': String(o.fmt === k), onclick: () => { o.fmt = k; pintaOpt(); redibuja(); } }, FORMATOS[k][2])));
      Object.keys(TEMAS).forEach(k => tm.append(el('button', { type: 'button', class: 'rs-f', 'aria-pressed': String(o.tema === k), onclick: () => { o.tema = k; pintaOpt(); redibuja(); } }, TEMAS[k].n)));
    };
    pintaOpt();
    const ta = el('textarea', { rows: '4', maxlength: '1500', 'aria-label': 'Texto de la imagen' }); ta.value = it.texto; let t0; ta.addEventListener('input', () => { it.texto = ta.value; clearTimeout(t0); t0 = setTimeout(redibuja, 200); });
    const cerrar = () => { m.remove(); document.removeEventListener('keydown', esc1); }; const esc1 = e => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', esc1);
    const bajar = async () => {
      await redibuja();
      try {
        cv.toBlob(b => { if (!b) { ctx.toast('No se pudo crear la imagen'); return; } const a = el('a', { href: URL.createObjectURL(b), download: 'resena-' + (it.nombre || 'cliente').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + o.fmt.replace(':', 'x') + '.png' }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); ctx.toast('Imagen descargada (fondo transparente)'); }, 'image/png');
      } catch (e) { ctx.toast('El navegador no dejó exportar con esta foto. Súbela de nuevo desde aquí.'); }
    };
    const m = el('div', { class: 'rs-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Exportar reseña como imagen' },
      el('div', { class: 'rs-mc' }, el('div', { class: 'rs-mh' }, el('h3', {}, ico('download'), ' Exportar reseña como imagen'), btn('', 'x', cerrar)),
        el('div', { class: 'rs-mb' }, el('div', { class: 'rs-pv' }, cv, aviso),
          el('div', { class: 'rs-ctl' }, el('h4', {}, 'Formato'), fm, el('h4', {}, 'Diseño'), tm, el('h4', {}, 'Texto de la imagen'), ta,
            el('small', { class: 'muted' }, 'Este texto solo cambia en la imagen, no en la reseña. El fondo queda transparente: úsalo sobre tu historia o pídeme que lo animemos.'),
            el('div', { class: 'acts' }, btn('Descargar PNG', 'download', bajar, 'btn-gold'), btn('Cerrar', null, cerrar))))));
    m.addEventListener('click', e => { if (e.target === m) cerrar(); });
    document.body.append(m); redibuja();
  }

  /* ---------- estilos ---------- */
  function css() {
    if (css1) return; css1 = true;
    document.head.append(el('style', {}, `
.rs-i{display:inline-block;vertical-align:-.2em}.rs-i svg{width:1.15em;height:1.15em}
.rs-cab{display:flex;gap:18px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;margin-bottom:16px}
.rs-cab h2{margin:0 0 6px}.rs-kp{display:grid;grid-template-columns:auto auto;gap:0 10px;align-items:baseline;text-align:left;background:var(--soft);padding:12px 18px;border-radius:14px;border:1px solid var(--line)}
.rs-kp b{font-size:1.5rem;color:var(--oro-t);text-align:right}.rs-kp small{color:var(--muted)}
.rs-sec{margin-bottom:16px}.rs-sec h3{margin:0 0 6px;display:flex;align-items:center;gap:8px}
.rs-aviso{border-color:rgba(217,90,106,.5)}
.rs-new{display:flex;gap:10px;margin:14px 0;flex-wrap:wrap}.rs-new input{flex:1;min-width:220px}
.rs-links{display:grid;gap:10px}
.rs-link{display:grid;grid-template-columns:1fr auto;gap:8px 12px;align-items:center;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--soft)}
.rs-mej{margin:14px 0 0;padding:12px 14px;border-radius:14px;background:rgba(139,26,42,.07);border:1px solid rgba(139,26,42,.28)}.rs-mej p{margin:6px 0 0;white-space:pre-wrap}
.rs-link.nuevo{border-color:var(--oro);box-shadow:0 0 0 3px rgba(184,160,106,.25)}
.rs-lt{display:grid;gap:2px}.rs-link .acts{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px}
.rs-aj{margin-top:16px;border-top:1px solid var(--line);padding-top:12px}.rs-aj summary{cursor:pointer;font-weight:700;display:flex;align-items:center;gap:8px}
.rs-g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.rs-fl,.rs-opt{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.rs-f{padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:var(--soft);color:var(--text);cursor:pointer;font:inherit;font-size:.88rem}
.rs-f[aria-pressed="true"]{background:var(--oro);border-color:var(--oro);color:#252528;font-weight:700}
.rs-nv{top:4px;right:4px;font-size:.62rem;background:var(--borgona);color:#fff;padding:1px 6px;border-radius:99px;letter-spacing:.06em}
.rs-ed{margin-top:18px;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--soft)}
.rs-ed h3{margin:0}
.rs-cols{display:grid;grid-template-columns:minmax(240px,300px) 1fr;gap:22px;margin-top:14px}
@media(max-width:760px){.rs-cols{grid-template-columns:1fr}}
.rs-foto h4,.rs-ctl h4{margin:0 0 8px;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.rs-ctl h4{margin-top:16px}
.rs-encw{display:grid;gap:12px;justify-items:center;margin-bottom:10px}
.rs-enc{border-radius:50%;background:#2c2c30 center/cover no-repeat;border:4px solid var(--oro);box-shadow:0 14px 30px -12px rgba(0,0,0,.5);cursor:grab;touch-action:none;position:relative}
.rs-enc.mov{cursor:grabbing}.rs-enc::after{content:"";position:absolute;inset:-14px;border-radius:50%;border:2px dashed rgba(184,160,106,.6);pointer-events:none}
.rs-encc{display:grid;gap:8px;width:100%}.rs-encc label{display:grid;gap:4px;font-size:.82rem;color:var(--muted)}.rs-encc input{width:100%}
.rs-encc .acts{display:flex;gap:6px;flex-wrap:wrap}
.rs-campos .field:first-child{margin-top:0}
.rs-est{display:flex;gap:4px}.rs-star{border:0;background:none;font-size:2rem;line-height:1;color:var(--line);cursor:pointer;padding:0 2px;transition:transform .15s}.rs-star.on{color:var(--oro)}.rs-star:hover{transform:scale(1.15)}
.rs-pub,.rs-ed .acts{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px}.rs-sp{flex:1}
.rs-orig{margin-top:12px}.rs-orig p{white-space:pre-wrap;margin:8px 0}
.rs-chk{display:flex;align-items:center;gap:8px;font-size:.9rem}
.rs-wg{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;margin-top:12px}
.rs-w{display:grid;gap:6px;justify-items:center;text-align:center;padding:14px 10px;border-radius:16px;border:1px solid var(--line);background:var(--soft)}
.rs-w.vacio{opacity:.6;border-style:dashed}
.rs-ph{width:96px;height:96px;border-radius:50%;background:#2c2c30 center/cover no-repeat;border:3px solid var(--oro);display:grid;place-items:center;color:var(--oro);box-shadow:0 10px 20px -10px rgba(0,0,0,.5)}
.rs-wl{color:var(--muted)}.rs-wst{color:var(--oro-t);letter-spacing:.1em}.rs-w .acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.rs-modal{position:fixed;inset:0;z-index:300;background:rgba(15,15,17,.72);display:grid;place-items:center;padding:14px;overflow:auto}
.rs-mc{width:min(1180px,100%);background:var(--surface);color:var(--text);border-radius:20px;border:1px solid var(--line);box-shadow:0 40px 80px -20px rgba(0,0,0,.7);max-height:96vh;overflow:auto}
.rs-mh{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--surface);z-index:2}.rs-mh h3{margin:0;display:flex;gap:8px;align-items:center}
.rs-mb{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:20px;padding:18px}
@media(max-width:860px){.rs-mb{grid-template-columns:1fr}}
.rs-pv{display:grid;gap:10px;align-content:start}
.rs-cv{width:100%;height:auto;border-radius:12px;border:1px solid var(--line);background:repeating-conic-gradient(#d9d6cf 0 25%,#f1efe9 0 50%) 0 0/22px 22px}
.rs-warn{color:var(--red-t);font-size:.9rem;margin:0}
.rs-ctl{display:grid;align-content:start;gap:2px}.rs-ctl textarea{width:100%}
`));
  }

  window.FaroResenas = {
    encuadre, aplicarFondo, natSize,
    iniciar(el_, c) {
      host = el_; ctx = c; css();
      if (!started || S.falta) { started = true; cargar(); } else { cargar(); }
    },
    async contar(c) {
      try { ctx = ctx || c; const r = await c.api('/rest/v1/rs_resenas?select=id&estado=eq.nueva'); if (!r.ok) return; const n = (await r.json()).length, b = $('#nrsn'); if (b) { b.textContent = n; b.hidden = !n; } } catch (e) { }
    }
  };
})();
