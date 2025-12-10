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

    // Fetch all relevant data
    const [medications, logs, sideEffects, profile] = await Promise.all([
      base44.entities.Medication.filter({ profile_id, is_active: true }),
      base44.entities.MedicationLog.filter({ profile_id }, '-scheduled_time', 100),
      base44.entities.SideEffect.filter({ profile_id }, '-onset_time', 50),
      base44.entities.Profile.filter({ id: profile_id }).then(p => p[0]),
    ]);

    if (medications.length === 0) {
      return Response.json({
        overall_adherence: 0,
        medications: [],
        insights: [],
        recommendations: [],
        side_effect_summary: [],
        barriers: [],
      });
    }

    // Calculate adherence per medication
    const medicationAdherence = medications.map(med => {
      const medLogs = logs.filter(l => l.medication_id === med.id);
      const takenLogs = medLogs.filter(l => l.status === 'taken');
      const adherenceRate = medLogs.length > 0 
        ? (takenLogs.length / medLogs.length) * 100 
        : 0;

      // Calculate streak
      const recentLogs = medLogs.slice(0, 10).reverse();
      let currentStreak = 0;
      for (const log of recentLogs) {
        if (log.status === 'taken') {
          currentStreak++;
        } else {
          break;
        }
      }

      // Find common skip reasons
      const skipReasons = medLogs
        .filter(l => l.status === 'skipped' && l.reason)
        .map(l => l.reason);

      return {
        medication_id: med.id,
        medication_name: med.medication_name,
        dosage: med.dosage,
        adherence_rate: Math.round(adherenceRate),
        total_doses: medLogs.length,
        taken_doses: takenLogs.length,
        missed_doses: medLogs.filter(l => l.status === 'skipped').length,
        current_streak: currentStreak,
        skip_reasons: [...new Set(skipReasons)],
      };
    });

    // Overall adherence
    const overallAdherence = medicationAdherence.length > 0
      ? Math.round(medicationAdherence.reduce((sum, m) => sum + m.adherence_rate, 0) / medicationAdherence.length)
      : 0;

    // Side effects summary
    const sideEffectSummary = {};
    sideEffects.forEach(se => {
      if (!sideEffectSummary[se.severity]) {
        sideEffectSummary[se.severity] = [];
      }
      const med = medications.find(m => m.id === se.medication_id);
      sideEffectSummary[se.severity].push({
        medication_name: med?.medication_name || 'Unknown',
        symptom: se.symptom,
        onset_time: se.onset_time,
        reported: se.reported_to_doctor,
      });
    });

    // Find common skip patterns
    const skipPatterns = {};
    logs.filter(l => l.status === 'skipped').forEach(log => {
      const hour = new Date(log.scheduled_time).getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      skipPatterns[timeOfDay] = (skipPatterns[timeOfDay] || 0) + 1;
    });

    // Prepare AI prompt
    const prompt = `You are a healthcare AI assistant analyzing medication adherence data. Provide personalized insights and strategies.

Patient Profile:
- Name: ${profile.full_name}
- Age: ${profile.date_of_birth ? Math.floor((new Date() - new Date(profile.date_of_birth)) / 31557600000) : 'Unknown'}
- Chronic Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}

Medications (${medications.length}):
${medications.map(m => `- ${m.medication_name} (${m.dosage}) - ${m.frequency.replace(/_/g, ' ')} - Purpose: ${m.purpose || 'Not specified'}`).join('\n')}

Adherence Summary:
- Overall Adherence Rate: ${overallAdherence}%
- Total Medication Logs: ${logs.length}

Per-Medication Adherence:
${medicationAdherence.map(m => `- ${m.medication_name}: ${m.adherence_rate}% (${m.taken_doses}/${m.total_doses} doses taken, ${m.current_streak} day streak)${m.skip_reasons.length > 0 ? ` - Common reasons: ${m.skip_reasons.join(', ')}` : ''}`).join('\n')}

Side Effects Reported (${sideEffects.length} total):
${Object.entries(sideEffectSummary).map(([severity, effects]) => 
  `${severity.toUpperCase()}: ${effects.length} incidents\n${effects.slice(0, 3).map(e => `  - ${e.medication_name}: ${e.symptom}${e.reported ? ' (Reported to doctor)' : ' (Not reported)'}`).join('\n')}`
).join('\n')}

Skip Patterns:
${Object.entries(skipPatterns).map(([time, count]) => `- ${time}: ${count} skips`).join('\n')}

Based on this data, provide:
1. 3-5 key insights about adherence patterns
2. 5-7 personalized strategies to improve adherence
3. Identify 2-3 main barriers to adherence
4. Proactive suggestions for managing side effects
5. Recommendations for timing adjustments if needed

Format your response as JSON:
{
  "insights": ["insight1", "insight2", ...],
  "strategies": [
    {"title": "strategy title", "description": "detailed description", "priority": "high|medium|low"}
  ],
  "barriers": ["barrier1", "barrier2", ...],
  "side_effect_management": [
    {"medication": "med name", "suggestion": "proactive suggestion", "severity_risk": "low|medium|high"}
  ],
  "timing_recommendations": [
    {"medication": "med name", "current_time": "time", "suggested_time": "time", "reason": "reason"}
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a healthcare AI assistant specializing in medication adherence analysis. Provide evidence-based, personalized recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const aiAnalysis = JSON.parse(response.choices[0].message.content);

    return Response.json({
      overall_adherence: overallAdherence,
      medications: medicationAdherence,
      side_effect_summary: Object.entries(sideEffectSummary).map(([severity, effects]) => ({
        severity,
        count: effects.length,
        effects: effects.slice(0, 5),
      })),
      skip_patterns: skipPatterns,
      ai_analysis: aiAnalysis,
      total_logs: logs.length,
      date_range: {
        start: logs.length > 0 ? logs[logs.length - 1].scheduled_time : null,
        end: logs.length > 0 ? logs[0].scheduled_time : null,
      }
    });

  } catch (error) {
    console.error('Adherence analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});