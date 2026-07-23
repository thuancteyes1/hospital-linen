/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MapPin } from 'lucide-react';
import { LinenItem } from '../../types';

interface AllocationPopupProps {
  allocationModal: { ma: string; ten: string } | null;
  onClose: () => void;
  items: LinenItem[];
  detailAllocations: Record<string, [string, number][]>;
}

export default function AllocationPopup({
  allocationModal,
  onClose,
  items,
  detailAllocations
}: AllocationPopupProps) {
  if (!allocationModal) return null;

  const currentItem = items.find(i => i.ma === allocationModal.ma);
  const mainStoreQty = currentItem?.kc ?? 0;
  const allocations = detailAllocations[allocationModal.ma] || [];
  const allocatedQty = allocations.reduce((sum, r) => sum + r[1], 0);
  const totalQty = mainStoreQty + allocatedQty;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md border border-[#1A1A1A] bg-[#F5F2ED] p-1 fade-in">
        <div className="border border-[#1A1A1A] p-5 space-y-4">
          
          <div className="flex justify-between items-start pb-2 border-b border-[#1A1A1A]">
            <div>
              <h3 className="font-serif font-black text-lg text-[#1A1A1A]">{allocationModal.ten}</h3>
              <p className="text-[10px] text-[#8C8984] font-mono">Mã: {allocationModal.ma}</p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-900 text-lg font-bold"
            >
              &times;
            </button>
          </div>

          {/* Locations allocations list */}
          <div className="max-h-64 overflow-y-auto space-y-1 divide-y divide-[#1A1A1A]/10 pr-1">
            {/* Main Store Line */}
            <div className="py-2.5 flex justify-between items-center text-xs bg-[#EBE8E3] px-2 font-mono">
              <span className="font-bold text-[#1A1A1A]">🏢 Kho trung tâm chính</span>
              <span className="font-bold text-[#2563EB]">
                {mainStoreQty.toLocaleString()} cái
              </span>
            </div>

            {/* Ward allocations lines */}
            {allocations.length === 0 ? (
              <div className="py-4 text-center text-stone-400 text-xs italic font-serif">
                Chưa phân bổ bất kỳ cái nào tới các khoa phòng buồng bệnh.
              </div>
            ) : (
              allocations.map(([dept, qty]) => (
                <div key={dept} className="py-2 px-2 flex justify-between items-center text-xs hover:bg-[#EBE8E3]">
                  <span className="text-stone-700 flex items-center gap-1">
                    <MapPin size={10} className="text-[#8C8984]" />
                    {dept}
                  </span>
                  <span className="font-mono font-bold text-stone-900">{qty.toLocaleString()} cái</span>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-[#1A1A1A] border-dashed flex justify-between items-center text-[10px] font-mono text-[#8C8984]">
            <span>Tổng viện: {totalQty.toLocaleString()} cái</span>
            <button
              onClick={onClose}
              className="px-3 py-1 border border-[#1A1A1A] hover:bg-[#EBE8E3] text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]"
            >
              Đóng
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
