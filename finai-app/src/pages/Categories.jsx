/*
Archivo: src/pages/Categories.jsx
Propósito: Componente para la página de gestión de categorías de ingresos/gastos.
*/
import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Añade useCallback
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext.jsx'; // Importa useAuth
//import { getIconClass } from '../utils/iconUtils.js'; // Importa desde utils
//import { isColorDark } from '../utils/colorUtils.js'; // Importa desde utils
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import { useCallback } from 'react'; // Asegúrate de importar useCallback
import CategoryItem from '../components/Categories/CategoryItem.jsx';
import CategoryModal from '../components/Categories/CategoryModal.jsx';
import Sidebar from '../components/layout/Sidebar.jsx'; 

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

function Categories() {
    // --- Estado del Componente ---
    const { user, loading: authLoading } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [allCategories, setAllCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Modal state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view' (para default)
    const [selectedCategory, setSelectedCategory] = useState(null); // Categoría a editar/ver
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null); // { id, name }
    // UI state
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    const fetchData = useCallback(async (currentUserId) => {
        setIsLoading(true); // Indicar que la carga de categorías está en curso
        setError(null);
        setAllCategories([]); // Limpiar antes de cargar
        console.log(`Categories: Cargando datos para usuario ${currentUserId}`);
    
        try {
            // Cargar perfil y categorías en paralelo
            const [profileRes, categoriesRes] = await Promise.all([
                supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
                supabase.from('categories').select('*')
                    .or(`user_id.eq.${currentUserId},is_default.eq.true`) // Defaults O las del usuario
                    .order('is_default', { ascending: false }) // Opcional: mostrar custom primero?
                    .order('type')
                    .order('name')
            ]);
    
            // Procesar perfil
            if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
            setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);
    
            // Procesar categorías
            if (categoriesRes.error) throw categoriesRes.error;
            setAllCategories(categoriesRes.data || []);
            console.log(`Categories: ${categoriesRes.data?.length || 0} categorías cargadas.`);
    
        } catch (err) {
            console.error("Error cargando datos (Categories):", err);
            setError(err.message || "Error al cargar categorías.");
            setAllCategories([]); // Asegurar lista vacía en caso de error
        } finally {
            setIsLoading(false); // Terminar carga (de categorías)
        }
     // Asegúrate de incluir supabase en las dependencias si lo usas directamente
     }, [supabase]);

    // --- Efectos ---
    useEffect(() => {
        if (authLoading) {
            console.log("Categories: Esperando autenticación...");
            // Podrías mantener un estado de carga general aquí si quieres
            // setIsLoading(true);
            return; // Espera
        }
        if (!user) {
            console.log("Categories: No autenticado. Redirigiendo...");
            navigate('/login');
            return;
        }
    
        // Si el usuario está listo, llama a fetchData
        fetchData(user.id);
    
        // Scroll-top listener (sin cambios)
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    
    }, [user, authLoading, navigate, fetchData]); // Añade fetchData como dependencia

    // --- Separar categorías (usando useMemo para eficiencia) ---
    const { defaultCategories, customCategories } = useMemo(() => {
        const defaults = allCategories.filter(cat => cat.is_default).sort((a, b) => a.name.localeCompare(b.name));
        const customs = allCategories.filter(cat => !cat.is_default).sort((a, b) => a.name.localeCompare(b.name));
        return { defaultCategories: defaults, customCategories: customs };
    }, [allCategories]); // Recalcular solo si allCategories cambia

    // --- Manejadores Modal ---
    const handleOpenCategoryModal = useCallback((mode = 'add', category = null) => {
        setModalMode(mode);
        setSelectedCategory(category); // Guarda la categoría completa para pasarla al modal
        setModalError(''); // Limpia error del modal padre
        setIsSaving(false);
        setIsCategoryModalOpen(true);
    }, []);

    const handleCloseCategoryModal = () => setIsCategoryModalOpen(false);

    const handleCategoryFormSubmit = useCallback(async (submittedFormData) => { // Añadido useCallback
        submittedFormData.preventDefault();
        if (modalMode === 'view') return;
        if (!user?.id) {
            toast.error("Error: Usuario no identificado.");
            return;
        }
    
        if (!submittedFormData.categoryName.trim()) { setModalError('El nombre es obligatorio.'); return; }
    
        setModalError('');
        setIsSaving(true);
        const toastId = toast.loading(modalMode === 'edit' ? 'Guardando cambios...' : 'Creando categoría...');
    
        try {
            const categoryData = {
                // user_id se puede añadir explícitamente o dejar a RLS
                name: submittedFormData.categoryName.trim(),
                type: submittedFormData.categoryType,
                icon: submittedFormData.categoryIcon.trim() || null,
                color: submittedFormData.categoryColor || '#e0e0e0',
                is_default: false,
                is_variable: submittedFormData.isVariable,
            };
    
            let error;
            if (modalMode === 'edit' && selectedCategory) {
                // UPDATE
                const { error: updateError } = await supabase.from('categories')
                    .update({ ...categoryData, user_id: user.id, updated_at: new Date() }) // Asegurar user_id y updated_at
                    .eq('id', selectedCategory.id)
                    .eq('user_id', user.id)
                    .eq('is_default', false);
                error = updateError;
            } else {
                // INSERT
                const { error: insertError } = await supabase.from('categories')
                    .insert([{ ...categoryData, user_id: user.id }]); // Asegurar user_id
                error = insertError;
            }
    
            if (error) throw error;
    
            toast.success(`Categoría ${modalMode === 'edit' ? 'actualizada' : 'creada'}!`, { id: toastId });
            handleCloseCategoryModal();
            fetchData(user.id); // Recargar datos
    
        } catch (err) {
            console.error('Error guardando categoría:', err);
            setModalError(`Error: ${err.message}`); // Error en modal
            toast.error(`Error al guardar: ${err.message}`, { id: toastId }); // Error en toast
        } finally {
            setIsSaving(false);
        }
    // Incluir dependencias usadas de fuera
    }, [user, modalMode, selectedCategory, supabase, handleCloseCategoryModal, fetchData]); // Ya no depende de formDat

    const handleDeleteCategory = (categoryId, categoryName) => {
        if (!categoryId || !categoryName) {
            console.error("Se necesita ID y nombre para eliminar categoría.");
            return;
        }
        // Guarda los datos de la categoría a eliminar
        setCategoryToDelete({ id: categoryId, name: categoryName });
        // Abre el modal de confirmación
        setIsConfirmModalOpen(true);
    };

    const confirmDeleteHandler = useCallback(async () => {
        if (!categoryToDelete || !user?.id) {
            toast.error("No se pudo eliminar (faltan datos).");
            setIsConfirmModalOpen(false);
            setCategoryToDelete(null);
            return;
        }
    
        const { id: categoryId, name: categoryName } = categoryToDelete;
        setIsConfirmModalOpen(false); // Cierra el modal de confirmación
        const deletingToastId = toast.loading(`Eliminando categoría "${categoryName}"...`);
    
        try {
            // Intenta eliminar la categoría personalizada
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', categoryId)
                .eq('user_id', user.id) // Seguridad
                .eq('is_default', false); // Doble seguridad
    
            if (error) {
                // Podría haber error si la categoría está en uso y hay restricciones FK
                // El código '23503' es común para FK violation en PostgreSQL
                if (error.code === '23503') {
                     toast.error('Error: Categoría en uso (transacciones/presupuestos). No se puede eliminar.', { id: deletingToastId, duration: 6000 });
                } else {
                    throw error; // Otros errores de Supabase
                }
            } else {
                toast.success('Categoría eliminada.', { id: deletingToastId });
                fetchData(user.id); // Recarga la lista de categorías
            }
        } catch (err) {
            console.error('Error eliminando categoría (confirmado):', err);
            toast.error(`Error al eliminar: ${err.message}`, { id: deletingToastId });
        } finally {
            setCategoryToDelete(null); // Limpia el estado
        }
    // Incluir dependencias
    }, [user, categoryToDelete, supabase, fetchData]);

    // Reutilizar handleLogout, handleBack, scrollToTop
    const handleBack = () => navigate(-1);
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    // --- Renderizado ---
    return (
        <div style={{ display: 'flex' }}>

            {/* --- Sidebar (Reutilizable) --- */}
            <Sidebar
                // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
                isProcessing={isLoading || isSaving /* ...o el estado relevante */}
            />

            {/* --- Contenido Principal --- */}
            <div className="page-container">
                {/* --- Cabecera --- */}
                <div className="page-header categories-header">
                    <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                    <div className="header-title-group">
                        <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" />
                        <h1>Mis Categorías</h1>
                    </div>
                    <button onClick={() => handleOpenCategoryModal('add')} id="addCategoryBtn" className="btn btn-primary btn-add">
                        <i className="fas fa-plus"></i> Añadir Categoría
                    </button>
                </div>

                {/* --- Lista de Categorías --- */}
                <div id="categoryList" className="category-list">
                    {isLoading && (
                        <p id="loadingMessage" style={{ textAlign: 'center', color: '#666', width: '100%' }}>Cargando categorías...</p>
                    )}
                    {error && !isLoading && (
                        <p style={{ textAlign: 'center', color: 'red', width: '100%' }}>{error}</p>
                    )}
                    {!isLoading && !error && allCategories.length === 0 && (
                         <div id="noCustomCategoriesMessage" className="empty-list-message" style={{width: '100%'}}>
                             <img src={emptyMascot} alt="Mascota FinAi" className="empty-mascot" />
                             <p>¡Parece que aún no tienes categorías!</p>
                             <p>Añade tu primera categoría para empezar.</p>
                             <button onClick={() => handleOpenCategoryModal('add')} className="btn btn-primary">
                                 <i className="fas fa-plus"></i> Añadir Mi Primera Categoría
                             </button>
                         </div>
                    )}
                    {!isLoading && !error && (
                        <>
                            {/* Sección Default */}
                            {defaultCategories.length > 0 && (
                                <>
                                    <h2 className="category-section-header" style={{ width: '100%' }}>Categorías por Defecto</h2>
                                    {defaultCategories.map(cat => {
                                        <CategoryItem
                                        key={cat.id}
                                        category={cat}
                                        onViewClick={handleOpenCategoryModal} // Llama a handleOpen en modo 'view'
                                        // No pasar onEditClick ni onDeleteClick para defaults
                                    />
                                    })}
                                </>
                            )}
                            {/* Sección Custom */}
                            {customCategories.length > 0 && (
                                <>
                                    <h2 className="category-section-header" style={{ width: '100%' }}>Mis Categorías Personalizadas</h2>
                                    {customCategories.map(cat => {
                                        <CategoryItem
                                        key={cat.id}
                                        category={cat}
                                        onEditClick={(categoryToEdit) => handleOpenCategoryModal('edit', categoryToEdit)} // Abre en modo 'edit'
                                        onDeleteClick={handleDeleteCategory} // Llama a la función que abre el confirm modal
                                        // No pasar onViewClick aquí (o sí, si quieres verlas también)
                                    />
                                    })}
                                </>
                            )}
                             {/* Mensaje si solo hay defaults y está logueado */}
                             {defaultCategories.length > 0 && customCategories.length === 0 && userId && (
                                 <div id="noCustomCategoriesMessage" className="empty-list-message" style={{width: '100%'}}>
                                     <p>Puedes añadir tus propias categorías personalizadas.</p>
                                 </div>
                             )}
                        </>
                    )}
                </div>

            </div> {/* Fin page-container */}

             {/* --- Modal Añadir/Editar Categoría --- */}
            <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={handleCloseCategoryModal}
                onSubmit={handleCategoryFormSubmit} // Pasa la función que guarda
                mode={modalMode}
                initialData={selectedCategory} // Pasa la categoría seleccionada
                isSaving={isSaving}
                error={modalError} // Pasa el error del padre
            />

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => {
                    setIsConfirmModalOpen(false);
                    setCategoryToDelete(null); // Limpiar al cerrar
                }}
                onConfirm={confirmDeleteHandler} // Llama a la función de borrado
                title="Confirmar Eliminación"
                message={`¿Seguro que quieres eliminar la categoría "${categoryToDelete?.name || ''}"? Las transacciones y presupuestos asociados perderán esta categoría.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDanger={true} // Botón confirmar en rojo
            />

            {/* --- Botón Scroll-Top --- */}
            {showScrollTop && (
                <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba">
                    <i className="fas fa-arrow-up"></i>
                </button>
            )}

        </div> // Fin contenedor flex principal
    );
}

export default Categories;
