import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Package, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard/products');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Successfully signed in!',
      });
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Decorative gradient blobs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 0.6, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-fuchsia-400/50 to-indigo-400/50 blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.1 }}
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-sky-400/50 to-emerald-400/50 blur-3xl"
      />
      {/* Subtle grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,theme(colors.indigo.500)_1px,transparent_1px)] [background-size:18px_18px]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="relative border-0 shadow-2xl overflow-hidden dark:border dark:border-gray-800/60 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-900/50">
          {/* Animated gradient border */}
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-black/5 after:absolute after:inset-0 after:-z-10 after:blur-2xl after:bg-[conic-gradient(at_20%_20%,theme(colors.blue.400),theme(colors.violet.500),theme(colors.fuchsia.500),theme(colors.cyan.400),theme(colors.blue.400))] after:opacity-20" />
          <div className="relative bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-white/25 rounded-2xl shadow-inner">
                <Package className="h-8 w-8 text-white drop-shadow" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-white">StockFlow</CardTitle>
            <CardDescription className="text-indigo-100 mt-1">
              Smart inventory management for modern teams
            </CardDescription>
          </div>
          
          <CardContent className="relative p-6">
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className={cn(
                  "w-full h-11 text-base font-medium rounded-lg transition-all duration-200",
                  "bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-600",
                  "shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                )}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          
        </Card>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} axzell innovations. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
}