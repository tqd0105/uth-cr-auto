'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DonorStats {
  total_amount: number;
  total_donors: number;
  total_donations: number;
}

interface TopDonor {
  email: string;
  total: number;
  count: number;
}

interface DonorsData {
  top_donors: TopDonor[];
  stats: DonorStats;
}

export default function DonorsList() {
  const [data, setData] = useState<DonorsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      const res = await fetch('/api/donate/donors');
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error('Error fetching donors:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-pulse">Đang tải...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { top_donors, stats } = data;

  // Medal emojis for top 3
  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <span className="text-2xl">🏆</span>
          <span>Top Ủng Hộ</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
          <div className="p-4 text-center border-r">
            <p className="text-2xl font-bold text-blue-600">
              {(stats.total_amount / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-gray-500">Tổng (VNĐ)</p>
          </div>
          <div className="p-4 text-center border-r">
            <p className="text-2xl font-bold text-purple-600">{stats.total_donors}</p>
            <p className="text-xs text-gray-500">Người donate</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.total_donations}</p>
            <p className="text-xs text-gray-500">Lượt donate</p>
          </div>
        </div>

        {/* Top Donors List */}
        {top_donors.length > 0 ? (
          <div className="divide-y">
            {top_donors.map((donor, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
                  index < 3 ? 'bg-gradient-to-r from-yellow-50/50 to-transparent' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${index < 3 ? '' : 'text-gray-400 text-sm w-6 text-center'}`}>
                    {getMedal(index)}
                  </span>
                  <div>
                    <p className={`font-medium ${index < 3 ? 'text-gray-800' : 'text-gray-600'}`}>
                      {donor.email}
                    </p>
                    <p className="text-xs text-gray-400">{donor.count} lượt donate</p>
                  </div>
                </div>
                <span className={`font-bold ${
                  index === 0 ? 'text-yellow-600 text-lg' :
                  index === 1 ? 'text-gray-500' :
                  index === 2 ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  {(donor.total / 1000).toFixed(0)}k
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">💝</p>
            <p>Chưa có ai donate</p>
            <p className="text-sm">Hãy là người đầu tiên ủng hộ dự án!</p>
          </div>
        )}

        {/* Thank You Message */}
        {top_donors.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 border-t text-center">
            <p className="text-sm text-gray-600">
              💖 Cảm ơn tất cả những người đã ủng hộ dự án!
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Sự đóng góp của bạn giúp dự án tiếp tục phát triển
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
