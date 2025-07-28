import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, Store, Users, Calendar, Layers } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { FilterAnalytics } from '@/components/FilterAnalytics';

interface Company {
  id: string;
  name: string;
  brandCount?: number;
  storeCount?: number;
  employeeCount?: number;
  timeOffCount?: number;
}

interface Brand {
  id: string;
  name: string;
  company_id: string;
  company_name?: string;
  storeCount?: number;
  employeeCount?: number;
  timeOffCount?: number;
}

interface Store {
  id: string;
  name: string;
  brand_id: string | null;
  brand_name?: string;
  company_id: string;
  company_name?: string;
  employeeCount?: number;
  timeOffCount?: number;
}

interface Employee {
  id: string;
  name: string;
  store_id: string;
  store_name?: string;
  brand_name?: string;
  company_name?: string;
  timeOffCount?: number;
  sickLeaveCount?: number;
  dayOffCount?: number;
}

export default function Analytics() {
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile && (profile.role === 'admin' || profile.role === 'company_manager' || profile.role === 'brand_manager')) {
      fetchAnalytics();
    }
  }, [profile]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);

      // Fetch companies
      let companiesQuery = supabase.from('companies').select('id, name');
      if (profile?.role === 'company_manager' && profile?.company_id) {
        companiesQuery = companiesQuery.eq('id', profile.company_id);
      } else if (profile?.role === 'brand_manager' && profile?.company_id) {
        companiesQuery = companiesQuery.eq('id', profile.company_id);
      }
      const { data: companiesData } = await companiesQuery;

      // Fetch brands
      let brandsQuery = supabase.from('brands').select('id, name, company_id, companies(name)');
      if (profile?.role === 'company_manager' && profile?.company_id) {
        brandsQuery = brandsQuery.eq('company_id', profile.company_id);
      } else if (profile?.role === 'brand_manager' && profile?.brand_id) {
        brandsQuery = brandsQuery.eq('id', profile.brand_id);
      }
      const { data: brandsData } = await brandsQuery;

      // Fetch stores with relationships
      let storesQuery = supabase.from('stores').select(`
        id, name, brand_id, company_id,
        brands(name),
        companies(name),
        employees(id, time_off_entries(id))
      `);
      
      if (profile?.role === 'company_manager' && profile?.company_id) {
        storesQuery = storesQuery.eq('company_id', profile.company_id);
      } else if (profile?.role === 'brand_manager' && profile?.brand_id) {
        storesQuery = storesQuery.eq('brand_id', profile.brand_id);
      }
      const { data: storesData } = await storesQuery;

      // Fetch employees with relationships
      let employeesQuery = supabase.from('employees').select(`
        id, name, store_id,
        stores!inner(id, name, brand_id, company_id, brands(name), companies(name)),
        time_off_entries(id, type)
      `);
      
      if (profile?.role === 'company_manager' && profile?.company_id) {
        employeesQuery = employeesQuery.eq('stores.company_id', profile.company_id);
      } else if (profile?.role === 'brand_manager' && profile?.brand_id) {
        employeesQuery = employeesQuery.eq('stores.brand_id', profile.brand_id);
      }
      const { data: employeesData } = await employeesQuery;

      // Process companies
      const processedCompanies = (companiesData || []).map(company => {
        const companyStores = (storesData || []).filter(store => store.company_id === company.id);
        const companyEmployees = (employeesData || []).filter(emp => emp.stores?.company_id === company.id);
        
        return {
          id: company.id,
          name: company.name,
          brandCount: (brandsData || []).filter(brand => brand.company_id === company.id).length,
          storeCount: companyStores.length,
          employeeCount: companyEmployees.length,
          timeOffCount: companyEmployees.reduce((acc, emp) => acc + (emp.time_off_entries?.length || 0), 0)
        };
      });

      // Process brands
      const processedBrands = (brandsData || []).map(brand => {
        const brandStores = (storesData || []).filter(store => store.brand_id === brand.id);
        const brandEmployees = (employeesData || []).filter(emp => emp.stores?.brand_id === brand.id);
        
        return {
          id: brand.id,
          name: brand.name,
          company_id: brand.company_id,
          company_name: brand.companies?.name || '',
          storeCount: brandStores.length,
          employeeCount: brandEmployees.length,
          timeOffCount: brandEmployees.reduce((acc, emp) => acc + (emp.time_off_entries?.length || 0), 0)
        };
      });

      // Process stores
      const processedStores = (storesData || []).map(store => ({
        id: store.id,
        name: store.name,
        brand_id: store.brand_id,
        brand_name: store.brands?.name || 'No Brand',
        company_id: store.company_id,
        company_name: store.companies?.name || '',
        employeeCount: store.employees?.length || 0,
        timeOffCount: store.employees?.reduce((acc, emp) => acc + (emp.time_off_entries?.length || 0), 0) || 0
      }));

      // Process employees
      const processedEmployees = (employeesData || []).map(employee => ({
        id: employee.id,
        name: employee.name,
        store_id: employee.store_id,
        store_name: employee.stores?.name || '',
        brand_name: employee.stores?.brands?.name || 'No Brand',
        company_name: employee.stores?.companies?.name || '',
        timeOffCount: employee.time_off_entries?.length || 0,
        sickLeaveCount: employee.time_off_entries?.filter(entry => entry.type === 'sick-leave').length || 0,
        dayOffCount: employee.time_off_entries?.filter(entry => entry.type === 'day-off').length || 0
      }));

      setCompanies(processedCompanies);
      setBrands(processedBrands);
      setStores(processedStores);
      setEmployees(processedEmployees);

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

  const handleClearFilters = () => {
    setSelectedCompany('all');
    setSelectedBrand('all');
    setSelectedStore('all');
  };

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filteredCompanies = companies;
    let filteredBrands = brands;
    let filteredStores = stores;
    let filteredEmployees = employees;

    if (selectedCompany !== 'all') {
      filteredCompanies = companies.filter(c => c.id === selectedCompany);
      filteredBrands = brands.filter(b => b.company_id === selectedCompany);
      filteredStores = stores.filter(s => s.company_id === selectedCompany);
      filteredEmployees = employees.filter(e => e.company_name === companies.find(c => c.id === selectedCompany)?.name);
    }

    if (selectedBrand !== 'all') {
      filteredStores = filteredStores.filter(s => s.brand_id === selectedBrand);
      filteredEmployees = filteredEmployees.filter(e => e.brand_name === brands.find(b => b.id === selectedBrand)?.name);
    }

    if (selectedStore !== 'all') {
      filteredEmployees = filteredEmployees.filter(e => e.store_id === selectedStore);
    }

    return {
      companies: filteredCompanies,
      brands: filteredBrands,
      stores: filteredStores,
      employees: filteredEmployees
    };
  }, [companies, brands, stores, employees, selectedCompany, selectedBrand, selectedStore]);

  const totals = useMemo(() => {
    return {
      companies: filteredData.companies.length,
      brands: filteredData.brands.length,
      stores: filteredData.stores.length,
      employees: filteredData.employees.length,
      timeOffEntries: filteredData.employees.reduce((acc, emp) => acc + (emp.timeOffCount || 0), 0),
      sickLeave: filteredData.employees.reduce((acc, emp) => acc + (emp.sickLeaveCount || 0), 0),
      dayOff: filteredData.employees.reduce((acc, emp) => acc + (emp.dayOffCount || 0), 0)
    };
  }, [filteredData]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'company_manager' && profile.role !== 'brand_manager')) {
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

        {/* Filters */}
        <FilterAnalytics
          companies={companies}
          brands={brands}
          stores={stores}
          selectedCompany={selectedCompany}
          selectedBrand={selectedBrand}
          selectedStore={selectedStore}
          onCompanyChange={setSelectedCompany}
          onBrandChange={setSelectedBrand}
          onStoreChange={setSelectedStore}
          onClearFilters={handleClearFilters}
          userRole={profile.role}
        />

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-7">
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
              <CardTitle className="text-sm font-medium">Brands</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.brands}</div>
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
                {filteredData.companies.map(company => (
                  <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{company.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {company.brandCount} brands • {company.storeCount} stores • {company.employeeCount} employees
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

        {/* Brands Breakdown */}
        {(profile.role === 'admin' || profile.role === 'company_manager') && (
          <Card>
            <CardHeader>
              <CardTitle>Brands Overview</CardTitle>
              <CardDescription>Performance metrics by brand</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData.brands.map(brand => (
                  <div key={brand.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{brand.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {brand.company_name} • {brand.storeCount} stores • {brand.employeeCount} employees
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{brand.timeOffCount}</div>
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
              {filteredData.stores.map(store => (
                <div key={store.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{store.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {store.brand_name} • {store.company_name} • {store.employeeCount} employees
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
              {filteredData.employees.map(employee => (
                <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{employee.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {employee.store_name} • {employee.brand_name} • {employee.company_name}
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