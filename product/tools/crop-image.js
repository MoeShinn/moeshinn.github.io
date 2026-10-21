/* product/tools/crop-image.js — Cắt ảnh hàng loạt theo tỉ lệ tùy chọn. Mỗi ảnh có vùng cắt riêng (kéo/thả/đổi cỡ trực tiếp trên ảnh), chạy hoàn toàn trên trình duyệt. */
(function () {
  "use strict";
  const T = window.ShinjuTools, h = T.h, clamp = T.clamp;

  const RATIOS = [
    { value: "free", label: "Tự do" }, { value: "orig", label: "Theo ảnh gốc" }, { value: "1:1", label: "1:1" },
    { value: "4:3", label: "4:3" }, { value: "3:4", label: "3:4" }, { value: "3:2", label: "3:2" }, { value: "2:3", label: "2:3" },
    { value: "16:9", label: "16:9" }, { value: "9:16", label: "9:16" }, { value: "4:5", label: "4:5" }, { value: "5:4", label: "5:4" },
    { value: "21:9", label: "21:9" }, { value: "custom", label: "Tùy chỉnh" },
  ];
  const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  // Vùng cắt lớn nhất, căn giữa, đúng tỉ lệ r (r = rộng/cao; 0 = cả ảnh)
  function fitRect(iw, ih, r) {
    if (!r) return { x: 0, y: 0, w: iw, h: ih };
    let w = iw, hh = w / r; if (hh > ih) { hh = ih; w = hh * r; }
    return { x: (iw - w) / 2, y: (ih - hh) / 2, w, h: hh };
  }
  // Đổi cỡ vùng cắt khi kéo tay nắm. r0: vùng lúc bắt đầu kéo; dx,dy: độ dịch (px ảnh gốc); ratio 0 = tự do.
  function resizeRect(r0, hd, dx, dy, ratio, iw, ih, min) {
    let l = r0.x, t = r0.y, rt = r0.x + r0.w, b = r0.y + r0.h;
    if (!ratio) {
      if (hd.includes("w")) l = clamp(l + dx, 0, rt - min);
      if (hd.includes("e")) rt = clamp(rt + dx, l + min, iw);
      if (hd.includes("n")) t = clamp(t + dy, 0, b - min);
      if (hd.includes("s")) b = clamp(b + dy, t + min, ih);
      return { x: l, y: t, w: rt - l, h: b - t };
    }
    const sx = hd.includes("e") ? 1 : -1, sy = hd.includes("s") ? 1 : -1;       // hướng kéo so với góc đối diện
    const ax = sx > 0 ? l : rt, ay = sy > 0 ? t : b;                            // góc neo (đứng yên)
    const px = (sx > 0 ? rt : l) + dx, py = (sy > 0 ? b : t) + dy;
    let w = Math.max((px - ax) * sx, ((py - ay) * sy) * ratio);
    const maxW = Math.min(sx > 0 ? iw - ax : ax, (sy > 0 ? ih - ay : ay) * ratio);
    w = clamp(w, Math.min(min, maxW), maxW);
    const hh = w / ratio;
    return { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - hh, w, h: hh };
  }

  T.tools["crop-image"] = {
    mount(root) {
      const st = { items: [], cur: null, ratio: "4:3", cw: 4, ch: 3, fmt: "keep", quality: 90, sizeMode: "keep", outW: 1080, suffix: "-crop", bg: "#ffffff", running: false, gen: 0, scale: 1 };

      const drop = T.dropzone({ icon: "✂️", title: "Kéo thả ảnh cần cắt vào đây hoặc bấm để chọn", hint: "Chọn nhiều ảnh cùng lúc · mỗi ảnh chỉnh vùng cắt riêng được", onFiles: addFiles });

      /* ---- Tỉ lệ ---- */
      const ratioSeg = T.segmented({ label: "Tỉ lệ khung cắt", value: st.ratio, options: RATIOS, onChange: (v) => { st.ratio = v; custom.style.display = v === "custom" ? "" : "none"; resetAll(); } });
      const cwIn = T.numberField({ label: "Rộng", min: 1, max: 100, value: st.cw, step: "any", onChange: (v) => { st.cw = v; if (st.ratio === "custom") resetAll(); } });
      const chIn = T.numberField({ label: "Cao", min: 1, max: 100, value: st.ch, step: "any", onChange: (v) => { st.ch = v; if (st.ratio === "custom") resetAll(); } });
      const custom = h("div", { class: "t-custom-ratio", style: { display: "none" } }, cwIn.el, h("span", { class: "t-colon", "aria-hidden": "true" }, ":"), chIn.el);
      const ratioPanel = T.panel("Tỉ lệ", ratioSeg.el, custom, h("p", { class: "t-hint" }, "Đổi tỉ lệ sẽ đặt lại vùng cắt của tất cả ảnh về giữa ảnh. Sau đó kéo vùng cắt từng ảnh đến đúng chỗ bạn muốn."));

      /* ---- Sân khấu cắt ---- */
      const stageImg = h("img", { alt: "Ảnh đang cắt", draggable: "false" });
      const box = h("div", { class: "t-cropbox", tabindex: "0", role: "group", "aria-label": "Vùng cắt. Dùng phím mũi tên để dịch chuyển, giữ Shift để dịch nhanh." }, h("span", { class: "t-cropdim", "aria-hidden": "true" }));
      HANDLES.forEach((k) => box.appendChild(h("span", { class: "t-h", "data-h": k, "aria-hidden": "true" })));
      const inner = h("div", { class: "t-stage-inner" }, stageImg, box);
      const stage = h("div", { class: "t-stage" }, inner);
      const info = h("div", { class: "t-cropinfo", role: "status", "aria-live": "off" });
      const btnCenter = h("button", { type: "button", class: "t-btn gray sm", onclick: () => { const it = st.cur; if (it) { it.crop = fitRect(it.width, it.height, ratioOf(it)); paint(); } } }, "Đặt lại ảnh này");
      const btnAll = h("button", { type: "button", class: "t-btn blue sm", title: "Áp dụng cùng vị trí và kích thước theo tỉ lệ phần trăm cho mọi ảnh", onclick: applyToAll }, "Áp dụng vị trí này cho tất cả");
      const stagePanel = h("section", { class: "t-panel t-stage-panel" }, h("h2", {}, "Vùng cắt"), stage, h("div", { class: "t-stage-foot" }, info, h("div", { class: "t-actions" }, btnCenter, btnAll)));

      /* ---- Đầu ra ---- */
      const fmt = T.segmented({ label: "Định dạng", value: st.fmt, options: [{ value: "keep", label: "Giữ nguyên" }, { value: "image/jpeg", label: "JPG" }, { value: "image/png", label: "PNG" }, { value: "image/webp", label: "WebP" }], onChange: (v) => { st.fmt = v; sync(); } });
      const quality = T.slider({ label: "Chất lượng", min: 50, max: 100, value: st.quality, fmt: (v) => v + "%", onChange: (v) => (st.quality = v) });
      const sizeSel = T.select({ label: "Kích thước đầu ra", value: "keep", options: [{ value: "keep", label: "Giữ nguyên pixel gốc" }, { value: "width", label: "Đặt chiều rộng cố định" }], onChange: (v) => { st.sizeMode = v; outW.show(v === "width"); } });
      const outW = T.numberField({ label: "Chiều rộng", min: 16, max: 16000, value: st.outW, unit: "px", onChange: (v) => (st.outW = v), hint: "Chiều cao tự tính theo tỉ lệ khung cắt." });
      outW.show(false);
      const suffix = T.textField({ label: "Hậu tố tên file", value: st.suffix, placeholder: "-crop", onChange: (v) => (st.suffix = v) });
      const outPanel = h("div", { class: "t-panel" }, h("h2", {}, "Đầu ra"), h("div", { class: "t-settings one" }, fmt.el, quality.el, sizeSel.el, outW.el, suffix.el));

      const work = h("div", { class: "t-crop" }, stagePanel, outPanel);

      /* ---- Dải ảnh + thanh thao tác ---- */
      const strip = h("div", { class: "t-strip", role: "listbox", "aria-label": "Danh sách ảnh cần cắt" });
      const bar = T.actionBar({ runLabel: "Cắt tất cả", onRun: run, onZip: zipAll, onClear: clearAll });
      const stripPanel = T.panel("Ảnh đã chọn", strip, bar.el);

      const body = h("div", { class: "t-stack" }, ratioPanel, work, stripPanel); body.hidden = true;
      root.append(drop.el, body, T.privacyNote());

      T.canEncode("image/webp").then((ok) => { if (!ok) fmt.disable("image/webp", true); });
      function sync() { quality.disable(st.fmt === "image/png"); }
      sync();

      /* ---- Tỉ lệ → số ---- */
      function ratioOf(it) {
        const v = st.ratio;
        if (v === "free") return 0;
        if (v === "orig") return it.width / it.height;
        if (v === "custom") return st.cw > 0 && st.ch > 0 ? st.cw / st.ch : 0;
        const [a, b] = v.split(":").map(Number); return a / b;
      }
      const lockedRatio = (it) => (it ? ratioOf(it) : 0);

      /* ---- Danh sách ---- */
      async function addFiles(files) {
        const first = !st.items.length;
        for (let i = 0; i < files.length; i++) {
          const it = await T.makeItem(files[i]);
          if (it.status !== "error") it.crop = fitRect(it.width, it.height, ratioOf(it));
          st.items.push(it); addChip(it);
          bar.progress(i + 1, files.length); bar.summary(`Đang đọc ảnh ${i + 1}/${files.length}…`);
          if (!st.cur && it.status !== "error") select(it);
        }
        if (first) body.hidden = false;
        refresh();
      }
      const chips = new Map();
      function addChip(it) {
        const k = it.width ? Math.min(1, 72 / Math.max(it.width, it.height)) : 1;
        const mini = h("span", { class: "t-mini", style: { width: Math.max(8, Math.round(it.width * k)) + "px", height: Math.max(8, Math.round(it.height * k)) + "px" } }, it.thumb ? h("img", { src: it.thumb, alt: "" }) : null, h("i", { class: "t-mini-rect" }));
        const state = h("span", { class: "t-chip-state", "aria-hidden": "true" });
        const rm = h("button", { type: "button", class: "t-chip-x", "aria-label": `Bỏ ${it.name}`, title: "Bỏ ảnh này", onclick: (e) => { e.stopPropagation(); removeItem(it); } }, "✕");
        const sv = h("button", { type: "button", class: "t-chip-save", "aria-label": `Tải ${it.name}`, title: "Tải ảnh đã cắt", hidden: true, onclick: (e) => { e.stopPropagation(); it.out && T.download(it.out.blob, it.out.name); } }, "⬇");
        const btn = h("div", { class: "t-chip", role: "option", tabindex: "0", title: `${it.name}${it.msg ? " — " + it.msg : ""}`, "data-status": it.status, onclick: () => it.status !== "error" && select(it), onkeydown: (e) => { if ((e.key === "Enter" || e.key === " ") && it.status !== "error") { e.preventDefault(); select(it); } } }, mini, state, sv, rm);
        strip.appendChild(btn); chips.set(it.id, { btn, mini, state, sv }); paintChip(it);
      }
      function paintChip(it) {
        const c = chips.get(it.id); if (!c) return;
        c.btn.dataset.status = it.status; c.btn.setAttribute("aria-selected", String(st.cur === it)); c.btn.classList.toggle("is-cur", st.cur === it);
        c.state.textContent = it.status === "done" ? "✓" : it.status === "error" ? "!" : it.status === "working" ? "…" : "";
        c.sv.hidden = !(it.status === "done" && it.out);
        const r = c.mini.querySelector(".t-mini-rect");
        if (it.crop && it.width) Object.assign(r.style, { left: (it.crop.x / it.width) * 100 + "%", top: (it.crop.y / it.height) * 100 + "%", width: (it.crop.w / it.width) * 100 + "%", height: (it.crop.h / it.height) * 100 + "%" });
      }
      function removeItem(it) {
        const i = st.items.indexOf(it); st.items.splice(i, 1);
        const c = chips.get(it.id); if (c) c.btn.remove(); chips.delete(it.id);
        const was = st.cur === it; T.disposeItem(it);
        if (was) { st.cur = null; const nx = st.items[Math.min(i, st.items.length - 1)]; if (nx && nx.status !== "error") select(nx); else if (nx) st.cur = null; }
        if (!st.items.length) { body.hidden = true; stageImg.removeAttribute("src"); }
        refresh();
      }
      function clearAll() { st.gen++; st.items.forEach(T.disposeItem); st.items = []; st.cur = null; chips.clear(); strip.textContent = ""; stageImg.removeAttribute("src"); body.hidden = true; refresh(); }
      function resetAll() { st.items.forEach((it) => { if (it.crop) { it.crop = fitRect(it.width, it.height, ratioOf(it)); invalidate(it); paintChip(it); } }); paint(); }
      function invalidate(it) { if (it.status === "done") { it.status = "idle"; if (it.out && it.out.url) URL.revokeObjectURL(it.out.url); it.out = null; } }
      function applyToAll() {
        const c = st.cur; if (!c) return; const n = { x: c.crop.x / c.width, y: c.crop.y / c.height, w: c.crop.w / c.width, h: c.crop.h / c.height };
        st.items.forEach((it) => {
          if (it === c || !it.crop) return;
          const r = ratioOf(it); let w = n.w * it.width, hh = n.h * it.height;
          if (r) { hh = w / r; if (hh > it.height) { hh = it.height; w = hh * r; } }
          it.crop = { x: clamp(n.x * it.width, 0, it.width - w), y: clamp(n.y * it.height, 0, it.height - hh), w, h: hh }; invalidate(it); paintChip(it);
        });
        bar.summary("Đã áp dụng vị trí cho tất cả ảnh."); refresh(true);
      }

      /* ---- Hiển thị vùng cắt ---- */
      function select(it) {
        st.cur = it; if (!it.url) it.url = URL.createObjectURL(it.file);
        stageImg.onload = layout; stageImg.src = it.url; if (stageImg.complete && stageImg.naturalWidth) layout();
        st.items.forEach(paintChip);
      }
      function layout() {
        const it = st.cur; if (!it) return;
        const availW = Math.max(120, stage.clientWidth - 20), maxH = Math.min(560, Math.round(window.innerHeight * 0.65));
        st.scale = Math.min(availW / it.width, maxH / it.height);
        inner.style.width = Math.round(it.width * st.scale) + "px"; inner.style.height = Math.round(it.height * st.scale) + "px";
        paint();
      }
      window.addEventListener("resize", () => st.cur && layout());
      function paint() {
        const it = st.cur; if (!it || !it.crop) return; const c = it.crop, k = st.scale;
        Object.assign(box.style, { left: c.x * k + "px", top: c.y * k + "px", width: c.w * k + "px", height: c.h * k + "px" });
        box.classList.toggle("is-ratio", !!lockedRatio(it));
        info.textContent = `${it.name} · vùng cắt ${Math.round(c.w)}×${Math.round(c.h)} px (từ ${it.width}×${it.height})`;
        paintChip(it);
      }

      /* ---- Kéo / đổi cỡ bằng con trỏ (chuột, cảm ứng, bút) ---- */
      let drag = null;
      box.addEventListener("pointerdown", (e) => {
        const it = st.cur; if (!it) return; e.preventDefault();
        const hd = e.target.dataset && e.target.dataset.h;
        drag = { id: e.pointerId, hd: hd || "move", x: e.clientX, y: e.clientY, r0: { ...it.crop } };
        box.setPointerCapture(e.pointerId); box.focus({ preventScroll: true });
      });
      box.addEventListener("pointermove", (e) => {
        const it = st.cur; if (!drag || e.pointerId !== drag.id || !it) return;
        const dx = (e.clientX - drag.x) / st.scale, dy = (e.clientY - drag.y) / st.scale, r0 = drag.r0;
        if (drag.hd === "move") it.crop = { x: clamp(r0.x + dx, 0, it.width - r0.w), y: clamp(r0.y + dy, 0, it.height - r0.h), w: r0.w, h: r0.h };
        else it.crop = resizeRect(r0, drag.hd, dx, dy, lockedRatio(it), it.width, it.height, Math.max(8, 24 / st.scale));
        invalidate(it); paint();
      });
      const end = (e) => { if (drag && e.pointerId === drag.id) { drag = null; refresh(true); } };
      box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
      box.addEventListener("keydown", (e) => {
        const it = st.cur; if (!it || !it.crop) return;
        const step = Math.max(1, Math.round(1 / st.scale)) * (e.shiftKey ? 10 : 1), d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!d) return; e.preventDefault();
        it.crop = { ...it.crop, x: clamp(it.crop.x + d[0] * step, 0, it.width - it.crop.w), y: clamp(it.crop.y + d[1] * step, 0, it.height - it.crop.h) }; invalidate(it); paint(); refresh(true);
      });

      function refresh(quiet) {
        const ok = st.items.filter((i) => i.status !== "error"), done = st.items.filter((i) => i.status === "done");
        drop.setCompact(st.items.length > 0);
        bar.canRun(ok.length > 0 && !st.running); bar.canZip(done.length > 0 && !st.running);
        bar.label(`Cắt ${ok.length} ảnh`);
        if (!st.running && !quiet) bar.summary(done.length ? `Xong ${done.length}/${ok.length} ảnh` : st.items.length ? `${st.items.length} ảnh đã chọn` : "");
        st.items.forEach(paintChip);
      }

      /* ---- Xuất ảnh ---- */
      function outMime(it) {
        if (st.fmt !== "keep") return st.fmt;
        return it.type === "image/jpeg" || it.type === "image/webp" ? it.type : "image/png";
      }
      async function cropOne(it) {
        const img = await T.loadImage(it.file); let canvas = null;
        try {
          let mime = outMime(it); if (!(await T.canEncode(mime))) mime = "image/png";
          const c = it.crop, sx = clamp(Math.round(c.x), 0, img.width - 1), sy = clamp(Math.round(c.y), 0, img.height - 1);
          const sw = clamp(Math.round(c.w), 1, img.width - sx), sh = clamp(Math.round(c.h), 1, img.height - sy);
          let w = sw, hh = sh;
          if (st.sizeMode === "width" && st.outW > 0) { w = Math.round(st.outW); hh = Math.max(1, Math.round((sh * w) / sw)); }
          canvas = T.drawScaled(img, sx, sy, sw, sh, w, hh, mime === "image/jpeg" ? st.bg : null);
          const blob = await T.encode(canvas, mime, st.quality / 100);
          if (blob.type !== mime) throw new Error(`Trình duyệt này chưa xuất được ${T.LABEL[mime]}`);
          return { blob, mime, w, h: hh };
        } finally { img.close(); T.freeCanvas(canvas); }
      }
      async function run() {
        if (st.running) return;
        const todo = st.items.filter((i) => i.status !== "error" && i.crop), gen = ++st.gen, used = new Set(), sfx = T.safeName(st.suffix);
        st.running = true; bar.busy(true); let n = 0;
        for (const it of todo) {
          if (gen !== st.gen) break;
          it.status = "working"; paintChip(it); await T.sleep(0);
          try {
            const r = await cropOne(it);
            it.out = { blob: r.blob, name: T.uniqueName(`${T.safeName(it.base)}${sfx}.${T.EXT[r.mime]}`, used), w: r.w, h: r.h }; it.status = "done";
          } catch (e) { it.status = "idle"; it.msg = e.message; bar.summary(`Lỗi ở ${it.name}: ${e.message}`); }
          paintChip(it); bar.progress(++n, todo.length);
          if (it.status === "done") bar.summary(`Đang cắt ${n}/${todo.length}…`);
        }
        st.running = false; bar.busy(false); bar.progress(1, 1); refresh();
      }
      async function zipAll() {
        const files = st.items.filter((i) => i.status === "done" && i.out).map((i) => ({ name: i.out.name, blob: i.out.blob }));
        if (!files.length) return;
        if (files.length === 1) return T.download(files[0].blob, files[0].name);
        bar.busy(true); bar.summary("Đang đóng gói zip…");
        try { T.download(await T.makeZip(files, (d, t) => bar.progress(d, t)), `anh-da-cat-${files.length}-file.zip`); } catch (e) { bar.summary(e.message); }
        bar.busy(false); bar.progress(1, 1); refresh();
      }
    },
  };
  T.__crop = { fitRect, resizeRect }; // để kiểm thử
})();
