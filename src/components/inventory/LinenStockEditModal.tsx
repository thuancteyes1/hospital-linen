import React, { useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { LinenItem, LINEN_GROUPS, LINEN_PAGES } from '../../types';
import { compressImageFile, handleImageError } from '../../utils/imageUtils';

interface LinenStockEditModalProps {
  onClose: () => void;
  onSubmit: (origMa: string, updatedItem: LinenItem) => void;
  item: LinenItem;
  items: LinenItem[];
}

export default function LinenStockEditModal({ onClose, onSubmit, item, items }: LinenStockEditModalProps) {
  const [editMa, setEditMa] = useState(item.ma);
  const [editTen, setEditTen] = useState(item.ten);
  const [editNhom, setEditNhom] = useState(item.nhom);
  const [editTrang, setEditTrang] = useState(item.trang || 'Trang 1');
  const [editMin, setEditMin] = useState(item.mn);
  const [editKc, setEditKc] = useState(item.kc);
  const [editHinhAnh, setEditHinhAnh] = useState(item.hinhAnh || '');
  const [editError, setEditError] = useState('');

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImageFile(
      file,
      (compressedUrl) => {
        setEditHinhAnh(compressedUrl);
      },
      (err) => {
        setEditError(err || 'Không thể đọc tệp ảnh.');
      }
    );
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    const trimmedMa = editMa.trim().toUpperCase();
    const trimmedTen = editTen.trim().toUpperCase();

    if (!trimmedMa || !trimmedTen || !editNhom) {
      setEditError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (trimmedMa !== item.ma && items.some(it => it.ma === trimmedMa)) {
      setEditError(`Mã đồ vải "${trimmedMa}" đã được sử dụng bởi mặt hàng khác.`);
      return;
    }

    const updatedItem: LinenItem = {
      ma: trimmedMa,
      ten: trimmedTen,
      nhom: editNhom,
      trang: editTrang || 'Trang 1',
      kc: Math.max(0, editKc),
      kp: item.kp,
      mn: Math.max(0, editMin),
      hinhAnh: editHinhAnh.trim() || undefined
    };

    onSubmit(item.ma, updatedItem);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-4 sm:pt-8 md:pt-12 overflow-y-auto">
      <div className="w-full max-w-md border border-[#1A1A1A] bg-[#F5F2ED] p-1">
        <div className="border border-[#1A1A1A] p-5">
          <div className="flex justify-between items-start mb-4 pb-2 border-b border-[#1A1A1A]">
            <div>
              <h3 className="font-serif font-black text-lg text-[#1A1A1A]">Sửa Thông Tin Đồ Vải</h3>
              <p className="text-[11px] text-[#8C8984]">Mã gốc: {item.ma}</p>
            </div>
            <button onClick={onClose} className="text-[#8C8984] hover:text-[#1A1A1A] text-lg font-bold cursor-pointer">&times;</button>
          </div>

          {editError && <div className="mb-4 p-2.5 border border-[#C4432A] bg-[#FDF2F0] text-[11px] text-[#C4432A] font-semibold">{editError}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Mã đồ vải <span className="text-[#C4432A]">*</span></label>
              <input type="text" required value={editMa} onChange={e => setEditMa(e.target.value.toUpperCase())} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Nhóm loại <span className="text-[#C4432A]">*</span></label>
                <select required value={editNhom} onChange={e => setEditNhom(e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none">
                  {LINEN_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Trang in Bill Tổng <span className="text-[#C4432A]">*</span></label>
                <select value={editTrang} onChange={e => setEditTrang(e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none font-bold text-amber-900">
                  {LINEN_PAGES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Tên đồ vải <span className="text-[#C4432A]">*</span></label>
              <input type="text" required value={editTen} onChange={e => setEditTen(e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Cảnh báo tối thiểu</label>
                <input type="number" min="0" value={editMin} onChange={e => setEditMin(parseInt(e.target.value) || 0)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Tồn Kho chính</label>
                <input type="number" min="0" value={editKc} onChange={e => setEditKc(parseInt(e.target.value) || 0)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Hình ảnh đại diện</label>
              {editHinhAnh ? (
                <div className="flex items-center gap-3 bg-white p-2 border border-[#1A1A1A] rounded">
                  <img src={editHinhAnh} alt="Preview" className="w-12 h-12 object-cover rounded border border-stone-200" referrerPolicy="no-referrer" />
                  <div className="flex-1 flex gap-2">
                    <input type="file" accept="image/jpeg,image/png,image/jpg,image/webp" id="edit-modal-image-file" className="hidden" onChange={handleImageFileChange} />
                    <label htmlFor="edit-modal-image-file" className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded cursor-pointer flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> Đổi ảnh
                    </label>
                    <button type="button" onClick={() => setEditHinhAnh('')} className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[11px] font-bold rounded cursor-pointer flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input type="file" accept="image/jpeg,image/png,image/jpg,image/webp" id="edit-modal-image-file" className="hidden" onChange={handleImageFileChange} />
                  <label htmlFor="edit-modal-image-file" className="w-full py-2.5 bg-white hover:bg-stone-100 border border-[#1A1A1A] text-xs font-bold text-stone-800 rounded cursor-pointer flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" /> Tải ảnh từ tệp (JPG, PNG)
                  </label>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-3 border-t border-[#1A1A1A] border-dashed">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3] cursor-pointer">Hủy bỏ</button>
              <button type="submit" className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase hover:bg-emerald-700 hover:border-emerald-700 border border-[#1A1A1A] cursor-pointer font-bold">Lưu Thay Đổi</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
