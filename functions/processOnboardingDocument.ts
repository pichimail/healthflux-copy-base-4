import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, document_type, profile_id } = await req.json();

    if (!file_url || !document_type || !profile_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const results = {
      documents_created: [],
      vitals_created: [],
      labs_created: [],
      medications_created: [],
      insurance_created: null,
      profiles_created: [],
      insights_generated: 0
    };

    // Process based on document type
    switch (document_type) {
      case 'insurance':
        // Extract and create insurance policy
        const insuranceSchema = {
          type: "object",
          properties: {
            policy_number: { type: "string" },
            provider_name: { type: "string" },
            policy_type: { type: "string" },
            coverage_start_date: { type: "string" },
            coverage_end_date: { type: "string" },
            premium_amount: { type: "number" },
            deductible: { type: "number" },
            copay: { type: "number" },
            out_of_pocket_max: { type: "number" },
            covered_services: { type: "array", items: { type: "string" } },
            excluded_services: { type: "array", items: { type: "string" } },
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

        const insuranceData = await base44.integrations.Core.InvokeLLM({
          prompt: 'Extract all health insurance policy details from this document, including covered family members.',
          file_urls: [file_url],
          response_json_schema: insuranceSchema
        });

        const insurance = await base44.asServiceRole.entities.HealthInsurance.create({
          profile_id,
          policy_number: insuranceData.policy_number || 'Unknown',
          provider_name: insuranceData.provider_name || 'Unknown',
          policy_type: insuranceData.policy_type || 'individual',
          coverage_start_date: insuranceData.coverage_start_date,
          coverage_end_date: insuranceData.coverage_end_date,
          premium_amount: insuranceData.premium_amount,
          deductible: insuranceData.deductible,
          copay: insuranceData.copay,
          out_of_pocket_max: insuranceData.out_of_pocket_max,
          covered_services: insuranceData.covered_services || [],
          excluded_services: insuranceData.excluded_services || [],
          policy_document_url: file_url,
          family_members_covered: []
        });

        results.insurance_created = insurance.id;

        // Create family profiles
        if (insuranceData.family_members) {
          for (const member of insuranceData.family_members) {
            try {
              const familyProfile = await base44.asServiceRole.entities.Profile.create({
                full_name: member.name,
                relationship: member.relationship || 'other',
                date_of_birth: member.date_of_birth
              });
              results.profiles_created.push(familyProfile.id);
            } catch (e) {
              console.error('Failed to create family profile:', e);
            }
          }
        }
        break;

      case 'lab_report':
        // Extract lab results
        const labSchema = {
          type: "array",
          items: {
            type: "object",
            properties: {
              test_name: { type: "string" },
              value: { type: "number" },
              unit: { type: "string" },
              reference_low: { type: "number" },
              reference_high: { type: "number" },
              test_date: { type: "string" }
            }
          }
        };

        const labResults = await base44.integrations.Core.InvokeLLM({
          prompt: 'Extract all lab test results from this report with their values, units, and reference ranges.',
          file_urls: [file_url],
          response_json_schema: { type: "object", properties: { results: labSchema } }
        });

        for (const lab of labResults.results || []) {
          try {
            const flag = lab.value < lab.reference_low ? 'low' : 
                        lab.value > lab.reference_high ? 'high' : 'normal';
            
            const labResult = await base44.asServiceRole.entities.LabResult.create({
              profile_id,
              test_name: lab.test_name,
              value: lab.value,
              unit: lab.unit,
              reference_low: lab.reference_low,
              reference_high: lab.reference_high,
              flag,
              test_date: lab.test_date || new Date().toISOString().split('T')[0]
            });
            results.labs_created.push(labResult.id);
          } catch (e) {
            console.error('Failed to create lab result:', e);
          }
        }
        break;

      case 'prescription':
        // Extract medications
        const medSchema = {
          type: "array",
          items: {
            type: "object",
            properties: {
              medication_name: { type: "string" },
              dosage: { type: "string" },
              frequency: { type: "string" },
              start_date: { type: "string" },
              prescriber: { type: "string" },
              purpose: { type: "string" }
            }
          }
        };

        const medications = await base44.integrations.Core.InvokeLLM({
          prompt: 'Extract all prescribed medications from this document with dosage, frequency, and prescriber information.',
          file_urls: [file_url],
          response_json_schema: { type: "object", properties: { medications: medSchema } }
        });

        for (const med of medications.medications || []) {
          try {
            const medication = await base44.asServiceRole.entities.Medication.create({
              profile_id,
              medication_name: med.medication_name,
              dosage: med.dosage,
              frequency: med.frequency || 'once_daily',
              times: ['08:00'],
              start_date: med.start_date || new Date().toISOString().split('T')[0],
              prescriber: med.prescriber,
              purpose: med.purpose,
              is_active: true,
              reminders_enabled: true
            });
            results.medications_created.push(medication.id);
          } catch (e) {
            console.error('Failed to create medication:', e);
          }
        }
        break;

      case 'health_report':
      case 'discharge_summary':
        // Extract vitals and general health info
        const healthSchema = {
          type: "object",
          properties: {
            vitals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vital_type: { type: "string" },
                  value: { type: "number" },
                  systolic: { type: "number" },
                  diastolic: { type: "number" },
                  unit: { type: "string" },
                  measured_at: { type: "string" }
                }
              }
            },
            health_summary: { type: "string" },
            conditions: { type: "array", items: { type: "string" } },
            risk_factors: { type: "array", items: { type: "string" } }
          }
        };

        const healthData = await base44.integrations.Core.InvokeLLM({
          prompt: 'Extract vital signs, health summary, diagnoses, and risk factors from this document.',
          file_urls: [file_url],
          response_json_schema: healthSchema
        });

        // Create vitals
        for (const vital of healthData.vitals || []) {
          try {
            const vitalData = {
              profile_id,
              vital_type: vital.vital_type,
              value: vital.value,
              systolic: vital.systolic,
              diastolic: vital.diastolic,
              unit: vital.unit,
              measured_at: vital.measured_at || new Date().toISOString(),
              source: 'manual'
            };
            
            const vitalResult = await base44.asServiceRole.entities.VitalMeasurement.create(vitalData);
            results.vitals_created.push(vitalResult.id);
          } catch (e) {
            console.error('Failed to create vital:', e);
          }
        }

        // Generate health insights
        if (healthData.health_summary || healthData.conditions?.length > 0) {
          try {
            const insight = await base44.asServiceRole.entities.HealthInsight.create({
              profile_id,
              insight_type: 'summary',
              title: 'Onboarding Health Summary',
              description: healthData.health_summary || 'Health information extracted from uploaded document.',
              severity: 'info',
              ai_confidence: 0.85,
              is_read: false
            });
            results.insights_generated++;
          } catch (e) {
            console.error('Failed to create insight:', e);
          }
        }
        break;
    }

    // Create medical document record
    const doc = await base44.asServiceRole.entities.MedicalDocument.create({
      profile_id,
      title: `Onboarding - ${document_type.replace(/_/g, ' ')}`,
      document_type: document_type,
      file_url: file_url,
      document_date: new Date().toISOString().split('T')[0],
      status: 'completed'
    });
    results.documents_created.push(doc.id);

    return Response.json({
      success: true,
      results,
      message: 'Document processed successfully'
    });

  } catch (error) {
    console.error('Onboarding document processing error:', error);
    return Response.json({ 
      error: error.message || 'Failed to process document'
    }, { status: 500 });
  }
});