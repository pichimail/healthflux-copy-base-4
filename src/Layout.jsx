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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                HealthFlux
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                    isActive(item.page)
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Insights')}>
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Bell className="w-5 h-5 text-slate-600" />
                </Button>
              </Link>
              <Link to={createPageUrl('Share')}>
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Share2 className="w-5 h-5 text-slate-600" />
                </Button>
              </Link>
              
              {user && (
                <div className="flex items-center gap-2">
                  <Link to={createPageUrl('Profiles')}>
                    <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-blue-100 hover:ring-blue-200 transition-all">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm">
                        {currentProfile?.full_name?.[0] || user.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="hidden sm:flex text-slate-600 hover:text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-16 right-0 left-0 bg-white border-b border-slate-200 shadow-xl">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive(item.page)
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
              <div className="border-t border-slate-200 my-2 pt-2">
                <Link
                  to={createPageUrl('Insights')}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  <Bell className="w-5 h-5" />
                  <span className="font-medium">Insights</span>
                </Link>
                <Link
                  to={createPageUrl('Share')}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="font-medium">Share</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-40 shadow-2xl">
        <nav className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all flex-1 ${
                isActive(item.page)
                  ? 'text-blue-600'
                  : 'text-slate-500'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive(item.page) ? 'scale-110' : ''}`} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}