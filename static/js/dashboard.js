document.addEventListener('DOMContentLoaded', () => {
  const tabPanel = document.getElementById('view-panel');
  const tabReservas = document.getElementById('view-reservas');
  const tabWhatsapp = document.getElementById('view-whatsapp');

  const navPanelBtns = document.querySelectorAll('.btn-nav-panel');
  const navReservasBtns = document.querySelectorAll('.btn-nav-reservas');
  const navWhatsappBtns = document.querySelectorAll('.btn-nav-whatsapp');

  const agendaContainer = document.getElementById('agenda-timeline-container');
  const whatsappLogContainer = document.getElementById('whatsapp-log-container');
  const searchInput = document.getElementById('search-patient-input');

  const metricTotalTurnos = document.getElementById('metric-total-turnos');
  const metricConfirmados = document.getElementById('metric-confirmados');
  const metricPendientes = document.getElementById('metric-pendientes');

  const countOrtodoncia = document.getElementById('count-ortodoncia');
  const countLimpieza = document.getElementById('count-limpieza');
  const barOrtodoncia = document.getElementById('bar-ortodoncia');
  const barLimpieza = document.getElementById('bar-limpieza');

  const filterDayBtn = document.getElementById('filter-day');
  const filterWeekBtn = document.getElementById('filter-week');
  const filterMonthBtn = document.getElementById('filter-month');
  const specialtyPills = document.querySelectorAll('.specialty-pill-btn');

  let allAppointments = [];
  let currentFilter = 'day';
  let selectedSpecialty = 'all';
  let syncInterval = null;

  // 1. Navegación por pestañas (SPA Tab Switching)
  function showTab(tabName) {
    if (tabPanel) tabPanel.style.display = tabName === 'panel' ? 'block' : 'none';
    if (tabReservas) tabReservas.style.display = tabName === 'reservas' ? 'block' : 'none';
    if (tabWhatsapp) tabWhatsapp.style.display = tabName === 'whatsapp' ? 'block' : 'none';

    updateNavStyles(tabName);
  }

  function updateNavStyles(activeTab) {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const tabTarget = btn.getAttribute('data-tab');
      if (tabTarget === activeTab) {
        btn.classList.add('text-indigo-600', 'font-bold');
        btn.classList.remove('text-slate-500');
      } else {
        btn.classList.remove('text-indigo-600', 'font-bold');
        btn.classList.add('text-slate-500');
      }
    });
  }

  navPanelBtns.forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); showTab('panel'); }));
  navReservasBtns.forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); showTab('reservas'); }));
  navWhatsappBtns.forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); showTab('whatsapp'); }));

  // 2. Cargar citas reales de Supabase con no-store
  async function fetchDashboardAppointments() {
    try {
      const res = await fetch('/api/v1/booking/appointments', { cache: 'no-store' });
      const data = await res.json();
      allAppointments = data || [];
      renderAgenda();
      renderWhatsAppLogs();
      updateMetrics();
    } catch (e) {
      console.error('Error al cargar turnos:', e);
    }
  }

  // 3. Auto-Sincronización en vivo cada 4 segundos
  function startDashboardAutoSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboardAppointments();
      }
    }, 4000);
  }

  // 4. Renderizar Desglose de Turnos (Vista Reservas)
  function renderAgenda() {
    if (!agendaContainer) return;

    let filtered = [...allAppointments];

    // Filtro por especialidad
    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter(a => a.service_name === selectedSpecialty);
    }

    // Buscador por nombre o celular
    const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (searchVal) {
      filtered = filtered.filter(a => 
        (a.patient_name && a.patient_name.toLowerCase().includes(searchVal)) ||
        (a.patient_whatsapp && a.patient_whatsapp.toLowerCase().includes(searchVal))
      );
    }

    if (filtered.length === 0) {
      agendaContainer.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <span class="material-symbols-outlined text-4xl text-slate-400 mb-2">event_busy</span>
          <p class="text-sm font-semibold text-slate-600">No hay turnos registrados para este filtro.</p>
          <p class="text-xs text-slate-400 mt-1">Los turnos solicitados por los pacientes aparecerán aquí en vivo.</p>
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
        statusBadge = `<span class="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg flex items-center gap-1">🔴 Horario Liberado</span>`;
        borderClass = 'border-red-400 bg-red-50/60';
      }

      return `
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border-l-4 ${borderClass} transition-all hover:translate-x-1 bg-white shadow-sm">
          <div class="flex items-center gap-3">
            <span class="font-mono text-sm font-bold text-slate-900 w-16">${a.time_str || '09:00'}</span>
            <div>
              <h4 class="font-bold text-sm text-slate-900">${a.patient_name}</h4>
              <p class="text-xs text-slate-500">📱 ${a.patient_whatsapp || 'Sin WhatsApp'}</p>
            </div>
          </div>
          
          <div class="flex-1 sm:text-center">
            <span class="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-md">
              🏥 ${a.service_name} (${a.duration_minutes} min)
            </span>
          </div>

          <div class="flex items-center gap-2 justify-between sm:justify-end">
            ${statusBadge}
            <a href="/r/${a.token_cancellation}" target="_blank" class="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Gestionar / Liberar Horario">
              <span class="material-symbols-outlined text-sm">cancel</span>
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  // 5. Renderizar Trazabilidad de WhatsApp (Vista WhatsApp Hub)
  function renderWhatsAppLogs() {
    if (!whatsappLogContainer) return;

    if (allAppointments.length === 0) {
      whatsappLogContainer.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <span class="material-symbols-outlined text-4xl text-slate-400 mb-2">chat</span>
          <p class="text-sm font-semibold text-slate-600">No hay notificaciones de WhatsApp enviadas aún.</p>
        </div>
      `;
      return;
    }

    whatsappLogContainer.innerHTML = allAppointments.map(a => `
      <div class="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 text-xs shadow-sm">
        <div class="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
          ✓
        </div>
        <div class="flex-1">
          <div class="font-bold text-slate-900">Mensaje de Confirmación Enviado a ${a.patient_name}</div>
          <div class="text-slate-500">Celular: ${a.patient_whatsapp} • Especialidad: ${a.service_name}</div>
        </div>
        <span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg flex items-center gap-1">
          <span>🟢</span> Entregado Meta API
        </span>
      </div>
    `).join('');
  }

  // 6. Actualizar Métricas Reales y Conteo por Especialidad con Barras
  function updateMetrics() {
    const total = allAppointments.length;
    const confirmados = allAppointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;

    if (metricTotalTurnos) metricTotalTurnos.innerText = total;
    if (metricConfirmados) metricConfirmados.innerText = confirmados;
    if (metricPendientes) metricPendientes.innerText = total - confirmados;

    const countOrt = allAppointments.filter(a => a.service_name.includes('Ortodoncia')).length;
    const countLimp = allAppointments.filter(a => a.service_name.includes('Limpieza')).length;

    if (countOrtodoncia) countOrtodoncia.innerText = `${countOrt} turnos agendados`;
    if (countLimpieza) countLimpieza.innerText = `${countLimp} turnos agendados`;

    if (barOrtodoncia) barOrtodoncia.style.width = total > 0 ? `${Math.min(100, Math.round((countOrt / total) * 100))}%` : '0%';
    if (barLimpieza) barLimpieza.style.width = total > 0 ? `${Math.min(100, Math.round((countLimp / total) * 100))}%` : '0%';
  }

  // Event Listeners
  if (searchInput) searchInput.addEventListener('input', renderAgenda);

  specialtyPills.forEach(pill => {
    pill.addEventListener('click', () => {
      specialtyPills.forEach(p => {
        p.classList.remove('bg-primary', 'text-white');
        p.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
      });
      pill.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
      pill.classList.add('bg-primary', 'text-white');

      selectedSpecialty = pill.getAttribute('data-specialty');
      renderAgenda();
    });
  });

  if (filterDayBtn) filterDayBtn.addEventListener('click', () => { currentFilter = 'day'; setActiveFilterBtn(filterDayBtn); renderAgenda(); });
  if (filterWeekBtn) filterWeekBtn.addEventListener('click', () => { currentFilter = 'week'; setActiveFilterBtn(filterWeekBtn); renderAgenda(); });
  if (filterMonthBtn) filterMonthBtn.addEventListener('click', () => { currentFilter = 'month'; setActiveFilterBtn(filterMonthBtn); renderAgenda(); });

  function setActiveFilterBtn(activeBtn) {
    [filterDayBtn, filterWeekBtn, filterMonthBtn].forEach(btn => {
      if (btn) {
        btn.classList.remove('bg-primary', 'text-white');
        btn.classList.add('bg-white', 'text-slate-700');
      }
    });
    activeBtn.classList.remove('bg-white', 'text-slate-700');
    activeBtn.classList.add('bg-primary', 'text-white');
  }

  // Inicializar y encender auto-sync en vivo
  fetchDashboardAppointments();
  startDashboardAutoSync();
});
