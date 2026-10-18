const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z ]/g,"").trim();
const SP={};SPR.split("\n").forEach(l=>{const[n,a,b]=l.split("~");SP[n]=[a,b]});
const P=RAW.split("\n").map(l=>{const[n,nat,pos,yr,cl,f,x,r]=l.split("|");const[fl,ft]=f.includes("~")?f.split("~"):["Fact",f];const w=n.split(" ");const a=[norm(n)];if(w.length>1)a.push(norm(w[w.length-1]));(x||"").split(",").filter(Boolean).forEach(e=>a.push(norm(e)));return{n,nat,pos,yr,cl,fl,ft,r:+r,a,sp:SP[n],lg:LG[n]||"OT",ini:w.map(s=>s[0].toUpperCase()+".").join(" ")}});
{const c={};P.forEach(p=>p.a.forEach(x=>{(c[x]=c[x]||new Set()).add(p.n)}));P.forEach(p=>{p.a=p.a.filter(x=>c[x].size===1)})}
const HARD=new Set("Lev Yashin,Ferenc Puskas,Eusebio,Alfredo Di Stefano,Gerd Muller,Michel Platini,George Best,Eric Cantona,Dennis Bergkamp,Raul,Lothar Matthaus,Romario,Rivaldo,George Weah,Roberto Baggio,Luis Figo,Carles Puyol,Ryan Giggs,Marcelo,Yaya Toure,Riyad Mahrez,Yassine Bounou,Ruben Dias,Edinson Cavani,Samuel Eto'o,Paolo Maldini,Cafu,Mesut Ozil".split(","));
const EASY=new Set("Lionel Messi,Cristiano Ronaldo,Neymar,Kylian Mbappe,Erling Haaland,Mohamed Salah,Diego Maradona,Pele,Ronaldinho,Zinedine Zidane,David Beckham,Thierry Henry,Zlatan Ibrahimovic,Harry Kane,Luka Modric,Jude Bellingham".split(","));
const TN=["Easy","Medium","Hard"];
/* one source of truth for league codes -> human labels. The player card, the Wordle
   "League" column and every pool picker read from here, so labels can never drift. */
const LGL={PL:"Premier League",LL:"La Liga",SA:"Serie A",BL:"Bundesliga",L1:"Ligue 1",OT:"Other"};
const LGO=Object.entries(LGL);
/* current club + "data refreshed" date come from the offline Wikidata refresh (js/data.js).
   CURTIDY is presentation only: Wikidata labels carry legal suffixes, and the stored value
   in CURRENT stays exactly as sourced. */
const DATA_DATE=(typeof DATA_UPDATED==="string")?DATA_UPDATED:"";
function CURTIDY(c){return ({"Los Angeles FC":"LAFC"})[c]||c
 .replace(/^Club Atlético /,"").replace(/^Clube de Regatas do /,"")
 .replace(/^FC /,"").replace(/^AS /,"").replace(/^AC /,"").replace(/^SSC /,"").replace(/^OGC /,"")
 .replace(/ Club de Fútbol$/,"").replace(/ Football Club$/,"").replace(/ Sports Club$/,"")
 .replace(/ FC$/,"").replace(/ F\.C\.$/,"").replace(/ CF$/,"").replace(/ SFC$/,"")
 .replace(/ SC$/,"").replace(/ J\.K\.$/,"").replace(/ S\.K\.$/,"").replace(/ F\.R\.$/,"")
 .replace(/ Istanbul$/,"")}
function curOf(n){return (typeof CURRENT==="object"&&CURRENT&&CURRENT[n])?CURTIDY(CURRENT[n]):""}
const TIERTXT=["Easy tier","Star tier","Legend tier"];
const tier=p=>HARD.has(p.n)?2:EASY.has(p.n)?0:1;
const DL='<datalist id="dl">'+P.map(p=>p.n).sort().map(n=>'<option value="'+n.replace(/"/g,"")+'">').join("")+'</datalist>';
const lev=(a,b)=>{const m=[];for(let i=0;i<=a.length;i++)m[i]=[i];for(let j=1;j<=b.length;j++)m[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return m[a.length][b.length]};
const inPool=(p,pl)=>pl==="x"||(pl==="0"||pl==="1"?String(p.r)===pl:p.lg===pl);
const allowedD=x=>x.length<=3?0:x.length<=5?1:2;
const keysOf=p=>{if(p.k)return p.k;const s=new Set([norm(p.n),...p.a]);p.n.split(/[\s-]+/).map(norm).forEach(w=>{if(w.length>=3)s.add(w)});p.n.split(" ").map(norm).forEach(w=>{if(w.length>=3)s.add(w)});return p.k=[...s].filter(Boolean)};
const bestK=(w,p)=>{let b=99;for(const x of keysOf(p)){const d=lev(w,x);if(d<=allowedD(x)&&d<b)b=d}return b};
const matchPlayers=v=>{if(!v)return[];const ex=P.find(q=>norm(q.n)===v);if(ex)return[ex];const ws=v.split(" ").filter(w=>w.length>=3);if(ws.length<=1){const w=ws[0]||v;const ds=P.map(p=>bestK(w,p));const m=Math.min(...ds);if(m>=99)return[];return P.filter((_,i)=>ds[i]===m)}return P.filter(p=>keysOf(p).includes(v)||ws.every(w=>bestK(w,p)<99))};
const hit=(v,p)=>matchPlayers(v).includes(p);
let seed=null;
const rnd=()=>{if(seed===null)return Math.random();seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const hs=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
const dkey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const $=id=>document.getElementById(id);
const say=m=>{const e=$("live");if(e){e.textContent="";setTimeout(()=>{e.textContent=m},60)}};
const spl=(s,b)=>{let i=0;return s.split(" ").map(w=>'<span class="wd">'+w.split("").map(c=>'<span class="lt" style="animation-delay:'+((b||0)+Math.min(i++*18,340))+'ms">'+c.replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</span>").join("")+"</span>").join(" ")};
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let cfg={mode:"c",R:10,T:20,pool:"x",names:[],teams:false,pen:true,ac:false,snd:true};
let ST={g:0,solved:0,best:0,fast:0,ds:0,daily:{}};
try{Object.assign(cfg,JSON.parse(localStorage.getItem("ykb")||"{}"));Object.assign(ST,JSON.parse(localStorage.getItem("ykbs")||"{}"))}catch(e){}
if(cfg.hap===undefined)cfg.hap=true; /* vibration on by default; toggled independently of sound */
const INV=(new URLSearchParams(location.search).get("room")||"").toLowerCase(),invOk=/^[a-z0-9]{6}$/.test(INV);if(invOk)cfg.mode="o";
/* Challenge links: ?seed=abc123&m=c|p|s|w|g[&r=rounds|&j=solo run][&gd=grid difficulty][&p=pool][&d=YYYY-MM-DD]
   ?seed (with a challengeable mode) arms a challenge: deterministic deck + clue order via the js/hash PRNG.
   Daily is unified on the same mechanism already: its seed IS the date (reproducible offline). */
const QP=new URLSearchParams(location.search);
const SEEDQ=(QP.get("seed")||"").toLowerCase(),SEEDOK=/^[a-z0-9]{6}$/.test(SEEDQ);
const MODEQ=(QP.get("m")||"").toLowerCase(),MODEOK=["c","p","s","w","g"].includes(MODEQ);
let CH=null;
const DAILYQ=QP.get("d")||"",DAILYOK=/^\d{4}-\d{2}-\d{2}$/.test(DAILYQ);
/* grid stats labels live up here: the boot IIFE below re-renders setup synchronously,
   and a saved Grid mode would otherwise hit these before their declaration (TDZ). */
const GDN={e:"Easy",m:"Medium",h:"Hard"},GDD={e:"Big clubs and common nations. Every box has 3 or more answers.",m:"Mid-size clubs. Every box has 2 or more answers.",h:"Any club, rare pairings. Some boxes have just one answer."};
/* resume snapshot version + resumable modes: same TDZ reason — rgBanner() runs during that
   early setup render and would otherwise hit these before their declaration */
const RGV=1,RGM=["c","p","s"];
const rgLab=m=>({c:"Classic",p:"Career path",s:"Solo"})[m]||m;
const gbest=d=>(ST.gbd&&ST.gbd[d])||(d==="m"?ST.gb||0:0);
const save=()=>{try{localStorage.setItem("ykb",JSON.stringify(cfg))}catch(e){}};
const sv=()=>{try{localStorage.setItem("ykbs",JSON.stringify(ST))}catch(e){}};
if(SEEDOK&&MODEOK){CH={code:SEEDQ};cfg.mode=MODEQ;
  if(MODEQ==="s"){const j=+QP.get("j")||0;if([10,20,99].includes(j))cfg.sr=j}
  else{const r=+QP.get("r")||0;if([5,10,15,20,99].includes(r))cfg.R=r}
  const gd=QP.get("gd");if(MODEQ==="g"&&["e","m","h"].includes(gd))cfg.gd=gd;
  const pl=QP.get("p");if(["x","0","1","PL","LL","SA","BL","L1"].includes(pl))cfg.pool=pl;
  if(!cfg.names.length)cfg.names=["You"];save()}
let S={ph:"setup"},iv=null,left=0,ax=null,enter=true;
// Decorative confetti is intentionally not rendered (CSS keeps it hidden).
const HIDE_CONFETTI=true;
// Apply the persisted light/dark choice before anything renders (default dark).
if(cfg.light)document.documentElement.dataset.theme="light";
const syncTg=()=>{const e=$("tg");if(e)e.setAttribute("aria-pressed",String(document.documentElement.dataset.theme==="light"))};
syncTg();
const setErr=(id,m)=>{const e=$(id);if(e)e.textContent=m;else if(m)toast(m)};
function beep(f,d,t){if(!cfg.snd)return;try{ax=ax||new(window.AudioContext||window.webkitAudioContext)();const o=ax.createOscillator(),g=ax.createGain();o.type=t||"sine";o.frequency.value=f;g.gain.value=.07;o.connect(g);g.connect(ax.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,ax.currentTime+d);o.stop(ax.currentTime+d)}catch(e){}}
/* haptics: distinct patterns; cfg.hap gates them separately from sound.
   bad/wrong = two short, good = one tick, solve = short rising pattern, strike = same two-short as a miss */
const VIB={bad:[45,55,45],good:30,solve:[35,45,70]};
const buzz=p=>{if(cfg.hap===false)return;try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
function confetti(){/* decorative fall is hidden by CSS (.cf{display:none}); since v12.1 this early-returns so
   every solve no longer builds 36 DOM nodes that nobody sees. To re-enable, delete this line. */
if(HIDE_CONFETTI)return;const c=document.createElement("div");c.className="cf";const k=["var(--vl)","var(--ice)","var(--hot)","var(--ink)"];for(let i=0;i<36;i++){const e=document.createElement("i");e.style.left=Math.random()*100+"%";e.style.background=k[i%4];e.style.animationDelay=Math.random()*.4+"s";e.style.animationDuration=1+Math.random()+"s";c.appendChild(e)}document.body.appendChild(c);setTimeout(()=>c.remove(),2600)}
const stopT=()=>{clearInterval(iv);iv=null};
function runT(){stopT();if(!S.T)return;left=S.T;iv=setInterval(()=>{left-=.1;const b=$("tb"),l=$("tl");if(b){b.style.width=Math.max(0,left/S.T*100)+"%";b.parentNode.classList.toggle("lo",left<=5)}if(l){l.textContent=Math.ceil(Math.max(0,left))+"s";l.classList.toggle("lo",left<=5)}if(left<=5&&Math.abs(left-Math.round(left))<.05&&left>0.2)beep(880,.05);if(left<=0){stopT();guess(true)}},100)}
function clues(p){
if(S.mode==="p"){const c=p.cl.split(", "),o=[];for(let k=1;k<=4;k++)o.push("Career so far: "+c.slice(0,k).join(", then "));o.push("Initials: "+p.ini);return o}
const cl=p.cl.split(", "),C="Clubs: "+p.cl,F=p.fl+": "+p.ft,SPc=p.sp?p.sp[0]+": "+p.sp[1]:null;
const START=cl.length>1?"Started his career at "+cl[0]:null;
/* opener is always a real clue: a fact, a nickname/trivia line, or a club list with 2+ clubs */
const open=[F,SPc,cl.length>1?C:null].filter(Boolean),first=open[Math.floor(rnd()*open.length)];
/* "Started at X" is redundant next to the full club list, so never show both */
const h=[first];
shuf([F,C,SPc,START].filter(x=>x&&x!==first)).forEach(x=>{
  if(h.length>=3)return;
  if((x===START&&h.includes(C))||(x===C&&h.includes(START)))return;
  h.push(x)});
/* thin players (few data fields) get nationality as a middle clue, never as the opener */
const pad=["Nationality: "+p.nat,"Position: "+p.pos];while(h.length<3)h.push(pad.shift());
const late=rnd()<.2?"A "+p.pos+" born "+(rnd()<.5?"in the "+Math.floor(p.yr/10)*10+"s":"in "+p.yr):(pad.length>1?"Nationality: "+p.nat+", "+p.pos:pad[0]);
h.push(late);h.push("Initials: "+p.ini);
if(S.mode==="s"){const w=x=>/^Initials/.test(x)?0:/^(Nationality|Position|A .* born)/.test(x)?1:/^(Clubs|Started)/.test(x)?2:3;h.sort((a,b)=>w(b)-w(a))}
return h}
const pts=()=>Math.max(1,6-S.sh-(S.hl?1:0));
const tm=k=>S.pl.filter((_,i)=>i%2===k).reduce((a,x)=>a+x.s,0);
const grid=r=>r.map(x=>x===0?"⬛":x<=2?"🟩":x<=4?"🟨":"🟧").join("");
/* player card: shown under the reveal (and on the Wordle result) for the round's answer.
   Built only from fields the deck already carries, so it can never disagree with the clues. */
function pcard(p){const tr=tier(p),lg=LGL[p.lg]||p.lg,stars=tr?"★".repeat(tr):"",cur=curOf(p.n);
 return '<section class="pcard" aria-label="Player card: '+esc(p.n)+'">'
 +'<div class="pc-h"><h4>'+esc(p.n)+'</h4><span class="pc-t'+(tr===2?" leg":"")+'" aria-label="Tier: '+TIERTXT[tr]+(tr?" ("+tr+(tr===1?" star":" stars")+")":"")+'"><b aria-hidden="true">'+stars+'</b>'+TN[tr]+'</span></div>'
 +'<dl class="pc-l">'
 +'<div><dt>Nationality</dt><dd>'+esc(p.nat)+'</dd></div>'
 +'<div><dt>Position</dt><dd>'+esc(p.pos)+'</dd></div>'
 +'<div><dt>Born</dt><dd>'+esc(p.yr)+'</dd></div>'
 +(cur?'<div><dt>'+(cur==="Retired"?"Status":"Current club")+'</dt><dd>'+esc(cur)+'</dd></div>':'')
 +'<div><dt>League</dt><dd>'+esc(lg)+'</dd></div>'
 +'<div class="wide"><dt>Clubs</dt><dd>'+esc(p.cl)+'</dd></div>'
 +'<div class="wide"><dt>'+esc(p.fl||"Fact")+'</dt><dd>'+esc(p.ft)+'</dd></div>'
 +'</dl>'
 +'<a class="pc-a" href="https://en.wikipedia.org/wiki/Special:Search?search='+encodeURIComponent(p.n+" footballer")+'" target="_blank" rel="noopener noreferrer">Learn more about '+esc(p.n)+'<span class="sr"> (opens in a new tab)</span></a>'
 +'</section>'}
/* challenge helpers: the armed challenge drives the PRNG; a link reproduces the same round set */
const chSeedCode=()=>"YKBCH"+CH.code;
function chBanner(){if(!CH)return"";return '<div class="chban" role="note"><span>You are playing a challenge</span><b>Seed '+esc(CH.code.toUpperCase())+'</b><button class="gh" type="button" id="cown">Create your own</button></div>'}
function chLink(code,mm){mm=mm||cfg.mode;const q=new URLSearchParams();
 q.set("seed",code);q.set("m",mm);
 if(mm==="s")q.set("j",String(cfg.sr||10));else if(mm==="c"||mm==="p")q.set("r",String(cfg.R));
 if(mm==="g")q.set("gd",cfg.gd||"m");
 if(mm!=="w")q.set("p",cfg.pool);
 return location.origin+location.pathname+"?"+q.toString()}
function challenge(btn){const code=CH?CH.code:genCode(),u=chLink(code);
 if(navigator.share){navigator.share({title:"YouKnowBall",text:"Can you beat this run? Your seed: "+code.toUpperCase(),url:u}).catch(()=>{})}
 else cp(btn,u)}
/* share with the system sheet when possible, clipboard as fallback (cp also restores the label) */
function share(txt,btn){const bl=btn?btn.textContent:null;
 if(navigator.share){navigator.share({title:"YouKnowBall",text:txt}).then(()=>{if(btn){btn.textContent="Shared";clearTimeout(btn._sh);btn._sh=setTimeout(()=>{if(btn.isConnected)btn.textContent=bl},1600)}}).catch(e=>{if(e&&e.name==="AbortError")return;cp(btn,txt)})}
 else cp(btn,txt)}
/* rematch link used inside shared text: the armed challenge replays itself; otherwise a fresh seeded match */
function rematchLink(mm){return chLink(CH?CH.code:genCode(),mm||cfg.mode)}
function cp(b,t){const bl=b.textContent,done=ok=>{b.textContent=ok?"Copied":"Copy failed";clearTimeout(b._cp);b._cp=setTimeout(()=>{b.textContent=bl},1600)};
const legacy=()=>{try{const ta=document.createElement("textarea");ta.className="sr";ta.value=t;document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();return ok}catch(e){return false}};
try{navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t).then(()=>done(true),()=>done(legacy())):done(legacy())}catch(e){done(legacy())}}
function opt(id,l,v,c){return'<div><label class="lab" for="'+id+'">'+l+'</label><select id="'+id+'">'+v.map(o=>'<option value="'+o[0]+'"'+(String(o[0])===String(c)?" selected":"")+'>'+o[1]+'</option>').join("")+'</select></div>'}
const MODES=[["c","Classic","Pass the phone","01"],["s","Solo","You against the clock","02"],["w","Wordle","Six tries, colour clues","03"],["g","Grid","3×3 club and nation","04"],["p","Career path","Clubs unlock one by one","05"],["d","Daily","Same five for everyone","06"],["o","Online","Race friends live","07"]];
function setup0(){
stopT();const m=cfg.mode;
let h=chBanner()+'<div class="card setup">'+rgBanner()+'<div class="step"><i>01</i>Pick your mode</div><div class="seg" role="group" aria-label="Game mode">'+MODES.map(a=>'<button type="button" data-m="'+a[0]+'" class="'+(m===a[0]?"on":"")+'" aria-pressed="'+(m===a[0])+'"><i>'+a[3]+'</i><b>'+a[1]+'</b><small>'+a[2]+'</small></button>').join("")+'</div><div class="step"><i>02</i>Set up '+MODES.find(a=>a[0]===m)[1]+'</div><p class="who mdesc">'+({c:"Five clues in a random order. Fewer clues, more points.",p:"Clubs unlock one by one. Name the player before the career ends.",d:"Same five players for everyone today. One try, no restarts.",w:"Find the mystery player in six tries. Each guess colors league, nation, position, club and birth year.",g:"Fill the 3 by 3 board. Name a player who fits a club row and a nation column.",s:"Just you against the clock. Three misses ends an endless run. Beat your personal best.",o:"Race your friends live on separate phones. First to name the player scores."})[m]+'</p>';
if(m==="o"){olSetup(h);return}
if(m==="s"){soloSetup(h);return}
if(m==="w"){wordleSetup(h);return}
if(m==="g"){gridSetup(h);return}
if(m!=="d")h+='<h3>Who is playing</h3><div class="r"><input id="nm" placeholder="Add a name" maxlength="14" autocomplete="off"><button class="gh" id="ad" type="button" style="flex:0 0 auto">Add</button></div><div class="chips" id="ch"></div><div class="r">'+opt("rd","Rounds",[[5,"5"],[10,"10"],[15,"15"],[20,"20"],[99,"All"]],cfg.R)+opt("tm","Turn timer",[[0,"Off"],[15,"15 seconds"],[20,"20 seconds"],[30,"30 seconds"]],cfg.T)+opt("pl","Players",[["x","Everyone"],["0","Current stars"],["1","Legends"]].concat(LGO),cfg.pool)+'</div>';
h+='<div class="opts">'+(m!=="d"?[["teams","Teams, A vs B"],["pen","Wrong guess costs 1"],["ac","Easy mode, name hints"]]:[]).concat([["snd","Sound effects"],["hap","Vibration"]]).map(a=>'<label><input type="checkbox" id="o_'+a[0]+'"'+(cfg[a[0]]?" checked":"")+'>'+a[1]+'</label>').join("")+'</div><div class="err" aria-live="polite" id="er"></div><div class="step"><i>03</i>Kick off</div><div class="r"><button class="btn" id="go" type="button">'+(m==="d"?"Play today's challenge":"Kick off")+'</button><button class="gh" id="st" type="button" style="flex:0 0 auto">Stats</button></div></div>';
$("app").innerHTML=h;
document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{cfg.mode=b.dataset.m;save();enter=true;setup();post()});
document.querySelectorAll(".opts input").forEach(i=>i.onchange=()=>{cfg[i.id.slice(2)]=i.checked;save()});
$("st").onclick=()=>{S={ph:"st"};enter=true;draw()};
let add=()=>{};
if(m!=="d"){chips();add=()=>{const v=$("nm").value.trim();if(!v)return;if(cfg.names.length>=8){setErr("er","Eight players max");return}if(cfg.names.some(n=>n.toLowerCase()===v.toLowerCase())){setErr("er","That name is taken");return}cfg.names.push(v);$("nm").value="";setErr("er","");chips()};$("ad").onclick=add;$("nm").onkeydown=e=>{if(e.key==="Enter")add()}}
$("go").onclick=()=>{if(m==="d"){start("d");return}const v=$("nm").value.trim();if(v)add();if(!cfg.names.length){setErr("er","Add at least one player");return}if(cfg.teams&&cfg.names.length<2){setErr("er","Teams need at least two players");return}cfg.R=+$("rd").value;cfg.T=+$("tm").value;cfg.pool=$("pl").value;save();start(m)}}
function soloSetup(h){
const sb=ST.sb||0,sg=ST.sg||0;
h+='<div class="stat" style="margin-top:0"><div><b>'+sb+'</b><span>Personal best</span></div><div><b>'+sg+'</b><span>Solo runs</span></div></div><div class="r">'+opt("sr","Run length",[[10,"10 rounds"],[20,"20 rounds"],[99,"Endless, 3 strikes"]],cfg.sr||10)+opt("tm","Turn timer",[[0,"Off"],[15,"15 seconds"],[20,"20 seconds"],[30,"30 seconds"]],cfg.T)+opt("pl","Players",[["x","Everyone"],["0","Current stars"],["1","Legends"]].concat(LGO),cfg.pool)+'</div><div class="opts"><label><input type="checkbox" id="o_snd"'+(cfg.snd?" checked":"")+'>Sound effects</label><label><input type="checkbox" id="o_hap"'+(cfg.hap?" checked":"")+'>Vibration</label></div><div class="step"><i>03</i>Kick off</div><button class="btn" id="go" type="button" style="width:100%">Start solo run</button></div>';
$("app").innerHTML=h;
document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{cfg.mode=b.dataset.m;save();enter=true;setup();post()});
document.querySelectorAll(".opts input").forEach(i=>i.onchange=()=>{cfg[i.id.slice(2)]=i.checked;save()});
$("go").onclick=()=>{cfg.sr=+$("sr").value;cfg.T=+$("tm").value;cfg.pool=$("pl").value;save();start("s")}}
function chips(){$("ch").innerHTML=cfg.names.map((n,k)=>'<span class="chip">'+esc(n)+'<button type="button" data-k="'+k+'" aria-label="Remove '+esc(n)+'">&times;</button></span>').join("");$("ch").querySelectorAll("button").forEach(b=>b.onclick=()=>{cfg.names.splice(+b.dataset.k,1);chips()})}
function start(mode,dk,rand){
if(mode==="w"){wordleStart(dk,rand);return}if(mode==="g"){gridStart();return}
const key=dk||dkey(new Date());let pool,names,R=cfg.R,pen=cfg.pen,ac=cfg.ac,teams=cfg.teams,T=cfg.T;
if(mode==="d"){if(ST.daily[key]){S={ph:"dd",dk:key};draw();return}seed=hs(key);pool=P;names=["You"];R=5;pen=true;ac=false;teams=false;T=0}
else{seed=CH?hs(chSeedCode()):null;pool=P.filter(p=>inPool(p,cfg.pool)&&(mode!=="p"||p.cl.split(", ").length>=4));names=mode==="s"?["You"]:cfg.names;if(mode==="s"){R=cfg.sr||10;pen=false;ac=false;teams=false}}
S={ph:"play",mode,dk:key,pl:names.map(n=>({n,s:0})),deck:shuf(pool).slice(0,Math.min(R,pool.length)),i:0,sh:1,t:0,done:false,msg:"",err:"",last:-1,hl:false,cs:null,res:[],run:0,t0:0,pen,ac,teams,T,solo:mode==="s"?{miss:0,endless:R>=99}:null};enter=true;
if(!S.deck.length){/* never let an empty pool start a round; go back and say why */
S={ph:"setup"};enter=true;draw();setErr("er","No players match that player pool. Try Everyone.");return}
draw()}
function guess(skip){
const p=S.deck[S.i],me=S.pl[S.t];let pn=false;
if(!skip){const v=norm($("g").value);if(!v){setErr("er","Type a name first");$("g").focus();return}
if(hit(v,p)){stopT();const q=pts(),b=S.last===S.t?1:0,tb=tier(p),tot=q+b+tb;me.s+=tot;S.last=S.t;S.run++;S.done=true;S.res.push(S.sh);S.msg=me.n+" scored "+tot+" ("+q+(b?", +1 streak":"")+(tb?", +"+tb+" "+TN[tb].toLowerCase()+" bonus":"")+")";S.err="";ST.solved++;bumpDist(S.mode,S.sh);const ms=Date.now()-S.t0;if(!ST.fast||ms<ST.fast)ST.fast=ms;ST.best=Math.max(ST.best,S.run);sv();beep(660,.15);setTimeout(()=>beep(990,.2),120);buzz(VIB.solve);confetti();S.fx="glow";draw();return}
beep(180,.2,"square");buzz(VIB.bad);S.fx="shake";if(S.pen){me.s=Math.max(0,me.s-1);pn=true}}
if(S.sh<5){S.sh++;S.t=(S.t+1)%S.pl.length;S.err=(skip?"Skipped. ":"Not quite"+(pn?", minus 1. ":". "))+"Clue "+S.sh+" goes to "+S.pl[S.t].n+"."}
else{stopT();S.done=true;S.last=-1;S.run=0;S.res.push(0);S.msg="Nobody got that one";S.err="";if(S.solo)S.solo.miss++}
draw()}
function next(){S.i++;if(S.i>=S.deck.length||(S.solo&&S.solo.miss>=3)){finish();return}S.sh=1;S.hl=false;S.cs=null;S.t0=0;S.done=false;S.msg="";S.err="";S.t=(S.t+1)%S.pl.length;enter=true;draw()}
function finish(){
S.ph="end";ST.g++;seed=null;rgClear();if(S.mode==="s"){const sc=S.pl[0].s;ST.sg=(ST.sg||0)+1;if(sc>(ST.sb||0)){ST.sb=sc;S.nb=1}}
if(S.mode==="d"){const k=S.dk||dkey(new Date());ST.daily[k]={s:S.pl[0].s,g:grid(S.res)};ST.ls=Math.max(ST.ls||0,streak())}
sv();enter=true;draw();if(Math.max(...S.pl.map(x=>x.s))>0)confetti()}
function post(){
const c=$("app").firstElementChild;if(!c)return;
if(enter){c.classList.add("ent");enter=false}
if(S.fx){c.classList.add(S.fx);S.fx=null}
$("app").querySelectorAll("b[data-to]").forEach(e=>tweenNum(e));
if(S.pl&&S.ph==="play")S.pv=S.pl.map(x=>x.s);fit()}
function draw(){draw0();post();if(S.ph==="dd"||(S.ph==="end"&&S.mode==="d")){const k=S.dk||dkey(new Date()),d=ST.daily[k];if(d)addShot(dailyImg(d,k))}}
function draw0(){
if(S.ph==="setup"){setup();return}
if(S.ph==="ol"){olRender();return}
if(S.ph==="wd"){stopT();wordleRender();return}
if(S.ph==="grid"){stopT();gridRender();return}
stopT();
if(S.ph==="st"){
$("app").innerHTML='<div class="card narrow"><h3>Your stats on this device</h3><div class="stat"><div><b>'+ST.g+'</b><span>Games played</span></div><div><b>'+ST.solved+'</b><span>Players solved</span></div><div><b>'+ST.best+'</b><span>Best streak in a game</span></div><div><b>'+(ST.fast?(ST.fast/1000).toFixed(1)+"s":"None yet")+'</b><span>Fastest solve</span></div><div><b>'+streak()+'</b><span>Daily streak</span></div><div><b>'+Object.keys(ST.daily).length+'</b><span>Dailies played</span></div></div>'+distHtml()+aboutData()+'<button class="gh" id="bk" type="button">Back</button></div>';
$("bk").onclick=()=>{S={ph:"setup"};enter=true;draw()};return}
if(S.ph==="dd"||(S.ph==="end"&&S.mode==="d")){
const k=S.dk||dkey(new Date()),d=ST.daily[k],t="YouKnowBall daily "+k+"\n"+d.g+"\nScore "+d.s+"\n"+location.origin+location.pathname+"?d="+k;
$("app").innerHTML='<div class="card narrow"><h3>'+(S.ph==="dd"?"You already played today":"Daily complete")+'</h3><div class="grid">'+d.g+'</div><div class="row"><span>Score</span><b>'+d.s+'</b></div><p class="who">Daily streak: <b>'+streak()+'</b>. New players tomorrow.</p><div class="r"><button class="btn" id="cp" type="button">Share result</button><button class="gh" id="sc" type="button">Back</button></div></div>';
$("cp").onclick=()=>share(t,$("cp"));$("sc").onclick=()=>{S={ph:"setup"};enter=true;draw()};return}
if(S.ph==="end"){
const L=S.pl.slice().sort((a,b)=>b.s-a.s),a=tm(0),b=tm(1);
const w=S.teams?(a===b?"The teams tie.":"<b>Team "+(a>b?"A":"B")+"</b> wins."):(()=>{const x=L.filter(y=>y.s===L[0].s).map(y=>esc(y.n)).join(" and ");return L.length>1?(x.includes(" and ")?x+" share the win.":"<b>"+x+"</b> takes it."):(S.mode==="s"?(S.nb?"Run over. New personal best!":"Run over. Personal best "+(ST.sb||0)):"Solo run finished.")})();
$("app").innerHTML='<div class="card narrow end">'+chBanner()+'<h3>Full time</h3>'+(S.teams?'<div class="stat"><div><b>'+a+'</b><span>Team A</span></div><div><b>'+b+'</b><span>Team B</span></div></div>':"")+L.map((x,k)=>'<div class="row'+(k?"":" top1")+'" style="animation-delay:'+k*40+'ms"><span><i class="rk">'+(k+1)+'</i>'+esc(x.n)+'</span><b data-to="'+x.s+'" data-from="0">'+x.s+'</b></div>').join("")+'<div class="grid" aria-label="Round results">'+grid(S.res)+'</div><p class="who">'+w+'</p><div class="r"><button class="btn" id="ag" type="button">Play again</button><button class="gh" id="cp" type="button">Share results</button><button class="gh" id="chf" type="button">Challenge a friend</button><button class="gh" id="sc" type="button">Settings</button></div></div>';
$("ag").onclick=()=>start(S.mode);$("sc").onclick=()=>{S={ph:"setup"};enter=true;draw()};
const lab=S.mode==="p"?"Career path":S.mode==="s"?"Solo":"Classic";
const solved=S.res.filter(x=>x>0).length,top=Math.max(...S.pl.map(x=>x.s));
const stxt="YouKnowBall ⚽ "+(S.teams?lab+" — Team A "+a+" – "+b+" Team B":lab+" — solved "+solved+"/"+S.res.length+" · top "+top+" pts")+"\n"+grid(S.res)+"\n"+rematchLink(S.mode);
$("cp").onclick=()=>share(stxt,$("cp"));$("chf").onclick=()=>challenge($("chf"));return}
const p=S.deck[S.i],N=S.deck.length,cs=S.cs||(S.cs=clues(p)),tr=tier(p);
if(!S.t0)S.t0=Date.now();
const fresh=S.nk!==S.i+":"+S.sh;S.nk=S.i+":"+S.sh;
const sk=S.last===S.t&&S.run>0?S.run:0,skNew=sk&&S.sk!==sk;S.sk=sk;
const nPrev=S.done?S.sh:S.sh-1;
let h='<div class="card play'+(sk?" has-streak":"")+'">'+chBanner()+''
+'<div class="hd bug"><span class="rd">Round <b>'+(S.i+1)+'</b>'+(S.solo&&S.solo.endless?'':' / '+N)+'</span><span class="badge'+(tr===2?" h":"")+'">'+(S.mode==="p"?"Career":TN[tr]+(tr?" +"+tr:""))+'</span>'+(S.solo?'<span class="stk">Strikes <b>'+S.solo.miss+'</b>/3</span>':'')+'<span class="wp">'+(S.done?"Round over":"Worth <b>"+pts()+'</b> '+(pts()===1?"pt":"pts"))+'</span>'+(!S.done&&S.T?'<span id="tl" class="tn">'+S.T+'s</span>':'')+'</div>';
if(sk)h+='<div class="streak'+(skNew?" in":"")+'"><b>'+sk+'</b><span>Streak</span></div>';
h+='<div class="dots">'+S.deck.map((_,k)=>'<i class="'+(k<S.i?"d":k===S.i?"c":"")+'"></i>').join("")+'</div><div class="stack">';
for(let k=0;k<nPrev;k++)h+='<div class="cl tk'+(fresh&&!S.done&&k===nPrev-1?" dr":"")+'" style="--age:'+(nPrev-k)+'"><em>'+(k+1)+'</em><span>'+esc(cs[k])+'</span></div>';
if(!S.done)h+='<div class="cl slab'+(fresh?" nw":"")+'"><em class="cn">Clue '+S.sh+' of 5</em><span class="ct" data-fit>'+esc(cs[S.sh-1])+'</span></div>';
h+='</div>';
if(S.hl&&!S.done)h+='<div class="cl hint"><em>?</em><span>First name starts with '+p.n[0]+', '+p.n.replace(/ /g,"").length+' letters in all</span></div>';
if(!S.done&&S.T)h+='<div class="bar"><i id="tb"></i></div>';
if(S.done){const mm=/scored (\d+)/.exec(S.msg);h+='<div class="rev'+(mm?"":" miss")+'"><div class="rv-main"><small>'+esc(S.msg)+'</small><h2 data-fit>'+spl(p.n)+'</h2><p>'+esc(p.nat)+', '+esc(p.ft)+'</p></div><div class="pts">'+(mm?'<span>+</span><b data-to="'+mm[1]+'" data-from="0">'+mm[1]+'</b>':'<b>0</b>')+'<em>pts</em></div></div>'+pcard(p)+'<button class="btn" id="nx" type="button">'+(S.i+1>=N?"See results":"Next player")+'</button>'}
else{h+='<p class="who"><b>'+esc(S.pl[S.t].n)+"</b>'s turn</p><input id=\"g\" placeholder=\"Type a name\" aria-label=\"Your guess\" autocomplete=\"off\" autocapitalize=\"off\""+(S.ac?' list="dl"':"")+'><div class="err" aria-live="polite" id="er">'+esc(S.err)+'</div><div class="r"><button class="btn" id="gb" type="button">Guess</button><button class="gh" id="sk" type="button">'+(S.sh<5?"Skip to next clue":"Give up")+'</button>'+(S.hl?"":'<button class="gh" id="hl" type="button">Letter hint, -1 point</button>')+'</div>'}
h+='<div class="qrow"><button class="gh qt" type="button">Quit game</button></div>';
if(S.teams)h+='<p class="who tmline">Team A <b>'+tm(0)+'</b> and Team B <b>'+tm(1)+'</b></p>';
h+='<div class="chips strip">'+S.pl.map((x,k)=>'<span class="chip'+(!S.done&&k===S.t?' on':'')+'">'+(S.teams?'<i class="tm">'+(k%2?"B":"A")+'</i>':'')+'<span class="nm">'+esc(x.n)+'</span> <b data-to="'+x.s+'" data-from="'+(S.pv&&S.pv[k]!=null?S.pv[k]:x.s)+'">'+x.s+'</b></span>').join("")+'</div></div>'+(S.ac?DL:"");
$("app").innerHTML=h;
rgSave();
say(S.done?S.msg+". The answer was "+p.n:"Clue "+S.sh+". "+cs[S.sh-1]);
if(S.done){$("nx").onclick=next}else{$("gb").onclick=()=>guess(false);$("sk").onclick=()=>guess(true);if($("hl"))$("hl").onclick=()=>{const k=left;S.hl=true;draw();left=k};$("g").onkeydown=e=>{setErr("er","");if(e.key==="Enter")guess(false)};$("g").focus({preventScroll:true});runT()}}
$("tg").onclick=()=>{const r=document.documentElement,d=r.dataset.theme!=="light";r.dataset.theme=d?"light":"dark";cfg.light=d;save();$("tg").setAttribute("aria-pressed",String(d))};

let RM=null,R=null,OL=null,HS=null,olCounted="";
let RSRC="",invDone=false;
function invGo(){if(!invOk||!RM||!$("jc")||invDone)return;invDone=true;$("jc").value=INV;if(cfg.on)setTimeout(()=>$("jn").click(),500);else $("on").focus()}
function peerRoom(){const NS="ykbx-";return{join:(name,host)=>new Promise((res,rej)=>{
if(!window.Peer){rej({code:"unavailable"});return}
let pr,mem={},myid="",hs=[],tmr=null,conns=[],hc=null,done=false,locked=false;
const view=()=>Object.keys(mem).map(id=>({peer:id,by:null,isMe:id===myid,sameTab:id===myid,kind:"viewer",guest:false,presence:mem[id],updatedAt:Date.now()}));
const fire=()=>{clearTimeout(tmr);tmr=setTimeout(()=>{const v=view();hs.forEach(f=>f({peers:v,joined:[],left:[],updated:[]}))},20)};
const bcast=()=>{conns.forEach(c=>{try{c.send({t:"s",m:mem})}catch(e){}});fire()};
const api={name,emit:async()=>{},on:()=>()=>{},peers:view,lock:v=>{locked=!!v},
presence:async q=>{const c=JSON.parse(JSON.stringify(q));mem[myid]=Object.assign(mem[myid]||{},c);if(host)bcast();else{fire();try{hc.send({t:"p",p:c})}catch(e){}}},
onPeers:f=>{hs.push(f);setTimeout(()=>f({peers:view(),joined:[],left:[],updated:[]}),0);return()=>{hs=hs.filter(x=>x!==f)}},
connected:()=>true,onConnection:()=>()=>{},leave:async()=>{try{pr.destroy()}catch(e){}}};
const ice=window.GTP_ICE?{config:{iceServers:window.GTP_ICE}}:{};
if(host){pr=new Peer(NS+name,ice);
pr.on("open",id=>{myid=id;mem[id]={};done=true;res(api)});
pr.on("error",e=>{if(!done)rej({code:e.type==="unavailable-id"?"limit_reached":"upstream_error"})});
pr.on("open",()=>olStatus(""));
pr.on("disconnected",()=>{olStatus("Lost signal, reconnecting...");try{pr.reconnect()}catch(e){}});
pr.on("connection",c=>{if(locked||Object.keys(mem).length>=8){c.on("open",()=>{try{c.send({t:"x",m:locked?"This game already started.":"This room is full."})}catch(e){}setTimeout(()=>{try{c.close()}catch(e){}},400)});return}conns.push(c);c.on("open",()=>{mem[c.peer]={};bcast()});c.on("data",d=>{if(d&&d.t==="p"){mem[c.peer]=Object.assign(mem[c.peer]||{},d.p);bcast()}});const gone=()=>{conns=conns.filter(x=>x!==c);delete mem[c.peer];bcast()};c.on("close",gone);c.on("error",gone)})}
else{pr=new Peer(undefined,ice);
pr.on("open",id=>{myid=id;mem[id]={};hc=pr.connect(NS+name,{reliable:true});hc.on("open",()=>{done=true;res(api)});hc.on("data",d=>{if(d&&d.t==="s"){mem=d.m;fire()}if(d&&d.t==="x"){if(OL)OL.gone=1;olFail(d.m)}});hc.on("close",()=>{mem={};fire();olRetry()});setTimeout(()=>{if(!done)rej({code:"not_found"})},9000)});
pr.on("error",e=>{if(!done)rej({code:e.type==="peer-unavailable"?"not_found":"upstream_error"})})}
})}}
(async()=>{try{RM=window.claude?await window.claude.use("room"):null;RSRC=RM?"claude":""}catch(e){RM=null}if(!RM&&window.Peer){RM=peerRoom();RSRC="peer"}if(S.ph==="setup"){setup();setTimeout(invGo,0)}})();
const CODE="abcdefghjkmnpqrstuvwxyz23456789",genCode=()=>Array.from({length:6},()=>CODE[Math.floor(Math.random()*CODE.length)]).join("");
const NOROOM="Online play is not available right now. Check your connection and reload.";
function olSetup(h){
h+='<h3>Your name</h3><input id="on" maxlength="14" autocomplete="off" placeholder="Name" aria-label="Your name" value="'+esc(cfg.on||"")+'"><div class="r" style="margin-top:12px">'+opt("rd","Rounds",[[5,"5"],[10,"10"],[15,"15"]],[5,10,15].includes(cfg.R)?cfg.R:10)+opt("sp","New clue every",[[10,"10 seconds"],[15,"15 seconds"],[20,"20 seconds"]],cfg.sp||15)+opt("pl","Players",[["x","Everyone"],["0","Current stars"],["1","Legends"]].concat(LGO),cfg.pool)+'<div style="flex:1 1 100%"><label class="lab" for="ors">Room seed, optional</label><input id="ors" maxlength="10" placeholder="Empty = random" style="margin-top:6px" autocomplete="off" aria-label="Room seed, optional" value="'+esc(cfg.rs||"")+'"></div></div><div class="opts"><label><input type="checkbox" id="o_pen"'+(cfg.pen?" checked":"")+'>Wrong guess costs 1</label><label><input type="checkbox" id="o_snd"'+(cfg.snd?" checked":"")+'>Sound effects</label><label><input type="checkbox" id="o_hap"'+(cfg.hap?" checked":"")+'>Vibration</label></div><div class="step"><i>03</i>Open the room</div><button class="btn" id="hs" type="button" style="width:100%">Host a room</button><h3 style="margin:22px 0 10px">Or join a friend</h3><div class="r"><input id="jc" maxlength="6" autocomplete="off" autocapitalize="off" placeholder="Room code" aria-label="Room code"><button class="gh" id="jn" type="button" style="flex:0 0 auto">Join room</button></div><div class="err" aria-live="polite" id="er">'+(RM?"":NOROOM)+'</div><p class="who" style="font-size:13px">'+(RSRC==="claude"?"Everyone playing must open this page while signed in to claude.ai with access to it. People on a public link can not join a room.":"Share the code with friends anywhere. Everyone opens this page and taps Join room.")+'</p></div>';
$("app").innerHTML=h;
document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{cfg.mode=b.dataset.m;save();enter=true;setup();post()});
document.querySelectorAll(".opts input").forEach(i=>i.onchange=()=>{cfg[i.id.slice(2)]=i.checked;save()});
const go=host=>{const nm=$("on").value.trim(),code=host?genCode():$("jc").value.trim().toLowerCase();if(!RM){setErr("er",NOROOM);return}if(!nm){setErr("er","Add your name first");return}if(!host&&!/^[a-z0-9]{6}$/.test(code)){setErr("er","Enter the 6 character room code");return}cfg.on=nm;if(host){cfg.R=+$("rd").value;cfg.sp=+$("sp").value;cfg.pool=$("pl").value;if($("ors"))cfg.rs=$("ors").value.trim().toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,10)}save();olStart(host,nm,code)};
$("hs").onclick=()=>go(true);$("jn").onclick=()=>go(false);$("on").onkeydown=e=>{if(e.key==="Enter"&&$("jc").value.trim())$("jn").click()}}
const olCard=(h,c)=>{$("app").innerHTML='<div class="card '+(c||"narrow")+'">'+h+'<p id="ost" class="who ost"></p></div>';post()};
const oclHtml=(cl,fin)=>cl.map((c,i)=>!fin&&i===cl.length-1?'<div class="cl slab nw"><em class="cn">Clue '+(i+1)+' of 5</em><span class="ct" data-fit>'+esc(c)+'</span></div>':'<div class="cl tk'+(!fin&&i===cl.length-2?" dr":"")+'" style="--age:'+((fin?cl.length:cl.length-1)-i)+'"><em>'+(i+1)+'</em><span>'+esc(c)+'</span></div>').join("");
function olStatus(m){const e=$("ost");if(e)e.textContent=m||""}
let rejoins=0,WL=null;
function olRetry(){if(!OL||OL.host||OL.gone||S.ph!=="ol")return;rejoins++;if(rejoins>3){olFail("Lost the connection to the host.");return}olStatus("Connection lost. Rejoining ("+rejoins+"/3)...");const n=OL.nm,c=OL.code;setTimeout(()=>{if(OL&&!OL.host&&!OL.gone&&S.ph==="ol")olStart(false,n,c)},2000)}
async function keepAwake(){try{if("wakeLock" in navigator&&OL&&OL.host)WL=await navigator.wakeLock.request("screen")}catch(e){}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&OL&&OL.host)keepAwake()});
function olFail(m){if(OL)clearInterval(OL.iv);olCard('<h3>'+esc(m)+'</h3><button class="gh" id="lv" type="button">Back</button>');$("lv").onclick=olLeave}
function olLeave(){if(OL){clearInterval(OL.iv);OL.un.forEach(u=>{try{u()}catch(e){}})}try{R&&R.leave()}catch(e){}R=null;OL=null;HS=null;S={ph:"setup"};enter=true;draw()}
const me=()=>{const p=R&&R.peers().find(x=>x.isMe&&x.sameTab);return p?p.peer:""};
async function olStart(host,nm,code,retry){
OL={host,nm,code,k:0,un:[],sig:"",H:null,ps:[],last:""};S={ph:"ol"};enter=true;
olCard('<h3>Connecting</h3><p class="who">Opening room '+esc(code.toUpperCase())+'</p>');
try{R=await RM.join("ykb-"+code,host);await R.presence({nm,at:Date.now()});if(!host)rejoins=0}catch(e){const c=e&&e.code;if(host&&c==="limit_reached"&&!retry){olStart(host,nm,genCode(),1);return}olFail(c==="not_found"?"No room with that code. Check it and try again.":"Could not open the room ("+(c||"error")+").");return}
if(host){keepAwake();HS={ph:"lobby",r:0,N:cfg.R,sh:0,clues:[],tl:0,res:null,sc:{},fb:{},deck:[],idx:-1,ans:null,k:{},T:cfg.sp||15,at:Date.now()};OL.iv=setInterval(hostTick,1000)}
OL.un.push(R.onPeers(ch=>{if(!OL)return;OL.ps=ch.peers;if(OL.host)hostSync();else{const h=ch.peers.filter(p=>p.kind==="viewer"&&!p.isMe&&p.presence.h).sort((a,b)=>a.presence.h.at-b.presence.h.at)[0];OL.H=h?h.presence.h:null}olRender()},e=>olFail("Connection lost ("+e.code+").")))}
const snap=()=>({ph:HS.ph,r:HS.r,N:HS.N,sh:HS.sh,cl:HS.clues.slice(0,HS.sh),tl:HS.tl,T:HS.T,w:Math.max(1,6-HS.sh),res:HS.res,sc:Object.entries(HS.sc).map(([id,x])=>[x.nm,x.s,id]),fb:HS.fb,at:HS.at});
function hostPub(){const j=JSON.stringify(snap());if(j===OL.last)return;OL.last=j;R.presence({h:JSON.parse(j)}).catch(()=>{})}
function hostSync(){
const ids={};
OL.ps.filter(p=>p.kind==="viewer"&&p.presence.nm).forEach(p=>{ids[p.peer]=1;const nm=String(p.presence.nm).slice(0,14);if(!HS.sc[p.peer])HS.sc[p.peer]={nm,s:0};else HS.sc[p.peer].nm=nm;
const g=p.presence.g;if(!p.isMe&&g&&g.r===HS.r&&g.k>(HS.k[p.peer]||0)){HS.k[p.peer]=g.k;hostGuess(p.peer,g.t)}});
Object.keys(HS.sc).forEach(id=>{if(!ids[id])delete HS.sc[id]});hostPub()}
function hostGuess(id,text){
if(HS.ph!=="play"||HS.res||!HS.sc[id])return;const v=norm(String(text).slice(0,40));if(!v)return;const a=HS.ans;
if(hit(v,a)){const pts=Math.max(1,6-HS.sh)+tier(a);HS.sc[id].s+=pts;HS.res={n:a.n,nat:a.nat,ft:a.ft,by:HS.sc[id].nm,pts};HS.tl=5;HS.fb[id]=HS.k[id]+":1"}
else{if(cfg.pen)HS.sc[id].s=Math.max(0,HS.sc[id].s-1);HS.fb[id]=HS.k[id]+":0"}
hostPub();olRender()}
function hostNext(){HS.idx++;if(HS.idx>=HS.deck.length){HS.ph="end";return}const a=HS.deck[HS.idx];HS.ans=a;HS.r=HS.idx+1;HS.clues=clues(a);HS.sh=1;HS.tl=HS.T;HS.res=null;HS.fb={}}
function hostTick(){if(!HS)return;if(HS.ph==="play"){HS.tl--;if(HS.tl<=0){if(HS.res)hostNext();else if(HS.sh<5){HS.sh++;HS.tl=HS.T}else{HS.res={n:HS.ans.n,nat:HS.ans.nat,ft:HS.ans.ft,by:"",pts:0};HS.tl=5}}}hostPub();olRender()}
function hostStart(){const pool=P.filter(x=>inPool(x,cfg.pool));if(!pool.length){olStatus("That player pool has no players. Pick Everyone.");return}
 seed=cfg.rs?hs("kr"+cfg.rs):null;HS.deck=shuf(pool).slice(0,Math.min(HS.N,pool.length));seed=null;
 HS.N=HS.deck.length;HS.idx=-1;Object.values(HS.sc).forEach(x=>x.s=0);HS.ph="play";HS.at=Date.now();hostNext();hostPub();olRender();try{R.lock(true)}catch(e){}}
function olRender(){
if(!OL||!R||OL.gone)return;const s=OL.host?snap():OL.H;
if(!s){olCard('<h3>Waiting for the host</h3><p class="who">Room '+esc(OL.code.toUpperCase())+'. If the host left, start a new room.</p><button class="gh" id="lv" type="button">Leave</button>');$("lv").onclick=olLeave;OL.sig="w";return}
const sig=s.ph+":"+(s.ph==="play"?s.r:"");
if(sig!==OL.sig){OL.sig=sig;OL.nc=0;OL.rv=0;OL.cf=0;olBuild(s)}
olUpd(s)}
function olBuild(s){
const lv='<button class="gh" id="lv" type="button">Leave room</button>';
if(s.ph==="lobby"){olCard('<h3>Room code</h3><div class="code" data-fit>'+esc(OL.code.toUpperCase())+'</div><p class="who" style="margin-top:0">Friends open this page, tap Online, and join with this code.</p><div class="chips" id="opl"></div>'+(RSRC==="peer"?'<button class="gh" id="inv" type="button" style="margin-bottom:14px">Copy invite link</button>':"")+(OL.host?'<div class="r"><button class="btn" id="st2" type="button">Start game</button>'+lv+'</div>':'<p class="who">Waiting for the host to start.</p>'+lv));$("lv").onclick=olLeave;if(OL.host)$("st2").onclick=hostStart;if($("inv"))$("inv").onclick=()=>{const u=location.origin+location.pathname+"?room="+OL.code;if(navigator.share)navigator.share({title:"YouKnowBall",text:"Join my room",url:u}).catch(()=>{});else cp($("inv"),u)};return}
if(s.ph==="end"){const L=s.sc.slice().sort((a,b)=>b[1]-a[1]);olCard('<h3>Full time</h3>'+L.map((x,k)=>'<div class="row'+(k?"":" top1")+'" style="animation-delay:'+k*40+'ms"><span><i class="rk">'+(k+1)+'</i>'+esc(x[0])+(x[2]===me()?" (you)":"")+'</span><b data-to="'+x[1]+'" data-from="0">'+x[1]+'</b></div>').join("")+'<p class="who"><b>'+esc(L.length&&L[0][1]>0?L[0][0]:"Nobody")+'</b> takes it.</p><div class="r">'+(OL.host?'<button class="btn" id="ag2" type="button">Back to lobby</button>':"")+lv+'</div>');if(L.length&&L[0][1]>0)confetti();$("lv").onclick=olLeave;if(OL.host)$("ag2").onclick=()=>{HS.ph="lobby";hostPub();olRender();try{R.lock(false)}catch(e){}};return}
olCard('<div class="hd bug"><span class="rd">Round <b id="orn"></b></span><span class="wp">Worth <b id="ow"></b></span><span id="ot" class="tn"></span></div><div class="stack" id="ocl"></div><div class="bar"><i id="otb"></i></div><div id="orv"></div><input id="og" aria-label="Your guess" placeholder="Type a name" autocomplete="off" autocapitalize="off"><div class="err" id="ofb"></div><div class="r"><button class="btn" id="ogb" type="button">Guess</button>'+lv+'</div><div class="strip" id="obw"><span class="strip-l">Live scores</span><div id="obd"></div></div>',"play olp");
$("lv").onclick=olLeave;$("ogb").onclick=olGuess;$("og").onkeydown=e=>{if(e.key==="Enter")olGuess()};$("og").focus({preventScroll:true})}
function olGuess(){
const v=$("og").value.trim();if(!v||!OL)return;const s=OL.host?snap():OL.H;if(!s||s.res)return;
OL.k++;$("og").value="";$("ofb").textContent="Checking";
if(OL.host){HS.k[me()]=OL.k;hostGuess(me(),v)}else R.presence({g:{r:s.r,t:v.slice(0,40),k:OL.k}}).catch(()=>{})}
function olUpd(s){
if(s.ph==="lobby"){$("opl").innerHTML=s.sc.map(r=>'<span class="chip">'+esc(r[0])+(r[2]===me()?" (you)":"")+'</span>').join("");return}
if(s.ph!=="play")return;
$("orn").textContent=s.r+" of "+s.N;$("ow").textContent=s.w+(s.w===1?" point":" points");$("ot").textContent=s.tl+"s";
const bar=$("otb");bar.style.width=Math.max(0,s.tl/(s.res?5:s.T)*100)+"%";bar.parentNode.classList.toggle("lo",!s.res&&s.tl<=5);$("ot").classList.toggle("lo",!s.res&&s.tl<=5);
if(OL.nc!==s.cl.length){OL.nc=s.cl.length;say("Clue "+s.cl.length+". "+s.cl[s.cl.length-1]);$("ocl").innerHTML=oclHtml(s.cl,!!s.res);fit()}
if(s.res&&!OL.rv){OL.rv=1;const rp=P.find(x=>x.n===s.res.n);say((s.res.by?s.res.by+" scored":"Nobody got it")+". The answer was "+s.res.n);$("ocl").innerHTML=oclHtml(s.cl,true);$("orv").innerHTML='<div class="rev'+(s.res.by?"":" miss")+'"><div class="rv-main"><small>'+(s.res.by?esc(s.res.by)+" scored "+s.res.pts:"Nobody got that one")+'</small><h2 data-fit>'+spl(s.res.n)+'</h2><p>'+esc(s.res.nat)+', '+esc(s.res.ft)+'</p></div><div class="pts">'+(s.res.by?'<span>+</span><b>'+s.res.pts+'</b>':'<b>0</b>')+'<em>pts</em></div></div>'+(rp?pcard(rp):"");fit();$("og").disabled=true;$("ogb").disabled=true}
const f=s.fb[me()];if(f){const q=f.split(":");if(+q[0]===OL.k){$("ofb").textContent=q[1]==="1"?"Correct":"Not quite";if(q[1]==="1"&&!OL.cf){OL.cf=1;const ck=s.at+":"+s.r;if(olCounted!==ck){olCounted=ck;bumpDist("o",s.cl.length)}beep(660,.15);buzz(VIB.solve);confetti();pulse("glow")}else if(q[1]==="0"&&OL.fk!==q[0]){OL.fk=q[0];beep(180,.2,"square");buzz(VIB.bad);pulse("shake")}}}
flipList($("obd"),s.sc.slice().sort((a,b)=>b[1]-a[1]).map(x=>'<div class="row" data-k="'+esc(String(x[2]))+'"><span>'+esc(x[0])+(x[2]===me()?" (you)":"")+'</span><b data-to="'+x[1]+'">'+x[1]+'</b></div>').join(""))}

function setup(){setup0();if(cfg.mode==="d"){dailyCal();addArchive()}}
function dailyCal(){const card=$("app").querySelector(".card");if(!card)return;const now=new Date(),y=now.getFullYear(),m=now.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),today=now.getDate();
let cells="";for(let i=0;i<first;i++)cells+='<span class="cd"></span>';
for(let d=1;d<=days;d++){const k=dkey(new Date(y,m,d)),pl=ST.daily[k],cls=d===today?" today":"";
  if(pl)cells+='<span class="cd ok'+cls+'" title="Played, '+pl.s+' pts">'+d+'</span>';else if(d<today)cells+='<span class="cd no'+cls+'">'+d+'</span>';else cells+='<span class="cd'+cls+'">'+d+'</span>'}
const box=document.createElement("div");box.className="dcal";box.innerHTML='<h3 style="margin:26px 0 12px">'+now.toLocaleDateString(undefined,{month:"long",year:"numeric"})+'</h3><div class="cdh"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="cgrid">'+cells+'</div><p class="who">Daily streak: <b>'+streak()+'</b>. Green days are played.</p>';card.appendChild(box)}
function streak(){const has=k=>!!(ST.daily[k]||(ST.wd&&ST.wd[k]));let d=new Date();if(!has(dkey(d)))d=new Date(Date.now()-864e5);let n=0;while(has(dkey(d))){n++;d=new Date(d-864e5)}return n}
/* guess distribution: rounds solved at clue 1..5, per clue-based mode. One increment per solved
   round (called once on the correct-guess path); a replay of a played Daily never reaches play,
   so it cannot double count. Online counts your own correct round only. */
const DMODES=[["c","Classic"],["p","Career path"],["d","Daily"],["s","Solo"],["o","Online"]];
const distRow=m=>Array.isArray(ST.dist&&ST.dist[m])&&ST.dist[m].length===5?ST.dist[m]:[0,0,0,0,0];
function bumpDist(m,sh){if(!DMODES.some(d=>d[0]===m))return;const a=(ST.dist=ST.dist||{})[m]||(ST.dist[m]=[0,0,0,0,0]);a[Math.min(5,Math.max(1,sh|0))-1]++;sv()}
function distHtml(){
 const rows=DMODES.map(d=>[d[1],distRow(d[0])]);
 if(!rows.some(r=>r[1].some(n=>n)))return"";
 const mx=Math.max(1,...rows.map(r=>Math.max(...r[1])));
 return '<h3>Solved at clue</h3><div class="dist">'+rows.map(r=>'<div class="drow"><span class="dlab">'+r[0]+'</span><div class="dbars" role="img" aria-label="'+r[0]+" solved at "+r[1].map((n,i)=>"clue "+(i+1)+": "+n).join(", ")+'">'+r[1].map((n,i)=>'<span class="dbar"><em>'+ (i+1) +'</em><span class="dtrk"><i style="--w:'+(n?Math.max(8,Math.round(n/mx*100)):0)+'%"></i></span><b>'+n+'</b></span>').join("")+'</div></div>').join("")+'</div>'}

/* honest note about where player information comes from and when it was last refreshed.
   Current clubs are a point-in-time snapshot, so the date is shown rather than implied. */
function aboutData(){if(!DATA_DATE)return"";
 return '<p class="aboutd">Player profiles (nationality, position, birth year, clubs) were last checked against '+
 '<a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer">Wikidata<span class="sr"> (opens in a new tab)</span></a> on '+
 '<b>'+esc(DATA_DATE)+'</b>. Current clubs are a snapshot and can change; birth years are cross-checked against English Wikipedia.</p>'}

/* resume: a serializable snapshot of an in-progress Classic / Career / Solo game, kept in the
   existing stats object (ST.rg inside ykbs). Versioned, and anything incompatible is dropped
   without a crash. Online is deliberately not resumable: the host owns the room's state. */
function rgSave(){try{
 if(!S||S.ph!=="play"||RGM.indexOf(S.mode)<0||!S.deck||!S.deck.length||!S.pl||!S.pl.length)return;
 ST.rg={v:RGV,m:S.mode,dk:S.dk||null,deck:S.deck.map(p=>p.n),i:S.i,sh:S.sh,t:S.t,
  names:S.pl.map(x=>x.n),pl:S.pl.map(x=>x.s),cs:S.cs||null,res:S.res.slice(),run:S.run,last:S.last,hl:!!S.hl,
  pen:!!S.pen,ac:!!S.ac,teams:!!S.teams,T:S.T||0,solo:S.solo?{miss:S.solo.miss,endless:!!S.solo.endless}:null,
  seed:typeof seed==="number"?seed:null,ch:CH?CH.code:null,el:S.t0?Date.now()-S.t0:0};
 sv()}catch(e){}}
function rgClear(){try{if(ST.rg){ST.rg=null;sv()}}catch(e){}}
function rgQuit(){if(S&&RGM.indexOf(S.mode)>=0)rgClear()} /* quitting a resumable game abandons it */
function rgGet(){try{const r=ST.rg;
 if(!r||typeof r!=="object"){rgClear();return null}
 const ok=r.v===RGV&&RGM.indexOf(r.m)>=0&&Array.isArray(r.deck)&&r.deck.length>0&&
  Array.isArray(r.names)&&r.names.length>0&&Array.isArray(r.pl)&&r.pl.length===r.names.length&&
  r.pl.every(n=>typeof n==="number"&&isFinite(n))&&Array.isArray(r.res)&&r.res.every(x=>typeof x==="number")&&
  (r.cs==null||(Array.isArray(r.cs)&&r.cs.length===5&&r.cs.every(x=>typeof x==="string")))&&
  (r.solo==null||(typeof r.solo==="object"&&Number.isInteger(r.solo.miss)))&&
  Number.isInteger(r.i)&&r.i>=0&&r.i<r.deck.length&&Number.isInteger(r.sh)&&r.sh>=1&&r.sh<=5;
 if(!ok){rgClear();return null}
 const by={};P.forEach(p=>by[p.n]=p);
 if(!r.deck.every(n=>by[n])){rgClear();return null}
 return Object.assign({},r,{by:by});
 }catch(e){rgClear();return null}}
function rgBanner(){const r=rgGet();if(!r)return"";
 const top=Math.max.apply(null,r.pl.concat([0]));
 return '<section class="rgban" aria-label="Saved game"><span class="rg-t">Game in progress</span><b>'+esc(rgLab(r.m))+'</b><span class="rg-s">Round '+(r.i+1)+' of '+r.deck.length+' · '+(r.pl.length>1?"top ":"")+top+' pts</span><button class="btn" id="rgr" type="button">Resume</button><button class="gh" id="rgd" type="button">Discard</button></section>'}
/* Resume restarts the current round's countdown but keeps the elapsed time, so a paused round
   cannot set a fake "fastest solve". Rounds, scores, turn, clue index and the current round's
   five clues come from the snapshot; a seeded game also continues its own clue order. */
function rgResume(){const r=rgGet();if(!r){enter=true;draw();return}
 if(r.ch)CH={code:r.ch};
 seed=typeof r.seed==="number"?r.seed:null;
 S={ph:"play",mode:r.m,dk:r.dk,pl:r.names.map((n,k)=>({n:n,s:r.pl[k]})),deck:r.deck.map(n=>r.by[n]),
  i:r.i,sh:r.sh,t:r.t,done:false,msg:"",err:"",last:typeof r.last==="number"?r.last:-1,hl:!!r.hl,
  cs:r.cs,res:r.res.slice(),run:r.run||0,t0:Date.now()-(r.el||0),pen:!!r.pen,ac:!!r.ac,teams:!!r.teams,
  T:r.T||0,solo:r.solo||null};
 enter=true;draw()}
function rgDiscard(){rgClear();enter=true;draw()}
function addArchive(){const card=$("app").querySelector(".card");if(!card)return;const box=document.createElement("div");box.className="arch";box.innerHTML='<h3 style="margin:18px 0 8px">Previous days</h3><div class="chips" id="ar" style="margin:0"></div>';card.appendChild(box);const w=$("ar");for(let i=1;i<=7;i++){const d=new Date(Date.now()-i*864e5),k=dkey(d),done=ST.daily[k];const b=document.createElement("button");b.type="button";b.className="gh";b.textContent=d.toLocaleDateString(undefined,{month:"short",day:"numeric"})+(done?" ✓":"");b.onclick=()=>start("d",k);w.appendChild(b)}}
function wordleSetup(h){h+='<div class="step"><i>03</i>Kick off</div><div class="r"><button class="btn" id="go" type="button">Play today</button><button class="gh" id="rnd" type="button" style="flex:0 0 auto">Random puzzle</button></div><div class="arch" style="margin-top:6px"></div><div class="err" aria-live="polite" id="er"></div></div>';$("app").innerHTML=h;document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{cfg.mode=b.dataset.m;save();enter=true;setup();post()});$("go").onclick=()=>start("w");$("rnd").onclick=()=>start("w",null,true);const w=$("app").querySelector(".arch");for(let i=1;i<=7;i++){const d=new Date(Date.now()-i*864e5),k=dkey(d),b=document.createElement("button");b.type="button";b.className="gh";b.style.cssText="padding:8px 12px;font-size:14px;margin:4px 6px 4px 0";b.textContent=d.toLocaleDateString(undefined,{month:"short",day:"numeric"})+(ST.wd&&ST.wd[k]?" ✓":"");b.onclick=()=>start("w",k);w.appendChild(b)}}
let WS=null,GS=null;
function cardImg(title,sub,draw){const c=document.createElement("canvas");c.width=1080;c.height=1350;const x=c.getContext&&c.getContext("2d");if(!x)return null; /* canvas blocked: skip the share image */
  x.fillStyle="#07130d";x.fillRect(0,0,1080,1350);x.fillStyle="#e6e0cb";x.fillRect(0,0,1080,200);
  x.fillStyle="#0b1d13";x.font="800 110px 'Barlow Condensed',Arial";x.fillText("YOUKNOWBALL",70,140);
  x.fillStyle="#f4f1e6";x.font="700 46px Barlow,Arial";x.fillText(title,70,262);
  x.fillStyle="#a3b9a9";x.font="600 38px Barlow,Arial";x.fillText(sub,70,318);
  draw(x);x.fillStyle="#a3b9a9";x.font="600 34px Barlow,Arial";x.fillText("YouKnowBall",70,1318);return c}
function dailyImg(d,k){return cardImg("Daily "+k,"Score "+d.s+(d.g?"":""),x=>{x.fillStyle="#f4f1e6";x.font="700 44px Barlow,Arial";d.g.split("\n").slice(0,12).forEach((ln,i)=>x.fillText(ln,70,420+i*66))})}
function addShot(c){const card=$("app").querySelector(".card");if(!c||!card)return;const box=document.createElement("div");box.className="shot";const url=c.toDataURL("image/png");
  box.innerHTML='<p class="who">Your result card</p><img alt="Result card" src="'+url+'"><div class="r"><button class="gh" id="shr" type="button">Share</button></div>';card.appendChild(box);
  $("shr").onclick=()=>c.toBlob(b=>{const f=new File([b],"youknowball.png",{type:"image/png"});if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:"YouKnowBall"}).catch(()=>{});else toast("Long-press the image to save it")})}
function wcmp(g,t){const sh=g.cl.split(", ").some(c=>t.cl.split(", ").includes(c));const d=(+t.yr)-(+g.yr),a=Math.abs(d);return[{l:LGL[g.lg]||g.lg,k:g.lg,s:g.lg===t.lg?"ok":"no"},{l:g.nat,s:g.nat===t.nat?"ok":"no"},{l:g.pos,s:g.pos===t.pos?"ok":"no"},{l:sh?"Shared club":"No club",s:sh?"ok":"no"},{l:g.yr+(d===0?"":d>0?" ↑":" ↓"),s:a===0?"ok":a<=3?"mid":"no"}]}
function wordleStart(dk,rand){ST.wd=ST.wd||{};
 const key=rand?null:(dk||dkey(new Date()));
 /* seeded target: daily/archived = the date (offline-reproducible); a random puzzle while a challenge is armed = the challenge seed; else random */
 const sd=key?hs(String(key)+"w"):CH?hs(chSeedCode()):null;seed=sd;const tgt=shuf(P)[0];seed=null;
 const played=key&&ST.wd[key];WS={key,t:tgt,g:[],done:!!played,won:!!(played&&played.w>0),res:played||null};S={ph:"wd"};enter=true;draw()}
function wordleGuess(){const v=norm($("wg").value);if(!v){setErr("er","Type a player first");return}const ms=matchPlayers(v);if(!ms.length){setErr("er","Not in the player list");return}if(ms.length>1){setErr("er","More than one player fits. Type the full name.");return}const p=ms[0];if(WS.g.some(r=>r.p===p)){setErr("er","You already tried them");return}WS.g.push({p,c:wcmp(p,WS.t)});if(p===WS.t){WS.won=true;WS.done=true;buzz(VIB.solve)}else if(WS.g.length>=6){WS.done=true}if(WS.done){wordleEnd()}else{draw()}}
function wordleRender(){if(WS.done){wordleEnd();return}const rows=WS.g.map((r,i)=>'<div class="wr'+(i===WS.g.length-1?" nw":"")+'"><span class="wn">'+esc(r.p.n)+'</span>'+r.c.map(x=>'<span class="wc '+x.s+'">'+(x.h||esc(String(x.l)))+'</span>').join("")+'</div>').join("")+Array(6-WS.g.length).fill('<div class="wr empty"><span class="wn"></span>'+'<span class="wc"></span>'.repeat(5)+'</div>').join("");const left=6-WS.g.length;$("app").innerHTML='<div class="card mid">'+chBanner()+'<div class="hd"><span>'+(WS.key?"Daily "+WS.key:"Random puzzle")+'</span><span>'+left+' tries left</span></div><div class="wh"><span></span><span>League</span><span>Nation</span><span>Position</span><span>Club</span><span>Born</span></div>'+rows+'<input id="wg" spellcheck="false" placeholder="Type a player" aria-label="Your guess" autocomplete="off" autocapitalize="off" style="margin-top:12px"><div class="err" aria-live="polite" id="er"></div><div class="r"><button class="btn" id="wgb" type="button">Guess</button><button class="gh" id="wgq" type="button">Give up</button><button class="gh qt" type="button">Quit</button></div></div>';post();$("wgb").onclick=wordleGuess;$("wgq").onclick=()=>{WS.done=true;wordleEnd()};$("wg").onkeydown=e=>{if(e.key==="Enter")wordleGuess()};$("wg").focus({preventScroll:true})}
function wordleImg(){const cols={ok:"#33cc7a",mid:"#f2c94c",no:"#2a3a31"},lab=["League","Nation","Position","Club","Born"];
  return cardImg(WS.key?"Daily "+WS.key:"Random puzzle",WS.won?"Got it in "+WS.g.length+(WS.g.length===1?" try":" tries"):"Out of tries",x=>{
    const top=400,cw=180,gap=12,left=70;lab.forEach((l,i)=>{x.fillStyle="#a3b9a9";x.font="700 30px Barlow,Arial";x.fillText(l.toUpperCase(),left+i*(cw+gap)+8,top)});
    for(let r=0;r<6;r++){const g=WS.g[r],y=top+44+r*136;
      if(g){x.fillStyle="#f4f1e6";x.font="800 40px 'Barlow Condensed',Arial";x.fillText(g.p.n.toUpperCase().slice(0,30),left,y)}
      for(let c=0;c<5;c++){const st=g?g.c[c].s:"",xx=left+c*(cw+gap),yy=y+20;x.fillStyle=g?cols[st]:"#14231a";x.fillRect(xx,yy,cw,76);
        if(g){x.fillStyle=st==="mid"?"#2a2000":st==="ok"?"#04210f":"#f4f1e6";x.font="700 30px Barlow,Arial";x.textAlign="center";x.fillText(String(g.c[c].k||g.c[c].l).slice(0,12),xx+cw/2,yy+48);x.textAlign="left"}}}})}
function wordleEnd(){const t=WS.t,n=WS.res?WS.res.w:WS.g.length,won=WS.res?WS.res.w>0:WS.won;const grid=WS.res?WS.res.g:WS.g.map(r=>r.c.map(x=>x.s==="ok"?"🟩":x.s==="mid"?"🟨":"⬛").join("")).join("\n");if(WS.key&&!WS.res){ST.wd=ST.wd||{};ST.wd[WS.key]={w:won?n:0,g:grid};ST.ls=Math.max(ST.ls||0,streak());sv()}
$("app").innerHTML='<div class="card narrow"><div class="rev"><div class="rv-main"><small>'+(won?"Got it in "+n+(n===1?" try":" tries"):"Out of tries")+'</small><h2 data-fit>'+spl(t.n)+'</h2><p>'+esc(t.nat)+', '+esc(t.pos)+', '+esc(t.cl)+'</p></div></div>'+pcard(t)+'<pre class="gridp">'+esc(grid)+'</pre><div class="r"><button class="btn" id="cpw" type="button">Share result</button><button class="gh" id="bkw" type="button">Back</button></div></div>';addShot(wordleImg());post();$("cpw").onclick=()=>share("YouKnowBall ⚽ Wordle — "+(won?n:"X")+"/6 "+(WS.key?"daily "+WS.key:"random puzzle")+"\n"+grid+"\n"+(WS.key?location.origin+location.pathname+"?d="+WS.key:rematchLink("w")),$("cpw"));$("bkw").onclick=()=>{S={ph:"setup"};enter=true;draw()}}
const GDIFF={e:{minClub:15,min:3,one:0},m:{minClub:8,min:2,one:0},h:{minClub:4,min:1,one:3}},LOOSE={minClub:4,min:1,one:0};
function gridGen(d,pool){
  const lv=GDIFF[d]||GDIFF.m,cnt={},cc={},gc={};
  P.forEach(p=>p.cl.split(", ").forEach(c=>{cnt[c]=(cnt[c]||0)+1;cc[c+"|"+p.nat]=(cc[c+"|"+p.nat]||0)+1}));
  P.filter(p=>inPool(p,pool||"x")).forEach(p=>p.cl.split(", ").forEach(c=>{gc[c+"|"+p.nat]=1}));
  const nats=[...new Set(P.map(p=>p.nat))];
  const tryLv=l=>{const clubs=Object.keys(cnt).filter(c=>cnt[c]>=l.minClub);
    for(let k=0;k<3000;k++){const rows=shuf(clubs).slice(0,3);if(rows.length<3)return null;
      const ok=nats.filter(n=>rows.every(r=>(cc[r+"|"+n]||0)>=l.min&&gc[r+"|"+n]));if(ok.length<3)continue;
      const cols=shuf(ok).slice(0,3);
      if(l.one){let ones=0;rows.forEach(r=>cols.forEach(c=>{if(cc[r+"|"+c]===1)ones++}));if(ones<l.one)continue}
      return{rows,cols}}return null};
  let g=tryLv(lv);if(g)return g;
  for(const l of d==="e"?[GDIFF.m,LOOSE]:[LOOSE]){g=tryLv(l);if(g){g.relaxed=true;return g}}
  return null}
function gridStart(){seed=CH?hs(chSeedCode()):null;const g=gridGen(cfg.gd,cfg.pool);seed=null;if(!g){S={ph:"setup"};draw();setErr("er","No grid fits this difficulty and pool. Try Medium or Everyone.");return}GS={rows:g.rows,cols:g.cols,f:Array(9).fill(null),used:[],miss:0,done:false,msg:g.relaxed?"Not enough players for that difficulty and pool, so this grid is a little easier.":"",d:cfg.gd||"m",max:cfg.gs||3,hint:!!cfg.gh,hl:({e:5,m:3,h:2})[cfg.gd||"m"],hm:0};S={ph:"grid"};enter=true;draw()}
function gridSetup(h){const d=cfg.gd||"m";
h+='<div class="r">'+opt("gd","Difficulty",[["e","Easy"],["m","Medium"],["h","Hard"]],d)+opt("gs","Strikes",[[3,"3 strikes"],[5,"5 strikes"],[99,"No strikes (practice)"]],cfg.gs||3)+opt("gp","Players",[["x","Everyone"],["0","Current stars"],["1","Legends"]],["x","0","1"].includes(cfg.pool)?cfg.pool:"x")+'</div><p class="who" id="gdesc">'+GDD[d]+'</p><div class="opts"><label><input type="checkbox" id="o_gh"'+(cfg.gh?" checked":"")+'>Show how many players fit each box</label><label><input type="checkbox" id="o_hap"'+(cfg.hap?" checked":"")+'>Vibration</label></div><div class="step"><i>03</i>Kick off</div><div class="r"><button class="btn" id="go" type="button">Start grid</button><button class="gh" id="gbst" type="button" style="flex:0 0 auto">Best: '+gbest(d)+'/9</button></div><div class="err" aria-live="polite" id="er"></div></div>';
$("app").innerHTML=h;
document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{cfg.mode=b.dataset.m;save();enter=true;setup();post()});
$("gd").onchange=()=>{const v=$("gd").value;$("gdesc").textContent=GDD[v];$("gbst").textContent="Best: "+gbest(v)+"/9"};
$("go").onclick=()=>{cfg.gd=$("gd").value;cfg.gs=+$("gs").value;cfg.pool=$("gp").value;cfg.gh=$("o_gh").checked;if($("o_hap"))cfg.hap=$("o_hap").checked;save();start("g")}}
function gridRender(){if(GS.done){gridEnd();return}const fit=i=>P.filter(p=>p.cl.split(", ").includes(GS.rows[Math.floor(i/3)])&&p.nat===GS.cols[i%3]).length;const cell=i=>GS.f[i]?'<div class="gc on">'+esc(GS.f[i].n.split(" ").pop())+'</div>':'<div class="gc">'+(GS.hint?'<span>?</span><small>'+fit(i)+' fit</small>':'?')+'</div>';let rows='<div class="gh3"><span></span>'+GS.cols.map(c=>'<span class="gl" data-fit>'+esc(c)+'</span>').join("")+'</div>';for(let r=0;r<3;r++)rows+='<div class="gh3"><span class="gl" data-fit>'+esc(GS.rows[r])+'</span>'+[0,1,2].map(c=>cell(r*3+c)).join("")+'</div>';const n=GS.f.filter(Boolean).length;$("app").innerHTML='<div class="card mid">'+chBanner()+'<div class="hd"><span>Boxes <b>'+n+'</b>/9 <span class="badge'+(GS.d==="h"?" h":"")+'">'+GDN[GS.d||"m"]+'</span></span><span class="stk">'+(GS.max>=99?"Practice, no strikes":'<b>'+(GS.max-GS.miss)+'</b> strikes left')+'</span></div>'+rows+'<p class="who" style="font-size:13px">Name a player who fits a box. They fill the first open box they match.</p><input id="gq" placeholder="Type a player" aria-label="Your guess" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="err'+(GS.hm?" okm":"")+'" aria-live="polite" id="er">'+esc(GS.msg||"")+'</div><div class="r"><button class="btn" id="gqb" type="button">Place</button><button class="gh" id="ghint" type="button"'+(GS.max<99&&GS.hl<=0?" disabled":"")+'>Hint ('+(GS.max>=99?"&infin;":GS.hl)+')</button><button class="gh" id="gnew" type="button">New grid</button><button class="gh qt" type="button">Quit</button></div></div>';post();$("gqb").onclick=gridGuess;$("gq").onkeydown=e=>{if(e.key==="Enter")gridGuess()};$("gnew").onclick=()=>gridStart();$("ghint").onclick=gridHint;$("gq").focus({preventScroll:true})}
function gridHint(){if(GS.max<99&&GS.hl<=0)return;
  const opts=[];for(let i=0;i<9;i++){if(GS.f[i])continue;const ps=P.filter(p=>!GS.used.includes(p.n)&&p.cl.split(", ").includes(GS.rows[Math.floor(i/3)])&&p.nat===GS.cols[i%3]);if(ps.length)opts.push([i,ps])}
  GS.hm=1;
  if(!opts.length){GS.msg="No hint available: every player who fits an open box is already used.";draw();return}
  const[i,ps]=opts[Math.floor(Math.random()*opts.length)],p=ps[Math.floor(Math.random()*ps.length)];
  if(GS.max<99)GS.hl--;
  GS.msg="Hint: "+GS.rows[Math.floor(i/3)]+" + "+GS.cols[i%3]+" fits "+p.ini+" (surname has "+p.n.split(" ").pop().replace(/[^A-Za-z]/g,"").length+" letters)";draw()}
function gridGuess(){const v=norm($("gq").value);if(!v)return;GS.hm=0;const ms=matchPlayers(v);if(!ms.length){GS.msg="Not in the player list";draw();return}if(ms.length>1){GS.msg="More than one player fits. Type the full name.";draw();return}const p=ms[0];if(GS.used.includes(p.n)){GS.msg=p.n+" is already used";draw();return}const idx=GS.f.findIndex((x,i)=>!x&&p.cl.split(", ").includes(GS.rows[Math.floor(i/3)])&&p.nat===GS.cols[i%3]);if(idx<0&&GS.f.some((x,i)=>x&&p.cl.split(", ").includes(GS.rows[Math.floor(i/3)])&&p.nat===GS.cols[i%3])){GS.msg=p.n+" fits a box that is already filled. No strike.";draw();return}
GS.used.push(p.n);if(idx<0){S.fx="shake";buzz(VIB.bad);if(GS.max<99)GS.miss++;GS.msg="No open box fits "+p.n+(GS.max<99?". Strike "+GS.miss+"/"+GS.max:". No strikes in practice.");if(GS.max<99&&GS.miss>=GS.max){GS.done=true}draw();return}GS.f[idx]=p;buzz(VIB.good);GS.msg="";if(GS.f.every(Boolean))GS.done=true;draw()}
function gridImg(){return cardImg("Grid","Boxes "+GS.f.filter(Boolean).length+"/9 on "+GDN[GS.d||"m"],x=>{
  const top=400,cs=230,gap=14,left=330;GS.cols.forEach((c,i)=>{x.fillStyle="#f4f1e6";x.font="800 40px 'Barlow Condensed',Arial";x.textAlign="center";x.fillText(c.toUpperCase().slice(0,14),left+i*(cs+gap)+cs/2,top+30);x.textAlign="left"});
  for(let r=0;r<3;r++){const y=top+60+r*(cs+gap);x.fillStyle="#f4f1e6";x.font="800 40px 'Barlow Condensed',Arial";x.textAlign="right";x.fillText(GS.rows[r].replace(/^Borussia /,"").toUpperCase().slice(0,14),left-24,y+cs/2+14);x.textAlign="left";
    for(let c=0;c<3;c++){const i=r*3+c,p=GS.f[i];x.fillStyle=p?"#33cc7a":"#14231a";x.fillRect(left+c*(cs+gap),y,cs,cs);
      if(p){x.fillStyle="#04210f";x.font="800 46px 'Barlow Condensed',Arial";x.textAlign="center";x.fillText(p.n.split(" ").pop().toUpperCase().slice(0,12),left+c*(cs+gap)+cs/2,y+cs/2+16);x.textAlign="left"}}}})}
function gridEnd(){const n=GS.f.filter(Boolean).length,d=GS.d||"m";
if(!GS.rec){GS.rec=1;ST.gg=(ST.gg||0)+1;if(GS.max<99){ST.gb=Math.max(ST.gb||0,n);ST.gbd=ST.gbd||{};ST.gbd[d]=Math.max(ST.gbd[d]||0,n)}sv()}
let ms="";GS.f.forEach((x,i)=>{if(x)return;const r=GS.rows[Math.floor(i/3)],c=GS.cols[i%3],a=P.filter(p=>p.cl.split(", ").includes(r)&&p.nat===c).slice(0,3).map(p=>p.n);ms+='<div class="row"><span>'+esc(r)+' + '+esc(c)+'</span><b class="ans">'+esc(a.join(", "))+'</b></div>'});
$("app").innerHTML='<div class="card narrow"><h3>Grid finished</h3><div class="stat"><div><b>'+n+'/9</b><span>Boxes filled</span></div><div><b>'+(GS.max<99?gbest(d)+"/9":"-")+'</b><span>'+(GS.max<99?"Best on "+GDN[d]:"Practice run")+'</span></div></div>'+(ms?'<p class="who">Boxes you missed, and who fits</p>'+ms:"")+'<div class="r"><button class="btn" id="gan" type="button">New grid</button><button class="gh" id="gsh" type="button">Share result</button><button class="gh" id="gbk" type="button">Back</button></div></div>';addShot(gridImg());post();$("gan").onclick=()=>gridStart();$("gsh").onclick=()=>share("YouKnowBall ⚽ Grid — "+n+"/9 boxes on "+GDN[d]+"\n"+rematchLink("g"),$("gsh"));$("gbk").onclick=()=>{S={ph:"setup"};enter=true;draw()}}

setup();post();
/* open a challenge or a dated daily straight from the link; no params = the normal home screen.
   A challenge that is already in progress is NOT restarted: Home shows the Resume banner instead. */
const rgs=rgGet();
if(CH){if(!rgs||rgs.ch!==SEEDQ){if(cfg.mode==="w")start("w",null,true);else start(cfg.mode)}}
else if(DAILYOK)start("d",DAILYQ);
/* clear the challenge from anywhere without touching the params in history */
document.addEventListener("click",e=>{
 if(!e.target.closest)return;
 if(e.target.closest("#rgr")){rgResume();return}
 if(e.target.closest("#rgd")){rgDiscard();return}
 if(!e.target.closest("#cown"))return;
 CH=null;enter=true;S={ph:"setup"};draw();
});
(function(){const el=$("intro");if(!el)return;
if(matchMedia("(prefers-reduced-motion: reduce)").matches){el.remove();return}
$("it").innerHTML=spl("YouKnowBall",650);$("ik").textContent=P.length+" players on the team sheet";
let gone=false;const go=()=>{if(gone)return;gone=true;el.classList.add("out");setTimeout(()=>el.remove(),340)};
el.addEventListener("click",go);addEventListener("keydown",go,{once:true});setTimeout(go,2100)})();