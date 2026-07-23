/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Role, User, Account, PendingRegistration } from '../../types';
import { Plus, Edit, Trash, AlertTriangle, Check, X, ShieldCheck, UserPlus, Search } from 'lucide-react';

interface UserManagementProps {
  roles: Role[];
  users: User[];
  accounts: Account[];
  pendingRegs: PendingRegistration[];
  onUpdateUsers: (updatedUsers: User[], updatedAccounts: Account[], updatedPendingRegs?: PendingRegistration[]) => void;
  onUpdatePendingRegs: (updatedPendingRegs: PendingRegistration[]) => void;
  departments: string[];
}

export default function UserManagement({
  roles,
  users,
  accounts,
  pendingRegs,
  onUpdateUsers,
  onUpdatePendingRegs,
  departments
}: UserManagementProps) {
  // Local filter states
  const [userQuery, setUserQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Local Modal Triggers & Form states
  const [showUserModal, setShowUserModal] = useState<number | null | 'add'>(null);
  const [showDelUserModal, setShowDelUserModal] = useState<number | null>(null);

  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState(2);
  const [uDept, setUDept] = useState('');
  const [uPass, setUPass] = useState('');
  const [uStatus, setUStatus] = useState<'active' | 'inactive'>('active');

  // Handle registrations approvals
  const handleApproveReg = (idx: number, assignedRole: number, assignedDept: string) => {
    const pending = pendingRegs.filter(p => p.status === 'pending');
    const targetReg = pending[idx];

    // Add to USERS
    const nextUsers = [...users];
    const newUserIdx = nextUsers.length;
    nextUsers.push({
      name: targetReg.name,
      email: targetReg.email,
      role: assignedRole,
      dept: assignedDept || 'Tất cả',
      status: 'active'
    });

    // Add to ACCOUNTS
    const nextAccounts = [...accounts];
    nextAccounts.push({
      username: targetReg.username,
      email: targetReg.email,
      password: targetReg.password || '123456',
      name: targetReg.name,
      isAdmin: false,
      status: 'active',
      userIdx: newUserIdx
    });

    // Update pending registry
    const nextPending = pendingRegs.map(p => {
      if (p.email === targetReg.email) {
        return { ...p, status: 'approved' as const };
      }
      return p;
    });

    onUpdateUsers(nextUsers, nextAccounts, nextPending);
  };

  const handleRejectReg = (idx: number) => {
    const pending = pendingRegs.filter(p => p.status === 'pending');
    const targetReg = pending[idx];

    const nextPending = pendingRegs.map(p => {
      if (p.email === targetReg.email) {
        return { ...p, status: 'rejected' as const };
      }
      return p;
    });

    onUpdatePendingRegs(nextPending);
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    let list = users.map((u, i) => ({ ...u, originalIdx: i }));

    if (userQuery.trim()) {
      const q = userQuery.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }

    if (roleFilter) {
      list = list.filter(u => roles[u.role]?.name === roleFilter);
    }

    if (statusFilter) {
      list = list.filter(u => u.status === statusFilter);
    }

    return list;
  }, [users, roles, userQuery, roleFilter, statusFilter]);

  // Modal open wrappers
  const handleOpenEditUser = (origIdx: number) => {
    const u = users[origIdx];
    const matchingAcc = accounts.find(a => a.userIdx === origIdx);
    setUName(u.name);
    setUEmail(u.email);
    setURole(u.role);
    setUDept(u.dept);
    setUPass(matchingAcc?.password || '');
    setUStatus(u.status);
    setShowUserModal(origIdx);
  };

  const handleOpenAddUser = () => {
    setUName('');
    setUEmail('');
    setURole(2);
    setUDept('');
    setUPass('123456');
    setUStatus('active');
    setShowUserModal('add');
  };

  // Submit hander for add/edit user
  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName.trim() || !uEmail.trim()) {
      alert('Vui lòng nhập họ tên và email.');
      return;
    }

    const nextUsers = [...users];
    const nextAccounts = [...accounts];

    const userObj: User = {
      name: uName.trim(),
      email: uEmail.trim().toLowerCase(),
      role: uRole,
      dept: uDept || 'Tất cả',
      status: uStatus
    };

    if (showUserModal === 'add') {
      const newUserIdx = nextUsers.length;
      nextUsers.push(userObj);

      nextAccounts.push({
        username: uEmail.trim().split('@')[0].toLowerCase(),
        email: uEmail.trim().toLowerCase(),
        password: uPass || '123456',
        name: uName.trim(),
        isAdmin: false,
        status: uStatus,
        userIdx: newUserIdx
      });
    } else if (typeof showUserModal === 'number') {
      const idx = showUserModal;
      nextUsers[idx] = userObj;

      // Sync matching account details
      const accIdx = nextAccounts.findIndex(a => a.userIdx === idx);
      if (accIdx >= 0) {
        nextAccounts[accIdx].name = uName.trim();
        nextAccounts[accIdx].email = uEmail.trim().toLowerCase();
        nextAccounts[accIdx].status = uStatus;
        if (uPass) nextAccounts[accIdx].password = uPass;
      }
    }

    onUpdateUsers(nextUsers, nextAccounts);
    setShowUserModal(null);
  };

  const handleDeleteUser = () => {
    if (typeof showDelUserModal === 'number') {
      const idx = showDelUserModal;
      const nextUsers = users.filter((_, i) => i !== idx);
      
      const nextAccounts = accounts
        .filter(a => a.userIdx !== idx)
        .map(a => {
          if (a.userIdx > idx) {
            return { ...a, userIdx: a.userIdx - 1 };
          }
          return a;
        });

      onUpdateUsers(nextUsers, nextAccounts);
      setShowDelUserModal(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#1A1A1A] pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#8C8984]">NHÂN SỰ VÀ TRUY CẬP</span>
          <h2 className="font-serif font-black italic text-2xl tracking-tight mt-1 text-[#1A1A1A]">Quản Lý Người Dùng Hệ Thống</h2>
          <p className="text-xs text-[#8C8984] mt-1">
            Quản lý các tài khoản trực ban vận hành, định hướng phân khoa phụ trách an toàn.
          </p>
        </div>
        <button
          onClick={handleOpenAddUser}
          className="flex items-center justify-center gap-1 px-4 py-2 border border-[#1A1A1A] bg-[#1A1A1A] text-[11px] font-bold uppercase tracking-widest text-[#F5F2ED] hover:bg-[#C4432A] hover:border-[#C4432A] transition-colors"
        >
          <UserPlus size={14} />
          Thêm Người Dùng
        </button>
      </div>

      {/* Pending approvals section */}
      {pendingRegs.filter(p => p.status === 'pending').length > 0 && (
        <div className="border border-[#D97706] p-1 bg-[#FEFBF2] fade-in">
          <div className="border border-[#D97706] p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-[#D97706] font-bold uppercase tracking-wider">
              <ShieldCheck size={16} />
              Phát hiện ({pendingRegs.filter(p => p.status === 'pending').length}) tài khoản mới đăng ký đang chờ xét duyệt
            </div>

            <div className="divide-y divide-[#D97706]/20 max-h-56 overflow-y-auto pr-1">
              {pendingRegs.filter(p => p.status === 'pending').map((p, pIdx) => {
                return (
                  <div key={p.email} className="py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="text-xs">
                      <div className="font-bold text-[#1A1A1A]">{p.name}</div>
                      <div className="font-mono text-[10px] text-[#8C8984] mt-0.5">
                        Username: <span className="text-[#2563EB]">{p.username}</span> · {p.email} · {p.regDate}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                      <div className="flex gap-2">
                        <select
                          id={`approve-role-${pIdx}`}
                          className="bg-white border border-[#1A1A1A] p-1.5 text-[11px]"
                          defaultValue="2"
                        >
                          {roles.map((r, rIdx) => (
                            <option key={r.name} value={rIdx}>{r.name}</option>
                          ))}
                        </select>

                        <select
                          id={`approve-dept-${pIdx}`}
                          className="bg-white border border-[#1A1A1A] p-1.5 text-[11px]"
                          defaultValue=""
                        >
                          <option value="">Không giới hạn</option>
                          <option value="Kho trung tâm">Kho trung tâm</option>
                          {departments.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-1.5 ml-auto">
                        <button
                          onClick={() => {
                            const roleId = parseInt((document.getElementById(`approve-role-${pIdx}`) as HTMLSelectElement).value) || 2;
                            const deptW = (document.getElementById(`approve-dept-${pIdx}`) as HTMLSelectElement).value;
                            handleApproveReg(pIdx, roleId, deptW);
                          }}
                          className="px-2.5 py-1.5 bg-[#16A34A] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5"
                        >
                          <Check size={11} />
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleRejectReg(pIdx)}
                          className="px-2.5 py-1.5 bg-[#C4432A] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5"
                        >
                          <X size={11} />
                          Từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* User accounts list filtering */}
      <div className="border border-[#1A1A1A] bg-[#EBE8E3] p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            value={userQuery}
            onChange={e => setUserQuery(e.target.value)}
            placeholder="Tìm tên hoặc email..."
            className="w-full bg-[#F5F2ED] border border-[#1A1A1A] py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-[#C4432A]"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8984]" />
        </div>

        <div className="w-full md:w-48">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full bg-[#F5F2ED] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
          >
            <option value="">Tất cả vai trò</option>
            {roles.map(r => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-[#F5F2ED] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Vô hiệu</option>
          </select>
        </div>

        <div className="text-[11px] font-mono text-[#8C8984] md:ml-auto">
          Tìm thấy {filteredUsers.length} người dùng
        </div>
      </div>

      {/* Users table */}
      <div className="border border-[#1A1A1A] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#EBE8E3] border-b border-[#1A1A1A] font-mono text-[9px] uppercase tracking-widest text-[#1A1A1A]">
              <th className="py-2.5 px-4">Họ và tên nhân viên</th>
              <th className="py-2.5 px-4">Vai trò hành chính</th>
              <th className="py-2.5 px-4">Tài khoản xác thực</th>
              <th className="py-2.5 px-4">Đơn vị phụ trách</th>
              <th className="py-2.5 px-4 text-center">Trạng thái</th>
              <th className="py-2.5 px-4 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]">
            {filteredUsers.map(u => {
              const rObj = roles[u.role] || { name: 'Người dùng', color: '#8C8984' };
              const nameParts = u.name.split(' ');
              const initials = nameParts.length >= 2 ?
                (nameParts[nameParts.length - 2][0] + nameParts[nameParts.length - 1][0]).toUpperCase() :
                u.name.slice(0, 2).toUpperCase();

              return (
                <tr key={u.email} className="hover:bg-[#EBE8E3]">
                  <td className="py-3 px-4 font-bold text-[#1A1A1A]">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-none border border-[#1A1A1A] text-white flex items-center justify-center font-mono font-bold text-[11px] flex-shrink-0"
                        style={{ backgroundColor: rObj.color }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="font-bold text-xs">{u.name}</div>
                        <div className="text-[10px] text-[#8C8984] font-normal mt-0.5">{u.dept}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border"
                      style={{ borderColor: rObj.color, color: rObj.color }}
                    >
                      {rObj.name}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono text-stone-600 text-[11px]">{u.email}</td>
                  <td className="py-3 px-4 text-stone-500 font-semibold">{u.dept || 'Tất cả'}</td>
                  <td className="py-3 px-4 text-center">
                    {u.status === 'active' ? (
                      <span className="inline-block bg-[#D1FAE5] text-[#065F46] font-bold text-[9px] uppercase px-2 py-0.5">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="inline-block bg-stone-200 text-stone-500 font-bold text-[9px] uppercase px-2 py-0.5">
                        Vô hiệu
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => handleOpenEditUser(u.originalIdx)}
                        className="p-1 text-[#2563EB] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-colors"
                        title="Sửa thông tin"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => setShowDelUserModal(u.originalIdx)}
                        className="p-1 text-[#C4432A] hover:bg-[#C4432A] hover:text-[#F5F2ED] transition-colors"
                        title="Xóa tài khoản"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialog: Add/Edit User Modal */}
      {showUserModal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md border border-[#1A1A1A] bg-[#F5F2ED] p-1 fade-in">
            <div className="border border-[#1A1A1A] p-5">
              
              <div className="flex justify-between items-start mb-4 pb-2 border-b border-[#1A1A1A]">
                <div>
                  <h3 className="font-serif font-black text-lg text-[#1A1A1A]">
                    {showUserModal === 'add' ? 'Thêm Người Dùng Mới' : 'Sửa Người Dùng'}
                  </h3>
                  <p className="text-[11px] text-[#8C8984]">Cập nhật vai trò hành chính và định hướng phân khoa</p>
                </div>
                <button onClick={() => setShowUserModal(null)} className="text-[#8C8984] hover:text-[#1A1A1A] text-lg font-bold">
                  &times;
                </button>
              </div>

              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Họ và tên nhân viên <span className="text-[#C4432A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Trần Thị Lan"
                    value={uName}
                    onChange={e => setUName(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Email / Tên đăng nhập <span className="text-[#C4432A]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="VD: lan.tt@hospital.vn"
                    value={uEmail}
                    onChange={e => setUEmail(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                      Vai trò công việc <span className="text-[#C4432A]">*</span>
                    </label>
                    <select
                      value={uRole}
                      onChange={e => setURole(parseInt(e.target.value) || 2)}
                      className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                    >
                      {roles.map((r, rIdx) => (
                        <option key={r.name} value={rIdx}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                      Khoa phòng phụ trách
                    </label>
                    <select
                      value={uDept}
                      onChange={e => setUDept(e.target.value)}
                      className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                    >
                      <option value="">Không giới hạn (Tất cả)</option>
                      <option value="Kho trung tâm">Kho trung tâm</option>
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Mật khẩu xác thực tạm
                  </label>
                  <input
                    type="password"
                    placeholder="Mặc định: 123456"
                    value={uPass}
                    onChange={e => setUPass(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Trạng thái hoạt động
                  </label>
                  <select
                    value={uStatus}
                    onChange={e => setUStatus(e.target.value as any)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Vô hiệu hóa tài khoản</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-[#1A1A1A] border-dashed">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(null)}
                    className="px-4 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase tracking-wider hover:bg-[#C4432A] hover:border-[#C4432A] border border-[#1A1A1A]"
                  >
                    Lưu người dùng
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Dialog: Delete User Modal */}
      {showDelUserModal !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm border border-[#1A1A1A] bg-[#F5F2ED] p-1 fade-in">
            <div className="border border-[#1A1A1A] p-5">
              <div className="text-center mb-4">
                <AlertTriangle size={32} className="text-[#C4432A] mx-auto mb-2" />
                <h3 className="font-serif font-black text-lg text-[#1A1A1A]">Xóa Người Dùng</h3>
                <p className="text-xs text-[#8C8984] mt-1">Đồng bộ xóa thông tin tài khoản đăng nhập.</p>
              </div>

              <div className="p-3 bg-[#FDF2F0] border border-[#C4432A] text-xs text-[#1A1A1A] mb-5">
                Bạn có chắc chắn muốn xóa nhân sự <span className="font-bold">{users[showDelUserModal]?.name}</span>? Nhân viên này sẽ không thể đăng nhập vào hệ thống nữa.
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowDelUserModal(null)}
                  className="flex-1 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleDeleteUser}
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
