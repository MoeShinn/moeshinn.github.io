/* Sinh trang tĩnh cho bài viết: /post/<id>/, link rút gọn /s/<mã>/, sitemap.xml, robots.txt. */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.PostGen = factory(); })(typeof window !== "undefined" ? window : this, function () {
  const C = globalThis.crypto || require("crypto").webcrypto;
  const ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const a = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const jsonSafe = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
  const rndInt = (n) => { const b = new Uint32Array(1), lim = 4294967296 - (4294967296 % n); let x; do { C.getRandomValues(b); x = b[0]; } while (x >= lim); return x % n; };

  const slugify = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "") || "bai-viet";
  const uniq = (make, used) => { let v; do { v = make(); } while (used.has(v)); return v; };
  // id = slug tiêu đề + "-" + 9 chữ số ngẫu nhiên, không trùng id đang có
  const newPostId = (title, used = new Set()) => uniq(() => slugify(title) + "-" + Array.from({ length: 9 }, () => rndInt(10)).join(""), used);
  // mã rút gọn 10 ký tự a-z A-Z 0-9, không trùng
  const newShortCode = (used = new Set(), len = 10) => { const n = Math.min(24, Math.max(4, Math.round(Number(len)) || 10)); return uniq(() => Array.from({ length: n }, () => ALNUM[rndInt(62)]).join(""), used); };

  const excerpt = (md, max = 155) => {
    const s = String(md || "").replace(/<[^>]*>/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/&[0-9a-fk-or]/gi, "").replace(/[#*_`>~-]+/g, " ").replace(/\s+/g, " ").trim();
    return s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  };
  const isoDate = (d) => { const m = String(d || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };
  const site = (seo) => seo.siteUrl.replace(/\/$/, "");
  const postUrl = (seo, id) => `${site(seo)}/post/${encodeURIComponent(id)}/`;
  const imageUrl = (seo, photo) => !photo ? (seo.ogImage || "") : /^https?:/.test(photo) ? photo : site(seo) + (photo.startsWith("/") ? "" : "/post/") + photo;

  function buildPostPage(shell, { id, meta, bodyMd, bodyHtml, seo, updated, visibility }) {
    const url = postUrl(seo, id), name = seo.siteName;
    const title = meta.title ? `${meta.title} — ${name}` : `${name} — Blog`;
    const kw = String(meta.keywords || "").split(",").map((s) => s.trim()).filter(Boolean).join(", ");
    const desc = meta.description || excerpt(bodyMd, 155), img = imageUrl(seo, meta.photo), f = seo.favicon;
    const ld = { "@context": "https://schema.org", "@type": "BlogPosting", headline: meta.title || "", description: desc, url, mainEntityOfPage: url, inLanguage: "vi", author: { "@type": "Person", name } };
    if (isoDate(meta.date)) ld.datePublished = isoDate(meta.date);
    if (isoDate(updated)) ld.dateModified = isoDate(updated);
    if (img) ld.image = img; if (kw) ld.keywords = kw;
    const L = ["<!-- seo:start -->", `<title>${t(title)}</title>`, `<meta name="description" content="${a(desc)}" />`];
    if (kw) L.push(`<meta name="keywords" content="${a(kw)}" />`);
    if (visibility === "unlisted") L.push(`<meta name="robots" content="noindex" />`); // không liệt kê → không cho Google lập chỉ mục
    L.push(`<link rel="canonical" href="${a(url)}" />`, `<meta property="og:type" content="article" />`, `<meta property="og:site_name" content="${a(name)}" />`,
      `<meta property="og:title" content="${a(meta.title || title)}" />`, `<meta property="og:description" content="${a(desc)}" />`, `<meta property="og:url" content="${a(url)}" />`);
    if (img) L.push(`<meta property="og:image" content="${a(img)}" />`);
    L.push(`<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />`, `<link rel="icon" type="image/png" sizes="32x32" href="${a(f.icon)}" />`);
    if (f.v) L.push(`<link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon/favicon-192.png?v=${a(f.v)}" />`);
    if (f.apple) L.push(`<link rel="apple-touch-icon" href="${a(f.apple)}" />`);
    L.push(`<script type="application/ld+json" id="post-jsonld">${jsonSafe(ld)}</script>`, "<!-- seo:end -->");
    const re = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, mount = '<div id="app" class="page"></div>';
    if (!re.test(shell)) throw new Error("post/index.html thiếu cặp <!-- seo:start --> / <!-- seo:end -->");
    if (!shell.includes(mount)) throw new Error('post/index.html không có <div id="app" class="page"></div>');
    const article = `<article class="post-article"><h1 class="post-title">${t(meta.title)}</h1><div class="post-body">${bodyHtml}</div></article>`;
    return shell.replace(re, () => L.join("\n  ")).replace(mount, () => `<div id="app" class="page">${article}</div>`);
  }

  function buildShortPage({ id, meta, desc, seo, base = "post", target: custom }) {
    const target = custom || `${site(seo)}/${base}/${encodeURIComponent(id)}/`, img = imageUrl(seo, meta.photo);
    return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t(meta.title)}</title><meta name="robots" content="noindex" /><link rel="canonical" href="${a(target)}" />
<meta http-equiv="refresh" content="0;url=${a(target)}" />
<meta property="og:type" content="article" /><meta property="og:title" content="${a(meta.title)}" /><meta property="og:description" content="${a(desc)}" /><meta property="og:url" content="${a(target)}" />${img ? `<meta property="og:image" content="${a(img)}" />` : ""}
<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />
<script>location.replace(${jsonSafe(target)});</script></head>
<body><p><a href="${a(target)}">Đang chuyển đến bài viết…</a></p></body></html>
`;
  }

  function buildDownloadPage(shell, { id, data, seo }) {
    const url = `${site(seo)}/download/${encodeURIComponent(id)}/`, name = seo.siteName, f = seo.favicon, base = seo.pages.download;
    const heading = data.title || "Tải xuống", title = `${heading} — ${name}`;
    const desc = data.description || `Tải xuống ${heading}`, kw = String(data.keywords || base.keywords || "").split(",").map((s) => s.trim()).filter(Boolean).join(", ");
    const img = imageUrl(seo, data.photo);
    const L = ["<!-- seo:start -->", `<title>${t(title)}</title>`, `<meta name="description" content="${a(desc)}" />`];
    if (kw) L.push(`<meta name="keywords" content="${a(kw)}" />`);
    L.push(`<link rel="canonical" href="${a(url)}" />`, `<meta property="og:type" content="website" />`, `<meta property="og:site_name" content="${a(name)}" />`, `<meta property="og:title" content="${a(title)}" />`, `<meta property="og:description" content="${a(desc)}" />`, `<meta property="og:url" content="${a(url)}" />`);
    if (img) L.push(`<meta property="og:image" content="${a(img)}" />`);
    L.push(`<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />`, `<link rel="icon" type="image/png" sizes="32x32" href="${a(f.icon)}" />`);
    if (f.v) L.push(`<link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon/favicon-192.png?v=${a(f.v)}" />`);
    if (f.apple) L.push(`<link rel="apple-touch-icon" href="${a(f.apple)}" />`);
    L.push("<!-- seo:end -->");
    const re = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, mount = '<div id="app" class="page"></div>';
    if (!re.test(shell)) throw new Error("download/index.html thiếu cặp <!-- seo:start --> / <!-- seo:end -->");
    if (!shell.includes(mount)) throw new Error('download/index.html không có <div id="app" class="page"></div>');
    const pre = `<div class="download-card"><h1 class="download-title">${t(heading)}</h1><p class="download-hint">${t(desc)}</p></div>`;
    return shell.replace(re, () => L.join("\n  ")).replace(mount, () => `<div id="app" class="page">${pre}</div>`);
  }

  // ---- Link rút gọn tự đặt: /s/<id> -> bất kỳ đường dẫn trong web hoặc link ngoài ----
  const LINK_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{1,59}$/;
  function resolveTarget(seo, raw) {
    const s = String(raw || "").trim();
    if (/^\/(?!\/)/.test(s)) return { ok: true, url: site(seo) + s };
    try { const u = new URL(s); if (u.protocol === "https:" || u.protocol === "http:") return { ok: true, url: u.href }; } catch (e) { /* rơi xuống lỗi */ }
    return { ok: false, error: "Đích phải là đường dẫn trong web (bắt đầu bằng /) hoặc link http(s)://" };
  }
  // taken: Set id đã dùng, viết thường (Windows/macOS không phân biệt hoa/thường nên tránh trùng kiểu "Music" và "music")
  const linkIdError = (id, taken) => !LINK_ID.test(id) ? "ID gồm 2–60 ký tự: chữ, số, - hoặc _ (không dấu, không khoảng trắng)" : taken.has(id.toLowerCase()) ? "ID này đã được dùng" : "";
  function buildLinkPage(link, seo) {
    const r = resolveTarget(seo, link.url);
    if (!r.ok) throw new Error(`Link "${link.id}": ${r.error}`);
    return buildShortPage({ target: r.url, meta: { title: link.title || link.id, photo: link.image }, desc: link.description || "", seo });
  }

  // ---- Frontmatter: bộ đọc của /post không chấp nhận dấu " bên trong giá trị nên đổi sang ” ----
  const fmVal = (s) => String(s ?? "").replace(/"/g, "”").replace(/\s*\n\s*/g, " ").trim();
  const buildMarkdown = (m, body) => ["---", `title: "${fmVal(m.title)}"`, m.photo && `photo: "${fmVal(m.photo)}"`, `date: "${fmVal(m.date)}"`,
    m.keywords && `keywords: "${fmVal(m.keywords)}"`, m.description && `description: "${fmVal(m.description)}"`, m.comments === false && "comments: off", "---"]
    .filter(Boolean).join("\n") + "\n" + String(body).replace(/\r\n/g, "\n").trim() + "\n";
  const todayDMY = () => { const d = new Date(); return [d.getDate(), d.getMonth() + 1].map((n) => String(n).padStart(2, "0")).concat(d.getFullYear()).join("/"); };

  function buildSitemap(seo, posts, downloads = []) {
    const u = [["/", ""], ["/post/", ""], ["/channel/", ""], ["/donate/", ""]]
      .concat(downloads.map((id) => [`/download/${encodeURIComponent(id)}/`, ""]))
      .concat(posts.filter((p) => !p.visibility || p.visibility === "public").map((p) => [`/post/${encodeURIComponent(p.id)}/`, isoDate(p.updated || p.date)]));
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      u.map(([p, d]) => `  <url><loc>${t(site(seo) + p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`).join("\n") + `\n</urlset>\n`;
  }
  const buildRobots = (seo) => `User-agent: *\nDisallow: /admin/\n\nSitemap: ${site(seo)}/sitemap.xml\n`;

  return { slugify, newPostId, newShortCode, excerpt, isoDate, buildPostPage, buildDownloadPage, buildShortPage, buildMarkdown, todayDMY, resolveTarget, linkIdError, buildLinkPage, buildSitemap, buildRobots };
});
