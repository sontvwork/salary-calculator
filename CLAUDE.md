# Dogosa — Công cụ tính lương xưởng gỗ

Tool tính lương tháng, host tĩnh trên GitHub Pages (repo `sontvwork/salary-calculator`, branch `main`, thư mục gốc). Chỉ có HTML/CSS/JS thuần, **không build, không npm, không CDN**: push lên `main` là Pages phục vụ luôn. Dữ liệu lưu trong `localStorage` của trình duyệt, không có server. Giao diện và comment viết bằng tiếng Việt.

## Cấu trúc
- `index.html` + `assets/luong.js`: trang Tính lương (4 bước: sản lượng → ngày công → giờ/tấm theo phân xưởng → bảng lương).
- `bang-luong.html` + `assets/bang-luong.js`: trang in bảng lương (A4 ngang). Vào từ nút "Xuất bảng lương" cuối trang Tính lương.
- `nhan-su.html` + `assets/nhan-su.js`: CRUD nhân sự.
- `assets/store.js`: hằng số, đọc/ghi localStorage, helper format. Tất cả gắn vào global `Dogosa`.
- `assets/calc.js`: `Dogosa.calculate()`, là **hàm thuần** (không đụng DOM). Mọi logic tính tiền đặt ở đây.
- `assets/styles.css`: style dùng chung, màu khai báo bằng biến CSS trong `:root`.

Thứ tự load script: `store.js` → `calc.js` → script của trang.

## Quy tắc nghiệp vụ (đã chốt với user)
- Có 4 phân xưởng cố định, khai báo trong `Dogosa.WORKSHOPS`: Cắt CNC 20%, Dán cạnh 20%, Khoan 20%, Đóng gói 40%. Dán cạnh đo bằng **giờ**, các phân xưởng còn lại đo bằng **tấm**.
- Lương cứng = ngày công × lương/ngày. Lương/ngày là số nguyên, đơn vị k (250 = 250.000đ).
- Tổng thưởng = số SP × mức thưởng (mặc định 10k, sửa được và lưu lại) → chia cho từng phân xưởng theo % → chia tiếp cho từng người theo tỷ lệ giờ/tấm. Phân xưởng chỉ có 1 người thì người đó nhận cả quỹ. Form nhập giờ/tấm chỉ hiện cho phân xưởng có từ 2 người trở lên.
- Thưởng chuyên cần không có công thức, người dùng nhập tay trên trang in (giống thưởng kéo gỗ). Trang Tính lương không hiện chuyên cần.
- Ngày công cho phép bước 0.5. Thưởng chia theo tỷ lệ được làm tròn đến 1.000đ. calc tính bằng đồng (k × 1000).
- Nhân sự có thể không thuộc phân xưởng nào. Quỹ của phân xưởng không có người, hoặc chưa ai nhập giờ/tấm, thì không chia được và phải hiện cảnh báo.
- Nút "Xuất bảng lương" chỉ bấm được khi có ít nhất 1 người có ngày công > 0. Nếu còn cảnh báo chia thưởng (`r.warnings`) thì báo lỗi, không chuyển trang.
- Trang in: chỉ in người có ngày công > 0, mọi số tiền hiển thị dạng k. Thưởng chuyên cần, thưởng kéo gỗ, thưởng lễ tết, trừ lỗi do người dùng nhập (số nguyên, đơn vị k), khai báo trong `Dogosa.EXTRAS`. Tổng in = `row.net` = lương cứng + thưởng SP + chuyên cần + kéo gỗ + lễ tết − trừ lỗi.
- Chỉ có **1 bộ dữ liệu tháng hiện hành**, không lưu lịch sử theo tháng. Muốn sang tháng mới thì bấm "Làm mới dữ liệu tháng".

## localStorage (đổi schema thì phải giữ tương thích với dữ liệu đã lưu)
- `dogosa.employees`: `[{id, name (≤300 ký tự), dailyWage, workshops: ['cnc'|'edge'|'drill'|'pack']}]`
- `dogosa.nextId`: ID tự tăng, không dùng lại ID đã xoá.
- `dogosa.settings`: `{bonusPerProduct}`
- `dogosa.month`: `{products, workDays: {id: n}, participation: {wsKey: {id: n}}, extras: {attendance|wood|holiday|penalty: {id: n}}}`. Dữ liệu cũ không có `extras` thì `getMonth()` tự bù map rỗng.

## Lưu ý khi phát triển
- User mở qua GitHub Pages. Dữ liệu chỉ nằm trong trình duyệt đang dùng: đổi máy, đổi trình duyệt hoặc xoá dữ liệu duyệt web là mất. Không đổi tên repo/domain, vì localStorage gắn theo origin.
- Dùng đường dẫn tương đối (`assets/...`, `nhan-su.html`), không dùng `/` đầu, vì site nằm dưới `/salary-calculator/`.
- Trang Tính lương và trang in tách 2 hàm: `renderStructure()` vẽ lại các ô nhập (chỉ gọi khi nhân sự/settings đổi), `update()` chỉ cập nhật số liệu. Không được vẽ lại ô nhập mỗi lần gõ, nếu không input sẽ mất focus.
- Escape mọi text do người dùng nhập bằng `Dogosa.escapeHtml` trước khi chèn vào HTML.
- Test với Claude in Chrome: extension không mở được `file://`, nên chạy `python3 -m http.server` trên `127.0.0.1`. Code dùng `confirm()` → cần ghi đè `window.confirm` trước khi click Xoá/Làm mới, nếu không dialog sẽ chặn extension. Test xong thì xoá localStorage của origin test.
- Test riêng logic tính: load `store.js` + `calc.js` bằng `require()` trong Node rồi gọi `Dogosa.calculate()`.

## Việc sắp tới
Chưa làm xuất CSV và backup/restore.
