document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.sidebar-nav .nav-button');
    const mainContent = document.querySelector('.main-content'); // Podrías usarlo para cargar vistas

    // --- Manejador para botones de navegación de la Sidebar ---
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 1. Quitar la clase 'active' de todos los botones
            navButtons.forEach(btn => btn.classList.remove('active'));
            // 2. Añadir la clase 'active' al botón clickeado
            button.classList.add('active');

            // 3. Lógica para mostrar diferente contenido (opcional - ejemplo)
            const buttonId = button.id;
            console.log(`Botón presionado: ${buttonId}`); // Muestra qué botón se presionó

            // Aquí podrías añadir lógica para cargar diferentes "vistas"
            // en el área .main-content, o abrir modales, etc.
            switch (buttonId) {
                case 'btnProfile':
                    // Cargar vista de perfil o no hacer nada si es la vista por defecto
                    alert('Navegando a la sección Perfil (simulado).');
                    break;
                case 'btnIncome':
                    // Abrir modal para añadir ingreso
                    alert('Abriendo formulario para añadir Ingreso (simulado).');
                    break;
                case 'btnExpense':
                    // Abrir modal para añadir gasto
                    alert('Abriendo formulario para añadir Gasto (simulado).');
                    break;
                 case 'btnTravel':
                    // Cargar vista de viajes/gastos de viaje
                    alert('Navegando a la sección Viajes (simulado).');
                    break;
                default:
                    console.log("Acción no definida para este botón.");
            }
        });
    });

    // --- Funcionalidad botón Minimizar (simulado) ---
    const minimizeButton = document.querySelector('.minimize-button');
    if (minimizeButton) {
        minimizeButton.addEventListener('click', () => {
            alert('Minimizar (simulado). En una app real, esto podría cerrar o minimizar la ventana/aplicación.');
        });
    }

    // --- Inicialización de Charts (si usaras una librería) ---
    // Ejemplo con Chart.js (necesitarías incluir la librería)
    /*
    const ctxExpenses = document.getElementById('expensesChartElementId'); // Necesitarías un <canvas> en el HTML
    if (ctxExpenses) {
        new Chart(ctxExpenses, {
            type: 'doughnut',
            data: {
                labels: ['Food', 'Shopping', 'Housing', 'Transport'],
                datasets: [{
                    label: 'Expenses by Category',
                    data: [300, 500, 800, 200], // Datos de ejemplo
                    backgroundColor: [
                        '#4FC3F7', // Food
                        '#FFB74D', // Shopping
                        '#AED581', // Housing
                        '#E57373'  // Transport
                    ],
                    borderColor: '#FFF3E0', // Color del borde igual al fondo del panel
                    borderWidth: 4,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Para ajustar tamaño
                plugins: {
                    legend: {
                        display: false // Ocultar leyenda de Chart.js si usas la tuya en HTML/CSS
                    }
                },
                cutout: '60%' // Tamaño del agujero
            }
        });
    }
    // Repetir para el chart de Allocation
    */

    // --- Marcar día actual en el calendario (si no está hardcodeado) ---
    const today = new Date();
    // Solo si el calendario mostrado es el mes y año actual (Abril 2025)
    const currentCalendarMonth = 3; // 0 = Enero, 3 = Abril
    const currentCalendarYear = 2025;

    if (today.getMonth() === currentCalendarMonth && today.getFullYear() === currentCalendarYear) {
        const currentDay = today.getDate();
        const calendarDays = document.querySelectorAll('.calendar-grid .day:not(.empty)');
        calendarDays.forEach(dayElement => {
            // Limpiar clase 'current-day' hardcodeada si existe
            dayElement.classList.remove('current-day');
            // Añadir clase al día correcto
            if (parseInt(dayElement.textContent.match(/\d+/)[0]) === currentDay) {
                dayElement.classList.add('current-day');
            }
        });
    }


});

// Asegúrate de que Supabase esté inicializado en esta página también

const logoutButton = document.getElementById('logoutButton');

if (logoutButton && supabase) { // Verifica que el botón y supabase existen
    logoutButton.addEventListener('click', async () => {
        console.log('Cerrando sesión...');
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error);
            alert('Error al cerrar sesión: ' + error.message);
        } else {
            console.log('Sesión cerrada. Redirigiendo a login...');
            // No necesitas redirigir manualmente aquí,
            // onAuthStateChange detectará SIGNED_OUT y lo hará.
            // Si no tienes onAuthStateChange en esta página, sí necesitarías:
            // window.location.href = '/Login.html';
        }
    });
}