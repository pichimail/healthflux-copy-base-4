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

    // Fetch health data
    const [vitals, labs, meals, profile] = await Promise.all([
      base44.asServiceRole.entities.VitalMeasurement.filter({ profile_id }),
      base44.asServiceRole.entities.LabResult.filter({ profile_id }),
      base44.asServiceRole.entities.MealLog.filter({ profile_id }),
      base44.asServiceRole.entities.Profile.filter({ id: profile_id }).then(p => p[0])
    ]);

    // Calculate user's averages
    const bpReadings = vitals.filter(v => v.vital_type === 'blood_pressure');
    const avgSystolic = bpReadings.length > 0 ? 
      (bpReadings.reduce((sum, v) => sum + v.systolic, 0) / bpReadings.length).toFixed(0) : null;

    const weightReadings = vitals.filter(v => v.vital_type === 'weight');
    const avgWeight = weightReadings.length > 0 ?
      (weightReadings.reduce((sum, v) => sum + v.value, 0) / weightReadings.length).toFixed(1) : null;

    const glucoseReadings = vitals.filter(v => v.vital_type === 'blood_glucose');
    const avgGlucose = glucoseReadings.length > 0 ?
      (glucoseReadings.reduce((sum, v) => sum + v.value, 0) / glucoseReadings.length).toFixed(0) : null;

    const age = profile.date_of_birth ? 
      Math.floor((new Date() - new Date(profile.date_of_birth)) / 31557600000) : null;

    const prompt = `Compare patient health metrics to population benchmarks.

PATIENT INFO:
- Age: ${age || 'Unknown'}
- Gender: ${profile.gender || 'Unknown'}
- Chronic Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}

PATIENT METRICS:
- Blood Pressure (systolic): ${avgSystolic || 'N/A'} mmHg
- Weight: ${avgWeight || 'N/A'} kg
- Blood Glucose: ${avgGlucose || 'N/A'} mg/dL
- Daily Calories: ${meals.length > 0 ? 'Tracked' : 'Not tracked'}

Provide comparison to age/gender-matched benchmarks:
{
  "cohort": {
    "age_group": "string (e.g., 30-40)",
    "sample_size": "anonymized benchmark"
  },
  "metrics": {
    "blood_pressure": {
      "your_value": "${avgSystolic} mmHg",
      "cohort_average": "string",
      "optimal_range": "string",
      "percentile": number (0-100),
      "comparison_note": "string",
      "recommendation": "string"
    },
    "weight": {
      "your_value": "${avgWeight} kg",
      "cohort_average": "string",
      "optimal_range": "string (BMI-based)",
      "percentile": number,
      "comparison_note": "string",
      "recommendation": "string"
    },
    "blood_glucose": {
      "your_value": "${avgGlucose} mg/dL",
      "cohort_average": "string",
      "optimal_range": "string",
      "percentile": number,
      "comparison_note": "string",
      "recommendation": "string"
    }
  },
  "overall_assessment": {
    "summary": "overall health standing compared to peers",
    "strengths": ["areas performing well"],
    "areas_for_improvement": ["areas to focus on"]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a health analytics AI providing benchmark comparisons based on medical research and population data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const comparison = JSON.parse(response.choices[0].message.content);

    return Response.json({
      success: true,
      comparison
    });

  } catch (error) {
    console.error('Benchmark comparison error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});