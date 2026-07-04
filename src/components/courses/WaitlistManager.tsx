'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Trash2, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ListX
} from 'lucide-react';
import { useProStatus, ProFeature } from '@/hooks/useProStatus';

interface WaitlistEntry {
  id: number;
  user_session: string;
  course_code: string;
  course_name: string;
  class_id: string;
  class_code: string;
  priority: number;
  status: string;
  check_interval: number;
  last_checked?: string;
  created_at: string;
}

interface WaitlistManagerProps {
  onRefresh?: () => void;
}

export function WaitlistManager({ onRefresh }: WaitlistManagerProps) {
  const { isPro, loading: proLoading } = useProStatus();
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchWaitlist = useCallback(async () => {
    try {
      const response = await fetch('/api/waitlist');
      const data = await response.json();
      if (data.success) {
        setWaitlist(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch waitlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  const handleCheck = async () => {
    setIsChecking(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/waitlist/check', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        if (data.data.registered > 0) {
          setSuccess(`Đăng ký thành công ${data.data.registered} lớp!`);
          onRefresh?.();
        } else {
          setSuccess('Đã kiểm tra - chưa có lớp nào có chỗ trống');
        }
        fetchWaitlist();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa khỏi danh sách chờ?')) return;
    
    setDeletingId(id);
    setError('');
    try {
      const response = await fetch(`/api/waitlist?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setWaitlist(prev => prev.filter(w => w.id !== id));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Chưa kiểm tra';
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <span className="px-2 py-0.5 text-xs bg-orange-900/40 text-orange-300 rounded border border-orange-500/30">Đang chờ</span>;
      case 'registered':
        return <span className="px-2 py-0.5 text-xs bg-green-900/40 text-green-300 rounded border border-green-500/30">Đã ĐK</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 text-xs bg-gray-800/40 text-gray-400 rounded border border-gray-600/30">Đã hủy</span>;
      case 'expired':
        return <span className="px-2 py-0.5 text-xs bg-red-900/40 text-red-300 rounded border border-red-500/30">Hết hạn</span>;
      default:
        return <span className="px-2 py-0.5 text-xs bg-gray-800/40 text-gray-400 rounded border border-gray-600/30">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
          <p className="text-sm text-gray-400 mt-2">Đang tải...</p>
        </CardContent>
      </Card>
    );
  }

  // Nếu không phải Pro, hiển thị giao diện locked
  if (!proLoading && !isPro) {
    return (
      <ProFeature 
        feature="Chờ slot" 
        description="Tự động đăng ký khi lớp học phần có slot trống. Không bỏ lỡ cơ hội!"
      >
        <div className="">
          {/* Mock waitlist UI */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Danh sách chờ (0)
            </h3>
            <Button disabled size="sm" className="bg-orange-600 mb-2">
              <RefreshCw className="w-4 h-4 mr-1" />Kiểm tra ngay
            </Button>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-gray-300 mb-1" />
              <p className="text-blue-600 font-bold">Chức năng chờ slot</p>
              <p className="text-gray-500 text-xs" >Liên hệ admin để được cấp quyền PRO</p>
            </CardContent>
          </Card>
        </div>
      </ProFeature>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-100">
          Danh sách chờ ({waitlist.filter(w => w.status === 'waiting').length})
        </h3>
        <Button
          onClick={handleCheck}
          disabled={isChecking || waitlist.filter(w => w.status === 'waiting').length === 0}
          size="sm"
          className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-lg shadow-orange-500/20"
        >
          {isChecking ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-1" />Đang kiểm tra...</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-1" />Kiểm tra ngay</>
          )}
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-300 rounded flex items-center gap-2 text-sm backdrop-blur-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/30 border border-green-500/30 text-green-300 rounded flex items-center gap-2 text-sm backdrop-blur-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
        </div>
      )}

      {/* Waitlist Items */}
      {waitlist.length === 0 ? (
        <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <ListX className="w-12 h-12 mx-auto text-slate-500 mb-4" />
            <p className="text-gray-300">Chưa có mục nào trong danh sách chờ</p>
            <p className="text-sm text-gray-500 mt-1">
              Thêm lớp vào waitlist để tự động đăng ký khi có chỗ trống
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {waitlist.map((entry) => (
            <Card key={entry.id} className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm hover:shadow-lg hover:shadow-cyan-500/10 transition-all hover:border-cyan-500/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-gray-100 text-sm truncate">
                        {entry.course_name}
                      </h4>
                      {getStatusBadge(entry.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>Mã LHP: {entry.class_code}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Kiểm tra: {formatDate(entry.last_checked)}
                      </span>
                    </div>
                  </div>
                  
                  {entry.status === 'waiting' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-500/30 hover:bg-red-900/30 hover:border-red-500/50"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                    >
                      {deletingId === entry.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-400 bg-slate-800/50 p-3 rounded border border-slate-700/50 backdrop-blur-sm">
        💡 <strong>Tip:</strong> Hệ thống sẽ tự động kiểm tra khi bạn mở trang. 
        Bạn cũng có thể bấm "Kiểm tra ngay" để kiểm tra thủ công.
      </div>
    </div>
  );
}
