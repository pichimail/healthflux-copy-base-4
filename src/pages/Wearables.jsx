import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Watch, Wifi, WifiOff, Activity, Heart, TrendingUp, Moon, Brain, 
  Footprints, Zap, Plus, Trash2, CheckCircle, Calendar, RefreshCw, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ProfileSwitcher from '../components/ProfileSwitcher';
import { format, subDays } from 'date-fns';

const deviceTypes = [
  { id: 'fitbit', name: 'Fitbit', icon: '⌚', color: 'bg-cyan-500' },
  { id: 'google_fit', name: 'Google Fit', icon: '🏃', color: 'bg-green-500' },
  { id: 'apple_health', name: 'Apple Health', icon: '❤️', color: 'bg-red-500' },
  { id: 'samsung_health', name: 'Samsung Health', icon: '💚', color: 'bg-blue-500' },
  { id: 'garmin', name: 'Garmin', icon: '⚡', color: 'bg-indigo-500' }
];

export default function Wearables() {
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState({});
  const [deviceForm, setDeviceForm] = useState({
    device_type: '',
    device_name: ''
  });
  
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

  React.useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      const self = profiles.find(p => p.relationship === 'self');
      setSelectedProfileId(self?.id || profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const { data: wearableSyncs = [] } = useQuery({
    queryKey: ['wearables', selectedProfileId],
    queryFn: () => base44.entities.WearableSync.filter({ profile_id: selectedProfileId }),
    enabled: !!selectedProfileId
  });

  const { data: wearableData = [] } = useQuery({
    queryKey: ['wearableData', selectedProfileId],
    queryFn: () => base44.entities.WearableData.filter({ profile_id: selectedProfileId }, '-recorded_at', 500),
    enabled: !!selectedProfileId
  });

  const addDeviceMutation = useMutation({
    mutationFn: (data) => base44.entities.WearableSync.create({
      ...data,
      profile_id: selectedProfileId,
      is_active: true,
      sync_status: 'active',
      sync_settings: {
        sync_heart_rate: true,
        sync_steps: true,
        sync_sleep: true,
        sync_calories: true,
        sync_oxygen: true
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['wearables']);
      setShowAddModal(false);
      setDeviceForm({ device_type: '', device_name: '' });
    }
  });

  const deleteSyncMutation = useMutation({
    mutationFn: (id) => base44.entities.WearableSync.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['wearables']);
    }
  });

  const handleSyncData = async (syncId, deviceType) => {
    setSyncing(true);
    try {
      await base44.functions.invoke('syncWearableData', {
        sync_id: syncId,
        device_type: deviceType,
        start_date: subDays(new Date(), 30).toISOString(),
        end_date: new Date().toISOString()
      });
      queryClient.invalidateQueries(['wearableData']);
      alert('Data synced successfully!');
    } catch (error) {
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleAnalyze = async (dataType) => {
    setAnalyzing(true);
    try {
      const { data } = await base44.functions.invoke('analyzeWearableData', {
        profile_id: selectedProfileId,
        data_type: dataType,
        days: 30
      });
      setAnalysis(prev => ({ ...prev, [dataType]: data }));
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Prepare chart data
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    return format(date, 'yyyy-MM-dd');
  });

  const stepsData = last30Days.map(date => {
    const dayData = wearableData.filter(d => d.data_type === 'steps' && d.date === date);
    return {
      date: format(new Date(date), 'M/d'),
      steps: dayData.length > 0 ? dayData[0].value : 0
    };
  });

  const sleepData = last30Days.map(date => {
    const dayData = wearableData.filter(d => d.data_type === 'sleep' && d.date === date);
    return {
      date: format(new Date(date), 'M/d'),
      hours: dayData.length > 0 ? dayData[0].value : 0,
      deep: dayData[0]?.metadata?.deep_sleep || 0,
      light: dayData[0]?.metadata?.light_sleep || 0,
      rem: dayData[0]?.metadata?.rem_sleep || 0
    };
  });

  const heartRateData = wearableData
    .filter(d => d.data_type === 'heart_rate')
    .slice(0, 100)
    .reverse()
    .map(d => ({
      time: format(new Date(d.recorded_at), 'M/d HH:mm'),
      bpm: d.value
    }));

  const stressData = last30Days.map(date => {
    const dayData = wearableData.filter(d => d.data_type === 'stress' && d.date === date);
    return {
      date: format(new Date(date), 'M/d'),
      stress: dayData.length > 0 ? dayData[0].value : 0
    };
  });

  // Calculate summary stats
  const totalSteps = stepsData.reduce((sum, d) => sum + d.steps, 0);
  const avgSteps = Math.round(totalSteps / stepsData.filter(d => d.steps > 0).length) || 0;
  const avgSleep = sleepData.filter(d => d.hours > 0).reduce((sum, d) => sum + d.hours, 0) / sleepData.filter(d => d.hours > 0).length || 0;
  const avgHeartRate = heartRateData.length > 0 ? Math.round(heartRateData.reduce((sum, d) => sum + d.bpm, 0) / heartRateData.length) : 0;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 smooth-scroll">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1 flex items-center gap-2">
          <Watch className="w-6 h-6" />
          Wearables
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">Fitness trackers & smartwatches</p>
        {profiles.length > 0 && (
          <div className="mt-3">
            <ProfileSwitcher
              profiles={profiles}
              selectedProfile={selectedProfileId}
              onProfileChange={setSelectedProfileId}
            />
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {wearableData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <Card className="border-2 rounded-2xl">
            <CardContent className="p-3 sm:p-4">
              <Footprints className="h-5 w-5 text-blue-600 mb-2" />
              <p className="text-lg sm:text-2xl font-bold">{avgSteps.toLocaleString()}</p>
              <p className="text-xs text-gray-600">Avg Steps</p>
            </CardContent>
          </Card>
          <Card className="border-2 rounded-2xl">
            <CardContent className="p-3 sm:p-4">
              <Heart className="h-5 w-5 text-red-600 mb-2" />
              <p className="text-lg sm:text-2xl font-bold">{avgHeartRate}</p>
              <p className="text-xs text-gray-600">Avg HR</p>
            </CardContent>
          </Card>
          <Card className="border-2 rounded-2xl">
            <CardContent className="p-3 sm:p-4">
              <Moon className="h-5 w-5 text-purple-600 mb-2" />
              <p className="text-lg sm:text-2xl font-bold">{avgSleep.toFixed(1)}h</p>
              <p className="text-xs text-gray-600">Avg Sleep</p>
            </CardContent>
          </Card>
          <Card className="border-2 rounded-2xl">
            <CardContent className="p-3 sm:p-4">
              <Activity className="h-5 w-5 text-green-600 mb-2" />
              <p className="text-lg sm:text-2xl font-bold">{wearableData.length}</p>
              <p className="text-xs text-gray-600">Data Points</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="w-full mb-4 rounded-2xl h-11">
          <TabsTrigger value="devices" className="flex-1 rounded-xl">Devices</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 rounded-xl">Analytics</TabsTrigger>
          <TabsTrigger value="trends" className="flex-1 rounded-xl">Trends</TabsTrigger>
        </TabsList>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-3">
          <Button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl active-press shadow-lg h-11"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </Button>

          {wearableSyncs.map(sync => {
            const device = deviceTypes.find(d => d.id === sync.device_type);
            return (
              <Card key={sync.id} className="border-2 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl text-2xl ${device?.color}`}>
                        {device?.icon || '⌚'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{device?.name || sync.device_type}</p>
                        <p className="text-xs text-gray-500">{sync.device_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {sync.sync_status === 'active' ? (
                            <><Wifi className="h-3 w-3 text-green-600" /><span className="text-xs text-green-600">Active</span></>
                          ) : (
                            <><WifiOff className="h-3 w-3 text-red-600" /><span className="text-xs text-red-600">Disconnected</span></>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => {
                        if (confirm('Disconnect device?')) {
                          deleteSyncMutation.mutate(sync.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  {sync.last_sync_date && (
                    <p className="text-xs text-gray-500 mb-3">
                      Last sync: {format(new Date(sync.last_sync_date), 'MMM d, h:mm a')}
                    </p>
                  )}

                  <Button
                    onClick={() => handleSyncData(sync.id, sync.device_type)}
                    disabled={syncing}
                    variant="outline"
                    className="w-full rounded-2xl active-press"
                  >
                    {syncing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
                    ) : (
                      <><RefreshCw className="w-4 h-4 mr-2" />Sync Historical Data</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {wearableSyncs.length === 0 && (
            <Card className="text-center py-12 rounded-2xl">
              <Watch className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-sm">No devices connected</p>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-3">
          {['steps', 'sleep', 'heart_rate', 'stress'].map(dataType => {
            const hasData = wearableData.some(d => d.data_type === dataType);
            if (!hasData) return null;

            return (
              <Card key={dataType} className="border-2 rounded-2xl">
                <CardHeader className="border-b p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">{dataType.replace('_', ' ')}</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAnalyze(dataType)}
                      disabled={analyzing}
                      className="rounded-xl"
                    >
                      <Brain className="w-4 h-4 mr-1" />
                      Analyze
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {analysis[dataType] ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 bg-blue-50 rounded-xl text-center">
                          <p className="text-xs text-blue-700">Avg</p>
                          <p className="font-bold text-blue-900">{analysis[dataType].statistics.average}</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded-xl text-center">
                          <p className="text-xs text-green-700">Max</p>
                          <p className="font-bold text-green-900">{analysis[dataType].statistics.max}</p>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-xl text-center">
                          <p className="text-xs text-amber-700">Min</p>
                          <p className="font-bold text-amber-900">{analysis[dataType].statistics.min}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-purple-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          <p className="text-xs font-semibold text-purple-900">
                            Trend: {analysis[dataType].statistics.trend} ({analysis[dataType].statistics.trend_percentage}%)
                          </p>
                        </div>
                      </div>

                      {analysis[dataType].insights.map((insight, idx) => (
                        <div key={idx} className={`p-3 rounded-xl ${
                          insight.severity === 'concern' ? 'bg-red-50' : 
                          insight.severity === 'positive' ? 'bg-green-50' : 'bg-blue-50'
                        }`}>
                          <p className="font-semibold text-sm mb-1">{insight.title}</p>
                          <p className="text-xs text-gray-700 mb-2">{insight.description}</p>
                          {insight.recommendation && (
                            <p className="text-xs font-medium text-gray-900">💡 {insight.recommendation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4 text-sm">Click Analyze for insights</p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {wearableData.length === 0 && (
            <Card className="text-center py-12 rounded-2xl">
              <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-sm">No wearable data yet</p>
              <p className="text-xs text-gray-500">Sync your devices to see analytics</p>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          {stepsData.some(d => d.steps > 0) && (
            <Card className="border-2 rounded-2xl">
              <CardHeader className="border-b p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Footprints className="h-5 w-5 text-blue-600" />
                  Daily Steps (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stepsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="steps" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {sleepData.some(d => d.hours > 0) && (
            <Card className="border-2 rounded-2xl">
              <CardHeader className="border-b p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Moon className="h-5 w-5 text-purple-600" />
                  Sleep Patterns (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={sleepData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="hours" stroke="#9333EA" fill="#E9D5FF" />
                  </AreaChart>
                </ResponsiveContainer>
                
                {sleepData[sleepData.length - 1]?.deep > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="p-2 bg-indigo-50 rounded-xl text-center">
                      <p className="text-xs text-indigo-700">Deep</p>
                      <p className="font-bold text-indigo-900 text-sm">{sleepData[sleepData.length - 1].deep.toFixed(1)}h</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-xl text-center">
                      <p className="text-xs text-blue-700">Light</p>
                      <p className="font-bold text-blue-900 text-sm">{sleepData[sleepData.length - 1].light.toFixed(1)}h</p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-xl text-center">
                      <p className="text-xs text-purple-700">REM</p>
                      <p className="font-bold text-purple-900 text-sm">{sleepData[sleepData.length - 1].rem.toFixed(1)}h</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {heartRateData.length > 0 && (
            <Card className="border-2 rounded-2xl">
              <CardHeader className="border-b p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  Heart Rate Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={heartRateData.slice(-50)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={[50, 120]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="bpm" stroke="#EF4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {stressData.some(d => d.stress > 0) && (
            <Card className="border-2 rounded-2xl">
              <CardHeader className="border-b p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-5 w-5 text-amber-600" />
                  Stress Levels (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="stress" stroke="#F59E0B" fill="#FEF3C7" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Device Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Wearable Device</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Device Type</Label>
              <Select
                value={deviceForm.device_type}
                onValueChange={(value) => setDeviceForm({ ...deviceForm, device_type: value })}
              >
                <SelectTrigger className="h-11 rounded-2xl mt-1">
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Device Name (Optional)</Label>
              <Input
                placeholder="My Fitbit"
                value={deviceForm.device_name}
                onChange={(e) => setDeviceForm({ ...deviceForm, device_name: e.target.value })}
                className="h-11 rounded-2xl mt-1"
              />
            </div>
            <Button
              onClick={() => addDeviceMutation.mutate(deviceForm)}
              disabled={!deviceForm.device_type || addDeviceMutation.isPending}
              className="w-full bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white rounded-2xl h-11"
            >
              Add Device
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}