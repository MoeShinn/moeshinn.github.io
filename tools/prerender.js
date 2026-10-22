#!/usr/bin/env node
/* tools/prerender.js — dựng sẵn nội dung THẬT vào HTML tĩnh để bot/AI không chạy JS vẫn đọc được.

   Vấn đề: web này vẽ nội dung bằng JS (fetch data.json rồi dựng DOM) và HTML gốc chỉ có màn hình chờ
   "Trang của bạn đang được tải". Bot/AI (Gemini, ChatGPT, Perplexity…) thường chỉ đọc HTML gốc nên
   chỉ thấy đúng câu đó.

   Script này (không cần cài gì, chỉ cần Node 18+):
     1. Gỡ markup màn hình chờ khỏi mọi trang HTML (js/loading.js tự dựng overlay cho người dùng thật).
     2. Điền sẵn vào HTML: menu, avatar + tên + các nút trang chủ, trang Kênh, trang Donate,
        danh sách bài ở /post/, JSON-LD (WebSite + Person) ở trang chủ.
     3. Tạo llms.txt (mục lục dạng văn bản cho các công cụ AI).
   3b. Dựng lại trang tĩnh /post/<id>/ từ post/data/<id>.md (dùng chung admin/js/postgen.js + post/js/render.js) để sửa bộ render
       là mọi bài cũ tự cập nhật theo, không phải mở admin bấm lưu lại từng bài; dựng danh sách /download/ từ download/data/*.json.
     4. Trang Sản phẩm: dựng sẵn HTML thật (+ SEO, JSON-LD) cho /product/ và từng /product/<id>/ từ product/data.json,
        dọn thư mục mục đã xóa, và giữ các địa chỉ /product/… trong sitemap.xml (dùng chung product/js/productgen.js với admin).

   Chạy:   node tools/prerender.js           (ghi file)
           node tools/prerender.js --check   (không ghi; thoát mã 1 nếu có file cần cập nhật)

   Nội dung dựng sẵn nằm giữa cặp chú thích <!--pre:tên-->…<!--/pre:tên--> — chạy lại bao nhiêu lần cũng
   được, script chỉ thay phần giữa hai chú thích. JS của từng trang vẫn dựng lại bản động như cũ. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const PG = require("../product/js/productgen.js");
const AG = require("../assets/album/albumgen.js");
const POSTGEN = require("../admin/js/postgen.js");

const ROOT = path.resolve(__dirname, "..");
const CHECK = process.argv.includes("--check");

/* ---------------- Tiện ích ---------------- */
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const json = (p, d) => { try { return JSON.parse(rd(p)); } catch (e) { return d; } };
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const t = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const a = (s) => t(s).replace(/"/g, "&quot;");
const ld = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
// "/channel/index.html" -> "/channel/" ; "/index.html" -> "/"
const clean = (u) => String(u || "").replace(/(^|\/)index\.html$/, "$1");
// Chỉ cho http(s), mailto, tel hoặc đường dẫn nội bộ; "channel" -> "/channel/" (giống js/main.js)
function safeHref(url) {
  let u = String(url || "").trim();
  if (/^[a-z0-9][a-z0-9_-]*$/i.test(u)) u = "/" + u + "/";
  const probe = u.replace(/[\u0000-\u0020\u007f]/g, "");
  if (/^[a-z][a-z0-9+.-]*:/i.test(probe) && !/^(https?|mailto|tel):/i.test(probe)) return "#";
  return u;
}
// avatar-336.webp có bản nhỏ avatar-168.webp (nếu tồn tại) → srcset: màn 1x tải bản 168px, màn 2x tải bản 336px
const srcsetFor = (u) => { const s = String(u || ""), sm = s.replace(/-336(\.webp)$/, "-168$1"); return sm !== s && exists(sm.replace(/^\//, "")) ? ` srcset="${a(sm)} 1x, ${a(s)} 2x"` : ""; };
const label = (l) => (l && typeof l === "object" ? l.vi || l.en || Object.values(l)[0] || "" : l || "");
const parseDMY = (s) => { const m = String(s || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : 0; };
const isoDate = (s) => { const m = String(s || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };

/* Chèn / thay khối dựng sẵn ngay SAU `anchor` (chuỗi hoặc RegExp). Lần đầu: tạo cặp chú thích; các lần sau: thay phần giữa. */
function slotAfter(html, anchor, name, content) {
  const src = anchor instanceof RegExp ? anchor.source : escRe(anchor);
  const re = new RegExp(`(${src})(?:<!--pre:${name}-->[\\s\\S]*?<!--/pre:${name}-->)?`);
  if (!re.test(html)) return html;
  return html.replace(re, (_m, head) => `${head}<!--pre:${name}-->${content}<!--/pre:${name}-->`);
}

/* ---------------- Dữ liệu ---------------- */
const data = json("data.json", {});
const settings = json("site-settings.json", {});
const channel = json("channel/data.json", { links: [] });
const donate = json("donate/data.json", { methods: [] });
const siteLinks = json("site-links.json", []);
const posts = json("post/data/posts.json", []);
const seo = settings.seo || {};
const SITE = String(seo.siteUrl || "https://shinjuvn.github.io").replace(/\/$/, "");
const SITE_NAME = seo.siteName || (data.profile && data.profile.name) || "Shinju Ch.";
const profile = data.profile || {};
const avatar = profile.avatar || "/assets/avatar/avatar.webp";
const homeDesc = (seo.pages && seo.pages.home && seo.pages.home.description) || "";

// post/js/render.js (không đụng DOM) → renderPostBody dùng chung để dựng phần mô tả sản phẩm giống hệt trang công khai
const RENDER = (() => {
  try { const ctx = {}; vm.createContext(ctx); vm.runInContext(rd("post/js/render.js"), ctx); return { renderPostBody: ctx.renderPostBody, parseFrontmatter: ctx.parseFrontmatter }; } catch (e) { return { renderPostBody: (x) => String(x || ""), parseFrontmatter: (raw) => ({ meta: {}, body: raw }) }; }
})();
const renderPostBody = RENDER.renderPostBody;

/* ---- Sản phẩm: cây mục ở product/data.json, chi tiết ở product/data/<id>.json ---- */
const productIdx = json("product/data.json", { nodes: [] });
const pnodes = Array.isArray(productIdx.nodes) ? productIdx.nodes : [];
const pdetails = Object.fromEntries(pnodes.map((n) => [n.id, json(`product/data/${n.id}.json`, {})]));
const phub = { title: productIdx.title, intro: productIdx.intro };
const pseo = { ...seo, siteUrl: SITE, siteName: SITE_NAME, favicon: seo.favicon || {}, ogImage: seo.ogImage || "" };
const VFS = {}; // trang tĩnh được tạo ra trong lần chạy này (chưa nằm trên đĩa)
if (pnodes.length && exists("product/index.html")) {
  const shell = rd("product/index.html");
  pnodes.forEach((n) => {
    const d = pdetails[n.id] || {};
    const bodyHtml = !PG.isCat(n) && d.body ? renderPostBody(d.body) : "";
    VFS[`product/${n.id}/index.html`] = PG.buildNodePage(shell, { seo: pseo, node: n, nodes: pnodes, details: pdetails, bodyHtml, hub: phub });
  });
}
// Thư mục /product/<id>/ không còn trong dữ liệu (mục đã xóa) → dọn, nhưng chỉ khi trong đó chỉ có index.html
const orphans = !exists("product") ? [] : fs.readdirSync(path.join(ROOT, "product"), { withFileTypes: true })
  .filter((e) => e.isDirectory() && !PG.RESERVED.includes(e.name) && !pnodes.some((n) => n.id === e.name))
  .filter((e) => fs.readdirSync(path.join(ROOT, "product", e.name)).every((f) => f === "index.html")).map((e) => `product/${e.name}`);

/* ---- Album: ảnh ở image/index.json (admin "Kho ảnh"), album = trường "album" của từng ảnh → /album/ và /album/<id>/ ---- */
const albumIdx = AG.normalize(json("image/index.json", { albums: [], images: [] }));
if (exists("album/index.html")) {
  const ashell = rd("album/index.html");
  albumIdx.albums.forEach((al) => { VFS[`album/${al.id}/index.html`] = AG.buildAlbumPage(ashell, { seo: pseo, idx: albumIdx, album: al }); });
}
// Thư mục /album/<id>/ không còn trong dữ liệu (album đã xóa) → dọn, nhưng chỉ khi trong đó chỉ có index.html
if (exists("album")) {
  fs.readdirSync(path.join(ROOT, "album"), { withFileTypes: true })
    .filter((e) => e.isDirectory() && !albumIdx.albums.some((al) => al.id === e.name))
    .filter((e) => fs.readdirSync(path.join(ROOT, "album", e.name)).every((f) => f === "index.html")).forEach((e) => orphans.push(`album/${e.name}`));
}

/* ---- Bài đăng: dựng lại /post/<id>/ (giống hệt admin "Lưu bài" nhưng chạy tự động) ---- */
if (exists("post/index.html")) {
  const pshell = rd("post/index.html");
  posts.filter((p) => p.visibility !== "private" && exists(`post/data/${p.id}.md`)).forEach((p) => {
    try {
      const { meta, body } = RENDER.parseFrontmatter(rd(`post/data/${p.id}.md`));
      VFS[`post/${p.id}/index.html`] = POSTGEN.buildPostPage(pshell, { id: p.id, meta, bodyMd: body, bodyHtml: renderPostBody(body), seo: pseo, updated: p.updated, visibility: p.visibility });
    } catch (e) { console.warn(`Bỏ qua bài ${p.id}: ${e.message}`); }
  });
}

/* ---- Tải xuống: danh sách cho /download/ (trang từng mục /download/<id>/ do admin tạo) ---- */
const downloads = (exists("download/data") ? fs.readdirSync(path.join(ROOT, "download/data")).filter((f) => f.endsWith(".json")).sort() : [])
  .map((f) => { const id = f.replace(/\.json$/, ""), d = json(`download/data/${f}`, {}); return { id, title: d.title || id, description: d.description || "", createdAt: d.createdAt || "" }; })
  .filter((d) => exists(`download/${d.id}/index.html`))
  .sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));

// js/icons.js gán window.MEDIA_ICONS → chạy trong sandbox để lấy màu nền từng nền tảng
const ICONS = (() => {
  try { const w = {}; vm.runInNewContext(rd("js/icons.js"), { window: w }); return w.MEDIA_ICONS || {}; } catch (e) { return {}; }
})();

const publicPosts = posts
  .filter((p) => !p.visibility || p.visibility === "public")
  .sort((x, y) => parseDMY(y.date) - parseDMY(x.date));

function frontmatter(id) {
  try {
    const m = rd(`post/data/${id}.md`).match(/^\s*---\s*\n([\s\S]*?)\n---/);
    const out = {};
    if (m) m[1].split("\n").forEach((l) => { const k = l.match(/^(\w+):\s*"?(.*?)"?\s*$/); if (k) out[k[1]] = k[2]; });
    return out;
  } catch (e) { return {}; }
}

/* ---------------- Khối nội dung ---------------- */
const navPages = (data.nav && data.nav.pages) || [{ label: "Trang chủ", url: "/" }];
const navHtml = navPages.map((p) => `<a href="${a(clean(p.url))}" role="menuitem">${t(p.label)}</a>`).join("");

// Màu nút + tách emoji đầu nhãn: giữ đồng bộ với js/main.js.
const BTN_COLORS = ["blue", "green", "red", "orange", "yellow", "purple", "pink", "teal", "gray", "black", "white"];
function btnColor(style) {
  const s = String(style || "").trim().toLowerCase(), m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!m) return { cls: BTN_COLORS.includes(s) ? s : "blue", css: "" };
  const h = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1], n = parseInt(h, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const dk = (x) => Math.round(x * 0.7).toString(16).padStart(2, "0");
  // Chọn màu chữ theo độ tương phản WCAG, tính tại giữa nút (màu giữa c1 và c2 ≈ 85% c1): chữ tối (#1a2433) hay trắng, bên nào rõ hơn.
  const lin = (x) => { x = (x * 0.85) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b), dark = (L + 0.05) / 0.068 > 1.05 / (L + 0.05);
  return { cls: "custom" + (dark ? " light" : ""), css: `--c1:#${h};--c2:#${dk(r)}${dk(g)}${dk(b)}` };
}
/* Emoji đứng đầu nhãn (vd "💰 Donate") → tách ra cột icon để chữ luôn căn giữa. Không tách nếu nhãn chỉ có emoji. */
function splitLeadEmoji(label) {
  const m = /^\s*(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s*([\s\S]*)$/u.exec(String(label || ""));
  return m && m[2].trim() ? { icon: m[1], text: m[2].trim() } : { icon: "", text: String(label || "") };
}
const homeButtons = (data.buttons || []).map((b) => {
  const c = btnColor(b.style);
  const lead = b.icon ? { icon: "", text: label(b.label) } : splitLeadEmoji(label(b.label)); // có icon SVG thì giữ nguyên nhãn
  return `<a class="link-btn ${c.cls}"${c.css ? ` style="${c.css}"` : ""} href="${a(safeHref(b.url))}"><span class="link-icon" aria-hidden="true">${t(lead.icon)}</span><span>${t(lead.text)}</span></a>`;
}).join("");

function channelButton(l) {
  const def = ICONS[l.icon || l.id] || {};
  const u = String(l.url || "").trim();
  const href = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u) ? "mailto:" + u : safeHref(u);
  const ext = href.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener noreferrer"';
  return `<a class="link-btn" href="${a(href)}"${ext}${def.bg ? ` style="background:${a(def.bg)}"` : ""}><span class="link-icon"></span><span class="link-text">${t(l.label || "")}</span></a>`;
}
const usable = (channel.links || []).filter((l) => l.visible !== false && l.url && ICONS[l.icon || l.id]);
const channelHtml = usable.filter((l) => l.group !== "contact").map(channelButton).join("") +
  (usable.some((l) => l.group === "contact") ? `<h2 class="link-section-title">Liên hệ</h2>` + usable.filter((l) => l.group === "contact").map(channelButton).join("") : "");

const donateHtml = (donate.methods || []).filter((m) => m.visible !== false).map((m) => {
  const btns = (m.buttons || []).filter((b) => b.visible !== false);
  if (!btns.length) return "";
  const row = btns.map((b) => b.type === "link" && b.url
    ? `<a class="donate-btn" href="${a(safeHref(b.url))}" target="_blank" rel="noopener noreferrer">${t(b.label || "Donate")}</a>`
    : `<button type="button" class="donate-btn">${t(b.label || "Donate")}</button>`).join("");
  return `<div class="method"><div class="method-label">${t(m.label)}</div><div class="donate-btn-row">${row}</div></div>`;
}).join("");

const photoUrl = (p) => (!p ? "" : /^(https?:)?\/\/|^\//.test(p) ? p : "/post/" + p);
const postCard = (p) =>
  `<a class="post-card" href="/post/${encodeURIComponent(p.id)}/"><div class="post-card-photo">` +
  (p.photo ? `<img src="${a(photoUrl(p.photo))}" alt="${a(p.title)}" loading="lazy" />` : "") +
  `</div><div class="post-card-body"><h3 class="post-card-title">${t(p.title)}</h3><div class="post-card-meta"><span>${t(p.date || "")}</span></div></div></a>`;
const postListHtml = `<div class="page" data-prerender><header class="blog-title-bar"><h1>${t(SITE_NAME)}</h1></header>` +
  `<section class="post-section"><h2>📝 Bài đăng</h2><div class="post-grid">${publicPosts.map(postCard).join("")}</div></section></div>`;

const productListHtml = `<div class="page" data-prerender>${PG.bodyHub({ nodes: pnodes, hub: phub })}</div>`;
const productLd = `<script type="application/ld+json" id="product-jsonld">${ld(PG.ldFor({ seo: pseo, node: null, nodes: pnodes, details: {}, hub: phub }))}</script>`;
const albumListHtml = AG.bodyHub({ idx: albumIdx });
const albumLd = `<script type="application/ld+json" id="album-jsonld">${ld(AG.ldFor({ seo: pseo, idx: albumIdx, album: null }))}</script>`;

const downloadListHtml = `<div class="download-card download-index" data-prerender><h1 class="download-title">Tải xuống</h1>` +
  (downloads.length ? `<p class="download-hint">Chọn một mục để xem chi tiết và tải về.</p><ul class="download-list">${downloads.map((d) =>
    `<li><a class="download-item" href="/download/${encodeURIComponent(d.id)}/"><span class="download-item-title">${t(d.title)}</span>${d.description ? `<span class="download-item-desc">${t(d.description)}</span>` : ""}</a></li>`).join("")}</ul>`
    : `<p class="download-hint">Chưa có mục tải xuống nào.</p>`) + `</div>`;

const sameAs = [...new Set([
  ...(channel.links || []).filter((l) => l.visible !== false).map((l) => l.url),
  ...siteLinks.map((l) => l.url),
].filter((u) => /^https?:\/\//i.test(String(u || ""))))];
const handle = ((data.footer || "").match(/@([A-Za-z0-9_.]+)/) || [])[1];
const jsonLd = `<script type="application/ld+json" id="home-jsonld">${ld({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": SITE + "/#website", url: SITE + "/", name: SITE_NAME, inLanguage: "vi", ...(homeDesc ? { description: homeDesc } : {}) },
    { "@type": "Person", "@id": SITE + "/#person", name: profile.name || SITE_NAME, ...(handle ? { alternateName: handle } : {}), url: SITE + "/",
      image: /^https?:/.test(avatar) ? avatar : SITE + avatar, ...(sameAs.length ? { sameAs } : {}) },
  ],
})}</script>`;

/* ---------------- CSS dùng chung, nhúng thẳng vào <head> trang chủ (bỏ 3 yêu cầu chặn hiển thị) ---------------- */
const cssMin = (c) => c.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{};,>])\s*/g, "$1").replace(/:\s+/g, ":").replace(/;}/g, "}").trim();
// Tấm màn tối che trang trong lúc js/loading.js (defer) chưa dựng xong màn hình chờ; js/loading.js gỡ class sl-wait.
const CURTAIN = "html.sl-wait::after{content:\"\";position:fixed;inset:0;z-index:9998;background:#050b16}";
const inlineCss = () => `<style>${["css/loading.css", "css/header.css", "css/style.css"].filter(exists).map((f) => cssMin(rd(f))).join("")}${CURTAIN}</style>`;

/* ---------------- Áp dụng cho từng trang ---------------- */
const OVERLAY = /[ \t]*<!--\s*Shared loading screen[^>]*-->\s*|[ \t]*<div id="site-loading" class="site-loading">[\s\S]*?<div class="site-loading-fill"><\/div><\/div>\s*<\/div>\s*<\/div>\s*/g;

function transform(rel, html) {
  html = html.replace(OVERLAY, "\n  "); // 1) gỡ màn hình chờ khỏi HTML tĩnh

  // 2) header dùng chung: logo → "/", menu dựng sẵn
  html = html.replace(/<a href="[^"]*" class="site-header-logo"/, '<a href="/" class="site-header-logo"');
  html = html.replace(/<img src="[^"]*" alt="[^"]*"(?: width="\d+" height="\d+"(?: srcset="[^"]*")?)? data-nav-logo \/>/, `<img src="${a((data.nav && data.nav.logo) || avatar)}" alt="${a(SITE_NAME)}" width="36" height="36"${srcsetFor((data.nav && data.nav.logo) || avatar)} data-nav-logo />`);
  html = slotAfter(html, '<nav class="site-header-menu" data-nav-menu role="menu">', "nav", navHtml);

  if (rel === "index.html") {
    html = html.replace(/<img data-avatar src="[^"]*" alt="[^"]*"(?: width="\d+" height="\d+" fetchpriority="high"(?: srcset="[^"]*")?)? \/>/, `<img data-avatar src="${a(avatar)}" alt="${a(profile.name || SITE_NAME)}" width="168" height="168" fetchpriority="high"${srcsetFor(avatar)} />`);
    html = html.replace(/(<h1 class="display-name" data-name>)[^<]*(<\/h1>)/, (_m, h, c) => h + t(profile.name || SITE_NAME) + c);
    html = slotAfter(html, /<h1 class="display-name" data-name>[^<]*<\/h1>/, "tagline", homeDesc ? `<p class="site-tagline">${t(homeDesc)}</p>` : "");
    html = slotAfter(html, '<div class="link-list" data-link-list>', "links", homeButtons);
    html = slotAfter(html, "<!-- seo:end -->", "jsonld", jsonLd);
    html = slotAfter(html, "<!--/pre:jsonld-->", "css", inlineCss());
  } else if (rel === "channel/index.html") {
    html = html.replace(/<img data-avatar src="[^"]*" alt="[^"]*"(?: width="\d+" height="\d+" fetchpriority="high"(?: srcset="[^"]*")?)? \/>/, `<img data-avatar src="${a(avatar)}" alt="${a(profile.name || SITE_NAME)}" width="168" height="168" fetchpriority="high"${srcsetFor(avatar)} />`);
    html = html.replace(/(<h1 class="display-name" data-name>)[^<]*(<\/h1>)/, (_m, h, c) => h + t(profile.name || SITE_NAME) + c);
    html = slotAfter(html, '<div class="link-list" data-link-list>', "links", channelHtml);
  } else if (rel === "donate/index.html") {
    if (donate.title) html = html.replace(/(<h1 class="page-title" data-title>)[^<]*(<\/h1>)/, (_m, h, c) => h + t(donate.title) + c);
    html = slotAfter(html, '<div class="method-list" data-method-list>', "methods", donateHtml);
  } else if (rel === "post/index.html") {
    html = slotAfter(html, '<script src="/js/site-chrome.js"></script>', "postlist", postListHtml);
  } else if (rel === "product/index.html") {
    html = slotAfter(html, '<script src="/js/site-chrome.js"></script>', "productlist", productListHtml);
    html = slotAfter(html, "<!-- seo:end -->", "jsonld", productLd);
    // Chưa có sản phẩm nào → trang hub rỗng (nội dung mỏng): báo noindex. Có sản phẩm → tự gỡ. (Đặt SAU khối jsonld để slot jsonld không bị chen ngang.)
    html = slotAfter(html, "<!--/pre:jsonld-->", "robots", pnodes.length ? "" : '<meta name="robots" content="noindex, follow" />');
  } else if (rel === "download/index.html") {
    html = slotAfter(html, '<div id="app" class="page">', "downloadlist", downloadListHtml);
  } else if (rel === "album/index.html") {
    html = slotAfter(html, '<div id="app" class="page">', "albumlist", albumListHtml);
    html = slotAfter(html, "<!-- seo:end -->", "jsonld", albumLd);
  }
  return html;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) { if (!/^(admin|s|\.git|\.github|node_modules|tools)$/.test(e.name) || dir) walk(rel, out); continue; }
    if (e.name.endsWith(".html")) out.push(rel);
  }
  return out;
}

/* ---------------- llms.txt ---------------- */
function buildLlms() {
  const L = [`# ${SITE_NAME}`, ""];
  if (homeDesc) L.push(`> ${homeDesc}`, "");
  L.push("## Trang chính", "");
  navPages.forEach((p) => {
    const u = clean(p.url);
    L.push(`- [${p.label}](${SITE}${u.startsWith("/") ? u : "/" + u})`);
  });
  if (publicPosts.length) {
    L.push("", "## Bài đăng", "");
    publicPosts.forEach((p) => {
      const fm = frontmatter(p.id), desc = fm.description ? `: ${fm.description}` : "";
      L.push(`- [${p.title}](${SITE}/post/${encodeURIComponent(p.id)}/)${isoDate(p.date) ? ` (${isoDate(p.date)})` : ""}${desc}`);
    });
  }
  if (pnodes.length) {
    L.push("", "## Sản phẩm", "");
    const line = (pid, depth) => PG.children(pnodes, pid).forEach((n) => {
      const d = pdetails[n.id] || {};
      L.push(`${"  ".repeat(depth)}- [${n.title}](${SITE}${PG.url(n.id)})${PG.isCat(n) ? " (danh mục)" : ""}${d.description ? `: ${d.description}` : ""}${d.price ? ` Giá: ${d.price}.` : ""}`);
      if (PG.isCat(n)) line(n.id, depth + 1);
    });
    line("", 0);
  }
  const alist = AG.listed(albumIdx);
  if (alist.length) {
    L.push("", "## Album ảnh", "");
    alist.forEach((al) => L.push(`- [${al.name}](${SITE}${AG.url(al.id)}): ${al.count} ảnh`));
  }
  if (downloads.length) {
    L.push("", "## Tải xuống", "");
    downloads.forEach((d) => L.push(`- [${d.title}](${SITE}/download/${encodeURIComponent(d.id)}/)${d.description ? `: ${d.description}` : ""}`));
  }
  return L.join("\n") + "\n";
}

/* ---------------- Chạy ---------------- */
const changed = [];
function put(rel, next) {
  const cur = exists(rel) ? rd(rel) : null;
  if (cur === next) return;
  changed.push(rel);
  if (!CHECK) { fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true }); fs.writeFileSync(path.join(ROOT, rel), next); }
}
// sitemap.xml do Worker admin-api viết lại mỗi lần admin commit (không biết trang Sản phẩm/Album, lại liệt kê cả ảnh) → ở đây:
//   • bỏ mọi địa chỉ KHÔNG phải trang HTML (ảnh .webp/.png…, /assets/…, trang xem ảnh /assets/viewer/ vốn là noindex, link rút gọn /s/, /admin/)
//   • bổ sung lại các địa chỉ /product/… và /album/…
//   • giữ /download/ (đã có trang danh sách thật) và bỏ nếu chưa có mục nào
const NON_PAGE = /\.(?:webp|png|jpe?g|gif|avif|svg|ico|mp4|webm|zip|exe|pdf|json|txt)(?:\?.*)?$/i;
function patchSitemap(xml) {
  const prefixes = [`${SITE}/product/`, `${SITE}/album/`];
  const dropPath = (loc) => NON_PAGE.test(loc) || ["/assets/", "/s/", "/admin/", "/image/"].some((d) => loc.startsWith(SITE + d));
  let out = xml.replace(/[ \t]*<url><loc>([^<]*)<\/loc>(?:<lastmod>[^<]*<\/lastmod>)?<\/url>\r?\n?/g, (m, loc) => (dropPath(loc) || (prefixes.some((p) => loc.startsWith(p)) && /\/$/.test(loc)) ? "" : m));
  if (!downloads.length) out = out.replace(new RegExp(`[ \\t]*<url><loc>${escRe(SITE)}/download/</loc>(?:<lastmod>[^<]*</lastmod>)?</url>\\r?\\n?`), "");
  else if (!out.includes(`<loc>${SITE}/download/</loc>`)) out = out.replace(/<\/urlset>/, () => `  <url><loc>${SITE}/download/</loc></url>\n</urlset>`);
  const urls = (pnodes.length ? PG.allUrls(pseo, pnodes) : []).concat(AG.allUrls(pseo, albumIdx));
  if (!urls.length) return out;
  const lines = urls.map((u) => `  <url><loc>${t(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>\n`).join("");
  return out.replace(/<\/urlset>/, () => lines + "</urlset>");
}
const pages = new Set(walk("").filter((r) => !orphans.some((o) => r.startsWith(o + "/"))));
Object.keys(VFS).forEach((k) => pages.add(k));
[...pages].filter((r) => !/^(404|offline|google[^/]*)\.html$/.test(r)).forEach((rel) => put(rel, transform(rel, rel in VFS ? VFS[rel] : rd(rel))));
orphans.forEach((o) => { changed.push(o + "/ (xóa)"); if (!CHECK) fs.rmSync(path.join(ROOT, o), { recursive: true, force: true }); });
put("llms.txt", buildLlms());
if (exists("sitemap.xml")) put("sitemap.xml", patchSitemap(rd("sitemap.xml")));

console.log(changed.length ? `${CHECK ? "Cần cập nhật" : "Đã cập nhật"} ${changed.length} file:\n  ` + changed.join("\n  ") : "Không có gì thay đổi — nội dung dựng sẵn đã khớp dữ liệu.");
if (CHECK && changed.length) process.exit(1);
