/* profile/js/profilegen.js
   Bộ dựng trang /profile DÙNG CHUNG cho 3 nơi (cùng một logic nên kết quả luôn giống nhau):
     • profile/js/main.js  (trình duyệt: vẽ trang từ profile/data.json + channel/data.json)
     • tools/prerender.js  (Node: dựng sẵn HTML thật + JSON-LD + llms.txt cho bot/AI/Google)
     • admin/profile       (trình duyệt: chuẩn hoá dữ liệu trước khi lưu)
   Quy tắc: ảnh nào chưa có (hoặc link ảnh không hợp lệ) thì KHÔNG dựng ra, nên không bao giờ hiện khung "ảnh lỗi";
   mục nào chưa có nội dung thì tự ẩn, kể cả nút điều hướng của mục đó. */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.ProfileGen = factory(); })(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  const THEME = { primary: "#4cc9f0", accent: "#ffd23f", ink: "#15171c" }; // lấy từ bộ model "New Model": tóc xanh da trời, vàng, đen
  const TYPES = ["text", "info", "fan", "models", "social"];
  const TYPE_NAMES = { text: "Văn bản (Lore, giới thiệu…)", info: "Bảng thông tin", fan: "Fan name", models: "Model / Outfits", social: "Mạng xã hội" };

  /* ---------------- Tiện ích ---------------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const str = (v, d) => (typeof v === "string" ? v : v == null ? (d || "") : String(v));
  const has = (o, k) => !!o && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);
  const pick = (o, k, d) => (has(o, k) ? str(o[k]) : d);
  const hex = (c, d) => (/^#[0-9a-f]{6}$/i.test(String(c || "").trim()) ? String(c).trim().toLowerCase() : d);
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, Number.isFinite(n) ? n : a));
  const plain = (s) => String(s || "").replace(/\*\*|\*/g, "").replace(/\s+/g, " ").trim();

  // Ảnh: chỉ nhận đường dẫn nội bộ (/image/…) hoặc http(s). Chặn javascript:, data:, //host…
  const safeImg = (u) => {
    u = String(u || "").trim(); if (!u) return "";
    const probe = u.replace(/[\u0000-\u0020\u007f]/g, "");
    return /^https?:\/\//i.test(probe) || /^\/(?!\/)/.test(probe) ? u : "";
  };
  // Link bấm được: http(s), mailto, tel hoặc đường dẫn nội bộ; gõ email trần thì tự thêm mailto:
  const safeHref = (u) => {
    u = String(u || "").trim(); if (!u) return "";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) return "mailto:" + u;
    const probe = u.replace(/[\u0000-\u0020\u007f]/g, "");
    return /^(https?:\/\/|mailto:|tel:)/i.test(probe) || /^\/(?!\/)/.test(probe) ? u : "";
  };
  const cssUrl = (u) => String(u).replace(/["'()\\\s]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));

  // Chữ có định dạng nhẹ: **đậm**, *nghiêng*; đoạn cách nhau bằng dòng trống; dòng chỉ có --- là đường kẻ.
  const inline = (s) => esc(s).replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
  const rich = (s) => String(s || "").replace(/\r\n?/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
    .map((b) => (/^-{3,}$/.test(b) ? '<hr class="pf-hr">' : `<p>${inline(b).replace(/\n/g, "<br>")}</p>`)).join("");

  /* ---------------- Dữ liệu mặc định + chuẩn hoá ---------------- */
  function defaults() {
    return {
      version: 1,
      theme: { ...THEME },
      background: { mode: "pattern", image: "", color: THEME.primary, fit: "cover", fixed: true, dim: 0 },
      hero: {
        avatar: "/assets/avatar/avatar-336.webp", name: "Moe Shinn", tagline: "PNGtuber (Ezy Tuber) Việt Nam",
        intro: "Xin chào, mình là **Shinn Moeji**, người đứng sau kênh **Moe Shinn [VNer]**. Mình là một PNGtuber Việt Nam dùng **Ezy Tuber** (ảnh tĩnh gắn khớp để chuyển động, kiểu PNGTuber+), làm nội dung game, trò chuyện, reaction và livestream trên **YouTube**.",
      },
      sections: [
        { id: "lore", type: "text", enabled: true, nav: "Lore", title: "Lore", body: "", image: "" },
        { id: "info", type: "info", enabled: true, nav: "Thông tin", title: "Thông tin cơ bản", image: "", rows: [
          { label: "Tên", value: "Shinn Moeji" }, { label: "Tên kênh", value: "Moe Shinn [VNer]" },
          { label: "Thể loại", value: "PNGtuber, dùng Ezy Tuber (ảnh tĩnh gắn khớp chuyển động, kiểu PNGTuber+)" }, { label: "Quốc gia", value: "Việt Nam" },
          { label: "Nền tảng", value: "YouTube" }, { label: "Nội dung", value: "Game, trò chuyện, reaction, livestream" } ] },
        { id: "fan", type: "fan", enabled: true, nav: "Fan name", title: "Fan name", body: "", oshiLabel: "Oshi mark", oshi: "", images: [] },
        { id: "models", type: "models", enabled: true, nav: "Outfits", title: "Outfits", items: [] },
        { id: "social", type: "social", enabled: true, nav: "Social media", title: "Social media" },
      ],
    };
  }
  const rowsOf = (a) => (Array.isArray(a) ? a : []).filter((r) => r && typeof r === "object").map((r) => ({ label: str(r.label), value: str(r.value) }));

  function normalize(d) {
    d = d && typeof d === "object" ? d : {};
    const base = defaults(), t = d.theme || {}, b = d.background || {}, h = d.hero || {};
    const theme = { primary: hex(t.primary, base.theme.primary), accent: hex(t.accent, base.theme.accent), ink: hex(t.ink, base.theme.ink) };
    const background = {
      mode: ["pattern", "image", "color"].includes(b.mode) ? b.mode : "pattern", image: str(b.image).trim(), color: hex(b.color, theme.primary),
      fit: ["cover", "contain", "tile"].includes(b.fit) ? b.fit : "cover", fixed: b.fixed !== false, dim: clamp(Math.round(Number(b.dim) || 0), 0, 70),
    };
    const hero = { avatar: pick(h, "avatar", base.hero.avatar).trim(), name: pick(h, "name", base.hero.name), tagline: pick(h, "tagline", base.hero.tagline), intro: pick(h, "intro", base.hero.intro) };
    const src = Array.isArray(d.sections) ? d.sections : base.sections, seen = new Set(); let social = false;
    const sections = src.filter((s) => s && TYPES.includes(s.type)).map((s, i) => {
      if (s.type === "social") { if (social) return null; social = true; }
      let id = slug(s.id) || `${s.type}-${i + 1}`; for (let n = 2; seen.has(id); n++) id = `${slug(s.id) || s.type}-${n}`; seen.add(id);
      const o = { id, type: s.type, enabled: s.enabled !== false, nav: str(s.nav), title: str(s.title) };
      if (s.type === "text") Object.assign(o, { body: str(s.body), image: str(s.image).trim() });
      if (s.type === "info") Object.assign(o, { rows: rowsOf(s.rows), image: str(s.image).trim() });
      if (s.type === "fan") Object.assign(o, { body: str(s.body), oshiLabel: has(s, "oshiLabel") ? str(s.oshiLabel) : "Oshi mark", oshi: str(s.oshi),
        images: (Array.isArray(s.images) ? s.images : []).filter((x) => x && typeof x === "object").map((x) => ({ url: str(x.url).trim(), caption: str(x.caption) })) });
      if (s.type === "models") { const used = new Set(); Object.assign(o, { items: (Array.isArray(s.items) ? s.items : []).filter((m) => m && typeof m === "object").map((m, j) => {
        let mid = slug(m.id) || `m${j + 1}`; for (let n = 2; used.has(mid); n++) mid = `${slug(m.id) || "m" + (j + 1)}-${n}`; used.add(mid);
        return { id: mid, name: str(m.name), reveal: str(m.reveal), image: str(m.image).trim(), note: str(m.note), info: rowsOf(m.info) }; }) }); }
      return o;
    }).filter(Boolean);
    return { version: 1, theme, background, hero, sections };
  }

  /* ---------------- Mạng xã hội: lấy từ /channel (bỏ mục Liên hệ) ---------------- */
  function socialLinks(channel, icons) {
    icons = icons || {};
    return ((channel && channel.links) || []).filter((l) => l && l.visible !== false && l.url && l.group !== "contact" && icons[l.icon || l.id])
      .map((l) => { const key = l.icon || l.id, href = safeHref(l.url); return href ? { key, label: str(l.label, key).trim() || key, href, bg: icons[key].bg || "#333", svg: icons[key].svg || "" } : null; })
      .filter(Boolean);
  }

  /* ---------------- Mục nào có nội dung thì mới hiện ---------------- */
  const hasRows = (rows) => rows.some((r) => r.label.trim() || r.value.trim());
  function hasContent(s, ctx) {
    if (s.type === "text") return !!(s.body.trim() || safeImg(s.image));
    if (s.type === "info") return hasRows(s.rows) || !!safeImg(s.image);
    if (s.type === "fan") return !!(s.body.trim() || s.oshi.trim() || s.images.some((i) => safeImg(i.url)));
    if (s.type === "models") return s.items.some((m) => m.name.trim() || safeImg(m.image));
    if (s.type === "social") return !!(ctx && ctx.links && ctx.links.length);
    return false;
  }
  const visibleSections = (d, ctx) => d.sections.filter((s) => s.enabled !== false && hasContent(s, ctx));

  /* ---------------- HTML ---------------- */
  const ICON_X = '<svg class="pf-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" fill="none"/></svg>';
  const ICON_DOWN = '<svg class="pf-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9l7 7 7-7" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
  const ICON_UP = '<svg class="pf-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15l7-7 7 7" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

  const media = (url, alt, cls) => {
    const u = safeImg(url);
    return u ? `<figure class="pf-media${cls ? " " + cls : ""}"><button type="button" class="pf-zoom" aria-label="Phóng to ảnh"><img src="${esc(u)}" alt="${esc(alt)}" loading="lazy" decoding="async"></button></figure>` : "";
  };
  const rows = (list) => (hasRows(list)
    ? `<dl class="pf-rows">${list.filter((r) => r.label.trim() || r.value.trim()).map((r) => `<div class="pf-row${r.label.trim() ? "" : " pf-row--solo"}">${r.label.trim() ? `<dt>${esc(r.label)}</dt>` : ""}<dd>${inline(r.value)}</dd></div>`).join("")}</dl>` : "");

  function hero(d) {
    const h = d.hero, av = safeImg(h.avatar), name = h.name.trim() || "Vtuber";
    return `<header class="pf-hero" id="pf-top">${av ? `<div class="pf-avatar"><img src="${esc(av)}" alt="${esc(name)}" width="168" height="168" decoding="async" fetchpriority="high"></div>` : ""}` +
      `<div class="pf-card pf-hero-card${av ? " pf-has-avatar" : ""}"><h1 class="pf-name">${esc(name)}</h1>` +
      (h.tagline.trim() ? `<p class="pf-tagline">${inline(h.tagline)}</p>` : "") + (h.intro.trim() ? `<div class="pf-rich pf-intro">${rich(h.intro)}</div>` : "") + `</div></header>`;
  }
  const nav = (secs) => (secs.length ? `<nav class="pf-nav" aria-label="Mục lục hồ sơ">${secs.map((s) => `<a class="pf-btn" href="#${esc(s.id)}">${ICON_X}<span>${esc(s.nav || s.title)}</span></a>`).join("")}</nav>` : "");

  function section(s, ctx) {
    const id = esc(s.id), tid = id + "-t", title = esc(s.title || s.nav || "");
    if (s.type === "text") return `<section class="pf-sec" id="${id}" aria-labelledby="${tid}"><div class="pf-card"><h2 class="pf-title" id="${tid}"><span>${title}</span></h2>${s.body.trim() ? `<div class="pf-rich">${rich(s.body)}</div>` : ""}${media(s.image, s.title || s.nav, "pf-wide")}</div></section>`;
    if (s.type === "info") return `<section class="pf-sec" id="${id}" aria-labelledby="${tid}"><div class="pf-card"><h2 class="pf-title" id="${tid}"><span>${title}</span></h2>${rows(s.rows)}${media(s.image, s.title || s.nav)}</div></section>`;
    if (s.type === "fan") {
      const imgs = s.images.filter((i) => safeImg(i.url));
      return `<section class="pf-sec" id="${id}" aria-labelledby="${tid}"><div class="pf-card"><h2 class="pf-title" id="${tid}"><span>${title}</span></h2>` +
        `<div class="pf-fan${imgs.length ? "" : " pf-fan--solo"}">` +
        (imgs.length ? `<ul class="pf-fan-imgs">${imgs.map((i) => `<li>${media(i.url, i.caption || s.title)}${i.caption.trim() ? `<span class="pf-tag">${esc(i.caption)}</span>` : ""}</li>`).join("")}</ul>` : "") +
        `<div class="pf-fan-text">${s.body.trim() ? `<div class="pf-rich">${rich(s.body)}</div>` : ""}${s.oshi.trim() ? `<p class="pf-oshi"><strong>${esc(s.oshiLabel || "Oshi mark")}:</strong> <span>${esc(s.oshi)}</span></p>` : ""}</div></div></div></section>`;
    }
    if (s.type === "models") {
      const items = s.items.filter((m) => m.name.trim() || safeImg(m.image));
      return `<section class="pf-sec pf-sec-models" id="${id}" aria-labelledby="${tid}"><h2 class="pf-sticker pf-rv-s" id="${tid}">${title}</h2>` + items.map((m) =>
        `<article class="pf-card pf-model" id="${id}-${esc(m.id)}">${m.name.trim() ? `<h3 class="pf-title"><span>${esc(m.name)}</span></h3>` : ""}` +
        (m.reveal.trim() ? `<p class="pf-reveal"><strong>Reveal:</strong> ${esc(m.reveal)}</p>` : "") + media(m.image, m.name || s.title) + rows(m.info) +
        (m.note.trim() ? `<div class="pf-rich pf-note">${rich(m.note)}</div>` : "") + `</article>`).join("") + `</section>`;
    }
    if (s.type === "social") {
      const links = (ctx && ctx.links) || [];
      return `<section class="pf-sec pf-sec-social" id="${id}" aria-labelledby="${tid}"><h2 class="pf-sticker pf-rv-s" id="${tid}">${title}</h2><ul class="pf-social">` +
        links.map((l) => `<li><a class="pf-soc" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer me" aria-label="${esc(l.label)}" title="${esc(l.label)}" style="background:${esc(l.bg)}"><span class="pf-soc-ic">${l.svg}</span></a><span class="pf-soc-label">${esc(l.label)}</span></li>`).join("") + `</ul></section>`;
    }
    return "";
  }

  // Toàn bộ nội dung bên trong #pf-root
  function page(d, ctx) {
    d = normalize(d); ctx = ctx || {};
    const secs = visibleSections(d, ctx);
    const next = (s) => `<a class="pf-btn pf-next" href="#${esc(s.id)}">${ICON_DOWN}<span>${esc(s.nav || s.title)}</span></a>`;
    const top = `<a class="pf-btn pf-next pf-top" href="#pf-top">${ICON_UP}<span>Lên đầu trang</span></a>`;
    return hero(d) + nav(secs) + secs.map((s, i) => section(s, ctx) + (secs[i + 1] ? next(secs[i + 1]) : top)).join("");
  }

  /* ---------------- Nền + màu ---------------- */
  const varsCss = (d) => { d = normalize(d); return `:root{--pf-primary:${d.theme.primary};--pf-accent:${d.theme.accent};--pf-ink:${d.theme.ink}}`; };
  // Trả về thông số nền đã làm sạch: ảnh sai/không có → tự về hoạ tiết mặc định.
  function bgSpec(d) { const b = normalize(d).background; return { ...b, image: b.mode === "image" ? safeImg(b.image) : "", mode: b.mode === "image" && !safeImg(b.image) ? "pattern" : b.mode }; }

  /* ---------------- SEO ---------------- */
  function ldFor(d, ctx, opts) {
    d = normalize(d); ctx = ctx || {}; opts = opts || {};
    const site = String(ctx.site || "").replace(/\/$/, ""), url = ctx.url || site + "/profile/", abs = (u) => (/^https?:/i.test(u) ? u : site + u);
    const h = d.hero, av = safeImg(h.avatar), name = h.name.trim() || "Vtuber";
    const sameAs = [...new Set(((ctx.links) || []).map((l) => l.href).filter((u) => /^https?:\/\//i.test(u)))];
    const models = visibleSections(d, ctx).filter((s) => s.type === "models").flatMap((s) => s.items.filter((m) => m.name.trim()).map((m) => m.name.trim()));
    return {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "ProfilePage", "@id": url + "#profile", url, name: opts.title || `Hồ sơ ${name}`, inLanguage: "vi",
          ...(opts.description ? { description: opts.description } : {}), isPartOf: { "@id": site + "/#website" }, mainEntity: { "@id": site + "/#person" } },
        { "@type": "Person", "@id": site + "/#person", name, url,
          ...(h.tagline.trim() ? { jobTitle: plain(h.tagline) } : {}), ...(h.intro.trim() ? { description: plain(h.intro) } : {}),
          ...(av ? { image: abs(av) } : {}), ...(sameAs.length ? { sameAs } : {}), ...(models.length ? { knowsAbout: models } : {}) },
        { "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: ctx.siteName || "Trang chủ", item: site + "/" },
          { "@type": "ListItem", position: 2, name: `Hồ sơ ${name}`, item: url } ] },
      ],
    };
  }
  // Dòng chữ cho llms.txt (mục lục dạng văn bản cho công cụ AI)
  function llmsLines(d, ctx) {
    d = normalize(d); ctx = ctx || {};
    const site = String(ctx.site || "").replace(/\/$/, ""), url = ctx.url || site + "/profile/", h = d.hero, name = h.name.trim() || "Vtuber";
    const L = [`- [Hồ sơ ${name}](${url})${h.tagline.trim() ? `: ${plain(h.tagline)}` : ""}`];
    if (h.intro.trim()) L.push(`  - ${plain(h.intro)}`);
    visibleSections(d, ctx).forEach((s) => {
      if (s.type === "info") s.rows.filter((r) => r.label.trim() && r.value.trim()).forEach((r) => L.push(`  - ${plain(r.label)}: ${plain(r.value)}`));
      if (s.type === "fan" && s.oshi.trim()) L.push(`  - ${plain(s.oshiLabel || "Oshi mark")}: ${plain(s.oshi)}`);
      if (s.type === "models") s.items.filter((m) => m.name.trim()).forEach((m) => L.push(`  - Model ${plain(m.name)}${m.reveal.trim() ? ` (reveal: ${plain(m.reveal)})` : ""}`));
    });
    return L;
  }

  // Mọi ô ảnh trong dữ liệu: [nhãn, url] — admin dùng để kiểm tra trước khi lưu, main.js dùng để nhờ service worker lưu sẵn.
  function imageFields(d) {
    d = normalize(d); const out = [["Ảnh nền", d.background.mode === "image" ? d.background.image : ""], ["Ảnh đại diện", d.hero.avatar]];
    d.sections.forEach((s) => {
      const n = s.nav || s.title || s.type;
      if (s.type === "text" || s.type === "info") out.push([`Ảnh mục "${n}"`, s.image]);
      if (s.type === "fan") s.images.forEach((i, j) => out.push([`Ảnh fan name ${j + 1}`, i.url]));
      if (s.type === "models") s.items.forEach((m, j) => out.push([`Ảnh model ${m.name || j + 1}`, m.image]));
    });
    return out;
  }

  return { THEME, TYPES, TYPE_NAMES, esc, inline, rich, safeImg, safeHref, cssUrl, defaults, normalize, socialLinks, hasContent, visibleSections, page, varsCss, bgSpec, ldFor, llmsLines, imageFields };
});
