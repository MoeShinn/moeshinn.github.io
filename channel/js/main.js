/* channel/js/main.js
   Dựng trang /channel từ /channel/data.json (sửa ở /admin → Kênh).
   Mỗi link: { id, icon, label, url, group, visible }
     - icon:    khóa trong js/icons.js (youtube, facebook, tiktok, x, threads, discord, messenger, email...);
                bản cũ chỉ có "id" thì id được dùng làm icon.
     - group:   "contact" → nằm trong mục "Liên hệ"; còn lại → mục mạng xã hội.
     - visible: false → ẩn.
   Avatar, tên và chấm online lấy từ /data.json (cùng cài đặt với trang chủ). */

async function loadData() {
  const [res, root] = await Promise.all([
    fetch("/channel/data.json", { cache: "no-store" }),
    fetch("/data.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);
  if (!res.ok) throw new Error("Could not load channel/data.json");
  const data = await res.json();
  data.profile = { ...(data.profile || {}), ...(root.profile || {}) };
  return data;
}

// Chỉ cho http(s), mailto, tel hoặc đường dẫn nội bộ; chặn javascript:, data:, vbscript:... (giống js/main.js)
function linkHref(url) {
  let u = String(url || "").trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) return "mailto:" + u; // gõ địa chỉ email trần thì tự thêm mailto:
  if (/^[a-z0-9][a-z0-9_-]*$/i.test(u)) u = "/" + u + "/";
  const probe = u.replace(/[\u0000-\u0020\u007f]/g, "");
  if (/^[a-z][a-z0-9+.-]*:/i.test(probe) && !/^(https?|mailto|tel):/i.test(probe)) return "#";
  return u;
}
// Đặt ảnh mới: nếu khác ảnh đã dựng sẵn trong HTML thì gỡ srcset cũ (srcset luôn thắng src nên avatar mới sẽ không hiện).
function setImgSrc(img, url) {
  if (!img || !url) return;
  if (img.getAttribute("src") !== url) img.removeAttribute("srcset");
  img.src = url;
}


function buildButton(link, icon) {
  const a = document.createElement("a");
  a.className = "link-btn";
  a.href = linkHref(link.url);
  if (!a.href.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  a.style.background = icon.bg;
  a.innerHTML = `
    <span class="link-icon">${icon.svg}</span>
    <span class="link-text"></span>
  `;
  a.querySelector(".link-text").textContent = link.label || "";
  return a;
}

function render(data) {
  const avatarImg = document.querySelector("[data-avatar]");
  setImgSrc(avatarImg, data.profile.avatar);

  const statusDot = document.querySelector("[data-status-dot]");
  if (statusDot) {
    if (data.profile.showOnline === false) statusDot.remove();
    else statusDot.style.setProperty("--dot", data.profile.statusColor || "#3ddc3d");
  }

  const nameEl = document.querySelector("[data-name]");
  if (nameEl) nameEl.textContent = data.profile.name;

  const list = document.querySelector("[data-link-list]");
  if (list) {
    list.innerHTML = "";
    const icons = window.MEDIA_ICONS || {};
    const usable = (data.links || []).filter((l) => l.visible !== false && l.url && icons[l.icon || l.id]);
    const social = usable.filter((l) => l.group !== "contact");
    const contact = usable.filter((l) => l.group === "contact");

    social.forEach((l) => list.appendChild(buildButton(l, icons[l.icon || l.id])));
    if (contact.length) {
      const title = document.createElement("h2");
      title.className = "link-section-title";
      title.textContent = "Liên hệ";
      list.appendChild(title);
      contact.forEach((l) => list.appendChild(buildButton(l, icons[l.icon || l.id])));
    }
  }

  // Footer text is rendered globally by /js/site-chrome.js from the root data.json's "footer" field.
}

async function init() {
  try {
    const data = await loadData();
    render(data);
    if (window.SiteLoading) {
      window.SiteLoading.waitFor(data.profile && data.profile.avatar);
      window.SiteLoading.ready();
    }
  } catch (err) {
    console.error(err);
    if (window.SiteLoading) window.SiteLoading.ready();
  }
}

init();
