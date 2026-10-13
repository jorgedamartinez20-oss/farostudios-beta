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
  {id:'estandar',n:'Estándar',s:[40,45,50,55,59,64]},
  {id:'medio',n:'Medio tono abajo',s:[39,44,49,54,58,63]},
  {id:'tono',n:'Un tono abajo',s:[38,43,48,53,57,62]},
  {id:'dropd',n:'Drop D',s:[38,45,50,55,59,64]},
  {id:'dropc',n:'Drop C',s:[36,43,48,53,57,62]},
  {id:'dadgad',n:'DADGAD',s:[38,45,50,55,57,62]},
  {id:'openg',n:'Open G',s:[38,43,50,55,59,62]},
  {id:'opend',n:'Open D',s:[38,45,50,54,57,62]},
  {id:'opene',n:'Open E',s:[40,47,52,56,59,64]}
];
/* bajo de 4 cuerdas, de la 4.ª (grave) a la 1.ª */
const BASS_TUNINGS=[
  {id:'estandar',n:'Estándar',s:[28,33,38,43]},
  {id:'medio',n:'Medio tono abajo',s:[27,32,37,42]},
  {id:'tono',n:'Un tono abajo',s:[26,31,36,41]},
  {id:'dropd',n:'Drop D',s:[26,33,38,43]},
  {id:'dropc',n:'Drop C',s:[24,31,36,41]}
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
.ft-dark{background:#25252A;color:var(--marfil);border-color:#0E0E10;box-shadow:0 8px 0 #000,0 30px 40px -24px rgba(0,0,0,.7)}
.ft-dark .ft-sub{color:#C9C4BA}
.ft-sub{color:var(--muted);font-size:1rem;margin:0}
.ft-lab{display:grid;gap:8px;font-size:1rem;text-align:left}
.ft-dark .ft-lab{color:#C9C4BA}
.ft-sel{font:inherit;font-size:1.125rem;padding:14px 18px;border-radius:16px;border:2px solid var(--line);background:#fff;color:var(--ink);width:100%}
.ft-dark .ft-sel{background:#34343a;color:var(--marfil);border-color:rgba(245,242,238,.25)}
.ft-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;border:0;border-radius:18px;padding:16px 30px;font:inherit;font-size:1.125rem;cursor:pointer;background:#34343A;color:var(--marfil);box-shadow:0 6px 0 #0E0E10;transition:transform .12s,box-shadow .12s}
.ft-btn:hover{transform:translateY(-2px);box-shadow:0 8px 0 #0E0E10}
.ft-btn:active{transform:translateY(5px);box-shadow:0 1px 0 #0E0E10}
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

/* afinador (estilo paleta de guitarra) */
.ft-wrap{--ol:#2D2D32;--ol2:#1E1E22;--ar:#E8D9B0;--ar2:#B8A06A}
.tu-card{background-color:#25252A;background-image:linear-gradient(rgba(220,203,156,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(220,203,156,.07) 1px,transparent 1px);background-size:30px 30px;text-align:left;--peg:clamp(50px,14.5vw,62px);--grn:#5FD0C8;border-color:#0E0E10}
.tu-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.tu-pill{appearance:none;-webkit-appearance:none;background:rgba(8,8,10,.55);color:var(--ar);font:700 1.25rem/1.2 var(--body);border:3px solid rgba(220,203,156,.45);border-radius:99px;padding:11px 24px;text-align:center;text-align-last:center;cursor:pointer;max-width:62%}
.tu-pill option{background:#25252A;color:#F4F1E6}
.tu-sw{display:flex;align-items:center;gap:12px;background:none;border:0;padding:4px;color:#8F8B82;font:700 1.15rem/1 var(--body);letter-spacing:.08em;cursor:pointer}
.tu-sw[aria-checked="true"]{color:var(--grn)}
.tu-sw i{width:66px;height:38px;border-radius:99px;background:#55555C;position:relative;transition:background .2s;box-shadow:inset 0 2px 4px rgba(0,0,0,.5)}
.tu-sw i::after{content:"";position:absolute;top:3px;left:3px;width:32px;height:32px;border-radius:50%;background:var(--ar);transition:transform .2s;box-shadow:0 2px 4px rgba(0,0,0,.4)}
.tu-sw[aria-checked="true"] i{background:var(--grn)}
.tu-sw[aria-checked="true"] i::after{transform:translateX(28px)}
.tu-meter{position:relative;height:170px;margin-top:6px}
.tu-fl,.tu-sh{position:absolute;top:96px;font-size:2rem;color:#A29E94;line-height:1}
.tu-fl{left:6%}.tu-sh{right:6%}
.tu-line{position:absolute;left:50%;top:0;bottom:-6px;width:4px;margin-left:-2px;background:linear-gradient(#E8D9B0,#9C8650);border-radius:2px;transition:background .25s}
.tu-bub{position:absolute;top:34px;left:50%;width:70px;height:70px;margin-left:-35px;border-radius:50%;background:#121214;border:4px solid var(--ar);display:grid;place-items:center;color:var(--ar);font:400 1.9rem/1 var(--body);transition:border-color .25s,color .25s;will-change:transform}
.tu-bub::after{content:"";position:absolute;left:50%;bottom:-17px;margin-left:-9px;border-left:9px solid transparent;border-right:9px solid transparent;border-top:15px solid var(--ar);transition:border-top-color .25s}
.tu-ok .tu-line{background:var(--grn)}
.tu-ok .tu-bub{border-color:var(--grn);color:var(--grn)}.tu-ok .tu-bub::after{border-top-color:var(--grn)}
.tu-near .tu-bub{border-color:var(--oro)}.tu-near .tu-bub::after{border-top-color:var(--oro)}
.tu-head{position:relative;margin-top:2px}
.tu-hw{position:relative;width:min(250px,calc(100% - 2*(var(--peg) + 8px)));aspect-ratio:260/380;margin:0 auto}
.tu-hw svg{width:100%;height:100%;display:block;overflow:visible}
.tu-peg{position:absolute;width:var(--peg);height:var(--peg);margin-top:calc(var(--peg)/-2);border-radius:50%;border:2px solid rgba(220,203,156,.3);background:rgba(8,8,10,.45);color:var(--grn);font:400 clamp(1.7rem,6vw,2.1rem)/1 var(--body);display:grid;place-items:center;cursor:pointer;padding:0;transition:border-color .2s,background .2s,transform .12s}
.tu-peg:active{transform:scale(.94)}
.tu-peg.l{right:calc(100% + 8px)}.tu-peg.r{left:calc(100% + 8px)}
.tu-peg[aria-pressed="true"]{border-color:var(--ar)}
.tu-peg.on{border-color:var(--grn);background:rgba(95,208,200,.2)}
.tu-peg.done::after{content:"✓";position:absolute;right:-5px;top:-7px;width:26px;height:26px;border-radius:50%;background:var(--grn);color:#121214;font:700 1rem/1 var(--body);display:grid;place-items:center;box-shadow:0 2px 0 #0E0E10}
.tu-lv{height:8px;max-width:260px;margin:12px auto 0;border-radius:99px;background:rgba(244,241,230,.14);overflow:hidden}
.tu-lv i{display:block;height:100%;width:0;background:var(--grn);border-radius:99px;transition:width .06s}
.tu-msg{font-size:1.125rem;text-align:center;margin:10px 0 0;min-height:1.7em;color:#F1EBD8}
.tu-ok .tu-msg{color:var(--grn)}
.tu-tip{font-size:1rem;color:#B7B2A8;margin:14px auto 0;max-width:46ch;text-align:center}

/* metrónomo (estilo Tempo) */
.mt-card{--or:#E8D9B0;--or2:#9C8650;background:linear-gradient(180deg,#34343A,#1B1B1F);color:#F4F1E6;border:2px solid #0E0E10;border-radius:30px;padding:0;overflow:hidden;box-shadow:0 8px 0 #0E0E10,0 30px 40px -24px rgba(0,0,0,.7);text-align:center}
.mt-card *{-webkit-tap-highlight-color:transparent}
.mt-dots{display:flex;justify-content:center;align-items:center;gap:clamp(10px,3vw,20px);padding:clamp(26px,6vw,40px) 16px;border-bottom:3px solid var(--or);flex-wrap:wrap}
.mt-dot{width:clamp(30px,calc((100vw - 96px)/var(--n,4) - 12px),64px);flex:none;aspect-ratio:1;border-radius:50%;border:2px solid var(--or);background:var(--or);color:#25252A;display:grid;place-items:center;padding:0;cursor:pointer;font:700 1.2rem/1 var(--body);transition:transform .07s,background .07s,box-shadow .07s;box-shadow:0 4px 0 var(--or2)}
.mt-dot.d::after{content:""}
.mt-dot.f::after{content:"Λ";font-size:1.5rem;font-weight:400}
.mt-dot.m{background:#3C3C42;border-color:#5A5A62;box-shadow:none;opacity:.8}
.mt-dot.hit{transform:scale(1.14);background:#FFF3CC;box-shadow:0 0 22px 4px rgba(220,203,156,.7)}
.mt-panel{margin:14px;background:rgba(0,0,0,.28);border-radius:20px;padding:14px 12px 16px}
.mt-cap{font:400 .9rem/1 var(--body);letter-spacing:.14em;text-transform:uppercase;color:#A29E94;margin:2px 0 12px}
.mt-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px 4px}
.mt-opt{border:0;background:none;color:#EDE9E1;font:400 1.25rem/1 var(--body);padding:12px 4px;border-radius:12px;cursor:pointer;min-height:48px}
.mt-opt[aria-pressed="true"]{color:var(--or);background:rgba(220,203,156,.16)}
.mt-opt small{display:block;font-size:.72rem;letter-spacing:.04em;margin-top:5px;color:#A29E94}
.mt-opt[aria-pressed="true"] small{color:var(--or)}
.mt-opt .gl{font-size:1.7rem;line-height:1}
.mt-bpmrow{display:flex;align-items:center;justify-content:space-between;gap:6px}
.mt-pm{width:56px;height:56px;border:0;background:none;color:#EDE9E1;font:300 2.6rem/1 var(--body);cursor:pointer;border-radius:50%;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.mt-pm:active{background:rgba(255,255,255,.1)}
.mt-num{font:200 clamp(4.4rem,18vw,6.4rem)/1 var(--body);letter-spacing:-.02em;min-width:2.4ch;font-variant-numeric:tabular-nums}
.mt-unit{font-size:.8rem;color:#A29E94;letter-spacing:.1em;margin-left:4px}
.mt-range{width:100%;margin:10px 0 2px;height:36px;accent-color:var(--or);background:none}
.mt-sub2{display:flex;justify-content:space-between;align-items:center;padding:0 6px;margin-top:2px}
.mt-name{font:italic 400 1.35rem/1 var(--body);color:#EDE9E1}
.mt-tap{border:2px solid #5A5A62;background:none;color:#EDE9E1;border-radius:14px;padding:12px 24px;font:400 1.05rem/1 var(--body);letter-spacing:.14em;cursor:pointer;touch-action:manipulation}
.mt-tap:active{background:rgba(255,255,255,.12)}
.mt-foot{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:6px 22px 16px;gap:10px}
.mt-foot span{font:400 1.5rem/1 var(--body);color:#EDE9E1}
.mt-foot span:last-child{text-align:right}
.mt-play{width:92px;height:92px;border-radius:50%;border:0;background:#F4F1E6;color:#25252A;display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 0 #0E0E10;touch-action:manipulation}
.mt-play:active{transform:translateY(4px);box-shadow:0 2px 0 #000}
.mt-play svg{width:42px;height:42px;fill:currentColor}
.mt-play[aria-pressed="true"]{background:var(--or);color:#25252A}
.mt-vol{display:flex;align-items:center;gap:12px;padding:0 24px 20px;color:#A29E94;font-size:.95rem}
.mt-vol input{flex:1;accent-color:var(--or);height:32px}
.mt-hint{color:#9C988E;font-size:.92rem;margin:-4px 20px 14px}

/* piano */
.pk-bar{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;margin-bottom:16px}
.pk-bar .ft-vol{display:flex;align-items:center;gap:10px;font-size:1rem;color:#C9C4BA}
.pk-bar .ft-vol input{width:130px;accent-color:var(--oro);height:32px}
.pk{position:relative;display:flex;height:clamp(200px,38vw,320px);gap:2px;touch-action:none;user-select:none;-webkit-user-select:none;background:#000;border:2px solid #000;border-bottom:0;border-radius:10px 10px 0 0;overflow:hidden}
.pk .wk{flex:1 1 0;min-width:0;border:0;border-radius:0 0 10px 10px;background:linear-gradient(#FBF9F4,#E9E3D6);color:var(--pizarra);font:400 1rem/1 var(--body);display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;padding:0 0 12px;cursor:pointer;box-shadow:inset 0 -6px 0 rgba(0,0,0,.12)}
.pk .wk.down,.pk .wk.hl{background:linear-gradient(#E4DDA0,#B8A06A);box-shadow:inset 0 -2px 0 rgba(0,0,0,.2)}
.pk .bk{position:absolute;top:0;width:calc(100%/var(--n)*.6);height:62%;transform:translateX(-50%);border:0;border-radius:0 0 8px 8px;background:linear-gradient(#3A3A3A,#111);color:#C9C4BA;font:400 .9rem/1 var(--body);padding:0 0 8px;display:flex;align-items:flex-end;justify-content:center;cursor:pointer;box-shadow:0 5px 0 rgba(0,0,0,.5);z-index:2}
.pk .bk.down{background:linear-gradient(#6B6B74,#4F5A2A)}
.pk .key-k{font-size:.8rem;opacity:.55}
@media (hover:none){.pk .key-k{display:none}}
`;
function injectCSS(){if(document.getElementById('ft-css'))return;const s=document.createElement('style');s.id='ft-css';s.textContent=CSS;document.head.append(s)}

/* ================= AFINADOR (guitarra y bajo) ================= */
/* cfg: tunings = lista de afinaciones, minF/maxF = rango del detector, fft = tamaño de ventana, cada = ms entre lecturas */
const CFG_GUITARRA={tunings:TUNINGS,minF:60,maxF:1100,fft:4096,cada:45,tip:'Toca una clavija para escuchar su nota y afinar de oído. Con guitarra eléctrica sin amplificador, acércala al micrófono y toca la cuerda con fuerza.'};
const CFG_BAJO={tunings:BASS_TUNINGS,minF:28,maxF:420,fft:8192,cada:90,tip:'Toca una clavija para escuchar su nota y afinar de oído. El bajo suena muy grave: toca la cuerda al aire, con fuerza, y acerca el celular al altavoz o al bajo.'};

function mountTuner(box,cfg){
  const T=cfg.tunings,N=T[0].s.length,half=Math.ceil(N/2);
  let ubuf=null,zg=null;
  const st={tun:T[0],auto:true,target:0,on:false,done:new Set(),hist:[],lastPitch:0,okSince:0,okIdx:-1,px:0,toneUntil:0,cat:'',msg:'',cur:null};
  let stream=null,src=null,an=null,buf=null,raf=0,lastDet=0,span=120;
  /* clavijas: la mitad grave a la izquierda (de abajo hacia arriba) y el resto a la derecha (de arriba hacia abajo) */
  const LEFT=[];for(let i=half-1;i>=0;i--)LEFT.push(i);
  const RIGHT=[];for(let i=half;i<N;i++)RIGHT.push(i);
  const YS=half>=3?[84,148,212]:half===2?[108,190]:[148];
  const postXY=i=>{const L=LEFT.indexOf(i);return L>=0?[96,YS[L]]:[204,YS[RIGHT.indexOf(i)]]};
  const nutX=i=>118+i*64/(N-1);
  const gauge=i=>(N>=6?2.8-i*.28:3.6-i*.3).toFixed(2);
  /* paleta realista: madera con borde crema, tapa del alma, clavijas negras con brillo, cuerdas de acero */
  let strings='';
  for(let i=0;i<N;i++){const p=postXY(i);strings+='<path id="tu-str'+i+'" d="M'+p[0]+' '+p[1]+' L'+nutX(i).toFixed(1)+' 298 L'+nutX(i).toFixed(1)+' 380" fill="none" stroke="#E8E4D2" stroke-width="'+gauge(i)+'" stroke-linecap="round" stroke-linejoin="round"/>'}
  let knobs='';
  LEFT.forEach((i,k)=>{const y=YS[k];knobs+='<rect x="64" y="'+(y-3.5)+'" width="34" height="7" rx="3" fill="url(#tu-steel)"/><rect x="28" y="'+(y-21)+'" width="38" height="42" rx="14" fill="url(#tu-knob)" stroke="#121214" stroke-width="1.5"/><rect x="34" y="'+(y-16)+'" width="9" height="32" rx="4.5" fill="rgba(255,255,255,.22)"/>'});
  RIGHT.forEach((i,k)=>{const y=YS[k];knobs+='<rect x="202" y="'+(y-3.5)+'" width="34" height="7" rx="3" fill="url(#tu-steel)"/><rect x="234" y="'+(y-21)+'" width="38" height="42" rx="14" fill="url(#tu-knob)" stroke="#000" stroke-width="1.5"/><rect x="260" y="'+(y-16)+'" width="9" height="32" rx="4.5" fill="rgba(255,255,255,.22)"/>'});
  let posts='';
  for(let i=0;i<N;i++){const p=postXY(i);posts+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="10" fill="url(#tu-steel)" stroke="#4a4a4e" stroke-width="1.5"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.4" fill="#2a2a2d"/>'}
  const head='<svg viewBox="20 0 260 380" aria-hidden="true"><defs>'
    +'<linearGradient id="tu-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7D8AC"/><stop offset=".55" stop-color="#CDB27C"/><stop offset="1" stop-color="#A88E58"/></linearGradient>'
    +'<linearGradient id="tu-knob" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6B6B74"/><stop offset="1" stop-color="#25252A"/></linearGradient>'
    +'<linearGradient id="tu-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6F6F6"/><stop offset="1" stop-color="#8b8f94"/></linearGradient></defs>'
    +'<rect x="110" y="298" width="80" height="82" fill="#25252A"/><path d="M110 340H190M110 374H190" stroke="#6a6a72" stroke-width="3"/>'
    +'<path d="M72 50C72 32 86 26 102 28C122 30 136 40 150 40C164 40 178 30 198 28C214 26 228 32 228 50L222 232C220 264 200 284 190 298L110 298C100 284 80 264 78 232Z" fill="url(#tu-wood)" stroke="#B8A06A" stroke-width="4.5" stroke-linejoin="round"/>'
    +'<path d="M132 248C132 238 168 238 168 248L162 284C160 293 140 293 138 284Z" fill="#3A3A40" stroke="#121214" stroke-width="1.5"/><circle cx="150" cy="254" r="2.3" fill="#E8D9B0"/><circle cx="150" cy="281" r="2.3" fill="#E8D9B0"/>'
    +'<rect x="106" y="292" width="88" height="9" rx="2" fill="#F4F1E6"/>'
    +strings+knobs+posts+'</svg>';
  box.classList.add('ft-card','ft-dark','tu-card');
  box.innerHTML='<div id="tu-st" class="">'
    +'<div class="tu-top"><select class="tu-pill" id="tu-sel" aria-label="Afinación">'+T.map(t=>'<option value="'+t.id+'">'+t.n+'</option>').join('')+'</select>'
    +'<button class="tu-sw" type="button" id="tu-auto" role="switch" aria-checked="true">AUTO<i></i></button></div>'
    +'<div class="tu-meter" id="tu-meter"><span class="tu-fl" aria-hidden="true">♭</span><span class="tu-sh" aria-hidden="true">♯</span><i class="tu-line"></i><div class="tu-bub" id="tu-bub" aria-hidden="true"></div></div>'
    +'<div class="tu-head" id="tu-head"><div class="tu-hw" id="tu-hw">'+head+'</div></div>'
    +'<div class="tu-lv" aria-hidden="true"><i id="tu-lvi"></i></div>'
    +'<p class="tu-msg" id="tu-msg" role="status">Activa el micrófono y toca una cuerda.</p></div>'
    +'<div class="ft-row" style="margin-top:12px"><button class="ft-btn go" type="button" id="tu-mic">Activar micrófono</button></div><p class="ft-err" id="tu-err" role="alert"></p>'
    +'<p class="tu-tip">'+cfg.tip+'</p>';
  const $=s=>box.querySelector(s);
  const hw=$('#tu-hw'),pegs=[];
  function buildPegs(){
    hw.querySelectorAll('.tu-peg').forEach(x=>x.remove());pegs.length=0;
    [[LEFT,'l'],[RIGHT,'r']].forEach(g=>g[0].forEach((idx,k)=>{
      const m=st.tun.s[idx];
      const b=h('button',{class:'tu-peg '+g[1],type:'button','aria-pressed':'false','aria-label':'Cuerda '+(N-idx)+', '+cif(m)+oct(m)+'. Toca para escucharla',style:'top:'+(YS[k]/380*100).toFixed(2)+'%'},cif(m));
      b.addEventListener('click',()=>{st.auto=false;st.target=idx;st.hist.length=0;sync();try{st.toneUntil=getAC().currentTime+2.1;playTone(midiToFreq(m),2,.45)}catch(e){}});
      pegs[idx]=b;hw.append(b)}));
  }
  function sync(){
    const a=$('#tu-auto');a.setAttribute('aria-checked',String(st.auto));
    pegs.forEach((b,i)=>{b.setAttribute('aria-pressed',String(!st.auto&&st.target===i));b.classList.toggle('done',st.done.has(i))});
    for(let i=0;i<N;i++){const p=$('#tu-str'+i);if(!p)continue;const act=st.cur&&st.cur.idx===i&&Math.abs(st.cur.cents)<=5,man=!st.auto&&st.target===i;p.setAttribute('stroke',act?'#5FD0C8':man?'#FFFBEA':'#E8E4D2')}
  }
  function setCat(c,msg){
    const s=$('#tu-st');if(st.cat!==c){st.cat=c;s.className=c;sync()}
    if(st.msg!==msg){st.msg=msg;$('#tu-msg').textContent=msg}
  }
  $('#tu-sel').addEventListener('change',e=>{st.tun=T.find(t=>t.id===e.target.value)||T[0];st.done.clear();st.hist.length=0;st.target=0;st.cur=null;buildPegs();sync()});
  $('#tu-auto').addEventListener('click',()=>{st.auto=!st.auto;if(!st.auto&&st.cur)st.target=st.cur.idx;st.hist.length=0;sync()});
  function paint(r,freq){
    const m=st.tun.s[r.idx],a=Math.abs(r.cents),nm=cif(m)+oct(m)+' · '+sol(m);
    $('#tu-bub').textContent=cif(m);
    if(a<=5)setCat('tu-ok',nm+' · ¡Afinada!');
    else if(r.cents<0)setCat(a<=15?'tu-near':'tu-far',nm+' · Baja ('+Math.round(r.cents)+' cents): aprieta la clavija');
    else setCat(a<=15?'tu-near':'tu-far',nm+' · Alta (+'+Math.round(r.cents)+' cents): afloja la clavija');
  }
  function detect(now){
    const ac=getAC();if(ac.currentTime<st.toneUntil)return;
    if(ubuf){an.getByteTimeDomainData(ubuf);for(let i=0;i<buf.length;i++)buf[i]=(ubuf[i]-128)/128}else an.getFloatTimeDomainData(buf);
    const lv=rms(buf),lvi=$('#tu-lvi');if(lvi)lvi.style.width=Math.min(100,Math.sqrt(lv)*260)+'%';
    if(lv<.0006){if(!st.quietSince)st.quietSince=now;if(now-st.quietSince>3500&&!st.cur){setCat('','No te escucho. Acerca el celular a la guitarra, toca la cuerda con fuerza y revisa que el micrófono esté permitido.')}}else st.quietSince=0;
    let r=null;if(lv>0.0012)r=yin(buf,ac.sampleRate,cfg.minF,cfg.maxF,.12);
    if(r&&r.clarity>.82&&r.freq>=cfg.minF&&r.freq<=cfg.maxF){
      st.hist.push(freqToMidi(r.freq));if(st.hist.length>5)st.hist.shift();st.lastPitch=now;
      const mm=median(st.hist),res=analyze(midiToFreq(mm),st.tun.s,st.auto,st.target);
      st.cur=res;paint(res,midiToFreq(mm));
      pegs.forEach((b,i)=>b.classList.toggle('on',i===res.idx&&Math.abs(res.cents)<=5));
      if(Math.abs(res.cents)<=5){if(st.okIdx!==res.idx){st.okIdx=res.idx;st.okSince=now}else if(now-st.okSince>700&&!st.done.has(res.idx)){st.done.add(res.idx);sync()}}
      else st.okIdx=-1;
      sync();
    }else if(now-st.lastPitch>450&&st.cur){
      st.hist.length=0;st.cur=null;st.okIdx=-1;pegs.forEach(b=>b.classList.remove('on'));$('#tu-bub').textContent='';
      setCat('','Toca una cuerda');sync();
    }
  }
  function loop(ts){
    raf=requestAnimationFrame(loop);
    if(ts-lastDet>cfg.cada){lastDet=ts;try{detect(ts)}catch(e){}}
    const tgt=st.cur?clamp(st.cur.cents,-50,50)/50:0;
    st.px+=(tgt-st.px)*.2;
    const bub=$('#tu-bub');if(bub)bub.style.transform='translateX('+(st.px*span).toFixed(1)+'px)';
  }
  const measure=()=>{const m=$('#tu-meter');if(m)span=Math.max(40,m.clientWidth/2-52)};
  window.addEventListener('resize',measure);measure();
  async function start(){
    $('#tu-err').textContent='';
    let ac0=null;try{ac0=getAC()}catch(e){}   /* se crea y despierta ANTES de pedir el micrófono: Safari de iPhone solo lo permite dentro del toque */
    try{ac0&&ac0.state!=='running'&&ac0.resume()}catch(e){}
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$('#tu-err').textContent='Este navegador no permite usar el micrófono aquí. Abre el portal desde Chrome o Safari.';return}
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      const ac=getAC();try{if(ac.state!=='running')await ac.resume()}catch(e){}src=ac.createMediaStreamSource(stream);an=ac.createAnalyser();an.fftSize=cfg.fft;an.smoothingTimeConstant=0;buf=new Float32Array(an.fftSize);ubuf=an.getFloatTimeDomainData?null:new Uint8Array(an.fftSize);src.connect(an);
      /* Safari solo procesa el analizador si está conectado a la salida; con volumen 0 no se oye nada */
      try{zg=ac.createGain();zg.gain.value=0;an.connect(zg);zg.connect(ac.destination)}catch(e){}
      st.t0=performance.now();st.quiet=0;
      st.on=true;trk('afinador').on();st.lastPitch=0;$('#tu-mic').textContent='Detener micrófono';$('#tu-mic').classList.remove('go');$('#tu-mic').classList.add('gh');
      setCat('','Toca una cuerda');measure();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
    }catch(e){
      const n=e&&e.name;
      $('#tu-err').textContent=n==='NotAllowedError'||n==='SecurityError'?'No tenemos permiso para usar el micrófono. Permítelo en el candado de la barra de direcciones y vuelve a intentar.':n==='NotFoundError'?'No encontramos un micrófono en este dispositivo.':'No se pudo activar el micrófono. Intenta de nuevo.';
    }
  }
  function stop(){
    cancelAnimationFrame(raf);raf=0;window.removeEventListener('resize',measure);
    if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
    try{src&&src.disconnect()}catch(e){}try{zg&&zg.disconnect()}catch(e){}zg=null;src=null;st.on=false;trk('afinador').off();st.cur=null;st.px=0;
    const b=$('#tu-mic');if(b){b.textContent='Activar micrófono';b.classList.add('go');b.classList.remove('gh')}
    const bub=$('#tu-bub');if(bub){bub.style.transform='';bub.textContent=''}
  }
  $('#tu-mic').addEventListener('click',()=>st.on?stop():start());
  buildPegs();sync();
  return{stop};
}
const mountTunerGuitarra=box=>mountTuner(box,CFG_GUITARRA);
const mountTunerBajo=box=>mountTuner(box,CFG_BAJO);

/* ================= METRÓNOMO ================= */
function mountMetro(box){
  const KEY='faro_metro_v2',saved=store.get(KEY)||store.get('faro_metro_v1')||{};
  const METERS=[['2/4',2],['3/4',3],['4/4',4],['5/4',5],['3/8',3],['6/8',6],['7/8',7],['12/8',12]];
  const SUBS=[[1,'♩','Negras'],[2,'♫','Corcheas'],[3,'♫³','Tresillos'],[4,'♬','Semicorcheas']];
  const m0=METERS.find(m=>m[0]===saved.meter)||METERS.find(m=>m[1]===+saved.beats&&m[0].endsWith('/4'))||METERS[2];
  const s={meter:m0[0],beats:m0[1],bpm:clamp(+saved.bpm||100,30,260),sub:[1,2,3,4].includes(saved.sub)?saved.sub:1,vol:saved.vol==null?.8:clamp(+saved.vol,0,1),pat:null};
  s.pat=fixPat(saved.pat,s.beats);
  const save=()=>store.set(KEY,{meter:s.meter,beats:s.beats,bpm:s.bpm,sub:s.sub,vol:s.vol,pat:s.pat});
  box.classList.add('mt-card');
  box.innerHTML='<div class="mt-dots" id="mt-pads" role="group" aria-label="Pulsos del compás"></div>'
    +'<p class="mt-hint" style="margin-top:12px">Toca un punto: <b>Λ</b> fuerte · lleno suave · apagado en silencio</p>'
    +'<div class="mt-panel"><div class="mt-bpmrow"><button class="mt-pm" type="button" id="mt-m" aria-label="Bajar un tiempo por minuto">−</button>'
    +'<div><span class="mt-num" id="mt-n" aria-live="off"></span><span class="mt-unit">BPM</span></div>'
    +'<button class="mt-pm" type="button" id="mt-p" aria-label="Subir un tiempo por minuto">+</button></div>'
    +'<input class="mt-range" id="mt-r" type="range" min="30" max="260" step="1" aria-label="Velocidad en pulsos por minuto">'
    +'<div class="mt-sub2"><span class="mt-name" id="mt-name"></span><button class="mt-tap" type="button" id="mt-tap">TAP</button></div></div>'
    +'<div class="mt-foot"><span id="mt-ml"></span><button class="mt-play" type="button" id="mt-go" aria-pressed="false" aria-label="Empezar"></button><span id="mt-sl"></span></div>'
    +'<label class="mt-vol"><span>Volumen</span><input id="mt-v" type="range" min="0" max="100" step="1" aria-label="Volumen del metrónomo"><span id="mt-vn" style="min-width:3.5ch;text-align:right"></span></label>'
    +'<div class="mt-panel"><div class="mt-cap">Compás</div><div class="mt-grid" id="mt-b" role="group" aria-label="Compás"></div>'
    +'<div class="mt-cap" style="margin-top:14px">Subdivisión</div><div class="mt-grid" id="mt-s" role="group" aria-label="Subdivisión"></div></div>'
    +'<p class="ft-err" id="mt-err" role="alert" style="text-align:center"></p>';
  const $=q=>box.querySelector(q);
  const PLAY='<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>',PAUSE='<svg viewBox="0 0 24 24"><path d="M6 4h4.2v16H6zM13.8 4H18v16h-4.2z"/></svg>';
  let running=false,timer=0,raf=0,nextT=0,k=0,q=[];
  function drawBpm(){$('#mt-n').textContent=s.bpm;$('#mt-name').textContent=tempoName(s.bpm);$('#mt-r').value=s.bpm}
  function drawFoot(){$('#mt-ml').textContent=s.meter;$('#mt-sl').textContent=SUBS.find(x=>x[0]===s.sub)[1]}
  function drawChips(){
    const bb=$('#mt-b');bb.textContent='';METERS.forEach(m=>bb.append(h('button',{class:'mt-opt',type:'button','aria-pressed':String(m[0]===s.meter),onclick:()=>{s.meter=m[0];s.beats=m[1];s.pat=fixPat(s.pat,m[1]);restartBar();save();drawChips();drawPads()}},m[0])));
    const ss=$('#mt-s');ss.textContent='';SUBS.forEach(x=>ss.append(h('button',{class:'mt-opt','aria-label':x[2],type:'button','aria-pressed':String(x[0]===s.sub),onclick:()=>{s.sub=x[0];restartBar();save();drawChips()}},h('span',{class:'gl'},x[1]),h('small',{},x[2]))));
    drawFoot();
  }
  const LAB={f:'fuerte',d:'suave',m:'en silencio'};
  function drawPads(){
    const p=$('#mt-pads');p.textContent='';p.style.setProperty('--n',s.pat.length);
    s.pat.forEach((st,i)=>p.append(h('button',{class:'mt-dot '+st,type:'button','aria-label':'Pulso '+(i+1)+': '+LAB[st]+'. Toca para cambiar',onclick:()=>{s.pat[i]=nextState(s.pat[i]);save();drawPads()}})));
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
  function setPlay(on){const g=$('#mt-go');if(!g)return;g.innerHTML=on?PAUSE:PLAY;g.setAttribute('aria-pressed',String(on));g.setAttribute('aria-label',on?'Detener':'Empezar')}
  function start(){
    try{const ac=getAC();running=true;trk('metronomo').on();k=0;q=[];nextT=ac.currentTime+.08;sched();timer=setInterval(sched,25);cancelAnimationFrame(raf);raf=requestAnimationFrame(flash);setPlay(true);$('#mt-err').textContent=''}
    catch(e){running=false;$('#mt-err').textContent='Este navegador no permite reproducir sonido aquí.'}
  }
  function stop(){running=false;trk('metronomo').off();clearInterval(timer);cancelAnimationFrame(raf);q=[];setPlay(false)}
  $('#mt-go').addEventListener('click',()=>running?stop():start());
  // − y + : un toque cambia 1; mantener presionado repite
  function hold(btn,d){
    let t1=0,t2=0;const end=()=>{clearTimeout(t1);clearInterval(t2)};
    btn.addEventListener('pointerdown',e=>{e.preventDefault();setBpm(s.bpm+d);end();t1=setTimeout(()=>{t2=setInterval(()=>setBpm(s.bpm+d*2),90)},420)});
    ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,end));
    btn.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setBpm(s.bpm+d)}});
  }
  hold($('#mt-m'),-1);hold($('#mt-p'),1);
  $('#mt-r').addEventListener('input',e=>setBpm(+e.target.value));
  let taps=[];
  $('#mt-tap').addEventListener('click',()=>{const n=performance.now();if(taps.length&&n-taps[taps.length-1]>2000)taps=[];taps.push(n);if(taps.length>6)taps.shift();const b=tapBpm(taps);if(b)setBpm(b)});
  $('#mt-v').value=Math.round(s.vol*100);$('#mt-vn').textContent=Math.round(s.vol*100)+'%';
  $('#mt-v').addEventListener('input',e=>{s.vol=clamp(+e.target.value/100,0,1);$('#mt-vn').textContent=Math.round(s.vol*100)+'%';save()});
  box.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|SELECT|BUTTON/.test(e.target.tagName)){e.preventDefault();running?stop():start()}});
  setPlay(false);drawBpm();drawChips();drawPads();
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
  afinador:{n:'Afinador de guitarra',sub:'Afina tu guitarra con el micrófono del celular o de la computadora.',mount:mountTunerGuitarra},
  afinadorbajo:{n:'Afinador de bajo',sub:'Afina tu bajo de 4 cuerdas con el micrófono del celular o de la computadora.',mount:mountTunerBajo},
  piano:{n:'Piano',sub:'Un teclado para encontrar notas y practicar de oído.',mount:mountPiano},
  metronomo:{n:'Metrónomo',sub:'Elige la velocidad, los tiempos del compás y cuál pulso suena fuerte.',mount:mountMetro}
};
let cur=null,lastTool=null,onUse=null;
/* Tiempo de uso de afinador y metrónomo (para darle XP al estudiante): se avisa con opts.onUse(herramienta, segundos). */
const TRK={};
function trk(t){return TRK[t]||(TRK[t]={t0:0,on(){if(!this.t0)this.t0=Date.now()},off(){if(!this.t0)return;const sg=(Date.now()-this.t0)/1000;this.t0=0;try{onUse&&onUse(t,sg)}catch(e){}}})}
function stop(){if(cur&&cur.stop){try{cur.stop()}catch(e){}}cur=null}
function mount(rootEl,opts){
  injectCSS();stop();onUse=(opts&&opts.onUse)||null;
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

const api={mount,stop,yin,analyze,rms,tempoName,tapBpm,fixPat,nextState,nearestString,TUNINGS,BASS_TUNINGS,CFG_GUITARRA,CFG_BAJO,midiToFreq,freqToMidi,cif,sol,oct};
root.FaroTools=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
