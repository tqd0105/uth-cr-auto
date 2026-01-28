'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Check, X, DollarSign, Clock, Search, Filter } from 'lucide-react';
import type { Donation, DonationStatus } from '@/lib/types/uth';

interface DonationStats {
  total_amount: number;
  total_donors: number;
  total_donations: number;
}

interface DonationsData {
  donations: Donation[];
  stats: DonationStats;
  page: number;
  limit: number;
}

export function DonationsManager() {
  const [data, setData] = useState<DonationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DonationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      
      const res = await fetch(`/api/admin/donations?${params.toString()}`);
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [statusFilter]);

  const handleUpdateStatus = async (id: number, status: DonationStatus) => {
    setProcessing(id);
    try {
      const res = await fetch('/api/admin/donations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          approved_by: 'admin'
        })
      });

      const result = await res.json();
      if (result.success) {
        fetchDonations();
      } else {
        alert(result.message || 'Lỗi khi cập nhật');
      }
    } catch (error) {
      console.error('Error updating donation:', error);
      alert('Lỗi khi cập nhật');
    } finally {
      setProcessing(null);
    }
  };

  const filteredDonations = data?.donations.filter(d => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      d.email.toLowerCase().includes(query) ||
      d.transfer_content.toLowerCase().includes(query) ||
      d.student_id?.toLowerCase().includes(query)
    );
  }) || [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: DonationStatus) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">Đã duyệt</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400">Từ chối</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400">Chờ duyệt</span>;
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Tổng donate</p>
                <p className="text-xl font-bold text-green-400">
                  {(data.stats.total_amount / 1000).toFixed(0)}k
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Tổng người donate</p>
                <p className="text-xl font-bold text-blue-400">{data.stats.total_donors}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Tổng lượt donate</p>
                <p className="text-xl font-bold text-purple-400">{data.stats.total_donations}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DonationStatus | 'all')}
            className="bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm email, nội dung CK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700 text-white text-sm rounded px-3 py-1.5 pl-9 border border-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={fetchDonations}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">MSSV</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-300">Số tiền</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Nội dung CK</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Thời gian</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-300">Trạng thái</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-300">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Không có donation nào
                  </td>
                </tr>
              ) : (
                filteredDonations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm text-white">{donation.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-400">{donation.student_id || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-green-400">
                        {donation.amount.toLocaleString('vi-VN')}đ
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                        {donation.transfer_content}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-400">
                        {formatDate(donation.created_at!)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(donation.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {donation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(donation.id!, 'approved')}
                              disabled={processing === donation.id}
                              className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                              title="Duyệt"
                            >
                              {processing === donation.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(donation.id!, 'rejected')}
                              disabled={processing === donation.id}
                              className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                              title="Từ chối"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {donation.status !== 'pending' && (
                          <span className="text-xs text-gray-500">
                            {donation.approved_at ? formatDate(donation.approved_at) : '-'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
