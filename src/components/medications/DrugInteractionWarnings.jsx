import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DrugInteractionWarnings({ profileId }) {
  const { data: interactions = [] } = useQuery({
    queryKey: ['drugInteractions', profileId],
    queryFn: () => base44.entities.DrugInteraction.filter({ 
      profile_id: profileId,
      is_acknowledged: false
    }, '-created_date'),
    enabled: !!profileId,
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['medicationInsights', profileId],
    queryFn: () => base44.entities.HealthInsight.filter({
      profile_id: profileId,
      insight_type: 'alert',
      is_read: false
    }, '-created_date'),
    enabled: !!profileId,
  });

  const drugAlerts = insights.filter(i => 
    i.title.toLowerCase().includes('interaction') || 
    i.title.toLowerCase().includes('allergy')
  );

  if (interactions.length === 0 && drugAlerts.length === 0) {
    return null;
  }

  const getSeverityConfig = (severity) => {
    if (severity === 'major' || severity === 'critical' || severity === 'high') {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: AlertTriangle,
        iconColor: 'text-red-600',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-700'
      };
    }
    if (severity === 'moderate' || severity === 'medium') {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: AlertCircle,
        iconColor: 'text-yellow-600',
        badgeBg: 'bg-yellow-100',
        badgeText: 'text-yellow-700'
      };
    }
    return {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: Info,
      iconColor: 'text-blue-600',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700'
    };
  };

  return (
    <div className="mb-6 space-y-4">
      {drugAlerts.map((alert) => {
        const config = getSeverityConfig(alert.severity);
        const Icon = config.icon;
        
        return (
          <Card key={alert.id} className={`border-0 shadow-sm rounded-2xl ${config.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[#0A0A0A] text-sm">{alert.title}</h3>
                    <Badge className={`${config.badgeBg} ${config.badgeText} border-none text-xs rounded-lg`}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-700">{alert.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {interactions.map((interaction) => {
        const config = getSeverityConfig(interaction.interaction_type);
        const Icon = config.icon;
        
        return (
          <Card key={interaction.id} className={`border-0 shadow-sm rounded-2xl ${config.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[#0A0A0A] text-sm">Drug Interaction Detected</h3>
                    <Badge className={`${config.badgeBg} ${config.badgeText} border-none text-xs rounded-lg capitalize`}>
                      {interaction.interaction_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-700 mb-2">{interaction.description}</p>
                  {interaction.recommendation && (
                    <p className="text-xs text-gray-600 bg-white/50 p-2 rounded-lg">
                      💡 {interaction.recommendation}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}