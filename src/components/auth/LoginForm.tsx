'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReCaptcha } from './ReCaptcha';
import { Loader2, User, Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface LoginFormProps {
  recaptchaSiteKey?: string;
}

export function LoginForm({ recaptchaSiteKey }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRecaptchaVerify = useCallback((token: string) => {
    setRecaptchaToken(token);
    setError('');
  }, []);

  const handleRecaptchaExpire = useCallback(() => {
    setRecaptchaToken('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!username.trim()) {
      setError('Vui lòng nhập mã sinh viên');
      return;
    }

    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    if (recaptchaSiteKey && !recaptchaToken) {
      setError('Vui lòng xác thực reCAPTCHA');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          recaptchaToken: recaptchaToken || 'bypass-for-dev'
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Ghi nhận consent log với student_id sau khi đăng nhập thành công
        try {
          // Đọc consent data từ localStorage (được lưu khi user chấp nhận điều khoản)
          const storedConsentData = localStorage.getItem('uth-auto-consent-data');
          const consentData = storedConsentData ? JSON.parse(storedConsentData) : {};
          
          // Lấy student_name từ response nếu có
          const studentName = data.student?.fullName || data.student?.name || '';
          
          await fetch('/api/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: consentData.sessionId || `login-${Date.now()}`,
              studentId: username.trim(),
              studentName: studentName,
              screenResolution: consentData.screenResolution || `${window.screen.width}x${window.screen.height}`,
              timezone: consentData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
              language: consentData.language || navigator.language,
              consentVersion: consentData.consentVersion || '1.0',
              acceptedAt: consentData.acceptedAt || new Date().toISOString(),
            }),
          });
          
          // Xóa consent data sau khi đã ghi nhận thành công
          localStorage.removeItem('uth-auto-consent-data');
        } catch (e) {
          // Ignore consent log errors
        }

        setSuccess('Đăng nhập thành công! Đang chuyển hướng...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        setError(data.message || 'Đăng nhập thất bại');
        // Reset reCAPTCHA on error
        setRecaptchaToken('');
      }
    } catch (err) {
      setError('Lỗi kết nối server. Vui lòng thử lại.');
      setRecaptchaToken('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg mx-2 sm:mx-0">
      <CardHeader className="space-y-1 text-center p-4 sm:p-6">
        <div className="flex items-center justify-center mb-2 sm:mb-4">
            <img src="uth.png" alt="UTH Logo" className="h-16 sm:h-20" />
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold">Đăng nhập</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Đăng ký học phần tự động - UTH Portal
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-2 p-2 sm:p-3 text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="flex items-center gap-2 p-2 sm:p-3 text-xs sm:text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Username Field */}
          <div className="space-y-1.5 sm:space-y-2">
            <label htmlFor="username" className="text-xs sm:text-sm font-medium text-gray-700">
              Mã sinh viên
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="username"
                type="text"
                placeholder="Nhập mã sinh viên"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 text-sm"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 sm:space-y-2">
            <label htmlFor="password" className="text-xs sm:text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* reCAPTCHA */}
          {recaptchaSiteKey && (
            <div className="space-y-2 transform scale-90 sm:scale-100 origin-left">
              <ReCaptcha
                siteKey={recaptchaSiteKey}
                onVerify={handleRecaptchaVerify}
                onExpire={handleRecaptchaExpire}
                theme="light"
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base py-2 sm:py-2.5"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </Button>

          {/* Info Text */}
          <p className="text-[10px] sm:text-xs text-center text-gray-500 mt-3 sm:mt-4">
            Sử dụng tài khoản UTH Portal của bạn để đăng nhập.
            <br />
            Thông tin được mã hóa và bảo mật.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}