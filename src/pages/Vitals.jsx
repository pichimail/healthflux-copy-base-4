import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Activity, Heart, Thermometer, Weight, TrendingUp, Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

export default function Vitals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [formData, setFormData] = useState({
    vital_type: 'blood_pressure',
    systolic: '',
    diastolic: '',
    value: '',
    unit: '',
    measured_at: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date'),
  });

  const { data: vitals = [], isLoading } = useQuery({
    queryKey: ['vitals', selectedProfile],
    queryFn: () => selectedProfile
      ? base44.entities.VitalMeasurement.filter({ profile_id: selectedProfile }, '-measured_at')
      : base44.entities.VitalMeasurement.list('-measured_at'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VitalMeasurement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vitals']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VitalMeasurement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['vitals']);
    },
  });

  const resetForm = () => {
    setFormData({
      vital_type: 'blood_pressure',
      systolic: '',
      diastolic: '',
      value: '',
      unit: '',
      measured_at: new Date().toISOString().slice(0, 16),
      notes: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
    
    if (!profileId) {
      alert('Please select a profile');
      return;
    }

    const data = {
      profile_id: profileId,
      vital_type: formData.vital_type,
      measured_at: formData.measured_at,
      notes: formData.notes,
      source: 'manual',
    };

    if (formData.vital_type === 'blood_pressure') {
      data.systolic = parseFloat(formData.systolic);
      data.diastolic = parseFloat(formData.diastolic);
      data.unit = 'mmHg';
    } else {
      data.value = parseFloat(formData.value);
      data.unit = formData.unit;
    }

    createMutation.mutate(data);
  };

  const handleTypeChange = (type) => {
    const units = {
      heart_rate: 'bpm',
      temperature: '°F',
      weight: 'kg',
      blood_glucose: 'mg/dL',
      oxygen_saturation: '%',
      respiratory_rate: '/min',
    };
    setFormData({
      ...formData,
      vital_type: type,
      unit: units[type] || '',
      value: '',
      systolic: '',
      diastolic: '',
    });
  };

  const getVitalIcon = (type) => {
    const icons = {
      blood_pressure: Heart,
      heart_rate: Activity,
      temperature: Thermometer,
      weight: Weight,
      blood_glucose: Activity,
      oxygen_saturation: Heart,
      respiratory_rate: Activity,
    };
    return icons[type] || Activity;
  };

  const getVitalColor = (type) => {
    const colors = {
      blood_pressure: 'from-red-500 to-pink-500',
      heart_rate: 'from-blue-500 to-cyan-500',
      temperature: 'from-orange-500 to-yellow-500',
      weight: 'from-purple-500 to-pink-500',
      blood_glucose: 'from-green-500 to-teal-500',
      oxygen_saturation: 'from-cyan-500 to-blue-500',
      respiratory_rate: 'from-indigo-500 to-purple-500',
    };
    return colors[type] || 'from-slate-500 to-slate-600';
  };

  const formatVitalValue = (vital) => {
    if (vital.vital_type === 'blood_pressure') {
      return `${vital.systolic}/${vital.diastolic} ${vital.unit}`;
    }
    return `${vital.value} ${vital.unit}`;
  };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
      {/* Mobile-First Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
            ❤️ Vitals
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">Track daily</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-2xl font-semibold shadow-lg active-press h-11 sm:h-12 px-4 sm:px-6"
        >
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Log</span>
        </Button>
      </div>

      {/* Profile Filter */}
      <div className="mb-4 sm:mb-6">
        <Select value={selectedProfile || 'all'} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full rounded-2xl border-gray-200 h-11 sm:h-12">
            <SelectValue placeholder="All Profiles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Profiles</SelectItem>
            {profiles.map(profile => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vitals List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-b-2 border-blue-600" />
        </div>
      ) : vitals.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <Activity className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-600 mb-4 text-sm">No vitals recorded</p>
          <Button onClick={() => setDialogOpen(true)} className="rounded-2xl bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] active-press shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Log First Vital
          </Button>
        </div>
      ) : (
        <div className="grid gap-2 sm:gap-3">
          {vitals.map((vital) => {
            const profile = profiles.find(p => p.id === vital.profile_id);
            const Icon = getVitalIcon(vital.vital_type);
            return (
              <Card key={vital.id} className="border-0 card-shadow rounded-2xl sm:rounded-3xl active-press hover:shadow-lg transition-all">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#9BB4FF] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A0A0A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#0A0A0A] capitalize mb-1 text-sm truncate">
                          {vital.vital_type.replace(/_/g, ' ')}
                        </h3>
                        <p className="text-lg sm:text-xl font-bold text-[#0A0A0A] mb-1 sm:mb-2">
                          {formatVitalValue(vital)}
                        </p>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-gray-600">
                          {profile && (
                            <span className="truncate">{profile.full_name}</span>
                          )}
                          <span>{format(new Date(vital.measured_at), 'MMM d, h:mm a')}</span>
                        </div>
                        {vital.notes && (
                          <p className="text-xs text-gray-600 mt-2 bg-[#F4F4F2] p-2 rounded-xl">
                            {vital.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this vital?')) {
                          deleteMutation.mutate(vital.id);
                        }
                      }}
                      className="text-red-600 hover:bg-red-50 rounded-2xl h-10 w-10 active-press flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Vital Dialog - Mobile Optimized */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Log Vital Measurement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="vital_type" className="text-sm">Vital Type *</Label>
              <Select
                value={formData.vital_type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger className="h-11 sm:h-12 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blood_pressure">Blood Pressure</SelectItem>
                  <SelectItem value="heart_rate">Heart Rate</SelectItem>
                  <SelectItem value="temperature">Temperature</SelectItem>
                  <SelectItem value="weight">Weight</SelectItem>
                  <SelectItem value="blood_glucose">Blood Glucose</SelectItem>
                  <SelectItem value="oxygen_saturation">Oxygen Saturation</SelectItem>
                  <SelectItem value="respiratory_rate">Respiratory Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.vital_type === 'blood_pressure' ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="systolic" className="text-sm">Systolic *</Label>
                  <Input
                    id="systolic"
                    type="number"
                    value={formData.systolic}
                    onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
                    placeholder="120"
                    className="h-11 sm:h-12 rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diastolic" className="text-sm">Diastolic *</Label>
                  <Input
                    id="diastolic"
                    type="number"
                    value={formData.diastolic}
                    onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
                    placeholder="80"
                    className="h-11 sm:h-12 rounded-2xl"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value" className="text-sm">Value *</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.1"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="Value"
                    className="h-11 sm:h-12 rounded-2xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-sm">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Unit"
                    className="h-11 sm:h-12 rounded-2xl"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="measured_at" className="text-sm">Date & Time *</Label>
              <Input
                id="measured_at"
                type="datetime-local"
                value={formData.measured_at}
                onChange={(e) => setFormData({ ...formData, measured_at: e.target.value })}
                className="h-11 sm:h-12 rounded-2xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional observations"
                rows={3}
                className="rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-2xl active-press h-11 sm:h-12"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-2xl active-press shadow-lg h-11 sm:h-12"
                disabled={createMutation.isLoading}
              >
                Log Vital
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}