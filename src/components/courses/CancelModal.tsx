'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import type { DangKyHocPhan } from '@/lib/types/uth';

interface CancelModalProps {
  course: DangKyHocPhan;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelModal({ course, onClose, onSuccess }: CancelModalProps) {
  const [isCanceling, setIsCanceling] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const expectedText = 'HUỶ';

  const handleCancel = async () => {
    if (confirmText !== expectedText) {
      setError(`Vui lòng nhập "${expectedText}" để xác nhận`);
      return;
    }

    setIsCanceling(true);
    setError('');

    try {
      const response = await fetch('/api/courses/cancel', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idDangKy: course.id,
          courseName: course.tenMonHoc,
          classCode: course.maLopHocPhan
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || 'Hủy đăng ký thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setIsCanceling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 border border-red-500/30 w-full max-w-md rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600/50 to-red-700/50 text-gray-100 px-5 py-4 flex items-center justify-between border-b border-red-500/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Xác nhận hủy đăng ký</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-red-500/20 rounded text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Warning */}
          <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-lg">
            <p className="text-red-300 text-sm">
              ⚠️ Bạn đang chuẩn bị hủy đăng ký học phần. Hành động này không thể hoàn tác.
            </p>
          </div>

          {/* Course Info */}
          <div className="p-4 bg-slate-700/50 rounded-lg space-y-2 border border-slate-600">
            <h3 className="font-semibold text-gray-100">{course.tenMonHoc}</h3>
            <div className="text-sm text-gray-400 space-y-1">
              <p>📚 Mã LHP: <span className="font-medium">{course.maLopHocPhan}</span></p>
              <p>📖 Số tín chỉ: <span className="font-medium">{course.soTinChi} TC</span></p>
              <p>💰 Học phí: <span className="font-medium text-blue-600">{formatCurrency(course.mucHocPhi)}</span></p>
              {course.lopDuKien && (
                <p>🏫 Lớp dự kiến: <span className="font-medium">{course.lopDuKien}</span></p>
              )}
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">
              Nhập <span className="font-bold text-red-600">"{expectedText}"</span> để xác nhận:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder={`Nhập ${expectedText}`}
              className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center font-bold tracking-widest"
              disabled={isCanceling}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isCanceling}
            >
              Quay lại
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isCanceling || confirmText !== expectedText}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isCanceling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Đang hủy...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xác nhận hủy
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
