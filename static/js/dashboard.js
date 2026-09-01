document.addEventListener('DOMContentLoaded', () => {
  // 1. Elementos DOM de Pestañas
  const tabPanel = document.getElementById('view-panel');
  const tabReservas = document.getElementById('view-reservas');
  const tabReprogramados = document.getElementById('view-reprogramados');
  const tabNuevoTurno = document.getElementById('view-nuevo-turno');

  const desktopTabBtns = document.querySelectorAll('.desktop-tab-btn');
  const mobileTabBtns = document.querySelectorAll('.mobile-tab-btn');

  // Elementos de Reservas y Agenda
  const reservasNormalView = document.getElementById('reservas-normal-view');
  const reservasAgendaView = document.getElementById('reservas-agenda-view');
  const agendaContainer = document.getElementById('agenda-timeline-container');
  const agendaSlotsSheet = document.getElementById('agenda-slots-sheet');
  const agendaDayPillsContainer = document.getElementById('agenda-day-pills-container');
  const agendaCurrentDayTitle = document.getElementById('agenda-current-day-title');
  const agendaCurrentDayStats = document.getElementById('agenda-current-day-stats');

  // Controles de Navegación de Mes/Semanas en Agenda
  const btnPrevWeek = document.getElementById('btn-prev-week');
  const btnNextWeek = document.getElementById('btn-next-week');
  const agendaWeekLabel = document.getElementById('agenda-week-label');

  // Buscador de Agenda
  const agendaSearchInput = document.getElementById('agenda-search-input');

  // Filtros de Disponibilidad en Agenda
  const btnFilterAll = document.getElementById('btn-filter-all');
  const btnFilterFree = document.getElementById('btn-filter-free');
  const btnFilterOccupied = document.getElementById('btn-filter-occupied');

  const reprogramadosListContainer = document.getElementById('reprogramados-list-container');
  const reprogramadosCounterBadge = document.getElementById('reprogramados-counter-badge');
  const badgeCountReprogramados = document.getElementById('badge-count-reprogramados');
  const mobileBadgeReprogramados = document.getElementById('mobile-badge-reprogramados');

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

  // Elementos del Módulo Asignar Nuevo Turno
  const nuevoTurnoServicesGrid = document.getElementById('nuevo-turno-services-grid');
  const btnAdminPrevWeek = document.getElementById('btn-admin-prev-week');
  const btnAdminNextWeek = document.getElementById('btn-admin-next-week');
  const adminBookingWeekLabel = document.getElementById('admin-booking-week-label');
  const adminBookingDaysContainer = document.getElementById('admin-booking-days-container');
  const adminBookingSelectedDayTitle = document.getElementById('admin-booking-selected-day-title');
  const adminBookingFreeCountBadge = document.getElementById('admin-booking-free-count-badge');
  const adminBookingSlotsGrid = document.getElementById('admin-booking-slots-grid');
  const adminPatientName = document.getElementById('admin-patient-name');
  const adminPatientPhone = document.getElementById('admin-patient-phone');
  const adminPatientSuggestions = document.getElementById('admin-patient-suggestions');
  const summaryServiceName = document.getElementById('summary-service-name');
  const summaryBookingDate = document.getElementById('summary-booking-date');
  const summaryBookingTime = document.getElementById('summary-booking-time');
  const btnAdminSubmitBooking = document.getElementById('btn-admin-submit-booking');

  // Servicios Oficiales
  const dentalServices = [
    { id: "srv-ortodoncia", name: "Ortodoncia / Control", duration: 120, price: "$25.000", desc: "Alineación y controles" },
    { id: "srv-limpieza", name: "Limpieza & Blanqueamiento", duration: 45, price: "$18.000", desc: "Profilaxis y estética" },
    { id: "srv-endodoncia", name: "Endodoncia / Conducto", duration: 45, price: "$32.000", desc: "Tratamiento de conducto" },
    { id: "srv-implante", name: "Implante Dental & Cirugía", duration: 60, price: "$55.000", desc: "Cirugía especializada" },
    { id: "srv-extraccion", name: "Extracción Muela de Juicio", duration: 30, price: "$20.000", desc: "Extracciones simples y complejas" },
    { id: "srv-consulta", name: "Consulta & Diagnóstico", duration: 30, price: "$12.000", desc: "Evaluación integral" }
  ];

  // Estado Local
  let allAppointments = [];
  let currentMetricsPeriod = 'week';
  let currentViewMode = 'agenda';
  let selectedTodaySpecialty = 'all';
  let selectedAvailabilityFilter = 'all';
  let currentAgendaWeekOffset = 0;
  let syncInterval = null;

  // Estado del Módulo Asignar Turno
  let selectedAdminService = dentalServices[0];
  let selectedAdminDate = new Date();
  let selectedAdminSlot = "09:00";
  let adminWeekOffset = 0;

  // Fecha seleccionada para la Agenda (por defecto hoy)
  let selectedAgendaDate = new Date();

  const daysShort = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const monthsFull = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const defaultSlotsTimes = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
  ];

  function formatLocalDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Sistema de Notificaciones Toast
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-navy text-white' : (type === 'error' ? 'bg-rose-900 text-white' : 'bg-navy text-white');
    toast.className = `${bgClass} px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border border-slate-700 pointer-events-auto transition-all transform translate-y-2 opacity-0 font-sans`;
    toast.innerHTML = `
      <span class="w-2 h-2 rounded-full ${type === 'success' ? 'bg-emerald-400' : 'bg-amber-400'}"></span>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // 3. Switcher de Pestañas (Panel / Nuevo Turno / Agenda / Reprogramados)
  function switchTab(tabId) {
    [tabPanel, tabNuevoTurno, tabReservas, tabReprogramados].forEach(tab => {
      if (tab) tab.style.display = 'none';
    });

    // Actualizar botones de escritorio
    desktopTabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('bg-navy', 'text-white', 'font-bold', 'shadow-xs');
        btn.classList.remove('text-slate-600', 'hover:bg-slate-100', 'hover:text-navy');
      } else {
        btn.classList.remove('bg-navy', 'text-white', 'font-bold', 'shadow-xs');
        btn.classList.add('text-slate-600', 'hover:bg-slate-100', 'hover:text-navy');
      }
    });

    // Actualizar botones móviles
    mobileTabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('text-navy', 'font-bold', 'bg-slate-200/80');
        btn.classList.remove('text-slate-500', 'font-medium');
      } else {
        btn.classList.remove('text-navy', 'font-bold', 'bg-slate-200/80');
        btn.classList.add('text-slate-500', 'font-medium');
      }
    });

    if (tabId === 'panel' && tabPanel) {
      tabPanel.style.display = 'block';
      renderTodayAppointments();
      updateMetrics();
    } else if (tabId === 'nuevo-turno' && tabNuevoTurno) {
      tabNuevoTurno.style.display = 'block';
      renderAdminNuevoTurno();
    } else if (tabId === 'reservas' && tabReservas) {
      tabReservas.style.display = 'block';
      if (currentViewMode === 'agenda') {
        renderWeeklyAgenda();
      } else {
        renderTimeline();
      }
    } else if (tabId === 'reprogramados' && tabReprogramados) {
      tabReprogramados.style.display = 'block';
      renderReprogramados();
    }
  }

  [...desktopTabBtns, ...mobileTabBtns].forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // 4. Copiar Enlace de Reservas
  if (btnCopyCardLink) {
    btnCopyCardLink.addEventListener('click', async () => {
      const publicUrl = 'https://citaly-six.vercel.app/';
      try {
        await navigator.clipboard.writeText(publicUrl);
        showToast('Enlace de pacientes copiado al portapapeles', 'success');
      } catch (err) {
        const input = document.createElement('input');
        input.value = publicUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('Enlace de pacientes copiado al portapapeles', 'success');
      }
    });
  }

  // 5. Cargar Turnos desde la API Backend
  async function fetchDashboardAppointments() {
    try {
      if (syncIcon) syncIcon.classList.add('animate-spin');
      const res = await fetch('/api/v1/booking/appointments', { cache: 'no-store' });
      if (!res.ok) throw new Error('Error al consultar turnos');
      const data = await res.json();

      allAppointments = Array.isArray(data) ? data : (data.appointments || []);
      if (allAppointments) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (liveStatusText) {
          liveStatusText.innerText = `Actualizado ${timeStr}`;
        }

        updateMetrics();
        renderTodayAppointments();
        if (currentViewMode === 'agenda') {
          renderWeeklyAgenda();
        } else {
          renderTimeline();
        }
        renderReprogramados();
        if (tabNuevoTurno && tabNuevoTurno.style.display === 'block') {
          renderAdminNuevoTurno();
        }
      }
    } catch (err) {
      console.warn('[DASHBOARD] Error de sincronización:', err);
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

  // 7. Renderizar Turnos del Día (Panel General)
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

    if (todaySpecialtyPills) {
      const specialties = ['all', ...new Set(todayAppts.map(a => a.service_name).filter(Boolean))];
      
      todaySpecialtyPills.innerHTML = specialties.map(spec => {
        const isSelected = (selectedTodaySpecialty === spec);
        const label = (spec === 'all') ? 'Ver Todos' : spec;
        return `
          <button data-today-spec="${spec}" class="today-spec-btn px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${isSelected ? 'bg-navy text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
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

    filtered.sort((a, b) => (a.time_str || '').localeCompare(b.time_str || ''));

    todayAppointmentsTbody.innerHTML = filtered.map(a => {
      const isCancelled = a.status === 'CANCELLED';
      const statusBadge = isCancelled
        ? `<span class="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-semibold font-mono rounded-md">Cancelado</span>`
        : `<span class="px-2.5 py-1 bg-slate-100 text-slate-900 text-[10px] font-semibold font-mono rounded-md">● Agendado</span>`;

      return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="py-3.5 px-3 font-mono font-bold text-navy whitespace-nowrap">${a.time_str || '09:00'} hs</td>
          <td class="py-3.5 px-3 font-semibold text-navy">
            <div class="font-display">${a.patient_name}</div>
            <div class="text-[11px] text-slate-400 font-mono">${a.patient_whatsapp || 'Sin celular'}</div>
          </td>
          <td class="py-3.5 px-3 text-slate-700 font-medium">
            <span>${a.service_name}</span>
            <span class="text-[10px] text-slate-400 font-mono block">${a.duration_minutes || 30} min</span>
          </td>
          <td class="py-3.5 px-3 whitespace-nowrap">
            ${statusBadge}
          </td>
        </tr>
      `;
    }).join('');
  }

  // 8. Renderizar Vista Normal (Tarjetas y Tabla)
  function renderTimeline() {
    if (!agendaContainer) return;

    if (currentViewMode === 'agenda') {
      reservasNormalView.style.display = 'none';
      reservasAgendaView.style.display = 'block';
      renderWeeklyAgenda();
      return;
    }

    reservasNormalView.style.display = 'block';
    reservasAgendaView.style.display = 'none';

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let filtered = allAppointments.filter(a => {
      if (!a.start_time) return false;
      const d = new Date(a.start_time);
      return d >= sevenDaysAgo;
    });

    const searchVal = (agendaSearchInput ? agendaSearchInput.value : '').toLowerCase().trim();
    if (searchVal) {
      filtered = filtered.filter(a => 
        (a.patient_name && a.patient_name.toLowerCase().includes(searchVal)) ||
        (a.patient_whatsapp && a.patient_whatsapp.toLowerCase().includes(searchVal))
      );
    }

    if (filtered.length === 0) {
      agendaContainer.innerHTML = `
        <div class="p-6 text-center bg-slate-50 rounded-xl border border-slate-200">
          <p class="text-xs text-slate-500">No hay turnos registrados con este criterio de búsqueda.</p>
        </div>
      `;
      return;
    }

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
                  <td class="py-3 px-3 font-semibold text-navy">
                    <div class="font-display">${a.patient_name}</div>
                    <div class="text-[11px] text-slate-400 font-mono">${a.patient_whatsapp || 'Sin celular'}</div>
                  </td>
                  <td class="py-3 px-3 text-slate-700 font-medium">${a.service_name}</td>
                  <td class="py-3 px-3 font-mono font-semibold text-navy">${a.date_formatted} • ${a.time_str} hs</td>
                  <td class="py-3 px-3">
                    <span class="px-2.5 py-1 ${a.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500' : 'bg-navy text-white shadow-2xs'} text-[10px] font-semibold font-mono rounded-md">
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

    agendaContainer.innerHTML = filtered.map(a => `
      <div class="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
        <div>
          <div class="font-bold text-navy text-xs font-display">${a.patient_name}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">${a.service_name} (${a.duration_minutes || 30} min) • ${a.patient_whatsapp || ''}</div>
        </div>
        <div class="text-right font-mono">
          <div class="text-xs font-bold text-navy">${a.date_formatted} • ${a.time_str} hs</div>
          <span class="text-[10px] ${a.status === 'CANCELLED' ? 'text-slate-400' : 'text-emerald-700 font-bold'}">${a.status === 'CANCELLED' ? 'Cancelado' : '● Confirmado'}</span>
        </div>
      </div>
    `).join('');
  }

  // 9. Renderizar Grilla Diaria de Agenda
  function renderWeeklyAgenda() {
    if (!agendaDayPillsContainer || !agendaSlotsSheet) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const baseStart = new Date(today);
    baseStart.setDate(today.getDate() + (currentAgendaWeekOffset * 6));
    
    const daysToRender = [];
    let temp = new Date(baseStart);
    for (let i = 0; i < 6; i++) {
      daysToRender.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }

    if (agendaWeekLabel && daysToRender.length > 0) {
      const firstD = daysToRender[0];
      const lastD = daysToRender[daysToRender.length - 1];
      const firstM = monthsFull[firstD.getMonth()];
      const lastM = monthsFull[lastD.getMonth()];
      const year = lastD.getFullYear();
      
      if (firstM === lastM) {
        agendaWeekLabel.innerText = `${firstM} ${year}`;
      } else {
        agendaWeekLabel.innerText = `${firstM} / ${lastM} ${year}`;
      }
    }

    let selectedIso = formatLocalDate(selectedAgendaDate);
    const visibleIsos = daysToRender.map(d => formatLocalDate(d));
    if (!visibleIsos.includes(selectedIso)) {
      selectedAgendaDate = daysToRender[0];
      selectedIso = formatLocalDate(selectedAgendaDate);
    }

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
          <span class="text-[9px] font-semibold font-mono ${isSelected ? 'text-slate-300' : (count > 0 ? 'text-amber-700 font-bold' : 'text-slate-500')}">${countLabel}</span>
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

    const now = new Date();
    const todayIso = formatLocalDate(now);
    const isPastDay = selectedIso < todayIso;
    const isToday = selectedIso === todayIso;
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    let visibleSlots = defaultSlotsTimes.map(timeSlot => {
      const [hStr, mStr] = timeSlot.split(':');
      const slotH = parseInt(hStr, 10);
      const slotM = parseInt(mStr, 10);

      const isPastSlot = isPastDay || (isToday && (slotH < currentHour || (slotH === currentHour && slotM <= currentMin)));
      const appt = dayAppointments.find(a => a.time_str === timeSlot);
      return { timeSlot, appt, isPastSlot };
    });

    visibleSlots = visibleSlots.filter(s => s.appt || !s.isPastSlot);

    if (selectedAvailabilityFilter === 'free') {
      visibleSlots = visibleSlots.filter(s => !s.appt && !s.isPastSlot);
    } else if (selectedAvailabilityFilter === 'occupied') {
      visibleSlots = visibleSlots.filter(s => !!s.appt);
    }

    const searchVal = (agendaSearchInput ? agendaSearchInput.value : '').toLowerCase().trim();
    if (searchVal) {
      visibleSlots = visibleSlots.filter(s => {
        if (!s.appt) return false;
        const nameMatch = s.appt.patient_name && s.appt.patient_name.toLowerCase().includes(searchVal);
        const phoneMatch = s.appt.patient_whatsapp && s.appt.patient_whatsapp.toLowerCase().includes(searchVal);
        return nameMatch || phoneMatch;
      });
    }

    if (visibleSlots.length === 0) {
      agendaSlotsSheet.innerHTML = `
        <div class="col-span-full p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
          <p class="text-xs text-slate-500 font-sans">
            No hay horarios ${selectedAvailabilityFilter === 'free' ? 'libres disponibles' : (selectedAvailabilityFilter === 'occupied' ? 'ocupados' : '')}${searchVal ? ' coincidentes con la búsqueda' : ''} para este día.
          </p>
        </div>
      `;
      return;
    }

    agendaSlotsSheet.innerHTML = visibleSlots.map(({ timeSlot, appt }) => {
      if (appt) {
        const cleanPhone = (appt.patient_whatsapp || '').replace(/\D/g, '');
        return `
          <div class="p-3 bg-slate-50/90 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
            <div class="flex items-center gap-3 overflow-hidden">
              <span class="px-2.5 py-1 bg-navy text-white text-xs font-bold font-mono rounded-lg flex-shrink-0 shadow-xs">
                ${timeSlot} hs
              </span>
              <div class="overflow-hidden">
                <div class="text-xs font-bold text-navy font-display truncate">${appt.patient_name}</div>
                <div class="text-[11px] text-slate-500 font-sans truncate">${appt.service_name} ${cleanPhone ? `• ${appt.patient_whatsapp}` : ''}</div>
              </div>
            </div>
            <span class="px-2.5 py-1 bg-navy text-white text-[10px] font-bold font-mono rounded-lg flex-shrink-0 shadow-xs">
              Ocupado
            </span>
          </div>
        `;
      } else {
        return `
          <div class="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all">
            <div class="flex items-center gap-3">
              <span class="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold font-mono rounded-lg flex-shrink-0">
                ${timeSlot} hs
              </span>
            </div>
            <span class="text-[11px] font-semibold text-emerald-600 font-mono">● Libre</span>
          </div>
        `;
      }
    }).join('');
  }

  // Listeners de Navegación Semanal en Agenda
  if (btnPrevWeek) {
    btnPrevWeek.addEventListener('click', () => {
      currentAgendaWeekOffset--;
      renderWeeklyAgenda();
    });
  }

  if (btnNextWeek) {
    btnNextWeek.addEventListener('click', () => {
      currentAgendaWeekOffset++;
      renderWeeklyAgenda();
    });
  }

  if (agendaSearchInput) {
    agendaSearchInput.addEventListener('input', () => {
      if (currentViewMode === 'agenda') {
        renderWeeklyAgenda();
      } else {
        renderTimeline();
      }
    });
  }

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

  // 10. MÓDULO ADMINISTRATIVO: ASIGNAR NUEVO TURNO
  function renderAdminNuevoTurno() {
    renderAdminServices();
    renderAdminBookingCalendar();
  }

  function renderAdminServices() {
    if (!nuevoTurnoServicesGrid) return;
    nuevoTurnoServicesGrid.innerHTML = dentalServices.map(srv => {
      const isSelected = selectedAdminService.id === srv.id;
      return `
        <button type="button" data-srv-id="${srv.id}" class="admin-srv-btn p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-navy text-white border-navy shadow-xs' : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'}">
          <div class="text-xs font-bold font-display truncate ${isSelected ? 'text-amber-400' : 'text-navy'}">${srv.name}</div>
          <div class="flex items-center justify-between mt-1 text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}">
            <span>${srv.duration} min</span>
            <span class="font-bold">${srv.price}</span>
          </div>
        </button>
      `;
    }).join('');

    nuevoTurnoServicesGrid.querySelectorAll('.admin-srv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-srv-id');
        selectedAdminService = dentalServices.find(s => s.id === id) || dentalServices[0];
        if (summaryServiceName) summaryServiceName.innerText = selectedAdminService.name;
        renderAdminServices();
        renderAdminBookingCalendar();
      });
    });
  }

  function renderAdminBookingCalendar() {
    if (!adminBookingDaysContainer || !adminBookingSlotsGrid) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseStart = new Date(today);
    baseStart.setDate(today.getDate() + (adminWeekOffset * 6));

    const daysToRender = [];
    let temp = new Date(baseStart);
    for (let i = 0; i < 6; i++) {
      daysToRender.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }

    if (adminBookingWeekLabel && daysToRender.length > 0) {
      const firstD = daysToRender[0];
      const lastD = daysToRender[daysToRender.length - 1];
      const firstM = monthsFull[firstD.getMonth()];
      const lastM = monthsFull[lastD.getMonth()];
      const year = lastD.getFullYear();
      adminBookingWeekLabel.innerText = firstM === lastM ? `${firstM} ${year}` : `${firstM} / ${lastM} ${year}`;
    }

    let selectedIso = formatLocalDate(selectedAdminDate);
    const visibleIsos = daysToRender.map(d => formatLocalDate(d));
    if (!visibleIsos.includes(selectedIso)) {
      selectedAdminDate = daysToRender[0];
      selectedIso = formatLocalDate(selectedAdminDate);
    }

    // Render días
    adminBookingDaysContainer.innerHTML = daysToRender.map(d => {
      const dIso = formatLocalDate(d);
      const isSelected = (dIso === selectedIso);
      const dayName = daysShort[d.getDay()];
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');

      const dayAppts = allAppointments.filter(a => {
        if (!a.start_time || a.status === 'CANCELLED') return false;
        return a.start_time.startsWith(dIso);
      });

      const occupiedTimes = dayAppts.map(a => a.time_str);
      const now = new Date();
      const todayIso = formatLocalDate(now);
      const isPastDay = dIso < todayIso;
      const isToday = dIso === todayIso;
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      const freeCount = defaultSlotsTimes.filter(t => {
        if (occupiedTimes.includes(t)) return false;
        const [h, m] = t.split(':').map(Number);
        if (isPastDay || (isToday && (h < currentHour || (h === currentHour && m <= currentMin)))) return false;
        return true;
      }).length;

      return `
        <button type="button" data-admin-day-iso="${dIso}" class="admin-day-btn p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all ${isSelected ? 'bg-navy text-white shadow-xs font-bold' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'}">
          <span class="text-[9px] font-bold uppercase font-mono ${isSelected ? 'text-amber-400' : 'text-slate-500'}">${dayName}</span>
          <span class="text-xs font-bold font-display my-0.5">${dayNum}/${monthNum}</span>
          <span class="text-[8px] font-semibold font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}">${freeCount} libres</span>
        </button>
      `;
    }).join('');

    adminBookingDaysContainer.querySelectorAll('.admin-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const iso = btn.getAttribute('data-admin-day-iso');
        const [y, m, d] = iso.split('-').map(Number);
        selectedAdminDate = new Date(y, m - 1, d);
        renderAdminBookingCalendar();
      });
    });

    // Render Slots Libres
    const dayOfWeekName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][selectedAdminDate.getDay()];
    const dayNumber = selectedAdminDate.getDate();
    const monthName = monthsFull[selectedAdminDate.getMonth()];

    if (adminBookingSelectedDayTitle) {
      adminBookingSelectedDayTitle.innerText = `${dayOfWeekName} ${dayNumber} de ${monthName}`;
    }
    if (summaryBookingDate) {
      summaryBookingDate.innerText = `${dayOfWeekName} ${dayNumber}/${String(selectedAdminDate.getMonth() + 1).padStart(2, '0')}`;
    }

    const dayAppts = allAppointments.filter(a => {
      if (!a.start_time || a.status === 'CANCELLED') return false;
      return a.start_time.startsWith(selectedIso);
    });
    const occupiedTimes = dayAppts.map(a => a.time_str);

    const now = new Date();
    const todayIso = formatLocalDate(now);
    const isPastDay = selectedIso < todayIso;
    const isToday = selectedIso === todayIso;
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const freeSlots = defaultSlotsTimes.filter(t => {
      if (occupiedTimes.includes(t)) return false;
      const [h, m] = t.split(':').map(Number);
      if (isPastDay || (isToday && (h < currentHour || (h === currentHour && m <= currentMin)))) return false;
      return true;
    });

    if (adminBookingFreeCountBadge) {
      adminBookingFreeCountBadge.innerText = `${freeSlots.length} ${freeSlots.length === 1 ? 'horario libre' : 'horarios libres'}`;
    }

    if (freeSlots.length === 0) {
      adminBookingSlotsGrid.innerHTML = `
        <div class="col-span-full p-4 text-center bg-slate-50 rounded-xl border border-slate-200">
          <p class="text-xs text-slate-500 font-sans">No hay horarios libres disponibles para este día.</p>
        </div>
      `;
      selectedAdminSlot = null;
      if (summaryBookingTime) summaryBookingTime.innerText = "Sin seleccionar";
      return;
    }

    if (!freeSlots.includes(selectedAdminSlot)) {
      selectedAdminSlot = freeSlots[0];
    }
    if (summaryBookingTime) summaryBookingTime.innerText = `${selectedAdminSlot} hs`;

    adminBookingSlotsGrid.innerHTML = freeSlots.map(timeStr => {
      const isSelected = selectedAdminSlot === timeStr;
      return `
        <button type="button" data-admin-slot="${timeStr}" class="admin-slot-btn py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all ${isSelected ? 'bg-navy text-white shadow-xs border-navy' : 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 border border-slate-200 shadow-2xs'}">
          ${timeStr} hs
        </button>
      `;
    }).join('');

    adminBookingSlotsGrid.querySelectorAll('.admin-slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAdminSlot = btn.getAttribute('data-admin-slot');
        if (summaryBookingTime) summaryBookingTime.innerText = `${selectedAdminSlot} hs`;
        renderAdminBookingCalendar();
      });
    });
  }

  if (btnAdminPrevWeek) {
    btnAdminPrevWeek.addEventListener('click', () => {
      adminWeekOffset--;
      renderAdminBookingCalendar();
    });
  }
  if (btnAdminNextWeek) {
    btnAdminNextWeek.addEventListener('click', () => {
      adminWeekOffset++;
      renderAdminBookingCalendar();
    });
  }

  // Autocompletado de pacientes frecuentes
  let searchTimeout = null;
  if (adminPatientPhone) {
    adminPatientPhone.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const val = adminPatientPhone.value.trim();
      if (val.length < 3) {
        if (adminPatientSuggestions) adminPatientSuggestions.classList.add('hidden');
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          const res = await fetch(`/api/v1/booking/patients-search?q=${encodeURIComponent(val)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.patients && data.patients.length > 0 && adminPatientSuggestions) {
              adminPatientSuggestions.innerHTML = data.patients.map(p => `
                <div data-patient-name="${p.full_name}" data-patient-phone="${p.whatsapp_phone}" class="patient-sugg-item p-2.5 hover:bg-slate-100 cursor-pointer border-b border-slate-100 text-xs">
                  <div class="font-bold text-navy">${p.full_name}</div>
                  <div class="text-[10px] text-slate-500 font-mono">${p.whatsapp_phone}</div>
                </div>
              `).join('');
              adminPatientSuggestions.classList.remove('hidden');

              adminPatientSuggestions.querySelectorAll('.patient-sugg-item').forEach(item => {
                item.addEventListener('click', () => {
                  adminPatientName.value = item.getAttribute('data-patient-name');
                  adminPatientPhone.value = item.getAttribute('data-patient-phone');
                  adminPatientSuggestions.classList.add('hidden');
                });
              });
            } else if (adminPatientSuggestions) {
              adminPatientSuggestions.classList.add('hidden');
            }
          }
        } catch (e) {}
      }, 250);
    });
  }

  // Envío de la reserva administrativa
  if (btnAdminSubmitBooking) {
    btnAdminSubmitBooking.addEventListener('click', async () => {
      const patientName = adminPatientName ? adminPatientName.value.trim() : '';
      const patientPhone = adminPatientPhone ? adminPatientPhone.value.trim() : '';

      if (!patientName) {
        showToast('Por favor, ingresá el nombre completo del paciente', 'error');
        if (adminPatientName) adminPatientName.focus();
        return;
      }

      if (!patientPhone || patientPhone.length < 6) {
        showToast('Por favor, ingresá un número de celular válido', 'error');
        if (adminPatientPhone) adminPatientPhone.focus();
        return;
      }

      if (!selectedAdminSlot) {
        showToast('Por favor, seleccioná un horario libre disponible', 'error');
        return;
      }

      const selectedIso = formatLocalDate(selectedAdminDate);
      const startTimeIso = `${selectedIso}T${selectedAdminSlot}:00`;

      btnAdminSubmitBooking.disabled = true;
      btnAdminSubmitBooking.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Agendando cita...</span>
      `;

      try {
        const payload = {
          tenant_id: "demo-tenant-citaly-001",
          service_id: selectedAdminService.id,
          patient_name: patientName,
          patient_whatsapp: patientPhone,
          start_time: startTimeIso
        };

        const res = await fetch('/api/v1/booking/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          showToast(`¡Turno agendado con éxito para ${patientName}! WhatsApp oficial enviado.`, 'success');
          
          if (adminPatientName) adminPatientName.value = '';
          if (adminPatientPhone) adminPatientPhone.value = '';

          await fetchDashboardAppointments();
          setTimeout(() => switchTab('reservas'), 1200);
        } else {
          showToast(data.detail || 'No se pudo reservar el turno. Verificá la disponibilidad.', 'error');
        }
      } catch (err) {
        showToast('Error de conexión al agendar el turno.', 'error');
      } finally {
        btnAdminSubmitBooking.disabled = false;
        btnAdminSubmitBooking.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Confirmar y Agendar Turno</span>
        `;
      }
    });
  }

  // 11. Renderizar Turnos Reprogramados
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
            <p class="text-xs text-slate-600 mt-1">${a.service_name} • ${cleanPhone ? a.patient_whatsapp : 'Sin celular'}</p>
          </div>
          <div class="text-left md:text-right font-mono">
            <div class="text-xs font-bold text-navy">${a.date_formatted} • ${a.time_str} hs</div>
            <span class="text-[10px] text-slate-400">Nuevo horario confirmado</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 12. Actualizar Métricas Bento
  function updateMetrics() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let periodAppointments = [];
    let totalSlotsCapacity = 108;

    if (currentMetricsPeriod === 'week') {
      const endOfRollingWeek = new Date(now);
      endOfRollingWeek.setDate(now.getDate() + 6);
      endOfRollingWeek.setHours(23, 59, 59, 999);

      periodAppointments = allAppointments.filter(a => {
        if (!a.start_time) return false;
        const d = new Date(a.start_time);
        return d >= now && d <= endOfRollingWeek;
      });

      totalSlotsCapacity = 6 * defaultSlotsTimes.length;
    } else {
      const endOfRollingMonth = new Date(now);
      endOfRollingMonth.setDate(now.getDate() + 29);
      endOfRollingMonth.setHours(23, 59, 59, 999);

      periodAppointments = allAppointments.filter(a => {
        if (!a.start_time) return false;
        const d = new Date(a.start_time);
        return d >= now && d <= endOfRollingMonth;
      });

      totalSlotsCapacity = 26 * defaultSlotsTimes.length;
    }

    const total = periodAppointments.length;
    const cancelados = periodAppointments.filter(a => a.status === 'CANCELLED').length;
    const activos = periodAppointments.filter(a => a.status !== 'CANCELLED').length;
    
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
    
    if (metricOcupacion) {
      const rate = totalSlotsCapacity > 0 ? Math.round((activos / totalSlotsCapacity) * 100) : 0;
      metricOcupacion.innerText = `${rate}%`;
    }
  }

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

  // 13. Listeners de Modo de Vista en Agenda
  function setViewMode(mode) {
    currentViewMode = mode;

    [btnViewCards, btnViewTable, btnViewAgenda].forEach(b => {
      if (b) {
        b.className = 'px-3.5 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all font-semibold';
      }
    });

    if (mode === 'cards' && btnViewCards) {
      btnViewCards.className = 'px-3.5 py-2 bg-navy text-white rounded-lg transition-all shadow-xs font-bold';
    } else if (mode === 'table' && btnViewTable) {
      btnViewTable.className = 'px-3.5 py-2 bg-navy text-white rounded-lg transition-all shadow-xs font-bold';
    } else if (mode === 'agenda' && btnViewAgenda) {
      btnViewAgenda.className = 'px-3.5 py-2 bg-navy text-white rounded-lg transition-all shadow-xs font-bold';
    }

    if (mode === 'agenda') {
      reservasNormalView.style.display = 'none';
      reservasAgendaView.style.display = 'block';
      renderWeeklyAgenda();
    } else {
      renderTimeline();
    }
  }

  if (btnViewCards) btnViewCards.addEventListener('click', () => setViewMode('cards'));
  if (btnViewTable) btnViewTable.addEventListener('click', () => setViewMode('table'));
  if (btnViewAgenda) btnViewAgenda.addEventListener('click', () => setViewMode('agenda'));

  // 14. Inicialización
  fetchDashboardAppointments();
  startDashboardAutoSync();
});
