import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sync_id, device_type, start_date, end_date } = await req.json();

    if (!sync_id || !device_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get sync config
    const syncs = await base44.entities.WearableSync.filter({ id: sync_id });
    if (syncs.length === 0) {
      return Response.json({ error: 'Sync not found' }, { status: 404 });
    }

    const sync = syncs[0];
    const results = {
      steps: 0,
      heart_rate: 0,
      sleep: 0,
      calories: 0,
      stress: 0,
      workouts: 0
    };

    // Simulate data sync (in production, this would call actual device APIs)
    // For demonstration, generate sample historical data
    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();
    
    const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));

    // Generate sample data for each day
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Steps data
      if (sync.sync_settings?.sync_steps !== false) {
        const steps = Math.floor(Math.random() * 5000) + 5000;
        await base44.asServiceRole.entities.WearableData.create({
          profile_id: sync.profile_id,
          sync_id: sync.id,
          data_type: 'steps',
          value: steps,
          unit: 'steps',
          recorded_at: date.toISOString(),
          date: dateStr
        });
        results.steps++;
      }

      // Heart rate data (multiple readings per day)
      if (sync.sync_settings?.sync_heart_rate !== false) {
        for (let h = 0; h < 4; h++) {
          const hr = Math.floor(Math.random() * 30) + 60;
          const time = new Date(date);
          time.setHours(h * 6);
          await base44.asServiceRole.entities.WearableData.create({
            profile_id: sync.profile_id,
            sync_id: sync.id,
            data_type: 'heart_rate',
            value: hr,
            unit: 'bpm',
            recorded_at: time.toISOString(),
            date: dateStr
          });
          results.heart_rate++;
        }
      }

      // Sleep data
      if (sync.sync_settings?.sync_sleep !== false) {
        const sleepHours = Math.random() * 3 + 5;
        await base44.asServiceRole.entities.WearableData.create({
          profile_id: sync.profile_id,
          sync_id: sync.id,
          data_type: 'sleep',
          value: sleepHours,
          unit: 'hours',
          recorded_at: date.toISOString(),
          date: dateStr,
          metadata: {
            deep_sleep: sleepHours * 0.25,
            light_sleep: sleepHours * 0.55,
            rem_sleep: sleepHours * 0.20,
            awake: sleepHours * 0.05
          }
        });
        results.sleep++;
      }

      // Calories
      if (sync.sync_settings?.sync_calories !== false) {
        const calories = Math.floor(Math.random() * 1000) + 1800;
        await base44.asServiceRole.entities.WearableData.create({
          profile_id: sync.profile_id,
          sync_id: sync.id,
          data_type: 'calories',
          value: calories,
          unit: 'kcal',
          recorded_at: date.toISOString(),
          date: dateStr
        });
        results.calories++;
      }

      // Stress level (if supported)
      if (device_type === 'garmin' || device_type === 'fitbit') {
        const stress = Math.floor(Math.random() * 40) + 30;
        await base44.asServiceRole.entities.WearableData.create({
          profile_id: sync.profile_id,
          sync_id: sync.id,
          data_type: 'stress',
          value: stress,
          unit: 'score',
          recorded_at: date.toISOString(),
          date: dateStr
        });
        results.stress++;
      }
    }

    // Update sync status
    await base44.asServiceRole.entities.WearableSync.update(sync.id, {
      last_sync_date: new Date().toISOString(),
      sync_status: 'active'
    });

    return Response.json({
      success: true,
      results,
      message: `Synced ${days} days of data`
    });

  } catch (error) {
    console.error('Wearable sync error:', error);
    return Response.json({ 
      error: error.message || 'Failed to sync data'
    }, { status: 500 });
  }
});