import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Users, Building, Store } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';

interface Company {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
  company_id: string;
  companies: { name: string };
}

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'company_manager' | 'store_manager' | 'brand_manager';
  company_id: string | null;
  store_id: string | null;
  brand_id: string | null;
  companies?: { name: string };
  stores?: { name: string };
}

export default function Admin() {
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showStoreDialog, setShowStoreDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCompany, setNewStoreCompany] = useState('');
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'company_manager' | 'store_manager'>('store_manager');
  const [newUserCompany, setNewUserCompany] = useState('');
  const [newUserStore, setNewUserStore] = useState('');

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

      // Fetch stores with company info
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select(`
          *,
          companies(name)
        `)
        .order('name');

      if (storesError) throw storesError;
      setStores(storesData || []);

      // Fetch profiles with company and store info
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          companies(name),
          stores(name)
        `)
        .order('full_name');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);
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
      
      toast({
        title: "Success",
        description: "Company created successfully",
      });
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: "Error",
        description: "Failed to create company",
        variant: "destructive",
      });
    }
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim() || !newStoreCompany) return;

    try {
      const { error } = await supabase
        .from('stores')
        .insert({ 
          name: newStoreName.trim(),
          company_id: newStoreCompany
        });

      if (error) throw error;

      setNewStoreName('');
      setNewStoreCompany('');
      setShowStoreDialog(false);
      fetchData();
      
      toast({
        title: "Success",
        description: "Store created successfully",
      });
    } catch (error) {
      console.error('Error creating store:', error);
      toast({
        title: "Error",
        description: "Failed to create store",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserName.trim() || !newUserRole) return;

    try {
      // Create the user account
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUserEmail.trim(),
        password: 'TempPassword123!', // Temporary password
        email_confirm: true,
        user_metadata: {
          full_name: newUserName.trim()
        }
      });

      if (error) throw error;

      // Create the profile
      const profileData: any = {
        user_id: data.user.id,
        email: newUserEmail.trim(),
        full_name: newUserName.trim(),
        role: newUserRole
      };

      if (newUserRole === 'company_manager' && newUserCompany) {
        profileData.company_id = newUserCompany;
      } else if (newUserRole === 'store_manager' && newUserStore) {
        const store = stores.find(s => s.id === newUserStore);
        profileData.company_id = store?.company_id;
        profileData.store_id = newUserStore;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (profileError) throw profileError;

      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('store_manager');
      setNewUserCompany('');
      setNewUserStore('');
      setShowUserDialog(false);
      fetchData();
      
      toast({
        title: "Success",
        description: "User created successfully with temporary password",
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProfile = async (profileId: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      // Delete the profile first
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (profileError) throw profileError;

      // Delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) throw authError;

      fetchData();
      
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'company_manager': return 'default';
      case 'store_manager': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage companies, stores, and users
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
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
              <CardTitle className="text-sm font-medium">Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stores.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Companies Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Companies</CardTitle>
                <CardDescription>Manage company organizations</CardDescription>
              </div>
              <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Company</DialogTitle>
                    <DialogDescription>
                      Add a new company to the system
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="company-name">Company Name</Label>
                      <Input
                        id="company-name"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCompanyDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCompany}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stores</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>
                      {stores.filter(store => store.company_id === company.id).length}
                    </TableCell>
                    <TableCell>Today</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Stores Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Stores</CardTitle>
                <CardDescription>Manage store locations</CardDescription>
              </div>
              <Dialog open={showStoreDialog} onOpenChange={setShowStoreDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Store
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Store</DialogTitle>
                    <DialogDescription>
                      Add a new store to a company
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="store-name">Store Name</Label>
                      <Input
                        id="store-name"
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.target.value)}
                        placeholder="Enter store name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="store-company">Company</Label>
                      <Select value={newStoreCompany} onValueChange={setNewStoreCompany}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowStoreDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateStore}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>{store.companies?.name}</TableCell>
                    <TableCell>Today</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Users Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </div>
              <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Add a new user to the system
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="user-name">Full Name</Label>
                      <Input
                        id="user-name"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="user-email">Email</Label>
                      <Input
                        id="user-email"
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="user-role">Role</Label>
                      <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="company_manager">Company Manager</SelectItem>
                          <SelectItem value="store_manager">Store Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newUserRole === 'company_manager' && (
                      <div>
                        <Label htmlFor="user-company">Company</Label>
                        <Select value={newUserCompany} onValueChange={setNewUserCompany}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {newUserRole === 'store_manager' && (
                      <div>
                        <Label htmlFor="user-store">Store</Label>
                        <Select value={newUserStore} onValueChange={setNewUserStore}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select store" />
                          </SelectTrigger>
                          <SelectContent>
                            {stores.map((store) => (
                              <SelectItem key={store.id} value={store.id}>
                                {store.name} ({store.companies?.name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUser}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.full_name}</TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeColor(profile.role)}>
                        {profile.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{profile.companies?.name || '-'}</TableCell>
                    <TableCell>{profile.stores?.name || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteProfile(profile.id, profile.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}