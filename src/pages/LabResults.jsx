import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Activity, Plus, AlertCircle, CheckCircle, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

export default function LabResults() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    test_name: '',
    test_category: 'blood',
    value: '',
    unit: '',
    reference_low: '',
    reference_high: '',
    test_date: new Date().toISOString().split('T')[0],
    facility: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date'),
  });

  const { data: labResults = [], isLoading } = useQuery({
    queryKey: ['labResults', selectedProfile, filterCategory],
    queryFn: async () => {
      const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
      if (!profileId) return [];
      
      const results = await base44.entities.LabResult.filter({ 
        profile_id: profileId 
      }, '-test_date');
      
      if (filterCategory === 'all') return results;
      return results.filter(r => r.test_category === filterCategory);
    },
    enabled: profiles.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LabResult.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['labResults']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LabResult.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['labResults']);
    },
  });

  const resetForm = () => {
    setFormData({
      test_name: '',
      test_category: 'blood',
      value: '',
      unit: '',
      reference_low: '',
      reference_high: '',
      test_date: new Date().toISOString().split('T')[0],
      facility: '',
      notes: '',
    });
  };

  const calculateFlag = (value, refLow, refHigh) => {
    const val = parseFloat(value);
    const low = parseFloat(refLow);
    const high = parseFloat(refHigh);
    
    if (isNaN(val)) return 'normal';
    if (!isNaN(low) && val < low) return 'low';
    if (!isNaN(high) && val > high) return 'high';
    return 'normal';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const profileId = selectedProfile || profiles.find(p => p.relationship === 'self')?.id;
    
    if (!profileId) {
      alert('Please select a profile');
      return;
    }

    const flag = calculateFlag(formData.value, formData.reference_low, formData.reference_high);

    const data = {
      ...formData,
      profile_id: profileId,
      value: parseFloat(formData.value),
      reference_low: formData.reference_low ? parseFloat(formData.reference_low) : undefined,
      reference_high: formData.reference_high ? parseFloat(formData.reference_high) : undefined,
      flag,
    };

    createMutation.mutate(data);
  };

  const getFlagColor = (flag) => {
    if (flag === 'high') return 'bg-red-100 text-red-700 border-red-200';
    if (flag === 'low') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const getFlagIcon = (flag) => {
    if (flag === 'high') return <AlertCircle className="w-4 h-4" />;
    if (flag === 'low') return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getCategoryColor = (category) => {
    const colors = {
      blood: 'from-red-500 to-pink-500',
      urine: 'from-yellow-500 to-orange-500',
      lipid: 'from-purple-500 to-pink-500',
      liver: 'from-orange-500 to-red-500',
      kidney: 'from-blue-500 to-cyan-500',
      thyroid: 'from-teal-500 to-green-500',
      diabetes: 'from-green-500 to-emerald-500',
      vitamin: 'from-yellow-500 to-amber-500',
      other: 'from-slate-500 to-slate-600',
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Lab Results</h1>
          <p className="text-slate-600">Track your laboratory test results</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Lab Result
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={selectedProfile || 'self'} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-full sm:w-64">
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

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="blood">Blood Tests</SelectItem>
            <SelectItem value="urine">Urine Tests</SelectItem>
            <SelectItem value="lipid">Lipid Panel</SelectItem>
            <SelectItem value="liver">Liver Function</SelectItem>
            <SelectItem value="kidney">Kidney Function</SelectItem>
            <SelectItem value="thyroid">Thyroid</SelectItem>
            <SelectItem value="diabetes">Diabetes</SelectItem>
            <SelectItem value="vitamin">Vitamins</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lab Results List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      ) : labResults.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">No lab results found</p>
          <Button onClick={() => setDialogOpen(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Lab Result
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {labResults.map((result) => {
            const profile = profiles.find(p => p.id === result.profile_id);
            return (
              <Card key={result.id} className="border-0 shadow-lg bg-white/80 backdrop-blur overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${getCategoryColor(result.test_category)}`} />
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 mb-1">
                        {result.test_name}
                      </h3>
                      <p className="text-sm text-slate-600 capitalize">
                        {result.test_category.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <Badge variant="outline" className={getFlagColor(result.flag)}>
                      <div className="flex items-center gap-1">
                        {getFlagIcon(result.flag)}
                        <span className="capitalize">{result.flag}</span>
                      </div>
                    </Badge>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <p className="text-3xl font-bold text-slate-900 mb-1">
                      {result.value}
                      <span className="text-lg text-slate-600 ml-2">{result.unit}</span>
                    </p>
                    {(result.reference_low || result.reference_high) && (
                      <p className="text-sm text-slate-600">
                        Reference: {result.reference_low || '—'} - {result.reference_high || '—'} {result.unit}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 mb-4">
                    {profile && (
                      <p>👤 {profile.full_name}</p>
                    )}
                    <p>📅 {format(new Date(result.test_date), 'MMM d, yyyy')}</p>
                    {result.facility && (
                      <p>🏥 {result.facility}</p>
                    )}
                    {result.notes && (
                      <p className="bg-blue-50 p-2 rounded text-blue-900 mt-2">
                        {result.notes}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this lab result?')) {
                        deleteMutation.mutate(result.id);
                      }
                    }}
                    className="w-full text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Lab Result Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Lab Result</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test_name">Test Name *</Label>
                <Input
                  id="test_name"
                  value={formData.test_name}
                  onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                  placeholder="e.g., Hemoglobin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test_category">Category *</Label>
                <Select
                  value={formData.test_category}
                  onValueChange={(value) => setFormData({ ...formData, test_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blood">Blood Tests</SelectItem>
                    <SelectItem value="urine">Urine Tests</SelectItem>
                    <SelectItem value="lipid">Lipid Panel</SelectItem>
                    <SelectItem value="liver">Liver Function</SelectItem>
                    <SelectItem value="kidney">Kidney Function</SelectItem>
                    <SelectItem value="thyroid">Thyroid</SelectItem>
                    <SelectItem value="diabetes">Diabetes</SelectItem>
                    <SelectItem value="vitamin">Vitamins</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="e.g., 13.5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., g/dL"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference_low">Reference Low</Label>
                <Input
                  id="reference_low"
                  type="number"
                  step="0.01"
                  value={formData.reference_low}
                  onChange={(e) => setFormData({ ...formData, reference_low: e.target.value })}
                  placeholder="e.g., 12.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_high">Reference High</Label>
                <Input
                  id="reference_high"
                  type="number"
                  step="0.01"
                  value={formData.reference_high}
                  onChange={(e) => setFormData({ ...formData, reference_high: e.target.value })}
                  placeholder="e.g., 16.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test_date">Test Date *</Label>
                <Input
                  id="test_date"
                  type="date"
                  value={formData.test_date}
                  onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facility">Lab Facility</Label>
                <Input
                  id="facility"
                  value={formData.facility}
                  onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
                  placeholder="e.g., City Lab"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional observations"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-500"
                disabled={createMutation.isLoading}
              >
                Add Result
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}