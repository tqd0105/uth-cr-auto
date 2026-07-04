'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Calendar, CheckSquare, Square, Loader2, AlertCircle, Users, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProStatus, ProLockedScreen } from '@/hooks/useProStatus';
import type { HocPhan, LopHocPhan } from '@/lib/types/uth';

interface BulkRegistrationManagerProps {
  onClose: () => void;
  selectedCourses: HocPhan[];
  defaultMode?: 'immediate' | 'schedule';
}

interface CourseWithClasses {
  course: HocPhan;
  classes: LopHocPhan[];
  selectedClassId?: number;
  isLoading: boolean;
  error?: string;
}

export function BulkRegistrationManager({ onClose, selectedCourses, defaultMode = 'immediate' }: BulkRegistrationManagerProps) {
  const { isPro, loading: proLoading } = useProStatus();
  const [coursesData, setCoursesData] = useState<CourseWithClasses[]>([]);
  const [scheduleTime, setScheduleTime] = useState('');
  const [registrationMode, setRegistrationMode] = useState<'schedule' | 'immediate'>(defaultMode);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Nếu không phải Pro, hiển thị màn hình locked
  if (!proLoading && !isPro) {
    return (
      <ProLockedScreen
        feature="Đăng ký nhiều lớp cùng lúc"
        description="Chọn và đăng ký nhiều lớp học phần cùng một lúc, tiết kiệm thời gian khi đăng ký!"
        onClose={onClose}
      />
    );
  }

  useEffect(() => {
    // Initialize courses data
    const initialData = selectedCourses.map(course => ({
      course,
      classes: [],
      isLoading: true
    }));
    setCoursesData(initialData);

    // Fetch classes for each course
    selectedCourses.forEach((course, index) => {
      fetchClassesForCourse(course, index);
    });
  }, [selectedCourses]);

  const fetchClassesForCourse = async (course: HocPhan, index: number) => {
    try {
      const response = await fetch(`/api/courses/classes?maHocPhan=${course.maHocPhan}`);
      const data = await response.json();

      if (data.success && data.data) {
        setCoursesData(prev => prev.map((item, i) => 
          i === index ? { ...item, classes: data.data, isLoading: false } : item
        ));
      } else {
        setCoursesData(prev => prev.map((item, i) => 
          i === index ? { ...item, error: 'Không thể tải lớp học', isLoading: false } : item
        ));
      }
    } catch (err) {
      setCoursesData(prev => prev.map((item, i) => 
        i === index ? { ...item, error: 'Lỗi kết nối', isLoading: false } : item
      ));
    }
  };

  const handleClassSelection = (courseIndex: number, classId: number, canRegister: boolean) => {
    if (!canRegister) return; // Không cho chọn lớp không thể đăng ký
    setCoursesData(prev => prev.map((item, i) => 
      i === courseIndex ? { ...item, selectedClassId: classId } : item
    ));
  };

  const handleBulkSchedule = async () => {
    if (!scheduleTime) {
      setError('Vui lòng chọn thời gian đăng ký');
      return;
    }

    // Validate all courses have selected classes
    const unselectedCourses = coursesData.filter(item => !item.selectedClassId);
    if (unselectedCourses.length > 0) {
      setError(`Vui lòng chọn lớp học cho: ${unselectedCourses.map(c => c.course.tenHocPhan).join(', ')}`);
      return;
    }

    setIsScheduling(true);
    setError('');
    setSuccess('');

    try {
      // Parse local datetime
      const localDate = new Date(scheduleTime);
      const schedulePromises = coursesData.map(async (courseData) => {
        const selectedClass = courseData.classes.find(c => c.id === courseData.selectedClassId);
        if (!selectedClass) return null;

        const response = await fetch('/api/scheduler', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseCode: courseData.course.maHocPhan,
            courseName: courseData.course.tenHocPhan,
            classId: selectedClass.id.toString(),
            classCode: selectedClass.maLopHocPhan,
            scheduleTime: localDate.toISOString()
          }),
        });

        const data = await response.json();
        return { 
          courseName: courseData.course.tenHocPhan, 
          success: data.success, 
          message: data.message 
        };
      });

      const results = await Promise.all(schedulePromises);
      const successCount = results.filter(r => r && r.success).length;
      const totalCount = results.filter(r => r !== null).length;

      if (successCount === totalCount) {
        setSuccess(`🎉 Đã lên lịch thành công cho ${successCount} môn học!`);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const failedCourses = results.filter(r => r && !r.success).map(r => r!.courseName);
        setError(`Lên lịch thành công ${successCount}/${totalCount} môn. Lỗi: ${failedCourses.join(', ')}`);
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleImmediateRegistration = async () => {
    // Validate all courses have selected classes
    const unselectedCourses = coursesData.filter(item => !item.selectedClassId);
    if (unselectedCourses.length > 0) {
      setError(`Vui lòng chọn lớp học cho: ${unselectedCourses.map(c => c.course.tenHocPhan).join(', ')}`);
      return;
    }

    setIsRegistering(true);
    setError('');
    setSuccess('');

    try {
      const registrationPromises = coursesData.map(async (courseData) => {
        const selectedClass = courseData.classes.find(c => c.id === courseData.selectedClassId);
        if (!selectedClass) return null;

        const response = await fetch('/api/courses/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idLopHocPhan: selectedClass.id,
            recaptchaToken: '',
            courseName: courseData.course.tenHocPhan,
            classCode: selectedClass.maLopHocPhan,
            isBulk: true
          }),
        });

        const data = await response.json();
        return { 
          courseName: courseData.course.tenHocPhan,
          className: selectedClass.maLopHocPhan,
          success: data.success, 
          message: data.message 
        };
      });

      const results = await Promise.all(registrationPromises);
      const successCount = results.filter(r => r && r.success).length;
      const totalCount = results.filter(r => r !== null).length;

      if (successCount === totalCount) {
        setSuccess(`🎉 Đã đăng ký thành công ${successCount} môn học!`);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const failedCourses = results.filter(r => r && !r.success).map(r => `${r!.courseName} (${r!.className}): ${r!.message}`);
        setError(`Đăng ký thành công ${successCount}/${totalCount} môn.\n${failedCourses.join('\n')}`);
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setIsRegistering(false);
    }
  };

  // Get min datetime (now)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-lg border">
        <CardHeader className="bg-emerald-600 text-white p-3 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold">
                  Đăng ký hàng loạt
                </CardTitle>
                <CardDescription className="text-emerald-100 text-xs sm:text-sm">
                  Chọn lớp cho {selectedCourses.length} môn
                </CardDescription>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:bg-white/20 p-1.5 sm:p-2 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-5 space-y-3 sm:space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Registration Mode Selection */}
          <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Chế độ đăng ký
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRegistrationMode('immediate')}
                className={`p-2 sm:p-3 rounded border-2 text-left transition ${
                  registrationMode === 'immediate'
                    ? 'border-emerald-500 bg-emerald-900/30'
                    : 'border-slate-600 hover:border-emerald-500/30 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-0.5 sm:mb-1">
                  <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center ${
                    registrationMode === 'immediate' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'
                  }`}>
                    {registrationMode === 'immediate' && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>}
                  </div>
                  <span className="flex items-center gap-1 font-medium text-gray-100 text-xs sm:text-sm"><img src="touch.png" width={20} alt="" /> ĐK ngay</span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">Đăng ký tất cả môn ngay</p>
              </button>
              
              <button
                onClick={() => setRegistrationMode('schedule')}
                className={`p-2 sm:p-3 rounded border-2 text-left transition ${
                  registrationMode === 'schedule'
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-slate-600 hover:border-blue-500/30 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-0.5 sm:mb-1">
                  <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center ${
                    registrationMode === 'schedule' ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                  }`}>
                    {registrationMode === 'schedule' && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>}
                  </div>
                  <span className="flex items-center gap-1 font-medium text-gray-100 text-xs sm:text-sm"><img src="calendar.png" width={20} alt="" /> Hẹn lịch</span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-600 hidden sm:block">Đặt thời gian ĐK tự động</p>
              </button>
            </div>
          </div>

          {/* Time Selection - Only show in schedule mode */}
          {registrationMode === 'schedule' && (
            <div className="space-y-2 p-3 sm:p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Thời gian đăng ký
              </label>
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                min={getMinDateTime()}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <p className="text-[10px] sm:text-xs text-gray-600">
                Tất cả môn sẽ được đăng ký vào thời gian này
              </p>
            </div>
          )}

          {/* Course List */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="font-medium text-gray-700 flex items-center gap-2 text-xs sm:text-sm">
              <CheckSquare className="w-4 h-4" />
              Chọn lớp cho từng môn
            </h3>
            
            {coursesData.map((courseData, index) => (
              <Card key={courseData.course.id} className="border shadow-sm">
                <CardContent className="p-2 sm:p-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{courseData.course.tenHocPhan}</h4>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          {courseData.course.maHocPhan} • {courseData.course.soTinChi} TC
                        </p>
                      </div>
                    </div>

                    {courseData.isLoading && (
                      <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang tải...
                      </div>
                    )}

                    {courseData.error && (
                      <div className="flex items-center gap-2 text-red-600 text-xs sm:text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {courseData.error}
                      </div>
                    )}

                    {courseData.classes.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                        {courseData.classes.map((classItem) => {
                          const canRegister = classItem.choDangKy !== false;
                          return (
                          <div
                            key={classItem.id}
                            className={`p-2 sm:p-3 border rounded transition ${
                              !canRegister 
                                ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                : 'cursor-pointer'
                            } ${
                              courseData.selectedClassId === classItem.id
                                ? 'border-emerald-500 bg-emerald-50'
                                : canRegister 
                                  ? 'border-gray-200 hover:border-emerald-300'
                                  : 'border-gray-200'
                            }`}
                            onClick={() => handleClassSelection(index, classItem.id, canRegister)}
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              {courseData.selectedClassId === classItem.id ? (
                                <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                              ) : (
                                <Square className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">{classItem.maLopHocPhan}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{classItem.tenTrangThai}</p>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-1 flex-shrink-0">
                                {canRegister ? (
                                  <span className="px-1 sm:px-2 py-0.5 bg-green-100 text-green-700 text-[10px] sm:text-xs rounded">
                                    Còn
                                  </span>
                                ) : (
                                  <span className="px-1 sm:px-2 py-0.5 bg-red-100 text-red-700 text-[10px] sm:text-xs rounded">
                                    Hết
                                  </span>
                                )}
                                <span className={`px-1 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded ${
                                  classItem.phanTramDangKy >= 80 
                                    ? 'bg-red-100 text-red-700' 
                                    : classItem.phanTramDangKy >= 50 
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {classItem.phanTramDangKy}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )})}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs sm:text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs sm:text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 text-xs sm:text-sm py-2"
            >
              Hủy
            </Button>
            
            {registrationMode === 'immediate' ? (
              <Button
                onClick={handleImmediateRegistration}
                disabled={isRegistering}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm py-2"
              >
                {isRegistering ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-1 sm:mr-2" />
                ) : (
                  <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                )}
                {isRegistering ? 'Đang ĐK...' : `ĐK ${coursesData.length} môn`}
              </Button>
            ) : (
              <Button
                onClick={handleBulkSchedule}
                disabled={isScheduling || !scheduleTime}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm py-2"
              >
                {isScheduling ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-1 sm:mr-2" />
                ) : (
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                )}
                {isScheduling ? 'Đang lịch...' : `Lên lịch ${coursesData.length}`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
