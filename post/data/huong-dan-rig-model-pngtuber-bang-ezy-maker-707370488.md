---
title: "Hướng dẫn rig model PNGTuber bằng Ezy Maker"
photo: "photo/ezymaker-rig-model-pngtuber-bia-mvvl6v9y-mvvltj84.webp"
date: "31/10/2026"
keywords: "hướng dẫn Ezy Maker, cách rig model PNGTuber, tạo model PNGTuber, Ezy Maker, Ezy Tuber, EzyMaker.exe, tách layer PNGTuber, tạo khung xương PNGTuber, xuất model zip, model PNGTuber cho OBS"
description: "Hướng dẫn chi tiết cách rig model PNGTuber bằng Ezy Maker cho người mới bắt đầu. Tự động tạo khung xương, chớp mắt và nhép miệng nhanh chóng."
---
§oHướng dẫn từng bước biến bộ layer PNG của nhân vật thành model PNGTuber biết nhìn theo chuột, chớp mắt, mở miệng theo giọng nói và đổi biểu cảm bằng phím tắt.§r

Bài này viết cho người §lmới hoàn toàn§r, chưa từng rig bao giờ. Bạn chỉ cần có sẵn các layer PNG của nhân vật, còn lại cứ làm theo từng ảnh bên dưới là có model dùng được.

![Giao diện tổng quan của Ezy Maker với model demo đã được tự rig, các số 1 đến 8 đánh dấu từng khu vực](/post/photo/ezymaker-giao-dien-tong-quan-mvvl6b8d-mvvlv8yk.webp)

<p>§lEzy Maker§r là công cụ để §btạo model§r: nhập layer, rig (gắn khung xương cho nhân vật), xem thử và xuất ra file §emodel.zip§r. §lEzy Tuber§r là app §bhiển thị model§r: model nhìn theo chuột, mở miệng theo giọng nói của bạn, và bạn đưa nó vào OBS để stream. Nói gọn: §lMaker = làm model, Tuber = dùng model§r.</p>

<p>Xuyên suốt bài mình dùng một nhân vật demo tóc xanh bạc hà (bộ layer §eShikiri§r) để các bước nối tiếp nhau. Toàn bộ ảnh chụp là giao diện thật của app. §7Mình có vẽ thêm vài layer đơn giản chỉ để làm demo biểu cảm: mắt cười, miệng cười và một trái tim.§r</p>

<blockquote>
<p>§a§lLàm nhanh trong 6 bước§r</p>
<ol>
<li>§lChuẩn bị layer§r PNG cùng kích thước canvas, đặt tên có nghĩa §7(xem mục 1)§r</li>
<li>§lNhập layer§r vào Ezy Maker §7(xem mục 3)§r</li>
<li>Bấm §l🧩 Tạo khung xương tự động§r §7(xem mục 4)§r</li>
<li>§lKiểm tra và chỉnh§r layer, khớp, mắt, miệng, biểu cảm, rồi §l▶ Xem thử§r §7(xem mục 5 đến 10)§r</li>
<li>Bấm §l📦 Xuất zip§r §7(xem mục 11)§r</li>
<li>§lNhập zip vào Ezy Tuber§r và dùng §7(xem mục 12)§r</li>
</ol>
</blockquote>

<hr>

<h2>1. Chuẩn bị những thứ cần có</h2>

<h3>Phần mềm</h3>
<p>Bạn cần hai app: §eEzyMaker.exe§r và §eEzyTuber.exe§r. <a href="https://moeshinn.github.io/product/ezy-software/" target="_blank">§7Tải Ezy Software tại đây§r</a></p>

<h3>Bộ layer PNG của nhân vật</h3>
<p>§lLayer§r là từng mảnh của nhân vật được tách riêng thành ảnh: tóc sau, mặt, mắt, miệng, áo, tay... Khi xếp chồng lên nhau theo đúng thứ tự thì ra nhân vật hoàn chỉnh. Bạn tách layer từ ảnh gốc hoặc file PSD bằng công cụ tách layer như §lSee-through§r. §7Ezy Maker không vẽ lại hay sửa ảnh, nó chỉ cắt gọn vùng trống. Muốn đổi hình thì sửa bằng phần mềm vẽ rồi nhập lại.§r</p>
<ul>
<li>File §e.png§r hoặc §e.webp§r có §anền trong suốt§r</li>
<li>Tất cả layer có §lcùng kích thước canvas§r (canvas là tờ giấy vẽ chung, ví dụ 1024×1024). §cĐừng cắt gọn từng layer§r, vì app tự cắt gọn và tự nhớ vị trí</li>
<li>Nhập được: file ảnh lẻ, file §e.zip§r hoặc cả thư mục. Nếu có thêm §elayers.json§r đi kèm thì app dùng luôn thông tin trong đó</li>
<li>Thứ tự chồng lớp: nếu không có §elayers.json§r, app sắp theo §ltên file§r, file đứng trước nằm §ldưới§r. Vì vậy hãy đặt số đầu tên như §e000_§r, §e001_§r, §e002_§r...</li>
</ul>

<h3>Đặt tên layer để app tự nhận diện</h3>
<p>Khi bạn bấm §l🧩 Tạo khung xương tự động§r, app đọc §ltên layer§r để đoán nó là bộ phận nào. Tên càng rõ thì càng ít phải chỉnh tay. Mẫu tên app nhận (không phân biệt hoa thường, gạch dưới, gạch ngang hay khoảng trắng đều được):</p>
<ul>
<li>§e...eyewhite...§r hoặc §e...eye white...§r: lòng trắng mắt</li>
<li>§e...irides...§r, §e...iris...§r, §e...pupil...§r, §e...eyeball...§r: tròng mắt</li>
<li>§e...eyelash...§r hoặc §e...eyelid...§r: mi mắt</li>
<li>§e...eyebrow...§r: lông mày</li>
<li>§e...mouth...§r, §e...lip...§r, §e...teeth...§r, §e...tongue...§r: miệng. Tên có chữ §eopen§r (ví dụ §emouth_open§r) là §lmiệng mở§r</li>
<li>§e...ear...§r hoặc §e...ears...§r: tai</li>
<li>§e...hair...§r, §e...bang...§r, §e...fringe...§r: tóc. Có thêm §eback§r hoặc §erear§r (ví dụ §eback_hair§r) là tóc sau, còn lại là tóc trước</li>
<li>§e...neck...§r: cổ. §e...face...§r hoặc §e...head...§r: mặt</li>
<li>§e...hand...§r, §e...arm...§r, §e...sleeve...§r, §e...glove...§r: tay</li>
<li>§e...bottom...§r, §e...skirt...§r, §e...pant...§r, §e...short...§r: váy hoặc quần</li>
<li>§e...top...§r, §e...shirt...§r, §e...jacket...§r, §e...cloth...§r, §e...body...§r, §e...dress...§r, §e...coat...§r: thân áo</li>
<li>§e...headwear...§r, §e...hat...§r, §e...ribbon...§r, §e...horn...§r, §e...headband...§r, §e...hairpin...§r: phụ kiện đầu</li>
<li>§e...leg...§r, §e...sock...§r, §e...foot...§r, §e...shoe...§r, §e...boot...§r, §e...sneaker...§r: chân và giày §7(app để đứng yên)§r</li>
<li>§e...emote...§r, §e...bubble...§r, §e...heart...§r, §e...sweat...§r, §e...sparkle...§r, §e...tear...§r, §e...blush...§r: emote (bong bóng cảm xúc)</li>
</ul>
<p>Hai mẹo nhỏ:</p>
<ul>
<li>§lBên trái/phải:§r thêm hậu tố §e-l§r hoặc §e-r§r (ví dụ §eirides-l§r, §eears-r§r) để app tách hai mắt, hai tai, hai tay.</li>
<li>§lBiến thể biểu cảm:§r thêm một từ sau tên bộ phận. Ví dụ §eirides_happy-l§r là tròng mắt kiểu vui, §emouth_smile§r là miệng cười, §emouth_smile_open§r là miệng cười khi mở, §eemote_heart§r là emote trái tim. App tự gom chúng thành biểu cảm khi tự rig.</li>
</ul>

<h3>Checklist trước khi bắt đầu</h3>
<ul>
<li>Layer cùng kích thước canvas, nền trong suốt?</li>
<li>Mắt (lòng trắng, tròng, mi) và miệng đã §ltách riêng§r khỏi mặt?</li>
<li>Có layer §lmiệng mở§r nếu muốn nhép miệng theo giọng nói?</li>
<li>Có mi mắt hoặc mắt nhắm nếu muốn chớp hoặc đổi biểu cảm?</li>
<li>Tên layer có nghĩa và có số thứ tự đầu tên?</li>
</ul>

<blockquote>§cLưu ý quan trọng:§r Ezy Maker §lkhông tự vẽ thêm§r layer nào. Thiếu layer miệng mở hay mắt nhắm thì phải có sẵn từ bước tách layer. Cần bổ sung thì vẽ thêm bằng phần mềm vẽ rồi nhập lại.</blockquote>

<hr>

<h2>2. Làm quen giao diện Ezy Maker</h2>
<p>Nhìn lại ảnh tổng quan ở đầu bài, giao diện chia làm các khu vực sau (số khớp với số trong ảnh):</p>
<ol>
<li>§lThanh trên:§r ô §lTên model§r, các nút §l📥 Nhập layer§r, §l📁 Nhập thư mục§r, §l📂 Nhập model để chỉnh sửa§r, §l🧩 Tạo khung xương tự động§r, §l🔍 Tìm layer bị che§r, hoàn tác ↶, làm lại ↷, §l▶ Xem thử§r và §l📦 Xuất zip§r.</li>
<li>§lTab bên trái:§r hai tab §lLayer§r (danh sách layer) và §lKhớp§r (cây khớp).</li>
<li>§lDanh sách layer:§r ảnh nhỏ, tên và khớp mà layer đang gắn. Layer chưa gắn khớp có nhãn §eđứng yên§r.</li>
<li>§lThanh công cụ canvas:§r §l⤢ Vừa khung§r, mức zoom (ví dụ 100%), §l＋§r, §l－§r, và ba ô tick §lKhớp§r (hiện chấm vàng), §lKhung xuất§r (hiện khung nét đứt), §lLàm mờ layer khác§r.</li>
<li>§lCanvas:§r nơi xem và chỉnh nhân vật. §bCuộn chuột§r để phóng to hoặc thu nhỏ, §bgiữ Space§r hoặc §bchuột giữa/phải§r rồi kéo để dời khung nhìn. Phím §eF§r tương đương nút Vừa khung.</li>
<li>§lTab bên phải:§r bốn tab §lLayer§r, §lKhớp§r, §lBiểu cảm§r, §lModel§r.</li>
<li>§lBảng chi tiết:§r hiện thông số của thứ bạn đang chọn (layer hoặc khớp).</li>
<li>§lThanh trạng thái§r dưới cùng: app báo kết quả mỗi thao tác. Chữ §axanh§r là ổn, §evàng§r là cảnh báo, §cđỏ§r là lỗi. Khi gặp sự cố, hãy đọc dòng này đầu tiên.</li>
</ol>

<hr>

<h2>3. Nhập layer vào Ezy Maker</h2>
<p>Có ba cách nhập, cách nào cũng được:</p>
<ul>
<li>Bấm §l📥 Nhập layer§r rồi chọn các file §e.png/.webp§r hoặc một file §e.zip§r</li>
<li>Bấm §l📁 Nhập thư mục§r để nhập cả thư mục</li>
<li>§lKéo thả§r file, zip hoặc thư mục vào giữa cửa sổ</li>
</ul>

![Thanh trên của Ezy Maker với các nút Nhập layer, Nhập thư mục, Nhập model để chỉnh sửa, Tạo khung xương tự động, Tìm layer bị che và ô Tên model](/post/photo/ezymaker-thanh-nut-nhap-tu-rig-mvvl6c6q-mvvm0ozu.webp)

<p>Số 1, 2, 3 là ba cách nhập. Số 6 là ô §lTên model§r: hãy đặt tên ngay bây giờ, vì đó cũng là tên thư mục khi xuất. Nút số 3 (§l📂 Nhập model để chỉnh sửa§r) chỉ dùng để mở lại model đã làm, mình nói ở mục 11.</p>

<p>Nhập thành công, thanh trạng thái báo số layer đã nhập (số 2 trong ảnh dưới), và toàn bộ layer hiện trong danh sách (số 1). Lúc này nhân vật đã hiện đúng hình vì layer cùng canvas.</p>

![Sau khi nhập 28 layer, danh sách layer ở bên trái và thanh trạng thái ghi Đã nhập 28 layer](/post/photo/ezymaker-nhap-layer-thanh-cong-mvvl6d53-mvvm1wfi.webp)

<blockquote>§cLỗi hay gặp nhất khi nhập:§r layer bị cắt gọn và không có vị trí. Xem phần §lLỗi thường gặp§r ở mục 13 để biết nhận ra và sửa thế nào.</blockquote>

<hr>

<h2>4. Tạo khung xương tự động</h2>
<p>§lRig§r nghĩa là gắn "khung xương" cho nhân vật: chia thành các §lkhớp§r (đầu, cổ, tay...), cho mỗi khớp một §lđiểm xoay§r, rồi quy định khớp nào di chuyển theo chuột, theo giọng nói, theo nhịp thở. Phần này nghe phức tạp nhưng Ezy Maker làm sẵn cho bạn gần hết.</p>
<p>Bấm §l🧩 Tạo khung xương tự động§r. Nếu trước đó bạn đã có khớp, app hỏi xác nhận vì thao tác này §lxoá khớp và thiết lập chuyển động hiện có§r. App sẽ:</p>
<ul>
<li>Nhận diện layer theo tên và §ltạo khớp§r tương ứng</li>
<li>Đặt §lpivot§r (điểm xoay) cho từng khớp</li>
<li>Gán §lchuyển động mặc định§r (nhìn theo chuột, nảy khi nói, nhịp thở, đung đưa tóc/tay/váy)</li>
<li>§lNắn thẳng đầu§r nếu đầu bị nghiêng (đo từ đường nối hai mắt)</li>
<li>§lẨn các layer bị che hoàn toàn§r (nếu có)</li>
<li>Tự gom các layer có tên biểu cảm/emote thành §lnhóm biểu cảm§r và §lemote§r</li>
</ul>
<p>Xong sẽ hiện hộp §lKết quả tự rig§r:</p>

![Hộp Kết quả tự rig liệt kê biểu cảm mắt, biểu cảm miệng, emote, layer đứng yên và 13 khớp đã tạo](/post/photo/ezymaker-ket-qua-tu-rig-mvvl6f1t-mvvm2w30.webp)

<p>Cách đọc hộp này với nhân vật demo:</p>
<ul>
<li>§aPhát hiện biểu cảm mắt: Bình thường, Vui§r và §aPhát hiện biểu cảm miệng: Bình thường, Cười§r: nhờ tên layer §eirides_happy§r và §emouth_smile§r</li>
<li>§aPhát hiện 1 emote: Trái tim§r: nhờ layer §eemote_heart§r</li>
<li>§e2 layer đứng yên (legwear, footwear)§r: chân và giày không có khớp nên không chuyển động. Muốn chúng động thì dùng §lGắn vào khớp§r ở mục 5</li>
<li>§aĐã tạo 13 khớp§r: torso, neck, head, hair_back, hair_front, eyeR, eyeL, browL, browR, mouth, armR, armL, skirt</li>
</ul>
<p>Nếu có layer bị che hoàn toàn, hộp sẽ có thêm dòng §lĐã ẩn ... layer bị che hoàn toàn§r. Layer bị ẩn vẫn còn trong danh sách, bạn bật lại bằng biểu tượng 👁 nếu cần. Bấm Esc hoặc đóng hộp để tiếp tục.</p>
<p>Giờ bấm §l▶ Xem thử§r (mục 10) ngay để xem model đã nhúc nhích chưa. Nếu ổn, các mục 5 đến 9 là để làm mịn và bổ sung.</p>

<hr>

<h2>5. Kiểm tra và chỉnh layer</h2>

<h3>Chọn và di chuyển layer</h3>
<ul>
<li>§lBấm lên nhân vật§r trên canvas để chọn layer (app chọn theo pixel, bấm đúng chỗ có hình). Hoặc bấm tên trong danh sách</li>
<li>§lCtrl hoặc Shift + bấm§r, hoặc §lkéo khung§r trên vùng trống để chọn nhiều layer</li>
<li>§lAlt + bấm§r để chọn layer nằm §ldưới§r layer đang ở trên cùng (hữu ích khi tóc che mất layer cần chọn)</li>
<li>§lKéo§r layer để di chuyển. §lPhím mũi tên§r nhích 1px, §lShift + mũi tên§r nhích 10px</li>
<li>Tick §lLàm mờ layer khác§r để dễ nhìn layer đang chọn. Thanh lọc phía trên danh sách giúp tìm theo tên hoặc khớp</li>
<li>§lCtrl+Z§r hoàn tác, §lCtrl+Y§r làm lại</li>
</ul>

<h3>Đổi thứ tự chồng lớp, ẩn, xoá</h3>
<ul>
<li>§lKéo thả§r trong danh sách để đổi thứ tự chồng lớp. Hoặc dùng các nút §l▲ ▼ ⤒ ⤓§r (lên một bậc, xuống một bậc, lên trên cùng, xuống dưới cùng)</li>
<li>§l👁§r ẩn/hiện layer. §cLayer đang ẩn sẽ không được xuất ra model§r</li>
<li>§l🗑§r hoặc phím §eDelete§r để xoá layer đã chọn</li>
<li>§l🔍 Tìm layer bị che§r: app tự chọn các layer bị che hoàn toàn (không bao giờ nhìn thấy). Nếu không có, thanh trạng thái báo "Không có layer nào bị che hoàn toàn"</li>
</ul>

<h3>Tab Layer bên phải</h3>
<p>Chọn một layer rồi mở tab §lLayer§r ở bên phải. Ví dụ chọn layer §eface§r (mặt):</p>

![Tab Layer bên phải khi chọn layer face, ô Gắn vào khớp là head và Điều kiện hiển thị là Luôn hiện](/post/photo/ezymaker-tab-layer-gan-khop-dieu-kien-hien-mvvl6iv9-mvvm3u24.webp)

<ul>
<li>§lTên (id)§r: tên định danh của layer trong model</li>
<li>§lX, Y§r: vị trí layer trên canvas, kèm kích thước sau khi cắt gọn</li>
<li>§l1. Gắn vào khớp§r: layer đi theo khớp nào. Mặt gắn vào §ehead§r nên đầu xoay thì mặt xoay theo</li>
<li>§l2. Điều kiện hiển thị§r gồm bốn lựa chọn: §lLuôn hiện§r, §lChỉ hiện khi đang nói§r, §lChỉ hiện khi KHÔNG nói§r, §lChỉ hiện khi bật emote§r. Phần này dùng cho miệng và emote (mục 7, 8)</li>
</ul>

<hr>

<h2>6. Khớp và chuyển động (phần cốt lõi của rig)</h2>

<h3>Cây khớp</h3>
<p>Bấm tab §lKhớp§r bên trái. Các khớp xếp thành §lcây§r: khớp con đi theo khớp cha. Ví dụ §etorso§r (thân) là cha của §eneck§r (cổ), cổ là cha của §ehead§r (đầu), đầu là cha của tóc, mắt, mày, miệng. Nghĩa là §lđầu nghiêng thì tóc, mắt, miệng nghiêng theo§r, giống người thật.</p>
<ul>
<li>§l＋ Khớp mới§r tạo khớp mới</li>
<li>§l⬇ Gắn layer vào khớp§r gắn các layer đang chọn vào khớp đang chọn</li>
<li>§lKéo khớp thả lên khớp khác§r để đổi khớp cha</li>
<li>§l☑ Chọn các layer của khớp§r chọn nhanh toàn bộ layer thuộc khớp. §l🗑 Xoá khớp§r xoá khớp</li>
</ul>

![Tab Khớp ở bên trái hiển thị cây khớp, đang chọn khớp head và chấm pivot màu đỏ trên canvas](/post/photo/ezymaker-cay-khop-va-chi-diem-pivot-mvvl6g06-mvvm4jol.webp)

<h3>Pivot là gì?</h3>
<p>§lPivot§r là §ađiểm xoay§r của khớp. Số 3 trong ảnh là pivot của khớp §ehead§r (chấm đỏ là khớp đang chọn, chấm vàng là các khớp khác). Pivot của đầu nên đặt ở §lcổ§r, vì đầu xoay quanh cổ. Pivot của tóc đặt ở §lchân tóc§r. Đặt sai chỗ thì đầu xoay trông như đang trượt.</p>
<ul>
<li>§lKéo chấm trên canvas§r để dời pivot</li>
<li>Hoặc nhập số vào ô §lPivot X§r và §lPivot Y§r trong tab Khớp bên phải</li>
<li>Tick §lKhớp§r ở thanh công cụ canvas nếu bạn không thấy các chấm</li>
</ul>

<h3>Các nhóm thông số của một khớp</h3>
<p>Chọn một khớp (ví dụ §ehead§r), tab §lKhớp§r bên phải hiện các nhóm sau:</p>

![Tab Khớp bên phải gồm Khớp cha, Pivot X Y, Góc xoay mặc định, Theo chuột, Khi nói, Nhịp thở](/post/photo/ezymaker-tab-khop-pivot-theo-chuot-khi-noi-nhip-tho-mvvl6gyj-mvvm59dt.webp)

<ol>
<li>§lKhớp cha§r: khớp mà khớp này đi theo</li>
<li>§lPivot X / Pivot Y§r: điểm xoay</li>
<li>§lGóc xoay mặc định§r (độ, dương là xoay thuận chiều kim đồng hồ): dùng để §lnắn thẳng§r đầu nếu ảnh gốc bị nghiêng. Tự rig đã lo giúp, thường để trống</li>
<li>§lTheo chuột§r (giá trị khi chuột lệch hết cỡ): §lDịch X§r, §lDịch Y§r (px) và §lXoay§r (độ). Đầu hay mắt có giá trị lớn hơn thân nên trông như "nhìn" theo chuột</li>
<li>§lKhi nói§r (âm lượng tối đa): §lDịch Y§r (px) và §lGiãn dọc§r. Giá trị §lâm§r của Dịch Y nghĩa là nảy §llên§r khi nói</li>
<li>§lNhịp thở§r: §lDịch Y§r và §lGiãn dọc§r, nhẹ nhàng lên xuống khi đứng yên</li>
</ol>
<p>Giá trị mặc định tự rig đặt (với nhân vật cao khoảng 1000px, và tự co theo chiều cao nhân vật của bạn), mình lấy từ chính app làm mốc §7(giá trị gợi ý, không phải bắt buộc)§r:</p>
<ul>
<li>§lĐầu (head):§r xoay theo chuột §e3,5°§r, dịch X §e2,4px§r, dịch Y §e3,9px§r; nảy khi nói §e-1,5px§r; thở §e-0,8px§r</li>
<li>§lThân (torso):§r xoay theo chuột §e0,8°§r; nảy khi nói §e-2,5px§r; thở §e-0,6px§r</li>
<li>§lMiệng:§r theo chuột dịch X §e0,9px§r, dịch Y §e1,8px§r</li>
</ul>

<h3>Lò xo: tóc, tay áo và váy đung đưa</h3>
<p>Để tóc đung đưa có quán tính (đầu quay trước rồi tóc mới "đuổi theo"), app dùng §llò xo§r. Chọn khớp tóc (ví dụ §ehair_back§r) và nhìn xuống nhóm §lLò xo xoay§r:</p>

![Nhóm Lò xo xoay và Lò xo dọc của khớp hair_back với Bám theo tín hiệu, Độ mạnh, Hệ số tín hiệu, Độ cứng, Giảm chấn](/post/photo/ezymaker-lo-xo-dung-dua-toc-mvvl6hww-mvvm5xnd.webp)

<ol>
<li>§lLò xo xoay (đung đưa có quán tính)§r: tick để bật</li>
<li>§lBám theo tín hiệu§r: tóc đuổi theo chuyển động nào. Với tóc là §lGóc xoay của head§r</li>
<li>§lĐộ mạnh§r và §lHệ số tín hiệu§r: đung đưa nhiều hay ít. Mặc định tóc sau là §e1,3§r</li>
<li>§lĐộ cứng§r (cao = lắc nhanh) và §lGiảm chấn§r (cao = nhanh dừng). Mặc định tóc sau là §e70§r và §e7§r</li>
<li>§lLò xo dọc (nhún lên xuống)§r: tương tự nhưng cho chuyển động lên xuống</li>
</ol>
<p>Muốn lắc nhiều hơn thì tăng §lĐộ mạnh§r. Muốn dừng nhanh hơn thì tăng §lGiảm chấn§r. Tóc trước, tay áo, váy dùng cùng cách này với giá trị mặc định riêng. §7Mẹo: chỉnh nhỏ từng chút rồi bấm ▶ Xem thử để thấy ngay, đừng chỉnh nhiều thứ cùng lúc.§r</p>

<hr>

<h2>7. Mắt và miệng</h2>

<h3>Chớp mắt</h3>
<p>App chớp mắt bằng hai cách, tuỳ layer:</p>
<ul>
<li>Layer §lmắt§r (tròng, lòng trắng): tick §lÉp dẹt khi chớp (mắt)§r. Mắt bị ép dẹt xuống khi chớp</li>
<li>Layer §lmi mắt§r: nhập số px vào §lHạ xuống khi chớp (px) — mi mắt§r. Mi hạ xuống che mắt</li>
</ul>

![Layer irides_l đã gắn khớp eyeL, tick Ép dẹt khi chớp và ô Hạ xuống khi chớp](/post/photo/ezymaker-chop-mat-ep-det-ha-mi-mvvl6jtm-mvvm760n.webp)

<p>Bạn không cần làm tay nếu tên layer chuẩn, tự rig đã cài sẵn. Có thể dùng §lPreset nhanh§r ở cuối tab Layer: §l👁 Mắt§r (ép dẹt khi chớp) và §l〰 Mi mắt§r (hạ mi). §cChỉ gắn hiệu ứng chớp cho mắt ở trạng thái gốc§r (bình thường), không gắn cho mắt cười hay mắt nhắm.</p>

<h3>Miệng đóng và miệng mở</h3>
<p>Nhép miệng chỉ cần hai layer cùng gắn vào một khớp §emouth§r:</p>
<ul>
<li>§lMiệng đóng:§r §lĐiều kiện hiển thị§r = §lChỉ hiện khi KHÔNG nói§r (preset §l😶 Miệng đóng§r)</li>
<li>§lMiệng mở:§r §lChỉ hiện khi đang nói§r (preset §l👄 Miệng mở§r), kèm tick §lBật co giãn theo âm lượng§r</li>
</ul>

![Layer mouth_open gắn khớp mouth, chỉ hiện khi đang nói, bật co giãn theo âm lượng với các ô Ngang, Dọc và Gốc co giãn](/post/photo/ezymaker-mieng-mo-co-gian-theo-giong-noi-mvvl6krz-mvvm7sqz.webp)

<p>Khi bật co giãn, miệng mở to nhỏ theo độ lớn giọng nói. Có bốn ô điều khiển (số 3) và gốc co giãn (số 4):</p>
<ul>
<li>§lNgang: nhỏ nhất§r và §lNgang: thêm khi to§r (mặc định §e0,8§r và §e0,3§r): bề ngang lúc nói khẽ và phần nở thêm khi nói lớn</li>
<li>§lDọc: nhỏ nhất§r và §lDọc: thêm khi to§r (mặc định §e0,35§r và §e0,65§r): miệng nói khẽ chỉ mở hé, nói lớn thì mở hết cỡ</li>
<li>§lGốc co giãn X, Y (0–1)§r (mặc định §e0,5§r và §e0§r): điểm cố định khi co giãn. Y = 0 là §lmép trên§r đứng yên, miệng mở xuống dưới</li>
</ul>
<p>Muốn gỡ hiệu ứng khỏi layer thì bấm §l✕ Xoá hiệu ứng§r.</p>

<hr>

<h2>8. Biểu cảm và emote (tab Biểu cảm)</h2>

<h3>Khái niệm</h3>
<ul>
<li>§lNhóm§r (ví dụ §lMắt§r, §lMiệng§r) chứa nhiều §ltrạng thái§r (Bình thường, Vui, Cười...). §lMỗi lúc chỉ có một trạng thái§r của nhóm được hiện</li>
<li>§lEmote§r là hiệu ứng bật/tắt §ođộc lập§r (trái tim, giọt mồ hôi...)</li>
<li>Nếu layer đã đặt tên chuẩn (mục 1) thì bước §l🧩§r đã tạo sẵn phần lớn. Bạn chỉ cần kiểm tra lại</li>
</ul>

![Tab Biểu cảm hiển thị Nhóm Mắt, Nhóm Miệng, các nút thêm nhóm và mục Emote](/post/photo/ezymaker-tab-bieu-cam-nhom-trang-thai-emote-mvvl6mop-mvvm8non.webp)

<h3>Tạo và sửa nhóm, trạng thái</h3>
<ol>
<li>Ô §lChỉ hiện layer đúng trạng thái đã chọn bên dưới§r: bật khi thiết kế từng trạng thái, canvas chỉ hiện đúng layer của trạng thái đó</li>
<li>Mỗi hàng trạng thái có: §l★§r đặt làm §lmặc định§r, ô tên, §lsố§r = số layer đang gắn, §l⬇§r gán layer đang chọn vào trạng thái, §l☑§r chọn các layer của trạng thái, §l✕§r xoá</li>
<li>Ô §lTên trạng thái mới (vd: Cười, Nhắm mắt)…§r rồi bấm §l＋§r để thêm trạng thái</li>
<li>Các nút §l＋ Nhóm Mắt§r, §l＋ Nhóm Miệng§r, §l＋ Nhóm khác…§r để tạo nhóm. Giới hạn: §e8§r nhóm, mỗi nhóm §e32§r trạng thái</li>
<li>§lEmote§r: nhập tên vào ô §lTên emote mới§r rồi §l＋§r. Mỗi emote có §ltự tắt (giây)§r (để 0 là không tự tắt), §lnhóm§r (các emote cùng nhóm loại trừ lẫn nhau) và nút §l⬇ Gán layer đang chọn§r. Tối đa §e32§r emote</li>
</ol>

<h3>Cho layer thuộc trạng thái nào</h3>
<p>Chọn một hoặc nhiều layer (Ctrl + bấm), xuống mục §lHiển thị theo biểu cảm / emote§r trong tab Layer và tick các trạng thái được phép hiện. §lKhông tick gì = luôn hiện§r. Ví dụ dưới đây là hai layer lông mày, mình tick thêm trạng thái §lVui§r để khi nhân vật cười thì lông mày vẫn còn:</p>

![Hai layer lông mày được chọn, mục Hiển thị theo biểu cảm có Nhóm Mắt với Bình thường và Vui được tick](/post/photo/ezymaker-tick-trang-thai-vui-cho-long-may-mvvl6lqc-mvvm9lca.webp)

<p>Bật ô §lChỉ hiện layer đúng trạng thái§r và chọn trạng thái §lVui§r là thấy ngay kết quả: mắt cười, lông mày còn, lòng trắng và mi mắt biến mất.</p>

![Canvas khi bật chỉ hiện layer đúng trạng thái Vui, nhân vật cười nhắm mắt](/post/photo/ezymaker-xem-canvas-theo-trang-thai-vui-mvvl6nn2-mvvma60h.webp)

<h3>Quy tắc thiết kế để khỏi mất mắt, mất miệng</h3>
<ul>
<li>§lLayer da/mặt không gắn§r vào trạng thái nào, để luôn hiện</li>
<li>§cMỗi trạng thái phải có ít nhất 1 layer§r, nếu không mắt hoặc miệng sẽ §ctrống§r khi chọn trạng thái đó</li>
<li>Hiệu ứng chớp mắt chỉ gắn cho trạng thái §lgốc§r</li>
<li>Trạng thái §lCười§r của miệng trong demo chỉ có miệng đóng. Muốn nhép miệng khi đang cười thì cần thêm layer kiểu §emouth_smile_open§r</li>
</ul>
<p>§7Phím tắt đổi biểu cảm và bật emote được gán §lbên trong Ezy Tuber§r§7, không phải trong Ezy Maker (xem mục 12).§r</p>

<hr>

<h2>9. Tab Model</h2>
<p>Tab §lModel§r bên phải chứa các cài đặt chung khi xuất:</p>

![Tab Model với Tên model, Định dạng ảnh khi xuất, Tự sinh thanh kéo tinh chỉnh, Khung xuất tự tính và lề](/post/photo/ezymaker-tab-model-ten-dinh-dang-khung-xuat-mvvl6olf-mvvmasol.webp)

<ol>
<li>§lTên model§r (cũng là tên thư mục khi xuất)</li>
<li>§lĐịnh dạng ảnh khi xuất§r: §lPNG (chính xác, file lớn hơn)§r hoặc §lWebP chất lượng cao (nhỏ hơn)§r. Muốn đẹp tuyệt đối thì chọn PNG, muốn file nhẹ thì WebP</li>
<li>§lTự sinh thanh kéo tinh chỉnh từ các khớp§r: tạo ra tab Tinh chỉnh trong Ezy Tuber (mục 12). Bỏ tick nếu không muốn</li>
<li>§lKhung xuất (crop)§r: tick §lTự tính theo layer + lề§r thì app tự tính khung bao quanh nhân vật. Khung hiện tại trong demo là §e456×1025§r</li>
<li>§lLề trên§r và §lLề hai bên§r (demo là §e28§r và §e20§r px): chừa chỗ để §lđầu nảy lên§r và §ltóc/tay áo đung đưa§r không bị cắt mất ở mép khung</li>
</ol>
<p>Cuối tab còn có phần §lThống kê§r: số layer sẽ xuất, số khớp, kích thước canvas gốc.</p>

<hr>

<h2>10. ▶ Xem thử</h2>
<p>Bấm §l▶ Xem thử§r. App chạy §lđúng engine của Ezy Tuber§r nên những gì thấy ở đây chính là kết quả cuối. Nút đổi thành §l✎ Quay lại chỉnh sửa§r (hoặc bấm Esc) để trở về.</p>

![Chế độ Xem thử với nhân vật nhắm mắt cười, bật trái tim, bên phải là bảng Giả lập giọng nói và biểu cảm](/post/photo/ezymaker-xem-thu-vui-cuoi-trai-tim-mvvl6pjs-mvvn8qfx.webp)

<ol>
<li>§lÂm lượng (nói)§r: kéo thanh để giả lập giọng nói, miệng mở theo. Có ô §lTự nói liên tục§r, §lBật emote§r, §lTự chớp mắt§r và nút §l👁 Chớp ngay§r</li>
<li>§lBiểu cảm &amp; Emote§r: chọn trạng thái §lMắt§r, §lMiệng§r và tick emote (ví dụ §lTrái tim§r) để thử</li>
<li>§lMức chuyển động (nhân chung)§r: bốn thanh §lTheo chuột§r, §lNảy khi nói§r, §lNhịp thở§r, §lĐung đưa tóc/tay/váy§r. Đây là thanh nhân chung, kéo lên là mọi khớp mạnh hơn, giống tab Tinh chỉnh trong Ezy Tuber</li>
</ol>
<p>Cuối bảng có §lNền xem thử§r: §lMàu nền§r gồm Tối, Xanh lá, Xanh dương, Hồng, Sáng, Ca rô hoặc §l🖼 Ảnh từ máy…§r. Bạn cũng kéo thả ảnh vào khung để làm nền. Ảnh nền chỉ để xem, §lkhông đưa vào model§r.</p>

<h3>Checklist kiểm tra trước khi xuất</h3>
<ul>
<li>§lDi chuột§r: đầu có xoay riêng khỏi thân và cổ không?</li>
<li>§lTóc, tay áo, váy§r có đung đưa quá đà hoặc cứng đơ không?</li>
<li>§lKéo Âm lượng§r: miệng có mở theo tiếng và đóng lại khi im không?</li>
<li>§lChớp ngay§r: mắt có chớp gọn, mi có hạ đúng chỗ không?</li>
<li>§lChọn từng biểu cảm§r: mắt và miệng có hiện đủ, không bị trống không?</li>
<li>§lBật từng emote§r: hiện đúng chỗ, có tự tắt đúng giờ không?</li>
<li>Đầu, tóc có bị §lcắt ở mép khung§r không? Nếu có, tăng §lLề§r ở tab Model</li>
</ul>

<hr>

<h2>11. 📦 Xuất zip</h2>
<p>Hài lòng rồi thì bấm §l📦 Xuất zip§r, chọn nơi lưu trong hộp thoại. Thanh trạng thái báo kết quả:</p>

![Thanh trên có nút Xuất zip và thanh trạng thái báo Đã xuất Shikiri.zip cùng số layer, khớp, thanh kéo, nhóm biểu cảm, emote](/post/photo/ezymaker-xuat-zip-thanh-cong-mvvl6qi5-mvvmc0wt.webp)

<p>Thông báo ghi §a✔ Đã xuất ... giải nén thư mục "Shikiri" vào thư mục model của Ezy Tuber§r, kèm số liệu của model (demo: 28 layer, 13 khớp, 42 thanh kéo, 2 nhóm biểu cảm, 1 emote).</p>

<h3>Bên trong file zip</h3>
<ul>
<li>§eShikiri/model.json§r: toàn bộ thông tin rig (khớp, chuyển động, biểu cảm, khung xuất...)</li>
<li>§eShikiri/settings.json§r: cài đặt riêng của model (tên, phím chuyển model, cỡ model, thanh kéo, phím biểu cảm)</li>
<li>§eShikiri/assets/layer/§r: các layer đã cắt gọn, tên có số thứ tự (ví dụ §e000_back_hair.png§r)</li>
<li>§eShikiri/assets/emo/§r: layer chỉ hiện khi nói hoặc khi bật emote (ví dụ §emouth_open.png§r)</li>
</ul>
<p>§cLưu ý tên model:§r tên không được chứa ký tự cấm của Windows (như §e&lt; &gt; : " / \ | ? *§r). App tự thay chúng khi đặt tên thư mục và giới hạn tối đa 60 ký tự, nhưng cứ đặt tên đơn giản cho an toàn.</p>

<h3>Mở lại để sửa tiếp</h3>
<p>Bấm §l📂 Nhập model để chỉnh sửa§r và chọn file zip hoặc thư mục model đã làm (kể cả thư mục trong §emodel/§r của Ezy Tuber). App giữ nguyên layer, khớp, chuyển động, thanh kéo và §esettings.json§r. Lưu ý app sẽ hỏi vì việc mở model §lthay thế dự án hiện tại§r (phần chưa xuất sẽ mất).</p>

<hr>

<h2>12. Đưa model vào Ezy Tuber và dùng</h2>

<h3>Nhập model</h3>
<ol>
<li>Mở §lEzy Tuber§r, bấm §lWin + F12§r để mở cửa sổ §lCài đặt§r. §7(Luôn có phím dự phòng §lCtrl + Alt + F12§r§7, phòng khi quên phím đã gán.)§r</li>
<li>Vào tab §l🧍 Model§r, bấm §l📥 Import model (.zip)§r và chọn file zip vừa xuất. Có thể kéo thả file zip vào tab này. App tự tìm đúng thư mục model trong zip</li>
<li>Thông báo §a✔ Đã import 1 model: Shikiri§r hiện ra. Bấm §lDùng§r ở model muốn chuyển sang. Model đang dùng có nhãn §lĐANG DÙNG§r</li>
</ol>

![Tab Model của Ezy Tuber với nút Import model, thông báo import thành công, nhãn ĐANG DÙNG và ô gán phím chuyển model](/post/photo/ezytuber-tab-model-import-zip-mvvl6rgi-mvvnrhs1.webp)

<p>Cách thủ công: giải nén thư mục §eShikiri§r vào thư mục §emodel\§r cạnh §eEzyTuber.exe§r, rồi bấm §l🔄 Quét lại§r. Nút §l📂 Mở thư mục model§r mở nhanh thư mục này. Mỗi model có ô phím riêng để chuyển nhanh sang nó (kể cả khi đang chơi game).</p>

<h3>Gán phím cho biểu cảm và emote</h3>
<p>Vào tab §l😀 Biểu cảm§r. Mỗi trạng thái và emote có nút §lChọn§r (hoặc §lBật§r) và ô phím. Bấm vào ô phím rồi nhấn tổ hợp phím bạn muốn. Với ví dụ bên dưới mình gán §lCtrl + Alt + 2§r cho mắt Vui và §lCtrl + Alt + 1§r bật trái tim §7(phím ở ảnh chỉ là ví dụ, bạn gán phím nào cũng được)§r.</p>

![Tab Biểu cảm của Ezy Tuber, nhóm Mắt và Miệng với nút Chọn, emote Trái tim có nút Bật và ô gán phím](/post/photo/ezytuber-tab-bieu-cam-gan-phim-mvvl6sev-mvvmjnni.webp)

<ul>
<li>Phím phải kèm §lCtrl / Alt / Shift / Win§r. Riêng §lF1 đến F24§r thì dùng một mình được</li>
<li>§lEsc§r để huỷ gán, §lBackspace§r để xoá phím</li>
<li>Bấm lại phím của biểu cảm đang bật là §lvề mặc định§r. Emote có thể tự tắt sau vài giây nếu bạn đặt ở Maker</li>
<li>Mỗi model có bộ phím riêng. Nút §lĐặt lại§r đưa mọi thứ về mặc định và tắt hết emote</li>
</ul>

<h3>Tinh chỉnh chuyển động</h3>
<p>Tab §l🎛️ Tinh chỉnh§r có các thanh kéo để chỉnh chuyển động riêng cho từng model, thay đổi áp dụng và lưu ngay. Thanh kéo này được sinh tự động từ các khớp (nhờ tick ở mục 9).</p>

![Tab Tinh chỉnh của Ezy Tuber với hàng Cài sẵn Nhẹ Vừa Mạnh, các nhóm thanh kéo và nút đặt lại](/post/photo/ezytuber-tab-tinh-chinh-thanh-keo-mvvl6td8-mvvmn08s.webp)

<ul>
<li>§lCài sẵn:§r ba nút §l😌 Nhẹ§r, §l🙂 Vừa (mặc định)§r, §l😆 Mạnh§r chỉnh nhanh bốn thanh nhân chung</li>
<li>Các nhóm §lTheo dõi chuột &amp; phản hồi§r, §lĐầu &amp; cổ§r, §lMắt &amp; miệng§r, §lThân &amp; nảy khi nói§r, §lTóc§r, §lTay áo &amp; váy§r để chỉnh chi tiết</li>
<li>Nút §l↺§r cạnh từng thanh trả thanh đó về mặc định, nút §l↺ Đặt lại tất cả thanh kéo về mặc định§r ở cuối</li>
</ul>

<h3>Tab Cơ bản, kéo di chuyển và OBS</h3>

![Tab Cơ bản của Ezy Tuber gồm Micro, Độ nhạy mic, Nền, Cỡ model và Phím mở Cài đặt](/post/photo/ezytuber-tab-co-ban-nen-co-model-mvvl6ubl-mvvmooab.webp)

<ul>
<li>§l🎤 Bật mic§r và §lĐộ nhạy mic§r: để model mở miệng theo giọng nói của bạn</li>
<li>§lNền§r: §lTrong suốt (alpha)§r, §lNền xanh lá (chroma)§r, xanh dương, hồng, tối hoặc sáng. §lCỡ model§r lưu riêng cho từng model</li>
<li>Cửa sổ model không có thanh tiêu đề: §lkéo thả thân nhân vật§r để di chuyển, vị trí được nhớ cho lần sau</li>
<li>Nút §lThoát ứng dụng§r nằm trong cửa sổ Cài đặt</li>
</ul>
<p>§lDùng với OBS:§r thêm nguồn §lWindow Capture§r (Windows 10 bản 1903 trở lên) và chọn cửa sổ §lEzy Tuber§r. Model vẫn chạy khi bị che. Nền §lTrong suốt§r sẽ có alpha. Nếu OBS không lấy được alpha, chọn §lNền xanh lá§r trong Cài đặt rồi dùng bộ lọc §lChroma Key§r. Nếu máy báo CPU cao, vào tab Cơ bản: đặt §lNhịp thở§r thành §lTiết kiệm§r hoặc §lTắt§r, hoặc giảm §lFPS§r xuống.</p>

<hr>

<h2>13. Lỗi thường gặp</h2>

<h3>Tất cả layer bị chồng ở góc trên trái</h3>
<p>Đây là lỗi hay gặp nhất. Nguyên nhân: các layer đã bị §lcắt gọn§r (mỗi ảnh chỉ vừa khít phần có hình) và §lkhông có layers.json§r nên app không biết mỗi mảnh nằm ở đâu. Thanh trạng thái sẽ báo màu vàng: §e"⚠ ... ảnh có kích thước khác canvas và không có vị trí — được đặt ở góc trên trái"§r.</p>

![Nhập layer đã cắt gọn và không có vị trí nên các mảnh chồng lên nhau ở góc, thanh trạng thái hiện cảnh báo màu vàng](/post/photo/ezymaker-loi-layer-chong-goc-tren-trai-mvvl6e3g-mvvmp6ua.webp)

<ul>
<li>§lCách sửa:§r xuất lại layer §lKHÔNG cắt§r, mọi ảnh cùng kích thước canvas. Hoặc kèm file §elayers.json§r chứa vị trí từng layer</li>
<li>Ảnh trên là bộ layer Shikiri gốc (đã cắt gọn, không có layers.json) khi nhập thẳng vào app. Để làm bài này, mình đã xếp từng mảnh vào canvas 1024×1024 theo đúng vị trí gốc trong model mẫu. Lưu ý tên model lúc này có thể bị đặt theo tên thư mục (ở đây là “emo”), nhớ đổi lại ô Tên model</li>
</ul>

<h3>Layer đã có nhưng không thấy trên model</h3>
<ul>
<li>Layer bị §lẩn§r (👁): bật lại, vì layer ẩn không được xuất</li>
<li>Layer bị §ltự rig ẩn§r vì bị che hoàn toàn: xem hộp Kết quả tự rig hoặc dùng §l🔍 Tìm layer bị che§r. Nên nhớ thứ tự chồng lớp quyết định ai che ai. Ví dụ layer miệng mở nằm §ldưới§r layer mặt thì bị mặt che hết, nên sẽ bị coi là bị che</li>
<li>Layer được gán vào trạng thái biểu cảm chưa được chọn: kiểm tra ô §lHiển thị theo biểu cảm / emote§r</li>
</ul>

<h3>Mắt hoặc miệng bị trống khi đổi biểu cảm</h3>
<ul>
<li>Trạng thái đó §lchưa có layer nào§r (số ở hàng trạng thái là 0). Dùng ⬇ để gán layer</li>
<li>Trạng thái Vui mà lông mày, mi mắt vẫn mất: các layer đó chỉ được tick cho trạng thái Bình thường. Tick thêm Vui ở mục §lHiển thị theo biểu cảm / emote§r (xem mục 8)</li>
</ul>

<h3>Miệng không mở theo tiếng</h3>
<ul>
<li>Thiếu layer §lmiệng mở§r hoặc nó không có điều kiện §lChỉ hiện khi đang nói§r</li>
<li>Miệng đóng và miệng mở chưa gắn §lcùng một khớp§r mouth</li>
<li>Khi xem thử, hãy kéo thanh §lÂm lượng (nói)§r, vì không có tiếng thì miệng không mở</li>
</ul>

<h3>Đầu hoặc tóc bị cắt ở mép khung</h3>
<ul>
<li>Tăng §lLề trên§r và §lLề hai bên§r ở tab Model rồi xuất lại</li>
<li>Bật lại ô §lKhung xuất§r ở thanh công cụ canvas để nhìn khung nét đứt, rồi kiểm tra trong §l▶ Xem thử§r khi kéo âm lượng và di chuột mạnh</li>
</ul>

<h3>Thông báo lỗi khi nhập hoặc xuất</h3>
<ul>
<li>§c"layers.json bị lỗi cú pháp — bỏ qua, dùng thứ tự theo tên file"§r: file §elayers.json§r sai định dạng, app bỏ qua nó. Sửa lại file hoặc đặt tên theo số thứ tự</li>
<li>§c"model.json bị lỗi cú pháp"§r hoặc §c"model.json không hợp lệ: thiếu sprites"§r: khi mở model, file model.json trong zip hỏng hoặc không phải model của Ezy Maker</li>
<li>§c"Không tìm thấy ảnh nào của model (kiểm tra thư mục assets)"§r: zip thiếu thư mục §eassets§r hoặc ảnh</li>
<li>§e"Chưa có layer nào để xuất."§r: chưa nhập layer hoặc đã ẩn hết. Nhập lại hoặc bật 👁</li>
<li>§c"Không xuất được: ..."§r: thường do không ghi được vào nơi đã chọn, thử lưu sang thư mục khác</li>
<li>Trong Ezy Tuber, model hỏng vẫn nằm trong tab §lModel§r kèm dòng §c⚠ Không dùng được: ...§r nêu lý do. Đọc dòng đó rồi sửa hoặc xuất lại từ Ezy Maker</li>
</ul>

<hr>

<h2>14. Kết bài</h2>
<p>Quy trình gói gọn là: §lchuẩn bị layer cùng canvas, đặt tên có nghĩa → nhập → 🧩 tự rig → kiểm tra và chỉnh → ▶ xem thử → 📦 xuất zip → import vào Ezy Tuber§r. Phần lớn công việc nặng đã do bước tự rig làm sẵn, bạn chỉ cần chỉnh những chỗ chưa vừa ý.</p>

<a href="https://moeshinn.github.io/product/ezy-model-free/" target="_blank" rel="noopener noreferrer">§aNhận model free (nếu tui có đăng bán)§r</a>
<br>
<a href="https://moeshinn.github.io/product/ezy-model-paid/" target="_blank" rel="noopener noreferrer">§cMua model trả phí (đang có sẵn, giá từ 45k-79k)§r</a>
<br>
<a href="https://moeshinn.github.io/product/ezy-model-commission/" target="_blank" rel="noopener noreferrer">§bCommission model Ezy Tuber: vẽ, tách layer, rig§r</a>

<hr>
§a§lChúc bạn có một model PNGTuber thật xinh!§r §oNếu làm theo mà gặp lỗi hoặc thấy bước nào chưa rõ, cứ để lại bình luận bên dưới, mình sẽ trả lời và cập nhật bài.§r
