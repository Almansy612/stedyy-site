/* Stedy landing page: builds the phones, runs the scroll-driven opening (with the three.js
   plate from plate3d.js when the browser can show it), the panel rail, the steps and the questions. */
(() => {
  'use strict';

  // On launch day, put the App Store link here: every [data-store] button then points to it.
  const STORE_URL = '';

  // ?calm in the address previews the Reduce Motion version
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('calm');
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
    // the hero's plate is its own element (except with Reduce Motion); the small phones show a flat one in the same spot
    if (host.dataset.phone !== 'hero' || reduceMotion) phone.querySelector('.plate-slot').appendChild(plateFace('burgundy'));
    host.replaceWith(phone);
  });

  // ---------- CSS plates: the stand-in until (or unless) the three.js plate is ready ----------
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
  const band = stage.querySelector('.dissolve');
  const copy0 = stage.querySelector('.hero-copy');
  const rig = stage.querySelector('.rig');
  const phoneWrap = rig.querySelector('.phone-wrap');
  const plate = rig.querySelector('.hero-plate');
  const plate3d = plate.querySelector('.plate3d');
  const copy = stage.querySelector('.plate-copy');
  const pills = [...stage.querySelectorAll('.pill')];
  const css = (el, name, value) => el.style.setProperty(name, value);
  let gl = null; // the three.js plate, once loaded

  // the line's dim half lights up word by word as you scroll
  const dimWords = [];
  copy.querySelectorAll('.dim').forEach((dim) => {
    const words = dim.textContent.trim().split(/\s+/);
    dim.textContent = '';
    words.forEach((word, i) => {
      const w = document.createElement('span');
      w.className = 'w';
      w.textContent = word;
      dim.append(w, i < words.length - 1 ? ' ' : '');
      dimWords.push(w);
    });
  });

  function heroProgress() {
    const r = hero.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  }

  // Reduce Motion: nothing travels; the opening fades into the plate scene and back
  function renderCalm(p) {
    const vh = innerHeight;
    const vw = innerWidth;
    const em = rig.offsetWidth * .0371;
    const t = easeInOut(range(p, .35, .6));
    const rigY = Math.max(vh * .605, copy0.offsetTop + copy0.offsetHeight + 48);
    css(rig, '--rig-y', rigY.toFixed(1) + 'px');
    css(copy0, '--copy0-o', (1 - t).toFixed(3));
    css(copy0, '--copy0-y', '0px');
    copy0.style.pointerEvents = t > .5 ? 'none' : '';
    css(aurora, '--aurora-y', (vh * .2).toFixed(1) + 'px');
    css(aurora, '--aurora-o', '.85');
    css(phoneWrap, '--phone-o', (1 - t).toFixed(3));
    css(phoneWrap, '--phone-s', '1');
    if (gl) {
      gl.set({ cx: stage.clientWidth / 2, cy: vh * .36, d: Math.min(vh * .56, vw * .66, 560), rx: 48, ry: -18, rz: -40, free: 1 });
      stage.querySelector('.plate-gl').style.opacity = t.toFixed(3);
    } else {
      const d0 = em * 14.6;
      css(plate, '--plate-y', (vh * .36 - (rigY + em * 9.25 + d0 / 2)).toFixed(1) + 'px');
      css(plate, '--plate-s', (Math.min(vh * .5, vw * .62, 520) / d0).toFixed(4));
      css(plate3d, '--rx', '40deg');
      css(plate3d, '--ry', '-16deg');
      css(plate3d, '--rz', '-38deg');
      plate.style.opacity = t.toFixed(3);
    }
    css(copy, '--copy-o', t.toFixed(3));
    css(copy, '--copy-y', '0px');
    css(copy, '--cta-o', t.toFixed(3));
    css(copy, '--cta-s', '1');
    copy.classList.toggle('on', t > .5);
    dimWords.forEach((w) => w.style.setProperty('--wo', '1'));
    pills.forEach((pill) => {
      css(pill, '--o', t.toFixed(3));
      css(pill, '--s', '1');
      css(pill, '--y', '0px');
    });
    css(band, '--dis-y', '0%');
    band.style.opacity = range(p, .85, 1).toFixed(3);
  }

  function renderHero(p) {
    if (reduceMotion) return renderCalm(p);
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

    // 2. the plate leaves the screen: it grows, rises and tips back while the phone fades
    const lift = easeInOut(range(p, .3, .58));
    const tilt = easeInOut(range(p, .36, .72));
    const d0 = em * 14.6;
    const center0 = rigY + em * 9.25 + d0 / 2;
    const spin = lerp(0, -40, tilt) - 50 * range(p, .5, 1); // it turns on its axle as you scroll
    if (gl) {
      const d1 = Math.min(vh * .56, vw * .66, 560);
      gl.set({
        cx: stage.clientWidth / 2, cy: lerp(center0, vh * .36, lift), d: lerp(d0, d1, lift),
        rx: lerp(0, 48, tilt), ry: lerp(0, -18, tilt), rz: spin, free: lift,
      });
    } else {
      const d1 = Math.min(vh * .5, vw * .62, 520);
      css(plate, '--plate-y', lerp(0, vh * .36 - center0, lift).toFixed(1) + 'px');
      css(plate, '--plate-s', lerp(1, d1 / d0, lift).toFixed(4));
      css(plate3d, '--rx', lerp(0, 40, tilt).toFixed(2) + 'deg');
      css(plate3d, '--ry', lerp(0, -16, tilt).toFixed(2) + 'deg');
      css(plate3d, '--rz', spin.toFixed(2) + 'deg');
      css(plate3d, '--sheen', lerp(88, 12, range(p, .3, .95)).toFixed(1) + '%');
    }
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
    dimWords.forEach((w, i) => {
      const t = range(p, .7 + .22 * i / dimWords.length, .7 + .22 * (i + 1) / dimWords.length);
      w.style.setProperty('--wo', (.4 + .6 * t).toFixed(3));
    });

    // 4. the pills pop in around the plate, one after another
    pills.forEach((pill, i) => {
      const t = range(p, .68 + i * .05, .8 + i * .05);
      css(pill, '--o', easeOut(t).toFixed(3));
      css(pill, '--s', lerp(.6, 1, easeOutBack(t)).toFixed(4));
      css(pill, '--y', lerp(12, 0, easeOut(t)).toFixed(1) + 'px');
    });

    // 5. the end: darkness rises from the bottom through dots that shrink, so the glow fades into the page
    css(band, '--dis-y', (100 * (1 - easeInOut(range(p, .78, 1)))).toFixed(2) + '%');
  }

  // the dissolve band: solid page colour with round holes that get smaller toward the bottom
  let bandSize = '';
  function drawBand() {
    const w = band.clientWidth;
    const h = band.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (!w || !h || bandSize === `${w}x${h}x${dpr}`) return;
    bandSize = `${w}x${h}x${dpr}`;
    band.width = Math.round(w * dpr);
    band.height = Math.round(h * dpr);
    const g = band.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#080405';
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    const step = 4; // the same spacing as the glow's grain
    for (let y = step / 2; y < h; y += step) {
      const r = step * .76 * Math.pow(1 - y / h, 1.5); // overlapping at the top, gone at the bottom
      if (r < .12) break;
      g.beginPath();
      for (let x = step / 2; x < w + step; x += step) {
        g.moveTo(x + r, y);
        g.arc(x, y, r, 0, Math.PI * 2);
      }
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
  drawBand();

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

  // the real 3D plate: three.js loads after the page; until then, or without WebGL, the CSS plate shows
  import('./plate3d.js')
    .then(async (m) => {
      gl = await m.createHero(stage, { reduceMotion });
      renderHero(shown); // draw its first frame, then cross-fade from the CSS plate
      requestAnimationFrame(() => stage.classList.add('gl'));
      const boxes = [...document.querySelectorAll('.plan-visual')];
      const targets = boxes.map((box) => {
        const canvas = document.createElement('canvas');
        canvas.className = 'plate-still';
        canvas.setAttribute('aria-hidden', 'true');
        box.appendChild(canvas);
        return { canvas, kind: box.closest('.plan.free') ? 'steel' : 'burgundy', rx: 58, ry: 0, rz: -24 };
      });
      await m.paintStills(targets);
      requestAnimationFrame(() => boxes.forEach((box) => box.classList.add('gl')));
    })
    .catch((err) => console.warn('Stedy: the 3D plate could not load, so the flat one stays.', err));

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

  // ---------- three steps: the one under the cursor lights up ----------
  const stepsSec = document.getElementById('start');
  const stepsRow = stepsSec.querySelector('.steps-row');
  const steps = [...stepsSec.querySelectorAll('.step')];
  const stepPills = [...stepsSec.querySelectorAll('.step-pill')];
  const trackFill = stepsSec.querySelector('.track i');
  let currentStep = -1;
  function setStep(i) {
    if (i === currentStep) return;
    currentStep = i;
    steps.forEach((el, k) => el.classList.toggle('on', k === i));
    stepPills.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    trackFill.style.setProperty('--track', i * 50 + '%');
  }
  setStep(0);
  steps.forEach((el, i) => {
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setStep(i); });
    el.addEventListener('click', () => setStep(i)); // taps on touch screens
  });
  stepPills.forEach((b) => {
    const i = Number(b.dataset.step);
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setStep(i); });
    b.addEventListener('click', () => setStep(i));
    b.addEventListener('focus', () => setStep(i)); // tabbing through the pills
  });
  // phones: the card swiped into view is the lit one
  let rowRaf = 0;
  stepsRow.addEventListener('scroll', () => {
    if (rowRaf) return;
    rowRaf = requestAnimationFrame(() => {
      rowRaf = 0;
      const mid = stepsRow.getBoundingClientRect().left + stepsRow.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      steps.forEach((el, k) => {
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - mid);
        if (dist < bestDist) { best = k; bestDist = dist; }
      });
      setStep(best);
    });
  }, { passive: true });

  // ---------- reviews: hovering, focusing or tapping the moving row pauses it ----------
  document.querySelectorAll('.marquee').forEach((row) => row.addEventListener('click', () => row.classList.toggle('paused')));

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

  // ---------- one scroll listener for the opening ----------
  addEventListener('scroll', heroKick, { passive: true });
  addEventListener('resize', () => {
    if (gl) gl.resize();
    drawBand();
    shown = target = heroProgress(); // no easing on resize: jump straight to the right frame
    renderHero(shown);
  });
})();
