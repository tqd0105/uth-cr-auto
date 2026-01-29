'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Play,
  Pause,
  Calendar,
  Bell,
  Timer,
  X
} from 'lucide-react';
import { useProStatus, ProLockedScreen } from '@/hooks/useProStatus';
import type { RegistrationSchedule, RegistrationLog, RegistrationStatus } from '@/lib/types/uth';

interface AutoRegistrationManagerProps {
  onClose: () => void;
}

// Countdown component
function Countdown({ targetTime, isPro }: { targetTime: string; isPro?: boolean }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const target = new Date(targetTime).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Đang đăng ký...');
        setIsExpired(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      result += `${minutes}m ${seconds}s`;

      setTimeLeft(result);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  return (
    <span className={`font-mono text-xs sm:text-sm ${
      isExpired 
        ? isPro ? 'text-cyan-400 animate-pulse' : 'text-blue-600 animate-pulse' 
        : isPro ? 'text-orange-400' : 'text-orange-600'
    }`}>
      <Timer className="w-3 h-3 inline mr-1" />
      {timeLeft}
    </span>
  );
}

interface AutoRegistrationManagerProps {
  onClose: () => void;
}

export function AutoRegistrationManager({ onClose }: AutoRegistrationManagerProps) {
  const { isPro, loading: proLoading } = useProStatus();
  const [schedules, setSchedules] = useState<RegistrationSchedule[]>([]);
  const [logs, setLogs] = useState<RegistrationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scheduler');
      const data = await response.json();

      if (data.success) {
        const newSchedules = data.data.schedules || [];
        const newLogs = data.data.logs || [];
        
        // Check for newly successful registrations
        const successfulSchedules = newSchedules.filter(
          (s: RegistrationSchedule) => s.status === 'success'
        );
        
        if (successfulSchedules.length > 0) {
          const latestSuccess = successfulSchedules[0];
          setSuccessNotification(`🎉 Đăng ký thành công: ${latestSuccess.course_name || latestSuccess.course_code}`);
          
          // Auto hide notification after 10 seconds
          setTimeout(() => setSuccessNotification(null), 10000);
        }
        
        setSchedules(newSchedules);
        setLogs(newLogs);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPro) {
      fetchData();
      
      // Auto refresh every 5 seconds to update status
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchData, isPro]);

  // Nếu không phải Pro, hiển thị màn hình locked (phải đặt sau tất cả hooks)
  if (!proLoading && !isPro) {
    return (
      <ProLockedScreen
        feature="Hẹn lịch đăng ký tự động"
        description="Tự động đăng ký học phần đúng thời gian bạn đặt. Không cần canh giờ, hệ thống sẽ đăng ký thay bạn!"
        onClose={onClose}
      />
    );
  }

  const handleCancelSchedule = async (scheduleId: number) => {
    if (!confirm('Bạn có chắc muốn hủy lịch đăng ký này?')) return;

    try {
      const response = await fetch(`/api/scheduler?id=${scheduleId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        fetchData();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className={`px-2 py-1 text-xs rounded-full ${
          isPro ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-600'
        }`}>Chờ đăng ký</span>;
      case 'running':
        return <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
          isPro ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600'
        }`}><Loader2 className="w-3 h-3 animate-spin" />Đang chạy</span>;
      case 'success':
        return <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
          isPro ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-600'
        }`}><CheckCircle className="w-3 h-3" />Thành công</span>;
      case 'failed':
        return <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
          isPro ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-600'
        }`}><AlertCircle className="w-3 h-3" />Thất bại</span>;
      case 'retry':
        return <span className={`px-2 py-1 text-xs rounded-full ${
          isPro ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-600'
        }`}>Đang thử lại</span>;
      default:
        return <span className={`px-2 py-1 text-xs rounded-full ${
          isPro ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'
        }`}>{status}</span>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className={`w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-lg ${
        isPro ? 'bg-gradient-to-b from-slate-900 to-slate-800 border border-purple-500/30' : ''
      }`}>
        <CardHeader className={`flex flex-row items-center justify-between p-3 sm:p-4 ${
          isPro 
            ? 'bg-gradient-to-r from-purple-600/50 to-pink-600/50 border-b border-purple-500/30' 
            : 'bg-purple-600 text-white'
        }`}>
          <div className="min-w-0 flex-1">
            <CardTitle className={`text-base sm:text-lg flex items-center gap-2 ${
              isPro ? 'text-gray-100' : 'text-white'
            }`}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">Quản lý đăng ký tự động</span>
            </CardTitle>
            <p className={`text-xs sm:text-sm hidden sm:block ${isPro ? 'text-gray-300' : 'text-purple-100'}`}>
              Lên lịch và theo dõi đăng ký học phần tự động
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              className={`h-8 w-8 sm:h-9 sm:w-9 p-0 ${
                isPro ? 'text-gray-300 hover:bg-white/10' : 'text-white hover:bg-white/20'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={`h-8 w-8 sm:h-9 sm:w-9 p-0 ${
                isPro ? 'text-gray-300 hover:bg-white/10' : 'text-white hover:bg-white/20'
              }`}
            >
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className={`p-3 sm:p-4 overflow-y-auto max-h-[calc(95vh-80px)] sm:max-h-[70vh] ${
          isPro ? 'pro-scrollbar' : ''
        }`}>
          {/* Success Notification */}
          {successNotification && (
            <div className={`mb-3 sm:mb-4 p-3 sm:p-4 rounded-lg flex items-center gap-2 sm:gap-3 animate-pulse ${
              isPro 
                ? 'bg-green-900/30 border border-green-500/30 text-green-300' 
                : 'bg-green-50 border border-green-300 text-green-700'
            }`}>
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm sm:text-base truncate">{successNotification}</p>
                <p className={`text-xs sm:text-sm ${isPro ? 'text-green-400' : 'text-green-600'}`}>Học phần đã được đăng ký thành công!</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg flex items-center gap-2 text-xs sm:text-sm ${
              isPro 
                ? 'bg-red-900/30 border border-red-500/30 text-red-300' 
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <Loader2 className={`w-5 h-5 sm:w-6 sm:h-6 animate-spin ${isPro ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`ml-2 text-sm ${isPro ? 'text-gray-400' : 'text-gray-600'}`}>Đang tải...</span>
            </div>
          ) : (
            <>
              {/* Scheduled Registrations */}
              <div className="mb-4 sm:mb-6">
                <h3 className={`text-xs sm:text-sm font-semibold mb-2 sm:mb-3 flex items-center gap-2 ${
                  isPro ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <Calendar className="w-4 h-4" />
                  Lịch đăng ký ({schedules.length})
                </h3>
                
                {schedules.length === 0 ? (
                  <div className={`text-center py-6 sm:py-8 border border-dashed rounded-lg ${
                    isPro ? 'text-gray-400 border-gray-600' : 'text-gray-500'
                  }`}>
                    <Clock className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 ${
                      isPro ? 'text-gray-500' : 'text-gray-300'
                    }`} />
                    <p className="text-sm">Chưa có lịch đăng ký nào</p>
                    <p className="text-xs mt-1">Chọn lớp học phần và lên lịch đăng ký tự động</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schedules.map((schedule) => (
                      <div 
                        key={schedule.id}
                        className={`p-2 sm:p-3 border rounded-lg transition-colors ${
                          schedule.status === 'success' 
                            ? isPro ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-300' 
                            : schedule.status === 'failed'
                            ? isPro ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-300'
                            : isPro ? 'border-gray-600 hover:bg-slate-700/30' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm sm:text-base truncate ${
                              isPro ? 'text-gray-100' : 'text-gray-900'
                            }`}>
                              {schedule.course_name || schedule.course_code}
                            </p>
                            <div className={`flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm mt-1 ${
                              isPro ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              <span>Lớp: {schedule.class_code}</span>
                            </div>
                            <div className={`flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm mt-1 ${
                              isPro ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              <span>
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatDateTime(schedule.schedule_time)}
                              </span>
                            </div>
                            {/* Countdown for pending schedules */}
                            {schedule.status === 'pending' && (
                              <div className="mt-2">
                                <Countdown targetTime={schedule.schedule_time} isPro={isPro} />
                              </div>
                            )}
                            {schedule.error_message && (
                              <p className={`text-[10px] sm:text-xs mt-1 truncate ${
                                isPro ? 'text-red-400' : 'text-red-500'
                              }`}>
                                ⚠️ {schedule.error_message}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 justify-end sm:justify-start">
                            {getStatusBadge(schedule.status)}
                            <span className={`text-[10px] sm:text-xs ${
                              isPro ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              Thử: {schedule.retry_count}/{schedule.max_retries || 5}
                            </span>
                            {schedule.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 sm:h-8 w-7 sm:w-8 p-0 ${
                                  isPro 
                                    ? 'text-red-400 border-red-500/30 hover:bg-red-900/30' 
                                    : 'text-red-600 border-red-200 hover:bg-red-50'
                                }`}
                                onClick={() => handleCancelSchedule(schedule.id)}
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Registration Logs */}
              <div>
                <h3 className={`text-xs sm:text-sm font-semibold mb-2 sm:mb-3 flex items-center gap-2 ${
                  isPro ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  Lịch sử đăng ký ({logs.length})
                </h3>
                
                {logs.length === 0 ? (
                  <div className={`text-center py-6 sm:py-8 border border-dashed rounded-lg ${
                    isPro ? 'text-gray-400 border-gray-600' : 'text-gray-500'
                  }`}>
                    <AlertCircle className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 ${
                      isPro ? 'text-gray-500' : 'text-gray-300'
                    }`} />
                    <p className="text-sm">Chưa có lịch sử đăng ký</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                    {logs.map((log) => (
                      <div 
                        key={log.id}
                        className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm ${
                          log.status === 'success' 
                            ? isPro ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
                            : isPro ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {log.status === 'success' ? (
                              <CheckCircle className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                                isPro ? 'text-green-400' : 'text-green-600'
                              }`} />
                            ) : (
                              <AlertCircle className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                                isPro ? 'text-red-400' : 'text-red-600'
                              }`} />
                            )}
                            <span className={`truncate ${
                              log.status === 'success' 
                                ? isPro ? 'text-green-300' : 'text-green-700' 
                                : isPro ? 'text-red-300' : 'text-red-700'
                            }`}>
                              {log.action === 'register' ? 'ĐK' : 'Hủy'} - {log.course_name}
                            </span>
                          </div>
                          <span className={`text-[10px] sm:text-xs flex-shrink-0 ${
                            isPro ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            {formatDateTime(log.created_at)}
                          </span>
                        </div>
                        <p className={`text-[10px] sm:text-xs mt-1 truncate ${
                          isPro ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {log.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}