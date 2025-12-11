import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { medication_id, profile_id } = await req.json();

    // Fetch medication and adherence data
    const [medication, logs] = await Promise.all([
      base44.entities.Medication.filter({ id: medication_id }).then(m => m[0]),
      base44.entities.MedicationLog.filter({ medication_id }, '-scheduled_time', 200),
    ]);

    if (!medication) {
      return Response.json({ error: 'Medication not found' }, { status: 404 });
    }

    // Calculate adherence rate
    const takenLogs = logs.filter(l => l.status === 'taken');
    const adherenceRate = logs.length > 0 ? takenLogs.length / logs.length : 1;

    // Calculate daily doses
    const dosesPerDay = medication.times?.length || 1;
    
    // Predict depletion date based on adherence
    const startDate = new Date(medication.start_date);
    const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
    const dosesTaken = takenLogs.length;
    const avgDosesPerDay = daysSinceStart > 0 ? dosesTaken / daysSinceStart : dosesPerDay;

    // Calculate when refill is needed (assuming 30-day supply)
    const daysSupplyRemaining = medication.refills_remaining > 0 ? 
      Math.floor((30 * dosesPerDay - (dosesTaken % (30 * dosesPerDay))) / avgDosesPerDay) : 0;
    
    const predictedDepletionDate = new Date();
    predictedDepletionDate.setDate(predictedDepletionDate.getDate() + daysSupplyRemaining);

    // Check if refill reminder already exists
    const existingReminders = await base44.entities.RefillReminder.filter({
      medication_id,
      status: 'pending'
    });

    let reminder;
    const refillDueDate = new Date(predictedDepletionDate);
    refillDueDate.setDate(refillDueDate.getDate() - 7); // Remind 7 days before

    if (existingReminders.length === 0 && daysSupplyRemaining <= 14 && medication.refills_remaining > 0) {
      // Create refill reminder
      reminder = await base44.entities.RefillReminder.create({
        medication_id,
        profile_id,
        refill_due_date: refillDueDate.toISOString().split('T')[0],
        pharmacy_name: medication.pharmacy,
        refills_remaining: medication.refills_remaining,
        status: 'pending',
        reminder_sent: false
      });

      // Send notification
      try {
        await base44.functions.invoke('sendNotification', {
          recipient_email: user.email,
          type: 'health',
          title: '💊 Medication Refill Reminder',
          message: `Time to refill ${medication.medication_name}. You have approximately ${daysSupplyRemaining} days of supply remaining.`,
          priority: 'medium',
          send_email: true
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    return Response.json({
      success: true,
      medication: medication.medication_name,
      adherence_rate: (adherenceRate * 100).toFixed(1),
      days_supply_remaining: daysSupplyRemaining,
      predicted_depletion_date: predictedDepletionDate.toISOString().split('T')[0],
      refill_due_date: refillDueDate.toISOString().split('T')[0],
      refills_remaining: medication.refills_remaining,
      reminder_created: !!reminder,
      should_order_refill: daysSupplyRemaining <= 7,
      auto_refill_recommendation: adherenceRate > 0.8 && medication.refills_remaining > 0 ? 
        'Good adherence - recommend setting up auto-refill with pharmacy' : 
        'Review adherence before setting up auto-refill'
    });

  } catch (error) {
    console.error('Refill automation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});