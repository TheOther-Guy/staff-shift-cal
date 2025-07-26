import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, LogOut, Plus } from 'lucide-react';
import { StaffCalendar, TimeOffEntry } from '@/components/StaffCalendar';
import { FilterControls } from '@/components/FilterControls';
import { AddTimeOffDialog } from '@/components/AddTimeOffDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
}

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

export default function Dashboard() {
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeOffEntries, setTimeOffEntries] = useState<TimeOffEntry[]>([]);
  
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*');

      if (storesError) throw storesError;
      setStores(storesData || []);

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*');

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // Fetch time off entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_off_entries')
        .select(`
          *,
          employees!inner(
            id,
            name,
            stores!inner(
              id,
              name,
              company_id
            )
          )
        `);

      if (entriesError) throw entriesError;
      
      const formattedEntries: TimeOffEntry[] = (entriesData || []).map(entry => ({
        id: entry.id,
        employeeId: entry.employee_id,
        startDate: new Date(entry.start_date),
        endDate: new Date(entry.end_date),
        type: entry.type as 'sick-leave' | 'day-off' | 'weekend' | 'available',
        notes: entry.notes || undefined
      }));
      
      setTimeOffEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    }
  };

  const handleAddEntry = async (entry: Omit<TimeOffEntry, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('time_off_entries')
        .insert({
          employee_id: entry.employeeId,
          start_date: entry.startDate.toISOString().split('T')[0],
          end_date: entry.endDate.toISOString().split('T')[0],
          type: entry.type,
          notes: entry.notes
        })
        .select()
        .single();

      if (error) throw error;

      const newEntry: TimeOffEntry = {
        id: data.id,
        employeeId: data.employee_id,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        type: data.type as 'sick-leave' | 'day-off' | 'weekend' | 'available',
        notes: data.notes || undefined
      };

      setTimeOffEntries(prev => [...prev, newEntry]);
      
      toast({
        title: "Success",
        description: "Time off entry added successfully",
      });
    } catch (error) {
      console.error('Error adding entry:', error);
      toast({
        title: "Error",
        description: "Failed to add time off entry",
        variant: "destructive",
      });
    }
  };

  const filteredEntries = useMemo(() => {
    return timeOffEntries.filter(entry => {
      const employee = employees.find(emp => emp.id === entry.employeeId);
      if (!employee) return false;

      const store = stores.find(s => s.id === employee.store_id);
      if (!store) return false;

      // Filter by store access based on user role
      if (profile?.role === 'store_manager' && store.id !== profile.store_id) {
        return false;
      }

      if (profile?.role === 'company_manager' && store.company_id !== profile.company_id) {
        return false;
      }

      // Apply user filters
      if (selectedStore && selectedStore !== 'all' && employee.store_id !== selectedStore) return false;
      if (selectedEmployee && selectedEmployee !== 'all' && entry.employeeId !== selectedEmployee) return false;
      
      if (dateFrom && entry.endDate < dateFrom) return false;
      if (dateTo && entry.startDate > dateTo) return false;
      
      return true;
    });
  }, [timeOffEntries, employees, stores, profile, selectedStore, selectedEmployee, dateFrom, dateTo]);

  const availableStores = useMemo(() => {
    if (!profile) return [];
    
    if (profile.role === 'admin') {
      return stores;
    } else if (profile.role === 'company_manager') {
      return stores.filter(store => store.company_id === profile.company_id);
    } else {
      return stores.filter(store => store.id === profile.store_id);
    }
  }, [stores, profile]);

  const availableEmployees = useMemo(() => {
    const storeIds = availableStores.map(store => store.id);
    return employees.filter(emp => storeIds.includes(emp.store_id));
  }, [employees, availableStores]);

  const handleClearFilters = () => {
    setSelectedStore('all');
    setSelectedEmployee('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const stats = useMemo(() => {
    const totalEntries = filteredEntries.length;
    const sickLeave = filteredEntries.filter(entry => entry.type === 'sick-leave').length;
    const dayOff = filteredEntries.filter(entry => entry.type === 'day-off').length;
    const weekend = filteredEntries.filter(entry => entry.type === 'weekend').length;

    return { totalEntries, sickLeave, dayOff, weekend };
  }, [filteredEntries]);

  const exportToCSV = () => {
    const csvData = filteredEntries.map(entry => {
      const employee = employees.find(emp => emp.id === entry.employeeId);
      const store = stores.find(s => s.id === employee?.store_id);
      const company = companies.find(c => c.id === store?.company_id);
      
      return {
        'Company': company?.name || '',
        'Store': store?.name || '',
        'Employee': employee?.name || '',
        'Type': entry.type,
        'Start Date': entry.startDate.toLocaleDateString(),
        'End Date': entry.endDate.toLocaleDateString(),
        'Notes': entry.notes || ''
      };
    });

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Schedule Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile.full_name} ({profile.role.replace('_', ' ')})
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <AddTimeOffDialog 
              stores={availableStores}
              employees={availableEmployees}
              selectedStore={selectedStore}
              onAddEntry={handleAddEntry}
            />
            <Button onClick={() => window.location.href = '/profile'} variant="outline">
              Profile
            </Button>
            {(profile.role === 'admin' || profile.role === 'company_manager') && (
              <Button onClick={() => window.location.href = '/analytics'} variant="outline">
                Analytics
              </Button>
            )}
            {profile.role === 'admin' && (
              <Button onClick={() => window.location.href = '/admin'} variant="outline">
                Admin Panel
              </Button>
            )}
            <Button onClick={signOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEntries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sick Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sickLeave}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Off</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dayOff}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weekend}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <FilterControls
          stores={availableStores}
          employees={availableEmployees}
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
        <Card>
          <CardHeader>
            <CardTitle>Staff Calendar</CardTitle>
            <CardDescription>
              View time-off entries and schedule information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StaffCalendar
              entries={filteredEntries}
              selectedEmployee={selectedEmployee}
              onDateSelect={setSelectedDate}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}