import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, Send, Phone, AlertTriangle, CheckCircle, Info, 
  Clock, Stethoscope, FileText, Activity, Loader2
} from 'lucide-react';
import ProfileSwitcher from '../components/ProfileSwitcher';

export default function SymptomChecker() {
  const { t } = useTranslation();
  const [symptoms, setSymptoms] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const recognitionRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  React.useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      const selfProfile = profiles.find(p => p.relationship === 'self');
      setSelectedProfileId(selfProfile?.id || profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setSymptoms(prev => prev + finalTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const analyzeSymptoms = async () => {
    if (!symptoms.trim() || !selectedProfileId) return;

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const { data } = await base44.functions.invoke('symptomChecker', {
        symptoms: symptoms.trim(),
        profile_id: selectedProfileId
      });

      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze symptoms. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const callEmergency = () => {
    window.location.href = 'tel:911';
  };

  const getUrgencyConfig = (level) => {
    switch (level) {
      case 'emergency':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          icon: AlertTriangle
        };
      case 'urgent':
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50',
          icon: AlertTriangle
        };
      case 'soon':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          icon: Clock
        };
      case 'routine':
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          icon: Stethoscope
        };
      default:
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          icon: CheckCircle
        };
    }
  };

  const currentProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
          🩺 {t('symptoms.title')}
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{t('symptoms.subtitle')}</p>
        
        {profiles.length > 0 && (
          <ProfileSwitcher
            profiles={profiles}
            selectedProfile={selectedProfileId}
            onProfileChange={setSelectedProfileId}
          />
        )}
      </div>

      {/* Emergency Button */}
      <Alert className="mb-4 sm:mb-6 bg-red-50 border-red-200">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-xs sm:text-sm text-red-700 flex items-center justify-between">
          <span>{t('symptoms.emergency')}</span>
          <Button
            onClick={callEmergency}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white rounded-2xl ml-2 h-9 active-press shadow-lg"
          >
            <Phone className="w-4 h-4 mr-1" />
            {t('symptoms.call_911')}
          </Button>
        </AlertDescription>
      </Alert>

      {/* Input Section */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-4 sm:mb-6">
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base">{t('symptoms.describe')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3">
            <Textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder={t('symptoms.placeholder')}
              rows={5}
              className="rounded-2xl text-sm"
            />
            
            <div className="flex gap-2">
              <Button
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                variant="outline"
                className={`flex-1 rounded-2xl active-press h-11 sm:h-12 ${isListening ? 'bg-red-50 text-red-600 border-red-200' : ''}`}
              >
                <Mic className="w-4 h-4 mr-2" />
                {isListening ? t('symptoms.stop_recording') : t('symptoms.voice_input')}
              </Button>
              
              <Button
                onClick={analyzeSymptoms}
                disabled={analyzing || !symptoms.trim() || !selectedProfileId}
                className="flex-1 bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-2xl active-press shadow-lg h-11 sm:h-12"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('symptoms.analyzing')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t('symptoms.analyze')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-3 sm:space-y-4">
          {/* Urgency Level */}
          {(() => {
            const config = getUrgencyConfig(analysis.urgency_level);
            const Icon = config.icon;
            return (
              <Card className={`border-0 shadow-lg rounded-2xl sm:rounded-3xl ${config.bgColor}`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${config.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#0A0A0A] text-sm sm:text-base mb-1 capitalize">
                        {analysis.urgency_level} {t('symptoms.urgency_level')}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-700">{analysis.urgency_message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Potential Causes */}
          <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
            <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
                {t('symptoms.potential_causes')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-2 sm:space-y-3">
                {analysis.potential_causes?.map((cause, idx) => (
                  <div key={idx} className="p-3 sm:p-4 bg-[#F4F4F2] rounded-2xl">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-[#0A0A0A] text-sm">{cause.condition}</h4>
                      <Badge className={`text-xs rounded-xl ${
                        cause.likelihood === 'high' ? 'bg-red-100 text-red-700' :
                        cause.likelihood === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {cause.likelihood} {t('symptoms.likelihood')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">{cause.reasoning}</p>
                    {cause.relevant_to_history && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                        <Activity className="w-3 h-3 mr-1" />
                        {t('symptoms.related_history')}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Red Flags */}
          {analysis.red_flags && analysis.red_flags.length > 0 && (
            <Card className="border-0 shadow-lg rounded-2xl sm:rounded-3xl bg-red-50">
              <CardHeader className="border-b border-red-100 p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                  {t('symptoms.warning_signs')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <ul className="space-y-2">
                  {analysis.red_flags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-red-700">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
            <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                {t('symptoms.recommendations')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {analysis.recommendations?.immediate_actions?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-[#0A0A0A] text-sm mb-2">{t('symptoms.immediate_actions')}</h4>
                  <ul className="space-y-1">
                    {analysis.recommendations.immediate_actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.recommendations?.monitoring_advice?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-[#0A0A0A] text-sm mb-2">{t('symptoms.monitoring_advice')}</h4>
                  <ul className="space-y-1">
                    {analysis.recommendations.monitoring_advice.map((advice, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span>{advice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.recommendations?.when_to_seek_care && (
                <div className="p-3 bg-yellow-50 rounded-2xl">
                  <h4 className="font-semibold text-yellow-900 text-sm mb-1">{t('symptoms.when_seek_care')}</h4>
                  <p className="text-xs text-yellow-800">{analysis.recommendations.when_to_seek_care}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Questions for Doctor */}
          {analysis.questions_for_doctor?.length > 0 && (
            <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
              <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">{t('symptoms.questions_doctor')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <ul className="space-y-2">
                  {analysis.questions_for_doctor.map((question, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 p-2 bg-[#F4F4F2] rounded-xl">
                      <span className="font-semibold text-[#0A0A0A] flex-shrink-0">{idx + 1}.</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Relevant Health Context */}
          {analysis.relevant_health_context?.length > 0 && (
            <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl bg-blue-50">
              <CardHeader className="border-b border-blue-100 p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base text-blue-900">{t('symptoms.relevant_history')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <ul className="space-y-1">
                  {analysis.relevant_health_context.map((context, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-blue-800">
                      <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{context}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <Alert className="bg-gray-50 border-gray-200">
            <Info className="h-4 w-4 text-gray-600" />
            <AlertDescription className="text-xs text-gray-600">
              {t('symptoms.disclaimer')}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}