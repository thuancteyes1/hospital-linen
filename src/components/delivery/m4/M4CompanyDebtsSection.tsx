import React, { useEffect, useRef } from 'react';
import { Search, X, Clock, FileCheck, FileText, Truck } from 'lucide-react';
import { LaundryDispatch } from '../../../types';

interface M4CompanyDebtsSectionProps {
  laundryDispatches: LaundryDispatch[];
  m2DebtTab: 'all' | 'over48h';
  setM2DebtTab: (val: 'all' | 'over48h') => void;
  m4CompanyFilterDate: string;
  setM4CompanyFilterDate: (val: string) => void;
  searchM4Company: string;
  setSearchM4Company: (val: string) => void;
  filterM4CompanyAge: 'Tất cả' | 'under24h' | '24to48h' | 'over48h' | 'over10d';
  setFilterM4CompanyAge: (val: 'Tất cả' | 'under24h' | '24to48h' | 'over48h' | 'over10d') => void;
  getDebtAgeHours: (createdAt: string) => number;
  getDebtAgeDays: (createdAt: string) => number;
  getAllDateRepresentations: (val?: string) => string;
  m4SelectedCompanyDebtId: string | null;
  setM4SelectedCompanyDebtId: (id: string | null) => void;
  canVerifyCleanReturn: boolean;
  hasPerm: (role: 'ward' | 'linen' | 'laundry' | 'clean' | 'housekeeping') => boolean;
  effectiveIsLaundryUser: boolean;
  handleHospitalVerifyM4DebtReturn: (dispatchId: string, verifyQtys: Record<string, number>) => void;
  handleCompanySubmitM4DebtReturn: (dispatchId: string, repayQtys: Record<string, number>) => void;
}

export default function M4CompanyDebtsSection({
  laundryDispatches,
  m2DebtTab,
  setM2DebtTab,
  m4CompanyFilterDate,
  setM4CompanyFilterDate,
  searchM4Company,
  setSearchM4Company,
  filterM4CompanyAge,
  setFilterM4CompanyAge,
  getDebtAgeHours,
  getDebtAgeDays,
  getAllDateRepresentations,
  m4SelectedCompanyDebtId,
  setM4SelectedCompanyDebtId,
  canVerifyCleanReturn,
  hasPerm,
  effectiveIsLaundryUser,
  handleHospitalVerifyM4DebtReturn,
  handleCompanySubmitM4DebtReturn
}: M4CompanyDebtsSectionProps) {
  const detailSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (m4SelectedCompanyDebtId && detailSectionRef.current) {
      detailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [m4SelectedCompanyDebtId]);

  const companyDebts = laundryDispatches.filter(d => {
    if (!d.id.startsWith('BILL-NỢ-CTY-')) return false;
    if (d.status === 'completed' && !m4CompanyFilterDate) return false;

    if (m2DebtTab === 'over48h') {
      const hours = getDebtAgeHours(d.originalCreatedAt || d.createdAt);
      if (hours <= 48) return false;
    }

    const hours = getDebtAgeHours(d.originalCreatedAt || d.createdAt);
    const days = getDebtAgeDays(d.originalCreatedAt || d.createdAt);
    if (filterM4CompanyAge === 'under24h' && hours >= 24) return false;
    if (filterM4CompanyAge === '24to48h' && (hours < 24 || hours > 48)) return false;
    if (filterM4CompanyAge === 'over48h' && hours <= 48) return false;
    if (filterM4CompanyAge === 'over10d' && days < 10) return false;

    const dateStrings = [
      getAllDateRepresentations(d.createdAt),
      getAllDateRepresentations(d.laundryReceivedAt),
      getAllDateRepresentations(d.cleanReturnedAt),
      getAllDateRepresentations(d.hospitalVerifiedAt),
    ].join(' ');

    if (m4CompanyFilterDate) {
      const filterReps = getAllDateRepresentations(m4CompanyFilterDate).split(' ').filter(Boolean);
      const matchesDate = filterReps.some(rep => rep.length >= 4 && dateStrings.includes(rep));
      if (!matchesDate) return false;
    }

    if (searchM4Company) {
      const q = searchM4Company.toLowerCase();
      const matchesId = d.id.toLowerCase().includes(q) || (d.originalDispatchId && d.originalDispatchId.toLowerCase().includes(q));
      const matchesDetails = (d.contractor || '').toLowerCase().includes(q) || (d.driver || '').toLowerCase().includes(q) || (d.plate || '').toLowerCase().includes(q);
      const matchesItems = d.items.some(i => i.ten.toLowerCase().includes(q) || i.ma.toLowerCase().includes(q));
      if (!matchesId && !matchesDetails && !matchesItems) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex border-b border-stone-200 gap-1 bg-stone-100/60 p-1 rounded-xl">
        <button
          onClick={() => setM2DebtTab('all')}
          className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            m2DebtTab === 'all'
              ? 'bg-white text-amber-700 shadow-sm font-black'
              : 'text-stone-600 hover:text-stone-900 font-bold'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>Tất Cả Hóa Đơn Nợ ({laundryDispatches.filter(d => d.id.startsWith('BILL-NỢ-CTY-') && d.status !== 'completed').length})</span>
        </button>
        <button
          onClick={() => setM2DebtTab('over48h')}
          className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
            m2DebtTab === 'over48h'
              ? 'bg-red-600 text-white shadow-sm font-black'
              : 'text-red-600 hover:text-red-700 hover:bg-red-50/50 font-bold'
          }`}
        >
          🚨 Cảnh Báo Bill Nợ &gt; 48h
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
        <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg px-2 py-1.5 shadow-2xs">
          <input
            type="date"
            value={m4CompanyFilterDate}
            onChange={e => setM4CompanyFilterDate(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-stone-800 focus:outline-none cursor-pointer"
          />
          {m4CompanyFilterDate && (
            <button onClick={() => setM4CompanyFilterDate('')} className="text-stone-400 hover:text-stone-600 px-1">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
          <Search size={14} className="text-stone-400 shrink-0" />
          <input
            type="text"
            value={searchM4Company}
            onChange={e => setSearchM4Company(e.target.value)}
            placeholder="Tìm mã hóa đơn nợ, xe..."
            className="w-full bg-transparent text-xs focus:outline-none text-stone-800"
          />
          {searchM4Company && (
            <button onClick={() => setSearchM4Company('')} className="text-stone-400 hover:text-stone-600">
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={filterM4CompanyAge}
          onChange={e => setFilterM4CompanyAge(e.target.value as any)}
          className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:outline-none shadow-2xs cursor-pointer"
        >
          <option value="Tất cả">Tất cả thời gian nợ</option>
          <option value="under24h">Nợ mới (&lt; 24 giờ)</option>
          <option value="24to48h">Cần đối soát (24h - 48h)</option>
          <option value="over48h">Quá hạn trễ (&gt; 48 giờ)</option>
          <option value="over10d">Trễ nghiêm trọng (&gt;= 10 ngày)</option>
        </select>
      </div>

      {companyDebts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50 text-stone-400 text-xs italic">
          Không tìm thấy phiếu nợ xưởng giặt công ty nào phù hợp.
        </div>
      ) : (
        <div className="space-y-4">
          {companyDebts.map(dispatch => {
            const ageHours = getDebtAgeHours(dispatch.originalCreatedAt || dispatch.createdAt);
            const ageDays = getDebtAgeDays(dispatch.originalCreatedAt || dispatch.createdAt);
            
            let ageBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
            let cardBorderClass = 'border-stone-200 bg-white';
            let ageStatusText = 'Nợ mới';

            if (dispatch.status === 'completed') {
              ageBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
              cardBorderClass = 'border-emerald-200 bg-emerald-50/10';
              ageStatusText = 'Đã tất toán ✓';
            } else if (ageDays >= 10) {
              ageBadgeClass = 'bg-red-100 text-red-800 border-red-300 animate-pulse';
              cardBorderClass = 'border-red-300 bg-white shadow-xs';
              ageStatusText = 'Nợ nghiêm trọng 🚨';
            } else if (ageHours > 48) {
              ageBadgeClass = 'bg-red-50 text-red-700 border-red-200';
              cardBorderClass = 'border-red-300 bg-white';
              ageStatusText = 'Quá hạn >48h ⚠️';
            } else if (ageHours >= 24) {
              ageBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
              cardBorderClass = 'border-amber-200 bg-white';
              ageStatusText = 'Cần đối soát 🕒';
            }

            const totalOwedQty = dispatch.items.reduce((sum, item) => {
              const clean = item.hospitalReceivedQty ?? item.cleanReturnedQty ?? 0;
              return sum + Math.max(0, item.handoverQty - clean);
            }, 0);

            const isFormOpen = m4SelectedCompanyDebtId === dispatch.id;
            const isWaitingForHospitalVerify = dispatch.status === 'returning_clean';

            return (
              <div key={dispatch.id} className={`border rounded-2xl p-4 shadow-2xs ${cardBorderClass} transition-all hover:shadow-sm`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-stone-100 mb-3">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg inline-block font-bold">
                      {dispatch.id}
                    </span>
                    <div className="text-xs font-bold text-stone-800 flex flex-wrap items-center gap-2">
                      <span>🏢 Xưởng giặt: <strong className="text-indigo-700">{dispatch.contractor || 'Xưởng Giặt Cty'}</strong></span>
                      <span className="text-stone-300">•</span>
                      <span>🚛 Xe: <b>{dispatch.plate || 'Chưa rõ'}</b></span>
                    </div>
                  </div>
                  <div className="text-right sm:text-right text-left">
                    <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold uppercase rounded-lg border ${ageBadgeClass}`}>
                      {ageHours >= 24 ? `${ageDays} ngày` : `${ageHours} giờ`} ({ageStatusText})
                    </span>
                    <span className="block text-[9px] text-stone-400 mt-0.5">Phát sinh: {dispatch.createdAt}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <span className="block text-[10px] uppercase font-black tracking-widest text-stone-400 font-bold">Danh mục đồ vải xưởng còn nợ</span>
                  <div className="border border-stone-200 rounded-xl overflow-x-auto text-xs bg-stone-50/55">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-stone-100 border-b border-stone-200 text-stone-500 font-bold text-[10px] uppercase">
                          <th className="p-2">Tên đồ vải</th>
                          <th className="p-2 text-right">Lượng nhận</th>
                          <th className="p-2 text-right">Xưởng báo sạch</th>
                          <th className="p-2 text-right bg-rose-50 text-rose-800">Còn nợ thực tế</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 bg-white font-medium">
                        {dispatch.items.map(it => {
                          const reported = it.cleanReturnedQty ?? 0;
                          const verified = it.hospitalReceivedQty ?? it.cleanReturnedQty ?? 0;
                          const stillOwed = Math.max(0, it.handoverQty - verified);
                          return (
                            <tr key={it.ma} className="hover:bg-stone-50">
                              <td className="p-2">
                                <div className="font-bold text-stone-800">{it.ten}</div>
                                <span className="text-[9px] text-stone-400 font-mono">{it.ma}</span>
                              </td>
                              <td className="p-2 text-right font-mono text-stone-600">{it.handoverQty} cái</td>
                              <td className="p-2 text-right font-mono text-indigo-600">{reported} cái</td>
                              <td className="p-2 text-right font-mono font-black bg-rose-50 text-rose-700">{stillOwed} cái</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {dispatch.status === 'completed' ? (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-center font-bold">
                    ✓ ĐÃ TẤT TOÁN CÔNG NỢ XƯỞNG GIẶT ĐỐI CHIẾU
                  </div>
                ) : (
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                    {isWaitingForHospitalVerify ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg">
                          <Clock size={16} className="animate-spin text-indigo-600 shrink-0" />
                          <div><b>CHỜ DUYỆT:</b> Xưởng giặt báo trả nợ sạch. Đang đợi NV đồ vải kiểm đếm.</div>
                        </div>
                        {canVerifyCleanReturn ? (
                          <div className="border border-purple-200 rounded-xl bg-purple-50/20 p-3 space-y-3">
                            <h4 className="text-[11px] font-black uppercase text-purple-900 tracking-wider flex items-center gap-1 font-bold">
                              <FileCheck size={14} /> NV ĐỒ VẢI BV: KIỂM NHẬN & CHỐT PHIẾU THU HỒI NỢ
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {dispatch.items.map(it => (
                                <div key={it.ma} className="flex justify-between items-center bg-white border border-purple-200 px-2.5 py-1.5 rounded-lg text-xs">
                                  <span className="font-bold text-stone-700 truncate">{it.ten}</span>
                                  <input
                                    type="number"
                                    defaultValue={it.cleanReturnedQty}
                                    id={`verify-debt-${dispatch.id}-${it.ma}`}
                                    className="w-16 h-8 border border-purple-300 rounded-lg text-center text-xs font-mono font-black text-purple-900 bg-purple-50"
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => {
                                  const verifyQtys: Record<string, number> = {};
                                  dispatch.items.forEach(it => {
                                    const el = document.getElementById(`verify-debt-${dispatch.id}-${it.ma}`) as HTMLInputElement;
                                    verifyQtys[it.ma] = el ? Math.max(0, parseInt(el.value) || 0) : (it.cleanReturnedQty ?? 0);
                                  });
                                  handleHospitalVerifyM4DebtReturn(dispatch.id, verifyQtys);
                                }}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold uppercase rounded-lg shadow-sm cursor-pointer font-bold"
                              >
                                Xác Nhận & Chốt Thu Hồi Nợ ✅
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-2 bg-stone-100 rounded-lg text-[10px] text-stone-500 italic font-medium">
                            Chờ nhân viên quản lý đồ vải bệnh viện xác nhận thực tế.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {isFormOpen ? (
                          <div ref={detailSectionRef} className="space-y-3 bg-white p-3 rounded-xl border border-amber-300 scroll-mt-6">
                            <div className="flex justify-between items-center pb-1 border-b border-stone-100">
                              <span className="text-[11px] font-black uppercase text-amber-900 font-bold flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                                <span>XƯỞNG GIẶT KHAI BÁO TRẢ SẠCH NỢ</span>
                              </span>
                              <button onClick={() => setM4SelectedCompanyDebtId(null)} className="text-stone-400 hover:text-stone-600 cursor-pointer font-bold"><X size={14} /></button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {dispatch.items.map(it => {
                                const stillOwed = Math.max(0, it.handoverQty - (it.hospitalReceivedQty ?? 0));
                                return (
                                  <div key={it.ma} className="flex justify-between items-center bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-lg text-xs">
                                    <span className="font-bold text-stone-700 truncate">{it.ten}</span>
                                    <input
                                      type="number"
                                      defaultValue={stillOwed}
                                      id={`repay-debt-${dispatch.id}-${it.ma}`}
                                      className="w-16 h-8 border border-amber-300 rounded-lg text-center text-xs font-mono font-black"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button onClick={() => setM4SelectedCompanyDebtId(null)} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-lg cursor-pointer font-bold">Hủy</button>
                              <button
                                onClick={() => {
                                  const repayQtys: Record<string, number> = {};
                                  dispatch.items.forEach(it => {
                                    const el = document.getElementById(`repay-debt-${dispatch.id}-${it.ma}`) as HTMLInputElement;
                                    const stillOwed = Math.max(0, it.handoverQty - (it.hospitalReceivedQty ?? 0));
                                    repayQtys[it.ma] = el ? Math.max(0, parseInt(el.value) || 0) : stillOwed;
                                  });
                                  handleCompanySubmitM4DebtReturn(dispatch.id, repayQtys);
                                }}
                                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black uppercase rounded-lg shadow-sm cursor-pointer font-bold"
                              >
                                Gửi Trả Sạch Nợ 🚀
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-rose-700 font-bold">Xưởng đang nợ: {totalOwedQty} cái đồ sạch</span>
                            </div>
                            {hasPerm('laundry') || effectiveIsLaundryUser ? (
                              <button
                                onClick={() => setM4SelectedCompanyDebtId(dispatch.id)}
                                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black uppercase rounded-lg shadow-sm cursor-pointer font-bold"
                              >
                                🚀 Trả Nợ Sạch Nhanh
                              </button>
                            ) : (
                              <span className="text-[10px] text-stone-500 italic font-medium">Chờ xưởng trả sạch nợ</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
