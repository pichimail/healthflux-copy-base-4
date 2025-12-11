import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Users, Plus, Shield, Check, X, Eye, Clock, AlertCircle, Mail, Loader2, Settings,
  Edit, Trash2, User, Heart, Activity
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

export default function FamilyProfiles() {
  const { t } = useTranslation();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedShare, setSelectedShare] = useState(null);
  const [profileFormData, setProfileFormData] = useState({
    full_name: '',
    relationship: 'child',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    height: '',
  });
  const [inviteData, setInviteData] = useState({
    shared_with_user_email: '',
    shared_with_user_name: '',
    relationship: 'spouse',
    permissions: {
      view_documents: false,
      view_lab_results: false,
      view_vitals: false,
      view_medications: false,
      view_insights: false,
      view_appointments: false
    }
  });
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user
  });

  const selfProfile = profiles.find(p => p.relationship === 'self');

  const { data: shares = [] } = useQuery({
    queryKey: ['familyShares', selfProfile?.id],
    queryFn: () => base44.entities.FamilyShare.filter({ shared_by_profile_id: selfProfile?.id }, '-created_date'),
    enabled: !!selfProfile?.id
  });

  const { data: receivedShares = [] } = useQuery({
    queryKey: ['receivedShares', user?.email],
    queryFn: () => base44.entities.FamilyShare.filter({ shared_with_user_email: user.email }, '-created_date'),
    enabled: !!user?.email
  });

  const createProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.Profile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['profiles']);
      setShowProfileModal(false);
      resetProfileForm();
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Profile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['profiles']);
      setShowProfileModal(false);
      setSelectedProfile(null);
      resetProfileForm();
    }
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id) => base44.entities.Profile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['profiles']);
    }
  });

  const createShareMutation = useMutation({
    mutationFn: (data) => base44.entities.FamilyShare.create({
      ...data,
      shared_by_profile_id: selfProfile.id,
      invited_date: new Date().toISOString(),
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyShares']);
      setShowInviteModal(false);
      resetInviteForm();
    }
  });

  const updateShareMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FamilyShare.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyShares']);
      queryClient.invalidateQueries(['receivedShares']);
      setShowPermissionsModal(false);
    }
  });

  const revokeShareMutation = useMutation({
    mutationFn: (id) => base44.entities.FamilyShare.update(id, { status: 'revoked' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyShares']);
    }
  });

  const resetProfileForm = () => {
    setProfileFormData({
      full_name: '',
      relationship: 'child',
      date_of_birth: '',
      gender: '',
      blood_group: '',
      height: '',
    });
  };

  const resetInviteForm = () => {
    setInviteData({
      shared_with_user_email: '',
      shared_with_user_name: '',
      relationship: 'spouse',
      permissions: {
        view_documents: false,
        view_lab_results: false,
        view_vitals: false,
        view_medications: false,
        view_insights: false,
        view_appointments: false
      }
    });
  };

  const handleEditProfile = (profile) => {
    setSelectedProfile(profile);
    setProfileFormData({
      full_name: profile.full_name || '',
      relationship: profile.relationship || 'child',
      date_of_birth: profile.date_of_birth || '',
      gender: profile.gender || '',
      blood_group: profile.blood_group || '',
      height: profile.height?.toString() || '',
    });
    setShowProfileModal(true);
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...profileFormData,
      height: profileFormData.height ? parseFloat(profileFormData.height) : undefined,
    };

    if (selectedProfile) {
      updateProfileMutation.mutate({ id: selectedProfile.id, data });
    } else {
      createProfileMutation.mutate(data);
    }
  };

  const handleDeleteProfile = (profile) => {
    if (profile.relationship === 'self') {
      alert('Cannot delete your own profile');
      return;
    }
    if (confirm(`Delete ${profile.full_name}'s profile?`)) {
      deleteProfileMutation.mutate(profile.id);
    }
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

  const activeShares = shares.filter(s => s.status === 'accepted');
  const pendingShares = shares.filter(s => s.status === 'pending');

  const statusConfig = {
    pending: { color: 'bg-amber-100 text-amber-800', label: 'Pending' },
    accepted: { color: 'bg-green-100 text-green-800', label: 'Active' },
    declined: { color: 'bg-red-100 text-red-800', label: 'Declined' },
    revoked: { color: 'bg-slate-100 text-slate-800', label: 'Revoked' }
  };

  const permissionLabels = {
    view_documents: 'Medical Documents',
    view_lab_results: 'Lab Results',
    view_vitals: 'Vital Signs',
    view_medications: 'Medications',
    view_insights: 'Smart Insights',
    view_appointments: 'Appointments'
  };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 smooth-scroll">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
            👨‍👩‍👧‍👦 Family Profiles
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">Manage family members and sharing</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-2 sm:p-3">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 mb-1 text-blue-500" />
            <p className="text-base sm:text-xl font-bold">{profiles.length}</p>
            <p className="text-[9px] sm:text-xs text-gray-500">Members</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-2 sm:p-3">
            <Check className="h-5 w-5 sm:h-6 sm:w-6 mb-1 text-green-500" />
            <p className="text-base sm:text-xl font-bold">{activeShares.length}</p>
            <p className="text-[9px] sm:text-xs text-gray-500">Shared</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-2 sm:p-3">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 mb-1 text-amber-500" />
            <p className="text-base sm:text-xl font-bold">{pendingShares.length}</p>
            <p className="text-[9px] sm:text-xs text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-2 sm:p-3">
            <Eye className="h-5 w-5 sm:h-6 sm:w-6 mb-1 text-blue-500" />
            <p className="text-base sm:text-xl font-bold">{receivedShares.filter(s => s.status === 'accepted').length}</p>
            <p className="text-[9px] sm:text-xs text-gray-500">Access</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profiles" className="w-full">
        <TabsList className="w-full mb-4 rounded-2xl h-11 sm:h-12">
          <TabsTrigger value="profiles" className="flex-1 rounded-xl">My Family</TabsTrigger>
          <TabsTrigger value="sharing" className="flex-1 rounded-xl">Sharing</TabsTrigger>
          <TabsTrigger value="received" className="flex-1 rounded-xl">Received</TabsTrigger>
        </TabsList>

        {/* My Family Profiles */}
        <TabsContent value="profiles" className="space-y-3">
          <Button 
            onClick={() => setShowProfileModal(true)}
            className="w-full bg-[#0B5A46] hover:bg-[#094A38] text-white rounded-2xl active-press shadow-lg h-11 sm:h-12"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Family Member
          </Button>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : profiles.length === 0 ? (
            <Card className="text-center py-12 rounded-2xl">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4 text-sm">No profiles yet</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
              {profiles.map((profile) => {
                const age = calculateAge(profile.date_of_birth);
                return (
                  <Card key={profile.id} className="border-2 rounded-2xl hover:shadow-md transition-all">
                    <div className="h-1" style={{ backgroundColor: profile.relationship === 'self' ? '#0B5A46' : '#9BB4FF' }} />
                    <CardHeader className="p-3 sm:p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                            <AvatarFallback className="bg-[#0A0A0A] text-white text-sm font-semibold">
                              {profile.full_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm sm:text-base font-bold text-[#0A0A0A] truncate">{profile.full_name}</CardTitle>
                            <Badge variant="outline" className="capitalize text-xs rounded-xl mt-1">
                              {profile.relationship}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5 px-3 sm:px-4 pb-3 sm:pb-4">
                      {age && (
                        <div className="flex items-center gap-2 text-xs">
                          <User className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">{age} years</span>
                        </div>
                      )}
                      {profile.gender && (
                        <div className="flex items-center gap-2 text-xs">
                          <Activity className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600 capitalize">{profile.gender}</span>
                        </div>
                      )}
                      {profile.blood_group && (
                        <div className="flex items-center gap-2 text-xs">
                          <Heart className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">{profile.blood_group}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditProfile(profile)}
                          className="rounded-xl text-xs active-press h-9"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        {profile.relationship !== 'self' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProfile(profile)}
                            className="text-red-600 hover:bg-red-50 rounded-xl text-xs active-press h-9"
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
        </TabsContent>

        {/* Sharing Tab */}
        <TabsContent value="sharing" className="space-y-3">
          <Button 
            onClick={() => setShowInviteModal(true)}
            className="w-full bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl active-press shadow-lg h-11 sm:h-12"
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Family Member
          </Button>

          {shares.length === 0 ? (
            <Card className="text-center py-12 rounded-2xl">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-sm">No family shares yet</p>
            </Card>
          ) : (
            shares.map(share => (
              <Card key={share.id} className="border-2 hover:shadow-md transition-all rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#0A0A0A] text-sm truncate">{share.shared_with_user_name}</h3>
                        <Badge className={statusConfig[share.status]?.color + ' rounded-xl text-xs'}>
                          {statusConfig[share.status]?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{share.shared_with_user_email}</p>
                      <p className="text-xs text-gray-400 capitalize mt-1">{share.relationship}</p>
                    </div>
                    {share.status === 'accepted' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedShare(share);
                          setShowPermissionsModal(true);
                        }}
                        className="rounded-xl h-8 w-8"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {Object.entries(share.permissions || {}).filter(([_, val]) => val).map(([key]) => (
                      <Badge key={key} variant="outline" className="text-xs rounded-xl">
                        {permissionLabels[key]?.replace('View ', '')}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-gray-500">
                      {format(new Date(share.invited_date || share.created_date), 'MMM d, yyyy')}
                    </span>
                    {(share.status === 'accepted' || share.status === 'pending') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Revoke access?')) {
                            revokeShareMutation.mutate(share.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 h-8 rounded-xl"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Received Shares */}
        <TabsContent value="received" className="space-y-3">
          {receivedShares.length === 0 ? (
            <Card className="text-center py-12 rounded-2xl">
              <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-sm">No shared profiles</p>
            </Card>
          ) : (
            receivedShares.map(share => (
              <Card key={share.id} className="border-2 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[#0A0A0A] text-sm">Health Data Access</h3>
                      <p className="text-xs text-gray-500 capitalize">{share.relationship}</p>
                    </div>
                    <Badge className={statusConfig[share.status]?.color + ' rounded-xl'}>
                      {statusConfig[share.status]?.label}
                    </Badge>
                  </div>

                  {share.status === 'pending' && (
                    <div className="space-y-3 mt-3 p-3 bg-blue-50 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-900">
                          <p className="font-semibold mb-1">Accept sharing?</p>
                          <p>View their health information securely</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 rounded-xl h-9"
                          onClick={() => updateShareMutation.mutate({
                            id: share.id,
                            data: { status: 'accepted', accepted_date: new Date().toISOString(), consent_acknowledged: true }
                          })}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl h-9"
                          onClick={() => updateShareMutation.mutate({
                            id: share.id,
                            data: { status: 'declined' }
                          })}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  )}

                  {share.status === 'accepted' && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(share.permissions || {}).filter(([_, val]) => val).map(([key]) => (
                        <Badge key={key} variant="secondary" className="text-xs rounded-xl">
                          {permissionLabels[key]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Profile Form Modal */}
      <Dialog open={showProfileModal} onOpenChange={(open) => {
        setShowProfileModal(open);
        if (!open) {
          setSelectedProfile(null);
          resetProfileForm();
        }
      }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {selectedProfile ? 'Edit Profile' : 'Add Family Member'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProfileSubmit} className="space-y-3 sm:space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm">Full Name *</Label>
              <Input
                id="full_name"
                value={profileFormData.full_name}
                onChange={(e) => setProfileFormData({ ...profileFormData, full_name: e.target.value })}
                className="h-11 sm:h-12 rounded-2xl"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="relationship" className="text-sm">Relationship *</Label>
                <Select
                  value={profileFormData.relationship}
                  onValueChange={(value) => setProfileFormData({ ...profileFormData, relationship: value })}
                >
                  <SelectTrigger className="h-11 sm:h-12 rounded-2xl">
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
                <Label htmlFor="date_of_birth" className="text-sm">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={profileFormData.date_of_birth}
                  onChange={(e) => setProfileFormData({ ...profileFormData, date_of_birth: e.target.value })}
                  className="h-11 sm:h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm">Gender</Label>
                <Select
                  value={profileFormData.gender}
                  onValueChange={(value) => setProfileFormData({ ...profileFormData, gender: value })}
                >
                  <SelectTrigger className="h-11 sm:h-12 rounded-2xl">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blood_group" className="text-sm">Blood Group</Label>
                <Select
                  value={profileFormData.blood_group}
                  onValueChange={(value) => setProfileFormData({ ...profileFormData, blood_group: value })}
                >
                  <SelectTrigger className="h-11 sm:h-12 rounded-2xl">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProfileModal(false)}
                className="rounded-2xl active-press h-11 sm:h-12"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#0B5A46] hover:bg-[#094A38] text-white rounded-2xl active-press shadow-lg h-11 sm:h-12"
                disabled={createProfileMutation.isPending || updateProfileMutation.isPending}
              >
                {selectedProfile ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Invite Family Member</DialogTitle>
            <DialogDescription>
              Grant secure access to your health data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="John Doe"
                value={inviteData.shared_with_user_name}
                onChange={(e) => setInviteData({ ...inviteData, shared_with_user_name: e.target.value })}
                className="mt-1 h-11 rounded-2xl"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={inviteData.shared_with_user_email}
                onChange={(e) => setInviteData({ ...inviteData, shared_with_user_email: e.target.value })}
                className="mt-1 h-11 rounded-2xl"
              />
            </div>
            <div>
              <Label>Relationship</Label>
              <Select
                value={inviteData.relationship}
                onValueChange={(value) => setInviteData({ ...inviteData, relationship: value })}
              >
                <SelectTrigger className="mt-1 h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="caregiver">Caregiver</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-base font-semibold mb-3 block">Permissions</Label>
              <div className="space-y-3">
                {Object.entries(permissionLabels).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <Label htmlFor={key} className="cursor-pointer text-sm">{label}</Label>
                    <Switch
                      id={key}
                      checked={inviteData.permissions[key]}
                      onCheckedChange={(checked) => setInviteData({
                        ...inviteData,
                        permissions: { ...inviteData.permissions, [key]: checked }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-semibold mb-1">Privacy & Consent</p>
                  <p>Recipient must accept before accessing data</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowInviteModal(false)} className="flex-1 rounded-2xl">
                Cancel
              </Button>
              <Button
                onClick={() => createShareMutation.mutate(inviteData)}
                disabled={createShareMutation.isPending || !inviteData.shared_with_user_email || !inviteData.shared_with_user_name}
                className="flex-1 bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl"
              >
                {createShareMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Send'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Update access for {selectedShare?.shared_with_user_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {Object.entries(permissionLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <Label htmlFor={`edit-${key}`} className="cursor-pointer text-sm">{label}</Label>
                <Switch
                  id={`edit-${key}`}
                  checked={selectedShare?.permissions?.[key] || false}
                  onCheckedChange={(checked) => {
                    updateShareMutation.mutate({
                      id: selectedShare.id,
                      data: {
                        permissions: { ...selectedShare.permissions, [key]: checked }
                      }
                    });
                  }}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}