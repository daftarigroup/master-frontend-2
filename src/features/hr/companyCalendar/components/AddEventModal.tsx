'use client';

import React, { useState, useEffect } from 'react';
import {
  IconCalendar,
  IconClock,
  IconFileText,
  IconTag,
  IconPlus,
} from '@tabler/icons-react';
import { HrModal, HrButton } from '@/features/hr/_shared/components';
import { toast } from 'sonner';

export type CalendarEventType = 'holiday' | 'event' | 'celebration' | 'meeting';

export interface CalendarEvent {
  id: string | number;
  title: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  description?: string;
  time?: string;
  isDbHoliday?: boolean;
}

interface AddEventModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void> | void;
}

const EVENT_TYPES: { id: CalendarEventType; label: string; color: string }[] = [
  { id: 'holiday', label: 'Holiday', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'event', label: 'Company Event', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'celebration', label: 'Celebration / Festival', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'meeting', label: 'Meeting / Conference', color: 'bg-amber-50 text-amber-700 border-amber-200' },
];

export const AddEventModal: React.FC<AddEventModalProps> = ({
  open,
  onClose,
  defaultDate,
  onAddEvent,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<CalendarEventType>('event');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setType('event');
      setTime('');
      setDescription('');
    }
  }, [open, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter an event title');
      return;
    }
    if (!date) {
      toast.error('Please select a date');
      return;
    }

    setLoading(true);
    try {
      await onAddEvent({
        title: title.trim(),
        date,
        type,
        time: time.trim() || undefined,
        description: description.trim() || undefined,
      });
      toast.success('Event added successfully');
      onClose();
    } catch (err: any) {
      console.error('Failed to add event:', err);
      toast.error(err?.message || 'Failed to add event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <HrModal
      open={open}
      onClose={onClose}
      title="Add Calendar Event"
      description="Schedule a new holiday, celebration, or official company event"
      icon={IconCalendar}
      iconTone="primary"
      size="md"
      footer={
        <>
          <HrButton variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </HrButton>
          <HrButton
            variant="primary"
            loading={loading}
            icon={IconPlus}
            onClick={handleSubmit}
          >
            Add Event
          </HrButton>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {/* Title */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <IconFileText className="h-3.5 w-3.5 text-gray-500" />
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Annual Company Meet, Diwali Holiday, Townhall"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Event Type / Category */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <IconTag className="h-3.5 w-3.5 text-gray-500" />
            Event Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`rounded-lg border px-2.5 py-2 text-center text-xs font-medium transition-all ${
                  type === t.id
                    ? `${t.color} border-current ring-2 ring-blue-500/20 font-semibold shadow-sm`
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <IconCalendar className="h-3.5 w-3.5 text-gray-500" />
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <IconClock className="h-3.5 w-3.5 text-gray-500" />
              Time / Schedule
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g. 10:00 AM or All Day"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <IconFileText className="h-3.5 w-3.5 text-gray-500" />
            Description / Notes
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any relevant notes, agenda, or location details..."
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </form>
    </HrModal>
  );
};

export default AddEventModal;
