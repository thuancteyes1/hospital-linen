import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Eye, Info, X } from 'lucide-react';
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
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [isEditingImage, setIsEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  const handleSaveImage = () => {
    const updated = { ...selectedDetailItem, hinhAnh: newImageUrl.trim() || undefined };
    onEditItem(selectedDetailItem.ma, updated);
    onSetSelectedDetailItem(updated);
    setIsEditingImage(false);
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
            <button onClick={onClose} className="w-7 h-7 rounded-full border border-[#1A1A1A] flex items-center justify-center text-stone-600 hover:text-black font-bold text-lg">&times;</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-[#1A1A1A] bg-stone-100 shadow-inner">
                <img src={getLinenImage(selectedDetailItem)} alt={selectedDetailItem.ten} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              {!isWardUser && (
                <div className="pt-1">
                  {!isEditingImage ? (
                    <button onClick={() => { setIsEditingImage(true); setNewImageUrl(selectedDetailItem.hinhAnh || ''); }} className="w-full py-2 bg-white hover:bg-stone-100 border border-[#1A1A1A] text-xs font-bold uppercase tracking-wider text-stone-800 rounded cursor-pointer font-bold">Chèn / Cập nhật ảnh mới</button>
                  ) : (
                    <div className="bg-white p-3 border border-[#1A1A1A] rounded-lg space-y-2">
                      <input type="url" placeholder="Dán link ảnh (URL) mới" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none rounded" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setIsEditingImage(false)} className="px-2 py-1 text-[10px] font-bold border border-stone-300 hover:bg-stone-50 rounded cursor-pointer">Hủy</button>
                        <button onClick={handleSaveImage} className="px-3 py-1 bg-[#2563EB] text-white text-[10px] font-bold uppercase rounded cursor-pointer">Lưu</button>
                      </div>
                    </div>
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
