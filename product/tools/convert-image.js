/* product/tools/convert-image.js — Chuyển đổi định dạng ảnh hàng loạt (JPG / PNG / WebP / AVIF), chạy hoàn toàn trên trình duyệt. */
(function () {
  "use strict";
  const T = window.ShinjuTools, h = T.h;

  T.tools["convert-image"] = {
    mount(root) {
      const st = { items: [], fmt: "image/webp", quality: 85, bg: "#ffffff", running: false, gen: 0 };
      const FORMATS = [
        { mime: "image/jpeg", label: "JPG" }, { mime: "image/png", label: "PNG" },
        { mime: "image/webp", label: "WebP" }, { mime: "image/avif", label: "AVIF" },
      ];

      const drop = T.dropzone({
        icon: "🔄", title: "Kéo thả ảnh vào đây hoặc bấm để chọn",
        hint: "Chọn nhiều ảnh cùng lúc · đọc được JPG, PNG, WebP, AVIF, GIF, BMP, SVG",
        onFiles: addFiles,
      });

      const seg = T.segmented({
        label: "Chuyển sang định dạng", value: st.fmt,
        options: FORMATS.map((f) => ({ value: f.mime, label: f.label })),
        onChange: (v) => { st.fmt = v; sync(); markStale(); },
        hint: "WebP/AVIF nhẹ hơn JPG ở cùng chất lượng. PNG giữ nền trong suốt, không mất chi tiết.",
      });
      const quality = T.slider({ label: "Chất lượng", min: 40, max: 100, value: st.quality, fmt: (v) => v + "%", onChange: (v) => { st.quality = v; markStale(); }, hint: "Cao hơn = đẹp hơn nhưng file lớn hơn." });
      const bg = T.colorField({ label: "Màu nền thay cho vùng trong suốt", value: st.bg, onChange: (v) => { st.bg = v; markStale(); }, hint: "JPG không có nền trong suốt nên vùng trống sẽ được tô màu này." });
      const settings = T.panel("Cài đặt", h("div", { class: "t-settings" }, seg.el, quality.el, bg.el));

      const list = T.rowList({
        onRemove: removeItem,
        describe: (it) => (it.width ? `${it.width}×${it.height} · ${T.LABEL[it.type] || (it.type.split("/")[1] || "").toUpperCase() || "Ảnh"} · ${T.fmtBytes(it.size)}` : T.fmtBytes(it.size)),
        resultText: (it) => (it.out ? `→ ${it.out.name} · ${T.fmtBytes(it.out.blob.size)}` : ""),
      });
      const bar = T.actionBar({ runLabel: "Chuyển đổi", onRun: run, onZip: zipAll, onClear: clearAll });
      const listPanel = T.panel("Ảnh đã chọn", list.el, bar.el);
      listPanel.hidden = true; settings.hidden = true;

      root.append(drop.el, settings, listPanel, T.privacyNote());

      // Ẩn định dạng trình duyệt không xuất được
      FORMATS.forEach(async (f) => { if (!(await T.canEncode(f.mime))) { seg.disable(f.mime, true); if (st.fmt === f.mime) { st.fmt = "image/jpeg"; seg.set("image/jpeg"); sync(); } } });

      function sync() {
        const lossless = st.fmt === "image/png";
        quality.disable(lossless);
        bg.show(st.fmt === "image/jpeg");
      }
      sync();

      async function addFiles(all) {
        const { ok: files, skipped } = T.takeWithinLimit(st.items, Array.from(all));
        if (skipped) setTimeout(() => bar.summary(T.limitMessage(skipped)), 0);
        bar.summary(`Đang đọc ${files.length} ảnh…`);
        for (let i = 0; i < files.length; i++) {
          const it = await T.makeItem(files[i]);
          st.items.push(it); list.update(it);
          bar.progress(i + 1, files.length); bar.summary(`Đang đọc ảnh ${i + 1}/${files.length}…`);
        }
        refresh();
      }
      function removeItem(it) { T.disposeItem(it); st.items = st.items.filter((x) => x !== it); list.remove(it); refresh(); }
      function clearAll() { st.gen++; st.items.forEach(T.disposeItem); st.items = []; list.clear(); refresh(); }
      function markStale() { st.items.forEach((it) => { if (it.status === "done") { it.status = "stale"; list.update(it); } }); refresh(); }

      function refresh() {
        const n = st.items.length, ok = st.items.filter((i) => i.status !== "error").length, done = st.items.filter((i) => i.status === "done");
        listPanel.hidden = settings.hidden = !n;
        drop.setCompact(n > 0);
        bar.canRun(ok > 0 && !st.running); bar.canZip(done.length > 0 && !st.running);
        bar.label(done.length && done.length === ok ? "Chuyển đổi lại" : `Chuyển đổi ${ok} ảnh`);
        if (!st.running) {
          const before = done.reduce((s, i) => s + i.size, 0), after = done.reduce((s, i) => s + i.out.blob.size, 0);
          bar.summary(done.length ? `Xong ${done.length}/${ok} · ${T.fmtBytes(before)} → ${T.fmtBytes(after)}` : n ? `${n} ảnh đã chọn` : "");
        }
      }

      async function convertOne(it) {
        const img = await T.loadImage(it.file);
        let canvas;
        try {
          canvas = T.drawScaled(img, 0, 0, img.width, img.height, img.width, img.height, st.fmt === "image/jpeg" ? st.bg : null);
          const blob = await T.encode(canvas, st.fmt, st.quality / 100);
          if (blob.type !== st.fmt) throw new Error(`Trình duyệt này chưa xuất được ${T.LABEL[st.fmt]}`);
          return { blob, w: img.width, h: img.height };
        } finally { img.close(); T.freeCanvas(canvas); }
      }

      async function run() {
        if (st.running) return;
        const todo = st.items.filter((i) => i.status !== "error"), gen = ++st.gen, used = new Set();
        st.running = true; bar.busy(true);
        let n = 0;
        for (const it of todo) {
          if (gen !== st.gen) break;
          it.status = "working"; list.update(it); await T.sleep(0);
          try {
            if (it.out && it.out.url) URL.revokeObjectURL(it.out.url);
            const r = await convertOne(it);
            it.out = { blob: r.blob, name: T.uniqueName(`${T.safeName(it.base)}.${T.EXT[st.fmt]}`, used), w: r.w, h: r.h };
            it.status = "done";
          } catch (e) { it.status = "error"; it.msg = e.message || "Không chuyển được"; it.out = null; }
          list.update(it); bar.progress(++n, todo.length); bar.summary(`Đang chuyển ${n}/${todo.length}…`);
        }
        st.running = false; bar.busy(false); bar.progress(1, 1); refresh();
      }

      async function zipAll() {
        const files = st.items.filter((i) => i.status === "done" && i.out).map((i) => ({ name: i.out.name, blob: i.out.blob }));
        if (!files.length) return;
        if (files.length === 1) return T.download(files[0].blob, files[0].name);
        bar.busy(true); bar.summary("Đang đóng gói zip…");
        try { T.download(await T.makeZip(files, (d, t) => bar.progress(d, t)), `anh-${T.EXT[st.fmt]}-${files.length}-file.zip`); } catch (e) { bar.summary(e.message); }
        bar.busy(false); bar.progress(1, 1); refresh();
      }
    },
  };
})();
