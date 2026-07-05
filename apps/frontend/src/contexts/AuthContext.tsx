'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  username: string;
  fullName: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  role: string | null;
  plan: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  updateUserPlanLocal: (newPlan: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ll_token');
    const storedUser = localStorage.getItem('ll_user');
    const storedRole = localStorage.getItem('ll_role');
    const storedPlan = localStorage.getItem('ll_plan');

    if (token && storedUser && storedRole) {
      setUser(JSON.parse(storedUser));
      setRole(storedRole);
      setPlan(storedPlan || 'BASIC');
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/signin', { email, password });
      const { accessToken, role: userRole, plan: userPlan, username, fullName } = response.data;

      localStorage.setItem('ll_token', accessToken);
      localStorage.setItem('ll_role', userRole);
      localStorage.setItem('ll_plan', userPlan);
      
      const userData = { email, username, fullName };
      localStorage.setItem('ll_user', JSON.stringify(userData));

      setUser(userData);
      setRole(userRole);
      setPlan(userPlan);
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid email or password.';
      return { success: false, error: msg };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      await api.post('/auth/signup', { email, password, fullName });
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Try again.';
      return { success: false, error: msg };
    }
  };

  const signOut = () => {
    localStorage.removeItem('ll_token');
    localStorage.removeItem('ll_user');
    localStorage.removeItem('ll_role');
    localStorage.removeItem('ll_plan');
    setUser(null);
    setRole(null);
    setPlan(null);
  };

  const updateUserPlanLocal = (newPlan: string) => {
    localStorage.setItem('ll_plan', newPlan);
    setPlan(newPlan);
  };

  return (
    <AuthContext.Provider value={{ user, role, plan, loading, signIn, signUp, signOut, updateUserPlanLocal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
