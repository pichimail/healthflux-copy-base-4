import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Edit, Trash2, User, Heart, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function Profiles() {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    relationship: 'child',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    height: '',
  });

  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Profile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['profiles']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Profile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['profiles']);
      setDialogOpen(false);
      setSelectedProfile(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Profile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['profiles']);
    },
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      relationship: 'child',
      date_of_birth: '',
      gender: '',
      blood_group: '',
      height: '',
    });
  };

  const handleEdit = (profile) => {
    setSelectedProfile(profile);
    setFormData({
      full_name: profile.full_name || '',
      relationship: profile.relationship || 'child',
      date_of_birth: profile.date_of_birth || '',
      gender: profile.gender || '',
      blood_group: profile.blood_group || '',
      height: profile.height?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      height: formData.height ? parseFloat(formData.height) : undefined,
    };

    if (selectedProfile) {
      updateMutation.mutate({ id: selectedProfile.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (profile) => {
    if (profile.relationship === 'self') {
      alert('Cannot delete your own profile');
      return;
    }
    if (confirm(`Are you sure you want to delete ${profile.full_name}'s profile?`)) {
      deleteMutation.mutate(profile.id);
    }
  };

  const getRelationshipColor = (relationship) => {
    const colors = {
      self: 'from-blue-500 to-blue-600',
      spouse: 'from-pink-500 to-pink-600',
      child: 'from-green-500 to-green-600',
      parent: 'from-purple-500 to-purple-600',
      sibling: 'from-yellow-500 to-yellow-600',
      other: 'from-slate-500 to-slate-600',
    };
    return colors[relationship] || colors.other;
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A0A0A] mb-1">Family Profiles</h1>
          <p className="text-sm text-gray-600">Manage health records for your family members</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedProfile(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0B5A46] hover:bg-[#094A38] text-white rounded-xl font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Add Family Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedProfile ? 'Edit Profile' : 'Add Family Member'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship *</Label>
                  <Select
                    value={formData.relationship}
                    onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Self</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blood_group">Blood Group</Label>
                  <Select
                    value={formData.blood_group}
                    onValueChange={(value) => setFormData({ ...formData, blood_group: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  placeholder="e.g., 170"
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
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                >
                  {selectedProfile ? 'Update' : 'Add'} Profile
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Profiles Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => {
            const age = calculateAge(profile.date_of_birth);
            return (
              <Card key={profile.id} className="border-0 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all hover:scale-[1.02]">
                <div className="h-1" style={{ backgroundColor: profile.relationship === 'self' ? '#0B5A46' : '#9BB4FF' }} />
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-[#0A0A0A] text-white text-base font-semibold">
                          {profile.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base font-bold text-[#0A0A0A] mb-1">{profile.full_name}</CardTitle>
                        <Badge variant="outline" className="capitalize text-xs rounded-lg">
                          {profile.relationship}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {age && (
                    <div className="flex items-center gap-2 text-xs">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">{age} years old</span>
                    </div>
                  )}
                  {profile.gender && (
                    <div className="flex items-center gap-2 text-xs">
                      <Activity className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600 capitalize">{profile.gender}</span>
                    </div>
                  )}
                  {profile.blood_group && (
                    <div className="flex items-center gap-2 text-xs">
                      <Heart className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">{profile.blood_group}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(profile)}
                      className="flex-1 rounded-xl text-xs"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    {profile.relationship !== 'self' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(profile)}
                        className="text-red-600 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {profiles.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4 text-sm">No family profiles yet</p>
          <Button onClick={() => setDialogOpen(true)} className="rounded-xl bg-[#0B5A46] hover:bg-[#094A38] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Profile
          </Button>
        </div>
      )}
    </div>
  );
}