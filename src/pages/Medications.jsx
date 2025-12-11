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
import { Pill, Plus, Edit, Trash2, Clock, Calendar, CheckCircle, XCircle, Bell, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import DrugInteractionWarnings from '../components/medications/DrugInteractionWarnings';
import MedicationReminders from '../components/medications/MedicationReminders';
import MedicationAdherenceInsights from '../components/medications/MedicationAdherenceInsights';
import AdherenceInsights from '../components/medication/AdherenceInsights';
import SideEffectTracker from '../components/medication/SideEffectTracker';
import MedicationHistory from '../components/medication/MedicationHistory';
import RefillManager from '../components/medications/RefillManager';
import EffectivenessTracker from '../components/medications/EffectivenessTracker';
import ProviderReports from '../components/medications/ProviderReports';
import MedicationReconciliation from '../components/medications/MedicationReconciliation';
import PrescriptionScanner from '../components/medications/PrescriptionScanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
    
    if (!profileId) {
      alert('Please select a profile');
      return;
    }

    // Check drug interactions for new medications
    if (!selectedMed) {
      try {
        const { data: interactionCheck } = await base44.functions.invoke('checkDrugInteractions', {
          profile_id: profileId,
          medication_name: formData.medication_name
        });

        if (interactionCheck.analysis.overall_severity === 'major' || interactionCheck.analysis.overall_severity === 'severe') {
          const proceed = confirm(
            `⚠️ WARNING: Potential ${interactionCheck.analysis.overall_severity} drug interaction detected!\n\n` +
            `${interactionCheck.analysis.interactions.map(i => i.description).join('\n\n')}\n\n` +
            'Do you want to proceed anyway? Please consult your doctor.'
          );
          if (!proceed) return;
        }
      } catch (error) {
        console.error('Interaction check failed:', error);
      }
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
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
      {/* Mobile-First Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
            💊 Medications
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">Track & manage</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#F7C9A3] hover:bg-[#E7B993] text-[#0A0A0A] rounded-2xl font-semibold shadow-lg active-press h-11 sm:h-12 px-4 sm:px-6"
        >
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Med</span>
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

      {/* Smart Features */}
      <div className="space-y-3 mb-4 sm:mb-6">
        <PrescriptionScanner 
          profileId={selectedProfile || profiles.find(p => p.relationship === 'self')?.id}
          onMedicationsExtracted={() => queryClient.invalidateQueries(['medications'])}
        />
        
        <MedicationReconciliation 
          profileId={selectedProfile || profiles.find(p => p.relationship === 'self')?.id}
          medications={medications}
        />
      </div>

      {/* Drug Interaction Warnings */}
      <DrugInteractionWarnings profileId={selectedProfile || profiles.find(p => p.relationship === 'self')?.id} />

      {/* Medication Reminders */}
      <MedicationReminders 
        medications={medications} 
        profileId={selectedProfile || profiles.find(p => p.relationship === 'self')?.id}
      />

      {/* Mobile-First Tabs */}
      <Tabs defaultValue="medications" className="mb-4 sm:mb-6">
        <TabsList className="grid w-full grid-cols-4 rounded-2xl h-11 sm:h-12">
          <TabsTrigger value="medications" className="text-xs sm:text-sm rounded-xl">Meds</TabsTrigger>
          <TabsTrigger value="adherence" className="text-xs sm:text-sm rounded-xl">Track</TabsTrigger>
          <TabsTrigger value="sideeffects" className="text-xs sm:text-sm rounded-xl">Side FX</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm rounded-xl">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="medications" className="mt-4">
          {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-b-2 border-purple-600" />
        </div>
      ) : medications.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <Pill className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-600 mb-4 text-sm">No active medications</p>
          <Button onClick={() => setDialogOpen(true)} className="rounded-2xl bg-[#F7C9A3] hover:bg-[#E7B993] text-[#0A0A0A] active-press shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Medication
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {medications.map((med) => {
            const profile = profiles.find(p => p.id === med.profile_id);
            return (
              <Card key={med.id} className="border-0 card-shadow rounded-2xl sm:rounded-3xl active-press hover:shadow-lg transition-all">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#F7C9A3] flex items-center justify-center flex-shrink-0">
                        <Pill className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A0A0A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-[#0A0A0A] mb-1 truncate">
                          {med.medication_name}
                        </h3>
                        <p className="text-gray-600 mb-1 sm:mb-2 text-xs sm:text-sm">{med.dosage}</p>
                        {profile && (
                          <p className="text-xs text-gray-500 truncate">{profile.full_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(med)}
                        className="rounded-xl h-9 w-9 sm:h-10 sm:w-10 active-press"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeactivate(med)}
                        className="text-red-600 hover:bg-red-50 rounded-xl h-9 w-9 sm:h-10 sm:w-10 active-press"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <RefillManager medication={med} profileId={med.profile_id} />
                  
                  <EffectivenessTracker medication={med} profileId={med.profile_id} />

                  <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-500" />
                      <span className="text-gray-700 capitalize">{med.frequency.replace(/_/g, ' ')}</span>
                    </div>
                    {med.times && med.times.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Bell className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-500" />
                        <span className="text-gray-700">{med.times.join(', ')}</span>
                      </div>
                    )}
                    {med.purpose && (
                      <p className="text-xs text-gray-600 bg-[#F4F4F2] p-2 rounded-xl">
                        {med.purpose}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-500" />
                      <span className="text-gray-700">
                        {format(new Date(med.start_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleLogDose(med, 'taken')}
                      className="bg-green-500 hover:bg-green-600 rounded-2xl text-xs active-press shadow-md h-10 sm:h-11"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Taken
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLogDose(med, 'skipped')}
                      className="rounded-2xl text-xs active-press h-10 sm:h-11"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Skip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </TabsContent>

        <TabsContent value="adherence" className="mt-4">
          <Tabs defaultValue="insights">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl h-11">
              <TabsTrigger value="insights" className="text-xs sm:text-sm rounded-xl">Insights</TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm rounded-xl">History</TabsTrigger>
            </TabsList>
            <TabsContent value="insights" className="mt-3 sm:mt-4">
              <AdherenceInsights profileId={selectedProfile || profiles.find(p => p.relationship === 'self')?.id} />
            </TabsContent>
            <TabsContent value="history" className="mt-3 sm:mt-4">
              <MedicationHistory 
                profileId={selectedProfile || profiles.find(p => p.relationship === 'self')?.id}
                medications={medications}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="sideeffects" className="mt-4">
          <SideEffectTracker 
            profileId={selectedProfile || profiles.find(p => p.relationship === 'self')?.id}
            medications={medications}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <ProviderReports 
            profileId={selectedProfile || profiles.find(p => p.relationship === 'self')?.id}
            medications={medications}
          />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Medication Dialog - Mobile Optimized */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {selectedMed ? 'Edit Medication' : 'Add Medication'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="medication_name" className="text-sm">Medication Name *</Label>
                <Input
                  id="medication_name"
                  value={formData.medication_name}
                  onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                  placeholder="e.g., Aspirin"
                  className="h-11 sm:h-12 rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dosage" className="text-sm">Dosage *</Label>
                <Input
                  id="dosage"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="e.g., 500mg"
                  className="h-11 sm:h-12 rounded-2xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency" className="text-sm">Frequency *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger className="h-11 sm:h-12 rounded-2xl">
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
              <Label className="text-sm">Reminder Times</Label>
              {formData.times.map((time, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => updateTimeSlot(index, e.target.value)}
                    className="flex-1 h-11 sm:h-12 rounded-2xl"
                  />
                  {formData.times.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeTimeSlot(index)}
                      className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl active-press"
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
                className="w-full rounded-2xl active-press h-10 sm:h-11"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Time
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-sm">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="h-11 sm:h-12 rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-sm">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="h-11 sm:h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose" className="text-sm">Purpose/Condition</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., High blood pressure"
                className="h-11 sm:h-12 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prescriber" className="text-sm">Prescribing Doctor</Label>
              <Input
                id="prescriber"
                value={formData.prescriber}
                onChange={(e) => setFormData({ ...formData, prescriber: e.target.value })}
                placeholder="Doctor's name"
                className="h-11 sm:h-12 rounded-2xl"
              />
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
              <Label htmlFor="reminders" className="cursor-pointer text-sm">Enable Reminders</Label>
              <Switch
                id="reminders"
                checked={formData.reminders_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, reminders_enabled: checked })}
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
                className="bg-[#F7C9A3] hover:bg-[#E7B993] text-[#0A0A0A] rounded-2xl active-press shadow-lg h-11 sm:h-12"
                disabled={createMutation.isLoading || updateMutation.isLoading}
              >
                {selectedMed ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}