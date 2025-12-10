import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Specific email to make admin
    const adminEmail = 'pichimail24@gmail.com';

    // Find user by email
    const users = await base44.asServiceRole.entities.User.filter({ email: adminEmail });

    if (users.length === 0) {
      return Response.json({ 
        success: false,
        message: `User with email ${adminEmail} not found. They need to register first.` 
      }, { status: 404 });
    }

    const user = users[0];

    // Update user role to admin
    await base44.asServiceRole.entities.User.update(user.id, {
      role: 'admin'
    });

    return Response.json({
      success: true,
      message: `Successfully granted admin access to ${adminEmail}`,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Error making admin:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});