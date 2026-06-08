// ============================================================
//  PORTFOLIO LAYER — interactions
//  Tech stack branches · copy buttons · contact form ·
//  recruiter mode · portrait parallax · scan drift
//  (GSAP/ScrollTrigger reveals for these sections are handled
//   generically in engine.js via the global .fade-up sweep)
// ============================================================
(function(){
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];

  /* ---- tech stack: toggle branches ---- */
  $$('.branch .bhead').forEach(h=>{
    h.addEventListener('click',()=>{ h.closest('.branch').classList.toggle('open'); });
  });

  /* ---- copy buttons (email / phone) ---- */
  $$('.copybtn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const txt = btn.dataset.copy;
      try{
        if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(txt); }
        else { const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta);
          ta.select(); document.execCommand('copy'); ta.remove(); }
        const old=btn.textContent; btn.textContent='COPIED'; btn.classList.add('done');
        setTimeout(()=>{ btn.textContent=old; btn.classList.remove('done'); },1600);
      }catch(e){ btn.textContent='COPY?'; }
    });
  });

  /* ---- contact form: graceful client-side (mailto) ---- */
  const form = $('#contactForm');
  if(form){
    form.addEventListener('submit',(e)=>{
      e.preventDefault();
      const name=$('#cf-name').value.trim();
      const email=$('#cf-email').value.trim();
      const msg=$('#cf-msg').value.trim();
      const note=$('#formNote');
      if(!name||!email||!msg){ note.textContent='Please complete all fields.'; note.classList.remove('ok'); return; }
      const subject=encodeURIComponent(`Portfolio enquiry from ${name}`);
      const body=encodeURIComponent(`${msg}\n\n— ${name}\n${email}`);
      window.location.href=`mailto:vinoothnanadikatla@gmail.com?subject=${subject}&body=${body}`;
      note.textContent='Opening your email client…'; note.classList.add('ok');
      setTimeout(()=>{ note.textContent='Transmission ready. Thank you, '+name.split(' ')[0]+'.'; },1800);
    });
  }

  /* ---- recruiter mode ---- */
  const recBtn=$('#recruiterBtn'), recOv=$('#recruiterOverlay'), recClose=$('#recClose');
  function openRec(){ recOv.classList.add('show'); document.documentElement.style.overflow='hidden';
    if(window.__lenis) window.__lenis.stop(); }
  function closeRec(){ recOv.classList.remove('show'); document.documentElement.style.overflow='';
    if(window.__lenis) window.__lenis.start(); }
  if(recBtn) recBtn.addEventListener('click',openRec);
  if(recClose) recClose.addEventListener('click',closeRec);
  if(recOv) recOv.addEventListener('click',(e)=>{ if(e.target===recOv) closeRec(); });
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape'&&recOv&&recOv.classList.contains('show')) closeRec(); });

  /* ---- portrait parallax (pointer-reactive tilt) ---- */
  const frame=$('#portraitFrame'), stage=frame?frame.closest('.portrait-stage'):null;
  if(frame && stage && matchMedia('(pointer:fine)').matches){
    stage.addEventListener('pointermove',(e)=>{
      const r=stage.getBoundingClientRect();
      const dx=(e.clientX-(r.left+r.width/2))/r.width;
      const dy=(e.clientY-(r.top+r.height/2))/r.height;
      frame.style.transform=`rotateY(${8 - dx*14}deg) rotateX(${3 + dy*12}deg)`;
    });
    stage.addEventListener('pointerleave',()=>{ frame.style.transform='rotateY(8deg) rotateX(3deg)'; });
  }

  /* ---- portrait scanline drift (no rAF — setInterval works in capture) ---- */
  const pscan=$('#portraitScan');
  if(pscan){ let y=-20,dir=1;
    setInterval(()=>{ const h=(pscan.parentElement?pscan.parentElement.clientHeight:500);
      y+=dir*2.2; if(y>h||y<-120) dir*=-1; pscan.style.top=y+'px'; },28); }
})();
