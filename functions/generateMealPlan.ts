import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id, days = 7, meal_types = ['breakfast', 'lunch', 'dinner', 'snack'] } = await req.json();

    if (!profile_id) {
      return Response.json({ error: 'Profile ID required' }, { status: 400 });
    }

    // Fetch user context
    const [profile, nutritionGoal, recentMeals] = await Promise.all([
      base44.asServiceRole.entities.Profile.filter({ id: profile_id }).then(p => p[0]),
      base44.asServiceRole.entities.NutritionGoal.filter({ profile_id }, '-created_date', 1).then(g => g[0]),
      base44.asServiceRole.entities.MealLog.filter({ profile_id }, '-created_date', 20),
    ]);

    const prompt = `Generate a ${days}-day personalized meal plan for this patient.

PATIENT CONTEXT:
${profile ? `
- Age: ${profile.date_of_birth ? Math.floor((new Date() - new Date(profile.date_of_birth)) / 31557600000) : 'Unknown'}
- Chronic Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}
- Allergies: ${profile.allergies?.join(', ') || 'None'}` : ''}

${nutritionGoal ? `
NUTRITION GOALS:
- Daily Calories: ${nutritionGoal.daily_calories} cal
- Protein: ${nutritionGoal.daily_protein}g
- Carbs: ${nutritionGoal.daily_carbs}g
- Fat: ${nutritionGoal.daily_fat}g
- Fiber: ${nutritionGoal.daily_fiber}g
- Goal Type: ${nutritionGoal.goal_type}
- Activity Level: ${nutritionGoal.activity_level}` : ''}

${recentMeals.length > 0 ? `
RECENT MEALS (for variety):
${recentMeals.slice(0, 10).map(m => `- ${m.meal_name}`).join('\n')}` : ''}

REQUIREMENTS:
- Include meals for: ${meal_types.join(', ')}
- Ensure variety (no meal repeated)
- Meet daily nutrition goals (within 10% tolerance)
- Avoid allergens: ${profile?.allergies?.join(', ') || 'none'}
- Consider chronic conditions when selecting foods
- Provide realistic portions and cooking methods
- Include foods from different food groups
- Balance macronutrients throughout the day

Provide JSON output with this structure:
{
  "meal_plan": {
    "day_1": {
      "breakfast": {
        "meal_name": "string",
        "description": "string",
        "foods": ["item with portion"],
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "fiber": number,
        "prep_time": "string"
      },
      "lunch": {...},
      "dinner": {...},
      "snack": {...}
    },
    ... (repeat for all days)
  },
  "shopping_list": ["categorized items"],
  "nutrition_summary": {
    "avg_daily_calories": number,
    "avg_daily_protein": number,
    "avg_daily_carbs": number,
    "avg_daily_fat": number,
    "variety_score": "high/medium/low",
    "goal_alignment": "percentage match to goals"
  },
  "tips": ["meal prep tips", "substitution suggestions"]
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          meal_plan: { type: 'object' },
          shopping_list: { type: 'array', items: { type: 'string' } },
          nutrition_summary: { type: 'object' },
          tips: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      success: true,
      plan: result,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Meal plan generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});