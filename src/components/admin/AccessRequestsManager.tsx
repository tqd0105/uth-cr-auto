'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, Check, X, Trash2, Clock, CheckCircle, XCircle, Eye, Mail, User } from 'lucide-react';

interface AccessRequest {
  id: number;
  student_id: string;
  student_name: string;
  email: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  ip_address: string;
  created_at: string;
  reviewed_at: string | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function AccessRequestsManager() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = async (page = 1, status = '') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);

      const res = await fetch(`/api/admin/access-requests?${params}`);
      const data = await res.json();

      if (data.success) {
        setRequests(data.data);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch access requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    fetchRequests(1, status);
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/access-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRequest.id,
          action,
          adminNote: adminNote.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setSelectedRequest(null);
        setAdminNote('');
        fetchRequests(pagination.page, statusFilter);
      } else {
        alert(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Failed to process request:', error);
      alert('Có lỗi xảy ra');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa yêu cầu này?')) return;

    try {
      const res = await fetch(`/api/admin/access-requests?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests(pagination.page, statusFilter);
      }
    } catch (error) {
      console.error('Failed to delete request:', error);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    try {
      // Handle both ISO string and timestamp formats
      const dateStr = date.includes('T') ? date : date.replace(' ', 'T');
      const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      });
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">
            <Clock className="w-3 h-3" />
            Chờ duyệt
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
            <CheckCircle className="w-3 h-3" />
            Đã duyệt
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
            <XCircle className="w-3 h-3" />
            Từ chối
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => handleFilterChange('')}
          className={`p-3 rounded-lg text-left transition-colors ${
            !statusFilter ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-gray-400">Tổng cộng</p>
        </button>
        <button
          onClick={() => handleFilterChange('pending')}
          className={`p-3 rounded-lg text-left transition-colors ${
            statusFilter === 'pending' ? 'bg-yellow-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-gray-400">Chờ duyệt</p>
        </button>
        <button
          onClick={() => handleFilterChange('approved')}
          className={`p-3 rounded-lg text-left transition-colors ${
            statusFilter === 'approved' ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
          <p className="text-xs text-gray-400">Đã duyệt</p>
        </button>
        <button
          onClick={() => handleFilterChange('rejected')}
          className={`p-3 rounded-lg text-left transition-colors ${
            statusFilter === 'rejected' ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
          <p className="text-xs text-gray-400">Từ chối</p>
        </button>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={() => fetchRequests(pagination.page, statusFilter)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">MSSV</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">Họ tên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                      Đang tải...
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Không có yêu cầu nào
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-white">{req.student_id}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div>
                        <span className="text-sm text-gray-300">{req.student_name}</span>
                        {req.email && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {req.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-400">{formatDate(req.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setAdminNote('');
                          }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setAdminNote('');
                              }}
                              className="p-1.5 text-green-400 hover:text-green-300 hover:bg-gray-700 rounded transition-colors"
                              title="Duyệt"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setAdminNote('');
                              }}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-colors"
                              title="Từ chối"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                          title="Xóa"
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
              Trang {pagination.page}/{pagination.totalPages} ({pagination.total} kết quả)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchRequests(pagination.page - 1, statusFilter)}
                disabled={pagination.page <= 1}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchRequests(pagination.page + 1, statusFilter)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-medium text-white">Chi tiết yêu cầu</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">MSSV</p>
                  <p className="text-white font-mono">{selectedRequest.student_id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Họ tên</p>
                  <p className="text-white">{selectedRequest.student_name}</p>
                </div>
              </div>

              {selectedRequest.email && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-white">{selectedRequest.email}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">Lý do</p>
                <p className="text-white bg-gray-700 p-3 rounded-lg text-sm">{selectedRequest.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Thời gian gửi</p>
                  <p className="text-gray-400">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>

              {selectedRequest.admin_note && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Ghi chú admin</p>
                  <p className="text-gray-300 italic">"{selectedRequest.admin_note}"</p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ghi chú (tùy chọn)</label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Nhập ghi chú cho người dùng..."
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
                  />
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-700 flex gap-2">
              {selectedRequest.status === 'pending' ? (
                <>
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={isProcessing}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Từ chối
                  </button>
                  <button
                    onClick={() => handleAction('approve')}
                    disabled={isProcessing}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Duyệt
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
