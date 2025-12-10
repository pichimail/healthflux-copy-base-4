import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function EffectivenessTracker({ medication, profileId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    rating: 3,
    improvement_percentage: 50,
    symptoms_before: '',
    symptoms_after: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: effectiveness = [] } = useQuery({
    queryKey: ['effectiveness', medication?.id],
    queryFn: () => base44.entities.MedicationEffectiveness.filter({ 
      medication_id: medication.id 
    }, '-recorded_at'),
    enabled: !!medication?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicationEffectiveness.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['effectiveness']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      rating: 3,
      improvement_percentage: 50,
      symptoms_before: '',
      symptoms_after: '',
      notes: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      medication_id: medication.id,
      profile_id: profileId,
      rating: formData.rating,
      improvement_percentage: formData.improvement_percentage,
      symptoms_before: formData.symptoms_before.split(',').map(s => s.trim()).filter(Boolean),
      symptoms_after: formData.symptoms_after.split(',').map(s => s.trim()).filter(Boolean),
      notes: formData.notes,
      recorded_at: new Date().toISOString()
    });
  };

  const avgRating = effectiveness.length > 0
    ? (effectiveness.reduce((sum, e) => sum + e.rating, 0) / effectiveness.length).toFixed(1)
    : 0;

  const avgImprovement = effectiveness.length > 0
    ? Math.round(effectiveness.reduce((sum, e) => sum + e.improvement_percentage, 0) / effectiveness.length)
    : 0;

  return (
    <>
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-3 sm:mb-4">
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <CardTitle className="text-sm font-semibold text-[#0A0A0A] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-600" />
              Effectiveness
            </span>
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl text-xs active-press h-9"
            >
              Rate
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {effectiveness.length === 0 ? (
            <p className="text-center text-gray-600 py-4 text-xs">No ratings yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#F4F4F2] rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < avgRating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`} />
                  ))}
                </div>
                <p className="text-lg font-bold text-[#0A0A0A]">{avgRating}/5</p>
                <p className="text-xs text-gray-600">Rating</p>
              </div>
              <div className="p-3 bg-[#F4F4F2] rounded-2xl text-center">
                <TrendingUp className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-[#0A0A0A]">{avgImprovement}%</p>
                <p className="text-xs text-gray-600">Improvement</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base">Rate Effectiveness</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Rating</Label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating })}
                    className="active-press"
                  >
                    <Star className={`w-8 h-8 sm:w-10 sm:h-10 ${rating <= formData.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Improvement: {formData.improvement_percentage}%</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.improvement_percentage}
                onChange={(e) => setFormData({ ...formData, improvement_percentage: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Symptoms Before (comma separated)</Label>
              <Textarea
                value={formData.symptoms_before}
                onChange={(e) => setFormData({ ...formData, symptoms_before: e.target.value })}
                placeholder="headache, fatigue"
                rows={2}
                className="rounded-2xl text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Symptoms After</Label>
              <Textarea
                value={formData.symptoms_after}
                onChange={(e) => setFormData({ ...formData, symptoms_after: e.target.value })}
                placeholder="mild headache"
                rows={2}
                className="rounded-2xl text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional observations"
                rows={2}
                className="rounded-2xl text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-2xl active-press">
                Cancel
              </Button>
              <Button type="submit" className="bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl active-press shadow-lg">
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}