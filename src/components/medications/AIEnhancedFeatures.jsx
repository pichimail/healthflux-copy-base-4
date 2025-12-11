import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, AlertTriangle, TrendingUp, Calendar, Sparkles,
  Loader2, CheckCircle, XCircle, Clock, ArrowRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AIEnhancedFeatures({ medication, profileId }) {
  const [sideEffectDialog, setSideEffectDialog] = useState(false);
  const [alternativesDialog, setAlternativesDialog] = useState(false);
  const [sideEffectPredictions, setSideEffectPredictions] = useState(null);
  const [alternatives, setAlternatives] = useState(null);

  const predictSideEffectsMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('predictSideEffects', {
        profile_id: profileId,
        medication_name: medication.medication_name,
        dosage: medication.dosage
      });
      return data;
    },
    onSuccess: (data) => {
      setSideEffectPredictions(data.predictions);
      setSideEffectDialog(true);
    },
  });

  const suggestAlternativesMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('suggestMedicationAlternatives', {
        profile_id: profileId,
        medication_id: medication.id
      });
      return data;
    },
    onSuccess: (data) => {
      setAlternatives(data.suggestions);
      setAlternativesDialog(true);
    },
  });

  const automateRefillMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('automateRefillRequest', {
        medication_id: medication.id,
        profile_id: profileId
      });
      return data;
    },
  });

  const getSeverityColor = (severity) => {
    if (severity === 'severe' || severity === 'major') return 'bg-red-100 text-red-700';
    if (severity === 'moderate' || severity === 'medium') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => predictSideEffectsMutation.mutate()}
          disabled={predictSideEffectsMutation.isPending}
          className="rounded-2xl text-xs h-9 flex items-center gap-1"
        >
          {predictSideEffectsMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Brain className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">Effects</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => suggestAlternativesMutation.mutate()}
          disabled={suggestAlternativesMutation.isPending}
          className="rounded-2xl text-xs h-9 flex items-center gap-1"
        >
          {suggestAlternativesMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">Alts</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => automateRefillMutation.mutate()}
          disabled={automateRefillMutation.isPending}
          className="rounded-2xl text-xs h-9 flex items-center gap-1"
        >
          {automateRefillMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Calendar className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">Refill</span>
        </Button>
      </div>

      {/* Side Effect Predictions Dialog */}
      <Dialog open={sideEffectDialog} onOpenChange={setSideEffectDialog}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Side Effect Predictions
            </DialogTitle>
          </DialogHeader>

          {sideEffectPredictions && (
            <div className="space-y-4 mt-4">
              {/* Common Side Effects */}
              {sideEffectPredictions.common_side_effects?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Common Side Effects</h3>
                  <div className="space-y-2">
                    {sideEffectPredictions.common_side_effects.map((effect, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-2xl">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{effect.symptom}</h4>
                          <div className="flex gap-1">
                            <Badge className={getSeverityColor(effect.severity)}>
                              {effect.severity}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {effect.likelihood}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-gray-700 mb-2">{effect.description}</p>
                        <p className="text-xs text-gray-600">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {effect.onset_timeframe}
                        </p>
                        {effect.management_tips?.length > 0 && (
                          <div className="mt-2 bg-white p-2 rounded-xl">
                            <p className="text-xs font-semibold mb-1">Management:</p>
                            <ul className="space-y-1">
                              {effect.management_tips.map((tip, i) => (
                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                  <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-green-600" />
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patient-Specific Risks */}
              {sideEffectPredictions.patient_specific_risks?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-red-700">⚠️ Patient-Specific Risks</h3>
                  <div className="space-y-2">
                    {sideEffectPredictions.patient_specific_risks.map((risk, idx) => (
                      <div key={idx} className="bg-red-50 p-3 rounded-2xl border border-red-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{risk.risk}</h4>
                          <Badge variant="outline" className="text-xs">
                            {risk.likelihood}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-700 mb-2">{risk.reason}</p>
                        <div className="bg-white p-2 rounded-xl">
                          <p className="text-xs font-semibold mb-1">Precautions:</p>
                          <ul className="space-y-1">
                            {risk.precautions.map((precaution, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-orange-600" />
                                {precaution}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Early Warning Signs */}
              {sideEffectPredictions.early_warning_signs?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">🚨 Early Warning Signs</h3>
                  <div className="space-y-2">
                    {sideEffectPredictions.early_warning_signs.map((sign, idx) => (
                      <div key={idx} className={`p-3 rounded-2xl ${
                        sign.urgency === 'immediate' ? 'bg-red-100' : 
                        sign.urgency === 'urgent' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-sm">{sign.sign}</h4>
                          <Badge className={
                            sign.urgency === 'immediate' ? 'bg-red-600 text-white' :
                            sign.urgency === 'urgent' ? 'bg-yellow-600 text-white' :
                            'bg-blue-600 text-white'
                          }>
                            {sign.urgency}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-700">{sign.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monitoring Recommendations */}
              {sideEffectPredictions.monitoring_recommendations && (
                <div className="bg-blue-50 p-4 rounded-2xl">
                  <h3 className="font-semibold text-sm mb-2">📊 Monitoring Recommendations</h3>
                  <div className="space-y-2 text-xs">
                    <p><strong>Track:</strong> {sideEffectPredictions.monitoring_recommendations.vitals_to_track?.join(', ')}</p>
                    <p><strong>Frequency:</strong> {sideEffectPredictions.monitoring_recommendations.frequency}</p>
                    {sideEffectPredictions.monitoring_recommendations.red_flags?.length > 0 && (
                      <div>
                        <p className="font-semibold mb-1">🚩 Red Flags:</p>
                        <ul className="space-y-1">
                          {sideEffectPredictions.monitoring_recommendations.red_flags.map((flag, i) => (
                            <li key={i} className="text-gray-700">• {flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alternatives Dialog */}
      <Dialog open={alternativesDialog} onOpenChange={setAlternativesDialog}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Alternative Medications (For Doctor's Review)
            </DialogTitle>
          </DialogHeader>

          {alternatives && (
            <div className="space-y-4 mt-4">
              {/* Disclaimer */}
              <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-200">
                <p className="text-xs font-semibold text-yellow-800">
                  ⚠️ {alternatives.disclaimer}
                </p>
              </div>

              {/* Primary Concerns */}
              {alternatives.primary_concerns?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Reasons for Review</h3>
                  <div className="bg-red-50 p-3 rounded-2xl">
                    <ul className="space-y-1">
                      {alternatives.primary_concerns.map((concern, idx) => (
                        <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-red-600" />
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Alternative Medications */}
              {alternatives.alternative_medications?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Alternative Options</h3>
                  <div className="space-y-3">
                    {alternatives.alternative_medications.map((alt, idx) => (
                      <div key={idx} className="bg-green-50 p-4 rounded-2xl border border-green-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-sm">{alt.medication_name}</h4>
                            <p className="text-xs text-gray-600">{alt.dosage_range}</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {alt.fewer_side_effects && (
                              <Badge className="bg-green-600 text-white text-xs">Fewer Side Effects</Badge>
                            )}
                            {alt.better_adherence_potential && (
                              <Badge className="bg-blue-600 text-white text-xs">Easier</Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {alt.advantages?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-1">Advantages:</p>
                              <ul className="space-y-1">
                                {alt.advantages.map((adv, i) => (
                                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                                    <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-green-600" />
                                    {adv}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {alt.contraindications?.length > 0 && (
                            <div className="bg-white p-2 rounded-xl">
                              <p className="text-xs font-semibold mb-1 text-red-700">Contraindications:</p>
                              <ul className="space-y-1">
                                {alt.contraindications.map((contra, i) => (
                                  <li key={i} className="text-xs text-gray-700">• {contra}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dosage Adjustments */}
              {alternatives.dosage_adjustments?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Dosage Adjustment Options</h3>
                  <div className="space-y-2">
                    {alternatives.dosage_adjustments.map((adj, idx) => (
                      <div key={idx} className="bg-blue-50 p-3 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold">{adj.current_dosage}</span>
                          <ArrowRight className="w-4 h-4" />
                          <span className="text-sm font-semibold text-blue-700">{adj.suggested_dosage}</span>
                        </div>
                        <p className="text-xs text-gray-700 mb-2">{adj.rationale}</p>
                        {adj.expected_improvements?.length > 0 && (
                          <div className="bg-white p-2 rounded-xl">
                            <p className="text-xs font-semibold mb-1">Expected Improvements:</p>
                            <ul className="space-y-1">
                              {adj.expected_improvements.map((imp, i) => (
                                <li key={i} className="text-xs text-gray-600">• {imp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {alternatives.next_steps?.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-2xl">
                  <h3 className="font-semibold text-sm mb-2">📋 Next Steps</h3>
                  <ul className="space-y-2">
                    {alternatives.next_steps.map((step, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold">{idx + 1}</span>
                        </div>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}