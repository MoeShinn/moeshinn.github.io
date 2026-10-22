---
title: "Hướng dẫn cài đặt OBS tối ưu cho máy yếu (2026)"
photo: "photo/4e361l4e361l-mv9e87lz.webp"
date: "15/10/2026"
keywords: "cài đặt OBS cho máy yếu, OBS cho laptop cấu hình thấp, tối ưu OBS không lag, cách stream bằng máy yếu, quay màn hình máy yếu, hướng dẫn dùng OBS Studio, tải OBS Studio, cài đặt OBS để quay game, thông số OBS tối ưu, OBS QuickSync H.264, bitrate OBS 720p 30fps, cách giảm lag OBS, OBS, tải OBS, cài đặt OBS, sử dụng OBS, quay và stream, tối ưu OBS, máy yếu"
description: "Hướng dẫn tải, cài đặt và sử dụng OBS tối ưu cho máy yếu để quay và stream mượt mà, ổn định dù máy chỉ có cấu hình thấp. Thông số chuẩn để quay video và stream mượt, không giật, không rớt frame."
---
§oQuay màn hình mượt, stream ổn định dù máy chỉ có cấu hình thấp§r

§7Cấu hình mốc trong bài:§r 
|§eIntel Core i3-7100U§r §7
|§r §eRAM 8GB§r §7
|§r §eIntel HD 620§r §7
|§r §eSSD 256GB§r §7
|§r §eWindows 10§r
Máy bạn yếu hơn thì giảm thêm thông số, mạnh hơn thì tăng lên một bậc.

![OBS Studio trên laptop cấu hình thấp - hướng dẫn tối ưu quay và stream](/post/photo/gemini-generated-image-1y04yv1y04yv1y04-compress-mv9dli4u.webp)

<hr>

<h2>1. Tải OBS an toàn</h2>
§cLưu ý:§r chỉ tải từ trang chủ chính thức để tránh bản crack, bản chứa virus hoặc bản gắn quảng cáo.

<ul>
<li>Truy cập: <a href="https://obsproject.com">obsproject.com</a></li>

<li>Chọn đúng hệ điều hành: §aWindows§r, §bmacOS§r hoặc §6Linux§r</li>

<li>Windows 10/11 64-bit chọn bản §lInstaller§r</li>
</ul>

![Trang chủ OBS Project - nút tải xuống](/post/photo/screenshot-2026-10-15-171211-mv9dqup1.webp)

<h2>2. Cài đặt</h2>
<ul><li>Mở file vừa tải, bấm §lNext§r cho đến khi hoàn tất</li><li>Giữ nguyên thư mục cài mặc định, nên cài trên ổ §aSSD§r nếu có</li><li>Lần đầu mở sẽ hiện §lAuto-Configuration Wizard§r, chọn §lOptimize just for recording§r nếu chỉ quay hoặc §lOptimize for streaming§r nếu stream. Bước này chỉ để có thông số nền, ta sẽ chỉnh tay ở phần dưới.</li></ul>

<hr>

<h2>3. Chuẩn bị Windows trước khi mở OBS</h2>
<h3>Giải phóng tài nguyên</h3>
<ul><li>Tắt trình duyệt dư thừa, mỗi tab Chrome ngốn rất nhiều RAM</li><li>Tắt ứng dụng chạy nền: Discord overlay, Zalo, phần mềm diệt virus quét real-time</li><li>Chọn §lPower Plan§r thành §eHigh Performance§r (hoặc Best Performance)</li><li>Laptop: §lluôn cắm sạc§r khi quay hoặc stream</li></ul>
<blockquote>§cMáy yếu mà để Chrome mở 20 tab thì dù chỉnh OBS giỏi cỡ nào cũng vẫn giật.§r</blockquote>

<hr>

<h2>4. Cài đặt OBS tối ưu cho máy yếu</h2>
Vào §lSettings§r (Cài đặt) và chỉnh lần lượt theo các mục sau.

<h3>§b4.1 Video (Hình ảnh)§r</h3>
<ul><li>§lBase (Canvas) Resolution:§r §e1366x768§r hoặc §e1920x1080§r (độ phân giải màn hình của bạn)</li><li>§lOutput (Scaled) Resolution:§r §a1280x720§r (máy rất yếu chọn §a960x540§r)</li><li>§lDownscale Filter:§r §aBilinear§r (nhẹ nhất)</li><li>§lCommon FPS Values:§r §a30§r (máy rất yếu có thể hạ xuống §a24§r)</li></ul>

<h3>§b4.2 Output (Đầu ra): chọn Advanced§r</h3>
§6Tab Streaming (phát trực tiếp)§r
<ul><li>§lEncoder:§r §aQuickSync H.264§r (Intel) vì dùng chip đồ họa tích hợp nên CPU nhẹ hơn nhiều. Nếu không có thì chọn §ex264§r.</li><li>§lRate Control:§r §aCBR§r</li><li>§lBitrate:§r §a2500 - 3500 Kbps§r (tùy tốc độ upload mạng, nên để thấp hơn ~30% so với tốc độ upload thực tế)</li><li>§lKeyframe Interval:§r §a2§r</li><li>§lPreset:§r §aSpeed§r hoặc §aBalanced§r</li></ul>

§6Tab Recording (quay video)§r
<ul><li>§lType:§r §aStandard§r</li><li>§lRecording Format:§r §aMKV§r (không mất file khi máy treo), sau đó vào §lFile &gt; Remux Recordings§r để đổi sang §aMP4§r</li><li>§lEncoder:§r §aQuickSync H.264§r</li><li>§lRate Control:§r §aCQP§r, §lCQ Level:§r §a23 - 26§r (số càng cao thì file càng nhẹ, chất lượng giảm)</li></ul>

§cNếu máy không có QuickSync/NVENC và buộc dùng x264:§r đặt §lCPU Usage Preset§r thành §cultrafast§r hoặc §6superfast§r, tuyệt đối không dùng medium trở lên.

<h3>§b4.3 Audio (Âm thanh)§r</h3>
<ul><li>§lSample Rate:§r §a48 kHz§r</li><li>§lChannels:§r §aStereo§r</li><li>Tab Output &gt; §lAudio Bitrate:§r §a128§r</li></ul>

<h3>§b4.4 Advanced (Nâng cao)§r</h3>
<ul><li>§lProcess Priority:§r §aAbove Normal§r</li><li>§lColor Format:§r §aNV12§r</li><li>§lColor Space:§r §a709§r, §lColor Range:§r §aPartial§r</li></ul>

<hr>

<h2>5. Cách thêm nguồn quay (Sources)</h2>
Ở khung §lSources§r bấm dấu §a+§r rồi chọn:
<ul><li>§lGame Capture:§r quay game, §anhẹ nhất§r, nên ưu tiên dùng</li><li>§lWindow Capture:§r quay một cửa sổ ứng dụng</li><li>§lDisplay Capture:§r quay toàn màn hình, §cnặng hơn§r nên chỉ dùng khi cần</li><li>§lAudio Output Capture / Audio Input Capture:§r thu âm thanh hệ thống / micro</li></ul>

![Giao diện OBS - khung Sources và Audio Mixer](/post/photo/screenshot-2026-10-15-171516-mv9duw4a.webp)

<h3>Mẹo giảm tải khi dùng OBS</h3>
<ul><li>Tắt §lPreview§r (chuột phải vào khung xem trước, bỏ chọn §lEnable Preview§r) khi đang stream để tiết kiệm CPU/GPU</li><li>Hạn chế dùng Browser Source, filter nặng (Chroma Key, LUT, Noise Suppression kiểu RNNoise)</li><li>Quay game: đặt game ở §lWindowed Fullscreen§r và hạ đồ họa trong game xuống mức thấp</li><li>Giới hạn FPS game bằng với FPS quay để máy không bị quá tải</li></ul>

<hr>

<h2>6. Bắt đầu quay và stream</h2>
<ul><li>§lQuay video:§r bấm §aStart Recording§r, video lưu tại §lFile &gt; Show Recordings§r</li><li>§lStream:§r vào §lSettings &gt; Stream§r, chọn nền tảng (YouTube, Twitch, Facebook...) rồi dán §eStream Key§r, sau đó bấm §aStart Streaming§r</li></ul>
§4Tuyệt đối không chia sẻ Stream Key cho người khác!§r

<h2>7. Bảng tóm tắt nhanh</h2>
<ul><li>§lĐộ phân giải:§r §a1280x720§r | §lFPS:§r §a30§r</li><li>§lEncoder:§r §aQuickSync H.264§r (hoặc x264 ultrafast)</li><li>§lStream:§r §aCBR 2500-3500 Kbps§r | §lQuay:§r §aCQP 23-26, MKV§r</li><li>§lÂm thanh:§r §a48 kHz, 128 Kbps§r</li></ul>

<blockquote>Sau khi chỉnh xong, hãy quay thử 1-2 phút, xem lại video và kiểm tra mục Stats (§lView &gt; Stats§r) để chắc chắn không có §cdropped frames§r hoặc §cskipped frames§r. Nếu có thì giảm bitrate, độ phân giải hoặc FPS thêm một bậc.</blockquote>

<hr>
§l§aChúc bạn quay và stream thật mượt!§r §oNếu thấy bài đăng hữu ích, đừng quên chia sẻ cho đồng nghiệp nhé.§r
