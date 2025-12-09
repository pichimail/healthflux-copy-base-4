import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY"));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { document_id, file_url, profile_id } = await req.json();

        if (!document_id || !file_url || !profile_id) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await base44.asServiceRole.entities.MedicalDocument.update(document_id, { status: 'processing' });

        const document = await base44.asServiceRole.entities.MedicalDocument.filter({ id: document_id });
        if (!document || document.length === 0) {
            return Response.json({ error: 'Document not found' }, { status: 404 });
        }

        const doc = document[0];
        const profile = await base44.asServiceRole.entities.Profile.filter({ id: profile_id });
        const profileData = profile[0] || {};

        const isImage = file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

        const extractionSchema = {
            type: "object",
            properties: {
                title: {
                    type: "string",
                    description: "A clear, descriptive title for this document"
                },
                document_type: {
                    type: "string",
                    enum: ["lab_report", "prescription", "imaging", "discharge_summary", "consultation", "vaccination", "insurance", "other"]
                },
                summary: { type: "string" },
                facility_name: { type: "string" },
                doctor_name: { type: "string" },
                company_name: { type: "string" },
                document_date: { type: "string" },
                lab_results: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            value: { type: "number" },
                            unit: { type: "string" },
                            reference_low: { type: "number" },
                            reference_high: { type: "number" },
                            category: { type: "string" }
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
                            systolic: { type: "number" },
                            diastolic: { type: "number" },
                            unit: { type: "string" }
                        }
                    }
                },
                medications: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            dosage: { type: "string" },
                            frequency: { type: "string" },
                            times: { type: "array", items: { type: "string" } },
                            purpose: { type: "string" },
                            duration: { type: "string" },
                            instructions: { type: "string" }
                        }
                    }
                },
                diagnoses: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } }
            }
        };

        let extractedData;

        if (isImage) {
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: extractionSchema
                }
            });

            const imageResponse = await fetch(file_url);
            const imageBuffer = await imageResponse.arrayBuffer();
            const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

            const prompt = `You are a medical document analysis AI. Carefully analyze this medical document image and extract ALL visible information:

1. Create a descriptive title (e.g., "Blood Test - City Hospital - Jan 2024")
2. Identify document type
3. Extract complete summary of all findings
4. All doctor names, hospital/clinic names, company/insurance names
5. Document date (YYYY-MM-DD)
6. ALL lab results with exact values, units, and reference ranges
7. ALL vital signs (blood pressure, heart rate, weight, etc.)
8. ALL medications with dosage, frequency, timing, purpose, and special instructions
9. All diagnoses
10. All recommendations

Be extremely thorough. Extract every detail visible.`;

            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType: doc.file_type || 'image/jpeg'
                    }
                }
            ]);

            const responseText = result.response.text();
            extractedData = JSON.parse(responseText);
        } else {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a medical document analysis AI. Extract ALL structured information from medical documents with complete accuracy."
                    },
                    {
                        role: "user",
                        content: `Analyze this medical document thoroughly. Extract ALL information and create a comprehensive, descriptive title.

Document details:
- Current title: ${doc.title}
- Type: ${doc.document_type}
- Facility: ${doc.facility_name || 'Unknown'}
- Notes: ${doc.notes || 'None'}

Extract according to this schema: ${JSON.stringify(extractionSchema, null, 2)}

Provide complete JSON with all extracted data.`
                    }
                ],
                response_format: { type: "json_object" }
            });

            extractedData = JSON.parse(response.choices[0].message.content);
        }

        const updateData = {
            title: extractedData.title || doc.title,
            document_type: extractedData.document_type || doc.document_type,
            facility_name: extractedData.facility_name || extractedData.company_name || doc.facility_name,
            doctor_name: extractedData.doctor_name,
            document_date: extractedData.document_date || doc.document_date,
            ai_summary: extractedData.summary || "",
            extracted_medications: extractedData.medications || [],
            extracted_vitals: extractedData.vitals || [],
            extracted_lab_results: extractedData.lab_results || [],
            status: 'processed'
        };

        await base44.asServiceRole.entities.MedicalDocument.update(document_id, updateData);

        if (extractedData.lab_results && extractedData.lab_results.length > 0) {
            for (const lab of extractedData.lab_results) {
                if (lab.name && lab.value) {
                    const flag = calculateFlag(lab.value, lab.reference_low, lab.reference_high);
                    
                    await base44.asServiceRole.entities.LabResult.create({
                        profile_id: doc.profile_id,
                        document_id: document_id,
                        test_name: lab.name,
                        test_category: lab.category || 'other',
                        value: parseFloat(lab.value),
                        unit: lab.unit || '',
                        reference_low: lab.reference_low ? parseFloat(lab.reference_low) : undefined,
                        reference_high: lab.reference_high ? parseFloat(lab.reference_high) : undefined,
                        flag: flag,
                        test_date: extractedData.document_date || new Date().toISOString().split('T')[0],
                        facility: extractedData.facility_name || doc.facility_name
                    });

                    if (flag !== 'normal') {
                        await base44.asServiceRole.entities.HealthInsight.create({
                            profile_id: doc.profile_id,
                            insight_type: 'alert',
                            title: `Abnormal ${lab.name} Result`,
                            description: `Your ${lab.name} is ${flag}: ${lab.value} ${lab.unit} (Reference: ${lab.reference_low || '?'}-${lab.reference_high || '?'}). Please consult your healthcare provider.`,
                            severity: flag === 'high' ? 'high' : 'medium',
                            data_source: [document_id],
                            ai_confidence: 0.9,
                            is_read: false
                        });
                    }
                }
            }
        }

        if (extractedData.vitals && extractedData.vitals.length > 0) {
            for (const vital of extractedData.vitals) {
                if (vital.type && (vital.value || vital.systolic)) {
                    const vitalData = {
                        profile_id: doc.profile_id,
                        vital_type: vital.type,
                        measured_at: extractedData.document_date ? new Date(extractedData.document_date).toISOString() : new Date().toISOString(),
                        source: 'document',
                        notes: `Extracted from ${extractedData.title || doc.title}`
                    };

                    if (vital.type === 'blood_pressure' && vital.systolic && vital.diastolic) {
                        vitalData.systolic = parseFloat(vital.systolic);
                        vitalData.diastolic = parseFloat(vital.diastolic);
                        vitalData.unit = 'mmHg';
                    } else if (vital.value) {
                        vitalData.value = parseFloat(vital.value);
                        vitalData.unit = vital.unit || '';
                    }

                    await base44.asServiceRole.entities.VitalMeasurement.create(vitalData);
                }
            }
        }

        if (extractedData.medications && extractedData.medications.length > 0) {
            const existingMeds = await base44.asServiceRole.entities.Medication.filter({
                profile_id: doc.profile_id,
                is_active: true
            });

            for (const med of extractedData.medications) {
                if (med.name) {
                    const duplicate = existingMeds.find(m =>
                        m.medication_name.toLowerCase() === med.name.toLowerCase()
                    );

                    if (!duplicate) {
                        const frequency = ['once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily'].includes(med.frequency?.toLowerCase().replace(/ /g, '_'))
                            ? med.frequency.toLowerCase().replace(/ /g, '_')
                            : 'as_needed';

                        await base44.asServiceRole.entities.Medication.create({
                            profile_id: doc.profile_id,
                            medication_name: med.name,
                            dosage: med.dosage || '',
                            frequency: frequency,
                            times: med.times || [],
                            start_date: extractedData.document_date || new Date().toISOString().split('T')[0],
                            purpose: med.purpose || '',
                            prescriber: extractedData.doctor_name || '',
                            side_effects: med.instructions || '',
                            is_active: true,
                            reminders_enabled: true
                        });
                    }
                }
            }

            const interactions = await checkDrugInteractions(
                doc.profile_id,
                extractedData.medications,
                profileData,
                base44
            );

            if (interactions.length > 0) {
                for (const interaction of interactions) {
                    await base44.asServiceRole.entities.HealthInsight.create({
                        profile_id: doc.profile_id,
                        insight_type: 'alert',
                        title: 'Drug Interaction Warning',
                        description: interaction.description,
                        severity: interaction.severity,
                        data_source: [document_id],
                        ai_confidence: 0.85,
                        is_read: false
                    });
                }
            }
        }

        if (extractedData.recommendations && extractedData.recommendations.length > 0) {
            for (const rec of extractedData.recommendations) {
                await base44.asServiceRole.entities.HealthInsight.create({
                    profile_id: doc.profile_id,
                    insight_type: 'recommendation',
                    title: 'Health Recommendation from Document',
                    description: rec,
                    severity: 'low',
                    data_source: [document_id],
                    ai_confidence: 0.8,
                    is_read: false
                });
            }
        }

        return Response.json({
            success: true,
            message: 'Document processed with comprehensive AI analysis',
            extracted_data: extractedData,
            counts: {
                medications: extractedData.medications?.length || 0,
                lab_results: extractedData.lab_results?.length || 0,
                vitals: extractedData.vitals?.length || 0,
                interactions: interactions?.length || 0
            }
        });
    } catch (error) {
        console.error('Processing error:', error);

        if (document_id) {
            try {
                await base44.asServiceRole.entities.MedicalDocument.update(document_id, {
                    status: 'failed'
                });
            } catch (e) {
                console.error('Failed to update status:', e);
            }
        }

        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});

async function checkDrugInteractions(profileId, newMedications, profileData, base44) {
    const interactions = [];

    const existingMeds = await base44.asServiceRole.entities.Medication.filter({
        profile_id: profileId,
        is_active: true
    });

    const allergies = profileData.allergies || [];
    const chronicConditions = profileData.chronic_conditions || [];

    for (const newMed of newMedications) {
        const medName = newMed.name.toLowerCase();

        for (const allergy of allergies) {
            if (medName.includes(allergy.toLowerCase()) || allergy.toLowerCase().includes(medName)) {
                interactions.push({
                    description: `⚠️ CRITICAL ALLERGY ALERT: ${newMed.name} may conflict with your known allergy to ${allergy}. DO NOT TAKE this medication. Contact your doctor immediately.`,
                    severity: 'critical'
                });
            }
        }

        for (const existingMed of existingMeds) {
            const interaction = getCommonDrugInteractions(newMed.name, existingMed.medication_name);
            if (interaction) {
                interactions.push({
                    description: `Interaction between ${newMed.name} and ${existingMed.medication_name}: ${interaction.description}. Consult your healthcare provider.`,
                    severity: interaction.severity
                });

                await base44.asServiceRole.entities.DrugInteraction.create({
                    profile_id: profileId,
                    medication_id_1: existingMed.id,
                    medication_id_2: newMed.name,
                    interaction_type: interaction.severity === 'high' ? 'major' : interaction.severity === 'medium' ? 'moderate' : 'minor',
                    description: interaction.description,
                    recommendation: 'Consult with your healthcare provider before combining these medications.',
                    is_acknowledged: false
                });
            }
        }

        for (const condition of chronicConditions) {
            const conditionInteraction = getConditionDrugInteraction(newMed.name, condition);
            if (conditionInteraction) {
                interactions.push({
                    description: `Your ${condition} condition may be affected by ${newMed.name}: ${conditionInteraction.description}`,
                    severity: conditionInteraction.severity
                });
            }
        }
    }

    return interactions;
}

function getCommonDrugInteractions(drug1, drug2) {
    const d1 = drug1.toLowerCase();
    const d2 = drug2.toLowerCase();

    const knownInteractions = [
        { drugs: ['warfarin', 'aspirin'], description: 'Increased risk of bleeding', severity: 'high' },
        { drugs: ['warfarin', 'ibuprofen'], description: 'Increased bleeding risk', severity: 'high' },
        { drugs: ['warfarin', 'naproxen'], description: 'Increased bleeding risk', severity: 'high' },
        { drugs: ['metformin', 'alcohol'], description: 'Risk of lactic acidosis', severity: 'medium' },
        { drugs: ['lisinopril', 'potassium'], description: 'Hyperkalemia risk', severity: 'high' },
        { drugs: ['amlodipine', 'simvastatin'], description: 'Increased statin levels', severity: 'medium' },
        { drugs: ['levothyroxine', 'calcium'], description: 'Reduced thyroid absorption', severity: 'medium' },
        { drugs: ['digoxin', 'amiodarone'], description: 'Increased digoxin toxicity', severity: 'high' },
        { drugs: ['ssri', 'nsaid'], description: 'Increased bleeding risk', severity: 'medium' },
        { drugs: ['ssri', 'tramadol'], description: 'Serotonin syndrome risk', severity: 'high' },
    ];

    for (const interaction of knownInteractions) {
        const match1 = interaction.drugs.some(d => d1.includes(d) || d.includes(d1.split(' ')[0]));
        const match2 = interaction.drugs.some(d => d2.includes(d) || d.includes(d2.split(' ')[0]));
        
        if (match1 && match2 && d1 !== d2) {
            return interaction;
        }
    }

    return null;
}

function getConditionDrugInteraction(medication, condition) {
    const med = medication.toLowerCase();
    const cond = condition.toLowerCase();

    const conditionInteractions = [
        { condition: 'diabetes', drugs: ['steroid', 'prednisone', 'cortisone'], description: 'May increase blood sugar levels', severity: 'medium' },
        { condition: 'hypertension', drugs: ['nsaid', 'ibuprofen', 'naproxen'], description: 'May increase blood pressure', severity: 'medium' },
        { condition: 'kidney', drugs: ['nsaid', 'ibuprofen', 'metformin'], description: 'May affect kidney function', severity: 'high' },
        { condition: 'liver', drugs: ['acetaminophen', 'paracetamol', 'statin'], description: 'May affect liver function', severity: 'high' },
        { condition: 'asthma', drugs: ['aspirin', 'beta blocker'], description: 'May worsen breathing', severity: 'high' },
    ];

    for (const interaction of conditionInteractions) {
        if (cond.includes(interaction.condition) && interaction.drugs.some(d => med.includes(d))) {
            return interaction;
        }
    }

    return null;
}

function calculateFlag(value, refLow, refHigh) {
    const val = parseFloat(value);
    const low = refLow ? parseFloat(refLow) : null;
    const high = refHigh ? parseFloat(refHigh) : null;

    if (isNaN(val)) return 'normal';
    if (low !== null && val < low) return 'low';
    if (high !== null && val > high) return 'high';
    return 'normal';
}