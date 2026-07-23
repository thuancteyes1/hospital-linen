/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Edit, Trash, AlertTriangle, Check, X, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

interface DepartmentManagementProps {
  departments: string[];
  detailAllocations?: Record<string, [string, number][]>;
  onUpdateDepartments?: (newDepts: string[], renameMapping?: { oldName: string; newName: string }, deletedName?: string) => void;
}

export default function DepartmentManagement({
  departments,
  detailAllocations = {},
  onUpdateDepartments
}: DepartmentManagementProps) {
  // Department Management local states
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptIdx, setEditingDeptIdx] = useState<number | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const [showDelDeptModal, setShowDelDeptModal] = useState<number | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const moveDept = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= departments.length || fromIndex === toIndex) return;
    const updated = [...departments];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    if (onUpdateDepartments) {
      onUpdateDepartments(updated);
    }
  };

  const getDeptStockQty = (deptName: string) => {
    if (!detailAllocations) return 0;
    let total = 0;
    Object.values(detailAllocations).forEach(allocs => {
      allocs.forEach(([dName, qty]) => {
        if (dName === deptName) {
          total += qty;
        }
      });
    });
    return total;
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#1A1A1A] pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#8C8984]">DANH MỤC THIẾT LẬP</span>
          <h2 className="font-serif font-black italic text-2xl tracking-tight mt-1 text-[#1A1A1A]">Quản Lý Khoa Phòng Lâm Sàng</h2>
          <p className="text-xs text-[#8C8984] mt-1">
            Khai báo danh sách các khoa phòng nhận cấp phát đồ vải và điều chuyển vật tư.
          </p>
        </div>
      </div>

      {/* Form thêm khoa phòng */}
      <div className="border border-[#1A1A1A] bg-[#EBE8E3] p-4">
        <h3 className="font-serif font-bold text-sm text-[#1A1A1A] mb-2 uppercase tracking-wide">Thêm Khoa Phòng Mới</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const nameTrimmed = newDeptName.trim();
            if (!nameTrimmed) return;
            if (departments.some(d => d.toLowerCase() === nameTrimmed.toLowerCase())) {
              alert('Khoa phòng này đã tồn tại trên hệ thống!');
              return;
            }
            const updated = [...departments, nameTrimmed];
            if (onUpdateDepartments) {
              onUpdateDepartments(updated);
            }
            setNewDeptName('');
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            required
            placeholder="Nhập tên khoa phòng mới (VD: Khoa Ngoại Tổng Hợp)..."
            value={newDeptName}
            onChange={e => setNewDeptName(e.target.value)}
            className="flex-1 bg-white border border-[#1A1A1A] p-2 text-xs focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-bold uppercase tracking-wider hover:bg-[#C4432A] hover:border-[#C4432A] transition-colors flex items-center justify-center gap-1.5 border border-[#1A1A1A]"
          >
            <Plus size={14} />
            Thêm khoa phòng
          </button>
        </form>
      </div>

      {/* Table danh sách khoa phòng */}
      <div className="border border-[#1A1A1A] overflow-x-auto">
        <div className="px-4 py-2 bg-[#F5F2ED] border-b border-[#1A1A1A] text-[11px] text-[#555] flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <GripVertical size={14} className="text-slate-500" />
            Mẹo: Kéo thả biểu tượng <strong>⠿</strong> hoặc dùng các nút mũi tên <strong>⬆ ⬇</strong> để sắp xếp thứ tự hiển thị của các khoa phòng.
          </span>
          <span className="font-mono text-[10px] text-slate-500">Tổng số: {departments.length} khoa</span>
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#EBE8E3] border-b border-[#1A1A1A] font-mono text-[9px] uppercase tracking-widest">
              <th className="py-3 px-2 w-10 border-r border-[#1A1A1A] text-center"></th>
              <th className="py-3 px-3 w-14 border-r border-[#1A1A1A] text-center">STT</th>
              <th className="py-3 px-4 border-r border-[#1A1A1A]">Tên Khoa Phòng Lâm Sàng</th>
              <th className="py-3 px-4 text-center w-64">Thao tác & Thứ tự</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]">
            {departments.map((d, idx) => {
              const isEditing = editingDeptIdx === idx;
              const isDragging = draggedIdx === idx;
              const isDragOver = dragOverIdx === idx;

              return (
                <tr
                  key={`${d}-${idx}`}
                  draggable={!isEditing}
                  onDragStart={(e) => {
                    setDraggedIdx(idx);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIdx !== idx) {
                      setDragOverIdx(idx);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverIdx === idx) setDragOverIdx(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedIdx !== null && draggedIdx !== idx) {
                      moveDept(draggedIdx, idx);
                    }
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  className={`transition-colors ${
                    isDragging
                      ? 'opacity-30 bg-blue-100'
                      : isDragOver
                      ? 'bg-blue-100/70 border-t-2 border-[#16A34A]'
                      : 'hover:bg-[#EBE8E3]/50 bg-white'
                  }`}
                >
                  <td className="py-3 px-2 border-r border-[#1A1A1A] text-center select-none">
                    <span
                      className="inline-flex p-1 rounded hover:bg-slate-200 cursor-grab active:cursor-grabbing text-slate-400 hover:text-[#1A1A1A]"
                      title="Kéo thả để di chuyển vị trí"
                    >
                      <GripVertical size={16} />
                    </span>
                  </td>
                  <td className="py-3 px-3 border-r border-[#1A1A1A] text-center font-mono text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 border-r border-[#1A1A1A]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingDeptName}
                        onChange={e => setEditingDeptName(e.target.value)}
                        className="w-full bg-white border border-[#1A1A1A] px-2 py-1 text-xs focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="font-semibold text-[#1A1A1A]">{d}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isEditing ? (
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => {
                            const nameTrimmed = editingDeptName.trim();
                            if (!nameTrimmed) return;
                            if (nameTrimmed === d) {
                              setEditingDeptIdx(null);
                              return;
                            }
                            if (departments.some((other, oi) => oi !== idx && other.toLowerCase() === nameTrimmed.toLowerCase())) {
                              alert('Tên khoa phòng này đã được sử dụng!');
                              return;
                            }
                            const updated = [...departments];
                            updated[idx] = nameTrimmed;
                            if (onUpdateDepartments) {
                              onUpdateDepartments(updated, { oldName: d, newName: nameTrimmed });
                            }
                            setEditingDeptIdx(null);
                          }}
                          className="px-2 py-1 bg-[#16A34A] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-[#15803d] flex items-center gap-1"
                        >
                          <Check size={12} />
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditingDeptIdx(null)}
                          className="px-2 py-1 border border-[#1A1A1A] text-[#1A1A1A] text-[10px] font-bold uppercase tracking-wider hover:bg-[#EBE8E3] flex items-center gap-1"
                        >
                          <X size={12} />
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center gap-1.5">
                        {/* Up/Down ordering buttons */}
                        <div className="flex border border-[#1A1A1A] divide-x divide-[#1A1A1A] mr-2">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveDept(idx, idx - 1)}
                            className="p-1 hover:bg-[#EBE8E3] disabled:opacity-30 disabled:hover:bg-transparent text-[#1A1A1A]"
                            title="Lên trên"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === departments.length - 1}
                            onClick={() => moveDept(idx, idx + 1)}
                            className="p-1 hover:bg-[#EBE8E3] disabled:opacity-30 disabled:hover:bg-transparent text-[#1A1A1A]"
                            title="Xuống dưới"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setEditingDeptIdx(idx);
                            setEditingDeptName(d);
                          }}
                          className="px-2.5 py-1 border border-[#1A1A1A] hover:bg-[#EBE8E3] text-[#1A1A1A] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                          <Edit size={12} />
                          Sửa
                        </button>
                        <button
                          onClick={() => {
                            setShowDelDeptModal(idx);
                          }}
                          className="px-2.5 py-1 border border-[#C4432A] text-[#C4432A] hover:bg-[#FDF2F0] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                          <Trash size={12} />
                          Xóa
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialog: Delete Department Modal */}
      {showDelDeptModal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md border border-[#1A1A1A] bg-[#F5F2ED] p-1 fade-in">
            <div className="border border-[#1A1A1A] p-5">
              <div className="text-center mb-4">
                <AlertTriangle size={32} className="text-[#C4432A] mx-auto mb-2" />
                <h3 className="font-serif font-black text-lg text-[#1A1A1A]">Xóa Khoa Phòng</h3>
                <p className="text-xs text-[#8C8984] mt-1">Dọn dẹp danh mục thiết lập hệ thống.</p>
              </div>

              <div className="space-y-3 mb-5">
                <div className="text-xs text-[#1A1A1A] font-medium">
                  Khoa phòng chuẩn bị xóa: <span className="font-black text-[#C4432A] text-sm">{departments[showDelDeptModal]}</span>
                </div>

                {(() => {
                  const stockQty = getDeptStockQty(departments[showDelDeptModal]);
                  return stockQty > 0 ? (
                    <div className="p-3.5 bg-[#FDF2F0] border border-[#C4432A] text-xs text-[#C4432A] space-y-2">
                      <p className="font-bold uppercase tracking-wider text-[10px]">Cảnh báo tồn kho cực kỳ quan trọng:</p>
                      <p>
                        Khoa phòng này hiện đang ghi nhận <span className="font-black text-sm underline">{stockQty.toLocaleString()}</span> sản phẩm/đồ vải đang phân bổ sử dụng (tồn tại khoa phòng).
                      </p>
                      <p className="font-semibold text-[#1A1A1A]">
                        Nếu bạn tiếp tục xóa:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[#1A1A1A]">
                        <li>Toàn bộ số lượng tồn kho này sẽ bị dọn dẹp (về 0).</li>
                        <li>Tài khoản các nhân viên thuộc khoa phòng này sẽ chuyển sang trạng thái <strong>Chưa gán khoa phòng</strong>.</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#F5F2ED] border border-[#1A1A1A]/20 text-xs text-[#8C8984] space-y-2">
                      <p className="font-bold text-[#1A1A1A]">Thông tin kiểm kê:</p>
                      <p>Khoa phòng này hiện không có đồ vải tồn kho lâm sàng.</p>
                      <p>Các tài khoản nhân viên thuộc khoa phòng này sẽ được chuyển sang trạng thái <strong>Chưa gán khoa phòng</strong>.</p>
                    </div>
                  );
                })()}

                <div className="text-[10px] text-slate-500 italic">
                  * Hành động này không thể hoàn tác sau khi đã bấm xác nhận.
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDelDeptModal(null)}
                  className="flex-1 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    const idx = showDelDeptModal;
                    const d = departments[idx];
                    const updated = departments.filter((_, oi) => oi !== idx);
                    if (onUpdateDepartments) {
                      onUpdateDepartments(updated, undefined, d);
                    }
                    setShowDelDeptModal(null);
                  }}
                  className="flex-1 py-2 bg-[#C4432A] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#A9341F]"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
