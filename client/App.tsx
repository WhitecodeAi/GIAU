import "./global.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginFixed from "./pages/LoginFixed";
import DashboardFixed from "./pages/DashboardFixed";
import AdminDashboard from "./pages/AdminDashboard";
import RegistrationForm from "./pages/RegistrationForm";
import Reports from "./pages/Reports";
import AllRegistrations from "./pages/AllRegistrations";
import UserVerification from "./pages/UserVerification";
import SimpleFileUpload from "./pages/SimpleFileUpload";
import TestUpload from "./pages/TestUpload";
import ApiTest from "./pages/ApiTest";
import CompressionTest from "./pages/CompressionTest";
import CameraTest from "./pages/CameraTest";
import UsersManagement from "./pages/UsersManagement";
import UserRegistrations from "./pages/UserRegistrations";
import RegistrationDetails from "./pages/RegistrationDetails";
import TestSignatureExport from "./pages/TestSignatureExport";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginFixed />} />
        <Route path="/dashboard" element={<DashboardFixed />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UsersManagement />} />
        <Route
          path="/admin/users/:userId/registrations"
          element={<UserRegistrations />}
        />
        <Route path="/registration" element={<RegistrationForm />} />
        <Route path="/registrations" element={<AllRegistrations />} />
        <Route
          path="/registration-details/:id"
          element={<RegistrationDetails />}
        />
        <Route path="/verify" element={<UserVerification />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/test-upload" element={<SimpleFileUpload />} />
        <Route path="/test-simple" element={<TestUpload />} />
        <Route path="/api-test" element={<ApiTest />} />
        <Route path="/compression-test" element={<CompressionTest />} />
        <Route path="/camera-test" element={<CameraTest />} />
        <Route path="/test-signature" element={<TestSignatureExport />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
