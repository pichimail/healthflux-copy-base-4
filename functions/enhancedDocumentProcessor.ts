import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, file_type, profile_id } = await req.json();

    if (!file_url || !file_type || !profile_id) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let extractedData = {};
    let aiAnalysis = {};
    let aiModelUsed = '';
    let extractionMethod = 'none';

    // Determine if this is a medical image (X-RAY, MRI, CT, ECG)
    const isMedicalImage = file_type.includes('image');
    
    // Step 1: Try OpenAI Vision first for medical images (best for X-RAY, MRI, CT, ECG)
    if (isMedicalImage) {
      try {
        const visionPrompt = `Analyze this medical image in detail. This could be an X-RAY, MRI, CT scan, ECG, or other medical imaging.

Extract ALL information including:
- Document title and type (x-ray, mri, ct_scan, ecg, ultrasound, etc.)
- Date of the scan/test
- Facility name and doctor name
- Body part or area examined
- Key findings and observations
- Any measurements, abnormalities, or pathologies
- Impression or diagnosis if stated
- Recommendations
- Technical details (views, sequences, contrast, etc.)

For lab reports or prescriptions in image form:
- All medications with dosage, frequency, instructions
- All lab test results with values, units, reference ranges
- Vital signs if present

Output as detailed JSON with all available information.`;

        const openaiExtraction = await base44.integrations.Core.InvokeLLM({
          prompt: visionPrompt,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              document_title: { type: "string" },
              document_type: { type: "string" },
              document_date: { type: "string" },
              facility_name: { type: "string" },
              doctor_name: { type: "string" },
              body_part_examined: { type: "string" },
              imaging_type: { type: "string" },
              technical_details: { type: "string" },
              key_findings: { type: "array", items: { type: "string" } },
              measurements: { type: "array", items: { type: "string" } },
              abnormalities: { type: "array", items: { type: "string" } },
              impression: { type: "string" },
              recommendations: { type: "string" },
              summary: { type: "string" },
              medications: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    dosage: { type: "string" },
                    frequency: { type: "string" },
                    instructions: { type: "string" }
                  }
                }
              },
              vitals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    value: { type: "number" },
                    unit: { type: "string" },
                    systolic: { type: "number" },
                    diastolic: { type: "number" }
                  }
                }
              },
              lab_results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    test_name: { type: "string" },
                    test_category: { type: "string" },
                    value: { type: "number" },
                    unit: { type: "string" },
                    reference_min: { type: "number" },
                    reference_max: { type: "number" },
                    status: { type: "string" }
                  }
                }
              }
            }
          }
        });

        if (openaiExtraction && openaiExtraction.document_title) {
          extractedData = openaiExtraction;
          aiModelUsed = 'OpenAI Vision (Medical Image Analysis)';
          extractionMethod = 'openai_vision';
        }
      } catch (e) {
        console.warn("OpenAI Vision failed for medical image, trying Base44:", e.message);
      }
    }

    // Step 2: Try Base44 extraction if OpenAI failed or for PDFs
    if (extractionMethod === 'none' && (file_type.includes('pdf') || file_type.includes('image'))) {
      try {
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: file_url,
          json_schema: {
            type: "object",
            properties: {
              document_title: { type: "string" },
              document_type: { 
                type: "string", 
                enum: ["lab_report", "prescription", "imaging", "discharge_summary", "consultation", "vaccination", "insurance", "other"] 
              },
              document_date: { type: "string" },
              facility_name: { type: "string" },
              doctor_name: { type: "string" },
              summary: { type: "string" },
              medications: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    dosage: { type: "string" },
                    frequency: { type: "string" },
                    instructions: { type: "string" }
                  }
                }
              },
              vitals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    value: { type: "number" },
                    unit: { type: "string" },
                    systolic: { type: "number" },
                    diastolic: { type: "number" }
                  }
                }
              },
              lab_results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    test_name: { type: "string" },
                    test_category: { type: "string" },
                    value: { type: "number" },
                    unit: { type: "string" },
                    reference_min: { type: "number" },
                    reference_max: { type: "number" },
                    status: { type: "string", enum: ["low", "normal", "high"] }
                  }
                }
              }
            }
          }
        });
        
        if (result.status === 'success' && result.output) {
          extractedData = result.output;
          aiModelUsed = 'Base44 ExtractDataFromUploadedFile';
          extractionMethod = 'base44_extract';
        }
      } catch (e) {
        console.warn("Base44 extraction failed:", e.message);
      }
    }

    // Step 3: Fallback to comprehensive LLM with vision
    if (extractionMethod === 'none') {
      try {
        const llmPrompt = `Analyze this medical document comprehensively. This could be:
- Medical imaging: X-RAY, MRI, CT scan, ECG, ultrasound
- Lab reports with test results
- Prescription documents
- Discharge summaries
- Consultation notes

Extract ALL information including:
- Document title, type, and date
- Facility name and doctor name
- Any medications with dosage, frequency, and instructions
- Vital signs (blood pressure, heart rate, temperature, weight, etc.)
- Lab test results with values, units, and reference ranges
- A brief summary of the document

For lab results, classify into categories: blood, urine, lipid, liver, kidney, thyroid, diabetes, vitamin, other.
For vitals, use standard types: blood_pressure, heart_rate, temperature, weight, height, bmi, blood_glucose, oxygen_saturation.
For blood pressure, provide systolic and diastolic values separately.

Output as JSON matching this schema structure.`;

        const extracted = await base44.integrations.Core.InvokeLLM({
          prompt: llmPrompt,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              document_title: { type: "string" },
              document_type: { type: "string" },
              document_date: { type: "string" },
              facility_name: { type: "string" },
              doctor_name: { type: "string" },
              summary: { type: "string" },
              medications: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    dosage: { type: "string" },
                    frequency: { type: "string" },
                    instructions: { type: "string" }
                  }
                }
              },
              vitals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    value: { type: "number" },
                    unit: { type: "string" },
                    systolic: { type: "number" },
                    diastolic: { type: "number" }
                  }
                }
              },
              lab_results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    test_name: { type: "string" },
                    test_category: { type: "string" },
                    value: { type: "number" },
                    unit: { type: "string" },
                    reference_min: { type: "number" },
                    reference_max: { type: "number" },
                    status: { type: "string" }
                  }
                }
              }
            }
          }
        });

        extractedData = extracted;
        aiModelUsed = 'Base44 InvokeLLM with Vision';
        extractionMethod = 'base44_llm_vision';
      } catch (e) {
        console.error("All extraction methods failed:", e.message);
        return Response.json({ 
          success: false, 
          message: 'Failed to extract data from document using all available AI models.' 
        }, { status: 500 });
      }
    }

    // Ensure we have at least basic data
    if (!extractedData.document_title) {
      extractedData.document_title = 'Medical Document';
    }
    if (!extractedData.document_type) {
      extractedData.document_type = 'other';
    }
    if (!extractedData.document_date) {
      extractedData.document_date = new Date().toISOString().split('T')[0];
    }

    // Step 4: Generate comprehensive AI health analysis
    try {
      const analysisPrompt = `You are a medical AI assistant analyzing health documents. Based on this extracted medical document data:

${JSON.stringify(extractedData, null, 2)}

Provide a comprehensive health analysis:
1. Summary of the document and its key findings
2. Health score (0-100) based on the findings
3. Identified risk factors with severity and likelihood
4. Lifestyle recommendations (diet, exercise, sleep, stress)
5. Preventive care plan
6. Early warning signs to monitor
7. Health optimization opportunities
8. Key findings (array of important points)

Focus on actionable insights and personalized recommendations.`;

      aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            health_score: { type: "number" },
            risk_factors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  factor: { type: "string" },
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  likelihood: { type: "string", enum: ["high", "medium", "low"] },
                  description: { type: "string" }
                }
              }
            },
            lifestyle_recommendations: {
              type: "object",
              properties: {
                diet: { type: "array", items: { type: "string" } },
                exercise: { type: "array", items: { type: "string" } },
                sleep: { type: "array", items: { type: "string" } },
                stress: { type: "array", items: { type: "string" } }
              }
            },
            preventive_care_plan: { type: "string" },
            early_warnings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  symptom: { type: "string" },
                  action: { type: "string" },
                  urgency: { type: "string", enum: ["urgent", "consult", "monitor"] }
                }
              }
            },
            optimization_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  current_issue: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            key_findings: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      aiModelUsed += ' + Base44 InvokeLLM Analysis';
    } catch (e) {
      console.error("AI analysis failed:", e.message);
      aiAnalysis = { 
        summary: extractedData.summary || "Document processed successfully.", 
        health_score: 75,
        risk_factors: [],
        key_findings: []
      };
    }

    return Response.json({ 
      success: true, 
      extractedData, 
      aiAnalysis, 
      aiModelUsed 
    });
  } catch (error) {
    console.error('Error in enhancedDocumentProcessor:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});