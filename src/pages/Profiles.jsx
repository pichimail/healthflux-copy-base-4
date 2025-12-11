import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
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
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
      {/* Mobile-First Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
            👨‍👩‍👧‍👦 {t('profiles.title')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">{t('profiles.subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedProfile(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0B5A46] hover:bg-[#094A38] text-white rounded-2xl font-semibold shadow-lg active-press h-11 sm:h-12 px-4 sm:px-6">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                {selectedProfile ? t('profiles.edit') : t('profiles.add_member')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm">{t('profiles.full_name')} *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="h-11 sm:h-12 rounded-2xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relationship" className="text-sm">{t('profiles.relationship')} *</Label>
                  <Select
                    value={formData.relationship}
                    onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                  >
                    <SelectTrigger className="h-11 sm:h-12 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">{t('profiles.self')}</SelectItem>
                      <SelectItem value="spouse">{t('profiles.spouse')}</SelectItem>
                      <SelectItem value="child">{t('profiles.child')}</SelectItem>
                      <SelectItem value="parent">{t('profiles.parent')}</SelectItem>
                      <SelectItem value="sibling">{t('profiles.sibling')}</SelectItem>
                      <SelectItem value="other">{t('profiles.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_of_birth" className="text-sm">{t('profiles.date_of_birth')}</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="h-11 sm:h-12 rounded-2xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm">{t('profiles.gender')}</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger className="h-11 sm:h-12 rounded-2xl">
                      <SelectValue placeholder={t('common.select')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('profiles.male')}</SelectItem>
                      <SelectItem value="female">{t('profiles.female')}</SelectItem>
                      <SelectItem value="other">{t('common.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blood_group" className="text-sm">{t('profiles.blood_group')}</Label>
                  <Select
                    value={formData.blood_group}
                    onValueChange={(value) => setFormData({ ...formData, blood_group: value })}
                  >
                    <SelectTrigger className="h-11 sm:h-12 rounded-2xl">
                      <SelectValue placeholder={t('common.select')} />
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
                <Label htmlFor="height" className="text-sm">{t('profiles.height')}</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  placeholder="170"
                  className="h-11 sm:h-12 rounded-2xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-2xl active-press h-11 sm:h-12"
                >
                  {t('profiles.cancel')}
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0B5A46] hover:bg-[#094A38] text-white rounded-2xl active-press shadow-lg h-11 sm:h-12"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                >
                  {selectedProfile ? t('common.update') : t('common.add')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Profiles Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {profiles.map((profile) => {
            const age = calculateAge(profile.date_of_birth);
            return (
              <Card key={profile.id} className="border-0 card-shadow rounded-2xl sm:rounded-3xl overflow-hidden active-press hover:shadow-lg transition-all">
                <div className="h-1" style={{ backgroundColor: profile.relationship === 'self' ? '#0B5A46' : '#9BB4FF' }} />
                <CardHeader className="p-4 sm:pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        <AvatarFallback className="bg-[#0A0A0A] text-white text-sm sm:text-base font-semibold">
                          {profile.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base font-bold text-[#0A0A0A] mb-1 truncate">{profile.full_name}</CardTitle>
                        <Badge variant="outline" className="capitalize text-xs rounded-xl">
                          {profile.relationship}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 sm:space-y-2 px-4 pb-4">
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

                  <div className="grid grid-cols-2 gap-2 pt-3 sm:pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(profile)}
                      className="rounded-2xl text-xs active-press h-10"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      {t('profiles.edit')}
                    </Button>
                    {profile.relationship !== 'self' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(profile)}
                        className="text-red-600 hover:bg-red-50 rounded-2xl active-press h-10"
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
        <div className="text-center py-8 sm:py-12">
          <Users className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-600 mb-4 text-sm">{t('profiles.no_profiles')}</p>
          <Button onClick={() => setDialogOpen(true)} className="rounded-2xl bg-[#0B5A46] hover:bg-[#094A38] text-white active-press shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            {t('profiles.add_profile')}
          </Button>
        </div>
      )}
    </div>
  );
}