import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import DashboardHome from "./pages/DashboardHome";
import AgentChat from "./pages/AgentChat";
import Boardroom from "./pages/Boardroom";
import IdeaStats from "./pages/IdeaStats";
import ValidatorPage from "./pages/ValidatorPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<DashboardHome />} />
            <Route path="agent/:agentId" element={<AgentChat />} />
            <Route path="boardroom" element={<Boardroom />} />
            <Route path="stats" element={<IdeaStats />} />
            <Route path="validator" element={<ValidatorPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
