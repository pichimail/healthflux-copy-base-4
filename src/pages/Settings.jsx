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
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">⚙️ Settings</h1>
        <p className="text-xs sm:text-sm text-gray-600">Account preferences</p>
      </div>

      {/* Account Info */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-3 sm:mb-4">
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold text-[#0A0A0A]">Account</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Email</p>
              <p className="font-semibold text-[#0A0A0A] text-sm truncate">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Full Name</p>
              <p className="font-semibold text-[#0A0A0A] text-sm truncate">{user.full_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Role</p>
              <p className="font-semibold text-[#0A0A0A] capitalize text-sm">{user.role || 'user'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold text-[#0A0A0A] flex items-center gap-2">
            <Bell className="w-4 sm:w-5 h-4 sm:h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Mail className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[#0A0A0A] text-sm">Email</Label>
                  <p className="text-xs text-gray-600 hidden sm:block">Receive via email</p>
                </div>
              </div>
              <Switch 
                checked={notifications.email_enabled}
                onCheckedChange={() => handleToggle('notifications', 'email_enabled')}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Activity className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[#0A0A0A] text-sm">Health Alerts</Label>
                  <p className="text-xs text-gray-600 hidden sm:block">Critical notifications</p>
                </div>
              </div>
              <Switch 
                checked={notifications.health_alerts}
                onCheckedChange={() => handleToggle('notifications', 'health_alerts')}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Pill className="w-4 sm:w-5 h-4 sm:h-5 text-purple-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[#0A0A0A] text-sm">Med Reminders</Label>
                  <p className="text-xs text-gray-600 hidden sm:block">Take meds on time</p>
                </div>
              </div>
              <Switch 
                checked={notifications.medication_reminders}
                onCheckedChange={() => handleToggle('notifications', 'medication_reminders')}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Calendar className="w-4 sm:w-5 h-4 sm:h-5 text-orange-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[#0A0A0A] text-sm">Subscription</Label>
                  <p className="text-xs text-gray-600 hidden sm:block">Billing info</p>
                </div>
              </div>
              <Switch 
                checked={notifications.subscription_updates}
                onCheckedChange={() => handleToggle('notifications', 'subscription_updates')}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-pink-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[#0A0A0A] text-sm">Features</Label>
                  <p className="text-xs text-gray-600 hidden sm:block">New updates</p>
                </div>
              </div>
              <Switch 
                checked={notifications.feature_announcements}
                onCheckedChange={() => handleToggle('notifications', 'feature_announcements')}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Bell className="w-4 sm:w-5 h-4 sm:h-5 text-slate-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[#0A0A0A] text-sm">System</Label>
                  <p className="text-xs text-gray-600 hidden sm:block">Maintenance news</p>
                </div>
              </div>
              <Switch 
                checked={notifications.system_updates}
                onCheckedChange={() => handleToggle('notifications', 'system_updates')}
                className="flex-shrink-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}