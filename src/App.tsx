/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Account } from './types';
import AuthGate from './components/AuthGate';
import InventoryScreen from './components/InventoryScreen';
import TransactionScreen from './components/TransactionScreen';
import DeliveryFlow from './components/DeliveryFlow';
import AdminScreens from './components/AdminScreens';
import ReportDashboardScreen from './components/ReportDashboardScreen';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MobileMenu from './components/layout/MobileMenu';
import AllocationPopup from './components/layout/AllocationPopup';
import ToastDrawer from './components/layout/ToastDrawer';
import { Shield, Eye } from 'lucide-react';

import { useToast } from './hooks/useToast';
import { useLinenState } from './hooks/useLinenState';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { toasts, triggerToast } = useToast();

  const {
    items,
    setItems,
    detailAllocations,
    setDetailAllocations,
    roles,
    setRoles,
    users,
    setUsers,
    accounts,
    setAccounts,
    history,
    setHistory,
    pendingRegs,
    setPendingRegs,
    departments,
    setDepartments,
    wardDeliverySlips,
    setWardDeliverySlips,
    laundryDispatches,
    setLaundryDispatches,
    temporaryCleanStore,
    setTemporaryCleanStore,
    temporaryDirtyStore,
    setTemporaryDirtyStore,
    temporaryCompanyDirtyStore,
    setTemporaryCompanyDirtyStore,
    isLoading,
    isOnline,
    isReadOnly,
    setIsReadOnly,
    activeTab,
    setActiveTab,
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileTestBarOpen,
    setMobileTestBarOpen,
    allocationModal,
    setAllocationModal,
    saveAllStates,
    handleUpdateDepartments,
    handleRegisterSubmit,
    handleAddItem,
    handleEditItem,
    handleDeleteItem,
    handleDeleteTransaction,
    handleUpdateTransaction,
    handleSubmitTransaction,
    handleConfirmXuat,
    handleRejectXuat,
    handleCompleteDeliveryCycle,
    handleImportBackup,
    handleExportBackup,
    handleInitTestStock,
    handleGenerateReportTestData,
    handleClearReportTestData,
    hasSimulatedData
  } = useLinenState(triggerToast);

  const {
    currentAccount,
    setCurrentAccount,
    simulatedRole,
    setSimulatedRole,
    simulatedWard,
    setSimulatedWard,
    handleLogin,
    handleLogout,
    effectiveAccount,
    currentRoleName,
    currentWardName,
    canSeeLinenDelivery,
    isLaundryUser,
    isWardUser,
    isHousekeepingUser,
    isCurrentlyAdmin,
    canSeeReport,
    canSeeTrangBill
  } = useAuth(users, roles, departments, triggerToast);

  useEffect(() => {
    if (!canSeeReport && activeTab === 's-report') {
      setActiveTab('s1');
    } else if (!canSeeLinenDelivery && activeTab.startsWith('s21')) {
      setActiveTab('s1');
    } else if (canSeeLinenDelivery && isLaundryUser && activeTab !== 's21-muc2') {
      setActiveTab('s21-muc2');
    } else if (canSeeLinenDelivery && isWardUser && activeTab === 's21-muc2') {
      setActiveTab('s21-muc1');
    }
  }, [canSeeReport, canSeeLinenDelivery, isWardUser, isLaundryUser, activeTab, setActiveTab]);

  // Loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center font-medium text-lg text-slate-500">
        Đang tải cơ sở dữ liệu HospLinen Pro...
      </div>
    );
  }

  // Auth lock gate
  if (!currentAccount) {
    return (
      <AuthGate
        accounts={accounts}
        onLogin={handleLogin}
        pendingRegs={pendingRegs}
        onRegisterSubmit={handleRegisterSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen text-[#1A1A1A] p-0 md:p-6 select-none font-sans flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto border-0 md:border border-black/5 bg-white/70 flex-1 flex flex-col p-0 md:p-1 shadow-none md:shadow-2xl rounded-none md:rounded-3xl">
        
        {/* EDITORIAL DOUBLE BORDER TOP HEADER */}
        <Header
          isOnline={isOnline}
          currentAccount={currentAccount}
          currentRoleName={currentRoleName}
          currentWardName={currentWardName}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* MAIN TWO COLUMN GRID LAYOUT */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-black/5">
          
          {/* NAVIGATION RAIL SIDEBAR (Column 1 - Desktop only) */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isLaundryUser={isLaundryUser}
            isHousekeepingUser={isHousekeepingUser}
            canSeeLinenDelivery={canSeeLinenDelivery}
            canSeeReport={canSeeReport}
            isCurrentlyAdmin={isCurrentlyAdmin}
            pendingRegsCount={pendingRegs.filter(p => p.status === 'pending').length}
            handleLogout={handleLogout}
          />

          {/* MAIN CANVAS COMPOSITION SCREEN (Column 2,3,4) */}
          <main className="md:col-span-3 p-3 md:p-6 pb-24 md:pb-6 overflow-y-auto">
            
            {/* SIMULATOR BOARD FOR ADMIN USER */}
            {currentAccount?.isAdmin && (
              <div id="admin-simulation-panel" className="mb-6 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100 p-4 rounded-2xl shadow-xs animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500 text-white rounded-xl shadow-sm">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                        Bảng điều khiển giả lập vai trò (Dành cho Admin)
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Chuyển đổi góc nhìn nhanh để kiểm thử phân quyền & luồng giao nhận đồ dơ / đồ sạch không cần đăng xuất.
                      </p>
                    </div>
                  </div>
                  {(simulatedRole === 'ward' || simulatedRole === 'orderly' || simulatedRole === 'housekeeping') && (
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-3xs self-start md:self-auto">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Khoa lâm sàng:</span>
                      <select 
                        value={simulatedWard}
                        onChange={(e) => setSimulatedWard(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  <button
                    onClick={() => {
                      setSimulatedRole('all');
                      triggerToast('Đã quay lại góc nhìn Quản trị viên gốc', '#10B981');
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      simulatedRole === 'all' || simulatedRole === 'admin'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-semibold'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Eye size={12} />
                    <span>Mặc định (Admin)</span>
                  </button>

                  <button
                    onClick={() => {
                      setSimulatedRole('ward');
                      triggerToast(`Giả lập góc nhìn: Điều dưỡng (${simulatedWard})`, '#7C3AED');
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      simulatedRole === 'ward'
                        ? 'bg-purple-600 border-purple-600 text-white shadow-sm font-semibold'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Eye size={12} />
                    <span>Điều dưỡng (Ward)</span>
                  </button>

                  <button
                    onClick={() => {
                      setSimulatedRole('orderly');
                      triggerToast(`Giả lập góc nhìn: Hộ lý (${simulatedWard})`, '#EAB308');
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      simulatedRole === 'orderly'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm font-semibold'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Eye size={12} />
                    <span>Hộ lý (Orderly)</span>
                  </button>

                  <button
                    onClick={() => {
                      setSimulatedRole('linen');
                      triggerToast('Giả lập góc nhìn: Trưởng kho đồ vải', '#1D5FB8');
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      simulatedRole === 'linen'
                        ? 'bg-blue-800 border-blue-800 text-white shadow-sm font-semibold'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Eye size={12} />
                    <span>Trưởng kho đồ vải</span>
                  </button>

                  <button
                    onClick={() => {
                      setSimulatedRole('clean');
                      triggerToast('Giả lập góc nhìn: Nhân viên đồ vải', '#0D9488');
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      simulatedRole === 'clean'
                        ? 'bg-teal-600 border-teal-600 text-white shadow-sm font-semibold'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Eye size={12} />
                    <span>Nhân viên đồ vải</span>
                  </button>

                  <button
                    onClick={() => {
                      setSimulatedRole('laundry');
                      triggerToast('Giả lập góc nhìn: Xưởng giặt Công ty', '#9333EA');
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      simulatedRole === 'laundry'
                        ? 'bg-fuchsia-600 border-fuchsia-600 text-white shadow-sm font-semibold'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Eye size={12} />
                    <span>Công ty giặt (Laundry)</span>
                  </button>
                </div>
              </div>
            )}
            
            {isReadOnly && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-700 p-3.5 rounded-2xl flex items-start gap-3 shadow-2xs animate-fadeIn">
                <span className="text-xl shrink-0">🔒</span>
                <div className="text-xs">
                  <p className="font-bold text-red-800 uppercase tracking-wide">
                    Hệ thống đang ở Chế độ Chỉ Xem (Read-only)
                  </p>
                  <p className="text-red-700/90 mt-0.5 leading-relaxed">
                    Bạn có thể tự do chuyển đổi các Góc nhìn vai trò (Điều dưỡng, Hộ lý, Kho vải, Xưởng giặt...) để trải nghiệm toàn bộ quy trình nghiệp vụ. Tuy nhiên, tính năng lưu, gửi hoặc duyệt dữ liệu đã được khóa để bảo vệ dữ liệu gốc.
                  </p>
                </div>
              </div>
            )}

            {!isLaundryUser && activeTab === 's1' && (
              <InventoryScreen
                items={items}
                detailAllocations={detailAllocations}
                temporaryCleanStore={temporaryCleanStore}
                temporaryDirtyStore={temporaryDirtyStore}
                temporaryCompanyDirtyStore={temporaryCompanyDirtyStore}
                onAddItem={handleAddItem}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                onImportBackup={handleImportBackup}
                onExportBackup={handleExportBackup}
                onInitTest={handleInitTestStock}
                onViewAllocations={(ma, ten) => setAllocationModal({ ma, ten })}
                onUpdateInventory={(newItems, newDetail) => saveAllStates(newItems, newDetail, roles, users, accounts, history, pendingRegs, departments, wardDeliverySlips, laundryDispatches, temporaryCleanStore)}
                isAdmin={effectiveAccount?.isAdmin || currentRoleName.includes('Thủ kho') || currentRoleName.includes('Trưởng kho') || currentRoleName.includes('đồ vải')}
                canExportReport={canSeeReport}
                canSeeTrangBill={canSeeTrangBill}
                departments={departments}
                userDept={currentWardName}
              />
            )}

            {!isLaundryUser && activeTab === 's12' && (
              <TransactionScreen
                items={items}
                detailAllocations={detailAllocations}
                history={history}
                currentAccount={effectiveAccount || currentAccount}
                users={users}
                roles={roles}
                onSubmitTransaction={(tx) => handleSubmitTransaction(tx, isHousekeepingUser, currentWardName)}
                onConfirmXuat={(id) => handleConfirmXuat(id, effectiveAccount || currentAccount)}
                onRejectXuat={(id, reason) => handleRejectXuat(id, reason, effectiveAccount || currentAccount)}
                onDeleteTransaction={handleDeleteTransaction}
                onUpdateTransaction={(id, tx) => handleUpdateTransaction(id, tx, currentWardName)}
                departments={departments}
                userDept={currentWardName}
              />
            )}

            {activeTab.startsWith('s21') && (
              canSeeLinenDelivery ? (
                <DeliveryFlow
                  items={items}
                  detailAllocations={detailAllocations}
                  currentAccount={effectiveAccount || currentAccount}
                  currentWardName={currentWardName}
                  currentRoleName={currentRoleName}
                  isWardUser={isWardUser}
                  isLaundryUser={isLaundryUser}
                  users={users}
                  roles={roles}
                  departments={departments}
                  wardDeliverySlips={wardDeliverySlips}
                  laundryDispatches={laundryDispatches}
                  temporaryCleanStore={temporaryCleanStore}
                  temporaryDirtyStore={temporaryDirtyStore}
                  temporaryCompanyDirtyStore={temporaryCompanyDirtyStore}
                  onUpdateWardDeliverySlips={(newSlips) => saveAllStates(items, detailAllocations, roles, users, accounts, history, pendingRegs, departments, newSlips, laundryDispatches, temporaryCleanStore, temporaryDirtyStore, temporaryCompanyDirtyStore)}
                  onUpdateLaundryDispatches={(newDispatches) => saveAllStates(items, detailAllocations, roles, users, accounts, history, pendingRegs, departments, wardDeliverySlips, newDispatches, temporaryCleanStore, temporaryDirtyStore, temporaryCompanyDirtyStore)}
                  onUpdateTemporaryCleanStore={(newTempStore) => saveAllStates(items, detailAllocations, roles, users, accounts, history, pendingRegs, departments, wardDeliverySlips, laundryDispatches, newTempStore, temporaryDirtyStore, temporaryCompanyDirtyStore)}
                  onUpdateTemporaryDirtyStore={(newTempDirtyStore) => saveAllStates(items, detailAllocations, roles, users, accounts, history, pendingRegs, departments, wardDeliverySlips, laundryDispatches, temporaryCleanStore, newTempDirtyStore, temporaryCompanyDirtyStore)}
                  onUpdateTemporaryCompanyDirtyStore={(newTempCompDirty) => saveAllStates(items, detailAllocations, roles, users, accounts, history, pendingRegs, departments, wardDeliverySlips, laundryDispatches, temporaryCleanStore, temporaryDirtyStore, newTempCompDirty)}
                  onUpdateDeliveryStates={(params) => {
                    const nextHistory = params.clearHistory ? [] : history;
                    const nextWardSlips = 'wardSlips' in params && params.wardSlips !== undefined ? params.wardSlips : wardDeliverySlips;
                    const nextLaundryDispatches = 'laundryDispatches' in params && params.laundryDispatches !== undefined ? params.laundryDispatches : laundryDispatches;
                    const nextCleanStore = 'temporaryCleanStore' in params && params.temporaryCleanStore !== undefined ? params.temporaryCleanStore : temporaryCleanStore;
                    const nextDirtyStore = 'temporaryDirtyStore' in params && params.temporaryDirtyStore !== undefined ? params.temporaryDirtyStore : temporaryDirtyStore;
                    const nextCompanyDirtyStore = 'temporaryCompanyDirtyStore' in params && params.temporaryCompanyDirtyStore !== undefined ? params.temporaryCompanyDirtyStore : temporaryCompanyDirtyStore;
                    
                    saveAllStates(
                      items,
                      detailAllocations,
                      roles,
                      users,
                      accounts,
                      nextHistory,
                      pendingRegs,
                      departments,
                      nextWardSlips,
                      nextLaundryDispatches,
                      nextCleanStore,
                      nextDirtyStore,
                      nextCompanyDirtyStore
                    );
                  }}
                  onCompleteCycle={handleCompleteDeliveryCycle}
                  activeMuc={activeTab === 's21-muc2' ? 2 : activeTab === 's21-muc3' ? 3 : activeTab === 's21-muc4' ? 4 : 1}
                  onActiveMucChange={(muc) => setActiveTab(`s21-muc${muc}` as any)}
                  simulatedRole={simulatedRole}
                />
              ) : (
                <div className="p-12 text-center text-stone-500 font-medium bg-white rounded-2xl shadow-sm border border-stone-200 my-8">
                  <div className="text-3xl mb-3">🔒</div>
                  <h3 className="text-base font-bold text-stone-800 mb-1">Không Có Quyền Truy Cập</h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    Vai trò của bạn chưa được kích hoạt quyền <strong>"Xử lý đồ vải"</strong> để truy cập chức năng Vận hành giao nhận đồ vải. Vui lòng liên hệ Quản trị viên để được phân quyền.
                  </p>
                </div>
              )
            )}

            {activeTab === 's-report' && (
              canSeeReport ? (
                <ReportDashboardScreen
                  wardDeliverySlips={wardDeliverySlips}
                  laundryDispatches={laundryDispatches}
                  items={items}
                  history={history}
                  departments={departments}
                  isWardUser={isWardUser}
                  currentWardName={currentWardName}
                  detailAllocations={detailAllocations}
                  onGenerateTestData={handleGenerateReportTestData}
                  hasSimulatedData={hasSimulatedData}
                  onClearTestData={handleClearReportTestData}
                />
              ) : (
                <div className="p-12 text-center text-stone-500 font-medium bg-white rounded-2xl shadow-sm border border-stone-200 my-8">
                  <div className="text-3xl mb-3">🔒</div>
                  <h3 className="text-base font-bold text-stone-800 mb-1">Không Có Quyền Truy Cập</h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    Chức năng Báo cáo thống kê chỉ dành riêng cho <strong>Quản trị viên (Admin)</strong> và <strong>Trưởng kho đồ vải</strong>.
                  </p>
                </div>
              )
            )}

            {activeTab === 's-roles' && isCurrentlyAdmin && (
              <AdminScreens
                roles={roles}
                users={users}
                accounts={accounts}
                pendingRegs={pendingRegs}
                onUpdateRoles={(newRoles, newUsers) => saveAllStates(items, detailAllocations, newRoles, newUsers || users, accounts, history, pendingRegs)}
                onUpdateUsers={(newUsers, newAccs, newPending) => saveAllStates(items, detailAllocations, roles, newUsers, newAccs, history, newPending || pendingRegs)}
                onUpdatePendingRegs={newPending => saveAllStates(items, detailAllocations, roles, users, accounts, history, newPending)}
                activeSubTab="roles"
                departments={departments}
                onUpdateDepartments={handleUpdateDepartments}
                isAdmin={currentAccount.isAdmin}
                detailAllocations={detailAllocations}
              />
            )}

            {activeTab === 's-users' && isCurrentlyAdmin && (
              <AdminScreens
                roles={roles}
                users={users}
                accounts={accounts}
                pendingRegs={pendingRegs}
                onUpdateRoles={(newRoles, newUsers) => saveAllStates(items, detailAllocations, newRoles, newUsers || users, accounts, history, pendingRegs)}
                onUpdateUsers={(newUsers, newAccs, newPending) => saveAllStates(items, detailAllocations, roles, newUsers, newAccs, history, newPending || pendingRegs)}
                onUpdatePendingRegs={newPending => saveAllStates(items, detailAllocations, roles, users, accounts, history, newPending)}
                activeSubTab="users"
                departments={departments}
                onUpdateDepartments={handleUpdateDepartments}
                isAdmin={currentAccount.isAdmin}
                detailAllocations={detailAllocations}
              />
            )}

            {activeTab === 's-depts' && isCurrentlyAdmin && (
              <AdminScreens
                roles={roles}
                users={users}
                accounts={accounts}
                pendingRegs={pendingRegs}
                onUpdateRoles={(newRoles, newUsers) => saveAllStates(items, detailAllocations, newRoles, newUsers || users, accounts, history, pendingRegs)}
                onUpdateUsers={(newUsers, newAccs, newPending) => saveAllStates(items, detailAllocations, roles, newUsers, newAccs, history, newPending || pendingRegs)}
                onUpdatePendingRegs={newPending => saveAllStates(items, detailAllocations, roles, users, accounts, history, newPending)}
                activeSubTab="depts"
                departments={departments}
                onUpdateDepartments={handleUpdateDepartments}
                isAdmin={currentAccount.isAdmin}
                detailAllocations={detailAllocations}
              />
            )}

          </main>
        </div>
      </div>

      {/* MOBILE DRIWER AND BOTTOM NAV */}
      <MobileMenu
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLaundryUser={isLaundryUser}
        isHousekeepingUser={isHousekeepingUser}
        isWardUser={isWardUser}
        canSeeLinenDelivery={canSeeLinenDelivery}
        canSeeReport={canSeeReport}
        isCurrentlyAdmin={isCurrentlyAdmin}
        pendingRegsCount={pendingRegs.filter(p => p.status === 'pending').length}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        handleLogout={handleLogout}
      />

      {/* DETAILED ALLOCATIONS POPUP */}
      <AllocationPopup
        allocationModal={allocationModal}
        onClose={() => setAllocationModal(null)}
        items={items}
        detailAllocations={detailAllocations}
      />

      {/* FLOATING TOASTS */}
      <ToastDrawer toasts={toasts} />

    </div>
  );
}
