import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.min.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

const COATS = [
  { id: 'palomino', name: 'Palomino', color: 0xc69255, mane: 0xf2dfae },
  { id: 'bay', name: 'Bay', color: 0x7a3826, mane: 0x211715 },
  { id: 'black', name: 'Black', color: 0x17181a, mane: 0x090a0b },
  { id: 'chestnut', name: 'Chestnut', color: 0xa9512f, mane: 0x6d281c },
  { id: 'grey', name: 'Dapple Grey', color: 0xc8c6bd, mane: 0x696761 },
  { id: 'paint', name: 'Paint', color: 0x7d4933, mane: 0x30211b, pattern: 'paint' },
  { id: 'appaloosa', name: 'Appaloosa', color: 0xe1d6c2, mane: 0x55483f, pattern: 'spots' },
  { id: 'cremello', name: 'Cremello', color: 0xead7bb, mane: 0xf5e8cf }
];

const BREEDS = {
  andalusian: { name: 'Andalusian', body: [1.02, 1.02, 1.03], neck: 1.05, leg: .98 },
  arabian: { name: 'Arabian', body: [.92, .95, .94], neck: 1.08, leg: 1.02 },
  friesian: { name: 'Friesian', body: [1.08, 1.1, 1.06], neck: 1.12, leg: 1.05 },
  appaloosa: { name: 'Appaloosa', body: [1.03, 1, 1.06], neck: .98, leg: .96 },
  quarter: { name: 'Quarter Horse', body: [1.12, .98, 1.08], neck: .95, leg: .93 },
  thoroughbred: { name: 'Thoroughbred', body: [.96, 1.04, 1.08], neck: 1.02, leg: 1.08 }
};

const OUTFITS = {
  island: { top: 0xf19a7f, pants: 0xf4e7d5, boots: 0x5c3a2c },
  classic: { top: 0x263f45, pants: 0xf0eadc, boots: 0x37271f },
  sunset: { top: 0xed6f66, pants: 0x5a4b66, boots: 0x58372b },
  ocean: { top: 0x2d829c, pants: 0xe9e3d9, boots: 0x493126 }
};

const state = {
  mounted: false,
  leading: false,
  gait: 'walk',
  bond: 72,
  mood: 85,
  energy: 96,
  horseName: 'Solana',
  breed: 'andalusian',
  coat: 0,
  mane: 'flowing',
  hair: 'side',
  outfit: 'island',
  outfitColor: 0xf19a7f,
  helmet: true,
  tackColor: 0x138b83,
  tack: { saddle: true, blanket: true, bridle: true, halter: false },
  keys: {},
  touchKeys: {},
  sound: true,
  reactionCooldown: 0,
  careBusy: false,
  time: 0
};

try {
  Object.assign(state, JSON.parse(localStorage.getItem('isla-brisa-profile') || '{}'));
  state.keys = {};
  state.touchKeys = {};
  state.careBusy = false;
} catch (_) { /* New island visitor. */ }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x86d7e5);
scene.fog = new THREE.FogExp2(0xb7dfd5, .014);

const camera = new THREE.PerspectiveCamera(47, innerWidth / innerHeight, .1, 350);
camera.position.set(10, 7, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('#scene').appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xdaf7ff, 0x426c45, 2.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffedcb, 4.6);
sun.position.set(-22, 36, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55;
sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55;
sun.shadow.camera.bottom = -55;
sun.shadow.bias = -.00018;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);
const wildlife = [];
const npcHorses = [];
const animatedPlants = [];

function material(color, roughness = .72, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function mesh(geometry, mat, cast = true, receive = true) {
  const item = new THREE.Mesh(geometry, mat);
  item.castShadow = cast;
  item.receiveShadow = receive;
  return item;
}

function cylinderBetween(a, b, radius, mat) {
  const mid = a.clone().add(b).multiplyScalar(.5);
  const length = a.distanceTo(b);
  const part = mesh(new THREE.CylinderGeometry(radius, radius * .92, length, 8), mat);
  part.position.copy(mid);
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return part;
}

function addIsland() {
  const ocean = mesh(new THREE.CircleGeometry(180, 96), new THREE.MeshPhysicalMaterial({ color: 0x2e9fab, roughness: .2, metalness: .05, transparent: true, opacity: .86 }), false, true);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -1.7;
  scene.add(ocean);
  ocean.userData.water = true;

  const reef = mesh(new THREE.CylinderGeometry(58, 53, 2.4, 72), material(0xe9cf95, .94));
  reef.position.y = -1.05;
  world.add(reef);
  const island = mesh(new THREE.CylinderGeometry(51, 55, 3.5, 72), material(0x4e9b5a, .92));
  island.position.y = .3;
  world.add(island);

  const meadow = mesh(new THREE.CircleGeometry(48, 72), material(0x72aa5b, 1), false, true);
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.y = 2.07;
  world.add(meadow);

  const pathMat = material(0xd8bb7d, 1);
  const path = mesh(new THREE.TorusGeometry(22, 2.1, 16, 64, Math.PI * 1.45), pathMat, false, true);
  path.rotation.x = Math.PI / 2;
  path.rotation.z = -.6;
  path.position.y = 2.1;
  world.add(path);
  const arena = mesh(new THREE.CircleGeometry(10.5, 48), material(0xd6b37d, 1), false, true);
  arena.rotation.x = -Math.PI / 2;
  arena.position.set(22, 2.11, -9);
  world.add(arena);

  for (let i = 0; i < 80; i += 1) {
    const angle = (i / 80) * Math.PI * 2 + Math.random() * .05;
    const r = 53 + Math.random() * 3.5;
    const rock = mesh(new THREE.DodecahedronGeometry(.35 + Math.random() * .45, 0), material(i % 3 === 0 ? 0xd6c398 : 0xc8b58b, 1));
    rock.scale.y = .55 + Math.random() * .5;
    rock.position.set(Math.cos(angle) * r, .2 + Math.random() * .3, Math.sin(angle) * r);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    world.add(rock);
  }

  for (let i = 0; i < 28; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const r = 18 + Math.random() * 27;
    addPalm(Math.cos(angle) * r, Math.sin(angle) * r, .75 + Math.random() * .55);
  }

  for (let i = 0; i < 42; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const r = 12 + Math.random() * 34;
    addFlower(Math.cos(angle) * r, Math.sin(angle) * r, i % 3);
  }

  addStable(-17, 12);
  addDock(-43, -12);
  addWaterfall(30, 25);
}

function addPalm(x, z, scale = 1) {
  const g = new THREE.Group();
  const trunkMat = material(0x846044, .95);
  for (let i = 0; i < 6; i += 1) {
    const trunk = mesh(new THREE.CylinderGeometry(.34 - i * .025, .43 - i * .025, 1.45, 8), trunkMat);
    trunk.position.y = 2.6 + i * 1.25;
    trunk.rotation.z = .035 * i;
    g.add(trunk);
  }
  const leafMat = material(0x1f8050, .82);
  for (let i = 0; i < 9; i += 1) {
    const leaf = mesh(new THREE.SphereGeometry(1, 8, 5), leafMat);
    leaf.scale.set(2.6, .17, .62);
    leaf.position.y = 10.25;
    leaf.rotation.y = (i / 9) * Math.PI * 2;
    leaf.rotation.z = -.15 + (i % 2) * .2;
    leaf.position.x = Math.cos(leaf.rotation.y) * 1.45;
    leaf.position.z = -Math.sin(leaf.rotation.y) * 1.45;
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  g.rotation.y = Math.random() * Math.PI * 2;
  world.add(g);
  animatedPlants.push(g);
  return g;
}

function addFlower(x, z, variant) {
  const g = new THREE.Group();
  const colors = [0xf17b72, 0xffd363, 0xefefef];
  const stem = mesh(new THREE.CylinderGeometry(.025, .035, .8, 5), material(0x3f8a4b, 1), false);
  stem.position.y = 2.45;
  g.add(stem);
  for (let i = 0; i < 5; i += 1) {
    const petal = mesh(new THREE.SphereGeometry(.13, 7, 5), material(colors[variant], .8), false);
    petal.scale.set(1.4, .45, .7);
    petal.position.set(Math.cos(i * 1.256) * .14, 2.88, Math.sin(i * 1.256) * .14);
    g.add(petal);
  }
  g.position.set(x, 0, z);
  world.add(g);
}

function addStable(x, z) {
  const g = new THREE.Group();
  const wood = material(0x8a5d3a, .9);
  const roof = material(0x295e50, .78);
  for (const px of [-4.5, 4.5]) for (const pz of [-3, 3]) {
    const post = mesh(new THREE.BoxGeometry(.38, 5.7, .38), wood);
    post.position.set(px, 4.9, pz);
    g.add(post);
  }
  const canopy = mesh(new THREE.ConeGeometry(7, 2.2, 4), roof);
  canopy.rotation.y = Math.PI / 4;
  canopy.scale.z = .72;
  canopy.position.y = 8.2;
  g.add(canopy);
  const sign = mesh(new THREE.BoxGeometry(4, 1.2, .25), material(0xf2e3bf, .85));
  sign.position.set(0, 6.8, -3.35);
  g.add(sign);
  g.position.set(x, 0, z);
  g.rotation.y = .45;
  world.add(g);
}

function addDock(x, z) {
  const g = new THREE.Group();
  const wood = material(0x8c6243, 1);
  for (let i = 0; i < 10; i += 1) {
    const plank = mesh(new THREE.BoxGeometry(1.2, .22, 5.2), wood);
    plank.position.set(i * 1.12, 1.05, 0);
    g.add(plank);
  }
  g.position.set(x, 0, z);
  g.rotation.y = .32;
  world.add(g);
}

function addWaterfall(x, z) {
  const g = new THREE.Group();
  const rockMat = material(0x617566, 1);
  for (let i = 0; i < 12; i += 1) {
    const rock = mesh(new THREE.DodecahedronGeometry(1.4 + Math.random(), 1), rockMat);
    rock.position.set((Math.random() - .5) * 6, 2.5 + Math.random() * 5, (Math.random() - .5) * 5);
    rock.scale.y = .7;
    g.add(rock);
  }
  const falls = mesh(new THREE.PlaneGeometry(2.3, 5.5), new THREE.MeshPhysicalMaterial({ color: 0xa9eff2, transparent: true, opacity: .72, roughness: .1 }), false, false);
  falls.position.set(0, 5.1, 2.15);
  g.add(falls);
  const pool = mesh(new THREE.CircleGeometry(5.5, 36), new THREE.MeshPhysicalMaterial({ color: 0x47bac2, roughness: .16, transparent: true, opacity: .82 }), false, true);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 2.18;
  g.add(pool);
  g.position.set(x, 0, z);
  world.add(g);
}

function horsePart(geometry, mat, parent, position, scale, name) {
  const part = mesh(geometry, mat);
  part.position.set(...position);
  if (scale) part.scale.set(...scale);
  if (name) part.name = name;
  parent.add(part);
  return part;
}

function createHorse({ coatIndex = 0, breed = 'andalusian', npc = false } = {}) {
  const root = new THREE.Group();
  root.userData.npc = npc;
  const coat = COATS[coatIndex];
  const breedData = BREEDS[breed];
  const coatMat = material(coat.color, .68);
  const darkCoat = new THREE.Color(coat.color).multiplyScalar(.72).getHex();
  const shadeMat = material(darkCoat, .73);
  const maneMat = material(coat.mane, .82);
  const hoofMat = material(0x252422, .88);
  const eyeMat = material(0x090706, .18);
  const body = horsePart(new THREE.SphereGeometry(1, 20, 14), coatMat, root, [0, 3.35, 0], [2.15, 1.15, .82], 'body');
  const chest = horsePart(new THREE.SphereGeometry(1, 16, 12), coatMat, root, [.95, 3.25, 0], [.9, 1.25, .83], 'chest');
  const neckPivot = new THREE.Group();
  neckPivot.position.set(1.25, 3.85, 0);
  neckPivot.rotation.z = -.47;
  root.add(neckPivot);
  const neck = horsePart(new THREE.CylinderGeometry(.48, .72, 2.3, 12), coatMat, neckPivot, [0, .85, 0], [1, breedData.neck, 1], 'neck');
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 2.05 * breedData.neck, 0);
  headPivot.rotation.z = .4;
  neckPivot.add(headPivot);
  const head = horsePart(new THREE.SphereGeometry(1, 16, 12), coatMat, headPivot, [.26, .25, 0], [.83, 1.05, .57], 'head');
  const muzzle = horsePart(new THREE.SphereGeometry(1, 14, 10), shadeMat, headPivot, [.75, .47, 0], [.67, .5, .5], 'muzzle');
  for (const side of [-1, 1]) {
    const eye = horsePart(new THREE.SphereGeometry(.1, 10, 8), eyeMat, headPivot, [.13, .45, side * .54], [1, 1, .5], 'eye');
    const ear = horsePart(new THREE.ConeGeometry(.16, .65, 8), coatMat, headPivot, [-.18, 1.25, side * .3], [1, 1, 1], 'ear');
    ear.rotation.z = side * .08;
  }
  const mane = new THREE.Group();
  mane.name = 'mane';
  for (let i = 0; i < 9; i += 1) {
    const lock = horsePart(new THREE.SphereGeometry(.28, 8, 6), maneMat, mane, [-.33, .2 + i * .28, 0], [.55 + i * .04, .8, .58], 'maneLock');
    lock.rotation.z = .15;
  }
  neckPivot.add(mane);
  const tailPivot = new THREE.Group();
  tailPivot.position.set(-2.05, 3.55, 0);
  root.add(tailPivot);
  for (let i = 0; i < 7; i += 1) {
    const tail = horsePart(new THREE.SphereGeometry(.27, 8, 6), maneMat, tailPivot, [-.2 - i * .18, -.3 - i * .3, 0], [.8, 1.15, .8], 'tail');
    tail.rotation.z = -.35;
  }

  const legPivots = [];
  [[1.25, 2.75, -.5], [1.25, 2.75, .5], [-1.25, 2.75, -.5], [-1.25, 2.75, .5]].forEach((pos, index) => {
    const pivot = new THREE.Group();
    pivot.position.set(...pos);
    root.add(pivot);
    const upper = horsePart(new THREE.CylinderGeometry(.23, .18, 1.55, 9), coatMat, pivot, [0, -.72, 0], [1, breedData.leg, 1], 'upperLeg');
    const lower = horsePart(new THREE.CylinderGeometry(.16, .11, 1.42, 8), shadeMat, pivot, [index < 2 ? .08 : -.08, -2.05, 0], [1, breedData.leg, 1], 'lowerLeg');
    const hoof = horsePart(new THREE.BoxGeometry(.38, .3, .42), hoofMat, pivot, [index < 2 ? .18 : -.16, -2.8, 0], [1, 1, 1], 'hoof');
    hoof.rotation.y = Math.PI / 2;
    legPivots.push(pivot);
  });

  const pattern = new THREE.Group();
  pattern.name = 'pattern';
  if (coat.pattern) {
    const patchMat = material(coat.pattern === 'paint' ? 0xf1eadc : 0x4c352a, .75);
    const count = coat.pattern === 'paint' ? 7 : 26;
    for (let i = 0; i < count; i += 1) {
      const spot = mesh(new THREE.SphereGeometry(coat.pattern === 'paint' ? .34 + Math.random() * .25 : .09 + Math.random() * .08, 8, 5), patchMat);
      const angle = Math.random() * Math.PI * 2;
      spot.position.set(-1.35 + Math.random() * 2.6, 3.25 + (Math.random() - .5) * 1.4, Math.sin(angle) * .77);
      spot.scale.set(1.4, .55 + Math.random(), .18);
      spot.rotation.x = angle;
      pattern.add(spot);
    }
  }
  root.add(pattern);

  const tack = new THREE.Group();
  tack.name = 'tack';
  const blanket = horsePart(new THREE.BoxGeometry(1.75, .12, 1.7), material(state.tackColor, .76), tack, [-.15, 4.28, 0], [1, 1, 1], 'blanket');
  blanket.rotation.z = -.02;
  const saddleMat = material(0x55372a, .58);
  const saddle = horsePart(new THREE.BoxGeometry(1.25, .38, 1.25), saddleMat, tack, [-.05, 4.46, 0], [1, 1, 1], 'saddle');
  saddle.geometry.translate(0, .08, 0);
  const cantle = horsePart(new THREE.TorusGeometry(.42, .12, 7, 16, Math.PI), saddleMat, tack, [-.55, 4.7, 0], [1, 1, 1], 'saddle');
  cantle.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
  const bridle = new THREE.Group();
  bridle.name = 'bridle';
  const strapMat = material(0x38271f, .62);
  for (const side of [-1, 1]) {
    const strap = mesh(new THREE.TorusGeometry(.54, .035, 6, 24), strapMat);
    strap.scale.set(1.2, 1.25, 1);
    strap.position.set(.3, .35, side * .04);
    strap.rotation.y = Math.PI / 2;
    bridle.add(strap);
  }
  headPivot.add(bridle);
  const halter = new THREE.Group();
  halter.name = 'halter';
  const halterMat = material(0x2d9a9c, .5);
  const noseband = mesh(new THREE.TorusGeometry(.45, .045, 6, 24), halterMat);
  noseband.scale.set(1, 1.15, 1);
  noseband.position.set(.63, .45, 0);
  noseband.rotation.y = Math.PI / 2;
  halter.add(noseband);
  headPivot.add(halter);
  root.add(tack);

  root.scale.set(...breedData.body);
  root.userData = { ...root.userData, body, chest, neckPivot, headPivot, legPivots, tailPivot, mane, tack, blanket, saddleParts: [saddle, cantle], bridle, halter, coatIndex, breed, phase: Math.random() * 5 };
  applyTackVisibility(root);
  return root;
}

function applyTackVisibility(horse) {
  if (!horse?.userData?.tack) return;
  horse.userData.blanket.visible = Boolean(state.tack.blanket);
  horse.userData.saddleParts.forEach((part) => { part.visible = Boolean(state.tack.saddle); });
  horse.userData.bridle.visible = Boolean(state.tack.bridle);
  horse.userData.halter.visible = Boolean(state.tack.halter || state.leading);
  horse.userData.blanket.material.color.setHex(state.tackColor);
}

function createAvatar() {
  const root = new THREE.Group();
  const skin = material(0xb96f58, .72);
  const hairMat = material(0x2a1b18, .82);
  const topMat = material(state.outfitColor, .7);
  const pantsMat = material(OUTFITS[state.outfit].pants, .82);
  const bootMat = material(OUTFITS[state.outfit].boots, .72);
  const head = horsePart(new THREE.SphereGeometry(.36, 18, 14), skin, root, [0, 2.72, 0], [1, 1.08, .93], 'head');
  const hair = new THREE.Group();
  hair.name = 'hair';
  const cap = horsePart(new THREE.SphereGeometry(.37, 16, 10, 0, Math.PI * 2, 0, Math.PI * .63), hairMat, hair, [0, 2.82, -.02], [1.03, 1.05, 1.02], 'hairCap');
  for (let i = 0; i < 8; i += 1) {
    const side = i % 2 ? 1 : -1;
    const lock = horsePart(new THREE.CapsuleGeometry(.07, .55 + (i % 3) * .12, 5, 8), hairMat, hair, [side * (.28 + (i % 3) * .02), 2.48 - (i % 4) * .05, -.03 + (i % 2) * .06], [1, 1, 1], 'hairLock');
    lock.rotation.z = side * (.12 + (i % 3) * .05);
  }
  root.add(hair);
  for (const side of [-1, 1]) {
    const eye = horsePart(new THREE.SphereGeometry(.035, 8, 6), material(0x211514, .3), root, [side * .13, 2.78, .33], [1, 1, .5], 'eye');
  }
  const torso = horsePart(new THREE.CapsuleGeometry(.31, .72, 7, 12), topMat, root, [0, 1.86, 0], [.9, 1, .72], 'torso');
  const hips = horsePart(new THREE.SphereGeometry(.34, 12, 8), pantsMat, root, [0, 1.27, 0], [1, .65, .78], 'hips');
  const armPivots = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * .38, 2.1, 0);
    root.add(pivot);
    const arm = horsePart(new THREE.CapsuleGeometry(.1, .65, 5, 8), skin, pivot, [0, -.38, 0], [1, 1, 1], 'arm');
    arm.rotation.z = side * -.08;
    armPivots.push(pivot);
  }
  const legPivots = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * .18, 1.2, 0);
    root.add(pivot);
    const leg = horsePart(new THREE.CapsuleGeometry(.12, .72, 5, 8), pantsMat, pivot, [0, -.45, 0], [1, 1, 1], 'leg');
    const boot = horsePart(new THREE.CapsuleGeometry(.13, .38, 5, 8), bootMat, pivot, [0, -1.08, .05], [1.03, 1, 1.06], 'boot');
    legPivots.push(pivot);
  }
  const helmet = horsePart(new THREE.SphereGeometry(.4, 16, 9, 0, Math.PI * 2, 0, Math.PI * .55), material(0x263c3d, .42), root, [0, 2.9, 0], [1.08, .8, 1.08], 'helmet');
  const brim = horsePart(new THREE.BoxGeometry(.48, .055, .22), helmet.material, root, [0, 2.83, .31], [1, 1, 1], 'helmet');
  root.userData = { head, hair, topMat, pantsMat, bootMat, armPivots, legPivots, helmetParts: [helmet, brim], hairStyle: state.hair };
  applyAvatarStyle(root);
  return root;
}

function applyAvatarStyle(target) {
  target.userData.topMat.color.setHex(state.outfitColor);
  target.userData.pantsMat.color.setHex(OUTFITS[state.outfit].pants);
  target.userData.bootMat.color.setHex(OUTFITS[state.outfit].boots);
  target.userData.helmetParts.forEach((part) => { part.visible = Boolean(state.helmet); });
  const locks = target.userData.hair.children.filter((child) => child.name === 'hairLock');
  locks.forEach((lock, index) => {
    if (state.hair === 'side') {
      lock.visible = index < 6;
      lock.position.x = (index % 2 ? 1 : -1) * (.28 + (index % 3) * .02);
      lock.position.y = 2.48 - (index % 4) * .05;
    } else if (state.hair === 'pony') {
      lock.visible = index < 5;
      lock.position.set(0, 2.68 - index * .13, -.34 - index * .04);
    } else {
      lock.visible = true;
      lock.position.x = (index % 2 ? 1 : -1) * .28;
      lock.position.y = 2.45 - Math.floor(index / 2) * .16;
    }
  });
}

function addWildlife() {
  const parrotColors = [0xe65a52, 0x2c98a2, 0xf0c64c];
  for (let i = 0; i < 6; i += 1) {
    const g = new THREE.Group();
    const body = horsePart(new THREE.SphereGeometry(.22, 10, 8), material(parrotColors[i % 3], .75), g, [0, 0, 0], [.8, 1.25, .65], 'body');
    const wing = horsePart(new THREE.SphereGeometry(.18, 8, 6), material(i % 2 ? 0x177b69 : 0x2b6fa0, .78), g, [0, 0, -.16], [1.2, .8, .35], 'wing');
    const beak = horsePart(new THREE.ConeGeometry(.08, .25, 7), material(0xefa84b, .7), g, [.18, .08, 0], [1, 1, 1], 'beak');
    beak.rotation.z = -Math.PI / 2;
    g.position.set(-10 + i * 6, 7 + (i % 2) * 2, 18 + (i % 3) * 4);
    g.userData = { type: 'parrot', base: g.position.clone(), phase: i * 1.2, body, wing };
    world.add(g);
    wildlife.push(g);
  }

  for (let i = 0; i < 3; i += 1) {
    const g = new THREE.Group();
    const fur = material(0x6f4b32, .9);
    horsePart(new THREE.SphereGeometry(.32, 10, 8), fur, g, [0, .38, 0], [.85, 1.2, .75], 'body');
    horsePart(new THREE.SphereGeometry(.26, 10, 8), fur, g, [0, .82, 0], [1, 1, .9], 'head');
    const face = horsePart(new THREE.SphereGeometry(.18, 8, 6), material(0xc7946b, .82), g, [.08, .83, .19], [1, .8, .55], 'face');
    const tail = mesh(new THREE.TorusGeometry(.5, .045, 7, 20, Math.PI * 1.5), fur);
    tail.position.set(-.3, .36, -.05);
    tail.rotation.y = Math.PI / 2;
    g.add(tail);
    g.position.set(16 + i * 5, 2.15, 24 - i * 4);
    g.userData = { type: 'monkey', base: g.position.clone(), phase: i };
    world.add(g);
    wildlife.push(g);
  }

  for (let i = 0; i < 5; i += 1) {
    const g = new THREE.Group();
    const pink = material(0xef8b9d, .72);
    horsePart(new THREE.SphereGeometry(.3, 10, 8), pink, g, [0, 1.35, 0], [.75, 1.2, .55], 'body');
    const neck = horsePart(new THREE.CylinderGeometry(.07, .1, 1.1, 7), pink, g, [.1, 2, 0], [1, 1, 1], 'neck');
    neck.rotation.z = -.18;
    horsePart(new THREE.SphereGeometry(.18, 8, 6), pink, g, [.24, 2.55, 0], [1, .8, .75], 'head');
    for (const side of [-1, 1]) {
      const leg = horsePart(new THREE.CylinderGeometry(.025, .035, 1.35, 5), material(0xb8646e, .8), g, [side * .1, .55, 0], [1, 1, 1], 'leg');
    }
    g.position.set(27 + i * 1.5, 1.1, 28 + (i % 2) * 2);
    g.userData = { type: 'flamingo', base: g.position.clone(), phase: i * .7 };
    world.add(g);
    wildlife.push(g);
  }
}

addIsland();
addWildlife();

let activeHorse = createHorse({ coatIndex: state.coat, breed: state.breed });
activeHorse.position.set(0, 2.25, 1.8);
activeHorse.rotation.y = -.25;
world.add(activeHorse);

const avatar = createAvatar();
avatar.position.set(-1.7, 2.22, 3.1);
avatar.rotation.y = Math.PI * .7;
world.add(avatar);

[
  { coatIndex: 2, breed: 'friesian', position: [-17, 2.25, 17], rotation: 1.8 },
  { coatIndex: 4, breed: 'arabian', position: [-22, 2.25, 12], rotation: 2.4 },
  { coatIndex: 6, breed: 'appaloosa', position: [18, 2.25, -12], rotation: -.5 },
  { coatIndex: 1, breed: 'quarter', position: [24, 2.25, -8], rotation: -1.2 }
].forEach((data) => {
  const horse = createHorse({ coatIndex: data.coatIndex, breed: data.breed, npc: true });
  horse.position.set(...data.position);
  horse.rotation.y = data.rotation;
  horse.scale.multiplyScalar(.96);
  horse.userData.tack.visible = false;
  horse.userData.bridle.visible = false;
  horse.userData.halter.visible = false;
  horse.userData.base = horse.position.clone();
  world.add(horse);
  npcHorses.push(horse);
});

let leadLine;
function updateLeadLine() {
  if (leadLine) scene.remove(leadLine);
  if (!state.leading) return;
  const points = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  leadLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x2f706d }));
  scene.add(leadLine);
}

function saveProfile() {
  const profile = { horseName: state.horseName, breed: state.breed, coat: state.coat, mane: state.mane, hair: state.hair, outfit: state.outfit, outfitColor: state.outfitColor, helmet: state.helmet, tackColor: state.tackColor, tack: state.tack, bond: state.bond };
  localStorage.setItem('isla-brisa-profile', JSON.stringify(profile));
}

function showToast(message, duration = 2200) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), duration);
}

function discovery(icon, label, text) {
  $('#discoveryIcon').textContent = icon;
  $('#discoveryLabel').textContent = label;
  $('#discoveryText').textContent = text;
  $('#discoveryCard').classList.add('show');
  clearTimeout(discovery.timer);
  discovery.timer = setTimeout(() => $('#discoveryCard').classList.remove('show'), 4300);
}

function updateHud() {
  $('#horseName').textContent = state.horseName;
  $('#horseNameInput').value = state.horseName;
  $('#horseBreedLabel').textContent = `${COATS[state.coat].name} ${BREEDS[state.breed].name}`;
  $('#bondMeter').style.width = `${state.bond}%`;
  $('#bondValue').textContent = `${Math.round(state.bond)}%`;
  $('#moodMeter').style.width = `${state.mood}%`;
  $('#moodValue').textContent = state.mood > 80 ? 'Happy' : state.mood > 55 ? 'Calm' : 'Curious';
  $('#energyMeter').style.width = `${state.energy}%`;
  $('#energyValue').textContent = `${Math.round(state.energy)}%`;
  $('#mountBtn').classList.toggle('active', state.mounted);
  $('#mountBtn b').textContent = state.mounted ? 'Dismount' : 'Mount';
  $('#leadBtn').classList.toggle('active', state.leading);
  $('#leadBtn b').textContent = state.leading ? 'Release' : 'Lead';
  $$('.gait').forEach((button) => button.classList.toggle('active', button.dataset.gait === state.gait));
}

function distanceXZ(a, b) {
  const dx = a.position.x - b.position.x;
  const dz = a.position.z - b.position.z;
  return Math.hypot(dx, dz);
}

function mountToggle() {
  if (state.careBusy) return;
  if (!state.mounted && distanceXZ(avatar, activeHorse) > 4) {
    showToast(`Walk closer to ${state.horseName} to mount.`);
    return;
  }
  state.mounted = !state.mounted;
  state.leading = false;
  updateLeadLine();
  applyTackVisibility(activeHorse);
  if (state.mounted) {
    state.gait = 'walk';
    showToast(`${state.horseName} stands quietly while you mount.`);
    discovery('🌴', 'TRAIL READY', 'Ride toward the waterfall, beach, or jungle grove.');
  } else {
    const offset = new THREE.Vector3(-1.6, 0, 1.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), activeHorse.rotation.y);
    avatar.position.copy(activeHorse.position).add(offset);
    avatar.position.y = 2.22;
    avatar.rotation.y = activeHorse.rotation.y;
    showToast(`You dismounted safely beside ${state.horseName}.`);
  }
  updateHud();
}

function toggleLead() {
  if (state.mounted) {
    showToast('Dismount before using the lead rope.');
    return;
  }
  if (distanceXZ(avatar, activeHorse) > 4.5 && !state.leading) {
    showToast(`Walk closer to ${state.horseName} to attach the lead.`);
    return;
  }
  state.leading = !state.leading;
  if (state.leading) state.tack.halter = true;
  $('#halterToggle').checked = state.tack.halter;
  applyTackVisibility(activeHorse);
  updateLeadLine();
  showToast(state.leading ? `${state.horseName} lowers her head for the halter.` : `${state.horseName} is free to graze nearby.`);
  updateHud();
  saveProfile();
}

function careAction(kind) {
  if (state.mounted) {
    showToast(`Dismount to ${kind.toLowerCase()} ${state.horseName}.`);
    return;
  }
  if (distanceXZ(avatar, activeHorse) > 4.5) {
    showToast(`Walk closer to ${state.horseName}.`);
    return;
  }
  if (state.careBusy) return;
  state.careBusy = true;
  const progress = $('#careProgress');
  const label = { Feed: 'Offering a crisp apple...', Pet: 'Giving gentle scratches...', Brush: 'Brushing the coat...' }[kind];
  progress.querySelector('span').textContent = label;
  progress.classList.remove('show');
  void progress.offsetWidth;
  progress.classList.add('show');
  activeHorse.userData.headPivot.rotation.x = .12;
  setTimeout(() => {
    progress.classList.remove('show');
    state.careBusy = false;
    state.bond = clamp(state.bond + (kind === 'Brush' ? 3 : 2), 0, 100);
    state.mood = clamp(state.mood + 5, 0, 100);
    state.energy = clamp(state.energy + (kind === 'Feed' ? 8 : 1), 0, 100);
    const response = {
      Feed: `${state.horseName} crunches happily and nudges your hand for another bite.`,
      Pet: `${state.horseName}'s ears relax as she leans into your touch.`,
      Brush: `${state.horseName}'s coat shines. She gives a pleased little snort.`
    }[kind];
    showToast(response, 3000);
    updateHud();
    saveProfile();
  }, 1250);
}

function switchHorse() {
  const oldPosition = activeHorse.position.clone();
  const oldRotation = activeHorse.rotation.y;
  world.remove(activeHorse);
  activeHorse.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  });
  activeHorse = createHorse({ coatIndex: state.coat, breed: state.breed });
  activeHorse.position.copy(oldPosition);
  activeHorse.position.y = 2.25;
  activeHorse.rotation.y = oldRotation;
  world.add(activeHorse);
  state.mounted = false;
  state.leading = false;
  updateLeadLine();
  avatar.position.set(oldPosition.x - 1.8, 2.22, oldPosition.z + 1.6);
  updateHud();
  saveProfile();
  showToast(`${state.horseName}, your ${BREEDS[state.breed].name}, is ready — no coins needed!`, 3000);
}

function setGait(gait) {
  state.gait = gait;
  updateHud();
  if (state.mounted) showToast(`${state.horseName} moves into a ${gait}.`, 1400);
}

const coatSwatches = $('#coatSwatches');
COATS.forEach((coat, index) => {
  const button = document.createElement('button');
  button.className = `swatch${index === state.coat ? ' active' : ''}`;
  button.style.setProperty('--swatch', `#${coat.color.toString(16).padStart(6, '0')}`);
  button.type = 'button';
  button.title = coat.name;
  button.setAttribute('aria-label', coat.name);
  button.addEventListener('click', () => {
    state.coat = index;
    $$('#coatSwatches .swatch').forEach((item, i) => item.classList.toggle('active', i === index));
    switchHorse();
  });
  coatSwatches.appendChild(button);
});

const outfitColors = [0xf19a7f, 0x233f43, 0x2c829d, 0x8e6b9b, 0xe6b453, 0xf0e5d5];
outfitColors.forEach((color, index) => {
  const button = document.createElement('button');
  button.className = `swatch${color === state.outfitColor ? ' active' : ''}`;
  button.style.setProperty('--swatch', `#${color.toString(16).padStart(6, '0')}`);
  button.type = 'button';
  button.setAttribute('aria-label', `Outfit color ${index + 1}`);
  button.addEventListener('click', () => {
    state.outfitColor = color;
    $$('#outfitSwatches .swatch').forEach((item, i) => item.classList.toggle('active', i === index));
    applyAvatarStyle(avatar);
    saveProfile();
  });
  $('#outfitSwatches').appendChild(button);
});

const tackColors = [0x138b83, 0xe27862, 0x784f92, 0x315f8c, 0xe4b956, 0x2e493d];
const tackNames = ['Lagoon teal', 'Hibiscus coral', 'Orchid purple', 'Ocean blue', 'Sunshine gold', 'Forest green'];
tackColors.forEach((color, index) => {
  const button = document.createElement('button');
  button.className = `swatch${color === state.tackColor ? ' active' : ''}`;
  button.style.setProperty('--swatch', `#${color.toString(16).padStart(6, '0')}`);
  button.type = 'button';
  button.setAttribute('aria-label', tackNames[index]);
  button.addEventListener('click', () => {
    state.tackColor = color;
    $$('#tackSwatches .swatch').forEach((item, i) => item.classList.toggle('active', i === index));
    $('#blanketColorLabel').textContent = tackNames[index];
    applyTackVisibility(activeHorse);
    saveProfile();
  });
  $('#tackSwatches').appendChild(button);
});

$('#studioBtn').addEventListener('click', () => $('#customizer').classList.add('open'));
$('#closePanel').addEventListener('click', () => $('#customizer').classList.remove('open'));
$$('.tab').forEach((tab) => tab.addEventListener('click', () => {
  $$('.tab').forEach((item) => { item.classList.toggle('active', item === tab); item.setAttribute('aria-selected', item === tab ? 'true' : 'false'); });
  $$('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tab.dataset.tab));
}));

$('#horseNameInput').addEventListener('input', (event) => {
  state.horseName = event.target.value.trim() || 'Solana';
  updateHud();
  saveProfile();
});
$('#breedSelect').value = state.breed;
$('#breedSelect').addEventListener('change', (event) => { state.breed = event.target.value; switchHorse(); });
$('#maneSelect').value = state.mane;
$('#maneSelect').addEventListener('change', (event) => {
  state.mane = event.target.value;
  const mane = activeHorse.userData.mane;
  mane.scale.set(state.mane === 'flowing' ? 1 : state.mane === 'braided' ? .62 : .45, state.mane === 'flowing' ? 1 : .8, 1);
  saveProfile();
});
$('#meetHorseBtn').addEventListener('click', () => { switchHorse(); $('#customizer').classList.remove('open'); });
$('#hairSelect').value = state.hair;
$('#hairSelect').addEventListener('change', (event) => { state.hair = event.target.value; applyAvatarStyle(avatar); saveProfile(); });
$('#outfitSelect').value = state.outfit;
$('#outfitSelect').addEventListener('change', (event) => { state.outfit = event.target.value; state.outfitColor = OUTFITS[state.outfit].top; applyAvatarStyle(avatar); saveProfile(); });
$('#helmetToggle').checked = state.helmet;
$('#helmetToggle').addEventListener('change', (event) => { state.helmet = event.target.checked; applyAvatarStyle(avatar); saveProfile(); });

[['saddleToggle','saddle'], ['blanketToggle','blanket'], ['bridleToggle','bridle'], ['halterToggle','halter']].forEach(([id, key]) => {
  const input = $(`#${id}`);
  input.checked = state.tack[key];
  input.addEventListener('change', () => { state.tack[key] = input.checked; if (key === 'halter' && !input.checked) state.leading = false; applyTackVisibility(activeHorse); updateLeadLine(); updateHud(); saveProfile(); });
});

$('#mountBtn').addEventListener('click', mountToggle);
$('#leadBtn').addEventListener('click', toggleLead);
$('#feedBtn').addEventListener('click', () => careAction('Feed'));
$('#petBtn').addEventListener('click', () => careAction('Pet'));
$('#brushBtn').addEventListener('click', () => careAction('Brush'));
$$('.gait').forEach((button) => button.addEventListener('click', () => setGait(button.dataset.gait)));

const helpDialog = $('#helpDialog');
$('#helpBtn').addEventListener('click', () => helpDialog.showModal());
$('#helpClose').addEventListener('click', () => helpDialog.close());
$('#letsRideBtn').addEventListener('click', () => helpDialog.close());
$('#soundBtn').addEventListener('click', () => {
  state.sound = !state.sound;
  $('#soundBtn').textContent = state.sound ? '♫' : '×';
  showToast(state.sound ? 'Island ambience on' : 'Island ambience muted');
});

document.addEventListener('keydown', (event) => {
  if (event.target.matches('input,select') || helpDialog.open) return;
  state.keys[event.key.toLowerCase()] = true;
  if (!event.repeat) {
    if (event.key.toLowerCase() === 'm') mountToggle();
    if (event.key.toLowerCase() === 'l') toggleLead();
    if (event.key.toLowerCase() === 'f') careAction('Feed');
    if (event.key.toLowerCase() === 'p') careAction('Pet');
    if (event.key.toLowerCase() === 'b') careAction('Brush');
    if (['1','2','3'].includes(event.key)) setGait(['walk','trot','gallop'][Number(event.key) - 1]);
  }
});
document.addEventListener('keyup', (event) => { state.keys[event.key.toLowerCase()] = false; });
$$('[data-move]').forEach((button) => {
  const key = button.dataset.move;
  const on = (event) => { event.preventDefault(); state.touchKeys[key] = true; };
  const off = (event) => { event.preventDefault(); state.touchKeys[key] = false; };
  button.addEventListener('pointerdown', on);
  button.addEventListener('pointerup', off);
  button.addEventListener('pointercancel', off);
  button.addEventListener('pointerleave', off);
});

function pressed(name) {
  const keys = { forward: ['w','arrowup'], back: ['s','arrowdown'], left: ['a','arrowleft'], right: ['d','arrowright'] }[name];
  return state.touchKeys[name] || keys.some((key) => state.keys[key]);
}

function keepOnIsland(object, radius = 47) {
  const length = Math.hypot(object.position.x, object.position.z);
  if (length > radius) {
    object.position.x *= radius / length;
    object.position.z *= radius / length;
  }
}

function animateHorse(horse, dt, moving, speedFactor) {
  const data = horse.userData;
  const phase = state.time * (moving ? 5 + speedFactor * 2 : 1.2) + data.phase;
  const amount = moving ? .42 + speedFactor * .12 : .025;
  data.legPivots.forEach((leg, index) => {
    const offset = index === 0 || index === 3 ? 0 : Math.PI;
    leg.rotation.z = Math.sin(phase + offset) * amount;
  });
  data.body.position.y = 3.35 + Math.sin(phase * 2) * (moving ? .05 + speedFactor * .018 : .018);
  data.chest.position.y = 3.25 + Math.sin(phase * 2) * (moving ? .045 : .012);
  data.headPivot.rotation.x = lerp(data.headPivot.rotation.x, Math.sin(phase * .7) * (moving ? .06 : .035), .06);
  data.tailPivot.rotation.y = Math.sin(state.time * 2.2 + data.phase) * .26;
}

function updatePlayer(dt) {
  const forward = pressed('forward') ? 1 : pressed('back') ? -1 : 0;
  const turn = pressed('left') ? 1 : pressed('right') ? -1 : 0;
  if (state.mounted) {
    const speeds = { walk: 3.2, trot: 6.2, gallop: 10.3 };
    const speed = speeds[state.gait] * (forward < 0 ? .45 : 1);
    activeHorse.rotation.y += turn * dt * (forward ? 1.35 : .85);
    if (forward) {
      activeHorse.position.x += Math.sin(activeHorse.rotation.y) * speed * forward * dt;
      activeHorse.position.z += Math.cos(activeHorse.rotation.y) * speed * forward * dt;
      state.energy = clamp(state.energy - dt * (state.gait === 'gallop' ? .55 : .12), 20, 100);
    }
    keepOnIsland(activeHorse);
    avatar.position.copy(activeHorse.position);
    avatar.position.y = activeHorse.position.y + 4.62;
    avatar.rotation.y = activeHorse.rotation.y;
    avatar.userData.legPivots[0].rotation.z = -.72;
    avatar.userData.legPivots[1].rotation.z = .72;
    avatar.userData.armPivots[0].rotation.z = -.62;
    avatar.userData.armPivots[1].rotation.z = .62;
    animateHorse(activeHorse, dt, Boolean(forward), state.gait === 'walk' ? .3 : state.gait === 'trot' ? .7 : 1);
  } else {
    const speed = state.keys.shift ? 5.5 : 3.6;
    avatar.rotation.y += turn * dt * 2.15;
    if (forward) {
      avatar.position.x += Math.sin(avatar.rotation.y) * speed * forward * dt;
      avatar.position.z += Math.cos(avatar.rotation.y) * speed * forward * dt;
    }
    keepOnIsland(avatar);
    const walkPhase = state.time * 7;
    avatar.userData.legPivots.forEach((leg, index) => { leg.rotation.z = forward ? Math.sin(walkPhase + index * Math.PI) * .45 : lerp(leg.rotation.z, 0, .12); });
    avatar.userData.armPivots.forEach((arm, index) => { arm.rotation.z = forward ? Math.sin(walkPhase + (index + 1) * Math.PI) * .25 : lerp(arm.rotation.z, 0, .12); });
    if (state.leading) {
      const desired = avatar.position.clone().add(new THREE.Vector3(-1.8, .03, -1.35).applyAxisAngle(new THREE.Vector3(0,1,0), avatar.rotation.y));
      const distance = activeHorse.position.distanceTo(desired);
      activeHorse.position.lerp(desired, Math.min(1, dt * (distance > 4 ? 3.5 : 1.8)));
      activeHorse.rotation.y = lerp(activeHorse.rotation.y, avatar.rotation.y, dt * 2.4);
      keepOnIsland(activeHorse);
      animateHorse(activeHorse, dt, Boolean(forward) || distance > 1, .35);
    } else {
      animateHorse(activeHorse, dt, false, 0);
    }
  }

  if (leadLine && state.leading) {
    const positions = leadLine.geometry.attributes.position;
    const start = activeHorse.position.clone().add(new THREE.Vector3(.8, 5.2, 0).applyAxisAngle(new THREE.Vector3(0,1,0), activeHorse.rotation.y));
    const end = avatar.position.clone().add(new THREE.Vector3(.32, 1.8, .2).applyAxisAngle(new THREE.Vector3(0,1,0), avatar.rotation.y));
    const mid = start.clone().lerp(end, .5); mid.y -= .45;
    [start, mid, end].forEach((point, i) => positions.setXYZ(i, point.x, point.y, point.z));
    positions.needsUpdate = true;
  }
}

function updateCamera(dt) {
  const target = state.mounted ? activeHorse.position : avatar.position;
  const heading = state.mounted ? activeHorse.rotation.y : avatar.rotation.y;
  const distance = state.mounted ? 11.5 : 8.2;
  const height = state.mounted ? 7.6 : 5.7;
  const desired = new THREE.Vector3(
    target.x - Math.sin(heading) * distance,
    target.y + height,
    target.z - Math.cos(heading) * distance
  );
  camera.position.lerp(desired, 1 - Math.pow(.002, dt));
  const look = target.clone();
  look.y += state.mounted ? 3.3 : 1.7;
  camera.lookAt(look);
}

function updateWildlife() {
  wildlife.forEach((animal) => {
    const data = animal.userData;
    if (data.type === 'parrot') {
      animal.position.x = data.base.x + Math.sin(state.time * .45 + data.phase) * 4;
      animal.position.z = data.base.z + Math.cos(state.time * .45 + data.phase) * 4;
      animal.position.y = data.base.y + Math.sin(state.time * 1.6 + data.phase) * .7;
      animal.rotation.y = state.time * .45 + data.phase;
      data.wing.rotation.x = Math.sin(state.time * 9 + data.phase) * .75;
    } else if (data.type === 'monkey') {
      animal.position.y = data.base.y + Math.abs(Math.sin(state.time * 1.2 + data.phase)) * .12;
      animal.rotation.y = Math.sin(state.time * .5 + data.phase) * .4;
    } else {
      animal.rotation.y = Math.sin(state.time * .25 + data.phase) * .18;
    }
  });
  npcHorses.forEach((horse, index) => {
    horse.position.x = horse.userData.base.x + Math.sin(state.time * .12 + index) * 2;
    horse.position.z = horse.userData.base.z + Math.cos(state.time * .12 + index) * 1.4;
    horse.rotation.y = Math.atan2(Math.cos(state.time * .12 + index) * .24, -Math.sin(state.time * .12 + index) * .18);
    animateHorse(horse, .016, true, .15);
  });
}

function checkReactions(dt) {
  state.reactionCooldown = Math.max(0, state.reactionCooldown - dt);
  if (state.reactionCooldown > 0) return;
  const horsePos = activeHorse.position;
  const closeHorse = npcHorses.find((horse) => horse.position.distanceTo(horsePos) < 7);
  if (closeHorse) {
    activeHorse.userData.headPivot.rotation.y = .35;
    discovery('🐴', 'HORSE HELLO', `${state.horseName} pricks up her ears and nickers to the nearby herd.`);
    state.reactionCooldown = 9;
    return;
  }
  const closeAnimal = wildlife.find((animal) => animal.position.distanceTo(horsePos) < (animal.userData.type === 'parrot' ? 9 : 7));
  if (closeAnimal) {
    const reactions = {
      parrot: ['🦜', 'JUNGLE FRIEND', `${state.horseName} follows the bright parrot with curious ears.`],
      monkey: ['🐒', 'CURIOUS MONKEY', `${state.horseName} snorts softly as a monkey rustles the palms.`],
      flamingo: ['🦩', 'LAGOON FLOCK', `${state.horseName} slows down to watch the flamingos.`]
    }[closeAnimal.userData.type];
    discovery(...reactions);
    activeHorse.userData.headPivot.rotation.y = -.3;
    state.reactionCooldown = 10;
  }
}

const miniCtx = $('#miniMap').getContext('2d');
function drawMiniMap() {
  const w = 176;
  miniCtx.clearRect(0, 0, w, w);
  const grad = miniCtx.createRadialGradient(88, 83, 25, 88, 83, 84);
  grad.addColorStop(0, '#b9cf78');
  grad.addColorStop(.72, '#63a65d');
  grad.addColorStop(.74, '#edcf8f');
  grad.addColorStop(.84, '#4aabb0');
  grad.addColorStop(1, '#277b87');
  miniCtx.fillStyle = grad;
  miniCtx.fillRect(0,0,w,w);
  miniCtx.strokeStyle = 'rgba(246,222,171,.75)';
  miniCtx.lineWidth = 5;
  miniCtx.beginPath();
  miniCtx.arc(88,88,36,0,Math.PI*1.55);
  miniCtx.stroke();
  const object = state.mounted ? activeHorse : avatar;
  const x = 88 + object.position.x * 1.45;
  const y = 88 + object.position.z * 1.45;
  miniCtx.save();
  miniCtx.translate(x,y);
  miniCtx.rotate(-(object.rotation.y || 0));
  miniCtx.fillStyle = '#fff';
  miniCtx.strokeStyle = '#0b5e58';
  miniCtx.lineWidth = 3;
  miniCtx.beginPath();
  miniCtx.moveTo(0,-8); miniCtx.lineTo(6,7); miniCtx.lineTo(0,4); miniCtx.lineTo(-6,7); miniCtx.closePath();
  miniCtx.fill(); miniCtx.stroke();
  miniCtx.restore();
}

function updateLocation() {
  const object = state.mounted ? activeHorse : avatar;
  const { x, z } = object.position;
  let name = 'Sunshore Paddock';
  if (x > 20 && z > 15) name = 'Moonfall Lagoon';
  else if (x < -28) name = 'Pearlwind Beach';
  else if (x < -8 && z > 7) name = 'Banyan Stables';
  else if (x > 12 && z < -2) name = 'Coral Training Ring';
  else if (z > 18) name = 'Parrot Palm Grove';
  $('#locationName').textContent = name;
}

const clock = new THREE.Clock();
let hudTick = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .04);
  state.time += dt;
  updatePlayer(dt);
  updateCamera(dt);
  updateWildlife();
  checkReactions(dt);
  animatedPlants.forEach((plant, index) => { plant.rotation.z = Math.sin(state.time * .55 + index) * .006; });
  scene.children.forEach((child) => {
    if (child.userData.water) child.material.opacity = .82 + Math.sin(state.time * .55) * .035;
  });
  hudTick += dt;
  if (hudTick > .25) {
    hudTick = 0;
    drawMiniMap();
    updateLocation();
    updateHud();
  }
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
});

updateHud();
applyAvatarStyle(avatar);
setTimeout(() => {
  $('#loadingScreen').classList.add('done');
  showToast(`Welcome to Isla Brisa! ${state.horseName} is waiting for you.`, 3200);
  setTimeout(() => discovery('🌺', 'ISLAND MOMENT', `${state.horseName} is enjoying the ocean breeze.`), 1200);
}, 900);
animate();
