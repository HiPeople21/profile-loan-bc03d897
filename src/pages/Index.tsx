import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, Users, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();
  }, [navigate]);
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              LendConnect
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero" size="lg">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        
        <div className="container mx-auto px-4 pt-20 pb-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Shield className="h-4 w-4" />
              Secure & Transparent P2P Lending
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Connect Borrowers with{" "}
              <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                Investors Directly
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A premium peer-to-peer lending platform where borrowers get fair rates 
              and investors earn competitive returns. Built on trust, transparency, and technology.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  Start Investing <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Request a Loan
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">$2.5M+</div>
                <div className="text-sm text-muted-foreground">Total Funded</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">1,200+</div>
                <div className="text-sm text-muted-foreground">Active Loans</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">94%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose LendConnect?</h2>
            <p className="text-xl text-muted-foreground">
              Premium features designed for modern lending
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-border">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Verified & Secure</h3>
              <p className="text-muted-foreground mb-6">
                Every borrower undergoes KYC verification and credit checks. Your investments are protected.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Identity verification required</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Credit score analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Default protection fund</span>
                </li>
              </ul>
            </div>

            <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-border">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Competitive Returns</h3>
              <p className="text-muted-foreground mb-6">
                Investors earn better returns than traditional savings. Borrowers get fair interest rates.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Choose your risk level</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Diversify your portfolio</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Transparent fee structure</span>
                </li>
              </ul>
            </div>

            <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-border">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Community Driven</h3>
              <p className="text-muted-foreground mb-6">
                Browse borrower profiles, read their stories, and invest in causes you believe in.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Detailed borrower profiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Transparent loan history</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Multi-currency support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-primary via-primary-glow to-accent rounded-3xl p-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-xl mb-8 opacity-90">
                Join thousands of borrowers and investors building financial freedom together
              </p>
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90 shadow-xl"
                >
                  Create Your Account <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">LendConnect</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 LendConnect. Secure peer-to-peer lending platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
