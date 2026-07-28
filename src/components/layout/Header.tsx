/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shirt, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react';
import { Account } from '../../types';

interface HeaderProps {
  isOnline: boolean;
  currentAccount: Account | null;
  currentRoleName: string;
  currentWardName: string;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
}

export default function Header({
  isOnline,
  currentAccount,
  currentRoleName,
  currentWardName
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
