import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url, profile_id } = body;

    if (!file_url || !profile_id) {
      return Response.json({ error: 'File URL and profile ID required' }, { status: 400 });
    }

    const prompt = `You are a medical AI assistant. Extract all medication information from this prescription or medication label image.

For each medication identified, extract:
- Medication name (generic and brand if available)
- Dosage (e.g., 500mg, 10mg)
- Frequency (e.g., once daily, twice daily, three times daily, as needed)
- Route of administration (e.g., oral, topical)
- Instructions (e.g., take with food, take at bedtime)
- Prescriber name (if visible)
- Refills remaining (if visible)
- Any special warnings or notes

Respond ONLY with valid JSON (no markdown):
{
  "medications": [
    {
      "medication_name": "name",
      "dosage": "dosage",
      "frequency": "once_daily|twice_daily|three_times_daily|four_times_daily|as_needed",
      "route": "oral|topical|injection|other",
      "instructions": "full instructions",
      "prescriber": "doctor name",
      "refills_remaining": number or null,
      "warnings": "any warnings",
      "suggested_times": ["08:00", "20:00"]
    }
  ],
  "confidence": 0-100,
  "extraction_notes": "any issues or uncertainties"
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          medications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                medication_name: { type: 'string' },
                dosage: { type: 'string' },
                frequency: { type: 'string' },
                route: { type: 'string' },
                instructions: { type: 'string' },
                prescriber: { type: 'string' },
                refills_remaining: { type: ['number', 'null'] },
                warnings: { type: 'string' },
                suggested_times: { type: 'array', items: { type: 'string' } }
              },
              required: ['medication_name', 'dosage', 'frequency']
            }
          },
          confidence: { type: 'number' },
          extraction_notes: { type: 'string' }
        },
        required: ['medications', 'confidence']
      }
    });

    // Check for drug interactions with existing medications
    const existingMeds = await base44.entities.Medication.filter({
      profile_id,
      is_active: true
    });

    let interactionWarnings = [];
    if (existingMeds.length > 0 && response.medications.length > 0) {
      const newMedNames = response.medications.map(m => m.medication_name).join(', ');
      const existingMedNames = existingMeds.map(m => m.medication_name);

      const interactionCheck = await base44.integrations.Core.InvokeLLM({
        prompt: `Check for drug interactions between these NEW medications: ${newMedNames}
        
And these EXISTING medications: ${existingMedNames.join(', ')}

Respond with JSON array of interactions (empty array if none):
[
  {
    "new_medication": "name",
    "existing_medication": "name",
    "severity": "major|moderate|minor",
    "description": "interaction description"
  }
]`,
        response_json_schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              new_medication: { type: 'string' },
              existing_medication: { type: 'string' },
              severity: { type: 'string' },
              description: { type: 'string' }
            }
          }
        }
      });

      interactionWarnings = interactionCheck;
    }

    return Response.json({
      success: true,
      ...response,
      interaction_warnings: interactionWarnings,
      extracted_count: response.medications.length
    });

  } catch (error) {
    console.error('Medication extraction error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});