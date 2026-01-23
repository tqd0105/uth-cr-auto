'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  FileCheck, 
  AlertTriangle, 
  Shield, 
  LogOut, 
  RefreshCw,
  TrendingUp,
  Clock,
  UserCheck,
  FileWarning
} from 'lucide-react';

// Import các components quản lý
import { UsersManager } from '@/components/admin/UsersManager';
import { ConsentsManager } from '@/components/admin/ConsentsManager';
import { ReportsManager } from '@/components/admin/ReportsManager';
import { WhitelistManager } from '@/components/admin/WhitelistManager';

interface Stats {
  totalUsers: number;
  todayLogins: number;
  totalConsents: number;
  reports: { total: number; pending: number };
  whitelist: { total: number; active: number };
  recentLogins: { date: string; count: number }[];
}

type TabType = 'dashboard' | 'users' | 'consents' | 'reports' | 'whitelist';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth');
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          router.push('/admin/login');
        }
      } catch {
        router.push('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Tổng quan', icon: TrendingUp },
    { id: 'users' as TabType, label: 'Người dùng', icon: Users },
    { id: 'consents' as TabType, label: 'Đồng ý', icon: FileCheck },
    { id: 'reports' as TabType, label: 'Báo cáo', icon: AlertTriangle },
    { id: 'whitelist' as TabType, label: 'Whitelist', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-200">Control Panel</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && (
          <DashboardOverview stats={stats} isLoading={isLoading} onRefresh={fetchStats} />
        )}
        {activeTab === 'users' && <UsersManager />}
        {activeTab === 'consents' && <ConsentsManager />}
        {activeTab === 'reports' && <ReportsManager />}
        {activeTab === 'whitelist' && <WhitelistManager />}
      </div>
    </div>
  );
}

// Dashboard Overview Component
function DashboardOverview({ 
  stats, 
  isLoading, 
  onRefresh 
}: { 
  stats: Stats | null; 
  isLoading: boolean;
  onRefresh: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Tổng người dùng"
          value={stats?.totalUsers || 0}
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="Đăng nhập hôm nay"
          value={stats?.todayLogins || 0}
          color="green"
        />
        <StatCard
          icon={FileCheck}
          label="Đã đồng ý"
          value={stats?.totalConsents || 0}
          color="purple"
        />
        <StatCard
          icon={FileWarning}
          label="Báo cáo chờ xử lý"
          value={stats?.reports?.pending || 0}
          color="orange"
          highlight={stats?.reports?.pending ? stats.reports.pending > 0 : false}
        />
      </div>

      {/* Whitelist Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Whitelist
          </h3>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{stats?.whitelist?.active || 0}</p>
              <p className="text-xs text-gray-500">Đang hoạt động</p>
            </div>
            <div className="h-8 w-px bg-gray-700"></div>
            <div>
              <p className="text-2xl font-bold text-gray-500">{stats?.whitelist?.total || 0}</p>
              <p className="text-xs text-gray-500">Tổng cộng</p>
            </div>
          </div>
          {stats?.whitelist?.active === 0 && (
            <p className="text-xs text-yellow-500 mt-2">
              ⚠ Whitelist trống - Tất cả người dùng đều có thể truy cập
            </p>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Báo cáo
          </h3>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold text-orange-500">{stats?.reports?.pending || 0}</p>
              <p className="text-xs text-gray-500">Chờ xử lý</p>
            </div>
            <div className="h-8 w-px bg-gray-700"></div>
            <div>
              <p className="text-2xl font-bold text-gray-500">{stats?.reports?.total || 0}</p>
              <p className="text-xs text-gray-500">Tổng cộng</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Logins Chart (Simple) */}
      {stats?.recentLogins && stats.recentLogins.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Đăng nhập 7 ngày gần đây</h3>
          <div className="flex items-end gap-2 h-32">
            {stats.recentLogins.reverse().map((day, index) => {
              const maxCount = Math.max(...stats.recentLogins.map(d => Number(d.count)));
              const height = maxCount > 0 ? (Number(day.count) / maxCount) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">{day.count}</span>
                  <div 
                    className="w-full bg-blue-600 rounded-t transition-all"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  ></div>
                  <span className="text-xs text-gray-500">
                    {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color,
  highlight = false
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: number; 
  color: 'blue' | 'green' | 'purple' | 'orange';
  highlight?: boolean;
}) {
  const colors = {
    blue: 'bg-blue-600/20 text-blue-400',
    green: 'bg-green-600/20 text-green-400',
    purple: 'bg-purple-600/20 text-purple-400',
    orange: 'bg-orange-600/20 text-orange-400',
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${highlight ? 'ring-2 ring-orange-500' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
