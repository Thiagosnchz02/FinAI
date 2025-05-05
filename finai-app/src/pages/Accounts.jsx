/*
Archivo: src/pages/Accounts.jsx
Propósito: Componente para la página de gestión de cuentas de usuario,
          incluyendo carga de datos, modal y acciones CRUD.
*/
import React, { useState, useEffect, useCallback  } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency } from '../utils/formatters.js';
//import { getIconForAccountType } from '../utils/iconUtils.js';
import AccountCard from '../components/Accounts/AccountCard.jsx';
import AccountModal from '../components/Accounts/AccountModal.jsx';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import Sidebar from '../components/layout/Sidebar.jsx'; // Asegúrate que la ruta sea correcta

// Importa imágenes
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';


function Accounts() {
  const { user, loading: authLoading } = useAuth(); // Obtiene el usuario y el estado de carga inicial
  // --- Estado del Componente ---
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // Para errores de carga
  const [totalBalance, setTotalBalance] = useState('Calculando...');
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar); // Avatar del usuario
  //const [userId, setUserId] = useState(null); // ID del usuario (vendrá de AuthContext)
  const [accountBalances, setAccountBalances] = useState({}); // Para guardar { accountId: balance }

  // Estado del Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
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
  }, []);

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
    // Otras validaciones si son necesarias...

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
          .insert({ ...dataToSave, user_id: user.id }) // Añadir user_id aquí
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
  }, [user, modalMode, selectedAccount, supabase, handleCloseModal, fetchData]);

  // --- Manejador de Eliminación ---
  const handleDeleteAccount = (accountId, accountName) => {
    if (!accountId || !accountName) return;
    setAccountToDelete({ id: accountId, name: accountName });
    setIsConfirmModalOpen(true);
  };

  // (Puedes ponerla después de handleDeleteAccount, línea ~230)
  const confirmDeleteHandler = useCallback(async () => {
    if (!accountToDelete || !user?.id) {
      toast.error("No se pudo eliminar (faltan datos).");
      setIsConfirmModalOpen(false);
      setAccountToDelete(null);
      return;
    }

    const { id: accountId, name: accountName } = accountToDelete;
    setIsConfirmModalOpen(false);
    const deletingToastId = toast.loading(`Eliminando "${accountName}"...`);

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (error) {
        if (error.code === '23503') {
          toast.error('No se puede eliminar, tiene transacciones asociadas.', { id: deletingToastId, duration: 6000 });
        } else { throw error; }
      } else {
        toast.success('Cuenta eliminada.', { id: deletingToastId });
        // Volver a cargar datos en lugar de manipular estado local
        fetchData(user.id);
      }
    } catch (err) {
      console.error('Error eliminando cuenta (confirmado):', err);
      toast.error(`Error al eliminar: ${err.message}`, { id: deletingToastId });
    } finally {
      setAccountToDelete(null);
    }
  // Incluye fetchData en dependencias si la usas de fuera
  }, [user, accountToDelete, supabase, fetchData]);


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
            <div className="page-header accounts-header">
                <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
                <div className="header-title-group">
                    <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" />
                    <h1>Mis Cuentas</h1>
                </div>
                <button onClick={() => handleOpenModal('add')} id="addAccountBtn" className="btn btn-primary btn-add">
                    <i className="fas fa-plus"></i> Añadir Cuenta
                </button>
            </div>

            {/* Resumen Saldo Total */}
            <div className="total-balance-summary">
                Saldo Total (aprox.): <span id="totalBalanceAmount">{isLoading ? 'Calculando...' : totalBalance}</span>
                <small>(Excluye tarjetas de crédito)</small>
            </div>

            {/* Lista de Cuentas */}
            <div id="accountList" className="account-list-grid">
                {isLoading && !accounts.length && ( // Muestra carga solo si no hay cuentas aún
                <p style={{ textAlign: 'center', color: '#666', gridColumn: '1 / -1' }}>Cargando...</p>
                )}
                {error && ( // Muestra error si existe
                <p style={{ textAlign: 'center', color: 'red', gridColumn: '1 / -1' }}>{error}</p>
                )}
                {!isLoading && accounts.length === 0 && !error && ( // Mensaje si no carga, no error y 0 cuentas
                <div id="noAccountsMessage" className="empty-list-message" style={{ gridColumn: '1 / -1' }}>
                    <img src={emptyMascot} alt="Mascota FinAi" className="empty-mascot" />
                    <p>¡Añade tu primera cuenta!</p>
                    <button onClick={() => handleOpenModal('add')} id="addAccountFromEmptyBtn" className="btn btn-primary">
                        <i className="fas fa-plus"></i> Añadir Cuenta
                    </button>
                </div>
                )}
                {/* Renderiza las tarjetas incluso si isLoading es true (para mostrar 'Calculando...') */}
                {accounts.length > 0 && (
                    accounts.map(acc => (
                        <AccountCard
                            key={acc.id}
                            account={acc}
                            balance={
                                isLoading // Si está cargando globalmente
                                    ? 'Calculando...'
                                    : accountBalances[acc.id] !== undefined // Si ya cargó, ¿tenemos saldo?
                                        ? formatCurrency(accountBalances[acc.id], acc.currency)
                                        : (error ? 'Error Saldo' : 'Calculando...') // Si no hay saldo, ¿fue error o sigue calculando?
                            }
                            onEdit={handleOpenModal}
                            onDelete={handleDeleteAccount}
                        />
                    ))
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
            onClose={() => {
                setIsConfirmModalOpen(false);
                setAccountToDelete(null);
            }}
            onConfirm={confirmDeleteHandler} // Pasa la función correcta
            title="Confirmar Eliminación"
            message={`¿Seguro que quieres eliminar la cuenta "${accountToDelete?.name || ''}"? Esta acción es irreversible.`}
            confirmText="Eliminar"
            cancelText="Cancelar"
            isDanger={true}
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