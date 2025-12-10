import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MedicationHistory({ profileId, medications }) {
  const [selectedMed, setSelectedMed] = useState(medications[0]?.id || null);
  const [dateRange, setDateRange] = useState('30');

  const { data: logs = [] } = useQuery({
    queryKey: ['medicationLogs', selectedMed, dateRange],
    queryFn: async () => {
      if (!selectedMed) return [];
      const daysAgo = parseInt(dateRange);
      const logs = await base44.entities.MedicationLog.filter(
        { medication_id: selectedMed },
        '-scheduled_time',
        1000
      );
      const cutoffDate = subDays(new Date(), daysAgo);
      return logs.filter(log => new Date(log.scheduled_time) >= cutoffDate);
    },
    enabled: !!selectedMed,
  });

  const { data: sideEffects = [] } = useQuery({
    queryKey: ['sideEffects', selectedMed],
    queryFn: () => selectedMed 
      ? base44.entities.SideEffect.filter({ medication_id: selectedMed }, '-onset_time', 50)
      : [],
    enabled: !!selectedMed,
  });

  const selectedMedication = medications.find(m => m.id === selectedMed);

  // Calculate adherence metrics
  const totalDoses = logs.length;
  const takenDoses = logs.filter(l => l.status === 'taken').length;
  const skippedDoses = logs.filter(l => l.status === 'skipped').length;
  const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  // Calculate current streak
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.scheduled_time) - new Date(a.scheduled_time)
  );
  let currentStreak = 0;
  for (const log of sortedLogs) {
    if (log.status === 'taken') {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate best streak
  let bestStreak = 0;
  let tempStreak = 0;
  for (const log of sortedLogs.reverse()) {
    if (log.status === 'taken') {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Prepare chart data (daily adherence)
  const dailyAdherence = {};
  logs.forEach(log => {
    const day = format(new Date(log.scheduled_time), 'MM/dd');
    if (!dailyAdherence[day]) {
      dailyAdherence[day] = { date: day, taken: 0, skipped: 0, total: 0 };
    }
    dailyAdherence[day].total++;
    if (log.status === 'taken') {
      dailyAdherence[day].taken++;
    } else if (log.status === 'skipped') {
      dailyAdherence[day].skipped++;
    }
  });

  const chartData = Object.values(dailyAdherence)
    .sort((a, b) => {
      const [aM, aD] = a.date.split('/').map(Number);
      const [bM, bD] = b.date.split('/').map(Number);
      return (aM * 100 + aD) - (bM * 100 + bD);
    })
    .map(day => ({
      ...day,
      adherence: Math.round((day.taken / day.total) * 100),
    }));

  // Time-of-day analysis
  const timeAnalysis = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  logs.forEach(log => {
    const hour = new Date(log.scheduled_time).getHours();
    if (hour < 12) timeAnalysis.morning++;
    else if (hour < 17) timeAnalysis.afternoon++;
    else if (hour < 21) timeAnalysis.evening++;
    else timeAnalysis.night++;
  });

  const timeData = Object.entries(timeAnalysis).map(([time, count]) => ({
    time: time.charAt(0).toUpperCase() + time.slice(1),
    doses: count,
  }));

  const getTrendIcon = () => {
    if (adherenceRate >= 90) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (adherenceRate >= 70) return <Minus className="w-5 h-5 text-yellow-600" />;
    return <TrendingDown className="w-5 h-5 text-red-600" />;
  };

  if (!selectedMed || !selectedMedication) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Select a medication to view history</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedMed} onValueChange={setSelectedMed}>
          <SelectTrigger className="w-64 rounded-xl">
            <SelectValue placeholder="Select Medication" />
          </SelectTrigger>
          <SelectContent>
            {medications.map(med => (
              <SelectItem key={med.id} value={med.id}>
                {med.medication_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="14">Last 14 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Adherence Rate</p>
              {getTrendIcon()}
            </div>
            <p className="text-3xl font-bold text-[#0A0A0A]">{adherenceRate}%</p>
            <p className="text-xs text-gray-500 mt-1">{takenDoses} / {totalDoses} doses</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Current Streak</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{currentStreak}</p>
            <p className="text-xs text-gray-500 mt-1">consecutive doses</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Best Streak</p>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{bestStreak}</p>
            <p className="text-xs text-gray-500 mt-1">all-time record</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Missed Doses</p>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">{skippedDoses}</p>
            <p className="text-xs text-gray-500 mt-1">in this period</p>
          </CardContent>
        </Card>
      </div>

      {/* Adherence Trend Chart */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Daily Adherence Trend</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#0A0A0A" />
              <YAxis tick={{ fontSize: 12 }} stroke="#0A0A0A" domain={[0, 100]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="adherence" 
                stroke="#9BB4FF" 
                strokeWidth={2} 
                dot={{ fill: '#9BB4FF', r: 4 }} 
                name="Adherence %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Time of Day Distribution */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Doses by Time of Day</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#0A0A0A" />
              <YAxis tick={{ fontSize: 12 }} stroke="#0A0A0A" />
              <Tooltip />
              <Bar dataKey="doses" fill="#F7C9A3" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Side Effects */}
      {sideEffects.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg font-semibold text-[#0A0A0A]">
              Recent Side Effects ({sideEffects.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {sideEffects.slice(0, 5).map((effect) => (
                <div key={effect.id} className="p-3 bg-[#F4F4F2] rounded-xl">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-[#0A0A0A] text-sm">{effect.symptom}</p>
                    <Badge className={`text-xs ${
                      effect.severity === 'severe' || effect.severity === 'life_threatening' 
                        ? 'bg-red-100 text-red-700' 
                        : effect.severity === 'moderate'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {effect.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">
                    {format(new Date(effect.onset_time), 'MMM d, yyyy h:mm a')}
                  </p>
                  {effect.notes && (
                    <p className="text-xs text-gray-700 mt-2">{effect.notes}</p>
                  )}
                  {!effect.reported_to_doctor && (
                    <Badge variant="outline" className="text-xs mt-2 bg-orange-50 text-orange-700 border-orange-200">
                      Not Reported
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Recent History</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            {sortedLogs.slice(0, 20).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-[#F4F4F2] rounded-xl">
                <div className="flex items-center gap-3">
                  {log.status === 'taken' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : log.status === 'skipped' ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-[#0A0A0A]">
                      {format(new Date(log.scheduled_time), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(log.scheduled_time), 'h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={`text-xs ${
                    log.status === 'taken' ? 'bg-green-50 text-green-700 border-green-200' :
                    log.status === 'skipped' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    {log.status}
                  </Badge>
                  {log.reason && (
                    <p className="text-xs text-gray-600 mt-1">{log.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}