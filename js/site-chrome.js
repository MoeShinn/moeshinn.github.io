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
