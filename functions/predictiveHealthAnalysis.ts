import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id } = await req.json();

    // Check subscription access
    const subscriptions = await base44.entities.Subscription.filter({ 
      user_email: user.email,
      status: 'active'
    });

    let hasPredictiveAccess = false;
    if (subscriptions.length > 0) {
      const packageId = subscriptions[0].package_id;
      const packages = await base44.entities.SubscriptionPackage.filter({ id: packageId });
      if (packages.length > 0 && packages[0].predictive_analytics_enabled) {
        hasPredictiveAccess = true;
      }
    }

    if (!hasPredictiveAccess && user.role !== 'admin') {
      return Response.json({
        error: 'Upgrade required',
        message: 'Predictive analytics requires a premium subscription'
      }, { status: 403 });
    }

    // Fetch comprehensive health data
    const [profile, vitals, labs, medications, sideEffects, documents] = await Promise.all([
      base44.entities.Profile.filter({ id: profile_id }).then(p => p[0]),
      base44.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 200),
      base44.entities.LabResult.filter({ profile_id }, '-test_date', 100),
      base44.entities.Medication.filter({ profile_id }),
      base44.entities.SideEffect.filter({ profile_id }, '-onset_time', 50),
      base44.entities.MedicalDocument.filter({ profile_id }, '-created_date', 50),
    ]);

    // Calculate trends
    const vitalTrends = calculateVitalTrends(vitals);
    const labTrends = calculateLabTrends(labs);
    const medicationPatterns = analyzeMedicationPatterns(medications, sideEffects);

    // Build comprehensive prompt
    const prompt = `You are an advanced health analytics AI. Analyze this patient's comprehensive health data and provide predictive insights.

PATIENT PROFILE:
- Age: ${profile.date_of_birth ? Math.floor((new Date() - new Date(profile.date_of_birth)) / 31557600000) : 'Unknown'}
- Blood Type: ${profile.blood_group || 'Unknown'}
- Chronic Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}
- Known Allergies: ${profile.allergies?.join(', ') || 'None'}

VITAL TRENDS (${vitals.length} measurements):
${vitalTrends}

LAB RESULTS TRENDS (${labs.length} tests):
${labTrends}

MEDICATIONS (${medications.length} active):
${medications.map(m => `- ${m.medication_name} (${m.dosage}) for ${m.purpose || 'unspecified'}`).join('\n')}

MEDICATION PATTERNS:
${medicationPatterns}

SIDE EFFECTS (${sideEffects.length} reported):
${sideEffects.slice(0, 10).map(s => `- ${s.symptom} (${s.severity}) from ${medications.find(m => m.id === s.medication_id)?.medication_name || 'unknown'}`).join('\n')}

Based on this comprehensive data, provide:
1. RISK ASSESSMENT: Identify top 3-5 potential health risks based on current trends
2. PREDICTIVE INSIGHTS: What health issues might develop in the next 3-12 months
3. PREVENTIVE RECOMMENDATIONS: Specific actions to prevent identified risks
4. OPTIMIZATION OPPORTUNITIES: Areas where health management can be improved
5. EARLY WARNING SIGNS: Symptoms or changes to watch for
6. LIFESTYLE RECOMMENDATIONS: Diet, exercise, sleep recommendations
7. MEDICATION OPTIMIZATION: Suggestions for medication management

Format as JSON with this structure:
{
  "risk_score": 0-100,
  "risk_factors": [{"factor": "name", "severity": "low|medium|high|critical", "description": "...", "likelihood": "low|medium|high"}],
  "predictions": [{"condition": "name", "timeframe": "3-6 months", "probability": "low|medium|high", "rationale": "..."}],
  "preventive_actions": [{"action": "...", "priority": "high|medium|low", "impact": "description"}],
  "optimization_opportunities": [{"area": "...", "current_issue": "...", "recommendation": "..."}],
  "early_warnings": [{"symptom": "...", "urgency": "monitor|consult|urgent", "action": "..."}],
  "lifestyle_recommendations": {"diet": [...], "exercise": [...], "sleep": [...], "stress": [...]},
  "medication_insights": [{"medication": "...", "insight": "...", "recommendation": "..."}]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an advanced healthcare AI specializing in predictive health analytics and personalized wellness recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    // Create high-priority health insights
    if (analysis.risk_factors) {
      const criticalRisks = analysis.risk_factors.filter(r => r.severity === 'critical' || r.severity === 'high');
      for (const risk of criticalRisks) {
        await base44.entities.HealthInsight.create({
          profile_id,
          insight_type: 'alert',
          title: `Health Risk Detected: ${risk.factor}`,
          description: risk.description,
          severity: risk.severity,
          ai_confidence: risk.likelihood === 'high' ? 0.8 : 0.6,
          is_read: false,
        });
      }
    }

    return Response.json({
      success: true,
      analysis,
      data_points: {
        vitals: vitals.length,
        labs: labs.length,
        medications: medications.length,
        documents: documents.length,
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Predictive analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateVitalTrends(vitals) {
  const byType = {};
  vitals.forEach(v => {
    if (!byType[v.vital_type]) byType[v.vital_type] = [];
    byType[v.vital_type].push(v);
  });

  let trends = '';
  for (const [type, data] of Object.entries(byType)) {
    const recent = data.slice(0, 10);
    if (type === 'blood_pressure') {
      const avgSys = recent.reduce((s, v) => s + v.systolic, 0) / recent.length;
      const avgDia = recent.reduce((s, v) => s + v.diastolic, 0) / recent.length;
      trends += `- Blood Pressure: Avg ${Math.round(avgSys)}/${Math.round(avgDia)} (${recent.length} readings)\n`;
    } else {
      const avg = recent.reduce((s, v) => s + v.value, 0) / recent.length;
      trends += `- ${type.replace(/_/g, ' ')}: Avg ${avg.toFixed(1)} ${recent[0]?.unit || ''} (${recent.length} readings)\n`;
    }
  }
  return trends || 'No vital trends available';
}

function calculateLabTrends(labs) {
  const byTest = {};
  labs.forEach(l => {
    if (!byTest[l.test_name]) byTest[l.test_name] = [];
    byTest[l.test_name].push(l);
  });

  let trends = '';
  for (const [test, data] of Object.entries(byTest)) {
    const recent = data.slice(0, 5);
    const avg = recent.reduce((s, l) => s + l.value, 0) / recent.length;
    const abnormal = recent.filter(l => l.flag !== 'normal').length;
    trends += `- ${test}: Avg ${avg.toFixed(2)} ${recent[0]?.unit || ''} (${abnormal}/${recent.length} abnormal)\n`;
  }
  return trends || 'No lab trends available';
}

function analyzeMedicationPatterns(medications, sideEffects) {
  const activeCount = medications.filter(m => m.is_active).length;
  const sideEffectCount = sideEffects.length;
  const severeEffects = sideEffects.filter(s => s.severity === 'severe' || s.severity === 'life_threatening').length;
  
  return `- Active medications: ${activeCount}
- Total side effects reported: ${sideEffectCount}
- Severe side effects: ${severeEffects}
- Medications with side effects: ${new Set(sideEffects.map(s => s.medication_id)).size}`;
}