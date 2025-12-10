import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipient_email, recipient_group, type, title, message, priority, action_url, send_email } = await req.json();

    // Determine recipients
    let recipients = [];
    if (recipient_email) {
      recipients = [recipient_email];
    } else if (recipient_group) {
      const allUsers = await base44.asServiceRole.entities.User.list();
      
      switch (recipient_group) {
        case 'all':
          recipients = allUsers.map(u => u.email);
          break;
        case 'admins':
          recipients = allUsers.filter(u => u.role === 'admin').map(u => u.email);
          break;
        case 'premium':
        case 'free':
        case 'expiring_soon':
          const subscriptions = await base44.asServiceRole.entities.Subscription.list();
          if (recipient_group === 'premium') {
            const premiumSubs = subscriptions.filter(s => s.status === 'active');
            recipients = premiumSubs.map(s => s.user_email);
          } else if (recipient_group === 'free') {
            const activeEmails = new Set(subscriptions.filter(s => s.status === 'active').map(s => s.user_email));
            recipients = allUsers.filter(u => !activeEmails.has(u.email)).map(u => u.email);
          } else if (recipient_group === 'expiring_soon') {
            const now = new Date();
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;
            recipients = subscriptions
              .filter(s => s.status === 'active' && new Date(s.end_date) - now < thirtyDays)
              .map(s => s.user_email);
          }
          break;
      }
    }

    // Create notifications
    const notifications = [];
    for (const email of recipients) {
      const notification = await base44.asServiceRole.entities.Notification.create({
        recipient_email: email,
        recipient_group: recipient_group || null,
        type,
        title,
        message,
        priority: priority || 'medium',
        action_url: action_url || null,
        send_email: send_email || false,
        email_sent: false,
        is_read: false,
      });
      notifications.push(notification);

      // Send email if requested
      if (send_email) {
        try {
          // Check user preferences
          const prefs = await base44.asServiceRole.entities.UserPreferences.filter({ user_email: email });
          const emailEnabled = prefs.length === 0 || prefs[0].notifications?.email_enabled !== false;
          
          if (emailEnabled) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: email,
              from_name: 'HealthFlux',
              subject: title,
              body: `${message}\n\n${action_url ? `Take action: ${action_url}` : ''}\n\nYou can manage notification preferences in your account settings.`,
            });
            
            await base44.asServiceRole.entities.Notification.update(notification.id, {
              email_sent: true,
            });
          }
        } catch (emailError) {
          console.error('Email error:', emailError);
        }
      }
    }

    return Response.json({
      success: true,
      notifications_created: notifications.length,
      recipients: recipients.length,
    });

  } catch (error) {
    console.error('Send notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});