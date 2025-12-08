import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, User, Heart } from 'lucide-react';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    height: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await base44.auth.me();
      
      await base44.entities.Profile.create({
        ...formData,
        relationship: 'self',
        height: formData.height ? parseFloat(formData.height) : undefined,
      });

      window.location.href = createPageUrl('Dashboard');
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Welcome to HealthFlux
          </h1>
          <p className="text-slate-600 text-lg">Let's set up your health profile</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-12 h-2 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-slate-200'}`} />
            <div className={`w-12 h-2 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-slate-200'}`} />
            <div className={`w-12 h-2 rounded-full ${step >= 3 ? 'bg-blue-500' : 'bg-slate-200'}`} />
          </div>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">
              {step === 1 && 'Basic Information'}
              {step === 2 && 'Health Details'}
              {step === 3 && 'Almost Done!'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Tell us about yourself'}
              {step === 2 && 'A few more health details'}
              {step === 3 && 'Review and confirm'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      placeholder="Enter your full name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Date of Birth *</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        required
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender *</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => setFormData({ ...formData, gender: value })}
                        required
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    disabled={!formData.full_name || !formData.date_of_birth || !formData.gender}
                  >
                    Continue
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="blood_group">Blood Group</Label>
                      <Select
                        value={formData.blood_group}
                        onValueChange={(value) => setFormData({ ...formData, blood_group: value })}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                        <SelectContent>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                            <SelectItem key={group} value={group}>{group}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        placeholder="e.g., 170"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 h-12"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    >
                      Continue
                    </Button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="text-sm text-slate-600">Name</p>
                        <p className="font-medium">{formData.full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Heart className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="text-sm text-slate-600">Date of Birth</p>
                        <p className="font-medium">{formData.date_of_birth}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="text-sm text-slate-600">Gender</p>
                        <p className="font-medium capitalize">{formData.gender}</p>
                      </div>
                    </div>
                    {formData.blood_group && (
                      <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-slate-600" />
                        <div>
                          <p className="text-sm text-slate-600">Blood Group</p>
                          <p className="font-medium">{formData.blood_group}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1 h-12"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    >
                      {loading ? 'Creating Profile...' : 'Complete Setup'}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}