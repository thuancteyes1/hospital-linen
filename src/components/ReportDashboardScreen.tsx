import React, { useState, useMemo } from 'react';
import { 
  FileText, Calendar, Filter, Download, Printer, TrendingUp, AlertTriangle, 
  CheckCircle, ShieldAlert, Award, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Layers,
  FileSpreadsheet, Lightbulb, Trash2, BarChart3, Sparkles, CheckCircle2, AlertCircle, Check
} from 'lucide-react';
import { WardDeliverySlip, LaundryDispatch, LinenItem, HistoryItem } from '../types';
import {
  getYearMonth as getYearMonthHelper,
  getQuarter as getQuarterHelper,
  getAvailableMonthsAndYears,
  getInventoryData,
  getReportData
} from '../utils/reportHelpers';

import ReportStatsGrid from './reports/ReportStatsGrid';
import ReportDeliveryCharts from './reports/ReportDeliveryCharts';
import ReportInventoryCharts from './reports/ReportInventoryCharts';

interface ReportDashboardScreenProps {
  wardDeliverySlips: WardDeliverySlip[];
  laundryDispatches: LaundryDispatch[];
  items: LinenItem[];
  history: HistoryItem[];
  departments: string[];
  isWardUser: boolean;
  currentWardName: string;
  detailAllocations?: Record<string, [string, number][]>;
  onGenerateTestData?: () => void;
  hasSimulatedData?: boolean;
  onClearTestData?: () => void;
}

export default function ReportDashboardScreen({
  wardDeliverySlips = [],
  laundryDispatches = [],
  items = [],
  history = [],
  departments = [],
  isWardUser,
  currentWardName,
  detailAllocations = {},
  onGenerateTestData,
  hasSimulatedData = false,
  onClearTestData
}: ReportDashboardScreenProps) {
  // Filter States
  const [timeUnit, setTimeUnit] = useState<'day' | 'month' | 'quarter' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // format: 'YYYY-MM'
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all'); // format: 'Q1', 'Q2', etc.
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (wardDeliverySlips && wardDeliverySlips.length > 0) {
      const sorted = [...wardDeliverySlips]
        .filter(s => s.createdAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (sorted.length > 0) {
        return sorted[0].createdAt.slice(0, 10);
      }
    }
    return '2026-07-21';
  });
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const [reportTab, setReportTab] = useState<'delivery' | 'inventory'>('delivery');
  const [selectedInventoryLoc, setSelectedInventoryLoc] = useState<string>('all');
  const [selectedInventoryGroup, setSelectedInventoryGroup] = useState<string>('all');

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

  // List of available months & quarters from slips & history
  const { availableMonths, availableYears } = useMemo(() => {
    return getAvailableMonthsAndYears(wardDeliverySlips, history);
  }, [wardDeliverySlips, history]);

  // Set default month to latest available or current
  React.useEffect(() => {
    if (availableMonths.length > 0 && selectedMonth === 'all') {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths]);

  // Determine effective department filter
  const effectiveDept = isWardUser ? currentWardName : selectedDept;

  const isNoData = useMemo(() => {
    return wardDeliverySlips.length === 0 && history.length === 0;
  }, [wardDeliverySlips, history]);

  // --- COMPUTE INVENTORY STATISTICS & CHART DATA ---
  const inventoryData = useMemo(() => {
    return getInventoryData({
      items,
      detailAllocations,
      departments,
      selectedInventoryLoc,
      selectedInventoryGroup
    });
  }, [items, detailAllocations, departments, selectedInventoryLoc, selectedInventoryGroup]);

  // --- COMPUTE STATISTICS & CHART DATA ---
  const reportData = useMemo(() => {
    return getReportData({
      wardDeliverySlips,
      history,
      items,
      departments,
      timeUnit,
      selectedMonth,
      selectedQuarter,
      selectedYear,
      selectedDate,
      effectiveDept
    });
  }, [wardDeliverySlips, history, items, departments, timeUnit, selectedMonth, selectedQuarter, selectedYear, selectedDate, effectiveDept]);

  // Export 1.5: Styled Beautiful Excel Report (XLS format with HTML + CSS styling)
  const handleExportStyledExcel = () => {
    const returnRate = reportData.totalDirtyCollected > 0 
      ? ((reportData.totalCleanDelivered / reportData.totalDirtyCollected) * 100).toFixed(1)
      : "0.0";
    
    const timeText = timeUnit === 'day'
      ? `Ngày ${selectedDate}`
      : timeUnit === 'month' 
      ? `Tháng ${selectedMonth === 'all' ? 'Tất cả' : selectedMonth}`
      : timeUnit === 'quarter'
      ? `Quý ${selectedQuarter === 'all' ? 'Tất cả' : selectedQuarter} - Năm ${selectedYear}`
      : `Năm ${selectedYear}`;
      
    const deptText = effectiveDept === 'all' ? 'Tất cả khoa phòng lâm sàng' : effectiveDept;
    
    const now = new Date();
    const exportTimeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let excelHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          td, th { padding: 8px 12px; font-size: 11pt; border: 1px solid #D1D5DB; }
          .title { font-family: 'Georgia', serif; font-size: 18pt; font-weight: bold; color: #1E3A8A; text-align: center; }
          .subtitle { font-size: 11pt; color: #4B5563; text-align: center; font-style: italic; }
          .meta-label { font-weight: bold; color: #374151; background-color: #F3F4F6; }
          .header-row th { background-color: #1E3A8A; color: #FFFFFF; font-weight: bold; text-align: center; font-size: 11pt; }
          .stats-card { border: 1.5pt solid #3B82F6; border-radius: 8px; text-align: center; }
          .stats-num { font-size: 16pt; font-weight: bold; color: #1E3A8A; }
          .stats-title { font-size: 9pt; color: #6B7280; font-weight: bold; text-transform: uppercase; }
          .num-val { text-align: right; font-family: 'Consolas', monospace; }
          .bold-total { font-weight: bold; background-color: #F3F4F6; }
          .alert-cell { background-color: #FEE2E2; color: #991B1B; font-weight: bold; }
          .ok-cell { background-color: #D1FAE5; color: #065F46; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="8" class="title">BÁO CÁO NGHIỆP VỤ & TỒN KHO ĐỒ VẢI LÂM SÀNG</td></tr>
          <tr><td colspan="8" class="subtitle">Bệnh viện Đa khoa Quốc tế HospLinenPro</td></tr>
          <tr><td colspan="8"></td></tr>
          
          <!-- THÔNG TIN BỘ LỌC -->
          <tr>
            <td colspan="2" class="meta-label">Khoảng thời gian:</td>
            <td colspan="2">${timeText}</td>
            <td colspan="2" class="meta-label">Khoa phòng lọc:</td>
            <td colspan="2">${deptText}</td>
          </tr>
          <tr>
            <td colspan="2" class="meta-label">Ngày xuất bản:</td>
            <td colspan="2">${exportTimeStr}</td>
            <td colspan="2" class="meta-label">Trạng thái dữ liệu:</td>
            <td colspan="2">${hasSimulatedData ? 'Dữ liệu Thử nghiệm/Giả lập' : 'Dữ liệu Hệ thống Thực tế'}</td>
          </tr>
          <tr><td colspan="8"></td></tr>

          <!-- CHỈ SỐ HOẠT ĐỘNG CHÍNH -->
          <tr>
            <td colspan="2" class="stats-card"><span class="stats-title">Thu Gom Đồ Dơ</span><br/><span class="stats-num">${(reportData.totalDirtyCollected ?? 0).toLocaleString()}</span></td>
            <td colspan="2" class="stats-card"><span class="stats-title">Cấp Trả Sạch</span><br/><span class="stats-num">${(reportData.totalCleanDelivered ?? 0).toLocaleString()}</span></td>
            <td colspan="2" class="stats-card"><span class="stats-title">Tỷ Lệ Trả Sạch</span><br/><span class="stats-num">${returnRate}%</span></td>
            <td colspan="2" class="stats-card"><span class="stats-title">Hao Hụt & Giặt Lại</span><br/><span class="stats-num">${((reportData.totalDiscarded ?? 0) + (reportData.totalRewash ?? 0)).toLocaleString()}</span></td>
          </tr>
          <tr><td colspan="8"></td></tr>

          <!-- BẢNG CHI TIẾT SẢN PHẨM -->
          <tr class="header-row">
            <th>Mã</th>
            <th>Tên Đồ Vải</th>
            <th>Nhóm Mặt Hàng</th>
            <th>Lượng Thu Dơ</th>
            <th>Lượng Trả Sạch</th>
            <th>Tồn Nợ Giao Nhận</th>
            <th>Yêu Cầu Giặt Lại</th>
            <th>Hao Hụt / Hủy Rách</th>
          </tr>
    `;

    reportData.itemTableData.forEach(st => {
      const debt = (st.dirty ?? 0) - (st.clean ?? 0);
      excelHTML += `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${st.ma}</td>
          <td style="font-weight: bold;">${st.ten}</td>
          <td>${st.nhom}</td>
          <td class="num-val">${(st.dirty ?? 0).toLocaleString()}</td>
          <td class="num-val">${(st.clean ?? 0).toLocaleString()}</td>
          <td class="num-val" style="font-weight: bold; color: ${debt > 0 ? '#DC2626' : '#2563EB'}">${debt > 0 ? '+' + debt : debt === 0 ? '0' : debt}</td>
          <td class="num-val" style="color: #D97706">${(st.rewash ?? 0).toLocaleString()}</td>
          <td class="num-val" style="color: #DC2626">${(st.discarded ?? 0).toLocaleString()}</td>
        </tr>
      `;
    });

    excelHTML += `
          <tr class="bold-total">
            <td colspan="3" style="text-align: center;">TỔNG CỘNG LƯỢNG LUÂN CHUYỂN</td>
            <td class="num-val">${(reportData.totalDirtyCollected ?? 0).toLocaleString()}</td>
            <td class="num-val">${(reportData.totalCleanDelivered ?? 0).toLocaleString()}</td>
            <td class="num-val" style="color: #DC2626">${((reportData.totalDirtyCollected ?? 0) - (reportData.totalCleanDelivered ?? 0)).toLocaleString()}</td>
            <td class="num-val">${(reportData.totalRewash ?? 0).toLocaleString()}</td>
            <td class="num-val">${(reportData.totalDiscarded ?? 0).toLocaleString()}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHTML], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `BaoCao_LinenManagement_Dashboard_${timeUnit}_${selectedMonth || selectedYear}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 border border-black/10 rounded-2xl shadow-xs">
        <div>
          <span className="bg-blue-100 text-blue-800 text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-full">
            Hệ thống Báo cáo & Phân tích
          </span>
          <h2 className="font-serif font-black text-2xl text-stone-900 mt-1.5">
            Báo Cáo Nghiệp Vụ Đồ Vải
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Phân tích chi tiết lượng luân chuyển, giao nhận dơ/sạch, nợ đọng và hao hụt đồ vải lâm sàng.
          </p>
        </div>

        {/* PRINT & EXPORT ACTIONS */}
        <div className="flex flex-wrap items-center gap-2 self-stretch xl:self-auto justify-end no-print">
          <button
            onClick={handleExportStyledExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Xuất file Excel có trang trí đẹp, màu sắc cột dòng rõ ràng y hệt dashboard báo cáo"
          >
            <FileSpreadsheet size={14} />
            <span>Xuất Excel Trực Quan</span>
          </button>
        </div>
      </div>

      {/* SUB-TABS SELECTOR */}
      <div className="flex border-b border-stone-200/80 gap-6 no-print">
        <button
          onClick={() => setReportTab('delivery')}
          className={`pb-3.5 text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
            reportTab === 'delivery' 
              ? 'text-blue-600' 
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={14} />
            <span>Phân tích Giao Nhận & Luân Chuyển</span>
          </div>
          {reportTab === 'delivery' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setReportTab('inventory')}
          className={`pb-3.5 text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
            reportTab === 'inventory' 
              ? 'text-blue-600' 
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers size={14} />
            <span>Báo cáo & Biểu đồ Tồn Kho Khoa Phòng</span>
            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">Mới</span>
          </div>
          {reportTab === 'inventory' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
      </div>

      {reportTab === 'delivery' && (
        <>
          {/* FILTERS TOOLBAR */}
          <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-center no-print">
            {/* Unit Select (Day/Month/Quarter/Year) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1">
                <Calendar size={10} />
                Khoảng Thời Gian
              </label>
              <div className="grid grid-cols-4 bg-stone-100 p-1 rounded-xl">
                {(['day', 'month', 'quarter', 'year'] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => setTimeUnit(u)}
                    className={`py-1.5 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                      timeUnit === u 
                        ? 'bg-white text-blue-600 shadow-xs' 
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {u === 'day' ? 'Ngày' : u === 'month' ? 'Tháng' : u === 'quarter' ? 'Quý' : 'Năm'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic selectors based on timeUnit */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">
                Chi Tiết Thời Gian
              </label>
              
              {timeUnit === 'day' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              )}

              {timeUnit === 'month' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>Tháng {m.slice(5)}/{m.slice(0, 4)}</option>
                  ))}
                  <option value="all">Tất cả thời gian</option>
                </select>
              )}

              {timeUnit === 'quarter' && (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-2 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Cả 4 Quý</option>
                    <option value="Q1">Quý 1</option>
                    <option value="Q2">Quý 2</option>
                    <option value="Q3">Quý 3</option>
                    <option value="Q4">Quý 4</option>
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-2 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>Năm {y}</option>
                    ))}
                  </select>
                </div>
              )}

              {timeUnit === 'year' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Clinical Department filter */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1">
                <Filter size={10} />
                Khoa Phòng Lâm Sàng
              </label>
              {isWardUser ? (
                <div className="bg-stone-100 text-stone-800 text-xs font-bold px-3.5 py-2 rounded-xl border border-stone-200/50">
                  🔒 {currentWardName} (Chỉ được xem khoa phòng mình)
                </div>
              ) : (
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Tất cả khoa phòng</option>
                  {departments.filter(d => d !== 'Kho trung tâm').map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* SIMULATED DATA ACTIVE BANNER */}
          {hasSimulatedData && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn no-print">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
                  <Lightbulb size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-blue-950 uppercase tracking-wide">
                    Đang hiển thị Dữ liệu thử nghiệm / Giả lập
                  </h4>
                  <p className="text-xs text-blue-800/90 mt-1 leading-relaxed">
                    Hệ thống báo cáo đang hiển thị dữ liệu hoạt động giả lập phân bổ đều 12 tháng năm 2026 giúp bạn trải nghiệm trọn vẹn biểu đồ và phân tích nghiệp vụ.
                  </p>
                </div>
              </div>
              {onClearTestData && (
                <button
                  onClick={onClearTestData}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all shrink-0 cursor-pointer active:scale-95"
                >
                  <Trash2 size={13} />
                  <span>Xóa dữ liệu thử nghiệm</span>
                </button>
              )}
            </div>
          )}

          {/* EMPTY DATA WARNING */}
          {isNoData && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn no-print">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-amber-950 uppercase tracking-wide">
                    Chưa có dữ liệu giao nhận đồ vải thực tế
                  </h4>
                  <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                    Hệ thống báo cáo sẽ tự động lấy dữ liệu từ các phiếu giao nhận dơ và trả sạch lâm sàng để tổng hợp phân tích. Bạn có thể bấm nút bên cạnh để nạp dữ liệu phân bổ đều 12 tháng năm 2026 giúp kích hoạt và xem thử đầy đủ chức năng của phân tích và dashboard.
                  </p>
                </div>
              </div>
              {onGenerateTestData && (
                <button
                  onClick={onGenerateTestData}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all shrink-0 cursor-pointer active:scale-95"
                >
                  <Sparkles size={13} />
                  <span>Tạo Dữ Liệu Thử Nghiệm Báo Cáo</span>
                </button>
              )}
            </div>
          )}

          {/* METRICS CARDS GRID */}
          <ReportStatsGrid
            reportTab="delivery"
            reportData={reportData}
            inventoryData={inventoryData}
          />

          {/* GRAPHIC DASHBOARD VISUALIZATIONS */}
          <ReportDeliveryCharts
            reportData={reportData}
            isWardUser={isWardUser}
            timeUnit={timeUnit}
          />

          {/* DETAILED REPORT TABLE SECTION */}
          <div className="bg-white border border-black/10 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <h3 className="font-serif font-black text-lg text-stone-900">
                  Chi Tiết Lượng Đồ Vải Báo Cáo
                </h3>
                <p className="text-xs text-stone-500">
                  Thống kê từng mặt hàng đồ vải cụ thể, số thu hồi, bàn giao, tỉ lệ đền bù hao hụt và nợ tồn.
                </p>
              </div>
              <span className="bg-stone-100 text-stone-700 text-[10px] font-mono font-bold px-2 py-1 rounded">
                Tìm thấy {reportData.itemTableData.length} loại đồ vải phát sinh
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-black/10 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Mã</th>
                    <th className="py-3 px-4">Tên Đồ Vải</th>
                    <th className="py-3 px-4">Nhóm Nhãn</th>
                    <th className="py-3 px-4 text-right">Lượng Thu Dơ</th>
                    <th className="py-3 px-4 text-right">Lượng Trả Sạch</th>
                    <th className="py-3 px-4 text-right">Tồn Nợ Giao Nhận</th>
                    <th className="py-3 px-4 text-right">Giặt Lại</th>
                    <th className="py-3 px-4 text-right">Mất / Hủy rách</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 font-medium text-stone-800">
                  {reportData.itemTableData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-400 italic font-serif">
                        Không có bất kỳ phát sinh giao nhận dơ/sạch nào trong khoảng thời gian đã lọc.
                      </td>
                    </tr>
                  ) : (
                    reportData.itemTableData.map(st => {
                      const debt = st.dirty - st.clean;
                      return (
                        <tr key={st.ma} className="hover:bg-stone-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">{st.ma}</td>
                          <td className="py-3 px-4 font-bold text-stone-900">{st.ten}</td>
                          <td className="py-3 px-4 text-[10px] uppercase text-stone-500 font-semibold">{st.nhom}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                            {st.dirty.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            {st.clean.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {debt > 0 ? (
                              <span className="text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full text-[10px] font-black">
                                +{debt.toLocaleString()} cái
                              </span>
                            ) : debt < 0 ? (
                              <span className="text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                {debt.toLocaleString()} cái
                              </span>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {st.rewash > 0 ? (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">
                                {st.rewash}
                              </span>
                            ) : (
                              <span className="text-stone-400/50">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {st.discarded > 0 ? (
                              <span className="text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[10px] font-bold">
                                {st.discarded} cái
                              </span>
                            ) : (
                              <span className="text-stone-400/50">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {reportData.itemTableData.length > 0 && (
                  <tfoot className="bg-stone-50 border-t border-black/10 font-black text-stone-900">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 uppercase text-[10px] tracking-wider text-stone-500">
                        TỔNG CỘNG LƯỢNG BÁO CÁO
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700">
                        {(reportData.totalDirtyCollected ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        {(reportData.totalCleanDelivered ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-800">
                        {(() => {
                          const finalDebt = (reportData.totalDirtyCollected ?? 0) - (reportData.totalCleanDelivered ?? 0);
                          return finalDebt > 0 ? `+${finalDebt.toLocaleString()} nợ` : finalDebt < 0 ? `${finalDebt.toLocaleString()}` : 'Cân bằng';
                        })()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-800">
                        {(reportData.totalRewash ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-red-700">
                        {(reportData.totalDiscarded ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {reportTab === 'inventory' && (
        <div className="space-y-6 animate-fadeIn">
          {/* INVENTORY FILTERS & CONTROLS */}
          <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between no-print">
            <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
              {/* Location Select */}
              <div className="space-y-1.5 w-full md:w-60">
                <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1">
                  <Filter size={10} />
                  Khu vực / Khoa phòng
                </label>
                <select
                  value={selectedInventoryLoc}
                  onChange={(e) => setSelectedInventoryLoc(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Tất cả viện (Kho chính + Khoa phòng)</option>
                  <option value="Kho trung tâm">Kho chính (Trung tâm)</option>
                  {departments.filter(d => d !== 'Kho trung tâm').map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Group Select */}
              <div className="space-y-1.5 w-full md:w-48">
                <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1">
                  <Layers size={10} />
                  Nhóm đồ vải
                </label>
                <select
                  value={selectedInventoryGroup}
                  onChange={(e) => setSelectedInventoryGroup(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Tất cả nhóm</option>
                  {inventoryData.uniqueGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* INVENTORY SUMMARY CARDS */}
          <ReportStatsGrid
            reportTab="inventory"
            reportData={reportData}
            inventoryData={inventoryData}
          />

          {/* DYNAMIC CHARTS GRID */}
          <ReportInventoryCharts
            inventoryData={inventoryData}
            selectedInventoryLoc={selectedInventoryLoc}
            selectedInventoryGroup={selectedInventoryGroup}
          />

          {/* LOWER GRID: TOP ITEMS & DEFICIT ALERTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Top Stocked Items */}
            <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-2 border-b border-stone-100 pb-3">
                <CheckCircle size={15} className="text-blue-600" />
                Mặt Hàng Đồ Vải Tồn Lớn Nhất {selectedInventoryLoc === 'all' ? 'Toàn Viện' : (selectedInventoryLoc === 'Kho trung tâm' ? 'Tại Kho Chính' : `Tại Khoa ${selectedInventoryLoc}`)}
              </h3>

              <div className="space-y-3">
                {inventoryData.topStockedItems.map((item) => {
                  const percentOfTotal = Math.min(100, Math.round((item.localQty / (inventoryData.filteredTotalStock || 1)) * 100));
                  return (
                    <div key={item.ma} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <div>
                          <span className="font-mono bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded text-[10px] mr-1.5 font-bold">
                            {item.ma}
                          </span>
                          <span className="font-bold text-stone-800">{item.ten}</span>
                        </div>
                        <div className="font-mono font-bold text-stone-900">
                          {item.localQty.toLocaleString()} cái <span className="text-stone-400 font-normal text-[10px]">({percentOfTotal}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-blue-600 rounded-l-full" 
                          style={{ width: `${Math.round((item.central / (item.total || 1)) * 100)}%` }}
                          title={`Kho chính: ${item.central} cái`}
                        />
                        <div 
                          className="h-full bg-purple-500 rounded-r-full" 
                          style={{ width: `${Math.round((item.wards / (item.total || 1)) * 100)}%` }}
                          title={`Các khoa phòng: ${item.wards} cái`}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-stone-400">
                        <span>Kho chính: {item.central.toLocaleString()} cái ({Math.round((item.central / (item.total || 1)) * 100)}%)</span>
                        <span>Khoa phòng: {item.wards.toLocaleString()} cái ({Math.round((item.wards / (item.total || 1)) * 100)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Deficit and Alert Items list */}
            <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-2 border-b border-stone-100 pb-3 text-rose-600">
                <AlertTriangle size={15} />
                Cảnh Báo Đồ Vải Thiếu Hụt Định Mức An Toàn
              </h3>

              {inventoryData.alertItems.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="text-xs font-bold text-emerald-800 uppercase">Mức tồn kho an toàn tuyệt đối</h4>
                  <p className="text-[11px] text-stone-400 max-w-xs">Tất cả các sản phẩm đồ vải toàn viện đều đang ở mức tồn bằng hoặc cao hơn mức dự phòng tối thiểu.</p>
                </div>
              ) : (
                <div className="space-y-4.5 max-h-80 overflow-y-auto pr-1 no-scrollbar">
                  <p className="text-[11px] text-stone-500 italic">Danh sách đồ vải có tổng tồn toàn viện dưới định mức tối thiểu an toàn cần mua sắm bổ sung:</p>
                  
                  {inventoryData.alertItems.map((item) => {
                    const ratio = Math.round((item.total / (item.minStock || 1)) * 100);
                    return (
                      <div key={item.ma} className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-rose-100 text-rose-800 text-[9px] font-black px-1.5 py-0.5 rounded">
                              {item.ma}
                            </span>
                            <span className="font-bold text-xs text-stone-800">{item.ten}</span>
                          </div>
                          <div className="text-[10px] text-stone-500">
                            Định mức tối thiểu: <strong className="text-stone-700">{item.minStock} cái</strong> • Tồn thực tế: <strong className="text-rose-600">{item.total} cái</strong>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="block text-xs font-black text-rose-600">
                            Thiếu {item.deficit.toLocaleString()} cái
                          </span>
                          <span className="inline-block bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5">
                            Chỉ đạt {ratio}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* INTERACTIVE GRID / MATRIX EXPLORER */}
          <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={15} className="text-stone-800" />
                  Tra cứu chi tiết phân bổ tồn kho
                </h3>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Hiển thị số lượng tồn tại khu vực đã chọn: <strong className="text-stone-700">{selectedInventoryLoc === 'all' ? 'Toàn viện' : selectedInventoryLoc}</strong>
                </p>
              </div>

              <div className="bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl text-[11px] font-medium text-stone-700 flex gap-4">
                <span>Tổng mặt hàng: <strong>{inventoryData.filteredExplorerItems.length}</strong></span>
                <span>Tổng lượng đồ vải: <strong>{inventoryData.filteredExplorerItems.reduce((s, r) => s + r.qty, 0).toLocaleString()} cái</strong></span>
              </div>
            </div>

            {/* Table Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/10 text-stone-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3 px-2">Mã</th>
                    <th className="py-3 px-2">Tên Đồ Vải</th>
                    <th className="py-3 px-2">Nhóm</th>
                    <th className="py-3 px-2 text-right">Tồn Ở Khu Vực</th>
                    <th className="py-3 px-2 text-right">Tồn Kho Chính</th>
                    {selectedInventoryLoc === 'all' && (
                      <th className="py-3 px-2 text-right">Tổng Khoa Phòng</th>
                    )}
                    <th className="py-3 px-2 text-center">Trạng Thái An Toàn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {inventoryData.filteredExplorerItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400 italic">
                        Không có sản phẩm nào khớp với bộ lọc nhóm đã chọn.
                      </td>
                    </tr>
                  ) : (
                    inventoryData.filteredExplorerItems.map((item) => {
                      const totalAllocatedToWards = item.allocs.reduce((s, r) => s + r[1], 0);
                      const totalAllHospital = item.central + totalAllocatedToWards;
                      const isAlert = totalAllHospital < item.minStock;
                      
                      return (
                        <tr key={item.ma} className="hover:bg-stone-50/50 transition-colors">
                          <td className="py-3.5 px-2 font-mono font-bold text-stone-500">
                            {item.ma}
                          </td>
                          <td className="py-3.5 px-2 font-bold text-stone-800">
                            {item.ten}
                          </td>
                          <td className="py-3.5 px-2">
                            <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                              {item.nhom}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono font-black text-stone-900 text-sm">
                            {item.qty.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-2 text-right font-mono text-stone-500">
                            {item.central.toLocaleString()}
                          </td>
                          {selectedInventoryLoc === 'all' && (
                            <td className="py-3.5 px-2 text-right font-mono text-stone-500">
                              {totalAllocatedToWards.toLocaleString()}
                            </td>
                          )}
                          <td className="py-3.5 px-2 text-center">
                            {isAlert ? (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black px-2 py-0.5 rounded-full">
                                <AlertTriangle size={11} /> Thiếu (Định mức: {item.minStock})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <Check size={11} /> Đủ (Định mức: {item.minStock})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
