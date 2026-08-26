import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StyleGuide from './StyleGuide';
import { Login } from './app-shell/auth/Login';
import { OnboardingWizard } from './app-shell/onboarding/OnboardingWizard';
import { AuthProvider, useAuth } from './app-shell/auth/AuthContext';
import { AppShell } from './app-shell/AppShell';

const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuth();
  if (currentUser) return <Navigate to="/" replace />;
  return <>{children}</>;
};

<<<<<<< HEAD
import { Overview } from './modules/overview/Overview';
=======
const DashboardPlaceholder = () => (
  <div style={{ padding: 40 }}>
    <h1>Overview Dashboard (Prompt 05)</h1>
    <p>Authenticated successfully. Select a module from the sidebar.</p>
  </div>
);
>>>>>>> 080a965ddd867508fec967cc40ed9f29a9d2172d

const FeaturePlaceholder = ({ title }: { title: string }) => (
  <div style={{ padding: 40 }}>
    <h1>{title}</h1>
    <p>This page is successfully routed and authorized.</p>
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
      <Route path="/onboarding" element={<AuthRedirect><OnboardingWizard /></AuthRedirect>} />
      <Route path="/style-guide" element={<StyleGuide />} />
      
      {/* Protected App Shell Routes */}
      <Route element={<AppShell />}>
<<<<<<< HEAD
        <Route path="/" element={<Overview />} />
=======
        <Route path="/" element={<DashboardPlaceholder />} />
>>>>>>> 080a965ddd867508fec967cc40ed9f29a9d2172d
        <Route path="/pos" element={<FeaturePlaceholder title="Point of Sale" />} />
        <Route path="/orders" element={<FeaturePlaceholder title="Orders" />} />
        <Route path="/inventory" element={<FeaturePlaceholder title="Inventory" />} />
        <Route path="/invoices" element={<FeaturePlaceholder title="Invoices" />} />
        <Route path="/customers" element={<FeaturePlaceholder title="Customers" />} />
        <Route path="/insights" element={<FeaturePlaceholder title="Customer Insights" />} />
        <Route path="/finance" element={<FeaturePlaceholder title="Finance" />} />
        <Route path="/payroll" element={<FeaturePlaceholder title="Payroll" />} />
        <Route path="/analytics" element={<FeaturePlaceholder title="Analytics" />} />
        <Route path="/forecasting" element={<FeaturePlaceholder title="Forecasting" />} />
        <Route path="/ai-assistant" element={<FeaturePlaceholder title="AI Assistant" />} />
        <Route path="/notifications" element={<FeaturePlaceholder title="Notifications" />} />
        <Route path="/employees" element={<FeaturePlaceholder title="Employees" />} />
        <Route path="/reports" element={<FeaturePlaceholder title="Reports" />} />
        <Route path="/settings" element={<FeaturePlaceholder title="Settings" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
