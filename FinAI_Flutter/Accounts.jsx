/*
Archivo: src/pages/Accounts.jsx
Propósito: Componente para la página de gestión de cuentas de usuario,
          incluyendo carga de datos, modal y acciones CRUD.
*/
import React, { useState, useEffect, useCallback, useMemo  } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency } from '../utils/formatters.js';
import '../styles/Accounts.scss';
//import { getIconForAccountType } from '../utils/iconUtils.js';
import AccountCard from '../components/Accounts/AccountCard.jsx';
import AccountModal from '../components/Accounts/AccountModal.jsx';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import Sidebar from '../components/layout/Sidebar.jsx'; // Asegúrate que la ruta sea correcta
import PageHeader from '../components/layout/PageHeader.jsx';

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

// Opciones para el selector de tipo de cuenta (incluyendo 'todos')
const ACCOUNT_TYPE_OPTIONS = [
    { value: 'all', label: 'Todos los Tipos' },
    { value: 'corriente', label: 'Corriente' },
    { value: 'ahorro', label: 'Ahorro' },
    { value: 'ahorro_colchon', label: 'Ahorro Colchón' },
    { value: 'viajes', label: 'Viajes' },
    { value: 'inversion', label: 'Inversión' },
    { value: 'tarjeta_credito', label: 'Tarjeta de Crédito' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'otro', label: 'Otro' },
];

// Opciones para el selector de ordenación
const SORT_OPTIONS = [
    { value: 'name_asc', label: 'Nombre (A-Z)' },
    { value: 'name_desc', label: 'Nombre (Z-A)' },
    { value: 'balance_asc', label: 'Saldo (Menor a Mayor)' },
    { value: 'balance_desc', label: 'Saldo (Mayor a Menor)' },
    { value: 'type_asc', label: 'Tipo (A-Z)' },
    { value: 'type_desc', label: 'Tipo (Z-A)' },
];


function Accounts() {
  const { user, loading: authLoading } = useAuth(); // Obtiene el usuario y el estado de carga inicial
  // --- Estado del Componente ---
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // Para errores de carga
  const [totalBalance, setTotalBalance] = useState('Calculando...');
  const [netWorthBalance, setNetWorthBalance] = useState('Calculando...');
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar); // Avatar del usuario
  //const [userId, setUserId] = useState(null); // ID del usuario (vendrá de AuthContext)
  const [accountBalances, setAccountBalances] = useState({}); // Para guardar { accountId: balance }
  const [showArchivedAccounts, setShowArchivedAccounts] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' o un tipo de cuenta específico
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' }); // Por defecto ordenar por nombre A-Z
    // 'key' puede ser 'name', 'balance', 'type'
    // 'direction' puede ser 'ascending' o 'descending'
  

  // Estado del Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToProcess, setItemToProcess] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' o 'edit'
  const [selectedAccount, setSelectedAccount] = useState(null); // Cuenta a editar
  const [isSaving, setIsSaving] = useState(false); // Estado de carga del modal
  const [modalError, setModalError] = useState(''); // Mensaje de error del modal

  // Otros estados UI
  const [showScrollTop, setShowScrollTop] = useState(false);

  const navigate = useNavigate();

  const fetchData = useCallback(async (currentUserId) => {
    setIsLoading(true);
    setError(null);
    setAccounts([]);
    setAccountBalances({});
    console.log(`Accounts: Cargando datos para usuario ${currentUserId}`);

    try {
      const [profileRes, accountsRes] = await Promise.all([
        supabase.from('profiles').select('avatar_url').eq('id', currentUserId).single(),
        supabase.from('accounts').select('*').eq('user_id', currentUserId).order('name')
      ]);

      if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
      setAvatarUrl(profileRes.data?.avatar_url || defaultAvatar);

      if (accountsRes.error) throw accountsRes.error;
      const fetchedAccounts = accountsRes.data || [];
      setAccounts(fetchedAccounts);

      if (fetchedAccounts.length > 0) {
        console.log("Accounts: Obteniendo saldos vía RPC...");
        const { data: balancesData, error: rpcError } = await supabase.rpc(
          'get_account_balances',
          { user_id_param: currentUserId }
        );

        if (rpcError) {
          console.error("Error al obtener saldos RPC:", rpcError);
          setError('No se pudieron cargar los saldos.');
          setAccountBalances({});
          setTotalBalance('Error');
        } else {
          const balancesMap = (balancesData || []).reduce((map, item) => {
            map[item.account_id] = Number(item.balance) || 0;
            return map;
          }, {});
          console.log("Accounts: Saldos recibidos:", balancesMap);
          setAccountBalances(balancesMap);
          calculateTotalBalance(fetchedAccounts, balancesMap); // Calcular total con datos frescos
        }
      } else {
        setTotalBalance(formatCurrency(0));
        setAccountBalances({});
      }

    } catch (err) {
      console.error("Error cargando datos de cuentas y/o saldos:", err);
      setError(err.message || 'Error al cargar los datos.');
      setAccounts([]);
      setAccountBalances({});
      setTotalBalance('Error');
    } finally {
      setIsLoading(false);
    }
  // No incluimos 'calculateTotalBalance' aquí porque se pasa como argumento
  // y está definida fuera/con useCallback
  }, [supabase]); // Depende solo de supabase (y user implícitamente)

  // --- Efectos ---
  useEffect(() => {
    if (authLoading) {
      console.log("Accounts: Esperando estado de autenticación...");
      setIsLoading(true);
      return;
    }
    if (!user) {
      console.log("Accounts: No hay usuario autenticado. Redirigiendo a login...");
      navigate('/login');
      return;
    }

    fetchData(user.id); // Llama a la función de carga

    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);

  }, [user, authLoading, navigate, fetchData]);

  // --- Cálculo de Saldo Total (Simulado/Optimizado) ---
  const calculateTotalBalance = useCallback((accountList, balancesMap) => {
    console.log("Calculando saldo total con saldos reales...");
    const excludedTypes = ['tarjeta_credito'];
    let total = 0;
    accountList.forEach(acc => {
      if (!excludedTypes.includes(acc.type?.toLowerCase())) {
        const balance = balancesMap[acc.id] || 0;
        total += Number(balance);
      }
    });
    console.log("Saldo total real calculado:", total);
    setTotalBalance(formatCurrency(total));
    return total;
  }, [setTotalBalance]);

  const calculateNetWorthBalance = useCallback((accountList, balancesMap) => {
        console.log("[Accounts.jsx] Calculando Saldo Neto Total...");
        let netWorth = 0;
        accountList.forEach(acc => {
            const balance = Number(balancesMap[acc.id]) || 0; // Asegurar que es número
            if (acc.type === 'tarjeta_credito') {
                netWorth -= balance; // Restar saldo de TC (ya que se guarda como positivo indicando deuda)
            } else {
                netWorth += balance;
            }
        });
        console.log("[Accounts.jsx] Saldo Neto Total calculado (numérico):", netWorth);
        setNetWorthBalance(formatCurrency(netWorth));
        return netWorth; // Devolver el valor numérico para comparaciones
  }, [setNetWorthBalance]); // setNetWorthBalance es estable

  const { activeAccounts, archivedAccounts, numericTotalBalance, numericNetWorthBalance } = useMemo(() => {
        let filteredActive = accounts.filter(acc => !acc.is_archived);

        console.log("[Accounts.jsx useMemo] Cuentas activas (antes de filtro de tipo):", filteredActive.map(a => ({name: a.name, type: a.type, is_archived: a.is_archived})));

        // Aplicar filtro por tipo (si no es 'all')
        if (typeFilter !== 'all') {
            filteredActive = filteredActive.filter(acc => acc.type === typeFilter);
        }

        console.log("[Accounts.jsx useMemo] Cuentas activas (después de filtro de tipo):", filteredActive.map(a => ({name: a.name, type: a.type})));

        // Aplicar ordenación
        if (sortConfig.key) {
            filteredActive.sort((a, b) => {
                let valA, valB;
                if (sortConfig.key === 'balance') {
                    valA = accountBalances[a.id] || 0;
                    valB = accountBalances[b.id] || 0;
                } else if (sortConfig.key === 'type') {
                    valA = a.type?.toLowerCase() || '';
                    valB = b.type?.toLowerCase() || '';
                } else { // 'name' u otro campo de texto
                    valA = a[sortConfig.key]?.toLowerCase() || '';
                    valB = b[sortConfig.key]?.toLowerCase() || '';
                }

                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                // Si son iguales, mantener un orden secundario por nombre para consistencia
                if (sortConfig.key !== 'name') {
                    return (a.name?.toLowerCase() || '') < (b.name?.toLowerCase() || '') ? -1 : 1;
                }
                return 0;
            });
        }
        
        const archived = accounts.filter(acc => acc.is_archived).sort((a,b) => a.name.localeCompare(b.name));

        let numTotalBalance = 0;
        let numNetWorthBalance = 0;
        
        // Recalcular total balance basado en las cuentas activas (ya filtradas y ordenadas si es necesario para el total)
        if ((Object.keys(accountBalances).length > 0 && filteredActive.length > 0) || filteredActive.length === 0 ) {
            numTotalBalance = calculateTotalBalance(filteredActive, accountBalances);
            numNetWorthBalance = calculateNetWorthBalance(filteredActive, accountBalances);
        } else if (accounts.length > 0 && Object.keys(accountBalances).length === 0 && !isLoading) {
            // Si hay cuentas pero los balances aún no llegan (o fallaron), los estados de string ya dicen "Calculando..." o "Error"
        }

        console.log("[Accounts.jsx useMemo] numericTotalBalance:", numTotalBalance, "numericNetWorthBalance:", numNetWorthBalance);
        
        return { 
            activeAccounts: filteredActive, 
            archivedAccounts: archived,
            numericTotalBalance: numTotalBalance, // Guardar valor numérico para comparación
            numericNetWorthBalance: numNetWorthBalance // Guardar valor numérico
        };
  }, [accounts, accountBalances, typeFilter, sortConfig, calculateTotalBalance, calculateNetWorthBalance, isLoading]);

  // --- Manejadores de Modal ---
  const handleOpenModal = (mode = 'add', account = null) => {
    setModalMode(mode);
    setSelectedAccount(account); // Pasa la cuenta completa para 'edit'
    setModalError('');
    setIsSaving(false);
    setIsModalOpen(true);
    // El estado inicial del formulario se maneja ahora dentro de AccountModal
    // usando la prop 'initialData' (que es 'selectedAccount')
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAccount(null);
  };

  const handleFormSubmit = useCallback(async (submittedFormData) => { // Recibe datos del modal
    if (!user?.id) {
      setModalError("Error: No se pudo identificar al usuario."); // Error en modal
      toast.error("Error: Usuario no identificado."); // Toast global
      return;
    }

    // Validaciones (usando submittedFormData)
    if (!submittedFormData.accountName || !submittedFormData.accountType || !submittedFormData.accountCurrency || submittedFormData.accountCurrency.length !== 3) {
      setModalError('Nombre, Tipo y Moneda (3 letras, ej: EUR) son obligatorios.'); // Error en modal
      return; // No continuar
    }
    const initialBalance = parseFloat(submittedFormData.accountBalance) || 0;
    if (modalMode === 'add' && isNaN(initialBalance)) { // Solo validar saldo inicial en 'add'
       setModalError('El saldo inicial debe ser un número válido (puede ser 0).'); return;
    }
    const targetBalanceFromModal = submittedFormData.target_balance;

    setModalError('');
    setIsSaving(true);
    const savingToastId = toast.loading(modalMode === 'edit' ? 'Guardando cambios...' : 'Creando cuenta...');

    try {
      const dataToSave = {
        // user_id se aplicará por RLS o se puede añadir explícitamente
        name: submittedFormData.accountName.trim(),
        type: submittedFormData.accountType,
        currency: submittedFormData.accountCurrency.trim().toUpperCase(),
        bank_name: submittedFormData.accountBank.trim() || null,
        target_balance: targetBalanceFromModal,
      };

      if (modalMode === 'edit' && selectedAccount) {
        // --- UPDATE ---
        const { error } = await supabase
          .from('accounts')
          .update({ ...dataToSave, updated_at: new Date() })
          .eq('id', selectedAccount.id)
          .eq('user_id', user.id);
        if (error) throw error;
        toast.success('Cuenta actualizada!', { id: savingToastId });

      } else {
        // --- INSERT ---
        // 1. Insertar cuenta
        const { data: newAccountData, error: insertAccError } = await supabase
          .from('accounts')
          .insert({ ...dataToSave, user_id: user.id, is_archived: false }) // Añadir user_id aquí
          .select()
          .single();
        if (insertAccError) throw insertAccError;

        // 2. Insertar transacción inicial si es necesario
        if (initialBalance !== 0 && newAccountData) {
          const { error: insertTxError } = await supabase
            .from('transactions')
            .insert({
              user_id: user.id, account_id: newAccountData.id,
              amount: initialBalance, description: 'Saldo Inicial',
              transaction_date: new Date().toISOString().split('T')[0],
              type: initialBalance >= 0 ? 'ingreso' : 'gasto', // >= para incluir 0 como ingreso? o solo >?
            });
          if (insertTxError) {
            toast.error("Cuenta creada, pero error al guardar saldo inicial.", { duration: 5000 });
            console.warn("Error en tx saldo inicial:", insertTxError);
          } else {
             toast.success('Cuenta creada con éxito!', { id: savingToastId });
          }
        } else {
            toast.success('Cuenta creada con éxito!', { id: savingToastId });
        }
      }

      handleCloseModal();
      fetchData(user.id); // <--- Volver a cargar TODOS los datos (cuentas y saldos)

    } catch (err) {
      console.error('Error guardando cuenta:', err);
      setModalError(`Error: ${err.message}`); // Muestra error en modal
      toast.error(`Error al guardar: ${err.message}`, { id: savingToastId }); // Muestra error en toast
    } finally {
      setIsSaving(false);
    }
  // Dependencias: Asegúrate de incluir todo lo que usas de fuera
  }, [user, modalMode, selectedAccount, supabase, handleCloseModal, fetchData, setModalError, setIsSaving]);

  // --- Manejador de Eliminación ---
  const handleAttemptArchiveAccount = (accountId, accountName) => {
        if (!accountId || !accountName) return;
        const balance = accountBalances[accountId]; // Obtener saldo del estado
        
        // Permitir un pequeño margen para saldos flotantes muy cercanos a cero
        if (balance !== undefined && Math.abs(Number(balance)) > 0.01) { 
            toast.error(`La cuenta "${accountName}" tiene un saldo de ${formatCurrency(balance)}. Debe ser cero para archivar.`, { duration: 5000 });
            return;
        }
        setItemToProcess({ id: accountId, name: accountName, action: 'archive' });
        setIsConfirmModalOpen(true);
    };

    const handleUnarchiveAccount = (accountId, accountName) => {
        if (!accountId || !accountName) return;
        setItemToProcess({ id: accountId, name: accountName, action: 'unarchive' });
        setIsConfirmModalOpen(true);
    };
    // --------------------------------------------

    const confirmProcessAccountHandler = useCallback(async () => {
        if (!itemToProcess || !user?.id) {
            toast.error("No se pudo procesar la acción (faltan datos).");
            setIsConfirmModalOpen(false); setItemToProcess(null); return;
        }

        const { id: accountId, name: accountName, action } = itemToProcess;
        setIsConfirmModalOpen(false);
        const toastActionText = action === 'archive' ? 'Archivando' : 'Desarchivando';
        const toastId = toast.loading(`${toastActionText} cuenta "${accountName}"...`);

        try {
            let updateData;
            if (action === 'archive') {
                updateData = { is_archived: true, archived_at: new Date() };
            } else if (action === 'unarchive') {
                updateData = { is_archived: false, archived_at: null };
            } else {
                throw new Error("Acción desconocida para procesar cuenta.");
            }

            const { error } = await supabase
                .from('accounts')
                .update(updateData)
                .eq('id', accountId)
                .eq('user_id', user.id);

            if (error) {
                // El error de transacciones asociadas (23503) ya no aplica para archivar.
                // Se podría mantener si hubiera una opción de "eliminar permanentemente"
                // if (error.code === '23503') {
                //    toast.error('No se puede archivar, tiene transacciones asociadas (esto no debería pasar con archivar).', { id: toastId, duration: 6000 });
                // } else { 
                throw error; 
                // }
            } else {
                toast.success(`Cuenta "${accountName}" ${action === 'archive' ? 'archivada' : 'desarchivada'}.`, { id: toastId });
                fetchData(user.id); // Recargar todas las cuentas para actualizar listas
            }
        } catch (err) {
            console.error(`Error al ${action} cuenta:`, err);
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally {
            setItemToProcess(null);
        }
    }, [user, itemToProcess, supabase, fetchData]);

  const handleTypeFilterChange = (event) => {
    setTypeFilter(event.target.value);
  };

  const handleSortChange = (event) => {
      const [key, direction] = event.target.value.split('_'); // ej. "name_asc"
      setSortConfig({ key, direction });
  };


  // Reutilizar handleBack, scrollToTop
  const handleBack = () => navigate(-1);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  // --- Renderizado ---
  return (
    <div style={{ display: 'flex' }}>
         <Sidebar
             // Pasar estado de carga/guardado si quieres deshabilitar botones mientras ocurre algo
             isProcessing={isLoading || isSaving /* ...o el estado relevante */}
          />

        {/* Contenido Principal */}
        <div className="page-container">
            {/* Cabecera */}
            {/* --- USAR EL NUEVO PageHeader --- */}
                <PageHeader 
                    pageTitle="Mis Cuentas"
                    headerClassName="accounts-header" // Clase específica si la necesitas
                    showSettingsButton={false}
                    actionButton={ // Botón específico para esta página
                        (accounts.length > 0 || isLoading) && !showArchivedAccounts ? ( // Mostrar solo si hay cuentas o está cargando, y no viendo archivadas
                            <button 
                                onClick={() => handleOpenModal('add')} 
                                id="addAccountBtn" 
                                className="btn btn-primary btn-add"
                                disabled={isLoading || isSaving} // Deshabilitar mientras carga o guarda
                            >
                                <i className="fas fa-plus"></i> Añadir Cuenta
                            </button>
                        ) : null // No mostrar botón de añadir si la lista de activas está vacía y no carga
                    }
                />
                {/* --- FIN PageHeader --- */}

            {/* Resumen Saldo Total */}
            <div className="account-summaries-section">
                    <div className="total-balance-summary">
                        <span className="summary-title-container">
                            Saldo Total (aprox.)
                            <span className="tooltip-trigger-container">
                                <i className="fas fa-info-circle tooltip-icon" tabIndex={0}></i> {/* Icono de información */}
                                <span className="tooltip-text">
                                    Suma de los saldos de tus cuentas de Corriente, Ahorro, Efectivo, Inversión, Viajes y Otros. No incluye los saldos deudores de Tarjetas de Crédito.
                                </span>
                            </span>
                        </span> 
                        <span id="totalBalanceAmount">
                          {isLoading && Object.keys(accountBalances).length === 0 ? 'Calculando...' : totalBalance}
                        </span>
                        {/*<small>(Excluye tarjetas de crédito)</small>*/}
                    </div>
                    {(numericTotalBalance !== numericNetWorthBalance) && 
                     (netWorthBalance !== 'Calculando...' && netWorthBalance !== 'Error') && (
                        <div className="net-worth-summary">
                            Saldo Neto Total: <span id="netWorthBalanceAmount">{netWorthBalance}</span>
                            <small>(Incluye deuda de tarjetas de crédito)</small>
                        </div>
                    )}
                    {/* ----------------------------------------- */}
                </div>

            <div className="accounts-controls-bar">
                    <div className="filter-control">
                        <label htmlFor="accountTypeFilter"><strong>Filtrar por Tipo:</strong></label>
                        <select id="accountTypeFilter" value={typeFilter} onChange={handleTypeFilterChange} disabled={isLoading}>
                            {ACCOUNT_TYPE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="sort-control">
                        <label htmlFor="accountSort"><strong>Ordenar por:</strong></label>
                        <select id="accountSort" value={`${sortConfig.key}_${sortConfig.direction}`} onChange={handleSortChange} disabled={isLoading}>
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="archive-toggle-control"> {/* Movido aquí para agrupar controles */}
                        <button 
                            onClick={() => setShowArchivedAccounts(prev => !prev)} 
                            className="btn btn-secondary btn-sm"
                            disabled={isLoading}
                        >
                            {showArchivedAccounts ? 'Ocultar Archivadas' : 'Mostrar Archivadas'}
                        </button>
                    </div>
            </div>
            {/* Lista de Cuentas */}
            <div id="accountList" className="account-list-grid">
                {isLoading && !accounts.length && ( // Muestra carga solo si no hay cuentas aún
                <p style={{ textAlign: 'center', color: '#666', gridColumn: '1 / -1' }}>Cargando...</p>
                )}
                {error && ( // Muestra error si existe
                <p style={{ textAlign: 'center', color: 'red', gridColumn: '1 / -1' }}>{error}</p>
                )}
                {!isLoading && accounts.filter(acc => !acc.is_archived).length === 0 && !showArchivedAccounts && !error &&  (
                  <div id="noAccountsWelcomeMessage" className="empty-list-message welcome-options" style={{ gridColumn: '1 / -1' }}>
                    <img src={emptyMascot} alt="Mascota FinAi Fini" className="empty-mascot large" />
                    <h2>¡Hola! Parece que aún no tienes cuentas.</h2>
                    <p>Puedes empezar de dos maneras:</p>
                    <div className="welcome-actions">
                      <button 
                        onClick={() => toast.success('Próximamente: Vinculación bancaria automática.', {duration: 4000, icon: '🚀'})} 
                        className="btn btn-primary blue-btn" // Usa tus clases de botón
                        title="Conecta tus bancos para una visión completa (Próximamente)"
                      >
                        <i className="fas fa-university"></i> Vincular Cuentas Bancarias
                      </button>
                      <button 
                        onClick={() => handleOpenModal('add')} 
                          className="btn btn-primary blue-btn" // Usa tus clases de botón
                          title="Añade tus cuentas una por una"
                      >
                        <i className="fas fa-plus-circle"></i> Añadir Cuentas Manualmente
                      </button>
                    </div>
                      <small style={{marginTop: '15px', display: 'block'}}>La vinculación bancaria es una función que llegará pronto para facilitar aún más tu gestión.</small>
                  </div>
                )}
                {/* Renderiza las tarjetas incluso si isLoading es true (para mostrar 'Calculando...') */}
                  {!isLoading && activeAccounts.length > 0 && (
                        activeAccounts.map(acc => (
                            <AccountCard
                                key={acc.id}
                                account={acc}
                                balance={accountBalances[acc.id] !== undefined ? formatCurrency(accountBalances[acc.id], acc.currency) : 'Calculando...'}
                                numericBalance={accountBalances[acc.id]} // Pasa el numérico
                                onEdit={() => handleOpenModal('edit', acc)}
                                onArchive={() => handleAttemptArchiveAccount(acc.id, acc.name)}
                            />
                        ))
                    )}
                    {/* Mensaje si el filtro no devuelve resultados pero hay cuentas activas */}
                    {!isLoading && activeAccounts.length === 0 && accounts.filter(a => !a.is_archived).length > 0 && !error && (
                        <p className="empty-list-message small-empty" style={{ gridColumn: '1 / -1' }}>
                            No hay cuentas activas que coincidan con el filtro "{ACCOUNT_TYPE_OPTIONS.find(opt => opt.value === typeFilter)?.label || typeFilter}".
                        </p>
                    )}
                    {/* Mostrar cuentas archivadas si showArchivedAccounts es true */}
                    {showArchivedAccounts && (
                        <>
                            <h2 className="content-section-header" style={{ gridColumn: '1 / -1', marginTop: '2rem' }}>Cuentas Archivadas</h2>
                            {isLoading && <p style={{ textAlign: 'center', width: '100%', gridColumn: '1 / -1' }}>Cargando...</p>}
                            {!isLoading && archivedAccounts.length === 0 && (
                                <p className="empty-list-message small-empty" style={{ gridColumn: '1 / -1' }}>No tienes cuentas archivadas.</p>
                            )}
                            {archivedAccounts.map(acc => (
                                <AccountCard
                                    key={acc.id}
                                    account={acc} // El objeto cuenta ya tiene is_archived = true
                                    balance={accountBalances[acc.id] !== undefined ? formatCurrency(accountBalances[acc.id], acc.currency) : 'N/A'} // Saldo de archivada puede ser N/A
                                    onUnarchive={() => handleUnarchiveAccount(acc.id, acc.name)} // <-- NUEVA PROP
                                    // No pasar onEdit ni onArchive para cuentas ya archivadas
                                />
                            ))}
                        </>
                    )}
            </div>

        </div> {/* Fin page-container */}

        {/* Modales */}
        <AccountModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSubmit={handleFormSubmit} // Pasa la función correcta
            mode={modalMode}
            initialData={selectedAccount}
            isSaving={isSaving}
            error={modalError}
        />
        <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => { setIsConfirmModalOpen(false); setItemToProcess(null); }}
                onConfirm={confirmProcessAccountHandler} // Usa el nuevo handler
                title={
                    itemToProcess?.action === 'archive' ? "Confirmar Archivado" : 
                    itemToProcess?.action === 'unarchive' ? "Confirmar Desarchivado" : 
                    "Confirmar Acción" // Fallback
                }
                message={
                    itemToProcess?.action === 'archive' 
                    ? `¿Seguro que quieres archivar la cuenta "${itemToProcess?.name || ''}"? No podrás usarla para nuevas transacciones pero su historial se conservará.`
                    : itemToProcess?.action === 'unarchive'
                        ? `¿Seguro que quieres desarchivar la cuenta "${itemToProcess?.name || ''}"? Volverá a estar activa.`
                        : `¿Estás seguro de realizar esta acción para "${itemToProcess?.name || ''}"?`
                }
                confirmText={itemToProcess?.action === 'archive' ? "Archivar" : (itemToProcess?.action === 'unarchive' ? "Desarchivar" : "Confirmar")}
                cancelText="Cancelar"
                isDanger={itemToProcess?.action === 'archive'} // Solo "peligro" para archivar
            />

        {/* Botón Scroll-Top */}
        {showScrollTop && (
            <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba">
                <i className="fas fa-arrow-up"></i>
            </button>
        )}

    </div> // Fin contenedor flex
  );
}

export default Accounts;