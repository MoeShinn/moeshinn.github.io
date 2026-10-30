/* profile/js/main.js
   Dựng trang /profile từ /profile/data.json (sửa ở /admin → Hồ sơ Vtuber) + /channel/data.json (mạng xã hội, bỏ mục Liên hệ).
   HTML dựng sẵn bởi tools/prerender.js (cho bot/AI) được thay bằng bản động cùng logic (profile/js/profilegen.js).
   Có "gọi" service worker: gửi danh sách ảnh của hồ sơ để sw.js lưu sẵn (mở lại khi mất mạng vẫn thấy ảnh).
   /profile/?preview=1 : chế độ xem trước trong admin, nhận dữ liệu nháp qua postMessage (chưa cần lưu). */
(function () {
  const PG = window.ProfileGen, root = document.getElementById("pf-root"), PREVIEW = new URLSearchParams(location.search).has("preview");
  let first = true, io = null;

  const getJson = (url) => fetch(url, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  function applyTheme(d) {
    let st = document.getElementById("pf-vars");
    if (!st) { st = document.createElement("style"); st.id = "pf-vars"; document.head.appendChild(st); }
    st.textContent = PG.varsCss(d);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = PG.normalize(d).theme.primary;
  }

  // Nền: ảnh/GIF tải được thì dùng; không tải được (link hỏng) thì giữ hoạ tiết mặc định, không báo lỗi.
  function applyBg(d) {
    const el = document.querySelector("[data-pf-bg]"), dim = document.querySelector("[data-pf-dim]"), b = PG.bgSpec(d);
    if (!el) return;
    el.className = "pf-bg" + (b.fixed ? "" : " pf-bg--scroll"); el.removeAttribute("style");
    if (b.mode === "color") { el.classList.add("pf-bg--color"); el.style.backgroundColor = b.color; }
    else if (b.mode === "image") {
      const im = new Image();
      im.onload = () => { el.style.backgroundImage = `url("${PG.cssUrl(b.image)}")`; el.classList.add("pf-bg--" + b.fit); };
      im.src = b.image;
    }
    if (dim) dim.style.opacity = String(b.dim / 100);
  }

  // Ảnh lỗi/chưa có → gỡ luôn khung ảnh, không để lại biểu tượng "ảnh hỏng".
  function dropBroken() {
    const kill = (img) => { const li = img.closest(".pf-fan-imgs > li"), box = img.closest(".pf-avatar") || img.closest(".pf-media"); (li || box || img).remove(); const ul = root.querySelector(".pf-fan-imgs"); if (ul && !ul.children.length) { const fan = ul.closest(".pf-fan"); ul.remove(); if (fan) fan.classList.add("pf-fan--solo"); } };
    root.querySelectorAll("img").forEach((img) => {
      if (img.complete && !img.naturalWidth && !/\.svg(\?|$)/i.test(img.src)) kill(img);
      else img.addEventListener("error", () => kill(img), { once: true });
    });
  }

  function reveal() {
    if (io) io.disconnect();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("pf-anim");
    io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
    root.querySelectorAll(".pf-card:not(.pf-hero-card), .pf-sticker, .pf-nav, .pf-next, .pf-social li").forEach((el) => { el.classList.add("pf-rv"); io.observe(el); });
  }

  addEventListener("beforeprint", () => root.querySelectorAll(".pf-rv:not(.in)").forEach((el) => el.classList.add("in"))); // in/lưu PDF: hiện đủ mọi mục

  // Nhờ service worker lưu sẵn ảnh cùng domain của hồ sơ (bỏ qua chế độ xem trước)
  function warmImages(d) {
    if (PREVIEW || !("serviceWorker" in navigator)) return;
    const urls = [...new Set(PG.imageFields(d).map((x) => PG.safeImg(x[1])).filter((u) => u && u.startsWith("/")))];
    if (!urls.length) return;
    navigator.serviceWorker.ready.then((reg) => { const w = navigator.serviceWorker.controller || reg.active; if (w) w.postMessage({ type: "warm-images", urls }); }).catch(() => {});
  }

  function render(pf, channel) {
    const d = PG.normalize(pf), ctx = { links: PG.socialLinks(channel, window.MEDIA_ICONS || {}) };
    applyTheme(d); applyBg(d);
    root.innerHTML = PG.page(d, ctx);
    dropBroken(); reveal(); warmImages(d);
    if (first) { first = false; if (location.hash.length > 1) { const el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) el.scrollIntoView(); } }
  }

  // Phóng to ảnh bằng cách bấm vào ảnh
  root.addEventListener("click", (e) => {
    const b = e.target.closest(".pf-zoom"); if (!b) return;
    const src = b.querySelector("img"); if (!src) return;
    const lb = document.createElement("div"); lb.className = "pf-lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Xem ảnh lớn");
    const im = document.createElement("img"); im.src = src.currentSrc || src.src; im.alt = src.alt || ""; lb.appendChild(im);
    const close = () => { lb.remove(); document.removeEventListener("keydown", onKey); b.focus(); };
    const onKey = (ev) => { if (ev.key === "Escape") close(); };
    lb.addEventListener("click", close); document.addEventListener("keydown", onKey); document.body.appendChild(lb);
  });

  async function init() {
    const [pf, ch] = await Promise.all([getJson("/profile/data.json"), getJson("/channel/data.json")]);
    if (pf) render(pf, ch || { links: [] }); // lỗi tải dữ liệu → giữ nguyên bản dựng sẵn
    if (window.SiteLoading) window.SiteLoading.ready();
    return ch;
  }
  const done = init();

  if (PREVIEW) {
    window.addEventListener("message", (e) => {
      if (e.origin !== location.origin || !e.data || e.data.type !== "pf-preview") return;
      done.then((ch) => render(e.data.data, ch || { links: [] }));
    });
    if (window.parent !== window) window.parent.postMessage({ type: "pf-ready" }, location.origin);
  }
})();
