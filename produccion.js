/* /produccion · Faro Studios — espacio de trabajo con el cliente (empresas y agencias)
   Preproducción (fechas, ideas, referencias, guiones) → Producción (revisión por versiones) → Entregas → Pagos y documentos.
   Se alimenta de Faro Workspace (Clientes). Requiere sql/produccion.sql. */
'use strict';
const SBU='https://keivqvsgdfhthouzlqxo.supabase.co',SBK='sb_publishable_5nj3M7rjQs3phGU6u2uNqw_3tjTL6PE';
const FILES='https://faro-archivos.jorgedamartinez20.workers.dev';
const WA='https://wa.me/50252695592';
const DOM='@entregas.farostudios.net';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const authEmail=u=>{u=String(u||'').trim().toLowerCase();return (u.includes('@')?u.replace('@','_at_').replace(/[^a-z0-9._+-]/g,'_'):u.replace(/\s+/g,''))+DOM};
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const APP=$('#app');
const P={
  play:'<path d="M8 5l11 7-11 7z"/>',film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  img:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-9 9"/>',
  note:'<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.2"/><circle cx="17" cy="16" r="2.2"/>',
  file:'<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  dl:'<path d="M12 4v11M7.5 11l4.5 4.5L16.5 11M5 20h14"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',send:'<path d="M21 3L3 11l7 3 3 7z"/><path d="M10 14l11-11"/>',
  out:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',thumb:'<path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.8 9H19a2 2 0 012 2.3l-1.2 7A2 2 0 0117.8 20H7"/>',
  chat:'<path d="M5 4h14v12H9l-4 4z"/>',layers:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>',link:'<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',plus:'<path d="M12 5v14M5 12h14"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon:'<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',coin:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5C9.5 8.6 10.6 8 12 8s2.5.6 2.5 1.5S13.4 11 12 11s-2.5.6-2.5 1.5S10.6 14 12 14s2.5-.6 2.5-1.5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',folder:'<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',back:'<path d="M15 5l-7 7 7 7"/>',trash:'<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>'
};
const ic=n=>'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+(P[n]||'')+'</svg>';
const toast=t=>{$$('.toast').forEach(x=>x.remove());const d=document.createElement('div');d.className='toast';d.setAttribute('role','status');d.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),3200)};
const mmss=s=>{s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const fechaL=f=>f?new Date(String(f).slice(0,10)+'T12:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'long',year:'numeric'}):'';
const fechaC=f=>f?new Date(String(f).slice(0,10)+'T12:00:00').toLocaleDateString('es-GT',{day:'numeric',month:'short'}):'';
const hace=f=>{const d=Math.round((Date.now()-new Date(f).getTime())/60000);if(d<1)return 'ahora';if(d<60)return 'hace '+d+' min';if(d<1440)return 'hace '+Math.round(d/60)+' h';if(d<43200)return 'hace '+Math.round(d/1440)+' d';return fechaC(f)};
const hora=h=>{if(!h)return '';const [H,M]=String(h).split(':');const n=+H;return (n%12||12)+':'+M+' '+(n<12?'a. m.':'p. m.')};
const money=(n,m)=>(m==='USD'?'$':'Q')+Number(n||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
const ini=n=>String(n||'?').trim().charAt(0).toUpperCase()||'?';
const seguro=u=>{try{const x=new URL(String(u||'').trim());return x.protocol==='https:'?x.href:''}catch(e){return ''}};
const dominio=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return u}};
const nombreArchivo=n=>{let s=String(n||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'-').replace(/[^A-Za-z0-9._()\-]+/g,'').replace(/-{2,}/g,'-').replace(/^[.\-]+/,'');
  if(s.length>150){const i=s.lastIndexOf('.');const ext=i>0&&s.length-i<=10?s.slice(i):'';s=s.slice(0,150-ext.length)+ext}return s};
const tipoDeNombre=n=>/\.(jpe?g|png|webp|gif|heic|avif)$/i.test(n)?'imagen':/\.(mp4|mov|webm|m4v)$/i.test(n)?'video':/\.(mp3|wav|m4a|aac|ogg)$/i.test(n)?'audio':/\.pdf$/i.test(n)?'pdf':'otro';
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};

/* ---------- sesión (la misma que usa /entregas) ---------- */
let SES=null;try{SES=JSON.parse(sessionStorage.getItem('faro_ent')||'null')}catch(e){}
const saveSes=()=>{try{sessionStorage.setItem('faro_ent',JSON.stringify(SES))}catch(e){}};
let LASTERR='';
async function signIn(email,pass){
  try{const r=await fetch(SBU+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:SBK,'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
    const j=await r.json().catch(()=>({}));if(!r.ok||!j.access_token){LASTERR=(j.error_code||j.msg||j.error_description||'')+'';return null}
    SES={access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000};saveSes();return SES}catch(e){return null}}
async function refreshSes(){
  if(!SES||!SES.refresh)return false;
  try{const r=await fetch(SBU+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SBK,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:SES.refresh})});
    const j=await r.json();if(!r.ok||!j.access_token)return false;
    SES={access:j.access_token,refresh:j.refresh_token||SES.refresh,exp:Date.now()+(j.expires_in||3600)*1000};saveSes();return true}catch(e){return false}}
function salir(msg){SES=null;try{sessionStorage.removeItem('faro_ent')}catch(e){}ST.links={};ST.klinks={};pantallaLogin(typeof msg==='string'?msg:'')}
async function api(path,o){
  o=o||{};
  if(SES&&SES.exp-60000<Date.now())await refreshSes();
  const go=()=>fetch(SBU+path,{method:o.method||'GET',headers:Object.assign({apikey:SBK,Authorization:'Bearer '+(SES?SES.access:SBK),'Content-Type':'application/json'},o.headers||{}),body:o.body?JSON.stringify(o.body):undefined});
  let r=await go();if(r.status===401&&await refreshSes())r=await go();
  if(r.status===401){salir('Tu sesión venció. Vuelve a entrar.');throw new Error('sesion')}return r}
const rows=async(t,qs)=>{try{const r=await api('/rest/v1/'+t+'?'+qs);return r.ok?await r.json():null}catch(e){return null}};
const rpc=async(f,body)=>{const r=await api('/rest/v1/rpc/'+f,{method:'POST',body:body||{}});if(!r.ok){let m='';try{const j=await r.json();m=j.message||j.hint||''}catch(e){}const e=new Error(m||'No se pudo completar');e.status=r.status;throw e}
  const t=await r.text();try{return t?JSON.parse(t):null}catch(e){return null}};
const normClave=s=>{const x=String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return x.match(/.{1,4}/g)?x.match(/.{1,4}/g).join('-'):x};

/* ---------- estado ---------- */
const ST={perfil:null,proyectos:[],p:null,tab:'resumen',sub:'fechas',links:{},linksAt:0,klinks:{},carpeta:null,
  arch:[],com:[],ideas:[],refs:[],guiones:[],notas:[],fechas:[],fin:null,pagos:[],docs:[],hist:[],miperfil:null,revisores:[],
  rv:{tipo:null,sel:null,ver:null,b:{v:'nota'}},esp:'todos',cargadoEn:0};
const ESTADOS={borrador:['Borrador',''],en_revision:['En revisión','warn'],cambios_pedidos:['Cambios enviados','cam'],aprobado:['Aprobado','ok'],entregado:['Entregado','ok']};
const IDEA_EST={propuesta:['Propuesta',''],conversando:['En conversación','gold'],aprobada:['Aprobada','ok'],descartada:['Descartada','cam']};
const GZ_EST={borrador:['Borrador',''],en_revision:['En revisión','warn'],aprobado:['Aprobado','ok']};
const FECHA_T={llamado:['Llamado','film'],reunion:['Reunión','user'],entrega:['Entrega','dl'],pago:['Pago','coin'],revision:['Revisión','check'],otro:['Fecha','cal']};
const DOC_T={cotizacion:'Cotización',contrato:'Contrato',factura:'Factura',recibo:'Recibo',comprobante:'Comprobante',otro:'Documento'};
const chip=(t,c)=>'<span class="chip '+(c||'')+'">'+t+'</span>';
const cfg=()=>(ST.p&&ST.p.config)||{};
const varios=()=>!!cfg().revisores;
const yoKey=()=>'faro_yo_'+(ST.perfil?ST.perfil.user_id:'');
const yo=()=>varios()?(lsGet(yoKey())||''):(ST.perfil?ST.perfil.nombre:'');

/* ---------- derivados ---------- */
function piezas(){
  const m=new Map();
  ST.arch.filter(a=>(a.rol||'revision')!=='final'&&a.habilitado!==false).forEach(a=>{const k=a.pieza_id||a.id;(m.get(k)||m.set(k,[]).get(k)).push(a)});
  return [...m.entries()].map(([id,vs])=>{vs.sort((a,b)=>a.version-b.version);return{id,vers:vs,last:vs[vs.length-1]}}).sort((a,b)=>(a.last.orden-b.last.orden)||String(a.last.nombre).localeCompare(String(b.last.nombre),'es',{numeric:true}));
}
function finales(){
  const m=new Map();
  ST.arch.filter(a=>a.rol==='final'&&a.habilitado!==false).forEach(a=>{const k=a.pieza_id||a.id;(m.get(k)||m.set(k,[]).get(k)).push(a)});
  return [...m.values()].map(vs=>{vs.sort((a,b)=>a.version-b.version);return vs[vs.length-1]}).sort((a,b)=>(a.orden-b.orden)||String(a.nombre).localeCompare(String(b.nombre),'es',{numeric:true}));
}
function guiones(){
  const m=new Map();ST.guiones.forEach(g=>{(m.get(g.guion_id)||m.set(g.guion_id,[]).get(g.guion_id)).push(g)});
  return [...m.entries()].map(([id,vs])=>{vs.sort((a,b)=>a.version-b.version);return{id,vers:vs,last:vs[vs.length-1]}}).sort((a,b)=>new Date(a.vers[0].creado)-new Date(b.vers[0].creado));
}
const espDe=t=>t==='video'?'videos':t==='imagen'?'fotos':'otros';
const ESP={videos:['Videos','film'],fotos:['Fotos','img'],otros:['Otros','file']};
function etapa(){
  const e=cfg().etapa;let r=e==='prod'||e==='entrega'||e==='pre'?e:(piezas().length?'prod':'pre');
  if(ST.p&&(ST.p.estado==='aprobado'||ST.p.estado==='entregado')&&r!=='entrega'&&finales().length)r='entrega';
  return r;
}
function avance(){
  const gz=guiones(),pz=piezas(),tot=gz.length+pz.length;
  const apr=gz.filter(g=>g.last.estado==='aprobado').length+pz.filter(x=>x.last.estado==='aprobado').length;
  if(ST.p&&ST.p.estado==='entregado')return{pct:100,apr:tot,tot,gz,pz};
  return{pct:tot?Math.round(apr/tot*100):0,apr,tot,gz,pz};
}
const saldo=()=>{if(!ST.fin)return null;const pag=ST.pagos.filter(x=>x.estado==='confirmado').reduce((s,x)=>s+Number(x.monto||0),0);const tot=Number(ST.fin.total||0);return{tot,pag,sal:Math.max(0,tot-pag),pct:tot?Math.min(100,Math.round(pag/tot*100)):0}};

/* ---------- archivos: enlaces temporales y subida ---------- */
async function enlaces(ids){
  if(Date.now()-ST.linksAt>90*60000){ST.links={};ST.linksAt=Date.now()}
  const falta=ids.filter(i=>!ST.links[i]),lotes=[];
  for(let i=0;i<falta.length;i+=80)lotes.push(falta.slice(i,i+80));
  if(!lotes.length)return;
  if(SES&&SES.exp-60000<Date.now())await refreshSes();
  await Promise.all(lotes.map(async lote=>{
    try{const r=await fetch(FILES+'/api/mi/enlaces',{method:'POST',headers:{Authorization:'Bearer '+SES.access,'Content-Type':'application/json'},body:JSON.stringify({ids:lote})});
      if(r.status===401){salir('Tu sesión venció. Vuelve a entrar.');return}
      const j=await r.json();Object.assign(ST.links,j.enlaces||{})}catch(e){}}));
}
async function enlaceKey(key){
  const c=ST.klinks[key];if(c&&Date.now()-c.t<50*60000)return c;
  try{if(SES&&SES.exp-60000<Date.now())await refreshSes();
    const r=await fetch(FILES+'/p/enlace?key='+encodeURIComponent(key),{method:'POST',headers:{Authorization:'Bearer '+SES.access}});
    if(!r.ok)return null;const j=await r.json();return ST.klinks[key]={url:j.url,urlVer:j.urlVer,t:Date.now()}}catch(e){return null}
}
async function subirArchivo(file,pref){
  if(!ST.carpeta){toast('Faro está activando las subidas de tu espacio. Escríbenos si urge.');return null}
  if(file.size>38*1024*1024){toast('El archivo es muy pesado (máximo 38 MB). Compártelo por enlace.');return null}
  const nom=nombreArchivo(file.name)||'archivo';
  const key=ST.carpeta+nombreArchivo(pref+'-'+Date.now().toString(36)+'-'+nom).slice(0,150);
  try{if(SES&&SES.exp-60000<Date.now())await refreshSes();
    const r=await fetch(FILES+'/p/subir?key='+encodeURIComponent(key),{method:'PUT',headers:{Authorization:'Bearer '+SES.access,'Content-Type':file.type||'application/octet-stream'},body:file});
    if(!r.ok){let m='';try{m=(await r.json()).error||''}catch(e){}toast(m||'No se pudo subir el archivo');return null}
    return key}catch(e){toast('No se pudo subir el archivo');return null}
}
function seleccionar(accept,cb){const i=document.createElement('input');i.type='file';if(accept)i.accept=accept;i.onchange=()=>{if(i.files&&i.files[0])cb(i.files[0])};i.click()}

/* ---------- entrada ---------- */
function logoImgs(w){return '<img class="logo-d" src="logo-nav.png" alt="Faro Studios"'+(w?' style="width:'+w+'px"':'')+'><img class="logo-l" src="logo-borgona.png" alt="Faro Studios"'+(w?' style="width:'+w+'px"':'')+'>'}
function temaBtn(){const l=document.documentElement.getAttribute('data-theme')==='light'||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme:light)').matches);return '<button class="ib" data-a="tema" aria-label="Cambiar a tema '+(l?'oscuro':'claro')+'">'+ic(l?'moon':'sun')+'</button>'}
function pantallaLogin(msg){
  APP.innerHTML='<div class="lg"><div class="card lg-card"><div class="lg-top">'+logoImgs(150)+'<h1>Producción</h1><p class="mu">Tu espacio de trabajo con Faro Studios: ideas, guiones, revisión, entregas y documentos.</p></div>'
   +'<form class="f" id="lf" autocomplete="on"><label>Correo<input id="lu" type="email" autocomplete="username" autocapitalize="none" placeholder="tucorreo@empresa.com" required></label>'
   +'<label>Contraseña<input id="lp" type="password" autocomplete="current-password" required></label>'
   +'<p class="err" id="le" role="alert">'+esc(msg||'')+'</p><button class="btn p" type="submit" id="lb" style="min-height:54px;letter-spacing:.14em">ENTRAR</button>'
   +'<p class="sm mu" style="text-align:center">¿No tienes acceso? <a href="'+WA+'" target="_blank" rel="noopener">Escríbenos por WhatsApp</a></p></form></div></div>';
  $('#lf').onsubmit=async e=>{e.preventDefault();const b=$('#lb');b.disabled=true;b.textContent='ENTRANDO…';
    const u=$('#lu').value.trim().toLowerCase(),p=$('#lp').value;
    let s=await signIn(authEmail(u),p);if(!s&&normClave(p)!==p)s=await signIn(authEmail(u),normClave(p));
    if(!s){pantallaLogin(/confirm/i.test(LASTERR)?'Tu acceso aún no está activado. Escríbenos por WhatsApp.':'Correo o contraseña incorrectos. Revisa los datos que te enviamos.');return}
    await arrancar()};
}
function pantallaAviso(titulo,texto,botones){
  APP.innerHTML='<div class="lg"><div class="card lg-card"><div class="lg-top">'+logoImgs(150)+'<h1>'+esc(titulo)+'</h1><p class="mu">'+texto+'</p></div><div class="f">'+botones+'</div></div></div>';
  const s=$('[data-a="salir"]');if(s)s.onclick=()=>salir('');
}
async function arrancar(){
  APP.innerHTML='<div class="lg"><p class="mu">Cargando…</p></div>';
  let perfil=null;
  try{perfil=await rpc('en_mi_perfil')}catch(e){if(!SES)return}
  if(!perfil||!perfil.tipo){salir('Tu acceso no está activo. Escríbenos por WhatsApp y lo revisamos.');return}
  if(perfil.tipo==='galeria'){pantallaAviso('Esta es tu galería','Tus fotos y videos están en otra dirección.','<a class="btn p" href="/entregas" style="min-height:54px">IR A MI GALERÍA</a><button class="btn g" data-a="salir">Salir</button>');return}
  ST.perfil=perfil;
  const ps=await rows('en_proyectos','select=*&order=creado.desc');
  if(ps===null){salir('No se pudo cargar tu espacio. Intenta de nuevo.');return}
  ST.proyectos=ps;
  if(!ps.length){pantallaAviso('Tu espacio se está preparando','Faro Studios aún no ha abierto tu primer proyecto. Te avisaremos apenas esté listo.','<a class="btn o" href="'+WA+'" target="_blank" rel="noopener">ESCRIBIR POR WHATSAPP</a><button class="btn g" data-a="salir">Salir</button>');return}
  const pid=sessionStorage.getItem('faro_prod_p');
  ST.p=ps.find(x=>x.id===pid)||ps[0];
  if(!await cargar())return;
  if(varios()&&!yo())return pantallaQuien();
  render();
}
async function cargar(){
  const p=ST.p,f=e=>'proyecto_id=eq.'+p.id+e;
  const [arch,com,ideas,refs,gz,notas,fechas,fin,pagos,docs,hist,rev,mp]=await Promise.all([
    rows('en_archivos',f('&select=*&order=orden.asc,creado.asc')),rows('en_comentarios',f('&order=creado.asc')),
    rows('pr_ideas',f('&order=creado.desc')),rows('pr_referencias',f('&order=creado.desc')),rows('pr_guiones',f('&order=creado.asc')),rows('pr_notas',f('&order=creado.asc')),
    rows('pr_fechas',f('&order=fecha.asc,hora.asc')),rows('pr_finanzas',f('&select=*')),rows('pr_pagos',f('&order=creado.asc')),rows('pr_documentos',f('&order=creado.desc')),
    rows('en_historial',f('&order=creado.desc&limit=200')),rows('en_revisores','select=nombre&order=ultimo.desc'),rows('pr_perfil','select=*')]);
  if(ideas===null||gz===null||mp===null){
    pantallaAviso('Estamos activando tu espacio','Faro Studios está terminando de preparar tu espacio de producción. Vuelve a entrar en unos minutos o escríbenos.','<a class="btn o" href="'+WA+'" target="_blank" rel="noopener">ESCRIBIR POR WHATSAPP</a><button class="btn g" data-a="salir">Salir</button>');return false}
  Object.assign(ST,{arch:arch||[],com:com||[],ideas,refs:refs||[],guiones:gz,notas:notas||[],fechas:fechas||[],fin:(fin&&fin[0])||null,pagos:pagos||[],docs:docs||[],hist:hist||[],revisores:(rev||[]).map(x=>x.nombre),miperfil:mp[0]||null,cargadoEn:Date.now()});
  try{ST.carpeta=await rpc('pr_mi_carpeta')}catch(e){ST.carpeta=null}
  const ids=ST.arch.filter(a=>a.habilitado!==false).map(a=>a.id);
  try{await enlaces(ids)}catch(e){}
  return true;
}
function pantallaQuien(){
  const ns=ST.revisores;
  APP.innerHTML='<div class="lg"><div class="card lg-card"><div class="lg-top">'+logoImgs(150)+'<h1>¿Quién eres?</h1><p class="mu">Tu nombre queda en cada nota y aprobación, y este dispositivo lo recuerda.</p></div>'
   +(ns.length?'<div class="quien">'+ns.map(n=>'<button data-a="soy" data-n="'+esc(n)+'"><span class="av">'+esc(ini(n))+'</span><span>'+esc(n)+'</span></button>').join('')+'</div>':'')
   +'<div class="f"><label>'+(ns.length?'Soy otra persona':'Tu nombre')+'<input id="qn" maxlength="60" placeholder="Escribe tu nombre" autocomplete="name"></label><button class="btn p" data-a="soy-nuevo" style="min-height:54px;letter-spacing:.14em">CONTINUAR</button></div></div></div>';
}
async function fijarYo(n){
  n=String(n||'').trim();if(!n)return toast('Escribe tu nombre para continuar');
  try{const l=await rpc('en_registrar_revisor',{p_nombre:n});if(Array.isArray(l))ST.revisores=l}catch(e){}
  lsSet(yoKey(),n);render();
}

/* ---------- marco de la página ---------- */
function cabecera(){
  const sel=ST.proyectos.length>1?'<select class="ib" data-a="proy" aria-label="Proyecto" style="max-width:34vw">'+ST.proyectos.map(x=>'<option value="'+x.id+'"'+(x.id===ST.p.id?' selected':'')+'>'+esc(x.titulo)+'</option>').join('')+'</select>':'';
  return '<header class="top"><div class="in"><a href="/" aria-label="Faro Studios, ir al inicio" style="display:flex">'+logoImgs()+'</a><span class="tg">PRODUCCIÓN</span><span class="sp"></span>'+sel
   +(varios()?'<button class="ib" data-a="cambiar-yo" aria-label="Cambiar de persona"><span class="av">'+esc(ini(yo()))+'</span><span class="nm">'+esc(yo()||'¿Quién eres?')+'</span></button>':'')
   +temaBtn()+'<button class="ib" data-a="salir" aria-label="Salir">'+ic('out')+'</button></div></header>';
}
function pendientes(){
  const n={};const av=avance();
  n.pre=av.gz.filter(g=>g.last.estado==='en_revision'&&g.last.autor_rol==='faro').length;
  n.prod=(ST.p.estado==='en_revision')?av.pz.filter(x=>x.last.estado==='pendiente').length:0;
  n.pagos=ST.fin&&ST.fin.visible!==false?ST.pagos.filter(x=>x.estado==='pendiente').length:0;
  return n;
}
const TABS=[['resumen','Resumen','layers'],['marca','Mi marca','user'],['pre','Preproducción','bulb'],['prod','Producción','film'],['ent','Entregas','dl'],['pagos','Pagos y documentos','coin']];
function render(){
  if(!ST.p)return;
  const n=pendientes(),y=window.scrollY;
  const v=({resumen:vResumen,marca:vMarca,pre:vPre,prod:vProd,ent:vEnt,pagos:vPagos})[ST.tab]();
  const subt=ST.perfil.nombre;
  APP.innerHTML=cabecera()+'<main class="wrap"><div class="head"><span class="k">'+esc(subt)+'</span><h1>'+esc(ST.p.titulo)+'</h1>'+(ST.p.descripcion?'<p>'+esc(ST.p.descripcion)+'</p>':'')+'</div>'
   +'<nav class="tabs" role="tablist" aria-label="Secciones">'+TABS.map(t=>'<button role="tab" data-a="tab" data-t="'+t[0]+'" aria-selected="'+(ST.tab===t[0])+'">'+ic(t[2])+t[1]+(n[t[0]]?'<span class="nb">'+n[t[0]]+'</span>':'')+'</button>').join('')+'</nav>'
   +'<section id="vista">'+v+'</section></main>'+(ST.tab==='prod'?barraEnvio():'');
  window.scrollTo(0,y);
  postRender();
}
function irTab(t,sub){ST.tab=t;if(sub)ST.sub=sub;render();window.scrollTo(0,0)}
function postRender(){
  if(ST.tab==='prod')pintaSala();
  $$('textarea[data-draft]').forEach(t=>t.addEventListener('input',()=>{ST.rv.b.texto=t.value}));
}

/* ---------- Resumen ---------- */
function vResumen(){
  const av=avance(),e=etapa(),pct=av.pct;
  const st=(k,t,s)=>{const orden={pre:0,prod:1,entrega:2};const cur=orden[e],me=orden[k];return '<div class="step '+(cur===me?'on':cur>me?'done':'')+'"><b>'+t+'</b><small>'+s+'</small></div>'};
  const gzA=av.gz.filter(g=>g.last.estado==='aprobado').length,pzA=av.pz.filter(x=>x.last.estado==='aprobado').length;
  const hoy=new Date().toISOString().slice(0,10);
  const prox=ST.fechas.filter(f=>f.fecha>=hoy).slice(0,3);
  const todo=[];
  av.gz.filter(g=>g.last.estado==='en_revision'&&g.last.autor_rol==='faro').forEach(g=>todo.push(['pre','guiones','bulb','Revisar el guion “'+g.last.titulo+'” (versión '+g.last.version+')']));
  const por=av.pz.filter(x=>x.last.estado==='pendiente').length;
  if(ST.p.estado==='en_revision'&&por&&(e==='prod'||e==='entrega'))todo.push(['prod',null,'film',por+' pieza'+(por>1?'s':'')+' por revisar en la ronda '+ST.p.ronda]);
  if(ST.fin&&ST.fin.visible!==false)ST.pagos.filter(x=>x.estado==='pendiente').forEach(x=>todo.push(['pagos',null,'coin','Pago pendiente: '+x.concepto+' · '+money(x.monto,ST.fin.moneda)]));
  const mp=ST.miperfil||{};if(!mp.objetivos&&!mp.mensaje)todo.push(['marca',null,'user','Cuéntanos de tu marca: objetivos, mensaje y cómo habla']);
  const nombrePieza=id=>{const a=ST.arch.find(x=>x.id===id);return a?a.nombre:''};
  const evt=h=>{const d=h.detalle||'';const a=h.archivo_id?nombrePieza(h.archivo_id):'';
    switch(h.evento){case 'version':return 'Nueva versión '+(h.version?'V'+h.version:'')+(a?' de '+a:'');case 'aprobado':return 'Aprobó '+(a||'una pieza')+(h.version?' (V'+h.version+')':'');case 'cambios':return 'Pidió cambios en '+(a||'una pieza')+(h.version?' (V'+h.version+')':'');
      case 'ronda':return 'Envió la ronda '+h.ronda+(d?' · '+d:'');case 'abierta':return 'Se abrió la ronda '+h.ronda;case 'guion_aprobado':return 'Aprobó el guion · '+d;case 'pago_reportado':return 'Envió un comprobante de pago';default:return d||h.evento}};
  return '<div class="row2"><div class="card hero"><div class="farito" style="--p:'+(pct/100)+'"><div class="mk"><i class="base"></i><i class="fill"'+(pct?'':' style="visibility:hidden"')+'></i></div></div>'
   +'<div style="min-width:0;display:grid;gap:6px"><span class="k">Avance del proyecto</span><div class="pct">'+pct+'%</div><p class="mu sm">'+(av.tot?av.apr+' de '+av.tot+' elementos aprobados · '+gzA+' guion'+(gzA===1?'':'es')+' y '+pzA+' pieza'+(pzA===1?'':'s'):'Tu avance aparecerá cuando empiece el trabajo.')+'</p></div></div>'
   +'<div class="card"><h4>Etapa</h4><div class="steps">'+st('pre','Pre','Ideas y guiones')+st('prod','Producción','Versiones')+st('entrega','Entrega','Archivos finales')+'</div>'
   +(ST.p.rondas_max||ST.p.ronda?'<p class="sm mu">'+ic('layers')+' '+(ST.p.rondas_max?'Ronda '+ST.p.ronda+' de '+ST.p.rondas_max+' incluidas':'Ronda '+ST.p.ronda+' · sin límite de rondas')+'</p>':'')+'</div></div>'
   +'<div class="row2"><div class="card"><h4>Lo que sigue de tu parte</h4>'+(todo.length?'<div class="todo">'+todo.map(t=>'<button data-a="ir" data-t="'+t[0]+'"'+(t[1]?' data-s="'+t[1]+'"':'')+'>'+ic(t[2])+'<span>'+esc(t[3])+'</span></button>').join('')+'</div>':'<p class="mu">'+ic('check')+' Todo al día. Te avisaremos cuando haya algo nuevo.</p>')+'</div>'
   +'<div class="card"><h4>Próximas fechas</h4>'+(prox.length?prox.map(fechaHtml).join(''):'<p class="mu">Aún no hay fechas agendadas.</p>')+(prox.length?'<button class="btn g sm" data-a="ir" data-t="pre" data-s="fechas">Ver todas las fechas</button>':'')+'</div></div>'
   +'<div class="card"><h4>Actividad reciente</h4>'+(ST.hist.length?'<ul class="tl">'+ST.hist.slice(0,8).map(h=>'<li>'+esc(evt(h))+'<small>'+esc(h.autor||'Faro')+' · '+hace(h.creado)+'</small></li>').join('')+'</ul>':'<p class="mu">Aquí verás todo lo que pase en tu proyecto: quién hizo qué y cuándo.</p>')+'</div>';
}
function fechaHtml(f){
  const d=new Date(String(f.fecha).slice(0,10)+'T12:00:00'),t=FECHA_T[f.tipo]||FECHA_T.otro;
  return '<div class="fecha"><div class="d"><b>'+d.getDate()+'</b><span>'+d.toLocaleDateString('es-GT',{month:'short'}).replace('.','')+'</span></div><div style="min-width:0"><b style="font-weight:700">'+esc(f.titulo)+'</b><div class="sm mu">'+ic(t[1])+' '+t[0]+(f.hora?' · '+hora(f.hora)+(f.hora_fin?' a '+hora(f.hora_fin):''):'')+(f.lugar?' · '+esc(f.lugar):'')+'</div>'+(f.nota?'<div class="sm mu">'+esc(f.nota)+'</div>':'')+(seguro(f.link)?'<a class="sm" href="'+esc(seguro(f.link))+'" target="_blank" rel="noopener">Abrir enlace</a>':'')+'</div></div>';
}

/* ---------- Mi marca (perfil del cliente) ---------- */
const CAMPOS_MARCA=[
  ['Quiénes son',[['organizacion','Nombre de la empresa o agencia','text'],['sector','Sector o industria','text'],['descripcion','A qué se dedican','area'],['web','Sitio web','text'],['redes','Redes sociales (enlaces o usuarios)','area']]],
  ['Contacto principal',[['contacto_nombre','Nombre','text'],['cargo','Cargo','text'],['correo','Correo','email'],['telefono','Teléfono / WhatsApp','tel']]],
  ['Qué buscan',[['objetivos','Objetivos del proyecto','area'],['mensaje','¿Qué quieren comunicar?','area'],['publico','¿A quién le hablan?','area']]],
  ['Cómo es su marca',[['voz','¿Cómo habla la marca? (tono, palabras que sí y que no)','area'],['tipografias','Tipografías','text'],['colores','Colores de la marca (códigos o descripción)','text']]]];
function vMarca(){
  const m=ST.miperfil||{};
  let h='<div class="card"><h3>Mi marca</h3><p class="mu">Con esto sabemos cómo trabajar contigo: tu voz, tu estilo y lo que quieres lograr. Puedes completarlo y cambiarlo cuando quieras; Faro lo ve en tiempo real.</p>'
    +(m.desde?'<p class="sm">'+ic('clock')+' Trabajamos juntos desde <b>'+esc(fechaL(m.desde))+'</b></p>':'')+'</div>';
  h+='<form class="card f" id="fmarca">';
  CAMPOS_MARCA.forEach(([t,cs])=>{h+='<h4 style="margin-top:6px">'+t+'</h4>';
    h+=cs.length>2&&cs.every(c=>c[2]!=='area')||t==='Contacto principal'?'<div class="g2">'+cs.map(campoMarca(m)).join('')+'</div>':cs.map(campoMarca(m)).join('')});
  h+='<h4 style="margin-top:6px">Logo y manual de marca</h4><div class="g2"><div class="f"><span class="sm mu">Logo</span><div class="lin"><div id="logo-v" class="mu sm">'+(m.logo_key?'Cargando…':'Aún no hay logo')+'</div><button type="button" class="btn sm" data-a="subir-logo">'+ic('plus')+' '+(m.logo_key?'Cambiar':'Subir')+'</button></div></div>'
   +'<div class="f"><span class="sm mu">Brand book (PDF o enlace)</span><div class="lin"><div class="sm" style="min-width:0;overflow-wrap:anywhere">'+(m.brandbook_key?'<a href="#" data-a="ver-bb">Ver brand book</a>':seguro(m.brandbook_url)?'<a href="'+esc(m.brandbook_url)+'" target="_blank" rel="noopener">'+esc(dominio(m.brandbook_url))+'</a>':'<span class="mu">Aún no hay</span>')+'</div><button type="button" class="btn sm" data-a="subir-bb">'+ic('plus')+' Subir PDF</button></div>'
   +'<input name="brandbook_url" type="url" placeholder="o pega un enlace (Drive, Notion, Canva…)" value="'+esc(m.brandbook_url||'')+'" aria-label="Enlace al brand book"></div></div>';
  h+='<button class="btn p" type="submit" style="min-height:54px;letter-spacing:.12em">'+ic('check')+' GUARDAR MI MARCA</button></form>';
  setTimeout(async()=>{const el=$('#logo-v');if(el&&m.logo_key){const l=await enlaceKey(m.logo_key);el.innerHTML=l?'<img src="'+esc(l.urlVer)+'" alt="Tu logo" style="max-height:64px;max-width:100%;border-radius:8px;background:#fff;padding:6px">':'<span class="mu sm">No se pudo mostrar el logo</span>'}},0);
  return h;
}
const campoMarca=m=>c=>'<label>'+c[1]+(c[2]==='area'?'<textarea name="'+c[0]+'" rows="3">'+esc(m[c[0]]||'')+'</textarea>':'<input name="'+c[0]+'" type="'+c[2]+'" value="'+esc(m[c[0]]||'')+'">')+'</label>';
async function guardarMarca(extra){
  const f=$('#fmarca'),d={};if(f)$$('[name]',f).forEach(i=>d[i.name]=i.value);Object.assign(d,extra||{});
  try{await rpc('pr_perfil_guardar',{p_datos:d,p_autor:yo()});ST.miperfil=Object.assign({},ST.miperfil||{},d);toast('Tu marca quedó guardada');return true}
  catch(e){toast(e.message||'No se pudo guardar');return false}
}

/* ---------- Preproducción ---------- */
function vPre(){
  const subs=[['fechas','Fechas','cal'],['ideas','Ideas','bulb'],['refs','Referencias','link'],['guiones','Guiones','file']];
  let h='<div class="sub-tabs" role="tablist">'+subs.map(s=>'<button class="pill" role="tab" data-a="sub" data-s="'+s[0]+'" aria-selected="'+(ST.sub===s[0])+'">'+ic(s[2])+s[1]+'</button>').join('')+'</div>';
  return h+({fechas:vFechas,ideas:vIdeas,refs:vRefs,guiones:vGuiones})[ST.sub]();
}
function vFechas(){
  const hoy=new Date().toISOString().slice(0,10),prox=ST.fechas.filter(f=>f.fecha>=hoy),pas=ST.fechas.filter(f=>f.fecha<hoy).reverse();
  return '<div class="card"><h3>Fechas y horarios</h3><p class="mu">Llamados, reuniones y entregas de tu proyecto. Faro las mantiene al día.</p>'
    +(prox.length?prox.map(fechaHtml).join(''):'<div class="empty">'+ic('cal')+'<p>Aún no hay fechas agendadas.</p></div>')
    +(pas.length?'<details><summary class="mu sm" style="min-height:44px;display:flex;align-items:center">Fechas pasadas ('+pas.length+')</summary><div style="display:grid;gap:8px;margin-top:8px">'+pas.map(fechaHtml).join('')+'</div></details>':'')+'</div>';
}
const notasDe=(obj,id)=>ST.notas.filter(n=>n.objeto===obj&&n.objeto_id===id);
function vIdeas(){
  const mi=i=>i.autor_rol==='cliente';
  return '<div class="card"><div style="display:flex;gap:var(--s2);align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:200px"><h3>Ideas</h3><p class="mu">El espacio para pensar juntos. Propón ideas, y Faro responde, las agrupa y las lleva a guion.</p></div><button class="btn o" data-a="idea-nueva">'+ic('plus')+' Nueva idea</button></div></div>'
    +(ST.ideas.length?'<div style="display:grid;gap:var(--s2)">'+ST.ideas.map(i=>{const e=IDEA_EST[i.estado]||IDEA_EST.propuesta,nn=notasDe('idea',i.id).length;
      return '<button class="idea" data-a="idea-ver" data-id="'+i.id+'"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+chip(e[0],e[1])+'<span class="sm mu">'+(mi(i)?esc(i.autor||'Tú'):'Faro')+' · '+hace(i.creado)+'</span></div><h5>'+esc(i.titulo)+'</h5>'+(i.texto?'<p>'+esc(i.texto.length>200?i.texto.slice(0,200)+'…':i.texto)+'</p>':'')+(nn?'<span class="sm mu">'+ic('chat')+' '+nn+' nota'+(nn>1?'s':'')+'</span>':'')+'</button>'}).join('')+'</div>'
      :'<div class="card"><div class="empty">'+ic('bulb')+'<p>Todavía no hay ideas. ¿Con cuál empezamos?</p></div></div>');
}
function modal(html,ancho){
  cerrarModal();const m=document.createElement('div');m.className='modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
  m.innerHTML='<div class="bx'+(ancho?' w':'')+'">'+html+'</div>';document.body.append(m);
  m.addEventListener('mousedown',e=>{if(e.target===m)cerrarModal()});document.addEventListener('keydown',escKey);
  const f=$('input,textarea',m);if(f&&!ancho)setTimeout(()=>f.focus(),60);return m;
}
const escKey=e=>{if(e.key==='Escape')cerrarModal()};
function cerrarModal(){$$('.modal').forEach(m=>m.remove());document.removeEventListener('keydown',escKey)}
function formIdea(i){
  const m=modal('<h3>'+(i?'Editar idea':'Nueva idea')+'</h3><form class="f" id="fi"><label>Título<input name="t" maxlength="160" required placeholder="Ej. Recorrido por el campus en plano secuencia" value="'+esc(i?i.titulo:'')+'"></label>'
    +'<label>Cuéntanos la idea<textarea name="x" rows="5" maxlength="4000" placeholder="¿Qué imaginas? ¿Qué sensación debe dejar?">'+esc(i?i.texto||'':'')+'</textarea></label>'
    +'<label>Enlaces de referencia (uno por línea)<textarea name="l" rows="3" placeholder="https://…">'+esc(i?(i.links||[]).map(l=>l.url).join('\n'):'')+'</textarea></label>'
    +'<div class="acc"><button type="button" class="btn" data-a="cerrar">Cancelar</button><button class="btn p" type="submit">'+ic('check')+' Guardar</button></div></form>');
  $('#fi',m).onsubmit=async e=>{e.preventDefault();const f=e.target,links=f.l.value.split(/\n+/).map(x=>seguro(/^https?:\/\//i.test(x.trim())?x.trim():'https://'+x.trim())).filter(Boolean).slice(0,10).map(u=>({url:u}));
    try{await rpc('pr_idea_guardar',{p_proyecto:ST.p.id,p_id:i?i.id:null,p_titulo:f.t.value,p_texto:f.x.value,p_links:links,p_autor:yo()});cerrarModal();await recargar();toast('Idea guardada')}catch(er){toast(er.message||'No se pudo guardar')}};
}
function verIdea(id){
  const i=ST.ideas.find(x=>x.id===id);if(!i)return;const e=IDEA_EST[i.estado]||IDEA_EST.propuesta,mi=i.autor_rol==='cliente',ed=mi&&(i.estado==='propuesta'||i.estado==='conversando');
  const m=modal('<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+chip(e[0],e[1])+'<span class="sm mu">'+(mi?esc(i.autor||'Tú'):'Faro')+' · '+hace(i.creado)+'</span></div><h3>'+esc(i.titulo)+'</h3>'
    +(i.texto?'<p style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(i.texto)+'</p>':'')
    +((i.links||[]).length?'<div style="display:grid;gap:6px">'+i.links.map(l=>seguro(l.url)?'<a href="'+esc(seguro(l.url))+'" target="_blank" rel="noopener" class="lin" style="text-decoration:none">'+ic('link')+' <span style="overflow-wrap:anywhere">'+esc(dominio(l.url))+'</span></a>':'').join('')+'</div>':'')
    +hiloNotas('idea',i.id)+(ed?'<div class="acc"><button class="btn" data-a="idea-editar" data-id="'+i.id+'">'+ic('edit')+' Editar</button>'+(i.estado==='propuesta'?'<button class="btn" data-a="idea-borrar" data-id="'+i.id+'">'+ic('trash')+' Quitar</button>':'')+'</div>':'')
    +'<button class="btn g" data-a="cerrar">Cerrar</button>',true);
  enlazarHilo(m,'idea',i.id,null);
}
function hiloNotas(obj,id,ver){
  const ns=notasDe(obj,id);
  return '<div style="display:grid;gap:8px"><h4>Conversación</h4>'+(ns.length?ns.map(n=>'<div class="nota"><span class="av">'+esc(ini(n.autor_rol==='faro'?'F':n.autor))+'</span><div style="min-width:0"><div class="h"><b>'+esc(n.autor_rol==='faro'?(n.autor||'Faro'):(n.autor||'Tú'))+'</b>'+(n.version?'<span>versión '+n.version+'</span>':'')+'<span>'+hace(n.creado)+'</span></div><div class="tx">'+esc(n.texto)+'</div></div></div>').join(''):'<p class="sm mu">Aún no hay mensajes aquí.</p>')
    +'<form class="f" data-hilo><textarea name="t" rows="2" maxlength="3000" placeholder="Escribe un comentario…" aria-label="Comentario"></textarea><button class="btn sm o" type="submit">'+ic('send')+' Comentar</button></form></div>';
}
function enlazarHilo(m,obj,id,ver){
  const f=$('[data-hilo]',m);if(!f)return;
  f.onsubmit=async e=>{e.preventDefault();const t=f.t.value.trim();if(!t)return;
    try{await rpc('pr_nota_agregar',{p_proyecto:ST.p.id,p_objeto:obj,p_objeto_id:id,p_version:ver,p_texto:t,p_autor:yo()});ST.notas=(await rows('pr_notas','proyecto_id=eq.'+ST.p.id+'&order=creado.asc'))||ST.notas;
      cerrarModal();obj==='idea'?verIdea(id):verGuion(id)}catch(er){toast(er.message||'No se pudo enviar')}};
}
function vRefs(){
  return '<div class="card"><div style="display:flex;gap:var(--s2);align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:200px"><h3>Referencias y archivos</h3><p class="mu">Comparte lo que nos ayude a entenderte: videos que te gustan, fotos, presentaciones, enlaces. Máximo 38 MB por archivo; para algo más pesado, usa un enlace.</p></div>'
    +'<button class="btn" data-a="ref-link">'+ic('link')+' Agregar enlace</button><button class="btn o" data-a="ref-subir">'+ic('plus')+' Subir archivo</button></div></div>'
    +(ST.refs.length?'<div class="grid">'+ST.refs.map(r=>{const mi=r.autor_rol==='cliente',es=r.key;
      return '<div class="card" style="gap:8px;align-content:start"><div class="pz t'+(r.tipo==='imagen'?'0':'1')+'" style="aspect-ratio:16/10;border-radius:14px;cursor:pointer" '+(es?'data-a="ref-abrir" data-key="'+esc(r.key)+'"':seguro(r.url)?'data-a="ref-url" data-u="'+esc(seguro(r.url))+'"':'')+'><span class="art" '+(r.tipo==='imagen'&&es?'data-img="'+esc(r.key)+'"':'')+'>'+ic(r.tipo==='imagen'?'img':r.tipo==='video'?'film':es?'file':'link')+'</span></div>'
        +'<b style="font-weight:700;overflow-wrap:anywhere">'+esc(r.titulo)+'</b><span class="sm mu">'+(es?'Archivo':esc(dominio(r.url)))+' · '+(mi?esc(r.autor||'Tú'):'Faro')+' · '+hace(r.creado)+'</span>'
        +(mi?'<button class="btn g sm" data-a="ref-borrar" data-id="'+r.id+'">'+ic('trash')+' Quitar</button>':'')+'</div>'}).join('')+'</div>':'<div class="card"><div class="empty">'+ic('link')+'<p>Aún no hay referencias. Sube la primera.</p></div></div>');
}
function vGuiones(){
  const gz=guiones();
  return '<div class="card"><div style="display:flex;gap:var(--s2);align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:200px"><h3>Guiones</h3><p class="mu">Los dos podemos proponer cambios. Cada cambio crea una versión nueva, la anterior se conserva, y cuando apruebas un guion pasa a producción.</p></div><button class="btn o" data-a="gz-nuevo">'+ic('plus')+' Nuevo guion</button></div></div>'
   +(gz.length?'<div style="display:grid;gap:var(--s2)">'+gz.map(g=>{const e=GZ_EST[g.last.estado]||GZ_EST.en_revision;
     return '<button class="gz" data-a="gz-ver" data-id="'+g.id+'"><span class="av" style="border-radius:12px">'+ic('file')+'</span><div><b>'+esc(g.last.titulo)+'</b><span class="sm mu">Versión '+g.last.version+' · '+(g.last.autor_rol==='faro'?'Faro':esc(g.last.autor||'Tú'))+' · '+hace(g.last.creado)+'</span></div>'+chip(e[0],e[1])+'</button>'}).join('')+'</div>'
     :'<div class="card"><div class="empty">'+ic('file')+'<p>Todavía no hay guiones. Faro los irá subiendo, o puedes proponer uno.</p></div></div>');
}
function verGuion(id,ver){
  const g=guiones().find(x=>x.id===id);if(!g)return;const sel=ver?g.vers.find(v=>v.version===ver)||g.last:g.last,esUlt=sel.version===g.last.version;
  const e=GZ_EST[sel.estado]||GZ_EST.en_revision;
  const m=modal('<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+chip(e[0],e[1])+'<span class="sm mu">Versión '+sel.version+' · '+(sel.autor_rol==='faro'?'Faro':esc(sel.autor||'Tú'))+' · '+hace(sel.creado)+'</span></div><h3>'+esc(sel.titulo)+'</h3>'
   +'<div class="vlin" role="group" aria-label="Versiones">'+g.vers.map(v=>'<button class="vn" data-a="gz-ver" data-id="'+id+'" data-v="'+v.version+'" aria-pressed="'+(v.version===sel.version)+'"><span class="nd">V'+v.version+'</span><small>'+fechaC(v.creado)+'</small>'+(v.version===g.last.version?'<em>Actual</em>':'')+'</button>').join('')+'</div>'
   +(sel.nota?'<p class="sm"><b>Qué cambió:</b> '+esc(sel.nota)+'</p>':'')+(!esUlt?'<p class="chip warn" style="justify-self:start">Versión anterior · solo lectura</p>':'')
   +'<div class="libreto">'+esc(sel.texto)+'</div>'
   +(sel.estado==='aprobado'?'<p class="sm" style="color:var(--ok)">'+ic('check')+' Aprobado por <b>'+esc(sel.aprobado_por||'—')+'</b>'+(sel.aprobado_en?' · '+esc(fechaL(sel.aprobado_en)):'')+'</p>':'')
   +(esUlt&&sel.estado!=='aprobado'?'<div class="acc"><button class="btn" data-a="gz-editar" data-id="'+id+'">'+ic('edit')+' Proponer cambios</button><button class="btn ok" data-a="gz-aprobar" data-gid="'+sel.id+'">'+ic('check')+' Aprobar esta versión</button></div>':'')
   +hiloNotas('guion',id,sel.version)+'<button class="btn g" data-a="cerrar">Cerrar</button>',true);
  enlazarHilo(m,'guion',id,sel.version);
}
function formGuion(id){
  const g=id?guiones().find(x=>x.id===id):null,u=g&&g.last;
  const m=modal('<h3>'+(g?'Proponer cambios · '+esc(u.titulo):'Nuevo guion')+'</h3><form class="f" id="fg">'+(g?'':'<label>Título del guion<input name="t" maxlength="160" required placeholder="Ej. Spot institucional 30 s"></label>')
    +'<label>Texto del guion<textarea name="x" rows="14" style="min-height:260px;font-family:inherit" required>'+esc(g?u.texto:'')+'</textarea></label>'
    +'<label>¿Qué cambiaste? (para que todos lo vean)<input name="n" maxlength="600" placeholder="Ej. Acorté la intro y cambié el cierre"></label>'
    +'<p class="sm mu">Se guardará como la <b>versión '+(g?u.version+1:1)+'</b>. La anterior se conserva.</p><div class="acc"><button type="button" class="btn" data-a="cerrar">Cancelar</button><button class="btn p" type="submit">'+ic('check')+' Guardar versión</button></div></form>',true);
  $('#fg',m).onsubmit=async e=>{e.preventDefault();const f=e.target;
    try{await rpc('pr_guion_version',{p_proyecto:ST.p.id,p_guion:g?id:null,p_titulo:g?null:f.t.value,p_texto:f.x.value,p_nota:f.n.value,p_autor:yo()});cerrarModal();await recargar();toast('Versión guardada');if(g)verGuion(id)}catch(er){toast(er.message||'No se pudo guardar')}};
}

/* ---------- Producción: revisión por versiones ---------- */
function vProd(){
  const e=etapa();
  if(e==='pre')return '<div class="card lock">'+ic('lock')+'<h3>La producción empieza cuando se aprueben los guiones</h3><p class="mu" style="max-width:52ch">Cuando termines de revisar los guiones, aquí aparecerán las versiones de cada video y foto para que las veas, marques cambios y apruebes. Todo con marca de agua y sin descarga, solo para revisión.</p><button class="btn o" data-a="ir" data-t="pre" data-s="guiones">Ir a los guiones</button></div>';
  const pz=piezas();
  if(!pz.length)return '<div class="card"><div class="empty">'+ic('film')+'<p>Faro subirá aquí la primera versión de tus piezas. Te avisaremos.</p></div></div>';
  const tipos=Object.keys(ESP).filter(k=>pz.some(x=>espDe(x.last.tipo)===k));
  if(!ST.rv.tipo||!tipos.includes(ST.rv.tipo))ST.rv.tipo=tipos[0];
  const lista=pz.filter(x=>espDe(x.last.tipo)===ST.rv.tipo);
  if(!ST.rv.sel||!lista.some(x=>x.id===ST.rv.sel)){ST.rv.sel=lista[0].id;ST.rv.ver=null}
  const p=ST.p,n=pz.filter(x=>x.last.estado==='aprobado').length;
  const reglas=p.estado==='en_revision'?(p.rondas_max?'<b>Ronda '+p.ronda+' de '+p.rondas_max+'.</b> Tu proyecto incluye '+p.rondas_max+' rondas de cambios. Revisa cada pieza, deja tus notas (puedes marcar el minuto exacto) y, cuando termines con todas, toca <b>Enviar ronda</b>. Reúne todas tus correcciones antes de enviarla.':'<b>Ronda '+p.ronda+'.</b> Revisa cada pieza, deja tus notas y, cuando termines, toca <b>Enviar ronda</b>. Puedes pedir los cambios que necesites.')
    :p.estado==='cambios_pedidos'?'Recibimos tu <b>ronda '+p.ronda+'</b>. Estamos trabajando en los cambios; verás la nueva versión aquí y te avisaremos.':'<b>Todo aprobado.</b> Tus archivos finales están en la pestaña Entregas.';
  return '<div class="card" style="text-align:center;justify-items:center"><div class="chips" style="justify-content:center">'+chip(ic('layers')+' '+(p.rondas_max?'Ronda '+p.ronda+' de '+p.rondas_max:'Ronda '+p.ronda+' · sin límite'),'gold')+chip((ESTADOS[p.estado]||['',''])[0],(ESTADOS[p.estado]||['',''])[1])+chip(n+' de '+pz.length+' aprobadas','')+'</div><p class="sm" style="max-width:70ch">'+reglas+'</p></div>'
   +(tipos.length>1?'<div class="sub-tabs">'+tipos.map(k=>{const L=pz.filter(x=>espDe(x.last.tipo)===k),a=L.filter(x=>x.last.estado==='aprobado').length;return '<button class="pill" data-a="esp" data-k="'+k+'" aria-pressed="'+(ST.rv.tipo===k)+'">'+ic(ESP[k][1])+ESP[k][0]+' · '+a+' de '+L.length+'</button>'}).join('')+'</div>':'')
   +'<div class="grid">'+lista.map(x=>{const l=x.last,lk=ST.links[l.id],est=l.estado;
     const art=l.tipo==='imagen'&&lk?'<img src="'+esc(lk.urlMini||lk.urlVer)+'" alt="" loading="lazy">':l.tipo==='video'&&lk?'<video muted playsinline preload="metadata" src="'+esc(lk.urlVer)+'#t=0.6"></video>':ic(l.tipo==='video'?'film':l.tipo==='imagen'?'img':'file');
     return '<button class="pz" data-a="pieza" data-id="'+x.id+'" aria-current="'+(x.id===ST.rv.sel)+'"><span class="art">'+art+'</span><span class="vv">V'+l.version+'</span><span class="sello '+(est==='aprobado'?'ok':est==='cambios'?'cam':'')+'" aria-label="'+(est==='aprobado'?'Aprobada':est==='cambios'?'Con cambios':'Sin revisar')+'">'+ic(est==='aprobado'?'check':est==='cambios'?'edit':'clock')+'</span><span class="inf"><span class="nm">'+esc(l.nombre)+'</span></span></button>'}).join('')+'</div>'
   +'<div id="sala"></div>';
}
function pintaSala(){
  const c=$('#sala');if(!c)return;const x=piezas().find(z=>z.id===ST.rv.sel);if(!x){c.innerHTML='';return}
  const p=ST.p,l=x.last,vn=ST.rv.ver||l.version,a=x.vers.find(v=>v.version===vn)||l,esUlt=a.id===l.id,edit=esUlt&&p.estado==='en_revision';
  const lk=ST.links[a.id],media=a.tipo==='video'||a.tipo==='audio';
  let m='<div class="agua">Versión de revisión · sin descarga</div>';
  if(!lk)m+='<p class="mu" style="padding:40px">No se pudo cargar este archivo. Recarga la página.</p>';
  else if(a.tipo==='video')m+='<video id="pl" controls playsinline preload="metadata" src="'+esc(lk.urlVer)+'" controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false"></video>';
  else if(a.tipo==='audio')m+='<audio id="pl" controls preload="metadata" src="'+esc(lk.urlVer)+'" controlsList="nodownload" style="width:92%;margin:60px 0"></audio>';
  else if(a.tipo==='imagen')m+='<img src="'+esc(lk.urlVer)+'" alt="'+esc(a.nombre)+'" oncontextmenu="return false">';
  else if(a.tipo==='pdf')m+='<iframe src="'+esc(lk.urlVer)+'" title="'+esc(a.nombre)+'"></iframe>';
  else m+='<p class="mu" style="padding:40px">'+ic('file')+' '+esc(a.nombre)+'</p>';
  const ids=x.vers.map(v=>v.id),verDe=id=>(x.vers.find(v=>v.id===id)||{}).version;
  const cs=ST.com.filter(k=>ids.includes(k.archivo_id));
  const b=ST.rv.b;
  let side='<h4>Versiones</h4><div class="vlin" role="group" aria-label="Versiones">'+x.vers.map(v=>'<button class="vn" data-a="ver" data-n="'+v.version+'" aria-pressed="'+(v.version===vn)+'"><span class="nd">V'+v.version+'</span><small>'+fechaC(v.creado)+'</small>'+(v.id===l.id?'<em>Actual</em>':'')+'</button>').join('')+'</div>';
  if(a.nota_version)side+='<p class="sm"><b>Qué se corrigió en la V'+a.version+':</b> '+esc(a.nota_version)+'</p>';
  if(!esUlt)side+='<p class="chip warn" style="justify-self:start">Versión anterior · solo lectura</p>';
  if(a.estado!=='pendiente'&&a.estado_por)side+='<p class="sm mu">'+(a.estado==='aprobado'?'Aprobada':'Marcada con cambios')+' por <b style="color:var(--ink)">'+esc(a.estado_por)+'</b>'+(a.estado_en?' · '+hace(a.estado_en):'')+'</p>';
  if(edit)side+='<div class="acc"><button class="btn ok'+(a.estado==='aprobado'?' sel':'')+'" data-a="marcar" data-e="aprobado">'+ic('check')+' '+(a.estado==='aprobado'?'Aprobada':'Aprobar')+'</button><button class="btn p'+(a.estado==='cambios'?' sel':'')+'" data-a="marcar" data-e="cambios">'+ic('edit')+' Necesita cambios</button></div>';
  else if(esUlt)side+='<div>'+chip((ESTADOS[a.estado==='aprobado'?'aprobado':p.estado]||['',''])[0],'')+'</div>';
  if(edit){
    side+='<h4>Tu nota'+(varios()?' · '+esc(yo()):'')+'</h4><div class="chips" id="chv">'+[['gusta','Me gusta','thumb'],['cambio','Quiero un cambio','edit'],['nota','Nota','chat']].map(t=>'<button class="pill" data-a="tipo-nota" data-v="'+t[0]+'" aria-pressed="'+(b.v===t[0])+'">'+ic(t[2])+t[1]+'</button>').join('')+'</div>'
     +(media?'<button class="btn sm" data-a="marcar-t" style="justify-self:start">'+ic('clock')+' <span id="tmv">'+(b.t!=null?'En '+mmss(b.t):'Marcar el momento actual')+'</span></button>':'')
     +'<div class="f"><textarea data-draft placeholder="'+(b.v==='gusta'?'¿Qué te gustó de esta pieza?':b.v==='cambio'?'¿Qué quieres que cambiemos? Sé lo más claro posible.':'Escribe tu nota…')+'" aria-label="Tu nota">'+esc(b.texto||'')+'</textarea></div><button class="btn o" data-a="guardar-nota">'+ic('check')+' Guardar nota</button>';
  }
  side+='<h4>Notas</h4>';
  if(!cs.length)side+='<p class="sm mu">'+(edit?'Aún no hay notas aquí. Dinos qué te gusta y qué quieres cambiar.':'No hay notas en esta pieza.')+'</p>';
  const vers=[...new Set(cs.map(k=>verDe(k.archivo_id)))].sort((q,r)=>r-q);
  vers.forEach(v=>{side+='<div class="grp">En la V'+v+'</div>';
    cs.filter(k=>verDe(k.archivo_id)===v).forEach(k=>{
      side+='<div class="nota'+(k.valoracion==='cambio'?' c':'')+(k.resuelto?' r':'')+'"><span class="av">'+esc(ini(k.autor||yo()||'T'))+'</span><div style="min-width:0"><div class="h"><b>'+esc(k.autor||'Tú')+'</b><span>'+(k.valoracion==='gusta'?'Me gusta':k.valoracion==='cambio'?'Cambio':'Nota')+' · ronda '+k.ronda+(k.enviado?'':' · borrador')+'</span>'
       +(k.segundo!=null?'<button class="tc" data-a="ir-t" data-s="'+k.segundo+'">'+mmss(k.segundo)+'</button>':'')
       +(!k.enviado?'<button class="btn g sm" style="min-height:30px;padding:2px 8px" data-a="quitar-nota" data-id="'+k.id+'" aria-label="Quitar nota">'+ic('x')+'</button>':'')+'</div><div class="tx">'+esc(k.texto)+'</div>'
       +(k.resuelto?'<div class="rs">'+ic('check')+' '+(k.resolucion?esc(k.resolucion):'Corregido por Faro')+(k.resuelto_por?' · '+esc(k.resuelto_por):'')+'</div>':'')+'</div></div>'})});
  const hs=ST.hist.filter(h=>h.pieza_id===x.id||ids.includes(h.archivo_id));
  if(hs.length)side+='<details><summary class="mu sm" style="min-height:48px;display:flex;align-items:center;gap:8px">'+ic('clock')+' Historial de esta pieza · '+hs.length+'</summary><ul class="tl">'+hs.map(h=>'<li>'+esc(({version:'Faro subió',aprobado:'Aprobó',cambios:'Pidió cambios en',pendiente:'Quitó la marca de',resuelto:'Corrigió'})[h.evento]||h.evento)+' la V'+(h.version||'?')+'<small>'+esc(h.autor||'Faro')+' · '+hace(h.creado)+'</small></li>').join('')+'</ul></details>';
  c.innerHTML='<div class="card"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3 style="flex:1;min-width:0;overflow-wrap:anywhere">'+esc(a.nombre)+'</h3>'+chip(a.estado==='aprobado'?'Aprobada':a.estado==='cambios'?'Con cambios':'Sin revisar',a.estado==='aprobado'?'ok':a.estado==='cambios'?'cam':'')+'</div><div class="room"><div class="media" style="align-self:start">'+m+'</div><div style="display:grid;gap:var(--s2);min-width:0">'+side+'</div></div></div>';
  const tx=$('textarea[data-draft]',c);if(tx)tx.addEventListener('input',()=>{ST.rv.b.texto=tx.value});
}
function barraEnvio(){
  const p=ST.p;if(p.estado!=='en_revision'||etapa()==='pre')return '';const pz=piezas();if(!pz.length)return '';
  const c=pz.filter(x=>x.last.estado==='cambios').length,a=pz.filter(x=>x.last.estado==='aprobado').length,pend=pz.length-a-c;
  return '<div class="fin"><div class="in"><div class="l"><b>'+c+' con cambios · '+a+' aprobadas</b>'+(pend?pend+' sin marcar':'Todo marcado')+'</div><button class="btn p" data-a="enviar">'+ic('send')+' ENVIAR RONDA</button></div></div>';
}
async function marcarPieza(e2){
  const x=piezas().find(z=>z.id===ST.rv.sel);if(!x)return;const a=x.last,ne=a.estado===e2?'pendiente':e2;
  try{await rpc('en_marcar_archivo',{p_archivo:a.id,p_estado:ne,p_autor:yo()});a.estado=ne;a.estado_por=ne==='pendiente'?null:yo();a.estado_en=new Date().toISOString();
    ST.hist=(await rows('en_historial','proyecto_id=eq.'+ST.p.id+'&order=creado.desc&limit=200'))||ST.hist;render()}catch(e){toast(e.message||'No se pudo marcar')}
}
async function guardarNota(){
  const x=piezas().find(z=>z.id===ST.rv.sel);if(!x)return;const a=x.last,b=ST.rv.b,t=(($('textarea[data-draft]')||{}).value||b.texto||'').trim();
  if(!t&&b.v!=='gusta')return toast('Escribe tu nota primero');
  const body={archivo_id:a.id,proyecto_id:ST.p.id,ronda:ST.p.ronda,valoracion:b.v,texto:t||'Me gusta.',autor:yo()};if(b.t!=null)body.segundo=b.t;
  const r=await api('/rest/v1/en_comentarios',{method:'POST',body,headers:{Prefer:'return=representation'}});
  if(!r.ok){toast('No se pudo guardar. Intenta otra vez.');return}
  const j=await r.json();ST.com.push(Array.isArray(j)?j[0]:j);ST.rv.b={v:'nota'};pintaSala();toast('Nota guardada');
}
function confirmarEnvio(){
  const p=ST.p,pz=piezas(),a=pz.filter(x=>x.last.estado==='aprobado').length,c=pz.filter(x=>x.last.estado==='cambios').length,pend=pz.length-a-c;
  const ids=pz.map(x=>x.last.id),nN=ST.com.filter(k=>!k.enviado&&k.ronda===p.ronda&&ids.includes(k.archivo_id)).length,queda=p.rondas_max?p.rondas_max-p.ronda:null;
  const m=modal('<h3>Enviar la ronda '+p.ronda+'</h3><div class="res"><div><b>'+a+'</b><span>Aprobadas</span></div><div><b>'+c+'</b><span>Con cambios</span></div><div><b>'+nN+'</b><span>Notas</span></div></div>'
   +(pend?'<p class="sm" style="color:var(--warn)">'+pend+' pieza'+(pend>1?'s':'')+' sin marcar. Si las envías así, las tomaremos como revisadas sin cambios.</p>':'')
   +(queda!=null?'<p class="sm">'+(queda>0?'Después de esta ronda te quedará'+(queda>1?'n ':' ')+queda+' ronda'+(queda>1?'s':'')+' de cambios incluida'+(queda>1?'s':'')+'.':'Esta es la <b>última ronda incluida</b> en tu proyecto. Los cambios adicionales se cotizan aparte.')+'</p>':'<p class="sm mu">Tu proyecto no tiene límite de rondas.</p>')
   +'<p class="sm mu">Al enviarla ya no podrás editar estas notas. Revisa que no falte nada.</p><div class="acc"><button class="btn" data-a="cerrar">Seguir revisando</button><button class="btn p" data-a="enviar-ok">'+ic('send')+' Enviar ronda</button></div>');
}
async function enviarRonda(btn){
  btn.disabled=true;btn.textContent='Enviando…';
  const t=($('textarea[data-draft]')||{}).value;if(t&&t.trim()){await guardarNota()}
  try{await rpc('en_enviar_ronda',{p_proyecto:ST.p.id,p_autor:yo()});cerrarModal();toast('Ronda enviada. ¡Gracias!');
    const ps=await rows('en_proyectos','select=*&order=creado.desc');if(ps)ST.proyectos=ps;ST.p=ST.proyectos.find(z=>z.id===ST.p.id)||ST.p;await recargar()}
  catch(e){cerrarModal();toast(e.message||'No se pudo enviar. Intenta otra vez.')}
}

/* ---------- Entregas ---------- */
function vEnt(){
  const e=etapa(),fl=finales(),ok=ST.p.estado==='aprobado'||ST.p.estado==='entregado';
  if(e!=='entrega'&&!fl.length)return '<div class="card lock">'+ic('lock')+'<h3>Tus archivos finales llegan aquí</h3><p class="mu" style="max-width:52ch">Cuando apruebes todas las piezas, subiremos los archivos finales en alta calidad para que los descargues.</p></div>';
  const s=saldo();
  return '<div class="card"><h3>Entregas</h3><p class="mu">'+(ok?'Tus archivos finales, en la mejor calidad. Descárgalos cuando quieras.':'Estos son tus archivos finales. Se habilitan para descarga cuando todo esté aprobado.')+'</p>'
    +(s&&s.sal>0&&ST.fin.visible!==false?'<p class="sm chip warn" style="justify-self:start">'+ic('coin')+' Saldo pendiente: '+money(s.sal,ST.fin.moneda)+'</p>':'')+'</div>'
    +(fl.length?'<div style="display:grid;gap:var(--s2)">'+fl.map(a=>{const lk=ST.links[a.id];
      return '<div class="lin"><span class="av" style="border-radius:12px;width:44px;height:44px">'+ic(a.tipo==='video'?'film':a.tipo==='imagen'?'img':a.tipo==='audio'?'note':'file')+'</span><div><b style="overflow-wrap:anywhere">'+esc(a.nombre)+'</b><span class="sm mu">'+(a.version>1?'Versión '+a.version+' · ':'')+fechaC(a.creado)+'</span></div>'
        +(lk&&lk.url?'<button class="btn o" data-a="bajar" data-id="'+a.id+'">'+ic('dl')+' Descargar</button>':'<button class="btn" disabled>'+ic('lock')+' Al aprobar todo</button>')+'</div>'}).join('')+'</div>'
      :'<div class="card"><div class="empty">'+ic('dl')+'<p>Estamos preparando tus archivos finales.</p></div></div>');
}

/* ---------- Pagos y documentos ---------- */
function vPagos(){
  const s=saldo(),f=ST.fin,mon=f?f.moneda:'GTQ',vis=f&&f.visible!==false;
  let h='';
  if(vis&&s){h+='<div class="card"><h3>Pagos</h3><div class="kpis"><div class="kpi"><b>'+money(s.tot,mon)+'</b><span>Total</span></div><div class="kpi"><b style="color:var(--ok)">'+money(s.pag,mon)+'</b><span>Pagado</span></div><div class="kpi"><b>'+money(s.sal,mon)+'</b><span>Saldo</span></div></div>'
    +'<div class="bar" role="progressbar" aria-valuenow="'+s.pct+'" aria-valuemin="0" aria-valuemax="100" aria-label="Pagado"><i style="width:'+s.pct+'%"></i></div>'+(f.nota?'<p class="sm mu">'+esc(f.nota)+'</p>':'')
    +(ST.pagos.length?'<div style="display:grid;gap:8px">'+ST.pagos.map(x=>'<div class="lin"><div><b>'+esc(x.concepto)+'</b><span class="sm mu">'+money(x.monto,mon)+(x.fecha?' · '+fechaC(x.fecha):'')+(x.metodo?' · '+esc(x.metodo):'')+'</span></div>'+chip(x.estado==='confirmado'?'Confirmado':x.estado==='reportado'?'Comprobante enviado':'Pendiente',x.estado==='confirmado'?'ok':x.estado==='reportado'?'gold':'warn')
      +(x.estado!=='confirmado'?'<button class="btn sm '+(x.estado==='pendiente'?'o':'')+'" data-a="pago-rep" data-id="'+x.id+'">'+ic('plus')+' '+(x.estado==='pendiente'?'Ya pagué · subir comprobante':'Cambiar comprobante')+'</button>':'')+'</div>').join('')+'</div>':'<p class="mu">Aún no hay pagos registrados.</p>')
    +'<button class="btn g sm" data-a="pago-rep" data-id="">'+ic('plus')+' Reportar otro pago</button></div>'}
  const dc=ST.docs;
  h+='<div class="card"><h3>Documentos</h3><p class="mu">Cotizaciones, contratos, facturas y recibos de tu proyecto, siempre a la mano.</p>'
   +(dc.length?'<div style="display:grid;gap:8px">'+dc.map(d=>'<div class="lin"><span class="av" style="border-radius:12px;width:44px;height:44px">'+ic('file')+'</span><div><b style="overflow-wrap:anywhere">'+esc(d.titulo)+'</b><span class="sm mu">'+(DOC_T[d.tipo]||'Documento')+(d.monto!=null?' · '+money(d.monto,mon):'')+(d.fecha?' · '+fechaC(d.fecha):'')+'</span></div>'
     +(d.key?'<button class="btn sm" data-a="doc-ver" data-key="'+esc(d.key)+'">'+ic('dl')+' Abrir</button>':seguro(d.url)?'<a class="btn sm" href="'+esc(seguro(d.url))+'" target="_blank" rel="noopener">'+ic('link')+' Abrir</a>':'')+'</div>').join('')+'</div>':'<div class="empty">'+ic('file')+'<p>Cuando Faro suba tus documentos, aparecerán aquí.</p></div>')+'</div>';
  return h;
}
function formPago(id){
  const x=id?ST.pagos.find(z=>z.id===id):null;
  const m=modal('<h3>'+(x?'Comprobante · '+esc(x.concepto):'Reportar un pago')+'</h3><form class="f" id="fp">'+(x?'':'<label>Concepto<input name="c" maxlength="200" placeholder="Ej. Anticipo" required></label><label>Monto<input name="m" type="number" step="0.01" min="0" inputmode="decimal" required></label>')
   +'<label>Comprobante (foto o PDF)<input name="f" type="file" accept="image/*,.pdf"></label><label>Nota (opcional)<input name="n" maxlength="500" placeholder="Ej. Transferencia del 3 de noviembre"></label>'
   +'<p class="sm mu">Faro confirmará el pago al revisarlo. No se cobra nada desde aquí.</p><div class="acc"><button type="button" class="btn" data-a="cerrar">Cancelar</button><button class="btn p" type="submit">'+ic('send')+' Enviar</button></div></form>');
  $('#fp',m).onsubmit=async e=>{e.preventDefault();const f=e.target,b=$('button[type=submit]',f);b.disabled=true;b.textContent='Enviando…';let key=null;
    if(f.f.files&&f.f.files[0]){key=await subirArchivo(f.f.files[0],'pago');if(!key){b.disabled=false;b.textContent='Enviar';return}}
    try{await rpc('pr_pago_reportar',{p_proyecto:ST.p.id,p_pago:x?x.id:null,p_concepto:x?null:f.c.value,p_monto:x?null:+f.m.value,p_key:key,p_nota:f.n.value,p_autor:yo()});cerrarModal();await recargar();toast('Enviamos tu comprobante a Faro')}
    catch(er){b.disabled=false;b.textContent='Enviar';toast(er.message||'No se pudo enviar')}};
}

/* ---------- acciones ---------- */
async function recargar(){await cargar();render()}
const ACT={
  tema(){const d=document.documentElement,l=d.getAttribute('data-theme')==='light'||(!d.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme:light)').matches);const n=l?'dark':'light';d.setAttribute('data-theme',n);lsSet('faro_tema',n);
    const b=$('[data-a="tema"]');if(b)b.outerHTML=temaBtn()},
  salir(){salir('')},
  proy(t){ST.p=ST.proyectos.find(x=>x.id===t.value)||ST.p;try{sessionStorage.setItem('faro_prod_p',ST.p.id)}catch(e){}ST.tab='resumen';ST.rv={tipo:null,sel:null,ver:null,b:{v:'nota'}};recargar()},
  tab(t){irTab(t.dataset.t)},ir(t){irTab(t.dataset.t,t.dataset.s)},sub(t){ST.sub=t.dataset.s;render()},
  'cambiar-yo'(){pantallaQuien()},soy(t){fijarYo(t.dataset.n)},'soy-nuevo'(){fijarYo(($('#qn')||{}).value)},
  cerrar(){cerrarModal()},
  'subir-logo'(){seleccionar('image/*',async f=>{toast('Subiendo logo…');const k=await subirArchivo(f,'logo');if(k&&await guardarMarca({logo_key:k}))render()})},
  'subir-bb'(){seleccionar('.pdf,application/pdf',async f=>{toast('Subiendo…');const k=await subirArchivo(f,'brandbook');if(k&&await guardarMarca({brandbook_key:k}))render()})},
  async 'ver-bb'(t,e){e.preventDefault();const l=ST.miperfil&&await enlaceKey(ST.miperfil.brandbook_key);if(l)window.open(l.urlVer,'_blank','noopener');else toast('No se pudo abrir')},
  'idea-nueva'(){formIdea(null)},'idea-ver'(t){verIdea(t.dataset.id)},'idea-editar'(t){const i=ST.ideas.find(x=>x.id===t.dataset.id);cerrarModal();formIdea(i)},
  async 'idea-borrar'(t){try{await rpc('pr_idea_borrar',{p_id:t.dataset.id});cerrarModal();await recargar();toast('Idea quitada')}catch(e){toast(e.message||'No se pudo quitar')}},
  'ref-link'(){const m=modal('<h3>Agregar un enlace</h3><form class="f" id="fr"><label>Enlace<input name="u" type="url" placeholder="https://…" required></label><label>Descripción (opcional)<input name="t" maxlength="200" placeholder="Ej. Video que nos gusta de la competencia"></label><div class="acc"><button type="button" class="btn" data-a="cerrar">Cancelar</button><button class="btn p" type="submit">'+ic('check')+' Guardar</button></div></form>');
    $('#fr',m).onsubmit=async e=>{e.preventDefault();const f=e.target;try{await rpc('pr_ref_guardar',{p_proyecto:ST.p.id,p_titulo:f.t.value||dominio(f.u.value),p_url:f.u.value,p_key:null,p_tipo:'link',p_autor:yo()});cerrarModal();await recargar();toast('Enlace agregado')}catch(er){toast(er.message||'No se pudo guardar')}}},
  'ref-subir'(){seleccionar('',async f=>{toast('Subiendo…');const k=await subirArchivo(f,'ref');if(!k)return;
    try{await rpc('pr_ref_guardar',{p_proyecto:ST.p.id,p_titulo:f.name,p_url:null,p_key:k,p_tipo:tipoDeNombre(f.name),p_autor:yo()});await recargar();toast('Archivo agregado')}catch(e){toast(e.message||'No se pudo guardar')}})},
  async 'ref-abrir'(t){const l=await enlaceKey(t.dataset.key);if(l)window.open(l.urlVer,'_blank','noopener');else toast('No se pudo abrir')},
  'ref-url'(t){window.open(t.dataset.u,'_blank','noopener')},
  async 'ref-borrar'(t){try{await rpc('pr_ref_borrar',{p_id:t.dataset.id});await recargar();toast('Quitado')}catch(e){toast(e.message||'No se pudo quitar')}},
  'gz-nuevo'(){formGuion(null)},'gz-ver'(t){verGuion(t.dataset.id,t.dataset.v?+t.dataset.v:null)},'gz-editar'(t){cerrarModal();formGuion(t.dataset.id)},
  async 'gz-aprobar'(t){try{await rpc('pr_guion_aprobar',{p_id:t.dataset.gid,p_aprobar:true,p_autor:yo()});cerrarModal();await recargar();toast('Guion aprobado')}catch(e){toast(e.message||'No se pudo aprobar')}},
  esp(t){ST.rv.tipo=t.dataset.k;ST.rv.sel=null;ST.rv.ver=null;render()},
  pieza(t){ST.rv.sel=t.dataset.id;ST.rv.ver=null;ST.rv.b={v:'nota'};render();const s=$('#sala');if(s)s.scrollIntoView({behavior:'smooth',block:'start'})},
  ver(t){const x=piezas().find(z=>z.id===ST.rv.sel);const n=+t.dataset.n;ST.rv.ver=x&&n===x.last.version?null:n;pintaSala()},
  'tipo-nota'(t){const tx=$('textarea[data-draft]');if(tx)ST.rv.b.texto=tx.value;ST.rv.b.v=t.dataset.v;pintaSala()},
  'marcar-t'(){const pl=$('#pl');if(!pl)return;ST.rv.b.t=Math.floor(pl.currentTime);const v=$('#tmv');if(v)v.textContent='En '+mmss(ST.rv.b.t)},
  marcar(t){marcarPieza(t.dataset.e)},'guardar-nota'(){guardarNota()},
  'ir-t'(t){const pl=$('#pl');if(pl){pl.currentTime=+t.dataset.s;pl.play().catch(()=>{})}},
  async 'quitar-nota'(t){const r=await api('/rest/v1/en_comentarios?id=eq.'+t.dataset.id,{method:'DELETE',headers:{Prefer:'return=minimal'}});if(r.ok){ST.com=ST.com.filter(k=>k.id!==t.dataset.id);pintaSala()}else toast('No se pudo quitar')},
  enviar(){confirmarEnvio()},'enviar-ok'(t){enviarRonda(t)},
  bajar(t){const l=ST.links[t.dataset.id];if(!l||!l.url)return toast('Podrás descargarlo cuando se apruebe todo');const a=document.createElement('a');a.href=l.url;a.rel='noopener';document.body.append(a);a.click();a.remove()},
  'pago-rep'(t){formPago(t.dataset.id||null)},
  async 'doc-ver'(t){const l=await enlaceKey(t.dataset.key);if(l)window.open(l.urlVer,'_blank','noopener');else toast('No se pudo abrir')}
};
APP.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(!t||t.tagName==='SELECT')return;const f=ACT[t.dataset.a];if(f)f(t,e)});
APP.addEventListener('change',e=>{const t=e.target.closest('select[data-a]');if(t&&ACT[t.dataset.a])ACT[t.dataset.a](t,e)});
document.addEventListener('click',e=>{const t=e.target.closest('.modal [data-a]');if(!t)return;const f=ACT[t.dataset.a];if(f)f(t,e)});
document.addEventListener('submit',e=>{const f=e.target;if(f.id==='fmarca'){e.preventDefault();guardarMarca().then(ok=>{if(ok)render()})}});
/* imágenes de referencia: miniatura con enlace temporal */
new MutationObserver(()=>{$$('[data-img]:not([data-ok])').forEach(async el=>{el.dataset.ok='1';const l=await enlaceKey(el.dataset.img);if(l)el.innerHTML='<img src="'+esc(l.urlVer)+'" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">'})}).observe(APP,{childList:true,subtree:true});
/* al volver a la pestaña, trae lo nuevo sin molestar si está escribiendo */
document.addEventListener('visibilitychange',()=>{if(document.hidden||!ST.p||Date.now()-ST.cargadoEn<90000)return;const a=document.activeElement;
  if($('.modal')||(a&&/^(TEXTAREA|INPUT)$/.test(a.tagName)&&a.value))return;recargar()});
(async()=>{if(SES){await arrancar()}else pantallaLogin('')})();
