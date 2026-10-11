/* Channel/js/main.js
   Renders the /Channel page. A button only appears for a platform
   id if that id is present in Channel/data.json's "links" array —
   remove/add an entry there and the button disappears/appears.
   Icon markup + brand colors come from the shared /js/icons.js file.
*/

async function loadData() {
  const res = await fetch("/channel/data.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load Channel/data.json");
  return res.json();
}

function render(data) {
  const avatarImg = document.querySelector("[data-avatar]");
  if (avatarImg) avatarImg.src = data.profile.avatar;

  const statusDot = document.querySelector("[data-status-dot]");
  if (statusDot) statusDot.style.background = data.profile.statusColor;

  const nameEl = document.querySelector("[data-name]");
  if (nameEl) nameEl.textContent = data.profile.name;

  const list = document.querySelector("[data-link-list]");
  if (list) {
    list.innerHTML = "";
    const icons = window.MEDIA_ICONS || {};

    (data.links || []).forEach((link) => {
      const icon = icons[link.id];
      if (!icon || !link.url) return; // unknown or not-yet-ready platform: skip

      const a = document.createElement("a");
      a.className = "link-btn";
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.background = icon.bg;
      a.innerHTML = `
        <span class="link-icon">${icon.svg}</span>
        <span class="link-text">${link.label}</span>
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
