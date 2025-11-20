import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Navigation from '@/components/Navigation';

interface LinkedAccount {
  id: string;
  student_id: string;
  parent_id: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  student?: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    email?: string;
  };
  parent?: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    email?: string;
  };
}

export default function LinkedAccounts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchUserRole();
  }, [user, navigate]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setUserRole(data?.role || null);
    if (data?.role) {
      fetchLinkedAccounts(data.role);
    }
  };

  const fetchLinkedAccounts = async (role: string) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      let links: any[] = [];
      
      if (role === 'student') {
        // Get parent links for student
        const { data, error } = await supabase
          .from('student_parent_links')
          .select(`
            *,
            parent:profiles!student_parent_links_parent_id_fkey(id, username, first_name, last_name)
          `)
          .eq('student_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        links = data || [];

        // Fetch parent emails
        if (links.length > 0) {
          const parentIds = links.map(link => link.parent?.id).filter(Boolean);
          const { data: usersData } = await supabase
            .from('users')
            .select('user_id, email')
            .in('user_id', parentIds);

          links = links.map(link => ({
            ...link,
            parent: {
              ...link.parent,
              email: usersData?.find(u => u.user_id === link.parent?.id)?.email || 'N/A'
            }
          }));
        }
      } else if (role === 'parent') {
        // Get student links for parent
        const { data, error } = await supabase
          .from('student_parent_links')
          .select(`
            *,
            student:profiles!student_parent_links_student_id_fkey(id, username, first_name, last_name)
          `)
          .eq('parent_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        links = data || [];

        // Fetch student emails
        if (links.length > 0) {
          const studentIds = links.map(link => link.student?.id).filter(Boolean);
          const { data: usersData } = await supabase
            .from('users')
            .select('user_id, email')
            .in('user_id', studentIds);

          links = links.map(link => ({
            ...link,
            student: {
              ...link.student,
              email: usersData?.find(u => u.user_id === link.student?.id)?.email || 'N/A'
            }
          }));
        }
      }

      setLinkedAccounts(links);
    } catch (error: any) {
      console.error('Error fetching linked accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load linked accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-500';
      case 'rejected':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-yellow-500/10 text-yellow-500';
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-20 px-4">
        <div className="container max-w-4xl mx-auto py-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">My Linked Accounts</CardTitle>
              <CardDescription>
                {userRole === 'student' 
                  ? 'View the parent accounts linked to your account'
                  : 'View the student accounts linked to your account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : linkedAccounts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {userRole === 'student' 
                      ? 'No parent accounts linked yet. Go to Student Linking to connect with a parent.'
                      : 'No student accounts linked yet. Students can request to link with you.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {linkedAccounts.map((link) => {
                    const account = userRole === 'student' ? link.parent : link.student;
                    const accountType = userRole === 'student' ? 'Parent' : 'Student';
                    
                    return (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-6 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {account?.first_name} {account?.last_name}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {accountType}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            @{account?.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {account?.email}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Linked {new Date(link.created_at).toLocaleDateString()}
                          </p>
                          {link.approved_at && (
                            <p className="text-sm text-muted-foreground">
                              Approved {new Date(link.approved_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <span className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full ${getStatusColor(link.status)}`}>
                            {getStatusIcon(link.status)}
                            <span className="capitalize font-medium">{link.status}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
