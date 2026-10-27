/* Shinju download page — download/js/main.js
   URL: /download/<id>/  ->  fetches /download/data/<id>.json for this file's
   config, plus the shared /download/link-data.json pool.
   URL: /download/  ->  trang danh sách (HTML dựng sẵn bởi tools/prerender.js từ download/data/*.json).
   Id sai / fetch failure -> redirect to the site's 404 (location.replace: không để lại mục trong lịch sử, nút Back không bị kẹt vòng lặp).

   Link-unlock mechanism (Page Visibility API):
   Clicking a link button opens a random matching, non-expired link
   from link-data.json in a NEW TAB, then marks that button "active".
   While this tab is hidden (document.hidden), time is NOT ticked live
   (the page can't repaint while hidden anyway) — instead, the elapsed
   hidden-time is added to that button's progress the moment the
   person switches back to this tab. Progress accumulates across
   multiple back-and-forth switches until it reaches the required
   seconds. Only the most-recently-clicked, not-yet-done button
   receives credit for a given hidden period — idly switching tabs
   without ever clicking a button earns nothing.

   Download buttons: a file can have MORE THAN ONE (e.g. a primary
   link + a backup mirror) — see config.downloads below. All of them
   share the same unlock condition (finish the required links), and a
   click on ANY of them counts as one "download" for the counter.
*/

const SITE_404 = "/404.html";

// Self-hosted counter system (same one post/js/main.js uses): reads go
// straight to GitHub's raw-content CDN, only the +1 "hit" goes through
// the small Cloudflare Worker. See /counter-api-cf/README.md.
// IMPORTANT: fill these in with your real values after following that
// README — these are just placeholders.
const COUNTERS_REPO_OWNER = "MoeShinn";
const COUNTERS_REPO_NAME = "api-counters";
const COUNTERS_BRANCH = "main";
const COUNTERS_RAW_BASE = `https://raw.githubusercontent.com/${COUNTERS_REPO_OWNER}/${COUNTERS_REPO_NAME}/${COUNTERS_BRANCH}`;
const COUNTER_API_BASE = "https://n238.git-api.workers.dev";
const COUNTER_TYPE = "download"; // matches a key in the Worker's COUNTER_TYPES env var

// Id lấy từ đường dẫn /download/<id>/ (không dùng query ?f= nữa).
function getFileId() {
    const m = window.location.pathname.match(/^\/download\/([^\/.]+)\/?$/);
    return m ? decodeURIComponent(m[1]) : null;
}

// /download/ (không có id) là trang danh sách, không phải lỗi 404.
function isListPage() {
    return /^\/download\/?(?:index\.html)?$/.test(window.location.pathname);
}

// Chuyển sang 404 mà KHÔNG thêm mục vào lịch sử: nếu dùng location.href thì bấm Back sẽ quay lại trang lỗi rồi bị đẩy sang 404 lần nữa (vòng lặp).
function goTo404() {
    window.location.replace(SITE_404);
}

// Chỉ cho phép link http(s), mailto, tel hoặc đường dẫn nội bộ; chặn javascript:, data:, vbscript:...
function safeUrl(url) {
    const u = String(url || "").trim();
    const probe = u.replace(/[\u0000-\u0020\u007f]/g, "");
    if (/^[a-z][a-z0-9+.-]*:/i.test(probe) && !/^(https?|mailto|tel):/i.test(probe)) return "about:blank";
    return u;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

// `cache` defaults to "no-store" (used for the +1 request to the Worker).
// Reads pass "default" because their URL already changes every minute.
async function fetchWithTimeout(url, ms, cache = "no-store") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { signal: controller.signal, cache });
    } finally {
        clearTimeout(timer);
    }
}

// How often a counter file is allowed to be re-fetched from GitHub's
// raw CDN. The URL carries the current "time bucket" (?t=<n>), so:
//   - within the same minute every read shares one cached copy (a page
//     with many posts doesn't hammer raw.githubusercontent.com), and
//   - the moment a new minute starts the URL is different, so neither
//     the browser nor the CDN can answer with an older cached number.
// Counters are only written about once a minute anyway, so a 60 s bucket
// always shows the newest value that exists.
const COUNTER_READ_BUCKET_MS = 60 * 1000;
function counterReadUrl(id) {
    const bucket = Math.floor(Date.now() / COUNTER_READ_BUCKET_MS);
    return `${COUNTERS_RAW_BASE}/${COUNTER_TYPE}-${encodeURIComponent(id)}.json?t=${bucket}`;
}


// ---- Giới hạn lượt gọi Worker theo ngày ------------------------------
// Worker n238 ghi số request trong ngày (UTC) vào api-usage.json ở repo
// api-counters. Đọc file đó (qua raw, không tốn request Cloudflare) TRƯỚC khi
// gọi /hit: nếu hôm nay đã chạm mức giới hạn thì web vẫn chạy bình thường nhưng
// không gọi Worker nữa, để dành phần còn lại cho admin-api.
// Lỗi đọc / chưa có file / file của ngày cũ -> coi như còn được phép (Worker
// vẫn tự chặn ở phía nó, nên an toàn).
const COUNTER_USAGE_FILE = "api-usage.json";
let counterGateCache = null; // { at, promise }
function counterApiAllowed() {
    const now = Date.now();
    if (counterGateCache && now - counterGateCache.at < COUNTER_READ_BUCKET_MS) return counterGateCache.promise;
    const promise = (async () => {
        try {
            const bucket = Math.floor(now / COUNTER_READ_BUCKET_MS);
            const res = await fetchWithTimeout(`${COUNTERS_RAW_BASE}/${COUNTER_USAGE_FILE}?t=${bucket}`, 3000, "default");
            if (!res.ok) return true;
            const u = await res.json();
            if (u.date !== new Date().toISOString().slice(0, 10)) return true; // file của ngày hôm qua: Worker đã reset
            const limit = Number(u.limit) || 0;
            return !(u.blocked === true || (limit > 0 && Number(u.requests) >= limit));
        } catch (e) {
            return true;
        }
    })();
    counterGateCache = { at: now, promise };
    return promise;
}


// Rút gọn số: 300000 -> 300K, 4160 -> 4.2K, 1234567 -> 1.2M (K=1e3, M=1e6, B=1e9, làm tròn 0.1)
function formatCount(n) {
    n = Number(n);
    if (!Number.isFinite(n)) return "0";
    const abs = Math.abs(n), sign = n < 0 ? "-" : "";
    if (abs < 1000) return sign + Math.round(abs);
    const units = [[1e9, "B"], [1e6, "M"], [1e3, "K"]];
    let i = units.findIndex(([u]) => abs >= u);
    let tenths = Math.round((abs * 10) / units[i][0]);
    // làm tròn sát mốc (vd 999.95K) thì nhảy lên đơn vị lớn hơn
    if (tenths >= 10000 && i > 0) { i--; tenths = Math.round((abs * 10) / units[i][0]); }
    const whole = Math.floor(tenths / 10), dec = tenths % 10;
    return sign + (dec ? `${whole}.${dec}` : `${whole}`) + units[i][1];
}

async function getDownloadCount(id) {
    try {
        const res = await fetchWithTimeout(counterReadUrl(id), 4000, "default");
        if (!res.ok) return 0;
        const data = await res.json();
        return data.downloads || 0;
    } catch (e) {
        return 0; // GitHub unreachable or too slow — don't break the page over it
    }
}

async function hitDownloadCount(id) {
    try {
        // Hôm nay đã chạm giới hạn lượt gọi Worker -> không gọi nữa (việc tải file vẫn diễn ra bình thường).
        if (!(await counterApiAllowed())) return null;
        const res = await fetchWithTimeout(
            `${COUNTER_API_BASE}/hit/${COUNTER_TYPE}/${encodeURIComponent(id)}`,
            4000
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (data.limited) return null; // Worker báo đã hết hạn mức trong ngày
        return data.downloads == null ? null : data.downloads;
    } catch (e) {
        return null; // Worker unreachable/cold-starting — the download itself still proceeds
    }
}

/* ============================================================== */
/* Data loading                                                     */
/* ============================================================== */

// Accepts either the current format (config.downloads: [...]) or the
// older single-button format (config.download: {...}) for a smooth
// upgrade — old data/<id>.json files don't need to be rewritten right
// away, they just only ever show one button until you add more.
function normalizeDownloads(config) {
    if (Array.isArray(config.downloads) && config.downloads.length) {
        return config.downloads;
    }
    if (config.download && config.download.url) {
        return [{ id: "primary", ...config.download }];
    }
    return [];
}

async function loadFileConfig(id) {
    const res = await fetch(`/download/data/${encodeURIComponent(id)}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`config not found (HTTP ${res.status})`);

    const text = await res.text();
    let config;
    try {
        config = JSON.parse(text);
    } catch (e) {
        // JSON.parse can fail for two very different reasons: (1) the data
        // file itself has a syntax error, or (2) some hosts (e.g. IIS with
        // a custom 404 page set to responseMode="ExecuteURL") respond with
        // status 200 and an error page's HTML instead of a real 404 — res.ok
        // would be true even though this isn't real JSON. Report both
        // possibilities rather than assuming one.
        throw new Error(
            `data/${id}.json is not valid JSON (check the file for a syntax error, or the server may have substituted an error page for a missing file): ${e.message}`
        );
    }

    if (!config || typeof config !== "object") {
        throw new Error("invalid download config");
    }
    const downloads = normalizeDownloads(config);
    if (!downloads.length) {
        throw new Error('invalid download config — need at least one entry in "downloads"');
    }
    config.downloads = downloads;
    return config;
}

async function loadLinkPool() {
    try {
        const res = await fetch("/download/link-data.json", { cache: "no-store" });
        if (!res.ok) return { links: [] };
        const data = await res.json();
        return { links: Array.isArray(data.links) ? data.links : [] };
    } catch (e) {
        return { links: [] }; // shared pool unreachable -> every button falls back to "skip"
    }
}

/* ============================================================== */
/* Link selection                                                   */
/* ============================================================== */

function isLinkValid(expires) {
    if (!expires) return true;
    const norm = String(expires).trim().toLowerCase();
    if (norm === "inf" || norm === "infinity") return true;

    const m = norm.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) {
        console.warn(`download: unrecognized "expires" value "${expires}", treating link as expired`);
        return false;
    }
    const [, dd, mm, yyyy] = m;
    const expiryDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 23, 59, 59);
    return Date.now() <= expiryDate.getTime();
}

// Link có thể bị tắt thủ công (enabled: false) hoặc hẹn ngày bắt đầu (start: "dd/mm/yyyy") từ trang quản trị.
function hasStarted(start) {
    const m = String(start || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return !m || Date.now() >= new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
}

function pickLink(categories, pool) {
    const wanted = new Set((categories || []).map((c) => c.toLowerCase()));
    const matches = pool.links.filter(
        (link) => link.enabled !== false && hasStarted(link.start) && wanted.has(String(link.category || "").toLowerCase()) && isLinkValid(link.expires)
    );
    if (!matches.length) return null;
    return matches[Math.floor(Math.random() * matches.length)];
}

/* ============================================================== */
/* Per-button progress (sessionStorage — resets when the tab closes) */
/* ============================================================== */

function progressKey(fileId, buttonId) {
    return `dl_progress_${fileId}_${buttonId}`;
}

function getProgress(fileId, buttonId) {
    try {
        const raw = sessionStorage.getItem(progressKey(fileId, buttonId));
        if (!raw) return { seconds: 0, completed: false };
        return JSON.parse(raw);
    } catch (e) {
        return { seconds: 0, completed: false };
    }
}

function setProgress(fileId, buttonId, progress) {
    try {
        sessionStorage.setItem(progressKey(fileId, buttonId), JSON.stringify(progress));
    } catch (e) {
        // sessionStorage unavailable (private mode etc.) — progress just won't persist across reload
    }
}

/* ============================================================== */
/* Page logic                                                       */
/* ============================================================== */

// Nạp js/share.js khi cần (để các trang đã tạo sẵn từ trước vẫn có nút chia sẻ).
function ensureShare() {
    if (window.SiteShare) return Promise.resolve();
    return new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = "/js/share.js";
        s.onload = s.onerror = () => resolve();
        document.head.appendChild(s);
    });
}

async function renderComments(config) {
    if (config.comments === false) return; // tắt riêng cho mục tải này trong /admin/download
    let cfg = null;
    try {
        const res = await fetch("/site-settings.json", { cache: "no-cache" });
        if (res.ok) cfg = (await res.json()).giscus;
    } catch (e) {
        return;
    }
    if (!cfg || cfg.enabled === false || !cfg.repo || !cfg.repoId || !cfg.categoryId) return;
    const card = document.querySelector(".download-card");
    if (!card) return;
    const section = document.createElement("section");
    section.className = "download-comments";
    section.innerHTML = "<h2>Bình luận</h2>";
    card.after(section);
    const load = () => {
        const s = document.createElement("script");
        s.src = "https://giscus.app/client.js";
        s.async = true;
        s.crossOrigin = "anonymous";
        const attrs = { repo: cfg.repo, "repo-id": cfg.repoId, category: cfg.category, "category-id": cfg.categoryId, mapping: cfg.mapping || "pathname", strict: "0", "reactions-enabled": "1", "emit-metadata": "0", "input-position": "bottom", theme: "dark", lang: "vi", loading: "lazy" };
        Object.entries(attrs).forEach(([k, v]) => s.setAttribute("data-" + k, v));
        section.appendChild(s);
    };
    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "400px" });
        io.observe(section);
    } else {
        load();
    }
}

async function mountShare(config, fileId) {
    const host = document.querySelector("[data-share]");
    if (!host) return;
    const url = config.short ? `${location.origin}/s/${config.short}/` : `${location.origin}/download/${encodeURIComponent(fileId)}/`;
    await ensureShare();
    if (window.SiteShare) window.SiteShare.mount(host, { url, title: config.title || document.title });
}

// Trang danh sách /download/: HTML (lưới thẻ) đã dựng sẵn bởi tools/prerender.js; ở đây chỉ thêm phần cần JS:
// nhãn "Mới" (14 ngày gần nhất, tính theo giờ người xem nên không bị cũ), ô tìm kiếm (từ 4 mục, không cần gõ dấu) và số lượt tải.
function initList(root) {
    const hub = root && root.querySelector(".dl-hub");
    if (!hub) return;
    const items = [...hub.querySelectorAll(".dl-grid > li")];
    const fold = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
    const now = Date.now();
    items.forEach((li) => {
        const ms = Date.parse(li.dataset.date);
        if (ms && now >= ms && now - ms < 14 * 864e5) li.querySelector(".dl-new").hidden = false;
        li._q = fold(li.dataset.q);
    });
    const box = hub.querySelector(".dl-search"), input = box && box.querySelector("input"), empty = hub.querySelector(".dl-empty"), countEl = hub.querySelector(".dl-count");
    if (box && items.length >= 4) {
        box.hidden = false;
        input.addEventListener("input", () => {
            const k = fold(input.value.trim());
            let n = 0;
            items.forEach((li) => { const hit = !k || li._q.includes(k); li.hidden = !hit; if (hit) n++; });
            empty.hidden = n > 0;
            countEl.textContent = k ? `${n} / ${items.length} mục` : `${items.length} mục`;
        });
    }
    // Lượt tải đọc từ bộ đếm (mỗi mục 1 file nhỏ, chia sẻ cache theo phút); chỉ làm cho 12 mục đầu, lỗi thì bỏ qua.
    items.slice(0, 12).forEach(async (li) => {
        const n = await getDownloadCount(li.querySelector(".dl-card").dataset.id);
        if (n > 0) { const chip = li.querySelector(".dl-dl"); chip.querySelector("b").textContent = formatCount(n); chip.hidden = false; }
    });
}

async function main() {
    const fileId = getFileId();
    if (!fileId) {
        if (isListPage()) {
            // Danh sách đã được dựng sẵn trong HTML; chỉ cần mở màn hình chờ. Nếu vì lý do nào đó chưa có thì báo gọn thay vì để trang trống.
            const root = document.getElementById("app");
            if (root && !root.querySelector(".download-index")) {
                root.innerHTML = `<div class="download-card download-index"><h1 class="download-title">Tải xuống</h1><p class="download-hint">Danh sách đang được cập nhật, bạn quay lại sau ít phút nhé.</p></div>`;
            }
            initList(root);
            if (window.SiteLoading) window.SiteLoading.ready();
            return;
        }
        goTo404();
        return;
    }

    let config;
    try {
        config = await loadFileConfig(fileId);
    } catch (e) {
        console.error(`download: could not load data/${fileId}.json —`, e.message);
        goTo404();
        return;
    }

    const pool = await loadLinkPool();
    const root = document.getElementById("app");

    // "hint" trong file json: chữ tự đặt; chuỗi rỗng = ẩn; không có = câu mặc định.
    const hintText = typeof config.hint === "string" ? config.hint
        : config.requireAllLinks === false ? "Bạn có thể tải ngay. Nếu muốn ủng hộ mình, hãy bấm các nút bên dưới nhé!"
        : "Bấm vào các liên kết bên dưới để ủng hộ mình, sau đó bấm Tải Xuống nhé!";
    const downloadButtonsHtml = config.downloads
        .map(
            (dl, i) => `
      <button type="button" class="download-btn locked" data-download-btn data-download-index="${i}" disabled>
        🔒 <span>${escapeHtml(dl.label || (i === 0 ? "Tải Xuống" : `Link dự phòng ${i}`))}</span>
      </button>`
        )
        .join("");

    root.innerHTML = `
    <div class="download-card">
      <h1 class="download-title">${escapeHtml(config.title || "Tải xuống")}</h1>
      ${hintText ? `<p class="download-hint">${escapeHtml(hintText)}</p>` : ""}
      <div class="link-button-list" data-link-list></div>
      <p class="download-count" data-download-count>⬇ …</p>
      <div class="download-btn-list" data-download-list>${downloadButtonsHtml}</div>
      <p class="download-note" data-download-note></p>
      <div class="download-share" data-share></div>
    </div>
  `;

    if (window.SiteLoading) window.SiteLoading.ready();
    mountShare(config, fileId);
    renderComments(config);

    // Show the current download count right away (read-only — never
    // increments). The actual +1 only happens when a download button
    // is really clicked, further down.
    const downloadCountEl = document.querySelector("[data-download-count]");
    getDownloadCount(fileId).then((count) => {
        downloadCountEl.textContent = `⬇ ${formatCount(count)}`;
    });

    const linkButtons = Array.isArray(config.linkButtons) ? config.linkButtons : [];
    const requireAll = config.requireAllLinks !== false; // default true unless explicitly false
    const list = document.querySelector("[data-link-list]");
    const downloadBtns = Array.from(document.querySelectorAll("[data-download-btn]"));
    const downloadNote = document.querySelector("[data-download-note]");

    // in-memory view of each link button's state, keyed by button id
    const state = {};
    let activeButtonId = null; // the link button currently "earning" hidden-time
    let hiddenSince = null;

    function isButtonDone(btn) {
        return state[btn.id].completed;
    }

    function checkUnlock() {
        const unlocked = !requireAll || linkButtons.every(isButtonDone);
        downloadBtns.forEach((el) => {
            const i = Number(el.getAttribute("data-download-index"));
            const dl = config.downloads[i];
            const label = escapeHtml(dl.label || (i === 0 ? "Tải Xuống" : `Link dự phòng ${i}`));
            el.classList.toggle("locked", !unlocked);
            el.classList.toggle("unlocked", unlocked);
            el.disabled = !unlocked;
            el.innerHTML = unlocked ? `<span>${label}</span>` : `🔒 <span>${label}</span>`;
        });
    }

    function renderButtonUI(btn) {
        const el = document.querySelector(`[data-btn-id="${CSS.escape(String(btn.id))}"]`);
        if (!el) return;
        const s = state[btn.id];
        const statusEl = el.querySelector("[data-link-status]");

        el.classList.remove("in-progress", "completed", "skipped");
        if (s.skipped) {
            el.classList.add("skipped");
            el.disabled = true;
            statusEl.textContent = "Không khả dụng — đã bỏ qua";
        } else if (s.completed) {
            el.classList.add("completed");
            el.disabled = true;
            statusEl.textContent = "✅ Đã hoàn thành";
        } else if (s.seconds > 0) {
            el.classList.add("in-progress");
            const remain = Math.max(0, btn.seconds - s.seconds);
            statusEl.textContent = `Còn thiếu ${Math.ceil(remain)}s`;
        } else {
            statusEl.textContent = `${btn.seconds}s`;
        }
    }

    linkButtons.forEach((btn) => {
        const saved = getProgress(fileId, btn.id);
        state[btn.id] = { seconds: saved.seconds || 0, completed: !!saved.completed, skipped: false };

        const item = document.createElement("button");
        item.type = "button";
        item.className = "link-btn";
        item.setAttribute("data-btn-id", btn.id);
        item.innerHTML = `
      <span class="link-btn-label">${escapeHtml(btn.label || "Mở liên kết")}</span>
      <span class="link-btn-status" data-link-status></span>
    `;

        item.addEventListener("click", () => {
            if (state[btn.id].completed || state[btn.id].skipped) return;

            // type "custom": mở đúng link đã đặt; còn lại: chọn ngẫu nhiên trong nhóm liên kết.
            const link = btn.type === "custom" ? (/^https?:\/\//i.test(btn.url || "") ? { url: btn.url } : null) : pickLink(btn.categories, pool);
            if (!link) {
                // No valid link available for this button's categories -> per
                // site policy, auto-skip it rather than blocking the download.
                state[btn.id].completed = true;
                state[btn.id].skipped = true;
                setProgress(fileId, btn.id, state[btn.id]);
                renderButtonUI(btn);
                checkUnlock();
                return;
            }

            window.open(link.url, "_blank", "noopener,noreferrer");
            activeButtonId = btn.id;
            renderButtonUI(btn);
        });

        list.appendChild(item);
        renderButtonUI(btn);
    });

    checkUnlock();

    // Page Visibility API: only the most-recently-clicked, not-yet-done
    // button earns credit for a period the tab spent hidden.
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            hiddenSince = Date.now();
            return;
        }
        if (hiddenSince && activeButtonId && state[activeButtonId] && !state[activeButtonId].completed) {
            const elapsedSec = (Date.now() - hiddenSince) / 1000;
            const btn = linkButtons.find((b) => b.id === activeButtonId);
            const s = state[activeButtonId];
            s.seconds = Math.min(btn.seconds, s.seconds + elapsedSec);
            if (s.seconds >= btn.seconds) s.completed = true;
            setProgress(fileId, activeButtonId, s);
            renderButtonUI(btn);
            checkUnlock();
        }
        hiddenSince = null;
    });

    // Download buttons — any one of them (primary or a backup mirror)
    // triggers the file and counts as one download.
    downloadBtns.forEach((el) => {
        el.addEventListener("click", () => {
            if (el.disabled) return;
            const i = Number(el.getAttribute("data-download-index"));
            const dl = config.downloads[i];

            if (dl.mode === "direct") {
                const a = document.createElement("a");
                a.href = safeUrl(dl.url);
                a.setAttribute("download", "");
                document.body.appendChild(a);
                a.click();
                a.remove();
                downloadNote.textContent = "Đang tải xuống...";
            } else {
                window.open(safeUrl(dl.url), "_blank", "noopener,noreferrer");
            }

            // Count the actual download action (not the page view, not
            // finishing the links) — fire-and-forget, never blocks the
            // download itself if the counter API is slow/cold-starting.
            hitDownloadCount(fileId).then((count) => {
                if (count != null) downloadCountEl.textContent = `⬇ ${formatCount(count)}`;
            });
        });
    });
}

main();

