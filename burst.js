(() => {
  const sec = document.getElementById("intro");
  const logo = document.getElementById("splash-logo");
  if (!sec || !logo) return;
  const stage = sec.querySelector(".splash-stage");
  const whole = logo.querySelector(".splash-whole");
  const glow = sec.querySelector(".splash-glow");
  const flash = sec.querySelector(".splash-flash");
  const tag = sec.querySelector(".splash-tag");
  const cue = sec.querySelector(".splash-cue");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Shatter the logo into jittered triangles.
  const COLS = 10, ROWS = 3, pts = [];
  for (let r = 0; r <= ROWS; r++) {
    pts.push([]);
    for (let c = 0; c <= COLS; c++) {
      const edgeX = c === 0 || c === COLS, edgeY = r === 0 || r === ROWS;
      pts[r].push([
        (c / COLS) * 100 + (edgeX ? 0 : rnd(-3.5, 3.5)),
        (r / ROWS) * 100 + (edgeY ? 0 : rnd(-11, 11)),
      ]);
    }
  }
  const pieces = [];
  const addShard = (tri) => {
    const xs = tri.map((p) => p[0]), ys = tri.map((p) => p[1]);
    const bx = Math.min(...xs), by = Math.min(...ys);
    const bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
    const box = document.createElement("div");
    box.className = "shard";
    box.setAttribute("aria-hidden", "true");
    Object.assign(box.style, { left: bx + "%", top: by + "%", width: bw + "%", height: bh + "%" });
    box.style.clipPath = `polygon(${tri.map((p) => `${((p[0] - bx) / bw) * 100}% ${((p[1] - by) / bh) * 100}%`).join(",")})`;
    const img = whole.cloneNode();
    img.className = "";
    img.alt = "";
    Object.assign(img.style, { left: (-bx / bw) * 100 + "%", top: (-by / bh) * 100 + "%", width: 10000 / bw + "%", height: 10000 / bh + "%" });
    box.appendChild(img);
    const img2 = box;
    const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
    const ox = (cx - 50) * 191 / 45, oy = cy - 50; // centroid offset in logo units
    const len = Math.hypot(ox, oy) || 1;
    const ang = Math.atan2(oy, ox) + rnd(-.35, .35);
    logo.appendChild(img2);
    pieces.push({
      el: img2, ux: Math.cos(ang), uy: Math.sin(ang),
      dist: rnd(.22, .55) * (0.7 + len / 260), z: rnd(-120, 260),
      rx: rnd(-220, 220), ry: rnd(-220, 220), rz: rnd(-160, 160), fall: rnd(20, 90),
    });
  };
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const a = pts[r][c], b = pts[r][c + 1], d = pts[r + 1][c], e = pts[r + 1][c + 1];
    if ((r + c) % 2) { addShard([a, b, e]); addShard([a, e, d]); }
    else { addShard([a, b, d]); addShard([b, e, d]); }
  }

  // Debris: gold and blue sparks.
  const sparks = [];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement("i");
    s.className = "spark";
    s.setAttribute("aria-hidden", "true");
    const gold = i % 3 === 0;
    s.style.background = gold ? "#D9B54A" : "#9DB8FF";
    s.style.boxShadow = `0 0 10px ${gold ? "rgba(217,181,74,.8)" : "rgba(127,163,255,.8)"}`;
    const ang = rnd(0, Math.PI * 2);
    stage.appendChild(s);
    sparks.push({ el: s, ux: Math.cos(ang), uy: Math.sin(ang), dist: rnd(.3, .75), size: rnd(.6, 1.6) });
  }

  let target = 0, cur = 0, raf = 0, exit = 0;
  const easeIn = (t) => t * t * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function render(p, now) {
    const vmax = Math.max(innerWidth, innerHeight);
    const grow = easeIn(span(p, 0, .42));
    const charge = reduce ? 0 : span(p, .28, .42) * (p < .42 ? 1 : 0);
    const jx = charge ? Math.sin(now / 23) * charge * 4 : 0;
    const jy = charge ? Math.cos(now / 29) * charge * 3 : 0;
    const scale = 1 + grow * 1.9;
    logo.style.transform = `translate3d(${jx}px, ${jy}px, 0) scale(${scale})`;

    const e = span(p, .42, .78), ee = easeOut(e);
    logo.classList.toggle("burst", e > 0);
    if (e > 0) {
      const fade = 1 - span(e, .4, 1);
      for (const s of pieces) {
        const d = s.dist * vmax * ee / scale;
        s.el.style.transform =
          `translate3d(${s.ux * d}px, ${s.uy * d + s.fall * e * e}px, ${s.z * ee / scale}px) ` +
          `rotateX(${s.rx * ee}deg) rotateY(${s.ry * ee}deg) rotateZ(${s.rz * ee}deg) scale(${1 - .35 * ee})`;
        s.el.style.opacity = fade;
      }
    }
    const se = span(p, .41, .7), see = easeOut(se);
    for (const s of sparks) {
      const d = s.dist * vmax * see;
      s.el.style.transform = `translate3d(${s.ux * d}px, ${s.uy * d}px, 0) scale(${s.size * (1 - se * .6)})`;
      s.el.style.opacity = se > 0 ? 1 - se : 0;
    }

    const f = span(p, .39, .53);
    flash.style.opacity = (Math.sin(Math.PI * f) * .85).toFixed(3);
    flash.style.transform = `scale(${.4 + f * 3})`;
    glow.style.opacity = (.35 + grow * .35) * (1 - ee);
    glow.style.transform = `scale(${1 + grow * 1.2 + ee})`;

    const t = easeOut(span(p, .6, .78));
    const x = span(exit, 0, .7), xe = x * x * (3 - 2 * x);
    tag.style.opacity = t * (1 - xe);
    const blur = Math.max((1 - t) * 14, xe * 12);
    tag.style.filter = blur > .05 ? `blur(${blur}px)` : "none";
    tag.style.transform = `translateY(${(1 - t) * 24 + exit * innerHeight * .45}px) scale(${.94 + t * .06 - xe * .08})`;
    cue.style.opacity = 1 - span(p, 0, .08);
    return charge > 0;
  }

  function measure() {
    const range = sec.offsetHeight - innerHeight;
    const top = -sec.getBoundingClientRect().top;
    target = range > 0 ? clamp(top / range) : 1;
    exit = clamp((top - range) / innerHeight);
  }
  function tick(now) {
    cur += (target - cur) * .14;
    if (Math.abs(target - cur) < .0004) cur = target;
    const live = render(cur, now);
    raf = cur !== target || live ? requestAnimationFrame(tick) : 0;
  }
  function wake() { measure(); if (!raf) raf = requestAnimationFrame(tick); }

  addEventListener("scroll", wake, { passive: true });
  addEventListener("resize", wake);
  measure(); cur = target; render(cur, performance.now());
})();
