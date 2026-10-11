/* Faro Academy · Herramientas del portal para estudiantes
   Afinador de guitarra, metrónomo y piano interactivo. Todo corre en el navegador (Web Audio): no se sube audio a ningún lado.
   Uso: FaroTools.mount(contenedor, {tools:['afinador','metronomo','piano']}) · FaroTools.stop() al salir de la sección. */
(function(root){
'use strict';

/* ================= música ================= */
const CIF=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SOL=['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];
const midiToFreq=m=>440*Math.pow(2,(m-69)/12);
const freqToMidi=f=>69+12*Math.log(f/440)/Math.LN2;
const pc=m=>((Math.round(m)%12)+12)%12;
const cif=m=>CIF[pc(m)], sol=m=>SOL[pc(m)], oct=m=>Math.floor(Math.round(m)/12)-1;

/* cuerdas de grave (6.ª) a aguda (1.ª), en notas MIDI */
const TUNINGS=[
  {id:'estandar',n:'Estándar (E A D G B E)',s:[40,45,50,55,59,64]},
  {id:'medio',n:'Medio tono abajo (Eb)',s:[39,44,49,54,58,63]},
  {id:'tono',n:'Un tono abajo (D)',s:[38,43,48,53,57,62]},
  {id:'dropd',n:'Drop D',s:[38,45,50,55,59,64]},
  {id:'dropc',n:'Drop C',s:[36,43,48,53,57,62]},
  {id:'dadgad',n:'DADGAD',s:[38,45,50,55,57,62]},
  {id:'openg',n:'Open G',s:[38,43,50,55,59,62]},
  {id:'opend',n:'Open D',s:[38,45,50,54,57,62]},
  {id:'opene',n:'Open E',s:[40,47,52,56,59,64]}
];

/* Detector de tono YIN: robusto con cuerdas graves, donde los armónicos son más fuertes que la fundamental. */
function yin(buf,sr,minF,maxF,thr){
  minF=minF||60;maxF=maxF||1100;thr=thr||0.12;
  const half=buf.length>>1,tauMin=Math.max(2,Math.floor(sr/maxF)),tauMax=Math.min(half-1,Math.ceil(sr/minF));
  const d=new Float32Array(tauMax+2);
  for(let t=1;t<=tauMax;t++){let s=0;for(let i=0;i<half;i++){const x=buf[i]-buf[i+t];s+=x*x}d[t]=s}
  const cm=new Float32Array(tauMax+2);cm[0]=1;let run=0;
  for(let t=1;t<=tauMax;t++){run+=d[t];cm[t]=run>0?d[t]*t/run:1}
  let tau=-1;
  for(let t=tauMin;t<tauMax;t++){
    if(cm[t]<thr){while(t+1<tauMax&&cm[t+1]<cm[t])t++;tau=t;break}
  }
  if(tau<0)return null;
  const a=cm[tau-1],b=cm[tau],c=cm[tau+1],den=2*(a-2*b+c),shift=den?(a-c)/den:0;
  return{freq:sr/(tau+shift),clarity:1-b};
}
function rms(buf){let s=0;for(let i=0;i<buf.length;i++)s+=buf[i]*buf[i];return Math.sqrt(s/buf.length)}
function nearestString(m,strings){let b=0,d=1e9;strings.forEach((s,i)=>{const x=Math.abs(m-s);if(x<d){d=x;b=i}});return b}
/* de una frecuencia a: cuerda objetivo, desafinación en cents y nota */
function analyze(freq,strings,auto,target){
  const m=freqToMidi(freq),idx=auto?nearestString(m,strings):target;
  return{m,idx,cents:(m-strings[idx])*100,freq};
}
const median=a=>{const b=a.slice().sort((x,y)=>x-y);return b[b.length>>1]};

/* metrónomo */
function tempoName(b){return b<40?'Grave':b<60?'Largo':b<66?'Larghetto':b<76?'Adagio':b<108?'Andante':b<120?'Moderato':b<156?'Allegro':b<176?'Vivace':b<200?'Presto':'Prestissimo'}
function fixPat(p,n){const o=[];for(let i=0;i<n;i++)o.push(p&&(p[i]==='f'||p[i]==='d'||p[i]==='m')?p[i]:(i===0?'f':'d'));return o}
const nextState=s=>s==='f'?'d':s==='d'?'m':'f';
function tapBpm(times){if(times.length<2)return null;let s=0;for(let i=1;i<times.length;i++)s+=times[i]-times[i-1];return Math.max(30,Math.min(260,Math.round(60000/(s/(times.length-1)))))}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

/* ================= audio compartido ================= */
let AC=null;
function getAC(){
  if(!AC){const C=root.AudioContext||root.webkitAudioContext;if(!C)throw new Error('audio');AC=new C()}
  if(AC.state==='suspended')AC.resume();
  return AC;
}
function playTone(f,dur,vol){
  const ac=getAC(),n=ac.currentTime,g=ac.createGain();
  g.gain.setValueAtTime(0.0001,n);g.gain.linearRampToValueAtTime(vol||.45,n+.03);g.gain.setValueAtTime(vol||.45,n+dur-.35);g.gain.linearRampToValueAtTime(0.0001,n+dur);
  g.connect(ac.destination);
  [['sine',1,1],['triangle',2,.22]].forEach(p=>{const o=ac.createOscillator(),og=ac.createGain();o.type=p[0];o.frequency.value=f*p[1];og.gain.value=p[2];o.connect(og);og.connect(g);o.start(n);o.stop(n+dur+.05)});
}

/* ================= utilidades de interfaz ================= */
function h(tag,attrs){
  const e=document.createElement(tag);
  for(const k in(attrs||{})){const v=attrs[k];if(k==='class')e.className=v;else if(k==='html')e.innerHTML=v;else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)e.setAttribute(k,v)}
  for(let i=2;i<arguments.length;i++){[].concat(arguments[i]).forEach(c=>{if(c!=null&&c!==false)e.append(c.nodeType?c:document.createTextNode(c))})}
  return e;
}
const store={get(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

const CSS=`
.ft-wrap{max-width:760px;margin:0 auto;display:grid;gap:20px}
.ft-card{background:var(--card);border:2px solid var(--line);border-radius:26px;padding:clamp(18px,3.4vw,32px);box-shadow:var(--sh);text-align:center;position:relative}
.ft-dark{background:var(--pizarra);color:var(--marfil);border-color:#000;box-shadow:0 8px 0 #000,0 30px 40px -24px rgba(0,0,0,.7)}
.ft-dark .ft-sub{color:#C9C4BA}
.ft-sub{color:var(--muted);font-size:1rem;margin:0}
.ft-lab{display:grid;gap:8px;font-size:1rem;text-align:left}
.ft-dark .ft-lab{color:#C9C4BA}
.ft-sel{font:inherit;font-size:1.125rem;padding:14px 18px;border-radius:16px;border:2px solid var(--line);background:#fff;color:var(--ink);width:100%}
.ft-dark .ft-sel{background:#34343a;color:var(--marfil);border-color:rgba(245,242,238,.25)}
.ft-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;border:0;border-radius:18px;padding:16px 30px;font:inherit;font-size:1.125rem;cursor:pointer;background:var(--oliva-d);color:var(--marfil);box-shadow:0 6px 0 #2E3519;transition:transform .12s,box-shadow .12s}
.ft-btn:hover{transform:translateY(-2px);box-shadow:0 8px 0 #2E3519}
.ft-btn:active{transform:translateY(5px);box-shadow:0 1px 0 #2E3519}
.ft-btn.go{background:var(--borgona);box-shadow:0 6px 0 var(--bd)}.ft-btn.go:hover{box-shadow:0 8px 0 var(--bd)}.ft-btn.go:active{box-shadow:0 1px 0 var(--bd)}
.ft-btn.gh{background:var(--card);color:var(--ink);border:2px solid var(--line);box-shadow:0 5px 0 var(--line)}
.ft-dark .ft-btn.gh{background:#34343a;color:var(--marfil);border-color:rgba(245,242,238,.25);box-shadow:0 5px 0 #000}
.ft-btn[aria-pressed="true"].gh{background:var(--oro);color:var(--pizarra);border-color:var(--oro)}
.ft-chips{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.ft-chip{border:2px solid var(--line);background:var(--card);color:var(--ink);border-radius:99px;padding:10px 20px;font:inherit;font-size:1rem;cursor:pointer;box-shadow:0 3px 0 var(--line)}
.ft-chip[aria-pressed="true"]{background:var(--pizarra);color:var(--marfil);border-color:var(--pizarra);box-shadow:0 3px 0 #000}
.ft-row{display:flex;gap:14px;flex-wrap:wrap;align-items:end;justify-content:center}
.ft-row>.ft-lab{flex:1 1 220px}
.ft-err{color:#D98A96;font-size:1rem;min-height:1.4em;margin:6px 0 0}
.ft-light .ft-err{color:var(--borgona)}

/* afinador */
.tu-gauge{width:min(100%,430px);margin:6px auto 0;display:block}
.tu-read{display:grid;gap:2px;justify-items:center;margin-top:-6px}
.tu-note{font:400 clamp(4.2rem,14vw,6.5rem)/1 var(--display);letter-spacing:.03em;transition:color .2s}
.tu-note sup{font-size:.38em;margin-left:2px;color:#C9C4BA;vertical-align:top;position:relative;top:.25em}
.tu-sol{font-size:1.125rem;color:#C9C4BA}
.tu-cents{font:400 1.82rem/1 var(--display);letter-spacing:.06em}
.tu-msg{font-size:1.125rem;min-height:1.6em;margin:6px 0 0}
.tu-ok .tu-note,.tu-ok .tu-cents{color:var(--oliva-c)}
.tu-near .tu-note,.tu-near .tu-cents{color:var(--oro)}
.tu-far .tu-note,.tu-far .tu-cents{color:#D98A96}
.tu-head{position:relative;height:340px;max-width:440px;margin:18px auto 0}
.tu-head svg{position:absolute;left:50%;top:0;height:100%;width:auto;transform:translateX(-50%)}
.tu-peg{position:absolute;width:76px;height:76px;margin-top:-38px;border-radius:50%;border:3px solid rgba(245,242,238,.3);background:#3A3A3A;color:var(--marfil);box-shadow:0 6px 0 #000;display:grid;place-items:center;align-content:center;gap:0;cursor:pointer;font:inherit;padding:0;transition:transform .12s,background .2s,border-color .2s}
.tu-peg:active{transform:translateY(4px);box-shadow:0 2px 0 #000}
.tu-peg b{font:400 1.82rem/1 var(--display);letter-spacing:.03em}
.tu-peg small{font-size:.9rem;color:#C9C4BA;line-height:1}
.tu-peg.l{left:0}.tu-peg.r{right:0}
.tu-peg[aria-pressed="true"]{border-color:var(--oro)}
.tu-peg.on{background:var(--oliva-d);border-color:var(--oliva-c)}
.tu-peg.done::after{content:"✓";position:absolute;right:-6px;top:-8px;width:28px;height:28px;border-radius:50%;background:var(--oliva-c);color:var(--pizarra);font-size:1.1rem;display:grid;place-items:center;box-shadow:0 3px 0 #000}
.tu-tip{font-size:1rem;color:#C9C4BA;margin:12px auto 0;max-width:46ch}
@media (max-width:480px){.tu-peg{width:66px;height:66px;margin-top:-33px}.tu-head{height:310px}}

/* metrónomo */
.mt-bpm{display:flex;align-items:center;justify-content:center;gap:clamp(8px,3vw,22px)}
.mt-num{font:400 clamp(4.8rem,17vw,7.6rem)/1 var(--display);letter-spacing:.02em;min-width:2.3ch}
.mt-step{width:64px;height:64px;border-radius:50%;border:2px solid var(--line);background:var(--card);box-shadow:0 5px 0 var(--line);font:400 2rem/1 var(--display);cursor:pointer;color:var(--ink)}
.mt-step:active{transform:translateY(4px);box-shadow:0 1px 0 var(--line)}
.mt-name{font:400 1.82rem/1 var(--display);letter-spacing:.06em;color:var(--borgona)}
.mt-range{width:100%;accent-color:var(--borgona);height:36px}
.mt-pads{display:flex;align-items:flex-end;justify-content:center;gap:clamp(6px,2vw,14px);min-height:116px}
.mt-pad{flex:1 1 0;max-width:84px;border:3px solid var(--pizarra);border-radius:16px;background:var(--pizarra);color:var(--marfil);font:400 1.82rem/1 var(--display);cursor:pointer;display:grid;place-items:center;transition:background .08s,transform .08s,box-shadow .08s;box-shadow:0 5px 0 #000;padding:0}
.mt-pad.f{height:112px;background:var(--borgona);border-color:var(--bd);box-shadow:0 5px 0 var(--bd)}
.mt-pad.d{height:72px}
.mt-pad.m{height:44px;background:transparent;color:var(--muted);border-style:dashed;border-color:var(--line);box-shadow:none}
.mt-pad.hit{background:var(--oro);color:var(--pizarra);transform:translateY(-6px);border-color:var(--oro)}
.mt-legend{display:flex;gap:18px;flex-wrap:wrap;justify-content:center;font-size:1rem;color:var(--muted)}
.mt-legend i{display:inline-block;width:14px;height:14px;border-radius:5px;margin-right:6px;vertical-align:-2px}
.mt-vol{display:flex;align-items:center;gap:14px}
.mt-vol input{flex:1;accent-color:var(--borgona);height:36px}

/* piano */
.pk-bar{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;margin-bottom:16px}
.pk-bar .ft-vol{display:flex;align-items:center;gap:10px;font-size:1rem;color:#C9C4BA}
.pk-bar .ft-vol input{width:130px;accent-color:var(--oro);height:32px}
.pk{position:relative;display:flex;height:clamp(200px,38vw,320px);gap:2px;touch-action:none;user-select:none;-webkit-user-select:none;background:#000;border:2px solid #000;border-bottom:0;border-radius:10px 10px 0 0;overflow:hidden}
.pk .wk{flex:1 1 0;min-width:0;border:0;border-radius:0 0 10px 10px;background:linear-gradient(#FBF9F4,#E9E3D6);color:var(--pizarra);font:400 1rem/1 var(--body);display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;padding:0 0 12px;cursor:pointer;box-shadow:inset 0 -6px 0 rgba(0,0,0,.12)}
.pk .wk.down,.pk .wk.hl{background:linear-gradient(#E4DDA0,#B8A06A);box-shadow:inset 0 -2px 0 rgba(0,0,0,.2)}
.pk .bk{position:absolute;top:0;width:calc(100%/var(--n)*.6);height:62%;transform:translateX(-50%);border:0;border-radius:0 0 8px 8px;background:linear-gradient(#3A3A3A,#111);color:#C9C4BA;font:400 .9rem/1 var(--body);padding:0 0 8px;display:flex;align-items:flex-end;justify-content:center;cursor:pointer;box-shadow:0 5px 0 rgba(0,0,0,.5);z-index:2}
.pk .bk.down{background:linear-gradient(#8B1A2A,#5E101C)}
.pk .key-k{font-size:.8rem;opacity:.55}
@media (hover:none){.pk .key-k{display:none}}
`;
function injectCSS(){if(document.getElementById('ft-css'))return;const s=document.createElement('style');s.id='ft-css';s.textContent=CSS;document.head.append(s)}

/* ================= AFINADOR ================= */
function mountTuner(box){
  const st={tun:TUNINGS[0],auto:true,target:0,on:false,done:new Set(),hist:[],lastPitch:0,okSince:0,okIdx:-1,ang:0,toneUntil:0,cat:''};
  let stream=null,src=null,an=null,buf=null,raf=0,lastDet=0;
  const R=130,CX=150,CY=150;
  const P=(deg,r)=>{const a=deg*Math.PI/180;return[(CX+r*Math.sin(a)).toFixed(1),(CY-r*Math.cos(a)).toFixed(1)]};
  const arc=(a0,a1,r)=>{const p=P(a0,r),q=P(a1,r);return'M'+p[0]+' '+p[1]+' A'+r+' '+r+' 0 0 1 '+q[0]+' '+q[1]};
  let ticks='';
  for(let c=-50;c<=50;c+=5){const big=c%25===0,p=P(c*1.5,R-(big?20:11)),q=P(c*1.5,R+2);ticks+='<line x1="'+p[0]+'" y1="'+p[1]+'" x2="'+q[0]+'" y2="'+q[1]+'" stroke="'+(c===0?'#A3B15F':'#8c887f')+'" stroke-width="'+(c===0?4:big?3:2)+'" stroke-linecap="round"/>'}
  const gauge='<svg class="tu-gauge" viewBox="0 10 300 160" role="img" aria-label="Indicador de afinación en cents">'
    +'<path d="'+arc(-75,75,R+8)+'" fill="none" stroke="#3a3a40" stroke-width="10" stroke-linecap="round"/>'
    +'<path d="'+arc(-7.5,7.5,R+8)+'" fill="none" stroke="#A3B15F" stroke-width="10" stroke-linecap="butt"/>'
    +ticks
    +'<text x="'+P(-75,R-34)[0]+'" y="'+(+P(-75,R-34)[1]+4)+'" fill="#C9C4BA" font-size="15" text-anchor="middle">♭</text>'
    +'<text x="'+P(75,R-34)[0]+'" y="'+(+P(75,R-34)[1]+4)+'" fill="#C9C4BA" font-size="15" text-anchor="middle">♯</text>'
    +'<g id="tu-needle"><path d="M'+CX+' '+(CY-R+6)+' L'+(CX-6)+' '+CY+' L'+(CX+6)+' '+CY+' Z" fill="#B8A06A"/></g>'
    +'<circle cx="'+CX+'" cy="'+CY+'" r="11" fill="#B8A06A"/><circle cx="'+CX+'" cy="'+CY+'" r="4" fill="#252528"/></svg>';
  /* clavijas: 3 a cada lado, como en una paleta de guitarra de 3+3 */
  const LEFT=[2,1,0],RIGHT=[3,4,5],YS=[18,48,78];
  const pegY=y=>y+'%';
  const strLines=()=>{let s='';const xs=[80,92,104,116,128,140];
    const dest=i=>{const L=LEFT.indexOf(i);return L>=0?[34,YS[L]*3.3]:[186,YS[RIGHT.indexOf(i)]*3.3]};
    for(let i=0;i<6;i++){const d=dest(i);s+='<path id="tu-str'+i+'" d="M'+xs[i]+' 330 L'+xs[i]+' 262 L'+d[0]+' '+d[1]+'" fill="none" stroke="#D9D4CA" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'}
    return s};
  const head='<svg viewBox="0 0 220 330" aria-hidden="true"><path d="M30 24Q30 8 48 8L172 8Q190 8 190 24L188 205Q187 238 154 262L154 330L66 330L66 262Q33 238 32 205Z" fill="#33333a" stroke="#4a4a52" stroke-width="3"/><rect x="64" y="258" width="92" height="7" rx="2" fill="#E9E3D6"/>'+strLines()+'</svg>';
  box.classList.add('ft-card','ft-dark');
  box.innerHTML='<div class="ft-row"><label class="ft-lab">Afinación<select class="ft-sel" id="tu-sel">'+TUNINGS.map(t=>'<option value="'+t.id+'">'+t.n+'</option>').join('')+'</select></label>'
    +'<button class="ft-btn gh" type="button" id="tu-auto" aria-pressed="true">Detección automática</button></div>'
    +'<div id="tu-state" class="tu-far">'+gauge+'<div class="tu-read"><div class="tu-note" id="tu-note">–</div><div class="tu-sol" id="tu-sol">&nbsp;</div><div class="tu-cents" id="tu-cents">&nbsp;</div></div><p class="tu-msg" id="tu-msg" role="status">Activa el micrófono y toca una cuerda.</p></div>'
    +'<div class="ft-row" style="margin-top:14px"><button class="ft-btn go" type="button" id="tu-mic">Activar micrófono</button></div><p class="ft-err" id="tu-err" role="alert"></p>'
    +'<div class="tu-head" id="tu-head">'+head+'</div>'
    +'<p class="tu-tip">Toca una clavija para escuchar su nota y afinar de oído. Con guitarra eléctrica sin amplificador, acércala al micrófono y toca la cuerda con fuerza.</p>';
  const $=s=>box.querySelector(s);
  const headBox=$('#tu-head'),pegs=[];
  function buildPegs(){
    headBox.querySelectorAll('.tu-peg').forEach(x=>x.remove());pegs.length=0;
    [[LEFT,'l'],[RIGHT,'r']].forEach(g=>g[0].forEach((idx,k)=>{
      const m=st.tun.s[idx];
      const b=h('button',{class:'tu-peg '+g[1],type:'button','aria-pressed':'false','aria-label':'Cuerda '+(6-idx)+', '+cif(m)+oct(m)+'. Toca para escucharla',style:'top:'+pegY(YS[k])},h('b',{},cif(m)),h('small',{},sol(m)));
      b.addEventListener('click',()=>{st.auto=false;st.target=idx;sync();try{st.toneUntil=getAC().currentTime+2.1;playTone(midiToFreq(m),2,.45)}catch(e){}});
      b.dataset.i=idx;pegs[idx]=b;headBox.append(b)}));
  }
  function sync(){
    $('#tu-auto').setAttribute('aria-pressed',String(st.auto));
    $('#tu-auto').textContent=st.auto?'Detección automática':'Volver a detección automática';
    pegs.forEach((b,i)=>{b.setAttribute('aria-pressed',String(!st.auto&&st.target===i));b.classList.toggle('done',st.done.has(i))});
    for(let i=0;i<6;i++){const p=$('#tu-str'+i);if(p)p.setAttribute('stroke',(!st.auto&&st.target===i)?'#B8A06A':'#D9D4CA')}
  }
  function setCat(c,msg){
    const s=$('#tu-state');if(st.cat!==c){st.cat=c;s.className=c}
    if(st.msg!==msg){st.msg=msg;$('#tu-msg').textContent=msg}
  }
  $('#tu-sel').addEventListener('change',e=>{st.tun=TUNINGS.find(t=>t.id===e.target.value)||TUNINGS[0];st.done.clear();st.hist.length=0;st.target=0;buildPegs();sync()});
  $('#tu-auto').addEventListener('click',()=>{st.auto=true;sync()});
  function paint(cents,idx,freq){
    const m=st.tun.s[idx],a=Math.abs(cents);
    $('#tu-note').innerHTML=cif(m)+'<sup>'+oct(m)+'</sup>';$('#tu-sol').textContent=sol(m);
    $('#tu-cents').textContent=(cents>0?'+':cents<0?'−':'')+Math.round(a)+' cents · '+freq.toFixed(1)+' Hz';
    if(a<=5)setCat('tu-ok','¡Afinada!');
    else if(cents<0)setCat(a<=15?'tu-near':'tu-far','Muy baja: aprieta la clavija para subir');
    else setCat(a<=15?'tu-near':'tu-far','Muy alta: afloja la clavija para bajar');
    $('#tu-state').dataset.idx=idx;
  }
  function detect(now){
    const ac=getAC();if(ac.currentTime<st.toneUntil)return;
    an.getFloatTimeDomainData(buf);
    let r=null;if(rms(buf)>0.006)r=yin(buf,ac.sampleRate,60,1100,.12);
    if(r&&r.clarity>.82&&r.freq>=60&&r.freq<=1100){
      st.hist.push(freqToMidi(r.freq));if(st.hist.length>5)st.hist.shift();st.lastPitch=now;
      const mm=median(st.hist),res=analyze(midiToFreq(mm),st.tun.s,st.auto,st.target);
      st.cur=res;paint(res.cents,res.idx,midiToFreq(mm));
      pegs.forEach((b,i)=>b.classList.toggle('on',i===res.idx&&Math.abs(res.cents)<=5));
      if(Math.abs(res.cents)<=5){if(st.okIdx!==res.idx){st.okIdx=res.idx;st.okSince=now}else if(now-st.okSince>700&&!st.done.has(res.idx)){st.done.add(res.idx);sync()}}
      else st.okIdx=-1;
    }else if(now-st.lastPitch>450){
      st.hist.length=0;st.cur=null;st.okIdx=-1;pegs.forEach(b=>b.classList.remove('on'));
      $('#tu-note').textContent='–';$('#tu-sol').innerHTML='&nbsp;';$('#tu-cents').innerHTML='&nbsp;';
      setCat('tu-far','Toca una cuerda');
    }
  }
  function loop(ts){
    raf=requestAnimationFrame(loop);
    if(ts-lastDet>45){lastDet=ts;try{detect(ts)}catch(e){}}
    const tgt=st.cur?clamp(st.cur.cents,-50,50)*1.5:0;
    st.ang+=(tgt-st.ang)*.22;
    const n=$('#tu-needle');if(n)n.setAttribute('transform','rotate('+st.ang.toFixed(2)+' '+CX+' '+CY+')');
  }
  async function start(){
    $('#tu-err').textContent='';
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$('#tu-err').textContent='Este navegador no permite usar el micrófono aquí. Abre el portal desde Chrome o Safari.';return}
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      const ac=getAC();src=ac.createMediaStreamSource(stream);an=ac.createAnalyser();an.fftSize=4096;buf=new Float32Array(an.fftSize);src.connect(an);
      st.on=true;st.lastPitch=0;$('#tu-mic').textContent='Detener micrófono';$('#tu-mic').classList.remove('go');$('#tu-mic').classList.add('gh');
      setCat('tu-far','Toca una cuerda');cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
    }catch(e){
      const n=e&&e.name;
      $('#tu-err').textContent=n==='NotAllowedError'||n==='SecurityError'?'No tenemos permiso para usar el micrófono. Permítelo en el candado de la barra de direcciones y vuelve a intentar.':n==='NotFoundError'?'No encontramos un micrófono en este dispositivo.':'No se pudo activar el micrófono. Intenta de nuevo.';
    }
  }
  function stop(){
    cancelAnimationFrame(raf);raf=0;
    if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
    try{src&&src.disconnect()}catch(e){}src=null;st.on=false;st.cur=null;st.ang=0;
    const b=$('#tu-mic');if(b){b.textContent='Activar micrófono';b.classList.add('go');b.classList.remove('gh')}
    const n=$('#tu-needle');if(n)n.setAttribute('transform','rotate(0 '+CX+' '+CY+')');
  }
  $('#tu-mic').addEventListener('click',()=>st.on?stop():start());
  buildPegs();sync();
  return{stop};
}

/* ================= METRÓNOMO ================= */
function mountMetro(box){
  const KEY='faro_metro_v1',saved=store.get(KEY)||{};
  const s={bpm:clamp(+saved.bpm||100,30,260),beats:clamp(+saved.beats||4,1,12),sub:[1,2,3,4].includes(saved.sub)?saved.sub:1,vol:saved.vol==null?.8:clamp(+saved.vol,0,1),pat:null};
  s.pat=fixPat(saved.pat,s.beats);
  const save=()=>store.set(KEY,{bpm:s.bpm,beats:s.beats,sub:s.sub,vol:s.vol,pat:s.pat});
  const SUBS=[[1,'Negras','1 por pulso'],[2,'Corcheas','2 por pulso'],[3,'Tresillos','3 por pulso'],[4,'Semicorcheas','4 por pulso']];
  const BEATS=[2,3,4,5,6,7,8,9,12];
  box.classList.add('ft-card','ft-light');
  box.innerHTML='<div class="mt-bpm"><button class="mt-step" type="button" id="mt-m" aria-label="Bajar un tiempo por minuto">−</button><div><div class="mt-num" id="mt-n" aria-live="off"></div><div class="ft-sub">pulsos por minuto</div></div><button class="mt-step" type="button" id="mt-p" aria-label="Subir un tiempo por minuto">+</button></div>'
    +'<div class="mt-name" id="mt-name" style="margin:8px 0 4px"></div>'
    +'<input class="mt-range" id="mt-r" type="range" min="30" max="260" step="1" aria-label="Velocidad en pulsos por minuto">'
    +'<div class="ft-chips" style="margin:6px 0 20px"><button class="ft-chip" type="button" id="mt-m5">−5</button><button class="ft-chip" type="button" id="mt-p5">+5</button><button class="ft-chip" type="button" id="mt-tap">Toca el tempo</button></div>'
    +'<p class="ft-sub" style="margin-bottom:8px"><b>Tiempos por compás</b></p><div class="ft-chips" id="mt-b" role="group" aria-label="Tiempos por compás"></div>'
    +'<p class="ft-sub" style="margin:18px 0 8px"><b>Subdivisión</b></p><div class="ft-chips" id="mt-s" role="group" aria-label="Subdivisión"></div>'
    +'<p class="ft-sub" style="margin:22px 0 10px"><b>Toca cada pulso para elegir cuál suena fuerte, suave o en silencio</b></p>'
    +'<div class="mt-pads" id="mt-pads"></div>'
    +'<div class="mt-legend" style="margin:12px 0 4px"><span><i style="background:var(--borgona)"></i>Fuerte</span><span><i style="background:var(--pizarra)"></i>Suave</span><span><i style="border:2px dashed var(--line)"></i>Silencio</span></div>'
    +'<div class="ft-chips" style="margin:10px 0 20px"><button class="ft-chip" type="button" data-pre="1">Fuerte solo el 1</button><button class="ft-chip" type="button" data-pre="24">Fuertes el 2 y el 4</button><button class="ft-chip" type="button" data-pre="all">Todos fuertes</button></div>'
    +'<label class="mt-vol"><span class="ft-sub"><b>Volumen</b></span><input id="mt-v" type="range" min="0" max="100" step="1" aria-label="Volumen del metrónomo"><span class="ft-sub" id="mt-vn" style="min-width:3.5ch"></span></label>'
    +'<div class="ft-row" style="margin-top:22px"><button class="ft-btn go" type="button" id="mt-go" style="min-width:min(100%,280px);font-size:1.4rem;padding:20px 30px">Empezar</button></div><p class="ft-err" id="mt-err" role="alert"></p>';
  const $=q=>box.querySelector(q);
  let running=false,timer=0,raf=0,nextT=0,k=0,q=[];
  function drawBpm(){$('#mt-n').textContent=s.bpm;$('#mt-name').textContent=tempoName(s.bpm);$('#mt-r').value=s.bpm}
  function drawChips(){
    const bb=$('#mt-b');bb.textContent='';BEATS.forEach(n=>bb.append(h('button',{class:'ft-chip',type:'button','aria-pressed':String(n===s.beats),onclick:()=>{s.beats=n;s.pat=fixPat(s.pat,n);restartBar();save();drawChips();drawPads()}},String(n))));
    const ss=$('#mt-s');ss.textContent='';SUBS.forEach(x=>ss.append(h('button',{class:'ft-chip',type:'button','aria-pressed':String(x[0]===s.sub),title:x[2],onclick:()=>{s.sub=x[0];restartBar();save();drawChips()}},x[1])));
  }
  const LAB={f:'fuerte',d:'suave',m:'en silencio'};
  function drawPads(){
    const p=$('#mt-pads');p.textContent='';
    s.pat.forEach((st,i)=>p.append(h('button',{class:'mt-pad '+st,type:'button','aria-label':'Pulso '+(i+1)+': '+LAB[st]+'. Toca para cambiar',onclick:()=>{s.pat[i]=nextState(s.pat[i]);save();drawPads()}},String(i+1))));
  }
  function setBpm(v){s.bpm=clamp(Math.round(v),30,260);save();drawBpm()}
  function restartBar(){if(running){k=0;q.length=0}}
  function click(t,kind){
    const ac=getAC(),o=ac.createOscillator(),g=ac.createGain();
    o.type='triangle';o.frequency.value=kind==='f'?1568:kind==='d'?1047:784;
    const v=Math.max((kind==='f'?1:kind==='d'?.72:.34)*s.vol,.0002);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.075);
    o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+.1);
  }
  function sched(){
    const ac=getAC();
    while(nextT<ac.currentTime+.12){
      const beat=Math.floor(k/s.sub)%s.beats,part=k%s.sub,st=s.pat[beat];
      if(st!=='m')click(nextT,part===0?st:'s');
      q.push({t:nextT,beat,part});k++;nextT+=60/s.bpm/s.sub;
    }
  }
  function flash(){
    raf=requestAnimationFrame(flash);
    const ac=getAC();
    while(q.length&&q[0].t<=ac.currentTime){const e=q.shift();if(e.part===0&&ac.currentTime-e.t<.2){const pad=$('#mt-pads').children[e.beat];if(pad){pad.classList.add('hit');setTimeout(()=>pad.classList.remove('hit'),110)}}}
  }
  function start(){
    try{const ac=getAC();running=true;k=0;q=[];nextT=ac.currentTime+.08;sched();timer=setInterval(sched,25);cancelAnimationFrame(raf);raf=requestAnimationFrame(flash);
      $('#mt-go').textContent='Detener';$('#mt-go').classList.remove('go');$('#mt-go').classList.add('gh');$('#mt-err').textContent=''}
    catch(e){running=false;$('#mt-err').textContent='Este navegador no permite reproducir sonido aquí.'}
  }
  function stop(){
    running=false;clearInterval(timer);cancelAnimationFrame(raf);q=[];
    const g=$('#mt-go');if(g){g.textContent='Empezar';g.classList.add('go');g.classList.remove('gh')}
  }
  $('#mt-go').addEventListener('click',()=>running?stop():start());
  $('#mt-m').addEventListener('click',()=>setBpm(s.bpm-1));$('#mt-p').addEventListener('click',()=>setBpm(s.bpm+1));
  $('#mt-m5').addEventListener('click',()=>setBpm(s.bpm-5));$('#mt-p5').addEventListener('click',()=>setBpm(s.bpm+5));
  $('#mt-r').addEventListener('input',e=>setBpm(+e.target.value));
  let taps=[];
  $('#mt-tap').addEventListener('click',()=>{const n=performance.now();if(taps.length&&n-taps[taps.length-1]>2000)taps=[];taps.push(n);if(taps.length>6)taps.shift();const b=tapBpm(taps);if(b)setBpm(b)});
  box.querySelectorAll('[data-pre]').forEach(b=>b.addEventListener('click',()=>{
    const v=b.dataset.pre;s.pat=s.pat.map((_,i)=>v==='all'?'f':v==='24'?(i===1||i===3?'f':'d'):(i===0?'f':'d'));save();drawPads()}));
  $('#mt-v').value=Math.round(s.vol*100);$('#mt-vn').textContent=Math.round(s.vol*100)+'%';
  $('#mt-v').addEventListener('input',e=>{s.vol=clamp(+e.target.value/100,0,1);$('#mt-vn').textContent=Math.round(s.vol*100)+'%';save()});
  box.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|SELECT|BUTTON/.test(e.target.tagName)){e.preventDefault();running?stop():start()}});
  drawBpm();drawChips();drawPads();
  return{stop};
}

/* ================= PIANO ================= */
function mountPiano(box){
  const WH=[0,2,4,5,7,9,11],BK={0:1,1:3,3:6,4:8,5:10};
  const KEYS_A='ASDFGHJK'.split(''),KEYS_B={0:'W',1:'E',3:'T',4:'Y',5:'U'};
  const sv=store.get('faro_piano_v1')||{};
  const s={base:[36,48,60].includes(sv.base)?sv.base:48,names:['sol','cif','none'].includes(sv.names)?sv.names:'sol',vol:sv.vol==null?.8:clamp(+sv.vol,0,1),pedal:!!sv.pedal};
  const save=()=>store.set('faro_piano_v1',s);
  box.classList.add('ft-card','ft-dark');
  box.innerHTML='<div class="pk-bar"><button class="ft-btn gh" type="button" id="pk-dn" aria-label="Bajar una octava">− Octava</button><button class="ft-btn gh" type="button" id="pk-up" aria-label="Subir una octava">Octava +</button>'
    +'<button class="ft-btn gh" type="button" id="pk-nm"></button><button class="ft-btn gh" type="button" id="pk-pd" aria-pressed="false">Pedal</button>'
    +'<label class="ft-vol">Volumen<input id="pk-v" type="range" min="0" max="100" step="1" aria-label="Volumen del piano"></label></div>'
    +'<div class="pk" id="pk"></div><p class="ft-sub" style="margin-top:14px">Toca las teclas con el dedo o el ratón. En computadora también puedes usar las teclas A S D F G H J K y W E T Y U.</p>';
  const $=q=>box.querySelector(q);
  let out=null;const map={};
  const getOut=()=>{const ac=getAC();if(!out){out=ac.createGain();out.connect(ac.destination)}out.gain.value=s.vol;return out};
  function note(m){
    try{const ac=getAC(),f=midiToFreq(m),n=ac.currentTime,rel=s.pedal?4.5:1.9,fl=ac.createBiquadFilter(),g=ac.createGain();
      fl.type='lowpass';fl.frequency.value=3200;g.gain.setValueAtTime(0,n);g.gain.linearRampToValueAtTime(.34,n+.01);g.gain.exponentialRampToValueAtTime(.001,n+rel);
      fl.connect(g);g.connect(getOut());
      [['triangle',1,1],['sine',2,.35],['sine',3,.12]].forEach(p=>{const o=ac.createOscillator(),og=ac.createGain();o.type=p[0];o.frequency.value=f*p[1];og.gain.value=p[2];o.connect(og);og.connect(fl);o.start(n);o.stop(n+rel+.05)})}catch(e){}
  }
  function press(el,m){note(m);el.classList.add('down');setTimeout(()=>el.classList.remove('down'),170)}
  function label(m,i){
    if(s.names==='none')return'';
    const nm=s.names==='sol'?sol(m):cif(m);
    return pc(m)===0?nm+oct(m):nm;
  }
  function build(){
    const pk=$('#pk');pk.textContent='';for(const k in map)delete map[k];
    const nW=window.innerWidth<640?8:15;pk.style.setProperty('--n',nW);
    for(let w=0;w<nW;w++){
      const m=s.base+Math.floor(w/7)*12+WH[w%7];
      const kk=w<8?KEYS_A[w]:'';
      const b=h('button',{class:'wk',type:'button','aria-label':sol(m)+' '+oct(m)},h('span',{},label(m,w)),kk?h('span',{class:'key-k'},kk):null);
      b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.releasePointerCapture(e.pointerId)}catch(x){}press(b,m)});
      b.addEventListener('pointerenter',e=>{if(e.buttons===1)press(b,m)});
      if(kk)map[kk]=[b,m];pk.append(b);
    }
    for(let w=0;w<nW-1;w++){
      const r=w%7;if(!(r in BK))continue;
      const m=s.base+Math.floor(w/7)*12+BK[r];
      const kk=w<7?KEYS_B[r]:'';
      const b=h('button',{class:'bk',type:'button','aria-label':sol(m)+' '+oct(m)},s.names==='none'?'':h('span',{},s.names==='sol'?sol(m):cif(m)));
      b.style.left=((w+1)*100/nW)+'%';
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();try{b.releasePointerCapture(e.pointerId)}catch(x){}press(b,m)});
      b.addEventListener('pointerenter',e=>{if(e.buttons===1)press(b,m)});
      if(kk)map[kk]=[b,m];pk.append(b);
    }
    $('#pk-nm').textContent=s.names==='sol'?'Notas: Do Re Mi':s.names==='cif'?'Notas: C D E':'Sin nombres';
    $('#pk-pd').setAttribute('aria-pressed',String(s.pedal));
    $('#pk-dn').disabled=s.base<=36;$('#pk-up').disabled=s.base>=60;
    $('#pk-dn').style.opacity=s.base<=36?.45:1;$('#pk-up').style.opacity=s.base>=60?.45:1;
  }
  $('#pk-dn').addEventListener('click',()=>{if(s.base>36){s.base-=12;save();build()}});
  $('#pk-up').addEventListener('click',()=>{if(s.base<60){s.base+=12;save();build()}});
  $('#pk-nm').addEventListener('click',()=>{s.names=s.names==='sol'?'cif':s.names==='cif'?'none':'sol';save();build()});
  $('#pk-pd').addEventListener('click',()=>{s.pedal=!s.pedal;save();build()});
  $('#pk-v').value=Math.round(s.vol*100);
  $('#pk-v').addEventListener('input',e=>{s.vol=clamp(+e.target.value/100,0,1);if(out)out.gain.value=s.vol;save()});
  const onKey=e=>{if(e.repeat||e.metaKey||e.ctrlKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const m=map[e.key.toUpperCase()];if(m)press(m[0],m[1])};
  document.addEventListener('keydown',onKey);
  let rt=0,lastN=window.innerWidth<640?8:15;
  const onResize=()=>{clearTimeout(rt);rt=setTimeout(()=>{const n=window.innerWidth<640?8:15;if(n!==lastN){lastN=n;build()}},150)};
  window.addEventListener('resize',onResize);
  build();
  return{stop(){document.removeEventListener('keydown',onKey);window.removeEventListener('resize',onResize)}};
}

/* ================= montaje ================= */
const DEF={
  afinador:{n:'Afinador',sub:'Afina tu guitarra con el micrófono del celular o de la computadora.',mount:mountTuner},
  metronomo:{n:'Metrónomo',sub:'Elige la velocidad, los tiempos del compás y cuál pulso suena fuerte.',mount:mountMetro},
  piano:{n:'Piano',sub:'Un teclado para encontrar notas y practicar de oído.',mount:mountPiano}
};
let cur=null,lastTool=null;
function stop(){if(cur&&cur.stop){try{cur.stop()}catch(e){}}cur=null}
function mount(rootEl,opts){
  injectCSS();stop();
  const tools=(opts&&opts.tools||[]).filter(t=>DEF[t]);
  if(!tools.length){rootEl.innerHTML='<div class="ft-wrap"><div class="ft-card"><p class="ft-sub">Todavía no tienes herramientas activas. Tu profe las activa según tu instrumento.</p></div></div>';return}
  let tool=tools.includes(opts.tool)?opts.tool:tools.includes(lastTool)?lastTool:tools[0];
  const title=tools.length===1?DEF[tools[0]].n:'Mis herramientas';
  rootEl.innerHTML='';
  const head=h('div',{class:'ph'},h('h1',{},title),h('p',{id:'ft-sub'},''));
  const tabs=h('div',{class:'ft-chips',role:'tablist','aria-label':'Herramientas'});
  const body=h('div',{class:'ft-wrap'});
  rootEl.append(head);if(tools.length>1)rootEl.append(h('div',{class:'ft-wrap',style:'margin-bottom:18px'},tabs));rootEl.append(body);
  function show(t){
    stop();tool=t;lastTool=t;head.querySelector('#ft-sub').textContent=DEF[t].sub;
    tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.t===t)));
    body.textContent='';const card=h('div',{});body.append(card);
    try{cur=DEF[t].mount(card)}catch(e){card.className='ft-card';card.textContent='No se pudo cargar esta herramienta.'}
  }
  tools.forEach(t=>tabs.append(h('button',{class:'ft-chip',type:'button',role:'tab','data-t':t,'aria-pressed':'false',onclick:()=>show(t)},DEF[t].n)));
  show(tool);
}

const api={mount,stop,yin,analyze,rms,tempoName,tapBpm,fixPat,nextState,nearestString,TUNINGS,midiToFreq,freqToMidi,cif,sol,oct};
root.FaroTools=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
