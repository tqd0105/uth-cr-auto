// Type definitions cho UTH Portal API

export interface LoginRequest {
  username: string;
  password: string;
  'g-recaptcha-response': string;
}

export interface LoginResponse {
  success: boolean;
  status: number;
  message: string;
  body: string;
  token: string | null;
  timestamp: string;
}

export interface HocPhan {
  id: number;
  maHocPhan: string;
  tenHocPhan: string;
  soTinChi: number;
  isBatBuoc: boolean;
  hocPhanTruoc: string | null;
  tenHocPhanTruoc: string | null;
  hocPhanTienQuyet: string | null;
  tenHocPhanTienQuyet: string | null;
  hocPhanSongHanh: string | null;
  tenHocPhanSongHanh: string | null;
  diemTongKet: number | null;
}

export interface LopHocPhan {
  id: number;
  isCanhBao: boolean;
  tenTrangThai: string;
  maLopHocPhan: string;
  lopDuKien: string | null;
  tenMonHoc: string;
  phanTramDangKy: number;
  isHienPhanTram: boolean;
  choDangKy: boolean;
}

export interface DangKyHocPhan {
  id: number;
  maLopHocPhan: string;
  tenMonHoc: string;
  lopDuKien: string;
  soTinChi: number;
  mucHocPhi: number;
  ngayHetHanNopHP: string | null;
  daDongHocPhi: boolean;
  tenTrangThaiDangKy: string;
  ngayDangKy: string;
  tenTrangThaiLopHocPhan: string;
  isAllowCancel: boolean;
}

export interface StudentInfo {
  maSinhVien: string;
  khoaHoc: string;
  hoDem: string;
  ten: string;
  gioiTinh: boolean; // false = Nam, true = Nữ
  ngaySinh2: string;
  noiSinhTinh: string;
  soDienThoai: string;
  heDaoTao: string;
  loaiHinhDT: string;
  nganh: string;
  khoa: string;
  chuyenNganh: string;
  email: string;
  svNganh2: boolean;
  isAllowChangeAvatar: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  status: number;
  message: string | null;
  body: T;
  token: string | null;
  timestamp: string;
}

export interface RegistrationRequest {
  idLopHocPhan: number;
  'g-recaptcha-response': string;
}

export interface UTHCookies {
  [key: string]: string;
}

// Enums
export enum RegistrationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRY = 'retry'
}

export enum CourseRegistrationStatus {
  DANG_CHO_DANG_KY = 'Đang chờ đăng ký',
  DANG_LEN_KE_HOACH = 'Đang lên kế hoạch',
  DANG_KY_MOI = 'Đăng ký mới'
}

// Database types
export interface UserConfig {
  id: number;
  user_session: string;
  uth_cookies: string;
  notification_email?: string;
  created_at: string;
}

export interface RegistrationSchedule {
  id: number;
  user_session: string;
  course_code: string;
  course_name: string;
  class_id: string;
  class_code: string;
  schedule_time: string;
  status: RegistrationStatus;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface RegistrationLog {
  id: number;
  user_session: string;
  action: 'register' | 'cancel';
  course_name: string;
  class_code: string;
  status: 'success' | 'failed';
  message: string;
  created_at: string;
}