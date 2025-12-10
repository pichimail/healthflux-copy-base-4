import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, Users, Mail, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

export default function AdminNotifications() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    recipient_email: '',
    recipient_group: 'all',
    type: 'system',
    title: '',
    message: '',
    priority: 'medium',
    action_url: '',
    send_email: false,
  });

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

  const { data: notifications = [] } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => base44.asServiceRole.entities.Notification.list('-created_date', 100),
    enabled: !checking,
  });

  const handleSend = async () => {
    setSending(true);
    try {
      await base44.functions.invoke('sendNotification', formData);
      queryClient.invalidateQueries(['admin-notifications']);
      setDialogOpen(false);
      setFormData({
        recipient_email: '',
        recipient_group: 'all',
        type: 'system',
        title: '',
        message: '',
        priority: 'medium',
        action_url: '',
        send_email: false,
      });
    } catch (error) {
      console.error('Send error:', error);
      alert('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  if (checking) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>;
  }

  const totalSent = notifications.length;
  const emailsSent = notifications.filter(n => n.email_sent).length;
  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <AdminLayout currentPageName="AdminNotifications">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Notifications</h1>
            <p className="text-slate-600">Send targeted notifications to users</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4 mr-2" />
            Send Notification
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Sent</p>
                  <p className="text-3xl font-bold text-slate-900">{totalSent}</p>
                </div>
                <Bell className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Emails Sent</p>
                  <p className="text-3xl font-bold text-slate-900">{emailsSent}</p>
                </div>
                <Mail className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Unread</p>
                  <p className="text-3xl font-bold text-slate-900">{unread}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {notifications.slice(0, 50).map((notif) => (
                <div key={notif.id} className="p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={
                          notif.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                          notif.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          notif.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {notif.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{notif.type}</Badge>
                        {notif.email_sent && <Mail className="w-4 h-4 text-green-600" />}
                      </div>
                      <p className="font-semibold text-slate-900">{notif.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500 ml-4">
                      <p>{format(new Date(notif.created_date), 'MMM d, yyyy')}</p>
                      <p>{format(new Date(notif.created_date), 'h:mm a')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    {notif.recipient_email && <p>To: {notif.recipient_email}</p>}
                    {notif.recipient_group && <p>Group: {notif.recipient_group}</p>}
                    {!notif.is_read && <Badge variant="outline" className="text-xs">Unread</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={formData.recipient_group} onValueChange={(v) => setFormData({...formData, recipient_group: v, recipient_email: ''})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="admins">Admins Only</SelectItem>
                    <SelectItem value="premium">Premium Subscribers</SelectItem>
                    <SelectItem value="free">Free Users</SelectItem>
                    <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Specific Email (Optional)</Label>
                <Input 
                  type="email"
                  placeholder="user@example.com"
                  value={formData.recipient_email} 
                  onChange={(e) => setFormData({...formData, recipient_email: e.target.value})} 
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} rows={4} required />
              </div>

              <div className="space-y-2">
                <Label>Action URL (Optional)</Label>
                <Input value={formData.action_url} onChange={(e) => setFormData({...formData, action_url: e.target.value})} placeholder="https://..." />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
                <Label>Also send via email</Label>
                <Switch checked={formData.send_email} onCheckedChange={(v) => setFormData({...formData, send_email: v})} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSend} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={sending || !formData.title || !formData.message}>
                  {sending ? 'Sending...' : 'Send Notification'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}