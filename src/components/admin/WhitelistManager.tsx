'use client';

import { useState, useEffect } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, X, Check, AlertTriangle, Crown } from 'lucide-react';

interface AllowedUser {
  id: number;
  student_id: string;
  student_name: string | null;
  note: string | null;
  is_active: boolean;
  is_pro: boolean;
  added_by: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  active_count: number;
  inactive_count: number;
  pro_count: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function WhitelistManager() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AllowedUser | null>(null);

  // Form state
  const [formData, setFormData] = useState({ studentId: '', studentName: '', note: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async (page = 1, searchQuery = '', inactive = false) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: String(page), 
        limit: '20',
        showInactive: String(inactive)
      });
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/whitelist?${params}`);
      const data = await res.json();

      if (data.success) {
        setUsers(data.data);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch whitelist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, search, showInactive);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: formData.studentId.trim(),
          studentName: formData.studentName.trim() || null,
          note: formData.note.trim() || null
        })
      });

      const data = await res.json();

      if (data.success) {
        setShowAddModal(false);
        setFormData({ studentId: '', studentName: '', note: '' });
        fetchUsers(1, search, showInactive);
      } else {
        setFormError(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      setFormError('Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          studentName: formData.studentName.trim() || null,
          note: formData.note.trim() || null
        })
      });

      const data = await res.json();

      if (data.success) {
        setEditingUser(null);
        setFormData({ studentId: '', studentName: '', note: '' });
        fetchUsers(pagination.page, search, showInactive);
      } else {
        setFormError(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      setFormError('Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: AllowedUser) => {
    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          isActive: !user.is_active
        })
      });

      if (res.ok) {
        fetchUsers(pagination.page, search, showInactive);
      }
    } catch (error) {
      console.error('Failed to toggle active:', error);
    }
  };

  const handleTogglePro = async (user: AllowedUser) => {
    try {
      const res = await fetch('/api/admin/whitelist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          isPro: !user.is_pro
        })
      });

      if (res.ok) {
        fetchUsers(pagination.page, search, showInactive);
      }
    } catch (error) {
      console.error('Failed to toggle pro:', error);
    }
  };

  const handleDelete = async (id: number, permanent = false) => {
    const message = permanent 
      ? 'Bạn có chắc muốn XÓA VĨNH VIỄN người dùng này khỏi whitelist?' 
      : 'Bạn có chắc muốn vô hiệu hóa người dùng này?';
    
    if (!confirm(message)) return;

    try {
      const params = new URLSearchParams({ id: String(id) });
      if (permanent) params.set('permanent', 'true');

      const res = await fetch(`/api/admin/whitelist?${params}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers(pagination.page, search, showInactive);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const openEditModal = (user: AllowedUser) => {
    setEditingUser(user);
    setFormData({
      studentId: user.student_id,
      studentName: user.student_name || '',
      note: user.note || ''
    });
    setFormError('');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Warning if whitelist is empty */}
      {stats && stats.active_count === 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Whitelist đang trống</p>
            <p className="text-sm text-yellow-500/80 mt-1">
              Khi whitelist trống, TẤT CẢ người dùng đều có thể đăng nhập. 
              Thêm MSSV vào whitelist để giới hạn quyền truy cập.
            </p>
          </div>
        </div>
      )}

      {/* Stats & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            Đang hoạt động: <span className="text-green-400 font-medium">{stats?.active_count || 0}</span>
          </span>
          <span className="text-gray-400">
            Vô hiệu: <span className="text-gray-500 font-medium">{stats?.inactive_count || 0}</span>
          </span>
          <span className="text-gray-400 flex items-center gap-1">
            <Crown className="w-4 h-4 text-yellow-500" />
            Pro: <span className="text-yellow-400 font-medium">{stats?.pro_count || 0}</span>
          </span>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setFormData({ studentId: '', studentName: '', note: '' });
            setFormError('');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm MSSV
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo MSSV hoặc tên..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Tìm
          </button>
        </form>
        <label className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => {
              setShowInactive(e.target.checked);
              fetchUsers(1, search, e.target.checked);
            }}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-400">Hiện vô hiệu</span>
        </label>
        <button
          onClick={() => fetchUsers(pagination.page, search, showInactive)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">MSSV</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Ghi chú</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Pro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                      Đang tải...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {search ? 'Không tìm thấy kết quả' : 'Whitelist trống'}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-750 ${!user.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-white">{user.student_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300">{user.student_name || '-'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-400 truncate max-w-xs block">{user.note || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleTogglePro(user)}
                        className={`p-1.5 rounded transition-colors ${
                          user.is_pro 
                            ? 'bg-yellow-900/50 text-yellow-400 hover:bg-yellow-800/50' 
                            : 'bg-gray-700 text-gray-500 hover:bg-gray-600'
                        }`}
                        title={user.is_pro ? 'Tắt Pro' : 'Bật Pro'}
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          user.is_active 
                            ? 'bg-green-900/50 text-green-400 hover:bg-green-800/50' 
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          title="Sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, !user.is_active)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                          title={user.is_active ? 'Vô hiệu hóa' : 'Xóa vĩnh viễn'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Trang {pagination.page}/{pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchUsers(pagination.page - 1, search, showInactive)}
                disabled={pagination.page <= 1}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchUsers(pagination.page + 1, search, showInactive)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-medium text-white">Thêm vào Whitelist</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-900/50 border border-red-700 text-red-300 rounded text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">MSSV *</label>
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="VD: 2151050XXX"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Họ tên (tùy chọn)</label>
                <input
                  type="text"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Ghi chú (tùy chọn)</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="VD: SV khóa 21, lớp CNTT..."
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.studentId.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Thêm
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-medium text-white">Sửa thông tin</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-900/50 border border-red-700 text-red-300 rounded text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">MSSV</label>
                <input
                  type="text"
                  value={formData.studentId}
                  disabled
                  className="w-full px-4 py-2 bg-gray-600 border border-gray-600 rounded text-gray-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Họ tên</label>
                <input
                  type="text"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Ghi chú</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="VD: SV khóa 21, lớp CNTT..."
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Lưu
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
