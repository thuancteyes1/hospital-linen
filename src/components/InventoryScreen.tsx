/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { LinenItem, LINEN_GROUPS, DEPARTMENTS } from '../types';
import { Search, Plus, FileSpreadsheet, Upload, Download, RefreshCw, FlaskConical, Edit, Trash2, MapPin, AlertTriangle, Info, Check, X, ShieldAlert, FileUp, Image, Maximize2, Eye } from 'lucide-react';

export function getLinenImage(item: LinenItem): string {
  if (item.hinhAnh && (item.hinhAnh.trim().startsWith('http') || item.hinhAnh.trim().startsWith('data:image/'))) {
    return item.hinhAnh;
  }
  
  const name = (item.ten || '').toLowerCase();
  const group = (item.nhom || '').toLowerCase();
  
  if (name.includes('phòng mổ') || name.includes('ptv') || name.includes('áo choàng') || name.includes('đồng phục') || name.includes('blouse') || name.includes('đầm') || name.includes('váy') || name.includes('quần') || group.includes('trang phục')) {
    return 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('gối') || name.includes('mền') || name.includes('ruột') || group.includes('mền')) {
    return 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('khăn') || group.includes('khăn')) {
    return 'https://images.unsplash.com/photo-1546554137-f86b9593a222?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('drap') || name.includes('săng') || name.includes('sheet') || group.includes('drap') || group.includes('săng') || group.includes('sheet')) {
    return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('túi') || group.includes('túi')) {
    return 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';
  }
  
  return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80';
}

interface InventoryScreenProps {
  items: LinenItem[];
  detailAllocations: Record<string, [string, number][]>;
  temporaryCleanStore?: Record<string, number>;
  temporaryDirtyStore?: Record<string, number>;
  temporaryCompanyDirtyStore?: Record<string, number>;
  onAddItem: (item: LinenItem) => void;
  onEditItem: (origMa: string, updatedItem: LinenItem) => void;
  onDeleteItem: (ma: string) => void;
  onImportBackup: (file: File) => void;
  onExportBackup: () => void;
  onInitTest: () => void;
  onViewAllocations: (ma: string, ten: string) => void;
  onUpdateInventory?: (updatedItems: LinenItem[], updatedAllocations: Record<string, [string, number][]>) => void;
  isAdmin: boolean;
  departments?: string[];
  userDept?: string;
}

export default function InventoryScreen({
  items,
  detailAllocations,
  temporaryCleanStore = {},
  temporaryDirtyStore = {},
  temporaryCompanyDirtyStore = {},
  onAddItem,
  onEditItem,
  onDeleteItem,
  onImportBackup,
  onExportBackup,
  onInitTest,
  onViewAllocations,
  onUpdateInventory,
  isAdmin,
  departments = DEPARTMENTS,
  userDept
}: InventoryScreenProps) {
  const isWardUser = useMemo(() => {
    return !isAdmin && !!userDept && userDept !== 'Kho trung tâm' && userDept !== 'Tất cả' && userDept !== 'Tất cả (Không giới hạn)';
  }, [isAdmin, userDept]);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(() => {
    if (userDept && userDept !== 'Kho trung tâm' && userDept !== 'Tất cả' && userDept !== 'Tất cả (Không giới hạn)') {
      const normalizedUserDept = userDept.replace(/^Khoa\s+/i, '');
      const matched = (departments || DEPARTMENTS).find(d => d.toLowerCase() === normalizedUserDept.toLowerCase() || normalizedUserDept.toLowerCase().includes(d.toLowerCase()));
      return matched || userDept;
    }
    return '';
  });

  useEffect(() => {
    if (isWardUser && userDept && userDept !== 'Kho trung tâm' && userDept !== 'Tất cả' && userDept !== 'Tất cả (Không giới hạn)') {
      const normalizedUserDept = userDept.replace(/^Khoa\s+/i, '');
      const matched = (departments || DEPARTMENTS).find(d => d.toLowerCase() === normalizedUserDept.toLowerCase() || normalizedUserDept.toLowerCase().includes(d.toLowerCase()));
      setSelectedLocation(matched || userDept);
    } else if (!isWardUser && selectedLocation && selectedLocation !== 'kho' && !departments?.includes(selectedLocation)) {
      setSelectedLocation('');
    }
  }, [isWardUser, userDept, departments]);

  // Determine which specific department to focus on for display
  const focusDept = useMemo(() => {
    if (selectedLocation && selectedLocation !== 'kho') {
      return selectedLocation;
    }
    // Fallback to userDept if it is a valid department (not central / all)
    if (userDept && userDept !== 'Kho trung tâm' && userDept !== 'Tất cả' && userDept !== 'Tất cả (Không giới hạn)') {
      // Handle "Khoa Cấp cứu đa khoa" vs "Cấp cứu đa khoa" naming mismatch
      const normalizedUserDept = userDept.replace(/^Khoa\s+/i, '');
      const matched = (departments || DEPARTMENTS).find(d => d.toLowerCase() === normalizedUserDept.toLowerCase() || normalizedUserDept.toLowerCase().includes(d.toLowerCase()));
      if (matched) return matched;
      return userDept;
    }
    return '';
  }, [selectedLocation, userDept, departments]);

  // Sorting
  const [sortCol, setSortCol] = useState<'ma' | 'ten' | 'nhom' | 'kc' | 'kp' | 'tong'>('ma');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals local state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [showDelModal, setShowDelModal] = useState<string | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<LinenItem | null>(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imageUploadType, setImageUploadType] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleCloseDetailModal = () => {
    setSelectedDetailItem(null);
    setIsEditingImage(false);
    setNewImageUrl('');
    setImageUploadType('upload');
    setIsDragging(false);
    setUploadError('');
  };

  const handleImageFileSelect = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Vui lòng chỉ tải các file hình ảnh (JPG, JPEG, PNG, WEBP).');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Kích thước ảnh tối đa là 3MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setNewImageUrl(e.target.result as string);
      }
    };
    reader.onerror = () => {
      setUploadError('Có lỗi xảy ra khi đọc file. Vui lòng thử lại.');
    };
    reader.readAsDataURL(file);
  };

  // Excel Importer states
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelError, setExcelError] = useState('');
  const [excelParsedData, setExcelParsedData] = useState<{ items: LinenItem[]; allocations: Record<string, [string, number][]> } | null>(null);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelImportMode, setExcelImportMode] = useState<'overwrite' | 'merge'>('overwrite');

  // Form states for Add
  const [addMa, setAddMa] = useState('');
  const [addTen, setAddTen] = useState('');
  const [addNhom, setAddNhom] = useState('');
  const [addMin, setAddMin] = useState(20);
  const [addHinhAnh, setAddHinhAnh] = useState('');
  const [addError, setAddError] = useState('');

  // Form states for Edit
  const [editMa, setEditMa] = useState('');
  const [editTen, setEditTen] = useState('');
  const [editNhom, setEditNhom] = useState('');
  const [editMin, setEditMin] = useState(20);
  const [editKc, setEditKc] = useState(0);
  const [editHinhAnh, setEditHinhAnh] = useState('');
  const [editError, setEditError] = useState('');

  // Auto calculate total for each item
  const itemTotals = useMemo(() => {
    return items.map(item => {
      const kpSum = (detailAllocations[item.ma] || []).reduce((sum, r) => sum + (r[1] || 0), 0);
      const total = item.kc + kpSum;
      let status: 'ok' | 'warn' | 'err' = 'ok';
      if (total === 0) status = 'err';
      else if (total <= item.mn) status = 'warn';

      return {
        ...item,
        kp: kpSum,
        tong: total,
        status
      };
    });
  }, [items, detailAllocations]);

  // Filter products list based on search/group/location
  const filteredItems = useMemo(() => {
    let list = [...itemTotals];

    // Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => d.ma.toLowerCase().includes(q) || d.ten.toLowerCase().includes(q));
    }

    // Category / group filter
    if (selectedGroup) {
      list = list.filter(d => d.nhom === selectedGroup);
    }

    // Location / department filter
    if (selectedLocation) {
      if (selectedLocation === 'kho') {
        list = list.filter(d => d.kc > 0);
      } else {
        list = list.filter(d => (detailAllocations[d.ma] || []).some(alloc => alloc[0] === selectedLocation && alloc[1] > 0));
      }
    }

    return list;
  }, [itemTotals, searchQuery, selectedGroup, selectedLocation, detailAllocations]);

  // Compute overall statistics based on the filtered list of items
  const stats = useMemo(() => {
    if (isWardUser) {
      const wardItems = filteredItems.filter(d => {
        const alloc = (detailAllocations[d.ma] || []).find(a => a[0] === selectedLocation);
        return alloc && alloc[1] > 0;
      });
      const totalItems = wardItems.length;
      const totalKC = wardItems.reduce((s, d) => s + d.kc, 0);
      const totalKP = filteredItems.reduce((sum, d) => {
        const alloc = (detailAllocations[d.ma] || []).find(a => a[0] === selectedLocation);
        return sum + (alloc ? alloc[1] : 0);
      }, 0);
      return { totalItems, totalKC, totalKP, errCount: 0, warnCount: 0, okCount: 0 };
    }

    const totalItems = filteredItems.length;
    const totalKC = filteredItems.reduce((s, d) => s + d.kc, 0);
    const totalKP = filteredItems.reduce((s, d) => s + d.kp, 0);
    const errCount = filteredItems.filter(d => d.status === 'err').length;
    const warnCount = filteredItems.filter(d => d.status === 'warn').length;
    const okCount = filteredItems.filter(d => d.status === 'ok').length;

    return { totalItems, totalKC, totalKP, errCount, warnCount, okCount };
  }, [filteredItems, isWardUser, selectedLocation, detailAllocations]);

  // Handle column sorting click
  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  // Sort filtered products list
  const filteredAndSortedItems = useMemo(() => {
    const list = [...filteredItems];

    // Sort order application
    list.sort((a, b) => {
      let valA: any = a[sortCol];
      let valB: any = b[sortCol];

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortAsc ? valA - valB : valB - valA;
      }
    });

    return list;
  }, [filteredItems, sortCol, sortAsc]);

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

        // Detect header row (scan first 10 rows for the one with most keyword/dept matches)
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

        // Smart fallbacks
        if (colMa === -1) {
          colMa = 0;
        }
        if (colTen === -1) {
          colTen = 1;
        }

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
            item = { ma, ten, nhom, kc, kp: 0, mn: 5 };
            parsedItemsMap.set(ma, item);
          } else {
            item.kc += kc;
          }

          if (!parsedAllocations[ma]) {
            parsedAllocations[ma] = [];
          }

          // Matrix/Pivot column mode
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
          }
          // Flat list mode
          else if (colDept !== -1 && colQty !== -1) {
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

  const handleExcelImportConfirm = () => {
    if (!excelParsedData || !onUpdateInventory) return;

    if (excelImportMode === 'overwrite') {
      onUpdateInventory(excelParsedData.items, excelParsedData.allocations);
    } else {
      // Merge mode
      const mergedItems = [...items];
      const mergedAllocations = { ...detailAllocations };

      excelParsedData.items.forEach(newItem => {
        const existingIdx = mergedItems.findIndex(i => i.ma === newItem.ma);
        if (existingIdx !== -1) {
          mergedItems[existingIdx] = {
            ...mergedItems[existingIdx],
            kc: newItem.kc,
            nhom: newItem.nhom !== 'Khác' ? newItem.nhom : mergedItems[existingIdx].nhom
          };
        } else {
          mergedItems.push(newItem);
        }

        // update allocations
        mergedAllocations[newItem.ma] = excelParsedData.allocations[newItem.ma] || [];
      });

      onUpdateInventory(mergedItems, mergedAllocations);
    }

    setShowExcelImportModal(false);
    setExcelParsedData(null);
    setExcelFile(null);
    setExcelFileName('');
  };

  // Download Excel Template ordered by department
  const downloadExcelTemplate = () => {
    // Find primary department for each item (the one with the largest current quantity)
    const getPrimaryDept = (itemCode: string) => {
      const allocs = detailAllocations[itemCode] || [];
      if (allocs.length === 0) return '';
      let maxAlloc = allocs[0];
      allocs.forEach(a => {
        if (a[1] > maxAlloc[1]) {
          maxAlloc = a;
        }
      });
      return maxAlloc[0];
    };

    // Sort items by their primary department, then by code
    const sortedItems = [...items].sort((a, b) => {
      const deptA = getPrimaryDept(a.ma);
      const deptB = getPrimaryDept(b.ma);
      if (deptA === deptB) {
        return a.ma.localeCompare(b.ma);
      }
      if (!deptA) return 1;
      if (!deptB) return -1;
      const idxA = (departments || DEPARTMENTS).indexOf(deptA);
      const idxB = (departments || DEPARTMENTS).indexOf(deptB);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    // Construct headers: Mã Đồ Vải, Tên Đồ Vải, Nhóm Đồ Vải, Khoa phân bổ chính, Kho chính, and all active departments
    const activeDepts = departments || DEPARTMENTS;
    const sheetHeaders = ['Mã Đồ Vải', 'Tên Đồ Vải', 'Nhóm Đồ Vải', 'Khoa phân bổ chính', 'Kho chính', ...activeDepts];

    // Construct rows
    const sheetData: any[][] = [sheetHeaders];
    sortedItems.forEach(item => {
      const primaryDept = getPrimaryDept(item.ma);
      const row = [
        item.ma,
        item.ten,
        item.nhom,
        primaryDept || 'Kho trung tâm',
        item.kc || 0
      ];
      activeDepts.forEach(dept => {
        const alloc = (detailAllocations[item.ma] || []).find(([d]) => d === dept);
        row.push(alloc ? alloc[1] : 0);
      });
      sheetData.push(row);
    });

    // Generate Workbook using SheetJS
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Set columns width
    const wscols = [
      { wch: 12 }, // Mã Đồ Vải
      { wch: 35 }, // Tên Đồ Vải
      { wch: 22 }, // Nhóm Đồ Vải
      { wch: 22 }, // Khoa phân bổ chính
      { wch: 12 }, // Kho chính
      ...activeDepts.map(() => ({ wch: 18 })) // Departments
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Danh_Muc_Do_Vai");

    // Save File
    XLSX.writeFile(wb, `HospLinenPro_MauNhapKho_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Trigger Excel/CSV export
  const exportToCSV = () => {
    const header = ['Mã Đồ Vải', 'Tên Đồ Vải', 'Nhóm Đồ Vải', 'Tồn Kho Chính', 'Tồn Khoa Phòng', 'Tổng Tồn Viện', 'Tồn Tối Thiểu', 'Trạng Thái'];
    const rows = itemTotals.map(d => [
      d.ma,
      d.ten,
      d.nhom,
      d.kc,
      d.kp,
      d.tong,
      d.mn,
      d.status === 'ok' ? 'Bình thường' : d.status === 'warn' ? 'Tồn thấp' : 'Hết hàng'
    ]);

    const csvContent = "\uFEFF" + [header.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `HospLinenPro_TonKho_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export full department and central store inventory matrix to Excel
  const handleExportFullInventoryExcel = () => {
    const activeDepts = departments || DEPARTMENTS;
    const sheetHeaders = [
      'Mã Đồ Vải',
      'Tên Đồ Vải',
      'Nhóm Đồ Vải',
      'Tồn Kho Chính (Kho Trung Tâm)',
      ...activeDepts,
      'Tổng Tồn Toàn Viện'
    ];

    const sheetData: any[][] = [sheetHeaders];
    
    items.forEach(item => {
      const row: any[] = [
        item.ma,
        item.ten,
        item.nhom,
        item.kc || 0
      ];
      
      let sumDepts = 0;
      activeDepts.forEach(dept => {
        const alloc = (detailAllocations[item.ma] || []).find(([d]) => d === dept);
        const qty = alloc ? alloc[1] : 0;
        row.push(qty);
        sumDepts += qty;
      });
      
      const total = (item.kc || 0) + sumDepts;
      row.push(total);
      
      sheetData.push(row);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    const wscols = [
      { wch: 12 }, // Mã
      { wch: 30 }, // Tên
      { wch: 20 }, // Nhóm
      { wch: 25 }, // Kho chính
      ...activeDepts.map(() => ({ wch: 18 })), // Each department
      { wch: 22 }  // Total
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Ton_Kho_Do_Vai");
    
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `BaoCao_TonKho_DoVai_ToanVien_${dateStr}.xlsx`);
  };

  // Add modal submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const formattedMa = addMa.trim().toUpperCase();
    const formattedTen = addTen.trim().toUpperCase();

    if (!formattedMa || !formattedTen || !addNhom) {
      setAddError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    if (items.some(i => i.ma === formattedMa)) {
      setAddError('Mã đồ vải này đã tồn tại trong danh mục.');
      return;
    }

    onAddItem({
      ma: formattedMa,
      ten: formattedTen,
      nhom: addNhom,
      kc: 0,
      kp: 0,
      mn: addMin,
      hinhAnh: addHinhAnh.trim() || undefined
    });

    // Reset and close
    setAddMa('');
    setAddTen('');
    setAddNhom('');
    setAddMin(20);
    setAddHinhAnh('');
    setShowAddModal(false);
  };

  // Open Edit Dialog
  const handleOpenEdit = (item: LinenItem) => {
    setShowEditModal(item.ma);
    setEditMa(item.ma);
    setEditTen(item.ten);
    setEditNhom(item.nhom);
    setEditMin(item.mn);
    setEditKc(item.kc);
    setEditHinhAnh(item.hinhAnh || '');
    setEditError('');
  };

  // Edit modal submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    const formattedMa = editMa.trim().toUpperCase();
    const formattedTen = editTen.trim().toUpperCase();

    if (!formattedMa || !formattedTen || !editNhom) {
      setEditError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    if (formattedMa !== showEditModal && items.some(i => i.ma === formattedMa)) {
      setEditError('Mã đồ vải mới đã tồn tại.');
      return;
    }

    onEditItem(showEditModal!, {
      ma: formattedMa,
      ten: formattedTen,
      nhom: editNhom,
      kc: editKc,
      kp: 0,
      mn: editMin,
      hinhAnh: editHinhAnh.trim() || undefined
    });

    setShowEditModal(null);
  };

  // Handle Delete trigger
  const handleDeleteConfirm = () => {
    if (showDelModal) {
      onDeleteItem(showDelModal);
      setShowDelModal(null);
    }
  };

  return (
    <div className="fade-in space-y-6">
      
      {/* Title & Secondary actions bar */}
      <div className="border-b border-[#1A1A1A] pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-serif font-black italic text-2xl tracking-tight text-[#1A1A1A]">Danh Mục & Quản Lý Tồn Kho</h2>
        </div>
        
        {/* Actions buttons */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Export full inventory button (Available to all roles) */}
          <button
            onClick={handleExportFullInventoryExcel}
            className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 border border-[#1A1A1A] bg-[#16A34A] text-[#F5F2ED] text-[11px] font-bold uppercase tracking-widest hover:bg-[#14833D] transition-colors cursor-pointer font-sans"
            title="Xuất bảng ma trận tồn kho của tất cả khoa phòng và kho chính ra Excel"
          >
            <Download size={13} />
            Xuất Tồn Kho (Excel)
          </button>

          {/* Import Excel button (Available to Admins only) */}
          {isAdmin && (
            <button
              onClick={() => setShowExcelImportModal(true)}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 border border-[#1A1A1A] bg-[#2563EB]/10 text-[#1D4ED8] text-[11px] font-bold uppercase tracking-widest hover:bg-[#2563EB] hover:text-white transition-colors cursor-pointer font-sans"
              title="Nhập số liệu tồn kho từ file Excel"
            >
              <Upload size={13} />
              Nhập Tồn Kho (Excel)
            </button>
          )}

          {isAdmin && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 border border-[#1A1A1A] bg-[#1A1A1A] text-[11px] font-bold uppercase tracking-widest text-[#F5F2ED] hover:bg-[#C4432A] hover:border-[#C4432A] transition-colors"
              >
                <Plus size={14} />
                Thêm Đồ Vải
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ hệ thống về số liệu tồn kho chính thức, xóa hết lịch sử phiếu giao nhận đồ vải và tồn kho dơ sạch tạm?')) {
                    onInitTest();
                  }
                }}
                className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 border border-[#1A1A1A] bg-[#F5F2ED] text-[#1A1A1A] text-[11px] font-bold uppercase tracking-widest hover:bg-[#C4432A] hover:text-white transition-colors"
                title="Khôi phục tồn kho chính thức, xóa lịch sử phiếu giao nhận đồ vải & tồn kho dơ sạch tạm"
              >
                🔄 Reset Tồn Kho & Xóa Phiếu
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid Stats Cards */}
      <div className={isWardUser ? "grid grid-cols-3 gap-px bg-[#1A1A1A] border border-[#1A1A1A] w-full" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-[#1A1A1A] border border-[#1A1A1A] w-full"}>
        <div className="bg-[#F5F2ED] py-2 px-3 text-left">
          <span className="block text-[8px] uppercase tracking-wider font-bold text-[#8C8984] mb-0.5">MẶT HÀNG</span>
          <div className="font-serif font-black text-2xl text-[#1A1A1A] leading-tight">{stats.totalItems}</div>
          <span className="text-[9px] text-[#8C8984] block mt-0.5">{isWardUser ? "Có tồn kho" : "Danh mục"}</span>
        </div>
        <div className="bg-[#F5F2ED] py-2 px-3 text-left">
          <span className="block text-[8px] uppercase tracking-wider font-bold text-[#8C8984] mb-0.5">KHO CHÍNH</span>
          <div className="font-serif font-black text-2xl text-[#1A1A1A] leading-tight">{stats.totalKC.toLocaleString()}</div>
          <span className="text-[9px] text-[#8C8984] block mt-0.5 font-mono">Kho trung tâm</span>
        </div>
        <div className="bg-[#F5F2ED] py-2 px-3 text-left">
          <span className="block text-[8px] uppercase tracking-wider font-bold text-[#8C8984] mb-0.5">KHOA PHÒNG</span>
          <div className="font-serif font-black text-2xl text-[#1A1A1A] leading-tight">{stats.totalKP.toLocaleString()}</div>
          <span className="text-[9px] text-[#8C8984] block mt-0.5">
            {isWardUser ? `Tại ${selectedLocation}` : "Đang phân bổ"}
          </span>
        </div>
        {!isWardUser && (
          <>
            <div className="bg-[#F5F2ED] py-2 px-3 text-left border-t lg:border-t-0 border-[#1A1A1A]">
              <span className="block text-[8px] uppercase tracking-wider font-bold text-[#8C8984] mb-0.5">BÌNH THƯỜNG</span>
              <div className="font-serif font-black text-2xl text-[#16A34A] leading-tight">{stats.okCount}</div>
              <span className="text-[9px] text-[#8C8984] block mt-0.5">Đạt yêu cầu</span>
            </div>
            <div className="bg-[#F5F2ED] py-2 px-3 text-left border-t lg:border-t-0 border-[#1A1A1A]">
              <span className="block text-[8px] uppercase tracking-wider font-bold text-[#8C8984] mb-0.5">CẢNH BÁO</span>
              <div className="font-serif font-black text-2xl text-[#D97706] leading-tight">{stats.warnCount}</div>
              <span className="text-[9px] text-[#8C8984] block mt-0.5">Dưới tối thiểu</span>
            </div>
            <div className="bg-[#F5F2ED] py-2 px-3 text-left border-t lg:border-t-0 border-[#1A1A1A]">
              <span className="block text-[8px] uppercase tracking-wider font-bold text-[#8C8984] mb-0.5">HẾT HÀNG</span>
              <div className="font-serif font-black text-2xl text-[#C4432A] leading-tight">{stats.errCount}</div>
              <span className="text-[9px] text-[#8C8984] block mt-0.5">Chạm mức 0</span>
            </div>
          </>
        )}
      </div>

      {/* Table filter and toolbar */}
      <div className="border border-[#1A1A1A] bg-[#EBE8E3] py-1.5 px-3 flex flex-wrap gap-2 items-center w-full">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm mã hoặc tên đồ vải..."
            className="w-full bg-[#F5F2ED] border border-[#1A1A1A] py-1 pl-7 pr-3 text-[11px] focus:outline-none focus:border-[#C4432A]"
          />
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C8984]" />
        </div>

        {/* Group Filter */}
        <div className="w-[130px]">
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="w-full bg-[#F5F2ED] border border-[#1A1A1A] py-1 px-2 text-[11px] focus:outline-none"
          >
            <option value="">Tất cả nhóm</option>
            {LINEN_GROUPS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div className="w-[130px]">
          <select
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
            className="w-full bg-[#F5F2ED] border border-[#1A1A1A] py-1 px-2 text-[11px] focus:outline-none disabled:opacity-80"
            disabled={isWardUser}
          >
            {isWardUser ? (
              <option value={selectedLocation}>{selectedLocation}</option>
            ) : (
              <>
                <option value="">Tất cả vị trí</option>
                <option value="kho">Chỉ tồn Kho chính</option>
                <optgroup label="── Theo Khoa Lâm Sàng ──">
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </optgroup>
              </>
            )}
          </select>
        </div>

        <div className="text-[10px] font-mono text-[#8C8984] ml-auto">
          Đang hiển thị {filteredAndSortedItems.length} dòng
        </div>
      </div>

      {/* Main Table on Desktop / Card List on Mobile */}
      <div className="hidden md:block border border-[#1A1A1A] overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#EBE8E3] border-b border-[#1A1A1A] font-mono text-[10px] uppercase tracking-widest text-[#1A1A1A]">
              <th onClick={() => handleSort('ma')} className="py-3 px-4 cursor-pointer hover:bg-[#D9D6D0] w-24">
                Mã {sortCol === 'ma' ? (sortAsc ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('ten')} className="py-3 px-4 cursor-pointer hover:bg-[#D9D6D0]">
                Tên đồ vải {sortCol === 'ten' ? (sortAsc ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('nhom')} className="py-3 px-4 cursor-pointer hover:bg-[#D9D6D0] w-48">
                Nhóm loại {sortCol === 'nhom' ? (sortAsc ? '↑' : '↓') : ''}
              </th>
              {!isWardUser && (
                <th onClick={() => handleSort('kc')} className="py-3 px-4 cursor-pointer hover:bg-[#D9D6D0] text-right w-32">
                  Kho chính {sortCol === 'kc' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              )}
              {!isWardUser && (
                <th className="py-3 px-4 text-right w-32 bg-emerald-50/25 text-emerald-800 font-bold">
                  Kho tạm
                </th>
              )}
              {focusDept ? (
                <th className="py-3 px-4 text-right w-40">
                  <div className="flex flex-col items-end">
                    <span>Tại {focusDept}</span>
                    <span className="text-[8px] font-normal opacity-70 lowercase">Tổng các KP</span>
                  </div>
                </th>
              ) : (
                <th className="py-3 px-4 text-right w-32">Khoa phòng</th>
              )}
              {!isWardUser && (
                <th onClick={() => handleSort('tong')} className="py-3 px-4 cursor-pointer hover:bg-[#D9D6D0] text-right w-32">
                  Tổng viện {sortCol === 'tong' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              )}
              {!isWardUser && <th className="py-3 px-4 text-center w-36">Trạng thái</th>}
              {isAdmin && <th className="py-3 px-4 text-center w-32">Hành động</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A] text-xs">
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : (isWardUser ? 4 : 7)} className="py-8 text-center text-[#8C8984] bg-[#F5F2ED]">
                  Không tìm thấy kết quả nào trùng khớp.
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map(d => (
                <tr key={d.ma} className="hover:bg-[#EBE8E3] transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#2563EB]">{d.ma}</td>
                  <td className="py-2.5 px-4 font-medium text-[#1A1A1A]">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => setSelectedDetailItem(d)} 
                        className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#1A1A1A]/10 bg-stone-100 flex-shrink-0 cursor-zoom-in group/thumb shadow-2xs hover:border-[#2563EB] hover:ring-2 hover:ring-blue-100 transition-all"
                        title="Bấm để xem hình ảnh và thông tin chi tiết"
                      >
                        <img 
                          src={getLinenImage(d)} 
                          alt={d.ten} 
                          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye size={12} />
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedDetailItem(d)}
                        className="text-left font-bold text-[#1A1A1A] hover:text-[#2563EB] hover:underline transition-colors focus:outline-none"
                        title="Bấm để xem hình ảnh và thông tin chi tiết"
                      >
                        {d.ten}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-[#8C8984] text-[11px]">{d.nhom}</td>
                  {!isWardUser && <td className="py-2.5 px-4 text-right font-mono font-medium">{d.kc.toLocaleString()}</td>}
                  {!isWardUser && (
                    <td className="py-2.5 px-4 text-right">
                      {(() => {
                        const qtyDirty = temporaryDirtyStore[d.ma] || 0;
                        const qtyCompany = temporaryCompanyDirtyStore[d.ma] || 0;
                        const qtyClean = temporaryCleanStore[d.ma] || 0;
                        
                        if (qtyDirty === 0 && qtyCompany === 0 && qtyClean === 0) {
                          return <span className="text-[#8C8984]/50">—</span>;
                        }
                        
                        return (
                          <div className="flex flex-col items-end text-[10px] gap-0.5 leading-tight font-sans">
                            {qtyDirty > 0 && (
                              <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/50 font-medium">
                                Dơ BV: <b className="font-mono text-xs font-black">{qtyDirty.toLocaleString()}</b>
                              </span>
                            )}
                            {qtyCompany > 0 && (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/50 font-medium">
                                Dơ Cty: <b className="font-mono text-xs font-black">{qtyCompany.toLocaleString()}</b>
                              </span>
                            )}
                            {qtyClean > 0 && (
                              <span className="text-emerald-700 bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-100/50 font-medium">
                                Sạch tạm: <b className="font-mono text-xs font-black">{qtyClean.toLocaleString()}</b>
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  )}
                  <td className="py-2.5 px-4 text-right">
                    {focusDept ? (
                      (() => {
                        const deptAlloc = (detailAllocations[d.ma] || []).find(alloc => alloc[0] === focusDept);
                        const deptQty = deptAlloc ? deptAlloc[1] : 0;
                        return (
                          <div className="flex flex-col items-end">
                            {deptQty > 0 ? (
                              <button
                                onClick={() => onViewAllocations(d.ma, d.ten)}
                                className="inline-flex items-center gap-1 text-[#2563EB] hover:text-[#1A1A1A] hover:underline font-mono font-bold"
                                title={`Xem chi tiết tất cả vị trí (Tồn tại ${focusDept}: ${deptQty})`}
                              >
                                <MapPin size={11} />
                                {deptQty.toLocaleString()}
                              </button>
                            ) : (
                              <span className="text-[#8C8984] font-mono">—</span>
                            )}
                            {!isWardUser && d.kp > deptQty && (
                              <span className="text-[10px] text-[#8C8984] font-mono mt-0.5">
                                Tổng KP: {d.kp.toLocaleString()}
                              </span>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      d.kp > 0 ? (
                        <button
                          onClick={() => onViewAllocations(d.ma, d.ten)}
                          className="inline-flex items-center gap-1 text-[#2563EB] hover:text-[#1A1A1A] hover:underline font-mono font-semibold"
                          title="Bấm để xem chi tiết vị trí phân bổ"
                        >
                          <MapPin size={11} />
                          {d.kp.toLocaleString()}
                        </button>
                      ) : (
                        <span className="text-[#8C8984] font-mono">—</span>
                      )
                    )}
                  </td>
                  {!isWardUser && <td className="py-2.5 px-4 text-right font-bold font-mono">{d.tong.toLocaleString()}</td>}
                  {!isWardUser && (
                    <td className="py-2.5 px-4 text-center">
                      {d.status === 'ok' ? (
                        <span className="inline-block bg-[#D1FAE5] text-[#065F46] font-bold text-[9px] tracking-wider uppercase px-2.5 py-1">
                          ✔ Ổn định
                        </span>
                      ) : d.status === 'warn' ? (
                        <span className="inline-block bg-[#FEF3C7] text-[#92400E] font-bold text-[9px] tracking-wider uppercase px-2.5 py-1">
                          ⚠ Tồn thấp
                        </span>
                      ) : (
                        <span className="inline-block bg-[#FEE2E2] text-[#991B1B] font-bold text-[9px] tracking-wider uppercase px-2.5 py-1">
                          ✕ Hết hàng
                        </span>
                      )}
                    </td>
                  )}
                  {isAdmin && (
                    <td className="py-2.5 px-4 text-center">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(d)}
                          className="p-1 text-[#2563EB] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-colors"
                          title="Sửa thông tin"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => setShowDelModal(d.ma)}
                          className="p-1 text-[#C4432A] hover:bg-[#C4432A] hover:text-[#F5F2ED] transition-colors"
                          title="Xóa mặt hàng"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card-Based List (Hidden on desktop) */}
      <div className="block md:hidden space-y-3">
        {filteredAndSortedItems.length === 0 ? (
          <div className="py-8 text-center text-[#8C8984] bg-white border border-black/10 rounded-2xl">
            Không tìm thấy kết quả nào trùng khớp.
          </div>
        ) : (
          filteredAndSortedItems.map(d => {
            if (focusDept) {
              const deptAlloc = (detailAllocations[d.ma] || []).find(alloc => alloc[0] === focusDept);
              const deptQty = deptAlloc ? deptAlloc[1] : 0;
              return (
                <div key={d.ma} className="bg-white border border-black/10 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
                  {/* Left Column: Image & Linen Details */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => setSelectedDetailItem(d)} 
                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-black/10 bg-stone-100 flex-shrink-0 cursor-zoom-in"
                      >
                        <img 
                          src={getLinenImage(d)} 
                          alt={d.ten} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-[#2563EB] text-xs">{d.ma}</span>
                          {!isWardUser && (
                            <div>
                              {d.status === 'ok' ? (
                                <span className="inline-block bg-[#D1FAE5] text-[#065F46] font-bold text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded">
                                  ✔ Ổn định
                                </span>
                              ) : d.status === 'warn' ? (
                                <span className="inline-block bg-[#FEF3C7] text-[#92400E] font-bold text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded">
                                  ⚠ Tồn thấp
                                </span>
                              ) : (
                                <span className="inline-block bg-[#FEE2E2] text-[#991B1B] font-bold text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded">
                                  ✕ Hết hàng
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <h4 
                          onClick={() => setSelectedDetailItem(d)}
                          className="font-bold text-stone-900 text-sm leading-snug hover:text-blue-600 cursor-pointer transition-colors"
                        >
                          {d.ten}
                        </h4>
                        <span className="text-[#8C8984] text-[10px] uppercase font-semibold tracking-wider block">{d.nhom}</span>
                      </div>
                    </div>
                    
                    {/* If Admin / Linen staff, show overall hospital stocks as mini indicators */}
                    {!isWardUser && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-dashed border-stone-100 text-[10px] text-stone-500">
                        <span>Kho chính: <b className="font-mono text-stone-800">{d.kc.toLocaleString()}</b></span>
                        <span>Kho tạm: <b className="font-mono text-emerald-700">{(() => {
                          const qtyDirty = temporaryDirtyStore[d.ma] || 0;
                          const qtyCompany = temporaryCompanyDirtyStore[d.ma] || 0;
                          const qtyClean = temporaryCleanStore[d.ma] || 0;
                          const details = [];
                          if (qtyDirty > 0) details.push(`Dơ BV: ${qtyDirty}`);
                          if (qtyCompany > 0) details.push(`Dơ Cty: ${qtyCompany}`);
                          if (qtyClean > 0) details.push(`Sạch tạm: ${qtyClean}`);
                          return details.length > 0 ? details.join(', ') : '0';
                        })()}</b></span>
                        <span>Tổng viện: <b className="font-mono text-indigo-900">{d.tong.toLocaleString()}</b></span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Quantity */}
                  <div className="text-right shrink-0 flex flex-col items-end justify-center bg-blue-50/50 border border-blue-100/30 rounded-xl px-3 py-2.5 min-w-[105px]">
                    <span className="text-[9px] font-black text-blue-800 uppercase tracking-wider block mb-1">
                      Tại {focusDept}
                    </span>
                    {deptQty > 0 ? (
                      <button
                        onClick={() => onViewAllocations(d.ma, d.ten)}
                        className="inline-flex items-center gap-1 text-[#2563EB] hover:text-blue-800 font-mono font-black text-lg active:scale-95 transition-transform"
                      >
                        <MapPin size={12} className="text-blue-500 shrink-0" />
                        {deptQty.toLocaleString()}
                      </button>
                    ) : (
                      <span className="text-[#8C8984] text-xs font-mono font-semibold">—</span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={d.ma} className="bg-white border border-black/10 rounded-2xl p-4 shadow-xs space-y-3">
                {/* Header inside card: Code and Status badge */}
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#2563EB] text-sm">{d.ma}</span>
                  {!isWardUser && (
                    <div>
                      {d.status === 'ok' ? (
                        <span className="inline-block bg-[#D1FAE5] text-[#065F46] font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded">
                          ✔ Ổn định
                        </span>
                      ) : d.status === 'warn' ? (
                        <span className="inline-block bg-[#FEF3C7] text-[#92400E] font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded">
                          ⚠ Tồn thấp
                        </span>
                      ) : (
                        <span className="inline-block bg-[#FEE2E2] text-[#991B1B] font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded">
                          ✕ Hết hàng
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Title & Group with Image thumbnail */}
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => setSelectedDetailItem(d)} 
                    className="relative w-12 h-12 rounded-lg overflow-hidden border border-black/10 bg-stone-100 flex-shrink-0 cursor-zoom-in"
                  >
                    <img 
                      src={getLinenImage(d)} 
                      alt={d.ten} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 
                      onClick={() => setSelectedDetailItem(d)}
                      className="font-bold text-stone-900 text-sm leading-snug hover:text-blue-600 cursor-pointer transition-colors"
                    >
                      {d.ten}
                    </h4>
                    <span className="text-[#8C8984] text-[10px] uppercase font-semibold tracking-wider block">{d.nhom}</span>
                  </div>
                </div>

                {/* Grid of details */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5">
                  {!isWardUser && (
                    <div className="bg-stone-50 p-2 rounded-xl">
                      <span className="block text-[9px] font-bold text-stone-400 uppercase">Kho chính</span>
                      <span className="text-xs font-mono font-bold text-stone-800">{d.kc.toLocaleString()}</span>
                    </div>
                  )}
                  {!isWardUser && (
                    <div className="bg-emerald-50/50 p-2 rounded-xl flex flex-col justify-between">
                      <span className="block text-[9px] font-bold text-emerald-800 uppercase">Kho tạm</span>
                      <div className="text-[10px] leading-tight font-sans text-stone-700 mt-1 flex flex-col gap-0.5">
                        {(() => {
                          const qtyDirty = temporaryDirtyStore[d.ma] || 0;
                          const qtyCompany = temporaryCompanyDirtyStore[d.ma] || 0;
                          const qtyClean = temporaryCleanStore[d.ma] || 0;
                          
                          if (qtyDirty === 0 && qtyCompany === 0 && qtyClean === 0) {
                            return <span className="text-stone-400 font-mono text-xs font-bold">0</span>;
                          }
                          
                          return (
                            <>
                              {qtyDirty > 0 && <span>Dơ BV: <b className="font-mono">{qtyDirty}</b></span>}
                              {qtyCompany > 0 && <span>Dơ Cty: <b className="font-mono">{qtyCompany}</b></span>}
                              {qtyClean > 0 && <span>Sạch: <b className="font-mono">{qtyClean}</b></span>}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-blue-50/40 p-2 rounded-xl">
                    <span className="block text-[9px] font-bold text-blue-800 uppercase">
                      Khoa phòng
                    </span>
                    <div>
                      {d.kp > 0 ? (
                        <button
                          onClick={() => onViewAllocations(d.ma, d.ten)}
                          className="inline-flex items-center gap-1 text-[#2563EB] font-mono font-semibold text-xs"
                        >
                          <MapPin size={10} />
                          {d.kp.toLocaleString()}
                        </button>
                      ) : (
                        <span className="text-[#8C8984] text-xs font-mono">—</span>
                      )}
                    </div>
                  </div>

                  {!isWardUser && (
                    <div className="bg-indigo-50/50 p-2 rounded-xl">
                      <span className="block text-[9px] font-bold text-indigo-800 uppercase">Tổng viện</span>
                      <span className="text-xs font-mono font-bold text-indigo-900">{d.tong.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Actions at bottom of card */}
                {isAdmin && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                    <button
                      onClick={() => handleOpenEdit(d)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                    >
                      <Edit size={12} />
                      <span>Sửa</span>
                    </button>
                    <button
                      onClick={() => setShowDelModal(d.ma)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                    >
                      <Trash2 size={12} />
                      <span>Xóa</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dialog: Add New Linen Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md border border-[#1A1A1A] bg-[#F5F2ED] p-1 fade-in">
            <div className="border border-[#1A1A1A] p-5">
              
              <div className="flex justify-between items-start mb-4 pb-2 border-b border-[#1A1A1A]">
                <div>
                  <h3 className="font-serif font-black text-lg text-[#1A1A1A]">Thêm Loại Đồ Vải Mới</h3>
                  <p className="text-[11px] text-[#8C8984]">Đăng ký mã mới cho hệ thống lưu hành</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-[#8C8984] hover:text-[#1A1A1A] text-lg font-bold">
                  &times;
                </button>
              </div>

              {addError && (
                <div className="mb-4 p-2.5 border border-[#C4432A] bg-[#FDF2F0] text-[11px] text-[#C4432A] font-semibold">
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Mã đồ vải <span className="text-[#C4432A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: DV053"
                    value={addMa}
                    onChange={e => setAddMa(e.target.value.toUpperCase())}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Nhóm loại <span className="text-[#C4432A]">*</span>
                  </label>
                  <select
                    required
                    value={addNhom}
                    onChange={e => setAddNhom(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  >
                    <option value="">-- Chọn nhóm phân loại --</option>
                    {LINEN_GROUPS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Tên đồ vải <span className="text-[#C4432A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: KHĂN PHÒNG MỔ XANH DƯƠNG"
                    value={addTen}
                    onChange={e => setAddTen(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Tồn an toàn tối thiểu (Mức cảnh báo)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addMin}
                    onChange={e => setAddMin(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Link hình ảnh (Tùy chọn)
                  </label>
                  <input
                    type="url"
                    placeholder="Nhập link ảnh (để trống hệ thống sẽ tự động tạo ảnh minh họa đẹp mắt)"
                    value={addHinhAnh}
                    onChange={e => setAddHinhAnh(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-[#1A1A1A] border-dashed">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase tracking-wider hover:bg-[#C4432A] hover:border-[#C4432A] border border-[#1A1A1A]"
                  >
                    Tạo mới
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Dialog: Edit Linen Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md border border-[#1A1A1A] bg-[#F5F2ED] p-1 fade-in">
            <div className="border border-[#1A1A1A] p-5">
              
              <div className="flex justify-between items-start mb-4 pb-2 border-b border-[#1A1A1A]">
                <div>
                  <h3 className="font-serif font-black text-lg text-[#1A1A1A]">Sửa Thông Tin Đồ Vải</h3>
                  <p className="text-[11px] text-[#8C8984]">Mã: {showEditModal}</p>
                </div>
                <button onClick={() => setShowEditModal(null)} className="text-[#8C8984] hover:text-[#1A1A1A] text-lg font-bold">
                  &times;
                </button>
              </div>

              {editError && (
                <div className="mb-4 p-2.5 border border-[#C4432A] bg-[#FDF2F0] text-[11px] text-[#C4432A] font-semibold">
                  {editError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Mã đồ vải <span className="text-[#C4432A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editMa}
                    onChange={e => setEditMa(e.target.value.toUpperCase())}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Nhóm loại <span className="text-[#C4432A]">*</span>
                  </label>
                  <select
                    required
                    value={editNhom}
                    onChange={e => setEditNhom(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  >
                    {LINEN_GROUPS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Tên đồ vải <span className="text-[#C4432A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTen}
                    onChange={e => setEditTen(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                      Cảnh báo tối thiểu
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editMin}
                      onChange={e => setEditMin(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                      Tồn Kho chính
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editKc}
                      onChange={e => setEditKc(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Link hình ảnh (Tùy chọn)
                  </label>
                  <input
                    type="url"
                    placeholder="Nhập link ảnh (để trống hệ thống sẽ tự động tạo ảnh minh họa đẹp mắt)"
                    value={editHinhAnh}
                    onChange={e => setEditHinhAnh(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-[#1A1A1A] border-dashed">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(null)}
                    className="px-4 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase tracking-wider hover:bg-[#C4432A] hover:border-[#C4432A] border border-[#1A1A1A]"
                  >
                    Cập nhật
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Dialog: Delete Confirm Modal */}
      {showDelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm border border-[#1A1A1A] bg-[#F5F2ED] p-1 fade-in">
            <div className="border border-[#1A1A1A] p-5">
              <div className="text-center mb-4">
                <AlertTriangle size={32} className="text-[#C4432A] mx-auto mb-2" />
                <h3 className="font-serif font-black text-lg text-[#1A1A1A]">Xác Nhận Xóa Đồ Vải</h3>
                <p className="text-xs text-[#8C8984] mt-1">Hành động này không thể hoàn tác.</p>
              </div>

              <div className="p-3 bg-[#FDF2F0] border border-[#C4432A] text-xs text-[#1A1A1A] mb-5 text-left">
                Bạn đang chuẩn bị xóa mặt hàng có mã <span className="font-mono font-bold text-[#C4432A]">{showDelModal}</span> khỏi danh mục. Toàn bộ thông tin tồn kho chính và lịch sử liên quan sẽ mất theo.
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDelModal(null)}
                  className="flex-1 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2 bg-[#C4432A] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#A9341F]"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Excel Import Modal */}
      {showExcelImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-4xl border border-[#1A1A1A] bg-[#F5F2ED] p-1 fade-in my-8">
            <div className="border border-[#1A1A1A] p-5">
              
              <div className="flex justify-between items-start border-b border-[#1A1A1A] pb-3 mb-4">
                <div>
                  <h3 className="font-serif font-black text-lg text-[#1A1A1A] flex items-center gap-2">
                    <FileSpreadsheet className="text-[#16A34A]" size={20} />
                    Nhập Số Liệu Tồn Kho Từ Excel/CSV
                  </h3>
                  <p className="text-[11px] text-[#8C8984]">Hỗ trợ file Excel .xlsx, .xls hoặc tệp .csv của khoa phòng</p>
                </div>
                <button
                  onClick={() => setShowExcelImportModal(false)}
                  className="p-1 hover:bg-[#EBE8E3] border border-transparent hover:border-[#1A1A1A] transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Instructions and File drag-drop area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="p-4 bg-[#EBE8E3]/60 border border-[#1A1A1A] text-xs space-y-2.5">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-[#1A1A1A] flex items-center gap-1.5">
                    <Info size={14} className="text-[#2563EB]" />
                    HƯỚNG DẪN ĐỊNH DẠNG FILE
                  </h4>
                  <p className="text-[#5B5854] leading-relaxed text-[11px]">
                    Hệ thống sẽ tự động quét các tiêu đề cột trong file Excel của bạn (không phân biệt hoa thường hay dấu tiếng Việt). File cần có các thông tin sau:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[#5B5854] text-[11px]">
                    <li><strong>Mã đồ vải:</strong> Cột <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#D9D6D0]">Mã vật tư</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#D9D6D0]">Mã</code> hoặc <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#D9D6D0]">Code</code>.</li>
                    <li><strong>Tên đồ vải:</strong> Cột <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#D9D6D0]">Tên vật tư</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#D9D6D0]">Tên đồ vải</code>.</li>
                    <li><strong>Kho chính:</strong> Số lượng tồn kho trung tâm (<code className="font-mono bg-white px-1 py-0.5 rounded border border-[#D9D6D0]">Kho chính</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#D9D6D0]">Tồn kho chính</code>).</li>
                  </ul>
                  <div className="pt-2 border-t border-[#D9D6D0] text-[#5B5854] text-[11px] leading-normal">
                    <strong>Định dạng cột khoa phòng (Bảng chéo - Matrix):</strong> Bạn chỉ cần đặt tiêu đề cột là tên khoa phòng trùng khớp trong hệ thống (Ví dụ: <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#D9D6D0]">NICU</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#D9D6D0]">Phòng sanh</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#D9D6D0]">Cấp cứu đa khoa</code>...). Số liệu trong cột sẽ tự động nạp thẳng vào khoa phòng tương ứng!
                  </div>
                </div>

                <div className="flex flex-col justify-center items-center border-2 border-dashed border-[#1A1A1A] bg-[#F5F2ED] p-6 hover:bg-[#EBE8E3]/30 transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelImportFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileUp size={40} className="text-[#16A34A] mb-3 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs uppercase tracking-wider text-[#1A1A1A] mb-1 text-center">
                    {excelFileName ? 'Chọn file khác...' : 'Kéo thả hoặc Click chọn File'}
                  </span>
                  <span className="text-[10px] text-[#8C8984]">
                    Hỗ trợ .xlsx, .xls, .csv
                  </span>
                  {excelFileName && (
                    <div className="mt-3 px-3 py-1.5 bg-[#16A34A]/10 border border-[#16A34A] text-[11px] font-mono text-[#14833D] font-bold rounded">
                      Đã chọn: {excelFileName}
                    </div>
                  )}
                </div>
              </div>

              {/* Error Alert */}
              {excelError && (
                <div className="mb-4 p-3 bg-[#FDF2F0] border border-[#C4432A] text-xs text-[#C4432A] flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{excelError}</span>
                </div>
              )}

              {/* Parsed Data Preview */}
              {excelParsedData && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-[#EBE8E3] border border-[#1A1A1A]">
                    <div className="text-xs text-[#1A1A1A]">
                      ✨ Đã nhận diện thành công: <strong className="text-[#16A34A]">{excelParsedData.items.length} dòng đồ vải</strong> từ file Excel.
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]">Chế độ nạp:</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExcelImportMode('overwrite')}
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-[#1A1A1A] transition-colors ${excelImportMode === 'overwrite' ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#1A1A1A] hover:bg-gray-100'}`}
                          title="Xóa hết số liệu và danh mục cũ, cài đặt danh sách mới hoàn toàn từ file Excel"
                        >
                          Xóa & Ghi đè mới
                        </button>
                        <button
                          type="button"
                          onClick={() => setExcelImportMode('merge')}
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-[#1A1A1A] transition-colors ${excelImportMode === 'merge' ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#1A1A1A] hover:bg-gray-100'}`}
                          title="Cập nhật số lượng của vật tư có trong file, giữ nguyên các vật tư khác"
                        >
                          Cộng dồn / Cập nhật
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#1A1A1A] max-h-56 overflow-auto bg-white">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-[#1A1A1A] text-[#F5F2ED] uppercase tracking-wider font-mono text-[9px] sticky top-0 z-10">
                        <tr>
                          <th className="p-2 border border-[#1A1A1A]">Mã</th>
                          <th className="p-2 border border-[#1A1A1A]">Tên đồ vải</th>
                          <th className="p-2 border border-[#1A1A1A]">Nhóm</th>
                          <th className="p-2 border border-[#1A1A1A] text-right">Kho Chính</th>
                          <th className="p-2 border border-[#1A1A1A] text-right">Tồn Khoa Phòng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {excelParsedData.items.slice(0, 15).map((it, idx) => {
                          const allocs = excelParsedData.allocations[it.ma] || [];
                          const allocTotal = allocs.reduce((sum, a) => sum + a[1], 0);
                          return (
                            <tr key={idx} className="hover:bg-gray-50 font-mono">
                              <td className="p-2 border border-gray-200 font-bold text-gray-900">{it.ma}</td>
                              <td className="p-2 border border-gray-200 font-sans text-gray-800">{it.ten}</td>
                              <td className="p-2 border border-gray-200 text-gray-500 font-sans">{it.nhom}</td>
                              <td className="p-2 border border-gray-200 text-right font-bold text-[#1A1A1A]">{it.kc.toLocaleString()}</td>
                              <td className="p-2 border border-gray-200 text-right text-gray-600">
                                {allocs.length > 0 ? (
                                  <span className="font-bold text-[#16A34A]">
                                    {allocTotal.toLocaleString()} ({allocs.length} khoa: {allocs.map(([n, q]) => `${n}:${q}`).join(', ').slice(0, 35)}...)
                                  </span>
                                ) : (
                                  <span className="text-gray-400">0</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {excelParsedData.items.length > 15 && (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="p-2 border border-gray-200 text-center italic text-gray-500 font-sans">
                              Và {excelParsedData.items.length - 15} mặt hàng khác...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-[#1A1A1A] border-dashed">
                    <button
                      type="button"
                      onClick={() => {
                        setExcelParsedData(null);
                        setExcelFile(null);
                        setExcelFileName('');
                      }}
                      className="px-4 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]"
                    >
                      Xóa nạp lại
                    </button>
                    <button
                      type="button"
                      onClick={handleExcelImportConfirm}
                      className="px-4 py-2 bg-[#16A34A] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#14833D] border border-[#1A1A1A] shadow-md cursor-pointer"
                    >
                      {excelImportMode === 'overwrite' ? 'XÁC NHẬN GHI ĐÈ SỐ LIỆU CHÍNH THỨC' : 'XÁC NHẬN CẬP NHẬT/CỘNG DỒN'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Dialog: Detailed Linen Image and Status Modal */}
      {selectedDetailItem && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-[#F5F2ED] border border-[#1A1A1A] p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="border border-[#1A1A1A] p-4 md:p-6 space-y-6">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-[#1A1A1A] pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-black bg-[#2563EB] text-white px-2 py-0.5 rounded">
                      {selectedDetailItem.ma}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C8984] bg-stone-200 px-2 py-0.5 rounded">
                      {selectedDetailItem.nhom}
                    </span>
                  </div>
                  <h3 className="font-serif font-black text-xl text-[#1A1A1A] tracking-tight leading-snug">
                    {selectedDetailItem.ten}
                  </h3>
                </div>
                <button 
                  onClick={handleCloseDetailModal} 
                  className="w-8 h-8 rounded-full border border-[#1A1A1A] flex items-center justify-center text-stone-600 hover:text-black hover:bg-[#EBE8E3] transition-colors font-bold text-lg"
                  title="Đóng"
                >
                  &times;
                </button>
              </div>

              {/* Grid Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Image Section */}
                <div className="space-y-3">
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-[#1A1A1A] bg-stone-100 shadow-inner group">
                    <img 
                      src={getLinenImage(selectedDetailItem)} 
                      alt={selectedDetailItem.ten} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-xs text-white px-3 py-1 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Hình thực tế
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-500 italic text-center">
                    * Hình ảnh mô phỏng chất liệu & tiêu chuẩn đồ vải bệnh viện
                  </p>

                  {/* Button to edit image link */}
                  {!isWardUser && (
                    <div className="pt-1">
                      {!isEditingImage ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingImage(true);
                            setNewImageUrl(selectedDetailItem.hinhAnh || '');
                            setImageUploadType(selectedDetailItem.hinhAnh?.startsWith('data:') ? 'upload' : 'url');
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-stone-100 border border-[#1A1A1A] text-xs font-bold uppercase tracking-wider text-stone-800 rounded transition-all shadow-xs"
                        >
                          <Image size={14} className="text-stone-600" />
                          Chèn / Cập nhật ảnh mới
                        </button>
                      ) : (
                        <div className="bg-white p-3 border border-[#1A1A1A] rounded-lg space-y-2.5 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                          {/* Segmented Tab controls */}
                          <div className="flex border-b border-[#1A1A1A]/10 mb-2">
                            <button
                              type="button"
                              onClick={() => {
                                setImageUploadType('upload');
                                setUploadError('');
                                if (newImageUrl.startsWith('http')) {
                                  setNewImageUrl('');
                                }
                              }}
                              className={`flex-1 pb-1.5 text-center text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                                imageUploadType === 'upload'
                                  ? 'border-[#2563EB] text-[#2563EB]'
                                  : 'border-transparent text-stone-500 hover:text-stone-800'
                              }`}
                            >
                              Tải file (JPG, PNG)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImageUploadType('url');
                                setUploadError('');
                                if (newImageUrl.startsWith('data:')) {
                                  setNewImageUrl('');
                                }
                              }}
                              className={`flex-1 pb-1.5 text-center text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                                imageUploadType === 'url'
                                  ? 'border-[#2563EB] text-[#2563EB]'
                                  : 'border-transparent text-stone-500 hover:text-stone-800'
                              }`}
                            >
                              Nhập Link (URL)
                            </button>
                          </div>

                          {imageUploadType === 'upload' ? (
                            <div className="space-y-2">
                              <label
                                htmlFor="detail-image-file-input"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setIsDragging(false);
                                  const file = e.dataTransfer.files?.[0];
                                  if (file) handleImageFileSelect(file);
                                }}
                                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all min-h-[110px] ${
                                  isDragging
                                    ? 'border-[#2563EB] bg-blue-50/50 text-[#2563EB]'
                                    : newImageUrl && newImageUrl.startsWith('data:')
                                    ? 'border-emerald-500 bg-emerald-50/20'
                                    : 'border-stone-300 hover:border-stone-500 bg-stone-50/50 hover:bg-stone-50'
                                }`}
                              >
                                <input
                                  type="file"
                                  id="detail-image-file-input"
                                  accept="image/jpeg, image/jpg, image/png, image/webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageFileSelect(file);
                                  }}
                                />
                                
                                {newImageUrl && newImageUrl.startsWith('data:') ? (
                                  <div className="flex flex-col items-center text-center space-y-1.5 w-full">
                                    <div className="w-12 h-12 rounded border border-emerald-500/30 overflow-hidden shadow-xs bg-white">
                                      <img 
                                        src={newImageUrl} 
                                        alt="Preview" 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                                      <Check size={12} /> Đã chọn ảnh thành công
                                    </p>
                                    <p className="text-[9px] text-stone-500">
                                      Kéo thả hoặc nhấp để thay đổi ảnh khác
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center text-center space-y-1.5 text-stone-600">
                                    <Upload size={20} className={isDragging ? 'text-[#2563EB]' : 'text-stone-400'} />
                                    <div className="text-xs">
                                      <span className="font-bold text-[#2563EB] hover:underline">Chọn file</span> hoặc kéo thả tại đây
                                    </div>
                                    <p className="text-[9px] text-stone-400">
                                      Hỗ trợ JPG, JPEG, PNG, WEBP (Tối đa 3MB)
                                    </p>
                                  </div>
                                )}
                              </label>

                              {uploadError && (
                                <p className="text-[10px] text-red-600 font-bold flex items-center gap-1 justify-center bg-red-50 p-1.5 rounded border border-red-100">
                                  <AlertTriangle size={12} className="shrink-0" />
                                  {uploadError}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="block text-[10px] uppercase tracking-wider font-bold text-stone-700">
                                Nhập link hình ảnh mới:
                              </label>
                              <input
                                type="url"
                                placeholder="Nhập URL hình ảnh (ví dụ: https://...)"
                                value={newImageUrl.startsWith('data:') ? '' : newImageUrl}
                                onChange={(e) => setNewImageUrl(e.target.value)}
                                className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none rounded font-sans"
                                autoFocus
                              />
                            </div>
                          )}

                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingImage(false);
                                setNewImageUrl('');
                                setUploadError('');
                              }}
                              className="px-2.5 py-1.5 border border-[#1A1A1A] text-[10px] font-bold uppercase tracking-wider hover:bg-stone-100 rounded text-stone-700"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const finalUrl = newImageUrl.trim();
                                onEditItem(selectedDetailItem.ma, {
                                  ...selectedDetailItem,
                                  hinhAnh: finalUrl || undefined
                                });
                                setSelectedDetailItem({
                                  ...selectedDetailItem,
                                  hinhAnh: finalUrl || undefined
                                });
                                setIsEditingImage(false);
                                setNewImageUrl('');
                                setUploadError('');
                              }}
                              className="px-3 py-1.5 bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 rounded shadow-xs"
                            >
                              Lưu thay đổi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Stock Stats & Distribution */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase font-black tracking-wider text-stone-800 border-b border-stone-200 pb-1.5 flex items-center gap-1.5">
                      <Info size={14} className="text-stone-600" />
                      Trạng thái tồn kho hiện tại
                    </h4>
                    
                    {/* Key Stocks Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#EBE8E3] p-3 border border-black/10 rounded-xl">
                        <span className="block text-[9px] uppercase font-bold text-stone-500 tracking-wider">Kho chính</span>
                        <span className="text-xl font-mono font-black text-stone-900">
                          {selectedDetailItem.kc.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-stone-500 block mt-0.5">Kho trung tâm</span>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                        <span className="block text-[9px] uppercase font-bold text-blue-700 tracking-wider">Khoa phòng</span>
                        <span className="text-xl font-mono font-black text-blue-900">
                          {(() => {
                            const kpSum = (detailAllocations[selectedDetailItem.ma] || []).reduce((sum, r) => sum + (r[1] || 0), 0);
                            return kpSum.toLocaleString();
                          })()}
                        </span>
                        <span className="text-[9px] text-blue-600 block mt-0.5">Phân phối các khoa</span>
                      </div>
                    </div>

                    {/* Minimum and Overall summary */}
                    <div className="bg-stone-50 border border-stone-200/60 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-500 font-medium">Cảnh báo tồn tối thiểu:</span>
                        <span className="font-mono font-black text-stone-900">{selectedDetailItem.mn}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-1.5 border-t border-dashed border-stone-200">
                        <span className="text-stone-800 font-bold">Tổng tồn toàn viện:</span>
                        <span className="font-mono font-black text-indigo-900 text-sm">
                          {(() => {
                            const kpSum = (detailAllocations[selectedDetailItem.ma] || []).reduce((sum, r) => sum + (r[1] || 0), 0);
                            return (selectedDetailItem.kc + kpSum).toLocaleString();
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Temporary store details if any */}
                  {(() => {
                    const qtyDirty = temporaryDirtyStore[selectedDetailItem.ma] || 0;
                    const qtyCompany = temporaryCompanyDirtyStore[selectedDetailItem.ma] || 0;
                    const qtyClean = temporaryCleanStore[selectedDetailItem.ma] || 0;
                    
                    if (qtyDirty === 0 && qtyCompany === 0 && qtyClean === 0) return null;
                    
                    return (
                      <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl space-y-2">
                        <h5 className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">Số lượng đang luân chuyển (Kho tạm):</h5>
                        <div className="grid grid-cols-3 gap-1 text-[11px]">
                          {qtyDirty > 0 && (
                            <div className="text-center bg-white/80 p-1.5 rounded border border-emerald-100">
                              <span className="block text-[8px] text-stone-500 font-bold">DƠ TẠM BV</span>
                              <b className="font-mono text-stone-800">{qtyDirty}</b>
                            </div>
                          )}
                          {qtyCompany > 0 && (
                            <div className="text-center bg-white/80 p-1.5 rounded border border-emerald-100">
                              <span className="block text-[8px] text-stone-500 font-bold">DƠ TẠM CTY</span>
                              <b className="font-mono text-stone-800">{qtyCompany}</b>
                            </div>
                          )}
                          {qtyClean > 0 && (
                            <div className="text-center bg-white/80 p-1.5 rounded border border-emerald-100">
                              <span className="block text-[8px] text-stone-500 font-bold">SẠCH TẠM BV</span>
                              <b className="font-mono text-stone-800">{qtyClean}</b>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>

              {/* Department Distribution Details */}
              <div className="space-y-3 pt-3 border-t border-[#1A1A1A] border-dashed">
                <h4 className="text-xs uppercase font-black tracking-wider text-stone-800 flex items-center gap-1.5">
                  <MapPin size={14} className="text-stone-600" />
                  Chi tiết tồn tại các khoa phòng
                </h4>

                {(() => {
                  const allocations = (detailAllocations[selectedDetailItem.ma] || []).filter(alloc => alloc[1] > 0);
                  
                  if (allocations.length === 0) {
                    return (
                      <div className="py-4 text-center text-stone-400 text-xs italic bg-white border border-stone-100 rounded-xl">
                        Chưa phân phối tồn kho tại khoa phòng nào.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                      {allocations.map(([deptName, qty]) => (
                        <div key={deptName} className="bg-white hover:bg-stone-50 border border-stone-200/60 p-2 rounded-lg flex justify-between items-center transition-colors">
                          <span className="text-[11px] font-medium text-stone-700 truncate mr-2" title={deptName}>
                            {deptName}
                          </span>
                          <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                            {qty.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Close Button */}
              <div className="flex justify-end pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={handleCloseDetailModal}
                  className="px-5 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase tracking-wider hover:bg-stone-800 transition-colors rounded shadow-xs"
                >
                  Đóng cửa sổ
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
