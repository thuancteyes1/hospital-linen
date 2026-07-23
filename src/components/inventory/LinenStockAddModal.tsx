import React, { useState, useEffect } from 'react';
import { LinenItem, LINEN_GROUPS, LINEN_PAGES } from '../../types';

interface LinenStockAddModalProps {
  onClose: () => void;
  onSubmit: (item: LinenItem) => void;
  items: LinenItem[];
}

export default function LinenStockAddModal({ onClose, onSubmit, items }: LinenStockAddModalProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [addMa, setAddMa] = useState('');
  const [addTen, setAddTen] = useState('');
  const [addNhom, setAddNhom] = useState('');
  const [addTrang, setAddTrang] = useState('Trang 1');
  const [addMin, setAddMin] = useState(20);
  const [addHinhAnh, setAddHinhAnh] = useState('');
  const [addError, setAddError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const trimmedMa = addMa.trim().toUpperCase();
    const trimmedTen = addTen.trim().toUpperCase();

    if (!trimmedMa || !trimmedTen || !addNhom) {
      setAddError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (items.some(it => it.ma === trimmedMa)) {
      setAddError(`Mã đồ vải "${trimmedMa}" đã tồn tại trong hệ thống.`);
      return;
    }

    const newItem: LinenItem = {
      ma: trimmedMa,
      ten: trimmedTen,
      nhom: addNhom,
      trang: addTrang || 'Trang 1',
      kc: 0,
      kp: 0,
      mn: Math.max(0, addMin),
      hinhAnh: addHinhAnh.trim() || undefined
    };

    onSubmit(newItem);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-4 sm:pt-8 md:pt-12 overflow-y-auto">
      <div className="w-full max-w-md border border-[#1A1A1A] bg-[#F5F2ED] p-1">
        <div className="border border-[#1A1A1A] p-5">
          <div className="flex justify-between items-start mb-4 pb-2 border-b border-[#1A1A1A]">
            <div>
              <h3 className="font-serif font-black text-lg text-[#1A1A1A]">Thêm Loại Đồ Vải Mới</h3>
              <p className="text-[11px] text-[#8C8984]">Đăng ký mã mới cho danh mục đồ vải bệnh viện</p>
            </div>
            <button onClick={onClose} className="text-[#8C8984] hover:text-[#1A1A1A] text-lg font-bold">&times;</button>
          </div>

          {addError && <div className="mb-4 p-2.5 border border-[#C4432A] bg-[#FDF2F0] text-[11px] text-[#C4432A] font-semibold">{addError}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Mã đồ vải <span className="text-[#C4432A]">*</span></label>
              <input type="text" required placeholder="VD: DV053" value={addMa} onChange={e => setAddMa(e.target.value.toUpperCase())} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Nhóm loại <span className="text-[#C4432A]">*</span></label>
                <select required value={addNhom} onChange={e => setAddNhom(e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none">
                  <option value="">-- Chọn nhóm --</option>
                  {LINEN_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Trang in Bill Tổng <span className="text-[#C4432A]">*</span></label>
                <select value={addTrang} onChange={e => setAddTrang(e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none font-bold text-amber-900">
                  {LINEN_PAGES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Tên đồ vải <span className="text-[#C4432A]">*</span></label>
              <input type="text" required placeholder="VD: KHĂN PHÒNG MỔ XANH DƯƠNG" value={addTen} onChange={e => setAddTen(e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Tồn an toàn tối thiểu</label>
              <input type="number" min="0" value={addMin} onChange={e => setAddMin(parseInt(e.target.value) || 0)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none font-mono" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Link hình ảnh (Tùy chọn)</label>
              <input type="url" placeholder="Để trống hệ thống sẽ tự động tạo ảnh minh họa" value={addHinhAnh} onChange={e => setAddHinhAnh(e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none" />
            </div>
            <div className="flex gap-2 justify-end pt-3 border-t border-[#1A1A1A] border-dashed">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]">Hủy bỏ</button>
              <button type="submit" className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase hover:bg-[#C4432A] hover:border-[#C4432A] border border-[#1A1A1A]">Tạo mới</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
