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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const filteredEmployees = selectedStore && selectedStore !== 'all'
    ? employees.filter(emp => emp.store_id === selectedStore)
    : employees;

  console.log('AddTimeOffDialog - employees:', employees);
  console.log('AddTimeOffDialog - selectedStore:', selectedStore);
  console.log('AddTimeOffDialog - filteredEmployees:', filteredEmployees);

  const createApprovalRequest = async (entry: Omit<TimeOffEntry, 'id'>) => {
    try {
      // Get employee details
      const employee = employees.find(emp => emp.id === entry.employeeId);
      if (!employee || !user) return;

      // Get the appropriate approver using the database function
      const { data: approverIdData, error: approverError } = await supabase
        .rpc('get_time_off_approver', { employee_id: entry.employeeId });

      if (approverError || !approverIdData) {
        console.error('Error getting approver:', approverError);
        toast.error('No approver found for this employee');
        return;
      }

      // Get approver details
      const { data: approverData } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .eq('user_id', approverIdData)
        .single();

      if (!approverData) {
        toast.error('Approver details not found');
        return;
      }

      const approver = approverData;

      // Create approval request
      const { data: approvalData, error: approvalError } = await supabase
        .from('approval_requests')
        .insert({
          type: entry.type === 'sick-leave' ? 'sick_leave' : 
                entry.type === 'annual' ? 'annual_leave' : 'time_off',
          requester_id: user.id,
          approver_id: approver.user_id,
          request_data: {
            employeeId: entry.employeeId,
            employeeName: employee.name,
            storeName: stores.find(s => s.id === employee.store_id)?.name || 'Unknown Store',
            startDate: entry.startDate.toISOString().split('T')[0],
            endDate: entry.endDate.toISOString().split('T')[0],
            type: entry.type,
            notes: entry.notes
          }
        })
        .select()
        .single();

      if (approvalError) {
        console.error('Error creating approval request:', approvalError);
        toast.error('Failed to create approval request');
        return;
      }

      // Send approval email
      const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
        body: {
          type: entry.type === 'sick-leave' ? 'sick_leave' : 
                entry.type === 'annual' ? 'annual_leave' : 'time_off',
          requesterName: user.user_metadata?.full_name || user.email || 'Unknown',
          requesterEmail: user.email || '',
          approverEmail: approver.email,
          approverName: approver.full_name,
          details: {
            employeeName: employee.name,
            storeName: stores.find(s => s.id === employee.store_id)?.name || 'Unknown Store',
            type: entry.type,
            startDate: entry.startDate.toISOString().split('T')[0],
            endDate: entry.endDate.toISOString().split('T')[0],
            notes: entry.notes
          },
          approvalId: approvalData.id
        }
      });

      if (emailError) {
        console.error('Error sending approval email:', emailError);
        toast.error('Approval request created but email notification failed');
      } else {
        toast.success('Time off request submitted for approval');
      }

    } catch (error) {
      console.error('Error in approval process:', error);
      toast.error('Failed to submit approval request');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateRange?.from || !employeeId || isSubmitting) return;

    setIsSubmitting(true);

    const entry = {
      employeeId,
      startDate: dateRange.from,
      endDate: dateRange.to || dateRange.from,
      type,
      notes: notes.trim() || undefined,
    };

    // Create approval request and send email
    await createApprovalRequest(entry);

    // Note: Entry will be added to calendar only after approval

    // Reset form
    setDateRange(undefined);
    setEmployeeId('');
    setType('day-off');
    setNotes('');
    setOpen(false);
    setIsSubmitting(false);
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
              <SelectContent className="bg-background border shadow-md z-50">
                {filteredEmployees.length === 0 ? (
                  <SelectItem value="no-employees" disabled>
                    No employees available
                  </SelectItem>
                ) : (
                  filteredEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))
                )}
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
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="mission">Mission</SelectItem>
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
            <Button type="submit" disabled={!dateRange?.from || !employeeId || isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Add Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}