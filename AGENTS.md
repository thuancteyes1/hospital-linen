# Quy tắc phát triển Dự án Quản lý Đồ vải (Linen Management)

Tài liệu này chứa các quy tắc thiết kế hệ thống phân quyền và các ràng buộc nghiệp vụ quan trọng đã được thống nhất. Bất kỳ AI Agent nào khi thực hiện bảo trì, cập nhật hoặc sửa lỗi hệ thống này **bắt buộc** phải tuân thủ nghiêm ngặt các hướng dẫn dưới đây để tránh lặp lại các lỗi phân quyền cũ.

---

## 🔐 1. Quy tắc Phân quyền (Role & Permission Rules)

Hệ thống có các nhóm vai trò chính: **Hộ lý (Orderly/Housekeeping)**, **Điều dưỡng (Ward User)**, **Nhân viên Đồ vải / Đồ sạch Bệnh viện (Linen/Clean staff)**, và **Xưởng giặt (Company/Laundry)**.

### 🚫 Ràng buộc tuyệt đối:
1. **Góc nhìn Hộ lý / Điều dưỡng (Ward-level users) tuyệt đối không được phép:**
   - Thực hiện trả nợ đồ vải hoặc click bất kỳ nút bàn giao/trả sạch nào của Kho trung tâm / Nhân viên Đồ sạch (Mục 3: Giao nhận sạch khoa phòng).
   - Xác nhận nhận đồ sạch hoặc tạo phiếu trả nợ đối với các hóa đơn cấp khoa phòng nếu vai trò yêu cầu là người bàn giao đồ sạch.
   - Thao tác trên kho sạch hoặc phê duyệt giao dịch của xưởng giặt.
   - *Hộ lý / Điều dưỡng chỉ được thực hiện thao tác khai báo dơ của khoa phòng mình.*

2. **Góc nhìn Nhân viên Đồ vải Bệnh viện (Linen staff / Hospital staff) tuyệt đối không được phép:**
   - Duyệt hoặc click gửi trả đồ sạch từ công ty (Cty giặt) về kho sạch của bệnh viện (Mục 2/Mục 4: Công nợ xưởng công ty).
   - *Chỉ có tài khoản Xưởng giặt (Laundry) mới có quyền bấm khai báo / giao đồ vải sạch từ kho của công ty về kho sạch BV.*

3. **Quyền Quản lý Danh mục, Sửa/Xóa & Thay hình ảnh Đồ vải:**
   - Chỉ có duy nhất tài khoản **Quản trị viên (Admin)** và **Trưởng kho đồ vải** mới có quyền thêm mới, chỉnh sửa, xóa mặt hàng, thay đổi hình ảnh đại diện (tải ảnh/dán link) và cập nhật thông tin trong danh mục đồ vải.
   - Nhân viên đồ vải thông thường (Kho sạch), Điều dưỡng, Hộ lý và Xưởng giặt tuyệt đối không có quyền thay hình ảnh hay chỉnh sửa/xóa mặt hàng đồ vải.

---

## 🛠️ 2. Quy tắc Triển khai Mã nguồn (Coding Implementation Rules)

- **Hàm `checkPermission` trong `DeliveryFlow.tsx`**:
  - Hàm này phải kiểm tra chặt chẽ cả vai trò thực tế (`currentAccount`, `isOrderlyUser`, `effectiveIsWardUser`, v.v.) và vai trò đang giả lập (`simulatedRole`).
  - Nếu yêu cầu quyền `'linen'` hoặc `'clean'`, hàm phải luôn trả về `false` đối với bất kỳ tài khoản hoặc giả lập nào thuộc nhóm Hộ lý (`orderly`), Buồng phòng (`housekeeping`), hoặc Điều dưỡng (`ward`). Quyền hạn này chỉ dành riêng cho nhân viên quản lý đồ vải/đồ sạch bệnh viện.

- **Vô hiệu hóa hoặc ẩn nút (Disable / Hide UI controls)**:
  - Tất cả các nút bấm thực hiện hành động giao/nhận sạch, trả nợ cần được bọc bởi điều kiện phân quyền chính xác hoặc vô hiệu hóa (`disabled`) đi kèm thông báo trực quan.
