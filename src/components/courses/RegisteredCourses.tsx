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

interface RegisteredCoursesProps {
  courses: DangKyHocPhan[];
  onRefresh: () => void;
}

export function RegisteredCourses({ courses, onRefresh }: RegisteredCoursesProps) {
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleCancel = async (course: DangKyHocPhan) => {
    if (!course.isAllowCancel) {
      setError('Không thể hủy đăng ký học phần này');
      return;
    }

    if (!confirm(`Bạn có chắc muốn hủy đăng ký "${course.tenMonHoc}"?`)) {
      return;
    }

    setCancelingId(course.id);
    setError('');

    try {
      const response = await fetch('/api/courses/cancel', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idDangKy: course.id,
          courseName: course.tenMonHoc,
          classCode: course.maLopHocPhan
        }),
      });

      const data = await response.json();

      if (data.success) {
        onRefresh();
      } else {
        setError(data.message || 'Hủy đăng ký thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setCancelingId(null);
    }
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
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Chưa đăng ký học phần nào</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid gap-2 sm:gap-3">
        {courses.map((course) => (
          <Card key={course.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    course.daDongHocPhi ? 'bg-green-100' : 'bg-gray-200'
                  }`}>
                    <img src="tick.png" width={24} className="sm:w-[30px]" alt="" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                      {course.tenMonHoc}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
                      <span className="truncate">Mã LHP: {course.maLopHocPhan}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.soTinChi} TC
                      </span>
                      <span className="font-medium text-blue-600">
                        {formatCurrency(course.mucHocPhi)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                      {course.lopDuKien && (
                        <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded">
                          {course.lopDuKien}
                        </span>
                      )}
                      <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${
                        course.tenTrangThaiDangKy === 'Đăng ký mới' 
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {course.tenTrangThaiDangKy}
                      </span>
                      <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${
                        course.tenTrangThaiLopHocPhan === 'Đang chờ đăng ký'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {course.tenTrangThaiLopHocPhan}
                      </span>
                      {course.daDongHocPhi ? (
                        <span className="text-[10px] sm:text-xs bg-green-100 text-green-600 px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span className="hidden sm:inline">Đã đóng HP</span>
                          <span className="sm:hidden">Đã đóng</span>
                        </span>
                      ) : (
                        <span className="text-[10px] sm:text-xs bg-orange-100 text-orange-600 px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span className="hidden sm:inline">Chưa đóng HP</span>
                          <span className="sm:hidden">Chưa đóng</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                      Đăng ký: {formatDate(course.ngayDangKy)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end sm:justify-start">
                  {course.isAllowCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                      onClick={() => handleCancel(course)}
                      disabled={cancelingId === course.id}
                    >
                      {cancelingId === course.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Hủy
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="mt-3 sm:mt-4 bg-blue-50 border-blue-100">
        <CardContent className="p-3 sm:p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Tổng cộng</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">
                {courses.length} HP | {courses.reduce((sum, c) => sum + c.soTinChi, 0)} TC
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs sm:text-sm text-gray-600">Học phí</p>
              <p className="text-sm sm:text-lg font-bold text-blue-600">
                {formatCurrency(courses.reduce((sum, c) => sum + c.mucHocPhi, 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}