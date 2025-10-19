import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { TrendingUp, Plus, DollarSign, User, Calendar, Percent, Clock, Target, Loader2, Settings, FileText, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calculateMinInvestment, formatMinInvestment } from "@/lib/investmentUtils";

interface LoanRequest {
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
  borrower_id: string;
  borrower: {
    id: string;
    full_name: string | null;
  } | null;
  borrower_profile: {
    credit_score: number | null;
    bio: string | null;
    successful_loans_count: number;
    defaults_count: number;
  } | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInvestDialogOpen, setIsInvestDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<{ avatar_url: string | null; full_name: string | null }>({ avatar_url: null, full_name: null });

  // Create loan form state
  const [newLoan, setNewLoan] = useState({
    title: "",
    description: "",
    amount_requested: "",
    interest_rate: "",
    repayment_months: "",
  });

  // Investment form state
  const [investmentAmount, setInvestmentAmount] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    fetchLoanRequests();
    fetchUserProfile();
  }, [user, navigate]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("id", user.id)
      .single();
    
    if (data) {
      setUserProfile(data);
    }
  };

  const fetchLoanRequests = async () => {
    try {
      // Fetch all loan requests
      const { data: loans, error: loansError } = await supabase
        .from("loan_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (loansError) throw loansError;

      const loanIds = [...new Set((loans || []).map((l) => l.id))];

      // Fetch profiles for all borrowers
      const borrowerIds = [...new Set((loans || []).map((loan) => loan.borrower_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", borrowerIds);

      if (profilesError) throw profilesError;

      // Fetch borrower profiles
      const { data: borrowerProfiles, error: borrowerProfilesError } = await supabase
        .from("borrower_profiles")
        .select("user_id, credit_score, bio, successful_loans_count, defaults_count")
        .in("user_id", borrowerIds);

      if (borrowerProfilesError) throw borrowerProfilesError;

      // Fetch investments for these loans and aggregate funded amounts client-side
      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("loan_id, amount")
        .in("loan_id", loanIds);

      if (investmentsError) throw investmentsError;

      const fundedMap = new Map<string, number>();
      (investments || []).forEach((inv) => {
        const prev = fundedMap.get(inv.loan_id) || 0;
        fundedMap.set(inv.loan_id, Number((prev + Number(inv.amount)).toFixed(2)));
      });

      // Combine the data and override amount_funded using aggregated investments
      const enrichedLoans: LoanRequest[] = (loans || []).map((loan) => ({
        ...loan,
        amount_funded: fundedMap.get(loan.id) ?? Number(loan.amount_funded ?? 0),
        borrower: profiles?.find((p) => p.id === loan.borrower_id) || null,
        borrower_profile: borrowerProfiles?.find((bp) => bp.user_id === loan.borrower_id) || null,
      }));

      setLoanRequests(enrichedLoans);
    } catch (error: any) {
      toast.error("Failed to load loan requests");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const amount = parseFloat(newLoan.amount_requested);
      const interestRate = parseFloat(newLoan.interest_rate);
      
      const MIN_BORROW = 100;
      const MIN_INTEREST = 4;
      
      if (amount < MIN_BORROW) {
        toast.error(`Minimum loan amount is $${MIN_BORROW}`);
        setIsSubmitting(false);
        return;
      }

      if (interestRate < MIN_INTEREST) {
        toast.error(`Minimum interest rate is ${MIN_INTEREST}%`);
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("loan_requests").insert({
        borrower_id: user.id,
        title: newLoan.title,
        description: newLoan.description,
        amount_requested: amount,
        interest_rate: interestRate,
        repayment_months: parseInt(newLoan.repayment_months),
        currency: "USD",
        status: "open",
      });

      if (error) throw error;

      toast.success("Loan request created successfully!");
      setIsCreateDialogOpen(false);
      setNewLoan({
        title: "",
        description: "",
        amount_requested: "",
        interest_rate: "",
        repayment_months: "",
      });
      fetchLoanRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to create loan request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedLoan) return;

    setIsSubmitting(true);
    try {
      const amount = parseFloat(investmentAmount);
      const minInvestment = calculateMinInvestment(selectedLoan.amount_requested);
      
      if (amount < minInvestment) {
        toast.error(`Minimum investment is ${formatMinInvestment(minInvestment)} for this loan`);
        setIsSubmitting(false);
        return;
      }

      if (amount > (selectedLoan.amount_requested - selectedLoan.amount_funded)) {
        toast.error("Investment amount exceeds remaining loan amount");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("investments").insert({
        investor_id: user.id,
        loan_id: selectedLoan.id,
        amount: amount,
      });

      if (error) throw error;

      // Optimistically update UI so progress bar and percentage update instantly
      setLoanRequests((prev) =>
        prev.map((l) =>
          l.id === selectedLoan.id
            ? { ...l, amount_funded: Number((l.amount_funded + amount).toFixed(2)) }
            : l
        )
      );

      toast.success("Investment successful!");
      setIsInvestDialogOpen(false);
      setInvestmentAmount("");
      setSelectedLoan(null);
      // Refresh from backend as fallback
      fetchLoanRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to invest");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const openInvestDialog = (loan: LoanRequest) => {
    setSelectedLoan(loan);
    setIsInvestDialogOpen(true);
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
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              LendConnect
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Request
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Loan Request</DialogTitle>
                  <DialogDescription>
                    Fill out the details for your loan request
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateLoan} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Business expansion loan"
                      value={newLoan.title}
                      onChange={(e) => setNewLoan({ ...newLoan, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your loan purpose..."
                      value={newLoan.description}
                      onChange={(e) => setNewLoan({ ...newLoan, description: e.target.value })}
                      required
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ($)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="100"
                        placeholder="10000"
                        value={newLoan.amount_requested}
                        onChange={(e) => setNewLoan({ ...newLoan, amount_requested: e.target.value })}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Minimum: $100</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interest">Interest Rate (% APR)</Label>
                      <Input
                        id="interest"
                        type="number"
                        step="0.1"
                        min="4"
                        placeholder="5.5"
                        value={newLoan.interest_rate}
                        onChange={(e) => setNewLoan({ ...newLoan, interest_rate: e.target.value })}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Minimum: 4% annual</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="months">Repayment Period (months)</Label>
                    <Input
                      id="months"
                      type="number"
                      placeholder="12"
                      value={newLoan.repayment_months}
                      onChange={(e) => setNewLoan({ ...newLoan, repayment_months: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="hero" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Request"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userProfile.full_name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/my-loans")}>
                  <FileText className="mr-2 h-4 w-4" />
                  My Loans
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/my-investments")}>
                  <TrendingDown className="mr-2 h-4 w-4" />
                  My Investments
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">All Loan Requests</h1>
          <p className="text-muted-foreground text-lg">
            Browse available opportunities or create your own request
          </p>
        </div>

        {loanRequests.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No loan requests yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to create a loan request
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} variant="hero">
                <Plus className="mr-2 h-4 w-4" />
                Create Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loanRequests.map((loan) => {
              const fundingPercentage = (loan.amount_funded / loan.amount_requested) * 100;
              const remainingAmount = loan.amount_requested - loan.amount_funded;
              const isOwnLoan = loan.borrower_id === user?.id;

              return (
                <Card key={loan.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{loan.title}</CardTitle>
                      <Badge variant={loan.status === "open" ? "default" : "secondary"}>
                        {loan.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {loan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Borrower Info */}
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {loan.borrower?.full_name || "Anonymous"}
                        </span>
                        {isOwnLoan && (
                          <Badge variant="outline" className="ml-auto">Your Request</Badge>
                        )}
                      </div>
                      {loan.borrower_profile && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {loan.borrower_profile.credit_score && (
                            <p>Credit Score: {loan.borrower_profile.credit_score}</p>
                          )}
                          <p>
                            Track Record: {loan.borrower_profile.successful_loans_count} successful,{" "}
                            {loan.borrower_profile.defaults_count} defaults
                          </p>
                          {loan.borrower_profile.bio && (
                            <p className="italic mt-2">{loan.borrower_profile.bio}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Loan Details */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          Amount
                        </div>
                        <span className="font-semibold">
                          ${loan.amount_requested.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Percent className="h-4 w-4" />
                          {isOwnLoan ? "Interest (APR)" : "Return Rate (APR)"}
                        </div>
                        <span className="font-semibold">{loan.interest_rate}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Term
                        </div>
                        <span className="font-semibold">{loan.repayment_months} months</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Posted
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(loan.created_at).toLocaleDateString()}
                        </span>
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
                      <p className="text-xs text-muted-foreground">
                        ${remainingAmount.toLocaleString()} remaining
                      </p>
                    </div>

                    {/* Action Button */}
                    {!isOwnLoan && loan.status === "open" && remainingAmount > 0 && (
                      <Button
                        onClick={() => openInvestDialog(loan)}
                        variant="hero"
                        className="w-full"
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Invest
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Investment Dialog */}
      <Dialog open={isInvestDialogOpen} onOpenChange={setIsInvestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invest in Loan</DialogTitle>
            <DialogDescription>
              {selectedLoan?.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invest-amount">Investment Amount ($)</Label>
              <Input
                id="invest-amount"
                type="number"
                step="0.01"
                min={selectedLoan ? calculateMinInvestment(selectedLoan.amount_requested) : 10}
                placeholder={selectedLoan ? `Min: ${formatMinInvestment(calculateMinInvestment(selectedLoan.amount_requested))}` : "Enter amount"}
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                required
                max={selectedLoan ? selectedLoan.amount_requested - selectedLoan.amount_funded : undefined}
              />
              {selectedLoan && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    Min: {formatMinInvestment(calculateMinInvestment(selectedLoan.amount_requested))} | Max: ${(selectedLoan.amount_requested - selectedLoan.amount_funded).toLocaleString()}
                  </p>
                  {investmentAmount && parseFloat(investmentAmount) > 0 && (
                    <div className="mt-3 p-3 bg-muted rounded-lg space-y-1">
                      <p className="font-medium text-foreground">Expected Returns:</p>
                      <p>
                        Interest Rate: <span className="font-semibold text-foreground">{selectedLoan.interest_rate}% APR</span>
                      </p>
                      <p>
                        Total Return: <span className="font-semibold text-foreground">
                          ${(parseFloat(investmentAmount) * (1 + (selectedLoan.interest_rate / 100) * (selectedLoan.repayment_months / 12))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </p>
                      <p>
                        Profit: <span className="font-semibold text-primary">
                          +${(parseFloat(investmentAmount) * (selectedLoan.interest_rate / 100) * (selectedLoan.repayment_months / 12)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </p>
                      <p className="text-[10px] mt-1 text-muted-foreground">
                        Over {selectedLoan.repayment_months} month period
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInvestDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" variant="hero" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Investing...
                  </>
                ) : (
                  "Confirm Investment"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;