import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import KYC from "./pages/KYC";
import Dashboard from "./pages/Dashboard";
import CourseDetail from "./pages/CourseDetail";
import CourseLanding from "./pages/CourseLanding";
import Lesson from "./pages/Lesson";
import Certificate from "./pages/Certificate";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/kyc" element={<KYC />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/course/:courseId" element={<CourseDetail />} />
            <Route path="/courses/:courseId" element={<CourseLanding />} />
            <Route path="/lesson/:id" element={<Lesson />} />
            <Route path="/certificate" element={<Certificate />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
