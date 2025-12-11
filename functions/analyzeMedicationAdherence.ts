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

    // Fetch comprehensive medication data
    const [medications, logs, sideEffects, effectiveness, interactions, vitals] = await Promise.all([
      base44.entities.Medication.filter({ profile_id, is_active: true }),
      base44.entities.MedicationLog.filter({ profile_id }, '-scheduled_time', 200),
      base44.entities.SideEffect.filter({ profile_id }, '-onset_time', 50),
      base44.entities.MedicationEffectiveness.filter({ profile_id }, '-recorded_at', 50),
      base44.entities.DrugInteraction.filter({ profile_id, is_acknowledged: false }),
      base44.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 100),
    ]);

    // Calculate adherence per medication
    const adherenceByMed = medications.map(med => {
      const medLogs = logs.filter(l => l.medication_id === med.id);
      const taken = medLogs.filter(l => l.status === 'taken').length;
      const skipped = medLogs.filter(l => l.status === 'skipped').length;
      const total = medLogs.length;
      const adherenceRate = total > 0 ? ((taken / total) * 100).toFixed(1) : 0;

      const medSideEffects = sideEffects.filter(s => s.medication_id === med.id);
      const medEffectiveness = effectiveness.filter(e => e.medication_id === med.id);
      const avgEffectiveness = medEffectiveness.length > 0 ?
        (medEffectiveness.reduce((sum, e) => sum + e.rating, 0) / medEffectiveness.length).toFixed(1) : null;

      return {
        medication: med,
        adherenceRate,
        taken,
        skipped,
        total,
        sideEffects: medSideEffects,
        effectiveness: avgEffectiveness,
      };
    });

    const prompt = `Analyze medication adherence patterns and provide personalized strategies.

MEDICATIONS (${medications.length}):
${adherenceByMed.map(m => `
- ${m.medication.medication_name} (${m.medication.dosage})
  Purpose: ${m.medication.purpose || 'Unspecified'}
  Adherence: ${m.adherenceRate}% (${m.taken} taken, ${m.skipped} skipped of ${m.total})
  Side Effects: ${m.sideEffects.length} reported (${m.sideEffects.filter(s => s.severity === 'severe').length} severe)
  Effectiveness: ${m.effectiveness || 'Not rated'}/5
`).join('\n')}

DRUG INTERACTIONS (${interactions.length} unacknowledged):
${interactions.map(i => `- ${i.interaction_type}: ${i.description}`).join('\n') || 'None'}

RECENT SKIP REASONS:
${logs.filter(l => l.status === 'skipped' && l.reason).slice(0, 10).map(l => `- ${l.reason}`).join('\n') || 'None'}

Provide comprehensive analysis:
{
  "overall_adherence": number (0-100),
  "adherence_category": "excellent|good|fair|poor",
  "medication_insights": [
    {
      "medication_name": "string",
      "adherence_rate": number,
      "concerns": ["potential issues"],
      "effectiveness_assessment": "string",
      "recommendations": ["specific strategies"]
    }
  ],
  "adherence_barriers": [
    {
      "barrier": "string",
      "frequency": "high|medium|low",
      "suggested_solutions": ["string"]
    }
  ],
  "personalized_strategies": [
    {
      "strategy": "string",
      "implementation": "string",
      "expected_impact": "high|medium|low"
    }
  ],
  "drug_interaction_alerts": [
    {
      "medications": ["string"],
      "severity": "major|moderate|minor",
      "explanation": "string",
      "action_required": "string"
    }
  ],
  "side_effect_management": [
    {
      "medication": "string",
      "side_effect": "string",
      "management_tips": ["string"]
    }
  ],
  "timing_recommendations": [
    {
      "medication": "string",
      "optimal_time": "string",
      "rationale": "string"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a clinical pharmacist AI specializing in medication adherence optimization and drug interaction analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    // Create health insights for critical findings
    const insightsToCreate = [];

    // Critical drug interactions
    if (analysis.drug_interaction_alerts) {
      for (const alert of analysis.drug_interaction_alerts) {
        if (alert.severity === 'major') {
          insightsToCreate.push({
            profile_id,
            insight_type: 'alert',
            title: `⚠️ Major Drug Interaction: ${alert.medications.join(' & ')}`,
            description: `${alert.explanation}\n\nAction Required: ${alert.action_required}`,
            severity: 'high',
            ai_confidence: 0.85,
            is_read: false,
          });
        }
      }
    }

    // Poor adherence alerts
    if (analysis.overall_adherence < 70) {
      insightsToCreate.push({
        profile_id,
        insight_type: 'recommendation',
        title: `💊 Medication Adherence Needs Attention`,
        description: `Your overall adherence is ${analysis.overall_adherence}%. ${analysis.personalized_strategies[0]?.strategy || 'Consider setting up medication reminders.'}`,
        severity: 'medium',
        ai_confidence: 0.8,
        is_read: false,
      });
    }

    if (insightsToCreate.length > 0) {
      await base44.entities.HealthInsight.bulkCreate(insightsToCreate);
    }

    return Response.json({
      success: true,
      analysis,
      insights_created: insightsToCreate.length,
      data_summary: {
        medications_analyzed: medications.length,
        logs_reviewed: logs.length,
        interactions_found: interactions.length,
        overall_adherence: analysis.overall_adherence
      }
    });

  } catch (error) {
    console.error('Medication adherence analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});