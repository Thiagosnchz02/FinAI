/*
Archivo: src/pages/Categories.jsx
Propósito: Componente para la página de gestión de categorías de ingresos/gastos.
*/
import React, { useState, useEffect, useMemo } from 'react'; // Importa useMemo
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png';
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

// --- Funciones de Utilidad --- (Mover a /utils)
const getIconClass = (iconKeyword) => {
    const iconMap = { /* ... tu mapeo de iconos ... */ 'default': 'fas fa-tag' };
    return iconMap[iconKeyword?.toLowerCase()] || (iconKeyword?.startsWith('fa') ? iconKeyword : 'fas fa-tag');
};

const isColorDark = (bgColor) => {
    if (!bgColor || typeof bgColor !== 'string' || bgColor.length < 4) return false;
    try {
        const color = bgColor.charAt(0) === '#' ? bgColor.substring(1) : bgColor;
        if (color.length !== 6 && color.length !== 3) return false;
        const r = parseInt(color.substring(0, color.length === 3 ? 1 : 2), 16) * (color.length === 3 ? 17 : 1);
        const g = parseInt(color.substring(color.length === 3 ? 1 : 2, color.length === 3 ? 2 : 4), 16) * (color.length === 3 ? 17 : 1);
        const b = parseInt(color.substring(color.length === 3 ? 2 : 4, color.length === 3 ? 3 : 6), 16) * (color.length === 3 ? 17 : 1);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
    } catch (e) { return false; }
};
// --- Fin Funciones de Utilidad ---


function Categories() {
    // --- Estado del Componente ---
    const [userId, setUserId] = useState(null); // Vendrá de AuthContext
    const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);
    const [allCategories, setAllCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Modal state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view' (para default)
    const [selectedCategory, setSelectedCategory] = useState(null); // Categoría a editar/ver
    const [formData, setFormData] = useState({ // Estado para formulario modal
        categoryName: '',
        categoryType: 'gasto',
        isVariable: false,
        categoryIcon: '',
        categoryColor: '#e0e0e0',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState('');
    // UI state
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    // --- Efectos ---
    useEffect(() => {
        // Carga inicial: usuario, avatar, categorías
        const loadInitialData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // 1. Obtener usuario (Simulado)
                const simulatedUserId = 'USER_ID_PLACEHOLDER'; // Reemplazar con AuthContext
                setUserId(simulatedUserId);

                // 2. Cargar perfil (avatar) y categorías
                const [profileRes, categoriesRes] = await Promise.all([
                    supabase.from('profiles').select('avatar_url').eq('id', simulatedUserId).single(),
                    // Cargar TODAS las categorías (default + usuario)
                    supabase.from('categories').select('*').or(`user_id.eq.${simulatedUserId},is_default.eq.true`).order('type').order('name')
                ]);

                if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
                setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

                if (categoriesRes.error) throw categoriesRes.error;
                setAllCategories(categoriesRes.data || []);

            } catch (err) {
                console.error("Error cargando datos iniciales (Categories):", err);
                setError(err.message || "Error al cargar datos.");
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();

        // Scroll-top listener
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);

    }, [navigate]); // Dependencia navigate

    // --- Separar categorías (usando useMemo para eficiencia) ---
    const { defaultCategories, customCategories } = useMemo(() => {
        const defaults = allCategories.filter(cat => cat.is_default).sort((a, b) => a.name.localeCompare(b.name));
        const customs = allCategories.filter(cat => !cat.is_default).sort((a, b) => a.name.localeCompare(b.name));
        return { defaultCategories: defaults, customCategories: customs };
    }, [allCategories]); // Recalcular solo si allCategories cambia

    // --- Manejadores Modal ---
    const handleOpenCategoryModal = (mode = 'add', category = null) => {
        setModalMode(mode);
        setSelectedCategory(category);
        setModalError('');
        setIsSaving(false);

        if (mode === 'edit' && category) {
            setFormData({
                categoryName: category.name || '',
                categoryType: category.type || 'gasto',
                isVariable: category.is_variable || false,
                categoryIcon: category.icon || '',
                categoryColor: category.color || '#e0e0e0',
            });
        } else if (mode === 'view' && category) { // Para ver default
             setFormData({ // Cargar datos para verlos, aunque estén disabled
                categoryName: category.name || '',
                categoryType: category.type || 'gasto',
                isVariable: category.is_variable || false,
                categoryIcon: category.icon || '',
                categoryColor: category.color || '#e0e0e0',
            });
        } else { // Modo 'add'
            setFormData({ // Resetear
                categoryName: '', categoryType: 'gasto', isVariable: false,
                categoryIcon: '', categoryColor: '#e0e0e0',
            });
        }
        setIsCategoryModalOpen(true);
    };

    const handleCloseCategoryModal = () => setIsCategoryModalOpen(false);

    const handleFormChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (modalError) setModalError('');
    };

    const handleCategoryFormSubmit = async (event) => {
        event.preventDefault();
        if (modalMode === 'view') return; // No hacer nada si solo es vista
        if (!userId) { setModalError("Error: Usuario no identificado."); return; }

        // Validaciones
        if (!formData.categoryName.trim()) { setModalError('El nombre es obligatorio.'); return; }
        setModalError('');
        setIsSaving(true);

        try {
            const categoryData = {
                user_id: userId,
                name: formData.categoryName.trim(),
                type: formData.categoryType,
                icon: formData.categoryIcon.trim() || null,
                color: formData.categoryColor || '#e0e0e0',
                is_default: false, // Las creadas/editadas por usuario nunca son default
                is_variable: formData.isVariable,
            };

            let error;
            if (modalMode === 'edit' && selectedCategory) {
                // UPDATE
                const { error: updateError } = await supabase.from('categories')
                    .update(categoryData) // Actualizar todos los campos editables
                    .eq('id', selectedCategory.id)
                    .eq('user_id', userId) // Seguridad
                    .eq('is_default', false); // No permitir editar defaults accidentalmente
                error = updateError;
            } else {
                // INSERT
                const { error: insertError } = await supabase.from('categories').insert([categoryData]);
                error = insertError;
            }

            if (error) throw error;

            console.log(`Categoría ${modalMode === 'edit' ? 'actualizada' : 'creada'}`);
            handleCloseCategoryModal();
            // Recargar categorías para ver cambios
            const { data, error: refreshError } = await supabase.from('categories').select('*').or(`user_id.eq.${userId},is_default.eq.true`).order('type').order('name');
            if (refreshError) throw refreshError;
            setAllCategories(data || []);

        } catch (err) {
            console.error('Error guardando categoría:', err);
            setModalError(`Error: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCategory = async (categoryId, categoryName) => {
        // Usar modal de confirmación idealmente
        if (!window.confirm(`¿Seguro que quieres eliminar la categoría "${categoryName}"?\nLas transacciones y presupuestos asociados perderán su categoría.`)) return;

        try {
            const { error } = await supabase.from('categories')
                .delete()
                .eq('id', categoryId)
                .eq('user_id', userId) // Asegurar que solo borra las suyas
                .eq('is_default', false); // Doble seguridad para no borrar defaults

            if (error) throw error;
            console.log('Categoría eliminada');
            alert('Categoría eliminada.');
            // Quitar del estado local
            setAllCategories(prev => prev.filter(cat => cat.id !== categoryId));

        } catch (err) {
            console.error('Error eliminando categoría:', err);
            alert(`Error: ${err.message}`);
        }
    };

    // Reutilizar handleLogout, handleBack, scrollToTop
    const handleLogout = () => console.log('Logout pendiente');
    const handleBack = () => navigate(-1);
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    // --- Renderizado ---
    return (
        <div style={{ display: 'flex' }}>

            {/* --- Sidebar (Reutilizable) --- */}
            <aside className="sidebar">
                 <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
                 <nav className="sidebar-nav">
                     {/* Marcar como 'active' el link correspondiente */}
                     <Link to="/dashboard" className="nav-button" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
                     <Link to="/accounts" className="nav-button" title="Cuentas"><i className="fas fa-wallet"></i> <span>Cuentas</span></Link>
                     <Link to="/budgets" className="nav-button" title="Presupuestos"><i className="fas fa-chart-pie"></i> <span>Presupuestos</span></Link>
                     <Link to="/categories" className="nav-button active" title="Categorías"><i className="fas fa-tags"></i> <span>Categorías</span></Link> {/* Active */}
                     <Link to="/transactions" className="nav-button" title="Transacciones"><i className="fas fa-exchange-alt"></i> <span>Transacciones</span></Link>
                     <Link to="/trips" className="nav-button" title="Viajes"><i className="fas fa-suitcase-rolling"></i> <span>Viajes</span></Link>
                     <Link to="/evaluations" className="nav-button" title="Evaluación"><i className="fas fa-balance-scale"></i> <span>Evaluación</span></Link>
                     <Link to="/reports" className="nav-button" title="Informes"><i className="fas fa-chart-bar"></i> <span>Informes</span></Link>
                     <Link to="/profile" className="nav-button" title="Perfil"><i className="fas fa-user-circle"></i> <span>Perfil</span></Link>
                     <Link to="/settings" className="nav-button" title="Configuración"><i className="fas fa-cog"></i> <span>Configuración</span></Link>
                     <Link to="/debts" className="nav-button" title="Deudas"><i className="fas fa-credit-card"></i> <span>Deudas</span></Link>
                     <Link to="/loans" className="nav-button" title="Préstamos"><i className="fas fa-hand-holding-usd"></i> <span>Préstamos</span></Link>
                     <Link to="/fixed-expenses" className="nav-button" title="Gastos Fijos"><i className="fas fa-receipt"></i> <span>Gastos Fijos</span></Link>
                     <Link to="/goals" className="nav-button" title="Metas"><i className="fas fa-bullseye"></i> <span>Metas</span></Link>
                 </nav>
                 <button className="nav-button logout-button" onClick={handleLogout} title="Cerrar Sesión"><i className="fas fa-sign-out-alt"></i> <span>Salir</span></button>
            </aside>

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
                                        const bgColor = cat.color || '#e0e0e0';
                                        const textColor = isColorDark(bgColor) ? '#ffffff' : '#2d3748';
                                        const iconClass = getIconClass(cat.icon);
                                        const typeIndicator = cat.type === 'ingreso' ? '(Ingreso)' : '(Gasto)';
                                        return (
                                            <div key={cat.id} className="category-item" style={{ backgroundColor: bgColor, color: textColor }} onClick={() => handleOpenCategoryModal('view', cat)} title="Ver detalle (no editable)">
                                                <span className="category-icon"><i className={iconClass}></i></span>
                                                <span className="category-name">{cat.name}</span>
                                                 <div className="category-actions">
                                                      <span className="category-type-indicator">{typeIndicator}</span>
                                                      {/* No hay botones para default */}
                                                 </div>
                                                <span className="default-badge" title="Categoría por defecto">Default</span>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                            {/* Sección Custom */}
                            {customCategories.length > 0 && (
                                <>
                                    <h2 className="category-section-header" style={{ width: '100%' }}>Mis Categorías Personalizadas</h2>
                                    {customCategories.map(cat => {
                                        const bgColor = cat.color || '#e0e0e0';
                                        const textColor = isColorDark(bgColor) ? '#ffffff' : '#2d3748';
                                        const iconClass = getIconClass(cat.icon);
                                        const typeIndicator = cat.type === 'ingreso' ? '(Ingreso)' : '(Gasto)';
                                        return (
                                            <div key={cat.id} className="category-item" style={{ backgroundColor: bgColor, color: textColor }}>
                                                <span className="category-icon"><i className={iconClass}></i></span>
                                                <span className="category-name">{cat.name}</span>
                                                 <div className="category-actions">
                                                      <span className="category-type-indicator">{typeIndicator}</span>
                                                      <button onClick={() => handleOpenCategoryModal('edit', cat)} className="btn-icon btn-edit" aria-label="Editar" style={{ color: 'inherit' }}><i className="fas fa-pencil-alt"></i></button>
                                                      <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="btn-icon btn-delete" aria-label="Eliminar" style={{ color: 'inherit' }}><i className="fas fa-trash-alt"></i></button>
                                                 </div>
                                                 {/* No hay badge default */}
                                            </div>
                                        );
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
             {isCategoryModalOpen && (
                <div id="categoryModal" className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseCategoryModal(); }}>
                    <div className="modal-content">
                        <h2 id="modalTitleCategory">
                            {modalMode === 'add' ? 'Añadir Nueva Categoría' : (modalMode === 'edit' ? 'Editar Categoría' : 'Ver Categoría')}
                        </h2>
                        <form id="categoryForm" onSubmit={handleCategoryFormSubmit}>
                            {/* ID oculto y flag default (no editable) */}
                            <input type="hidden" id="categoryId" name="categoryId" value={selectedCategory?.id || ''} readOnly />
                            <input type="hidden" id="isDefaultCategory" name="isDefaultCategory" value={selectedCategory?.is_default ? 'true' : 'false'} readOnly/>

                            <div className="input-group">
                                <label htmlFor="categoryName">Nombre</label>
                                <input type="text" id="categoryName" name="categoryName" required placeholder="Ej: Supermercado..." value={formData.categoryName} onChange={handleFormChange} disabled={modalMode === 'view' || isSaving}/>
                            </div>

                            <div className="input-group">
                                <label>Tipo</label>
                                <div className="radio-group">
                                    <label> <input type="radio" name="categoryType" value="gasto" checked={formData.categoryType === 'gasto'} onChange={handleFormChange} disabled={modalMode === 'view' || isSaving}/> Gasto </label>
                                    <label> <input type="radio" name="categoryType" value="ingreso" checked={formData.categoryType === 'ingreso'} onChange={handleFormChange} disabled={modalMode === 'view' || isSaving}/> Ingreso </label>
                                </div>
                            </div>

                            <div className="input-group">
                                <div className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="checkbox" id="categoryIsVariable" name="isVariable" checked={formData.isVariable} onChange={handleFormChange} style={{ width: 'auto' }} disabled={modalMode === 'view' || isSaving}/>
                                    <label htmlFor="categoryIsVariable" style={{ marginBottom: '0' }}>¿Es Gasto Variable?</label>
                                </div>
                                <p className="input-description" style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}> Marcar para gastos variables (Ocio, Comidas...). Desmarcar para fijos (Alquiler...). </p>
                            </div>

                            <div className="input-group">
                                <label htmlFor="categoryIcon">Icono (Clase Font Awesome)</label>
                                <input type="text" id="categoryIcon" name="categoryIcon" placeholder="Ej: fas fa-shopping-cart" value={formData.categoryIcon} onChange={handleFormChange} disabled={modalMode === 'view' || isSaving}/>
                                <small>Busca en <a href="https://fontawesome.com/search?m=free&s=solid" target="_blank" rel="noopener noreferrer">Font Awesome</a>.</small>
                            </div>

                            <div className="input-group">
                                <label htmlFor="categoryColor">Color de Fondo</label>
                                <input type="color" id="categoryColor" name="categoryColor" value={formData.categoryColor} onChange={handleFormChange} disabled={modalMode === 'view' || isSaving}/>
                            </div>

                            {modalError && (
                                <p id="modalCategoryError" className="error-message">{modalError}</p>
                            )}

                            <div className="modal-actions">
                                <button type="button" onClick={handleCloseCategoryModal} className="btn btn-secondary" disabled={isSaving}>
                                    {modalMode === 'view' ? 'Cerrar' : 'Cancelar'}
                                </button>
                                {/* Mostrar botón guardar solo si no es vista */}
                                {modalMode !== 'view' && (
                                    <button type="submit" id="saveCategoryButton" className="btn btn-primary" disabled={isSaving}>
                                        {isSaving ? 'Guardando...' : 'Guardar Categoría'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )} {/* Fin modal */}


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
