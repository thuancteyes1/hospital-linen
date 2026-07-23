/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ClipboardCheck,
  Truck,
  CheckCircle,
  TrendingUp,
  Users,
  FolderSync,
  MapPin,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isLaundryUser: boolean;
  isHousekeepingUser: boolean;
  canSeeLinenDelivery: boolean;
  canSeeReport: boolean;
  isCurrentlyAdmin: boolean;
  pendingRegsCount: number;
  handleLogout: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isLaundryUser,
  isHousekeepingUser,
  canSeeLinenDelivery,
  canSeeReport,
  isCurrentlyAdmin,
  pendingRegsCount,
  handleLogout
}: SidebarProps) {
  return (
    <aside className="hidden md:flex md:col-span-1 p-4 flex-col justify-between space-y-8 bg-black/[0.01] no-print rounded-bl-3xl">
      <div className="space-y-6">
        
        {!isLaundryUser && (
          <div>
            <span className="block text-[9px] uppercase tracking-widest font-bold text-[#86868B] mb-3">
              1. Danh mục & Kho hàng
            </span>
            <nav className="flex flex-col gap-1.5">
              <button
                onClick={() => setActiveTab('s1')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                  activeTab === 's1'
                    ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                    : 'hover:bg-black/5 text-slate-700'
                }`}
              >
                <LayoutDashboard size={14} />
                Danh mục & Tồn kho
              </button>
              {!isHousekeepingUser && (
                <button
                  onClick={() => setActiveTab('s12')}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                    activeTab === 's12'
                      ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                      : 'hover:bg-black/5 text-slate-700'
                  }`}
                >
                  <ArrowLeftRight size={14} />
                  Nhập / Xuất kho
                </button>
              )}
            </nav>
          </div>
        )}

        {canSeeLinenDelivery && (
          <div>
            <span className="block text-[9px] uppercase tracking-widest font-bold text-[#86868B] mb-3">
              2. Vận hành Giao nhận
            </span>
            <nav className="flex flex-col gap-1.5">
              {!isLaundryUser && (
                <button
                  onClick={() => setActiveTab('s21-muc1')}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                    activeTab === 's21-muc1'
                      ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                      : 'hover:bg-black/5 text-slate-700'
                  }`}
                >
                  <ClipboardCheck size={14} />
                  Giao nhận đồ dơ
                </button>
              )}
              {!isHousekeepingUser && (
                <button
                  onClick={() => setActiveTab('s21-muc2')}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                    activeTab === 's21-muc2'
                      ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                      : 'hover:bg-black/5 text-slate-700'
                  }`}
                >
                  <Truck size={14} />
                  Giao nhận sạch Cty
                </button>
              )}
              {!isLaundryUser && (
                <button
                  onClick={() => setActiveTab('s21-muc3')}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                    activeTab === 's21-muc3'
                      ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                      : 'hover:bg-black/5 text-slate-700'
                  }`}
                >
                  <CheckCircle size={14} />
                  Giao nhận sạch khoa phòng
                </button>
              )}
            </nav>
          </div>
        )}

        {canSeeReport && (
          <div>
            <span className="block text-[9px] uppercase tracking-widest font-bold text-[#86868B] mb-3">
              3. Báo cáo thống kê
            </span>
            <nav className="flex flex-col gap-1.5">
              <button
                onClick={() => setActiveTab('s-report')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                  activeTab === 's-report'
                    ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                    : 'hover:bg-black/5 text-slate-700'
                }`}
              >
                <TrendingUp size={14} />
                Báo cáo & Phân tích
              </button>
            </nav>
          </div>
        )}

        {isCurrentlyAdmin && (
          <div>
            <span className="block text-[9px] uppercase tracking-widest font-bold text-[#86868B] mb-3">
              4. Quản trị hệ thống
            </span>
            <nav className="flex flex-col gap-1.5">
              <button
                onClick={() => setActiveTab('s-users')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                  activeTab === 's-users'
                    ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                    : 'hover:bg-black/5 text-slate-700'
                }`}
              >
                <Users size={14} />
                Tài khoản người dùng
              </button>
              <button
                onClick={() => setActiveTab('s-roles')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                  activeTab === 's-roles'
                    ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                    : 'hover:bg-black/5 text-slate-700'
                }`}
              >
                <FolderSync size={14} />
                Phân quyền vai trò
              </button>
              <button
                onClick={() => setActiveTab('s-depts')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                  activeTab === 's-depts'
                    ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                    : 'hover:bg-black/5 text-slate-700'
                }`}
              >
                <MapPin size={14} />
                Quản lý khoa phòng
              </button>
            </nav>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-black/5 space-y-4">
        {pendingRegsCount > 0 && isCurrentlyAdmin && (
          <button
            onClick={() => setActiveTab('s-users')}
            className="w-full text-center py-2 px-3 bg-[#FEF3C7] border border-[#D97706] text-[#92400E] text-[10px] font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5"
          >
            <Users size={12} />
            {pendingRegsCount} đăng ký chờ phê duyệt
          </button>
        )}

        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-xs font-semibold uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-1.5"
        >
          <LogOut size={12} />
          Đăng Xuất
        </button>
      </div>
    </aside>
  );
}
