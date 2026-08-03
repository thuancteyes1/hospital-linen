import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LinenItem, 
  WardDeliverySlip, 
  LaundryDispatch, 
  Account 
} from '../../../types';
import { 
  Search, 
  X,
  Trash2,
  Printer,
  Bed,
  Camera,
  ClipboardCheck,
  Truck,
  Plus,
  Zap,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { generateDailySlipId } from '../../../data';
import { checkPermission } from '../utils/checkPermission';
import ChecklistPagination from '../utils/ChecklistPagination';
import PrintBillModal, { PrintBillData } from '../utils/PrintBillModal';

interface M1CompanyTabProps {
  items: LinenItem[];
  currentAccount: Account | null;
  wardDeliverySlips: WardDeliverySlip[];
  laundryDispatches: LaundryDispatch[];
  temporaryDirtyStore: Record<string, number>;
  temporaryCompanyDirtyStore: Record<string, number>;
  simulatedRole: 'ward' | 'orderly' | 'housekeeping' | 'linen' | 'laundry' | 'clean' | 'all' | 'admin';
  isOrderlyUser: boolean;
  isHousekeepingUser: boolean;
  effectiveIsWardUser: boolean;
  effectiveIsLaundryUser: boolean;
  hasLinenPerm: boolean;
  currentRoleName: string;
  onUpdateDeliveryStates: (params: {
    wardSlips?: WardDeliverySlip[];
    laundryDispatches?: LaundryDispatch[];
    temporaryCleanStore?: Record<string, number>;
    temporaryDirtyStore?: Record<string, number>;
    temporaryCompanyDirtyStore?: Record<string, number>;
    clearHistory?: boolean;
  }) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  activeDispatchId: string | null;
  setActiveDispatchId: (id: string | null) => void;
}

export default function M1CompanyTab({
  items,
  currentAccount,
  wardDeliverySlips,
  laundryDispatches,
  temporaryDirtyStore,
  temporaryCompanyDirtyStore,
  simulatedRole,
  isOrderlyUser,
  isHousekeepingUser,
  effectiveIsWardUser,
  effectiveIsLaundryUser,
  hasLinenPerm,
  currentRoleName,
  onUpdateDeliveryStates,
  showToast,
  activeDispatchId,
  setActiveDispatchId
}: M1CompanyTabProps) {
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

  const [m2SearchQuery, setM2SearchQuery] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Checklist verification states
  const [m2StoreCheckedItems, setM2StoreCheckedItems] = useState<Record<string, boolean>>({});
  const [m2HandoverCheckedItems, setM2HandoverCheckedItems] = useState<Record<string, boolean>>({});
  const [m2ItemHandoverQtys, setM2ItemHandoverQtys] = useState<Record<string, number>>({});
  const [m2ItemHandoverNotes, setM2ItemHandoverNotes] = useState<Record<string, string>>({});

  const [m2StatusTab, setM2StatusTab] = useState<'all' | 'pending' | 'handed_over'>('all');

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

    if (m2StatusTab === 'pending') {
      result = result.filter(d => d.status === 'pending_laundry');
    } else if (m2StatusTab === 'handed_over') {
      result = result.filter(d => d.status !== 'pending_laundry');
    }

    return result;
  }, [laundryDispatches, m2SearchQuery, m2StatusTab]);

  const activeDispatch = useMemo(() => {
    return laundryDispatches.find(d => d.id === activeDispatchId) || null;
  }, [laundryDispatches, activeDispatchId]);

  // Checklist pagination states
  const [m2ChecklistPage, setM2ChecklistPage] = useState(1);
  const [m2ChecklistPageSize, setM2ChecklistPageSize] = useState<number | 'all'>('all');
  const [m2ChecklistSearch, setM2ChecklistSearch] = useState('');
  const [m2OnlyShowDelivered, setM2OnlyShowDelivered] = useState(false);
  const [m2SelectedTrang, setM2SelectedTrang] = useState<string>('all');

  // Map item code to its designated Trang Bill
  const itemTrangMap = useMemo(() => {
    const map: Record<string, string> = {};
    (items || []).forEach(it => {
      map[it.ma] = it.trang || 'Trang 1';
    });
    return map;
  }, [items]);

  // Reset page & search when active dispatch changes
  const detailSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setM2ChecklistPage(1);
    setM2ChecklistSearch('');
    setM2OnlyShowDelivered(false);
    if (activeDispatchId && detailSectionRef.current) {
      detailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeDispatchId]);

  const filteredActiveDispatchItems = useMemo(() => {
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

    if (m2ChecklistSearch.trim()) {
      const q = m2ChecklistSearch.toLowerCase();
      list = list.filter(
        it => it.ten.toLowerCase().includes(q) || it.ma.toLowerCase().includes(q)
      );
    }

    if (m2OnlyShowDelivered) {
      list = list.filter(it => {
        const storeQty = temporaryDirtyStore[it.ma] || 0;
        const billQty = m2ItemHandoverQtys[it.ma] ?? it.handoverQty;
        return storeQty > 0 || billQty > 0;
      });
    }

    return list;
  }, [activeDispatch, m2SelectedTrang, itemTrangMap, m2ChecklistSearch, m2OnlyShowDelivered, temporaryDirtyStore, m2ItemHandoverQtys]);

  const getM2ItemDeliveryQty = (item: any) => {
    const storeQty = temporaryDirtyStore[item.ma] || 0;
    const billQty = m2ItemHandoverQtys[item.ma] ?? item.handoverQty;
    return Math.max(storeQty, billQty);
  };

  const effectiveM2PageSize = useMemo(() => {
    if (m2ChecklistPageSize === 'all') return filteredActiveDispatchItems.length || 1;
    return m2ChecklistPageSize;
  }, [m2ChecklistPageSize, filteredActiveDispatchItems.length]);

  const totalM2Pages = useMemo(() => {
    if (m2ChecklistPageSize === 'all') return 1;
    return Math.max(1, Math.ceil(filteredActiveDispatchItems.length / effectiveM2PageSize));
  }, [filteredActiveDispatchItems.length, effectiveM2PageSize, m2ChecklistPageSize]);

  const paginatedM2Items = useMemo(() => {
    if (m2ChecklistPageSize === 'all') return filteredActiveDispatchItems;
    const start = (m2ChecklistPage - 1) * effectiveM2PageSize;
    return filteredActiveDispatchItems.slice(start, start + effectiveM2PageSize);
  }, [filteredActiveDispatchItems, m2ChecklistPage, effectiveM2PageSize, m2ChecklistPageSize]);

  const m2StartIndex = (m2ChecklistPage - 1) * (m2ChecklistPageSize === 'all' ? filteredActiveDispatchItems.length : m2ChecklistPageSize);
  const m2EndIndex = Math.min(
    m2StartIndex + (m2ChecklistPageSize === 'all' ? filteredActiveDispatchItems.length : m2ChecklistPageSize),
    filteredActiveDispatchItems.length
  );

  const checkedM2Count = useMemo(() => {
    if (!activeDispatch) return 0;
    return activeDispatch.items.filter(it => !!m2StoreCheckedItems[it.ma]).length;
  }, [activeDispatch, m2StoreCheckedItems]);

  const handleConsolidateAllTodaySlips = () => {
    const todaySlips = wardDeliverySlips.filter(s => s.status === 'verified_dirty');
    if (todaySlips.length === 0) {
      showToast('Không có phiếu khoa phòng nào đã duyệt dơ đang chờ bàn giao xe tải!', 'error');
      return;
    }

    // Check if there is already an existing pending Bill-Tong (status === 'pending_laundry')
    const existingPendingDispatch = laundryDispatches.find(
      d => d.status === 'pending_laundry' && !d.id.includes('BILL-NỢ')
    );

    if (existingPendingDispatch) {
      // MERGE / UPDATE new slips into existing pending Bill-Tong
      const itemMap: Record<string, { ma: string; ten: string; group: string; isCustom?: boolean; wardQty: number; handoverQty: number }> = {};
      
      // 1. Populate items from existing pending dispatch
      existingPendingDispatch.items.forEach(item => {
        itemMap[item.ma] = {
          ma: item.ma,
          ten: item.ten,
          group: item.group || 'Khác',
          isCustom: item.isCustom,
          wardQty: item.wardQty || 0,
          handoverQty: item.handoverQty || 0
        };
      });

      // 2. Add quantities from newly verified ward slips
      todaySlips.forEach(slip => {
        slip.items.forEach(item => {
          if (!itemMap[item.ma]) {
            itemMap[item.ma] = {
              ma: item.ma,
              ten: item.ten,
              group: item.group || 'Khác',
              isCustom: item.isCustom,
              wardQty: 0,
              handoverQty: 0
            };
          }
          itemMap[item.ma].wardQty += item.qty;
          itemMap[item.ma].handoverQty += item.verifiedDirtyQty ?? item.qty;
        });
      });

      const consolidatedItems = Object.values(itemMap);
      const newLinkedSlipIds = Array.from(new Set([...(existingPendingDispatch.linkedSlipIds || []), ...todaySlips.map(s => s.id)]));

      const updatedDispatch: LaundryDispatch = {
        ...existingPendingDispatch,
        linkedSlipIds: newLinkedSlipIds,
        items: consolidatedItems.map(item => {
          const prevItem = existingPendingDispatch.items.find(i => i.ma === item.ma);
          return {
            ma: item.ma,
            ten: item.ten,
            group: item.group,
            isCustom: item.isCustom,
            wardQty: item.wardQty,
            handoverQty: item.handoverQty,
            isHandoverChecked: prevItem ? prevItem.isHandoverChecked : true,
            handoverNote: prevItem ? prevItem.handoverNote : '',
            laundryReceivedQty: item.handoverQty,
            isLaundryChecked: prevItem ? prevItem.isLaundryChecked : true,
            cleanReturnedQty: item.handoverQty,
            isCleanChecked: false,
            cleanNote: ''
          };
        })
      };

      const updatedDispatches = laundryDispatches.map(d => d.id === existingPendingDispatch.id ? updatedDispatch : d);

      const updatedSlips = wardDeliverySlips.map(slip => {
        if (todaySlips.some(s => s.id === slip.id)) {
          return {
            ...slip,
            status: 'laundry_received' as const,
            laundryDispatchId: existingPendingDispatch.id,
            laundryReceivedBy: currentAccount?.name || 'Nhân viên đồ vải',
            laundryReceivedAt: new Date().toLocaleString('vi-VN')
          };
        }
        return slip;
      });

      onUpdateDeliveryStates({
        laundryDispatches: updatedDispatches,
        wardSlips: updatedSlips
      });
      setActiveDispatchId(existingPendingDispatch.id);

      // Re-initialize quantity editors
      const initQtys: Record<string, number> = {};
      const initNotes: Record<string, string> = {};
      updatedDispatch.items.forEach(it => {
        initQtys[it.ma] = it.handoverQty;
        initNotes[it.ma] = it.handoverNote || '';
      });
      setM2ItemHandoverQtys(initQtys);
      setM2ItemHandoverNotes(initNotes);

      showToast(`✓ Đã cộng dồn ${todaySlips.length} phiếu mới phát sinh vào Bill Tổng ${existingPendingDispatch.id}!`, 'success');
      return;
    }

    // Otherwise create a NEW Bill-Tong
    const itemMap: Record<string, { ma: string; ten: string; group: string; isCustom?: boolean; wardQty: number; handoverQty: number }> = {};
    todaySlips.forEach(slip => {
      slip.items.forEach(item => {
        if (!itemMap[item.ma]) {
          itemMap[item.ma] = {
            ma: item.ma,
            ten: item.ten,
            group: item.group || 'Khác',
            isCustom: item.isCustom,
            wardQty: 0,
            handoverQty: 0
          };
        }
        itemMap[item.ma].wardQty += item.qty;
        itemMap[item.ma].handoverQty += item.verifiedDirtyQty ?? item.qty;
      });
    });

    const consolidatedItems = Object.values(itemMap);
    const masterBillId = generateDailySlipId('Bill-Tong-', laundryDispatches.map(d => d.id));

    const newDispatch: LaundryDispatch = {
      id: masterBillId,
      createdAt: new Date().toLocaleString('vi-VN'),
      contractor: 'Công ty Giặt ủi Thành Đô',
      driver: 'Nguyễn Văn Hùng',
      plate: '29C-123.45',
      status: 'pending_laundry',
      linkedSlipIds: todaySlips.map(s => s.id),
      items: consolidatedItems.map(item => ({
        ma: item.ma,
        ten: item.ten,
        group: item.group,
        isCustom: item.isCustom,
        wardQty: item.wardQty,
        handoverQty: item.handoverQty,
        isHandoverChecked: true,
        handoverNote: '',
        laundryReceivedQty: item.handoverQty,
        isLaundryChecked: true,
        cleanReturnedQty: item.handoverQty,
        isCleanChecked: false,
        cleanNote: ''
      }))
    };

    const updatedSlips = wardDeliverySlips.map(slip => {
      if (todaySlips.some(s => s.id === slip.id)) {
        return {
          ...slip,
          status: 'laundry_received' as const,
          laundryDispatchId: masterBillId,
          laundryReceivedBy: currentAccount?.name || 'Nhân viên đồ vải',
          laundryReceivedAt: new Date().toLocaleString('vi-VN')
        };
      }
      return slip;
    });

    onUpdateDeliveryStates({
      laundryDispatches: [newDispatch, ...laundryDispatches],
      wardSlips: updatedSlips
    });
    setActiveDispatchId(masterBillId);

    // Initialize quantity editors
    const initQtys: Record<string, number> = {};
    const initNotes: Record<string, string> = {};
    newDispatch.items.forEach(it => {
      initQtys[it.ma] = it.handoverQty;
      initNotes[it.ma] = '';
    });
    setM2ItemHandoverQtys(initQtys);
    setM2ItemHandoverNotes(initNotes);

    showToast(`✓ Đã tự động cộng dồn và gom toàn bộ ${todaySlips.length} phiếu khoa phòng thành Bill Tổng ${masterBillId}!`, 'success');
  };

  const handleCancelPendingDispatch = (dispatchId: string) => {
    const dispatch = laundryDispatches.find(d => d.id === dispatchId);
    if (!dispatch) return;

    if (dispatch.status !== 'pending_laundry') {
      showToast('Chỉ có thể hủy Bill Tổng khi chưa bàn giao cho xe tải!', 'error');
      return;
    }

    // Revert all linked ward slips back to verified_dirty
    const updatedSlips = wardDeliverySlips.map(slip => {
      if (slip.laundryDispatchId === dispatchId || (dispatch.linkedSlipIds && dispatch.linkedSlipIds.includes(slip.id))) {
        return {
          ...slip,
          status: 'verified_dirty' as const,
          laundryDispatchId: undefined,
          laundryReceivedBy: undefined,
          laundryReceivedAt: undefined
        };
      }
      return slip;
    });

    // Remove dispatch from laundryDispatches
    const updatedDispatches = laundryDispatches.filter(d => d.id !== dispatchId);

    onUpdateDeliveryStates({
      laundryDispatches: updatedDispatches,
      wardSlips: updatedSlips
    });

    if (activeDispatchId === dispatchId) {
      setActiveDispatchId(null);
    }

    showToast(`✓ Đã hủy Bill Tổng ${dispatchId} và khôi phục các phiếu khoa phòng về danh sách dơ chờ bàn giao!`, 'success');
  };

  const handleCreateDispatchFromHospitalDirtyStore = () => {
    const dirtyItemsInStore = Object.keys(temporaryDirtyStore)
      .filter(ma => (temporaryDirtyStore[ma] || 0) > 0)
      .map(ma => {
        const itemObj = items.find(i => i.ma === ma);
        return {
          ma,
          ten: itemObj?.ten || ma,
          group: itemObj?.nhom || 'Khác',
          qty: temporaryDirtyStore[ma]
        };
      });

    if (dirtyItemsInStore.length === 0) {
      showToast('Kho đồ dơ của bệnh viện hiện đang trống!', 'error');
      return;
    }

    const masterBillId = generateDailySlipId('Bill-Tong-', laundryDispatches.map(d => d.id));
    const slipsToLink = wardDeliverySlips.filter(s => s.status === 'verified_dirty');

    const newDispatch: LaundryDispatch = {
      id: masterBillId,
      createdAt: new Date().toLocaleString('vi-VN'),
      contractor: 'Công ty Giặt ủi Thành Đô',
      driver: 'Nguyễn Văn Hùng',
      plate: '29C-123.45',
      status: 'pending_laundry',
      linkedSlipIds: slipsToLink.map(s => s.id),
      items: dirtyItemsInStore.map(item => ({
        ma: item.ma,
        ten: item.ten,
        group: item.group,
        isCustom: false,
        wardQty: item.qty,
        handoverQty: item.qty,
        isHandoverChecked: false,
        handoverNote: '',
        laundryReceivedQty: item.qty,
        isLaundryChecked: false,
        cleanReturnedQty: item.qty,
        isCleanChecked: false,
        cleanNote: ''
      }))
    };

    const updatedSlips = wardDeliverySlips.map(slip => {
      if (slipsToLink.some(s => s.id === slip.id)) {
        return {
          ...slip,
          status: 'laundry_received' as const,
          laundryDispatchId: masterBillId,
          laundryReceivedBy: currentAccount?.name || 'Nhân viên đồ vải',
          laundryReceivedAt: new Date().toLocaleString('vi-VN')
        };
      }
      return slip;
    });

    onUpdateDeliveryStates({
      laundryDispatches: [newDispatch, ...laundryDispatches],
      wardSlips: updatedSlips
    });
    setActiveDispatchId(masterBillId);

    // Initialize quantity editors
    const initQtys: Record<string, number> = {};
    const initNotes: Record<string, string> = {};
    newDispatch.items.forEach(it => {
      initQtys[it.ma] = it.handoverQty;
      initNotes[it.ma] = '';
    });
    setM2ItemHandoverQtys(initQtys);
    setM2ItemHandoverNotes(initNotes);

    showToast(`✓ Đã tạo phiếu bàn giao ${masterBillId} hiển thị sẵn ${dirtyItemsInStore.length} mặt hàng từ Kho dơ BV!`, 'success');
  };

  const handleVerifyM2Handover = (dispatchId: string) => {
    const dispatch = laundryDispatches.find(d => d.id === dispatchId);
    if (!dispatch) return;

    // Check if ALL items have been ticked/checked
    const uncheckedItem = dispatch.items.find(it => !m2StoreCheckedItems[it.ma] && !m2HandoverCheckedItems[it.ma]);
    if (uncheckedItem) {
      showToast(`Vui lòng kiểm đếm và tích xác nhận cho mặt hàng: "${uncheckedItem.ten}"`, 'error');
      return;
    }

    const updatedItems = dispatch.items.map(item => {
      const editedQty = m2ItemHandoverQtys[item.ma] !== undefined ? m2ItemHandoverQtys[item.ma] : item.handoverQty;
      const editedNote = m2ItemHandoverNotes[item.ma] !== undefined ? m2ItemHandoverNotes[item.ma] : (item.handoverNote || '');
      return {
        ...item,
        handoverQty: editedQty,
        handoverNote: editedNote,
        isHandoverChecked: true,
        laundryReceivedQty: editedQty,
        cleanReturnedQty: editedQty
      };
    });

    const updatedDispatches = laundryDispatches.map(d => {
      if (d.id === dispatchId) {
        return {
          ...d,
          items: updatedItems,
          status: 'washing' as const
        };
      }
      return d;
    });

    // Subtract from temporaryDirtyStore and add to temporaryCompanyDirtyStore
    const nextDirtyStore = { ...temporaryDirtyStore };
    const nextCompanyDirtyStore = { ...temporaryCompanyDirtyStore };
    updatedItems.forEach(item => {
      nextDirtyStore[item.ma] = Math.max(0, (nextDirtyStore[item.ma] || 0) - item.handoverQty);
      nextCompanyDirtyStore[item.ma] = (nextCompanyDirtyStore[item.ma] || 0) + item.handoverQty;
    });

    onUpdateDeliveryStates({
      laundryDispatches: updatedDispatches,
      temporaryDirtyStore: nextDirtyStore,
      temporaryCompanyDirtyStore: nextCompanyDirtyStore
    });

    showToast(`✓ Đã xác nhận bàn giao cho xưởng xe tải, trừ Kho dơ BV & cộng vào Kho dơ Cty.`, 'success');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in w-full">
      {/* Slips Selection & Master Bills */}
      <div className="lg:col-span-5 space-y-4">
        {/* Click to Select and Consolidate Bills section */}
        <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-4">
          <span className="text-xs font-black uppercase text-stone-800 tracking-wider block mb-2 font-bold">
            🔗 GOM PHIẾU & BÀN GIAO VỚI CÔNG TY
          </span>

          <div className="space-y-2 max-h-[160px] overflow-y-auto border-b border-stone-200 pb-3 mb-3">
            {wardDeliverySlips.filter(s => s.status === 'verified_dirty').map(slip => (
              <div key={slip.id} className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200">
                <div className="text-[11px]">
                  <span className="font-bold text-stone-800 font-mono block">{slip.id} ({slip.dept})</span>
                  <span className="text-[9px] text-stone-400">Có {slip.items.reduce((sum, i) => sum + (i.verifiedDirtyQty ?? i.qty), 0)} cái dơ</span>
                </div>
              </div>
            ))}
            {wardDeliverySlips.filter(s => s.status === 'verified_dirty').length === 0 && (
              <span className="text-stone-400 text-xs block text-center py-4 italic">Không còn phiếu nào chờ gom. Đồ dơ đã bốc xếp lên xe hết!</span>
            )}
          </div>

          {!effectiveIsLaundryUser ? (
            <div className="space-y-2">
              {(() => {
                const pendingCount = wardDeliverySlips.filter(s => s.status === 'verified_dirty').length;
                const existingPendingDispatch = laundryDispatches.find(
                  d => d.status === 'pending_laundry' && !d.id.includes('BILL-NỢ')
                );
                return (
                  <button
                    onClick={handleConsolidateAllTodaySlips}
                    disabled={pendingCount === 0}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[11px] font-black uppercase tracking-wider rounded-lg shadow-md disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold"
                    title={existingPendingDispatch ? `Cộng thêm ${pendingCount} phiếu phát sinh vào Bill ${existingPendingDispatch.id}` : "Tự động cộng dồn tất cả phiếu khoa phòng đã duyệt trong ngày"}
                  >
                    {existingPendingDispatch ? (
                      <>
                        <Plus size={14} />
                        <span>CỘNG BỔ SUNG VÀO BILL TỔNG ({pendingCount} phiếu phát sinh)</span>
                      </>
                    ) : (
                      <>
                        <Zap size={14} className="text-amber-200" />
                        <span>CỘNG TẤT CẢ BILL TRONG NGÀY ({pendingCount} phiếu)</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </div>
          ) : (
            <div className="p-2.5 bg-stone-100 border border-stone-200 rounded-lg text-center text-[10px] text-stone-500 font-medium font-bold flex items-center justify-center gap-1">
              <Lock size={12} className="text-stone-400 shrink-0" />
              <span>Chức năng cộng dồn phiếu nội bộ BV dành cho NV Đồ vải BV.</span>
            </div>
          )}
        </div>

        {/* Master Bills List */}
        <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase text-stone-800 tracking-wider block">
              Danh sách phiếu bàn giao xưởng
            </span>
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setM2StatusTab('all')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${m2StatusTab === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
              >
                Tất cả ({laundryDispatches.length})
              </button>
              <button
                type="button"
                onClick={() => setM2StatusTab('pending')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${m2StatusTab === 'pending' ? 'bg-white text-amber-800 shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
              >
                Chờ bàn giao ({laundryDispatches.filter(d => d.status === 'pending_laundry').length})
              </button>
              <button
                type="button"
                onClick={() => setM2StatusTab('handed_over')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${m2StatusTab === 'handed_over' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-stone-500 hover:text-stone-800'}`}
              >
                Đã bàn giao ({laundryDispatches.filter(d => d.status !== 'pending_laundry').length})
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 flex-1 shadow-2xs">
              <Search size={14} className="text-stone-400 shrink-0" />
              <input
                type="text"
                value={m2SearchQuery}
                onChange={e => setM2SearchQuery(e.target.value)}
                placeholder="Tìm mã hóa đơn, biển số xe, tài xế..."
                className="w-full bg-transparent text-xs text-stone-800 focus:outline-none"
              />
              {m2SearchQuery && (
                <button onClick={() => setM2SearchQuery('')} className="text-stone-400 hover:text-stone-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {filteredM2Dispatches.map(dispatch => {
              const isPending = dispatch.status === 'pending_laundry';
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

                    const initStoreChecked: Record<string, boolean> = {};
                    dispatch.items.forEach(it => {
                      initStoreChecked[it.ma] = false;
                    });
                    setM2StoreCheckedItems(initStoreChecked);
                    setM2HandoverCheckedItems(initStoreChecked);
                  }}
                  className={`p-2.5 border rounded-lg cursor-pointer transition-all flex justify-between items-center ${
                    activeDispatchId === dispatch.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'hover:bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="text-xs">
                    <span className={`font-mono font-bold block ${isDebt ? 'text-rose-700' : 'text-stone-800'}`}>
                      {dispatch.id} {isDebt ? '[NỢ CHƯA TRẢ]' : ''}
                    </span>
                    <span className="text-[9px] text-stone-500 block">Ngày: {dispatch.createdAt} • Xe: {dispatch.plate || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-md uppercase ${
                      isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isPending ? 'Chờ bàn giao xe' : 'Đã bàn giao xe'}
                    </span>
                    {isPending && hasPerm('linen') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelPendingDispatch(dispatch.id);
                        }}
                        className="p-1 hover:bg-rose-100 text-rose-500 hover:text-rose-700 rounded transition-colors cursor-pointer"
                        title="Hủy Bill này & khôi phục các phiếu khoa phòng"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredM2Dispatches.length === 0 && (
              <div className="text-center py-6 text-stone-400 text-xs italic">
                Không tìm thấy phiếu bàn giao nào phù hợp!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Master Bill Workspace */}
      <div className="lg:col-span-7">
        {activeDispatch && activeDispatch.status === 'pending_laundry' ? (
          <div ref={detailSectionRef} className="border border-stone-300 bg-white rounded-xl shadow-sm p-5 space-y-4 animate-fade-in scroll-mt-6">
            <div className="flex justify-between items-center pb-3 border-b border-stone-200 flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-stone-900 uppercase flex items-center gap-2">
                  Chi tiết bàn giao xe {activeDispatch.id}
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800">Chờ xe tải</span>
                </h2>
                <span className="text-xs text-stone-500 block mt-0.5">
                  Xe: {activeDispatch.plate} • Tài xế: {activeDispatch.driver} • Xưởng: {activeDispatch.contractor}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold border border-amber-300 text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold shadow-2xs"
                  title="Xem trước & In Biên bản bàn giao xe"
                >
                  <Printer size={14} className="text-amber-600" /> In Bill
                </button>
                {hasPerm('linen') && (
                  <button
                    type="button"
                    onClick={() => handleCancelPendingDispatch(activeDispatch.id)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs font-bold"
                    title="Hủy Bill này và khôi phục các phiếu khoa phòng về danh sách dơ chờ gom"
                  >
                    <Trash2 size={13} /> Hủy Bill
                  </button>
                )}
                <button onClick={() => setActiveDispatchId(null)} className="text-stone-400 hover:text-stone-900 cursor-pointer p-1">
                  <X size={18} />
                </button>
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
                      <img src={activeDispatch.attachedImage} alt="Đồ vải khách VIP" className="max-h-64 object-contain rounded shadow-xs" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BẢNG CHECKLIST ĐỐI CHIẾU KHO DƠ BỆNH VIỆN (CHỜ GIAO CTY) */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-300 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <span className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5 font-bold">
                    <ClipboardCheck className="w-4 h-4 text-amber-900 shrink-0" />
                    <span>BẢNG CHECKLIST ĐỐI CHIẾU KHO DƠ BV (LẦN 2)</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      const nextStoreChecked: Record<string, boolean> = {};
                      activeDispatch.items.forEach(it => {
                        nextStoreChecked[it.ma] = true;
                      });
                      setM2StoreCheckedItems(nextStoreChecked);
                      setM2HandoverCheckedItems(nextStoreChecked);
                      showToast('✓ Đã tích chọn kiểm đếm tất cả đồ vải bàn giao!', 'success');
                    }}
                    className="px-2.5 py-1 text-[10px] bg-white hover:bg-stone-50 text-amber-900 font-extrabold border border-amber-300 rounded-md shadow-2xs transition-all cursor-pointer"
                  >
                    ✓ Tích tất cả ({activeDispatch.items.length} mục)
                  </button>
                </div>
              </div>

              {/* 📍 Phân trang 6 trang chọn nhanh danh mục đồ vải dưới dòng bảng checklist */}
              <ChecklistPagination
                currentPage={m2ChecklistPage}
                totalPages={totalM2Pages}
                pageSize={m2ChecklistPageSize}
                totalItems={activeDispatch.items.length}
                filteredCount={filteredActiveDispatchItems.length}
                startIndex={m2StartIndex}
                endIndex={m2EndIndex}
                searchQuery={m2ChecklistSearch}
                checkedCount={checkedM2Count}
                themeColor="amber"
                selectedTrang={m2SelectedTrang}
                onTrangChange={(trang) => {
                  setM2SelectedTrang(trang);
                  setM2ChecklistPage(1);
                }}
                itemTrangMap={itemTrangMap}
                itemsList={activeDispatch.items}
                getItemDeliveryQty={getM2ItemDeliveryQty}
                onlyShowDelivered={m2OnlyShowDelivered}
                onToggleOnlyDelivered={(val) => {
                  setM2OnlyShowDelivered(val);
                  setM2ChecklistPage(1);
                }}
                onPageChange={(p) => setM2ChecklistPage(p)}
                onPageSizeChange={(sz) => {
                  setM2ChecklistPageSize(sz);
                  setM2ChecklistPage(1);
                }}
                onSearchChange={(q) => {
                  setM2ChecklistSearch(q);
                  setM2ChecklistPage(1);
                }}
              />

              <div className="border border-amber-200 rounded-lg overflow-x-auto bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-amber-100/70 border-b border-amber-200 text-amber-900 font-bold">
                      <th className="p-2.5 text-center w-12 text-[10px] uppercase">KIỂM</th>
                      <th className="p-2.5 text-[10px] uppercase">TÊN ĐỒ VẢI</th>
                      <th className="p-2.5 text-right w-24 text-[10px] uppercase">TỒN KHO DƠ</th>
                      <th className="p-2.5 text-right w-36 text-[10px] uppercase">GIAO TRÊN BILL</th>
                      <th className="p-2.5 text-center w-32 text-[10px] uppercase">ĐỐI CHIẾU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {paginatedM2Items.length > 0 ? (
                      paginatedM2Items.map(item => {
                        const storeQty = temporaryDirtyStore[item.ma] || 0;
                        const billQty = m2ItemHandoverQtys[item.ma] ?? item.handoverQty;
                        const isChecked = !!m2StoreCheckedItems[item.ma];
                        const isMatched = storeQty === billQty;
                        const hasDelivery = billQty > 0 || storeQty > 0;

                        return (
                          <tr
                            key={item.ma}
                            className={`transition-colors ${
                              hasDelivery
                                ? 'bg-amber-50/80 font-semibold border-l-4 border-l-amber-500'
                                : 'hover:bg-amber-50/30 text-stone-600'
                            } ${isChecked ? 'bg-amber-100/60' : ''}`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                                checked={isChecked}
                                onChange={() => {
                                  setM2StoreCheckedItems(prev => ({
                                    ...prev,
                                    [item.ma]: !prev[item.ma]
                                  }));
                                  setM2HandoverCheckedItems(prev => ({
                                    ...prev,
                                    [item.ma]: !prev[item.ma]
                                  }));
                                }}
                              />
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs ${hasDelivery ? 'font-black text-stone-900' : 'font-medium text-stone-700'}`}>
                                  {item.ten}
                                </span>
                              </div>
                              <span className="text-[9px] text-stone-400 font-mono block mt-0.5">{item.ma}</span>
                              <div className="mt-1">
                                <input
                                  type="text"
                                  placeholder="Ghi chú lý do lệch..."
                                  className="w-full max-w-[200px] border border-amber-200 rounded px-1.5 py-0.5 text-[10px] bg-stone-50 focus:bg-white focus:border-amber-400 focus:outline-none placeholder-stone-400 font-medium"
                                  value={m2ItemHandoverNotes[item.ma] ?? ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setM2ItemHandoverNotes(prev => ({ ...prev, [item.ma]: val }));
                                  }}
                                />
                              </div>
                            </td>
                            <td className="p-2.5 text-right">
                              <span className="font-mono font-extrabold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded text-xs">
                                {storeQty} cái
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono text-stone-600 font-medium">
                              {hasPerm('linen') ? (
                                <div className="flex justify-end items-center gap-1">
                                  <input
                                    type="number"
                                    className="w-20 h-8 border border-stone-300 rounded-lg text-center text-xs font-mono font-black text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={billQty}
                                    onChange={e => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setM2ItemHandoverQtys(prev => ({ ...prev, [item.ma]: val }));
                                    }}
                                  />
                                  <span className="text-[10px] text-stone-500">cái</span>
                                </div>
                              ) : (
                                <span className="text-xs text-stone-900 font-bold">{billQty} cái</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              {isMatched ? (
                                <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">
                                  🟢 Khớp hoàn tất
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 text-[9px] font-black bg-rose-100 text-rose-700 rounded animate-pulse">
                                  ⚠️ LỆCH {Math.abs(storeQty - billQty)} CÁI
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-stone-400 italic">
                          Không tìm thấy đồ vải nào phù hợp với từ khóa "{m2ChecklistSearch}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom pagination */}
              {filteredActiveDispatchItems.length > 0 && m2ChecklistPageSize !== 'all' && totalM2Pages > 1 && (
                <ChecklistPagination
                  currentPage={m2ChecklistPage}
                  totalPages={totalM2Pages}
                  pageSize={m2ChecklistPageSize}
                  totalItems={activeDispatch.items.length}
                  filteredCount={filteredActiveDispatchItems.length}
                  startIndex={m2StartIndex}
                  endIndex={m2EndIndex}
                  searchQuery=""
                  themeColor="amber"
                  onPageChange={(p) => setM2ChecklistPage(p)}
                />
              )}
            </div>

            {/* Submit Actions */}
            {hasPerm('linen') ? (
              <div className="bg-stone-50 border border-stone-300 rounded-lg p-3 flex justify-end items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCancelPendingDispatch(activeDispatch.id)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold uppercase rounded-lg shadow-2xs whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 font-bold"
                  >
                    <Trash2 size={14} /> Hủy Bill Tổng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyM2Handover(activeDispatch.id)}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase rounded-lg shadow whitespace-nowrap cursor-pointer transition-all font-bold"
                  >
                    Xác nhận xe lăn bánh & Trừ kho dơ
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-center text-xs text-amber-800 font-medium">
                ⏳ Phiếu đang chờ bàn giao xe. Vui lòng liên hệ Nhân viên quản lý đồ vải để tick kiểm lần 2 và xác nhận bàn giao bốc xếp xe rời đi.
              </div>
            )}
          </div>
        ) : activeDispatch ? (
          <div ref={detailSectionRef} className="border border-stone-300 bg-white rounded-xl shadow-sm p-5 space-y-4 animate-fade-in scroll-mt-6">
            <div className="flex justify-between items-center pb-3 border-b border-stone-200 flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-stone-900 uppercase flex items-center gap-2">
                  Chi tiết phiếu bàn giao {activeDispatch.id}
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-800">Đã bàn giao xe</span>
                </h2>
                <span className="text-xs text-stone-500 block mt-0.5">
                  Xe: {activeDispatch.plate || 'Chưa rõ'} • Tài xế: {activeDispatch.driver || 'Tài xế Cty Giặt'} • Xưởng: {activeDispatch.contractor || 'Cty Giặt'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold border border-amber-300 text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold shadow-2xs"
                  title="Xem trước & In Biên bản bàn giao xe"
                >
                  <Printer size={14} className="text-amber-600" /> In Bill
                </button>
                <button onClick={() => setActiveDispatchId(null)} className="text-stone-400 hover:text-stone-900 cursor-pointer p-1">
                  <X size={18} />
                </button>
              </div>
            </div>

            {activeDispatch.lossNote && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
                ⚠️ {activeDispatch.lossNote}
              </div>
            )}

            <div className="border border-stone-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold uppercase text-[10px]">
                    <th className="p-2.5">MÃ</th>
                    <th className="p-2.5">TÊN ĐỒ VẢI</th>
                    <th className="p-2.5 text-right">SỐ LƯỢNG BÀN GIAO</th>
                    <th className="p-2.5">GHI CHÚ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {activeDispatch.items.map(it => (
                    <tr key={it.ma} className="hover:bg-stone-50">
                      <td className="p-2.5 font-mono font-bold text-stone-600 text-[11px]">{it.ma}</td>
                      <td className="p-2.5 font-bold text-stone-800">{it.ten}</td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-800">{it.handoverQty} cái</td>
                      <td className="p-2.5 text-stone-500 italic text-[11px]">{it.handoverNote || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center text-xs text-emerald-800 font-medium flex items-center justify-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>Phiếu đã hoàn tất thủ tục bàn giao cho xưởng giặt. Bấm <b>In Bill</b> để xuất biên bản giao nhận.</span>
            </div>
          </div>
        ) : (
          <div className="h-48 border border-dashed border-stone-200 rounded-xl flex items-center justify-center text-stone-400 text-xs">
            Chưa chọn hóa đơn bốc xếp dơ nào
          </div>
        )}
      </div>

      <PrintBillModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={activeDispatch ? {
          title: activeDispatch.isGuestBill ? "BIÊN BẢN BÀN GIAO ĐỒ VẢI KHÁCH VIP CHO CTY GIẶT" : "BIÊN BẢN BÀN GIAO ĐỒ VẢI DƠ CHO XƯỞNG GIẶT (BILL TỔNG)",
          subTitle: `Bàn giao xe tải xưởng giặt công ty - ${activeDispatch.contractor}`,
          billId: activeDispatch.id,
          date: activeDispatch.createdAt,
          sender: currentAccount?.name || 'Nhân viên Đồ Vải',
          contractor: activeDispatch.contractor,
          driver: activeDispatch.driver,
          plate: activeDispatch.plate,
          receiver: activeDispatch.driver || 'Tài xế Cty Giặt',
          guestName: activeDispatch.guestName,
          guestRoom: activeDispatch.guestRoom,
          statusText: activeDispatch.status === 'pending_laundry' ? 'Chờ xe tải' : 'Đã bàn giao xe',
          items: activeDispatch.items.map(it => ({
            ma: it.ma,
            ten: it.ten,
            group: it.group,
            qty: it.wardQty || 0,
            realQty: m2ItemHandoverQtys[it.ma] !== undefined ? m2ItemHandoverQtys[it.ma] : (it.handoverQty || 0),
            note: m2ItemHandoverNotes[it.ma] || it.handoverNote || ''
          })),
          notes: activeDispatch.lossNote || undefined
        } : null}
      />
    </div>
  );
}
