/* WebGL scenes, loaded on demand by main.js.
   1. spine(): stylised vertebral column that straightens as the "Método" section is read.
   2. blob():  slow organic form for the CTA band, bulging gently toward the pointer
               (cursor on desktop, scroll and touch on phones).
   Three.js is imported by full URL (no import map needed, so older Safari and in-app
   browsers resolve it). The reflection environment is a desktop-only extra. */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const isSmall = () => Math.min(innerWidth, screen.width || innerWidth) < 900;
const MAX_SIDE = 2048; // drawing-buffer cap, keeps phones well under GPU limits

// Soft studio room used as a reflection environment (desktop only). Built with the same
// THREE instance, so it needs no extra module: a dim box with a few emissive panels.
function studio() {
  const room = new THREE.Scene();
  const box = new THREE.BoxGeometry();
  const walls = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0x6f716b, side: THREE.BackSide }));
  walls.scale.set(12, 8, 12);
  room.add(walls);
  const panel = (x, y, z, sx, sy, sz, intensity) => {
    const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity) }));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    room.add(m);
  };
  panel(0, 3.9, 0, 6, 0.1, 4, 4);      // ceiling softbox
  panel(-5.9, 1, 1, 0.1, 3, 4, 2.2);   // left window
  panel(5.9, 0.5, -2, 0.1, 2, 3, 1.4); // right fill
  panel(0, 0.6, 5.9, 4, 2, 0.1, 1.2);  // front bounce
  return room;
}

function environment(renderer, scene) {
  if (isSmall()) return; // phones: lights only, no half-float render targets
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(studio(), 0.04).texture;
    pmrem.dispose();
  } catch { /* lights alone still give a finished look */ }
}

/* Shared plumbing: renderer, resize, visibility-gated loop, first-frame handoff. */
function stage(canvas, { draw, camera, reduceMotion, scene, dpr }) {
  const small = isSmall();
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: small ? 'default' : 'low-power',
  });
  const baseDpr = Math.min(devicePixelRatio || 1, dpr ?? (small ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if (scene?.userData.env) environment(renderer, scene);

  const clock = new THREE.Clock(false);
  let running = false, visible = false, raf = 0, lost = false, sized = false;

  const paint = () => {
    if (lost || !sized) return;
    draw(clock.getElapsedTime(), renderer);
    if (!canvas.classList.contains('is-live')) requestAnimationFrame(() => canvas.classList.add('is-live'));
  };
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(baseDpr, MAX_SIDE / Math.max(w, h)));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    sized = true;
    if (!running) paint();
  };
  const loop = () => { paint(); raf = requestAnimationFrame(loop); };
  const start = () => {
    if (running || reduceMotion || document.hidden || !visible || lost) return;
    running = true; clock.start(); raf = requestAnimationFrame(loop);
  };
  const stop = () => { running = false; clock.stop(); cancelAnimationFrame(raf); };

  // GPU reset (common on iOS when the tab is backgrounded): hand back to the fallback image
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; stop(); canvas.classList.remove('is-live'); });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; resize(); start(); });

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  resize();
  return renderer;
}

/* ------------------------------------------------------------------ */
/* 1. Spine                                                            */
/* ------------------------------------------------------------------ */
export function spine(canvas, { motion, reduceMotion }) {
  const dt = document.documentElement.dataset.theme;
  const light = dt ? dt === 'light' : !matchMedia('(prefers-color-scheme: dark)').matches;
  const small = isSmall();
  const scene = new THREE.Scene();
  scene.userData.env = true;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 15);

  scene.add(new THREE.HemisphereLight(0xfbf9f3, light ? 0x3f4a3c : 0x5c6b58, small ? (light ? 0.75 : 0.95) : (light ? 0.35 : 0.55)));
  const key = new THREE.DirectionalLight(0xfff8ec, 2.4);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9d6bf, 1.6);
  rim.position.set(-6, 2, -5);
  scene.add(rim);

  // Phones get the cheaper standard material; desktop keeps clearcoat and sheen.
  const boneColor = light ? 0xc4bba8 : 0xe6e0d2;
  const discColor = light ? 0x6f8068 : 0x8a9a82;
  const bone = small
    ? new THREE.MeshStandardMaterial({ color: boneColor, roughness: 0.6, metalness: 0 })
    : new THREE.MeshPhysicalMaterial({
        color: boneColor, roughness: 0.62, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.7, envMapIntensity: light ? 0.22 : 0.4,
        sheen: 0.4, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.8,
      });
  const disc = small
    ? new THREE.MeshStandardMaterial({ color: discColor, roughness: 0.4 })
    : new THREE.MeshPhysicalMaterial({ color: discColor, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 });

  // Vertebral body: lathe with a soft concave waist and rounded rims.
  const seg = small ? 24 : 44;
  const prof = [];
  const H = 0.3, R = 0.36;
  prof.push(new THREE.Vector2(0, -H / 2));
  const rows = small ? 10 : 14;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = (t - 0.5) * H;
    const edge = Math.sin(t * Math.PI); // 0 at rims, 1 at waist
    const round = Math.pow(Math.abs(2 * t - 1), 6); // pulls rims in for a bevel
    prof.push(new THREE.Vector2(R * (1 - 0.09 * edge) - 0.05 * round, y));
  }
  prof.push(new THREE.Vector2(0, H / 2));
  const bodyGeo = new THREE.LatheGeometry(prof, seg);
  const spinGeo = new THREE.CapsuleGeometry(0.07, 0.12, small ? 4 : 6, small ? 10 : 16);
  const transGeo = new THREE.CapsuleGeometry(0.06, 0.08, small ? 4 : 6, small ? 10 : 16);
  const archGeo = new THREE.SphereGeometry(1, small ? 16 : 24, small ? 10 : 14);
  const discGeo = new THREE.SphereGeometry(1, seg, small ? 8 : 10);

  // Transform skeleton (empty Object3Ds). Parts render as five InstancedMeshes,
  // so the whole column costs five draw calls instead of about a hundred.
  const N = 17;
  const group = new THREE.Group();
  scene.add(group);
  const verts = [], discs = [];
  const slots = { body: [], arch: [], sp: [], tp: [], disc: [] };
  let y = 0;
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1); // 0 top (cervical) .. 1 bottom (lumbar)
    const s = 0.62 + 0.62 * Math.pow(k, 1.2);
    const v = new THREE.Object3D();
    const body = new THREE.Object3D();
    v.add(body); slots.body.push(body);

    // posterior arch: one soft ellipsoid bridging body and processes
    const arch = new THREE.Object3D();
    arch.scale.set(0.3, 0.1, 0.22);
    arch.position.set(0, 0.01, -0.36);
    v.add(arch); slots.arch.push(arch);
    // spinous process, pointing back and slightly down
    const sp = new THREE.Object3D();
    sp.rotation.x = Math.PI / 2 + 0.55;
    sp.position.set(0, -0.06, -0.55);
    v.add(sp); slots.sp.push(sp);
    // transverse processes
    for (const side of [-1, 1]) {
      const tp = new THREE.Object3D();
      tp.rotation.z = Math.PI / 2;
      tp.rotation.y = side * 0.35;
      tp.position.set(side * 0.38, 0.02, -0.32);
      v.add(tp); slots.tp.push(tp);
    }
    v.scale.setScalar(s);
    v.userData = { y0: -y, s, k };
    group.add(v);
    verts.push(v);

    y += H * s + 0.07 * s;
    if (i < N - 1) {
      const d = new THREE.Object3D();
      d.scale.set(R * s * 0.92, 0.035 * s, R * s * 0.92);
      d.userData = { y0: -(y - 0.035 * s), k };
      group.add(d);
      discs.push(d); slots.disc.push(d);
    }
  }
  const total = y;
  group.position.y = total / 2;

  const instanced = [
    [bodyGeo, bone, slots.body], [archGeo, bone, slots.arch], [spinGeo, bone, slots.sp],
    [transGeo, bone, slots.tp], [discGeo, disc, slots.disc],
  ].map(([geo, mat, list]) => {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    m.frustumCulled = false; // instances move far from the geometry's own bounds
    scene.add(m);
    return { m, list };
  });

  // Lateral (misaligned) curve that relaxes to zero, plus a permanent natural sagittal curve.
  const lateral = (k, t) => Math.sin(k * 5.2 + 0.7) * 0.42 + Math.sin(k * 2.1 + t * 0.4) * 0.08;
  const sagittal = (k) => Math.sin(k * Math.PI * 2 - 0.4) * 0.22;

  let p = 0, rx = 0, ry = 0;
  const place = (o, t, amt) => {
    const k = o.userData.k;
    o.position.x = lateral(k, t) * amt;
    o.position.z = sagittal(k);
    o.position.y = o.userData.y0;
    const dk = 0.02;
    o.rotation.z = -Math.atan2((lateral(k + dk, t) - lateral(k - dk, t)) * amt, 2 * dk * total);
    o.rotation.x = Math.atan2(sagittal(k + dk) - sagittal(k - dk), 2 * dk * total);
  };

  const draw = (t, renderer) => {
    const target = reduceMotion ? 0.5 : motion.method;
    p = THREE.MathUtils.lerp(p, target, 0.06);
    const ease = 1 - Math.pow(1 - p, 2);
    const amt = 1 - ease * 0.94; // keep a whisper of curve so it stays organic
    verts.forEach((v) => place(v, t, amt));
    discs.forEach((d) => place(d, t, amt));

    ry = THREE.MathUtils.lerp(ry, motion.pointer.x * 0.35, 0.05);
    rx = THREE.MathUtils.lerp(rx, motion.pointer.y * 0.12, 0.05);
    group.rotation.y = -0.95 + Math.sin(t * 0.25) * 0.22 + ease * 0.55 + ry;
    group.rotation.x = rx;
    group.rotation.z = 0.06;

    group.updateMatrixWorld(true);
    for (const { m, list } of instanced) {
      list.forEach((o, i) => m.setMatrixAt(i, o.matrixWorld));
      m.instanceMatrix.needsUpdate = true;
    }
    renderer.render(scene, camera);
  };

  stage(canvas, { draw, camera, reduceMotion, scene });
}

/* ------------------------------------------------------------------ */
/* 2. Organic blob                                                     */
/* ------------------------------------------------------------------ */
const noise = /* glsl */ `
// Simplex 3D noise, Ashima Arts / Stefan Gustavson (MIT)
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

export function blob(canvas, { motion, reduceMotion }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 5.6);

  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.2 },
    uPull: { value: new THREE.Vector3(0.4, 0.2, 1).normalize() },
    uLight: { value: new THREE.Color(0xe3e3d8) },
    uShadow: { value: new THREE.Color(0x3a4a3e) },
    uRim: { value: new THREE.Color(0x9fb194) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uAmp; uniform vec3 uPull;
      varying vec3 vN; varying vec3 vV; varying float vD;
      ${noise}
      float disp(vec3 p){
        float n = snoise(p * 0.7 + vec3(0.0, uTime * 0.14, uTime * 0.05)) * uAmp;
        n += snoise(p * 1.6 - vec3(uTime * 0.1)) * uAmp * 0.18;
        n += smoothstep(0.55, 1.0, dot(normalize(p), uPull)) * 0.12;
        return n;
      }
      vec3 orth(vec3 v){ return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0) : vec3(0.0, -v.z, v.y)); }
      void main(){
        vec3 n = normalize(position);
        vec3 t = orth(n); vec3 b = normalize(cross(n, t));
        float e = 0.012;
        vec3 p0 = n * (1.0 + disp(n));
        vec3 n1 = normalize(n + t * e); vec3 p1 = n1 * (1.0 + disp(n1));
        vec3 n2 = normalize(n + b * e); vec3 p2 = n2 * (1.0 + disp(n2));
        vec3 nn = normalize(cross(p1 - p0, p2 - p0));
        vD = disp(n);
        vec4 mv = modelViewMatrix * vec4(p0, 1.0);
        vN = normalize(normalMatrix * nn);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLight; uniform vec3 uShadow; uniform vec3 uRim;
      varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(vV);
        vec3 L = normalize(vec3(0.55, 0.75, 0.6));
        float diff = dot(N, L) * 0.5 + 0.5;
        diff = smoothstep(0.0, 1.0, diff);
        vec3 col = mix(uShadow, uLight, diff);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
        col = mix(col, uRim, fres * 0.55);
        float spec = pow(max(dot(reflect(-L, N), V), 0.0), 18.0) * 0.07;
        // faint contour lines following the surface displacement
        float band = abs(fract(vD * 14.0) - 0.5);
        float line = 1.0 - smoothstep(0.0, fwidth(vD * 14.0) * 1.2, band);
        col = mix(col, uShadow, line * 0.18 * diff);
        col += spec;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });

  material.toneMapped = false;
  const detail = isSmall() ? 32 : 72;
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, detail), material);
  scene.add(mesh);

  const pull = new THREE.Vector3();
  let rx = 0, ry = 0;
  const draw = (t, renderer) => {
    uniforms.uTime.value = reduceMotion ? 2 : t + 2;
    pull.set(motion.pointer.x * 1.2, -motion.pointer.y * 0.9, 1).normalize();
    uniforms.uPull.value.lerp(pull, 0.05).normalize();
    ry = THREE.MathUtils.lerp(ry, motion.pointer.x * 0.25, 0.04);
    rx = THREE.MathUtils.lerp(rx, motion.pointer.y * 0.18, 0.04);
    mesh.rotation.set(rx + t * 0.03, ry + t * 0.07, 0);
    renderer.render(scene, camera);
  };

  stage(canvas, { draw, camera, reduceMotion, scene });
}
