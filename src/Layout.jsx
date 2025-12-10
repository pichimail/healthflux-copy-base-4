import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, FileText, Activity, Pill, TrendingUp,
  User, TestTube, Brain, Menu, X, AlertCircle, MoreVertical, Settings, Shield, LogOut } from
'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
  { name: 'Home', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Documents', page: 'Documents', icon: FileText },
  { name: 'Vitals', page: 'Vitals', icon: Activity },
  { name: 'Meds', page: 'Medications', icon: Pill },
  { name: 'Chat', page: 'AIAssistant', icon: Brain }];


  const moreItems = [
  { name: 'Lab Results', page: 'LabResults', icon: TestTube },
  { name: 'Trends', page: 'Trends', icon: TrendingUp },
  { name: 'Wellness Insights', page: 'WellnessInsights', icon: TrendingUp },
  { name: 'Health Insights', page: 'Insights', icon: Brain },
  { name: 'My Profiles', page: 'Profiles', icon: User },
  { name: 'Emergency Profile', page: 'EmergencyProfile', icon: AlertCircle }];


  const isActive = (page) => currentPageName === page;

  return (
    <div className="min-h-screen bg-[#F4F4F2] pb-20 md:pb-0">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0A0A0A] rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#0A0A0A]">HealthFlux</span>
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100">

            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen &&
      <div className="md:hidden fixed inset-0 bg-black/50 z-40 pt-16" onClick={() => setMenuOpen(false)}>
          <div className="bg-white rounded-t-3xl p-6 space-y-2" onClick={(e) => e.stopPropagation()}>
            {moreItems.map((item) =>
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100">

                <item.icon className="w-5 h-5 text-[#0A0A0A]" />
                <span className="text-sm font-medium text-[#0A0A0A]">{item.name}</span>
              </Link>
          )}
            {user &&
          <>
            <div className="border-t border-gray-200 my-4" />
            <div className="p-3 bg-[#F4F4F2] rounded-xl mb-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[#0A0A0A] text-white font-semibold">
                    {currentProfile?.full_name?.[0] || user.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0A0A0A] truncate">
                    {currentProfile?.full_name || user.full_name}
                  </p>
                  <p className="text-xs text-gray-600 truncate">{user.email}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors">
                      <MoreVertical className="w-4 h-4 text-[#0A0A0A]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Settings')} className="cursor-pointer" onClick={() => setMenuOpen(false)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    {user.role === 'admin' &&
                    <DropdownMenuItem asChild>
                        <Link to={createPageUrl('AdminDashboard')} className="cursor-pointer" onClick={() => setMenuOpen(false)}>
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    }
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            </>
          }
          </div>
        </div>
      }

      {/* Desktop Sidebar */}
      <aside className="bg-[#ffe4db] rounded-[28px] hidden md:block fixed left-0 top-0 h-full w-64 border-r border-gray-200 z-40 overflow-y-auto">
        <div className="p-6">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#0A0A0A] rounded-xl flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-[#0A0A0A] block">HealthFlux</span>
              <span className="text-xs text-gray-600">Personal Health</span>
            </div>
          </Link>

          <nav className="space-y-1">
            {[...navItems, ...moreItems].map((item) =>
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              isActive(item.page) ?
              'bg-[#E9F46A] text-[#0A0A0A] font-semibold' :
              'text-gray-600 hover:bg-[#F4F4F2]'}`
              }>

                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{item.name}</span>
              </Link>
            )}
          </nav>

          {user &&
          <div className="mt-8">
              <div className="px-3 py-3 bg-[#F4F4F2] rounded-xl">
                <div className="flex items-center gap-2">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors">
                        <MoreVertical className="w-4 h-4 text-[#0A0A0A]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Settings')} className="cursor-pointer">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      {user.role === 'admin' &&
                    <DropdownMenuItem asChild>
                          <Link to={createPageUrl('AdminDashboard')} className="cursor-pointer">
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                    }
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          }
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-16 md:pt-0 md:ml-64 min-h-screen">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) =>
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className="flex flex-col items-center justify-center flex-1 py-2">

              <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${
            isActive(item.page) ?
            'bg-[#E9F46A]' :
            'bg-transparent'}`
            }>
                <item.icon className={`w-6 h-6 ${
              isActive(item.page) ? 'text-[#0A0A0A]' : 'text-gray-400'}`
              } />
              </div>
              <span className={`text-xs mt-1 font-medium ${
            isActive(item.page) ? 'text-[#0A0A0A]' : 'text-gray-400'}`
            }>
                {item.name}
              </span>
            </Link>
          )}
        </div>
      </nav>
    </div>);

}