/* product/tools/common.js — thư viện dùng chung cho các công cụ ảnh (convert-image, crop-image, compress-image).
   Mọi thứ chạy 100% trên trình duyệt: ảnh được đọc bằng File API, xử lý bằng <canvas>, đóng gói .zip bằng bộ ghi zip tự viết (không thư viện ngoài, không gọi mạng).
   Mỗi công cụ đăng ký: ShinjuTools.tools["tên"] = { mount(root) } — product/js/main.js sẽ gọi mount() sau khi nạp file. */
(function () {
  "use strict";
  const NS = (window.ShinjuTools = window.ShinjuTools || { tools: {} });
  if (NS.ready) return;
  NS.ready = true;

  /* ---------------- DOM helper ---------------- */
  // h("div", { class: "x", onclick: fn, "data-a": 1 }, "text", child, [children])
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "value") el.value = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    const add = (c) => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.appendChild(c.nodeType ? c : document.createTextNode(String(c))); };
    kids.forEach(add);
    return el;
  }
  NS.h = h;

  /* ---------------- Tiện ích ---------------- */
  let uid = 0;
  NS.uid = (p = "t") => `${p}${++uid}`;
  NS.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  NS.sleep = (ms = 0) => new Promise((r) => setTimeout(r, ms));
  NS.fmtBytes = (n) => {
    n = Number(n) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
    return `${(n / 1048576).toFixed(n < 10485760 ? 2 : 1)} MB`;
  };
  NS.EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
  NS.LABEL = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP", "image/avif": "AVIF", "image/gif": "GIF", "image/bmp": "BMP", "image/svg+xml": "SVG" };
  NS.baseName = (name) => String(name || "image").replace(/\.[^./\\]+$/, "") || "image";
  NS.safeName = (s) => String(s || "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  // Tên file không trùng trong cùng một lần xuất (a.webp, a (2).webp…)
  NS.uniqueName = (name, used) => {
    let n = name, i = 2; const dot = name.lastIndexOf("."), b = dot > 0 ? name.slice(0, dot) : name, e = dot > 0 ? name.slice(dot) : "";
    while (used.has(n.toLowerCase())) n = `${b} (${i++})${e}`;
    used.add(n.toLowerCase()); return n;
  };
  const IMG_EXT = /\.(jpe?g|png|webp|avif|gif|bmp|svg|ico|heic|heif|tiff?)$/i;
  NS.isImageFile = (f) => !!f && ((f.type && f.type.startsWith("image/")) || IMG_EXT.test(f.name || ""));
  NS.download = (blob, name) => {
    const a = h("a", { href: URL.createObjectURL(blob), download: name, style: { display: "none" } });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };

  /* ---------------- Mã hóa ảnh ---------------- */
  const encCache = {};
  // Trình duyệt có THỰC SỰ xuất được định dạng này bằng canvas không (AVIF/WebP tùy trình duyệt)
  NS.canEncode = (mime) => {
    if (mime === "image/png" || mime === "image/jpeg") return Promise.resolve(true);
    return (encCache[mime] = encCache[mime] || new Promise((res) => {
      try { const c = document.createElement("canvas"); c.width = c.height = 2; c.toBlob((b) => res(!!b && b.type === mime), mime, 0.8); } catch (e) { res(false); }
    }));
  };
  NS.encode = (canvas, mime, quality) => new Promise((res, rej) => {
    try {
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("Trình duyệt không xuất được ảnh (có thể ảnh quá lớn)"))), mime, mime === "image/png" ? undefined : quality);
    } catch (e) { rej(e); }
  });

  /* ---------------- Đọc ảnh ---------------- */
  // Trả về { src, width, height, close() } — src dùng được với drawImage. Tự xoay theo EXIF.
  NS.loadImage = async (file) => {
    if (window.createImageBitmap) {
      try { const bmp = await createImageBitmap(file); if (bmp.width && bmp.height) return { src: bmp, width: bmp.width, height: bmp.height, close() { try { bmp.close(); } catch (e) { /* bỏ qua */ } } }; } catch (e) { /* thử cách dưới */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Trình duyệt không đọc được định dạng ảnh này")); i.src = url; });
      const w = img.naturalWidth, hgt = img.naturalHeight;
      if (!w || !hgt) throw new Error("Không đọc được kích thước ảnh");
      return { src: img, width: w, height: hgt, close() { URL.revokeObjectURL(url); } };
    } catch (e) { URL.revokeObjectURL(url); throw e; }
  };

  // Vẽ vùng (sx,sy,sw,sh) của ảnh vào canvas w×h. Thu nhỏ nhiều lần (÷2) để ảnh mịn hơn khi giảm mạnh.
  NS.drawScaled = (img, sx, sy, sw, sh, w, hgt, bg) => {
    const mk = (cw, ch) => { const c = document.createElement("canvas"); c.width = cw; c.height = ch; return c; };
    let src = img.src, cx = sx, cy = sy, cw = sw, ch = sh;
    while (cw / 2 >= w && ch / 2 >= hgt) { // còn giảm hơn 2 lần → giảm nửa
      const nw = Math.max(1, Math.round(cw / 2)), nh = Math.max(1, Math.round(ch / 2)), t = mk(nw, nh), tx = t.getContext("2d");
      tx.imageSmoothingEnabled = true; tx.imageSmoothingQuality = "high";
      tx.drawImage(src, cx, cy, cw, ch, 0, 0, nw, nh);
      src = t; cx = 0; cy = 0; cw = nw; ch = nh;
    }
    const out = mk(w, hgt), ctx = out.getContext("2d");
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, hgt); }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, cx, cy, cw, ch, 0, 0, w, hgt);
    return out;
  };
  NS.freeCanvas = (c) => { if (c) { c.width = 1; c.height = 1; } }; // giải phóng bộ nhớ (Safari)

  // Tạo một mục ảnh: đọc kích thước + ảnh xem trước nhỏ
  NS.makeItem = async (file) => {
    const item = { id: NS.uid("i"), file, name: file.name || "image", base: NS.baseName(file.name), type: file.type || "", size: file.size, width: 0, height: 0, thumb: "", status: "idle", msg: "", out: null };
    try {
      const img = await NS.loadImage(file);
      item.width = img.width; item.height = img.height;
      const k = Math.min(1, 160 / Math.max(img.width, img.height)), tw = Math.max(1, Math.round(img.width * k)), th = Math.max(1, Math.round(img.height * k));
      const c = NS.drawScaled(img, 0, 0, img.width, img.height, tw, th);
      img.close();
      const blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.7));
      if (blob) item.thumb = URL.createObjectURL(blob);
      NS.freeCanvas(c);
    } catch (e) { item.status = "error"; item.msg = e.message || "Không đọc được ảnh"; }
    return item;
  };
  // ---- Giới hạn để không làm sập trình duyệt (nhất là điện thoại): mọi ảnh gốc + kết quả đều nằm trong RAM của tab ----
  NS.LIMITS = { files: 100, bytes: 800 * 1024 * 1024 };
  // Nhận bao nhiêu file trong `files` mà vẫn trong giới hạn so với `items` đang có. Trả { ok, skipped }.
  NS.takeWithinLimit = (items, files) => {
    let n = items.length, bytes = items.reduce((s, i) => s + (i.size || 0), 0);
    const ok = [];
    for (const f of files) {
      if (n + 1 > NS.LIMITS.files || bytes + f.size > NS.LIMITS.bytes) break;
      ok.push(f); n++; bytes += f.size;
    }
    return { ok, skipped: files.length - ok.length };
  };
  NS.limitMessage = (skipped) => `Đã bỏ qua ${skipped} ảnh vì vượt giới hạn (tối đa ${NS.LIMITS.files} ảnh / ${Math.round(NS.LIMITS.bytes / 1048576)} MB mỗi lượt để tránh treo trình duyệt). Hãy xử lý theo từng đợt.`;

  // Ảnh động (GIF nhiều khung, WebP động, APNG)? Canvas chỉ vẽ được khung đầu nên cần biết để cảnh báo/giữ nguyên.
  NS.isAnimated = async (file) => {
    try {
      const t = file.type;
      if (t === "image/gif") {
        const u = new Uint8Array(await file.slice(0, 8 * 1024 * 1024).arrayBuffer()); let frames = 0;
        for (let i = 0; i < u.length - 3; i++) if (u[i] === 0x21 && u[i + 1] === 0xf9 && u[i + 2] === 0x04 && ++frames > 1) return true; // Graphic Control Extension
        return false;
      }
      if (t === "image/webp") { const u = new Uint8Array(await file.slice(0, 64).arrayBuffer()); return u[12] === 0x56 && u[13] === 0x50 && u[14] === 0x38 && u[15] === 0x58 && (u[20] & 0x02) !== 0; } // VP8X + cờ animation
      if (t === "image/png") { const s = new TextDecoder("latin1").decode(await file.slice(0, 65536).arrayBuffer()); const a = s.indexOf("acTL"); return a > 0 && (s.indexOf("IDAT") < 0 || a < s.indexOf("IDAT")); }
    } catch (e) { /* không đoán được → coi như ảnh tĩnh */ }
    return false;
  };
  NS.disposeItem = (item) => { if (item.thumb) URL.revokeObjectURL(item.thumb); if (item.url) URL.revokeObjectURL(item.url); if (item.out && item.out.url) URL.revokeObjectURL(item.out.url); };

  /* ---------------- Zip (không nén, đủ cho ảnh vốn đã nén) ---------------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  // files: [{ name, blob }] → Blob .zip (tên UTF-8). onProgress(done, total)
  NS.makeZip = async (files, onProgress) => {
    const enc = new TextEncoder(), parts = [], central = [], d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    let offset = 0, total = 0;
    if (files.length > 65000) throw new Error("Quá nhiều file cho một gói zip");
    for (let i = 0; i < files.length; i++) {
      const f = files[i], data = new Uint8Array(await f.blob.arrayBuffer()), name = enc.encode(f.name), crc = crc32(data);
      total += data.length; if (total > 0xf0000000 || offset > 0xf0000000) throw new Error("Tổng dung lượng quá lớn cho một gói zip (>3.5 GB), hãy chia nhỏ đợt xuất");
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, time, true); lh.setUint16(12, date, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, name, f.blob); // đẩy Blob (trình duyệt tự giữ/đưa ra đĩa) thay vì bản sao byte → không nhân đôi RAM
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(ch.buffer, name);
      offset += 30 + name.length + data.length;
      if (onProgress) onProgress(i + 1, files.length);
      if (i % 4 === 3) await NS.sleep(0);
    }
    const cdSize = central.reduce((s, p) => s + (p.byteLength != null ? p.byteLength : p.length), 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type: "application/zip" });
  };

  /* ---------------- Nhận file: chọn, kéo thả (cả thư mục), dán ---------------- */
  async function filesFromDrop(dt) {
    const out = [], items = dt.items ? Array.from(dt.items) : [];
    const entries = items.map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)).filter(Boolean);
    if (!entries.length) return Array.from(dt.files || []);
    const walk = async (en) => {
      if (en.isFile) { await new Promise((r) => en.file((f) => { out.push(f); r(); }, r)); return; }
      if (!en.isDirectory) return;
      const rd = en.createReader();
      for (;;) { const batch = await new Promise((r) => rd.readEntries(r, () => r([]))); if (!batch.length) break; for (const e of batch) await walk(e); }
    };
    for (const en of entries) await walk(en);
    return out;
  }

  // Vùng thả ảnh. onFiles(files[]) nhận các file ảnh hợp lệ. Trả về { el, setCompact(bool) }.
  NS.dropzone = ({ icon = "🖼️", title = "Kéo thả ảnh vào đây hoặc bấm để chọn", hint = "Chọn được nhiều ảnh cùng lúc · JPG, PNG, WebP, AVIF, GIF, BMP, SVG", onFiles }) => {
    const input = h("input", { type: "file", accept: "image/*", multiple: true, class: "t-sr", "aria-label": "Chọn ảnh từ máy" });
    const dir = h("input", { type: "file", multiple: true, class: "t-sr", tabindex: "-1", "aria-hidden": "true" });
    dir.setAttribute("webkitdirectory", ""); dir.setAttribute("directory", "");
    const note = h("span", { class: "t-drop-note", role: "status" });
    const give = (files) => {
      const imgs = files.filter(NS.isImageFile), skipped = files.length - imgs.length;
      note.textContent = skipped ? `Đã bỏ qua ${skipped} file không phải ảnh.` : "";
      if (imgs.length) onFiles(imgs);
    };
    const pick = h("button", { type: "button", class: "t-link", onclick: (e) => { e.preventDefault(); e.stopPropagation(); dir.click(); } }, "hoặc chọn cả thư mục");
    const el = h("label", { class: "t-drop" }, input, h("span", { class: "t-drop-icon", "aria-hidden": "true" }, icon), h("span", { class: "t-drop-title" }, title), h("span", { class: "t-drop-hint" }, hint), pick, dir, note);
    input.addEventListener("change", () => { give(Array.from(input.files)); input.value = ""; });
    dir.addEventListener("change", () => { give(Array.from(dir.files)); dir.value = ""; });
    ["dragenter", "dragover"].forEach((t) => el.addEventListener(t, (e) => { e.preventDefault(); el.classList.add("is-over"); }));
    ["dragleave", "dragend"].forEach((t) => el.addEventListener(t, () => el.classList.remove("is-over")));
    el.addEventListener("drop", async (e) => { e.preventDefault(); el.classList.remove("is-over"); give(await filesFromDrop(e.dataTransfer)); });
    // Ctrl+V dán ảnh từ clipboard
    document.addEventListener("paste", (e) => { if (!document.body.contains(el)) return; const f = Array.from((e.clipboardData && e.clipboardData.files) || []); if (f.length) give(f); });
    return { el, setCompact: (b) => el.classList.toggle("is-compact", !!b) };
  };

  /* ---------------- Điều khiển cài đặt ---------------- */
  // Nhóm nút chọn 1 (radio thật → dùng được bằng bàn phím và trình đọc màn hình)
  NS.segmented = ({ label, options, value, onChange, hint }) => {
    const name = NS.uid("seg"), wrap = h("div", { class: "t-field" }), box = h("div", { class: "t-seg", role: "radiogroup", "aria-label": label });
    const inputs = {};
    options.forEach((o) => {
      const inp = h("input", { type: "radio", name, value: o.value, checked: o.value === value, disabled: o.disabled });
      inp.addEventListener("change", () => { if (inp.checked) onChange(o.value); });
      inputs[o.value] = inp;
      box.appendChild(h("label", { title: o.title }, inp, h("span", {}, o.label)));
    });
    wrap.append(h("div", { class: "t-label" }, label), box);
    if (hint) wrap.appendChild(h("div", { class: "t-hint" }, hint));
    return { el: wrap, set(v) { if (inputs[v]) inputs[v].checked = true; }, disable(v, b) { if (inputs[v]) inputs[v].disabled = b; } };
  };
  NS.slider = ({ label, min, max, step = 1, value, fmt = (v) => v, onChange, hint }) => {
    const id = NS.uid("rg"), out = h("output", { for: id, class: "t-out" }, fmt(value));
    const inp = h("input", { type: "range", id, min, max, step, value, class: "t-range" });
    inp.addEventListener("input", () => { out.textContent = fmt(+inp.value); onChange(+inp.value); });
    const wrap = h("div", { class: "t-field" }, h("label", { class: "t-label", for: id }, label, " ", out), inp);
    if (hint) wrap.appendChild(h("div", { class: "t-hint" }, hint));
    return { el: wrap, input: inp, set(v) { inp.value = v; out.textContent = fmt(+v); }, disable(b) { inp.disabled = b; wrap.classList.toggle("is-off", b); } };
  };
  NS.select = ({ label, options, value, onChange, hint }) => {
    const id = NS.uid("sl"), sel = h("select", { id, class: "t-input" }, options.map((o) => h("option", { value: o.value, selected: o.value === value }, o.label)));
    sel.addEventListener("change", () => onChange(sel.value));
    const wrap = h("div", { class: "t-field" }, h("label", { class: "t-label", for: id }, label), sel);
    if (hint) wrap.appendChild(h("div", { class: "t-hint" }, hint));
    return { el: wrap, sel, set(v) { sel.value = v; } };
  };
  NS.numberField = ({ label, min, max, value, unit, onChange, hint, step = 1 }) => {
    const id = NS.uid("nm"), inp = h("input", { type: "number", id, min, max, step, value, class: "t-input", inputmode: "numeric" });
    inp.addEventListener("input", () => onChange(inp.value === "" ? NaN : +inp.value));
    const wrap = h("div", { class: "t-field" }, h("label", { class: "t-label", for: id }, label), h("div", { class: "t-inline" }, inp, unit ? h("span", { class: "t-unit" }, unit) : null));
    if (hint) wrap.appendChild(h("div", { class: "t-hint" }, hint));
    return { el: wrap, input: inp, show(b) { wrap.hidden = !b; } };
  };
  NS.textField = ({ label, value, onChange, placeholder, hint }) => {
    const id = NS.uid("tx"), inp = h("input", { type: "text", id, value, placeholder, class: "t-input", autocomplete: "off", spellcheck: "false" });
    inp.addEventListener("input", () => onChange(inp.value));
    const wrap = h("div", { class: "t-field" }, h("label", { class: "t-label", for: id }, label), inp);
    if (hint) wrap.appendChild(h("div", { class: "t-hint" }, hint));
    return { el: wrap, input: inp };
  };
  NS.colorField = ({ label, value, onChange, hint }) => {
    const id = NS.uid("cl"), inp = h("input", { type: "color", id, value, class: "t-color" });
    inp.addEventListener("input", () => onChange(inp.value));
    const wrap = h("div", { class: "t-field" }, h("label", { class: "t-label", for: id }, label), h("div", { class: "t-inline" }, inp, h("code", { class: "t-unit" }, value)));
    const code = wrap.querySelector("code"); inp.addEventListener("input", () => { code.textContent = inp.value; });
    if (hint) wrap.appendChild(h("div", { class: "t-hint" }, hint));
    return { el: wrap, show(b) { wrap.hidden = !b; } };
  };
  NS.panel = (title, ...kids) => h("section", { class: "t-panel" }, title ? h("h2", {}, title) : null, ...kids);

  /* ---------------- Thanh thao tác (chạy / zip / xóa / tiến độ) ---------------- */
  NS.actionBar = ({ runLabel, onRun, onZip, onClear }) => {
    const run = h("button", { type: "button", class: "t-btn green", onclick: () => onRun() }, runLabel);
    const zip = h("button", { type: "button", class: "t-btn blue", onclick: () => onZip(), disabled: true }, "⬇ Tải tất cả (.zip)");
    const clear = h("button", { type: "button", class: "t-btn gray", onclick: () => onClear() }, "Xóa hết");
    const summary = h("div", { class: "t-summary", role: "status", "aria-live": "polite" });
    const fill = h("i"), bar = h("div", { class: "t-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0", hidden: true }, fill);
    const el = h("div", { class: "t-actionbar" }, h("div", { class: "t-actions" }, run, zip, clear, summary), bar);
    return {
      el, run, zip, clear,
      busy(b) { run.disabled = b || run.dataset.off === "1"; clear.disabled = b; if (b) zip.disabled = true; },
      canRun(b) { run.dataset.off = b ? "0" : "1"; run.disabled = !b; },
      canZip(b) { zip.disabled = !b; },
      label(s) { run.textContent = s; },
      summary(s) { summary.textContent = s || ""; },
      progress(done, total) { bar.hidden = !total || done >= total; const p = total ? Math.round((done / total) * 100) : 0; fill.style.width = p + "%"; bar.setAttribute("aria-valuenow", String(p)); },
    };
  };

  /* ---------------- Danh sách ảnh (dùng cho đổi định dạng / nén) ---------------- */
  const STATUS = { idle: "Chờ xử lý", working: "Đang xử lý…", done: "Xong", error: "Lỗi", stale: "Cần chạy lại" };
  NS.rowList = ({ onRemove, describe, resultText }) => {
    const ul = h("ul", { class: "t-list", "aria-label": "Danh sách ảnh" }), rows = new Map();
    const savedBtn = (it) => h("button", { type: "button", class: "t-icon-btn", title: "Tải ảnh này", "aria-label": `Tải ${it.name}`, onclick: () => it.out && NS.download(it.out.blob, it.out.name) }, "⬇");
    function build(it) {
      const thumb = h("img", { class: "t-row-thumb", alt: "", src: it.thumb || undefined, width: 56, height: 56 });
      const name = h("div", { class: "t-row-name", title: it.name }, it.name), meta = h("div", { class: "t-row-meta" });
      const badge = h("span", { class: "t-badge" }), res = h("span", { class: "t-row-res" });
      const save = savedBtn(it); save.hidden = true;
      const rm = h("button", { type: "button", class: "t-icon-btn danger", title: "Bỏ ảnh này", "aria-label": `Bỏ ${it.name}`, onclick: () => onRemove(it) }, "✕");
      const bar = h("i"), prog = h("div", { class: "t-row-bar", hidden: true }, bar);
      const li = h("li", { class: "t-row" }, thumb, h("div", { class: "t-row-main" }, name, meta), h("div", { class: "t-row-out" }, badge, res), h("div", { class: "t-row-actions" }, save, rm), prog);
      rows.set(it.id, { li, thumb, meta, badge, res, save, prog, bar });
      ul.appendChild(li); return rows.get(it.id);
    }
    function update(it) {
      const r = rows.get(it.id) || build(it);
      r.li.dataset.status = it.status === "done" && it.out && (it.out.missed || it.out.animated) ? "warn" : it.status;
      if (it.thumb && r.thumb.getAttribute("src") !== it.thumb) r.thumb.src = it.thumb;
      r.meta.textContent = describe(it);
      r.badge.textContent = it.status === "error" && it.msg ? "Lỗi" : it.status === "done" && it.out && it.out.missed ? "Chưa đạt mục tiêu" : it.status === "done" && it.out && it.out.animated ? "Giữ nguyên" : STATUS[it.status] || "";
      r.res.textContent = it.status === "error" ? it.msg : it.status === "done" || it.status === "stale" ? resultText(it) : "";
      r.save.hidden = !(it.out && it.status === "done");
      r.prog.hidden = it.status !== "working";
    }
    function remove(it) { const r = rows.get(it.id); if (r) { r.li.remove(); rows.delete(it.id); } }
    function clear() { rows.forEach((r) => r.li.remove()); rows.clear(); }
    return { el: ul, update, remove, clear };
  };

  /* ---------------- Cài đặt chung cho kích thước chữ số ---------------- */
  NS.pct = (before, after) => (before > 0 ? Math.round((1 - after / before) * 100) : 0);
  NS.plural = (n, s) => `${n} ${s}`;

  // Khung tool: gom phần giới thiệu "chạy trên máy bạn"
  NS.privacyNote = () => h("p", { class: "t-privacy" }, "🔒 Ảnh được xử lý ngay trên máy bạn, không tải lên máy chủ nào. Đóng tab là ảnh biến mất.");
})();
