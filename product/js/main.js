/* Shinju Sản phẩm — product/js/main.js
   Đường dẫn sạch (không dùng query):
     /product/        -> trang chính: các danh mục gốc (thumbnail + tên, giống thẻ bài đăng nhưng KHÔNG có lượt xem/ngày)
     /product/<id>/   -> danh mục (lưới các mục con) hoặc trang sản phẩm. Trang tĩnh do admin / GitHub Actions dựng sẵn
                         (có SEO + nội dung thật cho Google và AI); JS dưới đây đọc dữ liệu mới nhất và dựng lại
                         đúng cùng HTML bằng product/js/productgen.js.
   Dữ liệu: /product/data.json (cây mục) và /product/data/<id>.json (chi tiết từng mục).
   Id không tồn tại -> /404.html.
   Mục có "tool" trong product/data/<id>.json là công cụ chạy trên trình duyệt: giao diện ở product/tools/<tool>.js (+ common.js, tools.css).

   Lượt xem sản phẩm: chỉ +1 khi người xem Ở LẠI trang (tab đang hiện) ít nhất 30 giây, và tối đa 1 lần / 10 phút / trình duyệt.
   Cần thêm loại "product" vào biến COUNTER_TYPES của Worker bộ đếm (xem hướng dẫn); chưa thêm thì trang vẫn chạy, chỉ không đếm. */
(() => {
  "use strict";
  const PG = window.ProductGen;
  const SITE_404 = "/404.html";

  // Bộ đếm tự host: ĐỌC thẳng từ raw.githubusercontent.com, chỉ +1 mới qua Worker (giống post/js/main.js).
  const COUNTERS_RAW_BASE = "https://raw.githubusercontent.com/MoeShinn/api-counters/main";
  const COUNTER_API_BASE = "https://n238.git-api.workers.dev";
  const COUNTER_TYPE = "product"; // phải có trong COUNTER_TYPES của Worker
  const BUCKET_MS = 60 * 1000;
  const VIEW_DWELL_S = 30; // giây phải ở lại trang
  const VIEW_COOLDOWN_MS = 10 * 60 * 1000;

  async function fetchWithTimeout(url, ms, cache = "no-store") {
    const c = new AbortController(), timer = setTimeout(() => c.abort(), ms);
    try { return await fetch(url, { signal: c.signal, cache }); } finally { clearTimeout(timer); }
  }
  const bucket = () => Math.floor(Date.now() / BUCKET_MS);
  async function getViews(id) {
    try {
      const res = await fetchWithTimeout(`${COUNTERS_RAW_BASE}/${COUNTER_TYPE}-${encodeURIComponent(id)}.json?t=${bucket()}`, 4000, "default");
      if (!res.ok) return 0;
      return (await res.json()).views || 0;
    } catch (e) { return 0; }
  }
  // Worker đã chạm giới hạn lượt gọi trong ngày thì web vẫn chạy bình thường nhưng không gọi nữa.
  async function apiAllowed() {
    try {
      const res = await fetchWithTimeout(`${COUNTERS_RAW_BASE}/api-usage.json?t=${bucket()}`, 3000, "default");
      if (!res.ok) return true;
      const u = await res.json();
      if (u.date !== new Date().toISOString().slice(0, 10)) return true;
      const limit = Number(u.limit) || 0;
      return !(u.blocked === true || (limit > 0 && Number(u.requests) >= limit));
    } catch (e) { return true; }
  }
  async function hitViews(id) {
    try {
      if (!(await apiAllowed())) return null;
      const res = await fetchWithTimeout(`${COUNTER_API_BASE}/hit/${COUNTER_TYPE}/${encodeURIComponent(id)}`, 4000);
      if (!res.ok) return null;
      const d = await res.json();
      return d.limited || d.views == null ? null : d.views;
    } catch (e) { return null; }
  }
  function formatCount(n) {
    n = Number(n); if (!Number.isFinite(n)) return "0";
    if (n < 1000) return String(Math.round(n));
    const u = [[1e9, "B"], [1e6, "M"], [1e3, "K"]]; let i = u.findIndex(([x]) => n >= x);
    let tenths = Math.round((n * 10) / u[i][0]); if (tenths >= 10000 && i > 0) { i--; tenths = Math.round((n * 10) / u[i][0]); }
    const w = Math.floor(tenths / 10), d = tenths % 10; return (d ? `${w}.${d}` : `${w}`) + u[i][1];
  }

  /* ---------- Tải dữ liệu ---------- */
  const getJson = async (p, fb) => {
    try { const r = await fetch(p, { cache: "no-store" }); if (!r.ok) return fb; return await r.json(); } catch (e) { return fb; }
  };
  const loadIndex = async () => { const d = await getJson("/product/data.json", null); return d && Array.isArray(d.nodes) ? d : null; };
  // chi tiết của mục + các danh mục cha (để kế thừa chính sách)
  async function loadDetails(nodes, id) {
    const ids = PG.path(nodes, id).map((n) => n.id), out = {};
    await Promise.all(ids.map(async (i) => { out[i] = (await getJson(`/product/data/${encodeURIComponent(i)}.json`, {})) || {}; }));
    return out;
  }

  /* ---------- Phần phụ của trang sản phẩm ---------- */
  function ensureShare() {
    if (window.SiteShare) return Promise.resolve();
    return new Promise((resolve) => { const s = document.createElement("script"); s.src = "/js/share.js"; s.onload = s.onerror = () => resolve(); document.head.appendChild(s); });
  }
  async function mountShare(node) {
    const host = document.querySelector("[data-share]"); if (!host) return;
    await ensureShare();
    if (window.SiteShare) window.SiteShare.mount(host, { url: `${location.origin}${PG.url(node.id)}`, title: node.title || document.title });
  }
  async function mountComments(detail) {
    if (detail.comments === false) return; // tắt riêng cho sản phẩm này trong /admin/product
    let cfg = null;
    try { const r = await fetch("/site-settings.json", { cache: "no-cache" }); if (r.ok) cfg = (await r.json()).giscus; } catch (e) { return; }
    if (!cfg || cfg.enabled === false || !cfg.repo || !cfg.repoId || !cfg.categoryId) return;
    const art = document.querySelector(".product-article"); if (!art) return;
    const sec = document.createElement("section"); sec.className = "product-comments"; sec.innerHTML = "<h2>Bình luận</h2>";
    art.after(sec);
    const load = () => {
      const s = document.createElement("script"); s.src = "https://giscus.app/client.js"; s.async = true; s.crossOrigin = "anonymous";
      const attrs = { repo: cfg.repo, "repo-id": cfg.repoId, category: cfg.category, "category-id": cfg.categoryId, mapping: cfg.mapping || "pathname", strict: "0", "reactions-enabled": "1", "emit-metadata": "0", "input-position": "bottom", theme: "dark", lang: "vi", loading: "lazy" };
      Object.entries(attrs).forEach(([k, v]) => s.setAttribute("data-" + k, v));
      sec.appendChild(s);
    };
    if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "400px" }); io.observe(sec); }
    else load();
  }
  function trackViews(id) {
    const el = document.querySelector("[data-views-wrap]");
    const show = (v) => { if (el && v > 0) { el.textContent = `👁 ${formatCount(v)} lượt xem`; el.hidden = false; } };
    getViews(id).then(show);
    const key = `moeshinn_product_viewed_${id}`;
    let seen = 0;
    const timer = setInterval(() => { // chỉ cộng giây khi tab đang hiện
      if (document.hidden) return;
      if (++seen < VIEW_DWELL_S) return;
      clearInterval(timer);
      let last = 0; try { last = Number(localStorage.getItem(key) || 0); } catch (e) { /* bỏ qua */ }
      if (Date.now() - last < VIEW_COOLDOWN_MS) return;
      try { localStorage.setItem(key, String(Date.now())); } catch (e) { /* bỏ qua */ }
      hitViews(id).then((v) => { if (v != null) show(v); });
    }, 1000);
  }

  // Gắn thông tin vào <head> khi dữ liệu mới hơn bản tĩnh (tiêu đề tab); phần SEO đầy đủ đã nằm sẵn trong HTML tĩnh.
  const setTitle = (s) => { if (s) document.title = s; };

  /* ---------- Trang công cụ (chi tiết có "tool"): nạp CSS + JS riêng rồi dựng giao diện vào [data-tool-root] ---------- */
  const TOOLS_BASE = "/product/tools/";
  const loadCss = (href) => new Promise((resolve) => {
    if (document.querySelector(`link[href="${href}"]`)) return resolve();
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; l.onload = l.onerror = () => resolve(); document.head.appendChild(l);
    setTimeout(resolve, 4000); // mạng chậm vẫn không giữ màn hình tải
  });
  const loadJs = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script"); s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error("Không tải được " + src)); document.head.appendChild(s);
  });
  async function mountTool(name) {
    const root = document.querySelector("[data-tool-root]"); if (!root) return;
    try {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) throw new Error("Tên công cụ không hợp lệ");
      await Promise.all([loadCss(TOOLS_BASE + "tools.css"), loadJs(TOOLS_BASE + "common.js")]);
      await loadJs(`${TOOLS_BASE}${name}.js`);
      const tool = window.ShinjuTools && window.ShinjuTools.tools[name];
      if (!tool) throw new Error("Chưa có công cụ " + name);
      root.textContent = ""; tool.mount(root);
    } catch (e) {
      root.innerHTML = '<p class="empty-msg" style="text-align:center">Không tải được công cụ. Vui lòng tải lại trang.</p>';
      console.error(e);
    }
  }

  /* ---------- Popup xem ảnh: bấm ảnh trong thư viện → hiện ảnh vừa khung (mọi tỉ lệ), vuốt/kéo/mũi tên/phím để chuyển ảnh, chạm 2 lần để phóng to ----------
     Bấm ảnh KHÔNG còn mở tab mới (hay bấm nhầm); nút "Ảnh gốc" trong popup mới mở ảnh gốc. Nút Back của điện thoại đóng popup thay vì rời trang. */
  function openLightbox(items, start, onClose) {
    if (document.querySelector(".lb-bg")) return;
    const n = items.length, prevFocus = document.activeElement;
    const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bg = document.createElement("div"); bg.className = "lb-bg"; bg.setAttribute("role", "dialog"); bg.setAttribute("aria-modal", "true"); bg.setAttribute("aria-label", "Xem ảnh");
    bg.innerHTML = `<div class="lb-top"><span class="lb-count" aria-live="polite"${n < 2 ? " hidden" : ""}></span><span class="lb-sp"></span><a class="lb-btn lb-orig" target="_blank" rel="noopener noreferrer">↗ Ảnh gốc</a><button type="button" class="lb-btn lb-close" aria-label="Đóng">✕</button></div>
      <div class="lb-track" tabindex="0"></div>
      ${n > 1 ? '<button type="button" class="lb-nav lb-prev" aria-label="Ảnh trước">‹</button><button type="button" class="lb-nav lb-next" aria-label="Ảnh sau">›</button>' : ""}
      <div class="lb-hint">${n > 1 ? "Vuốt ngang để chuyển ảnh · " : ""}Chạm 2 lần để phóng to</div>`;
    const track = bg.querySelector(".lb-track"), count = bg.querySelector(".lb-count"), orig = bg.querySelector(".lb-orig");
    items.forEach((it) => {
      const sl = document.createElement("div"); sl.className = "lb-slide";
      const im = document.createElement("img"); im.className = "lb-img"; im.src = it.src; im.alt = it.alt || ""; im.draggable = false; im.decoding = "async";
      sl.appendChild(im); track.appendChild(sl);
    });
    const slides = [...track.children];
    let cur = Math.max(0, Math.min(n - 1, start || 0)), raf = 0, zoomed = null;
    const used = () => bg.classList.add("is-used");

    const unzoom = () => {
      if (!zoomed) return; const sl = zoomed, im = sl.firstChild; zoomed = null;
      sl.classList.remove("is-zoom"); im.style.width = im.style.height = ""; sl.scrollLeft = sl.scrollTop = 0; track.classList.remove("is-locked");
    };
    const zoomAt = (sl, cx, cy) => { // phóng ~2.4 lần so với cỡ đang vừa khung, giữ điểm chạm ở giữa
      const im = sl.firstChild, r = im.getBoundingClientRect(); if (!r.width) return;
      const fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height, k = 2.4;
      im.style.width = r.width * k + "px"; im.style.height = r.height * k + "px";
      sl.classList.add("is-zoom"); track.classList.add("is-locked"); zoomed = sl; used();
      sl.scrollLeft = fx * im.offsetWidth - sl.clientWidth / 2; sl.scrollTop = fy * im.offsetHeight - sl.clientHeight / 2;
    };
    const update = () => {
      raf = 0; const i = Math.max(0, Math.min(n - 1, Math.round(track.scrollLeft / (track.clientWidth || 1))));
      if (i !== cur) { unzoom(); cur = i; }
      count.textContent = `${cur + 1} / ${n}`; orig.href = items[cur].src;
      const p = bg.querySelector(".lb-prev"), q = bg.querySelector(".lb-next"); if (p) { p.disabled = cur === 0; q.disabled = cur === n - 1; }
    };
    const go = (i, smooth = true) => { unzoom(); track.scrollTo({ left: Math.max(0, Math.min(n - 1, i)) * track.clientWidth, behavior: smooth && !reduced ? "smooth" : "auto" }); };

    let pushed = false, done = false;
    const teardown = () => {
      if (done) return; done = true; unzoom();
      document.removeEventListener("keydown", onKey, true); window.removeEventListener("popstate", onPop); window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
      bg.remove(); document.body.classList.remove("lb-open");
      if (onClose) onClose(cur);
      if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    };
    const onPop = () => { pushed = false; teardown(); };
    const close = () => { if (pushed && history.state && history.state.pgLightbox) { pushed = false; history.back(); setTimeout(teardown, 0); } else teardown(); };
    const onResize = () => { unzoom(); go(cur, false); };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); return close(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
        if (zoomed && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return; // đang phóng to: phím mũi tên để cuộn trong ảnh
        e.preventDefault(); used(); go(e.key === "ArrowLeft" ? cur - 1 : e.key === "ArrowRight" ? cur + 1 : e.key === "Home" ? 0 : n - 1); return;
      }
      if (e.key !== "Tab") return;
      const f = [...bg.querySelectorAll("button, a[href], .lb-track")].filter((x) => !x.disabled && x.offsetParent !== null); // giữ Tab quay vòng trong popup
      if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };

    // Chạm/nhấp 2 lần để phóng to hoặc thu nhỏ; nhấp vào vùng trống quanh ảnh thì đóng
    let lastT = 0, lastX = 0, lastY = 0, moved = false;
    track.addEventListener("click", (e) => {
      if (moved) { e.preventDefault(); return; }
      const sl = e.target.closest(".lb-slide"); if (!sl) return;
      const now = Date.now(), dbl = now - lastT < 330 && Math.hypot(e.clientX - lastX, e.clientY - lastY) < 30;
      lastT = now; lastX = e.clientX; lastY = e.clientY;
      if (dbl) { lastT = 0; if (zoomed) unzoom(); else if (e.target.classList.contains("lb-img")) zoomAt(sl, e.clientX, e.clientY); return; }
      if (e.target.classList.contains("lb-slide") && !zoomed) setTimeout(() => { if (lastT && Date.now() - lastT >= 320 && !done) close(); }, 340); // nhấp 1 lần vào nền → đóng (đợi xem có phải nhấp đôi không)
    });
    // Chuột: kéo để chuyển ảnh (khi chưa phóng) hoặc để di chuyển trong ảnh (khi đã phóng); cảm ứng dùng cuộn gốc
    let down = null;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, tl: track.scrollLeft, sl: zoomed ? zoomed.scrollLeft : 0, st: zoomed ? zoomed.scrollTop : 0, drag: false }; moved = false;
    });
    const onMove = (e) => {
      if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.drag && Math.hypot(dx, dy) > 6) { down.drag = true; moved = true; used(); if (!zoomed) track.classList.add("is-dragging"); }
      if (!down.drag) return;
      if (zoomed) { zoomed.scrollLeft = down.sl - dx; zoomed.scrollTop = down.st - dy; } else track.scrollLeft = down.tl - dx;
    };
    const onUp = () => {
      if (!down) return; const d = down.drag; down = null;
      if (d) { track.classList.remove("is-dragging"); if (!zoomed) go(Math.round(track.scrollLeft / (track.clientWidth || 1)), true); setTimeout(() => { moved = false; }, 0); }
    };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
    track.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    ["touchstart", "wheel"].forEach((ev) => track.addEventListener(ev, used, { passive: true, once: true }));
    const pv = bg.querySelector(".lb-prev"), nx = bg.querySelector(".lb-next");
    if (pv) { pv.onclick = () => { used(); go(cur - 1); }; nx.onclick = () => { used(); go(cur + 1); }; }
    bg.querySelector(".lb-close").onclick = close;
    track.addEventListener("dragstart", (e) => e.preventDefault());

    document.body.classList.add("lb-open"); document.body.appendChild(bg);
    track.scrollLeft = cur * track.clientWidth; update(); track.focus({ preventScroll: true });
    document.addEventListener("keydown", onKey, true); window.addEventListener("resize", onResize); window.addEventListener("popstate", onPop);
    try { history.pushState({ pgLightbox: 1 }, ""); pushed = true; } catch (e) { /* bỏ qua */ }
  }

  /* ---------- Thư viện ảnh vuốt ngang: thêm mũi tên (máy tính), chấm, bộ đếm, gợi ý vuốt, phím ←/→ và kéo bằng chuột ---------- */
  function initGallery(c) {
    if (c.dataset.ready) return; c.dataset.ready = "1";
    const stage = c.querySelector(".pg-stage"), track = c.querySelector(".pg-track"), slides = [...track.children], n = slides.length;
    let sync = () => {};
    // Bấm ảnh → popup xem ảnh (không mở tab mới). Nhấp có phím Ctrl/Shift/Alt/Cmd hoặc chuột giữa thì giữ hành vi mở link của trình duyệt.
    track.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a.pg-slide"); if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      openLightbox(slides.map((s) => ({ src: s.href, alt: (s.querySelector("img") || {}).alt || "" })), slides.indexOf(a), (i) => sync(i));
    });
    if (n < 2) return;
    const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mk = (tag, cls, html, attrs = {}) => { const e = document.createElement(tag); e.className = cls; if (html) e.innerHTML = html; Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
    const prev = mk("button", "pg-nav pg-prev", "‹", { type: "button", "aria-label": "Ảnh trước" }), next = mk("button", "pg-nav pg-next", "›", { type: "button", "aria-label": "Ảnh sau" });
    const count = mk("span", "pg-count", "", { "aria-hidden": "true" });
    const dots = mk("div", "pg-dots"), dotEls = slides.map((_, i) => { const b = mk("button", "", "", { type: "button", "aria-label": `Ảnh ${i + 1} / ${n}` }); b.onclick = () => go(i); dots.appendChild(b); return b; });
    const hint = mk("div", "pg-hint", '<span class="pg-hand" aria-hidden="true">👆</span> Vuốt ngang để xem thêm ảnh', { "aria-hidden": "true" });
    stage.append(prev, next, count); c.append(dots, hint);

    const step = () => (slides[1].offsetLeft - slides[0].offsetLeft) || track.clientWidth;
    const maxLeft = () => track.scrollWidth - track.clientWidth;
    const current = () => (track.scrollLeft >= maxLeft() - 2 ? n - 1 : Math.min(n - 1, Math.max(0, Math.round(track.scrollLeft / step()))));
    const go = (i, smooth = true) => track.scrollTo({ left: Math.max(0, Math.min(n - 1, i)) * step(), behavior: smooth && !reduced ? "smooth" : "auto" });
    let raf = 0;
    const update = () => {
      raf = 0; const i = current();
      count.textContent = `${i + 1} / ${n}`;
      dotEls.forEach((d, k) => d.setAttribute("aria-current", String(k === i)));
      prev.disabled = i === 0; next.disabled = i === n - 1;
      stage.classList.toggle("has-prev", track.scrollLeft > 4); stage.classList.toggle("has-next", track.scrollLeft < maxLeft() - 4);
    };
    sync = (i) => go(i, false); // đóng popup → dải ảnh nhảy tới ảnh vừa xem
    const used = () => c.classList.add("is-used"); // người xem đã tự thao tác → ẩn dòng gợi ý
    track.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", update);
    ["touchstart", "wheel", "keydown"].forEach((ev) => track.addEventListener(ev, used, { passive: true, once: true }));
    prev.onclick = () => { used(); go(current() - 1); }; next.onclick = () => { used(); go(current() + 1); };
    track.addEventListener("keydown", (e) => {
      const k = e.key; if (k !== "ArrowLeft" && k !== "ArrowRight" && k !== "Home" && k !== "End") return;
      e.preventDefault(); go(k === "ArrowLeft" ? current() - 1 : k === "ArrowRight" ? current() + 1 : k === "Home" ? 0 : n - 1);
    });
    // Kéo bằng chuột (cảm ứng đã vuốt được sẵn): quá 6px mới tính là kéo, và khi đó bỏ cú nhấp để không mở ảnh nhầm
    let sx = 0, sl = 0, dragging = false, down = false;
    track.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button !== 0) return; down = true; dragging = false; sx = e.clientX; sl = track.scrollLeft; });
    window.addEventListener("pointermove", (e) => {
      if (!down) return; const dx = e.clientX - sx;
      if (!dragging && Math.abs(dx) > 6) { dragging = true; used(); track.classList.add("is-dragging"); }
      if (dragging) track.scrollLeft = sl - dx;
    });
    const end = () => { if (!down) return; down = false; if (!dragging) return; track.classList.remove("is-dragging"); go(current(), true); setTimeout(() => { dragging = false; }, 0); };
    window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end);
    track.addEventListener("click", (e) => { if (dragging) { e.preventDefault(); e.stopPropagation(); } }, true);
    track.addEventListener("dragstart", (e) => e.preventDefault());
    update();
    // Lần đầu ảnh hiện ra: kéo thử nhẹ sang trái rồi về để gợi ý có thể vuốt (bỏ qua nếu người dùng chọn giảm chuyển động)
    if (!reduced && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => {
        if (!es.some((x) => x.isIntersecting)) return; io.disconnect();
        if (c.classList.contains("is-used") || track.scrollLeft > 0) return;
        track.scrollTo({ left: Math.min(56, step() * 0.3), behavior: "smooth" });
        setTimeout(() => { if (!c.classList.contains("is-used")) track.scrollTo({ left: 0, behavior: "smooth" }); }, 750);
      }, { threshold: 0.7 });
      io.observe(c);
    }
  }

  /* ---------- Popup bắt tích "đồng ý chính sách" trước khi mở link của nút ----------
     Nút nào có data-gate (do product/js/productgen.js gắn khi trang có/kế thừa chính sách và không tắt consent:false) sẽ chưa mở link ngay:
     hiện popup có ô tích đồng ý + nút xem chính sách/giấy phép của chính trang này (lấy từ khối .product-license đang hiển thị). Tích xong mới bấm được "Tiếp tục".
     Đây là bước xác nhận phía trình duyệt (không phải rào chắn bảo mật: link vẫn nằm trong trang). Không có JS thì nút vẫn mở link bình thường. */
  function openConsent(link) {
    const policy = document.querySelector(".product-license");
    if (!policy || document.querySelector(".consent-bg")) return !!document.querySelector(".consent-bg"); // không có chính sách → không chặn; đang mở sẵn → không mở thêm
    const prev = document.activeElement, label = (link.textContent || "").trim() || "liên kết";
    const bg = document.createElement("div"); bg.className = "consent-bg";
    bg.innerHTML = `<div class="consent-box" role="dialog" aria-modal="true" aria-labelledby="cs-t">
      <div class="consent-head"><h2 id="cs-t">Trước khi tiếp tục</h2><p>Bạn sắp mở “<b data-l></b>”. Vui lòng xem và đồng ý chính sách &amp; giấy phép của trang này.</p></div>
      <div class="consent-body"><button type="button" class="consent-view" aria-expanded="false" aria-controls="cs-pol">📜 Xem chính sách &amp; giấy phép</button><div class="consent-policy" id="cs-pol" hidden></div></div>
      <div class="consent-foot"><label class="consent-check"><input type="checkbox" id="cs-ok"><span>Tôi đã đọc và đồng ý với chính sách &amp; giấy phép của trang này.</span></label>
        <div class="consent-actions"><button type="button" class="consent-cancel">Hủy</button><a class="consent-go" aria-disabled="true">Tiếp tục</a></div></div></div>`;
    bg.querySelector("[data-l]").textContent = label; // văn bản thuần
    const box = bg.querySelector(".consent-box"), pol = bg.querySelector(".consent-policy"), view = bg.querySelector(".consent-view"), ok = bg.querySelector("#cs-ok"), go = bg.querySelector(".consent-go");
    policy.querySelectorAll(".product-note, .license-block").forEach((n) => pol.appendChild(n.cloneNode(true)));
    go.setAttribute("href", link.href);
    ["target", "rel"].forEach((k) => { if (link.hasAttribute(k)) go.setAttribute(k, link.getAttribute(k)); });
    const close = () => { bg.remove(); document.body.classList.remove("consent-open"); document.removeEventListener("keydown", onKey, true); if (prev && prev.focus) prev.focus(); };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); return close(); }
      if (e.key !== "Tab") return;
      const f = [...box.querySelectorAll("button, input, a[href]")].filter((x) => !x.hidden && x.offsetParent !== null); // giữ Tab quay vòng trong popup
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    view.onclick = () => { const open = pol.hidden; pol.hidden = !open; view.setAttribute("aria-expanded", String(open)); view.innerHTML = open ? "▲ Ẩn chính sách &amp; giấy phép" : "📜 Xem chính sách &amp; giấy phép"; if (open) pol.scrollTop = 0; };
    ok.onchange = () => go.setAttribute("aria-disabled", ok.checked ? "false" : "true");
    go.onclick = (e) => {
      if (go.getAttribute("aria-disabled") === "true") { e.preventDefault(); ok.focus(); bg.querySelector(".consent-check").animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 260 }); return; }
      setTimeout(close, 0); // để trình duyệt mở link trước rồi mới đóng popup
    };
    bg.querySelector(".consent-cancel").onclick = close;
    bg.addEventListener("mousedown", (e) => { if (e.target === bg) close(); });
    document.addEventListener("keydown", onKey, true);
    document.body.classList.add("consent-open");
    document.body.appendChild(bg);
    view.focus({ preventScroll: true });
    return true;
  }
  function initConsent() {
    const onClick = (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a[data-gate]") : null;
      if (!a || (e.type === "auxclick" && e.button !== 1)) return;
      if (openConsent(a)) e.preventDefault();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick); // chuột giữa (mở tab mới)
  }

  /* ---------- Hiển thị ---------- */
  async function main() {
    // Danh sách dựng sẵn trong HTML (cho bot không chạy JS, xem tools/prerender.js): JS tự dựng lại bản động nên bỏ bản tĩnh.
    document.querySelectorAll("[data-prerender]").forEach((el) => el.remove());
    const app = document.getElementById("app");
    const m = location.pathname.match(/^\/product\/([^/.]+)\/?$/);
    const id = m && decodeURIComponent(m[1]);
    const idx = await loadIndex();
    if (!idx) { // không đọc được dữ liệu: giữ nguyên HTML tĩnh nếu có, không thì báo lỗi nhẹ
      if (app && !app.children.length) app.innerHTML = '<p class="empty-msg" style="text-align:center">Không tải được danh sách sản phẩm. Vui lòng tải lại trang.</p>';
      if (window.SiteLoading) window.SiteLoading.ready();
      return;
    }
    const nodes = idx.nodes, hub = { title: idx.title, intro: idx.intro };

    if (!id) { // /product/
      app.innerHTML = PG.bodyHub({ nodes, hub });
      if (window.SiteLoading) window.SiteLoading.ready();
      return;
    }
    const node = PG.find(nodes, id);
    if (!node) { location.replace(SITE_404); return; }
    const details = await loadDetails(nodes, id), d = details[id] || {};
    const bodyHtml = !PG.isCat(node) && d.body && typeof renderPostBody === "function" ? renderPostBody(d.body) : "";
    app.innerHTML = PG.bodyNode({ node, nodes, details, bodyHtml, hub });
    setTitle(`${node.title} — ${(document.title.split(" — ")[1]) || "Moe Shinn"}`);
    if (PG.isTool(node, d)) await mountTool(d.tool);
    if (window.SiteLoading) window.SiteLoading.ready();
    document.querySelectorAll("[data-gallery]").forEach(initGallery);
    if (!PG.isCat(node)) { trackViews(id); mountShare(node); mountComments(d); }
  }

  initConsent();
  main();
})();
