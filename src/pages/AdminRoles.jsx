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
import { Shield, Plus, Edit, Trash2, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminRoles() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {
      view_own_data: true,
      view_all_data: false,
      manage_users: false,
      manage_subscriptions: false,
      send_notifications: false,
      manage_packages: false,
      view_analytics: false,
      manage_roles: false,
      access_ai_insights: false,
      access_predictive_analytics: false,
      emergency_sharing: false,
    },
    is_system_role: false,
  });

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

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => base44.asServiceRole.entities.Role.list('-created_date'),
    enabled: !checking,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-roles']);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.asServiceRole.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-roles']);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.asServiceRole.entities.Role.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-roles']),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: {
        view_own_data: true,
        view_all_data: false,
        manage_users: false,
        manage_subscriptions: false,
        send_notifications: false,
        manage_packages: false,
        view_analytics: false,
        manage_roles: false,
        access_ai_insights: false,
        access_predictive_analytics: false,
        emergency_sharing: false,
      },
      is_system_role: false,
    });
    setSelectedRole(null);
    setDialogOpen(false);
  };

  const handleEdit = (role) => {
    setSelectedRole(role);
    setFormData(role);
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedRole) {
      updateMutation.mutate({ id: selectedRole.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const permissionLabels = {
    view_own_data: 'View Own Data',
    view_all_data: 'View All Data',
    manage_users: 'Manage Users',
    manage_subscriptions: 'Manage Subscriptions',
    send_notifications: 'Send Notifications',
    manage_packages: 'Manage Packages',
    view_analytics: 'View Analytics',
    manage_roles: 'Manage Roles',
    access_ai_insights: 'AI Insights',
    access_predictive_analytics: 'Predictive Analytics',
    emergency_sharing: 'Emergency Sharing',
  };

  if (checking) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>;
  }

  return (
    <AdminLayout currentPageName="AdminRoles">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Role Management</h1>
            <p className="text-slate-600">Define custom roles and permissions</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Role
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {roles.map((role) => {
            const permCount = Object.values(role.permissions || {}).filter(Boolean).length;
            return (
              <Card key={role.id} className="border-0 shadow-lg">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        {role.name}
                        {role.is_system_role && <Lock className="w-4 h-4 text-slate-400" />}
                      </CardTitle>
                      <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                    </div>
                    {!role.is_system_role && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(role)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            if (confirm('Delete this role?')) deleteMutation.mutate(role.id);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <p className="text-sm text-slate-600 mb-2">Permissions ({permCount})</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(role.permissions || {})
                        .filter(([_, value]) => value)
                        .map(([key, _]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {permissionLabels[key] || key}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRole ? 'Edit Role' : 'New Role'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
              </div>

              <div className="space-y-2">
                <Label className="text-lg font-semibold">Permissions</Label>
                <div className="grid md:grid-cols-2 gap-3">
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                      <Label className="text-sm">{label}</Label>
                      <Switch 
                        checked={formData.permissions[key] || false}
                        onCheckedChange={(v) => setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, [key]: v }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {selectedRole ? 'Update' : 'Create'} Role
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}