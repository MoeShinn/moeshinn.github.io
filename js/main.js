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
  const res = await fetch("/data.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load data.json");
  return res.json();
}

function labelText(label) {
  if (label && typeof label === "object") {
    return label.vi || label.en || Object.values(label)[0] || "";
  }
  return label || "";
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
    list.innerHTML = "";
    data.buttons.forEach((btn) => {
      const a = document.createElement("a");
      a.className = `link-btn ${btn.style}`;
      a.href = btn.url;
      a.innerHTML = `
        <span class="link-icon">${ICONS[btn.icon] || ""}</span>
        <span>${labelText(btn.label)}</span>
      `;
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
