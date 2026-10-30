(async () => {
  const $ = (s, r = document) => r.querySelector(s), fm = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";
  // Mọi dữ liệu người dùng/Google (tên, @handle, tin nhắn, avatar) chỉ đi vào trang bằng textContent/thuộc tính DOM, không dùng innerHTML.
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const SESS_KEY = "dn_yt", YT_SCOPE = "https://www.googleapis.com/auth/youtube.readonly", HERO_AV = "/assets/avatar/avatar-336.webp";
  const DEF_AV = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#223250"/><circle cx="32" cy="25" r="11" fill="#7f93b8"/><path d="M10 60c2-13 12-20 22-20s20 7 22 20z" fill="#7f93b8"/></svg>');
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch {} };
  const safeSrc = (u) => (typeof u === "string" && (/^https:\/\//i.test(u) || (u.startsWith("/") && !u.startsWith("//"))) ? u : "");

  // Dấu xác minh kiểu YouTube: hình tròn xám, dấu tích trắng (SVG nội tuyến, nội dung tĩnh)
  const VF_TITLE = "Đã xác minh qua YouTube";
  const badge = () => { const s = el("span", "dn-vf"); s.title = VF_TITLE; s.setAttribute("role", "img"); s.setAttribute("aria-label", VF_TITLE);
    s.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#909090"/><path d="M6.8 12.6l3.3 3.3 7.1-7.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'; return s; };
  // Avatar ngoài (Google/YouTube): no-referrer, có alt, lỗi tải → ảnh mặc định
  const setAv = (img, src, alt) => { img.alt = alt || ""; img.referrerPolicy = "no-referrer"; img.decoding = "async"; img.loading = "lazy";
    img.onerror = () => { img.onerror = null; img.src = DEF_AV; }; img.src = /^https:\/\//i.test(src || "") ? src : DEF_AV; return img; };
  const avatar = (src, alt, cls = "dn-av") => { const i = el("img", cls); i.width = i.height = 38; return setAv(i, src, alt); };
  const ago = (t) => { const s = Math.max(0, (Date.now() - Number(t)) / 1000); if (!Number.isFinite(s)) return "";
    if (s < 60) return "vừa xong"; const m = s / 60; if (m < 60) return Math.floor(m) + " phút trước"; const h = m / 60; if (h < 24) return Math.floor(h) + " giờ trước";
    const d = h / 24; if (d < 30) return Math.floor(d) + " ngày trước"; if (d < 365) return Math.floor(d / 30) + " tháng trước"; return Math.floor(d / 365) + " năm trước"; };

  const err = $("[data-err]");
  let cfg; try { const r = await fetch("/donate/data.json", { cache: "no-cache" }); if (!r.ok) throw 0; cfg = await r.json(); } catch { err.hidden = false; err.textContent = "Không tải được cấu hình donate."; return; }
  $("[data-title]").textContent = cfg.title; $("[data-intro]").textContent = cfg.intro || "";

  // ---------- Banner + avatar ----------
  const banner = $("[data-banner]"), bsrc = safeSrc(cfg.banner);
  if (bsrc) { banner.onload = () => (banner.hidden = false); banner.onerror = () => banner.remove(); banner.src = bsrc; } // thiếu/lỗi ảnh → còn nền gradient
  const hav = $("[data-avatar]"), asrc = safeSrc(cfg.avatar);
  hav.onerror = () => { hav.onerror = null; hav.removeAttribute("srcset"); hav.src = HERO_AV; };
  if (asrc && asrc !== HERO_AV) { hav.removeAttribute("srcset"); hav.src = asrc; }

  // ---------- Form ----------
  const name = $("[data-name]"), amt = $("[data-amount]"), msg = $("[data-msg]"), go = $("[data-go]");
  msg.maxLength = cfg.msgMax;
  const cnt = () => ($("[data-count]").textContent = `(${msg.value.length}/${cfg.msgMax})`); msg.oninput = cnt; cnt();
  const presets = $("[data-presets]");
  (cfg.presets || []).forEach((v) => { const b = el("button", "", fm(v)); b.type = "button"; b.dataset.v = v; presets.appendChild(b); });
  presets.onclick = (e) => { const v = e.target.dataset && e.target.dataset.v; if (v) amt.value = v; };
  const bad = (t) => { err.textContent = t || ""; err.hidden = !t; };

  // ---------- Đăng nhập YouTube ----------
  const loadSess = () => { try { const s = JSON.parse(lsGet(SESS_KEY) || "null"); if (s && typeof s.token === "string" && Number(s.exp) * 1000 > Date.now() && typeof s.title === "string") return s; } catch {} lsDel(SESS_KEY); return null; };
  let sess = loadSess();
  const ytBtn = $("[data-yt-login]"), loginErr = $("[data-login-err]"), cid = String(cfg.googleClientId || "");
  const loginBad = (t) => { loginErr.textContent = t || ""; loginErr.hidden = !t; };
  const setBusy = (b, on, txt) => { b.disabled = on; b.classList.toggle("busy", on); if (txt) b.textContent = txt; };
  function renderAuth() {
    const on = !!sess;
    $("[data-login-out]").hidden = on || !cid; $("[data-login-in]").hidden = !on; $("[data-name-hint]").hidden = !on;
    name.readOnly = on; name.maxLength = on ? 100 : cfg.nameMax;
    if (on) {
      name.value = sess.title;
      const n = $("[data-me-name]"); n.textContent = sess.title; n.appendChild(badge());
      $("[data-me-handle]").textContent = sess.handle || ""; setAv($("[data-me-av]"), sess.avatar, "Avatar kênh " + sess.title);
    } else name.value = lsGet("dn_name") || "";
  }
  renderAuth();
  const gsiReady = () => !!(window.google && google.accounts && google.accounts.oauth2);
  let tc = null;
  const initClient = () => tc || (gsiReady() ? (tc = google.accounts.oauth2.initTokenClient({ client_id: cid, scope: YT_SCOPE, callback: onToken, error_callback: onGErr })) : null);
  function onGErr(e) {
    const t = e && e.type;
    loginBad(t === "popup_failed_to_open" ? "Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup cho trang này rồi thử lại."
      : t === "popup_closed" ? "Bạn đã đóng cửa sổ đăng nhập. Bấm lại nếu muốn tiếp tục." : "Không mở được cửa sổ đăng nhập Google, vui lòng thử lại.");
  }
  async function onToken(resp) {
    if (!resp || resp.error || !resp.access_token) {
      loginBad(resp && resp.error === "access_denied" ? "Bạn chưa cấp quyền nên chưa thể đăng nhập bằng YouTube." : "Đăng nhập Google không thành công, vui lòng thử lại.");
      return;
    }
    if (google.accounts.oauth2.hasGrantedAllScopes && !google.accounts.oauth2.hasGrantedAllScopes(resp, YT_SCOPE)) return loginBad("Bạn cần cho phép xem thông tin kênh YouTube (chỉ đọc) để đăng nhập.");
    const ytTxt = ytBtn.querySelector("[data-yt-login-t]"); setBusy(ytBtn, true); ytTxt.textContent = "Đang đăng nhập…"; loginBad("");
    try {
      let r; try { r = await fetch(cfg.api + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ access_token: resp.access_token }) }); }
      catch { throw new Error("Mất kết nối mạng, hãy kiểm tra internet rồi thử lại."); }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Đăng nhập thất bại (mã lỗi " + r.status + "), vui lòng thử lại.");
      if (typeof d.token !== "string" || typeof d.title !== "string") throw new Error("Máy chủ trả về dữ liệu không hợp lệ, vui lòng thử lại.");
      sess = { token: d.token, exp: Number(d.exp) || Math.floor(Date.now() / 1000) + 86400, title: d.title, handle: typeof d.handle === "string" ? d.handle : "", avatar: typeof d.avatar === "string" ? d.avatar : "" };
      lsSet(SESS_KEY, JSON.stringify(sess)); renderAuth();
    } catch (e) { loginBad(e.message); }
    finally { resp = null; setBusy(ytBtn, false); ytTxt.textContent = "Đăng nhập bằng YouTube"; }
  }
  ytBtn.onclick = () => {
    if (ytBtn.disabled) return; loginBad("");
    const c = initClient();
    if (!c) return loginBad("Không tải được dịch vụ đăng nhập của Google. Hãy kiểm tra mạng, tắt trình chặn quảng cáo rồi tải lại trang.");
    try { c.requestAccessToken({ prompt: "select_account" }); } catch { loginBad("Không mở được cửa sổ đăng nhập Google, vui lòng thử lại."); }
  };
  $("[data-yt-logout]").onclick = () => { lsDel(SESS_KEY); sess = null; loginBad(""); renderAuth(); };

  // ---------- Copy (dùng chung): "Đã Copy ✓" xanh lá đúng 1,5 giây ----------
  const flashTimers = new WeakMap();
  async function copyText(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch {}
    const prev = document.activeElement;
    try { const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:0;left:0;opacity:0"; document.body.appendChild(t); t.select(); t.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy"); t.remove(); if (prev && prev.focus) prev.focus(); return ok; } catch { if (prev && prev.focus) prev.focus(); return false; }
  }
  async function copyFlash(btn, text, label) {
    if (!(await copyText(text))) { window.prompt("Trình duyệt chặn copy, hãy sao chép thủ công:", text); return; }
    clearTimeout(flashTimers.get(btn)); // bấm liên tiếp: huỷ timer cũ trước khi đặt timer mới
    btn.textContent = "Đã Copy ✓"; btn.classList.add("copied"); btn.setAttribute("aria-label", "Đã copy " + label);
    flashTimers.set(btn, setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); btn.setAttribute("aria-label", "Copy " + label); }, 1500));
  }

  // ---------- Popup QR ----------
  const modal = $("[data-modal]"), box = $(".dn-modal-box", modal);
  let lastFocus = null, downOnBg = false;
  const focusables = () => [...box.querySelectorAll("button:not([disabled]),a[href]")].filter((e) => !e.hidden);
  function closeModal() {
    if (modal.hidden) return; modal.hidden = true; document.body.classList.remove("dn-lock");
    document.removeEventListener("keydown", onKey, true);
    if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus(); lastFocus = null;
  }
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
    if (e.key !== "Tab") return;
    const f = focusables(); if (!f.length) { e.preventDefault(); box.focus(); return; }
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  modal.addEventListener("pointerdown", (e) => (downOnBg = e.target === modal));
  modal.addEventListener("click", (e) => { if (e.target === modal && downOnBg) closeModal(); });
  $("[data-modal-close]").onclick = closeModal; $("[data-back]").onclick = closeModal;
  function openModal(d) {
    const b = d.bank || {}, qr = $("[data-qr]"), qerr = $("[data-qr-err]");
    $("[data-m-who]").textContent = d.name ? "Donate với tên: " + d.name : "";
    qerr.hidden = true; qr.hidden = false; qr.onerror = () => { qr.hidden = true; qerr.hidden = false; };
    qr.src = `https://img.vietqr.io/image/${encodeURIComponent(b.id)}-${encodeURIComponent(b.acc)}-compact2.png?amount=${encodeURIComponent(d.amount)}&addInfo=${encodeURIComponent(d.content)}&accountName=${encodeURIComponent(b.holder)}`;
    const info = $("[data-info]"); info.replaceChildren();
    const row = (k, v, copy) => { const dt = el("dt", "", k), dd = el("dd"); dd.appendChild(el("span", "", String(v ?? "")));
      if (copy) { const c = el("button", "dn-cp", "Copy"); c.type = "button"; c.setAttribute("aria-label", "Copy " + k.toLowerCase()); c.onclick = () => copyFlash(c, String(copy === true ? v : copy), k.toLowerCase()); dd.appendChild(c); }
      info.append(dt, dd); };
    row("Ngân hàng", b.name); row("Số TK", b.acc, true); row("Chủ TK", b.holder); row("Số tiền", fm(d.amount), String(d.amount)); row("Nội dung", d.content, true);
    $("[data-hidden-note]").hidden = !d.hidden;
    lastFocus = document.activeElement; modal.hidden = false; document.body.classList.add("dn-lock");
    document.addEventListener("keydown", onKey, true); box.scrollTop = 0; box.focus();
  }

  // ---------- Tạo mã ----------
  go.onclick = async () => {
    if (go.disabled) return;
    bad(""); const a = parseInt(String(amt.value).replace(/\D/g, ""), 10) || 0;
    if (a < cfg.min) return bad("Số tiền tối thiểu " + fm(cfg.min));
    setBusy(go, true, "Đang kiểm tra…");
    try {
      const headers = { "Content-Type": "application/json" }; if (sess) headers.Authorization = "Bearer " + sess.token;
      const body = { msg: msg.value, amount: a }; if (!sess) body.name = name.value; // đăng nhập YouTube: tên do máy chủ lấy từ kênh, không gửi tên
      let r; try { r = await fetch(cfg.api + "/api/create", { method: "POST", headers, body: JSON.stringify(body) }); } catch { throw new Error("Mất kết nối mạng, hãy kiểm tra internet rồi thử lại."); }
      const d = await r.json().catch(() => ({}));
      if (r.status === 401 && d.relogin) { lsDel(SESS_KEY); sess = null; renderAuth(); throw new Error(d.error || "Phiên đăng nhập đã hết hạn, hãy đăng nhập lại."); }
      if (!r.ok) throw new Error(d.error || "Có lỗi, thử lại nhé.");
      if (!sess) lsSet("dn_name", name.value.trim());
      openModal(d);
    } catch (e) { bad(e.message); }
    finally { setBusy(go, false, "Tạo mã QR donate"); }
  };

  // ---------- Top 10 + lịch sử ----------
  const topEl = $("[data-top]"), emptyTop = (t) => { topEl.replaceChildren(); const li = el("li"); li.appendChild(el("p", "dn-empty", t)); li.style.display = "block"; topEl.appendChild(li); };
  const nameCell = (x) => { const n = el("div", "dn-nm"); n.appendChild(el("span", "", String(x.name || "Ẩn danh"))); if (x.verified) n.appendChild(badge()); return n; };
  try {
    const r = await fetch(cfg.api + "/api/stats"); if (!r.ok) throw 0; const s = await r.json();
    const top = Array.isArray(s.top) ? s.top : [], recent = (Array.isArray(s.recent) ? s.recent : []).slice(0, 10); // lịch sử chỉ hiện 10 donate gần nhất
    if (!top.length) emptyTop("Chưa có ai trong bảng xếp hạng. Đăng nhập bằng YouTube rồi donate để tên bạn xuất hiện ở đây!");
    else { topEl.replaceChildren(); top.forEach((x, i) => { const li = el("li"); li.append(el("span", "dn-pos", String(i + 1)), avatar(x.avatar, "Avatar " + x.name), nameCell({ ...x, verified: true }), el("span", "dn-amt", fm(x.amount ?? x.s))); topEl.appendChild(li); }); }
    const list = $("[data-list]"); list.replaceChildren();
    recent.forEach((x) => {
      const li = el("li"), body = el("div", "dn-hbody"), right = el("div", "dn-hr"), tm = el("time", "", ago(x.paid));
      body.appendChild(nameCell(x)); if (x.msg) body.appendChild(el("p", "dn-hmsg", String(x.msg)));
      if (Number.isFinite(Number(x.paid))) { const dt = new Date(Number(x.paid)); tm.dateTime = dt.toISOString(); tm.title = dt.toLocaleString("vi-VN"); }
      right.append(el("span", "dn-amt", fm(x.amount)), tm);
      li.append(avatar(x.verified ? x.avatar : "", x.verified ? "Avatar " + x.name : "Khách", "dn-av"), body, right); list.appendChild(li);
    });
    $("[data-stats]").hidden = !recent.length;
  } catch { emptyTop("Không tải được bảng xếp hạng lúc này, bạn thử tải lại trang nhé."); }
})();
