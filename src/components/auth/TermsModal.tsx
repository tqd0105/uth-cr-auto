'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, CheckCircle, X, ScrollText, InfoIcon, Loader2 } from 'lucide-react';

interface TermsModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsModal({ onAccept, onDecline }: TermsModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Đánh dấu đã đọc khi cuộn gần đáy (trong khoảng 50px)
    if (scrollHeight - scrollTop - clientHeight < 50) {
      setHasScrolledToBottom(true);
    }
  };

  // Chỉ ghi nhận vào localStorage, sẽ log consent sau khi đăng nhập thành công
  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      // Lưu thông tin consent tạm vào localStorage để dùng sau khi login
      const consentData = {
        acceptedAt: new Date().toISOString(),
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
      };
      localStorage.setItem('uth-auto-consent-data', JSON.stringify(consentData));
      
      onAccept();
    } catch (error) {
      console.error('Failed to save consent data:', error);
      onAccept();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 border border-yellow-500/30 w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center gap-3">
          <ScrollText className="w-6 h-6" />
          <div>
            <h2 className="text-lg font-bold">Điều khoản sử dụng</h2>
            <p className="text-blue-100 text-sm">Vui lòng đọc kỹ trước khi sử dụng</p>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-gray-300 pro-scrollbar"
          onScroll={handleScroll}
        >
          {/* Giới thiệu */}
          <div className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <h3 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
              <InfoIcon className="w-5 h-5" />
              Giới thiệu
            </h3>
            <p>
              <strong>UTH Auto Registration</strong> là công cụ hỗ trợ đăng ký học phần tự động 
              dành cho sinh viên Trường Đại học Giao thông Vận tải TP.HCM (UTH). 
              Ứng dụng được phát triển nhằm mục đích học tập và nghiên cứu.
            </p>
          </div>

          {/* Cảnh báo quan trọng */}
          <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-lg">
            <h3 className="font-semibold text-red-300 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Cảnh báo quan trọng
            </h3>
            <ul className="list-disc list-inside space-y-2 text-red-700">
              <li>
                Ứng dụng này <strong>KHÔNG</strong> phải là sản phẩm chính thức của UTH.
              </li>
              <li>
                Việc sử dụng có thể vi phạm điều khoản sử dụng của hệ thống đăng ký học phần chính thức.
              </li>
              <li>
                Nhà phát triển <strong>KHÔNG</strong> chịu trách nhiệm cho bất kỳ hậu quả nào 
                phát sinh từ việc sử dụng ứng dụng này.
              </li>
              <li>
                Tài khoản của bạn có thể bị khóa hoặc xử lý kỷ luật nếu trường phát hiện việc sử dụng công cụ tự động.
              </li>
              <li>Việc sử dụng ứng dụng là hoàn toàn tự nguyện.</li>
            </ul>
          </div>

          {/* Điều khoản sử dụng */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">📋 Điều khoản sử dụng</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>Mục đích sử dụng:</strong> Chỉ sử dụng cho tài khoản cá nhân của bạn. 
                Nghiêm cấm sử dụng để đăng ký hộ hoặc mục đích thương mại.
              </li>
              <li>
                <strong>Bảo mật thông tin:</strong> Thông tin đăng nhập của bạn được mã hóa và 
                chỉ lưu trữ tạm thời trong phiên làm việc. Chúng tôi không lưu trữ mật khẩu.
              </li>
              <li>
                <strong>Trách nhiệm:</strong> Bạn hoàn toàn chịu trách nhiệm về việc sử dụng 
                ứng dụng và các hậu quả phát sinh.
              </li>
              <li>
                <strong>Thay đổi dịch vụ:</strong> Ứng dụng có thể ngừng hoạt động bất cứ lúc nào 
                mà không cần thông báo trước.
              </li>
              <li>
                <strong>Không đảm bảo:</strong> Chúng tôi không đảm bảo việc đăng ký học phần 
                sẽ thành công 100%.
              </li>
              <li>
                <strong>Từ chối dịch vụ:</strong> Chúng tôi có quyền từ chối cung cấp dịch vụ cho bất kỳ người dùng nào nếu phát hiện hành vi lạm dụng hoặc sử dụng sai mục đích.
              </li>
            </ol>
          </div>

          {/* Quyền riêng tư */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Quyền riêng tư & Bảo mật
            </h3>
            <ul className="list-disc list-inside space-y-2 text-green-700">
              <li>Chúng tôi <strong>KHÔNG</strong> lưu trữ mật khẩu của bạn.</li>
              <li>Cookie phiên đăng nhập được mã hóa và xóa khi bạn đăng xuất.</li>
              <li>Không chia sẻ thông tin cá nhân với bên thứ ba.</li>
              <li>Dữ liệu được truyền qua kết nối HTTPS an toàn.</li>
              <li>Mặc dù đã áp dụng các biện pháp bảo mật, chúng tôi không đảm bảo an toàn tuyệt đối trước mọi rủi ro kỹ thuật.</li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-800 mb-2">📞 Liên hệ & Hỗ trợ</h3>
            <p className="text-purple-700">
              Nếu có vấn đề gì, vui lòng liên hệ email: 
              <a href="mailto:dtech.webdevteam@gmail.com" className="underline ml-1">dtech.webdevteam@gmail.com</a>
            </p>
          </div>

          {/* Scroll hint */}
          {!hasScrolledToBottom && (
            <div className="text-center text-gray-400 text-xs animate-pulse">
              ↓ Cuộn xuống để đọc hết điều khoản ↓
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-slate-800/50 space-y-4">
          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              disabled={!hasScrolledToBottom}
              className="mt-1 w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 disabled:opacity-50 bg-slate-700"
            />
            <span className={`text-sm ${!hasScrolledToBottom ? 'text-gray-400' : 'text-gray-300'}`}>
              Tôi đã đọc, hiểu rõ và <strong>đồng ý</strong> với tất cả các điều khoản sử dụng, 
              cảnh báo và rủi ro khi sử dụng ứng dụng này.
              {!hasScrolledToBottom && (
                <span className="text-orange-500 ml-1">(Vui lòng đọc hết điều khoản)</span>
              )}
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onDecline}
              variant="outline"
              className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Từ chối
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!isChecked || !hasScrolledToBottom || isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Đồng ý & Tiếp tục
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
