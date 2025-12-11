import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      profile_id, 
      share_type, 
      resource_ids = [], 
      expires_hours = 168,
      recipient_email,
      recipient_name,
      purpose,
      send_email = false,
      access_level = 'view_only'
    } = await req.json();

    if (!profile_id || !share_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate secure token
    const token = crypto.randomUUID() + '-' + Date.now().toString(36);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expires_hours);

    // Create shareable link
    const link = await base44.asServiceRole.entities.ShareableLink.create({
      profile_id,
      link_token: token,
      share_type,
      resource_ids,
      access_level,
      expires_at: expiresAt.toISOString(),
      recipient_email,
      recipient_name,
      purpose,
      is_active: true,
      view_count: 0
    });

    // Generate share URL
    const baseUrl = req.headers.get('origin') || 'https://app.base44.com';
    const shareUrl = `${baseUrl}/share/${token}`;

    // Send email if requested
    if (send_email && recipient_email) {
      try {
        await base44.integrations.Core.SendEmail({
          to: recipient_email,
          subject: `${user.full_name || 'Someone'} shared health records with you`,
          body: `Hello${recipient_name ? ' ' + recipient_name : ''},

${user.full_name || 'A HealthFlux user'} has securely shared health information with you.

${purpose ? 'Purpose: ' + purpose + '\n\n' : ''}Access the shared records here:
${shareUrl}

This link will expire on ${new Date(expiresAt).toLocaleDateString()} at ${new Date(expiresAt).toLocaleTimeString()}.

Note: This is a secure, time-limited link. Do not share it with others.

Best regards,
HealthFlux Team`
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError);
      }
    }

    return Response.json({
      success: true,
      link_id: link.id,
      share_url: shareUrl,
      expires_at: expiresAt.toISOString(),
      message: send_email ? 'Link created and email sent' : 'Link created successfully'
    });

  } catch (error) {
    console.error('Share link creation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to create share link'
    }, { status: 500 });
  }
});