/* Faro · Perfil: avatar y color de cada persona.
 * Lo usan el Workspace (admin.html) y el portal (portal.html).
 *  - Workspace: 10 temas de color (Automático, Marfil, Oscura + 7 paletas) y avatar.
 *  - Portal (docentes, alumnos, padres, clientes): color suave y mate de la barra y avatar.
 * Se guarda en la tabla perfiles_ws (sql/perfil-avatar-tema.sql). Si la tabla no existe, queda
 * solo en el navegador de cada persona y funciona igual.
 * Todo está protegido: si algo falla aquí, el resto de la página sigue funcionando.
 */
(function () {
  'use strict';

  /* ---------- avatares (13 + personaje gris) ---------- */
  let uid = 0;
  function persona(a) {
    const h = a.hair;
    let back = '', front = '', beard = '', gl = '';
    switch (a.style) {
      case 'long': back = `<path d="M30 46Q26 18 50 18Q74 18 70 46L73 84Q50 90 27 84Z" fill="${h}"/>`; front = `<path d="M32 44Q33 25 50 26Q67 25 68 44Q58 33 50 35Q42 33 32 44Z" fill="${h}"/>`; break;
      case 'afro': back = `<circle cx="50" cy="36" r="27" fill="${h}"/>`; front = `<path d="M33 42Q35 28 50 28Q65 28 67 42Q58 35 50 36Q42 35 33 42Z" fill="${h}"/>`; break;
      case 'bun': back = `<circle cx="50" cy="17" r="9" fill="${h}"/>`; front = `<path d="M32 44Q31 24 50 24Q69 24 68 44Q58 34 50 36Q42 34 32 44Z" fill="${h}"/>`; break;
      case 'bob': back = `<path d="M31 46Q28 20 50 20Q72 20 69 46L70 64Q50 70 30 64Z" fill="${h}"/>`; front = `<path d="M32 44Q34 26 50 27Q66 26 68 44Q56 31 50 36Q44 31 32 44Z" fill="${h}"/>`; break;
      case 'shoulder': back = `<path d="M29 46Q26 19 50 19Q74 19 71 46L73 74Q50 80 27 74Z" fill="${h}"/>`; front = `<path d="M32 44Q34 26 50 27Q66 26 68 44Q58 33 50 35Q42 33 32 44Z" fill="${h}"/>`; break;
      case 'mshoulder': back = `<path d="M30 46Q27 20 50 20Q73 20 70 46L72 76Q50 70 28 76Z" fill="${h}"/>`; front = `<path d="M32 44Q33 24 50 25Q67 24 68 44Q56 35 50 30Q44 35 32 44Z" fill="${h}"/>`; break;
      case 'semi': back = `<path d="M30 46Q27 19 50 19Q73 19 70 46L69 59Q66 52 66 46L34 46Q34 52 31 59Z" fill="${h}"/>`; front = `<path d="M31 45Q29 22 50 22Q71 22 69 45Q66 34 60 33Q50 38 38 31Q33 36 31 45Z" fill="${h}"/>`; break;
      case 'braids': back = `<rect x="26" y="44" width="9" height="42" rx="4.5" fill="${h}"/><rect x="65" y="44" width="9" height="42" rx="4.5" fill="${h}"/>`; front = `<path d="M32 44Q31 24 50 24Q69 24 68 44Q58 34 50 36Q42 34 32 44Z" fill="${h}"/>`; break;
      case 'short': front = `<path d="M32 42Q30 21 50 21Q70 21 68 42Q62 31 50 32Q38 31 32 42Z" fill="${h}"/>`; break;
      case 'wavy': front = `<path d="M31 43Q28 19 52 21Q72 23 69 43Q65 29 50 31Q38 33 31 43Z" fill="${h}"/><circle cx="40" cy="26" r="6" fill="${h}"/>`; break;
      case 'curly': back = `<circle cx="50" cy="32" r="22" fill="${h}"/>`; front = `<path d="M32 42Q33 28 50 28Q67 28 68 42Q58 35 50 36Q42 35 32 42Z" fill="${h}"/>`; break;
      case 'pony': back = `<path d="M66 30Q84 34 80 60Q76 48 66 44Z" fill="${h}"/>`; front = `<path d="M32 42Q30 21 50 21Q70 21 68 42Q62 31 50 32Q38 31 32 42Z" fill="${h}"/>`; break;
    }
    if (a.beard) beard = `<path d="M33 50Q33 74 50 75Q67 74 67 50Q60 61 50 61Q40 61 33 50Z" fill="${h}"/>`;
    if (a.glasses === 'thick') gl = `<g fill="none" stroke="#2F2623" stroke-width="3.2" stroke-linecap="round"><rect x="32.5" y="41" width="16" height="12.5" rx="5"/><rect x="51.5" y="41" width="16" height="12.5" rx="5"/><path d="M48.5 46H51.5M32.5 45L30 43.5M67.5 45L70 43.5"/></g>`;
    if (a.glasses === 'thin') gl = `<g fill="none" stroke="#3A3330" stroke-width="1.5" stroke-linecap="round"><circle cx="41.5" cy="47" r="6.6"/><circle cx="58.5" cy="47" r="6.6"/><path d="M48.1 46.5H51.9M34.9 46L31 44.5M65.1 46L69 44.5"/></g>`;
    const id = 'fpc' + (uid++), boca = a.beard ? '#F3D9C8' : '#5A2A22';
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#${id})">
      <rect width="100" height="100" fill="${a.bg}"/>${back}
      <path d="M16 100Q18 74 50 72Q82 74 84 100Z" fill="${a.shirt}"/>
      <rect x="43" y="58" width="14" height="18" rx="6" fill="${a.skin}"/>
      <circle cx="33.5" cy="48" r="4.2" fill="${a.skin}"/><circle cx="66.5" cy="48" r="4.2" fill="${a.skin}"/>
      <ellipse cx="50" cy="46" rx="17" ry="19" fill="${a.skin}"/>${beard}${front}
      <circle cx="42" cy="47" r="2.2" fill="#2B1D1A"/><circle cx="58" cy="47" r="2.2" fill="#2B1D1A"/>${gl}
      <path d="M43 55Q50 62 57 55" fill="none" stroke="${boca}" stroke-width="2.2" stroke-linecap="round"/></g></svg>`;
  }
  function neutro() {
    const id = 'fpc' + (uid++);
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#${id})"><rect width="100" height="100" fill="#DAD7D1"/><path d="M14 100Q16 72 50 70Q84 72 86 100Z" fill="#B3AFA6"/><circle cx="50" cy="42" r="18" fill="#B3AFA6"/></g></svg>`;
  }
  const AVS = [
    { g: 'M', skin: '#C98B63', hair: '#2A1B17', bg: '#F4D6D0', shirt: '#B66B6B', style: 'long' },
    { g: 'M', skin: '#8A5A3C', hair: '#1E1512', bg: '#D9E4D0', shirt: '#6B7A3A', style: 'afro' },
    { g: 'M', skin: '#F0C8A4', hair: '#7A4A2A', bg: '#DCE3EE', shirt: '#4A6670', style: 'bun' },
    { g: 'M', skin: '#E3AE86', hair: '#3A2218', bg: '#F0E3C8', shirt: '#B8923A', style: 'bob' },
    { g: 'M', skin: '#6F4630', hair: '#151010', bg: '#E9D8EA', shirt: '#7B5E8C', style: 'braids' },
    { g: 'M', skin: '#EBC3A0', hair: '#1A1413', bg: '#F3E1D6', shirt: '#C4876F', style: 'shoulder', glasses: 'thick' },
    { g: 'H', skin: '#B87A55', hair: '#231713', bg: '#DDE6EE', shirt: '#E9A98A', style: 'short' },
    { g: 'H', skin: '#7A4B32', hair: '#181010', bg: '#F2E0C9', shirt: '#2F3A40', style: 'curly' },
    { g: 'H', skin: '#D9A27A', hair: '#2A1D18', bg: '#D8E6D9', shirt: '#6B1F2E', style: 'bald', beard: 1 },
    { g: 'H', skin: '#F0C8A4', hair: '#5A3A24', bg: '#EBDCCB', shirt: '#4A6670', style: 'wavy' },
    { g: 'H', skin: '#C58B63', hair: '#1F1613', bg: '#E3DCEF', shirt: '#6B7A3A', style: 'pony', beard: 1 },
    { g: 'H', skin: '#F6DCC6', hair: '#E4C26A', bg: '#DCE8EE', shirt: '#8FA7BF', style: 'short' },
    { g: 'H', skin: '#E2B28C', hair: '#4A3020', bg: '#DDE4D6', shirt: '#5E7A6B', style: 'semi', glasses: 'thin' }
  ];
  /* -1 = personaje gris · null = todavía no eligió */
  function avatarSvg(i) { return i === -1 ? neutro() : AVS[i] ? persona(AVS[i]) : neutro(); }
  function avatarHtml(i, px) {
    return '<span class="fav" style="--s:' + (px || 48) + 'px">' + avatarSvg(i) + '</span>';
  }

  /* ---------- temas del Workspace ---------- */
  const SOMBRA = '0 1px 0 rgba(255,255,255,.9) inset,0 14px 30px -18px rgba(0,0,0,.30)';
  const PALETAS = {
    azul: { n: 'Azul', topbg: '#2B4C73', topfg: '#EEF3F8', acc: '#2B4C73', oro: '#5B86B8', oroT: '#2B4C73', bg: '#EEF3F8', surface: '#FFFFFF', soft: 'rgba(34,48,60,.05)', text: '#22303C', muted: '#5E6E80', line: 'rgba(34,48,60,.14)', msg: 'rgba(43,76,115,.09)', nav: '#FFFFFF', ac: ['#4F7AAE', '#3E6697', '#2F5280'], acfg: '#FFFFFF' },
    colorida: { n: 'Colorida', topbg: '#E0533D', topfg: '#FFFFFF', acc: '#C2412D', oro: '#1F8A7D', oroT: '#17695F', bg: '#FFF7E8', surface: '#FFFFFF', soft: 'rgba(51,48,43,.05)', text: '#33302B', muted: '#76705F', line: 'rgba(51,48,43,.14)', msg: 'rgba(224,83,61,.10)', nav: '#FFFFFF', ac: ['#2BA394', '#1F8A7D', '#17695F'], acfg: '#FFFFFF' },
    rosa: { n: 'Rosa nude', topbg: '#E8CBC5', topfg: '#4A2E2B', acc: '#A66B66', oro: '#B77B76', oroT: '#8A5550', bg: '#FBF3F1', surface: '#FFFFFF', soft: 'rgba(74,55,53,.05)', text: '#4A3735', muted: '#85706C', line: 'rgba(74,55,53,.14)', msg: 'rgba(183,123,118,.12)', nav: '#FFFFFF', ac: ['#D9A5A0', '#C98F89', '#B77B76'], acfg: '#3E2523', topOscuro: true },
    bosque: { n: 'Bosque', topbg: '#4F5E2A', topfg: '#F4F2E6', acc: '#5E6D33', oro: '#7E8F45', oroT: '#4F5E2A', bg: '#F4F3E8', surface: '#FFFEF8', soft: 'rgba(46,51,34,.05)', text: '#2E3322', muted: '#6F7259', line: 'rgba(46,51,34,.14)', msg: 'rgba(94,109,51,.10)', nav: '#FFFEF8', ac: ['#7E8F45', '#6B7A3A', '#566330'], acfg: '#FFFFFF' },
    lavanda: { n: 'Lavanda', topbg: '#6E5C93', topfg: '#F5F2FA', acc: '#6E5C93', oro: '#8F7CB8', oroT: '#5F4E85', bg: '#F4F1F9', surface: '#FFFFFF', soft: 'rgba(45,38,64,.05)', text: '#2D2640', muted: '#746D8A', line: 'rgba(45,38,64,.14)', msg: 'rgba(110,92,147,.10)', nav: '#FFFFFF', ac: ['#8672B3', '#7461A3', '#5F4E85'], acfg: '#FFFFFF' },
    madera: { n: 'Madera', topbg: '#5A3B2A', topfg: '#F6EBDD', acc: '#7A4E33', oro: '#A5744F', oroT: '#7A4E33', bg: '#F5ECE0', surface: '#FFFAF2', soft: 'rgba(58,42,32,.05)', text: '#3A2A20', muted: '#7F6D5C', line: 'rgba(58,42,32,.14)', msg: 'rgba(122,78,51,.10)', nav: '#FFFAF2', ac: ['#B07A52', '#9A653F', '#7A4E33'], acfg: '#FFFFFF' },
    pizarra: { n: 'Pizarra', topbg: '#2F3A40', topfg: '#EEF0F0', acc: '#2F3A40', oro: '#6B7F8A', oroT: '#2F3A40', bg: '#EEF1F2', surface: '#FFFFFF', soft: 'rgba(36,48,58,.05)', text: '#24303A', muted: '#64727C', line: 'rgba(36,48,58,.14)', msg: 'rgba(47,58,64,.09)', nav: '#FFFFFF', ac: ['#55666F', '#44545C', '#2F3A40'], acfg: '#FFFFFF' }
  };
  /* orden y vistas en miniatura: [barra, menú, fondo, tarjeta] */
  const WS_LISTA = [
    ['auto', 'Automático', null],
    ['marfil', 'Marfil', ['#8B1A2A', '#FFFFFF', '#F3F0EA', '#FFFFFF']],
    ['oscura', 'Oscura', ['#8B1A2A', '#2F2F32', '#252528', '#3A3A3A']],
    ['azul', 'Azul', null], ['colorida', 'Colorida', null], ['rosa', 'Rosa nude', null],
    ['bosque', 'Bosque', null], ['lavanda', 'Lavanda', null], ['madera', 'Madera', null], ['pizarra', 'Pizarra', null]
  ];
  function miniDe(k, m) {
    if (m) return m;
    const p = PALETAS[k];
    return p ? [p.topbg, p.nav, p.bg, p.surface] : null;
  }

  /* ---------- colores del portal (suaves y mate) ---------- */
  const PT_LISTA = [
    ['salvia', 'Salvia', '#B9C8AB'], ['lavanda', 'Lavanda', '#CFC6E0'], ['durazno', 'Durazno', '#F3CBAE'],
    ['celeste', 'Celeste', '#B9D2E4'], ['rosa', 'Rosa nude', '#EBC9C6'], ['arena', 'Arena', '#E5D8BE'],
    ['mantequilla', 'Mantequilla', '#F1E3A8'], ['menta', 'Menta', '#BFE0D0'], ['malva', 'Malva', '#D9BCCB'],
    ['piedra', 'Piedra', '#CFCBC3']
  ];
  const PT = {}; PT_LISTA.forEach(x => { PT[x[0]] = x[2]; });

  /* ---------- estilos (se inyectan una sola vez) ---------- */
  function css() {
    let s = `
.fav{display:inline-block;width:var(--s,48px);height:var(--s,48px);border-radius:50%;overflow:hidden;flex:none;line-height:0;box-shadow:0 2px 6px rgba(0,0,0,.25);vertical-align:middle}
.fav svg{width:100%;height:100%;display:block}
@media (prefers-color-scheme:dark){html[data-fmodo="pt"] .fav{filter:invert(1) hue-rotate(180deg)}}
.fp-wrap{--fp-tx:var(--text,var(--ink,#252528));--fp-mu:var(--muted,#6A655C);--fp-ln:var(--line,rgba(37,37,40,.16));--fp-ac:var(--oro-t,var(--borgona,#8B1A2A));--fp-sf:var(--soft,rgba(37,37,40,.06));--fp-bg:var(--surface,var(--card,#fff));color:var(--fp-tx);font-size:16px;line-height:1.45;text-align:left}
.fp-sec{font-size:1.15rem;margin:6px 0 4px;font-weight:700}
.fp-sub{color:var(--fp-mu);font-size:15px;margin:0 0 14px}
.fp-grp{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--fp-mu);margin:16px 0 10px;font-weight:700}
.fp-avs{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:10px}
.fp-a{display:grid;place-items:center;padding:9px;border-radius:18px;border:2px solid transparent;background:var(--fp-sf);cursor:pointer;transition:transform .15s,box-shadow .15s;color:inherit;font:inherit}
.fp-a:hover{transform:translateY(-3px)}
.fp-a.on{border-color:var(--fp-ac);background:var(--fp-bg);box-shadow:0 6px 16px rgba(0,0,0,.25)}
.fp-themes{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:12px;margin-top:6px}
.fp-t{display:flex;flex-direction:column;gap:9px;align-items:center;padding:10px;border-radius:18px;border:2px solid transparent;background:var(--fp-sf);cursor:pointer;font:inherit;font-weight:700;font-size:15px;color:inherit;transition:transform .15s,box-shadow .15s}
.fp-t:hover{transform:translateY(-3px)}
.fp-t.on{border-color:var(--fp-ac);background:var(--fp-bg);box-shadow:0 6px 16px rgba(0,0,0,.25)}
.fp-mini{width:100%;height:66px;border-radius:12px;overflow:hidden;display:grid;grid-template-rows:17px 1fr;box-shadow:inset 0 0 0 1px rgba(128,128,128,.28)}
.fp-mini i{display:block}.fp-mini>div{display:grid;grid-template-columns:30% 1fr}
.fp-mini>div>i:last-child{display:grid;place-items:center}
.fp-mini>div>i:last-child b{width:62%;height:22px;border-radius:7px;box-shadow:0 2px 5px rgba(0,0,0,.22)}
.fp-sw{width:100%;height:54px;border-radius:12px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08),0 2px 6px rgba(0,0,0,.12)}
.fp-note{color:var(--fp-mu);font-size:15px;margin-top:14px}
#fp-me{padding:4px 6px!important;border-radius:99px!important;display:inline-flex;align-items:center}
body:has(#v-login:not([hidden]),#v-wait:not([hidden])) #fp-me{display:none!important}
.fp-edit{margin-top:6px;border:2px solid var(--line,rgba(37,37,40,.16));background:none;border-radius:14px;padding:8px 14px;font:inherit;font-size:.95rem;color:inherit;cursor:pointer}
.fp-edit:hover{background:rgba(128,128,128,.12)}
.fp-av-btn{cursor:pointer}
.fp-ov{position:fixed;inset:0;z-index:2000;background:rgba(20,20,22,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.fp-box{width:min(720px,100%);max-height:calc(100dvh - 32px);overflow:auto;border-radius:24px;background:var(--surface,var(--card,#fff));color:var(--text,var(--ink,#252528));padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.45)}
.fp-box h2{font-size:1.9rem;margin:0 0 4px}
.fp-ok{display:inline-flex;align-items:center;justify-content:center;margin-top:18px;border:0;border-radius:999px;padding:13px 30px;font:inherit;font-weight:700;font-size:1.05rem;cursor:pointer;background:var(--oro,#B8A06A);color:#252528;box-shadow:0 5px 14px rgba(0,0,0,.28)}
/* portal: color suave y mate de la barra y del menú */
html[data-fcolor] header.top{background:var(--fnav)!important;color:#2F3A40!important;box-shadow:0 6px 0 rgba(37,37,40,.08)!important}
html[data-fcolor] header.top .brand b,html[data-fcolor] header.top .brand .iso{color:#2F3A40!important}
html[data-fcolor] header.top .brand small{color:#4A4D50!important}
html[data-fcolor] header.top .out{color:#2F3A40!important;border-color:rgba(47,58,64,.35)!important}
html[data-fcolor] .nav button[aria-current="page"]{background:var(--fnav)!important;border-color:transparent!important;color:#2F3A40!important;box-shadow:0 4px 0 color-mix(in srgb,var(--fnav) 70%,#000)!important}
html[data-fcolor] .me{border-color:var(--fnav)!important}
/* el color elegido también tiñe el fondo de la página (la textura de papel queda encima) */
html[data-fcolor] body::after{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:var(--fnav);opacity:.42;mix-blend-mode:multiply}
html[data-fcolor] .reloj{background:color-mix(in srgb,var(--fnav) 55%,#252528)}
/* Workspace: reglas comunes a todas las paletas */
html[data-paleta] .top{background:var(--ftop)!important;color:var(--ftopfg)!important;box-shadow:inset 0 -1px 0 rgba(0,0,0,.12),0 14px 30px -14px rgba(0,0,0,.35)!important}
html[data-paleta] .top .t b{border-left-color:var(--oro)!important}
html[data-paleta] .top .btn-ghost{color:var(--ftopfg)!important;border-color:color-mix(in srgb,var(--ftopfg) 45%,transparent)!important}
html[data-paleta] .top .btn-ghost:hover{border-color:var(--ftopfg)!important}
html[data-paleta] .btn-gold{background:linear-gradient(180deg,var(--fac1),var(--fac2) 55%,var(--fac3))!important;color:var(--facfg)!important}
html[data-paleta] .tab[aria-selected="true"]{background:linear-gradient(90deg,color-mix(in srgb,var(--oro) 28%,transparent),color-mix(in srgb,var(--oro) 6%,transparent))!important}
html[data-paleta] .fp-ok{background:var(--fac2);color:var(--facfg)}
`;
    Object.keys(PALETAS).forEach(k => {
      const p = PALETAS[k];
      s += `html[data-paleta="${k}"]{color-scheme:light;--bg:${p.bg};--bg2:rgba(255,255,255,.7);--surface:${p.surface};--soft:${p.soft};--input:#FFFFFF;--text:${p.text};--muted:${p.muted};--line:${p.line};--oro:${p.oro};--oro-t:${p.oroT};--borgona:${p.acc};--msg-bg:${p.msg};--nav:${p.nav};--shadow:${SOMBRA};--ftop:${p.topbg};--ftopfg:${p.topfg};--fac1:${p.ac[0]};--fac2:${p.ac[1]};--fac3:${p.ac[2]};--facfg:${p.acfg}}\n`;
      if (p.topOscuro) s += `html[data-paleta="${k}"] .top img{filter:brightness(0) opacity(.8)}\n`;
    });
    return s;
  }
  function inyectar() {
    if (document.getElementById('fp-css')) return;
    const st = document.createElement('style'); st.id = 'fp-css'; st.textContent = css();
    document.head.appendChild(st);
  }

  /* ---------- estado ---------- */
  const cfg = { modo: 'pt', api: null, uid: null, base: null };
  let st = { avatar: null, tema: null };
  const oyentes = [];
  let tServ = null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const llave = () => { const u = cfg.uid && cfg.uid(); return u ? 'faro_perfil_' + u : null; };
  function leerLocal() {
    const k = llave(); if (!k) return;
    try { const j = JSON.parse(localStorage.getItem(k) || 'null'); if (j) st = { avatar: j.avatar == null ? null : j.avatar, tema: j.tema || null }; } catch (e) { /* sin acceso a almacenamiento */ }
  }
  function guardarLocal() { const k = llave(); if (!k) return; try { localStorage.setItem(k, JSON.stringify(st)); } catch (e) { /* ok */ } }
  function guardarServidor() {
    if (!cfg.api || !cfg.uid) return;
    clearTimeout(tServ);
    tServ = setTimeout(() => {
      const u = cfg.uid(); if (!u) return;
      try {
        cfg.api('/rest/v1/perfiles_ws?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { user_id: u, avatar: st.avatar, tema: st.tema, actualizado: new Date().toISOString() } }).catch(() => {});
      } catch (e) { /* ok */ }
    }, 700);
  }
  function avisar() { oyentes.forEach(f => { try { f(st); } catch (e) { /* ok */ } }); }

  /* ---------- aplicar ---------- */
  function aplicar() {
    const h = document.documentElement;
    h.dataset.fmodo = cfg.modo;
    if (cfg.modo === 'ws') {
      const t = st.tema;
      if (t && PALETAS[t]) { if (cfg.base) cfg.base('light'); h.dataset.paleta = t; }
      else {
        delete h.dataset.paleta;
        if (cfg.base) { if (t === 'marfil') cfg.base('light'); else if (t === 'oscura') cfg.base('dark'); else if (t === 'auto') cfg.base('auto'); }
      }
      encabezado();
    } else {
      if (st.tema && PT[st.tema]) { h.dataset.fcolor = st.tema; h.style.setProperty('--fnav', PT[st.tema]); }
      else { delete h.dataset.fcolor; h.style.removeProperty('--fnav'); }
      portalMe();
    }
  }
  function encabezado() {
    const tr = document.querySelector('.top .tr'); if (!tr) return;
    let b = document.getElementById('fp-me');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.id = 'fp-me'; b.className = 'btn btn-ghost btn-sm'; b.title = 'Tu perfil: avatar y color'; b.setAttribute('aria-label', 'Tu perfil: avatar y color');
      b.addEventListener('click', abrir);
      tr.insertBefore(b, tr.firstChild);
    }
    b.innerHTML = avatarHtml(st.avatar == null ? -1 : st.avatar, 30);
  }
  function portalMe() {
    const me = document.getElementById('me'); if (!me) return;
    const av = me.querySelector('.av');
    if (av && st.avatar != null) {
      av.innerHTML = avatarHtml(st.avatar, 84);
      av.style.cssText = 'background:none;box-shadow:none;overflow:visible;padding:0';
    }
    if (av) { av.classList.add('fp-av-btn'); av.title = 'Cambiar avatar y color'; av.onclick = abrir; }
    if (!me.querySelector('.fp-edit')) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'fp-edit'; b.textContent = 'Cambiar avatar y color'; b.onclick = abrir; me.appendChild(b);
    }
  }

  /* ---------- cambios ---------- */
  function poner(p) {
    if ('avatar' in p) st.avatar = p.avatar;
    if ('tema' in p) st.tema = p.tema;
    guardarLocal(); aplicar(); guardarServidor(); avisar();
  }
  /* la página cambió el tema claro/oscuro/automático por su cuenta: se quita la paleta y se recuerda */
  function baseCambio(v) {
    delete document.documentElement.dataset.paleta;
    st.tema = v === 'light' ? 'marfil' : v === 'dark' ? 'oscura' : 'auto';
    guardarLocal(); guardarServidor(); avisar();
  }

  /* ---------- panel para elegir ---------- */
  function h(tag, attrs) {
    const e = document.createElement(tag);
    for (const k in (attrs || {})) { if (k === 'class') e.className = attrs[k]; else if (k === 'html') e.innerHTML = attrs[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); }
    for (let i = 2; i < arguments.length; i++) { const c = arguments[i]; if (c != null) e.append(c.nodeType ? c : document.createTextNode(c)); }
    return e;
  }
  function panel(root) {
    if (!root) return;
    function dibuja() {
      root.textContent = '';
      const w = h('div', { class: 'fp-wrap' });
      const avBtn = i => h('button', { type: 'button', class: 'fp-a' + (st.avatar === i ? ' on' : ''), 'aria-label': i === -1 ? 'Personaje gris' : 'Avatar ' + (i + 1), 'aria-pressed': String(st.avatar === i), html: avatarHtml(i, 62), onclick: () => { poner({ avatar: i }); dibuja(); } });
      w.append(h('div', { class: 'fp-sec' }, 'Avatar'), h('p', { class: 'fp-sub' }, 'Elige el que más te guste. Si no quieres ninguno, queda el personaje gris.'));
      [['Mujeres', 'M'], ['Hombres', 'H']].forEach(([t, g]) => {
        const gr = h('div', { class: 'fp-avs' });
        AVS.forEach((a, i) => { if (a.g === g) gr.append(avBtn(i)); });
        w.append(h('div', { class: 'fp-grp' }, t), gr);
      });
      w.append(h('div', { class: 'fp-grp' }, 'Neutro'), h('div', { class: 'fp-avs' }, avBtn(-1)));
      if (cfg.modo === 'ws') {
        w.append(h('div', { class: 'fp-sec', style: 'margin-top:26px' }, 'Tema de color'), h('p', { class: 'fp-sub' }, 'Se aplica a todo tu Workspace. Cada persona del equipo elige el suyo.'));
        const gt = h('div', { class: 'fp-themes' });
        WS_LISTA.forEach(([k, n, m]) => {
          const mm = miniDe(k, m);
          const mini = k === 'auto'
            ? h('div', { class: 'fp-mini', style: 'background:linear-gradient(135deg,#F3F0EA 50%,#252528 50%)', html: '<i style="background:#8B1A2A"></i><div></div>' })
            : h('div', { class: 'fp-mini', html: `<i style="background:${mm[0]}"></i><div><i style="background:${mm[1]}"></i><i style="background:${mm[2]}"><b style="background:${mm[3]}"></b></i></div>` });
          gt.append(h('button', { type: 'button', class: 'fp-t' + ((st.tema || 'auto') === k ? ' on' : ''), 'aria-pressed': String((st.tema || 'auto') === k), onclick: () => { poner({ tema: k }); dibuja(); } }, mini, n));
        });
        w.append(gt);
      } else {
        w.append(h('div', { class: 'fp-sec', style: 'margin-top:26px' }, 'Color de tu barra'), h('p', { class: 'fp-sub' }, 'Colores suaves y mate para la barra y el menú.'));
        const gt = h('div', { class: 'fp-themes' });
        gt.append(h('button', { type: 'button', class: 'fp-t' + (!st.tema ? ' on' : ''), onclick: () => { poner({ tema: null }); dibuja(); } }, h('div', { class: 'fp-sw', style: 'background:repeating-linear-gradient(45deg,#d8d4cc,#d8d4cc 8px,#ece9e3 8px,#ece9e3 16px)' }), 'Original'));
        PT_LISTA.forEach(([k, n, c]) => gt.append(h('button', { type: 'button', class: 'fp-t' + (st.tema === k ? ' on' : ''), 'aria-pressed': String(st.tema === k), onclick: () => { poner({ tema: k }); dibuja(); } }, h('div', { class: 'fp-sw', style: 'background:' + c }), n)));
        w.append(gt);
      }
      root.append(w);
    }
    dibuja();
    return dibuja;
  }
  let modal = null;
  function abrir() {
    if (modal) return;
    inyectar();
    const ov = h('div', { class: 'fp-ov', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Tu perfil' });
    const caja = h('div', { class: 'fp-box' });
    const cont = h('div', {});
    caja.append(h('h2', {}, 'Tu perfil'), cont, h('button', { type: 'button', class: 'fp-ok', onclick: cerrar }, 'Listo'));
    ov.append(caja);
    ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });
    document.body.append(ov); modal = ov;
    panel(cont);
    const esc2 = e => { if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc2); } };
    document.addEventListener('keydown', esc2);
  }
  function cerrar() { if (modal) { modal.remove(); modal = null; } }

  /* ---------- ciclo de vida ---------- */
  function iniciar(o) {
    cfg.modo = o.modo === 'ws' ? 'ws' : 'pt';
    cfg.api = o.api || null; cfg.uid = o.uid || null; cfg.base = o.base || null;
    inyectar();
    document.documentElement.dataset.fmodo = cfg.modo;
  }
  /* se llama justo después de iniciar sesión */
  function entrar() {
    st = { avatar: null, tema: null };
    leerLocal(); aplicar(); avisar();
    if (!cfg.api) return Promise.resolve();
    return cfg.api('/rest/v1/perfiles_ws?select=avatar,tema&limit=1')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!j) return;
        if (j[0]) { st = { avatar: j[0].avatar == null ? null : j[0].avatar, tema: j[0].tema || null }; guardarLocal(); aplicar(); avisar(); }
        else if (st.avatar != null || st.tema) guardarServidor();
      }).catch(() => {});
  }
  /* se llama al cerrar sesión: vuelve a la apariencia original */
  function salir() {
    cerrar();
    st = { avatar: null, tema: null };
    const h2 = document.documentElement;
    delete h2.dataset.paleta; delete h2.dataset.fcolor; h2.style.removeProperty('--fnav');
    const b = document.getElementById('fp-me'); if (b) b.remove();
  }

  window.FaroPerfil = {
    iniciar, entrar, salir, abrir, cerrar, panel, poner, baseCambio, portalMe,
    avatarHtml, avatarSvg, estado: () => st, on: f => oyentes.push(f),
    catalogo: { avatares: AVS, paletas: PALETAS, portal: PT_LISTA }
  };
})();
