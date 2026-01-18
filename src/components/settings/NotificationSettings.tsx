'use client';

import { useState, useEffect } from 'react';
import { Mail, Save, X, Bell, BellOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface NotificationSettingsProps {
  onClose: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();

      if (data.success) {
        const savedEmail = data.data.notification_email || '';
        setEmail(savedEmail);
        setOriginalEmail(savedEmail);
      }
    } catch (err) {
      setError('Lỗi khi tải cài đặt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    
    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email || null }),
      });

      const data = await response.json();

      if (data.success) {
        setOriginalEmail(email);
        setSuccess(data.message);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setEmail('');
    setError('');
    setSuccess('');

    setIsSaving(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: null }),
      });

      const data = await response.json();

      if (data.success) {
        setOriginalEmail('');
        setSuccess('Đã tắt thông báo email');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = email !== originalEmail;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
        <Card className="w-full max-w-md mx-2">
          <CardContent className="flex items-center justify-center py-6 sm:py-8">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-md shadow-lg mx-2">
        <CardHeader className="bg-purple-600 text-white p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <CardTitle className="text-base sm:text-lg truncate">Cài đặt thông báo</CardTitle>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-1 rounded flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <CardDescription className="text-purple-100 text-xs sm:text-sm">
            Nhận email khi đăng ký tự động thành công hoặc thất bại
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Email Status */}
          <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-gray-50">
            {originalEmail ? (
              <>
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <span className="text-xs sm:text-sm text-green-700">Thông báo đang bật</span>
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <span className="text-xs sm:text-sm text-gray-500">Thông báo đang tắt</span>
              </>
            )}
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700">
              Email nhận thông báo
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500">
              Để trống nếu không muốn nhận thông báo qua email
            </p>
          </div>

          {/* SMTP Notice */}
          {/* <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-sm">
            <p className="text-sm text-amber-700 leading-relaxed">
              <strong className="font-semibold">💡 Lưu ý:</strong> Để gửi email, cần cấu hình SMTP trong file .env.local:
              <br />
              <div className="mt-2 space-y-1">
                <code className="block bg-amber-100 px-2 py-1 rounded text-xs font-mono">SMTP_USER=your-email@gmail.com</code>
                <code className="block bg-amber-100 px-2 py-1 rounded text-xs font-mono">SMTP_PASS=your-app-password</code>
              </div>
            </p>
          </div> */}

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
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-sm h-9 sm:h-10"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Lưu
            </Button>
            {originalEmail && (
              <Button
                onClick={handleClear}
                disabled={isSaving}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 text-sm h-9 sm:h-10"
              >
                <BellOff className="w-4 h-4 mr-2" />
                Tắt thông báo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
