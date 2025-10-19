import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { TrendingUp, UserCircle, Wallet, Loader2 } from "lucide-react";

const SelectRole = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Redirect authenticated users with roles to their dashboard
  useEffect(() => {
    if (!authLoading && !roleLoading && user && role) {
      if (role === "borrower") {
        navigate("/borrower-dashboard", { replace: true });
      } else if (role === "investor") {
        navigate("/investor-dashboard", { replace: true });
      }
    }
  }, [user, role, authLoading, roleLoading, navigate]);

  // Show loading while checking auth
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const handleRoleSelection = async (selectedRole: "borrower" | "investor") => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: selectedRole });

      if (error) throw error;

      toast.success(`Welcome as ${selectedRole}!`);
      
      if (selectedRole === "borrower") {
        navigate("/borrower-dashboard");
      } else {
        navigate("/investor-dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to set role");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            LendConnect
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Choose Your Role</h1>
          <p className="text-xl text-muted-foreground">
            How would you like to use LendConnect?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-xl transition-all border-2 hover:border-primary cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <UserCircle className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">I'm a Borrower</CardTitle>
              <CardDescription className="text-base">
                Request loans with competitive interest rates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>Create loan requests</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>Build your credit history</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>Transparent repayment tracking</span>
                </li>
              </ul>
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => handleRoleSelection("borrower")}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Continue as Borrower"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all border-2 hover:border-accent cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="text-2xl">I'm an Investor</CardTitle>
              <CardDescription className="text-base">
                Invest in borrowers and earn competitive returns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>Browse verified borrowers</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>Diversify your portfolio</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>Track your investments</span>
                </li>
              </ul>
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => handleRoleSelection("investor")}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Continue as Investor"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SelectRole;
