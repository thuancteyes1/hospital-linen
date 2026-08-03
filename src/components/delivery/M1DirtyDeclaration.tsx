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
  Role 
} from '../../types';
import { 
  FileText, 
  Truck, 
  AlertCircle,
  Package 
} from 'lucide-react';
import { checkPermission } from './utils/checkPermission';
import M1WardTab from './m1/M1WardTab';
import M1CompanyTab from './m1/M1CompanyTab';
import AdjustDirtyStoreModal from './m1/AdjustDirtyStoreModal';

interface M1DirtyDeclarationProps {
  items: LinenItem[];
  detailAllocations: Record<string, [string, number][]>;
  currentAccount: Account | null;
  currentWardName: string;
  users: User[];
  roles: Role[];
  departments: string[];
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

export default function M1DirtyDeclaration({
  items,
  detailAllocations,
  currentAccount,
  currentWardName,
  users,
  roles,
  departments,
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
  onUpdateDeliveryStates,
  showToast
}: M1DirtyDeclarationProps) {
  
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

  const [m1SubTab, setM1SubTab] = useState<'dirty-ward' | 'dirty-company'>('dirty-ward');
  const [activeSlipId, setActiveSlipId] = useState<string | null>(null);
  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null);
  const [isAdjustingDirtyStore, setIsAdjustingDirtyStore] = useState(false);

  // Auto-switch sub-tab on permission changes
  useEffect(() => {
    if (m1SubTab === 'dirty-company' && !hasPerm('linen') && !hasPerm('clean')) {
      setM1SubTab('dirty-ward');
    }
  }, [simulatedRole, currentAccount, m1SubTab]);

  const deptsToUse = useMemo(() => {
    return departments.filter(d => d !== 'Tất cả' && d !== 'Kho trung tâm');
  }, [departments]);

  // Compute sums
  const totalDirtyStoreSum = useMemo(() => {
    return Object.values(temporaryDirtyStore).reduce((a, b) => a + b, 0);
  }, [temporaryDirtyStore]);

  const totalCompanyDirtyStoreSum = useMemo(() => {
    return Object.values(temporaryCompanyDirtyStore || {}).reduce((a, b) => a + b, 0);
  }, [temporaryCompanyDirtyStore]);

  return (
    <div className="space-y-4">
      {/* ======================= MỤC 1 PANEL ======================= */}
      {effectiveIsLaundryUser ? (
        <div className="bg-purple-50 border border-purple-300 text-purple-900 p-8 rounded-xl text-center shadow-sm max-w-xl mx-auto my-8">
          <AlertCircle className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <p className="font-bold text-lg mb-1">Không thuộc phạm vi quyền hạn Xưởng giặt Công ty</p>
          <p className="text-sm text-stone-600 mb-4">
            Tài khoản công ty giặt chỉ được phép truy cập và thao tác tại <strong>Giao nhận sạch Cty</strong>. Giao nhận đồ dơ và Giao nhận sạch khoa phòng không thuộc phạm vi làm việc của xưởng giặt.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bảng Kho dơ hiển thị trong Line 1 */}
          {!isOrderlyUser && (
            <div className="border border-amber-300 bg-amber-50/45 rounded-xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5 font-bold">
                    <Package className="w-4 h-4 text-amber-800 shrink-0" />
                    {m1SubTab === 'dirty-ward' ? (
                      <span>Kho đồ dơ Bệnh viện (Nhận từ khoa lâm sàng)</span>
                    ) : (
                      <span>Kho đồ dơ Công ty (Đã bàn giao xưởng giặt)</span>
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
                  {m1SubTab === 'dirty-ward' && (hasPerm('linen') || currentAccount?.isAdmin) && (
                    <button
                      onClick={() => setIsAdjustingDirtyStore(true)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Điều chỉnh số lượng đồ dơ tại Kho dơ tạm (do hao hụt, mất mát, đếm lệch)"
                    >
                      <span>Cân chỉnh tồn dơ</span>
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
                  ) : null
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
                  ) : null
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
                {(hasPerm('linen') || hasPerm('clean')) && (
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

          {/* Tab Renderers */}
          {m1SubTab === 'dirty-ward' ? (
            <M1WardTab
              items={items}
              detailAllocations={detailAllocations}
              currentAccount={currentAccount}
              currentWardName={currentWardName}
              users={users}
              roles={roles}
              departments={departments}
              wardDeliverySlips={wardDeliverySlips}
              laundryDispatches={laundryDispatches}
              temporaryDirtyStore={temporaryDirtyStore}
              temporaryCleanStore={temporaryCleanStore}
              simulatedRole={simulatedRole}
              isOrderlyUser={isOrderlyUser}
              isHousekeepingUser={isHousekeepingUser}
              effectiveIsWardUser={effectiveIsWardUser}
              effectiveIsLaundryUser={effectiveIsLaundryUser}
              hasLinenPerm={hasLinenPerm}
              currentRoleName={currentRoleName}
              onUpdateDeliveryStates={onUpdateDeliveryStates}
              showToast={showToast}
              activeSlipId={activeSlipId}
              setActiveSlipId={setActiveSlipId}
              deptsToUse={deptsToUse}
            />
          ) : (
            <M1CompanyTab
              items={items}
              currentAccount={currentAccount}
              wardDeliverySlips={wardDeliverySlips}
              laundryDispatches={laundryDispatches}
              temporaryDirtyStore={temporaryDirtyStore}
              temporaryCompanyDirtyStore={temporaryCompanyDirtyStore}
              simulatedRole={simulatedRole}
              isOrderlyUser={isOrderlyUser}
              isHousekeepingUser={isHousekeepingUser}
              effectiveIsWardUser={effectiveIsWardUser}
              effectiveIsLaundryUser={effectiveIsLaundryUser}
              hasLinenPerm={hasLinenPerm}
              currentRoleName={currentRoleName}
              onUpdateDeliveryStates={onUpdateDeliveryStates}
              showToast={showToast}
              activeDispatchId={activeDispatchId}
              setActiveDispatchId={setActiveDispatchId}
            />
          )}
        </div>
      )}

      {/* Adjust Store Modal */}
      {isAdjustingDirtyStore && (
        <AdjustDirtyStoreModal
          items={items}
          temporaryDirtyStore={temporaryDirtyStore}
          onUpdateDeliveryStates={onUpdateDeliveryStates}
          showToast={showToast}
          onClose={() => setIsAdjustingDirtyStore(false)}
        />
      )}
    </div>
  );
}
