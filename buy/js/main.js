/* Trang /buy: khách dán mã → xem sản phẩm → tải file.
   Không chứa bí mật nào. File nằm trong repo private; Worker kiểm tra mã rồi truyền file về, trang này chỉ gọi API.
   Nếu đổi địa chỉ Worker, sửa API ở đây VÀ trong /admin/js/core.js. */
(() => {
  const API = "https://shinju-admin-api.git-api.workers.dev";
  const $ = (s) => document.querySelector(s);
  const el = { form: $("#f-code"), code: $("#code"), check: $("#btn-check"), err: $("#err"), res: $("#s-result"),
    name: $("#r-name"), chips: $("#r-chips"), file: $("#r-file"), dl: $("#btn-dl"), msg: $("#r-msg"), ttl: $("#r-ttl"), other: $("#btn-other") };

  // ---- chuẩn hoá mã (giống Worker): bỏ mọi ký tự không phải chữ/số; dán cả câu thì tìm 3 nhóm 5 ký tự ----
  const flat = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const norm = (s) => {
    const f = flat(s);
    if (f.length === 15) return f;
    const m = String(s || "").toUpperCase().match(/([2-9A-HJ-NP-Z]{5})[\s\-_.]*([2-9A-HJ-NP-Z]{5})[\s\-_.]*([2-9A-HJ-NP-Z]{5})/);
    return m ? m[1] + m[2] + m[3] : f;
  };
  const pretty = (c) => (c.match(/.{1,5}/g) || []).join("-");
  const mb = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + " GB" : (n / 1e6).toFixed(n < 1e7 ? 1 : 0) + " MB");

  let S = null; // {code, ticket, expAt, used0, filename, doneOnce}
  let timer = 0, poll = 0;

  async function call(path, opt) {
    const res = await fetch(API + path, opt);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "Lỗi " + res.status), { status: res.status, data });
    return data;
  }
  const redeem = (code) => call("/buy/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });

  function say(text, kind) { el.msg.textContent = text || ""; el.msg.className = "buy-msg" + (kind ? " " + kind : ""); }
  function chip(text) { const s = document.createElement("span"); s.className = "buy-chip"; s.textContent = text; return s; }

  function show(data, code) {
    S = { code, ticket: data.ticket, expAt: Date.now() + data.ttl * 1000, used0: data.used, filename: data.filename };
    el.name.textContent = data.product.name;
    el.file.textContent = data.filename;
    el.chips.replaceChildren(chip("💾 " + mb(data.product.size)), chip(`🔁 Còn ${data.remaining}/${data.max} lượt tải`));
    if (data.exp) el.chips.append(chip("⏳ Hạn dùng mã: " + new Date(data.exp).toLocaleDateString("vi-VN")));
    el.form.hidden = true; el.res.hidden = false;
    el.dl.disabled = false; el.dl.textContent = "⬇ Tải xuống";
    say(data.state === "downloading" ? "Đang có một lượt tải khác chạy với mã này. Đợi nó xong rồi thử lại." : "");
    clearInterval(timer); timer = setInterval(tick, 1000); tick();
  }
  function tick() {
    if (!S) return;
    const left = Math.max(0, Math.round((S.expAt - Date.now()) / 1000));
    el.ttl.textContent = left ? `Link tải còn hiệu lực ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "Link tải đã hết hạn, bấm “Tải xuống” để lấy link mới (không mất lượt).";
  }
  function reset() {
    clearInterval(timer); clearInterval(poll); S = null;
    el.res.hidden = true; el.form.hidden = false; el.code.value = ""; el.err.textContent = ""; el.code.classList.remove("bad");
    el.check.disabled = false; el.check.textContent = "Kiểm tra mã"; el.code.focus();
  }

  // ---- bước 1: nhập mã ----
  async function submit() {
    const code = norm(el.code.value);
    el.err.textContent = ""; el.code.classList.remove("bad");
    if (code.length !== 15) { el.err.textContent = "Mã gồm 15 ký tự (dạng XXXXX-XXXXX-XXXXX). Kiểm tra xem bạn đã dán đủ chưa."; el.code.classList.add("bad"); return; }
    el.check.disabled = true; el.check.textContent = "Đang kiểm tra…";
    try { show(await redeem(code), code); }
    catch (e) { el.err.textContent = e.message === "Failed to fetch" ? "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại." : e.message; el.code.classList.add("bad"); el.check.disabled = false; el.check.textContent = "Kiểm tra mã"; }
  }
  el.form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  el.code.addEventListener("input", () => { el.code.value = pretty(flat(el.code.value).slice(0, 15)); el.code.classList.remove("bad"); });
  el.code.addEventListener("paste", (e) => { // dán là kiểm tra luôn nếu đủ mã
    const c = norm((e.clipboardData || window.clipboardData).getData("text"));
    if (c.length === 15) { e.preventDefault(); el.code.value = pretty(c); submit(); }
  });
  el.other.addEventListener("click", reset);

  // ---- bước 2: tải ----
  async function startDownload() {
    if (!S) return;
    el.dl.disabled = true; say("Đang chuẩn bị…");
    try {
      if (S.doneOnce || Date.now() > S.expAt - 8000) { const d = await redeem(S.code); show(d, S.code); el.dl.disabled = true; } // vé cũ/đã dùng → lấy vé mới
      const s = await call("/buy/status?t=" + encodeURIComponent(S.ticket));
      if (s.state === "downloading") { say("Đang có một lượt tải khác chạy với mã này. Đợi nó xong rồi thử lại.", "warn"); el.dl.disabled = false; return; }
      if (s.state !== "active") { say(s.state === "used" ? "Mã đã dùng hết lượt tải." : "Mã này không còn dùng được. Liên hệ người bán.", "bad"); return; }
      S.used0 = s.used;
      const a = document.createElement("a"); a.href = API + "/buy/dl?t=" + encodeURIComponent(S.ticket); a.rel = "noopener"; a.style.display = "none";
      document.body.appendChild(a); a.click(); a.remove();
      say("Đã gửi yêu cầu tải. Nếu trình duyệt hỏi nơi lưu file, hãy chọn “Lưu”.");
      watch();
    } catch (e) { say(e.data && e.data.expired ? "Link tải đã hết hạn, bấm lại để lấy link mới." : e.message, "bad"); el.dl.disabled = false; }
  }
  el.dl.addEventListener("click", startDownload);

  // Theo dõi trạng thái từ máy chủ: máy chủ biết chính xác khi nào file đã gửi hết
  function watch() {
    clearInterval(poll);
    const t0 = Date.now(); let seen = false, hinted = false;
    poll = setInterval(async () => {
      if (!S) return clearInterval(poll);
      try {
        const s = await call("/buy/status?t=" + encodeURIComponent(S.ticket));
        if (s.used > S.used0) { // đã gửi trọn vẹn
          clearInterval(poll); S.doneOnce = true;
          say(s.remaining > 0 ? `✅ Tải xong! Hãy kiểm tra file trong thư mục Tải xuống. Mã còn ${s.remaining} lượt.` : "✅ Tải xong! Hãy kiểm tra file trong thư mục Tải xuống. Mã đã hết lượt.", "ok");
          el.dl.disabled = s.remaining <= 0; el.dl.textContent = s.remaining > 0 ? "⬇ Tải lại" : "Đã hết lượt";
          el.chips.firstChild && (el.chips.children[1].textContent = `🔁 Còn ${s.remaining}/${s.max} lượt tải`);
        } else if (s.state === "downloading") { seen = true; say("⏳ Đang tải về máy… vui lòng đừng đóng trang này.", "warn"); }
        else if (seen && s.dl === "failed") { clearInterval(poll); say("⚠️ Quá trình tải bị gián đoạn. Bạn chưa mất lượt nào, bấm “Tải xuống” để thử lại.", "bad"); el.dl.disabled = false; el.dl.textContent = "⬇ Thử tải lại"; S.doneOnce = true; }
        else if (!seen && !hinted && Date.now() - t0 > 12000) { hinted = true; say("Chưa thấy trình duyệt bắt đầu tải. Nếu có thông báo chặn tải xuống, hãy cho phép rồi bấm lại.", "warn"); el.dl.disabled = false; }
        if (Date.now() - t0 > 25 * 60 * 1000) clearInterval(poll);
      } catch (e) { if (e.data && e.data.expired) { clearInterval(poll); } /* mất mạng thoáng qua: thử lại ở nhịp sau */ }
    }, 2500);
  }

  el.code.focus();
})();
