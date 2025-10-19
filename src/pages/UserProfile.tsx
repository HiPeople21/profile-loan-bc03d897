import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Star, TrendingUp, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface UserProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserStatsData {
  totalBorrowed: number;
  totalInvested: number;
  rating: number;
  successfulLoans: number;
  defaults: number;
}

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch total borrowed
      const { data: loans, error: loansError } = await supabase
        .from("loan_requests")
        .select("amount_requested")
        .eq("borrower_id", userId);

      if (loansError) throw loansError;
      const totalBorrowed = loans?.reduce((sum, loan) => sum + Number(loan.amount_requested), 0) || 0;

      // Fetch total invested
      const { data: investments, error: investError } = await supabase
        .from("investments")
        .select("amount")
        .eq("investor_id", userId);

      if (investError) throw investError;
      const totalInvested = investments?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      // Fetch borrower profile for rating calculation
      const { data: borrowerProfile } = await supabase
        .from("borrower_profiles")
        .select("credit_score, successful_loans_count, defaults_count")
        .eq("user_id", userId)
        .maybeSingle();

      // Calculate star rating (0-5)
      let rating = 3; // Default neutral rating
      let successfulLoans = 0;
      let defaults = 0;
      
      if (borrowerProfile) {
        const { credit_score, successful_loans_count, defaults_count } = borrowerProfile;
        successfulLoans = successful_loans_count || 0;
        defaults = defaults_count || 0;
        
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
            rating = Math.min(5, rating + 0.5);
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

      setStats({
        totalBorrowed,
        totalInvested,
        rating: Math.round(rating * 2) / 2, // Round to nearest 0.5
        successfulLoans,
        defaults,
      });
    } catch (error: any) {
      toast.error("Failed to load user profile");
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

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">User profile not found</p>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
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
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      {/* Profile Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">
                    {profile.full_name || "Anonymous User"}
                  </CardTitle>
                  {stats && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= Math.floor(stats.rating)
                                ? "fill-primary text-primary"
                                : star - 0.5 <= stats.rating
                                ? "fill-primary/50 text-primary"
                                : "fill-muted text-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-lg font-semibold">{stats.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {stats && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Total Borrowed</p>
                          <p className="text-2xl font-bold text-foreground">
                            ${stats.totalBorrowed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Total Invested</p>
                          <p className="text-2xl font-bold text-primary">
                            ${stats.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Track Record */}
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground mb-3 text-center">Track Record</p>
                      <div className="text-center text-sm">
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          {stats.successfulLoans} successful
                        </span>
                        <span className="text-muted-foreground mx-2">•</span>
                        <span className="text-red-600 dark:text-red-400 font-semibold">
                          {stats.defaults} defaults
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
