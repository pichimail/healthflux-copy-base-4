import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { format, subDays, subMonths, subYears, isAfter, isBefore } from 'date-fns';

export default function VitalsTrendChart({ vitals, vitalType, profiles }) {
  const [period, setPeriod] = useState('month');
  const [selectedProfile, setSelectedProfile] = useState('all');

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week': return subDays(now, 7);
      case 'month': return subMonths(now, 1);
      case 'year': return subYears(now, 1);
      default: return subMonths(now, 1);
    }
  };

  const filterData = () => {
    const startDate = getDateRange();
    return vitals
      .filter(v => v.vital_type === vitalType)
      .filter(v => selectedProfile === 'all' || v.profile_id === selectedProfile)
      .filter(v => isAfter(new Date(v.measured_at), startDate))
      .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
  };

  const detectAnomalies = (data) => {
    if (data.length < 3) return [];
    
    const values = data.map(d => d.value || d.systolic);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
    
    return data.filter((d, i) => {
      const val = d.value || d.systolic;
      return Math.abs(val - mean) > 2 * stdDev;
    });
  };

  const calculateTrend = (data) => {
    if (data.length < 2) return { direction: 'stable', percentage: 0 };
    
    const firstValue = data[0].value || data[0].systolic;
    const lastValue = data[data.length - 1].value || data[data.length - 1].systolic;
    const change = ((lastValue - firstValue) / firstValue) * 100;
    
    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      percentage: Math.abs(change).toFixed(1)
    };
  };

  const getReferenceRanges = () => {
    switch (vitalType) {
      case 'blood_pressure':
        return { low: 90, high: 140, label: 'Systolic BP' };
      case 'heart_rate':
        return { low: 60, high: 100, label: 'Heart Rate' };
      case 'blood_glucose':
        return { low: 70, high: 140, label: 'Blood Glucose' };
      case 'oxygen_saturation':
        return { low: 95, high: 100, label: 'SpO2' };
      case 'temperature':
        return { low: 36.1, high: 37.2, label: 'Temperature' };
      default:
        return null;
    }
  };

  const filteredData = filterData();
  const chartData = filteredData.map(v => ({
    date: format(new Date(v.measured_at), period === 'year' ? 'MMM yyyy' : 'MMM d'),
    value: v.value,
    systolic: v.systolic,
    diastolic: v.diastolic,
    fullDate: new Date(v.measured_at)
  }));

  const anomalies = detectAnomalies(filteredData);
  const trend = calculateTrend(filteredData);
  const referenceRange = getReferenceRanges();

  if (filteredData.length === 0) {
    return (
      <Card className="border-0 card-shadow rounded-3xl">
        <CardContent className="p-6 text-center text-gray-500">
          No data available for this period
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 card-shadow rounded-3xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="text-base sm:text-lg capitalize">
            {vitalType.replace(/_/g, ' ')} Trends
          </CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            {profiles && profiles.length > 1 && (
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger className="w-full sm:w-32 h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-28 h-9 rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {/* Trend Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl">
            <p className="text-xs text-gray-600 mb-1">Trend</p>
            <div className="flex items-center gap-2">
              {trend.direction === 'up' && <TrendingUp className="w-5 h-5 text-red-600" />}
              {trend.direction === 'down' && <TrendingDown className="w-5 h-5 text-green-600" />}
              {trend.direction === 'stable' && <span className="w-5 h-5 text-blue-600">→</span>}
              <span className="font-bold text-lg">{trend.percentage}%</span>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
            <p className="text-xs text-gray-600 mb-1">Anomalies</p>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${anomalies.length > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
              <span className="font-bold text-lg">{anomalies.length}</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11 }}
              stroke="#888"
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              stroke="#888"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            
            {referenceRange && (
              <>
                <ReferenceLine 
                  y={referenceRange.high} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3"
                  label={{ value: 'High', fontSize: 10, fill: '#ef4444' }}
                />
                <ReferenceLine 
                  y={referenceRange.low} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3"
                  label={{ value: 'Low', fontSize: 10, fill: '#ef4444' }}
                />
              </>
            )}

            {vitalType === 'blood_pressure' ? (
              <>
                <Line 
                  type="monotone" 
                  dataKey="systolic" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Systolic"
                />
                <Line 
                  type="monotone" 
                  dataKey="diastolic" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  name="Diastolic"
                />
              </>
            ) : (
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={(props) => {
                  const isAnomaly = anomalies.some(a => 
                    new Date(a.measured_at).getTime() === chartData[props.index]?.fullDate?.getTime()
                  );
                  return (
                    <circle 
                      cx={props.cx} 
                      cy={props.cy} 
                      r={isAnomaly ? 6 : 4} 
                      fill={isAnomaly ? '#f59e0b' : '#8b5cf6'}
                      stroke={isAnomaly ? '#ea580c' : '#8b5cf6'}
                      strokeWidth={isAnomaly ? 2 : 0}
                    />
                  );
                }}
                name={vitalType.replace(/_/g, ' ')}
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Anomalies List */}
        {anomalies.length > 0 && (
          <div className="mt-4 p-3 bg-orange-50 rounded-2xl">
            <h4 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Detected Anomalies
            </h4>
            <div className="space-y-1 text-xs text-orange-700">
              {anomalies.map((a, i) => (
                <p key={i}>
                  {format(new Date(a.measured_at), 'MMM d, yyyy')} - 
                  {vitalType === 'blood_pressure' 
                    ? ` ${a.systolic}/${a.diastolic} mmHg`
                    : ` ${a.value} ${a.unit}`
                  } (Unusual reading)
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}