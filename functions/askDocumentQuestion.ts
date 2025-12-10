import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id, profile_id, question, conversation_history = [] } = await req.json();

    if (!document_id || !profile_id || !question) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch the document
    const documents = await base44.entities.MedicalDocument.filter({ id: document_id });
    if (documents.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    const document = documents[0];

    // Fetch related data for context
    const labResults = await base44.entities.LabResult.filter({ 
      profile_id: profile_id,
      document_id: document_id 
    });

    const vitals = await base44.entities.VitalMeasurement.filter({ 
      profile_id: profile_id 
    });

    const medications = await base44.entities.Medication.filter({ 
      profile_id: profile_id 
    });

    // Build comprehensive context
    const documentContext = {
      title: document.title,
      type: document.document_type,
      date: document.document_date,
      facility: document.facility_name,
      doctor: document.doctor_name,
      summary: document.ai_summary,
      health_score: document.health_score,
      risk_factors: document.risk_factors,
      preventive_plan: document.preventive_plan,
      extracted_medications: document.extracted_medications,
      extracted_vitals: document.extracted_vitals,
      extracted_lab_results: document.extracted_lab_results,
      related_lab_results: labResults.slice(0, 10),
      recent_vitals: vitals.slice(0, 5),
      current_medications: medications.filter(m => m.is_active).slice(0, 10)
    };

    // Build conversation context
    let conversationContext = '';
    if (conversation_history.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n' + 
        conversation_history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    }

    const prompt = `You are a medical AI assistant helping a patient understand their health document. 

Document Information:
${JSON.stringify(documentContext, null, 2)}
${conversationContext}

Patient Question: ${question}

Provide a clear, helpful, and empathetic response. If discussing medical findings:
- Explain in plain language
- Highlight what's normal vs. concerning
- Provide context and actionable advice
- Remind them to consult their healthcare provider for medical decisions
- Reference specific values and findings from the document

If the document contains the information they're asking about, cite it directly.`;

    const answer = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: document.file_url ? [document.file_url] : []
    });

    return Response.json({ answer });
  } catch (error) {
    console.error('Error in askDocumentQuestion:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});