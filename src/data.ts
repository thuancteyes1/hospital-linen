/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LinenItem, Role, User, Account, HistoryItem, WardDeliverySlip, LaundryDispatch } from "./types";

export const INITIAL_LINEN_ITEMS: LinenItem[] = [
  { ma: "DV001", ten: "PTV PHÒNG MỔ", nhom: "Quần áo / trang phục", kc: 0, kp: 346, mn: 20 },
  { ma: "DV002", ten: "BS HỢP TÁC", nhom: "Khác", kc: 0, kp: 60, mn: 10 },
  { ma: "DV003", ten: "PTV PHÒNG SANH", nhom: "Quần áo / trang phục", kc: 0, kp: 66, mn: 20 },
  { ma: "DV004", ten: "BÁC SĨ NICU", nhom: "Quần áo / trang phục", kc: 2, kp: 15, mn: 20 },
  { ma: "DV005", ten: "ĐIỀU DƯỠNG NICU", nhom: "Quần áo / trang phục", kc: 1, kp: 39, mn: 20 },
  { ma: "DV006", ten: "PTV IVF", nhom: "Quần áo / trang phục", kc: 0, kp: 90, mn: 20 },
  { ma: "DV007", ten: "ĐIỀU DƯỠNG IVF", nhom: "Quần áo / trang phục", kc: 0, kp: 98, mn: 20 },
  { ma: "DV008", ten: "LAB IVF", nhom: "Khác", kc: 0, kp: 70, mn: 10 },
  { ma: "DV009", ten: "PHÒNG DƠ CSSD", nhom: "Khác", kc: 19, kp: 5, mn: 10 },
  { ma: "DV010", ten: "PHÒNG SẠCH CSSD", nhom: "Khác", kc: 9, kp: 18, mn: 10 },
  { ma: "DV011", ten: "ÁO CHOÀNG CSSD", nhom: "Quần áo / trang phục", kc: 0, kp: 8, mn: 20 },
  { ma: "DV012", ten: "ÁO CHOÀNG NAM KHOA", nhom: "Quần áo / trang phục", kc: 0, kp: 20, mn: 20 },
  { ma: "DV013", ten: "ĐẦM SẢN PHỤ", nhom: "Quần áo / trang phục", kc: 0, kp: 24, mn: 20 },
  { ma: "DV014", ten: "VÁY SIÊU ÂM XANH DƯƠNG", nhom: "Quần áo / trang phục", kc: 0, kp: 153, mn: 20 },
  { ma: "DV015", ten: "VÁY SIÊU ÂM HỒNG", nhom: "Quần áo / trang phục", kc: 0, kp: 195, mn: 20 },
  { ma: "DV016", ten: "ĐẦM SPA", nhom: "Quần áo / trang phục", kc: 0, kp: 0, mn: 20 },
  { ma: "DV017", ten: "QUẦN NỘI SOI", nhom: "Quần áo / trang phục", kc: 17, kp: 5, mn: 20 },
  { ma: "DV018", ten: "SĂNG TRẢI GIƯỜNG PHẪU THUẬT", nhom: "Drap / săng / sheet", kc: 29, kp: 89, mn: 20 },
  { ma: "DV019", ten: "SĂNG DI CHUYỂN", nhom: "Drap / săng / sheet", kc: 0, kp: 58, mn: 20 },
  { ma: "DV020", ten: "SĂNG IVF", nhom: "Drap / săng / sheet", kc: 0, kp: 23, mn: 20 },
  { ma: "DV021", ten: "SĂNG TRẢI NỘI", nhom: "Drap / săng / sheet", kc: 2, kp: 30, mn: 20 },
  { ma: "DV022", ten: "SĂNG CỐ ĐỊNH CHÂN", nhom: "Drap / săng / sheet", kc: 0, kp: 40, mn: 20 },
  { ma: "DV023", ten: "SĂNG CSSD", nhom: "Drap / săng / sheet", kc: 0, kp: 0, mn: 20 },
  { ma: "DV024", ten: "SHEET NICU", nhom: "Drap / săng / sheet", kc: 0, kp: 40, mn: 20 },
  { ma: "DV025", ten: "SĂNG LỖ", nhom: "Drap / săng / sheet", kc: 1, kp: 5, mn: 20 },
  { ma: "DV026", ten: "SĂNG TRẢI MÂM", nhom: "Drap / săng / sheet", kc: 25, kp: 13, mn: 20 },
  { ma: "DV027", ten: "SĂNG ỐNG CHÂN", nhom: "Drap / săng / sheet", kc: 30, kp: 10, mn: 20 },
  { ma: "DV028", ten: "SĂNG CHIẾU ĐÈN", nhom: "Drap / săng / sheet", kc: 6, kp: 24, mn: 20 },
  { ma: "DV029", ten: "ÁO BÌNH O2", nhom: "Quần áo / trang phục", kc: 8, kp: 14, mn: 20 },
  { ma: "DV030", ten: "DRAP TRẮNG S", nhom: "Drap / săng / sheet", kc: 44, kp: 152, mn: 20 },
  { ma: "DV031", ten: "DRAP TRẮNG L", nhom: "Drap / săng / sheet", kc: 79, kp: 91, mn: 20 },
  { ma: "DV032", ten: "DRAP NÔI", nhom: "Drap / săng / sheet", kc: 81, kp: 165, mn: 20 },
  { ma: "DV033", ten: "RUỘT GỐI", nhom: "Mền / gối", kc: 6, kp: 113, mn: 20 },
  { ma: "DV034", ten: "ÁO GỐI TRẮNG", nhom: "Quần áo / trang phục", kc: 20, kp: 222, mn: 20 },
  { ma: "DV035", ten: "DRAP HỒNG", nhom: "Drap / săng / sheet", kc: 0, kp: 57, mn: 20 },
  { ma: "DV036", ten: "MỀN HỒNG", nhom: "Mền / gối", kc: 0, kp: 60, mn: 20 },
  { ma: "DV037", ten: "ÁO GỐI HỒNG", nhom: "Quần áo / trang phục", kc: 11, kp: 77, mn: 20 },
  { ma: "DV038", ten: "MỀN KEM", nhom: "Mền / gối", kc: 41, kp: 43, mn: 20 },
  { ma: "DV039", ten: "MỀN VÀNG", nhom: "Mền / gối", kc: 7, kp: 0, mn: 20 },
  { ma: "DV040", ten: "KHĂN KEM LỚN", nhom: "Khăn", kc: 5, kp: 77, mn: 20 },
  { ma: "DV041", ten: "KHĂN KEM TRUNG", nhom: "Khăn", kc: 0, kp: 75, mn: 20 },
  { ma: "DV042", ten: "KHĂN KEM NHỎ", nhom: "Khăn", kc: 0, kp: 0, mn: 20 },
  { ma: "DV043", ten: "KHĂN HỒNG", nhom: "Khăn", kc: 0, kp: 30, mn: 20 },
  { ma: "DV044", ten: "KHĂN XANH", nhom: "Khăn", kc: 10, kp: 20, mn: 20 },
  { ma: "DV045", ten: "KHĂN VÀNG LỚN", nhom: "Khăn", kc: 0, kp: 0, mn: 20 },
  { ma: "DV046", ten: "KHĂN VÀNG NHỎ", nhom: "Khăn", kc: 0, kp: 0, mn: 20 },
  { ma: "DV047", ten: "KHĂN XÁM", nhom: "Khăn", kc: 0, kp: 0, mn: 20 },
  { ma: "DV048", ten: "KHĂN LAU TAY IVF", nhom: "Khăn", kc: 0, kp: 815, mn: 20 },
  { ma: "DV049", ten: "TÚI DV 45L", nhom: "Túi", kc: 18, kp: 53, mn: 20 },
  { ma: "DV050", ten: "TÚI DV 87L", nhom: "Túi", kc: 24, kp: 0, mn: 20 },
  { ma: "DV051", ten: "ÁO CHỤP NHŨ", nhom: "Quần áo / trang phục", kc: 0, kp: 267, mn: 20 },
  { ma: "DV052", ten: "ĐỒNG PHỤC BỆNH NHÂN NAM", nhom: "Quần áo / trang phục", kc: 0, kp: 13, mn: 20 }
];

export const INITIAL_DETAIL_ALLOCATIONS: Record<string, [string, number][]> = {
  "DV001": [["Gây mê hồi sức", 342], ["Nội trú sản T6", 1], ["Nam khoa", 3]],
  "DV002": [["Gây mê hồi sức", 60]],
  "DV003": [["Phòng sanh", 60], ["ELITE", 6]],
  "DV004": [["NICU", 15]],
  "DV005": [["NICU", 39]],
  "DV006": [["Nội trú sản T6", 90]],
  "DV007": [["Nội trú sản T6", 98]],
  "DV008": [["Nội trú sản T6", 70]],
  "DV009": [["CSSD", 2], ["Nội trú nhi", 3]],
  "DV010": [["CSSD", 18]],
  "DV011": [["CSSD", 8]],
  "DV012": [["Nam khoa", 20]],
  "DV013": [["Cấp cứu đa khoa", 4], ["KKB sản phụ khoa G", 10], ["NICU", 10]],
  "DV014": [["Chẩn đoán hình ảnh", 150], ["IVF", 3]],
  "DV015": [["KKB sản phụ khoa G", 110], ["KKB đa khoa", 20], ["Phòng sanh", 5], ["Nội trú sản T6", 50], ["Nam khoa", 10]],
  "DV016": [],
  "DV017": [["Nội soi tiêu hóa", 5]],
  "DV018": [["Gây mê hồi sức", 89]],
  "DV019": [["Nội soi tiêu hóa", 12], ["Gây mê hồi sức", 46]],
  "DV020": [["Nội trú sản T6", 23]],
  "DV021": [["Phòng sanh", 30]],
  "DV022": [["Gây mê hồi sức", 40]],
  "DV023": [],
  "DV024": [["NICU", 40]],
  "DV025": [["Phòng sanh", 5]],
  "DV026": [["KKB đa khoa", 8], ["Phòng sanh", 5]],
  "DV027": [["Phòng sanh", 10]],
  "DV028": [["NICU", 10], ["Nội trú nhi", 2], ["Nội trú sản T6", 10], ["KKB sản phụ khoa VIP", 2]],
  "DV029": [["Chẩn đoán hình ảnh", 2], ["KKB sản phụ khoa G", 2], ["KKB đa khoa", 2], ["Nội trú nhi", 2], ["KKB nhi khoa", 2], ["Nội trú sản T6", 4]],
  "DV030": [["Chẩn đoán hình ảnh", 40], ["KKB sản phụ khoa G", 22], ["KKB đa khoa", 25], ["Nội soi tiêu hóa", 12], ["Gây mê hồi sức", 20], ["Nội trú nhi", 5], ["KKB nhi khoa", 15], ["Nội trú sản T6", 13]],
  "DV031": [["Cấp cứu đa khoa", 30], ["Phòng sanh", 20], ["Nội trú nhi", 5], ["KKB nhi khoa", 15], ["IVF", 21]],
  "DV032": [["Nội trú sản T1", 40], ["Phòng sanh", 20], ["NICU", 40], ["Nội trú nhi", 10], ["Nội trú sản T6", 40], ["Nội trú sản T8", 15]],
  "DV033": [["Chẩn đoán hình ảnh", 10], ["Cấp cứu đa khoa", 15], ["KKB sản phụ khoa G", 10], ["KKB đa khoa", 14], ["Gây mê hồi sức", 14], ["Phòng sanh", 10], ["NICU", 8], ["KKB nhi khoa", 10], ["Nội trú sản T6", 15], ["IVF", 6], ["Nam khoa", 1]],
  "DV034": [["Chẩn đoán hình ảnh", 42], ["Cấp cứu đa khoa", 35], ["KKB sản phụ khoa G", 21], ["KKB đa khoa", 28], ["Phòng sanh", 30], ["NICU", 20], ["Nội trú nhi", 5], ["KKB nhi khoa", 20], ["IVF", 19], ["Nam khoa", 2]],
  "DV035": [["Gây mê hồi sức", 40], ["NICU", 4], ["Nội trú sản T6", 13]],
  "DV036": [["KKB đa khoa", 1], ["Nội soi tiêu hóa", 2], ["Gây mê hồi sức", 40], ["NICU", 4], ["Nội trú sản T6", 13]],
  "DV037": [["Gây mê hồi sức", 60], ["NICU", 4], ["Nội trú sản T6", 13]],
  "DV038": [["Cấp cứu đa khoa", 15], ["KKB sản phụ khoa G", 10], ["Phòng sanh", 15], ["IVF", 3]],
  "DV039": [],
  "DV040": [["Chẩn đoán hình ảnh", 15], ["KKB sản phụ khoa G", 14], ["Phòng sanh", 25], ["Nội trú nhi", 10], ["KKB nhi khoa", 7], ["IVF", 2], ["Nam khoa", 4]],
  "DV041": [["Chẩn đoán hình ảnh", 20], ["Cấp cứu đa khoa", 5], ["KKB đa khoa", 2], ["NICU", 30], ["KKB nhi khoa", 5], ["Nội trú sản T6", 13]],
  "DV042": [],
  "DV043": [["NICU", 30]],
  "DV044": [["NICU", 20]],
  "DV045": [],
  "DV046": [],
  "DV047": [],
  "DV048": [["IVF", 815]],
  "DV049": [["Chẩn đoán hình ảnh", 27], ["KKB sản phụ khoa G", 15], ["NICU", 9], ["KKB nhi khoa", 2]],
  "DV050": [],
  "DV051": [["Chẩn đoán hình ảnh", 257], ["KKB sản phụ khoa G", 10]],
  "DV052": [["Nội soi tiêu hóa", 12], ["IVF", 1]]
};

export const INITIAL_ROLES: Role[] = [
  { name: 'Trưởng kho đồ vải', color: '#1d5fb8', desc: 'Toàn quyền kho trung tâm', perms: { nhap: true, thuhoi: true, xuat: true, huy: true, dc: true, dovai: true } },
  { name: 'Nhân viên đồ vải', color: '#0d9488', desc: 'Không được phép xuất hủy', perms: { nhap: true, thuhoi: true, xuat: true, huy: false, dc: true, dovai: true } },
  { name: 'Điều dưỡng', color: '#7c3aed', desc: 'Chỉ thu hồi từ khoa mình', perms: { nhap: false, thuhoi: true, xuat: false, huy: false, dc: true, dovai: false } },
  { name: 'Kế toán', color: '#b45309', desc: 'Chỉ được phép xuất hủy', perms: { nhap: false, thuhoi: false, xuat: false, huy: true, dc: false, dovai: false } },
  { name: 'Xem báo cáo', color: '#334155', desc: 'Chỉ xem, không thao tác kho', perms: { nhap: false, thuhoi: false, xuat: false, huy: false, dc: false, dovai: false } },
  { name: 'Hộ lý', color: '#eab308', desc: 'Chỉ giao nhận đồ vải khoa (không xuất nhập kho)', perms: { nhap: false, thuhoi: false, xuat: false, huy: false, dc: false, dovai: true } },
  { name: 'Công ty giặt', color: '#9333ea', desc: 'Chỉ truy cập Line 2 xưởng giặt', perms: { nhap: false, thuhoi: false, xuat: false, huy: false, dc: false, dovai: true } }
];

export const INITIAL_USERS: User[] = [
  { name: 'Nguyễn Văn An', email: 'an.nv@hospital.vn', role: 0, dept: 'Kho trung tâm', status: 'active' },
  { name: 'Trần Thị Bình', email: 'binh.tt@hospital.vn', role: 1, dept: 'Kho trung tâm', status: 'active' },
  { name: 'Lê Thị Cẩm', email: 'cam.lt@hospital.vn', role: 2, dept: 'NICU', status: 'active' },
  { name: 'Phạm Văn Dũng', email: 'dung.pv@hospital.vn', role: 2, dept: 'Gây mê hồi sức', status: 'active' },
  { name: 'Võ Thị Elan', email: 'elan.vt@hospital.vn', role: 3, dept: 'Tất cả', status: 'active' },
  { name: 'Huỳnh Văn Phúc', email: 'phuc.hv@hospital.vn', role: 4, dept: 'Tất cả', status: 'inactive' },
  { name: 'Nguyễn Thị Mai', email: 'mai.dd@hospital.vn', role: 2, dept: 'Khoa Cấp cứu đa khoa', status: 'active' },
  { name: 'Trần Thị Hoa', email: 'hoa.dd@hospital.vn', role: 2, dept: 'NICU', status: 'active' },
  { name: 'Lê Thị Ngọc', email: 'ngoc.dd@hospital.vn', role: 2, dept: 'Phòng sanh', status: 'active' },
  { name: 'Võ Văn Tài', email: 'tai.hl@hospital.vn', role: 5, dept: 'Khoa Cấp cứu đa khoa', status: 'active' },
  { name: 'Phạm Thị Lan', email: 'lan.hl@hospital.vn', role: 5, dept: 'Gây mê hồi sức', status: 'active' },
  { name: 'Trần Thị Buồng', email: 'buongphong@hospital.vn', role: 2, dept: 'Khách', status: 'active' },
  { name: 'Nhân viên Xưởng giặt Cty', email: 'xuonggiat@hospital.vn', role: 6, dept: 'Xưởng giặt Cty', status: 'active' },
  { name: 'Test 1', email: 'test1@hospital.vn', role: 0, dept: 'Kho trung tâm', status: 'active' },
  { name: 'Test 2', email: 'test2@hospital.vn', role: 1, dept: 'Kho trung tâm', status: 'active' },
  { name: 'Test 3', email: 'test3@hospital.vn', role: 2, dept: 'Khoa Cấp cứu đa khoa', status: 'active' },
  { name: 'Test 4', email: 'test4@hospital.vn', role: 5, dept: 'Khoa Cấp cứu đa khoa', status: 'active' },
  { name: 'Test 5', email: 'test5@hospital.vn', role: 6, dept: 'Xưởng giặt Cty', status: 'active' },
  { name: 'Test 6', email: 'test6@hospital.vn', role: 3, dept: 'Tất cả', status: 'active' }
];

export const INITIAL_ACCOUNTS: Account[] = [
  { username: 'Admin', email: 'admin@hospital.vn', password: 'admin123', name: 'Quản trị viên', isAdmin: true, status: 'active', userIdx: 0 },
  { username: 'an.nv', email: 'an.nv@hospital.vn', password: '123456', name: 'Nguyễn Văn An', isAdmin: false, status: 'active', userIdx: 0 },
  { username: 'binh.tt', email: 'binh.tt@hospital.vn', password: '123456', name: 'Trần Thị Bình', isAdmin: false, status: 'active', userIdx: 1 },
  { username: 'mai.dd', email: 'mai.dd@hospital.vn', password: 'dieuduong1', name: 'Nguyễn Thị Mai', isAdmin: false, status: 'active', userIdx: 6 },
  { username: 'hoa.dd', email: 'hoa.dd@hospital.vn', password: 'dieuduong2', name: 'Trần Thị Hoa', isAdmin: false, status: 'active', userIdx: 7 },
  { username: 'ngoc.dd', email: 'ngoc.dd@hospital.vn', password: 'dieuduong3', name: 'Lê Thị Ngọc', isAdmin: false, status: 'active', userIdx: 8 },
  { username: 'tai.hl', email: 'tai.hl@hospital.vn', password: 'holy1234', name: 'Võ Văn Tài', isAdmin: false, status: 'active', userIdx: 9 },
  { username: 'lan.hl', email: 'lan.hl@hospital.vn', password: 'holy1234', name: 'Phạm Thị Lan', isAdmin: false, status: 'active', userIdx: 10 },
  { username: 'buongphong', email: 'buongphong@hospital.vn', password: 'buongphong123', name: 'Trần Thị Buồng (NV Buồng phòng)', isAdmin: false, status: 'active', userIdx: 11 },
  { username: 'ctygiat', email: 'xuonggiat@hospital.vn', password: 'giat123', name: 'Nhân viên Xưởng giặt (Cty)', isAdmin: false, status: 'active', userIdx: 12 },
  { username: 'test1', email: 'test1@hospital.vn', password: '123456', name: 'Test 1', isAdmin: false, status: 'active', userIdx: 13 },
  { username: 'test2', email: 'test2@hospital.vn', password: '123456', name: 'Test 2', isAdmin: false, status: 'active', userIdx: 14 },
  { username: 'test3', email: 'test3@hospital.vn', password: '123456', name: 'Test 3', isAdmin: false, status: 'active', userIdx: 15 },
  { username: 'test4', email: 'test4@hospital.vn', password: '123456', name: 'Test 4', isAdmin: false, status: 'active', userIdx: 16 },
  { username: 'test5', email: 'test5@hospital.vn', password: '123456', name: 'Test 5', isAdmin: false, status: 'active', userIdx: 17 },
  { username: 'test6', email: 'test6@hospital.vn', password: '123456', name: 'Test 6', isAdmin: false, status: 'active', userIdx: 18 }
];

export const INITIAL_DIFF_ITEMS = [
  { ten: "PTV phòng mổ", ma: "DV001", giao: 85, nhan: 83 },
  { ten: "Drap trắng S", ma: "DV030", giao: 152, nhan: 152 },
  { ten: "Áo gối trắng", ma: "DV034", giao: 197, nhan: 195 },
  { ten: "Ruột gối", ma: "DV033", giao: 113, nhan: 113 },
  { ten: "Khăn lau tay IVF", ma: "DV048", giao: 120, nhan: 118 },
  { ten: "Drap hồng", ma: "DV035", giao: 57, nhan: 57 }
];

export const INITIAL_WARD_DELIVERY_SLIPS: WardDeliverySlip[] = [
  {
    id: "PGN-29062601",
    dept: "NICU",
    createdAt: "2026-06-29T08:30",
    createdBy: "Trần Thị Hoa",
    status: "confirmed",
    confirmedAt: "2026-06-29T10:00",
    confirmedBy: "Nguyễn Văn An",
    laundryDispatchId: "Bill-Tong-29062601",
    items: [
      { ma: "DV030", ten: "DRAP TRẮNG S", group: "Drap / săng / sheet", qty: 15, isInfectious: false },
      { ma: "DV034", ten: "ÁO GỐI TRẮNG", group: "Quần áo / trang phục", qty: 10, isInfectious: false },
      { ma: "DV033", ten: "RUỘT GỐI", group: "Mền / gối", qty: 5, isInfectious: false }
    ]
  },
  {
    id: "PGN-29062602",
    dept: "Phòng sanh",
    createdAt: "2026-06-29T09:15",
    createdBy: "Lê Thị Ngọc",
    status: "confirmed",
    confirmedAt: "2026-06-29T11:00",
    confirmedBy: "Nguyễn Văn An",
    laundryDispatchId: "Bill-Tong-29062601",
    items: [
      { ma: "DV003", ten: "PTV PHÒNG SANH", group: "Quần áo / trang phục", qty: 12, isInfectious: false }
    ]
  },
  {
    id: "PGN-29062603",
    dept: "NICU",
    createdAt: "2026-06-29T16:45",
    createdBy: "Trần Thị Hoa",
    status: "pending",
    items: [
      { ma: "DV030", ten: "DRAP TRẮNG S", group: "Drap / săng / sheet", qty: 12, isInfectious: false },
      { ma: "DV034", ten: "ÁO GỐI TRẮNG", group: "Quần áo / trang phục", qty: 8, isInfectious: false }
    ]
  },
  {
    id: "PGN-30062601",
    dept: "Cấp cứu đa khoa",
    createdAt: "2026-06-30T07:15",
    createdBy: "Nguyễn Thị Mai",
    status: "pending",
    items: [
      { ma: "DV030", ten: "DRAP TRẮNG S", group: "Drap / săng / sheet", qty: 20, isInfectious: false },
      { ma: "DV034", ten: "ÁO GỐI TRẮNG", group: "Quần áo / trang phục", qty: 15, isInfectious: false },
      { ma: "CUSTOM_1", ten: "Khăn lau đa năng tự chế", group: "Khác", qty: 8, isInfectious: true, isCustom: true }
    ]
  },
  {
    id: "NỢ-KHOA-06071",
    dept: "Khoa Gây mê hồi sức",
    createdAt: "06/07/2026 14:30",
    createdBy: "Hệ thống (Tách nợ từ PGN-06072601)",
    originalSlipId: "PGN-06072601",
    originalCreatedAt: "06/07/2026 08:30",
    status: "pending",
    items: [
      { ma: "DV030", ten: "DRAP TRẮNG S", group: "Drap / săng / sheet", qty: 2, isInfectious: false, verifiedDirtyQty: 2, cleanReturnedQty: 2, isVerifiedDirty: true }
    ]
  }
];

export const INITIAL_LAUNDRY_DISPATCHES: LaundryDispatch[] = [
  {
    id: "Bill-Tong-29062601",
    createdAt: "2026-06-29T14:00",
    contractor: "Công ty giặt ủi ABC",
    driver: "Nguyễn Văn C",
    plate: "29C-123.45",
    status: "completed",
    linkedSlipIds: ["PGN-29062601", "PGN-29062602"],
    items: [
      {
        ma: "DV030",
        ten: "DRAP TRẮNG S",
        group: "Drap / săng / sheet",
        wardQty: 15,
        handoverQty: 15,
        isHandoverChecked: true,
        laundryReceivedQty: 15,
        isLaundryChecked: true,
        cleanReturnedQty: 15,
        isCleanChecked: true
      },
      {
        ma: "DV034",
        ten: "ÁO GỐI TRẮNG",
        group: "Quần áo / trang phục",
        wardQty: 10,
        handoverQty: 10,
        isHandoverChecked: true,
        laundryReceivedQty: 10,
        isLaundryChecked: true,
        cleanReturnedQty: 10,
        isCleanChecked: true
      },
      {
        ma: "DV033",
        ten: "RUỘT GỐI",
        group: "Mền / gối",
        wardQty: 5,
        handoverQty: 5,
        isHandoverChecked: true,
        laundryReceivedQty: 5,
        isLaundryChecked: true,
        cleanReturnedQty: 5,
        isCleanChecked: true
      },
      {
        ma: "DV003",
        ten: "PTV PHÒNG SANH",
        group: "Quần áo / trang phục",
        wardQty: 12,
        handoverQty: 12,
        isHandoverChecked: true,
        laundryReceivedQty: 12,
        isLaundryChecked: true,
        cleanReturnedQty: 12,
        isCleanChecked: true
      }
    ],
    lossNote: "Đầy đủ không hụt rách."
  },
  {
    id: "BILL-NỢ-CTY-98765",
    createdAt: "09/07/2026, 10:00:00",
    originalCreatedAt: "09/07/2026, 10:00:00",
    contractor: "Công ty giặt ủi ABC",
    driver: "Nguyễn Văn C",
    plate: "29C-123.45",
    status: "pending_laundry",
    linkedSlipIds: [],
    items: [
      {
        ma: "DV030",
        ten: "DRAP TRẮNG S",
        group: "Drap / săng / sheet",
        wardQty: 30,
        handoverQty: 30,
        isHandoverChecked: true,
        laundryReceivedQty: 30,
        isLaundryChecked: true,
        cleanReturnedQty: 10,
        isCleanChecked: false
      },
      {
        ma: "DV034",
        ten: "ÁO GỐI TRẮNG",
        group: "Quần áo / trang phục",
        wardQty: 15,
        handoverQty: 15,
        isHandoverChecked: true,
        laundryReceivedQty: 15,
        isLaundryChecked: true,
        cleanReturnedQty: 5,
        isCleanChecked: false
      }
    ]
  }
];

export const generateDailySlipId = (prefix: string, existingIds: string[]): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const datePrefix = `${prefix}${dd}${mm}${yy}`;

  let maxSeq = 0;
  existingIds.forEach(id => {
    if (id && id.toLowerCase().startsWith(datePrefix.toLowerCase())) {
      const seqStr = id.slice(datePrefix.length);
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  });
  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `${datePrefix}${nextSeq}`;
};
