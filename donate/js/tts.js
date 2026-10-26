/* ShinjuTTS — đọc donate bằng tiếng Việt, dùng chung cho overlay và admin.
   Thứ tự: Google TTS (translate_tts, không cần key) → nếu bị chặn/lỗi/quá chậm thì tự chuyển sang speechSynthesis của trình duyệt.
   Không gọi Worker, không tốn API key. */
(() => {
  const DEF = {
    on: true,
    engine: "auto",        // auto = Google rồi dự phòng trình duyệt | browser = chỉ dùng giọng trình duyệt
    rate: 1,               // 0.5 – 2
    pitch: 1,              // 0 – 2 (chỉ giọng trình duyệt)
    volume: 100,           // 0 – 100
    voiceURI: "",          // giọng trình duyệt ưu tiên (rỗng = tự chọn giọng tiếng Việt)
    delay: 2,              // giây chờ sau âm thanh alert
    min: 10000,            // chỉ đọc từ mức tiền này
    maxChars: 100,         // đọc tối đa bao nhiêu ký tự lời nhắn
    text: "{DISPLAY NAME} đã tặng bạn 1 ly cà phê giá {AMOUNT} đồng.",
    textMsg: "{DISPLAY NAME} đã tặng bạn 1 ly cà phê giá {AMOUNT} đồng. Lời nhắn gửi từ {DISPLAY NAME}: {MESSENGER}",
  };
  const cfgOf = (t) => ({ ...DEF, ...(t || {}) });
  const clamp = (v, a, b, d) => { v = +v; return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d; };

  /* ---------- Số → chữ tiếng Việt ---------- */
  const D = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  function read3(n, full) { // n: 0..999; full: có nhóm cao hơn đứng trước → đọc đủ "không trăm", "linh"
    const tr = Math.floor(n / 100), ch = Math.floor((n % 100) / 10), dv = n % 10, s = [];
    if (tr || full) s.push(D[tr] + " trăm");
    if (ch > 1) { s.push(D[ch] + " mươi"); s.push(dv === 1 ? "mốt" : dv === 5 ? "lăm" : dv ? D[dv] : ""); }
    else if (ch === 1) { s.push("mười"); s.push(dv === 5 ? "lăm" : dv ? D[dv] : ""); }
    else if (dv) { if (tr || full) s.push("linh"); s.push(D[dv]); }
    return s.filter(Boolean).join(" ");
  }
  function below1e9(n, pad) {
    const U = ["", " nghìn", " triệu"], g = [], out = [];
    while (n > 0) { g.push(n % 1000); n = Math.floor(n / 1000); }
    for (let k = g.length - 1; k >= 0; k--) { if (!g[k]) continue; out.push(read3(g[k], pad || k !== g.length - 1) + U[k]); }
    return out.join(" ");
  }
  function num(n) {
    n = Math.floor(+n);
    if (!Number.isFinite(n) || n < 0) return String(n);
    if (n === 0) return "không";
    if (n >= 1e9) { const hi = Math.floor(n / 1e9), lo = n % 1e9; return (hi >= 1e9 ? String(hi).split("").map((c) => D[+c]).join(" ") : num(hi)) + " tỷ" + (lo ? " " + below1e9(lo, true) : ""); }
    return below1e9(n, false);
  }

  /* ---------- Chuẩn hoá văn bản để đọc tự nhiên ---------- */
  const L = "[\\p{L}\\p{N}]";
  const wb = (w) => new RegExp(`(?<!${L})(?:${w})(?!${L})`, "giu"); // \b không dùng được với chữ có dấu
  const ABBR = [ // viết tắt / teencode hay gặp trong lời nhắn donate
    [/ko|hok|hông|khg|hong/, "không"], [/dc|đc|dk|đk/, "được"], [/vnđ|vnd/, "đồng"], [/ae/, "anh em"], [/mn|mng/, "mọi người"],
    [/ng/, "người"], [/ny/, "người yêu"], [/bt/, "bình thường"], [/cx/, "cũng"], [/vs/, "với"], [/j/, "gì"], [/z/, "vậy"],
    [/hnay/, "hôm nay"], [/bn/, "bao nhiêu"], [/ok|oke|okê|okie|okla/, "ô kê"], [/cf/, "cà phê"], [/tks|thks|thanks|thank/, "cảm ơn"],
    [/ty/, "cảm ơn"], [/pls|plz/, "làm ơn"], [/sr|sorry/, "xin lỗi"], [/fb/, "phây búc"], [/yt/, "du túp"], [/vtuber/, "vi tuýp bơ"],
    [/pngtuber/, "pi en gi tuýp bơ"], [/stream/, "xờ trim"], [/livestream/, "lai xờ trim"], [/donate/, "đô nết"], [/ad|admin/, "át min"],
  ].map(([r, v]) => [wb(r.source), v]);

  function normalize(s) {
    s = String(s ?? "").normalize("NFC");
    s = s.replace(/https?:\/\/\S+|www\.\S+/gi, " ");
    s = s.replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, " ");                 // emoji
    s = s.replace(/(?<!\d)[:;=]['-]?[)(DPp3\]]+|\^[_.]?\^|<3|\b[xX][dD]\b/g, " ");          // emoticon  :)) =)) ^^ xD
    s = s.replace(/(?<![\p{L}\p{N}])k{3,}(?![\p{L}\p{N}])/giu, " ha ha ");            // kkkkk
    s = s.replace(/(?<![\p{L}\p{N}])(?:ha){2,}h?(?![\p{L}\p{N}])/giu, " ha ha ").replace(/(?<![\p{L}\p{N}])(?:hi){2,}(?![\p{L}\p{N}])/giu, " hi hi ");
    s = s.replace(/(\d)\s*(?:đ|₫)(?![\p{L}])/giu, "$1 đồng");                              // 20.000đ → 20.000 đồng
    // tiền: 50k, 1tr, 1tr5, 50.000, 1,5tr
    s = s.replace(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)(\d{1,3})?(?![\p{L}])/giu, (_, a, b) => { const v = +String(a).replace(",", "."); return Number.isInteger(v) ? num(v) + " triệu" + (b ? " " + num(+b * (b.length === 1 ? 100 : b.length === 2 ? 10 : 1)) + " nghìn" : "") : num(Math.round(v * 1e6)); });
    s = s.replace(/(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|ngàn)(?![\p{L}])/giu, (_, a) => { const v = +String(a).replace(",", "."); return Number.isInteger(v) ? num(v) + " nghìn" : num(Math.round(v * 1000)); });
    s = s.replace(/\d{1,3}(?:[.,]\d{3})+(?!\d)/g, (m) => num(+m.replace(/[.,]/g, "")));  // 50.000 / 1,000,000
    s = s.replace(/(\d+)[,.](\d{1,2})(?!\d)/g, (_, a, b) => `${num(+a)} phẩy ${b.split("").map((c) => D[+c]).join(" ")}`);
    s = s.replace(/\d+/g, (m) => (m.length > 12 ? m.split("").map((c) => D[+c]).join(" ") : num(+m)));
    for (const [r, v] of ABBR) s = s.replace(r, v);
    s = s.replace(/(\p{L})\1{2,}/gu, "$1");                                             // quáááá → quá
    s = s.replace(/[~^*_=#@|\\\/<>{}\[\]"“”]+/g, " ").replace(/&/g, " và ").replace(/%/g, " phần trăm ").replace(/\+/g, " cộng ");
    s = s.replace(/([.!?,;])\1+/g, "$1").replace(/\.{2,}/g, ".").replace(/\s+([.,!?;])/g, "$1").replace(/\s+/g, " ").trim();
    return s;
  }

  // Ghép câu đọc từ mẫu trong admin
  function build(t, al) {
    t = cfgOf(t);
    const msg = normalize(String(al.msg || "").slice(0, Math.max(0, +t.maxChars || 0)));
    const name = normalize(al.name || "") || "bạn ẩn danh";
    const amount = num(Math.round(+al.amount || 0));
    const tpl = msg ? t.textMsg : t.text;
    return String(tpl || "").replace(/\{DISPLAY NAME\}/g, name).replace(/\{AMOUNT\}/g, amount).replace(/\{MESSENGER\}/g, msg).replace(/\s+/g, " ").trim();
  }

  // Cắt câu ≤ max ký tự (giới hạn của Google TTS ~200), ưu tiên cắt ở dấu câu rồi tới khoảng trắng
  function split(text, max = 170) {
    const out = []; let rest = String(text).trim();
    while (rest.length > max) {
      let cut = Math.max(rest.lastIndexOf(". ", max), rest.lastIndexOf("! ", max), rest.lastIndexOf("? ", max), rest.lastIndexOf(", ", max), rest.lastIndexOf("; ", max));
      if (cut < max * 0.4) cut = rest.lastIndexOf(" ", max);
      if (cut < 1) cut = max;
      out.push(rest.slice(0, cut + 1).trim()); rest = rest.slice(cut + 1).trim();
    }
    if (rest) out.push(rest);
    return out.filter(Boolean);
  }

  /* ---------- Phát ---------- */
  let token = 0, curAudio = null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const gUrl = (q) => "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=" + encodeURIComponent(q);
  function playGoogle(q, o, my) {
    return new Promise((res, rej) => {
      const a = new Audio(); curAudio = a; a.preload = "auto"; a.volume = o.volume; a.playbackRate = o.rate;
      let started = false;
      const to = setTimeout(() => { if (!started) { a.pause(); rej(new Error("Google TTS quá chậm")); } }, 7000);
      a.onplaying = () => { started = true; clearTimeout(to); };
      a.onended = () => { clearTimeout(to); res(); };
      a.onerror = () => { clearTimeout(to); my !== token ? res() : rej(new Error("Google TTS lỗi hoặc bị chặn")); };
      a.src = gUrl(q);
      a.play().catch((e) => { clearTimeout(to); rej(e); });
    });
  }

  let vcache = null;
  function voices() { // danh sách giọng tiếng Việt của trình duyệt (tải bất đồng bộ)
    if (vcache) return vcache;
    return (vcache = new Promise((res) => {
      if (!("speechSynthesis" in window)) return res([]);
      const pick = () => speechSynthesis.getVoices().filter((v) => /^vi/i.test(v.lang) || /vietnam|tiếng việt/i.test(v.name));
      const now = pick(); if (now.length) return res(now);
      const done = () => { speechSynthesis.removeEventListener("voiceschanged", done); res(pick()); };
      speechSynthesis.addEventListener("voiceschanged", done); setTimeout(done, 1500);
    }));
  }
  async function playBrowser(text, o, my) {
    if (!("speechSynthesis" in window)) throw new Error("Trình duyệt không có speechSynthesis");
    const vs = await voices(), all = speechSynthesis.getVoices();
    const v = all.find((x) => x.voiceURI === o.voiceURI) || vs.find((x) => /online|natural|google/i.test(x.name)) || vs[0];
    return new Promise((res, rej) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = v?.lang || "vi-VN"; if (v) u.voice = v; u.rate = o.rate; u.pitch = o.pitch; u.volume = o.volume;
      const guard = setTimeout(() => { speechSynthesis.cancel(); res(); }, Math.max(6000, text.length * 220 / o.rate + 3000)); // một số trình duyệt (OBS) không bắn onend
      u.onend = () => { clearTimeout(guard); res(); };
      u.onerror = (e) => { clearTimeout(guard); /canceled|interrupted/.test(e.error) || my !== token ? res() : rej(new Error("speechSynthesis lỗi: " + e.error)); };
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    });
  }

  // speak(text, tts): trả về "google" | "browser" | "none". Không bao giờ ném lỗi.
  async function speak(text, t) {
    t = cfgOf(t); const my = ++token;
    const o = { rate: clamp(t.rate, 0.5, 2, 1), pitch: clamp(t.pitch, 0, 2, 1), volume: clamp(t.volume, 0, 100, 100) / 100, voiceURI: t.voiceURI };
    const chunks = split(text); if (!chunks.length) return "none";
    let i = 0, used = "none";
    if (t.engine !== "browser") {
      try {
        for (; i < chunks.length; i++) { if (my !== token) return used; await playGoogle(chunks[i], o, my); used = "google"; }
        return used;
      } catch (e) { console.warn("[TTS] Google lỗi, chuyển sang giọng trình duyệt:", e.message || e); }
    }
    if (my !== token) return used;
    try { await playBrowser(chunks.slice(i).join(" "), o, my); return used === "google" ? "google+browser" : "browser"; }
    catch (e) { console.warn("[TTS] speechSynthesis lỗi:", e.message || e); return used; }
  }
  function cancel() { token++; try { curAudio && curAudio.pause(); } catch {} try { "speechSynthesis" in window && speechSynthesis.cancel(); } catch {} }

  window.ShinjuTTS = { DEF, cfg: cfgOf, num, normalize, build, split, speak, cancel, voices, sleep };
})();
