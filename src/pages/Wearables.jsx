import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Watch, Wifi, WifiOff, Activity, Heart, 
  Footprints, Moon, Info, Trash2, CheckCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from 'date-fns';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ProfileSwitcher from '../components/ProfileSwitcher';

const deviceTypes = [
  { 
    id: 'fitbit', 
    name: 'Fitbit', 
    icon: '⌚', 
    color: 'bg-cyan-500',
    description: 'Sync heart rate, steps, sleep, and more',
    requiresBackend: true
  },
  { 
    id: 'google_fit', 
    name: 'Google Fit', 
    icon: '🏃', 
    color: 'bg-green-500',
    description: 'Connect to Google Health Services',
    requiresBackend: true
  },
  { 
    id: 'apple_health', 
    name: 'Apple Health', 
    icon: '❤️', 
    color: 'bg-red-500',
    description: 'Import data from Apple Health app (iOS only)',
    requiresBackend: false
  },
  { 
    id: 'samsung_health', 
    name: 'Samsung Health', 
    icon: '💚', 
    color: 'bg-blue-500',
    description: 'Sync with Samsung wearables',
    requiresBackend: true
  },
  { 
    id: 'garmin', 
    name: 'Garmin', 
    icon: '⚡', 
    color: 'bg-indigo-500',
    description: 'Connect to Garmin Connect',
    requiresBackend: true
  }
];

export default function Wearables() {
  const [currentProfile, setCurrentProfile] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user
  });

  useEffect(() => {
    if (profiles.length > 0 && !currentProfile) {
      setCurrentProfile(profiles.find(p => p.relationship === 'self') || profiles[0]);
    }
  }, [profiles, currentProfile]);

  const { data: wearableSyncs = [] } = useQuery({
    queryKey: ['wearables', currentProfile?.id],
    queryFn: () => base44.entities.WearableSync.filter({ profile_id: currentProfile?.id }),
    enabled: !!currentProfile?.id
  });

  const deleteSyncMutation = useMutation({
    mutationFn: (id) => base44.entities.WearableSync.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['wearables', currentProfile?.id]);
      toast.success('Device disconnected');
    }
  });

  const connectedDevices = wearableSyncs.filter(s => s.is_active);

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 smooth-scroll">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1 flex items-center gap-2">
          <Watch className="w-6 h-6" />
          Wearable Devices
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Connect your fitness trackers and smartwatches to automatically sync health data
        </p>
      </div>

      {profiles.length > 1 && (
        <div className="mb-4">
          <ProfileSwitcher 
            profiles={profiles}
            selectedProfile={currentProfile?.id}
            onProfileChange={(id) => setCurrentProfile(profiles.find(p => p.id === id))}
          />
        </div>
      )}

      <Alert className="mb-6 border-amber-200 bg-amber-50 rounded-2xl">
        <Info className="h-5 w-5 text-amber-600" />
        <AlertTitle className="text-amber-900">Backend Functions Required</AlertTitle>
        <AlertDescription className="text-amber-700 text-sm">
          Wearable device integration requires backend functions to be enabled. Enable backend functions 
          in your app settings to use OAuth authentication with Fitbit, Google Fit, and other devices.
        </AlertDescription>
      </Alert>

      {connectedDevices.length > 0 && (
        <Card className="mb-6 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Connected Devices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectedDevices.map(sync => {
              const device = deviceTypes.find(d => d.id === sync.device_type);
              return (
                <div key={sync.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl text-2xl", device?.color || 'bg-slate-200')}>
                      {device?.icon || '⌚'}
                    </div>
                    <div>
                      <p className="font-semibold text-[#0A0A0A]">
                        {device?.name || sync.device_type}
                      </p>
                      {sync.device_name && (
                        <p className="text-sm text-gray-500">{sync.device_name}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {sync.sync_status === 'active' ? (
                          <>
                            <Wifi className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600">Active</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-3 w-3 text-red-600" />
                            <span className="text-xs text-red-600">Disconnected</span>
                          </>
                        )}
                        {sync.last_sync_date && (
                          <span className="text-xs text-gray-500">
                            • Last sync: {format(new Date(sync.last_sync_date), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-500 hover:text-red-600 rounded-xl"
                    onClick={() => {
                      if (confirm(`Disconnect ${device?.name}?`)) {
                        deleteSyncMutation.mutate(sync.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Available Devices</CardTitle>
          <CardDescription>
            Connect your wearable devices to automatically sync health data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {deviceTypes.map(device => {
              const isConnected = connectedDevices.some(s => s.device_type === device.id);
              
              return (
                <div
                  key={device.id}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all",
                    isConnected 
                      ? "border-green-200 bg-green-50/50" 
                      : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("p-3 rounded-xl text-3xl", device.color)}>
                      {device.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#0A0A0A]">{device.name}</h3>
                        {isConnected && (
                          <Badge className="bg-green-100 text-green-700 rounded-xl">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{device.description}</p>
                      
                      {device.requiresBackend ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled
                          className="w-full rounded-xl"
                        >
                          Requires Backend Functions
                        </Button>
                      ) : device.id === 'apple_health' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled
                          className="w-full rounded-xl"
                        >
                          iOS App Required
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          disabled={isConnected}
                          className="w-full rounded-xl"
                        >
                          {isConnected ? 'Connected' : 'Connect'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}