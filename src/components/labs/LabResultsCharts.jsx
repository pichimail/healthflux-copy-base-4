import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { format, subDays, subMonths, subYears, isAfter } from 'date-fns';

export default function LabResultsCharts({ labResults, profiles }) {
  const [period, setPeriod] = useState('year');
  const [selectedProfile, setSelectedProfile] = useState('all');
  const [selectedTests, setSelectedTests] = useState([]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'month': return subMonths(now, 1);
      case '3months': return subMonths(now, 3);
      case '6months': return subMonths(now, 6);
      case 'year': return subYears(now, 1);
      default: return subYears(now, 1);
    }
  };

  const filterData = () => {
    const startDate = getDateRange();
    return labResults
      .filter(l => selectedProfile === 'all' || l.profile_id === selectedProfile)
      .filter(l => isAfter(new Date(l.test_date), startDate))
      .filter(l => selectedTests.length === 0 || selectedTests.includes(l.test_name))
      .sort((a, b) => new Date(a.test_date) - new Date(b.test_date));
  };

  const getUniqueTests = () => {
    const tests = [...new Set(labResults.map(l => l.test_name))];
    return tests.slice(0, 10); // Limit to 10 most common tests
  };

  const toggleTest = (testName) => {
    setSelectedTests(prev => 
      prev.includes(testName) 
        ? prev.filter(t => t !== testName)
        : [...prev, testName]
    );
  };

  const calculateTrend = (testName) => {
    const testData = filterData().filter(l => l.test_name === testName);
    if (testData.length < 2) return { direction: 'stable', percentage: 0 };
    
    const firstValue = testData[0].value;
    const lastValue = testData[testData.length - 1].value;
    const change = ((lastValue - firstValue) / firstValue) * 100;
    
    return {
      direction: change > 10 ? 'up' : change < -10 ? 'down' : 'stable',
      percentage: Math.abs(change).toFixed(1)
    };
  };

  const getTestColor = (index) => {
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];
    return colors[index % colors.length];
  };

  const filteredData = filterData();
  const uniqueTests = getUniqueTests();

  // Group data by date for multiple tests
  const chartData = filteredData.reduce((acc, result) => {
    const dateKey = format(new Date(result.test_date), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = { 
        date: format(new Date(result.test_date), period === 'year' ? 'MMM yyyy' : 'MMM d'),
        fullDate: dateKey
      };
    }
    acc[dateKey][result.test_name] = result.value;
    return acc;
  }, {});

  const chartArray = Object.values(chartData).sort((a, b) => 
    new Date(a.fullDate) - new Date(b.fullDate)
  );

  const getOutOfRangeCount = () => {
    return filteredData.filter(l => l.flag !== 'normal').length;
  };

  if (filteredData.length === 0 && selectedTests.length === 0) {
    return (
      <Card className="border-0 card-shadow rounded-3xl">
        <CardContent className="p-6 text-center text-gray-500">
          No lab results available for this period
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-0 card-shadow rounded-3xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="text-base sm:text-lg">Lab Results Trends</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              {profiles && profiles.length > 1 && (
                <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                  <SelectTrigger className="w-full sm:w-32 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Profiles</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-full sm:w-32 h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">1 Month</SelectItem>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="year">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="mb-4">
            <Label className="text-xs text-gray-600 mb-2 block">Select Tests to Compare (max 5)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {uniqueTests.slice(0, 8).map((test, i) => (
                <div key={test} className="flex items-center space-x-2">
                  <Checkbox
                    id={test}
                    checked={selectedTests.includes(test)}
                    onCheckedChange={() => toggleTest(test)}
                    disabled={selectedTests.length >= 5 && !selectedTests.includes(test)}
                  />
                  <Label htmlFor={test} className="text-xs cursor-pointer flex items-center gap-1">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: getTestColor(i) }}
                    />
                    {test}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {selectedTests.length > 0 && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl">
                  <p className="text-xs text-gray-600 mb-1">Total Tests</p>
                  <p className="font-bold text-lg">{filteredData.length}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl">
                  <p className="text-xs text-gray-600 mb-1">Out of Range</p>
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`w-4 h-4 ${getOutOfRangeCount() > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                    <span className="font-bold text-lg">{getOutOfRangeCount()}</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
                  <p className="text-xs text-gray-600 mb-1">Tracking</p>
                  <p className="font-bold text-lg">{selectedTests.length} tests</p>
                </div>
              </div>

              {/* Chart */}
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartArray}>
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
                  
                  {selectedTests.map((test, i) => (
                    <Line 
                      key={test}
                      type="monotone" 
                      dataKey={test} 
                      stroke={getTestColor(uniqueTests.indexOf(test))}
                      strokeWidth={2}
                      dot={{ fill: getTestColor(uniqueTests.indexOf(test)), r: 4 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* Trend Analysis */}
              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                {selectedTests.map(test => {
                  const trend = calculateTrend(test);
                  const latestResult = filteredData.filter(l => l.test_name === test).slice(-1)[0];
                  
                  return (
                    <div key={test} className="p-3 bg-gray-50 rounded-2xl">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-700 mb-1">{test}</p>
                          {latestResult && (
                            <p className="text-lg font-bold text-[#0A0A0A]">
                              {latestResult.value} {latestResult.unit}
                            </p>
                          )}
                          {latestResult?.reference_low && latestResult?.reference_high && (
                            <p className="text-xs text-gray-500">
                              Range: {latestResult.reference_low}-{latestResult.reference_high}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {trend.direction === 'up' && <TrendingUp className="w-5 h-5 text-red-600 mb-1" />}
                          {trend.direction === 'down' && <TrendingDown className="w-5 h-5 text-green-600 mb-1" />}
                          {trend.direction === 'stable' && <span className="text-blue-600 text-lg">→</span>}
                          <p className="text-xs font-semibold">{trend.percentage}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {selectedTests.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-8">
              Select tests above to view trends and comparisons
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}