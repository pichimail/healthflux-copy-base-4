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

    const { image_url, profile_id } = await req.json();

    if (!image_url) {
      return Response.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Fetch user's health data for context
    const [profile, medications, nutritionGoals] = await Promise.all([
      base44.entities.Profile.filter({ id: profile_id }).then(p => p[0]),
      base44.entities.Medication.filter({ profile_id, is_active: true }),
      base44.entities.NutritionGoal.filter({ profile_id }, '-created_date', 1),
    ]);

    const prompt = `Analyze this meal image and provide detailed nutritional information.

PATIENT CONTEXT:
${profile ? `- Age: ${profile.date_of_birth ? Math.floor((new Date() - new Date(profile.date_of_birth)) / 31557600000) : 'Unknown'}
- Chronic Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}
- Allergies: ${profile.allergies?.join(', ') || 'None'}` : ''}
${medications.length > 0 ? `- Current Medications: ${medications.map(m => m.medication_name).join(', ')}` : ''}
${nutritionGoals.length > 0 ? `- Daily Calorie Goal: ${nutritionGoals[0].daily_calories} cal` : ''}

Provide comprehensive analysis with:
1. Meal identification and description
2. Accurate nutritional breakdown
3. Health feedback considering their conditions and medications
4. Personalized recommendations

Format as JSON:
{
  "meal_name": "string",
  "description": "string",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sodium": number,
  "sugar": number,
  "ingredients": ["string"],
  "portion_size": "string",
  "health_feedback": "string (3-4 sentences about how this meal fits their health profile)",
  "recommendations": ["string (3-5 actionable tips)"],
  "warnings": ["string (any medication/allergy/condition-specific warnings)"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a nutrition analysis AI that provides accurate, health-conscious meal assessments."
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image_url } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    return Response.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Meal analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});