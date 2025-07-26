import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, Store, Users, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Navigate } from 'react-router-dom';

interface AnalyticsData {
  companies: Array<{
    id: string;
    name: string;
    storeCount: number;
    employeeCount: number;
    timeOffCount: number;
  }>;
  stores: Array<{
    id: string;
    name: string;
    company_name: string;
    employeeCount: number;
    timeOffCount: number;
  }>;
  employees: Array<{
    id: string;
    name: string;
    store_name: string;
    company_name: string;
    timeOffCount: number;
    sickLeaveCount: number;
    dayOffCount: number;
  }>;
}

export default function Analytics() {
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [data, setData] = useState<AnalyticsData>({
    companies: [],
    stores: [],
    employees: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile && (profile.role === 'admin' || profile.role === 'company_manager')) {
      fetchAnalytics();
    }
  }, [profile]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);

      // Fetch companies with counts
      const { data: companiesData } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          stores(
            id,
            employees(
              id,
              time_off_entries(id)
            )
          )
        `);

      // Fetch stores with employee and time-off counts
      let storesQuery = supabase
        .from('stores')
        .select(`
          id,
          name,
          company_id,
          companies(name),
          employees(
            id,
            time_off_entries(id)
          )
        `);

      // Filter by company for company managers
      if (profile?.role === 'company_manager' && profile?.company_id) {
        storesQuery = storesQuery.eq('company_id', profile.company_id);
      }

      const { data: storesData } = await storesQuery;

      // Fetch employees with time-off details
      let employeesQuery = supabase
        .from('employees')
        .select(`
          id,
          name,
          store_id,
          stores!inner(
            id,
            name,
            company_id,
            companies(name)
          ),
          time_off_entries(
            id,
            type
          )
        `);

      // Filter by company for company managers
      if (profile?.role === 'company_manager' && profile?.company_id) {
        employeesQuery = employeesQuery.eq('stores.company_id', profile.company_id);
      }

      const { data: employeesData } = await employeesQuery;

      // Process the data
      const processedCompanies = (companiesData || [])
        .filter(company => {
          // Filter companies for company managers
          if (profile?.role === 'company_manager') {
            return company.id === profile.company_id;
          }
          return true;
        })
        .map(company => ({
          id: company.id,
          name: company.name,
          storeCount: company.stores?.length || 0,
          employeeCount: company.stores?.reduce((acc, store) => acc + (store.employees?.length || 0), 0) || 0,
          timeOffCount: company.stores?.reduce((acc, store) => 
            acc + (store.employees?.reduce((empAcc, emp) => 
              empAcc + (emp.time_off_entries?.length || 0), 0) || 0), 0) || 0
        }));

      const processedStores = (storesData || []).map(store => ({
        id: store.id,
        name: store.name,
        company_name: store.companies?.name || '',
        employeeCount: store.employees?.length || 0,
        timeOffCount: store.employees?.reduce((acc, emp) => 
          acc + (emp.time_off_entries?.length || 0), 0) || 0
      }));

      const processedEmployees = (employeesData || []).map(employee => ({
        id: employee.id,
        name: employee.name,
        store_name: employee.stores?.name || '',
        company_name: employee.stores?.companies?.name || '',
        timeOffCount: employee.time_off_entries?.length || 0,
        sickLeaveCount: employee.time_off_entries?.filter(entry => entry.type === 'sick-leave').length || 0,
        dayOffCount: employee.time_off_entries?.filter(entry => entry.type === 'day-off').length || 0
      }));

      setData({
        companies: processedCompanies,
        stores: processedStores,
        employees: processedEmployees
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totals = useMemo(() => {
    return {
      companies: data.companies.length,
      stores: data.stores.length,
      employees: data.employees.length,
      timeOffEntries: data.employees.reduce((acc, emp) => acc + emp.timeOffCount, 0),
      sickLeave: data.employees.reduce((acc, emp) => acc + emp.sickLeaveCount, 0),
      dayOff: data.employees.reduce((acc, emp) => acc + emp.dayOffCount, 0)
    };
  }, [data]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'company_manager')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive overview of your organization's data
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.companies}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.stores}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.employees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Time Off</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.timeOffEntries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sick Leave</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.sickLeave}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Off</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.dayOff}</div>
            </CardContent>
          </Card>
        </div>

        {/* Companies Breakdown */}
        {profile.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Companies Overview</CardTitle>
              <CardDescription>Performance metrics by company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.companies.map(company => (
                  <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{company.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {company.storeCount} stores • {company.employeeCount} employees
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{company.timeOffCount}</div>
                      <p className="text-sm text-muted-foreground">time-off entries</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stores Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Stores Overview</CardTitle>
            <CardDescription>Performance metrics by store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.stores.map(store => (
                <div key={store.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{store.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {store.company_name} • {store.employeeCount} employees
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{store.timeOffCount}</div>
                    <p className="text-sm text-muted-foreground">time-off entries</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Employees Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Employees Overview</CardTitle>
            <CardDescription>Time-off summary by employee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.employees.map(employee => (
                <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{employee.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {employee.store_name} • {employee.company_name}
                    </p>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold">{employee.timeOffCount}</div>
                      <p className="text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{employee.sickLeaveCount}</div>
                      <p className="text-muted-foreground">Sick</p>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{employee.dayOffCount}</div>
                      <p className="text-muted-foreground">Days Off</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}