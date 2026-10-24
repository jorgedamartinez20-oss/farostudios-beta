/* Galería del cliente (Entregas) · Faro Studios
   Se carga después del script principal de entregas.html y usa sus ayudas (ST, api, rows, enlaces, esc, ic, toast…). */
Object.assign(P,{
  bag:'<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6.5a3 3 0 016 0V8"/>',
  ig:'<rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>',
  share:'<path d="M14 5l6 5.5-6 5.5v-3.2c-4.5 0-7.5 1.2-10 4.7.6-5 3.5-8.5 10-9z"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 114 2c-.8.6-1.6 1.1-1.6 2.1M12 17h.01"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',pause:'<path d="M8 5v14M16 5v14"/>',vol:'<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',mute:'<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6"/>',trash:'<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  gift:'<path d="M20 12v9H4v-9"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>',
  tag:'<path d="M3 12.2V4.8A1.8 1.8 0 014.8 3h7.4a1.8 1.8 0 011.3.5l7 7a1.8 1.8 0 010 2.6l-7.4 7.4a1.8 1.8 0 01-2.6 0l-7-7A1.8 1.8 0 013 12.2z"/><circle cx="8" cy="8" r="1.4"/>',
  wa:'<path d="M21 12a8.5 8.5 0 01-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1121 12z"/>',
  eye:'<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
});

/* ---------- colores y letras (las elige Faro en Workspace) ---------- */
const GPAL={
  faro:{n:'Faro',bg:'#141416',tx:'#F5F2EE',ac:'#B8A06A',luz:'oscura',nota:'Alto contraste'},
  marfil:{n:'Marfil',bg:'#F5F2EE',tx:'#252528',ac:'#8B1A2A',luz:'clara',nota:'Alto contraste'},
  oliva:{n:'Oliva',bg:'#2F3626',tx:'#DCDCC4',ac:'#B9B67A',luz:'oscura',nota:'Suave'},
  salvia:{n:'Salvia',bg:'#E4E8DC',tx:'#4A5440',ac:'#7C8A64',luz:'clara',nota:'Suave'},
  rosa:{n:'Rosa pastel',bg:'#F6E4E4',tx:'#6A4A50',ac:'#C98A94',luz:'clara',nota:'Suave'},
  palo:{n:'Palo de rosa',bg:'#3A1F28',tx:'#F8E9EC',ac:'#E7A9B6',luz:'oscura',nota:'Alto contraste'},
  mar:{n:'Mar profundo',bg:'#0E2A36',tx:'#EAF4F5',ac:'#7FC8C8',luz:'oscura',nota:'Alto contraste'},
  espuma:{n:'Espuma de mar',bg:'#DCEBEA',tx:'#2F5559',ac:'#4F9A9C',luz:'clara',nota:'Suave'},
  cielo:{n:'Cielo bebé',bg:'#E3EEF8',tx:'#46607A',ac:'#86AFD6',luz:'clara',nota:'Suave'},
  arena:{n:'Arena',bg:'#EDE1CF',tx:'#4A3B2A',ac:'#B98B5E',luz:'clara',nota:'Medio'},
  terracota:{n:'Terracota',bg:'#3A1D16',tx:'#F7E8DE',ac:'#E08A5E',luz:'oscura',nota:'Alto contraste'},
  lavanda:{n:'Lavanda',bg:'#ECE6F4',tx:'#51456E',ac:'#9A86C4',luz:'clara',nota:'Suave'},
  /* nombres de la primera versión (galerías ya creadas) */
  blanco:{n:'Blanco',bg:'#FFFFFF',tx:'#2a2a2a',ac:'#8B1A2A',luz:'clara',nota:'Alto contraste',viejo:1},
  noche:{n:'Noche',bg:'#18181B',tx:'#F5F2EE',ac:'#B8A06A',luz:'oscura',nota:'Alto contraste',viejo:1},
  borgona:{n:'Borgoña',bg:'#7a1624',tx:'#F5F2EE',ac:'#E2CE9C',luz:'oscura',nota:'Alto contraste',viejo:1}
};
const GFUENTES={
  faro:{n:'Faro',d:"'Bebas Neue',Impact,sans-serif",b:"'Lato',sans-serif",gf:'Bebas+Neue&family=Lato:wght@300;400;700',up:'uppercase',ls:'.04em',desc:'Bebas Neue + Lato'},
  serif:{n:'Serif',d:"'Cormorant Garamond',Georgia,serif",b:"'Lato',sans-serif",gf:'Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700',up:'none',ls:'0',desc:'Cormorant Garamond + Lato'},
  moderna:{n:'Moderna',d:"'Montserrat',sans-serif",b:"'Montserrat',sans-serif",gf:'Montserrat:wght@300;400;500',up:'uppercase',ls:'.12em',desc:'Montserrat Light'},
  atemporal:{n:'Atemporal',d:"'Playfair Display',Georgia,serif",b:"'Lato',sans-serif",gf:'Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700',up:'none',ls:'0',desc:'Playfair Display + Lato'},
  geometrica:{n:'Geométrica',d:"'Jost',sans-serif",b:"'Jost',sans-serif",gf:'Jost:wght@300;400;500',up:'none',ls:'.04em',desc:'Jost'},
  fina:{n:'Fina',d:"'Raleway',sans-serif",b:"'Raleway',sans-serif",gf:'Raleway:wght@300;400;500',up:'none',ls:'.06em',desc:'Raleway'},
  cine:{n:'Cine',d:"'Oswald',Impact,sans-serif",b:"'Lato',sans-serif",gf:'Oswald:wght@400;500&family=Lato:wght@300;400;700',up:'uppercase',ls:'.08em',desc:'Oswald + Lato'}
};
function gAplica(cfg){
  const pal=GPAL[cfg.paleta]||GPAL.marfil,fu=GFUENTES[cfg.fuente]||GFUENTES.faro,r=document.documentElement.style;
  r.setProperty('--g-bg',pal.bg);r.setProperty('--g-tx',pal.tx);r.setProperty('--g-ac',pal.ac);
  r.setProperty('--g-ft',fu.d);r.setProperty('--g-ft2',fu.b);r.setProperty('--g-up',fu.up);r.setProperty('--g-ls',fu.ls);
  if(!document.getElementById('gfont-'+(cfg.fuente||'faro'))){const l=document.createElement('link');l.id='gfont-'+(cfg.fuente||'faro');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family='+fu.gf+'&display=swap';document.head.append(l)}
  document.body.className='g';document.body.style.background=pal.bg;document.body.style.color=pal.tx;
}

/* ---------- precios sugeridos de impresión (quetzales) ---------- */
const GPRECIOS=[['4x6','Mini','10 × 15 cm',5],['5x7','Clásica','13 × 18 cm',12],['8x10','Retrato','20 × 25 cm',35],['11x14','Para marco','28 × 35 cm',75],
  ['16x20','Ampliación','40 × 50 cm',150],['20x30','Ampliación grande','50 × 76 cm',260],['24x36','Póster','60 × 90 cm',380]];
const GENVIO=35,GGRATIS=5;
const GWEB='https://farostudios.net';
const G={cfg:{},listas:[],carro:[],vista:'cuadricula',filtro:null,fin:false,promoVisto:false,tablas:true};
const gKey=k=>k+'_'+(ST.p?ST.p.id:'');
const gLS=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}};
const gSS=(k,v)=>{try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v)}catch(e){return null}};
const gPortadaId=()=>{const id=G.cfg&&G.cfg.portada;return id&&ST.arch.some(a=>a.id===id)?id:null};
/* la portada elegida de la galería también aparece abajo, según su orden; solo se esconde la que se subió «solo para la portada» */
const gAparte=()=>new Set((G.cfg&&G.cfg.portadasAparte)||[]);
const gImgs=()=>ST.arch.filter(a=>a.tipo==='imagen'&&!gAparte().has(a.id));
const gMetaOn=()=>G.cfg.meta!==false;
function gMeta(a){
  const m=(a&&a.meta)||{},it=[['CÁMARA',m.camara],['DISTANCIA',m.distancia],['APERTURA',m.apertura],['FOTÓGRAFO',m.fotografo]].filter(x=>x[1]);
  return gMetaOn()?it:[];
}
const gMetaHtml=a=>{const it=gMeta(a);return it.length?'<div class="gmeta">'+it.map(x=>'<span><b>'+x[0]+'</b>'+esc(x[1])+'</span>').join('')+'</div>':''};
const gMetaCorta=a=>gMeta(a).map(x=>x[1]).join(' · ');
const gLink=id=>ST.links[id]||{};

/* ---------- ventanas ---------- */
function gModal(html,ancho){
  const m=document.createElement('div');m.className='gm';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
  m.innerHTML='<div class="gmc'+(ancho?' w':'')+'">'+html+'</div>';document.body.append(m);document.body.style.overflow='hidden';
  const cierra=()=>{m.remove();if(!document.querySelector('.gm,.glb,.gdr,.gt'))document.body.style.overflow='';removeEventListener('keydown',tec)};
  const tec=e=>{if(e.key==='Escape'&&document.body.lastElementChild===m)cierra()};addEventListener('keydown',tec);
  m.addEventListener('mousedown',e=>{if(e.target===m)cierra()});
  m.querySelectorAll('[data-x]').forEach(b=>b.onclick=cierra);
  m.cierra=cierra;return m;
}
const gX='<button class="x" data-x aria-label="Cerrar">'+ic('x')+'</button>';

/* ================= VISTA PRINCIPAL ================= */
async function vistaGaleria(){
  const p=ST.p,cfg=p.config||{};G.cfg=cfg;G.vista=(PREVIA?null:gLS(gKey('faro_vista')))||cfg.vista||'editorial';G.filtro=null;G.fin=false;G.promoVisto=false;G.abierta=false;G.carro=[];G.pre=null;G.quiere=false;
  if(G.au){try{G.au.pause()}catch(e){}G.au=null}
  gAplica(cfg);
  const fotos=ST.arch,portada=fotos.find(a=>a.id===cfg.portada)||gImgs()[0]||fotos[0];
  /* al inicio solo se pide el enlace de la portada; el resto se carga cuando tocan «Ver galería» */
  if(portada)await enlaces([portada.id]);
  const pl=portada&&gLink(portada.id);
  const foco=cfg.foco||{x:50,y:50};
  const titulo=cfg.titulo||p.titulo,sub=cfg.subtitulo||'',fe=cfg.fecha?fechaL(cfg.fecha):'';
  const nImg=gImgs().length;
  const cerrar=ST.unico?'':'<button class="gb" id="gvol" aria-label="Mis galerías">'+ic('back')+'<span class="t">Galerías</span></button>';
  APP.innerHTML='<div class="gal pre"><header class="gtop" id="gtp"><span class="iso"></span>'+cerrar+'<span class="sp"></span>'
    +'<div class="gvista" role="group" aria-label="Vista" id="gvista"><button data-v="editorial" aria-pressed="false">Editorial</button><button data-v="cuadricula" aria-pressed="false">Cuadrícula</button></div>'
    +'<button class="gb" id="glis" aria-label="Mis listas">'+ic('heart')+'<span class="t">Mis listas</span><span class="cnt" id="glc" hidden></span></button>'
    +'<button class="gb" id="gdl" aria-label="Descargar">'+ic('dl')+'<span class="t">Descargar</span></button>'
    +'<button class="gb" id="gay" aria-label="Ayuda">'+ic('help')+'</button>'
    +'<button class="gb" id="gsal" aria-label="Salir">'+ic('out')+'<span class="t">Salir</span></button></header>'
   +'<section class="gcov" id="gcv"></section>'
   +'<section class="gmuro" id="gmu"><div class="in">'+(cfg.mensaje?'<p class="cab">'+esc(cfg.mensaje)+'</p>':'')+'<div id="gfl"></div><div id="gcuerpo"></div>'
   +'<div class="gfin" id="gfin"><span class="iso"></span><p>Gracias por dejarnos contar tu historia. Guarda tus favoritas, compártelas con quien quieras y si te gustó, cuéntanos cómo fue.</p><div class="row"><button class="gbtn p" id="gresb">'+ic('star')+' Dejar una reseña</button><button class="gbtn" id="gprb">'+ic('bag')+' Pedir impresiones</button></div></div></div>'
   +'<div class="gcon" id="gcon" hidden></div>'
   +'<footer class="gpie">© '+new Date().getFullYear()+' Faro Studios · farostudios.net<br>Todos los derechos reservados</footer></section>'
   +gCodigoHtml(cfg)
   +'<button class="gbolsa" id="gbolsa" aria-label="Impresiones">'+ic('bag')+'<span class="cnt" id="gbc" hidden></span></button>'
   +'<div class="gmus" id="gmus" hidden><div class="cv" id="gmcv"><span class="iso"></span></div><div class="tx"><b id="gmt"></b><small id="gma"></small></div><button id="gmp" aria-label="Silenciar la música">'+ic('vol')+'</button><i class="eq" aria-hidden="true"><s></s><s></s><s></s></i></div></div>';
  /* portada: estilo, encuadre, oscuridad y movimiento los elige David en Workspace (config.cubierta) */
  gPortadaPinta(cfg,{src:pl&&pl.urlVer||'',titulo,fecha:[fe,sub].filter(Boolean).join(' · '),n:nImg,foco});
  const mh=()=>{const t=$('#gtp');if(t)document.documentElement.style.setProperty('--gh',t.offsetHeight+'px')};mh();addEventListener('resize',mh);
  $('#gsal').onclick=gConfirmaSalir;const gv=$('#gvol');if(gv)gv.onclick=()=>inicio();
  $('#bver').onclick=gAbrirMuro;
  $('#gay').onclick=()=>{$('#gmu').scrollIntoView({behavior:'auto'});setTimeout(()=>gTutorial(false),120)};
  $('#glis').onclick=gAbrirListas;$('#gdl').onclick=()=>gAbrirDescarga('todas');
  $('#gbolsa').onclick=gAbrirBolsa;$('#gresb').onclick=()=>gAbrirResena(true);$('#gprb').onclick=gAbrirBolsa;
  document.querySelectorAll('#gvista button').forEach(b=>b.onclick=()=>{G.vista=b.dataset.v;gLS(gKey('faro_vista'),G.vista);gPintaMuro()});
  const tp=$('#gtp'),ga=document.querySelector('.gal');
  if(G.onScroll)removeEventListener('scroll',G.onScroll);
  G.onScroll=()=>{const x=scrollY>24;tp.classList.toggle('sol',x);ga.classList.toggle('sol',x);gChequeaMedio();gChequeaFin()};
  addEventListener('scroll',G.onScroll,{passive:true});G.onScroll();
  G.finOk=false;G.codVisto=false;gCodigoLiga();
  /* en segundo plano solo los enlaces (pesan casi nada); las fotos no se descargan hasta abrir la galería */
  setTimeout(()=>{if(!G.pre&&!G.abierta)G.pre=enlaces(ST.arch.map(a=>a.id)).catch(()=>{})},700);
  gMusicaPrep();
  /* si venimos de «Entrar», la cortina espera a que la portada esté lista; el zoom arranca cuando ya se ve */
  if(window.GCOR)await gPre(pl&&pl.urlVer,6000);
  await gCorFin();
  const g0=document.querySelector('.gal');if(g0)g0.classList.add('go');
  gPortadaMueve(false);
}
/* portada: dibuja el estilo elegido con portada.js (sin capa fija: la oscuridad es la que se eligió) */
function gPortadaPinta(cfg,d){
  const cb=cfg.cubierta||{},fx=typeof cb.fx==='number'?cb.fx:(+d.foco.x||50)/100,fy=typeof cb.fy==='number'?cb.fy:(+d.foco.y||50)/100;
  G.pc={estilo:cb.estilo||'centro',titulo:d.titulo,fecha:d.fecha,src:d.src,fx,fy,zoom:+cb.zoom>=1?+cb.zoom:1,ov:Math.max(0,Math.min(70,+cb.ov||0)),movimiento:cb.mov!==false,pie:d.n+' fotografías · Galería privada'};
  const box=document.getElementById('gcv');if(!box||!window.FaroPortada)return;
  G.pcv=FaroPortada.render(box,G.pc,{boton:true,movimiento:false});
  const m=()=>{const x=box.clientWidth<700;box.classList.toggle('fpph',x)};m();
  if(G.pcR)removeEventListener('resize',G.pcR);G.pcR=m;addEventListener('resize',m);
}
/* zoom out suave: arranca cuando la portada ya se ve (abierta=true: versión corta del encabezado) */
function gPortadaMueve(abierta){
  const cv=G.pcv;if(!cv||!G.pc||!G.pc.movimiento)return;
  cv.classList.remove('fpg','fpa');void cv.offsetWidth;cv.classList.add('fpg');if(abierta)cv.classList.add('fpa');
}
const gEspera=ms=>new Promise(r=>setTimeout(r,ms));
const gPre=(u,ms)=>new Promise(r=>{if(!u)return r();const i=new Image();i.onload=i.onerror=()=>r();i.src=u;setTimeout(r,ms||5000)});
/* cortina: el farito se llena mientras carga (al entrar con correo y contraseña y al abrir la galería) */
function gCortina(min){
  let c=document.getElementById('gcor');
  if(!c){c=document.createElement('div');c.id='gcor';c.setAttribute('aria-hidden','true');
    c.innerHTML='<div class="ld-wrap"><div class="ld-mark"><div class="ld-base"></div><div class="ld-fill"></div></div></div>';document.body.append(c)}
  const t0=Date.now();let p=0,hecho=false;c.style.setProperty('--p','0');c.classList.add('on');
  const iv=setInterval(()=>{p+=(0.92-p)*.1;c.style.setProperty('--p',p.toFixed(3))},100);
  return{fin:async()=>{if(hecho)return;hecho=true;await gEspera(Math.max(0,(min||1400)-(Date.now()-t0)));clearInterval(iv);c.style.setProperty('--p','1');await gEspera(450);c.classList.remove('on')}};
}
/* cortina del ingreso: se prende al tocar «Entrar» y se apaga cuando la portada ya está lista */
function gCorIni(){try{if(window.GCOR)return window.GCOR;window.GCOR=gCortina(1500)}catch(e){window.GCOR=null}return window.GCOR}
async function gCorFin(){const c=window.GCOR;window.GCOR=null;if(c)await c.fin()}
async function gAbrirMuro(silencio){
  const b=$('#bver');if(!b||b.disabled)return;
  gMusicaPlay();
  let nueva=false;
  if(!G.abierta){
    nueva=true;b.disabled=true;
    const cor=silencio===true?null:gCortina(1500);
    try{await Promise.all([G.pre||enlaces(ST.arch.map(a=>a.id)),gCargarListas()]);await enlaces(ST.arch.map(a=>a.id))}catch(e){}
    try{G.carro=JSON.parse(gLS(gKey('faro_bolsa'))||'[]').filter(x=>ST.arch.some(a=>a.id===x.id))}catch(e){}
    G.abierta=true;const g=document.querySelector('.gal');if(!g){if(cor)cor.fin();return}
    g.classList.remove('pre','go');g.classList.add('abierta');
    gPintaMuro();gContratoPinta();gContadores();
    const mp=$('#gmus');if(mp&&G.au)mp.hidden=false;
    /* la portada queda como encabezado corto, arriba */
    window.scrollTo(0,0);if(G.onScroll)G.onScroll();
    /* primera vez: la carta de bienvenida ya está lista debajo de la cortina; se ve en cuanto ésta se abre */
    const hayTut=PREVIA?silencio!==true:!gLS(gKey('faro_tut')); /* en la vista previa siempre sale (no se guarda), para que lo revises */
    G.finOk=!hayTut;
    const bv=hayTut?gBienvenida():null;
    if(cor)await cor.fin();
    g.classList.add('go');gPortadaMueve(true);
    b.disabled=false;
    /* orden: bienvenida → tutorial (inmediato) → la galería empieza desde arriba; la reseña va al final */
    if(bv){await bv;await gEspera(150);gTutorial(true)}
  }
}
/* carta de bienvenida de Faro, antes del tutorial */
function gBienvenida(){
  return new Promise(res=>{
    const nom=(ST.perfil&&ST.perfil.nombre||'').split(' ')[0];
    const cuerpo=String(G.cfg.bienvenida||'').trim();
    const parr=cuerpo?cuerpo.split(/\n+/).map(t=>'<p>'+esc(t)+'</p>').join('')
      :'<p>Gracias por confiarnos un momento que te importa. Cuidamos cada foto como si fuera nuestra, y esperamos que al verlas vuelvas a sentir ese día.</p><p>Esta galería es tuya: guarda tus favoritas, descárgalas en alta calidad y compártelas con quien quieras.</p><p>Antes de empezar, te mostramos en un minuto cómo moverte por ella.</p>';
    const m=gModal('<div class="top"></div><div class="bd"><span class="iso"></span><div class="eti">BIENVENIDA</div><h2>'+(nom?'Hola, '+esc(nom):'Hola')+'</h2><div class="cuerpo">'+parr+'</div>'
      +'<div class="firma">Faro Studios<small>CON CARIÑO Y GRATITUD</small></div>'
      +'<div class="acts"><button class="btn2 b" id="gbvok">Comenzar</button></div></div>',false);
    m.firstChild.classList.add('carta');
    $('#gbvok',m).onclick=()=>m.cierra();
    const ob=new MutationObserver(()=>{if(!document.body.contains(m)){ob.disconnect();res()}});ob.observe(document.body,{childList:true});
  });
}
/* la reseña va al final: solo cuando ya no hay tutorial pendiente y la persona llegó al cierre bajando */
function gChequeaFin(){
  if(PREVIA||G.fin||!G.abierta||!G.finOk||document.querySelector('.gt,.gm'))return;
  const f=document.getElementById('gfin');if(!f)return;
  const r=f.getBoundingClientRect();
  if(((r.top<innerHeight*.6&&r.bottom>0)||innerHeight+scrollY>=document.documentElement.scrollHeight-60)&&scrollY>400)gLlegoAlFinal();
}
/* a mitad de la galería el regalo se abre solo una vez (por sesión) y se cierra solo; la pestaña se queda */
function gChequeaMedio(){
  const c=document.getElementById('gcod');
  if(!c||G.codVisto||!G.abierta||!G.finOk||document.querySelector('.gt,.gm,.glb,.gdr'))return;
  if(gSS(gKey('faro_cod'))){G.codVisto=true;return}
  const mu=document.getElementById('gmu');if(!mu)return;
  const r=mu.getBoundingClientRect(),medio=r.top+r.height*.5;
  if(medio<innerHeight*.62&&medio>-innerHeight*.2&&scrollY>400){
    G.codVisto=true;gSS(gKey('faro_cod'),'1');c.classList.add('abre');const b=document.getElementById('gcodb');if(b)b.setAttribute('aria-expanded','true');
    setTimeout(()=>{if(!c.matches(':hover')){c.classList.remove('abre');if(b)b.setAttribute('aria-expanded','false')}},9000);
  }
}
/* pestaña flotante con el código de descuento (lo cambia Faro en Workspace) */
function gCodigoHtml(cfg){
  const cod=String(cfg.codigo||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);if(!cod)return '';
  const n=+cfg.descuento,dt=n>0?n+'% de descuento':'tu descuento';
  return '<aside class="gcod" id="gcod" aria-label="Código de descuento"><button class="tb" id="gcodb" aria-expanded="false" aria-controls="gcodp">'+ic('gift')+'<span class="vt">Tu código</span></button>'
    +'<div class="pn" id="gcodp"><div class="in2"><button class="gcx" id="gcodx" type="button" aria-label="Cerrar">'+ic('x')+'</button><small>DESCUENTO PARA TI</small><b class="cdg">'+esc(cod)+'</b>'
    +'<p>Menciona este código al reservar tu próxima sesión y recibe <b>'+esc(dt)+'</b>.</p><p class="gvig">Vigencia de 5 meses desde la entrega de tu galería · tiene 2 usos: uno para ti y otro para un amigo.</p>'
    +'<div class="row"><button class="gbtn p" id="gcodc">'+ic('copy')+' Copiar</button><button class="gbtn" id="gcodw">'+ic('wa')+' Usarlo</button></div></div></div></aside>';
}
function gCodigoLiga(){
  const c=$('#gcod');if(!c)return;
  const cod=c.querySelector('.cdg').textContent,set=v=>{c.classList.toggle('abre',v);$('#gcodb').setAttribute('aria-expanded',String(v))};
  $('#gcodb').onclick=()=>set(!c.classList.contains('abre'));
  $('#gcodx').onclick=()=>{set(false);$('#gcodb').focus()};
  $('#gcodc').onclick=async()=>{try{await navigator.clipboard.writeText(cod);toast('Código copiado: '+cod)}catch(e){toast('Tu código es '+cod)}};
  $('#gcodw').onclick=()=>window.open(WA+'?text='+encodeURIComponent('Hola, quiero usar mi código de descuento '+cod),'_blank','noopener');
  if(!G.hookCod){G.hookCod=1;
    document.addEventListener('pointerdown',e=>{const x=document.getElementById('gcod');if(x&&x.classList.contains('abre')&&!x.contains(e.target)){x.classList.remove('abre');const b=document.getElementById('gcodb');if(b)b.setAttribute('aria-expanded','false')}});
    addEventListener('keydown',e=>{if(e.key==='Escape'){const x=document.getElementById('gcod');if(x)x.classList.remove('abre')}})}
}
/* ---------- música: pastilla flotante discreta (como Apple Music) ---------- */
function gTxtId3(d){
  if(!d.length)return'';const e=d[0],b=d.subarray(1);let t='';
  try{
    if(e===0)t=new TextDecoder('windows-1252').decode(b);
    else if(e===3)t=new TextDecoder('utf-8').decode(b);
    else{const be=e===2?!(b[0]===0xFF&&b[1]===0xFE):(b[0]===0xFE&&b[1]===0xFF),bom=(b[0]===0xFF&&b[1]===0xFE)||(b[0]===0xFE&&b[1]===0xFF);t=new TextDecoder(be?'utf-16be':'utf-16le').decode(bom?b.subarray(2):b)}
  }catch(x){}
  return t.replace(/\u0000/g,'').replace(/\0/g,'').trim();
}
async function gId3(url){
  try{
    const r=await fetch(url,{headers:{Range:'bytes=0-786431'}});if(!r.ok)return null;
    const b=new Uint8Array(await r.arrayBuffer());
    if(b[0]!==0x49||b[1]!==0x44||b[2]!==0x33)return null;
    const v=b[3],sz=((b[6]&127)<<21)|((b[7]&127)<<14)|((b[8]&127)<<7)|(b[9]&127);
    let p=10;const fin=Math.min(b.length,10+sz),o={};
    if(b[5]&0x40){p+=v===4?(((b[10]&127)<<21)|((b[11]&127)<<14)|((b[12]&127)<<7)|(b[13]&127)):((b[10]<<24)|(b[11]<<16)|(b[12]<<8)|b[13])+4}
    while(p+10<=fin){
      const id=String.fromCharCode(b[p],b[p+1],b[p+2],b[p+3]);if(!/^[A-Z0-9]{4}$/.test(id))break;
      const fs=v===4?(((b[p+4]&127)<<21)|((b[p+5]&127)<<14)|((b[p+6]&127)<<7)|(b[p+7]&127)):(b[p+4]*16777216+(b[p+5]<<16)+(b[p+6]<<8)+b[p+7]);
      if(!fs)break;const d=b.subarray(p+10,p+10+fs),completo=p+10+fs<=b.length;p+=10+fs;
      if(id==='TIT2')o.titulo=gTxtId3(d);else if(id==='TPE1')o.artista=gTxtId3(d);else if(id==='TALB')o.album=gTxtId3(d);
      else if(id==='APIC'&&completo&&!o.cover){
        const e=d[0];let k=1;while(k<d.length&&d[k])k++;const mime=String.fromCharCode(...d.subarray(1,k));k+=2;
        if(e===1||e===2){while(k+1<d.length&&(d[k]||d[k+1]))k+=2;k+=2}else{while(k<d.length&&d[k])k++;k++}
        if(k<d.length)o.cover=URL.createObjectURL(new Blob([d.subarray(k)],{type:/^image\//.test(mime)?mime:'image/jpeg'}));
      }
    }
    return o;
  }catch(e){return null}
}
function gMusicaTitulo(){
  const m=(G.meta&&G.meta[G.mi])||{},l=G.lista&&G.lista[G.mi];if(!l||!$('#gmus'))return;
  $('#gmt').textContent=m.titulo||l.nombre.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ');
  $('#gma').textContent=[m.artista,m.album].filter(Boolean).join(' · ');
  const cv=$('#gmcv');if(m.cover){cv.style.backgroundImage='url('+m.cover+')';cv.classList.add('im')}else{cv.style.backgroundImage='';cv.classList.remove('im')}
}
function gMusicaSync(){
  const pill=$('#gmus'),au=G.au;if(!pill||!au)return;
  pill.classList.toggle('on',!au.paused&&!au.muted);
  const bt=$('#gmp');if(bt){bt.innerHTML=ic(au.muted?'mute':'vol');bt.setAttribute('aria-label',au.muted?'Activar el sonido':'Silenciar la música')}
}
/* hasta 3 canciones: suenan en orden y en bucle. El cliente solo puede silenciar (no pausar, adelantar ni cambiar). */
async function gMusicaPrep(){
  const c=G.cfg;if(!c||!(c.musicas&&c.musicas.length||c.musica)||!ST.p||ST.p.id==='pub')return;
  try{
    if(SES&&SES.exp-60000<Date.now())await refreshSes();
    const r=await fetch(FILES+'/api/mi/musica',{method:'POST',headers:{Authorization:'Bearer '+SES.access,'Content-Type':'application/json'},body:JSON.stringify({proyecto:ST.p.id})});
    if(!r.ok)return;const j=await r.json();const lista=j.musicas||(j.musica?[j.musica]:[]);if(!lista.length||!$('#gmus'))return;
    G.lista=lista;G.mi=0;G.meta=[];
    const au=new Audio();au.preload='auto';au.volume=.6;au.muted=gLS(gKey('faro_mus'))==='0';au.src=lista[0].url;G.au=au;
    gMusicaTitulo();
    lista.forEach((l,i)=>gId3(l.url).then(t=>{if(t){G.meta[i]=t;if(G.mi===i)gMusicaTitulo()}}));
    au.addEventListener('play',gMusicaSync);au.addEventListener('pause',gMusicaSync);au.addEventListener('volumechange',gMusicaSync);
    au.addEventListener('ended',()=>{G.mi=(G.mi+1)%lista.length;au.src=lista[G.mi].url;gMusicaTitulo();au.play().catch(()=>{})});
    $('#gmp').onclick=()=>{au.muted=!au.muted;gLS(gKey('faro_mus'),au.muted?'0':'1');if(au.paused)au.play().catch(()=>{})};
    if(!G.hookV){G.hookV=1;
      document.addEventListener('play',e=>{if(e.target&&e.target.tagName==='VIDEO'&&!e.target.muted&&G.au&&!G.au.paused){G.au.pause();G.porVideo=true}},true);
      const sigue=e=>{if(e.target&&e.target.tagName==='VIDEO'&&G.porVideo&&G.au){G.porVideo=false;G.au.play().catch(()=>{})}};
      document.addEventListener('pause',sigue,true);document.addEventListener('ended',sigue,true)}
    const vigila=setInterval(()=>{if(!document.getElementById('gmus')){au.pause();clearInterval(vigila)}},1500);
    gMusicaSync();
    if(G.abierta)$('#gmus').hidden=false;
    if(G.quiere)gMusicaPlay();
  }catch(e){}
}
function gMusicaPlay(){
  G.quiere=true;const au=G.au;if(!au)return;
  const mp=$('#gmus');if(mp&&G.abierta)mp.hidden=false;
  const q=au.play();
  if(q&&q.catch)q.catch(()=>{const reintenta=()=>{au.play().catch(()=>{})};document.addEventListener('pointerdown',reintenta,{once:true})});
}
function gContadores(){
  const lc=$('#glc');if(lc){const n=ST.favs.size;lc.textContent=n;lc.hidden=!n}
  const bc=$('#gbc');if(bc){const n=G.carro.reduce((s,x)=>s+x.cant,0);bc.textContent=n;bc.hidden=!n}
}

/* ---------- muro: cuadrícula y editorial ---------- */
function gVisibles(){
  let v=ST.arch.filter(a=>(a.tipo==='imagen'||a.tipo==='video')&&!gAparte().has(a.id));
  if(G.filtro){const l=G.listas.find(x=>x.id===G.filtro);v=l?v.filter(a=>l.ids.has(a.id)):v}
  return v;
}
/* editorial: cada foto conserva su proporción real (nada se recorta). Filas de altura igual con ritmo fijo de tres tamaños:
   1 foto (grande), 2 (mediana) y 3 (pequeña). La primera va sola, como portada del muro. En el teléfono: 1, 2, 2. */
const GED_D=[2,3,2,1,3,2],GED_M=[2,2,1];
function gFilasEd(n,movil){
  const pat=movil?GED_M:GED_D,f=[1];let q=n-1,k=0;
  while(q>0){const c=Math.min(pat[k%pat.length],q);f.push(c);q-=c;k++}
  return f;
}
const gArIni=a=>a.tipo==='video'?1.778:1.5;
function gTile(a,i,cap){
  const l=gLink(a.id),on=ST.favs.has(a.id),vid=a.tipo==='video';
  return '<div class="gph" data-i="'+i+'"><button class="ver" aria-label="Abrir foto '+(i+1)+'">'
    +(vid?'<video src="'+esc(l.urlVer||'')+'#t=0.1" preload="metadata" muted playsinline></video><span class="vid">'+ic('play')+'</span>':'<img loading="lazy" decoding="async" alt="" src="'+esc(l.urlMini||l.urlVer||'')+'">')+'</button>'
    +'<div class="acts"><button class="gh'+(on?' on':'')+'" data-a="fav" data-id="'+a.id+'" aria-label="Guardar en una lista">'+ic('heart')+'</button>'
    +(vid?'':'<button class="gi" data-a="ig" data-id="'+a.id+'" aria-label="A mi historia de Instagram">'+ic('ig')+'</button>')
    +'<button data-a="dl" data-id="'+a.id+'" aria-label="Descargar">'+ic('dl')+'</button></div></div>'+(cap||'');
}
/* fotos casi cuadradas: en cuadrícula se recortan un poco distinto para que no quede una rejilla perfecta (solo al mostrarlas; al abrirlas se ven completas) */
const GAR=['1/1','4/5','5/4','5/6','1/1','6/5','4/5','1/1','5/4'];
/* en el teléfono (2 columnas) todas las fotos cambian de tamaño en ritmo de tres: nunca queda una rejilla igual */
const GARM={v:['2/3','4/5','1/1'],h:['3/2','5/4','1/1'],c:['2/3','1/1','4/5']};
function gVaria(im){
  const t=im.closest('.gph');if(!t||G.vista==='editorial'||!im.naturalWidth)return;
  const r=im.naturalWidth/im.naturalHeight,i=+t.dataset.i||0;
  if(matchMedia('(max-width:720px)').matches){
    const set=r<.92?GARM.v:r>1.08?GARM.h:GARM.c;
    t.style.setProperty('--ar',set[i%3]);t.classList.add('va');return}
  if(r<.92||r>1.08)return;
  t.style.setProperty('--ar',GAR[i%GAR.length]);t.classList.add('va');
}
/* proporciones reales de las fotos: se leen de las miniaturas (ya van a cargarse igual) y se guardan para no repetirlo */
G.ars={};
function gArFija(fig,w,h){
  if(!fig||!w||!h)return;const r=+(w/h).toFixed(4);G.ars[fig.dataset.id]=r;if(fig.style.getPropertyValue('--ar')!==String(r))fig.style.setProperty('--ar',r);
}
function gArsCarga(v){
  const cola=v.filter(a=>a.tipo==='imagen'&&!G.ars[a.id]);let act=0;const tk=G.tkAr=(G.tkAr||0)+1;
  const sig=()=>{while(act<6&&cola.length&&tk===G.tkAr){const a=cola.shift(),l=gLink(a.id),u=l&&(l.urlMini||l.urlVer);if(!u)continue;act++;
    const im=new Image();const fin=()=>{act--;sig()};
    im.onload=()=>{const f=document.querySelector('.ged figure[data-id="'+a.id+'"]');G.ars[a.id]=+(im.naturalWidth/im.naturalHeight).toFixed(4);if(f)f.style.setProperty('--ar',G.ars[a.id]);fin()};im.onerror=fin;im.src=u}};
  sig();
}
function gPintaMuro(){
  const cu=$('#gcuerpo'),fl=$('#gfl');if(!cu)return;
  document.querySelectorAll('#gvista button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===G.vista)));
  const lf=G.filtro&&G.listas.find(x=>x.id===G.filtro);
  fl.innerHTML=lf?'<div class="gfiltro"><button id="gqf">'+ic('heart')+' Viendo: '+esc(lf.nombre)+' · '+lf.ids.size+' '+ic('x')+'</button></div>':'';
  if(lf)$('#gqf').onclick=()=>{G.filtro=null;gPintaMuro()};
  const v=gVisibles();
  if(!v.length){cu.innerHTML='<p style="text-align:center;opacity:.7;padding:40px">Esta lista aún no tiene fotos. Toca el corazón en las que más te gusten.</p>';return}
  if(G.vista==='editorial'){
    const filas=gFilasEd(v.length,matchMedia('(max-width:720px)').matches);let p=0;
    cu.innerHTML='<div class="ged">'+filas.map(c=>{
      const fs=v.slice(p,p+c).map((a,x)=>'<figure'+(c===1?' class="uno"':'')+' style="--ar:'+(G.ars&&G.ars[a.id]||gArIni(a))+'" data-id="'+a.id+'">'+gTile(a,p+x)+'</figure>').join('');
      p+=c;return '<div class="er">'+fs+'</div>';
    }).join('')+'</div>';
    gArsCarga(v);
  }else{
    cu.innerHTML='<div class="gcol">'+v.map((a,i)=>gTile(a,i)).join('')+'</div>';
  }
  cu.querySelectorAll('img').forEach(im=>{const ok=()=>{im.classList.add('ok');gVaria(im);gArFija(im.closest('figure'),im.naturalWidth,im.naturalHeight)};im.complete?ok():im.onload=ok;im.onerror=()=>im.classList.add('ok')});
  cu.querySelectorAll('.gph').forEach(t=>{
    t.querySelector('.ver').onclick=()=>gAbrirVisor(+t.dataset.i);
    t.querySelectorAll('.acts button').forEach(b=>b.onclick=e=>{e.stopPropagation();const a=ST.arch.find(x=>x.id===b.dataset.id);
      if(b.dataset.a==='fav')gAbrirGuardar(a);else if(b.dataset.a==='ig')gAbrirHistoria(a);else gAbrirDescarga('una',a)});
  });
  if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('gvisto');io.unobserve(e.target)}}),{rootMargin:'0px 0px -5% 0px',threshold:.04});
    cu.querySelectorAll('.gph').forEach(t=>{t.classList.add('gaparece');io.observe(t)});
    setTimeout(()=>cu.querySelectorAll('.gph.gaparece:not(.gvisto)').forEach(t=>t.classList.add('gvisto')),4000);
  }
  gContadores();
}
/* espacio del contrato: aparece al final solo si Faro subió un PDF a la galería */
function gContratoPinta(){
  const c=$('#gcon');if(!c)return;
  const pdfs=ST.arch.filter(a=>a.tipo==='pdf'&&gLink(a.id).urlVer);
  if(!pdfs.length){c.hidden=true;c.innerHTML='';return}
  c.hidden=false;
  c.innerHTML=pdfs.map((a,i)=>'<div class="cc">'+ic('file')+'<div class="tt"><b>Tu contrato</b><small>'+esc(a.nombre)+'</small></div><div class="row"><button class="gbtn" data-k="ver" data-i="'+i+'">'+ic('eye')+' Ver</button>'+(gLink(a.id).url?'<button class="gbtn p" data-k="dl" data-i="'+i+'">'+ic('dl')+' Descargar</button>':'')+'</div></div>').join('');
  c.querySelectorAll('button').forEach(b=>b.onclick=()=>{const a=pdfs[+b.dataset.i],l=gLink(a.id);
    if(b.dataset.k==='ver')window.open(l.urlVer,'_blank','noopener');
    else{const x=document.createElement('a');x.href=l.url;x.rel='noopener';document.body.append(x);x.click();x.remove()}});
}
function gRefrescaCorazones(){
  document.querySelectorAll('[data-a="fav"]').forEach(b=>b.classList.toggle('on',ST.favs.has(b.dataset.id)));
  const lh=$('#glbh');if(lh)lh.classList.toggle('on',ST.favs.has(lh.dataset.id));gContadores();
}

/* ---------- visor ---------- */
function gAbrirVisor(i){
  const v=gVisibles();let k=i;
  const lb=document.createElement('div');lb.className='glb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');
  document.body.append(lb);document.body.style.overflow='hidden';
  const pinta=()=>{const a=v[k],l=gLink(a.id),img=a.tipo==='imagen';
    lb.innerHTML='<div class="bar"><span>'+(k+1)+' / '+v.length+'</span>'
     +'<button id="glbh" data-id="'+a.id+'" class="'+(ST.favs.has(a.id)?'on':'')+'" aria-label="Guardar en una lista">'+ic('heart')+'<span class="t">Guardar</span></button>'
     +(img?'<button id="glbi" aria-label="A mi historia de Instagram">'+ic('ig')+'<span class="t">Historia</span></button>':'')
     +'<button id="glbd" aria-label="Descargar">'+ic('dl')+'<span class="t">Descargar</span></button>'
     +(img?'<button id="glbp" aria-label="Pedir impresión">'+ic('bag')+'<span class="t">Imprimir</span></button>':'')
     +'<button id="glbx" aria-label="Cerrar">'+ic('x')+'</button></div>'
     +'<div class="st"><button class="nv l" id="glbl" aria-label="Anterior">'+ic('prev')+'</button>'
     +(a.tipo==='video'?'<video controls autoplay playsinline src="'+esc(l.urlVer)+'"></video>':'<img alt="" src="'+esc(l.urlVer)+'">')
     +'<button class="nv r" id="glbn" aria-label="Siguiente">'+ic('next')+'</button></div>'+(img?gMetaHtml(a)||'<div class="gmeta" style="opacity:.0;min-height:44px"></div>':'<div class="gmeta" style="opacity:0;min-height:44px"></div>');
    $('#glbx',lb).onclick=cierra;$('#glbl',lb).onclick=()=>ir(-1);$('#glbn',lb).onclick=()=>ir(1);
    $('#glbh',lb).onclick=()=>gAbrirGuardar(a);$('#glbd',lb).onclick=()=>gAbrirDescarga('una',a);
    const bi=$('#glbi',lb);if(bi)bi.onclick=()=>gAbrirHistoria(a);
    const bp=$('#glbp',lb);if(bp)bp.onclick=()=>{gAgregaCarro(a.id);toast('Agregada a tus impresiones')};
    const ni=v[(k+1)%v.length],nl=gLink(ni.id);if(nl.urlVer&&ni.tipo==='imagen'){const pre=new Image();pre.src=nl.urlVer}};
  const ir=d=>{k=(k+d+v.length)%v.length;pinta()};
  const cierra=()=>{lb.remove();if(!document.querySelector('.gm,.gdr,.gt'))document.body.style.overflow='';removeEventListener('keydown',tecla)};
  const tecla=e=>{if(document.body.lastElementChild!==lb)return;if(e.key==='Escape')cierra();else if(e.key==='ArrowLeft')ir(-1);else if(e.key==='ArrowRight')ir(1)};
  addEventListener('keydown',tecla);
  let x0=null;lb.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
  lb.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>60)ir(dx<0?1:-1)});
  pinta();
}

/* ================= LISTAS ================= */
async function gCargarListas(){
  const p=ST.p;G.listas=[];
  const ls=await rows('en_listas','proyecto_id=eq.'+p.id+'&select=id,nombre,token,creado&order=creado.asc');
  if(ls.length){
    const fs=await rows('en_lista_fotos','lista_id=in.('+ls.map(l=>l.id).join(',')+')&select=lista_id,archivo_id');
    G.listas=ls.map(l=>({...l,ids:new Set(fs.filter(f=>f.lista_id===l.id).map(f=>f.archivo_id))}));
  }
  /* favoritas de la versión anterior pasan a "Mis favoritas" la primera vez */
  const enListas=new Set();G.listas.forEach(l=>l.ids.forEach(x=>enListas.add(x)));
  const sueltas=[...ST.favs].filter(x=>!enListas.has(x));
  if(sueltas.length&&!G.listas.length)await gListaNueva('Mis favoritas',sueltas,true);
  ST.favs=new Set([...enListas,...sueltas]);
}
async function gListaNueva(nombre,ids,silencio){
  if(G.listas.length>=5){toast('Máximo 5 listas');return null}
  nombre=String(nombre||'').trim().slice(0,40);if(!nombre)return null;
  try{
    const r=await api('/rest/v1/en_listas',{method:'POST',body:{proyecto_id:ST.p.id,nombre},headers:{Prefer:'return=representation'}});
    if(!r.ok){if(!silencio)toast('No se pudo crear la lista. Escríbenos y lo revisamos.');return null}
    const l=(await r.json())[0];l.ids=new Set();G.listas.push(l);
    for(const id of (ids||[]))await gEnLista(l,id,true,true);
    return l;
  }catch(e){return null}
}
async function gEnLista(l,archId,on,sinUI){
  const ya=l.ids.has(archId);if(on===ya)return true;
  const r=on?await api('/rest/v1/en_lista_fotos',{method:'POST',body:{lista_id:l.id,archivo_id:archId},headers:{Prefer:'return=minimal'}})
            :await api('/rest/v1/en_lista_fotos?lista_id=eq.'+l.id+'&archivo_id=eq.'+archId,{method:'DELETE',headers:{Prefer:'return=minimal'}});
  if(!r.ok&&r.status!==409){toast('No se pudo guardar');return false}
  on?l.ids.add(archId):l.ids.delete(archId);
  /* "favoritas" = está en alguna lista (así Faro ve lo que más gustó) */
  const any=G.listas.some(x=>x.ids.has(archId)),tenia=ST.favs.has(archId);
  if(any&&!tenia){await api('/rest/v1/en_favoritos',{method:'POST',body:{archivo_id:archId},headers:{Prefer:'return=minimal'}}).catch(()=>{});ST.favs.add(archId)}
  if(!any&&tenia){await api('/rest/v1/en_favoritos?archivo_id=eq.'+archId,{method:'DELETE',headers:{Prefer:'return=minimal'}}).catch(()=>{});ST.favs.delete(archId)}
  if(!sinUI){gRefrescaCorazones();if(G.filtro===l.id&&!on)gPintaMuro()}
  return true;
}
async function gAbrirGuardar(a){
  if(!a)return;
  if(!G.listas.length){const l=await gListaNueva('Mis favoritas',[],false);if(!l)return;await gEnLista(l,a.id,true)}
  const m=gModal('<div class="top"></div><div class="bd" style="justify-items:stretch;text-align:left"><h2 style="text-align:center">Guardar en una lista</h2><p style="text-align:center;margin:0 auto">Toca para añadir o quitar esta foto. Puedes tener hasta 5 listas.</p><div class="sel" id="gsl"></div><div id="gsn"></div></div>'+gX);
  const pinta=()=>{
    $('#gsl',m).innerHTML=G.listas.map(l=>'<button class="it" role="checkbox" aria-checked="'+l.ids.has(a.id)+'" data-id="'+l.id+'"><i>'+(l.ids.has(a.id)?ic('check'):'')+'</i><span>'+esc(l.nombre)+'</span><small>'+l.ids.size+' '+(l.ids.size===1?'foto':'fotos')+'</small></button>').join('');
    $('#gsn',m).innerHTML=G.listas.length<5?'<div style="display:flex;gap:8px;margin-top:10px"><input type="text" id="gnl" maxlength="40" placeholder="Crear lista nueva ('+(G.listas.length)+' de 5)"><button class="btn2 p" id="gnb" style="min-height:50px;padding:0 18px">'+ic('plus')+'</button></div>':'';
    m.querySelectorAll('.sel .it').forEach(b=>b.onclick=async()=>{const l=G.listas.find(x=>x.id===b.dataset.id);await gEnLista(l,a.id,!l.ids.has(a.id));pinta()});
    const nb=$('#gnb',m);if(nb)nb.onclick=async()=>{const t=$('#gnl',m).value;const l=await gListaNueva(t,[a.id]);if(l){gRefrescaCorazones();pinta()}};
  };
  pinta();
}
function gUrlLista(l){return location.origin+location.pathname.replace(/[^/]*$/,'entregas').replace(/\/entregas\.html$/,'/entregas')+'?lista='+l.token}
async function gCompartir(l){
  const url=gUrlLista(l),txt='Mira estas fotos: '+(l.nombre)+' · Faro Studios';
  if(navigator.share){try{await navigator.share({title:l.nombre,text:txt,url});return}catch(e){if(e&&e.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(url);toast('Enlace copiado. Pégalo donde quieras compartirlo')}catch(e){prompt('Copia este enlace privado:',url)}
}
function gAbrirListas(){
  const m=gModal('<div class="top"></div><div class="bd" style="justify-items:stretch"><div class="eti" style="text-align:center">COMO TUS PLAYLISTS</div><h2>Mis listas</h2><p style="margin:0 auto">Hasta cinco. Cada una tiene su enlace privado para compartirla con quien tú quieras, sin que vea el resto de la sesión.</p><div class="lis" id="gll"></div><div id="gln"></div></div>'+gX);
  const pinta=()=>{
    $('#gll',m).innerHTML=G.listas.length?G.listas.map(l=>{const ims=[...l.ids].slice(0,4).map(id=>'<img alt="" src="'+esc(gLink(id).urlMini||gLink(id).urlVer||'')+'">').join('');
      return '<div class="it" data-id="'+l.id+'"><div class="mos">'+ims+'</div><div class="nm">'+esc(l.nombre)+'<small>'+l.ids.size+' '+(l.ids.size===1?'foto':'fotos')+' · enlace privado</small></div>'
       +'<button data-a="ver" aria-label="Ver esta lista">'+ic('eye')+'</button><button data-a="sh" aria-label="Compartir esta lista">'+ic('share')+'</button><button data-a="del" aria-label="Borrar esta lista" style="color:#3A3A3A">'+ic('trash')+'</button></div>'}).join('')
      :'<p style="text-align:center">Aún no tienes listas. Toca el corazón de una foto para empezar.</p>';
    $('#gln',m).innerHTML=G.listas.length<5?'<div style="display:flex;gap:8px;margin-top:12px"><input type="text" id="gnl" maxlength="40" placeholder="Crear lista nueva ('+G.listas.length+' de 5)"><button class="btn2 p" id="gnb" style="min-height:50px;padding:0 18px">'+ic('plus')+'</button></div>':'';
    m.querySelectorAll('.lis .it button').forEach(b=>b.onclick=async()=>{const id=b.closest('.it').dataset.id,l=G.listas.find(x=>x.id===id);
      if(b.dataset.a==='ver'){G.filtro=id;m.cierra();gPintaMuro();$('#gmu').scrollIntoView({behavior:'smooth'})}
      else if(b.dataset.a==='sh'){if(!l.ids.size){toast('Agrega fotos a la lista para compartirla');return}gCompartir(l)}
      else if(confirm('¿Borrar la lista "'+l.nombre+'"? Las fotos no se borran.')){const r=await api('/rest/v1/en_listas?id=eq.'+id,{method:'DELETE',headers:{Prefer:'return=minimal'}});
        if(!r.ok){toast('No se pudo borrar');return}
        const ids=[...l.ids];G.listas=G.listas.filter(x=>x.id!==id);
        for(const a of ids){if(!G.listas.some(x=>x.ids.has(a))&&ST.favs.has(a)){ST.favs.delete(a);api('/rest/v1/en_favoritos?archivo_id=eq.'+a,{method:'DELETE',headers:{Prefer:'return=minimal'}}).catch(()=>{})}}
        if(G.filtro===id)G.filtro=null;gPintaMuro();pinta()}});
    const nb=$('#gnb',m);if(nb)nb.onclick=async()=>{const l=await gListaNueva($('#gnl',m).value,[]);if(l)pinta()};
  };
  pinta();
}

/* ================= DESCARGAR ================= */
let gJSZip=null;
const gCargaZip=()=>gJSZip||(gJSZip=new Promise((ok,mal)=>{if(window.JSZip)return ok(window.JSZip);const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';s.onload=()=>ok(window.JSZip);s.onerror=()=>{gJSZip=null;mal(new Error('zip'))};document.head.append(s)}));
const gBajaBlob=(blob,nombre)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=nombre;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)};
async function gReescala(blob,lado){
  const bm=await createImageBitmap(blob),k=Math.min(1,lado/Math.max(bm.width,bm.height));
  if(k>=1){bm.close&&bm.close();return blob}
  const c=document.createElement('canvas');c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);
  c.getContext('2d').drawImage(bm,0,0,c.width,c.height);bm.close&&bm.close();
  return await new Promise(r=>c.toBlob(r,'image/jpeg',.92));
}
const gNombreBase=n=>String(n||'foto').replace(/\.[^.]+$/,'');
async function gAbrirDescarga(modo,una){
  const imgs=gImgs();if(!imgs.length&&!una){toast('Aún no hay fotos para descargar');return}
  const ref=una||imgs[0];let dim=null,peso=0;
  const sinFija=!!una;
  const tams={original:{n:'Original',uso:'Para imprimir grande',lado:0},alta:{n:'Alta',uso:'Pantalla e impresión',lado:3600},web:{n:'Web y redes',uso:'WhatsApp e Instagram',lado:2048}};
  const S={modo:modo||'todas',tam:'alta',lista:(G.listas.find(l=>l.ids.size)||{}).id||null};
  const m=gModal('<div class="top"></div><div class="bd" style="justify-items:stretch"><div class="eti" style="text-align:center">TUS FOTOS EN ALTA CALIDAD</div><h2>Descargar</h2><p style="margin:0 auto">Sin marcas de agua. Elige qué descargar y en qué tamaño.</p>'
    +'<div class="modos" id="gdm"></div><div id="gdl2" style="display:grid;gap:10px"></div><div class="eti" style="text-align:center;margin-top:6px">ELIGE EL TAMAÑO</div><div class="tams" id="gdt"></div><div class="nota" id="gdn"></div>'
    +'<div id="gdp" hidden><div class="prog"><i id="gdb" style="width:0"></i></div><p id="gdq" style="margin:8px auto 0;font-size:.9rem"></p></div>'
    +'<div class="acts" style="justify-content:space-between;margin-top:8px"><button class="txt" data-x>Cancelar</button><button class="btn2 p" id="gdo">'+ic('dl')+' <span id="gdot">Descargar</span></button></div></div>'+gX,true);
  const cantidad=()=>S.modo==='una'?1:S.modo==='lista'?((G.listas.find(l=>l.id===S.lista)||{ids:new Set()}).ids.size):imgs.length;
  const pinta=()=>{
    const modos=sinFija?[['una','Esta foto']]:[['todas','Todas · ZIP'],['lista','Una lista']];
    $('#gdm',m).innerHTML=modos.map(x=>'<button data-m="'+x[0]+'" aria-pressed="'+(S.modo===x[0])+'">'+x[1]+'</button>').join('');
    $('#gdl2',m).innerHTML=S.modo==='lista'?(G.listas.length?'<div class="modos">'+G.listas.map(l=>'<button data-l="'+l.id+'" aria-pressed="'+(S.lista===l.id)+'">'+esc(l.nombre)+' · '+l.ids.size+'</button>').join('')+'</div>':'<p style="margin:0 auto">Todavía no tienes listas.</p>'):'';
    const wh=dim?dim:{w:0,h:0},mb0=peso?peso/1048576:0;
    $('#gdt',m).innerHTML=Object.entries(tams).map(([k,t])=>{
      let w=wh.w,h=wh.h;if(t.lado&&w){const kk=Math.min(1,t.lado/Math.max(w,h));w=Math.round(w*kk);h=Math.round(h*kk)}
      const mp=w?(w*h/1e6).toFixed(1)+' megapíxeles':'—',res=w?w+' × '+h+' px':'Se mide al abrir';
      const mb=mb0?(mb0*(w&&wh.w?(w*h)/(wh.w*wh.h):1)*(k==='original'?1:.9)):0;
      return '<button data-t="'+k+'" aria-pressed="'+(S.tam===k)+'"><b>'+t.n+'</b><span>'+t.uso+'</span><em>'+res+'</em><span>'+mp+'</span><span>'+(mb?'≈ '+(mb<10?mb.toFixed(1):Math.round(mb))+' MB por foto':'')+'</span></button>'}).join('');
    const n=cantidad(),tot=mb0?(n*mb0*(S.tam==='original'?1:(S.tam==='alta'?.45:.12))):0;
    $('#gdn',m).innerHTML='<b>'+n+(n===1?' foto':' fotos')+' · tamaño '+tams[S.tam].n+(tot&&n>1?' · aprox. '+(tot<10?tot.toFixed(1):Math.round(tot))+' MB en total':'')+'</b><br>'+(S.modo==='una'?'Se guarda en tu dispositivo. En el teléfono toca la foto y elige “Guardar en Fotos”.':'Se descarga en un archivo ZIP. En iPhone es mejor bajar por listas o una por una.')+' “Alta” se ve perfecta en pantalla; “Original” es para imprimir en grande.';
    $('#gdot',m).textContent=S.modo==='una'?'Descargar foto':'Descargar '+n+' fotos';
    m.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{S.modo=b.dataset.m;pinta()});
    m.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{S.lista=b.dataset.l;pinta()});
    m.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{S.tam=b.dataset.t;pinta()});
  };
  pinta();
  /* medidas reales de la primera foto */
  (async()=>{try{const l=gLink(ref.id);if(!l.urlVer)return;const hd=await fetch(l.urlVer,{method:'HEAD'});peso=+hd.headers.get('content-length')||0;
    const im=new Image();im.onload=()=>{dim={w:im.naturalWidth,h:im.naturalHeight};if(document.body.contains(m))pinta()};im.src=l.urlVer;if(document.body.contains(m))pinta()}catch(e){}})();
  $('#gdo',m).onclick=async()=>{
    const ids=S.modo==='una'?[ref]:S.modo==='lista'?imgs.filter(a=>(G.listas.find(l=>l.id===S.lista)||{ids:new Set()}).ids.has(a.id)):imgs;
    if(!ids.length){toast('No hay fotos para descargar');return}
    const bt=$('#gdo',m);bt.disabled=true;const pr=$('#gdp',m);pr.hidden=false;
    const avance=(h,t,tx)=>{$('#gdb',m).style.width=Math.round(h/t*100)+'%';$('#gdq',m).textContent=tx||('Preparando '+h+' de '+t+'…')};
    try{
      const lado=tams[S.tam].lado;
      if(S.modo==='una'){
        const l=gLink(ref.id);
        if(!lado){if(!l.url){toast('No se pudo preparar la descarga');bt.disabled=false;return}const a=document.createElement('a');a.href=l.url;a.rel='noopener';document.body.append(a);a.click();a.remove();m.cierra();return}
        avance(0,1,'Preparando tu foto…');const b=await (await fetch(l.urlVer)).blob();const out=await gReescala(b,lado);gBajaBlob(out,gNombreBase(ref.nombre)+'-'+S.tam+'.jpg');m.cierra();return;
      }
      const Z=await gCargaZip();const PARTE=40,partes=Math.ceil(ids.length/PARTE);let hechas=0;
      for(let p=0;p<partes;p++){
        const zip=new Z(),lote=ids.slice(p*PARTE,(p+1)*PARTE),cola=[...lote.entries()];
        const obr=Array.from({length:3},async()=>{while(cola.length){const[i,a]=cola.shift();const l=gLink(a.id);
          try{const r=await fetch(lado?l.urlVer:(l.url||l.urlVer));let b=await r.blob();if(lado&&a.tipo==='imagen')b=await gReescala(b,lado);
            const ext=lado&&a.tipo==='imagen'?'jpg':((a.nombre.match(/\.[a-z0-9]+$/i)||['.jpg'])[0]);zip.file(String(p*PARTE+i+1).padStart(3,'0')+'-'+gNombreBase(a.nombre)+ext,b)}catch(e){}
          hechas++;avance(hechas,ids.length)}});
        await Promise.all(obr);
        avance(hechas,ids.length,'Armando el archivo ZIP'+(partes>1?' (parte '+(p+1)+' de '+partes+')':'')+'…');
        const blob=await zip.generateAsync({type:'blob',compression:'STORE'});
        gBajaBlob(blob,'Faro-Studios-'+gNombreBase(ST.p.titulo).replace(/\s+/g,'-')+'-'+S.tam+(partes>1?'-parte'+(p+1):'')+'.zip');
        await new Promise(r=>setTimeout(r,600));
      }
      toast('Listo. Revisa tus descargas');m.cierra();
    }catch(e){toast('No se pudo preparar la descarga. Intenta con menos fotos o una por una.');bt.disabled=false;pr.hidden=true}
  };
}

/* ================= HISTORIA DE INSTAGRAM ================= */
async function gHistoriaArchivo(a){
  const l=gLink(a.id);const b=await (await fetch(l.urlVer)).blob();const bm=await createImageBitmap(b);
  const c=document.createElement('canvas');c.width=1080;c.height=1920;const x=c.getContext('2d');
  const gr=x.createLinearGradient(0,0,0,1920);gr.addColorStop(0,'#1a1a1d');gr.addColorStop(1,'#0e0e10');x.fillStyle=gr;x.fillRect(0,0,1080,1920);
  const k=Math.min(1080/bm.width,1500/bm.height),w=bm.width*k,h=bm.height*k;x.drawImage(bm,(1080-w)/2,(1920-h)/2-40,w,h);
  x.fillStyle='#B8A06A';x.font='400 34px Lato, sans-serif';x.textAlign='center';
  if('letterSpacing' in x)x.letterSpacing='10px';x.fillText('FARO STUDIOS',540,1820);
  bm.close&&bm.close();
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));
  return{canvas:c,file:new File([blob],'historia-faro.jpg',{type:'image/jpeg'})};
}
async function gAbrirHistoria(a){
  if(!a||a.tipo!=='imagen')return;
  const m=gModal('<div class="top"></div><div class="bd"><div class="eti">COMPARTIR</div><h2>A tu historia</h2><div class="hist" id="ghc"></div><p style="margin:0;font-size:.88rem">Formato vertical 9:16 con la firma de Faro.</p>'
    +'<div class="acts" style="flex-direction:column;align-items:stretch"><button class="btn2 b" id="gha" disabled>'+ic('ig')+' Abrir Instagram</button><button class="btn2" id="ghs" disabled>Solo guardar en fotos</button></div>'
    +'<p style="margin:0;font-size:.82rem">Instagram no deja publicar de forma automática: tú siempre revisas y confirmas la historia.</p></div>'+gX);
  let H;try{H=await gHistoriaArchivo(a)}catch(e){toast('No se pudo preparar la imagen');m.cierra();return}
  $('#ghc',m).append(H.canvas);$('#gha',m).disabled=false;$('#ghs',m).disabled=false;
  const compartir=async()=>{
    if(navigator.canShare&&navigator.canShare({files:[H.file]})){try{await navigator.share({files:[H.file]});return true}catch(e){if(e&&e.name==='AbortError')return true}}
    return false};
  $('#gha',m).onclick=async()=>{
    if(await compartir())return;
    gBajaBlob(H.file,H.file.name);toast('Imagen guardada. Abriendo Instagram…');setTimeout(()=>{location.href='instagram://story-camera'},900);
  };
  $('#ghs',m).onclick=async()=>{if(await compartir())return;gBajaBlob(H.file,H.file.name);toast('Imagen guardada')};
}

/* ================= IMPRESIONES (solicitud, no compra) ================= */
function gGuardaCarro(){gLS(gKey('faro_bolsa'),JSON.stringify(G.carro));gContadores()}
function gAgregaCarro(id){const x=G.carro.find(c=>c.id===id);if(x)x.cant=Math.min(20,x.cant+1);else G.carro.push({id,tam:'4x6',cant:1});gGuardaCarro()}
const gPrecio=t=>(GPRECIOS.find(x=>x[0]===t)||[0,0,0,0])[3];
function gAbrirBolsa(){
  const dr=document.createElement('div');dr.className='gdr';dr.setAttribute('role','dialog');dr.setAttribute('aria-modal','true');document.body.append(dr);document.body.style.overflow='hidden';
  const cierra=()=>{dr.remove();if(!document.querySelector('.gm,.glb,.gt'))document.body.style.overflow='';removeEventListener('keydown',tec)};
  const tec=e=>{if(e.key==='Escape'&&document.body.lastElementChild===dr)cierra()};addEventListener('keydown',tec);
  dr.addEventListener('mousedown',e=>{if(e.target===dr)cierra()});
  const pinta=()=>{
    const n=G.carro.reduce((s,x)=>s+x.cant,0),sub=G.carro.reduce((s,x)=>s+x.cant*gPrecio(x.tam),0),gratis=n>=GGRATIS,envio=n?(gratis?0:GENVIO):0,total=sub+envio;
    dr.innerHTML='<div class="pn"><div class="hd">'+ic('bag')+'<div><h2>Impresiones</h2><small>SOLICITUD · NO SE PAGA AQUÍ</small></div><button data-x aria-label="Cerrar">'+ic('x')+'</button></div><div class="bd">'
     +'<p style="font-size:.92rem;line-height:1.55;color:#3A3A3A;margin:0">Elige las fotos y el tamaño. Nos llega tu solicitud y te escribimos para confirmar y agendar. <b>Envío gratis desde '+GGRATIS+' impresiones.</b></p>'
     +(G.carro.length?G.carro.map((c,i)=>{const a=ST.arch.find(x=>x.id===c.id);return '<div class="row" data-i="'+i+'"><img alt="" src="'+esc(gLink(c.id).urlMini||gLink(c.id).urlVer||'')+'"><div class="nm">'+esc(a?a.nombre:'Foto')+'</div>'
        +'<select data-a="t" aria-label="Tamaño">'+GPRECIOS.map(p=>'<option value="'+p[0]+'"'+(p[0]===c.tam?' selected':'')+'>'+p[0].replace('x',' × ')+' in · Q'+p[3]+'</option>').join('')+'</select>'
        +'<div class="q"><button data-a="m" aria-label="Menos">−</button><b>'+c.cant+'</b><button class="mas" data-a="p" aria-label="Más">+</button></div></div>'}).join('')
       :'<div class="vacio">'+ic('bag')+'<p>Aún no has agregado fotos. Abre una foto y toca <b>Imprimir</b>, o agrega tus favoritas.</p></div>')
     +'<div class="acts" style="justify-content:flex-start"><button class="btn2" id="gbf">'+ic('heart')+' Agregar mis favoritas</button></div>'
     +(G.carro.length?'<div class="env"><div>'+(gratis?'<b>Envío gratis incluido</b>':'Te faltan '+(GGRATIS-n)+' para envío gratis (envío Q'+GENVIO+')')+'</div><div class="prog"><i style="width:'+Math.min(100,n/GGRATIS*100)+'%"></i></div></div>'
        +'<textarea id="gbn" placeholder="¿Algo que quieras decirnos? (papel, marco, para quién es…)" maxlength="700"></textarea>'
        +'<div class="tot"><span style="font-size:.78rem;letter-spacing:.2em;color:#3A3A3A">'+n+' IMPRESIONES · TOTAL APROX.</span><b>Q'+total+'</b></div>'
        +'<button class="btn2 p" id="gbe" style="min-height:56px">ENVIAR SOLICITUD</button><p style="font-size:.8rem;color:#3A3A3A;text-align:center;margin:0">Precios sugeridos en quetzales; los confirmamos contigo antes de imprimir.</p>':'')
     +'</div></div>';
    dr.querySelectorAll('[data-x]').forEach(b=>b.onclick=cierra);
    dr.querySelectorAll('.row').forEach(r=>{const c=G.carro[+r.dataset.i];
      r.querySelector('[data-a=t]').onchange=e=>{c.tam=e.target.value;gGuardaCarro();pinta()};
      r.querySelector('[data-a=m]').onclick=()=>{c.cant--;if(c.cant<=0)G.carro.splice(+r.dataset.i,1);gGuardaCarro();pinta()};
      r.querySelector('[data-a=p]').onclick=()=>{c.cant=Math.min(20,c.cant+1);gGuardaCarro();pinta()}});
    $('#gbf',dr).onclick=()=>{const f=[...ST.favs].filter(id=>{const a=ST.arch.find(x=>x.id===id);return a&&a.tipo==='imagen'});if(!f.length){toast('Aún no tienes favoritas');return}f.forEach(id=>{if(!G.carro.some(c=>c.id===id))G.carro.push({id,tam:'4x6',cant:1})});gGuardaCarro();pinta()};
    const be=$('#gbe',dr);if(be)be.onclick=()=>enviar(n,sub,envio,total,be);
  };
  const enviar=async(n,sub,envio,total,be)=>{
    be.disabled=true;be.textContent='Enviando…';
    const items=G.carro.map(c=>{const a=ST.arch.find(x=>x.id===c.id);return{archivo_id:c.id,nombre:a?a.nombre:'',tam:c.tam,cant:c.cant,precio:gPrecio(c.tam)}});
    const nota=($('#gbn',dr)||{}).value||'';
    let ok=false;
    try{const r=await api('/rest/v1/en_solicitudes',{method:'POST',body:{proyecto_id:ST.p.id,cliente:ST.perfil.nombre,items,cantidad:n,subtotal:sub,envio,total,nota:nota.slice(0,800)},headers:{Prefer:'return=minimal'}});ok=r.ok}catch(e){}
    if(ok){G.carro=[];gGuardaCarro();
      dr.querySelector('.bd').innerHTML='<div class="vacio" style="padding-top:50px"><div style="font:400 2.6rem/1 \'Bebas Neue\',Impact;letter-spacing:.05em;color:#8B1A2A">¡Solicitud enviada!</div><p style="margin-top:12px">Ya le llegó a Faro. Te escribimos pronto para confirmar los tamaños y agendar la entrega.</p><div class="acts" style="margin-top:14px"><button class="btn2 p" data-x2>Seguir viendo mi galería</button></div></div>';
      dr.querySelector('[data-x2]').onclick=cierra;
    }else{
      be.disabled=false;be.textContent='ENVIAR SOLICITUD';
      const resumen='Hola, quiero pedir impresiones de mi galería "'+ST.p.titulo+'":\n'+items.map(i=>i.cant+' × '+i.tam+' ('+i.nombre+')').join('\n')+'\nTotal aprox. Q'+total;
      toast('No se pudo enviar. Te abro WhatsApp con tu pedido.');window.open(WA+'?text='+encodeURIComponent(resumen),'_blank','noopener');
    }
  };
  pinta();
}

/* salir: pide confirmación y vuelve al landing de Faro Studios */
function gConfirmaSalir(){
  if(PREVIA){toast('Vista previa: aquí el cliente saldría de su galería');return}
  if(document.querySelector('.gm'))return;
  const m=gModal('<div class="top"></div><div class="bd"><span class="iso"></span><div class="eti">HASTA PRONTO</div><h2>¿Quieres salir?</h2><p>Tu galería queda guardada. Podrás volver a entrar cuando quieras con tu usuario y contraseña.</p>'
    +'<div class="acts"><button class="btn2" data-x>Seguir aquí</button><button class="btn2 b" id="gsalok">Sí, salir</button></div></div>',false);
  $('#gsalok',m).onclick=()=>{try{sessionStorage.removeItem('faro_ent')}catch(e){}SES=null;ST.links={};location.href=GWEB};
}
/* ================= RESEÑA Y PROMOCIÓN ================= */
function gAbrirResena(manual){
  if(document.querySelector('.gm,.gt'))return;
  const m=gModal('<div class="top"></div><div class="bd" style="justify-items:stretch"><div class="eti" style="text-align:center">GRACIAS POR CONFIAR EN NOSOTROS</div><h2>¿Qué te pareció tu galería?</h2>'
    +'<p style="margin:0 auto">Nos ayudarías mucho con una reseña. La usamos en nuestras redes y en la web, en “Lo dicen nuestros clientes”, y así más personas nos conocen.</p>'
    +'<div class="stars" id="grs"></div>'
    +'<div class="grid2"><input type="text" id="grn" placeholder="Tu nombre" maxlength="60" value="'+esc(ST.perfil.nombre||'')+'"><input type="text" id="grt" placeholder="Tipo de sesión" maxlength="60" value="'+esc(ST.p.titulo||'')+'"></div>'
    +'<textarea id="grx" placeholder="Cuéntanos cómo fue la experiencia y cómo te sientes con tus fotos…" maxlength="1500"></textarea>'
    +'<button class="chk" id="gra" role="checkbox" aria-checked="false"><i></i><span>Autorizo a Faro Studios a usar mi opinión de forma pública en sus redes sociales y en su página web.</span></button>'
    +'<div class="acts" style="justify-content:space-between"><button class="txt" data-x>Ahora no</button><button class="btn2 p" id="gre" disabled>Enviar reseña</button></div></div>'+gX,true);
  let n=5,ok=false;
  const est=()=>{$('#grs',m).innerHTML=[1,2,3,4,5].map(i=>'<button class="'+(i<=n?'on':'')+'" data-n="'+i+'" aria-label="'+i+' estrellas"><svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg></button>').join('');
    m.querySelectorAll('.stars button').forEach(b=>b.onclick=()=>{n=+b.dataset.n;est()})};est();
  $('#gra',m).innerHTML='<i>'+'</i><span>Autorizo a Faro Studios a usar mi opinión de forma pública en sus redes sociales y en su página web.</span>';
  $('#gra',m).onclick=e=>{ok=!ok;e.currentTarget.setAttribute('aria-checked',String(ok));e.currentTarget.querySelector('i').innerHTML=ok?ic('check'):'';$('#gre',m).disabled=!ok};
  m.cierra0=m.cierra;m.cierra=()=>{if(!gLS(gKey('faro_res')))gSS(gKey('faro_res_no'),'1');m.cierra0();gProgramaPromo()};
  m.querySelectorAll('[data-x]').forEach(b=>b.onclick=m.cierra);
  $('#gre',m).onclick=async()=>{
    const b=$('#gre',m);b.disabled=true;b.textContent='Enviando…';
    let good=false;try{const r=await api('/rest/v1/en_resenas',{method:'POST',body:{proyecto_id:ST.p.id,nombre:$('#grn',m).value.trim().slice(0,60),sesion:$('#grt',m).value.trim().slice(0,60),estrellas:n,texto:$('#grx',m).value.trim().slice(0,1500),autoriza:true},headers:{Prefer:'return=minimal'}});good=r.ok}catch(e){}
    if(good){gLS(gKey('faro_res'),'1');m.cierra0();toast('¡Gracias! Tu reseña nos ayuda muchísimo');gProgramaPromo()}
    else{b.disabled=false;b.textContent='Enviar reseña';toast('No se pudo enviar. Intenta otra vez en un momento.')}
  };
}
function gLlegoAlFinal(){
  if(PREVIA||G.fin)return; /* en la vista previa no salen la reseña ni la promoción */G.fin=true;
  if(!gLS(gKey('faro_res'))&&!gSS(gKey('faro_res_no')))setTimeout(()=>gAbrirResena(false),1200);else gProgramaPromo();
}
let gTimerPromo=null;
function gProgramaPromo(){
  if(gSS(gKey('faro_promo'))||gTimerPromo)return;
  gTimerPromo=setTimeout(()=>{gTimerPromo=null;if(document.querySelector('.gm,.gt,.glb,.gdr')){gProgramaPromo();return}gAbrirPromo(true)},150000);
}
function gAbrirPromo(recordatorio){
  if(recordatorio)gSS(gKey('faro_promo'),'1');
  const nom=(ST.perfil.nombre||'').split(' ')[0];
  const txt='Te recomiendo a Faro Studios 📸 Si les escribes de mi parte'+(nom?' ('+nom+')':'')+' tienes 15% de descuento en tu primera sesión. '+GWEB;
  const m=gModal('<div class="split"><div class="lado"><div><span class="iso"></span><div class="gr">15%</div><small>PARA LOS DOS</small></div></div><div><div class="top"></div><div class="bd" style="justify-items:center"><div class="eti">GANAN LOS DOS</div><h2>Recomiéndanos y ahorran los dos</h2>'
    +'<p style="margin:0">Si nos recomiendas con alguien, <b>tú tienes 15% de descuento en tu próxima sesión</b> y tu amigo recibe <b>15% en la suya</b>. Aplica para clientes actuales y futuros.</p>'
    +'<div class="acts" style="flex-direction:column;align-items:stretch"><button class="btn2 b" id="gpw">'+ic('wa')+' Compartir por WhatsApp</button><button class="txt" data-x>Ahora no</button></div></div></div></div>'+gX,true);
  $('#gpw',m).onclick=()=>{window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank','noopener')};
}

/* ================= TUTORIAL CON FLECHAS ================= */
const GPASOS=[
  {s:'#gvista',t:'Muévete por la galería',x:'Cambia entre Editorial y Cuadrícula. Es la misma sesión, solo se ve distinta.'},
  {s:'.gph .gh',t:'Estas son todas tus fotos',x:'Tú decides cuáles incluir. Toca el corazón para guardar una foto en una lista.'},
  {s:'#glis',t:'Listas para compartir',x:'Crea hasta cinco listas y compártelas con quien quieras. Cada una tiene su enlace privado.'},
  {s:'#gcodb',t:'Un regalo para ti',x:'Este regalo se queda aquí, a un lado. Tócalo cuando quieras para ver tu código de descuento y úsalo en tu próxima sesión.'},
  {s:'#gdl',t:'Descarga en alta calidad',x:'Una por una o todas juntas en ZIP. Tú eliges el tamaño de cada descarga.'},
  {s:'.gph .gi',t:'Súbela a tu historia',x:'Toca el botón de Instagram de cualquier foto y se abre en tu teléfono, lista para publicar.',vista:true},
  {s:'#gbolsa',t:'¿Las quieres impresas?',x:'Tenemos tienda. Toca la bolsita, elige tamaños y envía tu solicitud: te contactamos para agendar. Envío gratis desde '+GGRATIS+' impresiones.'}
];
function gTutorial(primera){
  if(document.querySelector('.gt'))return;
  document.body.classList.add('gtut');
  const pasos=GPASOS.filter(p=>document.querySelector(p.s)&&document.querySelector(p.s).getBoundingClientRect().width);
  if(!pasos.length){document.body.classList.remove('gtut');return}
  const t=document.createElement('div');t.className='gt';
  t.innerHTML='<div class="hl"></div><div class="pl"></div><svg class="fl" aria-hidden="true"><defs><marker id="gta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1l8 4-8 4z" fill="#B8A06A"/></marker></defs><path id="gtp" d="" fill="none" stroke="#B8A06A" stroke-width="3" stroke-linecap="round" marker-end="url(#gta)"/></svg><div class="cd" role="dialog" aria-modal="true"></div>';
  document.body.append(t);document.body.style.overflow='hidden';
  let k=0;
  const portada=ST.arch.find(a=>a.id===G.cfg.portada)||gImgs()[0];
  const fin=pr=>{G.finOk=true;t.remove();document.body.classList.remove('gtut');if(!document.querySelector('.gm,.glb,.gdr'))document.body.style.overflow='';removeEventListener('resize',pos);removeEventListener('scroll',pos);clearInterval(iv);removeEventListener('keydown',tec);
    if(primera){if(!PREVIA)gLS(gKey('faro_tut'),'1');window.scrollTo(0,0);if(G.onScroll)G.onScroll()}};
  const tec=e=>{if(e.key==='Escape')fin(false)};addEventListener('keydown',tec);
  const pos=()=>{
    const p=pasos[k],el=document.querySelector(p.s);
    const hl=t.querySelector('.hl'),pl=t.querySelector('.pl'),cd=t.querySelector('.cd'),W=innerWidth,H=innerHeight,cw=cd.offsetWidth,ch=cd.offsetHeight;
    const r=el&&el.getBoundingClientRect();
    if(!el||!r.width||!r.height||r.bottom<0||r.top>H){
      /* el objetivo no está a la vista: tarjeta centrada, sin flecha (y se intenta acercarlo) */
      for(const e of [hl,pl])e.style.opacity='0';t.querySelector('#gtp').setAttribute('d','');
      cd.style.left=Math.max(12,(W-cw)/2)+'px';cd.style.top=Math.max(12,(H-ch)/2)+'px';
      if(el&&!el.closest('.gtop,#gbolsa'))el.scrollIntoView({block:'center',behavior:'instant'});
      return;
    }
    const pad=8;for(const e of [hl,pl]){e.style.opacity='';e.style.left=(r.left-pad)+'px';e.style.top=(r.top-pad)+'px';e.style.width=(r.width+pad*2)+'px';e.style.height=(r.height+pad*2)+'px'}
    const movil=W<640;
    let x,y;
    if(movil){x=(W-cw)/2;y=r.top>H/2?r.top-ch-60:r.bottom+60}
    else{const abajo=r.top<H/2;y=abajo?r.bottom+70:r.top-ch-70;x=r.left+r.width/2-cw/2}
    x=Math.max(12,Math.min(W-cw-12,x));y=Math.max(12,Math.min(H-ch-12,y));
    cd.style.left=x+'px';cd.style.top=y+'px';
    /* flecha: del borde de la tarjeta más cercano al borde del objetivo */
    const tx=r.left+r.width/2,ty=r.top+r.height/2;
    const desde=y>ty?{x:Math.max(x+20,Math.min(x+cw-20,tx)),y:y}:{x:Math.max(x+20,Math.min(x+cw-20,tx)),y:y+ch};
    const hasta={x:tx,y:y>ty?r.bottom+pad+6:r.top-pad-6};
    const mx=(desde.x+hasta.x)/2+(desde.x<hasta.x?-30:30),my=(desde.y+hasta.y)/2;
    t.querySelector('#gtp').setAttribute('d','M'+desde.x+' '+desde.y+' Q'+mx+' '+my+' '+hasta.x+' '+hasta.y);
  };
  const paso=()=>{
    const p=pasos[k],el=document.querySelector(p.s);
    if(el&&!el.closest('.gtop,#gbolsa')){const r=el.getBoundingClientRect();if(r.top<110||r.bottom>innerHeight-90)el.scrollIntoView({block:'center',behavior:'instant'})}
    const cd=t.querySelector('.cd');
    cd.innerHTML='<div class="eti">PASO '+(k+1)+' DE '+pasos.length+'</div><h3>'+esc(p.t)+'</h3><p>'+esc(p.x)+'</p>'
      +(p.vista&&portada?'<div class="pv"><div class="hist"><canvas width="62" height="110" id="gtv"></canvas></div><span>Así se verá tu foto en la historia.<br><b style="color:#8B1A2A">Abrir Instagram → publicar</b></span></div>':'')
      +'<div class="dots">'+pasos.map((_,i)=>'<i class="'+(i===k?'on':'')+'"></i>').join('')+'</div>'
      +'<div class="nav"><button id="gta0">'+(k?'Atrás':'Omitir')+'</button><button class="p" id="gta1">'+(k===pasos.length-1?'Terminar':'Siguiente')+'</button></div>';
    $('#gta0',cd).onclick=()=>{if(k){k--;paso()}else fin(false)};
    $('#gta1',cd).onclick=()=>{if(k<pasos.length-1){k++;paso()}else fin(true)};
    if(p.vista&&portada){const im=new Image();im.onload=()=>{const c=$('#gtv',cd);if(!c)return;const x=c.getContext('2d');x.fillStyle='#252528';x.fillRect(0,0,62,110);const kk=Math.min(62/im.width,90/im.height);x.drawImage(im,(62-im.width*kk)/2,(110-im.height*kk)/2-2,im.width*kk,im.height*kk)};im.crossOrigin='anonymous';im.src=gLink(portada.id).urlVer}
    requestAnimationFrame(()=>requestAnimationFrame(pos));
  };
  /* la página puede moverse sola (fotos que terminan de cargar, desplazamiento suave): se recalcula seguido */
  const iv=setInterval(pos,250);
  addEventListener('resize',pos);addEventListener('scroll',pos,{passive:true});paso();
}

/* ================= LISTA COMPARTIDA (enlace privado, sin cuenta) ================= */
async function listaPublica(token){
  APP.innerHTML='<div class="lg"><p style="position:relative;color:var(--muted)">Abriendo…</p></div>';
  let d=null;
  try{const r=await fetch(FILES+'/api/lista/enlaces',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});if(r.ok)d=await r.json()}catch(e){}
  if(!d||!d.archivos||!d.archivos.length){document.body.className='dots';APP.innerHTML='<div class="lg"><div class="lg-card"><div class="lg-top"><span class="iso"></span><h1>FARO</h1><p>Studios</p></div><div class="lg-body"><p>Este enlace ya no está disponible o la lista está vacía. Pídele a quien te lo compartió que lo revise.</p></div></div></div>';return}
  G.cfg={paleta:d.config&&d.config.paleta,fuente:d.config&&d.config.fuente,meta:d.config&&d.config.meta};gAplica(G.cfg);
  ST.arch=d.archivos.map(a=>({id:a.id,nombre:a.nombre,tipo:'imagen',meta:a.meta||{}}));
  d.archivos.forEach(a=>{ST.links[a.id]={urlVer:a.urlVer,urlMini:a.urlMini,url:a.url}});
  ST.p={id:'pub',titulo:d.titulo};ST.perfil={nombre:''};ST.favs=new Set();
  APP.innerHTML='<div class="gal gpub"><header class="gtop sol"><span class="iso"></span><span class="sp"></span></header>'
    +'<div class="ctit"><h1>'+esc(d.titulo||'')+'</h1><p>'+esc(d.lista||'')+' · '+d.archivos.length+' fotos</p></div>'
    +'<section class="gmuro"><div class="in"><div id="gcuerpo"></div></div><footer class="gpie">Faro Studios</footer></section></div>';
  const v=ST.arch;
  $('#gcuerpo').innerHTML='<div class="gcol">'+v.map((a,i)=>'<div class="gph" data-i="'+i+'"><button class="ver" aria-label="Abrir foto '+(i+1)+'"><img alt="" loading="lazy" decoding="async" src="'+esc(ST.links[a.id].urlMini||ST.links[a.id].urlVer)+'"></button><div class="acts"><button data-id="'+a.id+'" aria-label="Descargar">'+ic('dl')+'</button></div></div>').join('')+'</div>';
  document.querySelectorAll('#gcuerpo img').forEach(im=>{const ok=()=>im.classList.add('ok');im.complete?ok():im.onload=ok;im.onerror=ok});
  document.querySelectorAll('#gcuerpo .gph').forEach(t=>{t.querySelector('.ver').onclick=()=>gVisorPublico(+t.dataset.i);
    t.querySelector('.acts button').onclick=e=>{e.stopPropagation();gBajaUna(v[+t.dataset.i])}});
}
function gBajaUna(a){const l=ST.links[a.id];if(!l||!l.url)return;const x=document.createElement('a');x.href=l.url;x.rel='noopener';document.body.append(x);x.click();x.remove()}
function gVisorPublico(i){
  const v=ST.arch;let k=i;const lb=document.createElement('div');lb.className='glb';document.body.append(lb);document.body.style.overflow='hidden';
  const pinta=()=>{const a=v[k];lb.innerHTML='<div class="bar"><span>'+(k+1)+' / '+v.length+'</span><button id="pd">'+ic('dl')+'<span class="t">Descargar</span></button><button id="px" aria-label="Cerrar">'+ic('x')+'</button></div><div class="st"><button class="nv l" id="pl" aria-label="Anterior">'+ic('prev')+'</button><img alt="" src="'+esc(ST.links[a.id].urlVer)+'"><button class="nv r" id="pn" aria-label="Siguiente">'+ic('next')+'</button></div>'+(gMetaHtml(a)||'<div class="gmeta" style="opacity:0;min-height:44px"></div>');
    $('#px',lb).onclick=cierra;$('#pl',lb).onclick=()=>{k=(k-1+v.length)%v.length;pinta()};$('#pn',lb).onclick=()=>{k=(k+1)%v.length;pinta()};$('#pd',lb).onclick=()=>gBajaUna(a)};
  const cierra=()=>{lb.remove();document.body.style.overflow='';removeEventListener('keydown',tec)};
  const tec=e=>{if(e.key==='Escape')cierra();else if(e.key==='ArrowLeft'){k=(k-1+v.length)%v.length;pinta()}else if(e.key==='ArrowRight'){k=(k+1)%v.length;pinta()}};addEventListener('keydown',tec);pinta();
}
