import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, Plus, FileText, DollarSign, Calendar, AlertCircle, 
  CheckCircle, Clock, Upload, MessageSquare, TrendingUp, Phone, Mail, Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ProfileSwitcher from '../components/ProfileSwitcher';
import { format, differenceInDays } from 'date-fns';

export default function Insurance() {
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [chatting, setChatting] = useState(false);

  const [costEstimate, setCostEstimate] = useState(null);
  const [costInput, setCostInput] = useState({
    procedure: '',
    estimated_cost: '',
    policy_id: ''
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

  const { data: policies = [] } = useQuery({
    queryKey: ['insurance', selectedProfileId],
    queryFn: () => selectedProfileId ? 
      base44.entities.HealthInsurance.filter({ profile_id: selectedProfileId }, '-created_date') : [],
    enabled: !!selectedProfileId
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['claims', selectedProfileId],
    queryFn: () => selectedProfileId ?
      base44.entities.InsuranceClaim.filter({ profile_id: selectedProfileId }, '-claim_date') : [],
    enabled: !!selectedProfileId
  });

  React.useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      const self = profiles.find(p => p.relationship === 'self');
      setSelectedProfileId(self?.id || profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const uploadPolicyMutation = useMutation({
    mutationFn: async (file) => {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const { data } = await base44.functions.invoke('processInsuranceDocument', {
        file_url,
        profile_id: selectedProfileId
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['insurance']);
      setUploading(false);
      alert('Policy processed successfully!');
    },
    onError: () => {
      setUploading(false);
      alert('Failed to process policy document');
    }
  });

  const calculateCostMutation = useMutation({
    mutationFn: async (data) => {
      setCalculating(true);
      const result = await base44.functions.invoke('calculateInsuranceCost', data);
      return result.data;
    },
    onSuccess: (data) => {
      setCostEstimate(data);
      setCalculating(false);
    },
    onError: () => {
      setCalculating(false);
      alert('Failed to calculate cost');
    }
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadPolicyMutation.mutate(file);
    }
  };

  const handleCostCalculate = () => {
    if (!costInput.procedure || !costInput.estimated_cost || !costInput.policy_id) {
      alert('Fill all fields');
      return;
    }
    calculateCostMutation.mutate({
      ...costInput,
      estimated_cost: parseFloat(costInput.estimated_cost)
    });
  };

  const handlePolicyChat = async () => {
    if (!chatInput.trim() || !selectedPolicy) return;
    
    setChatting(true);
    const userMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    try {
      const { data } = await base44.functions.invoke('insurancePolicyChat', {
        policy_id: selectedPolicy.id,
        question: chatInput
      });
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Failed to get answer. Try again.' }]);
    } finally {
      setChatting(false);
    }
  };

  const activePolicy = policies.find(p => {
    const endDate = new Date(p.coverage_end_date);
    return endDate > new Date();
  });

  const expiringPolicies = policies.filter(p => {
    const endDate = new Date(p.coverage_end_date);
    const daysUntil = differenceInDays(endDate, new Date());
    return daysUntil > 0 && daysUntil <= 30;
  });

  const statusConfig = {
    submitted: { color: 'bg-blue-100 text-blue-800', icon: Clock },
    processing: { color: 'bg-amber-100 text-amber-800', icon: Clock },
    approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejected: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
    paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
  };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6 smooth-scroll">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
          🛡️ Health Insurance
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Manage policies and claims</p>
        
        {profiles.length > 0 && (
          <ProfileSwitcher
            profiles={profiles}
            selectedProfile={selectedProfileId}
            onProfileChange={setSelectedProfileId}
          />
        )}
      </div>

      {/* Renewal Alerts */}
      {expiringPolicies.length > 0 && (
        <Card className="mb-4 border-0 bg-amber-50 border-amber-200 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 text-sm mb-1">Policy Renewal Due</h3>
                {expiringPolicies.map(p => (
                  <p key={p.id} className="text-xs text-amber-800">
                    {p.provider_name} expires in {differenceInDays(new Date(p.coverage_end_date), new Date())} days
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <label htmlFor="policy-upload" className="cursor-pointer">
          <div className="rounded-2xl p-4 h-24 sm:h-28 flex flex-col relative bg-[#9BB4FF] hover:bg-[#8BA4EE] active-press card-shadow">
            <div className="text-xs text-[#0A0A0A] mb-1 opacity-90">Upload</div>
            <div className="text-sm sm:text-base font-semibold text-[#0A0A0A] mt-auto">
              Policy Doc
            </div>
            <div className="absolute bottom-4 right-4 w-8 h-8 bg-white/90 rounded-xl flex items-center justify-center">
              <Upload className="w-4 h-4 text-[#0A0A0A]" />
            </div>
          </div>
          <input
            id="policy-upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>

        <div
          onClick={() => setShowCostModal(true)}
          className="rounded-2xl p-4 h-24 sm:h-28 flex flex-col relative bg-[#F7C9A3] hover:bg-[#E7B993] cursor-pointer active-press card-shadow"
        >
          <div className="text-xs text-[#0A0A0A] mb-1 opacity-90">Estimate</div>
          <div className="text-sm sm:text-base font-semibold text-[#0A0A0A] mt-auto">
            Cost
          </div>
          <div className="absolute bottom-4 right-4 w-8 h-8 bg-white/90 rounded-xl flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-[#0A0A0A]" />
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="policies" className="w-full">
        <TabsList className="w-full mb-4 rounded-2xl h-11 sm:h-12">
          <TabsTrigger value="policies" className="flex-1 rounded-xl">Policies</TabsTrigger>
          <TabsTrigger value="claims" className="flex-1 rounded-xl">Claims</TabsTrigger>
          <TabsTrigger value="coverage" className="flex-1 rounded-xl">Coverage</TabsTrigger>
        </TabsList>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-3">
          {uploading && (
            <Card className="border-2 rounded-2xl">
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Processing document...</p>
              </CardContent>
            </Card>
          )}

          {policies.length === 0 ? (
            <Card className="text-center py-12 rounded-2xl">
              <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4 text-sm">No insurance policies</p>
            </Card>
          ) : (
            policies.map(policy => {
              const isActive = new Date(policy.coverage_end_date) > new Date();
              const daysUntilExpiry = differenceInDays(new Date(policy.coverage_end_date), new Date());
              
              return (
                <Card key={policy.id} className="border-2 rounded-2xl hover:shadow-md transition-all">
                  <CardHeader className="border-b p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-bold mb-1">{policy.provider_name}</CardTitle>
                        <p className="text-xs text-gray-500">{policy.policy_number}</p>
                      </div>
                      <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {isActive ? 'Active' : 'Expired'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-[#F4F4F2] rounded-xl">
                        <p className="text-xs text-gray-600 mb-1">Type</p>
                        <p className="text-sm font-semibold capitalize">{policy.policy_type}</p>
                      </div>
                      <div className="p-3 bg-[#F4F4F2] rounded-xl">
                        <p className="text-xs text-gray-600 mb-1">Premium</p>
                        <p className="text-sm font-semibold">${policy.premium_amount?.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-[#F4F4F2] rounded-xl">
                        <p className="text-xs text-gray-600 mb-1">Deductible</p>
                        <p className="text-sm font-semibold">${policy.deductible?.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-[#F4F4F2] rounded-xl">
                        <p className="text-xs text-gray-600 mb-1">Max OOP</p>
                        <p className="text-sm font-semibold">${policy.out_of_pocket_max?.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <div className="flex-1 text-xs">
                        <p className="text-blue-900">
                          Coverage until {format(new Date(policy.coverage_end_date), 'MMM d, yyyy')}
                        </p>
                        {isActive && daysUntilExpiry <= 60 && (
                          <p className="text-blue-700 font-semibold">{daysUntilExpiry} days remaining</p>
                        )}
                      </div>
                    </div>

                    {policy.insurer_contact_details && (
                      <div className="space-y-2 pt-2 border-t">
                        {policy.insurer_contact_details.phone && (
                          <div className="flex items-center gap-2 text-xs">
                            <Phone className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-700">{policy.insurer_contact_details.phone}</span>
                          </div>
                        )}
                        {policy.insurer_contact_details.email && (
                          <div className="flex items-center gap-2 text-xs">
                            <Mail className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-700">{policy.insurer_contact_details.email}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        setSelectedPolicy(policy);
                        setChatMessages([]);
                        setShowChatModal(true);
                      }}
                      variant="outline"
                      className="w-full rounded-2xl active-press"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Ask about policy
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims" className="space-y-3">
          <Button 
            onClick={() => setShowClaimModal(true)}
            className="w-full bg-[#E9F46A] hover:bg-[#D9E45A] text-[#0A0A0A] rounded-2xl active-press shadow-lg h-11"
          >
            <Plus className="w-4 h-4 mr-2" />
            File Claim
          </Button>

          {claims.length === 0 ? (
            <Card className="text-center py-12 rounded-2xl">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-sm">No claims filed</p>
            </Card>
          ) : (
            claims.map(claim => {
              const config = statusConfig[claim.status];
              const StatusIcon = config.icon;
              
              return (
                <Card key={claim.id} className="border-2 rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{claim.service_description}</h3>
                        <p className="text-xs text-gray-500">{claim.claim_number}</p>
                      </div>
                      <Badge className={config.color + ' flex items-center gap-1'}>
                        <StatusIcon className="h-3 w-3" />
                        {claim.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-[#F4F4F2] rounded-xl">
                        <p className="text-xs text-gray-600">Total Bill</p>
                        <p className="text-sm font-bold">${claim.total_bill_amount?.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-[#F4F4F2] rounded-xl">
                        <p className="text-xs text-gray-600">Your Cost</p>
                        <p className="text-sm font-bold">${claim.patient_responsibility?.toLocaleString()}</p>
                      </div>
                    </div>

                    {claim.rejection_reason && (
                      <div className="mt-3 p-2 bg-red-50 rounded-xl border border-red-200">
                        <p className="text-xs text-red-800">{claim.rejection_reason}</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-3">
                      Filed {format(new Date(claim.claim_date), 'MMM d, yyyy')}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Coverage Tab */}
        <TabsContent value="coverage" className="space-y-3">
          {!activePolicy ? (
            <Card className="text-center py-12 rounded-2xl">
              <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-sm">No active policy</p>
            </Card>
          ) : (
            <>
              {activePolicy.covered_services && activePolicy.covered_services.length > 0 && (
                <Card className="border-2 rounded-2xl">
                  <CardHeader className="border-b p-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Covered Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {activePolicy.covered_services.map((service, idx) => (
                        <Badge key={idx} className="bg-green-100 text-green-800 rounded-xl">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activePolicy.excluded_services && activePolicy.excluded_services.length > 0 && (
                <Card className="border-2 rounded-2xl">
                  <CardHeader className="border-b p-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Not Covered
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {activePolicy.excluded_services.map((service, idx) => (
                        <Badge key={idx} className="bg-red-100 text-red-800 rounded-xl">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activePolicy.claims_process_description && (
                <Card className="border-2 rounded-2xl">
                  <CardHeader className="border-b p-4">
                    <CardTitle className="text-base">How to File Claims</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-700">{activePolicy.claims_process_description}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Cost Calculator Modal */}
      <Dialog open={showCostModal} onOpenChange={setShowCostModal}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Cost Estimator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Procedure/Service</Label>
              <Input
                placeholder="e.g., MRI Scan, Surgery"
                value={costInput.procedure}
                onChange={(e) => setCostInput({ ...costInput, procedure: e.target.value })}
                className="mt-1 h-11 rounded-2xl"
              />
            </div>
            <div>
              <Label>Estimated Cost ($)</Label>
              <Input
                type="number"
                placeholder="5000"
                value={costInput.estimated_cost}
                onChange={(e) => setCostInput({ ...costInput, estimated_cost: e.target.value })}
                className="mt-1 h-11 rounded-2xl"
              />
            </div>
            <div>
              <Label>Insurance Policy</Label>
              <Select
                value={costInput.policy_id}
                onValueChange={(value) => setCostInput({ ...costInput, policy_id: value })}
              >
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Select policy" />
                </SelectTrigger>
                <SelectContent>
                  {policies.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.provider_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCostCalculate}
              disabled={calculating}
              className="w-full bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-2xl h-11"
            >
              {calculating ? 'Calculating...' : 'Calculate'}
            </Button>

            {costEstimate && (
              <div className="space-y-3 pt-4 border-t">
                <div className="p-4 bg-blue-50 rounded-2xl">
                  <p className="text-xs text-blue-700 mb-1">Estimated Total Cost</p>
                  <p className="text-2xl font-bold text-blue-900">${costEstimate.total_cost?.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <p className="text-xs text-green-700">Insurance Pays</p>
                    <p className="text-lg font-bold text-green-900">${costEstimate.insurance_pays?.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <p className="text-xs text-amber-700">You Pay</p>
                    <p className="text-lg font-bold text-amber-900">${costEstimate.patient_pays?.toLocaleString()}</p>
                  </div>
                </div>
                {costEstimate.breakdown && (
                  <div className="p-3 bg-[#F4F4F2] rounded-xl text-xs space-y-1">
                    {costEstimate.breakdown.split('\n').map((line, idx) => (
                      <p key={idx} className="text-gray-700">{line}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Policy Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col p-0 rounded-3xl">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Policy Questions</DialogTitle>
            <p className="text-xs text-gray-600 mt-1">Ask about {selectedPolicy?.provider_name}</p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-[#9BB4FF] text-[#0A0A0A]' 
                    : 'bg-[#F4F4F2] text-gray-800'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatting && (
              <div className="flex justify-start">
                <div className="bg-[#F4F4F2] p-3 rounded-2xl">
                  <div className="animate-pulse text-sm text-gray-600">Thinking...</div>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about coverage, claims, etc..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePolicyChat()}
                className="rounded-2xl"
              />
              <Button
                onClick={handlePolicyChat}
                disabled={chatting || !chatInput.trim()}
                className="bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-2xl"
              >
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}