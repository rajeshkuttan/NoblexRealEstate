import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authAPI } from "@/services/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.data.success) {
        setUser(response.data.data.user);
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        
        if (token && userData) {
          // Use stored user data instead of making API call
          setUser(JSON.parse(userData));
        } else {
          // If no stored data, try to get user from API
          if (token) {
            try {
              const response = await authAPI.getCurrentUser();
              if (response.data.success) {
                setUser(response.data.data.user);
                localStorage.setItem("user", JSON.stringify(response.data.data.user));
              } else {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
              }
            } catch (error: any) {
              // If API call fails due to connection issues, use mock data for demo
              if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
                console.warn("Backend not available, using demo mode");
                const demoUser = {
                  id: 1,
                  name: 'Demo User',
                  email: 'demo@emirateslease.com',
                  role: 'admin',
                  phone: '+971 50 123 4567',
                  avatar: '/placeholder.svg'
                };
                setUser(demoUser);
                localStorage.setItem("user", JSON.stringify(demoUser));
                localStorage.setItem("token", "demo-token");
              } else {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
              }
            }
          }
        }
      } catch (error: any) {
        console.error("Auth check failed:", error);
        // Don't clear stored data on general errors, only on auth failures
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login({ email, password });
      if (response.data.success) {
        // Store token and user data
        localStorage.setItem("token", response.data.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
        setUser(response.data.data.user);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Login failed:", error);
      
      // If backend is not available, allow demo login
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        console.warn("Backend not available, allowing demo login");
        const demoUser = {
          id: 1,
          name: 'Demo User',
          email: email,
          role: 'admin',
          phone: '+971 50 123 4567',
          avatar: '/placeholder.svg'
        };
        localStorage.setItem("token", "demo-token");
        localStorage.setItem("user", JSON.stringify(demoUser));
        setUser(demoUser);
        return true;
      }
      
      return false;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
