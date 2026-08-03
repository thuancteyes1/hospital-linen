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
  User as UserType, 
  Role 
} from '../../types';
import { 
  Sparkles, 
  Truck, 
  Search, 
  X, 
  Check, 
  Clock, 
  FileCheck,
  AlertCircle,
  Printer,
  Factory,
  Bed,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Building2,
  User as UserIcon,
  DoorClosed
} from 'lucide-react';
import { checkPermission } from './utils/checkPermission';
import ChecklistPagination from './utils/ChecklistPagination';
import PrintBillModal, { PrintBillData } from './utils/PrintBillModal';

interface M2CompanyCleanProps {
  items: LinenItem[];
  currentAccount: Account | null;
  users: UserType[];
  roles: Role[];
  wardDeliverySlips: WardDeliverySlip[];
  laundryDispatches: LaundryDispatch[];
  temporaryDirtyStore: Record<string, number>;
  temporaryCompanyDirtyStore: Record<string, number>;
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

export default function M2CompanyClean({
  items,
  currentAccount,
  users,
  roles,
  wardDeliverySlips,
  laundryDispatches,
  temporaryDirtyStore,
  temporaryCompanyDirtyStore,
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
}: M2CompanyCleanProps) {
  // Wrapper for permission
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

  const canVerifyCleanReturn = !effectiveIsLaundryUser && (
    hasPerm('linen') || 
    hasPerm('clean') || 
    !!currentAccount?.isAdmin || 
    (currentRoleName || '').toLowerCase().includes('thủ kho') || 
    (currentRoleName || '').toLowerCase().includes('thủ trưởng') || 
    (currentRoleName || '').toLowerCase().includes('đồ vải') || 
    (currentRoleName || '').toLowerCase().includes('trưởng kho') || 
    (currentRoleName || '').toLowerCase().includes('quản trị')
  );

  const [m2SearchQuery, setM2SearchQuery] = useState('');
  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Verification state editors
  const [m2ItemHandoverQtys, setM2ItemHandoverQtys] = useState<Record<string, number>>({});
  const [m2ItemHandoverNotes, setM2ItemHandoverNotes] = useState<Record<string, string>>({});
  const [m2HandoverCheckedItems, setM2HandoverCheckedItems] = useState<Record<string, boolean>>({});

  const [m2ItemCleanQtys, setM2ItemCleanQtys] = useState<Record<string, number>>({});
  const [m2ItemHospitalVerifyQtys, setM2ItemHospitalVerifyQtys] = useState<Record<string, number>>({});

  const [m2StatusTab, setM2StatusTab] = useState<'active' | 'completed' | 'all'>('all');

  const filteredM2Dispatches = useMemo(() => {
    let result = [...laundryDispatches];
    if (m2SearchQuery.trim()) {
      const q = m2SearchQuery.toLowerCase();
      return result.filter(d => 
        d.id.toLowerCase().includes(q) || 
        d.createdAt.toLowerCase().includes(q) ||
        (d.plate || '').toLowerCase().includes(q) ||
        (d.driver || '').toLowerCase().includes(q) ||
        (d.contractor || '').toLowerCase().includes(q)
      );
    }

    if (m2StatusTab === 'active') {
      result = result.filter(d => d.status === 'washing' || d.status === 'returning_clean');
    } else if (m2StatusTab === 'completed') {
      result = result.filter(d => d.status === 'completed');
    } else {
      result = result.filter(d => d.status !== 'pending_laundry');
    }

    return result;
  }, [laundryDispatches, m2SearchQuery, m2StatusTab]);

  const activeDispatch = useMemo(() => {
    return laundryDispatches.find(d => d.id === activeDispatchId) || null;
  }, [laundryDispatches, activeDispatchId]);

  // Checklist pagination states
  const [m2CleanPage, setM2CleanPage] = useState(1);
  const [m2CleanPageSize, setM2CleanPageSize] = useState<number | 'all'>('all');
  const [m2CleanSearch, setM2CleanSearch] = useState('');
  const [m2CleanOnlyDelivered, setM2CleanOnlyDelivered] = useState(false);
  const [m2SelectedTrang, setM2SelectedTrang] = useState<string>('all');

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
    setM2CleanPage(1);
    setM2CleanSearch('');
    setM2CleanOnlyDelivered(false);
    if (activeDispatchId && detailSectionRef.current) {
      detailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeDispatchId]);

  const filteredCleanItems = useMemo(() => {
    if (!activeDispatch) return [];
    let list = [...activeDispatch.items];

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
    if (m2SelectedTrang && m2SelectedTrang !== 'all') {
      list = list.filter(it => {
        const itemTrang = itemTrangMap[it.ma] || (it as any).trang || 'Trang 1';
        return itemTrang === m2SelectedTrang;
      });
    }

    if (m2CleanSearch.trim()) {
      const q = m2CleanSearch.toLowerCase();
      list = list.filter(
        it => it.ten.toLowerCase().includes(q) || it.ma.toLowerCase().includes(q)
      );
    }

    if (m2CleanOnlyDelivered) {
      list = list.filter(it => {
        const cleanQty = m2ItemCleanQtys[it.ma] !== undefined ? m2ItemCleanQtys[it.ma] : it.handoverQty;
        const verifyQty = m2ItemHospitalVerifyQtys[it.ma] ?? (it.hospitalReceivedQty ?? it.cleanReturnedQty);
        return it.handoverQty > 0 || cleanQty > 0 || verifyQty > 0;
      });
    }

    return list;
  }, [activeDispatch, m2SelectedTrang, itemTrangMap, m2CleanSearch, m2CleanOnlyDelivered, m2ItemCleanQtys, m2ItemHospitalVerifyQtys]);

  const getCleanItemDeliveryQty = (item: any) => {
    const cleanQty = m2ItemCleanQtys[item.ma] !== undefined ? m2ItemCleanQtys[item.ma] : item.handoverQty;
    const verifyQty = m2ItemHospitalVerifyQtys[item.ma] ?? (item.hospitalReceivedQty ?? item.cleanReturnedQty);
    return Math.max(item.handoverQty, cleanQty, verifyQty);
  };

  const effectiveCleanPageSize = useMemo(() => {
    if (m2CleanPageSize === 'all') return filteredCleanItems.length || 1;
    return m2CleanPageSize;
  }, [m2CleanPageSize, filteredCleanItems.length]);

  const totalCleanPages = useMemo(() => {
    if (m2CleanPageSize === 'all') return 1;
    return Math.max(1, Math.ceil(filteredCleanItems.length / effectiveCleanPageSize));
  }, [filteredCleanItems.length, effectiveCleanPageSize, m2CleanPageSize]);

  const paginatedCleanItems = useMemo(() => {
    if (m2CleanPageSize === 'all') return filteredCleanItems;
    const start = (m2CleanPage - 1) * effectiveCleanPageSize;
    return filteredCleanItems.slice(start, start + effectiveCleanPageSize);
  }, [filteredCleanItems, m2CleanPage, effectiveCleanPageSize, m2CleanPageSize]);

  const cleanStartIndex = (m2CleanPage - 1) * (m2CleanPageSize === 'all' ? filteredCleanItems.length : m2CleanPageSize);
  const cleanEndIndex = Math.min(
    cleanStartIndex + (m2CleanPageSize === 'all' ? filteredCleanItems.length : m2CleanPageSize),
    filteredCleanItems.length
  );

  // Section 2 - Step 1: Laundry company creates clean return bill, submits for hospital staff verification
  const handleCompanySubmitM2Return = (dispatchId: string) => {
    const dispatch = laundryDispatches.find(d => d.id === dispatchId);
    if (!dispatch) return;

    let totalDebt = 0;
    const updatedItems = dispatch.items.map(item => {
      const cleanQty = m2ItemCleanQtys[item.ma] !== undefined ? m2ItemCleanQtys[item.ma] : item.handoverQty;
      const debt = Math.max(0, item.handoverQty - cleanQty);
      totalDebt += debt;
      return {
        ...item,
        cleanReturnedQty: cleanQty,
        hospitalReceivedQty: cleanQty, // default
        isCleanChecked: false
      };
    });

    const nextDispatches = laundryDispatches.map(d => {
      if (d.id === dispatchId) {
        return {
          ...d,
          items: updatedItems,
          status: 'returning_clean' as const,
          cleanReturnedAt: new Date().toLocaleString('vi-VN'),
          cleanReturnedBy: currentAccount?.name || 'Đại diện Cty giặt giũ'
        };
      }
      return d;
    });

    onUpdateDeliveryStates({
      laundryDispatches: nextDispatches
    });

    const initHospVerify: Record<string, number> = {};
    updatedItems.forEach(it => {
      initHospVerify[it.ma] = it.cleanReturnedQty;
    });
    setM2ItemHospitalVerifyQtys(initHospVerify);

    showToast(`Cty đã lập bill trả sạch (Báo trả: ${updatedItems.reduce((s, i) => s + i.cleanReturnedQty, 0)} cái${totalDebt > 0 ? `, Nợ: ${totalDebt} cái` : ''})! Vui lòng chờ Nhân viên đồ vải Bệnh Viện kiểm đếm & xác nhận đủ bill.`, 'info');
  };

  // Section 2 - Step 2: Hospital linen staff verifies clean return and completes bill (auto debt split & stock update)
  const handleHospitalVerifyM2Return = (dispatchId: string) => {
    if (!canVerifyCleanReturn) {
      showToast('⚠️ Chỉ Trưởng kho đồ vải hoặc Nhân viên đồ vải mới có quyền xác nhận bill này!', 'error');
      return;
    }
    const dispatch = laundryDispatches.find(d => d.id === dispatchId);
    if (!dispatch) return;

    const debtItems: Array<any> = [];
    const updatedItems = dispatch.items.map(item => {
      const cleanQty = m2ItemHospitalVerifyQtys[item.ma] !== undefined ? m2ItemHospitalVerifyQtys[item.ma] : (item.hospitalReceivedQty ?? item.cleanReturnedQty);
      const debt = Math.max(0, item.handoverQty - cleanQty);
      if (debt > 0) {
        debtItems.push({
          ma: item.ma,
          ten: item.ten,
          group: item.group,
          isCustom: item.isCustom,
          wardQty: debt,
          handoverQty: debt,
          isHandoverChecked: true,
          handoverNote: `Nợ chưa trả của Bill ${dispatch.id}`,
          laundryReceivedQty: debt,
          isLaundryChecked: true,
          cleanReturnedQty: debt,
          hospitalReceivedQty: debt,
          isCleanChecked: false,
          cleanNote: ''
        });
      }
      return {
        ...item,
        cleanReturnedQty: cleanQty,
        hospitalReceivedQty: cleanQty,
        isCleanChecked: true
      };
    });

    const nextDispatches = laundryDispatches.map(d => {
      if (d.id === dispatchId) {
        return {
          ...d,
          items: updatedItems,
          status: 'completed' as const,
          hospitalVerifiedAt: new Date().toLocaleString('vi-VN'),
          hospitalVerifiedBy: currentAccount?.name || 'NV Đồ Vải BV'
        };
      }
      return d;
    });

    let hasDebt = debtItems.length > 0;
    if (hasDebt) {
      const rootDispatchId = dispatch.originalDispatchId || dispatch.id;
      const rootCreatedAt = dispatch.originalCreatedAt || dispatch.createdAt;
      const debtDispatchId = `BILL-NỢ-CTY-${Date.now().toString().slice(-5)}`;
      const debtDispatch: LaundryDispatch = {
        id: debtDispatchId,
        createdAt: new Date().toLocaleString('vi-VN'),
        originalDispatchId: rootDispatchId,
        originalCreatedAt: rootCreatedAt,
        contractor: dispatch.contractor,
        driver: dispatch.driver,
        plate: dispatch.plate,
        status: 'washing' as const,
        linkedSlipIds: dispatch.linkedSlipIds,
        items: debtItems,
        lossNote: `Nợ phát sinh từ hóa đơn gốc ${rootDispatchId} (Ngày dơ gốc: ${rootCreatedAt})`
      };
      nextDispatches.unshift(debtDispatch);
    }

    // Add clean returned to temporaryCleanStore and subtract from company's temporary dirty store
    const nextCleanStore = { ...temporaryCleanStore };
    const nextCompanyDirtyStore = { ...temporaryCompanyDirtyStore };
    updatedItems.forEach(item => {
      const cleanQty = item.hospitalReceivedQty ?? item.cleanReturnedQty;
      nextCleanStore[item.ma] = (nextCleanStore[item.ma] || 0) + cleanQty;
      nextCompanyDirtyStore[item.ma] = Math.max(0, (nextCompanyDirtyStore[item.ma] || 0) - cleanQty);
    });

    // Update individual slips
    const updatedSlips = wardDeliverySlips.map(slip => {
      if (slip.laundryDispatchId === dispatchId || dispatch.linkedSlipIds.includes(slip.id)) {
        return {
          ...slip,
          status: 'laundry_returned' as const,
          laundryReturnedBy: 'Nhà máy giặt',
          laundryReturnedAt: new Date().toLocaleString('vi-VN')
        };
      }
      return slip;
    });

    onUpdateDeliveryStates({
      wardSlips: updatedSlips,
      laundryDispatches: nextDispatches,
      temporaryCleanStore: nextCleanStore,
      temporaryCompanyDirtyStore: nextCompanyDirtyStore
    });

    setActiveDispatchId(null);
    showToast(`✓ NV Bệnh viện đã xác nhận đủ bill trả sạch! ${hasDebt ? `Phát hiện nợ ${debtItems.length} mặt hàng, đã tự động tách 1 Bill Nợ: ${nextDispatches[0].id}!` : 'Bill trả đủ 100% không nợ.'} Đồ sạch đã nhập vào Kho Sạch Tạm.`, 'success');
  };

  return (
    <div className="space-y-6">
      {effectiveIsWardUser ? (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 p-8 rounded-xl text-center shadow-sm max-w-xl mx-auto my-8">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <p className="font-bold text-lg mb-1">Không thuộc phạm vi quyền hạn điều dưỡng / hộ lý</p>
          <p className="text-sm text-stone-600 mb-4">
            Giao nhận sạch Cty là quy trình làm việc nội bộ giữa Kho Trung Tâm Bệnh viện và Xưởng giặt Công ty bên ngoài. Tài khoản điều dưỡng, hộ lý khoa phòng chỉ truy cập được <strong>Giao nhận đồ dơ</strong> và <strong>Giao nhận sạch khoa phòng</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Slips Selection & Master Bills */}
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Kho dơ tại Cty (Đang xử lý tại xưởng) */}
              <div className="border border-blue-300 bg-blue-50/45 rounded-xl p-4 shadow-sm">
                <span className="text-xs font-black uppercase text-blue-800 tracking-wider flex items-center gap-1.5 font-bold mb-2">
                  <Factory className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Kho đồ dơ tại Cty (Xưởng giặt)</span>
                </span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {Object.keys(temporaryCompanyDirtyStore).filter(ma => (temporaryCompanyDirtyStore[ma] || 0) > 0).length > 0 ? (
                    Object.keys(temporaryCompanyDirtyStore).map(ma => {
                      const item = items.find(i => i.ma === ma);
                      if (!temporaryCompanyDirtyStore[ma]) return null;
                      return (
                        <div key={ma} className="bg-white border border-blue-200 px-2.5 py-1.5 rounded-lg font-medium flex justify-between items-center text-xs shadow-xs">
                          <span className="truncate text-stone-700 font-bold text-[11px]">{item?.ten || ma}</span>
                          <span className="font-mono font-black text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded text-[10px] shrink-0 ml-1">
                            {temporaryCompanyDirtyStore[ma]} cái
                          </span>
                        </div>
                      );
                    })
                  ) : null}
                </div>
              </div>

              {/* Kho đồ sạch tại Bệnh viện (Hiện có) */}
              <div className="border border-emerald-300 bg-emerald-50/45 rounded-xl p-4 shadow-sm">
                <span className="text-xs font-black uppercase text-emerald-800 tracking-wider block mb-2 flex items-center gap-1.5 font-bold">
                  <Sparkles size={14} className="text-emerald-600" />
                  Kho đồ sạch tại Bệnh viện
                </span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {Object.keys(temporaryCleanStore).filter(ma => (temporaryCleanStore[ma] || 0) > 0).length > 0 ? (
                    Object.keys(temporaryCleanStore).map(ma => {
                      const item = items.find(i => i.ma === ma);
                      if (!temporaryCleanStore[ma]) return null;
                      return (
                        <div key={ma} className="bg-white border border-emerald-200 px-2.5 py-1.5 rounded-lg font-medium flex justify-between items-center text-xs shadow-xs">
                          <span className="truncate text-stone-700 font-bold text-[11px]">{item?.ten || ma}</span>
                          <span className="font-mono font-black text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded text-[10px] shrink-0 ml-1">
                            {temporaryCleanStore[ma]} cái
                          </span>
                        </div>
                      );
                    })
                  ) : null}
                </div>
              </div>
            </div>

            {/* Master Bills List */}
            <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase text-stone-800 tracking-wider block">
                  Danh mục kiểm nhận đồ vải sạch
                </span>
                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setM2StatusTab('all')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${m2StatusTab === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setM2StatusTab('active')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${m2StatusTab === 'active' ? 'bg-white text-indigo-800 shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Cần nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => setM2StatusTab('completed')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${m2StatusTab === 'completed' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Đã xong
                  </button>
                </div>
              </div>
              
              {/* Filters for M2 */}
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 flex-1 shadow-2xs">
                  <Search size={14} className="text-stone-400 shrink-0" />
                  <input
                    type="text"
                    value={m2SearchQuery}
                    onChange={e => setM2SearchQuery(e.target.value)}
                    placeholder="Tìm mã hóa đơn, xe, tài xế..."
                    className="w-full bg-transparent text-xs text-stone-800 focus:outline-none"
                  />
                  {m2SearchQuery && (
                    <button onClick={() => setM2SearchQuery('')} className="text-stone-400 hover:text-stone-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {filteredM2Dispatches.map(dispatch => {
                  const isWashing = dispatch.status === 'washing';
                  const isReturningClean = dispatch.status === 'returning_clean';
                  const isDebt = dispatch.id.includes('BILL-NỢ');
                  return (
                      <div
                        key={dispatch.id}
                        onClick={() => {
                          setActiveDispatchId(dispatch.id);
                          // Pre-populate quantity inputs
                          const initQtys: Record<string, number> = {};
                          const initNotes: Record<string, string> = {};
                          dispatch.items.forEach(it => {
                            initQtys[it.ma] = it.handoverQty;
                            initNotes[it.ma] = it.handoverNote || '';
                          });
                          setM2ItemHandoverQtys(initQtys);
                          setM2ItemHandoverNotes(initNotes);

                          const initClean: Record<string, number> = {};
                          const initHospVerify: Record<string, number> = {};
                          dispatch.items.forEach(it => {
                            initClean[it.ma] = it.cleanReturnedQty;
                            initHospVerify[it.ma] = it.hospitalReceivedQty ?? it.cleanReturnedQty ?? it.handoverQty;
                          });
                          setM2ItemCleanQtys(initClean);
                          setM2ItemHospitalVerifyQtys(initHospVerify);
                        }}
                        className={`p-2.5 border rounded-lg cursor-pointer transition-all flex justify-between items-center ${
                          activeDispatchId === dispatch.id ? (isReturningClean ? 'bg-purple-50 border-purple-500' : 'bg-indigo-50 border-indigo-500') : 'hover:bg-stone-50 border-stone-200'
                        }`}
                      >
                        <div className="text-xs">
                          <span className={`font-mono font-bold block ${isDebt ? 'text-rose-700' : 'text-stone-800'}`}>
                            {dispatch.id} {isDebt ? '[NỢ CHƯA TRẢ]' : ''}
                          </span>
                          <span className="text-[9px] text-stone-500 block">Ngày tạo: {dispatch.createdAt}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-md uppercase ${
                          isWashing ? 'bg-indigo-100 text-indigo-700' :
                          isReturningClean ? 'bg-purple-100 text-purple-900 ring-1 ring-purple-400' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isWashing ? 'Đang giặt' : isReturningClean ? 'Chờ BV Duyệt' : 'Đã trả sạch'}
                        </span>
                      </div>
                    );
                  })}
                {filteredM2Dispatches.filter(dispatch => dispatch.status !== 'pending_laundry').length === 0 && (
                  <div className="text-center py-6 text-stone-400 text-xs italic">
                    Trống - Không tìm thấy hóa đơn bốc xếp đồ sạch nào.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Master Bill Workspace */}
          <div className="lg:col-span-7">
            {activeDispatch ? (
              <div ref={detailSectionRef} className="border border-stone-300 bg-white rounded-xl shadow-sm p-5 space-y-4 animate-fade-in scroll-mt-6">
                <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                  <div>
                    <h2 className="text-sm font-bold text-stone-900 uppercase">Chi tiết phiếu {activeDispatch.id}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold border border-amber-300 text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold shadow-2xs"
                      title="Xem trước & In phiếu nhận đồ sạch"
                    >
                      <Printer size={14} className="text-amber-600" /> In phiếu
                    </button>
                    <button onClick={() => setActiveDispatchId(null)} className="text-stone-400 hover:text-stone-900 cursor-pointer p-1"><X size={18} /></button>
                  </div>
                </div>

                {activeDispatch.lossNote && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
                    ⚠️ {activeDispatch.lossNote}
                  </div>
                )}

                {(activeDispatch.isGuestBill || activeDispatch.attachedImage || activeDispatch.guestName || activeDispatch.id.includes('KHACH')) && (
                  <div className="p-4 bg-amber-50/90 border-2 border-amber-400 rounded-xl space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5 font-bold">
                        <Bed className="w-4 h-4 text-amber-800 shrink-0" />
                        <span>BILL RIÊNG ĐỒ VẢI KHÁCH VIP (ĐIỀU HOÀN BẢO QUẢN RIÊNG)</span>
                      </span>
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                        {activeDispatch.dept || 'Khách VIP'}
                      </span>
                    </div>
                    {(activeDispatch.guestName || activeDispatch.guestRoom) && (
                      <div className="text-xs font-bold text-stone-800 bg-white p-2.5 rounded-lg border border-amber-300 flex items-center gap-4">
                        {activeDispatch.guestRoom && <span>🚪 Phòng: <b className="text-amber-900">{activeDispatch.guestRoom}</b></span>}
                        {activeDispatch.guestName && <span>👤 Khách VIP: <b className="text-amber-900">{activeDispatch.guestName}</b></span>}
                      </div>
                    )}
                    {activeDispatch.attachedImage && (
                      <div className="bg-white p-3 rounded-lg border border-amber-300 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                          <Camera className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Ảnh chụp đồ dơ ban đầu (Đính kèm bởi NV Buồng phòng):</span>
                        </div>
                        <div className="flex justify-center bg-stone-100 p-2 rounded border border-stone-200">
                          <img src={activeDispatch.attachedImage} alt="Đồ vải khách VIP" className="max-h-64 object-contain rounded shadow-xs" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Items and verification inputs */}
                <div className="space-y-2">
                  <span className="block text-xs font-black uppercase tracking-wider text-stone-500 font-bold">
                    Danh mục kiểm nhận đồ vải sạch
                  </span>
                  
                  {/* Phân trang chọn từng trang cho danh mục đồ vải */}
                  <ChecklistPagination
                    currentPage={m2CleanPage}
                    totalPages={totalCleanPages}
                    pageSize={m2CleanPageSize}
                    totalItems={activeDispatch.items.length}
                    filteredCount={filteredCleanItems.length}
                    startIndex={cleanStartIndex}
                    endIndex={cleanEndIndex}
                    searchQuery={m2CleanSearch}
                    themeColor="indigo"
                    selectedTrang={m2SelectedTrang}
                    onTrangChange={(trang) => {
                      setM2SelectedTrang(trang);
                      setM2CleanPage(1);
                    }}
                    itemTrangMap={itemTrangMap}
                    itemsList={activeDispatch.items}
                    getItemDeliveryQty={getCleanItemDeliveryQty}
                    onlyShowDelivered={m2CleanOnlyDelivered}
                    onToggleOnlyDelivered={(val) => {
                      setM2CleanOnlyDelivered(val);
                      setM2CleanPage(1);
                    }}
                    onPageChange={(p) => setM2CleanPage(p)}
                    onPageSizeChange={(sz) => {
                      setM2CleanPageSize(sz);
                      setM2CleanPage(1);
                    }}
                    onSearchChange={(q) => {
                      setM2CleanSearch(q);
                      setM2CleanPage(1);
                    }}
                  />

                  <div className="border border-stone-200 rounded-lg overflow-x-auto bg-stone-50">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                          <th className="p-2.5 text-xs">TÊN ĐỒ VẢI</th>
                          <th className="p-2.5 text-right text-xs">KHAI BÁO (KHOA)</th>
                          <th className="p-2.5 text-right text-xs">ĐẠI DIỆN GIAO XE</th>
                          <th className="p-2.5 text-center text-xs bg-blue-50/50 font-bold text-blue-800">CTY BÁO TRẢ SẠCH</th>
                          {(activeDispatch.status === 'returning_clean' || activeDispatch.status === 'completed') && (
                            <th className="p-2.5 text-center text-xs bg-purple-50/50 font-bold text-purple-900">NV BV KIỂM NHẬN</th>
                          )}
                          <th className="p-2.5 text-center text-xs bg-rose-50/50 font-bold text-rose-700">SỐ NỢ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 bg-white font-medium">
                        {paginatedCleanItems.length > 0 ? (
                          paginatedCleanItems.map(item => {
                            const isWashing = activeDispatch.status === 'washing';
                            const isReturningClean = activeDispatch.status === 'returning_clean';
                            
                            const cleanQty = m2ItemCleanQtys[item.ma] !== undefined ? m2ItemCleanQtys[item.ma] : item.handoverQty;
                            const verifyQty = m2ItemHospitalVerifyQtys[item.ma] ?? (item.hospitalReceivedQty ?? item.cleanReturnedQty);
                            const activeDeliveryQty = getCleanItemDeliveryQty(item);
                            const hasDelivery = activeDeliveryQty > 0;

                            return (
                              <tr key={item.ma} className={`transition-colors ${
                                hasDelivery ? 'bg-indigo-50/50 font-semibold border-l-4 border-l-indigo-500' : 'hover:bg-stone-50 text-stone-600'
                              }`}>
                                <td className="p-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-xs ${hasDelivery ? 'font-black text-stone-900' : 'font-medium text-stone-700'}`}>{item.ten}</span>
                                  </div>
                                  <span className="text-[9px] text-stone-400 font-mono block mt-0.5">{item.ma}</span>
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-stone-600">
                                  {item.wardQty} cái
                                </td>
                                <td className="p-2.5 text-right font-mono text-stone-700 font-bold">
                                  {item.handoverQty} cái
                                </td>
                                <td className="p-2.5 text-center bg-blue-50/10 font-bold text-blue-800 font-mono">
                                  {isWashing && hasPerm('laundry') ? (
                                    <input
                                      type="number"
                                      className="w-20 h-8 border border-stone-300 rounded-lg text-center text-xs font-mono font-black text-blue-800 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                      value={cleanQty}
                                      onChange={e => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setM2ItemCleanQtys(prev => ({ ...prev, [item.ma]: val }));
                                      }}
                                    />
                                  ) : (
                                    <span>{item.cleanReturnedQty} cái</span>
                                  )}
                                </td>
                                {(isReturningClean || activeDispatch.status === 'completed') && (
                                  <td className="p-2.5 text-center bg-purple-50/10 font-bold text-purple-900 font-mono">
                                    {isReturningClean && canVerifyCleanReturn ? (
                                      <input
                                        type="number"
                                        className="w-20 h-8 border border-purple-300 rounded-lg text-center text-xs font-mono font-black text-purple-900 bg-white focus:ring-1 focus:ring-purple-500"
                                        value={verifyQty}
                                        onChange={e => {
                                          const val = Math.max(0, parseInt(e.target.value) || 0);
                                          setM2ItemHospitalVerifyQtys(prev => ({ ...prev, [item.ma]: val }));
                                        }}
                                      />
                                    ) : (
                                      <span>{item.hospitalReceivedQty ?? item.cleanReturnedQty} cái</span>
                                    )}
                                  </td>
                                )}
                                <td className="p-2.5 text-center bg-rose-50/10">
                                  {(() => {
                                    const currentClean = isReturningClean 
                                      ? verifyQty
                                      : (isWashing ? cleanQty : (item.hospitalReceivedQty ?? item.cleanReturnedQty));
                                    const rowDebt = Math.max(0, item.handoverQty - currentClean);
                                    return rowDebt > 0 ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                                        ⚠️ Nợ {rowDebt}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-emerald-600">0 (Đủ)</span>
                                    );
                                  })()}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-stone-400 italic">
                              Không tìm thấy đồ vải nào phù hợp với từ khóa "{m2CleanSearch}".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom pagination */}
                  {filteredCleanItems.length > 0 && m2CleanPageSize !== 'all' && totalCleanPages > 1 && (
                    <ChecklistPagination
                      currentPage={m2CleanPage}
                      totalPages={totalCleanPages}
                      pageSize={m2CleanPageSize}
                      totalItems={activeDispatch.items.length}
                      filteredCount={filteredCleanItems.length}
                      startIndex={cleanStartIndex}
                      endIndex={cleanEndIndex}
                      searchQuery=""
                      themeColor="indigo"
                      onPageChange={(p) => setM2CleanPage(p)}
                    />
                  )}
                </div>

                {/* Submit Actions */}
                {activeDispatch.status === 'washing' && hasPerm('laundry') && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-indigo-900 font-bold flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-indigo-700 shrink-0 inline-block mr-1" /> BƯỚC 4.1: CÔNG TY LẬP BILL TRẢ SẠCH KHO BV
                      </p>
                      <span className="text-[9px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded">Xưởng giặt khai báo</span>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleCompanySubmitM2Return(activeDispatch.id)}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        Gửi Bệnh Viện Xác Nhận Bill Trả Sạch
                      </button>
                    </div>
                  </div>
                )}

                {activeDispatch.status === 'returning_clean' && (
                  <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-3.5 space-y-2.5 animate-fade-in shadow-sm">
                    <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                      <span className="text-xs font-black text-purple-900 uppercase flex items-center gap-1.5 font-bold">
                        ⏳ BƯỚC 4.2: NHÂN VIÊN ĐỒ VẢI BV KIỂM NHẬN & XÁC NHẬN SẠCH
                      </span>
                      <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-2.5 py-0.5 rounded-full">
                        Chờ BV Đối Chiếu
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-700 leading-relaxed">
                      Công ty giặt <b>{activeDispatch.cleanReturnedBy || 'Xưởng giặt'}</b> đã lập bill trả sạch lúc <b>{activeDispatch.cleanReturnedAt}</b>. Vui lòng kiểm đếm số lượng thực tế tại cột <b>"NV BV KIỂM NHẬN"</b> bên trên.
                    </p>
                    {(() => {
                      const totalDebt = activeDispatch.items.reduce((sum, item) => {
                        const clean = m2ItemHospitalVerifyQtys[item.ma] ?? (item.hospitalReceivedQty ?? item.cleanReturnedQty);
                        return sum + Math.max(0, item.handoverQty - clean);
                      }, 0);
                      return totalDebt > 0 ? (
                        <div className="bg-rose-100 border border-rose-300 rounded-lg p-2.5 text-rose-900 text-xs font-bold flex items-center justify-between shadow-inner">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                            <span><b>PHÁT HIỆN NỢ:</b> Giao thiếu {totalDebt} cái so với lúc nhận xe.</span>
                          </span>
                          <span className="text-[10px] bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded shadow">
                            Tự động tách 1 Bill Nợ Cty
                          </span>
                        </div>
                      ) : (
                        <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-2.5 text-emerald-900 text-xs font-bold flex items-center gap-1.5 shadow-inner">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span>Hóa đơn trả đủ 100% số lượng giao xưởng, không phát sinh nợ.</span>
                        </div>
                      );
                    })()}
                    {canVerifyCleanReturn ? (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleHospitalVerifyM2Return(activeDispatch.id)}
                          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
                        >
                          Xác Nhận Đủ Sạch & Nhập Kho Sạch
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 italic font-bold flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        <span>Phiếu đã lập trả sạch về bệnh viện. Chờ Trưởng kho hoặc Nhân viên đồ vải kiểm nhận thực tế và xác nhận.</span>
                      </p>
                    )}
                  </div>
                )}

                {activeDispatch.status === 'completed' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        HÓA ĐƠN TRẢ SẠCH ĐÃ HOÀN TẤT ĐỐI CHIẾU
                      </span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Đã nhập kho sạch BV</span>
                    </div>
                    {activeDispatch.cleanReturnedBy && (
                      <p className="text-[11px] text-stone-600 flex items-center gap-1">
                        <Building2 size={13} className="text-stone-500 shrink-0" />
                        <span>Cty lập bill: <b>{activeDispatch.cleanReturnedBy}</b> {activeDispatch.cleanReturnedAt ? `(${activeDispatch.cleanReturnedAt})` : ''}</span>
                      </p>
                    )}
                    {activeDispatch.hospitalVerifiedBy && (
                      <p className="text-[11px] text-emerald-900 font-bold flex items-center gap-1">
                        <UserIcon size={13} className="text-emerald-700 shrink-0" />
                        <span>NV Bệnh viện xác nhận: <b>{activeDispatch.hospitalVerifiedBy}</b> {activeDispatch.hospitalVerifiedAt ? `(${activeDispatch.hospitalVerifiedAt})` : ''}</span>
                      </p>
                    )}
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
        data={activeDispatch ? {
          title: "BIÊN BẢN GIAO NHẬN ĐỒ SẠCH TỪ XƯỞNG GIẶT",
          subTitle: `Xưởng giặt bàn giao đồ vải sạch nhập Kho Sạch Bệnh viện - ${activeDispatch.contractor || 'Cty Giặt'}`,
          billId: activeDispatch.id,
          date: activeDispatch.cleanReturnedAt || activeDispatch.createdAt,
          sender: activeDispatch.cleanReturnedBy || activeDispatch.driver || 'Đại diện Cty Giặt',
          contractor: activeDispatch.contractor,
          driver: activeDispatch.driver,
          plate: activeDispatch.plate,
          receiver: activeDispatch.hospitalVerifiedBy || currentAccount?.name || 'Thủ kho Đồ Vải BV',
          statusText: activeDispatch.status === 'completed' ? 'Đã nhập kho sạch' : 'Chờ xác nhận',
          items: activeDispatch.items.map(it => ({
            ma: it.ma,
            ten: it.ten,
            group: it.group,
            qty: it.handoverQty || 0,
            realQty: m2ItemCleanQtys[it.ma] !== undefined ? m2ItemCleanQtys[it.ma] : (it.cleanReturnedQty ?? it.handoverQty ?? 0),
            note: it.cleanNote || ''
          })),
          notes: activeDispatch.lossNote || undefined
        } : null}
      />
    </div>
  );
}
