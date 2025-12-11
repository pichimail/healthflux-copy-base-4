import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Plus, Shield, Check, X, Eye, Clock, AlertCircle, Mail, Loader2, Settings
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
import ProfileSwitcher from '../components/ProfileSwitcher';

export default function FamilySharing() {
  const [currentProfile, setCurrentProfile] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedShare, setSelectedShare] = useState(null);
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
    },
    expires_at: null
  });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user
  });

  useEffect(() => {
    if (profiles.length > 0 && !currentProfile) {
      setCurrentProfile(profiles.find(p => p.relationship === 'self') || profiles[0]);
    }
  }, [profiles, currentProfile]);

  const { data: shares = [] } = useQuery({
    queryKey: ['familyShares', currentProfile?.id],
    queryFn: () => base44.entities.FamilyShare.filter({ shared_by_profile_id: currentProfile?.id }, '-created_date'),
    enabled: !!currentProfile?.id
  });

  const { data: receivedShares = [] } = useQuery({
    queryKey: ['receivedShares', user?.email],
    queryFn: () => base44.entities.FamilyShare.filter({ shared_with_user_email: user.email }, '-created_date'),
    enabled: !!user?.email
  });

  const createShareMutation = useMutation({
    mutationFn: (data) => base44.entities.FamilyShare.create({
      ...data,
      shared_by_profile_id: currentProfile.id,
      invited_date: new Date().toISOString(),
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyShares']);
      setShowInviteModal(false);
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
        },
        expires_at: null
      });
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
    view_insights: 'AI Insights',
    view_appointments: 'Appointments'
  };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 smooth-scroll">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Family Sharing
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">Share health data with trusted family members</p>
        </div>
        <Button 
          onClick={() => setShowInviteModal(true)}
          className="bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl font-semibold shadow-lg active-press h-11 sm:h-12 px-4 sm:px-6"
        >
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Invite</span>
        </Button>
      </div>

      {/* Profile Switcher */}
      {profiles.length > 1 && (
        <div className="mb-4">
          <ProfileSwitcher 
            profiles={profiles}
            selectedProfile={currentProfile?.id}
            onProfileChange={(id) => setCurrentProfile(profiles.find(p => p.id === id))}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6">
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <Check className="h-6 w-6 sm:h-8 sm:w-8 mb-1 sm:mb-2 text-green-500" />
            <p className="text-xl sm:text-2xl font-bold">{activeShares.length}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Active</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 mb-1 sm:mb-2 text-amber-500" />
            <p className="text-xl sm:text-2xl font-bold">{pendingShares.length}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <Eye className="h-6 w-6 sm:h-8 sm:w-8 mb-1 sm:mb-2 text-blue-500" />
            <p className="text-xl sm:text-2xl font-bold">{receivedShares.filter(s => s.status === 'accepted').length}</p>
            <p className="text-[10px] sm:text-xs text-gray-500">Viewing</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="shared" className="w-full">
        <TabsList className="w-full mb-4 sm:mb-6 rounded-2xl h-11 sm:h-12">
          <TabsTrigger value="shared" className="flex-1 rounded-xl">I'm Sharing</TabsTrigger>
          <TabsTrigger value="received" className="flex-1 rounded-xl">Shared With Me</TabsTrigger>
        </TabsList>

        <TabsContent value="shared" className="space-y-3 sm:space-y-4">
          {shares.length === 0 ? (
            <Card className="text-center py-12 sm:py-16 rounded-2xl">
              <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-[#0A0A0A] mb-2">No Family Shares Yet</h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6 px-4">
                Invite family members to securely access your health data
              </p>
              <Button onClick={() => setShowInviteModal(true)} className="rounded-2xl bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A]">
                <Plus className="h-4 w-4 mr-2" />
                Invite Family Member
              </Button>
            </Card>
          ) : (
            shares.map(share => (
              <Card key={share.id} className="border-2 hover:shadow-md transition-all rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#0A0A0A] truncate">{share.shared_with_user_name}</h3>
                        <Badge className={statusConfig[share.status]?.color + ' rounded-xl'}>
                          {statusConfig[share.status]?.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{share.shared_with_user_email}</p>
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
                        className="rounded-xl"
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

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-gray-500">
                      Invited {new Date(share.invited_date || share.created_date).toLocaleDateString()}
                    </span>
                    {(share.status === 'accepted' || share.status === 'pending') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Revoke access for this family member?')) {
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

        <TabsContent value="received" className="space-y-3 sm:space-y-4">
          {receivedShares.length === 0 ? (
            <Card className="text-center py-12 sm:py-16 rounded-2xl">
              <Mail className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-500">No one has shared their health data with you yet</p>
            </Card>
          ) : (
            receivedShares.map(share => (
              <Card key={share.id} className="border-2 rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[#0A0A0A]">Health Data Shared</h3>
                      <p className="text-sm text-gray-500 capitalize">{share.relationship}</p>
                    </div>
                    <Badge className={statusConfig[share.status]?.color + ' rounded-xl'}>
                      {statusConfig[share.status]?.label}
                    </Badge>
                  </div>

                  {share.status === 'pending' && (
                    <div className="space-y-3 mt-4 p-4 bg-blue-50 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-semibold mb-1">Accept Data Sharing?</p>
                          <p className="text-xs">You'll be able to view their health information securely.</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 rounded-xl"
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
                          className="flex-1 rounded-xl"
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
                    <div className="flex flex-wrap gap-1.5 mt-3">
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

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Invite Family Member</DialogTitle>
            <DialogDescription>
              Grant secure access to your health data with granular permissions
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
                    <Label htmlFor={key} className="cursor-pointer">{label}</Label>
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

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-semibold mb-1">Privacy & Consent</p>
                  <p className="text-xs">The recipient must accept the invitation and acknowledge consent terms before accessing any data.</p>
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
                  'Send Invitation'
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
              Update what {selectedShare?.shared_with_user_name} can access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {Object.entries(permissionLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <Label htmlFor={`edit-${key}`} className="cursor-pointer">{label}</Label>
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