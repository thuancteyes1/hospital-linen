/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  LinenItem, 
  WardDeliverySlip, 
  LaundryDispatch,
  Account, 
  User,
  Role,
  LINEN_GROUPS
} from '../types';
import { 
  INITIAL_WARD_DELIVERY_SLIPS, 
  INITIAL_LAUNDRY_DISPATCHES,
  generateDailySlipId
} from '../data';
import { 
  PlusCircle, 
  CheckCircle, 
  Truck, 
  Inbox, 
  Layers, 
  Search, 
  AlertCircle, 
  Trash2, 
  Check, 
  X, 
  FileText, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  Clock,
  Calendar,
  Building,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  FileCheck,
  Settings
} from 'lucide-react';

interface DeliveryFlowProps {
  items: LinenItem[];
  detailAllocations: Record<string, [string, number][]>;
  currentAccount: Account | null;
  currentWardName: string;
  currentRoleName: string;
  isWardUser?: boolean;
  isLaundryUser?: boolean;
  users: User[];
  roles: Role[];
  departments: string[];
  wardDeliverySlips: WardDeliverySlip[];
  laundryDispatches?: LaundryDispatch[];
  temporaryCleanStore: Record<string, number>;
  temporaryDirtyStore?: Record<string, number>;
  temporaryCompanyDirtyStore?: Record<string, number>;
  onUpdateWardDeliverySlips: (slips: WardDeliverySlip[]) => void;
  onUpdateLaundryDispatches?: (dispatches: LaundryDispatch[]) => void;
  onUpdateTemporaryCleanStore: (store: Record<string, number>) => void;
  onUpdateTemporaryDirtyStore?: (store: Record<string, number>) => void;
  onUpdateTemporaryCompanyDirtyStore?: (store: Record<string, number>) => void;
  onUpdateDeliveryStates?: (params: {
    wardSlips?: WardDeliverySlip[];
    laundryDispatches?: LaundryDispatch[];
    temporaryCleanStore?: Record<string, number>;
    temporaryDirtyStore?: Record<string, number>;
    temporaryCompanyDirtyStore?: Record<string, number>;
    clearHistory?: boolean;
  }) => void;
  onCompleteCycle: (recoveredItems: Array<{ ma: string; qty: number }>) => void;
  activeMuc?: 1 | 2 | 3 | 4;
  onActiveMucChange?: (muc: 1 | 2 | 3 | 4) => void;
  simulatedRole?: 'ward' | 'orderly' | 'housekeeping' | 'linen' | 'laundry' | 'clean' | 'all' | 'admin';
}

const DEPARTMENTS_LIST = [
  "NICU",
  "Gây mê hồi sức",
  "Cấp cứu đa khoa",
  "Phòng sanh",
  "Nội trú sản T1",
  "CSSD",
  "Nội trú nhi",
  "Nội soi tiêu hóa",
  "Khách",
  "Khách (VIP/Khoa ngoài)"
];

export default function DeliveryFlow({
  items = [],
  detailAllocations = {},
  currentAccount,
  currentWardName,
  currentRoleName,
  isWardUser = false,
  isLaundryUser = false,
  users = [],
  roles = [],
  departments = [],
  wardDeliverySlips = [],
  laundryDispatches = [],
  temporaryCleanStore = {},
  temporaryDirtyStore = {},
  temporaryCompanyDirtyStore = {},
  onUpdateWardDeliverySlips,
  onUpdateLaundryDispatches,
  onUpdateTemporaryCleanStore,
  onUpdateTemporaryDirtyStore,
  onUpdateTemporaryCompanyDirtyStore,
  onUpdateDeliveryStates,
  activeMuc: propActiveMuc,
  onActiveMucChange,
  simulatedRole = 'all'
}: DeliveryFlowProps) {
  const deptsToUse = departments && departments.length > 0 ? departments : DEPARTMENTS_LIST;
  
  const effectiveIsWardUser = isWardUser || simulatedRole === 'ward' || simulatedRole === 'housekeeping' || simulatedRole === 'orderly';
  const effectiveIsLaundryUser = isLaundryUser || simulatedRole === 'laundry';

  // Primary Tab layout: 1 = Giao nhận dơ khoa phòng, 2 = Giao nhận với Cty, 3 = Giao nhận sạch khoa phòng, 4 = Đối chiếu & Nợ
  const [activeMucState, setActiveMucState] = useState<1 | 2 | 3 | 4>(1);
  const activeMuc = propActiveMuc !== undefined ? propActiveMuc : activeMucState;
  const setActiveMuc = (muc: 1 | 2 | 3 | 4) => {
    if (onActiveMucChange) {
      onActiveMucChange(muc);
    } else {
      setActiveMucState(muc);
    }
  };

  // States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (effectiveIsLaundryUser && activeMuc !== 2 && activeMuc !== 4) {
      setActiveMuc(2);
    } else if (effectiveIsWardUser && activeMuc === 2) {
      setActiveMuc(1);
    }
  }, [effectiveIsLaundryUser, effectiveIsWardUser, activeMuc]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 5000);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('Tất cả');
  const [m2SearchQuery, setM2SearchQuery] = useState('');
  const [m2SubTab, setM2SubTab] = useState<'clean' | 'debt'>('clean');
  const [m2DebtTab, setM2DebtTab] = useState<'all' | 'over48h'>('all');
  const [m1SubTab, setM1SubTab] = useState<'dirty-ward' | 'dirty-company'>('dirty-ward');
  const [m3SubTab, setM3SubTab] = useState<'clean-ward' | 'ward-debt'>('clean-ward');
  const [searchM3Ward, setSearchM3Ward] = useState('');
  const [m3WardFilterDate, setM3WardFilterDate] = useState('');
  const [filterM3WardDept, setFilterM3WardDept] = useState('Tất cả');
  const [filterM3WardAge, setFilterM3WardAge] = useState<'Tất cả' | 'under24h' | '24to48h' | 'over48h' | 'over10d'>('Tất cả');
  const [activeSlipId, setActiveSlipId] = useState<string | null>(null);
  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null);
  const [confirmDelSlipId, setConfirmDelSlipId] = useState<string | null>(null);

  // Section 2 interactive states
  const [m2ItemHandoverQtys, setM2ItemHandoverQtys] = useState<Record<string, number>>({});
  const [m2ItemHandoverNotes, setM2ItemHandoverNotes] = useState<Record<string, string>>({});
  const [m2ItemCleanQtys, setM2ItemCleanQtys] = useState<Record<string, number>>({});
  const [m2ItemHospitalVerifyQtys, setM2ItemHospitalVerifyQtys] = useState<Record<string, number>>({});

  // Section 1 checkoff / verify states
  const [m1CheckedItems, setM1CheckedItems] = useState<Record<string, boolean>>({});
  const [m1ItemVerifiedQtys, setM1ItemVerifiedQtys] = useState<Record<string, number>>({});
  const [isConfirmingM1, setIsConfirmingM1] = useState(false);

  // Section 2 checkoff states for handover to company
  const [m2HandoverCheckedItems, setM2HandoverCheckedItems] = useState<Record<string, boolean>>({});
  const [m2StoreCheckedItems, setM2StoreCheckedItems] = useState<Record<string, boolean>>({});

  // Initialize Section 1 checkoff states when active slip changes
  useEffect(() => {
    const slip = wardDeliverySlips.find(s => s.id === activeSlipId);
    if (slip) {
      const checked: Record<string, boolean> = {};
      const qtys: Record<string, number> = {};
      slip.items.forEach(it => {
        checked[it.ma] = it.isVerifiedDirty ?? false;
        qtys[it.ma] = it.verifiedDirtyQty ?? it.qty;
      });
      setM1CheckedItems(checked);
      setM1ItemVerifiedQtys(qtys);
      setIsConfirmingM1(false);
    } else {
      setM1CheckedItems({});
      setM1ItemVerifiedQtys({});
      setIsConfirmingM1(false);
    }
  }, [activeSlipId, wardDeliverySlips]);

  // Initialize Section 2 checkoff states when active dispatch changes
  useEffect(() => {
    const dispatch = laundryDispatches.find(d => d.id === activeDispatchId);
    if (dispatch) {
      const checked: Record<string, boolean> = {};
      dispatch.items.forEach(it => {
        checked[it.ma] = it.isHandoverChecked ?? false;
      });
      setM2HandoverCheckedItems(checked);
      setM2StoreCheckedItems({});
    } else {
      setM2HandoverCheckedItems({});
      setM2StoreCheckedItems({});
    }
  }, [activeDispatchId, laundryDispatches]);

  // Section 3 interactive states
  const [selectedM1SlipIdForCleanReturn, setSelectedM1SlipIdForCleanReturn] = useState<string | null>(null);
  const [m3ItemCleanReturnQtys, setM3ItemCleanReturnQtys] = useState<Record<string, number>>({});
  const [m3ReceiverName, setM3ReceiverName] = useState('');
  const [m3SearchQuery, setM3SearchQuery] = useState('');
  const [m3FilterDept, setM3FilterDept] = useState('Tất cả');

  const [inlineSettleSlipId, setInlineSettleSlipId] = useState<string | null>(null);
  const [inlineSettleQtys, setInlineSettleQtys] = useState<Record<string, number>>({});

  // Synchronize inline settle quantities with selected slip and capped clean store
  useEffect(() => {
    const slip = wardDeliverySlips.find(s => s.id === inlineSettleSlipId);
    if (slip) {
      const initQtys: Record<string, number> = {};
      slip.items.forEach(it => {
        const maxPossible = it.verifiedDirtyQty ?? it.qty;
        const availableClean = temporaryCleanStore[it.ma] || 0;
        initQtys[it.ma] = Math.min(maxPossible, availableClean);
      });
      setInlineSettleQtys(initQtys);
    } else {
      setInlineSettleQtys({});
    }
  }, [inlineSettleSlipId, wardDeliverySlips, temporaryCleanStore]);

  // Initialize and cap Section 3 return quantities based on available temporaryCleanStore
  useEffect(() => {
    const slip = wardDeliverySlips.find(s => s.id === selectedM1SlipIdForCleanReturn);
    if (slip) {
      setM3ReceiverName(slip.receiver || '');
      setM3ItemCleanReturnQtys(prev => {
        const next = { ...prev };
        slip.items.forEach(item => {
          const maxPossible = item.verifiedDirtyQty ?? item.qty;
          const availableClean = temporaryCleanStore[item.ma] || 0;
          if (next[item.ma] === undefined) {
            next[item.ma] = Math.min(maxPossible, availableClean);
          } else {
            next[item.ma] = Math.min(next[item.ma], maxPossible, availableClean);
          }
        });
        return next;
      });
    } else {
      setM3ReceiverName('');
      setM3ItemCleanReturnQtys({});
    }
  }, [selectedM1SlipIdForCleanReturn, wardDeliverySlips, temporaryCleanStore]);

  // Section 4 (Đối chiếu & Nợ) states
  const [m4ActiveTab, setM4ActiveTab] = useState<'ward' | 'company'>('ward');
  const [searchM4Ward, setSearchM4Ward] = useState('');
  const [m4WardFilterDate, setM4WardFilterDate] = useState('');
  const [filterM4WardDept, setFilterM4WardDept] = useState('Tất cả');
  const [filterM4WardAge, setFilterM4WardAge] = useState<'Tất cả' | 'under24h' | '24to48h' | 'over48h' | 'over10d'>('Tất cả');

  const [searchM4Company, setSearchM4Company] = useState('');
  const [m4CompanyFilterDate, setM4CompanyFilterDate] = useState('');
  const [filterM4CompanyAge, setFilterM4CompanyAge] = useState<'Tất cả' | 'under24h' | '24to48h' | 'over48h' | 'over10d'>('Tất cả');

  // Quick return state for company debt
  const [m4SelectedCompanyDebtId, setM4SelectedCompanyDebtId] = useState<string | null>(null);
  const [m4CompanyReturnQtys, setM4CompanyReturnQtys] = useState<Record<string, number>>({});

  // Helper function to parse Vietnamese local dates
  const parseViDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    try {
      const clean = dateStr.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
      const dmyMatch = clean.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1]);
        const month = parseInt(dmyMatch[2]) - 1;
        const year = parseInt(dmyMatch[3]);
        
        const timeMatch = clean.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          const min = parseInt(timeMatch[2]);
          const sec = parseInt(timeMatch[3]);
          return new Date(year, month, day, hour, min, sec);
        }
        return new Date(year, month, day);
      }
    } catch (e) {
      console.error('Lỗi phân tích ngày:', dateStr, e);
    }
    return new Date();
  };

  // Helper function to get the age of a debt slip in days
  const getDebtAgeDays = (createdAtStr: string): number => {
    const createdDate = parseViDate(createdAtStr);
    const diffTime = Date.now() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Helper function to get the age of a debt slip in hours
  const getDebtAgeHours = (createdAtStr: string): number => {
    const createdDate = parseViDate(createdAtStr);
    const diffTime = Date.now() - createdDate.getTime();
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    return Math.max(0, diffHours);
  };

  // Section 4 handler: laundry company submits clean return for debt bill
  const handleCompanySubmitM4DebtReturn = (dispatchId: string, returnCleanQtys: Record<string, number>) => {
    const dispatch = (laundryDispatches || []).find(d => d.id === dispatchId);
    if (!dispatch) return;

    const updatedItems = dispatch.items.map(item => {
      const cleanQty = returnCleanQtys[item.ma] !== undefined ? returnCleanQtys[item.ma] : item.handoverQty;
      return {
        ...item,
        cleanReturnedQty: cleanQty,
        hospitalReceivedQty: cleanQty, // default
        isCleanChecked: false
      };
    });

    const nextDispatches = (laundryDispatches || []).map(d => {
      if (d.id === dispatchId) {
        return {
          ...d,
          items: updatedItems,
          status: 'returning_clean' as const,
          cleanReturnedAt: new Date().toLocaleString('vi-VN'),
          cleanReturnedBy: currentAccount?.name || 'Xưởng giặt Cty'
        };
      }
      return d;
    });

    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates({
        laundryDispatches: nextDispatches
      });
    } else if (onUpdateLaundryDispatches) {
      onUpdateLaundryDispatches(nextDispatches);
    }

    setM4SelectedCompanyDebtId(null);
    showToast(`🚚 Đã gửi khai báo trả sạch cho phiếu nợ ${dispatchId}. Đang chờ Nhân viên đồ vải BV xác nhận thực tế.`, 'success');
  };

  // Section 4 handler: hospital staff verifies clean return and completes debt bill (handling partial/split)
  const handleHospitalVerifyM4DebtReturn = (dispatchId: string, verifyQtys: Record<string, number>) => {
    if (!canVerifyCleanReturn) {
      showToast('⚠️ Chỉ Trưởng kho đồ vải hoặc Nhân viên đồ vải mới có quyền xác nhận bill này!', 'error');
      return;
    }
    const dispatch = (laundryDispatches || []).find(d => d.id === dispatchId);
    if (!dispatch) return;

    const debtItems: Array<any> = [];
    const updatedItems = dispatch.items.map(item => {
      const verifyQty = verifyQtys[item.ma] !== undefined ? verifyQtys[item.ma] : item.handoverQty;
      const debtRemaining = Math.max(0, item.handoverQty - verifyQty);
      if (debtRemaining > 0) {
        debtItems.push({
          ...item,
          qty: debtRemaining,
          handoverQty: debtRemaining,
          cleanReturnedQty: 0,
          hospitalReceivedQty: 0,
          isCleanChecked: false
        });
      }
      return {
        ...item,
        hospitalReceivedQty: verifyQty,
        isCleanChecked: true
      };
    });

    let nextDispatches = (laundryDispatches || []).map(d => {
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

    if (debtItems.length > 0) {
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
        lossNote: `Nợ chưa trả hết phát sinh từ ${dispatchId}`
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

    // Also update associated slips (if any)
    const updatedSlips = wardDeliverySlips.map(slip => {
      if (slip.laundryDispatchId === dispatchId || dispatch.linkedSlipIds.includes(slip.id)) {
        const nextItems = slip.items.map(sItem => {
          const matchedItem = updatedItems.find(uIt => uIt.ma === sItem.ma);
          if (matchedItem) {
            return {
              ...sItem,
              cleanReturnedQty: (sItem.cleanReturnedQty || 0) + (matchedItem.hospitalReceivedQty ?? 0),
              isCleanReturned: true
            };
          }
          return sItem;
        });
        return { ...slip, items: nextItems };
      }
      return slip;
    });

    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates({
        laundryDispatches: nextDispatches,
        wardSlips: updatedSlips,
        temporaryCleanStore: nextCleanStore,
        temporaryCompanyDirtyStore: nextCompanyDirtyStore
      });
    } else {
      if (onUpdateLaundryDispatches) onUpdateLaundryDispatches(nextDispatches);
      if (onUpdateWardDeliverySlips) onUpdateWardDeliverySlips(updatedSlips);
      if (onUpdateTemporaryCleanStore) onUpdateTemporaryCleanStore(nextCleanStore);
    }

    setM4SelectedCompanyDebtId(null);
    showToast(`✅ Đã xác nhận hoàn thành trả nợ xưởng giặt cho bill ${dispatchId}. Đồ vải sạch đã được cộng vào Kho sạch BV.`, 'success');
  };

  // Draft states for creating new slip
  const [isCreatingSlip, setIsCreatingSlip] = useState(false);
  const [draftIsRewash, setDraftIsRewash] = useState(false);
  
  // States for adjusting temporary dirty store
  const [isAdjustingDirtyStore, setIsAdjustingDirtyStore] = useState(false);
  const [dirtyStoreAdjustmentQtys, setDirtyStoreAdjustmentQtys] = useState<Record<string, number>>({});
  const [adjustDirtyReason, setAdjustDirtyReason] = useState<string>('Hao hụt thực tế thu gom');

  // State for confirming actions in iframe environments (replaces window.confirm)
  const [cleanupPendingType, setCleanupPendingType] = useState<'all' | 'wardSlips' | 'laundryDispatches' | 'dirtyStore' | 'cleanStore' | 'onlyInventory' | null>(null);

  const handleOpenAdjustDirtyStore = () => {
    const currentQtys: Record<string, number> = {};
    Object.keys(temporaryDirtyStore).forEach(ma => {
      if ((temporaryDirtyStore[ma] || 0) > 0) {
        currentQtys[ma] = temporaryDirtyStore[ma];
      }
    });
    setDirtyStoreAdjustmentQtys(currentQtys);
    setAdjustDirtyReason('Hao hụt thực tế thu gom');
    setIsAdjustingDirtyStore(true);
  };

  const handleSaveDirtyStoreAdjustment = () => {
    const nextDirtyStore = { ...temporaryDirtyStore };
    let adjustedLog: string[] = [];

    Object.keys(dirtyStoreAdjustmentQtys).forEach(ma => {
      const oldQty = temporaryDirtyStore[ma] || 0;
      const newQty = Math.max(0, dirtyStoreAdjustmentQtys[ma] || 0);
      if (newQty !== oldQty) {
        nextDirtyStore[ma] = newQty;
        const item = items.find(i => i.ma === ma);
        const itemName = item?.ten || ma;
        adjustedLog.push(`${itemName}: ${oldQty} ➔ ${newQty} (Lệch: ${newQty - oldQty} cái)`);
      }
    });

    if (adjustedLog.length === 0) {
      showToast('Không có thay đổi nào được thực hiện!', 'info');
      setIsAdjustingDirtyStore(false);
      return;
    }

    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates({
        temporaryDirtyStore: nextDirtyStore
      });
    } else if (onUpdateTemporaryDirtyStore) {
      onUpdateTemporaryDirtyStore(nextDirtyStore);
    }

    setIsAdjustingDirtyStore(false);
    showToast(`✅ Đã điều chỉnh Kho đồ dơ BV thành công!\nLý do: ${adjustDirtyReason}\n${adjustedLog.join('\n')}`, 'success');
  };

  // State & handler for operational data cleanup

  const executeConfirmedCleanup = (type: 'all' | 'wardSlips' | 'laundryDispatches' | 'dirtyStore' | 'cleanStore' | 'onlyInventory') => {
    if (onUpdateDeliveryStates) {
      const updateParams: any = {};
      if (type === 'all' || type === 'wardSlips') updateParams.wardSlips = [];
      if (type === 'all' || type === 'laundryDispatches') updateParams.laundryDispatches = [];
      if (type === 'all' || type === 'cleanStore' || type === 'onlyInventory') updateParams.temporaryCleanStore = {};
      if (type === 'all' || type === 'dirtyStore' || type === 'onlyInventory') updateParams.temporaryDirtyStore = {};
      if (type === 'all' || type === 'onlyInventory') {
        updateParams.temporaryCompanyDirtyStore = {};
      }
      if (type === 'all') {
        updateParams.clearHistory = true;
      }
      onUpdateDeliveryStates(updateParams);
    } else {
      if (type === 'all' || type === 'wardSlips') onUpdateWardDeliverySlips([]);
      if (type === 'all' || type === 'laundryDispatches') onUpdateLaundryDispatches?.([]);
      if (type === 'all' || type === 'cleanStore' || type === 'onlyInventory') onUpdateTemporaryCleanStore({});
      if (type === 'all' || type === 'dirtyStore' || type === 'onlyInventory') {
        onUpdateTemporaryDirtyStore?.({});
        if (type === 'all' || type === 'onlyInventory') onUpdateTemporaryCompanyDirtyStore?.({});
      }
    }

    if (type === 'all' || type === 'wardSlips') {
      setActiveSlipId(null);
      setConfirmDelSlipId(null);
      setSelectedM1SlipIdForCleanReturn(null);
    }
    if (type === 'all' || type === 'laundryDispatches') {
      setActiveDispatchId(null);
    }
    if (type === 'all') {
      localStorage.removeItem('linen_draft_slip_data');
    }

    let successMsg = '';
    switch (type) {
      case 'all':
        successMsg = '🧹 Đã xóa toàn bộ dữ liệu vận hành & reset hệ thống thành công!';
        break;
      case 'wardSlips':
        successMsg = '📋 Đã xóa danh sách phiếu giao dơ thành công!';
        break;
      case 'laundryDispatches':
        successMsg = '🚚 Đã xóa danh sách bàn giao và trả sạch thành công!';
        break;
      case 'dirtyStore':
        successMsg = '🧺 Đã reset kho dơ tạm về 0 thành công!';
        break;
      case 'cleanStore':
        successMsg = '✨ Đã reset kho sạch tạm về 0 thành công!';
        break;
      case 'onlyInventory':
        successMsg = '🔄 Đã reset tồn kho của cả 3 phân hệ về 0 thành công!';
        break;
    }
    showToast(successMsg, 'success');
    setCleanupPendingType(null);
  };

  const [selectedDept, setSelectedDept] = useState(() => {
    if (currentWardName && currentWardName !== 'Tất cả' && currentWardName !== 'Kho trung tâm') {
      return currentWardName;
    }
    return deptsToUse[0];
  });
  const [slipCreator, setSlipCreator] = useState(currentAccount?.name || 'Hộ lý / Điều dưỡng');
  const [draftItems, setDraftItems] = useState<Array<{
    ma: string;
    ten: string;
    group: string;
    qty: number;
    isInfectious: boolean;
    isCustom?: boolean;
  }>>([]);


  const handleResetOnlyInventory = () => {
    setCleanupPendingType('onlyInventory');
  };

  const handleResetAllSlipsAndInventory = () => {
    setCleanupPendingType('all');
  };

  const [customName, setCustomName] = useState('');
  const [customGroup, setCustomGroup] = useState(LINEN_GROUPS[0]);
  const [customQty, setCustomQty] = useState(1);
  const [customInfectious, setCustomInfectious] = useState(false);

  const isHousekeepingUser = simulatedRole === 'housekeeping' || currentAccount?.username === 'buongphong' || (currentAccount?.name || '').toLowerCase().includes('buồng') || (currentWardName || '').startsWith('Khách');
  const isOrderlyUser = simulatedRole === 'orderly' || simulatedRole === 'housekeeping' || (currentRoleName || '').toLowerCase().includes('hộ lý') || (currentRoleName || '').toLowerCase().includes('buồng') || (currentAccount?.name || '').toLowerCase().includes('hộ lý') || (currentAccount?.name || '').toLowerCase().includes('buồng') || (currentAccount?.username || '').toLowerCase().includes('.hl') || (currentAccount?.username || '').toLowerCase().includes('holy') || (currentWardName || '').startsWith('Khách');

  const [draftAttachedImage, setDraftAttachedImage] = useState<string | undefined>(undefined);
  const [draftGuestName, setDraftGuestName] = useState<string>('');
  const [draftGuestRoom, setDraftGuestRoom] = useState<string>('');

  // Check if current user has the "Xử lý đồ vải" (dovai) permission
  const hasLinenPerm = useMemo(() => {
    if (simulatedRole === 'admin') return true;
    if (simulatedRole !== 'all') {
      let keyword = '';
      if (simulatedRole === 'ward') keyword = 'điều dưỡng';
      else if (simulatedRole === 'orderly' || simulatedRole === 'housekeeping') keyword = 'hộ lý';
      else if (simulatedRole === 'linen' || simulatedRole === 'clean') keyword = 'thủ kho';
      else if (simulatedRole === 'laundry') keyword = 'giặt';

      if (keyword) {
        const simRoleObj = roles.find(r => (r.name || '').toLowerCase().includes(keyword));
        if (simRoleObj && simRoleObj.perms?.dovai !== undefined) {
          return simRoleObj.perms.dovai;
        }
      }
      return false;
    }
    if (currentAccount?.isAdmin) return true;
    if (!currentAccount) return false;
    const u = users[currentAccount.userIdx] || users.find(x => x.email === currentAccount.email);
    if (!u) return false;
    const userRole = roles[u.role];
    return userRole?.perms?.dovai ?? false;
  }, [currentAccount, users, roles, simulatedRole]);

  // Permission checking helper
  const checkPermission = (roleRequired: 'ward' | 'linen' | 'laundry' | 'clean' | 'housekeeping') => {
    // Admin always has all permissions
    if (simulatedRole === 'admin' || (simulatedRole === 'all' && currentAccount?.isAdmin)) return true;

    // If simulatedRole is active (not 'all' and not 'admin')
    if (simulatedRole !== 'all') {
      if (roleRequired === 'ward') {
        return simulatedRole === 'ward' || simulatedRole === 'housekeeping' || simulatedRole === 'orderly';
      }
      if (roleRequired === 'housekeeping') {
        return simulatedRole === 'housekeeping' || simulatedRole === 'orderly';
      }
      if (roleRequired === 'linen' || roleRequired === 'clean') {
        return simulatedRole === 'linen' || simulatedRole === 'clean';
      }
      if (roleRequired === 'laundry') {
        return simulatedRole === 'laundry';
      }
      return false;
    }

    // Now check real account roles
    if (isLaundryUser) {
      return roleRequired === 'laundry';
    }

    if (isOrderlyUser || isHousekeepingUser) {
      return roleRequired === 'ward' || roleRequired === 'housekeeping';
    }

    if (effectiveIsWardUser || (currentRoleName || '').toLowerCase().includes('hộ lý') || (currentRoleName || '').toLowerCase().includes('điều dưỡng')) {
      return roleRequired === 'ward';
    }

    // Default to hasLinenPerm for general linen/clean actions, but prevent ward/laundry users
    if (roleRequired === 'linen' || roleRequired === 'clean') {
      return hasLinenPerm && !isLaundryUser && !isOrderlyUser && !isHousekeepingUser && !effectiveIsWardUser;
    }

    return true;
  };

  useEffect(() => {
    if (m1SubTab === 'dirty-company' && !checkPermission('linen') && !checkPermission('clean')) {
      setM1SubTab('dirty-ward');
    }
  }, [simulatedRole, currentAccount, m1SubTab]);

  const canVerifyCleanReturn = !effectiveIsLaundryUser && (
    checkPermission('linen') || 
    checkPermission('clean') || 
    !!currentAccount?.isAdmin || 
    (currentRoleName || '').toLowerCase().includes('thủ kho') || 
    (currentRoleName || '').toLowerCase().includes('thủ trưởng') || 
    (currentRoleName || '').toLowerCase().includes('đồ vải') || 
    (currentRoleName || '').toLowerCase().includes('trưởng kho') || 
    (currentRoleName || '').toLowerCase().includes('quản trị')
  );

  // Edit and Delete pending slips states & methods
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);
  const [editDept, setEditDept] = useState('');
  const [editCreator, setEditCreator] = useState('');
  const [editItemsList, setEditItemsList] = useState<WardDeliverySlip['items']>([]);
  const [editAddLinenMa, setEditAddLinenMa] = useState('');
  const [editAddLinenQty, setEditAddLinenQty] = useState<number>(1);
  const [editAddLinenInfectious, setEditAddLinenInfectious] = useState<boolean>(false);

  const handleStartEditSlip = (slip: WardDeliverySlip) => {
    setEditingSlipId(slip.id);
    setEditDept(slip.dept);
    setEditCreator(slip.createdBy);
    setEditItemsList(slip.items.map(it => ({ ...it })));
    // Reset add new item inputs
    setEditAddLinenMa(items[0]?.ma || '');
    setEditAddLinenQty(1);
    setEditAddLinenInfectious(false);
  };

  const handleAddItemToEditList = () => {
    if (!editAddLinenMa) {
      showToast('Vui lòng chọn một loại đồ vải để thêm.', 'error');
      return;
    }
    const linen = items.find(it => it.ma === editAddLinenMa);
    if (!linen) {
      showToast('Không tìm thấy đồ vải đã chọn.', 'error');
      return;
    }

    const existingIndex = editItemsList.findIndex(it => it.ma === editAddLinenMa);
    if (existingIndex > -1) {
      // If already exists, increase quantity
      const updated = [...editItemsList];
      const newQty = updated[existingIndex].qty + editAddLinenQty;
      updated[existingIndex] = {
        ...updated[existingIndex],
        qty: newQty,
        verifiedDirtyQty: newQty,
        laundryReceivedQty: newQty,
        cleanReturnedQty: newQty,
        isInfectious: editAddLinenInfectious || updated[existingIndex].isInfectious
      };
      setEditItemsList(updated);
      showToast(`✓ Đã tăng thêm số lượng cho ${linen.ten}!`, 'success');
    } else {
      // Add new item
      const newItem: WardDeliverySlip['items'][number] = {
        ma: linen.ma,
        ten: linen.ten,
        group: linen.nhom,
        qty: editAddLinenQty,
        isInfectious: editAddLinenInfectious,
        isCustom: false,
        verifiedDirtyQty: editAddLinenQty,
        laundryReceivedQty: editAddLinenQty,
        cleanReturnedQty: editAddLinenQty
      };
      setEditItemsList([...editItemsList, newItem]);
      showToast(`✓ Đã thêm ${linen.ten} vào phiếu!`, 'success');
    }
    setEditAddLinenQty(1);
  };

  const handleUpdateEditItemQtyDirect = (ma: string, qty: number) => {
    setEditItemsList(prev => prev.map(it => {
      if (it.ma === ma) {
        return {
          ...it,
          qty: qty,
          verifiedDirtyQty: qty,
          laundryReceivedQty: qty,
          cleanReturnedQty: qty
        };
      }
      return it;
    }).filter(it => it.qty > 0));
  };

  const handleToggleEditItemInfectiousDirect = (ma: string) => {
    setEditItemsList(prev => prev.map(it => {
      if (it.ma === ma) {
        return { ...it, isInfectious: !it.isInfectious };
      }
      return it;
    }));
  };

  const handleUpdateEditItemTenDirect = (ma: string, ten: string) => {
    setEditItemsList(prev => prev.map(it => {
      if (it.ma === ma) {
        return { ...it, ten: ten };
      }
      return it;
    }));
  };

  const handleAddCustomToEditList = () => {
    const newCustom = {
      ma: `CUST-EDIT-${Date.now()}`,
      ten: 'Đồ vải tự đánh chữ...',
      group: "Đồ ngoài danh mục",
      qty: 1,
      isInfectious: false,
      isCustom: true,
      isVerifiedDirty: false,
      verifiedDirtyQty: 1,
      isLaundryReceived: false,
      laundryReceivedQty: 1,
      cleanReturnedQty: 1,
      isCleanReturnedVerified: false,
      isHospitalCleanVerified: false,
      hospitalCleanQty: 1
    };
    setEditItemsList(prev => [...prev, newCustom]);
    showToast('✓ Đã thêm dòng tự đánh chữ vào phiếu!', 'success');
  };

  const handleRemoveItemFromEditList = (ma: string) => {
    setEditItemsList(prev => prev.filter(it => it.ma !== ma));
    showToast('🗑️ Đã bớt đồ vải khỏi danh sách hiệu chỉnh.', 'info');
  };

  const handleSaveEditSlip = () => {
    const slip = wardDeliverySlips.find(s => s.id === editingSlipId);
    if (!slip) return;

    if (slip.status !== 'pending') {
      showToast('⚠️ Phiếu đã được duyệt, không thể chỉnh sửa nữa!', 'error');
      return;
    }

    if (editItemsList.length === 0) {
      showToast('Phiếu phải có ít nhất một mặt hàng.', 'error');
      return;
    }

    const updatedSlips = wardDeliverySlips.map(s => {
      if (s.id === editingSlipId) {
        return {
          ...s,
          dept: editDept,
          createdBy: editCreator,
          items: editItemsList
        };
      }
      return s;
    });

    onUpdateWardDeliverySlips(updatedSlips);
    setEditingSlipId(null);
    showToast('💾 Đã cập nhật thông tin phiếu dơ thành công!', 'success');
  };

  const handleCancelEditSlip = () => {
    setEditingSlipId(null);
  };

  const handleDeletePendingSlip = (slipId: string) => {
    const slip = wardDeliverySlips.find(s => s.id === slipId);
    if (!slip) return;

    if (slip.status !== 'pending') {
      showToast('⚠️ Phiếu đã được duyệt, không thể xóa!', 'error');
      return;
    }

    setConfirmDelSlipId(slipId);
  };

  // --- RANDOM SLIP METHOD FOR TESTING ---
  const handleCreateRandomDirtySlip = () => {
    // 1. Lọc ra các khoa phòng có tồn kho đồ vải trong hệ thống định mức (detailAllocations)
    const validDepts = departments.filter(dept => {
      return items.some(item => {
        const alloc = (detailAllocations[item.ma] || []).find(([d]) => d === dept);
        return alloc && alloc[1] > 0;
      });
    });

    const targetDept = validDepts.length > 0
      ? validDepts[Math.floor(Math.random() * validDepts.length)]
      : (departments[0] || "NICU");

    // 2. Lấy ra danh sách đồ vải thuộc tồn kho của khoa được chọn
    const deptItems = items.filter(item => {
      const alloc = (detailAllocations[item.ma] || []).find(([d]) => d === targetDept);
      return alloc && alloc[1] > 0;
    });

    if (deptItems.length === 0) {
      showToast('Không tìm thấy đồ vải trong tồn kho của khoa này!', 'error');
      return;
    }

    // 3. Chọn ngẫu nhiên một số mặt hàng từ tồn kho của khoa (từ 2 đến tối đa 6 món)
    const shuffled = [...deptItems].sort(() => Math.random() - 0.5);
    const count = Math.max(1, Math.min(Math.floor(Math.random() * 4) + 2, shuffled.length));
    const selectedItems = shuffled.slice(0, count);

    // 4. Lấy ngẫu nhiên số lượng đồ dơ trong giới hạn tồn kho hiện có
    const slipItems = selectedItems.map(item => {
      const allocTuple = (detailAllocations[item.ma] || []).find(([d]) => d === targetDept);
      const maxAlloc = allocTuple ? allocTuple[1] : 10;
      const randomQty = Math.max(1, Math.floor(Math.random() * maxAlloc) + 1);
      const isInfectious = Math.random() < 0.2; // 20% khả năng là đồ nhiễm khuẩn

      return {
        ma: item.ma,
        ten: item.ten,
        group: item.nhom,
        qty: randomQty,
        isInfectious: isInfectious,
        isVerifiedDirty: false,
        verifiedDirtyQty: randomQty,
        isLaundryReceived: false,
        laundryReceivedQty: randomQty,
        cleanReturnedQty: randomQty,
        isCleanReturnedVerified: false,
        isHospitalCleanVerified: false,
        hospitalCleanQty: randomQty
      };
    });

    // 5. Tạo mã phiếu ngẫu nhiên theo cấu trúc PGN-ddmmyyXX
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const datePrefix = `PGN-${dd}${mm}${yy}`;

    let maxSeq = 0;
    wardDeliverySlips.forEach(s => {
      if (s.id.startsWith(datePrefix)) {
        const seqStr = s.id.slice(datePrefix.length);
        const seqNum = parseInt(seqStr, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    });
    const nextSeq = String(maxSeq + 1).padStart(2, '0');
    const newSlipId = `${datePrefix}${nextSeq}`;

    const newSlip: WardDeliverySlip = {
      id: newSlipId,
      dept: targetDept,
      createdAt: new Date().toLocaleString('vi-VN'),
      createdBy: `Điều dưỡng ${targetDept}`,
      status: 'pending',
      items: slipItems
    };

    onUpdateWardDeliverySlips([newSlip, ...wardDeliverySlips]);
    setActiveSlipId(newSlip.id);
    showToast(`🎲 Đã tạo tự động phiếu dơ ngẫu nhiên #${newSlipId} của khoa [${targetDept}]!`, 'success');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setDraftAttachedImage(dataUrl);
        showToast('✓ Đã đính kèm hình ảnh thành công!', 'success');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleQuickTestImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(0, 0, 400, 300);
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 380, 280);
      ctx.fillStyle = '#92400E';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('👕 ĐỒ VẢI KHÁCH VIP', 60, 110);
      ctx.font = '16px monospace';
      ctx.fillText(`Khách: ${draftGuestName || 'Nguyễn Văn VIP'}`, 40, 160);
      ctx.fillText(`Phòng: ${draftGuestRoom || 'VIP 502'}`, 40, 190);
      ctx.fillText(`Thời gian: ${new Date().toLocaleTimeString('vi-VN')}`, 40, 220);
    }
    setDraftAttachedImage(canvas.toDataURL('image/jpeg', 0.8));
    showToast('🖼️ Đã chèn ảnh chụp mẫu thành công!', 'success');
  };

  // --- DRAFT SLIP METHODS ---
  const handleOpenCreateSlip = () => {
    localStorage.removeItem('linen_draft_slip_data');
    setCustomName('');
    setCustomQty(1);
    setCustomInfectious(false);
    setDraftIsRewash(false);

    const defaultDept = isHousekeepingUser
      ? 'Khách'
      : (currentWardName && currentWardName !== 'Tất cả' && currentWardName !== 'Kho trung tâm'
        ? currentWardName
        : deptsToUse[0]);

    setDraftAttachedImage(undefined);
    setDraftGuestName('');
    setDraftGuestRoom('');

    if (defaultDept.startsWith('Khách')) {
      const customRows = [
        { ma: `CUST-G1-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
        { ma: `CUST-G2-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
        { ma: `CUST-G3-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
      ];
      setDraftItems(customRows);
      setSelectedDept(defaultDept);
      setSlipCreator(currentAccount?.name || 'NV Buồng phòng');
      setIsCreatingSlip(true);
      return;
    }

    const initialStandards = items.filter(item => {
      const allocTuple = (detailAllocations[item.ma] || []).find(([d]) => d === defaultDept);
      return allocTuple && allocTuple[1] > 0;
    }).map(item => {
      const allocTuple = (detailAllocations[item.ma] || []).find(([d]) => d === defaultDept);
      const maxAlloc = allocTuple ? allocTuple[1] : 0;
      return {
        ma: item.ma,
        ten: item.ten,
        group: item.nhom,
        qty: 0,
        isInfectious: false,
        maxAlloc: maxAlloc
      };
    });

    let finalStandards = initialStandards;
    if (initialStandards.length === 0) {
      finalStandards = items.map(item => ({
        ma: item.ma,
        ten: item.ten,
        group: item.nhom,
        qty: 0,
        isInfectious: false,
        maxAlloc: 0
      }));
    }

    setDraftItems(finalStandards);
    setSelectedDept(defaultDept);
    setSlipCreator(currentAccount?.name || (checkPermission('linen') ? 'NV Kho đồ vải BV' : (isOrderlyUser ? `Hộ lý (${defaultDept})` : `Điều dưỡng (${defaultDept})`)));
    setIsCreatingSlip(true);
  };

  const handleDeptChange = (newDept: string) => {
    setSelectedDept(newDept);
    if (!checkPermission('linen') && !currentAccount?.isAdmin) {
      setSlipCreator(currentAccount?.name || (isOrderlyUser ? `Hộ lý (${newDept})` : (newDept.startsWith('Khách') ? 'NV Buồng phòng' : `Điều dưỡng (${newDept})`)));
    }
    
    if (newDept.startsWith('Khách')) {
      const customItems = draftItems.filter(i => i.isCustom);
      if (customItems.length === 0) {
        setDraftItems([
          { ma: `CUST-G1-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
          { ma: `CUST-G2-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
          { ma: `CUST-G3-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
        ]);
      } else {
        setDraftItems(customItems);
      }
      return;
    }

    const newStandards = items.filter(item => {
      const allocTuple = (detailAllocations[item.ma] || []).find(([d]) => d === newDept);
      return allocTuple && allocTuple[1] > 0;
    }).map(item => {
      const allocTuple = (detailAllocations[item.ma] || []).find(([d]) => d === newDept);
      const maxAlloc = allocTuple ? allocTuple[1] : 0;
      
      const existing = draftItems.find(i => i.ma === item.ma);
      return {
        ma: item.ma,
        ten: item.ten,
        group: item.nhom,
        qty: existing ? existing.qty : 0,
        isInfectious: existing ? existing.isInfectious : false,
        maxAlloc: maxAlloc
      };
    });

    let finalStandards = newStandards;
    if (newStandards.length === 0) {
      finalStandards = items.map(item => {
        const existing = draftItems.find(i => i.ma === item.ma);
        return {
          ma: item.ma,
          ten: item.ten,
          group: item.nhom,
          qty: existing ? existing.qty : 0,
          isInfectious: existing ? existing.isInfectious : false,
          maxAlloc: 0
        };
      });
    }

    setDraftItems(finalStandards);
  };

  const handleAddCustomDraftFromTable = () => {
    if (!customName.trim()) {
      showToast('⚠️ Vui lòng nhập tên đồ vải ngoài danh mục.', 'error');
      return;
    }
    const newCustom = {
      ma: `CUST-${Date.now()}`,
      ten: customName.trim(),
      group: "Đồ ngoài danh mục",
      qty: Math.max(1, customQty),
      isInfectious: customInfectious,
      isCustom: true
    };
    setDraftItems(prev => [...prev, newCustom]);
    setCustomName('');
    setCustomQty(1);
    setCustomInfectious(false);
    showToast(`✓ Đã thêm "${newCustom.ten}" vào phiếu dơ thành công!`, 'success');
  };

  const handleAddCustomDraft = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddCustomDraftFromTable();
  };

  const handleRemoveDraftItem = (ma: string) => {
    setDraftItems(prev => prev.filter(i => i.ma !== ma));
  };

  // Submit new dirty slip (B1)
  const handleSubmitSlip = () => {
    const filledItems = draftItems.filter(i => i.qty > 0 && (!i.isCustom || i.ten.trim().length > 0));
    if (filledItems.length === 0) {
      showToast('Vui lòng nhập số lượng > 0 cho ít nhất một mặt hàng (nếu là đồ tự đánh chữ vui lòng nhập tên).', 'error');
      return;
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const datePrefix = `PGN-${dd}${mm}${yy}`;

    let maxSeq = 0;
    wardDeliverySlips.forEach(s => {
      if (s.id.startsWith(datePrefix)) {
        const seqStr = s.id.slice(datePrefix.length);
        const seqNum = parseInt(seqStr, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    });
    const nextSeq = String(maxSeq + 1).padStart(2, '0');
    const newSlipId = `${datePrefix}${nextSeq}`;

    if (draftIsRewash) {
      const overStockItems: string[] = [];
      filledItems.forEach(item => {
        const availableClean = temporaryCleanStore[item.ma] || 0;
        if (item.qty > availableClean) {
          overStockItems.push(`${item.ten} (Yêu cầu giặt lại: ${item.qty}, Kho sạch hiện có: ${availableClean})`);
        }
      });
      if (overStockItems.length > 0) {
        showToast(`⚠️ Không đủ đồ sạch trong Kho Sạch Tạm để gửi giặt lại:\n${overStockItems.join('\n')}\nVui lòng giảm số lượng yêu cầu giặt lại!`, 'error');
        return;
      }
    }

    const newSlip: WardDeliverySlip = {
      id: newSlipId,
      dept: selectedDept,
      createdAt: new Date().toLocaleString('vi-VN'),
      createdBy: slipCreator,
      status: 'pending',
      isGuestSlip: selectedDept.startsWith('Khách'),
      isRewash: draftIsRewash,
      attachedImage: draftAttachedImage,
      guestName: draftGuestName.trim() || undefined,
      guestRoom: draftGuestRoom.trim() || undefined,
      items: filledItems.map(item => ({
        ...item,
        isVerifiedDirty: false,
        verifiedDirtyQty: item.qty,
        isLaundryReceived: false,
        laundryReceivedQty: item.qty,
        cleanReturnedQty: item.qty,
        isCleanReturnedVerified: false,
        isHospitalCleanVerified: false,
        hospitalCleanQty: item.qty
      }))
    };

    onUpdateWardDeliverySlips([newSlip, ...wardDeliverySlips]);
    setIsCreatingSlip(false);
    setActiveSlipId(newSlip.id);
    localStorage.removeItem('linen_draft_slip_data');
  };

  // --- CORE 3-SECTION HANDLERS ---

  // Section 1: Confirm dirty slip and move garments into Temporary Dirty Store
  const handleConfirmDirtyLinenM1 = (slipId: string) => {
    if (isConfirmingM1) return;

    const targetSlip = wardDeliverySlips.find(s => s.id === slipId);
    if (!targetSlip) return;

    if (targetSlip.status !== 'pending') {
      showToast('⚠️ Phiếu này đã được duyệt dơ rồi, không thể duyệt lại!', 'error');
      return;
    }

    // Check if ALL items have been ticked/checked
    const uncheckedItem = targetSlip.items.find(it => !m1CheckedItems[it.ma]);
    if (uncheckedItem) {
      showToast(`Vui lòng kiểm đếm và tích xác nhận cho mặt hàng: "${uncheckedItem.ten}"`, 'error');
      return;
    }

    setIsConfirmingM1(true);

    const isGuest = targetSlip.isGuestSlip || targetSlip.dept.startsWith('Khách');
    if (isGuest) {
      const guestBillId = `BILL-KHACH-${Date.now().toString().slice(-4)}`;
      const guestDispatch: LaundryDispatch = {
        id: guestBillId,
        createdAt: new Date().toLocaleString('vi-VN'),
        contractor: 'Công ty Giặt ủi Thành Đô (Bill Riêng Khách VIP)',
        driver: 'Nguyễn Văn Hùng (Chuyên chở đồ VIP)',
        plate: '29C-888.88',
        status: 'pending_laundry',
        linkedSlipIds: [slipId],
        isGuestBill: true,
        attachedImage: targetSlip.attachedImage,
        guestName: targetSlip.guestName,
        guestRoom: targetSlip.guestRoom,
        dept: targetSlip.dept,
        items: targetSlip.items.map(item => {
          const qty = m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty);
          return {
            ma: item.ma,
            ten: item.ten,
            group: item.group || 'Đồ ngoài danh mục',
            isCustom: item.isCustom || true,
            wardQty: qty,
            handoverQty: qty,
            isHandoverChecked: false,
            handoverNote: '',
            laundryReceivedQty: qty,
            isLaundryChecked: false,
            cleanReturnedQty: qty,
            isCleanChecked: false,
            cleanNote: ''
          };
        })
      };

      const updatedSlipsGuest = wardDeliverySlips.map(slip => {
        if (slip.id === slipId) {
          const updatedItems = slip.items.map(item => ({
            ...item,
            isVerifiedDirty: true,
            verifiedDirtyQty: m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty)
          }));
          return {
            ...slip,
            status: 'laundry_received' as const,
            laundryDispatchId: guestBillId,
            laundryReceivedBy: currentAccount?.name || 'Nhân viên đồ vải',
            laundryReceivedAt: new Date().toLocaleString('vi-VN'),
            items: updatedItems,
            confirmedBy: currentAccount?.name || 'Nhân viên đồ vải',
            confirmedAt: new Date().toLocaleString('vi-VN'),
            verifiedDirtyBy: currentAccount?.name || 'Nhân viên đồ vải',
            verifiedDirtyAt: new Date().toLocaleString('vi-VN')
          };
        }
        return slip;
      });

      if (onUpdateDeliveryStates) {
        onUpdateDeliveryStates({
          wardSlips: updatedSlipsGuest,
          laundryDispatches: [guestDispatch, ...laundryDispatches]
        });
      } else {
        if (onUpdateLaundryDispatches) {
          onUpdateLaundryDispatches([guestDispatch, ...laundryDispatches]);
        }
        if (onUpdateWardDeliverySlips) {
          onUpdateWardDeliverySlips(updatedSlipsGuest);
        }
      }
      setIsConfirmingM1(false);
      showToast(`🚀 Đã duyệt phiếu Khách và tự động tạo Bill Riêng (${guestBillId}) chuyển sang Xưởng giặt!`, 'success');
      return;
    }

    const updatedSlips = wardDeliverySlips.map(slip => {
      if (slip.id === slipId) {
        const updatedItems = slip.items.map(item => ({
          ...item,
          isVerifiedDirty: true,
          verifiedDirtyQty: m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty)
        }));
        return {
          ...slip,
          status: 'verified_dirty' as const,
          items: updatedItems,
          confirmedBy: currentAccount?.name || 'Nhân viên đồ vải',
          confirmedAt: new Date().toLocaleString('vi-VN'),
          verifiedDirtyBy: currentAccount?.name || 'Nhân viên đồ vải',
          verifiedDirtyAt: new Date().toLocaleString('vi-VN')
        };
      }
      return slip;
    });

    const nextDirtyStore = { ...temporaryDirtyStore };
    const nextCleanStore = { ...temporaryCleanStore };

    if (targetSlip.isRewash) {
      targetSlip.items.forEach(item => {
        const qty = m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty);
        nextCleanStore[item.ma] = Math.max(0, (nextCleanStore[item.ma] || 0) - qty);
        nextDirtyStore[item.ma] = (nextDirtyStore[item.ma] || 0) + qty;
      });
    } else {
      targetSlip.items.forEach(item => {
        const qty = m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty);
        nextDirtyStore[item.ma] = (nextDirtyStore[item.ma] || 0) + qty;
      });
    }

    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates({
        wardSlips: updatedSlips,
        temporaryDirtyStore: nextDirtyStore,
        temporaryCleanStore: nextCleanStore
      });
    } else {
      onUpdateWardDeliverySlips(updatedSlips);
      if (onUpdateTemporaryDirtyStore) {
        onUpdateTemporaryDirtyStore(nextDirtyStore);
      }
      if (onUpdateTemporaryCleanStore) {
        onUpdateTemporaryCleanStore(nextCleanStore);
      }
    }
    
    setIsConfirmingM1(false);
    if (targetSlip.isRewash) {
      showToast(`🔄 Đã duyệt phiếu Giặt Lại ${slipId}! Đã trừ Kho Sạch và chuyển đồ dơ vào "Kho đồ dơ" để giặt lại.`, 'success');
    } else {
      showToast(`✓ Đã xác nhận phiếu dơ ${slipId}! Đồ dơ đã đi vào "Kho đồ dơ" bệnh viện.`, 'success');
    }
  };

  const handleCreateGuestBillRiêng = (targetSlip: WardDeliverySlip) => {
    const guestBillId = `BILL-KHACH-${Date.now().toString().slice(-4)}`;
    const guestDispatch: LaundryDispatch = {
      id: guestBillId,
      createdAt: new Date().toLocaleString('vi-VN'),
      contractor: 'Công ty Giặt ủi Thành Đô (Bill Riêng Khách VIP)',
      driver: 'Nguyễn Văn Hùng (Chuyên chở đồ VIP)',
      plate: '29C-888.88',
      status: 'pending_laundry',
      linkedSlipIds: [targetSlip.id],
      isGuestBill: true,
      attachedImage: targetSlip.attachedImage,
      guestName: targetSlip.guestName,
      guestRoom: targetSlip.guestRoom,
      dept: targetSlip.dept,
      items: targetSlip.items.map(item => ({
        ma: item.ma,
        ten: item.ten,
        group: item.group || 'Đồ ngoài danh mục',
        isCustom: item.isCustom || true,
        wardQty: item.verifiedDirtyQty ?? item.qty,
        handoverQty: item.verifiedDirtyQty ?? item.qty,
        isHandoverChecked: false,
        handoverNote: '',
        laundryReceivedQty: item.verifiedDirtyQty ?? item.qty,
        isLaundryChecked: false,
        cleanReturnedQty: item.verifiedDirtyQty ?? item.qty,
        isCleanChecked: false,
        cleanNote: ''
      }))
    };

    const updatedSlipsGuest = wardDeliverySlips.map(slip => {
      if (slip.id === targetSlip.id) {
        return {
          ...slip,
          status: 'laundry_received' as const,
          laundryDispatchId: guestBillId,
          laundryReceivedBy: currentAccount?.name || 'Nhân viên đồ vải',
          laundryReceivedAt: new Date().toLocaleString('vi-VN')
        };
      }
      return slip;
    });

    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates({
        wardSlips: updatedSlipsGuest,
        laundryDispatches: [guestDispatch, ...laundryDispatches]
      });
    } else {
      if (onUpdateLaundryDispatches) {
        onUpdateLaundryDispatches([guestDispatch, ...laundryDispatches]);
      }
      if (onUpdateWardDeliverySlips) {
        onUpdateWardDeliverySlips(updatedSlipsGuest);
      }
    }
    showToast(`🚀 Đã tạo Bill Riêng (${guestBillId}) cho phiếu Khách ${targetSlip.id}!`, 'success');
  };

  // Section 2 Helper: Automatically sum and aggregate all slips from wards confirmed today
  const handleConsolidateAllTodaySlips = () => {
    const todaySlips = wardDeliverySlips.filter(s => s.status === 'verified_dirty');
    if (todaySlips.length === 0) {
      showToast('Không có phiếu khoa phòng nào đã duyệt dơ đang chờ bàn giao xe tải!', 'error');
      return;
    }

    const itemMap: Record<string, { ma: string; ten: string; group: string; isCustom?: boolean; wardQty: number; handoverQty: number }> = {};
    todaySlips.forEach(slip => {
      slip.items.forEach(item => {
        if (!itemMap[item.ma]) {
          itemMap[item.ma] = {
            ma: item.ma,
            ten: item.ten,
            group: item.group,
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

    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates({
        laundryDispatches: [newDispatch, ...laundryDispatches],
        wardSlips: updatedSlips
      });
    } else {
      if (onUpdateLaundryDispatches) {
        onUpdateLaundryDispatches([newDispatch, ...laundryDispatches]);
      }
      onUpdateWardDeliverySlips(updatedSlips);
    }
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

  // Section 2: Create dispatch to company directly from Hospital Temporary Dirty Store
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

    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates({
        laundryDispatches: [newDispatch, ...laundryDispatches],
        wardSlips: updatedSlips
      });
    } else {
      if (onUpdateLaundryDispatches) {
        onUpdateLaundryDispatches([newDispatch, ...laundryDispatches]);
      }
      onUpdateWardDeliverySlips(updatedSlips);
    }
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

  // Section 2: Hospital linen staff verifies quantities 2nd time, edits discrepancies & reasons
  const handleVerifyM2Handover = (dispatchId: string, editQtys?: Record<string, number>, editNotes?: Record<string, string>) => {
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

    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates({
        laundryDispatches: updatedDispatches,
        temporaryDirtyStore: nextDirtyStore,
        temporaryCompanyDirtyStore: nextCompanyDirtyStore
      });
    } else {
      if (onUpdateLaundryDispatches) {
        onUpdateLaundryDispatches(updatedDispatches);
      }
      if (onUpdateTemporaryDirtyStore) {
        onUpdateTemporaryDirtyStore(nextDirtyStore);
      }
      if (onUpdateTemporaryCompanyDirtyStore) {
        onUpdateTemporaryCompanyDirtyStore(nextCompanyDirtyStore);
      }
    }

    // Prepare clean return inputs
    const initCleanQtys: Record<string, number> = {};
    updatedItems.forEach(it => {
      initCleanQtys[it.ma] = it.handoverQty;
    });
    setM2ItemCleanQtys(initCleanQtys);

    showToast(`✓ Đã xác nhận bàn giao cho xưởng xe tải, trừ Kho dơ BV & cộng vào Kho dơ Cty.`, 'success');
  };

  // Section 2 - Step 1: Laundry company creates clean return bill, submits for hospital staff verification
  const handleCompanySubmitM2Return = (dispatchId: string, returnCleanQtys?: Record<string, number>) => {
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
        hospitalReceivedQty: cleanQty, // Mặc định NV BV kiểm nhận bằng số lượng Cty khai báo
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
          cleanReturnedBy: currentAccount?.name || 'Xưởng giặt Cty'
        };
      }
      return d;
    });

    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates({
        laundryDispatches: nextDispatches
      });
    } else {
      if (onUpdateLaundryDispatches) {
        onUpdateLaundryDispatches(nextDispatches);
      }
    }

    // Initialize hospital verification quantities
    const initHospVerify: Record<string, number> = {};
    updatedItems.forEach(it => {
      initHospVerify[it.ma] = it.cleanReturnedQty;
    });
    setM2ItemHospitalVerifyQtys(initHospVerify);

    showToast(`🚚 Cty đã lập bill trả sạch (Báo trả: ${updatedItems.reduce((s, i) => s + i.cleanReturnedQty, 0)} cái${totalDebt > 0 ? `, Nợ: ${totalDebt} cái` : ''})! Vui lòng chờ Nhân viên đồ vải Bệnh Viện kiểm đếm & xác nhận đủ bill.`, 'info');
  };

  // Section 2 - Step 2: Hospital linen staff verifies clean return and completes bill (auto debt split & stock update)
  const handleHospitalVerifyM2Return = (dispatchId: string, hospitalVerifyQtys?: Record<string, number>) => {
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

    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates({
        wardSlips: updatedSlips,
        laundryDispatches: nextDispatches,
        temporaryCleanStore: nextCleanStore,
        temporaryCompanyDirtyStore: nextCompanyDirtyStore
      });
    } else {
      onUpdateWardDeliverySlips(updatedSlips);
      if (onUpdateLaundryDispatches) {
        onUpdateLaundryDispatches(nextDispatches);
      }
      onUpdateTemporaryCleanStore(nextCleanStore);
      if (onUpdateTemporaryCompanyDirtyStore) {
        onUpdateTemporaryCompanyDirtyStore(nextCompanyDirtyStore);
      }
    }
    setActiveDispatchId(null);

    showToast(`✓ NV Bệnh viện đã xác nhận đủ bill trả sạch! ${hasDebt ? `Phát hiện nợ ${debtItems.length} mặt hàng, đã tự động tách 1 Bill Nợ: ${nextDispatches[0].id}!` : 'Bill trả đủ 100% không nợ.'} Đồ sạch đã nhập vào Kho Sạch Tạm.`, 'success');
  };

  // Section 3: Return clean to department with auto ward-debt splitting, deduct from Kho sạch
  const handleReturnCleanM3 = (slipId: string, itemCleanQtys?: Record<string, number>, receiverName?: string) => {
    const slip = wardDeliverySlips.find(s => s.id === slipId);
    if (!slip) return;

    let totalActualCleanReturned = 0;
    const cappedItemsInfo: string[] = [];
    const debtItems: Array<any> = [];
    const updatedItems = slip.items.map(item => {
      let cleanQty = item.verifiedDirtyQty ?? item.qty;
      if (itemCleanQtys && itemCleanQtys[item.ma] !== undefined) {
        cleanQty = itemCleanQtys[item.ma];
      } else if (m3ItemCleanReturnQtys[item.ma] !== undefined) {
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
          status: 'completed' as const,
          hospitalCleanBy: currentAccount?.name || 'Nhân viên Đồ sạch',
          hospitalCleanAt: new Date().toLocaleString('vi-VN'),
          receiver: receiverName || m3ReceiverName || `Điều dưỡng ${s.dept}`
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

    if (cappedItemsInfo.length > 0) {
      showToast(`ℹ️ Đã tự động điều chỉnh số lượng thực trả do tồn kho sạch không đủ:\n${cappedItemsInfo.join('\n')}\nPhần thiếu hụt đã được tự động tách thành Phiếu Nợ Khoa Phòng!`, 'info');
    } else {
      showToast('✓ Đã xác nhận trả sạch và cập nhật kho thành công!', 'success');
    }

    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates({
        wardSlips: nextSlips,
        temporaryCleanStore: nextCleanStore
      });
    } else {
      onUpdateWardDeliverySlips(nextSlips);
      onUpdateTemporaryCleanStore(nextCleanStore);
    }
    setSelectedM1SlipIdForCleanReturn(null);

    showToast(`✓ Hoàn tất trả sạch cho Khoa ${slip.dept}! ${hasDebt ? `Đã nợ lại ${debtItems.length} mặt hàng và tự tách 1 Phiếu Nợ Khoa: ${nextSlips[0].id}!` : ''} Đồ sạch đã trừ khỏi Kho Sạch Tạm.`, 'success');
  };

  // --- DATA FILTERING & STATS ---
  const activeSlip = useMemo(() => {
    return wardDeliverySlips.find(s => s.id === activeSlipId) || null;
  }, [wardDeliverySlips, activeSlipId]);

  const activeDispatch = useMemo(() => {
    return laundryDispatches.find(d => d.id === activeDispatchId) || null;
  }, [laundryDispatches, activeDispatchId]);

  // Helper to format dates for robust searching by day/month/year across all sections
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

  const filteredSlips = useMemo(() => {
    return wardDeliverySlips.filter(slip => {
      // Exclude debt slips from Section 1 (Bàn giao đồ dơ) to avoid incorrect counts
      if (slip.id.startsWith('NỢ-')) return false;
      if ((effectiveIsWardUser && !isOrderlyUser) && slip.dept !== currentWardName) return false;

      const dateStrings = [
        getAllDateRepresentations(slip.createdAt),
        getAllDateRepresentations(slip.verifiedDirtyAt),
        getAllDateRepresentations(slip.laundryReceivedAt),
        getAllDateRepresentations(slip.laundryReturnedAt),
        getAllDateRepresentations(slip.hospitalCleanAt),
        getAllDateRepresentations(slip.confirmedAt),
      ].join(' ');

      const queryLower = searchQuery.toLowerCase().trim();
      const matchesDept = filterDept === 'Tất cả' || slip.dept === filterDept;

      if (!queryLower) {
        return matchesDept;
      }

      const cleanQuery = queryLower.replace(/[\/\-\s]/g, '');
      const cleanId = slip.id.toLowerCase().replace(/[\/\-\s]/g, '');

      const matchesSearch = slip.id.toLowerCase().includes(queryLower) || 
                            (cleanQuery.length >= 4 && cleanId.includes(cleanQuery)) ||
                            slip.dept.toLowerCase().includes(queryLower) ||
                            dateStrings.includes(queryLower) ||
                            (cleanQuery.length >= 4 && dateStrings.replace(/[\/\-\s]/g, '').includes(cleanQuery));

      return matchesSearch && matchesDept;
    });
  }, [wardDeliverySlips, searchQuery, filterDept, effectiveIsWardUser, currentWardName, isOrderlyUser]);

  const filteredM2Dispatches = useMemo(() => {
    return (laundryDispatches || []).filter(dispatch => {
      const dateStrings = [
        getAllDateRepresentations(dispatch.createdAt),
        getAllDateRepresentations(dispatch.laundryReceivedAt),
        getAllDateRepresentations(dispatch.cleanReturnedAt),
        getAllDateRepresentations(dispatch.hospitalVerifiedAt),
      ].join(' ');

      if (m2SearchQuery) {
        const queryLower = m2SearchQuery.toLowerCase().trim();
        const cleanQuery = queryLower.replace(/[\/\-\s]/g, '');
        const cleanId = dispatch.id.toLowerCase().replace(/[\/\-\s]/g, '');

        const matchesSearch = dispatch.id.toLowerCase().includes(queryLower) ||
                              (cleanQuery.length >= 4 && cleanId.includes(cleanQuery)) ||
                              dateStrings.includes(queryLower) ||
                              (cleanQuery.length >= 4 && dateStrings.replace(/[\/\-\s]/g, '').includes(cleanQuery));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [laundryDispatches, m2SearchQuery]);

  const filteredM3Slips = useMemo(() => {
    return wardDeliverySlips.filter(s => {
      // By default, only show pending slips (not completed) when no search query is active.
      // But if a query is active, show completed slips matching that search as well!
      if (s.status === 'completed' && !m3SearchQuery) return false;

      if ((effectiveIsWardUser && !isOrderlyUser) && s.dept !== currentWardName) return false;
      if (m3FilterDept !== 'Tất cả' && s.dept !== m3FilterDept) return false;

      const dateStrings = [
        getAllDateRepresentations(s.createdAt),
        getAllDateRepresentations(s.verifiedDirtyAt),
        getAllDateRepresentations(s.laundryReceivedAt),
        getAllDateRepresentations(s.laundryReturnedAt),
        getAllDateRepresentations(s.hospitalCleanAt),
        getAllDateRepresentations(s.confirmedAt),
      ].join(' ');

      if (m3SearchQuery) {
        const queryLower = m3SearchQuery.toLowerCase().trim();
        const cleanQuery = queryLower.replace(/[\/\-\s]/g, '');
        const cleanId = s.id.toLowerCase().replace(/[\/\-\s]/g, '');
        const matchesSearch = s.id.toLowerCase().includes(queryLower) ||
                              (cleanQuery.length >= 4 && cleanId.includes(cleanQuery)) ||
                              s.dept.toLowerCase().includes(queryLower) ||
                              dateStrings.includes(queryLower) ||
                              (cleanQuery.length >= 4 && dateStrings.replace(/[\/\-\s]/g, '').includes(cleanQuery));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [wardDeliverySlips, effectiveIsWardUser, isOrderlyUser, currentWardName, m3FilterDept, m3SearchQuery]);

  // Total sums of temporary stores
  const totalDirtyStoreSum = useMemo(() => {
    return Object.values(temporaryDirtyStore).reduce((a, b) => a + b, 0);
  }, [temporaryDirtyStore]);

  const totalCompanyDirtyStoreSum = useMemo(() => {
    return Object.values(temporaryCompanyDirtyStore || {}).reduce((a, b) => a + b, 0);
  }, [temporaryCompanyDirtyStore]);

  const totalCleanStoreSum = useMemo(() => {
    return Object.values(temporaryCleanStore).reduce((a, b) => a + b, 0);
  }, [temporaryCleanStore]);

  return (
    <div className="space-y-6">
      
      {/* Toast Alert Popup */}
      {toast && (
        <div className="fixed bottom-2 right-2 z-[9999] max-w-sm bg-stone-900 text-stone-100 rounded-lg shadow-2xl p-2.5 flex items-center gap-2.5 border border-stone-800 animate-slide-up transition-all duration-300">
          <div className={`p-1.5 rounded-md shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 
            toast.type === 'error' ? 'bg-rose-500/20 text-rose-400' : 
            'bg-amber-500/20 text-amber-400'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div className="flex-1 pr-1">
            <p className="text-[8px] font-black uppercase tracking-widest text-stone-400 mb-0.5">Hệ thống thông báo</p>
            <p className="text-[11px] font-bold leading-normal">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 p-0.5 rounded transition-colors shrink-0"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}



      {/* ======================= MỤC 1 PANEL ======================= */}
      {activeMuc === 1 && effectiveIsLaundryUser && (
        <div className="bg-purple-50 border border-purple-300 text-purple-900 p-8 rounded-xl text-center shadow-sm max-w-xl mx-auto my-8">
          <AlertCircle className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <p className="font-bold text-lg mb-1">Không thuộc phạm vi quyền hạn Xưởng giặt Công ty</p>
          <p className="text-sm text-stone-600 mb-4">
            Tài khoản công ty giặt chỉ được phép truy cập và thao tác tại <strong>Mục 2 (Giao nhận đồ vải sạch công ty)</strong>. Các Mục 1 và Mục 3 không thuộc phạm vi làm việc của xưởng giặt.
          </p>
          <button
            onClick={() => setActiveMuc(2)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md"
          >
            👉 Chuyển sang Mục 2 (Giao nhận đồ vải sạch công ty)
          </button>
        </div>
      )}
      {activeMuc === 1 && !effectiveIsLaundryUser && (
        <div className="space-y-4">
          {/* Bảng Kho dơ hiển thị trong Line 1 */}
          {!isOrderlyUser && (
            <div className="border border-amber-300 bg-amber-50/45 rounded-xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
                    {m1SubTab === 'dirty-ward' ? (
                      <span>📦 Kho đồ dơ Bệnh viện (Nhận từ khoa lâm sàng)</span>
                    ) : (
                      <span>📦 Kho đồ dơ Công ty (Đã bàn giao xưởng giặt)</span>
                    )}
                  </span>
                  <span className="font-mono text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded">
                    {m1SubTab === 'dirty-ward' ? (
                      <span>Tổng dơ BV: {totalDirtyStoreSum} cái</span>
                    ) : (
                      <span>Tổng dơ Cty: {totalCompanyDirtyStoreSum} cái</span>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {m1SubTab === 'dirty-ward' && (checkPermission('linen') || currentAccount?.isAdmin) && (
                    <button
                      onClick={handleOpenAdjustDirtyStore}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Điều chỉnh số lượng đồ dơ tại Kho dơ tạm (do hao hụt, mất mát, đếm lệch)"
                    >
                      <Settings size={14} />
                      ⚙️ Cân chỉnh tồn dơ
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs max-h-[140px] overflow-y-auto">
                {m1SubTab === 'dirty-ward' ? (
                  Object.keys(temporaryDirtyStore).filter(ma => (temporaryDirtyStore[ma] || 0) > 0).length > 0 ? (
                    Object.keys(temporaryDirtyStore).map(ma => {
                      const item = items.find(i => i.ma === ma);
                      if (!temporaryDirtyStore[ma]) return null;
                      return (
                        <div key={ma} className="bg-white border border-amber-200 px-2.5 py-1.5 rounded-lg font-medium flex justify-between items-center shadow-2xs">
                          <span className="truncate text-stone-700 font-bold text-[11px]">{item?.ten || ma}</span>
                          <span className="font-mono font-black text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded text-[10px] ml-1 shrink-0">
                            {temporaryDirtyStore[ma]} cái
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-stone-400 text-[11px] col-span-4 italic">Trống - Chờ duyệt phiếu dơ từ Khoa lâm sàng để vào kho.</span>
                  )
                ) : (
                  Object.keys(temporaryCompanyDirtyStore || {}).filter(ma => ((temporaryCompanyDirtyStore || {})[ma] || 0) > 0).length > 0 ? (
                    Object.keys(temporaryCompanyDirtyStore || {}).map(ma => {
                      const item = items.find(i => i.ma === ma);
                      const qty = (temporaryCompanyDirtyStore || {})[ma] || 0;
                      if (!qty) return null;
                      return (
                        <div key={ma} className="bg-white border border-amber-200 px-2.5 py-1.5 rounded-lg font-medium flex justify-between items-center shadow-2xs">
                          <span className="truncate text-stone-700 font-bold text-[11px]">{item?.ten || ma}</span>
                          <span className="font-mono font-black text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded text-[10px] ml-1 shrink-0">
                            {qty} cái
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-stone-400 text-[11px] col-span-4 italic">Trống - Chưa có đồ dơ bàn giao cho xưởng giặt Công ty.</span>
                  )
                )}
              </div>
            </div>
          )}

          {/* 2 Tabs requested by user */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            <div className="lg:col-span-5">
              <div className="bg-stone-100/90 p-1.5 rounded-2xl flex gap-1.5 w-full max-w-md border border-stone-200/50">
                <button
                  onClick={() => {
                    setM1SubTab('dirty-ward');
                    setActiveSlipId(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    m1SubTab === 'dirty-ward'
                      ? 'bg-white text-blue-700 shadow-sm border border-blue-200/50 font-black'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white/40 font-bold'
                  }`}
                >
                  <FileText size={14} className={m1SubTab === 'dirty-ward' ? 'text-blue-600' : 'text-stone-400'} />
                  Giao đồ vải dơ (Khoa ➔ Kho)
                </button>
                {(checkPermission('linen') || checkPermission('clean')) && (
                  <button
                    onClick={() => {
                      setM1SubTab('dirty-company');
                      setActiveDispatchId(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      m1SubTab === 'dirty-company'
                        ? 'bg-white text-amber-700 shadow-sm border border-amber-200/50 font-black'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/40 font-bold'
                    }`}
                  >
                    <Truck size={14} className={m1SubTab === 'dirty-company' ? 'text-amber-600' : 'text-stone-400'} />
                    Giao đồ vải dơ với công ty
                  </button>
                )}
              </div>
            </div>
          </div>

          {m1SubTab === 'dirty-ward' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Slips List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <h3 className="text-sm font-bold text-stone-800 uppercase">Danh sách phiếu giao dơ</h3>
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-start sm:justify-end">
                  <button
                    onClick={() => setCleanupPendingType('all')}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-[10px] font-black uppercase rounded-lg shadow flex items-center gap-1 transition-all cursor-pointer border border-rose-500/20"
                    title="Reset sạch toàn bộ hệ thống ngay lập tức"
                  >
                    🔥 Reset Hệ Thống
                  </button>
                  <button
                    onClick={handleCreateRandomDirtySlip}
                    className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold uppercase rounded-lg shadow flex items-center gap-1 transition-all"
                    title="Tạo tự động 1 phiếu dơ ngẫu nhiên của khoa phòng bất kì từ tồn kho"
                  >
                    <Sparkles size={12} />
                    Tạo phiếu dơ mới random
                  </button>
                  {checkPermission('ward') && (
                    <button
                      onClick={handleOpenCreateSlip}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase rounded-lg shadow flex items-center gap-1"
                    >
                      <PlusCircle size={12} />
                      Tạo phiếu dơ mới
                    </button>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 flex-1 shadow-2xs">
                  <Search size={14} className="text-stone-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Tìm mã phiếu, ngày (VD: 07/07/2026), khoa..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-stone-800 focus:outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-stone-400 hover:text-stone-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {(!effectiveIsWardUser || isOrderlyUser) && (
                  <select
                    value={filterDept}
                    onChange={e => setFilterDept(e.target.value)}
                    className="bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-full sm:max-w-[150px]"
                  >
                    <option value="Tất cả">Tất cả khoa</option>
                    {deptsToUse.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Slips mapping */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredSlips.map(slip => {
                  const isPending = slip.status === 'pending';
                  const isVerified = slip.status === 'verified_dirty';
                  return (
                    <div
                      key={slip.id}
                      onClick={() => setActiveSlipId(slip.id)}
                      className={`p-3 border rounded-xl cursor-pointer transition-all ${
                        activeSlipId === slip.id 
                          ? 'bg-blue-50/70 border-blue-500 shadow-sm' 
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-black text-stone-900">{slip.id}</span>
                            {slip.isRewash && (
                              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-bold px-1 rounded-sm uppercase tracking-wide">
                                🔄 Giặt lại
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-500 block">{slip.dept} • {slip.createdAt}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
                          isPending ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isPending ? 'Chờ duyệt' : 'Đã duyệt'}
                        </span>
                      </div>
                      <div className="mt-2.5 flex justify-between items-center border-t border-stone-100 pt-2">
                        <span className="text-[10px] text-stone-600 font-medium">
                          Khai báo: {slip.items.reduce((s, i) => s + i.qty, 0)} cái đồ vải
                        </span>
                        {isPending && (checkPermission('ward') || checkPermission('linen')) && (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setActiveSlipId(slip.id);
                                handleStartEditSlip(slip);
                              }}
                              className="px-1.5 py-0.5 text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded transition-all"
                              title="Sửa nhanh phiếu"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              onClick={() => handleDeletePendingSlip(slip.id)}
                              className="px-1.5 py-0.5 text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded transition-all"
                              title="Xóa nhanh phiếu"
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredSlips.length === 0 && (
                  <div className="text-center py-8 text-xs text-stone-400">Không tìm thấy phiếu nào.</div>
                )}
              </div>
            </div>
          </div>

          {/* Slip Workspace */}
          <div className="lg:col-span-7">
            {activeSlip ? (
              editingSlipId === activeSlip.id ? (
                /* EDITING MODE FOR PENDING SLIP */
                <div className="border-2 border-indigo-500 bg-white rounded-xl shadow-lg p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
                  <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                    <div>
                      <h2 className="text-sm font-bold text-indigo-950 uppercase flex items-center gap-1.5">
                        ✏️ ĐANG CHỈNH SỬA PHIẾU {activeSlip.id}
                      </h2>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">Chế độ sửa (Khoa phòng)</span>
                    </div>
                    <button onClick={handleCancelEditSlip} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-stone-50 p-3 rounded-lg border border-stone-200">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-stone-500 mb-1">Khoa phòng</label>
                      <select
                        value={editDept}
                        onChange={e => setEditDept(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {deptsToUse.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-stone-500 mb-1">Người tạo phiếu</label>
                      <input
                        type="text"
                        value={editCreator}
                        onChange={e => setEditCreator(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Edit quantities */}
                  <div className="space-y-2">
                    <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500">Danh sách đồ vải bàn giao</span>
                    <div className="border border-stone-200 rounded-lg overflow-x-auto bg-stone-50">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                            <th className="p-2">Tên đồ vải / Mã</th>
                            <th className="p-2 text-center w-24">Lây nhiễm</th>
                            <th className="p-2 text-right w-36">Khai báo số lượng</th>
                            <th className="p-2 text-center w-12">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 bg-white">
                          {editItemsList.map(item => {
                            return (
                              <tr key={item.ma} className="hover:bg-stone-50 transition-colors">
                                <td className="p-2">
                                  <div className="flex items-center gap-1.5">
                                    {item.isCustom ? (
                                      <input
                                        type="text"
                                        placeholder="✏️ Tự đánh chữ tên đồ vải..."
                                        value={item.ten}
                                        onChange={e => handleUpdateEditItemTenDirect(item.ma, e.target.value)}
                                        className="w-full bg-amber-50 border border-amber-300 rounded p-1 text-xs font-bold text-stone-900 focus:outline-none focus:bg-white"
                                      />
                                    ) : (
                                      <span className="font-bold text-stone-800 block">{item.ten}</span>
                                    )}
                                    {item.isInfectious && (
                                      <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                        ⚠️ Lây nhiễm
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-stone-400 font-mono block">{item.ma}</span>
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={item.isInfectious}
                                    onChange={() => handleToggleEditItemInfectiousDirect(item.ma)}
                                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <input
                                      type="number"
                                      className="w-20 h-8 border border-stone-300 rounded-md text-center text-xs font-mono font-black text-stone-950 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      value={item.qty}
                                      onChange={e => {
                                        const v = Math.max(0, parseInt(e.target.value) || 0);
                                        handleUpdateEditItemQtyDirect(item.ma, v);
                                      }}
                                    />
                                    <span className="text-[10px] text-stone-400 font-bold">cái</span>
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemFromEditList(item.ma)}
                                    className="text-stone-400 hover:text-red-600 p-1"
                                    title="Xóa đồ vải này khỏi phiếu"
                                  >
                                    <X size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Inline Form to Add New Linen Item while editing */}
                  <div className="bg-indigo-50/50 border border-indigo-150 p-3 rounded-xl space-y-2.5">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1">
                      ➕ Thêm đồ vải mới vào phiếu dơ:
                    </span>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[9px] font-bold text-stone-500 mb-0.5">Chọn loại đồ vải</label>
                        <select
                          value={editAddLinenMa}
                          onChange={e => setEditAddLinenMa(e.target.value)}
                          className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">-- Chọn đồ vải --</option>
                          {items.map(it => (
                            <option key={it.ma} value={it.ma}>
                              {it.ten} ({it.ma})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-[9px] font-bold text-stone-500 mb-0.5">Số lượng</label>
                        <input
                          type="number"
                          min="1"
                          value={editAddLinenQty}
                          onChange={e => setEditAddLinenQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 h-9">
                        <input
                          type="checkbox"
                          id="editAddLinenInfectious"
                          checked={editAddLinenInfectious}
                          onChange={e => setEditAddLinenInfectious(e.target.checked)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                        />
                        <label htmlFor="editAddLinenInfectious" className="text-xs font-bold text-red-700 cursor-pointer select-none">Đồ lây nhiễm ⚠️</label>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItemToEditList}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-lg shadow-sm transition-all whitespace-nowrap"
                      >
                        Thêm vào list
                      </button>
                      {(activeSlip.isGuestSlip || activeSlip.dept.startsWith('Khách')) && (
                        <button
                          type="button"
                          onClick={handleAddCustomToEditList}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase rounded-lg shadow-sm transition-all whitespace-nowrap flex items-center gap-1"
                        >
                          ➕ Thêm dòng tự đánh chữ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-stone-150">
                    <button
                      onClick={handleCancelEditSlip}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-stone-700 text-xs font-bold uppercase transition-all"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleSaveEditSlip}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-lg shadow-md transition-all"
                    >
                      Lưu thay đổi 💾
                    </button>
                  </div>
                </div>
              ) : (
                /* NORMAL VIEW MODE */
                <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-5 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-stone-900 uppercase">Chi tiết phiếu {activeSlip.id}</h2>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
                          activeSlip.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {activeSlip.status === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'}
                        </span>
                        {activeSlip.status === 'pending' && (checkPermission('ward') || checkPermission('linen')) && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEditSlip(activeSlip)}
                              className="px-2 py-0.5 text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded transition-all flex items-center gap-0.5"
                              title="Sửa phiếu"
                            >
                              ✏️ Sửa phiếu
                            </button>
                            <button
                              onClick={() => handleDeletePendingSlip(activeSlip.id)}
                              className="px-2 py-0.5 text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded transition-all flex items-center gap-0.5"
                              title="Xóa phiếu"
                            >
                              🗑️ Xóa phiếu
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-stone-500">Người lập: {activeSlip.createdBy} • Khoa {activeSlip.dept}</span>
                    </div>
                    <button onClick={() => setActiveSlipId(null)} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
                  </div>

                  {(activeSlip.isGuestSlip || activeSlip.dept.startsWith('Khách') || activeSlip.attachedImage) && (
                    <div className="p-4 bg-amber-50/80 border-2 border-amber-400 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                          🛏️ PHIẾU ĐỒ VẢI KHÁCH VIP (NV BUỒNG PHÒNG)
                        </span>
                        {(activeSlip.guestName || activeSlip.guestRoom) && (
                          <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-lg border border-amber-300">
                            {activeSlip.guestRoom ? `Phòng: ${activeSlip.guestRoom}` : ''} {activeSlip.guestName ? `• Khách: ${activeSlip.guestName}` : ''}
                          </span>
                        )}
                      </div>
                      {activeSlip.attachedImage && (
                        <div className="mt-2 bg-white p-2 rounded-lg border border-amber-300 inline-block shadow-sm">
                          <img src={activeSlip.attachedImage} alt="Đồ vải khách" className="max-h-48 object-contain rounded border border-stone-200" />
                          <p className="text-[10px] text-stone-500 font-mono mt-1 text-center">✓ Ảnh chụp đi kèm Bill Riêng Khách</p>
                        </div>
                      )}
                      {activeSlip.status === 'verified_dirty' && !activeSlip.laundryDispatchId && checkPermission('linen') && (
                        <div className="pt-2 border-t border-amber-200">
                          <button
                            onClick={() => handleCreateGuestBillRiêng(activeSlip)}
                            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                          >
                            🚀 TẠO BILL RIÊNG GIAO CTY GIẶT (ĐỒ KHÁCH)
                          </button>
                          <p className="text-[10px] text-amber-800 text-center mt-1">
                            * Đồ khách VIP được tách thành Bill riêng với ảnh chụp đính kèm, không gộp chung vào Kho Dơ Tổng.
                          </p>
                        </div>
                      )}
                      {activeSlip.laundryDispatchId && (
                        <div className="text-xs font-bold text-emerald-800 bg-emerald-100/80 p-2 rounded-lg border border-emerald-300">
                          ✓ Đã tạo Bill Riêng: <span className="font-mono">{activeSlip.laundryDispatchId}</span> (Đang chuyển xưởng giặt)
                        </div>
                      )}
                    </div>
                  )}

                  {activeSlip.isRewash && (
                    <div className="p-4 bg-indigo-50/80 border-2 border-indigo-400 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-900 uppercase flex items-center gap-1.5">
                          🔄 PHIẾU GỬI GIẶT LẠI (REWASH)
                        </span>
                        <span className="text-[10px] font-bold text-indigo-900 bg-indigo-200/80 px-2.5 py-0.5 rounded-lg border border-indigo-300">
                          Hao hụt Kho Sạch • Chuyển vào Kho Dơ
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-800 leading-normal">
                        Phiếu này ghi nhận đồ sạch mới từ xưởng về bị dính bẩn hoặc ố vàng cần gửi giặt lại. 
                        Khi duyệt phiếu này (M1), hệ thống sẽ <strong>tự động trừ Kho Sạch Tạm</strong> của bệnh viện, đồng thời <strong>cộng vào Kho Dơ Tạm</strong> để gom gửi lại xưởng giặt.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500">Danh mục kiểm dơ</span>
                    <div className="border border-stone-200 rounded-lg overflow-x-auto bg-stone-50">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                            <th className="p-2 text-center w-12">Tick nhận</th>
                            <th className="p-2">Tên đồ vải</th>
                            <th className="p-2 text-right">Khai báo (Khoa)</th>
                            <th className="p-2 text-right">Duyệt thực tế (BV)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 bg-white">
                          {activeSlip.items.map(item => {
                            const isChecked = !!m1CheckedItems[item.ma];
                            const verifiedQty = m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty);
                            return (
                              <tr key={item.ma} className={`hover:bg-stone-50 transition-colors ${isChecked ? 'bg-emerald-50/45' : ''}`}>
                                <td className="p-2 text-center">
                                  {activeSlip.status === 'pending' && checkPermission('linen') ? (
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300 cursor-pointer"
                                      checked={isChecked}
                                      onChange={() => {
                                        setM1CheckedItems(prev => ({
                                          ...prev,
                                          [item.ma]: !prev[item.ma]
                                        }));
                                      }}
                                    />
                                  ) : (
                                    <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                                  )}
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-stone-800">{item.ten}</span>
                                    {item.isInfectious && (
                                      <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase border border-red-200">
                                        ⚠️ Lây nhiễm
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-stone-400 font-mono block">{item.ma}</span>
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-stone-600">{item.qty} cái</td>
                                <td className="p-2 text-right font-mono text-amber-700 font-bold">
                                  {activeSlip.status === 'pending' && checkPermission('linen') ? (
                                    <input
                                      type="number"
                                      className="w-24 h-9 border border-stone-300 rounded-lg text-center text-sm font-mono font-black text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      value={verifiedQty}
                                      onChange={e => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setM1ItemVerifiedQtys(prev => ({
                                          ...prev,
                                          [item.ma]: val
                                        }));
                                      }}
                                    />
                                  ) : (
                                    <span>{verifiedQty} cái</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Confirm Slip as Dirty Block */}
                  {activeSlip.status === 'pending' && checkPermission('linen') && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex justify-between items-center gap-3">
                      <p className="text-[11px] text-stone-600">
                        Hãy đối chiếu thực tế, chỉnh sửa lại số lượng nếu có lệch số dơ và bấm xác nhận để đồ dơ đi vào <strong>Kho dơ BV</strong>.
                      </p>
                      <button
                        onClick={() => handleConfirmDirtyLinenM1(activeSlip.id)}
                        disabled={isConfirmingM1}
                        className={`px-4 py-2 text-white text-xs font-bold uppercase rounded-lg shadow whitespace-nowrap transition-all ${
                          isConfirmingM1 
                            ? 'bg-stone-400 cursor-not-allowed opacity-50' 
                            : 'bg-amber-600 hover:bg-amber-700 cursor-pointer'
                        }`}
                      >
                        {isConfirmingM1 ? '⏳ Đang xử lý...' : 'Xác Nhận & Đổ Vào Kho Dơ Tạm'}
                      </button>
                    </div>
                  )}

                  {activeSlip.status !== 'pending' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
                      ✓ Đã được xác nhận sạch/dơ bởi <strong>{activeSlip.verifiedDirtyBy || 'Nhân viên Đồ Vải'}</strong> lúc {activeSlip.verifiedDirtyAt || activeSlip.createdAt}
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="h-48 border border-dashed border-stone-200 rounded-xl flex items-center justify-center text-stone-400 text-xs">
                Chưa chọn phiếu
              </div>
            )}
          </div>
        </div>
          )}

          {m1SubTab === 'dirty-company' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* Slips Selection & Master Bills */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Kho đồ dơ tại Cty (Đang xử lý) */}
                <div className="border border-blue-300 bg-blue-50/45 rounded-xl p-4 shadow-sm">
                  <span className="text-xs font-black uppercase text-blue-800 tracking-wider block mb-2 flex items-center gap-1.5">
                    🏭 Kho đồ dơ tại Cty (Đang xử lý tại xưởng)
                  </span>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {Object.keys(temporaryCompanyDirtyStore).filter(ma => (temporaryCompanyDirtyStore[ma] || 0) > 0).length > 0 ? (
                      Object.keys(temporaryCompanyDirtyStore)
                        .filter(ma => (temporaryCompanyDirtyStore[ma] || 0) > 0)
                        .map(ma => {
                          const item = items.find(i => i.ma === ma);
                          if (!temporaryCompanyDirtyStore[ma]) return null;
                          return (
                            <div key={ma} className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg font-medium flex justify-between items-center text-xs shadow-xs">
                              <span className="truncate text-stone-700 font-bold">{item?.ten || ma}</span>
                              <span className="font-mono font-black text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded text-[10px] shrink-0 ml-1">
                                {temporaryCompanyDirtyStore[ma]} cái
                              </span>
                            </div>
                          );
                        })
                    ) : (
                      <span className="text-stone-400 text-xs italic block py-2">Chưa có đồ dơ tại xưởng giặt.</span>
                    )}
                  </div>
                </div>

                {/* Click to Select and Consolidate Bills section */}
                <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-4">
                  <span className="text-xs font-black uppercase text-stone-800 tracking-wider block mb-2">
                    🔗 gom phiếu & giao nhận với công ty
                  </span>
                  <p className="text-[10px] text-stone-500 mb-3">
                    Danh sách các phiếu của khoa phòng đã duyệt bẩn dơ chờ cộng tổng thành 1 Bill Tổng giao cho công ty giặt.
                  </p>

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
                      <span className="text-stone-400 text-xs block text-center py-4">Trống</span>
                    )}
                  </div>

                  {!effectiveIsLaundryUser ? (
                    <div>
                      <button
                        onClick={handleConsolidateAllTodaySlips}
                        disabled={wardDeliverySlips.filter(s => s.status === 'verified_dirty').length === 0}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[11px] font-black uppercase tracking-wider rounded-lg shadow-md disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="Tự động cộng dồn tất cả phiếu khoa phòng đã duyệt trong ngày"
                      >
                        ⚡ CỘNG TẤT CẢ BILL TRONG NGÀY ({wardDeliverySlips.filter(s => s.status === 'verified_dirty').length} phiếu)
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-stone-100 border border-stone-200 rounded-lg text-center text-[10px] text-stone-500 font-medium">
                      🔒 Chức năng cộng dồn phiếu nội bộ BV dành cho NV Đồ vải BV.
                    </div>
                  )}
                </div>

                {/* Master Bills List */}
                <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-4">
                  <span className="text-xs font-bold uppercase text-stone-800 tracking-wider block mb-2">
                    Danh sách phiếu giao dơ xe giặt
                  </span>
                  
                  {/* Filters for M2 */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 flex-1 shadow-2xs">
                      <Search size={14} className="text-stone-400 shrink-0" />
                      <input
                        type="text"
                        value={m2SearchQuery}
                        onChange={e => setM2SearchQuery(e.target.value)}
                        placeholder="Tìm mã hóa đơn, ngày (VD: 07/07/2026)..."
                        className="w-full bg-transparent text-xs text-stone-800 focus:outline-none"
                      />
                      {m2SearchQuery && (
                        <button onClick={() => setM2SearchQuery('')} className="text-stone-400 hover:text-stone-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {filteredM2Dispatches
                      .filter(dispatch => dispatch.status === 'pending_laundry')
                      .map(dispatch => {
                        const isPending = dispatch.status === 'pending_laundry';
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
                              activeDispatchId === dispatch.id ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-stone-50 border-stone-200'
                            }`}
                          >
                            <div className="text-xs">
                              <span className={`font-mono font-bold block ${isDebt ? 'text-rose-700' : 'text-stone-800'}`}>
                                {dispatch.id} {isDebt ? '[NỢ CHƯA TRẢ]' : ''}
                              </span>
                              <span className="text-[9px] text-stone-500 block">Ngày tạo: {dispatch.createdAt}</span>
                            </div>
                            <span className="px-1.5 py-0.5 text-[8px] font-bold rounded-md uppercase bg-amber-100 text-amber-700">
                              Chờ kiểm 2
                            </span>
                          </div>
                        );
                      })}
                    {filteredM2Dispatches.filter(dispatch => dispatch.status === 'pending_laundry').length === 0 && (
                      <div className="text-center py-6 text-stone-400 text-xs">
                        Trống
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Master Bill Workspace */}
              <div className="lg:col-span-7">
                {activeDispatch && activeDispatch.status === 'pending_laundry' ? (
                  <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900 uppercase">Chi tiết phiếu {activeDispatch.id}</h2>
                        <span className="text-xs text-stone-500">
                          Người lập: {activeDispatch.driver || currentAccount?.name || 'Quản trị viên'} • Khoa Tất cả (Không giới hạn)
                          {activeDispatch.plate ? ` • Xe: ${activeDispatch.plate}` : ''}
                          {activeDispatch.contractor ? ` • Xưởng: ${activeDispatch.contractor}` : ''}
                        </span>
                      </div>
                      <button onClick={() => setActiveDispatchId(null)} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
                    </div>

                    {activeDispatch.lossNote && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
                        ⚠️ {activeDispatch.lossNote}
                      </div>
                    )}

                    {(activeDispatch.isGuestBill || activeDispatch.attachedImage || activeDispatch.guestName || activeDispatch.id.includes('KHACH')) && (
                      <div className="p-4 bg-amber-50/90 border-2 border-amber-400 rounded-xl space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                            🛏️ BILL RIÊNG ĐỒ VẢI KHÁCH VIP (ĐIỀU HOÀN BẢO QUẢN RIÊNG)
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
                        {activeDispatch.attachedImage ? (
                          <div className="bg-white p-3 rounded-lg border border-amber-300 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                              <span>📸 Ảnh chụp đồ dơ ban đầu (Đính kèm bởi NV Buồng phòng):</span>
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                                ✓ Đi kèm suốt quá trình giặt & trả sạch
                              </span>
                            </div>
                            <div className="flex justify-center bg-stone-100 p-2 rounded border border-stone-200">
                              <img src={activeDispatch.attachedImage} alt="Đồ vải khách VIP" className="max-h-64 object-contain rounded shadow-xs" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-stone-500 italic bg-white/60 p-2 rounded border border-amber-200">
                            * Bill riêng không đính kèm hình ảnh từ buồng phòng.
                          </div>
                        )}
                      </div>
                    )}

                    {/* 📋 BẢNG CHECKLIST ĐỐI CHIẾU KHO DƠ TẠM BỆNH VIỆN (CHỜ GIAO CTY) */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-300 rounded-xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div>
                          <span className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                            📋 BẢNG CHECKLIST ĐỐI CHIẾU KHO DƠ BV (Mục 1)
                          </span>
                          <span className="text-[10px] text-stone-600 block">
                            Checklist kiểm đếm thực tế đồ dơ đang gom tại kho trước khi bốc xếp lên xe.
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              const nextStoreChecked: Record<string, boolean> = {};
                              Object.keys(temporaryDirtyStore).forEach(ma => {
                                if ((temporaryDirtyStore[ma] || 0) > 0) {
                                  nextStoreChecked[ma] = true;
                                }
                              });
                              setM2StoreCheckedItems(nextStoreChecked);
                              showToast('✓ Đã tích chọn kiểm đếm tất cả đồ trong kho dơ BV!', 'success');
                            }}
                            className="px-2 py-1 text-[9px] bg-white hover:bg-stone-50 text-stone-700 font-bold border border-stone-300 rounded-md shadow-sm transition-all cursor-pointer"
                          >
                            Tích tất cả
                          </button>
                          <button
                            onClick={() => {
                              const nextQtys = { ...m2ItemHandoverQtys };
                              activeDispatch.items.forEach(item => {
                                const storeQty = temporaryDirtyStore[item.ma] || 0;
                                if (storeQty > 0) {
                                  nextQtys[item.ma] = storeQty;
                                }
                              });
                              setM2ItemHandoverQtys(nextQtys);
                              
                              const nextHandoverChecked = { ...m2HandoverCheckedItems };
                              const nextStoreChecked = { ...m2StoreCheckedItems };
                              activeDispatch.items.forEach(item => {
                                nextHandoverChecked[item.ma] = true;
                                nextStoreChecked[item.ma] = true;
                              });
                              setM2HandoverCheckedItems(nextHandoverChecked);
                              setM2StoreCheckedItems(nextStoreChecked);
                              
                              showToast('⚡ Đã tự động lấy số lượng tồn kho dơ BV điền vào duyệt thực tế!', 'success');
                            }}
                            className="px-2 py-1 text-[9px] bg-amber-600 hover:bg-amber-700 text-white font-black rounded-md shadow transition-all flex items-center gap-1 cursor-pointer"
                          >
                            ⚡ Lấy số kho dơ điền vào Bill
                          </button>
                        </div>
                      </div>

                      <div className="border border-amber-200 rounded-lg overflow-x-auto bg-white shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-amber-100/70 border-b border-amber-200 text-amber-900 font-bold">
                              <th className="p-2.5 text-center w-12 text-[10px] uppercase">KIỂM</th>
                              <th className="p-2.5 text-[10px] uppercase">TÊN ĐỒ VẢI</th>
                              <th className="p-2.5 text-right w-24 text-[10px] uppercase">TỒN KHO TẠM</th>
                              <th className="p-2.5 text-right w-36 text-[10px] uppercase">GIAO TRÊN BILL</th>
                              <th className="p-2.5 text-center w-32 text-[10px] uppercase">ĐỐI CHIẾU</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100">
                            {Object.keys(temporaryDirtyStore).filter(ma => (temporaryDirtyStore[ma] || 0) > 0).length > 0 ? (
                              Object.keys(temporaryDirtyStore)
                                .filter(ma => (temporaryDirtyStore[ma] || 0) > 0)
                                .map(ma => {
                                  const itemObj = items.find(i => i.ma === ma);
                                  const storeQty = temporaryDirtyStore[ma] || 0;
                                  const billItem = activeDispatch.items.find(i => i.ma === ma);
                                  const billQty = billItem ? (m2ItemHandoverQtys[ma] ?? billItem.handoverQty) : 0;
                                  const isChecked = !!m2StoreCheckedItems[ma];
                                  const isMatched = storeQty === billQty;
                                  const hasOnBill = !!billItem;

                                  return (
                                    <tr
                                      key={ma}
                                      className={`hover:bg-amber-50/50 transition-colors ${isChecked ? 'bg-amber-50/30' : ''}`}
                                    >
                                      <td className="p-2.5 text-center">
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                                          checked={isChecked}
                                          onChange={() => {
                                            setM2StoreCheckedItems(prev => {
                                              const next = { ...prev, [ma]: !prev[ma] };
                                              setM2HandoverCheckedItems(prevHandover => ({
                                                ...prevHandover,
                                                [ma]: !prev[ma]
                                              }));
                                              return next;
                                            });
                                          }}
                                        />
                                      </td>
                                      <td className="p-2.5">
                                        <span className="font-bold text-stone-800 block text-xs">{itemObj?.ten || ma}</span>
                                        <span className="text-[9px] text-stone-400 font-mono block">{ma}</span>
                                        {hasOnBill && (
                                          <div className="mt-1">
                                            <input
                                              type="text"
                                              placeholder="Ghi chú lý do lệch..."
                                              className="w-full max-w-[200px] border border-amber-200 rounded px-1.5 py-0.5 text-[10px] bg-stone-50 focus:bg-white focus:border-amber-400 focus:outline-none placeholder-stone-400 font-medium"
                                              value={m2ItemHandoverNotes[ma] ?? ''}
                                              onChange={e => {
                                                setM2ItemHandoverNotes(prev => ({ ...prev, [ma]: e.target.value }));
                                              }}
                                            />
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-right">
                                        <span className="font-mono font-extrabold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded text-xs">
                                          {storeQty} cái
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-right font-mono text-stone-600 font-medium">
                                        {hasOnBill ? (
                                          checkPermission('linen') ? (
                                            <div className="flex justify-end items-center gap-1">
                                              <input
                                                type="number"
                                                className="w-20 h-8 border border-stone-300 rounded-lg text-center text-xs font-mono font-black text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={m2ItemHandoverQtys[ma] ?? billItem.handoverQty}
                                                onChange={e => {
                                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                                  setM2ItemHandoverQtys(prev => ({ ...prev, [ma]: val }));
                                                }}
                                              />
                                              <span className="text-[10px] text-stone-500">cái</span>
                                            </div>
                                          ) : (
                                            <span className="text-xs text-stone-900 font-bold">{billQty} cái</span>
                                          )
                                        ) : (
                                          <span className="text-[10px] text-stone-400 italic">Chưa khai báo</span>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-center">
                                        {!hasOnBill ? (
                                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-stone-100 text-stone-600 rounded">
                                            ⚪ Chưa có trên phiếu
                                          </span>
                                        ) : isMatched ? (
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
                                <td colSpan={5} className="p-6 text-center text-stone-400 italic text-xs">
                                  Kho dơ tạm hiện đang trống.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Submit Actions */}
                    {checkPermission('linen') ? (
                      <div className="bg-stone-50 border border-stone-300 rounded-lg p-3 flex justify-between items-center">
                        <p className="text-[10px] text-stone-500">
                          Tài xế nhận hàng. Vui lòng tick kiểm lần 2 thực tế bên trên, nhập lý do lệch nếu có sai số dơ so với khoa và bấm xác nhận bàn giao.
                        </p>
                        <button
                          onClick={() => handleVerifyM2Handover(activeDispatch.id, m2ItemHandoverQtys, m2ItemHandoverNotes)}
                          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase rounded-lg shadow whitespace-nowrap cursor-pointer"
                        >
                          Bàn Giao Xe & Trừ Kho Dơ
                        </button>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-center text-xs text-amber-800 font-medium">
                        ⏳ Phiếu đang ở trạng thái <b>Chờ kiểm 2</b>. Vui lòng chờ Trưởng kho hoặc Nhân viên đồ vải kiểm đếm thực tế và xác nhận bàn giao xe cho xưởng giặt.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 border border-dashed border-stone-200 rounded-xl flex items-center justify-center text-stone-400 text-xs">
                    Chưa chọn phiếu
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================= MỤC 2 PANEL ======================= */}
      {activeMuc === 2 && effectiveIsWardUser && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 p-8 rounded-xl text-center shadow-sm max-w-xl mx-auto my-8">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <p className="font-bold text-lg mb-1">Không thuộc phạm vi quyền hạn điều dưỡng / hộ lý</p>
          <p className="text-sm text-stone-600 mb-4">
            Mục 2 (Giao nhận đồ vải sạch công ty) là quy trình làm việc nội bộ giữa Kho Trung Tâm Bệnh viện và Xưởng giặt Công ty bên ngoài. Tài khoản điều dưỡng, hộ lý khoa phòng chỉ truy cập được <strong>Mục 1</strong> (Giao nhận đồ vải dơ) và <strong>Mục 3</strong> (Giao nhận đồ vải sạch khoa phòng).
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setActiveMuc(1)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md"
            >
              👉 Về Mục 1 (Giao nhận đồ vải dơ)
            </button>
            <button
              onClick={() => setActiveMuc(3)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md"
            >
              👉 Về Mục 3 (Giao nhận đồ vải sạch khoa phòng)
            </button>
          </div>
        </div>
      )}
      {activeMuc === 2 && !effectiveIsWardUser && (
        <div className="space-y-6">
          {/* Sub tabs for Section 2 */}
          <div className="bg-stone-100/90 p-1.5 rounded-2xl flex gap-1.5 w-full max-w-md border border-stone-200/50">
            <button
              onClick={() => {
                setM2SubTab('clean');
                setActiveDispatchId(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                m2SubTab === 'clean'
                  ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200/50 font-black'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/40 font-bold'
              }`}
            >
              <Sparkles size={14} className={m2SubTab === 'clean' ? 'text-emerald-500' : 'text-stone-400'} />
              Nhận đồ vải sạch (Cty ➔ Kho)
            </button>
            <button
              onClick={() => {
                setM2SubTab('debt');
                setActiveDispatchId(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                m2SubTab === 'debt'
                  ? 'bg-white text-amber-700 shadow-sm border border-amber-200/50 font-black'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/40 font-bold'
              }`}
            >
              <FileSpreadsheet size={14} className={m2SubTab === 'debt' ? 'text-amber-500' : 'text-stone-400'} />
              Theo dõi công nợ
            </button>
          </div>

          {m2SubTab === 'clean' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* Slips Selection & Master Bills */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Kho dơ tại Cty (Đang xử lý tại xưởng) */}
                <div className="border border-blue-300 bg-blue-50/45 rounded-xl p-4 shadow-sm">
                  <span className="text-xs font-black uppercase text-blue-800 tracking-wider block mb-2 flex items-center gap-1.5">
                    🏭 Kho đồ dơ tại Cty (Đang xử lý tại xưởng)
                  </span>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {Object.keys(temporaryCompanyDirtyStore).filter(ma => (temporaryCompanyDirtyStore[ma] || 0) > 0).length > 0 ? (
                      Object.keys(temporaryCompanyDirtyStore).map(ma => {
                        const item = items.find(i => i.ma === ma);
                        if (!temporaryCompanyDirtyStore[ma]) return null;
                        return (
                          <div key={ma} className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg font-medium flex justify-between items-center text-xs shadow-xs">
                            <span className="truncate text-stone-700 font-bold">{item?.ten || ma}</span>
                            <span className="font-mono font-black text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded text-[10px] shrink-0 ml-1">
                              {temporaryCompanyDirtyStore[ma]} cái
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-stone-400 text-xs italic block py-2">Chưa có đồ dơ tại xưởng giặt.</span>
                    )}
                  </div>
                </div>

                {/* Master Bills List */}
                <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-4">
                  <span className="text-xs font-bold uppercase text-stone-800 tracking-wider block mb-2">
                    Danh mục kiểm nhận đồ vải sạch
                  </span>
                  
                  {/* Filters for M2 */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 flex-1 shadow-2xs">
                      <Search size={14} className="text-stone-400 shrink-0" />
                      <input
                        type="text"
                        value={m2SearchQuery}
                        onChange={e => setM2SearchQuery(e.target.value)}
                        placeholder="Tìm mã hóa đơn, ngày (VD: 07/07/2026)..."
                        className="w-full bg-transparent text-xs text-stone-800 focus:outline-none"
                      />
                      {m2SearchQuery && (
                        <button onClick={() => setM2SearchQuery('')} className="text-stone-400 hover:text-stone-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {filteredM2Dispatches
                      .filter(dispatch => dispatch.status !== 'pending_laundry')
                      .map(dispatch => {
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
                              isWashing ? 'bg-indigo-100 text-indigo-700 animate-pulse' :
                              isReturningClean ? 'bg-purple-100 text-purple-900 ring-1 ring-purple-400 animate-pulse' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {isWashing ? 'Đang giặt' : isReturningClean ? 'Chờ BV Duyệt Sạch' : 'Đã trả sạch'}
                            </span>
                          </div>
                        );
                      })}
                    {filteredM2Dispatches.filter(dispatch => dispatch.status !== 'pending_laundry').length === 0 && (
                      <div className="text-center py-6 text-stone-400 text-xs">
                        Trống
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Master Bill Workspace */}
              <div className="lg:col-span-7">
            {activeDispatch ? (
              <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-5 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                  <div>
                    <h2 className="text-sm font-bold text-stone-900 uppercase">Chi tiết phiếu {activeDispatch.id}</h2>
                    <span className="text-xs text-stone-500">
                      Người lập: {activeDispatch.driver || currentAccount?.name || 'Quản trị viên'} • Khoa Tất cả (Không giới hạn)
                      {activeDispatch.plate ? ` • Xe: ${activeDispatch.plate}` : ''}
                      {activeDispatch.contractor ? ` • Xưởng: ${activeDispatch.contractor}` : ''}
                    </span>
                  </div>
                  <button onClick={() => setActiveDispatchId(null)} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
                </div>

                {activeDispatch.lossNote && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
                    ⚠️ {activeDispatch.lossNote}
                  </div>
                )}

                {(activeDispatch.isGuestBill || activeDispatch.attachedImage || activeDispatch.guestName || activeDispatch.id.includes('KHACH')) && (
                  <div className="p-4 bg-amber-50/90 border-2 border-amber-400 rounded-xl space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                        🛏️ BILL RIÊNG ĐỒ VẢI KHÁCH VIP (ĐIỀU HOÀN BẢO QUẢN RIÊNG)
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
                    {activeDispatch.attachedImage ? (
                      <div className="bg-white p-3 rounded-lg border border-amber-300 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                          <span>📸 Ảnh chụp đồ dơ ban đầu (Đính kèm bởi NV Buồng phòng):</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                            ✓ Đi kèm suốt quá trình giặt & trả sạch
                          </span>
                        </div>
                        <div className="flex justify-center bg-stone-100 p-2 rounded border border-stone-200">
                          <img src={activeDispatch.attachedImage} alt="Đồ vải khách VIP" className="max-h-64 object-contain rounded shadow-xs" />
                        </div>
                        <p className="text-[10px] text-stone-500 text-center italic">
                          * Nhân viên Xưởng giặt và Nhân viên Bệnh viện kiểm đếm đối chiếu kỹ theo hình ảnh trên khi giặt và khi trả đồ sạch về.
                        </p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-stone-500 italic bg-white/60 p-2 rounded border border-amber-200">
                        * Bill riêng không đính kèm hình ảnh từ buồng phòng.
                      </div>
                    )}
                  </div>
                )}

                {/* Items and verification inputs */}
                {activeDispatch.status !== 'pending_laundry' && (
                  <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-stone-500 font-black text-emerald-800">Danh mục kiểm nhận đồ vải sạch</span>
                  
                  <div className="border border-stone-200 rounded-lg overflow-x-auto bg-stone-50">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                          {activeDispatch.status === 'pending_laundry' && (
                            <th className="p-2 text-center w-12 text-xs">TICK NHẬN</th>
                          )}
                          <th className="p-2 text-xs">TÊN ĐỒ VẢI</th>
                          <th className="p-2 text-right text-xs">KHAI BÁO (KHOA)</th>
                          {activeDispatch.status === 'pending_laundry' ? (
                            <th className="p-2 text-right text-xs">DUYỆT THỰC TẾ (BV)</th>
                          ) : (
                            <>
                              <th className="p-2 text-right text-xs">ĐÃ GIAO XE</th>
                              <th className="p-2 text-center text-xs bg-blue-50/50 font-bold text-blue-800">CTY BÁO TRẢ</th>
                              {(activeDispatch.status === 'returning_clean' || activeDispatch.status === 'completed') && (
                                <th className="p-2 text-center text-xs bg-purple-50/50 font-bold text-purple-900">NV BV KIỂM NHẬN</th>
                              )}
                              <th className="p-2 text-center text-xs bg-rose-50/50 font-bold text-rose-700">SỐ NỢ</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 bg-white">
                        {activeDispatch.items.map(item => {
                          const hasDiff = (m2ItemHandoverQtys[item.ma] ?? item.handoverQty) !== item.wardQty;
                          const isM2Checked = !!m2HandoverCheckedItems[item.ma];
                          return (
                            <tr key={item.ma} className={`hover:bg-stone-50 transition-colors ${isM2Checked ? 'bg-emerald-50/45' : ''}`}>
                              {activeDispatch.status === 'pending_laundry' && (
                                <td className="p-2 text-center">
                                  {checkPermission('linen') ? (
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300 cursor-pointer"
                                      checked={isM2Checked}
                                      onChange={() => {
                                        setM2HandoverCheckedItems(prev => ({
                                          ...prev,
                                          [item.ma]: !prev[item.ma]
                                        }));
                                      }}
                                    />
                                  ) : (
                                    <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                                  )}
                                </td>
                              )}
                              <td className="p-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-stone-800">{item.ten}</span>
                                  {item.isInfectious && (
                                    <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase border border-red-200">
                                      ⚠️ Lây nhiễm
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-stone-400 font-mono block">{item.ma}</span>
                                {item.handoverNote && (
                                  <span className="text-[9px] text-amber-700 italic block mt-0.5">Lý do lệch: {item.handoverNote}</span>
                                )}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-stone-600">{item.wardQty} cái</td>
                              
                              {activeDispatch.status === 'pending_laundry' ? (
                                <td className="p-2 text-right font-mono text-amber-700 font-bold">
                                  {checkPermission('linen') ? (
                                    <div className="flex flex-col items-end gap-1">
                                      <input
                                        type="number"
                                        className="w-24 h-9 border border-stone-300 rounded-lg text-center text-sm font-mono font-black text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={m2ItemHandoverQtys[item.ma] ?? item.handoverQty}
                                        onChange={e => {
                                          const val = Math.max(0, parseInt(e.target.value) || 0);
                                          setM2ItemHandoverQtys(prev => ({ ...prev, [item.ma]: val }));
                                        }}
                                      />
                                      {hasDiff && (
                                        <input
                                          type="text"
                                          placeholder="Ghi chú lý do lệch..."
                                          className="w-32 border border-amber-300 bg-amber-50/30 rounded px-1.5 py-0.5 text-[10px]"
                                          value={m2ItemHandoverNotes[item.ma] ?? ''}
                                          onChange={e => {
                                            const val = e.target.value;
                                            setM2ItemHandoverNotes(prev => ({ ...prev, [item.ma]: val }));
                                          }}
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <span>{m2ItemHandoverQtys[item.ma] ?? item.handoverQty} cái</span>
                                  )}
                                </td>
                              ) : (
                                <>
                                  <td className="p-2 text-right font-mono text-stone-700 font-bold">{item.handoverQty} cái</td>
                                  <td className="p-2 text-center bg-blue-50/10">
                                    {activeDispatch.status === 'washing' && checkPermission('laundry') ? (
                                      <input
                                        type="number"
                                        className="w-24 h-9 border border-stone-300 rounded-lg text-center text-sm font-mono font-black text-blue-800 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={m2ItemCleanQtys[item.ma] ?? item.handoverQty}
                                        onChange={e => {
                                          const val = Math.max(0, parseInt(e.target.value) || 0);
                                          setM2ItemCleanQtys(prev => ({ ...prev, [item.ma]: val }));
                                        }}
                                      />
                                    ) : (
                                      <span className="font-mono font-black text-blue-700">{item.cleanReturnedQty} cái</span>
                                    )}
                                  </td>
                                  {(activeDispatch.status === 'returning_clean' || activeDispatch.status === 'completed') && (
                                    <td className="p-2 text-center bg-purple-50/10">
                                      {activeDispatch.status === 'returning_clean' && canVerifyCleanReturn ? (
                                        <input
                                          type="number"
                                          className="w-24 h-9 border border-purple-300 rounded-lg text-center text-sm font-mono font-black text-purple-900 bg-white focus:ring-2 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          value={m2ItemHospitalVerifyQtys[item.ma] ?? (item.hospitalReceivedQty ?? item.cleanReturnedQty)}
                                          onChange={e => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            setM2ItemHospitalVerifyQtys(prev => ({ ...prev, [item.ma]: val }));
                                          }}
                                        />
                                      ) : (
                                        <span className="font-mono font-black text-purple-800">{item.hospitalReceivedQty ?? item.cleanReturnedQty} cái</span>
                                      )}
                                    </td>
                                  )}
                                  <td className="p-2 text-center bg-rose-50/10">
                                    {(() => {
                                      const currentClean = activeDispatch.status === 'returning_clean' 
                                        ? (m2ItemHospitalVerifyQtys[item.ma] ?? (item.hospitalReceivedQty ?? item.cleanReturnedQty))
                                        : (activeDispatch.status === 'washing' 
                                          ? (m2ItemCleanQtys[item.ma] ?? item.handoverQty)
                                          : (item.hospitalReceivedQty ?? item.cleanReturnedQty));
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
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}

                {/* Submit Actions */}
                {activeDispatch.status === 'pending_laundry' && checkPermission('linen') && (
                  <div className="bg-stone-50 border border-stone-300 rounded-lg p-3 flex justify-between items-center">
                    <p className="text-[10px] text-stone-500">
                      Tài xế nhận hàng. Vui lòng tick kiểm lần 2 thực tế bên trên, nhập lý do lệch nếu có sai số dơ so với khoa và bấm xác nhận bàn giao.
                    </p>
                    <button
                      onClick={() => handleVerifyM2Handover(activeDispatch.id, m2ItemHandoverQtys, m2ItemHandoverNotes)}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase rounded-lg shadow whitespace-nowrap"
                    >
                      Bàn Giao Xe & Trừ Kho Dơ
                    </button>
                  </div>
                )}

                {activeDispatch.status === 'pending_laundry' && !checkPermission('linen') && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-center text-xs text-amber-800 font-medium">
                    ⏳ Phiếu đang ở trạng thái <b>Chờ kiểm 2</b>. Vui lòng chờ Trưởng kho hoặc Nhân viên đồ vải kiểm đếm thực tế và xác nhận bàn giao xe cho xưởng giặt.
                  </div>
                )}

                {activeDispatch.status === 'washing' && checkPermission('laundry') && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-indigo-900 font-bold flex items-center gap-1.5">
                        🚚 BƯỚC 4.1: CÔNG TY LẬP BILL TRẢ SẠCH KHO BV
                      </p>
                      <span className="text-[9px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded">Xưởng giặt khai báo</span>
                    </div>
                    <p className="text-[10px] text-stone-600">
                      Nhập số lượng sạch trả về cho bệnh viện. Sau khi gửi, <b>Nhân viên đồ vải Bệnh Viện sẽ kiểm đếm thực tế và xác nhận</b>. Nếu có phát sinh nợ, hệ thống sẽ tự động tách thành 1 Phiếu Nợ riêng biệt.
                    </p>
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleCompanySubmitM2Return(activeDispatch.id, m2ItemCleanQtys)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-lg shadow transition-all flex items-center gap-1.5"
                      >
                        <span>📝 Gửi Bệnh Viện Xác Nhận Bill Trả Sạch</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeDispatch.status === 'returning_clean' && (
                  <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-3.5 space-y-2.5 animate-fade-in shadow-sm">
                    <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                      <span className="text-xs font-black text-purple-900 uppercase flex items-center gap-1.5">
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
                            ⚠️ <b>PHÁT HIỆN NỢ:</b> Giao thiếu {totalDebt} cái so với lúc nhận xe.
                          </span>
                          <span className="text-[10px] bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded shadow">
                            Tự động tách 1 Bill Nợ Cty
                          </span>
                        </div>
                      ) : (
                        <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-2.5 text-emerald-900 text-xs font-bold flex items-center gap-1.5 shadow-inner">
                          ✓ Hóa đơn trả đủ 100% số lượng giao xưởng, không phát sinh nợ.
                        </div>
                      );
                    })()}
                    {canVerifyCleanReturn ? (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleHospitalVerifyM2Return(activeDispatch.id, m2ItemHospitalVerifyQtys)}
                          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-2"
                        >
                          <span>✅ NV Bệnh Viện Xác Nhận Đủ Bill & Nhập Kho Sạch</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 italic font-bold">
                        ⚠️ Phiếu đã lập trả sạch về bệnh viện. Chờ Trưởng kho hoặc Nhân viên đồ vải kiểm nhận thực tế và xác nhận.
                      </p>
                    )}
                  </div>
                )}

                {activeDispatch.status === 'completed' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span>✓ HÓA ĐƠN TRẢ SẠCH ĐÃ HOÀN TẤT ĐỐI CHIẾU</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Đã nhập kho sạch BV</span>
                    </div>
                    {activeDispatch.cleanReturnedBy && (
                      <p className="text-[11px] text-stone-600">
                        🏢 Cty lập bill: <b>{activeDispatch.cleanReturnedBy}</b> {activeDispatch.cleanReturnedAt ? `(${activeDispatch.cleanReturnedAt})` : ''}
                      </p>
                    )}
                    {activeDispatch.hospitalVerifiedBy && (
                      <p className="text-[11px] text-emerald-900">
                        👤 NV Bệnh viện xác nhận: <b>{activeDispatch.hospitalVerifiedBy}</b> {activeDispatch.hospitalVerifiedAt ? `(${activeDispatch.hospitalVerifiedAt})` : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 border border-dashed border-stone-200 rounded-xl flex items-center justify-center text-stone-400 text-xs">
                Chưa chọn hóa đơn
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Theo dõi công nợ (M2 sub-tab === 'debt') */
        <div className="space-y-6 animate-fade-in">
          {/* Debt summary dashboard for Company */}
          {(() => {
            const activeCompanyDebts = (laundryDispatches || []).filter(d => d.id.startsWith('BILL-NỢ-CTY-') && d.status !== 'completed');
            const totalOwedItems: Record<string, number> = {};
            let totalOwedSum = 0;
            
            activeCompanyDebts.forEach(d => {
              d.items.forEach(it => {
                const verified = it.hospitalReceivedQty ?? it.cleanReturnedQty ?? 0;
                const stillOwed = Math.max(0, it.handoverQty - verified);
                if (stillOwed > 0) {
                  totalOwedItems[it.ten] = (totalOwedItems[it.ten] || 0) + stillOwed;
                  totalOwedSum += stillOwed;
                }
              });
            });

            const seriousCompanyOverdueDebts = activeCompanyDebts.filter(d => getDebtAgeHours(d.originalCreatedAt || d.createdAt) > 48);

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                      <Truck size={20} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-black uppercase text-amber-800 tracking-wider">Hóa Đơn Nợ Xưởng Giặt</span>
                      <span className="text-xl font-black text-amber-950 font-mono mt-0.5 block">
                        {activeCompanyDebts.length} <span className="text-xs font-bold text-amber-700 font-sans">bill chờ trả</span>
                      </span>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                      <Layers size={20} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-black uppercase text-amber-800 tracking-wider">Tổng Đồ Vải Còn Nợ</span>
                      <span className="text-xl font-black text-amber-950 font-mono mt-0.5 block">
                        {totalOwedSum} <span className="text-xs font-bold text-amber-700 font-sans">cái chưa trả</span>
                      </span>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-black uppercase text-red-800 tracking-wider">Nợ Quá Hạn Trễ (&gt; 48 giờ)</span>
                      <span className="text-xl font-black text-red-950 font-mono mt-0.5 block">
                        {seriousCompanyOverdueDebts.length} <span className="text-xs font-bold text-red-700 font-sans">bill cảnh báo</span>
                      </span>
                    </div>
                  </div>
                </div>

                {Object.keys(totalOwedItems).length > 0 && (
                  <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3 flex-wrap animate-fadeIn">
                    <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider flex items-center gap-1 shrink-0">
                      📋 Chi tiết nợ gộp xưởng giặt:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(totalOwedItems).map(([name, qty]) => (
                        <span key={name} className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-700 font-bold flex items-center gap-2">
                          <span>{name}</span>
                          <span className="font-mono font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                            {qty} cái
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Filter controls and Debt Bills List */}
          <div className="space-y-4">
            {/* Sub-tab bar for Company Debt Selection */}
            {(() => {
              const companyDebtsAllCount = (laundryDispatches || []).filter(d => d.id.startsWith('BILL-NỢ-CTY-') && d.status !== 'completed').length;
              const companyDebtsOver48hCount = (laundryDispatches || []).filter(d => {
                if (!d.id.startsWith('BILL-NỢ-CTY-') || d.status === 'completed') return false;
                return getDebtAgeHours(d.originalCreatedAt || d.createdAt) > 48;
              }).length;

              return (
                <div className="flex border-b border-stone-200 gap-1 bg-stone-100/60 p-1 rounded-xl">
                  <button
                    onClick={() => setM2DebtTab('all')}
                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      m2DebtTab === 'all'
                        ? 'bg-white text-amber-700 shadow-sm font-black'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    📋 Tất Cả Hóa Đơn Nợ ({companyDebtsAllCount})
                  </button>
                  <button
                    onClick={() => setM2DebtTab('over48h')}
                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                      m2DebtTab === 'over48h'
                        ? 'bg-red-600 text-white shadow-sm font-black'
                        : 'text-red-600 hover:text-red-700 hover:bg-red-50/50'
                    }`}
                  >
                    🚨 Cảnh Báo Bill Nợ &gt; 48h ({companyDebtsOver48hCount})
                    {companyDebtsOver48hCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    )}
                  </button>
                </div>
              );
            })()}

            <div className="flex flex-col sm:flex-row gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
              {/* Search query */}
              <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-xl px-3 py-2 flex-1 shadow-3xs">
                <Search size={14} className="text-stone-400 shrink-0" />
                <input
                  type="text"
                  value={searchM4Company}
                  onChange={e => setSearchM4Company(e.target.value)}
                  placeholder="Tìm mã hóa đơn nợ, xe, tài xế, món hàng..."
                  className="w-full bg-transparent text-xs focus:outline-none text-stone-800"
                />
                {searchM4Company && (
                  <button onClick={() => setSearchM4Company('')} className="text-stone-400 hover:text-stone-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Date filter */}
              <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-xl px-3 py-2 shadow-3xs w-full sm:w-48">
                <input
                  type="date"
                  value={m4CompanyFilterDate}
                  onChange={e => setM4CompanyFilterDate(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-stone-800 focus:outline-none cursor-pointer"
                />
                {m4CompanyFilterDate && (
                  <button onClick={() => setM4CompanyFilterDate('')} className="text-stone-400 hover:text-stone-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Age filter */}
              <select
                value={filterM4CompanyAge}
                onChange={e => setFilterM4CompanyAge(e.target.value as any)}
                className="bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-3xs cursor-pointer w-full sm:w-56"
              >
                <option value="Tất cả">Tất cả thời gian nợ</option>
                <option value="under24h">Nợ mới (&lt; 24 giờ)</option>
                <option value="24to48h">Cần đối soát (24h - 48h)</option>
                <option value="over48h">Quá hạn trễ (&gt; 48 giờ)</option>
                <option value="over10d">Trễ nghiêm trọng (&gt;= 10 ngày)</option>
              </select>
            </div>

            {/* Company debts list mapping */}
            {(() => {
              const companyDebts = (laundryDispatches || []).filter(d => {
                if (!d.id.startsWith('BILL-NỢ-CTY-')) return false;
                
                // If no date is filtered, hide completed slips. If date is filtered, allow showing completed slips.
                if (d.status === 'completed' && !m4CompanyFilterDate) return false;

                // Tab warning: older than 48 hours
                if (m2DebtTab === 'over48h') {
                  const hours = getDebtAgeHours(d.originalCreatedAt || d.createdAt);
                  if (hours <= 48) return false;
                }

                const hours = getDebtAgeHours(d.originalCreatedAt || d.createdAt);
                const days = getDebtAgeDays(d.originalCreatedAt || d.createdAt);
                if (filterM4CompanyAge === 'under24h' && hours >= 24) return false;
                if (filterM4CompanyAge === '24to48h' && (hours < 24 || hours > 48)) return false;
                if (filterM4CompanyAge === 'over48h' && hours <= 48) return false;
                if (filterM4CompanyAge === 'over10d' && days < 10) return false;

                const dateStrings = [
                  getAllDateRepresentations(d.createdAt),
                  getAllDateRepresentations(d.laundryReceivedAt),
                  getAllDateRepresentations(d.cleanReturnedAt),
                  getAllDateRepresentations(d.hospitalVerifiedAt),
                ].join(' ');

                if (m4CompanyFilterDate) {
                  const filterReps = getAllDateRepresentations(m4CompanyFilterDate).split(' ').filter(Boolean);
                  const matchesDate = filterReps.some(rep => rep.length >= 4 && dateStrings.includes(rep));
                  if (!matchesDate) return false;
                }

                if (searchM4Company) {
                  const q = searchM4Company.toLowerCase();
                  const matchesId = d.id.toLowerCase().includes(q) || (d.originalDispatchId && d.originalDispatchId.toLowerCase().includes(q));
                  const matchesDetails = (d.contractor || '').toLowerCase().includes(q) || (d.driver || '').toLowerCase().includes(q) || (d.plate || '').toLowerCase().includes(q);
                  const matchesItems = d.items.some(i => i.ten.toLowerCase().includes(q) || i.ma.toLowerCase().includes(q));
                  if (!matchesId && !matchesDetails && !matchesItems) return false;
                }
                return true;
              });

              if (companyDebts.length === 0) {
                return (
                  <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50 text-stone-400 text-xs">
                    Trống
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {companyDebts.map(dispatch => {
                    const ageHours = getDebtAgeHours(dispatch.originalCreatedAt || dispatch.createdAt);
                    const ageDays = getDebtAgeDays(dispatch.originalCreatedAt || dispatch.createdAt);
                    
                    let ageBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    let cardBorderClass = 'border-stone-200 bg-white';
                    let ageStatusText = 'Nợ mới';

                    if (dispatch.status === 'completed') {
                      ageBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      cardBorderClass = 'border-emerald-200 bg-emerald-50/10';
                      ageStatusText = 'Đã tất toán ✓';
                    } else if (ageDays >= 10) {
                      ageBadgeClass = 'bg-red-100 text-red-800 border-red-300 animate-pulse';
                      cardBorderClass = 'border-red-300 bg-white shadow-xs shadow-red-100';
                      ageStatusText = 'Nợ nghiêm trọng 🚨';
                    } else if (ageHours > 48) {
                      ageBadgeClass = 'bg-red-50 text-red-700 border-red-200';
                      cardBorderClass = 'border-red-300 bg-white';
                      ageStatusText = 'Quá hạn >48h ⚠️';
                    } else if (ageHours >= 24) {
                      ageBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                      cardBorderClass = 'border-amber-200 bg-white';
                      ageStatusText = 'Cần đối soát 🕒';
                    }

                    const isFormOpen = m4SelectedCompanyDebtId === dispatch.id;
                    const isWaitingForHospitalVerify = dispatch.status === 'returning_clean';

                    return (
                      <div key={dispatch.id} className={`border rounded-2xl p-4 shadow-2xs ${cardBorderClass} transition-all hover:shadow-sm`}>
                        {/* Card Top Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-stone-100 mb-3">
                          <div className="space-y-1">
                            <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg inline-block">
                              {dispatch.id}
                            </span>
                            <div className="text-xs font-bold text-stone-800 flex flex-wrap items-center gap-2">
                              <span>🏢 Xưởng giặt: <strong className="text-indigo-700">{dispatch.contractor || 'Xưởng Giặt Cty'}</strong></span>
                              <span className="text-stone-300">•</span>
                              <span>🚛 Xe: <b>{dispatch.plate || 'Chưa rõ'}</b> (Tài xế: {dispatch.driver || 'Chưa rõ'})</span>
                            </div>
                          </div>
                          <div className="text-right sm:text-right text-left">
                            <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold uppercase rounded-lg border ${ageBadgeClass}`}>
                              {ageHours >= 24 ? `${ageDays} ngày` : `${ageHours} giờ`} ({ageStatusText})
                            </span>
                            <span className="block text-[9px] text-stone-400 mt-0.5 font-medium">Phát sinh: {dispatch.createdAt}</span>
                          </div>
                        </div>

                        {/* Original dispatch links and notes */}
                        {(dispatch.originalDispatchId || dispatch.lossNote) && (
                          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-[10px] text-stone-600 mb-4 space-y-1">
                            {dispatch.originalDispatchId && (
                              <div>🔗 <b>Phát sinh từ hóa đơn tổng gốc:</b> <span className="font-mono font-black text-stone-900 bg-white px-1.5 border rounded flex-inline">#{dispatch.originalDispatchId}</span></div>
                            )}
                            {dispatch.lossNote && (
                              <div className="text-rose-700 font-medium">📝 <b>Lý do nợ:</b> {dispatch.lossNote}</div>
                            )}
                          </div>
                        )}

                        {/* Items table */}
                        <div className="space-y-2 mb-4">
                          <span className="block text-[10px] uppercase font-black tracking-widest text-stone-400">Danh mục đồ vải còn nợ BV</span>
                          <div className="border border-stone-200 rounded-xl overflow-x-auto text-xs bg-stone-50/55">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-stone-100 border-b border-stone-200 text-stone-500 font-bold text-[10px] uppercase">
                                  <th className="p-2">Tên đồ vải</th>
                                  <th className="p-2 text-right">Lượng dơ nhận</th>
                                  <th className="p-2 text-right">Cty đã báo sạch</th>
                                  <th className="p-2 text-right bg-rose-50 text-rose-800">Còn nợ thực tế</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-200 bg-white font-medium">
                                {dispatch.items.map(it => {
                                  const reported = it.cleanReturnedQty ?? 0;
                                  const verified = it.hospitalReceivedQty ?? it.cleanReturnedQty ?? 0;
                                  const stillOwed = Math.max(0, it.handoverQty - verified);
                                  return (
                                    <tr key={it.ma} className="hover:bg-stone-50">
                                      <td className="p-2">
                                        <div className="font-bold text-stone-800">{it.ten}</div>
                                        <span className="text-[9px] text-stone-400 font-mono">{it.ma}</span>
                                      </td>
                                      <td className="p-2 text-right font-mono text-stone-600">{it.handoverQty} cái</td>
                                      <td className="p-2 text-right font-mono text-indigo-600">{reported} cái</td>
                                      <td className="p-2 text-right font-mono font-black bg-rose-50 text-rose-700">{stillOwed} cái</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Quick Repay & Hospital Verify Workspace inside the Card */}
                        {dispatch.status === 'completed' ? (
                          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-center">
                            <span className="text-xs font-bold text-emerald-800 block">✓ ĐÃ TẤT TOÁN CÔNG NỢ XƯỞNG GIẶT</span>
                            <p className="text-[10px] text-stone-600 mt-1">
                              Chốt thu hồi nợ bởi <b>{dispatch.hospitalVerifiedBy || 'Thủ kho'}</b> vào lúc {dispatch.hospitalVerifiedAt || dispatch.createdAt}.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                            {isWaitingForHospitalVerify ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg">
                                  <Clock size={16} className="animate-spin text-indigo-600 shrink-0" />
                                  <div>
                                    <b>CHỜ XÁC NHẬN:</b> Xưởng giặt đã gửi khai báo trả sạch nợ vào lúc <b>{dispatch.cleanReturnedAt || 'gần đây'}</b>.
                                  </div>
                                </div>

                                {!effectiveIsLaundryUser ? (
                                  <div className="border border-purple-200 rounded-xl bg-purple-50/20 p-3 space-y-3">
                                    <h4 className="text-[11px] font-black uppercase text-purple-900 tracking-wider flex items-center gap-1">
                                      <FileCheck size={14} /> NV ĐỒ VẢI BV: KIỂM NHẬN & CHỐT PHIẾU THU HỒI NỢ
                                    </h4>
                                    <p className="text-[10px] text-stone-500">
                                      Vui lòng đếm thực tế đồ sạch công ty chở giao trả nợ, điền số lượng nhận sạch thực tế bên dưới. Nếu vẫn còn nợ, hệ thống sẽ tự động tách nợ tiếp.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {dispatch.items.map(it => {
                                        return (
                                          <div key={it.ma} className="flex justify-between items-center bg-white border border-purple-200 px-2.5 py-1.5 rounded-lg text-xs">
                                            <span className="font-bold text-stone-700 truncate">{it.ten}</span>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <input
                                                type="number"
                                                defaultValue={it.cleanReturnedQty}
                                                id={`verify-debt-${dispatch.id}-${it.ma}`}
                                                className="w-16 h-8 border border-purple-300 rounded-lg text-center text-xs font-mono font-black bg-purple-50 focus:bg-white text-purple-900 focus:ring-1 focus:ring-purple-500"
                                              />
                                              <span className="text-[10px] text-stone-400">/ nợ {it.handoverQty}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className="flex justify-end pt-1">
                                      <button
                                        onClick={() => {
                                          const verifyQtys: Record<string, number> = {};
                                          dispatch.items.forEach(it => {
                                            const el = document.getElementById(`verify-debt-${dispatch.id}-${it.ma}`) as HTMLInputElement;
                                            verifyQtys[it.ma] = el ? Math.max(0, parseInt(el.value) || 0) : (it.cleanReturnedQty ?? 0);
                                          });
                                          handleHospitalVerifyM4DebtReturn(dispatch.id, verifyQtys);
                                        }}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold uppercase rounded-lg shadow-sm transition-all cursor-pointer"
                                      >
                                        Xác Nhận Đủ Sạch & Chốt Thu Hồi Nợ ✅
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-2 bg-stone-100 rounded-lg text-[10px] text-stone-500 italic">
                                    Vui lòng liên hệ Nhân viên đồ vải Bệnh viện kiểm đếm thực tế đồ sạch để hoàn thành chốt bill nợ này.
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                {isFormOpen ? (
                                  <div className="space-y-3 bg-white p-3 rounded-xl border border-amber-300">
                                    <div className="flex justify-between items-center pb-1 border-b border-stone-100">
                                      <span className="text-[11px] font-black uppercase text-amber-900">
                                        🚚 XƯỞNG GIẶT KHAI BÁO TRẢ SẠCH NỢ
                                      </span>
                                      <button onClick={() => setM4SelectedCompanyDebtId(null)} className="text-stone-400 hover:text-stone-600">
                                        <X size={14} />
                                      </button>
                                    </div>
                                    <p className="text-[10px] text-stone-500 leading-relaxed">
                                      Nhập số lượng đồ vải sạch thực tế xưởng đã giặt xong và chuyển trả bù cho bệnh viện. Sau khi gửi, thủ kho BV sẽ đếm thực tế để chốt duyệt.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {dispatch.items.map(it => {
                                        const stillOwed = Math.max(0, it.handoverQty - (it.hospitalReceivedQty ?? 0));
                                        return (
                                          <div key={it.ma} className="flex justify-between items-center bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-lg text-xs">
                                            <span className="font-bold text-stone-700 truncate">{it.ten}</span>
                                            <div className="flex items-center gap-1 shrink-0">
                                              <input
                                                type="number"
                                                defaultValue={stillOwed}
                                                id={`repay-debt-${dispatch.id}-${it.ma}`}
                                                className="w-16 h-8 border border-amber-300 rounded-lg text-center text-xs font-mono font-black bg-white text-stone-900 focus:ring-1 focus:ring-amber-500"
                                              />
                                              <span className="text-[10px] text-stone-400">/ nợ {stillOwed}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="flex justify-end gap-2 pt-1">
                                      <button
                                        onClick={() => setM4SelectedCompanyDebtId(null)}
                                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-lg"
                                      >
                                        Đóng
                                      </button>
                                      <button
                                        onClick={() => {
                                          const repayQtys: Record<string, number> = {};
                                          dispatch.items.forEach(it => {
                                            const el = document.getElementById(`repay-debt-${dispatch.id}-${it.ma}`) as HTMLInputElement;
                                            const stillOwed = Math.max(0, it.handoverQty - (it.hospitalReceivedQty ?? 0));
                                            repayQtys[it.ma] = el ? Math.max(0, parseInt(el.value) || 0) : stillOwed;
                                          });
                                          handleCompanySubmitM4DebtReturn(dispatch.id, repayQtys);
                                        }}
                                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold uppercase rounded-lg shadow-sm font-black cursor-pointer"
                                      >
                                        Gửi Khai Báo Trả Nợ Sạch 🚀
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center bg-stone-100/50 p-2.5 rounded-xl border border-stone-200/40">
                                    <span className="text-[10px] text-stone-500">Chưa khai báo trả nợ cho phiếu này</span>
                                    {(checkPermission('laundry') || effectiveIsLaundryUser) && (
                                      <button
                                        onClick={() => setM4SelectedCompanyDebtId(dispatch.id)}
                                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <Sparkles size={11} /> Khai báo trả nợ sạch
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
        </div>
      )}

      {/* ======================= MỤC 3 PANEL ======================= */}
      {activeMuc === 3 && effectiveIsLaundryUser && (
        <div className="bg-purple-50 border border-purple-300 text-purple-900 p-8 rounded-xl text-center shadow-sm max-w-xl mx-auto my-8">
          <AlertCircle className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <p className="font-bold text-lg mb-1">Không thuộc phạm vi quyền hạn Xưởng giặt Công ty</p>
          <p className="text-sm text-stone-600 mb-4">
            Tài khoản công ty giặt chỉ được phép truy cập và thao tác tại <strong>Mục 2 (Giao nhận đồ vải sạch công ty)</strong>. Các Mục 1 và Mục 3 không thuộc phạm vi làm việc của xưởng giặt.
          </p>
          <button
            onClick={() => setActiveMuc(2)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md"
          >
            👉 Chuyển sang Mục 2 (Giao nhận đồ vải sạch công ty)
          </button>
        </div>
      )}
      {activeMuc === 3 && !effectiveIsLaundryUser && (
        <div className="space-y-6">
          {/* Sub-tabs for Section 3 as requested by the user */}
          <div className="bg-stone-100/90 p-1.5 rounded-2xl flex gap-1.5 w-full max-w-md border border-stone-200/50">
            <button
              onClick={() => {
                setM3SubTab('clean-ward');
                setSelectedM1SlipIdForCleanReturn(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                m3SubTab === 'clean-ward'
                  ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200/50 font-black'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
              }`}
            >
              <FileCheck size={14} className={m3SubTab === 'clean-ward' ? 'text-emerald-600' : 'text-stone-400'} />
              Giao nhận đồ vải sạch
            </button>
            <button
              onClick={() => {
                setM3SubTab('ward-debt');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                m3SubTab === 'ward-debt'
                  ? 'bg-white text-rose-700 shadow-sm border border-rose-200/50 font-black'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
              }`}
            >
              <Building size={14} className={m3SubTab === 'ward-debt' ? 'text-rose-600' : 'text-stone-400'} />
              Theo dõi công nợ Khoa phòng
            </button>
          </div>

          {m3SubTab === 'clean-ward' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Slips and clean store info */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Kho sạch display card */}
                {!isOrderlyUser && (
                  <div className="border border-emerald-300 bg-emerald-50/40 rounded-xl p-4">
                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block mb-2">
                      📦 Kho đồ sạch (Sẵn sàng trả khoa phòng)
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.keys(temporaryCleanStore).filter(ma => temporaryCleanStore[ma] > 0).length > 0 ? (
                        Object.keys(temporaryCleanStore).map(ma => {
                          const item = items.find(i => i.ma === ma);
                          if (!temporaryCleanStore[ma]) return null;
                          return (
                            <div key={ma} className="bg-white border border-emerald-200 px-2.5 py-1.5 rounded-lg font-medium flex justify-between items-center">
                              <span className="truncate text-stone-700 font-bold">{item?.ten || ma}</span>
                              <span className="font-mono font-black text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded text-[10px]">
                                {temporaryCleanStore[ma]} cái
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-stone-400 text-xs col-span-2">Trống</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Select clinical slips representing original dirty sheets to pay back */}
                <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-4">
                  <span className="text-xs font-bold uppercase text-stone-800 tracking-wider block mb-2">
                    Trả đồ sạch cho khoa phòng
                  </span>

                  {/* Filters for M3: Tìm kiếm theo ngày & Khoa */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 flex-1 shadow-2xs">
                      <Search size={14} className="text-stone-400 shrink-0" />
                      <input
                        type="text"
                        value={m3SearchQuery}
                        onChange={e => setM3SearchQuery(e.target.value)}
                        placeholder="Tìm mã phiếu, ngày (VD: 07/07/2026), khoa..."
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

                  <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
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
                              ? isCompleted
                                ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                                : isDebt 
                                  ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500' 
                                  : 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
                              : isCompleted
                                ? 'bg-emerald-50/20 border-emerald-200 opacity-80 hover:bg-emerald-50/40'
                                : isDebt 
                                  ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-100/60' 
                                  : 'hover:bg-stone-50 border-stone-200'
                          }`}
                        >
                          <div className="text-xs">
                            <span className="font-mono font-bold text-stone-800 block flex flex-wrap items-center gap-1">
                              {isDebt && <span className="text-rose-600 font-extrabold text-[10px] bg-rose-100 px-1 py-0.2 rounded">⚠️ NỢ</span>}
                              {isCompleted && <span className="text-emerald-600 font-extrabold text-[10px] bg-emerald-100 px-1 py-0.2 rounded">✓ SẠCH</span>}
                              {slip.id}
                              {slip.originalSlipId && (
                                <span className="text-[10px] font-normal text-rose-700 bg-rose-100/80 border border-rose-300 px-1 py-0.5 rounded ml-1">
                                  Gốc: <b>#{slip.originalSlipId}</b>
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] text-stone-500 block mt-0.5">
                              🏥 <strong>{slip.dept}</strong> • 📅 Phiếu {isDebt ? 'nợ' : 'bản giao'} tạo: <strong>{slip.createdAt}</strong> • Có {slip.items.reduce((s, i) => s + (i.verifiedDirtyQty ?? i.qty), 0)} cái
                              {slip.originalCreatedAt && (
                                <span className="text-rose-700 font-bold block mt-0.5 bg-rose-50 p-1 rounded border border-rose-200">
                                  🕒 <b>Ngày nợ gốc (Đơn dơ đầu): {slip.originalCreatedAt}</b>
                                </span>
                              )}
                            </span>
                          </div>
                          <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded ${
                            isCompleted
                              ? 'bg-emerald-200 text-emerald-800'
                              : isDebt 
                                ? 'bg-rose-200 text-rose-800 animate-pulse' 
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isCompleted ? 'Đã Trả Sạch' : isDebt ? 'Trả Bù Nợ' : 'Đợi Trả Sạch'}
                          </span>
                        </div>
                      );
                    })}
                    {filteredM3Slips.length === 0 && (
                      <div className="text-center py-6 text-stone-400 text-xs">
                        Trống
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Clean return workspace */}
              <div className="lg:col-span-7">
                {selectedM1SlipIdForCleanReturn ? (
                  (() => {
                    const targetSlip = wardDeliverySlips.find(s => s.id === selectedM1SlipIdForCleanReturn);
                    if (!targetSlip) return null;
                    return (
                      <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-5 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                          <div>
                            <h2 className="text-sm font-black text-stone-900 font-sans uppercase flex items-center gap-1.5">
                              {targetSlip.id.startsWith('NỢ-') ? (
                                <span className="text-rose-600">🔴 TRẢ BÙ NỢ SẠCH CHO KHOA</span>
                              ) : (
                                <span>🟩 TRẢ ĐỒ SẠCH CHO KHOA</span>
                              )} {targetSlip.dept}
                            </h2>
                            <div className="text-xs text-stone-500 space-y-1 mt-1">
                              <div>
                                {targetSlip.id.startsWith('NỢ-') ? 'Phiếu nợ hiện tại' : 'Mã phiếu gốc'}: <span className="font-mono font-bold text-stone-700">{targetSlip.id}</span> • {targetSlip.createdBy}
                              </div>
                              {targetSlip.originalCreatedAt && (
                                <div className="bg-rose-50 border border-rose-300 text-rose-800 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs mt-1">
                                  <span className="text-base">📌</span>
                                  <div>
                                    <b>THÔNG TIN NỢ GỐC:</b> Phát sinh từ đơn dơ ban đầu <b className="font-mono text-rose-900 font-bold">#{targetSlip.originalSlipId || targetSlip.id}</b> — Ngày nhận dơ gốc: <b className="underline decoration-rose-500 text-rose-950 font-extrabold">{targetSlip.originalCreatedAt}</b>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <button onClick={() => setSelectedM1SlipIdForCleanReturn(null)} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
                        </div>

                        <div className="space-y-3">
                          <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500">
                            Kiểm thực tế nhận sạch của khoa phòng
                          </span>
                          
                          <div className="border border-stone-200 rounded-lg overflow-x-auto bg-stone-50">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                                  <th className="p-2">Tên đồ vải</th>
                                  <th className="p-2 text-right w-24">Nợ gốc (Dơ đã nhận)</th>
                                  <th className="p-2 text-center w-32 bg-emerald-50 text-emerald-800">Thực Trả Sạch (B5)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-200 bg-white">
                                {targetSlip.items.map(item => {
                                  const maxPossible = item.verifiedDirtyQty ?? item.qty;
                                  const maxAvailableToReturn = Math.min(maxPossible, temporaryCleanStore[item.ma] || 0);
                                  const currentVal = m3ItemCleanReturnQtys[item.ma] ?? maxAvailableToReturn;
                                  return (
                                    <tr key={item.ma} className="hover:bg-stone-50">
                                      <td className="p-2">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-stone-800">{item.ten}</span>
                                          {item.isInfectious && (
                                            <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase border border-red-200">
                                              ⚠️ Lây nhiễm
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[9px] text-stone-400 font-mono block">{item.ma}</span>
                                        <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                                          Kho sạch tạm có: <strong className="font-mono">{temporaryCleanStore[item.ma] || 0}</strong> cái
                                        </span>
                                      </td>
                                      <td className="p-2 text-right font-mono font-bold text-stone-600">{maxPossible} cái</td>
                                      <td className="p-2 text-center bg-emerald-50/10">
                                        {(targetSlip.status !== 'completed' && checkPermission('clean')) ? (
                                          <input
                                            type="number"
                                            className="w-24 h-9 border border-stone-300 rounded-lg text-center text-sm font-mono font-black text-emerald-800 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={currentVal}
                                            max={maxAvailableToReturn}
                                            onChange={e => {
                                              const val = Math.max(0, Math.min(maxAvailableToReturn, parseInt(e.target.value) || 0));
                                              setM3ItemCleanReturnQtys(prev => ({ ...prev, [item.ma]: val }));
                                            }}
                                          />
                                        ) : (
                                          <span className="font-mono font-black text-emerald-700">
                                            {targetSlip.status === 'completed' ? (item.hospitalCleanQty ?? 0) : (item.hospitalCleanQty ?? maxPossible)} cái
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {checkPermission('clean') && targetSlip.status !== 'completed' && (
                          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-3">
                            <p className="text-[11px] text-emerald-900 font-bold uppercase tracking-wider">
                              ✓ LƯU PHIẾU TRẢ SẠCH & TỰ ĐỘNG KHẤU TRỪ KHO SẠCH TẠM
                            </p>
                            <p className="text-[10px] text-stone-600">
                              Nếu trả thiếu (ví dụ nợ lại do xưởng chưa giặt kịp), lưu phiếu trả sạch sẽ **tự động tách thành 1 Phiếu Nợ Khoa Phòng riêng biệt** để tiện quản lý trả bù lần sau.
                            </p>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-t border-emerald-200/60 pt-3">
                              <label className="text-xs font-black text-emerald-900 shrink-0">
                                Người nhận sạch (Khoa phòng):
                              </label>
                              <input
                                type="text"
                                placeholder="Nhập tên điều dưỡng nhận đồ..."
                                value={m3ReceiverName}
                                onChange={e => setM3ReceiverName(e.target.value)}
                                className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1 font-medium placeholder-stone-400 shadow-3xs"
                              />
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => handleReturnCleanM3(targetSlip.id, m3ItemCleanReturnQtys)}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded-lg shadow-sm cursor-pointer transition-colors"
                              >
                                Xác Nhận Trả Sạch & Tách Nợ Khoa
                              </button>
                            </div>
                          </div>
                        )}
                        {targetSlip.status === 'completed' && (
                          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-center space-y-3">
                            <span className="text-sm font-black text-emerald-800 block">✓ PHIẾU ĐÃ HOÀN THÀNH BÀN GIAO SẠCH</span>
                            <div className="text-xs text-stone-600 space-y-1.5 pt-2 border-t border-emerald-200/50 text-left sm:text-center">
                              <p>
                                👤 Người bàn giao (Kho trung tâm): <b>{targetSlip.hospitalCleanBy || 'Nhân viên Đồ sạch'}</b> vào lúc {targetSlip.hospitalCleanAt || targetSlip.confirmedAt}.
                              </p>
                              <p className="text-emerald-800 font-bold bg-emerald-100/50 py-1.5 px-3 rounded-lg border border-emerald-200 inline-block">
                                🤝 Người nhận (Khoa phòng): <b>{targetSlip.receiver || 'Điều dưỡng của khoa'}</b>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="h-48 border border-dashed border-stone-200 rounded-xl flex items-center justify-center text-stone-400 text-xs">
                    Chưa chọn phiếu
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats & Header for Ward Debt */}
              {(() => {
                const totalActiveWardDebts = wardDeliverySlips.filter(s => s.id.startsWith('NỢ-') && s.status !== 'completed');
                const totalOwedPieces = totalActiveWardDebts.reduce((sum, s) => {
                  return sum + s.items.reduce((acc, it) => acc + (it.verifiedDirtyQty ?? it.qty), 0);
                }, 0);
                const seriousOverdueDebts = totalActiveWardDebts.filter(s => getDebtAgeHours(s.originalCreatedAt || s.createdAt) > 48);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                        <Building size={20} />
                      </div>
                      <div>
                        <span className="block text-[10px] font-black uppercase text-rose-800 tracking-wider">Phiếu Nợ Khoa Phòng</span>
                        <span className="text-xl font-black text-rose-950 font-mono mt-0.5 block">
                          {totalActiveWardDebts.length} <span className="text-xs font-bold text-rose-700 font-sans">phiếu chờ trả</span>
                        </span>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                        <Layers size={20} />
                      </div>
                      <div>
                        <span className="block text-[10px] font-black uppercase text-amber-800 tracking-wider">Tổng Đồ Vải Còn Nợ</span>
                        <span className="text-xl font-black text-amber-950 font-mono mt-0.5 block">
                          {totalOwedPieces} <span className="text-xs font-bold text-amber-700 font-sans">cái chưa trả</span>
                        </span>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 shrink-0">
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <span className="block text-[10px] font-black uppercase text-red-800 tracking-wider">Nợ Quá Hạn Trễ (&gt; 48 giờ)</span>
                        <span className="text-xl font-black text-red-950 font-mono mt-0.5 block">
                          {seriousOverdueDebts.length} <span className="text-xs font-bold text-red-700 font-sans">phiếu cảnh báo</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Filters Area for M3 Ward Debt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                {/* Date filter */}
                <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg px-2 py-1.5 shadow-2xs">
                  <input
                    type="date"
                    value={m3WardFilterDate}
                    onChange={e => setM3WardFilterDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-medium text-stone-800 focus:outline-none cursor-pointer"
                  />
                  {m3WardFilterDate && (
                    <button
                      onClick={() => setM3WardFilterDate('')}
                      className="text-stone-400 hover:text-stone-600 px-1"
                      title="Bỏ lọc ngày"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search query */}
                <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <Search size={14} className="text-stone-400 shrink-0" />
                  <input
                    type="text"
                    value={searchM3Ward}
                    onChange={e => setSearchM3Ward(e.target.value)}
                    placeholder="Tìm mã phiếu nợ, khoa..."
                    className="w-full bg-transparent text-xs focus:outline-none text-stone-800"
                  />
                  {searchM3Ward && (
                    <button onClick={() => setSearchM3Ward('')} className="text-stone-400 hover:text-stone-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dept filter */}
                {(!effectiveIsWardUser || isOrderlyUser) ? (
                  <select
                    value={filterM3WardDept}
                    onChange={e => setFilterM3WardDept(e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Tất cả">Tất cả khoa lâm sàng</option>
                    {deptsToUse.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-stone-200/55 text-stone-600 px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-300 flex items-center justify-between">
                    <span>Khoa: <b>{currentWardName}</b></span>
                  </div>
                )}

                {/* Age filter */}
                <select
                  value={filterM3WardAge}
                  onChange={e => setFilterM3WardAge(e.target.value as any)}
                  className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-2xs cursor-pointer"
                >
                  <option value="Tất cả">Tất cả thời gian nợ</option>
                  <option value="under24h">Nợ mới (&lt; 24 giờ)</option>
                  <option value="24to48h">Cần đối soát (24h - 48h)</option>
                  <option value="over48h">Quá hạn trễ (&gt; 48 giờ)</option>
                  <option value="over10d">Trễ nghiêm trọng (&gt;= 10 ngày)</option>
                </select>
              </div>

              {/* Ward debts list */}
              {(() => {
                const wardDebts = wardDeliverySlips.filter(s => {
                  if (!s.id.startsWith('NỢ-')) return false;
                  
                  // If no date is filtered, hide completed slips. If date is filtered, allow showing completed slips.
                  if (s.status === 'completed' && !m3WardFilterDate) return false;
                  
                  if ((effectiveIsWardUser && !isOrderlyUser) && s.dept !== currentWardName) return false;
                  if (filterM3WardDept !== 'Tất cả' && s.dept !== filterM3WardDept) return false;

                  const hours = getDebtAgeHours(s.originalCreatedAt || s.createdAt);
                  const days = getDebtAgeDays(s.originalCreatedAt || s.createdAt);
                  if (filterM3WardAge === 'under24h' && hours >= 24) return false;
                  if (filterM3WardAge === '24to48h' && (hours < 24 || hours > 48)) return false;
                  if (filterM3WardAge === 'over48h' && hours <= 48) return false;
                  if (filterM3WardAge === 'over10d' && days < 10) return false;

                  const dateStrings = [
                    getAllDateRepresentations(s.createdAt),
                    getAllDateRepresentations(s.verifiedDirtyAt),
                    getAllDateRepresentations(s.hospitalCleanAt),
                    getAllDateRepresentations(s.confirmedAt),
                  ].join(' ');

                  if (m3WardFilterDate) {
                    const filterReps = getAllDateRepresentations(m3WardFilterDate).split(' ').filter(Boolean);
                    const matchesDate = filterReps.some(rep => rep.length >= 4 && dateStrings.includes(rep));
                    if (!matchesDate) return false;
                  }

                  if (searchM3Ward) {
                    const q = searchM3Ward.toLowerCase();
                    const matchesId = s.id.toLowerCase().includes(q) || (s.originalSlipId && s.originalSlipId.toLowerCase().includes(q));
                    const matchesDeptName = s.dept.toLowerCase().includes(q);
                    const matchesItems = s.items.some(i => i.ten.toLowerCase().includes(q) || i.ma.toLowerCase().includes(q));
                    if (!matchesId && !matchesDeptName && !matchesItems) return false;
                  }
                  return true;
                });

                if (wardDebts.length === 0) {
                  return (
                    <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50 text-stone-400 text-xs">
                      Trống
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wardDebts.map(slip => {
                      const ageHours = getDebtAgeHours(slip.originalCreatedAt || slip.createdAt);
                      const ageDays = getDebtAgeDays(slip.originalCreatedAt || slip.createdAt);
                      
                      // Custom colors based on age
                      let ageBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      let cardBorderClass = 'border-stone-200';
                      let ageStatusText = 'Nợ mới';

                      if (ageDays >= 10) {
                        ageBadgeClass = 'bg-red-100 text-red-800 border-red-300 animate-pulse';
                        cardBorderClass = 'border-red-300 shadow-xs shadow-red-100';
                        ageStatusText = 'Nợ nghiêm trọng 🚨';
                      } else if (ageHours > 48) {
                        ageBadgeClass = 'bg-red-50 text-red-700 border-red-200';
                        cardBorderClass = 'border-red-300';
                        ageStatusText = 'Quá hạn >48h ⚠️';
                      } else if (ageHours >= 24) {
                        ageBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                        cardBorderClass = 'border-amber-200';
                        ageStatusText = 'Cần đối soát 🕒';
                      }

                      return (
                        <div key={slip.id} className={`bg-white border rounded-2xl p-4 shadow-2xs flex flex-col justify-between ${cardBorderClass} transition-all duration-200 hover:shadow-sm`}>
                          <div>
                            {/* Card Header */}
                            <div className="flex justify-between items-start gap-2 pb-2.5 border-b border-stone-100 mb-3">
                              <div>
                                <span className="font-mono text-xs font-black text-rose-700 block bg-rose-50 px-2 py-0.5 rounded border border-rose-200 max-w-max mb-1">
                                  #{slip.id}
                                </span>
                                <h3 className="text-xs font-black text-stone-800 flex items-center gap-1">
                                  <Building size={12} className="text-stone-400" />
                                  {slip.dept}
                                </h3>
                              </div>
                              <div className="text-right">
                                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg border ${ageBadgeClass}`}>
                                  {ageHours >= 24 ? `${ageDays} ngày` : `${ageHours} giờ`} ({ageStatusText})
                                </span>
                                <span className="block text-[9px] text-stone-400 mt-0.5 font-medium">Tạo: {slip.createdAt}</span>
                              </div>
                            </div>

                            {/* Original slip tracking */}
                            {slip.originalSlipId && (
                              <div className="bg-stone-50 border border-stone-200 rounded-lg p-2 text-[10px] text-stone-600 mb-3 space-y-0.5">
                                <div>🔗 <b>Mã đơn dơ gốc:</b> <span className="font-mono font-bold text-stone-800 bg-white px-1 border rounded">{slip.originalSlipId}</span></div>
                                <div>🕒 <b>Ngày nhận dơ gốc:</b> <span className="font-medium text-stone-800">{slip.originalCreatedAt}</span></div>
                              </div>
                            )}

                            {/* Items List */}
                            <div className="space-y-1.5 mb-4">
                              <span className="block text-[9px] uppercase font-black tracking-widest text-stone-400">Chi tiết đồ vải còn nợ</span>
                              <div className="border border-stone-200 rounded-lg overflow-hidden divide-y divide-stone-100 text-xs bg-stone-50">
                                {slip.items.map(it => {
                                  const qtyOwed = it.verifiedDirtyQty ?? it.qty;
                                  return (
                                    <div key={it.ma} className="flex justify-between items-center p-2 bg-stone-50/50 hover:bg-stone-50">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="font-bold text-stone-700 truncate">{it.ten}</span>
                                        {it.isInfectious && (
                                          <span className="text-[8px] bg-red-100 text-red-700 font-extrabold px-1 rounded border border-red-200">LÂY NHIỄM</span>
                                        )}
                                      </div>
                                      <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 border border-rose-200 rounded text-[10px] shrink-0">
                                        Còn nợ: {qtyOwed} cái
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Quick redirect / inline settlement action for Linen Staff */}
                          <div className="pt-2 border-t border-stone-100 space-y-2">
                            {checkPermission('clean') ? (
                              inlineSettleSlipId === slip.id ? (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-3">
                                  <div className="flex justify-between items-center pb-1.5 border-b border-rose-100">
                                    <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider flex items-center gap-1">
                                      ⚡ Đối chiếu & Thu hồi nợ nhanh
                                    </span>
                                    <button
                                      onClick={() => setInlineSettleSlipId(null)}
                                      className="text-stone-400 hover:text-stone-600 text-xs font-bold"
                                    >
                                      Hủy ✕
                                    </button>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {slip.items.map(it => {
                                      const maxPossible = it.verifiedDirtyQty ?? it.qty;
                                      const availableClean = temporaryCleanStore[it.ma] || 0;
                                      const currentQty = inlineSettleQtys[it.ma] !== undefined ? inlineSettleQtys[it.ma] : Math.min(maxPossible, availableClean);
                                      return (
                                        <div key={it.ma} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-rose-100/60">
                                          <div>
                                            <span className="font-bold text-stone-800 block">{it.ten}</span>
                                            <span className="text-[9px] text-stone-400 block font-mono">
                                              Kho sạch tạm có: <b className="text-emerald-700 font-bold">{availableClean}</b> cái
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <input
                                              type="number"
                                              className="w-16 h-8 border border-stone-300 rounded text-center font-mono font-bold focus:ring-1 focus:ring-rose-500"
                                              value={currentQty}
                                              min={0}
                                              max={maxPossible}
                                              onChange={e => {
                                                const val = Math.max(0, Math.min(maxPossible, parseInt(e.target.value) || 0));
                                                setInlineSettleQtys(prev => ({ ...prev, [it.ma]: val }));
                                              }}
                                            />
                                            <span className="text-stone-400">/ nợ {maxPossible}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <button
                                    onClick={() => {
                                      handleReturnCleanM3(slip.id, inlineSettleQtys);
                                      setInlineSettleSlipId(null);
                                    }}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer font-black"
                                  >
                                    ✓ Hoàn Tất Thu Hồi Nợ
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row gap-1.5">
                                  <button
                                    onClick={() => {
                                      setInlineSettleSlipId(slip.id);
                                      const initQtys: Record<string, number> = {};
                                      slip.items.forEach(it => {
                                        const maxPossible = it.verifiedDirtyQty ?? it.qty;
                                        const availableClean = temporaryCleanStore[it.ma] || 0;
                                        initQtys[it.ma] = Math.min(maxPossible, availableClean);
                                      });
                                      setInlineSettleQtys(initQtys);
                                    }}
                                    className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold uppercase rounded-lg border border-rose-200 shadow-3xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                                  >
                                    ⚡ Thu Hồi Nợ Nhanh
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Switch sub-tab to clean-ward
                                      setM3SubTab('clean-ward');
                                      setSelectedM1SlipIdForCleanReturn(slip.id);
                                      // Populate clean return quantities inputs
                                      const initClean: Record<string, number> = {};
                                      slip.items.forEach(it => {
                                        initClean[it.ma] = it.verifiedDirtyQty ?? it.qty;
                                      });
                                      setM3ItemCleanReturnQtys(initClean);
                                    }}
                                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold uppercase rounded-lg shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer"
                                  >
                                    <ArrowRight size={12} />
                                    Mở Workspace
                                  </button>
                                </div>
                              )
                            ) : (
                              <div className="text-center py-1.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] font-semibold text-rose-700">
                                🔒 Đang chờ Nhân viên đồ vải trả bù sạch cho Khoa
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ======================= MỤC 4: ĐỐI CHIẾU & QUẢN LÝ CÔNG NỢ ======================= */}
      {activeMuc === 4 && (
        <div className="space-y-6 animate-fadeIn">


          {/* Stats Bento Grid */}
          {(() => {
            const wardDebtsList = wardDeliverySlips.filter(s => s.id.startsWith('NỢ-') && s.status !== 'completed');
            const companyDebtsList = (laundryDispatches || []).filter(d => d.id.startsWith('BILL-NỢ-CTY-') && d.status !== 'completed');

            const totalWardOwedQty = wardDebtsList.reduce((acc, s) => {
              return acc + s.items.reduce((sAcc, item) => sAcc + (item.verifiedDirtyQty ?? item.qty), 0);
            }, 0);

            const totalCompanyOwedQty = companyDebtsList.reduce((acc, d) => {
              return acc + d.items.reduce((sAcc, item) => {
                const clean = item.hospitalReceivedQty ?? item.cleanReturnedQty ?? 0;
                return sAcc + Math.max(0, item.handoverQty - clean);
              }, 0);
            }, 0);

            // Find oldest ages
            let oldestWardAge = 0;
            wardDebtsList.forEach(s => {
              const age = getDebtAgeDays(s.originalCreatedAt || s.createdAt);
              if (age > oldestWardAge) oldestWardAge = age;
            });

            let oldestCompanyAge = 0;
            companyDebtsList.forEach(d => {
              const age = getDebtAgeDays(d.originalCreatedAt || d.createdAt);
              if (age > oldestCompanyAge) oldestCompanyAge = age;
            });

            // Overdue warning counts
            const wardOverdueCount = wardDebtsList.filter(s => getDebtAgeDays(s.originalCreatedAt || s.createdAt) >= 5).length;
            const companyOverdueCount = companyDebtsList.filter(d => getDebtAgeDays(d.originalCreatedAt || d.createdAt) >= 5).length;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stat 1 */}
                <div className="bg-gradient-to-br from-rose-50 to-red-50/50 border border-rose-200 rounded-2xl p-4 shadow-2xs flex items-center gap-4">
                  <div className="w-10 h-10 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center text-lg shrink-0">
                    🏥
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500">Nợ Khoa Phòng</span>
                    <span className="block text-xl font-mono font-black text-rose-700">{wardDebtsList.length} <span className="text-xs font-normal">phiếu</span></span>
                    <span className="text-[10px] text-stone-500 font-medium">Đang nợ khoa: <b>{totalWardOwedQty}</b> cái</span>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl p-4 shadow-2xs flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center text-lg shrink-0">
                    🚚
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500">Nợ Xưởng Giặt</span>
                    <span className="block text-xl font-mono font-black text-amber-700">{companyDebtsList.length} <span className="text-xs font-normal">bill nợ</span></span>
                    <span className="text-[10px] text-stone-500 font-medium">Xưởng nợ BV: <b>{totalCompanyOwedQty}</b> cái</span>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 rounded-2xl p-4 shadow-2xs flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center text-lg shrink-0">
                    ⏳
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500">Thời Gian Nợ Lâu Nhất</span>
                    <span className="block text-xl font-mono font-black text-blue-700">
                      {Math.max(oldestWardAge, oldestCompanyAge)} <span className="text-xs font-normal">ngày trước</span>
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium">Nợ Khoa: {oldestWardAge}n • Nợ Cty: {oldestCompanyAge}n</span>
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="bg-gradient-to-br from-red-50 to-rose-100/30 border border-red-200 rounded-2xl p-4 shadow-2xs flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-100 text-red-700 rounded-xl flex items-center justify-center text-lg shrink-0 animate-pulse">
                    ⚠️
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500">Cảnh Báo Quá Hạn (&gt;5 ngày)</span>
                    <span className="block text-xl font-mono font-black text-red-600">
                      {wardOverdueCount + companyOverdueCount} <span className="text-xs font-normal">đơn trễ</span>
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium">Báo động đỏ công nợ trễ hạn lâu</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Sub Tab Buttons */}
          <div className="flex border-b border-stone-200 gap-1 bg-stone-100/80 p-1 rounded-xl">
            <button
              onClick={() => setM4ActiveTab('ward')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${
                m4ActiveTab === 'ward'
                  ? 'bg-white text-rose-700 shadow-sm font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🏥 Nợ Khoa Phòng Lâm Sàng ({wardDeliverySlips.filter(s => s.id.startsWith('NỢ-') && s.status !== 'completed').length})
            </button>
            <button
              onClick={() => setM4ActiveTab('company')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${
                m4ActiveTab === 'company'
                  ? 'bg-white text-amber-700 shadow-sm font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🚚 Nợ Xưởng Giặt Công Ty ({(laundryDispatches || []).filter(d => d.id.startsWith('BILL-NỢ-CTY-') && d.status !== 'completed').length})
            </button>
          </div>

          {/* WARD DEBTS TAB */}
          {m4ActiveTab === 'ward' && (
            <div className="space-y-4">
              {/* Filters Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                {/* Date filter */}
                <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg px-2 py-1.5 shadow-2xs">
                  <input
                    type="date"
                    value={m4WardFilterDate}
                    onChange={e => setM4WardFilterDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-medium text-stone-800 focus:outline-none cursor-pointer"
                  />
                  {m4WardFilterDate && (
                    <button
                      onClick={() => setM4WardFilterDate('')}
                      className="text-stone-400 hover:text-stone-600 px-1"
                      title="Bỏ lọc ngày"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search query */}
                <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <Search size={14} className="text-stone-400 shrink-0" />
                  <input
                    type="text"
                    value={searchM4Ward}
                    onChange={e => setSearchM4Ward(e.target.value)}
                    placeholder="Tìm mã phiếu nợ, khoa..."
                    className="w-full bg-transparent text-xs focus:outline-none text-stone-800"
                  />
                  {searchM4Ward && (
                    <button onClick={() => setSearchM4Ward('')} className="text-stone-400 hover:text-stone-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dept filter */}
                {(!effectiveIsWardUser || isOrderlyUser) ? (
                  <select
                    value={filterM4WardDept}
                    onChange={e => setFilterM4WardDept(e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Tất cả">Tất cả khoa lâm sàng</option>
                    {deptsToUse.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-stone-200/55 text-stone-600 px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-300 flex items-center justify-between">
                    <span>Khoa: <b>{currentWardName}</b></span>
                  </div>
                )}

                {/* Age filter */}
                <select
                  value={filterM4WardAge}
                  onChange={e => setFilterM4WardAge(e.target.value as any)}
                  className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-2xs cursor-pointer"
                >
                  <option value="Tất cả">Tất cả thời gian nợ</option>
                  <option value="under24h">Nợ mới (&lt; 24 giờ)</option>
                  <option value="24to48h">Cần đối soát (24h - 48h)</option>
                  <option value="over48h">Quá hạn trễ (&gt; 48 giờ)</option>
                  <option value="over10d">Trễ nghiêm trọng (&gt;= 10 ngày)</option>
                </select>
              </div>

              {/* Slips List Grid */}
              {(() => {
                const wardDebts = wardDeliverySlips.filter(s => {
                  if (!s.id.startsWith('NỢ-')) return false;
                  
                  // If no date is filtered, hide completed slips. If date is filtered, allow showing completed slips.
                  if (s.status === 'completed' && !m4WardFilterDate) return false;
                  
                  if ((effectiveIsWardUser && !isOrderlyUser) && s.dept !== currentWardName) return false;
                  if (filterM4WardDept !== 'Tất cả' && s.dept !== filterM4WardDept) return false;

                  const hours = getDebtAgeHours(s.originalCreatedAt || s.createdAt);
                  const days = getDebtAgeDays(s.originalCreatedAt || s.createdAt);
                  if (filterM4WardAge === 'under24h' && hours >= 24) return false;
                  if (filterM4WardAge === '24to48h' && (hours < 24 || hours > 48)) return false;
                  if (filterM4WardAge === 'over48h' && hours <= 48) return false;
                  if (filterM4WardAge === 'over10d' && days < 10) return false;

                  const dateStrings = [
                    getAllDateRepresentations(s.createdAt),
                    getAllDateRepresentations(s.verifiedDirtyAt),
                    getAllDateRepresentations(s.hospitalCleanAt),
                    getAllDateRepresentations(s.confirmedAt),
                  ].join(' ');

                  if (m4WardFilterDate) {
                    const filterReps = getAllDateRepresentations(m4WardFilterDate).split(' ').filter(Boolean);
                    const matchesDate = filterReps.some(rep => rep.length >= 4 && dateStrings.includes(rep));
                    if (!matchesDate) return false;
                  }

                  if (searchM4Ward) {
                    const q = searchM4Ward.toLowerCase();
                    const matchesId = s.id.toLowerCase().includes(q) || (s.originalSlipId && s.originalSlipId.toLowerCase().includes(q));
                    const matchesDeptName = s.dept.toLowerCase().includes(q);
                    const matchesItems = s.items.some(i => i.ten.toLowerCase().includes(q) || i.ma.toLowerCase().includes(q));
                    if (!matchesId && !matchesDeptName && !matchesItems) return false;
                  }
                  return true;
                });

                if (wardDebts.length === 0) {
                  return (
                    <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50 text-stone-400 text-xs">
                      Trống
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wardDebts.map(slip => {
                      const ageHours = getDebtAgeHours(slip.originalCreatedAt || slip.createdAt);
                      const ageDays = getDebtAgeDays(slip.originalCreatedAt || slip.createdAt);
                      
                      // Custom colors based on age
                      let ageBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      let cardBorderClass = 'border-stone-200';
                      let ageStatusText = 'Nợ mới';

                      if (ageDays >= 10) {
                        ageBadgeClass = 'bg-red-100 text-red-800 border-red-300 animate-pulse';
                        cardBorderClass = 'border-red-300 shadow-xs shadow-red-100';
                        ageStatusText = 'Nợ nghiêm trọng 🚨';
                      } else if (ageHours > 48) {
                        ageBadgeClass = 'bg-red-50 text-red-700 border-red-200';
                        cardBorderClass = 'border-red-300';
                        ageStatusText = 'Quá hạn >48h ⚠️';
                      } else if (ageHours >= 24) {
                        ageBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                        cardBorderClass = 'border-amber-200';
                        ageStatusText = 'Cần đối soát 🕒';
                      }

                      return (
                        <div key={slip.id} className={`bg-white border rounded-2xl p-4 shadow-2xs flex flex-col justify-between ${cardBorderClass} transition-all duration-200 hover:shadow-md`}>
                          <div>
                            {/* Card Header */}
                            <div className="flex justify-between items-start gap-2 pb-2.5 border-b border-stone-100 mb-3">
                              <div>
                                <span className="font-mono text-xs font-black text-rose-700 block bg-rose-50 px-2 py-0.5 rounded border border-rose-200 max-w-max mb-1">
                                  #{slip.id}
                                </span>
                                <h3 className="text-xs font-black text-stone-800 flex items-center gap-1">
                                  <Building size={12} className="text-stone-400" />
                                  {slip.dept}
                                </h3>
                              </div>
                              <div className="text-right">
                                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg border ${ageBadgeClass}`}>
                                  {ageHours >= 24 ? `${ageDays} ngày` : `${ageHours} giờ`} ({ageStatusText})
                                </span>
                                <span className="block text-[9px] text-stone-400 mt-0.5 font-medium">Tạo: {slip.createdAt}</span>
                              </div>
                            </div>

                            {/* Original slip tracking */}
                            {slip.originalSlipId && (
                              <div className="bg-stone-50 border border-stone-200 rounded-lg p-2 text-[10px] text-stone-600 mb-3 space-y-0.5">
                                <div>🔗 <b>Mã đơn dơ gốc:</b> <span className="font-mono font-bold text-stone-800 bg-white px-1 border rounded">{slip.originalSlipId}</span></div>
                                <div>🕒 <b>Ngày nhận dơ gốc:</b> <span className="font-medium text-stone-800">{slip.originalCreatedAt}</span></div>
                              </div>
                            )}

                            {/* Items List */}
                            <div className="space-y-1.5 mb-4">
                              <span className="block text-[9px] uppercase font-black tracking-widest text-stone-400">Chi tiết đồ vải còn nợ</span>
                              <div className="border border-stone-200 rounded-lg overflow-hidden divide-y divide-stone-100 text-xs">
                                {slip.items.map(it => {
                                  const qtyOwed = it.verifiedDirtyQty ?? it.qty;
                                  return (
                                    <div key={it.ma} className="flex justify-between items-center p-2 bg-stone-50/50 hover:bg-stone-50">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="font-bold text-stone-700 truncate">{it.ten}</span>
                                        {it.isInfectious && (
                                          <span className="text-[8px] bg-red-100 text-red-700 font-extrabold px-1 rounded border border-red-200">LÂY NHIỄM</span>
                                        )}
                                      </div>
                                      <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 border border-rose-200 rounded text-[10px] shrink-0">
                                        Còn nợ: {qtyOwed} cái
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Quick redirect action for Linen Staff */}
                          <div className="pt-2 border-t border-stone-100 space-y-2">
                            {checkPermission('clean') ? (
                              inlineSettleSlipId === slip.id ? (
                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-3">
                                  <div className="flex justify-between items-center pb-1.5 border-b border-rose-100">
                                    <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider flex items-center gap-1">
                                      ⚡ Đối chiếu & Thu hồi nợ nhanh
                                    </span>
                                    <button
                                      onClick={() => setInlineSettleSlipId(null)}
                                      className="text-stone-400 hover:text-stone-600 text-xs font-bold"
                                    >
                                      Hủy ✕
                                    </button>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {slip.items.map(it => {
                                      const maxPossible = it.verifiedDirtyQty ?? it.qty;
                                      const availableClean = temporaryCleanStore[it.ma] || 0;
                                      const currentQty = inlineSettleQtys[it.ma] !== undefined ? inlineSettleQtys[it.ma] : Math.min(maxPossible, availableClean);
                                      return (
                                        <div key={it.ma} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-rose-100/60">
                                          <div>
                                            <span className="font-bold text-stone-800 block">{it.ten}</span>
                                            <span className="text-[9px] text-stone-400 block font-mono">
                                              Kho sạch tạm có: <b className="text-emerald-700 font-bold">{availableClean}</b> cái
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <input
                                              type="number"
                                              className="w-16 h-8 border border-stone-300 rounded text-center font-mono font-bold focus:ring-1 focus:ring-rose-500"
                                              value={currentQty}
                                              min={0}
                                              max={maxPossible}
                                              onChange={e => {
                                                const val = Math.max(0, Math.min(maxPossible, parseInt(e.target.value) || 0));
                                                setInlineSettleQtys(prev => ({ ...prev, [it.ma]: val }));
                                              }}
                                            />
                                            <span className="text-stone-400">/ nợ {maxPossible}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <button
                                    onClick={() => {
                                      handleReturnCleanM3(slip.id, inlineSettleQtys);
                                      setInlineSettleSlipId(null);
                                    }}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer font-black"
                                  >
                                    ✓ Hoàn Tất Thu Hồi Nợ
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row gap-1.5">
                                  <button
                                    onClick={() => {
                                      setInlineSettleSlipId(slip.id);
                                      const initQtys: Record<string, number> = {};
                                      slip.items.forEach(it => {
                                        const maxPossible = it.verifiedDirtyQty ?? it.qty;
                                        const availableClean = temporaryCleanStore[it.ma] || 0;
                                        initQtys[it.ma] = Math.min(maxPossible, availableClean);
                                      });
                                      setInlineSettleQtys(initQtys);
                                    }}
                                    className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold uppercase rounded-lg border border-rose-200 shadow-3xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                                  >
                                    ⚡ Thu Hồi Nợ Nhanh
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Switch to tab s21-muc3 & subtab clean-ward
                                      setActiveMuc(3);
                                      setM3SubTab('clean-ward');
                                      setSelectedM1SlipIdForCleanReturn(slip.id);
                                      // Populate clean return quantities inputs
                                      const initClean: Record<string, number> = {};
                                      slip.items.forEach(it => {
                                        initClean[it.ma] = it.verifiedDirtyQty ?? it.qty;
                                      });
                                      setM3ItemCleanReturnQtys(initClean);
                                    }}
                                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold uppercase rounded-lg shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer font-black"
                                  >
                                    <ArrowRight size={12} />
                                    Mở Workspace
                                  </button>
                                </div>
                              )
                            ) : (
                              <div className="text-center py-1.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] font-semibold text-rose-700">
                                🔒 Đang chờ Nhân viên đồ vải trả bù sạch cho Khoa
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* COMPANY DEBTS TAB */}
          {m4ActiveTab === 'company' && (
            <div className="space-y-4">
              {/* Sub-tab bar for Company Debt Selection */}
              {(() => {
                const companyDebtsAllCount = (laundryDispatches || []).filter(d => d.id.startsWith('BILL-NỢ-CTY-') && d.status !== 'completed').length;
                const companyDebtsOver48hCount = (laundryDispatches || []).filter(d => {
                  if (!d.id.startsWith('BILL-NỢ-CTY-') || d.status === 'completed') return false;
                  return getDebtAgeHours(d.originalCreatedAt || d.createdAt) > 48;
                }).length;

                return (
                  <div className="flex border-b border-stone-200 gap-1 bg-stone-100/60 p-1 rounded-xl">
                    <button
                      onClick={() => setM2DebtTab('all')}
                      className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        m2DebtTab === 'all'
                          ? 'bg-white text-amber-700 shadow-sm font-black'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      📋 Tất Cả Hóa Đơn Nợ ({companyDebtsAllCount})
                    </button>
                    <button
                      onClick={() => setM2DebtTab('over48h')}
                      className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                        m2DebtTab === 'over48h'
                          ? 'bg-red-600 text-white shadow-sm font-black'
                          : 'text-red-600 hover:text-red-700 hover:bg-red-50/50'
                      }`}
                    >
                      🚨 Cảnh Báo Bill Nợ &gt; 48h ({companyDebtsOver48hCount})
                      {companyDebtsOver48hCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                    </button>
                  </div>
                );
              })()}

              {/* Filters Area */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                {/* Date filter */}
                <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg px-2 py-1.5 shadow-2xs">
                  <input
                    type="date"
                    value={m4CompanyFilterDate}
                    onChange={e => setM4CompanyFilterDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-medium text-stone-800 focus:outline-none cursor-pointer"
                  />
                  {m4CompanyFilterDate && (
                    <button
                      onClick={() => setM4CompanyFilterDate('')}
                      className="text-stone-400 hover:text-stone-600 px-1"
                      title="Bỏ lọc ngày"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search query */}
                <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <Search size={14} className="text-stone-400 shrink-0" />
                  <input
                    type="text"
                    value={searchM4Company}
                    onChange={e => setSearchM4Company(e.target.value)}
                    placeholder="Tìm mã hóa đơn nợ, xe giao nhận..."
                    className="w-full bg-transparent text-xs focus:outline-none text-stone-800"
                  />
                  {searchM4Company && (
                    <button onClick={() => setSearchM4Company('')} className="text-stone-400 hover:text-stone-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Age filter */}
                <select
                  value={filterM4CompanyAge}
                  onChange={e => setFilterM4CompanyAge(e.target.value as any)}
                  className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs cursor-pointer"
                >
                  <option value="Tất cả">Tất cả thời gian nợ</option>
                  <option value="under24h">Nợ mới (&lt; 24 giờ)</option>
                  <option value="24to48h">Cần đối soát (24h - 48h)</option>
                  <option value="over48h">Quá hạn trễ (&gt; 48 giờ)</option>
                  <option value="over10d">Trễ nghiêm trọng (&gt;= 10 ngày)</option>
                </select>
              </div>

              {/* Dispatches list */}
              {(() => {
                const companyDebts = (laundryDispatches || []).filter(d => {
                  if (!d.id.startsWith('BILL-NỢ-CTY-')) return false;
                  
                  // If no date is filtered, hide completed slips. If date is filtered, allow showing completed slips.
                  if (d.status === 'completed' && !m4CompanyFilterDate) return false;

                  // Tab warning: older than 48 hours
                  if (m2DebtTab === 'over48h') {
                    const hours = getDebtAgeHours(d.originalCreatedAt || d.createdAt);
                    if (hours <= 48) return false;
                  }

                  const hours = getDebtAgeHours(d.originalCreatedAt || d.createdAt);
                  const days = getDebtAgeDays(d.originalCreatedAt || d.createdAt);
                  if (filterM4CompanyAge === 'under24h' && hours >= 24) return false;
                  if (filterM4CompanyAge === '24to48h' && (hours < 24 || hours > 48)) return false;
                  if (filterM4CompanyAge === 'over48h' && hours <= 48) return false;
                  if (filterM4CompanyAge === 'over10d' && days < 10) return false;

                  const dateStrings = [
                    getAllDateRepresentations(d.createdAt),
                    getAllDateRepresentations(d.laundryReceivedAt),
                    getAllDateRepresentations(d.cleanReturnedAt),
                    getAllDateRepresentations(d.hospitalVerifiedAt),
                  ].join(' ');

                  if (m4CompanyFilterDate) {
                    const filterReps = getAllDateRepresentations(m4CompanyFilterDate).split(' ').filter(Boolean);
                    const matchesDate = filterReps.some(rep => rep.length >= 4 && dateStrings.includes(rep));
                    if (!matchesDate) return false;
                  }

                  if (searchM4Company) {
                    const q = searchM4Company.toLowerCase();
                    const matchesId = d.id.toLowerCase().includes(q) || (d.originalDispatchId && d.originalDispatchId.toLowerCase().includes(q));
                    const matchesDetails = (d.contractor || '').toLowerCase().includes(q) || (d.driver || '').toLowerCase().includes(q) || (d.plate || '').toLowerCase().includes(q);
                    const matchesItems = d.items.some(i => i.ten.toLowerCase().includes(q) || i.ma.toLowerCase().includes(q));
                    if (!matchesId && !matchesDetails && !matchesItems) return false;
                  }
                  return true;
                });

                if (companyDebts.length === 0) {
                  return (
                    <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50 text-stone-400 text-xs">
                      Trống
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {companyDebts.map(dispatch => {
                      const ageHours = getDebtAgeHours(dispatch.originalCreatedAt || dispatch.createdAt);
                      const ageDays = getDebtAgeDays(dispatch.originalCreatedAt || dispatch.createdAt);
                      
                      let ageBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      let cardBorderClass = 'border-stone-200 bg-white';
                      let ageStatusText = 'Nợ mới';

                      if (dispatch.status === 'completed') {
                        ageBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        cardBorderClass = 'border-emerald-200 bg-emerald-50/10';
                        ageStatusText = 'Đã tất toán ✓';
                      } else if (ageDays >= 10) {
                        ageBadgeClass = 'bg-red-100 text-red-800 border-red-300 animate-pulse';
                        cardBorderClass = 'border-red-300 bg-white shadow-xs shadow-red-100';
                        ageStatusText = 'Nợ nghiêm trọng 🚨';
                      } else if (ageHours > 48) {
                        ageBadgeClass = 'bg-red-50 text-red-700 border-red-200';
                        cardBorderClass = 'border-red-300 bg-white';
                        ageStatusText = 'Quá hạn >48h ⚠️';
                      } else if (ageHours >= 24) {
                        ageBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                        cardBorderClass = 'border-amber-200 bg-white';
                        ageStatusText = 'Cần đối soát 🕒';
                      }

                      const totalOwedQty = dispatch.items.reduce((sum, item) => {
                        const clean = item.hospitalReceivedQty ?? item.cleanReturnedQty ?? 0;
                        return sum + Math.max(0, item.handoverQty - clean);
                      }, 0);

                      const isFormOpen = m4SelectedCompanyDebtId === dispatch.id;
                      const isWaitingForHospitalVerify = dispatch.status === 'returning_clean';

                      return (
                        <div key={dispatch.id} className={`border rounded-2xl p-4 shadow-2xs ${cardBorderClass} transition-all hover:shadow-sm`}>
                          {/* Card Top Header */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-stone-100 mb-3">
                            <div className="space-y-1">
                              <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg inline-block">
                                {dispatch.id}
                              </span>
                              <div className="text-xs font-bold text-stone-800 flex flex-wrap items-center gap-2">
                                <span>🏢 Xưởng giặt: <strong className="text-indigo-700">{dispatch.contractor || 'Xưởng Giặt Cty'}</strong></span>
                                <span className="text-stone-300">•</span>
                                <span>🚛 Xe: <b>{dispatch.plate || 'Chưa rõ'}</b> (Tài xế: {dispatch.driver || 'Chưa rõ'})</span>
                              </div>
                            </div>
                            <div className="text-right sm:text-right text-left">
                              <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold uppercase rounded-lg border ${ageBadgeClass}`}>
                                {ageHours >= 24 ? `${ageDays} ngày` : `${ageHours} giờ`} ({ageStatusText})
                              </span>
                              <span className="block text-[9px] text-stone-400 mt-0.5 font-medium">Phát sinh: {dispatch.createdAt}</span>
                            </div>
                          </div>

                          {/* Original dispatch links and notes */}
                          {(dispatch.originalDispatchId || dispatch.lossNote) && (
                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-[10px] text-stone-600 mb-4 space-y-1">
                              {dispatch.originalDispatchId && (
                                <div>🔗 <b>Phát sinh từ hóa đơn tổng gốc:</b> <span className="font-mono font-black text-stone-900 bg-white px-1.5 border rounded flex-inline">#{dispatch.originalDispatchId}</span></div>
                              )}
                              {dispatch.lossNote && (
                                <div className="text-rose-700 font-medium">📝 <b>Lý do nợ:</b> {dispatch.lossNote}</div>
                              )}
                            </div>
                          )}

                          {/* Items table */}
                          <div className="space-y-2 mb-4">
                            <span className="block text-[10px] uppercase font-black tracking-widest text-stone-400">Danh mục đồ vải còn nợ BV</span>
                            <div className="border border-stone-200 rounded-xl overflow-x-auto text-xs bg-stone-50/55">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-stone-100 border-b border-stone-200 text-stone-500 font-bold text-[10px] uppercase">
                                    <th className="p-2">Tên đồ vải</th>
                                    <th className="p-2 text-right">Lượng dơ nhận</th>
                                    <th className="p-2 text-right">Cty đã báo sạch</th>
                                    <th className="p-2 text-right bg-rose-50 text-rose-800">Còn nợ thực tế</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200 bg-white font-medium">
                                  {dispatch.items.map(it => {
                                    const reported = it.cleanReturnedQty ?? 0;
                                    const verified = it.hospitalReceivedQty ?? it.cleanReturnedQty ?? 0;
                                    const stillOwed = Math.max(0, it.handoverQty - verified);
                                    return (
                                      <tr key={it.ma} className="hover:bg-stone-50">
                                        <td className="p-2">
                                          <div className="font-bold text-stone-800">{it.ten}</div>
                                          <span className="text-[9px] text-stone-400 font-mono">{it.ma}</span>
                                        </td>
                                        <td className="p-2 text-right font-mono text-stone-600">{it.handoverQty} cái</td>
                                        <td className="p-2 text-right font-mono text-indigo-600">{reported} cái</td>
                                        <td className="p-2 text-right font-mono font-black bg-rose-50 text-rose-700">{stillOwed} cái</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Quick Repay & Hospital Verify Workspace inside the Card */}
                          {dispatch.status === 'completed' ? (
                            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-center">
                              <span className="text-xs font-bold text-emerald-800 block">✓ ĐÃ TẤT TOÁN CÔNG NỢ XƯỞNG GIẶT</span>
                              <p className="text-[10px] text-stone-600 mt-1">
                                Chốt thu hồi nợ bởi <b>{dispatch.hospitalVerifiedBy || 'Nhân viên Đồ sạch'}</b> vào lúc {dispatch.hospitalVerifiedAt || dispatch.createdAt}.
                              </p>
                            </div>
                          ) : (
                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                              {isWaitingForHospitalVerify ? (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg">
                                    <Clock size={16} className="animate-spin text-indigo-600 shrink-0" />
                                    <div>
                                      <b>CHỜ XÁC NHẬN:</b> Xưởng giặt đã gửi khai báo trả sạch nợ vào lúc <b>{dispatch.cleanReturnedAt || 'gần đây'}</b>.
                                    </div>
                                  </div>

                                  {canVerifyCleanReturn ? (
                                    <div className="border border-purple-200 rounded-xl bg-purple-50/20 p-3 space-y-3">
                                      <h4 className="text-[11px] font-black uppercase text-purple-900 tracking-wider flex items-center gap-1">
                                        <FileCheck size={14} /> NV ĐỒ VẢI BV: KIỂM NHẬN & CHỐT PHIẾU THU HỒI NỢ
                                      </h4>
                                      <p className="text-[10px] text-stone-500">
                                        Vui lòng đếm thực tế đồ sạch công ty chở giao trả nợ, điền số lượng nhận sạch thực tế bên dưới. Nếu vẫn còn nợ, hệ thống sẽ tự động tách nợ tiếp.
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {dispatch.items.map(it => {
                                          return (
                                            <div key={it.ma} className="flex justify-between items-center bg-white border border-purple-200 px-2.5 py-1.5 rounded-lg text-xs">
                                              <span className="font-bold text-stone-700 truncate">{it.ten}</span>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <input
                                                  type="number"
                                                  defaultValue={it.cleanReturnedQty}
                                                  id={`verify-debt-${dispatch.id}-${it.ma}`}
                                                  className="w-16 h-8 border border-purple-300 rounded-lg text-center text-xs font-mono font-black bg-purple-50 focus:bg-white text-purple-900 focus:ring-1 focus:ring-purple-500"
                                                />
                                                <span className="text-[10px] text-stone-400">/ nợ {it.handoverQty}</span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="flex justify-end pt-1">
                                        <button
                                          onClick={() => {
                                            const verifyQtys: Record<string, number> = {};
                                            dispatch.items.forEach(it => {
                                              const el = document.getElementById(`verify-debt-${dispatch.id}-${it.ma}`) as HTMLInputElement;
                                              verifyQtys[it.ma] = el ? Math.max(0, parseInt(el.value) || 0) : (it.cleanReturnedQty ?? 0);
                                            });
                                            handleHospitalVerifyM4DebtReturn(dispatch.id, verifyQtys);
                                          }}
                                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold uppercase rounded-lg shadow-sm transition-all"
                                        >
                                          Xác Nhận Đủ Sạch & Chốt Thu Hồi Nợ ✅
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-2 bg-stone-100 rounded-lg text-[10px] text-stone-500 italic">
                                      Vui lòng liên hệ Nhân viên đồ vải Bệnh viện kiểm đếm thực tế đồ sạch để hoàn thành chốt bill nợ này.
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  {isFormOpen ? (
                                    <div className="space-y-3 bg-white p-3 rounded-xl border border-amber-300">
                                      <div className="flex justify-between items-center pb-1 border-b border-stone-100">
                                        <span className="text-[11px] font-black uppercase text-amber-900">
                                          🚚 XƯỞNG GIẶT KHAI BÁO TRẢ SẠCH NỢ
                                        </span>
                                        <button onClick={() => setM4SelectedCompanyDebtId(null)} className="text-stone-400 hover:text-stone-600">
                                          <X size={14} />
                                        </button>
                                      </div>
                                      <p className="text-[10px] text-stone-500 leading-relaxed">
                                        Nhập số lượng đồ vải sạch thực tế xưởng đã giặt xong và chuyển trả bù cho bệnh viện. Sau khi gửi, thủ kho BV sẽ đếm thực tế để chốt duyệt.
                                      </p>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {dispatch.items.map(it => {
                                          const stillOwed = Math.max(0, it.handoverQty - (it.hospitalReceivedQty ?? 0));
                                          return (
                                            <div key={it.ma} className="flex justify-between items-center bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-lg text-xs">
                                              <span className="font-bold text-stone-700 truncate">{it.ten}</span>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <input
                                                  type="number"
                                                  defaultValue={stillOwed}
                                                  id={`repay-debt-${dispatch.id}-${it.ma}`}
                                                  className="w-16 h-8 border border-amber-300 rounded-lg text-center text-xs font-mono font-black bg-white text-stone-900 focus:ring-1 focus:ring-amber-500"
                                                />
                                                <span className="text-[10px] text-stone-400">/ nợ {stillOwed}</span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      <div className="flex justify-end gap-2 pt-1">
                                        <button
                                          onClick={() => setM4SelectedCompanyDebtId(null)}
                                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-lg"
                                        >
                                          Đóng
                                        </button>
                                        <button
                                          onClick={() => {
                                            const repayQtys: Record<string, number> = {};
                                            dispatch.items.forEach(it => {
                                              const el = document.getElementById(`repay-debt-${dispatch.id}-${it.ma}`) as HTMLInputElement;
                                              const stillOwed = Math.max(0, it.handoverQty - (it.hospitalReceivedQty ?? 0));
                                              repayQtys[it.ma] = el ? Math.max(0, parseInt(el.value) || 0) : stillOwed;
                                            });
                                            handleCompanySubmitM4DebtReturn(dispatch.id, repayQtys);
                                          }}
                                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold uppercase rounded-lg shadow-sm font-black"
                                        >
                                          Gửi Khai Báo Trả Nợ Sạch 🚀
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex justify-between items-center flex-wrap gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                                        <span className="text-xs font-bold text-rose-700">Đang nợ bệnh viện: {totalOwedQty} cái đồ vải sạch</span>
                                      </div>
                                      {checkPermission('laundry') || effectiveIsLaundryUser ? (
                                        <button
                                          onClick={() => {
                                            setM4SelectedCompanyDebtId(dispatch.id);
                                          }}
                                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold uppercase rounded-lg shadow-sm transition-all flex items-center gap-1.5 font-black"
                                        >
                                          🚀 Trả Nợ Sạch Nhanh
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-stone-500 font-medium italic">
                                          Vui lòng chờ xưởng giặt trả sạch đồ nợ
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ======================= CREATE SLIP MODAL ======================= */}
      {isCreatingSlip && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#1A1A1A] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 bg-stone-100 border-b border-stone-300 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide">
                  {draftIsRewash ? '🔄 Tạo Phiếu Gửi Giặt Lại (Rewash)' : 'Tạo Phiếu Khai Báo Giao Nhận Đồ Vải Dơ'}
                </h3>
                <span className="text-[10px] text-stone-500">
                  {draftIsRewash ? 'Mẫu B1-R: Đồ sạch dơ, cần giặt lại' : 'Mẫu B1: Khoa Lâm Sàng tạo đơn dơ'}
                </span>
              </div>
              <button
                onClick={() => setIsCreatingSlip(false)}
                className="p-1 text-stone-400 hover:text-stone-950 rounded-full hover:bg-stone-200 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Dept and creator fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] uppercase font-black tracking-widest text-stone-500">
                      Khoa phòng bàn giao
                    </label>
                    {isOrderlyUser && (
                      <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 normal-case shadow-2xs">
                        💡 Hộ lý chọn khoa khác giao dùm
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedDept}
                    onChange={e => handleDeptChange(e.target.value)}
                    disabled={(effectiveIsWardUser && !isOrderlyUser) && !checkPermission('linen') && !currentAccount?.isAdmin}
                    className={`w-full border border-stone-300 rounded-lg p-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-500 ${((effectiveIsWardUser && !isOrderlyUser) && !checkPermission('linen') && !currentAccount?.isAdmin) ? 'bg-stone-200 cursor-not-allowed opacity-80' : 'bg-stone-50'}`}
                  >
                    {deptsToUse.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-stone-500 mb-1">
                    Nhân viên giao (Ký nhận)
                  </label>
                  <input
                    type="text"
                    value={slipCreator}
                    onChange={e => setSlipCreator(e.target.value)}
                    placeholder="Nhập họ tên điều dưỡng / buồng phòng..."
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                </div>
              </div>

              {selectedDept.startsWith('Khách') && (
                <div className="p-4 bg-amber-50/90 border-2 border-amber-400 rounded-xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                      🛏️ PHIẾU ĐỒ VẢI KHÁCH VIP (NV BUỒNG PHÒNG)
                    </span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                      Tách Bill Riêng • Không trộn đồ chung
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-amber-800 mb-1">
                        Tên Khách VIP / Ghi chú
                      </label>
                      <input
                        type="text"
                        value={draftGuestName}
                        onChange={e => setDraftGuestName(e.target.value)}
                        placeholder="VD: Khách VIP Nguyễn Văn A..."
                        className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-amber-800 mb-1">
                        Số Phòng Khách
                      </label>
                      <input
                        type="text"
                        value={draftGuestRoom}
                        onChange={e => setDraftGuestRoom(e.target.value)}
                        placeholder="VD: VIP 502, P.301..."
                        className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/80">
                    <label className="block text-[10px] uppercase font-black text-amber-900 mb-1.5 flex items-center justify-between">
                      <span>📸 HÌNH ẢNH ĐÍNH KÈM (BILL RIÊNG ĐỒ KHÁCH)</span>
                      <span className="text-[9px] font-normal text-amber-700">Đi kèm bill suốt quá trình (giặt & trả sạch)</span>
                    </label>

                    {draftAttachedImage ? (
                      <div className="bg-white p-3 rounded-lg border border-amber-300 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img src={draftAttachedImage} alt="Preview" className="w-16 h-16 object-cover rounded border border-stone-200 shadow-xs shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-stone-800">✓ Đã đính kèm ảnh chụp đồ vải Khách</p>
                            <p className="text-[10px] text-stone-500">Ảnh này sẽ hiển thị cho User công ty giặt khi mở bill và khi kiểm trả sạch.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDraftAttachedImage(undefined)}
                          className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-all shrink-0"
                        >
                          🗑️ Xóa ảnh
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs">
                          <span>📷 Chụp ảnh / Chọn từ máy</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleQuickTestImage}
                          className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg transition-all"
                        >
                          🖼️ Chèn ảnh chụp mẫu (Test nhanh)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500">
                    Số lượng đồ vải dơ bàn giao
                  </span>
                  <label className="flex items-center gap-2 px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer transition-all shadow-2xs select-none">
                    <input
                      type="checkbox"
                      checked={draftItems.length > 0 && draftItems.every(i => i.isInfectious)}
                      onChange={e => {
                        const checked = e.target.checked;
                        setDraftItems(prev => prev.map(item => ({ ...item, isInfectious: checked })));
                      }}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-red-700">⚠️ Đánh dấu toàn bộ đồ vải lây nhiễm</span>
                  </label>
                </div>

                <div className="border border-stone-200 rounded-lg overflow-auto bg-stone-50 max-h-[320px]">
                  {/* Table view for Desktop */}
                  <table className="hidden md:table w-full text-left text-xs">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                        <th className="p-2">Tên đồ vải</th>
                        <th className="p-2 w-36">{draftIsRewash ? 'Nhóm / Tồn sạch' : 'Nhóm / Định mức'}</th>
                        <th className="p-2 text-center w-24">Lây nhiễm</th>
                        <th className="p-2 text-center w-28">{draftIsRewash ? 'Số lượng rewash' : 'Số lượng dơ'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {draftItems.map((item, index) => {
                        const allocTuple = (detailAllocations[item.ma] || []).find(([d]) => d === selectedDept);
                        const maxAlloc = allocTuple ? allocTuple[1] : 0;

                        return (
                          <tr key={item.ma} className="hover:bg-stone-50">
                            <td className="p-2">
                              {item.isCustom ? (
                                <input
                                  type="text"
                                  placeholder="✏️ Tự đánh chữ tên đồ vải (ngoài danh mục)..."
                                  value={item.ten}
                                  onChange={e => {
                                    const next = [...draftItems];
                                    next[index].ten = e.target.value;
                                    setDraftItems(next);
                                  }}
                                  className="w-full bg-amber-50 border border-amber-300 rounded-lg p-1.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
                                />
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-stone-800">{item.ten}</span>
                                  {item.isInfectious && (
                                    <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-red-200">
                                      ⚠️ Lây nhiễm
                                    </span>
                                  )}
                                </div>
                              )}
                              <span className="text-[9px] text-stone-400 font-mono block">{item.ma}</span>
                            </td>
                            <td className="p-2">
                              <span className="text-stone-500 text-[10px] block font-medium">{item.group}</span>
                              {item.isCustom ? (
                                <span className="inline-block mt-1 text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                                  Ngoài danh mục
                                </span>
                              ) : draftIsRewash ? (
                                <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  (temporaryCleanStore[item.ma] || 0) > 0 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold' 
                                    : 'bg-stone-50 text-stone-400 border-stone-200'
                                }`}>
                                  Tồn sạch: {temporaryCleanStore[item.ma] || 0} cái
                                </span>
                              ) : (
                                <span className="inline-block mt-1 text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                  Hạn mức: {maxAlloc} cái
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1 rounded hover:bg-red-50 transition-all">
                                <input
                                  type="checkbox"
                                  checked={item.isInfectious}
                                  onChange={() => {
                                    const next = [...draftItems];
                                    next[index].isInfectious = !next[index].isInfectious;
                                    setDraftItems(next);
                                  }}
                                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                                />
                              </label>
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  className="w-20 h-10 border border-stone-300 rounded-lg text-center py-1.5 text-sm font-mono font-black text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={item.qty}
                                  onChange={e => {
                                    const next = [...draftItems];
                                    next[index].qty = Math.max(0, parseInt(e.target.value) || 0);
                                    setDraftItems(next);
                                  }}
                                />
                                {item.isCustom && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDraftItem(item.ma)}
                                    className="w-10 h-10 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all rounded-lg flex items-center justify-center ml-1"
                                    title="Xóa khỏi phiếu dơ"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Interactive row for adding custom item outside catalog - ONLY FOR KHÁCH / VIP */}
                      {selectedDept.startsWith('Khách') && (
                        <tr className="bg-blue-50/40 border-t border-stone-300">
                          <td className="p-2" colSpan={2}>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase font-black tracking-widest text-blue-700 block">
                                ➕ Thêm đồ vải ngoài danh mục
                              </span>
                              <input
                                type="text"
                                placeholder="Nhập tên đồ vải ngoài danh mục..."
                                value={customName}
                                onChange={e => setCustomName(e.target.value)}
                                className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-500"
                              />
                            </div>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <label className="flex flex-col items-center justify-center gap-1 cursor-pointer mt-4 select-none">
                              <input
                                type="checkbox"
                                checked={customInfectious}
                                onChange={e => setCustomInfectious(e.target.checked)}
                                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                              />
                              <span className="text-[9px] font-bold text-red-600">Lây nhiễm</span>
                            </label>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1 mt-4">
                              <div className="flex flex-col items-center">
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="SL"
                                  value={customQty}
                                  onChange={e => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-16 h-10 border border-stone-300 rounded-lg text-center text-sm font-mono font-black text-stone-900 bg-white focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleAddCustomDraftFromTable}
                                className="h-10 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg shadow-sm flex items-center justify-center transition-all font-black"
                              >
                                Thêm
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Card-based view for Mobile */}
                  <div className="block md:hidden divide-y divide-stone-200 bg-white">
                    {draftItems.map((item, index) => {
                      const allocTuple = (detailAllocations[item.ma] || []).find(([d]) => d === selectedDept);
                      const maxAlloc = allocTuple ? allocTuple[1] : 0;

                      return (
                        <div key={item.ma} className="p-3 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              {item.isCustom ? (
                                <input
                                  type="text"
                                  placeholder="✏️ Tự đánh chữ tên đồ vải..."
                                  value={item.ten}
                                  onChange={e => {
                                    const next = [...draftItems];
                                    next[index].ten = e.target.value;
                                    setDraftItems(next);
                                  }}
                                  className="w-full bg-amber-50 border border-amber-300 rounded-lg p-1.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
                                />
                              ) : (
                                <div className="font-bold text-stone-800 text-xs">
                                  {item.ten}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="text-[9px] text-stone-400 font-mono block">{item.ma}</span>
                                <span className="text-[9px] text-stone-500 block font-medium">({item.group})</span>
                              </div>
                            </div>

                            <label className="flex items-center gap-1.5 px-2 py-1 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 cursor-pointer transition-all shrink-0 select-none">
                              <input
                                type="checkbox"
                                checked={item.isInfectious}
                                onChange={() => {
                                  const next = [...draftItems];
                                  next[index].isInfectious = !next[index].isInfectious;
                                  setDraftItems(next);
                                }}
                                className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                              />
                              <span className="text-[10px] font-bold text-red-700">Lây nhiễm</span>
                            </label>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-dashed border-stone-100">
                            <div>
                              {item.isCustom ? (
                                <span className="inline-block text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                                  Ngoài danh mục
                                </span>
                              ) : draftIsRewash ? (
                                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  (temporaryCleanStore[item.ma] || 0) > 0 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold' 
                                    : 'bg-stone-50 text-stone-400 border-stone-200'
                                }`}>
                                  Tồn sạch: {temporaryCleanStore[item.ma] || 0}
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                  Hạn mức: {maxAlloc}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min="0"
                                className="w-14 h-8 border border-stone-300 rounded-lg text-center py-1 text-xs font-mono font-black text-stone-900 bg-stone-50 focus:bg-white focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={item.qty}
                                onChange={e => {
                                  const next = [...draftItems];
                                  next[index].qty = Math.max(0, parseInt(e.target.value) || 0);
                                  setDraftItems(next);
                                }}
                              />
                              {item.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDraftItem(item.ma)}
                                  className="w-8 h-8 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all rounded-lg flex items-center justify-center ml-1"
                                  title="Xóa khỏi phiếu dơ"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Interactive form for adding custom item outside catalog on Mobile - ONLY FOR KHÁCH / VIP */}
                    {selectedDept.startsWith('Khách') && (
                      <div className="p-3 bg-blue-50/40 border-t border-stone-200 space-y-3">
                        <span className="text-[10px] uppercase font-black tracking-widest text-blue-700 block">
                          ➕ Thêm đồ vải ngoài danh mục
                        </span>
                        <input
                          type="text"
                          placeholder="Nhập tên đồ vải ngoài danh mục..."
                          value={customName}
                          onChange={e => setCustomName(e.target.value)}
                          className="w-full bg-white border border-stone-300 rounded-lg p-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-500"
                        />
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={customInfectious}
                              onChange={e => setCustomInfectious(e.target.checked)}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-red-600">Lây nhiễm</span>
                          </label>
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              placeholder="SL"
                              value={customQty}
                              onChange={e => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 h-8 border border-stone-300 rounded-lg text-center text-xs font-mono font-black text-stone-900 bg-white focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={handleAddCustomDraftFromTable}
                              className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg shadow-sm flex items-center justify-center transition-all font-black"
                            >
                              Thêm
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit triggers */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  onClick={() => setIsCreatingSlip(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold uppercase rounded-lg transition-all"
                >
                  Đóng
                </button>
                <button
                  onClick={handleSubmitSlip}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg shadow-md transition-all font-black"
                >
                  Gửi phiếu dơ 🚀
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Dialog: Confirm Delete Pending Slip */}
      {confirmDelSlipId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-stone-200 p-6 fade-in text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
              🗑️
            </div>
            <h3 className="font-serif font-black text-lg text-stone-800 mb-2">Xóa Phiếu Dơ Chưa Duyệt?</h3>
            <p className="text-xs text-stone-500 mb-6">
              Bạn đang chuẩn bị xóa vĩnh viễn phiếu <strong className="text-stone-800 font-mono">{confirmDelSlipId}</strong>. Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelSlipId(null)}
                className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  const updated = wardDeliverySlips.filter(s => s.id !== confirmDelSlipId);
                  onUpdateWardDeliverySlips(updated);
                  if (activeSlipId === confirmDelSlipId) {
                    setActiveSlipId(null);
                  }
                  setConfirmDelSlipId(null);
                  showToast(`🗑️ Đã xóa phiếu dơ ${confirmDelSlipId} thành công.`, 'info');
                }}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-500/20"
              >
                Chắc chắn xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Adjust Temporary Dirty Store */}
      {isAdjustingDirtyStore && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200 p-6 fade-in flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-stone-200">
              <h3 className="font-serif font-black text-lg text-stone-800 flex items-center gap-2">
                ⚙️ Điều Chỉnh Tồn Kho Dơ Tạm
              </h3>
              <button
                onClick={() => setIsAdjustingDirtyStore(false)}
                className="text-stone-400 hover:text-stone-600 transition-all text-sm font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-stone-500 mt-2.5 mb-4 leading-relaxed">
              Dùng để điều chỉnh số lượng thực tế trong <strong>Kho dơ tạm của Bệnh viện</strong> khi phát hiện hao hụt, mất mát khi thu gom, hoặc sai lệch đếm thực tế so với phiếu. Số liệu cập nhật sẽ đồng bộ vào hệ thống.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              <div className="border border-stone-200 rounded-xl overflow-x-auto bg-stone-50">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                      <th className="p-2.5">Tên đồ vải</th>
                      <th className="p-2.5 text-center w-24">Tồn dơ hiện tại</th>
                      <th className="p-2.5 text-center w-36">Số lượng mới</th>
                      <th className="p-2.5 text-center w-20">Chênh lệch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {Object.keys(dirtyStoreAdjustmentQtys).length > 0 ? (
                      Object.keys(dirtyStoreAdjustmentQtys).map(ma => {
                        const item = items.find(i => i.ma === ma);
                        const oldQty = temporaryDirtyStore[ma] || 0;
                        const newQty = dirtyStoreAdjustmentQtys[ma] ?? oldQty;
                        const diff = newQty - oldQty;

                        return (
                          <tr key={ma} className="hover:bg-stone-50">
                            <td className="p-2.5">
                              <span className="font-bold text-stone-800 block text-[11px]">{item?.ten || ma}</span>
                              <span className="font-mono text-[9px] text-stone-400">{ma}</span>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-stone-600">
                              {oldQty}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  className="w-14 h-7 border border-stone-300 rounded-md text-center text-xs font-mono font-black bg-stone-50 text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={newQty}
                                  onChange={e => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setDirtyStoreAdjustmentQtys(prev => ({
                                      ...prev,
                                      [ma]: val
                                    }));
                                  }}
                                />
                              </div>
                            </td>
                            <td className={`p-2.5 text-center font-mono font-bold text-[11px] ${
                              diff < 0 ? 'text-red-600' : diff > 0 ? 'text-emerald-600' : 'text-stone-400'
                            }`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-stone-400 italic">
                          Không có mặt hàng nào đang tồn trong Kho dơ tạm để điều chỉnh!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {Object.keys(dirtyStoreAdjustmentQtys).length > 0 && (
                <div className="space-y-1.5 mt-3">
                  <label className="block text-[10px] uppercase font-black tracking-widest text-stone-500">
                    Lý do điều chỉnh / cân chỉnh
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Hao hụt thực tế thu gom',
                      'Lệch đếm chênh lệch khoa phòng',
                      'Xác nhận mất mát xưởng giặt',
                      'Khai báo thất thoát đồ dơ'
                    ].map(reason => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setAdjustDirtyReason(reason)}
                        className={`p-2 rounded-lg text-left text-xs font-medium border transition-all cursor-pointer ${
                          adjustDirtyReason === reason
                            ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Hoặc tự nhập lý do khác..."
                    value={adjustDirtyReason}
                    onChange={e => setAdjustDirtyReason(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-stone-200 mt-4">
              <button
                onClick={() => setIsAdjustingDirtyStore(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={handleSaveDirtyStoreAdjustment}
                disabled={Object.keys(dirtyStoreAdjustmentQtys).length === 0}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md font-black cursor-pointer"
              >
                Cập Nhật & Cân Đối ✅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Custom Confirmation popup for data cleanup (prevents window.confirm iframe blockage) */}
      {cleanupPendingType && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-51 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center gap-3 text-red-600 pb-2 border-b border-stone-100">
              <span className="text-2xl">⚠️</span>
              <h4 className="font-serif font-black text-base uppercase tracking-tight text-stone-800">
                Xác nhận xóa dữ liệu
              </h4>
            </div>
            
            <p className="text-xs text-stone-600 mt-4 leading-relaxed font-medium">
              {cleanupPendingType === 'all' && (
                <span className="text-red-700 font-bold block mb-1">
                  Cảnh báo: Bạn đang yêu cầu RESET TOÀN BỘ HỆ THỐNG!
                  <span className="block font-normal text-stone-600 mt-1.5">
                    Thao tác này sẽ xóa sạch tất cả phiếu giao dơ, phiếu trả sạch, số liệu tồn dơ tạm, tồn sạch tạm, nợ nần của các khoa phòng, và dọn sạch lịch sử hoạt động. Hệ thống sẽ trở về trạng thái trống ban đầu để kiểm tra lại từ đầu.
                  </span>
                </span>
              )}
              {cleanupPendingType === 'wardSlips' && 'Bạn có chắc chắn muốn Xóa toàn bộ DANH SÁCH PHIẾU GIAO ĐỒ DƠ của các khoa lâm sàng?'}
              {cleanupPendingType === 'laundryDispatches' && 'Bạn có chắc chắn muốn Xóa toàn bộ DANH SÁCH BÀN GIAO & TRẢ SẠCH với công ty giặt?'}
              {cleanupPendingType === 'dirtyStore' && 'Bạn có chắc chắn muốn RESET KHO DƠ TẠM của bệnh viện về 0 cái?'}
              {cleanupPendingType === 'cleanStore' && 'Bạn có chắc chắn muốn RESET KHO SẠCH TẠM (Chờ chia trả khoa) về 0 cái?'}
              {cleanupPendingType === 'onlyInventory' && 'Bạn có chắc chắn muốn reset toàn bộ số lượng tồn kho của 3 phân hệ về 0? (Lịch sử các phiếu giao nhận vẫn được giữ nguyên).'}
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCleanupPendingType(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer font-black border border-stone-200"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => executeConfirmedCleanup(cleanupPendingType)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md shadow-red-500/10 active:scale-95"
              >
                Đồng ý Xóa ngay 🧹
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
