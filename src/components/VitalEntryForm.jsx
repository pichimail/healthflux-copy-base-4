import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Heart, Thermometer, Weight, Droplet } from 'lucide-react';

export default function VitalEntryForm({ profileId, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    vital_type: 'blood_pressure',
    systolic: '',
    diastolic: '',
    value: '',
    unit: 'mmHg',
    measured_at: new Date().toISOString().slice(0, 16),
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const vitalTypes = [
    { value: 'blood_pressure', label: 'Blood Pressure', icon: Activity, unit: 'mmHg' },
    { value: 'heart_rate', label: 'Heart Rate', icon: Heart, unit: 'bpm' },
    { value: 'temperature', label: 'Temperature', icon: Thermometer, unit: '°F' },
    { value: 'weight', label: 'Weight', icon: Weight, unit: 'lbs' },
    { value: 'blood_glucose', label: 'Blood Glucose', icon: Droplet, unit: 'mg/dL' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        profile_id: profileId,
        vital_type: formData.vital_type,
        measured_at: formData.measured_at,
        notes: formData.notes,
        source: 'manual',
      };

      if (formData.vital_type === 'blood_pressure') {
        data.systolic = parseFloat(formData.systolic);
        data.diastolic = parseFloat(formData.diastolic);
        data.unit = 'mmHg';
      } else {
        data.value = parseFloat(formData.value);
        data.unit = formData.unit;
      }

      await base44.entities.VitalMeasurement.create(data);
      onSuccess?.();
    } catch (error) {
      console.error('Error logging vital:', error);
      alert('Failed to log vital. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentType = vitalTypes.find(v => v.value === formData.vital_type);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Vital Type</Label>
        <Select
          value={formData.vital_type}
          onValueChange={(value) => {
            const type = vitalTypes.find(v => v.value === value);
            setFormData({ 
              ...formData, 
              vital_type: value, 
              unit: type?.unit || '',
              systolic: '',
              diastolic: '',
              value: '',
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {vitalTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <type.icon className="w-4 h-4" />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.vital_type === 'blood_pressure' ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Systolic</Label>
            <Input
              type="number"
              placeholder="120"
              value={formData.systolic}
              onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Diastolic</Label>
            <Input
              type="number"
              placeholder="80"
              value={formData.diastolic}
              onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
              required
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Value</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              placeholder="Enter value"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              required
              className="flex-1"
            />
            <Input
              value={currentType?.unit}
              disabled
              className="w-20"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Date & Time</Label>
        <Input
          type="datetime-local"
          value={formData.measured_at}
          onChange={(e) => setFormData({ ...formData, measured_at: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Notes (Optional)</Label>
        <Input
          placeholder="Any additional notes..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-green-500 to-teal-500">
          {loading ? 'Logging...' : 'Log Vital'}
        </Button>
      </div>
    </form>
  );
}