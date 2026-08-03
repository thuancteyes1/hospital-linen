import React, { useState } from 'react';
import { X, Check, Printer, Bed, RefreshCw, Send } from 'lucide-react';
import { WardDeliverySlip, LinenItem } from '../../../../types';
import PrintBillModal, { PrintBillData } from '../../utils/PrintBillModal';

interface M1WardSlipDetailViewProps {
  activeSlip: WardDeliverySlip;
  setActiveSlipId: (id: string | null) => void;
  hasPerm: (roleReq: 'ward' | 'linen' | 'laundry' | 'clean' | 'housekeeping') => boolean;
  handleStartEditSlip: (slip: WardDeliverySlip) => void;
  handleDeletePendingSlip: (id: string) => void;
  m1CheckedItems: Record<string, boolean>;
  setM1CheckedItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  m1ItemVerifiedQtys: Record<string, number>;
  setM1ItemVerifiedQtys: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  handleCreateGuestBillRiêng: (slip: WardDeliverySlip) => void;
  handleConfirmDirtyLinenM1: (id: string) => void;
  isConfirmingM1: boolean;
}

export default function M1WardSlipDetailView({
  activeSlip,
  setActiveSlipId,
  hasPerm,
  handleStartEditSlip,
  handleDeletePendingSlip,
  m1CheckedItems,
  setM1CheckedItems,
  m1ItemVerifiedQtys,
  setM1ItemVerifiedQtys,
  handleCreateGuestBillRiêng,
  handleConfirmDirtyLinenM1,
  isConfirmingM1
}: M1WardSlipDetailViewProps) {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const printData: PrintBillData = {
    title: activeSlip.isGuestSlip ? "PHIẾU BÀN GIAO ĐỒ VẢI KHÁCH VIP" : "PHIẾU GIAO NHẬN ĐỒ VẢI DƠ KHOA PHÒNG",
    subTitle: `Khoa phòng khai báo đồ vải dơ gửi bộ phận quản lý đồ vải bệnh viện`,
    billId: activeSlip.id,
    date: activeSlip.createdAt,
    dept: activeSlip.dept,
    sender: activeSlip.createdBy,
    receiver: activeSlip.verifiedDirtyBy || 'NV Đồ Vải',
    guestName: activeSlip.guestName,
    guestRoom: activeSlip.guestRoom,
    statusText: activeSlip.status === 'pending' ? 'Chờ duyệt' : 'Đã duyệt kho dơ',
    items: activeSlip.items.map(item => ({
      ma: item.ma,
      ten: item.ten,
      group: item.group,
      qty: item.qty,
      realQty: m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty),
      note: item.isInfectious ? 'Đồ vải lây nhiễm' : ''
    }))
  };

  return (
    <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-5 space-y-4 animate-fade-in">
      <div className="flex justify-between items-center pb-3 border-b border-stone-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-stone-900 uppercase">Chi tiết phiếu {activeSlip.id}</h2>
            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
              activeSlip.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {activeSlip.status === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'}
            </span>
            {activeSlip.status === 'pending' && (hasPerm('ward') || hasPerm('linen')) && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleStartEditSlip(activeSlip)}
                  className="px-2 py-0.5 text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded transition-all flex items-center gap-0.5 cursor-pointer"
                  title="Sửa phiếu"
                >
                  ✏️ Sửa phiếu
                </button>
                <button
                  onClick={() => handleDeletePendingSlip(activeSlip.id)}
                  className="px-2 py-0.5 text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded transition-all flex items-center gap-0.5 cursor-pointer"
                  title="Xóa phiếu"
                >
                  🗑️ Xóa phiếu
                </button>
              </div>
            )}
          </div>
          <span className="text-xs text-stone-500">Người lập: {activeSlip.createdBy} • Khoa {activeSlip.dept}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold border border-amber-300 text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold shadow-2xs"
            title="Xem trước & In phiếu giao nhận"
          >
            <Printer size={14} className="text-amber-600" /> In phiếu
          </button>
          <button onClick={() => setActiveSlipId(null)} className="text-stone-400 hover:text-stone-900 cursor-pointer p-1"><X size={18} /></button>
        </div>
      </div>

      {(activeSlip.isGuestSlip || activeSlip.dept.startsWith('Khách') || activeSlip.attachedImage) && (
        <div className="p-4 bg-amber-50/80 border-2 border-amber-400 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5 font-bold">
              <Bed className="w-4 h-4 text-amber-800 shrink-0" />
              <span>PHIẾU ĐỒ VẢI KHÁCH VIP (NV BUỒNG PHÒNG)</span>
            </span>
            {(activeSlip.guestName || activeSlip.guestRoom) && (
              <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-lg border border-amber-300">
                {activeSlip.guestRoom ? `Phòng: ${activeSlip.guestRoom}` : ''} {activeSlip.guestName ? `• Khách: ${activeSlip.guestName}` : ''}
              </span>
            )}
          </div>
          {activeSlip.attachedImage && (
            <div className="mt-2 bg-white p-2 rounded-lg border border-amber-300 inline-block shadow-sm">
              <img src={activeSlip.attachedImage} alt="Đồ vải khách" className="max-h-48 object-contain rounded border border-stone-200" />
              <p className="text-[10px] text-stone-500 font-mono mt-1 text-center">✓ Ảnh chụp đi kèm Bill Riêng Khách</p>
            </div>
          )}
          {activeSlip.status === 'verified_dirty' && !activeSlip.laundryDispatchId && hasPerm('linen') && (
            <div className="pt-2 border-t border-amber-200">
              <button
                onClick={() => handleCreateGuestBillRiêng(activeSlip)}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>TẠO BILL RIÊNG GIAO CTY GIẶT (ĐỒ KHÁCH)</span>
              </button>
              <p className="text-[10px] text-amber-800 text-center mt-1">
                * Đồ khách VIP được tách thành Bill riêng với ảnh chụp đính kèm, không gộp chung vào Kho Dơ Tổng.
              </p>
            </div>
          )}
          {activeSlip.laundryDispatchId && (
            <div className="text-xs font-bold text-emerald-800 bg-emerald-100/80 p-2 rounded-lg border border-emerald-300">
              ✓ Đã tạo Bill Riêng: <span className="font-mono">{activeSlip.laundryDispatchId}</span> (Đang chuyển xưởng giặt)
            </div>
          )}
        </div>
      )}

      {activeSlip.isRewash && (
        <div className="p-4 bg-indigo-50/80 border-2 border-indigo-400 rounded-xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-900 uppercase flex items-center gap-1.5 font-bold">
              <RefreshCw className="w-4 h-4 text-indigo-700 shrink-0" />
              <span>PHIẾU GỬI GIẶT LẠI (REWASH)</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-900 bg-indigo-200/80 px-2.5 py-0.5 rounded-lg border border-indigo-300 font-bold">
              Hao hụt Kho Sạch • Chuyển vào Kho Dơ
            </span>
          </div>
          <p className="text-[11px] text-indigo-800 leading-normal">
            Phiếu này ghi nhận đồ sạch mới từ xưởng về bị dính bẩn hoặc ố vàng cần gửi giặt lại. 
            Khi duyệt phiếu này (M1), hệ thống sẽ <strong>tự động trừ Kho Sạch Tạm</strong> của bệnh viện, đồng thời <strong>cộng vào Kho Dơ Tạm</strong> để gom gửi lại xưởng giặt.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500 font-bold">Danh mục kiểm dơ</span>
        <div className="border border-stone-200 rounded-lg overflow-x-auto bg-stone-50">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                <th className="p-2 text-center w-12">Tick nhận</th>
                <th className="p-2">Tên đồ vải</th>
                <th className="p-2 text-right">Khai báo (Khoa)</th>
                <th className="p-2 text-right">Duyệt thực tế (BV)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {activeSlip.items.map(item => {
                const isChecked = !!m1CheckedItems[item.ma];
                const verifiedQty = m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty);
                return (
                  <tr key={item.ma} className={`hover:bg-stone-50 transition-colors ${isChecked ? 'bg-emerald-50/45' : ''}`}>
                    <td className="p-2 text-center">
                      {activeSlip.status === 'pending' && hasPerm('linen') ? (
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300 cursor-pointer"
                          checked={isChecked}
                          onChange={() => {
                            setM1CheckedItems(prev => ({
                              ...prev,
                              [item.ma]: !prev[item.ma]
                            }));
                          }}
                        />
                      ) : (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-800">{item.ten}</span>
                        {item.isInfectious && (
                          <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase border border-red-200">
                            ⚠️ Lây nhiễm
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-stone-400 font-mono block">{item.ma}</span>
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-stone-600">{item.qty} cái</td>
                    <td className="p-2 text-right font-mono text-amber-700 font-bold">
                      {activeSlip.status === 'pending' && hasPerm('linen') ? (
                        <input
                          type="number"
                          className="w-24 h-9 border border-stone-300 rounded-lg text-center text-sm font-mono font-black text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={verifiedQty}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setM1ItemVerifiedQtys(prev => ({
                              ...prev,
                              [item.ma]: val
                            }));
                          }}
                        />
                      ) : (
                        <span>{verifiedQty} cái</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Slip as Dirty Block */}
      {activeSlip.status === 'pending' && hasPerm('linen') && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex justify-end items-center">
          <button
            onClick={() => handleConfirmDirtyLinenM1(activeSlip.id)}
            disabled={isConfirmingM1}
            className={`px-4 py-2 text-white text-xs font-bold uppercase rounded-lg shadow whitespace-nowrap transition-all ${
              isConfirmingM1 
                ? 'bg-stone-400 cursor-not-allowed opacity-50' 
                : 'bg-amber-600 hover:bg-amber-700 cursor-pointer'
            }`}
          >
            {isConfirmingM1 ? '⏳ Đang xử lý...' : 'Xác Nhận & Đổ Vào Kho Dơ'}
          </button>
        </div>
      )}

      {activeSlip.status !== 'pending' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 font-bold">
          ✓ Đã được xác nhận bởi <strong>{activeSlip.verifiedDirtyBy || 'Nhân viên Đồ Vải'}</strong> lúc {activeSlip.verifiedDirtyAt || activeSlip.createdAt}
        </div>
      )}

      <PrintBillModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={printData}
      />
    </div>
  );
}
