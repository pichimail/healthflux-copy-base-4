import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { procedure, estimated_cost, policy_id } = await req.json();

    if (!procedure || !estimated_cost || !policy_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get insurance policy details
    const policies = await base44.entities.HealthInsurance.filter({ id: policy_id });
    
    if (policies.length === 0) {
      return Response.json({ error: 'Policy not found' }, { status: 404 });
    }

    const policy = policies[0];

    // Calculate costs based on policy
    let insurancePays = 0;
    let patientPays = 0;
    let breakdown = '';

    const deductible = policy.deductible || 0;
    const copay = policy.copay || 0;
    const outOfPocketMax = policy.out_of_pocket_max || Infinity;
    const totalCost = estimated_cost;

    // Simple cost calculation logic
    // In real-world, this would be much more complex with coinsurance, etc.
    
    // Check if covered service
    const isCovered = !policy.excluded_services?.some(s => 
      procedure.toLowerCase().includes(s.toLowerCase())
    );

    if (!isCovered) {
      patientPays = totalCost;
      breakdown = `${procedure} is not covered by your policy.\nYou pay: $${totalCost.toLocaleString()}`;
    } else {
      // Apply copay
      const copayAmount = Math.min(copay, totalCost);
      let remaining = totalCost - copayAmount;

      // Apply deductible
      const deductibleAmount = Math.min(deductible, remaining);
      remaining -= deductibleAmount;

      // Insurance pays 80% of remaining (common coinsurance)
      const insuranceShare = remaining * 0.8;
      const patientCoinsurance = remaining * 0.2;

      insurancePays = insuranceShare;
      patientPays = copayAmount + deductibleAmount + patientCoinsurance;

      // Cap at out-of-pocket max
      if (patientPays > outOfPocketMax) {
        insurancePays += (patientPays - outOfPocketMax);
        patientPays = outOfPocketMax;
      }

      breakdown = `Total Cost: $${totalCost.toLocaleString()}\n`;
      if (copayAmount > 0) breakdown += `Copay: $${copayAmount.toLocaleString()}\n`;
      if (deductibleAmount > 0) breakdown += `Deductible: $${deductibleAmount.toLocaleString()}\n`;
      breakdown += `Coinsurance (20%): $${patientCoinsurance.toFixed(2)}\n`;
      breakdown += `Insurance Covers: $${insurancePays.toFixed(2)}\n`;
      breakdown += `Your Total: $${patientPays.toFixed(2)}`;
    }

    // Use AI for additional insights
    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Given this insurance scenario:
- Procedure: ${procedure}
- Total Cost: $${totalCost}
- Policy Deductible: $${deductible}
- Copay: $${copay}
- Out-of-Pocket Max: $${outOfPocketMax}
- Covered Services: ${policy.covered_services?.join(', ')}
- Excluded: ${policy.excluded_services?.join(', ')}

Provide a brief 2-3 sentence analysis of this cost estimate and any tips for the patient.`,
      add_context_from_internet: false
    });

    return Response.json({
      total_cost: totalCost,
      insurance_pays: Math.round(insurancePays * 100) / 100,
      patient_pays: Math.round(patientPays * 100) / 100,
      breakdown,
      ai_insights: aiAnalysis,
      is_covered: isCovered
    });

  } catch (error) {
    console.error('Cost calculation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to calculate cost'
    }, { status: 500 });
  }
});