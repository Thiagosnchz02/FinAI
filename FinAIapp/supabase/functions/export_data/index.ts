// supabase/functions/export-data/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2?dts";


// Importa desde la carpeta compartida (la ruta es relativa a este archivo index.ts)
import { corsHeaders } from '../shared/cors.ts'

console.log(`Function export-data starting...`)

// Interfaces para tipar datos (opcional pero útil)
interface Transaction {
  transaction_date: string;
  description: string | null;
  type: 'ingreso' | 'gasto' | 'transferencia';
  amount: number;
  notes: string | null;
  accounts: { name: string } | null;
  categories: { name: string } | null;
}

// Helper para escapar datos para CSV (maneja comas, comillas, saltos de línea)
function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  // Si contiene coma, comillas o saltos de línea, encerrar entre comillas y duplicar comillas internas
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

Deno.serve(async (req) => {
  // Manejo CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Crear cliente estándar (NO necesita admin)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 2. Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Usuario no autenticado.');
    console.log(`Export request for user: ${user.id}`);

    // 3. Obtener datos a exportar (ej: Transacciones con nombres de cuenta/categoría)
    const { data: transactions, error: dataError } = await supabaseClient
      .from('transactions')
      .select(`
        transaction_date,
        description,
        type,
        amount,
        notes,
        accounts ( name ),
        categories ( name )
      `)
      .eq('user_id', user.id) // RLS debería aplicar, pero añadimos por seguridad
      .order('transaction_date', { ascending: false }); // O el orden que prefieras

    if (dataError) throw dataError;
    if (!transactions || transactions.length === 0) {
        console.log("No transactions found to export for user:", user.id);
        // Devolver JSON indicando que está vacío, en lugar de CSV
        return new Response(JSON.stringify({
            status: 'empty', // Indicador para el frontend
            message: "No se encontraron transacciones para exportar."
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Content-Type JSON
          status: 200 // La operación fue exitosa, simplemente no había datos
        });
      }

    console.log(`Found ${transactions.length} transactions to export.`);

    // 4. Formatear datos a CSV
    const headers = [
      "Fecha", "Descripcion", "Tipo", "Importe",
      "Categoria", "Cuenta", "Notas"
    ];
    // Unir headers escapados
    const csvHeader = headers.map(escapeCsvValue).join(',');

    const csvRows = (transactions as Transaction[]).map(tx => {
      // Formatear datos para CSV (ej: fecha YYYY-MM-DD, número con punto decimal)
      const date = tx.transaction_date ? tx.transaction_date.split('T')[0] : '';
      //const amount = tx.amount ? tx.amount.toFixed(2).replace('.', ',') : '0,00'; // Usar coma decimal para Excel España? O dejar punto? Mejor punto.
      const formattedAmount = tx.amount?.toFixed(2) ?? '0.00'; 
      const categoryName = tx.categories?.name ?? '';
      const accountName = tx.accounts?.name ?? '';

      // Crear fila escapando cada valor
      return [
        escapeCsvValue(date),
        escapeCsvValue(tx.description),
        escapeCsvValue(tx.type),
        escapeCsvValue(formattedAmount), // Usar número con punto
        escapeCsvValue(categoryName),
        escapeCsvValue(accountName),
        escapeCsvValue(tx.notes)
      ].join(','); // Unir con comas
    });

    // Unir cabecera y filas con saltos de línea
    const csvString = [csvHeader, ...csvRows].join('\n');

    // 5. Devolver respuesta CSV para descarga
    const responseHeaders = {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8', // Especificar charset
        // Cabecera para forzar descarga con nombre de archivo
        'Content-Disposition': `attachment; filename="finai_transacciones_${user.id.substring(0, 8)}.csv"`
    };

    console.log("CSV generated, sending response...");
    return new Response(csvString, { headers: responseHeaders, status: 200 });

  } catch (error) {
    console.error('Error in export-data function:', error);
    const message = error instanceof Error ? error.message : 'Error interno.';
    // Devolver error como JSON
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
})