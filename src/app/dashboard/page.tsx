'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CourseList } from '@/components/courses/CourseList';
import { RegisteredCourses } from '@/components/courses/RegisteredCourses';
import { AutoRegistrationManager } from '@/components/courses/AutoRegistrationManager';
import { BulkRegistrationManager } from '@/components/courses/BulkRegistrationManager';
import { WaitlistManager } from '@/components/courses/WaitlistManager';
import { StudentProfile } from '@/components/student/StudentProfile';
import { StudentProfileModal } from '@/components/student/StudentProfileModal';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { ReportIssueModal } from '@/components/ReportIssueModal';
import { 
  LogOut, 
  RefreshCw, 
  Search, 
  BookOpen, 
  CheckCircle,
  Clock,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Bell,
  Settings,
  Mail,
  Users,
  CheckSquare,
  Circle,
  ListChecks,
  Facebook,
  Phone,
  Menu,
  X,
  CalendarDays
} from 'lucide-react';
import type { HocPhan, DangKyHocPhan, StudentInfo } from '@/lib/types/uth';

export default function DashboardPage() {
  const router = useRouter();
  const [availableCourses, setAvailableCourses] = useState<HocPhan[]>([]);
  const [registeredCourses, setRegisteredCourses] = useState<DangKyHocPhan[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [studentImage, setStudentImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'available' | 'registered' | 'waitlist'>('available');
  const [showAutoManager, setShowAutoManager] = useState(false);
  const [showStudentInfo, setShowStudentInfo] = useState(true);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [bulkDefaultMode, setBulkDefaultMode] = useState<'immediate' | 'schedule'>('immediate');

  // Fetch student info and image
  const fetchStudentInfo = useCallback(async () => {
    setIsLoadingStudent(true);
    try {
      const [infoRes, imageRes] = await Promise.all([
        fetch('/api/student'),
        fetch('/api/student/image')
      ]);
      
      const infoData = await infoRes.json();
      const imageData = await imageRes.json();
      
      if (infoData.sessionExpired || infoRes.status === 401) {
        return; // Will be handled by main fetchData
      }
      
      if (infoData.success && infoData.data) {
        setStudentInfo(infoData.data);
      }
      
      if (imageData.success && imageData.data) {
        setStudentImage(imageData.data);
      }
    } catch (err) {
      console.error('Failed to fetch student info:', err);
    } finally {
      setIsLoadingStudent(false);
    }
  }, []);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setError('');

    try {
      const [availableRes, registeredRes] = await Promise.all([
        fetch('/api/courses/available?idDot=75'),
        fetch('/api/courses/registered?idDot=75')
      ]);

      const availableData = await availableRes.json();
      const registeredData = await registeredRes.json();

      // Check for session expired
      if (availableData.sessionExpired || registeredData.sessionExpired || 
          availableRes.status === 401 || registeredRes.status === 401) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        router.push('/login');
        return;
      }

      if (!availableRes.ok || !availableData.success) {
        throw new Error(availableData.message || 'Lỗi tải dữ liệu');
      }

      setAvailableCourses(availableData.data || []);
      setRegisteredCourses(registeredData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    fetchStudentInfo();
  }, [fetchData, fetchStudentInfo]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleBulkImmediate = () => {
    setBulkDefaultMode('immediate');
    setShowBulkModal(true);
  };

  const handleBulkSchedule = () => {
    setBulkDefaultMode('schedule');
    setShowBulkModal(true);
  };

  const resetBulkMode = () => {
    setBulkMode(false);
    setSelectedCourses(new Set());
  };

  const filteredCourses = availableCourses.filter(course => 
    course.tenHocPhan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.maHocPhan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCredits = registeredCourses.reduce((sum, course) => sum + course.soTinChi, 0);
  const totalFee = registeredCourses.reduce((sum, course) => sum + course.mucHocPhi, 0);

  const handleClearSession = async () => {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' });
    } catch (e) {
      // Ignore errors
    }
    // Clear cookies on client side
    document.cookie = 'user-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pro-bg">
        <div className="pro-particles">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="pro-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 15}s`,
                animationDuration: `${15 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
        <div className="text-center relative z-10">
          <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full animate-spin pro-spinner"></div>
          <p className="pro-text text-lg font-bold">Đang tải dữ liệu...</p>
          <p className="text-sm mt-1 text-yellow-400/60">Vui lòng chờ trong giây lát</p>
          
          {/* Nút xóa phiên khi loading quá lâu */}
          <button
            onClick={handleClearSession}
            className="mt-6 px-4 py-2 text-sm bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <LogOut className="w-4 h-4" />
            Xóa phiên & Đăng nhập lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pro-bg pro-scrollbar">
      {/* Particles Background */}
      <div className="pro-particles">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="pro-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
      
      {/* Header */}
      <header className="pro-header text-white py-2 relative z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <a href='/dashboard' className="flex items-center gap-2">
              <img src="uth.png" alt="UTH Logo" className="h-8 sm:h-10" />
            </a>
            
            {/* Desktop Menu */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/schedule')}
                className="px-3 py-2 text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10"
                title="Xem lịch học"
              >
                <CalendarDays className="w-4 h-4 mr-1" />
                <span className="hidden md:inline text-sm">Lịch học</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAutoManager(true)}
                className="px-3 py-2 text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10"
                title="Đăng ký tự động"
              >
                <Calendar className="w-4 h-4 mr-1" />
                <span className="hidden md:inline text-sm">Tự động</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationSettings(true)}
                className="px-3 py-2 text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10"
                title="Cài đặt thông báo"
              >
                <Bell className="w-4 h-4 mr-1" />
                <span className="hidden md:inline text-sm">Thông báo</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="disabled:opacity-50 px-3 py-2 text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <button
                onClick={() => setShowStudentModal(true)}
                className="w-9 h-9 rounded-full overflow-hidden transition-colors bg-white/20 flex items-center justify-center ml-1 pro-avatar-ring"
                title="Thông tin sinh viên"
              >
                {studentImage ? (
                  <img src={studentImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-yellow-400" />
                )}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                title="Đăng xuất"
              > 
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden md:inline text-sm">Thoát</span>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex sm:hidden items-center gap-2">
              <button
                onClick={() => setShowStudentModal(true)}
                className="w-8 h-8 rounded-full overflow-hidden transition-colors bg-white/20 flex items-center justify-center pro-avatar-ring"
                title="Thông tin sinh viên"
              >
                {studentImage ? (
                  <img src={studentImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-yellow-400" />
                )}
              </button>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg transition-colors hover:bg-yellow-400/10"
              >
                {showMobileMenu ? (
                  <X className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {showMobileMenu && (
          <div className="sm:hidden absolute top-full left-0 right-0 shadow-lg z-50 animate-slide-down bg-gradient-to-b from-slate-900 to-slate-800 border-t border-yellow-500/30">
            <div className="max-w-7xl mx-auto px-4 py-2">
              <button
                onClick={() => {
                  router.push('/schedule');
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-yellow-400/10"
              >
                <CalendarDays className="w-5 h-5 text-cyan-400" />
                <span className="font-medium text-gray-300">Xem lịch học</span>
              </button>
              <button
                onClick={() => {
                  setShowAutoManager(true);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors hover:bg-yellow-400/10"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-gray-300">Đăng ký tự động</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowNotificationSettings(true);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-yellow-400/10"
              >
                <Bell className="w-5 h-5 text-orange-400" />
                <span className="font-medium text-gray-300">Cài đặt thông báo</span>
              </button>
              <button
                onClick={() => {
                  handleRefresh();
                  setShowMobileMenu(false);
                }}
                disabled={isRefreshing}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors disabled:opacity-50 hover:bg-yellow-400/10"
              >
                <RefreshCw className={`w-5 h-5 text-green-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="font-medium text-gray-300">Làm mới dữ liệu</span>
              </button>
              <div className="border-t my-2 border-gray-700"></div>
              <button
                onClick={() => {
                  handleLogout();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-red-500/10"
              >
                <LogOut className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-400">Đăng xuất</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 mt-3 sm:mt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="pro-stats-card border-0">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30">
                  <img src="edit.png" className="w-5 h-5 sm:w-6 sm:h-6" alt="" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs truncate text-gray-400">Môn có thể ĐK</p>
                  <p className="text-xl sm:text-2xl font-semibold pro-text">{availableCourses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="pro-stats-card border-0">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-400 shadow-lg shadow-green-500/30">
                  <img src="verify.png" className="w-5 h-5 sm:w-6 sm:h-6" alt="" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs truncate text-gray-400">Đã đăng ký</p>
                  <p className="text-xl sm:text-2xl font-semibold pro-text">{registeredCourses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="pro-stats-card border-0">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-400 shadow-lg shadow-purple-500/30">
                  <img src="mark.png" className="w-5 h-5 sm:w-6 sm:h-6" alt="" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs truncate text-gray-400">Tổng tín chỉ</p>
                  <p className="text-xl sm:text-2xl font-semibold pro-text">{totalCredits}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="pro-stats-card border-0">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-orange-500 to-yellow-400 shadow-lg shadow-orange-500/30">
                  <img src="tuition.png" className="w-5 h-5 sm:w-6 sm:h-6" alt="" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs truncate text-gray-400">Học phí</p>
                  <p className="text-xl font-semibold truncate pro-text">{totalFee.toLocaleString('vi-VN')}đ</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Student Info Section */}
        {/* <div className="mb-8 animate-fade-in">
          <button
            onClick={() => setShowStudentInfo(!showStudentInfo)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200 hover:bg-white/50 px-3 py-2 rounded-lg"
          >
            {showStudentInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showStudentInfo ? 'Ẩn thông tin sinh viên' : 'Hiển thị thông tin sinh viên'}
          </button>
          {showStudentInfo && (
            <div className="animate-slide-up">
              <StudentProfile studentInfo={studentInfo} isLoading={isLoadingStudent} />
            </div>
          )}
        </div> */}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-500/30 text-red-300">
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚠</span>
              {error}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-col gap-2 mb-4">
          {/* Tab buttons row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button
                variant={activeTab === 'available' ? 'default' : 'outline'}
                onClick={() => {
                  setActiveTab('available');
                  if (activeTab !== 'available') resetBulkMode();
                }}
                className={`rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 flex items-center text-xs sm:text-sm ${
                  activeTab === 'available' 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/30' 
                    : 'border border-gray-600 bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 hover:border-blue-400/50 hover:text-blue-400'
                }`}
              >
                <Circle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">Chờ ĐK</span>
                <span className="sm:hidden">{availableCourses.length}</span>
                <span className="hidden sm:inline ml-1">({availableCourses.length})</span>
              </Button>
              <Button
                variant={activeTab === 'registered' ? 'default' : 'outline'}
                onClick={() => {
                  setActiveTab('registered');
                  resetBulkMode();
                }}
                className={`rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 flex items-center text-xs sm:text-sm ${
                  activeTab === 'registered'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:from-green-700 hover:to-emerald-600 shadow-lg shadow-green-500/30' 
                    : 'border border-gray-600 bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 hover:border-green-400/50 hover:text-green-400'
                }`}
              >
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">Đã ĐK</span>
                <span className="sm:hidden">{registeredCourses.length}</span>
                <span className="hidden sm:inline ml-1">({registeredCourses.length})</span>
              </Button>
              <Button
                variant={activeTab === 'waitlist' ? 'default' : 'outline'}
                onClick={() => {
                  setActiveTab('waitlist');
                  resetBulkMode();
                }}
                className={`rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 flex items-center text-xs sm:text-sm relative ${
                  activeTab === 'waitlist'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:from-orange-700 hover:to-amber-600 shadow-lg shadow-orange-500/30' 
                    : 'border border-gray-600 bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 hover:border-orange-400/50 hover:text-orange-400'
                }`}
              >
                <ListChecks className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">Waitlist</span>
              </Button>
            </div>
            
            {/* Bulk mode toggle button */}
            {activeTab === 'available' && (
              <Button
                onClick={() => {
                  setBulkMode(!bulkMode);
                  setSelectedCourses(new Set());
                }}
                variant={bulkMode ? 'default' : 'outline'}
                className={`rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm relative ${
                  bulkMode 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:from-purple-700 hover:to-pink-600 shadow-lg shadow-purple-500/30' 
                    : 'border border-gray-600 bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 hover:border-purple-400/50 hover:text-purple-400'
                }`}
              >
                {bulkMode ? (
                  <>
                    <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Thoát</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Chọn</span>
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Bulk action bar - separate row when active */}
          {activeTab === 'available' && bulkMode && selectedCourses.size > 0 && (
            <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-purple-900/30 border border-purple-500/30">
              <span className="text-xs sm:text-sm font-medium text-purple-300">
                Đã chọn: {selectedCourses.size} môn
              </span>
              <div className="flex gap-1.5">
                <Button
                  onClick={handleBulkImmediate}
                  size="sm"
                  className="rounded-md px-2 sm:px-3 py-1 h-7 text-xs bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white shadow-lg shadow-emerald-500/30"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  ĐK ngay
                </Button>
                <Button
                  onClick={handleBulkSchedule}
                  size="sm"
                  className="rounded-md px-2 sm:px-3 py-1 h-7 text-xs bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  Lên lịch
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        {activeTab === 'available' && (
          <div className="mb-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-yellow-400/70" />
              <Input
                type="text"
                placeholder="Tìm kiếm môn học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg text-sm bg-slate-800/50 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/30"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div>
          {activeTab === 'available' ? (
            <CourseList 
              courses={filteredCourses} 
              registeredCourses={registeredCourses}
              onRefresh={handleRefresh}
              bulkMode={bulkMode}
              selectedCourses={selectedCourses}
              setSelectedCourses={setSelectedCourses}
            />
          ) : activeTab === 'registered' ? (
            <RegisteredCourses 
              courses={registeredCourses} 
              onRefresh={handleRefresh}
            />
          ) : (
            <WaitlistManager onRefresh={handleRefresh} />
          )}
        </div>
      </main>

      {/* Footer - Simplified */}
      <footer className="py-2 sm:py-6 mt-6 sm:mt-8 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Logo & Info */}
            <div className="flex flex-col items-center md:items-start gap-2 sm:gap-3">
              <img src="uth.png" className="w-24 sm:w-40" alt="UTH Logo" />
              <div className="text-center md:text-left">
                <p className="text-xs sm:text-lg font-bold pro-text">
                  UTH Auto Registration
                </p>
                <p className="text-xs text-gray-400">
                  Hệ thống đăng ký học phần tự động dành cho sinh viên UTH
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="text-center md:text-left">
              <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 text-yellow-400">
                Liên hệ
              </h3>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-400">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                  <a href="mailto:support@uth-auto.com" className="transition">
                    Email: <span className="font-semibold text-gray-300">dtech.webdevteam@gmail.com</span>
                  </a>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Facebook className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Facebook: <span className="font-semibold text-gray-300">LCV Technology</span></span>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Hotline: <span className="font-semibold text-gray-300">1900-0105</span></span>
                </div>
              </div>
            </div>

            {/* Report Issue */}
            <div className="text-center md:text-left">
              <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 text-yellow-400">
                Báo cáo vấn đề
              </h3>
              <p className="text-xs sm:text-sm mb-2 sm:mb-3 text-gray-400">
                Gặp vấn đề? Gửi báo cáo cho chúng tôi:
              </p>
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded transition bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/30"
              >
                <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                Gửi báo cáo
              </button>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-3 sm:pt-4 border-t border-gray-700">
            <p className="text-xs sm:text-sm font-bold text-center pro-text">
              Copyright © 2026 - Một sản phẩm của LCV Technology 
            </p>
            <p className="text-xs text-center mt-1 text-gray-500">
              Ứng dụng dành riêng cho sinh viên UTH
            </p>
          </div>
        </div>
      </footer>

      {/* Auto Registration Manager Modal */}
      {showAutoManager && (
        <AutoRegistrationManager 
          onClose={() => setShowAutoManager(false)}
        />
      )}

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
      )}

      {/* Bulk Registration Modal */}
      {showBulkModal && (
        <BulkRegistrationManager
          selectedCourses={filteredCourses.filter(c => selectedCourses.has(c.id))}
          defaultMode={bulkDefaultMode}
          onClose={() => {
            setShowBulkModal(false);
            resetBulkMode();
          }}
        />
      )}

      {/* Student Profile Modal */}
      {showStudentModal && (
        <StudentProfileModal
          studentInfo={studentInfo}
          studentImage={studentImage}
          isLoading={isLoadingStudent}
          onClose={() => setShowStudentModal(false)}
        />
      )}

      {/* Report Issue Modal */}
      {showReportModal && (
        <ReportIssueModal onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}