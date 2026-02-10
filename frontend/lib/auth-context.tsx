"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  auth as authApi,
  clearTokens,
  getAccessToken,
} from "./api";
import type { SigninRequest, SignupRequest, User } from "./types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signin: (data: SigninRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if there's a stored token and try to restore session
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      // Decode the JWT to get user info (the payload has subject = user ID)
      // We don't have a /api/users/me endpoint, so we store user in localStorage too
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          clearTokens();
          localStorage.removeItem("user");
        }
      }
    }
    setIsLoading(false);
  }, []);

  // Persist user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const signin = useCallback(async (data: SigninRequest) => {
    const res = await authApi.signin(data);
    setUser(res.user);
  }, []);

  const signup = useCallback(async (data: SignupRequest) => {
    const res = await authApi.signup(data);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signin, signup, logout, setUser }}
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
