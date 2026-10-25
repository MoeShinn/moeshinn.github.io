/* Admin core: phiên đăng nhập, gọi admin-api, khung giao diện. Không chứa bí mật nào. */
(() => {
  const API = "https://shinju-admin-api.git-api.workers.dev";
  const KEY = "shinju_admin_session";
  const BYPASS = "shinju_bypass_until"; // localStorage: trình duyệt này đang đăng nhập admin → trang công khai bỏ qua màn hình bảo trì (hết hạn cùng phiên)
  const NAV = [
    ["dashboard", "Dashboard", "/admin/"],
    ["post", "Bài đăng", "/admin/post/"],
    ["product", "Sản phẩm", "/admin/product/"],
    ["download", "Download", "/admin/download/"],
    ["channel", "Kênh", "/admin/channel/"],
    ["profile", "Hồ sơ Vtuber", "/admin/profile/"],
    ["donate", "Donate", "/admin/donate/"],
    ["links", "Link rút gọn", "/admin/links/"],
    ["images", "Kho ảnh", "/admin/images/"],
    ["linkpool", "Kho liên kết", "/admin/linkpool/"],
    ["stats", "Số liệu", "/admin/stats/"],
    ["status", "Trạng thái", "/admin/status/"],
    ["setting", "Cài đặt", "/admin/setting/"],
  ];
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const session = () => { try { const s = JSON.parse(sessionStorage.getItem(KEY)); return s && s.exp * 1000 > Date.now() ? s : null; } catch { return null; } };

  async function api(path, body) {
    const s = session();
    const res = await fetch(API + path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(s ? { Authorization: "Bearer " + s.token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== "/login") { sessionStorage.removeItem(KEY); location.reload(); }
    if (!res.ok) throw Object.assign(new Error(data.error || "Lỗi " + res.status), { status: res.status });
    return data;
  }
  async function readJson(path, fallback) {
    try { return JSON.parse((await api("/file?path=" + encodeURIComponent(path))).content); }
    catch (e) { if (e.status === 404 && fallback !== undefined) return fallback; throw e; }
  }
  // Ghi nhiều file JSON trong MỘT commit.
  const commitJson = (message, files) => api("/commit", { message, files: files.map((f) => ({ path: f.path, content: JSON.stringify(f.json, null, 2) + "\n" })) });

  const readText = async (path) => (await api("/file?path=" + encodeURIComponent(path))).content;
  const commitFiles = (message, files, deletes = []) => api("/commit", { message, files, deletes }); // files: [{path, content, encoding?}]

  // Hộp thoại sửa trực tiếp một file JSON (cho trường hợp giao diện không có ô tương ứng). Kiểm tra JSON trước khi commit.
  async function jsonEditor(path, note) {
    const ov = document.createElement("div"); ov.className = "modal";
    ov.innerHTML = `<div class="mbox je"><h3>${esc(path)}</h3><p class="hint">${esc(note || "")}</p><textarea id="je_t" spellcheck="false" disabled>Đang tải…</textarea><div class="err" id="je_e"></div>
      <div class="mact"><button class="ghost" id="je_f">Định dạng lại</button> <button id="je_s">Lưu lên GitHub</button> <button class="ghost" id="je_c">Đóng</button></div></div>`;
    document.body.appendChild(ov);
    const t = $("#je_t", ov), err = $("#je_e", ov);
    const ok = () => { try { JSON.parse(t.value); err.textContent = ""; return true; } catch (e) { err.textContent = "JSON chưa hợp lệ: " + e.message; return false; } };
    try { t.value = await readText(path); try { t.value = JSON.stringify(JSON.parse(t.value), null, 2) + "\n"; } catch (e) { /* giữ nguyên */ } } catch (e) { t.value = ""; err.textContent = e.message; }
    t.disabled = false;
    $("#je_f", ov).onclick = () => { if (ok()) t.value = JSON.stringify(JSON.parse(t.value), null, 2) + "\n"; };
    $("#je_c", ov).onclick = () => ov.remove();
    $("#je_s", ov).onclick = async () => {
      if (!ok()) return; const b = $("#je_s", ov); b.disabled = true;
      try { await commitFiles("Admin: sửa trực tiếp " + path, [{ path, content: JSON.stringify(JSON.parse(t.value), null, 2) + "\n" }]); toast("Đã lưu. Web cập nhật sau ~1 phút."); setTimeout(() => location.reload(), 1200); }
      catch (e) { err.textContent = e.message; b.disabled = false; }
    };
  }
  // Gắn mọi nút có data-json="đường/dẫn.json" trong vùng root
  const bindJson = (root, notes = {}) => root.querySelectorAll("[data-json]").forEach((b) => (b.onclick = () => jsonEditor(b.dataset.json, notes[b.dataset.json])));

  let tt;
  function toast(msg, bad) {
    const t = $("#toast"); t.textContent = msg; t.className = bad ? "bad" : ""; t.style.display = "block";
    clearTimeout(tt); tt = setTimeout(() => (t.style.display = "none"), 3500);
  }

  function showLogin(root, done) {
    try { localStorage.removeItem(BYPASS); } catch {} // chưa/không còn đăng nhập → khách thường
    root.innerHTML = `<div class="login"><form id="lf"><h1>Quản trị · Shinju</h1>
      <label>Mật khẩu<input id="pw" type="password" autocomplete="current-password" autofocus required></label>
      <div class="err" id="le"></div><button>Đăng nhập</button></form></div>`;
    $("#lf").onsubmit = async (e) => {
      e.preventDefault();
      const b = $("#lf button"); b.disabled = true; $("#le").textContent = "";
      try {
        const r = await api("/login", { password: $("#pw").value });
        sessionStorage.setItem(KEY, JSON.stringify(r)); done();
      } catch (err) { $("#le").textContent = err.message; b.disabled = false; }
    };
  }

  function boot({ id, title, render }) {
    document.title = title + " · Admin";
    const root = $("#app");
    if (!session()) return showLogin(root, () => boot({ id, title, render }));
    try { localStorage.setItem(BYPASS, String(session().exp * 1000)); } catch {}
    const nav = NAV.map(([k, label, url, soon]) =>
      soon ? `<span class="soon">${label}<small>sắp có</small></span>` : `<a href="${url}" class="${k === id ? "on" : ""}">${label}</a>`).join("");
    root.innerHTML = `<div class="layout"><nav class="side"><div class="brand">Shinju Admin</div><div class="navlist" id="navlist">${nav}</div>
      <div class="foot"><span id="left"></span><button class="ghost" id="out">Đăng xuất</button></div></nav><main id="main"></main></div>`;
    const tick = () => { const s = session(); if (!s) return location.reload(); $("#left").textContent = "Phiên còn " + Math.max(1, Math.round((s.exp * 1000 - Date.now()) / 60000)) + " phút"; };
    tick(); setInterval(tick, 30000);
    const nl = $("#navlist"), on = nl && nl.querySelector("a.on"); // mục đang mở nằm ngoài tầm nhìn (danh sách dài) → tự cuộn tới giữa khung
    if (on) { if (nl.scrollHeight > nl.clientHeight) nl.scrollTop = on.offsetTop - nl.clientHeight / 2 + on.offsetHeight / 2; else nl.scrollLeft = on.offsetLeft - nl.clientWidth / 2 + on.offsetWidth / 2; }
    $("#out").onclick = () => { sessionStorage.removeItem(KEY); location.reload(); };
    render($("#main"));
  }

  window.Admin = { api, readJson, readText, commitJson, commitFiles, jsonEditor, bindJson, toast, boot, esc, $ };
})();
