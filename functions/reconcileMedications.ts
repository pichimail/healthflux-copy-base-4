import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { profile_id, medications } = body;

    if (!profile_id || !medications || medications.length === 0) {
      return Response.json({ error: 'Profile ID and medications required' }, { status: 400 });
    }

    // Get profile details for context
    const profiles = await base44.entities.Profile.filter({ id: profile_id });
    const profile = profiles[0];

    // Get existing side effects for context
    const sideEffects = await base44.entities.SideEffect.filter({ profile_id }, '-onset_time', 50);

    // Prepare medication list for AI
    const medicationList = medications.map(med => ({
      id: med.id,
      name: med.medication_name,
      dosage: med.dosage,
      frequency: med.frequency,
      purpose: med.purpose,
      prescriber: med.prescriber,
      start_date: med.start_date
    }));

    // Build comprehensive prompt
    const prompt = `You are a clinical pharmacist AI assistant performing medication reconciliation.

PATIENT PROFILE:
${profile.allergies?.length > 0 ? `Allergies: ${profile.allergies.join(', ')}` : 'No known allergies'}
${profile.chronic_conditions?.length > 0 ? `Conditions: ${profile.chronic_conditions.join(', ')}` : 'No chronic conditions listed'}

CURRENT MEDICATIONS:
${medicationList.map((m, i) => `${i + 1}. ${m.name} ${m.dosage} - ${m.frequency} (Purpose: ${m.purpose || 'Not specified'})`).join('\n')}

${sideEffects.length > 0 ? `RECENT SIDE EFFECTS:\n${sideEffects.slice(0, 5).map(se => `- ${se.symptom} (${se.severity}) from medication`).join('\n')}` : ''}

TASK: Perform comprehensive medication reconciliation and provide:

1. DUPLICATE MEDICATIONS: Identify any duplicate or therapeutically equivalent medications
2. CONFLICTING DOSAGES: Flag medications with unusual or conflicting dosage/frequency patterns
3. DRUG INTERACTIONS: Identify potential drug-drug interactions (major and moderate)
4. ALLERGY CONFLICTS: Check if any medications conflict with known allergies
5. OPTIMIZATION OPPORTUNITIES: Suggest ways to simplify the regimen (e.g., combination pills, timing adjustments)
6. CONSOLIDATED LIST: Provide an optimized medication list
7. PHARMACIST REVIEW NOTES: Summarize key issues requiring professional review

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "duplicates": [
    {
      "medications": ["med1", "med2"],
      "reason": "therapeutic equivalents",
      "recommendation": "consider discontinuing one",
      "severity": "high|medium|low"
    }
  ],
  "conflicts": [
    {
      "medication": "name",
      "issue": "description",
      "recommendation": "suggested action",
      "severity": "high|medium|low"
    }
  ],
  "interactions": [
    {
      "medications": ["med1", "med2"],
      "interaction_type": "major|moderate|minor",
      "description": "description",
      "recommendation": "clinical recommendation"
    }
  ],
  "allergy_alerts": [
    {
      "medication": "name",
      "allergen": "allergen",
      "risk": "description"
    }
  ],
  "optimizations": [
    {
      "current": "description",
      "suggested": "improvement",
      "benefit": "why this helps"
    }
  ],
  "consolidated_list": [
    {
      "medication": "name",
      "dosage": "dosage",
      "frequency": "frequency",
      "timing": "specific times",
      "notes": "any notes"
    }
  ],
  "pharmacist_summary": "brief summary of critical issues",
  "risk_score": 0-100,
  "requires_immediate_review": true|false
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          duplicates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                medications: { type: 'array', items: { type: 'string' } },
                reason: { type: 'string' },
                recommendation: { type: 'string' },
                severity: { type: 'string' }
              }
            }
          },
          conflicts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                medication: { type: 'string' },
                issue: { type: 'string' },
                recommendation: { type: 'string' },
                severity: { type: 'string' }
              }
            }
          },
          interactions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                medications: { type: 'array', items: { type: 'string' } },
                interaction_type: { type: 'string' },
                description: { type: 'string' },
                recommendation: { type: 'string' }
              }
            }
          },
          allergy_alerts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                medication: { type: 'string' },
                allergen: { type: 'string' },
                risk: { type: 'string' }
              }
            }
          },
          optimizations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                current: { type: 'string' },
                suggested: { type: 'string' },
                benefit: { type: 'string' }
              }
            }
          },
          consolidated_list: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                medication: { type: 'string' },
                dosage: { type: 'string' },
                frequency: { type: 'string' },
                timing: { type: 'string' },
                notes: { type: 'string' }
              }
            }
          },
          pharmacist_summary: { type: 'string' },
          risk_score: { type: 'number' },
          requires_immediate_review: { type: 'boolean' }
        },
        required: ['duplicates', 'conflicts', 'interactions', 'pharmacist_summary', 'risk_score']
      }
    });

    return Response.json({
      success: true,
      reconciliation: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Medication reconciliation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});