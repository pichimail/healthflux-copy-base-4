import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, CheckCircle, TrendingUp, Pill, Clock, 
  Target, Brain, Loader2, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';

export default function MedicationAdherenceInsights({ profileId }) {
  const [analysis, setAnalysis] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('analyzeMedicationAdherence', { 
        profile_id: profileId 
      });
      return data;
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
    },
  });

  const getAdherenceColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity) => {
    if (severity === 'major') return 'bg-red-100 text-red-700 border-red-200';
    if (severity === 'moderate') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  if (!analysis) {
    return (
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-4">
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Medication Adherence Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="text-center py-6">
            <Pill className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">
              Get AI-powered insights on your medication adherence patterns
            </p>
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isLoading}
              className="bg-[#EFF1ED] hover:bg-[#DFE1DD] text-[#0A0A0A] rounded-2xl"
            >
              {analyzeMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analyze Adherence
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 mb-4">
      {/* Overall Adherence Score */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl" style={{ backgroundColor: '#9BB4FF' }}>
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Overall Adherence
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isLoading}
              className="rounded-xl text-xs"
            >
              {analyzeMutation.isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="text-center mb-4">
            <div className={`text-4xl sm:text-5xl font-bold ${getAdherenceColor(analysis.overall_adherence)}`}>
              {analysis.overall_adherence}%
            </div>
            <Badge className="mt-2 capitalize">{analysis.adherence_category}</Badge>
          </div>
          <Progress value={analysis.overall_adherence} className="h-3" />
        </CardContent>
      </Card>

      {/* Drug Interaction Alerts */}
      {analysis.drug_interaction_alerts && analysis.drug_interaction_alerts.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl" style={{ backgroundColor: '#F7C9A3' }}>
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Drug Interaction Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-3">
            {analysis.drug_interaction_alerts.map((alert, idx) => (
              <div key={idx} className="bg-white/80 p-3 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{alert.medications.join(' & ')}</h4>
                  <Badge className={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-xs text-gray-700 mb-2">{alert.explanation}</p>
                <div className="bg-red-50 p-2 rounded-lg">
                  <p className="text-xs font-semibold text-red-700">Action Required:</p>
                  <p className="text-xs text-red-700">{alert.action_required}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Medication-Specific Insights */}
      {analysis.medication_insights && analysis.medication_insights.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
          <CardHeader 
            className="border-b border-gray-100 p-3 sm:p-4 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <Pill className="w-5 h-5" />
                Medication Insights ({analysis.medication_insights.length})
              </CardTitle>
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </div>
          </CardHeader>
          {expanded && (
            <CardContent className="p-3 sm:p-4 space-y-3">
              {analysis.medication_insights.map((insight, idx) => (
                <div key={idx} className="bg-[#F4F4F2] p-3 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm">{insight.medication_name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {insight.adherence_rate}% adherence
                    </Badge>
                  </div>
                  {insight.effectiveness_assessment && (
                    <p className="text-xs text-gray-700 mb-2">{insight.effectiveness_assessment}</p>
                  )}
                  {insight.concerns && insight.concerns.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Concerns:</p>
                      <ul className="space-y-1">
                        {insight.concerns.map((concern, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            {concern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {insight.recommendations && insight.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Recommendations:</p>
                      <ul className="space-y-1">
                        {insight.recommendations.map((rec, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                            <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-green-600" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Personalized Strategies */}
      {analysis.personalized_strategies && analysis.personalized_strategies.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl" style={{ backgroundColor: '#E9F46A' }}>
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" />
              Personalized Strategies
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-3">
            {analysis.personalized_strategies.map((strategy, idx) => (
              <div key={idx} className="bg-white/80 p-3 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{strategy.strategy}</h4>
                  <Badge variant="outline" className="text-xs capitalize">
                    {strategy.expected_impact} impact
                  </Badge>
                </div>
                <p className="text-xs text-gray-700">{strategy.implementation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Adherence Barriers */}
      {analysis.adherence_barriers && analysis.adherence_barriers.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Identified Barriers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-3">
            {analysis.adherence_barriers.map((barrier, idx) => (
              <div key={idx} className="bg-[#F4F4F2] p-3 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{barrier.barrier}</h4>
                  <Badge variant="outline" className="text-xs capitalize">
                    {barrier.frequency}
                  </Badge>
                </div>
                {barrier.suggested_solutions && barrier.suggested_solutions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">Solutions:</p>
                    <ul className="space-y-1">
                      {barrier.suggested_solutions.map((solution, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                          <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-green-600" />
                          {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Timing Recommendations */}
      {analysis.timing_recommendations && analysis.timing_recommendations.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Optimal Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-2">
            {analysis.timing_recommendations.map((timing, idx) => (
              <div key={idx} className="bg-[#F4F4F2] p-3 rounded-xl">
                <h4 className="font-semibold text-sm mb-1">{timing.medication}</h4>
                <p className="text-xs text-gray-700 mb-1">
                  <span className="font-semibold">Best time:</span> {timing.optimal_time}
                </p>
                <p className="text-xs text-gray-600">{timing.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}