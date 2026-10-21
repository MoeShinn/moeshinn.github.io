/* Hộp chọn ảnh dùng chung trong admin: chọn một ảnh có sẵn trong Kho ảnh (image/) hoặc tải ảnh mới lên.
   Ảnh tải lên được NÉN sang WebP (giữ nguyên kích thước, không cắt/thu nhỏ), tên 8 ký tự ngẫu nhiên, lưu vào image/ và
   ghi vào image/index.json (album "Sản phẩm") — đúng quy tắc của trang /admin/images.
   Dùng:  ImgPick.open({ Admin, onPick(url, previewUrl) })   — url là đường dẫn dạng /image/<tên>.webp */
(function (root) {
  const IDX = "image/index.json", ALBUM = { id: "san-pham", name: "Sản phẩm" }, U = () => root.ImgUtil;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const b64 = (blob) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result.split(",")[1]); f.readAsDataURL(blob); });
  const local = new Map(); // tên file → blob URL (ảnh vừa tải lên, web chưa kịp xuất bản)

  // Chỉ NÉN, không cắt/thu nhỏ. GIF/SVG giữ nguyên. Nếu bản nén nặng hơn bản gốc (và gốc <= 2,4 MB) thì giữ file gốc.
  async function prep(file, q = 85) {
    if (/gif|svg/.test(file.type)) return { blob: file, ext: U().extFor(file.type), w: 0, h: 0 };
    const bm = await createImageBitmap(file), c = document.createElement("canvas");
    c.width = bm.width; c.height = bm.height; c.getContext("2d").drawImage(bm, 0, 0);
    let out;
    for (;;) {
      const w = await new Promise((r) => c.toBlob(r, "image/webp", q / 100));
      out = w && w.type === "image/webp" ? w : await new Promise((r) => c.toBlob(r, "image/png"));
      if (out.size <= 2.4e6 || q <= 50 || out.type !== "image/webp") break;
      q = Math.max(50, q - 10);
    }
    const w0 = bm.width, h0 = bm.height; if (bm.close) bm.close();
    const keep = out.size >= file.size && file.size <= 2.4e6 && ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    return keep ? { blob: file, ext: U().extFor(file.type), w: w0, h: h0 } : { blob: out, ext: U().extFor(out.type), w: w0, h: h0 };
  }

  async function open({ Admin, onPick, title = "Chọn ảnh" }) {
    const ov = document.createElement("div"); ov.className = "modal";
    ov.innerHTML = `<div class="mbox" style="max-width:860px"><h3 style="margin:0">${esc(title)}</h3>
      <p class="hint" style="margin:0">Bấm vào ảnh để chọn, hoặc tải ảnh mới (được nén sang WebP, giữ nguyên kích thước).</p>
      <div><input type="file" accept="image/*" hidden id="ip_f"><button type="button" id="ip_up">＋ Tải ảnh mới lên</button> <button type="button" class="ghost" id="ip_x">Đóng</button> <span class="hint" id="ip_st"></span></div>
      <div id="ip_g" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;overflow:auto;min-height:120px"><span class="hint">Đang tải…</span></div></div>`;
    document.body.appendChild(ov);
    const $ = (s) => ov.querySelector(s), st = (m) => ($("#ip_st").textContent = m || "");
    const close = () => ov.remove(); $("#ip_x").onclick = close; ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
    let idx = { albums: [], images: [] }, tree = [];
    async function refresh() {
      try { [idx, tree] = await Promise.all([Admin.readJson(IDX, { albums: [], images: [] }), Admin.api("/tree").then((r) => r.files)]); } catch (e) { $("#ip_g").innerHTML = `<span class="err">${esc(e.message)}</span>`; return; }
      idx.images = idx.images || []; idx.albums = idx.albums || [];
      const known = new Set(idx.images.map((i) => i.file)), all = idx.images.slice();
      tree.filter((f) => /^image\/[^/]+\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f.path)).forEach((f) => { const file = f.path.slice(6); if (!known.has(file)) all.push({ file }); });
      $("#ip_g").innerHTML = all.map((i) => `<button type="button" class="ghost" data-f="${esc(i.file)}" title="${esc(i.name || i.file)}" style="padding:0;overflow:hidden;aspect-ratio:1;background:#050b16"><img src="${esc(local.get(i.file) || "/image/" + i.file)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.replaceWith(Object.assign(document.createElement('small'),{textContent:'Đang xuất bản…'}))"></button>`).join("") || '<span class="hint">Kho ảnh chưa có ảnh nào.</span>';
      $("#ip_g").querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { const f = b.dataset.f; close(); onPick("/image/" + f, local.get(f) || "/image/" + f); }));
    }
    $("#ip_up").onclick = () => $("#ip_f").click();
    $("#ip_f").onchange = async () => {
      const f = $("#ip_f").files[0]; if (!f) return;
      if (!f.type.startsWith("image/")) return Admin.toast("Hãy chọn file ảnh", true);
      if (f.size > 20e6) return Admin.toast("Ảnh quá lớn (>20 MB)", true);
      $("#ip_up").disabled = true;
      try {
        st("Đang nén…"); const p = await prep(f);
        if (p.blob.size > 2.5e6) throw new Error("Ảnh vẫn >2,5 MB dù đã nén mạnh nhất (giữ nguyên kích thước). Hãy dùng ảnh nhẹ hơn.");
        // đọc lại index mới nhất để không ghi đè thay đổi ở nơi khác
        const fresh = await Admin.readJson(IDX, { albums: [], images: [] }); fresh.albums = fresh.albums || []; fresh.images = fresh.images || [];
        if (!fresh.albums.some((a) => a.id === ALBUM.id)) fresh.albums.push({ ...ALBUM });
        const used = new Set(fresh.images.map((i) => i.file.replace(/\.[^.]+$/, ""))), file = `${U().rand8(used)}.${p.ext}`;
        fresh.images.unshift({ file, album: ALBUM.id, w: p.w, h: p.h, size: p.blob.size, name: f.name, added: new Date().toISOString() });
        st("Đang tải lên…");
        await Admin.commitFiles("Admin: tải 1 ảnh sản phẩm lên kho ảnh", [{ path: IDX, content: JSON.stringify(fresh, null, 2) + "\n" }, { path: "image/" + file, content: await b64(p.blob), encoding: "base64" }]);
        const pv = URL.createObjectURL(p.blob); local.set(file, pv);
        close(); Admin.toast("Đã tải ảnh lên. Ảnh hiện trên web sau ~1 phút."); await sleep(0); onPick("/image/" + file, pv);
      } catch (e) { Admin.toast(e.message, true); st(""); $("#ip_up").disabled = false; }
      $("#ip_f").value = "";
    };
    refresh();
  }
  root.ImgPick = { open, prep };
})(window);
