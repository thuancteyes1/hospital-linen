import React from 'react';
import { X } from 'lucide-react';
import { LinenItem } from '../../../../types';

interface M1WardCreateSlipModalProps {
  draftIsRewash: boolean;
  setDraftIsRewash: (val: boolean) => void;
  setIsCreatingSlip: (val: boolean) => void;
  effectiveIsWardUser: boolean;
  isOrderlyUser: boolean;
  selectedDept: string;
  handleDeptChange: (dept: string) => void;
  deptsToUse: string[];
  slipCreator: string;
  setSlipCreator: (val: string) => void;
  currentWardName: string;
  draftGuestName: string;
  setDraftGuestName: (val: string) => void;
  draftGuestRoom: string;
  setDraftGuestRoom: (val: string) => void;
  handleInsertDraftDemoImage: () => void;
  draftAttachedImage: string;
  draftItems: any[];
  setDraftItems: React.Dispatch<React.SetStateAction<any[]>>;
  handleRemoveDraftItem: (ma: string) => void;
  customName: string;
  setCustomName: (val: string) => void;
  customQty: number;
  setCustomQty: (val: number) => void;
  customInfectious: boolean;
  setCustomInfectious: (val: boolean) => void;
  handleAddCustomDraftFromTable: () => void;
  handleSubmitSlip: () => void;
}

export default function M1WardCreateSlipModal({
  draftIsRewash,
  setDraftIsRewash,
  setIsCreatingSlip,
  effectiveIsWardUser,
  isOrderlyUser,
  selectedDept,
  handleDeptChange,
  deptsToUse,
  slipCreator,
  setSlipCreator,
  currentWardName,
  draftGuestName,
  setDraftGuestName,
  draftGuestRoom,
  setDraftGuestRoom,
  handleInsertDraftDemoImage,
  draftAttachedImage,
  draftItems,
  setDraftItems,
  handleRemoveDraftItem,
  customName,
  setCustomName,
  customQty,
  setCustomQty,
  customInfectious,
  setCustomInfectious,
  handleAddCustomDraftFromTable,
  handleSubmitSlip
}: M1WardCreateSlipModalProps) {
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-start justify-center p-4 pt-4 sm:pt-8 md:pt-12 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-[#1A1A1A] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-stone-100 border-b border-stone-300 flex justify-between items-center animate-fade-in">
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide font-bold">
              {draftIsRewash ? '🔄 Tạo Phiếu Gửi Giặt Lại (Rewash)' : 'Tạo Phiếu Khai Báo Giao Nhận Đồ Vải Dơ'}
            </h3>
            <span className="text-[10px] text-stone-500 block mt-0.5">Mẫu khai báo gửi dơ nội bộ để đổ vào Kho dơ</span>
          </div>
          <button onClick={() => setIsCreatingSlip(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer font-bold">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Form Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200/60">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1.5 font-bold">Khoa phòng khai báo</label>
              {(!effectiveIsWardUser || isOrderlyUser) && !draftIsRewash ? (
                <select
                  value={selectedDept}
                  onChange={e => handleDeptChange(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {deptsToUse.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value="Khách">Phòng khách (VIP/Khách lẻ)</option>
                </select>
              ) : (
                <div className="w-full bg-stone-200 border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-black text-stone-700 font-bold">
                  {selectedDept}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1.5 font-bold">Người lập phiếu</label>
              <input
                type="text"
                value={slipCreator}
                onChange={e => setSlipCreator(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Special options for rewash & guest slips */}
          {!draftIsRewash && (
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
              <input
                type="checkbox"
                id="draftIsRewashCheck"
                checked={draftIsRewash}
                onChange={e => {
                  const checked = e.target.checked;
                  setDraftIsRewash(checked);
                  if (checked) {
                    handleDeptChange(currentWardName && currentWardName !== 'Tất cả' && currentWardName !== 'Kho trung tâm' ? currentWardName : deptsToUse[0]);
                  }
                }}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-300 cursor-pointer"
              />
              <div>
                <label htmlFor="draftIsRewashCheck" className="text-xs font-black text-indigo-950 cursor-pointer block select-none font-bold">
                  🔄 TÍCH CHỌN PHIẾU GIẶT LẠI (REWASH)
                </label>
                <span className="text-[10px] text-indigo-800 block leading-normal mt-0.5">
                  Sử dụng khi phát hiện đồ sạch trong kho bị bẩn hoặc ố vàng cần gửi giặt lại (sẽ trừ tồn kho sạch và cộng dơ).
                </span>
              </div>
            </div>
          )}

          {selectedDept.startsWith('Khách') && (
            <div className="p-4 border-2 border-amber-300 bg-amber-50/70 rounded-xl space-y-3.5 shadow-xs">
              <span className="text-xs font-black text-amber-900 uppercase block tracking-wider font-bold">🛏️ THÔNG TIN KHÁCH VIP RIÊNG (NV BUỒNG PHÒNG ĐẦY ĐỦ HÌNH ẢNH)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-amber-800 uppercase mb-1">Họ tên khách</label>
                  <input
                    type="text"
                    placeholder="VD: Mr. John Henry"
                    value={draftGuestName}
                    onChange={e => setDraftGuestName(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-amber-800 uppercase mb-1">Số phòng</label>
                  <input
                    type="text"
                    placeholder="VD: Phòng VIP 502"
                    value={draftGuestRoom}
                    onChange={e => setDraftGuestRoom(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
              
              <div className="pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={handleInsertDraftDemoImage}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  📸 CHÈN ẢNH CHỤP ĐỒ KHÁCH (DEMO)
                </button>
                {draftAttachedImage && (
                  <div className="mt-3 bg-white p-2 rounded-lg border border-amber-300 inline-block shadow-sm">
                    <img src={draftAttachedImage} alt="Mẫu đồ khách" className="max-h-40 object-contain rounded" referrerPolicy="no-referrer" />
                    <p className="text-[10px] text-emerald-700 font-mono text-center mt-1">✓ Đã đính kèm hình ảnh thực tế đồ khách</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items List in Modal */}
          <div className="space-y-2">
            <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500 font-bold">Bảng kê khai chi tiết số lượng</span>
            <div className="border border-stone-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                    <th className="p-2.5">Tên đồ vải / Mã</th>
                    <th className="p-2.5 text-center w-24">Lây nhiễm</th>
                    <th className="p-2.5 text-right w-36">Khai báo số lượng</th>
                    <th className="p-2.5 text-center w-12">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {draftItems.map(item => (
                    <tr key={item.ma} className="hover:bg-stone-50 transition-colors">
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          {item.isCustom ? (
                            <input
                              type="text"
                              placeholder="✏️ Tên đồ vải ngoài danh mục..."
                              value={item.ten}
                              onChange={e => {
                                const val = e.target.value;
                                setDraftItems(prev => prev.map(x => x.ma === item.ma ? { ...x, ten: val } : x));
                              }}
                              className="w-full bg-amber-50 border border-amber-300 rounded p-1 text-xs font-bold text-stone-900 focus:outline-none focus:bg-white"
                            />
                          ) : (
                            <span className="font-bold text-stone-800 block text-[11px]">{item.ten}</span>
                          )}
                          {item.isInfectious && (
                            <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                              ⚠️ Lây nhiễm
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-stone-400 font-mono block mt-0.5">{item.ma}</span>
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={item.isInfectious}
                          onChange={() => {
                            setDraftItems(prev => prev.map(x => x.ma === item.ma ? { ...x, isInfectious: !x.isInfectious } : x));
                          }}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            className="w-20 h-8 border border-stone-300 rounded-md text-center text-xs font-mono font-black text-stone-950 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={item.qty || ''}
                            placeholder="0"
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setDraftItems(prev => prev.map(x => x.ma === item.ma ? { ...x, qty: val } : x));
                            }}
                          />
                          <span className="text-[10px] text-stone-400 font-bold">cái</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        {item.isCustom ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftItem(item.ma)}
                            className="text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        ) : (
                          <span className="text-stone-300 font-bold">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Custom Item form inside modal */}
          <div className="bg-stone-50 border border-stone-200 p-3 rounded-lg space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-wider text-stone-600 font-bold">
              ➕ Thêm mặt hàng ngoài danh mục:
            </span>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[9px] font-bold text-stone-400 mb-0.5">Tên đồ vải ngoài danh mục</label>
                <input
                  type="text"
                  placeholder="Nhập tên đồ thêu riêng, đồ bệnh nhân..."
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none"
                />
              </div>
              <div className="w-20">
                <label className="block text-[9px] font-bold text-stone-400 mb-0.5">Số lượng</label>
                <input
                  type="number"
                  min="1"
                  value={customQty}
                  onChange={e => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-bold"
                />
              </div>
              <div className="flex items-center gap-1.5 h-8">
                <input
                  type="checkbox"
                  id="customInfectiousCheck"
                  checked={customInfectious}
                  onChange={e => setCustomInfectious(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                />
                <label htmlFor="customInfectiousCheck" className="text-xs font-bold text-red-700 cursor-pointer">Lây nhiễm ⚠️</label>
              </div>
              <button
                type="button"
                onClick={handleAddCustomDraftFromTable}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-black uppercase rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer font-bold"
              >
                Thêm vào list
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-stone-100 border-t border-stone-300 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setIsCreatingSlip(false)}
            className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-200 text-xs font-bold uppercase transition-all cursor-pointer font-bold"
          >
            Đóng lại
          </button>
          <button
            type="button"
            onClick={handleSubmitSlip}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg shadow-md transition-all cursor-pointer font-bold"
          >
            Gửi phiếu khai báo 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
