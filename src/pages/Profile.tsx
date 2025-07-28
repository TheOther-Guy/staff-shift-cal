import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Company {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
  company_id: string;
}

export default function Profile() {
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'store_manager' as 'admin' | 'company_manager' | 'store_manager' | 'brand_manager',
    company_id: '',
    store_id: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        company_id: profile.company_id || '',
        store_id: profile.store_id || ''
      });
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      const { data: storesData } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      setCompanies(companiesData || []);
      setStores(storesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          email: formData.email,
          company_id: formData.company_id || null,
          store_id: formData.store_id || null
        })
        .eq('id', profile.id);

      if (error) throw error;

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const filteredStores = stores.filter(store => 
    !formData.company_id || store.company_id === formData.company_id
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account information
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>Personal Information</CardTitle>
              </div>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
              
              <div>
                <Label>Role</Label>
                <Input
                  value={formData.role.replace('_', ' ').toUpperCase()}
                  disabled
                  className="capitalize"
                />
              </div>
              
              {formData.role !== 'admin' && (
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Select 
                    value={formData.company_id} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      company_id: value,
                      store_id: '' // Reset store when company changes
                    }))}
                    disabled={!isEditing}
                  >
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
              
              {formData.role === 'store_manager' && (
                <div>
                  <Label htmlFor="store">Store</Label>
                  <Select 
                    value={formData.store_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, store_id: value }))}
                    disabled={!isEditing || !formData.company_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}