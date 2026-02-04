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
  FileWarning,
  Activity,
  XCircle,
  Heart,
  Construction,
  Power
} from 'lucide-react';

// Import các components quản lý
import { UsersManager } from '@/components/admin/UsersManager';
import { ConsentsManager } from '@/components/admin/ConsentsManager';
import { ReportsManager } from '@/components/admin/ReportsManager';
import { WhitelistManager } from '@/components/admin/WhitelistManager';
import { AccessRequestsManager } from '@/components/admin/AccessRequestsManager';
import { DonationsManager } from '@/components/admin/DonationsManager';

interface RecentUser {
  student_id: string;
  student_name: string | null;
  login_time: string;
  success: boolean;
}

interface Stats {
  totalUsers: number;
  todayLogins: number;
  totalConsents: number;
  totalLogins: number;
  failedLoginsToday: number;
  reports: { total: number; pending: number };
  whitelist: { total: number; active: number };
  accessRequests: { total: number; pending: number };
  recentUsers: RecentUser[];
}

type TabType = 'dashboard' | 'users' | 'consents' | 'reports' | 'whitelist' | 'requests' | 'donations';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);

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

  // Fetch maintenance status
  const fetchMaintenanceStatus = async () => {
    try {
      const res = await fetch('/api/admin/maintenance');
      const data = await res.json();
      if (data.success) {
        setMaintenanceMode(data.data.maintenance_mode);
        setMaintenanceMessage(data.data.maintenance_message);
      }
    } catch (error) {
      console.error('Failed to fetch maintenance status:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchMaintenanceStatus();
    }
  }, [isAuthenticated]);

  const handleToggleMaintenance = async () => {
    const newState = !maintenanceMode;
    const message = newState 
      ? prompt('Nhập thông báo bảo trì:', maintenanceMessage || 'Hệ thống đang bảo trì, vui lòng quay lại sau.')
      : undefined;
    
    if (newState && message === null) return; // User cancelled

    setIsTogglingMaintenance(true);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState, message })
      });
      const data = await res.json();
      if (data.success) {
        setMaintenanceMode(newState);
        if (message) setMaintenanceMessage(message);
        alert(newState ? '✅ Đã bật chế độ bảo trì' : '✅ Đã tắt chế độ bảo trì');
      } else {
        alert('❌ ' + data.message);
      }
    } catch (error) {
      alert('❌ Lỗi kết nối');
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

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
    { id: 'requests' as TabType, label: 'Yêu cầu', icon: UserCheck },
    { id: 'donations' as TabType, label: 'Donate', icon: Heart },
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
          <div className="flex items-center gap-3">
            {/* Maintenance Toggle */}
            <button
              onClick={handleToggleMaintenance}
              disabled={isTogglingMaintenance}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                maintenanceMode
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={maintenanceMode ? 'Tắt bảo trì' : 'Bật bảo trì'}
            >
              {isTogglingMaintenance ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : maintenanceMode ? (
                <Construction className="w-4 h-4" />
              ) : (
                <Power className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {maintenanceMode ? 'Đang bảo trì' : 'Bảo trì'}
              </span>
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Maintenance Banner */}
      {maintenanceMode && (
        <div className="bg-yellow-600/20 border-b border-yellow-600/50 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-yellow-400 text-sm">
            <Construction className="w-4 h-4" />
            <span>Chế độ bảo trì đang BẬT - Người dùng sẽ thấy trang bảo trì</span>
          </div>
        </div>
      )}

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
        {activeTab === 'requests' && <AccessRequestsManager />}
        {activeTab === 'donations' && <DonationsManager />}
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
          icon={Activity}
          label="Tổng lượt đăng nhập"
          value={stats?.totalLogins || 0}
          color="purple"
        />
        <StatCard
          icon={XCircle}
          label="Đăng nhập thất bại (hôm nay)"
          value={stats?.failedLoginsToday || 0}
          color="orange"
          highlight={(stats?.failedLoginsToday || 0) > 5}
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileCheck}
          label="Đã đồng ý điều khoản"
          value={stats?.totalConsents || 0}
          color="blue"
        />
        <StatCard
          icon={UserCheck}
          label="Yêu cầu chờ duyệt"
          value={stats?.accessRequests?.pending || 0}
          color="green"
          highlight={(stats?.accessRequests?.pending || 0) > 0}
        />
        <StatCard
          icon={FileWarning}
          label="Báo cáo chờ xử lý"
          value={stats?.reports?.pending || 0}
          color="orange"
          highlight={(stats?.reports?.pending || 0) > 0}
        />
        <StatCard
          icon={Shield}
          label="Whitelist đang hoạt động"
          value={stats?.whitelist?.active || 0}
          color="purple"
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

      {/* Recent Users & Access Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Users */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Người dùng gần đây
          </h3>
          <div className="space-y-2">
            {stats?.recentUsers && stats.recentUsers.length > 0 ? (
              stats.recentUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${user.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="text-sm text-white font-mono">{user.student_id}</p>
                      <p className="text-xs text-gray-500">{user.student_name || 'Không rõ tên'}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Chưa có người dùng</p>
            )}
          </div>
        </div>

        {/* Access Requests Summary */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Yêu cầu cấp quyền
          </h3>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-2xl font-bold text-yellow-500">{stats?.accessRequests?.pending || 0}</p>
              <p className="text-xs text-gray-500">Chờ duyệt</p>
            </div>
            <div className="h-8 w-px bg-gray-700"></div>
            <div>
              <p className="text-2xl font-bold text-gray-500">{stats?.accessRequests?.total || 0}</p>
              <p className="text-xs text-gray-500">Tổng cộng</p>
            </div>
          </div>
          {(stats?.accessRequests?.pending || 0) > 0 && (
            <p className="text-xs text-yellow-500">
              ⚠ Có {stats?.accessRequests?.pending} yêu cầu đang chờ bạn duyệt
            </p>
          )}
        </div>
      </div>
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
