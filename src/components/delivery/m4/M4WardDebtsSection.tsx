import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building, AlertTriangle, AlertOctagon, Clock, Link, Zap, Lock, CheckCircle2 } from 'lucide-react';
import { WardDeliverySlip } from '../../../types';

interface M4WardDebtsSectionProps {
  wardDeliverySlips: WardDeliverySlip[];
  m4WardFilterDate: string;
  setM4WardFilterDate: (val: string) => void;
  searchM4Ward: string;
  setSearchM4Ward: (val: string) => void;
  filterM4WardDept: string;
  setFilterM4WardDept: (val: string) => void;
  filterM4WardAge: 'Tất cả' | 'under24h' | '24to48h' | 'over48h' | 'over10d';
  setFilterM4WardAge: (val: 'Tất cả' | 'under24h' | '24to48h' | 'over48h' | 'over10d') => void;
  deptsToUse: string[];
  effectiveIsWardUser: boolean;
  isOrderlyUser: boolean;
  currentWardName: string;
  getDebtAgeHours: (createdAt: string) => number;
  getDebtAgeDays: (createdAt: string) => number;
  getAllDateRepresentations: (val?: string) => string;
  inlineSettleSlipId: string | null;
  setInlineSettleSlipId: (id: string | null) => void;
  inlineSettleQtys: Record<string, number>;
  setInlineSettleQtys: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  temporaryCleanStore: Record<string, number>;
  canVerifyCleanReturn: boolean;
  handleReturnCleanM3: (slipId: string, itemQtys: Record<string, number>) => void;
  setActiveMuc: (muc: number) => void;
  setM3SubTab?: (tab: 'clean-ward' | 'ward-debt') => void;
  setSelectedM1SlipIdForCleanReturn?: (id: string | null) => void;
  setM3ItemCleanReturnQtys?: (qtys: Record<string, number>) => void;
}

export default function M4WardDebtsSection({
  wardDeliverySlips,
  m4WardFilterDate,
  setM4WardFilterDate,
  searchM4Ward,
  setSearchM4Ward,
  filterM4WardDept,
  setFilterM4WardDept,
  filterM4WardAge,
  setFilterM4WardAge,
  deptsToUse,
  effectiveIsWardUser,
  isOrderlyUser,
  currentWardName,
  getDebtAgeHours,
  getDebtAgeDays,
  getAllDateRepresentations,
  inlineSettleSlipId,
  setInlineSettleSlipId,
  inlineSettleQtys,
  setInlineSettleQtys,
  temporaryCleanStore,
  canVerifyCleanReturn,
  handleReturnCleanM3,
  setActiveMuc,
  setM3SubTab,
  setSelectedM1SlipIdForCleanReturn,
  setM3ItemCleanReturnQtys
}: M4WardDebtsSectionProps) {
  const detailSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inlineSettleSlipId && detailSectionRef.current) {
      detailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [inlineSettleSlipId]);

  const wardDebts = wardDeliverySlips.filter(slip => {
    if (!slip.id.startsWith('NỢ-')) return false;
    if (slip.status === 'completed' && !m4WardFilterDate) return false;
    if ((effectiveIsWardUser && !isOrderlyUser) && slip.dept !== currentWardName) return false;
    if (filterM4WardDept !== 'Tất cả' && slip.dept !== filterM4WardDept) return false;

    const hours = getDebtAgeHours(slip.originalCreatedAt || slip.createdAt);
    const days = getDebtAgeDays(slip.originalCreatedAt || slip.createdAt);
    if (filterM4WardAge === 'under24h' && hours >= 24) return false;
    if (filterM4WardAge === '24to48h' && (hours < 24 || hours > 48)) return false;
    if (filterM4WardAge === 'over48h' && hours <= 48) return false;
    if (filterM4WardAge === 'over10d' && days < 10) return false;

    const dateStrings = [
      getAllDateRepresentations(slip.createdAt),
      getAllDateRepresentations(slip.verifiedDirtyAt),
      getAllDateRepresentations(slip.hospitalCleanAt),
      getAllDateRepresentations(slip.confirmedAt),
    ].join(' ');

    if (m4WardFilterDate) {
      const filterReps = getAllDateRepresentations(m4WardFilterDate).split(' ').filter(Boolean);
      const matchesDate = filterReps.some(rep => rep.length >= 4 && dateStrings.includes(rep));
      if (!matchesDate) return false;
    }

    if (searchM4Ward) {
      const q = searchM4Ward.toLowerCase();
      const matchesId = slip.id.toLowerCase().includes(q) || (slip.originalSlipId && slip.originalSlipId.toLowerCase().includes(q));
      const matchesDeptName = slip.dept.toLowerCase().includes(q);
      const matchesItems = slip.items.some(i => i.ten.toLowerCase().includes(q) || i.ma.toLowerCase().includes(q));
      if (!matchesId && !matchesDeptName && !matchesItems) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
        <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg px-2 py-1.5 shadow-2xs">
          <input
            type="date"
            value={m4WardFilterDate}
            onChange={e => setM4WardFilterDate(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-stone-800 focus:outline-none cursor-pointer"
          />
          {m4WardFilterDate && (
            <button onClick={() => setM4WardFilterDate('')} className="text-stone-400 hover:text-stone-600 px-1">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
          <Search size={14} className="text-stone-400 shrink-0" />
          <input
            type="text"
            value={searchM4Ward}
            onChange={e => setSearchM4Ward(e.target.value)}
            placeholder="Tìm mã phiếu nợ, khoa..."
            className="w-full bg-transparent text-xs focus:outline-none text-stone-800"
          />
          {searchM4Ward && (
            <button onClick={() => setSearchM4Ward('')} className="text-stone-400 hover:text-stone-600">
              <X size={14} />
            </button>
          )}
        </div>

        {(!effectiveIsWardUser || isOrderlyUser) ? (
          <select
            value={filterM4WardDept}
            onChange={e => setFilterM4WardDept(e.target.value)}
            className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:outline-none shadow-2xs cursor-pointer"
          >
            <option value="Tất cả">Tất cả khoa lâm sàng</option>
            {deptsToUse.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        ) : (
          <div className="bg-stone-200/55 text-stone-600 px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-300 flex items-center justify-between">
            <span>Khoa: <b>{currentWardName}</b></span>
          </div>
        )}

        <select
          value={filterM4WardAge}
          onChange={e => setFilterM4WardAge(e.target.value as any)}
          className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:outline-none shadow-2xs cursor-pointer"
        >
          <option value="Tất cả">Tất cả thời gian nợ</option>
          <option value="under24h">Nợ mới (&lt; 24 giờ)</option>
          <option value="24to48h">Cần đối soát (24h - 48h)</option>
          <option value="over48h">Quá hạn trễ (&gt; 48 giờ)</option>
          <option value="over10d">Trễ nghiêm trọng (&gt;= 10 ngày)</option>
        </select>
      </div>

      {wardDebts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50 text-stone-400 text-xs italic">
          Không tìm thấy phiếu nợ khoa lâm sàng nào phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wardDebts.map(slip => {
            const ageHours = getDebtAgeHours(slip.originalCreatedAt || slip.createdAt);
            const ageDays = getDebtAgeDays(slip.originalCreatedAt || slip.createdAt);
            
            let ageBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
            let cardBorderClass = 'border-stone-200';
            let ageStatusText = 'Nợ mới';

            if (ageDays >= 10) {
              ageBadgeClass = 'bg-red-100 text-red-800 border-red-300 animate-pulse';
              cardBorderClass = 'border-red-300 shadow-xs shadow-red-100';
              ageStatusText = 'Nợ nghiêm trọng';
            } else if (ageHours > 48) {
              ageBadgeClass = 'bg-red-50 text-red-700 border-red-200';
              cardBorderClass = 'border-red-300';
              ageStatusText = 'Quá hạn >48h';
            } else if (ageHours >= 24) {
              ageBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
              cardBorderClass = 'border-amber-200';
              ageStatusText = 'Cần đối soát';
            }

            const isInlineOpen = inlineSettleSlipId === slip.id;

            return (
              <div key={slip.id} className={`bg-white border rounded-2xl p-4 shadow-2xs flex flex-col justify-between ${cardBorderClass} transition-all duration-200 hover:shadow-sm`}>
                <div>
                  <div className="flex justify-between items-start gap-2 pb-2.5 border-b border-stone-100 mb-3">
                    <div>
                      <span className="font-mono text-xs font-black text-rose-700 block bg-rose-50 px-2 py-0.5 rounded border border-rose-200 max-w-max mb-1 font-bold">
                        #{slip.id}
                      </span>
                      <h3 className="text-xs font-black text-stone-800 flex items-center gap-1 font-bold">
                        <Building size={12} className="text-stone-400" />
                        {slip.dept}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded-lg border ${ageBadgeClass}`}>
                        {ageHours >= 24 ? `${ageDays} ngày` : `${ageHours} giờ`} ({ageStatusText})
                      </span>
                      <span className="block text-[9px] text-stone-400 mt-0.5">Tạo: {slip.createdAt}</span>
                    </div>
                  </div>

                  {slip.originalSlipId && (
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2 text-[10px] text-stone-600 mb-3 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Link size={12} className="text-stone-500 shrink-0" />
                        <span><b>Mã đơn dơ gốc:</b> <span className="font-mono font-bold text-stone-800 bg-white px-1 border rounded">{slip.originalSlipId}</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-stone-500 shrink-0" />
                        <span><b>Ngày nhận dơ gốc:</b> <span className="font-medium text-stone-800">{slip.originalCreatedAt}</span></span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 mb-4">
                    <span className="block text-[9px] uppercase font-black tracking-widest text-stone-400 font-bold">Chi tiết đồ vải còn nợ</span>
                    <div className="border border-stone-200 rounded-lg overflow-hidden divide-y divide-stone-100 text-xs bg-stone-50/30">
                      {slip.items.map(it => {
                        const qtyOwed = it.verifiedDirtyQty ?? it.qty;
                        return (
                          <div key={it.ma} className="flex justify-between items-center p-2 hover:bg-stone-50 bg-white">
                            <span className="font-bold text-stone-700 truncate">{it.ten}</span>
                            <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 border border-rose-200 rounded text-[10px] shrink-0 font-bold">
                              Nợ: {qtyOwed} cái
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100">
                  {canVerifyCleanReturn ? (
                    isInlineOpen ? (
                      <div ref={detailSectionRef} className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-3 scroll-mt-6">
                        <div className="flex justify-between items-center pb-1.5 border-b border-rose-100">
                          <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider flex items-center gap-1 font-bold">
                            <Zap size={13} className="text-amber-600" />
                            <span>Đối chiếu & Thu hồi nợ nhanh</span>
                          </span>
                          <button onClick={() => setInlineSettleSlipId(null)} className="text-stone-400 hover:text-stone-600 text-xs font-bold cursor-pointer">
                            ✕
                          </button>
                        </div>
                        <div className="space-y-2">
                          {slip.items.map(it => {
                            const maxPossible = it.verifiedDirtyQty ?? it.qty;
                            const availableClean = temporaryCleanStore[it.ma] || 0;
                            const currentQty = inlineSettleQtys[it.ma] !== undefined ? inlineSettleQtys[it.ma] : Math.min(maxPossible, availableClean);
                            return (
                              <div key={it.ma} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-rose-100/60">
                                <div>
                                  <span className="font-bold text-stone-800 block">{it.ten}</span>
                                  <span className="text-[9px] text-stone-400 block font-mono">
                                    Kho sạch có: <b className="text-emerald-700 font-bold">{availableClean}</b> cái
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    className="w-14 h-7 border border-stone-300 rounded text-center font-mono font-bold text-xs bg-stone-50 focus:bg-white"
                                    value={currentQty}
                                    min={0}
                                    max={maxPossible}
                                    onChange={e => {
                                      const val = Math.max(0, Math.min(maxPossible, parseInt(e.target.value) || 0));
                                      setInlineSettleQtys(prev => ({ ...prev, [it.ma]: val }));
                                    }}
                                  />
                                  <span className="text-stone-400 text-[10px]">/ nợ {maxPossible}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => {
                            handleReturnCleanM3(slip.id, inlineSettleQtys);
                            setInlineSettleSlipId(null);
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                        >
                          <CheckCircle2 size={14} />
                          <span>Hoàn Tất Thu Hồi Nợ</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-1.5">
                        <button
                          onClick={() => {
                            setInlineSettleSlipId(slip.id);
                            const initQtys: Record<string, number> = {};
                            slip.items.forEach(it => {
                              const maxPossible = it.verifiedDirtyQty ?? it.qty;
                              const availableClean = temporaryCleanStore[it.ma] || 0;
                              initQtys[it.ma] = Math.min(maxPossible, availableClean);
                            });
                            setInlineSettleQtys(initQtys);
                          }}
                          className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold uppercase rounded-lg border border-rose-200 shadow-3xs flex items-center justify-center gap-1 transition-all cursor-pointer font-bold"
                        >
                          <Zap size={13} className="text-amber-600" />
                          <span>Thu Hồi Nợ Nhanh</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveMuc(3);
                            if (setM3SubTab) setM3SubTab('clean-ward');
                            if (setSelectedM1SlipIdForCleanReturn) setSelectedM1SlipIdForCleanReturn(slip.id);
                            if (setM3ItemCleanReturnQtys) {
                              const initClean: Record<string, number> = {};
                              slip.items.forEach(it => {
                                initClean[it.ma] = it.verifiedDirtyQty ?? it.qty;
                              });
                              setM3ItemCleanReturnQtys(initClean);
                            }
                          }}
                          className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold uppercase rounded-lg shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer font-bold"
                        >
                          Mở Workspace
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-1.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] font-semibold text-rose-700 flex items-center justify-center gap-1">
                      <Lock size={12} className="text-rose-600 shrink-0" />
                      <span>Chờ Nhân viên đồ vải trả bù sạch cho Khoa</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
