import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Users, BarChart3, Shield } from 'lucide-react';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) {
      navigate('/dashboard');
    }
  }, [user, profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user && profile) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Staff Schedule Manager</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Streamline your workforce management with role-based access, multi-company support, 
            and comprehensive attendance tracking.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 my-12">
          <Card>
            <CardHeader className="pb-3">
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Schedule Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage employee schedules, time-off requests, and availability across multiple stores.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Multi-Company Support</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Handle multiple companies and stores under one umbrella with proper access controls.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Analytics & Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate detailed reports and export data for attendance, leave patterns, and more.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Shield className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Role-Based Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Secure access controls with admin, company manager, and store manager roles.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <div className="space-y-4">
            <Button 
              size="lg" 
              className="w-full max-w-sm mx-auto"
              onClick={() => navigate('/auth')}
            >
              Sign In / Sign Up
            </Button>
            <div className="text-sm text-gray-500">
              <p>Demo roles available: Admin, Company Manager, Store Manager</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}