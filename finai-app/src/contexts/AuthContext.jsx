// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import defaultAvatar from '../assets/avatar_predeterminado.png';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMounted = useRef(false);

  // Función para cargar perfil de usuario en segundo plano
  const fetchUserProfile = useCallback(async (userId, fallbackEmail) => {
    if (!isMounted.current || !userId) return;
    console.log('[AuthContext] fetchUserProfile start', userId);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, avatar_attributes')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      // Convertir campos snake_case a camelCase
      const avatarUrl = profile?.avatar_url || defaultAvatar;
      let avatarAttributes = null;
      if (profile?.avatar_attributes) {
        try {
          avatarAttributes = typeof profile.avatar_attributes === 'string'
            ? JSON.parse(profile.avatar_attributes)
            : profile.avatar_attributes;
        } catch {
          avatarAttributes = null;
        }
      }
      setUserProfile({
        id: profile?.id || userId,
        fullName: profile?.full_name || fallbackEmail.split('@')[0] || 'Usuario',
        avatarUrl,
        avatarAttributes,
      });
      console.log('[AuthContext] fetchUserProfile loaded', {
        id: profile.id,
        fullName: profile.full_name,
        avatarUrl,
        avatarAttributes
      });
    } catch (err) {
      console.error('[AuthContext] fetchUserProfile error:', err);
      setUserProfile({
        id: userId,
        fullName: 'Error Perfil',
        avatarUrl: defaultAvatar,
        avatarAttributes: null,
      });
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    console.log('[AuthContext] init effect start');

    // Carga inicial de sesión
    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!isMounted.current) return;
        console.log('[AuthContext] got session', initialSession);
        setSession(initialSession);
        const currentUser = initialSession?.user || null;
        setUser(currentUser);
        setLoading(false);
        if (currentUser) fetchUserProfile(currentUser.id, currentUser.email);
        else setUserProfile(null);
      })
      .catch(err => {
        console.error('[AuthContext] getSession error:', err);
        setSession(null);
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      });

    // Suscribirse a cambios de autenticación
    const { data } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted.current) return;
        console.log('[AuthContext] auth change', newSession);
        setSession(newSession);
        const newUser = newSession?.user || null;
        setUser(newUser);
        setLoading(false);
        if (newUser) fetchUserProfile(newUser.id, newUser.email);
        else setUserProfile(null);
      }
    );
    const subscription = data.subscription;

    return () => {
      console.log('[AuthContext] cleanup effect');
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const logout = useCallback(async () => {
    const toastId = toast.loading('Cerrando sesión...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Sesión cerrada.', { id: toastId });
      navigate('/login');
    } catch (err) {
      toast.error('Error al cerrar sesión.', { id: toastId });
      console.error('[AuthContext] logout error:', err);
    }
  }, [navigate]);

  const value = {
    user,
    session,
    userProfile,
    loading,
    logout,
    signUp: (email, password, options) => supabase.auth.signUp({ email, password, options }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signInWithGoogle: () =>
      supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } }),
    resetPasswordForEmail: (email) =>
      supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' }),
    updateUserPassword: (password) => supabase.auth.updateUser({ password }),
    refreshUserProfile: () => user?.id && fetchUserProfile(user.id, user.email || ''),
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.9)',
            zIndex: 9999,
          }}
        >
          <p style={{ fontSize: '1.2em' }}>Cargando FinAI...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};

