/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WardDeliverySlip, HistoryItem, LinenItem } from '../types';

/**
 * Extract Year-Month (YYYY-MM) from an ISO string or any date string starting with YYYY-MM
 */
export const getYearMonth = (isoString?: string): string => {
  if (!isoString) return '';
  return isoString.slice(0, 7); // 'YYYY-MM'
};

/**
 * Get Quarter (Q1, Q2, Q3, Q4) from an ISO string
 */
export const getQuarter = (isoString?: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const month = date.getMonth(); // 0-11
  if (month >= 0 && month <= 2) return 'Q1';
  if (month >= 3 && month <= 5) return 'Q2';
  if (month >= 6 && month <= 8) return 'Q3';
  return 'Q4';
};

export interface AvailableTimeRange {
  availableMonths: string[];
  availableYears: string[];
}

/**
 * Extract lists of unique available months and years from slips and history records
 */
export const getAvailableMonthsAndYears = (
  wardDeliverySlips: WardDeliverySlip[] = [],
  history: HistoryItem[] = []
): AvailableTimeRange => {
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
};

export interface InventoryItemStockInfo {
  ma: string;
  ten: string;
  nhom: string;
  central: number;
  wards: number;
  total: number;
  minStock: number;
}

export interface InventoryDataResult {
  totalCentralStock: number;
  totalWardsStock: number;
  totalHospitalStock: number;
  filteredTotalStock: number;
  wardInventoryList: { name: string; value: number }[];
  groupInventoryList: { name: string; value: number }[];
  topStockedItems: Array<InventoryItemStockInfo & { localQty: number }>;
  alertItems: Array<InventoryItemStockInfo & { deficit: number }>;
  filteredExplorerItems: Array<{
    ma: string;
    ten: string;
    nhom: string;
    qty: number;
    minStock: number;
    central: number;
    allocs: [string, number][];
  }>;
  uniqueGroups: string[];
  itemTotalStocks: InventoryItemStockInfo[];
}

/**
 * Compute inventory statistics, grouping and filtering matching location & group selectors
 */
export const getInventoryData = (params: {
  items: LinenItem[];
  detailAllocations: Record<string, [string, number][]>;
  departments: string[];
  selectedInventoryLoc: string;
  selectedInventoryGroup: string;
}): InventoryDataResult => {
  const {
    items = [],
    detailAllocations = {},
    departments = [],
    selectedInventoryLoc = 'all',
    selectedInventoryGroup = 'all',
  } = params;

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
  const itemTotalStocks: Record<string, InventoryItemStockInfo> = {};

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
};

export interface ReportItemStats {
  ma: string;
  ten: string;
  nhom: string;
  dirty: number;
  clean: number;
  rewash: number;
  discarded: number;
}

export interface ReportDataResult {
  totalDirtyCollected: number;
  totalCleanDelivered: number;
  totalDebtLeft: number;
  totalRewash: number;
  totalDiscarded: number;
  totalLoss: number;
  itemTableData: ReportItemStats[];
  pieChartData: { name: string; value: number }[];
  trendChartData: { dateLabel: string; dirty: number; clean: number }[];
  deptChartData: { name: string; dirty: number; clean: number }[];
  slipsCount: number;
  filteredSlips: WardDeliverySlip[];
  filteredHistory: HistoryItem[];
}

/**
 * Compute report business stats based on selected time-unit, selected group, and department filters
 */
export const getReportData = (params: {
  wardDeliverySlips: WardDeliverySlip[];
  history: HistoryItem[];
  items: LinenItem[];
  departments: string[];
  timeUnit: 'day' | 'month' | 'quarter' | 'year';
  selectedMonth: string;
  selectedQuarter: string;
  selectedYear: string;
  selectedDate: string;
  effectiveDept: string;
}): ReportDataResult => {
  const {
    wardDeliverySlips = [],
    history = [],
    items = [],
    departments = [],
    timeUnit,
    selectedMonth,
    selectedQuarter,
    selectedYear,
    selectedDate,
    effectiveDept,
  } = params;

  // Filter Ward Slips
  let filteredSlips = [...wardDeliverySlips];

  // Filter by Dept
  if (effectiveDept !== 'all') {
    filteredSlips = filteredSlips.filter(s => s.dept === effectiveDept);
  }

  // Filter by Time
  if (timeUnit === 'day' && selectedDate !== 'all') {
    filteredSlips = filteredSlips.filter(s => s.createdAt && s.createdAt.slice(0, 10) === selectedDate);
  } else if (timeUnit === 'month' && selectedMonth !== 'all') {
    filteredSlips = filteredSlips.filter(s => getYearMonth(s.createdAt) === selectedMonth);
  } else if (timeUnit === 'quarter' && selectedQuarter !== 'all') {
    filteredSlips = filteredSlips.filter(s => getQuarter(s.createdAt) === selectedQuarter && s.createdAt.startsWith(selectedYear));
  } else if (timeUnit === 'year') {
    filteredSlips = filteredSlips.filter(s => s.createdAt.startsWith(selectedYear));
  }

  // Filter general inventory history (nhap, huy, etc.)
  let filteredHistory = history.filter(h => h.status === 'confirmed');
  if (timeUnit === 'day' && selectedDate !== 'all') {
    filteredHistory = filteredHistory.filter(h => h.date && h.date.slice(0, 10) === selectedDate);
  } else if (timeUnit === 'month' && selectedMonth !== 'all') {
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

  const itemStats: Record<string, ReportItemStats> = {};

  // Seed stats with existing active items
  items.forEach(it => {
    itemStats[it.ma] = {
      ma: it.ma,
      ten: it.ten,
      nhom: it.nhom || 'Chưa phân nhóm',
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
  const trendMap: Record<string, { dateLabel: string; dirty: number; clean: number }> = {};
  filteredSlips.forEach(s => {
    let label = '';
    if (timeUnit === 'day') {
      label = s.createdAt && s.createdAt.includes('T')
        ? s.createdAt.slice(11, 16)
        : s.createdAt && s.createdAt.includes(' ')
        ? s.createdAt.split(' ')[1]?.slice(0, 5) || s.createdAt.slice(11, 16)
        : s.id;
    } else if (timeUnit === 'year') {
      label = getYearMonth(s.createdAt);
    } else {
      label = s.createdAt ? s.createdAt.slice(0, 10) : '';
    }
    if (label && !trendMap[label]) {
      trendMap[label] = { dateLabel: label, dirty: 0, clean: 0 };
    }
    if (label) {
      s.items.forEach(it => {
        trendMap[label].dirty += (it.verifiedDirtyQty !== undefined ? it.verifiedDirtyQty : it.qty);
        trendMap[label].clean += (it.hospitalCleanQty !== undefined ? it.hospitalCleanQty : (it.cleanReturnedQty || 0));
      });
    }
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
    totalDirtyCollected: totalDirtyCollected || 0,
    totalCleanDelivered: totalCleanDelivered || 0,
    totalDebtLeft: Math.max(0, (totalDirtyCollected || 0) - (totalCleanDelivered || 0)),
    totalRewash: totalRewash || 0,
    totalDiscarded: totalDiscarded || 0,
    totalLoss: totalDiscarded || 0,
    itemTableData,
    pieChartData,
    trendChartData,
    deptChartData,
    slipsCount: filteredSlips.length,
    filteredSlips,
    filteredHistory
  };
};
