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

    const { profile_id, medication_name, dosage } = await req.json();

    // Fetch user health data for context
    const [profile, sideEffects, medications, vitals, labResults] = await Promise.all([
      base44.entities.Profile.filter({ id: profile_id }).then(p => p[0]),
      base44.entities.SideEffect.filter({ profile_id }, '-onset_time', 100),
      base44.entities.Medication.filter({ profile_id, is_active: true }),
      base44.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 50),
      base44.entities.LabResult.filter({ profile_id }, '-test_date', 50),
    ]);

    // Analyze historical side effects
    const medicationHistory = {};
    sideEffects.forEach(se => {
      const med = medications.find(m => m.id === se.medication_id);
      if (med) {
        if (!medicationHistory[med.medication_name]) {
          medicationHistory[med.medication_name] = [];
        }
        medicationHistory[med.medication_name].push({
          symptom: se.symptom,
          severity: se.severity,
          onset_time: se.onset_time
        });
      }
    });

    const prompt = `Predict potential side effects for this medication based on patient data.

PATIENT PROFILE:
- Age: ${profile.date_of_birth ? Math.floor((new Date() - new Date(profile.date_of_birth)) / 31557600000) : 'Unknown'}
- Gender: ${profile.gender || 'Unknown'}
- Chronic Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}
- Allergies: ${profile.allergies?.join(', ') || 'None'}

NEW MEDICATION:
- Name: ${medication_name}
- Dosage: ${dosage}

CURRENT MEDICATIONS (${medications.length}):
${medications.map(m => `- ${m.medication_name} (${m.dosage})`).join('\n') || 'None'}

SIDE EFFECT HISTORY:
${Object.entries(medicationHistory).map(([med, effects]) => 
  `${med}: ${effects.length} effects reported (${effects.filter(e => e.severity === 'severe').length} severe)`
).join('\n') || 'No history'}

RECENT VITALS:
${vitals.slice(0, 5).map(v => `- ${v.vital_type}: ${v.value || `${v.systolic}/${v.diastolic}`}`).join('\n') || 'None'}

RECENT LAB RESULTS:
${labResults.slice(0, 5).map(l => `- ${l.test_name}: ${l.value} ${l.unit} (${l.flag})`).join('\n') || 'None'}

Provide evidence-based side effect predictions:
{
  "common_side_effects": [
    {
      "symptom": "string",
      "likelihood": "high|medium|low",
      "severity": "mild|moderate|severe",
      "description": "string",
      "onset_timeframe": "string",
      "management_tips": ["string"]
    }
  ],
  "patient_specific_risks": [
    {
      "risk": "string",
      "reason": "based on conditions/allergies/history",
      "likelihood": "high|medium|low",
      "precautions": ["string"]
    }
  ],
  "interaction_related_effects": [
    {
      "effect": "string",
      "interacting_medication": "string",
      "severity": "major|moderate|minor",
      "monitoring_needed": "string"
    }
  ],
  "early_warning_signs": [
    {
      "sign": "string",
      "urgency": "immediate|urgent|monitor",
      "action": "string"
    }
  ],
  "monitoring_recommendations": {
    "vitals_to_track": ["string"],
    "frequency": "daily|weekly|monthly",
    "red_flags": ["string"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a clinical pharmacology AI specializing in predicting medication side effects based on patient history and health data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const predictions = JSON.parse(response.choices[0].message.content);

    // Create health insights for high-risk predictions
    const highRiskEffects = [
      ...(predictions.common_side_effects?.filter(e => e.likelihood === 'high' && e.severity === 'severe') || []),
      ...(predictions.patient_specific_risks?.filter(r => r.likelihood === 'high') || [])
    ];

    if (highRiskEffects.length > 0) {
      await base44.entities.HealthInsight.create({
        profile_id,
        insight_type: 'alert',
        title: `⚠️ High-Risk Side Effects: ${medication_name}`,
        description: `${highRiskEffects.length} high-risk side effects predicted. Please review before starting this medication.`,
        severity: 'high',
        ai_confidence: 0.75,
        is_read: false,
      });
    }

    return Response.json({
      success: true,
      predictions,
      risk_level: highRiskEffects.length > 0 ? 'high' : 
                  predictions.patient_specific_risks?.length > 0 ? 'medium' : 'low'
    });

  } catch (error) {
    console.error('Side effect prediction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});