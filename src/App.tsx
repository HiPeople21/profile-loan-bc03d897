import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SelectRole from "./pages/SelectRole";
import BorrowerDashboard from "./pages/BorrowerDashboard";
import InvestorDashboard from "./pages/InvestorDashboard";
import BrowseBorrowers from "./pages/BrowseBorrowers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SelectRole />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/select-role" element={<SelectRole />} />
          <Route path="/borrower-dashboard" element={<ProtectedRoute requiredRole="borrower"><BorrowerDashboard /></ProtectedRoute>} />
          <Route path="/investor-dashboard" element={<ProtectedRoute requiredRole="investor"><InvestorDashboard /></ProtectedRoute>} />
          <Route path="/browse" element={<ProtectedRoute requiredRole="investor"><BrowseBorrowers /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
