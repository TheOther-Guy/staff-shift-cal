import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimeOffType, TimeOffEntry } from './StaffCalendar';

interface Store {
  id: string;
  name: string;
  company_id: string;
}

interface Employee {
  id: string;
  name: string;
  store_id: string;
}

interface AddTimeOffDialogProps {
  stores: Store[];
  employees: Employee[];
  selectedStore?: string;
  onAddEntry: (entry: Omit<TimeOffEntry, 'id'>) => void;
}

export function AddTimeOffDialog({ stores, employees, selectedStore, onAddEntry }: AddTimeOffDialogProps) {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<TimeOffType>('day-off');
  const [notes, setNotes] = useState('');

  const filteredEmployees = selectedStore 
    ? employees.filter(emp => emp.store_id === selectedStore)
    : employees;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateRange?.from || !employeeId) return;

    onAddEntry({
      employeeId,
      startDate: dateRange.from,
      endDate: dateRange.to || dateRange.from,
      type,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setDateRange(undefined);
    setEmployeeId('');
    setType('day-off');
    setNotes('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Time Off
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Time Off Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {filteredEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Time Off Type</Label>
            <Select value={type} onValueChange={(value: TimeOffType) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day-off">Day Off</SelectItem>
                <SelectItem value="sick-leave">Sick Leave</SelectItem>
                <SelectItem value="weekend">Weekend</SelectItem>
                <SelectItem value="available">Available</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!dateRange?.from || !employeeId}>
              Add Entry
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}