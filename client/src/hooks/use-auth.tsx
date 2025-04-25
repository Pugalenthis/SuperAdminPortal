import { createContext, ReactNode, useContext, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SuperAdmin } from "@/types";
import { getQueryFn, apiRequest } from "../lib/queryClient";
import { LoginCredentials } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SuperAdmin | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: LoginCredentials) => void;
  logout: () => void;
  loginLoading: boolean;
  logoutLoading: boolean;
};

// Initialize with default values to prevent null context
const defaultAuthContext: AuthContextType = {
  user: null,
  isLoading: false,
  error: null,
  login: () => {},
  logout: () => {},
  loginLoading: false,
  logoutLoading: false
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch the current user
  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<SuperAdmin | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Debug auth state changes
  useEffect(() => {
    console.log("AuthProvider state updated:", { user, isLoading });
  }, [user, isLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (userData: SuperAdmin) => {
      console.log("Login successful, updating auth state");
      
      // Update the query cache with the user data
      queryClient.setQueryData(["/api/user"], userData);
      
      // Refetch to be sure
      refetch();
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      console.log("Logout successful, clearing auth state");
      
      // Clear the user from the query cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Invalidate to force refetch on next query
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Login function to expose via context
  const login = (credentials: LoginCredentials) => {
    console.log("Login function called with:", credentials);
    loginMutation.mutate(credentials);
  };

  // Logout function to expose via context
  const logout = () => {
    console.log("Logout function called");
    logoutMutation.mutate();
  };

  // Value to provide to the context
  const authValue: AuthContextType = {
    user: user ?? null,
    isLoading,
    error,
    login,
    logout,
    loginLoading: loginMutation.isPending,
    logoutLoading: logoutMutation.isPending
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
