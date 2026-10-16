/* Service worker của Shinju Ch. — đổi VERSION khi muốn xóa sạch cache cũ trên máy mọi người.
   - Trang HTML, JS, CSS, JSON, MD: ưu tiên MẠNG (luôn mới), mất mạng hoặc mạng chậm > 3,5 giây thì dùng bản đã lưu.
   - Ảnh, font: dùng bản đã lưu ngay, rồi cập nhật ngầm cho lần sau.
   - KHÔNG đụng vào /admin, /s/ (link rút gọn), /sw.js và mọi yêu cầu sang domain khác (bộ đếm, Giscus…). */
const VERSION = "v1", STATIC = `shinju-static-${VERSION}`, PAGES = `shinju-pages-${VERSION}`, OFFLINE = "/offline.html", MAX = 80;

self.addEventListener("install", (e) => e.waitUntil(caches.open(PAGES).then((c) => c.addAll([OFFLINE])).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("shinju-") && k !== STATIC && k !== PAGES).map((k) => caches.delete(k)))).then(() => self.clients.claim())));

async function trim(name) { const c = await caches.open(name), ks = await c.keys(); if (ks.length > MAX) await Promise.all(ks.slice(0, ks.length - MAX).map((k) => c.delete(k))); }
async function networkFirst(req, name) {
  const cache = await caches.open(name), hit = await cache.match(req);
  const net = fetch(req).then((res) => { if (res.ok) { cache.put(req, res.clone()); trim(name); } return res; });
  if (!hit) return net;
  return Promise.race([net, new Promise((r) => setTimeout(() => r(hit), 3500))]).catch(() => hit);
}
async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name), hit = await cache.match(req);
  const net = fetch(req).then((res) => { if (res.ok) { cache.put(req, res.clone()); trim(name); } return res; });
  return hit || net;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;
  const p = u.pathname;
  if (p.startsWith("/admin") || p.startsWith("/s/") || p === "/sw.js") return;
  if (req.mode === "navigate") { e.respondWith(networkFirst(req, PAGES).catch(() => caches.match(OFFLINE))); return; }
  if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(p)) { e.respondWith(staleWhileRevalidate(req, STATIC)); return; }
  e.respondWith(networkFirst(req, PAGES));
});
