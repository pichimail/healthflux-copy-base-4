import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pill, Activity, TestTube, CheckCircle, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExtractedDataReview({ document, onAddMedication, onAddVital, onAddLabResult }) {
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  const hasMedications = document.extracted_medications?.length > 0;
  const hasVitals = document.extracted_vitals?.length > 0;
  const hasLabResults = document.extracted_lab_results?.length > 0;

  if (!hasMedications && !hasVitals && !hasLabResults) {
    return null;
  }

  const handleAdd = async (id, type, data) => {
    setAddingId(id);
    try {
      if (type === 'medication') await onAddMedication(data);
      if (type === 'vital') await onAddVital(data);
      if (type === 'lab') await onAddLabResult(data);
      setAddedIds(new Set([...addedIds, id]));
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully`);
    } catch (error) {
      console.error('Error adding:', error);
      toast.error(`Failed to add ${type}`);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {hasMedications && (
        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#F7C9A3' }}>
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-[#0A0A0A] flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Extracted Medications ({document.extracted_medications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {document.extracted_medications.map((med, idx) => {
                const itemId = `med-${idx}`;
                const isAdded = addedIds.has(itemId);
                const isAdding = addingId === itemId;
                return (
                  <div key={idx} className="p-3 bg-white rounded-xl flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-[#0A0A0A] text-sm">{med.name}</p>
                      <p className="text-xs text-gray-600">{med.dosage} • {med.frequency}</p>
                      {med.purpose && <p className="text-xs text-gray-500 mt-1">{med.purpose}</p>}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleAdd(itemId, 'medication', med)}
                      disabled={isAdding || isAdded}
                      className={`rounded-xl text-xs ${isAdded ? 'bg-green-50 border-green-200' : ''}`}
                    >
                      {isAdding ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isAdded ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {hasVitals && (
        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#9BB4FF' }}>
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-[#0A0A0A] flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Extracted Vitals ({document.extracted_vitals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {document.extracted_vitals.map((vital, idx) => {
                const itemId = `vital-${idx}`;
                const isAdded = addedIds.has(itemId);
                const isAdding = addingId === itemId;
                return (
                  <div key={idx} className="p-3 bg-white rounded-xl flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-[#0A0A0A] text-sm capitalize">{vital.type?.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-600">
                        {vital.systolic ? `${vital.systolic}/${vital.diastolic}` : vital.value} {vital.unit}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleAdd(itemId, 'vital', vital)}
                      disabled={isAdding || isAdded}
                      className={`rounded-xl text-xs ${isAdded ? 'bg-green-50 border-green-200' : ''}`}
                    >
                      {isAdding ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isAdded ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {hasLabResults && (
        <Card className="border-0 shadow-sm rounded-2xl" style={{ backgroundColor: '#EFF1ED' }}>
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-[#0A0A0A] flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Extracted Lab Results ({document.extracted_lab_results.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {document.extracted_lab_results.map((lab, idx) => {
                const itemId = `lab-${idx}`;
                const isAdded = addedIds.has(itemId);
                const isAdding = addingId === itemId;
                const flag = calculateFlag(lab.value, lab.reference_low, lab.reference_high);
                return (
                  <div key={idx} className="p-3 bg-white rounded-xl flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-[#0A0A0A] text-sm">{lab.name}</p>
                      <p className="text-xs text-gray-600">
                        {lab.value} {lab.unit}
                        {(lab.reference_low || lab.reference_high) && (
                          <span className="ml-2 text-gray-500">
                            (Ref: {lab.reference_low || '?'}-{lab.reference_high || '?'})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {flag === 'normal' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleAdd(itemId, 'lab', lab)}
                        disabled={isAdding || isAdded}
                        className={`rounded-xl text-xs ${isAdded ? 'bg-green-50 border-green-200' : ''}`}
                      >
                        {isAdding ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isAdded ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function calculateFlag(value, refLow, refHigh) {
  const val = parseFloat(value);
  const low = refLow ? parseFloat(refLow) : null;
  const high = refHigh ? parseFloat(refHigh) : null;

  if (isNaN(val)) return 'normal';
  if (low !== null && val < low) return 'low';
  if (high !== null && val > high) return 'high';
  return 'normal';
}