/* site-chrome.js
   Shared header (logo + page menu) and footer text for every page,
   sourced from the root /data.json "nav" and "footer" fields.

   Include this on every page right after loading.js, before the
   page's own main.js. It never touches page-specific content — each
   page's own data file (channel/data.json, donate/data.json, etc.)
   still drives everything else.

   Expected markup on the page (see index.html for the full snippet):
     <header class="site-header">
       <a data-nav-home><img data-nav-logo /></a>
       <button data-nav-menu-toggle>...</button>
       <nav data-nav-menu></nav>
     </header>
     ...
     <footer data-global-footer>fallback text</footer>
*/
(function () {
  // Used if /data.json can't be reached, so the header still works.
  const DEFAULT_NAV = {
    logo: "/assets/avatar.png",
    home: "/index.html",
    pages: [{ label: "Trang chủ", url: "/index.html" }],
  };

  // "/channel/index.html" -> "/channel/", "/index.html" -> "/": một nội dung chỉ nên có MỘT địa chỉ (tránh trùng lặp URL với canonical).
  const cleanUrl = (u) => String(u || "").replace(/(^|\/)index\.html$/, "$1");

  function renderHeader(nav) {
    const homeLink = document.querySelector("[data-nav-home]");
    const logoImg = document.querySelector("[data-nav-logo]");
    const menu = document.querySelector("[data-nav-menu]");
    const toggle = document.querySelector("[data-nav-menu-toggle]");

    if (homeLink) homeLink.href = cleanUrl(nav.home || "/");
    if (logoImg) logoImg.src = nav.logo || "/assets/avatar.png";

    if (menu) {
      menu.innerHTML = "";
      (nav.pages || []).forEach((p) => {
        const a = document.createElement("a");
        a.href = cleanUrl(p.url);
        a.textContent = p.label;
        a.setAttribute("role", "menuitem");
        menu.appendChild(a);
      });
    }

    if (toggle && menu) {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.toggle("open");
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      document.addEventListener("click", (e) => {
        if (!menu.contains(e.target) && e.target !== toggle) {
          menu.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          menu.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  function renderFooter(text) {
    if (!text) return; // keep each page's static fallback text if unavailable
    document.querySelectorAll("[data-global-footer]").forEach((el) => {
      el.textContent = text;
    });
  }

  async function init() {
    let data = null;
    try {
      const res = await fetch("/data.json", { cache: "no-store" });
      if (res.ok) data = await res.json();
    } catch (e) {
      console.error("site-chrome: could not load /data.json", e);
    }

    const nav = (data && data.nav) || DEFAULT_NAV;
    renderHeader(nav);
    renderFooter(data && data.footer);

    // Let the shared loading screen wait for the header logo too, if
    // it's still up when this resolves.
    if (window.SiteLoading && nav.logo) {
      window.SiteLoading.waitFor(nav.logo);
    }
  }

  init();
})();

/* ------------------------------------------------------------------ */
/* Thanh thông báo toàn site + chế độ bảo trì                          */
/* Đọc /site-settings.json → "announcement" và "maintenance"           */
/* (sửa ở /admin → Cài đặt). Tự chứa CSS, không cần sửa trang nào.     */
/*                                                                     */
/* • Thanh thông báo: hiện trên cùng mọi trang; khách bấm × để ẩn      */
/*   (nội dung đổi thì hiện lại); tự tắt sau ngày "expires".           */
/* • Bảo trì: phủ kín màn hình bằng thông báo. Trình duyệt đang đăng  */
/*   nhập /admin (hoặc mở trang với ?bypass=1) vẫn xem được trang.     */
/*   Bot/công cụ tìm kiếm không bị chặn (để không hỏng SEO).           */
/* Lưu ý: GitHub Pages là web tĩnh nên đây là chặn ở phía trình duyệt, */
/* không phải khóa bảo mật.                                            */
/* ------------------------------------------------------------------ */
(function () {
  const IS_BOT =
    /bot|crawl|spider|slurp|lighthouse|headless|facebookexternalhit|perplexity|claude|gemini|chatgpt|bytespider/i.test(
      navigator.userAgent || ""
    ) || navigator.webdriver === true;
  if (IS_BOT) return;
  // Khung xem thử trong /admin (?loadpreview=…): không hiện thanh thông báo / bảo trì.
  if (new URLSearchParams(location.search).has("loadpreview")) return;

  const K_MAINT = "shinju_maintenance"; // nhớ lần trước đang bảo trì → không bị "nháy" nội dung khi tải trang
  const K_ANN = "shinju_announce_closed"; // mã của thông báo khách đã bấm ×
  const K_ADMIN = "shinju_admin_session"; // cùng khóa với /admin
  const K_BYPASS = "shinju_bypass";
  const K_ADMIN_UNTIL = "shinju_bypass_until"; // do /admin ghi khi đăng nhập (xem admin/js/core.js)

  const store = {
    get: (k, area) => { try { return (area || localStorage).getItem(k); } catch (e) { return null; } },
    set: (k, v, area) => { try { (area || localStorage).setItem(k, v); } catch (e) {} },
    del: (k, area) => { try { (area || localStorage).removeItem(k); } catch (e) {} },
  };

  /* ---------- tiện ích ---------- */
  const hash = (str) => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return String(h >>> 0); };
  const isAdmin = () => {
    try { const x = JSON.parse(sessionStorage.getItem(K_ADMIN)); return !!(x && x.exp * 1000 > Date.now()); } catch (e) { return false; }
  };
  if (new URLSearchParams(location.search).get("bypass") === "1") store.set(K_BYPASS, "1", sessionStorage);
  const adminUntil = () => Number(store.get(K_ADMIN_UNTIL)) > Date.now();
  const bypass = () => isAdmin() || adminUntil() || store.get(K_BYPASS, sessionStorage) === "1";

  // Chỉ cho http(s), mailto hoặc đường dẫn nội bộ; còn lại coi như không có link.
  function safeUrl(u) {
    u = String(u || "").trim();
    if (!u) return "";
    if (/^[a-z0-9][a-z0-9_-]*$/i.test(u)) u = "/" + u + "/";
    try { const x = new URL(u, location.origin); return /^(https?:|mailto:)$/.test(x.protocol) ? x.href : ""; } catch (e) { return ""; }
  }
  const expired = (d) => {
    if (!d) return false;
    const end = new Date(String(d).trim() + "T23:59:59"); // hết ngày đó theo giờ máy khách
    return !isNaN(end) && Date.now() > end.getTime();
  };

  /* ---------- CSS ---------- */
  function injectCss() {
    if (document.getElementById("sc-notice-css")) return;
    const st = document.createElement("style");
    st.id = "sc-notice-css";
    st.textContent =
      ".sc-announce{position:relative;z-index:12;display:flex;align-items:center;justify-content:center;gap:8px;" +
      "padding:8px 42px 8px 14px;text-align:center;font-family:inherit;font-weight:600;font-size:14px;line-height:1.4;color:#fff;" +
      "background:linear-gradient(90deg,rgba(31,111,214,.95),rgba(20,80,163,.95));border-bottom:1px solid rgba(255,255,255,.18)}" +
      ".sc-announce a,.sc-announce span.sc-a-text{color:#fff;overflow-wrap:anywhere}" +
      ".sc-announce a{text-decoration:underline;text-underline-offset:3px}" +
      ".sc-announce a:hover{text-decoration-thickness:2px}" +
      ".sc-announce-x{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:30px;height:30px;border:0;border-radius:50%;" +
      "background:transparent;color:#fff;font-size:20px;line-height:1;cursor:pointer;opacity:.8}" +
      ".sc-announce-x:hover,.sc-announce-x:focus-visible{opacity:1;background:rgba(255,255,255,.18)}" +
      ".sc-maint{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;" +
      "background:radial-gradient(ellipse at 30% 10%,var(--bg-mid,#0c1a2e) 0%,var(--bg-deep,#050b16) 65%);" +
      "color:var(--text-cream,#f4ecd8);font-family:inherit;overflow:auto}" +
      ".sc-maint-card{max-width:460px;width:100%;text-align:center;padding:32px 26px;border-radius:18px;" +
      "background:rgba(244,236,216,.07);border:1px solid rgba(244,236,216,.18);box-shadow:0 10px 40px rgba(0,0,0,.45)}" +
      ".sc-maint-icon{font-size:48px;line-height:1;margin-bottom:10px}" +
      ".sc-maint-card h1{margin:0 0 10px;font-size:24px}" +
      ".sc-maint-msg{margin:0 0 20px;font-size:16px;line-height:1.55;white-space:pre-line;overflow-wrap:anywhere}" +
      ".sc-maint-btn{font:inherit;font-weight:700;padding:10px 20px;border:0;border-radius:999px;cursor:pointer;color:#fff;" +
      "background:linear-gradient(180deg,var(--blue-btn-1,#1f6fd6),var(--blue-btn-2,#1450a3))}" +
      ".sc-maint-btn:hover{filter:brightness(1.1)}" +
      ".sc-maint-pill{position:fixed;left:10px;bottom:10px;z-index:2147482000;max-width:calc(100vw - 20px);padding:6px 12px;" +
      "border-radius:999px;font-family:inherit;font-weight:600;font-size:12px;line-height:1.3;color:#fff;background:rgba(190,60,40,.92);pointer-events:none;" +
      "box-shadow:0 2px 10px rgba(0,0,0,.4)}";
    document.head.appendChild(st);
  }

  /* ---------- Thanh thông báo ---------- */
  let bar = null;
  function hideBar() { if (bar) { bar.remove(); bar = null; } }
  function showAnnouncement(a) {
    const text = a && a.enabled ? String(a.text || "").trim() : "";
    const url = a ? safeUrl(a.url) : "";
    if (!text || expired(a.expires)) return hideBar();
    const id = hash(text + "|" + url);
    if (store.get(K_ANN) === id) return hideBar();
    injectCss();
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "sc-announce";
      bar.setAttribute("role", "status");
      bar.setAttribute("data-nosnippet", "");
      document.body.insertBefore(bar, document.body.firstChild);
    }
    bar.textContent = "";
    const label = document.createElement(url ? "a" : "span");
    label.className = "sc-a-text";
    label.textContent = "📢 " + text;
    if (url) {
      label.href = url;
      if (new URL(url).origin !== location.origin) { label.target = "_blank"; label.rel = "noopener noreferrer"; }
    }
    const x = document.createElement("button");
    x.type = "button";
    x.className = "sc-announce-x";
    x.setAttribute("aria-label", "Đóng thông báo");
    x.textContent = "×";
    x.addEventListener("click", () => { store.set(K_ANN, id); hideBar(); });
    bar.append(label, x);
  }

  /* ---------- Chế độ bảo trì ---------- */
  let maint = null, pill = null, locked = [];
  function unlock() {
    locked.forEach((el) => el.removeAttribute("inert"));
    locked = [];
    document.documentElement.style.overflow = "";
  }
  function hideMaintenance() {
    if (maint) { maint.remove(); maint = null; }
    if (pill) { pill.remove(); pill = null; }
    unlock();
  }
  function showMaintenance(message) {
    const msg = String(message || "").trim() || "Trang web đang được cập nhật, vui lòng quay lại sau.";
    injectCss();
    if (bypass()) { // admin: vẫn xem được trang, chỉ nhắc đang bật bảo trì
      if (maint) hideMaintenance();
      if (!pill) {
        pill = document.createElement("div");
        pill.className = "sc-maint-pill";
        pill.textContent = "🛠 Đang bật chế độ bảo trì — chỉ bạn (admin) thấy trang này";
        document.body.appendChild(pill);
      }
      return;
    }
    if (!maint) {
      maint = document.createElement("div");
      maint.className = "sc-maint";
      maint.setAttribute("role", "alertdialog");
      maint.setAttribute("aria-modal", "true");
      maint.setAttribute("aria-labelledby", "sc-maint-title");
      maint.setAttribute("data-nosnippet", "");
      maint.innerHTML =
        '<div class="sc-maint-card"><div class="sc-maint-icon" aria-hidden="true">🛠️</div>' +
        '<h1 id="sc-maint-title">Đang bảo trì</h1><p class="sc-maint-msg"></p>' +
        '<button type="button" class="sc-maint-btn">Tải lại trang</button></div>';
      maint.querySelector(".sc-maint-btn").addEventListener("click", () => location.reload());
      document.body.appendChild(maint);
      locked = [...document.body.children].filter((el) => el !== maint && !el.hasAttribute("inert"));
      locked.forEach((el) => el.setAttribute("inert", ""));
      document.documentElement.style.overflow = "hidden";
    }
    maint.querySelector(".sc-maint-msg").textContent = msg;
  }

  /* ---------- Chạy ---------- */
  function apply(s) {
    s = s || {};
    showAnnouncement(s.announcement);
    const m = s.maintenance;
    if (m && m.enabled) {
      store.set(K_MAINT, JSON.stringify({ message: m.message || "" }));
      showMaintenance(m.message);
    } else {
      store.del(K_MAINT);
      hideMaintenance();
    }
  }

  async function init() {
    // Lần trước đang bảo trì → dựng ngay từ bộ nhớ, rồi xác nhận lại với server.
    try { const c = JSON.parse(store.get(K_MAINT) || "null"); if (c) showMaintenance(c.message); } catch (e) {}
    try {
      const res = await fetch("/site-settings.json", { cache: "no-cache" });
      if (res.ok) apply(await res.json());
    } catch (e) {
      console.error("site-chrome: could not load /site-settings.json", e);
    }
  }
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();
