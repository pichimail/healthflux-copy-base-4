import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id, data_type, days = 30 } = await req.json();

    if (!profile_id || !data_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get historical data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await base44.entities.WearableData.filter({
      profile_id,
      data_type
    }, '-recorded_at', days * 10);

    if (data.length === 0) {
      return Response.json({
        analysis: 'No data available for analysis',
        insights: []
      });
    }

    // Calculate statistics
    const values = data.map(d => d.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Detect trends
    const recentValues = values.slice(0, 7);
    const olderValues = values.slice(7, 14);
    const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const olderAvg = olderValues.reduce((a, b) => a + b, 0) / olderValues.length;
    const trend = recentAvg > olderAvg ? 'increasing' : recentAvg < olderAvg ? 'decreasing' : 'stable';
    const trendPercentage = Math.abs(((recentAvg - olderAvg) / olderAvg) * 100).toFixed(1);

    // Get AI insights
    let prompt = '';
    if (data_type === 'sleep') {
      const sleepData = data.filter(d => d.metadata).slice(0, 7);
      prompt = `Analyze this sleep data over the past week:
Average sleep: ${avg.toFixed(1)} hours
Trend: ${trend} by ${trendPercentage}%
Sleep stages: ${sleepData.length > 0 ? JSON.stringify(sleepData[0].metadata) : 'N/A'}

Provide 3-4 specific, actionable insights about sleep quality, patterns, and recommendations.`;
    } else if (data_type === 'heart_rate') {
      prompt = `Analyze heart rate data:
Average: ${avg.toFixed(0)} bpm
Range: ${min}-${max} bpm
Trend: ${trend} by ${trendPercentage}%

Provide 3-4 insights about cardiovascular health and activity patterns.`;
    } else if (data_type === 'stress') {
      prompt = `Analyze stress level data:
Average stress: ${avg.toFixed(0)} (0-100 scale)
Trend: ${trend} by ${trendPercentage}%

Provide 3-4 insights about stress patterns and management recommendations.`;
    } else if (data_type === 'steps') {
      prompt = `Analyze daily steps data:
Average: ${avg.toFixed(0)} steps/day
Trend: ${trend} by ${trendPercentage}%

Provide 3-4 insights about activity levels and recommendations.`;
    }

    const insights = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                severity: { type: "string", enum: ["positive", "neutral", "concern"] },
                recommendation: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      statistics: {
        average: Math.round(avg * 100) / 100,
        max,
        min,
        trend,
        trend_percentage: parseFloat(trendPercentage)
      },
      insights: insights.insights || [],
      data_points: data.length
    });

  } catch (error) {
    console.error('Wearable analysis error:', error);
    return Response.json({ 
      error: error.message || 'Failed to analyze data'
    }, { status: 500 });
  }
});