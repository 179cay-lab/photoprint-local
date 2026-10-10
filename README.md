# 🖨️ PhotoPrint Local

Ứng dụng web chạy local chuyên dụng để dàn ảnh và in ảnh khổ chuẩn bằng máy in màu **Epson L8050** (hoặc các máy in phun màu thông dụng khác) trên khổ giấy **A4** và **A5**.

---

## ✨ Tính Năng Nổi Bật

1. **Khổ giấy linh hoạt**:
   - Chuyển đổi nhanh giữa **A4** (210 × 297 mm) và **A5** (148 × 210 mm).
   - Thước đo vật lý (Ruler) hiển thị chi tiết đơn vị mm và cm theo thời gian thực.

2. **Kích thước in chuẩn & tùy biến**:
   - Các kích thước thông dụng: **3×4 cm**, **4×6 cm** (hộ chiếu/visa), **5×7 cm**, **6×9 cm**, **9×12 cm**, **10×15 cm** (4R).
   - Nhập kích thước tùy biến theo mm hoặc cm.
   - Nhân bản số lượng bản in tự động (ví dụ: tạo ngay 4 hay 8 ảnh thẻ 3×4).

3. **Cắt ảnh thông minh (Crop Editor)**:
   - Tự động nhận diện khi tỷ lệ ảnh gốc khác với tỷ lệ in yêu cầu.
   - Khung cắt ảnh trực quan khóa đúng tỷ lệ mục tiêu.
   - Lưới 3×3 (Rule of Thirds) giúp căn mắt và bố cục ảnh thẻ/chân dung chuẩn xác.
   - Thanh trượt phóng to/thu nhỏ và nút căn giữa tiện lợi.

4. **Tự động xếp ảnh (Auto Layout Engine)**:
   - Xếp ảnh tự động theo hàng tối ưu diện tích giấy.
   - Lựa chọn khoảng cách giữa các ảnh: `0mm`, `2mm`, `3mm`, `5mm`.
   - Bật/tắt chế độ Snap canh lề.

5. **Bộ chỉnh màu sắc tối ưu in ấn**:
   - Độ sáng (Brightness), Tương phản (Contrast), Độ bão hòa (Saturation), Nhiệt độ màu (Temperature), Vùng sáng (Highlights), Vùng tối (Shadows).
   - Nút **"Tự tối ưu in"**: Tự động cân chỉnh bù độ tối và tăng tương phản nhẹ để khi in bằng mực Epson ra màu tươi sáng đúng như mắt nhìn.

6. **In ấn độ phân giải gốc & đường cắt hỗ trợ**:
   - Không bị vỡ hình do in trực tiếp từ dữ liệu ảnh gốc (Full Resolution).
   - Đường viền cắt siêu mỏng (Cutting guide) giúp dùng kéo hoặc dao rọc giấy cắt nhanh và thẳng hàng.
   - Hộp thoại **Xem trước (Print Preview)** trực quan trước khi in.

7. **Phím tắt tiện dụng**:
   - `Delete` / `Backspace`: Xóa ảnh đang chọn.
   - `Ctrl+Z` / `Cmd+Z`: Hoàn tác (Undo).
   - `Ctrl+Y` / `Cmd+Shift+Z`: Làm lại (Redo).
   - Phím mũi tên `←` `↑` `→` `↓`: Nhích vị trí ảnh 0.5mm (giữ `Shift` để nhích 2mm).
   - `Escape`: Bỏ chọn hoặc đóng hộp thoại.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Local

### 1. Khởi động ứng dụng
```bash
npm install
npm run dev
```

Mở trình duyệt truy cập: **`http://127.0.0.1:5173/`**

### 2. Build bản chạy offline tĩnh (nếu cần)
```bash
npm run build
npm run preview
```

---

## 🖨️ Hướng Dẫn Thiết Lập Khi In Trên Epson L8050

Khi nhấn nút **In (Print)**, trình duyệt sẽ mở hộp thoại in của hệ thống. Bạn cần chú ý thiết lập:

1. **Máy in**: Chọn máy in **Epson L8050 Series**.
2. **Khổ giấy (Paper Size)**: Chọn đúng **A4** hoặc **A5** (tương ứng với khổ đã chọn trên giao diện web).
3. **Tỷ lệ (Scale)**: **BẮT BUỘC CHỌN 100% (hoặc Actual size / Khổ thực tế)**.
   > ⚠️ *Tuyệt đối không chọn "Fit to printable area" (Vừa với vùng in) vì trình duyệt sẽ tự co nhỏ lại làm sai lệch số đo cm.*
4. **Lề (Margins)**: Chọn **Không có (None)** hoặc **Tối thiểu (Minimum)**.
5. **Chất lượng in & Loại giấy**:
   - Chọn loại giấy in: **Epson Premium Glossy** (nếu in ảnh bóng) hoặc **Matte Photo Paper**.
   - Chất lượng (Quality): **High (Cao)**.
