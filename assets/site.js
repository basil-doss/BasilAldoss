(() => {
  'use strict';

  const root = document.documentElement;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const motionButton = document.getElementById('motionToggle');
  let savedPause = false;
  try { savedPause = localStorage.getItem('portfolio-motion') === 'off'; } catch { /* Storage is optional. */ }
  let paused = motionPreference.matches || savedPause;

  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const navigation = document.querySelector('.nav');
  const links = Array.from(navLinks.querySelectorAll('a'));
  const sections = links.map(link => document.querySelector(link.hash)).filter(Boolean);

  const closeMenu = () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  };
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navLinks.classList.contains('open')) {
      closeMenu();
      navToggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!navigation.contains(event.target)) closeMenu();
  });
  window.matchMedia('(min-width: 821px)').addEventListener('change', closeMenu);

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      target.classList.remove('section-arrived');
      // Native anchors retain URL history, keyboard focus, and no-JS navigation.
      requestAnimationFrame(() => {
        target.classList.add('section-arrived');
        if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
      });
    });
  });

  const progress = document.querySelector('.scroll-progress');
  let scrollQueued = false;
  function updateScroll() {
    scrollQueued = false;
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${scrollable > 0 ? Math.min(1, scrollY / scrollable) : 0})`;
    const threshold = navigation.getBoundingClientRect().height + Math.min(150, innerHeight * .23);
    let active = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= threshold) active = section.id;
    }
    if (scrollable > 0 && scrollY >= scrollable - 4) active = sections.at(-1).id;
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
  updateScroll();

  // Content is visible by default. Only hide offscreen elements after the observer exists.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -32px 0px' });
    document.querySelectorAll('.section-heading, .about-layout, .skill-card, .timeline-item, .additional, .project-card, .edu-card, .community-card, .badge-row, footer > .wrap > .section-title').forEach(element => {
      if (element.getBoundingClientRect().top <= innerHeight || paused) return;
      element.classList.add('reveal-ready');
      observer.observe(element);
    });
    // Keyboard navigation must never focus invisible content.
    document.addEventListener('focusin', event => {
      const reveal = event.target.closest('.reveal-ready');
      if (reveal) reveal.classList.add('is-visible');
    });
  }

  document.querySelectorAll('.project-details').forEach(detail => {
    detail.addEventListener('toggle', queueScroll);
  });

  // Wankel kinematics: the rotor center orbits with the eccentric shaft,
  // while the rotor itself turns at one-third of the shaft's angular speed.
  const engine = document.getElementById('engine');
  const engineToggle = document.getElementById('engineToggle');
  const engineSpeed = document.getElementById('engineSpeed');
  const engineSpeedValue = document.getElementById('engineSpeedValue');
  const engineMotionHint = document.getElementById('engineMotionHint');
  const rotor = document.getElementById('rotaryRotor');
  const shaft = document.getElementById('rotaryShaft');
  const engineStep = document.getElementById('engineStep');
  let enginePaused = false;
  let engineOptIn = false;
  let engineVisible = true;
  let engineAngle = .65;
  let engineLastTime = 0;

  function drawEngine() {
    const centerX = 260 + 24 * Math.cos(engineAngle);
    const centerY = 235 + 24 * Math.sin(engineAngle);
    const degrees = engineAngle * 180 / Math.PI;
    rotor.setAttribute('transform', `translate(${centerX} ${centerY}) rotate(${degrees / 3})`);
    shaft.setAttribute('transform', `translate(260 235) rotate(${degrees})`);
  }

  function engineIsRunning() {
    return !enginePaused && (!paused || engineOptIn);
  }

  function syncEngineControls() {
    const running = engineIsRunning();
    engineToggle.setAttribute('aria-pressed', String(!running));
    engineToggle.textContent = running ? 'Pause engine' : paused ? 'Start engine' : 'Resume engine';
    engineMotionHint.hidden = !paused;
    engineMotionHint.textContent = running ? 'Engine playing. Background motion stays paused.' : 'Background motion is paused. You can start just the engine.';
    engineLastTime = 0;
  }

  engineToggle.addEventListener('click', () => {
    const wasRunning = engineIsRunning();
    enginePaused = wasRunning;
    // A deliberate tap can play this mechanism without enabling background motion.
    // This opt-in lasts only for this visit and never changes the system preference.
    engineOptIn = !wasRunning && paused;
    syncMotion();
  });
  engineSpeed.addEventListener('input', () => {
    engineSpeedValue.value = `${Number(engineSpeed.value).toFixed(1)}×`;
  });
  engineStep.addEventListener('click', () => {
    enginePaused = true;
    engineOptIn = false;
    engineAngle = (engineAngle + Math.PI / 12) % (Math.PI * 6);
    drawEngine();
    syncMotion();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      engineVisible = entries[0].isIntersecting;
      engineLastTime = 0;
      syncMotion();
    }).observe(engine);
  }
  drawEngine();

  // A sparse, low-power starfield. It is decorative and never intercepts input.
  const canvas = document.getElementById('starfield');
  const context = canvas.getContext('2d');
  let stars = [];
  let width = innerWidth;
  let height = innerHeight;
  let frame = 0;
  let lastFrame = 0;
  const pointer = { x: 0, y: 0 };

  function resizeSky() {
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    // A stable seed prevents stars visibly jumping on mobile viewport resize.
    let seed = 417;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    stars = Array.from({ length: Math.min(100, Math.round(width * height / 11500)) }, () => ({
      x: random(), y: random(), radius: .4 + random() * .8,
      alpha: .13 + random() * .42, phase: random() * Math.PI * 2,
      depth: .2 + random() * .8
    }));
    drawSky(0);
  }

  function drawSky(time) {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    for (const star of stars) {
      const twinkle = paused ? 1 : .8 + Math.sin(time * .00035 + star.phase) * .2;
      context.beginPath();
      context.fillStyle = `rgba(193,221,229,${star.alpha * twinkle})`;
      context.arc(star.x * width + pointer.x * star.depth, star.y * height + pointer.y * star.depth, star.radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function animate(time) {
    if (document.hidden || (paused && (!engineVisible || !engineIsRunning()))) { frame = 0; return; }
    if (engineVisible && engineIsRunning()) {
      const delta = engineLastTime ? Math.min((time - engineLastTime) / 1000, .05) : 0;
      engineAngle = (engineAngle + delta * Number(engineSpeed.value) * Math.PI * 2) % (Math.PI * 6);
      engineLastTime = time;
      drawEngine();
    }
    if (!paused && time - lastFrame >= 40) { drawSky(time); lastFrame = time; }
    frame = requestAnimationFrame(animate);
  }

  function syncMotion() {
    paused = motionPreference.matches || savedPause;
    root.dataset.motion = paused ? 'off' : 'on';
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.disabled = motionPreference.matches;
    motionButton.querySelector('span').textContent = motionPreference.matches ? 'Reduced motion' : paused ? 'Resume animations' : 'Pause animations';
    motionButton.setAttribute('aria-label', motionPreference.matches ? 'Reduced motion is enabled in your system settings' : paused ? 'Resume animations' : 'Pause animations');
    syncEngineControls();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (paused) {
      pointer.x = 0;
      pointer.y = 0;
      document.querySelectorAll('.reveal-ready').forEach(element => element.classList.add('is-visible'));
      drawSky(0);
    }
    if (!document.hidden && (!paused || (engineVisible && engineIsRunning()))) frame = requestAnimationFrame(animate);
  }

  motionButton.addEventListener('click', () => {
    savedPause = !paused;
    engineOptIn = false;
    enginePaused = false;
    try { localStorage.setItem('portfolio-motion', savedPause ? 'off' : 'on'); } catch { /* Storage is optional. */ }
    syncMotion();
  });
  motionPreference.addEventListener('change', () => {
    engineOptIn = false;
    syncMotion();
  });
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('tab-hidden', document.hidden);
    syncMotion();
  });
  addEventListener('pointermove', event => {
    if (paused || !finePointer.matches) return;
    pointer.x = (event.clientX / width - .5) * 12;
    pointer.y = (event.clientY / height - .5) * 12;
  }, { passive: true });
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeSky, 140);
  }, { passive: true });
  resizeSky();
  syncMotion();
})();
