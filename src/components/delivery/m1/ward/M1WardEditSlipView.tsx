import React from 'react';
import { X } from 'lucide-react';
import { WardDeliverySlip, LinenItem } from '../../../../types';

interface M1WardEditSlipViewProps {
  activeSlip: WardDeliverySlip;
  handleCancelEditSlip: () => void;
  editDept: string;
  setEditDept: (dept: string) => void;
  deptsToUse: string[];
  editCreator: string;
  setEditCreator: (creator: string) => void;
  editItemsList: any[];
  handleUpdateEditItemTenDirect: (ma: string, ten: string) => void;
  handleToggleEditItemInfectiousDirect: (ma: string) => void;
  handleUpdateEditItemQtyDirect: (ma: string, qty: number) => void;
  handleRemoveItemFromEditList: (ma: string) => void;
  editAddLinenMa: string;
  setEditAddLinenMa: (ma: string) => void;
  items: LinenItem[];
  editAddLinenQty: number;
  setEditAddLinenQty: (qty: number) => void;
  editAddLinenInfectious: boolean;
  setEditAddLinenInfectious: (inf: boolean) => void;
  handleAddItemToEditList: () => void;
  handleAddCustomToEditList: () => void;
  handleSaveEditSlip: () => void;
}

export default function M1WardEditSlipView({
  activeSlip,
  handleCancelEditSlip,
  editDept,
  setEditDept,
  deptsToUse,
  editCreator,
  setEditCreator,
  editItemsList,
  handleUpdateEditItemTenDirect,
  handleToggleEditItemInfectiousDirect,
  handleUpdateEditItemQtyDirect,
  handleRemoveItemFromEditList,
  editAddLinenMa,
  setEditAddLinenMa,
  items,
  editAddLinenQty,
  setEditAddLinenQty,
  editAddLinenInfectious,
  setEditAddLinenInfectious,
  handleAddItemToEditList,
  handleAddCustomToEditList,
  handleSaveEditSlip
}: M1WardEditSlipViewProps) {
  return (
    <div className="border-2 border-indigo-500 bg-white rounded-xl shadow-lg p-5 space-y-4 relative overflow-hidden animate-fade-in">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
      <div className="flex justify-between items-center pb-3 border-b border-stone-200">
        <div>
          <h2 className="text-sm font-bold text-indigo-950 uppercase flex items-center gap-1.5">
            ✏️ ĐANG CHỈNH SỬA PHIẾU {activeSlip.id}
          </h2>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">Chế độ sửa</span>
        </div>
        <button onClick={handleCancelEditSlip} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
      </div>

      {/* Metadata fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-stone-50 p-3 rounded-lg border border-stone-200">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-wider text-stone-500 mb-1">Khoa phòng</label>
          <select
            value={editDept}
            onChange={e => setEditDept(e.target.value)}
            className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {deptsToUse.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-wider text-stone-500 mb-1">Người tạo phiếu</label>
          <input
            type="text"
            value={editCreator}
            onChange={e => setEditCreator(e.target.value)}
            className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Edit quantities */}
      <div className="space-y-2">
        <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500">Danh sách đồ vải bàn giao</span>
        <div className="border border-stone-200 rounded-lg overflow-x-auto bg-stone-50">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                <th className="p-2">Tên đồ vải / Mã</th>
                <th className="p-2 text-center w-24">Lây nhiễm</th>
                <th className="p-2 text-right w-36">Khai báo số lượng</th>
                <th className="p-2 text-center w-12">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {editItemsList.map(item => (
                <tr key={item.ma} className="hover:bg-stone-50 transition-colors">
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      {item.isCustom ? (
                        <input
                          type="text"
                          placeholder="✏️ Tự đánh chữ tên đồ vải..."
                          value={item.ten}
                          onChange={e => handleUpdateEditItemTenDirect(item.ma, e.target.value)}
                          className="w-full bg-amber-50 border border-amber-300 rounded p-1 text-xs font-bold text-stone-900 focus:outline-none focus:bg-white"
                        />
                      ) : (
                        <span className="font-bold text-stone-800 block">{item.ten}</span>
                      )}
                      {item.isInfectious && (
                        <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                          ⚠️ Lây nhiễm
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-stone-400 font-mono block">{item.ma}</span>
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.isInfectious}
                      onChange={() => handleToggleEditItemInfectiousDirect(item.ma)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <input
                        type="number"
                        className="w-20 h-8 border border-stone-300 rounded-md text-center text-xs font-mono font-black text-stone-950 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={item.qty}
                        onChange={e => {
                          const v = Math.max(0, parseInt(e.target.value) || 0);
                          handleUpdateEditItemQtyDirect(item.ma, v);
                        }}
                      />
                      <span className="text-[10px] text-stone-400 font-bold">cái</span>
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItemFromEditList(item.ma)}
                      className="text-stone-400 hover:text-red-600 p-1"
                      title="Xóa đồ vải này khỏi phiếu"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Form to Add New Linen Item while editing */}
      <div className="bg-indigo-50/50 border border-indigo-150 p-3 rounded-xl space-y-2.5">
        <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1 font-bold">
          ➕ Thêm đồ vải mới vào phiếu dơ:
        </span>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[9px] font-bold text-stone-500 mb-0.5">Chọn loại đồ vải</label>
            <select
              value={editAddLinenMa}
              onChange={e => setEditAddLinenMa(e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">-- Chọn đồ vải --</option>
              {items.map(it => (
                <option key={it.ma} value={it.ma}>
                  {it.ten} ({it.ma})
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-[9px] font-bold text-stone-500 mb-0.5">Số lượng</label>
            <input
              type="number"
              min="1"
              value={editAddLinenQty}
              onChange={e => setEditAddLinenQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-1.5 h-9">
            <input
              type="checkbox"
              id="editAddLinenInfectious"
              checked={editAddLinenInfectious}
              onChange={e => setEditAddLinenInfectious(e.target.checked)}
              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
            />
            <label htmlFor="editAddLinenInfectious" className="text-xs font-bold text-red-700 cursor-pointer select-none">Đồ lây nhiễm ⚠️</label>
          </div>
          <button
            type="button"
            onClick={handleAddItemToEditList}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
          >
            Thêm vào list
          </button>
          {(activeSlip.isGuestSlip || activeSlip.dept.startsWith('Khách')) && (
            <button
              type="button"
              onClick={handleAddCustomToEditList}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase rounded-lg shadow-sm transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer"
            >
              ➕ Thêm dòng tự đánh chữ
            </button>
          )}
        </div>
      </div>

      {/* Actions buttons */}
      <div className="flex justify-end gap-2 pt-3 border-t border-stone-150">
        <button
          onClick={handleCancelEditSlip}
          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-stone-700 text-xs font-bold uppercase transition-all cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          onClick={handleSaveEditSlip}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-lg shadow-md transition-all cursor-pointer"
        >
          Lưu thay đổi 💾
        </button>
      </div>
    </div>
  );
}
