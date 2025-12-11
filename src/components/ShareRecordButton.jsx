import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Share2, Mail, Copy, Loader2, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export default function ShareRecordButton({ profileId, shareType, resourceIds = [], buttonText = 'Share', size = 'default' }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    recipient_email: '',
    recipient_name: '',
    purpose: '',
    expires_hours: '168',
    send_email: false,
    access_level: 'view_only'
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await base44.functions.invoke('createShareLink', {
        profile_id: profileId,
        share_type: shareType,
        resource_ids: resourceIds,
        ...formData,
        expires_hours: parseInt(formData.expires_hours),
        send_email: formData.send_email
      });
      
      setShareUrl(data.share_url);
      
      if (formData.send_email) {
        alert('Link created and email sent!');
      }
    } catch (error) {
      alert('Failed to create link: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAndClose = () => {
    setOpen(false);
    setShareUrl(null);
    setFormData({
      recipient_email: '',
      recipient_name: '',
      purpose: '',
      expires_hours: '168',
      send_email: false,
      access_level: 'view_only'
    });
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size={size}
        variant="outline"
        className="rounded-2xl active-press"
      >
        <Share2 className="w-4 h-4 mr-2" />
        {buttonText}
      </Button>

      <Dialog open={open} onOpenChange={(val) => !val && resetAndClose()}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Share Health Records</DialogTitle>
          </DialogHeader>

          {!shareUrl ? (
            <div className="space-y-4 py-4">
              <div>
                <Label>Recipient Name (Optional)</Label>
                <Input
                  placeholder="Dr. Smith"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  className="h-11 rounded-2xl mt-1"
                />
              </div>

              <div>
                <Label>Recipient Email (Optional)</Label>
                <Input
                  type="email"
                  placeholder="doctor@clinic.com"
                  value={formData.recipient_email}
                  onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                  className="h-11 rounded-2xl mt-1"
                />
              </div>

              <div>
                <Label>Purpose</Label>
                <Textarea
                  placeholder="Why are you sharing this?"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="rounded-2xl mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label>Link Expires In</Label>
                <Select
                  value={formData.expires_hours}
                  onValueChange={(value) => setFormData({ ...formData, expires_hours: value })}
                >
                  <SelectTrigger className="h-11 rounded-2xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 Hours</SelectItem>
                    <SelectItem value="72">3 Days</SelectItem>
                    <SelectItem value="168">1 Week</SelectItem>
                    <SelectItem value="720">1 Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <Label htmlFor="send-email" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Send via email</span>
                  </div>
                </Label>
                <Switch
                  id="send-email"
                  checked={formData.send_email}
                  onCheckedChange={(val) => setFormData({ ...formData, send_email: val })}
                />
              </div>

              <Button
                onClick={handleCreate}
                disabled={creating}
                className="w-full bg-[#9BB4FF] hover:bg-[#8BA4EE] text-[#0A0A0A] rounded-2xl h-11"
              >
                {creating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  'Create Secure Link'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-green-50 rounded-2xl border-2 border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-green-900">Link Created!</p>
                </div>
                <div className="p-3 bg-white rounded-xl mb-3">
                  <p className="text-xs text-gray-700 break-all">{shareUrl}</p>
                </div>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="w-full rounded-2xl"
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-2" />Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" />Copy Link</>
                  )}
                </Button>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <p className="font-semibold mb-1">Link expires in {formData.expires_hours}h</p>
                    <p>Share this link securely. Access will be tracked.</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={resetAndClose}
                className="w-full bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white rounded-2xl h-11"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}