import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';


interface Company {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
  company_id: string;
}

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Signup form state
  const [signupRole, setSignupRole] = useState('store_manager');
  const [signupCompany, setSignupCompany] = useState('');
  const [signupBrands, setSignupBrands] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    fetchCompaniesAndBrands();
  }, []);

  const fetchCompaniesAndBrands = async () => {
    try {
      const [companiesResult, brandsResult] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('brands').select('*').order('name')
      ]);
      
      if (companiesResult.data) setCompanies(companiesResult.data);
      if (brandsResult.data) setBrands(brandsResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Signed in successfully!",
      });
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    // Create approval request with role and brand selection
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          full_name: fullName,
          role: signupRole,
          company_id: signupCompany || undefined,
          brand_ids: signupRole === 'brand_manager' ? signupBrands : undefined,
          request_approval: true
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Pending Approval",
          description: "Your account request has been submitted. An administrator will review and approve your account soon.",
          duration: 5000,
        });
        // Reset form
        (e.target as HTMLFormElement).reset();
        setSignupRole('store_manager');
        setSignupCompany('');
        setSignupBrands([]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to submit request',
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Staff Schedule Manager</CardTitle>
          <CardDescription>
            Sign in to manage your store's schedule and attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={signupRole} onValueChange={setSignupRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      <SelectItem value="store_manager">Store Manager</SelectItem>
                      <SelectItem value="brand_manager">Brand Manager</SelectItem>
                      <SelectItem value="company_manager">Company Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(signupRole === 'company_manager' || signupRole === 'brand_manager') && (
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Select value={signupCompany} onValueChange={setSignupCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {signupRole === 'brand_manager' && signupCompany && (
                  <div className="space-y-2">
                    <Label htmlFor="brands">Brands (Select multiple)</Label>
                    <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                      {brands
                        .filter(brand => brand.company_id === signupCompany)
                        .map((brand) => (
                          <div key={brand.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`signup-brand-${brand.id}`}
                              checked={signupBrands.includes(brand.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSignupBrands([...signupBrands, brand.id]);
                                } else {
                                  setSignupBrands(signupBrands.filter(id => id !== brand.id));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <label htmlFor={`signup-brand-${brand.id}`} className="text-sm">
                              {brand.name}
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || (signupRole === 'brand_manager' && signupBrands.length === 0)}
                >
                  {isLoading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}