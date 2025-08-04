import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export type TimeOffType = 'sick-leave' | 'day-off' | 'weekend' | 'available' | 'annual' | 'travel' | 'mission';

export interface TimeOffEntry {
  id: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
  type: TimeOffType;
  notes?: string;
}

interface StaffCalendarProps {
  entries: TimeOffEntry[];
  selectedEmployee?: string;
  onDateSelect?: (date: Date) => void;
  className?: string;
}

const typeColors: Record<TimeOffType, string> = {
  'sick-leave': 'bg-sick-leave text-sick-leave-foreground',
  'day-off': 'bg-day-off text-day-off-foreground',
  'weekend': 'bg-weekend text-weekend-foreground',
  'available': 'bg-available text-available-foreground',
  'annual': 'bg-annual text-annual-foreground',
  'travel': 'bg-travel text-travel-foreground',
  'mission': 'bg-mission text-mission-foreground',
};

const typeLabels: Record<TimeOffType, string> = {
  'sick-leave': 'Sick Leave',
  'day-off': 'Day Off',
  'weekend': 'Weekend',
  'available': 'Available',
  'annual': 'Annual',
  'travel': 'Travel',
  'mission': 'Mission',
};

export function StaffCalendar({ entries, selectedEmployee, onDateSelect, className }: StaffCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const getEntriesForDate = (date: Date) => {
    return entries.filter(entry => {
      const isInRange = isWithinInterval(startOfDay(date), {
        start: startOfDay(entry.startDate),
        end: endOfDay(entry.endDate)
      });
      return isInRange && (!selectedEmployee || selectedEmployee === 'all' || entry.employeeId === selectedEmployee);
    });
  };

  const getDayContent = (date: Date) => {
    const dayEntries = getEntriesForDate(date);
    if (dayEntries.length === 0) return null;

    return (
      <div className="w-full mt-1 space-y-1">
        {dayEntries.slice(0, 2).map((entry, index) => (
          <div
            key={entry.id}
            className={cn(
              'w-full h-1.5 rounded-sm',
              typeColors[entry.type].split(' ')[0]
            )}
          />
        ))}
        {dayEntries.length > 2 && (
          <div className="text-xs text-muted-foreground text-center">
            +{dayEntries.length - 2} more
          </div>
        )}
      </div>
    );
  };

  const selectedDateEntries = selectedDate ? getEntriesForDate(selectedDate) : [];

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Staff Schedule Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  if (date && onDateSelect) {
                    onDateSelect(date);
                  }
                }}
                className="w-full"
                components={{
                  DayContent: ({ date }) => (
                    <div className="relative w-full h-full flex flex-col items-center justify-start p-1">
                      <span className="text-sm font-medium">{date.getDate()}</span>
                      {getDayContent(date)}
                    </div>
                  ),
                }}
                classNames={{
                  day: "h-16 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Schedule Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.entries(typeLabels) as [TimeOffType, string][]).map(([type, label]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={cn('w-4 h-4 rounded', typeColors[type].split(' ')[0])} />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateEntries.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDateEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between">
                        <Badge className={typeColors[entry.type]}>
                          {typeLabels[entry.type]}
                        </Badge>
                        {entry.notes && (
                          <span className="text-xs text-muted-foreground">{entry.notes}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No schedule entries for this date</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}