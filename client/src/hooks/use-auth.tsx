import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { SuperAdmin } from "@/types";
import { getQueryFn } from "../lib/queryClient";

type AuthContextType = {
  user: SuperAdmin | null;
  isLoading: boolean;
  error: Error | null;
};

// Initialize with default values to prevent null context
const defaultAuthContext: AuthContextType = {
  user: null,
  isLoading: false,
  error: null
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SuperAdmin | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Value to provide to the context
  const authValue: AuthContextType = {
    user: user ?? null,
    isLoading,
    error
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
