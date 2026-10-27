# Thư mục worker/

Bản lưu mã nguồn các Cloudflare Worker của website (dạng zip, giải nén ra để deploy bằng `wrangler`).

| File | Worker | Địa chỉ |
|---|---|---|
| `donate-api.zip` | `donate-api` (donate: SePay, QR, đăng nhập YouTube, alert OBS, số liệu admin) | `https://donate-api.git-api.workers.dev` |
| `admin-api.zip` | `admin-api` (backend `/admin`: GitHub, SEO AI, Telegram, sitemap, bán model) | `https://admin-api.git-api.workers.dev` |
| `counter-api.zip` | `n238` (bộ đếm lượt xem / tải, không đổi) | `https://n238.git-api.workers.dev` |

Mỗi zip có `README.md` riêng hướng dẫn deploy và danh sách secret cần đặt. Tên cũ `shinju-donate` / `shinju-admin-api` không còn dùng: sau khi chuyển xong hãy xoá Worker cũ trên Cloudflare, và xoá file `shinju-donate-update-login.zip` nếu còn.

Thư mục này bị chặn trong `robots.txt` (`Disallow: /worker/`).
