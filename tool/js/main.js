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

  // Tìm kiếm: khớp tên + mô tả nhắn của thẻ, không phân biệt hoa/thường và dấu (giống /post). Nhớ từ khóa trong phiên.
  var fold = function (s) { return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase(); };
  function bindSearch() {
    var input = document.querySelector("[data-tool-search]");
    if (!input) return;
    var cards = [].slice.call(document.querySelectorAll(".tool-card")), none = document.querySelector("[data-tool-noresult]");
    var haystack = cards.map(function (c) { return fold(c.textContent); });
    function run() {
      var q = fold(input.value).trim(), shown = 0;
      cards.forEach(function (c, i) { var ok = !q || haystack[i].indexOf(q) !== -1; c.hidden = !ok; if (ok) shown++; });
      if (none) none.hidden = shown > 0;
      try { sessionStorage.setItem("tool_search", input.value); } catch (e) { /* bỏ qua */ }
    }
    input.addEventListener("input", run);
    try { input.value = sessionStorage.getItem("tool_search") || ""; } catch (e) { /* bỏ qua */ }
    run();
  }
  bindSearch();

  // Danh sách: HTML dựng sẵn đã có cho bot; ở đây lấy dữ liệu mới nhất để khỏi phải chờ lần dựng kế tiếp
  var hub = document.querySelector("[data-tool-hub]");
  if (hub && window.ToolGen && window.fetch) {
    fetch("/tool/data.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && Array.isArray(j.tools)) hub.outerHTML = ToolGen.hubBody({ tools: j.tools, hub: j }); bindSearch(); })
      .catch(function () { /* giữ bản dựng sẵn */ });
  }
})();
