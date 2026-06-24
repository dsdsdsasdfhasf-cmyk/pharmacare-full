import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { AuthProvider, useAuth } from "@/context/auth";

import Dashboard from "@/pages/dashboard";
import Medicines from "@/pages/medicines/index";
import Sales from "@/pages/sales/index";
import POS from "@/pages/sales/new";
import Purchases from "@/pages/purchases/index";
import NewPurchase from "@/pages/purchases/new";
import Suppliers from "@/pages/suppliers/index";
import Customers from "@/pages/customers/index";
import Prescriptions from "@/pages/prescriptions/index";
import Categories from "@/pages/categories/index";
import Reports from "@/pages/reports/index";
import Alerts from "@/pages/alerts/index";
import UsersPage from "@/pages/users/index";
import LoginPage from "@/pages/auth/login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isAdmin = user.role === "admin";

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/sales/new" component={POS} />
        <Route path="/medicines" component={Medicines} />
        <Route path="/sales" component={Sales} />
        {isAdmin && <Route path="/purchases" component={Purchases} />}
        {isAdmin && <Route path="/purchases/new" component={NewPurchase} />}
        {isAdmin && <Route path="/suppliers" component={Suppliers} />}
        <Route path="/customers" component={Customers} />
        <Route path="/prescriptions" component={Prescriptions} />
        {isAdmin && <Route path="/categories" component={Categories} />}
        {isAdmin && <Route path="/reports" component={Reports} />}
        <Route path="/alerts" component={Alerts} />
        {isAdmin && <Route path="/users" component={UsersPage} />}
        <Route>
          {isAdmin ? <NotFound /> : <Redirect to="/" />}
        </Route>
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ProtectedRoutes />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
