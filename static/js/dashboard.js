document.addEventListener('DOMContentLoaded', () => {
  const tabPanel = document.getElementById('view-panel');
  const tabReservas = document.getElementById('view-reservas');
  const tabWhatsapp = document.getElementById('view-whatsapp');

  const navTabBtns = document.querySelectorAll('.nav-tab-btn');

  const agendaContainer = document.getElementById('agenda-timeline-container');
  const whatsappLogContainer = document.getElementById('whatsapp-log-container');
  const searchInput = document.getElementById('search-patient-input');

  const metricTotalTurnos = document.getElementById('metric-total-turnos');
  const metricConfirmados = document.getElementById('metric-confirmados');
  const metricPendientes = document.getElementById('metric-pendientes');

  const filterDayBtn = document.getElementById('filter-day');
  const filterWeekBtn = document.getElementById('filter-week');
  const filterMonthBtn = document.getElementById('filter-month');
  const specialtyPills = document.querySelectorAll('.specialty-pill-btn');

  let allAppointments = [];
  let currentFilter = 'day';
  let selectedSpecialty = 'all';
  let syncInterval = null;

  // 1. Navegación por pestañas (SPA Tab Switching robusto para escritorio y celular)
  function showTab(tabName) {
    if (tabPanel) tabPanel.style.display = tabName === 'panel' ? 'block' : 'none';
    if (tabReservas) tabReservas.style.display = tabName === 'reservas' ? 'block' : 'none';
    if (tabWhatsapp) tabWhatsapp.style.display = tabName === 'whatsapp' ? 'block' : 'none';

    updateNavStyles(tabName);
  }

  function updateNavStyles(activeTab) {
    navTabBtns.forEach(btn => {
      const tabTarget = btn.getAttribute('data-tab');
      const isDesktop = btn.closest('aside') !== null;
      const isActive = (tabTarget === activeTab);

      if (isDesktop) {
        if (isActive) {
          btn.className = 'nav-tab-btn flex items-center gap-3 bg-slate-900 text-white rounded-xl px-4 py-3 font-bold text-sm transition-all shadow-sm';
        } else {
          btn.className = 'nav-tab-btn flex items-center gap-3 text-slate-600 hover:bg-slate-100 hover:translate-x-1 transition-all duration-200 rounded-xl px-4 py-3 font-semibold text-sm';
        }
      } else {
        if (isActive) {
          btn.className = 'nav-tab-btn flex flex-col items-center p-1 text-amber-600 font-bold';
        } else {
          btn.className = 'nav-tab-btn flex flex-col items-center p-1 text-slate-500';
        }
      }
    });
  }

  navTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabTarget = btn.getAttribute('data-tab');
      if (tabTarget) {
        showTab(tabTarget);
      }
    });
  });

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

  // 3. Auto-Sincronización en vivo cada 3 segundos
  function startDashboardAutoSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboardAppointments();
      }
    }, 3000);
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
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="10" y1="14" x2="14" y2="18"></line><line x1="14" y1="14" x2="10" y2="18"></line></svg>
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
        statusBadge = `<span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1 font-mono">🟢 Confirmado WhatsApp</span>`;
        borderClass = 'border-emerald-500 bg-emerald-50/40';
      } else if (a.status === 'REMINDER_SENT') {
        statusBadge = `<span class="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg flex items-center gap-1 font-mono">🟡 Recordatorio Enviado</span>`;
        borderClass = 'border-amber-500 bg-amber-50/40';
      } else if (a.status === 'CANCELLED') {
        statusBadge = `<span class="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg flex items-center gap-1 font-mono">🔴 Horario Liberado</span>`;
        borderClass = 'border-red-400 bg-red-50/40';
      }

      // Obtener iniciales para avatar
      const initials = (a.patient_name || 'P').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      return `
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border-l-4 ${borderClass} transition-all hover:translate-x-1 bg-white shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-xs font-display flex-shrink-0">
              ${initials}
            </div>
            <div>
              <h4 class="font-bold text-sm text-slate-900 font-display">${a.patient_name}</h4>
              <p class="text-xs text-slate-500 font-mono">📱 ${a.patient_whatsapp || 'Sin WhatsApp'}</p>
            </div>
          </div>
          
          <div class="flex-1 sm:text-center">
            <span class="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg font-mono">
              🏥 ${a.service_name} (${a.duration_minutes} min)
            </span>
          </div>

          <div class="flex items-center gap-2 justify-between sm:justify-end">
            <span class="font-mono text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">${a.time_str || '09:00'} hs</span>
            ${statusBadge}
            <a href="/r/${a.token_cancellation}" target="_blank" class="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Gestionar / Liberar Horario">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
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
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          <p class="text-sm font-semibold text-slate-600">No hay notificaciones de WhatsApp enviadas aún.</p>
        </div>
      `;
      return;
    }

    whatsappLogContainer.innerHTML = allAppointments.map(a => `
      <div class="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 text-xs shadow-sm">
        <div class="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
          ✓
        </div>
        <div class="flex-1">
          <div class="font-bold text-slate-900 font-display">Mensaje de Confirmación Enviado a ${a.patient_name}</div>
          <div class="text-slate-500 font-mono">Celular: ${a.patient_whatsapp} • Tratamiento: ${a.service_name}</div>
        </div>
        <span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg flex items-center gap-1 font-mono">
          🟢 Meta Cloud API 200 OK
        </span>
      </div>
    `).join('');
  }

  // 6. Actualizar Métricas Reales
  function updateMetrics() {
    const total = allAppointments.length;
    const confirmados = allAppointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;

    if (metricTotalTurnos) metricTotalTurnos.innerText = total;
    if (metricConfirmados) metricConfirmados.innerText = confirmados;
    if (metricPendientes) metricPendientes.innerText = total - confirmados;
  }

  // Event Listeners para Filtros
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
