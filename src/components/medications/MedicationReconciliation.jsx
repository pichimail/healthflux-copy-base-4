import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertTriangle, CheckCircle, Loader2, FileText, AlertCircle, 
  TrendingUp, Shield, Copy, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function MedicationReconciliation({ profileId, medications }) {
  const [reconciliationData, setReconciliationData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('reconcileMedications', {
        profile_id: profileId,
        medications
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setReconciliationData(data.reconciliation);
        setShowDetails(true);
        toast.success('Medication reconciliation complete');
      }
    },
    onError: (error) => {
      console.error('Reconciliation error:', error);
      toast.error('Failed to reconcile medications');
    }
  });

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRiskScoreColor = (score) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const downloadReport = () => {
    if (!reconciliationData) return;

    let report = `MEDICATION RECONCILIATION REPORT\n`;
    report += `Generated: ${format(new Date(), 'PPP')}\n`;
    report += `Risk Score: ${reconciliationData.risk_score}/100\n`;
    report += `Requires Immediate Review: ${reconciliationData.requires_immediate_review ? 'YES' : 'No'}\n\n`;
    
    report += `═══════════════════════════════════════\n`;
    report += `PHARMACIST SUMMARY\n`;
    report += `═══════════════════════════════════════\n`;
    report += `${reconciliationData.pharmacist_summary}\n\n`;

    if (reconciliationData.duplicates?.length > 0) {
      report += `DUPLICATE MEDICATIONS (${reconciliationData.duplicates.length})\n`;
      report += `───────────────────────────────────────\n`;
      reconciliationData.duplicates.forEach((dup, i) => {
        report += `${i + 1}. ${dup.medications.join(' + ')}\n`;
        report += `   Reason: ${dup.reason}\n`;
        report += `   Recommendation: ${dup.recommendation}\n\n`;
      });
    }

    if (reconciliationData.conflicts?.length > 0) {
      report += `CONFLICTING DOSAGES (${reconciliationData.conflicts.length})\n`;
      report += `───────────────────────────────────────\n`;
      reconciliationData.conflicts.forEach((conf, i) => {
        report += `${i + 1}. ${conf.medication}\n`;
        report += `   Issue: ${conf.issue}\n`;
        report += `   Recommendation: ${conf.recommendation}\n\n`;
      });
    }

    if (reconciliationData.interactions?.length > 0) {
      report += `DRUG INTERACTIONS (${reconciliationData.interactions.length})\n`;
      report += `───────────────────────────────────────\n`;
      reconciliationData.interactions.forEach((int, i) => {
        report += `${i + 1}. ${int.medications.join(' + ')} [${int.interaction_type.toUpperCase()}]\n`;
        report += `   ${int.description}\n`;
        report += `   Recommendation: ${int.recommendation}\n\n`;
      });
    }

    if (reconciliationData.optimizations?.length > 0) {
      report += `OPTIMIZATION OPPORTUNITIES\n`;
      report += `───────────────────────────────────────\n`;
      reconciliationData.optimizations.forEach((opt, i) => {
        report += `${i + 1}. ${opt.suggested}\n`;
        report += `   Current: ${opt.current}\n`;
        report += `   Benefit: ${opt.benefit}\n\n`;
      });
    }

    if (reconciliationData.consolidated_list?.length > 0) {
      report += `OPTIMIZED MEDICATION LIST\n`;
      report += `───────────────────────────────────────\n`;
      reconciliationData.consolidated_list.forEach((med, i) => {
        report += `${i + 1}. ${med.medication} ${med.dosage}\n`;
        report += `   Frequency: ${med.frequency}\n`;
        report += `   Timing: ${med.timing}\n`;
        if (med.notes) report += `   Notes: ${med.notes}\n`;
        report += `\n`;
      });
    }

    report += `\n───────────────────────────────────────\n`;
    report += `This report is for healthcare professional review.\n`;
    report += `Generated by HealthFlux Medication Reconciliation AI\n`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medication-reconciliation-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  if (medications.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-3">
            <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-[#0A0A0A] text-sm mb-1">Smart Medication Review</h3>
              <p className="text-xs text-gray-700 mb-3">
                AI-powered reconciliation to identify duplicates, conflicts, and optimization opportunities
              </p>
              <Button
                onClick={() => reconcileMutation.mutate()}
                disabled={reconcileMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl active-press shadow-lg h-10 sm:h-11"
              >
                {reconcileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Run Reconciliation
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Medication Reconciliation Report
            </DialogTitle>
          </DialogHeader>

          {reconciliationData && (
            <div className="space-y-4 mt-4">
              {/* Risk Score */}
              <div className="p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Risk Assessment</span>
                  <span className={`text-2xl font-bold ${getRiskScoreColor(reconciliationData.risk_score)}`}>
                    {reconciliationData.risk_score}/100
                  </span>
                </div>
                {reconciliationData.requires_immediate_review && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 rounded-xl">
                    ⚠️ Requires Immediate Review
                  </Badge>
                )}
              </div>

              {/* Pharmacist Summary */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Clinical Summary
                </h3>
                <p className="text-xs text-gray-700">{reconciliationData.pharmacist_summary}</p>
              </div>

              {/* Allergy Alerts */}
              {reconciliationData.allergy_alerts?.length > 0 && (
                <div className="p-4 bg-red-50 rounded-2xl border-2 border-red-200">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    Allergy Alerts ({reconciliationData.allergy_alerts.length})
                  </h3>
                  <div className="space-y-2">
                    {reconciliationData.allergy_alerts.map((alert, i) => (
                      <div key={i} className="p-2 bg-white rounded-xl">
                        <p className="text-sm font-semibold text-red-700">{alert.medication}</p>
                        <p className="text-xs text-gray-700">Allergen: {alert.allergen}</p>
                        <p className="text-xs text-gray-600 mt-1">{alert.risk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {reconciliationData.duplicates?.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Duplicate Medications ({reconciliationData.duplicates.length})
                  </h3>
                  <div className="space-y-2">
                    {reconciliationData.duplicates.map((dup, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-semibold">{dup.medications.join(' + ')}</p>
                          <Badge className={`${getSeverityColor(dup.severity)} text-xs rounded-xl`}>
                            {dup.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">Reason: {dup.reason}</p>
                        <p className="text-xs text-gray-700 font-medium">💡 {dup.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conflicts */}
              {reconciliationData.conflicts?.length > 0 && (
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Dosage Conflicts ({reconciliationData.conflicts.length})
                  </h3>
                  <div className="space-y-2">
                    {reconciliationData.conflicts.map((conf, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-semibold">{conf.medication}</p>
                          <Badge className={`${getSeverityColor(conf.severity)} text-xs rounded-xl`}>
                            {conf.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">Issue: {conf.issue}</p>
                        <p className="text-xs text-gray-700 font-medium">💡 {conf.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactions */}
              {reconciliationData.interactions?.length > 0 && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Drug Interactions ({reconciliationData.interactions.length})
                  </h3>
                  <div className="space-y-2">
                    {reconciliationData.interactions.map((int, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-semibold">{int.medications.join(' + ')}</p>
                          <Badge className={`${getSeverityColor(int.interaction_type)} text-xs rounded-xl uppercase`}>
                            {int.interaction_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-700 mb-1">{int.description}</p>
                        <p className="text-xs text-gray-700 font-medium">💡 {int.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optimizations */}
              {reconciliationData.optimizations?.length > 0 && (
                <div className="p-4 bg-green-50 rounded-2xl border border-green-200">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Optimization Opportunities ({reconciliationData.optimizations.length})
                  </h3>
                  <div className="space-y-2">
                    {reconciliationData.optimizations.map((opt, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl">
                        <p className="text-sm font-semibold text-green-700 mb-1">✨ {opt.suggested}</p>
                        <p className="text-xs text-gray-600 mb-1">Current: {opt.current}</p>
                        <p className="text-xs text-gray-700">Benefit: {opt.benefit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consolidated List */}
              {reconciliationData.consolidated_list?.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Optimized Medication List
                  </h3>
                  <div className="space-y-2">
                    {reconciliationData.consolidated_list.map((med, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl">
                        <p className="text-sm font-semibold">{med.medication} {med.dosage}</p>
                        <p className="text-xs text-gray-600">Frequency: {med.frequency}</p>
                        <p className="text-xs text-gray-600">Timing: {med.timing}</p>
                        {med.notes && <p className="text-xs text-gray-500 mt-1">{med.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={downloadReport}
                  variant="outline"
                  className="flex-1 rounded-2xl active-press h-11"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
                <Button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl active-press h-11"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}