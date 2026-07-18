import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  FileText, Calendar, Filter, Download, Printer, TrendingUp, AlertTriangle, 
  CheckCircle, ShieldAlert, Award, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Layers
} from 'lucide-react';
import { WardDeliverySlip, LaundryDispatch, LinenItem, HistoryItem } from '../types';

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
  const [timeUnit, setTimeUnit] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // format: 'YYYY-MM'
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all'); // format: 'Q1', 'Q2', etc.
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const [reportTab, setReportTab] = useState<'delivery' | 'inventory'>('delivery');
  const [selectedInventoryLoc, setSelectedInventoryLoc] = useState<string>('all');
  const [selectedInventoryGroup, setSelectedInventoryGroup] = useState<string>('all');

  // Colors for Groups & Categories
  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

  // Helper: Extract Year-Month from ISO string
  const getYearMonth = (isoString?: string) => {
    if (!isoString) return '';
    return isoString.slice(0, 7); // 'YYYY-MM'
  };

  // Helper: Get Quarter from ISO string
  const getQuarter = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const month = date.getMonth(); // 0-11
    if (month >= 0 && month <= 2) return 'Q1';
    if (month >= 3 && month <= 5) return 'Q2';
    if (month >= 6 && month <= 8) return 'Q3';
    return 'Q4';
  };

  // List of available months & quarters from slips & history
  const { availableMonths, availableYears } = useMemo(() => {
    const months = new Set<string>();
    const years = new Set<string>();
    
    // Add default year
    years.add('2026');

    wardDeliverySlips.forEach(s => {
      if (s.createdAt) {
        months.add(getYearMonth(s.createdAt));
        years.add(s.createdAt.slice(0, 4));
      }
    });

    history.forEach(h => {
      if (h.date) {
        months.add(h.date.slice(0, 7));
        years.add(h.date.slice(0, 4));
      }
    });

    return {
      availableMonths: Array.from(months).sort().reverse(),
      availableYears: Array.from(years).sort().reverse()
    };
  }, [wardDeliverySlips, history]);

  // Set default month to latest available or current
  React.useEffect(() => {
    if (availableMonths.length > 0 && selectedMonth === 'all') {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths]);

  // Determine effective department filter
  const effectiveDept = isWardUser ? currentWardName : selectedDept;

  // Generate complete mock dataset if there is absolutely no data,
  // to give the user a robust experience at end of year
  const isNoData = useMemo(() => {
    return wardDeliverySlips.length === 0 && history.length === 0;
  }, [wardDeliverySlips, history]);

  // --- COMPUTE INVENTORY STATISTICS & CHART DATA ---
  const inventoryData = useMemo(() => {
    // 1. Get list of active items based on selected group filter
    const activeItemsForGroup = selectedInventoryGroup === 'all'
      ? items
      : items.filter(item => (item.nhom || 'Chưa phân nhóm') === selectedInventoryGroup);

    // 2. Compute total central stock & total ward stock matching the group filter
    let totalCentralStock = 0;
    let totalWardsStock = 0;

    activeItemsForGroup.forEach(item => {
      totalCentralStock += (item.kc || 0);
      const allocs = detailAllocations[item.ma] || [];
      allocs.forEach(([dept, qty]) => {
        if (dept !== 'Kho trung tâm') {
          totalWardsStock += qty;
        }
      });
    });

    const totalHospitalStock = totalCentralStock + totalWardsStock;

    // 3. Compute total stock strictly in the currently selected scope (Location AND Group)
    let filteredTotalStock = 0;
    activeItemsForGroup.forEach(item => {
      const central = item.kc || 0;
      const allocs = detailAllocations[item.ma] || [];
      if (selectedInventoryLoc === 'all') {
        const wardSum = allocs.filter(([d]) => d !== 'Kho trung tâm').reduce((sum, [_, q]) => sum + q, 0);
        filteredTotalStock += (central + wardSum);
      } else if (selectedInventoryLoc === 'Kho trung tâm') {
        filteredTotalStock += central;
      } else {
        const found = allocs.find(([d]) => d === selectedInventoryLoc);
        filteredTotalStock += found ? found[1] : 0;
      }
    });

    // 4. Compute wardTotals strictly for the active items (Group-filtered)
    const wardTotals: Record<string, number> = {};
    const activeDepts = departments.filter(d => d !== 'Kho trung tâm');
    activeDepts.forEach(dept => {
      wardTotals[dept] = 0;
    });

    activeItemsForGroup.forEach(item => {
      const allocs = detailAllocations[item.ma] || [];
      allocs.forEach(([dept, qty]) => {
        if (dept !== 'Kho trung tâm') {
          wardTotals[dept] = (wardTotals[dept] || 0) + qty;
        }
      });
    });

    const wardInventoryList = Object.entries(wardTotals)
      .map(([ward, qty]) => ({ name: ward, value: qty }))
      .sort((a, b) => b.value - a.value);

    // 5. Compute dynamic group structure for the selected location
    // If selectedInventoryGroup is 'all': Pie chart shows the breakdown of GROUPS at that location
    // If selectedInventoryGroup is NOT 'all': Pie chart shows the breakdown of individual ITEMS under that group at that location
    let groupInventoryList: Array<{ name: string; value: number }> = [];

    if (selectedInventoryGroup === 'all') {
      const groupTotalsMap: Record<string, number> = {};
      items.forEach(item => {
        const groupName = item.nhom || 'Chưa phân nhóm';
        let qty = 0;
        if (selectedInventoryLoc === 'all') {
          const central = item.kc || 0;
          const allocs = detailAllocations[item.ma] || [];
          const wardSum = allocs.filter(([d]) => d !== 'Kho trung tâm').reduce((sum, [_, q]) => sum + q, 0);
          qty = central + wardSum;
        } else if (selectedInventoryLoc === 'Kho trung tâm') {
          qty = item.kc || 0;
        } else {
          const allocs = detailAllocations[item.ma] || [];
          const found = allocs.find(([d]) => d === selectedInventoryLoc);
          qty = found ? found[1] : 0;
        }
        groupTotalsMap[groupName] = (groupTotalsMap[groupName] || 0) + qty;
      });

      groupInventoryList = Object.entries(groupTotalsMap)
        .map(([group, qty]) => ({ name: group, value: qty }))
        .filter(g => g.value > 0)
        .sort((a, b) => b.value - a.value);
    } else {
      const itemTotalsMap: Record<string, number> = {};
      activeItemsForGroup.forEach(item => {
        let qty = 0;
        if (selectedInventoryLoc === 'all') {
          const central = item.kc || 0;
          const allocs = detailAllocations[item.ma] || [];
          const wardSum = allocs.filter(([d]) => d !== 'Kho trung tâm').reduce((sum, [_, q]) => sum + q, 0);
          qty = central + wardSum;
        } else if (selectedInventoryLoc === 'Kho trung tâm') {
          qty = item.kc || 0;
        } else {
          const allocs = detailAllocations[item.ma] || [];
          const found = allocs.find(([d]) => d === selectedInventoryLoc);
          qty = found ? found[1] : 0;
        }
        itemTotalsMap[item.ten] = (itemTotalsMap[item.ten] || 0) + qty;
      });

      groupInventoryList = Object.entries(itemTotalsMap)
        .map(([name, qty]) => ({ name, value: qty }))
        .filter(i => i.value > 0)
        .sort((a, b) => b.value - a.value);
    }

    // 6. Base item stats map (hospital-wide reference for each item)
    const itemTotalStocks: Record<string, {
      ma: string;
      ten: string;
      nhom: string;
      central: number;
      wards: number;
      total: number;
      minStock: number;
    }> = {};

    items.forEach(item => {
      const central = item.kc || 0;
      let itemWardsTotal = 0;
      const allocs = detailAllocations[item.ma] || [];
      allocs.forEach(([dept, qty]) => {
        if (dept !== 'Kho trung tâm') {
          itemWardsTotal += qty;
        }
      });

      const grandTotal = central + itemWardsTotal;
      const groupName = item.nhom || 'Chưa phân nhóm';

      itemTotalStocks[item.ma] = {
        ma: item.ma,
        ten: item.ten,
        nhom: groupName,
        central,
        wards: itemWardsTotal,
        total: grandTotal,
        minStock: item.mn || 0
      };
    });

    // 7. Compute top stocked items matching selected group and location
    const topStockedItems = Object.values(itemTotalStocks)
      .filter(item => selectedInventoryGroup === 'all' || item.nhom === selectedInventoryGroup)
      .map(item => {
        let localQty = 0;
        if (selectedInventoryLoc === 'all') {
          localQty = item.total;
        } else if (selectedInventoryLoc === 'Kho trung tâm') {
          localQty = item.central;
        } else {
          const allocs = detailAllocations[item.ma] || [];
          const found = allocs.find(([d]) => d === selectedInventoryLoc);
          localQty = found ? found[1] : 0;
        }
        return {
          ...item,
          localQty
        };
      })
      .filter(item => item.localQty > 0)
      .sort((a, b) => b.localQty - a.localQty)
      .slice(0, 8);

    // 8. Alerts (below safety stock hospital-wide) matching selected group
    const alertItems = Object.values(itemTotalStocks)
      .filter(item => {
        const matchesGroup = selectedInventoryGroup === 'all' || item.nhom === selectedInventoryGroup;
        return matchesGroup && item.total < item.minStock;
      })
      .map(item => ({
        ...item,
        deficit: item.minStock - item.total
      }))
      .sort((a, b) => b.deficit - a.deficit);

    // 9. Filtered list for the explorer grid
    const filteredExplorerItems = items.map(item => {
      const central = item.kc || 0;
      const allocs = detailAllocations[item.ma] || [];
      
      let targetQty = 0;
      if (selectedInventoryLoc === 'all') {
        targetQty = central + allocs.reduce((sum, [_, q]) => sum + q, 0);
      } else if (selectedInventoryLoc === 'Kho trung tâm') {
        targetQty = central;
      } else {
        const found = allocs.find(([d]) => d === selectedInventoryLoc);
        targetQty = found ? found[1] : 0;
      }

      return {
        ma: item.ma,
        ten: item.ten,
        nhom: item.nhom || 'Chưa phân nhóm',
        qty: targetQty,
        minStock: item.mn || 0,
        central,
        allocs
      };
    }).filter(item => {
      const matchesGroup = selectedInventoryGroup === 'all' || item.nhom === selectedInventoryGroup;
      return matchesGroup;
    });

    // Unique groups list
    const uniqueGroups = Array.from(new Set(items.map(i => i.nhom || 'Chưa phân nhóm')));

    return {
      totalCentralStock,
      totalWardsStock,
      totalHospitalStock,
      filteredTotalStock,
      wardInventoryList,
      groupInventoryList,
      topStockedItems,
      alertItems,
      filteredExplorerItems,
      uniqueGroups,
      itemTotalStocks: Object.values(itemTotalStocks)
    };
  }, [items, detailAllocations, departments, selectedInventoryLoc, selectedInventoryGroup]);

  // --- COMPUTE STATISTICS & CHART DATA ---
  const reportData = useMemo(() => {
    // Filter Ward Slips
    let filteredSlips = [...wardDeliverySlips];

    // Filter by Dept
    if (effectiveDept !== 'all') {
      filteredSlips = filteredSlips.filter(s => s.dept === effectiveDept);
    }

    // Filter by Time
    if (timeUnit === 'month' && selectedMonth !== 'all') {
      filteredSlips = filteredSlips.filter(s => getYearMonth(s.createdAt) === selectedMonth);
    } else if (timeUnit === 'quarter' && selectedQuarter !== 'all') {
      filteredSlips = filteredSlips.filter(s => getQuarter(s.createdAt) === selectedQuarter && s.createdAt.startsWith(selectedYear));
    } else if (timeUnit === 'year') {
      filteredSlips = filteredSlips.filter(s => s.createdAt.startsWith(selectedYear));
    }

    // Filter general inventory history (nhap, huy, etc.)
    let filteredHistory = history.filter(h => h.status === 'confirmed');
    if (timeUnit === 'month' && selectedMonth !== 'all') {
      filteredHistory = filteredHistory.filter(h => h.date.startsWith(selectedMonth));
    } else if (timeUnit === 'quarter' && selectedQuarter !== 'all') {
      filteredHistory = filteredHistory.filter(h => getQuarter(h.date) === selectedQuarter && h.date.startsWith(selectedYear));
    } else if (timeUnit === 'year') {
      filteredHistory = filteredHistory.filter(h => h.date.startsWith(selectedYear));
    }

    // --- AGGREGATIONS ---
    let totalDirtyCollected = 0;
    let totalCleanDelivered = 0;
    let totalRewash = 0;
    let totalDiscarded = 0; // "Hủy" transactions

    const itemStats: Record<string, { 
      ma: string; 
      ten: string; 
      nhom: string;
      dirty: number; 
      clean: number; 
      rewash: number;
      discarded: number;
    }> = {};

    // Seed stats with existing active items
    items.forEach(it => {
      itemStats[it.ma] = {
        ma: it.ma,
        ten: it.ten,
        nhom: it.nhom,
        dirty: 0,
        clean: 0,
        rewash: 0,
        discarded: 0
      };
    });

    // Process slips
    filteredSlips.forEach(slip => {
      const isSlipRewash = slip.isRewash === true;
      slip.items.forEach(it => {
        // Init stats if item code not in standard catalog
        if (!itemStats[it.ma]) {
          itemStats[it.ma] = {
            ma: it.ma,
            ten: it.ten,
            nhom: it.group || 'Khác',
            dirty: 0,
            clean: 0,
            rewash: 0,
            discarded: 0
          };
        }

        const stats = itemStats[it.ma];

        // Dirty collected (at verified dirty step or original qty)
        const dirtyQty = it.verifiedDirtyQty !== undefined ? it.verifiedDirtyQty : it.qty;
        stats.dirty += dirtyQty;
        totalDirtyCollected += dirtyQty;

        // Clean returned
        const cleanQty = it.hospitalCleanQty !== undefined ? it.hospitalCleanQty : (it.cleanReturnedQty || 0);
        stats.clean += cleanQty;
        totalCleanDelivered += cleanQty;

        if (isSlipRewash) {
          stats.rewash += dirtyQty;
          totalRewash += dirtyQty;
        }
      });
    });

    // Process Discarded (Hủy) items in history
    filteredHistory.forEach(h => {
      if (h.type === 'huy') {
        h.items.forEach(it => {
          if (!itemStats[it.ma]) {
            itemStats[it.ma] = {
              ma: it.ma,
              ten: it.ten,
              nhom: 'Khác',
              dirty: 0,
              clean: 0,
              rewash: 0,
              discarded: 0
            };
          }
          itemStats[it.ma].discarded += it.qty;
          totalDiscarded += it.qty;
        });
      }
    });

    const itemTableData = Object.values(itemStats).filter(
      st => st.dirty > 0 || st.clean > 0 || st.discarded > 0 || st.rewash > 0
    );

    // Group-level distribution
    const groupMap: Record<string, { name: string; value: number }> = {};
    itemTableData.forEach(st => {
      if (!groupMap[st.nhom]) {
        groupMap[st.nhom] = { name: st.nhom, value: 0 };
      }
      groupMap[st.nhom].value += st.dirty;
    });
    const pieChartData = Object.values(groupMap);

    // Trend analysis over the active range
    // Group slips by date (e.g. YYYY-MM-DD or Month)
    const trendMap: Record<string, { dateLabel: string; dirty: number; clean: number }> = {};
    filteredSlips.forEach(s => {
      const label = timeUnit === 'year' ? getYearMonth(s.createdAt) : s.createdAt.slice(0, 10);
      if (!trendMap[label]) {
        trendMap[label] = { dateLabel: label, dirty: 0, clean: 0 };
      }
      s.items.forEach(it => {
        trendMap[label].dirty += (it.verifiedDirtyQty !== undefined ? it.verifiedDirtyQty : it.qty);
        trendMap[label].clean += (it.hospitalCleanQty !== undefined ? it.hospitalCleanQty : (it.cleanReturnedQty || 0));
      });
    });
    const trendChartData = Object.values(trendMap).sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));

    // Department breakdown
    const deptMap: Record<string, { name: string; dirty: number; clean: number }> = {};
    // Seed with clinical departments
    departments.forEach(d => {
      if (d !== 'Kho trung tâm' && d !== 'Tất cả') {
        deptMap[d] = { name: d, dirty: 0, clean: 0 };
      }
    });

    filteredSlips.forEach(s => {
      const deptName = s.dept;
      if (!deptMap[deptName]) {
        deptMap[deptName] = { name: deptName, dirty: 0, clean: 0 };
      }
      s.items.forEach(it => {
        deptMap[deptName].dirty += (it.verifiedDirtyQty !== undefined ? it.verifiedDirtyQty : it.qty);
        deptMap[deptName].clean += (it.hospitalCleanQty !== undefined ? it.hospitalCleanQty : (it.cleanReturnedQty || 0));
      });
    });

    const deptChartData = Object.values(deptMap)
      .filter(d => d.dirty > 0 || d.clean > 0)
      .sort((a, b) => b.dirty - a.dirty)
      .slice(0, 10); // top 10

    return {
      totalDirtyCollected,
      totalCleanDelivered,
      totalRewash,
      totalDiscarded,
      itemTableData,
      pieChartData,
      trendChartData,
      deptChartData,
      slipsCount: filteredSlips.length,
      filteredSlips,
      filteredHistory
    };
  }, [wardDeliverySlips, history, items, departments, timeUnit, selectedMonth, selectedQuarter, selectedYear, effectiveDept]);

  // Export 1: Product Summary Report
  const handleExportSummaryCSV = () => {
    let header = "Mã Đồ Vải,Tên Đồ Vải,Nhóm Đồ Vải,Số Lượng Đồ Dơ Thu Gom,Số Lượng Đồ Sạch Bàn Giao,Chênh Lệch Nợ (Chưa Trả),Hủy Rách Hao Hụt,Yêu Cầu Giặt Lại\n";
    let rows = reportData.itemTableData.map(st => {
      const diff = st.dirty - st.clean;
      return `"${st.ma}","${st.ten}","${st.nhom}",${st.dirty},${st.clean},${diff},${st.discarded},${st.rewash}`;
    }).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BaoCao_TongHop_DoVai_${timeUnit}_${selectedMonth || selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export 1.5: Styled Beautiful Excel Report (XLS format with HTML + CSS styling)
  const handleExportStyledExcel = () => {
    const returnRate = reportData.totalDirtyCollected > 0 
      ? ((reportData.totalCleanDelivered / reportData.totalDirtyCollected) * 100).toFixed(1)
      : "0.0";
    
    const timeText = timeUnit === 'month' 
      ? `Tháng ${selectedMonth === 'all' ? 'Tất cả' : selectedMonth}`
      : timeUnit === 'quarter'
      ? `Quý ${selectedQuarter === 'all' ? 'Tất cả' : selectedQuarter} - Năm ${selectedYear}`
      : `Năm ${selectedYear}`;
      
    const deptText = effectiveDept === 'all' ? 'Tất cả khoa phòng lâm sàng' : effectiveDept;
    
    const now = new Date();
    const exportTimeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let excelHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
<!--[if gte mso 9]><xml>
<x:ExcelWorkbook>
<x:ExcelWorksheets>
<x:ExcelWorksheet>
<x:Name>Báo cáo Đồ vải Lâm sàng</x:Name>
<x:WorksheetOptions>
<x:DisplayGridlines/>
</x:WorksheetOptions>
</x:ExcelWorksheet>
</x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml><![endif]-->
<style>
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1a1a1a;
  }
  .title-main {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 16pt;
    font-weight: bold;
    color: #1e3a8a;
    text-align: center;
    height: 30pt;
  }
  .title-sub {
    font-size: 10pt;
    color: #4b5563;
    text-align: center;
    font-style: italic;
    height: 18pt;
  }
  .meta-info {
    font-size: 9pt;
    color: #6b7280;
    text-align: center;
    height: 18pt;
  }
  .table-kpi {
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  .kpi-title {
    font-size: 9pt;
    font-weight: bold;
    text-align: center;
    height: 20pt;
    border: 0.5pt solid #cbd5e1;
  }
  .kpi-val {
    font-size: 14pt;
    font-weight: bold;
    text-align: center;
    height: 35pt;
    border: 0.5pt solid #cbd5e1;
  }
  .table-data {
    border-collapse: collapse;
  }
  .th-header {
    background-color: #0f172a;
    color: #ffffff;
    font-weight: bold;
    font-size: 10pt;
    text-align: center;
    border: 0.5pt solid #475569;
    height: 25pt;
  }
  .td-cell {
    border: 0.5pt solid #cbd5e1;
    font-size: 10pt;
    height: 22pt;
    vertical-align: middle;
  }
  .td-code {
    border: 0.5pt solid #cbd5e1;
    font-family: 'Consolas', 'Courier New', monospace;
    font-weight: bold;
    font-size: 9.5pt;
    text-align: center;
    color: #0f172a;
    background-color: #f8fafc;
  }
  .td-name {
    border: 0.5pt solid #cbd5e1;
    font-size: 10pt;
    font-weight: bold;
    padding-left: 8px;
    color: #1e293b;
  }
  .td-group {
    border: 0.5pt solid #cbd5e1;
    font-size: 9.5pt;
    font-style: italic;
    color: #64748b;
    text-align: center;
  }
  .td-number {
    border: 0.5pt solid #cbd5e1;
    font-size: 10pt;
    text-align: right;
    padding-right: 8px;
  }
  .td-debt-positive {
    border: 0.5pt solid #cbd5e1;
    font-size: 10pt;
    font-weight: bold;
    color: #b91c1c;
    background-color: #fef2f2;
    text-align: right;
    padding-right: 8px;
  }
  .td-debt-zero {
    border: 0.5pt solid #cbd5e1;
    font-size: 10pt;
    color: #15803d;
    background-color: #f0fdf4;
    text-align: right;
    padding-right: 8px;
  }
  .row-zebra {
    background-color: #f8fafc;
  }
  .row-total {
    background-color: #e2e8f0;
    font-weight: bold;
    border-top: 1.5pt solid #0f172a;
    border-bottom: 2pt double #0f172a;
    height: 25pt;
  }
  .td-total-label {
    text-align: center;
    font-size: 10pt;
    font-weight: bold;
  }
</style>
</head>
<body>
  <table>
    <!-- TITLE SECTION -->
    <tr>
      <td colspan="8" class="title-main">BÁO CÁO PHÂN TÍCH NGHIỆP VỤ & ĐỒ VẢI LÂM SÀNG</td>
    </tr>
    <tr>
      <td colspan="8" class="title-sub">Thời gian phân tích: ${timeText} | Bộ phận/Khoa phòng: ${deptText}</td>
    </tr>
    <tr>
      <td colspan="8" class="meta-info">Người xuất báo cáo: Hệ thống Quản lý LinenPro | Thời gian xuất: ${exportTimeStr}</td>
    </tr>
    <tr><td colspan="8" style="height: 10pt; border: none;"></td></tr>
  </table>

  <!-- KPI HIGHLIGHT CARDS -->
  <table class="table-kpi">
    <tr>
      <td colspan="2" class="kpi-title" style="background-color: #ffedd5; color: #9a3412;">TỔNG THU GOM ĐỒ DƠ</td>
      <td colspan="2" class="kpi-title" style="background-color: #dcfce7; color: #166534;">TỔNG TRẢ ĐỒ SẠCH</td>
      <td colspan="2" class="kpi-title" style="background-color: #dbeafe; color: #1e40af;">TỶ LỆ TRẢ ĐỒ SẠCH</td>
      <td colspan="2" class="kpi-title" style="background-color: #fee2e2; color: #991b1b;">GIẶT LẠI & HAO HỤT</td>
    </tr>
    <tr>
      <td colspan="2" class="kpi-val" style="background-color: #fffaf5; color: #c2410c;">${reportData.totalDirtyCollected.toLocaleString()}</td>
      <td colspan="2" class="kpi-val" style="background-color: #fcfdf9; color: #15803d;">${reportData.totalCleanDelivered.toLocaleString()}</td>
      <td colspan="2" class="kpi-val" style="background-color: #f8fafc; color: #1d4ed8;">${returnRate}%</td>
      <td colspan="2" class="kpi-val" style="background-color: #fffbfb; color: #b91c1c;">${(reportData.totalRewash + reportData.totalDiscarded).toLocaleString()}</td>
    </tr>
  </table>

  <table><tr><td colspan="8" style="height: 10pt; border: none;"></td></tr></table>

  <!-- MAIN DATA TABLE -->
  <table class="table-data">
    <thead>
      <tr>
        <th class="th-header" style="width: 110px;">Mã Đồ Vải</th>
        <th class="th-header" style="width: 250px;">Tên Đồ Vải</th>
        <th class="th-header" style="width: 180px;">Nhóm Đồ Vải</th>
        <th class="th-header" style="width: 130px;">Đồ Dơ Thu Gom</th>
        <th class="th-header" style="width: 130px;">Đồ Sạch Bàn Giao</th>
        <th class="th-header" style="width: 130px;">Chênh Lệch Nợ</th>
        <th class="th-header" style="width: 110px;">Giặt Lại</th>
        <th class="th-header" style="width: 110px;">Hủy / Hao Hụt</th>
      </tr>
    </thead>
    <tbody>
`;

    let totalDirty = 0;
    let totalClean = 0;
    let totalDebt = 0;
    let totalRewash = 0;
    let totalDiscarded = 0;

    reportData.itemTableData.forEach((st, idx) => {
      const debt = st.dirty - st.clean;
      totalDirty += st.dirty;
      totalClean += st.clean;
      totalDebt += debt;
      totalRewash += st.rewash;
      totalDiscarded += st.discarded;

      const zebraClass = idx % 2 === 1 ? 'row-zebra' : '';
      const debtStyleClass = debt > 0 ? 'td-debt-positive' : 'td-debt-zero';

      excelHtml += `
      <tr class="${zebraClass}">
        <td class="td-code">${st.ma}</td>
        <td class="td-name">${st.ten}</td>
        <td class="td-group">${st.nhom || 'Chưa phân loại'}</td>
        <td class="td-number">${st.dirty.toLocaleString()}</td>
        <td class="td-number">${st.clean.toLocaleString()}</td>
        <td class="${debtStyleClass}">${debt.toLocaleString()}</td>
        <td class="td-number" style="color: #4b5563;">${st.rewash.toLocaleString()}</td>
        <td class="td-number" style="color: #b91c1c;">${st.discarded.toLocaleString()}</td>
      </tr>
`;
    });

    excelHtml += `
      <tr class="row-total">
        <td colspan="3" class="td-total-label">TỔNG CỘNG HỆ THỐNG</td>
        <td class="td-number">${totalDirty.toLocaleString()}</td>
        <td class="td-number">${totalClean.toLocaleString()}</td>
        <td class="td-number" style="color: ${totalDebt > 0 ? '#b91c1c' : '#15803d'};">${totalDebt.toLocaleString()}</td>
        <td class="td-number">${totalRewash.toLocaleString()}</td>
        <td class="td-number">${totalDiscarded.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

    const blob = new Blob(["\uFEFF" + excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `BaoCao_DoiSoat_DoVai_TrucQuan_${timeUnit}_${selectedMonth || selectedYear}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export 2: Raw Operational Transactions (Pivot-Ready for Excel)
  const handleExportPivotCSV = () => {
    let header = "Ngày Giao Nhận,Số Phiếu / Mã GD,Khoa Phòng Lâm Sàng,Loại Nghiệp Vụ,Mã Đồ Vải,Tên Đồ Vải,Nhóm Phân Loại,Số Lượng Dơ,Số Lượng Sạch,Lệch Nợ,Giặt Lại,Hao Hụt / Hủy\n";
    
    const rows: string[] = [];
    
    // Process Delivery Slips
    reportData.filteredSlips.forEach(s => {
      const dateStr = s.createdAt ? s.createdAt.slice(0, 10) : "";
      s.items.forEach(it => {
        const dirty = it.verifiedDirtyQty !== undefined ? it.verifiedDirtyQty : it.qty;
        const clean = it.hospitalCleanQty !== undefined ? it.hospitalCleanQty : (it.cleanReturnedQty || 0);
        const debt = dirty - clean;
        const rewash = it.rewashQty || 0;
        const loss = it.lossQty || 0;
        const groupName = it.group || it.nhom || "Chưa phân loại";
        
        rows.push(`"${dateStr}","${s.id}","${s.dept}","Giao nhận lâm sàng","${it.ma}","${it.ten}","${groupName}",${dirty},${clean},${debt},${rewash},${loss}`);
      });
    });
    
    // Process Discarded/Loss entries from history
    reportData.filteredHistory.forEach(h => {
      const dateStr = h.date ? h.date.slice(0, 10) : "";
      if (h.type === 'huy') {
        h.items.forEach(it => {
          const catalogItem = items.find(cat => cat.ma === it.ma);
          const groupName = catalogItem ? (catalogItem.nhom || "Khác") : "Khác/Hao hụt";
          
          rows.push(`"${dateStr}","${h.id}","${h.from || 'Kho trung tâm'}","Hủy rách hao hụt","${it.ma}","${it.ten}","${groupName}",0,0,0,0,${it.qty}`);
        });
      }
    });
    
    const csvContent = "\uFEFF" + header + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `DuyLieu_Tho_PivotTable_${timeUnit}_${selectedMonth || selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
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
            <Download size={13} />
            <span>Xuất Excel Trực Quan 🎨</span>
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
        {/* Unit Select (Month/Quarter/Year) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider flex items-center gap-1">
            <Calendar size={10} />
            Khoảng Thời Gian
          </label>
          <div className="grid grid-cols-3 bg-stone-100 p-1 rounded-xl">
            {(['month', 'quarter', 'year'] as const).map(u => (
              <button
                key={u}
                onClick={() => setTimeUnit(u)}
                className={`py-1.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  timeUnit === u 
                    ? 'bg-white text-blue-600 shadow-xs' 
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {u === 'month' ? 'Tháng' : u === 'quarter' ? 'Quý' : 'Năm'}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic selectors based on timeUnit */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-stone-400 tracking-wider block">
            Chi Tiết Thời Gian
          </label>
          
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
            <span className="text-2xl mt-0.5">💡</span>
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all shrink-0 cursor-pointer active:scale-95"
            >
              🧹 Xóa dữ liệu thử nghiệm
            </button>
          )}
        </div>
      )}

      {/* EMPTY DATA WARNING */}
      {isNoData && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn no-print">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">📊</span>
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all shrink-0 cursor-pointer active:scale-95"
            >
              ⚡ Tạo Dữ Liệu Thử Nghiệm Báo Cáo
            </button>
          )}
        </div>
      )}

      {/* METRICS CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: DIRTY COLLECTED */}
        <div className="bg-white border border-black/10 rounded-2xl p-4.5 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="block text-[9px] font-black text-amber-600 uppercase tracking-wider">
              Thu Gom Đồ Dơ
            </span>
            <span className="block font-mono font-black text-2xl text-stone-900">
              {reportData.totalDirtyCollected.toLocaleString()}
            </span>
            <span className="block text-[10px] text-stone-400">
              Cái từ {reportData.slipsCount} đợt thu hồi
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <ArrowUpFromLine size={20} />
          </div>
          <div className="absolute -bottom-2 -right-2 text-stone-100/10 font-mono font-black text-6xl">
            DIRTY
          </div>
        </div>

        {/* CARD 2: CLEAN DELIVERED */}
        <div className="bg-white border border-black/10 rounded-2xl p-4.5 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-wider">
              Bàn Giao Đồ Sạch
            </span>
            <span className="block font-mono font-black text-2xl text-stone-900">
              {reportData.totalCleanDelivered.toLocaleString()}
            </span>
            <span className="block text-[10px] text-stone-400">
              Cái sạch bàn giao khoa phòng
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <ArrowDownToLine size={20} />
          </div>
          <div className="absolute -bottom-2 -right-2 text-stone-100/10 font-mono font-black text-6xl">
            CLEAN
          </div>
        </div>

        {/* CARD 3: RATIO OR ACTIVE BALANCE */}
        <div className="bg-white border border-black/10 rounded-2xl p-4.5 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="block text-[9px] font-black text-blue-600 uppercase tracking-wider">
              Tỉ Lệ Đã Giao Trả
            </span>
            <span className="block font-mono font-black text-2xl text-stone-900">
              {reportData.totalDirtyCollected > 0 
                ? `${Math.round((reportData.totalCleanDelivered / reportData.totalDirtyCollected) * 100)}%`
                : '100%'
              }
            </span>
            <span className="block text-[10px] text-stone-400">
              Nợ đọng: {Math.max(0, reportData.totalDirtyCollected - reportData.totalCleanDelivered).toLocaleString()} cái
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <CheckCircle size={20} />
          </div>
          <div className="absolute -bottom-2 -right-2 text-stone-100/10 font-mono font-black text-6xl">
            RATIO
          </div>
        </div>

        {/* CARD 4: LOSSES / WASTE DISCARDED */}
        <div className="bg-white border border-black/10 rounded-2xl p-4.5 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="block text-[9px] font-black text-red-600 uppercase tracking-wider">
              Hao Hụt & Giặt Lại
            </span>
            <span className="block font-mono font-black text-2xl text-stone-900">
              {(reportData.totalDiscarded + reportData.totalRewash).toLocaleString()}
            </span>
            <span className="block text-[10px] text-stone-400">
              Hủy rách: {reportData.totalDiscarded} • Giặt lại: {reportData.totalRewash}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="absolute -bottom-2 -right-2 text-stone-100/10 font-mono font-black text-6xl">
            LOSS
          </div>
        </div>
      </div>

      {/* GRAPHIC DASHBOARD VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend line chart */}
        <div className="lg:col-span-2 bg-white border border-black/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              Biểu Đồ Xu Hướng Luân Chuyển Đồ Vải
            </h3>
            <span className="text-[10px] text-stone-400 font-bold font-mono">
              Đơn vị: cái
            </span>
          </div>

          <div className="h-64 w-full">
            {reportData.trendChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400 italic">
                Chưa có dữ liệu xu hướng trong khoảng thời gian này.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="dateLabel" 
                    tickFormatter={(val) => val.length > 7 ? val.slice(8) : `Thg ${val.slice(5)}`}
                    tick={{ fontSize: 10, fill: '#6B7280' }} 
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="dirty" 
                    name="Đồ dơ thu hồi" 
                    stroke="#F59E0B" 
                    strokeWidth={2.5} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clean" 
                    name="Đồ sạch bàn giao" 
                    stroke="#10B981" 
                    strokeWidth={2.5} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie distribution chart */}
        <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            Cơ Cấu Đồ Vải Thu Gom
          </h3>

          <div className="h-56 w-full flex items-center justify-center relative">
            {reportData.pieChartData.length === 0 ? (
              <div className="text-xs text-stone-400 italic">
                Chưa có dữ liệu phân loại.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {reportData.pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Visual center label */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <span className="block text-[8px] font-black uppercase text-stone-400">TỔNG DƠ</span>
                  <span className="font-mono font-extrabold text-stone-800 text-sm">
                    {reportData.totalDirtyCollected.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Pie Legends */}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-600 border-t border-stone-100 pt-3">
            {reportData.pieChartData.map((entry, index) => {
              const pct = reportData.totalDirtyCollected > 0 
                ? Math.round((entry.value / reportData.totalDirtyCollected) * 100)
                : 0;
              return (
                <div key={entry.name} className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate" title={entry.name}>{entry.name} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DEPARTMENT BAR COMPARISON CHART */}
      {!isWardUser && reportData.deptChartData.length > 0 && (
        <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-xs space-y-4 no-print">
          <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wider">
            Top 10 Khoa Phòng Luân Chuyển Đồ Vải Nhiều Nhất
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.deptChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#6B7280' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#6B7280' }} width={120} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="dirty" name="Đồ dơ bàn giao" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="clean" name="Đồ sạch thu nhận" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
                    {reportData.totalDirtyCollected.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700">
                    {reportData.totalCleanDelivered.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-stone-800">
                    {(() => {
                      const finalDebt = reportData.totalDirtyCollected - reportData.totalCleanDelivered;
                      return finalDebt > 0 ? `+${finalDebt.toLocaleString()} nợ` : finalDebt < 0 ? `${finalDebt.toLocaleString()}` : 'Cân bằng';
                    })()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-800">
                    {reportData.totalRewash.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-red-700">
                    {reportData.totalDiscarded.toLocaleString()}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total hospital stock */}
        <div className="bg-white border border-black/10 rounded-2xl p-4.5 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="block text-[9px] font-black text-blue-600 uppercase tracking-wider">
              {selectedInventoryLoc === 'all' 
                ? 'Tổng Tồn Toàn Viện' 
                : (selectedInventoryLoc === 'Kho trung tâm' ? 'Tổng Tồn Kho Chính' : `Tổng Tồn Khoa ${selectedInventoryLoc}`)}
            </span>
            <span className="block font-mono font-black text-2xl text-stone-900">
              {inventoryData.filteredTotalStock.toLocaleString()}
            </span>
            <span className="block text-[10px] text-stone-400">
              {selectedInventoryGroup === 'all'
                ? "Toàn bộ đồ vải đang lưu hành"
                : `Lượng đồ vải nhóm: ${selectedInventoryGroup}`}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Layers size={20} />
          </div>
          <div className="absolute -bottom-2 -right-2 text-stone-100/10 font-mono font-black text-6xl">
            TOTAL
          </div>
        </div>

        {/* Central stock */}
        <div className="bg-white border border-black/10 rounded-2xl p-4.5 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-wider">
              Tồn Kho Trung Tâm
            </span>
            <span className="block font-mono font-black text-2xl text-stone-900">
              {inventoryData.totalCentralStock.toLocaleString()}
            </span>
            <span className="block text-[10px] text-stone-400 font-bold text-emerald-600">
              {selectedInventoryGroup === 'all'
                ? `Chiếm ${Math.round((inventoryData.totalCentralStock / (inventoryData.totalHospitalStock || 1)) * 100)}% toàn viện`
                : `Kho chính chiếm ${Math.round((inventoryData.totalCentralStock / (inventoryData.totalHospitalStock || 1)) * 100)}% lượng nhóm này`}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle size={20} />
          </div>
          <div className="absolute -bottom-2 -right-2 text-stone-100/10 font-mono font-black text-6xl">
            CENTRAL
          </div>
        </div>

        {/* Ward stock */}
        <div className="bg-white border border-black/10 rounded-2xl p-4.5 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="block text-[9px] font-black text-purple-600 uppercase tracking-wider">
              Tồn Lâm Sàng Khoa Phòng
            </span>
            <span className="block font-mono font-black text-2xl text-stone-900">
              {inventoryData.totalWardsStock.toLocaleString()}
            </span>
            <span className="block text-[10px] text-stone-400 font-bold text-purple-600">
              {selectedInventoryGroup === 'all'
                ? `Phân bổ tại ${departments.filter(d => d !== 'Kho trung tâm').length} khoa lâm sàng`
                : `Khoa phòng chiếm ${Math.round((inventoryData.totalWardsStock / (inventoryData.totalHospitalStock || 1)) * 100)}% lượng nhóm này`}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="absolute -bottom-2 -right-2 text-stone-100/10 font-mono font-black text-6xl">
            WARDS
          </div>
        </div>

        {/* Below min-stock alerts */}
        <div className="bg-white border border-black/10 rounded-2xl p-4.5 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="block text-[9px] font-black text-rose-600 uppercase tracking-wider">
              Định Mức Cảnh Báo
            </span>
            <span className="block font-mono font-black text-2xl text-stone-900">
              {inventoryData.alertItems.length}
            </span>
            <span className="block text-[10px] text-stone-400 font-bold text-rose-600">
              {inventoryData.alertItems.length > 0 ? 'Cần bổ sung thêm ngay' : 'Mức tồn kho an toàn'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="absolute -bottom-2 -right-2 text-stone-100/10 font-mono font-black text-6xl">
            ALERT
          </div>
        </div>
      </div>

      {/* DYNAMIC CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Bar chart comparison of department stocks */}
        <div className="lg:col-span-2 bg-white border border-black/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              {selectedInventoryGroup === 'all'
                ? "Biểu Đồ Phân Bổ Tồn Kho Đồ Vải Ở Các Khoa Lâm Sàng"
                : `Phân Bổ Tồn Kho Nhóm: ${selectedInventoryGroup}`}
            </h3>
            <span className="text-[9px] text-stone-400 font-bold font-mono">Đơn vị: cái</span>
          </div>

          <div className="h-72 w-full">
            {inventoryData.wardInventoryList.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400 italic">
                Không có số liệu tồn kho khoa phòng.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryData.wardInventoryList} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 9, fill: '#4B5563', fontWeight: 'bold' }} 
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '8px 12px' }} />
                  <Bar dataKey="value" name="Số lượng tồn" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                    {inventoryData.wardInventoryList.map((entry, index) => {
                      const isSelected = selectedInventoryLoc === entry.name;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isSelected ? '#F59E0B' : COLORS[index % COLORS.length]} 
                          opacity={selectedInventoryLoc === 'all' || isSelected ? 1 : 0.4}
                          stroke={isSelected ? '#D97706' : undefined}
                          strokeWidth={isSelected ? 2 : 0}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Pie chart of linen group structure */}
        <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-emerald-600" />
              {selectedInventoryGroup === 'all'
                ? `Cơ Cấu Nhóm Đồ Vải ${selectedInventoryLoc === 'all' ? 'Toàn Viện' : (selectedInventoryLoc === 'Kho trung tâm' ? 'Kho Chính' : `Khoa ${selectedInventoryLoc}`)}`
                : `Cơ Cấu Chi Tiết ${selectedInventoryGroup} ${selectedInventoryLoc === 'all' ? 'Toàn Viện' : (selectedInventoryLoc === 'Kho trung tâm' ? 'Kho Chính' : `Khoa ${selectedInventoryLoc}`)}`}
            </h3>
          </div>

          <div className="h-52 w-full flex items-center justify-center relative">
            {inventoryData.groupInventoryList.length === 0 ? (
              <div className="text-xs text-stone-400 italic">Không có dữ liệu cơ cấu.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryData.groupInventoryList}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {inventoryData.groupInventoryList.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toLocaleString()} cái`} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center text-center px-4 max-w-[110px] overflow-hidden">
                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider leading-tight">Tổng tồn lọc</span>
                  <span className="text-base font-black text-stone-900 leading-tight truncate w-full">{inventoryData.filteredTotalStock.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          {/* Legend for proportions */}
          <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pt-2 border-t border-stone-100 no-scrollbar">
            {inventoryData.groupInventoryList.map((group, idx) => {
              const percent = Math.round((group.value / (inventoryData.filteredTotalStock || 1)) * 100);
              return (
                <div key={group.name} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-stone-600 truncate font-medium" title={group.name}>{group.name}</span>
                  <span className="font-bold text-stone-900 ml-auto font-mono shrink-0">{percent}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
              <div className="text-3xl">🎉</div>
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
                          <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black px-2 py-0.5 rounded-full">
                            ⚠️ Thiếu (Định mức: {item.minStock})
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ✓ Đủ (Định mức: {item.minStock})
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
