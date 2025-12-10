import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, Minus, Target, Flame, 
  AlertTriangle, CheckCircle, Sparkles, Loader2 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdherenceInsights({ profileId }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeAdherence = async () => {
    setAnalyzing(true);
    try {
      const { data } = await base44.functions.invoke('analyzeAdherence', { profile_id: profileId });
      setAnalysis(data);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!analysis) {
    return (
      <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50">
        <CardContent className="p-8 text-center">
          <Sparkles className="h-16 w-16 text-violet-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-violet-900 mb-2">
            Adherence Analysis
          </h3>
          <p className="text-sm text-violet-700 mb-6">
            Get personalized insights and strategies to improve your medication adherence
          </p>
          <Button 
            onClick={analyzeAdherence} 
            disabled={analyzing}
            className="bg-violet-600 hover:bg-violet-700 rounded-xl"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { overall_adherence = 0, medications = [], ai_analysis, side_effect_summary, skip_patterns } = analysis || {};

  const getTrendIcon = () => {
    if (overall_adherence >= 80) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (overall_adherence >= 60) return <Minus className="w-5 h-5 text-yellow-600" />;
    return <TrendingDown className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Overall Adherence Score
            </span>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <Badge className={`text-sm ${
                overall_adherence >= 80 ? 'bg-green-100 text-green-700' : 
                overall_adherence >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                'bg-red-100 text-red-700'
              }`}>
                {overall_adherence}%
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Progress value={overall_adherence} className="h-3 mb-4" />
          <div className="grid grid-cols-3 gap-4 text-center">
            {medications.length > 0 && medications[0].current_streak !== undefined && (
              <>
                <div>
                  <p className="text-2xl font-bold text-[#0A0A0A]">
                    {Math.max(...medications.map(m => m.current_streak || 0))}
                  </p>
                  <p className="text-sm text-gray-600">Best Streak</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0A0A0A]">
                    {medications.reduce((sum, m) => sum + m.total_doses, 0)}
                  </p>
                  <p className="text-sm text-gray-600">Total Doses</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0A0A0A]">
                    {medications.reduce((sum, m) => sum + m.taken_doses, 0)}
                  </p>
                  <p className="text-sm text-gray-600">Taken</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per Medication */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Adherence by Medication</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {medications.map(med => (
            <div key={med.medication_id}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[#0A0A0A]">{med.medication_name}</span>
                <div className="flex items-center gap-2">
                  {med.current_streak > 0 && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <Flame className="w-3 h-3 mr-1" />
                      {med.current_streak} streak
                    </Badge>
                  )}
                  <span className="text-sm text-gray-600">
                    {med.taken_doses}/{med.total_doses}
                  </span>
                  <Badge className={`text-xs ${
                    med.adherence_rate >= 80 ? 'bg-green-100 text-green-700' : 
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {med.adherence_rate}%
                  </Badge>
                </div>
              </div>
              <Progress value={med.adherence_rate} className="h-2" />
              {med.skip_reasons?.length > 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  Common reasons: {med.skip_reasons.join(', ')}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Insights */}
      {ai_analysis?.insights && (
        <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-violet-900">
              <Sparkles className="w-5 h-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2">
              {ai_analysis.insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-violet-900">
                  <CheckCircle className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Personalized Strategies */}
      {ai_analysis?.strategies && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Personalized Strategies</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {ai_analysis.strategies.map((strategy, idx) => (
              <div key={idx} className={`p-4 rounded-xl ${
                strategy.priority === 'high' ? 'bg-red-50 border border-red-200' :
                strategy.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-start justify-between mb-1">
                  <p className="font-semibold text-[#0A0A0A] text-sm">{strategy.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {strategy.priority}
                  </Badge>
                </div>
                <p className="text-xs text-gray-700">{strategy.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Proactive Side Effect Management */}
      {ai_analysis?.side_effect_management && ai_analysis.side_effect_management.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Proactive Side Effect Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {ai_analysis.side_effect_management.map((item, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-orange-200">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-semibold text-[#0A0A0A] text-sm">{item.medication}</p>
                  <Badge className={`text-xs ${
                    item.severity_risk === 'high' ? 'bg-red-100 text-red-700' :
                    item.severity_risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {item.severity_risk} risk
                  </Badge>
                </div>
                <p className="text-xs text-gray-700">{item.suggestion}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Side Effects Summary */}
      {side_effect_summary && side_effect_summary.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Side Effects Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {side_effect_summary.map((item) => (
                <div key={item.severity} className="text-center">
                  <p className={`text-2xl font-bold ${
                    item.severity === 'mild' ? 'text-green-600' :
                    item.severity === 'moderate' ? 'text-yellow-600' :
                    item.severity === 'severe' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {item.count}
                  </p>
                  <p className="text-sm text-gray-600 capitalize">{item.severity}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barriers */}
      {ai_analysis?.barriers && ai_analysis.barriers.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Identified Barriers</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2">
              {ai_analysis.barriers.map((barrier, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 p-3 bg-[#F4F4F2] rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{barrier}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Timing Recommendations */}
      {ai_analysis?.timing_recommendations && ai_analysis.timing_recommendations.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Suggested Timing Adjustments</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {ai_analysis.timing_recommendations.map((rec, idx) => (
              <div key={idx} className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="font-semibold text-[#0A0A0A] text-sm mb-1">{rec.medication}</p>
                <p className="text-xs text-gray-700 mb-1">
                  Current: {rec.current_time} → Suggested: {rec.suggested_time}
                </p>
                <p className="text-xs text-gray-600">{rec.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={analyzeAdherence} 
        variant="outline" 
        className="w-full rounded-xl"
        disabled={analyzing}
      >
        {analyzing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Refreshing Analysis...
          </>
        ) : (
          'Refresh Analysis'
        )}
      </Button>
    </div>
  );
}