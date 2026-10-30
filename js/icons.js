/* icons.js
   Shared library of social/media icon markup + brand colors.
   Both /js/main.js (root vi/en pages) and /Channel/js/main.js read
   from this single object, so adding a brand-new platform only
   means adding one entry here — every page picks it up automatically.

   Each entry: { bg: "<css background value>", svg: "<inline svg markup>" }
*/
window.MEDIA_ICONS = {
  youtube: {
    bg: "#ff1e1e",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="4" width="22" height="16" rx="4" fill="#ff1e1e"/>
      <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#ffffff"/>
    </svg>`
  },

  facebook: {
    bg: "#1877f2",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#1877f2"/>
      <path d="M13.6 21V13.1H16.2L16.6 10H13.6V8.1C13.6 7.2 13.9 6.6 15.2 6.6H16.7V3.9C16.1 3.8 15.4 3.7 14.6 3.7C12.2 3.7 10.6 5.2 10.6 7.8V10H8V13.1H10.6V21H13.6Z" fill="#ffffff"/>
    </svg>`
  },

  tiktok: {
    bg: "#000000",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.5 3c.3 2 1.6 3.4 3.6 3.6v2.7c-1.3.1-2.6-.3-3.6-1v6.4c0 3.1-2.5 5.3-5.3 5.3-3 0-5.3-2.4-5.3-5.3 0-3.1 2.6-5.4 5.7-5.2v2.8c-.2-.1-.5-.1-.7-.1-1.3 0-2.4 1.1-2.4 2.5 0 1.4 1.1 2.5 2.5 2.5 1.4 0 2.6-1 2.6-2.6V3h2.9Z" fill="url(#tt-grad)"/>
      <defs>
        <linearGradient id="tt-grad" x1="6" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#25F4EE"/>
          <stop offset="0.5" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#FE2C55"/>
        </linearGradient>
      </defs>
    </svg>`
  },

  x: {
    bg: "#000000",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 4L10.6 11.6L5.2 20H7.4L11.6 13.6L15.2 20H19.5L13.6 11.9L18.6 4H16.4L12.5 10L9.3 4H5Z" fill="#ffffff"/>
    </svg>`
  },

  instagram: {
    bg: "linear-gradient(135deg,#f9ce34,#ee2a7b 55%,#6228d7)",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="#ffffff" stroke-width="1.6"/>
      <circle cx="12" cy="12" r="4.6" fill="none" stroke="#ffffff" stroke-width="1.6"/>
      <circle cx="17.2" cy="6.8" r="1.2" fill="#ffffff"/>
    </svg>`
  },

  discord: {
    bg: "#5865F2",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#5865F2"/>
      <path d="M16.9 8.3c-1-.5-2-.8-3.1-1l-.2.4c1 .2 1.9.5 2.7 1-1.3-.6-2.7-.9-4.3-.9s-3 .3-4.3.9c.8-.5 1.7-.8 2.7-1l-.2-.4c-1.1.2-2.1.5-3.1 1-1.5 2.2-1.9 4.4-1.7 6.5 1.1.8 2.2 1.3 3.3 1.6l.4-.6c-.6-.2-1.1-.5-1.6-.8.1-.1.3-.2.4-.3 1.4.6 2.9.9 4.1.9s2.7-.3 4.1-.9c.1.1.3.2.4.3-.5.3-1 .6-1.6.8l.4.6c1.1-.3 2.2-.8 3.3-1.6.3-2.5-.4-4.7-1.8-6.5ZM10 14c-.6 0-1.1-.6-1.1-1.3s.5-1.3 1.1-1.3 1.1.6 1.1 1.3-.5 1.3-1.1 1.3Zm4 0c-.6 0-1.1-.6-1.1-1.3s.5-1.3 1.1-1.3 1.1.6 1.1 1.3-.5 1.3-1.1 1.3Z" fill="#ffffff"/>
    </svg>`
  },

  twitch: {
    bg: "#9146FF",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#9146FF"/>
      <path d="M6 4L5 7v11h4v2.5L11.5 18H15l3-3V4H6Z" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
      <rect x="12.3" y="7.3" width="1.3" height="4" fill="#ffffff"/>
      <rect x="15.5" y="7.3" width="1.3" height="4" fill="#ffffff"/>
    </svg>`
  },

  telegram: {
    bg: "#26A5E4",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#26A5E4"/>
      <path d="M5.5 12.1L17 7.6c.6-.2 1.1.2.9.9l-2 9.4c-.1.6-.5.7-.9.5l-2.9-2.1-1.4 1.4c-.2.2-.3.3-.6.3l.2-3 5.5-5-6.4 4-2.7-.9c-.6-.2-.6-.6.1-.9Z" fill="#ffffff"/>
    </svg>`
  },

  ticket: {
    bg: "linear-gradient(180deg,#3fce3f,#1f9a2f)",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.5a1.75 1.75 0 0 0 0 3.5V15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a1.75 1.75 0 0 0 0-3.5V8Z" fill="#ffffff" fill-opacity="0.95"/>
      <path d="M9 6v12" stroke="#3fce3f" stroke-width="2" stroke-dasharray="2.5 2.5"/>
    </svg>`
  },

  /* Threads: dùng ký tự @ cách điệu (không phải logo chính thức) */
  threads: {
    bg: "#000000",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#000000"/>
      <text x="12" y="17.2" text-anchor="middle" font-size="15" font-weight="700" fill="#ffffff" font-family="Arial,Helvetica,sans-serif">@</text>
    </svg>`
  },

  messenger: {
    bg: "linear-gradient(135deg,#00b2ff,#006aff 55%,#a033ff)",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.5C6.7 2.5 2.6 6.5 2.6 11.6c0 2.7 1.2 5.1 3.1 6.7V22l3.5-1.9c.9.3 1.8.4 2.8.4 5.3 0 9.4-4 9.4-9S17.3 2.5 12 2.5Z" fill="#ffffff"/>
      <path d="M6.4 14.1l3.7-3.9 2.1 2 3.9-2-3.8 4-2.1-2-3.8 1.9Z" fill="#006aff"/>
    </svg>`
  },

  email: {
    bg: "linear-gradient(180deg,#6b7a99,#46536f)",
    svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="20" height="14" rx="3" fill="#ffffff"/>
      <path d="M3.5 7.5L12 13.2L20.5 7.5" stroke="#46536f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  }
};
