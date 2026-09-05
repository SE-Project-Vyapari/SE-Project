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

import { Overview } from './modules/overview/Overview';
import { PosPage } from './modules/pos/PosPage';
import { InventoryList } from './modules/inventory/InventoryList';
import { TransferList } from './modules/inventory/TransferList';
import { ProductDetail } from './modules/inventory/ProductDetail';
import { OrderList } from './modules/orders/OrderList';
import { OrderDetail } from './modules/orders/OrderDetail';
import { InvoicesList, InvoiceDetail } from './modules/invoices';
import { CustomerList, CustomerProfile } from './modules/crm';
import { ChurnInsightsPage } from './modules/churn-insights';
import { FinancePage } from './modules/finance';
import { EmployeeList, EmployeeDetail, AttendancePage } from './modules/employees';
import { PayrollPage } from './modules/payroll';
import { AnalyticsPage } from './modules/analytics';

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
        <Route path="/" element={<Overview />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/orders" element={<OrderList />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/inventory" element={<InventoryList />} />
        <Route path="/inventory/transfers" element={<TransferList />} />
        <Route path="/inventory/:id" element={<ProductDetail />} />
        <Route path="/invoices" element={<InvoicesList />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/:id" element={<CustomerProfile />} />
        <Route path="/insights" element={<ChurnInsightsPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/forecasting" element={<FeaturePlaceholder title="Forecasting" />} />
        <Route path="/ai-assistant" element={<FeaturePlaceholder title="AI Assistant" />} />
        <Route path="/notifications" element={<FeaturePlaceholder title="Notifications" />} />
        <Route path="/employees" element={<EmployeeList />} />
        <Route path="/employees/attendance" element={<AttendancePage />} />
        <Route path="/employees/:id" element={<EmployeeDetail />} />
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
