/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { LinenItem, LINEN_GROUPS, LINEN_PAGES } from '../types';
import { Search, Plus, FileSpreadsheet, Download, Edit, Trash2, MapPin, AlertTriangle, Eye, X } from 'lucide-react';
import LinenStockStats from './inventory/LinenStockStats';
import LinenStockAddModal from './inventory/LinenStockAddModal';
import LinenStockEditModal from './inventory/LinenStockEditModal';
import LinenStockExcelImportModal from './inventory/LinenStockExcelImportModal';
import LinenStockDetailModal from './inventory/LinenStockDetailModal';

interface LinenStockSubscreenProps {
  items: LinenItem[];
  detailAllocations: Record<string, [string, number][]>;
  temporaryCleanStore: Record<string, number>;
  temporaryDirtyStore: Record<string, number>;
  temporaryCompanyDirtyStore: Record<string, number>;
  onAddItem: (item: LinenItem) => void;
  onEditItem: (origMa: string, updatedItem: LinenItem) => void;
  onDeleteItem: (ma: string) => void;
  onInitTest: () => void;
  onViewAllocations: (ma: string, ten: string) => void;
  onUpdateInventory?: (updatedItems: LinenItem[], updatedAllocations: Record<string, [string, number][]>) => void;
  isAdmin: boolean;
  departments: string[];
  userDept?: string;
  getLinenImage: (item: LinenItem) => string;
}

export default function LinenStockSubscreen({
  items,
  detailAllocations,
  temporaryCleanStore,
  temporaryDirtyStore,
  temporaryCompanyDirtyStore,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onInitTest,
  onViewAllocations,
  onUpdateInventory,
  isAdmin,
  departments,
  userDept,
  getLinenImage
}: LinenStockSubscreenProps) {
  const isWardUser = useMemo(() => {
    return !isAdmin && !!userDept && userDept !== 'Kho trung tâm' && userDept !== 'Tất cả' && userDept !== 'Tất cả (Không giới hạn)';
  }, [isAdmin, userDept]);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(() => {
    if (userDept && userDept !== 'Kho trung tâm' && userDept !== 'Tất cả' && userDept !== 'Tất cả (Không giới hạn)') {
      const normalizedUserDept = userDept.replace(/^Khoa\s+/i, '');
      const matched = departments.find(d => d.toLowerCase() === normalizedUserDept.toLowerCase() || normalizedUserDept.toLowerCase().includes(d.toLowerCase()));
      return matched || userDept;
    }
    return '';
  });

  // Helper to get allocation quantity for a specific department
  const getDeptAllocQty = (itemMa: string, deptName: string) => {
    if (!deptName) return 0;
    const allocs = detailAllocations[itemMa] || [];
    const normTarget = deptName.replace(/^Khoa\s+/i, '').trim().toLowerCase();
    const exact = allocs.find(([d]) => d === deptName);
    if (exact) return exact[1] || 0;
    const normMatch = allocs.find(([d]) => d.replace(/^Khoa\s+/i, '').trim().toLowerCase() === normTarget);
    if (normMatch) return normMatch[1] || 0;
    return 0;
  };

  // Determine focused department
  const focusDept = useMemo(() => {
    if (selectedLocation) {
      return selectedLocation === 'kho' ? '' : selectedLocation;
    }
    if (userDept && userDept !== 'Kho trung tâm' && userDept !== 'Tất cả' && userDept !== 'Tất cả (Không giới hạn)') {
      const normalizedUserDept = userDept.replace(/^Khoa\s+/i, '');
      const matched = departments.find(d => d.toLowerCase() === normalizedUserDept.toLowerCase() || normalizedUserDept.toLowerCase().includes(d.toLowerCase()));
      return matched || userDept;
    }
    return '';
  }, [selectedLocation, userDept, departments]);

  // Sorting
  const [sortCol, setSortCol] = useState<'ma' | 'ten' | 'nhom' | 'trang' | 'kc' | 'kp' | 'tong'>('ma');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<LinenItem | null>(null);
  const [showDelModal, setShowDelModal] = useState<string | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<LinenItem | null>(null);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);

  // Pre-calculate items metrics
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

  // Filtering list: When a department is selected or focused, ONLY show items allocated to that department (> 0)
  const filteredItems = useMemo(() => {
    let list = [...itemTotals];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => d.ma.toLowerCase().includes(q) || d.ten.toLowerCase().includes(q));
    }
    if (selectedGroup) {
      list = list.filter(d => d.nhom === selectedGroup);
    }
    if (selectedPage) {
      list = list.filter(d => (d.trang || 'Trang 1') === selectedPage);
    }
    if (selectedLocation === 'kho') {
      list = list.filter(d => d.kc > 0);
    } else if (focusDept) {
      // Hide all linens that do NOT exist in the selected department
      list = list.filter(d => getDeptAllocQty(d.ma, focusDept) > 0);
    }
    return list;
  }, [itemTotals, searchQuery, selectedGroup, selectedPage, selectedLocation, focusDept, detailAllocations]);

  // Sorting
  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      } else {
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      }
    });
    return list;
  }, [filteredItems, sortCol, sortAsc]);

  // Stats computation
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

  const handleExcelImportConfirm = (excelParsedData: { items: LinenItem[]; allocations: Record<string, [string, number][]> }, mode: 'overwrite' | 'merge') => {
    if (!onUpdateInventory) return;
    if (mode === 'overwrite') {
      onUpdateInventory(excelParsedData.items, excelParsedData.allocations);
    } else {
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
        mergedAllocations[newItem.ma] = excelParsedData.allocations[newItem.ma] || [];
      });
      onUpdateInventory(mergedItems, mergedAllocations);
    }
    setShowExcelImportModal(false);
  };

  const downloadExcelTemplate = () => {
    const getPrimaryDept = (itemCode: string) => {
      const allocs = detailAllocations[itemCode] || [];
      if (allocs.length === 0) return '';
      let maxAlloc = allocs[0];
      allocs.forEach(a => {
        if (a[1] > maxAlloc[1]) maxAlloc = a;
      });
      return maxAlloc[0];
    };

    const sortedItems = [...items].sort((a, b) => {
      const deptA = getPrimaryDept(a.ma);
      const deptB = getPrimaryDept(b.ma);
      if (deptA === deptB) return a.ma.localeCompare(b.ma);
      if (!deptA) return 1;
      if (!deptB) return -1;
      return departments.indexOf(deptA) - departments.indexOf(deptB);
    });

    const sheetHeaders = ['Mã Đồ Vải', 'Tên Đồ Vải', 'Nhóm Đồ Vải', 'Khoa phân bổ chính', 'Kho chính', ...departments];
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
      departments.forEach(dept => {
        const alloc = (detailAllocations[item.ma] || []).find(([d]) => d === dept);
        row.push(alloc ? alloc[1] : 0);
      });
      sheetData.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 35 }, { wch: 22 }, { wch: 22 }, { wch: 12 },
      ...departments.map(() => ({ wch: 18 }))
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Danh_Muc_Do_Vai");
    XLSX.writeFile(wb, `HospLinenPro_MauNhapKho_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportFullInventoryExcel = () => {
    const sheetHeaders = [
      'Mã Đồ Vải', 'Tên Đồ Vải', 'Nhóm Đồ Vải', 'Tồn Kho Chính (Kho Trung Tâm)',
      ...departments, 'Tổng Tồn Toàn Viện'
    ];
    const sheetData: any[][] = [sheetHeaders];

    items.forEach(item => {
      const row = [
        item.ma,
        item.ten,
        item.nhom,
        item.kc || 0
      ];
      let sumKP = 0;
      departments.forEach(dept => {
        const alloc = (detailAllocations[item.ma] || []).find(([d]) => d === dept);
        const qty = alloc ? alloc[1] : 0;
        sumKP += qty;
        row.push(qty);
      });
      row.push((item.kc || 0) + sumKP);
      sheetData.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 35 }, { wch: 22 }, { wch: 28 },
      ...departments.map(() => ({ wch: 18 })), { wch: 22 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Ton_Kho_Toan_Vien");
    XLSX.writeFile(wb, `Ton_Kho_Chi_Tiet_Toan_Vien_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDeleteConfirm = () => {
    if (showDelModal) {
      onDeleteItem(showDelModal);
      setShowDelModal(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-black/10 p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="font-serif font-black text-2xl text-[#1A1A1A] tracking-tight">KHO ĐỒ VẢI QUY MÔ TOÀN VIỆN</h2>
          <p className="text-xs text-[#8C8984] mt-1 font-medium"> Quản lý chi tiết danh mục mẫu, phân rã dòng tồn kho chính và phân bổ cho từng khoa phòng lâm sàng.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {isAdmin && (
            <>
              <button
                onClick={() => setShowExcelImportModal(true)}
                className="px-4 py-2 border border-[#1A1A1A] hover:bg-[#EBE8E3] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer font-bold"
              >
                <FileSpreadsheet size={14} className="text-[#16A34A]" />
                <span>Nạp Kho Excel</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#C4432A] text-[#F5F2ED] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border border-[#1A1A1A] hover:border-[#C4432A] cursor-pointer font-bold"
              >
                <Plus size={14} />
                <span>Thêm Đồ Vải</span>
              </button>
            </>
          )}
          <button
            onClick={handleExportFullInventoryExcel}
            className="px-4 py-2 border border-[#1A1A1A] hover:bg-[#EBE8E3] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer font-bold"
          >
            <Download size={14} />
            <span>Xuất Báo Cáo Tồn</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <LinenStockStats stats={stats} isWardUser={isWardUser} />

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white border border-black/10 p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2 border border-black/10 rounded-xl px-3 py-2 bg-[#F5F2ED]/30 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search size={14} className="text-[#8C8984]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm mã hoặc tên mặt hàng..."
            className="w-full bg-transparent text-xs focus:outline-none text-[#1A1A1A] font-medium placeholder-[#8C8984]"
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-[#8C8984] hover:text-[#1A1A1A]"><X size={14} /></button>}
        </div>

        <select
          value={selectedGroup}
          onChange={e => setSelectedGroup(e.target.value)}
          className="border border-black/10 rounded-xl px-3 py-2 text-xs bg-white text-[#1A1A1A] font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
        >
          <option value="">Tất cả nhóm mặt hàng</option>
          {LINEN_GROUPS.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select
          value={selectedPage}
          onChange={e => setSelectedPage(e.target.value)}
          className="border border-amber-300 rounded-xl px-3 py-2 text-xs bg-amber-50/70 text-amber-950 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all cursor-pointer"
        >
          <option value="">Tất cả Trang Bill Tổng</option>
          {LINEN_PAGES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {(!isWardUser) ? (
          <select
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
            className="border border-black/10 rounded-xl px-3 py-2 text-xs bg-white text-[#1A1A1A] font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
          >
            <option value="">Toàn viện (Cả kho & Khoa phòng)</option>
            <option value="kho">Kho Trung Tâm</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        ) : (
          <div className="border border-black/10 bg-[#F5F2ED]/40 text-stone-700 rounded-xl px-3.5 py-2 text-xs font-bold flex items-center justify-between">
            <span>Khoa giám sát: <b>{userDept}</b></span>
          </div>
        )}

        <button
          onClick={onInitTest}
          className="px-3 py-2 border border-dashed border-[#C4432A]/40 text-[#C4432A] hover:bg-[#FDF2F0] text-xs font-bold rounded-xl transition-all uppercase tracking-wider cursor-pointer font-bold"
        >
          ⚡ Sinh data test
        </button>
      </div>

      {/* Main Desktop Grid */}
      <div className="hidden md:block bg-white border border-black/10 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F5F2ED] border-b border-black/10 text-[#8C8984] font-mono tracking-wider text-[10px] uppercase font-bold">
              <th className="py-3 px-4 cursor-pointer hover:bg-stone-200/50 transition-colors" onClick={() => handleSort('ma')}>Mã mặt hàng {sortCol === 'ma' && (sortAsc ? '▲' : '▼')}</th>
              <th className="py-3 px-4 cursor-pointer hover:bg-stone-200/50 transition-colors" onClick={() => handleSort('ten')}>Tên đồ vải {sortCol === 'ten' && (sortAsc ? '▲' : '▼')}</th>
              <th className="py-3 px-4 cursor-pointer hover:bg-stone-200/50 transition-colors" onClick={() => handleSort('nhom')}>Nhóm loại {sortCol === 'nhom' && (sortAsc ? '▲' : '▼')}</th>
              <th className="py-3 px-4 cursor-pointer hover:bg-stone-200/50 transition-colors" onClick={() => handleSort('trang')}>Trang Bill {sortCol === 'trang' && (sortAsc ? '▲' : '▼')}</th>
              {!isWardUser && <th className="py-3 px-4 text-right cursor-pointer hover:bg-stone-200/50 transition-colors" onClick={() => handleSort('kc')}>Kho trung tâm {sortCol === 'kc' && (sortAsc ? '▲' : '▼')}</th>}
              {!isWardUser && <th className="py-3 px-4 text-right">Luân chuyển tạm</th>}
              <th className="py-3 px-4 text-right cursor-pointer hover:bg-stone-200/50 transition-colors" onClick={() => handleSort('kp')}>
                {focusDept ? `Sử dụng tại ${focusDept}` : 'Phân bổ Khoa'} {sortCol === 'kp' && (sortAsc ? '▲' : '▼')}
              </th>
              {!isWardUser && <th className="py-3 px-4 text-right cursor-pointer hover:bg-stone-200/50 transition-colors" onClick={() => handleSort('tong')}>Tổng tồn viện {sortCol === 'tong' && (sortAsc ? '▲' : '▼')}</th>}
              {!isWardUser && <th className="py-3 px-4 text-center">Trạng thái an toàn</th>}
              {isAdmin && <th className="py-3 px-4 text-center">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 font-medium">
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} className="py-12 text-center text-[#8C8984] italic">
                  Không tìm thấy mặt hàng nào trùng khớp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map(d => (
                <tr key={d.ma} className="hover:bg-[#F5F2ED]/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#2563EB]">{d.ma}</td>
                  <td className="py-2.5 px-4 font-medium text-[#1A1A1A]">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => setSelectedDetailItem(d)}
                        className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#1A1A1A]/10 bg-stone-100 flex-shrink-0 cursor-zoom-in group/thumb shadow-2xs hover:border-[#2563EB] hover:ring-2 hover:ring-blue-100 transition-all"
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
                        className="text-left font-bold text-[#1A1A1A] hover:text-[#2563EB] hover:underline focus:outline-none cursor-pointer"
                      >
                        {d.ten}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-[#8C8984] text-[11px]">{d.nhom}</td>
                  <td className="py-2.5 px-4">
                    {isAdmin ? (
                      <select
                        value={d.trang || 'Trang 1'}
                        onChange={(e) => {
                          onEditItem(d.ma, { ...d, trang: e.target.value });
                        }}
                        className="bg-amber-100/90 hover:bg-amber-200/90 text-amber-950 border border-amber-300 text-[11px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-2xs transition-all"
                      >
                        {LINEN_PAGES.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300 shadow-2xs">
                        {d.trang || 'Trang 1'}
                      </span>
                    )}
                  </td>
                  {!isWardUser && <td className="py-2.5 px-4 text-right font-mono font-medium">{d.kc.toLocaleString()}</td>}
                  {!isWardUser && (
                    <td className="py-2.5 px-4 text-right">
                      {(() => {
                        const qtyDirty = temporaryDirtyStore[d.ma] || 0;
                        const qtyCompany = temporaryCompanyDirtyStore[d.ma] || 0;
                        const qtyClean = temporaryCleanStore[d.ma] || 0;
                        if (qtyDirty === 0 && qtyCompany === 0 && qtyClean === 0) return <span className="text-[#8C8984]/50">—</span>;
                        return (
                          <div className="flex flex-col items-end text-[10px] gap-0.5 leading-tight">
                            {qtyDirty > 0 && <span className="text-blue-700 bg-blue-50 px-1 py-0.5 border border-blue-100/50 font-medium rounded">Dơ BV: <b className="font-mono">{qtyDirty}</b></span>}
                            {qtyCompany > 0 && <span className="text-amber-700 bg-amber-50 px-1 py-0.5 border border-amber-100/50 font-medium rounded">Dơ Cty: <b className="font-mono">{qtyCompany}</b></span>}
                            {qtyClean > 0 && <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 border border-emerald-100/50 font-medium rounded">Sạch tạm: <b className="font-mono">{qtyClean}</b></span>}
                          </div>
                        );
                      })()}
                    </td>
                  )}
                  <td className="py-2.5 px-4 text-right">
                    {focusDept ? (
                      (() => {
                        const deptQty = getDeptAllocQty(d.ma, focusDept);
                        return (
                          <div className="flex flex-col items-end">
                            {deptQty > 0 ? (
                              <button
                                onClick={() => onViewAllocations(d.ma, d.ten)}
                                className="inline-flex items-center gap-1 text-[#2563EB] hover:text-[#1A1A1A] hover:underline font-mono font-bold cursor-pointer"
                              >
                                <MapPin size={11} />
                                {deptQty.toLocaleString()}
                              </button>
                            ) : (
                              <span className="text-[#8C8984] font-mono">—</span>
                            )}
                            {!isWardUser && d.kp > deptQty && (
                              <span className="text-[10px] text-[#8C8984] font-mono mt-0.5">Tổng: {d.kp.toLocaleString()}</span>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      d.kp > 0 ? (
                        <button
                          onClick={() => onViewAllocations(d.ma, d.ten)}
                          className="inline-flex items-center gap-1 text-[#2563EB] hover:text-[#1A1A1A] hover:underline font-mono font-semibold cursor-pointer"
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
                          onClick={() => setShowEditModal(d)}
                          className="p-1 text-[#2563EB] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-colors cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => setShowDelModal(d.ma)}
                          className="p-1 text-[#C4432A] hover:bg-[#C4432A] hover:text-[#F5F2ED] transition-colors cursor-pointer"
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

      {/* Mobile Card-Based List */}
      <div className="block md:hidden space-y-3">
        {filteredAndSortedItems.length === 0 ? (
          <div className="py-8 text-center text-[#8C8984] bg-white border border-black/10 rounded-2xl">
            Không tìm thấy kết quả nào trùng khớp.
          </div>
        ) : (
          filteredAndSortedItems.map(d => {
            const deptQty = focusDept ? getDeptAllocQty(d.ma, focusDept) : 0;

            return (
              <div key={d.ma} className="bg-white border border-black/10 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#2563EB] text-sm">{d.ma}</span>
                  {!isWardUser && (
                    <span className={`inline-block font-bold text-[8px] tracking-wider uppercase px-2 py-0.5 rounded ${d.status === 'ok' ? 'bg-[#D1FAE5] text-[#065F46]' : d.status === 'warn' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                      {d.status === 'ok' ? '✔ Ổn định' : d.status === 'warn' ? '⚠ Tồn thấp' : '✕ Hết'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div onClick={() => setSelectedDetailItem(d)} className="relative w-12 h-12 rounded-lg overflow-hidden border border-black/10 bg-stone-100 flex-shrink-0 cursor-zoom-in">
                    <img src={getLinenImage(d)} alt={d.ten} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 onClick={() => setSelectedDetailItem(d)} className="font-bold text-stone-900 text-sm hover:text-blue-600 cursor-pointer">{d.ten}</h4>
                    <span className="text-[#8C8984] text-[10px] uppercase font-semibold tracking-wider block">{d.nhom}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5 text-xs">
                  {!isWardUser && (
                    <div className="bg-stone-50 p-2 rounded-xl">
                      <span className="block text-[8px] font-bold text-stone-400 uppercase">Kho chính</span>
                      <span className="font-mono font-bold text-stone-800">{d.kc.toLocaleString()}</span>
                    </div>
                  )}
                  {!isWardUser && (
                    <div className="bg-emerald-50/50 p-2 rounded-xl">
                      <span className="block text-[8px] font-bold text-emerald-800 uppercase">Kho tạm</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {(() => {
                          const qtyD = temporaryDirtyStore[d.ma] || 0;
                          const qtyC = temporaryCompanyDirtyStore[d.ma] || 0;
                          const qtyS = temporaryCleanStore[d.ma] || 0;
                          return (qtyD + qtyC + qtyS).toLocaleString();
                        })()}
                      </span>
                    </div>
                  )}
                  <div className="bg-blue-50/40 p-2 rounded-xl">
                    <span className="block text-[8px] font-bold text-blue-800 uppercase">Khoa phòng</span>
                    <button onClick={() => onViewAllocations(d.ma, d.ten)} className="inline-flex items-center gap-1 text-[#2563EB] font-mono font-bold cursor-pointer">
                      <MapPin size={10} />
                      {focusDept ? deptQty.toLocaleString() : d.kp.toLocaleString()}
                    </button>
                  </div>
                  {!isWardUser && (
                    <div className="bg-indigo-50/50 p-2 rounded-xl">
                      <span className="block text-[8px] font-bold text-indigo-800 uppercase">Tổng viện</span>
                      <span className="font-mono font-bold text-indigo-900">{d.tong.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                    <button onClick={() => setShowEditModal(d)} className="flex items-center gap-1 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 cursor-pointer">
                      <Edit size={12} />
                      <span>Sửa</span>
                    </button>
                    <button onClick={() => setShowDelModal(d.ma)} className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 cursor-pointer">
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

      {/* Add Modal */}
      {showAddModal && (
        <LinenStockAddModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(newItem) => {
            onAddItem(newItem);
            setShowAddModal(false);
          }}
          items={items}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <LinenStockEditModal
          onClose={() => setShowEditModal(null)}
          onSubmit={(origMa, updatedItem) => {
            onEditItem(origMa, updatedItem);
            setShowEditModal(null);
          }}
          item={showEditModal}
          items={items}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm border border-[#1A1A1A] bg-[#F5F2ED] p-1">
            <div className="border border-[#1A1A1A] p-5 text-center">
              <AlertTriangle size={32} className="text-[#C4432A] mx-auto mb-2" />
              <h3 className="font-serif font-black text-lg text-[#1A1A1A]">Xác Nhận Xóa Đồ Vải</h3>
              <p className="text-xs text-[#8C8984] mt-1">Hành động này sẽ xóa mặt hàng ra khỏi danh mục của bệnh viện.</p>
              <div className="p-3 bg-[#FDF2F0] border border-[#C4432A] text-xs text-[#C4432A] my-4 font-mono font-bold">Mã xóa: {showDelModal}</div>
              <div className="flex gap-2">
                <button onClick={() => setShowDelModal(null)} className="flex-1 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase hover:bg-[#EBE8E3] cursor-pointer">Hủy</button>
                <button onClick={handleDeleteConfirm} className="flex-1 py-2 bg-[#C4432A] text-white text-xs font-semibold uppercase hover:bg-[#A9341F] cursor-pointer">Xóa vĩnh viễn</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showExcelImportModal && (
        <LinenStockExcelImportModal
          onClose={() => setShowExcelImportModal(false)}
          onConfirm={handleExcelImportConfirm}
          departments={departments}
        />
      )}

      {/* Detailed view Modal */}
      {selectedDetailItem && (
        <LinenStockDetailModal
          onClose={() => setSelectedDetailItem(null)}
          selectedDetailItem={selectedDetailItem}
          getLinenImage={getLinenImage}
          isWardUser={isWardUser}
          detailAllocations={detailAllocations}
          temporaryDirtyStore={temporaryDirtyStore}
          temporaryCompanyDirtyStore={temporaryCompanyDirtyStore}
          temporaryCleanStore={temporaryCleanStore}
          onEditItem={onEditItem}
          onSetSelectedDetailItem={setSelectedDetailItem}
        />
      )}
    </div>
  );
}
