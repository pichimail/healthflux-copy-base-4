import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Activity, TrendingUp, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const userData = await base44.auth.me();
      
      if (!userData || userData.role !== 'admin') {
        window.location.href = createPageUrl('AdminLogin');
        return;
      }
      
      setUser(userData);
      setChecking(false);
    } catch (error) {
      window.location.href = createPageUrl('AdminLogin');
    }
  };

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: () => base44.asServiceRole.entities.Profile.list('-created_date'),
    enabled: !checking,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['admin-documents'],
    queryFn: () => base44.asServiceRole.entities.MedicalDocument.list('-created_date', 100),
    enabled: !checking,
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ['admin-vitals'],
    queryFn: () => base44.asServiceRole.entities.VitalMeasurement.list('-measured_at', 100),
    enabled: !checking,
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['admin-insights'],
    queryFn: () => base44.asServiceRole.entities.HealthInsight.list('-created_date', 100),
    enabled: !checking,
  });

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: profiles.length, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Documents', value: documents.length, icon: FileText, color: 'from-green-500 to-green-600' },
    { label: 'Vitals Logged', value: vitals.length, icon: Activity, color: 'from-purple-500 to-purple-600' },
    { label: 'AI Insights', value: insights.length, icon: TrendingUp, color: 'from-cyan-500 to-cyan-600' },
  ];

  const recentProfiles = profiles.slice(0, 10);
  const recentDocuments = documents.slice(0, 10);

  return (
    <AdminLayout currentPageName="AdminDashboard">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">System overview and analytics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <Card key={idx} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
                <p className="text-sm text-slate-600">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Profiles */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-semibold">Recent Profiles</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {recentProfiles.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No profiles yet</p>
              ) : (
                <div className="space-y-3">
                  {recentProfiles.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{profile.full_name}</p>
                        <p className="text-sm text-slate-600 capitalize">{profile.relationship}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          {format(new Date(profile.created_date), 'MMM d, yyyy')}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {profile.created_by?.split('@')[0]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-semibold">Recent Documents</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {recentDocuments.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No documents yet</p>
              ) : (
                <div className="space-y-3">
                  {recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(doc.created_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-xs ml-2">
                        {doc.document_type?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Activity */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              System Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-2">Documents Uploaded Today</p>
                <p className="text-2xl font-bold text-slate-900">
                  {documents.filter(d => {
                    const today = new Date().toDateString();
                    return new Date(d.created_date).toDateString() === today;
                  }).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">Vitals Logged Today</p>
                <p className="text-2xl font-bold text-slate-900">
                  {vitals.filter(v => {
                    const today = new Date().toDateString();
                    return new Date(v.measured_at).toDateString() === today;
                  }).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">Active Users</p>
                <p className="text-2xl font-bold text-slate-900">
                  {new Set(profiles.map(p => p.created_by)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}