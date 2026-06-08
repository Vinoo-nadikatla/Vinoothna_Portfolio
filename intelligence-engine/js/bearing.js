// ============================================================
//  PREDICT flagship — procedural metallic bearing (Three.js, ESM)
//  Exposes window.Bearing.update({spin, explode, tilt})
// ============================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('bearing-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, preserveDrawingBuffer:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0.4, 8.6);
camera.lookAt(0, 0, 0);

// ---- environment (studio reflections) ----
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---- lighting: brand glow ----
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(4, 6, 5);
scene.add(key);
const mintL = new THREE.PointLight(0x00f5d4, 26, 30);
mintL.position.set(-5, 2, 3);
scene.add(mintL);
const violetL = new THREE.PointLight(0x7b2ff7, 22, 30);
violetL.position.set(5, -3, 2);
scene.add(violetL);
const magL = new THREE.PointLight(0xff006e, 10, 24);
magL.position.set(0, 4, -5);
scene.add(magL);
scene.add(new THREE.AmbientLight(0x101830, 0.6));

// ---- materials ----
const steel = new THREE.MeshStandardMaterial({
  color:0xc8ccd2, metalness:0.96, roughness:0.30, envMapIntensity:1.25,
});
const steelDark = new THREE.MeshStandardMaterial({
  color:0x8b94a6, metalness:0.94, roughness:0.42, envMapIntensity:1.0,
});
const chrome = new THREE.MeshStandardMaterial({
  color:0xeef2f8, metalness:1.0, roughness:0.08, envMapIntensity:1.6,
});
const cageMat = new THREE.MeshStandardMaterial({
  color:0xd9a441, metalness:0.92, roughness:0.34, envMapIntensity:1.1,
});

// ---- helper: revolve a rectangular ring cross-section into a race ----
function race(ri, ro, hw, mat){
  const c = 0.05; // chamfer
  const pts = [
    new THREE.Vector2(ri, -hw+c),
    new THREE.Vector2(ri+c, -hw),
    new THREE.Vector2(ro-c, -hw),
    new THREE.Vector2(ro, -hw+c),
    new THREE.Vector2(ro, hw-c),
    new THREE.Vector2(ro-c, hw),
    new THREE.Vector2(ri+c, hw),
    new THREE.Vector2(ri, hw-c),
    new THREE.Vector2(ri, -hw+c),
  ];
  const geo = new THREE.LatheGeometry(pts, 160);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  return m;
}

const RI_IN = 1.00, RO_IN = 1.34;     // inner race
const RI_OUT = 1.66, RO_OUT = 2.02;   // outer race
const HW = 0.34;
const RMID = (RO_IN + RI_OUT) / 2;    // ball pitch radius
const RB = 0.27;
const NBALLS = 12;

const bearing = new THREE.Group();

const outerRace = race(RI_OUT, RO_OUT, HW, steel);
const innerRace = race(RI_IN, RO_IN, HW, steel);
bearing.add(outerRace, innerRace);

// balls (orbit group)
const ballGroup = new THREE.Group();
const ballGeo = new THREE.SphereGeometry(RB, 40, 40);
const balls = [];
for (let i=0;i<NBALLS;i++){
  const a = (i/NBALLS)*Math.PI*2;
  const b = new THREE.Mesh(ballGeo, chrome);
  b.position.set(Math.cos(a)*RMID, 0, Math.sin(a)*RMID);
  b.userData.angle = a;
  ballGroup.add(b);
  balls.push(b);
}
bearing.add(ballGroup);

// cage: two thin rings holding the balls
function cageRing(y){
  const g = new THREE.TorusGeometry(RMID, 0.05, 18, 180);
  const m = new THREE.Mesh(g, cageMat);
  m.rotation.x = Math.PI/2;
  m.position.y = y;
  return m;
}
const cage = new THREE.Group();
cage.add(cageRing(0.20), cageRing(-0.20));
// cage pockets (little posts between balls)
for (let i=0;i<NBALLS;i++){
  const a = ((i+0.5)/NBALLS)*Math.PI*2;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.42,12), cageMat);
  post.position.set(Math.cos(a)*RMID, 0, Math.sin(a)*RMID);
  cage.add(post);
}
bearing.add(cage);

// engraved-feel inner hub line (thin ring just to add detail)
const hub = race(0.96, 1.00, HW*1.02, steelDark);
bearing.add(hub);

// orient: bearing axis -> Z (faces the camera), with a base tilt
bearing.rotation.x = Math.PI/2;
scene.add(bearing);

// outer "energy" wireframe ring that appears on explode
const auraGeo = new THREE.TorusGeometry(RO_OUT+0.25, 0.012, 8, 200);
const auraMat = new THREE.MeshBasicMaterial({ color:0x00f5d4, transparent:true, opacity:0 });
const aura = new THREE.Mesh(auraGeo, auraMat);
aura.rotation.x = Math.PI/2;
bearing.add(aura);

// ---- state ----
const state = { spin:0, explode:0, tilt:0, _spinV:0 };
window.Bearing = {
  update(o){
    if (o.spin    !== undefined) state.spin = o.spin;
    if (o.explode !== undefined) state.explode = o.explode;
    if (o.tilt    !== undefined) state.tilt = o.tilt;
  }
};

// ---- resize ----
function resize(){
  const r = canvas.getBoundingClientRect();
  const w = r.width || window.innerWidth, h = r.height || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
window.addEventListener('resize', resize);
resize();

// ---- loop ----
const clock = new THREE.Clock();
function frame(dt, t){
  // base axis spin (around bearing's own axis = local Y) + scroll spin
  bearing.rotation.y = state.spin + t*0.16;

  // gentle presentation tilt (eased toward target)
  const targetTiltX = Math.PI/2 + 0.34 + state.tilt*0.25;
  bearing.rotation.x += (targetTiltX - bearing.rotation.x)*Math.min(1,dt*4);
  bearing.rotation.z = Math.sin(t*0.2)*0.04;

  // balls orbit slightly relative to races (cage motion)
  ballGroup.rotation.y = t*0.10;
  cage.rotation.y = t*0.10;

  // EXPLODE: separate components along the bearing axis (local Y -> depth on screen)
  const e = state.explode;
  outerRace.position.y =  e*0.95;
  innerRace.position.y = -e*0.95;
  hub.position.y       = -e*0.95;
  cage.position.y      =  e*0.35;
  ballGroup.position.y =  e*0.0;
  const rscale = 1 + e*0.10;
  balls.forEach(b=>{
    const a = b.userData.angle;
    b.position.set(Math.cos(a)*RMID*rscale, 0, Math.sin(a)*RMID*rscale);
    b.rotation.y = t*0.6;
  });
  auraMat.opacity = e*0.6;
  aura.scale.setScalar(1 + e*0.04 + Math.sin(t*2)*0.01*e);

  // subtle exposure pulse with brand lights
  mintL.intensity = 22 + Math.sin(t*1.3)*5;
  violetL.intensity = 18 + Math.cos(t*1.1)*5;

  renderer.render(scene, camera);
}
function tick(){
  frame(clock.getDelta(), clock.elapsedTime);
  requestAnimationFrame(tick);
}
tick();

// verification hook: render one frame at an explicit state (used when rAF is throttled)
window.Bearing.debugRender = function(o={}){
  state.spin    = o.spin    ?? 1.1;
  state.explode = o.explode ?? 0;
  state.tilt    = o.tilt    ?? 1;
  bearing.rotation.x = Math.PI/2 + 0.34 + state.tilt*0.25;  // snap tilt (no easing)
  frame(0.0001, o.t ?? 0.0);
};

// signal ready
window.dispatchEvent(new Event('bearing-ready'));
