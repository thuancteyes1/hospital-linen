import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Plus, Trash, ClipboardList } from 'lucide-react';
import { LinenItem, HistoryItem } from '../../types';

interface FormLine {
  ma: string;
  qty: number;
}

interface TransactionFormProps {
  items: LinenItem[];
  detailAllocations: Record<string, [string, number][]>;
  currentAccount: any;
  departments: string[];
  currentUserRecord: any;
  userPermissions: any;
  hasAnyCreatePerm: boolean;
  history: HistoryItem[];
  
  // Lifted form states
  editingTxId: string | null;
  setEditingTxId: (id: string | null) => void;
  txType: 'nhap' | 'thuhoi' | 'xuat' | 'huy' | 'dc' | '';
  setTxType: (type: 'nhap' | 'thuhoi' | 'xuat' | 'huy' | 'dc' | '') => void;
  txDate: string;
  setTxDate: (date: string) => void;
  operator: string;
  setOperator: (op: string) => void;
  fromDept: string;
  setFromDept: (dept: string) => void;
  toDept: string;
  setToDept: (dept: string) => void;
  supplier: string;
  setSupplier: (sup: string) => void;
  note: string;
  setNote: (note: string) => void;
  formLines: FormLine[];
  setFormLines: (lines: FormLine[]) => void;
  onSubmitTransaction: (tx: any) => void;
  onUpdateTransaction?: (id: string, tx: any) => void;
}

export default function TransactionForm({
  items,
  detailAllocations,
  currentAccount,
  departments,
  currentUserRecord,
  userPermissions,
  hasAnyCreatePerm,
  history,
  editingTxId,
  setEditingTxId,
  txType,
  setTxType,
  txDate,
  setTxDate,
  operator,
  setOperator,
  fromDept,
  setFromDept,
  toDept,
  setToDept,
  supplier,
  setSupplier,
  note,
  setNote,
  formLines,
  setFormLines,
  onSubmitTransaction,
  onUpdateTransaction
}: TransactionFormProps) {
  const [submitError, setSubmitError] = useState('');

  const userDeptMatch = useMemo(() => {
    const raw = currentUserRecord?.dept || currentAccount?.dept || '';
    if (!raw || raw === 'Tất cả' || raw === 'Tất cả (Không giới hạn)' || raw === 'Kho trung tâm') return '';
    const rawLower = raw.trim().toLowerCase();
    const found = departments.find(d => d.toLowerCase() === rawLower || d.toLowerCase().includes(rawLower) || rawLower.includes(d.toLowerCase()));
    return found || raw;
  }, [currentUserRecord, currentAccount, departments]);

  const isRestricted = useMemo(() => {
    if (userDeptMatch) return true;
    if (!currentUserRecord) return false;
    const dept = currentUserRecord.dept;
    return dept && dept !== 'Tất cả' && dept !== 'Tất cả (Không giới hạn)' && dept !== 'Kho trung tâm';
  }, [currentUserRecord, userDeptMatch]);

  // 1) Helper: Live Stock lookup for any item at selected source location
  const getLiveStock = (ma: string): { label: string; qty: number } => {
    const item = items.find(i => i.ma === ma);
    if (!item) return { label: 'Tồn kho', qty: 0 };

    let baseQty = 0;
    if (txType === 'nhap' || txType === 'huy' || txType === 'xuat') {
      baseQty = item.kc;
    } else if (txType === 'thuhoi' || txType === 'dc') {
      const depts = detailAllocations[ma] || [];
      const dRecord = depts.find(d => d[0] === fromDept);
      baseQty = dRecord ? dRecord[1] : 0;
    } else {
      baseQty = item.kc;
    }

    if (editingTxId) {
      const origTx = history.find(h => h.id === editingTxId);
      if (origTx && origTx.movementApplied) {
        const origItem = origTx.items.find(i => i.ma === ma);
        if (origItem) {
          const qty = origItem.qty;
          if (origTx.type === 'nhap' && (txType === 'nhap' || txType === 'huy' || txType === 'xuat')) {
            baseQty = Math.max(0, baseQty - qty);
          } else if (origTx.type === 'huy' && (txType === 'nhap' || txType === 'huy' || txType === 'xuat')) {
            baseQty += qty;
          } else if (origTx.type === 'thuhoi') {
            if (txType === 'nhap' || txType === 'huy' || txType === 'xuat') {
              baseQty = Math.max(0, baseQty - qty);
            } else if ((txType === 'thuhoi' || txType === 'dc') && fromDept === origTx.from) {
              baseQty += qty;
            }
          } else if (origTx.type === 'dc') {
            if (txType === 'thuhoi' || txType === 'dc') {
              if (fromDept === origTx.from) {
                baseQty += qty;
              }
              if (fromDept === origTx.to) {
                baseQty = Math.max(0, baseQty - qty);
              }
            }
          } else if (origTx.type === 'xuat') {
            if (txType === 'nhap' || txType === 'huy' || txType === 'xuat') {
              baseQty += qty;
            } else if ((txType === 'thuhoi' || txType === 'dc') && fromDept === origTx.to) {
              baseQty = Math.max(0, baseQty - qty);
            }
          }
        }
      }
    }

    let label = 'Tồn kho';
    if (txType === 'nhap' || txType === 'huy' || txType === 'xuat') {
      label = 'Tồn Kho chính';
    } else if (txType === 'thuhoi') {
      label = `Tồn tại ${fromDept || 'Khoa'}`;
    } else if (txType === 'dc') {
      label = `Tồn tại ${fromDept || 'Khoa nguồn'}`;
    }

    return { label, qty: baseQty };
  };

  const addLine = () => {
    setFormLines([...formLines, { ma: '', qty: 1 }]);
  };

  const removeLine = (idx: number) => {
    if (formLines.length > 1) {
      setFormLines(formLines.filter((_, i) => i !== idx));
    } else {
      setFormLines([{ ma: '', qty: 1 }]);
    }
  };

  const updateLine = (idx: number, field: keyof FormLine, value: any) => {
    const next = [...formLines];
    if (field === 'qty') {
      next[idx].qty = Math.max(1, parseInt(value) || 1);
    } else {
      next[idx].ma = value;
    }
    setFormLines(next);
  };

  const duplicateCode = useMemo(() => {
    const codes = formLines.map(l => l.ma).filter(Boolean);
    const seen = new Set();
    for (const c of codes) {
      if (seen.has(c)) return c;
      seen.add(c);
    }
    return '';
  }, [formLines]);

  const txConfig = useMemo(() => {
    switch (txType) {
      case 'nhap':
        return { label: 'Nhập mua', showFrom: false, showTo: false, showSupplier: true, badge: 'bg-[#D1FAE5] text-[#065F46]' };
      case 'thuhoi':
        return { label: 'Thu hồi từ khoa', showFrom: true, showTo: false, showSupplier: false, badge: 'bg-[#DBEAFE] text-[#1E40AF]' };
      case 'xuat':
        return { label: 'Xuất cho khoa', showFrom: false, showTo: true, showSupplier: false, badge: 'bg-[#FEF3C7] text-[#92400E]' };
      case 'huy':
        return { label: 'Xuất hủy', showFrom: false, showTo: false, showSupplier: true, badge: 'bg-[#FEE2E2] text-[#991B1B]' };
      case 'dc':
        return { label: 'Điều chuyển Khoa → Khoa', showFrom: true, showTo: true, showSupplier: false, badge: 'bg-[#E5E7EB] text-[#374151]' };
      default:
        return { label: 'Chọn nghiệp vụ', showFrom: false, showTo: false, showSupplier: false, badge: '' };
    }
  }, [txType]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!txType) {
      setSubmitError('Vui lòng chọn loại nghiệp vụ để bắt đầu.');
      return;
    }
    if (txType && !userPermissions[txType]) {
      setSubmitError('Tài khoản của bạn không được phân quyền thực hiện nghiệp vụ này.');
      return;
    }
    if (txConfig.showFrom && !fromDept) {
      setSubmitError('Vui lòng chọn khoa/phòng nguồn.');
      return;
    }
    if (txConfig.showTo && !toDept) {
      setSubmitError('Vui lòng chọn khoa/phòng đích nhận.');
      return;
    }
    if (txConfig.showFrom && txConfig.showTo && fromDept === toDept) {
      setSubmitError('Khoa nguồn và khoa nhận hàng không được trùng nhau.');
      return;
    }

    const validLines = formLines.filter(l => l.ma && l.qty > 0);
    if (validLines.length === 0) {
      setSubmitError('Vui lòng chọn ít nhất một mặt hàng đồ vải với số lượng lớn hơn 0.');
      return;
    }

    if (duplicateCode) {
      const duplicateItem = items.find(i => i.ma === duplicateCode);
      setSubmitError(`Mặt hàng "${duplicateItem?.ten || duplicateCode}" bị chọn trùng. Vui lòng gộp hoặc thay đổi dòng.`);
      return;
    }

    for (const line of validLines) {
      const stock = getLiveStock(line.ma);
      if ((txType === 'xuat' || txType === 'huy') && stock.qty < line.qty) {
        const item = items.find(i => i.ma === line.ma);
        setSubmitError(`Mặt hàng "${item?.ten}" chỉ còn tồn ${stock.qty} cái trong Kho chính. Không đủ để thực hiện xuất ${line.qty} cái.`);
        return;
      }
      if ((txType === 'thuhoi' || txType === 'dc') && stock.qty < line.qty) {
        const item = items.find(i => i.ma === line.ma);
        setSubmitError(`Khoa "${fromDept}" chỉ có ${stock.qty} cái "${item?.ten}". Không đủ để thực hiện giao dịch ${line.qty} cái.`);
        return;
      }
    }

    if (editingTxId && onUpdateTransaction) {
      onUpdateTransaction(editingTxId, {
        type: txType as any,
        date: txDate,
        user: operator || 'Người thực hiện',
        note: note.trim(),
        fromDept: txConfig.showFrom ? fromDept : 'Kho chính',
        toDept: txConfig.showTo ? toDept : 'Kho chính',
        items: validLines,
        supplier: txConfig.showSupplier ? supplier : undefined
      });
      setEditingTxId(null);
    } else {
      onSubmitTransaction({
        type: txType as any,
        date: txDate,
        user: operator || 'Người thực hiện',
        note: note.trim(),
        fromDept: txConfig.showFrom ? fromDept : 'Kho chính',
        toDept: txConfig.showTo ? toDept : 'Kho chính',
        items: validLines,
        supplier: txConfig.showSupplier ? supplier : undefined
      });
    }

    // Reset Form
    setTxType('');
    setFromDept('');
    setToDept('');
    setSupplier('');
    setNote('');
    setFormLines([{ ma: '', qty: 1 }]);
  };

  if (!hasAnyCreatePerm) {
    return (
      <div className="py-12 px-6 text-center bg-[#EBE8E3]/60 border border-[#1A1A1A]/20 rounded-xl my-4">
        <div className="w-12 h-12 bg-amber-100 text-amber-800 border border-amber-300 rounded-full flex items-center justify-center mx-auto mb-3.5 shadow-sm text-xl">
          🔒
        </div>
        <h4 className="font-serif font-bold text-base text-[#1A1A1A] mb-1.5">
          Không Có Quyền Tạo Phiếu Kho
        </h4>
        <p className="text-xs text-[#555] max-w-md mx-auto leading-relaxed">
          Tài khoản Hộ lý hoặc vai trò hiện tại của bạn không được phân quyền tạo phiếu xuất, nhập, thu hồi hay điều chuyển kho đồ vải. Bạn chỉ có quyền thực hiện giao nhận đồ dơ và nhận đồ sạch tại phân hệ <strong>Phiếu Giao/Nhận</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[#1A1A1A] p-1 bg-[#F5F2ED]">
      <div className="border border-[#1A1A1A] p-5">
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="text-[#C4432A]" size={20} />
            <h3 className="font-serif font-black text-lg text-[#1A1A1A]">
              {editingTxId ? `Sửa Phiếu Nghiệp Vụ: ${editingTxId}` : 'Tạo Phiếu Nhập / Xuất Kho'}
            </h3>
          </div>
          {txType && (
            <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 ${txConfig.badge}`}>
              {txConfig.label}
            </span>
          )}
        </div>

        {submitError && (
          <div className="mb-4 p-3 border border-[#C4432A] bg-[#FDF2F0] text-xs text-[#C4432A] font-semibold">
            {submitError}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                Loại nghiệp vụ <span className="text-[#C4432A]">*</span>
              </label>
              <select
                value={txType}
                onChange={e => {
                  setTxType(e.target.value as any);
                  setFromDept('');
                  setToDept('');
                  setSupplier('');
                  setSubmitError('');
                }}
                className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
              >
                <option value="">-- Chọn loại nghiệp vụ --</option>
                {userPermissions.nhap && <option value="nhap">Nhập mua (Hàng mới về Kho chính)</option>}
                {userPermissions.thuhoi && <option value="thuhoi">Thu hồi (Khoa trả về Kho chính)</option>}
                {userPermissions.xuat && <option value="xuat">Xuất cho khoa (Xuất từ Kho chính đi)</option>}
                {userPermissions.huy && <option value="huy">Xuất hủy (Hủy rách hỏng từ Kho chính)</option>}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Ngày nghiệp vụ</label>
              <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {txConfig.showFrom && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Khoa/Phòng nguồn <span className="text-[#C4432A]">*</span></label>
                <select
                  value={fromDept}
                  onChange={e => setFromDept(e.target.value)}
                  disabled={isRestricted && !!userDeptMatch}
                  className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none disabled:opacity-80 disabled:bg-[#E0DDD7] font-semibold"
                >
                  {(!isRestricted || !userDeptMatch) && <option value="">-- Chọn khoa phòng nguồn --</option>}
                  {(isRestricted && userDeptMatch ? [userDeptMatch] : departments.filter(d => d !== 'Kho trung tâm')).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {txConfig.showTo && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Khoa/Phòng đích nhận <span className="text-[#C4432A]">*</span></label>
                <select
                  value={toDept}
                  onChange={e => setToDept(e.target.value)}
                  disabled={isRestricted && !!userDeptMatch}
                  className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none disabled:opacity-80 disabled:bg-[#E0DDD7] font-semibold"
                >
                  {(!isRestricted || !userDeptMatch) && <option value="">-- Chọn khoa phòng nhận --</option>}
                  {(isRestricted && userDeptMatch ? [userDeptMatch] : departments.filter(d => d !== 'Kho trung tâm')).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {txConfig.showSupplier && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Nhà cung cấp / Đơn vị tiếp nhận <span className="text-[#C4432A]">*</span></label>
                <input type="text" placeholder="Tên đối tác bên ngoài" value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none" />
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Người thực hiện</label>
              <input type="text" disabled value={operator} className="w-full bg-[#EBE8E3]/50 border border-stone-300 p-2 text-xs focus:outline-none text-stone-500 font-bold" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">Ghi chú chi tiết</label>
            <input type="text" placeholder="Lý do nhập, xuất hoặc ghi chú đi kèm..." value={note} onChange={e => setNote(e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none" />
          </div>

          <div className="pt-4 border-t border-dashed border-[#1A1A1A] mt-4 space-y-3">
            <h4 className="text-[10px] uppercase tracking-widest font-black text-[#1A1A1A] flex items-center justify-between">
              <span>Danh sách vật tư đồ vải</span>
              <button type="button" onClick={addLine} className="text-[#C4432A] hover:underline flex items-center gap-1 font-bold">
                <Plus size={11} /> Thêm mặt hàng
              </button>
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {formLines.map((line, idx) => {
                const stockInfo = line.ma ? getLiveStock(line.ma) : { label: 'Tồn kho', qty: 0 };

                let availableItems = items;
                if (txType === 'thuhoi' || txType === 'dc') {
                  if (!fromDept) {
                    availableItems = [];
                  } else {
                    availableItems = items.filter(i => {
                      const s = getLiveStock(i.ma);
                      return s.qty > 0 || i.ma === line.ma;
                    });
                  }
                }

                return (
                  <div key={idx} className="flex gap-2 items-end bg-[#EBE8E3]/30 p-2 border border-[#1A1A1A]/10 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-[8px] uppercase tracking-wider text-[#8C8984] mb-0.5">Sản phẩm đồ vải</label>
                      <select value={line.ma} onChange={e => updateLine(idx, 'ma', e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-1.5 text-xs focus:outline-none">
                        {!fromDept && (txType === 'thuhoi' || txType === 'dc') ? (
                          <option value="">-- Vui lòng chọn khoa giao trước --</option>
                        ) : (txType === 'thuhoi' || txType === 'dc') && availableItems.length === 0 ? (
                          <option value="">-- Khoa này hiện không có đồ vải tồn kho --</option>
                        ) : (
                          <option value="">-- Chọn mặt hàng --</option>
                        )}
                        {availableItems.map(it => {
                          const itemStock = (txType === 'thuhoi' || txType === 'dc') && fromDept ? getLiveStock(it.ma).qty : null;
                          return (
                            <option key={it.ma} value={it.ma}>[{it.ma}] {it.ten} {itemStock !== null ? `- Tồn: ${itemStock}` : ''}</option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="w-24">
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-[8px] uppercase tracking-wider text-[#8C8984]">S.Lượng</label>
                        {line.ma && (
                          <span className="text-[8px] font-mono font-bold text-blue-700 truncate max-w-[50px]" title={`${stockInfo.label}: ${stockInfo.qty}`}>
                            ({stockInfo.qty})
                          </span>
                        )}
                      </div>
                      <input type="number" min="1" value={line.qty} onChange={e => updateLine(idx, 'qty', e.target.value)} className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-1 text-xs focus:outline-none text-center font-mono font-bold" />
                    </div>

                    <button type="button" onClick={() => removeLine(idx)} className="p-1.5 text-[#C4432A] hover:bg-red-50 hover:text-red-700 transition-colors border border-transparent rounded cursor-pointer" title="Xóa dòng">
                      <Trash size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-[#1A1A1A]">
            {editingTxId && (
              <button type="button" onClick={() => {
                setEditingTxId(null);
                setTxType('');
                setFromDept('');
                setToDept('');
                setSupplier('');
                setNote('');
                setFormLines([{ ma: '', qty: 1 }]);
              }} className="px-4 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase hover:bg-[#EBE8E3] cursor-pointer">Hủy Sửa</button>
            )}
            <button type="submit" className="px-5 py-2.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase hover:bg-[#C4432A] hover:border-[#C4432A] border border-[#1A1A1A] transition-colors cursor-pointer font-bold">
              {editingTxId ? 'Lưu cập nhật' : 'Xác nhận tạo phiếu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
