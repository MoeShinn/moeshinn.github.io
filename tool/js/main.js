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

  // Danh sách: HTML dựng sẵn đã có cho bot; ở đây lấy dữ liệu mới nhất để khỏi phải chờ lần dựng kế tiếp
  var hub = document.querySelector("[data-tool-hub]");
  if (hub && window.ToolGen && window.fetch) {
    fetch("/tool/data.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && Array.isArray(j.tools)) hub.outerHTML = ToolGen.hubBody({ tools: j.tools, hub: j }); bindSearch(); })
      .catch(function () { /* giữ bản dựng sẵn */ });
  }
})();
