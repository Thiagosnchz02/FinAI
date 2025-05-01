/*
Archivo: src/pages/Accounts.jsx
Propósito: Componente para la página de gestión de cuentas de usuario,
          incluyendo carga de datos, modal y acciones CRUD.
*/
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; // Importa cliente Supabase

// Importa imágenes
import finAiLogo from '../assets/Logo_FinAI_Oficial.png';
import defaultAvatar from '../assets/avatar_predeterminado.png';
import emptyMascot from '../assets/monstruo_pixar.png';

// --- NOTAS IMPORTANTES ---
// 1. AuthContext: La obtención del 'userId' y avatar vendrá del AuthContext (Fase 2).
//    Por ahora, simularemos o dejaremos placeholders.
// 2. Balance Calculation: La lógica original para calcular el saldo de CADA cuenta
//    haciendo una petición por cuenta es INEFICIENTE. Se debe optimizar:
//    a) Fetching todas las transacciones relevantes de una vez y calcular en cliente.
//    b) (Mejor) Crear una Database Function (RPC) en Supabase que calcule los saldos.
//    Aquí simularemos el balance o mostraremos 'N/A'.
// 3. Componentes: <Sidebar />, <AccountCard />, <AccountModal /> serían componentes ideales.

// --- Funciones de Utilidad --- (Pueden ir fuera del componente si se usan en varios sitios)
const formatCurrency = (value, currency = 'EUR') => {
  if (isNaN(value) || value === null || value === undefined) return 'N/A';
  // Asegurarse de que es un número antes de formatear
  const numberValue = Number(value);
  if (isNaN(numberValue)) return 'N/A';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(numberValue);
};

const getIconForAccountType = (type) => {
  switch (type?.toLowerCase()) { // Usar toLowerCase para ser más robusto
    case 'nomina': return 'fas fa-wallet';
    case 'corriente': return 'fas fa-landmark';
    case 'viajes': return 'fa-solid fa-plane';
    case 'ahorro': return 'fas fa-piggy-bank';
    case 'ahorro_colchon': return 'fas fa-shield-alt'; // Icono diferente para colchón?
    case 'tarjeta_credito': return 'fas fa-credit-card';
    case 'efectivo': return 'fas fa-money-bill-wave'; // Icono más específico
    case 'inversion': return 'fas fa-chart-line';
    case 'otro': return 'fas fa-question-circle';
    default: return 'fas fa-university';
  }
};
// --- Fin Funciones de Utilidad ---


function Accounts() {
  // --- Estado del Componente ---
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // Para errores de carga
  const [totalBalance, setTotalBalance] = useState('Calculando...');
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar); // Avatar del usuario
  const [userId, setUserId] = useState(null); // ID del usuario (vendrá de AuthContext)

  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' o 'edit'
  const [selectedAccount, setSelectedAccount] = useState(null); // Cuenta a editar
  const [formData, setFormData] = useState({ // Datos del formulario modal
    accountName: '',
    accountBank: '',
    accountType: '',
    accountBalance: '0.00', // Saldo inicial solo para 'add'
    accountCurrency: 'EUR',
  });
  const [isSaving, setIsSaving] = useState(false); // Estado de carga del modal
  const [modalError, setModalError] = useState(''); // Mensaje de error del modal

  // Otros estados UI
  const [showScrollTop, setShowScrollTop] = useState(false);

  const navigate = useNavigate();

  // --- Efectos ---
  useEffect(() => {
    // Simular obtención del usuario (reemplazar con AuthContext)
    const fetchUserAndData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Obtener sesión/usuario (Simulado - Vendrá de AuthContext)
        // const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        // if (sessionError) throw sessionError;
        // if (!session?.user) {
        //   console.log("No hay sesión, redirigiendo a login...");
        //   navigate('/login'); // Redirigir si no hay usuario
        //   return;
        // }
        // const user = session.user;
        // setUserId(user.id);
        const simulatedUserId = 'USER_ID_PLACEHOLDER'; // Reemplazar
        setUserId(simulatedUserId);

        // 2. Cargar perfil (avatar) y cuentas en paralelo
        const [profileRes, accountsRes] = await Promise.all([
          supabase.from('profiles').select('avatar_url').eq('id', simulatedUserId).single(),
          supabase.from('accounts').select('*').eq('user_id', simulatedUserId).order('name')
        ]);

        // Procesar perfil
        if (profileRes.error && profileRes.status !== 406) throw profileRes.error; // 406 = no row, ok
        if (profileRes.data?.avatar_url) {
          // Construir URL pública si es necesario (depende de cómo se guarde)
          // const { data: avatarPublicUrlData } = supabase.storage.from('avatars').getPublicUrl(profileRes.data.avatar_url);
          // setAvatarUrl(avatarPublicUrlData?.publicUrl || defaultAvatar);
           setAvatarUrl(profileRes.data.avatar_url); // Asumir URL completa por ahora
        } else {
          setAvatarUrl(defaultAvatar);
        }

        // Procesar cuentas
        if (accountsRes.error) throw accountsRes.error;
        setAccounts(accountsRes.data || []);

        // Calcular Saldo Total (Simulado/Optimizado)
        calculateTotalBalance(accountsRes.data || []);

      } catch (err) {
        console.error("Error cargando datos de cuentas:", err);
        setError(err.message || 'Error al cargar los datos.');
        setAccounts([]); // Limpiar cuentas en caso de error
        setTotalBalance('Error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndData();

    // Scroll-top listener
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);

  }, [navigate]); // Añadir navigate como dependencia

  // --- Cálculo de Saldo Total (Simulado/Optimizado) ---
  const calculateTotalBalance = (accountList) => {
    console.warn("Calculando saldo total - ¡Optimización pendiente!");
    // Aquí iría la lógica optimizada (fetch único de transacciones o RPC)
    // Por ahora, simulamos sumando un campo 'balance' ficticio o mostramos N/A
    const excludedTypes = ['tarjeta_credito'];
    let total = 0;
    accountList.forEach(acc => {
      // Simulación: Asumimos que cada cuenta tiene un campo 'current_balance'
      // Esto NO existe en tu JS original, habría que añadirlo o calcularlo
      if (!excludedTypes.includes(acc.type?.toLowerCase())) {
        total += Number(acc.current_balance) || 0; // Usar un campo ficticio o 0
      }
    });
    setTotalBalance(formatCurrency(total));
  };

  // --- Manejadores de Modal ---
  const handleOpenModal = (mode = 'add', account = null) => {
    setModalMode(mode);
    setSelectedAccount(account);
    setModalError('');
    if (mode === 'edit' && account) {
      // Cargar datos de la cuenta existente en el formulario
      setFormData({
        accountName: account.name || '',
        accountBank: account.bank_name || '',
        accountType: account.type || '',
        accountBalance: '0.00', // Saldo no editable aquí
        accountCurrency: account.currency || 'EUR',
      });
    } else {
      // Resetear formulario a valores por defecto para añadir
      setFormData({
        accountName: '',
        accountBank: '',
        accountType: '', // Forzar selección
        accountBalance: '0.00',
        accountCurrency: 'EUR',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAccount(null); // Limpiar cuenta seleccionada
  };

  const handleFormInputChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    if (modalError) setModalError(''); // Limpiar error al escribir
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (!userId) {
        setModalError("Error: No se pudo identificar al usuario.");
        return;
    }

    // Validaciones básicas
    if (!formData.accountName || !formData.accountType || !formData.accountCurrency || formData.accountCurrency.length !== 3) {
      setModalError('Nombre, Tipo y Moneda (3 letras, ej: EUR) son obligatorios.');
      return;
    }
    if (modalMode === 'add' && (isNaN(parseFloat(formData.accountBalance)) || formData.accountBalance === '')) {
       // Permitir 0 como saldo inicial
       if (formData.accountBalance !== '0' && formData.accountBalance !== '0.00') {
           setModalError('El saldo inicial debe ser un número válido (puede ser 0).');
           return;
       }
    }
    setModalError('');
    setIsSaving(true);

    try {
      const dataToSave = {
        user_id: userId,
        name: formData.accountName.trim(),
        type: formData.accountType,
        currency: formData.accountCurrency.trim().toUpperCase(),
        bank_name: formData.accountBank.trim() || null,
        // balance: NO se guarda/edita aquí directamente, se calcula por transacciones
        // initial_balance: Podría guardarse si es 'add' y tu tabla lo tiene
        updated_at: new Date(), // Para la operación de update
      };

      let response;
      if (modalMode === 'edit' && selectedAccount) {
        // --- UPDATE ---
        const { error } = await supabase
          .from('accounts')
          .update({ // Solo actualizar campos permitidos
              name: dataToSave.name,
              type: dataToSave.type,
              currency: dataToSave.currency,
              bank_name: dataToSave.bank_name,
              updated_at: dataToSave.updated_at
          })
          .eq('id', selectedAccount.id)
          .eq('user_id', userId); // Doble check por RLS
        if (error) throw error;
        console.log('Cuenta actualizada');
        // Actualizar localmente para reflejar cambio inmediato
        setAccounts(prev => prev.map(acc =>
            acc.id === selectedAccount.id ? { ...acc, ...dataToSave } : acc
        ));

      } else {
        // --- INSERT ---
         // Si necesitas guardar el saldo inicial como primera transacción:
         const initialBalance = parseFloat(formData.accountBalance) || 0;
         // 1. Insertar la cuenta
         const { data: newAccountData, error: insertAccError } = await supabase
           .from('accounts')
           .insert({
               user_id: dataToSave.user_id,
               name: dataToSave.name,
               type: dataToSave.type,
               currency: dataToSave.currency,
               bank_name: dataToSave.bank_name,
               // No insertar 'updated_at', dejar que la BD lo maneje si tiene default
           })
           .select() // Pedir que devuelva la fila insertada
           .single(); // Esperamos una sola fila

         if (insertAccError) throw insertAccError;
         console.log('Cuenta creada:', newAccountData);

         // 2. Si hay saldo inicial > 0, insertar transacción inicial (opcional pero recomendado)
         if (initialBalance !== 0 && newAccountData) {
             const { error: insertTxError } = await supabase
                 .from('transactions')
                 .insert({
                     user_id: userId,
                     account_id: newAccountData.id,
                     amount: initialBalance,
                     description: 'Saldo Inicial',
                     date: new Date().toISOString().split('T')[0], // Fecha actual
                     type: initialBalance > 0 ? 'ingreso' : 'gasto', // Tipo basado en signo
                     // category_id: null // O una categoría especial "Saldo Inicial"
                 });
             if (insertTxError) {
                 console.warn("Cuenta creada, pero hubo error al añadir transacción de saldo inicial:", insertTxError);
                 // Podríamos decidir si revertir la creación de la cuenta o solo avisar
             } else {
                 console.log("Transacción de saldo inicial creada.");
             }
         }
         // Añadir nueva cuenta al estado local
         setAccounts(prev => [...prev, { ...newAccountData, current_balance: initialBalance }]); // Añadir con saldo inicial simulado
      }

      handleCloseModal();
      // Recalcular resumen (o se hará automáticamente si 'accounts' es dependencia)
      // calculateTotalBalance(updatedAccounts); // Pasar lista actualizada si no es dependencia

    } catch (err) {
      console.error('Error guardando cuenta:', err);
      setModalError(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Manejador de Eliminación ---
  const handleDeleteAccount = async (accountId, accountName) => {
      // Usar un modal de confirmación en lugar de window.confirm
      if (!window.confirm(`¿Estás SEGURO de eliminar la cuenta "${accountName}"?\n¡Esta acción es irreversible!\n(No se podrá eliminar si tiene transacciones asociadas).`)) {
          return;
      }

      console.log('Intentando eliminar cuenta:', accountId);
      try {
          const { error } = await supabase
              .from('accounts')
              .delete()
              .eq('id', accountId)
              .eq('user_id', userId); // Seguridad

          if (error) {
              if (error.code === '23503') { // Violación FK
                  alert('Error: No se puede eliminar la cuenta porque tiene transacciones asociadas. Borra o reasigna primero las transacciones.');
              } else {
                  throw error;
              }
          } else {
              console.log('Cuenta eliminada');
              alert('Cuenta eliminada.');
              // Eliminar del estado local y recalcular
              const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
              setAccounts(updatedAccounts);
              calculateTotalBalance(updatedAccounts);
          }
      } catch (err) {
          console.error('Error eliminando cuenta:', err);
          alert(`Error al eliminar: ${err.message}`);
      }
  };


  // Reutilizar handleBack, scrollToTop
  const handleBack = () => navigate(-1); // O a /dashboard
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const handleLogout = () => console.log('Logout pendiente'); // Vendrá de AuthContext


  // --- Renderizado ---
  return (
    <div style={{ display: 'flex' }}>

      {/* --- Sidebar (Reutilizable) --- */}
      <aside className="sidebar">
          {/* ... contenido sidebar con Links ... */}
          <div className="sidebar-logo"> <img src={finAiLogo} alt="FinAi Logo Small" /> </div>
          <nav className="sidebar-nav">
              <Link to="/dashboard" className="nav-button" title="Dashboard"><i className="fas fa-home"></i> <span>Dashboard</span></Link>
              <Link to="/accounts" className="nav-button active" title="Cuentas"><i className="fas fa-wallet"></i> <span>Cuentas</span></Link> {/* Active */}
              <Link to="/budgets" className="nav-button" title="Presupuestos"><i className="fas fa-chart-pie"></i> <span>Presupuestos</span></Link>
              <Link to="/categories" className="nav-button" title="Categorías"><i className="fas fa-tags"></i> <span>Categorías</span></Link>
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
        <div className="page-header accounts-header">
           <button onClick={handleBack} id="backButton" className="btn-icon" aria-label="Volver"><i className="fas fa-arrow-left"></i></button>
           <div className="header-title-group">
               {/* Usar avatarUrl del estado */}
               <img id="userAvatarHeader" src={avatarUrl} alt="Avatar" className="header-avatar-small" />
               <h1>Mis Cuentas</h1>
           </div>
           <button onClick={() => handleOpenModal('add')} id="addAccountBtn" className="btn btn-primary btn-add">
               <i className="fas fa-plus"></i> Añadir Cuenta
           </button>
        </div>

        {/* --- Resumen Saldo Total --- */}
        <div className="total-balance-summary">
           Saldo Total (aprox.): <span id="totalBalanceAmount">{isLoading ? 'Calculando...' : totalBalance}</span>
           <small>(Excluye tarjetas de crédito)</small>
        </div>

        {/* --- Lista de Cuentas --- */}
        <div id="accountList" className="account-list-grid">
          {isLoading && (
            <p style={{ textAlign: 'center', color: '#666', gridColumn: '1 / -1' }}>Cargando cuentas...</p>
          )}
          {error && !isLoading && (
             <p style={{ textAlign: 'center', color: 'red', gridColumn: '1 / -1' }}>{error}</p>
          )}
          {!isLoading && !error && accounts.length === 0 && (
             <div id="noAccountsMessage" className="empty-list-message" style={{ gridColumn: '1 / -1' }}>
                 <img src={emptyMascot} alt="Mascota FinAi" className="empty-mascot" />
                 <p>¡Parece que aún no tienes cuentas!</p>
                 <p>Añade tu primera cuenta para empezar.</p>
                 <button onClick={() => handleOpenModal('add')} id="addAccountFromEmptyBtn" className="btn btn-primary">
                     <i className="fas fa-plus"></i> Añadir Mi Primera Cuenta
                 </button>
             </div>
          )}
          {!isLoading && !error && accounts.length > 0 && (
            accounts.map(acc => {
              const iconClass = getIconForAccountType(acc.type);
              let typeText = (acc.type || 'otro').replace(/_/g, ' '); // Reemplazar guiones bajos
              typeText = typeText.charAt(0).toUpperCase() + typeText.slice(1);
              if (typeText === 'Tarjeta credito') typeText = 'Tarjeta de Crédito';
              // ** SIMULACIÓN DE SALDO ** - Reemplazar con cálculo real o campo de la BD
              const displayBalance = formatCurrency(acc.current_balance, acc.currency); // Usar campo simulado

              return (
                <div key={acc.id} className="account-card" data-id={acc.id} data-type={acc.type}>
                  <div className="card-header">
                    <span className="account-icon"><i className={iconClass}></i></span>
                    <h3 className="account-name">{acc.name}{acc.bank_name ? ` | ${acc.bank_name}` : ''}</h3>
                  </div>
                  <div className="card-body">
                    <p className="account-balance">{displayBalance}</p>
                    <p className="account-type">Tipo: {typeText}</p>
                  </div>
                  <div className="card-actions">
                    <button onClick={() => handleOpenModal('edit', acc)} className="btn-icon btn-edit" aria-label="Editar"><i className="fas fa-pencil-alt"></i></button>
                    <button onClick={() => handleDeleteAccount(acc.id, acc.name)} className="btn-icon btn-delete" aria-label="Eliminar"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div> {/* Fin page-container */}

      {/* --- Modal Añadir/Editar Cuenta --- */}
      {isModalOpen && (
        <div id="accountModal" className="modal-overlay active" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}> {/* Añadido active y onClick overlay */}
          <div className="modal-content">
            <h2 id="modalTitle">{modalMode === 'add' ? 'Añadir Nueva Cuenta' : 'Editar Cuenta'}</h2>
            <form id="accountForm" onSubmit={handleFormSubmit}>
              {/* ID oculto solo relevante en modo edición, pero lo dejamos */}
              <input type="hidden" id="accountId" name="accountId" value={selectedAccount?.id || ''} readOnly/>

              <div className="input-group">
                <label htmlFor="accountName">Nombre de la Cuenta</label>
                <input type="text" id="accountName" name="accountName" required placeholder="Ej: Cuenta Nómina, Tarjeta Principal..." value={formData.accountName} onChange={handleFormInputChange} disabled={isSaving} />
              </div>
              <div className="input-group">
                <label htmlFor="accountBank">Banco / Institución (Opcional)</label>
                <input type="text" id="accountBank" name="accountBank" placeholder="Ej: BBVA, CaixaBank, PayPal, Binance..." value={formData.accountBank} onChange={handleFormInputChange} disabled={isSaving} />
              </div>
              <div className="input-group">
                <label htmlFor="accountType">Tipo de Cuenta</label>
                <select id="accountType" name="accountType" required value={formData.accountType} onChange={handleFormInputChange} disabled={isSaving}>
                  <option value="" disabled>Selecciona un tipo...</option>
                  <option value="nomina">Nómina</option> {/* Valor consistente */}
                  <option value="corriente">Cuenta Corriente</option>
                  <option value="ahorro">Cuenta de Ahorro</option>
                  <option value="ahorro_colchon">Cuenta de Ahorro Colchón</option>
                  <option value="viajes">Cuenta de Viajes</option>
                  <option value="inversion">Cuenta de Inversión</option>
                  <option value="tarjeta_credito">Tarjeta de Crédito</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {/* Saldo inicial solo visible y editable en modo 'add' */}
              {modalMode === 'add' && (
                <div className="input-group">
                  <label htmlFor="accountBalance">Saldo Inicial</label>
                  <input type="number" id="accountBalance" name="accountBalance" required step="0.01" placeholder="0.00" value={formData.accountBalance} onChange={handleFormInputChange} disabled={isSaving} />
                  <small>Introduce el saldo actual al crear la cuenta.</small>
                </div>
              )}

              <div className="input-group">
                <label htmlFor="accountCurrency">Moneda (Código ISO 3)</label>
                <input type="text" id="accountCurrency" name="accountCurrency" required maxLength={3} placeholder="EUR" value={formData.accountCurrency} onChange={handleFormInputChange} disabled={isSaving} />
              </div>

              {/* Mensaje de error del modal */}
              {modalError && (
                 <p id="modalError" className="error-message">{modalError}</p>
              )}

              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary" disabled={isSaving}>Cancelar</button>
                <button type="submit" id="saveButton" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? (modalMode === 'add' ? 'Creando...' : 'Guardando...') : 'Guardar Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )} {/* Fin modal */}

      {/* --- Botón Scroll-Top --- */}
      {showScrollTop && (
        <button onClick={scrollToTop} id="scrollTopBtn" className="scroll-top-btn visible" title="Volver arriba"> {/* Añadir visible */}
          <i className="fas fa-arrow-up"></i>
        </button>
      )}

    </div> // Fin contenedor flex principal
  );
}

export default Accounts;