/* ────────────────────────────────────────────────────────────────
   Japonia Autentică · Ghid Privat  —  front-end behaviour
   ──────────────────────────────────────────────────────────────── */

const CONFIG = {
  RECIPIENT_EMAIL: 'masato.japan.guide@gmail.com',
  BG_IMAGE_DIR:    'img/background',

  /* Background images.
     - Put filenames here if you want to keep arbitrary names (recommended).
     - If BG_IMAGE_FILES is empty, falls back to img_1.<ext> ... img_N.<ext>. */
  BG_IMAGE_FILES: [
    'IMG_20260307_132404.jpg',
    'IMG_20260308_113307.jpg',
    'IMG_20260308_120800.jpg',
    'IMG_20260308_131516.jpg',
    'IMG_20260309_114216.jpg',
  ],
  BG_IMAGE_COUNT: 24,   // used only when BG_IMAGE_FILES is empty
  BG_IMAGE_EXT:   'jpg',

  /* How many shuffled copies of the file list to render.
     With few photos, raise this to cover more of the viewport. */
  BG_IMAGE_REPEAT: 4,
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ───────── 1. Background masonry ───────── */
function loadBackgroundImages() {
  const masonry = document.querySelector('.bg-masonry');
  if (!masonry) return;

  const base = (CONFIG.BG_IMAGE_FILES && CONFIG.BG_IMAGE_FILES.length)
    ? CONFIG.BG_IMAGE_FILES
    : Array.from({ length: CONFIG.BG_IMAGE_COUNT },
                 (_, i) => `img_${i + 1}.${CONFIG.BG_IMAGE_EXT}`);

  /* Build a longer, randomized sequence so the masonry fills the viewport
     even when only a handful of photos are available. Each pass is shuffled
     independently so the same photo rarely sits next to itself. */
  const files = [];
  for (let r = 0; r < Math.max(1, CONFIG.BG_IMAGE_REPEAT); r++) {
    files.push(...shuffle(base));
  }

  const frag = document.createDocumentFragment();
  for (const name of files) {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    img.src = `${CONFIG.BG_IMAGE_DIR}/${encodeURIComponent(name)}`;
    img.addEventListener('error', () => fig.remove(), { once: true });
    fig.appendChild(img);
    frag.appendChild(fig);
  }
  masonry.appendChild(frag);
}

/* ───────── 2. Contact form → mailto: ───────── */
function buildMailto(data) {
  const dash = (v) => (v && v.trim() ? v.trim() : '—');

  const subject = `Cerere de călătorie privată în Japonia — ${dash(data.persoane)}, ${dash(data.durata)} nopți`;

  const body = [
    'Bună ziua Masato,',
    '',
    'Doresc să planific o călătorie privată în Japonia. Vă transmit detaliile mele:',
    '',
    '── Număr de persoane ──',
    dash(data.persoane),
    '',
    '── Durata călătoriei ──',
    `${dash(data.durata)} nopți`,
    '',
    '── Locuri pe care doresc să le vizitez ──',
    dash(data.locuri),
    '',
    '── Experiențe dorite ──',
    dash(data.experiente),
    '',
    '── Buget estimat ──',
    dash(data.buget),
    '',
    '── Adresa mea de e-mail ──',
    dash(data.email),
    '',
    'Vă mulțumesc și aștept răspunsul dumneavoastră.',
  ].join('\n');

  const params = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${CONFIG.RECIPIENT_EMAIL}?${params}`;
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fd = new FormData(form);
    const data = {
      persoane:   fd.get('persoane')   || '',
      durata:     fd.get('durata')     || '',
      locuri:     fd.get('locuri')     || '',
      experiente: fd.get('experiente') || '',
      buget:      fd.get('buget')      || '',
      email:      fd.get('email')      || '',
    };

    window.location.href = buildMailto(data);
  });
}

/* ───────── 3. Reveal-on-scroll ───────── */
function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach((el) => io.observe(el));
}

/* ───────── Boot ───────── */
document.addEventListener('DOMContentLoaded', () => {
  loadBackgroundImages();
  initContactForm();
  initReveal();
});
