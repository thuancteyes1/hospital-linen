/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  LinenItem, 
  WardDeliverySlip, 
  LaundryDispatch, 
  Account, 
  User, 
  Role 
} from '../../types';
import { checkPermission } from './utils/checkPermission';
import M4StatsGrid from './m4/M4StatsGrid';
import M4WardDebtsSection from './m4/M4WardDebtsSection';
import M4CompanyDebtsSection from './m4/M4CompanyDebtsSection';

interface M4CompanyDebtProps {
  items: LinenItem[];
  currentAccount: Account | null;
  users: User[];
  roles: Role[];
  wardDeliverySlips: WardDeliverySlip[];
  laundryDispatches: LaundryDispatch[];
  temporaryCleanStore: Record<string, number>;
  temporaryCompanyDirtyStore: Record<string, number>;
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
  }) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  setActiveMuc: (muc: number) => void;
  setM3SubTab?: (tab: 'clean-ward' | 'ward-debt') => void;
  setSelectedM1SlipIdForCleanReturn?: (id: string | null) => void;
  setM3ItemCleanReturnQtys?: (qtys: Record<string, number>) => void;
}

export default function M4CompanyDebt({
  items,
  currentAccount,
  users,
  roles,
  wardDeliverySlips,
  laundryDispatches,
  temporaryCleanStore,
  temporaryCompanyDirtyStore,
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
  showToast,
  setActiveMuc,
  setM3SubTab,
  setSelectedM1SlipIdForCleanReturn,
  setM3ItemCleanReturnQtys
}: M4CompanyDebtProps) {
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

  // Parse custom Vietnamese date
  const parseViDate = (dateStr: string): Date => {
    try {
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const year = parseInt(match[3]);
        
        const timeMatch = dateStr.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/);
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

  const getDebtAgeDays = (createdAtStr: string): number => {
    const createdDate = parseViDate(createdAtStr);
    const diffTime = Date.now() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getDebtAgeHours = (createdAtStr: string): number => {
    const createdDate = parseViDate(createdAtStr);
    const diffTime = Date.now() - createdDate.getTime();
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    return Math.max(0, diffHours);
  };

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

  // Tabs
  const [m4ActiveTab, setM4ActiveTab] = useState<'ward' | 'company'>('ward');
  const [m2DebtTab, setM2DebtTab] = useState<'all' | 'over48h'>('all');

  // Filters for ward debts
  const [m4WardFilterDate, setM4WardFilterDate] = useState('');
  const [searchM4Ward, setSearchM4Ward] = useState('');
  const [filterM4WardDept, setFilterM4WardDept] = useState('Tất cả');
  const [filterM4WardAge, setFilterM4WardAge] = useState<'Tất cả' | 'under24h' | '24to48h' | 'over48h' | 'over10d'>('Tất cả');

  // Filters for company debts
  const [m4CompanyFilterDate, setM4CompanyFilterDate] = useState('');
  const [searchM4Company, setSearchM4Company] = useState('');
  const [filterM4CompanyAge, setFilterM4CompanyAge] = useState<'Tất cả' | 'under24h' | '24to48h' | 'over48h' | 'over10d'>('Tất cả');

  // Interactive inline settlement for ward debts
  const [inlineSettleSlipId, setInlineSettleSlipId] = useState<string | null>(null);
  const [inlineSettleQtys, setInlineSettleQtys] = useState<Record<string, number>>({});

  // Interactive inline settlement for company debts (laundry side)
  const [m4SelectedCompanyDebtId, setM4SelectedCompanyDebtId] = useState<string | null>(null);

  // Settlement for ward debts
  const handleReturnCleanM3 = (slipId: string, itemQtys: Record<string, number>) => {
    const slip = wardDeliverySlips.find(s => s.id === slipId);
    if (!slip) return;

    const nextCleanStore = { ...temporaryCleanStore };
    const resolvedItems = slip.items.map(item => {
      const repayQty = itemQtys[item.ma] !== undefined ? itemQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty);
      nextCleanStore[item.ma] = Math.max(0, (nextCleanStore[item.ma] || 0) - repayQty);
      return {
        ...item,
        cleanReturnedQty: (item.cleanReturnedQty || 0) + repayQty,
        isCleanReturned: true
      };
    });

    const isFullyPaid = resolvedItems.every(it => {
      const totalPaid = it.cleanReturnedQty || 0;
      const totalOwed = it.verifiedDirtyQty ?? it.qty;
      return totalPaid >= totalOwed;
    });

    const nextSlips = wardDeliverySlips.map(s => {
      if (s.id === slipId) {
        return {
          ...s,
          status: (isFullyPaid ? 'completed' : 'verified_dirty') as any,
          items: resolvedItems,
          hospitalCleanBy: currentAccount?.name || 'Nhân viên đồ vải',
          hospitalCleanAt: new Date().toLocaleString('vi-VN')
        };
      }
      return s;
    });

    onUpdateDeliveryStates({
      wardSlips: nextSlips,
      temporaryCleanStore: nextCleanStore
    });

    showToast(`✓ Đã trả bù sạch ${isFullyPaid ? 'đầy đủ' : 'một phần'} cho Phiếu nợ ${slipId}!`, 'success');
  };

  // Company notifies return
  const handleCompanySubmitM4DebtReturn = (dispatchId: string, repayQtys: Record<string, number>) => {
    const dispatch = laundryDispatches.find(d => d.id === dispatchId);
    if (!dispatch) return;

    const updatedItems = dispatch.items.map(item => {
      const repayQty = repayQtys[item.ma] ?? 0;
      return {
        ...item,
        cleanReturnedQty: repayQty,
        isCleanChecked: true
      };
    });

    const nextDispatches = laundryDispatches.map(d => {
      if (d.id === dispatchId) {
        return {
          ...d,
          status: 'returning_clean' as const,
          items: updatedItems,
          cleanReturnedAt: new Date().toLocaleString('vi-VN')
        };
      }
      return d;
    });

    onUpdateDeliveryStates({ laundryDispatches: nextDispatches });
    showToast(`✓ Xưởng giặt đã gửi báo trả sạch cho bill nợ ${dispatchId}! Chờ BV xác nhận.`, 'success');
    setM4SelectedCompanyDebtId(null);
  };

  // Hospital staff verifies company return
  const handleHospitalVerifyM4DebtReturn = (dispatchId: string, verifyQtys: Record<string, number>) => {
    const dispatch = laundryDispatches.find(d => d.id === dispatchId);
    if (!dispatch) return;

    const updatedItems = dispatch.items.map(item => {
      const verifiedQty = verifyQtys[item.ma] ?? 0;
      return {
        ...item,
        hospitalReceivedQty: verifiedQty,
        isCleanChecked: true
      };
    });

    const isFullyPaid = updatedItems.every(it => {
      const totalPaid = it.hospitalReceivedQty ?? 0;
      return totalPaid >= it.handoverQty;
    });

    const nextDispatches = laundryDispatches.filter(d => d.id !== dispatchId);
    
    if (isFullyPaid) {
      const closedDispatch: LaundryDispatch = {
        ...dispatch,
        status: 'completed' as const,
        items: updatedItems,
        hospitalVerifiedBy: currentAccount?.name || 'Nhân viên Đồ vải',
        hospitalVerifiedAt: new Date().toLocaleString('vi-VN')
      };
      nextDispatches.unshift(closedDispatch);
    } else {
      const partialDispatch: LaundryDispatch = {
        ...dispatch,
        status: 'pending_laundry' as const,
        items: updatedItems,
        hospitalVerifiedBy: currentAccount?.name || 'Nhân viên Đồ vải',
        hospitalVerifiedAt: new Date().toLocaleString('vi-VN')
      };
      nextDispatches.unshift(partialDispatch);

      const debtBillId = `BILL-NỢ-CTY-${Date.now().toString().slice(-4)}`;
      const remainingItems = updatedItems.map(it => {
        const remaining = Math.max(0, it.handoverQty - (it.hospitalReceivedQty ?? 0));
        return {
          ...it,
          handoverQty: remaining,
          cleanReturnedQty: 0,
          hospitalReceivedQty: undefined,
          isCleanChecked: false
        };
      }).filter(it => it.handoverQty > 0);

      const debtDispatch: LaundryDispatch = {
        id: debtBillId,
        createdAt: new Date().toLocaleString('vi-VN'),
        originalCreatedAt: dispatch.originalCreatedAt || dispatch.createdAt,
        originalDispatchId: dispatch.id,
        contractor: dispatch.contractor,
        driver: dispatch.driver,
        plate: dispatch.plate,
        status: 'pending_laundry' as const,
        items: remainingItems,
        linkedSlipIds: dispatch.linkedSlipIds,
        lossNote: `Nợ chưa trả hết phát sinh từ ${dispatchId}`
      };
      nextDispatches.unshift(debtDispatch);
    }

    const nextCleanStore = { ...temporaryCleanStore };
    const nextCompanyDirtyStore = { ...temporaryCompanyDirtyStore };
    updatedItems.forEach(item => {
      const cleanQty = item.hospitalReceivedQty ?? item.cleanReturnedQty;
      nextCleanStore[item.ma] = (nextCleanStore[item.ma] || 0) + cleanQty;
      nextCompanyDirtyStore[item.ma] = Math.max(0, (nextCompanyDirtyStore[item.ma] || 0) - cleanQty);
    });

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

    onUpdateDeliveryStates({
      laundryDispatches: nextDispatches,
      wardSlips: updatedSlips,
      temporaryCleanStore: nextCleanStore,
      temporaryCompanyDirtyStore: nextCompanyDirtyStore
    });

    showToast(`✓ Nhân viên Bệnh viện đã chốt duyệt thu hồi nợ của bill ${dispatchId}!`, 'success');
  };

  const wardDebtsList = wardDeliverySlips.filter(s => s.id.startsWith('NỢ-') && s.status !== 'completed');
  const companyDebtsList = laundryDispatches.filter(d => d.id.startsWith('BILL-NỢ-CTY-') && d.status !== 'completed');

  const totalWardOwedQty = wardDebtsList.reduce((acc, s) => {
    return acc + s.items.reduce((sAcc, item) => sAcc + (item.verifiedDirtyQty ?? item.qty), 0);
  }, 0);

  const totalCompanyOwedQty = companyDebtsList.reduce((acc, d) => {
    return acc + d.items.reduce((sAcc, item) => {
      const clean = item.hospitalReceivedQty ?? item.cleanReturnedQty ?? 0;
      return sAcc + Math.max(0, item.handoverQty - clean);
    }, 0);
  }, 0);

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

  const wardOverdueCount = wardDebtsList.filter(s => getDebtAgeDays(s.originalCreatedAt || s.createdAt) >= 5).length;
  const companyOverdueCount = companyDebtsList.filter(d => getDebtAgeDays(d.originalCreatedAt || d.createdAt) >= 5).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats Bento Grid */}
      <M4StatsGrid
        wardDebtsList={wardDebtsList}
        companyDebtsList={companyDebtsList}
        totalWardOwedQty={totalWardOwedQty}
        totalCompanyOwedQty={totalCompanyOwedQty}
        oldestWardAge={oldestWardAge}
        oldestCompanyAge={oldestCompanyAge}
        wardOverdueCount={wardOverdueCount}
        companyOverdueCount={companyOverdueCount}
      />

      {/* Sub Tab Buttons */}
      <div className="flex border-b border-stone-200 gap-1 bg-stone-100/80 p-1 rounded-xl">
        <button
          onClick={() => setM4ActiveTab('ward')}
          className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            m4ActiveTab === 'ward'
              ? 'bg-white text-rose-700 shadow-sm font-black'
              : 'text-stone-600 hover:text-stone-900 font-bold'
          }`}
        >
          🏥 Nợ Khoa Phòng Lâm Sàng ({wardDebtsList.length})
        </button>
        <button
          onClick={() => setM4ActiveTab('company')}
          className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            m4ActiveTab === 'company'
              ? 'bg-white text-amber-700 shadow-sm font-black'
              : 'text-stone-600 hover:text-stone-900 font-bold'
          }`}
        >
          🚚 Nợ Xưởng Giặt Công Ty ({companyDebtsList.length})
        </button>
      </div>

      {/* WARD DEBTS TAB */}
      {m4ActiveTab === 'ward' && (
        <M4WardDebtsSection
          wardDeliverySlips={wardDeliverySlips}
          m4WardFilterDate={m4WardFilterDate}
          setM4WardFilterDate={setM4WardFilterDate}
          searchM4Ward={searchM4Ward}
          setSearchM4Ward={setSearchM4Ward}
          filterM4WardDept={filterM4WardDept}
          setFilterM4WardDept={setFilterM4WardDept}
          filterM4WardAge={filterM4WardAge}
          setFilterM4WardAge={setFilterM4WardAge}
          deptsToUse={deptsToUse}
          effectiveIsWardUser={effectiveIsWardUser}
          isOrderlyUser={isOrderlyUser}
          currentWardName={currentWardName}
          getDebtAgeHours={getDebtAgeHours}
          getDebtAgeDays={getDebtAgeDays}
          getAllDateRepresentations={getAllDateRepresentations}
          inlineSettleSlipId={inlineSettleSlipId}
          setInlineSettleSlipId={setInlineSettleSlipId}
          inlineSettleQtys={inlineSettleQtys}
          setInlineSettleQtys={setInlineSettleQtys}
          temporaryCleanStore={temporaryCleanStore}
          canVerifyCleanReturn={canVerifyCleanReturn}
          handleReturnCleanM3={handleReturnCleanM3}
          setActiveMuc={setActiveMuc}
          setM3SubTab={setM3SubTab}
          setSelectedM1SlipIdForCleanReturn={setSelectedM1SlipIdForCleanReturn}
          setM3ItemCleanReturnQtys={setM3ItemCleanReturnQtys}
        />
      )}

      {/* COMPANY DEBTS TAB */}
      {m4ActiveTab === 'company' && (
        <M4CompanyDebtsSection
          laundryDispatches={laundryDispatches}
          m2DebtTab={m2DebtTab}
          setM2DebtTab={setM2DebtTab}
          m4CompanyFilterDate={m4CompanyFilterDate}
          setM4CompanyFilterDate={setM4CompanyFilterDate}
          searchM4Company={searchM4Company}
          setSearchM4Company={setSearchM4Company}
          filterM4CompanyAge={filterM4CompanyAge}
          setFilterM4CompanyAge={setFilterM4CompanyAge}
          getDebtAgeHours={getDebtAgeHours}
          getDebtAgeDays={getDebtAgeDays}
          getAllDateRepresentations={getAllDateRepresentations}
          m4SelectedCompanyDebtId={m4SelectedCompanyDebtId}
          setM4SelectedCompanyDebtId={setM4SelectedCompanyDebtId}
          canVerifyCleanReturn={canVerifyCleanReturn}
          hasPerm={hasPerm}
          effectiveIsLaundryUser={effectiveIsLaundryUser}
          handleHospitalVerifyM4DebtReturn={handleHospitalVerifyM4DebtReturn}
          handleCompanySubmitM4DebtReturn={handleCompanySubmitM4DebtReturn}
        />
      )}
    </div>
  );
}
