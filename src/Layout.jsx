import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, FileText, Activity, Pill, TrendingUp, 
  Share2, Bell, Users, TestTube, Brain, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentProfile, setCurrentProfile] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      const profiles = await base44.entities.Profile.filter({ 
        relationship: 'self',
        created_by: userData.email 
      });
      if (profiles.length > 0) {
        setCurrentProfile(profiles[0]);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const navItems = [
    { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
    { name: 'Documents', page: 'Documents', icon: FileText },
    { name: 'Lab Results', page: 'LabResults', icon: TestTube },
    { name: 'Vitals', page: 'Vitals', icon: Activity },
    { name: 'Medications', page: 'Medications', icon: Pill },
    { name: 'Trends', page: 'Trends', icon: TrendingUp },
    { name: 'AI Insights', page: 'Insights', icon: Brain },
    { name: 'Profiles', page: 'Profiles', icon: Users },
    { name: 'Share', page: 'Share', icon: Share2 },
  ];

  const isActive = (page) => currentPageName === page;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}>
        <div className="p-4">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#0A0A0A] rounded-xl flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <span className="text-lg font-bold text-[#0A0A0A] block">HealthFlux</span>
                <span className="text-xs text-gray-600">Personal Health</span>
              </div>
            )}
          </Link>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive(item.page)
                    ? 'bg-[#E9F46A] text-[#0A0A0A] font-semibold'
                    : 'text-gray-600 hover:bg-[#F4F4F2]'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm">{item.name}</span>}
              </Link>
            ))}
          </nav>

          {user && sidebarOpen && (
            <div className="mt-auto pt-8">
              <div className="px-3 py-3 bg-[#F4F4F2] rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#0A0A0A] text-white text-xs font-semibold">
                      {currentProfile?.full_name?.[0] || user.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0A0A0A] truncate">
                      {currentProfile?.full_name || user.full_name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">{user.email}</p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs hover:bg-white"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {children}
      </main>
    </div>
  );
}