import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id, medication_name } = await req.json();

    if (!profile_id || !medication_name) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get current medications for the profile
    const currentMeds = await base44.entities.Medication.filter({ 
      profile_id, 
      is_active: true 
    });

    const medicationList = currentMeds.map(m => m.medication_name).join(', ');

    const prompt = `You are a medical AI assistant analyzing drug interactions.

Current medications: ${medicationList}
New medication being added: ${medication_name}

Analyze potential drug interactions, contraindications, and side effects. Provide:
1. Interaction severity (none, minor, moderate, major, severe)
2. Specific interactions (which drugs interact and how)
3. Potential side effects (common and serious)
4. Recommended actions
5. Allergy considerations
6. Food/beverage interactions

Output as structured JSON.`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          overall_severity: { 
            type: "string", 
            enum: ["none", "minor", "moderate", "major", "severe"] 
          },
          interactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                drug1: { type: "string" },
                drug2: { type: "string" },
                severity: { type: "string" },
                description: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          side_effects: {
            type: "object",
            properties: {
              common: { type: "array", items: { type: "string" } },
              serious: { type: "array", items: { type: "string" } }
            }
          },
          recommendations: { type: "array", items: { type: "string" } },
          food_interactions: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Store interactions if significant
    if (analysis.interactions && analysis.interactions.length > 0) {
      for (const interaction of analysis.interactions) {
        if (interaction.severity === 'major' || interaction.severity === 'severe') {
          const med1 = currentMeds.find(m => m.medication_name.toLowerCase().includes(interaction.drug1.toLowerCase()));
          const med2_id = 'new_medication';

          if (med1) {
            await base44.entities.DrugInteraction.create({
              medication_id_1: med1.id,
              medication_id_2: med2_id,
              profile_id,
              interaction_type: interaction.severity,
              description: interaction.description,
              recommendation: interaction.recommendation,
              is_acknowledged: false
            });
          }
        }
      }
    }

    return Response.json({ analysis });
  } catch (error) {
    console.error('Error in checkDrugInteractions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});