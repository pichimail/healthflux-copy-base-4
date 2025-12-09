import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id } = await req.json();

    // Fetch data
    const medications = await base44.asServiceRole.entities.Medication.filter({ 
      profile_id, 
      is_active: true 
    });
    
    const logs = await base44.asServiceRole.entities.MedicationLog.filter({ 
      profile_id 
    }, '-created_date', 500);

    const sideEffects = await base44.asServiceRole.entities.SideEffect.filter({ 
      profile_id 
    }, '-onset_time', 100);

    // Calculate adherence per medication
    const adherenceData = medications.map(med => {
      const medLogs = logs.filter(l => l.medication_id === med.id);
      const taken = medLogs.filter(l => l.status === 'taken').length;
      const total = medLogs.length;
      const adherenceRate = total > 0 ? (taken / total) * 100 : 0;
      
      const skipped = medLogs.filter(l => l.status === 'skipped').length;
      const snoozed = medLogs.filter(l => l.status === 'snoozed').length;
      
      return {
        medication_id: med.id,
        medication_name: med.medication_name,
        adherence_rate: Math.round(adherenceRate),
        total_doses: total,
        taken_doses: taken,
        skipped_doses: skipped,
        snoozed_doses: snoozed,
        recent_logs: medLogs.slice(0, 10)
      };
    });

    const overallAdherence = adherenceData.length > 0
      ? Math.round(adherenceData.reduce((acc, m) => acc + m.adherence_rate, 0) / adherenceData.length)
      : 0;

    // Prepare AI prompt
    const promptData = {
      medications: medications.map(m => ({
        name: m.medication_name,
        dosage: m.dosage,
        frequency: m.frequency,
        purpose: m.purpose
      })),
      adherence: adherenceData,
      side_effects: sideEffects.map(se => ({
        medication: medications.find(m => m.id === se.medication_id)?.medication_name,
        symptom: se.symptom,
        severity: se.severity,
        date: se.onset_time
      })),
      overall_adherence: overallAdherence
    };

    // Generate AI insights
    const aiPrompt = `Analyze this medication adherence data and provide personalized recommendations:

Overall Adherence Rate: ${overallAdherence}%

Medications and Adherence:
${adherenceData.map(m => `- ${m.medication_name}: ${m.adherence_rate}% (${m.taken_doses}/${m.total_doses} doses taken, ${m.skipped_doses} skipped)`).join('\n')}

Recent Side Effects:
${sideEffects.slice(0, 5).map(se => `- ${se.symptom} (${se.severity}) on medication`).join('\n') || 'None reported'}

Provide:
1. **Adherence Assessment** - Brief analysis of adherence patterns
2. **Barriers Identified** - Potential reasons for missed doses based on patterns
3. **Personalized Strategies** - 3-5 specific, actionable strategies to improve adherence
4. **Motivational Message** - Encouraging, personalized message
5. **Risk Factors** - Any concerns based on the data
6. **Side Effect Concerns** - Analysis of reported side effects and recommendations

Keep the tone supportive, non-judgmental, and actionable.`;

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a compassionate medication adherence coach who helps patients develop better medication habits.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.7
      })
    });

    const aiData = await openaiResponse.json();
    const aiInsights = aiData.choices[0].message.content;

    // Identify patterns
    const patterns = {
      common_miss_time: findMostCommonMissTime(logs),
      longest_streak: calculateLongestStreak(logs),
      recent_trend: calculateRecentTrend(logs),
      side_effect_correlation: correlateSideEffects(logs, sideEffects)
    };

    return Response.json({
      overall_adherence: overallAdherence,
      adherence_by_medication: adherenceData,
      ai_insights: aiInsights,
      patterns,
      side_effects_summary: {
        total: sideEffects.length,
        by_severity: {
          mild: sideEffects.filter(se => se.severity === 'mild').length,
          moderate: sideEffects.filter(se => se.severity === 'moderate').length,
          severe: sideEffects.filter(se => se.severity === 'severe').length,
          life_threatening: sideEffects.filter(se => se.severity === 'life_threatening').length
        },
        unreported: sideEffects.filter(se => !se.reported_to_doctor).length
      },
      recommendations: generateRecommendations(adherenceData, sideEffects)
    });

  } catch (error) {
    console.error('Adherence analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function findMostCommonMissTime(logs) {
  const skippedLogs = logs.filter(l => l.status === 'skipped' && l.scheduled_time);
  if (skippedLogs.length === 0) return null;
  
  const hours = skippedLogs.map(l => new Date(l.scheduled_time).getHours());
  const hourCounts = {};
  hours.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1);
  
  const mostCommon = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  return mostCommon ? { hour: parseInt(mostCommon[0]), count: mostCommon[1] } : null;
}

function calculateLongestStreak(logs) {
  const sortedLogs = logs.filter(l => l.status === 'taken').sort((a, b) => 
    new Date(a.taken_at) - new Date(b.taken_at)
  );
  
  let longestStreak = 0;
  let currentStreak = 0;
  
  for (let i = 0; i < sortedLogs.length; i++) {
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prevDate = new Date(sortedLogs[i - 1].taken_at);
      const currDate = new Date(sortedLogs[i].taken_at);
      const dayDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }
  }
  
  return Math.max(longestStreak, currentStreak);
}

function calculateRecentTrend(logs) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const recentLogs = logs.filter(l => new Date(l.scheduled_time) > sevenDaysAgo);
  const previousLogs = logs.filter(l => {
    const date = new Date(l.scheduled_time);
    return date > fourteenDaysAgo && date <= sevenDaysAgo;
  });
  
  const recentAdherence = recentLogs.length > 0 
    ? (recentLogs.filter(l => l.status === 'taken').length / recentLogs.length) * 100 
    : 0;
  const previousAdherence = previousLogs.length > 0 
    ? (previousLogs.filter(l => l.status === 'taken').length / previousLogs.length) * 100 
    : 0;
  
  const change = recentAdherence - previousAdherence;
  
  return {
    recent_adherence: Math.round(recentAdherence),
    previous_adherence: Math.round(previousAdherence),
    change: Math.round(change),
    trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable'
  };
}

function correlateSideEffects(logs, sideEffects) {
  const correlations = [];
  
  sideEffects.forEach(se => {
    const medLogs = logs.filter(l => 
      l.medication_id === se.medication_id && 
      l.taken_at &&
      Math.abs(new Date(se.onset_time) - new Date(l.taken_at)) < 4 * 60 * 60 * 1000 // Within 4 hours
    );
    
    if (medLogs.length > 0) {
      correlations.push({
        side_effect: se.symptom,
        severity: se.severity,
        likely_related_to_dose: true
      });
    }
  });
  
  return correlations;
}

function generateRecommendations(adherenceData, sideEffects) {
  const recommendations = [];
  
  // Check for low adherence
  adherenceData.forEach(med => {
    if (med.adherence_rate < 70) {
      recommendations.push({
        type: 'adherence',
        priority: 'high',
        medication: med.medication_name,
        message: `Your adherence to ${med.medication_name} is ${med.adherence_rate}%. Consider setting more frequent reminders or linking it to a daily habit.`
      });
    }
  });
  
  // Check for unreported severe side effects
  const unreportedSevere = sideEffects.filter(se => 
    !se.reported_to_doctor && (se.severity === 'severe' || se.severity === 'life_threatening')
  );
  
  if (unreportedSevere.length > 0) {
    recommendations.push({
      type: 'safety',
      priority: 'urgent',
      message: `You have ${unreportedSevere.length} severe side effect(s) that haven't been reported to your doctor. Please report them immediately.`
    });
  }
  
  return recommendations;
}