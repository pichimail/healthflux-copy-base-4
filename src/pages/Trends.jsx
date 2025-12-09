import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';

export default function Trends() {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const [vitalType, setVitalType] = useState('blood_pressure');

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date'),
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals', selectedProfile, dateRange],
    queryFn: async () => {
      const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
      if (!profileId) return [];
      
      const days = parseInt(dateRange);
      const startDate = days === 365 ? subMonths(new Date(), 12) : subDays(new Date(), days);
      
      const allVitals = await base44.entities.VitalMeasurement.filter({ 
        profile_id: profileId 
      }, '-measured_at');
      
      return allVitals.filter(v => new Date(v.measured_at) >= startDate);
    },
    enabled: profiles.length > 0,
  });

  const { data: labResults = [] } = useQuery({
    queryKey: ['labResults', selectedProfile, dateRange],
    queryFn: async () => {
      const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
      if (!profileId) return [];
      
      const days = parseInt(dateRange);
      const startDate = days === 365 ? subMonths(new Date(), 12) : subDays(new Date(), days);
      
      const allLabs = await base44.entities.LabResult.filter({ 
        profile_id: profileId 
      }, '-test_date');
      
      return allLabs.filter(l => new Date(l.test_date) >= startDate);
    },
    enabled: profiles.length > 0,
  });

  const prepareChartData = () => {
    const filtered = vitals.filter(v => v.vital_type === vitalType);
    
    if (vitalType === 'blood_pressure') {
      return filtered.map(v => ({
        date: format(new Date(v.measured_at), 'MMM d'),
        systolic: v.systolic,
        diastolic: v.diastolic,
      })).reverse();
    }
    
    return filtered.map(v => ({
      date: format(new Date(v.measured_at), 'MMM d'),
      value: v.value,
      unit: v.unit,
    })).reverse();
  };

  const chartData = prepareChartData();

  const getLabTestsByCategory = () => {
    const categories = {};
    labResults.forEach(lab => {
      if (!categories[lab.test_category]) {
        categories[lab.test_category] = [];
      }
      categories[lab.test_category].push(lab);
    });
    return categories;
  };

  const labCategories = getLabTestsByCategory();

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
        <p className="font-medium text-slate-900 mb-1">{payload[0].payload.date}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value} {vitalType === 'blood_pressure' ? 'mmHg' : payload[0].payload.unit}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0A0A0A] mb-1">Health Trends</h1>
        <p className="text-sm text-gray-600">Visualize your health data over time</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={selectedProfile || 'self'} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full sm:w-64 rounded-xl border-gray-200">
            <SelectValue placeholder="Select Profile" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map(profile => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vital Signs Charts */}
      <div className="space-y-6 mb-6">
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold text-[#0A0A0A]">Vital Signs Trends</CardTitle>
              <Select value={vitalType} onValueChange={setVitalType}>
                <SelectTrigger className="w-48 rounded-xl border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blood_pressure">Blood Pressure</SelectItem>
                  <SelectItem value="heart_rate">Heart Rate</SelectItem>
                  <SelectItem value="weight">Weight</SelectItem>
                  <SelectItem value="blood_glucose">Blood Glucose</SelectItem>
                  <SelectItem value="temperature">Temperature</SelectItem>
                  <SelectItem value="oxygen_saturation">Oxygen Saturation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {chartData.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No data available for the selected period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                {vitalType === 'blood_pressure' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#0A0A0A" 
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis 
                      stroke="#0A0A0A" 
                      style={{ fontSize: '11px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="systolic" 
                      stroke="#F7C9A3" 
                      strokeWidth={2}
                      dot={{ fill: '#F7C9A3', r: 4 }}
                      name="Systolic"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="diastolic" 
                      stroke="#9BB4FF" 
                      strokeWidth={2}
                      dot={{ fill: '#9BB4FF', r: 4 }}
                      name="Diastolic"
                    />
                  </LineChart>
                ) : (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9BB4FF" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#9BB4FF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#0A0A0A" 
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis 
                      stroke="#0A0A0A" 
                      style={{ fontSize: '11px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#9BB4FF" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                      name="Value"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lab Results by Category */}
      {Object.keys(labCategories).length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-[#0A0A0A] mb-4">Lab Results</h2>
          <div className="grid lg:grid-cols-2 gap-4">
            {Object.entries(labCategories).map(([category, tests]) => {
              const uniqueTests = {};
              tests.forEach(test => {
                if (!uniqueTests[test.test_name]) {
                  uniqueTests[test.test_name] = [];
                }
                uniqueTests[test.test_name].push(test);
              });

              return (
                <Card key={category} className="border-0 shadow-sm rounded-2xl">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-base font-semibold text-[#0A0A0A] capitalize">
                      {category.replace(/_/g, ' ')} Tests
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {Object.entries(uniqueTests).map(([testName, testData]) => {
                        const chartData = testData.map(t => ({
                          date: format(new Date(t.test_date), 'MMM d'),
                          value: t.value,
                          flag: t.flag,
                        })).reverse();

                        return (
                          <div key={testName} className="space-y-2">
                            <h4 className="font-semibold text-[#0A0A0A] text-sm">{testName}</h4>
                            <ResponsiveContainer width="100%" height={150}>
                              <AreaChart data={chartData}>
                                <defs>
                                  <linearGradient id={`color${testName}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#EFF1ED" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#EFF1ED" stopOpacity={0.1}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
                                <XAxis 
                                  dataKey="date" 
                                  stroke="#0A0A0A" 
                                  style={{ fontSize: '10px' }}
                                />
                                <YAxis 
                                  stroke="#0A0A0A" 
                                  style={{ fontSize: '10px' }}
                                />
                                <Tooltip />
                                <Area 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke="#0B5A46" 
                                  strokeWidth={2}
                                  fillOpacity={1}
                                  fill={`url(#color${testName})`}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {vitals.length === 0 && labResults.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-sm">No health data to display yet</p>
          <p className="text-xs text-gray-500">Start logging vitals and lab results to see trends</p>
        </div>
      )}
    </div>
  );
}