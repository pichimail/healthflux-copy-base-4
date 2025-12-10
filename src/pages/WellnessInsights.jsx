import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, TrendingUp, Activity, Heart, Utensils, Moon, 
  Dumbbell, AlertTriangle, CheckCircle, Sparkles, Loader2,
  Target, Calendar, ArrowRight
} from 'lucide-react';
import ProfileSwitcher from '../components/ProfileSwitcher';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function WellnessInsights() {
  const [user, setUser] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    
    const profiles = await base44.entities.Profile.filter({ 
      relationship: 'self',
      created_by: userData.email 
    });
    
    if (profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  };

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date'),
    enabled: !!user,
  });

  const generateAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data } = await base44.functions.invoke('predictiveHealthAnalysis', {
        profile_id: selectedProfileId
      });
      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Analysis error:', error);
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  if (!user || !selectedProfileId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A0A0A] mb-1">AI Wellness Insights</h1>
          <p className="text-sm text-gray-600">Predictive health analytics and personalized recommendations</p>
        </div>
        <div className="flex gap-3">
          <ProfileSwitcher
            profiles={profiles}
            selectedProfile={selectedProfileId}
            onProfileChange={setSelectedProfileId}
          />
        </div>
      </div>

      {!analysis ? (
        <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#0A0A0A] mb-2">
              Advanced Health Analytics
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Our AI analyzes your comprehensive health data to provide predictive insights, 
              identify potential risks, and deliver personalized wellness recommendations.
            </p>
            <Button 
              onClick={generateAnalysis} 
              disabled={analyzing}
              className="bg-purple-600 hover:bg-purple-700 rounded-xl text-lg px-8 py-6"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing Your Health Data...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Health Insights
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overall Health Score */}
          <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-green-50 to-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#0A0A0A] mb-1">Overall Health Score</h3>
                  <p className="text-sm text-gray-600">Based on comprehensive data analysis</p>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-bold text-[#0A0A0A]">{analysis.risk_score || 75}</p>
                  <p className="text-sm text-gray-600">out of 100</p>
                </div>
              </div>
              <Progress value={analysis.risk_score || 75} className="h-3" />
            </CardContent>
          </Card>

          {/* Risk Factors */}
          {analysis.risk_factors && analysis.risk_factors.length > 0 && (
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Identified Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {analysis.risk_factors.map((risk, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border-2 ${
                      risk.severity === 'critical' ? 'bg-red-50 border-red-200' :
                      risk.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                      risk.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-[#0A0A0A]">{risk.factor}</h4>
                        <div className="flex gap-2">
                          <Badge className={`text-xs ${
                            risk.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            risk.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            risk.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {risk.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {risk.likelihood} likelihood
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{risk.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Predictive Insights */}
          {analysis.predictions && analysis.predictions.length > 0 && (
            <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg font-semibold text-violet-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Predictive Health Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {analysis.predictions.map((prediction, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-xl border border-violet-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-violet-900">{prediction.condition}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-violet-600" />
                            <span className="text-xs text-violet-700">{prediction.timeframe}</span>
                            <Badge className="text-xs bg-violet-100 text-violet-700">
                              {prediction.probability} probability
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{prediction.rationale}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lifestyle Recommendations */}
          {analysis.lifestyle_recommendations && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Diet Recommendations */}
              {analysis.lifestyle_recommendations.diet && analysis.lifestyle_recommendations.diet.length > 0 && (
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
                      <Utensils className="w-5 h-5 text-green-600" />
                      Nutrition
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-2">
                      {analysis.lifestyle_recommendations.diet.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Exercise Recommendations */}
              {analysis.lifestyle_recommendations.exercise && analysis.lifestyle_recommendations.exercise.length > 0 && (
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
                      <Dumbbell className="w-5 h-5 text-blue-600" />
                      Exercise
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-2">
                      {analysis.lifestyle_recommendations.exercise.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Sleep Recommendations */}
              {analysis.lifestyle_recommendations.sleep && analysis.lifestyle_recommendations.sleep.length > 0 && (
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
                      <Moon className="w-5 h-5 text-indigo-600" />
                      Sleep
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-2">
                      {analysis.lifestyle_recommendations.sleep.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Stress Management */}
              {analysis.lifestyle_recommendations.stress && analysis.lifestyle_recommendations.stress.length > 0 && (
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
                      <Heart className="w-5 h-5 text-pink-600" />
                      Stress Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-2">
                      {analysis.lifestyle_recommendations.stress.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-pink-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Preventive Actions */}
          {analysis.preventive_actions && analysis.preventive_actions.length > 0 && (
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Preventive Action Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {analysis.preventive_actions.map((action, idx) => (
                    <div key={idx} className={`p-4 rounded-xl ${
                      action.priority === 'high' ? 'bg-red-50 border-2 border-red-200' :
                      action.priority === 'medium' ? 'bg-yellow-50 border-2 border-yellow-200' :
                      'bg-green-50 border-2 border-green-200'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-[#0A0A0A]">{action.action}</h4>
                        <Badge className={`text-xs ${
                          action.priority === 'high' ? 'bg-red-100 text-red-700' :
                          action.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {action.priority} priority
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{action.impact}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Early Warning Signs */}
          {analysis.early_warnings && analysis.early_warnings.length > 0 && (
            <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-orange-50 to-red-50">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Early Warning Signs to Monitor
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {analysis.early_warnings.map((warning, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-orange-200">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-orange-900 text-sm">{warning.symptom}</p>
                        <Badge className={`text-xs ${
                          warning.urgency === 'urgent' ? 'bg-red-100 text-red-700' :
                          warning.urgency === 'consult' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {warning.urgency}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-700">{warning.action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Optimization Opportunities */}
          {analysis.optimization_opportunities && analysis.optimization_opportunities.length > 0 && (
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg font-semibold text-[#0A0A0A] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-600" />
                  Health Optimization Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {analysis.optimization_opportunities.map((opp, idx) => (
                    <div key={idx} className="p-4 bg-[#F4F4F2] rounded-xl">
                      <h4 className="font-semibold text-[#0A0A0A] mb-1">{opp.area}</h4>
                      <p className="text-sm text-gray-600 mb-2">{opp.current_issue}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <ArrowRight className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-medium">{opp.recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button 
            onClick={generateAnalysis} 
            variant="outline" 
            className="w-full rounded-xl"
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refreshing Analysis...
              </>
            ) : (
              'Refresh Analysis'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}