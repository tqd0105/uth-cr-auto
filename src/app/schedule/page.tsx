'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  RefreshCw, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User,
  ChevronLeft,
  ChevronRight,
  Bell,
  BellOff,
  Mail,
  Settings,
  Save,
  X,
  AlertCircle,
  BookOpen,
  ExternalLink,
  Search,
  Filter,
  Zap,
  StickyNote,
  Trash2,
  BookIcon
} from 'lucide-react';
import type { LichHoc, ScheduleNotificationSettings, ClassReminder } from '@/lib/types/uth';

const DAYS_OF_WEEK = ['', 'Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const DAY_COLORS = [
  '',
  'bg-red-50 border-red-200', // CN
  'bg-blue-50 border-blue-200', // T2
  'bg-green-50 border-green-200', // T3
  'bg-yellow-50 border-yellow-200', // T4
  'bg-purple-50 border-purple-200', // T5
  'bg-pink-50 border-pink-200', // T6
  'bg-orange-50 border-orange-200' // T7
];

const REMIND_OPTIONS = [
  { value: 15, label: '15 phút trước' },
  { value: 30, label: '30 phút trước' },
  { value: 60, label: '1 giờ trước' },
  { value: 120, label: '2 giờ trước' },
  { value: 1440, label: '1 ngày trước' },
];

export default function SchedulePage() {
  const router = useRouter();
  const [schedule, setSchedule] = useState<LichHoc[]>([]);
  const [groupedSchedule, setGroupedSchedule] = useState<Record<number, LichHoc[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  // Class detail modal state
  const [selectedClass, setSelectedClass] = useState<LichHoc | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [classReminders, setClassReminders] = useState<ClassReminder[]>([]);
  
  // Reminder form state
  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderBefore, setReminderBefore] = useState(30);
  const [reminderNote, setReminderNote] = useState('');
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState({ type: '', text: '' });
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<Partial<ScheduleNotificationSettings>>({
    is_enabled: false,
    email: '',
    notification_type: 'daily',
    notification_time: '07:00',
    custom_title: '',
    send_day_before: true
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ type: '', text: '' });

  // Get Monday of the current week
  const getMonday = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Format date for API (use local date, not UTC)
  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  // Get week range for display
  const getWeekRange = () => {
    const monday = getMonday(currentDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.toLocaleDateString('vi-VN')} - ${sunday.toLocaleDateString('vi-VN')}`;
  };

  // Fetch schedule
  const fetchSchedule = useCallback(async (date: Date, showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setError('');

    try {
      const monday = getMonday(date);
      const res = await fetch(`/api/schedule?date=${formatDateForApi(monday)}`);
      const data = await res.json();

      if (data.sessionExpired || res.status === 401) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        router.push('/login');
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi tải lịch học');
      }

      setSchedule(data.data.schedule || []);
      setGroupedSchedule(data.data.groupedSchedule || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  // Fetch notification settings
  const fetchNotificationSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/schedule/notifications');
      const data = await res.json();
      
      if (data.success && data.data) {
        setNotificationSettings(data.data);
      }
    } catch (err) {
      console.error('Error fetching notification settings:', err);
    }
  }, []);

  // Initial fetch on mount
  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    fetchSchedule(currentDate);
    fetchNotificationSettings();
    fetchReminders();
  }, []);

  // Fetch when date changes (not on initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchSchedule(currentDate, true);
  }, [currentDate]);

  // Fetch class reminders
  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/schedule/reminders');
      const data = await res.json();
      if (data.success) {
        setClassReminders(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching reminders:', err);
    }
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  // Get unique subjects for filter
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(schedule.map(s => s.tenMonHoc));
    return Array.from(subjects).sort();
  }, [schedule]);

  // Filter schedule
  const filteredGroupedSchedule = useMemo(() => {
    if (!searchQuery && !selectedSubject) return groupedSchedule;
    
    const filtered: Record<number, LichHoc[]> = {};
    Object.keys(groupedSchedule).forEach(day => {
      const dayNum = Number(day);
      const dayClasses = groupedSchedule[dayNum].filter(item => {
        const matchSearch = !searchQuery || 
          item.tenMonHoc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.maLopHocPhan.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.giangVien && item.giangVien.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchSubject = !selectedSubject || item.tenMonHoc === selectedSubject;
        return matchSearch && matchSubject;
      });
      if (dayClasses.length > 0) {
        filtered[dayNum] = dayClasses;
      }
    });
    return filtered;
  }, [groupedSchedule, searchQuery, selectedSubject]);

  // Get next class
  const nextClass = useMemo(() => {
    const now = new Date();
    const today = now.getDay() === 0 ? 1 : now.getDay() + 1; // Convert to UTH format
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Sort all classes by day and time
    const allClasses = [...schedule].sort((a, b) => {
      if (a.thu !== b.thu) return a.thu - b.thu;
      return a.tuGio.localeCompare(b.tuGio);
    });

    // Find next class
    for (const cls of allClasses) {
      if (cls.thu > today || (cls.thu === today && cls.tuGio > currentTime)) {
        return cls;
      }
    }
    // If no class found after current time, return first class of week
    return allClasses[0] || null;
  }, [schedule]);

  // Open class detail modal
  const openClassModal = (classItem: LichHoc) => {
    setSelectedClass(classItem);
    setReminderEmail(notificationSettings.email || '');
    setReminderBefore(30);
    setReminderNote('');
    setReminderMessage({ type: '', text: '' });
    setShowClassModal(true);
  };

  // Get class date from day of week
  const getClassDate = (dayOfWeek: number) => {
    const monday = getMonday(currentDate);
    const daysFromMonday = dayOfWeek === 1 ? 6 : dayOfWeek - 2; // CN = 6, T2 = 0, T3 = 1, ...
    const classDate = new Date(monday);
    classDate.setDate(monday.getDate() + daysFromMonday);
    return formatDateForApi(classDate);
  };

  // Check if class has reminder
  const hasReminder = (classId: string, dayOfWeek: number) => {
    const classDate = getClassDate(dayOfWeek);
    return classReminders.some(r => r.class_id === classId && r.class_date === classDate);
  };

  // Save class reminder
  const handleSaveReminder = async () => {
    if (!selectedClass) return;
    
    setIsSavingReminder(true);
    setReminderMessage({ type: '', text: '' });

    try {
      const classDate = getClassDate(selectedClass.thu);
      
      const res = await fetch('/api/schedule/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: reminderEmail,
          class_id: selectedClass.maLopHocPhan,
          class_name: selectedClass.tenMonHoc,
          class_date: classDate,
          class_time: selectedClass.tuGio,
          room: selectedClass.tenPhong,
          remind_before: reminderBefore,
          note: reminderNote
        })
      });

      const data = await res.json();

      if (data.success) {
        setReminderMessage({ type: 'success', text: 'Đã tạo nhắc nhở!' });
        fetchReminders();
        setTimeout(() => setShowClassModal(false), 1500);
      } else {
        setReminderMessage({ type: 'error', text: data.message || 'Lỗi khi tạo nhắc nhở' });
      }
    } catch (err) {
      setReminderMessage({ type: 'error', text: 'Lỗi kết nối' });
    } finally {
      setIsSavingReminder(false);
    }
  };

  // Delete reminder
  const handleDeleteReminder = async (id: number) => {
    try {
      const res = await fetch(`/api/schedule/reminders?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchReminders();
      }
    } catch (err) {
      console.error('Error deleting reminder:', err);
    }
  };

  // Generate Google Calendar URL
  const getGoogleCalendarUrl = (classItem: LichHoc) => {
    const classDate = getClassDate(classItem.thu);
    const [year, month, day] = classDate.split('-');
    const startTime = classItem.tuGio.replace(':', '');
    const endTime = classItem.denGio.replace(':', '');
    
    const startDateTime = `${year}${month}${day}T${startTime}00`;
    const endDateTime = `${year}${month}${day}T${endTime}00`;
    
    const title = encodeURIComponent(classItem.tenMonHoc);
    const location = encodeURIComponent(classItem.tenPhong || '');
    const details = encodeURIComponent(
      `Mã lớp: ${classItem.maLopHocPhan}\nGiảng viên: ${classItem.giangVien || 'TBA'}\nTiết: ${classItem.tuTiet} - ${classItem.denTiet}`
    );
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${details}&location=${location}&ctz=Asia/Ho_Chi_Minh`;
  };

  // Save notification settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/schedule/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings)
      });

      const data = await res.json();

      if (data.success) {
        setSettingsMessage({ type: 'success', text: 'Đã lưu cài đặt thông báo!' });
        setTimeout(() => setShowSettings(false), 1500);
      } else {
        setSettingsMessage({ type: 'error', text: data.message || 'Lỗi khi lưu cài đặt' });
      }
    } catch (err) {
      setSettingsMessage({ type: 'error', text: 'Lỗi kết nối' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700">Đang tải lịch học...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Quay lại</span>
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-semibold text-gray-900">Lịch học tuần</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className={`text-gray-600 hover:text-gray-900 ${notificationSettings.is_enabled ? 'text-green-600' : ''}`}
                title="Cài đặt thông báo"
              >
                {notificationSettings.is_enabled ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline ml-1">Thông báo</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchSchedule(currentDate, true)}
                disabled={isRefreshing}
                className="text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Week Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousWeek}
            className="text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Tuần trước</span>
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentWeek}
              className="text-xs"
            >
              Hôm nay
            </Button>
            <span className="font-medium text-gray-900">
              {getWeekRange()}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextWeek}
            className="text-gray-600 hover:text-gray-900"
          >
            <span className="hidden sm:inline">Tuần sau</span>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Next Class Widget & Search/Filter */}
      {schedule.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mb-4 space-y-3">
          {/* Next Class */}
          {nextClass && (
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-md cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all"
              onClick={() => openClassModal(nextClass)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-blue-100 text-xs font-medium">Buổi học tiếp theo</p>
                  <p className="font-semibold truncate">{nextClass.tenMonHoc}</p>
                  <div className="flex items-center gap-3 text-sm text-blue-100 mt-0.5">
                    <span>{DAYS_OF_WEEK[nextClass.thu]}</span>
                    <span>•</span>
                    <span>{nextClass.tuGio} - {nextClass.denGio}</span>
                    <span>•</span>
                    <span>{nextClass.tenPhong || 'TBA'}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-200" />
              </div>
            </div>
          )}

          {/* Search & Filter */}
          {/* <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm môn học, mã lớp, giảng viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả môn học</option>
              {uniqueSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div> */}
        </div>
      )}

      {/* Schedule Content */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        {schedule.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">Không có lịch học trong tuần này</p>
                <p className="text-sm mt-1">Hãy chọn tuần khác hoặc làm mới dữ liệu</p>
              </div>
            </CardContent>
          </Card>
        ) : Object.keys(filteredGroupedSchedule).length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">Không tìm thấy kết quả</p>
                <p className="text-sm mt-1">Thử tìm kiếm với từ khóa khác</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => { setSearchQuery(''); setSelectedSubject(''); }}
                >
                  Xóa bộ lọc
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[2, 3, 4, 5, 6, 7, 1].map(day => {
              const daySchedule = filteredGroupedSchedule[day] || [];
              if (daySchedule.length === 0) return null;

              return (
                <Card key={day} className={`border ${DAY_COLORS[day]} shadow-sm`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${day === 1 ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      {DAYS_OF_WEEK[day]}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {daySchedule.length} buổi học
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {daySchedule.map((item, idx) => (
                      <div 
                        key={`${item.id}-${idx}`} 
                        className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative"
                        onClick={() => openClassModal(item)}
                      >
                        {/* Reminder indicator */}
                        {hasReminder(item.maLopHocPhan, day) && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Bell className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        <div className="font-medium text-gray-900 text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {item.tenMonHoc}
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <span className="font-medium">{item.tuGio} - {item.denGio}</span>
                            <span className="text-gray-400">|</span>
                            <span>Tiết {item.tuTiet} - {item.denTiet}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            <span>{item.tenPhong || 'Chưa xác định'}</span>
                            {/* {item.coSoToDisplay && (
                              <>
                                <span className="text-gray-400">|</span>
                                <span className="truncate">{item.coSoToDisplay}</span>
                              </>
                            )} */}
                          </div>
                          
                          {item.giangVien && (
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                              <span className="truncate">{item.giangVien}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <BookIcon className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                            <span className="truncate">{item.maLopHocPhan}</span>
                          </div>
                        </div>

                        {item.isTamNgung && (
                          <div className="mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md inline-block">
                            Tạm ngưng
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        {schedule.length > 0 && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
              <p className="text-2xl font-bold text-blue-600">{schedule.length}</p>
              <p className="text-xs text-gray-500">Tổng buổi học</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
              <p className="text-2xl font-bold text-green-600">
                {new Set(schedule.map(s => s.tenMonHoc)).size}
              </p>
              <p className="text-xs text-gray-500">Môn học</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {Object.keys(groupedSchedule).filter(d => groupedSchedule[Number(d)]?.length > 0).length}
              </p>
              <p className="text-xs text-gray-500">Ngày có lịch</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
              <p className="text-2xl font-bold text-orange-600">
                {schedule.reduce((sum, s) => sum + (s.denTiet - s.tuTiet + 1), 0)}
              </p>
              <p className="text-xs text-gray-500">Tổng tiết học</p>
            </div>
          </div>
        )}
      </main>

      {/* Notification Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Cài đặt thông báo lịch học</h2>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {notificationSettings.is_enabled ? (
                      <Bell className="w-5 h-5 text-green-500" />
                    ) : (
                      <BellOff className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">Bật thông báo</p>
                      <p className="text-xs text-gray-500">Nhận email về lịch học</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationSettings(prev => ({ 
                      ...prev, 
                      is_enabled: !prev.is_enabled 
                    }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notificationSettings.is_enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                      notificationSettings.is_enabled ? 'translate-x-6' : ''
                    }`}></div>
                  </button>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email nhận thông báo
                  </label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={notificationSettings.email || ''}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!notificationSettings.is_enabled}
                    className="w-full"
                  />
                </div>

                {/* Notification Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Loại thông báo
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNotificationSettings(prev => ({ ...prev, notification_type: 'daily' }))}
                      disabled={!notificationSettings.is_enabled}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        notificationSettings.notification_type === 'daily'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      } ${!notificationSettings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      📅 Hàng ngày
                    </button>
                    <button
                      onClick={() => setNotificationSettings(prev => ({ ...prev, notification_type: 'weekly' }))}
                      disabled={!notificationSettings.is_enabled}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        notificationSettings.notification_type === 'weekly'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      } ${!notificationSettings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      📆 Hàng tuần
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {notificationSettings.notification_type === 'daily' 
                      ? 'Nhận thông báo lịch học mỗi ngày' 
                      : 'Nhận thông báo lịch học vào đầu tuần (Chủ nhật)'}
                  </p>
                </div>

                {/* Notification Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Thời gian gửi thông báo
                  </label>
                  <Input
                    type="time"
                    value={notificationSettings.notification_time || '07:00'}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, notification_time: e.target.value }))}
                    disabled={!notificationSettings.is_enabled}
                    className="w-full"
                  />
                </div>

                {/* Send Day Before */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Gửi trước 1 ngày</p>
                    <p className="text-xs text-gray-500">Nhận thông báo vào tối hôm trước</p>
                  </div>
                  <button
                    onClick={() => setNotificationSettings(prev => ({ 
                      ...prev, 
                      send_day_before: !prev.send_day_before 
                    }))}
                    disabled={!notificationSettings.is_enabled || notificationSettings.notification_type === 'weekly'}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notificationSettings.send_day_before && notificationSettings.notification_type === 'daily'
                        ? 'bg-green-500' 
                        : 'bg-gray-300'
                    } ${!notificationSettings.is_enabled || notificationSettings.notification_type === 'weekly' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                      notificationSettings.send_day_before && notificationSettings.notification_type === 'daily' ? 'translate-x-6' : ''
                    }`}></div>
                  </button>
                </div>

                {/* Custom Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tiêu đề email tùy chỉnh (không bắt buộc)
                  </label>
                  <Input
                    type="text"
                    placeholder="Ví dụ: Lịch học của tôi"
                    value={notificationSettings.custom_title || ''}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, custom_title: e.target.value }))}
                    disabled={!notificationSettings.is_enabled}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mặc định: "Lịch học ngày..." hoặc "Lịch học tuần..."
                  </p>
                </div>

                {/* Status Message */}
                {settingsMessage.text && (
                  <div className={`p-3 rounded-lg text-sm ${
                    settingsMessage.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {settingsMessage.text}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(false)}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSavingSettings ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        Lưu cài đặt
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class Detail Modal */}
      {showClassModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-4">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedClass.tenMonHoc}</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedClass.maLopHocPhan}</p>
                </div>
                <button
                  onClick={() => setShowClassModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Class Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <CalendarIcon className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{DAYS_OF_WEEK[selectedClass.thu]}</span>
                  <span className="text-gray-400">|</span>
                  <span>{getClassDate(selectedClass.thu)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span>{selectedClass.tuGio} - {selectedClass.denGio}</span>
                  <span className="text-gray-400">|</span>
                  <span>Tiết {selectedClass.tuTiet} - {selectedClass.denTiet}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <span>{selectedClass.tenPhong || 'Chưa xác định'}</span>
                  {selectedClass.coSoToDisplay && (
                    <>
                      <span className="text-gray-400">|</span>
                      <span>{selectedClass.coSoToDisplay}</span>
                    </>
                  )}
                </div>
                {selectedClass.giangVien && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-4 h-4 text-purple-500" />
                    <span>{selectedClass.giangVien}</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mb-5">
                <a
                  href={getGoogleCalendarUrl(selectedClass)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Thêm vào Google Calendar
                </a>
              </div>

              {/* Existing reminder check */}
              {hasReminder(selectedClass.maLopHocPhan, selectedClass.thu) ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <Bell className="w-5 h-5" />
                    <span className="font-medium">Đã có nhắc nhở cho buổi học này</span>
                  </div>
                  <p className="text-sm text-green-600">
                    Bạn sẽ nhận được email nhắc nhở trước khi buổi học bắt đầu.
                  </p>
                  {classReminders.filter(r => 
                    r.class_id === selectedClass.maLopHocPhan && 
                    r.class_date === getClassDate(selectedClass.thu)
                  ).map(reminder => (
                    <div key={reminder.id} className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-green-600">
                        Nhắc trước {REMIND_OPTIONS.find(o => o.value === reminder.remind_before)?.label || `${reminder.remind_before} phút`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reminder.id && handleDeleteReminder(reminder.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Add Reminder Form */}
                  <div className="border-t border-gray-200 pt-5">
                    <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-500" />
                      Thêm nhắc nhở cho buổi học này
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Email nhận nhắc nhở
                        </label>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          value={reminderEmail}
                          onChange={(e) => setReminderEmail(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Nhắc trước
                        </label>
                        <select
                          value={reminderBefore}
                          onChange={(e) => setReminderBefore(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {REMIND_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <StickyNote className="w-4 h-4 inline mr-1" />
                          Ghi chú (không bắt buộc)
                        </label>
                        <Input
                          type="text"
                          placeholder="Ví dụ: Nhớ mang laptop, làm bài tập..."
                          value={reminderNote}
                          onChange={(e) => setReminderNote(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      {/* Status Message */}
                      {reminderMessage.text && (
                        <div className={`p-3 rounded-lg text-sm ${
                          reminderMessage.type === 'success' 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {reminderMessage.text}
                        </div>
                      )}

                      <Button
                        onClick={handleSaveReminder}
                        disabled={isSavingReminder || !reminderEmail}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isSavingReminder ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4 mr-2" />
                            Tạo nhắc nhở
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
