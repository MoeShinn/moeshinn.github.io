/* Donate/js/main.js
   Renders the donate method list from Donate/data.json and handles
   the QR / Link overlay. Add a new method to data.json's "methods"
   array (type: "qr" with a "qr" image path, or type: "link" with a
   "url") and it appears here automatically — no code changes needed.
*/

async function loadData() {
    const res = await fetch("/donate/data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load Donate/data.json");
    return res.json();
}

function setupOverlay() {
    const overlay = document.querySelector("[data-overlay]");
    const card = document.querySelector("[data-overlay-card]");
    const labelEl = document.querySelector("[data-overlay-label]");

    const qrBox = document.querySelector("[data-overlay-qr]");
    const qrImg = document.querySelector("[data-overlay-qr-img]");
    const saveBtn = document.querySelector("[data-overlay-save]");
    const backBtnQr = document.querySelector("[data-overlay-back]");

    const linkBox = document.querySelector("[data-overlay-link]");
    const linkHref = document.querySelector("[data-overlay-link-href]");
    const openBtn = document.querySelector("[data-overlay-open]");
    const backBtnLink = document.querySelector("[data-overlay-back-link]");

    function close() {
        overlay.hidden = true;
        qrBox.hidden = true;
        linkBox.hidden = true;
    }

    function openForMethod(method) {
        labelEl.textContent = method.label;

        if (method.type === "qr") {
            qrBox.hidden = false;
            linkBox.hidden = true;
            qrImg.src = method.qr;
            const ext = (method.qr.match(/\.(\w+)$/) || [null, "png"])[1];
            const filename = (method.id || "donate") + "-qr." + ext;
            saveBtn.href = method.qr;
            saveBtn.setAttribute("download", filename);
        } else if (method.type === "link") {
            qrBox.hidden = true;
            linkBox.hidden = false;
            linkHref.textContent = method.url;
            linkHref.href = method.url;
            linkHref.target = "_blank";
            linkHref.rel = "noopener noreferrer";
        }

        overlay.hidden = false;
    }

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });

    card.addEventListener("click", (e) => e.stopPropagation());

    backBtnQr.addEventListener("click", close);
    backBtnLink.addEventListener("click", close);

    openBtn.addEventListener("click", () => {
        if (linkHref.href) window.open(linkHref.href, "_blank", "noopener,noreferrer");
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !overlay.hidden) close();
    });

    return { openForMethod };
}

function render(data, overlayApi) {
    const titleEl = document.querySelector("[data-title]");
    if (titleEl && data.title) titleEl.textContent = data.title;

    const list = document.querySelector("[data-method-list]");
    if (list) {
        list.innerHTML = "";
        (data.methods || []).forEach((method) => {
            if (method.visible === false) return; // ẩn cả nhóm (đặt trong /admin → Donate)
            // visible: false hides that specific button (public/private
            // toggle); omitted or true means shown. A group with zero
            // visible buttons is skipped entirely, not shown empty.
            const visibleButtons = (method.buttons || []).filter((btn) => btn.visible !== false);
            if (!visibleButtons.length) return;

            const wrap = document.createElement("div");
            wrap.className = "method";

            const label = document.createElement("div");
            label.className = "method-label";
            label.textContent = method.label;
            wrap.appendChild(label);

            const row = document.createElement("div");
            row.className = "donate-btn-row";

            visibleButtons.forEach((btn) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "donate-btn";
                button.textContent = btn.label || "Donate";
                button.addEventListener("click", () =>
                    overlayApi.openForMethod({
                        ...btn,
                        // Overlay title: group name, plus the bank/option name when
                        // more than one button is actually shown in this group
                        // (e.g. "Internet Banking VN — Vietcombank"); just the
                        // group name otherwise.
                        label:
                            visibleButtons.length > 1 && btn.label
                                ? `${method.label} — ${btn.label}`
                                : method.label,
                    })
                );
                row.appendChild(button);
            });

            wrap.appendChild(row);
            list.appendChild(wrap);
        });
    }

    // Footer text is now rendered globally by /js/site-chrome.js from
    // the root data.json's "footer" field.
}

async function init() {
    const overlayApi = setupOverlay();
    try {
        const data = await loadData();
        render(data, overlayApi);
    } catch (err) {
        console.error(err);
    } finally {
        if (window.SiteLoading) window.SiteLoading.ready();
    }
}

init();
