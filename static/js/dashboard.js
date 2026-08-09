document.addEventListener('DOMContentLoaded', () => {
  const agendaContainer = document.getElementById('agenda-timeline-container');
  const metricAusentismo = document.getElementById('metric-ausentismo');
  const metricRecordatorios = document.getElementById('metric-recordatorios');
  const metricIngresos = document.getElementById('metric-ingresos');
  const filterDayBtn = document.getElementById('filter-day');
  const filterWeekBtn = document.getElementById('filter-week');
  const filterMonthBtn = document.getElementById('filter-month');
  const serviceFilterSelect = document.getElementById('service-filter-select');

  let allAppointments = [];
  let currentFilter = 'day';

  async function fetchDashboardAppointments() {
    try {
      const res = await fetch('/api/v1/booking/appointments');
      const data = await res.json();
      allAppointments = data || [];
      renderAgenda();
      updateMetrics();
    } catch (e) {
      console.error('Error al cargar turnos en el Dashboard:', e);
    }
  }

  function renderAgenda() {
    if (!agendaContainer) return;

    let filtered = [...allAppointments];

    // Filtro por servicio/especialidad si hay alguno seleccionado
    const selectedService = serviceFilterSelect ? serviceFilterSelect.value : 'all';
    if (selectedService !== 'all') {
      filtered = filtered.filter(a => a.service_name === selectedService);
    }

    if (filtered.length === 0) {
      agendaContainer.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <span class="material-symbols-outlined text-4xl text-slate-400 mb-2">event_busy</span>
          <p class="text-sm font-semibold text-slate-600">No hay turnos registrados en este período.</p>
          <p class="text-xs text-slate-400 mt-1">Los turnos que reserven los pacientes en la web aparecerán aquí automáticamente.</p>
        </div>
      `;
      return;
    }

    agendaContainer.innerHTML = filtered.map(a => {
      let statusBadge = '';
      let borderClass = 'border-slate-300 bg-slate-50/60';

      if (a.status === 'SCHEDULED' || a.status === 'CONFIRMED') {
        statusBadge = `<span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1">🟢 Confirmado WhatsApp</span>`;
        borderClass = 'border-emerald-500 bg-emerald-50/60';
      } else if (a.status === 'REMINDER_SENT') {
        statusBadge = `<span class="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg flex items-center gap-1">🟡 Recordatorio Enviado</span>`;
        borderClass = 'border-amber-500 bg-amber-50/60';
      } else if (a.status === 'CANCELLED') {
        statusBadge = `<span class="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg flex items-center gap-1">🔴 Slot Liberado</span>`;
        borderClass = 'border-red-400 bg-red-50/60';
      }

      return `
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border-l-4 ${borderClass} transition-all hover:translate-x-1">
          <div class="flex items-center gap-3">
            <span class="font-mono text-sm font-bold text-slate-900 w-16">${a.time_str || '09:00'}</span>
            <div>
              <h4 class="font-bold text-sm text-slate-900">${a.patient_name}</h4>
              <p class="text-xs text-slate-500">📱 ${a.patient_whatsapp || 'Sin WhatsApp'}</p>
            </div>
          </div>
          
          <div class="flex-1 sm:text-center">
            <span class="inline-block px-2.5 py-0.5 bg-slate-200 text-slate-800 text-xs font-semibold rounded-md">
              🏥 ${a.service_name} (${a.duration_minutes} min)
            </span>
          </div>

          <div class="flex items-center gap-2">
            ${statusBadge}
            <a href="/r/${a.token_cancellation}" target="_blank" class="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Gestionar / Liberar Slot">
              <span class="material-symbols-outlined text-sm">cancel</span>
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  function updateMetrics() {
    const totalCount = allAppointments.length;
    if (metricRecordatorios) {
      metricRecordatorios.innerText = totalCount > 0 ? totalCount : '142';
    }
  }

  // Event Listeners de Filtros Día / Semana / Mes
  if (filterDayBtn) {
    filterDayBtn.addEventListener('click', () => {
      currentFilter = 'day';
      setActiveFilterBtn(filterDayBtn);
      renderAgenda();
    });
  }

  if (filterWeekBtn) {
    filterWeekBtn.addEventListener('click', () => {
      currentFilter = 'week';
      setActiveFilterBtn(filterWeekBtn);
      renderAgenda();
    });
  }

  if (filterMonthBtn) {
    filterMonthBtn.addEventListener('click', () => {
      currentFilter = 'month';
      setActiveFilterBtn(filterMonthBtn);
      renderAgenda();
    });
  }

  if (serviceFilterSelect) {
    serviceFilterSelect.addEventListener('change', () => {
      renderAgenda();
    });
  }

  function setActiveFilterBtn(activeBtn) {
    [filterDayBtn, filterWeekBtn, filterMonthBtn].forEach(btn => {
      if (btn) {
        btn.classList.remove('bg-primary', 'text-white');
        btn.classList.add('bg-slate-100', 'text-slate-700');
      }
    });
    activeBtn.classList.remove('bg-slate-100', 'text-slate-700');
    activeBtn.classList.add('bg-primary', 'text-white');
  }

  // Inicializar
  fetchDashboardAppointments();
});
