import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, FileText, Pill, Users, 
  ArrowRight, AlertTriangle, Heart, TrendingUp 
} from 'lucide-react';
import { format } from 'date-fns';

export default function Demo() {
  // Static demo data
  const demoProfile = {
    full_name: 'Srinivasa Reddy',
    age: 45,
    gender: 'male',
    blood_group: 'O+',
  };

  const stats = [
    { label: 'Family Profiles', value: 3, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Documents', value: 12, icon: FileText, color: 'from-green-500 to-green-600' },
    { label: 'Active Medications', value: 4, icon: Pill, color: 'from-purple-500 to-purple-600' },
    { label: 'Lab Results', value: 18, icon: Activity, color: 'from-cyan-500 to-cyan-600' },
  ];

  const vitals = [
    { label: 'Blood Pressure', value: '118/76', unit: 'mmHg', time: '2 hours ago' },
    { label: 'Heart Rate', value: '72', unit: 'bpm', time: '2 hours ago' },
    { label: 'Weight', value: '165', unit: 'lbs', time: '1 day ago' },
  ];

  const medications = [
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', time: '08:00 AM' },
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', time: '08:00 AM, 08:00 PM' },
    { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily', time: '09:00 PM' },
  ];

  const documents = [
    { title: 'Annual Physical Exam', type: 'consultation', date: '2025-12-01' },
    { title: 'Lipid Panel Results', type: 'lab_report', date: '2025-11-28' },
    { title: 'Chest X-Ray', type: 'imaging', date: '2025-11-15' },
    { title: 'Prescription Refill', type: 'prescription', date: '2025-11-10' },
  ];

  const alerts = [
    { text: 'Cholesterol levels slightly elevated', severity: 'medium' },
    { text: 'Blood pressure within normal range', severity: 'low' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 flex-wrap">
          <AlertTriangle className="w-5 h-5" />
          <p className="font-medium">
            This is a demo dashboard with sample data for Srinivasa Reddy
          </p>
          <Link to={createPageUrl('Onboarding')}>
            <Button size="sm" variant="outline" className="bg-white text-orange-600 hover:bg-white/90">
              Sign Up for Real Access
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {demoProfile.full_name.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-600">Here's your health overview for today</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <Card key={idx} className="border-0 bg-white/80 backdrop-blur shadow-lg">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
                <p className="text-sm text-slate-600">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Latest Vitals */}
          <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
            <CardHeader className="border-b border-slate-100">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">Latest Vitals</CardTitle>
                <Button variant="ghost" size="sm" disabled>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {vitals.map((vital, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{vital.label}</p>
                      <p className="text-sm text-slate-600">{vital.time}</p>
                    </div>
                    <p className="text-xl font-bold text-slate-900">
                      {vital.value} <span className="text-sm text-slate-600">{vital.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Medications */}
          <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
            <CardHeader className="border-b border-slate-100">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">Active Medications</CardTitle>
                <Button variant="ghost" size="sm" disabled>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {medications.map((med, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{med.name}</p>
                      <p className="text-sm text-slate-600">{med.dosage} • {med.frequency}</p>
                      <p className="text-xs text-slate-500 mt-1">{med.time}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
            <CardHeader className="border-b border-slate-100">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">Recent Documents</CardTitle>
                <Button variant="ghost" size="sm" disabled>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(doc.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {doc.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Health Alerts */}
          <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-semibold">Health Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div key={idx} className={`flex items-start gap-2 p-3 rounded-lg ${
                    alert.severity === 'medium' ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
                  }`}>
                    <Heart className={`w-5 h-5 mt-0.5 ${
                      alert.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`} />
                    <p className={`text-sm ${
                      alert.severity === 'medium' ? 'text-yellow-900' : 'text-green-900'
                    }`}>
                      {alert.text}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-900">
                  💡 Sign up to get personalized AI-powered health insights and recommendations
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}