(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const RX = 100, RY = 135;

  const STAGES = {
    1: { c: .07, t: .03, v: 0,   rim: .8,  plan: -2,  grafts: "Ekim gerekmez", text: "Saç çizginiz yerinde. Dökülmeyi durdurmak için ilaç ve PRP çoğu zaman yeterlidir." },
    2: { c: .1,  t: .2,  v: 0,   rim: .8,  plan: 2,   grafts: "800–1.500 greft", text: "Şakaklarda hafif çekilme var. Çoğunlukla tıraşsız DHI ile 4–5 saatte tamamlanır." },
    3: { c: .16, t: .38, v: 0,   rim: .8,  plan: 2,   grafts: "1.500–2.500 greft", text: "Şakaklar belirgin şekilde açılmış. Tek seansta, 5–6 saatte tamamlanır." },
    4: { c: .34, t: .3,  v: .22, rim: .8,  plan: 2,   grafts: "2.500–3.500 greft", text: "Alın ve tepe birlikte açılmış. Genellikle tek seansta, 7–8 saatte tamamlanır." },
    5: { c: .6,  t: .25, v: .34, rim: .82, plan: 2,   grafts: "3.500–4.500 greft", text: "Ön bölge ile tepe arasındaki köprü inceliyor. Tek seansta mümkün; donör yoğunluğunuz belirleyici olur." },
    6: { c: 1.2, t: .1,  v: .45, rim: .84, plan: .3,  grafts: "4.500–5.500 greft", text: "Önden tepeye kadar açık. Önce ön ve orta bölge ekilir, tepe için ikinci seans gerekebilir." },
    7: { c: 1.5, t: 0,   v: .6,  rim: .87, plan: .08, grafts: "5.000+ greft", text: "Yalnızca yanlarda ve ensede saç kalmış. Donör bölge sınırlı olduğu için önceliği ön bölgeye veririz." }
  };

  const designedHairline = nx => -0.86 + 0.36 * nx * nx;

  function classify(nx, ny, s) {
    const rho = Math.hypot(nx, ny);
    if (rho > s.rim && ny > -0.35) return "hair";
    const front = ny < -1 + s.c + s.t * Math.min(1, Math.abs(nx) / 0.55);
    const vertex = s.v > 0 && Math.hypot(nx, ny - 0.35) < s.v;
    if (!front && !vertex) return "hair";
    if (ny < designedHairline(nx)) return "bare";
    return ny < s.plan ? "plan" : "bare";
  }

  function seeded(seed) {
    return () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  const svg = document.getElementById("scalp");
  const group = document.getElementById("follicles");
  const hairline = document.getElementById("hairline");
  const row = document.getElementById("stage-row");
  const gEl = document.getElementById("est-grafts");
  const tEl = document.getElementById("est-text");
  const formStage = document.getElementById("f-stage");
  if (!svg) return;

  const dots = [];
  const rand = seeded(7);
  const step = 8.6;
  const frag = document.createDocumentFragment();
  for (let y = -RY, r = 0; y <= RY; y += step * 0.866, r++) {
    for (let x = -RX + (r % 2) * step / 2; x <= RX; x += step) {
      const px = x + (rand() - .5) * 3.2;
      const py = y + (rand() - .5) * 3.2;
      const nx = px / RX, ny = py / RY;
      if (Math.hypot(nx, ny) > 0.95) continue;
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", px.toFixed(1));
      c.setAttribute("cy", py.toFixed(1));
      c.setAttribute("r", (1.9 + rand() * .7).toFixed(2));
      c.style.setProperty("--k", ((ny + 1) / 2).toFixed(3));
      frag.appendChild(c);
      dots.push({ el: c, nx, ny });
    }
  }
  group.appendChild(frag);

  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const nx = -0.64 + (1.28 * i) / 24;
    pts.push(`${(nx * RX).toFixed(1)} ${(designedHairline(nx) * RY).toFixed(1)}`);
  }
  hairline.setAttribute("d", "M" + pts.join(" L"));
  const len = Math.ceil(hairline.getTotalLength());
  hairline.style.setProperty("--len", len);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pen = document.getElementById("pen");
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let drawToken = 0;

  function drawHairline(visible, delay = 0) {
    const token = ++drawToken;
    hairline.style.visibility = visible ? "visible" : "hidden";
    pen.classList.remove("on");
    if (!visible) return;
    if (reduce) { hairline.style.strokeDashoffset = 0; return; }
    hairline.style.strokeDashoffset = len;
    const dur = 1000;
    let t0 = null;
    const frame = now => {
      if (token !== drawToken) return;
      if (t0 === null) t0 = now + delay;
      const t = Math.min(1, Math.max(0, (now - t0) / dur));
      if (t > 0) pen.classList.add("on");
      const e = ease(t);
      hairline.style.strokeDashoffset = len * (1 - e);
      const p = hairline.getPointAtLength(len * e);
      pen.setAttribute("cx", p.x.toFixed(1));
      pen.setAttribute("cy", p.y.toFixed(1));
      if (t < 1) requestAnimationFrame(frame);
      else setTimeout(() => token === drawToken && pen.classList.remove("on"), 350);
    };
    requestAnimationFrame(frame);
  }

  const nums = str => (str.match(/\d[\d.]*/g) || []).map(n => Number(n.replace(/\./g, "")));
  const fmt = n => n.toLocaleString("tr-TR");
  let countToken = 0;
  function countTo(el, target) {
    const token = ++countToken;
    const to = nums(target);
    const from = nums(el.textContent);
    if (reduce || !to.length) { el.textContent = target; return; }
    const parts = target.split(/\d[\d.]*/);
    const t0 = performance.now();
    const frame = now => {
      if (token !== countToken) return;
      const t = Math.min(1, (now - t0) / 650);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = parts.map((p, i) => i < to.length ? p + fmt(Math.round((from[i] || 0) + (to[i] - (from[i] || 0)) * e)) : p).join("");
      if (t < 1) requestAnimationFrame(frame); else el.textContent = target;
    };
    requestAnimationFrame(frame);
  }

  const hairFill = getComputedStyle(document.documentElement).getPropertyValue("--hair").trim();
  function animateDot(d, prev, next) {
    if (reduce || !prev || prev === next || !d.el.animate) return;
    const delay = ((d.ny + 1) / 2) * 260;
    if (next === "plan") {
      d.el.animate(
        [{ transform: "scale(0)" }, { transform: "scale(1.8)", offset: .6 }, { transform: "scale(1)" }],
        { duration: 520, delay, easing: "cubic-bezier(.3,1.4,.5,1)", fill: "backwards" }
      );
    } else if (prev === "hair") {
      d.el.animate(
        [{ fill: hairFill, stroke: "none", transform: "none", opacity: 1 },
         { fill: hairFill, stroke: "none", transform: "translateY(7px) scale(.3)", opacity: 0, offset: .55 },
         { opacity: 0, transform: "scale(.6)", offset: .56 },
         { opacity: 1, transform: "none" }],
        { duration: 700, delay, easing: "ease-in", fill: "backwards" }
      );
    } else if (next === "hair") {
      d.el.animate(
        [{ transform: "translateY(-6px) scale(.2)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 450, delay, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }
      );
    }
  }

  let current = 0;
  function setStage(n, opts = {}) {
    n = Number(n);
    if (n === current && !opts.force) return;
    current = n;
    const s = STAGES[n];
    for (const d of dots) {
      const next = classify(d.nx, d.ny, s);
      if (!opts.silent) animateDot(d, d.state, next);
      d.state = next;
      d.el.setAttribute("class", next);
    }
    countTo(gEl, s.grafts);
    tEl.textContent = s.text;
    tEl.classList.remove("swap"); void tEl.offsetWidth; tEl.classList.add("swap");
    svg.setAttribute("aria-label", `Norwood ${n}. evre: ${s.grafts}. ${s.text}`);
    drawHairline(n > 1, opts.drawDelay || 120);
    if (formStage && !opts.fromForm) formStage.value = String(n);
  }

  for (let n = 1; n <= 7; n++) {
    const id = `stage-${n}`;
    const input = document.createElement("input");
    input.type = "radio"; input.name = "stage-pick"; input.id = id; input.value = n;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = n;
    label.setAttribute("aria-label", `${n}. evre`);
    input.addEventListener("change", () => setStage(n));
    row.append(input, label);
  }

  const initial = 4;
  document.getElementById(`stage-${initial}`).checked = true;
  svg.classList.add("intro");
  gEl.textContent = STAGES[initial].grafts;
  hairline.style.visibility = "hidden";
  const heroEl = document.querySelector(".hero");
  let heroStarted = false;
  function startHero() {
    if (heroStarted) return;
    heroStarted = true;
    heroEl.classList.add("go");
    setStage(initial, { force: true, silent: true, drawDelay: 1500 });
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add("ready")));
    setTimeout(() => svg.classList.remove("intro"), 2600);
  }
  const heroIO = new IntersectionObserver(en => {
    if (en[0].isIntersecting) { startHero(); heroIO.disconnect(); }
  }, { threshold: .35 });
  heroIO.observe(heroEl);

  formStage?.addEventListener("change", () => {
    const v = Number(formStage.value);
    if (v >= 1) {
      document.getElementById(`stage-${v}`).checked = true;
      setStage(v, { fromForm: true });
    }
  });

  // Form
  const form = document.getElementById("analysis-form");
  const photos = document.getElementById("f-photos");
  const hint = document.getElementById("photo-hint");
  const done = document.getElementById("form-done");

  const thumbs = document.getElementById("thumbs");
  const drop = document.getElementById("drop");
  ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, () => drop.classList.add("over")));
  ["dragleave", "drop"].forEach(t => drop.addEventListener(t, () => drop.classList.remove("over")));
  photos.addEventListener("change", () => {
    const n = photos.files.length;
    thumbs.querySelectorAll("img").forEach(img => URL.revokeObjectURL(img.src));
    thumbs.innerHTML = "";
    [...photos.files].slice(0, 12).forEach(f => {
      const li = document.createElement("li"), img = document.createElement("img");
      img.src = URL.createObjectURL(f); img.alt = "";
      li.append(img); thumbs.append(li);
    });
    if (n === 0) hint.textContent = "En az 4 fotoğraf seçin.";
    else if (n < 4) hint.textContent = `${n} fotoğraf seçildi. ${4 - n} tane daha ekleyin ya da eksikleri WhatsApp'tan gönderin.`;
    else hint.textContent = `${n} fotoğraf seçildi.`;
  });

  const rules = [
    ["f-name", "e-name", el => el.value.trim().length > 1],
    ["f-phone", "e-phone", el => el.value.replace(/\D/g, "").length >= 10],
    ["f-kvkk", "e-kvkk", el => el.checked]
  ];

  form.addEventListener("submit", e => {
    e.preventDefault();
    let firstBad = null;
    for (const [id, errId, ok] of rules) {
      const el = document.getElementById(id);
      const err = document.getElementById(errId);
      const valid = ok(el);
      err.hidden = valid;
      el.setAttribute("aria-invalid", String(!valid));
      if (!valid) el.setAttribute("aria-describedby", errId); else el.removeAttribute("aria-describedby");
      if (!valid && !firstBad) firstBad = el;
    }
    if (firstBad) { firstBad.focus(); return; }
    const stageSel = document.getElementById("f-stage");
    const n = photos.files.length;
    const text = [
      "Merhaba, ücretsiz saç analizi talebim:",
      `Ad soyad: ${document.getElementById("f-name").value.trim()}`,
      `Telefon: ${document.getElementById("f-phone").value.trim()}`,
      `Norwood evresi: ${stageSel.options[stageSel.selectedIndex].text}`,
      n ? `Fotoğraflarımı (${n} adet) bu sohbete ekliyorum.` : "Fotoğraflarımı bu sohbete ekliyorum."
    ].join("\n");
    const waUrl = `https://wa.me/905052159898?text=${encodeURIComponent(text)}`;
    document.getElementById("wa-retry").href = waUrl;
    window.open(waUrl, "_blank", "noopener");
    done.hidden = false;
    done.style.animation = "none"; void done.offsetWidth; done.style.animation = "";
    done.focus();
  });

  // ---------- Page motion ----------
  const root = document.documentElement;
  const header = document.querySelector(".site-header");
  const timeline = document.getElementById("timeline");
  const words = [];
  const quote = document.querySelector(".scrub-words");
  if (quote) {
    quote.innerHTML = quote.textContent.trim().split(/\s+/)
      .map(w => `<span class="w">${w}</span>`).join(" ");
    words.push(...quote.querySelectorAll(".w"));
  }
  document.querySelectorAll(".included li").forEach((li, i) => li.style.setProperty("--d", `${i * .07}s`));

  const clamp01 = v => Math.max(0, Math.min(1, v));
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    header.classList.toggle("compact", y > 40);
    header.style.setProperty("--read", clamp01(y / (root.scrollHeight - vh)).toFixed(4));
    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const p = reduce ? 1 : clamp01((vh * .9 - r.top) / (vh * .75));
      timeline.style.setProperty("--p", p.toFixed(3));
    }
    if (quote) {
      const r = quote.getBoundingClientRect();
      const p = reduce ? 1 : clamp01((vh * .85 - r.top) / (vh * .5));
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("lit", i < lit));
    }
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  const priceEl = document.querySelector("[data-count]");
  const countPrice = () => {
    if (reduce || !priceEl) return;
    const target = Number(priceEl.dataset.count), t0 = performance.now();
    const frame = now => {
      const t = Math.min(1, (now - t0) / 1200), e = 1 - Math.pow(1 - t, 4);
      priceEl.textContent = "€" + fmt(Math.round(target * e));
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const els = en.target.revealTargets || [en.target];
      els.forEach(el => el.classList.add("in"));
      if (en.target.contains(priceEl)) countPrice();
      io.unobserve(en.target);
    }
  }, { threshold: .18, rootMargin: "0px 0px -6% 0px" });
  const numIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      numIO.unobserve(en.target);
      const el = en.target, target = Number(el.dataset.num);
      if (reduce) return;
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / 1600), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(target * e).toLocaleString("tr-TR");
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: .6 });
  document.querySelectorAll("[data-num]").forEach(el => numIO.observe(el));

  document.querySelectorAll("[data-reveal]").forEach(el => {
    if (el.dataset.reveal !== "mask") return io.observe(el);
    const host = el.parentElement;
    (host.revealTargets ||= []).push(el);
    io.observe(host);
  });

  const hero = document.querySelector(".hero");
  if (!reduce && matchMedia("(hover: hover)").matches) {
    hero.addEventListener("pointermove", e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width - .5).toFixed(3));
      hero.style.setProperty("--my", ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
    hero.addEventListener("pointerleave", () => { hero.style.setProperty("--mx", 0); hero.style.setProperty("--my", 0); });
  }
})();

(() => {
  const cards = [...document.querySelectorAll(".vcard")];
  cards.forEach(card => {
    const video = card.querySelector("video");
    card.querySelector(".vcard-play").addEventListener("click", () => {
      cards.forEach(c => { if (c !== card) c.querySelector("video").pause(); });
      video.controls = true;
      video.play();
    });
    video.addEventListener("play", () => {
      card.classList.add("playing");
      cards.forEach(c => { if (c !== card) c.querySelector("video").pause(); });
    });
    video.addEventListener("ended", () => { card.classList.remove("playing"); video.controls = false; video.load(); });
  });
})();

(() => {
  const fab = document.querySelector(".wa-fab");
  const intro = document.getElementById("intro");
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  if (!fab) return;
  const update = () => {
    const past = !intro || intro.getBoundingClientRect().bottom < innerHeight * .4;
    fab.classList.toggle("show", past);
  };
  addEventListener("scroll", update, { passive: true });
  update();
})();

document.querySelectorAll(".loc-card").forEach(card => {
  const toggle = () => {
    const open = card.getAttribute("aria-expanded") !== "true";
    card.setAttribute("aria-expanded", String(open));
    card.setAttribute("aria-label", open ? "Konum kartını kapat" : "Konum kartını aç");
  };
  card.addEventListener("click", toggle);
  card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
});
