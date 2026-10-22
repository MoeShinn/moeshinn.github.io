/* Logic trạng thái liên kết (khớp với /download/js/main.js): hạn dd/mm/yyyy, "inf", enabled, start. */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(); else root.LinkLogic = factory(); })(typeof window !== "undefined" ? window : this, function () {
  const DAY = 864e5, pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const parse = (s) => { const m = String(s || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
  const toIso = (s) => { const d = parse(s); return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : ""; };
  const fromIso = (s) => (s ? s.split("-").reverse().join("/") : "");
  const isInf = (e) => !e || ["inf", "infinity"].includes(String(e).trim().toLowerCase());
  function status(l, now = Date.now()) {
    if (l.enabled === false) return "off";
    const st = parse(l.start); if (st && now < st.getTime()) return "sched";
    if (isInf(l.expires)) return "inf";
    const d = parse(l.expires); if (!d) return "expired";
    const end = d.getTime() + DAY - 1000;
    return now > end ? "expired" : end - now <= 7 * DAY ? "soon" : "ok";
  }
  const live = (l, now) => ["ok", "soon", "inf"].includes(status(l, now));
  const LABEL = { ok: ["🟢", "Còn hạn"], soon: ["🟡", "Sắp hết hạn"], inf: ["∞", "Vô hạn"], expired: ["🔴", "Đã hết hạn"], off: ["⚪", "Đang tắt"], sched: ["🕒", "Chưa tới ngày bắt đầu"] };
  // Gia hạn thêm n ngày, tính từ ngày hết hạn hiện tại (hoặc từ hôm nay nếu đã hết hạn)
  function extend(l, n, now = Date.now()) {
    const t = new Date(now), today = new Date(t.getFullYear(), t.getMonth(), t.getDate()), cur = parse(l.expires);
    const base = cur && cur > today ? cur : today;
    return fmt(new Date(base.getFullYear(), base.getMonth(), base.getDate() + n));
  }
  const nextId = (cat, links, slug) => { const used = new Set(links.map((l) => l.id)), b = slug(cat) || "link"; let n = 1; while (used.has(`${b}-${n}`)) n++; return `${b}-${n}`; };
  return { fmt, parse, toIso, fromIso, isInf, status, live, LABEL, extend, nextId };
});
