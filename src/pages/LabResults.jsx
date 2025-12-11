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
import { Activity, Plus, AlertCircle, CheckCircle, Trash2, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import LabResultsCharts from '../components/labs/LabResultsCharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
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
    if (flag === 'high') return <AlertCircle key="icon-high" className="w-4 h-4" />;
    if (flag === 'low') return <AlertCircle key="icon-low" className="w-4 h-4" />;
    return <CheckCircle key="icon-normal" className="w-4 h-4" />;
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
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 smooth-scroll">
      {/* Mobile-First Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
            🧪 Lab Results
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">Test tracking</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#EFF1ED] hover:bg-[#DFE1DD] text-[#0A0A0A] rounded-2xl font-semibold shadow-lg active-press h-11 sm:h-12 px-4 sm:px-6"
        >
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="results" className="mb-4 sm:mb-6">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl h-11 sm:h-12">
          <TabsTrigger value="results" className="text-xs sm:text-sm rounded-xl">Lab Results</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs sm:text-sm rounded-xl">
            <BarChart3 className="w-4 h-4 mr-1" />
            Trends & Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-4">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
            <Select value={selectedProfile || 'self'} onValueChange={setSelectedProfile}>
              <SelectTrigger className="w-full h-11 sm:h-12 rounded-2xl border-gray-200 text-xs sm:text-sm">
                <SelectValue placeholder="Profile" />
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
              <SelectTrigger className="w-full h-11 sm:h-12 rounded-2xl border-gray-200 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="blood">Blood</SelectItem>
                <SelectItem value="urine">Urine</SelectItem>
                <SelectItem value="lipid">Lipid</SelectItem>
                <SelectItem value="liver">Liver</SelectItem>
                <SelectItem value="kidney">Kidney</SelectItem>
                <SelectItem value="thyroid">Thyroid</SelectItem>
                <SelectItem value="diabetes">Diabetes</SelectItem>
                <SelectItem value="vitamin">Vitamin</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

      {/* Lab Results List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-b-2 border-green-600" />
        </div>
      ) : labResults.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <Activity className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-600 mb-4 text-sm">No lab results</p>
          <Button onClick={() => setDialogOpen(true)} className="rounded-2xl bg-[#EFF1ED] hover:bg-[#DFE1DD] text-[#0A0A0A] active-press shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Lab Result
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {labResults.map((result, index) => {
            const profile = profiles.find(p => p.id === result.profile_id);
            return (
              <Card 
                key={result.id} 
                className="border-0 card-shadow rounded-2xl sm:rounded-3xl overflow-hidden card-interactive hover:shadow-lg fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="h-1" style={{ backgroundColor: result.flag === 'normal' ? '#EFF1ED' : result.flag === 'high' ? '#F7C9A3' : '#E9F46A' }} />
                <CardContent className="p-4 sm:p-5">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-[#0A0A0A] mb-1 truncate">
                        {result.test_name}
                      </h3>
                      <p className="text-xs text-gray-600 capitalize">
                        {result.test_category.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <Badge variant="outline" className={`${getFlagColor(result.flag)} text-xs rounded-xl flex-shrink-0 ml-2`}>
                      <div className="flex items-center gap-1">
                        {getFlagIcon(result.flag)}
                        <span className="capitalize hidden sm:inline">{result.flag}</span>
                      </div>
                    </Badge>
                  </div>

                  <div className="bg-[#F4F4F2] rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4">
                    <p className="text-xl sm:text-2xl font-bold text-[#0A0A0A] mb-1">
                      {result.value}
                      <span className="text-sm sm:text-base text-gray-600 ml-2">{result.unit}</span>
                    </p>
                    {(result.reference_low || result.reference_high) && (
                      <p className="text-xs text-gray-600">
                        Ref: {result.reference_low || '—'} - {result.reference_high || '—'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 mb-3 sm:mb-4">
                    {profile && (
                      <p className="truncate">{profile.full_name}</p>
                    )}
                    <p>{format(new Date(result.test_date), 'MMM d, yyyy')}</p>
                    {result.facility && (
                      <p className="truncate">{result.facility}</p>
                    )}
                    {result.notes && (
                      <p className="bg-[#EDE6F7] p-2 rounded-xl text-[#0A0A0A] mt-2">
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
                    className="w-full text-red-600 hover:bg-red-50 rounded-2xl text-xs active-press h-10"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <LabResultsCharts labResults={labResults} profiles={profiles} />
        </TabsContent>
      </Tabs>

      {/* Add Lab Result Dialog - Mobile Optimized */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Add Lab Result</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="test_name" className="text-sm">Test Name *</Label>
                <Input
                  id="test_name"
                  value={formData.test_name}
                  onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                  placeholder="Hemoglobin"
                  className="h-11 sm:h-12 rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test_category" className="text-sm">Category *</Label>
                <Select
                  value={formData.test_category}
                  onValueChange={(value) => setFormData({ ...formData, test_category: value })}
                >
                  <SelectTrigger className="h-11 sm:h-12 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blood">Blood</SelectItem>
                    <SelectItem value="urine">Urine</SelectItem>
                    <SelectItem value="lipid">Lipid</SelectItem>
                    <SelectItem value="liver">Liver</SelectItem>
                    <SelectItem value="kidney">Kidney</SelectItem>
                    <SelectItem value="thyroid">Thyroid</SelectItem>
                    <SelectItem value="diabetes">Diabetes</SelectItem>
                    <SelectItem value="vitamin">Vitamin</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="value" className="text-sm">Value *</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="13.5"
                  className="h-11 sm:h-12 rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-sm">Unit *</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="g/dL"
                  className="h-11 sm:h-12 rounded-2xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference_low" className="text-sm">Ref Low</Label>
                <Input
                  id="reference_low"
                  type="number"
                  step="0.01"
                  value={formData.reference_low}
                  onChange={(e) => setFormData({ ...formData, reference_low: e.target.value })}
                  placeholder="12.0"
                  className="h-11 sm:h-12 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference_high" className="text-sm">Ref High</Label>
                <Input
                  id="reference_high"
                  type="number"
                  step="0.01"
                  value={formData.reference_high}
                  onChange={(e) => setFormData({ ...formData, reference_high: e.target.value })}
                  placeholder="16.0"
                  className="h-11 sm:h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="test_date" className="text-sm">Test Date *</Label>
                <Input
                  id="test_date"
                  type="date"
                  value={formData.test_date}
                  onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                  className="h-11 sm:h-12 rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facility" className="text-sm">Lab Facility</Label>
                <Input
                  id="facility"
                  value={formData.facility}
                  onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
                  placeholder="City Lab"
                  className="h-11 sm:h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional observations"
                rows={3}
                className="rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-2xl active-press h-11 sm:h-12"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#EFF1ED] hover:bg-[#DFE1DD] text-[#0A0A0A] rounded-2xl active-press shadow-lg h-11 sm:h-12"
                disabled={createMutation.isLoading}
              >
                Add
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}