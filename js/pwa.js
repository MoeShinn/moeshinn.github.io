/* Đăng ký service worker (PWA) và báo khi có bản mới của trang. */
(() => {
  if (!("serviceWorker" in navigator) || !(location.protocol === "https:" || location.hostname === "localhost")) return;
  let had = !!navigator.serviceWorker.controller; // lần đầu cài đặt thì không báo "bản mới"
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!had) { had = true; return; } bar(); });
  const go = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
  if (document.readyState === "complete") go(); else addEventListener("load", go);
  function bar() {
    if (document.getElementById("pwa-update")) return;
    const d = document.createElement("div"); d.id = "pwa-update";
    d.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;background:#16304f;color:#fff;padding:10px 14px;border-radius:12px;font:14px system-ui,sans-serif;box-shadow:0 4px 16px #0006;display:flex;gap:10px;align-items:center";
    d.innerHTML = '<span>Có bản mới của trang.</span><button style="background:#1f6fd6;color:#fff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer">Tải lại</button>';
    d.querySelector("button").onclick = () => location.reload();
    document.body.appendChild(d);
  }
})();
