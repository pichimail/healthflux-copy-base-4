import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar } from 'lucide-react';
import { format, subMonths } from 'date-fns';

export default function ProviderReports({ profileId, medications }) {
  const [generating, setGenerating] = useState(false);

  const { data: logs = [] } = useQuery({
    queryKey: ['allMedLogs', profileId],
    queryFn: () => base44.entities.MedicationLog.filter({ profile_id: profileId }, '-scheduled_time', 1000),
    enabled: !!profileId,
  });

  const { data: sideEffects = [] } = useQuery({
    queryKey: ['allSideEffects', profileId],
    queryFn: () => base44.entities.SideEffect.filter({ profile_id: profileId }, '-onset_time'),
    enabled: !!profileId,
  });

  const { data: effectiveness = [] } = useQuery({
    queryKey: ['allEffectiveness', profileId],
    queryFn: () => base44.entities.MedicationEffectiveness.filter({ profile_id: profileId }, '-recorded_at'),
    enabled: !!profileId,
  });

  const generateComprehensiveReport = () => {
    setGenerating(true);

    // Calculate adherence stats
    const adherenceStats = {};
    medications.forEach(med => {
      const medLogs = logs.filter(l => l.medication_id === med.id);
      const taken = medLogs.filter(l => l.status === 'taken').length;
      const total = medLogs.length;
      adherenceStats[med.id] = {
        name: med.medication_name,
        dosage: med.dosage,
        adherence: total > 0 ? Math.round((taken / total) * 100) : 0,
        taken,
        total
      };
    });

    let reportContent = `COMPREHENSIVE MEDICATION REPORT
Generated: ${format(new Date(), 'PPP')}
Report Period: Last 90 Days

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT MEDICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    medications.forEach((med, idx) => {
      const stats = adherenceStats[med.id];
      const medEffectiveness = effectiveness.filter(e => e.medication_id === med.id);
      const avgRating = medEffectiveness.length > 0
        ? (medEffectiveness.reduce((sum, e) => sum + e.rating, 0) / medEffectiveness.length).toFixed(1)
        : 'N/A';

      reportContent += `${idx + 1}. ${med.medication_name}
   Dosage: ${med.dosage}
   Frequency: ${med.frequency?.replace(/_/g, ' ')}
   Start Date: ${format(new Date(med.start_date), 'PPP')}
   Purpose: ${med.purpose || 'Not specified'}
   Prescriber: ${med.prescriber || 'Not specified'}
   
   Adherence: ${stats.adherence}% (${stats.taken}/${stats.total} doses taken)
   Effectiveness Rating: ${avgRating}/5.0
   
`;
    });

    reportContent += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOCUMENTED SIDE EFFECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    if (sideEffects.length === 0) {
      reportContent += 'No side effects reported.\n\n';
    } else {
      sideEffects.forEach((se, idx) => {
        const med = medications.find(m => m.id === se.medication_id);
        reportContent += `${idx + 1}. Medication: ${med?.medication_name || 'Unknown'}
   Severity: ${se.severity.toUpperCase()}
   Symptom: ${se.symptom}
   Onset: ${format(new Date(se.onset_time), 'PPP p')}
   Duration: ${se.duration_minutes} minutes
   Action: ${se.action_taken || 'None'}
   Reported to Doctor: ${se.reported_to_doctor ? 'Yes' : 'No'}
   
`;
      });
    }

    reportContent += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EFFECTIVENESS FEEDBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    if (effectiveness.length === 0) {
      reportContent += 'No effectiveness data recorded.\n\n';
    } else {
      effectiveness.forEach((eff, idx) => {
        const med = medications.find(m => m.id === eff.medication_id);
        reportContent += `${idx + 1}. Medication: ${med?.medication_name || 'Unknown'}
   Rating: ${eff.rating}/5 stars
   Improvement: ${eff.improvement_percentage}%
   Symptoms Before: ${eff.symptoms_before?.join(', ') || 'Not specified'}
   Symptoms After: ${eff.symptoms_after?.join(', ') || 'Not specified'}
   Date: ${format(new Date(eff.recorded_at), 'PPP')}
   Notes: ${eff.notes || 'None'}
   
`;
      });
    }

    reportContent += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Active Medications: ${medications.length}
Total Doses Logged: ${logs.length}
Side Effects Reported: ${sideEffects.length}
Effectiveness Reviews: ${effectiveness.length}

This report is intended for healthcare provider review.
Please discuss all medications, side effects, and concerns with your doctor.

---
Report generated by HealthFlux
Date: ${format(new Date(), 'PPP')}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medication-report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setGenerating(false);
  };

  return (
    <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
      <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-base font-semibold text-[#0A0A0A] flex items-center gap-2">
          <FileText className="w-4 sm:w-5 h-4 sm:h-5" />
          Provider Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
            <h3 className="font-semibold text-[#0A0A0A] text-sm mb-2">Comprehensive Report</h3>
            <p className="text-xs text-gray-700 mb-3">
              Includes all medications, adherence data, side effects, and effectiveness ratings
            </p>
            <Button
              onClick={generateComprehensiveReport}
              disabled={generating || medications.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl active-press shadow-lg h-10 sm:h-11"
            >
              <Download className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Download Full Report'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="p-3 bg-[#F4F4F2] rounded-2xl text-center">
              <Calendar className="w-4 sm:w-5 h-4 sm:w-5 mx-auto mb-1 text-gray-600" />
              <p className="text-lg sm:text-xl font-bold text-[#0A0A0A]">{medications.length}</p>
              <p className="text-xs text-gray-600">Active Meds</p>
            </div>
            <div className="p-3 bg-[#F4F4F2] rounded-2xl text-center">
              <FileText className="w-4 sm:w-5 h-4 sm:w-5 mx-auto mb-1 text-gray-600" />
              <p className="text-lg sm:text-xl font-bold text-[#0A0A0A]">{sideEffects.length}</p>
              <p className="text-xs text-gray-600">Side Effects</p>
            </div>
          </div>

          <p className="text-xs text-gray-600 bg-yellow-50 p-2 sm:p-3 rounded-2xl">
            💡 Share this report with your doctor during consultations
          </p>
        </div>
      </CardContent>
    </Card>
  );
}