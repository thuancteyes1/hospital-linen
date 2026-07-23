/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LinenItem {
  ma: string;
  ten: string;
  nhom: string;
  kc: number; // Tồn kho chính
  kp: number; // Tồn khoa phòng (computed)
  mn: number; // Tồn tối thiểu
  hinhAnh?: string; // Link hình ảnh đồ vải
  trang?: string; // Trang in Bill tổng (VD: "Trang 1", "Trang 2", "Trang 3", "Trang 4")
}

export type DeptAllocation = [string, number]; // [DepartmentName, Quantity]

export interface Role {
  name: string;
  color: string;
  desc: string;
  perms: {
    nhap: boolean;
    thuhoi: boolean;
    xuat: boolean;
    huy: boolean;
    dc: boolean;
    dovai?: boolean;
  };
}

export interface User {
  name: string;
  email: string;
  role: number; // index in ROLES
  dept: string; // "Kho trung tâm", "NICU", "Gây mê hồi sức", "Tất cả", etc.
  status: 'active' | 'inactive';
}

export interface Account {
  username: string;
  email: string;
  password?: string;
  name: string;
  isAdmin: boolean;
  status: 'active' | 'inactive' | 'pending';
  userIdx: number;
}

export interface HistoryItem {
  id: string;
  type: 'nhap' | 'thuhoi' | 'xuat' | 'huy' | 'dc';
  date: string;
  user: string;
  note: string;
  from: string;
  to: string;
  items: Array<{ ma: string; ten: string; qty: number }>;
  status: 'pending_dept' | 'confirmed' | 'rejected';
  rejectReason?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  movementApplied: boolean;
  createdAt?: string;
  creatorDept?: string;
}

export interface PendingRegistration {
  name: string;
  username: string;
  email: string;
  password?: string;
  status: 'pending' | 'approved' | 'rejected';
  regDate: string;
}

export const DEPARTMENTS = [
  "Chẩn đoán hình ảnh",
  "Cấp cứu đa khoa",
  "KKB sản phụ khoa G",
  "Nội trú sản T1",
  "CSSD",
  "KKB đa khoa",
  "Nội soi tiêu hóa",
  "Gây mê hồi sức",
  "Phòng sanh",
  "NICU",
  "Nội trú nhi",
  "KKB nhi khoa",
  "Nội trú sản T6",
  "IVF",
  "Nam khoa",
  "KKB sản phụ khoa VIP",
  "Nội trú sản T8",
  "SPA",
  "ELITE",
  "NTĐK L6",
  "Khách",
  "Khách (VIP/Khoa ngoài)"
];

export const LINEN_GROUPS = [
  "Quần áo / trang phục",
  "Drap / săng / sheet",
  "Mền / gối",
  "Khăn",
  "Túi",
  "Khác"
];

export const LINEN_PAGES = [
  "Trang 1",
  "Trang 2",
  "Trang 3",
  "Trang 4",
  "Trang 5"
];

export interface WardDeliverySlip {
  id: string;
  dept: string;
  createdAt: string;
  createdBy: string;
  originalSlipId?: string; // Mã phiếu dơ gốc đầu tiên phát sinh nợ
  originalCreatedAt?: string; // Ngày/giờ nhận đồ dơ gốc đầu tiên
  receiver?: string;
  status: 'pending' | 'verified_dirty' | 'laundry_received' | 'laundry_returned' | 'clean_returned_pending_ward' | 'completed' | 'confirmed';
  rejectionNote?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  laundryDispatchId?: string; // Links to laundry dispatch when sent to laundry
  laundryReceivedBy?: string;
  laundryReceivedAt?: string;
  laundryReturnedBy?: string;
  laundryReturnedAt?: string;
  hospitalCleanBy?: string;
  hospitalCleanAt?: string;
  verifiedDirtyBy?: string;
  verifiedDirtyAt?: string;
  isGuestSlip?: boolean;
  isRewash?: boolean; // Phiếu gửi giặt lại (Rewash) do phát hiện dơ khi nhận đồ sạch
  attachedImage?: string;
  guestName?: string;
  guestRoom?: string;
  items: Array<{
    ma: string;
    ten: string;
    group: string;
    qty: number;
    isInfectious: boolean;
    isCustom?: boolean;
    
    // 5-step delivery process tracking fields:
    isVerifiedDirty?: boolean;       // B2: NV đồ vải xác nhận tick đủ
    verifiedDirtyQty?: number;       // Số lượng đồ dơ kiểm đếm thực tế
    isLaundryReceived?: boolean;     // B3: NV cty giặt tick nhận đồ dơ
    laundryReceivedQty?: number;     // Số lượng cty giặt thực nhận
    cleanReturnedQty?: number;       // B4: Cty giặt xong trả đồ sạch (nhập số lượng)
    isCleanReturnedVerified?: boolean; // B4: Cty giặt tick số lượng sạch trả
    isHospitalCleanVerified?: boolean; // B5: NV đồ sạch bệnh viện tick đủ
    hospitalCleanQty?: number;       // B5: Số lượng đồ sạch bệnh viện kiểm nhận thực tế
  }>;
}

export interface LaundryDispatch {
  id: string;
  createdAt: string;
  originalDispatchId?: string; // Hóa đơn dơ gốc đầu tiên phát sinh nợ
  originalCreatedAt?: string; // Ngày dơ gốc đầu tiên
  contractor: string;
  driver: string;
  plate: string;
  status: 'pending_laundry' | 'washing' | 'returning_clean' | 'completed';
  laundryReceivedAt?: string;
  laundryReceivedBy?: string;
  cleanReturnedAt?: string;
  cleanReturnedBy?: string;
  hospitalVerifiedAt?: string;
  hospitalVerifiedBy?: string;
  linkedSlipIds: string[];
  isGuestBill?: boolean;
  attachedImage?: string;
  guestName?: string;
  guestRoom?: string;
  dept?: string;
  items: Array<{
    ma: string;
    ten: string;
    group: string;
    isCustom?: boolean;
    wardQty: number;       // Tổng số nhận từ các khoa phòng
    handoverQty: number;   // Số lượng thực tế bàn giao lái xe (có thể chỉnh sửa)
    isHandoverChecked: boolean;
    handoverNote?: string; // Ghi chú giải trình lệch bên cạnh
    laundryReceivedQty: number; // Nhà giặt đếm nhận
    isLaundryChecked: boolean;
    cleanReturnedQty: number;   // Sạch thực trả về
    hospitalReceivedQty?: number; // NV đồ vải BV kiểm nhận thực tế
    isCleanChecked: boolean;
    cleanNote?: string;
  }>;
  lossNote?: string;
}
