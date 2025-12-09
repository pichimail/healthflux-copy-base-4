import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  Home, FileText, Activity, Pill, TrendingUp, 
  Share2, Menu, X, User, LogOut, Bell, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Load user's self profile
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
    { name: 'Dashboard', page: 'Dashboard', icon: Home },
    { name: 'Documents', page: 'Documents', icon: FileText },
    { name: 'Vitals', page: 'Vitals', icon: Activity },
    { name: 'Medications', page: 'Medications', icon: Pill },
    { name: 'Trends', page: 'Trends', icon: TrendingUp },
  ];

  const isActive = (page) => currentPageName === page;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#F4F4F2] rounded-xl px-6 h-14 flex justify-between items-center">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0A0A0A] rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-base font-bold text-[#0A0A0A]">HealthFlux</span>
                <span className="text-xs text-gray-600 -mt-0.5">Personal Health Records</span>
              </div>
              <span className="sm:hidden text-base font-bold text-[#0A0A0A]">HealthFlux</span>
            </Link>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              {user && (
                <>
                  <span className="hidden lg:block text-sm font-medium text-[#0A0A0A] mr-1">
                    {currentProfile?.full_name || user.full_name}
                  </span>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback className="bg-[#0A0A0A] text-white text-sm font-semibold">
                      {currentProfile?.full_name?.[0] || user.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </>
              )}

              {/* Hamburger Menu */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(!menuOpen)}
                className="h-8 w-8 hover:bg-transparent"
              >
                <div className="flex flex-col gap-1">
                  <div className="w-5 h-0.5 bg-[#0A0A0A]" />
                  <div className="w-5 h-0.5 bg-[#0A0A0A]" />
                  <div className="w-5 h-0.5 bg-[#0A0A0A]" />
                </div>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-30">
          <div 
            className="absolute inset-0 bg-black/20"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-20 right-4 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <nav className="p-2">
              {navItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#0A0A0A] hover:bg-[#F4F4F2] transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
              <div className="border-t border-gray-200 my-2" />
              <Link
                to={createPageUrl('Insights')}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#0A0A0A] hover:bg-[#F4F4F2]"
              >
                <Bell className="w-5 h-5" />
                <span className="font-medium">Insights</span>
              </Link>
              <Link
                to={createPageUrl('Share')}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#0A0A0A] hover:bg-[#F4F4F2]"
              >
                <Share2 className="w-5 h-5" />
                <span className="font-medium">Share</span>
              </Link>
              <Link
                to={createPageUrl('Profiles')}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#0A0A0A] hover:bg-[#F4F4F2]"
              >
                <User className="w-5 h-5" />
                <span className="font-medium">My Profiles</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#0A0A0A] hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pb-8">
        {children}
      </main>
    </div>
  );
}