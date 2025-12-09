import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, CheckCircle, XCircle, Pill } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function MedicationReminders({ medications, profileId }) {
  const [upcomingDoses, setUpcomingDoses] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    calculateUpcomingDoses();
    const interval = setInterval(calculateUpcomingDoses, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [medications]);

  const logMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['medicationLogs']);
      calculateUpcomingDoses();
    },
  });

  const calculateUpcomingDoses = () => {
    const now = new Date();
    const upcoming = [];

    medications.forEach(med => {
      if (!med.times || med.times.length === 0) return;

      med.times.forEach(time => {
        const [hours, minutes] = time.split(':');
        const doseTime = new Date();
        doseTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // If dose time has passed today, skip
        if (doseTime < now) return;

        const minutesUntil = Math.floor((doseTime - now) / 1000 / 60);
        
        // Show doses in next 2 hours
        if (minutesUntil <= 120) {
          upcoming.push({
            medication: med,
            time: doseTime,
            minutesUntil,
            isDue: minutesUntil <= 15
          });
        }
      });
    });

    upcoming.sort((a, b) => a.minutesUntil - b.minutesUntil);
    setUpcomingDoses(upcoming.slice(0, 5));
  };

  const handleTaken = (dose) => {
    logMutation.mutate({
      medication_id: dose.medication.id,
      profile_id: profileId,
      scheduled_time: dose.time.toISOString(),
      taken_at: new Date().toISOString(),
      status: 'taken'
    });
  };

  const handleSkipped = (dose) => {
    logMutation.mutate({
      medication_id: dose.medication.id,
      profile_id: profileId,
      scheduled_time: dose.time.toISOString(),
      status: 'skipped'
    });
  };

  if (upcomingDoses.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm rounded-2xl mb-6" style={{ backgroundColor: '#F7C9A3' }}>
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="text-sm font-semibold text-[#0A0A0A] flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Upcoming Medication Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {upcomingDoses.map((dose, idx) => (
            <div 
              key={idx} 
              className={`p-3 rounded-xl ${dose.isDue ? 'bg-red-50 border-2 border-red-200' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  <Pill className="w-5 h-5 text-[#0A0A0A] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-[#0A0A0A] text-sm">
                      {dose.medication.medication_name}
                    </p>
                    <p className="text-xs text-gray-600">{dose.medication.dosage}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        {format(dose.time, 'h:mm a')}
                      </span>
                      {dose.isDue && (
                        <Badge className="bg-red-100 text-red-700 border-none text-xs rounded-lg">
                          DUE NOW
                        </Badge>
                      )}
                      {!dose.isDue && (
                        <span className="text-xs text-gray-500">
                          in {dose.minutesUntil} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => handleTaken(dose)}
                  disabled={logMutation.isLoading}
                  className="flex-1 bg-green-500 hover:bg-green-600 rounded-xl text-xs"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Taken
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSkipped(dose)}
                  disabled={logMutation.isLoading}
                  className="flex-1 rounded-xl text-xs"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Skip
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}