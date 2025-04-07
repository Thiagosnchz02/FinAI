-- =============================================
-- Script para crear la estructura inicial de la BBDD para FinAi
-- Asume que se ejecuta en el SQL Editor de Supabase
-- ¡ADVERTENCIA! Ejecutar esto después de haber eliminado las tablas existentes en 'public'
-- causará la pérdida de datos si ya existían.
-- =============================================

-- ========= Tabla: profiles =========
-- Almacena información adicional del usuario no presente en auth.users
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Clave primaria y foránea a auth.users
    full_name text NULL, -- Puedes obtenerlo de auth o guardarlo aquí
    avatar_url text NULL,
    theme text NULL DEFAULT 'light', -- Preferencia de tema (light/dark)
    doble_factor_enabled boolean NOT NULL DEFAULT false,
    -- Otros campos de perfil/configuración que necesites
    updated_at timestamp with time zone NULL DEFAULT now(),
    created_at timestamp with time zone NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver su propio perfil." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Los usuarios pueden insertar su propio perfil." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Los usuarios pueden actualizar su propio perfil." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- Nota: Generalmente no permitimos borrar perfiles directamente, se borran si se borra el auth.user (ON DELETE CASCADE)


-- ========= Tabla: accounts =========
-- Representa las cuentas financieras (bancarias, efectivo, tarjetas, etc.)
CREATE TABLE public.accounts (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL, -- Ej: "Cuenta Corriente BBVA", "Tarjeta Visa Oro", "Efectivo"
    type text NOT NULL CHECK (type IN ('corriente', 'ahorro', 'tarjeta_credito', 'efectivo', 'inversion', 'otro')), -- Tipo de cuenta
    balance numeric NOT NULL DEFAULT 0, -- Saldo actual (puede requerir actualización)
    currency text NOT NULL DEFAULT 'EUR', -- Moneda
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propias cuentas." ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus propias cuentas." ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propias cuentas." ON public.accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden borrar sus propias cuentas." ON public.accounts FOR DELETE USING (auth.uid() = user_id);


-- ========= Tabla: categories =========
-- Categorías para clasificar transacciones (ingresos/gastos)
CREATE TABLE public.categories (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Permite categorías personalizadas por usuario
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('ingreso', 'gasto')), -- Tipo de categoría
    parent_category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL, -- Para subcategorías
    icon text NULL, -- Nombre de icono (ej: 'fas fa-utensils')
    color text NULL, -- Código de color (ej: '#FF5733')
    created_at timestamp with time zone NULL DEFAULT now(),
    is_default boolean NOT NULL DEFAULT false -- Para marcar categorías predefinidas si las hubiera
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propias categorías (y las default)." ON public.categories FOR SELECT USING (auth.uid() = user_id OR is_default = true);
CREATE POLICY "Los usuarios pueden insertar sus propias categorías." ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id AND is_default = false); -- Solo pueden crear no-default
CREATE POLICY "Los usuarios pueden actualizar sus propias categorías." ON public.categories FOR UPDATE USING (auth.uid() = user_id AND is_default = false) WITH CHECK (auth.uid() = user_id AND is_default = false);
CREATE POLICY "Los usuarios pueden borrar sus propias categorías." ON public.categories FOR DELETE USING (auth.uid() = user_id AND is_default = false);


-- ========= Tabla: transactions =========
-- Registro principal de todos los movimientos financieros
CREATE TABLE public.transactions (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT, -- De qué cuenta (¡Importante!) - RESTRICT para no borrar cuentas con transacciones
    category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL, -- A qué categoría pertenece (SET NULL si se borra la categoría)
    type text NOT NULL CHECK (type IN ('ingreso', 'gasto', 'transferencia')), -- Tipo de transacción
    description text NULL,
    amount numeric NOT NULL CHECK (amount <> 0), -- Monto (positivo para ingreso, negativo para gasto)
    transaction_date timestamp with time zone NOT NULL DEFAULT now(), -- Fecha en que ocurrió
    notes text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
    -- Podrías añadir un campo para vincular transferencias entre cuentas si lo necesitas
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propias transacciones." ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus propias transacciones." ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propias transacciones." ON public.transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden borrar sus propias transacciones." ON public.transactions FOR DELETE USING (auth.uid() = user_id);


-- ========= Tabla: budgets =========
-- Presupuestos definidos por categoría y periodo
CREATE TABLE public.budgets (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE, -- Si se borra categoría, se borra presupuesto
    amount numeric NOT NULL CHECK (amount > 0), -- Monto presupuestado
    period text NOT NULL DEFAULT 'mensual' CHECK (period IN ('mensual', 'anual', 'trimestral')), -- Periodicidad
    start_date date NOT NULL, -- Fecha inicio periodo
    end_date date NULL, -- Fecha fin (opcional, si no es recurrente)
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
    -- UNIQUE (user_id, category_id, start_date)? Para evitar duplicados en el mismo periodo
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propios presupuestos." ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus propios presupuestos." ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propios presupuestos." ON public.budgets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden borrar sus propios presupuestos." ON public.budgets FOR DELETE USING (auth.uid() = user_id);


-- ========= Tabla: goals =========
-- Metas financieras de ahorro
CREATE TABLE public.goals (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL, -- Nombre de la meta (ej: "Vacaciones Japón")
    target_amount numeric NOT NULL CHECK (target_amount > 0), -- Monto objetivo
    current_amount numeric NOT NULL DEFAULT 0 CHECK (current_amount >= 0), -- Monto ahorrado actualmente (actualizar manualmente o con triggers/funciones)
    target_date date NULL, -- Fecha límite objetivo (opcional)
    notes text NULL,
    related_account_id uuid NULL REFERENCES public.accounts(id) ON DELETE SET NULL, -- Cuenta asociada al ahorro (opcional)
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propias metas." ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus propias metas." ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propias metas." ON public.goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden borrar sus propias metas." ON public.goals FOR DELETE USING (auth.uid() = user_id);


-- ========= Tabla: debts =========
-- Deudas del usuario (dinero que debe)
CREATE TABLE public.debts (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    creditor text NOT NULL, -- A quién se le debe
    description text NULL, -- Descripción de la deuda
    initial_amount numeric NOT NULL CHECK (initial_amount > 0), -- Monto inicial
    current_balance numeric NOT NULL CHECK (current_balance >= 0), -- Saldo pendiente (actualizar)
    interest_rate numeric NULL CHECK (interest_rate >= 0), -- Tasa de interés (opcional)
    due_date date NULL, -- Fecha de vencimiento final (opcional)
    status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagada', 'parcial')), -- Estado
    notes text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
);
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propias deudas." ON public.debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus propias deudas." ON public.debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propias deudas." ON public.debts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden borrar sus propias deudas." ON public.debts FOR DELETE USING (auth.uid() = user_id);


-- ========= Tabla: loans =========
-- Préstamos hechos por el usuario (dinero que le deben)
CREATE TABLE public.loans (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    debtor text NOT NULL, -- Quién debe el dinero
    description text NULL,
    initial_amount numeric NOT NULL CHECK (initial_amount > 0),
    current_balance numeric NOT NULL CHECK (current_balance >= 0), -- Saldo pendiente por cobrar (actualizar)
    interest_rate numeric NULL CHECK (interest_rate >= 0),
    due_date date NULL,
    status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'cobrado', 'parcial')),
    reminder_enabled boolean NOT NULL DEFAULT false, -- Para activar notificaciones de pago
    notes text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propios préstamos." ON public.loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus propios préstamos." ON public.loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propios préstamos." ON public.loans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden borrar sus propios préstamos." ON public.loans FOR DELETE USING (auth.uid() = user_id);


-- ========= Tabla: investments =========
-- Registro de activos de inversión
CREATE TABLE public.investments (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL, -- Ej: 'acciones', 'fondo', 'crypto', 'inmueble'
    name text NOT NULL, -- Nombre del activo (ej: 'Acciones Telefónica', 'Bitcoin', 'Piso Alquilado')
    symbol text NULL, -- Ticker/Símbolo si aplica
    quantity numeric NULL CHECK (quantity >= 0), -- Cantidad (acciones, unidades)
    purchase_price numeric NULL CHECK (purchase_price >= 0), -- Precio de compra unitario o total inicial
    purchase_date date NULL,
    current_value numeric NULL CHECK (current_value >= 0), -- Valor actual (actualizar manual o futuramente automático)
    broker text NULL, -- Plataforma/Broker
    notes text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
);
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propias inversiones." ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus propias inversiones." ON public.investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propias inversiones." ON public.investments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden borrar sus propias inversiones." ON public.investments FOR DELETE USING (auth.uid() = user_id);


-- ========= Tabla: trips =========
-- Planificación de viajes
CREATE TABLE public.trips (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL, -- Nombre del viaje (ej: "Verano 2025 Italia")
    destination text NULL,
    start_date date NULL,
    end_date date NULL,
    budget numeric NULL CHECK (budget >= 0), -- Presupuesto total estimado
    saved_amount numeric NOT NULL DEFAULT 0 CHECK (saved_amount >= 0), -- Dinero ya apartado/ahorrado para este viaje
    notes text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
);
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propios viajes." ON public.trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus propios viajes." ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propios viajes." ON public.trips FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden borrar sus propios viajes." ON public.trips FOR DELETE USING (auth.uid() = user_id);


-- ========= Tabla: trip_expenses =========
-- Gastos específicos asociados a un viaje
CREATE TABLE public.trip_expenses (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE, -- Si se borra el viaje, se borran sus gastos
    description text NOT NULL,
    amount numeric NOT NULL CHECK (amount >= 0), -- Gasto siempre positivo aquí
    expense_date timestamp with time zone NOT NULL DEFAULT now(),
    category text NULL, -- Podría ser FK a categories o un simple texto aquí
    notes text NULL,
    created_at timestamp with time zone NULL DEFAULT now()
);
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver los gastos de sus propios viajes." ON public.trip_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar gastos de sus propios viajes." ON public.trip_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar gastos de sus propios viajes." ON public.trip_expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden borrar gastos de sus propios viajes." ON public.trip_expenses FOR DELETE USING (auth.uid() = user_id);


-- ========= Tabla: scheduled_fixed_expenses =========
-- Gastos fijos programados para cálculo y recordatorios
CREATE TABLE public.scheduled_fixed_expenses (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description text NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0),
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT, -- Qué categoría
    account_id uuid NULL REFERENCES public.accounts(id) ON DELETE SET NULL, -- De qué cuenta se paga (opcional)
    frequency text NOT NULL CHECK (frequency IN ('mensual', 'bimestral', 'trimestral', 'semestral', 'anual', 'quincenal', 'semanal')),
    day_of_month smallint NULL CHECK (day_of_month BETWEEN 1 AND 31), -- Día del mes (si aplica)
    -- Otros campos para definir la fecha exacta según frecuencia si es necesario
    next_due_date date NOT NULL, -- Próxima fecha de vencimiento/pago
    is_active boolean NOT NULL DEFAULT true, -- Para poder desactivarlos sin borrarlos
    notification_enabled boolean NOT NULL DEFAULT true, -- Para recordatorios
    notes text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
);
ALTER TABLE public.scheduled_fixed_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propios gastos fijos prog." ON public.scheduled_fixed_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus propios gastos fijos prog." ON public.scheduled_fixed_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propios gastos fijos prog." ON public.scheduled_fixed_expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden borrar sus propios gastos fijos prog." ON public.scheduled_fixed_expenses FOR DELETE USING (auth.uid() = user_id);


-- ========= Tabla: notifications =========
-- Notificaciones internas de la app para el usuario
CREATE TABLE public.notifications (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL, -- Ej: 'recordatorio_gasto_fijo', 'meta_alcanzada', 'presupuesto_excedido'
    message text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    related_entity_type text NULL, -- Ej: 'scheduled_fixed_expenses', 'goals' (opcional)
    related_entity_id uuid NULL, -- ID de la entidad relacionada (opcional)
    created_at timestamp with time zone NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propias notificaciones." ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden marcar como leídas/borrar sus notificaciones." ON public.notifications FOR UPDATE USING (auth.uid() = user_id); -- UPDATE para is_read
CREATE POLICY "Los usuarios pueden borrar sus notificaciones." ON public.notifications FOR DELETE USING (auth.uid() = user_id);
-- NOTA: Las notificaciones generalmente las crea el sistema (ej: una Edge Function), no directamente el usuario. Por eso no hay política INSERT explícita para el usuario.


-- ========= Tabla: reports =========
-- Almacenamiento de informes generados (opcional, depende de cómo implementes informes)
CREATE TABLE public.reports (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL, -- Tipo de informe generado
    date_range daterange NULL, -- Rango de fechas cubierto
    generated_at timestamp with time zone NOT NULL DEFAULT now(),
    file_url text NULL, -- Si se guarda como archivo en Storage
    content jsonb NULL, -- O si se guarda el contenido como JSON
    sent_to_email text NULL -- Email al que se envió (si aplica)
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propios informes." ON public.reports FOR SELECT USING (auth.uid() = user_id);
-- Insert/Delete/Update dependerá de cómo funcione tu sistema de generación de informes.


-- ========= Tabla: evaluaciones ========= (La mantengo como la tenías, adaptando IDs/FKs)
-- Registro de la evaluación/distribución mensual
CREATE TABLE public.evaluaciones (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ingreso numeric NULL,
    ahorro_mes numeric NULL,
    colchon numeric NULL, -- Ahorro para colchón de seguridad
    viajes numeric NULL, -- Ahorro destinado a viajes
    inversion numeric NULL, -- Ahorro destinado a inversión
    fijos numeric NULL, -- Gasto fijo total estimado/calculado para el mes
    variables numeric NULL, -- Presupuesto para gasto variable del mes
    extra numeric NULL, -- Ingresos o ajustes extra
    evaluation_date date NOT NULL, -- Fecha de la evaluación (ej: primer día del mes)
    observaciones text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now()
);
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Los usuarios pueden ver sus propias evaluaciones." ON public.evaluaciones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden insertar sus propias evaluaciones." ON public.evaluaciones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propias evaluations." ON public.evaluaciones FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden borrar sus propias evaluaciones." ON public.evaluaciones FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- Fin del Script
-- =============================================