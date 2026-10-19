/* Faro Workspace · Correo de la empresa (info@, producciones@ y academia@).
 * Se conecta al servicio "faro-correo" (Cloudflare Worker, carpeta worker-correo/), que lee y envía por el correo de iCloud+.
 * Si el servicio todavía no está publicado, muestra correos de ejemplo y un aviso con el motivo.
 * Usa los colores del Workspace (variables CSS), así que cambia con el tema de cada persona.
 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IC = {
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/>',
    sent: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    draft: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/>',
    archive: '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    unread: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    reply: '<path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
    fwd: '<path d="m15 14 5-5-5-5"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    min: '<path d="M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    clip: '<path d="m21 11-9 9a5.5 5.5 0 0 1-8-8l9-9a3.7 3.7 0 0 1 5.3 5.3l-9 9a1.8 1.8 0 0 1-2.6-2.6l8.5-8.5"/>'
  };
  const ico = k => '<svg class="cor-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + '</svg>';
  const LABELS = { clientes: { n: 'Clientes', c: '#8B1A2A' }, agencias: { n: 'Agencias', c: '#3A3A3A' }, academy: { n: 'Academy', c: '#5E9E6B' }, reservas: { n: 'Reservas', c: '#B8A06A' } };
  const COLS = ['#8B1A2A', '#5E9E6B', '#3A3A3A', '#B8A06A', '#8C4A3B', '#4A6670'];
  const FOLDERS = [['inbox', 'Recibidos'], ['starred', 'Destacados'], ['sent', 'Enviados'], ['drafts', 'Borradores'], ['archive', 'Archivados'], ['trash', 'Papelera']];
  const FICON = { inbox: 'inbox', starred: 'star', sent: 'sent', drafts: 'draft', archive: 'archive', trash: 'trash' };
  const ACCTS = { info: 'info@farostudios.net', producciones: 'producciones@farostudios.net', academia: 'academia@farostudios.net' };

  /* correos de ejemplo (en la versión real vienen del buzón) */
  let mails = [
    { id: 1, f: 'inbox', acc: 'producciones', l: 'agencias', un: true, st: true, t: '10:42', name: 'Lucía Méndez', em: 'lucia@agenciaplanta.com', subj: 'Correcciones aftermovie · versión 2', msgs: [{ n: 'Lucía Méndez', e: 'lucia@agenciaplanta.com', t: '10:42', x: 'Hola David,\n\nVimos la v2 con el cliente y quedó muy bien. Solo tenemos tres ajustes:\n\n1. Subir un poco el audio de la entrevista en el minuto 0:48.\n2. Cambiar el rótulo final por el logo nuevo (ya lo subimos al portal).\n3. Quitar la toma de la entrada.\n\nSi puedes entregarlo mañana en la tarde, perfecto.\n\nGracias,\nLucía' }] },
    { id: 2, f: 'inbox', acc: 'producciones', l: 'reservas', un: true, st: false, t: '9:15', name: 'Carlos Orantes', em: 'carlos.orantes@gmail.com', subj: 'Reserva sesión de graduación · voucher adjunto', msgs: [{ n: 'Carlos Orantes', e: 'carlos.orantes@gmail.com', t: '9:15', x: 'Buenos días,\n\nYa realicé la transferencia del adelanto para la sesión de graduación del 24 de noviembre. Subí el voucher en la página de reservas, pero lo dejo también por aquí por si acaso.\n\nQuedo atento a la confirmación.\n\nSaludos,\nCarlos' }] },
    { id: 3, f: 'inbox', acc: 'info', l: 'academy', un: true, st: false, t: 'Ayer', name: 'Ana Lucía Pérez', em: 'ana.perez@correo.com', subj: 'Horario de clases de inglés para mi hijo', msgs: [{ n: 'Ana Lucía Pérez', e: 'ana.perez@correo.com', t: 'Ayer 18:20', x: 'Buenas tardes,\n\nMi hijo tiene 9 años y queremos empezar clases de inglés. ¿Qué horarios tienen disponibles entre semana por la tarde? También quisiera saber el costo mensual.\n\nMuchas gracias.' }] },
    { id: 4, f: 'inbox', acc: 'producciones', l: 'clientes', un: false, st: true, t: 'Ayer', name: 'Maxi Despensa', em: 'comunicacion@maxidespensa.com', subj: 'Gracias por la cobertura del evento', msgs: [{ n: 'Maxi Despensa', e: 'comunicacion@maxidespensa.com', t: 'Ayer 11:05', x: 'Hola equipo Faro,\n\nQueríamos agradecerles por la entrega de fotos el mismo día. Fue de gran ayuda para publicar durante la caravana. Nos encantó el aftermovie.\n\nSaludos cordiales.' }, { n: 'Tú', e: 'producciones@farostudios.net', t: 'Ayer 12:30', x: '¡Mil gracias a ustedes! Fue un gusto ser parte de la caravana. Cualquier cosa que necesiten, aquí estamos.\n\nDavid · Faro Studios', me: true }] },
    { id: 5, f: 'inbox', acc: 'info', l: 'clientes', un: false, st: false, t: '9 oct', name: 'Mariela Castillo', em: 'mariela.c@outlook.com', subj: 'Cotización boda 2027', msgs: [{ n: 'Mariela Castillo', e: 'mariela.c@outlook.com', t: '9 oct', x: 'Hola, nos casamos en marzo y queremos foto y video. ¿Me pueden enviar la cotización con los paquetes disponibles?' }] },
    { id: 6, f: 'inbox', acc: 'info', l: '', un: false, st: false, t: '8 oct', name: 'Porkbun', em: 'support@porkbun.com', subj: 'Tu dominio farostudios.net se renueva pronto', msgs: [{ n: 'Porkbun', e: 'support@porkbun.com', t: '8 oct', x: 'Este es un recordatorio de la renovación de tu dominio. Puedes revisar los detalles desde tu cuenta.' }] },
    { id: 7, f: 'sent', acc: 'info', l: 'clientes', un: false, st: false, t: '7 oct', name: 'Para: Mariela Castillo', em: 'mariela.c@outlook.com', subj: 'Re: Cotización boda 2027', msgs: [{ n: 'Tú', e: 'info@farostudios.net', t: '7 oct', x: 'Hola Mariela, ¡felicidades! Con gusto te envío los paquetes. Te los comparto en un PDF en el siguiente correo.', me: true }] },
    { id: 8, f: 'drafts', acc: 'info', l: '', un: false, st: false, t: '6 oct', name: 'Borrador', em: '', subj: 'Propuesta jornada de capacitación para iglesias', msgs: [{ n: 'Tú', e: 'info@farostudios.net', t: '6 oct', x: 'Hola pastor, le escribo para compartirle una propuesta de capacitación gratuita de sonido en vivo…', me: true }] }
  ];
  let folder = 'inbox', label = null, openId = null, query = '', acc = null, root = null, listo = false;
  const col = s => COLS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLS.length];
  const ini = s => s.replace(/^Para: /, '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const CSS = `
.cor{--cor-r:20px}
.cor-aviso{display:flex;gap:10px;align-items:center;background:var(--soft);border:1px dashed var(--line);border-radius:14px;padding:10px 16px;margin-bottom:14px;color:var(--muted);font-size:.95rem}
.cor-i{width:20px;height:20px;flex:none}
.cor-bar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.cor-bar .btn{font-size:1rem}
.cor-q{flex:1;min-width:200px;max-width:560px;display:flex;align-items:center;gap:10px;background:var(--input);border:1.5px solid var(--line);border-radius:14px;padding:0 14px;height:46px;color:var(--text)}
.cor-q input{flex:1;background:none;border:0;outline:0;color:inherit;font:inherit;font-size:1rem;min-width:0}
.cor-grid{display:grid;grid-template-columns:220px minmax(280px,360px) minmax(0,1fr);gap:16px;align-items:start}
.cor-side,.cor-list,.cor-read{background:var(--surface);border:1px solid var(--line);border-radius:var(--cor-r);box-shadow:var(--shadow)}
.cor-side{padding:10px;position:sticky;top:78px}
.cor-n{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;background:none;color:var(--text);font:inherit;font-size:1rem;border-radius:12px;padding:10px 12px;cursor:pointer;transition:background .15s}
.cor-n:hover{background:var(--soft)}
.cor-n.on{background:linear-gradient(90deg,color-mix(in srgb,var(--oro) 30%,transparent),color-mix(in srgb,var(--oro) 7%,transparent));box-shadow:inset 3px 0 0 var(--oro);font-weight:700}
.cor-n .cnt{margin-left:auto;min-width:22px;padding:0 7px;border-radius:99px;background:var(--borgona);color:#fff;font-size:.8rem;text-align:center;line-height:1.55}
.cor-sec{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:14px 12px 4px}
.cor-dot{width:12px;height:12px;border-radius:50%;flex:none;margin:0 4px}
.cor-list{overflow:hidden}
.cor-lh{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--line);font-weight:700}
.cor-lh span{font-weight:400;color:var(--muted);font-size:.9rem}
.cor-row{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:2px 14px;padding:14px 16px;border-bottom:1px solid var(--line);cursor:pointer;position:relative;transition:background .12s}
.cor-row:last-child{border-bottom:0}
.cor-row:hover{background:var(--soft)}
.cor-row.sel{background:var(--soft);box-shadow:inset 3px 0 0 var(--oro)}
.cor-av{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;flex:none;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.cor-row .cor-av{grid-row:1/4}
.cor-row .q,.cor-row .a,.cor-row .p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cor-row .a{font-size:.95rem}.cor-row .p{font-size:.9rem;color:var(--muted)}
.cor-row .h{font-size:.82rem;color:var(--muted);text-align:right}
.cor-row.un .q,.cor-row.un .a{font-weight:700}
.cor-row.un .h{color:var(--oro-t);font-weight:700}
.cor-row.un::after{content:"";position:absolute;left:5px;top:50%;width:8px;height:8px;margin-top:-4px;border-radius:50%;background:var(--oro)}
.cor-star{grid-column:3;grid-row:2;justify-self:end;width:30px;height:30px;display:grid;place-items:center;border:0;background:none;color:var(--muted);border-radius:8px;cursor:pointer}
.cor-star:hover{background:var(--line)}
.cor-star.on{color:var(--oro)}.cor-star.on svg{fill:var(--oro)}
.cor-tag{display:inline-block;font-size:.72rem;padding:1px 9px;border-radius:99px;color:#fff;margin-left:8px;vertical-align:middle;font-weight:700}
.cor-vacio{padding:50px 20px;text-align:center;color:var(--muted)}
.cor-vacio svg{width:48px;height:48px;color:var(--oro);margin-bottom:8px}
.cor-read{padding:22px 24px;min-height:340px}
.cor-tools{display:flex;gap:4px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.cor-ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;border:0;background:none;color:var(--text);cursor:pointer;transition:background .15s}
.cor-ic:hover{background:var(--soft)}
.cor-ic.on{color:var(--oro)}.cor-ic.on svg{fill:var(--oro)}
.cor-back{display:none}
.cor-read h2{font-size:1.9rem;line-height:1.15;margin:0 0 14px}
.cor-msg{border-top:1px solid var(--line);padding:16px 0}
.cor-msg:first-of-type{border-top:0}
.cor-mh{display:flex;gap:14px;align-items:center;margin-bottom:10px}
.cor-mh b{font-weight:700}.cor-mh small{color:var(--muted);margin-left:6px}
.cor-mh .w{margin-left:auto;color:var(--muted);font-size:.9rem;text-align:right}
.cor-mb{white-space:pre-wrap;line-height:1.7;padding-left:58px}
.cor-resp{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;padding-left:58px}
.cor-bien{display:grid;place-items:center;min-height:300px;text-align:center;color:var(--muted)}
.cor-bien div div{width:96px;height:96px;border-radius:26px;background:var(--soft);display:grid;place-items:center;margin:0 auto 14px;color:var(--oro);transform:rotate(-6deg)}
.cor-bien svg{width:44px;height:44px}
/* redactar */
.cor-comp{position:fixed;right:24px;bottom:0;width:min(560px,calc(100vw - 16px));background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:18px 18px 0 0;box-shadow:0 18px 50px rgba(0,0,0,.4);z-index:1500;display:none;flex-direction:column;max-height:86dvh}
.cor-comp.open{display:flex}
.cor-ch{background:var(--borgona);color:#fff;border-radius:18px 18px 0 0;display:flex;align-items:center;padding:0 6px 0 18px;height:50px;font-weight:700;cursor:pointer}
.cor-ch span{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.cor-ch .cor-ic{color:#fff}.cor-ch .cor-ic:hover{background:rgba(255,255,255,.18)}
.cor-comp.min .cor-cb{display:none}
.cor-cb{display:flex;flex-direction:column;min-height:0;flex:1}
.cor-f{display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--line);padding:0 18px;min-height:46px}
.cor-f label{color:var(--muted);font-size:.9rem;width:56px;flex:none}
.cor-f input,.cor-f select{flex:1;border:0;outline:0;font:inherit;background:none;height:44px;min-width:0;color:inherit}
.cor-f select option{color:#222}
.cor-f .cc{border:0;background:none;color:var(--oro-t);font:inherit;font-weight:700;cursor:pointer;padding:6px 8px;border-radius:8px}
.cor-body{flex:1;min-height:190px;overflow:auto;padding:14px 18px;outline:0;line-height:1.65}
.cor-body:empty::before{content:attr(data-ph);color:var(--muted)}
.cor-cf{display:flex;align-items:center;gap:4px;padding:10px 12px;border-top:1px solid var(--line)}
.cor-err{color:#d6453b;font-size:.9rem;padding:0 18px 8px}
.cor-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);background:var(--text);color:var(--bg);padding:13px 20px;border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.35);display:flex;gap:16px;align-items:center;opacity:0;pointer-events:none;transition:.25s;z-index:1600}
.cor-toast.on{opacity:1;transform:translateX(-50%);pointer-events:auto}
.cor-toast button{border:0;background:none;color:var(--oro);font:inherit;font-weight:700;cursor:pointer}
.cor-aviso{flex-wrap:wrap}
.cor-aviso.ok{border-style:solid;border-color:color-mix(in srgb,var(--oro) 55%,var(--line));color:var(--text)}
.cor-aviso.mal{border-style:solid;border-color:#d6453b;color:var(--text)}
.cor-aviso>span:first-of-type{flex:1;min-width:200px}
.cor-acc{display:flex;gap:8px;flex-wrap:wrap}
.cor-mas{display:block;width:calc(100% - 32px);margin:12px 16px}
.cor-adj{margin:8px 0 0 58px;display:flex;flex-wrap:wrap;gap:8px}
.cor-adj span{display:inline-flex;align-items:center;gap:6px;background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:5px 10px;font-size:.88rem}
.cor-adj svg{width:16px;height:16px}
.cor-nota{margin:10px 0 0 58px;color:var(--muted);font-size:.85rem}
.cor-carga{padding:38px 20px;text-align:center;color:var(--muted)}
.cor-spin{width:26px;height:26px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--oro);margin:0 auto 10px;animation:corg .8s linear infinite}
@keyframes corg{to{transform:rotate(360deg)}}
.cor-row{animation:corin .25s ease both}
@keyframes corin{from{opacity:0;transform:translateY(4px)}}
@media (prefers-reduced-motion:reduce){.cor-row,.cor-spin{animation:none}}
@media (max-width:1100px){.cor-grid{grid-template-columns:200px minmax(0,1fr)}.cor-read{display:none}.cor-grid[data-v="r"] .cor-list{display:none}.cor-grid[data-v="r"] .cor-read{display:block;grid-column:2}.cor-back{display:grid}}
@media (max-width:760px){
  .cor-adj,.cor-nota{margin-left:0}
  .cor-grid{grid-template-columns:1fr}.cor-side{position:static;display:flex;flex-wrap:wrap;gap:4px;align-items:center}
  .cor-side .cor-sec{width:100%;margin:8px 4px 2px}.cor-n{width:auto;padding:8px 12px;border:1px solid var(--line)}
  .cor-grid[data-v="r"] .cor-side{display:none}.cor-grid[data-v="r"] .cor-read{grid-column:1}
  .cor-read{padding:16px 14px}.cor-read h2{font-size:1.5rem}.cor-mb,.cor-resp{padding-left:0}
  .cor-comp{right:0;left:0;width:100%;max-height:100dvh;height:100dvh;border-radius:0}.cor-ch{border-radius:0}
}`;

  function esquema() {
    if ($('#cor-css')) return;
    const s = document.createElement('style'); s.id = 'cor-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function plantilla() {
    root.innerHTML = `<div class="cor">
      <div class="cor-aviso" id="cor-aviso"></div>
      <div class="cor-bar"><button type="button" class="btn btn-gold" id="cor-nuevo">${ico('pen')} Redactar</button>
        <label class="cor-q">${ico('mail')}<input id="cor-q" placeholder="Buscar en el correo de Faro" autocomplete="off"></label></div>
      <div class="cor-grid" id="cor-grid" data-v="l"><aside class="cor-side" id="cor-side"></aside><section class="cor-list" id="cor-list"></section><section class="cor-read" id="cor-read"></section></div>
    </div>
    <div class="cor-comp" id="cor-comp" role="dialog" aria-label="Mensaje nuevo">
      <div class="cor-ch" id="cor-ch"><span id="cor-ct">Mensaje nuevo</span><button type="button" class="cor-ic" id="cor-min" aria-label="Minimizar">${ico('min')}</button><button type="button" class="cor-ic" id="cor-x" aria-label="Cerrar">${ico('x')}</button></div>
      <div class="cor-cb">
        <div class="cor-f"><label>De</label><select id="cor-de"><option value="info">${ACCTS.info}</option><option value="producciones">${ACCTS.producciones}</option><option value="academia">${ACCTS.academia}</option></select></div>
        <div class="cor-f"><label>Para</label><input id="cor-para" type="email" multiple placeholder="correo@ejemplo.com"><button type="button" class="cc" id="cor-ccb">Cc</button></div>
        <div class="cor-f" id="cor-ccr" style="display:none"><label>Cc</label><input id="cor-cc" placeholder="correo@ejemplo.com"></div>
        <div class="cor-f"><label>Asunto</label><input id="cor-asu" placeholder="Asunto"></div>
        <div class="cor-body" id="cor-cuerpo" contenteditable="true" data-ph="Escribe tu mensaje…"></div>
        <div class="cor-err" id="cor-err"></div>
        <div class="cor-cf"><button type="button" class="btn btn-gold" id="cor-send">${ico('sent')} Enviar</button>
          <button type="button" class="cor-ic" data-cmd="bold" title="Negrita"><b>B</b></button><button type="button" class="cor-ic" data-cmd="italic" title="Cursiva"><i>I</i></button><button type="button" class="cor-ic" data-cmd="underline" title="Subrayado"><u>U</u></button>
          <button type="button" class="cor-ic" data-cmd="insertUnorderedList" title="Lista">${ico('list')}</button><button type="button" class="cor-ic" id="cor-link" title="Enlace">${ico('link')}</button>
          <span style="flex:1"></span><button type="button" class="cor-ic" id="cor-del" title="Descartar">${ico('trash')}</button></div>
      </div></div>
    <div class="cor-toast" id="cor-toast"><span id="cor-tt"></span><button type="button" id="cor-tb" style="display:none">Deshacer</button></div>`;
  }

  /* ---------- conexión con el servicio de correo (Cloudflare Worker "faro-correo") ---------- */
  const MUESTRA = mails.slice();
  const API_LS = 'faro_correo_api', API_DEF = 'https://faro-correo.jorgedamartinez20.workers.dev', BORR_LS = 'faro_correo_borradores';
  const TZ = 'America/Guatemala';
  const CTA_COL = { info: '#8B1A2A', producciones: '#3A3A3A', academia: '#5E9E6B' };
  const CTA_N = { info: 'info@', producciones: 'producciones@', academia: 'academia@' };
  let real = false, estado = { t: 'cargando' }, cargando = false, errLista = '', hayMas = false, pagina = 0, peticion = 0, ctx = null, sinLeerCta = {}, temporizador = null, cfg = { token: null, toast: null };
  const apiBase = () => { try { return (localStorage.getItem(API_LS) || API_DEF).replace(/\/+$/, ''); } catch (e) { return API_DEF; } };
  const falla = (m, t) => { const e = new Error(m); e.tipo = t; return e; };
  async function llamar(ruta, cuerpo) {
    const tok = cfg.token ? await cfg.token() : null;
    if (!tok) throw falla('Vuelve a iniciar sesión en el Workspace para usar el correo.', 'sesion');
    const c = new AbortController(), t = setTimeout(() => c.abort(), 45000);
    let r;
    try { r = await fetch(apiBase() + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(cuerpo || {}), signal: c.signal }); }
    catch (e) { throw falla('No se pudo comunicar con el servicio de correo. Revisa que el Worker “faro-correo” esté publicado en Cloudflare y que la dirección sea correcta.', 'red'); }
    finally { clearTimeout(t); }
    let j = {}; try { j = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) throw falla(j.error || ('Error ' + r.status), r.status === 401 ? 'permiso' : r.status === 503 ? 'secretos' : 'srv');
    return j;
  }
  const dia = d => d.toLocaleDateString('en-CA', { timeZone: TZ });
  function fechaCorta(iso) {
    if (!iso) return '';
    const d = new Date(iso), hoy = new Date(), dd = dia(d);
    if (dd === dia(hoy)) return d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
    if (dd === dia(new Date(hoy - 864e5))) return 'Ayer';
    const mismo = dd.slice(0, 4) === dia(hoy).slice(0, 4);
    return d.toLocaleDateString('es-GT', mismo ? { day: 'numeric', month: 'short', timeZone: TZ } : { day: 'numeric', month: 'short', year: '2-digit', timeZone: TZ }).replace('.', '');
  }
  const fechaLarga = iso => iso ? new Date(iso).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }) : '';
  const tam = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  function mapear(x) {
    const sal = x.carpeta === 'sent', p0 = (x.para && x.para[0]) || {};
    return { id: x.uid, uid: x.uid, f: x.carpeta, acc: x.cuenta || '', l: '', un: !x.leido, st: !!x.destacado, t: fechaCorta(x.fecha),
      name: sal ? 'Para: ' + (p0.nombre || p0.correo || '—') : (x.de.nombre || x.de.correo || '—'), em: sal ? (p0.correo || '') : (x.de.correo || ''), subj: x.asunto, msgs: null, adj: [], idm: '', refs: '', cc: [] };
  }
  const leerBorr = () => { try { return JSON.parse(localStorage.getItem(BORR_LS) || '[]'); } catch (e) { return []; } };
  const guardarBorr = a => { try { localStorage.setItem(BORR_LS, JSON.stringify(a.slice(0, 50))); } catch (e) { /* sin espacio */ } };
  const ajusta = (delta, cuenta) => { for (const k of ['', cuenta]) if (k !== undefined && sinLeerCta[k] !== undefined) sinLeerCta[k] = Math.max(0, sinLeerCta[k] + delta); };

  const total = k => real ? (k === 'inbox' ? (sinLeerCta[acc || ''] || 0) : k === 'drafts' ? leerBorr().length : 0)
    : mails.filter(m => (!acc || m.acc === acc) && m.f === k && (k === 'inbox' ? m.un : true)).length;
  function lateral() {
    const cnt = a => real ? (sinLeerCta[a || ''] || 0) : mails.filter(m => (!a || m.acc === a) && m.f === 'inbox' && m.un).length;
    $('#cor-side').innerHTML =
      FOLDERS.map(([k, n]) => { const c = (k === 'inbox' || k === 'drafts') ? total(k) : 0; return `<button type="button" class="cor-n ${!label && folder === k ? 'on' : ''}" data-f="${k}">${ico(FICON[k])}${n}${c ? `<span class="cnt">${c}</span>` : ''}</button>`; }).join('') +
      (real ? '' : '<div class="cor-sec">Etiquetas</div>' + Object.entries(LABELS).map(([k, v]) => `<button type="button" class="cor-n ${label === k ? 'on' : ''}" data-l="${k}"><span class="cor-dot" style="background:${v.c}"></span>${v.n}</button>`).join('')) +
      '<div class="cor-sec">Cuentas</div>' +
      [[null, 'Todas'], ['info', 'info@'], ['producciones', 'producciones@'], ['academia', 'academia@']].map(([k, n]) => `<button type="button" class="cor-n ${acc === k ? 'on' : ''}" data-acc="${k || ''}">${ico('mail')}${n}${cnt(k) ? `<span class="cnt">${cnt(k)}</span>` : ''}</button>`).join('');
  }
  function visibles() {
    if (real) return mails;
    let r = mails.filter(m => !acc || m.acc === acc).filter(m => label ? (m.l === label && m.f !== 'trash') : folder === 'starred' ? (m.st && m.f !== 'trash') : m.f === folder);
    if (query) { const q = query.toLowerCase(); r = mails.filter(m => (!acc || m.acc === acc) && m.f !== 'trash' && (m.subj + m.name + m.em + m.msgs.map(x => x.x).join(' ')).toLowerCase().includes(q)); }
    return r;
  }
  function lista() {
    const r = visibles();
    const t = query ? 'Resultados para “' + esc(query) + '”' : label ? LABELS[label].n : FOLDERS.find(f => f[0] === folder)[1];
    const cuenta = r.length + (hayMas ? '+' : '');
    let h = `<div class="cor-lh">${t}<span>${cargando ? 'Cargando…' : cuenta + ' ' + (r.length === 1 ? 'mensaje' : 'mensajes')}</span></div>`;
    if (cargando && !r.length) h += '<div class="cor-carga"><div class="cor-spin"></div>Buscando tus correos…</div>';
    else if (errLista) h += `<div class="cor-vacio">${ico('mail')}<div>${esc(errLista)}</div><p><button type="button" class="btn btn-ghost btn-sm" data-a="recargar">Reintentar</button></p></div>`;
    else if (!r.length) h += `<div class="cor-vacio">${ico('mail')}<div>Aquí no hay nada por ahora.</div></div>`;
    h += r.map(m => {
      const last = m.msgs && m.msgs.length ? m.msgs[m.msgs.length - 1] : null;
      const tg = real ? (m.acc ? `<span class="cor-tag" style="background:${CTA_COL[m.acc] || '#3A3A3A'}">${CTA_N[m.acc] || ''}</span>` : '') : (m.l ? `<span class="cor-tag" style="background:${LABELS[m.l].c}">${LABELS[m.l].n}</span>` : '');
      const prev = real ? (m.acc && m.f !== 'sent' ? 'para ' + ACCTS[m.acc] : '') : last.x.replace(/\s+/g, ' ').slice(0, 90);
      return `<div class="cor-row ${m.un ? 'un' : ''} ${m.id === openId ? 'sel' : ''}" data-id="${m.id}"><div class="cor-av" style="background:${col(m.name)}">${esc(ini(m.name))}</div>
        <div class="q">${esc(m.name)}${tg}</div><div class="h">${esc(m.t)}</div><div class="a">${esc(m.subj)}</div>
        <button type="button" class="cor-star ${m.st ? 'on' : ''}" data-star="${m.id}" aria-label="Destacar">${ico('star')}</button><div class="p">${esc(prev)}</div></div>`;
    }).join('');
    if (real && hayMas && !cargando) h += '<button type="button" class="btn btn-ghost cor-mas" data-a="mas">Cargar más correos</button>';
    $('#cor-list').innerHTML = h;
  }
  function lector() {
    const m = mails.find(x => x.id === openId);
    if (!m) { $('#cor-read').innerHTML = `<div class="cor-bien"><div><div>${ico('mail')}</div><b style="color:var(--text);font-size:1.15rem">Selecciona un correo</b><p>o redacta uno nuevo con el botón Redactar.</p></div></div>`; return; }
    const tools = `<div class="cor-tools"><button type="button" class="cor-ic cor-back" data-a="back" title="Volver">${ico('back')}</button>
      <button type="button" class="cor-ic" data-a="archive" title="Archivar">${ico('archive')}</button><button type="button" class="cor-ic" data-a="trash" title="Eliminar">${ico('trash')}</button>
      <button type="button" class="cor-ic" data-a="unread" title="Marcar como no leído">${ico('unread')}</button><button type="button" class="cor-ic ${m.st ? 'on' : ''}" data-a="star" title="Destacar">${ico('star')}</button></div>`;
    const tag = real ? (m.acc ? `<span class="cor-tag" style="background:${CTA_COL[m.acc] || '#3A3A3A'}">${CTA_N[m.acc]}</span>` : '') : (m.l ? `<span class="cor-tag" style="background:${LABELS[m.l].c}">${LABELS[m.l].n}</span>` : '');
    const cab = `${tools}<h2>${esc(m.subj)}${tag}</h2>`;
    if (m.err) { $('#cor-read').innerHTML = cab + `<div class="cor-vacio"><div>${esc(m.err)}</div><p><button type="button" class="btn btn-ghost btn-sm" data-a="reabrir">Reintentar</button></p></div>`; return; }
    if (m.msgs === null) { $('#cor-read').innerHTML = cab + '<div class="cor-carga"><div class="cor-spin"></div>Abriendo el correo…</div>'; return; }
    const ms = m.msgs.map(x => `<div class="cor-msg"><div class="cor-mh"><div class="cor-av" style="background:${x.me ? 'var(--borgona)' : col(x.n)}">${esc(ini(x.n))}</div>
      <div><b>${esc(x.n)}</b><small>&lt;${esc(x.e)}&gt;</small><div style="font-size:.9rem;color:var(--muted)">para ${x.me ? esc(m.em || '—') : 'mí'}</div></div><div class="w">${esc(x.t)}</div></div><div class="cor-mb">${esc(x.x)}</div></div>`).join('');
    const adj = (m.adj && m.adj.length) ? `<div class="cor-adj">${m.adj.map(a => `<span>${ico('clip')}${esc(a.nombre)} · ${tam(a.tam)}</span>`).join('')}</div><div class="cor-nota">Los adjuntos se descargan desde Apple Mail por ahora.</div>` : '';
    const rec = m.recortado ? '<div class="cor-nota">Este correo es muy grande: aquí se muestra solo el inicio.</div>' : '';
    $('#cor-read').innerHTML = cab + ms + adj + rec + `<div class="cor-resp"><button type="button" class="btn btn-gold" data-a="reply">${ico('reply')} Responder</button><button type="button" class="btn btn-ghost" data-a="fwd">${ico('fwd')} Reenviar</button></div>`;
  }
  function pintar() { lateral(); lista(); lector(); avisoEstado(); const g = $('#cor-grid'); if (g) g.dataset.v = openId ? 'r' : 'l'; }

  function avisoEstado() {
    const a = $('#cor-aviso'); if (!a) return;
    const iconos = ico('mail');
    if (estado.t === 'ok') {
      a.className = 'cor-aviso ok';
      a.innerHTML = `${iconos}<span>Conectado al correo de iCloud · info@, producciones@ y academia@${estado.envio ? ' · envío verificado' : ''}</span><span class="cor-acc"><button type="button" class="btn btn-ghost btn-sm" data-a="recargar">Actualizar</button><button type="button" class="btn btn-ghost btn-sm" data-a="probar">Probar envío</button></span>`;
    } else if (estado.t === 'cargando') {
      a.className = 'cor-aviso'; a.innerHTML = `${iconos}<span>Conectando con el correo de iCloud…</span>`;
    } else {
      a.className = 'cor-aviso mal';
      a.innerHTML = `${iconos}<span><b>Correo sin conectar.</b> ${esc(estado.m || '')} Mientras tanto ves correos de ejemplo.</span><span class="cor-acc"><button type="button" class="btn btn-gold btn-sm" data-a="conectar">Reintentar</button><button type="button" class="btn btn-ghost btn-sm" data-a="direccion">Dirección del servicio</button></span>`;
    }
  }
  async function conectar(smtp) {
    estado = { t: 'cargando' }; avisoEstado();
    try {
      const j = await llamar('/correo/estado', smtp ? { smtp: true } : {});
      real = true; sinLeerCta = { '': j.sinLeer || 0 }; estado = { t: 'ok', envio: !!j.envio };
      mails = []; openId = null; folder = 'inbox'; label = null; query = ''; acc = null; const q = $('#cor-q'); if (q) q.value = '';
      await cargarLista();
      if (smtp) aviso(j.envio ? 'El envío funciona: iCloud aceptó la conexión' : 'No se pudo verificar el envío');
    } catch (e) {
      real = false; estado = { t: 'error', m: e.message, tipo: e.tipo };
      if (!mails.length || mails.some(m => m.uid)) mails = MUESTRA.slice();
      pintar();
    }
  }
  async function cargarLista(mas, silencioso) {
    if (!real) { pintar(); return; }
    if (folder === 'drafts') { mails = leerBorr(); hayMas = false; errLista = ''; cargando = false; pintar(); return; }
    const n = ++peticion;
    if (!mas && !silencioso) { cargando = true; errLista = ''; mails = []; hayMas = false; pintar(); }
    else if (mas) { cargando = true; pintar(); }
    try {
      const j = await llamar('/correo/lista', { carpeta: folder, cuenta: acc || '', q: query, pagina: mas ? pagina + 1 : 0 });
      if (n !== peticion) return;
      const nuevos = j.mensajes.map(mapear);
      if (mas) { pagina = j.pagina; mails = mails.concat(nuevos); }
      else {
        for (const x of nuevos) { const v = mails.find(o => o.id === x.id && o.msgs); if (v) { x.msgs = v.msgs; x.adj = v.adj; x.idm = v.idm; x.refs = v.refs; x.cc = v.cc; x.recortado = v.recortado; } }
        mails = nuevos; pagina = 0;
      }
      hayMas = j.hayMas; errLista = '';
      if (j.sinLeer != null && !query) sinLeerCta[acc || ''] = j.sinLeer;
    } catch (e) { if (n !== peticion) return; if (!silencioso) { errLista = e.message; mails = []; } }
    finally { if (n === peticion) { cargando = false; pintar(); } }
  }
  async function abrir(m) {
    openId = m.id;
    if (m.f === 'drafts') {
      guardarBorr(leerBorr().filter(x => x.id !== m.id)); mails = leerBorr(); openId = null;
      abrirRedactar({ para: m.em, acc: m.acc, asu: m.subj === '(sin asunto)' ? '' : m.subj, body: m.msgs[0].x }); pintar(); return;
    }
    if (!real) { m.un = false; pintar(); const r = $('#cor-read'); if (r) r.scrollTop = 0; return; }
    m.err = '';
    if (m.msgs === null) {
      pintar();
      try {
        const j = await llamar('/correo/mensaje', { carpeta: m.f, uid: m.uid });
        m.msgs = [{ n: j.de.nombre || j.de.correo || '—', e: j.de.correo, t: fechaLarga(j.fecha), x: j.cuerpo || '(sin texto)', me: m.f === 'sent' }];
        m.adj = j.adjuntos || []; m.idm = j.idMensaje; m.refs = j.referencias; m.cc = j.cc || []; m.recortado = j.recortado;
        if (!m.acc && j.cuenta) m.acc = j.cuenta;
        if (m.un) { m.un = false; ajusta(-1, m.acc); }
      } catch (e) { m.err = e.message; }
    } else if (m.un) { m.un = false; ajusta(-1, m.acc); llamar('/correo/accion', { carpeta: m.f, uid: m.uid, accion: 'leido' }).catch(() => {}); }
    pintar(); const r = $('#cor-read'); if (r) r.scrollTop = 0;
  }

  function aviso(t, deshacer) {
    $('#cor-tt').textContent = t; const b = $('#cor-tb'); b.style.display = deshacer ? '' : 'none'; b.onclick = () => { deshacer && deshacer(); ocultar(); };
    $('#cor-toast').classList.add('on'); clearTimeout(aviso.h); aviso.h = setTimeout(ocultar, 5000);
  }
  function ocultar() { $('#cor-toast').classList.remove('on'); }

  /* ---------- redactar ---------- */
  function abrirRedactar(o) {
    o = o || {}; ctx = o.ctx || null;
    $('#cor-para').value = o.para || ''; $('#cor-asu').value = o.asu || ''; $('#cor-cc').value = ''; $('#cor-ccr').style.display = 'none'; $('#cor-ccb').style.display = ''; $('#cor-err').textContent = '';
    $('#cor-cuerpo').innerText = o.body || ''; $('#cor-ct').textContent = o.asu || 'Mensaje nuevo'; $('#cor-de').value = o.acc || acc || 'info';
    const c = $('#cor-comp'); c.classList.remove('min'); c.classList.add('open');
    (o.para ? $('#cor-cuerpo') : $('#cor-para')).focus();
  }
  function cerrarRedactar() { $('#cor-comp').classList.remove('open'); }
  function guardarBorrador() {
    const body = $('#cor-cuerpo').innerText.trim(), asu = $('#cor-asu').value.trim();
    if (!body && !asu && !$('#cor-para').value.trim()) return;
    const a = $('#cor-de').value;
    const b = { id: Date.now(), f: 'drafts', acc: a, l: '', un: false, st: false, t: 'Borrador', name: 'Borrador', em: $('#cor-para').value, subj: asu || '(sin asunto)', msgs: [{ n: 'Tú', e: ACCTS[a], t: '', x: body, me: true }] };
    if (real) { guardarBorr([b, ...leerBorr()]); if (folder === 'drafts') mails = leerBorr(); } else mails.unshift(b);
    pintar(); aviso('Borrador guardado en este navegador');
  }
  async function enviar() {
    const para = $('#cor-para').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+/.test(para)) { $('#cor-err').textContent = 'Escribe al menos un correo válido en “Para”.'; $('#cor-para').focus(); return; }
    const a = $('#cor-de').value, asunto = $('#cor-asu').value.trim() || '(sin asunto)', texto = $('#cor-cuerpo').innerText.trim();
    if (!real) {
      const m = { id: Date.now(), f: 'sent', acc: a, l: '', un: false, st: false, t: 'Ahora', name: 'Para: ' + para.split(',')[0].trim(), em: para, subj: asunto, msgs: [{ n: 'Tú', e: ACCTS[a], t: 'Ahora', x: texto, me: true }] };
      mails.unshift(m); cerrarRedactar(); openId = null; pintar();
      aviso('Vista previa: el correo no sale hasta conectar iCloud', () => { mails = mails.filter(x => x.id !== m.id); pintar(); abrirRedactar({ para, asu: m.subj, body: texto }); });
      return;
    }
    if (!texto) { $('#cor-err').textContent = 'El mensaje está vacío.'; return; }
    const btn = $('#cor-send'), html = btn.innerHTML; btn.disabled = true; btn.textContent = 'Enviando…'; $('#cor-err').textContent = '';
    try {
      const j = await llamar('/correo/enviar', { cuenta: a, para, cc: $('#cor-cc').value.trim(), asunto, texto, html: $('#cor-cuerpo').innerHTML, enRespuestaA: ctx ? ctx.id : '', referencias: ctx ? ctx.refs : '' });
      cerrarRedactar(); ctx = null; openId = null;
      aviso(j.guardado ? 'Mensaje enviado' : 'Mensaje enviado (no se pudo guardar la copia en Enviados)');
      if (folder === 'sent') cargarLista(); else pintar();
    } catch (e) { $('#cor-err').textContent = e.message; }
    finally { btn.disabled = false; btn.innerHTML = html; }
  }

  /* ---------- acciones sobre un correo ---------- */
  async function accion(a) {
    const m = mails.find(x => x.id === openId); if (!m) return;
    if (a === 'back') { openId = null; pintar(); return; }
    if (a === 'reabrir') { m.msgs = null; m.err = ''; abrir(m); return; }
    const ult = m.msgs && m.msgs[m.msgs.length - 1];
    if (a === 'reply' && ult) { abrirRedactar({ para: m.em, acc: m.acc, asu: /^Re:/i.test(m.subj) ? m.subj : 'Re: ' + m.subj, body: '\n\n\nEl ' + ult.t + ', ' + ult.n + ' escribió:\n> ' + ult.x.split('\n').join('\n> '), ctx: real && m.idm ? { id: m.idm, refs: m.refs || '' } : null }); return; }
    if (a === 'fwd' && ult) { abrirRedactar({ para: '', acc: m.acc, asu: /^Fwd:/i.test(m.subj) ? m.subj : 'Fwd: ' + m.subj, body: '\n\n---------- Mensaje reenviado ----------\nDe: ' + ult.n + ' <' + ult.e + '>\n\n' + ult.x }); return; }
    if (!real) {
      if (a === 'star') { m.st = !m.st; pintar(); }
      else if (a === 'unread') { m.un = true; openId = null; pintar(); aviso('Marcado como no leído'); }
      else if (a === 'archive' || a === 'trash') { const prev = m.f; m.f = a; openId = null; pintar(); aviso(a === 'archive' ? 'Conversación archivada' : 'Conversación eliminada', () => { m.f = prev; pintar(); }); }
      return;
    }
    if (m.f === 'drafts') return;
    try {
      if (a === 'star') { m.st = !m.st; pintar(); await llamar('/correo/accion', { carpeta: m.f, uid: m.uid, accion: m.st ? 'destacar' : 'quitar_destacado' }); }
      else if (a === 'unread') { await llamar('/correo/accion', { carpeta: m.f, uid: m.uid, accion: 'noleido' }); if (!m.un) ajusta(1, m.acc); m.un = true; openId = null; pintar(); aviso('Marcado como no leído'); }
      else if (a === 'archive' || a === 'trash') {
        await llamar('/correo/accion', { carpeta: m.f, uid: m.uid, accion: a === 'archive' ? 'archivar' : 'papelera' });
        if (m.un) ajusta(-1, m.acc);
        mails = mails.filter(x => x !== m); openId = null; pintar();
        aviso(a === 'archive' ? 'Correo archivado' : (m.f === 'trash' ? 'Correo eliminado para siempre' : 'Correo enviado a la papelera'));
      }
    } catch (e) { if (a === 'star') { m.st = !m.st; pintar(); } aviso(e.message); }
  }
  async function estrella(id) {
    const m = mails.find(x => x.id == id); if (!m) return;
    if (!real || m.f === 'drafts') { m.st = !m.st; pintar(); return; }
    m.st = !m.st; pintar();
    try { await llamar('/correo/accion', { carpeta: m.f, uid: m.uid, accion: m.st ? 'destacar' : 'quitar_destacado' }); } catch (e) { m.st = !m.st; pintar(); aviso(e.message); }
  }

  function enlazar() {
    root.addEventListener('click', e => {
      const t = e.target;
      const ac = t.closest('[data-acc]'); if (ac) { acc = ac.dataset.acc || null; openId = null; cargarLista(); return; }
      const fb = t.closest('[data-f]'); if (fb) { folder = fb.dataset.f; label = null; query = ''; $('#cor-q').value = ''; openId = null; cargarLista(); return; }
      const lb = t.closest('[data-l]'); if (lb) { label = lb.dataset.l; query = ''; $('#cor-q').value = ''; openId = null; pintar(); return; }
      const sb = t.closest('[data-star]'); if (sb) { e.stopPropagation(); estrella(sb.dataset.star); return; }
      const ab = t.closest('[data-a]');
      if (ab) {
        const a = ab.dataset.a;
        if (a === 'recargar') { real ? cargarLista() : conectar(); }
        else if (a === 'mas') cargarLista(true);
        else if (a === 'conectar') conectar();
        else if (a === 'probar') conectar(true);
        else if (a === 'direccion') { const u = prompt('Dirección del servicio de correo (Worker de Cloudflare):', apiBase()); if (u && /^https:\/\/[^\s]+$/.test(u.trim())) { try { localStorage.setItem(API_LS, u.trim().replace(/\/+$/, '')); } catch (x) { /* sin almacenamiento */ } conectar(); } else if (u) aviso('La dirección debe empezar con https://'); }
        else accion(a);
        return;
      }
      const rw = t.closest('.cor-row'); if (rw) { const m = mails.find(x => x.id == rw.dataset.id); if (m) abrir(m); }
    });
    let deb = null;
    $('#cor-q').addEventListener('input', e => { query = e.target.value.trim(); openId = null; clearTimeout(deb); if (real) deb = setTimeout(() => cargarLista(), 450); else pintar(); });
    $('#cor-nuevo').onclick = () => abrirRedactar();
    $('#cor-x').onclick = e => { e.stopPropagation(); guardarBorrador(); cerrarRedactar(); };
    $('#cor-min').onclick = e => { e.stopPropagation(); $('#cor-comp').classList.toggle('min'); };
    $('#cor-ch').onclick = () => $('#cor-comp').classList.toggle('min');
    $('#cor-ccb').onclick = () => { $('#cor-ccr').style.display = 'flex'; $('#cor-ccb').style.display = 'none'; };
    $('#cor-del').onclick = () => { cerrarRedactar(); aviso('Borrador descartado'); };
    $('#cor-send').onclick = enviar;
    $('#cor-link').onclick = () => { const u = prompt('Dirección del enlace (https://…)'); if (u) document.execCommand('createLink', false, u); };
    root.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); document.execCommand(b.dataset.cmd); }));
  }

  window.FaroCorreo = {
    /* se llama cada vez que se abre la pestaña Correo. opciones: { token: async () => sesión, toast } */
    iniciar(el, opciones) {
      esquema();
      if (!el) return;
      if (opciones) cfg = Object.assign(cfg, opciones);
      const nuevo = !listo || root !== el;
      if (nuevo) { root = el; plantilla(); enlazar(); listo = true; }
      pintar();
      if (!real) { if (estado.t !== 'cargando' || nuevo) conectar(); }
      else if (!nuevo && folder === 'inbox' && !query) cargarLista(false, true);
      clearInterval(temporizador);
      temporizador = setInterval(() => { if (real && root && root.isConnected && root.offsetParent !== null && document.visibilityState === 'visible' && folder === 'inbox' && !query && pagina === 0 && !cargando) cargarLista(false, true); }, 90000);
    },
    /* correos nuevos sin leer (para avisos) */
    sinLeer: () => real ? (sinLeerCta[''] || 0) : mails.filter(m => m.f === 'inbox' && m.un).length
  };
})();
