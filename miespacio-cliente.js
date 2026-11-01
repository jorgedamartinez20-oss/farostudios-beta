/* Faro Studios · Mi espacio · vistas del cliente (estado de la sesión, agenda, galería, aviso y acceso caducado).
   Se carga después del script principal de miespacio.html y usa sus funciones (rows, api, ic, esc, fecha…). */
(function(){
'use strict';
const GT=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Guatemala'});
const fLarga=i=>i?fecha(i,{weekday:'long',day:'numeric',month:'long'}):'';
const fCorta=i=>i?fecha(i,{day:'numeric',month:'short'}):'';
const dif=(a,b)=>Math.round((+new Date(b+'T00:00:00Z')-+new Date(a+'T00:00:00Z'))/864e5);
const WA_MSG=t=>WA+'?text='+encodeURIComponent(t);
const AVISO=['Este perfil es temporal y de uso exclusivo para el proceso de entregas.','Es un usuario momentáneo que dura mientras estemos en el proceso de sesión y entrega, por el tiempo acordado, y sirve para el resguardo de tu galería.','Al terminar, el perfil se elimina.'];

/* ---------- qué mostrar según el estado de cada sesión ---------- */
const nDias=s=>(s.dias_habiles||[]).filter(d=>d<=GT()).length;   /* días hábiles ya transcurridos (0 a 5) */
function estadoSes(s){
  const hoy=GT();
  if(s.estado==='lista')return{k:'lista',tit:'¡Tu galería está lista!',txt:'Ya puedes verla, elegir tus favoritas y descargar tu material.'};
  if(s.estado==='realizada'){
    const n=nDias(s),falta=Math.max(0,5-n);
    const b={n,falta,entrega:s.entrega_fecha};
    if(n<=1)return Object.assign(b,{k:'recibida',tit:'Tu sesión se realizó',txt:'Ya tenemos tu material y estamos comenzando a prepararlo.'});
    return Object.assign(b,{k:'edicion',tit:'Estamos editando tu sesión',txt:'Espera nuestra confirmación. Cuando esté lista, te lo mostramos aquí mismo.'});
  }
  if(s.estado==='agendada'){const d=s.fecha?dif(hoy,s.fecha):null;
    return{k:'agendada',tit:'Tu sesión está agendada',txt:s.fecha?fLarga(s.fecha)+(s.hora?' · '+s.hora:''):'Pronto te confirmamos la fecha.',dias:d}}
  return null}
function principal(ses){
  const v=(ses||[]).filter(s=>s.estado!=='cancelada');
  return v.find(s=>s.estado==='realizada')||v.filter(s=>s.estado==='agendada').sort((a,b)=>String(a.fecha||'9').localeCompare(String(b.fecha||'9')))[0]||v.filter(s=>s.estado==='lista').pop()||null}
window.msEstadoSes=estadoSes;

/* ---------- tarjeta de estado (inicio) ---------- */
function anillo(falta){const p=Math.max(0,Math.min(1,(5-falta)/5)),R=52,C=2*Math.PI*R;
  return '<div class="ms-ring" role="img" aria-label="Faltan '+falta+' días hábiles"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="'+R+'" class="b"/><circle cx="60" cy="60" r="'+R+'" class="f" style="stroke-dasharray:'+(C*p).toFixed(1)+' '+C.toFixed(1)+'"/></svg><div><b>'+falta+'</b><small>'+(falta===1?'día hábil':'días hábiles')+'</small></div></div>'}
function tarjetaEstado(s){
  if(!s)return '<div class="ms-card ms-est"><div class="ms-ic">'+ic('cal')+'</div><div class="ms-et"><h2>Aquí verás el estado de tu sesión</h2><p>Cuando agendemos tu sesión aparecerá en este espacio, con su fecha, el avance y la entrega.</p></div></div>';
  const e=estadoSes(s);let cuerpo='';
  if(e.k==='agendada'){
    const d=e.dias,chip=d==null?'':d<0?'':d===0?'Es hoy':d===1?'Es mañana':'Faltan '+d+' días';
    cuerpo='<div class="ms-ic">'+ic('camera')+'</div><div class="ms-et"><span class="ms-pill">Agendada</span><h2>'+esc(s.titulo)+'</h2><p>'+esc(fLarga(s.fecha||'')||e.txt)+(s.hora?' · '+esc(s.hora):'')+'</p>'+(chip?'<b class="ms-chip">'+chip+'</b>':'')+'</div>'}
  else if(e.k==='recibida'||e.k==='edicion'){
    const dias=(s.dias_habiles||[]).map((d,i)=>'<span class="'+(d<=GT()?'ok':'')+'" title="'+esc(fLarga(d))+'">Día '+(i+1)+'</span>').join('');
    const fin=e.falta===0?'<b>Hoy es la fecha estimada de entrega.</b>':'<b>Entrega estimada: '+esc(fLarga(e.entrega))+'</b>';
    cuerpo='<div class="ms-et" style="flex:1 1 280px"><span class="ms-pill '+(e.k==='edicion'?'ed':'')+'">'+(e.k==='edicion'?'En edición':'Sesión realizada')+'</span><h2>'+e.tit+'</h2><p>'+e.txt+'</p><p class="ms-ent">'+fin+'<small>Contamos solo días hábiles: no cuentan sábados, domingos ni feriados.</small></p><div class="ms-dias">'+dias+'</div></div>'+anillo(e.falta)}
  else if(e.k==='lista'){
    cuerpo='<div class="ms-et" style="flex:1 1 100%"><span class="ms-pill ok">Lista</span><h2>'+e.tit+'</h2><p>'+e.txt+'</p><div id="ms-cover" class="ms-cover" hidden></div><div class="ms-row"><button class="btn y" type="button" id="ms-abrir">'+ic('image')+'Abrir mi galería</button></div></div>'}
  return '<div class="ms-card ms-est ms-k-'+e.k+'">'+cuerpo+'</div>'}

/* ---------- portada de la galería (la misma de Entregas) ---------- */
async function pintaPortada(){
  const box=$('#ms-cover');if(!box||!S.cli)return;
  const s=principal(S.cli.ses);if(!s||s.estado!=='lista'||!s.proyecto_id)return;
  try{
    const [pr]=await rows('en_proyectos','id=eq.'+s.proyecto_id+'&select=id,titulo,config');if(!pr)return;
    const cfg=pr.config||{},arch=await rows('en_archivos','proyecto_id=eq.'+pr.id+'&select=id,tipo,orden&order=orden.asc');
    const img=arch.find(a=>a.id===cfg.portada)||arch.find(a=>a.tipo==='imagen')||arch[0];if(!img)return;
    const r=await fetch(RW+'/api/mi/enlaces',{method:'POST',headers:{Authorization:'Bearer '+SES.access,'Content-Type':'application/json'},body:JSON.stringify({ids:[img.id]})});
    const j=await r.json(),l=(j.enlaces||{})[img.id];if(!l||!l.url)return;
    const cb=cfg.cubierta||{},foco=cfg.foco||{x:50,y:50};
    box.hidden=false;
    if(window.FaroPortada){
      FaroPortada.render(box,{estilo:cb.estilo||'centro',titulo:cfg.titulo||pr.titulo,fecha:'',src:l.url,fx:typeof cb.fx==='number'?cb.fx:(+foco.x||50)/100,fy:typeof cb.fy==='number'?cb.fy:(+foco.y||50)/100,zoom:+cb.zoom>=1?+cb.zoom:1,ov:Math.max(0,Math.min(70,+cb.ov||0)),movimiento:false,pie:''},{boton:false,movimiento:false});
    }else box.innerHTML='<img alt="Portada de tu galería" src="'+esc(l.url)+'" style="width:100%;height:100%;object-fit:cover">';
  }catch(e){}}

/* ---------- abrir la galería (Entregas) con la misma sesión, sin pedir otro login ---------- */
const prodCta=()=>((S.cli&&S.cli.ent)||[]).find(x=>x.tipo==='empresa'||x.tipo==='agencia');
function abrirProduccion(){
  if(S.demo){aviso('Vista de prueba: aquí abriría tu plataforma de producción');return}
  try{sessionStorage.setItem('faro_ent',JSON.stringify(SES))}catch(e){}
  location.href='/produccion'}
window.abrirProduccion=abrirProduccion;
function abrirGaleria(){
  if(S.demo){aviso('Vista de prueba: aquí el cliente pasaría a su galería');return}
  const unico=S.cli&&S.cli.ent&&S.cli.ent.length;
  if(unico){try{sessionStorage.setItem('faro_ent',JSON.stringify(SES))}catch(e){}}
  location.href='entregas.html'}

/* ---------- páginas ---------- */
const hero=(c,sub)=>'<div class="ms-hero"><img class="ms-logo" src="doc-logo.png" alt="Faro Studios"><span class="ms-eti">MI ESPACIO</span><h1>¡Hola, '+esc(String(c.nombre||'').split(' ')[0])+'!</h1>'+(sub?'<p>'+sub+'</p>':'')+'</div>';
P['c-inicio']=()=>{
  const c=S.cli.k,ses=S.cli.ses||[],s=principal(ses),d=S.cli.docs||[],nu=(S.cli.msgs||[]).filter(m=>m.de==='faro').length;
  const lista=s&&s.estado==='lista';
  return '<section class="page ms">'+hero(c,esc(c.proyecto||'Tu proyecto')+(c.fecha?' · '+esc(fecha(c.fecha,{day:'numeric',month:'long',year:'numeric'})):''))
    +tarjetaEstado(s)
    +'<div class="ms-grid">'
    +'<button class="ms-tile" type="button" onclick="go(\'c-agenda\')"><span>'+ic('cal')+'</span><b>Mi agenda</b><small>Fechas de tu sesión y entrega</small></button>'
    +'<button class="ms-tile" type="button" onclick="go(\'c-docs\')"><span>'+ic('file')+'</span><b>Documentos</b><small>'+d.length+' disponible'+(d.length===1?'':'s')+'</small></button>'
    +'<button class="ms-tile" type="button" onclick="go(\'c-galeria\')"><span>'+ic('image')+'</span><b>Mi galería</b><small>'+(lista?'¡Lista para ti!':'Cuando esté lista, aquí')+'</small></button>'
    +(prodCta()?'<button class="ms-tile" type="button" onclick="abrirProduccion()"><span>'+ic('file')+'</span><b>Producción</b><small>Guiones, avances y entregas</small></button>':'')
    +'<button class="ms-tile" type="button" onclick="go(\'c-buzon\')"><span>'+ic('chat')+'</span><b>Buzón</b><small>'+(nu?nu+' mensaje'+(nu===1?'':'s')+' de Faro':'Escríbenos aquí')+'</small></button>'
    +'</div>'
    +(c.nota?'<div class="ms-card ms-nota"><p><b>Mensaje de Faro Studios:</b> '+esc(c.nota)+'</p></div>':'')
    +'<p class="ms-pie">Perfil temporal para el proceso de sesión y entrega.</p></section>'};
P['c-inicio'].bind=()=>{const b=$('#ms-abrir');if(b)b.onclick=abrirGaleria;pintaPortada()};

/* calendario del mes con sesión, días de edición y entrega */
S.msMes=null;
function marcas(){
  const m={};const add=(i,t,k)=>{if(!i)return;(m[i]=m[i]||[]).push({t,k})};
  (S.cli.ses||[]).filter(s=>s.estado!=='cancelada').forEach(s=>{
    add(s.fecha,'Sesión'+(s.hora?' · '+s.hora:''),'ses');
    if(s.estado==='realizada'){(s.dias_habiles||[]).forEach(d=>{if(d!==s.entrega_fecha)add(d,'Edición','ed')});add(s.entrega_fecha,'Entrega estimada','ent')}
    if(s.estado==='lista'&&s.lista_en)add(s.lista_en.slice(0,10),'Galería lista','ok')});
  return m}
P['c-agenda']=()=>{
  const hoy=GT(),ses=(S.cli.ses||[]).filter(s=>s.estado!=='cancelada');
  if(!S.msMes){const pr=principal(S.cli.ses)||{},ref=(pr.estado==='realizada'&&pr.entrega_fecha)||pr.fecha||hoy;S.msMes={y:+ref.slice(0,4),m:+ref.slice(5,7)-1}}
  const {y,m}=S.msMes,mk=marcas(),prim=new Date(Date.UTC(y,m,1)),off=(prim.getUTCDay()+6)%7,dm=new Date(Date.UTC(y,m+1,0)).getUTCDate();
  let cel='';for(let i=0;i<off;i++)cel+='<span class="v"></span>';
  for(let d=1;d<=dm;d++){const iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'),ev=mk[iso]||[];
    cel+='<span class="d'+(iso===hoy?' hoy':'')+(ev.length?' ev':'')+'" '+(ev.length?'title="'+esc(ev.map(x=>x.t).join(' · '))+'"':'')+'><i>'+d+'</i>'+ev.slice(0,2).map(x=>'<em class="k-'+x.k+'"></em>').join('')+'</span>'}
  const lista=ses.length?ses.map(s=>{const e=estadoSes(s)||{};
    return '<div class="it ms-it">'+ic(s.estado==='lista'?'image':'camera')+'<div>'+esc(s.titulo)+'<small>'+esc(s.fecha?fLarga(s.fecha)+(s.hora?' · '+s.hora:''):'Fecha por confirmar')+'</small>'
      +(s.estado==='realizada'?'<small><b>Entrega estimada: '+esc(fLarga(s.entrega_fecha))+'</b></small>':'')+'</div><span class="ms-pill '+(s.estado==='lista'?'ok':s.estado==='realizada'?'ed':'')+'">'+esc(({agendada:'Agendada',realizada:e.k==='edicion'?'En edición':'Realizada',lista:'Galería lista'})[s.estado]||s.estado)+'</span></div>'}).join('')
    :vacio('Todavía no hay sesiones en tu agenda.');
  return '<section class="page ms"><div class="ph"><h1>Mi agenda</h1><p>Las fechas de tu sesión y de tu entrega.</p></div>'
    +'<div class="ms-card"><div class="ms-calh"><button class="btn ghost" type="button" id="ms-prev" aria-label="Mes anterior" style="font-size:22px;line-height:1">‹</button><b>'+MESES[m]+' '+y+'</b><button class="btn ghost" type="button" id="ms-next" aria-label="Mes siguiente" style="font-size:22px;line-height:1">›</button></div>'
    +'<div class="ms-cal"><span class="h">L</span><span class="h">M</span><span class="h">M</span><span class="h">J</span><span class="h">V</span><span class="h">S</span><span class="h">D</span>'+cel+'</div>'
    +'<div class="ms-leg"><span><em class="k-ses"></em>Sesión</span><span><em class="k-ed"></em>Edición</span><span><em class="k-ent"></em>Entrega estimada</span></div></div>'
    +'<div class="ms-card" style="margin-top:16px"><h3 style="margin:0 0 6px">Mis sesiones</h3><div class="ls">'+lista+'</div></div></section>'};
P['c-agenda'].bind=()=>{const mv=k=>{let{y,m}=S.msMes;m+=k;if(m<0){m=11;y--}if(m>11){m=0;y++}S.msMes={y,m};render()};$('#ms-prev').onclick=()=>mv(-1);$('#ms-next').onclick=()=>mv(1)};

P['c-galeria']=()=>{const c=S.cli.k,s=principal(S.cli.ses),lista=s&&s.estado==='lista';
  return '<section class="page ms"><div class="ph"><h1>Mi galería</h1><p>Tus fotos y videos, listos para ver, elegir favoritos y descargar.</p></div><div class="ms-card ms-est">'
   +(lista?'<div class="ms-et" style="flex:1 1 100%"><span class="ms-pill ok">Lista</span><h2>¡Tu galería está lista!</h2><div id="ms-cover" class="ms-cover" hidden></div><div class="ms-row"><button class="btn y" type="button" id="ms-abrir">'+ic('image')+'Abrir mi galería</button></div></div>'
     :c.galeria_url?'<div class="ms-et"><h2>Tu galería</h2><p>Toca el botón para abrirla.</p><div class="ms-row"><a class="btn y" target="_blank" rel="noopener" href="'+esc(c.galeria_url)+'">'+ic('image')+'Abrir mi galería</a></div></div>'
     :'<div class="ms-ic">'+ic('image')+'</div><div class="ms-et"><h2>Tu galería todavía no está lista</h2><p>'+(s&&s.estado==='realizada'?'Estamos trabajando en ella. Apenas esté lista aparece aquí y te lo mostramos.':'Cuando tu sesión esté lista para entrega, aparecerá aquí.')+'</p></div>')
   +'</div></section>'};
P['c-galeria'].bind=()=>{const b=$('#ms-abrir');if(b)b.onclick=abrirGaleria;pintaPortada()};

/* ---------- aviso flotante: hay que aceptarlo para entrar ---------- */
window.msAviso=function(){
  if($('#ms-aviso'))return;
  const d=document.createElement('div');d.id='ms-aviso';d.className='ms-modal';d.setAttribute('role','alertdialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','ms-av-t');
  d.innerHTML='<div class="ms-box"><img src="doc-logo-borgona.png" alt="Faro Studios" class="ms-logo2"><span class="ms-eti2">AVISO IMPORTANTE</span><h2 id="ms-av-t">Tu perfil de Mi espacio es temporal</h2>'+AVISO.map(t=>'<p>'+esc(t)+'</p>').join('')
    +'<div class="ms-row"><button class="btn y" type="button" id="ms-ok">Estoy de acuerdo</button><button class="btn ghost" type="button" id="ms-no">Salir</button></div></div>';
  document.body.append(d);document.body.classList.add('ms-bloq');
  $('#ms-no').onclick=()=>{d.remove();document.body.classList.remove('ms-bloq');salir()};
  $('#ms-ok').onclick=async()=>{const b=$('#ms-ok');b.disabled=true;
    if(!S.demo){try{await api('/rest/v1/rpc/cl_aceptar_aviso',{method:'POST',body:{}})}catch(e){}}
    if(S.cliEst)S.cliEst.aviso_en=new Date().toISOString();d.remove();document.body.classList.remove('ms-bloq')};
  setTimeout(()=>{const b=$('#ms-ok');b&&b.focus()},50)};

/* ---------- acceso caducado ---------- */
window.msCaducado=function(){
  const l=$('#login');document.body.classList.add('sv');$('#brand-b').textContent='FARO STUDIOS';$('#brand-s').textContent='Mi espacio';
  l.hidden=false;
  l.innerHTML='<div class="lg-card ms-cad"><img src="doc-logo-borgona.png" alt="Faro Studios" class="ms-logo2"><span class="ms-eti2">MI ESPACIO</span><h1>Tu acceso ha caducado</h1>'
    +'<p class="sub">Este perfil estaba disponible mientras duraba el proceso de sesión y entrega, y ese periodo ya terminó.</p><p class="sub">Si tienes alguna consulta o necesitas algo de tu material, escríbenos por WhatsApp y con gusto te ayudamos.</p>'
    +'<a class="btn y ms-wa" target="_blank" rel="noopener" href="'+esc(WA_MSG('Hola, mi acceso a Mi espacio de Faro Studios ya caducó y quisiera hacer una consulta.'))+'">'+ic('wa')+'Escribir por WhatsApp</a>'
    +'<a class="lnk" href="index.html">Volver a Faro Studios</a></div>';
  const f=$('#wafab');if(f)f.hidden=true};

/* ---------- datos del cliente ---------- */
window.cargarCliente=async function(id){
  const [k,d,m,ses]=await Promise.all([rows('cl_clientes','id=eq.'+id+'&select=*'),rows('cl_documentos','cliente_id=eq.'+id+'&order=creado.desc'),rows('cl_mensajes','cliente_id=eq.'+id+'&order=creado.asc&limit=200'),rows('cl_sesiones','cliente_id=eq.'+id+'&order=creado.asc')]);
  let ent=[];try{const u=S.demo?'demo':jwtSub();if(u)ent=await rows('en_cuentas','user_id=eq.'+u+'&select=user_id,tipo,nombre')}catch(e){}
  return{k:k[0]||{},docs:d,msgs:m,ses,ent};
};
window.clEstado=async function(){try{const r=await api('/rest/v1/rpc/cl_mi_estado',{method:'POST',body:{}});return r.ok?await r.json():{}}catch(e){return{}}};

/* =====================================================================
   VISTA DE PRUEBA (?demo=cliente&e=agendada|recibida|edicion|lista|caducado&aviso=1)
   Muestra Mi espacio con datos de ejemplo, sin iniciar sesión y sin guardar nada.
   ===================================================================== */
const Q=new URLSearchParams(location.search),DEMO=Q.get('demo');
if(DEMO==='cliente'){
  const sumd=(i,k)=>new Date(+new Date(i+'T00:00:00Z')+k*864e5).toISOString().slice(0,10);
  const hab=i=>{const w=new Date(i+'T00:00:00Z').getUTCDay();return w>0&&w<6};
  const sigH=(i,k)=>{let d=i;while(k>0){d=sumd(d,1);if(hab(d))k--}while(!hab(d))d=sumd(d,-1);return d};
  const antH=(i)=>{let d=i;while(!hab(d))d=sumd(d,-1);return d};
  const E=Q.get('e')||'edicion',hoy=GT();
  const dias=n=>{ /* n días hábiles ya transcurridos (1..5) */
    const base=antH(hoy),arr=[];for(let i=0;i<5;i++){if(i<n){let d=base,k=n-1-i;while(k>0){d=sumd(d,-1);if(hab(d))k--}arr.push(d)}else arr.push(sigH(base,i-n+1))}return arr};
  let ses=[];
  if(E==='agendada')ses=[{id:'s1',titulo:'Graduación Mirna',estado:'agendada',fecha:sumd(hoy,4),hora:'3:00 pm',dias_habiles:[]}];
  else if(E==='recibida'){const d=dias(1);ses=[{id:'s1',titulo:'Graduación Mirna',estado:'realizada',fecha:sumd(d[0],-3),hora:'3:00 pm',realizada_en:sumd(d[0],-3),dias_habiles:d,entrega_fecha:d[4]}]}
  else if(E==='lista'){const d=dias(5);ses=[{id:'s1',titulo:'Graduación Mirna',estado:'lista',fecha:sumd(d[0],-3),hora:'3:00 pm',realizada_en:sumd(d[0],-3),dias_habiles:d,entrega_fecha:d[4],proyecto_id:'p1',lista_en:new Date().toISOString()}]}
  else{const d=dias(2);ses=[{id:'s1',titulo:'Graduación Mirna',estado:'realizada',fecha:sumd(d[0],-3),hora:'3:00 pm',realizada_en:sumd(d[0],-3),dias_habiles:d,entrega_fecha:d[4]}]}
  const T={
    cl_clientes:[{id:'demo',nombre:'Mirna Raxtún',proyecto:'Graduación',tipo:'Graduación',fecha:sumd(hoy,-4),nota:'¡Gracias por confiar en nosotros! Cualquier duda, escríbenos por aquí.'}],
    cl_documentos:[{id:'1',tipo:'otro',titulo:'Confirmación de servicio',ruta:'x',creado:sumd(hoy,-12)},{id:'2',tipo:'contrato',titulo:'Contrato de servicios',ruta:'x',creado:sumd(hoy,-12)},{id:'3',tipo:'voucher',titulo:'Voucher de reserva',ruta:'x',creado:sumd(hoy,-12)},{id:'4',tipo:'factura',titulo:'Factura 0007',ruta:'x',creado:sumd(hoy,-5)}],
    cl_mensajes:[{id:'m1',de:'faro',texto:'¡Hola Mirna! Ya recibimos tu material. Te avisamos por aquí cuando esté listo.',creado:new Date().toISOString()}],
    cl_sesiones:ses,en_cuentas:[{user_id:'demo',tipo:Q.get('prod')?'empresa':'galeria',nombre:'Demo'}],en_proyectos:[{id:'p1',titulo:'Graduación Mirna',config:{}}],en_archivos:[]};
  window.api=async(path,o)=>{
    const R=(b)=>({ok:true,status:200,json:async()=>b,text:async()=>JSON.stringify(b)});
    if(/rpc\/cl_mi_estado/.test(path))return R({cliente_id:'demo',vencido:false,aviso_en:Q.get('aviso')?null:new Date().toISOString()});
    const m=path.match(/\/rest\/v1\/([a-z_]+)/);if(o&&o.method&&o.method!=='GET')return R([]);
    return R(m&&T[m[1]]?T[m[1]]:[])};
  window.salir=()=>aviso('Vista de prueba: aquí el cliente saldría de Mi espacio');
  (async()=>{
    S.demo='cliente';
    const barra=document.createElement('div');barra.className='demo-bar';
    barra.innerHTML='<b>VISTA DE PRUEBA</b><span>así ve su espacio un cliente:</span>'+[['agendada','Agendada'],['recibida','Sesión realizada'],['edicion','En edición'],['lista','Galería lista'],['caducado','Acceso caducado']].map(x=>'<button type="button" data-e="'+x[0]+'" aria-pressed="'+(E===x[0])+'">'+x[1]+'</button>').join('')+'<button type="button" data-av="1">Ver aviso</button>';
    document.body.prepend(barra);
    barra.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{const u=new URL(location.href);u.searchParams.set('e',b.dataset.e);location.href=u})
    ;barra.querySelector('[data-av]').onclick=()=>{const u=new URL(location.href);u.searchParams.set('aviso','1');location.href=u};
    if(E==='caducado'){msCaducado();return}
    S.rol='cliente';S.perfil={rol:'cliente',cliente:T.cl_clientes[0]};S.cliEst={aviso_en:Q.get('aviso')?null:'x'};
    S.cli=await cargarCliente('demo');S.page='c-inicio';
    document.documentElement.classList.remove('hand');
    render();if(Q.get('aviso'))msAviso()})();
}
})();
