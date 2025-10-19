import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, DollarSign, Percent, Clock, TrendingDown, User } from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";

interface Investment {
  id: string;
  amount: number;
  created_at: string;
  loan: {
    id: string;
    title: string;
    description: string;
    amount_requested: number;
    amount_funded: number;
    interest_rate: number;
    repayment_months: number;
    status: string;
    currency: string;
    borrower: {
      full_name: string | null;
    } | null;
  };
}

const MyInvestments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalInvested, setTotalInvested] = useState(0);

  useEffect(() => {
    if (user) {
      fetchMyInvestments();
    }
  }, [user]);

  const fetchMyInvestments = async () => {
    try {
      // Fetch investments
      const { data: investmentsData, error: investmentsError } = await supabase
        .from("investments")
        .select("*")
        .eq("investor_id", user?.id)
        .order("created_at", { ascending: false });

      if (investmentsError) throw investmentsError;

      // Fetch loan details and borrower profiles
      const loanIds = investmentsData?.map(inv => inv.loan_id) || [];
      const { data: loansData } = await supabase
        .from("loan_requests")
        .select("*")
        .in("id", loanIds);

      const borrowerIds = loansData?.map(loan => loan.borrower_id) || [];
      const { data: borrowerProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", borrowerIds);

      // Combine data
      const enrichedInvestments = (investmentsData || []).map(investment => {
        const loan = loansData?.find(l => l.id === investment.loan_id);
        const borrower = borrowerProfiles?.find(b => b.id === loan?.borrower_id);

        return {
          ...investment,
          loan: loan ? {
            ...loan,
            borrower: borrower || null,
          } : null,
        };
      }).filter(inv => inv.loan !== null);

      setInvestments(enrichedInvestments as Investment[]);
      
      // Calculate total invested
      const total = investmentsData?.reduce((sum, inv) => sum + inv.amount, 0) || 0;
      setTotalInvested(total);
    } catch (error: any) {
      toast.error("Failed to load your investments");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Investments</h1>
          <p className="text-muted-foreground text-lg">
            Track all your investments and returns
          </p>
        </div>

        {/* Total Investment Summary */}
        <Card className="mb-8 bg-gradient-to-br from-primary/5 to-accent/5 border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold text-primary">
              ${totalInvested.toLocaleString()}
            </p>
            <p className="text-muted-foreground mt-2">
              Across {investments.length} {investments.length === 1 ? "loan" : "loans"}
            </p>
          </CardContent>
        </Card>

        {investments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <TrendingDown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No investments yet</h3>
              <p className="text-muted-foreground mb-4">
                Start investing in loan requests to build your portfolio
              </p>
              <Button onClick={() => navigate("/dashboard")} variant="hero">
                Browse Loans
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {investments.map((investment) => {
              const loan = investment.loan;
              if (!loan) return null;

              const fundingPercentage = (loan.amount_funded / loan.amount_requested) * 100;

              return (
                <Card key={investment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-2xl">{loan.title}</CardTitle>
                      <Badge variant={loan.status === "open" ? "default" : "secondary"}>
                        {loan.status}
                      </Badge>
                    </div>
                    <CardDescription>{loan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Investment Amount */}
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Your Investment</p>
                          <p className="text-3xl font-bold text-primary">
                            {formatCurrency(investment.amount, loan.currency)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">Expected Return</p>
                          <p className="text-2xl font-bold text-accent">
                            {formatCurrency(investment.amount * (1 + (loan.interest_rate / 100) * (loan.repayment_months / 12)), loan.currency)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Loan Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          Borrower
                        </div>
                        <p className="font-medium">
                          {loan.borrower?.full_name || "Anonymous"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          Total Loan
                        </div>
                        <p className="font-medium">
                          {formatCurrency(loan.amount_requested, loan.currency)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Percent className="h-4 w-4" />
                          Interest
                        </div>
                        <p className="font-medium">{loan.interest_rate}%</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Term
                        </div>
                        <p className="font-medium">{loan.repayment_months} months</p>
                      </div>
                    </div>

                    {/* Funding Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Funding Progress</span>
                        <span className="font-semibold">{fundingPercentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                          style={{ width: `${Math.min(fundingPercentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Invested on {new Date(investment.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyInvestments;