/* Service worker của Shinju Ch. — đổi VERSION khi muốn xóa sạch cache cũ trên máy mọi người.
   - Trang HTML, JS, CSS, JSON, MD: ưu tiên MẠNG (luôn mới), mất mạng hoặc mạng chậm > 3,5 giây thì dùng bản đã lưu.
   - Ảnh, font: dùng bản đã lưu ngay, rồi cập nhật ngầm cho lần sau.
   - Trang /profile: lưu sẵn trang + dữ liệu lúc cài đặt (xem WARM), và nhận tin nhắn {type:"warm-images", urls:[…]} từ profile/js/main.js để lưu sẵn ảnh của hồ sơ (ảnh model, fan name, nền…) → mở lại khi mất mạng vẫn thấy ảnh.
   - KHÔNG đụng vào /admin, /s/ (link rút gọn), /api/, /sw.js và mọi yêu cầu sang domain khác (bộ đếm, Giscus, Worker donate, Google đăng nhập…). */
const VERSION = "v4", STATIC = `shinju-static-${VERSION}`, PAGES = `shinju-pages-${VERSION}`, OFFLINE = "/offline.html", MAX = 80;
// Mở thẳng link ảnh (bất kỳ ảnh nào của site: /image, /post/photo, /assets…) trên thanh địa chỉ → hiện trang xem ảnh (giao diện kiểu Reddit). Chỉ áp dụng khi mở link ở tab/cửa sổ (gõ địa chỉ, bấm link, chuột phải → mở ảnh trong tab mới):
// <img>, og:image, iframe, fetch… vẫn nhận file ảnh gốc. Thêm ?raw=1 vào link để luôn lấy ảnh gốc.
const IMG_LINK = /\.(?:webp|png|jpe?g|gif|avif|svg)$/i, VIEWER = "/assets/viewer/index.html";
// Các trang/dữ liệu của hồ sơ được tải sẵn lúc cài đặt (cố gắng hết sức: lỗi cũng không sao). Dùng chung kho PAGES với trang offline.
const WARM = ["/profile/", "/profile/data.json", "/channel/data.json"];

self.addEventListener("install", (e) => e.waitUntil(caches.open(PAGES).then((c) => c.addAll([OFFLINE]).then(() => c.add(VIEWER).catch(() => {})).then(() => Promise.all(WARM.map((u) => c.add(u).catch(() => {}))))).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("shinju-") && k !== STATIC && k !== PAGES).map((k) => caches.delete(k)))).then(() => self.clients.claim())));

// Hai mục "ghim": trang offline và trang xem ảnh được lưu lúc cài đặt nên luôn là mục CŨ NHẤT; nếu cứ xóa theo thứ tự cũ → mới thì chúng
// là thứ đầu tiên bị xóa khi cache vượt MAX và mất mạng sẽ không còn trang offline. Vì vậy trim bỏ qua chúng và chỉ xóa mục thường.
const PINNED = new Set([OFFLINE, VIEWER]);
const isPinned = (req) => { try { return PINNED.has(new URL(req.url).pathname); } catch (e) { return false; } };
async function trim(name) {
  const c = await caches.open(name), ks = (await c.keys()).filter((k) => !isPinned(k));
  if (ks.length > MAX) await Promise.all(ks.slice(0, ks.length - MAX).map((k) => c.delete(k)));
}
async function networkFirst(req, name) {
  const cache = await caches.open(name), hit = await cache.match(req);
  const net = fetch(req).then((res) => { if (res.ok) { cache.put(req, res.clone()); trim(name); } return res; });
  if (!hit) return net;
  return Promise.race([net, new Promise((r) => setTimeout(() => r(hit), 3500))]).catch(() => hit);
}
async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name), hit = await cache.match(req);
  const net = fetch(req).then((res) => { if (res.ok) { cache.put(req, res.clone()); trim(name); } return res; });
  if (hit) { net.catch(() => {}); return hit; }
  return net;
}

// Trang /profile gọi tới SW: "hãy lưu sẵn các ảnh này". Chỉ nhận ảnh CÙNG domain, tối đa 12 ảnh/lần, bỏ ảnh > 3 MB, và bỏ qua ảnh đã có trong kho.
self.addEventListener("message", (e) => {
  const d = e.data;
  if (!d || d.type !== "warm-images" || !Array.isArray(d.urls)) return;
  e.waitUntil((async () => {
    const cache = await caches.open(STATIC);
    for (const raw of d.urls.slice(0, 12)) {
      try {
        const u = new URL(String(raw), location.origin);
        if (u.origin !== location.origin || !IMG_LINK.test(u.pathname) || await cache.match(u.href)) continue;
        const res = await fetch(u.href);
        if (res.ok && Number(res.headers.get("content-length") || 0) < 3e6) await cache.put(u.href, res);
      } catch (err) { /* bỏ qua ảnh lỗi */ }
    }
    await trim(STATIC);
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;
  const p = u.pathname;
  if (p.startsWith("/api/")) return; // không bao giờ cache yêu cầu API (Worker donate ở domain khác đã bị bỏ qua bởi dòng trên; dòng này phòng khi sau này gắn API cùng domain)
  if (p.startsWith("/admin") || p.startsWith("/s/") || p === "/sw.js") return;
  if (req.mode === "navigate" && !/^(?:iframe|frame|embed|object)$/.test(req.destination) && IMG_LINK.test(p) && !u.searchParams.has("raw")) {
    e.respondWith(networkFirst(new Request(VIEWER), PAGES).catch(() => fetch(req)).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (req.mode === "navigate") { e.respondWith(networkFirst(req, PAGES).catch(() => caches.match(OFFLINE))); return; }
  if (p.startsWith("/assets/avatar/")) { e.respondWith(networkFirst(req, STATIC)); return; } // avatar ghi đè cùng tên file → lấy bản mới trước
  if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(p)) { e.respondWith(staleWhileRevalidate(req, STATIC)); return; }
  e.respondWith(networkFirst(req, PAGES));
});
