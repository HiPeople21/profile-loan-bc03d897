import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Plus, FileText, DollarSign, LogOut } from "lucide-react";
import { toast } from "sonner";

const BorrowerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, repaid: 0 });

  useEffect(() => {
    fetchLoans();
  }, [user]);

  const fetchLoans = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("loan_requests")
      .select("*")
      .eq("borrower_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch loans");
      return;
    }

    setLoans(data || []);
    
    const active = data?.filter(l => l.status === "funded").length || 0;
    const repaid = data?.filter(l => l.status === "repaid").length || 0;
    
    setStats({
      total: data?.length || 0,
      active,
      repaid
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              LendConnect
            </span>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Borrower Dashboard</h1>
            <p className="text-muted-foreground">Manage your loan requests and repayments</p>
          </div>
          <Button variant="hero" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Loan Request
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Total Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                Active Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                Repaid Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{stats.repaid}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Loan Requests</CardTitle>
            <CardDescription>View and manage your loan applications</CardDescription>
          </CardHeader>
          <CardContent>
            {loans.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You haven't created any loan requests yet.</p>
                <Button variant="hero">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Loan Request
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => (
                  <div key={loan.id} className="border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{loan.title}</h3>
                        <p className="text-sm text-muted-foreground">{loan.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm">Amount: ${loan.amount_requested}</span>
                          <span className="text-sm">Rate: {loan.interest_rate}%</span>
                          <span className="text-sm capitalize px-2 py-1 rounded bg-primary/10 text-primary">{loan.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BorrowerDashboard;
