/* loading.js — màn hình chờ dùng chung + trạng thái ("bong bóng" trên avatar).
   Chèn một lần cho mỗi trang (đầu <body>, trước main.js của trang). Overlay #site-loading do chính file này dựng bằng JS.

   • Ẩn màn hình chờ khi mọi ảnh được báo (window.SiteLoading.waitFor) đã tải xong.
     Không còn chờ ảnh nền (nền giờ do js/theme.js vẽ bằng code); chỉ chờ ảnh trang đăng ký qua waitFor.
   • Theme của màn hình chờ đổi theo cảm xúc đang đặt trong /status.json (sửa ở /admin → Trạng thái).
     Không có cảm xúc (hoặc đã hết hạn) → theme "hoàng hôn". Lần ghé sau dùng ngay theme đã nhớ.
   • Ở trang chủ (có .avatar-wrap) hiện bong bóng trạng thái phía trên avatar; các trang khác không hiện.
   • Xem thử một theme: thêm ?loadpreview=<tên theme> vào địa chỉ trang chủ (màn hình chờ sẽ không tắt). */
(function () {
    /* Bộ nạp JSON dùng chung: mỗi URL chỉ tải MỘT lần cho cả trang (trước đây data.json / site-settings.json bị tải 2–3 lần).
       Dùng "no-cache" (hỏi lại server bằng ETag, thường nhận 304) thay vì "no-store" để không tải lại toàn bộ file. */
    if (!window.siteJSON) {
        const memo = {};
        window.siteJSON = (url) => memo[url] || (memo[url] = fetch(url, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null));
    }
    /* Màn hình chờ KHÔNG còn nằm trong HTML tĩnh. Lý do: bot/AI không chạy JS (Gemini, ChatGPT, Perplexity, …)
       chỉ đọc HTML gốc, nếu overlay nằm sẵn trong HTML thì chúng chỉ thấy chữ "Trang của bạn đang được tải".
       Giờ HTML gốc chứa sẵn nội dung thật; overlay chỉ được JS dựng cho người dùng bằng trình duyệt thật. */
    const IS_BOT = /bot|crawl|spider|slurp|lighthouse|headless|facebookexternalhit|perplexity|claude|gemini|chatgpt|bytespider/i.test(navigator.userAgent || "") || navigator.webdriver === true;
    if (IS_BOT) {
        // Bot chạy JS: không dựng overlay, nội dung hiện ngay. Giữ API rỗng để main.js của từng trang không lỗi.
        document.documentElement.classList.remove("sl-wait");
        window.SiteLoading = { waitFor() {}, ready() {} };
        window.SiteStatus = Promise.resolve({ status: {}, moods: { moods: [] } });
        return;
    }

    let overlay = document.getElementById("site-loading"); // trang cũ vẫn còn markup sẵn thì dùng lại
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "site-loading";
        overlay.className = "site-loading";
        overlay.setAttribute("aria-hidden", "true");
        overlay.setAttribute("data-nosnippet", "");
        overlay.innerHTML =
            '<div class="site-loading-inner">' +
            '<p class="site-loading-msg">Chờ xíu nhé!<br />Trang của bạn đang được tải</p>' +
            '<div class="site-loading-bar"><div class="site-loading-fill"></div></div>' +
            "</div>";
        document.body.insertBefore(overlay, document.body.firstChild);
    }

    document.documentElement.classList.remove("sl-wait"); // overlay thật đã có → gỡ tấm màn tạm trong <head>

    const THEMES = ["sunset", "sunny", "rain", "night", "storm", "calm", "fog", "focus"];
    const DEFAULT_THEME = "sunset";
    const CACHE_KEY = "shinju_loading_theme";
    const PREVIEW = new URLSearchParams(location.search).get("loadpreview");

    const fill = overlay.querySelector(".site-loading-fill");
    const tasks = [];
    let finished = false;

    /* ---------------- Theme của màn hình chờ ---------------- */
    const fx = document.createElement("div");
    fx.className = "site-loading-fx";
    overlay.insertBefore(fx, overlay.firstChild);

    // Hạt trang trí theo theme: kiểu (rơi / bay lên / lấp lánh), số lượng, kích thước, thời lượng
    const PARTICLES = {
        sunset: { n: 16, cls: "mote", dir: "rise", size: [2, 5], dur: [9, 16] },
        rain: { n: 55, cls: "drop", dir: "fall", size: [14, 22], dur: [0.7, 1.3] },
        night: { n: 38, cls: "star", dir: "twinkle", size: [2, 4], dur: [2, 4] },
        storm: { n: 26, cls: "ember", dir: "rise", size: [2, 5], dur: [4, 9] },
        calm: { n: 14, cls: "bubble", dir: "rise", size: [8, 22], dur: [9, 16] },
        focus: { n: 22, cls: "node", dir: "twinkle", size: [3, 6], dur: [2, 5] },
    };
    const rnd = (a, b) => a + Math.random() * (b - a);
    let currentTheme = "";

    function applyTheme(id) {
        if (!THEMES.includes(id)) id = DEFAULT_THEME;
        if (id === currentTheme) return;
        currentTheme = id;
        overlay.className = overlay.className.replace(/\bt-\S+/g, "").trim() + " t-" + id;
        fx.innerHTML = '<div class="fx fx-a"></div><div class="fx fx-b"></div><div class="fx-particles"></div>';
        const cfg = PARTICLES[id];
        if (!cfg) return;
        const box = fx.querySelector(".fx-particles");
        for (let i = 0; i < cfg.n; i++) {
            const p = document.createElement("span");
            p.className = "fx-p " + cfg.cls;
            const size = rnd(cfg.size[0], cfg.size[1]).toFixed(1);
            if (cfg.cls === "drop") p.style.height = size + "px";
            else { p.style.width = size + "px"; p.style.height = size + "px"; }
            p.style.left = rnd(0, 100).toFixed(1) + "%";
            if (cfg.dir === "twinkle") p.style.top = rnd(0, 92).toFixed(1) + "%";
            p.style.animationName = "fx-" + cfg.dir;
            p.style.animationDuration = rnd(cfg.dur[0], cfg.dur[1]).toFixed(1) + "s";
            p.style.animationDelay = (-rnd(0, cfg.dur[1])).toFixed(1) + "s";
            p.style.setProperty("--sway", rnd(-40, 40).toFixed(0) + "px");
            box.appendChild(p);
        }
    }

    function cachedTheme() {
        try { return localStorage.getItem(CACHE_KEY); } catch (e) { return null; }
    }
    applyTheme(PREVIEW || cachedTheme() || DEFAULT_THEME); // vẽ ngay, chưa cần chờ mạng

    /* ---------------- Trạng thái: tải /status.json + /moods.json ---------------- */
    function isActive(status) {
        if (!status || (!status.text && !status.mood)) return false;
        if (!status.expires) return true;
        const t = new Date(status.expires).getTime();
        return isNaN(t) || t > Date.now(); // hạn không đọc được thì coi như còn hạn
    }
    // Danh sách cảm xúc = có sẵn (moods.json) + do bạn tự tạo (status.json → custom: [{id, icon, label, text, theme}])
    function allMoods(moods, status) {
        const own = ((status && status.custom) || []).filter((c) => c && c.id && c.icon)
            .map((c) => ({ id: c.id, icon: c.icon, label: c.label || "", text: c.text || "", theme: c.theme || DEFAULT_THEME, custom: true }));
        return (moods.moods || []).concat(own);
    }
    function themeFor(status, moods) {
        if (status && THEMES.includes(status.loading)) return status.loading; // admin chọn cố định một theme
        if (isActive(status) && status.mood) {
            const m = allMoods(moods, status).find((x) => x.id === status.mood);
            if (m && THEMES.includes(m.theme)) return m.theme;
        }
        return DEFAULT_THEME;
    }
    const getJson = (url) => window.siteJSON(url);
    const statusReady = Promise.all([getJson("/status.json"), getJson("/moods.json")]).then(([status, moods]) => ({ status: status || {}, moods: moods || { moods: [] } }));
    window.SiteStatus = statusReady;

    statusReady.then(({ status, moods }) => {
        if (!PREVIEW) {
            const t = themeFor(status, moods);
            try { localStorage.setItem(CACHE_KEY, t); } catch (e) { /* bỏ qua */ }
            applyTheme(t);
        }
        const start = () => showBubble(status, moods);
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
        else start();
    });

    // Nhớ "lần trước có bong bóng hay không" để lần sau <head> chừa sẵn chỗ (xem script đầu index.html) → không bị layout shift.
    function setStatusHint(on) {
        try { localStorage.setItem("shinju_has_status", on ? "1" : "0"); } catch (e) { /* bỏ qua */ }
        if (!on) document.documentElement.classList.remove("has-status-hint");
    }

    async function showBubble(status, moods) {
        if (!/^\/(index\.html)?$/.test(location.pathname)) return; // bong bóng trạng thái chỉ hiện ở trang chủ
        const wrap = document.querySelector(".avatar-wrap");
        if (wrap && wrap.querySelector(".status-bubble")) return;
        if (!wrap || !isActive(status)) { setStatusHint(false); return; }
        const mood = allMoods(moods, status).find((x) => x.id === status.mood);
        let text = (status.text || "").trim();
        // Trạng thái tự tạo: lời trống thì KHÔNG tự thêm câu nào, chỉ hiện icon trong khung trắng.
        if (!text && mood && mood.custom) text = (mood.text || "").trim();
        else if (!text && mood) { // cảm xúc có sẵn mà không có lời → "Tên đang cảm thấy …"
            let name = "Shinju Ch.";
            try { const d = await window.siteJSON("/data.json"); name = (d.profile && d.profile.name) || name; } catch (e) { /* dùng tên mặc định */ }
            text = `${name} ${mood.phrase}`;
        }
        if (!text && !(mood && mood.custom)) { setStatusHint(false); return; }
        const b = document.createElement("div");
        b.className = "status-bubble" + (text ? "" : " icon-only");
        b.setAttribute("role", "status");
        if (mood) { const i = document.createElement("span"); i.className = "sb-icon"; i.textContent = mood.icon; b.appendChild(i); }
        if (text) {
            const t = document.createElement("span");
            t.textContent = text; // textContent: không chèn HTML từ nội dung status
            b.appendChild(t);
        }
        wrap.classList.add("has-status");
        wrap.insertBefore(b, wrap.firstChild);
        setStatusHint(true);
    }

    /* ---------------- Tiến trình và ẩn màn hình chờ ---------------- */
    let fakeProgress = 0;
    const tick = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + (90 - fakeProgress) * 0.12, 90);
        if (fill) fill.style.width = fakeProgress + "%";
    }, 120);

    function finish() {
        if (finished || PREVIEW) return; // xem thử theme: giữ màn hình chờ
        finished = true;
        clearInterval(tick);
        if (fill) fill.style.width = "100%";
        setTimeout(() => {
            overlay.classList.add("site-loading--hide");
            setTimeout(() => overlay.remove(), 500);
        }, 200);
    }

    function loadImage(url) {
        return new Promise((resolve) => {
            if (!url) return resolve();
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // không bao giờ chặn vì một ảnh hỏng
            img.src = url;
        });
    }

    window.SiteLoading = {
        // Trang gọi hàm này cho ảnh nạp động (ví dụ avatar, chỉ biết URL sau khi data.json về)
        waitFor(url) {
            tasks.push(loadImage(url));
        },
        // Gọi khi trang đã xếp xong mọi thứ cần chờ
        ready() {
            Promise.all(tasks).then(finish);
        },
    };

    // Lưới an toàn: không bao giờ chặn trang vô hạn
    setTimeout(finish, 8000);
})();
