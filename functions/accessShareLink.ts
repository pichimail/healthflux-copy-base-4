import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 });
    }

    // Get shareable link
    const links = await base44.asServiceRole.entities.ShareableLink.filter({ link_token: token });
    
    if (links.length === 0) {
      return Response.json({ error: 'Link not found' }, { status: 404 });
    }

    const link = links[0];

    // Check if active
    if (!link.is_active) {
      return Response.json({ error: 'Link has been deactivated' }, { status: 403 });
    }

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return Response.json({ error: 'Link has expired' }, { status: 403 });
    }

    // Check view limit
    if (link.max_views && link.view_count >= link.max_views) {
      return Response.json({ error: 'Link view limit reached' }, { status: 403 });
    }

    // Get shared data based on type
    let sharedData = {};
    
    if (link.share_type === 'document') {
      const docs = await Promise.all(
        link.resource_ids.map(id => base44.asServiceRole.entities.MedicalDocument.filter({ id }))
      );
      sharedData.documents = docs.flat();
    } else if (link.share_type === 'profile_summary') {
      const profiles = await base44.asServiceRole.entities.Profile.filter({ id: link.profile_id });
      const vitals = await base44.asServiceRole.entities.VitalMeasurement.filter({ profile_id: link.profile_id }, '-measured_at', 10);
      const meds = await base44.asServiceRole.entities.Medication.filter({ profile_id: link.profile_id, is_active: true });
      
      sharedData.profile = profiles[0];
      sharedData.recent_vitals = vitals;
      sharedData.active_medications = meds;
    } else if (link.share_type === 'vitals') {
      const vitals = await Promise.all(
        link.resource_ids.map(id => base44.asServiceRole.entities.VitalMeasurement.filter({ id }))
      );
      sharedData.vitals = vitals.flat();
    } else if (link.share_type === 'labs') {
      const labs = await Promise.all(
        link.resource_ids.map(id => base44.asServiceRole.entities.LabResult.filter({ id }))
      );
      sharedData.labs = labs.flat();
    }

    // Track access
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await base44.asServiceRole.entities.ShareLinkAccess.create({
      link_id: link.id,
      accessed_at: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      action: 'viewed'
    });

    // Update view count and last accessed
    await base44.asServiceRole.entities.ShareableLink.update(link.id, {
      view_count: link.view_count + 1,
      last_accessed_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      share_type: link.share_type,
      access_level: link.access_level,
      data: sharedData,
      expires_at: link.expires_at,
      shared_by: {
        name: link.recipient_name
      }
    });

  } catch (error) {
    console.error('Share link access error:', error);
    return Response.json({ 
      error: error.message || 'Failed to access shared link'
    }, { status: 500 });
  }
});