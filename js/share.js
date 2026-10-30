/* Nút "Chia sẻ" kiểu YouTube: hộp thoại có link (rút gọn nếu có) + nút sao chép + các ứng dụng chia sẻ. */
(() => {
  const st = document.createElement("style");
  st.textContent = `.share-btn{display:inline-flex;gap:6px;align-items:center;background:#16304f;color:#fff;border:1px solid #2a4a74;border-radius:999px;padding:8px 16px;font:600 14px system-ui,sans-serif;cursor:pointer}
.share-btn:hover{background:#1d3d66}
.share-ov{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99998;display:grid;place-items:center;padding:12px}
.share-box{background:#101f36;color:#f4ecd8;border:1px solid #1d3354;border-radius:16px;padding:18px;width:100%;max-width:420px;font-family:system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.5)}
.share-box h3{margin:0 0 12px;font-size:18px}
.share-row{display:flex;gap:8px;margin-bottom:14px}
.share-row input{flex:1;min-width:0;background:#0a1626;color:#fff;border:1px solid #1d3354;border-radius:10px;padding:10px;font:14px system-ui,sans-serif}
.share-row button,.share-apps a,.share-apps button,.share-close{background:#1f6fd6;color:#fff;border:0;border-radius:10px;padding:9px 14px;font:600 14px system-ui,sans-serif;cursor:pointer;text-decoration:none;display:inline-block}
.share-apps{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.share-apps a,.share-apps button{background:#16304f;border:1px solid #2a4a74}
.share-close{background:transparent;border:1px solid #2a4a74;width:100%}`;
  document.head.appendChild(st);

  const e = encodeURIComponent;
  const TARGETS = [
    ["Facebook", (u) => `https://www.facebook.com/sharer/sharer.php?u=${e(u)}`],
    ["X (Twitter)", (u, t) => `https://twitter.com/intent/tweet?url=${e(u)}&text=${e(t)}`],
    ["Telegram", (u, t) => `https://t.me/share/url?url=${e(u)}&text=${e(t)}`],
    ["Email", (u, t) => `mailto:?subject=${e(t)}&body=${e(u)}`],
  ];

  function open(url, title) {
    const ov = document.createElement("div");
    ov.className = "share-ov";
    ov.innerHTML = `<div class="share-box" role="dialog" aria-label="Chia sẻ"><h3>Chia sẻ</h3>
      <div class="share-row"><input readonly /><button type="button" data-copy>Sao chép</button></div>
      <div class="share-apps"></div><button type="button" class="share-close">Đóng</button></div>`;
    const input = ov.querySelector("input"), copy = ov.querySelector("[data-copy]"), apps = ov.querySelector(".share-apps");
    input.value = url;
    if (navigator.share) { // điện thoại: mở bảng chia sẻ của hệ điều hành (Zalo, Messenger…)
      const b = document.createElement("button"); b.type = "button"; b.textContent = "📲 Ứng dụng khác…";
      b.onclick = () => navigator.share({ title, url }).catch(() => {});
      apps.appendChild(b);
    }
    TARGETS.forEach(([name, make]) => { const a = document.createElement("a"); a.textContent = name; a.href = make(url, title); a.target = "_blank"; a.rel = "noopener noreferrer"; apps.appendChild(a); });
    const opener = document.activeElement, box = ov.querySelector(".share-box");
    box.setAttribute("aria-modal", "true");
    const trap = (ev) => { // giữ Tab quay vòng trong hộp thoại
      if (ev.key !== "Tab") return;
      const f = [...box.querySelectorAll("a[href],button,input")].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) { ev.preventDefault(); first.focus(); }
    };
    const close = () => { ov.remove(); document.removeEventListener("keydown", onKey); document.removeEventListener("keydown", trap, true); if (opener && opener.focus && document.contains(opener)) opener.focus(); };
    const onKey = (ev) => { if (ev.key === "Escape") close(); };
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(url); } catch (err) { input.select(); document.execCommand("copy"); }
      copy.textContent = "Đã chép ✓"; setTimeout(() => (copy.textContent = "Sao chép"), 1800);
    };
    ov.onclick = (ev) => { if (ev.target === ov) close(); };
    ov.querySelector(".share-close").onclick = close;
    document.addEventListener("keydown", onKey);
    document.addEventListener("keydown", trap, true);
    document.body.appendChild(ov);
    input.focus(); input.select();
  }

  function mount(host, { url, title }) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "share-btn"; b.textContent = "↗ Chia sẻ";
    b.onclick = () => open(url, title);
    host.appendChild(b);
  }
  window.SiteShare = { mount, open };
})();
