/* product/js/productgen.js — bộ dựng HTML/SEO cho trang Sản phẩm, DÙNG CHUNG cho:
   • trang công khai (product/js/main.js) → dựng lại đúng cái HTML mà bot đã đọc,
   • /admin/product (đăng/sửa/xóa mục),
   • tools/prerender.js (GitHub Actions) → dựng sẵn nội dung THẬT vào HTML tĩnh cho Google / AI.
   Chỉ nhận dữ liệu và trả về chuỗi: không đụng DOM, chạy được cả trong trình duyệt lẫn Node.

   Dữ liệu (cây danh mục không giới hạn tầng):
   • product/data.json        { title?, intro?, nodes: [ { id, type: "category"|"product", parent: ""|<id>, title, thumb, order, updated } ] }
   • product/data/<id>.json   chi tiết từng mục: description, keywords, licenses[{title,text}]; sản phẩm thêm: price, body (Markdown-lite),
                               gallery[], buttons[{label,url,style}], comments:false
   Địa chỉ mọi mục đều phẳng: /product/<id>/ (id là slug duy nhất trên toàn cây). */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.ProductGen = factory(); })(typeof window !== "undefined" ? window : this, function () {
  const t = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const a = (s) => t(s).replace(/"/g, "&quot;");
  const jsonSafe = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
  const RESERVED = ["css", "js", "data", "index"]; // trùng tên thư mục con của /product/
  const HUB = "Sản phẩm";
  const site = (seo) => String(seo.siteUrl || "").replace(/\/$/, "");
  const url = (id) => `/product/${encodeURIComponent(id)}/`;
  const absUrl = (seo, u) => (!u ? "" : /^https?:\/\//i.test(u) ? u : site(seo) + (u.startsWith("/") ? u : "/" + u));
  const imgOk = (u) => /^(https?:\/\/|\/)/i.test(String(u || "").trim()) && !/^\/\//.test(String(u || "").trim());
  const imgSrc = (u) => (imgOk(u) ? String(u).trim() : "");
  const safeHref = (u) => { u = String(u || "").trim(); const p = u.replace(/[\u0000-\u0020\u007f]/g, ""); if (/^[a-z][a-z0-9+.-]*:/i.test(p) && !/^(https?|mailto|tel):/i.test(p)) return "#"; return u; };
  const isHttp = (u) => /^https?:\/\//i.test(String(u || ""));

  /* ---------------- Cây ---------------- */
  const isCat = (n) => n.type === "category";
  const byOrder = (x, y) => (isCat(y) - isCat(x)) || ((x.order ?? 0) - (y.order ?? 0)) || String(x.title).localeCompare(String(y.title), "vi"); // danh mục lên trước, rồi theo thứ tự
  const find = (nodes, id) => nodes.find((n) => n.id === id);
  const children = (nodes, pid) => nodes.filter((n) => (n.parent || "") === (pid || "")).sort(byOrder);
  function path(nodes, id) { const out = []; let n = find(nodes, id), g = 0; while (n && g++ < 60) { out.unshift(n); n = n.parent ? find(nodes, n.parent) : null; } return out; }
  function descendants(nodes, id) { const out = []; const walk = (p) => children(nodes, p).forEach((c) => { out.push(c); if (isCat(c)) walk(c.id); }); walk(id); return out; }
  const slugOk = (id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 60 && !RESERVED.includes(id);

  /* ---------------- Văn bản ---------------- */
  const excerpt = (s, max = 155) => { s = String(s || "").replace(/<[^>]*>/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/&[0-9a-fk-or]/gi, "").replace(/[#*_`>~-]+/g, " ").replace(/\s+/g, " ").trim(); return s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…"; };
  // văn bản thuần (chính sách, mô tả) → đoạn <p>, xuống dòng thành <br>
  const textHtml = (s) => String(s || "").replace(/\r\n/g, "\n").trim().split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${t(p.trim()).replace(/\n/g, "<br>")}</p>`).join("");

  /* ---------------- Chính sách / giấy phép (có thể nhiều khối: "giấy phép kép") ---------------- */
  // Mục không tự viết chính sách thì kế thừa từ danh mục gần nhất phía trên có viết.
  function resolveLicenses(nodes, details, id) {
    const own = ((details[id] || {}).licenses || []).filter((l) => l && (l.title || l.text));
    if (own.length) return { list: own, from: "" };
    const p = path(nodes, id).slice(0, -1).reverse();
    for (const n of p) { const l = ((details[n.id] || {}).licenses || []).filter((x) => x && (x.title || x.text)); if (l.length) return { list: l, from: n.title }; }
    return { list: [], from: "" };
  }
  const licenseHtml = ({ list, from }) => !list.length ? "" :
    `<section class="post-section product-license"><h2>📜 Chính sách &amp; giấy phép</h2>${from ? `<p class="product-note">Áp dụng theo danh mục “${t(from)}”.</p>` : ""}` +
    list.map((l) => `<div class="license-block">${l.title ? `<h3>${t(l.title)}</h3>` : ""}<div class="license-text">${textHtml(l.text)}</div></div>`).join("") + `</section>`;

  /* ---------------- Khối HTML ---------------- */
  const card = (n) => `<a class="post-card" data-type="${a(n.type)}" href="${a(url(n.id))}"><div class="post-card-photo">${imgSrc(n.thumb) ? `<img src="${a(imgSrc(n.thumb))}" alt="${a(n.title)}" loading="lazy" />` : ""}</div><div class="post-card-body"><h3 class="post-card-title">${t(n.title)}</h3></div></a>`;
  const grid = (list) => `<div class="post-grid">${list.map(card).join("") || '<p class="empty-msg">Chưa có mục nào.</p>'}</div>`;
  const crumbs = (nodes, id, hubTitle) => { const p = path(nodes, id); return `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/product/">${t(hubTitle || HUB)}</a>${p.map((n, i) => i === p.length - 1 ? `<span aria-current="page">${t(n.title)}</span>` : `<a href="${a(url(n.id))}">${t(n.title)}</a>`).join("")}</nav>`; };
  const BTN = { blue: "blue", green: "green", red: "red", gray: "gray" };

  // Nội dung trang /product/ (hub)
  function bodyHub({ nodes, hub = {} }) {
    return `<header class="blog-title-bar"><h1>${t(hub.title || HUB)}</h1></header>${hub.intro ? `<div class="product-desc">${textHtml(hub.intro)}</div>` : ""}<section class="post-section">${grid(children(nodes, ""))}</section>`;
  }
  // Nội dung trang một mục (danh mục hoặc sản phẩm). details: { id → chi tiết } đủ cho mục này và các danh mục cha (để kế thừa chính sách)
  function bodyNode({ node, nodes, details, bodyHtml = "", hub = {} }) {
    const d = details[node.id] || {}, lic = licenseHtml(resolveLicenses(nodes, details, node.id)), bc = crumbs(nodes, node.id, hub.title);
    const head = `<header class="blog-title-bar"><h1>${t(node.title)}</h1></header>`;
    const desc = d.description ? `<p class="product-desc">${t(d.description)}</p>` : "";
    if (isCat(node)) return `${bc}${head}${desc}<section class="post-section">${grid(children(nodes, node.id))}</section>${lic}`;
    const gallery = (d.gallery || []).filter(imgOk), btns = (d.buttons || []).filter((b) => b && String(b.url || "").trim());
    return `<article class="product-article">${bc}${head}${d.price ? `<div class="product-price">${t(d.price)}</div>` : ""}` +
      (imgSrc(node.thumb) ? `<div class="product-hero"><img src="${a(imgSrc(node.thumb))}" alt="${a(node.title)}" /></div>` : "") + desc +
      (bodyHtml ? `<div class="post-body product-body">${bodyHtml}</div>` : "") +
      (gallery.length ? `<section class="post-section"><h2>🖼️ Hình ảnh</h2><div class="product-gallery">${gallery.map((g, i) => `<a href="${a(g)}" target="_blank" rel="noopener noreferrer"><img src="${a(g)}" alt="${a(node.title + " " + (i + 1))}" loading="lazy" /></a>`).join("")}</div></section>` : "") +
      (btns.length ? `<div class="product-actions">${btns.map((b) => { const h = safeHref(b.url), ext = isHttp(h) ? ' target="_blank" rel="noopener noreferrer"' : ""; return `<a class="product-btn ${BTN[b.style] || "blue"}" href="${a(h)}"${ext}>${t(b.label || "Mở liên kết")}</a>`; }).join("")}</div>` : "") +
      `<div class="product-meta" data-views-wrap hidden></div><div class="post-share" data-share></div>${lic}</article>`;
  }

  /* ---------------- SEO ---------------- */
  // Cho số tiền dạng "50.000đ" → 50000; "Miễn phí"/"Free" → 0; còn lại null (không khai báo giá để khỏi sai)
  function priceNumber(s) { s = String(s || "").trim(); if (!s) return null; if (/^(miễn phí|mien phi|free|0)$/i.test(s)) return 0; const m = s.match(/^(\d[\d.,\s]*)\s*(đ|vnd|vnđ|₫)?$/i); if (!m) return null; const n = Number(m[1].replace(/[^\d]/g, "")); return Number.isFinite(n) ? n : null; }

  function ldFor({ seo, node, nodes, details, hub = {} }) {
    const base = site(seo), id = node && node.id, u = id ? base + url(id) : base + "/product/";
    const hubName = hub.title || HUB, d = (id && details[id]) || {};
    const crumbList = [{ name: "Trang chủ", item: base + "/" }, { name: hubName, item: base + "/product/" }].concat(id ? path(nodes, id).map((n) => ({ name: n.title, item: base + url(n.id) })) : []);
    const bc = { "@type": "BreadcrumbList", itemListElement: crumbList.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })) };
    const kids = children(nodes, id || "");
    const list = (name) => ({ "@type": "ItemList", name, numberOfItems: kids.length, itemListElement: kids.map((n, i) => ({ "@type": "ListItem", position: i + 1, url: base + url(n.id), name: n.title, ...(imgSrc(n.thumb) ? { image: absUrl(seo, n.thumb) } : {}) })) });
    if (!id || isCat(node)) {
      const name = id ? node.title : hubName, desc = id ? d.description : (hub.intro ? excerpt(hub.intro) : "");
      return { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", "@id": u + "#page", url: u, name, inLanguage: "vi", ...(desc ? { description: desc } : {}), isPartOf: { "@id": base + "/#website" }, mainEntity: list(name) }, bc] };
    }
    const imgs = [node.thumb].concat(d.gallery || []).filter(imgOk).map((x) => absUrl(seo, x));
    const price = priceNumber(d.price);
    const prod = { "@type": "Product", "@id": u + "#product", url: u, name: node.title, ...(d.description ? { description: d.description } : {}), ...(imgs.length ? { image: imgs } : {}),
      brand: { "@type": "Person", name: seo.siteName }, ...(d.keywords ? { keywords: d.keywords } : {}),
      ...(price == null ? {} : { offers: { "@type": "Offer", url: u, price: String(price), priceCurrency: "VND", availability: "https://schema.org/InStock" } }) };
    return { "@context": "https://schema.org", "@graph": [prod, bc] };
  }

  // Khối <head> của một mục: tiêu đề, mô tả, từ khóa, canonical, Open Graph, favicon, JSON-LD
  function headFor({ seo, node, nodes, details, bodyMd = "", hub = {} }) {
    const base = site(seo), u = base + url(node.id), name = seo.siteName, f = seo.favicon || {}, d = details[node.id] || {};
    const title = `${node.title} — ${name}`;
    const desc = d.description || excerpt(bodyMd) || (isCat(node) ? `Danh mục ${node.title} trong ${hub.title || HUB} của ${name}.` : `${node.title} — ${hub.title || HUB} của ${name}.`);
    const kw = String(d.keywords || "").split(",").map((s) => s.trim()).filter(Boolean);
    const keywords = (kw.length ? kw : [node.title, hub.title || HUB, name]).join(", ");
    const img = absUrl(seo, imgSrc(node.thumb)) || seo.ogImage || "";
    const L = ["<!-- seo:start -->", `<title>${t(title)}</title>`, `<meta name="description" content="${a(desc)}" />`, `<meta name="keywords" content="${a(keywords)}" />`,
      `<link rel="canonical" href="${a(u)}" />`, `<meta property="og:type" content="website" />`, `<meta property="og:site_name" content="${a(name)}" />`,
      `<meta property="og:title" content="${a(title)}" />`, `<meta property="og:description" content="${a(desc)}" />`, `<meta property="og:url" content="${a(u)}" />`];
    if (img) L.push(`<meta property="og:image" content="${a(img)}" />`);
    L.push(`<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />`);
    if (f.icon) L.push(`<link rel="icon" type="image/png" sizes="32x32" href="${a(f.icon)}" />`);
    if (f.v) L.push(`<link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon/favicon-192.png?v=${a(f.v)}" />`);
    if (f.apple) L.push(`<link rel="apple-touch-icon" href="${a(f.apple)}" />`);
    L.push(`<script type="application/ld+json" id="product-jsonld">${jsonSafe(ldFor({ seo, node, nodes, details, hub }))}</script>`, "<!-- seo:end -->");
    return L.join("\n  ");
  }

  // Các khối dựng sẵn của shell /product/ (do tools/prerender.js tạo) KHÔNG được lọt vào trang từng mục.
  const stripPrerender = (html) => String(html).replace(/<!--pre:(productlist|jsonld)-->[\s\S]*?<!--\/pre:\1-->/g, "");
  // Trang tĩnh /product/<id>/index.html = shell + SEO riêng + nội dung thật trong #app
  function buildNodePage(shell, ctx) {
    const re = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, mount = '<div id="app" class="page"></div>';
    if (!re.test(shell)) throw new Error("product/index.html thiếu cặp <!-- seo:start --> / <!-- seo:end -->");
    if (!shell.includes(mount)) throw new Error('product/index.html không có <div id="app" class="page"></div>');
    const head = headFor({ ...ctx, bodyMd: (ctx.details[ctx.node.id] || {}).body });
    return stripPrerender(shell).replace(re, () => head).replace(mount, () => `<div id="app" class="page">${bodyNode(ctx)}</div>`);
  }

  // Dòng trong sitemap/llms cho tất cả mục
  const allUrls = (seo, nodes) => [{ loc: site(seo) + "/product/", lastmod: nodes.map((n) => n.updated).filter(Boolean).sort().pop() || "" }].concat(nodes.map((n) => ({ loc: site(seo) + url(n.id), lastmod: n.updated || "" })));

  return { HUB, RESERVED, t, a, url, absUrl, isCat, byOrder, find, children, path, descendants, slugOk, excerpt, textHtml, resolveLicenses, licenseHtml, card, grid, crumbs,
    bodyHub, bodyNode, ldFor, headFor, buildNodePage, stripPrerender, allUrls, priceNumber, isHttp };
});
