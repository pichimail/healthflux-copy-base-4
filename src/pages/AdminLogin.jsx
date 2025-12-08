import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock } from 'lucide-react';

export default function AdminLogin() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const user = await base44.auth.me();
      
      if (user && user.role === 'admin') {
        window.location.href = createPageUrl('AdminDashboard');
      } else {
        setChecking(false);
      }
    } catch (error) {
      setChecking(false);
    }
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl('AdminLogin'));
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Admin Portal</CardTitle>
          <p className="text-slate-600">Restricted Access</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                This area is restricted to administrators only. Please sign in with an admin account to continue.
              </p>
            </div>
          </div>
          
          <Button onClick={handleLogin} className="w-full bg-slate-900 hover:bg-slate-800">
            Sign In as Admin
          </Button>
          
          <div className="text-center">
            <a href={createPageUrl('Dashboard')} className="text-sm text-blue-600 hover:underline">
              Back to Main App
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}