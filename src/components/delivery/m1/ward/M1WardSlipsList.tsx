import React from 'react';
import { Search, X, PlusCircle, Sparkles, RefreshCw } from 'lucide-react';
import { WardDeliverySlip, Account } from '../../../../types';

interface M1WardSlipsListProps {
  currentAccount: Account | null;
  filteredSlips: WardDeliverySlip[];
  activeSlipId: string | null;
  setActiveSlipId: (id: string | null) => void;
  handleCreateRandomDirtySlip?: () => void;
  handleOpenCreateSlip: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterDept: string;
  setFilterDept: (dept: string) => void;
  effectiveIsWardUser: boolean;
  isOrderlyUser: boolean;
  deptsToUse: string[];
  hasPerm: (roleReq: 'ward' | 'linen' | 'laundry' | 'clean' | 'housekeeping') => boolean;
  handleStartEditSlip: (slip: WardDeliverySlip) => void;
  handleDeletePendingSlip: (id: string) => void;
  setM1CheckedItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setM1ItemVerifiedQtys: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export default function M1WardSlipsList({
  currentAccount,
  filteredSlips,
  activeSlipId,
  setActiveSlipId,
  handleCreateRandomDirtySlip,
  handleOpenCreateSlip,
  searchQuery,
  setSearchQuery,
  filterDept,
  setFilterDept,
  effectiveIsWardUser,
  isOrderlyUser,
  deptsToUse,
  hasPerm,
  handleStartEditSlip,
  handleDeletePendingSlip,
  setM1CheckedItems,
  setM1ItemVerifiedQtys
}: M1WardSlipsListProps) {
  return (
    <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-stone-800 uppercase">Danh sách phiếu giao dơ</h3>
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-start sm:justify-end">
          {currentAccount?.isAdmin && handleCreateRandomDirtySlip && (
            <button
              onClick={handleCreateRandomDirtySlip}
              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold uppercase rounded-lg shadow flex items-center gap-1 transition-all"
              title="Tạo tự động 1 phiếu dơ ngẫu nhiên của khoa phòng bất kì từ tồn kho"
            >
              <Sparkles size={12} />
              Tạo phiếu dơ random
            </button>
          )}
          {hasPerm('ward') && (
            <button
              onClick={handleOpenCreateSlip}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase rounded-lg shadow flex items-center gap-1"
            >
              <PlusCircle size={12} />
              Tạo phiếu dơ
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 flex-1 shadow-2xs">
          <Search size={14} className="text-stone-400 shrink-0" />
          <input
            type="text"
            placeholder="Tìm mã phiếu, ngày, khoa..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-stone-800 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-stone-400 hover:text-stone-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {(!effectiveIsWardUser || isOrderlyUser) && (
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-full sm:max-w-[150px]"
          >
            <option value="Tất cả">Tất cả khoa</option>
            {deptsToUse.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {/* Slips mapping */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {filteredSlips.map(slip => {
          const isPending = slip.status === 'pending';
          return (
            <div
              key={slip.id}
              onClick={() => {
                setActiveSlipId(slip.id);
                // Reset checkbox verify states
                const initChecked: Record<string, boolean> = {};
                const initVerified: Record<string, number> = {};
                slip.items.forEach(it => {
                  initChecked[it.ma] = false;
                  initVerified[it.ma] = it.verifiedDirtyQty ?? it.qty;
                });
                setM1CheckedItems(initChecked);
                setM1ItemVerifiedQtys(initVerified);
              }}
              className={`p-3 border rounded-xl cursor-pointer transition-all ${
                activeSlipId === slip.id 
                  ? 'bg-blue-50/70 border-blue-500 shadow-sm' 
                  : 'border-stone-200 hover:bg-stone-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-black text-stone-900">{slip.id}</span>
                    {slip.isRewash && (
                      <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-bold px-1 py-0.5 rounded-sm uppercase tracking-wide flex items-center gap-0.5">
                        <RefreshCw className="w-2.5 h-2.5 shrink-0" />
                        <span>Giặt lại</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-500 block">{slip.dept} • {slip.createdAt}</span>
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
                  isPending ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {isPending ? 'Chờ duyệt' : 'Đã duyệt'}
                </span>
              </div>
              <div className="mt-2.5 flex justify-between items-center border-t border-stone-100 pt-2">
                <span className="text-[10px] text-stone-600 font-medium">
                  Khai báo: {slip.items.reduce((s, i) => s + i.qty, 0)} cái đồ vải
                </span>
                {isPending && (hasPerm('ward') || hasPerm('linen')) && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setActiveSlipId(slip.id);
                        handleStartEditSlip(slip);
                      }}
                      className="px-1.5 py-0.5 text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded transition-all"
                      title="Sửa nhanh phiếu"
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      onClick={() => handleDeletePendingSlip(slip.id)}
                      className="px-1.5 py-0.5 text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded transition-all"
                      title="Xóa nhanh phiếu"
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredSlips.length === 0 && (
          <div className="text-center py-8 text-xs text-stone-400">Không tìm thấy phiếu nào.</div>
        )}
      </div>
    </div>
  );
}
