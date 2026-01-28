'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Donation, ProStatus } from '@/lib/types/uth';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  studentId?: string;
  onSuccess?: () => void;
}

interface DonationResponse {
  success: boolean;
  data?: {
    is_pro: boolean;
    total_donated: number;
    donations: Donation[];
    pending_donation?: Donation;
    qr_url?: string;
    bank_info: {
      name: string;
      account: string;
      account_name: string;
      bank_bin: string;
    };
    current_period_id: number;
  };
  message?: string;
}

const MIN_DONATION = 12000;

export default function DonateModal({ isOpen, onClose, email, studentId, onSuccess }: DonateModalProps) {
  const [amount, setAmount] = useState<number>(MIN_DONATION);
  const [loading, setLoading] = useState(false);
  const [donationData, setDonationData] = useState<DonationResponse['data'] | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showQR, setShowQR] = useState(false);

  // Fetch donation status on open
  useEffect(() => {
    if (isOpen && email) {
      fetchDonationStatus();
    }
  }, [isOpen, email]);

  const fetchDonationStatus = async () => {
    try {
      const res = await fetch('/api/donate');
      const data: DonationResponse = await res.json();
      if (data.success && data.data) {
        setDonationData(data.data);
        if (data.data.pending_donation) {
          setShowQR(true);
          // Generate QR URL for pending donation
          const { bank_info, pending_donation } = data.data;
          const qr = generateVietQR(
            bank_info.bank_bin,
            bank_info.account,
            bank_info.account_name,
            pending_donation.amount,
            pending_donation.transfer_content
          );
          setQrUrl(qr);
        }
      }
    } catch (err) {
      console.error('Error fetching donation status:', err);
    }
  };

  const generateVietQR = (bankBin: string, account: string, accountName: string, amount: number, content: string) => {
    const template = 'compact2';
    const encodedContent = encodeURIComponent(content);
    const encodedName = encodeURIComponent(accountName);
    return `https://img.vietqr.io/image/${bankBin}-${account}-${template}.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`;
  };

  const handleDonate = async () => {
    if (amount < MIN_DONATION) {
      setError(`Số tiền tối thiểu là ${MIN_DONATION.toLocaleString('vi-VN')}đ`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          email,
          student_id: studentId,
        })
      });

      const data: DonationResponse = await res.json();

      if (data.success && data.data) {
        setDonationData(data.data);
        setQrUrl(data.data.qr_url || '');
        setShowQR(true);
      } else {
        setError(data.message || 'Đã có lỗi xảy ra');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch('/api/donate', { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        setShowQR(false);
        setQrUrl('');
        fetchDonationStatus();
      }
    } catch (err) {
      console.error('Error canceling donation:', err);
    }
  };

  if (!isOpen) return null;

  const isPro = donationData?.is_pro;
  const pendingDonation = donationData?.pending_donation;
  const transferContent = pendingDonation?.transfer_content || `UTH ${email}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader className="bg-gray-700 text-white rounded-t-lg">
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <span className="text-2xl">⏫</span>
            <span>Nâng cấp tính năng</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Pro Status Badge */}
          {isPro && (
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-400 rounded-lg p-3 text-center">
              <span className="text-yellow-600 font-bold flex items-center justify-center gap-2">
                <span className="text-xl">⭐</span>
                Bạn đang là PRO trong đợt ĐKHP này!
              </span>
              <p className="text-xs text-yellow-700 mt-1">
                Cảm ơn bạn! Bạn vẫn có thể donate thêm để ủng hộ dự án.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="text-gray-600 text-sm space-y-2 bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-800">🎁 Tính năng PRO:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Hẹn lịch đăng ký tự động</li>
              <li>Chờ slot khi lớp đầy</li>
              <li>Chọn nhiều lớp đăng ký cùng lúc</li>
              <li>Thông báo lịch học qua email</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2 italic">
              * Mỗi lần donate có hiệu lực cho 1 đợt ĐKHP
            </p>
          </div>

          {/* QR Code Display */}
          {showQR && qrUrl ? (
            <div className="space-y-4">
              <div className="text-center">
                <img 
                  src={qrUrl} 
                  alt="QR Code chuyển khoản" 
                  className="mx-auto rounded-lg shadow-lg"
                  style={{ width: 280, height: 280 }}
                />
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngân hàng:</span>
                  <span className="font-medium">{donationData?.bank_info.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số TK:</span>
                  <span className="font-medium font-mono">{donationData?.bank_info.account}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chủ TK:</span>
                  <span className="font-medium">{donationData?.bank_info.account_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số tiền:</span>
                  <span className="font-medium text-green-600">
                    {(pendingDonation?.amount || amount).toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <span className="text-gray-600">Nội dung CK:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-white px-3 py-2 rounded border font-mono text-sm">
                      {transferContent}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(transferContent)}
                    >
                      📋
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-medium">⏳ Chờ xác nhận</p>
                <p className="text-xs mt-1">
                  Sau khi chuyển khoản, admin sẽ duyệt trong vòng 24h. Bạn sẽ được bật PRO ngay khi xác nhận.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={handleCancel}
                className="w-full"
              >
                Hủy yêu cầu
              </Button>
            </div>
          ) : (
            // Input Amount Form
            <div className="space-y-4">
              {/* Total Donated */}
              {donationData && donationData.total_donated > 0 && (
                <div className="text-center text-gray-600">
                  Tổng đã ủng hộ: <span className="font-bold text-green-600">
                    {donationData.total_donated.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[12000, 20000, 50000].map((amt) => (
                  <Button
                    key={amt}
                    variant={amount === amt ? 'default' : 'outline'}
                    onClick={() => setAmount(amt)}
                    className={amount === amt ? 'bg-blue-600' : ''}
                  >
                    {(amt / 1000).toFixed(0)}k
                  </Button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Số tiền khác (VNĐ):</label>
                <Input
                  type="number"
                  min={MIN_DONATION}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                  className="text-right font-mono"
                />
                <p className="text-xs text-gray-500">Tối thiểu {MIN_DONATION.toLocaleString('vi-VN')}đ</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleDonate}
                disabled={loading || amount < MIN_DONATION}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? 'Đang tạo...' : '💳 Tạo mã QR chuyển khoản'}
              </Button>
            </div>
          )}

          {/* Donation History */}
          {donationData?.donations && donationData.donations.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <p className="font-medium text-gray-800 mb-2">Lịch sử donate:</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {donationData.donations.slice(0, 5).map((d, idx) => (
                  <div key={idx} className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                    <span>{new Date(d.created_at!).toLocaleDateString('vi-VN')}</span>
                    <span className="font-medium">{d.amount.toLocaleString('vi-VN')}đ</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      d.status === 'approved' ? 'bg-green-100 text-green-700' :
                      d.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {d.status === 'approved' ? '✓ Duyệt' :
                       d.status === 'rejected' ? '✗ Từ chối' : '⏳ Chờ'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full"
          >
            Đóng
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
