/* Tiện ích cho Kho ảnh: tên ngẫu nhiên 8 ký tự, chia lô commit, đuôi file. */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.ImgUtil = factory(); })(typeof window !== "undefined" ? window : this, function () {
  const C = globalThis.crypto || require("crypto").webcrypto, ALPHA = "abcdefghijklmnopqrstuvwxyz0123456789";
  const pick = (n) => { const b = new Uint32Array(1), lim = 4294967296 - (4294967296 % n); let x; do { C.getRandomValues(b); x = b[0]; } while (x >= lim); return x % n; };
  // Tên 8 ký tự a-z0-9 (chữ thường để không trùng kiểu hoa/thường trên Windows), không trùng tên đã có (không tính đuôi)
  const rand8 = (used) => { let s; do { s = Array.from({ length: 8 }, () => ALPHA[pick(36)]).join(""); } while (used.has(s)); used.add(s); return s; };
  // Chia các mục thành lô: mỗi lô tối đa maxChars ký tự base64 và maxCount file (để mỗi commit nằm trong giới hạn của Worker)
  function chunk(items, maxChars = 3000000, maxCount = 30) {
    const out = []; let cur = [], size = 0;
    for (const it of items) {
      const n = it.b64.length;
      if (cur.length && (size + n > maxChars || cur.length >= maxCount)) { out.push(cur); cur = []; size = 0; }
      cur.push(it); size += n;
    }
    if (cur.length) out.push(cur);
    return out;
  }
  const EXT = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/svg+xml": "svg", "image/avif": "avif" };
  const extFor = (mime) => EXT[mime] || "png";
  const fmtSize = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
  return { rand8, chunk, extFor, fmtSize };
});
