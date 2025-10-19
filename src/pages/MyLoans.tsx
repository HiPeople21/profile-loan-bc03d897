import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, DollarSign, Percent, Clock, TrendingUp, Users } from "lucide-react";

interface LoanWithInvestments {
  id: string;
  title: string;
  description: string;
  amount_requested: number;
  amount_funded: number;
  interest_rate: number;
  repayment_months: number;
  status: string;
  currency: string;
  created_at: string;
  investments: Array<{
    id: string;
    amount: number;
    created_at: string;
    is_anonymous: boolean;
    investor: {
      full_name: string | null;
    } | null;
  }>;
}

const MyLoans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanWithInvestments[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyLoans();
    }
  }, [user]);

  const fetchMyLoans = async () => {
    try {
      // Fetch user's loan requests
      const { data: loansData, error: loansError } = await supabase
        .from("loan_requests")
        .select("*")
        .eq("borrower_id", user?.id)
        .order("created_at", { ascending: false });

      if (loansError) throw loansError;

      // For each loan, fetch investments
      const loansWithInvestments = await Promise.all(
        (loansData || []).map(async (loan) => {
          const { data: investmentsData } = await supabase
            .from("investments")
            .select("id, amount, created_at, investor_id, is_anonymous")
            .eq("loan_id", loan.id)
            .order("created_at", { ascending: false });

          // Fetch investor profiles
          const investorIds = investmentsData?.map(inv => inv.investor_id) || [];
          const { data: investorProfiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", investorIds);

          // Combine investments with investor data
          const enrichedInvestments = (investmentsData || []).map(investment => ({
            ...investment,
            investor: investorProfiles?.find(p => p.id === investment.investor_id) || null,
          }));

          return {
            ...loan,
            investments: enrichedInvestments,
          };
        })
      );

      setLoans(loansWithInvestments);
    } catch (error: any) {
      toast.error("Failed to load your loans");
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
          <h1 className="text-4xl font-bold mb-2">My Loan Requests</h1>
          <p className="text-muted-foreground text-lg">
            Track your loan requests and investments received
          </p>
        </div>

        {loans.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No loan requests yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first loan request to get started
              </p>
              <Button onClick={() => navigate("/dashboard")} variant="hero">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {loans.map((loan) => {
              const fundingPercentage = (loan.amount_funded / loan.amount_requested) * 100;
              const remainingAmount = loan.amount_requested - loan.amount_funded;

              return (
                <Card key={loan.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-2xl">{loan.title}</CardTitle>
                      <Badge variant={loan.status === "open" ? "default" : "secondary"}>
                        {loan.status}
                      </Badge>
                    </div>
                    <CardDescription>{loan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Loan Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          Requested
                        </div>
                        <p className="text-xl font-bold">
                          ${loan.amount_requested.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          Funded
                        </div>
                        <p className="text-xl font-bold text-primary">
                          ${loan.amount_funded.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Percent className="h-4 w-4" />
                          Interest
                        </div>
                        <p className="text-xl font-bold">{loan.interest_rate}%</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Term
                        </div>
                        <p className="text-xl font-bold">{loan.repayment_months}mo</p>
                      </div>
                    </div>

                    {/* Funding Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Funding Progress</span>
                        <span className="font-semibold">{fundingPercentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                          style={{ width: `${Math.min(fundingPercentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ${remainingAmount.toLocaleString()} remaining
                      </p>
                    </div>

                    {/* Investments Received */}
                    {loan.investments.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Users className="h-4 w-4" />
                          Investments Received ({loan.investments.length})
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {loan.investments.map((investment) => (
                            <div
                              key={investment.id}
                              className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                              <div>
                                <p className="font-medium">
                                  {investment.is_anonymous ? "Anonymous Investor" : (investment.investor?.full_name || "User")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(investment.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <p className="font-bold text-primary">
                                ${investment.amount.toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

export default MyLoans;