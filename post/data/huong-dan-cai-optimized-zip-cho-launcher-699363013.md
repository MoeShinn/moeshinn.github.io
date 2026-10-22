---
title: "Hướng dẫn cài Optimized.zip cho Launcher"
photo: "photo/so-sanh-minecraft-vanilla-den-toi-uu-hoa-mv9nycwt.webp"
date: "16/10/2026"
keywords: "Tối ưu minecraft, sodium, Optimized Fabric, Fabric Launcher, Prism Launcher, Legacy Launcher"
description: "Hướng dẫn cài Optimized Fabric cho Minecraft bằng Legacy Launcher, Fabric Launcher, Prism Launcher"
---
§7Bài này dùng:§r 
| §eLegacy Launcher§r §7
|§r §eFabric§r §7
|§r §eFabric API§r §7
|§r §eoptimized-pack.zip§r
Bạn có thể làm tương tự với §bFabric Launcher§r, §bPrism Launcher§r hoặc các launcher khác, chỉ khác vị trí vài nút bấm.

![Hướng dẫn cài Optimized Fabric cho Minecraft bằng Legacy Launcher](/post/photo/toi-uu-minecraft-voi-fabric-hien-dai-mv9o9na7.webp)

<hr>

<h2>1. Optimized Fabric/Fabulously Optimized là gì?</h2>
§lOptimized Fabric và Fabulously Optimized§r là bộ mod (modpack) tối ưu hiệu năng cho Minecraft chạy trên nền §aFabric§r, giúp tăng FPS, giảm lag và giảm ngốn RAM, rất hợp với máy cấu hình thấp.
<blockquote>Lưu ý: modpack này §lKHÔNG chạy một mình§r. Bắt buộc phải có §cFabric API§r và đúng bản Minecraft mà modpack hỗ trợ.</blockquote>

<hr>

<h2>2. Chuẩn bị trước khi cài</h2>
<ul><li>Một launcher đã cài sẵn: §lLegacy Launcher§r (bài này), Fabric Launcher hoặc Prism Launcher</li><li>File §emrpack-to-zip.zip§r (bản modpack đã đổi từ .mrpack sang .zip)</li><li>Tải §lFabric API§r đúng phiên bản Minecraft: <a href="https://modrinth.com/mod/fabric-api/versions">[Modrinth]</a> hoặc <a href="https://www.curseforge.com/minecraft/mc-mods/fabric-api">[CurseForge]</a></li><li>Link tải Optimized ZIP: <a href="https://github.com/ShinjuVN/Optimized-Fabric-Pack/releases" target="_blank">tại đây</a></li><li>Đã cài §lJava§r phù hợp: Minecraft 1.20.5 trở lên dùng §aJava 21§r, 1.18 đến 1.20.4 dùng §aJava 17§r. Có thể bỏ qua nếu Launcher chạy bằng java có sẵn trong mã nguồn.</li></ul>
§cQuan trọng:§r phiên bản Minecraft, phiên bản Fabric API và phiên bản Optimized Fabric phải §lKHỚP NHAU§r. Lệch phiên bản là game sẽ crash hoặc không mở được.

<hr>

<h2>3. Tải phiên bản Minecraft cần cài (bước bắt buộc)</h2>
Phải tải sẵn đúng phiên bản Minecraft có Fabric về máy §lrồi mới cài modpack được§r. Nếu bỏ qua, bạn sẽ không thấy mục §efabric-version;§r và game không mở.
<ul><li>Mở §lLegacy Launcher§r</li><li>Ở danh sách phiên bản, chọn đúng bản Minecraft mà Optimized Fabric hỗ trợ, ví dụ §e1.21.1§r</li><li>Chọn loader §aFabric§r (nếu launcher có tùy chọn này)</li><li>Bấm §aVào game / Play§r để launcher tải file về</li><li>Khi vào được màn hình chính của Minecraft thì §lthoát game§r</li></ul>
Sau bước này, trong danh sách phiên bản của launcher sẽ có mục dạng §afabric-loader-version§r hoặc §afabric-version§r. Thấy mục này là bạn đã làm đúng.

![Danh sách phiên bản trong Legacy Launcher có mục fabric-version](/post/photo/screenshot-2026-10-15-221307-mv9ohodg.webp)

<hr>

<h2>4. Đặt setting của launcher (nên làm, sẽ dễ hơn)</h2>
Chỉnh setting như trong ảnh bên dưới trước khi cài sẽ giúp bạn dễ tìm thư mục game và tránh lỗi thiếu RAM.
<ul><li>§lVersion (Phiên bản):§r chọn đúng mục §afabric-&lt;version&gt;§r vừa tải ở bước 3</li><li>§lGame Directory (Thư mục game):§r để ở mặc định §e.minecraft§r hoặc tạo riêng một thư mục cho modpack để khỏi lẫn với bản chơi khác</li><li>§lRAM (Bộ nhớ cấp cho game):§r máy 8GB RAM nên để §a2GB - 4GB§r, máy 4GB RAM để §a2GB§r, không cấp quá nửa RAM máy</li><li>§lJava Path:§r chọn Java đúng phiên bản (xem mục 2), để §eAuto§r nếu launcher tự nhận được</li><li>§lKeep launcher open / Giữ launcher mở:§r bật lên để xem log khi game bị lỗi</li></ul>

![Cài đặt Legacy Launcher: phiên bản, thư mục game, RAM](/post/photo/screenshot-2026-10-15-221508-mv9okd2f.webp)



<hr>

<h2>5. Mở thư mục game</h2>
<ul><li>Trong launcher, bấm §lMở thư mục game / Open Game Folder§r</li>

![Mở thư mục phiên bản minecraft](/post/photo/screenshot-2026-10-15-221854-mv9op4e7.webp)

<li>Hoặc bấm §lWin + R§r, gõ §e%appdata%\.minecraft§r rồi Enter <div>§4Chỉ áp dụng được cho 1 vài launcher</div></li></ul>
Bạn sẽ thấy các thư mục như §lversions§r, §lmods§r, §lconfig§r, §lresourcepacks§r. Nếu chưa có thư mục §lmods§r thì tự tạo mới, đặt tên đúng là §amods§r.

<hr>

<h2>6. Giải nén và chép modpack vào launcher</h2>
<h3>Cài file Optimized-Pack.zip</h3>
<ul><li>Chuột phải vào file §eOptimized-Pack.zip§r, chọn §lExtract All / Giải nén§r ra một thư mục tạm</li><li>Mở thư mục vừa giải nén. Nếu bên trong có thư mục §loverrides§r thì mở vào trong nó</li><li>Chép toàn bộ các thư mục như §amods§r, §aconfig§r, §aresourcepacks§r, §ashaderpacks§r vào thư mục game ở bước 5</li><li>Nếu máy hỏi trùng file, chọn §lReplace / Ghi đè§r</li></ul>
§cKhông giải nén lồng nhiều lớp:§r thư mục §lmods§r phải nằm trực tiếp trong thư mục game, không phải kiểu §emods/mods/§r hay §eten-modpack/mods/§r.

<h3>Cài Fabric API</h3>
<ul><li>Tải file §lFabric API§r (đuôi §e.jar§r) đúng phiên bản Minecraft ở mục 2</li><li>Chép file §e.jar§r đó vào thư mục §amods§r, §lKHÔNG giải nén§r file này</li></ul>
§4Thiếu Fabric API là game sẽ báo lỗi hoặc đóng ngay khi khởi động!§r

<h3>Nếu dùng Prism Launcher</h3>
<ul><li>Bấm §aAdd Instance§r, chọn tab §lImport§r, chọn file §e.mrpack§r hoặc file §e.zip§r là xong, Prism sẽ tự cài loader và mod</li><li>Vẫn cần kiểm tra Fabric API đã có trong thư mục mods hay chưa</li></ul>

<hr>

<h2>7. Khởi động và kiểm tra</h2>
<ul><li>Quay lại launcher, chọn đúng mục §afabric-&lt;version&gt;§r</li><li>Bấm §aPlay§r, lần đầu mở sẽ lâu hơn bình thường vì game đang nạp mod, hãy chờ</li><li>Vào màn hình chính, bấm §lMods§r (nếu có) để xem danh sách mod đã nạp, thấy §aFabric API§r và các mod của Optimized Fabric là thành công</li><li>Vào thế giới, bấm §eF3§r để kiểm tra FPS, thường sẽ cao hơn rõ rệt so với bản vanilla</li></ul>

<hr>

<h2>8. Sửa lỗi thường gặp</h2>
<ul><li>§cGame crash ngay khi mở:§r thường do thiếu §lFabric API§r hoặc sai phiên bản Minecraft</li><li>§cKhông thấy mục fabric trong launcher:§r bạn chưa làm bước 3, hãy tải bản Minecraft + Fabric và vào game một lần</li><li>§cBáo lỗi Java:§r cài đúng Java 17 hoặc Java 21 theo phiên bản Minecraft rồi chọn lại Java Path trong setting</li><li>§cGame vẫn giật dù đã cài:§r giảm §lRender Distance§r xuống 6 - 8 chunk, tắt Fancy Graphics và kiểm tra lại RAM cấp cho game</li><li>§cMod bị trùng, game báo lỗi xung đột:§r xóa hết file trong thư mục §amods§r rồi chép lại từ đầu, nhớ giữ lại Fabric API</li></ul>

<blockquote>Mẹo: nếu bạn dùng nhiều modpack, hãy tạo riêng một §lthư mục game§r (hoặc instance trên Prism) cho từng modpack để tránh lẫn mod và lỗi xung đột.</blockquote>

<hr>
§l§aChúc bạn cài thành công và chơi Minecraft thật mượt!§r §oNếu bị lỗi, hãy comment kèm phiên bản Minecraft bạn đang dùng để mình hỗ trợ nhé.§r
