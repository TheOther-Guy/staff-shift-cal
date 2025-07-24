import React, { useState, useMemo } from 'react';
import { StaffCalendar, TimeOffEntry, TimeOffType } from '@/components/StaffCalendar';
import { AddTimeOffDialog } from '@/components/AddTimeOffDialog';
import { FilterControls } from '@/components/FilterControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Calendar, TrendingUp } from 'lucide-react';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

// Mock data
const mockStores = ['Downtown Store', 'Mall Location', 'Westside Branch', 'Airport Shop'];

const mockEmployees = [
  { id: '1', name: 'John Smith', storeId: 'Downtown Store' },
  { id: '2', name: 'Sarah Johnson', storeId: 'Downtown Store' },
  { id: '3', name: 'Mike Davis', storeId: 'Mall Location' },
  { id: '4', name: 'Emma Wilson', storeId: 'Mall Location' },
  { id: '5', name: 'David Brown', storeId: 'Westside Branch' },
  { id: '6', name: 'Lisa Garcia', storeId: 'Westside Branch' },
  { id: '7', name: 'James Miller', storeId: 'Airport Shop' },
  { id: '8', name: 'Anna Taylor', storeId: 'Airport Shop' },
];

const generateMockEntries = (): TimeOffEntry[] => {
  const entries: TimeOffEntry[] = [];
  const types: TimeOffType[] = ['sick-leave', 'day-off', 'weekend', 'available'];
  
  for (let i = 0; i < 50; i++) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 60) - 30);
    
    const endDate = new Date(startDate);
    // Some entries span multiple days (1-3 days randomly)
    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 3));
    
    entries.push({
      id: `entry-${i}`,
      employeeId: mockEmployees[Math.floor(Math.random() * mockEmployees.length)].id,
      startDate,
      endDate,
      type: types[Math.floor(Math.random() * types.length)],
      notes: Math.random() > 0.7 ? 'Sample note' : undefined,
    });
  }
  
  return entries;
};

const Dashboard = () => {
  const [entries, setEntries] = useState<TimeOffEntry[]>(generateMockEntries());
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Store filter
      if (selectedStore !== 'all') {
        const employee = mockEmployees.find(emp => emp.id === entry.employeeId);
        if (!employee || employee.storeId !== selectedStore) return false;
      }

      // Employee filter
      if (selectedEmployee !== 'all' && entry.employeeId !== selectedEmployee) {
        return false;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const entryStartDate = startOfDay(entry.startDate);
        const entryEndDate = endOfDay(entry.endDate);
        const fromDate = dateFrom ? startOfDay(dateFrom) : new Date(0);
        const toDate = dateTo ? endOfDay(dateTo) : new Date();
        
        // Check if entry range overlaps with filter range
        const overlaps = entryStartDate <= toDate && entryEndDate >= fromDate;
        if (!overlaps) {
          return false;
        }
      }

      return true;
    });
  }, [entries, selectedStore, selectedEmployee, dateFrom, dateTo]);

  const handleAddEntry = (newEntry: Omit<TimeOffEntry, 'id'>) => {
    setEntries(prev => [
      ...prev,
      { ...newEntry, id: `entry-${Date.now()}` }
    ]);
  };

  const handleClearFilters = () => {
    setSelectedStore('all');
    setSelectedEmployee('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const stats = useMemo(() => {
    const totalEntries = filteredEntries.length;
    const sickLeave = filteredEntries.filter(e => e.type === 'sick-leave').length;
    const dayOffs = filteredEntries.filter(e => e.type === 'day-off').length;
    const weekends = filteredEntries.filter(e => e.type === 'weekend').length;

    return { totalEntries, sickLeave, dayOffs, weekends };
  }, [filteredEntries]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Schedule Manager</h1>
            <p className="text-muted-foreground">Manage employee time off, sick leave, and schedules</p>
          </div>
          <AddTimeOffDialog
            stores={mockStores}
            employees={mockEmployees}
            selectedStore={selectedStore !== 'all' ? selectedStore : undefined}
            onAddEntry={handleAddEntry}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold">{stats.totalEntries}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-sick-leave rounded-full" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sick Leave</p>
                  <p className="text-2xl font-bold">{stats.sickLeave}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-day-off rounded-full" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Day Offs</p>
                  <p className="text-2xl font-bold">{stats.dayOffs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-weekend rounded-full" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Weekends</p>
                  <p className="text-2xl font-bold">{stats.weekends}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <FilterControls
          stores={mockStores}
          employees={mockEmployees}
          selectedStore={selectedStore}
          selectedEmployee={selectedEmployee}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onStoreChange={setSelectedStore}
          onEmployeeChange={setSelectedEmployee}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClearFilters={handleClearFilters}
        />

        {/* Calendar */}
        <StaffCalendar
          entries={filteredEntries}
          selectedEmployee={selectedEmployee !== 'all' ? selectedEmployee : undefined}
        />
      </div>
    </div>
  );
};

export default Dashboard;