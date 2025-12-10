import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { profile, report_period, medications, side_effects, vitals_trends, lab_results, summary } = body;

    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = doc.internal.pageSize.width - 2 * margin;

    const checkPageBreak = (neededSpace = 20) => {
      if (yPos + neededSpace > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Header
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, doc.internal.pageSize.width, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Healthcare Provider Report', margin, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprehensive Health Summary', margin, 28);
    
    yPos = 50;
    doc.setTextColor(0, 0, 0);

    // Patient Information Section
    doc.setFillColor(244, 244, 242);
    doc.rect(margin, yPos - 5, contentWidth, 30, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information', margin + 5, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${profile.name}`, margin + 5, yPos);
    yPos += 6;
    if (profile.date_of_birth) {
      doc.text(`Date of Birth: ${new Date(profile.date_of_birth).toLocaleDateString()}`, margin + 5, yPos);
      yPos += 6;
    }
    if (profile.gender) {
      doc.text(`Gender: ${profile.gender}`, margin + 5, yPos);
      yPos += 6;
    }
    if (profile.blood_group) {
      doc.text(`Blood Group: ${profile.blood_group}`, margin + 80, yPos - 6);
    }
    yPos += 8;

    // Report Period
    checkPageBreak();
    doc.setFillColor(229, 244, 106);
    doc.rect(margin, yPos - 5, contentWidth, 12, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Report Period: ${report_period.days} Days`, margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${new Date(report_period.start_date).toLocaleDateString()} - ${new Date(report_period.end_date).toLocaleDateString()}`, margin + 5, yPos + 5);
    yPos += 18;

    // Allergies and Conditions
    if (profile.allergies?.length > 0 || profile.chronic_conditions?.length > 0) {
      checkPageBreak(20);
      doc.setFillColor(254, 226, 226);
      doc.rect(margin, yPos - 5, contentWidth, 3, 'F');
      yPos += 3;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠️ Allergies & Conditions', margin + 5, yPos);
      yPos += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (profile.allergies?.length > 0) {
        doc.text(`Allergies: ${profile.allergies.join(', ')}`, margin + 5, yPos);
        yPos += 5;
      }
      if (profile.chronic_conditions?.length > 0) {
        doc.text(`Conditions: ${profile.chronic_conditions.join(', ')}`, margin + 5, yPos);
        yPos += 5;
      }
      yPos += 8;
    }

    // Current Medications Section
    if (medications.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(219, 234, 254);
      doc.rect(margin, yPos - 5, contentWidth, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Current Medications', margin + 5, yPos);
      yPos += 12;

      medications.forEach((med, idx) => {
        checkPageBreak(40);
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPos - 3, contentWidth, 30, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${med.name}`, margin + 5, yPos);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Dosage: ${med.dosage} | Frequency: ${med.frequency}`, margin + 5, yPos);
        yPos += 5;
        if (med.purpose) {
          doc.text(`Purpose: ${med.purpose}`, margin + 5, yPos);
          yPos += 5;
        }
        
        // Adherence bar
        const barWidth = 50;
        const adherence = med.adherence || 0;
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin + 5, yPos, barWidth, 4);
        const fillColor = adherence >= 80 ? [34, 197, 94] : adherence >= 60 ? [251, 191, 36] : [239, 68, 68];
        doc.setFillColor(...fillColor);
        doc.rect(margin + 5, yPos, (barWidth * adherence) / 100, 4, 'F');
        doc.setFontSize(8);
        doc.text(`Adherence: ${adherence}%`, margin + 60, yPos + 3);
        
        if (med.effectiveness_rating) {
          doc.text(`Effectiveness: ${med.effectiveness_rating}/5.0 ⭐`, margin + 100, yPos + 3);
        }
        yPos += 12;
      });
      yPos += 5;
    }

    // Vitals Trends Section
    if (Object.keys(vitals_trends).length > 0) {
      checkPageBreak(30);
      doc.setFillColor(220, 252, 231);
      doc.rect(margin, yPos - 5, contentWidth, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Vital Signs Trends', margin + 5, yPos);
      yPos += 12;

      Object.entries(vitals_trends).forEach(([type, readings]) => {
        if (readings.length === 0) return;
        checkPageBreak(25);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(type.replace(/_/g, ' ').toUpperCase(), margin + 5, yPos);
        yPos += 7;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const latest = readings[readings.length - 1];
        const oldest = readings[0];
        
        if (type === 'blood_pressure' && latest.systolic && latest.diastolic) {
          doc.text(`Latest: ${latest.systolic}/${latest.diastolic} mmHg`, margin + 5, yPos);
          yPos += 5;
          if (oldest.systolic && oldest.diastolic) {
            const change = latest.systolic - oldest.systolic;
            const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
            doc.text(`Trend: ${arrow} ${Math.abs(change)} mmHg from ${report_period.days}d ago`, margin + 5, yPos);
          }
        } else if (latest.value) {
          doc.text(`Latest: ${latest.value} ${latest.unit || ''}`, margin + 5, yPos);
          yPos += 5;
          if (oldest.value) {
            const change = latest.value - oldest.value;
            const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
            doc.text(`Trend: ${arrow} ${Math.abs(change.toFixed(1))} ${latest.unit || ''} from ${report_period.days}d ago`, margin + 5, yPos);
          }
        }
        yPos += 8;
      });
      yPos += 5;
    }

    // Lab Results Section
    if (lab_results.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(254, 243, 199);
      doc.rect(margin, yPos - 5, contentWidth, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Laboratory Results', margin + 5, yPos);
      yPos += 12;

      const abnormalLabs = lab_results.filter(l => l.flag !== 'normal');
      
      if (abnormalLabs.length > 0) {
        doc.setFillColor(254, 226, 226);
        doc.rect(margin, yPos - 3, contentWidth, 8, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`⚠️ ${abnormalLabs.length} Abnormal Results Require Attention`, margin + 5, yPos + 3);
        yPos += 12;
      }

      lab_results.slice(0, 15).forEach((lab, idx) => {
        checkPageBreak(15);
        
        const isAbnormal = lab.flag !== 'normal';
        if (isAbnormal) {
          doc.setFillColor(254, 226, 226);
          doc.rect(margin, yPos - 3, contentWidth, 10, 'F');
        }
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(lab.test_name, margin + 5, yPos);
        yPos += 5;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Value: ${lab.value} ${lab.unit}`, margin + 5, yPos);
        
        if (lab.reference_low && lab.reference_high) {
          doc.text(`Range: ${lab.reference_low}-${lab.reference_high}`, margin + 70, yPos);
        }
        
        if (isAbnormal) {
          doc.setFont('helvetica', 'bold');
          doc.text(`[${lab.flag.toUpperCase()}]`, margin + 130, yPos);
          doc.setFont('helvetica', 'normal');
        }
        
        yPos += 8;
      });
      yPos += 5;
    }

    // Side Effects Section
    if (side_effects.length > 0) {
      checkPageBreak(30);
      doc.setFillColor(254, 215, 170);
      doc.rect(margin, yPos - 5, contentWidth, 10, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Reported Side Effects', margin + 5, yPos);
      yPos += 12;

      const severeCases = side_effects.filter(se => se.severity === 'severe' || se.severity === 'life_threatening');
      if (severeCases.length > 0) {
        doc.setFillColor(254, 226, 226);
        doc.rect(margin, yPos - 3, contentWidth, 8, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`⚠️ ${severeCases.length} Severe Side Effects Reported`, margin + 5, yPos + 3);
        yPos += 12;
      }

      side_effects.slice(0, 10).forEach((se, idx) => {
        checkPageBreak(20);
        
        const isSevere = se.severity === 'severe' || se.severity === 'life_threatening';
        if (isSevere) {
          doc.setFillColor(254, 226, 226);
          doc.rect(margin, yPos - 3, contentWidth, 15, 'F');
        }
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${se.medication} - ${se.symptom}`, margin + 5, yPos);
        yPos += 5;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Severity: ${se.severity.toUpperCase()}`, margin + 5, yPos);
        doc.text(`Date: ${new Date(se.onset_time).toLocaleDateString()}`, margin + 70, yPos);
        yPos += 5;
        
        if (se.notes) {
          const notes = se.notes.substring(0, 80) + (se.notes.length > 80 ? '...' : '');
          doc.text(`Notes: ${notes}`, margin + 5, yPos);
          yPos += 5;
        }
        
        yPos += 8;
      });
      yPos += 5;
    }

    // Summary and Recommendations
    checkPageBreak(40);
    doc.setFillColor(233, 213, 255);
    doc.rect(margin, yPos - 5, contentWidth, 10, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Summary & Discussion Points', margin + 5, yPos);
    yPos += 12;

    doc.setFillColor(249, 250, 251);
    doc.rect(margin, yPos - 3, contentWidth, 25, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`✓ ${summary.total_medications} active medications tracked`, margin + 5, yPos);
    yPos += 5;
    doc.text(`✓ ${summary.total_doses_logged} medication doses logged`, margin + 5, yPos);
    yPos += 5;
    doc.text(`✓ ${summary.total_vitals_recorded} vital measurements recorded`, margin + 5, yPos);
    yPos += 5;
    doc.text(`✓ ${summary.total_lab_tests} laboratory tests on file`, margin + 5, yPos);
    yPos += 5;
    doc.text(`✓ ${summary.total_side_effects} side effects documented`, margin + 5, yPos);
    yPos += 10;

    // Discussion Points
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Discussion Points:', margin + 5, yPos);
    yPos += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const discussionPoints = [];
    if (medications.some(m => m.adherence < 80)) {
      discussionPoints.push('Review adherence challenges and potential barriers');
    }
    if (side_effects.some(se => se.severity === 'severe' || se.severity === 'life_threatening')) {
      discussionPoints.push('Address severe side effects and consider alternatives');
    }
    if (lab_results.some(l => l.flag !== 'normal')) {
      discussionPoints.push('Discuss abnormal lab results and follow-up testing');
    }
    if (medications.some(m => m.effectiveness_rating && parseFloat(m.effectiveness_rating) < 3.0)) {
      discussionPoints.push('Evaluate effectiveness of current treatment regimen');
    }
    discussionPoints.push('Review current symptoms and treatment goals');
    discussionPoints.push('Discuss lifestyle modifications and preventive care');

    discussionPoints.forEach((point, idx) => {
      checkPageBreak(6);
      doc.text(`• ${point}`, margin + 5, yPos);
      yPos += 6;
    });

    // Footer
    yPos = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Generated by HealthFlux', margin, yPos);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - margin - 40, yPos);
    doc.text('This report is for healthcare provider use only. Contains patient confidential information.', margin, yPos + 5);

    const pdfBuffer = doc.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    return Response.json({ 
      pdfBase64,
      success: true 
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});