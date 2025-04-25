import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut, Plus, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { Admin } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { toast } = useToast();
  const [userData, setUserData] = useState<{id: number, email: string} | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);

  // Fetch user data directly
  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("User data fetched:", data);
          setUserData(data);
        } else {
          console.error("Failed to fetch user data");
          // Force redirect to login if not authenticated
          window.location.href = '/auth';
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        window.location.href = '/auth';
      } finally {
        setIsLoadingUser(false);
      }
    }
    
    fetchUserData();
  }, []);

  // Fetch admins directly
  useEffect(() => {
    async function fetchAdmins() {
      if (!userData) return; // Don't fetch if not logged in
      
      try {
        setIsLoadingAdmins(true);
        const response = await fetch('/api/admins', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Admins fetched:", data);
          setAdmins(data);
        } else {
          console.error("Failed to fetch admins");
          toast({
            title: "Error",
            description: "Failed to load admin data",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching admins:", error);
        toast({
          title: "Error",
          description: "Failed to load admin data",
          variant: "destructive"
        });
      } finally {
        setIsLoadingAdmins(false);
      }
    }
    
    if (userData) {
      fetchAdmins();
    }
  }, [userData, toast]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast({
          title: "Logged out",
          description: "You have been logged out successfully."
        });
        window.location.href = '/auth';
      } else {
        toast({
          title: "Logout failed",
          description: "Failed to log out",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error during logout:", error);
      toast({
        title: "Logout failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userData) {
    // This shouldn't happen since we redirect in the useEffect, but just in case
    window.location.href = '/auth';
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Logged in as: {userData.email}</span>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Organization Admins</CardTitle>
              <CardDescription>
                Manage organization admin accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAdmins ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : admins.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No admins found. Create your first admin.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Organization
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {admins.map((admin) => (
                        <tr key={admin.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {admin.orgName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {admin.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              admin.status === "active" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }`}>
                              {admin.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(admin.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900">
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}