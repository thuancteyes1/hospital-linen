/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Role, User } from '../../types';
import { Plus, Edit, Trash, AlertTriangle, Check, X } from 'lucide-react';

export const PERMS_CFG = [
  { key: 'nhap', label: 'Nhập mua' },
  { key: 'thuhoi', label: 'Thu hồi từ khoa' },
  { key: 'xuat', label: 'Xuất cho khoa' },
  { key: 'huy', label: 'Xuất hủy' },
  { key: 'dovai', label: 'Xử lý đồ vải' }
] as const;

interface RoleManagementProps {
  roles: Role[];
  users: User[];
  onUpdateRoles: (updatedRoles: Role[], updatedUsers?: User[]) => void;
}

export default function RoleManagement({
  roles,
  users,
  onUpdateRoles
}: RoleManagementProps) {
  // Local Modal and form states
  const [showRoleModal, setShowRoleModal] = useState<number | null | 'add'>(null);
  const [showDelRoleModal, setShowDelRoleModal] = useState<number | null>(null);

  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#1d5fb8');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePerms, setRolePerms] = useState<Role['perms']>({
    nhap: false,
    thuhoi: false,
    xuat: false,
    huy: false,
    dc: false,
    dovai: false
  });

  const handleTogglePerm = (roleIdx: number, permKey: keyof Role['perms']) => {
    const next = [...roles];
    const currentVal = next[roleIdx].perms[permKey] ?? false;
    next[roleIdx].perms[permKey] = !currentVal;
    onUpdateRoles(next);
  };

  const handleOpenEditRole = (idx: number) => {
    const r = roles[idx];
    setRoleName(r.name);
    setRoleColor(r.color);
    setRoleDesc(r.desc);
    setRolePerms({
      nhap: false,
      thuhoi: false,
      xuat: false,
      huy: false,
      dc: false,
      dovai: false,
      ...r.perms
    });
    setShowRoleModal(idx);
  };

  const handleOpenAddRole = () => {
    setRoleName('');
    setRoleColor('#1d5fb8');
    setRoleDesc('');
    setRolePerms({
      nhap: false,
      thuhoi: false,
      xuat: false,
      huy: false,
      dc: false,
      dovai: false
    });
    setShowRoleModal('add');
  };

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    const next = [...roles];
    const newRoleObj: Role = {
      name: roleName.trim(),
      color: roleColor,
      desc: roleDesc.trim(),
      perms: rolePerms
    };

    if (showRoleModal === 'add') {
      next.push(newRoleObj);
    } else if (typeof showRoleModal === 'number') {
      next[showRoleModal] = newRoleObj;
    }

    onUpdateRoles(next);
    setShowRoleModal(null);
  };

  const handleDeleteRoleConfirm = () => {
    if (typeof showDelRoleModal === 'number') {
      const ri = showDelRoleModal;
      if (roles.length <= 1) {
        setShowDelRoleModal(null);
        return;
      }
      const nextRoles = roles.filter((_, i) => i !== ri);
      const fallbackRole = Math.min(nextRoles.length - 1, Math.max(0, ri - 1));

      const nextUsers = users.map(u => {
        if (u.role === ri) {
          return { ...u, role: fallbackRole };
        } else if (u.role > ri) {
          return { ...u, role: u.role - 1 };
        }
        return u;
      });

      onUpdateRoles(nextRoles, nextUsers);
      setShowDelRoleModal(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#1A1A1A] pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#8C8984]">CHÍNH SÁCH BẢO MẬT & PHÂN QUYỀN</span>
          <h2 className="font-serif font-black italic text-2xl tracking-tight mt-1 text-[#1A1A1A]">Quản Lý Vai Trò & Phân Quyền</h2>
          <p className="text-xs text-[#8C8984] mt-1">
            Tích hợp ma trận phân quyền. Tích trực tiếp vào ô để thay đổi đặc quyền ngay lập tức.
          </p>
        </div>
        <button
          onClick={handleOpenAddRole}
          className="flex items-center justify-center gap-1 px-4 py-2 border border-[#1A1A1A] bg-[#1A1A1A] text-[11px] font-bold uppercase tracking-widest text-[#F5F2ED] hover:bg-[#C4432A] hover:border-[#C4432A] transition-colors"
        >
          <Plus size={14} />
          Thêm Vai Trò
        </button>
      </div>

      {/* Matrix table representation */}
      <div className="border border-[#1A1A1A] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#EBE8E3] border-b border-[#1A1A1A] font-mono text-[9px] uppercase tracking-widest">
              <th className="py-3 px-4 w-60 border-r border-[#1A1A1A]">Vai trò người dùng</th>
              {PERMS_CFG.map(p => (
                <th key={p.key} className="py-3 px-4 text-center border-r border-[#1A1A1A]">
                  {p.label}
                </th>
              ))}
              <th className="py-3 px-4 text-center w-36">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]">
            {roles.map((r, ri) => (
              <tr key={r.name} className="hover:bg-[#EBE8E3] transition-colors">
                <td className="py-3 px-4 font-semibold text-[#1A1A1A] border-r border-[#1A1A1A]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: r.color }} />
                    <div>
                      <div className="font-bold text-xs">{r.name}</div>
                      <div className="text-[10px] text-[#8C8984] font-normal leading-tight mt-0.5">{r.desc}</div>
                    </div>
                  </div>
                </td>

                {PERMS_CFG.map(p => {
                  const hasPerm = r.perms[p.key];
                  return (
                    <td key={p.key} className="py-3 px-4 text-center border-r border-[#1A1A1A]">
                      <button
                        onClick={() => handleTogglePerm(ri, p.key)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition-all border ${
                          hasPerm ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]' : 'bg-[#EBE8E3] text-[#8C8984] border-transparent hover:border-[#1A1A1A] hover:text-[#1A1A1A]'
                        }`}
                      >
                        {hasPerm ? 'Có Quyền' : 'Chặn'}
                      </button>
                    </td>
                  );
                })}

                <td className="py-3 px-4 text-center">
                  <div className="inline-flex gap-1.5 justify-center">
                    <button
                      onClick={() => handleOpenEditRole(ri)}
                      className="p-1 text-[#2563EB] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-colors"
                      title="Sửa cấu hình"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => setShowDelRoleModal(ri)}
                      className="p-1 text-[#C4432A] hover:bg-[#C4432A] hover:text-[#F5F2ED] transition-colors"
                      title="Xóa vai trò"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog: Add/Edit Role Modal */}
      {showRoleModal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md border border-[#1A1A1A] bg-[#F5F2ED] p-1 fade-in">
            <div className="border border-[#1A1A1A] p-5">
              
              <div className="flex justify-between items-start mb-4 pb-2 border-b border-[#1A1A1A]">
                <div>
                  <h3 className="font-serif font-black text-lg text-[#1A1A1A]">
                    {showRoleModal === 'add' ? 'Thêm Vai Trò Mới' : 'Sửa Thông Tin Vai Trò'}
                  </h3>
                  <p className="text-[11px] text-[#8C8984]">Điều chỉnh đặc quyền trong ma trận hệ thống</p>
                </div>
                <button onClick={() => setShowRoleModal(null)} className="text-[#8C8984] hover:text-[#1A1A1A] text-lg font-bold">
                  &times;
                </button>
              </div>

              <form onSubmit={handleRoleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Tên vai trò <span className="text-[#C4432A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Điều dưỡng trưởng"
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Mã màu nhận diện
                  </label>
                  <input
                    type="color"
                    value={roleColor}
                    onChange={e => setRoleColor(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-1.5 h-10 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Mô tả chức năng vai trò
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Trực tiếp điều phối và xác nhận sạch..."
                    value={roleDesc}
                    onChange={e => setRoleDesc(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <span className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-2">
                    Cấu hình đặc quyền mặc định:
                  </span>
                  <div className="space-y-1.5">
                    {PERMS_CFG.map(p => {
                      const has = rolePerms[p.key];
                      return (
                        <div key={p.key} className="flex justify-between items-center p-2 bg-[#EBE8E3] border border-transparent hover:border-[#1A1A1A]">
                          <span className="text-xs font-semibold text-[#1A1A1A]">{p.label}</span>
                          <button
                            type="button"
                            onClick={() => setRolePerms({ ...rolePerms, [p.key]: !has })}
                            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider border ${
                              has ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-[#F5F2ED] text-[#8C8984] border-stone-300'
                            }`}
                          >
                            {has ? 'BẬT' : 'TẮT'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-[#1A1A1A] border-dashed">
                  <button
                    type="button"
                    onClick={() => setShowRoleModal(null)}
                    className="px-4 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase tracking-wider hover:bg-[#C4432A] hover:border-[#C4432A] border border-[#1A1A1A]"
                  >
                    Lưu vai trò
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Dialog: Delete Role Modal */}
      {showDelRoleModal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md border border-[#1A1A1A] bg-[#F5F2ED] p-1 fade-in">
            <div className="border border-[#1A1A1A] p-5">
              <div className="text-center mb-4">
                <AlertTriangle size={32} className="text-[#C4432A] mx-auto mb-2" />
                <h3 className="font-serif font-black text-lg text-[#1A1A1A]">Xóa Vai Trò Phân Quyền</h3>
                <p className="text-xs text-[#8C8984] mt-1">Dọn dẹp danh mục quyền hạn hệ thống.</p>
              </div>

              <div className="space-y-3 mb-5">
                <div className="text-xs text-[#1A1A1A] font-medium">
                  Vai trò chuẩn bị xóa: <span className="font-black text-[#C4432A] text-sm">{roles[showDelRoleModal]?.name}</span>
                </div>

                {showDelRoleModal === 0 || roles[showDelRoleModal]?.name === 'Trưởng kho đồ vải' || roles[showDelRoleModal]?.name === 'Thủ kho trưởng' ? (
                  <div className="p-3.5 bg-[#FDF2F0] border border-[#C4432A] text-xs text-[#C4432A] space-y-2">
                    <p className="font-bold uppercase tracking-wider text-[10px]">Cảnh báo bảo mật hệ thống:</p>
                    <p>
                      Vai trò <strong className="underline">Trưởng kho đồ vải</strong> là Quản trị viên cao nhất mặc định của hệ thống. Bạn không thể xóa vai trò này nhằm tránh mất quyền kiểm soát toàn bộ hệ thống.
                    </p>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const assignedCount = users.filter(u => u.role === showDelRoleModal).length;
                      return assignedCount > 0 ? (
                        <div className="p-3.5 bg-[#FDF2F0] border border-[#C4432A] text-xs text-[#C4432A] space-y-2">
                          <p className="font-bold uppercase tracking-wider text-[10px]">Cảnh báo nhân sự bị ảnh hưởng:</p>
                          <p>
                            Hiện có <span className="font-black text-sm underline">{assignedCount}</span> tài khoản nhân viên đang được gán vai trò này.
                          </p>
                          <p className="font-semibold text-[#1A1A1A]">
                            Nếu bạn tiếp tục xóa:
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-[#1A1A1A]">
                            <li>Các nhân viên này sẽ được tự động chuyển sang vai trò kế cận hoặc mặc định để tiếp tục hoạt động không bị gián đoạn.</li>
                          </ul>
                        </div>
                      ) : (
                        <div className="p-3 bg-[#F5F2ED] border border-[#1A1A1A]/20 text-xs text-[#8C8984] space-y-2">
                          <p className="font-bold text-[#1A1A1A]">Thông tin kiểm kê:</p>
                          <p>Hiện không có tài khoản nhân viên nào đang sử dụng vai trò này. Bạn có thể xóa an toàn.</p>
                        </div>
                      );
                    })()}
                    <div className="text-[10px] text-slate-500 italic">
                      * Hành động này không thể hoàn tác sau khi đã bấm xác nhận.
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDelRoleModal(null)}
                  className="flex-1 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]"
                >
                  Hủy bỏ
                </button>
                {showDelRoleModal !== 0 && roles[showDelRoleModal]?.name !== 'Trưởng kho đồ vải' && roles[showDelRoleModal]?.name !== 'Thủ kho trưởng' && (
                  <button
                    onClick={handleDeleteRoleConfirm}
                    className="flex-1 py-2 bg-[#C4432A] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#A9341F]"
                  >
                    Xác nhận xóa
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
