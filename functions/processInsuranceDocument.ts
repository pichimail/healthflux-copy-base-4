import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, profile_id } = await req.json();

    if (!file_url || !profile_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extract insurance data from document using AI
    const extractionSchema = {
      type: "object",
      properties: {
        policy_number: { type: "string" },
        provider_name: { type: "string" },
        policy_type: { 
          type: "string",
          enum: ["individual", "family", "group", "government"]
        },
        coverage_start_date: { type: "string" },
        coverage_end_date: { type: "string" },
        renewal_date: { type: "string" },
        premium_amount: { type: "number" },
        deductible: { type: "number" },
        copay: { type: "number" },
        out_of_pocket_max: { type: "number" },
        covered_services: {
          type: "array",
          items: { type: "string" }
        },
        excluded_services: {
          type: "array",
          items: { type: "string" }
        },
        waiting_periods: { type: "object" },
        insurer_contact: {
          type: "object",
          properties: {
            phone: { type: "string" },
            email: { type: "string" },
            website: { type: "string" }
          }
        },
        claims_process: { type: "string" },
        family_members: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              relationship: { type: "string" },
              date_of_birth: { type: "string" }
            }
          }
        }
      }
    };

    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract health insurance policy details from this document. Include all available information about coverage, costs, contacts, and covered family members.`,
      file_urls: [file_url],
      response_json_schema: extractionSchema
    });

    // Create insurance policy record
    const insuranceData = {
      profile_id,
      policy_number: extractionResult.policy_number || 'Unknown',
      provider_name: extractionResult.provider_name || 'Unknown Provider',
      policy_type: extractionResult.policy_type || 'individual',
      coverage_start_date: extractionResult.coverage_start_date,
      coverage_end_date: extractionResult.coverage_end_date,
      renewal_date: extractionResult.renewal_date,
      premium_amount: extractionResult.premium_amount,
      deductible: extractionResult.deductible,
      copay: extractionResult.copay,
      out_of_pocket_max: extractionResult.out_of_pocket_max,
      covered_services: extractionResult.covered_services || [],
      excluded_services: extractionResult.excluded_services || [],
      waiting_periods: extractionResult.waiting_periods || {},
      policy_document_url: file_url,
      insurer_contact_details: extractionResult.insurer_contact || {},
      claims_process_description: extractionResult.claims_process,
      family_members_covered: []
    };

    const insurance = await base44.asServiceRole.entities.HealthInsurance.create(insuranceData);

    // Create family member profiles if found
    if (extractionResult.family_members && extractionResult.family_members.length > 0) {
      const familyProfileIds = [];
      
      for (const member of extractionResult.family_members) {
        try {
          const profile = await base44.asServiceRole.entities.Profile.create({
            full_name: member.name,
            relationship: member.relationship || 'other',
            date_of_birth: member.date_of_birth
          });
          familyProfileIds.push(profile.id);
        } catch (error) {
          console.error('Failed to create family profile:', error);
        }
      }

      if (familyProfileIds.length > 0) {
        await base44.asServiceRole.entities.HealthInsurance.update(insurance.id, {
          family_members_covered: familyProfileIds
        });
      }
    }

    return Response.json({
      success: true,
      insurance,
      message: 'Insurance policy processed successfully'
    });

  } catch (error) {
    console.error('Insurance processing error:', error);
    return Response.json({ 
      error: error.message || 'Failed to process insurance document'
    }, { status: 500 });
  }
});