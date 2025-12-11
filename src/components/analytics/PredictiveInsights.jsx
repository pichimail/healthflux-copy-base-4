import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, AlertTriangle, TrendingUp, Target } from 'lucide-react';

export default function PredictiveInsights({ profileId, dateRange }) {
  const [predictions, setPredictions] = useState(null);

  const predictMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('predictiveHealthAnalysis', {
        profile_id: profileId,
        analysis_period_start: dateRange.start,
        analysis_period_end: dateRange.end
      });
      return data;
    },
    onSuccess: (data) => {
      setPredictions(data);
    }
  });

  const getRiskColor = (level) => {
    if (level === 'high' || level === 'critical') return 'bg-red-600 text-white';
    if (level === 'medium' || level === 'moderate') return 'bg-yellow-600 text-white';
    return 'bg-green-600 text-white';
  };

  return (
    <div className="space-y-4">
      {!predictions ? (
        <Card className="border-0 card-shadow rounded-2xl" style={{ backgroundColor: '#FEF3C7' }}>
          <CardContent className="p-6 text-center">
            <Sparkles className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Predictive Health Analysis</h3>
            <p className="text-sm text-gray-700 mb-4">
              AI will analyze your historical data to predict:
            </p>
            <ul className="text-xs text-gray-600 mb-6 space-y-1">
              <li>• Potential health risks in the next 30-90 days</li>
              <li>• Trend projections for key metrics</li>
              <li>• Early warning indicators</li>
              <li>• Preventive action recommendations</li>
            </ul>
            <Button
              onClick={() => predictMutation.mutate()}
              disabled={predictMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700 text-white rounded-2xl"
            >
              {predictMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Predictions...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Predictions
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Risk Predictions */}
          {predictions.risk_predictions?.length > 0 && (
            <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Predicted Health Risks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {predictions.risk_predictions.map((risk, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl ${
                    risk.risk_level === 'high' ? 'bg-red-50 border-2 border-red-200' :
                    risk.risk_level === 'medium' ? 'bg-yellow-50 border-2 border-yellow-200' :
                    'bg-blue-50'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm">{risk.condition}</h4>
                      <Badge className={getRiskColor(risk.risk_level)}>
                        {risk.risk_level}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">{risk.description}</p>
                    <div className="bg-white p-3 rounded-xl space-y-2">
                      <div>
                        <p className="text-xs font-semibold">Likelihood:</p>
                        <p className="text-xs text-gray-600">{risk.likelihood_percentage}% within {risk.timeframe}</p>
                      </div>
                      {risk.contributing_factors?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold">Contributing Factors:</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {risk.contributing_factors.map((factor, i) => (
                              <li key={i}>• {factor}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {risk.preventive_actions?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700">Preventive Actions:</p>
                          <ul className="text-xs text-gray-700 space-y-1">
                            {risk.preventive_actions.map((action, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <Target className="w-3 h-3 flex-shrink-0 mt-0.5 text-green-600" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Trend Projections */}
          {predictions.trend_projections && (
            <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  30-Day Trend Projections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(predictions.trend_projections).map(([metric, proj], idx) => (
                  <div key={idx} className="bg-blue-50 p-3 rounded-2xl">
                    <h4 className="font-semibold text-sm mb-2 capitalize">{metric.replace(/_/g, ' ')}</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-xl">
                        <p className="text-gray-600">Current Avg</p>
                        <p className="font-bold">{proj.current_average}</p>
                      </div>
                      <div className="bg-white p-2 rounded-xl">
                        <p className="text-gray-600">Projected</p>
                        <p className="font-bold">{proj.projected_value}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 mt-2">{proj.trend_direction}</p>
                    {proj.recommendation && (
                      <p className="text-xs text-blue-700 mt-2 bg-white p-2 rounded-xl">
                        💡 {proj.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Early Warning Signs */}
          {predictions.early_warning_indicators?.length > 0 && (
            <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold">🚨 Early Warning Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {predictions.early_warning_indicators.map((warning, idx) => (
                  <div key={idx} className="bg-orange-50 p-3 rounded-2xl border border-orange-200">
                    <h4 className="font-semibold text-sm mb-1">{warning.indicator}</h4>
                    <p className="text-xs text-gray-700">{warning.description}</p>
                    <p className="text-xs text-orange-700 mt-2">⚠️ {warning.action_needed}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Button
            onClick={() => predictMutation.mutate()}
            disabled={predictMutation.isPending}
            variant="outline"
            className="w-full rounded-2xl"
          >
            {predictMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Refresh Predictions
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}