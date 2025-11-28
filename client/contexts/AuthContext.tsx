import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Hospital {
  id: string;
  name: string;
  city: string;
  state: string;
  tier: "tier2" | "tier3";
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "hospital_manager" | "coordinator";
  hospital: Hospital;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate API call - in production, this would authenticate against a backend
      const mockUser: User = {
        id: "user-1",
        email,
        name: email.split("@")[0],
        role: "hospital_manager",
        hospital: {
          id: "hosp-1",
          name: "City Medical Center",
          city: "Pune",
          state: "Maharashtra",
          tier: "tier2",
        },
      };

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      setUser(mockUser);
      localStorage.setItem("user", JSON.stringify(mockUser));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
