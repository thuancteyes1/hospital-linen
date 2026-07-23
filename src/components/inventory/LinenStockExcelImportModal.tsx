import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileUp, X, Check, Download } from 'lucide-react';
import { LinenItem, LINEN_GROUPS } from '../../types';

interface LinenStockExcelImportModalProps {
  onClose: () => void;
  onConfirm: (data: { items: LinenItem[]; allocations: Record<string, [string, number][]> }, mode: 'overwrite' | 'merge') => void;
  departments: string[];
}

export default function LinenStockExcelImportModal({ onClose, onConfirm, departments }: LinenStockExcelImportModalProps) {
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [excelFileName, setExcelFileName] = useState('');
  const [excelError, setExcelError] = useState('');
  const [excelParsedData, setExcelParsedData] = useState<{ items: LinenItem[]; allocations: Record<string, [string, number][]> } | null>(null);
  const [excelImportMode, setExcelImportMode] = useState<'overwrite' | 'merge'>('overwrite');

  const normalizeStr = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const handleExcelImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setExcelError('');
    setExcelParsedData(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        if (rows.length === 0) {
          setExcelError('Tệp Excel rỗng hoặc không có dữ liệu.');
          return;
        }

        let headerRowIndex = 0;
        let maxMatches = -1;

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;
          let matches = 0;
          row.forEach((cell) => {
            if (!cell) return;
            const norm = normalizeStr(String(cell));
            if (norm.includes('ma') || norm.includes('code') || norm.includes('ten') || norm.includes('name') || norm.includes('nhom') || norm.includes('category')) {
              matches += 2;
            }
            const matchesDept = departments.some(dept => 
              normalizeStr(dept) === norm || normalizeStr(dept).includes(norm) || norm.includes(normalizeStr(dept))
            );
            if (matchesDept) {
              matches += 1;
            }
          });
          if (matches > maxMatches) {
            maxMatches = matches;
            headerRowIndex = i;
          }
        }

        const headers = (rows[headerRowIndex] || []).map((h: any) => h ? String(h).trim() : '');
        let colMa = -1;
        let colTen = -1;
        let colNhom = -1;
        let colKC = -1;
        let colHinhAnh = -1;
        let colDept = -1;
        let colQty = -1;
        const deptCols: { deptName: string; colIdx: number }[] = [];

        headers.forEach((header, idx) => {
          const norm = normalizeStr(header);
          if (colMa === -1 && (norm === 'ma' || norm === 'madv' || norm === 'mavattu' || norm === 'madovai' || norm === 'code' || norm === 'mahang' || norm === 'kyhieu')) {
            colMa = idx;
          } else if (colTen === -1 && (norm === 'ten' || norm === 'tendovai' || norm === 'tenvattu' || norm === 'name' || norm === 'tenhang' || norm === 'mota')) {
            colTen = idx;
          } else if (colNhom === -1 && (norm === 'nhom' || norm === 'loai' || norm === 'group' || norm === 'category')) {
            colNhom = idx;
          } else if (colKC === -1 && (norm === 'khochinh' || norm === 'khotrungtam' || norm === 'tonkhochinh' || norm === 'main' || norm === 'mainstock' || norm === 'kc' || norm === 'khodovai')) {
            colKC = idx;
          } else if (colHinhAnh === -1 && (norm.includes('hinhanh') || norm.includes('linkanh') || norm.includes('url') || norm.includes('image') || norm.includes('picture') || norm === 'anh' || norm === 'photo')) {
            colHinhAnh = idx;
          } else if (colDept === -1 && (norm === 'khoaphong' || norm === 'khoa' || norm === 'bophan' || norm === 'dept' || norm === 'department')) {
            colDept = idx;
          } else if (colQty === -1 && (norm === 'soluong' || norm === 'so' || norm === 'qty' || norm === 'quantity' || norm === 'ton' || norm === 'tonkho')) {
            colQty = idx;
          }

          const matchedDept = departments.find(dept => 
            normalizeStr(dept) === norm || 
            normalizeStr(dept).includes(norm) || 
            norm.includes(normalizeStr(dept))
          );
          if (matchedDept) {
            deptCols.push({ deptName: matchedDept, colIdx: idx });
          }
        });

        if (colMa === -1) colMa = 0;
        if (colTen === -1) colTen = 1;

        const parsedItemsMap = new Map<string, LinenItem>();
        const parsedAllocations: Record<string, [string, number][]> = {};

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          let ma = colMa !== -1 && row[colMa] !== undefined && row[colMa] !== null ? String(row[colMa]).trim() : '';
          let ten = colTen !== -1 && row[colTen] !== undefined && row[colTen] !== null ? String(row[colTen]).trim() : '';
          let nhom = colNhom !== -1 && row[colNhom] !== undefined && row[colNhom] !== null ? String(row[colNhom]).trim() : 'Khác';
          let kc = colKC !== -1 && row[colKC] !== undefined ? Number(row[colKC]) : 0;
          if (isNaN(kc)) kc = 0;
          let hinhAnh = colHinhAnh !== -1 && row[colHinhAnh] !== undefined && row[colHinhAnh] !== null ? String(row[colHinhAnh]).trim() : '';

          if (!ma && !ten) continue;
          if (!ma) {
            ma = 'DV-' + normalizeStr(ten).slice(0, 10) + '-' + i;
          }

          if (!LINEN_GROUPS.includes(nhom)) {
            const matchedGroup = LINEN_GROUPS.find(g => normalizeStr(g) === normalizeStr(nhom));
            nhom = matchedGroup || 'Khác';
          }

          let item = parsedItemsMap.get(ma);
          if (!item) {
            item = { ma, ten, nhom, kc, kp: 0, mn: 5, hinhAnh: hinhAnh || undefined };
            parsedItemsMap.set(ma, item);
          } else {
            item.kc += kc;
            if (hinhAnh && !item.hinhAnh) {
              item.hinhAnh = hinhAnh;
            }
          }

          if (!parsedAllocations[ma]) {
            parsedAllocations[ma] = [];
          }

          if (deptCols.length > 0) {
            deptCols.forEach(({ deptName, colIdx }) => {
              const val = Number(row[colIdx]);
              if (!isNaN(val) && val > 0) {
                const existingAlloc = parsedAllocations[ma].find(([d]) => d === deptName);
                if (existingAlloc) {
                  existingAlloc[1] += val;
                } else {
                  parsedAllocations[ma].push([deptName, val]);
                }
              }
            });
          } else if (colDept !== -1 && colQty !== -1) {
            const deptNameRaw = row[colDept] ? String(row[colDept]).trim() : '';
            const val = Number(row[colQty]);
            if (deptNameRaw && !isNaN(val) && val > 0) {
              const matchedDept = departments.find(dept => 
                normalizeStr(dept) === normalizeStr(deptNameRaw) || 
                normalizeStr(dept).includes(normalizeStr(deptNameRaw)) || 
                normalizeStr(deptNameRaw).includes(normalizeStr(dept))
              );
              if (matchedDept) {
                const existingAlloc = parsedAllocations[ma].find(([d]) => d === matchedDept);
                if (existingAlloc) {
                  existingAlloc[1] += val;
                } else {
                  parsedAllocations[ma].push([matchedDept, val]);
                }
              }
            }
          }
        }

        const finalParsedItems = Array.from(parsedItemsMap.values());
        if (finalParsedItems.length === 0) {
          setExcelError('Không tìm thấy bản ghi đồ vải hợp lệ nào trong file.');
        } else {
          setExcelParsedData({
            items: finalParsedItems,
            allocations: parsedAllocations
          });
        }
      } catch (err: any) {
        setExcelError('Có lỗi xảy ra khi phân tích file Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirm = () => {
    if (!excelParsedData) return;
    onConfirm(excelParsedData, excelImportMode);
  };

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Mã đồ vải': 'DV001',
        'Tên đồ vải': 'GA TRẢI GIƯỜNG CÓ THUN (1.2m x 2.0m)',
        'Nhóm': 'Drap / Ga giường',
        'Tồn kho chính': 250,
        'Hình ảnh': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80',
        'Khoa Cấp cứu': 30,
        'Khoa Khám bệnh': 20,
        'Khoa Nội tổng hợp': 25,
        'Khoa Ngoại tổng hợp': 15
      },
      {
        'Mã đồ vải': 'DV002',
        'Tên đồ vải': 'ÁO CHOÀNG PHÒNG MỔ PTV XANH DƯƠNG',
        'Nhóm': 'Trang phục y tế',
        'Tồn kho chính': 120,
        'Hình ảnh': 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80',
        'Khoa Cấp cứu': 15,
        'Khoa Phẫu thuật - GMHS': 50,
        'Khoa Nội tổng hợp': 0,
        'Khoa Ngoại tổng hợp': 10
      },
      {
        'Mã đồ vải': 'DV003',
        'Tên đồ vải': 'KHĂN TẮM BỆNH NHÂN BÔNG TRẮNG',
        'Nhóm': 'Khăn các loại',
        'Tồn kho chính': 300,
        'Hình ảnh': 'https://images.unsplash.com/photo-1546554137-f86b9593a222?auto=format&fit=crop&w=600&q=80',
        'Khoa Cấp cứu': 40,
        'Khoa Khám bệnh': 30,
        'Khoa Nội tổng hợp': 50,
        'Khoa Ngoại tổng hợp': 35
      },
      {
        'Mã đồ vải': 'DV004',
        'Tên đồ vải': 'VỎ CHĂN ĐƠN BỆNH VIỆN XANH CỐM',
        'Nhóm': 'Chăn / Màn / Vỏ gối',
        'Tồn kho chính': 180,
        'Hình ảnh': 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=600&q=80',
        'Khoa Cấp cứu': 20,
        'Khoa Khám bệnh': 10,
        'Khoa Nội tổng hợp': 30,
        'Khoa Ngoại tổng hợp': 20
      },
      {
        'Mã đồ vải': 'DV005',
        'Tên đồ vải': 'ÁO BỆNH NHÂN NAM/NỮ KẺ SỌC',
        'Nhóm': 'Trang phục y tế',
        'Tồn kho chính': 220,
        'Hình ảnh': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
        'Khoa Cấp cứu': 25,
        'Khoa Khám bệnh': 35,
        'Khoa Nội tổng hợp': 40,
        'Khoa Ngoại tổng hợp': 30
      },
      {
        'Mã đồ vải': 'DV006',
        'Tên đồ vải': 'TẤM LÓT CHỐNG THẤM PHÒNG CẤP CỨU',
        'Nhóm': 'Đồ vải đặc chủng',
        'Tồn kho chính': 100,
        'Hình ảnh': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
        'Khoa Cấp cứu': 30,
        'Khoa Khám bệnh': 5,
        'Khoa Nội tổng hợp': 10,
        'Khoa Ngoại tổng hợp': 15
      }
    ];

    const instructionsData = [
      {
        'STT': 1,
        'Tên Cột': 'Mã đồ vải',
        'Bắt Buộc': 'BẮT BUỘC',
        'Mô Tả & Quy Định': 'Mã định danh duy nhất của sản phẩm đồ vải (Ví dụ: DV001, DV002). Nếu mã đã tồn tại, hệ thống sẽ cập nhật thông tin sản phẩm đó.'
      },
      {
        'STT': 2,
        'Tên Cột': 'Tên đồ vải',
        'Bắt Buộc': 'BẮT BUỘC',
        'Mô Tả & Quy Định': 'Tên đầy đủ mô tả loại đồ vải (Ví dụ: Ga trải giường, Áo mổ, Khăn tắm...)'
      },
      {
        'STT': 3,
        'Tên Cột': 'Nhóm',
        'Bắt Buộc': 'Khuyến khích',
        'Mô Tả & Quy Định': 'Các nhóm chuẩn: "Drap / Ga giường", "Trang phục y tế", "Khăn các loại", "Chăn / Màn / Vỏ gối", "Đồ vải đặc chủng", hoặc nhóm tự định nghĩa.'
      },
      {
        'STT': 4,
        'Tên Cột': 'Tồn kho chính',
        'Bắt Buộc': 'Khuyến khích',
        'Mô Tả & Quy Định': 'Số lượng đồ vải sạch hiện có tại Kho trung tâm / Kho đồ vải bệnh viện (Điền số nguyên >= 0).'
      },
      {
        'STT': 5,
        'Tên Cột': 'Hình ảnh',
        'Bắt Buộc': 'Tùy chọn',
        'Mô Tả & Quy Định': 'Đường dẫn URL ảnh trực tuyến (https://...). Hệ thống sẽ hiển thị hình ảnh đại diện trực quan trên danh mục và khi tạo phiếu.'
      },
      {
        'STT': 6,
        'Tên Cột': '[Tên Khoa Phòng]',
        'Bắt Buộc': 'Tùy chọn',
        'Mô Tả & Quy Định': 'Các cột tiếp theo đặt tên đúng theo Tên Khoa/Phòng (VD: Khoa Cấp cứu, Khoa Nội tổng hợp...). Giá trị ô là số lượng đồ vải phân bổ ban đầu tại khoa đó.'
      }
    ];

    // Sheet 1: Danh muc
    const wsData = XLSX.utils.json_to_sheet(sampleData);
    wsData['!cols'] = [
      { wch: 14 }, // Ma
      { wch: 38 }, // Ten
      { wch: 22 }, // Nhom
      { wch: 16 }, // Ton kho chinh
      { wch: 65 }, // Hinh anh
      { wch: 18 }, // Khoa Cap cuu
      { wch: 18 }, // Khoa Kham benh
      { wch: 22 }, // Khoa Noi
      { wch: 22 }  // Khoa Ngoai
    ];

    // Sheet 2: Huong dan
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
    wsInstructions['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 16 },
      { wch: 80 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, 'DANH_MUC_DO_VAI');
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'HƯỚNG_DẪN_SỬ_DỤNG');

    XLSX.writeFile(wb, 'Mau_Nap_Danh_Muc_Do_Vai_HospLinenPRO.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-4 sm:pt-8 md:pt-12 overflow-y-auto">
      <div className="w-full max-w-lg border border-[#1A1A1A] bg-[#F5F2ED] p-1">
        <div className="border border-[#1A1A1A] p-5">
          <div className="flex justify-between items-start mb-4 pb-2 border-b border-[#1A1A1A]">
            <div>
              <h3 className="font-serif font-black text-lg text-[#1A1A1A]">Nạp Kho / Import Excel</h3>
              <p className="text-[11px] text-[#8C8984]">Chọn file Excel mẫu để cập nhật thông tin tồn kho toàn viện</p>
            </div>
            <button onClick={onClose} className="text-[#8C8984] hover:text-[#1A1A1A] text-lg font-bold">&times;</button>
          </div>

          {excelError && <div className="mb-4 p-2.5 border border-[#C4432A] bg-[#FDF2F0] text-[11px] text-[#C4432A] font-semibold">{excelError}</div>}

          <div className="space-y-4">
            {/* TEMPLATE DOWNLOAD BANNER */}
            <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl flex items-center justify-between gap-2">
              <div>
                <span className="block text-xs font-bold text-blue-900">Chưa có tệp Excel chuẩn?</span>
                <span className="block text-[10px] text-blue-700">Tải tệp mẫu đã có sẵn cột Mã, Tên, Nhóm, Tồn kho & Link hình ảnh</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Download size={13} />
                <span>Tải Mẫu Excel</span>
              </button>
            </div>

            <div className="border-2 border-dashed border-[#1A1A1A]/20 bg-[#EBE8E3]/50 p-6 rounded-xl text-center relative hover:bg-[#EBE8E3] transition-colors">
              <input type="file" accept=".xlsx, .xls" onChange={handleExcelImportFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <FileUp className="w-10 h-10 mx-auto text-stone-400 mb-2" />
              <span className="block text-xs font-bold text-stone-700"> Kéo thả tệp hoặc click để tải lên </span>
              <span className="block text-[10px] text-stone-400 mt-1">Hỗ trợ cột: Mã, Tên, Nhóm, Kho chính, Hình ảnh (URL/Link) & Tồn các Khoa phòng</span>
            </div>

            {excelFileName && (
              <div className="bg-[#EBE8E3] border border-[#1A1A1A]/10 p-3 rounded-lg flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800 truncate">{excelFileName}</span>
                {excelParsedData && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <Check size={11} /> Đã đọc {excelParsedData.items.length} mặt hàng
                  </span>
                )}
              </div>
            )}

            {excelParsedData && (
              <div className="bg-white p-3 border border-stone-200 rounded-xl space-y-2 text-xs">
                <span className="block text-[10px] uppercase font-black text-stone-400 font-bold">Chế độ ghi nhận</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExcelImportMode('overwrite')}
                    className={`py-2 px-3 border text-center font-bold rounded-lg cursor-pointer ${
                      excelImportMode === 'overwrite'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-stone-200 bg-stone-50 text-stone-600'
                    }`}
                  >
                    ⚠️ Ghi đè toàn bộ
                  </button>
                  <button
                    onClick={() => setExcelImportMode('merge')}
                    className={`py-2 px-3 border text-center font-bold rounded-lg cursor-pointer ${
                      excelImportMode === 'merge'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-stone-200 bg-stone-50 text-stone-600'
                    }`}
                  >
                    🔄 Gộp / Bổ sung mới
                  </button>
                </div>
                <p className="text-[10px] text-stone-400 italic">
                  * Ghi đè: Thay thế toàn bộ danh mục hiện có. Gộp: Giữ nguyên các mặt hàng cũ không trùng mã.
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-3 border-t border-[#1A1A1A] border-dashed">
              <button onClick={onClose} className="px-4 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]">Hủy</button>
              <button
                disabled={!excelParsedData}
                onClick={handleConfirm}
                className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase tracking-wider hover:bg-emerald-700 hover:border-emerald-700 border border-[#1A1A1A] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Nhập Kho Excel ✅
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
