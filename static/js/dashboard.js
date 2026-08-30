document.addEventListener('DOMContentLoaded', () => {
  // 1. Elementos DOM de Pestañas
  const tabPanel = document.getElementById('view-panel');
  const tabReservas = document.getElementById('view-reservas');
  const tabReprogramados = document.getElementById('view-reprogramados');

  const navTabBtns = document.querySelectorAll('.nav-tab-btn');

  // Elementos de Reservas y Agenda
  const reservasNormalView = document.getElementById('reservas-normal-view');
  const reservasAgendaView = document.getElementById('reservas-agenda-view');
  const agendaContainer = document.getElementById('agenda-timeline-container');
  const agendaSlotsSheet = document.getElementById('agenda-slots-sheet');
  const agendaDayPillsContainer = document.getElementById('agenda-day-pills-container');
  const agendaCurrentDayTitle = document.getElementById('agenda-current-day-title');
  const agendaCurrentDayStats = document.getElementById('agenda-current-day-stats');

  // Filtros de Disponibilidad en Agenda
  const btnFilterAll = document.getElementById('btn-filter-all');
  const btnFilterFree = document.getElementById('btn-filter-free');
  const btnFilterOccupied = document.getElementById('btn-filter-occupied');

  const reprogramadosListContainer = document.getElementById('reprogramados-list-container');
  const reprogramadosCounterBadge = document.getElementById('reprogramados-counter-badge');
  const badgeCountReprogramados = document.getElementById('badge-count-reprogramados');
  const mobileBadgeReprogramados = document.getElementById('mobile-badge-reprogramados');

  const searchInput = document.getElementById('search-patient-input');

  // Elementos de Turnos de Hoy (Panel General)
  const todaySummarySubtitle = document.getElementById('today-summary-subtitle');
  const todaySpecialtyPills = document.getElementById('today-specialty-pills');
  const todayAppointmentsTbody = document.getElementById('today-appointments-tbody');

  // KPIs y Selector de Período
  const btnPeriodWeek = document.getElementById('btn-period-week');
  const btnPeriodMonth = document.getElementById('btn-period-month');
  const metricTotalTurnos = document.getElementById('metric-total-turnos');
  const metricCanceladosCount = document.getElementById('metric-cancelados-count');
  const metricReprogramadosCount = document.getElementById('metric-reprogramados-count');
  const metricOcupacion = document.getElementById('metric-ocupacion');
  const liveStatusText = document.getElementById('live-status-text');

  // Botones de Modo de Vista
  const btnViewCards = document.getElementById('btn-view-cards');
  const btnViewTable = document.getElementById('btn-view-table');
  const btnViewAgenda = document.getElementById('btn-view-agenda');

  const btnCopyCardLink = document.getElementById('btn-copy-card-link');
  const btnManualSync = document.getElementById('btn-manual-sync');
  const syncIcon = document.getElementById('sync-icon');
  const toastContainer = document.getElementById('toast-container');

  // Estado Local
  let allAppointments = [];
  let currentMetricsPeriod = 'week'; // 'week' (7 días corridos) | 'month' (30 días corridos)
  let currentViewMode = 'agenda'; // 'agenda' | 'cards' | 'table'
  let selectedTodaySpecialty = 'all';
  let selectedAvailabilityFilter = 'all'; // 'all' | 'free' | 'occupied'
  let syncInterval = null;
  let selectedAgendaDate = new Date();

  const defaultSlotsTimes = [
    "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30"
  ];

  const daysShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthsFull = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  function formatLocalDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. Toast System Minimalista
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl bg-slate-900 text-white text-xs font-semibold font-sans transition-all transform translate-y-2 opacity-0';
    toast.innerHTML = `<span>✓</span><span>${message}</span>`;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }

  // 3. Copiar Link del Consultorio
  function copyPatientLink() {
    const url = window.location.origin + '/';
    navigator.clipboard.writeText(url).then(() => {
      showToast('Enlace de reservas copiado al portapapeles');
    }).catch(() => {
      showToast('Enlace: ' + url);
    });
  }

  if (btnCopyCardLink) btnCopyCardLink.addEventListener('click', copyPatientLink);

  // 4. Navegación por Pestañas (SPA Tab Switching)
  function showTab(tabName) {
    if (tabPanel) tabPanel.style.display = tabName === 'panel' ? 'block' : 'none';
    if (tabReservas) tabReservas.style.display = tabName === 'reservas' ? 'block' : 'none';
    if (tabReprogramados) tabReprogramados.style.display = tabName === 'reprogramados' ? 'block' : 'none';

    updateNavStyles(tabName);

    if (tabName === 'panel') {
      renderTodayAppointments();
      updateMetrics();
    } else if (tabName === 'reservas') {
      renderAgenda();
    } else if (tabName === 'reprogramados') {
      renderReprogramados();
    }
  }

  function updateNavStyles(activeTab) {
    navTabBtns.forEach(btn => {
      const tabTarget = btn.getAttribute('data-tab');
      const isDesktop = btn.closest('aside') !== null;
      const isActive = (tabTarget === activeTab);

      if (isDesktop) {
        if (isActive) {
          btn.className = 'nav-tab-btn w-full flex items-center justify-between bg-navy text-white rounded-xl px-3.5 py-2.5 font-semibold text-xs transition-all shadow-xs';
        } else {
          btn.className = 'nav-tab-btn w-full flex items-center justify-between text-slate-600 hover:bg-slate-100 hover:text-navy transition-all rounded-xl px-3.5 py-2.5 font-semibold text-xs';
        }
      } else {
        if (isActive) {
          btn.className = 'nav-tab-btn flex flex-col items-center p-1 text-navy font-bold';
        } else {
          btn.className = 'nav-tab-btn flex flex-col items-center p-1 text-slate-500 font-medium';
        }
      }
    });
  }

  navTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabTarget = btn.getAttribute('data-tab');
      if (tabTarget) showTab(tabTarget);
    });
  });

  // 5. Cargar Citas de Supabase
  async function fetchDashboardAppointments() {
    if (syncIcon) syncIcon.classList.add('animate-spin');
    try {
      const res = await fetch('/api/v1/booking/appointments?tenant_id=demo-tenant-citaly-001', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        allAppointments = data || [];
        renderTodayAppointments();
        renderAgenda();
        renderReprogramados();
        updateMetrics();
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (liveStatusText) liveStatusText.innerText = `Actualizado ${timeStr}`;
      }
    } catch (e) {
      console.error('Error al sincronizar citas:', e);
    } finally {
      if (syncIcon) setTimeout(() => syncIcon.classList.remove('animate-spin'), 300);
    }
  }

  if (btnManualSync) {
    btnManualSync.addEventListener('click', () => {
      fetchDashboardAppointments();
      showToast('Datos sincronizados en vivo');
    });
  }

  // 6. Auto-Sincronización en vivo cada 5 segundos
  function startDashboardAutoSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboardAppointments();
      }
    }, 5000);
  }

  // 7. Renderizar Turnos del Día (Panel General) por Especialidad
  function renderTodayAppointments() {
    if (!todayAppointmentsTbody) return;

    const today = new Date();
    const todayIso = formatLocalDate(today);
    const dayOfWeekName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][today.getDay()];
    const dayNumber = today.getDate();
    const monthName = monthsFull[today.getMonth()];

    const todayAppts = allAppointments.filter(a => {
      if (!a.start_time) return false;
      return a.start_time.startsWith(todayIso);
    });

    if (todaySummarySubtitle) {
      const activeCount = todayAppts.filter(a => a.status !== 'CANCELLED').length;
      todaySummarySubtitle.innerText = `${dayOfWeekName} ${dayNumber} de ${monthName} • ${activeCount} ${activeCount === 1 ? 'turno agendado' : 'turnos agendados'}`;
    }

    // Renderizar Píldoras de Especialidad Rápidas de Hoy
    if (todaySpecialtyPills) {
      const specialties = ['all'];
      todayAppts.forEach(a => {
        if (a.service_name && !specialties.includes(a.service_name)) {
          specialties.push(a.service_name);
        }
      });

      todaySpecialtyPills.innerHTML = specialties.map(s => {
        const isSelected = (selectedTodaySpecialty === s);
        const label = s === 'all' ? 'Ver Todos' : s;
        const btnClass = isSelected
          ? 'bg-navy text-white shadow-xs font-bold'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium';
        return `
          <button data-today-spec="${s}" class="today-spec-btn px-2.5 py-1 rounded-lg text-[11px] font-sans whitespace-nowrap transition-all ${btnClass}">
            ${label}
          </button>
        `;
      }).join('');

      todaySpecialtyPills.querySelectorAll('.today-spec-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedTodaySpecialty = btn.getAttribute('data-today-spec');
          renderTodayAppointments();
        });
      });
    }

    let filtered = [...todayAppts];
    if (selectedTodaySpecialty !== 'all') {
      filtered = filtered.filter(a => a.service_name === selectedTodaySpecialty);
    }

    if (filtered.length === 0) {
      todayAppointmentsTbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-slate-400 text-xs font-sans">
            No hay turnos agendados para el día de hoy${selectedTodaySpecialty !== 'all' ? ' en esta especialidad' : ''}.
          </td>
        </tr>
      `;
      return;
    }

    // Ordenar por horario ascendente
    filtered.sort((a, b) => (a.time_str || '').localeCompare(b.time_str || ''));

    todayAppointmentsTbody.innerHTML = filtered.map(a => {
      const isCancelled = a.status === 'CANCELLED';
      const statusBadge = isCancelled
        ? `<span class="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold font-mono rounded-md">Cancelado</span>`
        : `<span class="px-2 py-0.5 bg-slate-100 text-slate-900 text-[10px] font-semibold font-mono rounded-md">● Agendado</span>`;

      return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="py-2.5 px-3 font-mono font-bold text-navy whitespace-nowrap">${a.time_str || '09:00'} hs</td>
          <td class="py-2.5 px-3 font-semibold text-navy">
            <div class="font-display">${a.patient_name}</div>
            <div class="text-[11px] text-slate-400 font-mono">${a.patient_whatsapp || 'Sin celular'}</div>
          </td>
          <td class="py-2.5 px-3 text-slate-700 font-medium">
            <span>${a.service_name}</span>
            <span class="text-[10px] text-slate-400 font-mono block">${a.duration_minutes || 30} min</span>
          </td>
          <td class="py-2.5 px-3 whitespace-nowrap">
            ${statusBadge}
          </td>
        </tr>
      `;
    }).join('');
  }

  // 8. Renderizar Agenda Diaria y Semanal
  function renderAgenda() {
    if (!reservasNormalView || !reservasAgendaView) return;

    if (currentViewMode === 'agenda') {
      reservasNormalView.style.display = 'none';
      reservasAgendaView.style.display = 'block';
      renderWeeklyAgenda();
      return;
    }

    reservasNormalView.style.display = 'block';
    reservasAgendaView.style.display = 'none';

    let filtered = [...allAppointments];
    const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (searchVal) {
      filtered = filtered.filter(a => 
        (a.patient_name && a.patient_name.toLowerCase().includes(searchVal)) ||
        (a.patient_whatsapp && a.patient_whatsapp.toLowerCase().includes(searchVal))
      );
    }

    if (filtered.length === 0) {
      agendaContainer.innerHTML = `
        <div class="p-6 text-center bg-slate-50 rounded-xl border border-slate-200">
          <p class="text-xs text-slate-500">No hay turnos registrados con este criterio.</p>
        </div>
      `;
      return;
    }

    // Modo Vista Tabla
    if (currentViewMode === 'table') {
      agendaContainer.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-200 text-slate-400 font-mono text-[11px] uppercase">
                <th class="py-2.5 px-3">Paciente</th>
                <th class="py-2.5 px-3">Tratamiento</th>
                <th class="py-2.5 px-3">Fecha y Hora</th>
                <th class="py-2.5 px-3">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${filtered.map(a => `
                <tr class="hover:bg-slate-50">
                  <td class="py-2.5 px-3 font-semibold text-navy">
                    <div>${a.patient_name}</div>
                    <div class="text-[11px] text-slate-400 font-mono">${a.patient_whatsapp || 'Sin celular'}</div>
                  </td>
                  <td class="py-2.5 px-3 text-slate-700 font-medium">${a.service_name}</td>
                  <td class="py-2.5 px-3 font-mono font-semibold text-navy">${a.date_formatted} • ${a.time_str} hs</td>
                  <td class="py-2.5 px-3">
                    <span class="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold font-mono rounded-md">
                      ${a.status === 'CANCELLED' ? 'Cancelado' : 'Confirmado'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    // Modo Vista Tarjetas
    agendaContainer.innerHTML = filtered.map(a => `
      <div class="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
        <div>
          <div class="font-bold text-navy text-xs font-display">${a.patient_name}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">${a.service_name} (${a.duration_minutes || 30} min) • ${a.patient_whatsapp || ''}</div>
        </div>
        <div class="text-right font-mono">
          <div class="text-xs font-bold text-navy">${a.date_formatted} • ${a.time_str} hs</div>
          <span class="text-[10px] text-slate-400 font-medium">${a.status === 'CANCELLED' ? 'Cancelado' : 'Confirmado'}</span>
        </div>
      </div>
    `).join('');
  }

  // 9. Renderizar Grilla Diaria con Filtros de Disponibilidad
  function renderWeeklyAgenda() {
    if (!agendaDayPillsContainer || !agendaSlotsSheet) return;

    const today = new Date();
    const daysToRender = [];
    
    let temp = new Date(today);
    for (let i = 0; i < 6; i++) {
      daysToRender.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }

    const selectedIso = formatLocalDate(selectedAgendaDate);

    // Renderizar Selector de Días
    agendaDayPillsContainer.innerHTML = daysToRender.map(d => {
      const dIso = formatLocalDate(d);
      const isSelected = (dIso === selectedIso);
      const dayName = daysShort[d.getDay()];
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');

      const dayAppts = allAppointments.filter(a => {
        if (!a.start_time || a.status === 'CANCELLED') return false;
        return a.start_time.startsWith(dIso);
      });

      const count = dayAppts.length;
      const countLabel = count === 0 ? 'Libre' : `${count} ${count === 1 ? 'turno' : 'turnos'}`;

      return `
        <button data-day-iso="${dIso}" class="agenda-day-btn p-2.5 rounded-xl flex flex-col items-center justify-center text-center transition-all ${isSelected ? 'bg-navy text-white shadow-xs font-bold' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'}">
          <span class="text-[10px] font-bold uppercase font-mono ${isSelected ? 'text-amber-400' : 'text-slate-500'}">${dayName}</span>
          <span class="text-sm font-bold font-display my-0.5">${dayNum}/${monthNum}</span>
          <span class="text-[9px] font-semibold font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}">${countLabel}</span>
        </button>
      `;
    }).join('');

    agendaDayPillsContainer.querySelectorAll('.agenda-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const iso = btn.getAttribute('data-day-iso');
        const [y, m, d] = iso.split('-').map(Number);
        selectedAgendaDate = new Date(y, m - 1, d);
        renderWeeklyAgenda();
      });
    });

    // Encabezado del Día
    const dayOfWeekName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][selectedAgendaDate.getDay()];
    const dayNumber = selectedAgendaDate.getDate();
    const monthName = monthsFull[selectedAgendaDate.getMonth()];
    const yearNumber = selectedAgendaDate.getFullYear();

    if (agendaCurrentDayTitle) {
      agendaCurrentDayTitle.innerText = `${dayOfWeekName} ${dayNumber} de ${monthName} ${yearNumber}`;
    }

    const dayAppointments = allAppointments.filter(a => {
      if (!a.start_time || a.status === 'CANCELLED') return false;
      return a.start_time.startsWith(selectedIso);
    });

    const occupiedCount = dayAppointments.length;
    if (agendaCurrentDayStats) {
      agendaCurrentDayStats.innerText = `${occupiedCount} ${occupiedCount === 1 ? 'turno agendado' : 'turnos agendados'} de ${defaultSlotsTimes.length} horarios`;
    }

    // Filtrar Horarios según disponibilidad
    let visibleSlots = defaultSlotsTimes.map(timeSlot => {
      const appt = dayAppointments.find(a => a.time_str === timeSlot);
      return { timeSlot, appt };
    });

    if (selectedAvailabilityFilter === 'free') {
      visibleSlots = visibleSlots.filter(s => !s.appt);
    } else if (selectedAvailabilityFilter === 'occupied') {
      visibleSlots = visibleSlots.filter(s => !!s.appt);
    }

    if (visibleSlots.length === 0) {
      agendaSlotsSheet.innerHTML = `
        <div class="col-span-full p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
          <p class="text-xs text-slate-500 font-sans">
            No hay horarios ${selectedAvailabilityFilter === 'free' ? 'libres' : 'ocupados'} para este día.
          </p>
        </div>
      `;
      return;
    }

    // Grilla Horaria
    agendaSlotsSheet.innerHTML = visibleSlots.map(({ timeSlot, appt }) => {
      if (appt) {
        const cleanPhone = (appt.patient_whatsapp || '').replace(/\D/g, '');
        return `
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 overflow-hidden">
              <span class="px-2.5 py-1 bg-navy text-white text-xs font-bold font-mono rounded-lg flex-shrink-0">
                ${timeSlot} hs
              </span>
              <div class="overflow-hidden">
                <div class="text-xs font-bold text-navy font-display truncate">${appt.patient_name}</div>
                <div class="text-[11px] text-slate-500 font-sans truncate">${appt.service_name} ${cleanPhone ? `• ${appt.patient_whatsapp}` : ''}</div>
              </div>
            </div>
            <span class="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-semibold font-mono rounded-md flex-shrink-0">
              Ocupado
            </span>
          </div>
        `;
      } else {
        return `
          <div class="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold font-mono rounded-lg flex-shrink-0">
                ${timeSlot} hs
              </span>
              <span class="text-xs font-medium text-slate-400 font-sans">Disponible</span>
            </div>
            <span class="text-[11px] font-semibold text-slate-400 font-mono">Libre</span>
          </div>
        `;
      }
    }).join('');
  }

  // Listeners de Filtros de Disponibilidad
  function setAvailabilityFilter(filter) {
    selectedAvailabilityFilter = filter;
    [btnFilterAll, btnFilterFree, btnFilterOccupied].forEach(b => {
      if (b) {
        b.className = 'px-2.5 py-1 text-slate-600 hover:bg-slate-200 rounded-lg transition-all font-semibold font-mono text-xs';
      }
    });

    if (filter === 'all' && btnFilterAll) {
      btnFilterAll.className = 'px-2.5 py-1 bg-navy text-white rounded-lg transition-all shadow-xs font-bold font-mono text-xs';
    } else if (filter === 'free' && btnFilterFree) {
      btnFilterFree.className = 'px-2.5 py-1 bg-navy text-white rounded-lg transition-all shadow-xs font-bold font-mono text-xs';
    } else if (filter === 'occupied' && btnFilterOccupied) {
      btnFilterOccupied.className = 'px-2.5 py-1 bg-navy text-white rounded-lg transition-all shadow-xs font-bold font-mono text-xs';
    }

    renderWeeklyAgenda();
  }

  if (btnFilterAll) btnFilterAll.addEventListener('click', () => setAvailabilityFilter('all'));
  if (btnFilterFree) btnFilterFree.addEventListener('click', () => setAvailabilityFilter('free'));
  if (btnFilterOccupied) btnFilterOccupied.addEventListener('click', () => setAvailabilityFilter('occupied'));

  // 10. Renderizar Turnos Reprogramados
  function renderReprogramados() {
    if (!reprogramadosListContainer) return;

    const reprogramados = allAppointments.filter(a => {
      return a.was_rescheduled && !a.is_past && a.status !== 'CANCELLED';
    });

    const count = reprogramados.length;
    if (reprogramadosCounterBadge) {
      reprogramadosCounterBadge.innerText = `${count} ${count === 1 ? 'Activo' : 'Activos'}`;
    }

    if (badgeCountReprogramados) {
      badgeCountReprogramados.innerText = count;
      badgeCountReprogramados.style.display = count > 0 ? 'inline-block' : 'none';
    }

    if (mobileBadgeReprogramados) {
      if (count > 0) {
        mobileBadgeReprogramados.innerText = count;
        mobileBadgeReprogramados.style.display = 'flex';
      } else {
        mobileBadgeReprogramados.style.display = 'none';
      }
    }

    if (reprogramados.length === 0) {
      reprogramadosListContainer.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
          <p class="text-xs font-semibold text-slate-600">No hay turnos reprogramados activos en este momento.</p>
          <p class="text-[11px] text-slate-400 mt-1">Los turnos modificados por los pacientes aparecerán aquí.</p>
        </div>
      `;
      return;
    }

    reprogramadosListContainer.innerHTML = reprogramados.map(a => {
      const cleanPhone = (a.patient_whatsapp || '').replace(/\D/g, '');
      return `
        <div class="p-4 bg-white rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-navy text-sm font-display">${a.patient_name}</h4>
              <span class="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold font-mono rounded-full">Reprogramado</span>
            </div>
            <div class="text-xs text-slate-500 font-sans mt-0.5">
              Tratamiento: <span class="font-medium text-slate-800">${a.service_name}</span> (${a.duration_minutes || 30} min)
            </div>
            ${cleanPhone ? `
              <div class="text-xs text-slate-600 font-mono mt-1 flex items-center gap-2">
                <span>📱 ${a.patient_whatsapp}</span>
                <a href="https://wa.me/${cleanPhone}" target="_blank" class="text-emerald-700 hover:underline font-semibold font-sans">Abrir WhatsApp ↗</a>
              </div>
            ` : ''}
          </div>
          <div class="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-left md:text-right flex-shrink-0">
            <span class="text-[10px] font-semibold text-slate-400 uppercase font-mono block">Nueva Fecha y Hora</span>
            <span class="text-xs font-bold text-navy font-mono">📅 ${a.date_formatted} • ⏰ ${a.time_formatted}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 11. Actualizar Métricas Bento (7 días corridos / 30 días con Ocupación Real de Agenda)
  function updateMetrics() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let periodAppointments = [];
    let totalSlotsCapacity = 108; // 6 días de atención * 18 slots = 108 slots

    if (currentMetricsPeriod === 'week') {
      // 7 días corridos a partir de hoy (incluye días subsiguientes de la próxima semana)
      const endOfRollingWeek = new Date(now);
      endOfRollingWeek.setDate(now.getDate() + 6);
      endOfRollingWeek.setHours(23, 59, 59, 999);

      periodAppointments = allAppointments.filter(a => {
        if (!a.start_time) return false;
        const d = new Date(a.start_time);
        return d >= now && d <= endOfRollingWeek;
      });

      totalSlotsCapacity = 6 * defaultSlotsTimes.length; // 108 slots
    } else {
      // 30 días corridos a partir de hoy
      const endOfRollingMonth = new Date(now);
      endOfRollingMonth.setDate(now.getDate() + 29);
      endOfRollingMonth.setHours(23, 59, 59, 999);

      periodAppointments = allAppointments.filter(a => {
        if (!a.start_time) return false;
        const d = new Date(a.start_time);
        return d >= now && d <= endOfRollingMonth;
      });

      totalSlotsCapacity = 26 * defaultSlotsTimes.length; // ~468 slots hábiles
    }

    const total = periodAppointments.length;
    const cancelados = periodAppointments.filter(a => a.status === 'CANCELLED').length;
    const activos = periodAppointments.filter(a => a.status !== 'CANCELLED').length;
    
    // Reprogramados activos en el período
    const reprogramados = allAppointments.filter(a => {
      if (!a.was_rescheduled || a.status === 'CANCELLED' || a.is_past) return false;
      if (!a.start_time) return false;
      const d = new Date(a.start_time);
      if (currentMetricsPeriod === 'week') {
        const endOfRollingWeek = new Date(now);
        endOfRollingWeek.setDate(now.getDate() + 6);
        endOfRollingWeek.setHours(23, 59, 59, 999);
        return d >= now && d <= endOfRollingWeek;
      } else {
        const endOfRollingMonth = new Date(now);
        endOfRollingMonth.setDate(now.getDate() + 29);
        endOfRollingMonth.setHours(23, 59, 59, 999);
        return d >= now && d <= endOfRollingMonth;
      }
    }).length;

    if (metricTotalTurnos) metricTotalTurnos.innerText = total;
    if (metricCanceladosCount) metricCanceladosCount.innerText = cancelados;
    if (metricReprogramadosCount) metricReprogramadosCount.innerText = reprogramados;
    
    // Ocupación Real del Consultorio (Opción A): (Turnos Activos / Capacidad Total de Slots) * 100
    if (metricOcupacion) {
      const rate = totalSlotsCapacity > 0 ? Math.round((activos / totalSlotsCapacity) * 100) : 0;
      metricOcupacion.innerText = `${rate}%`;
    }
  }

  // Listeners de Período (Semana / Mes)
  if (btnPeriodWeek && btnPeriodMonth) {
    btnPeriodWeek.addEventListener('click', () => {
      currentMetricsPeriod = 'week';
      btnPeriodWeek.className = 'px-3 py-1 bg-navy text-white rounded-lg transition-all shadow-xs';
      btnPeriodMonth.className = 'px-3 py-1 text-slate-700 hover:bg-slate-100 rounded-lg transition-all';
      updateMetrics();
    });

    btnPeriodMonth.addEventListener('click', () => {
      currentMetricsPeriod = 'month';
      btnPeriodMonth.className = 'px-3 py-1 bg-navy text-white rounded-lg transition-all shadow-xs';
      btnPeriodWeek.className = 'px-3 py-1 text-slate-700 hover:bg-slate-100 rounded-lg transition-all';
      updateMetrics();
    });
  }

  // 12. Listeners de Modo de Vista
  function setViewMode(mode) {
    currentViewMode = mode;

    [btnViewCards, btnViewTable, btnViewAgenda].forEach(b => {
      if (b) {
        b.className = 'px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-all font-semibold';
      }
    });

    if (mode === 'cards' && btnViewCards) {
      btnViewCards.className = 'px-3 py-1.5 bg-navy text-white rounded-lg transition-all shadow-xs font-bold';
    } else if (mode === 'table' && btnViewTable) {
      btnViewTable.className = 'px-3 py-1.5 bg-navy text-white rounded-lg transition-all shadow-xs font-bold';
    } else if (mode === 'agenda' && btnViewAgenda) {
      btnViewAgenda.className = 'px-3 py-1.5 bg-navy text-white rounded-lg transition-all shadow-xs font-bold';
    }

    renderAgenda();
  }

  if (btnViewCards) btnViewCards.addEventListener('click', () => setViewMode('cards'));
  if (btnViewTable) btnViewTable.addEventListener('click', () => setViewMode('table'));
  if (btnViewAgenda) btnViewAgenda.addEventListener('click', () => setViewMode('agenda'));

  if (searchInput) searchInput.addEventListener('input', renderAgenda);

  // Inicializar
  setViewMode('agenda');
  setAvailabilityFilter('all');
  fetchDashboardAppointments();
  startDashboardAutoSync();
});
