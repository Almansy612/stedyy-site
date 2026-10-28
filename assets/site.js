/* Stedy landing page: builds the plates and phones, runs the scroll-driven opening,
   the panel rail, the three steps and the questions. No libraries. */
(() => {
  'use strict';

  // On launch day, put the App Store link here: every [data-store] button then points to it.
  const STORE_URL = '';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
  const SVG = 'http://www.w3.org/2000/svg';

  function plateFace(kind, cls) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 400 400');
    if (cls) svg.setAttribute('class', cls);
    const use = document.createElementNS(SVG, 'use');
    use.setAttribute('href', '#plate-' + kind);
    svg.appendChild(use);
    return svg;
  }

  // ---------- phones: one template, cloned ----------
  const tpl = document.getElementById('phone-tpl');
  document.querySelectorAll('[data-phone]').forEach((host) => {
    const phone = tpl.content.firstElementChild.cloneNode(true);
    // the hero's plate is its own 3D element; the small phones show a flat one in the same spot
    if (host.dataset.phone !== 'hero') phone.querySelector('.plate-slot').appendChild(plateFace('burgundy'));
    host.replaceWith(phone);
  });

  // ---------- 3D plates: two faces with stacked discs between them for the thickness ----------
  const EDGES = 12;
  document.querySelectorAll('[data-plate]').forEach((host) => {
    const kind = host.dataset.plate;
    const wrap = document.createElement('div');
    wrap.className = 'plate3d' + (kind === 'steel' ? ' steel' : '');
    const body = document.createElement('div');
    body.className = 'body';
    for (let i = 0; i < EDGES; i++) {
      const edge = document.createElement('div');
      edge.className = 'edge';
      edge.style.setProperty('--z', (i / (EDGES - 1) - .5).toFixed(3));
      body.appendChild(edge);
    }
    body.appendChild(plateFace(kind, 'face back'));
    body.appendChild(plateFace(kind, 'face'));
    const sheen = document.createElement('div');
    sheen.className = 'sheen';
    body.appendChild(sheen);
    wrap.appendChild(body);
    host.replaceWith(wrap);
  });

  if (STORE_URL) {
    document.querySelectorAll('[data-store]').forEach((a) => {
      a.href = STORE_URL;
      a.textContent = 'Download on the App Store';
    });
  }
  document.querySelectorAll('a[aria-disabled="true"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

  // ---------- the opening: scroll progress drives the pinned stage ----------
  const hero = document.querySelector('.hero');
  const stage = hero.querySelector('.stage');
  const aurora = stage.querySelector('.aurora');
  const copy0 = stage.querySelector('.hero-copy');
  const rig = stage.querySelector('.rig');
  const phoneWrap = rig.querySelector('.phone-wrap');
  const plate = rig.querySelector('.hero-plate');
  const plate3d = plate.querySelector('.plate3d');
  const copy = stage.querySelector('.plate-copy');
  const pills = [...stage.querySelectorAll('.pill')];
  const css = (el, name, value) => el.style.setProperty(name, value);

  function heroProgress() {
    const r = hero.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  }

  function renderHero(p) {
    const vh = innerHeight;
    const vw = innerWidth;
    const em = rig.offsetWidth * .0371; // the phone's own unit (16px at full size)
    const copyBottom = copy0.offsetTop + copy0.offsetHeight;

    // 1. the words leave, the phone rises from under them to near the top
    const rise = easeInOut(range(p, 0, .26));
    const rigY0 = Math.max(vh * .605, copyBottom + 48);
    const rigY = lerp(rigY0, vh * .11, rise);
    css(rig, '--rig-y', rigY.toFixed(1) + 'px');
    const out = range(p, .02, .17);
    css(copy0, '--copy0-o', (1 - out).toFixed(3));
    css(copy0, '--copy0-y', (-120 * easeOut(range(p, 0, .22))).toFixed(1) + 'px');
    copy0.style.pointerEvents = out > .5 ? 'none' : '';

    // the light rides behind the phone, then fills the stage
    css(aurora, '--aurora-y', (rigY - vh * .115).toFixed(1) + 'px');
    css(aurora, '--aurora-o', lerp(.75, 1, range(p, .05, .3)).toFixed(3));

    // 2. the plate leaves the screen: it grows, rises and tips toward you while the phone fades
    const lift = easeInOut(range(p, .3, .58));
    const d0 = em * 14.6;
    const d1 = Math.min(vh * .5, vw * .62, 520);
    const center0 = rigY + em * 9.25 + d0 / 2;
    css(plate, '--plate-y', (lerp(0, vh * .36 - center0, lift)).toFixed(1) + 'px');
    css(plate, '--plate-s', lerp(1, d1 / d0, lift).toFixed(4));
    const tilt = easeInOut(range(p, .36, .72));
    css(plate3d, '--rx', (lerp(0, 40, tilt)).toFixed(2) + 'deg');
    css(plate3d, '--ry', (lerp(0, -16, tilt)).toFixed(2) + 'deg');
    css(plate3d, '--rz', (lerp(0, -38, tilt) - 50 * range(p, .5, 1)).toFixed(2) + 'deg'); // a slow turn on its axle
    css(plate3d, '--sheen', lerp(88, 12, range(p, .3, .95)).toFixed(1) + '%');
    const fade = easeInOut(range(p, .36, .56));
    css(phoneWrap, '--phone-o', (1 - fade).toFixed(3));
    css(phoneWrap, '--phone-s', lerp(1, .92, easeInOut(range(p, .34, .58))).toFixed(4));

    // 3. the line under the plate, then its button
    const say = easeOut(range(p, .58, .7));
    css(copy, '--copy-o', say.toFixed(3));
    css(copy, '--copy-y', lerp(24, 0, say).toFixed(1) + 'px');
    const cta = easeOut(range(p, .62, .72));
    css(copy, '--cta-o', cta.toFixed(3));
    css(copy, '--cta-s', lerp(.92, 1, cta).toFixed(4));
    copy.classList.toggle('on', say > .5);

    // 4. the pills pop in around the plate, one after another
    pills.forEach((pill, i) => {
      const t = range(p, .68 + i * .05, .8 + i * .05);
      css(pill, '--o', easeOut(t).toFixed(3));
      css(pill, '--s', lerp(.6, 1, easeOutBack(t)).toFixed(4));
      css(pill, '--y', lerp(12, 0, easeOut(t)).toFixed(1) + 'px');
    });
  }

  // eased toward the scroll position each frame, so wheel steps glide instead of jump
  let target = heroProgress();
  let shown = target;
  let heroRaf = 0;
  function heroTick() {
    const diff = target - shown;
    shown = reduceMotion || Math.abs(diff) < .0004 ? target : shown + diff * .16;
    renderHero(shown);
    heroRaf = shown === target ? 0 : requestAnimationFrame(heroTick);
  }
  function heroKick() {
    target = heroProgress();
    if (!heroRaf) heroRaf = requestAnimationFrame(heroTick);
  }
  renderHero(shown);

  // ---------- feature rail: drag with a mouse too ----------
  document.querySelectorAll('[data-rail]').forEach((rail) => {
    let down = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) {
        moved = true;
        rail.classList.add('dragging');
      }
      if (moved) rail.scrollLeft = startLeft - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (moved) rail.classList.remove('dragging'); // snapping comes back and settles on a panel
    });
    rail.addEventListener('click', (e) => { if (moved) e.preventDefault(); }, true);
  });

  // ---------- three steps: the one in view lights up ----------
  const stepsSec = document.getElementById('start');
  const stepsRow = stepsSec.querySelector('.steps-row');
  const steps = [...stepsSec.querySelectorAll('.step')];
  const stepPills = [...stepsSec.querySelectorAll('.step-pill')];
  const trackFill = stepsSec.querySelector('.track i');
  let currentStep = -1;
  let lastComputed = -1;
  function setStep(i) {
    if (i === currentStep) return;
    currentStep = i;
    steps.forEach((el, k) => el.classList.toggle('on', k === i));
    stepPills.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    trackFill.style.setProperty('--track', i * 50 + '%');
  }
  function stepsFromScroll() {
    const r = stepsRow.getBoundingClientRect();
    const t = clamp((innerHeight * .85 - (r.top + r.height / 2)) / (innerHeight * .6));
    const i = t < 1 / 3 ? 0 : t < 2 / 3 ? 1 : 2;
    if (i !== lastComputed) { // a tapped pill stays lit until scrolling moves to another step
      lastComputed = i;
      setStep(i);
    }
  }
  stepPills.forEach((b) => b.addEventListener('click', () => setStep(Number(b.dataset.step))));

  // ---------- questions: one open at a time ----------
  document.querySelectorAll('.qa > button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const open = !item.classList.contains('open');
      document.querySelectorAll('.qa.open').forEach((other) => {
        if (other === item) return;
        other.classList.remove('open');
        other.querySelector('button').setAttribute('aria-expanded', 'false');
      });
      item.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // ---------- one scroll listener for everything ----------
  let scrollRaf = 0;
  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      heroKick();
      stepsFromScroll();
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => {
    shown = target = heroProgress(); // no easing on resize: jump straight to the right frame
    renderHero(shown);
    stepsFromScroll();
  });
  stepsFromScroll();
})();
