import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Loader2, DollarSign, Percent, Clock, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";

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
  has_repayment: boolean;
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
  const [isRepayDialogOpen, setIsRepayDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanWithInvestments | null>(null);
  const [isProcessingRepayment, setIsProcessingRepayment] = useState(false);

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

      // For each loan, fetch investments and check for repayments
      const loansWithInvestments = await Promise.all(
        (loansData || []).map(async (loan) => {
          const { data: investmentsData } = await supabase
            .from("investments")
            .select("id, amount, created_at, investor_id, is_anonymous")
            .eq("loan_id", loan.id)
            .order("created_at", { ascending: false });

          // Check if repayment exists
          const { data: repaymentData } = await supabase
            .from("repayments")
            .select("id")
            .eq("loan_id", loan.id)
            .maybeSingle();

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
            has_repayment: !!repaymentData,
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

  const calculateRepaymentAmount = (loan: LoanWithInvestments) => {
    const principal = loan.amount_funded;
    const monthlyRate = loan.interest_rate / 100 / 12;
    const interest = principal * monthlyRate * loan.repayment_months;
    return principal + interest;
  };

  const handleRepayment = async () => {
    if (!selectedLoan || !user) return;

    setIsProcessingRepayment(true);
    try {
      const repaymentAmount = calculateRepaymentAmount(selectedLoan);

      // Insert repayment record
      const { error: repaymentError } = await supabase
        .from("repayments")
        .insert({
          loan_id: selectedLoan.id,
          amount: repaymentAmount,
          is_on_time: true, // You could add logic to determine this
        });

      if (repaymentError) throw repaymentError;

      // Update borrower profile to increment successful loans count
      const { data: currentProfile } = await supabase
        .from("borrower_profiles")
        .select("successful_loans_count")
        .eq("user_id", user.id)
        .maybeSingle();

      if (currentProfile) {
        const { error: updateError } = await supabase
          .from("borrower_profiles")
          .update({
            successful_loans_count: (currentProfile.successful_loans_count || 0) + 1,
          })
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      }

      // Update loan status to completed
      const { error: loanUpdateError } = await supabase
        .from("loan_requests")
        .update({ status: "completed" })
        .eq("id", selectedLoan.id);

      if (loanUpdateError) throw loanUpdateError;

      toast.success("Repayment successful! Your track record has been updated.");
      setIsRepayDialogOpen(false);
      setSelectedLoan(null);
      fetchMyLoans(); // Refresh the list
    } catch (error: any) {
      toast.error("Failed to process repayment: " + error.message);
      console.error(error);
    } finally {
      setIsProcessingRepayment(false);
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
                          {formatCurrency(loan.amount_requested, loan.currency)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          Funded
                        </div>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(loan.amount_funded, loan.currency)}
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
                        {formatCurrency(remainingAmount, loan.currency)} remaining
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
                                {formatCurrency(investment.amount, loan.currency)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Repayment Button */}
                    {loan.amount_funded >= loan.amount_requested && !loan.has_repayment && (
                      <div className="pt-4 border-t">
                        <Button
                          onClick={() => {
                            setSelectedLoan(loan);
                            setIsRepayDialogOpen(true);
                          }}
                          className="w-full"
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          Make Repayment
                        </Button>
                      </div>
                    )}

                    {/* Repayment Completed Badge */}
                    {loan.has_repayment && (
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-semibold">Loan Repaid</span>
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

      {/* Repayment Confirmation Dialog */}
      <Dialog open={isRepayDialogOpen} onOpenChange={setIsRepayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Repayment</DialogTitle>
            <DialogDescription>
              Review the repayment details for "{selectedLoan?.title}"
            </DialogDescription>
          </DialogHeader>
          
          {selectedLoan && (
            <div className="space-y-4">
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Principal Amount:</span>
                  <span className="font-semibold">{formatCurrency(selectedLoan.amount_funded, selectedLoan.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Interest ({selectedLoan.interest_rate}% APR):</span>
                  <span className="font-semibold">
                    {formatCurrency((selectedLoan.amount_funded * selectedLoan.interest_rate / 100 / 12) * selectedLoan.repayment_months, selectedLoan.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Repayment Term:</span>
                  <span className="font-semibold">{selectedLoan.repayment_months} months</span>
                </div>
                <div className="pt-2 border-t flex justify-between">
                  <span className="font-bold">Total Repayment:</span>
                  <span className="font-bold text-lg text-primary">
                    {formatCurrency(calculateRepaymentAmount(selectedLoan), selectedLoan.currency)}
                  </span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                By confirming this repayment, your successful loans count will be increased and this loan will be marked as completed.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsRepayDialogOpen(false)}
                  disabled={isProcessingRepayment}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRepayment}
                  disabled={isProcessingRepayment}
                  className="flex-1"
                >
                  {isProcessingRepayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm Repayment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyLoans;