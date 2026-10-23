/* Shinju Blog — post/js/main.js
   Static blog: no build step, no backend. Everything below is plain
   client-side JS reading data/posts.json + data/<id>.md at runtime.

   Routing (đường dẫn sạch, không dùng query):
     /post/                -> homepage (top10, recent, search)
     /post/<id>/           -> trang tĩnh do admin sinh ra (có SEO sẵn); JS đọc
                               /post/data/<id>.md và dựng lại nội dung.
                               Lỗi tải -> /post/post404.html, hoặc báo "riêng tư"
                               nếu bài đặt visibility: "private".

   Visibility (posts.json "visibility" field, optional):
     "public"   (default, same as omitting the field) — shows everywhere.
     "unlisted" — hidden from homepage/search/related posts, but a
                  direct /post/<id>/ link still opens it normally.
     "private"  — hidden everywhere AND a direct /post/<id>/ link is blocked,
                  showing a "private post" notice instead of the content.
     A .md file with no matching posts.json entry at all (e.g. still
     being drafted) behaves like "unlisted", not "private" — it just
     never appears in any entry-less list.
*/

// Self-hosted counter system: reads go straight to GitHub's raw-content
// CDN (fast, no auth, effectively no rate limit for this use case);
// only increments ("hit") go through the small Cloudflare Worker, which
// is the only thing allowed to write to the counters repo. See
// /counter-api-cf.
// IMPORTANT: fill these in with your real values after following
// /counter-api-cf/README.md.
const COUNTERS_REPO_OWNER = "ShinjuVN"; // GitHub username/org
const COUNTERS_REPO_NAME = "api-counters"; // the SEPARATE repo that only holds counter .json files
const COUNTERS_BRANCH = "main";
const COUNTERS_RAW_BASE = `https://raw.githubusercontent.com/${COUNTERS_REPO_OWNER}/${COUNTERS_REPO_NAME}/${COUNTERS_BRANCH}`;
const COUNTER_API_BASE = "https://n238.git-api.workers.dev"; // your deployed Cloudflare Worker URL
const COUNTER_TYPE = "view"; // matches a key in the Worker's COUNTER_TYPES env var

const LAST_SEARCH_KEY = "shinjuvn_blog_last_search";
const CAME_FROM_HOME_KEY = "shinjuvn_blog_from_home";

// localStorage/sessionStorage có thể ném lỗi (trình duyệt nhúng của Zalo/Messenger, chế độ riêng tư, bị chặn cookie…).
// Mọi truy cập đi qua đây: lỗi thì coi như "không có gì", trang vẫn chạy bình thường.
const safeStore = {
    get(key, area) { try { return (area || localStorage).getItem(key); } catch (e) { return null; } },
    set(key, value, area) { try { (area || localStorage).setItem(key, value); } catch (e) { /* bỏ qua */ } },
};
const safeSession = {
    get(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* bỏ qua */ } },
};

// Ảnh trong bài ghi tương đối theo /post/ (vd "photo/a.png"); trang /post/<id>/ cần đường dẫn tuyệt đối.
const assetUrl = (p) => (!p ? "" : /^(https?:)?\/\/|^\//.test(p) ? p : "/post/" + p);

// Escape văn bản trước khi chèn vào chuỗi HTML (innerHTML / template literal).
function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ============================================================== */
/* Self-hosted view counter (replaces the discontinued CountAPI, then  */
/* Abacus) — see /counter-api-cf/README.md for how this is wired up   */
/* end-to-end.                                                         */
/* ============================================================== */

// A slow/unreachable backend shouldn't hang the whole page forever;
// this aborts after `ms` and callers fall back to sensible defaults.
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
function counterReadUrl(id, bucketMs = COUNTER_READ_BUCKET_MS) {
    const bucket = Math.floor(Date.now() / bucketMs);
    return `${COUNTERS_RAW_BASE}/${COUNTER_TYPE}-${encodeURIComponent(id)}.json?t=${bucket}`;
}

// Trang DANH SÁCH bài chỉ cần số xấp xỉ để xếp hạng "nổi bật": dùng ô thời gian 5 phút (thay vì 1 phút), nhớ kết quả trong
// sessionStorage, và gọi tối đa vài request cùng lúc — để không bắn hàng chục request tới raw.githubusercontent.com mỗi lần mở
// trang (dễ chạm giới hạn tốc độ). Trang từng bài vẫn đọc ô 1 phút để số hiện ra mới nhất.
const LIST_VIEWS_BUCKET_MS = 5 * 60 * 1000;
const LIST_VIEWS_CACHE_KEY = "shinjuvn_blog_list_views";
const LIST_VIEWS_CONCURRENCY = 4;
function readListViewsCache() {
    try {
        const c = JSON.parse(safeSession.get(LIST_VIEWS_CACHE_KEY) || "null");
        return c && Date.now() - c.at < LIST_VIEWS_BUCKET_MS && c.v && typeof c.v === "object" ? c.v : {};
    } catch (e) { return {}; }
}
function writeListViewsCache(v) { safeSession.set(LIST_VIEWS_CACHE_KEY, JSON.stringify({ at: Date.now(), v })); }


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

async function getViews(id, bucketMs) {
    try {
        // Straight to GitHub's raw-content CDN — no auth, not the
        // rate-limited REST API, and not the Worker either (reads never
        // go through the Worker at all). 404 just means "no one has
        // viewed this yet", same as 0 views.
        //
        // The URL is time-bucketed (see counterReadUrl) so a number older
        // than about a minute is never served from a cache.
        const res = await fetchWithTimeout(counterReadUrl(id, bucketMs), 4000, "default");
        if (!res.ok) return 0;
        const data = await res.json();
        return data.views || 0;
    } catch (e) {
        return 0; // GitHub unreachable or too slow — don't break the page over it
    }
}

async function hitViews(id) {
    try {
        // Hôm nay đã chạm giới hạn lượt gọi Worker -> không gọi nữa (trang vẫn hiển thị bình thường).
        if (!(await counterApiAllowed())) return null;
        const res = await fetchWithTimeout(
            `${COUNTER_API_BASE}/hit/${COUNTER_TYPE}/${encodeURIComponent(id)}`,
            4000
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (data.limited) return null; // Worker báo đã hết hạn mức trong ngày
        // The Worker batches writes to GitHub (about once a minute), so
        // this is its best-known total including this hit — or missing
        // when it can't know the total yet. null = "keep what's shown".
        return data.views == null ? null : data.views;
    } catch (e) {
        return null; // Worker unreachable/too slow — don't break the page over it
    }
}

/* ============================================================== */
/* Data loading + helpers                                          */
/* ============================================================== */

async function loadPosts() {
    const res = await fetch("/post/data/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load data/posts.json");
    return res.json();
}

// Only "public" (or the field omitted entirely) counts as visible in
// listings/search. "unlisted" and "private" are both excluded here —
// they differ only in whether a direct link is allowed (see
// renderPostPage), not in whether they show up in lists.
function isPublic(p) {
    return !p.visibility || p.visibility === "public";
}

function truncateTitle(title) {
    return title.length > 50 ? title.slice(0, 50) + "..." : title;
}

// Dates are stored as DD/MM/YYYY directly in posts.json and post
// frontmatter, so display needs no conversion — this just guards
// against a missing value.
function formatDate(dateStr) {
    return dateStr || "";
}

// new Date("20/08/2026") is unreliable across browsers — slash-separated
// dates are commonly parsed as MM/DD/YYYY (US format), which would
// silently scramble sorting and the "views per day" score. Every place
// that needs a real Date object from a DD/MM/YYYY string goes through
// this instead of calling `new Date(...)` directly.
function parseDate(dateStr) {
    const m = (dateStr || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return new Date(NaN);
    const [, d, mo, y] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
}

// Matches the search query against the title (không phân biệt hoa/thường và dấu)
// or the DD/MM/YYYY date string, so typing "20/08/2026", "20/08", or just "2026"
// all work as a natural substring.
// Bỏ dấu tiếng Việt + đưa về chữ thường để "huong dan" khớp "Hướng dẫn" (và ngược lại).
// NFD tách dấu ra khỏi chữ cái; riêng đ/Đ không tách được nên đổi tay.
function foldText(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

function filterPosts(posts, query) {
    const q = foldText(query).trim();
    if (!q) return [];
    return posts
        .filter((p) => foldText(p.title).includes(q) || (p.date || "").includes(q))
        .sort((a, b) => parseDate(b.date) - parseDate(a.date));
}

/* ============================================================== */
/* Rendering: post cards                                            */
/* ============================================================== */

function renderCards(container, posts) {
    if (!container) return;
    container.replaceChildren();
    if (!posts.length) {
        const empty = document.createElement("p");
        empty.className = "empty-msg";
        empty.textContent = "Không có bài đăng nào.";
        container.appendChild(empty);
        return;
    }
    posts.forEach((p) => {
        // Dựng bằng DOM + textContent: tiêu đề/ngày/ảnh lấy từ JSON nên không bao giờ được hiểu là HTML.
        const card = document.createElement("a");
        card.className = "post-card";
        card.href = `/post/${encodeURIComponent(p.id)}/`;
        card.addEventListener("click", () => {
            // Lets the post page know it was reached via the homepage, so it
            // can show "related posts" based on the last search term.
            safeSession.set(CAME_FROM_HOME_KEY, "1");
        });

        const title = truncateTitle(String(p.title || ""));

        const photoWrap = document.createElement("div");
        photoWrap.className = "post-card-photo";
        const img = document.createElement("img");
        const src = assetUrl(p.photo);
        if (src) img.src = src;
        img.alt = title;
        img.loading = "lazy";
        photoWrap.appendChild(img);

        const body = document.createElement("div");
        body.className = "post-card-body";

        const h3 = document.createElement("h3");
        h3.className = "post-card-title";
        h3.textContent = title;

        const meta = document.createElement("div");
        meta.className = "post-card-meta";
        const dateSpan = document.createElement("span");
        dateSpan.textContent = formatDate(p.date);
        const viewsSpan = document.createElement("span");
        if (p.views === undefined) {
            // bài cũ: không hiện lượt xem
        } else if (p.views != null) {
            viewsSpan.textContent = `${formatCount(p.views)} lượt xem`;
        } else {
            const loading = document.createElement("span");
            loading.className = "views-loading";
            loading.setAttribute("aria-label", "Đang tải lượt xem");
            loading.append("Đang tải");
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement("span");
                dot.className = "dot";
                dot.textContent = ".";
                loading.appendChild(dot);
            }
            viewsSpan.appendChild(loading);
        }
        meta.append(dateSpan, viewsSpan);

        body.append(h3, meta);
        card.append(photoWrap, body);
        container.appendChild(card);
    });
}

/* ============================================================== */
/* Homepage                                                         */
/* ============================================================== */

function homeTemplate() {
    return `
    <header class="blog-title-bar"><h1>Bài viết &amp; hướng dẫn</h1></header>

    <div class="search-wrap">
      <input type="search" class="search-input" data-search
             placeholder="Tìm theo tiêu đề hoặc ngày (DD/MM/YYYY)..." />
    </div>

    <section class="search-results" data-search-results hidden>
      <h2>Kết quả tìm kiếm</h2>
      <div class="post-grid" data-search-grid></div>
    </section>

    <div data-default-sections>
      <section class="post-section">
        <h2 data-featured-title>🔥 Top bài đăng nổi bật</h2>
        <div class="post-grid" data-top10></div>
      </section>

      <section class="post-section">
        <h2>📝 Bài đăng gần đây</h2>
        <div class="post-grid" data-recent></div>
        <button type="button" class="show-all-btn" data-show-all>Xem tất cả bài đăng</button>
      </section>
    </div>
  `;
}

async function renderHomePage() {
    const root = document.getElementById("app");
    root.innerHTML = homeTemplate();

    // The homepage has no per-post images to wait on beyond the shared
    // bg — let the loading screen close as soon as that's ready.
    if (window.SiteLoading) window.SiteLoading.ready();

    // Cài đặt hiển thị (sửa ở /admin → Cài đặt → Bài đăng): số bài nổi bật, tiêu đề mục nổi bật, số bài mới hiển thị trước khi bấm "Xem tất cả".
    let blog = {};
    try {
        const r = await fetch("/site-settings.json", { cache: "no-cache" });
        if (r.ok) blog = (await r.json()).blog || {};
    } catch (e) { /* dùng mặc định */ }
    const clampInt = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) && v !== "" && v != null ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };
    const FEATURED = clampInt(blog.featuredCount, 10, 0, 30);
    const RECENT = clampInt(blog.recentCount, 10, 1, 50);
    const featuredTitle = document.querySelector("[data-featured-title]");
    if (featuredTitle) {
        if (FEATURED === 0) featuredTitle.closest("section").remove();
        else if (String(blog.featuredTitle || "").trim()) featuredTitle.textContent = String(blog.featuredTitle).trim();
    }

    let posts = [];
    try {
        posts = await loadPosts();
    } catch (e) {
        console.error(e);
    }
    // Unlisted/private posts never appear on the homepage, in "show all",
    // in search results, or in related-posts suggestions.
    posts = posts.filter(isPublic);

    const today = new Date();
    function computeScored(viewsMap, scanDone) {
        return posts.map((p) => {
            const days = Math.max(1, Math.floor((today - parseDate(p.date)) / 86400000));
            const known = viewsMap[p.id];
            // views: số (đã biết) | null (đang tải) | undefined (bài cũ, không hỏi lượt xem để tiết kiệm dữ liệu)
            return { ...p, views: known == null ? (scanDone && !scanIds.has(p.id) ? undefined : null) : known, score: (known || 0) / days };
        });
    }
    function byNewest(list) {
        return [...list].sort((a, b) => parseDate(b.date) - parseDate(a.date));
    }

    // 1) Render right away, sorted by date, with the view count shown as
    //    a loading pulse — so the person sees the post list immediately
    //    instead of an empty page while Abacus is contacted.
    let scored = computeScored({});
    renderCards(document.querySelector("[data-top10]"), byNewest(scored).slice(0, FEATURED));
    renderCards(document.querySelector("[data-recent]"), byNewest(scored).slice(0, RECENT));

    const showAllBtn = document.querySelector("[data-show-all]");
    let showingAll = false;
    if (posts.length <= RECENT) {
        showAllBtn.remove();
    } else {
        showAllBtn.addEventListener("click", () => {
            showingAll = true;
            renderCards(document.querySelector("[data-recent]"), byNewest(scored));
            showAllBtn.remove();
        });
    }

    // Search — partial match on title (không dấu cũng được) or date, persisted to localStorage (nếu trình duyệt cho phép).
    const searchInput = document.querySelector("[data-search]");
    const resultsSection = document.querySelector("[data-search-results]");
    const defaultSections = document.querySelector("[data-default-sections]");
    let currentQuery = "";

    function runSearch(query) {
        currentQuery = query.trim();
        if (!currentQuery) {
            resultsSection.hidden = true;
            defaultSections.hidden = false;
            return;
        }
        defaultSections.hidden = true;
        resultsSection.hidden = false;
        renderCards(document.querySelector("[data-search-grid]"), filterPosts(scored, currentQuery));
    }

    const savedSearch = safeStore.get(LAST_SEARCH_KEY) || "";
    searchInput.value = savedSearch;
    runSearch(savedSearch);

    searchInput.addEventListener("input", () => {
        safeStore.set(LAST_SEARCH_KEY, searchInput.value);
        runSearch(searchInput.value);
    });

    // 2) Fetch real view counts in the background (each request already
    //    has its own 4s timeout; this outer race is a second safety net),
    //    then refresh the view numbers and re-sort "nổi bật" by score.
    // Chỉ hỏi lượt xem của các bài mới nhất (đủ để chọn "nổi bật"): đỡ tốn dữ liệu mạng khi có nhiều bài. Bài cũ hơn không hiện lượt xem ở danh sách.
    const viewsMap = {};
    // Chỉ hỏi lượt xem của vài bài mới nhất (đủ để chọn "nổi bật"); bài cũ hơn không hiện lượt xem ở danh sách.
    const scanIds = new Set(byNewest(posts).slice(0, Math.min(24, Math.max(12, FEATURED * 2, RECENT))).map((p) => p.id));
    const cachedViews = readListViewsCache();
    const toFetch = posts.filter((p) => scanIds.has(p.id)).filter((p) => {
        if (typeof cachedViews[p.id] === "number") { viewsMap[p.id] = cachedViews[p.id]; return false; }
        return true;
    });
    // Hàng đợi có giới hạn số request chạy song song
    let nextIdx = 0;
    const worker = async () => {
        while (nextIdx < toFetch.length) {
            const p = toFetch[nextIdx++];
            viewsMap[p.id] = await getViews(p.id, LIST_VIEWS_BUCKET_MS);
        }
    };
    await Promise.race([
        Promise.all(Array.from({ length: Math.min(LIST_VIEWS_CONCURRENCY, toFetch.length) }, worker)),
        new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
    if (toFetch.length) writeListViewsCache(Object.fromEntries(Object.entries(viewsMap).filter(([, v]) => typeof v === "number")));

    scored = computeScored(viewsMap, true);
    const top10 = [...scored].filter((p) => scanIds.has(p.id)).sort((a, b) => b.score - a.score).slice(0, FEATURED);
    const newestFirst = byNewest(scored);

    renderCards(document.querySelector("[data-top10]"), top10);
    renderCards(document.querySelector("[data-recent]"), showingAll ? newestFirst : newestFirst.slice(0, RECENT));
    if (currentQuery) {
        renderCards(document.querySelector("[data-search-grid]"), filterPosts(scored, currentQuery));
    }
}

/* ============================================================== */
/* Single post view                                                 */
/* ============================================================== */

// Lưu ý: bodyHtml là HTML đã render từ markdown của chủ site nên cố ý KHÔNG escape; mọi trường khác (meta.*) đều được escape.
function postTemplate(meta, bodyHtml, updated) {
    return `
    <div class="post-view">
      <button type="button" class="back-btn" data-back>&larr; Quay lại</button>
      <article class="post-article">
        ${meta.photo ? `<img class="post-cover" src="${escHtml(assetUrl(meta.photo))}" alt="${escHtml(meta.title || "")}" />` : ""}
        <h1 class="post-title">${escHtml(meta.title || "")}</h1>
        <div class="post-meta">
          <span>${escHtml(formatDate(meta.date))}${updated ? ` <em class="post-edited">(đã chỉnh sửa | ${escHtml(formatDate(updated))})</em>` : ""}</span>
          <span><span data-views-wrap><span class="views-loading" aria-label="Đang tải lượt xem">Đang tải<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span></span> lượt xem</span>
        </div>
        <div class="post-body">${bodyHtml}</div>
      </article>
      <section class="related-posts" data-related hidden>
        <h2>Bài viết liên quan</h2>
        <div class="post-grid" data-related-grid></div>
      </section>
    </div>
  `;
}

// Shown instead of the post content when posts.json marks this id as
// visibility: "private" — even someone with the direct link sees this,
// not the post body.
function privateNoticeTemplate() {
    return `
    <div class="post-view">
      <button type="button" class="back-btn" data-back>&larr; Quay lại</button>
      <article class="post-article private-notice">
        <h1 class="post-title">Không thể xem bài đăng này!</h1>
        <p class="post-body">Đây là bài đăng riêng tư.</p>
      </article>
    </div>
  `;
}

function renderPrivateNotice() {
    const root = document.getElementById("app");
    root.innerHTML = privateNoticeTemplate();

    if (window.SiteLoading) window.SiteLoading.ready();

    document.querySelector("[data-back]").addEventListener("click", () => {
        window.location.href = "/post/";
    });
}

async function renderPostPage(id) {
    // Loaded once up front: used both for the private/visibility check
    // below and (later) for the related-posts suggestions, so posts.json
    // is only fetched a single time per post view.
    let allPosts = [];
    try {
        allPosts = await loadPosts();
    } catch (e) {
        console.error(e);
    }

    // A post explicitly marked private can't be opened via a direct link
    // either — show a dedicated notice instead of fetching/rendering it.
    // A .md file with no matching posts.json entry at all is NOT treated
    // as private (that would silently lock out drafts you forgot to add
    // to posts.json) — it behaves like "unlisted" and opens normally.
    const entry = allPosts.find((p) => p.id === id);
    if (entry && entry.visibility === "private") {
        renderPrivateNotice();
        return;
    }

    let raw;
    try {
        const res = await fetch(`/post/data/${encodeURIComponent(id)}.md`, { cache: "no-store" });
        if (!res.ok) throw new Error("post not found");
        raw = await res.text();
        // Some hosts (e.g. IIS with a custom 404 page set to
        // responseMode="ExecuteURL") respond with status 200 and the
        // error page's HTML instead of a real 404 status. A genuine post
        // file always starts with a frontmatter block, so use that as the
        // real "does this post exist" check rather than trusting res.ok
        // alone.
        if (!/^\s*---\s*\n/.test(raw)) {
            throw new Error("response is not a valid post file");
        }
    } catch (e) {
        window.location.replace("/post/post404.html"); // replace: nút Back không bị kẹt trong vòng lặp lỗi
        return;
    }

    const { meta, body } = parseFrontmatter(raw);
    const root = document.getElementById("app");
    root.innerHTML = postTemplate(meta, renderPostBody(body), entry && entry.updated);

    if (window.SiteLoading) {
        window.SiteLoading.waitFor(assetUrl(meta.photo));
        window.SiteLoading.ready();
    }

    // Back button always returns to the homepage (not browser history).
    document.querySelector("[data-back]").addEventListener("click", () => {
        window.location.href = "/post/";
    });

    // Per-post SEO tags and countdown buttons.
    applySeoMeta(meta, body, id);
    initTimedButtons(document.querySelector(".post-body"));

    mountShare(entry, id, meta);
    renderComments(meta);

    // View counter: shows the current count immediately, then waits
    // until the visitor has had the post open for a few seconds before
    // deciding whether to count the view. If they navigate away before
    // then, this code never gets to run (the page has already unloaded),
    // so a quick bounce doesn't count as a view.
    //
    // On top of that, localStorage remembers the last time THIS browser
    // counted a view for THIS post id, so reloading or reopening the
    // same post within 10 minutes doesn't inflate the count further.
    // (Using localStorage rather than relying on HTTP caching because
    // that depends on Cache-Control headers from Abacus's server, which
    // we don't control and could change or be absent entirely.)
    const VIEW_DWELL_MS = 5000; // must stay on the page this long
    const VIEW_COOLDOWN_MS = 10 * 60 * 1000; // then, at most once per 10 min
    const viewsEl = document.querySelector("[data-views-wrap]");

    getViews(id).then((v) => {
        if (viewsEl) viewsEl.textContent = formatCount(v);
    });

    setTimeout(() => {
        const storageKey = `shinjuvn_blog_viewed_${id}`;
        const lastViewedAt = Number(safeStore.get(storageKey) || 0);
        if (Date.now() - lastViewedAt < VIEW_COOLDOWN_MS) return; // counted recently — skip

        safeStore.set(storageKey, String(Date.now()));
        hitViews(id).then((v) => {
            if (viewsEl && v != null) viewsEl.textContent = formatCount(v);
        });
    }, VIEW_DWELL_MS);

    // Related posts: only when arriving from the homepage (via a card
    // click) with a saved search term — hidden on direct/deep links.
    // Only ever suggests public posts, same as the homepage.
    const cameFromHome = safeSession.get(CAME_FROM_HOME_KEY) === "1";
    const lastSearch = safeStore.get(LAST_SEARCH_KEY) || "";
    if (cameFromHome && lastSearch) {
        const related = filterPosts(allPosts.filter(isPublic), lastSearch)
            .filter((p) => p.id !== id)
            .slice(0, 5);
        if (related.length) {
            document.querySelector("[data-related]").hidden = false;
            renderCards(document.querySelector("[data-related-grid]"), related);
        }
    }
}

/* ============================================================== */
/* Bình luận Giscus: cấu hình ở /site-settings.json → giscus;           */
/* tắt riêng cho một bài bằng dòng "comments: off" trong frontmatter.  */
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

async function mountShare(entry, id, meta) {
    const body = document.querySelector(".post-body");
    if (!body) return;
    const host = document.createElement("div");
    host.className = "post-share";
    body.after(host);
    const url = entry && entry.short ? `${window.location.origin}/s/${entry.short}/` : `${window.location.origin}/post/${encodeURIComponent(id)}/`;
    await ensureShare();
    if (window.SiteShare) window.SiteShare.mount(host, { url, title: meta.title || document.title });
}

async function renderComments(meta) {
    if (String(meta.comments || "").toLowerCase() === "off") return;
    let cfg = null;
    try {
        const res = await fetch("/site-settings.json", { cache: "no-cache" });
        if (res.ok) cfg = (await res.json()).giscus;
    } catch (e) {
        return;
    }
    if (!cfg || cfg.enabled === false || !cfg.repo || !cfg.repoId || !cfg.categoryId) return;
    const view = document.querySelector(".post-view");
    if (!view) return;
    const section = document.createElement("section");
    section.className = "post-comments";
    section.innerHTML = "<h2>Bình luận</h2>";
    view.appendChild(section);
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
        const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "400px" });
        io.observe(section);
    } else {
        load();
    }
}

/* ============================================================== */
/* Timed button — <a class="button-5s" data-seconds="5" href="…">  */
/*                                                                   */
/* Two button classes now exist inside post .md files:               */
/*   .btn         opens the link immediately on click (as before)    */
/*   .button-5s   click -> countdown (data-seconds, default 5) ->    */
/*                then it opens the link on its own                  */
/* If the anchor has target="_blank", a popup blocker may refuse the */
/* automatic open after the wait; in that case the button turns into */
/* a normal one-click "open" link so it still always works.          */
/* ============================================================== */

function initTimedButtons(container) {
    container.querySelectorAll("a.button-5s").forEach((a) => {
        const seconds = Math.max(1, Math.floor(Number(a.getAttribute("data-seconds")) || 5));
        const originalLabel = a.textContent;
        const href = a.getAttribute("href");
        const newTab = a.getAttribute("target") === "_blank";
        let running = false;

        a.style.setProperty("--b5-dur", `${seconds}s`);

        a.addEventListener("click", (e) => {
            if (a.classList.contains("is-ready")) return; // fallback state: let the native click through
            e.preventDefault();
            if (running || !href) return;
            running = true;

            let left = seconds;
            a.classList.add("is-counting");
            a.textContent = `Chờ ${left}s...`;

            const timer = setInterval(() => {
                left -= 1;
                if (left > 0) {
                    a.textContent = `Chờ ${left}s...`;
                    return;
                }
                clearInterval(timer);
                a.classList.remove("is-counting");

                if (!newTab) {
                    window.location.href = href; // same tab: never blocked
                    return;
                }
                const w = window.open(href, "_blank");
                if (w) {
                    w.opener = null;
                    a.textContent = originalLabel;
                    running = false;
                } else {
                    a.classList.add("is-ready"); // popup blocked -> one normal click opens it
                    a.textContent = `${originalLabel} →`;
                    running = false;
                }
            }, 1000);
        });
    });
}

/* ============================================================== */
/* SEO: per-post <title>, keywords, description, social + JSON-LD  */
/*                                                                   */
/* Set from JavaScript once the post has loaded, using the `keywords` */
/* (and optional `description`) fields of the post's frontmatter.    */
/* Note: Google ignores <meta name="keywords"> for ranking; the      */
/* title/description/structured-data below are what actually help    */
/* search results, and they're only seen by crawlers that run JS.    */
/* ============================================================== */

function setHeadMeta(attr, key, content) {
    if (!content) return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute("content", content);
}

function toIsoDate(dateStr) {
    const m = String(dateStr || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return /^\d{4}-\d{2}-\d{2}/.test(dateStr || "") ? String(dateStr).slice(0, 10) : "";
}

function plainExcerpt(markdown, max) {
    const text = markdown
        .replace(/§[0-9a-fk-or]/gi, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/<[^>]+>/g, " ")
        .replace(/[`*_>#-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

function applySeoMeta(meta, body, id) {
    const siteName = "Shinju Ch.";
    const title = meta.title ? `${meta.title} — ${siteName}` : `${siteName} — Blog`;
    document.title = title;

    const keywords = String(meta.keywords || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
        .join(", ");
    const description = meta.description || plainExcerpt(body, 155);
    const url = `${window.location.origin}/post/${encodeURIComponent(id)}/`;
    const image = meta.photo ? new URL(assetUrl(meta.photo), window.location.origin).href : "";

    setHeadMeta("name", "keywords", keywords);
    setHeadMeta("name", "description", description);
    setHeadMeta("property", "og:type", "article");
    setHeadMeta("property", "og:site_name", siteName);
    setHeadMeta("property", "og:title", meta.title || title);
    setHeadMeta("property", "og:description", description);
    setHeadMeta("property", "og:url", url);
    setHeadMeta("property", "og:image", image);
    setHeadMeta("name", "twitter:card", image ? "summary_large_image" : "summary");

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
    }
    canonical.href = url;

    const ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: meta.title || "",
        description,
        url,
        mainEntityOfPage: url,
        inLanguage: "vi",
        author: { "@type": "Person", name: siteName },
    };
    const iso = toIsoDate(meta.date);
    if (iso) ld.datePublished = iso;
    if (image) ld.image = image;
    if (keywords) ld.keywords = keywords;

    let script = document.getElementById("post-jsonld");
    if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = "post-jsonld";
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(ld);
}

/* ============================================================== */
/* Entry point                                                      */
/* ============================================================== */

function main() {
    // Danh sách bài dựng sẵn trong HTML (cho bot không chạy JS, xem tools/prerender.js): JS sẽ tự dựng lại bản động nên bỏ bản tĩnh để khỏi bị lặp.
    document.querySelectorAll("[data-prerender]").forEach((el) => el.remove());
    const pathMatch = window.location.pathname.match(/^\/post\/([^\/.]+)\/?$/);
    const postId = pathMatch && decodeURIComponent(pathMatch[1]); // chỉ nhận /post/<id>/
    if (postId) {
        renderPostPage(postId);
    } else {
        renderHomePage();
    }
}

main();

