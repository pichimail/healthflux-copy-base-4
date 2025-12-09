import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, profile_id } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    // Fetch all health data for context
    const vitals = await base44.asServiceRole.entities.VitalMeasurement.filter(
      { profile_id }, '-measured_at', 50
    );
    const labs = await base44.asServiceRole.entities.LabResult.filter(
      { profile_id }, '-test_date', 50
    );
    const medications = await base44.asServiceRole.entities.Medication.filter(
      { profile_id, is_active: true }
    );
    const insights = await base44.asServiceRole.entities.HealthInsight.filter(
      { profile_id }, '-created_date', 10
    );
    const profile = await base44.asServiceRole.entities.Profile.filter({ id: profile_id });

    const context = `
Patient Profile:
- Name: ${profile[0]?.full_name}
- Age: ${profile[0]?.date_of_birth ? new Date().getFullYear() - new Date(profile[0].date_of_birth).getFullYear() : 'Unknown'}
- Blood Group: ${profile[0]?.blood_group || 'Unknown'}
- Allergies: ${profile[0]?.allergies?.join(', ') || 'None'}
- Chronic Conditions: ${profile[0]?.chronic_conditions?.join(', ') || 'None'}

Recent Vitals:
${vitals.slice(0, 10).map(v => `- ${v.vital_type}: ${v.value || v.systolic + '/' + v.diastolic} ${v.unit} (${new Date(v.measured_at).toLocaleDateString()})`).join('\n')}

Recent Lab Results:
${labs.slice(0, 10).map(l => `- ${l.test_name}: ${l.value} ${l.unit} [${l.flag}] (${new Date(l.test_date).toLocaleDateString()})`).join('\n')}

Current Medications:
${medications.map(m => `- ${m.medication_name} ${m.dosage} - ${m.frequency}`).join('\n')}

Recent Health Insights:
${insights.slice(0, 5).map(i => `- ${i.title}: ${i.description}`).join('\n')}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful health assistant analyzing personal health records. Use the provided health data to answer questions accurately. Always remind users to consult healthcare professionals for medical advice.`
          },
          {
            role: 'user',
            content: `Health Data:\n${context}\n\nQuestion: ${question}`
          }
        ]
      })
    });

    const data = await response.json();
    const answer = data.choices[0].message.content;

    return Response.json({
      success: true,
      answer,
      context_used: {
        vitals_count: vitals.length,
        labs_count: labs.length,
        medications_count: medications.length
      }
    });
  } catch (error) {
    console.error('AI health chat error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});