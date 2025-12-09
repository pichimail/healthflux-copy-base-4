import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    // Fetch all health data
    const vitals = await base44.asServiceRole.entities.VitalMeasurement.filter(
      { profile_id }, '-measured_at', 100
    );
    const labs = await base44.asServiceRole.entities.LabResult.filter(
      { profile_id }, '-test_date', 100
    );
    const medications = await base44.asServiceRole.entities.Medication.filter(
      { profile_id, is_active: true }
    );
    const profile = await base44.asServiceRole.entities.Profile.filter({ id: profile_id });

    // Prepare data for AI
    const vitalsData = vitals.map(v => ({
      type: v.vital_type,
      value: v.value || `${v.systolic}/${v.diastolic}`,
      date: v.measured_at
    }));

    const labsData = labs.map(l => ({
      test: l.test_name,
      value: l.value,
      unit: l.unit,
      flag: l.flag,
      date: l.test_date
    }));

    const prompt = `As a health analytics AI, analyze this patient's historical data and provide:

1. TREND PREDICTIONS: Based on the last 3-6 months of data, predict likely trends for the next 3 months
2. RISK ASSESSMENT: Identify potential health risks based on patterns
3. PROACTIVE RECOMMENDATIONS: Suggest preventive actions
4. HEALTH SCORE: Overall health score (0-100) with breakdown

Patient Profile:
- Age: ${profile[0]?.date_of_birth ? new Date().getFullYear() - new Date(profile[0].date_of_birth).getFullYear() : 'Unknown'}
- Gender: ${profile[0]?.gender || 'Unknown'}
- Chronic Conditions: ${profile[0]?.chronic_conditions?.join(', ') || 'None'}

Vitals History (last 100): ${JSON.stringify(vitalsData)}

Lab Results History (last 100): ${JSON.stringify(labsData)}

Current Medications: ${medications.map(m => m.medication_name).join(', ')}

Return JSON with: predictions (array), risk_factors (array), recommendations (array), health_score (number), score_breakdown (object)`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a medical AI analyzing health trends and making predictions.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    // Create health insights for predictions
    if (analysis.predictions) {
      for (const pred of analysis.predictions) {
        await base44.asServiceRole.entities.HealthInsight.create({
          profile_id,
          insight_type: 'trend_analysis',
          title: pred.title || 'Health Trend Prediction',
          description: pred.description || pred.text || pred,
          severity: pred.severity || 'low',
          data_source: [],
          ai_confidence: pred.confidence || 0.8,
          is_read: false
        });
      }
    }

    // Create risk assessment insights
    if (analysis.risk_factors) {
      for (const risk of analysis.risk_factors) {
        await base44.asServiceRole.entities.HealthInsight.create({
          profile_id,
          insight_type: 'risk_assessment',
          title: risk.title || 'Potential Health Risk',
          description: risk.description || risk.text || risk,
          severity: risk.severity || 'medium',
          data_source: [],
          ai_confidence: risk.confidence || 0.75,
          is_read: false
        });
      }
    }

    return Response.json({
      success: true,
      ...analysis
    });
  } catch (error) {
    console.error('Health predictions error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});