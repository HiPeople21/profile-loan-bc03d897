import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Wallet, DollarSign, Users, LogOut, Search } from "lucide-react";
import { toast } from "sonner";

const InvestorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [investments, setInvestments] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalInvested: 0, activeInvestments: 0, returns: 0 });

  useEffect(() => {
    fetchInvestments();
  }, [user]);

  const fetchInvestments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("investments")
      .select("*, loan_requests(*)")
      .eq("investor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch investments");
      return;
    }

    setInvestments(data || []);
    
    const total = data?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
    
    setStats({
      totalInvested: total,
      activeInvestments: data?.length || 0,
      returns: total * 0.08 // Placeholder calculation
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
          <div className="flex items-center gap-4">
            <Link to="/browse">
              <Button variant="outline">
                <Search className="mr-2 h-4 w-4" />
                Browse Borrowers
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Investor Dashboard</h1>
            <p className="text-muted-foreground">Track your investments and discover new opportunities</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Total Invested
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">${stats.totalInvested.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-success" />
                Active Investments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.activeInvestments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" />
                Expected Returns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">${stats.returns.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            {investments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You haven't made any investments yet.</p>
                <Link to="/browse">
                  <Button variant="hero">
                    <Search className="mr-2 h-4 w-4" />
                    Browse Borrowers
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {investments.map((investment) => (
                  <div key={investment.id} className="border border-border rounded-lg p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{investment.loan_requests?.title}</h3>
                        <p className="text-sm text-muted-foreground">{investment.loan_requests?.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm">Your Investment: ${Number(investment.amount).toFixed(2)}</span>
                          <span className="text-sm">Rate: {investment.loan_requests?.interest_rate}%</span>
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

export default InvestorDashboard;
