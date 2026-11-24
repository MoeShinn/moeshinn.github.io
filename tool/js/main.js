/* /tool: (1) vẽ lại danh sách từ tool/data.json, (2) cổng xác nhận 18+ ở trang chi tiết các tool có đánh dấu 18+. */
(function () {
  var root = document.documentElement;
  function unlock() {
    try { sessionStorage.setItem("tool18", "1"); } catch (e) { /* trình duyệt chặn: chỉ nhớ trong trang này */ }
    root.classList.remove("tool-locked"); root.classList.add("tool-18ok");
  }

  var gate = document.querySelector("[data-tool-gate]");
  if (gate) {
    var chk = gate.querySelector("[data-gate-check]"), ok = gate.querySelector("[data-gate-ok]");
    chk.addEventListener("change", function () { ok.disabled = !chk.checked; });
    ok.addEventListener("click", function () { if (chk.checked) unlock(); });
  }

  // Logo bị làm mờ (.tool-logo-box[data-blur]): bấm vào lớp .tool-eye để hiện riêng logo đó, không mở trang tool.
  // Logo 18+ (data-adult): lần đầu trong phiên hiện thông báo, bấm đồng ý mới hiện. Đã xác nhận 18+ ở trang tool thì không hỏi lại. Logo đã hiện được nhớ trong phiên.
  function flag(k) { try { return sessionStorage.getItem(k) === "1"; } catch (e) { return false; } }
  function revealed() { try { return JSON.parse(sessionStorage.getItem("tool_reveal") || "[]"); } catch (e) { return []; } }
  function applyReveal() {
    var ids = revealed();
    [].forEach.call(document.querySelectorAll(".tool-logo-box[data-blur]"), function (b) { if (ids.indexOf(b.getAttribute("data-tid")) !== -1) b.classList.add("is-revealed"); });
  }
  function reveal(box) {
    box.classList.add("is-revealed");
    var id = box.getAttribute("data-tid");
    try { var ids = revealed(); if (id && ids.indexOf(id) === -1) { ids.push(id); sessionStorage.setItem("tool_reveal", JSON.stringify(ids)); } } catch (err) { /* bỏ qua */ }
  }
  function askAdult(onYes) {
    var m = document.createElement("div");
    m.className = "tool-notice"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "tool-notice-title");
    m.innerHTML = '<div class="tool-gate-box"><h2 id="tool-notice-title">Ảnh này có thể chứa nội dung 18+</h2>' +
      '<p>Hình ảnh của tool này có thể chứa nội dung nhạy cảm, chỉ dành cho người từ 18 tuổi trở lên. Bạn đã đủ 18 tuổi và đồng ý xem ảnh?</p>' +
      '<div class="tool-gate-actions"><button type="button" class="tool-gate-ok" data-yes>Tôi đã đủ 18 tuổi, hiện ảnh</button><a class="tool-gate-leave" href="#" data-no>Không xem</a></div></div>';
    function close() { document.removeEventListener("keydown", esc, true); m.remove(); }
    function esc(e) { if (e.key === "Escape") { e.stopPropagation(); close(); } }
    m.addEventListener("click", function (e) {
      if (e.target.closest("[data-yes]")) { try { sessionStorage.setItem("tool18img", "1"); } catch (err) { /* bỏ qua */ } close(); onYes(); }
      else if (e.target.closest("[data-no]") || e.target === m) { e.preventDefault(); close(); }
    });
    document.addEventListener("keydown", esc, true);
    document.body.appendChild(m);
    m.querySelector("[data-yes]").focus();
  }
  function onEye(e) {
    var eye = e.target.closest && e.target.closest("[data-eye]");
    if (!eye) return;
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault(); e.stopPropagation();
    var box = eye.closest(".tool-logo-box");
    if (!box) return;
    if (box.hasAttribute("data-adult") && !flag("tool18img") && !flag("tool18")) askAdult(function () { reveal(box); });
    else reveal(box);
  }
  document.addEventListener("click", onEye);
  document.addEventListener("keydown", onEye);

  // Tìm kiếm (logic trong ToolGen.score): nhiều từ thì phải khớp đủ, ưu tiên khớp tên, chịu được gõ sai nhẹ, xếp kết quả theo độ khớp. Nhớ từ khóa trong phiên.
  function bindSearch() {
    var input = document.querySelector("[data-tool-search]");
    if (!input || !window.ToolGen) return;
    var cards = [].slice.call(document.querySelectorAll(".tool-card")), none = document.querySelector("[data-tool-noresult]");
    var entries = cards.map(function (c) { // tên lấy từ thẻ, toàn bộ chữ tìm được nằm sẵn trong data-s (đủ mô tả, từ khóa…)
      var nm = c.querySelector(".tool-card-name");
      return ToolGen.searchEntry({ title: nm ? nm.textContent : "", description: c.getAttribute("data-s") || c.textContent });
    });
    function run() {
      var q = input.value, shown = 0;
      cards.forEach(function (c, i) {
        var sc = ToolGen.score(q, entries[i]), ok = sc >= 0;
        c.hidden = !ok; c.style.order = ok && q.trim() ? String(Math.round(-sc * 10)) : ""; // điểm cao xếp trước, hết tìm thì về thứ tự cũ
        if (ok) shown++;
      });
      if (none) none.hidden = shown > 0;
      try { sessionStorage.setItem("tool_search", q); } catch (e) { /* bỏ qua */ }
    }
    input.addEventListener("input", run);
    try { input.value = sessionStorage.getItem("tool_search") || ""; } catch (e) { /* bỏ qua */ }
    run();
  }
  bindSearch();
  applyReveal();

  // Danh sách: HTML dựng sẵn đã có cho bot; ở đây lấy dữ liệu mới nhất để khỏi phải chờ lần dựng kế tiếp
  var hub = document.querySelector("[data-tool-hub]");
  if (hub && window.ToolGen && window.fetch) {
    fetch("/tool/data.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && Array.isArray(j.tools)) hub.outerHTML = ToolGen.hubBody({ tools: j.tools, hub: j }); bindSearch(); applyReveal(); })
      .catch(function () { /* giữ bản dựng sẵn */ });
  }
})();
