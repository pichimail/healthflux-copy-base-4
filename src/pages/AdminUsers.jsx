import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Search, UserCog, Shield, Mail, Calendar, 
  Trash2, Edit, Check, X, Crown
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminUsers() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editData, setEditData] = useState({ role: 'user' });

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

  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const users = await base44.asServiceRole.entities.User.list('-created_date');
      return users;
    },
    enabled: !checking,
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ['admin-all-profiles'],
    queryFn: () => base44.asServiceRole.entities.Profile.list('-created_date'),
    enabled: !checking,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      return await base44.asServiceRole.entities.User.update(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      return await base44.asServiceRole.entities.User.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
    },
  });

  const handleEditUser = (userToEdit) => {
    setSelectedUser(userToEdit);
    setEditData({ role: userToEdit.role || 'user' });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (selectedUser) {
      updateUserMutation.mutate({
        userId: selectedUser.id,
        data: editData,
      });
    }
  };

  const handleDeleteUser = (userId) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserProfileCount = (userEmail) => {
    return allProfiles.filter(p => p.created_by === userEmail).length;
  };

  const adminCount = allUsers.filter(u => u.role === 'admin').length;
  const regularUserCount = allUsers.filter(u => u.role !== 'admin').length;

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <AdminLayout currentPageName="AdminUsers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">User Management</h1>
            <p className="text-slate-600">Manage users, roles, and permissions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-slate-900">{allUsers.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Administrators</p>
                  <p className="text-3xl font-bold text-slate-900">{adminCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Regular Users</p>
                  <p className="text-3xl font-bold text-slate-900">{regularUserCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search users by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg font-semibold">All Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">User</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Email</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Role</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Profiles</th>
                    <th className="text-left p-4 text-sm font-semibold text-slate-700">Joined</th>
                    <th className="text-right p-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {u.full_name?.[0] || u.email?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{u.full_name || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{u.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}>
                          {u.role === 'admin' ? (
                            <><Crown className="w-3 h-3 mr-1" /> Admin</>
                          ) : (
                            <><Users className="w-3 h-3 mr-1" /> User</>
                          )}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-700">{getUserProfileCount(u.email)} profiles</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {format(new Date(u.created_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(u)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {u.email !== user?.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={selectedUser.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={selectedUser.full_name || 'N/A'} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={editData.role}
                    onValueChange={(value) => setEditData({ ...editData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateUser}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={updateUserMutation.isLoading}
                  >
                    {updateUserMutation.isLoading ? 'Updating...' : 'Update User'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}