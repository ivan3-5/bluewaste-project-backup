"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import api from "@/lib/api";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isResortAdmin: boolean;
  isFieldWorker: boolean;
  isCitizen: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("bluewaste_token");
    const savedUser = localStorage.getItem("bluewaste_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("bluewaste_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("bluewaste_token", data.token);
    localStorage.setItem("bluewaste_user", JSON.stringify(data.user));
  }, []);

  const register = useCallback(async (registerData: RegisterData) => {
    const { data } = await api.post("/auth/register", registerData);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("bluewaste_token", data.token);
    localStorage.setItem("bluewaste_user", JSON.stringify(data.user));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("bluewaste_token");
    localStorage.removeItem("bluewaste_user");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAdmin: user?.role === "LGU_ADMIN" || user?.role === "RESORT_ADMIN",
        isResortAdmin: user?.role === "RESORT_ADMIN",
        isFieldWorker: user?.role === "FIELD_WORKER",
        isCitizen: user?.role === "CITIZEN",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
