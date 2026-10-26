(async () => {
  const $ = (s) => document.querySelector(s), fm = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let cfg; try { cfg = await (await fetch("/donate/data.json", { cache: "no-cache" })).json(); } catch { $("[data-err]").hidden = false; $("[data-err]").textContent = "Không tải được cấu hình donate."; return; }
  $("[data-title]").textContent = cfg.title; $("[data-intro]").textContent = cfg.intro || "";
  const name = $("[data-name]"), amt = $("[data-amount]"), msg = $("[data-msg]"), err = $("[data-err]"), go = $("[data-go]");
  name.maxLength = cfg.nameMax; msg.maxLength = cfg.msgMax;
  try { name.value = localStorage.getItem("dn_name") || ""; } catch {}
  const cnt = () => ($("[data-count]").textContent = `(${msg.value.length}/${cfg.msgMax})`); msg.oninput = cnt; cnt();
  $("[data-presets]").innerHTML = (cfg.presets || []).map((v) => `<button type="button" data-v="${v}">${fm(v)}</button>`).join("");
  $("[data-presets]").onclick = (e) => { const v = e.target.dataset.v; if (v) { amt.value = v; } };
  const bad = (t) => { err.textContent = t; err.hidden = !t; };
  go.onclick = async () => {
    bad(""); const a = parseInt(String(amt.value).replace(/\D/g, ""), 10) || 0;
    if (a < cfg.min) return bad("Số tiền tối thiểu " + fm(cfg.min));
    go.disabled = true; go.textContent = "Đang kiểm tra…";
    try {
      const r = await fetch(cfg.api + "/api/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.value, msg: msg.value, amount: a }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Có lỗi, thử lại nhé.");
      try { localStorage.setItem("dn_name", name.value.trim()); } catch {}
      const b = d.bank, q = `https://img.vietqr.io/image/${encodeURIComponent(b.id)}-${encodeURIComponent(b.acc)}-compact2.png?amount=${d.amount}&addInfo=${encodeURIComponent(d.content)}&accountName=${encodeURIComponent(b.holder)}`;
      $("[data-qr]").src = q;
      const row = (k, v, c) => `<dt>${k}</dt><dd>${esc(v)}${c ? `<button type="button" data-copy="${esc(v)}">Chép</button>` : ""}</dd>`;
      $("[data-info]").innerHTML = row("Ngân hàng", b.name) + row("Số TK", b.acc, 1) + row("Chủ TK", b.holder) + row("Số tiền", d.amount, 1) + row("Nội dung", d.content, 1);
      $("[data-hidden-note]").hidden = !d.hidden;
      $("[data-form-card]").hidden = true; $("[data-qr-card]").hidden = false;
    } catch (e) { bad(e.message); }
    go.disabled = false; go.textContent = "Tạo mã QR donate";
  };
  $("[data-info]").onclick = (e) => { const c = e.target.dataset.copy; if (c) navigator.clipboard.writeText(c).then(() => (e.target.textContent = "Đã chép")); };
  $("[data-back]").onclick = () => { $("[data-qr-card]").hidden = true; $("[data-form-card]").hidden = false; };
  try {
    const s = await (await fetch(cfg.api + "/api/stats")).json();
    $("[data-sum]").textContent = `${s.count} lượt · tổng ${fm(s.total)} · tháng này ${fm(s.month)}`;
    $("[data-list]").innerHTML = s.recent.map((x) => `<li><span>${esc(x.name)} · <b>${fm(x.amount)}</b></span><time>${new Date(x.paid).toLocaleDateString("vi-VN")}</time></li>`).join("");
    $("[data-stats]").hidden = !s.recent.length;
  } catch {}
})();
