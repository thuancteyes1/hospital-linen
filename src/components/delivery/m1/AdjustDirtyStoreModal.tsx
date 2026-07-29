import React, { useState, useEffect } from 'react';
import { LinenItem } from '../../../types';

interface AdjustDirtyStoreModalProps {
  items: LinenItem[];
  temporaryDirtyStore: Record<string, number>;
  onUpdateDeliveryStates: (params: { temporaryDirtyStore: Record<string, number> }) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onClose: () => void;
}

export default function AdjustDirtyStoreModal({
  items,
  temporaryDirtyStore,
  onUpdateDeliveryStates,
  showToast,
  onClose
}: AdjustDirtyStoreModalProps) {
  const [dirtyStoreAdjustmentQtys, setDirtyStoreAdjustmentQtys] = useState<Record<string, number>>({});
  const [adjustDirtyReason, setAdjustDirtyReason] = useState('');

  useEffect(() => {
    // Populate adjustment quantities from store
    const initialQtys: Record<string, number> = {};
    items.forEach(item => {
      initialQtys[item.ma] = temporaryDirtyStore[item.ma] || 0;
    });
    setDirtyStoreAdjustmentQtys(initialQtys);
  }, [items, temporaryDirtyStore]);

  const handleSaveAdjustDirtyStore = () => {
    if (!adjustDirtyReason.trim()) {
      showToast('⚠️ Vui lòng nhập lý do điều chỉnh để lưu trữ nhật ký.', 'error');
      return;
    }

    const nextStore = { ...temporaryDirtyStore };
    Object.keys(dirtyStoreAdjustmentQtys).forEach(ma => {
      nextStore[ma] = Math.max(0, dirtyStoreAdjustmentQtys[ma]);
    });

    onUpdateDeliveryStates({
      temporaryDirtyStore: nextStore
    });
    
    showToast(`✓ Đã điều chỉnh thành công tồn kho dơ tạm bệnh viện. Lý do: "${adjustDirtyReason}"`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-4 sm:pt-8 md:pt-12 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200 p-6 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center pb-3 border-b border-stone-200">
          <h3 className="font-serif font-black text-lg text-stone-800 flex items-center gap-2 font-bold">
            Điều Chỉnh Tồn Kho Dơ Tạm
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-all text-sm font-black p-1 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
        
        <p className="text-xs text-stone-500 mt-2.5 mb-4 leading-relaxed">
          Dùng để điều chỉnh số lượng thực tế trong <strong>Kho dơ tạm của Bệnh viện</strong> khi phát hiện hao hụt, mất mát khi thu gom, hoặc sai lệch đếm thực tế so với phiếu. Số liệu cập nhật sẽ đồng bộ vào hệ thống.
        </p>

        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          <div className="border border-stone-200 rounded-xl overflow-x-auto bg-stone-50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                  <th className="p-2.5">Tên đồ vải</th>
                  <th className="p-2.5 text-center w-24">Tồn dơ hiện tại</th>
                  <th className="p-2.5 text-center w-36">Số lượng mới</th>
                  <th className="p-2.5 text-center w-20">Chênh lệch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {Object.keys(dirtyStoreAdjustmentQtys).length > 0 ? (
                  Object.keys(dirtyStoreAdjustmentQtys).map(ma => {
                    const item = items.find(i => i.ma === ma);
                    const oldQty = temporaryDirtyStore[ma] || 0;
                    const newQty = dirtyStoreAdjustmentQtys[ma] ?? oldQty;
                    const diff = newQty - oldQty;

                    return (
                      <tr key={ma} className="hover:bg-stone-50">
                        <td className="p-2.5">
                          <span className="font-bold text-stone-800 block text-[11px]">{item?.ten || ma}</span>
                          <span className="font-mono text-[9px] text-stone-400">{ma}</span>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-stone-600">
                          {oldQty}
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              className="w-14 h-7 border border-stone-300 rounded-md text-center text-xs font-mono font-black bg-stone-50 text-stone-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={newQty}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setDirtyStoreAdjustmentQtys(prev => ({
                                  ...prev,
                                  [ma]: val
                                }));
                              }}
                            />
                          </div>
                        </td>
                        <td className={`p-2.5 text-center font-mono font-bold text-[11px] ${
                          diff < 0 ? 'text-red-600' : diff > 0 ? 'text-emerald-600' : 'text-stone-400'
                        }`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-stone-400 italic font-bold">
                      Không có mặt hàng nào đang tồn trong Kho dơ tạm để điều chỉnh!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1.5 font-bold">Lý do điều chỉnh</label>
            <input
              type="text"
              className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={adjustDirtyReason}
              onChange={e => setAdjustDirtyReason(e.target.value)}
              placeholder="VD: Hao hụt thực tế thu gom, đếm lệch..."
            />
          </div>
        </div>

        <div className="pt-4 border-t border-stone-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer font-bold"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSaveAdjustDirtyStore}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase rounded-lg shadow-md transition-all cursor-pointer font-bold"
          >
            Lưu cân chỉnh
          </button>
        </div>
      </div>
    </div>
  );
}
