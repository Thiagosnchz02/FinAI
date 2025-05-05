/*
Archivo: src/contexts/AuthContext.jsx
Propósito: Define el Contexto de Autenticación para gestionar el estado
          del usuario y la sesión en toda la aplicación.
*/
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react'; // Añade useCallback
import { supabase } from '../services/supabaseClient'; // Asegúrate que importa supabase
import { useNavigate } from 'react-router-dom'; // Para posible navegación explícita
import toast from 'react-hot-toast'; // Para feedback

// 1. Crear el Contexto
const AuthContext = createContext(null); // Valor inicial null o un objeto por defecto

// 2. Crear el Proveedor del Contexto (Auth Provider Component)
// Este componente envolverá nuestra aplicación y proporcionará el estado de auth.
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Estado para guardar el objeto usuario de Supabase
    const [session, setSession] = useState(null); // Estado para guardar la sesión completa (opcional pero útil)
    const [loading, setLoading] = useState(true); // Estado para saber si se está comprobando la sesión inicial
    const navigate = useNavigate();

    useEffect(() => {
        // --- Comprobar sesión inicial ---
        // Intenta obtener la sesión actual al cargar la aplicación.
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null); // Si hay sesión, establece el usuario, si no, null
            setLoading(false); // Termina la carga inicial
            console.log("AuthContext: Sesión inicial comprobada.", session);
        }).catch(error => {
            console.error("AuthContext: Error al obtener sesión inicial:", error);
            setLoading(false); // Termina la carga aunque haya error
        });

        // --- Escuchar cambios de autenticación ---
        // onAuthStateChange se dispara cuando el usuario inicia sesión, cierra sesión,
        // se actualiza el token, o se recupera la contraseña.
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`AuthContext: Evento recibido - ${event}`, session);
                setSession(session); // Actualiza la sesión completa
                setUser(session?.user ?? null); // Actualiza el usuario basado en la nueva sesión
                // Opcional: Podrías añadir lógica aquí si necesitas hacer algo específico
                // en ciertos eventos, como cargar datos del perfil después de SIGNED_IN.
                if (event === 'SIGNED_IN') { /* cargar perfil */ }
                if (event === 'SIGNED_OUT') { /* limpiar datos usuario */ }

                // Asegurarse de que la carga inicial termine si este evento llega antes que getSession
                if (loading) {
                    setLoading(false);
                }
            }
        );

        // --- Limpieza del listener ---
        // Es importante desuscribirse del listener cuando el componente AuthProvider se desmonte
        // para evitar fugas de memoria.
        return () => {
            authListener?.subscription.unsubscribe();
            console.log("AuthContext: Listener de autenticación detenido.");
        };
    }, [loading]); // Ejecutar efecto al montar y si 'loading' cambia (aunque getSession solo corre una vez)

    // --- Define la función de logout aquí ---
    const logout = useCallback(async () => {
        const toastId = toast.loading('Cerrando sesión...');
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // setUser(null) ocurrirá por el onAuthStateChange listener
             toast.success('Sesión cerrada.', { id: toastId });
            // La redirección también debería ocurrir por el listener o ProtectedRoute
            // navigate('/login'); // Podrías forzarla si es necesario
        } catch (error) {
            toast.error('Error al cerrar sesión.', { id: toastId });
            console.error('Error logout:', error);
        }
        // No necesitas setLoading aquí, el listener lo hará
      }, [supabase, navigate]);

    // 3. Definir el valor que proporcionará el contexto
    // Incluimos el usuario, la sesión, el estado de carga y las funciones de auth.
    const value = {
        user,       // El objeto usuario de Supabase (o null)
        session,    // La sesión completa de Supabase (o null)
        loading,
        logout,    // Booleano para saber si aún se está comprobando la sesión inicial
        // --- Funciones de Autenticación (a añadir si quieres llamarlas desde el contexto) ---
        signUp: (email, password, options) => supabase.auth.signUp({ email, password, options }),
        signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
        signInWithGoogle: () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } }),
        signOut: () => supabase.auth.signOut(),
        resetPasswordForEmail: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' }),
        updateUserPassword: (newPassword) => supabase.auth.updateUser({ password: newPassword }),
    };

    // El proveedor devuelve el Contexto con el 'value' definido,
    // haciendo que esté disponible para todos los componentes hijos ('children').
    // No renderizamos nada hasta que la carga inicial de sesión termine.
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
            {/* Muestra los hijos solo cuando loading es false */}
            {/* Podrías mostrar un Spinner/Loader global aquí si loading es true */}
            {/* {loading && <div>Cargando sesión...</div>} */}
        </AuthContext.Provider>
    );
};

// 4. Crear un Hook personalizado para usar el Contexto fácilmente
// Este hook permite a otros componentes acceder al valor del contexto (user, session, etc.)
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        // Error si se intenta usar fuera del AuthProvider
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};