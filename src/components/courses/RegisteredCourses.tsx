'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Clock,
  AlertCircle,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { DangKyHocPhan } from '@/lib/types/uth';
import { CancelModal } from './CancelModal';
import { useProStatus } from '@/hooks/useProStatus';

interface RegisteredCoursesProps {
  courses: DangKyHocPhan[];
  onRefresh: () => void;
}

export function RegisteredCourses({ courses, onRefresh }: RegisteredCoursesProps) {
  const [cancelingCourse, setCancelingCourse] = useState<DangKyHocPhan | null>(null);
  const [error, setError] = useState('');
  const { isPro } = useProStatus();

  const handleCancelClick = (course: DangKyHocPhan) => {
    if (!course.isAllowCancel) {
      setError('Không thể hủy đăng ký học phần này');
      return;
    }
    setCancelingCourse(course);
  };

  const handleCancelSuccess = () => {
    setCancelingCourse(null);
    onRefresh();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  if (courses.length === 0) {
    return (
      <Card className={isPro ? 'pro-card border-0' : ''}>
        <CardContent className="p-8 text-center">
          <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${isPro ? 'text-gray-500' : 'text-gray-400'}`} />
          <p className={isPro ? 'text-gray-400' : 'text-gray-500'}>Chưa đăng ký học phần nào</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {error && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          isPro 
            ? 'bg-red-900/30 border border-red-500/30 text-red-300' 
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid gap-2 sm:gap-3">
        {courses.map((course) => (
          <Card key={course.id} className={`hover:shadow-md transition-all ${
            isPro ? 'pro-card border-0' : ''
          }`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    course.daDongHocPhi 
                      ? isPro ? 'bg-gradient-to-br from-green-600/30 to-emerald-500/30' : 'bg-green-100' 
                      : isPro ? 'bg-slate-700' : 'bg-gray-200'
                  }`}>
                    <img src="tick.png" width={24} className="sm:w-[30px]" alt="" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-semibold text-sm sm:text-base truncate ${
                      isPro ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      {course.tenMonHoc}
                    </h3>
                    <div className={`flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 text-xs sm:text-sm ${
                      isPro ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <span className="truncate">Mã LHP: {course.maLopHocPhan}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.soTinChi} TC
                      </span>
                      <span className={`font-medium ${isPro ? 'text-cyan-400' : 'text-blue-600'}`}>
                        {formatCurrency(course.mucHocPhi)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                      {course.lopDuKien && (
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${
                          isPro ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {course.lopDuKien}
                        </span>
                      )}
                      <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${
                        course.tenTrangThaiDangKy === 'Đăng ký mới' 
                          ? isPro ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600'
                          : isPro ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {course.tenTrangThaiDangKy}
                      </span>
                      <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${
                        course.tenTrangThaiLopHocPhan === 'Đang chờ đăng ký'
                          ? isPro ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-600'
                          : isPro ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {course.tenTrangThaiLopHocPhan}
                      </span>
                      {course.daDongHocPhi ? (
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-1 ${
                          isPro ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-600'
                        }`}>
                          <CheckCircle className="w-3 h-3" />
                          <span className="hidden sm:inline">Đã đóng HP</span>
                          <span className="sm:hidden">Đã đóng</span>
                        </span>
                      ) : (
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-1 ${
                          isPro ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-600'
                        }`}>
                          <XCircle className="w-3 h-3" />
                          <span className="hidden sm:inline">Chưa đóng HP</span>
                          <span className="sm:hidden">Chưa đóng</span>
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] sm:text-xs mt-1 ${
                      isPro ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Đăng ký: {formatDate(course.ngayDangKy)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end sm:justify-start">
                  {course.isAllowCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 ${
                        isPro 
                          ? 'text-red-400 border-red-500/30 hover:bg-red-900/30 hover:border-red-400/50' 
                          : 'text-red-600 border-red-200 hover:bg-red-50'
                      }`}
                      onClick={() => handleCancelClick(course)}
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Hủy
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className={`mt-3 sm:mt-4 ${
        isPro 
          ? 'bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-500/30' 
          : 'bg-blue-50 border-blue-100'
      }`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-xs sm:text-sm ${isPro ? 'text-gray-400' : 'text-gray-600'}`}>Tổng cộng</p>
              <p className={`text-sm sm:text-lg font-bold ${isPro ? 'text-gray-100' : 'text-gray-900'}`}>
                {courses.length} HP | {courses.reduce((sum, c) => sum + c.soTinChi, 0)} TC
              </p>
            </div>
            <div className="text-right">
              <p className={`text-xs sm:text-sm ${isPro ? 'text-gray-400' : 'text-gray-600'}`}>Học phí</p>
              <p className={`text-sm sm:text-lg font-bold ${isPro ? 'pro-text' : 'text-blue-600'}`}>
                {formatCurrency(courses.reduce((sum, c) => sum + c.mucHocPhi, 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Modal */}
      {cancelingCourse && (
        <CancelModal
          course={cancelingCourse}
          onClose={() => setCancelingCourse(null)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </>
  );
}