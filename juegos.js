/* Faro Academy · "Aumentar XP": 5 juegos de inglés y 5 de música para estudiantes.
   Todo corre en el navegador (Web Audio, voz del navegador). No se sube audio ni texto a ningún lado.
   Uso: FaroJuegos.mount(contenedor, {instr:[...], area:'musica'|'ingles', nivel:1, onXP:(fuente,xp,puntaje)=>Promise<{dado,tope}>}) · FaroJuegos.stop() al salir. */
(function(root){
'use strict';

/* ================= utilidades ================= */
const h=(t,a,...k)=>{const e=document.createElement(t);for(const x in (a||{})){const v=a[x];if(x==='class')e.className=v;else if(x.slice(0,2)==='on'&&typeof v==='function')e.addEventListener(x.slice(2),v);else if(v!==false&&v!=null)e.setAttribute(x,v===true?'':v)}k.flat().forEach(c=>{if(c==null||c===false)return;e.append(c.nodeType?c:document.createTextNode(c))});return e};
const rnd=n=>Math.floor(Math.random()*n);
const pickOne=a=>a[rnd(a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SVGNS='http://www.w3.org/2000/svg';
const svg=(w,hh,inner,label)=>{const d=document.createElement('div');d.innerHTML='<svg xmlns="'+SVGNS+'" viewBox="0 0 '+w+' '+hh+'" width="100%" role="img" aria-label="'+(label||'')+'" style="max-width:'+w+'px;height:auto">'+inner+'</svg>';return d.firstChild};

/* texto en inglés: se compara sin mayúsculas, acentos, puntuación ni contracciones */
const CONTR=[["can't","can not"],["cannot","can not"],["won't","will not"],["i'm","i am"],["you're","you are"],["he's","he is"],["she's","she is"],["it's","it is"],["we're","we are"],["they're","they are"],["what's","what is"],["where's","where is"],["that's","that is"],["there's","there is"],["i've","i have"],["i'd","i would"],["i'll","i will"],["let's","let us"]];
function norm(s){
  s=String(s||'').toLowerCase().replace(/[’‘`´]/g,"'");
  CONTR.forEach(([a,b])=>{s=s.split(a).join(b)});
  s=s.replace(/n't/g,' not').replace(/'re/g,' are').replace(/'ll/g,' will').replace(/'ve/g,' have').replace(/'m\b/g,' am').replace(/'d\b/g,' would');
  return s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9ñ ]+/g,' ').replace(/\s+/g,' ').trim()}
function lev(a,b){const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
const lvlJuego=n=>n<=2?1:n<=5?2:3;   // nivel del estudiante (por XP) → dificultad inicial 1-3

/* ================= estilos ================= */
let cssOk=false;
function injectCSS(){
  if(cssOk)return;cssOk=true;const s=document.createElement('style');s.textContent=`
.fj{display:grid;gap:16px;text-align:left}.fj-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.fj-card{background:var(--card,#fff);border-radius:22px;padding:18px;box-shadow:0 6px 0 rgba(0,0,0,.12),0 12px 24px rgba(0,0,0,.08);display:grid;gap:8px;cursor:pointer;border:0;text-align:left;font:inherit;color:inherit}
.fj-card:hover{transform:translateY(-2px)}.fj-card b{font-size:1.1rem}.fj-card small{opacity:.75}
.fj-ic{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-weight:800;color:#fff;font-size:1rem}
.fj-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.fj-top h2{margin:0;flex:1}
.fj-box{background:var(--card,#fff);border-radius:22px;padding:20px;box-shadow:0 6px 0 rgba(0,0,0,.12);display:grid;gap:14px;justify-items:center;text-align:center}
.fj-q{font-size:clamp(1.3rem,4vw,2rem);font-weight:700}.fj-sub{opacity:.75}
.fj-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;width:100%}
.fj-b{font:inherit;font-weight:700;padding:12px 14px;border-radius:16px;border:0;cursor:pointer;background:var(--paper,#f3efe4);box-shadow:0 4px 0 rgba(0,0,0,.18);color:inherit;display:grid;gap:2px;justify-items:center}
.fj-b small{font-weight:400;opacity:.7}.fj-b:hover{transform:translateY(-1px)}.fj-b:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.18)}
.fj-b.y{background:var(--y,#E3B23C)}.fj-b.ok{background:#7BB662;color:#fff}.fj-b.no{background:#D9534F;color:#fff}.fj-b[disabled]{opacity:.7;cursor:default}
.fj-in{font:inherit;font-size:1.2rem;padding:12px 14px;border-radius:14px;border:2px solid rgba(0,0,0,.25);width:min(100%,520px);background:rgba(255,255,255,.85);color:#252528}
textarea.fj-in{min-height:170px;resize:vertical}
.fj-fb{padding:10px 14px;border-radius:14px;font-weight:700;width:100%}.fj-fb.ok{background:rgba(123,182,98,.25)}.fj-fb.no{background:rgba(217,83,79,.2)}
.fj-bar{width:100%;height:12px;border-radius:8px;background:rgba(0,0,0,.12);overflow:hidden}.fj-bar i{display:block;height:100%;background:var(--y,#E3B23C);transition:width .3s}
.fj-meta{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;font-size:.9rem;opacity:.85}
.fj-chips{display:flex;gap:8px;flex-wrap:wrap}.fj-chip{font:inherit;padding:8px 16px;border-radius:999px;border:0;cursor:pointer;background:var(--paper,#f3efe4);box-shadow:0 3px 0 rgba(0,0,0,.18);color:inherit}.fj-chip[aria-pressed=true]{background:var(--pizarra,#252528);color:#fff}
.fj-words span{display:inline-block;margin:2px 4px;padding:2px 8px;border-radius:8px;font-size:1.1rem}.fj-words .ok{background:rgba(123,182,98,.35)}.fj-words .no{background:rgba(217,83,79,.3)}
.fj-pad{width:min(100%,360px);height:120px;border-radius:26px;border:0;font:inherit;font-size:1.4rem;font-weight:800;background:var(--b,#2B6CB0);color:#fff;box-shadow:0 8px 0 rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation}.fj-pad:active,.fj-pad.hit{transform:translateY(5px);box-shadow:0 3px 0 rgba(0,0,0,.25)}
.fj-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px;width:min(100%,520px)}.fj-grid i{aspect-ratio:1;border-radius:10px;background:rgba(0,0,0,.1);display:grid;place-items:center;font-style:normal;font-weight:800}.fj-grid i.on{background:var(--pizarra,#252528);color:#fff}.fj-grid i.beat{outline:2px solid var(--y,#E3B23C)}
.fj-err li{margin:4px 0}.fj-err{text-align:left;width:100%}
@media (prefers-reduced-motion:reduce){.fj-card:hover,.fj-b:hover{transform:none}}
`;document.head.append(s)}

/* ================= audio ================= */
let AC=null;
function ac(){if(!AC){const C=root.AudioContext||root.webkitAudioContext;if(!C)throw new Error('audio');AC=new C()}if(AC.state==='suspended')AC.resume();return AC}
const mf=m=>440*Math.pow(2,(m-69)/12);
function tono(f,t,dur,vol,tipo){const c=ac(),o=c.createOscillator(),g=c.createGain();o.type=tipo||'triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol||.2,t+.015);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+.05)}
function clic(t,fuerza){const f=fuerza>=1?1500:fuerza>=.55?1050:820;tono(f,t,.07,.12+.28*fuerza,'square')}
function acorde(midis,t,dur,arp){midis.forEach((m,i)=>{const s=t+(arp?i*.38:0);tono(mf(m),s,arp?dur-i*.38+.6:dur,.16,'triangle');tono(mf(m)*2,s,(arp?dur-i*.38+.6:dur)*.6,.04,'sine')})}
function decir(txt,lento){return new Promise(res=>{const S=root.speechSynthesis;if(!S){res(false);return}try{S.cancel();const u=new SpeechSynthesisUtterance(txt);u.lang='en-US';u.rate=lento?.8:.95;const v=S.getVoices().find(x=>/^en[-_]US/i.test(x.lang))||S.getVoices().find(x=>/^en/i.test(x.lang));if(v)u.voice=v;u.onend=()=>res(true);u.onerror=()=>res(false);S.speak(u)}catch(e){res(false)}})}

/* ================= INGLÉS: datos ================= */
const ES_EN=[
/* nivel 1: palabras */
[1,'perro',['dog']],[1,'gato',['cat']],[1,'casa',['house','home']],[1,'agua',['water']],[1,'libro',['book']],[1,'rojo',['red']],[1,'azul',['blue']],[1,'comida',['food']],[1,'amigo',['friend']],[1,'escuela',['school']],
[1,'madre',['mother','mom','mum']],[1,'padre',['father','dad']],[1,'pan',['bread']],[1,'leche',['milk']],[1,'mesa',['table']],[1,'silla',['chair']],[1,'ventana',['window']],[1,'puerta',['door']],[1,'sol',['sun']],[1,'luna',['moon']],
[1,'manzana',['apple']],[1,'ciudad',['city','town']],[1,'hermano',['brother']],[1,'hermana',['sister']],[1,'mano',['hand']],[1,'cabeza',['head']],[1,'feliz',['happy']],[1,'grande',['big','large']],[1,'pequeño',['small','little']],[1,'tiempo',['time','weather']],
/* nivel 2: frases cortas */
[2,'Tengo hambre',['I am hungry']],[2,'¿Dónde está el baño?',['Where is the bathroom','Where is the restroom']],[2,'Me gusta la música',['I like music','I love music']],[2,'Ella es mi hermana',['She is my sister']],[2,'Vivo en Guatemala',['I live in Guatemala']],
[2,'Él trabaja hoy',['He works today','He is working today']],[2,'Tengo dos gatos',['I have two cats']],[2,'Quiero un vaso de agua',['I want a glass of water','I would like a glass of water']],[2,'Estamos en la escuela',['We are at school','We are in school']],[2,'Mi libro es azul',['My book is blue']],
[2,'¿Cómo te llamas?',['What is your name','What are you called']],[2,'Buenos días',['Good morning']],[2,'Hasta luego',['See you later','See you','Bye for now']],[2,'Gracias por tu ayuda',['Thank you for your help','Thanks for your help']],[2,'Hace frío hoy',['It is cold today','It is cold out today']],
[2,'No entiendo',['I do not understand','I do not get it']],[2,'¿Cuánto cuesta?',['How much is it','How much does it cost']],[2,'Estoy cansado',['I am tired']],[2,'Ellos son mis amigos',['They are my friends']],[2,'Me levanto a las seis',['I get up at six','I wake up at six']],
/* nivel 3: oraciones */
[3,'Ayer fui al mercado con mi madre',['Yesterday I went to the market with my mother','I went to the market with my mother yesterday','Yesterday I went to the market with my mom','I went to the market with my mom yesterday']],
[3,'Si tuviera tiempo, estudiaría más',['If I had time, I would study more','If I had time I would study more']],
[3,'Ella ha vivido aquí por cinco años',['She has lived here for five years']],
[3,'Mañana voy a tocar la guitarra',['Tomorrow I am going to play the guitar','I am going to play the guitar tomorrow','Tomorrow I will play the guitar','I will play the guitar tomorrow']],
[3,'Todavía no he terminado mi tarea',['I have not finished my homework yet','I have not finished my homework','I still have not finished my homework']],
[3,'¿Podrías ayudarme con esto?',['Could you help me with this','Can you help me with this','Would you help me with this']],
[3,'Me gustaría aprender a cantar',['I would like to learn to sing','I would like to learn how to sing']],
[3,'Mientras estudiaba, sonó el teléfono',['While I was studying, the phone rang','While I was studying the phone rang','The phone rang while I was studying']],
[3,'Prefiero el té al café',['I prefer tea to coffee','I like tea more than coffee','I prefer tea over coffee']],
[3,'Nunca había visto algo tan bonito',['I had never seen anything so beautiful','I had never seen something so beautiful','I had never seen anything so pretty']]
];
const COMPLETAR=[
[1,'I ___ a student.',['am','is','are'],0],[1,'She ___ a cat.',['has','have','haves'],0],[1,'They ___ happy today.',['are','is','am'],0],[1,'We ___ soccer on Sundays.',['play','plays','playing'],0],[1,'There ___ a book on the table.',['is','are','am'],0],
[1,'He ___ to school every day.',['goes','go','going'],0],[1,'My brother ___ twelve years old.',['is','are','has'],0],[1,'I have two ___.',['dogs','dog','doges'],0],[1,'___ is your name?',['What','Where','Who'],0],[1,'The sun ___ in the east.',['rises','rise','rising'],0],
[2,'She ___ TV when I called her.',['was watching','watched','watches'],0],[2,'I have lived here ___ 2020.',['since','for','from'],0],[2,'If it rains, we ___ at home.',['will stay','stay','stayed'],0],[2,'He is taller ___ his brother.',['than','then','that'],0],[2,'I am interested ___ music.',['in','on','at'],0],
[2,'They ___ to the cinema yesterday.',['went','go','gone'],0],[2,'How ___ water do you drink?',['much','many','few'],0],[2,'She does not have ___ money.',['any','some','a'],0],[2,'I ___ my homework before dinner.',['finished','finish','finishing'],0],[2,'Do you know ___ the bank is?',['where','what','who'],0],
[3,'If I ___ you, I would study more.',['were','was','am'],0],[3,'By next year I ___ finished the course.',['will have','will','have'],0],[3,'She suggested ___ early.',['leaving','to leave','leave'],0],[3,'I wish I ___ more free time.',['had','have','has'],0],[3,'This song ___ by millions of people.',['has been heard','has heard','is hearing'],0],
[3,'Hardly ___ arrived when it started to rain.',['had I','I had','did I'],0],[3,'He denied ___ the window.',['breaking','to break','break'],0],[3,'I would rather you ___ here.',['stayed','stay','staying'],0],[3,'Neither of them ___ ready.',['is','are','were being'],0],[3,'The more you practice, ___ you play.',['the better','better','the best'],0]
];
const LEER=[
[1,'The cat is on the table.'],[1,'I like to drink water.'],[1,'My name is Anna.'],[1,'Good morning, teacher.'],[1,'How are you today?'],[1,'We play music at school.'],[1,'I have a red book.'],[1,'She lives in a big house.'],
[2,'I usually wake up at six in the morning.'],[2,'Where is the nearest bank?'],[2,'My brother plays the guitar very well.'],[2,'Can you help me with my homework?'],[2,'We went to the park yesterday afternoon.'],[2,'She is learning how to sing.'],[2,'The weather is nice today.'],
[3,'The weather is really nice this Thursday.'],[3,'I would like to practice my pronunciation every day.'],[3,'Three thirsty thieves thought about the thick thread.'],[3,'She has been playing the piano since she was a child.'],[3,'Although it was raining, we decided to go for a walk.'],[3,'Could you please repeat that more slowly?']
];
const DIA=[
[1,'Describe your morning: what do you do when you wake up?'],[1,'Write about your family: who lives in your house?'],[1,'Write about your favorite food and why you like it.'],
[2,'What did you do yesterday? Tell me about your day.'],[2,'Describe your favorite place and what you do there.'],[2,'Write about a normal school or work day.'],
[3,'What will you do tomorrow? Describe your plans and why.'],[3,'Describe a day you will remember. What happened and how did you feel?'],[3,'Write about your music or your dreams and what you want to achieve this year.']
];
/* Revisor de errores comunes (reglas): no reemplaza a tu profe, pero encuentra lo más frecuente. */
const IRREG={go:'goes',have:'has',do:'does',say:'says'};
const V3=['go','have','like','want','play','eat','work','live','study','need','love','watch','drink','make','take','get','do','say','read','sleep','wake','listen','practice','sing','write','see','think','know','come','help','use','start','finish','call','walk','run','cook','clean'];
const v3=(v)=>IRREG[v]||(/(s|x|z|ch|sh)$/.test(v)?v+'es':/[^aeiou]y$/.test(v)?v.slice(0,-1)+'ies':v+'s');
const REGLAS=[
 [/\b(he|she|it)\s+(go|have|like|want|play|eat|work|live|study|need|love|watch|drink|make|take|get|do|say|sleep|wake|listen|practice|sing|write|see|think|know|come|help|use|start|finish|call|walk|run|cook|clean)\b/gi,m=>'«'+m[0]+'»: con he/she/it el verbo lleva -s → «'+m[1]+' '+v3(m[2].toLowerCase())+'»'],
 [/\b(i|you|we|they)\s+(goes|has|likes|wants|plays|eats|works|lives|studies|needs|loves|watches|drinks|makes|takes|gets|does|says|reads|sleeps|wakes|listens|sings|writes|sees|thinks|knows|comes|helps|uses|starts|finishes|calls|walks|runs|cooks|cleans)\b/gi,m=>'«'+m[0]+'»: con '+m[1]+' el verbo no lleva -s'],
 [/\bi am agree\b/gi,()=>'«I am agree» → «I agree»'],[/\bmore better\b/gi,()=>'«more better» → «better»'],[/\bi have (\d+) years?\b/gi,m=>'«'+m[0]+'» → «I am '+m[1]+' years old»'],
 [/\b(peoples|childrens|informations|advices|furnitures|homeworks|musics)\b/gi,m=>'«'+m[0]+'» no se usa así (people / children / information / advice / furniture / homework / music)'],
 [/\b(he|she|it)\s+don'?t\b/gi,m=>'«'+m[0]+'» → «'+m[1]+' doesn\'t»'],[/\bi\s+no\s+(like|want|have|know|speak|play)\b/gi,m=>'«'+m[0]+'» → «I don\'t '+m[1]+'»'],
 [/\b(dont|cant|doesnt|didnt|isnt|wont|im|ive|youre|thats|whats)\b/gi,m=>'«'+m[0]+'» necesita apóstrofo (don\'t, can\'t, I\'m…)'],
 [/\ba\s+(?!uni|use|usu|one|once|eu|ur|uk|ut|uv)[aeiou]\w+/gi,m=>'«'+m[0]+'» → antes de vocal se usa «an»'],[/\ban\s+(?!hour|honest|honor|heir)[bcdfgjklmnpqrstvwxz]\w+/gi,m=>'«'+m[0]+'» → antes de consonante se usa «a»'],
 [/\b(depend of|discuss about|explain me|listen the|married with|enter to)\b/gi,m=>'«'+m[0]+'» no es correcto en inglés (depend on, discuss, explain to me, listen to, married to, enter)'],
 [/\byesterday\b[^.!?]*\bi\s+(go|eat|play|have|see|do|make|take|get|watch|study|work)\b/gi,m=>'«yesterday» pide pasado: «'+m[1]+'» → went / ate / played / had / saw / did / made / took / got / watched / studied / worked'],
 [/\b(freind|becuase|definately|wich|recieve|tomorow|diferent|beautifull|studing|writting|realy|wen|thier|exemple|bicicle)\b/gi,m=>'Ortografía: «'+m[0]+'»'],
 [/\bi\b(?=[^a-zA-Z']|$)/g,m=>'«i» debe escribirse con mayúscula: «I»']
];
function revisar(texto){
  const out=[];const t=String(texto||'');
  REGLAS.forEach(([re,msg])=>{re.lastIndex=0;let m,n=0;while((m=re.exec(t))&&n++<5){const hit=m[0];if(re.flags.includes('g')===false)break;
    if(re.source==='\\bi\\b(?=[^a-zA-Z\']|$)'&&hit!=='i')continue;
    out.push(msg(m))}});
  t.split(/(?<=[.!?])\s+/).forEach(s=>{s=s.trim();if(s&&/^[a-z]/.test(s))out.push('Empieza con mayúscula: «'+s.slice(0,28)+(s.length>28?'…':'')+'»')});
  if(t.trim()&&!/[.!?]\s*$/.test(t.trim()))out.push('Termina la última oración con punto.');
  if(/ {2,}/.test(t))out.push('Hay espacios dobles.');
  return [...new Set(out)]}

/* ================= MÚSICA: datos y dibujos ================= */
const CIF=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],SOL=['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];
const TIPOS={maj:{i:[0,4,7],suf:'',es:'mayor'},min:{i:[0,3,7],suf:'m',es:'menor'},'7':{i:[0,4,7,10],suf:'7',es:'séptima'},maj7:{i:[0,4,7,11],suf:'maj7',es:'mayor 7'},m7:{i:[0,3,7,10],suf:'m7',es:'menor 7'},dim:{i:[0,3,6],suf:'dim',es:'disminuido'},aug:{i:[0,4,8],suf:'aug',es:'aumentado'}};
const ncif=r=>CIF[r%12],nsol=r=>SOL[r%12];
const acNombre=(r,t)=>({c:ncif(r)+TIPOS[t].suf,es:nsol(r)+' '+TIPOS[t].es});
const BLANCAS=[0,2,4,5,7,9,11];
/* piano: 2 octavas desde Do4 (MIDI 60) */
function pianoSVG(midis,opts){
  opts=opts||{};const ini=opts.ini||60,nb=opts.blancas||14,W=40,H=150,set=new Set(midis);
  let blancas='',negras='',marcas='';const xs={};let idx=0;
  for(let m=ini;idx<nb;m++){if(BLANCAS.includes(m%12)){xs[m]=idx*W;idx++}}
  const fin=ini+Math.round(nb/7*12);
  Object.keys(xs).forEach(k=>{k=+k;blancas+='<rect x="'+xs[k]+'" y="0" width="'+W+'" height="'+H+'" rx="4" fill="'+(set.has(k)?'#FFE8A3':'#fff')+'" stroke="#252528" stroke-width="1.5"/>';
    if(set.has(k))marcas+='<circle cx="'+(xs[k]+W/2)+'" cy="'+(H-22)+'" r="11" fill="#E3B23C" stroke="#252528" stroke-width="2"/>'});
  for(let m=ini;m<fin+1;m++){if(!BLANCAS.includes(m%12)&&xs[m-1]!=null&&xs[m+1]!=null){const x=xs[m-1]+W-12;negras+='<rect x="'+x+'" y="0" width="24" height="'+(H*.62)+'" rx="3" fill="'+(set.has(m)?'#B8860B':'#252528')+'"/>';if(set.has(m))marcas+='<circle cx="'+(x+12)+'" cy="'+(H*.62-14)+'" r="9" fill="#E3B23C" stroke="#fff" stroke-width="2"/>'}}
  return svg(nb*W,H,blancas+negras+marcas,opts.label||'Teclado de piano con las teclas marcadas')}
/* diagrama de acorde: cuerdas de grave a aguda, trastes 0 (al aire), -1 (no se toca) */
function trasteSVG(fr,etq){
  const n=fr.length,sp=n===6?28:34,W=sp*(n-1)+60,Hh=190,x0=30,y0=40,fh=30;let s='';
  for(let i=0;i<n;i++)s+='<line x1="'+(x0+i*sp)+'" y1="'+y0+'" x2="'+(x0+i*sp)+'" y2="'+(y0+5*fh)+'" stroke="#252528" stroke-width="2"/>';
  for(let j=0;j<=5;j++)s+='<line x1="'+x0+'" y1="'+(y0+j*fh)+'" x2="'+(x0+(n-1)*sp)+'" y2="'+(y0+j*fh)+'" stroke="#252528" stroke-width="'+(j===0?6:2)+'"/>';
  fr.forEach((f,i)=>{const x=x0+i*sp;if(f===-1)s+='<text x="'+x+'" y="'+(y0-12)+'" text-anchor="middle" font-size="18" font-weight="700" fill="#252528">×</text>';else if(f===0)s+='<circle cx="'+x+'" cy="'+(y0-16)+'" r="7" fill="none" stroke="#252528" stroke-width="2"/>';else s+='<circle cx="'+x+'" cy="'+(y0+(f-.5)*fh)+'" r="11" fill="#E3B23C" stroke="#252528" stroke-width="2"/>'});
  for(let j=1;j<=5;j++)s+='<text x="'+(x0+(n-1)*sp+16)+'" y="'+(y0+(j-.5)*fh+5)+'" font-size="11" fill="#252528" opacity=".5">'+j+'</text>';
  return svg(W+10,Hh,s,etq||'Diagrama del mástil con el acorde')}
/* mástil horizontal con un punto: cuerdas de grave (abajo) a aguda (arriba) */
function mastilSVG(cuerda,traste,nc,nt){
  const W=640,Hh=40+nc*30,x0=50,fw=(W-x0-20)/nt;let s='';
  for(let i=0;i<nc;i++)s+='<line x1="'+x0+'" y1="'+(30+(nc-1-i)*30)+'" x2="'+(W-20)+'" y2="'+(30+(nc-1-i)*30)+'" stroke="#252528" stroke-width="'+(1+ (nc===6?(6-i)*.25:(4-i)*.4))+'"/>';
  for(let j=0;j<=nt;j++)s+='<line x1="'+(x0+j*fw)+'" y1="30" x2="'+(x0+j*fw)+'" y2="'+(30+(nc-1)*30)+'" stroke="#252528" stroke-width="'+(j===0?6:2)+'"/>';
  [3,5,7,9,12].forEach(j=>{if(j<=nt)s+='<text x="'+(x0+(j-.5)*fw)+'" y="'+(30+(nc-1)*30+22)+'" text-anchor="middle" font-size="11" fill="#252528" opacity=".5">'+j+'</text>'});
  const cx=traste===0?x0-18:x0+(traste-.5)*fw,cy=30+(nc-1-cuerda)*30;
  s+='<circle cx="'+cx+'" cy="'+cy+'" r="11" fill="#E3B23C" stroke="#252528" stroke-width="2"/>';
  return svg(W,Hh+10,s,'Mástil con una nota marcada')}
/* formas de acorde (cuerdas de grave a aguda) */
const FORMAS_GUIT=[
 [1,0,'maj',[-1,3,2,0,1,0]],[1,2,'maj',[-1,-1,0,2,3,2]],[1,4,'maj',[0,2,2,1,0,0]],[1,7,'maj',[3,2,0,0,0,3]],[1,9,'maj',[-1,0,2,2,2,0]],[1,9,'min',[-1,0,2,2,1,0]],[1,2,'min',[-1,-1,0,2,3,1]],[1,4,'min',[0,2,2,0,0,0]],
 [2,0,'7',[-1,3,2,3,1,0]],[2,7,'7',[3,2,0,0,0,1]],[2,2,'7',[-1,-1,0,2,1,2]],[2,4,'7',[0,2,0,1,0,0]],[2,9,'7',[-1,0,2,0,2,0]],[2,11,'7',[-1,2,1,2,0,2]],[2,5,'maj',[1,3,3,2,1,1]],
 [3,0,'maj7',[-1,3,2,0,0,0]],[3,5,'maj7',[-1,-1,3,2,1,0]],[3,2,'maj7',[-1,-1,0,2,2,2]],[3,7,'maj7',[3,2,0,0,0,2]],[3,9,'m7',[-1,0,2,0,1,0]],[3,2,'m7',[-1,-1,0,2,1,1]],[3,4,'m7',[0,2,0,0,0,0]]
];
const FORMAS_UKE=[
 [1,0,'maj',[0,0,0,3]],[1,5,'maj',[2,0,1,0]],[1,7,'maj',[0,2,3,2]],[1,9,'min',[2,0,0,0]],[1,2,'min',[2,2,1,0]],[1,4,'min',[0,4,3,2]],
 [2,0,'7',[0,0,0,1]],[2,7,'7',[0,2,1,2]],[2,9,'maj',[2,1,0,0]],[2,2,'maj',[2,2,2,0]],[2,9,'7',[0,1,0,0]],
 [3,4,'maj',[4,4,4,2]],[3,11,'min',[4,2,2,2]],[3,0,'maj7',[0,0,0,2]]
];

/* ================= motor de partidas ================= */
function engine(box,ctx,cfg){
  let vivo=true,lvl=Math.max(1,Math.min(3,ctx.lvl)),ok=0,n=0,racha=0;const usados=new Set();
  const total=cfg.total||8;
  const barra=h('i'),zona=h('div',{class:'fj-box'}),cab=h('div',{class:'fj-meta'});
  const top=h('div',{class:'fj-top'},h('h2',{},cfg.titulo),h('button',{class:'fj-chip',type:'button',onclick:()=>{vivo=false;cfg.limpiar&&cfg.limpiar();ctx.volver()}},'← Juegos'));
  box.replaceChildren(top,h('div',{class:'fj-bar'},barra),cab,zona);
  const meta=()=>{barra.style.width=Math.round(n/total*100)+'%';cab.textContent='Pregunta '+Math.min(n+1,total)+' de '+total+' · Aciertos: '+ok+' · Nivel '+lvl};
  /* ayudas para cada ronda */
  const H={
    nuevo(arr){const libres=arr.filter(x=>!usados.has(x));const x=pickOne(libres.length?libres:arr);usados.add(x);return x},
    fb(z,bien,msg,espera){z.querySelectorAll('button,input').forEach(b=>b.disabled=true);
      z.append(h('div',{class:'fj-fb '+(bien?'ok':'no'),role:'status'},(bien?'¡Correcto! ':'Casi. ')+(msg||'')));
      if(bien&&!msg)return sleep(espera||750);
      return new Promise(res=>{const b=h('button',{class:'fj-b y',type:'button',onclick:()=>res()},'Siguiente →');z.append(b);b.focus()})}};
  (async()=>{
    meta();
    try{
      if(cfg.antes){const sigue=await cfg.antes(zona);if(!sigue||!vivo)return}
      for(n=0;n<total&&vivo;){
        meta();zona.replaceChildren();
        const bien=await cfg.ronda(zona,lvl,n,H,()=>vivo);
        if(!vivo)return;
        n++;if(bien){ok++;racha++;if(racha>=2&&lvl<3){lvl++;racha=0}}else{racha=0;if(lvl>1)lvl--}
      }
      meta();if(!vivo)return;
      const xp=cfg.xp?cfg.xp(ok,total):Math.min(8,ok);
      zona.replaceChildren(h('div',{class:'fj-q'},ok+' de '+total+' aciertos'),h('p',{class:'fj-sub',id:'fj-xp'},'Guardando tu XP…'));
      const r=await ctx.onXP(cfg.fuente,xp,ok);
      const p=zona.querySelector('#fj-xp');
      if(p)p.textContent=r&&r.error?'No pudimos guardar tu XP ahora. Intenta de nuevo más tarde.':r&&r.dado>0?'¡Ganaste +'+r.dado+' XP!'+(r.tope?' (llegaste al tope de hoy en este juego)':''):'Hoy ya llegaste al tope de XP en este juego. ¡Sigue practicando!';
      zona.append(h('div',{class:'fj-chips'},h('button',{class:'fj-b y',type:'button',onclick:()=>ctx.jugar(cfg.id)},'Jugar otra vez'),h('button',{class:'fj-b',type:'button',onclick:()=>ctx.volver()},'Volver a los juegos')))
    }catch(e){if(vivo)zona.replaceChildren(h('p',{class:'fj-sub'},'Algo falló en este juego: '+(e&&e.message==='audio'?'tu navegador no permite sonido aquí.':'intenta de nuevo.')),h('button',{class:'fj-b',type:'button',onclick:()=>ctx.volver()},'Volver'))}
  })();
  return{stop(){vivo=false;cfg.limpiar&&cfg.limpiar();try{root.speechSynthesis&&root.speechSynthesis.cancel()}catch(e){}}}}
function botones(z,opciones,onPick,cls){
  const w=h('div',{class:'fj-opts'});opciones.forEach(o=>{const txt=typeof o==='string'?o:o.t;const b=h('button',{class:'fj-b '+(cls||''),type:'button',onclick:()=>onPick(o,b)},txt,o.s?h('small',{},o.s):null);w.append(b)});z.append(w);return w}

/* ================= los 10 juegos ================= */
const JUEGOS={};

/* --- inglés 1: traductor escrito --- */
JUEGOS['ing-traductor']={area:'ingles',titulo:'Traductor escrito',desc:'Mira la palabra o frase en español y escríbela en inglés.',ic:['Aa','#2B6CB0'],
 run(box,ctx){return engine(box,ctx,{id:'ing-traductor',fuente:'ing-traductor',titulo:'Traductor escrito',ctx,
  ronda:async(z,lvl,n,H)=>{
   const it=H.nuevo(ES_EN.filter(x=>x[0]===lvl));
   const inp=h('input',{class:'fj-in',type:'text',autocomplete:'off',autocapitalize:'off',spellcheck:'false','aria-label':'Tu traducción al inglés'});
   let sale;const p=new Promise(r=>sale=r);
   const ver=()=>{const v=norm(inp.value);if(!v)return;const oks=it[2].map(norm);
     if(oks.includes(v))sale([true,'']);else if(v.length>=5&&oks.some(o=>lev(o,v)<=1))sale([true,'Casi perfecto: se escribe «'+it[2][0]+'».']);else sale([false,'Se dice: «'+it[2][0]+'».'])};
   inp.addEventListener('keydown',e=>{if(e.key==='Enter')ver()});
   z.append(h('div',{class:'fj-sub'},'Escríbelo en inglés'),h('div',{class:'fj-q'},it[1]),inp,h('button',{class:'fj-b y',type:'button',onclick:ver},'Comprobar'));inp.focus();
   const [bien,msg]=await p;await H.fb(z,bien,msg);return bien}})}};

/* --- inglés 2: traductor auditivo --- */
JUEGOS['ing-escucha']={area:'ingles',titulo:'Traductor auditivo',desc:'Escucha en inglés y elige qué significa en español.',ic:['))','#3FA7A3'],
 run(box,ctx){
  if(!root.speechSynthesis){box.replaceChildren(h('div',{class:'fj-box'},h('p',{},'Este navegador no puede leer en voz alta. Abre el portal desde Chrome, Edge o Safari.'),h('button',{class:'fj-b',type:'button',onclick:ctx.volver},'Volver')));return{stop(){}}}
  return engine(box,ctx,{id:'ing-escucha',fuente:'ing-escucha',titulo:'Traductor auditivo',
  ronda:async(z,lvl,n,H)=>{
   const it=H.nuevo(ES_EN.filter(x=>x[0]===lvl)),malas=shuffle(ES_EN.filter(x=>x[0]===lvl&&x!==it)).slice(0,3);
   const op=shuffle([it].concat(malas));let sale;const p=new Promise(r=>sale=r);
   const oir=()=>decir(it[2][0],lvl===1);
   z.append(h('div',{class:'fj-sub'},'Escucha y elige el significado'),h('button',{class:'fj-b y',type:'button',onclick:oir,style:'font-size:1.2rem;padding:16px 24px'},'🔊 Escuchar otra vez'));
   const w=botones(z,op.map(o=>({t:o[1],o})),(o,b)=>{w.querySelectorAll('button').forEach(x=>x.disabled=true);const bien=o.o===it;b.classList.add(bien?'ok':'no');sale([bien,bien?'':'Era «'+it[2][0]+'» = «'+it[1]+'».'])});
   oir();const [bien,msg]=await p;await H.fb(z,bien,msg);return bien}})}};

/* --- inglés 3: completar la frase --- */
JUEGOS['ing-completar']={area:'ingles',titulo:'Completa la frase',desc:'Elige la palabra que completa bien la oración.',ic:['___','#7BB662'],
 run(box,ctx){return engine(box,ctx,{id:'ing-completar',fuente:'ing-completar',titulo:'Completa la frase',
  ronda:async(z,lvl,n,H)=>{
   const it=H.nuevo(COMPLETAR.filter(x=>x[0]===lvl)),ok=it[2][it[3]],op=shuffle(it[2]);let sale;const p=new Promise(r=>sale=r);
   z.append(h('div',{class:'fj-sub'},'Completa la oración'),h('div',{class:'fj-q'},it[1]));
   const w=botones(z,op,(o,b)=>{w.querySelectorAll('button').forEach(x=>x.disabled=true);const bien=o===ok;b.classList.add(bien?'ok':'no');sale([bien,bien?'':'Va «'+ok+'»: '+it[1].replace('___',ok)])});
   const [bien,msg]=await p;await H.fb(z,bien,msg);return bien}})}};

/* --- inglés 4: lee y pronuncia (reconocimiento de voz del navegador) --- */
JUEGOS['ing-pronunciar']={area:'ingles',titulo:'Lee y pronuncia',desc:'Lee la frase en voz alta: el micrófono comprueba cómo la dijiste.',ic:['“ ”','#E3B23C'],
 run(box,ctx){
  const SR=root.SpeechRecognition||root.webkitSpeechRecognition;
  if(!SR){box.replaceChildren(h('div',{class:'fj-box'},h('p',{},'Este navegador no reconoce la voz. Abre el portal desde Chrome o Edge (en computadora o Android) para jugar este juego.'),h('button',{class:'fj-b',type:'button',onclick:ctx.volver},'Volver')));return{stop(){}}}
  let rec=null;
  return engine(box,ctx,{id:'ing-pronunciar',fuente:'ing-pronunciar',titulo:'Lee y pronuncia',total:6,limpiar(){try{rec&&rec.abort()}catch(e){}},
  ronda:async(z,lvl,n,H,vivo)=>{
   const it=H.nuevo(LEER.filter(x=>x[0]===lvl)),meta=norm(it[1]).split(' ');let sale;const p=new Promise(r=>sale=r);
   const frase=h('div',{class:'fj-q'},it[1]),res=h('div',{class:'fj-words'}),msg=h('div',{class:'fj-sub',role:'status'},'');
   const hablar=h('button',{class:'fj-b y',type:'button'},'🎤 Hablar'),oir=h('button',{class:'fj-b',type:'button',onclick:()=>decir(it[1],true)},'🔊 Escuchar modelo'),sig=h('button',{class:'fj-b',type:'button',onclick:()=>sale(false)},'Saltar');
   z.append(h('div',{class:'fj-sub'},'Lee en voz alta'),frase,h('div',{class:'fj-chips'},oir,hablar,sig),msg,res);
   hablar.onclick=()=>{
     try{rec=new SR();rec.lang='en-US';rec.interimResults=false;rec.maxAlternatives=3;rec.continuous=false}catch(e){msg.textContent='No se pudo abrir el reconocimiento de voz.';return}
     hablar.disabled=true;hablar.textContent='🎤 Te escucho…';msg.textContent='';
     rec.onresult=ev=>{
       const alts=[...ev.results[0]].map(a=>norm(a.transcript));let mejor=null;
       alts.forEach(t=>{const pal=t.split(' ');const bolsa=pal.slice();const marca=meta.map(w=>{const i=bolsa.indexOf(w);if(i>-1){bolsa.splice(i,1);return true}return false});const r=marca.filter(Boolean).length/meta.length;if(!mejor||r>mejor.r)mejor={r,marca,t}});
       res.replaceChildren(...meta.map((w,i)=>h('span',{class:mejor.marca[i]?'ok':'no'},w)));
       const bien=mejor.r>=.8;msg.textContent='Entendimos: «'+mejor.t+'» · '+Math.round(mejor.r*100)+'%';
       if(bien)sale(true);else{hablar.disabled=false;hablar.textContent='🎤 Intentar de nuevo';msg.textContent+=' — marcadas en rojo las palabras que no se entendieron. Intenta otra vez o salta.'}};
     rec.onerror=e=>{hablar.disabled=false;hablar.textContent='🎤 Hablar';msg.textContent=e.error==='not-allowed'||e.error==='service-not-allowed'?'Activa el permiso del micrófono (candado de la barra de direcciones) y vuelve a intentar.':e.error==='no-speech'?'No te escuchamos. Acércate al micrófono e intenta otra vez.':'No se pudo entender. Intenta otra vez.'};
     rec.onend=()=>{if(hablar.disabled&&vivo()){hablar.disabled=false;hablar.textContent='🎤 Hablar'}};
     try{rec.start()}catch(e){hablar.disabled=false}};
   const bien=await p;try{rec&&rec.abort()}catch(e){}await H.fb(z,bien,bien?'':'Te dejamos la frase para repasarla: «'+it[1]+'»');return bien}})}};

/* --- inglés 5: escribe sobre tu día (revisión de errores comunes) --- */
JUEGOS['ing-escribir']={area:'ingles',titulo:'Escribe sobre tu día',desc:'Escribe un párrafo en inglés y recibe una revisión de tus errores.',ic:['✎','#B388EB'],
 run(box,ctx){
  let vivo=true,pagado=false;const lvl=ctx.lvl,min=[0,12,20,35][lvl],tema=pickOne(DIA.filter(x=>x[0]===lvl))[1];
  const ta=h('textarea',{class:'fj-in',placeholder:'Write here in English…',spellcheck:'false','aria-label':'Tu texto en inglés'}),cont=h('div',{class:'fj-sub'},'0 palabras · mínimo '+min),res=h('div',{class:'fj-box',style:'display:none'});
  const palabras=()=>(ta.value.trim().match(/[A-Za-zÀ-ÿ']+/g)||[]).length;
  ta.addEventListener('input',()=>{cont.textContent=palabras()+' palabras · mínimo '+min});
  const rev=h('button',{class:'fj-b y',type:'button',onclick:async()=>{
    const w=palabras();if(w<min){res.style.display='';res.replaceChildren(h('p',{},'Escribe al menos '+min+' palabras para ganar XP. Llevas '+w+'.'));return}
    const er=revisar(ta.value),xp=4+(er.length===0?4:er.length<=2?2:er.length<=4?1:0);
    res.style.display='';res.replaceChildren(h('div',{class:'fj-q'},er.length?er.length+' cosa'+(er.length>1?'s':'')+' para corregir':'¡Sin errores comunes!'),
      er.length?h('ul',{class:'fj-err'},er.map(x=>h('li',{},x))):h('p',{class:'fj-sub'},'¡Muy bien escrito!'),
      h('p',{class:'fj-sub'},'Esta revisión busca los errores más frecuentes; tu profe puede ver más detalles.'),h('p',{class:'fj-sub',id:'fj-xp'},pagado?'Ya recibiste el XP de este texto. Puedes corregirlo y volver a revisar.':'Guardando tu XP…'));
    if(!pagado){pagado=true;const r=await ctx.onXP('ing-escribir',xp,w);const p=res.querySelector('#fj-xp');if(p&&vivo)p.textContent=r&&r.error?'No pudimos guardar tu XP ahora.':r&&r.dado>0?'¡Ganaste +'+r.dado+' XP!':'Hoy ya llegaste al tope de XP en este juego.'}}},'Revisar mi texto');
  box.replaceChildren(h('div',{class:'fj-top'},h('h2',{},'Escribe sobre tu día'),h('button',{class:'fj-chip',type:'button',onclick:()=>{vivo=false;ctx.volver()}},'← Juegos')),h('div',{class:'fj-box'},h('div',{class:'fj-q'},tema),ta,cont,rev),res);
  return{stop(){vivo=false}}}};

/* --- música 1: identificador de acordes (según el instrumento) --- */
JUEGOS['mus-acordes']={area:'musica',titulo:'Identifica el acorde',desc:'Mira el acorde en tu instrumento (piano, guitarra o ukelele) y di cuál es.',ic:['C△','#EE964B'],
 run(box,ctx){
  let vista=ctx.vistaAcorde;
  const eng=engine(box,ctx,{id:'mus-acordes',fuente:'mus-acordes',titulo:'Identifica el acorde',
  ronda:async(z,lvl,n,H)=>{
   let q,pool;
   if(vista==='piano'){
    const roots=lvl===1?[0,2,5,7,9]:lvl===2?[0,2,4,5,7,9,11]:[0,1,2,3,4,5,6,7,8,9,10,11],tipos=lvl===1?['maj','min']:lvl===2?['maj','min','7']:['maj','min','7','maj7','m7','dim','aug'];
    pool=[];roots.forEach(r=>tipos.forEach(t=>pool.push([r,t])));
    const [r,t]=H.nuevo(pool);let notas=TIPOS[t].i.map(i=>60+r+i);const inv=lvl===3?rnd(notas.length):0;for(let k=0;k<inv;k++)notas.push(notas.shift()+12);if(Math.max(...notas)>83)notas=notas.map(x=>x-12);
    q={r,t,vis:pianoSVG(notas,{label:'Teclado con las notas de un acorde'})}}
   else{
    const formas=(vista==='guitarra'?FORMAS_GUIT:FORMAS_UKE).filter(f=>f[0]<=lvl);pool=formas.map(f=>[f[1],f[2]]);
    const f=H.nuevo(formas);q={r:f[1],t:f[2],vis:trasteSVG(f[3],'Diagrama de un acorde en '+vista)}}
   const clave=x=>x[0]+'-'+x[1],ans=clave([q.r,q.t]);
   const dist=shuffle(pool.filter(x=>clave(x)!==ans)).slice(0,3),op=shuffle([[q.r,q.t]].concat(dist)).map(x=>{const a=acNombre(x[0],x[1]);return{t:a.c,s:a.es,k:clave(x)}});
   let sale;const p=new Promise(r=>sale=r);
   z.append(h('div',{class:'fj-sub'},'¿Qué acorde es?'),q.vis);
   const w=botones(z,op,(o,b)=>{w.querySelectorAll('button').forEach(x=>x.disabled=true);const bien=o.k===ans;b.classList.add(bien?'ok':'no');sale([bien,bien?'':'Es '+acNombre(q.r,q.t).c+' ('+acNombre(q.r,q.t).es+').'])});
   const [bien,msg]=await p;await H.fb(z,bien,msg);return bien}});
  /* selector de instrumento: reinicia la partida */
  const sel=h('div',{class:'fj-chips'},...[['piano','Piano'],['guitarra','Guitarra'],['ukelele','Ukelele']].map(([v,t])=>h('button',{class:'fj-chip',type:'button','aria-pressed':String(v===vista),onclick:()=>{ctx.vistaAcorde=v;eng.stop();ctx.jugar('mus-acordes')}},t)));
  box.prepend(sel);return eng}};

/* --- música 2: identificador de compás (de oído) --- */
const COMPASES={'2/4':{p:[1,.3],t:.55},'3/4':{p:[1,.3,.3],t:.55},'4/4':{p:[1,.3,.6,.3],t:.5},'6/8':{p:[1,.25,.25,.7,.25,.25],t:.27},'5/4':{p:[1,.3,.3,.6,.3],t:.5},'7/8':{p:[1,.25,.6,.25,.6,.25,.25],t:.27},'12/8':{p:[1,.2,.2,.6,.2,.2,.6,.2,.2,.6,.2,.2],t:.22}};
JUEGOS['mus-compas']={area:'musica',titulo:'Identifica el compás',desc:'Escucha el pulso (el 1 suena más fuerte) y di en qué compás está.',ic:['3/4','#4EA5D9'],
 run(box,ctx){let ultimo=null;return engine(box,ctx,{id:'mus-compas',fuente:'mus-compas',titulo:'Identifica el compás',
  ronda:async(z,lvl,n,H)=>{
   const lista=lvl===1?['2/4','3/4','4/4']:lvl===2?['2/4','3/4','4/4','6/8']:Object.keys(COMPASES),cp=H.nuevo(lista.filter(x=>x!==ultimo).length?lista.filter(x=>x!==ultimo):lista);ultimo=cp;
   const d=COMPASES[cp];let sale;const p=new Promise(r=>sale=r);
   const oir=()=>{const c=ac(),t0=c.currentTime+.1,bars=cp==='12/8'||cp==='7/8'?2:3;for(let b=0;b<bars;b++)d.p.forEach((v,i)=>clic(t0+(b*d.p.length+i)*d.t,v))};
   z.append(h('div',{class:'fj-sub'},'Escucha el pulso y cuenta cuándo suena el golpe fuerte'),h('button',{class:'fj-b y',type:'button',onclick:oir,style:'font-size:1.2rem;padding:16px 24px'},'▶ Escuchar'));
   const w=botones(z,(lvl===1?['2/4','3/4','4/4']:lvl===2?['2/4','3/4','4/4','6/8']:['2/4','3/4','4/4','6/8','5/4','7/8','12/8']),(o,b)=>{w.querySelectorAll('button').forEach(x=>x.disabled=true);const bien=o===cp;b.classList.add(bien?'ok':'no');sale([bien,bien?'':'Era '+cp+'.'])});
   oir();const [bien,msg]=await p;await H.fb(z,bien,msg);return bien}})}};

/* --- música 3: patrón rítmico (escucha y toca) --- */
const PATRONES={1:[[1,0,1,0,1,0,1,0],[1,0,0,0,1,0,1,0],[1,0,1,0,1,0,0,0],[1,0,0,0,1,0,0,0],[1,0,1,0,0,0,1,0]],
 2:[[1,1,1,0,1,1,1,0],[1,0,1,1,1,0,1,1],[1,1,1,1,1,0,1,0],[1,0,1,1,1,1,1,0],[1,1,1,0,1,0,1,1]],
 3:[[1,0,0,1,0,0,1,0],[1,0,1,0,0,1,0,1],[0,1,1,0,1,0,1,1],[1,0,0,1,0,1,0,0],[1,1,0,1,0,1,1,0]]};
JUEGOS['mus-ritmo']={area:'musica',titulo:'Patrón rítmico',desc:'Escucha el ritmo, y repítelo tocando el pad (o la barra espaciadora) a tiempo.',ic:['♩♪','#F95738'],
 run(box,ctx){let pad=null,tecla=null;const E=0.4;   // corchea = 0.4 s (75 bpm)
  const eng=engine(box,ctx,{id:'mus-ritmo',fuente:'mus-ritmo',titulo:'Patrón rítmico',total:6,limpiar(){if(tecla)document.removeEventListener('keydown',tecla)},
  ronda:async(z,lvl,n,H)=>{
   const pat=H.nuevo(PATRONES[lvl]),objetivo=pat.map((v,i)=>v?i:-1).filter(i=>i>=0);let sale;const p=new Promise(r=>sale=r);
   const celdas=pat.map((v,i)=>h('i',{class:(v?'on ':'')+(i%2===0?'beat':'')},v?'●':'·'));
   const msg=h('div',{class:'fj-sub',role:'status'},'1 y 2 y 3 y 4 y');let tocando=false;
   const cuenta=(t0)=>{for(let i=0;i<4;i++)clic(t0+i*2*E,i===0?1:.5)};
   const oir=()=>{if(tocando)return;const c=ac(),t0=c.currentTime+.15;cuenta(t0);pat.forEach((v,i)=>{if(v)tono(330,t0+8*E+i*E,.18,.3,'triangle')})};
   const tocar=()=>{if(tocando)return;tocando=true;const c=ac(),t0=c.currentTime+.15,barra=t0+8*E,taps=[];cuenta(t0);for(let i=0;i<4;i++)clic(barra+i*2*E,.25);
     msg.textContent='Cuenta 1-2-3-4… ¡y toca!';
     const tap=()=>{const t=c.currentTime;if(t>barra-.45&&t<barra+8*E+.3){taps.push(t);padB.classList.add('hit');setTimeout(()=>padB.classList.remove('hit'),90);tono(330,t,.16,.3,'triangle')}};
     pad=tap;tecla=e=>{if(e.code==='Space'&&!e.repeat&&!/INPUT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();tap()}};document.addEventListener('keydown',tecla);
     const fin=setInterval(()=>{if(c.currentTime>barra+8*E+.35){clearInterval(fin);document.removeEventListener('keydown',tecla);tecla=null;pad=null;
       const tol=lvl===3?.17:.2,usados=new Set();let aciertos=0;objetivo.forEach(i=>{const T=barra+i*E;let mejor=-1,md=1;taps.forEach((t,k)=>{const dd=Math.abs(t-T);if(!usados.has(k)&&dd<md&&dd<=tol){md=dd;mejor=k}});if(mejor>-1){usados.add(mejor);aciertos++}});
       const extras=taps.length-aciertos,bien=aciertos>=objetivo.length-(lvl===3?1:0)&&extras<=1;sale([bien,aciertos+' de '+objetivo.length+' golpes a tiempo'+(extras>1?' · '+extras+' golpes de más':'')+(bien?'':'. Escucha de nuevo y cuenta con calma.')])}},60)};
   const padB=h('button',{class:'fj-pad',type:'button','aria-label':'Tocar',onpointerdown:e=>{e.preventDefault();pad&&pad()}},'TOCA');
   z.append(h('div',{class:'fj-sub'},'Escucha el patrón y luego repítelo'),h('div',{class:'fj-grid'},celdas),msg,h('div',{class:'fj-chips'},h('button',{class:'fj-b',type:'button',onclick:oir},'▶ Escuchar'),h('button',{class:'fj-b y',type:'button',onclick:tocar},'🥁 Tocar yo')),padB);
   const [bien,m]=await p;await H.fb(z,bien,m);return bien}});
  return eng}};

/* --- música 4: mayor o menor --- */
JUEGOS['mus-mayormenor']={area:'musica',titulo:'Mayor o menor',desc:'Escucha el sonido y decide si es mayor (alegre) o menor (triste).',ic:['M/m','#B388EB'],
 run(box,ctx){return engine(box,ctx,{id:'mus-mayormenor',fuente:'mus-mayormenor',titulo:'Mayor o menor',
  ronda:async(z,lvl,n,H)=>{
   const mayor=Math.random()<.5,r=lvl===1?55+rnd(8):lvl===2?48+rnd(18):50+rnd(14);let sale;const p=new Promise(rr=>sale=rr);
   const oir=()=>{const c=ac(),t0=c.currentTime+.1;
     if(lvl===3){const esc=mayor?[0,2,4,5,7]:[0,2,3,5,7];esc.forEach((i,k)=>tono(mf(r+i),t0+k*.42,.5,.22,'triangle'))}
     else{let notas=(mayor?[0,4,7]:[0,3,7]).map(i=>r+i);if(lvl===2){const inv=rnd(3);for(let k=0;k<inv;k++)notas.push(notas.shift()+12);acorde(notas,t0,1.3,false)}else acorde(notas,t0,2.2,true)}};
   z.append(h('div',{class:'fj-sub'},lvl===3?'Escucha la escala':'Escucha el acorde'),h('button',{class:'fj-b y',type:'button',onclick:oir,style:'font-size:1.2rem;padding:16px 24px'},'▶ Escuchar'));
   const w=botones(z,[{t:'Mayor',s:'alegre, brillante',v:true},{t:'Menor',s:'triste, oscuro',v:false}],(o,b)=>{w.querySelectorAll('button').forEach(x=>x.disabled=true);const bien=o.v===mayor;b.classList.add(bien?'ok':'no');sale([bien,bien?'':'Era '+(mayor?'mayor':'menor')+'.'])});
   oir();const [bien,msg]=await p;await H.fb(z,bien,msg);return bien}})}};

/* --- música 5: identifica la nota (1 minuto) --- */
JUEGOS['mus-notas']={area:'musica',titulo:'Identifica la nota',desc:'Una nota marcada en el piano, guitarra o bajo: dile su nombre. ¡Tienes 1 minuto!',ic:['Do','#7BB662'],
 run(box,ctx){
  let vivo=true,timer=0,vista=ctx.vistaNota,punt=0,fallos=0,restan=60,nota=null,lvl=Math.max(1,ctx.lvl),listo=false;
  const ABIERTAS={guitarra:[40,45,50,55,59,64],bajo:[28,33,38,43]};
  const zona=h('div',{class:'fj-box'}),meta=h('div',{class:'fj-meta'});
  const top=h('div',{class:'fj-top'},h('h2',{},'Identifica la nota'),h('button',{class:'fj-chip',type:'button',onclick:()=>{vivo=false;clearInterval(timer);ctx.volver()}},'← Juegos'));
  const sel=h('div',{class:'fj-chips'},...[['piano','Piano'],['guitarra','Guitarra'],['bajo','Bajo']].map(([v,t])=>h('button',{class:'fj-chip',type:'button','aria-pressed':String(v===vista),onclick:()=>{ctx.vistaNota=v;vivo=false;clearInterval(timer);ctx.jugar('mus-notas')}},t)));
  box.replaceChildren(top,sel,meta,zona);
  const nueva=()=>{
    const nat=[0,2,4,5,7,9,11],pcs=lvl===1?nat:[0,1,2,3,4,5,6,7,8,9,10,11];let m,vis;
    if(vista==='piano'){do{m=60+pickOne(pcs)+(lvl>=2?12*rnd(2):0)}while(nota&&m===nota.m);vis=pianoSVG([m],{label:'Teclado con una tecla marcada'})}
    else{const ab=ABIERTAS[vista],nt=lvl===1?5:lvl===2?9:12;let c,t;do{c=rnd(ab.length);t=rnd(nt+1);m=ab[c]+t}while((lvl===1&&!nat.includes(m%12))||(nota&&m===nota.m&&0));vis=mastilSVG(c,t,ab.length,nt)}
    nota={m};return vis};
  const pintar=()=>{
    if(!listo||!vivo)return;zona.replaceChildren();const vis=nueva();zona.append(h('div',{class:'fj-sub'},'¿Qué nota es?'),vis);
    const nombres=lvl===1?[0,2,4,5,7,9,11]:[0,1,2,3,4,5,6,7,8,9,10,11];
    botones(zona,nombres.map(i=>({t:SOL[i],s:CIF[i],i})),(o,b)=>{if(!vivo||!listo)return;if(o.i===nota.m%12){punt++;if(punt%4===0&&lvl<3)lvl++;b.classList.add('ok');setTimeout(pintar,160)}else{fallos++;b.classList.add('no');setTimeout(pintar,420)}pintaMeta()})};
  const pintaMeta=()=>{meta.textContent='⏱ '+restan+' s · Aciertos: '+punt+' · Fallos: '+fallos+' · Nivel '+lvl};
  const arranca=()=>{listo=true;pintaMeta();pintar();timer=setInterval(async()=>{restan--;pintaMeta();if(restan<=0){clearInterval(timer);listo=false;if(!vivo)return;
    const xp=Math.min(12,Math.ceil(punt/2));zona.replaceChildren(h('div',{class:'fj-q'},punt+' notas en 1 minuto'),h('p',{class:'fj-sub',id:'fj-xp'},'Guardando tu XP…'));
    const r=await ctx.onXP('mus-notas',xp,punt);const p=zona.querySelector('#fj-xp');
    if(p&&vivo)p.textContent=r&&r.error?'No pudimos guardar tu XP ahora.':r&&r.dado>0?'¡Ganaste +'+r.dado+' XP!':'Hoy ya llegaste al tope de XP en este juego.';
    zona.append(h('div',{class:'fj-chips'},h('button',{class:'fj-b y',type:'button',onclick:()=>ctx.jugar('mus-notas')},'Jugar otra vez'),h('button',{class:'fj-b',type:'button',onclick:ctx.volver},'Volver a los juegos')))}},1000)};
  zona.append(h('div',{class:'fj-q'},'Tienes 1 minuto'),h('p',{class:'fj-sub'},'Se marcará una nota. Toca su nombre lo más rápido que puedas. Mientras más aciertes, más XP.'),h('button',{class:'fj-b y',type:'button',onclick:arranca},'¡Empezar!'));
  return{stop(){vivo=false;clearInterval(timer)}}}};

/* ================= menú ================= */
let cur=null,host=null,CX=null;
function stop(){if(cur&&cur.stop){try{cur.stop()}catch(e){}}cur=null;try{root.speechSynthesis&&root.speechSynthesis.cancel()}catch(e){}}
function menu(){
  stop();const c=CX,area=c.area;
  const tabs=h('div',{class:'fj-chips',role:'tablist'},[['ingles','Inglés'],['musica','Música']].map(([a,t])=>h('button',{class:'fj-chip',type:'button',role:'tab','aria-pressed':String(a===area),onclick:()=>{c.area=a;menu()}},t)));
  const g=h('div',{class:'fj-g'});
  Object.keys(JUEGOS).filter(k=>JUEGOS[k].area===area).forEach(k=>{const j=JUEGOS[k];g.append(h('button',{class:'fj-card',type:'button',onclick:()=>jugar(k)},h('span',{class:'fj-ic',style:'background:'+j.ic[1]},j.ic[0]),h('b',{},j.titulo),h('small',{},j.desc)))});
  host.replaceChildren(h('div',{class:'fj'},h('div',{class:'ph'},h('h1',{},'Aumentar XP'),h('p',{},'Juega, practica y gana XP. Cada juego se adapta a tu nivel: si aciertas sube la dificultad.')),tabs,g,h('p',{class:'fj-sub'},'Tope diario: 20 XP por juego. Practicar todos los días también cuenta.')))}
function jugar(id){
  stop();const c=CX,j=JUEGOS[id];if(!j)return;
  const caja=h('div',{class:'fj'});host.replaceChildren(caja);
  const ctx={lvl:lvlJuego(c.nivel||1),onXP:c.onXP,volver:menu,jugar,vistaAcorde:c.vistaAcorde,vistaNota:c.vistaNota,area:c.area};
  Object.defineProperty(ctx,'vistaAcorde',{get:()=>c.vistaAcorde,set:v=>{c.vistaAcorde=v}});Object.defineProperty(ctx,'vistaNota',{get:()=>c.vistaNota,set:v=>{c.vistaNota=v}});
  cur=j.run(caja,ctx)}
function mount(el,opts){
  injectCSS();stop();host=el;opts=opts||{};const ins=opts.instr||[];
  CX={area:opts.area==='ingles'?'ingles':'musica',nivel:opts.nivel||1,onXP:opts.onXP||(async()=>({dado:0})),
   vistaAcorde:ins.some(i=>/electrica|acustica|clasica/.test(i))?'guitarra':ins.includes('ukelele')?'ukelele':'piano',
   vistaNota:ins.some(i=>/electrica|acustica|clasica/.test(i))?'guitarra':ins.includes('bajo')?'bajo':'piano'};
  menu()}
const api={mount,stop,norm,lev,revisar,acNombre,TIPOS,JUEGOS:Object.keys(JUEGOS),ES_EN,COMPLETAR,LEER,FORMAS_GUIT,FORMAS_UKE,PATRONES,COMPASES};
root.FaroJuegos=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
