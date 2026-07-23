/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  LayoutDashboard,
  ArrowLeftRight,
  ClipboardCheck,
  Truck,
  CheckCircle,
  TrendingUp,
  Users,
  FolderSync,
  MapPin,
  LogOut,
  Menu,
  Package,
  Shirt
} from 'lucide-react';

interface MobileMenuProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isLaundryUser: boolean;
  isHousekeepingUser: boolean;
  isWardUser: boolean;
  canSeeLinenDelivery: boolean;
  canSeeReport: boolean;
  isCurrentlyAdmin: boolean;
  pendingRegsCount: number;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  handleLogout: () => void;
}

export default function MobileMenu({
  activeTab,
  setActiveTab,
  isLaundryUser,
  isHousekeepingUser,
  isWardUser,
  canSeeLinenDelivery,
  canSeeReport,
  isCurrentlyAdmin,
  pendingRegsCount,
  mobileMenuOpen,
  setMobileMenuOpen,
  handleLogout
}: MobileMenuProps) {
  return (
    <>
      {/* MOBILE FLOATING BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-[0_-4px_25px_rgba(0,0,0,0.1)] flex justify-around items-center py-1.5 px-1">
        {!isLaundryUser && (
          <button
            onClick={() => setActiveTab('s1')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg ${
              activeTab === 's1' ? 'text-blue-600 font-black' : 'text-stone-500'
            }`}
          >
            <Package size={18} />
            <span className="text-[10px] mt-0.5">Tồn Kho</span>
          </button>
        )}
        {canSeeLinenDelivery && !isLaundryUser && (
          <button
            onClick={() => setActiveTab('s21-muc1')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg ${
              activeTab === 's21-muc1' ? 'text-blue-600 font-black' : 'text-stone-500'
            }`}
          >
            <ClipboardCheck size={18} />
            <span className="text-[10px] mt-0.5">Đồ dơ</span>
          </button>
        )}
        {canSeeLinenDelivery && !isWardUser && (
          <button
            onClick={() => setActiveTab('s21-muc2')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg ${
              activeTab === 's21-muc2' ? 'text-blue-600 font-black' : 'text-stone-500'
            }`}
          >
            <Truck size={18} />
            <span className="text-[10px] mt-0.5">Sạch Cty</span>
          </button>
        )}
        {canSeeLinenDelivery && !isLaundryUser && (
          <button
            onClick={() => setActiveTab('s21-muc3')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg ${
              activeTab === 's21-muc3' ? 'text-blue-600 font-black' : 'text-stone-500'
            }`}
          >
            <CheckCircle size={18} />
            <span className="text-[10px] mt-0.5">Sạch Khoa</span>
          </button>
        )}
        {canSeeReport && (
          <button
            onClick={() => setActiveTab('s-report')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg ${
              activeTab === 's-report' ? 'text-blue-600 font-black' : 'text-stone-500'
            }`}
          >
            <TrendingUp size={18} />
            <span className="text-[10px] mt-0.5">Báo Cáo</span>
          </button>
        )}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-lg text-stone-500 hover:text-blue-600"
        >
          <Menu size={18} />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </div>

      {/* MOBILE SLIDE-OVER DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end md:hidden animate-fadeIn">
          <div className="w-[85vw] max-w-sm bg-white h-full p-5 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <Shirt className="text-blue-600" size={22} />
                  <span className="font-black text-lg text-stone-900">Menu Chức Năng</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-700"
                >
                  <X size={18} />
                </button>
              </div>

              {!isLaundryUser && (
                <div>
                  <span className="block text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-2.5">
                    1. Danh mục & Kho hàng
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('s1');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${
                        activeTab === 's1' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'
                      }`}
                    >
                      <LayoutDashboard size={16} />
                      Danh mục & Tồn kho
                    </button>
                    {!isHousekeepingUser && (
                      <button
                        onClick={() => {
                          setActiveTab('s12');
                          setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${
                          activeTab === 's12' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        <ArrowLeftRight size={16} />
                        Nhập / Xuất kho
                      </button>
                    )}
                  </div>
                </div>
              )}

              {canSeeLinenDelivery && (
                <div>
                  <span className="block text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-2.5">
                    2. Vận hành Giao nhận
                  </span>
                  <div className="flex flex-col gap-2">
                    {!isLaundryUser && (
                      <button
                        onClick={() => {
                          setActiveTab('s21-muc1');
                          setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${
                          activeTab === 's21-muc1' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        <ClipboardCheck size={16} />
                        <span>Giao nhận đồ dơ</span>
                      </button>
                    )}
                    {!isHousekeepingUser && (
                      <button
                        onClick={() => {
                          setActiveTab('s21-muc2');
                          setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${
                          activeTab === 's21-muc2' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        <Truck size={16} />
                        <span>Giao nhận sạch Cty</span>
                      </button>
                    )}
                    {!isLaundryUser && (
                      <button
                        onClick={() => {
                          setActiveTab('s21-muc3');
                          setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${
                          activeTab === 's21-muc3' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        <CheckCircle size={16} />
                        <span>Giao nhận sạch khoa phòng</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {canSeeReport && (
                <div>
                  <span className="block text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-2.5">
                    3. Báo cáo thống kê
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('s-report');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${
                        activeTab === 's-report' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'
                      }`}
                    >
                      <TrendingUp size={16} />
                      Báo cáo & Phân tích
                    </button>
                  </div>
                </div>
              )}

              {isCurrentlyAdmin && (
                <div>
                  <span className="block text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-2.5">
                    4. Quản trị hệ thống
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('s-users');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${
                        activeTab === 's-users' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'
                      }`}
                    >
                      <Users size={16} />
                      Tài khoản & Phê duyệt ({pendingRegsCount})
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('s-roles');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${
                        activeTab === 's-roles' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'
                      }`}
                    >
                      <FolderSync size={16} />
                      Phân quyền vai trò
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('s-depts');
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${
                        activeTab === 's-depts' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'
                      }`}
                    >
                      <MapPin size={16} />
                      Quản lý khoa phòng
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-stone-200 space-y-3 mt-auto">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                Đăng Xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
