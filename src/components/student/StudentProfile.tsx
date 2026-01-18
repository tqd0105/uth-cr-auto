'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  Building2, 
  Calendar,
  CreditCard,
  BookOpen,
  Award
} from 'lucide-react';
import type { StudentInfo } from '@/lib/types/uth';

interface StudentProfileProps {
  studentInfo: StudentInfo | null;
  isLoading?: boolean;
}

export function StudentProfile({ studentInfo, isLoading }: StudentProfileProps) {
  if (isLoading) {
    return (
      <Card className="border-blue-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Thông tin sinh viên
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!studentInfo) {
    return (
      <Card className="border-blue-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Thông tin sinh viên
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-gray-500 text-center py-4">
            Không thể tải thông tin sinh viên
          </p>
        </CardContent>
      </Card>
    );
  }

  // Combine hoDem and ten to get full name
  const hoTen = `${studentInfo.hoDem} ${studentInfo.ten}`;
  // Convert gioiTinh boolean to string (false = Nam, true = Nữ)
  const gioiTinhStr = studentInfo.gioiTinh ? 'Nữ' : 'Nam';

  const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) => (
    value ? (
      <div className="flex items-start gap-3 py-2">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
        </div>
      </div>
    ) : null
  );

  return (
    <Card className="border-blue-100 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <CardTitle className="text-xl">{hoTen}</CardTitle>
            <p className="text-blue-100 mt-1">MSSV: {studentInfo.maSinhVien}</p>
            {studentInfo.loaiHinhDT && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-medium rounded">
                {studentInfo.loaiHinhDT}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 divide-y md:divide-y-0 divide-gray-100">
          <div className="space-y-1">
            <InfoItem icon={CreditCard} label="Mã sinh viên" value={studentInfo.maSinhVien} />
            <InfoItem icon={Calendar} label="Ngày sinh" value={studentInfo.ngaySinh2} />
            <InfoItem icon={User} label="Giới tính" value={gioiTinhStr} />
            <InfoItem icon={MapPin} label="Nơi sinh" value={studentInfo.noiSinhTinh} />
            <InfoItem icon={Mail} label="Email" value={studentInfo.email} />
            <InfoItem icon={Phone} label="Số điện thoại" value={studentInfo.soDienThoai} />
          </div>
          <div className="space-y-1 pt-2 md:pt-0">
            <InfoItem icon={Building2} label="Khoa" value={studentInfo.khoa} />
            <InfoItem icon={BookOpen} label="Ngành" value={studentInfo.nganh} />
            <InfoItem icon={Award} label="Chuyên ngành" value={studentInfo.chuyenNganh} />
            <InfoItem icon={Calendar} label="Khóa học" value={studentInfo.khoaHoc} />
            <InfoItem icon={GraduationCap} label="Hệ đào tạo" value={studentInfo.heDaoTao} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
