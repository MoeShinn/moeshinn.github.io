/* Trang /buy: khách dán mã → xem sản phẩm → tải file.
   Không chứa bí mật nào. File nằm trong repo private; Worker kiểm tra mã rồi truyền file về, trang này chỉ gọi API.
   Nếu đổi địa chỉ Worker, sửa API ở đây VÀ trong /admin/js/core.js. */
(() => {
  const API = "https://admin-api.git-api.workers.dev";
  const $ = (s) => document.querySelector(s);
  const el = { form: $("#f-code"), code: $("#code"), check: $("#btn-check"), err: $("#err"), res: $("#s-result"),
    name: $("#r-name"), chips: $("#r-chips"), file: $("#r-file"), dl: $("#btn-dl"), msg: $("#r-msg"), ttl: $("#r-ttl"), other: $("#btn-other"),
    prog: $("#r-prog"), bar: $("#r-bar"), ptxt: $("#r-ptxt"), cancel: $("#btn-cancel") };

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

  let S = null; // {code, ticket, expAt, used0, filename, size, doneOnce}
  let timer = 0, poll = 0;
  let busy = false;      // đang có một lượt tải chạy trong trang này → khoá nút, khoá "Nhập mã khác", cảnh báo khi đóng tab
  let abortCtl = null;   // AbortController của lượt tải đang chạy (nút "Huỷ tải")
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    S = { code, ticket: data.ticket, expAt: Date.now() + data.ttl * 1000, used0: data.used, filename: data.filename, size: Number(data.product.size) || 0 };
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
    if (busy) return; // đang tải thì không cho bỏ mã
    clearInterval(timer); clearInterval(poll); S = null;
    el.res.hidden = true; el.form.hidden = false; el.code.value = ""; el.err.textContent = ""; el.code.classList.remove("bad");
    el.check.disabled = false; el.check.textContent = "Kiểm tra mã"; el.code.focus(); showProg(false);
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
  // Cách tải (chọn theo khả năng của trình duyệt, giống cách MEGA làm):
  //  1. "fsa"  — showSaveFilePicker (Chrome/Edge/Opera máy tính): fetch + ReadableStream ghi THẲNG xuống đĩa, không tốn RAM; file chỉ hiện ra khi close() thành công.
  //  2. "blob" — fetch + ReadableStream gom vào Blob rồi <a download> (Firefox/Safari/điện thoại), chỉ cho file vừa phải để không tràn RAM.
  //  3. "nav"  — dự phòng cuối: <a download> trỏ thẳng vào Worker, Worker tự tính lượt khi gửi xong (như trước đây).
  // Hai cách đầu trình duyệt TỰ ĐẾM byte; đủ đúng dung lượng mới gọi /buy/confirm để Worker trừ lượt. Đứt/huỷ/thiếu byte thì báo lỗi, không mất lượt.
  const canStream = typeof ReadableStream !== "undefined" && typeof fetch === "function" && typeof Response !== "undefined" && "body" in Response.prototype;
  const canFSA = typeof window.showSaveFilePicker === "function" && window.isSecureContext && window.top === window;
  const smallDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const BLOB_MAX = smallDevice ? 400e6 : 1.5e9;
  const pickMode = (size) => (canStream && canFSA ? "fsa" : canStream && size > 0 && size <= BLOB_MAX ? "blob" : "nav");

  // Khoá liên tab: cùng trình duyệt chỉ cho MỘT tab tải tại một thời điểm. Web Locks (tự nhả khi tab đóng/sập); không có thì dùng "hợp đồng thuê" trong localStorage.
  const LOCK_NAME = "moeshinn-buy-download", LEASE_KEY = "moeshinn-buy-lease", leaseId = Math.random().toString(36).slice(2);
  async function exclusive(fn) {
    if (navigator.locks && typeof navigator.locks.request === "function") {
      return navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => { if (!lock) return false; await fn(); return true; });
    }
    try { const cur = JSON.parse(localStorage.getItem(LEASE_KEY) || "null"); if (cur && cur.id !== leaseId && cur.until > Date.now()) return false; } catch { /* storage bị chặn: bỏ qua khoá liên tab */ }
    const beat = () => { try { localStorage.setItem(LEASE_KEY, JSON.stringify({ id: leaseId, until: Date.now() + 6000 })); } catch {} };
    beat(); const iv = setInterval(beat, 2000);
    try { await fn(); } finally { clearInterval(iv); try { localStorage.removeItem(LEASE_KEY); } catch {} }
    return true;
  }
  window.addEventListener("beforeunload", (e) => { if (busy) { e.preventDefault(); e.returnValue = ""; } });

  function setBusy(on) {
    busy = on;
    el.dl.disabled = on; el.dl.classList.toggle("busy", on);
    el.other.disabled = on; el.cancel.hidden = !on || !abortCtl;
    if (on) el.dl.textContent = "⏳ Đang tải…";
  }
  function showProg(on) { el.prog.hidden = !on; if (!on) { el.bar.style.width = "0"; el.ptxt.textContent = ""; } }
  const speedWin = [];
  function progress(got, total) {
    const now = performance.now(); speedWin.push([now, got]); while (speedWin.length > 1 && now - speedWin[0][0] > 4000) speedWin.shift();
    const [t0, b0] = speedWin[0], bps = now > t0 ? ((got - b0) / (now - t0)) * 1000 : 0, pct = total ? Math.min(100, (got / total) * 100) : 0;
    el.bar.style.width = pct.toFixed(1) + "%"; el.bar.parentElement.setAttribute("aria-valuenow", String(Math.round(pct)));
    const eta = bps > 1 && total > got ? Math.ceil((total - got) / bps) : 0;
    el.ptxt.textContent = `${pct.toFixed(1)}% · ${mb(got)} / ${mb(total)}${bps > 1 ? ` · ${(bps / 1e6).toFixed(1)} MB/s` : ""}${eta ? ` · còn ~${eta >= 60 ? Math.floor(eta / 60) + " phút " + (eta % 60) + " giây" : eta + " giây"}` : ""}`;
  }

  // Lấy vé mới khi vé cũ đã dùng/sắp hết hạn, KHÔNG dựng lại giao diện (khác show())
  async function refreshTicket() {
    if (!(S.doneOnce || Date.now() > S.expAt - 8000)) return;
    const d = await redeem(S.code);
    S.ticket = d.ticket; S.expAt = Date.now() + d.ttl * 1000; S.used0 = d.used; S.filename = d.filename; S.size = Number(d.product.size) || S.size; S.doneOnce = false;
    el.file.textContent = d.filename; tick();
  }

  async function startDownload() {
    if (!S || busy) return;                       // khoá 1: trong trang này (nút cũng bị disabled)
    setBusy(true);
    let ran = false;
    try { ran = await exclusive(run); }           // khoá 2: giữa các tab cùng trình duyệt
    catch (e) { say(e.data && e.data.expired ? "Link tải đã hết hạn, bấm lại để lấy link mới." : (e.message === "Failed to fetch" ? "Mất kết nối máy chủ. Kiểm tra mạng rồi thử lại." : e.message), "bad"); }
    abortCtl = null; setBusy(false);
    if (!ran) say("Một tab/cửa sổ khác của trình duyệt này đang tải file. Đợi nó xong rồi bấm lại.", "warn");
    if (S && !S.finished) { el.dl.textContent = S.doneOnce ? "⬇ Tải lại" : "⬇ Tải xuống"; }
    if (S && S.finished) { el.dl.disabled = S.finished === "empty"; el.dl.textContent = S.finished === "empty" ? "Đã hết lượt" : "⬇ Tải lại"; S.finished = null; }
  }

  async function run() {
    let mode = pickMode(S.size), handle = null;
    if (mode === "fsa") { // phải gọi ngay sau cú bấm (user activation) nên đặt TRƯỚC mọi bước chờ mạng
      try { handle = await window.showSaveFilePicker({ suggestedName: S.filename }); }
      catch (e) {
        if (e && e.name === "AbortError") { say("Bạn đã huỷ chọn nơi lưu. Chưa mất lượt nào.", "warn"); return; }
        mode = S.size <= BLOB_MAX ? "blob" : "nav"; // tên file lạ / trình duyệt từ chối: chuyển cách khác
      }
    }
    say("Đang chuẩn bị…"); showProg(false);
    await refreshTicket();
    const s = await call("/buy/status?t=" + encodeURIComponent(S.ticket));
    if (s.state === "downloading") { say("Đang có một lượt tải khác chạy với mã này. Đợi nó xong rồi thử lại.", "warn"); return; }
    if (s.state !== "active") { say(s.state === "used" ? "Mã đã dùng hết lượt tải." : "Mã này không còn dùng được. Liên hệ người bán.", "bad"); return; }
    S.used0 = s.used;
    if (mode === "nav") return navDownload();
    return streamDownload(mode, handle);
  }

  // ---- cách 1 & 2: trình duyệt tự đọc luồng, tự đếm byte ----
  async function streamDownload(mode, handle) {
    const ctl = new AbortController(); abortCtl = ctl; el.cancel.hidden = false;
    const total = S.size; let got = 0, sid = "", writable = null, reader = null, chunks = [], cancelled = false;
    el.cancel.onclick = () => { cancelled = true; ctl.abort(); };
    speedWin.length = 0; showProg(true); progress(0, total);
    say(mode === "fsa" ? "⏳ Đang tải thẳng xuống đĩa… vui lòng đừng đóng trang này." : "⏳ Đang tải về máy… vui lòng đừng đóng trang này.", "warn");
    try {
      const res = await fetch(API + "/buy/dl?m=f&t=" + encodeURIComponent(S.ticket), { cache: "no-store", signal: ctl.signal });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw Object.assign(new Error(d.error || "Lỗi " + res.status), { status: res.status, data: d, refused: true }); }
      sid = res.headers.get("X-Dl-Session") || "";
      if (!sid || !res.body) throw Object.assign(new Error("Máy chủ không trả thẻ phiên tải. Thử lại hoặc nhắn người bán."), { refused: false });
      if (handle) writable = await handle.createWritable();
      reader = res.body.getReader();
      for (;;) {
        const r = await reader.read(); if (r.done) break;
        got += r.value.byteLength;
        if (writable) await writable.write(r.value); else chunks.push(r.value); // await: nếu đĩa đầy/ghi lỗi thì ném lỗi ngay, không đọc tiếp
        progress(got, total);
      }
      if (total && got !== total) throw new Error(`chỉ nhận được ${got.toLocaleString("vi-VN")} / ${total.toLocaleString("vi-VN")} byte`);
      say("Đang hoàn tất ghi file…", "warn");
      if (writable) { await writable.close(); writable = null; }                // file chỉ được chốt khi close() thành công
      else { saveBlob(new Blob(chunks, { type: "application/octet-stream" }), S.filename); chunks = []; }
      progress(got, total);
      const r = await report(sid, true, got);                                    // báo Worker: đủ byte → trừ lượt
      finish(r);
    } catch (e) {
      try { ctl.abort(); } catch {} try { if (reader) await reader.cancel(); } catch {} try { if (writable) await writable.abort(); } catch {}
      chunks = [];
      if (sid) report(sid, false, got).catch(() => {});                          // báo lỗi để Worker nhả khoá ngay (không trừ lượt)
      showProg(false);
      if (cancelled || (e && e.name === "AbortError")) { say("Đã huỷ tải. Bạn chưa mất lượt nào, bấm “Tải xuống” để tải lại.", "warn"); }
      else if (e && e.refused) { say(e.data && e.data.expired ? "Link tải đã hết hạn, bấm lại để lấy link mới." : e.message, e.status === 409 ? "warn" : "bad"); }
      else say("⚠️ Quá trình tải bị gián đoạn" + (e && e.message ? " (" + e.message + ")" : "") + ". Bạn chưa mất lượt nào, bấm “Tải xuống” để thử lại.", "bad");
      S.doneOnce = true;
    }
  }
  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; a.style.display = "none"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  }
  // Báo kết quả cho Worker, thử lại vài lần nếu mạng chớp. Trả về JSON của Worker hoặc null.
  async function report(sid, ok, bytes) {
    for (let i = 0; i < 4; i++) {
      try { return await call("/buy/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid, ok, bytes }), keepalive: true }); }
      catch (e) { if (e.status && e.status < 500 && e.status !== 429) return null; await sleep(800 * (i + 1)); }
    }
    return null;
  }
  function finish(r) {
    S.doneOnce = true; showProg(false);
    if (r && typeof r.remaining === "number") {
      S.finished = r.remaining > 0 ? "more" : "empty";
      say(r.remaining > 0 ? `✅ Tải xong! Hãy kiểm tra file trong thư mục Tải xuống. Mã còn ${r.remaining} lượt.` : "✅ Tải xong! Hãy kiểm tra file trong thư mục Tải xuống. Mã đã hết lượt.", "ok");
      if (el.chips.children[1]) el.chips.children[1].textContent = `🔁 Còn ${r.remaining}/${r.max} lượt tải`;
    } else { // đã đủ byte nhưng chưa báo được cho Worker: Worker tự chốt sau ~90 giây, không cần làm gì thêm
      S.finished = "more";
      say("✅ Tải xong! Hãy kiểm tra file trong thư mục Tải xuống. (Số lượt còn lại sẽ tự cập nhật sau ít phút.)", "ok");
    }
  }

  // ---- cách 3 (dự phòng): mở link tải trực tiếp, Worker tự tính lượt; trang theo dõi trạng thái từ máy chủ ----
  function navDownload() {
    const a = document.createElement("a"); a.href = API + "/buy/dl?t=" + encodeURIComponent(S.ticket); a.rel = "noopener"; a.style.display = "none";
    document.body.appendChild(a); a.click(); a.remove();
    say("Đã gửi yêu cầu tải. Nếu trình duyệt hỏi nơi lưu file, hãy chọn “Lưu”.");
    return watch();
  }
  function watch() {
    clearInterval(poll);
    return new Promise((resolve) => {
      const t0 = Date.now(); let seen = false, hinted = false;
      const stop = () => { clearInterval(poll); resolve(); };
      poll = setInterval(async () => {
        if (!S) return stop();
        try {
          const s = await call("/buy/status?t=" + encodeURIComponent(S.ticket));
          if (s.used > S.used0) { // đã gửi trọn vẹn
            S.doneOnce = true; S.finished = s.remaining > 0 ? "more" : "empty";
            say(s.remaining > 0 ? `✅ Tải xong! Hãy kiểm tra file trong thư mục Tải xuống. Mã còn ${s.remaining} lượt.` : "✅ Tải xong! Hãy kiểm tra file trong thư mục Tải xuống. Mã đã hết lượt.", "ok");
            if (el.chips.children[1]) el.chips.children[1].textContent = `🔁 Còn ${s.remaining}/${s.max} lượt tải`;
            return stop();
          }
          if (s.state === "downloading") { seen = true; say("⏳ Đang tải về máy… vui lòng đừng đóng trang này.", "warn"); }
          else if (seen && s.dl === "failed") { say("⚠️ Quá trình tải bị gián đoạn. Bạn chưa mất lượt nào, bấm “Tải xuống” để thử lại.", "bad"); S.doneOnce = true; return stop(); }
          else if (!seen && !hinted && Date.now() - t0 > 12000) { hinted = true; say("Chưa thấy trình duyệt bắt đầu tải. Nếu có thông báo chặn tải xuống, hãy cho phép rồi bấm lại.", "warn"); return stop(); }
          if (Date.now() - t0 > 25 * 60 * 1000) stop();
        } catch (e) { if (e.data && e.data.expired) stop(); /* mất mạng thoáng qua: thử lại ở nhịp sau */ }
      }, 2500);
    });
  }

  el.dl.addEventListener("click", startDownload);
  el.code.focus();
})();
