import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id, file_url, profile_id } = await req.json();

    if (!document_id || !file_url) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    // Determine if file is an image
    const isImage = file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

    let extractedData = {};
    let summary = '';

    if (isImage) {
      // Use Gemini for image analysis
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `Analyze this medical document image and extract:
1. Document type (lab report, prescription, imaging, discharge summary, consultation, vaccination, insurance, other)
2. Document title
3. Doctor name
4. Hospital/Clinic name
5. Company/Insurance name (if applicable)
6. Document date
7. Patient name
8. Lab test results with values, units, and reference ranges
9. Vital signs measurements
10. Medications with dosages and frequencies
11. Diagnoses and medical conditions
12. Health recommendations
13. Any critical findings or alerts

Return as JSON with these exact keys: document_type, title, doctor_name, facility_name, company_name, document_date, patient_name, lab_results (array), vitals (array), medications (array), diagnoses (array), recommendations (array), summary, critical_findings (array)` },
                { inline_data: { mime_type: 'image/jpeg', data: file_url } }
              ]
            }]
          })
        }
      );

      const geminiData = await geminiResponse.json();
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        extractedData = { summary: content };
      }
    } else {
      // Use OpenAI for text/PDF analysis
      const fileContent = await fetch(file_url).then(r => r.text());
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: 'You are a medical data extraction expert. Extract structured data from medical documents.'
          }, {
            role: 'user',
            content: `Analyze this medical document and extract all relevant information. Return ONLY valid JSON with these keys: document_type, title, doctor_name, facility_name, company_name, document_date, patient_name, lab_results, vitals, medications, diagnoses, recommendations, summary, critical_findings.\n\nDocument content:\n${fileContent.substring(0, 10000)}`
          }],
          response_format: { type: 'json_object' }
        })
      });

      const openaiData = await openaiResponse.json();
      extractedData = JSON.parse(openaiData.choices[0].message.content);
    }

    // Update document with extracted data
    await base44.asServiceRole.entities.MedicalDocument.update(document_id, {
      title: extractedData.title || 'Medical Document',
      document_type: extractedData.document_type || 'other',
      facility_name: extractedData.facility_name || extractedData.hospital_name,
      document_date: extractedData.document_date,
      ai_summary: extractedData.summary || 'Document processed',
      status: 'processed'
    });

    // Create lab results
    if (extractedData.lab_results && Array.isArray(extractedData.lab_results)) {
      for (const lab of extractedData.lab_results) {
        const value = parseFloat(lab.value);
        const refLow = parseFloat(lab.reference_low || lab.ref_low || 0);
        const refHigh = parseFloat(lab.reference_high || lab.ref_high || 999);
        
        const flag = value < refLow ? 'low' : value > refHigh ? 'high' : 'normal';
        
        await base44.asServiceRole.entities.LabResult.create({
          profile_id,
          document_id,
          test_name: lab.test_name || lab.name,
          value,
          unit: lab.unit || '',
          reference_low: refLow,
          reference_high: refHigh,
          flag,
          test_date: extractedData.document_date || new Date().toISOString().slice(0, 10),
          facility: extractedData.facility_name
        });

        // Create insights for abnormal values
        if (flag !== 'normal') {
          await base44.asServiceRole.entities.HealthInsight.create({
            profile_id,
            insight_type: 'alert',
            title: `${flag === 'high' ? 'Elevated' : 'Low'} ${lab.test_name || lab.name}`,
            description: `Your ${lab.test_name || lab.name} is ${value} ${lab.unit}, which is ${flag === 'high' ? 'above' : 'below'} the normal range (${refLow}-${refHigh} ${lab.unit}). Consider consulting with your healthcare provider.`,
            severity: flag === 'high' && value > refHigh * 1.5 ? 'high' : 'medium',
            data_source: [document_id],
            ai_confidence: 0.9,
            is_read: false
          });
        }
      }
    }

    // Create vital measurements
    if (extractedData.vitals && Array.isArray(extractedData.vitals)) {
      for (const vital of extractedData.vitals) {
        await base44.asServiceRole.entities.VitalMeasurement.create({
          profile_id,
          vital_type: vital.type || vital.vital_type,
          value: parseFloat(vital.value),
          unit: vital.unit || '',
          measured_at: extractedData.document_date || new Date().toISOString(),
          notes: `Extracted from ${extractedData.title}`,
          source: 'document'
        });
      }
    }

    // Create medications
    if (extractedData.medications && Array.isArray(extractedData.medications)) {
      for (const med of extractedData.medications) {
        await base44.asServiceRole.entities.Medication.create({
          profile_id,
          medication_name: med.name || med.medication_name,
          dosage: med.dosage || '',
          frequency: med.frequency || 'as_needed',
          start_date: extractedData.document_date || new Date().toISOString().slice(0, 10),
          is_active: true,
          purpose: med.purpose || '',
          prescriber: extractedData.doctor_name
        });
      }
    }

    // Create health insights for recommendations
    if (extractedData.recommendations && Array.isArray(extractedData.recommendations)) {
      for (const rec of extractedData.recommendations) {
        await base44.asServiceRole.entities.HealthInsight.create({
          profile_id,
          insight_type: 'recommendation',
          title: 'Health Recommendation',
          description: typeof rec === 'string' ? rec : rec.text || rec.recommendation,
          severity: 'low',
          data_source: [document_id],
          ai_confidence: 0.85,
          is_read: false
        });
      }
    }

    return Response.json({
      success: true,
      document_id,
      extracted_data: extractedData
    });
  } catch (error) {
    console.error('Enhanced AI processing error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});