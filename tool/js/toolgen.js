/* Dựng HTML cho mục /tool: danh sách (thẻ logo + tên + mô tả) và trang chi tiết /tool/<id>/.
   Dùng chung cho trình duyệt (trang /tool, trang /admin/tool) và Node (tools/prerender.js). Không đụng DOM. */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.ToolGen = factory(); })(typeof window !== "undefined" ? window : this, function () {
  const a = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const ld = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
  const RTA = "RTA-5042-1996-1400-1577-RTA"; // nhãn chuẩn "chỉ dành cho người lớn" để bộ lọc nội dung nhận ra
  const DEF_LABEL = "Tải xuống";
  const RESERVED = ["css", "js", "data", "photo", "img"]; // thư mục có sẵn trong /tool/, không dùng làm id

  const slugify = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "") || "tool";
  const isoDay = (v) => { const m = String(v || "").match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : ""; };
  // Chỉ cho http(s); mọi thứ khác (javascript:, data:…) thành "#"
  const safeUrl = (u) => { const s = String(u || "").trim(); return /^https?:\/\//i.test(s) ? s : "#"; };
  const imgUrl = (u) => { const s = String(u || "").trim(); return !s ? "" : /^(https?:)?\/\//.test(s) ? s : "/" + s.replace(/^\/+/, ""); };
  const siteOf = (seo) => String(seo.siteUrl || "").replace(/\/$/, "");
  const toolUrl = (id) => `/tool/${encodeURIComponent(id)}/`;

  /* ---------- Chữ màu: mã § kiểu Minecraft + thẻ kiểu MiniMessage ----------
     §0-§f màu · §l đậm · §o nghiêng · §n gạch chân · §m gạch ngang · §r xóa định dạng
     <red> <#ff8800> <color:#ff8800> · <b> <i> <u> <st> · <reset>
     <gradient:#ff0000:#0000ff>chữ</gradient> (2 màu trở lên) · <rainbow>chữ</rainbow>
     Thẻ lạ được giữ nguyên như chữ thường. */
  const MC = { "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA", "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA", "8": "#555555", "9": "#5555FF", a: "#55FF55", b: "#55FFFF", c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF" };
  const NAMED = { black: "0", dark_blue: "1", dark_green: "2", dark_aqua: "3", dark_red: "4", dark_purple: "5", gold: "6", gray: "7", grey: "7", dark_gray: "8", dark_grey: "8", blue: "9", green: "a", aqua: "b", red: "c", light_purple: "d", yellow: "e", white: "f" };
  const FMT = { bold: "b", b: "b", italic: "i", i: "i", em: "i", underlined: "u", u: "u", strikethrough: "s", st: "s" };
  function hex(v) {
    v = String(v || "").trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(v)) return v;
    if (/^#[0-9a-f]{3}$/.test(v)) return "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return NAMED[v] ? MC[NAMED[v]].toLowerCase() : "";
  }
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (a) => "#" + a.map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0")).join("");
  function mix(cols, k) { // k từ 0 tới 1 dọc theo danh sách màu
    if (cols.length < 2) return cols[0];
    const x = k * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(x)), f = x - i, A = rgb(cols[i]), B = rgb(cols[i + 1]);
    return toHex(A.map((v, j) => v + (B[j] - v) * f));
  }
  function hue(k) { // cầu vồng: sắc độ chạy 0-300°, sáng vừa phải để dễ đọc trên nền tối
    const h = k * 300, c = 0.8, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = 0.6 - c / 2;
    const r = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : [x, 0, c];
    return toHex(r.map((v) => (v + m) * 255));
  }
  function parseStyled(src) {
    const chars = [], ranges = [], stack = [], st = { color: "", b: 0, i: 0, u: 0, s: 0 };
    for (const part of String(src ?? "").split(/(§[0-9a-fk-or]|<\/?[a-z#][^<>\n]{0,80}>)/i)) {
      if (!part) continue;
      let m = part.match(/^§([0-9a-fk-or])$/i);
      if (m) {
        const c = m[1].toLowerCase();
        if (MC[c]) { st.color = MC[c].toLowerCase(); st.b = st.i = st.u = st.s = 0; } // mã màu xóa định dạng cũ, giống Minecraft
        else if (c === "l") st.b = 1; else if (c === "o") st.i = 1; else if (c === "n") st.u = 1; else if (c === "m") st.s = 1;
        else if (c === "r") { st.color = ""; st.b = st.i = st.u = st.s = 0; }
        continue;
      }
      m = part.match(/^<(\/?)([a-z#][^<>\n]*)>$/i);
      let ok = false;
      if (m) {
        const close = !!m[1], bits = m[2].trim().split(":"), name = bits[0].toLowerCase(), args = bits.slice(1);
        if (name === "gradient" || name === "rainbow") {
          ok = true;
          if (close) { const r = stack.pop(); if (r) r.end = chars.length; }
          else { const cols = name === "gradient" ? args.map(hex).filter(Boolean) : []; const r = { type: name, cols: cols.length >= 2 ? cols : cols.length ? [cols[0], cols[0]] : ["#ffffff", "#ffffff"], start: chars.length, end: -1 }; ranges.push(r); stack.push(r); }
        } else if (FMT[name]) { ok = true; st[FMT[name]] = close ? 0 : 1; }
        else if (name === "reset" || name === "r") { ok = true; st.color = ""; st.b = st.i = st.u = st.s = 0; }
        else if (name === "color" || name === "c" || name === "colour") { ok = true; st.color = close ? "" : hex(args[0]) || st.color; }
        else if (hex(name)) { ok = true; st.color = close ? "" : hex(name); }
      }
      if (ok) continue;
      for (const ch of Array.from(part)) chars.push({ ch, color: st.color, b: st.b, i: st.i, u: st.u, s: st.s });
    }
    ranges.forEach((r) => { // gradient/cầu vồng ghi đè màu của đoạn chữ nằm giữa hai thẻ (thẻ mở sau ghi đè thẻ mở trước)
      const end = r.end < 0 ? chars.length : r.end, n = end - r.start;
      for (let k = r.start; k < end; k++) chars[k].color = r.type === "rainbow" ? hue(n < 2 ? 0 : (k - r.start) / (n - 1)) : mix(r.cols, n < 2 ? 0 : (k - r.start) / (n - 1));
    });
    return chars;
  }
  const plain = (src) => parseStyled(src).map((c) => c.ch).join("");
  // Dựng HTML có màu. opts.max > 0: quá số ký tự (nhìn thấy) đó thì cắt và thêm "…"
  function fmt(src, opts = {}) {
    let chars = parseStyled(src), cut = false;
    if (opts.max > 0 && chars.length > opts.max) { chars = chars.slice(0, opts.max); while (chars.length && /\s/.test(chars[chars.length - 1].ch)) chars.pop(); cut = true; }
    const css = (c) => (c.color ? `color:${c.color};` : "") + (c.b ? "font-weight:800;" : "") + (c.i ? "font-style:italic;" : "") + (c.u || c.s ? `text-decoration:${[c.u && "underline", c.s && "line-through"].filter(Boolean).join(" ")};` : "");
    let out = "", i = 0;
    while (i < chars.length) {
      const sty = css(chars[i]); let txt = "";
      while (i < chars.length && css(chars[i]) === sty) txt += chars[i++].ch;
      out += sty ? `<span style="${sty}">${t(txt)}</span>` : t(txt);
    }
    return out + (cut ? "…" : "");
  }
  const DEFAULT_PLATFORMS = ["Android", "Windows", "Android - Windows"]; // danh sách nền tảng mặc định; thêm bớt ở tool/data.json → "platforms"

  /* ---------- Tìm kiếm ----------
     Không phân biệt hoa/thường và dấu. Gõ nhiều từ thì tool phải chứa ĐỦ các từ (thứ tự tùy ý, nằm ở trường nào cũng được):
     tên, tác giả, nền tảng, version, mô tả ngắn (đủ, không bị cắt), từ khóa, mô tả SEO. Từ khớp ở TÊN được điểm cao hơn nên xếp trước.
     Gõ sai 1 chữ (từ ≥ 5 ký tự; ≥ 9 ký tự sai tối đa 2 chữ) vẫn tìm ra, điểm thấp hơn. */
  const fold = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
  const tokens = (s) => fold(s).split(/[\s,;|/\-–—·]+/).filter(Boolean);
  const lev = (a, b, max) => { // khoảng cách Levenshtein, bỏ sớm khi vượt max
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let min = i;
      for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (cur[j] < min) min = cur[j]; }
      if (min > max) return max + 1; prev = cur;
    }
    return prev[b.length];
  };
  const entryFrom = (title, all) => { const T = fold(title), A = fold(all); return { title: T, all: A, words: [...new Set(tokens(A))] }; };
  const searchText = (x) => { const n = norm(x); return [plain(n.title), plain(n.author), plain(n.game), n.platform, plain(n.version), plain(n.short), n.keywords, n.description].filter(Boolean).join(" "); };
  const searchEntry = (x) => entryFrom(plain(norm(x).title), searchText(x));
  // Điểm khớp của một tool với câu tìm; -1 = không khớp; chưa gõ gì = 0
  function score(query, e) {
    const qs = tokens(query); if (!qs.length) return 0;
    let total = 0;
    for (const q of qs) {
      if (e.title.includes(q)) total += e.title.split(/[^a-z0-9]+/).some((w) => w.startsWith(q)) ? 5 : 3;
      else if (e.all.includes(q)) total += 1.5;
      else if (q.length >= 5 && e.words.some((w) => lev(q, w, q.length >= 9 ? 2 : 1) <= (q.length >= 9 ? 2 : 1))) total += 0.5;
      else return -1;
    }
    return total;
  }

  const SHORT_MAX = 100; // mô tả ngắn ở danh sách: dài hơn số ký tự này thì cắt và hiện "…"

  // Điền giá trị mặc định cho dữ liệu một tool
  function norm(d) {
    d = d || {};
    const dl = (Array.isArray(d.downloads) ? d.downloads : []).map((x) => ({ label: String((x && x.label) || "").trim() || DEF_LABEL, url: String((x && x.url) || "").trim() })).filter((x) => x.url);
    return { id: d.id || "", title: d.title || d.id || "Tool", logo: d.logo || "", subtitle: String(d.subtitle || ""), description: d.description || "", keywords: d.keywords || "",
      author: String(d.author || ""), game: String(d.game || ""), platform: String(d.platform || ""), version: String(d.version || ""), short: String(d.short || ""),
      body: d.body || "", adult: !!d.adult, donate: !!d.donate, downloads: dl, createdAt: d.createdAt || "", updatedAt: d.updatedAt || "" };
  }
  // Dòng tóm tắt lưu trong tool/data.json (đủ để vẽ thẻ ở danh sách)
  const summary = (d) => { const n = norm(d); return { id: n.id, title: n.title, logo: n.logo, author: n.author, game: n.game, platform: n.platform, version: n.version, short: n.short, keywords: n.keywords, description: n.description, subtitle: n.subtitle, adult: n.adult, createdAt: n.createdAt }; };

  // Các dòng thông tin: Tác giả / Game / Nền tảng / Version / Mô tả (đủ trường nào hiện trường đó). full=false: mô tả bị cắt ở SHORT_MAX ký tự
  function infoHtml(n, { full = false } = {}) {
    const row = (cls, label, raw, max) => String(raw || "").trim() ? `<span class="tool-line ${cls}"><span class="tool-k">${label}</span> <span class="tool-v">${fmt(String(raw).trim(), { max })}</span></span>` : "";
    const out = row("l-author", "Tác giả:", n.author) + row("l-game", "Game:", n.game) + row("l-plat", "Nền tảng:", n.platform) + row("l-ver", "Version:", n.version) + row("l-desc", "Mô tả:", n.short, full ? 0 : SHORT_MAX);
    return out || (n.subtitle.trim() ? `<span class="tool-line"><span class="tool-v">${t(n.subtitle.trim())}</span></span>` : ""); // dữ liệu cũ chỉ có subtitle
  }

  /* ---------- Danh sách /tool/ ---------- */
  function cardHtml(x) {
    const n = norm(x), logo = imgUrl(n.logo);
    return `<a class="tool-card" href="${a(toolUrl(n.id))}" data-s="${a(searchText(n))}"${n.adult ? " data-adult" : ""}>` +
      `<span class="tool-card-logo${logo ? "" : " tool-logo-ph"}">${logo ? `<img src="${a(logo)}" alt="${a(plain(n.title))}" width="88" height="88" loading="lazy" />` : "🛠️"}</span>` +
      `<span class="tool-card-info"><span class="tool-card-name">${fmt(n.title)}</span>${infoHtml(n) ? `<span class="tool-card-sub">${infoHtml(n)}</span>` : ""}</span>` +
      (n.adult ? `<span class="tool-badge" title="Nội dung 18+">18+</span>` : "") + `</a>`;
  }
  function hubBody({ tools = [], hub = {} } = {}) {
    const intro = String(hub.intro || "").trim();
    return `<div class="tool-hub" data-tool-hub><header class="blog-title-bar"><h1>${t(hub.title || "Tool")}</h1>${intro ? `<p class="tool-intro">${t(intro)}</p>` : ""}</header>` +
      (tools.length ? `<div class="search-wrap"><input type="search" class="search-input" data-tool-search placeholder="Tìm theo tên, tác giả, nền tảng, từ khóa…" autocomplete="off" aria-label="Tìm tool" /></div>` +
        `<div class="tool-list">${tools.map(cardHtml).join("")}</div><p class="tool-empty" data-tool-noresult hidden>Không tìm thấy tool phù hợp.</p>` : `<p class="tool-empty">Chưa có tool nào.</p>`) + `</div>`;
  }

  /* ---------- Trang chi tiết /tool/<id>/ ---------- */
  function gateHtml() {
    return `<div class="tool-gate" data-tool-gate role="dialog" aria-modal="true" aria-labelledby="tool-gate-title"><div class="tool-gate-box">` +
      `<h2 id="tool-gate-title">Nội dung dành cho người từ 18 tuổi trở lên</h2>` +
      `<p>Trang này giới thiệu tool dùng cho game có nội dung người lớn (18+). Chỉ tiếp tục nếu bạn đã đủ tuổi theo quy định nơi bạn sống.</p>` +
      `<label class="tool-gate-check"><input type="checkbox" data-gate-check /> <span>Tôi xác nhận mình đã đủ 18 tuổi, tự chịu trách nhiệm khi truy cập và sử dụng tool, đồng thời hiểu rằng tool chỉ dùng cho bản game offline do chính tôi sở hữu hợp pháp.</span></label>` +
      `<div class="tool-gate-actions"><button type="button" class="tool-gate-ok" data-gate-ok disabled>Tôi đồng ý, vào xem</button><a class="tool-gate-leave" href="/tool/">Rời đi</a></div></div></div>`;
  }
  function detailBody({ data, bodyHtml = "" }) {
    const n = norm(data), logo = imgUrl(n.logo);
    const dls = n.downloads.map((d) => `<a class="tool-dl" href="${a(safeUrl(d.url))}" target="_blank" rel="noopener noreferrer nofollow">${t(d.label || DEF_LABEL)}</a>`).join("");
    const donate = n.donate ? `<a class="tool-donate" href="/donate/" aria-label="Ủng hộ qua trang Donate"><img src="/tool/img/buy-me-a-coffee.png" alt="Buy me a coffee" width="192" height="54" loading="lazy" /></a>` : "";
    return `<div class="post-view tool-view"><a class="back-btn" href="/tool/">← Danh sách tool</a>` +
      `<article class="post-article tool-article" data-tool-page${n.adult ? " data-adult" : ""}>` +
      `<header class="tool-hero"><span class="tool-hero-logo${logo ? "" : " tool-logo-ph"}">${logo ? `<img src="${a(logo)}" alt="${a(plain(n.title))}" width="112" height="112" />` : "🛠️"}</span>` +
      `<div class="tool-hero-text"><h1 class="post-title tool-title">${fmt(n.title)}${n.adult ? ` <span class="tool-badge">18+</span>` : ""}</h1>${infoHtml(n, { full: true }) ? `<div class="tool-sub">${infoHtml(n, { full: true })}</div>` : ""}</div></header>` +
      (bodyHtml ? `<div class="post-body tool-body">${bodyHtml}</div>` : "") + // mô tả trước, nút tải + donate sau
      (dls || donate ? `<div class="tool-actions">${dls ? `<div class="tool-dls">${dls}</div>` : ""}${donate}</div>` : "") + `</article></div>` + (n.adult ? gateHtml() : "");
  }

  const plainText = (v) => plain(v).replace(/\s+/g, " ").trim();
  const stripPre = (html) => String(html).replace(/<!--pre:(toollist)-->[\s\S]*?<!--\/pre:\1-->/g, "");
  function buildToolPage(shell, { id, data, seo, bodyHtml }) {
    const n = norm({ ...data, id }), name = seo.siteName, f = seo.favicon || {}, url = siteOf(seo) + toolUrl(id);
    const heading = plain(n.title), title = `${heading} — ${name}`;
    const plainBody = String(n.body || "").replace(/<[^>]*>/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/§[0-9a-fk-or]/gi, "").replace(/\s+/g, " ").trim();
    const desc = n.description || plainText(n.short) || (plainBody.length > 155 ? plainBody.slice(0, 154).replace(/\s+\S*$/, "") + "…" : plainBody) || `Tool ${heading} của ${name}.`;
    const kw = String(n.keywords || "").split(",").map((s) => s.trim()).filter(Boolean).join(", ");
    const lg = imgUrl(n.logo), img = lg ? (/^https?:/.test(lg) ? lg : siteOf(seo) + lg) : (seo.ogImage || "");
    const L = ["<!-- seo:start -->", `<title>${t(title)}</title>`, `<meta name="description" content="${a(desc)}" />`];
    if (kw) L.push(`<meta name="keywords" content="${a(kw)}" />`);
    if (n.adult) L.push(`<meta name="rating" content="${RTA}" />`);
    L.push(`<link rel="canonical" href="${a(url)}" />`, `<meta property="og:type" content="website" />`, `<meta property="og:site_name" content="${a(name)}" />`, `<meta property="og:title" content="${a(title)}" />`, `<meta property="og:description" content="${a(desc)}" />`, `<meta property="og:url" content="${a(url)}" />`);
    if (img) L.push(`<meta property="og:image" content="${a(img)}" />`);
    L.push(`<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />`);
    if (f.icon) L.push(`<link rel="icon" type="image/png" sizes="32x32" href="${a(f.icon)}" />`);
    if (f.v) L.push(`<link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon/favicon-192.png?v=${a(f.v)}" />`);
    if (f.apple) L.push(`<link rel="apple-touch-icon" href="${a(f.apple)}" />`);
    L.push("<!-- seo:end -->");
    const jsonld = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: heading, description: desc, url, inLanguage: "vi", applicationCategory: "UtilitiesApplication", author: { "@type": "Person", name } };
    if (img) jsonld.image = img; if (kw) jsonld.keywords = kw;
    const re = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, mount = /<div id="app" class="page[^"]*">[\s\S]*?<\/div>(?=\s*<footer)/;
    if (!re.test(shell)) throw new Error("tool/index.html thiếu cặp <!-- seo:start --> / <!-- seo:end -->");
    if (!mount.test(shell)) throw new Error('tool/index.html không có <div id="app" class="page">…</div> ngay trước <footer>');
    return stripPre(shell).replace(re, () => L.join("\n  ") + `<script type="application/ld+json" id="tool-jsonld">${ld(jsonld)}</script>`)
      .replace(mount, () => `<div id="app" class="page">${detailBody({ data: n, bodyHtml })}</div>`);
  }

  // Địa chỉ cho sitemap.xml (trang danh sách + từng tool)
  function allUrls(seo, tools) {
    const site = siteOf(seo), list = tools.map(norm);
    const last = list.map((x) => isoDay(x.updatedAt) || isoDay(x.createdAt)).filter(Boolean).sort().pop() || "";
    return [{ loc: site + "/tool/", lastmod: last }].concat(list.map((x) => ({ loc: site + toolUrl(x.id), lastmod: isoDay(x.updatedAt) || isoDay(x.createdAt) })));
  }

  return { slugify, plain, fmt, hex, MC, SHORT_MAX, DEFAULT_PLATFORMS, fold, searchEntry, score, norm, summary, cardHtml, hubBody, detailBody, buildToolPage, allUrls, toolUrl, safeUrl, imgUrl, RESERVED, DEF_LABEL };
});
