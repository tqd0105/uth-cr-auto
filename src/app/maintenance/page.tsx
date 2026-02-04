'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Construction, RefreshCw } from 'lucide-react';

export default function MaintenancePage() {
  const router = useRouter();
  const [message, setMessage] = useState('Hệ thống đang bảo trì, vui lòng quay lại sau.');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Lấy message từ API
    const fetchMessage = async () => {
      try {
        const res = await fetch('/api/admin/maintenance');
        const data = await res.json();
        if (data.success) {
          // Nếu không còn maintenance mode, redirect về trang chủ
          if (!data.data.maintenance_mode) {
            router.push('/');
            return;
          }
          setMessage(data.data.maintenance_message);
        }
      } catch (e) {
        console.error('Failed to fetch maintenance status:', e);
      }
    };

    fetchMessage();
    
    // Auto check every 30 seconds
    const interval = setInterval(fetchMessage, 30000);
    return () => clearInterval(interval);
  }, [router]);

  const handleRefresh = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/admin/maintenance');
      const data = await res.json();
      if (data.success && !data.data.maintenance_mode) {
        router.push('/');
        return;
      }
    } catch (e) {
      console.error('Check maintenance error:', e);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-500/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50">
            <Construction className="w-12 h-12 text-yellow-400 animate-bounce" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Đang Bảo Trì
        </h1>

        {/* Message */}
        <p className="text-gray-300 text-lg mb-8 leading-relaxed">
          {message}
        </p>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isChecking}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
        </button>

        {/* Auto check notice */}
        <p className="text-gray-500 text-sm mt-6">
          Tự động kiểm tra mỗi 30 giây
        </p>

        {/* Logo */}
        <div className="mt-12 opacity-50">
          <img src="/uth.png" alt="UTH" className="h-10 mx-auto" />
        </div>
      </div>
    </div>
  );
}
