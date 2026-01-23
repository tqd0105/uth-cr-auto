'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, Eye, X, Trash2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Report {
  id: number;
  name: string;
  email: string;
  issue_type: string;
  description: string;
  timestamp: string;
  user_agent: string;
  status: string;
  created_at: string;
}

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_CONFIG = {
  pending: { label: 'Chờ xử lý', color: 'bg-yellow-900/50 text-yellow-400', icon: Clock },
  in_progress: { label: 'Đang xử lý', color: 'bg-blue-900/50 text-blue-400', icon: AlertCircle },
  resolved: { label: 'Đã giải quyết', color: 'bg-green-900/50 text-green-400', icon: CheckCircle },
  closed: { label: 'Đã đóng', color: 'bg-gray-700 text-gray-400', icon: XCircle },
};

const ISSUE_TYPES: Record<string, string> = {
  bug: 'Lỗi kỹ thuật',
  feature: 'Đề xuất tính năng',
  account: 'Vấn đề tài khoản',
  other: 'Khác',
};

export function ReportsManager() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const fetchReports = async (page = 1, status = '') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);

      const res = await fetch(`/api/admin/reports?${params}`);
      const data = await res.json();

      if (data.success) {
        setReports(data.data);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });

      if (res.ok) {
        fetchReports(pagination.page, statusFilter);
        if (selectedReport?.id === id) {
          setSelectedReport({ ...selectedReport, status: newStatus });
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa báo cáo này?')) return;

    try {
      const res = await fetch(`/api/admin/reports?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchReports(pagination.page, statusFilter);
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setStatusFilter(''); fetchReports(1, ''); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Tất cả ({stats.total})
          </button>
          <button
            onClick={() => { setStatusFilter('pending'); fetchReports(1, 'pending'); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Chờ xử lý ({stats.pending})
          </button>
          <button
            onClick={() => { setStatusFilter('in_progress'); fetchReports(1, 'in_progress'); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${statusFilter === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Đang xử lý ({stats.in_progress})
          </button>
          <button
            onClick={() => { setStatusFilter('resolved'); fetchReports(1, 'resolved'); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${statusFilter === 'resolved' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Đã giải quyết ({stats.resolved})
          </button>
        </div>
      )}

      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={() => fetchReports(pagination.page, statusFilter)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Loại</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Người gửi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Mô tả</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Trạng thái</th>
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
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Không có báo cáo
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const statusConfig = STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                  return (
                    <tr key={report.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <span className="text-sm text-white">{ISSUE_TYPES[report.issue_type] || report.issue_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-white">{report.name}</p>
                          <p className="text-xs text-gray-500">{report.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-gray-400 truncate max-w-xs">{report.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                onClick={() => fetchReports(pagination.page - 1, statusFilter)}
                disabled={pagination.page <= 1}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchReports(pagination.page + 1, statusFilter)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-lg">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-medium text-white">Chi tiết báo cáo #{selectedReport.id}</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Loại vấn đề</p>
                <p className="text-white">{ISSUE_TYPES[selectedReport.issue_type] || selectedReport.issue_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Người gửi</p>
                <p className="text-white">{selectedReport.name}</p>
                <p className="text-sm text-gray-400">{selectedReport.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Mô tả</p>
                <p className="text-white whitespace-pre-wrap">{selectedReport.description}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Thời gian gửi</p>
                <p className="text-gray-400">{formatDate(selectedReport.timestamp)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Trạng thái</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(selectedReport.id, key)}
                      className={`px-3 py-1.5 text-sm rounded transition-colors ${selectedReport.status === key ? config.color : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
