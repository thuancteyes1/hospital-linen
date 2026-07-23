import React from 'react';
import { ArrowUpFromLine, ArrowDownToLine, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface ReportStatsGridProps {
  reportTab: 'delivery' | 'inventory';
  reportData: {
    totalDirtyCollected: number;
    totalCleanDelivered: number;
    totalDebtLeft: number;
    totalRewash: number;
    totalLoss: number;
  };
  inventoryData: {
    totalLinenKinds: number;
    totalInCentralStock: number;
    totalInWards: number;
    totalAlertCount: number;
  };
}

export default function ReportStatsGrid({ reportTab, reportData, inventoryData }: ReportStatsGridProps) {
  if (reportTab === 'delivery') {
    const dirty = reportData?.totalDirtyCollected ?? 0;
    const clean = reportData?.totalCleanDelivered ?? 0;
    const debt = reportData?.totalDebtLeft ?? 0;
    const rewash = reportData?.totalRewash ?? 0;
    const loss = reportData?.totalLoss ?? 0;

    const returnRate = dirty > 0 ? ((clean / dirty) * 100).toFixed(1) : "0.0";

    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Thu gom dơ */}
        <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider font-bold">Thu Gom Đồ Dơ</span>
            <ArrowUpFromLine size={16} className="text-stone-400" />
          </div>
          <div className="text-xl font-mono font-black text-stone-900 mt-1">{dirty.toLocaleString()} cái</div>
          <span className="text-[10px] text-stone-500 font-medium">Toàn viện lũy kế</span>
        </div>

        {/* Bàn giao sạch */}
        <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider font-bold">Cấp Trả Sạch</span>
            <ArrowDownToLine size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl font-mono font-black text-emerald-700 mt-1">{clean.toLocaleString()} cái</div>
          <span className="text-[10px] text-emerald-600 font-medium">Tỷ lệ trả sạch: <b>{returnRate}%</b></span>
        </div>

        {/* Tồn nợ đọng */}
        <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider font-bold">Nợ Đọng Khoa</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-mono font-black text-amber-700 mt-1">{debt.toLocaleString()} cái</div>
          <span className="text-[10px] text-amber-600 font-medium">Chưa hoàn tất sạch</span>
        </div>

        {/* Giặt lại */}
        <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider font-bold">Giặt Lại (Bẩn)</span>
            <RefreshCw size={14} className="text-indigo-500" />
          </div>
          <div className="text-xl font-mono font-black text-indigo-700 mt-1">{rewash.toLocaleString()} cái</div>
          <span className="text-[10px] text-indigo-600 font-medium">Xử lý tái giặt</span>
        </div>

        {/* Hao hụt rách */}
        <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider font-bold">Hao Hụt / Hủy</span>
            <ShieldAlert size={16} className="text-rose-500 animate-pulse" />
          </div>
          <div className="text-xl font-mono font-black text-rose-700 mt-1">{loss.toLocaleString()} cái</div>
          <span className="text-[10px] text-rose-600 font-medium">Thải loại / rách hỏng</span>
        </div>
      </div>
    );
  }

  const centralStock = inventoryData?.totalInCentralStock ?? 0;
  const wardsStock = inventoryData?.totalInWards ?? 0;

  // Inventory stats
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider font-bold">Chủng Loại Mặt Hàng</span>
          <CheckCircle size={16} className="text-blue-500" />
        </div>
        <div className="text-xl font-mono font-black text-blue-900 mt-1">{inventoryData?.totalLinenKinds ?? 0} loại</div>
        <span className="text-[10px] text-stone-500 font-medium">Danh mục mẫu toàn viện</span>
      </div>

      <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider font-bold">Tồn Kho Trung Tâm</span>
          <ArrowDownToLine size={16} className="text-indigo-500" />
        </div>
        <div className="text-xl font-mono font-black text-indigo-700 mt-1">{centralStock.toLocaleString()} cái</div>
        <span className="text-[10px] text-indigo-600 font-medium">Tồn tại kho chính bệnh viện</span>
      </div>

      <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider font-bold">Tồn Các Khoa Lâm Sàng</span>
          <ArrowUpFromLine size={16} className="text-emerald-500" />
        </div>
        <div className="text-xl font-mono font-black text-emerald-700 mt-1">{wardsStock.toLocaleString()} cái</div>
        <span className="text-[10px] text-emerald-600 font-medium">Phân rã tại 12 khoa lâm sàng</span>
      </div>

      <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider font-bold">Báo Động Tồn Thấp</span>
          <ShieldAlert size={16} className="text-rose-500 animate-pulse" />
        </div>
        <div className="text-xl font-mono font-black text-rose-700 mt-1">{inventoryData?.totalAlertCount ?? 0} mặt hàng</div>
        <span className="text-[10px] text-rose-600 font-medium">Tồn thấp hơn mức an toàn</span>
      </div>
    </div>
  );
}
