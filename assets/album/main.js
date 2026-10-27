/* Shinju Album — assets/album/main.js
   Đường dẫn sạch (không dùng query):
     /album/        -> các album đã có ảnh
     /album/<id>/   -> toàn bộ ảnh của album. Trang tĩnh do GitHub Actions dựng sẵn (có SEO + ảnh thật cho Google và AI);
                       JS dưới đây đọc /image/index.json mới nhất và dựng lại đúng cùng HTML bằng assets/album/albumgen.js.
   Bấm vào ảnh = mở thẳng /image/<file> (service worker tự hiện trang xem ảnh).
   Id không tồn tại -> /404.html. */
(() => {
  "use strict";
  const AG = window.AlbumGen;
  const ready = () => { if (window.SiteLoading && window.SiteLoading.ready) window.SiteLoading.ready(); };

  async function main() {
    const app = document.getElementById("app");
    const segs = location.pathname.split("/").filter(Boolean); // ["album"] | ["album", "<id>"] | ["album", "index.html"]
    let id = "";
    if (segs[1] && segs[1] !== "index.html") { try { id = decodeURIComponent(segs[1]); } catch (e) { id = segs[1]; } }

    let idx = null;
    try { const r = await fetch("/image/index.json", { cache: "no-cache" }); if (r.ok) idx = AG.normalize(await r.json()); } catch (e) { /* giữ HTML tĩnh */ }
    if (!idx) { // không đọc được dữ liệu: giữ nguyên HTML tĩnh nếu có, không thì báo lỗi nhẹ
      if (app && !app.children.length) app.innerHTML = '<p class="empty-msg" style="text-align:center">Không tải được danh sách ảnh. Vui lòng tải lại trang.</p>';
      ready(); return;
    }

    let html;
    if (!id) html = AG.bodyHub({ idx });
    else {
      const album = AG.find(idx, id);
      if (!album) { location.replace("/404.html"); return; }
      html = AG.bodyAlbum({ idx, album });
      document.title = `${album.name} — ${AG.HUB} — ${(document.title.split(" — ").pop()) || "Moe Shinn"}`;
    }
    const tmp = document.createElement("div"); tmp.innerHTML = html; // so sánh theo DOM (không phải chuỗi) để biết bản tĩnh đã đúng chưa
    if (tmp.innerHTML !== app.innerHTML.replace(/<!--[\s\S]*?-->/g, "")) app.innerHTML = html; // đúng rồi thì không dựng lại (khỏi nháy ảnh)
    ready();
  }

  main();
})();
