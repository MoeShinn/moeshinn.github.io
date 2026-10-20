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

   Chạy:   node tools/prerender.js           (ghi file)
           node tools/prerender.js --check   (không ghi; thoát mã 1 nếu có file cần cập nhật)

   Nội dung dựng sẵn nằm giữa cặp chú thích <!--pre:tên-->…<!--/pre:tên--> — chạy lại bao nhiêu lần cũng
   được, script chỉ thay phần giữa hai chú thích. JS của từng trang vẫn dựng lại bản động như cũ. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

const homeButtons = (data.buttons || []).map((b) =>
  `<a class="link-btn ${a(b.style || "")}" href="${a(safeHref(b.url))}"><span class="link-icon"></span><span>${t(label(b.label))}</span></a>`).join("");

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
  html = html.replace(/<img src="[^"]*" alt="[^"]*"(?: width="\d+" height="\d+")? data-nav-logo \/>/, `<img src="${a((data.nav && data.nav.logo) || avatar)}" alt="${a(SITE_NAME)}" width="36" height="36" data-nav-logo />`);
  html = slotAfter(html, '<nav class="site-header-menu" data-nav-menu role="menu">', "nav", navHtml);

  if (rel === "index.html") {
    html = html.replace(/<img data-avatar src="[^"]*" alt="[^"]*"(?: width="\d+" height="\d+" fetchpriority="high")? \/>/, `<img data-avatar src="${a(avatar)}" alt="${a(profile.name || SITE_NAME)}" width="168" height="168" fetchpriority="high" />`);
    html = html.replace(/(<h1 class="display-name" data-name>)[^<]*(<\/h1>)/, (_m, h, c) => h + t(profile.name || SITE_NAME) + c);
    html = slotAfter(html, /<h1 class="display-name" data-name>[^<]*<\/h1>/, "tagline", homeDesc ? `<p class="site-tagline">${t(homeDesc)}</p>` : "");
    html = slotAfter(html, '<div class="link-list" data-link-list>', "links", homeButtons);
    html = slotAfter(html, "<!-- seo:end -->", "jsonld", jsonLd);
    html = slotAfter(html, "<!--/pre:jsonld-->", "css", inlineCss());
  } else if (rel === "channel/index.html") {
    html = html.replace(/<img data-avatar src="[^"]*" alt="[^"]*"(?: width="\d+" height="\d+" fetchpriority="high")? \/>/, `<img data-avatar src="${a(avatar)}" alt="${a(profile.name || SITE_NAME)}" width="168" height="168" fetchpriority="high" />`);
    html = html.replace(/(<h1 class="display-name" data-name>)[^<]*(<\/h1>)/, (_m, h, c) => h + t(profile.name || SITE_NAME) + c);
    html = slotAfter(html, '<div class="link-list" data-link-list>', "links", channelHtml);
  } else if (rel === "donate/index.html") {
    if (donate.title) html = html.replace(/(<h1 class="page-title" data-title>)[^<]*(<\/h1>)/, (_m, h, c) => h + t(donate.title) + c);
    html = slotAfter(html, '<div class="method-list" data-method-list>', "methods", donateHtml);
  } else if (rel === "post/index.html") {
    html = slotAfter(html, '<script src="/js/site-chrome.js"></script>', "postlist", postListHtml);
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
  const dls = exists("download/data") ? fs.readdirSync(path.join(ROOT, "download/data")).filter((f) => f.endsWith(".json")) : [];
  if (dls.length) {
    L.push("", "## Tải xuống", "");
    dls.forEach((f) => {
      const id = f.replace(/\.json$/, ""), d = json(`download/data/${f}`, {});
      L.push(`- [${d.title || id}](${SITE}/download/${encodeURIComponent(id)}/)${d.description ? `: ${d.description}` : ""}`);
    });
  }
  return L.join("\n") + "\n";
}

/* ---------------- Chạy ---------------- */
const changed = [];
function put(rel, next) {
  const cur = exists(rel) ? rd(rel) : null;
  if (cur === next) return;
  changed.push(rel);
  if (!CHECK) fs.writeFileSync(path.join(ROOT, rel), next);
}
walk("").filter((r) => !/^(404|offline|google[^/]*)\.html$/.test(r)).forEach((rel) => put(rel, transform(rel, rd(rel))));
put("llms.txt", buildLlms());

console.log(changed.length ? `${CHECK ? "Cần cập nhật" : "Đã cập nhật"} ${changed.length} file:\n  ` + changed.join("\n  ") : "Không có gì thay đổi — nội dung dựng sẵn đã khớp dữ liệu.");
if (CHECK && changed.length) process.exit(1);
