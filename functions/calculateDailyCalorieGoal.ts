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

    // Fetch comprehensive health data
    const [profile, vitals, labResults, medications, insights] = await Promise.all([
      base44.entities.Profile.filter({ id: profile_id }).then(p => p[0]),
      base44.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 100),
      base44.entities.LabResult.filter({ profile_id }, '-test_date', 50),
      base44.entities.Medication.filter({ profile_id, is_active: true }),
      base44.entities.HealthInsight.filter({ profile_id }, '-created_date', 20),
    ]);

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Calculate age, BMI, weight trends
    const age = profile.date_of_birth ? Math.floor((new Date() - new Date(profile.date_of_birth)) / 31557600000) : null;
    
    const weights = vitals.filter(v => v.vital_type === 'weight').sort((a, b) => 
      new Date(b.measured_at) - new Date(a.measured_at)
    );
    const currentWeight = weights[0]?.value;
    const weightTrend = weights.length > 5 ? 
      ((weights[0].value - weights[4].value) / weights[4].value * 100).toFixed(1) : null;

    const heights = vitals.filter(v => v.vital_type === 'height');
    const height = heights[0]?.value || profile.height;

    const bmi = currentWeight && height ? (currentWeight / Math.pow(height / 100, 2)).toFixed(1) : null;

    const prompt = `Calculate personalized daily caloric and macronutrient goals for this patient.

PATIENT PROFILE:
- Age: ${age || 'Unknown'}
- Gender: ${profile.gender || 'Unknown'}
- Height: ${height ? height + ' cm' : 'Unknown'}
- Current Weight: ${currentWeight ? currentWeight + ' kg' : 'Unknown'}
- BMI: ${bmi || 'Unknown'}
- Weight Trend: ${weightTrend ? (weightTrend > 0 ? '+' : '') + weightTrend + '%' : 'Stable'}
- Chronic Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}
- Allergies: ${profile.allergies?.join(', ') || 'None'}

CURRENT MEDICATIONS (${medications.length}):
${medications.map(m => `- ${m.medication_name} for ${m.purpose || 'unspecified'}`).join('\n') || 'None'}

RECENT HEALTH INSIGHTS:
${insights.slice(0, 5).map(i => `- ${i.title}: ${i.description?.substring(0, 100)}`).join('\n') || 'None'}

LAB RESULTS SUMMARY:
${labResults.slice(0, 10).map(l => `- ${l.test_name}: ${l.value} ${l.unit} (${l.flag})`).join('\n') || 'None'}

Calculate evidence-based daily goals considering:
1. Basal Metabolic Rate (BMR) based on age, gender, weight, height
2. Activity level estimation from vitals and lifestyle
3. Health conditions and medication effects on metabolism
4. Weight management needs based on BMI and trends
5. Macronutrient balance for optimal health

Provide JSON:
{
  "daily_calories": number,
  "daily_protein": number (grams),
  "daily_carbs": number (grams),
  "daily_fat": number (grams),
  "daily_fiber": number (grams),
  "activity_level": "sedentary|lightly_active|moderately_active|very_active|extremely_active",
  "goal_type": "weight_loss|weight_gain|maintenance|muscle_gain",
  "rationale": "Detailed 3-4 sentence explanation",
  "recommendations": ["3-5 specific dietary recommendations"],
  "bmr": number,
  "tdee": number (Total Daily Energy Expenditure)
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a clinical nutritionist AI that calculates personalized, evidence-based nutritional goals."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const goals = JSON.parse(response.choices[0].message.content);

    // Save nutrition goal
    const existingGoals = await base44.entities.NutritionGoal.filter({ profile_id });
    
    if (existingGoals.length > 0) {
      await base44.asServiceRole.entities.NutritionGoal.update(existingGoals[0].id, {
        daily_calories: goals.daily_calories,
        daily_protein: goals.daily_protein,
        daily_carbs: goals.daily_carbs,
        daily_fat: goals.daily_fat,
        daily_fiber: goals.daily_fiber,
        activity_level: goals.activity_level,
        goal_type: goals.goal_type,
        is_ai_generated: true,
        generated_date: new Date().toISOString(),
        rationale: goals.rationale,
      });
    } else {
      await base44.entities.NutritionGoal.create({
        profile_id,
        daily_calories: goals.daily_calories,
        daily_protein: goals.daily_protein,
        daily_carbs: goals.daily_carbs,
        daily_fat: goals.daily_fat,
        daily_fiber: goals.daily_fiber,
        activity_level: goals.activity_level,
        goal_type: goals.goal_type,
        is_ai_generated: true,
        generated_date: new Date().toISOString(),
        rationale: goals.rationale,
      });
    }

    return Response.json({
      success: true,
      goals,
      patient_data: {
        age,
        bmi,
        currentWeight,
        weightTrend
      }
    });

  } catch (error) {
    console.error('Calorie goal calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});