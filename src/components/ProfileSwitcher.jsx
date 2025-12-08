import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Users } from 'lucide-react';

export default function ProfileSwitcher({ profiles, selectedProfile, onProfileChange }) {
  if (!profiles || profiles.length === 0) return null;
  
  const currentProfile = profiles.find(p => p.id === selectedProfile) || profiles[0];
  
  return (
    <Select value={selectedProfile} onValueChange={onProfileChange}>
      <SelectTrigger className="w-full sm:w-64 bg-white/80 backdrop-blur border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs">
              {currentProfile?.full_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm font-medium">{currentProfile?.full_name}</p>
            <p className="text-xs text-slate-500 capitalize">{currentProfile?.relationship}</p>
          </div>
        </div>
      </SelectTrigger>
      <SelectContent>
        {profiles.map((profile) => (
          <SelectItem key={profile.id} value={profile.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs">
                  {profile.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{profile.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{profile.relationship}</p>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}