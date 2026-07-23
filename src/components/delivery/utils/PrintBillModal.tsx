import React from 'react';
import { X, Printer } from 'lucide-react';

export interface PrintBillItem {
  ma: string;
  ten: string;
  group?: string;
  qty: number; // Số lượng khai báo
  realQty?: number; // Số lượng thực giao/thực nhận
  note?: string;
}

export interface PrintBillData {
  title: string;
  subTitle?: string;
  billId: string;
  date: string;
  dept?: string;
  sender?: string;
  receiver?: string;
  contractor?: string;
  plate?: string;
  driver?: string;
  guestName?: string;
  guestRoom?: string;
  statusText?: string;
  items: PrintBillItem[];
  notes?: string;
}

interface PrintBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PrintBillData | null;
}

export default function PrintBillModal({ isOpen, onClose, data }: PrintBillModalProps) {
  if (!isOpen || !data) return null;

  const handleTriggerPrint = () => {
    window.print();
  };

  const totalQty = data.items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalRealQty = data.items.reduce((sum, item) => sum + (item.realQty !== undefined ? item.realQty : item.qty), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in no-print-bg">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-stone-200">
        
        {/* Modal Toolbar (hidden on print) */}
        <div className="p-4 bg-stone-900 text-white flex justify-between items-center shrink-0 no-print">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-amber-400" />
            <span className="font-bold text-sm">Xem Trước & In Phiếu / Bill Đồ Vải</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerPrint}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer font-bold"
            >
              <Printer size={15} /> In Phiếu (Print)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Form Content Area */}
        <div className="p-8 overflow-y-auto flex-1 bg-white" id="printable-bill-modal">
          
          {/* Hospital Header */}
          <div className="flex justify-between items-start border-b-2 border-stone-800 pb-4 mb-6">
            <div>
              <h3 className="font-black text-sm uppercase text-stone-900 tracking-wider">BỆNH VIỆN - BỘ PHẬN QUẢN LÝ ĐỒ VẢI</h3>
              <p className="text-xs text-stone-600 mt-0.5">Hệ thống Quản lý Bàn giao & Công nợ Đồ vải</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Thời gian in: {new Date().toLocaleString('vi-VN')}</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-base text-stone-900 block">{data.billId}</span>
              <span className="text-xs text-stone-600 block mt-0.5">Ngày lập: {data.date}</span>
              {data.statusText && (
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded border border-stone-300 bg-stone-100 text-stone-800 uppercase">
                  {data.statusText}
                </span>
              )}
            </div>
          </div>

          {/* Form Title */}
          <div className="text-center my-4 space-y-1">
            <h1 className="text-lg font-black uppercase text-stone-950 tracking-wide font-bold">{data.title}</h1>
            {data.subTitle && <p className="text-xs font-semibold text-stone-600 italic">{data.subTitle}</p>}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs mb-6 print:bg-transparent print:border-stone-300">
            <div className="space-y-1.5">
              {data.dept && <p><span className="font-bold text-stone-700">Khoa / Phòng:</span> {data.dept}</p>}
              {data.sender && <p><span className="font-bold text-stone-700">Người bàn giao:</span> {data.sender}</p>}
              {data.contractor && <p><span className="font-bold text-stone-700">Đơn vị giặt:</span> {data.contractor}</p>}
              {data.guestName && <p><span className="font-bold text-stone-700">Khách hàng VIP:</span> {data.guestName} {data.guestRoom ? `(Phòng ${data.guestRoom})` : ''}</p>}
            </div>
            <div className="space-y-1.5">
              {data.receiver && <p><span className="font-bold text-stone-700">Người tiếp nhận:</span> {data.receiver}</p>}
              {data.driver && <p><span className="font-bold text-stone-700">Tài xế / Lái xe:</span> {data.driver}</p>}
              {data.plate && <p><span className="font-bold text-stone-700">Biển số xe:</span> {data.plate}</p>}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full text-left text-xs border-collapse border border-stone-300">
              <thead>
                <tr className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300">
                  <th className="p-2 border border-stone-300 text-center w-10">STT</th>
                  <th className="p-2 border border-stone-300 w-24">Mã Đồ Vải</th>
                  <th className="p-2 border border-stone-300">Tên Tên Đồ Vải / Vật Tư</th>
                  <th className="p-2 border border-stone-300 text-right w-24">SL Khai Báo</th>
                  <th className="p-2 border border-stone-300 text-right w-24">SL Thực Giao</th>
                  <th className="p-2 border border-stone-300 w-28">Ghi Chú</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr key={item.ma || idx} className="border-b border-stone-300">
                    <td className="p-2 border border-stone-300 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border border-stone-300 font-mono font-bold text-stone-700">{item.ma}</td>
                    <td className="p-2 border border-stone-300">
                      <span className="font-bold text-stone-900">{item.ten}</span>
                      {item.group && <span className="text-[10px] text-stone-500 block font-normal">{item.group}</span>}
                    </td>
                    <td className="p-2 border border-stone-300 text-right font-mono font-bold">{item.qty}</td>
                    <td className="p-2 border border-stone-300 text-right font-mono font-bold text-amber-900">
                      {item.realQty !== undefined ? item.realQty : item.qty}
                    </td>
                    <td className="p-2 border border-stone-300 text-[11px] text-stone-600">{item.note || ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-100 font-bold border-t-2 border-stone-400 text-stone-900">
                  <td colSpan={3} className="p-2 border border-stone-300 text-right uppercase">Tổng Cộng:</td>
                  <td className="p-2 border border-stone-300 text-right font-mono font-black text-sm">{totalQty}</td>
                  <td className="p-2 border border-stone-300 text-right font-mono font-black text-sm text-amber-900">{totalRealQty}</td>
                  <td className="p-2 border border-stone-300"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {data.notes && (
            <div className="mb-6 p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs">
              <span className="font-bold text-stone-800">Ghi chú bổ sung:</span> {data.notes}
            </div>
          )}

          {/* Signatures Block */}
          <div className="mt-10 grid grid-cols-3 gap-4 text-center text-xs pt-4 border-t border-stone-200 print:mt-12">
            <div>
              <p className="font-bold text-stone-900 uppercase">Người Lập Phiếu</p>
              <p className="text-[10px] text-stone-500 italic">(Ký & ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold text-stone-800">{data.sender || '........................'}</p>
            </div>
            <div>
              <p className="font-bold text-stone-900 uppercase">Đại Diện Bên Giao</p>
              <p className="text-[10px] text-stone-500 italic">(Ký & ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold text-stone-800">........................</p>
            </div>
            <div>
              <p className="font-bold text-stone-900 uppercase">Đại Diện Bên Nhận</p>
              <p className="text-[10px] text-stone-500 italic">(Ký & ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold text-stone-800">{data.receiver || '........................'}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
