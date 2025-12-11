import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

export default function HealthMetricsTrends({ profileId, dateRange }) {
  const [selectedMetrics, setSelectedMetrics] = useState(['bp', 'weight', 'glucose']);

  const { data: vitals = [], isLoading: vitalsLoading } = useQuery({
    queryKey: ['vitals', profileId, dateRange],
    queryFn: async () => {
      const all = await base44.entities.VitalMeasurement.filter({ profile_id: profileId }, '-measured_at', 500);
      return all.filter(v => {
        const date = new Date(v.measured_at);
        return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
      });
    },
    enabled: !!profileId
  });

  const { data: meals = [] } = useQuery({
    queryKey: ['meals', profileId, dateRange],
    queryFn: async () => {
      const all = await base44.entities.MealLog.filter({ profile_id: profileId }, '-meal_date', 500);
      return all.filter(m => m.meal_date >= dateRange.start && m.meal_date <= dateRange.end);
    },
    enabled: !!profileId
  });

  const { data: medLogs = [] } = useQuery({
    queryKey: ['medLogs', profileId, dateRange],
    queryFn: async () => {
      const all = await base44.entities.MedicationLog.filter({ profile_id: profileId }, '-scheduled_time', 500);
      return all.filter(m => {
        const date = new Date(m.scheduled_time);
        return date >= new Date(dateRange.start) && date <= new Date(dateRange.end);
      });
    },
    enabled: !!profileId
  });

  // Process blood pressure data
  const bpData = vitals
    .filter(v => v.vital_type === 'blood_pressure')
    .map(v => ({
      date: format(new Date(v.measured_at), 'MMM d'),
      systolic: v.systolic,
      diastolic: v.diastolic
    }))
    .reverse();

  // Process weight data
  const weightData = vitals
    .filter(v => v.vital_type === 'weight')
    .map(v => ({
      date: format(new Date(v.measured_at), 'MMM d'),
      weight: v.value
    }))
    .reverse();

  // Process glucose data
  const glucoseData = vitals
    .filter(v => v.vital_type === 'blood_glucose')
    .map(v => ({
      date: format(new Date(v.measured_at), 'MMM d'),
      glucose: v.value
    }))
    .reverse();

  // Process daily calories
  const caloriesByDate = {};
  meals.forEach(m => {
    if (!caloriesByDate[m.meal_date]) {
      caloriesByDate[m.meal_date] = 0;
    }
    caloriesByDate[m.meal_date] += m.calories || 0;
  });
  const calorieData = Object.entries(caloriesByDate).map(([date, calories]) => ({
    date: format(new Date(date), 'MMM d'),
    calories
  }));

  // Process medication adherence
  const adherenceByDate = {};
  medLogs.forEach(log => {
    const date = format(new Date(log.scheduled_time), 'yyyy-MM-dd');
    if (!adherenceByDate[date]) {
      adherenceByDate[date] = { taken: 0, total: 0 };
    }
    adherenceByDate[date].total++;
    if (log.status === 'taken') adherenceByDate[date].taken++;
  });
  const adherenceData = Object.entries(adherenceByDate).map(([date, data]) => ({
    date: format(new Date(date), 'MMM d'),
    adherence: Math.round((data.taken / data.total) * 100)
  }));

  const calculateTrend = (data, key) => {
    if (data.length < 2) return { direction: 'stable', change: 0 };
    const recent = data.slice(-7).map(d => d[key]).filter(v => v != null);
    const earlier = data.slice(0, -7).map(d => d[key]).filter(v => v != null);
    
    if (recent.length === 0 || earlier.length === 0) return { direction: 'stable', change: 0 };
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    const change = ((recentAvg - earlierAvg) / earlierAvg * 100).toFixed(1);
    
    return {
      direction: Math.abs(change) < 2 ? 'stable' : change > 0 ? 'up' : 'down',
      change: Math.abs(change)
    };
  };

  if (vitalsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Blood Pressure */}
      {bpData.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Blood Pressure Trends</CardTitle>
              {(() => {
                const trend = calculateTrend(bpData, 'systolic');
                return (
                  <div className="flex items-center gap-1 text-xs">
                    {trend.direction === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-red-600" />
                    ) : trend.direction === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-green-600" />
                    ) : null}
                    <span className={trend.direction === 'up' ? 'text-red-600' : trend.direction === 'down' ? 'text-green-600' : 'text-gray-600'}>
                      {trend.change}% {trend.direction}
                    </span>
                  </div>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={bpData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} name="Systolic" />
                <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} name="Diastolic" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Weight */}
      {weightData.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Weight Trends</CardTitle>
              {(() => {
                const trend = calculateTrend(weightData, 'weight');
                return (
                  <div className="flex items-center gap-1 text-xs">
                    {trend.direction === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                    ) : trend.direction === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-blue-600" />
                    ) : null}
                    <span className="text-gray-600">
                      {trend.change}% {trend.direction}
                    </span>
                  </div>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="weight" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Glucose */}
      {glucoseData.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Blood Glucose Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={glucoseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="glucose" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Nutrition */}
      {calorieData.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Daily Calorie Intake</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={calorieData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="calories" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Medication Adherence */}
      {adherenceData.length > 0 && (
        <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Medication Adherence</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={adherenceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="adherence" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}