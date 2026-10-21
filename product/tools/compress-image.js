/* product/tools/compress-image.js — Nén ảnh hàng loạt: theo chất lượng hoặc theo dung lượng mục tiêu, có thu nhỏ kích thước. Chạy hoàn toàn trên trình duyệt. */
(function () {
  "use strict";
  const T = window.ShinjuTools, h = T.h;

  T.tools["compress-image"] = {
    mount(root) {
      const st = { items: [], mode: "quality", quality: 75, targetKb: 300, maxSide: 0, fmt: "auto", suffix: "-min", keepIfLarger: true, running: false, gen: 0 };

      const drop = T.dropzone({
        icon: "🗜️", title: "Kéo thả ảnh cần nén vào đây hoặc bấm để chọn",
        hint: "Chọn nhiều ảnh cùng lúc · JPG, PNG, WebP, AVIF, GIF, BMP",
        onFiles: addFiles,
      });

      const mode = T.segmented({
        label: "Cách nén", value: st.mode,
        options: [{ value: "quality", label: "Theo chất lượng" }, { value: "target", label: "Theo dung lượng mục tiêu" }],
        onChange: (v) => { st.mode = v; sync(); markStale(); },
      });
      const quality = T.slider({ label: "Chất lượng", min: 20, max: 95, value: st.quality, fmt: (v) => v + "%", onChange: (v) => { st.quality = v; markStale(); }, hint: "70–80% thường nhẹ đi nhiều mà mắt thường khó nhận ra." });
      const target = T.numberField({ label: "Dung lượng tối đa mỗi ảnh", min: 10, max: 20000, value: st.targetKb, unit: "KB", onChange: (v) => { st.targetKb = v; markStale(); }, hint: "Công cụ tự tìm mức chất lượng cao nhất vẫn nằm trong giới hạn; nếu chưa đủ sẽ thu nhỏ kích thước." });
      const maxSide = T.select({
        label: "Giới hạn cạnh dài", value: "0",
        options: [{ value: "0", label: "Giữ nguyên kích thước" }, { value: "4096", label: "Tối đa 4096 px" }, { value: "2560", label: "Tối đa 2560 px" }, { value: "1920", label: "Tối đa 1920 px (Full HD)" }, { value: "1600", label: "Tối đa 1600 px" }, { value: "1280", label: "Tối đa 1280 px" }, { value: "1080", label: "Tối đa 1080 px" }, { value: "800", label: "Tối đa 800 px" }],
        onChange: (v) => { st.maxSide = +v; markStale(); }, hint: "Giảm kích thước là cách làm nhẹ ảnh hiệu quả nhất.",
      });
      const fmt = T.select({
        label: "Định dạng đầu ra", value: "auto",
        options: [{ value: "auto", label: "Tự động (JPG giữ JPG, còn lại → WebP)" }, { value: "image/jpeg", label: "JPG" }, { value: "image/webp", label: "WebP" }, { value: "image/avif", label: "AVIF" }, { value: "image/png", label: "PNG (không mất chất lượng)" }],
        onChange: (v) => { st.fmt = v; sync(); markStale(); }, hint: "PNG không nén theo chất lượng; muốn nhẹ hơn hãy chọn WebP hoặc thu nhỏ kích thước.",
      });
      const suffix = T.textField({ label: "Hậu tố tên file", value: st.suffix, placeholder: "-min", onChange: (v) => { st.suffix = v; markStale(); }, hint: "Ví dụ: anh.jpg → anh-min.jpg" });
      const keep = h("label", { class: "t-check" }, h("input", { type: "checkbox", checked: true, onchange: (e) => { st.keepIfLarger = e.target.checked; markStale(); } }), h("span", {}, "Giữ ảnh gốc nếu bản nén không nhỏ hơn"));
      const settings = T.panel("Cài đặt", h("div", { class: "t-settings" }, mode.el, quality.el, target.el, maxSide.el, fmt.el, suffix.el), keep);

      const list = T.rowList({
        onRemove: removeItem,
        describe: (it) => (it.width ? `${it.width}×${it.height} · ${T.LABEL[it.type] || "Ảnh"} · ${T.fmtBytes(it.size)}` : T.fmtBytes(it.size)),
        resultText: (it) => {
          if (!it.out) return "";
          const p = T.pct(it.size, it.out.blob.size), dim = it.out.w !== it.width || it.out.h !== it.height ? ` · ${it.out.w}×${it.out.h}` : "";
          return it.out.kept ? `Giữ bản gốc ${T.fmtBytes(it.size)} (nén không nhỏ hơn)` : `${T.fmtBytes(it.size)} → ${T.fmtBytes(it.out.blob.size)} (${p >= 0 ? "−" + p : "+" + -p}%)${dim}`;
        },
      });
      const bar = T.actionBar({ runLabel: "Nén ảnh", onRun: run, onZip: zipAll, onClear: clearAll });
      const listPanel = T.panel("Ảnh đã chọn", list.el, bar.el);
      listPanel.hidden = true; settings.hidden = true;
      root.append(drop.el, settings, listPanel, T.privacyNote());

      function sync() {
        const png = st.fmt === "image/png";
        quality.el.hidden = st.mode !== "quality"; target.show(st.mode === "target");
        quality.disable(png); mode.disable("target", png);
        if (png && st.mode === "target") { st.mode = "quality"; mode.set("quality"); quality.el.hidden = false; target.show(false); }
      }
      sync();
      T.canEncode("image/avif").then((ok) => { if (!ok) fmt.sel.querySelector('option[value="image/avif"]').remove(); });
      T.canEncode("image/webp").then((ok) => { if (!ok) fmt.sel.querySelector('option[value="image/webp"]').remove(); });

      async function addFiles(files) {
        for (let i = 0; i < files.length; i++) {
          const it = await T.makeItem(files[i]); st.items.push(it); list.update(it);
          bar.progress(i + 1, files.length); bar.summary(`Đang đọc ảnh ${i + 1}/${files.length}…`);
        }
        refresh();
      }
      function removeItem(it) { T.disposeItem(it); st.items = st.items.filter((x) => x !== it); list.remove(it); refresh(); }
      function clearAll() { st.gen++; st.items.forEach(T.disposeItem); st.items = []; list.clear(); refresh(); }
      function markStale() { st.items.forEach((it) => { if (it.status === "done") { it.status = "stale"; list.update(it); } }); refresh(); }

      function refresh() {
        const n = st.items.length, ok = st.items.filter((i) => i.status !== "error").length, done = st.items.filter((i) => i.status === "done");
        listPanel.hidden = settings.hidden = !n; drop.setCompact(n > 0);
        bar.canRun(ok > 0 && !st.running); bar.canZip(done.length > 0 && !st.running);
        bar.label(done.length && done.length === ok ? "Nén lại" : `Nén ${ok} ảnh`);
        if (!st.running) {
          const before = done.reduce((s, i) => s + i.size, 0), after = done.reduce((s, i) => s + i.out.blob.size, 0);
          bar.summary(done.length ? `Tổng ${T.fmtBytes(before)} → ${T.fmtBytes(after)} (giảm ${Math.max(0, T.pct(before, after))}%)` : n ? `${n} ảnh đã chọn` : "");
        }
      }

      async function pickMime(it) {
        let m = st.fmt === "auto" ? (it.type === "image/jpeg" ? "image/jpeg" : "image/webp") : st.fmt;
        if (!(await T.canEncode(m))) m = "image/jpeg";
        return m;
      }
      function dims(img) {
        const k = st.maxSide > 0 ? Math.min(1, st.maxSide / Math.max(img.width, img.height)) : 1;
        return [Math.max(1, Math.round(img.width * k)), Math.max(1, Math.round(img.height * k))];
      }
      async function compressOne(it) {
        const img = await T.loadImage(it.file), mime = await pickMime(it), opaque = mime === "image/jpeg" ? "#ffffff" : null;
        let canvas = null;
        try {
          let [w, hh] = dims(img), blob;
          canvas = T.drawScaled(img, 0, 0, img.width, img.height, w, hh, opaque);
          if (mime === "image/png" || st.mode === "quality") blob = await T.encode(canvas, mime, st.quality / 100);
          else {
            const limit = Math.max(10, st.targetKb || 300) * 1024;
            for (let round = 0; round < 5; round++) { // thử hạ chất lượng, chưa đủ thì thu nhỏ 15% rồi thử lại
              let lo = 0.3, hi = 0.92, best = null;
              const top = await T.encode(canvas, mime, hi);
              if (top.size <= limit) best = top;
              else for (let i = 0; i < 6; i++) { const q = (lo + hi) / 2, b = await T.encode(canvas, mime, q); if (b.size <= limit) { best = b; lo = q; } else hi = q; }
              if (best) { blob = best; break; }
              blob = await T.encode(canvas, mime, 0.3);
              if (blob.size <= limit || round === 4) break;
              w = Math.max(1, Math.round(w * 0.85)); hh = Math.max(1, Math.round(hh * 0.85));
              T.freeCanvas(canvas); canvas = T.drawScaled(img, 0, 0, img.width, img.height, w, hh, opaque);
            }
          }
          if (blob.type !== mime) throw new Error(`Trình duyệt này chưa xuất được ${T.LABEL[mime]}`);
          return { blob, mime, w, h: hh };
        } finally { img.close(); T.freeCanvas(canvas); }
      }

      async function run() {
        if (st.running) return;
        const todo = st.items.filter((i) => i.status !== "error"), gen = ++st.gen, used = new Set(), sfx = T.safeName(st.suffix);
        st.running = true; bar.busy(true); let n = 0;
        for (const it of todo) {
          if (gen !== st.gen) break;
          it.status = "working"; list.update(it); await T.sleep(0);
          try {
            const r = await compressOne(it), resized = r.w !== it.width || r.h !== it.height;
            if (st.keepIfLarger && !resized && r.blob.size >= it.size) {
              const ext = (it.name.match(/\.[^./\\]+$/) || [""])[0];
              it.out = { blob: it.file, name: T.uniqueName(`${T.safeName(it.base)}${ext}`, used), w: it.width, h: it.height, kept: true };
            } else it.out = { blob: r.blob, name: T.uniqueName(`${T.safeName(it.base)}${sfx}.${T.EXT[r.mime]}`, used), w: r.w, h: r.h };
            it.status = "done";
          } catch (e) { it.status = "error"; it.msg = e.message || "Không nén được"; it.out = null; }
          list.update(it); bar.progress(++n, todo.length); bar.summary(`Đang nén ${n}/${todo.length}…`);
        }
        st.running = false; bar.busy(false); bar.progress(1, 1); refresh();
      }

      async function zipAll() {
        const files = st.items.filter((i) => i.status === "done" && i.out).map((i) => ({ name: i.out.name, blob: i.out.blob }));
        if (!files.length) return;
        if (files.length === 1) return T.download(files[0].blob, files[0].name);
        bar.busy(true); bar.summary("Đang đóng gói zip…");
        try { T.download(await T.makeZip(files, (d, t) => bar.progress(d, t)), `anh-da-nen-${files.length}-file.zip`); } catch (e) { bar.summary(e.message); }
        bar.busy(false); bar.progress(1, 1); refresh();
      }
    },
  };
})();
