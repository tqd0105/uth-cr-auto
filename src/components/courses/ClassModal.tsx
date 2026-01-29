'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ReCaptcha } from '@/components/auth/ReCaptcha';
import { X, Loader2, Users, CheckCircle, AlertCircle, Clock, Calendar, Crown } from 'lucide-react';
import { useProStatus } from '@/hooks/useProStatus';
import type { HocPhan, LopHocPhan } from '@/lib/types/uth';

interface ClassModalProps {
  course: HocPhan;
  classes: LopHocPhan[];
  isLoading: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClassModal({ course, classes, isLoading, onClose, onSuccess }: ClassModalProps) {
  const { isPro } = useProStatus();
  const [selectedClass, setSelectedClass] = useState<LopHocPhan | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [registrationMode, setRegistrationMode] = useState<'immediate' | 'schedule'>('immediate');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const handleRegister = async () => {
    if (!selectedClass) { setError('Vui lòng chọn lớp học phần'); return; }
    if (recaptchaSiteKey && !recaptchaToken) { setError('Vui lòng xác thực reCAPTCHA'); return; }
    setIsRegistering(true);
    setError('');
    try {
      const response = await fetch('/api/courses/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setTimeout(() => onSuccess(), 1500);
      } else {
        setError(data.message || 'Đăng ký thất bại');
        setRecaptchaToken('');
      }
    } catch {
      setError('Lỗi kết nối server');
      setRecaptchaToken('');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedClass) { setError('Vui lòng chọn lớp học phần'); return; }
    if (!scheduleTime) { setError('Vui lòng chọn thời gian đăng ký'); return; }
    setIsScheduling(true);
    setError('');
    try {
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: course.maHocPhan,
          courseName: course.tenHocPhan,
          classId: selectedClass.id.toString(),
          classCode: selectedClass.maLopHocPhan,
          scheduleTime: new Date(scheduleTime).toISOString()
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Đã lên lịch đăng ký thành công!');
        setTimeout(() => onClose(), 1500);
      } else {
        setError(data.message || 'Lên lịch thất bại');
      }
    } catch {
      setError('Lỗi kết nối server');
    } finally {
      setIsScheduling(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] rounded-lg shadow-xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 border border-yellow-500/30">
        {/* Header */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between bg-gradient-to-r from-blue-600/50 to-cyan-600/50 border-b border-yellow-500/20">
          <div className="min-w-0 flex-1 mr-2">
            <h2 className="text-sm sm:text-lg font-semibold truncate text-gray-100">{course.tenHocPhan}</h2>
            <p className="text-xs sm:text-sm text-gray-300">{course.maHocPhan} • {course.soTinChi} TC</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded flex-shrink-0 hover:bg-white/10 text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto pro-scrollbar">
          {error && (
            <div className="p-2 sm:p-3 rounded flex items-center gap-2 text-xs sm:text-sm bg-red-900/30 border border-red-500/30 text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /><span className="truncate">{error}</span>
            </div>
          )}
          {success && (
            <div className="p-2 sm:p-3 rounded flex items-center gap-2 text-xs sm:text-sm bg-green-900/30 border border-green-500/30 text-green-300">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
            </div>
          )}

          {!success && (
            <>
              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-300">Chế độ đăng ký</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRegistrationMode('immediate')}
                    className={`flex items-center justify-center gap-1 flex-1 p-2 sm:p-3 rounded border-2 text-xs sm:text-sm font-medium transition ${
                      registrationMode === 'immediate' 
                        ? 'border-green-500 bg-green-900/30 text-green-300'
                        : 'border-gray-600 hover:border-gray-500 text-gray-400'
                    }`}
                  >
                    <img src="touch.png" width={20} alt="" />
                     ĐK ngay</button>
                  <button
                    onClick={() => {
                      if (!isPro) {
                        return;
                      }
                      setRegistrationMode('schedule');
                    }}
                    disabled={!isPro}
                    className={`relative flex items-center justify-center gap-1 flex-1 p-2 sm:p-3 rounded border-2 text-xs sm:text-sm font-medium transition ${
                      registrationMode === 'schedule' 
                        ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                        : 'border-gray-600 hover:border-gray-500 text-gray-400'
                    } opacity-50 cursor-not-allowed`}
                  >
                    {!isPro && (
                      <span className="absolute -top-2 -right-2 flex items-center gap-0.5 text-[8px] bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                        <Crown className="w-2.5 h-2.5" /> PRO
                      </span>
                    )}
                    <img src="calendar.png" width={20} alt="" />
                     Hẹn lịch</button>
                </div>
              </div>

              {/* Schedule Time */}
              {registrationMode === 'schedule' && (
                <div className="space-y-2">
                  <label className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${
                    isPro ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <Clock className="w-4 h-4" /> Thời gian
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    min={getMinDateTime()}
                    className="w-full px-2 sm:px-3 py-2 border rounded focus:outline-none focus:ring-2 text-sm bg-slate-800 border-gray-600 text-gray-100 focus:ring-yellow-400/30 focus:border-yellow-400/50"
                  />
                </div>
              )}

              {/* Class List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-6 sm:py-8 text-sm text-gray-400">
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mr-2" />Đang tải...
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-sm text-gray-400">Không có lớp học phần</div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium flex items-center gap-1 text-gray-300">
                    <Users className="w-4 h-4" /> Chọn lớp ({classes.length})
                  </label>
                  <div className="space-y-1.5 sm:space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
                    {classes.map((c) => {
                      const canReg = c.choDangKy !== false;
                      const selected = selectedClass?.id === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => canReg && setSelectedClass(c)}
                          className={`p-2 sm:p-3 border rounded flex items-center justify-between transition ${
                            !canReg 
                              ? 'opacity-50 cursor-not-allowed bg-slate-800/50' 
                              : selected 
                                ? 'border-blue-500 bg-blue-900/30 cursor-pointer' 
                                : 'border-gray-600 hover:border-blue-400/50 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              selected ? 'border-blue-500 bg-blue-500' : 'border-gray-500'
                            }`}>
                              {selected && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs sm:text-sm truncate text-gray-100">{c.maLopHocPhan}</p>
                              <p className="text-[10px] sm:text-xs text-gray-400">{c.phanTramDangKy}% ĐK</p>
                            </div>
                          </div>
                          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                            <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded ${
                              canReg 
                                ? 'bg-green-900/50 text-green-300' 
                                : 'bg-red-900/50 text-red-300'
                            }`}>
                              {canReg ? 'Còn' : 'Hết'}
                            </span>
                            <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded hidden sm:inline bg-slate-700 text-gray-300">{c.tenTrangThai}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* reCAPTCHA */}
              {recaptchaSiteKey && selectedClass && registrationMode === 'immediate' && (
                <div className="transform scale-90 sm:scale-100 origin-left">
                  <ReCaptcha siteKey={recaptchaSiteKey} onVerify={setRecaptchaToken} onExpire={() => setRecaptchaToken('')} />
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-700">
                <Button onClick={onClose} variant="outline" className="flex-1 text-xs sm:text-sm py-2 border-gray-600 text-gray-300 hover:bg-slate-700 hover:border-gray-500">Hủy</Button>
                {registrationMode === 'immediate' ? (
                  <Button
                    onClick={handleRegister}
                    disabled={!selectedClass || isRegistering || Boolean(recaptchaSiteKey && !recaptchaToken)}
                    className="flex-1 text-xs sm:text-sm py-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white shadow-lg shadow-green-500/30"
                  >
                    {isRegistering ? <><Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-1" />Đang ĐK...</> : <><CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Đăng ký</>}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSchedule}
                    disabled={!selectedClass || !scheduleTime || isScheduling}
                    className="flex-1 text-xs sm:text-sm py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                  >
                    {isScheduling ? <><Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-1" />Đang lịch...</> : <><Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Lên lịch</>}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
