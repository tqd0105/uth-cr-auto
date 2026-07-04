'use client';

import { useState } from 'react';
import { X, Send, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';

interface AccessRequestModalProps {
  studentId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AccessRequestModal({ studentId, onClose, onSuccess }: AccessRequestModalProps) {
  const [studentName, setStudentName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [existingRequest, setExistingRequest] = useState<{
    status: string;
    admin_note?: string;
  } | null>(null);

  // Check existing request on mount
  useState(() => {
    const checkExisting = async () => {
      try {
        const res = await fetch(`/api/access-request?studentId=${studentId}`);
        const data = await res.json();
        if (data.success && data.hasRequest) {
          setExistingRequest(data.request);
        }
      } catch (e) {
        // Ignore
      }
    };
    checkExisting();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!studentName.trim() || !reason.trim()) {
      setError('Vui lòng điền đầy đủ họ tên và lý do');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          studentName: studentName.trim(),
          email: email.trim() || undefined,
          reason: reason.trim()
        })
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
        onSuccess?.();
      } else {
        setError(data.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show existing request status
  if (existingRequest) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl w-full max-w-md overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Trạng thái yêu cầu</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5">
            <div className="flex flex-col items-center text-center py-4">
              {existingRequest.status === 'pending' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Đang chờ xử lý</h3>
                  <p className="text-gray-400 text-sm">
                    Yêu cầu của bạn đang được admin xem xét. Vui lòng đợi thông báo qua email (nếu bạn đã cung cấp).
                  </p>
                </>
              )}

              {existingRequest.status === 'approved' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Đã được phê duyệt!</h3>
                  <p className="text-gray-400 text-sm">
                    Tài khoản của bạn đã được cấp quyền. Hãy thử đăng nhập lại.
                  </p>
                  {existingRequest.admin_note && (
                    <p className="text-sm text-gray-500 mt-2 italic">
                      "{existingRequest.admin_note}"
                    </p>
                  )}
                </>
              )}

              {existingRequest.status === 'rejected' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Đã bị từ chối</h3>
                  <p className="text-gray-400 text-sm">
                    Rất tiếc, yêu cầu của bạn đã bị từ chối.
                  </p>
                  {existingRequest.admin_note && (
                    <p className="text-sm text-gray-500 mt-2 italic">
                      Lý do: "{existingRequest.admin_note}"
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success message
  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl w-full max-w-md overflow-hidden">
          <div className="p-5">
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Đã gửi yêu cầu!</h3>
              <p className="text-gray-400 text-sm">
                Yêu cầu của bạn đã được gửi đến admin. Bạn sẽ nhận được thông báo qua email khi có kết quả.
              </p>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show request form
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Yêu cầu cấp quyền truy cập</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-sm text-yellow-400">
                ⚠️ Tài khoản <strong>{studentId}</strong> chưa được cấp quyền sử dụng hệ thống. 
                Vui lòng gửi yêu cầu để admin xem xét.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Họ và tên <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email liên hệ <span className="text-gray-500">(để nhận thông báo)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Lý do cần truy cập <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Mô tả ngắn gọn lý do bạn cần sử dụng hệ thống này..."
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>

          <div className="px-5 py-4 border-t border-gray-700 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Gửi yêu cầu
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
