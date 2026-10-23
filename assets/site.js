(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = $('motionToggle');
  let savedPause = false;
  try { savedPause = localStorage.getItem('portfolio-motion') === 'off'; } catch { /* Storage is optional. */ }
  let paused = motionPreference.matches || savedPause;

  // Keep the complete portfolio navigation available on smaller screens.
  const navToggle = $('navToggle');
  const navLinks = $('navLinks');
  const navigation = document.querySelector('.site-header');
  const links = [...navLinks.querySelectorAll('a')];
  const sections = links.map(link => document.querySelector(link.hash)).filter(Boolean);
  const closeMenu = () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  };
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', event => {
    if (!navigation.contains(event.target)) closeMenu();
  });
  matchMedia('(min-width: 1001px)').addEventListener('change', closeMenu);
  document.querySelectorAll('a[href^="#"]:not([data-project])').forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
      const target = $(link.hash.slice(1));
      if (target?.hasAttribute('tabindex')) requestAnimationFrame(() => target.focus({ preventScroll: true }));
    });
  });

  const progress = document.querySelector('.scroll-progress');
  let scrollQueued = false;
  // The project section appears before the career sections in the workshop layout.
  const orderedSections = [...sections].sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  function updateScroll() {
    scrollQueued = false;
    const scrollable = root.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${scrollable > 0 ? Math.min(1, scrollY / scrollable) : 0})`;
    const threshold = navigation.getBoundingClientRect().height + Math.min(150, innerHeight * .23);
    let active = null;
    for (const section of orderedSections) {
      if (section.getBoundingClientRect().top <= threshold) active = section.id;
    }
    if (scrollable > 0 && scrollY >= scrollable - 4) active = orderedSections.at(-1).id;
    links.forEach(link => {
      if (link.hash === `#${active}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function queueScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateScroll);
  }
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', queueScroll, { passive: true });
  document.querySelectorAll('.project-details').forEach(detail => detail.addEventListener('toggle', queueScroll));
  document.fonts?.ready.then(queueScroll);

  // Theme is a presentation preference; every section retains the same content.
  function setBlueprint(on) {
    document.body.classList.toggle('blueprint', on);
    $('viewSwitch').setAttribute('aria-pressed', String(on));
    $('viewLabel').textContent = on ? 'Workshop mode' : 'Blueprint mode';
    document.querySelector('meta[name="theme-color"]').content = on ? '#172e40' : '#eeede7';
  }
  try { setBlueprint(localStorage.getItem('portfolio-theme') === 'blueprint'); } catch { setBlueprint(false); }
  $('viewSwitch').addEventListener('click', () => {
    const on = !document.body.classList.contains('blueprint');
    setBlueprint(on);
    try { localStorage.setItem('portfolio-theme', on ? 'blueprint' : 'workshop'); } catch { /* Storage is optional. */ }
  });

  // Read actual project markup, so dialogs cannot drift from the project notes.
  const dialog = $('projectDialog');
  let projectOpener = null;
  document.querySelectorAll('[data-project]').forEach(opener => {
    if (typeof dialog.showModal === 'function') opener.setAttribute('aria-haspopup', 'dialog');
    opener.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
      if (typeof dialog.showModal !== 'function') return;
      const source = $(`project-${opener.dataset.project}`)?.querySelector('.project-body');
      if (!source) return;
      event.preventDefault();
      const content = source.cloneNode(true);
      content.querySelector('.project-icon')?.remove();
      const title = content.querySelector('h3');
      $('modalTitle').textContent = title.textContent;
      title.remove();
      const detail = content.querySelector('details');
      if (detail) detail.replaceWith(...[...detail.childNodes].filter(node => node.nodeName !== 'SUMMARY'));
      content.querySelectorAll('h4').forEach(heading => {
        const promotedHeading = document.createElement('h3');
        promotedHeading.textContent = heading.textContent;
        heading.replaceWith(promotedHeading);
      });
      $('modalContent').replaceChildren(content);
      $('modalEyebrow').textContent = `0${[...document.querySelectorAll('.project-card')].indexOf(source.parentElement) + 1} / Project notes`;
      projectOpener = opener;
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.classList.add('dialog-open');
    });
  });
  $('closeDialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    projectOpener?.focus({ preventScroll: true });
  });

  const parts = {
    piston: ['THE PISTON', 'Moves vertically inside the cylinder. Its motion drives the connecting rod.'],
    rod: ['CONNECTING ROD', 'Connects the piston to the crank, turning reciprocating motion into rotation.'],
    crank: ['CRANKSHAFT', 'An offset crank converts the piston’s travel into continuous rotary motion.']
  };
  function showPart(key) {
    const [name, explanation] = parts[key];
    const heading = document.createElement('strong');
    heading.textContent = name;
    $('engineTooltip').replaceChildren(heading, document.createTextNode(explanation));
    $('engineTooltip').classList.add('visible');
  }
  document.querySelectorAll('[data-part]').forEach(part => {
    part.setAttribute('aria-describedby', 'engineTooltip');
    part.addEventListener('click', () => showPart(part.dataset.part));
    part.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showPart(part.dataset.part);
      }
    });
    part.addEventListener('blur', () => $('engineTooltip').classList.remove('visible'));
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    $('engineTooltip').classList.remove('visible');
    if (navLinks.classList.contains('open')) {
      closeMenu();
      navToggle.focus();
    }
  });

  // One scheduler handles the engine, notebook, and automotive studies.
  let angle = .4;
  let speed = Number($('throttle').value);
  let sketch = 'linkage';
  let sketchTime = 0;
  let wantsEngine = true;
  let engineOptIn = false;
  let engineVisible = true;
  let sketchVisible = true;
  const workshopScenes = [...document.querySelectorAll('[data-workshop-scene]')].map(element => ({
    element,
    type: element.dataset.workshopScene,
    visible: !('IntersectionObserver' in window),
    time: 0,
    oilFlow: element.querySelector('[data-oil-flow]'),
    oilDrops: [...element.querySelectorAll('[data-oil-drop]')],
    oilRipple: element.querySelector('[data-oil-ripple]'),
    workOrder: element.querySelector('[data-work-order]'),
    pad: element.querySelector('[data-polishing-pad]'),
    highlight: element.querySelector('[data-clean-highlight]')
  }));
  let frameId = 0;
  let last = 0;
  const engineRunning = () => wantsEngine && (!paused || engineOptIn);
  const hasMotion = () => !document.hidden && ((engineVisible && engineRunning()) || (!paused && (sketchVisible || workshopScenes.some(scene => scene.visible))));

  function syncEngineControls() {
    const running = engineRunning();
    $('runText').textContent = running ? 'Pause engine' : 'Start engine';
    $('runIcon').textContent = running ? 'Ⅱ' : '▶';
    $('runButton').setAttribute('aria-pressed', String(running));
    $('runButton').setAttribute('aria-label', running ? 'Pause engine animation' : 'Start engine animation');
    $('machineStatus').textContent = running ? 'Curiosity, in motion.' : 'Ready when you are.';
    $('rpm').value = running ? String(speed).padStart(3, '0') : '000';
    document.body.classList.toggle('running', running);
  }
  function schedule() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    last = 0;
    if (hasMotion()) frameId = requestAnimationFrame(animate);
  }
  function syncMotion() {
    paused = motionPreference.matches || savedPause;
    root.dataset.motion = paused ? 'off' : 'on';
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.disabled = motionPreference.matches;
    const label = motionPreference.matches ? 'Reduced motion' : paused ? 'Resume animations' : 'Pause animations';
    motionButton.querySelector('span').textContent = label;
    motionButton.setAttribute('aria-label', motionPreference.matches ? 'Reduced motion is enabled in your system settings' : label);
    syncEngineControls();
    schedule();
  }
  $('runButton').addEventListener('click', () => {
    const wasRunning = engineRunning();
    wantsEngine = !wasRunning;
    // Explicitly starting just the engine leaves the global motion preference intact.
    engineOptIn = !wasRunning && paused;
    syncEngineControls();
    schedule();
  });
  $('throttle').addEventListener('input', event => {
    speed = Number(event.target.value);
    syncEngineControls();
  });
  motionButton.addEventListener('click', () => {
    savedPause = !paused;
    engineOptIn = false;
    wantsEngine = true;
    try { localStorage.setItem('portfolio-motion', savedPause ? 'off' : 'on'); } catch { /* Storage is optional. */ }
    syncMotion();
  });
  motionPreference.addEventListener('change', () => {
    engineOptIn = false;
    syncMotion();
  });
  document.addEventListener('visibilitychange', schedule);

  const sketchNames = {
    linkage: ['001', 'FOUR-BAR LINKAGE / MOTION STUDY', 'Animated four bar linkage study'],
    gear: ['002', 'GEAR TRAIN / EQUAL & OPPOSITE', 'Animated pair of meshing gears'],
    spring: ['003', 'MASS–SPRING / SIMPLE HARMONIC MOTION', 'Animated mass spring oscillation']
  };
  const tabs = [...document.querySelectorAll('[data-sketch]')];
  function selectSketch(tab) {
    sketch = tab.dataset.sketch;
    tabs.forEach(button => {
      button.setAttribute('aria-selected', String(button === tab));
      button.tabIndex = button === tab ? 0 : -1;
    });
    $('sketchNumber').textContent = `NO. ${sketchNames[sketch][0]}`;
    $('drawingTitle').textContent = sketchNames[sketch][1];
    $('drawingPanel').setAttribute('aria-labelledby', tab.id);
    $('sketchSvg').setAttribute('aria-label', sketchNames[sketch][2]);
    drawSketch();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectSketch(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectSketch(tabs[next]);
      tabs[next].focus();
    });
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target.id === 'engine') engineVisible = entry.isIntersecting;
        else if (entry.target.id === 'drawingPanel') sketchVisible = entry.isIntersecting;
        else {
          const scene = workshopScenes.find(item => item.element === entry.target);
          if (scene) scene.visible = entry.isIntersecting;
        }
      }
      schedule();
    });
    observer.observe($('engine'));
    observer.observe($('drawingPanel'));
    workshopScenes.forEach(scene => observer.observe(scene.element));
  }

  function animate(now) {
    frameId = 0;
    if (!hasMotion()) return;
    if (!last) last = now;
    const dt = Math.min((now - last) / 1000, .06);
    if (dt >= 1 / 30) {
      last = now;
      if (engineVisible && engineRunning()) {
        angle = (angle + dt * speed / 60 * Math.PI * 2) % (Math.PI * 4);
        drawEngine();
      }
      if (sketchVisible && !paused) {
        sketchTime += dt * .85;
        drawSketch();
      }
      if (!paused) workshopScenes.filter(scene => scene.visible).forEach(scene => {
        scene.time = (scene.time + dt) % 12;
        drawWorkshopScene(scene);
      });
    }
    frameId = requestAnimationFrame(animate);
  }

  function drawWorkshopScene(scene) {
    const ease = value => {
      const bounded = Math.max(0, Math.min(1, value));
      return bounded * bounded * (3 - 2 * bounded);
    };
    const time = scene.time;
    if (scene.type === 'lift') {
      // The raised car and support arms stay fixed; motion is confined to the oil.
      scene.oilFlow.setAttribute('stroke-dashoffset', (-time * 36).toFixed(2));
      scene.oilDrops.forEach((drop, index) => {
        const fall = (time * .75 + index / scene.oilDrops.length) % 1;
        drop.setAttribute('cy', (180 + fall * 65).toFixed(2));
      });
      const ripple = (time * 1.5) % 1;
      scene.oilRipple.setAttribute('rx', (5 + ripple * 14).toFixed(2));
      scene.oilRipple.setAttribute('ry', (1.1 + ripple * 2.5).toFixed(2));
      scene.oilRipple.setAttribute('opacity', (.6 * (1 - ripple)).toFixed(3));
    } else {
      const settle = time < 1.5 ? ease(time / 1.5) : time < 10 ? 1 : 1 - ease((time - 10) / 2);
      scene.workOrder.setAttribute('transform', `translate(0 ${(-10 * (1 - settle)).toFixed(2)})`);
      scene.workOrder.setAttribute('opacity', (.5 + settle * .5).toFixed(3));
      const pass = time < 3 ? 0 : time < 7 ? ease((time - 3) / 4) : time < 9 ? 1 : 1 - ease((time - 9) / 3);
      scene.pad.setAttribute('transform', `translate(${(175 + 85 * pass).toFixed(2)} ${(244 - 6 * pass).toFixed(2)})`);
      const sheen = time > 5 && time < 10 ? Math.sin((time - 5) / 5 * Math.PI) * .7 : 0;
      scene.highlight.setAttribute('opacity', sheen.toFixed(3));
    }
  }

  function line(x1,y1,x2,y2,w=2,extra=''){return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="${w}" ${extra}/>`}function circle(x,y,r=5){return `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--paper)" stroke="currentColor" stroke-width="1.6"/>`}function txt(x,y,s){return `<text x="${x}" y="${y}" fill="currentColor" font-size="10" font-family="monospace">${s}</text>`}
function gear(cx,cy,r,teeth,rotation){let p='';for(let i=0;i<teeth*4;i++){let a=i/(teeth*4)*Math.PI*2+rotation,rr=r+((i%4===1||i%4===2)?6:0);p+=(i?'L':'M')+(cx+Math.cos(a)*rr).toFixed(2)+' '+(cy+Math.sin(a)*rr).toFixed(2)}return `<path d="${p}Z" stroke="currentColor" fill="none" stroke-width="1.5"/>`+circle(cx,cy,12)+line(cx-12*Math.cos(rotation),cy-12*Math.sin(rotation),cx+r*.6*Math.cos(rotation),cy+r*.6*Math.sin(rotation),1)}
function drawSketch(){let s='';const t=sketchTime;
if(sketch==='linkage'){const A={x:155,y:163},D={x:360,y:163};const B={x:A.x+52*Math.cos(t),y:A.y+52*Math.sin(t)};const dx=D.x-B.x,dy=D.y-B.y,d=Math.hypot(dx,dy),q=(180*180-115*115+d*d)/(2*d),h=Math.sqrt(Math.max(0,180*180-q*q));const C={x:B.x+q*dx/d+h*dy/d,y:B.y+q*dy/d-h*dx/d};s=line(A.x,A.y,D.x,D.y,1,'stroke-dasharray="4 4"')+line(A.x,A.y,B.x,B.y,5)+line(B.x,B.y,C.x,C.y,3)+line(C.x,C.y,D.x,D.y,5)+[A,B,C,D].map(p=>circle(p.x,p.y,6)).join('');for(const p of [A,D])s+=`<path d="M${p.x-13} 181l13-13 13 13Z" fill="none" stroke="currentColor"/>`+line(p.x-19,185,p.x+19,185,1);s+=txt(112,205,'FIXED PIVOT')+txt(325,205,'ROCKER')+txt(220,36,'motion is a conversation.')+line(211,44,300,44,1)+`<path d="M94 120q-15 24 0 42m-6-8 6 8 4-9" fill="none" stroke="var(--accent)"/>`;}
else if(sketch==='gear'){s=gear(213,120,60,18,t*.55)+gear(338,120,60,18,-t*.55+Math.PI/18)+line(128,120,421,120,1,'stroke-dasharray="3 5"')+txt(185,218,'1 : 1')+txt(314,218,'-1 : 1')+txt(170,29,'different directions. same drive.');}
else{const y=127+43*Math.sin(t*1.7);s=line(220,35,320,35,3);let path='M270 35 L270 48';let length=y-48;for(let i=0;i<14;i++)path+=` L${i%2?285:255} ${48+length*i/14}`;path+=` L270 ${y}`;s+=`<path d="${path}" stroke="currentColor" fill="none" stroke-width="2"/><rect x="242" y="${y}" width="56" height="37" fill="var(--paper)" stroke="currentColor" stroke-width="2"/>`+txt(266,y+24,'m')+line(350,65,350,206,1,'stroke-dasharray="3 5"')+txt(361,133,'x(t)')+txt(114,226,'every system has its rhythm.');} $('sketchSvg').innerHTML=s;}
function drawEngine(){const r=50,L=128,cx=315,cy=371;const pinX=cx+r*Math.sin(angle),pinY=cy-r*Math.cos(angle),wrist=pinY-Math.sqrt(L*L-(pinX-cx)**2);$('crank').setAttribute('transform',`translate(${cx} ${cy}) rotate(${angle*180/Math.PI})`);$('flywheel').setAttribute('transform',`translate(6 0) rotate(${angle*180/Math.PI})`);$('piston').setAttribute('transform',`translate(0 ${wrist-39})`);['rodBack','rod','rodInset'].forEach(id=>{let el=$(id);el.setAttribute('x1',cx);el.setAttribute('y1',wrist);el.setAttribute('x2',pinX);el.setAttribute('y2',pinY)});['rodJoint','rodBolt'].forEach(id=>{$(id).setAttribute('cx',pinX);$(id).setAttribute('cy',pinY)});let cycle=((angle%(Math.PI*4))+Math.PI*4)%(Math.PI*4),stage=Math.floor(cycle/Math.PI);$('phase').textContent=['INTAKE','COMPRESSION','POWER','EXHAUST'][stage];$('flame').setAttribute('opacity',stage===2?Math.max(0,1-(cycle-2*Math.PI)/Math.PI):0);$('gasFlow').setAttribute('opacity',stage===0||stage===3?.35:.07);}


  drawEngine();
  drawSketch();
  syncMotion();
  updateScroll();
})();
