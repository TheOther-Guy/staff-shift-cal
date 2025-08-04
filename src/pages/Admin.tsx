import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Users, Building, Store, ArrowLeft, UserPlus, Layers } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Navigate, useNavigate } from 'react-router-dom';

interface Company {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
  company_id: string;
  companies?: { name: string } | null;
}

interface Store {
  id: string;
  name: string;
  company_id: string;
  brand_id: string | null;
  companies?: { name: string } | null;
  brands?: { name: string } | null;
}

interface Employee {
  id: string;
  name: string;
  store_id: string;
  company_id: string | null;
  hiring_date: string;
  INT_ID?: number | null;
  stores?: { name: string } | null;
  companies?: { name: string } | null;
}

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'company_manager' | 'brand_manager' | 'store_manager';
  company_id: string | null;
  brand_id: string | null;
  store_id: string | null;
  companies?: { name: string } | null;
  brands?: { name: string } | null;
  stores?: { name: string } | null;
  assignedBrands?: string[];
}

export default function Admin() {
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
  
  // Dialog states
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [showStoreDialog, setShowStoreDialog] = useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  
  // Form states
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandCompany, setNewBrandCompany] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCompany, setNewStoreCompany] = useState('');
  const [newStoreBrand, setNewStoreBrand] = useState('');
  
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeStore, setNewEmployeeStore] = useState('');
  const [newEmployeeHiringDate, setNewEmployeeHiringDate] = useState('');
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'company_manager' | 'brand_manager' | 'store_manager'>('store_manager');
  const [newUserCompany, setNewUserCompany] = useState('');
  const [newUserBrand, setNewUserBrand] = useState('');
  const [newUserStore, setNewUserStore] = useState('');
  const [newUserBrands, setNewUserBrands] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const fetchData = async () => {
    try {
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*, companies!fk_brands_company(name)')
        .order('name');
      if (brandsError) throw brandsError;
      setBrands(brandsData as any || []);

      // Fetch stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*, companies!fk_stores_company(name), brands!fk_stores_brand(name)')
        .order('name');
      if (storesError) throw storesError;
      setStores(storesData as any || []);

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*, stores!fk_employees_store(name), companies!fk_employees_company(name)')
        .order('name');
      if (employeesError) throw employeesError;
      setEmployees(employeesData as any || []);

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*, companies!profiles_company_id_fkey(name), brands!profiles_brand_id_fkey(name), stores!profiles_store_id_fkey(name)')
        .order('full_name');
      if (profilesError) throw profilesError;

      // Fetch user brands for brand managers
      const profilesWithBrands = await Promise.all(
        (profilesData || []).map(async (profile) => {
          if (profile.role === 'brand_manager') {
            const { data: userBrandsData } = await supabase
              .from('user_brands')
              .select(`
                brand_id,
                brands!inner (
                  name
                )
              `)
              .eq('user_id', profile.user_id);
            
            return {
              ...profile,
              assignedBrands: userBrandsData?.map(ub => (ub as any).brands?.name).filter(Boolean) || []
            };
          }
          return profile;
        })
      );

      setProfiles(profilesWithBrands as any || []);

      // Fetch approval requests (only profile creation)
      const { data: approvalData, error: approvalError } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('type', 'profile_creation')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (approvalError) throw approvalError;
      setApprovalRequests(approvalData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    try {
      const { error } = await supabase
        .from('companies')
        .insert({ name: newCompanyName.trim() });
      if (error) throw error;
      setNewCompanyName('');
      setShowCompanyDialog(false);
      fetchData();
      toast({ title: "Success", description: "Company created successfully" });
    } catch (error) {
      console.error('Error creating company:', error);
      toast({ title: "Error", description: "Failed to create company", variant: "destructive" });
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim() || !newBrandCompany) return;
    try {
      const { error } = await supabase
        .from('brands')
        .insert({ 
          name: newBrandName.trim(),
          company_id: newBrandCompany
        });
      if (error) throw error;
      setNewBrandName('');
      setNewBrandCompany('');
      setShowBrandDialog(false);
      fetchData();
      toast({ title: "Success", description: "Brand created successfully" });
    } catch (error) {
      console.error('Error creating brand:', error);
      toast({ title: "Error", description: "Failed to create brand", variant: "destructive" });
    }
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim() || !newStoreCompany) return;
    try {
      const storeData: any = {
        name: newStoreName.trim(),
        company_id: newStoreCompany
      };
      if (newStoreBrand && newStoreBrand !== 'none') {
        storeData.brand_id = newStoreBrand;
      }
      const { error } = await supabase
        .from('stores')
        .insert(storeData);
      if (error) throw error;
      setNewStoreName('');
      setNewStoreCompany('');
      setNewStoreBrand('');
      setShowStoreDialog(false);
      fetchData();
      toast({ title: "Success", description: "Store created successfully" });
    } catch (error) {
      console.error('Error creating store:', error);
      toast({ title: "Error", description: "Failed to create store", variant: "destructive" });
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmployeeName.trim() || !newEmployeeStore) return;
    try {
      const store = stores.find(s => s.id === newEmployeeStore);
      const { error } = await supabase
        .from('employees')
        .insert({
          name: newEmployeeName.trim(),
          store_id: newEmployeeStore,
          company_id: store?.company_id,
          hiring_date: newEmployeeHiringDate || new Date().toISOString().split('T')[0]
        });
      if (error) throw error;
      setNewEmployeeName('');
      setNewEmployeeStore('');
      setNewEmployeeHiringDate('');
      setShowEmployeeDialog(false);
      fetchData();
      toast({ title: "Success", description: "Employee created successfully" });
    } catch (error) {
      console.error('Error creating employee:', error);
      toast({ title: "Error", description: "Failed to create employee", variant: "destructive" });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim() || !newUserName.trim() || !newUserRole) return;
    try {
      const profileData: any = {
        email: newUserEmail.trim(),
        full_name: newUserName.trim(),
        role: newUserRole
      };

      if (newUserRole === 'company_manager' && newUserCompany) {
        profileData.company_id = newUserCompany;
      } else if (newUserRole === 'brand_manager' && newUserBrand) {
        const brand = brands.find(b => b.id === newUserBrand);
        profileData.company_id = brand?.company_id;
        profileData.brand_id = newUserBrand;
      } else if (newUserRole === 'store_manager' && newUserStore) {
        const store = stores.find(s => s.id === newUserStore);
        profileData.company_id = store?.company_id;
        profileData.brand_id = store?.brand_id;
        profileData.store_id = newUserStore;
      }

      // Call the Edge Function to create user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail.trim(),
          password: newUserPassword.trim(),
          full_name: newUserName.trim(),
          role: newUserRole,
          company_id: profileData.company_id || null,
          brand_id: profileData.brand_id || null,
          brand_ids: newUserRole === 'brand_manager' ? newUserBrands : [],
          store_id: profileData.store_id || null
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('store_manager');
      setNewUserCompany('');
      setNewUserBrand('');
      setNewUserBrands([]);
      setNewUserStore('');
      setShowUserDialog(false);
      fetchData();
      toast({ title: "Success", description: "User created successfully" });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({ title: "Error", description: "Failed to create user", variant: "destructive" });
    }
  };

  // Delete functions
  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure? This will delete all associated data.')) return;
    try {
      const { error } = await supabase.from('companies').delete().eq('id', companyId);
      if (error) throw error;
      fetchData();
      toast({ title: "Success", description: "Company deleted successfully" });
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({ title: "Error", description: "Failed to delete company", variant: "destructive" });
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('Are you sure? This will affect associated stores.')) return;
    try {
      const { error } = await supabase.from('brands').delete().eq('id', brandId);
      if (error) throw error;
      fetchData();
      toast({ title: "Success", description: "Brand deleted successfully" });
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({ title: "Error", description: "Failed to delete brand", variant: "destructive" });
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm('Are you sure? This will affect associated employees.')) return;
    try {
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
      if (error) throw error;
      fetchData();
      toast({ title: "Success", description: "Store deleted successfully" });
    } catch (error) {
      console.error('Error deleting store:', error);
      toast({ title: "Error", description: "Failed to delete store", variant: "destructive" });
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      const { error } = await supabase.from('employees').delete().eq('id', employeeId);
      if (error) throw error;
      fetchData();
      toast({ title: "Success", description: "Employee deleted successfully" });
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({ title: "Error", description: "Failed to delete employee", variant: "destructive" });
    }
  };

  const handleDeleteProfile = async (profileId: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch('/functions/v1/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ profileId, userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      fetchData();
      toast({ title: "Success", description: "User deleted successfully" });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);
      if (error) throw error;
      fetchData();
      toast({ title: "Success", description: "Request approved successfully" });
    } catch (error) {
      console.error('Error approving request:', error);
      toast({ title: "Error", description: "Failed to approve request", variant: "destructive" });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('id', requestId);
      if (error) throw error;
      fetchData();
      toast({ title: "Success", description: "Request rejected successfully" });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({ title: "Error", description: "Failed to reject request", variant: "destructive" });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'company_manager': return 'default';
      case 'brand_manager': return 'outline';
      case 'store_manager': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage companies, brands, stores, employees, and users
            </p>
          </div>
        </div>

        {/* Approval Requests Section */}
        {approvalRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Pending Profile Creation Approvals ({approvalRequests.length})
              </CardTitle>
              <CardDescription>Review and approve new user account requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvalRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.request_data?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>{request.request_data?.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(request.request_data?.role || '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>{request.request_data?.company || 'N/A'}</TableCell>
                      <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveRequest(request.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRejectRequest(request.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companies.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Brands</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{brands.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stores.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Rest of the admin interface would go here */}
        <div className="text-center py-8">
          <p className="text-muted-foreground">Admin interface sections for companies, brands, stores, employees, and users would be displayed here.</p>
        </div>
      </div>
    </div>
  );
}
