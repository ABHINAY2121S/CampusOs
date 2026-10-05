import React, { createContext, useContext, useState, useEffect } from "react";
import { User, login as apiLogin, getMe } from "../api/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: "student" | "faculty" | "hod" | "admin" | "technician";
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setRoleOverride: (role: "student" | "admin") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("campus_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("campus_token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const freshUser = await getMe();
          setUser(freshUser);
          localStorage.setItem("campus_user", JSON.stringify(freshUser));
        } catch {
          // Token expired or invalid
          localStorage.removeItem("campus_token");
          localStorage.removeItem("campus_user");
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiLogin(email, password);
    localStorage.setItem("campus_token", res.token);
    localStorage.setItem("campus_user", JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem("campus_token");
    localStorage.removeItem("campus_user");
    setUser(null);
    setToken(null);
  };

  const setRoleOverride = (overrideRole: "student" | "admin") => {
    if (user) {
      const updated = { ...user, role: overrideRole as any };
      setUser(updated);
      localStorage.setItem("campus_user", JSON.stringify(updated));
    }
  };

  const currentRole = (user?.role === "admin" || user?.role === "hod" ? "admin" : "student") as any;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: currentRole,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        setRoleOverride,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
