/* Tạo lại toàn bộ trang tĩnh: /post/<id>/, /download/<id>/, link rút gọn /s/<mã>/, sitemap.xml, robots.txt — gom trong MỘT commit. */
(function (root, factory) { if (typeof module === "object" && module.exports) module.exports = factory(require("./postgen.js")); else root.Rebuild = factory(root.PostGen); })(typeof window !== "undefined" ? window : this, function (PG) {
  async function all(A, { posts, seo, render, onProgress = () => {} }) {
    const [postShell, dlShell, tree] = await Promise.all([A.readText("post/index.html"), A.readText("download/index.html"), A.api("/tree").then((r) => r.files.map((f) => f.path))]);
    const used = new Set(tree.map((p) => (p.match(/^s\/([^/]+)\/index\.html$/) || [])[1]).filter(Boolean));
    posts.forEach((p) => p.short && used.add(p.short));
    const links = JSON.parse(await A.readText("site-links.json").catch(() => "[]")); // link rút gọn tự đặt
    links.forEach((l) => used.add(l.id));
    const dlIds = tree.map((p) => (p.match(/^download\/data\/([^/]+)\.json$/) || [])[1]).filter(Boolean);
    const dls = [];
    for (const id of dlIds) { const data = JSON.parse(await A.readText(`download/data/${id}.json`)); if (data.short) used.add(data.short); dls.push({ id, data }); }
    const short = (o) => { if (!o.short) { o.short = PG.newShortCode(used, seo.shortLength); used.add(o.short); } return o.short; };
    const files = [], keep = new Set(), total = posts.length + dls.length; let n = 0;

    for (const p of posts) {
      onProgress(++n, total);
      if (p.visibility === "private") continue; // bài riêng tư: không có trang tĩnh (nếu có sẽ bị xóa bên dưới)
      const { meta, body } = render.parseFrontmatter(await A.readText(`post/data/${p.id}.md`));
      files.push({ path: `post/${p.id}/index.html`, content: PG.buildPostPage(postShell, { id: p.id, meta, bodyMd: body, bodyHtml: render.renderPostBody(body), seo, updated: p.updated, visibility: p.visibility }) });
      files.push({ path: `s/${short(p)}/index.html`, content: PG.buildShortPage({ id: p.id, meta, desc: meta.description || PG.excerpt(body), seo }) });
      keep.add(`post/${p.id}/index.html`); keep.add(`s/${p.short}/index.html`);
    }
    for (const { id, data } of dls) {
      onProgress(++n, total);
      const had = !!data.short;
      files.push({ path: `download/${id}/index.html`, content: PG.buildDownloadPage(dlShell, { id, data, seo }) });
      files.push({ path: `s/${short(data)}/index.html`, content: PG.buildShortPage({ id, base: "download", meta: { title: data.title || "Tải xuống", photo: data.photo }, desc: data.description || `Tải xuống ${data.title || id}`, seo }) });
      keep.add(`download/${id}/index.html`); keep.add(`s/${data.short}/index.html`);
      if (!had) files.push({ path: `download/data/${id}.json`, content: JSON.stringify(data, null, 2) + "\n" }); // lưu mã rút gọn vào file
    }
    for (const l of links) { files.push({ path: `s/${l.id}/index.html`, content: PG.buildLinkPage(l, seo) }); keep.add(`s/${l.id}/index.html`); }
    // Dọn trang tĩnh của bài/mục đã xóa hoặc đã chuyển sang riêng tư
    const deletes = tree.filter((p) => /^(post|download|s)\/[^/]+\/index\.html$/.test(p) && !keep.has(p));
    files.push({ path: "post/data/posts.json", content: JSON.stringify(posts, null, 2) + "\n" }, { path: "sitemap.xml", content: PG.buildSitemap(seo, posts, dlIds) }, { path: "robots.txt", content: PG.buildRobots(seo) });
    await A.commitFiles("Admin: tạo lại trang bài viết, trang download, link rút gọn và sitemap", files, deletes);
    return { posts: posts.filter((p) => p.visibility !== "private").length, downloads: dls.length, links: links.length, deleted: deletes.length };
  }

  // ---- Đăng / sửa MỘT bài: chỉ tạo file của bài đó (không đọc lại các bài khác) ----
  async function savePost(A, { posts, id, md, extraFiles = [], seo, render, message }) {
    const [shell, tree] = await Promise.all([A.readText("post/index.html"), A.api("/tree").then((r) => r.files.map((f) => f.path))]);
    const entry = posts.find((p) => p.id === id), has = (p) => tree.includes(p);
    const used = new Set(tree.map((p) => (p.match(/^s\/([^/]+)\/index\.html$/) || [])[1]).filter(Boolean)); posts.forEach((p) => p.short && used.add(p.short));
    const files = [{ path: `post/data/${id}.md`, content: md }, ...extraFiles], deletes = [];
    if (entry.visibility === "private") { // riêng tư: không để lại trang công khai
      if (has(`post/${id}/index.html`)) deletes.push(`post/${id}/index.html`);
      if (entry.short && has(`s/${entry.short}/index.html`)) deletes.push(`s/${entry.short}/index.html`);
    } else {
      const { meta, body } = render.parseFrontmatter(md);
      if (!entry.short) { entry.short = PG.newShortCode(used, seo.shortLength); }
      files.push({ path: `post/${id}/index.html`, content: PG.buildPostPage(shell, { id, meta, bodyMd: body, bodyHtml: render.renderPostBody(body), seo, updated: entry.updated, visibility: entry.visibility }) },
        { path: `s/${entry.short}/index.html`, content: PG.buildShortPage({ id, meta, desc: meta.description || PG.excerpt(body), seo }) });
    }
    return commitCommon(A, { message, files, deletes, posts, seo, tree });
  }
  // ---- Xóa MỘT bài: xóa file md, trang tĩnh và link rút gọn của bài ----
  async function deletePost(A, { posts, post, seo, message }) {
    const tree = (await A.api("/tree")).files.map((f) => f.path);
    const deletes = [`post/data/${post.id}.md`, `post/${post.id}/index.html`, post.short && `s/${post.short}/index.html`].filter((p) => p && tree.includes(p));
    return commitCommon(A, { message, files: [], deletes, posts, seo, tree });
  }
  async function commitCommon(A, { message, files, deletes, posts, seo, tree, writePosts = true }) {
    const dlIds = tree.map((p) => (p.match(/^download\/data\/([^/]+)\.json$/) || [])[1]).filter(Boolean);
    if (writePosts) files.push({ path: "post/data/posts.json", content: JSON.stringify(posts, null, 2) + "\n" });
    files.push({ path: "sitemap.xml", content: PG.buildSitemap(seo, posts, dlIds) }, { path: "robots.txt", content: PG.buildRobots(seo) });
    await A.commitFiles(message, files, deletes);
    return { files: files.length, deletes: deletes.length };
  }

  // ---- Đăng / sửa MỘT mục tải ----
  async function saveDownload(A, { id, data, seo, message }) {
    const [shell, tree, posts] = await Promise.all([A.readText("download/index.html"), A.api("/tree").then((r) => r.files.map((f) => f.path)), A.readJson("post/data/posts.json", [])]);
    const used = new Set(tree.map((p) => (p.match(/^s\/([^/]+)\/index\.html$/) || [])[1]).filter(Boolean)); posts.forEach((p) => p.short && used.add(p.short));
    if (!data.short) data.short = PG.newShortCode(used, seo.shortLength);
    const files = [{ path: `download/data/${id}.json`, content: JSON.stringify(data, null, 2) + "\n" },
      { path: `download/${id}/index.html`, content: PG.buildDownloadPage(shell, { id, data, seo }) },
      { path: `s/${data.short}/index.html`, content: PG.buildShortPage({ id, base: "download", meta: { title: data.title || "Tải xuống", photo: data.photo }, desc: data.description || `Tải xuống ${data.title || id}`, seo }) }];
    return commitCommon(A, { message, files, deletes: [], posts, seo, tree: tree.concat(`download/data/${id}.json`), writePosts: false });
  }
  async function deleteDownload(A, { id, data, seo, message }) {
    const [tree, posts] = await Promise.all([A.api("/tree").then((r) => r.files.map((f) => f.path)), A.readJson("post/data/posts.json", [])]);
    const deletes = [`download/data/${id}.json`, `download/${id}/index.html`, data.short && `s/${data.short}/index.html`].filter((p) => p && tree.includes(p));
    return commitCommon(A, { message, files: [], deletes, posts, seo, tree: tree.filter((p) => !deletes.includes(p)), writePosts: false });
  }
  return { all, savePost, deletePost, saveDownload, deleteDownload };
});
