import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Users } from 'lucide-react';

export default function ProfileSwitcher({ profiles, selectedProfile, onProfileChange }) {
  if (!profiles || profiles.length === 0) return null;

  const currentProfile = profiles.find((p) => p.id === selectedProfile) || profiles[0];

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
      <SelectContent className="bg-fuchsia-100 text-popover-foreground rounded-[14px] relative z-50 max-h-96 min-w-[8rem] overflow-hidden border shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1">
        {profiles.map((profile) =>
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
        )}
      </SelectContent>
    </Select>);

}