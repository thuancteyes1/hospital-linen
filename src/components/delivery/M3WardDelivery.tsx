/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LinenItem, 
  WardDeliverySlip, 
  LaundryDispatch,
  Account, 
  User, 
  Role 
} from '../../types';
import { 
  FileCheck, 
  Search, 
  X, 
  Building, 
  Clock, 
  AlertCircle,
  TrendingDown,
  Printer,
  CheckCircle2,
  Package,
  Truck
} from 'lucide-react';
import { checkPermission } from './utils/checkPermission';
import ChecklistPagination from './utils/ChecklistPagination';
import PrintBillModal, { PrintBillData } from './utils/PrintBillModal';

interface M3WardDeliveryProps {
  items: LinenItem[];
  currentAccount: Account | null;
  users: User[];
  roles: Role[];
  wardDeliverySlips: WardDeliverySlip[];
  temporaryCleanStore: Record<string, number>;
  simulatedRole: 'ward' | 'orderly' | 'housekeeping' | 'linen' | 'laundry' | 'clean' | 'all' | 'admin';
  isOrderlyUser: boolean;
  isHousekeepingUser: boolean;
  effectiveIsWardUser: boolean;
  effectiveIsLaundryUser: boolean;
  hasLinenPerm: boolean;
  currentRoleName: string;
  currentWardName: string;
  departments: string[];
  onUpdateDeliveryStates: (params: {
    wardSlips?: WardDeliverySlip[];
    laundryDispatches?: LaundryDispatch[];
    temporaryCleanStore?: Record<string, number>;
    temporaryDirtyStore?: Record<string, number>;
    temporaryCompanyDirtyStore?: Record<string, number>;
    clearHistory?: boolean;
  }) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function M3WardDelivery({
  items,
  currentAccount,
  users,
  roles,
  wardDeliverySlips,
  temporaryCleanStore,
  simulatedRole,
  isOrderlyUser,
  isHousekeepingUser,
  effectiveIsWardUser,
  effectiveIsLaundryUser,
  hasLinenPerm,
  currentRoleName,
  currentWardName,
  departments,
  onUpdateDeliveryStates,
  showToast
}: M3WardDeliveryProps) {
  const DEPARTMENTS_LIST = [
    'Khoa Cấp cứu', 'Khoa Gây mê', 'Khoa Phẫu thuật', 'Khoa Nội tổng hợp',
    'Khoa Ngoại chấn thương', 'Khoa Nhi', 'Khoa Sản', 'Khoa Hồi sức tích cực',
    'Khoa Tim mạch', 'Khoa Ung bướu', 'Khoa Da liễu', 'Khoa Tai Mũi Họng'
  ];

  const deptsToUse = departments && departments.length > 0 ? departments : DEPARTMENTS_LIST;

  const hasPerm = (roleReq: 'ward' | 'linen' | 'laundry' | 'clean' | 'housekeeping') => {
    return checkPermission(
      roleReq,
      simulatedRole,
      currentAccount,
      effectiveIsLaundryUser,
      isOrderlyUser,
      isHousekeepingUser,
      effectiveIsWardUser,
      currentRoleName,
      hasLinenPerm
    );
  };

  const isLinenOrCleanUser = hasPerm('linen') || hasPerm('clean') || !!currentAccount?.isAdmin;

  // Search state
  const [m3SearchQuery, setM3SearchQuery] = useState('');
  const [m3FilterDept, setM3FilterDept] = useState('Tất cả');
  const [selectedM1SlipIdForCleanReturn, setSelectedM1SlipIdForCleanReturn] = useState<string | null>(null);
  const [m3ReceiverName, setM3ReceiverName] = useState('');
  const [wardReceiverName, setWardReceiverName] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [rejectModalSlipId, setRejectModalSlipId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Đồ vải chưa đủ số lượng / không đạt chất lượng');

  // Clean quantities editor
  const [m3ItemCleanReturnQtys, setM3ItemCleanReturnQtys] = useState<Record<string, number>>({});

  // Checklist pagination states
  const [m3ChecklistPage, setM3ChecklistPage] = useState(1);
  const [m3ChecklistPageSize, setM3ChecklistPageSize] = useState<number | 'all'>('all');
  const [m3ChecklistSearch, setM3ChecklistSearch] = useState('');
  const [m3OnlyShowDelivered, setM3OnlyShowDelivered] = useState(false);
  const [m3SelectedTrang, setM3SelectedTrang] = useState<string>('all');

  // Map item code to its designated Trang Bill
  const itemTrangMap = useMemo(() => {
    const map: Record<string, string> = {};
    (items || []).forEach(it => {
      map[it.ma] = it.trang || 'Trang 1';
    });
    return map;
  }, [items]);

  const detailSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setM3ChecklistPage(1);
    setM3ChecklistSearch('');
    setM3OnlyShowDelivered(false);
    if (selectedM1SlipIdForCleanReturn && detailSectionRef.current) {
      detailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedM1SlipIdForCleanReturn]);

  // Helper function to format dates for robust searching
  const getAllDateRepresentations = (val?: string) => {
    if (!val) return '';
    let res = val.toLowerCase();
    let yyyy = '', mm = '', dd = '';
    const isoMatch = val.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (isoMatch) {
      yyyy = isoMatch[1];
      mm = isoMatch[2];
      dd = isoMatch[3];
    } else {
      const vnMatch = val.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (vnMatch) {
        dd = vnMatch[1];
        mm = vnMatch[2];
        yyyy = vnMatch[3];
      }
    }
    if (yyyy && mm && dd) {
      const ddPad = dd.padStart(2, '0');
      const mmPad = mm.padStart(2, '0');
      const ddNoPad = parseInt(dd, 10).toString();
      const mmNoPad = parseInt(mm, 10).toString();
      res += ` ${yyyy}-${mmPad}-${ddPad} ${yyyy}/${mmPad}/${ddPad} ${ddPad}/${mmPad}/${yyyy} ${ddPad}-${mmPad}-${yyyy} ${ddNoPad}/${mmNoPad}/${yyyy} ${ddNoPad}-${mmNoPad}-${yyyy} ${ddPad}${mmPad}${yyyy.slice(-2)}`;
    }
    return res;
  };

  const [m3StatusTab, setM3StatusTab] = useState<'pending' | 'completed' | 'all'>('all');

  const filteredM3Slips = useMemo(() => {
    return wardDeliverySlips.filter(slip => {
      // Filter by department
      if (effectiveIsWardUser && !isOrderlyUser) {
        if (slip.dept !== currentWardName) return false;
      } else if (m3FilterDept !== 'Tất cả') {
        if (slip.dept !== m3FilterDept) return false;
      }

      if (m3SearchQuery.trim()) {
        const q = m3SearchQuery.toLowerCase();
        const matchesId = slip.id.toLowerCase().includes(q) || (slip.originalSlipId && slip.originalSlipId.toLowerCase().includes(q));
        const matchesDept = slip.dept.toLowerCase().includes(q);
        const matchesDate = getAllDateRepresentations(slip.createdAt).includes(q);
        if (!matchesId && !matchesDept && !matchesDate) return false;
        return true;
      }

      if (m3StatusTab === 'pending') {
        if (slip.status === 'completed') return false;
      } else if (m3StatusTab === 'completed') {
        if (slip.status !== 'completed') return false;
      }

      return true;
    });
  }, [wardDeliverySlips, m3SearchQuery, m3FilterDept, m3StatusTab, effectiveIsWardUser, isOrderlyUser, currentWardName]);

  const activeSlip = useMemo(() => {
    return wardDeliverySlips.find(s => s.id === selectedM1SlipIdForCleanReturn) || null;
  }, [wardDeliverySlips, selectedM1SlipIdForCleanReturn]);

  const filteredM3Items = useMemo(() => {
    if (!activeSlip) return [];
    let list = [...activeSlip.items];

    // 1. Sort items strictly by Trang Bill setup in master catalog (Trang 1, Trang 2...), then by item code
    list.sort((a, b) => {
      const trangA = itemTrangMap[a.ma] || (a as any).trang || 'Trang 1';
      const trangB = itemTrangMap[b.ma] || (b as any).trang || 'Trang 1';
      if (trangA !== trangB) {
        return trangA.localeCompare(trangB, undefined, { numeric: true });
      }
      return a.ma.localeCompare(b.ma, undefined, { numeric: true });
    });

    // 2. Filter by selected Trang Bill
    if (m3SelectedTrang && m3SelectedTrang !== 'all') {
      list = list.filter(it => {
        const itemTrang = itemTrangMap[it.ma] || (it as any).trang || 'Trang 1';
        return itemTrang === m3SelectedTrang;
      });
    }

    if (m3ChecklistSearch.trim()) {
      const q = m3ChecklistSearch.toLowerCase();
      list = list.filter(
        it => it.ten.toLowerCase().includes(q) || it.ma.toLowerCase().includes(q)
      );
    }

    if (m3OnlyShowDelivered) {
      list = list.filter(it => {
        const limitDirty = it.verifiedDirtyQty ?? it.qty;
        const inputQty = m3ItemCleanReturnQtys[it.ma] !== undefined ? m3ItemCleanReturnQtys[it.ma] : limitDirty;
        return limitDirty > 0 || inputQty > 0;
      });
    }

    return list;
  }, [activeSlip, m3SelectedTrang, itemTrangMap, m3ChecklistSearch, m3OnlyShowDelivered, m3ItemCleanReturnQtys]);

  const getM3ItemDeliveryQty = (item: any) => {
    if (activeSlip && (activeSlip.status === 'clean_returned_pending_ward' || activeSlip.status === 'completed')) {
      return item.cleanReturnedQty ?? item.hospitalCleanQty ?? 0;
    }
    const limitDirty = item.verifiedDirtyQty ?? item.qty;
    const inputQty = m3ItemCleanReturnQtys[item.ma] !== undefined ? m3ItemCleanReturnQtys[item.ma] : limitDirty;
    return Math.max(limitDirty, inputQty);
  };

  const effectiveM3PageSize = useMemo(() => {
    if (m3ChecklistPageSize === 'all') return filteredM3Items.length || 1;
    return m3ChecklistPageSize;
  }, [m3ChecklistPageSize, filteredM3Items.length]);

  const totalM3Pages = useMemo(() => {
    if (m3ChecklistPageSize === 'all') return 1;
    return Math.max(1, Math.ceil(filteredM3Items.length / effectiveM3PageSize));
  }, [filteredM3Items.length, effectiveM3PageSize, m3ChecklistPageSize]);

  const paginatedM3Items = useMemo(() => {
    if (m3ChecklistPageSize === 'all') return filteredM3Items;
    const start = (m3ChecklistPage - 1) * effectiveM3PageSize;
    return filteredM3Items.slice(start, start + effectiveM3PageSize);
  }, [filteredM3Items, m3ChecklistPage, effectiveM3PageSize, m3ChecklistPageSize]);

  const m3StartIndex = (m3ChecklistPage - 1) * (m3ChecklistPageSize === 'all' ? filteredM3Items.length : m3ChecklistPageSize);
  const m3EndIndex = Math.min(
    m3StartIndex + (m3ChecklistPageSize === 'all' ? filteredM3Items.length : m3ChecklistPageSize),
    filteredM3Items.length
  );

  const handleReturnCleanM3 = (slipId: string) => {
    const slip = wardDeliverySlips.find(s => s.id === slipId);
    if (!slip) return;

    // Check permissions
    if (effectiveIsWardUser && !isOrderlyUser) {
      showToast('⚠️ Bạn không có quyền thực hiện trả sạch đồ vải khoa phòng!', 'error');
      return;
    }

    let totalActualCleanReturned = 0;
    const cappedItemsInfo: string[] = [];
    const debtItems: Array<any> = [];
    const updatedItems = slip.items.map(item => {
      let cleanQty = item.verifiedDirtyQty ?? item.qty;
      if (m3ItemCleanReturnQtys[item.ma] !== undefined) {
        cleanQty = m3ItemCleanReturnQtys[item.ma];
      }

      const availableClean = temporaryCleanStore[item.ma] || 0;
      let actualCleanQty = cleanQty;

      if (cleanQty > availableClean) {
        actualCleanQty = availableClean;
        cappedItemsInfo.push(`${item.ten} (Yêu cầu trả: ${cleanQty}, Thực trả: ${actualCleanQty} do hết kho, Tự động chuyển nợ: ${cleanQty - actualCleanQty})`);
      }

      totalActualCleanReturned += actualCleanQty;

      const targetDirtyQty = item.verifiedDirtyQty ?? item.qty;
      const debt = targetDirtyQty - actualCleanQty;
      if (debt > 0) {
        debtItems.push({
          ma: item.ma,
          ten: item.ten,
          group: item.group,
          qty: debt,
          isInfectious: item.isInfectious,
          isCustom: item.isCustom,
          verifiedDirtyQty: debt,
          isVerifiedDirty: true,
          cleanReturnedQty: debt,
          hospitalCleanQty: debt
        });
      }
      return {
        ...item,
        isHospitalCleanVerified: true,
        hospitalCleanQty: actualCleanQty,
        cleanReturnedQty: actualCleanQty
      };
    });

    if (totalActualCleanReturned === 0) {
      showToast('⚠️ Không có đồ vải sạch nào trong Kho sạch tạm để thực hiện trả sạch (Thực trả bằng 0)! Vui lòng kiểm tra lại.', 'error');
      return;
    }

    let nextSlips = wardDeliverySlips.map(s => {
      if (s.id === slipId) {
        return {
          ...s,
          items: updatedItems,
          status: 'clean_returned_pending_ward' as const,
          rejectionNote: undefined,
          hospitalCleanBy: currentAccount?.name || 'Nhân viên Đồ sạch',
          hospitalCleanAt: new Date().toLocaleString('vi-VN'),
          receiver: m3ReceiverName || `Điều dưỡng ${s.dept}`
        };
      }
      return s;
    });

    const hasDebt = debtItems.length > 0;
    if (hasDebt) {
      const rootSlipId = slip.originalSlipId || slip.id;
      const rootCreatedAt = slip.originalCreatedAt || slip.createdAt;
      const debtSlipId = `NỢ-KHOA-${Date.now().toString().slice(-5)}`;
      const debtSlip: WardDeliverySlip = {
        id: debtSlipId,
        dept: slip.dept,
        createdAt: new Date().toLocaleString('vi-VN'),
        createdBy: `Hệ thống (Tách nợ từ ${rootSlipId})`,
        originalSlipId: rootSlipId,
        originalCreatedAt: rootCreatedAt,
        status: 'pending' as const,
        items: debtItems,
        confirmedBy: currentAccount?.name || 'Nhân viên đồ vải',
        confirmedAt: new Date().toLocaleString('vi-VN')
      };
      nextSlips.unshift(debtSlip);
    }

    // Deduct returned clean from temporaryCleanStore
    const nextCleanStore = { ...temporaryCleanStore };
    updatedItems.forEach(item => {
      nextCleanStore[item.ma] = Math.max(0, (nextCleanStore[item.ma] || 0) - item.cleanReturnedQty);
    });

    onUpdateDeliveryStates({
      wardSlips: nextSlips,
      temporaryCleanStore: nextCleanStore
    });

    setSelectedM1SlipIdForCleanReturn(null);
    setM3ReceiverName('');

    if (cappedItemsInfo.length > 0) {
      showToast(`ℹ️ Đã tự động điều chỉnh số lượng thực trả do tồn kho sạch không đủ:\n${cappedItemsInfo.join('\n')}\nPhần thiếu hụt đã được tự động tách thành Phiếu Nợ Khoa Phòng!`, 'info');
    } else {
      showToast(`Đã gửi bàn giao đồ sạch cho Khoa ${slip.dept}! Đang chờ Khoa phòng kiểm đếm và XÁC NHẬN nhận đồ.`, 'info');
    }
  };

  const handleWardConfirmCleanReceipt = (slipId: string) => {
    const slip = wardDeliverySlips.find(s => s.id === slipId);
    if (!slip) return;

    const confirmedName = wardReceiverName.trim() || slip.receiver || m3ReceiverName.trim() || currentAccount?.name || 'Điều dưỡng Khoa';

    const nextSlips = wardDeliverySlips.map(s => {
      if (s.id === slipId) {
        return {
          ...s,
          status: 'completed' as const,
          confirmedBy: confirmedName,
          confirmedAt: new Date().toLocaleString('vi-VN'),
          receiver: confirmedName
        };
      }
      return s;
    });

    onUpdateDeliveryStates({ wardSlips: nextSlips });
    setWardReceiverName('');
    showToast(`✅ Khoa phòng ${slip.dept} đã xác nhận nhận đủ đồ sạch thành công!`, 'success');
  };

  const openWardRejectModal = (slipId: string) => {
    setRejectModalSlipId(slipId);
    setRejectReason('Đồ vải chưa đủ số lượng / không đạt chất lượng');
  };

  const confirmWardRejectCleanReceipt = () => {
    if (!rejectModalSlipId) return;
    const slipId = rejectModalSlipId;
    const slip = wardDeliverySlips.find(s => s.id === slipId);
    if (!slip) {
      setRejectModalSlipId(null);
      return;
    }

    const reason = rejectReason.trim() || 'Đồ vải chưa đủ số lượng / không đạt chất lượng';

    // Restore clean items back to temporaryCleanStore
    const nextCleanStore = { ...temporaryCleanStore };
    slip.items.forEach(item => {
      const qtyToReturn = item.cleanReturnedQty || item.hospitalCleanQty || 0;
      if (qtyToReturn > 0) {
        nextCleanStore[item.ma] = (nextCleanStore[item.ma] || 0) + qtyToReturn;
      }
    });

    const nextSlips = wardDeliverySlips.map(s => {
      if (s.id === slipId) {
        return {
          ...s,
          status: 'laundry_returned' as const, // Revert back to clean-pending state
          rejectionNote: reason,
          rejectedBy: currentAccount?.name || 'Khoa phòng',
          rejectedAt: new Date().toLocaleString('vi-VN'),
          hospitalCleanBy: undefined,
          hospitalCleanAt: undefined
        };
      }
      return s;
    });

    onUpdateDeliveryStates({
      wardSlips: nextSlips,
      temporaryCleanStore: nextCleanStore
    });

    setRejectModalSlipId(null);
    showToast(`⚠️ Khoa phòng ${slip.dept} đã TỪ CHỐI nhận đồ sạch! Đồ vải sạch đã được HOÀN TRẢ LẠI KHO SẠCH TẠM.`, 'info');
  };

  return (
    <div className="space-y-6">
      {effectiveIsLaundryUser ? (
        <div className="bg-purple-50 border border-purple-300 text-purple-900 p-8 rounded-xl text-center shadow-sm max-w-xl mx-auto my-8">
          <AlertCircle className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <p className="font-bold text-lg mb-1">Không thuộc phạm vi quyền hạn Xưởng giặt Công ty</p>
          <p className="text-sm text-stone-600 mb-4">
            Tài khoản công ty giặt chỉ được phép truy cập và thao tác tại <strong>Giao nhận sạch Cty</strong>. Giao nhận đồ dơ và Giao nhận sạch khoa phòng không thuộc phạm vi làm việc của xưởng giặt.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Slips and clean store info */}
          <div className="lg:col-span-5 space-y-4">
            {/* Kho sạch display card */}
            {!isOrderlyUser && (
              <div className="border border-emerald-300 bg-emerald-50/40 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1.5 font-bold mb-2">
                  <Package className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Kho đồ sạch tại Bệnh viện (Sẵn sàng trả khoa phòng)</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs max-h-[160px] overflow-y-auto">
                  {Object.keys(temporaryCleanStore).filter(ma => (temporaryCleanStore[ma] || 0) > 0).length > 0 ? (
                    Object.keys(temporaryCleanStore).map(ma => {
                      const item = items.find(i => i.ma === ma);
                      if (!temporaryCleanStore[ma]) return null;
                      return (
                        <div key={ma} className="bg-white border border-emerald-200 px-2.5 py-1.5 rounded-lg font-medium flex justify-between items-center text-xs shadow-xs">
                          <span className="truncate text-stone-700 font-bold">{item?.ten || ma}</span>
                          <span className="font-mono font-black text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded text-[10px] shrink-0 ml-1">
                            {temporaryCleanStore[ma]} cái
                          </span>
                        </div>
                      );
                    })
                  ) : null}
                </div>
              </div>
            )}

            {/* Select clinical slips representing original dirty sheets to pay back */}
            <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase text-stone-800 tracking-wider block">
                  Trả đồ sạch cho khoa phòng
                </span>
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setM3StatusTab('all')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${m3StatusTab === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setM3StatusTab('pending')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${m3StatusTab === 'pending' ? 'bg-white text-amber-800 shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Chờ trả
                  </button>
                  <button
                    type="button"
                    onClick={() => setM3StatusTab('completed')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${m3StatusTab === 'completed' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Đã giao
                  </button>
                </div>
              </div>

              {/* Filters for M3: Tìm kiếm theo ngày & Khoa */}
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 flex-1 shadow-2xs">
                  <Search size={14} className="text-stone-400 shrink-0" />
                  <input
                    type="text"
                    value={m3SearchQuery}
                    onChange={e => setM3SearchQuery(e.target.value)}
                    placeholder="Tìm mã phiếu, ngày, khoa..."
                    className="w-full bg-transparent text-xs text-stone-800 focus:outline-none"
                  />
                  {m3SearchQuery && (
                    <button onClick={() => setM3SearchQuery('')} className="text-stone-400 hover:text-stone-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {(!effectiveIsWardUser || isOrderlyUser) && (
                  <select
                    value={m3FilterDept}
                    onChange={e => setM3FilterDept(e.target.value)}
                    className="bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer max-w-full sm:max-w-[150px]"
                  >
                    <option value="Tất cả">Tất cả khoa</option>
                    {deptsToUse.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {filteredM3Slips.map(slip => {
                  const isDebt = slip.id.startsWith('NỢ-');
                  const isCompleted = slip.status === 'completed';
                  return (
                    <div
                      key={slip.id}
                      onClick={() => {
                        setSelectedM1SlipIdForCleanReturn(slip.id);
                        // Populate clean return quantities inputs
                        const initClean: Record<string, number> = {};
                        slip.items.forEach(it => {
                          initClean[it.ma] = it.verifiedDirtyQty ?? it.qty;
                        });
                        setM3ItemCleanReturnQtys(initClean);
                      }}
                      className={`p-2.5 border rounded-lg cursor-pointer transition-all flex justify-between items-center ${
                        selectedM1SlipIdForCleanReturn === slip.id 
                          ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
                          : isDebt 
                            ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-100/60' 
                            : 'hover:bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="text-xs">
                        <span className="font-mono font-bold text-stone-800 block flex flex-wrap items-center gap-1">
                          {isDebt && <span className="text-rose-600 font-extrabold text-[10px] bg-rose-100 px-1.5 py-0.2 rounded">⚠️ NỢ</span>}
                          {slip.id}
                        </span>
                        <span className="text-[10px] font-black text-emerald-800 block mt-0.5">Khoa: {slip.dept}</span>
                        <span className="text-[9px] text-stone-400 block mt-0.5">Ngày tạo: {slip.createdAt}</span>
                      </div>
                      {(() => {
                        const isPendingWard = slip.status === 'clean_returned_pending_ward';
                        return (
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                            isCompleted 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isPendingWard 
                                ? 'bg-blue-100 text-blue-800 animate-pulse border border-blue-300' 
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isCompleted ? 'Đã giao sạch' : isPendingWard ? 'Chờ khoa xác nhận' : 'Chờ trả sạch'}
                          </span>
                        );
                      })()}
                    </div>
                  );
                })}
                {filteredM3Slips.length === 0 && (
                  <div className="text-center py-6 text-stone-400 text-xs italic">
                    Trống - Không có phiếu yêu cầu trả sạch khoa phòng nào cần xử lý.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Master Bill Workspace */}
          <div className="lg:col-span-7">
            {activeSlip ? (
              <div ref={detailSectionRef} className="border border-stone-300 bg-white rounded-xl shadow-sm p-5 space-y-4 animate-fade-in scroll-mt-6">
                <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                  <div>
                    <h2 className="text-sm font-bold text-stone-900 uppercase">Đối soát trả sạch cho khoa {activeSlip.dept}</h2>
                    <span className="text-xs text-stone-500 block mt-0.5">
                      Phiếu gốc: {activeSlip.id} • Người tạo: {activeSlip.createdBy || 'Khoa phòng'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold border border-amber-300 text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold shadow-2xs"
                      title="Xem trước & In phiếu bàn giao đồ sạch cho khoa phòng"
                    >
                      <Printer size={14} className="text-amber-600" /> In phiếu
                    </button>
                    <button onClick={() => setSelectedM1SlipIdForCleanReturn(null)} className="text-stone-400 hover:text-stone-900 cursor-pointer p-1"><X size={18} /></button>
                  </div>
                </div>

                {activeSlip.originalSlipId && (
                  <div className="p-2.5 bg-stone-50 border border-stone-200 text-stone-600 text-xs rounded-lg font-medium">
                    🔗 <b>Lịch sử:</b> Phiếu được tách nợ từ hóa đơn gốc <span className="font-mono font-bold">#{activeSlip.originalSlipId}</span> lập ngày {activeSlip.originalCreatedAt || activeSlip.createdAt}
                  </div>
                )}

                {/* Items and verification inputs */}
                <div className="space-y-2">
                  <span className="block text-xs font-black uppercase tracking-wider text-stone-500 font-bold">
                    Chi tiết kiểm đếm bàn giao trả sạch
                  </span>

                  <ChecklistPagination
                    currentPage={m3ChecklistPage}
                    totalPages={totalM3Pages}
                    pageSize={m3ChecklistPageSize}
                    totalItems={activeSlip.items.length}
                    filteredCount={filteredM3Items.length}
                    startIndex={m3StartIndex}
                    endIndex={m3EndIndex}
                    searchQuery={m3ChecklistSearch}
                    themeColor="emerald"
                    selectedTrang={m3SelectedTrang}
                    onTrangChange={(trang) => {
                      setM3SelectedTrang(trang);
                      setM3ChecklistPage(1);
                    }}
                    itemTrangMap={itemTrangMap}
                    itemsList={activeSlip.items}
                    getItemDeliveryQty={getM3ItemDeliveryQty}
                    onlyShowDelivered={m3OnlyShowDelivered}
                    onToggleOnlyDelivered={(val) => {
                      setM3OnlyShowDelivered(val);
                      setM3ChecklistPage(1);
                    }}
                    onPageChange={(p) => setM3ChecklistPage(p)}
                    onPageSizeChange={(sz) => {
                      setM3ChecklistPageSize(sz);
                      setM3ChecklistPage(1);
                    }}
                    onSearchChange={(q) => {
                      setM3ChecklistSearch(q);
                      setM3ChecklistPage(1);
                    }}
                  />
                  
                  <div className="border border-stone-200 rounded-lg overflow-x-auto bg-stone-50">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                          <th className="p-2.5 text-xs">TÊN ĐỒ VẢI</th>
                          <th className="p-2.5 text-right text-xs">SỐ DƠ GIAO ĐI</th>
                          <th className="p-2.5 text-right text-xs">SẴN CÓ TRONG KHO</th>
                          <th className="p-2.5 text-center text-xs bg-emerald-50/50 font-bold text-emerald-800">THỰC GIAO TRẢ SẠCH</th>
                          <th className="p-2.5 text-center text-xs bg-rose-50/50 font-bold text-rose-700">TIẾP TỤC NỢ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 bg-white font-medium">
                        {paginatedM3Items.length > 0 ? (
                          paginatedM3Items.map(item => {
                            const isSubmittedOrCompleted = activeSlip.status === 'clean_returned_pending_ward' || activeSlip.status === 'completed';
                            const limitDirty = item.verifiedDirtyQty ?? item.qty;
                            const inStock = temporaryCleanStore[item.ma] || 0;
                            const inputQty = m3ItemCleanReturnQtys[item.ma] !== undefined ? m3ItemCleanReturnQtys[item.ma] : limitDirty;
                            
                            const actualRepay = isSubmittedOrCompleted
                              ? (item.cleanReturnedQty ?? item.hospitalCleanQty ?? 0)
                              : Math.min(inputQty, inStock);

                            const remainingDebt = Math.max(0, limitDirty - actualRepay);
                            const activeQty = getM3ItemDeliveryQty(item);
                            const hasDelivery = activeQty > 0;
                            const isEditable = isLinenOrCleanUser && !isSubmittedOrCompleted;
                            
                            return (
                              <tr key={item.ma} className={`transition-colors ${
                                hasDelivery ? 'bg-emerald-50/50 font-semibold border-l-4 border-l-emerald-500' : 'hover:bg-stone-50 text-stone-600'
                              }`}>
                                <td className="p-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-xs ${hasDelivery ? 'font-black text-stone-900' : 'font-medium text-stone-700'}`}>{item.ten}</span>
                                  </div>
                                  <span className="text-[9px] text-stone-400 font-mono block mt-0.5">{item.ma}</span>
                                </td>
                              <td className="p-2.5 text-right font-mono text-stone-700 font-bold">
                                {limitDirty} cái
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                                {inStock} cái
                              </td>
                              <td className="p-2.5 text-center bg-emerald-50/10 font-bold text-emerald-800 font-mono">
                                {isEditable ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <input
                                      type="number"
                                      className="w-20 h-8 border border-emerald-300 rounded-lg text-center text-xs font-mono font-black text-emerald-800 bg-white focus:ring-1 focus:ring-emerald-500"
                                      value={inputQty}
                                      onChange={e => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setM3ItemCleanReturnQtys(prev => ({ ...prev, [item.ma]: val }));
                                      }}
                                    />
                                    {inputQty > inStock && (
                                      <span className="text-[9px] text-rose-600 font-bold">Kho thiếu {inputQty - inStock} cái</span>
                                    )}
                                  </div>
                                ) : (
                                  <span>{actualRepay} cái</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center bg-rose-50/10">
                                {remainingDebt > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                                    Nợ lại {remainingDebt}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600">Trả đủ ✓</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-stone-400 text-xs italic">
                            Không tìm thấy đồ vải nào phù hợp với bộ lọc.
                          </td>
                        </tr>
                      )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Receiver & Action Panel */}
                {activeSlip.status === 'completed' ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center text-xs text-emerald-800 font-bold flex items-center justify-center gap-2 shadow-2xs">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>✓ Phiếu đã được Khoa phòng xác nhận nhận đủ đồ sạch ({activeSlip.confirmedBy || activeSlip.receiver || activeSlip.hospitalCleanBy || 'Đã bàn giao'}). Đã hoàn tất thủ tục!</span>
                  </div>
                ) : activeSlip.status === 'clean_returned_pending_ward' ? (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase">
                      <Clock size={16} className="text-amber-600 shrink-0 animate-spin-slow" />
                      <span>⏳ Chờ Khoa Phòng [{activeSlip.dept}] Kiểm Đếm & Xác Nhận Nhận Đồ Sạch</span>
                    </div>

                    {activeSlip.rejectionNote && (
                      <div className="p-2 bg-rose-100 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
                        ⚠️ Lần bàn giao trước bị từ chối: "{activeSlip.rejectionNote}" ({activeSlip.rejectedBy}, {activeSlip.rejectedAt})
                      </div>
                    )}

                    <p className="text-xs text-amber-800 font-medium">
                      Kho đồ vải đã bàn giao sạch lúc <b>{activeSlip.hospitalCleanAt}</b> (Người giao: <b>{activeSlip.hospitalCleanBy}</b>, Dự kiến người nhận: <b>{activeSlip.receiver}</b>).
                    </p>

                    {(effectiveIsWardUser || isOrderlyUser) || currentAccount?.isAdmin ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-amber-200">
                        <div className="flex-1">
                          <label className="text-[10px] text-amber-900 font-bold uppercase block mb-1">Tên điều dưỡng / người nhận tại khoa:</label>
                          <input
                            type="text"
                            value={wardReceiverName}
                            onChange={e => setWardReceiverName(e.target.value)}
                            placeholder={activeSlip.receiver || "Nhập tên người nhận tại khoa..."}
                            className="w-full h-9 border border-amber-300 rounded-lg px-3 text-xs font-bold text-stone-800 bg-white focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1 sm:pt-4">
                          <button
                            type="button"
                            onClick={() => handleWardConfirmCleanReceipt(activeSlip.id)}
                            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 size={16} /> Khoa Phòng Xác Nhận Nhận
                          </button>
                          <button
                            type="button"
                            onClick={() => openWardRejectModal(activeSlip.id)}
                            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <X size={16} /> Từ Chối (Hoàn Trả Kho Sạch Tạm)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-xs font-medium text-center">
                        ⏳ Chỉ tài khoản Điều dưỡng/Hộ lý của Khoa {activeSlip.dept} mới có quyền xác nhận hoặc từ chối nhận đồ sạch tại đây.
                      </div>
                    )}
                  </div>
                ) : isLinenOrCleanUser ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3 shadow-xs">
                    <h3 className="text-xs font-black uppercase text-emerald-900 tracking-wider font-bold">
                      Xác nhận bàn giao sạch cho Khoa phòng
                    </h3>
                    {activeSlip.rejectionNote && (
                      <div className="p-2 bg-rose-100 border border-rose-300 text-rose-800 text-xs rounded-lg font-medium">
                        ⚠️ Khoa phòng từng TỪ CHỐI nhận đồ sạch: "{activeSlip.rejectionNote}" ({activeSlip.rejectedBy}, {activeSlip.rejectedAt}). Vui lòng kiểm tra lại số lượng trước khi bấm gửi bàn giao.
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500 font-bold uppercase">Tên điều dưỡng / người nhận sạch:</label>
                        <input
                          type="text"
                          className="w-full h-9 border border-stone-300 rounded-lg px-3 text-xs font-bold text-stone-800 focus:ring-1 focus:ring-emerald-500"
                          placeholder="Nhập tên điều dưỡng nhận bàn giao..."
                          value={m3ReceiverName}
                          onChange={e => setM3ReceiverName(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end pt-4">
                        <button
                          onClick={() => handleReturnCleanM3(activeSlip.id)}
                          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
                        >
                          Gửi Bàn Giao Sạch Cho Khoa Phòng 🚀
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center text-xs text-amber-800 font-bold">
                    ⏳ Chỉ Nhân viên đồ vải / Kho trung tâm bệnh viện mới có quyền bấm xác nhận bàn giao đồ sạch cho khoa phòng.
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 border border-dashed border-stone-200 rounded-xl flex items-center justify-center">
              </div>
            )}
          </div>
        </div>
      )}

      <PrintBillModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={activeSlip ? {
          title: "PHIẾU BÀN GIAO ĐỒ SẠCH CHO KHOA PHÒNG",
          subTitle: `Bộ phận Quản lý Đồ Vải bàn giao đồ sạch sử dụng cho khoa phòng`,
          billId: activeSlip.id,
          date: activeSlip.cleanReturnedAt || new Date().toLocaleString('vi-VN'),
          dept: activeSlip.dept,
          sender: currentAccount?.name || 'Nhân viên Đồ Vải',
          receiver: m3ReceiverName || activeSlip.cleanReturnedTo || 'Đại diện Khoa',
          guestName: activeSlip.guestName,
          guestRoom: activeSlip.guestRoom,
          statusText: activeSlip.status === 'clean_returned' ? 'Đã giao sạch' : 'Chờ giao sạch',
          items: activeSlip.items.map(it => ({
            ma: it.ma,
            ten: it.ten,
            group: it.group,
            qty: it.verifiedDirtyQty ?? it.qty,
            realQty: m3ItemCleanReturnQtys[it.ma] !== undefined ? m3ItemCleanReturnQtys[it.ma] : (it.cleanReturnedQty ?? (it.verifiedDirtyQty ?? it.qty)),
            note: ''
          }))
        } : null}
      />

      {rejectModalSlipId && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                <AlertCircle size={18} />
                <span>Xác nhận từ chối nhận đồ sạch</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalSlipId(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-stone-600 font-medium">
                Vui lòng nhập lý do Khoa phòng từ chối nhận phiếu bàn giao này. Tồn kho đồ vải sạch sẽ được <b>hoàn trả lại Kho sạch tạm</b> và phiếu giao quay lại trạng thái chờ giao.
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                className="w-full border border-stone-300 rounded-xl p-3 text-xs font-medium text-stone-800 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRejectModalSlipId(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmWardRejectCleanReceipt}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X size={15} /> Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
