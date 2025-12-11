import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Phone, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function RefillManager({ medication, profileId, reminders: providedReminders }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    pharmacy_name: '',
    pharmacy_phone: '',
    prescription_number: '',
    refills_remaining: 0,
    refill_due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd')
  });

  const queryClient = useQueryClient();

  const { data: refills = [] } = useQuery({
    queryKey: ['refills', medication?.id],
    queryFn: () => base44.entities.RefillReminder.filter({ 
      medication_id: medication.id,
      status: 'pending'
    }, '-refill_due_date'),
    enabled: !!medication?.id,
  });

  const createReminderMutation = useMutation({
    mutationFn: (data) => base44.entities.RefillReminder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['refills']);
      setDialogOpen(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RefillReminder.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['refills']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createReminderMutation.mutate({
      medication_id: medication.id,
      profile_id: profileId,
      ...formData
    });
  };

  const dueRefills = refills.filter(r => {
    const daysUntil = Math.ceil((new Date(r.refill_due_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7;
  });

  if (dueRefills.length === 0) return null;

  return (
    <>
      <Card className="border-0 shadow-sm rounded-2xl bg-orange-50 mb-4">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#0A0A0A] text-sm mb-1">Refill Due Soon</h3>
              <p className="text-xs text-gray-700 mb-2">{medication.medication_name}</p>
              {dueRefills.map(refill => (
                <div key={refill.id} className="text-xs text-gray-600 mb-2">
                  <p className="font-medium">Due: {format(new Date(refill.refill_due_date), 'MMM d, yyyy')}</p>
                  {refill.pharmacy_name && <p>{refill.pharmacy_name} • {refill.pharmacy_phone}</p>}
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => updateStatusMutation.mutate({ id: dueRefills[0].id, status: 'ordered' })}
                  className="bg-green-600 hover:bg-green-700 rounded-xl text-xs active-press"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ordered
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                  className="rounded-xl text-xs"
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Refill Reminder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Pharmacy Name</Label>
              <Input
                value={formData.pharmacy_name}
                onChange={(e) => setFormData({ ...formData, pharmacy_name: e.target.value })}
                placeholder="CVS Pharmacy"
              />
            </div>
            <div>
              <Label>Pharmacy Phone</Label>
              <Input
                value={formData.pharmacy_phone}
                onChange={(e) => setFormData({ ...formData, pharmacy_phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label>Prescription Number</Label>
              <Input
                value={formData.prescription_number}
                onChange={(e) => setFormData({ ...formData, prescription_number: e.target.value })}
                placeholder="RX123456"
              />
            </div>
            <div>
              <Label>Refill Due Date</Label>
              <Input
                type="date"
                value={formData.refill_due_date}
                onChange={(e) => setFormData({ ...formData, refill_due_date: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A]">
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}