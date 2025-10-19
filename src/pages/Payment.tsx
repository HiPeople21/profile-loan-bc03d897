import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentState {
  loanId: string;
  amount: number;
  isAnonymous: boolean;
  loanTitle: string;
}

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const paymentData = location.state as PaymentState;

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  if (!paymentData) {
    navigate("/dashboard");
    return null;
  }

  const handleMockPayment = async () => {
    setIsProcessing(true);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Insert the investment after successful "payment"
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: investError } = await supabase
        .from("investments")
        .insert({
          loan_id: paymentData.loanId,
          investor_id: user.id,
          amount: paymentData.amount,
          is_anonymous: paymentData.isAnonymous,
        });

      if (investError) throw investError;

      setPaymentSuccess(true);
      toast.success("Payment successful! Investment recorded.");

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/my-investments");
      }, 2000);
    } catch (error: any) {
      toast.error("Payment failed: " + error.message);
      setIsProcessing(false);
    }
  };

  const handleRealPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      toast.error("Please fill in all card details");
      return;
    }

    if (cardNumber.replace(/\s/g, "").length !== 16) {
      toast.error("Invalid card number");
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      toast.error("Invalid expiry date format (MM/YY)");
      return;
    }

    if (cvv.length !== 3 && cvv.length !== 4) {
      toast.error("Invalid CVV");
      return;
    }

    // For now, treat this as a mock payment since we don't have real payment processing
    await handleMockPayment();
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(" ");
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, "");
    if (value.length <= 16 && /^\d*$/.test(value)) {
      setCardNumber(formatCardNumber(value));
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length >= 2) {
      value = value.slice(0, 2) + "/" + value.slice(2, 4);
    }
    if (value.length <= 5) {
      setExpiryDate(value);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setCvv(value);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">Payment Successful!</h2>
            <p className="text-muted-foreground">
              Your investment has been recorded. Redirecting...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="container mx-auto max-w-2xl py-8">
        <Button
          onClick={() => navigate("/dashboard")}
          variant="ghost"
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Complete Your Investment
            </CardTitle>
            <CardDescription>
              You are investing ${paymentData.amount.toLocaleString()} in "{paymentData.loanTitle}"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleRealPayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardholderName">Cardholder Name</Label>
                <Input
                  id="cardholderName"
                  placeholder="John Doe"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  disabled={isProcessing}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={handleExpiryChange}
                    disabled={isProcessing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    type="password"
                    value={cvv}
                    onChange={handleCvvChange}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>Pay ${paymentData.amount.toLocaleString()}</>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or for testing</span>
              </div>
            </div>

            <Button
              onClick={handleMockPayment}
              variant="outline"
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Mock Payment...
                </>
              ) : (
                "Make Mock Payment"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              For testing purposes, you can use the mock payment option which will simulate a successful payment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
