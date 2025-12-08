import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id, file_url, document_type, profile_id } = await req.json();

    if (!document_id || !file_url) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extract data from document
    const extractionPrompt = `Analyze this medical document and extract structured health data.
Focus on:
- Lab test results with values and reference ranges
- Vital signs measurements
- Medications and dosages
- Diagnoses and conditions
- Health scores or risk factors

Return a JSON object with extracted data.`;

    let extractedData = null;
    try {
      extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            lab_results: {
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
            },
            vitals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vital_type: { type: "string" },
                  value: { type: "number" },
                  unit: { type: "string" },
                  measured_at: { type: "string" }
                }
              }
            },
            health_score: { type: "number" },
            risk_factors: { type: "array", items: { type: "string" } }
          }
        }
      });
    } catch (error) {
      console.log('Extraction failed, generating summary only');
    }

    // Generate AI summary
    const summaryPrompt = `Analyze this medical ${document_type} document and provide:
1. A brief summary (2-3 sentences)
2. Key findings
3. Any concerning values or recommendations

File URL: ${file_url}

Be concise and medical professional in tone.`;

    const summary = await base44.integrations.Core.InvokeLLM({
      prompt: summaryPrompt,
      file_urls: [file_url]
    });

    // Update document with AI summary
    await base44.asServiceRole.entities.MedicalDocument.update(document_id, {
      ai_summary: summary,
      status: 'processed'
    });

    // Create lab results if extracted
    if (extractedData?.output?.lab_results) {
      for (const lab of extractedData.output.lab_results) {
        const flag = lab.value < lab.reference_low ? 'low' : 
                     lab.value > lab.reference_high ? 'high' : 'normal';
        
        await base44.asServiceRole.entities.LabResult.create({
          profile_id,
          document_id,
          test_name: lab.test_name,
          value: lab.value,
          unit: lab.unit,
          reference_low: lab.reference_low,
          reference_high: lab.reference_high,
          flag,
          test_date: lab.test_date || new Date().toISOString().slice(0, 10)
        });
      }
    }

    // Generate health insights for abnormal values
    if (extractedData?.output?.risk_factors && extractedData.output.risk_factors.length > 0) {
      for (const risk of extractedData.output.risk_factors) {
        await base44.asServiceRole.entities.HealthInsight.create({
          profile_id,
          insight_type: 'risk_assessment',
          title: 'Potential Health Risk Identified',
          description: risk,
          severity: 'medium',
          data_source: [document_id],
          ai_confidence: 0.8,
          is_read: false
        });
      }
    }

    return Response.json({
      success: true,
      document_id,
      summary,
      extracted_data: extractedData?.output || null
    });
  } catch (error) {
    console.error('AI processing error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});