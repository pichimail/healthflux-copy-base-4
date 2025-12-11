import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

export default function BenchmarkComparison({ profileId, dateRange }) {
  const [benchmarks, setBenchmarks] = useState(null);

  const { data: profile } = useQuery({
    queryKey: ['profile', profileId],
    queryFn: () => base44.entities.Profile.filter({ id: profileId }).then(p => p[0]),
    enabled: !!profileId
  });

  const compareMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('generateBenchmarkComparison', {
        profile_id: profileId,
        start_date: dateRange.start,
        end_date: dateRange.end
      });
      return data;
    },
    onSuccess: (data) => {
      setBenchmarks(data.comparison);
    }
  });

  const getPerformanceColor = (percentile) => {
    if (percentile >= 75) return 'text-green-600';
    if (percentile >= 50) return 'text-blue-600';
    if (percentile >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {!benchmarks ? (
        <Card className="border-0 card-shadow rounded-2xl" style={{ backgroundColor: '#DBEAFE' }}>
          <CardContent className="p-6 text-center">
            <BarChart3 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Benchmark Comparison</h3>
            <p className="text-sm text-gray-700 mb-4">
              Compare your health metrics against:
            </p>
            <ul className="text-xs text-gray-600 mb-6 space-y-1">
              <li>• Age and gender-matched cohorts</li>
              <li>• General health benchmarks</li>
              <li>• Condition-specific standards</li>
              <li>• Percentile rankings</li>
            </ul>
            <Button
              onClick={() => compareMutation.mutate()}
              disabled={compareMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl"
            >
              {compareMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Compare to Benchmarks
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Demographics Info */}
          <Card className="border-0 card-shadow rounded-2xl bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">Comparison Group</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-600">Age Group</p>
                  <p className="font-semibold">{benchmarks.cohort?.age_group || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Gender</p>
                  <p className="font-semibold capitalize">{profile?.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Sample Size</p>
                  <p className="font-semibold">{benchmarks.cohort?.sample_size || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metric Comparisons */}
          {benchmarks.metrics && Object.entries(benchmarks.metrics).map(([metric, data], idx) => (
            <Card key={idx} className="border-0 card-shadow rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold capitalize">
                    {metric.replace(/_/g, ' ')}
                  </CardTitle>
                  <div className={`flex items-center gap-1 text-xs ${getPerformanceColor(data.percentile)}`}>
                    {data.percentile >= 50 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="font-bold">{data.percentile}th</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-blue-50 p-2 rounded-xl">
                    <p className="text-gray-600">Your Value</p>
                    <p className="font-bold text-blue-700">{data.your_value}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl">
                    <p className="text-gray-600">Average</p>
                    <p className="font-bold">{data.cohort_average}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-xl">
                    <p className="text-gray-600">Optimal</p>
                    <p className="font-bold text-green-700">{data.optimal_range}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Performance</span>
                    <span className="font-semibold">{data.percentile}th percentile</span>
                  </div>
                  <Progress value={data.percentile} className="h-2" />
                </div>

                {data.comparison_note && (
                  <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl">
                    {data.comparison_note}
                  </p>
                )}

                {data.recommendation && (
                  <p className="text-xs text-blue-700 bg-blue-50 p-3 rounded-xl">
                    💡 {data.recommendation}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Overall Assessment */}
          {benchmarks.overall_assessment && (
            <Card className="border-0 card-shadow rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Overall Health Standing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-gray-700">{benchmarks.overall_assessment.summary}</p>
                {benchmarks.overall_assessment.strengths?.length > 0 && (
                  <div>
                    <p className="font-semibold text-xs mb-1">💪 Strengths:</p>
                    <ul className="text-xs text-gray-700 space-y-1">
                      {benchmarks.overall_assessment.strengths.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {benchmarks.overall_assessment.areas_for_improvement?.length > 0 && (
                  <div>
                    <p className="font-semibold text-xs mb-1">🎯 Areas for Improvement:</p>
                    <ul className="text-xs text-gray-700 space-y-1">
                      {benchmarks.overall_assessment.areas_for_improvement.map((a, i) => (
                        <li key={i}>• {a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Button
            onClick={() => compareMutation.mutate()}
            disabled={compareMutation.isPending}
            variant="outline"
            className="w-full rounded-2xl"
          >
            {compareMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
                Refresh Comparison
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}