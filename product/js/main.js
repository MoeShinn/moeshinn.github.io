/* Shinju Sản phẩm — product/js/main.js
   Đường dẫn sạch (không dùng query):
     /product/        -> trang chính: các danh mục gốc (thumbnail + tên, giống thẻ bài đăng nhưng KHÔNG có lượt xem/ngày)
     /product/<id>/   -> danh mục (lưới các mục con) hoặc trang sản phẩm. Trang tĩnh do admin / GitHub Actions dựng sẵn
                         (có SEO + nội dung thật cho Google và AI); JS dưới đây đọc dữ liệu mới nhất và dựng lại
                         đúng cùng HTML bằng product/js/productgen.js.
   Dữ liệu: /product/data.json (cây mục) và /product/data/<id>.json (chi tiết từng mục).
   Id không tồn tại -> /404.html.

   Lượt xem sản phẩm: chỉ +1 khi người xem Ở LẠI trang (tab đang hiện) ít nhất 30 giây, và tối đa 1 lần / 10 phút / trình duyệt.
   Cần thêm loại "product" vào biến COUNTER_TYPES của Worker bộ đếm (xem hướng dẫn); chưa thêm thì trang vẫn chạy, chỉ không đếm. */
(() => {
  "use strict";
  const PG = window.ProductGen;
  const SITE_404 = "/404.html";

  // Bộ đếm tự host: ĐỌC thẳng từ raw.githubusercontent.com, chỉ +1 mới qua Worker (giống post/js/main.js).
  const COUNTERS_RAW_BASE = "https://raw.githubusercontent.com/ShinjuVN/api-counters/main";
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
    const key = `shinjuvn_product_viewed_${id}`;
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
    setTitle(`${node.title} — ${(document.title.split(" — ")[1]) || "Shinju Ch."}`);
    if (window.SiteLoading) window.SiteLoading.ready();
    if (!PG.isCat(node)) { trackViews(id); mountShare(node); mountComments(d); }
  }

  main();
})();
