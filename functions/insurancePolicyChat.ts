import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { policy_id, question } = await req.json();

    if (!policy_id || !question) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get policy details
    const policies = await base44.entities.HealthInsurance.filter({ id: policy_id });
    
    if (policies.length === 0) {
      return Response.json({ error: 'Policy not found' }, { status: 404 });
    }

    const policy = policies[0];

    // Create context from policy
    const context = `
Insurance Policy Information:
- Provider: ${policy.provider_name}
- Policy Number: ${policy.policy_number}
- Type: ${policy.policy_type}
- Coverage Period: ${policy.coverage_start_date} to ${policy.coverage_end_date}
- Premium: $${policy.premium_amount}
- Deductible: $${policy.deductible}
- Copay: $${policy.copay}
- Out-of-Pocket Max: $${policy.out_of_pocket_max}
- Covered Services: ${policy.covered_services?.join(', ')}
- Excluded Services: ${policy.excluded_services?.join(', ')}
- Claims Process: ${policy.claims_process_description}
- Contact: Phone: ${policy.insurer_contact_details?.phone}, Email: ${policy.insurer_contact_details?.email}
`;

    // Get AI response
    const answer = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful insurance policy assistant. Answer the user's question about their health insurance policy clearly and accurately.

${context}

User Question: ${question}

Provide a clear, helpful answer. If the information isn't in the policy details, say so and suggest contacting the insurer.`,
      add_context_from_internet: false
    });

    return Response.json({
      answer,
      policy_reference: {
        provider: policy.provider_name,
        policy_number: policy.policy_number
      }
    });

  } catch (error) {
    console.error('Policy chat error:', error);
    return Response.json({ 
      error: error.message || 'Failed to answer question'
    }, { status: 500 });
  }
});