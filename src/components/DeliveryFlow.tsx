/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LinenItem, 
  WardDeliverySlip, 
  LaundryDispatch,
  Account, 
  User,
  Role
} from '../types';
import { 
  PlusCircle, 
  CheckCircle, 
  Truck, 
  Inbox, 
  Layers, 
  RefreshCw,
  Settings,
  Trash2,
  X
} from 'lucide-react';
import M1DirtyDeclaration from './delivery/M1DirtyDeclaration';
import M2CompanyClean from './delivery/M2CompanyClean';
import M3WardDelivery from './delivery/M3WardDelivery';
import M4CompanyDebt from './delivery/M4CompanyDebt';

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
  const isOrderlyUser = simulatedRole === 'orderly' || currentRoleName === 'Hộ lý';
  const isHousekeepingUser = simulatedRole === 'housekeeping' || currentRoleName === 'Buồng phòng';
  const hasLinenPerm = currentRoleName === 'Nhân viên Đồ vải' || simulatedRole === 'linen' || currentAccount?.isAdmin === true;

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
    if (effectiveIsLaundryUser && activeMuc !== 2) {
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

  // Operational dialog states
  const [isAdjustingDirtyStore, setIsAdjustingDirtyStore] = useState(false);
  const [dirtyStoreAdjustmentQtys, setDirtyStoreAdjustmentQtys] = useState<Record<string, number>>({});
  const [adjustDirtyReason, setAdjustDirtyReason] = useState<string>('Hao hụt thực tế thu gom');
  const [cleanupPendingType, setCleanupPendingType] = useState<'all' | 'wardSlips' | 'laundryDispatches' | 'dirtyStore' | 'cleanStore' | 'onlyInventory' | null>(null);

  // Cross-component coordination states (for workspace redirects)
  const [m3SubTab, setM3SubTab] = useState<'clean-ward' | 'ward-debt'>('clean-ward');
  const [selectedM1SlipIdForCleanReturn, setSelectedM1SlipIdForCleanReturn] = useState<string | null>(null);
  const [m3ItemCleanReturnQtys, setM3ItemCleanReturnQtys] = useState<Record<string, number>>({});

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
      setSelectedM1SlipIdForCleanReturn(null);
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

  const syncDeliveryStates = (params: {
    wardSlips?: WardDeliverySlip[];
    laundryDispatches?: LaundryDispatch[];
    temporaryCleanStore?: Record<string, number>;
    temporaryDirtyStore?: Record<string, number>;
    temporaryCompanyDirtyStore?: Record<string, number>;
    clearHistory?: boolean;
  }) => {
    if (onUpdateDeliveryStates) {
      onUpdateDeliveryStates(params);
    } else {
      if (params.wardSlips) onUpdateWardDeliverySlips(params.wardSlips);
      if (params.laundryDispatches && onUpdateLaundryDispatches) onUpdateLaundryDispatches(params.laundryDispatches);
      if (params.temporaryCleanStore) onUpdateTemporaryCleanStore(params.temporaryCleanStore);
      if (params.temporaryDirtyStore && onUpdateTemporaryDirtyStore) onUpdateTemporaryDirtyStore(params.temporaryDirtyStore);
      if (params.temporaryCompanyDirtyStore && onUpdateTemporaryCompanyDirtyStore) onUpdateTemporaryCompanyDirtyStore(params.temporaryCompanyDirtyStore);
    }
  };

  return (
    <div className="w-full">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border animate-in slide-in-from-top duration-300 ${
          toast.type === 'error' 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : toast.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold leading-relaxed whitespace-pre-line">
            {toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✓'} {toast.message}
          </div>
        </div>
      )}

      {/* Main Header with dynamic title & Operational Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-200 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold text-stone-800 uppercase tracking-wider bg-stone-100/50 px-3 py-1.5 rounded-lg border border-stone-200/60 shadow-3xs">
            {activeMuc === 1 && "Quy trình giao nhận đồ dơ"}
            {activeMuc === 2 && "Giao nhận sạch với Công ty giặt"}
            {activeMuc === 3 && "Giao nhận sạch cho Khoa phòng"}
            {activeMuc === 4 && "Đối chiếu & Công nợ xưởng giặt"}
          </h2>
        </div>

        {/* Operational Toolbar (Admin/Trưởng kho đồ vải only) */}
        {(!!currentAccount?.isAdmin || currentRoleName === 'Trưởng kho đồ vải' || simulatedRole === 'admin') && (
          <div className="flex gap-1.5 self-end sm:self-auto shrink-0">
            <button
              onClick={handleOpenAdjustDirtyStore}
              className="p-2 border border-stone-300 rounded-lg bg-white text-stone-600 hover:text-stone-900 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-3xs"
              title="Cân chỉnh số lượng đồ dơ tại kho bệnh viện"
            >
              <RefreshCw size={14} />
              Cân chỉnh Kho Dơ
            </button>
            <button
              onClick={() => setCleanupPendingType('onlyInventory')}
              className="p-2 border border-stone-300 rounded-lg bg-white text-stone-600 hover:text-stone-900 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-3xs"
              title="Reset toàn bộ số lượng hàng tồn kho"
            >
              <Settings size={14} />
              Reset Kho
            </button>
            <button
              onClick={() => setCleanupPendingType('all')}
              className="p-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800 rounded-lg transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-3xs"
              title="Khôi phục cài đặt gốc - Reset toàn bộ dữ liệu hệ thống"
            >
              <Trash2 size={14} />
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* Conditional Functional Panels Render */}
      <div className="w-full">
        {activeMuc === 1 && (
          <M1DirtyDeclaration
            items={items}
            detailAllocations={detailAllocations}
            currentAccount={currentAccount}
            users={users}
            roles={roles}
            wardDeliverySlips={wardDeliverySlips}
            laundryDispatches={laundryDispatches}
            temporaryDirtyStore={temporaryDirtyStore}
            temporaryCompanyDirtyStore={temporaryCompanyDirtyStore}
            temporaryCleanStore={temporaryCleanStore}
            simulatedRole={simulatedRole}
            isOrderlyUser={isOrderlyUser}
            isHousekeepingUser={isHousekeepingUser}
            effectiveIsWardUser={effectiveIsWardUser}
            effectiveIsLaundryUser={effectiveIsLaundryUser}
            hasLinenPerm={hasLinenPerm}
            currentRoleName={currentRoleName}
            currentWardName={currentWardName}
            departments={deptsToUse}
            onUpdateDeliveryStates={syncDeliveryStates}
            showToast={showToast}
          />
        )}

        {activeMuc === 2 && (
          <M2CompanyClean
            items={items}
            currentAccount={currentAccount}
            users={users}
            roles={roles}
            wardDeliverySlips={wardDeliverySlips}
            laundryDispatches={laundryDispatches}
            temporaryDirtyStore={temporaryDirtyStore}
            temporaryCleanStore={temporaryCleanStore}
            temporaryCompanyDirtyStore={temporaryCompanyDirtyStore}
            simulatedRole={simulatedRole}
            isOrderlyUser={isOrderlyUser}
            isHousekeepingUser={isHousekeepingUser}
            effectiveIsWardUser={effectiveIsWardUser}
            effectiveIsLaundryUser={effectiveIsLaundryUser}
            hasLinenPerm={hasLinenPerm}
            currentRoleName={currentRoleName}
            currentWardName={currentWardName}
            departments={deptsToUse}
            onUpdateDeliveryStates={syncDeliveryStates}
            showToast={showToast}
          />
        )}

        {activeMuc === 3 && (
          <M3WardDelivery
            items={items}
            currentAccount={currentAccount}
            users={users}
            roles={roles}
            wardDeliverySlips={wardDeliverySlips}
            temporaryCleanStore={temporaryCleanStore}
            simulatedRole={simulatedRole}
            isOrderlyUser={isOrderlyUser}
            isHousekeepingUser={isHousekeepingUser}
            effectiveIsWardUser={effectiveIsWardUser}
            effectiveIsLaundryUser={effectiveIsLaundryUser}
            hasLinenPerm={hasLinenPerm}
            currentRoleName={currentRoleName}
            currentWardName={currentWardName}
            departments={deptsToUse}
            onUpdateDeliveryStates={syncDeliveryStates}
            showToast={showToast}
          />
        )}

        {activeMuc === 4 && (
          <M4CompanyDebt
            items={items}
            currentAccount={currentAccount}
            users={users}
            roles={roles}
            wardDeliverySlips={wardDeliverySlips}
            laundryDispatches={laundryDispatches}
            temporaryCleanStore={temporaryCleanStore}
            temporaryCompanyDirtyStore={temporaryCompanyDirtyStore}
            simulatedRole={simulatedRole}
            isOrderlyUser={isOrderlyUser}
            isHousekeepingUser={isHousekeepingUser}
            effectiveIsWardUser={effectiveIsWardUser}
            effectiveIsLaundryUser={effectiveIsLaundryUser}
            hasLinenPerm={hasLinenPerm}
            currentRoleName={currentRoleName}
            currentWardName={currentWardName}
            departments={deptsToUse}
            onUpdateDeliveryStates={syncDeliveryStates}
            showToast={showToast}
            setActiveMuc={setActiveMuc}
            setM3SubTab={setM3SubTab}
            setSelectedM1SlipIdForCleanReturn={setSelectedM1SlipIdForCleanReturn}
            setM3ItemCleanReturnQtys={setM3ItemCleanReturnQtys}
          />
        )}
      </div>

      {/* Adjust Dirty Store Modal */}
      {isAdjustingDirtyStore && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 w-full max-w-xl rounded-2xl shadow-2xl p-5 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-stone-200 mb-4">
              <h3 className="text-sm font-black uppercase text-stone-800 tracking-tight font-bold flex items-center gap-2">
                ⚙️ Cân chỉnh số lượng Kho Đồ Dơ Bệnh viện
              </h3>
              <button onClick={() => setIsAdjustingDirtyStore(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <p className="text-xs text-stone-500 leading-relaxed font-medium">
                Sử dụng chức năng này để điều chỉnh lượng hàng tồn đồ dơ thực tế đang lưu tại kho của bệnh viện nhằm chốt dữ liệu bàn giao cho công ty giặt khi có thất thoát hoặc nhầm lẫn kiểm đếm.
              </p>

              <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                <table className="w-full text-left text-xs font-medium">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                      <th className="p-2.5">Tên đồ vải</th>
                      <th className="p-2.5 text-center w-24">Tồn hiện tại</th>
                      <th className="p-2.5 text-center w-36">Tồn mới</th>
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
                              <div className="flex items-center justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  className="w-14 h-7 border border-stone-300 rounded text-center text-xs font-mono font-bold bg-stone-50 text-stone-900"
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
                  <label className="block text-[10px] uppercase font-black tracking-widest text-stone-500 font-bold">
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
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-xs text-stone-900 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-stone-200 mt-4 shrink-0">
              <button
                onClick={() => setIsAdjustingDirtyStore(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={handleSaveDirtyStoreAdjustment}
                disabled={Object.keys(dirtyStoreAdjustmentQtys).length === 0}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
              >
                Cập Nhật & Cân Đối ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {cleanupPendingType && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-51 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 flex flex-col">
            <div className="flex items-center gap-3 text-red-600 pb-2 border-b border-stone-100">
              <span className="text-2xl">⚠️</span>
              <h4 className="font-serif font-black text-base uppercase tracking-tight text-stone-800 font-bold">
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
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer border border-stone-200"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => executeConfirmedCleanup(cleanupPendingType)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
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
