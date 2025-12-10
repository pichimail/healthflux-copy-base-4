import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Edit, Trash2, DollarSign, Calendar, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminPackages() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration_months: 1,
    features: [],
    max_profiles: 5,
    max_documents: 0,
    ai_insights_enabled: false,
    predictive_analytics_enabled: false,
    emergency_sharing_enabled: false,
    is_active: true,
    display_order: 0,
  });
  const [featureInput, setFeatureInput] = useState('');

  const queryClient = useQueryClient();

  React.useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const userData = await base44.auth.me();
      if (!userData || userData.role !== 'admin') {
        window.location.href = createPageUrl('AdminLogin');
        return;
      }
      setUser(userData);
      setChecking(false);
    } catch (error) {
      window.location.href = createPageUrl('AdminLogin');
    }
  };

  const { data: packages = [] } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => base44.asServiceRole.entities.SubscriptionPackage.list('display_order'),
    enabled: !checking,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => base44.asServiceRole.entities.Subscription.list(),
    enabled: !checking,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.SubscriptionPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.asServiceRole.entities.SubscriptionPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.asServiceRole.entities.SubscriptionPackage.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-packages']),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      duration_months: 1,
      features: [],
      max_profiles: 5,
      max_documents: 0,
      ai_insights_enabled: false,
      predictive_analytics_enabled: false,
      emergency_sharing_enabled: false,
      is_active: true,
      display_order: 0,
    });
    setSelectedPackage(null);
    setDialogOpen(false);
    setFeatureInput('');
  };

  const handleEdit = (pkg) => {
    setSelectedPackage(pkg);
    setFormData(pkg);
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedPackage) {
      updateMutation.mutate({ id: selectedPackage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({ ...formData, features: [...formData.features, featureInput.trim()] });
      setFeatureInput('');
    }
  };

  const removeFeature = (index) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });
  };

  const getSubscriberCount = (packageId) => {
    return subscriptions.filter(s => s.package_id === packageId && s.status === 'active').length;
  };

  if (checking) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>;
  }

  const totalRevenue = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.amount_paid || 0), 0);

  return (
    <AdminLayout currentPageName="AdminPackages">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Subscription Packages</h1>
            <p className="text-slate-600">Manage pricing tiers and features</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Package
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Packages</p>
                  <p className="text-3xl font-bold text-slate-900">{packages.length}</p>
                </div>
                <Package className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Active Subscribers</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {subscriptions.filter(s => s.status === 'active').length}
                  </p>
                </div>
                <Users className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-slate-900">${totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={`border-0 shadow-lg ${!pkg.is_active && 'opacity-60'}`}>
              <CardHeader className="border-b border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    {!pkg.is_active && <Badge variant="outline" className="mt-2">Inactive</Badge>}
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">${pkg.price}</p>
                    <p className="text-sm text-slate-600">/{pkg.duration_months}mo</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-4">{pkg.description}</p>
                
                <div className="space-y-3 mb-4">
                  {pkg.features?.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-1">✓</span>
                      <span className="text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div className="bg-slate-50 p-2 rounded">
                    <p className="text-slate-600">Max Profiles</p>
                    <p className="font-semibold">{pkg.max_profiles}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <p className="text-slate-600">Documents</p>
                    <p className="font-semibold">{pkg.max_documents === 0 ? 'Unlimited' : pkg.max_documents}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {pkg.ai_insights_enabled && <Badge className="text-xs bg-blue-100 text-blue-700">AI Insights</Badge>}
                  {pkg.predictive_analytics_enabled && <Badge className="text-xs bg-purple-100 text-purple-700">Predictive</Badge>}
                  {pkg.emergency_sharing_enabled && <Badge className="text-xs bg-red-100 text-red-700">Emergency</Badge>}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-600">{getSubscriberCount(pkg.id)} subscribers</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(pkg)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        if (confirm('Delete this package?')) deleteMutation.mutate(pkg.id);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPackage ? 'Edit Package' : 'New Package'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Package Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Price (USD)</Label>
                  <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})} required />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Duration (months)</Label>
                  <Input type="number" value={formData.duration_months} onChange={(e) => setFormData({...formData, duration_months: parseInt(e.target.value)})} required />
                </div>
                <div className="space-y-2">
                  <Label>Max Profiles</Label>
                  <Input type="number" value={formData.max_profiles} onChange={(e) => setFormData({...formData, max_profiles: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Max Documents (0=unlimited)</Label>
                  <Input type="number" value={formData.max_documents} onChange={(e) => setFormData({...formData, max_documents: parseInt(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features</Label>
                <div className="flex gap-2">
                  <Input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} placeholder="Add a feature" />
                  <Button type="button" onClick={addFeature}>Add</Button>
                </div>
                <div className="space-y-1 mt-2">
                  {formData.features.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                      <span className="text-sm">{f}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeFeature(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>AI Insights</Label>
                  <Switch checked={formData.ai_insights_enabled} onCheckedChange={(v) => setFormData({...formData, ai_insights_enabled: v})} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Predictive Analytics</Label>
                  <Switch checked={formData.predictive_analytics_enabled} onCheckedChange={(v) => setFormData({...formData, predictive_analytics_enabled: v})} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Emergency Sharing</Label>
                  <Switch checked={formData.emergency_sharing_enabled} onCheckedChange={(v) => setFormData({...formData, emergency_sharing_enabled: v})} />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <Label>Active</Label>
                  <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({...formData, is_active: v})} />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {selectedPackage ? 'Update' : 'Create'} Package
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}