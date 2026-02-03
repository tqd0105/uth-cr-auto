import { UTHApiError, formatCookiesForRequest, parseCookieString, retryAsync } from '../utils';
import type {
  LoginRequest,
  LoginResponse,
  HocPhan,
  LopHocPhan,
  LopHocPhanDetail,
  DangKyHocPhan,
  StudentInfo,
  ApiResponse,
  RegistrationRequest,
  UTHCookies,
  LichHoc
} from '../types/uth';

export class UTHApiService {
  private readonly baseUrl = 'https://portal.ut.edu.vn/api/v1';
  private cookies: UTHCookies = {};
  private authToken: string = '';

  constructor(cookies?: UTHCookies, token?: string) {
    if (cookies) {
      this.cookies = cookies;
    }
    if (token) {
      this.authToken = token;
    }
  }

  /**
   * Update cookies for authentication
   */
  updateCookies(cookies: UTHCookies | string) {
    if (typeof cookies === 'string') {
      this.cookies = parseCookieString(cookies);
    } else {
      this.cookies = cookies;
    }
  }

  /**
   * Set auth token
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Get auth token
   */
  getAuthToken(): string {
    return this.authToken;
  }

  /**
   * Get current cookies as string
   */
  getCookieString(): string {
    return formatCookiesForRequest(this.cookies);
  }

  /**
   * Login to UTH Portal
   */
  async login(credentials: LoginRequest): Promise<{ response: LoginResponse; cookies: UTHCookies; token: string }> {
    try {
      const url = new URL(`${this.baseUrl}/user/login`);
      url.searchParams.set('g-recaptcha-response', credentials['g-recaptcha-response']);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
          'Origin': 'https://portal.ut.edu.vn',
          'Referer': 'https://portal.ut.edu.vn/coursesregistration',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        })
      });

      const data: LoginResponse = await response.json();

      if (!data.success) {
        throw new UTHApiError(data.message || 'Đăng nhập thất bại', data.status);
      }

      // Token is returned in response body
      const token = data.token || '';
      this.authToken = token;

      // Extract cookies from response headers (if any)
      const setCookieHeaders = response.headers.get('set-cookie');
      const newCookies: UTHCookies = {};
      
      if (setCookieHeaders) {
        setCookieHeaders.split(',').forEach(cookie => {
          const [nameValue] = cookie.trim().split(';');
          const [name, value] = nameValue.split('=');
          if (name && value) {
            newCookies[name.trim()] = value.trim();
          }
        });
      }

      this.updateCookies(newCookies);

      return {
        response: data,
        cookies: this.cookies,
        token: token
      };
    } catch (error) {
      if (error instanceof UTHApiError) {
        throw error;
      }
      console.error('Login error:', error);
      throw new UTHApiError('Lỗi kết nối tới server UTH', 500);
    }
  }

  /**
   * Get available courses for registration
   */
  async getAvailableCourses(idDot: number = 75): Promise<HocPhan[]> {
    const url = `${this.baseUrl}/dkhp/getHocPhanHocMoi?idDot=${idDot}`;
    
    const response = await this.authenticatedRequest<HocPhan[]>(url);
    return response.body;
  }

  /**
   * Get class sections for a specific course
   */
  async getClassSections(
    idDot: number,
    maHocPhan: string,
    isLocTrung: boolean = false,
    isLocTrungWithoutElearning: boolean = false
  ): Promise<LopHocPhan[]> {
    const url = `${this.baseUrl}/dkhp/getLopHocPhanChoDangKy?idDot=${idDot}&maHocPhan=${maHocPhan}&isLocTrung=${isLocTrung}&isLocTrungWithoutElearning=${isLocTrungWithoutElearning}`;
    
    const response = await this.authenticatedRequest<LopHocPhan[]>(url);
    return response.body;
  }

  /**
   * Get student profile information
   */
  async getStudentInfo(): Promise<StudentInfo | null> {
    try {
      const url = `${this.baseUrl}/user/getSummaryProfile`;
      const response = await this.authenticatedRequest<StudentInfo>(url);
      return response.body;
    } catch (error) {
      console.error('Failed to get student info:', error);
      return null;
    }
  }

  /**
   * Get student profile image
   */
  async getStudentImage(): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/user/image`;
      const response = await this.authenticatedRequest<string>(url);
      return response.body;
    } catch (error) {
      console.error('Failed to get student image:', error);
      return null;
    }
  }

  /**
   * Get registered courses
   */
  async getRegisteredCourses(idDot: number = 75): Promise<DangKyHocPhan[]> {
    const url = `${this.baseUrl}/dkhp/getLHPDaDangKy?idDot=${idDot}`;
    
    const response = await this.authenticatedRequest<DangKyHocPhan[]>(url);
    return response.body;
  }

  /**
   * Register for a course class
   */
  async registerForClass(request: RegistrationRequest): Promise<boolean> {
    const url = `${this.baseUrl}/dkhp/dangKyLopHocPhan?idLopHocPhan=${request.idLopHocPhan}&g-recaptcha-response=${request['g-recaptcha-response']}`;
    
    try {
      const response = await this.authenticatedRequest<null>(url, {
        method: 'POST'
      });

      return response.success && response.status === 200;
    } catch (error) {
      if (error instanceof UTHApiError) {
        throw error;
      }
      throw new UTHApiError('Đăng ký học phần thất bại', 500);
    }
  }

  /**
   * Cancel course registration
   */
  async cancelRegistration(idDangKy: number, recaptchaToken?: string): Promise<boolean> {
    let url = `${this.baseUrl}/dkhp/huyDangKy?idDangKy=${idDangKy}`;
    if (recaptchaToken) {
      url += `&g-recaptcha-response=${recaptchaToken}`;
    }
    
    console.log('Canceling registration:', url);
    
    try {
      const response = await this.authenticatedRequest<null>(url, {
        method: 'DELETE'
      });

      console.log('Cancel response:', response);
      return response.success && response.status === 200;
    } catch (error) {
      console.error('Cancel error:', error);
      if (error instanceof UTHApiError) {
        throw error;
      }
      throw new UTHApiError('Hủy đăng ký thất bại', 500);
    }
  }

  /**
   * Make authenticated request to UTH API
   */
  private async authenticatedRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
      'Cookie': this.getCookieString(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      'Origin': 'https://portal.ut.edu.vn',
      'Referer': 'https://portal.ut.edu.vn/coursesregistration',
      ...options.headers
    };

    console.log('Making request to:', url);
    console.log('Method:', options.method || 'GET');
    console.log('With token:', this.authToken ? 'present' : 'missing');

    const response = await retryAsync(async () => {
      const res = await fetch(url, {
        ...options,
        headers
      });

      console.log('Response status:', res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new UTHApiError(`HTTP ${res.status}: ${res.statusText}`, res.status);
      }

      return res;
    }, 3, 1000);

    const data: ApiResponse<T> = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    if (!data.success) {
      throw new UTHApiError(data.message || 'API request failed', data.status, 'API_ERROR');
    }

    return data;
  }

  /**
   * Get class schedule detail (chi tiết lịch học của lớp học phần)
   */
  async getClassScheduleDetail(idLopHocPhan: number): Promise<LopHocPhanDetail[]> {
    try {
      const response = await this.authenticatedRequest<LopHocPhanDetail[]>(
        `${this.baseUrl}/dkhp/getLopHocPhanDetail?idLopHocPhan=${idLopHocPhan}`
      );
      return response.body || [];
    } catch (error) {
      console.error('Get class schedule detail error:', error);
      if (error instanceof UTHApiError) {
        throw error;
      }
      throw new UTHApiError('Lấy chi tiết lịch học thất bại', 500);
    }
  }

  /**
   * Get weekly schedule (lịch học tuần)
   */
  async getLichHoc(date: string): Promise<LichHoc[]> {
    try {
      const response = await this.authenticatedRequest<LichHoc[]>(
        `${this.baseUrl}/lichhoc/lichTuan?date=${date}`
      );
      return response.body || [];
    } catch (error) {
      console.error('Get schedule error:', error);
      if (error instanceof UTHApiError) {
        throw error;
      }
      throw new UTHApiError('Lấy lịch học thất bại', 500);
    }
  }

  /**
   * Check if authentication is valid
   */
  async checkAuth(): Promise<boolean> {
    try {
      await this.getRegisteredCourses();
      return true;
    } catch {
      return false;
    }
  }
}

// Export a singleton instance for convenience
let uthApiInstance: UTHApiService | null = null;

export function getUTHApi(cookies?: UTHCookies, token?: string): UTHApiService {
  if (!uthApiInstance || cookies || token) {
    uthApiInstance = new UTHApiService(cookies, token);
  }
  return uthApiInstance;
}