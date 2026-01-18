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
import { StudentProfile } from '@/components/student/StudentProfile';
import { StudentProfileModal } from '@/components/student/StudentProfileModal';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
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
  Circle
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
  const [activeTab, setActiveTab] = useState<'available' | 'registered'>('available');
  const [showAutoManager, setShowAutoManager] = useState(false);
  const [showStudentInfo, setShowStudentInfo] = useState(true);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700">Đang tải dữ liệu...</p>
          <p className="text-sm text-gray-500 mt-1">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white text-white shadow-lg py-2">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <a href='/dashboard' className="flex items-center gap-2">
              <img src="uth.png" alt="UTH Logo" className="h-8 sm:h-10" />
            </a>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAutoManager(true)}
                className="text-black hover:bg-gray-300 px-2 sm:px-3"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Tự động</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationSettings(true)}
                className="text-black hover:bg-gray-300 px-2 sm:px-3"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Thông báo</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-black hover:bg-gray-300 disabled:opacity-50 px-2 sm:px-3"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-1">Làm mới</span>
              </Button>
              {/* Profile Avatar Button */}
              <button
                onClick={() => setShowStudentModal(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-gray-400 hover:border-blue-500 transition-colors bg-white/20 flex items-center justify-center"
                title="Thông tin sinh viên"
              >
                {studentImage ? (
                  <img src={studentImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                )}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-black hover:bg-gray-200 px-1 sm:px-2"
              > 
                <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 mt-3 sm:mt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <img src="edit.png" className="w-5 h-5 sm:w-6 sm:h-6" alt="" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">Môn có thể ĐK</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{availableCourses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <img src="verify.png" className="w-5 h-5 sm:w-6 sm:h-6" alt="" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">Đã đăng ký</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{registeredCourses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <img src="mark.png" className="w-5 h-5 sm:w-6 sm:h-6" alt="" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">Tổng tín chỉ</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{totalCredits}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <img src="tuition.png" className="w-5 h-5 sm:w-6 sm:h-6" alt="" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">Học phí</p>
                  <p className="text-sm sm:text-lg font-semibold text-gray-900">{totalFee.toLocaleString('vi-VN')}đ</p>
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
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚠</span>
              {error}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex  sm:flex-row sm:items-center justify-between mb-4 gap-2 sm:gap-3">
          <div className="flex gap-1 sm:gap-2">
            <Button
              variant={activeTab === 'available' ? 'default' : 'outline'}
              onClick={() => {
                setActiveTab('available');
                if (activeTab !== 'available') resetBulkMode();
              }}
              className={`rounded-lg px-2 sm:px-4 py-2 flex gap-1 items-center text-xs sm:text-sm ${
                activeTab === 'available' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Circle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden md:block">Chờ đăng ký</span>
              <span className="md:hidden block">Chờ ĐK</span>
              <span className="ml-1">({availableCourses.length})</span>
            </Button>
            <Button
              variant={activeTab === 'registered' ? 'default' : 'outline'}
              onClick={() => {
                setActiveTab('registered');
                resetBulkMode();
              }}
              className={`rounded-lg px-2 sm:px-4 py-2 flex gap-1 items-center text-xs sm:text-sm ${
                activeTab === 'registered'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden md:block">Đã đăng ký</span>
              <span className="md:hidden block">Đã ĐK</span>
              <span className="ml-1">({registeredCourses.length})</span>
            </Button>
          </div>
          
          {/* Bulk Registration Controls */}
          {activeTab === 'available' && (
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <Button
                onClick={() => {
                  setBulkMode(!bulkMode);
                  setSelectedCourses(new Set());
                }}
                variant={bulkMode ? 'default' : 'outline'}
                className={`rounded-lg px-2 sm:px-4 py-2 text-xs sm:text-sm ${
                  bulkMode 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {bulkMode ? (
                  <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                ) : (
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                )}
                {bulkMode ? 'Thoát' : 'Chọn nhiều'}
              </Button>
              
              {bulkMode && selectedCourses.size > 0 && (
                <>
                  <span className="text-xs sm:text-sm text-gray-600">
                    Chọn: {selectedCourses.size}
                  </span>
                  <Button
                    onClick={handleBulkImmediate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2 sm:px-4 py-2 text-xs sm:text-sm"
                  >
                    <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">ĐK ngay</span>
                  </Button>
                  <Button
                    onClick={handleBulkSchedule}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-2 sm:px-4 py-2 text-xs sm:text-sm"
                  >
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Lên lịch</span>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        {activeTab === 'available' && (
          <div className="mb-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm môn học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div>
          {activeTab === 'available' ? (
            <CourseList 
              courses={filteredCourses} 
              onRefresh={handleRefresh}
              bulkMode={bulkMode}
              selectedCourses={selectedCourses}
              setSelectedCourses={setSelectedCourses}
            />
          ) : (
            <RegisteredCourses 
              courses={registeredCourses} 
              onRefresh={handleRefresh}
            />
          )}
        </div>
      </main>

      {/* Footer - Simplified */}
      <footer className=" bg-gray-300 text-white py-4 sm:py-8 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 text-center">
            <img src="uth.png" className="w-32 sm:w-48" alt="" />
            <div>
              <p className="text-gray-600 text-xs sm:text-sm font-bold">
                Copyright © 2026 - Một sản phẩm của LCV Technology 
              </p>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                Ứng dụng dành riêng cho sinh viên UTH
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Auto Registration Manager Modal */}
      {showAutoManager && (
        <AutoRegistrationManager onClose={() => setShowAutoManager(false)} />
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
    </div>
  );
}