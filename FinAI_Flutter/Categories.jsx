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
import CategoryItem from '../components/Categories/CategoryItem.jsx';
import CategoryModal from '../components/Categories/CategoryModal.jsx';
import Sidebar from '../components/layout/Sidebar.jsx'; 
import PageHeader from '../components/layout/PageHeader.jsx';
import '../styles/Categories.scss';

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
    //const [categoryToDelete, setCategoryToDelete] = useState(null); // { id, name }
    const [itemToProcess, setItemToProcess] = useState(null); // { id, name, action: 'archive' | 'unarchive' }
    const [showArchived, setShowArchived] = useState(false);
    // UI state
    const [showScrollTop, setShowScrollTop] = useState(false);

    const navigate = useNavigate();

    const fetchData = useCallback(async (currentUserId) => {
        setIsLoading(true); // Indicar que la carga de categorías está en curso
        setError(null);
        //setAllCategories([]); // Limpiar antes de cargar
        console.log(`Categories: Cargando datos para usuario ${currentUserId}`);
    
        try {
            // --- LÓGICA DE CARGA SIMPLIFICADA Y CORRECTA ---
            const { data: profileData, error: profileError } = await supabase
                .from('profiles').select('avatar_url').eq('id', currentUserId).single();
            if (profileError && profileError.status !== 406) throw profileError;
            setAvatarUrl(profileData?.avatar_url || defaultAvatar);

            // Cargar todas las categorías (default y del usuario)
            // El filtrado de activas/archivadas se hará en el useMemo basado en el estado 'showArchived'
            let categoriesQuery = supabase.from('categories').select('*')
            .or(`is_default.eq.true,user_id.eq.${currentUserId}`)
            .order('name'); // Orden simple aquí, el useMemo puede re-ordenar si es necesario

            const { data: allFetchedCategories, error: categoriesError } = await categoriesQuery;
            
            if (categoriesError) {
                throw categoriesError;
            }

            setAllCategories(allFetchedCategories || []);
            console.log(`Categories: ${allFetchedCategories?.length || 0} categorías totales cargadas (pre-filtro para activas/archivadas).`);

        } catch (err) {
            console.error("Error cargando datos (Categories):", err);
            setError(err.message || "Error al cargar categorías.");
            setAllCategories([]);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, setAvatarUrl, setError, setAllCategories, setIsLoading]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { navigate('/login'); return; }
        fetchData(user.id);
    
        const handleScroll = () => setShowScrollTop(window.scrollY > 300);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [user, authLoading, navigate, fetchData]); // Añade fetchData como dependencia

    // --- Procesamiento de categorías para visualización y para el modal ---
    const { 
        incomeCategories, // { defaults: [], topLevelCustom: [] }
        expenseCategories, // { defaults: [], topLevelCustom: [] } 
        archivedCustomCategories,
        parentCategoriesList, // Para el selector del modal
        totalActiveCustomCount
    } = useMemo(() => {
        console.log("USEMEMO: Recalculando listas de categorías. allCategories tiene:", allCategories.length);

        const activeCategories = allCategories.filter(cat => !cat.is_archived);
        const archived = allCategories.filter(cat => cat.user_id === user?.id && !cat.is_default && cat.is_archived)
                                     .sort((a, b) => a.name.localeCompare(b.name));

        const processByType = (type) => {
            const typeDefaults = activeCategories.filter(cat => cat.is_default === true && cat.type === type)
                                        .sort((a, b) => a.name.localeCompare(b.name));
            const typeCustoms = activeCategories.filter(cat => cat.user_id === user?.id && !cat.is_default && cat.type === type);
            const typeTopLevelCustoms = typeCustoms.filter(cat => !cat.parent_category_id)
                                        .sort((a, b) => a.name.localeCompare(b.name));
             return { defaults: typeDefaults, topLevelCustom: typeTopLevelCustoms };
        };
                        
        const incomeCats = processByType('ingreso');
        const expenseCats = processByType('gasto');
                                
        // Lista de categorías que pueden ser padres: todas las default activas + todas las custom activas de nivel superior (de cualquier tipo)
        const allDefaults = activeCategories.filter(cat => cat.is_default === true);
        const allTopLevelCustoms = activeCategories.filter(cat => cat.user_id === user?.id && !cat.is_default && !cat.parent_category_id);

        // Lista de categorías que pueden ser padres: todas las default activas + todas las custom activas de nivel superior
        const parents = [
            ...allDefaults,
            ...allTopLevelCustoms
        ].sort((a, b) => { // Ordenar por tipo y luego por nombre para el selector
            if (a.type < b.type) return -1;
            if (a.type > b.type) return 1;
            return a.name.localeCompare(b.name);
        });

        const allActiveCustoms = activeCategories.filter(
            cat => cat.user_id === user?.id && !cat.is_default
        );

        console.log("USEMEMO: incomeDefaults:", incomeCats.defaults.length, "incomeTopLevelCustoms:", incomeCats.topLevelCustom.length);
        console.log("USEMEMO: expenseDefaults:", expenseCats.defaults.length, "expenseTopLevelCustoms:", expenseCats.topLevelCustom.length);
        console.log("USEMEMO: archived:", archived.length, "parentCandidates:", parents.length);

        return { 
            incomeCategories: incomeCats, 
            expenseCategories: expenseCats, 
            archivedCustomCategories: archived,
            parentCategoriesList: parents,
            totalActiveCustomCount: allActiveCustoms.length
        };
    }, [allCategories, user?.id]);

    // Función para obtener subcategorías de un padre específico (solo activas)
    const getActiveSubcategories = useCallback((parentId) => {
        return allCategories.filter(cat => 
            cat.parent_category_id === parentId && 
            !cat.is_archived && 
            cat.user_id === user?.id // Asegurar que son del usuario
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [allCategories, user?.id]);

    // --- Manejadores Modal ---
    const handleOpenCategoryModal = useCallback((mode = 'add', category = null) => {
        setModalMode(mode);
        setSelectedCategory(category); // Guarda la categoría completa para pasarla al modal
        setModalError(''); // Limpia error del modal padre
        setIsSaving(false);
        setIsCategoryModalOpen(true);
    }, []);

    const handleCloseCategoryModal = useCallback(() => { // Añadido useCallback
        setIsCategoryModalOpen(false);
        setSelectedCategory(null);
        setModalError(''); // Limpiar error del modal al cerrar
    }, []);

    const handleCategoryFormSubmit = useCallback(async (submittedFormData) => { // Añadido useCallback
        //submittedFormData.preventDefault();
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
                parent_category_id: submittedFormData.parent_category_id || null,
            };
    
            let error;
            if (modalMode === 'edit' && selectedCategory) {
                // UPDATE
                if (selectedCategory.is_archived) {
                    toast.error("Esta categoría está archivada. Desarchívala para editar.", { id: toastId });
                    setIsSaving(false);
                    return;
                }
                // Prevenir que una categoría se haga hija de sí misma o de una de sus hijas (simplificado por ahora)
                if (categoryData.parent_category_id === selectedCategory.id) {
                    setModalError("Una categoría no puede ser su propio padre.");
                    toast.error("Una categoría no puede ser su propio padre.", { id: toastId });
                    setIsSaving(false);
                    return;
                }
                const { error: updateError } = await supabase.from('categories')
                    .update({ ...categoryData, user_id: user.id, updated_at: new Date() }) // Asegurar user_id y updated_at
                    .eq('id', selectedCategory.id)
                    .eq('user_id', user.id)
                    .eq('is_default', false);
                error = updateError;
            } else {
                // INSERT
                const { error: insertError } = await supabase.from('categories')
                    .insert([{ ...categoryData, user_id: user.id, is_archived: false }]); // Asegurar user_id
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
    }, [user, modalMode, selectedCategory, supabase, handleCloseCategoryModal, fetchData, setModalError, setIsSaving]); // Ya no depende de formDat

    const handleArchiveCategory = useCallback((category) => { // Añadido useCallback
        if (category.is_default) {
            toast.error("Las categorías por defecto no se pueden archivar.");
            return;
        }
        // Verificar si tiene subcategorías activas
        const activeSubcategories = getActiveSubcategories(category.id);
        if (activeSubcategories.length > 0) {
            toast.error("Esta categoría tiene subcategorías activas. Archívalas o elimínalas primero.", {duration: 5000});
            return;
        }

        setItemToProcess({ id: category.id, name: category.name, action: 'archive' });
        setIsConfirmModalOpen(true);
    }, [getActiveSubcategories]);

    const handleUnarchiveCategory = useCallback((category) => { // Añadido useCallback
        setItemToProcess({ id: category.id, name: category.name, action: 'unarchive' });
        setIsConfirmModalOpen(true);
    }, []);

    const confirmProcessItemHandler = useCallback(async () => {
        if (!itemToProcess || !user?.id) {
            toast.error("No se pudo procesar (faltan datos).");
            setIsConfirmModalOpen(false);
            setItemToProcess(null);
            return;
        }
    
        const { id: categoryId, name: categoryName, action } = itemToProcess;
        setIsConfirmModalOpen(false);
        const toastAction = action === 'archive' ? 'Archivando' : 'Desarchivando';
        const toastSuccess = action === 'archive' ? 'archivada' : 'desarchivada';
        const processingToastId = toast.loading(`${toastAction} categoría "${categoryName}"...`);
    
        try {
            const updateData = action === 'archive' 
                ? { is_archived: true, archived_at: new Date() }
                : { is_archived: false, archived_at: null }; // Limpiar fecha al desarchivar

            const { error } = await supabase
                .from('categories')
                .update(updateData)
                .eq('id', categoryId)
                .eq('user_id', user.id)
                .eq('is_default', false); // Solo personalizadas
    
            if (error) {
                // El código '23503' es común para FK violation en PostgreSQL
                // Si una categoría archivada está en uso, NO debería dar error de FK,
                // ya que solo la estamos marcando, no eliminando.
                // Este error sería más para el delete original.
                if (error.code === '23503' && action === 'archive_original_delete_logic') { 
                     toast.error('Error: Categoría en uso. No se puede archivar.', { id: processingToastId, duration: 6000 });
                } else {
                    throw error;
                }
            } else {
                toast.success(`Categoría ${toastSuccess}.`, { id: processingToastId });
                fetchData(user.id, showArchived); // Recarga la lista
            }
        } catch (err) {
            console.error(`Error al ${toastAction.toLowerCase()} categoría:`, err);
            toast.error(`Error al ${toastAction.toLowerCase()}: ${err.message}`, { id: processingToastId });
        } finally {
            setItemToProcess(null);
        }
    }, [user, itemToProcess, supabase, fetchData, showArchived]);

    // Reutilizar handleLogout, handleBack, scrollToTop
    const handleBack = () => navigate(-1);
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const renderCategoryGroup = (title, categories, isDefaultSection = false) => {
        if (!categories || categories.length === 0) return null;
        return (
            <>
                <h2 className="category-section-header">{title}</h2>
                {categories.map(cat => (
                    <div key={cat.id} className="category-group">
                        <CategoryItem
                            category={cat}
                            onViewClick={isDefaultSection ? () => handleOpenCategoryModal('view', cat) : undefined}
                            onEditClick={!isDefaultSection ? () => handleOpenCategoryModal('edit', cat) : undefined}
                            onArchiveClick={!isDefaultSection ? () => handleArchiveCategory(cat) : undefined}
                        />
                        {/* Renderizar subcategorías personalizadas de esta categoría */}
                        {getActiveSubcategories(cat.id).map(subCat => (
                            <CategoryItem
                                key={subCat.id}
                                category={subCat}
                                isSubcategory={true}
                                onEditClick={() => handleOpenCategoryModal('edit', subCat)}
                                onArchiveClick={() => handleArchiveCategory(subCat)}
                            />
                        ))}
                    </div>
                ))}
            </>
        );
    };

    const categoryPageAction = (
        <button 
            onClick={() => handleOpenCategoryModal('add')} 
            id="addCategoryBtn" 
            className="btn btn-primary btn-add" // Tus clases existentes
            // disabled se maneja por isProcessingPage en PageHeader, 
            // pero puedes añadir lógica específica aquí si es necesario,
            // por ejemplo, si no hay tipos de cuenta cargados para asignar.
            // disabled={isLoading || isSaving /* || !tiposDeCuentaListos */}
        >
            <i className="fas fa-plus"></i> Añadir Categoría
        </button>
    );

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
                <PageHeader 
                    pageTitle="Mis Categorías"
                    headerClassName="categories-header" // Tu clase específica si la necesitas
                    showSettingsButton={false}     // No mostrar botón de settings aquí
                    isProcessingPage={isLoading || isSaving} // Para deshabilitar botones de PageHeader si es necesario
                    actionButton={categoryPageAction} // <-- Pasar el botón "Añadir Categoría"
                />

                {/* --- Botón para Mostrar/Ocultar Archivadas --- */}
                <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                    <button 
                        onClick={() => setShowArchived(prev => !prev)} 
                        className="btn btn-secondary btn-sm"
                    >
                        {showArchived ? 'Ocultar Archivadas' : 'Mostrar Archivadas'}
                    </button>
                </div>
                {/* ------------------------------------------ */}

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
                             <p>Esto es raro. Si el problema persiste, contacta a soporte.</p>
                             {/* O si quieres permitir añadir si no hay NADA: */}
                             {/* <button onClick={() => handleOpenCategoryModal('add')} className="btn btn-primary">
                                 <i className="fas fa-plus"></i> Añadir Mi Primera Categoría
                             </button> */}
                         </div>
                    )}
                    {!isLoading && !error && allCategories.length > 0 &&(
                        <>

                            {/* --- SECCIÓN GASTOS --- */}
                            {(expenseCategories.defaults.length > 0 || expenseCategories.topLevelCustom.length > 0) && (
                                    <div className="category-type-section">
                                        <h1 className="category-type-header">GASTOS</h1>
                                        {renderCategoryGroup("Categorías de Gasto por Defecto", expenseCategories.defaults, true)}
                                        {renderCategoryGroup("Mis Categorías de Gasto", expenseCategories.topLevelCustom)}
                                    </div>
                                )}
                                {/* --- FIN SECCIÓN GASTOS --- */}
                            {/* --- SECCIÓN INGRESOS --- */}
                            {(incomeCategories.defaults.length > 0 || incomeCategories.topLevelCustom.length > 0) && (
                                <div className="category-type-section">
                                    <h1 className="category-type-header">INGRESOS</h1>
                                    {renderCategoryGroup("Categorías de Ingreso por Defecto", incomeCategories.defaults, true)}
                                    {renderCategoryGroup("Mis Categorías de Ingreso", incomeCategories.topLevelCustom)}
                                </div>
                            )}
                            {/* --- FIN SECCIÓN INGRESOS --- */}

                        {/* Sección Archivadas (solo si showArchived es true) */}
                        {showArchived && archivedCustomCategories && archivedCustomCategories.length > 0 && (
                                <>
                                    <h2 className="category-section-header" style={{ width: '100%' }}>Categorías Archivadas</h2>
                                    {archivedCustomCategories.map(cat => (
                                        <CategoryItem
                                            key={cat.id}
                                            category={cat} // CategoryItem necesitará saber si está archivada para mostrar botón "Desarchivar"
                                            onUnarchiveClick={() => handleUnarchiveCategory(cat)}
                                            isArchivedView={true} // Prop para indicar a CategoryItem que está en vista de archivadas
                                        />
                                    ))}
                                </>
                        )}

                        {/* Mensaje si se muestran archivadas y no hay ninguna */}
                        {showArchived && (!archivedCustomCategories || archivedCustomCategories.length === 0) && (
                            <div className="empty-list-message" style={{width: '100%', gridColumn: '1 / -1'}}>
                                <p>No tienes categorías archivadas.</p>
                            </div>
                        )}
                            
                        </>
                    )}
                    </div>

                    {/* Mensaje si solo hay defaults y está logueado */}
                    {(incomeCategories.defaults.length > 0 || expenseCategories.defaults.length > 0) && // Comprueba si hay CUALQUIER categoría por defecto (ingreso o gasto)
                        (totalActiveCustomCount === 0) && 
                        !showArchived && user && (
                            <div id="noCustomCategoriesMessage" className="empty-list-message" style={{width: '100%'}}>
                                <p>¡Parece que aún no tienes categorías personalizadas activas!</p>
                                <img src={emptyMascot} alt="Mascota FinAi" className="empty-mascot" />
                                <p>Puedes añadir tus propias categorías personalizadas o desarchivar alguna existente.</p>
                                <button onClick={() => handleOpenCategoryModal('add')} className="btn btn-primary">
                                 <i className="fas fa-plus"></i> Añadir Mi Primera Categoría
                             </button>
                            </div>
                        )}

            </div> {/* Fin page-container */}

             {/* --- Modal Añadir/Editar Categoría --- */}
            <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={handleCloseCategoryModal}
                onSubmit={handleCategoryFormSubmit} // Pasa la función que guarda
                mode={modalMode}
                initialData={selectedCategory} // Pasa la categoría seleccionada
                parentCategories={parentCategoriesList}
                isSaving={isSaving}
                error={modalError} // Pasa el error del padre
            />

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => {
                    setIsConfirmModalOpen(false);
                    setItemToProcess(null); // Limpiar al cerrar
                }}
                onConfirm={confirmProcessItemHandler}
                title={itemToProcess?.action === 'archive' ? "Confirmar Archivado" : "Confirmar Desarchivado"}
                message={
                    itemToProcess?.action === 'archive' 
                    ? `¿Seguro que quieres archivar la categoría "${itemToProcess?.name || ''}"? Seguirá apareciendo en transacciones existentes pero no podrás seleccionarla para nuevas.`
                    : `¿Seguro que quieres desarchivar la categoría "${itemToProcess?.name || ''}"? Volverá a estar disponible.`
                }
                confirmText={itemToProcess?.action === 'archive' ? "Archivar" : "Desarchivar"}
                cancelText="Cancelar"
                isDanger={itemToProcess?.action === 'archive'} // Botón rojo para archivar
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
