import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PLAN_LIMITS, checkLimit as checkPlanLimit, getPlanLimits as getPlanLimitsFromConfig } from '../lib/planLimits';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Default profile when we can't fetch from DB
const defaultProfile = (user) => ({
  id: user.id,
  full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
  email: user.email || '',
  phone: user.phone || '',
  plan: 'trial',
  subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
});

const defaultLicense = { valid: true, plan: 'trial', days_left: 30 };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocal, setIsLocal] = useState(false);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
        return data;
      }
      console.warn('Profile fetch failed, using defaults:', error?.message);
    } catch (err) {
      console.warn('Profile fetch error:', err);
    }
    return null;
  }, []);

  const checkLicense = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase.rpc('check_license', { user_uuid: userId });
      if (!error && data) {
        setLicense(data);
        return;
      }
      console.warn('License check failed, using defaults:', error?.message);
    } catch (err) {
      console.warn('License check error:', err);
    }
    setLicense(defaultLicense);
  }, []);

  const handleUserSession = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      setProfile(null);
      setLicense(null);
      return;
    }

    setUser(sessionUser);

    // Fetch profile, fall back to defaults if it fails
    const profileData = await fetchProfile(sessionUser.id);
    if (!profileData) {
      setProfile(defaultProfile(sessionUser));
    }

    // Check license, falls back to defaults internally
    await checkLicense(sessionUser.id);
  }, [fetchProfile, checkLicense]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Local mode — no Supabase
      setIsLocal(true);
      setUser({ id: 'local', email: 'local@renteasy.in' });
      setProfile({
        id: 'local',
        full_name: 'Landlord',
        plan: 'trial',
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setLicense({ valid: true, plan: 'trial', days_left: 30 });
      setLoading(false);
      return;
    }

    // Use onAuthStateChange as the single source of truth (Supabase recommended)
    // It fires INITIAL_SESSION on load if a session exists
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.email);

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLicense(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock on simultaneous calls
          // See: https://github.com/supabase/auth-js/issues/888
          setTimeout(async () => {
            await handleUserSession(session.user);
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
          setLicense(null);
          setLoading(false);
        }
      }
    );

    // Safety timeout — if auth takes more than 5 seconds, stop loading
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('Auth timeout — forcing load complete');
          return false;
        }
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [handleUserSession]);

  // Auth methods
  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signInWithOTP = async (phone) => {
    const { data, error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
    return { data, error };
  };

  const verifyOTP = async (phone, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: `+91${phone}`,
      token,
      type: 'sms',
    });
    return { data, error };
  };

  const signOut = async () => {
    if (isLocal) {
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLicense(null);
  };

  const updateProfile = async (updates) => {
    if (isLocal) {
      setProfile(prev => ({ ...prev, ...updates }));
      return { error: null };
    }
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (!error) await fetchProfile(user.id);
    return { error };
  };

  // License helpers
  const currentPlan = profile?.plan || 'free';
  const getPlanLimits = () => getPlanLimitsFromConfig(currentPlan);
  const isTrialExpired = () => license && !license.valid && license.reason === 'Trial expired';
  const getDaysLeft = () => license?.days_left ? Math.max(0, Math.floor(license.days_left)) : 0;
  const isPro = () => ['pro', 'business'].includes(currentPlan);

  /**
   * Check if a feature limit allows the action
   * @param {string} feature - e.g. 'properties', 'tenants', 'attachments'
   * @param {number} currentCount - how many the user currently has
   * @returns {{ allowed: boolean, limit: number, remaining: number, message: string }}
   */
  const checkLimit = (feature, currentCount) => {
    return checkPlanLimit(currentPlan, feature, currentCount);
  };

  const refreshLicense = async () => {
    if (!user?.id || isLocal) return;
    await fetchProfile(user.id);
    await checkLicense(user.id);
  };

  const value = {
    user,
    profile,
    license,
    loading,
    isLocal,
    currentPlan,
    signUp,
    signIn,
    signInWithOTP,
    verifyOTP,
    signOut,
    updateProfile,
    getPlanLimits,
    isTrialExpired,
    getDaysLeft,
    isPro,
    checkLimit,
    refreshLicense,
    PLAN_LIMITS,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
