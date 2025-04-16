// supabase/functions/generate-filtered-report/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";


// Importa desde la carpeta compartida (la ruta es relativa a este archivo index.ts)
import { corsHeaders } from '../shared/cors.ts'

console.log(`Function generate-filtered-report starting...`)

// --- Interfaces para Tipado ---
interface Filters {
  dateFrom?: string; dateTo?: string;
  type?: 'all' | 'ingreso' | 'gasto';
  accountId?: string; // 'all' o UUID
  categoryId?: string; // 'all', 'none', o UUID
  tripId?: string; // UUID
}
interface ReportRequestBody {
  reportType: 'transactions' | 'trip_expenses';
  filters: Filters;
  format: 'csv' | 'pdf'; // Aunque solo implementaremos CSV ahora
}
// Interfaces para datos
interface TransactionData {
    transaction_date: string;
    description: string | null;
    type: 'ingreso' | 'gasto' | 'transferencia';
    amount: number;
    notes: string | null;
    accounts: { name: string } | null;
    categories: { name: string } | null;
  }
  
  interface TripExpenseData {
    expense_date: string;
    description: string | null;
    category: string | null;
    amount: number;
    notes: string | null;
  }
  


// --- Helper para escapar CSV ---
function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) { return ''; }
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// --- Helper para formatear fecha ---
function formatDateForCsv(dateString: string | null): string {
     if (!dateString) return '';
     try {
         // Intenta obtener YYYY-MM-DD
         return dateString.split('T')[0];
     } catch { return ''; }
 }

// --- Helper para formatear número ---
 function formatNumberForCsv(num: number | null): string {
     if (num === null || num === undefined || isNaN(num)) return '0.00';
     // Usar punto como separador decimal, 2 decimales
     return num.toFixed(2);
 }
 function isTransactionData(row: unknown): row is TransactionData {
    return typeof row === 'object' && row !== null && 'transaction_date' in row;
  }
  
  function isTripExpenseData(row: unknown): row is TripExpenseData {
    return typeof row === 'object' && row !== null && 'expense_date' in row;
  }


Deno.serve(async (req) => {
  // Manejo CORS preflight
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
  let rawBody: string | undefined;
  try {
    console.log("Request Method:", req.method); // Loguear método
    console.log("Request Headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2)); // Loguear cabeceras
    // Validar que sea POST
    if (req.method !== 'POST') { throw new Error('Método no permitido.'); }

    // 1. Parsear Body y Obtener Usuario
    rawBody = await req.text(); // Lee el cuerpo como texto
    console.log("Raw Request Body:", rawBody); // Loguea el cuerpo raw

    // Ahora intenta parsear ese texto raw
    if (!rawBody) {
         throw new Error("Request body is empty."); // Lanza error si está vacío
    }
    const body: ReportRequestBody = JSON.parse(rawBody); // Parsea manualmente

    // Validar que el body parseado no esté vacío (por si acaso rawBody fuera '{}' o similar)
    if (!body || Object.keys(body).length === 0) {
         throw new Error("Parsed request body is empty or invalid.");
    }

    console.log("Parsed Body:", JSON.stringify(body, null, 2)); // Loguea el cuerpo parseado con éxito
    const { reportType, filters, format } = body;

    console.log("Filtros recibidos:", filters); // <-- Aquí logueamos los filtros recibidos
    console.log("Tipo de reporte:", reportType);

    if (!reportType || !filters || !format) { throw new Error("Faltan parámetros en la petición."); }
    if (format !== 'csv') { throw new Error("Formato PDF no implementado todavía."); }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Usuario no autenticado.');
    console.log(`Generating report type '${reportType}' for user ${user.id} with filters:`, filters);

    let query;
    let headers: string[] = [];
    let dataToFormat: (TransactionData | TripExpenseData)[] | null = null;


    // 2. Construir y Ejecutar Query según el Tipo de Informe
    if (reportType === 'transactions') {
         query = supabaseClient
            .from('transactions')
            .select(`transaction_date, description, type, amount, notes, accounts ( name ), categories ( name )`)
            .eq('user_id', user.id);

         headers = ["Fecha", "Descripcion", "Tipo", "Importe", "Categoria", "Cuenta", "Notas"];

         // Aplicar filtros de transacciones
         if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
         if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);
         if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type);
         if (filters.accountId && filters.accountId !== 'all') query = query.eq('account_id', filters.accountId);
         if (filters.categoryId) {
             if (filters.categoryId === 'none') query = query.is('category_id', null);
             else if (filters.categoryId !== 'all') query = query.eq('category_id', filters.categoryId);
         }
         query = query.order('transaction_date', { ascending: false });

    } else if (reportType === 'trip_expenses') {
        if (!filters.tripId) throw new Error("Se requiere seleccionar un viaje para este informe.");
         query = supabaseClient
            .from('trip_expenses')
            .select(`expense_date, description, category, amount, notes`) // Columnas de trip_expenses
            .eq('user_id', user.id)
            .eq('trip_id', filters.tripId);

         headers = ["Fecha Gasto", "Descripcion", "Categoria Viaje", "Importe", "Notas"];

         // Aplicar filtros de fecha si existen
         if (filters.dateFrom) query = query.gte('expense_date', filters.dateFrom);
         if (filters.dateTo) query = query.lte('expense_date', filters.dateTo);
         query = query.order('expense_date', { ascending: false });

    } else {
        throw new Error("Tipo de informe no soportado.");
    }

    console.log("Query generada:", query.toString());

    // Ejecutar la query construida
    console.log("Executing database query...");
    const { data, error: dataError } = await query;
    if (dataError) {
        console.error("Database Query Error:", dataError); // Loguear el error específico de la DB
        throw dataError; // Relanzar para que lo capture el catch principal
    }
    console.log("Database query executed successfully.");
    dataToFormat = data;

    // 3. Comprobar si hay datos
    if (!dataToFormat || dataToFormat.length === 0) {
      console.log(`No data found for report type '${reportType}' with given filters.`);
      return new Response(JSON.stringify({ status: 'empty', message: "No se encontraron datos con los filtros seleccionados." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
      });
    }
    console.log(`Found ${dataToFormat.length} records to format as CSV.`);

    // 4. Formatear a CSV
    const csvHeader = headers.map(escapeCsvValue).join(',');
    const csvRows = dataToFormat.map((row) => {
         // Mapear columnas según el tipo de reporte
         let rowValues: string[];
         if (reportType === 'transactions' && isTransactionData(row)) {
            rowValues = [
              formatDateForCsv(row.transaction_date),
              row.description || '',
              row.type,
              formatNumberForCsv(row.amount),
              row.categories?.name ?? '',
              row.accounts?.name ?? '',
              row.notes || ''
            ];
         } else if (reportType === 'trip_expenses' && isTripExpenseData(row)) {
            rowValues = [
              formatDateForCsv(row.expense_date),
              row.description || '',
              row.category ?? '',
              formatNumberForCsv(row.amount),
              row.notes || ''
            ];
         }else {
            rowValues = [];
          }
         return rowValues.map(escapeCsvValue).join(',');
    });
    const csvString = [csvHeader, ...csvRows].join('\n');

    // 5. Devolver respuesta CSV
    const filename = reportType === 'transactions' ? 'transacciones' : `gastos_viaje_${filters.tripId?.substring(0, 8) || 'export'}`;
    const responseHeaders = {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="finai_${filename}_${user.id.substring(0, 8)}.csv"`
    };
    console.log("CSV generated, sending response for download.");
    return new Response(csvString, { headers: responseHeaders, status: 200 });

  } catch (error) {
    console.error('Error in generate-filtered-report function:', error);
    if (typeof rawBody !== 'undefined') {
        console.error("Raw body that potentially caused error:", rawBody);
    }
    const message = error instanceof Error ? error.message : 'Error interno.';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
})