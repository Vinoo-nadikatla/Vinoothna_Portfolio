// ============================================================
//  THE INTELLIGENCE ENGINE — choreography
//  requires: gsap, ScrollTrigger, Lenis (UMD globals)
// ============================================================
(function(){
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=(t)=>t*t*(3-2*t);
  // window-fade alpha for a phase between [s,e], with margins
  function band(p,s,e,m=0.05){
    if(p<s-m||p>e+m) return 0;
    if(p<s) return smooth((p-(s-m))/m);
    if(p>e) return 1-smooth((p-e)/m);
    return 1;
  }

  /* -------------------------------------------------- BOOT */
  const boot = $('#boot');
  const bbar = $('#boot .bbar i');
  const bpct = $('#boot .pct');
  const blab = $('#boot .blab');
  const labels = ['INITIALISING SENSOR ARRAY','CALIBRATING WAVELET KERNELS',
                  'LOADING INFERENCE GRAPH','SYNCHRONISING SUBSYSTEMS','ENGINE ONLINE'];
  let bp = 0, li = 0;
  const bootTimer = setInterval(()=>{
    bp = Math.min(100, bp + Math.random()*16 + 5);
    bbar.style.width = bp+'%';
    bpct.textContent = String(Math.floor(bp)).padStart(3,'0')+' %';
    const idx = Math.min(labels.length-1, Math.floor(bp/100*labels.length));
    if(idx!==li){ li=idx; blab.textContent = labels[idx]; }
    if(bp>=100){
      clearInterval(bootTimer);
      blab.textContent = labels[labels.length-1];
      setTimeout(startExperience, 520);
    }
  }, 230);
  blab.textContent = labels[0];

  /* -------------------------------------------------- SIGNAL WAVEFORM */
  const wave = $('#wave');
  const wctx = wave.getContext('2d');
  let W=0,H=0,dpr=Math.min(devicePixelRatio,2);
  function sizeWave(){
    const r = wave.getBoundingClientRect();
    W=r.width; H=r.height;
    wave.width=W*dpr; wave.height=H*dpr;
    wctx.setTransform(dpr,0,0,dpr,0,0);
  }
  sizeWave(); addEventListener('resize', sizeWave);

  // noise: 1 = chaotic, 0 = clean. amp scales with visibility.
  const sig = { noise:1, amp:1, vis:1 };
  let tt=0;
  function rnd(seed){ const x=Math.sin(seed*127.1+tt*0.7)*43758.5453; return x-Math.floor(x); }
  function renderWave(){
    tt+=0.018;
    window.__sigNoise=sig.noise;
    window.__frames=(window.__frames||0)+1;
    wctx.clearRect(0,0,W,H);
    if(sig.vis<=0.01){ return; }
    const midY=H*0.5;
    // layered waveform
    const layers=[
      {col:'rgba(0,245,212,', a:1.0, f:0.012, sp:1.0, w:1.8},
      {col:'rgba(123,47,247,',a:0.5, f:0.022, sp:0.6, w:1.2},
      {col:'rgba(255,0,110,', a:0.32,f:0.034, sp:1.4, w:1.0},
    ];
    layers.forEach((L,li)=>{
      wctx.beginPath();
      for(let x=0;x<=W;x+=2){
        const clean=Math.sin(x*L.f + tt*L.sp)*60*L.a;
        const noisy=(rnd(x*0.05+li*9)-0.5)*180*L.a;
        const y=midY + (lerp(clean,clean+noisy,sig.noise))*sig.amp*(H/700+0.5);
        x===0?wctx.moveTo(x,y):wctx.lineTo(x,y);
      }
      wctx.strokeStyle=L.col+(L.a*0.85*sig.vis)+')';
      wctx.lineWidth=L.w;
      wctx.shadowColor=L.col+'0.7)';
      wctx.shadowBlur=14;
      wctx.stroke();
    });
    wctx.shadowBlur=0;
  }
  function drawWave(){ renderWave(); requestAnimationFrame(drawWave); }
  drawWave();
  // verification hooks (used when rAF is throttled in capture contexts)
  window.__viz = { sig, renderWave, setNoise(n){ sig.noise=n; renderWave(); } };
  window.__forceReveal = function(){
    document.querySelectorAll('.signal-line .word').forEach(w=>{ w.style.opacity=1; w.style.transform='none'; w.style.filter='none'; });
    ['.signal-core .eyebrow','.signal-greet','.signal-bio','.signal-sub','.scrollcue'].forEach(s=>{ const el=document.querySelector(s); if(el){ el.style.opacity=1; el.style.transform='none'; } });
    document.querySelectorAll('.fade-up')
      .forEach(e=>{ e.style.opacity=1; e.style.transform='none'; });
  };

  /* -------------------------------------------------- START */
  function startExperience(){
    boot.classList.add('hide');
    window.__started=true;
    document.body.classList.add('revealed');
    setTimeout(()=>boot.remove(), 1100);

    // signal intro words
    const tl = gsap.timeline({ delay:0.25 });
    tl.to('.signal-core .eyebrow',{opacity:1,duration:.8})
      .to('.signal-greet',{opacity:1,y:0,duration:.8,ease:'power3.out'},'-=0.35')
      .to('.signal-line .word',{opacity:1,y:0,filter:'blur(0px)',duration:1.0,
           stagger:0.12, ease:'power3.out'},'-=0.3')
      .to('.signal-bio',{opacity:1,duration:.8},'-=0.3')
      .to('.signal-sub',{opacity:1,duration:.8},'-=0.45')
      .to('.scrollcue',{opacity:1,duration:.8},'-=0.3');
    // the signal cleans up as it becomes "intelligence"
    gsap.to(sig,{noise:0.18,duration:3.0,delay:0.8,ease:'power2.inOut'});

    initScroll();
  }

  /* -------------------------------------------------- SCROLL ENGINE */
  function initScroll(){
    gsap.registerPlugin(ScrollTrigger);
    const params=new URLSearchParams(location.search);
    if(params.has('review') || window.__IE_REVIEW){ return setupReview(params); }
    const lenis = new Lenis({ lerp:0.085, wheelMultiplier:1, smoothWheel:true });
    lenis.on('scroll', ScrollTrigger.update);
    // independent rAF for Lenis (keep it OFF the gsap ticker so a hiccup
    // here can never stall gsap tweens)
    function raf(time){ lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    window.__lenis = lenis;

    // signal fades / waveform amplitude reacts as you leave chapter 0
    ScrollTrigger.create({
      trigger:'#signal', start:'top top', end:'bottom top', scrub:true,
      onUpdate:(self)=>{ sig.vis=1-self.progress; sig.amp=1-self.progress*0.6;
        gsap.set('.signal-core',{opacity:1-self.progress*1.4, y:-self.progress*60}); }
    });

    // GENERIC REVEAL — every .fade-up across all chapters/sections
    $$('.fade-up').forEach((el)=>{
      gsap.to(el,{opacity:1,y:0,duration:1,ease:'power3.out',
        scrollTrigger:{trigger:el,start:'top 86%'}});
    });

    // NAV RAIL active state + progress meter
    const railBtns = $$('.rail button');
    const meterFill = $('.meter .bar i');
    const meterPct  = $('.meter .pctlabel');
    function setActiveRail(btns, id){
      btns.forEach(b=>b.classList.toggle('active', b.dataset.go===id));
    }
    // rail click -> scroll
    railBtns.forEach(b=>{
      b.addEventListener('click',()=>{
        const t=document.getElementById(b.dataset.go);
        if(t) lenis.scrollTo(t,{offset:0});
      });
    });
    // overall progress meter
    ScrollTrigger.create({ start:0, end:'max', scrub:true,
      onUpdate:(self)=>{ const p=Math.round(self.progress*100);
        meterFill.style.width=p+'%'; if(meterPct) meterPct.textContent=String(p).padStart(2,'0'); }});

    // build the #predict pin FIRST so its spacer height exists before we
    // measure the rail trigger positions of every section after it
    setupPredict(lenis);

    // rail active-state triggers — created after the pin so their start/end
    // are computed against the pinned layout (and recompute on refresh)
    railBtns.forEach((b)=>{
      const el=document.getElementById(b.dataset.go); if(!el) return;
      ScrollTrigger.create({ trigger:el, start:'top 45%', end:'bottom 45%',
        invalidateOnRefresh:true,
        onToggle:(self)=>{ if(self.isActive){ setActiveRail(railBtns, b.dataset.go); } }});
    });

    // settle
    ScrollTrigger.refresh();
  }

  /* -------------------------------------------------- REVIEW MODE (verification only) */
  function setupReview(params){
    document.body.classList.add('revealed');
    if(window.__forceReveal) window.__forceReveal();
    if(window.__viz) window.__viz.setNoise(0.3);
    const only=(params.get('only')) || window.__IE_ONLY;
    if(only){ ['signal','about','capabilities','observe','predict','research','teaser','work','stack','contact'].forEach(id=>{
      if(id!==only){ const s=document.getElementById(id); if(s) s.style.display='none'; } }); }
    const pin=document.querySelector('#predict .pin'); if(pin) pin.style.position='relative';
    if(window.Bearing) window.Bearing.debugRender({spin:1.0,explode:parseFloat(params.get('explode')||'0'),tilt:1});
    const open=document.querySelector('.predict-open'); if(open) open.style.opacity=1;
    const ph=params.get('phase');
    if(ph){ const el=document.querySelector('.phase[data-phase="'+ph+'"]');
      if(el){ el.style.opacity=1;
        el.style.transform=(el.classList.contains('phase-left')||el.classList.contains('phase-right'))?'translateY(-50%)':'';
        if(open) open.style.opacity=0; } }
    if(params.has('acc')){ const a=document.querySelector('.accuracy'); if(a) a.style.opacity=1; if(open) open.style.opacity=0; }
  }

  /* -------------------------------------------------- PREDICT FLAGSHIP */
  function setupPredict(lenis){
    const section = $('#predict');
    const pin = $('#predict .pin');
    const bigOpen = $('.predict-open');
    const phases = $$('.stage-ui .phase');
    const acc = $('.accuracy');
    const accNum = $('.accuracy .acc-num');
    const accDelta = $('.accuracy .acc-delta');
    const accSub = $('.accuracy .acc-sub');

    // phase windows [start,end] within pin progress
    const PH = {
      raw:[0.09,0.24], wavelet:[0.26,0.40], feature:[0.42,0.57],
      gbm:[0.59,0.72], shap:[0.74,0.86]
    };

    ScrollTrigger.create({
      trigger:section, start:'top top', end:'+=560%', pin:pin, scrub:true,
      anticipatePin:1,
      onUpdate:(self)=>{
        const p=self.progress;

        // opening label fades out fast
        gsap.set(bigOpen,{opacity:clamp(1-p*7,0,1)});

        // bearing drive
        const explode = Math.max(
          band(p,PH.feature[0],PH.gbm[1],0.06)*0.9,  // open during internals
          0
        );
        if(window.Bearing){
          window.Bearing.update({
            spin: p*Math.PI*3.2,
            explode: explode,
            tilt: Math.sin(p*Math.PI)
          });
        }

        // phase panels
        phases.forEach(ph=>{
          const k=ph.dataset.phase, win=PH[k];
          if(!win){ return; }
          const a=band(p,win[0],win[1],0.05);
          ph.style.opacity=a;
          const dir = ph.classList.contains('phase-right')?1:-1;
          ph.style.transform=(ph.classList.contains('phase-left')||ph.classList.contains('phase-right'))
            ? `translateY(-50%) translateX(${(1-a)*30*dir}px)` : '';
        });

        // ACCURACY reveal (last act)
        const aA=band(p,0.88,1.0,0.05);
        acc.style.opacity=aA;
        if(aA>0.01){
          const tloc=clamp((p-0.88)/(0.97-0.88),0,1);
          const val=lerp(97.24,98.27,smooth(tloc));
          accNum.textContent=val.toFixed(2)+'%';
          accDelta.style.opacity = tloc>0.6?1:0;
          accSub.querySelector('.lead-state').textContent = tloc<0.55?'BASELINE — GRADIENT BOOSTING':'OPTIMIZED — HYPERPARAMETER TUNED';
        }
      }
    });
  }
})();
