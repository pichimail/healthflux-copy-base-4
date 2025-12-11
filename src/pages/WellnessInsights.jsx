import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Brain, TrendingUp, Heart, AlertCircle, Sparkles, Activity, 
  RefreshCw, ThumbsUp, ThumbsDown, ExternalLink, FileText, Stethoscope
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ProfileSwitcher from '../components/ProfileSwitcher';
import ShareRecordButton from '../components/ShareRecordButton';

export default function WellnessInsights() {
  const { t } = useTranslation();
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }),
    enabled: !!user
  });

  React.useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      const self = profiles.find(p => p.relationship === 'self');
      setSelectedProfileId(self?.id || profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals', selectedProfileId],
    queryFn: () => base44.entities.VitalMeasurement.filter({ profile_id: selectedProfileId }, '-measured_at', 100),
    enabled: !!selectedProfileId
  });

  const { data: labs = [] } = useQuery({
    queryKey: ['labs', selectedProfileId],
    queryFn: () => base44.entities.LabResult.filter({ profile_id: selectedProfileId }, '-test_date', 100),
    enabled: !!selectedProfileId
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications', selectedProfileId],
    queryFn: () => base44.entities.Medication.filter({ profile_id: selectedProfileId }),
    enabled: !!selectedProfileId
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ insightId, feedback }) => {
      return await base44.entities.HealthInsight.update(insightId, {
        feedback,
        feedback_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['insights']);
    }
  });

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const { data } = await base44.functions.invoke('predictiveHealthAnalysis', {
        profile_id: selectedProfileId
      });
      setAnalysis(data);
    } catch (error) {
      alert('Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      info: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[severity] || colors.info;
  };

  const openArticle = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 smooth-scroll">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
            ✨ {t('wellness.title')}
          </h1>
          <ShareRecordButton
            profileId={selectedProfileId}
            shareType="profile_summary"
            buttonText="Share"
            size="sm"
          />
        </div>
        <p className="text-xs sm:text-sm text-gray-600 mb-3">{t('wellness.subtitle')}</p>
        
        {profiles.length > 0 && (
          <ProfileSwitcher
            profiles={profiles}
            selectedProfile={selectedProfileId}
            onProfileChange={setSelectedProfileId}
          />
        )}
      </div>

      {/* Generate Button */}
      <Card className="mb-4 sm:mb-6 border-0 rounded-3xl shadow-lg bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#0A0A0A] mb-1">{t('wellness.advanced_analytics')}</h3>
              <p className="text-sm text-gray-600 mb-4">{t('wellness.analytics_desc')}</p>
              <Button
                onClick={generateInsights}
                disabled={generating}
                className="bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-2xl active-press shadow-lg h-11"
              >
                {generating ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />{t('wellness.refreshing')}</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />{t('wellness.generate_insights')}</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Health Score */}
          {analysis.health_score && (
            <Card className="border-2 rounded-3xl">
              <CardHeader className="border-b p-4">
                <CardTitle className="text-base">{t('wellness.overall_score')}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="text-5xl font-bold text-blue-600">{analysis.health_score}</div>
                  <div className="flex-1">
                    <Progress value={analysis.health_score} className="h-3 mb-2" />
                    <p className="text-xs text-gray-600">{t('wellness.score_desc')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Factors with Actions */}
          {analysis.risk_factors?.length > 0 && (
            <Card className="border-2 rounded-3xl">
              <CardHeader className="border-b p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  {t('wellness.risk_factors')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {analysis.risk_factors.map((risk, idx) => (
                  <div key={idx} className="p-4 bg-red-50 rounded-2xl border-2 border-red-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-900 text-sm mb-1">{risk.factor}</h4>
                        <p className="text-xs text-red-800">{risk.description}</p>
                      </div>
                      <Badge className="bg-red-200 text-red-900 rounded-xl">
                        {risk.severity}
                      </Badge>
                    </div>

                    {/* Actionable Recommendations */}
                    {risk.recommendations?.map((rec, ridx) => (
                      <div key={ridx} className="mt-3 p-3 bg-white rounded-xl">
                        <p className="text-xs font-semibold text-gray-900 mb-1">💡 {rec.action}</p>
                        <p className="text-xs text-gray-700">{rec.details}</p>
                        {rec.article_url && (
                          <Button
                            onClick={() => openArticle(rec.article_url)}
                            size="sm"
                            variant="outline"
                            className="mt-2 rounded-xl text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Read Article
                          </Button>
                        )}
                      </div>
                    ))}

                    {risk.consult_doctor && (
                      <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-amber-700" />
                          <p className="text-xs font-semibold text-amber-900">Consult your doctor about this</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Predictive Insights with Feedback */}
          {analysis.predictions?.length > 0 && (
            <Card className="border-2 rounded-3xl">
              <CardHeader className="border-b p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  {t('wellness.predictive_insights')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {analysis.predictions.map((pred, idx) => (
                  <div key={idx} className="p-4 bg-purple-50 rounded-2xl border-2 border-purple-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-purple-900 text-sm">{pred.prediction}</h4>
                      <Badge className="bg-purple-200 text-purple-900 rounded-xl">
                        {Math.round(pred.probability * 100)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-purple-800 mb-3">{pred.reasoning}</p>

                    {/* Dietary Changes */}
                    {pred.dietary_changes?.length > 0 && (
                      <div className="mb-3 p-3 bg-white rounded-xl">
                        <p className="text-xs font-semibold text-gray-900 mb-2">🥗 Dietary Changes</p>
                        <ul className="space-y-1">
                          {pred.dietary_changes.map((change, cidx) => (
                            <li key={cidx} className="text-xs text-gray-700">• {change}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Related Articles */}
                    {pred.articles?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-900">📚 Recommended Reading</p>
                        {pred.articles.map((article, aidx) => (
                          <Button
                            key={aidx}
                            onClick={() => openArticle(article.url)}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start rounded-xl text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-2" />
                            {article.title}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Feedback */}
                    {pred.insight_id && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => feedbackMutation.mutate({ insightId: pred.insight_id, feedback: 'helpful' })}
                          className="flex-1 rounded-xl"
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Helpful
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => feedbackMutation.mutate({ insightId: pred.insight_id, feedback: 'not_helpful' })}
                          className="flex-1 rounded-xl"
                        >
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          Not Helpful
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Preventive Action Plan */}
          {analysis.preventive_actions?.length > 0 && (
            <Card className="border-2 rounded-3xl">
              <CardHeader className="border-b p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-5 w-5 text-green-600" />
                  {t('wellness.preventive_plan')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {analysis.preventive_actions.map((action, idx) => (
                  <div key={idx} className="p-3 bg-green-50 rounded-2xl">
                    <div className="flex items-start gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        action.priority === 'high' ? 'bg-red-500' :
                        action.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                      }`}>
                        <span className="text-white text-xs font-bold">{idx + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-green-900 text-sm">{action.action}</p>
                        <p className="text-xs text-green-800 mt-1">{action.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

const feedbackMutation = { mutate: () => {} };