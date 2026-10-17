/* YouKnowBall v12 - presentation helpers only. No game logic in here. */
const RMQ=matchMedia("(prefers-reduced-motion: reduce)");

/* Shrink any [data-fit] element until it fits its slab (width, and height cap for live clues). */
function fit(){
  const vh=window.innerHeight||800;
  document.querySelectorAll("[data-fit]").forEach(el=>{
    el.style.fontSize="";
    if(!el.clientWidth&&!el.offsetWidth)return;
    const cap=el.classList.contains("ct")?Math.max(120,vh*.4):1e9;
    let fs=parseFloat(getComputedStyle(el).fontSize),n=0;
    const par=el.parentElement;
    const over=()=>el.scrollWidth>el.clientWidth+1||el.offsetWidth>par.clientWidth+1||el.scrollHeight>cap;
    while(over()&&fs>9&&n++<48){fs*=.94;el.style.fontSize=fs+"px"}
  });
}
addEventListener("resize",()=>{clearTimeout(fit.t);fit.t=setTimeout(fit,80)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>fit());

/* Restart a one-shot state animation class on the current screen card (shake, glow). */
function pulse(cls){
  const c=document.querySelector("#app>.card");if(!c)return;
  c.classList.remove(cls);void c.offsetWidth;c.classList.add(cls);
}

/* Tween a number in the DOM from el.dataset.from to el.dataset.to (640→560ms cubic ease).
   Reused by post() for score pops and by flipList() for the live online scoreboard. */
function tweenNum(el){
  const to=+el.dataset.to,fr=+(el.dataset.from||0);
  if(!isFinite(to)||!isFinite(fr)||to===fr||typeof requestAnimationFrame!=="function"||RMQ.matches)return;
  el.textContent=fr;el.classList.add("pop");
  const t0=performance.now();
  (function f(t){const k=Math.min(1,(t-t0)/560);el.textContent=Math.round(fr+(to-fr)*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)})(t0);
}

/* FLIP: swap a list's markup, then glide keyed children from their old position.
   Skips the rebuild entirely when the markup is unchanged (e.g. online hostTick),
   and tweens any <b data-to> whose previous keyed value differs. */
function flipList(box,html){
  const first={},was={};
  [...box.children].forEach(k=>{if(!k.dataset.k)return;first[k.dataset.k]=k.getBoundingClientRect();const b=k.querySelector("b");if(b)was[k.dataset.k]=+b.textContent});
  if(box.dataset.fk===html)return;
  box.dataset.fk=html;
  box.innerHTML=html;
  if(RMQ.matches)return;
  [...box.children].forEach(k=>{
    if(k.dataset.k&&was[k.dataset.k]!=null&&!isNaN(was[k.dataset.k])){
      const b=k.querySelector("b[data-to]");if(b){b.dataset.from=was[k.dataset.k];tweenNum(b)}
    }
    const f=first[k.dataset.k];if(!f)return;
    const l=k.getBoundingClientRect(),dx=f.left-l.left,dy=f.top-l.top;
    if(!dx&&!dy)return;
    k.style.transition="none";k.style.transform="translate("+dx+"px,"+dy+"px)";
    void k.offsetWidth;
    k.style.transition="transform 280ms cubic-bezier(.16,1,.3,1)";k.style.transform="";
  });
}

/* Quit to the mode screen from any round. Two taps so it can't be hit by accident. */
document.addEventListener("click",e=>{
  const b=e.target.closest(".qt");if(!b)return;
  if(!b.classList.contains("arm")){
    b.dataset.t=b.textContent;b.textContent="Tap again to quit";b.classList.add("arm");
    clearTimeout(b._t);b._t=setTimeout(()=>{if(b.isConnected){b.textContent=b.dataset.t;b.classList.remove("arm")}},3000);return}
  stopT();S={ph:"setup"};enter=true;draw();
});

/* Visible error messages instead of silent failures. Progress is kept. */
function toast(m){let t=document.getElementById("toast");if(!t){t=document.createElement("div");t.id="toast";t.setAttribute("role","alert");t.onclick=()=>t.remove();document.body.appendChild(t)}t.textContent=m;clearTimeout(t._t);t._t=setTimeout(()=>t.remove(),5000)}
addEventListener("error",e=>{console.error(e.error||e.message);toast("Something went wrong: "+(e.message||"unknown error")+". Your progress is kept.")});
addEventListener("unhandledrejection",e=>{console.error(e.reason);toast("A network or peer error happened. Try again.")});
