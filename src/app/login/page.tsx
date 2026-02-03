'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { TermsModal } from '@/components/auth/TermsModal';

const TERMS_ACCEPTED_KEY = 'uth-auto-terms-accepted';

export default function LoginPage() {
  const router = useRouter();
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra xem người dùng đã đăng nhập chưa (qua API vì session lưu bằng httpOnly cookie)
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/check');
        const data = await res.json();
        if (data.authenticated) {
          // Đã đăng nhập, redirect về dashboard
          router.replace('/dashboard');
          return;
        }
      } catch (err) {
        // Lỗi thì cho phép đăng nhập
      }

      // Kiểm tra xem người dùng đã chấp nhận điều khoản chưa
      const accepted = localStorage.getItem(TERMS_ACCEPTED_KEY);
      if (accepted === 'true') {
        setTermsAccepted(true);
      } else {
        setShowTerms(true);
      }
      setIsLoading(false);
    };
    
    checkSession();
  }, [router]);

  const handleAccept = () => {
    localStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
    setTermsAccepted(true);
    setShowTerms(false);
  };

  const handleDecline = () => {
    // Chuyển hướng về trang chủ trường hoặc hiển thị thông báo
    window.location.href = 'https://portal.ut.edu.vn';
  };

  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-top bg-no-repeat "
        style={{ backgroundImage: "url('/uth-gate.jpg')" }}
      />
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/40" />
      
      <div className="relative z-10">
        {termsAccepted ? (
          <LoginForm recaptchaSiteKey={recaptchaSiteKey} />
        ) : (
          <div className="text-center text-white">
            <p>Vui lòng chấp nhận điều khoản sử dụng để tiếp tục.</p>
          </div>
        )}
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <TermsModal onAccept={handleAccept} onDecline={handleDecline} />
      )}
    </main>
  );
}