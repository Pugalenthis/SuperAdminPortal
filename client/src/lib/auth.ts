// Direct authentication functions without toast dependencies
import { LoginCredentials } from "@/types";
import { queryClient } from "./queryClient";

/**
 * Direct API login function that bypasses React Query
 */
export async function loginUser(credentials: LoginCredentials): Promise<{success: boolean; message: string}> {
  try {
    console.log("loginUser function called with:", credentials);
    
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
      credentials: "include"
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }
    
    const userData = await response.json();
    console.log("Login successful from direct call:", userData);
    
    // Update the React Query cache
    queryClient.setQueryData(["/api/user"], userData);
    
    // Invalidate the query to refetch
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    
    return {
      success: true,
      message: "Login successful!"
    };
  } catch (error) {
    console.error("Login error:", error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Direct API logout function that bypasses React Query
 */
export async function logoutUser(): Promise<{success: boolean; message: string}> {
  try {
    const response = await fetch("/api/logout", {
      method: "POST",
      credentials: "include"
    });
    
    if (!response.ok) {
      throw new Error(`Logout failed: ${response.statusText}`);
    }
    
    // Update the React Query cache
    queryClient.setQueryData(["/api/user"], null);
    
    // Invalidate the query to refetch
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    
    return {
      success: true,
      message: "Logged out successfully"
    };
  } catch (error) {
    console.error("Logout error:", error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}