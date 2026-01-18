'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  Building2, 
  Calendar,
  BookOpen,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudentInfo } from '@/lib/types/uth';

interface StudentProfileModalProps {
  studentInfo: StudentInfo | null;
  studentImage: string | null;
  isLoading?: boolean;
  onClose: () => void;
}

export function StudentProfileModal({ studentInfo, studentImage, isLoading, onClose }: StudentProfileModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const hoTen = studentInfo ? `${studentInfo.hoDem} ${studentInfo.ten}` : '';
  const gioiTinhStr = studentInfo?.gioiTinh ? 'Nữ' : 'Nam';

  const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) => (
    value ? (
      <div className="flex items-start gap-2 sm:gap-3 py-2 sm:py-3 border-b border-gray-100 last:border-0">
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{value}</p>
        </div>
      </div>
    ) : null
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header với ảnh */}
        <div className="bg-blue-600 text-white p-4 sm:p-6 relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:bg-white/20 rounded-full w-7 h-7 sm:w-8 sm:h-8 p-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-white/20 flex items-center justify-center border-3 sm:border-4 border-white/30 flex-shrink-0">
              {studentImage ? (
                <img 
                  src={studentImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 sm:w-10 sm:h-10 text-white/70" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-5 sm:h-6 bg-white/20 rounded w-28 sm:w-32"></div>
                  <div className="h-4 bg-white/20 rounded w-20 sm:w-24"></div>
                </div>
              ) : studentInfo ? (
                <>
                  <h2 className="text-base sm:text-xl font-bold truncate">{hoTen}</h2>
                  <p className="text-blue-100 text-xs sm:text-sm">MSSV: {studentInfo.maSinhVien}</p>
                  {studentInfo.loaiHinhDT && (
                    <span className="inline-block mt-1 sm:mt-2 px-1.5 sm:px-2 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] sm:text-xs font-medium rounded">
                      {studentInfo.loaiHinhDT}
                    </span>
                  )}
                </>
              ) : (
                <p className="text-blue-100 text-sm">Không có thông tin</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[55vh] sm:max-h-[60vh]">
          {isLoading ? (
            <div className="animate-pulse space-y-3 sm:space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-1 sm:space-y-2">
                    <div className="h-2.5 sm:h-3 bg-gray-200 rounded w-16 sm:w-20"></div>
                    <div className="h-3 sm:h-4 bg-gray-200 rounded w-32 sm:w-40"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : studentInfo ? (
            <div className="space-y-0.5 sm:space-y-1">
              <InfoItem icon={User} label="Giới tính" value={gioiTinhStr} />
              <InfoItem icon={Calendar} label="Ngày sinh" value={studentInfo.ngaySinh2} />
              <InfoItem icon={MapPin} label="Nơi sinh" value={studentInfo.noiSinhTinh} />
              <InfoItem icon={Phone} label="Số điện thoại" value={studentInfo.soDienThoai} />
              <InfoItem icon={Mail} label="Email" value={studentInfo.email} />
              <InfoItem icon={GraduationCap} label="Khóa học" value={studentInfo.khoaHoc} />
              <InfoItem icon={Building2} label="Khoa" value={studentInfo.khoa} />
              <InfoItem icon={BookOpen} label="Ngành" value={studentInfo.nganh} />
              <InfoItem icon={BookOpen} label="Chuyên ngành" value={studentInfo.chuyenNganh} />
              <InfoItem icon={GraduationCap} label="Hệ đào tạo" value={studentInfo.heDaoTao} />
            </div>
          ) : (
            <p className="text-center text-gray-500 py-6 sm:py-8 text-sm">
              Không thể tải thông tin sinh viên
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-3 sm:p-4">
          <Button 
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl text-sm"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
