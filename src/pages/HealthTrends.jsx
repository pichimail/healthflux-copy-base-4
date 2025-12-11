import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Calendar, Filter,
  Download, Minus
} from 'lucide-react';
import { format, subDays, subMonths, subYears, isWithinInterval, parseISO } from 'date-fns';
import ProfileSwitcher from '../components/ProfileSwitcher';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function HealthTrends() {
  const { t } = useTranslation();
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [dateRange, setDateRange] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [chartType, setChartType] = useState('line');

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

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals', selectedProfileId],
    queryFn: () => base44.entities.VitalMeasurement.filter({ profile_id: selectedProfileId }, '-measured_at'),
    enabled: !!selectedProfileId,
  });

  const { data: labResults = [] } = useQuery({
    queryKey: ['labResults', selectedProfileId],
    queryFn: () => base44.entities.LabResult.filter({ profile_id: selectedProfileId }, '-test_date'),
    enabled: !!selectedProfileId,
  });

  const getDateRangeFilter = () => {
    const now = new Date();
    let start, end = now;

    if (dateRange === 'custom' && customStartDate && customEndDate) {
      start = parseISO(customStartDate);
      end = parseISO(customEndDate);
    } else {
      switch (dateRange) {
        case '7d': start = subDays(now, 7); break;
        case '30d': start = subDays(now, 30); break;
        case '90d': start = subDays(now, 90); break;
        case '6m': start = subMonths(now, 6); break;
        case '1y': start = subYears(now, 1); break;
        default: start = subDays(now, 30);
      }
    }

    return { start, end };
  };

  const filterByDateRange = (items, dateField) => {
    const { start, end } = getDateRangeFilter();
    return items.filter(item => {
      const itemDate = parseISO(item[dateField]);
      return isWithinInterval(itemDate, { start, end });
    });
  };

  const filteredVitals = filterByDateRange(vitals, 'measured_at');
  const filteredLabs = filterByDateRange(labResults, 'test_date');

  // Group and prepare chart data
  const prepareVitalChartData = (vitalType) => {
    const data = filteredVitals
      .filter(v => v.vital_type === vitalType)
      .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))
      .map(v => ({
        date: format(new Date(v.measured_at), 'MMM d'),
        fullDate: format(new Date(v.measured_at), 'MMM d, yyyy'),
        value: v.value,
        systolic: v.systolic,
        diastolic: v.diastolic,
        unit: v.unit
      }));
    return data;
  };

  const prepareLabChartData = (testName) => {
    const data = filteredLabs
      .filter(l => l.test_name === testName)
      .sort((a, b) => new Date(a.test_date) - new Date(b.test_date))
      .map(l => ({
        date: format(new Date(l.test_date), 'MMM d'),
        fullDate: format(new Date(l.test_date), 'MMM d, yyyy'),
        value: l.value,
        unit: l.unit,
        flag: l.flag,
        reference_low: l.reference_low,
        reference_high: l.reference_high
      }));
    return data;
  };

  // Get unique vital types and lab tests
  const vitalTypes = [...new Set(filteredVitals.map(v => v.vital_type))];
  const labTests = [...new Set(filteredLabs.map(l => l.test_name))];

  // Calculate statistics
  const calculateStats = (data, field) => {
    if (data.length === 0) return null;
    const values = data.map(d => d[field]).filter(v => v != null);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const trend = values.length > 1 ? values[values.length - 1] - values[0] : 0;
    return { avg, min, max, trend, count: values.length };
  };

  const downloadCSV = () => {
    let csv = 'Type,Date,Metric,Value,Unit,Flag\n';
    
    filteredVitals.forEach(v => {
      csv += `Vital,${v.measured_at},${v.vital_type},${v.value || `${v.systolic}/${v.diastolic}`},${v.unit || 'mmHg'},\n`;
    });
    
    filteredLabs.forEach(l => {
      csv += `Lab,${l.test_date},${l.test_name},${l.value},${l.unit},${l.flag}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-trends-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderChart = (data, title, yLabel, color = '#9BB4FF', isBP = false) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 text-sm">
          {t('health_trends.no_data')}
        </div>
      );
    }

    const stats = calculateStats(data, isBP ? 'systolic' : 'value');

    const Chart = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart;
    const DataComponent = chartType === 'line' ? Line : chartType === 'area' ? Area : Bar;

    return (
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold text-[#0A0A0A]">
                {title}
              </CardTitle>
              {stats && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {t('health_trends.avg')}: {stats.avg.toFixed(1)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {t('health_trends.range')}: {stats.min.toFixed(1)} - {stats.max.toFixed(1)}
                  </Badge>
                  <Badge className={`text-xs ${stats.trend > 0 ? 'bg-green-100 text-green-700' : stats.trend < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                    {stats.trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : stats.trend < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                    {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <ResponsiveContainer width="100%" height={300}>
            <Chart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }} 
                stroke="#0A0A0A"
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                stroke="#0A0A0A"
                label={{ value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E8E8E3',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
                labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
              />
              {isBP ? (
                <>
                  <DataComponent 
                    type="monotone" 
                    dataKey="systolic" 
                    stroke="#F7C9A3" 
                    fill="#F7C9A3"
                    fillOpacity={chartType === 'area' ? 0.6 : 1}
                    strokeWidth={2}
                    name="Systolic"
                  />
                  <DataComponent 
                    type="monotone" 
                    dataKey="diastolic" 
                    stroke="#9BB4FF" 
                    fill="#9BB4FF"
                    fillOpacity={chartType === 'area' ? 0.6 : 1}
                    strokeWidth={2}
                    name="Diastolic"
                  />
                  <Legend />
                </>
              ) : (
                <DataComponent 
                  type="monotone" 
                  dataKey="value" 
                  stroke={color} 
                  fill={color}
                  fillOpacity={chartType === 'area' ? 0.6 : 1}
                  strokeWidth={2}
                  name={yLabel}
                />
              )}
            </Chart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
          📊 {t('health_trends.title')}
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{t('health_trends.subtitle')}</p>
        
        {profiles.length > 0 && (
          <ProfileSwitcher
            profiles={profiles}
            selectedProfile={selectedProfileId}
            onProfileChange={setSelectedProfileId}
          />
        )}
      </div>

      {/* Filters */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-4 sm:mb-6">
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {t('health_trends.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="space-y-2">
                <Label className="text-xs">{t('health_trends.date_range')}</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="h-10 sm:h-11 rounded-2xl text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">{t('health_trends.last_7_days')}</SelectItem>
                    <SelectItem value="30d">{t('health_trends.last_30_days')}</SelectItem>
                    <SelectItem value="90d">{t('health_trends.last_90_days')}</SelectItem>
                    <SelectItem value="6m">{t('health_trends.last_6_months')}</SelectItem>
                    <SelectItem value="1y">{t('health_trends.last_year')}</SelectItem>
                    <SelectItem value="custom">{t('health_trends.custom_range')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('health_trends.chart_type')}</Label>
                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger className="h-10 sm:h-11 rounded-2xl text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">{t('health_trends.line_chart')}</SelectItem>
                    <SelectItem value="area">{t('health_trends.area_chart')}</SelectItem>
                    <SelectItem value="bar">{t('health_trends.bar_chart')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('health_trends.metric_filter')}</Label>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger className="h-10 sm:h-11 rounded-2xl text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('health_trends.all_metrics')}</SelectItem>
                    <SelectItem value="vitals">{t('health_trends.vitals_only')}</SelectItem>
                    <SelectItem value="labs">{t('health_trends.labs_only')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">{t('health_trends.start_date')}</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-10 sm:h-11 rounded-2xl text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('health_trends.end_date')}</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-10 sm:h-11 rounded-2xl text-xs sm:text-sm"
                  />
                </div>
              </div>
            )}

            <Button
              onClick={downloadCSV}
              variant="outline"
              className="w-full rounded-2xl active-press h-10 sm:h-11 text-xs sm:text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('health_trends.export_csv')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Card className="border-0 card-shadow rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">{t('health_trends.vital_readings')}</div>
            <div className="text-xl sm:text-2xl font-bold text-[#0A0A0A]">
              {filteredVitals.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 card-shadow rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">{t('health_trends.lab_tests')}</div>
            <div className="text-xl sm:text-2xl font-bold text-[#0A0A0A]">
              {filteredLabs.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 card-shadow rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">{t('health_trends.vital_types')}</div>
            <div className="text-xl sm:text-2xl font-bold text-[#0A0A0A]">
              {vitalTypes.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 card-shadow rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">{t('health_trends.lab_types')}</div>
            <div className="text-xl sm:text-2xl font-bold text-[#0A0A0A]">
              {labTests.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="space-y-3 sm:space-y-4">
        {/* Vitals Charts */}
        {(selectedMetric === 'all' || selectedMetric === 'vitals') && vitalTypes.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-[#0A0A0A] mt-6 mb-3">{t('health_trends.vital_signs')}</h2>
            {vitalTypes.includes('blood_pressure') && 
              renderChart(
                prepareVitalChartData('blood_pressure'), 
                'Blood Pressure Trend', 
                'mmHg',
                '#9BB4FF',
                true
              )
            }
            {vitalTypes.includes('heart_rate') && 
              renderChart(
                prepareVitalChartData('heart_rate'), 
                'Heart Rate Trend', 
                'bpm',
                '#F7C9A3'
              )
            }
            {vitalTypes.includes('weight') && 
              renderChart(
                prepareVitalChartData('weight'), 
                'Weight Trend', 
                'kg',
                '#0B5A46'
              )
            }
            {vitalTypes.includes('blood_glucose') && 
              renderChart(
                prepareVitalChartData('blood_glucose'), 
                'Blood Glucose Trend', 
                'mg/dL',
                '#EDE6F7'
              )
            }
            {vitalTypes.includes('temperature') && 
              renderChart(
                prepareVitalChartData('temperature'), 
                'Temperature Trend', 
                '°F',
                '#E9F46A'
              )
            }
            {vitalTypes.includes('oxygen_saturation') && 
              renderChart(
                prepareVitalChartData('oxygen_saturation'), 
                'Oxygen Saturation Trend', 
                '%',
                '#9BB4FF'
              )
            }
          </>
        )}

        {/* Lab Results Charts */}
        {(selectedMetric === 'all' || selectedMetric === 'labs') && labTests.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-[#0A0A0A] mt-6 mb-3">{t('health_trends.laboratory_results')}</h2>
            {labTests.map((test, idx) => 
              renderChart(
                prepareLabChartData(test), 
                test, 
                filteredLabs.find(l => l.test_name === test)?.unit || '',
                ['#9BB4FF', '#F7C9A3', '#0B5A46', '#EDE6F7', '#E9F46A'][idx % 5]
              )
            )}
          </>
        )}

        {/* No Data State */}
        {filteredVitals.length === 0 && filteredLabs.length === 0 && (
          <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
            <CardContent className="p-12 text-center">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">{t('health_trends.no_data')}</p>
              <p className="text-xs text-gray-500">{t('health_trends.no_data_desc')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}