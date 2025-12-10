import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Activity, Pill, Calendar, Sparkles } from 'lucide-react';

export default function Settings() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const { data: preferences } = useQuery({
    queryKey: ['user-preferences', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
      return prefs.length > 0 ? prefs[0] : null;
    },
    enabled: !!user,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data) => {
      if (preferences) {
        return await base44.entities.UserPreferences.update(preferences.id, data);
      } else {
        return await base44.entities.UserPreferences.create({
          user_email: user.email,
          ...data,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-preferences']);
    },
  });

  const handleToggle = (category, setting) => {
    const newNotifications = {
      ...preferences?.notifications,
      [setting]: !preferences?.notifications?.[setting],
    };
    updatePreferencesMutation.mutate({ notifications: newNotifications });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const defaultNotifications = {
    email_enabled: true,
    subscription_updates: true,
    health_alerts: true,
    medication_reminders: true,
    system_updates: true,
    feature_announcements: true,
  };

  const notifications = preferences?.notifications || defaultNotifications;

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0A0A0A] mb-1">Settings</h1>
        <p className="text-sm text-gray-600">Manage your account preferences</p>
      </div>

      {/* Account Info */}
      <Card className="border-0 shadow-sm rounded-2xl mb-6">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Email</p>
              <p className="font-semibold text-[#0A0A0A]">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Full Name</p>
              <p className="font-semibold text-[#0A0A0A]">{user.full_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Role</p>
              <p className="font-semibold text-[#0A0A0A] capitalize">{user.role || 'user'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#F4F4F2] rounded-xl">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <Label className="font-semibold text-[#0A0A0A]">Email Notifications</Label>
                  <p className="text-xs text-gray-600">Receive notifications via email</p>
                </div>
              </div>
              <Switch 
                checked={notifications.email_enabled}
                onCheckedChange={() => handleToggle('notifications', 'email_enabled')}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F4F4F2] rounded-xl">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-green-600" />
                <div>
                  <Label className="font-semibold text-[#0A0A0A]">Health Alerts</Label>
                  <p className="text-xs text-gray-600">Critical health notifications</p>
                </div>
              </div>
              <Switch 
                checked={notifications.health_alerts}
                onCheckedChange={() => handleToggle('notifications', 'health_alerts')}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F4F4F2] rounded-xl">
              <div className="flex items-center gap-3">
                <Pill className="w-5 h-5 text-purple-600" />
                <div>
                  <Label className="font-semibold text-[#0A0A0A]">Medication Reminders</Label>
                  <p className="text-xs text-gray-600">Reminders to take medications</p>
                </div>
              </div>
              <Switch 
                checked={notifications.medication_reminders}
                onCheckedChange={() => handleToggle('notifications', 'medication_reminders')}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F4F4F2] rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-orange-600" />
                <div>
                  <Label className="font-semibold text-[#0A0A0A]">Subscription Updates</Label>
                  <p className="text-xs text-gray-600">Billing and subscription info</p>
                </div>
              </div>
              <Switch 
                checked={notifications.subscription_updates}
                onCheckedChange={() => handleToggle('notifications', 'subscription_updates')}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F4F4F2] rounded-xl">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-pink-600" />
                <div>
                  <Label className="font-semibold text-[#0A0A0A]">Feature Announcements</Label>
                  <p className="text-xs text-gray-600">New features and updates</p>
                </div>
              </div>
              <Switch 
                checked={notifications.feature_announcements}
                onCheckedChange={() => handleToggle('notifications', 'feature_announcements')}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F4F4F2] rounded-xl">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-600" />
                <div>
                  <Label className="font-semibold text-[#0A0A0A]">System Updates</Label>
                  <p className="text-xs text-gray-600">Maintenance and system news</p>
                </div>
              </div>
              <Switch 
                checked={notifications.system_updates}
                onCheckedChange={() => handleToggle('notifications', 'system_updates')}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}