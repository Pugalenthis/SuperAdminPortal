import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AdminList } from "@/components/admin-list";
import { LogOut } from "lucide-react";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-neutral-900">Digital Business Card Platform</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-neutral-600">{user?.email}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-neutral-600 hover:text-neutral-900"
            >
              {logoutMutation.isPending ? (
                "Signing out..."
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminList />
      </main>
    </div>
  );
}
