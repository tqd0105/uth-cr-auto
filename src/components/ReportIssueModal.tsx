'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ReportIssueModalProps {
  onClose: () => void;
}

export function ReportIssueModal({ onClose }: ReportIssueModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [issueType, setIssueType] = useState('bug');
  const [description, setDescription] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !description) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          issueType,
          description,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.message || 'Gửi báo cáo thất bại');
      }
    } catch {
      setError('Lỗi kết nối server');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 w-full max-w-lg rounded-lg shadow-xl overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Báo cáo vấn đề</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 text-red-300 rounded flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-green-900/30 border border-green-700/50 text-green-300 rounded flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Đã gửi báo cáo thành công! Cảm ơn bạn.
            </div>
          )}

          {!success && (
            <>
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Họ tên <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-gray-100 placeholder-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-gray-100 placeholder-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="email@example.com"
                  required
                />
              </div>

              {/* Issue Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Loại vấn đề
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="bug"> Lỗi hệ thống</option>
                  <option value="feature"> Đề xuất tính năng</option>
                  <option value="ui"> Vấn đề giao diện</option>
                  <option value="performance"> Hiệu năng</option>
                  <option value="other"> Khác</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Mô tả chi tiết <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-gray-100 placeholder-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  rows={6}
                  placeholder="Vui lòng mô tả chi tiết vấn đề bạn gặp phải..."
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                  disabled={isSending}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Gửi báo cáo
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
