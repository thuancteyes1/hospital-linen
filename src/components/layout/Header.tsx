/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shirt, TrendingUp, BarChart3, AlertTriangle, RefreshCw, Radio } from 'lucide-react';
import { Account } from '../../types';

interface HeaderProps {
  isOnline: boolean;
  currentAccount: Account | null;
  currentRoleName: string;
  currentWardName: string;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  refreshData?: (silent?: boolean) => void;
  isRefreshing?: boolean;
  lastSyncedAt?: Date | null;
}

export default function Header({
  isOnline,
  currentAccount,
  currentRoleName,
  currentWardName,
  refreshData,
  isRefreshing,
  lastSyncedAt
}: HeaderProps) {
  return (
    <header className="py-2.5 px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white/40 backdrop-blur-md border-b border-black/5">
      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        <div>
          {!isOnline && (
            <div className="mb-1">
              <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-amber-500 text-white animate-pulse inline-flex items-center gap-1">
                <AlertTriangle size={11} /> Chế độ ngoại tuyến (Tự động lưu nháp)
              </span>
            </div>
          )}
          <h1 className="font-black text-2xl md:text-[26px] tracking-tight text-[#1D1D1F] leading-none flex items-center">
            <Shirt className="text-[#007AFF] shrink-0 mr-2 -mt-0.5" size={26} />
            <span>HospLinen<span className="font-bold text-[11px] tracking-widest bg-gradient-to-r from-[#007AFF] to-[#AF52DE] text-white px-2 py-0.5 ml-1.5 rounded-full inline-block align-middle uppercase shadow-md shadow-blue-500/15">PRO</span></span>
          </h1>
        </div>

        {/* Live sync & manual refresh button on header */}
        {refreshData && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshData(false)}
              disabled={isRefreshing || !isOnline}
              title="Tải lại ngay lập tức dữ liệu mới nhất từ khoa phòng mà không cần đăng xuất"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              <span>{isRefreshing ? "Đang nạp..." : "Nạp mới dữ liệu"}</span>
            </button>

            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-[10px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Auto 5s</span>
            </div>
          </div>
        )}
      </div>

      {currentAccount && (
        <div className="flex flex-row items-center gap-3 pl-3 md:pl-0 pr-0 md:pr-3 border-l md:border-l-0 md:border-r border-black/10 border-dashed shrink-0 self-end md:self-auto">
          <div className="text-left md:text-right">
            <span className="block text-[8px] uppercase tracking-widest font-bold text-[#86868B]">Phiên trực tuyến</span>
            <div className="font-bold text-sm leading-tight text-[#1D1D1F] mt-0.5">{currentAccount.name}</div>
            <div className="text-[9px] mt-1 flex flex-wrap gap-1 md:justify-end">
              <span className="px-1.5 py-0.5 rounded-full font-mono text-[8px] uppercase border bg-black/5 text-[#1D1D1F] border-black/5">
                {currentRoleName}
              </span>
              <span className="px-1.5 py-0.5 rounded-full font-mono text-[8px] uppercase border bg-[#007AFF]/10 border-[#007AFF]/20 text-[#007AFF]">
                {currentWardName}
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
