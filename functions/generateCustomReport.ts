import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id, start_date, end_date, include_metrics, format } = await req.json();

    // Fetch profile
    const profile = await base44.asServiceRole.entities.Profile.filter({ id: profile_id }).then(p => p[0]);

    // Fetch data based on selected metrics
    const dataPromises = [];
    
    if (include_metrics.vitals) {
      dataPromises.push(base44.asServiceRole.entities.VitalMeasurement.filter({ profile_id }));
    }
    if (include_metrics.medications) {
      dataPromises.push(base44.asServiceRole.entities.Medication.filter({ profile_id }));
      dataPromises.push(base44.asServiceRole.entities.MedicationLog.filter({ profile_id }));
    }
    if (include_metrics.nutrition) {
      dataPromises.push(base44.asServiceRole.entities.MealLog.filter({ profile_id }));
    }
    if (include_metrics.labs) {
      dataPromises.push(base44.asServiceRole.entities.LabResult.filter({ profile_id }));
    }
    if (include_metrics.insights) {
      dataPromises.push(base44.asServiceRole.entities.HealthInsight.filter({ profile_id }));
    }

    const results = await Promise.all(dataPromises);
    
    if (format === 'pdf') {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text('Health Analytics Report', 20, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
      doc.text(`Period: ${start_date} to ${end_date}`, 20, 35);
      doc.text(`Patient: ${profile.full_name}`, 20, 40);
      
      let y = 50;
      
      // Add sections based on included metrics
      if (include_metrics.vitals && results[0]?.length > 0) {
        doc.setFontSize(14);
        doc.text('Vital Signs Summary', 20, y);
        y += 10;
        doc.setFontSize(10);
        doc.text(`Total measurements: ${results[0].length}`, 30, y);
        y += 10;
      }
      
      const pdfBytes = doc.output('arraybuffer');
      
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=health-report.pdf'
        }
      });
    } else {
      // CSV format
      let csv = 'Date,Metric,Value,Unit\n';
      
      // Add data rows
      if (include_metrics.vitals && results[0]) {
        results[0].forEach(v => {
          csv += `${v.measured_at},${v.vital_type},${v.value || `${v.systolic}/${v.diastolic}`},${v.unit || 'mmHg'}\n`;
        });
      }
      
      return Response.json({
        success: true,
        report_content: csv
      });
    }

  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});