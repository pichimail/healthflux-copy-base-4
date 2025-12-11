import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id, message, conversation_history } = await req.json();

    if (!profile_id || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch user context
    const [profile, recentMeals, nutritionGoal, vitals] = await Promise.all([
      base44.asServiceRole.entities.Profile.filter({ id: profile_id }).then(p => p[0]),
      base44.asServiceRole.entities.MealLog.filter({ profile_id }, '-created_date', 10),
      base44.asServiceRole.entities.NutritionGoal.filter({ profile_id }, '-created_date', 1).then(g => g[0]),
      base44.asServiceRole.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 5),
    ]);

    const systemPrompt = `You are Flux's expert AI nutritionist assistant. You provide personalized, evidence-based nutrition advice.

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
- Goal Type: ${nutritionGoal.goal_type}
${nutritionGoal.rationale ? `- Rationale: ${nutritionGoal.rationale}` : ''}` : ''}

${recentMeals.length > 0 ? `
RECENT MEALS (last 10):
${recentMeals.map(m => `- ${m.meal_name} (${m.meal_date}): ${m.calories} cal, P:${m.protein}g, C:${m.carbs}g, F:${m.fat}g`).join('\n')}` : ''}

${vitals.length > 0 ? `
RECENT VITALS:
${vitals.map(v => `- ${v.vital_type}: ${v.value}${v.unit || ''} (${v.measured_at})`).join('\n')}` : ''}

INSTRUCTIONS:
- Provide personalized advice based on their health profile, goals, and recent meals
- When analyzing meals, consider their nutritional balance, portion sizes, and alignment with goals
- Suggest specific, actionable meal alternatives and improvements
- Identify potential nutritional deficiencies or concerns
- Generate meal plans that are realistic, varied, and culturally appropriate
- Always consider their allergies and chronic conditions
- Be encouraging and supportive, not judgmental
- Provide specific food suggestions with approximate portions
- Keep responses concise but informative (2-4 paragraphs max)`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversation_history || []),
      { role: 'user', content: message }
    ];

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
      add_context_from_internet: false
    });

    return Response.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Nutritionist error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});