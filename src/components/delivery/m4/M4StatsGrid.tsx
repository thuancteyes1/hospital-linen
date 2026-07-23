import React from 'react';
import { WardDeliverySlip, LaundryDispatch } from '../../../types';

interface M4StatsGridProps {
  wardDebtsList: WardDeliverySlip[];
  companyDebtsList: LaundryDispatch[];
  totalWardOwedQty: number;
  totalCompanyOwedQty: number;
  oldestWardAge: number;
  oldestCompanyAge: number;
  wardOverdueCount: number;
  companyOverdueCount: number;
}

export default function M4StatsGrid({
  wardDebtsList,
  companyDebtsList,
  totalWardOwedQty,
  totalCompanyOwedQty,
  oldestWardAge,
  oldestCompanyAge,
  wardOverdueCount,
  companyOverdueCount
}: M4StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-rose-50 to-red-50/50 border border-rose-200 rounded-2xl p-4 shadow-2xs flex items-center gap-4">
        <div className="w-10 h-10 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center text-lg shrink-0">🏥</div>
        <div>
          <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500 font-bold">Nợ Khoa Phòng</span>
          <span className="block text-lg font-mono font-black text-rose-700">{wardDebtsList.length} phiếu</span>
          <span className="text-[10px] text-stone-500 font-medium">Đang nợ: <b>{totalWardOwedQty}</b> cái</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl p-4 shadow-2xs flex items-center gap-4">
        <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center text-lg shrink-0">🚚</div>
        <div>
          <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500 font-bold">Nợ Xưởng Giặt</span>
          <span className="block text-lg font-mono font-black text-amber-700">{companyDebtsList.length} bill nợ</span>
          <span className="text-[10px] text-stone-500 font-medium">Xưởng nợ: <b>{totalCompanyOwedQty}</b> cái</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 rounded-2xl p-4 shadow-2xs flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center text-lg shrink-0">⏳</div>
        <div>
          <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500 font-bold">Nợ Lâu Nhất</span>
          <span className="block text-lg font-mono font-black text-blue-700">{Math.max(oldestWardAge, oldestCompanyAge)} ngày trước</span>
          <span className="text-[10px] text-stone-500 font-medium">Nợ Khoa: {oldestWardAge}n • Nợ Cty: {oldestCompanyAge}n</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-rose-100/30 border border-red-200 rounded-2xl p-4 shadow-2xs flex items-center gap-4">
        <div className="w-10 h-10 bg-red-100 text-red-700 rounded-xl flex items-center justify-center text-lg shrink-0 animate-pulse">⚠️</div>
        <div>
          <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500 font-bold">Trễ Hạn (&gt;5 ngày)</span>
          <span className="block text-lg font-mono font-black text-red-600">{wardOverdueCount + companyOverdueCount} đơn trễ</span>
          <span className="text-[10px] text-stone-500 font-medium">Báo động đỏ công nợ trễ hạn</span>
        </div>
      </div>
    </div>
  );
}
