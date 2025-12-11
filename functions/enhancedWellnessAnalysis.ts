import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id } = await req.json();

    if (!profile_id) {
      return Response.json({ error: 'Missing profile_id' }, { status: 400 });
    }

    // Fetch comprehensive health data
    const vitals = await base44.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 100);
    const labs = await base44.entities.LabResult.filter({ profile_id }, '-test_date', 100);
    const medications = await base44.entities.Medication.filter({ profile_id });
    const wearableData = await base44.entities.WearableData.filter({ profile_id }, '-recorded_at', 200);

    // Detect vital sign trends
    const vitalTrends = detectVitalTrends(vitals);
    
    // Generate proactive recommendations with articles
    const prompt = `You are an advanced health analytics system. Analyze this health data and provide actionable insights:

Vital Trends:
${vitalTrends.map(t => `- ${t.type}: ${t.trend} (${t.change}% change)`).join('\n')}

Recent Lab Results:
${labs.slice(0, 10).map(l => `- ${l.test_name}: ${l.value} ${l.unit} (${l.flag})`).join('\n')}

Active Medications: ${medications.filter(m => m.is_active).length}

For each identified risk or trend:
1. Explain the significance
2. Suggest specific dietary changes with examples
3. Recommend whether to consult a doctor (include urgency level)
4. Provide relevant, real health article topics (we'll search for them)
5. Offer actionable next steps

Format response as structured insights with clear severity levels.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          health_score: { type: "number" },
          risk_factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                factor: { type: "string" },
                severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                description: { type: "string" },
                consult_doctor: { type: "boolean" },
                urgency: { type: "string" },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      details: { type: "string" }
                    }
                  }
                }
              }
            }
          },
          predictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                prediction: { type: "string" },
                probability: { type: "number" },
                reasoning: { type: "string" },
                dietary_changes: { type: "array", items: { type: "string" } },
                article_topics: { type: "array", items: { type: "string" } }
              }
            }
          },
          preventive_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                priority: { type: "string" },
                details: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Search for relevant articles for each prediction
    for (const prediction of aiResponse.predictions || []) {
      if (prediction.article_topics?.length > 0) {
        const articles = [];
        for (const topic of prediction.article_topics.slice(0, 2)) {
          // Generate credible article suggestions
          articles.push({
            title: topic,
            url: `https://www.google.com/search?q=${encodeURIComponent(topic + ' health article')}`
          });
        }
        prediction.articles = articles;
      }
    }

    // Create health insights for tracking
    for (const risk of aiResponse.risk_factors || []) {
      try {
        const insight = await base44.asServiceRole.entities.HealthInsight.create({
          profile_id,
          insight_type: 'risk_assessment',
          title: risk.factor,
          description: risk.description,
          severity: risk.severity,
          ai_confidence: 0.85,
          is_read: false
        });
        
        risk.insight_id = insight.id;
      } catch (e) {
        console.error('Failed to create insight:', e);
      }
    }

    for (const pred of aiResponse.predictions || []) {
      try {
        const insight = await base44.asServiceRole.entities.HealthInsight.create({
          profile_id,
          insight_type: 'trend_analysis',
          title: pred.prediction,
          description: pred.reasoning,
          severity: pred.probability > 0.7 ? 'high' : 'medium',
          ai_confidence: pred.probability,
          is_read: false
        });
        
        pred.insight_id = insight.id;
      } catch (e) {
        console.error('Failed to create prediction insight:', e);
      }
    }

    return Response.json(aiResponse);

  } catch (error) {
    console.error('Wellness analysis error:', error);
    return Response.json({ 
      error: error.message || 'Failed to analyze health data'
    }, { status: 500 });
  }
});

function detectVitalTrends(vitals) {
  const trends = [];
  
  const vitalTypes = [...new Set(vitals.map(v => v.vital_type))];
  
  for (const type of vitalTypes) {
    const typeVitals = vitals.filter(v => v.vital_type === type).slice(0, 14);
    
    if (typeVitals.length < 5) continue;
    
    const recent = typeVitals.slice(0, 5);
    const older = typeVitals.slice(5, 10);
    
    const getValue = (v) => v.vital_type === 'blood_pressure' ? v.systolic : v.value;
    
    const recentAvg = recent.reduce((sum, v) => sum + getValue(v), 0) / recent.length;
    const olderAvg = older.reduce((sum, v) => sum + getValue(v), 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (Math.abs(change) > 5) {
      trends.push({
        type,
        trend: change > 0 ? 'increasing' : 'decreasing',
        change: Math.abs(change).toFixed(1),
        recentAvg: recentAvg.toFixed(1),
        olderAvg: olderAvg.toFixed(1)
      });
    }
  }
  
  return trends;
}