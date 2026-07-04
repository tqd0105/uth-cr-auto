'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ReCaptcha } from '@/components/auth/ReCaptcha';
import { 
  X, 
  Loader2, 
  Users, 
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar
} from 'lucide-react';
import type { HocPhan, LopHocPhan } from '@/lib/types/uth';

interface ClassModalProps {
  course: HocPhan;
  classes: LopHocPhan[];
  isLoading: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClassModal({ course, classes, isLoading, onClose, onSuccess }: ClassModalProps) {
  const [selectedClass, setSelectedClass] = useState<LopHocPhan | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [registrationMode, setRegistrationMode] = useState<'immediate' | 'schedule'>('immediate');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');

  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const handleRegister = async () => {
    if (!selectedClass) {
      setError('Vui lòng chọn lớp học phần');
      return;
    }

    if (recaptchaSiteKey && !recaptchaToken) {
      setError('Vui lòng xác thực reCAPTCHA');
      return;
    }

    setIsRegistering(true);
    setError('');

    try {
      const response = await fetch('/api/courses/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idLopHocPhan: selectedClass.id,
          recaptchaToken: recaptchaToken || 'bypass-for-dev',
          courseName: course.tenHocPhan,
          classCode: selectedClass.maLopHocPhan
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Đăng ký thành công!');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(data.message || 'Đăng ký thất bại');
        setRecaptchaToken('');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
      setRecaptchaToken('');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedClass) {
      setError('Vui lòng chọn lớp học phần');
      return;
    }

    if (!scheduleTime) {
      setError('Vui lòng chọn thời gian đăng ký');
      return;
    }

    setIsScheduling(true);
    setError('');

    try {
      // Parse local datetime and keep it as local time
      // scheduleTime is in format "YYYY-MM-DDTHH:mm" from datetime-local input
      const localDate = new Date(scheduleTime);
      
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseCode: course.maHocPhan,
          courseName: course.tenHocPhan,
          classId: selectedClass.id.toString(),
          classCode: selectedClass.maLopHocPhan,
          // Send as ISO string - the server will interpret it correctly
          scheduleTime: localDate.toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Đã lên lịch đăng ký tự động thành công!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(data.message || 'Lên lịch thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setIsScheduling(false);
    }
  };

  // Get min datetime (now)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-800 to-blue-600 text-white">
          <div>
            <CardTitle className="text-lg">{course.tenHocPhan}</CardTitle>
            <p className="text-sm text-blue-100">
              Mã: {course.maHocPhan} | {course.soTinChi} tín chỉ
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Đang tải danh sách lớp...</span>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Không có lớp học phần nào</p>
            </div>
          ) : (
            <>
              {/* Class List */}
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Chọn lớp học phần:
                </p>
                {classes.map((classItem) => (
                  <div
                    key={classItem.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedClass?.id === classItem.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    } ${!classItem.choDangKy ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => classItem.choDangKy && setSelectedClass(classItem)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {classItem.maLopHocPhan}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          {classItem.lopDuKien && (
                            <span>Lớp: {classItem.lopDuKien}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {classItem.phanTramDangKy}% đã đăng ký
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {classItem.choDangKy ? (
                          <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                            Còn chỗ
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                            Hết chỗ
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          classItem.tenTrangThai === 'Đang chờ đăng ký' 
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {classItem.tenTrangThai}
                        </span>
                      </div>
                    </div>
                    {classItem.isCanhBao && (
                      <p className="text-xs text-orange-600 mt-2">
                        ⚠️ Lớp học phần có cảnh báo
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* reCAPTCHA - Only show in immediate mode */}
              {recaptchaSiteKey && selectedClass && registrationMode === 'immediate' && (
                <div>
                  <ReCaptcha
                    siteKey={recaptchaSiteKey}
                    onVerify={setRecaptchaToken}
                    onExpire={() => setRecaptchaToken('')}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 border-2 border-gray-300 hover:border-gray-400 rounded-xl py-3 font-semibold transition-all duration-300 hover:scale-105"
                >
                  Hủy
                </Button>
                
                {registrationMode === 'immediate' ? (
                  <Button
                    onClick={handleRegister}
                    disabled={!selectedClass || isRegistering || Boolean(recaptchaSiteKey && !recaptchaToken)}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg hover:shadow-xl rounded-xl py-3 font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50"
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Đang đăng ký...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Đăng ký ngay
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSchedule}
                    disabled={!selectedClass || !scheduleTime || isScheduling}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl rounded-xl py-3 font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50"
                  >
                    {isScheduling ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Đang lên lịch...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-5 h-5 mr-2" />
                        Lên lịch
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}