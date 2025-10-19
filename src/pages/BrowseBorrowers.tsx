import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, LogOut, ArrowLeft, Shield, TrendingDown } from "lucide-react";

const BrowseBorrowers = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<any[]>([]);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    const { data, error } = await supabase
      .from("loan_requests")
      .select(`
        *,
        borrower_profiles(*)
      `)
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (!error) {
      setLoans(data || []);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/investor-dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                LendConnect
              </span>
            </div>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Loan Requests</h1>
          <p className="text-muted-foreground">Discover verified borrowers and invest in their success</p>
        </div>

        {loans.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No loan requests available at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loans.map((loan) => (
              <Card key={loan.id} className="hover:shadow-xl transition-all cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={loan.borrower_profiles?.is_verified ? "default" : "secondary"}>
                      {loan.borrower_profiles?.is_verified ? (
                        <><Shield className="mr-1 h-3 w-3" /> Verified</>
                      ) : (
                        "Unverified"
                      )}
                    </Badge>
                    {loan.borrower_profiles?.credit_score && (
                      <div className="flex items-center gap-1 text-sm">
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{loan.borrower_profiles.credit_score}</span>
                      </div>
                    )}
                  </div>
                  <CardTitle className="line-clamp-1">{loan.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{loan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Requested</span>
                      <span className="font-semibold">${Number(loan.amount_requested).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Interest Rate</span>
                      <span className="font-semibold text-success">{loan.interest_rate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Term</span>
                      <span className="font-semibold">{loan.repayment_months} months</span>
                    </div>
                    {loan.borrower_profiles?.purpose && (
                      <div className="pt-2 mt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">Purpose: {loan.borrower_profiles.purpose}</p>
                      </div>
                    )}
                  </div>
                  <Button variant="hero" className="w-full mt-4">
                    View Details & Invest
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseBorrowers;
