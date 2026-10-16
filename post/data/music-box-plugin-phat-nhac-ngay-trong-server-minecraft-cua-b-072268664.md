---
title: "Music Box – Plugin phát nhạc ngay trong server minecraft của bạn"
photo: "photo/hoang-hon-voxel-ben-hop-nhac-ky-dieu-mvairvij.webp"
date: "16/10/2026"
keywords: "music box, plugin music box, plugin phát nhạc minecraft, plugin nhạc minecraft, phát nhạc từ link, simple voice chat, plugin voicechat, plugin paper, plugin purpur, plugin leaf, minecraft 1.21, nhạc mp3 minecraft, plugin Việt Nam, Shinju Ch"
description: "Music Box là plugin Minecraft cho phép người chơi lưu và phát nhạc từ link mp3, ogg, wav qua Simple Voice Chat. Hỗ trợ Paper, Purpur, Leaf 1.21+."
---
>>>
<hr>&l&dMusic Box&r là plugin &lphát nhạc cá nhân&r dành cho server Minecraft chạy Core Paper như &bPaper&r, &bPurpur&r, &bLeaf&r. Người chơi chỉ cần dán link file nhạc trực tiếp, đặt cho nó một ID ngắn rồi phát bất cứ lúc nào bằng một câu lệnh. Âm thanh được truyền qua &aSimple Voice Chat&r nên nghe như đang bật loa ngay trong game, người ở gần còn nghe được nếu họ cho phép.
&7Tác giả: &f&lShinju Ch. [VNer]&r

&cLướt xuống dưới cùng bấm Tải xuống rồi hẳn đọc nha! &d:3&r

![Plugin Music Box phát nhạc từ link trên server Minecraft Paper Purpur Leaf](/post/photo/tiec-am-nhac-ben-ho-luc-hoang-hon-mvaiq87t.webp)

<h2>Điểm nổi bật</h2>
<ul><li>&aKho nhạc cá nhân&r: mỗi người chơi tự thêm tối đa 20 bài (có thể chỉnh trong config), admin không bị giới hạn.</li><li>&aPhát nhạc từ link trực tiếp&r: hỗ trợ &emp3, ogg, wav&r, tự nhận diện định dạng bằng nội dung file chứ không tin vào đuôi file.</li><li>&aKho nhạc global&r: admin thêm bài dùng chung, ai cũng phát được bằng một lệnh.</li><li>&aPhát khi đang tải&r: không cần chờ tải xong cả file, chỉ đệm vài giây đầu là phát.</li><li>&aNghe nhạc người khác&r: người chơi ở gần (mặc định 24 block) nghe được nhạc bạn phát, ai không thích có thể tắt trong menu cài đặt.</li><li>&aLặp lại thông minh&r: lặp danh sách phát, lặp một bài hoặc phát ngẫu nhiên.</li><li>&aMenu cài đặt trong game&r: bật tắt nghe nhạc người khác, lặp lại, đổi chế độ phát, hủy nhạc chỉ với vài cú click.</li><li>&aTiết kiệm băng thông&r: cache file trên đĩa, nghe lại cùng link không tốn thêm dữ liệu, tải trùng được gộp lại, dừng nhạc là ngắt tải ngay.</li><li>&aKiểm tra link khi thêm&r: link hỏng, trang web hoặc file không hỗ trợ sẽ bị từ chối ngay lúc /musicbox add.</li><li>&aTự đổi link chia sẻ&r: link GitHub (blob), Dropbox và Google Drive được tự chuyển sang link tải trực tiếp.</li><li>&aAn toàn&r: chặn link trỏ tới IP nội bộ, có hệ thống cấm người chơi, giới hạn dung lượng và thời lượng bài.</li><li>&aTùy biến toàn bộ thông báo&r bằng tiếng Việt, hỗ trợ mã màu &.</li></ul>

<hr>

<h2>Yêu cầu</h2>
<h3>Phía server</h3>
<ul><li>Core &bPaper&r hoặc nhánh của Paper như &bPurpur&r, &bLeaf&r, phiên bản &e1.21 trở lên&r.</li><li>&eJava 21&r trở lên.</li><li>Plugin &c&lSimple Voice Chat&r (bản dành cho Bukkit/Paper) &c- bắt buộc&r. Thiếu plugin này thì Music Box sẽ tự tắt khi khởi động.</li><li>Mở cổng UDP của Simple Voice Chat trên server (mặc định 24454) để người chơi kết nối được voice chat.</li></ul>
<h3>Phía người chơi</h3>
<ul><li>Cài mod &aSimple Voice Chat&r trên máy (bản khớp với phiên bản Minecraft) rồi vào server. Chưa có mod sẽ không nghe được nhạc.</li></ul>
Tải Simple Voice Chat tại: <a href="https://modrinth.com/plugin/simple-voice-chat" target="_blank">[Modrinth]</a>
<hr>

<h2>Cài đặt</h2>
<ul><li>&eBước 1:&r Cài Simple Voice Chat lên server và kiểm tra voice chat hoạt động.</li><li>&eBước 2:&r Bỏ file &fMusicBox.jar&r vào thư mục &fplugins&r.</li><li>&eBước 3:&r Khởi động lại server (không nên dùng /reload).</li><li>&eBước 4:&r Plugin tự tạo thư mục &fplugins/MusicBox&r gồm config.yml, dữ liệu người chơi và thư mục cache.</li><li>&eBước 5:&r Chỉnh config nếu cần rồi dùng &e/musicbox reload&r để áp dụng.</li></ul>

👉 [Tải Music Box tại đây](https://github.com/ShinjuVN/Plugin-Paper-API/releases/tag/Plugin-MusicBox)

<hr>

<h2>Cách sử dụng</h2>
<h3>1. Chuẩn bị link nhạc</h3>
Bạn cần một link &etrực tiếp tới file nhạc&r (mp3, ogg hoặc wav), ví dụ link từ catbox.moe, GitHub, Dropbox, Google Drive hoặc archive.org. Link dẫn tới trang web thông thường hoặc file FLAC sẽ bị từ chối.
&4Lưu ý: &fcần add các link lưu trữ nhạc trong config, mặc định có sẵn <a href="https://catbox.moe" target="_blank">catbox.moe</a>&r

<h3>2. Thêm bài hát</h3>
&e/musicbox add {id} {link}&r
<blockquote>Ví dụ: /musicbox add lofi https://files.catbox.moe/abc123.mp3</blockquote>
<ul><li>ID chỉ gồm chữ thường, số, dấu gạch dưới hoặc gạch ngang, tối đa 32 ký tự.</li><li>Không dùng ID &call&r vì đã được giữ riêng.</li><li>Plugin sẽ kiểm tra link trước, hợp lệ mới lưu.</li></ul>

<h3>3. Phát và dừng nhạc</h3>
<ul><li>&e/musicbox play {id}&r - phát bài trong kho cá nhân.</li><li>&e/musicbox global {id}&r - phát bài trong kho global.</li><li>&e/musicbox cancel&r - dừng nhạc đang phát.</li><li>&e/musicbox list&r - xem danh sách bài cá nhân và bài global.</li><li>&e/musicbox del {id}&r - xóa bài cá nhân.</li></ul>

<h3>4. Cài đặt cá nhân</h3>
Gõ &e/musicbox setting&r để mở menu:
<ul><li>&bNghe nhạc người khác&r: bật hoặc tắt việc nghe nhạc do người chơi ở gần phát.</li><li>&bLặp lại bài cá nhân&r: bật thì bài tự phát tiếp, tắt thì chỉ phát một lần.</li><li>&bChế độ phát lại&r: lặp danh sách phát, lặp bài đang phát hoặc phát ngẫu nhiên.</li><li>&cHủy nhạc hiện tại&r: dừng ngay bài đang phát.</li></ul>

<h3>Lệnh dành cho quản trị viên</h3>
<ul><li>&c/musicbox reload&r - tải lại config.</li><li>&c/musicbox clearcache&r - xóa toàn bộ cache nhạc đã tải.</li><li>&c/musicbox globalmusic add {id} {link}&r - thêm bài vào kho global.</li><li>&c/musicbox globalmusic del {id}&r - xóa bài global.</li><li>&c/musicbox globalmusic list&r - xem danh sách bài global.</li><li>&c/musicbox delplayer {player} {id hoặc all}&r - xóa bài của người chơi.</li><li>&c/musicbox ban {player}&r - cấm người chơi dùng Music Box.</li><li>&c/musicbox unban {player}&r - gỡ cấm.</li></ul>
Lệnh có thể gọi ngắn bằng &e/mbox&r.

<hr>

<h2>Quyền hạn (Permission)</h2>
<ul><li>&emusicbox.use&r - dùng các lệnh cơ bản, &amặc định bật cho mọi người&r.</li><li>&cmusicbox.admin&r - dùng lệnh quản trị, không bị giới hạn số bài, &cmặc định chỉ OP&r.</li></ul>

<hr>

<h2>Cấu hình nhanh</h2>
Các mục thường chỉnh trong &fconfig.yml&r:
<ul><li>&bsettings.max-songs-per-player&r: số bài tối đa mỗi người (mặc định 20).</li><li>&bsettings.max-file-size-mb&r: dung lượng file tối đa (mặc định 30 MB).</li><li>&bsettings.max-duration-seconds&r: thời lượng tối đa mỗi bài (mặc định 600 giây).</li><li>&bsettings.allowed-domains&r: giới hạn tên miền được phép, để trống là cho mọi tên miền.</li><li>&bsettings.verify-on-add&r: kiểm tra link khi thêm bài.</li><li>&bsettings.max-concurrent-downloads&r: số lượt tải chạy cùng lúc (cần khởi động lại server để đổi).</li><li>&bcache.max-size-mb&r và &bcache.ttl-hours&r: dung lượng và thời gian lưu cache.</li><li>&baudio.distance&r và &baudio.volume&r: khoảng cách nghe và âm lượng.</li></ul>

<hr>

<h2>Lưu ý</h2>
<blockquote>Plugin chỉ hỗ trợ định dạng mp3, ogg và wav. File FLAC, link trang web hoặc link yêu cầu đăng nhập sẽ không phát được.</blockquote>
<blockquote>File config.yml cũ trên server không tự bị ghi đè khi nâng cấp, hãy so sánh với bản mới nếu muốn dùng các tùy chọn mới.</blockquote>
<blockquote>Người chơi chưa cài mod Simple Voice Chat sẽ nhận thông báo và không nghe được nhạc.</blockquote>

<a class="button-5s" data-seconds="30" href="https://shinjuvn.github.io/download/music-box-1-21-11/" target="_blank" rel="noopener noreferrer">Link tải plugin</a>

&7Nếu gặp lỗi hoặc muốn đề xuất tính năng, hãy để lại bình luận bên dưới bài viết hoặc liên hệ trực tiếp qua các [liên hệ](../../channel) &7của tui nha. &cCảm ơn bạn đã sử dụng &d&lMusic Box&r&7!&r
