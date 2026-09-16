'use client';

import React from 'react';
import {
  IconCalendar,
  IconClock,
  IconFileText,
  IconTag,
  IconTrash,
} from '@tabler/icons-react';
import { HrModal, HrButton } from '@/features/hr/_shared/components';
import type { CalendarEvent } from './AddEventModal';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onDeleteEvent?: (id: string | number) => Promise<void> | void;
}

const typeStyles: Record<
  CalendarEvent['type'],
  { label: string; bg: string; text: string; border: string }
> = {
  holiday: {
    label: 'Holiday / Office Closed',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  event: {
    label: 'Company Event',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  celebration: {
    label: 'Celebration / Festival',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  meeting: {
    label: 'Meeting / Conference',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
};

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onDeleteEvent,
}) => {
  const [deleting, setDeleting] = React.useState(false);

  if (!event) return null;

  const style = typeStyles[event.type] || typeStyles.event;

  const formattedDate = (() => {
    try {
      const parts = event.date.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      return event.date;
    } catch {
      return event.date;
    }
  })();

  const handleDelete = async () => {
    if (!onDeleteEvent) return;
    setDeleting(true);
    try {
      await onDeleteEvent(event.id);
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <HrModal
      open={!!event}
      onClose={onClose}
      title={event.title}
      description={style.label}
      icon={IconCalendar}
      iconTone={event.type === 'holiday' ? 'danger' : 'primary'}
      size="sm"
      footer={
        <div className="flex w-full items-center justify-between">
          {onDeleteEvent ? (
            <HrButton
              variant="danger"
              icon={IconTrash}
              loading={deleting}
              onClick={handleDelete}
            >
              Delete Event
            </HrButton>
          ) : (
            <div />
          )}
          <HrButton variant="outline" onClick={onClose}>
            Close
          </HrButton>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${style.bg} ${style.text} ${style.border}`}
          >
            <IconTag className="h-3 w-3" />
            {style.label}
          </span>
          {event.isDbHoliday && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
              System Holiday
            </span>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/60 p-3.5 text-sm">
          <div className="flex items-center gap-2.5 text-gray-700">
            <IconCalendar className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="font-medium">{formattedDate}</span>
          </div>

          {event.time && (
            <div className="flex items-center gap-2.5 text-gray-700">
              <IconClock className="h-4 w-4 text-gray-400 shrink-0" />
              <span>{event.time}</span>
            </div>
          )}
        </div>

        {event.description && (
          <div className="space-y-1">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <IconFileText className="h-3.5 w-3.5 text-gray-400" />
              Notes & Description
            </h4>
            <p className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        )}
      </div>
    </HrModal>
  );
};

export default EventDetailModal;
