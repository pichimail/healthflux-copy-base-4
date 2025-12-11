import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomReports({ profileId, dateRange }) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    vitals: true,
    medications: true,
    nutrition: true,
    labs: true,
    documents: false,
    insights: true
  });

  const generateReportMutation = useMutation({
    mutationFn: async (format) => {
      const { data } = await base44.functions.invoke('generateCustomReport', {
        profile_id: profileId,
        start_date: dateRange.start,
        end_date: dateRange.end,
        include_metrics: selectedMetrics,
        format
      });
      return data;
    },
    onSuccess: (data, format) => {
      // Download the report
      const blob = new Blob([data.report_content], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Report downloaded successfully!');
    }
  });

  const handleMetricToggle = (metric) => {
    setSelectedMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  const metrics = [
    { id: 'vitals', label: 'Vital Signs', icon: '💓' },
    { id: 'medications', label: 'Medications & Adherence', icon: '💊' },
    { id: 'nutrition', label: 'Nutrition & Meals', icon: '🍎' },
    { id: 'labs', label: 'Lab Results', icon: '🧪' },
    { id: 'documents', label: 'Medical Documents', icon: '📄' },
    { id: 'insights', label: 'AI Health Insights', icon: '🧠' }
  ];

  return (
    <div className="space-y-4">
      <Card className="border-0 card-shadow rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Customize Your Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-gray-700">Select data to include:</p>
            {metrics.map((metric) => (
              <div key={metric.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <Checkbox
                  id={metric.id}
                  checked={selectedMetrics[metric.id]}
                  onCheckedChange={() => handleMetricToggle(metric.id)}
                />
                <Label htmlFor={metric.id} className="flex items-center gap-2 cursor-pointer">
                  <span>{metric.icon}</span>
                  <span className="text-sm">{metric.label}</span>
                </Label>
              </div>
            ))}
          </div>

          <div className="pt-4 space-y-2">
            <p className="text-sm font-semibold">Export Format:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => generateReportMutation.mutate('pdf')}
                disabled={generateReportMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-12"
              >
                {generateReportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    PDF Report
                  </>
                )}
              </Button>
              <Button
                onClick={() => generateReportMutation.mutate('csv')}
                disabled={generateReportMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white rounded-2xl h-12"
              >
                {generateReportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    CSV Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 card-shadow rounded-2xl bg-blue-50">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2">📋 Report Features</h3>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>• Comprehensive data visualization</li>
            <li>• Trend analysis and insights</li>
            <li>• Doctor-ready format</li>
            <li>• Privacy-protected exports</li>
            <li>• Historical comparisons</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}