import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id, query } = await req.json();

    if (!profile_id || !query) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const allDocuments = await base44.entities.MedicalDocument.filter({ profile_id: profile_id });

    if (allDocuments.length === 0) {
      return Response.json({ results: [] });
    }

    const documentContext = allDocuments.map(doc => ({
      id: doc.id,
      title: doc.title,
      document_type: doc.document_type,
      facility_name: doc.facility_name,
      doctor_name: doc.doctor_name,
      document_date: doc.document_date,
      summary: doc.ai_summary || `${doc.document_type} from ${doc.facility_name || 'unknown facility'} dated ${doc.document_date || 'unknown date'}`
    }));

    const searchPrompt = `You are helping a user search their medical documents. Here are their documents:

${JSON.stringify(documentContext, null, 2)}

User query: "${query}"

Identify up to 5 most relevant document IDs that match this query. Consider document type, facility, doctor, date, and content summary. Return ONLY an array of document IDs as strings.

Example output: ["doc_id_1", "doc_id_3"]`;

    const relevantDocIds = await base44.integrations.Core.InvokeLLM({
      prompt: searchPrompt,
      response_json_schema: {
        type: "array",
        items: { type: "string" }
      }
    });

    const results = allDocuments.filter(doc => relevantDocIds.includes(doc.id));

    return Response.json({ results });
  } catch (error) {
    console.error('Error in aiDocumentSearch:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});