/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Role, User, Account, PendingRegistration, DEPARTMENTS } from '../types';
import { ShieldCheck, UserPlus, Users, ToggleLeft, ToggleRight, Check, X, Shield, Plus, Edit, Trash, AlertTriangle, Search } from 'lucide-react';

interface AdminScreensProps {
  roles: Role[];
  users: User[];
  accounts: Account[];
  pendingRegs: PendingRegistration[];
  onUpdateRoles: (updatedRoles: Role[], updatedUsers?: User[]) => void;
  onUpdateUsers: (updatedUsers: User[], updatedAccounts: Account[], updatedPendingRegs?: PendingRegistration[]) => void;
  onUpdatePendingRegs: (updatedPendingRegs: PendingRegistration[]) => void;
  activeSubTab: 'roles' | 'users' | 'depts';
  departments?: string[];
  onUpdateDepartments?: (newDepts: string[], renameMapping?: { oldName: string; newName: string }, deletedName?: string) => void;
  isAdmin?: boolean;
  detailAllocations?: Record<string, [string, number][]>;
}

const PERMS_CFG = [
  { key: 'nhap', label: 'Nhập mua' },
  { key: 'thuhoi', label: 'Thu hồi từ khoa' },
  { key: 'xuat', label: 'Xuất cho khoa' },
  { key: 'huy', label: 'Xuất hủy' },
  { key: 'dc', label: 'Điều chuyển' },
  { key: 'dovai', label: 'Xử lý đồ vải' }
] as const;

export default function AdminScreens({
  roles,
  users,
  accounts,
  pendingRegs,
  onUpdateRoles,
  onUpdateUsers,
  onUpdatePendingRegs,
  activeSubTab,
  departments = DEPARTMENTS,
  onUpdateDepartments,
  isAdmin = false,
  detailAllocations = {}
}: AdminScreensProps) {
  // Department Management local states
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptIdx, setEditingDeptIdx] = useState<number | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');

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

  // Filters for users
  const [userQuery, setUserQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Local Modal Triggers
  const [showRoleModal, setShowRoleModal] = useState<number | null | 'add'>(null); // null, number (idx), 'add'
  const [showUserModal, setShowUserModal] = useState<number | null | 'add'>(null); // null, number (idx), 'add'
  const [showDelUserModal, setShowDelUserModal] = useState<number | null>(null);
  const [showDelDeptModal, setShowDelDeptModal] = useState<number | null>(null);
  const [showDelRoleModal, setShowDelRoleModal] = useState<number | null>(null);

  // Form states for Roles Add/Edit
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#1d5fb8');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePerms, setRolePerms] = useState<Role['perms']>({ nhap: false, thuhoi: false, xuat: false, huy: false, dc: false, dovai: false });

  // Form states for Users Add/Edit
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState(2); // default clinical nurse
  const [uDept, setUDept] = useState('');
  const [uPass, setUPass] = useState('');
  const [uStatus, setUStatus] = useState<'active' | 'inactive'>('active');

  // 1) Permissions matrix triggers
  const handleTogglePerm = (roleIdx: number, permKey: keyof Role['perms']) => {
    const next = [...roles];
    const currentVal = next[roleIdx].perms[permKey] ?? false;
    next[roleIdx].perms[permKey] = !currentVal;
    onUpdateRoles(next);
  };

  // Open Edit Role modal
  const handleOpenEditRole = (idx: number) => {
    const r = roles[idx];
    setRoleName(r.name);
    setRoleColor(r.color);
    setRoleDesc(r.desc);
    setRolePerms({ nhap: false, thuhoi: false, xuat: false, huy: false, dc: false, dovai: false, ...r.perms });
    setShowRoleModal(idx);
  };

  const handleOpenAddRole = () => {
    setRoleName('');
    setRoleColor('#1d5fb8');
    setRoleDesc('');
    setRolePerms({ nhap: false, thuhoi: false, xuat: false, huy: false, dc: false, dovai: false });
    setShowRoleModal('add');
  };

  // Save/Add Role
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

  // 2) Pending Account Registration approver triggers
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

  // 3) Users listing operations
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

  // Open User editor modals
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
    setURole(2); // default clinical staff
    setUDept('');
    setUPass('123456');
    setUStatus('active');
    setShowUserModal('add');
  };

  // Save/Add User accounts
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

      // Also sync matching account details
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

  // Confirm delete user account
  const handleDeleteUser = () => {
    if (typeof showDelUserModal === 'number') {
      const idx = showDelUserModal;
      const nextUsers = users.filter((_, i) => i !== idx);
      
      // Remove matching account and shift index for subsequent users
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

  // Confirm delete role
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
    <div className="fade-in space-y-6">
      
      {/* ── QUẢN LÝ VAI TRÒ SCREEN ───────────────────────────────────────── */}
      {activeSubTab === 'roles' && (
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
                        <span className="w-2.5 h-2.5" style={{ backgroundColor: r.color }} />
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
        </div>
      )}

      {/* ── QUẢN LÝ NGƯỜI DÙNG SCREEN ────────────────────────────────────── */}
      {activeSubTab === 'users' && (
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
                          {/* Assignment widgets */}
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

          {/* Users grid or table */}
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
                            className="w-8 h-8 rounded-none border border-[#1A1A1A] text-white flex items-center justify-center font-mono font-bold text-[11px]"
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
        </div>
      )}

      {/* ── QUẢN LÝ KHOA PHÒNG SCREEN ────────────────────────────────────── */}
      {activeSubTab === 'depts' && (
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
                className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-bold uppercase tracking-wider hover:bg-[#C4432A] transition-colors flex items-center justify-center gap-1.5 border border-[#1A1A1A]"
              >
                <Plus size={14} />
                Thêm khoa phòng
              </button>
            </form>
          </div>

          {/* Table danh sách khoa phòng */}
          <div className="border border-[#1A1A1A] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EBE8E3] border-b border-[#1A1A1A] font-mono text-[9px] uppercase tracking-widest">
                  <th className="py-3 px-4 w-16 border-r border-[#1A1A1A] text-center">STT</th>
                  <th className="py-3 px-4 border-r border-[#1A1A1A]">Tên Khoa Phòng Lâm Sàng</th>
                  <th className="py-3 px-4 text-center w-48">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {departments.map((d, idx) => {
                  const isEditing = editingDeptIdx === idx;
                  return (
                    <tr key={`${d}-${idx}`} className="hover:bg-[#EBE8E3]/50 transition-colors">
                      <td className="py-3 px-4 border-r border-[#1A1A1A] text-center font-mono text-slate-500">
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
                          <div className="flex justify-center gap-1.5">
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
        </div>
      )}

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
