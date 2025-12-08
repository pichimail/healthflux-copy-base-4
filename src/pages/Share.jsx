import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Share2, Plus, Copy, ExternalLink, Trash2, Eye, Clock, CheckCircle } from 'lucide-react';
import { format, addDays, addHours } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

export default function Share() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    profile_id: '',
    recipient_name: '',
    recipient_email: '',
    expires_in: '7',
    allowed_scopes: ['documents', 'lab_results', 'vitals'],
    purpose: '',
  });

  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date'),
  });

  const { data: shareLinks = [], isLoading } = useQuery({
    queryKey: ['shareLinks'],
    queryFn: () => base44.entities.ShareLink.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = data.expires_in === 'custom' 
        ? data.custom_expiry
        : addDays(new Date(), parseInt(data.expires_in)).toISOString();
      
      return base44.entities.ShareLink.create({
        profile_id: data.profile_id,
        token,
        recipient_name: data.recipient_name,
        recipient_email: data.recipient_email,
        expires_at: expiresAt,
        allowed_scopes: data.allowed_scopes,
        purpose: data.purpose,
        is_active: true,
        access_count: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shareLinks']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (link) => base44.entities.ShareLink.update(link.id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shareLinks']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShareLink.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['shareLinks']);
    },
  });

  const resetForm = () => {
    setFormData({
      profile_id: '',
      recipient_name: '',
      recipient_email: '',
      expires_in: '7',
      allowed_scopes: ['documents', 'lab_results', 'vitals'],
      purpose: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.profile_id) {
      alert('Please select a profile');
      return;
    }
    if (formData.allowed_scopes.length === 0) {
      alert('Please select at least one data scope');
      return;
    }
    createMutation.mutate(formData);
  };

  const toggleScope = (scope) => {
    const newScopes = formData.allowed_scopes.includes(scope)
      ? formData.allowed_scopes.filter(s => s !== scope)
      : [...formData.allowed_scopes, scope];
    setFormData({ ...formData, allowed_scopes: newScopes });
  };

  const copyToClipboard = (link) => {
    const url = `${window.location.origin}/PublicShare?token=${link.token}`;
    navigator.clipboard.writeText(url);
    alert('Share link copied to clipboard!');
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Share Health Data</h1>
          <p className="text-slate-600">Create secure links to share health records</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Share Link
        </Button>
      </div>

      {/* Share Links List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : shareLinks.length === 0 ? (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-12 text-center">
            <Share2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Share Links Yet</h3>
            <p className="text-slate-600 mb-6">
              Create secure links to share health data with doctors or family members
            </p>
            <Button onClick={() => setDialogOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Share Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {shareLinks.map((link) => {
            const profile = profiles.find(p => p.id === link.profile_id);
            const expired = isExpired(link.expires_at);
            const shareUrl = `${window.location.origin}/PublicShare?token=${link.token}`;
            
            return (
              <Card key={link.id} className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-bold text-lg text-slate-900">
                          {link.purpose || 'Shared Health Data'}
                        </h3>
                        {link.is_active && !expired ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-600">
                            Inactive
                          </Badge>
                        )}
                        {expired && (
                          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                            Expired
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-slate-600 mb-4">
                        {profile && (
                          <p>👤 Profile: <span className="font-medium text-slate-900">{profile.full_name}</span></p>
                        )}
                        {link.recipient_name && (
                          <p>📧 Recipient: <span className="font-medium text-slate-900">{link.recipient_name}</span></p>
                        )}
                        {link.recipient_email && (
                          <p>✉️ Email: <span className="font-medium text-slate-900">{link.recipient_email}</span></p>
                        )}
                        <p>
                          <Clock className="w-4 h-4 inline mr-1" />
                          Expires: <span className="font-medium text-slate-900">
                            {format(new Date(link.expires_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </p>
                        <p>
                          <Eye className="w-4 h-4 inline mr-1" />
                          Accessed: <span className="font-medium text-slate-900">{link.access_count} times</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {link.allowed_scopes.map(scope => (
                          <Badge key={scope} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {scope.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>

                      {link.is_active && !expired && (
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                          <Input
                            value={shareUrl}
                            readOnly
                            className="flex-1 text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(link)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(shareUrl, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex lg:flex-col gap-2">
                      {link.is_active && !expired && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Deactivate this share link?')) {
                              deactivateMutation.mutate(link);
                            }
                          }}
                          className="flex-1 lg:flex-none"
                        >
                          Deactivate
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this share link?')) {
                            deleteMutation.mutate(link.id);
                          }
                        }}
                        className="flex-1 lg:flex-none text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Share Link Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Share Link</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="profile_id">Profile to Share *</Label>
              <Select
                value={formData.profile_id}
                onValueChange={(value) => setFormData({ ...formData, profile_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipient_name">Recipient Name</Label>
                <Input
                  id="recipient_name"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  placeholder="e.g., Dr. Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient_email">Recipient Email</Label>
                <Input
                  id="recipient_email"
                  type="email"
                  value={formData.recipient_email}
                  onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                  placeholder="doctor@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose of Sharing</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., Consultation with Dr. Smith"
              />
            </div>

            <div className="space-y-2">
              <Label>Data to Share *</Label>
              <div className="space-y-2">
                {[
                  { value: 'documents', label: 'Medical Documents' },
                  { value: 'lab_results', label: 'Lab Results' },
                  { value: 'vitals', label: 'Vital Signs' },
                  { value: 'medications', label: 'Medications' },
                  { value: 'trends', label: 'Health Trends' },
                ].map((scope) => (
                  <div key={scope.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={scope.value}
                      checked={formData.allowed_scopes.includes(scope.value)}
                      onCheckedChange={() => toggleScope(scope.value)}
                    />
                    <Label
                      htmlFor={scope.value}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {scope.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_in">Link Expires In *</Label>
              <Select
                value={formData.expires_in}
                onValueChange={(value) => setFormData({ ...formData, expires_in: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">1 Week</SelectItem>
                  <SelectItem value="14">2 Weeks</SelectItem>
                  <SelectItem value="30">1 Month</SelectItem>
                  <SelectItem value="90">3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Anyone with this link will be able to view the selected health data until the link expires or is deactivated.
              </p>
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
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
                disabled={createMutation.isLoading}
              >
                Create Share Link
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}