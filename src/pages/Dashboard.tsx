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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { TrendingUp, Plus, DollarSign, User, Calendar, Percent, Clock, Target, Loader2, Settings, FileText, TrendingDown, Filter, ArrowUpDown, Edit, Trash2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calculateMinInvestment, formatMinInvestment } from "@/lib/investmentUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_CURRENCIES, getCurrencySymbol, formatCurrency, getConversionRateText } from "@/lib/currencyUtils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

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
    avatar_url: string | null;
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInvestDialogOpen, setIsInvestDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<{ avatar_url: string | null; full_name: string | null }>({ avatar_url: null, full_name: null });
  const [userStats, setUserStats] = useState<{ totalBorrowed: number; totalInvested: number; rating: number }>({ 
    totalBorrowed: 0, 
    totalInvested: 0, 
    rating: 0 
  });

  // Create/Edit loan form state
  const [newLoan, setNewLoan] = useState({
    title: "",
    description: "",
    amount_requested: "",
    interest_rate: "",
    repayment_months: "",
    currency: "USD",
  });

  const [editLoan, setEditLoan] = useState({
    title: "",
    description: "",
    amount_requested: "",
    interest_rate: "",
    repayment_months: "",
    currency: "USD",
  });

  // Store conversion rates for display
  const [conversionRates, setConversionRates] = useState<{ [key: string]: string }>({});

  // Investment form state
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Filter and sort state
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_high" | "amount_low" | "rate_high" | "rate_low" | "funded_high" | "funded_low">("newest");
  const [filterAmount, setFilterAmount] = useState<"all" | "0-1000" | "1000-10000" | "10000-100000" | "100000+">("all");
  const [filterRate, setFilterRate] = useState<"all" | "4-6" | "6-10" | "10+">("all");
  const [filterTerm, setFilterTerm] = useState<"all" | "0-12" | "12-24" | "24+">("all");

  useEffect(() => {
    fetchLoanRequests();
    fetchUserProfile();
    fetchUserStats();
  }, [user]);

  // Fetch conversion rates when loans are loaded
  useEffect(() => {
    const loadConversionRates = async () => {
      const rates: { [key: string]: string } = {};
      for (const loan of loanRequests) {
        if (loan.currency !== 'USD') {
          const rateText = await getConversionRateText(loan.currency, 'USD', loan.amount_requested);
          rates[loan.id] = rateText;
        }
      }
      setConversionRates(rates);
    };

    if (loanRequests.length > 0) {
      loadConversionRates();
    }
  }, [loanRequests]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("id", user.id)
      .maybeSingle();
    
    if (data) {
      setUserProfile(data);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Fetch total borrowed
      const { data: loans, error: loansError } = await supabase
        .from("loan_requests")
        .select("amount_requested")
        .eq("borrower_id", user.id);

      if (loansError) throw loansError;

      const totalBorrowed = loans?.reduce((sum, loan) => sum + Number(loan.amount_requested), 0) || 0;

      // Fetch total invested
      const { data: investments, error: investError } = await supabase
        .from("investments")
        .select("amount")
        .eq("investor_id", user.id);

      if (investError) throw investError;

      const totalInvested = investments?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Fetch borrower profile for rating calculation
      const { data: borrowerProfile } = await supabase
        .from("borrower_profiles")
        .select("credit_score, successful_loans_count, defaults_count")
        .eq("user_id", user.id)
        .maybeSingle();

      // Calculate star rating (0-5)
      let rating = 3; // Default neutral rating
      
      if (borrowerProfile) {
        const { credit_score, successful_loans_count, defaults_count } = borrowerProfile;
        
        // Start with credit score influence (if available)
        if (credit_score) {
          if (credit_score >= 750) rating = 5;
          else if (credit_score >= 700) rating = 4.5;
          else if (credit_score >= 650) rating = 4;
          else if (credit_score >= 600) rating = 3.5;
          else rating = 3;
        }
        
        // Adjust based on loan history
        if (successful_loans_count > 0 || defaults_count > 0) {
          const successRate = successful_loans_count / (successful_loans_count + defaults_count);
          
          if (successRate === 1 && successful_loans_count >= 3) {
            rating = Math.min(5, rating + 0.5); // Perfect record bonus
          } else if (successRate >= 0.9) {
            rating = Math.min(5, rating + 0.25);
          } else if (successRate < 0.7) {
            rating = Math.max(1, rating - 1);
          }
        }
      }

      // Investment activity bonus
      if (totalInvested > 10000) {
        rating = Math.min(5, rating + 0.25);
      }

      setUserStats({
        totalBorrowed,
        totalInvested,
        rating: Math.round(rating * 2) / 2, // Round to nearest 0.5
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
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
        .select("id, full_name, avatar_url")
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
        currency: newLoan.currency,
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
        currency: "USD",
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
      const remainingAmount = selectedLoan.amount_requested - selectedLoan.amount_funded;
      const calculatedMinInvestment = calculateMinInvestment(selectedLoan.amount_requested);
      const effectiveMinInvestment = Math.min(calculatedMinInvestment, remainingAmount);
      
      if (amount < effectiveMinInvestment) {
        toast.error(`Minimum investment is ${formatMinInvestment(effectiveMinInvestment)} for this loan`);
        setIsSubmitting(false);
        return;
      }

      if (amount > remainingAmount) {
        toast.error("Investment amount exceeds remaining loan amount");
        setIsSubmitting(false);
        return;
      }

      // Navigate to payment page instead of directly submitting
      setIsInvestDialogOpen(false);
      navigate("/payment", {
        state: {
          loanId: selectedLoan.id,
          amount: amount,
          isAnonymous: isAnonymous,
          loanTitle: selectedLoan.title,
          currency: selectedLoan.currency,
        }
      });
      
      setInvestmentAmount("");
      setIsAnonymous(false);
      setSelectedLoan(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to proceed to payment");
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

  const openEditDialog = (loan: LoanRequest) => {
    setSelectedLoan(loan);
    setEditLoan({
      title: loan.title,
      description: loan.description,
      amount_requested: loan.amount_requested.toString(),
      interest_rate: loan.interest_rate.toString(),
      repayment_months: loan.repayment_months.toString(),
      currency: loan.currency,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (loan: LoanRequest) => {
    setSelectedLoan(loan);
    setIsDeleteDialogOpen(true);
  };

  const handleEditLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedLoan) return;

    setIsSubmitting(true);
    try {
      // Check if loan has received any funding
      if (selectedLoan.amount_funded > 0) {
        toast.error("Cannot edit loan request that has received funding");
        setIsSubmitting(false);
        return;
      }

      const amount = parseFloat(editLoan.amount_requested);
      const interestRate = parseFloat(editLoan.interest_rate);
      
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

      const { error } = await supabase
        .from("loan_requests")
        .update({
          title: editLoan.title,
          description: editLoan.description,
          amount_requested: amount,
          interest_rate: interestRate,
          repayment_months: parseInt(editLoan.repayment_months),
          currency: editLoan.currency,
        })
        .eq("id", selectedLoan.id)
        .eq("borrower_id", user.id);

      if (error) throw error;

      toast.success("Loan request updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedLoan(null);
      fetchLoanRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to update loan request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (!user || !selectedLoan) return;

    setIsSubmitting(true);
    try {
      // Check if loan has received any funding
      if (selectedLoan.amount_funded > 0) {
        toast.error("Cannot delete loan request that has received funding");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("loan_requests")
        .delete()
        .eq("id", selectedLoan.id)
        .eq("borrower_id", user.id);

      if (error) throw error;

      toast.success("Loan request deleted successfully!");
      setIsDeleteDialogOpen(false);
      setSelectedLoan(null);
      fetchLoanRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete loan request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and sort logic
  const getFilteredAndSortedLoans = () => {
    let filtered = [...loanRequests];

    // Apply amount filter
    if (filterAmount !== "all") {
      filtered = filtered.filter((loan) => {
        const amount = loan.amount_requested;
        switch (filterAmount) {
          case "0-1000":
            return amount <= 1000;
          case "1000-10000":
            return amount > 1000 && amount <= 10000;
          case "10000-100000":
            return amount > 10000 && amount <= 100000;
          case "100000+":
            return amount > 100000;
          default:
            return true;
        }
      });
    }

    // Apply rate filter
    if (filterRate !== "all") {
      filtered = filtered.filter((loan) => {
        const rate = loan.interest_rate;
        switch (filterRate) {
          case "4-6":
            return rate >= 4 && rate < 6;
          case "6-10":
            return rate >= 6 && rate < 10;
          case "10+":
            return rate >= 10;
          default:
            return true;
        }
      });
    }

    // Apply term filter
    if (filterTerm !== "all") {
      filtered = filtered.filter((loan) => {
        const months = loan.repayment_months;
        switch (filterTerm) {
          case "0-12":
            return months <= 12;
          case "12-24":
            return months > 12 && months <= 24;
          case "24+":
            return months > 24;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "amount_high":
          return b.amount_requested - a.amount_requested;
        case "amount_low":
          return a.amount_requested - b.amount_requested;
        case "rate_high":
          return b.interest_rate - a.interest_rate;
        case "rate_low":
          return a.interest_rate - b.interest_rate;
        case "funded_high":
          return (b.amount_funded / b.amount_requested) - (a.amount_funded / a.amount_requested);
        case "funded_low":
          return (a.amount_funded / a.amount_requested) - (b.amount_funded / b.amount_requested);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredLoans = getFilteredAndSortedLoans();

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
          {/* Logo - Left */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              LendConnect
            </span>
          </div>
          
          {/* Actions - Right */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
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
                      <Label htmlFor="amount">Amount</Label>
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
                      <p className="text-xs text-muted-foreground">Minimum: {getCurrencySymbol(newLoan.currency)}100</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={newLoan.currency}
                        onValueChange={(value) => setNewLoan({ ...newLoan, currency: value })}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_CURRENCIES.map((curr) => (
                            <SelectItem key={curr.code} value={curr.code}>
                              {curr.symbol} {curr.code} - {curr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                    <AvatarImage src={userProfile.avatar_url ? `${userProfile.avatar_url.split('?')[0]}?t=${Date.now()}` : undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-card border-border">
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
                
                {/* Profile Stats Section */}
                <div className="px-2 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Profile Rating</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.floor(userStats.rating)
                              ? "fill-primary text-primary"
                              : star - 0.5 <= userStats.rating
                              ? "fill-primary/50 text-primary"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                      <span className="text-sm font-semibold ml-1">{userStats.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Borrowed</span>
                      <span className="font-semibold text-foreground">
                        ${userStats.totalBorrowed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Invested</span>
                      <span className="font-semibold text-primary">
                        ${userStats.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
                
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

        {/* Filter and Sort Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by:</span>
              </div>
              
              <Select value={filterAmount} onValueChange={(value: any) => setFilterAmount(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Amounts</SelectItem>
                  <SelectItem value="0-1000">Up to $1K</SelectItem>
                  <SelectItem value="1000-10000">$1K - $10K</SelectItem>
                  <SelectItem value="10000-100000">$10K - $100K</SelectItem>
                  <SelectItem value="100000+">$100K+</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRate} onValueChange={(value: any) => setFilterRate(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Interest Rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rates</SelectItem>
                  <SelectItem value="4-6">4% - 6%</SelectItem>
                  <SelectItem value="6-10">6% - 10%</SelectItem>
                  <SelectItem value="10+">10%+</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTerm} onValueChange={(value: any) => setFilterTerm(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Term Length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  <SelectItem value="0-12">Up to 12 months</SelectItem>
                  <SelectItem value="12-24">12 - 24 months</SelectItem>
                  <SelectItem value="24+">24+ months</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Sort by:</span>
              </div>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="amount_high">Highest Amount</SelectItem>
                  <SelectItem value="amount_low">Lowest Amount</SelectItem>
                  <SelectItem value="rate_high">Highest Rate</SelectItem>
                  <SelectItem value="rate_low">Lowest Rate</SelectItem>
                  <SelectItem value="funded_high">Most Funded</SelectItem>
                  <SelectItem value="funded_low">Least Funded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(filterAmount !== "all" || filterRate !== "all" || filterTerm !== "all") && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {filterAmount !== "all" && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterAmount("all")}>
                    Amount: {filterAmount} ×
                  </Badge>
                )}
                {filterRate !== "all" && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterRate("all")}>
                    Rate: {filterRate}% ×
                  </Badge>
                )}
                {filterTerm !== "all" && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterTerm("all")}>
                    Term: {filterTerm} mo ×
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterAmount("all");
                    setFilterRate("all");
                    setFilterTerm("all");
                  }}
                  className="h-7 text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {filteredLoans.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {loanRequests.length === 0 ? "No loan requests yet" : "No loans match your filters"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {loanRequests.length === 0
                  ? "Be the first to create a loan request"
                  : "Try adjusting your filters to see more results"}
              </p>
              {loanRequests.length === 0 ? (
                <Button onClick={() => setIsCreateDialogOpen(true)} variant="hero">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Request
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setFilterAmount("all");
                    setFilterRate("all");
                    setFilterTerm("all");
                  }}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredLoans.map((loan) => {
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
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={loan.borrower?.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <button
                          onClick={() => navigate(`/profile/${loan.borrower_id}`)}
                          className="font-medium text-primary hover:underline cursor-pointer"
                        >
                          {loan.borrower?.full_name || "User"}
                        </button>
                        {isOwnLoan && (
                          <Badge variant="outline" className="ml-auto">Your Request</Badge>
                        )}
                      </div>
                      {loan.borrower_profile && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span>Rating:</span>
                            <div className="flex">
                              {(() => {
                                // Calculate star rating (0-5)
                                let rating = 3; // Default neutral rating
                                const { credit_score, successful_loans_count, defaults_count } = loan.borrower_profile;
                                
                                // Start with credit score influence (if available)
                                if (credit_score) {
                                  if (credit_score >= 750) rating = 5;
                                  else if (credit_score >= 700) rating = 4.5;
                                  else if (credit_score >= 650) rating = 4;
                                  else if (credit_score >= 600) rating = 3.5;
                                  else rating = 3;
                                }
                                
                                // Adjust based on loan history
                                if (successful_loans_count > 0 || defaults_count > 0) {
                                  const successRate = successful_loans_count / (successful_loans_count + defaults_count);
                                  
                                  if (successRate === 1 && successful_loans_count >= 3) {
                                    rating = Math.min(5, rating + 0.5); // Perfect record bonus
                                  } else if (successRate >= 0.9) {
                                    rating = Math.min(5, rating + 0.25);
                                  } else if (successRate < 0.7) {
                                    rating = Math.max(1, rating - 0.5);
                                  }
                                }
                                
                                return Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < Math.floor(rating)
                                        ? "fill-yellow-400 text-yellow-400"
                                        : i < rating
                                        ? "fill-yellow-200 text-yellow-400"
                                        : "fill-none text-gray-300"
                                    }`}
                                  />
                                ));
                              })()}
                            </div>
                          </div>
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
                        <div className="text-right">
                          <span className="font-semibold">
                            {formatCurrency(loan.amount_requested, loan.currency)}
                          </span>
                          {loan.currency !== 'USD' && conversionRates[loan.id] && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {conversionRates[loan.id]}
                            </div>
                          )}
                        </div>
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

                    {/* Action Buttons */}
                    {isOwnLoan && loan.status === "open" && loan.amount_funded === 0 && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openEditDialog(loan)}
                          variant="outline"
                          className="flex-1"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => openDeleteDialog(loan)}
                          variant="outline"
                          className="flex-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    )}
                    {isOwnLoan && loan.amount_funded > 0 && (
                      <p className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded">
                        Cannot edit or delete loan with funding received
                      </p>
                    )}
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

      {/* Edit Loan Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Loan Request</DialogTitle>
            <DialogDescription>
              Update the details for your loan request
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditLoan} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="e.g., Business expansion loan"
                value={editLoan.title}
                onChange={(e) => setEditLoan({ ...editLoan, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe your loan purpose..."
                value={editLoan.description}
                onChange={(e) => setEditLoan({ ...editLoan, description: e.target.value })}
                required
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="100"
                  placeholder="10000"
                  value={editLoan.amount_requested}
                  onChange={(e) => setEditLoan({ ...editLoan, amount_requested: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Minimum: {getCurrencySymbol(editLoan.currency)}100</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Select
                  value={editLoan.currency}
                  onValueChange={(value) => setEditLoan({ ...editLoan, currency: value })}
                >
                  <SelectTrigger id="edit-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.code} - {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-interest">Interest Rate (% APR)</Label>
                <Input
                  id="edit-interest"
                  type="number"
                  step="0.1"
                  min="4"
                  placeholder="5.5"
                  value={editLoan.interest_rate}
                  onChange={(e) => setEditLoan({ ...editLoan, interest_rate: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Minimum: 4% annual</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-months">Repayment Period (months)</Label>
                <Input
                  id="edit-months"
                  type="number"
                  placeholder="12"
                  value={editLoan.repayment_months}
                  onChange={(e) => setEditLoan({ ...editLoan, repayment_months: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" variant="hero" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Request"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedLoan?.title}"? This action cannot be undone.
              {selectedLoan && selectedLoan.amount_funded > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Note: This loan has received investments and cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLoan}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                min={selectedLoan ? Math.min(calculateMinInvestment(selectedLoan.amount_requested), selectedLoan.amount_requested - selectedLoan.amount_funded) : 10}
                placeholder={selectedLoan ? `Min: ${formatMinInvestment(Math.min(calculateMinInvestment(selectedLoan.amount_requested), selectedLoan.amount_requested - selectedLoan.amount_funded))}` : "Enter amount"}
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                required
                max={selectedLoan ? selectedLoan.amount_requested - selectedLoan.amount_funded : undefined}
              />
              
              {/* Quick Amount Buttons */}
              {selectedLoan && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {[10, 25, 50, 75, 100].map((percentage) => {
                    const remainingAmount = selectedLoan.amount_requested - selectedLoan.amount_funded;
                    const amount = (remainingAmount * percentage) / 100;
                    const calculatedMinInvestment = calculateMinInvestment(selectedLoan.amount_requested);
                    const effectiveMinInvestment = Math.min(calculatedMinInvestment, remainingAmount);
                    const isDisabled = amount < effectiveMinInvestment && percentage !== 100;
                    
                    return (
                      <Button
                        key={percentage}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isDisabled}
                        onClick={() => setInvestmentAmount(amount.toFixed(2))}
                        className="text-xs"
                      >
                        {percentage === 100 ? 'Full Amount' : `${percentage}%`}
                        <span className="ml-1 text-muted-foreground">
                          ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              )}
              
              {selectedLoan && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    Min: {formatMinInvestment(Math.min(calculateMinInvestment(selectedLoan.amount_requested), selectedLoan.amount_requested - selectedLoan.amount_funded))} | Max: ${(selectedLoan.amount_requested - selectedLoan.amount_funded).toLocaleString()}
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
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
              />
              <Label
                htmlFor="is-anonymous"
                className="text-sm font-normal cursor-pointer"
              >
                Invest anonymously (your name will not be shown to the borrower)
              </Label>
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