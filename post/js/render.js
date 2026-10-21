/* Bộ render bài viết dùng chung (trang /post và trình soạn /admin/post): mã màu Minecraft, Markdown-lite, frontmatter. */
/* ============================================================== */
/* Minecraft color / format codes (&0-&9, &a-&f, &l &m &n &o, &r) */
/* ============================================================== */

const MC_COLORS = {
    "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
    "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
    "8": "#555555", "9": "#5555FF", a: "#55FF55", b: "#55FFFF",
    c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF",
};

const MC_FORMATS = {
    l: "font-weight:bold;",
    m: "text-decoration:line-through;",
    n: "text-decoration:underline;",
    o: "font-style:italic;",
};

// Converts "&e&lYellow bold&r normal" into styled <span> tags. Only
// touches "&x" sequences with a valid Minecraft code, so it's safe to
// run over ordinary text containing a stray "&".
function parseMinecraftColors(text) {
    const tokens = text.split(/(&[0-9a-fk-or])/i);
    let color = null;
    const formats = new Set();
    let html = "";
    let openSpan = false;

    function closeSpan() {
        if (openSpan) {
            html += "</span>";
            openSpan = false;
        }
    }

    tokens.forEach((tok) => {
        const m = tok.match(/^&([0-9a-fk-or])$/i);
        if (m) {
            const code = m[1].toLowerCase();
            if (code === "r") {
                closeSpan();
                color = null;
                formats.clear();
            } else if (MC_COLORS[code]) {
                closeSpan();
                color = MC_COLORS[code];
                formats.clear(); // a new color code resets active formats too
            } else if (MC_FORMATS[code]) {
                formats.add(code);
            } else if (code === "k") {
                formats.add("k");
            }
            return;
        }
        if (!tok) return;

        let style = "";
        let extraClass = "";
        if (color) style += `color:${color};`;
        formats.forEach((f) => {
            if (f === "k") extraClass = "mc-obfuscated";
            else style += MC_FORMATS[f] || "";
        });

        if (style || extraClass) {
            closeSpan();
            html += `<span${extraClass ? ` class="${extraClass}"` : ""}${style ? ` style="${style}"` : ""}>`;
            openSpan = true;
        }
        html += tok;
    });

    closeSpan();
    return html;
}

// Applies Minecraft colors only to text between HTML tags, so it never
// corrupts an href/src attribute (e.g. a query string containing "&e=1").
function applyMinecraftColorsToHtml(html) {
    return html.replace(/(<[^>]+>)|([^<]+)/g, (whole, tag, text) =>
        tag ? tag : parseMinecraftColors(text)
    );
}

/* ============================================================== */
/* Minimal markdown: images, links, raw HTML passthrough           */
/* ============================================================== */

function markdownLiteToHtml(md) {
    const text = md.replace(/\r\n/g, "\n").trim();
    const blocks = text.split(/\n\s*\n/);

    const htmlBlocks = blocks.map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";

        // A block that is just one image on its own -> block-level figure
        const imgOnly = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgOnly) {
            const [, alt, url] = imgOnly;
            return `<div class="post-image"><img src="${url}" alt="${alt}" loading="lazy" /></div>`;
        }

        // A block that already starts with a block-level HTML tag (e.g. a
        // <a class="btn"> button on its own line) — leave it as-is.
        if (/^<(div|a|img|h[1-6]|blockquote|ul|ol)\b/i.test(trimmed)) {
            return trimmed;
        }

        const inline = trimmed
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/\n/g, "<br>");

        return `<p>${inline}</p>`;
    });

    return htmlBlocks.filter(Boolean).join("\n");
}

/* ============================================================== */
/* Bộ lọc XSS cho nội dung bài (allowlist, KHÔNG cần DOM)          */
/* Chạy được ở trình duyệt, /admin và Node (tools/prerender.js).   */
/*  • Chỉ giữ các thẻ/thuộc tính trong danh sách cho phép; mọi     */
/*    on*=, style=, id=, srcset… đều bị bỏ.                        */
/*  • Link/ảnh chỉ nhận http(s), mailto, tel (ảnh: thêm data:image */
/*    raster); javascript:, vbscript:, data:text/html… bị bỏ.      */
/*  • script/style/iframe/object/embed/form/svg… bị xóa cả nội dung.*/
/*  • Không tự cân bằng thẻ: giữ nguyên cách trình duyệt tự sửa như trước. */
/* ============================================================== */
var sanitizePostHtml = (function () {
    var OK_TAGS = "p br hr h1 h2 h3 h4 h5 h6 ul ol li blockquote a img div span strong b em i u s del ins mark small sup sub code pre table thead tbody tfoot tr th td caption figure figcaption details summary".split(" ");
    var ALLOW = {};
    OK_TAGS.forEach(function (t) { ALLOW[t] = { class: 1, title: 1 }; });
    ALLOW.a.href = ALLOW.a.target = ALLOW.a["data-seconds"] = 1;
    ALLOW.img.src = ALLOW.img.alt = ALLOW.img.width = ALLOW.img.height = ALLOW.img.loading = 1;
    ALLOW.td.colspan = ALLOW.td.rowspan = ALLOW.th.colspan = ALLOW.th.rowspan = 1;
    var DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template|textarea|title|svg|math|form|select|xmp|plaintext)\b[\s\S]*?<\/\1\s*>/gi;
    var TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|</g;
    var ATTR = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

    function decode(v) {
        return String(v).replace(/&(?:#x([0-9a-f]+)|#(\d+));?|&(amp|lt|gt|quot|apos|nbsp|colon|tab|newline);/gi, function (m, hex, dec, name) {
            if (name) return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", colon: ":", tab: "\t", newline: "\n" }[name.toLowerCase()];
            var cp = hex ? parseInt(hex, 16) : parseInt(dec, 10);
            try { return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""; } catch (e) { return ""; }
        });
    }
    function esc(v) { return String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    // Trả về URL nếu an toàn, null nếu không. Kiểm tra trên bản đã giải mã & bỏ ký tự điều khiển (trình duyệt cũng bỏ chúng trong scheme).
    function safeUrl(v, isImg) {
        v = String(v).trim();
        var c = v.replace(/[\u0000-\u0020\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\ufeff]/g, "");
        var m = c.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*):/);
        if (!m) return v; // đường dẫn tương đối, #mục, ?query, //host
        var sc = m[1].toLowerCase();
        if (sc === "http" || sc === "https") return v;
        if (!isImg && (sc === "mailto" || sc === "tel")) return v;
        if (isImg && sc === "data" && /^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+\/=]+$/i.test(c)) return v;
        return null;
    }
    function cleanAttrs(tag, rest) {
        var allow = ALLOW[tag], seen = {}, out = "", blank = false, m, hasSrc = tag !== "img";
        ATTR.lastIndex = 0;
        while ((m = ATTR.exec(rest))) {
            var n = m[1].toLowerCase();
            if (!allow[n] || seen[n]) continue;
            var v = decode(m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : "");
            if (n === "href") { v = safeUrl(v, false); if (v === null) continue; }
            else if (n === "src") { v = safeUrl(v, true); if (v === null || !v) continue; hasSrc = true; }
            else if (n === "class") { v = v.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim().slice(0, 100); if (!v) continue; }
            else if (n === "target") { v = v.toLowerCase(); if (v !== "_blank" && v !== "_self") continue; blank = v === "_blank"; }
            else if (n === "width" || n === "height" || n === "colspan" || n === "rowspan" || n === "data-seconds") { if (!/^\d{1,4}$/.test(v)) continue; }
            else if (n === "loading") { v = v.toLowerCase(); if (v !== "lazy" && v !== "eager") continue; }
            else v = v.slice(0, 300); // title, alt
            seen[n] = 1;
            out += " " + n + '="' + esc(v) + '"';
        }
        if (!hasSrc) return null; // <img> không có src hợp lệ → bỏ cả thẻ
        if (blank) out += ' rel="noopener noreferrer"';
        return out;
    }

    return function (html) {
        return String(html == null ? "" : html).replace(DROP_WITH_CONTENT, "").replace(TOKEN, function (m, close, name, rest) {
            // &#60; (không phải &lt;) vì &l… bị bộ mã màu Minecraft hiểu nhầm là mã in đậm.
            if (m === "<") return "&#60;"; // dấu < lẻ → thành chữ
            if (m.indexOf("<!--") === 0) return ""; // chú thích HTML
            name = name.toLowerCase();
            if (!ALLOW[name]) return ""; // thẻ không được phép: bỏ thẻ, giữ chữ bên trong
            if (close) return "</" + name + ">";
            var attrs = cleanAttrs(name, rest);
            return attrs === null ? "" : "<" + name + attrs + ">";
        });
    };
})();

function renderPostBody(rawMarkdown) {
    // Lọc XSS TRƯỚC khi áp mã màu Minecraft (mã màu tự sinh <span style> an toàn nên phải thêm sau cùng).
    return applyMinecraftColorsToHtml(sanitizePostHtml(markdownLiteToHtml(rawMarkdown)));
}

/* ============================================================== */
/* Frontmatter parsing                                              */
/* ============================================================== */

function parseFrontmatter(raw) {
    const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!match) return { meta: {}, body: raw };
    const meta = {};
    match[1].split("\n").forEach((line) => {
        const m = line.match(/^([\w-]+):\s*"?([^"]*?)"?\s*$/);
        if (m) meta[m[1]] = m[2];
    });
    return { meta, body: match[2] };
}
