import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Calendar, User } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  old_role: string;
  new_role: string;
  changed_by: string;
  changed_at: string;
  reason: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface AuditLogWithProfiles extends AuditLog {
  user_profile: UserProfile;
  changed_by_profile: UserProfile;
}

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      // First fetch audit logs
      const { data: logsData, error: logsError } = await supabase
        .from('role_change_audit')
        .select('*')
        .gte('changed_at', `Rs{dateRange.from}T00:00:00`)
        .lte('changed_at', `Rs{dateRange.to}T23:59:59`)
        .order('changed_at', { ascending: false });

      if (logsError) throw logsError;

      if (!logsData || logsData.length === 0) {
        setAuditLogs([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set([
        ...logsData.map(log => log.user_id),
        ...logsData.map(log => log.changed_by)
      ].filter(Boolean))];

      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create profiles map
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, UserProfile>);

      // Combine data
      const enrichedLogs = logsData.map(log => ({
        ...log,
        user_profile: profilesMap[log.user_id] || { 
          id: log.user_id, 
          full_name: 'Unknown User', 
          email: 'unknown@example.com' 
        },
        changed_by_profile: profilesMap[log.changed_by] || { 
          id: log.changed_by, 
          full_name: 'Unknown User', 
          email: 'unknown@example.com' 
        }
      }));

      setAuditLogs(enrichedLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = () => {
    setLoading(true);
    fetchAuditLogs();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'secondary';
      case 'staff': return 'default';
      default: return 'outline';
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').toUpperCase();
  };

  if (loading) {
    return <div>Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Track role changes and security events</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="from-date">From Date</Label>
              <Input
                id="from-date"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">To Date</Label>
              <Input
                id="to-date"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
            <Button onClick={handleDateRangeChange}>
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Changes</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Privilege Escalations</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {auditLogs.filter(log => {
                const roleHierarchy = { 'staff': 1, 'admin': 2, 'super_admin': 3 };
                return roleHierarchy[log.new_role as keyof typeof roleHierarchy] > 
                       roleHierarchy[log.old_role as keyof typeof roleHierarchy];
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs.filter(log => {
                const logDate = new Date(log.changed_at);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return logDate >= weekAgo;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Previous Role</TableHead>
                <TableHead>New Role</TableHead>
                <TableHead>Changed By</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {new Date(log.changed_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.changed_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{log.user_profile.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {log.user_profile.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(log.old_role)}>
                      {formatRole(log.old_role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(log.new_role)}>
                      {formatRole(log.new_role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{log.changed_by_profile.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {log.changed_by_profile.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {log.reason || (
                      <span className="text-muted-foreground italic">No reason provided</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {auditLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No audit logs found for the selected date range
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}