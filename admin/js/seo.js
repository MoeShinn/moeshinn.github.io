/* Dựng khối SEO <head> cho các trang công khai (dùng chung cho admin và script di chuyển). */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.AdminSeo = factory(); })(typeof window !== "undefined" ? window : this, function () {
  const PAGES = { home: "Trang chủ", post: "Bài đăng", download: "Download", channel: "Mạng xã hội", donate: "Donate" };
  const URLS = { home: "/", post: "/post/", download: "/download/", channel: "/channel/", donate: "/donate/" };
  const FILE = { home: "index.html", post: "post/index.html", download: "download/index.html", channel: "channel/index.html", donate: "donate/index.html" };
  const DEFAULT = {
    siteUrl: "https://shinjuvn.github.io", siteName: "Shinju Ch.", ogImage: "", shortLength: 10, // shortLength: số ký tự mã rút gọn /s/ tự sinh
    favicon: { icon: "/assets/favicon.png", apple: "", v: "" },
    pages: {
      home: { title: "Shinju Ch.", description: "Trang cá nhân của Shinju Ch. (@ShinjuVNer): mạng xã hội, ủng hộ và các bài đăng mới.", keywords: "Shinju Ch., ShinjuVNer, Shinju, mạng xã hội, blog" },
      post: { title: "Shinju Ch. — Blog", description: "Blog của Shinju Ch.: thông báo, hướng dẫn và các bài viết mới.", keywords: "blog, bài viết, hướng dẫn, Shinju Ch." },
      download: { title: "Tải xuống — Shinju Ch.", description: "Tải xuống các tệp và tài nguyên do Shinju Ch. chia sẻ.", keywords: "tải xuống, download, Shinju Ch." },
      channel: { title: "Shinju Ch. — Channel", description: "Các kênh mạng xã hội của Shinju Ch.: YouTube và các nền tảng khác.", keywords: "Shinju Ch., ShinjuVNer, YouTube, mạng xã hội" },
      donate: { title: "Ủng Hộ — Shinju Ch.", description: "Ủng hộ Shinju Ch. để duy trì và phát triển nội dung.", keywords: "ủng hộ, donate, Shinju Ch." },
    },
  };
  const merge = (x = {}) => ({ ...DEFAULT, ...x, favicon: { ...DEFAULT.favicon, ...x.favicon },
    pages: Object.fromEntries(Object.keys(DEFAULT.pages).map((k) => [k, { ...DEFAULT.pages[k], ...(x.pages || {})[k] }])) });
  const a = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function block(key, seo) {
    const p = seo.pages[key], url = seo.siteUrl.replace(/\/$/, "") + URLS[key], f = seo.favicon;
    const L = ["<!-- seo:start -->", `<title>${t(p.title)}</title>`];
    if (p.description) L.push(`<meta name="description" content="${a(p.description)}" />`);
    if (p.keywords) L.push(`<meta name="keywords" content="${a(p.keywords)}" />`);
    L.push(`<link rel="canonical" href="${a(url)}" />`, `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="${a(seo.siteName)}" />`, `<meta property="og:title" content="${a(p.title)}" />`);
    if (p.description) L.push(`<meta property="og:description" content="${a(p.description)}" />`);
    L.push(`<meta property="og:url" content="${a(url)}" />`);
    if (seo.ogImage) L.push(`<meta property="og:image" content="${a(seo.ogImage)}" />`);
    L.push(`<meta name="twitter:card" content="${seo.ogImage ? "summary_large_image" : "summary"}" />`);
    L.push(`<link rel="icon" type="image/png" sizes="32x32" href="${a(f.icon)}" />`);
    if (f.v) L.push(`<link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon/favicon-192.png?v=${a(f.v)}" />`);
    if (f.apple) L.push(`<link rel="apple-touch-icon" href="${a(f.apple)}" />`);
    L.push("<!-- seo:end -->");
    return L.join("\n  ");
  }
  // Thay nội dung giữa cặp marker; trả null nếu trang chưa có marker.
  const apply = (html, b) => (/<!-- seo:start -->[\s\S]*?<!-- seo:end -->/.test(html) ? html.replace(/<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, () => b) : null);
  // manifest.webmanifest của PWA; biểu tượng 192/512 chỉ có sau khi đã tải favicon ở Cài đặt
  function manifest(seo) {
    const f = seo.favicon, name = seo.siteName;
    const icons = f.v ? [{ src: "/assets/favicon/favicon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/assets/favicon/favicon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }].concat(f.maskable ? [{ src: "/assets/favicon/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] : []) : [{ src: f.icon, sizes: "any", type: "image/png" }];
    return JSON.stringify({ name, short_name: name.slice(0, 12), description: seo.pages.home.description, start_url: "/", scope: "/", display: "standalone", background_color: "#050b16", theme_color: "#050b16", lang: "vi", icons }, null, 2) + "\n";
  }
  return { PAGES, URLS, FILE, DEFAULT, merge, block, apply, manifest };
});
