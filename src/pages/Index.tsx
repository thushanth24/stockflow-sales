import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, BarChart3, Shield, Users } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Package,
      title: 'Product Management',
      description: 'Easily manage your inventory with comprehensive product tracking and stock monitoring.',
    },
    {
      icon: BarChart3,
      title: 'Sales Analytics',
      description: 'Automated sales calculations with detailed reports and performance insights.',
    },
    {
      icon: Shield,
      title: 'Role-Based Access',
      description: 'Secure system with different permission levels for staff, admins, and super admins.',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Multi-user support with audit trails and collaborative inventory management.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Package className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Inventory Management System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Streamline your inventory operations with automated sales tracking, comprehensive reporting, and secure role-based access control.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <feature.icon className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-card rounded-lg border p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to optimize your inventory?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of businesses using our inventory management system to streamline their operations.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Start Your Journey
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
