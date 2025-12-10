import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertCircle, Plus, Send, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function SideEffectTracker({ profileId, medications }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    medication_id: '',
    severity: 'mild',
    symptom: '',
    onset_time: new Date().toISOString().slice(0, 16),
    duration_minutes: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: sideEffects = [] } = useQuery({
    queryKey: ['sideEffects', profileId],
    queryFn: () => base44.entities.SideEffect.filter({ profile_id: profileId }, '-onset_time'),
    enabled: !!profileId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SideEffect.create({
      ...data,
      profile_id: profileId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sideEffects', profileId]);
      setShowForm(false);
      resetForm();
      toast.success('Side effect logged');
    }
  });

  const reportMutation = useMutation({
    mutationFn: async (sideEffectId) => {
      const sideEffect = sideEffects.find(se => se.id === sideEffectId);
      const medication = medications.find(m => m.id === sideEffect.medication_id);
      
      // Generate report summary
      const report = `Side Effect Report
      
Medication: ${medication?.medication_name} ${medication?.dosage}
Symptom: ${sideEffect.symptom}
Severity: ${sideEffect.severity}
Onset: ${format(new Date(sideEffect.onset_time), 'PPpp')}
Duration: ${sideEffect.duration_minutes ? `${sideEffect.duration_minutes} minutes` : 'Ongoing'}
Notes: ${sideEffect.notes || 'None'}`;

      // Update side effect as reported
      await base44.entities.SideEffect.update(sideEffectId, {
        reported_to_doctor: true,
        reported_date: new Date().toISOString(),
        action_taken: 'Report generated for healthcare provider'
      });

      return report;
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries(['sideEffects', profileId]);
      
      // Create a downloadable file
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `side-effect-report-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Report generated and marked as reported');
    }
  });

  const resetForm = () => {
    setFormData({
      medication_id: '',
      severity: 'mild',
      symptom: '',
      onset_time: new Date().toISOString().slice(0, 16),
      duration_minutes: '',
      notes: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-700 border-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'severe': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'life_threatening': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const unreportedCount = sideEffects.filter(se => !se.reported_to_doctor).length;

  return (
    <>
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <AlertCircle className="h-4 sm:h-5 w-4 sm:w-5 text-orange-600" />
              Side Effects
              {unreportedCount > 0 && (
                <Badge variant="destructive" className="text-xs">{unreportedCount}</Badge>
              )}
            </CardTitle>
            <Button onClick={() => setShowForm(true)} size="sm" className="rounded-2xl text-xs active-press h-9 sm:h-10 shadow-lg">
              <Plus className="h-3 sm:h-4 w-3 sm:w-4 mr-1" />
              Log
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
        {sideEffects.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <AlertCircle className="h-10 sm:h-12 w-10 sm:w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-xs sm:text-sm text-gray-600">No side effects logged</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {sideEffects.map(se => {
              const medication = medications.find(m => m.id === se.medication_id);
              return (
                <Card key={se.id} className="border-gray-200 rounded-2xl">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <Badge variant="outline" className={`${getSeverityColor(se.severity)} text-xs rounded-xl`}>
                            {se.severity}
                          </Badge>
                          {se.reported_to_doctor && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs rounded-xl">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Reported
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-[#0A0A0A] text-sm truncate">{se.symptom}</p>
                        <p className="text-xs text-gray-600 truncate">
                          {medication?.medication_name} • {format(new Date(se.onset_time), 'MMM d')}
                        </p>
                        {se.duration_minutes && (
                          <p className="text-xs text-gray-500 mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {se.duration_minutes}m
                          </p>
                        )}
                        {se.notes && (
                          <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded-xl">
                            {se.notes}
                          </p>
                        )}
                      </div>
                      {!se.reported_to_doctor && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reportMutation.mutate(se.id)}
                          disabled={reportMutation.isPending}
                          className="rounded-2xl text-xs active-press h-9 flex-shrink-0 ml-2"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Report
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={showForm} onOpenChange={setShowForm}>
      <DialogContent className="w-[95vw] sm:max-w-2xl p-4 sm:p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Log Side Effect</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm">Medication *</Label>
            <Select
              value={formData.medication_id}
              onValueChange={(value) => setFormData({ ...formData, medication_id: value })}
              required
            >
              <SelectTrigger className="h-11 sm:h-12 rounded-2xl">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {medications.map(med => (
                  <SelectItem key={med.id} value={med.id}>
                    {med.medication_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Severity *</Label>
            <Select
              value={formData.severity}
              onValueChange={(value) => setFormData({ ...formData, severity: value })}
            >
              <SelectTrigger className="h-11 sm:h-12 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mild">Mild</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
                <SelectItem value="life_threatening">Life Threatening</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Symptom *</Label>
            <Input
              value={formData.symptom}
              onChange={(e) => setFormData({ ...formData, symptom: e.target.value })}
              placeholder="Nausea, Headache"
              className="h-11 sm:h-12 rounded-2xl"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-sm">When? *</Label>
              <Input
                type="datetime-local"
                value={formData.onset_time}
                onChange={(e) => setFormData({ ...formData, onset_time: e.target.value })}
                className="h-11 sm:h-12 rounded-2xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Duration (min)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                placeholder="30"
                className="h-11 sm:h-12 rounded-2xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Details..."
              rows={3}
              className="rounded-2xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="rounded-2xl active-press h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl active-press shadow-lg h-11"
            >
              {createMutation.isPending ? 'Saving...' : 'Log'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}