import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { symptoms, profile_id } = await req.json();

        if (!symptoms || !profile_id) {
            return Response.json({ error: 'Missing symptoms or profile_id' }, { status: 400 });
        }

        // Fetch user's health context
        const [profile, medications, labResults, documents, vitals] = await Promise.all([
            base44.entities.Profile.filter({ id: profile_id }).then(r => r[0]),
            base44.entities.Medication.filter({ profile_id, is_active: true }),
            base44.entities.LabResult.filter({ profile_id }, '-test_date', 10),
            base44.entities.MedicalDocument.filter({ profile_id }, '-created_date', 5),
            base44.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 10)
        ]);

        // Build context for AI
        const healthContext = {
            age: profile.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : null,
            gender: profile.gender,
            blood_group: profile.blood_group,
            allergies: profile.allergies || [],
            chronic_conditions: profile.chronic_conditions || [],
            current_medications: medications.map(m => ({
                name: m.medication_name,
                dosage: m.dosage,
                purpose: m.purpose
            })),
            recent_vitals: vitals.slice(0, 5).map(v => ({
                type: v.vital_type,
                value: v.value,
                systolic: v.systolic,
                diastolic: v.diastolic,
                date: v.measured_at
            })),
            recent_labs: labResults.slice(0, 5).map(l => ({
                test: l.test_name,
                value: l.value,
                unit: l.unit,
                flag: l.flag,
                date: l.test_date
            })),
            recent_documents: documents.map(d => ({
                type: d.document_type,
                title: d.title,
                summary: d.ai_summary
            }))
        };

        const prompt = `You are an expert medical AI triage assistant. A patient is describing symptoms and needs guidance.

PATIENT HEALTH CONTEXT:
- Age: ${healthContext.age || 'Unknown'}
- Gender: ${healthContext.gender || 'Unknown'}
- Blood Type: ${healthContext.blood_group || 'Unknown'}
- Known Allergies: ${healthContext.allergies.length > 0 ? healthContext.allergies.join(', ') : 'None reported'}
- Chronic Conditions: ${healthContext.chronic_conditions.length > 0 ? healthContext.chronic_conditions.join(', ') : 'None reported'}
- Current Medications: ${healthContext.current_medications.length > 0 ? healthContext.current_medications.map(m => `${m.name} ${m.dosage}${m.purpose ? ` for ${m.purpose}` : ''}`).join(', ') : 'None'}
- Recent Vitals: ${healthContext.recent_vitals.length > 0 ? healthContext.recent_vitals.map(v => `${v.type}: ${v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : v.value}`).join(', ') : 'None recorded'}
- Recent Lab Results: ${healthContext.recent_labs.length > 0 ? healthContext.recent_labs.map(l => `${l.test}: ${l.value} ${l.unit} (${l.flag})`).join(', ') : 'None recorded'}

REPORTED SYMPTOMS:
${symptoms}

INSTRUCTIONS:
1. Analyze the symptoms considering the patient's complete health context
2. Identify potential causes (most likely to less likely)
3. Assess urgency level
4. Provide specific, personalized recommendations
5. Suggest relevant questions to ask their doctor
6. Consider medication interactions or complications from chronic conditions

Provide a comprehensive, context-aware assessment.`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    urgency_level: {
                        type: "string",
                        enum: ["emergency", "urgent", "soon", "routine", "monitor"],
                        description: "Level of medical attention needed"
                    },
                    urgency_message: {
                        type: "string",
                        description: "Clear explanation of urgency level"
                    },
                    potential_causes: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                condition: { type: "string" },
                                likelihood: { type: "string", enum: ["high", "moderate", "low"] },
                                reasoning: { type: "string" },
                                relevant_to_history: { type: "boolean" }
                            }
                        }
                    },
                    recommendations: {
                        type: "object",
                        properties: {
                            immediate_actions: {
                                type: "array",
                                items: { type: "string" }
                            },
                            monitoring_advice: {
                                type: "array",
                                items: { type: "string" }
                            },
                            when_to_seek_care: { type: "string" }
                        }
                    },
                    questions_for_doctor: {
                        type: "array",
                        items: { type: "string" }
                    },
                    relevant_health_context: {
                        type: "array",
                        items: { type: "string" },
                        description: "Specific items from patient history relevant to these symptoms"
                    },
                    red_flags: {
                        type: "array",
                        items: { type: "string" },
                        description: "Warning signs that would require immediate medical attention"
                    }
                }
            }
        });

        // Log this symptom check as a health insight
        await base44.entities.HealthInsight.create({
            profile_id,
            insight_type: 'alert',
            title: 'Symptom Check: ' + symptoms.substring(0, 50),
            description: `Analyzed symptoms with urgency level: ${response.urgency_level}`,
            severity: response.urgency_level === 'emergency' ? 'critical' : 
                      response.urgency_level === 'urgent' ? 'high' : 'medium',
            ai_confidence: 0.85
        });

        return Response.json({
            success: true,
            analysis: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Symptom checker error:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});