import React from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X, Upload, Trash2 } from 'lucide-react';
import { LinenItem } from '../../types';

interface LinenStockDetailModalProps {
  onClose: () => void;
  selectedDetailItem: LinenItem;
  getLinenImage: (item: LinenItem) => string;
  isWardUser: boolean;
  detailAllocations: Record<string, [string, number][]>;
  temporaryDirtyStore: Record<string, number>;
  temporaryCompanyDirtyStore: Record<string, number>;
  temporaryCleanStore: Record<string, number>;
  onEditItem: (origMa: string, updatedItem: LinenItem) => void;
  onSetSelectedDetailItem: (item: LinenItem | null) => void;
}

export default function LinenStockDetailModal({
  onClose,
  selectedDetailItem,
  getLinenImage,
  isWardUser,
  detailAllocations,
  temporaryDirtyStore,
  temporaryCompanyDirtyStore,
  temporaryCleanStore,
  onEditItem,
  onSetSelectedDetailItem
}: LinenStockDetailModalProps) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const updated = { ...selectedDetailItem, hinhAnh: dataUrl };
        onEditItem(selectedDetailItem.ma, updated);
        onSetSelectedDetailItem(updated);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    const updated = { ...selectedDetailItem, hinhAnh: undefined };
    onEditItem(selectedDetailItem.ma, updated);
    onSetSelectedDetailItem(updated);
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-4 sm:pt-8 md:pt-12 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#F5F2ED] border border-[#1A1A1A] p-1 shadow-2xl">
        <div className="border border-[#1A1A1A] p-5 space-y-5">
          
          <div className="flex justify-between items-start border-b border-[#1A1A1A] pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-black bg-[#2563EB] text-white px-2 py-0.5 rounded">{selectedDetailItem.ma}</span>
                <span className="text-[10px] uppercase font-bold text-[#8C8984] bg-stone-200 px-2 py-0.5 rounded">{selectedDetailItem.nhom}</span>
              </div>
              <h3 className="font-serif font-black text-lg text-[#1A1A1A]">{selectedDetailItem.ten}</h3>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full border border-[#1A1A1A] flex items-center justify-center text-stone-600 hover:text-black font-bold text-lg cursor-pointer">&times;</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-[#1A1A1A] bg-stone-100 shadow-inner">
                <img src={getLinenImage(selectedDetailItem)} alt={selectedDetailItem.ten} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              {!isWardUser && (
                <div className="pt-2 flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    id={`file-upload-modal-${selectedDetailItem.ma}`}
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <label
                    htmlFor={`file-upload-modal-${selectedDetailItem.ma}`}
                    className="w-full py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Tải ảnh từ tệp (JPG, PNG)</span>
                  </label>
                  {selectedDetailItem.hinhAnh && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold uppercase rounded cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa ảnh hiện tại</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2 bg-[#EBE8E3]/40 p-3 border border-[#1A1A1A]/10 rounded-xl text-xs">
                <h4 className="text-xs font-bold uppercase text-stone-800">Trạng thái tồn kho</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-stone-500">Kho chính:</span>
                    <b className="block font-mono text-stone-900 text-sm">{selectedDetailItem.kc.toLocaleString()} cái</b>
                  </div>
                  <div>
                    <span className="text-stone-500">Khoa phòng:</span>
                    <b className="block font-mono text-blue-800 text-sm">{(() => {
                      const kp = (detailAllocations[selectedDetailItem.ma] || []).reduce((s,a) => s+a[1], 0);
                      return kp.toLocaleString();
                    })()} cái</b>
                  </div>
                </div>
              </div>

              {(() => {
                const qD = temporaryDirtyStore[selectedDetailItem.ma] || 0;
                const qC = temporaryCompanyDirtyStore[selectedDetailItem.ma] || 0;
                const qS = temporaryCleanStore[selectedDetailItem.ma] || 0;
                if (qD === 0 && qC === 0 && qS === 0) return null;
                return (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-emerald-800 block uppercase text-[10px]">Đang luân chuyển:</span>
                    <div className="grid grid-cols-3 gap-1">
                      {qD > 0 && <span className="bg-white p-1 rounded text-center">Dơ BV: <b>{qD}</b></span>}
                      {qC > 0 && <span className="bg-white p-1 rounded text-center">Dơ Cty: <b>{qC}</b></span>}
                      {qS > 0 && <span className="bg-white p-1 rounded text-center">Sạch: <b>{qS}</b></span>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#1A1A1A] border-dashed text-xs">
            <h4 className="font-bold text-stone-800 uppercase flex items-center gap-1"><MapPin size={12} /> Phân phối khoa phòng chi tiết</h4>
            {(() => {
              const allocs = (detailAllocations[selectedDetailItem.ma] || []).filter(a => a[1] > 0);
              if (allocs.length === 0) return <div className="py-2 text-center text-stone-400 italic">Chưa phân phối tồn kho tại khoa phòng nào.</div>;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto pr-1">
                  {allocs.map(([dept, qty]) => (
                    <div key={dept} className="bg-white border border-stone-200 p-2 rounded-lg flex justify-between items-center">
                      <span className="truncate text-stone-700 mr-2 font-bold" title={dept}>{dept}</span>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{qty}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end pt-2 border-t border-stone-200">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase hover:bg-stone-800 cursor-pointer font-bold">Đóng</button>
          </div>

        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
