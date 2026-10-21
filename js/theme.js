/* Nền động bằng code thuần (canvas/CSS). Cấu hình ở site-settings.json → theme.
   Thêm data-manual vào thẻ <script> để KHÔNG tự chạy (dùng cho trang admin xem trước). */
(() => {
  const manual = document.currentScript && document.currentScript.hasAttribute("data-manual");
  const LIST = [["none", "Mặc định (nền tối, không hiệu ứng)"], ["stars", "Bầu trời sao + sao băng"], ["aurora", "Cực quang"], ["sakura", "Hoa anh đào rơi"], ["snow", "Tuyết rơi"], ["rain", "Mưa đêm"], ["fireflies", "Đom đóm"], ["bubbles", "Bong bóng"]];
  const osReduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches; // thiết bị đang bật "giảm chuyển động"?
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;

  const st = document.createElement("style");
  st.textContent = `.fx-canvas,.fx-aurora{position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none}
.fx-canvas.in,.fx-aurora.in{position:absolute;z-index:0}
.fx-wash{position:fixed;inset:0;z-index:-1;pointer-events:none}
.fx-wash.in{position:absolute;z-index:0}
.fx-aurora{inset:-10%;width:120%;height:120%;filter:blur(40px);opacity:.45;will-change:transform;animation:fx-au 14s ease-in-out infinite alternate;
background:radial-gradient(60% 50% at 20% 30%,rgba(60,200,170,.45),transparent 60%),radial-gradient(50% 60% at 80% 20%,rgba(120,90,240,.4),transparent 60%),radial-gradient(60% 50% at 50% 90%,rgba(40,130,240,.35),transparent 60%)}
.fx-aurora.in{inset:-10%}
@keyframes fx-au{0%{transform:translate3d(-6%,-4%,0) scale(1) rotate(-6deg)}100%{transform:translate3d(6%,5%,0) scale(1.25) rotate(10deg)}}
@media (prefers-reduced-motion:reduce){.fx-aurora{animation:none}.fx-aurora.fx-force{animation:fx-au 14s ease-in-out infinite alternate}}`;
  document.head.appendChild(st);

  const glow = (() => { // sprite phát sáng cho đom đóm (vẽ 1 lần, dùng lại)
    const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d");
    if (!g) return c;
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, "rgba(220,255,140,1)"); gr.addColorStop(.3, "rgba(190,255,100,.5)"); gr.addColorStop(1, "rgba(190,255,100,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c;
  })();

  const P = {
    stars: { n: 140,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.r = rnd(.4, 1.6); p.ph = rnd(0, TAU); p.sp = rnd(.8, 2.6); p.vx = -rnd(3, 10) * p.r; },
      step(p, dt, W) { p.x += p.vx * dt; if (p.x < -3) p.x = W + 3; }, // sao trôi nhẹ sang trái
      draw(g, p, t) { g.globalAlpha = .3 + .55 * Math.abs(Math.sin(t * p.sp + p.ph)); g.fillStyle = "#fff"; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); },
      extra(g, W, H, t, dt, s) { // sao băng thỉnh thoảng
        if (!s.s && ((s.cd = (s.cd ?? rnd(1, 3)) - dt) <= 0)) { s.s = { x: rnd(W * .3, W), y: rnd(0, H * .4), l: 0 }; s.cd = rnd(2.5, 5); }
        if (!s.s) return; const q = s.s; q.l += dt; q.x -= 700 * dt; q.y += 350 * dt;
        g.globalAlpha = Math.max(0, 1 - q.l / .9) * .85;
        const gr = g.createLinearGradient(q.x, q.y, q.x + 110, q.y - 55); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x + 110, q.y - 55); g.stroke();
        if (q.l > .9) s.s = null;
      } },
    snow: { n: 120,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.r = rnd(1, 2.6); p.vy = rnd(25, 55); p.ph = rnd(0, TAU); p.dx = rnd(10, 24); },
      step(p, dt, W, H, t) { p.y += p.vy * dt; p.x += Math.sin(t + p.ph) * p.dx * dt; if (p.y > H + 5) { p.y = -5; p.x = rnd(0, W); } },
      draw(g, p) { g.globalAlpha = .7; g.fillStyle = "#fff"; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); } },
    sakura: { n: 45,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.s = rnd(5, 10); p.vy = rnd(30, 60); p.ph = rnd(0, TAU); p.rot = rnd(0, TAU); p.vr = rnd(-1.5, 1.5); p.dx = rnd(15, 40); },
      step(p, dt, W, H, t) { p.y += p.vy * dt; p.x += (Math.sin(t * .8 + p.ph) * p.dx + 8) * dt; p.rot += p.vr * dt; if (p.y > H + 12 || p.x > W + 12) { p.y = -12; p.x = rnd(-20, W); } },
      draw(g, p) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = .75; g.fillStyle = "#ffb7c5"; g.beginPath(); g.ellipse(0, 0, p.s, p.s * .55, 0, 0, TAU); g.fill(); g.restore(); } },
    rain: { n: 140,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.len = rnd(10, 22); p.vy = rnd(500, 800); },
      step(p, dt, W, H) { p.y += p.vy * dt; p.x -= p.vy * .1 * dt; if (p.y > H + 5) { p.y = -p.len; p.x = rnd(0, W + 100); } },
      draw(g, p) { g.globalAlpha = .28; g.strokeStyle = "#9fbfff"; g.lineWidth = .9; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.len * .1, p.y - p.len); g.stroke(); } },
    fireflies: { n: 40,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.vx = rnd(-22, 22); p.vy = rnd(-22, 22); p.ph = rnd(0, TAU); p.s = rnd(6, 14); },
      step(p, dt, W, H, t) { p.x += (p.vx + Math.sin(t + p.ph) * 14) * dt; p.y += (p.vy + Math.cos(t * .7 + p.ph) * 14) * dt; if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20; },
      draw(g, p, t) { g.globalAlpha = .15 + .6 * Math.abs(Math.sin(t * .9 + p.ph)); g.drawImage(glow, p.x - p.s, p.y - p.s, p.s * 2, p.s * 2); } },
    bubbles: { n: 35,
      init(p, W, H) { p.x = rnd(0, W); p.y = rnd(0, H); p.r = rnd(4, 18); p.vy = rnd(20, 50); p.ph = rnd(0, TAU); },
      step(p, dt, W, H, t) { p.y -= p.vy * dt; p.x += Math.sin(t + p.ph) * 12 * dt; if (p.y < -p.r) { p.y = H + p.r; p.x = rnd(0, W); } },
      draw(g, p) { g.globalAlpha = 1; g.lineWidth = 1.1; g.strokeStyle = "rgba(180,225,255,.4)"; g.fillStyle = "rgba(180,225,255,.05)"; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); g.stroke(); } },
  };

  // host = phần tử chứa (xem trước); bỏ trống = phủ cả màn hình, nằm sau nội dung. Trả về hàm dừng.
  // Lớp phủ màu theo theme: nền ảnh sáng làm các hạt trắng "biến mất", nên mỗi theme có một nền màu riêng phía dưới hiệu ứng.
  const WASH = {
    stars: "linear-gradient(180deg,#050b25,#0d1b4a)", aurora: "linear-gradient(180deg,#07142b,#0c3340)",
    sakura: "linear-gradient(180deg,#2c1034,#52204a)", snow: "linear-gradient(180deg,#0f1c33,#23406b)",
    rain: "linear-gradient(180deg,#0d1524,#2a3a58)", fireflies: "linear-gradient(180deg,#06140f,#0d2a1e)",
    bubbles: "linear-gradient(180deg,#06324a,#0a5a7a)",
  };
  // opts.wash: độ phủ màu theme 0–1 (mặc định 0.6). opts.dim: làm tối nền chung 0–0.8 (mặc định 0, áp dụng cả khi không chọn theme).
  function mount(host, name, opts = {}) {
    const parent = host || document.body, stopFx = mountEffect(host, name, opts), els = [];
    const layer = (bg, op) => { const d = document.createElement("div"); d.className = "fx-wash" + (host ? " in" : ""); d.style.background = bg; d.style.opacity = String(op); parent.prepend(d); els.push(d); };
    const w = opts.wash == null ? .6 : Math.min(1, Math.max(0, Number(opts.wash) || 0)), dim = Math.min(.8, Math.max(0, Number(opts.dim) || 0));
    if (WASH[name] && w > 0) layer(WASH[name], w);
    if (dim > 0) layer("#050b16", dim); // thêm sau cùng → nằm dưới cùng
    return () => { stopFx(); els.forEach((e) => e.remove()); };
  }

  // opts.intensity: độ đậm 0.2–1 (mặc định 0.7). opts.force: vẫn chạy chuyển động dù thiết bị bật "giảm chuyển động".
  function mountEffect(host, name, opts = {}) {
    const k = Math.min(1, Math.max(.2, Number(opts.intensity) || .7)), reduce = osReduce() && !opts.force;
    if (name === "aurora") {
      const d = document.createElement("div"); d.className = "fx-aurora" + (host ? " in" : "") + (opts.force ? " fx-force" : ""); d.style.opacity = String(.65 * k);
      (host || document.body).prepend(d); return () => d.remove();
    }
    const def = P[name]; if (!def) return () => {};
    const cv = document.createElement("canvas"); cv.className = "fx-canvas" + (host ? " in" : ""); cv.style.opacity = String(k);
    (host || document.body).prepend(cv);
    const g = cv.getContext("2d"); let W, H, ps = [], raf, last = performance.now(), t = 0, off = false; const ex = {};
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = host ? host.clientWidth : innerWidth; H = host ? host.clientHeight : innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const k = Math.min(1.2, Math.max(.4, (W * H) / 921600)) * (W < 700 ? .6 : 1); // máy nhỏ → ít hạt hơn
      ps = Array.from({ length: Math.round(def.n * k) }, () => { const p = {}; def.init(p, W, H); return p; });
    };
    const frame = (now) => {
      if (off) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
      g.clearRect(0, 0, W, H);
      for (const p of ps) { if (def.step && !reduce) def.step(p, dt, W, H, t); def.draw(g, p, t); }
      if (def.extra && !reduce) def.extra(g, W, H, t, dt, ex);
      g.globalAlpha = 1;
      if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const vis = () => { if (!document.hidden && !reduce && !off) { last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } };
    size(); raf = requestAnimationFrame(frame);
    addEventListener("resize", size); document.addEventListener("visibilitychange", vis);
    const ro = host && window.ResizeObserver ? new ResizeObserver(size) : null; if (ro) ro.observe(host);
    return () => { off = true; cancelAnimationFrame(raf); removeEventListener("resize", size); document.removeEventListener("visibilitychange", vis); if (ro) ro.disconnect(); cv.remove(); };
  }

  const pageKey = () => { const p = location.pathname; return p.startsWith("/post") ? "post" : p.startsWith("/product") ? "product" : p.startsWith("/download") ? "download" : p.startsWith("/channel") ? "channel" : p.startsWith("/donate") ? "donate" : "home"; };
  window.ShinjuTheme = { list: LIST, mount, pageKey };

  if (!manual) {
    (window.siteJSON ? window.siteJSON("/site-settings.json") : fetch("/site-settings.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)).then((s) => {
      s = s || {};
      const t = s.theme || {}, test = new URLSearchParams(location.search).get("fx"); // ?fx=night: thử nhanh một theme trên trang này (không cần lưu)
      mount(null, test || (t.pages && t.pages[pageKey()]) || t.default || "none", { intensity: t.intensity, force: !!t.forceMotion, wash: t.wash, dim: t.dim });
    }).catch(() => {});
  }
})();
