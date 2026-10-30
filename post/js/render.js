/* Bộ render bài viết dùng chung (trang /post và trình soạn /admin/post): mã màu Minecraft, Markdown-lite, frontmatter. */
/* ============================================================== */
/* Minecraft color / format codes (§0-§9, §a-§f, §l §m §n §o, §r)   */
/* Dùng ký tự § (đúng chuẩn Minecraft) chứ KHÔNG dùng & nữa, để các */
/* chữ như "Q&A", "R&D", "H&M" hiển thị nguyên vẹn.                  */
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

// Converts "§e§lYellow bold§r normal" into styled <span> tags. Only
// touches "§x" sequences with a valid Minecraft code; "&" is plain text.
function parseMinecraftColors(text) {
    const tokens = text.split(/(§[0-9a-fk-or])/i);
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
        const m = tok.match(/^§([0-9a-fk-or])$/i);
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
// corrupts an href/src attribute.
function applyMinecraftColorsToHtml(html) {
    return html.replace(/(<[^>]+>)|([^<]+)/g, (whole, tag, text) =>
        // "&" lẻ (Q&A, R&D, H&M) → &amp; để HTML hợp lệ; thực thể thật (&lt; &#60; …) giữ nguyên.
        tag ? tag : parseMinecraftColors(text.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#\d+|#[xX][0-9a-fA-F]+);)/g, "&amp;"))
    );
}

/* ============================================================== */
/* Minimal markdown: images, links, raw HTML passthrough           */
/* ============================================================== */

// Thẻ khối mà người viết có thể gõ thẳng HTML vào bài. Chúng KHÔNG bao giờ được nằm trong <p>.
var MD_BLOCK_OPEN = /<(ul|ol|blockquote|pre|table|div|figure|details|h[1-6]|p|li)\b[^>]*>|<hr\b[^>]*>/gi;

// Tìm chỗ kết thúc của phần tử khối bắt đầu tại `from` (đã biết tên thẻ), có đếm lồng nhau cùng tên
// (<ul> trong <ul>). Trả về chỉ số ngay SAU thẻ đóng; -1 nếu không có thẻ đóng.
function mdFindClose(text, name, from) {
    var re = new RegExp("<(/?)" + name + "\\b[^>]*>", "gi"), depth = 1, m;
    re.lastIndex = from;
    while ((m = re.exec(text))) {
        if (m[1]) { if (--depth === 0) return m.index + m[0].length; }
        else depth++;
    }
    return -1;
}

// Văn bản trần (không có thẻ khối) → các đoạn <p>, ảnh đứng riêng, hoặc giữ nguyên nếu bắt đầu bằng <a>/<img>.
function mdParagraphs(text) {
    var out = [];
    text.split(/\n\s*\n/).forEach(function (block) {
        var trimmed = block.trim();
        if (!trimmed) return;
        // Một khối chỉ gồm một ảnh → ảnh đứng riêng
        var imgOnly = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgOnly) { out.push('<div class="post-image"><img src="' + imgOnly[2] + '" alt="' + imgOnly[1] + '" loading="lazy" /></div>'); return; }
        // Khối bắt đầu bằng <a> (nút) hoặc <img> → giữ nguyên như trước
        if (/^<(a|img)\b/i.test(trimmed)) { out.push(trimmed); return; }
        var inline = trimmed
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/\n/g, "<br>");
        out.push("<p>" + inline + "</p>");
    });
    return out;
}

function markdownLiteToHtml(md) {
    var text = String(md == null ? "" : md).replace(/\r\n/g, "\n").trim();
    var out = [], buf = "", pos = 0, orphan = [];

    function flushText() { if (buf.trim()) out.push.apply(out, mdParagraphs(buf)); buf = ""; }
    function flushOrphans() { if (orphan.length) { out.push("<ul>" + orphan.join("") + "</ul>"); orphan = []; } }

    MD_BLOCK_OPEN.lastIndex = 0;
    var m;
    while ((m = MD_BLOCK_OPEN.exec(text))) {
        var name = (m[1] || "hr").toLowerCase(), start = m.index, end;
        // Văn bản đứng trước thẻ khối → đoạn riêng (không nuốt thẻ khối vào <p>)
        buf += text.slice(pos, start);
        if (name === "hr") end = start + m[0].length;
        else {
            end = mdFindClose(text, name, start + m[0].length);
            if (end < 0) { // thiếu thẻ đóng: li/p/h* kết thúc ở dòng trống kế tiếp; còn lại (ul, pre…) lấy tới hết bài
                var blank = /^(li|p|h[1-6])$/.test(name) ? text.slice(start).search(/\n\s*\n/) : -1;
                end = blank < 0 ? text.length : start + blank;
            }
        }
        var el = text.slice(start, end).trim();
        // Chữ đứng trước phần tử → thành đoạn riêng; <li> mồ côi gom trước đó phải ra trước chữ này.
        if (buf.trim()) { flushOrphans(); flushText(); }
        buf = "";
        if (name === "li") orphan.push(el); // <li> không nằm trong <ul>/<ol> → gom các <li> liền nhau thành một <ul>
        else { flushOrphans(); out.push(el); }
        pos = end;
        MD_BLOCK_OPEN.lastIndex = end;
    }
    buf += text.slice(pos);
    if (buf.trim()) { flushOrphans(); flushText(); }
    flushOrphans();
    return out.join("\n");
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
            // &#60; thay vì &lt; chỉ để dễ phân biệt dấu < lẻ do sanitizer sinh ra.
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
