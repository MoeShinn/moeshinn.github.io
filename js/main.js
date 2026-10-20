/* main.js
   Fetches /data.json and renders the profile card. Single default
   language (Vietnamese) — no /vi or /en split, no language switcher.
*/

// Icon markup + brand colors live in /js/icons.js (window.MEDIA_ICONS)
// so new platforms can be added in one place for every page.
const ICONS = Object.fromEntries(
  Object.entries(window.MEDIA_ICONS || {}).map(([id, def]) => [id, def.svg])
);

async function loadData() {
  // Dùng chung bản đã tải bởi site-chrome.js (window.siteJSON) → không gọi /data.json lần thứ hai.
  const data = window.siteJSON ? await window.siteJSON("/data.json") : await (await fetch("/data.json", { cache: "no-cache" })).json();
  if (!data) throw new Error("Could not load data.json");
  return data;
}

function labelText(label) {
  if (label && typeof label === "object") {
    return label.vi || label.en || Object.values(label)[0] || "";
  }
  return label || "";
}

// Chỉ cho phép link http(s), mailto, tel hoặc đường dẫn nội bộ; chặn javascript:, data:, vbscript:...
function safeHref(url) {
  let u = String(url || "").trim();
  if (/^[a-z0-9][a-z0-9_-]*$/i.test(u)) u = "/" + u + "/"; // "channel" -> "/channel/" (khớp bản dựng sẵn trong HTML, tránh bị chuyển hướng)
  const probe = u.replace(/[\u0000-\u0020\u007f]/g, "");
  if (/^[a-z][a-z0-9+.-]*:/i.test(probe) && !/^(https?|mailto|tel):/i.test(probe)) return "#";
  return u;
}

function render(data) {
  // Avatar + name
  const avatarImg = document.querySelector("[data-avatar]");
  if (avatarImg) avatarImg.src = data.profile.avatar;

  const statusDot = document.querySelector("[data-status-dot]");
  if (statusDot) {
    // profile.showOnline: false → ẩn chấm; profile.statusColor → màu chấm (đặt trong /admin → Cài đặt)
    if (data.profile.showOnline === false) statusDot.remove();
    else statusDot.style.setProperty("--dot", data.profile.statusColor || "#3ddc3d");
  }

  const nameEl = document.querySelector("[data-name]");
  if (nameEl) nameEl.textContent = data.profile.name;

  // Buttons
  const list = document.querySelector("[data-link-list]");
  if (list) {
    list.replaceChildren();
    data.buttons.forEach((btn) => {
      const a = document.createElement("a");
      a.className = `link-btn ${btn.style}`;
      a.href = safeHref(btn.url);
      const iconEl = document.createElement("span");
      iconEl.className = "link-icon";
      iconEl.innerHTML = ICONS[btn.icon] || ""; // SVG tĩnh từ /js/icons.js (code của site), không phải dữ liệu người dùng
      const labelEl = document.createElement("span");
      labelEl.textContent = labelText(btn.label); // văn bản thuần, không hiểu là HTML
      a.append(iconEl, labelEl);
      list.appendChild(a);
    });
  }

  // Footer text is now rendered globally by /js/site-chrome.js from
  // the root data.json's "footer" field.
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

