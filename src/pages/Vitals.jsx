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
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A0A0A] mb-1">Vitals Tracking</h1>
          <p className="text-sm text-gray-600">Monitor your health vitals over time</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-xl font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Log Vital
        </Button>
      </div>

      {/* Profile Filter */}
      <div className="mb-6">
        <Select value={selectedProfile || 'all'} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full sm:w-64 rounded-xl border-gray-200">
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : vitals.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4 text-sm">No vitals recorded yet</p>
          <Button onClick={() => setDialogOpen(true)} className="rounded-xl bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A]">
            <Plus className="w-4 h-4 mr-2" />
            Log Your First Vital
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {vitals.map((vital) => {
            const profile = profiles.find(p => p.id === vital.profile_id);
            const Icon = getVitalIcon(vital.vital_type);
            return (
              <Card key={vital.id} className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#9BB4FF] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#0A0A0A]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#0A0A0A] capitalize mb-1 text-sm">
                          {vital.vital_type.replace(/_/g, ' ')}
                        </h3>
                        <p className="text-xl font-bold text-[#0A0A0A] mb-2">
                          {formatVitalValue(vital)}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                          {profile && (
                            <span>{profile.full_name}</span>
                          )}
                          <span>{format(new Date(vital.measured_at), 'MMM d, h:mm a')}</span>
                          {vital.source && (
                            <span className="capitalize">{vital.source}</span>
                          )}
                        </div>
                        {vital.notes && (
                          <p className="text-xs text-gray-600 mt-2 bg-[#F4F4F2] p-2 rounded-lg">
                            {vital.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this vital measurement?')) {
                          deleteMutation.mutate(vital.id);
                        }
                      }}
                      className="text-red-600 hover:bg-red-50 rounded-xl"
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

      {/* Add Vital Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Vital Measurement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="vital_type">Vital Type *</Label>
              <Select
                value={formData.vital_type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="systolic">Systolic *</Label>
                  <Input
                    id="systolic"
                    type="number"
                    value={formData.systolic}
                    onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
                    placeholder="e.g., 120"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diastolic">Diastolic *</Label>
                  <Input
                    id="diastolic"
                    type="number"
                    value={formData.diastolic}
                    onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
                    placeholder="e.g., 80"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value *</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.1"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="Enter value"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Unit"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="measured_at">Date & Time *</Label>
              <Input
                id="measured_at"
                type="datetime-local"
                value={formData.measured_at}
                onChange={(e) => setFormData({ ...formData, measured_at: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional observations"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
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