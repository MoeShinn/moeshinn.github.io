/* assets/album/albumgen.js — bộ dựng HTML/SEO cho trang Album, DÙNG CHUNG cho:
   • trang công khai (assets/album/main.js) → dựng lại đúng cái HTML mà bot đã đọc,
   • tools/prerender.js (GitHub Actions) → dựng sẵn nội dung THẬT vào HTML tĩnh cho Google / AI.
   Chỉ nhận dữ liệu và trả về chuỗi: không đụng DOM, chạy được cả trong trình duyệt lẫn Node.

   Dữ liệu: /image/index.json (do trang admin "Kho ảnh" quản lý)
     { albums: [ { id, name } ], images: [ { file, album, w, h, size, name, added } ] }
   Địa chỉ: /album/ (các album có ảnh) và /album/<id>/ (toàn bộ ảnh của album).
   Bấm vào ảnh mở thẳng /image/<file> — service worker (sw.js) tự hiện trang xem ảnh. */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.AlbumGen = factory(); })(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  const t = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const a = (s) => t(s).replace(/"/g, "&quot;");
  const jsonSafe = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
  const HUB = "Album";
  const MAX_LD_IMAGES = 100; // số ảnh tối đa khai báo trong JSON-LD
  const site = (seo) => String(seo.siteUrl || "").replace(/\/$/, "");
  const url = (id) => `/album/${encodeURIComponent(id)}/`;
  const imgUrl = (file) => `/image/${encodeURIComponent(file)}`;
  const slugOk = (id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(id || "")) && String(id).length <= 60;
  const isoDay = (s) => (/^\d{4}-\d{2}-\d{2}/.test(String(s || "")) ? String(s).slice(0, 10) : "");

  /* ---------------- Dữ liệu ---------------- */
  function normalize(idx) {
    idx = idx || {};
    const albums = (Array.isArray(idx.albums) ? idx.albums : []).filter((x) => x && slugOk(x.id) && String(x.name || "").trim());
    const images = (Array.isArray(idx.images) ? idx.images : []).filter((x) => x && /^[^/\\?#]+\.(?:webp|png|jpe?g|gif|avif|svg)$/i.test(String(x.file || "")));
    return { albums, images };
  }
  // Ảnh của một album, MỚI NHẤT lên trước (cùng thời điểm thì giữ thứ tự trong index.json)
  function imagesOf(idx, id) {
    return idx.images.map((im, i) => ({ im, i })).filter((x) => x.im.album === id)
      .sort((x, y) => String(y.im.added || "").localeCompare(String(x.im.added || "")) || x.i - y.i).map((x) => x.im);
  }
  const find = (idx, id) => idx.albums.find((x) => x.id === id);
  // Album hiện ở trang /album/: chỉ album đã có ảnh
  function listed(idx) {
    return idx.albums.map((al) => { const list = imagesOf(idx, al.id); return { ...al, count: list.length, cover: list[0] || null, last: list.map((x) => isoDay(x.added)).filter(Boolean).sort().pop() || "" }; }).filter((x) => x.count);
  }

  /* ---------------- Khối HTML ---------------- */
  const countText = (n) => `${n} ảnh`;
  const card = (al) => `<a class="post-card album-card" href="${a(url(al.id))}"><div class="post-card-photo"><img src="${a(imgUrl(al.cover.file))}" alt="${a(al.name)}"${al.cover.w && al.cover.h ? ` width="${+al.cover.w}" height="${+al.cover.h}"` : ""} loading="lazy" decoding="async" /></div><div class="post-card-body"><h3 class="post-card-title">${t(al.name)}</h3><div class="post-card-meta"><span>${countText(al.count)}</span></div></div></a>`;
  const photo = (im, i, name) => `<a class="album-item" href="${a(imgUrl(im.file))}"><img src="${a(imgUrl(im.file))}" alt="${a(`${name} – ảnh ${i + 1}`)}"${im.w && im.h ? ` width="${+im.w}" height="${+im.h}"` : ""} loading="lazy" decoding="async" /></a>`;

  // Nội dung trang /album/
  function bodyHub({ idx }) {
    const list = listed(idx);
    return `<header class="blog-title-bar"><h1>${t(HUB)}</h1></header><section class="post-section"><div class="post-grid">${list.map(card).join("") || '<p class="empty-msg">Chưa có album nào.</p>'}</div></section>`;
  }
  // Nội dung trang một album
  function bodyAlbum({ idx, album }) {
    const list = imagesOf(idx, album.id);
    const bc = `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/album/">${t(HUB)}</a><span aria-current="page">${t(album.name)}</span></nav>`;
    return `${bc}<header class="blog-title-bar"><h1>${t(album.name)}</h1></header><p class="album-count">${countText(list.length)}</p>` +
      `<section class="post-section"><div class="album-grid">${list.map((im, i) => photo(im, i, album.name)).join("") || '<p class="empty-msg">Album này chưa có ảnh.</p>'}</div></section>`;
  }

  /* ---------------- SEO ---------------- */
  function ldFor({ seo, idx, album }) {
    const base = site(seo), id = album && album.id, u = id ? base + url(id) : base + "/album/";
    const bc = { "@type": "BreadcrumbList", itemListElement: [{ name: "Trang chủ", item: base + "/" }, { name: HUB, item: base + "/album/" }].concat(id ? [{ name: album.name, item: u }] : []).map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })) };
    if (!id) {
      const list = listed(idx);
      return { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", "@id": u + "#page", url: u, name: HUB, inLanguage: "vi", isPartOf: { "@id": base + "/#website" },
        mainEntity: { "@type": "ItemList", name: HUB, numberOfItems: list.length, itemListElement: list.map((al, i) => ({ "@type": "ListItem", position: i + 1, url: base + url(al.id), name: al.name, image: base + imgUrl(al.cover.file) })) } }, bc] };
    }
    const list = imagesOf(idx, id);
    return { "@context": "https://schema.org", "@graph": [{ "@type": ["CollectionPage", "ImageGallery"], "@id": u + "#page", url: u, name: album.name, inLanguage: "vi", isPartOf: { "@id": base + "/#website" }, numberOfItems: list.length,
      image: list.slice(0, MAX_LD_IMAGES).map((im, i) => ({ "@type": "ImageObject", contentUrl: base + imgUrl(im.file), name: `${album.name} – ảnh ${i + 1}`, ...(im.w && im.h ? { width: +im.w, height: +im.h } : {}) })) }, bc] };
  }

  // Khối <head> của một album: tiêu đề, mô tả, canonical, Open Graph, favicon, JSON-LD
  function headFor({ seo, idx, album }) {
    const base = site(seo), u = base + url(album.id), name = seo.siteName, f = seo.favicon || {}, list = imagesOf(idx, album.id);
    const title = `${album.name} — ${HUB} — ${name}`;
    const desc = list.length ? `Album ${album.name} của ${name}: ${list.length} ảnh.` : `Album ${album.name} của ${name}.`;
    const img = list[0] ? base + imgUrl(list[0].file) : (seo.ogImage || "");
    const L = ["<!-- seo:start -->", `<title>${t(title)}</title>`, `<meta name="description" content="${a(desc)}" />`];
    if (!list.length) L.push('<meta name="robots" content="noindex" />'); // album trống: chưa cho lên Google
    L.push(`<link rel="canonical" href="${a(u)}" />`, `<meta property="og:type" content="website" />`, `<meta property="og:site_name" content="${a(name)}" />`,
      `<meta property="og:title" content="${a(title)}" />`, `<meta property="og:description" content="${a(desc)}" />`, `<meta property="og:url" content="${a(u)}" />`);
    if (img) L.push(`<meta property="og:image" content="${a(img)}" />`);
    L.push(`<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />`);
    if (f.icon) L.push(`<link rel="icon" type="image/png" sizes="32x32" href="${a(f.icon)}" />`);
    if (f.v) L.push(`<link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon/favicon-192.png?v=${a(f.v)}" />`);
    if (f.apple) L.push(`<link rel="apple-touch-icon" href="${a(f.apple)}" />`);
    L.push(`<script type="application/ld+json" id="album-jsonld">${jsonSafe(ldFor({ seo, idx, album }))}</script>`, "<!-- seo:end -->");
    return L.join("\n  ");
  }

  // Các khối dựng sẵn của shell /album/ (do tools/prerender.js tạo) KHÔNG được lọt vào trang từng album.
  const stripPrerender = (html) => String(html).replace(/<!--pre:(albumlist|jsonld)-->[\s\S]*?<!--\/pre:\1-->/g, "");
  // Trang tĩnh /album/<id>/index.html = shell + SEO riêng + nội dung thật trong #app
  function buildAlbumPage(shell, ctx) {
    const re = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, mount = '<div id="app" class="page"></div>';
    if (!re.test(shell)) throw new Error("album/index.html thiếu cặp <!-- seo:start --> / <!-- seo:end -->");
    const clean = stripPrerender(shell);
    if (!clean.includes(mount)) throw new Error('album/index.html không có <div id="app" class="page"></div>');
    return clean.replace(re, () => headFor(ctx)).replace(mount, () => `<div id="app" class="page">${bodyAlbum(ctx)}</div>`);
  }

  // Dòng trong sitemap cho /album/ và các album đã có ảnh
  const allUrls = (seo, idx) => { const list = listed(idx); return list.length ? [{ loc: site(seo) + "/album/", lastmod: list.map((x) => x.last).filter(Boolean).sort().pop() || "" }].concat(list.map((al) => ({ loc: site(seo) + url(al.id), lastmod: al.last }))) : []; };

  return { HUB, t, a, url, imgUrl, slugOk, normalize, imagesOf, find, listed, card, photo, bodyHub, bodyAlbum, ldFor, headFor, stripPrerender, buildAlbumPage, allUrls };
});
