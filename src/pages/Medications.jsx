import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Pill, Plus, Edit, Trash2, Clock, Calendar, CheckCircle, XCircle, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export default function Medications() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [formData, setFormData] = useState({
    medication_name: '',
    dosage: '',
    frequency: 'once_daily',
    times: ['08:00'],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    purpose: '',
    prescriber: '',
    reminders_enabled: true,
  });

  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date'),
  });

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['medications', selectedProfile],
    queryFn: () => selectedProfile
      ? base44.entities.Medication.filter({ profile_id: selectedProfile, is_active: true }, '-created_date')
      : base44.entities.Medication.filter({ is_active: true }, '-created_date'),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['medicationLogs', selectedMed?.id],
    queryFn: () => selectedMed
      ? base44.entities.MedicationLog.filter({ medication_id: selectedMed.id }, '-scheduled_time', 10)
      : [],
    enabled: !!selectedMed,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Medication.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['medications']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Medication.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['medications']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const logMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['medicationLogs']);
      setLogDialogOpen(false);
    },
  });

  const resetForm = () => {
    setFormData({
      medication_name: '',
      dosage: '',
      frequency: 'once_daily',
      times: ['08:00'],
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      purpose: '',
      prescriber: '',
      reminders_enabled: true,
    });
    setSelectedMed(null);
  };

  const handleEdit = (med) => {
    setSelectedMed(med);
    setFormData({
      medication_name: med.medication_name,
      dosage: med.dosage,
      frequency: med.frequency,
      times: med.times || ['08:00'],
      start_date: med.start_date,
      end_date: med.end_date || '',
      purpose: med.purpose || '',
      prescriber: med.prescriber || '',
      reminders_enabled: med.reminders_enabled ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
    
    if (!profileId) {
      alert('Please select a profile');
      return;
    }

    const data = {
      ...formData,
      profile_id: profileId,
      is_active: true,
    };

    if (selectedMed) {
      updateMutation.mutate({ id: selectedMed.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleLogDose = (medication, status) => {
    logMutation.mutate({
      medication_id: medication.id,
      profile_id: medication.profile_id,
      scheduled_time: new Date().toISOString(),
      taken_at: status === 'taken' ? new Date().toISOString() : null,
      status,
    });
  };

  const handleDeactivate = (med) => {
    if (confirm('Mark this medication as inactive?')) {
      updateMutation.mutate({
        id: med.id,
        data: { ...med, is_active: false },
      });
    }
  };

  const addTimeSlot = () => {
    setFormData({
      ...formData,
      times: [...formData.times, '12:00'],
    });
  };

  const removeTimeSlot = (index) => {
    setFormData({
      ...formData,
      times: formData.times.filter((_, i) => i !== index),
    });
  };

  const updateTimeSlot = (index, value) => {
    const newTimes = [...formData.times];
    newTimes[index] = value;
    setFormData({ ...formData, times: newTimes });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Medications</h1>
          <p className="text-slate-600">Track medications and adherence</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Medication
        </Button>
      </div>

      {/* Profile Filter */}
      <div className="mb-6">
        <Select value={selectedProfile || 'all'} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full sm:w-64">
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

      {/* Medications List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        </div>
      ) : medications.length === 0 ? (
        <div className="text-center py-12">
          <Pill className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">No active medications</p>
          <Button onClick={() => setDialogOpen(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Medication
          </Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {medications.map((med) => {
            const profile = profiles.find(p => p.id === med.profile_id);
            return (
              <Card key={med.id} className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                        <Pill className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900 mb-1">
                          {med.medication_name}
                        </h3>
                        <p className="text-slate-600 mb-2">{med.dosage}</p>
                        {profile && (
                          <p className="text-sm text-slate-500">👤 {profile.full_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(med)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(med)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-700 capitalize">{med.frequency.replace(/_/g, ' ')}</span>
                    </div>
                    {med.times && med.times.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Bell className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-700">{med.times.join(', ')}</span>
                      </div>
                    )}
                    {med.purpose && (
                      <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                        {med.purpose}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-700">
                        Started {format(new Date(med.start_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleLogDose(med, 'taken')}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Taken
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLogDose(med, 'skipped')}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Skipped
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Medication Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMed ? 'Edit Medication' : 'Add Medication'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medication_name">Medication Name *</Label>
                <Input
                  id="medication_name"
                  value={formData.medication_name}
                  onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                  placeholder="e.g., Aspirin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage *</Label>
                <Input
                  id="dosage"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="e.g., 500mg"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once_daily">Once Daily</SelectItem>
                  <SelectItem value="twice_daily">Twice Daily</SelectItem>
                  <SelectItem value="three_times_daily">Three Times Daily</SelectItem>
                  <SelectItem value="four_times_daily">Four Times Daily</SelectItem>
                  <SelectItem value="as_needed">As Needed</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reminder Times</Label>
              {formData.times.map((time, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => updateTimeSlot(index, e.target.value)}
                    className="flex-1"
                  />
                  {formData.times.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTimeSlot(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTimeSlot}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Time
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose/Condition</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., High blood pressure"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prescriber">Prescribing Doctor</Label>
              <Input
                id="prescriber"
                value={formData.prescriber}
                onChange={(e) => setFormData({ ...formData, prescriber: e.target.value })}
                placeholder="Doctor's name"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label htmlFor="reminders" className="cursor-pointer">Enable Reminders</Label>
              <Switch
                id="reminders"
                checked={formData.reminders_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, reminders_enabled: checked })}
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
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                disabled={createMutation.isLoading || updateMutation.isLoading}
              >
                {selectedMed ? 'Update' : 'Add'} Medication
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}