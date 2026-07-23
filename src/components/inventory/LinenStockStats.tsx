import React from 'react';

interface StatsData {
  totalItems: number;
  totalKC: number;
  totalKP: number;
  errCount: number;
  warnCount: number;
  okCount: number;
}

interface LinenStockStatsProps {
  stats: StatsData;
  isWardUser: boolean;
}

export default function LinenStockStats({ stats, isWardUser }: LinenStockStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="border border-[#1A1A1A] bg-[#F5F2ED] p-4 flex flex-col justify-between shadow-2xs">
        <span className="text-[10px] uppercase font-black tracking-widest text-[#8C8984] font-bold">Mặt Hàng</span>
        <span className="text-xl font-mono font-black text-[#1A1A1A] block mt-1">{stats.totalItems.toLocaleString()} loại</span>
      </div>

      {!isWardUser ? (
        <>
          <div className="border border-[#1A1A1A] bg-[#F5F2ED] p-4 flex flex-col justify-between shadow-2xs">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#8C8984] font-bold">Kho Trung Tâm</span>
            <span className="text-xl font-mono font-black text-blue-700 block mt-1">{stats.totalKC.toLocaleString()} cái</span>
          </div>
          <div className="border border-[#1A1A1A] bg-[#F5F2ED] p-4 flex flex-col justify-between shadow-2xs">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#8C8984] font-bold">Lâm Sàng Phân Bổ</span>
            <span className="text-xl font-mono font-black text-amber-700 block mt-1">{stats.totalKP.toLocaleString()} cái</span>
          </div>
          <div className="border border-[#1A1A1A] bg-[#F5F2ED] p-4 flex flex-col justify-between shadow-2xs">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#8C8984] font-bold">Cảnh Báo Tồn</span>
            <div className="flex gap-2 items-center mt-1">
              {stats.errCount > 0 && <span className="text-xs font-bold text-red-600 font-mono">Hết: {stats.errCount}</span>}
              {stats.warnCount > 0 && <span className="text-xs font-bold text-amber-600 font-mono">Thấp: {stats.warnCount}</span>}
              {stats.errCount === 0 && stats.warnCount === 0 && <span className="text-xs font-bold text-emerald-600">Ổn định ✓</span>}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="border border-[#1A1A1A] bg-[#F5F2ED] p-4 flex flex-col justify-between shadow-2xs col-span-3">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#8C8984] font-bold">Tổng Tồn Khoa Lâm Sàng</span>
            <span className="text-xl font-mono font-black text-emerald-700 block mt-1">{stats.totalKP.toLocaleString()} cái</span>
          </div>
        </>
      )}
    </div>
  );
}
