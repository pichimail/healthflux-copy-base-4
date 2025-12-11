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

    const { profile_id, start_date, end_date } = await req.json();

    // Fetch all health data
    const [vitals, meals, medLogs, medications, labs, profile] = await Promise.all([
      base44.asServiceRole.entities.VitalMeasurement.filter({ profile_id }),
      base44.asServiceRole.entities.MealLog.filter({ profile_id }),
      base44.asServiceRole.entities.MedicationLog.filter({ profile_id }),
      base44.asServiceRole.entities.Medication.filter({ profile_id }),
      base44.asServiceRole.entities.LabResult.filter({ profile_id }),
      base44.asServiceRole.entities.Profile.filter({ id: profile_id }).then(p => p[0])
    ]);

    // Filter by date range
    const filteredVitals = vitals.filter(v => v.measured_at >= start_date && v.measured_at <= end_date);
    const filteredMeals = meals.filter(m => m.meal_date >= start_date && m.meal_date <= end_date);
    const filteredLogs = medLogs.filter(l => l.scheduled_time >= start_date && l.scheduled_time <= end_date);

    const prompt = `Analyze health data correlations and patterns.

PROFILE:
- Chronic Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}
- Allergies: ${profile.allergies?.join(', ') || 'None'}

DATA SUMMARY:
- Vitals: ${filteredVitals.length} measurements
  - BP readings: ${filteredVitals.filter(v => v.vital_type === 'blood_pressure').length}
  - Weight readings: ${filteredVitals.filter(v => v.vital_type === 'weight').length}
  - Glucose readings: ${filteredVitals.filter(v => v.vital_type === 'blood_glucose').length}
- Meals logged: ${filteredMeals.length}
- Medication doses: ${filteredLogs.length}
- Active medications: ${medications.filter(m => m.is_active).length}

Find hidden patterns and correlations:
{
  "significant_patterns": [
    {
      "title": "string",
      "description": "detailed pattern description",
      "metric_1": "string",
      "metric_2": "string",
      "strength": "strong|moderate|weak",
      "correlation_coefficient": number,
      "actionable_insights": ["string"]
    }
  ],
  "diet_impact": {
    "blood_pressure": {
      "description": "how diet affects BP",
      "recommendation": "string"
    },
    "weight": {
      "description": "diet's effect on weight",
      "recommendation": "string"
    },
    "glucose": {
      "description": "nutrition impact on glucose",
      "recommendation": "string"
    }
  },
  "medication_effectiveness": {
    "medication_name": {
      "impact_description": "how well medication is working based on vitals",
      "adherence_correlation": "correlation between adherence and results"
    }
  },
  "temporal_patterns": [
    {
      "pattern": "time-based pattern found",
      "significance": "why it matters",
      "recommendation": "what to do"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a health analytics AI specializing in finding correlations and patterns in patient health data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const correlations = JSON.parse(response.choices[0].message.content);

    return Response.json({
      success: true,
      correlations,
      data_points_analyzed: {
        vitals: filteredVitals.length,
        meals: filteredMeals.length,
        medications: filteredLogs.length
      }
    });

  } catch (error) {
    console.error('Correlation analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});