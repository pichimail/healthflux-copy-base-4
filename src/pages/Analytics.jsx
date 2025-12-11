import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, Download, Brain, Target, Activity, Heart,
  Pill, Apple, AlertCircle, Loader2, Sparkles, BarChart3
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import ProfileSwitcher from '../components/ProfileSwitcher';
import HealthMetricsTrends from '../components/analytics/HealthMetricsTrends';
import CorrelationAnalysis from '../components/analytics/CorrelationAnalysis';
import PredictiveInsights from '../components/analytics/PredictiveInsights';
import BenchmarkComparison from '../components/analytics/BenchmarkComparison';
import CustomReports from '../components/analytics/CustomReports';

export default function Analytics() {
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [dateRange, setDateRange] = useState('3months');
  const [activeTab, setActiveTab] = useState('trends');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user
  });

  React.useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      const selfProfile = profiles.find((p) => p.relationship === 'self');
      setSelectedProfileId(selfProfile?.id || profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const getDateRangeValues = () => {
    const end = new Date();
    let start;
    switch (dateRange) {
      case '1month': start = subMonths(end, 1); break;
      case '3months': start = subMonths(end, 3); break;
      case '6months': start = subMonths(end, 6); break;
      case '1year': start = subMonths(end, 12); break;
      default: start = subMonths(end, 3);
    }
    return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
  };

  const analyticsMutation = useMutation({
    mutationFn: async (type) => {
      const { start, end } = getDateRangeValues();
      const { data } = await base44.functions.invoke('generateAnalytics', {
        profile_id: selectedProfileId,
        start_date: start,
        end_date: end,
        analysis_type: type
      });
      return data;
    }
  });

  if (!selectedProfileId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
              📊 Advanced Analytics
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">Deep health insights & predictions</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-2xl active-press"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {profiles.length > 0 && (
          <ProfileSwitcher
            profiles={profiles}
            selectedProfile={selectedProfileId}
            onProfileChange={setSelectedProfileId}
          />
        )}
      </div>

      {/* Date Range Selector */}
      <Card className="border-0 card-shadow rounded-2xl mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold">Time Range:</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40 h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 rounded-2xl h-11 mb-4">
          <TabsTrigger value="trends" className="text-xs sm:text-sm rounded-xl">
            <TrendingUp className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="correlations" className="text-xs sm:text-sm rounded-xl">
            <Brain className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Patterns</span>
          </TabsTrigger>
          <TabsTrigger value="predictive" className="text-xs sm:text-sm rounded-xl">
            <Sparkles className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Predict</span>
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="text-xs sm:text-sm rounded-xl">
            <BarChart3 className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm rounded-xl">
            <Download className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-0">
          <HealthMetricsTrends 
            profileId={selectedProfileId} 
            dateRange={getDateRangeValues()}
          />
        </TabsContent>

        <TabsContent value="correlations" className="mt-0">
          <CorrelationAnalysis 
            profileId={selectedProfileId}
            dateRange={getDateRangeValues()}
          />
        </TabsContent>

        <TabsContent value="predictive" className="mt-0">
          <PredictiveInsights 
            profileId={selectedProfileId}
            dateRange={getDateRangeValues()}
          />
        </TabsContent>

        <TabsContent value="benchmark" className="mt-0">
          <BenchmarkComparison 
            profileId={selectedProfileId}
            dateRange={getDateRangeValues()}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-0">
          <CustomReports 
            profileId={selectedProfileId}
            dateRange={getDateRangeValues()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}