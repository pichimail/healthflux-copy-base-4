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
      <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
        <CardContent className="p-8 text-center">
          <Sparkles className="h-16 w-16 text-violet-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-violet-900 mb-2">
            AI Adherence Analysis
          </h3>
          <p className="text-sm text-violet-700 mb-6">
            Get personalized insights and strategies to improve your medication adherence
          </p>
          <Button 
            onClick={analyzeAdherence} 
            disabled={analyzing}
            className="bg-violet-600 hover:bg-violet-700"
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

  const { overall_adherence, adherence_by_medication, ai_insights, patterns, side_effects_summary, recommendations } = analysis;

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Overall Adherence Score
            </span>
            <div className="flex items-center gap-2">
              {patterns.recent_trend.trend === 'improving' && <TrendingUp className="h-5 w-5 text-green-600" />}
              {patterns.recent_trend.trend === 'declining' && <TrendingDown className="h-5 w-5 text-red-600" />}
              {patterns.recent_trend.trend === 'stable' && <Minus className="h-5 w-5 text-gray-600" />}
              <Badge variant={overall_adherence >= 80 ? 'default' : overall_adherence >= 60 ? 'secondary' : 'destructive'}>
                {overall_adherence}%
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={overall_adherence} className="h-3 mb-4" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">{patterns.longest_streak}</p>
              <p className="text-sm text-slate-600">Longest Streak</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{patterns.recent_trend.recent_adherence}%</p>
              <p className="text-sm text-slate-600">Last 7 Days</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {patterns.recent_trend.change > 0 ? '+' : ''}{patterns.recent_trend.change}%
              </p>
              <p className="text-sm text-slate-600">Change</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per Medication */}
      <Card>
        <CardHeader>
          <CardTitle>Adherence by Medication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {adherence_by_medication.map(med => (
            <div key={med.medication_id}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-900">{med.medication_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    {med.taken_doses}/{med.total_doses} doses
                  </span>
                  <Badge variant={med.adherence_rate >= 80 ? 'default' : 'secondary'}>
                    {med.adherence_rate}%
                  </Badge>
                </div>
              </div>
              <Progress value={med.adherence_rate} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-violet-900">
            <Sparkles className="h-5 w-5" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-slate-700">
            <div className="whitespace-pre-wrap">{ai_insights}</div>
          </div>
          <Button 
            onClick={analyzeAdherence} 
            variant="outline" 
            size="sm" 
            className="mt-4"
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh Analysis'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Urgent Recommendations */}
      {recommendations.filter(r => r.priority === 'urgent').length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-5 w-5" />
              Urgent Actions Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.filter(r => r.priority === 'urgent').map((rec, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg">
                <p className="text-sm text-red-900">{rec.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Side Effects Summary */}
      {side_effects_summary.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Side Effects Summary
              {side_effects_summary.unreported > 0 && (
                <Badge variant="destructive">{side_effects_summary.unreported} Unreported</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{side_effects_summary.by_severity.mild}</p>
                <p className="text-sm text-slate-600">Mild</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{side_effects_summary.by_severity.moderate}</p>
                <p className="text-sm text-slate-600">Moderate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{side_effects_summary.by_severity.severe}</p>
                <p className="text-sm text-slate-600">Severe</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{side_effects_summary.by_severity.life_threatening}</p>
                <p className="text-sm text-slate-600">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patterns */}
      {patterns.common_miss_time && (
        <Card>
          <CardHeader>
            <CardTitle>Identified Patterns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Common Miss Time</p>
                <p className="text-sm text-amber-700">
                  You tend to miss doses around {patterns.common_miss_time.hour}:00 
                  ({patterns.common_miss_time.count} times). Consider adjusting your schedule or adding extra reminders.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}