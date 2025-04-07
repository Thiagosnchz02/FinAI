document.addEventListener('DOMContentLoaded', () => {
    const expenseItems = document.querySelectorAll('.expense-item');
    const calendarDays = document.querySelectorAll('.calendar-grid-fixed .day:not(:empty)');

    // --- Añadir interactividad a los items de gasto ---
    expenseItems.forEach(item => {
        item.addEventListener('click', () => {
            const expenseName = item.querySelector('.expense-name').textContent;
            const expenseAmount = item.querySelector('.expense-amount').textContent;
            alert(`Gasto Seleccionado: ${expenseName} - ${expenseAmount}`);
            // Aquí podrías abrir un modal para editar/ver detalles
        });
    });

    // --- Añadir interactividad a los días del calendario ---
    calendarDays.forEach(day => {
        day.addEventListener('click', () => {
            // Comprobar si el día tiene alguna clase especial
            const isSelected = day.classList.contains('selected');
            const hasEvent = day.classList.contains('has-event');
            const dayNumber = day.textContent;

            let message = `Día ${dayNumber} seleccionado.`;
            if (isSelected) {
                message += ' (Destacado azul)';
            }
            if (hasEvent) {
                message += ' (Tiene evento verde)';
                // Podrías buscar qué gasto vence este día y mostrarlo
            }

            alert(message);
            // Aquí podrías mostrar información relevante para ese día
        });
    });

     // --- Interactividad iconos decorativos (opcional) ---
     const decorativeIcons = document.querySelectorAll('.character-icon, .notification-icon');
     decorativeIcons.forEach(icon => {
         icon.addEventListener('click', () => {
             let iconType = 'Icono decorativo';
             if(icon.classList.contains('bell')) iconType = 'Campana';
             if(icon.classList.contains('smile')) iconType = 'Carita sonriente';
             if(icon.classList.contains('notification-icon')) iconType = 'Icono de notificación';

             alert(`${iconType} clickeado!`);
             // Podrías añadir animaciones o alguna funcionalidad aquí
         });
     });

});