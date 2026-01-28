import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ProStatus } from '@/lib/types/uth';
import { Crown } from 'lucide-react';

interface UseProStatusReturn {
  isPro: boolean;
  proStatus: ProStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Context để share Pro status giữa các components
const ProContext = createContext<UseProStatusReturn | null>(null);

export function ProProvider({ children }: { children: React.ReactNode }) {
  const proStatus = useProStatusInternal();
  return <ProContext.Provider value={proStatus}>{children}</ProContext.Provider>;
}

function useProStatusInternal(): UseProStatusReturn {
  const [proStatus, setProStatus] = useState<ProStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/donate');
      const data = await res.json();
      
      if (data.success && data.data) {
        setProStatus({
          is_pro: data.data.is_pro,
          active_period_id: data.data.current_period_id,
          total_donated: data.data.total_donated,
          donations: data.data.donations
        });
        setError(null);
      } else {
        setProStatus({ is_pro: false, total_donated: 0, donations: [] });
      }
    } catch (err) {
      setError('Lỗi khi kiểm tra trạng thái Pro');
      setProStatus({ is_pro: false, total_donated: 0, donations: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProStatus();
  }, [fetchProStatus]);

  return {
    isPro: proStatus?.is_pro || false,
    proStatus,
    loading,
    error,
    refetch: fetchProStatus
  };
}

export function useProStatus(): UseProStatusReturn {
  const context = useContext(ProContext);
  if (context) return context;
  
  // Fallback nếu không có Provider
  return useProStatusInternal();
}

// Component để wrap tính năng Pro với UI đẹp
interface ProFeatureProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  feature: string;
  description?: string;
  onUpgrade?: () => void;
}

export function ProFeature({ children, fallback, feature, description, onUpgrade }: ProFeatureProps) {
  const { isPro, loading } = useProStatus();

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded h-10 w-full" />;
  }

  if (!isPro) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="relative group">
        <div className="opacity-40 pointer-events-none blur-[1px] select-none">
          {children}
          
        </div>
        <div className="absolute inset-0  flex items-center justify-center bg-black rounded-lg">
            <button
              onClick={onUpgrade}
              className="group relative bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-2xl transform hover:scale-105 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 mx-auto overflow-hidden"
            >
              <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
              <svg className="w-5 h-5 relative" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="relative">Nâng cấp PRO</span>
            </button>
            {/* <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl animate-pulse opacity-30"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xs">⭐</span>
              </div>
            </div> */}
            
            {/* <h3 className="text-white font-bold text-xl mb-2 drop-shadow-lg">{feature}</h3>
            {description && (
              <p className="text-gray-200 text-sm mb-5 max-w-xs mx-auto leading-relaxed">{description}</p>
            )}
            
            
            
            <p className="text-gray-300 text-xs mt-4 flex items-center justify-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              Chỉ từ <span className="font-semibold text-yellow-400">12.000đ</span>/đợt ĐKHP
            </p> */}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Pro Locked Screen cho modal
interface ProLockedScreenProps {
  feature: string;
  description?: string;
  onUpgrade?: () => void;
  onClose?: () => void;
}

export function ProLockedScreen({ feature, description, onUpgrade, onClose }: ProLockedScreenProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-300">
        {/* Header với gradient */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 px-6 py-4 text-center relative overflow-hidden">
          {/* Background decorations */}
          {/* <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-full blur-3xl"></div>
          </div> */}
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="relative bg-gray-200 rounded-2xl p-2 flex flex-col items-center rounded-xl shadow-lg">
            {/* Premium icon */}
            <div className="relative w-24 h-24 mx-auto ">
              {/* <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl rotate-6 opacity-50"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl -rotate-6 opacity-50"></div> */}
              <div className="relative w-full h-full  flex items-center justify-center ">
                <Crown className="w-12 h-12 text-yellow-500 drop-shadow-lg" />
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 px-4 py-1.5 rounded-full mb-3">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
              <span className="text-yellow-400 text-sm font-medium">Tính năng Premium</span>
            </div>
            
            <h2 className=" font-bold text-2xl mb-2">{feature}</h2>
            
          </div>
        </div>
        
        {/* Content */}
        <div className="p-2 bg-gradient-to-b from-gray-50 to-white">
          {/* Benefits */}
          <div className="bg-white rounded-2xl p-2 mb-2 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Crown className="w-6 h-6 text-black" />
              </div>
              Quyền lợi PRO
            </h3>
            <ul className="space-y-3">
              {[
                { icon: '🗓️', text: 'Hẹn lịch đăng ký tự động' },
                { icon: '⏳', text: 'Chờ slot khi lớp học phần đầy' },
                { icon: '⚡', text: 'Đăng ký nhiều lớp cùng lúc' },
                { icon: '📧', text: 'Thông báo lịch học qua email' },
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-gray-700">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.text}</span>
                  <svg className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </li>
              ))}
            </ul>
          </div>

          {/* Price Card */}
          <div className="bg-gradient-to-r from-yellow-50 via-orange-50 to-yellow-50 rounded-2xl p-5 mb-2 border border-yellow-100 text-center">
            <span className="text-gray-500 text-sm">Chỉ từ</span>
            <div className="flex items-baseline justify-center gap-1 my-1">
              <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 p-1 rounded-xl">
                12.000
              </span>
              <span className="text-lg font-bold text-orange-500">đ</span>
            </div>
            <span className="text-gray-500 text-sm">cho mỗi đợt ĐKHP</span>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Thanh toán an toàn & bảo mật</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              Để sau
            </button>
            <button
              onClick={onUpgrade}
              className="flex-1 px-4 py-3.5 bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></span>
              <svg className="w-5 h-5 relative" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span className="relative">Donate ngay</span>
            </button>
          </div>
          
          {/* Footer note */}
          {/* <p className="text-center text-xs text-gray-400 mt-4">
            Ủng hộ để duy trì và phát triển dịch vụ 💝
          </p> */}
        </div>
      </div>
    </div>
  );
}

// Badge component nổi bật
export function ProBadge({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const { isPro } = useProStatus();

  if (!isPro) return null;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1'
  };

  return (
    <span className={`inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-full shadow-md animate-pulse ${sizeClasses[size]} ${className}`}>
      <span>⭐</span>
      <span>PRO</span>
    </span>
  );
}

// Pro Required Badge (hiển thị khi tính năng cần Pro)
export function ProRequiredBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 bg-gradient-to-r from-gray-700 to-gray-800 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full ${className}`}>
      <span>⭐</span>
      <span>PRO</span>
    </span>
  );
}
