import React from 'react';
import { Search, X, ChevronLeft, ChevronRight, Layers, CheckCircle2, Filter } from 'lucide-react';
import { LINEN_PAGES } from '../../../types';

export interface ChecklistPaginationProps<T = any> {
  currentPage: number;
  totalPages: number;
  pageSize: number | 'all';
  totalItems: number;
  filteredCount: number;
  startIndex: number;
  endIndex: number;
  searchQuery: string;
  checkedCount?: number;
  themeColor?: 'amber' | 'indigo' | 'purple' | 'emerald' | 'stone' | 'blue';
  
  // Custom delivery filters & page badges
  selectedTrang?: string;
  onTrangChange?: (trang: string) => void;
  itemTrangMap?: Record<string, string>;
  itemsList?: T[];
  getItemDeliveryQty?: (item: T) => number;
  onlyShowDelivered?: boolean;
  onToggleOnlyDelivered?: (onlyDelivered: boolean) => void;

  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number | 'all') => void;
  onSearchChange?: (query: string) => void;
  className?: string;
}

export default function ChecklistPagination<T = any>({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  filteredCount,
  startIndex,
  endIndex,
  searchQuery,
  checkedCount,
  themeColor = 'amber',
  selectedTrang,
  onTrangChange,
  itemTrangMap,
  itemsList = [],
  getItemDeliveryQty,
  onlyShowDelivered = false,
  onToggleOnlyDelivered,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  className = ''
}: ChecklistPaginationProps<T>) {
  // Color themes
  const colorStyles = {
    amber: {
      activeBg: 'bg-amber-500 text-white shadow-xs font-black ring-2 ring-amber-400',
      btnHover: 'hover:bg-amber-100/80 hover:text-amber-900 border-amber-200 text-amber-950 font-bold',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      inputFocus: 'focus:border-amber-500 focus:ring-amber-400',
      bgBox: 'bg-amber-50/70 border-amber-200'
    },
    indigo: {
      activeBg: 'bg-indigo-600 text-white shadow-xs font-black ring-2 ring-indigo-400',
      btnHover: 'hover:bg-indigo-100/80 hover:text-indigo-900 border-indigo-200 text-indigo-950 font-bold',
      badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      inputFocus: 'focus:border-indigo-500 focus:ring-indigo-400',
      bgBox: 'bg-indigo-50/70 border-indigo-200'
    },
    purple: {
      activeBg: 'bg-purple-600 text-white shadow-xs font-black ring-2 ring-purple-400',
      btnHover: 'hover:bg-purple-100/80 hover:text-purple-900 border-purple-200 text-purple-950 font-bold',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
      inputFocus: 'focus:border-purple-500 focus:ring-purple-400',
      bgBox: 'bg-purple-50/70 border-purple-200'
    },
    emerald: {
      activeBg: 'bg-emerald-600 text-white shadow-xs font-black ring-2 ring-emerald-400',
      btnHover: 'hover:bg-emerald-100/80 hover:text-emerald-900 border-emerald-200 text-emerald-950 font-bold',
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      inputFocus: 'focus:border-emerald-500 focus:ring-emerald-400',
      bgBox: 'bg-emerald-50/70 border-emerald-200'
    },
    blue: {
      activeBg: 'bg-blue-600 text-white shadow-xs font-black ring-2 ring-blue-400',
      btnHover: 'hover:bg-blue-100/80 hover:text-blue-900 border-blue-200 text-blue-950 font-bold',
      badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
      inputFocus: 'focus:border-blue-500 focus:ring-blue-400',
      bgBox: 'bg-blue-50/70 border-blue-200'
    },
    stone: {
      activeBg: 'bg-stone-800 text-white shadow-xs font-black ring-2 ring-stone-400',
      btnHover: 'hover:bg-stone-200 hover:text-stone-900 border-stone-300 text-stone-800 font-bold',
      badgeBg: 'bg-stone-200 text-stone-800 border-stone-300',
      inputFocus: 'focus:border-stone-500 focus:ring-stone-400',
      bgBox: 'bg-stone-100/70 border-stone-200'
    }
  }[themeColor];

  const containerRef = React.useRef<HTMLDivElement>(null);

  const handlePageChange = (p: number) => {
    onPageChange(p);
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePageSizeChange = (sz: number | 'all') => {
    if (onPageSizeChange) {
      onPageSizeChange(sz);
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Calculate items with delivery total count
  const totalDeliveredCount = getItemDeliveryQty && itemsList.length > 0
    ? itemsList.filter(item => getItemDeliveryQty(item) > 0).length
    : 0;

  // Function to get delivery count for items on page `p`
  const getPageDeliveryCount = (p: number) => {
    if (!getItemDeliveryQty || itemsList.length === 0 || pageSize === 'all') return 0;
    const effPageSize = typeof pageSize === 'number' ? pageSize : 10;
    const start = (p - 1) * effPageSize;
    const end = start + effPageSize;
    const pageItems = itemsList.slice(start, end);
    return pageItems.filter(item => getItemDeliveryQty(item) > 0).length;
  };

  // Function to get delivery count for items belonging to a specific Trang Bill (e.g. 'Trang 1')
  const getTrangDeliveryCount = (trangName: string) => {
    if (!getItemDeliveryQty || itemsList.length === 0) return 0;
    return itemsList.filter(item => {
      const itemTrang = (item as any).trang || (itemTrangMap && itemTrangMap[(item as any).ma]) || 'Trang 1';
      return itemTrang === trangName && getItemDeliveryQty(item) > 0;
    }).length;
  };

  // Function to get total items count belonging to a specific Trang Bill
  const getTrangTotalCount = (trangName: string) => {
    if (itemsList.length === 0) return 0;
    return itemsList.filter(item => {
      const itemTrang = (item as any).trang || (itemTrangMap && itemTrangMap[(item as any).ma]) || 'Trang 1';
      return itemTrang === trangName;
    }).length;
  };

  // Generate page numbers
  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div ref={containerRef} className={`p-2.5 rounded-xl border ${colorStyles.bgBox} space-y-2 shadow-2xs scroll-mt-6 ${className}`}>
      {/* Top Toolbar: Filter Delivered + Search + Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Search & Only Delivered Toggle */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          {onSearchChange && (
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
              <input
                type="text"
                placeholder="Tìm nhanh tên / mã đồ vải..."
                className={`w-full pl-7 pr-7 py-1 text-[11px] bg-white border border-stone-300 rounded-lg shadow-2xs focus:outline-none ${colorStyles.inputFocus} font-medium`}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Quick toggle: Only show items that have delivery (>0) */}
          {onToggleOnlyDelivered && getItemDeliveryQty && (
            <button
              type="button"
              onClick={() => onToggleOnlyDelivered(!onlyShowDelivered)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                onlyShowDelivered
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-emerald-50 hover:border-emerald-300'
              }`}
              title="Lọc nhanh chỉ hiển thị những loại đồ vải thực sự có phát sinh số lượng giao"
            >
              <Filter size={12} className={onlyShowDelivered ? 'animate-bounce' : 'text-stone-400'} />
              <span>Chỉ hiện đồ vải CÓ GIAO</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                onlyShowDelivered ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}>
                {totalDeliveredCount}
              </span>
            </button>
          )}
        </div>

        {/* Page status summary badges */}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          {checkedCount !== undefined && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md flex items-center gap-1">
              <CheckCircle2 size={11} /> Đã kiểm {checkedCount}/{totalItems}
            </span>
          )}

          <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${colorStyles.badgeBg}`}>
            {pageSize === 'all'
              ? `Hiển thị tất cả (${filteredCount} mục)`
              : `Trang ${currentPage}/${totalPages} • (Mục ${filteredCount > 0 ? startIndex + 1 : 0} - ${endIndex} / ${filteredCount})`}
          </span>

          {/* Mode switch: Pagination / All */}
          {onPageSizeChange && (
            <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handlePageSizeChange('all')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                  pageSize === 'all' ? colorStyles.activeBg : 'text-stone-600 hover:bg-stone-100'
                }`}
                title="Hiển thị tất cả danh mục đồ vải trên 1 trang"
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => handlePageSizeChange(10)}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                  pageSize !== 'all' ? colorStyles.activeBg : 'text-stone-600 hover:bg-stone-100'
                }`}
                title="Chia danh mục đồ vải làm nhiều trang"
              >
                Chia trang
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Page Navigation Buttons Bar */}
      {pageSize !== 'all' && totalPages > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-stone-200/60">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-600 mr-1 flex items-center gap-1 font-bold">
              <Layers size={12} className="text-stone-500" /> Chọn trang hiển thị:
            </span>

            {/* Prev Button */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-1 text-xs border border-stone-300 rounded-md bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page Buttons: If onTrangChange is provided, filter by assigned Trang Bill ('Trang 1'..'Trang 5' / 'all') */}
            {onTrangChange ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onTrangChange('all')}
                  className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedTrang === 'all'
                      ? colorStyles.activeBg
                      : `bg-white text-stone-700 ${colorStyles.btnHover}`
                  }`}
                >
                  <span>Tất cả</span>
                  <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${
                    selectedTrang === 'all' ? 'bg-white text-stone-900' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {itemsList.length}
                  </span>
                </button>

                {LINEN_PAGES.map((pName) => {
                  const isActive = selectedTrang === pName;
                  const deliveredQty = getTrangDeliveryCount(pName);
                  const totalCount = getTrangTotalCount(pName);

                  return (
                    <button
                      key={pName}
                      type="button"
                      onClick={() => onTrangChange(pName)}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? colorStyles.activeBg
                          : `bg-white text-stone-700 ${colorStyles.btnHover}`
                      }`}
                    >
                      <span>{pName}</span>
                      {getItemDeliveryQty && !onlyShowDelivered && (
                        <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${
                          deliveredQty > 0
                            ? (isActive ? 'bg-white text-emerald-900 font-black' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')
                            : (isActive ? 'bg-stone-200/40 text-stone-100' : 'bg-stone-100 text-stone-400')
                        }`}>
                          {deliveredQty > 0 ? `Giao: ${deliveredQty}` : `${totalCount}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {pageNumbers.map((p) => {
                  const isActive = p === currentPage;
                  const pageDeliveredQty = getPageDeliveryCount(p);

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePageChange(p)}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? colorStyles.activeBg
                          : `bg-white text-stone-700 ${colorStyles.btnHover}`
                      }`}
                    >
                      <span>Trang {p}</span>
                      {getItemDeliveryQty && !onlyShowDelivered && (
                        <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${
                          pageDeliveredQty > 0
                            ? (isActive ? 'bg-white text-emerald-900 font-black' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')
                            : (isActive ? 'bg-stone-200/40 text-stone-100' : 'bg-stone-100 text-stone-400')
                        }`}>
                          {pageDeliveredQty > 0 ? `Giao: ${pageDeliveredQty}` : '0'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Next Button */}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-1 text-xs border border-stone-300 rounded-md bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
          </div>


        </div>
      )}
    </div>
  );
}
