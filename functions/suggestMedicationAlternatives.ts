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

    const { profile_id, medication_id } = await req.json();

    // Fetch comprehensive medication data
    const [medication, profile, sideEffects, effectiveness, logs, vitals, labResults] = await Promise.all([
      base44.entities.Medication.filter({ id: medication_id }).then(m => m[0]),
      base44.entities.Profile.filter({ id: profile_id }).then(p => p[0]),
      base44.entities.SideEffect.filter({ profile_id, medication_id }),
      base44.entities.MedicationEffectiveness.filter({ profile_id, medication_id }),
      base44.entities.MedicationLog.filter({ profile_id, medication_id }, '-scheduled_time', 100),
      base44.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 50),
      base44.entities.LabResult.filter({ profile_id }, '-test_date', 50),
    ]);

    // Calculate metrics
    const adherenceRate = logs.length > 0 ? 
      (logs.filter(l => l.status === 'taken').length / logs.length * 100).toFixed(1) : 0;
    
    const avgEffectiveness = effectiveness.length > 0 ?
      (effectiveness.reduce((sum, e) => sum + e.rating, 0) / effectiveness.length).toFixed(1) : 'N/A';

    const severeSideEffects = sideEffects.filter(s => s.severity === 'severe' || s.severity === 'life_threatening');

    const prompt = `Suggest medication alternatives based on patient outcomes and data.

CURRENT MEDICATION:
- Name: ${medication.medication_name}
- Dosage: ${medication.dosage}
- Purpose: ${medication.purpose || 'Unspecified'}
- Duration: ${medication.start_date} to ${medication.end_date || 'ongoing'}

PATIENT PROFILE:
- Age: ${profile.date_of_birth ? Math.floor((new Date() - new Date(profile.date_of_birth)) / 31557600000) : 'Unknown'}
- Gender: ${profile.gender || 'Unknown'}
- Chronic Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}
- Allergies: ${profile.allergies?.join(', ') || 'None'}

CURRENT PERFORMANCE:
- Adherence Rate: ${adherenceRate}%
- Effectiveness Rating: ${avgEffectiveness}/5
- Side Effects: ${sideEffects.length} reported (${severeSideEffects.length} severe)
- Frequent Side Effects: ${sideEffects.slice(0, 3).map(s => s.symptom).join(', ')}

REASONS FOR ALTERNATIVES:
${adherenceRate < 70 ? '- Poor adherence (may need simpler regimen)' : ''}
${avgEffectiveness < 3 ? '- Low effectiveness rating' : ''}
${severeSideEffects.length > 0 ? '- Severe side effects reported' : ''}
${sideEffects.length > 5 ? '- Multiple side effects' : ''}

RECENT HEALTH DATA:
Vitals: ${vitals.slice(0, 3).map(v => `${v.vital_type}: ${v.value || `${v.systolic}/${v.diastolic}`}`).join(', ')}
Labs: ${labResults.slice(0, 3).map(l => `${l.test_name}: ${l.value} ${l.unit}`).join(', ')}

Provide evidence-based alternative recommendations FOR DOCTOR'S REVIEW:
{
  "should_consider_alternatives": boolean,
  "primary_concerns": ["string (reasons for change)"],
  "alternative_medications": [
    {
      "medication_name": "string",
      "dosage_range": "string",
      "advantages": ["string"],
      "potential_benefits": ["string"],
      "similar_effectiveness": boolean,
      "fewer_side_effects": boolean,
      "better_adherence_potential": boolean,
      "cost_comparison": "similar|higher|lower",
      "administration": "string (easier/same/more complex)",
      "contraindications": ["string"]
    }
  ],
  "dosage_adjustments": [
    {
      "current_dosage": "string",
      "suggested_dosage": "string",
      "rationale": "string",
      "expected_improvements": ["string"],
      "monitoring_needed": ["string"]
    }
  ],
  "combination_therapy_options": [
    {
      "add_medication": "string",
      "purpose": "string",
      "expected_outcome": "string"
    }
  ],
  "lifestyle_modifications": [
    {
      "modification": "string",
      "impact": "may reduce medication need|enhance effectiveness"
    }
  ],
  "next_steps": ["string (for patient and doctor)"],
  "urgent_review_needed": boolean,
  "disclaimer": "These suggestions require professional medical review and approval"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a clinical pharmacist AI providing alternative medication suggestions FOR DOCTOR'S REVIEW based on patient outcomes. Always emphasize these are suggestions requiring professional medical approval."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const suggestions = JSON.parse(response.choices[0].message.content);

    // Create insight if urgent review needed
    if (suggestions.urgent_review_needed) {
      await base44.entities.HealthInsight.create({
        profile_id,
        insight_type: 'recommendation',
        title: `💊 Medication Review Recommended: ${medication.medication_name}`,
        description: `Based on your adherence and side effects, consider discussing alternatives with your doctor.\n\nKey concerns: ${suggestions.primary_concerns.join(', ')}`,
        severity: 'medium',
        ai_confidence: 0.7,
        is_read: false,
      });
    }

    return Response.json({
      success: true,
      suggestions,
      current_medication: {
        name: medication.medication_name,
        adherence: adherenceRate,
        effectiveness: avgEffectiveness,
        side_effects_count: sideEffects.length
      }
    });

  } catch (error) {
    console.error('Medication alternatives error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});