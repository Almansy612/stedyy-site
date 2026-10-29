/* The weight plate in real 3D (three.js): a lathe-turned bumper plate with a steel hub,
   lit by the page's rose light. site.js decides where it sits on every frame. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const FONT = '-apple-system, "SF Pro Display", Inter, "Segoe UI", sans-serif';
// Stedy's mark, Sisyphus lifting the plate (D-112); the plates wait for it before drawing their faces
const LOGO = new Image();
LOGO.src = new URL('img/logo-sisyphus.png', import.meta.url).href;
const logoReady = LOGO.decode().catch(() => {}); // without it the face simply has no mark
const rad = THREE.MathUtils.degToRad;

// faceShade darkens the recessed face a touch, so the raised rim stands out
const LOOKS = {
  burgundy: {
    body: '#4f0f20', roughness: .55, metalness: 0, clearcoat: .45, sheen: .12, sheenColor: '#ff7a9a', env: .25,
    glyph: 'rgba(252, 238, 241, .92)', faceShade: ['rgba(255, 255, 255, .07)', 'rgba(0, 0, 0, .28)'],
  },
  steel: {
    body: '#8f8a8d', roughness: .34, metalness: .85, clearcoat: .15, sheen: 0, sheenColor: '#ffffff', env: .75,
    glyph: 'rgba(30, 26, 28, .8)', faceShade: ['rgba(255, 255, 255, .1)', 'rgba(0, 0, 0, .16)'],
  },
};

// half-profiles, [radius, half-thickness] from the inside out; the back face mirrors them
const BODY = [[.270, .028], [.300, .034], [.318, .034], [.334, .029], [.818, .029], [.846, .037], [.868, .044], [.884, .046], [.954, .046], [.976, .043], [.993, .034], [1, .021]];
const HUB = [[.111, .041], [.119, .048], [.131, .051], [.236, .051], [.255, .046], [.272, .033]];

// the profile as one closed loop (hole wall down, back face out, rim up, front face in) so the normals face outward
function lathe(half) {
  const pts = [new THREE.Vector2(half[0][0], half[0][1])];
  for (const [r, h] of half) pts.push(new THREE.Vector2(r, -h));
  for (let i = half.length - 1; i >= 0; i--) pts.push(new THREE.Vector2(half[i][0], half[i][1]));
  return new THREE.LatheGeometry(pts, 160);
}

// the face's lettering on a ring that lies just above the recessed face
function faceDecal(look, anisotropy) {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const unit = size / 2 / .815; // canvas pixels per plate radius (the ring spans ±0.815)
  const mid = size / 2;
  // the recessed face: a soft light-to-shade wash, then fine turned rings that glint as it spins
  const wash = g.createLinearGradient(mid - .8 * unit, mid - .8 * unit, mid + .8 * unit, mid + .8 * unit);
  wash.addColorStop(0, look.faceShade[0]);
  wash.addColorStop(1, look.faceShade[1]);
  g.fillStyle = wash;
  g.beginPath();
  g.arc(mid, mid, .815 * unit, 0, Math.PI * 2);
  g.arc(mid, mid, .335 * unit, 0, Math.PI * 2, true);
  g.fill();
  g.strokeStyle = 'rgba(255, 255, 255, .035)';
  g.lineWidth = 1.5;
  for (let r = .35; r < .81; r += .012) {
    g.beginPath();
    g.arc(mid, mid, r * unit, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = look.glyph;
  g.strokeStyle = look.glyph;

  // Stedy's mark above the hub, standing just clear of it
  if (LOGO.naturalWidth) {
    const markH = .4 * unit;
    const markW = markH * LOGO.naturalWidth / LOGO.naturalHeight;
    g.drawImage(LOGO, mid - markW / 2, mid - .36 * unit - markH, markW, markH);
  }

  // the weight, and the name spaced out under it
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${Math.round(.15 * unit)}px ${FONT}`;
  g.fillText('20 KG', mid, mid + .54 * unit);
  g.font = `600 ${Math.round(.05 * unit)}px ${FONT}`;
  const word = 'STEDY';
  const track = .03 * unit;
  const widths = [...word].map((ch) => g.measureText(ch).width);
  let cx = mid - (widths.reduce((a, b) => a + b, 0) + track * (word.length - 1)) / 2;
  g.textAlign = 'left';
  [...word].forEach((ch, i) => {
    g.fillText(ch, cx, mid + .7 * unit);
    cx += widths[i] + track;
  });

  // two hairline grooves that catch the light as it turns
  g.globalAlpha = .2;
  g.lineWidth = 2;
  for (const r of [.36, .79]) {
    g.beginPath();
    g.arc(mid, mid, r * unit, 0, Math.PI * 2);
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

function buildPlate(kind, anisotropy) {
  const look = LOOKS[kind];
  const body = new THREE.MeshPhysicalMaterial({
    color: look.body, roughness: look.roughness, metalness: look.metalness,
    clearcoat: look.clearcoat, clearcoatRoughness: .4,
    sheen: look.sheen, sheenColor: new THREE.Color(look.sheenColor), sheenRoughness: .6,
    envMapIntensity: look.env,
  });
  const steel = new THREE.MeshStandardMaterial({ color: '#ebe8ea', metalness: 1, roughness: .2, envMapIntensity: 1.3 });
  const tex = faceDecal(look, anisotropy);
  const decalMat = new THREE.MeshStandardMaterial({
    map: tex, bumpMap: tex, bumpScale: 1.2, transparent: true, roughness: .35,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });

  const model = new THREE.Group();
  model.add(new THREE.Mesh(lathe(BODY), body));
  model.add(new THREE.Mesh(lathe(HUB), steel));
  const decal = new THREE.Mesh(new THREE.RingGeometry(.335, .815, 160), decalMat);
  decal.rotation.x = -Math.PI / 2; // flat on the front face
  decal.position.y = .0296;
  model.add(decal);
  model.rotation.x = Math.PI / 2; // the axle points at the camera, so the face looks at you

  const spinner = new THREE.Group(); // turns the plate on its own axle
  spinner.add(model);
  const root = new THREE.Group(); // where it is, how big, how it's tipped
  root.add(spinner);
  return { root, spinner };
}

function dispose(object) {
  object.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    if (o.material.map) o.material.map.dispose();
    o.material.dispose();
  });
}

function makeRenderer(canvas, extra = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, ...extra });
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the burgundy's hue; ACES washed it toward pink
  renderer.toneMappingExposure = 1;
  return renderer;
}

// soft room reflections for the steel, a warm key light, and the page's rose light from behind and below
function makeScene(renderer) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  pmrem.dispose();
  const key = new THREE.DirectionalLight('#fff3f5', 1.7);
  key.position.set(-3, 4, 5);
  const rim = new THREE.DirectionalLight('#ff7a9a', 3);
  rim.position.set(3, -3, -2.5);
  const under = new THREE.DirectionalLight('#ffb3c4', .9);
  under.position.set(0, -4, 3);
  scene.add(key, rim, under);
  return scene;
}

/* The hero plate: one canvas over the whole stage. set() places it from screen numbers:
   cx, cy, d in CSS pixels, rx, ry, rz in degrees, free 0..1 (how far it has left the phone). */
export async function createHero(stage, { reduceMotion }) {
  await Promise.all([document.fonts.ready, logoReady]); // the lettering uses the page's font
  const canvas = document.createElement('canvas');
  canvas.className = 'plate-gl';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = makeRenderer(canvas, { powerPreference: 'high-performance' });
  const scene = makeScene(renderer);
  const camera = new THREE.PerspectiveCamera(22, 1, .1, 100);
  camera.position.set(0, 0, 10);
  const plate = buildPlate('burgundy', renderer.capabilities.getMaxAnisotropy());
  scene.add(plate.root);
  stage.querySelector('.rig').after(canvas);

  let w = 1;
  let h = 1;
  let unitPerPx = 1;
  function resize() {
    w = stage.clientWidth;
    h = stage.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    unitPerPx = 2 * camera.position.z * Math.tan(rad(camera.fov / 2)) / h;
  }
  resize();

  let state = null;
  let spin = 0;
  let lean = { x: 0, y: 0 };
  let aim = { x: 0, y: 0 };
  function draw() {
    if (!state) return;
    plate.root.position.set((state.cx - w / 2) * unitPerPx, (h / 2 - state.cy) * unitPerPx, 0);
    plate.root.scale.setScalar(state.d / 2 * unitPerPx);
    plate.root.rotation.set(-rad(state.rx) + lean.y * state.free, rad(state.ry) + lean.x * state.free, 0);
    plate.spinner.rotation.z = rad(state.rz) + spin * state.free;
    renderer.render(scene, camera);
  }

  // once it's out of the phone it keeps turning slowly and leans toward the cursor
  let visible = true;
  let raf = 0;
  let last = 0;
  const alive = () => visible && !document.hidden && !reduceMotion && state && state.free > .02;
  function tick(t) {
    raf = 0;
    const dt = last ? Math.min((t - last) / 1000, .05) : 0;
    last = t;
    spin -= dt * .18;
    lean.x += (aim.x - lean.x) * .07;
    lean.y += (aim.y - lean.y) * .07;
    draw();
    if (alive()) raf = requestAnimationFrame(tick);
    else last = 0;
  }
  const kick = () => { if (!raf && alive()) raf = requestAnimationFrame(tick); };
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; kick(); }).observe(stage);
  document.addEventListener('visibilitychange', kick);
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    aim = { x: (e.clientX / w - .5) * .3, y: (e.clientY / h - .5) * .24 };
  });
  stage.addEventListener('pointerleave', () => { aim = { x: 0, y: 0 }; });

  return {
    set(next) { state = next; draw(); kick(); },
    resize() { resize(); draw(); },
  };
}

/* Still plates (Free and Premium): drawn once by a small renderer, copied into 2D canvases,
   then the renderer lets go of its WebGL context. Each target: { canvas, kind, rx, ry, rz }. */
export async function paintStills(targets) {
  await Promise.all([document.fonts.ready, logoReady]);
  const renderer = makeRenderer(document.createElement('canvas'), { preserveDrawingBuffer: true });
  const scene = makeScene(renderer);
  const camera = new THREE.PerspectiveCamera(22, 1, .1, 100);
  camera.position.set(0, 0, 10);
  const frame = 2 * camera.position.z * Math.tan(rad(camera.fov / 2)); // visible height at the plate
  const dpr = Math.min(devicePixelRatio || 1, 2);
  for (const t of targets) {
    const px = Math.max(1, Math.round(t.canvas.clientWidth * dpr));
    renderer.setPixelRatio(1);
    renderer.setSize(px, px, false);
    const plate = buildPlate(t.kind, renderer.capabilities.getMaxAnisotropy());
    plate.root.scale.setScalar(frame * .45);
    plate.root.rotation.set(-rad(t.rx), rad(t.ry), 0);
    plate.spinner.rotation.z = rad(t.rz);
    scene.add(plate.root);
    renderer.render(scene, camera);
    t.canvas.width = px;
    t.canvas.height = px;
    t.canvas.getContext('2d').drawImage(renderer.domElement, 0, 0);
    scene.remove(plate.root);
    dispose(plate.root);
  }
  renderer.dispose();
  renderer.forceContextLoss();
}
