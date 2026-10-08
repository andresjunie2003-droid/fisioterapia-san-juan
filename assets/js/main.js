/* Centro de Fisioterapia San Juan: interaction layer.
   Vanilla JS, no dependencies. Three.js scenes are imported on demand. */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const desktop = matchMedia('(min-width: 900px)');
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

window.__sjReady = true; // tells the inline failsafe in <head> that motion is running

/* Shared state read by the WebGL scenes */
export const motion = { method: 0, pointer: { x: 0, y: 0 } };

/* ---------- load-in ---------- */
requestAnimationFrame(() => document.body.classList.add('is-loaded'));
$$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- button label roll ---------- */
$$('.btn__label').forEach((label) => {
  const roll = document.createElement('span');
  roll.className = 'btn__roll';
  roll.textContent = label.textContent;
  label.textContent = '';
  label.append(roll);
});

/* ---------- scroll reveals ---------- */
const revealIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  },
  { rootMargin: '0px 0px -12% 0px', threshold: 0.01 }
);
// small stagger between siblings revealed together
$$('.reveal').forEach((el) => {
  const sibs = $$(':scope > .reveal', el.parentElement);
  const i = sibs.indexOf(el);
  if (i > 0) el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`);
  revealIO.observe(el);
});
// clip-path hides the mask element from IntersectionObserver, so watch its parent instead
const maskIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    $$(':scope > .reveal-mask', e.target).forEach((m) => m.classList.add('is-in'));
    maskIO.unobserve(e.target);
  });
}, { rootMargin: '0px 0px -10% 0px' });
new Set($$('.reveal-mask').map((m) => m.parentElement)).forEach((p) => maskIO.observe(p));

/* ---------- nav state ---------- */
const nav = $('[data-nav]');
const sentinel = document.createElement('div');
sentinel.style.cssText = 'position:absolute;top:40px;height:1px;width:1px;pointer-events:none';
document.body.prepend(sentinel);
let atTop = true;
new IntersectionObserver(([e]) => { atTop = e.isIntersecting; nav.classList.toggle('is-scrolled', !atTop); }).observe(sentinel);

/* ---------- mobile menu ---------- */
const menu = $('[data-menu]');
const toggle = $('[data-menu-toggle]');
const main = $('#main');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  $('.sr-only', toggle).textContent = open ? 'Cerrar menú' : 'Abrir menú';
  document.documentElement.style.overflow = open ? 'hidden' : '';
  main.inert = open;
  document.documentElement.classList.toggle('menu-open', open);
  if (open) {
    menu.hidden = false;
    $$('a', menu).forEach((a, i) => a.style.setProperty('--i', i));
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    nav.classList.add('is-scrolled');
  } else {
    menu.classList.remove('is-open');
    nav.classList.toggle('is-scrolled', !atTop);
    setTimeout(() => { if (toggle.getAttribute('aria-expanded') === 'false') menu.hidden = true; }, 400);
  }
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
});
desktop.addEventListener('change', (e) => e.matches && setMenu(false));

/* ---------- mobile action dock ---------- */
const dock = $('[data-dock]');
const contact = $('#contacto');
let heroVisible = true, contactVisible = false;
function updateDock() {
  const on = !heroVisible && !contactVisible;
  dock.classList.toggle('is-on', on);
  document.documentElement.classList.toggle('dock-on', on);
  dock.setAttribute('aria-hidden', String(!on));
  $$('a', dock).forEach((a) => (on ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1')));
}
new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; updateDock(); }, { rootMargin: '0px 0px -30% 0px' }).observe($('.hero__ctas'));
new IntersectionObserver(([e]) => { contactVisible = e.isIntersecting; updateDock(); }).observe(contact);

/* ---------- services index: desktop shows all descriptions, phones use the accordion ---------- */
const index = $('[data-index]');
const items = $$('.index__item', index);
function syncIndex() {
  items.forEach(({ firstElementChild: d }) => {
    if (desktop.matches) d.setAttribute('open', '');
    else d.removeAttribute('open');
  });
}
syncIndex();
desktop.addEventListener('change', syncIndex);
$$('summary', index).forEach((s) => s.addEventListener('click', (e) => desktop.matches && e.preventDefault()));

/* ---------- magnetic buttons ---------- */
if (finePointer && !reduceMotion) {
  $$('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      el.style.transform = `translate(${x * 8}px, ${y * 6}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1), color .45s, border-color .45s';
      el.style.transform = '';
      setTimeout(() => (el.style.transition = ''), 600);
    });
  });
}

/* ---------- pointer (normalised, smoothed) ---------- */
if (finePointer) {
  addEventListener('pointermove', (e) => {
    motion.pointer.x = (e.clientX / innerWidth) * 2 - 1;
    motion.pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
}

/* ---------- touch: phones get scroll- and finger-driven motion instead of a cursor ---------- */
const touch = { x: 0, y: 0, active: false, ox: 0, oy: 0 };
if (!finePointer && !reduceMotion) {
  const read = (e) => {
    const t = e.touches[0];
    if (!t) return;
    touch.x = (t.clientX / innerWidth) * 2 - 1;
    touch.y = (t.clientY / innerHeight) * 2 - 1;
  };
  addEventListener('touchstart', (e) => { touch.active = true; read(e); }, { passive: true });
  addEventListener('touchmove', read, { passive: true });
  addEventListener('touchend', () => (touch.active = false), { passive: true });
  addEventListener('touchcancel', () => (touch.active = false), { passive: true });
}

/* ---------- manifesto: words light up as the paragraph crosses the viewport ---------- */
const manifesto = $('[data-words]');
if (!reduceMotion) {
  manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  manifesto.setAttribute('data-words-ready', '');
}
const words = $$('.w', manifesto);

/* ---------- frame loop, gated: only runs while a scroll-linked element is on screen ---------- */
const parallax = reduceMotion ? [] : $$("[data-parallax]").map((el) => ({ el, speed: parseFloat(el.dataset.parallax), on: false, max: 0 }));
const measure = () => parallax.forEach((p) => (p.max = Math.max(0, (p.el.offsetHeight - p.el.parentElement.offsetHeight) / 2 - 1)));
measure();
addEventListener("resize", measure);
addEventListener("load", measure);
const method = $('[data-method]');
const cta = $('[data-cta]');
const steps = $$('[data-step]');
const spineCanvas = $('[data-spine]');
const tracked = new Set();
let loop = 0;
const heroMedia = $('[data-hero-media] img');
const heroPtr = { x: 0, y: 0 };

function frame() {
  const vh = innerHeight;

  for (const p of parallax) {
    if (!p.on) continue;
    const r = p.el.parentElement.getBoundingClientRect();
    const center = r.top + r.height / 2 - vh / 2;
    const off = clamp(-center * p.speed, -p.max, p.max);
    let t = `translate3d(0, ${off.toFixed(1)}px, 0)`;
    if (p.el === heroMedia && finePointer) {
      heroPtr.x = lerp(heroPtr.x, motion.pointer.x, 0.06);
      heroPtr.y = lerp(heroPtr.y, motion.pointer.y, 0.06);
      t = `translate3d(${(heroPtr.x * -10).toFixed(2)}px, ${clamp(off + heroPtr.y * -8, -p.max, p.max).toFixed(2)}px, 0) scale(1.02)`;
    }
    p.el.style.transform = t;
  }

  if (tracked.has(manifesto) && words.length) {
    const r = manifesto.getBoundingClientRect();
    const prog = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
    const lit = Math.round(prog * words.length);
    words.forEach((w, i) => w.classList.toggle('is-on', i < lit));
  }

  if (tracked.has(method)) {
    if (desktop.matches) {
      const r = method.getBoundingClientRect();
      motion.method = clamp((vh * 0.6 - r.top) / (r.height - vh * 0.4));
    } else {
      // mobile: the canvas is not pinned, so the spine aligns while it crosses the viewport
      const r = spineCanvas.getBoundingClientRect();
      motion.method = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.25));
    }
  }

  // Phones: no cursor, so the 3D pieces sway with scroll position, and a finger on the
  // screen nudges them while it moves (the scenes ease every change).
  if (!finePointer && !reduceMotion) {
    let sx = 0, sy = 0;
    if (tracked.has(method)) {
      sx = Math.sin(motion.method * Math.PI * 1.5) * 0.6;
    }
    if (tracked.has(cta)) {
      const r = cta.getBoundingClientRect();
      const pc = clamp((vh - r.top) / (vh + r.height));
      sx = (pc - 0.5) * 1.4;
      sy = (0.5 - pc) * 0.8;
    }
    touch.ox = lerp(touch.ox, touch.active ? touch.x : 0, 0.08);
    touch.oy = lerp(touch.oy, touch.active ? touch.y : 0, 0.08);
    motion.pointer.x = clamp(sx + touch.ox * 0.8, -1, 1);
    motion.pointer.y = clamp(sy + touch.oy * 0.5, -1, 1);
  }

  loop = tracked.size ? requestAnimationFrame(frame) : 0;
}

const loopIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    const p = parallax.find((x) => x.el.parentElement === e.target);
    if (p) p.on = e.isIntersecting;
    e.isIntersecting ? tracked.add(e.target) : tracked.delete(e.target);
  });
  if (tracked.size && !loop) loop = requestAnimationFrame(frame);
}, { rootMargin: '10% 0px' });
parallax.forEach((p) => loopIO.observe(p.el.parentElement));
if (!reduceMotion) loopIO.observe(manifesto);
loopIO.observe(method);
loopIO.observe(cta);

/* ---------- method steps ---------- */
const stepIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-active'));
}, { rootMargin: '0px 0px -45% 0px' });
steps.forEach((s) => stepIO.observe(s));

/* ---------- map: load the iframe only when needed ---------- */
const map = $('[data-map]');
new IntersectionObserver(([e], io) => {
  if (!e.isIntersecting) return;
  const f = $('iframe', map);
  f.addEventListener('load', () => map.classList.add('is-loaded'), { once: true });
  f.src = f.dataset.src;
  io.disconnect();
}, { rootMargin: '400px' }).observe(map);

/* ---------- 3D: import Three.js only when a scene approaches ----------
   Each canvas sits over a still image of the same render (.gl-fallback). The canvas fades in
   only after its first real frame, so a phone without WebGL 2, a failed CDN request or a
   lost GPU context shows the still image instead of an empty space. */
function webgl2OK() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext(); // free the probe context (iOS caps them)
    return true;
  } catch { return false; }
}
if (webgl2OK()) {
  let mod;
  const load = () => (mod ??= import('./scenes.js'));
  const mount = (canvas, name) =>
    new IntersectionObserver(([e], io) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      load()
        .then((m) => m[name](canvas, { motion, reduceMotion }))
        .catch(() => canvas.classList.add('is-off'));
    }, { rootMargin: '600px' }).observe(canvas);
  mount($('[data-spine]'), 'spine');
  mount($('[data-blob]'), 'blob');
  // Fetch Three.js shortly after load so it is ready before the reader arrives
  // (IntersectionObserver margins are ignored inside embedded frames).
  const warm = () => setTimeout(() => load().catch(() => {}), 1500);
  document.readyState === 'complete' ? warm() : addEventListener('load', warm, { once: true });
}

/* ---------- external links (Google Maps, legal references) ----------
   In a normal browser tab the link opens natively. Maps links have no target, so they open
   in the same tab: no pop-up blocker can stop them, and phones hand them to the Google Maps app. Inside a sandboxed viewer (a file preview, an app's built-in viewer) a
   plain link can do nothing or reload the page, so there the page opens it itself and, when
   that is refused, shows the link to copy instead of failing silently.
   html[data-ext="native"] keeps the plain behaviour for hosts that open links themselves. */
const extToast = $('[data-ext-toast]');
const extUrl = $('[data-ext-url]', extToast);
const extCopy = $('[data-ext-copy]', extToast);
let extTimer = 0;
function showExt(href) {
  const maps = href.includes('google.com/maps');
  $('[data-ext-hint]', extToast).textContent = maps
    ? 'Copia el enlace y ábrelo en tu navegador, o busca en Google Maps: C/ Piqueras 78, 26006 Logroño, La Rioja.'
    : 'Copia el enlace y ábrelo en tu navegador.';
  extUrl.textContent = href;
  extCopy.textContent = 'Copiar enlace';
  extToast.classList.add('is-on');
}
const hideExt = () => extToast.classList.remove('is-on');
$('[data-ext-close]', extToast).addEventListener('click', hideExt);
extCopy.addEventListener('click', () => {
  const select = () => {
    const r = document.createRange(); r.selectNodeContents(extUrl);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    extCopy.textContent = 'Selecciona y copia';
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(extUrl.textContent).then(() => (extCopy.textContent = 'Enlace copiado'), select);
  else select();
});
addEventListener('blur', () => { clearTimeout(extTimer); hideExt(); });

const embedded = (() => { try { return window.self !== window.top; } catch { return true; } })();
const nativeLinks = document.documentElement.dataset.ext === 'native';
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="http"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const href = a.href;
  clearTimeout(extTimer);
  if (embedded && !nativeLinks) {
    e.preventDefault(); // stop the viewer from swallowing or reloading the page
    let w = null;
    try { w = window.open(href, '_blank'); } catch { /* refused */ }
    if (w) { try { w.opener = null; } catch {} return; }
    showExt(href);
    return;
  }
  // Normal browser tab: leave the link alone (Maps links open in this same tab).
});

/* ---------- legal dialogs (footer links and the privacy link in the form) ---------- */
$$('[data-dialog]').forEach((link) => {
  const dlg = document.getElementById(link.dataset.dialog);
  if (!dlg || typeof dlg.showModal !== 'function') return; // very old browsers: keep the plain anchor
  link.addEventListener('click', (e) => {
    e.preventDefault();
    dlg.showModal();
  });
});
$$('dialog.legal').forEach((dlg) => {
  // tap outside the panel closes it
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
});

/* ---------- form ---------- */
const form = $('[data-form]');
const fields = {
  nombre: { el: $('#f-name'), msg: 'Escribe tu nombre.', ok: (v) => v.trim().length > 1 },
  telefono: { el: $('#f-phone'), msg: 'Escribe un teléfono válido (9 cifras).', ok: (v) => v.replace(/[\s+()-]/g, '').replace(/^34/, '').length >= 9 },
  email: { el: $('#f-email'), msg: 'Revisa el formato del email.', ok: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) },
  privacidad: { el: $('#f-privacy'), msg: 'Necesitamos tu consentimiento para contactarte.', ok: (_, el) => el.checked },
};
function check(key) {
  const f = fields[key];
  const valid = f.ok(f.el.value, f.el);
  const err = document.getElementById(f.el.getAttribute('aria-describedby'));
  f.el.closest('.field').classList.toggle('has-error', !valid);
  f.el.setAttribute('aria-invalid', String(!valid));
  err.textContent = valid ? '' : f.msg;
  return valid;
}
Object.keys(fields).forEach((k) => {
  const { el } = fields[k];
  el.addEventListener(el.type === 'checkbox' ? 'change' : 'blur', () => el.closest('.field').classList.contains('has-error') || el.value ? check(k) : null);
  el.addEventListener('input', () => el.closest('.field').classList.contains('has-error') && check(k));
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const results = Object.keys(fields).map(check);
  if (results.includes(false)) {
    Object.values(fields).find((f) => f.el.getAttribute('aria-invalid') === 'true')?.el.focus();
    return;
  }
  form.classList.add('is-sending');
  const data = new FormData(form);
  const endpoint = form.dataset.endpoint;
  try {
    if (endpoint) {
      const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.statusText);
    } else {
      await new Promise((r) => setTimeout(r, 700)); // sin endpoint configurado: demo local
    }
    const name = String(data.get('nombre') || '').trim().split(' ')[0];
    $('[data-form-name]').textContent = name ? `, ${name}` : '';
    $('[data-form-body]').hidden = true;
    const done = $('[data-form-done]');
    done.hidden = false;
    done.focus();
  } catch {
    const btn = $('button[type="submit"]', form);
    let note = $('.form__fail', form);
    if (!note) {
      note = document.createElement('p');
      note.className = 'field__error form__fail';
      note.setAttribute('role', 'alert');
      btn.after(note);
    }
    note.textContent = 'No hemos podido enviar el formulario. Llámanos al 941 246 312.';
  } finally {
    form.classList.remove('is-sending');
  }
});


/* ---------- FAQ assistant ----------
   Fixed answers written from the site's own content. No AI and no server: what people type
   never leaves the browser. Unknown facts (hours, prices) are routed to the phone, not invented. */
(() => {
  const root = $('[data-assistant]');
  if (!root) return;
  const panel = $('[data-assistant-panel]', root);
  const toggleBtn = $('[data-assistant-toggle]', root);
  const log = $('[data-assistant-log]', root);
  const chipsBox = $('[data-assistant-chips]', root);
  const form = $('[data-assistant-form]', root);
  const input = $('#assistant-input', root);

  const TEL = { label: 'Llamar al 941 246 312', href: 'tel:+34941246312', icon: 'i-phone' };
  const FORM = { label: 'Pedir cita online', href: '#contacto' };
  const MAPS = { label: 'Cómo llegar', href: 'https://www.google.com/maps/dir/?api=1&destination=C%2F%20Piqueras%2078%2C%2026006%20Logro%C3%B1o%2C%20La%20Rioja', icon: 'i-arrow-up-right' };
  const SERVICES = ['deportiva', 'traumatologica', 'manual', 'ejercicio', 'suelo', 'posparto', 'ginecologica', 'pediatrica', 'respiratoria', 'geriatrica'];

  const LABELS = {
    tratamientos: '¿Qué tratáis?', ubicacion: '¿Dónde estáis?', cita: 'Pedir cita', horarios: 'Horarios',
    dolor: 'Tengo dolor', precios: 'Precios y mutuas', primera: '¿Cómo es la primera sesión?', inicio: 'Volver al inicio',
    deportiva: 'Deportiva', traumatologica: 'Traumatológica', manual: 'Terapia manual', ejercicio: 'Ejercicio terapéutico',
    suelo: 'Suelo pélvico', posparto: 'Posparto', ginecologica: 'Ginecológica', pediatrica: 'Pediátrica (niños)',
    respiratoria: 'Respiratoria', geriatrica: 'Geriátrica (mayores)',
  };
  const service = (text) => ({ text, actions: [FORM, TEL], chips: ['primera', 'tratamientos', 'inicio'] });
  const ANSWERS = {
    inicio: { text: 'Hola. Soy el asistente del Centro de Fisioterapia San Juan, en Logroño. Te ayudo con los tratamientos, cómo llegar y cómo pedir cita. Elige una opción o escribe tu pregunta.', chips: ['tratamientos', 'cita', 'ubicacion', 'dolor', 'horarios', 'precios', 'primera'] },
    tratamientos: { text: 'Hacemos fisioterapia deportiva, traumatológica, terapia manual, ejercicio terapéutico, suelo pélvico, recuperación posparto, ginecológica, pediátrica, respiratoria y geriátrica, entre otros tratamientos. ¿De cuál quieres saber más?', actions: [{ label: 'Ver todos los servicios', href: '#servicios' }], chips: [...SERVICES, 'inicio'] },
    deportiva: service('Fisioterapia deportiva: lesiones musculares, tendinopatías y readaptación para volver a entrenar con seguridad, de la lesión a la vuelta al rendimiento.'),
    traumatologica: service('Fisioterapia traumatológica: recuperación tras fracturas, esguinces, cirugías y prótesis articulares.'),
    manual: service('Terapia manual: técnicas manuales para aliviar el dolor y devolver movilidad a articulaciones y tejidos.'),
    ejercicio: service('Ejercicio terapéutico: programas de ejercicio pautado y progresivo que consolidan cada mejora, con pautas claras para hacer en casa.'),
    suelo: service('Suelo pélvico: valoración y tratamiento de incontinencia, prolapsos y dolor pélvico, en un espacio de confianza y con sesiones individuales.'),
    posparto: service('Recuperación posparto: diástasis abdominal, cicatrices y vuelta segura al ejercicio después del parto.'),
    ginecologica: service('Fisioterapia ginecológica: cuidado de la salud pélvica de la mujer en cada etapa, del embarazo a la menopausia.'),
    pediatrica: service('Fisioterapia pediátrica: bebés y niños con tortícolis, plagiocefalia o alteraciones del desarrollo motor. Sesiones tranquilas, adaptadas a cada edad y con la familia como parte del tratamiento.'),
    respiratoria: service('Fisioterapia respiratoria: técnicas para mejorar la ventilación y despejar las vías respiratorias, en niños y adultos.'),
    geriatrica: service('Fisioterapia geriátrica: movilidad, equilibrio y fuerza para mantener la autonomía con los años.'),
    ubicacion: { text: 'Estamos en C/ Piqueras 78, 26006 Logroño (La Rioja).', actions: [MAPS, { label: 'Ver ubicación', href: '#ubicacion' }], chips: ['cita', 'horarios', 'inicio'] },
    cita: { text: 'Puedes pedir cita de dos formas: llamando al 941 246 312 o dejando tus datos en el formulario. En ese caso el centro te llama para confirmar día y hora.', actions: [TEL, FORM], chips: ['primera', 'horarios', 'inicio'] },
    horarios: { text: 'Abrimos de lunes a viernes, de 9:00 a 18:00. Sábados y domingos el centro está cerrado. Para pedir cita, llámanos en ese horario o deja tus datos en el formulario y te llamamos.', actions: [TEL, FORM], chips: ['cita', 'ubicacion', 'inicio'] },
    precios: { text: 'Las tarifas, y si trabajamos con tu mutua o seguro, te las indicamos por teléfono.', actions: [TEL], chips: ['cita', 'tratamientos', 'inicio'] },
    dolor: { text: 'Por aquí no puedo valorar síntomas. Si el dolor es muy intenso, aparece tras un golpe o una caída fuerte, o va acompañado de fiebre, hormigueo o pérdida de fuerza, consulta con tu médico; si es urgente, llama al 112. Para una valoración de fisioterapia, pide cita y estudiamos tu caso.', actions: [TEL, FORM], chips: ['primera', 'tratamientos', 'inicio'] },
    primera: { text: 'La primera consulta empieza por ti: tu historia, tu día a día y lo que quieres volver a hacer. Después valoramos movilidad, fuerza y control del movimiento para encontrar el origen del dolor y preparar un plan. Las sesiones son individuales.', actions: [FORM, { label: 'Ver el método', href: '#metodo' }], chips: ['cita', 'tratamientos', 'inicio'] },
    contacto: { text: 'Puedes hablar con el centro llamando al 941 246 312 o dejarnos tus datos en el formulario y te llamamos.', actions: [TEL, FORM], chips: ['ubicacion', 'inicio'] },
    nose: { text: 'No tengo una respuesta para eso. Prueba con una de estas opciones o llámanos al 941 246 312 y te lo resolvemos.', actions: [TEL], chips: ['tratamientos', 'cita', 'ubicacion', 'horarios', 'precios'] },
  };

  // Typed questions: accent-free keyword match, most specific (safety first) wins.
  const KEYWORDS = [
    ['dolor', ['dolor', 'duele', 'molest', 'urgen', 'golpe', 'caida', 'hormigue', 'adormec']],
    ['cita', ['cita', 'reserv', 'pedir', 'turno', 'hueco', 'apuntar']],
    ['ubicacion', ['donde', 'direccion', 'llegar', 'ubicacion', 'calle', 'piqueras', 'mapa', 'aparcar', 'parking']],
    ['horarios', ['horario', 'hora', 'abierto', 'abris', 'abren', 'abrís', 'cerrais', 'cierra', 'sabado', 'domingo', 'fin de semana', 'finde', 'festivo', 'manana', 'tarde', 'lunes', 'viernes']],
    ['precios', ['precio', 'cuesta', 'cuanto', 'tarifa', 'mutua', 'seguro', 'pagar', 'bono', 'euros']],
    ['pediatrica', ['nino', 'nina', 'bebe', 'hijo', 'hija', 'infantil', 'plagiocefal', 'torticolis']],
    ['posparto', ['posparto', 'parto', 'embaraz', 'diastasis', 'cesarea']],
    ['suelo', ['suelo pelvico', 'pelvic', 'incontinen', 'orina', 'prolaps']],
    ['ginecologica', ['ginecolog', 'menopaus']],
    ['deportiva', ['deport', 'correr', 'running', 'futbol', 'entren', 'tendin', 'rotura', 'gimnasio']],
    ['traumatologica', ['fractura', 'esguince', 'operacion', 'operado', 'cirugia', 'protesis', 'rehabilit']],
    ['respiratoria', ['respir', 'bronqui', 'mocos', 'pulmon', 'asma']],
    ['geriatrica', ['mayor', 'ancian', 'abuel', 'equilibrio']],
    ['manual', ['masaje', 'manual', 'contractura']],
    ['ejercicio', ['ejercicio', 'pilates']],
    ['primera', ['primera', 'como funciona', 'como trabaj', 'metodo', 'valoracion']],
    ['tratamientos', ['trata', 'servicio', 'especialidad', 'haceis', 'ofreceis']],
    ['contacto', ['telefono', 'llamar', 'hablar', 'persona', 'whatsapp', 'email', 'correo', 'contact']],
    ['inicio', ['hola', 'buenas', 'buenos dias', 'menu', 'ayuda']],
  ];
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const match = (q) => { const n = norm(q); const hit = KEYWORDS.find(([, ks]) => ks.some((k) => n.includes(k))); return hit ? hit[0] : 'nose'; };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  const scrollLog = () => { log.scrollTop = log.scrollHeight; };
  const say = (text, who) => { const b = el('div', `msg msg--${who}`, text); log.append(b); scrollLog(); return b; };

  let busy = false;
  function answer(key) {
    const a = ANSWERS[key] || ANSWERS.nose;
    chipsBox.replaceChildren();
    busy = true;
    const typing = el('div', 'msg msg--bot msg--typing');
    typing.setAttribute('aria-label', 'Escribiendo');
    typing.append(el('span'), el('span'), el('span'));
    log.append(typing); scrollLog();
    setTimeout(() => {
      typing.remove();
      const b = say(a.text, 'bot');
      if (a.actions) {
        const row = el('div', 'msg__actions');
        a.actions.forEach((x) => {
          const link = el('a', 'msg__action', x.label);
          link.href = x.href;
          if (x.icon) link.insertAdjacentHTML('afterbegin', `<svg class="ico" aria-hidden="true"><use href="#${x.icon}"/></svg>`);
          if (x.href.startsWith('#')) link.addEventListener('click', () => { if (!desktop.matches) close(); });
          row.append(link);
        });
        b.append(row);
      }
      (a.chips || []).forEach((k) => {
        const c = el('button', 'chip', LABELS[k]);
        c.type = 'button';
        c.addEventListener('click', () => ask(LABELS[k], k));
        chipsBox.append(c);
      });
      scrollLog();
      busy = false;
    }, reduceMotion ? 0 : 520);
  }
  function ask(text, key) {
    if (busy) return;
    say(text, 'user');
    answer(key ?? match(text));
  }

  let started = false;
  function open() {
    panel.hidden = false;
    root.classList.add('is-open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-open')));
    if (!started) { started = true; answer('inicio'); }
    // focus the panel, not the input: avoids popping the phone keyboard over the answers
    setTimeout(() => (desktop.matches ? input : panel).focus({ preventScroll: true }), 60);
  }
  function close() {
    panel.classList.remove('is-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (toggleBtn.getAttribute('aria-expanded') === 'false') { panel.hidden = true; root.classList.remove('is-open'); } }, reduceMotion ? 0 : 320);
  }
  panel.tabIndex = -1;
  toggleBtn.addEventListener('click', () => (panel.hidden ? open() : close()));
  $('[data-assistant-close]', root).addEventListener('click', () => { close(); toggleBtn.focus(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { close(); toggleBtn.focus(); } });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q || busy) return;
    input.value = '';
    ask(q);
  });
})();
