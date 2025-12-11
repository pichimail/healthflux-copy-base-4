import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id } = await req.json();

    // Check subscription access
    const subscriptions = await base44.entities.Subscription.filter({ 
      user_email: user.email,
      status: 'active'
    });

    let hasPredictiveAccess = false;
    if (subscriptions.length > 0) {
      const packageId = subscriptions[0].package_id;
      const packages = await base44.entities.SubscriptionPackage.filter({ id: packageId });
      if (packages.length > 0 && packages[0].predictive_analytics_enabled) {
        hasPredictiveAccess = true;
      }
    }

    if (!hasPredictiveAccess && user.role !== 'admin') {
      return Response.json({
        error: 'Upgrade required',
        message: 'Predictive analytics requires a premium subscription'
      }, { status: 403 });
    }

    // Fetch comprehensive health data
    const [profile, vitals, labs, medications, sideEffects, medicationLogs, documents] = await Promise.all([
      base44.entities.Profile.filter({ id: profile_id }).then(p => p[0]),
      base44.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 200),
      base44.entities.LabResult.filter({ profile_id }, '-test_date', 100),
      base44.entities.Medication.filter({ profile_id }),
      base44.entities.SideEffect.filter({ profile_id }, '-onset_time', 50),
      base44.entities.MedicationLog.filter({ profile_id }, '-scheduled_time', 200),
      base44.entities.MedicalDocument.filter({ profile_id }, '-created_date', 50),
    ]);

    // Calculate trends and patterns
    const vitalTrends = calculateVitalTrends(vitals);
    const labTrends = calculateLabTrends(labs);
    const medicationPatterns = analyzeMedicationPatterns(medications, sideEffects);
    const adherenceRate = calculateAdherenceRate(medicationLogs);

    // Build comprehensive prompt for PROACTIVE analysis
    const prompt = `You are an advanced health analytics AI specializing in EARLY DETECTION and PROACTIVE RISK ASSESSMENT. 
Your goal is to identify subtle warning signs BEFORE they become serious problems.

PATIENT PROFILE:
- Age: ${profile.date_of_birth ? Math.floor((new Date() - new Date(profile.date_of_birth)) / 31557600000) : 'Unknown'}
- Gender: ${profile.gender || 'Unknown'}
- Blood Type: ${profile.blood_group || 'Unknown'}
- Chronic Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}
- Known Allergies: ${profile.allergies?.join(', ') || 'None'}

VITAL TRENDS (${vitals.length} measurements over time):
${vitalTrends}

LAB RESULTS TRENDS (${labs.length} tests):
${labTrends}

MEDICATIONS (${medications.length} total, adherence: ${adherenceRate}%):
${medications.map(m => `- ${m.medication_name} (${m.dosage}) for ${m.purpose || 'unspecified'} [${m.is_active ? 'Active' : 'Inactive'}]`).join('\n')}

MEDICATION ADHERENCE & SIDE EFFECTS:
${medicationPatterns}

CRITICAL TASK - PROACTIVE RISK DETECTION:
1. EARLY WARNING ALERTS: Identify GRADUAL changes that could indicate future problems (e.g., cholesterol slowly increasing even if still "normal")
2. TREND ANALYSIS: Analyze rates of change - is something getting worse over time?
3. CORRELATION DETECTION: Find connections between lifestyle factors (vitals) and health outcomes (labs)
4. MEDICATION EFFECTIVENESS: Are medications working? Any signs of diminishing effectiveness?
5. COMPLICATION RISKS: Based on chronic conditions, what complications are most likely in next 3-6 months?
6. ADHERENCE IMPACT: How is medication adherence (or lack of) affecting outcomes?

PROVIDE SPECIFIC, ACTIONABLE INSIGHTS with risk scores and timeframes.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an advanced healthcare AI specializing in predictive health analytics, early risk detection, and personalized preventive care recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    // Create health insights with enhanced categorization
    const insightsToCreate = [];

    // Proactive alerts (highest priority)
    if (analysis.early_warning_alerts) {
      for (const alert of analysis.early_warning_alerts) {
        if (alert.severity && alert.severity !== 'info') {
          insightsToCreate.push({
            profile_id,
            insight_type: 'alert',
            title: `⚠️ Early Warning: ${alert.metric || alert.factor}`,
            description: alert.description || alert.details,
            severity: alert.severity,
            ai_confidence: alert.confidence || 0.75,
            is_read: false,
          });
        }
      }
    }

    // Risk factors
    if (analysis.risk_factors) {
      const highPriorityRisks = analysis.risk_factors.filter(r => 
        r.severity === 'critical' || r.severity === 'high'
      );
      for (const risk of highPriorityRisks) {
        insightsToCreate.push({
          profile_id,
          insight_type: 'risk_assessment',
          title: `Risk: ${risk.factor}`,
          description: `${risk.description}\n\nLikelihood: ${risk.likelihood}\nTimeframe: ${risk.timeframe || 'Near term'}`,
          severity: risk.severity,
          ai_confidence: risk.likelihood === 'high' ? 0.8 : 0.6,
          is_read: false,
        });
      }
    }

    // Trend predictions
    if (analysis.predictions) {
      for (const prediction of analysis.predictions) {
        if (prediction.probability !== 'low') {
          insightsToCreate.push({
            profile_id,
            insight_type: 'trend_analysis',
            title: `Prediction: ${prediction.condition}`,
            description: `${prediction.rationale}\n\nTimeframe: ${prediction.timeframe}\nProbability: ${prediction.probability}`,
            severity: prediction.probability === 'high' ? 'high' : 'medium',
            ai_confidence: 0.7,
            is_read: false,
          });
        }
      }
    }

    // Medication insights
    if (analysis.medication_insights) {
      for (const insight of analysis.medication_insights) {
        if (insight.recommendation && insight.recommendation.toLowerCase().includes('review')) {
          insightsToCreate.push({
            profile_id,
            insight_type: 'recommendation',
            title: `💊 ${insight.medication} Review`,
            description: `${insight.insight}\n\nRecommendation: ${insight.recommendation}`,
            severity: 'medium',
            ai_confidence: 0.7,
            is_read: false,
          });
        }
      }
    }

    // Bulk create insights
    if (insightsToCreate.length > 0) {
      await base44.entities.HealthInsight.bulkCreate(insightsToCreate);
    }

    // Send notifications for critical insights
    const criticalCount = insightsToCreate.filter(i => 
      i.severity === 'critical' || i.severity === 'high'
    ).length;

    if (criticalCount > 0) {
      try {
        await base44.functions.invoke('sendNotification', {
          recipient_email: user.email,
          type: 'health',
          title: '🚨 Critical Health Alerts',
          message: `${criticalCount} critical health alert(s) detected from predictive analysis. Please review your Health Insights.`,
          priority: 'high',
          send_email: true
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    return Response.json({
      success: true,
      analysis,
      insights_created: insightsToCreate.length,
      critical_alerts: criticalCount,
      overall_risk_score: analysis.risk_score || 0,
      data_points: {
        vitals: vitals.length,
        labs: labs.length,
        medications: medications.length,
        adherence_rate: adherenceRate,
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Predictive analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateVitalTrends(vitals) {
  const byType = {};
  vitals.forEach(v => {
    if (!byType[v.vital_type]) byType[v.vital_type] = [];
    byType[v.vital_type].push(v);
  });

  let trends = '';
  for (const [type, data] of Object.entries(byType)) {
    const sorted = data.sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
    const recent = sorted.slice(-10);
    
    if (type === 'blood_pressure') {
      const avgSys = recent.reduce((s, v) => s + v.systolic, 0) / recent.length;
      const avgDia = recent.reduce((s, v) => s + v.diastolic, 0) / recent.length;
      const firstSys = sorted[0]?.systolic;
      const lastSys = sorted[sorted.length - 1]?.systolic;
      const change = firstSys && lastSys ? ((lastSys - firstSys) / firstSys * 100).toFixed(1) : 0;
      trends += `- Blood Pressure: Recent avg ${Math.round(avgSys)}/${Math.round(avgDia)} (${recent.length} readings, ${change > 0 ? '+' : ''}${change}% change over time)\n`;
    } else {
      const avg = recent.reduce((s, v) => s + v.value, 0) / recent.length;
      const first = sorted[0]?.value;
      const last = sorted[sorted.length - 1]?.value;
      const change = first && last ? ((last - first) / first * 100).toFixed(1) : 0;
      trends += `- ${type.replace(/_/g, ' ')}: Recent avg ${avg.toFixed(1)} ${recent[0]?.unit || ''} (${change > 0 ? '+' : ''}${change}% change over time)\n`;
    }
  }
  return trends || 'No vital trends available';
}

function calculateLabTrends(labs) {
  const byTest = {};
  labs.forEach(l => {
    if (!byTest[l.test_name]) byTest[l.test_name] = [];
    byTest[l.test_name].push(l);
  });

  let trends = '';
  for (const [test, data] of Object.entries(byTest)) {
    const sorted = data.sort((a, b) => new Date(a.test_date) - new Date(b.test_date));
    const recent = sorted.slice(-5);
    const avg = recent.reduce((s, l) => s + l.value, 0) / recent.length;
    const abnormal = recent.filter(l => l.flag !== 'normal').length;
    const first = sorted[0]?.value;
    const last = sorted[sorted.length - 1]?.value;
    const change = first && last ? ((last - first) / first * 100).toFixed(1) : 0;
    trends += `- ${test}: Recent avg ${avg.toFixed(2)} ${recent[0]?.unit || ''} (${abnormal}/${recent.length} abnormal, ${change > 0 ? '+' : ''}${change}% change)\n`;
  }
  return trends || 'No lab trends available';
}

function analyzeMedicationPatterns(medications, sideEffects) {
  const activeCount = medications.filter(m => m.is_active).length;
  const sideEffectCount = sideEffects.length;
  const severeEffects = sideEffects.filter(s => s.severity === 'severe' || s.severity === 'life_threatening').length;
  
  return `- Active medications: ${activeCount}
- Total side effects reported: ${sideEffectCount}
- Severe side effects: ${severeEffects}
- Medications with side effects: ${new Set(sideEffects.map(s => s.medication_id)).size}`;
}

function calculateAdherenceRate(logs) {
  if (logs.length === 0) return 100;
  const taken = logs.filter(l => l.status === 'taken').length;
  return ((taken / logs.length) * 100).toFixed(1);
}