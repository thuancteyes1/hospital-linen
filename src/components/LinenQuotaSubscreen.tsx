/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { LinenItem, LINEN_GROUPS } from '../types';
import { ShieldAlert, CheckCircle, Search, Edit2, Check, X, Shield, Plus, TrendingDown, ClipboardList, Info, ChevronRight, RefreshCw } from 'lucide-react';

interface LinenQuotaSubscreenProps {
  items: LinenItem[];
  detailAllocations: Record<string, [string, number][]>;
  onEditItem: (origMa: string, updatedItem: LinenItem) => void;
  onUpdateInventory?: (updatedItems: LinenItem[], updatedAllocations: Record<string, [string, number][]>) => void;
  isAdmin: boolean;
  departments: string[];
  userDept?: string;
}

export default function LinenQuotaSubscreen({
  items,
  detailAllocations,
  onEditItem,
  onUpdateInventory,
  isAdmin,
  departments,
  userDept
}: LinenQuotaSubscreenProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false);

  // Selected item for department-level quota allocation management
  const [selectedItemCode, setSelectedItemCode] = useState<string>('');

  // Inline editing state for safety stock levels (mn)
  const [editingItemMa, setEditingItemMa] = useState<string | null>(null);
  const [tempMnValue, setTempMnValue] = useState<number>(0);

  // Inline editing state for department allocations
  const [isEditingAllocs, setIsEditingAllocs] = useState(false);
  const [tempAllocs, setTempAllocs] = useState<Record<string, number>>({});

  // Compute item totals
  const itemTotals = useMemo(() => {
    return items.map(item => {
      const kpSum = (detailAllocations[item.ma] || []).reduce((sum, r) => sum + (r[1] || 0), 0);
      const total = item.kc + kpSum;
      const isUnderstocked = total < item.mn;
      const shortage = isUnderstocked ? item.mn - total : 0;

      return {
        ...item,
        kp: kpSum,
        tong: total,
        isUnderstocked,
        shortage
      };
    });
  }, [items, detailAllocations]);

  // If no item is selected yet, select the first one in the list
  useMemo(() => {
    if (!selectedItemCode && items.length > 0) {
      setSelectedItemCode(items[0].ma);
    }
  }, [items, selectedItemCode]);

  // Selected item metrics
  const selectedItem = useMemo(() => {
    return itemTotals.find(i => i.ma === selectedItemCode);
  }, [itemTotals, selectedItemCode]);

  // Initialize temp department allocations when selected item or edit mode changes
  const handleStartEditAllocs = () => {
    if (!selectedItem) return;
    const current = detailAllocations[selectedItem.ma] || [];
    const initial: Record<string, number> = {};
    departments.forEach(dept => {
      const found = current.find(([d]) => d === dept);
      initial[dept] = found ? found[1] : 0;
    });
    setTempAllocs(initial);
    setIsEditingAllocs(true);
  };

  const handleSaveAllocs = () => {
    if (!selectedItem || !onUpdateInventory) return;

    const updatedAllocations = { ...detailAllocations };
    const nextAllocList: [string, number][] = Object.entries(tempAllocs)
      .map(([dept, qty]) => [dept, Number(qty)] as [string, number])
      .filter(([_, qty]) => qty > 0);

    updatedAllocations[selectedItem.ma] = nextAllocList;

    // Calculate next kp sum
    const newKpSum = nextAllocList.reduce((sum, [_, q]) => sum + q, 0);

    // Update items list to reflect updated kp sum
    const updatedItems = items.map(it => {
      if (it.ma === selectedItem.ma) {
        return { ...it, kp: newKpSum };
      }
      return it;
    });

    onUpdateInventory(updatedItems, updatedAllocations);
    setIsEditingAllocs(false);
  };

  // Inline safety stock adjustment
  const handleStartEditMn = (item: LinenItem) => {
    setEditingItemMa(item.ma);
    setTempMnValue(item.mn);
  };

  const handleSaveMn = (item: LinenItem) => {
    onEditItem(item.ma, {
      ...item,
      mn: tempMnValue
    });
    setEditingItemMa(null);
  };

  // Filter items for table
  const filteredItems = useMemo(() => {
    let list = [...itemTotals];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => d.ma.toLowerCase().includes(q) || d.ten.toLowerCase().includes(q));
    }
    if (selectedGroup) {
      list = list.filter(d => d.nhom === selectedGroup);
    }
    if (showOnlyAlerts) {
      list = list.filter(d => d.isUnderstocked);
    }
    return list;
  }, [itemTotals, searchQuery, selectedGroup, showOnlyAlerts]);

  // Alert summary statistics
  const understockCount = useMemo(() => {
    return itemTotals.filter(i => i.isUnderstocked).length;
  }, [itemTotals]);

  const criticalShortageSum = useMemo(() => {
    return itemTotals.reduce((sum, i) => sum + i.shortage, 0);
  }, [itemTotals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#1A1A1A] pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h3 className="font-serif font-black italic text-xl tracking-tight text-[#1A1A1A]">Hệ Thống Thiết Lập Định Mức & Cảnh Báo An Toàn</h3>
          <p className="text-xs text-stone-500 mt-1">Cấu hình mức tồn kho an toàn tối thiểu (`mn`) toàn viện và điều chỉnh định mức phân bổ cho từng khoa lâm sàng</p>
        </div>
      </div>

      {/* Quota Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1A1A1A] border border-[#1A1A1A] w-full">
        <div className="bg-[#F5F2ED] py-3 px-4 flex items-center gap-3">
          <div className={`p-2.5 rounded-full ${understockCount > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider font-bold text-[#8C8984]">MẶT HÀNG THIẾU HỤT</span>
            <div className="font-serif font-black text-2xl text-[#1A1A1A] leading-tight">
              {understockCount} <span className="text-xs font-sans font-normal text-stone-500">/ {items.length} mặt hàng</span>
            </div>
            <span className="text-[10px] text-stone-500 block">Đang dưới ngưỡng an toàn tối thiểu</span>
          </div>
        </div>

        <div className="bg-[#F5F2ED] py-3 px-4 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-blue-100 text-blue-600">
            <TrendingDown size={20} />
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider font-bold text-[#8C8984]">TỔNG THIẾU HỤT CẦN BÙ</span>
            <div className="font-serif font-black text-2xl text-[#C4432A] leading-tight">
              {criticalShortageSum.toLocaleString()} <span className="text-xs font-sans font-normal text-stone-500">cái</span>
            </div>
            <span className="text-[10px] text-stone-500 block">Cần đặt mua hoặc may bổ sung để đạt định mức</span>
          </div>
        </div>

        <div className="bg-[#F5F2ED] py-3 px-4 flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="block text-[8px] uppercase tracking-wider font-bold text-[#8C8984]">TỶ LỆ AN TOÀN VIỆN</span>
            <div className="font-serif font-black text-2xl text-emerald-700 leading-tight">
              {items.length > 0 ? Math.round(((items.length - understockCount) / items.length) * 100) : 100}%
            </div>
            <span className="text-[10px] text-stone-500 block">Số mặt hàng đang đạt và vượt định mức tồn</span>
          </div>
        </div>
      </div>

      {/* Main Grid for Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Safety Stock (mn) List & Filter (8 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-[#1A1A1A] bg-[#F5F2ED] p-4 space-y-4">
            <h4 className="font-serif font-black text-base text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-2">
              <Shield size={16} className="text-blue-700" />
              1. Điều Chỉnh Ngưỡng Tồn Tối Thiểu (Toàn Viện)
            </h4>

            {/* Filters bar */}
            <div className="flex flex-wrap gap-2 items-center bg-[#EBE8E3] p-2 text-xs">
              <div className="relative flex-1 min-w-[150px]">
                <input
                  type="text"
                  placeholder="Tìm theo mã/tên đồ vải..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A] py-1 pl-7 pr-2 text-[11px] focus:outline-none"
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C8984]" />
              </div>

              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                className="bg-[#F5F2ED] border border-[#1A1A1A] py-1 px-2 text-[11px] focus:outline-none w-[120px]"
              >
                <option value="">Tất cả nhóm</option>
                {LINEN_GROUPS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider text-stone-700 ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyAlerts}
                  onChange={e => setShowOnlyAlerts(e.target.checked)}
                  className="rounded border-[#1A1A1A] text-[#C4432A] focus:ring-0"
                />
                <span>Chỉ thiếu hụt</span>
              </label>
            </div>

            {/* Tabular List */}
            <div className="border border-[#1A1A1A] overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#EBE8E3] border-b border-[#1A1A1A] font-mono text-[9px] uppercase tracking-wider text-[#1A1A1A]">
                    <th className="py-2.5 px-3">Mã</th>
                    <th className="py-2.5 px-3">Tên đồ vải</th>
                    <th className="py-2.5 px-3 text-right">Tổng tồn</th>
                    <th className="py-2.5 px-3 text-right w-28 text-blue-700 font-bold">Mức an toàn (`mn`)</th>
                    <th className="py-2.5 px-3 text-center w-24">Thiếu hụt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]/10 bg-white">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[#8C8984] italic bg-[#F5F2ED]">
                        Không tìm thấy mặt hàng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const isSelected = selectedItemCode === item.ma;
                      return (
                        <tr
                          key={item.ma}
                          onClick={() => {
                            setSelectedItemCode(item.ma);
                            setIsEditingAllocs(false);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50/60 font-semibold border-l-4 border-l-blue-600' 
                              : 'hover:bg-stone-50'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono font-bold text-[#1A1A1A]">{item.ma}</td>
                          <td className="py-2 px-3 font-medium text-stone-800">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[150px] sm:max-w-xs">{item.ten}</span>
                              {item.isUnderstocked && (
                                <span className="inline-block bg-red-100 text-red-700 font-black text-[9px] px-1 rounded">LOW</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{item.tong.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            {isAdmin ? (
                              editingItemMa === item.ma ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={tempMnValue}
                                    onChange={e => setTempMnValue(parseInt(e.target.value) || 0)}
                                    className="w-16 bg-[#F5F2ED] border border-[#1A1A1A] px-1 py-0.5 text-center font-mono font-bold"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveMn(item)}
                                    className="p-1 bg-[#16A34A] text-white hover:bg-[#14833D] rounded shadow-xs"
                                    title="Lưu"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => setEditingItemMa(null)}
                                    className="p-1 bg-[#C4432A] text-white hover:bg-[#A9341F] rounded shadow-xs"
                                    title="Hủy"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2 group">
                                  <span className="font-mono font-black text-blue-600 text-[13px]">{item.mn} cái</span>
                                  <button
                                    onClick={() => handleStartEditMn(item)}
                                    className="p-0.5 text-stone-400 hover:text-blue-600 hover:bg-stone-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Sửa định mức"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="font-mono font-bold text-stone-700">{item.mn} cái</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            {item.isUnderstocked ? (
                              <span className="text-red-600 font-bold bg-red-50 border border-red-200/50 px-1.5 py-0.5 rounded">
                                -{item.shortage} cái
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded">
                                Đủ
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 text-stone-700 rounded-lg flex items-start gap-2.5 text-xs leading-normal">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-800 mb-0.5">Mẹo điều chỉnh nhanh</p>
                <p className="text-stone-600">Click vào dòng bất kỳ để mở bảng phân bổ khoa phòng chi tiết ở bên phải. Thủ kho và Admin có thể click nút bút chì 📝 kế bên cột Mức an toàn để đổi nhanh cấu hình cảnh báo mà không cần chuyển màn hình.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Detailed Department Allocation Adjustments (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedItem ? (
            <div className="border border-[#1A1A1A] bg-white p-4 space-y-4 shadow-sm">
              <div className="border-b border-black/10 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-[8px] uppercase tracking-wider font-bold text-[#8C8984]">ĐỊNH MỨC KHOA PHÒNG</span>
                  <span className="font-mono text-[10px] font-bold bg-[#1A1A1A] text-[#F5F2ED] px-2 py-0.5">{selectedItem.ma}</span>
                </div>
                <h4 className="font-serif font-black text-base text-[#1A1A1A] leading-tight truncate" title={selectedItem.ten}>
                  {selectedItem.ten}
                </h4>
                <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-widest font-bold">Nhóm loại: {selectedItem.nhom}</p>
              </div>

              {/* Status and totals in right card */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#F5F2ED] p-2.5 border border-stone-200">
                  <span className="text-[9px] text-stone-500 block uppercase font-bold">Kho chính</span>
                  <span className="text-stone-900 font-black text-sm">{selectedItem.kc.toLocaleString()} cái</span>
                </div>
                <div className="bg-[#F5F2ED] p-2.5 border border-stone-200">
                  <span className="text-[9px] text-stone-500 block uppercase font-bold">Khoa phòng</span>
                  <span className="text-[#2563EB] font-black text-sm">{selectedItem.kp.toLocaleString()} cái</span>
                </div>
              </div>

              {/* Department level quota allocation list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-stone-800 flex items-center gap-1">
                    <ClipboardList size={13} className="text-[#8C8984]" />
                    Mức phân bổ định mức:
                  </h5>
                  {isAdmin && (
                    !isEditingAllocs ? (
                      <button
                        onClick={handleStartEditAllocs}
                        className="text-[10px] text-blue-600 font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                      >
                        <Edit2 size={11} />
                        Thay đổi định mức
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveAllocs}
                          className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                        >
                          <Check size={12} />
                          Lưu lại
                        </button>
                        <button
                          onClick={() => setIsEditingAllocs(false)}
                          className="text-[10px] text-red-600 font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                        >
                          <X size={12} />
                          Hủy
                        </button>
                      </div>
                    )
                  )}
                </div>

                <div className="border border-stone-200 rounded-lg overflow-hidden divide-y divide-stone-100 max-h-[300px] overflow-y-auto pr-1">
                  {isEditingAllocs ? (
                    departments.map(dept => (
                      <div key={dept} className="p-2.5 flex items-center justify-between text-xs hover:bg-stone-50/50">
                        <span className="text-stone-700 font-medium truncate max-w-[150px]">{dept}</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            value={tempAllocs[dept] || 0}
                            onChange={e => setTempAllocs({
                              ...tempAllocs,
                              [dept]: Math.max(0, parseInt(e.target.value) || 0)
                            })}
                            className="w-16 text-center font-mono font-bold border border-stone-300 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500 bg-stone-50"
                          />
                          <span className="text-stone-400 text-[10px]">cái</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    departments.map(dept => {
                      const allocQty = (detailAllocations[selectedItem.ma] || [])
                        .find(([d]) => d === dept)?.[1] || 0;

                      return (
                        <div key={dept} className="p-2.5 flex items-center justify-between text-xs hover:bg-stone-50/50">
                          <span className="text-stone-700 font-medium truncate max-w-[200px]">{dept}</span>
                          {allocQty > 0 ? (
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/30">
                              {allocQty} cái
                            </span>
                          ) : (
                            <span className="text-stone-400 font-mono text-[11px]">—</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Low stock recommendations helper card */}
              {selectedItem.isUnderstocked && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg space-y-1 text-xs">
                  <div className="font-bold flex items-center gap-1 uppercase tracking-wide text-[10px] text-red-800">
                    <ShieldAlert size={12} />
                    Khuyến nghị cấp bù tối thiểu
                  </div>
                  <p className="text-stone-600 leading-normal text-[11px]">
                    Mặt hàng này đang thiếu hụt <b>{selectedItem.shortage} cái</b> để đạt mức an toàn tối thiểu ({selectedItem.mn} cái). Bệnh viện cần lên kế hoạch đặt may hoặc đề xuất xưởng giặt trả bù gấp.
                  </p>
                </div>
              )}

            </div>
          ) : (
            <div className="border border-dashed border-stone-300 p-8 text-center text-stone-400 text-xs italic rounded-lg">
              <ClipboardList size={32} className="mx-auto mb-2 text-stone-300" />
              Chọn một mặt hàng bên bảng để xem cấu hình phân bổ định mức chi tiết
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
