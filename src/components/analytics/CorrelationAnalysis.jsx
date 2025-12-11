import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, TrendingUp, AlertCircle, Lightbulb } from 'lucide-react';

export default function CorrelationAnalysis({ profileId, dateRange }) {
  const [correlations, setCorrelations] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('analyzeHealthCorrelations', {
        profile_id: profileId,
        start_date: dateRange.start,
        end_date: dateRange.end
      });
      return data;
    },
    onSuccess: (data) => {
      setCorrelations(data.correlations);
    }
  });

  const getStrengthColor = (strength) => {
    if (strength === 'strong') return 'bg-purple-600 text-white';
    if (strength === 'moderate') return 'bg-blue-600 text-white';
    return 'bg-gray-600 text-white';
  };

  return (
    <div className="space-y-4">
      {!correlations ?
      <Card className="border-0 card-shadow rounded-2xl" style={{ backgroundColor: '#EDE6F7' }}>
          <CardContent className="p-6 text-center">
            <Brain className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Discover Hidden Patterns</h3>
            <p className="text-sm text-gray-700 mb-4">Flux will analyse your health data to find correlations between different metrics like:

          </p>
            <ul className="text-xs text-gray-600 mb-6 space-y-1">
              <li>• How diet affects blood pressure</li>
              <li>• Medication adherence impact on vitals</li>
              <li>• Sleep quality correlation with glucose levels</li>
              <li>• Exercise effects on weight trends</li>
            </ul>
            <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl">

              {analyzeMutation.isPending ?
            <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </> :

            <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analyze Correlations
                </>
            }
            </Button>
          </CardContent>
        </Card> :

      <>
          {/* Significant Correlations */}
          {correlations.significant_patterns?.length > 0 &&
        <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Significant Patterns Found
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {correlations.significant_patterns.map((pattern, idx) =>
            <div key={idx} className="bg-purple-50 p-4 rounded-2xl">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm">{pattern.title}</h4>
                      <Badge className={getStrengthColor(pattern.strength)}>
                        {pattern.strength}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">{pattern.description}</p>
                    <div className="bg-white p-3 rounded-xl">
                      <p className="text-xs font-semibold mb-1">Correlation Details:</p>
                      <p className="text-xs text-gray-600">
                        {pattern.metric_1} ↔ {pattern.metric_2}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Correlation: {pattern.correlation_coefficient?.toFixed(2) || 'N/A'}
                      </p>
                    </div>
                    {pattern.actionable_insights?.length > 0 &&
              <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold flex items-center gap-1">
                          <Lightbulb className="w-3 h-3 text-yellow-600" />
                          Insights:
                        </p>
                        {pattern.actionable_insights.map((insight, i) =>
                <p key={i} className="text-xs text-gray-700 pl-4">• {insight}</p>
                )}
                      </div>
              }
                  </div>
            )}
              </CardContent>
            </Card>
        }

          {/* Diet Impact */}
          {correlations.diet_impact &&
        <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold">🍎 Diet Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(correlations.diet_impact).map(([metric, impact], idx) =>
            <div key={idx} className="bg-green-50 p-3 rounded-2xl">
                    <h4 className="font-semibold text-sm mb-1 capitalize">{metric.replace(/_/g, ' ')}</h4>
                    <p className="text-xs text-gray-700">{impact.description}</p>
                    {impact.recommendation &&
              <p className="text-xs text-green-700 mt-2 bg-white p-2 rounded-xl">
                        💡 {impact.recommendation}
                      </p>
              }
                  </div>
            )}
              </CardContent>
            </Card>
        }

          {/* Medication Effectiveness */}
          {correlations.medication_effectiveness &&
        <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold">💊 Medication Effectiveness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(correlations.medication_effectiveness).map(([med, data], idx) =>
            <div key={idx} className="bg-blue-50 p-3 rounded-2xl">
                    <h4 className="font-semibold text-sm mb-1">{med}</h4>
                    <p className="text-xs text-gray-700">{data.impact_description}</p>
                    {data.adherence_correlation &&
              <p className="text-xs text-blue-700 mt-2">
                        Adherence correlation: {data.adherence_correlation}
                      </p>
              }
                  </div>
            )}
              </CardContent>
            </Card>
        }

          {/* Refresh Button */}
          <Button
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
          variant="outline"
          className="w-full rounded-2xl">

            {analyzeMutation.isPending ?
          <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Re-analyzing...
              </> :

          <>
                <Brain className="w-4 h-4 mr-2" />
                Refresh Analysis
              </>
          }
          </Button>
        </>
      }
    </div>);

}