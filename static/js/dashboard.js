document.addEventListener('DOMContentLoaded', () => {
  // 0. Dismiss Splash Screen
  const splashScreen = document.getElementById('app-splash-screen');
  if (splashScreen) {
    setTimeout(() => {
      splashScreen.classList.add('fade-out');
      setTimeout(() => {
        if (splashScreen.parentNode) splashScreen.remove();
      }, 700);
    }, 2100);
  }

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
  const metricPeriodLabel = document.getElementById('metric-period-label');
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

  // ==========================================
  // TEMA OSCURO / CLARO (PRONTOTURNO DASHBOARD)
  // ==========================================
  const themeToggleBtn = document.getElementById('theme-toggle');
  const moonIcon = document.getElementById('theme-icon-moon');
  const sunIcon = document.getElementById('theme-icon-sun');

  function applyDashboardTheme(theme) {
    const isDark = theme === 'dark';
    const themeColor = isDark ? '#1D2524' : '#F8FAFC';

    // Update Theme-Color for Android/iOS System Status Bar (node replacement for Chrome Android)
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());
    const newMeta = document.createElement('meta');
    newMeta.name = 'theme-color';
    newMeta.id = 'meta-theme-color';
    newMeta.content = themeColor;
    document.head.appendChild(newMeta);

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('dark-theme');
      if (moonIcon) moonIcon.classList.add('hidden');
      if (sunIcon) sunIcon.classList.remove('hidden');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.classList.remove('dark-theme');
      if (moonIcon) moonIcon.classList.remove('hidden');
      if (sunIcon) sunIcon.classList.add('hidden');
    }
  }

  const savedTheme = localStorage.getItem('prontoturno_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyDashboardTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      const newTheme = isDark ? 'light' : 'dark';
      localStorage.setItem('prontoturno_theme', newTheme);
      applyDashboardTheme(newTheme);
    });
  }
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
  // Servicios Oficiales (Con UUIDs reales de PostgreSQL)
  let dentalServices = [
    { id: "4b98fe07-1d50-49d0-9c75-d3483a572896", name: "Ortodoncia / Control", duration: 120, price: "$25.000", desc: "Alineación y controles" },
    { id: "c555b0b2-5edc-4078-b25e-1d9cee908954", name: "Limpieza & Blanqueamiento", duration: 45, price: "$18.000", desc: "Profilaxis y estética" },
    { id: "f5a291e5-70a9-431e-8376-ae9cd50a529c", name: "Endodoncia / Conducto", duration: 45, price: "$32.000", desc: "Tratamiento de conducto" },
    { id: "e0ffdf4c-ed17-4f44-8546-deceac61fc65", name: "Implante Dental & Cirugía", duration: 60, price: "$55.000", desc: "Cirugía especializada" },
    { id: "03416f5d-fd1f-49d7-810e-0b11a7dfb419", name: "Extracción Muela de Juicio", duration: 30, price: "$20.000", desc: "Extracciones simples y complejas" },
    { id: "4fb9a174-1682-40fa-8fa0-579bda631ef4", name: "Consulta & Diagnóstico", duration: 30, price: "$12.000", desc: "Evaluación integral" }
  ];

  async function fetchServices() {
    try {
      const res = await fetch('/api/v1/booking/services');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          dentalServices = list.map(s => ({
            id: s.id,
            name: s.name,
            duration: s.duration_minutes || 30,
            price: s.price ? `$${Number(s.price).toLocaleString('es-AR')}` : '$0',
            desc: s.name
          }));
          if (!selectedAdminService || !dentalServices.some(s => s.id === selectedAdminService.id)) {
            selectedAdminService = dentalServices[0];
          }
          renderAdminServices();
        }
      }
    } catch (e) {
      console.warn('Error al cargar servicios dinámicos:', e);
    }
  }

  // Estado Local
  let allAppointments = [];
  let allTimeBlocks = [];
  let _pendingAdminCancelApptId = null;
  let currentMetricsPeriod = 'month';
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
        btn.classList.add('bg-navy', 'text-white', 'dark:bg-[#D6C265]', 'dark:text-[#1D2524]', 'font-bold', 'shadow-xs');
        btn.classList.remove('text-slate-600', 'hover:bg-slate-100', 'hover:text-navy', 'dark:text-slate-400', 'dark:hover:bg-[#2D3A38]', 'dark:hover:text-[#D6C265]');
      } else {
        btn.classList.remove('bg-navy', 'text-white', 'dark:bg-[#D6C265]', 'dark:text-[#1D2524]', 'font-bold', 'shadow-xs');
        btn.classList.add('text-slate-600', 'hover:bg-slate-100', 'hover:text-navy', 'dark:text-slate-400', 'dark:hover:bg-[#2D3A38]', 'dark:hover:text-[#D6C265]');
      }
    });

    // Actualizar botones móviles (fondo pill y sombra al seleccionar)
    mobileTabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('text-navy', 'font-bold', 'bg-slate-200/80', 'dark:bg-[#25302E]', 'dark:text-[#D6C265]', 'dark:border', 'dark:border-[#6A6A47]/40', 'shadow-xs');
        btn.classList.remove('text-slate-500', 'dark:text-slate-400', 'font-medium');
      } else {
        btn.classList.remove('text-navy', 'font-bold', 'bg-slate-200/80', 'dark:bg-[#25302E]', 'dark:text-[#D6C265]', 'dark:border', 'dark:border-[#6A6A47]/40', 'shadow-xs');
        btn.classList.add('text-slate-500', 'dark:text-slate-400', 'font-medium');
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

  // Inicializar estilos de pestañas según el tema activo
  switchTab('panel');

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

  // 5. Cargar Turnos y Bloqueos de Agenda desde la API Backend
  async function fetchDashboardAppointments() {
    try {
      if (syncIcon) syncIcon.classList.add('animate-spin');
      const [resAppts, resBlocks] = await Promise.all([
        fetch('/api/v1/booking/appointments', { cache: 'no-store' }),
        fetch('/api/v1/booking/time-blocks', { cache: 'no-store' }).catch(() => null)
      ]);

      if (!resAppts.ok) throw new Error('Error al consultar turnos');
      const data = await resAppts.json();
      allAppointments = Array.isArray(data) ? data : (data.appointments || []);

      if (resBlocks && resBlocks.ok) {
        const blockData = await resBlocks.json();
        allTimeBlocks = blockData.time_blocks || [];
      } else {
        allTimeBlocks = [];
      }

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
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#3F453A]">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b-2 border-slate-200 dark:border-[#6A6A47]/40 text-slate-400 dark:text-[#D6C265] font-mono text-[11px] uppercase tracking-wider font-extrabold bg-slate-50 dark:bg-[#1D2524]">
                <th class="sticky top-0 z-10 bg-slate-50 dark:bg-[#1D2524] py-3 px-3 shadow-2xs">Paciente</th>
                <th class="sticky top-0 z-10 bg-slate-50 dark:bg-[#1D2524] py-3 px-3 shadow-2xs">Tratamiento</th>
                <th class="sticky top-0 z-10 bg-slate-50 dark:bg-[#1D2524] py-3 px-3 shadow-2xs">Fecha y Hora</th>
                <th class="sticky top-0 z-10 bg-slate-50 dark:bg-[#1D2524] py-3 px-3 shadow-2xs">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-[#3F453A]/60 bg-white dark:bg-[#25302E]">
              ${filtered.map(a => `
                <tr class="hover:bg-slate-50 dark:hover:bg-[#2D3A38] transition-colors">
                  <td class="py-3 px-3 font-semibold text-navy dark:text-[#F4F4F6]">
                    <div class="font-display font-bold">${a.patient_name}</div>
                    <div class="text-[11px] text-slate-400 dark:text-[#749E90] font-mono">${a.patient_whatsapp || 'Sin celular'}</div>
                  </td>
                  <td class="py-3 px-3 text-slate-700 dark:text-[#D6C265] font-medium">${a.service_name}</td>
                  <td class="py-3 px-3 font-mono font-semibold text-navy dark:text-[#F4F4F6]">${a.date_formatted} • <span class="dark:text-[#D6C265] font-bold">${a.time_str} hs</span></td>
                  <td class="py-3 px-3">
                    <span class="px-2.5 py-1 ${a.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500 dark:bg-[#2A241F] dark:text-[#94A3B8]' : 'bg-navy text-white dark:bg-[#1F2927] dark:text-[#749E90] dark:border dark:border-[#749E90]/40'} text-[10px] font-bold font-mono rounded-md shadow-2xs">
                      ${a.status === 'CANCELLED' ? 'Cancelado' : '● Confirmado'}
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
      <div class="p-3.5 bg-white dark:bg-[#25302E] rounded-xl border border-slate-200 dark:border-[#3F453A] flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-[#6A6A47] transition-all">
        <div>
          <div class="font-bold text-navy dark:text-[#F4F4F6] text-xs font-display">${a.patient_name}</div>
          <div class="text-[11px] text-slate-500 dark:text-[#A1A1AA] mt-0.5"><span class="dark:text-[#D6C265] font-semibold">${a.service_name}</span> (${a.duration_minutes || 30} min) • <span class="dark:text-[#749E90] font-mono">${a.patient_whatsapp || ''}</span></div>
        </div>
        <div class="text-right font-mono">
          <div class="text-xs font-bold text-navy dark:text-[#F4F4F6]">${a.date_formatted} • <span class="dark:text-[#D6C265]">${a.time_str} hs</span></div>
          <span class="text-[10px] ${a.status === 'CANCELLED' ? 'text-slate-400 dark:text-[#94A3B8]' : 'text-emerald-700 font-bold dark:text-[#749E90]'}">${a.status === 'CANCELLED' ? 'Cancelado' : '● Confirmado'}</span>
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
        <button data-day-iso="${dIso}" class="agenda-day-btn p-2.5 rounded-xl flex flex-col items-center justify-center text-center transition-all ${isSelected ? 'bg-navy text-white shadow-xs font-bold dark:bg-[#D6C265] dark:text-[#1D2524]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-[#25302E] dark:text-[#F4F4F6] dark:border-[#3F453A] dark:hover:border-[#6A6A47]'}">
          <span class="text-[10px] font-bold uppercase font-mono ${isSelected ? 'text-amber-400 dark:text-[#1D2524]' : 'text-slate-500 dark:text-[#A1A1AA]'}">${dayName}</span>
          <span class="text-sm font-bold font-display my-0.5">${dayNum}/${monthNum}</span>
          <span class="text-[9px] font-semibold font-mono ${isSelected ? 'text-slate-300 dark:text-[#263230]' : (count > 0 ? 'text-amber-700 dark:text-[#D6C265] font-bold' : 'text-slate-500 dark:text-[#749E90]')}">${countLabel}</span>
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

      const slotStart = new Date(selectedAgendaDate.getFullYear(), selectedAgendaDate.getMonth(), selectedAgendaDate.getDate(), slotH, slotM, 0);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

      const isPastSlot = isPastDay || (isToday && (slotH < currentHour || (slotH === currentHour && slotM <= currentMin)));

      // Solapamiento exacto de intervalo con citas agendadas (duración real del tratamiento)
      const appt = dayAppointments.find(a => {
        const aStart = new Date(a.start_time);
        let aEnd;
        if (a.end_time) {
          aEnd = new Date(a.end_time);
        } else {
          const srv = dentalServices.find(s => s.id === a.service_id || s.name === a.service_name);
          const durMin = srv ? srv.duration : 30;
          aEnd = new Date(aStart.getTime() + durMin * 60000);
        }
        return slotStart < aEnd && slotEnd > aStart;
      });

      // Solapamiento con bloqueos de agenda
      const timeBlock = allTimeBlocks.find(b => {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return slotStart < bEnd && slotEnd > bStart;
      });

      return { timeSlot, appt, timeBlock, isPastSlot };
    });

    visibleSlots = visibleSlots.filter(s => s.appt || s.timeBlock || !s.isPastSlot);

    if (selectedAvailabilityFilter === 'free') {
      visibleSlots = visibleSlots.filter(s => !s.appt && !s.timeBlock && !s.isPastSlot);
    } else if (selectedAvailabilityFilter === 'occupied') {
      visibleSlots = visibleSlots.filter(s => !!s.appt || !!s.timeBlock);
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

    function renderAgendaSlotItem({ timeSlot, appt, timeBlock, isPastSlot }) {
      if (appt) {
        const cleanPhone = (appt.patient_whatsapp || '').replace(/\D/g, '');
        return `
          <div class="p-3 bg-slate-50/90 dark:bg-[#232E2C] rounded-xl border border-slate-200 dark:border-[#3F453A] flex flex-col gap-2 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-[#6A6A47]/60">
            <!-- Fila 1: Hora + Nombre Completo + Estado -->
            <div class="flex items-center justify-between gap-2.5">
              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <span class="px-2.5 py-1 bg-navy dark:bg-[#D6C265] text-white dark:text-[#1D2524] text-xs font-bold font-mono rounded-lg flex-shrink-0 shadow-xs">
                  ${timeSlot} hs
                </span>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold text-navy dark:text-[#F4F4F6] font-display truncate">${appt.patient_name}</div>
                  <div class="text-[11px] text-slate-500 dark:text-[#A1A1AA] font-sans truncate">
                    <span class="dark:text-[#D6C265] font-semibold">${appt.service_name}</span> ${cleanPhone ? `• <span class="dark:text-[#749E90] font-mono">${appt.patient_whatsapp}</span>` : ''}
                  </div>
                </div>
              </div>
              <span class="px-2 py-0.5 bg-navy/10 text-navy dark:bg-[#594B29]/60 dark:text-[#D6C265] dark:border dark:border-[#6A6A47]/50 text-[10px] font-bold font-mono rounded-md flex-shrink-0">
                Ocupado
              </span>
            </div>

            <!-- Fila 2: Botones de Acción -->
            ${isPastSlot ? `
              <div class="flex items-center justify-end pt-1 border-t border-slate-200/50 dark:border-[#3F453A]/60">
                <span class="px-2 py-0.5 bg-slate-100 dark:bg-[#1D2524] text-slate-500 dark:text-slate-400 text-[10px] font-bold font-mono rounded-md">Finalizado</span>
              </div>
            ` : `
              <div class="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-[#3F453A]/80">
                <button type="button" data-action="admin-reschedule-appt" data-appt-id="${appt.id}" data-patient-name="${appt.patient_name || 'Paciente'}" data-patient-phone="${cleanPhone || ''}" data-service-id="${appt.service_id || ''}" data-service-name="${appt.service_name || 'Especialidad'}" data-duration="${appt.duration_minutes || 30}" data-slot-info="${timeSlot} hs (${dayOfWeekName} ${dayNumber} de ${monthName})" class="px-2.5 py-1 bg-white hover:bg-slate-100 text-navy dark:bg-[#2A3634] dark:hover:bg-[#354442] dark:text-[#D6C265] border border-slate-300 dark:border-[#6A6A47] rounded-lg text-[10px] font-bold font-mono transition-all shadow-2xs" title="Reprogramar fecha y horario">
                  Reprogramar
                </button>
                <button type="button" data-action="admin-cancel-appt" data-appt-id="${appt.id}" data-patient-name="${appt.patient_name || 'Paciente'}" data-slot-info="${timeSlot} hs (${dayOfWeekName} ${dayNumber} de ${monthName})" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-navy dark:bg-[#1D2524] dark:hover:bg-red-950/40 dark:text-slate-400 dark:hover:text-red-400 border border-slate-200 dark:border-[#3F453A] rounded-lg text-[10px] font-bold font-mono transition-all" title="Cancelar este turno y liberar el horario">
                  Cancelar
                </button>
              </div>
            `}
          </div>
        `;
      } else if (timeBlock) {
        return `
          <div class="p-3 bg-slate-100/80 dark:bg-[#2A271F] rounded-xl border border-slate-300 dark:border-[#594B29] flex items-center justify-between gap-3 shadow-2xs">
            <div class="flex items-center gap-3 overflow-hidden">
              <span class="px-2.5 py-1 bg-slate-200 text-slate-800 dark:bg-[#594B29] dark:text-[#D6C265] text-xs font-bold font-mono rounded-lg flex-shrink-0">
                ${timeSlot} hs
              </span>
              <div class="overflow-hidden">
                <div class="text-xs font-bold text-navy dark:text-[#D6C265] font-display truncate">🔒 ${timeBlock.reason || 'Agenda Bloqueada'}</div>
                <div class="text-[11px] text-slate-500 dark:text-[#94A3B8] font-sans truncate">No disponible para turnos</div>
              </div>
            </div>
            <button type="button" data-action="admin-delete-block" data-block-id="${timeBlock.id}" class="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 dark:bg-[#232E2C] dark:hover:bg-[#2D3A38] dark:text-[#D6C265] border border-slate-300 dark:border-[#6A6A47] rounded-lg text-[10px] font-bold font-mono transition-all shadow-2xs">
              Desbloquear
            </button>
          </div>
        `;
      } else {
        return `
          <div class="p-3 bg-white dark:bg-[#1D2524]/60 rounded-xl border border-slate-200 dark:border-[#3F453A] flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-[#6A6A47] transition-all">
            <div class="flex items-center gap-3">
              <span class="px-2.5 py-1 bg-slate-100 dark:bg-[#2D3A38] text-slate-700 dark:text-[#CBD5E1] text-xs font-bold font-mono rounded-lg flex-shrink-0">
                ${timeSlot} hs
              </span>
            </div>
            <span class="text-[11px] font-semibold text-slate-500 dark:text-[#749E90] font-mono">● Disponible</span>
          </div>
        `;
      }
    }

    const half = Math.ceil(visibleSlots.length / 2);
    const col1Slots = visibleSlots.slice(0, half);
    const col2Slots = visibleSlots.slice(half);

    agendaSlotsSheet.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
        <div class="space-y-2.5">
          ${col1Slots.map(renderAgendaSlotItem).join('')}
        </div>
        <div class="space-y-2.5">
          ${col2Slots.map(renderAgendaSlotItem).join('')}
        </div>
      </div>
    `;
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
        b.className = 'px-2.5 py-1 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-[#2D3A38] dark:hover:text-[#D6C265] rounded-lg transition-all font-semibold font-mono text-xs';
      }
    });

    const activeClass = 'px-2.5 py-1 bg-navy text-white dark:bg-[#D6C265] dark:text-[#1D2524] rounded-lg transition-all shadow-xs font-bold font-mono text-xs';
    if (filter === 'all' && btnFilterAll) {
      btnFilterAll.className = activeClass;
    } else if (filter === 'free' && btnFilterFree) {
      btnFilterFree.className = activeClass;
    } else if (filter === 'occupied' && btnFilterOccupied) {
      btnFilterOccupied.className = activeClass;
    }

    renderWeeklyAgenda();
  }

  if (btnFilterAll) btnFilterAll.addEventListener('click', () => setAvailabilityFilter('all'));
  if (btnFilterFree) btnFilterFree.addEventListener('click', () => setAvailabilityFilter('free'));
  if (btnFilterOccupied) btnFilterOccupied.addEventListener('click', () => setAvailabilityFilter('occupied'));

  // 10. MÓDULO ADMINISTRATIVO: ASIGNAR NUEVO TURNO
  async function renderAdminNuevoTurno() {
    renderAdminServices();
    renderAdminBookingCalendar();
    // Refrescar turnos reales antes de mostrar slots — evita mostrar horarios ya ocupados
    await fetchDashboardAppointments();
    renderAdminBookingCalendar();
  }

  function renderAdminServices() {
    if (!nuevoTurnoServicesGrid) return;
    nuevoTurnoServicesGrid.innerHTML = dentalServices.map(srv => {
      const isSelected = selectedAdminService.id === srv.id;
      return `
        <button type="button" data-srv-id="${srv.id}" class="admin-srv-btn p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-navy text-white border-navy shadow-xs dark:bg-[#D6C265] dark:text-[#1D2524] dark:border-[#D6C265]' : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 dark:bg-[#25302E] dark:text-[#F4F4F6] dark:border-[#3F453A] dark:hover:border-[#6A6A47]'}">
          <div class="text-xs font-bold font-display truncate ${isSelected ? 'text-amber-400 dark:text-[#1D2524]' : 'text-navy dark:text-[#F4F4F6]'}">${srv.name}</div>
          <div class="flex items-center justify-between mt-1 text-[10px] font-mono ${isSelected ? 'text-slate-300 dark:text-[#263230]' : 'text-slate-500 dark:text-[#A1A1AA]'}">
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

      // Bloquear todos los slots cubiertos por la duracion del turno (no solo el inicio)
      const occupiedSlotsDayBtn = new Set();
      dayAppts.forEach(a => {
        const dur = a.duration_minutes || 30;
        const parts = (a.time_str || '').split(':').map(Number);
        if (parts.length < 2 || isNaN(parts[0])) return;
        const startMin = parts[0] * 60 + parts[1];
        const endMin = startMin + dur;
        defaultSlotsTimes.forEach(t => {
          const tp = t.split(':').map(Number);
          const slotMin = tp[0] * 60 + tp[1];
          if (slotMin >= startMin && slotMin < endMin) occupiedSlotsDayBtn.add(t);
        });
      });
      const now = new Date();
      const todayIso = formatLocalDate(now);
      const isPastDay = dIso < todayIso;
      const isToday = dIso === todayIso;
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      const freeCount = defaultSlotsTimes.filter(t => {
        if (occupiedSlotsDayBtn.has(t)) return false;
        const [h, m] = t.split(':').map(Number);
        if (isPastDay || (isToday && (h < currentHour || (h === currentHour && m <= currentMin)))) return false;
        return true;
      }).length;

      return `
        <button type="button" data-admin-day-iso="${dIso}" class="admin-day-btn p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all ${isSelected ? 'bg-navy text-white shadow-xs font-bold dark:bg-[#D6C265] dark:text-[#1D2524]' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-[#25302E] dark:text-[#F4F4F6] dark:border-[#3F453A] dark:hover:border-[#6A6A47]'}">
          <span class="text-[9px] font-bold uppercase font-mono ${isSelected ? 'text-amber-400 dark:text-[#1D2524]' : 'text-slate-500 dark:text-[#A1A1AA]'}">${dayName}</span>
          <span class="text-xs font-bold font-display my-0.5">${dayNum}/${monthNum}</span>
          <span class="text-[8px] font-semibold font-mono ${isSelected ? 'text-slate-300 dark:text-[#263230]' : 'text-slate-500 dark:text-[#749E90]'}">${freeCount} libres</span>
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

    // Bloquear todos los slots cubiertos por la duracion del turno
    const occupiedSlotsGrid = new Set();
    dayAppts.forEach(a => {
      const dur = a.duration_minutes || 30;
      const parts = (a.time_str || '').split(':').map(Number);
      if (parts.length < 2 || isNaN(parts[0])) return;
      const startMin = parts[0] * 60 + parts[1];
      const endMin = startMin + dur;
      defaultSlotsTimes.forEach(t => {
        const tp = t.split(':').map(Number);
        const slotMin = tp[0] * 60 + tp[1];
        if (slotMin >= startMin && slotMin < endMin) occupiedSlotsGrid.add(t);
      });
    });

    // Si el nuevo turno seleccionado tiene duracion > 30min, bloquear tambien los siguientes
    const selectedDur = (selectedAdminService && selectedAdminService.duration) ? selectedAdminService.duration : 30;

    const now = new Date();
    const todayIso = formatLocalDate(now);
    const isPastDay = selectedIso < todayIso;
    const isToday = selectedIso === todayIso;
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const freeSlots = defaultSlotsTimes.filter(t => {
      if (occupiedSlotsGrid.has(t)) return false;
      const [h, m] = t.split(':').map(Number);
      if (isPastDay || (isToday && (h < currentHour || (h === currentHour && m <= currentMin)))) return false;
      // Verificar que caben todos los slots del turno nuevo sin colisionar
      const slotStartMin = h * 60 + m;
      const slotEndMin = slotStartMin + selectedDur;
      for (const occupied of occupiedSlotsGrid) {
        const op = occupied.split(':').map(Number);
        const oMin = op[0] * 60 + op[1];
        if (slotStartMin < oMin + 30 && slotEndMin > oMin) return false;
      }
      return true;
    });

    if (adminBookingFreeCountBadge) {
      adminBookingFreeCountBadge.innerText = `${freeSlots.length} ${freeSlots.length === 1 ? 'horario libre' : 'horarios libres'}`;
    }

    if (freeSlots.length === 0) {
      adminBookingSlotsGrid.innerHTML = `
        <div class="col-span-full p-4 text-center bg-slate-50 dark:bg-[#1D2524] rounded-xl border border-slate-200 dark:border-[#3F453A]">
          <p class="text-xs text-slate-500 dark:text-slate-400 font-sans">No hay horarios libres disponibles para este día.</p>
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
        <button type="button" data-admin-slot="${timeStr}" class="admin-slot-btn py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all ${isSelected ? 'bg-navy text-white shadow-xs border-navy dark:bg-[#D6C265] dark:text-[#1D2524] dark:border-[#D6C265]' : 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 border border-slate-200 shadow-2xs dark:bg-[#25302E] dark:text-[#F4F4F6] dark:border-[#3F453A] dark:hover:border-[#6A6A47]'}">
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
          patient_full_name: patientName,
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

        if (res.status === 409 && data && data.has_existing_same_service) {
          const adminDuplicateModal = document.getElementById('admin-duplicate-modal');
          const adminDupModalText = document.getElementById('admin-dup-modal-text');
          const adminDupNewSlot = document.getElementById('admin-dup-new-slot');
          const btnAdminDupReschedule = document.getElementById('btn-admin-dup-reschedule');
          const btnAdminDupKeep = document.getElementById('btn-admin-dup-keep');

          if (adminDuplicateModal && adminDupModalText && adminDupNewSlot) {
            adminDupModalText.innerHTML = `El paciente <strong>${patientName}</strong> ya tiene un turno de <strong class="text-navy">${data.existing_service_name}</strong> el <strong class="text-navy font-mono">${data.existing_date_str}</strong>.<br><br>¿Deseás reprogramarlo y cambiarlo por este nuevo horario?`;
            adminDupNewSlot.innerText = `${summaryBookingDate ? summaryBookingDate.innerText : selectedIso} — ${selectedAdminSlot} hs (${selectedAdminService.name})`;
            adminDuplicateModal.classList.remove('hidden');

            const handleReschedule = async () => {
              adminDuplicateModal.classList.add('hidden');
              cleanup();

              btnAdminSubmitBooking.disabled = true;
              btnAdminSubmitBooking.innerHTML = `<span>Reprogramando cita...</span>`;

              payload.reschedule_from_id = data.existing_appointment_id;
              try {
                const retryRes = await fetch('/api/v1/booking/appointments', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                const retryData = await retryRes.json();
                if (retryRes.ok && retryData.success) {
                  showToast(`¡Turno reprogramado con éxito para ${patientName}!`, 'success');
                  if (adminPatientName) adminPatientName.value = '';
                  if (adminPatientPhone) adminPatientPhone.value = '';
                  await fetchDashboardAppointments();
                  setTimeout(() => switchTab('reservas'), 600);
                } else {
                  showToast(retryData.detail || 'No se pudo reprogramar.', 'error');
                }
              } catch (e) {
                showToast('Error al reprogramar.', 'error');
              } finally {
                btnAdminSubmitBooking.disabled = false;
                btnAdminSubmitBooking.innerHTML = `
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>Confirmar y Agendar Turno</span>
                `;
              }
            };

            const handleKeep = () => {
              adminDuplicateModal.classList.add('hidden');
              cleanup();
              showToast('Operación cancelada. Se conserva el turno original del paciente.');
            };

            const cleanup = () => {
              if (btnAdminDupReschedule) btnAdminDupReschedule.removeEventListener('click', handleReschedule);
              if (btnAdminDupKeep) btnAdminDupKeep.removeEventListener('click', handleKeep);
            };

            if (btnAdminDupReschedule) btnAdminDupReschedule.addEventListener('click', handleReschedule);
            if (btnAdminDupKeep) btnAdminDupKeep.addEventListener('click', handleKeep);
            return;
          }
        }

        if (res.ok && data.success) {
          showToast(`¡Turno agendado con éxito para ${patientName}!`, 'success');
          
          if (adminPatientName) adminPatientName.value = '';
          if (adminPatientPhone) adminPatientPhone.value = '';

          await fetchDashboardAppointments();
          setTimeout(() => switchTab('reservas'), 600);
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
        <div class="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <p class="text-xs font-semibold text-slate-600">No hay turnos reprogramados activos en este momento.</p>
          <p class="text-[11px] text-slate-400 mt-1">Los turnos modificados por los pacientes aparecerán aquí.</p>
        </div>
      `;
      return;
    }

    reprogramadosListContainer.innerHTML = reprogramados.map(a => {
      const cleanPhone = (a.patient_whatsapp || '').replace(/\D/g, '');
      return `
        <div class="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-navy text-sm font-display">${a.patient_name}</h4>
              <span class="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold font-mono rounded-lg">Reprogramado</span>
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

    // Nombres de meses en español
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const currentMonthName = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // Mes calendario: 1er día 00:00:00 hasta último día 23:59:59
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Semana actual (Lunes a Domingo)
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    let periodAppointments = [];
    let totalSlotsCapacity = 108;

    if (currentMetricsPeriod === 'month') {
      if (metricPeriodLabel) metricPeriodLabel.innerText = currentMonthName;

      periodAppointments = allAppointments.filter(a => {
        if (!a.start_time) return false;
        const d = new Date(a.start_time);
        return d >= startOfMonth && d <= endOfMonth;
      });

      // Cálculo de días laborables en el mes calendario (Lun-Sáb)
      let workDaysCount = 0;
      const cur = new Date(startOfMonth);
      while (cur <= endOfMonth) {
        const day = cur.getDay();
        if (day !== 0) workDaysCount++; // Excluye domingos
        cur.setDate(cur.getDate() + 1);
      }
      totalSlotsCapacity = workDaysCount * defaultSlotsTimes.length;
    } else {
      if (metricPeriodLabel) metricPeriodLabel.innerText = 'Esta semana';

      periodAppointments = allAppointments.filter(a => {
        if (!a.start_time) return false;
        const d = new Date(a.start_time);
        return d >= startOfWeek && d <= endOfWeek;
      });

      totalSlotsCapacity = 6 * defaultSlotsTimes.length;
    }

    const total = periodAppointments.length;
    const cancelados = periodAppointments.filter(a => a.status === 'CANCELLED').length;
    const activos = periodAppointments.filter(a => a.status !== 'CANCELLED').length;
    
    const reprogramados = periodAppointments.filter(a => {
      return a.was_rescheduled && a.status !== 'CANCELLED';
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

  // 13.5. Manejo de Acciones en la Agenda y Bloqueos de Disponibilidad
  if (agendaSlotsSheet) {
    agendaSlotsSheet.addEventListener('click', async (e) => {
      const btnCancel = e.target.closest('[data-action="admin-cancel-appt"]');
      const btnDeleteBlock = e.target.closest('[data-action="admin-delete-block"]');

      if (btnCancel) {
        _pendingAdminCancelApptId = btnCancel.getAttribute('data-appt-id');
        const pName = btnCancel.getAttribute('data-patient-name') || 'el paciente';
        const sInfo = btnCancel.getAttribute('data-slot-info') || 'este horario';
        const cancelDesc = document.getElementById('admin-cancel-modal-desc');
        if (cancelDesc) {
          cancelDesc.innerText = `¿Confirmás la cancelación del turno de ${pName} (${sInfo})? El horario quedará libre de inmediato en la agenda.`;
        }
        const cancelModal = document.getElementById('admin-cancel-appt-modal');
        if (cancelModal) cancelModal.classList.remove('hidden');
      }

      if (btnDeleteBlock) {
        const blockId = btnDeleteBlock.getAttribute('data-block-id');
        if (!blockId) return;
        try {
          btnDeleteBlock.innerText = 'Liberando...';
          const res = await fetch(`/api/v1/booking/time-blocks/${blockId}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Bloqueo eliminado y horarios liberados.', 'success');
            fetchDashboardAppointments();
          } else {
            showToast(data.detail || 'Error al eliminar bloqueo', 'error');
          }
        } catch (err) {
          showToast('Error de conexión al eliminar bloqueo', 'error');
        }
      }
    });
  }

  // 13.6. Búsqueda Global de Pacientes en la Agenda (Multi-Fecha)
  const agendaSearchResultsPanel = document.getElementById('agenda-search-results-panel');
  const agendaSearchResultsList = document.getElementById('agenda-search-results-list');
  const searchResultsPatientTitle = document.getElementById('search-results-patient-title');
  const searchResultsCount = document.getElementById('search-results-count');
  const btnCloseSearchResults = document.getElementById('btn-close-search-results');

  function handleAgendaGlobalSearch() {
    if (!agendaSearchInput || !agendaSearchResultsPanel || !agendaSearchResultsList) return;
    const query = agendaSearchInput.value.trim().toLowerCase();

    if (query.length < 2) {
      agendaSearchResultsPanel.classList.add('hidden');
      agendaSearchResultsList.innerHTML = '';
      return;
    }

    const matches = allAppointments.filter(a => {
      const name = (a.patient_name || '').toLowerCase();
      const phone = (a.patient_whatsapp || '').toLowerCase();
      return name.includes(query) || phone.includes(query);
    });

    matches.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    agendaSearchResultsPanel.classList.remove('hidden');
    if (searchResultsPatientTitle) {
      searchResultsPatientTitle.innerText = `Turnos de "${agendaSearchInput.value.trim()}"`;
    }
    if (searchResultsCount) {
      searchResultsCount.innerText = `${matches.length} ${matches.length === 1 ? 'turno registrado' : 'turnos registrados'} en todo el calendario`;
    }

    if (matches.length === 0) {
      agendaSearchResultsList.innerHTML = `
        <div class="col-span-full p-4 text-center text-xs text-slate-500 font-sans">
          No se encontraron turnos agendados para este paciente.
        </div>
      `;
      return;
    }

    const nowTime = new Date();
    agendaSearchResultsList.innerHTML = matches.map(appt => {
      const aDate = new Date(appt.start_time);
      const isPast = aDate < nowTime;
      const cleanPhone = (appt.patient_whatsapp || '').replace(/\D/g, '');
      const dayStr = `${daysShort[aDate.getDay()]} ${aDate.getDate()}/${aDate.getMonth() + 1}`;
      const timeStr = `${String(aDate.getHours()).padStart(2, '0')}:${String(aDate.getMinutes()).padStart(2, '0')} hs`;

      let statusBadge = '';
      let cancelBtn = '';

      if (appt.status === 'CANCELLED') {
        statusBadge = `<span class="px-2.5 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold font-mono rounded-lg">Cancelado</span>`;
      } else if (isPast) {
        statusBadge = `<span class="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold font-mono rounded-lg">Finalizado</span>`;
      } else {
        statusBadge = `<span class="px-2.5 py-1 bg-navy text-white text-[10px] font-bold font-mono rounded-lg shadow-xs">Activo</span>`;
      }
      return `
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2 shadow-2xs">
          <!-- Fila 1: Fecha/Hora + Nombre Completo + Estado -->
          <div class="flex items-center justify-between gap-2.5">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="px-2 py-1 bg-white border border-slate-200 rounded-lg text-center flex-shrink-0 shadow-2xs">
                <div class="text-[10px] font-bold text-slate-500 font-mono">${dayStr}</div>
                <div class="text-xs font-bold text-navy font-mono">${timeStr}</div>
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-xs font-bold text-navy font-display truncate">${appt.patient_name}</div>
                <div class="text-[11px] text-slate-500 font-sans truncate">${appt.service_name} ${cleanPhone ? `• ${appt.patient_whatsapp}` : ''}</div>
              </div>
            </div>
            ${statusBadge}
          </div>

          <!-- Fila 2: Botones de Acción -->
          ${!isPast && appt.status !== 'CANCELLED' ? `
            <div class="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-200/60">
              <button type="button" data-action="admin-reschedule-appt" data-appt-id="${appt.id}" data-patient-name="${appt.patient_name || 'Paciente'}" data-patient-phone="${cleanPhone || ''}" data-service-id="${appt.service_id || ''}" data-service-name="${appt.service_name || 'Especialidad'}" data-duration="${appt.duration_minutes || 30}" data-slot-info="${dayStr} a las ${timeStr}" class="px-2.5 py-1 bg-white hover:bg-slate-100 text-navy border border-slate-300 rounded-lg text-[10px] font-bold font-mono transition-all shadow-2xs" title="Reprogramar este turno">
                Reprogramar
              </button>
              <button type="button" data-action="admin-cancel-appt" data-appt-id="${appt.id}" data-patient-name="${appt.patient_name || 'Paciente'}" data-slot-info="${dayStr} a las ${timeStr}" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-navy border border-slate-200 rounded-lg text-[10px] font-bold font-mono transition-all" title="Cancelar este turno">
                Cancelar
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  if (agendaSearchInput) {
    agendaSearchInput.addEventListener('input', () => {
      handleAgendaGlobalSearch();
      renderWeeklyAgenda();
    });
  }

  if (btnCloseSearchResults) {
    btnCloseSearchResults.addEventListener('click', () => {
      if (agendaSearchInput) agendaSearchInput.value = '';
      if (agendaSearchResultsPanel) agendaSearchResultsPanel.classList.add('hidden');
      renderWeeklyAgenda();
    });
  }

  if (agendaSearchResultsList) {
    agendaSearchResultsList.addEventListener('click', (e) => {
      const btnCancel = e.target.closest('[data-action="admin-cancel-appt"]');
      if (btnCancel) {
        _pendingAdminCancelApptId = btnCancel.getAttribute('data-appt-id');
        const pName = btnCancel.getAttribute('data-patient-name') || 'el paciente';
        const sInfo = btnCancel.getAttribute('data-slot-info') || 'este horario';
        const cancelDesc = document.getElementById('admin-cancel-modal-desc');
        if (cancelDesc) {
          cancelDesc.innerText = `¿Confirmás la cancelación del turno de ${pName} (${sInfo})? Esta acción liberará el horario de inmediato en la base de datos.`;
        }
        const cancelModal = document.getElementById('admin-cancel-appt-modal');
        if (cancelModal) cancelModal.classList.remove('hidden');
      }
    });
  }

  // Modal Cancelación Directa de Turno (Admin)
  const adminCancelModal = document.getElementById('admin-cancel-appt-modal');
  const btnConfirmAdminCancel = document.getElementById('btn-confirm-admin-cancel');
  const btnAbortAdminCancel = document.getElementById('btn-abort-admin-cancel');

  if (btnAbortAdminCancel && adminCancelModal) {
    btnAbortAdminCancel.addEventListener('click', () => {
      adminCancelModal.classList.add('hidden');
      _pendingAdminCancelApptId = null;
    });
  }

  if (btnConfirmAdminCancel && adminCancelModal) {
    btnConfirmAdminCancel.addEventListener('click', async () => {
      if (!_pendingAdminCancelApptId) {
        adminCancelModal.classList.add('hidden');
        return;
      }
      try {
        btnConfirmAdminCancel.innerText = 'Cancelando...';
        btnConfirmAdminCancel.disabled = true;

        const res = await fetch('/api/v1/booking/cancel-by-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointment_id: _pendingAdminCancelApptId })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          adminCancelModal.classList.add('hidden');
          _pendingAdminCancelApptId = null;
          showToast('Turno cancelado y horario liberado exitosamente.', 'success');
          fetchDashboardAppointments();
        } else {
          showToast(data.detail || 'No se pudo cancelar el turno', 'error');
        }
      } catch (err) {
        showToast('Error al procesar la cancelación', 'error');
      } finally {
        btnConfirmAdminCancel.innerText = 'Sí, Cancelar Turno';
        btnConfirmAdminCancel.disabled = false;
      }
    });
  }

  // ==========================================
  // 13.7. MÓDULO EJECUTIVO: REPROGRAMACIÓN DIRECTA (Admin & Médico)
  // ==========================================
  const adminRescheduleModal = document.getElementById('admin-reschedule-modal');
  const btnCloseAdminReschedule = document.getElementById('btn-close-admin-reschedule');
  const btnAbortAdminReschedule = document.getElementById('btn-abort-admin-reschedule');
  const btnConfirmAdminReschedule = document.getElementById('btn-confirm-admin-reschedule');
  const btnReschedulePrevWeek = document.getElementById('btn-reschedule-prev-week');
  const btnRescheduleNextWeek = document.getElementById('btn-reschedule-next-week');
  const rescheduleWeekLabel = document.getElementById('reschedule-week-label');
  const rescheduleDaysContainer = document.getElementById('reschedule-days-container');
  const rescheduleSelectedDayTitle = document.getElementById('reschedule-selected-day-title');
  const rescheduleFreeCountBadge = document.getElementById('reschedule-free-count-badge');
  const rescheduleSlotsGrid = document.getElementById('reschedule-slots-grid');
  const rescheduleSummaryTime = document.getElementById('reschedule-summary-time');
  const rescheduleModalPatientName = document.getElementById('reschedule-modal-patient-name');
  const rescheduleModalServiceName = document.getElementById('reschedule-modal-service-name');
  const rescheduleModalCurrentSlot = document.getElementById('reschedule-modal-current-slot');

  let _targetRescheduleAppt = null;
  let selectedRescheduleDate = new Date();
  let selectedRescheduleSlot = null;
  let rescheduleWeekOffset = 0;

  function openAdminRescheduleModal(apptData) {
    if (!adminRescheduleModal) return;
    _targetRescheduleAppt = apptData;
    rescheduleWeekOffset = 0;
    selectedRescheduleDate = new Date();
    selectedRescheduleSlot = null;

    if (rescheduleModalPatientName) rescheduleModalPatientName.innerText = apptData.patient_name || 'Paciente';
    if (rescheduleModalServiceName) rescheduleModalServiceName.innerText = `${apptData.service_name || 'Especialidad'} • ${apptData.duration_minutes || 30} min`;
    if (rescheduleModalCurrentSlot) rescheduleModalCurrentSlot.innerText = apptData.slot_info || 'Turno actual';

    renderRescheduleCalendar();
    adminRescheduleModal.classList.remove('hidden');
  }

  function closeAdminRescheduleModal() {
    if (!adminRescheduleModal) return;
    adminRescheduleModal.classList.add('hidden');
    _targetRescheduleAppt = null;
    selectedRescheduleSlot = null;
  }

  if (btnCloseAdminReschedule) btnCloseAdminReschedule.addEventListener('click', closeAdminRescheduleModal);
  if (btnAbortAdminReschedule) btnAbortAdminReschedule.addEventListener('click', closeAdminRescheduleModal);

  if (btnReschedulePrevWeek) {
    btnReschedulePrevWeek.addEventListener('click', () => {
      rescheduleWeekOffset--;
      renderRescheduleCalendar();
    });
  }
  if (btnRescheduleNextWeek) {
    btnRescheduleNextWeek.addEventListener('click', () => {
      rescheduleWeekOffset++;
      renderRescheduleCalendar();
    });
  }

  function renderRescheduleCalendar() {
    if (!rescheduleDaysContainer || !rescheduleSlotsGrid || !_targetRescheduleAppt) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseStart = new Date(today);
    baseStart.setDate(today.getDate() + (rescheduleWeekOffset * 6));

    const daysToRender = [];
    let temp = new Date(baseStart);
    for (let i = 0; i < 6; i++) {
      daysToRender.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }

    if (rescheduleWeekLabel && daysToRender.length > 0) {
      const firstD = daysToRender[0];
      const lastD = daysToRender[daysToRender.length - 1];
      const firstM = monthsFull[firstD.getMonth()];
      const lastM = monthsFull[lastD.getMonth()];
      const year = lastD.getFullYear();
      rescheduleWeekLabel.innerText = firstM === lastM ? `${firstM} ${year}` : `${firstM} / ${lastM} ${year}`;
    }

    let selectedIso = formatLocalDate(selectedRescheduleDate);
    const visibleIsos = daysToRender.map(d => formatLocalDate(d));
    if (!visibleIsos.includes(selectedIso)) {
      selectedRescheduleDate = daysToRender[0];
      selectedIso = formatLocalDate(selectedRescheduleDate);
    }

    const targetDuration = Number(_targetRescheduleAppt.duration_minutes) || 30;

    // Render Días
    rescheduleDaysContainer.innerHTML = daysToRender.map(d => {
      const dIso = formatLocalDate(d);
      const isSelected = (dIso === selectedIso);
      const dayName = daysShort[d.getDay()];
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');

      // Filtrar citas del día excluyendo la cita actual que se está reprogramando
      const dayAppts = allAppointments.filter(a => {
        if (!a.start_time || a.status === 'CANCELLED' || a.id === _targetRescheduleAppt.id) return false;
        return a.start_time.startsWith(dIso);
      });

      const occupiedSlotsDayBtn = new Set();
      dayAppts.forEach(a => {
        const dur = a.duration_minutes || 30;
        const parts = (a.time_str || '').split(':').map(Number);
        if (parts.length < 2 || isNaN(parts[0])) return;
        const startMin = parts[0] * 60 + parts[1];
        const endMin = startMin + dur;
        defaultSlotsTimes.forEach(t => {
          const tp = t.split(':').map(Number);
          const slotMin = tp[0] * 60 + tp[1];
          if (slotMin >= startMin && slotMin < endMin) occupiedSlotsDayBtn.add(t);
        });
      });

      const now = new Date();
      const todayIso = formatLocalDate(now);
      const isPastDay = dIso < todayIso;
      const isToday = dIso === todayIso;
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      const freeCount = defaultSlotsTimes.filter(t => {
        if (occupiedSlotsDayBtn.has(t)) return false;
        const [h, m] = t.split(':').map(Number);
        if (isPastDay || (isToday && (h < currentHour || (h === currentHour && m <= currentMin)))) return false;
        return true;
      }).length;

      return `
        <button type="button" data-reschedule-day-iso="${dIso}" class="reschedule-day-btn min-w-[76px] sm:min-w-0 flex-shrink-0 p-2 sm:p-2.5 rounded-2xl flex flex-col items-center justify-center text-center transition-all ${isSelected ? 'bg-navy text-white shadow-xs font-bold' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'}">
          <span class="text-[9px] font-bold uppercase font-mono ${isSelected ? 'text-amber-400' : 'text-slate-500'}">${dayName}</span>
          <span class="text-xs font-bold font-display my-0.5">${dayNum}/${monthNum}</span>
          <span class="text-[8px] font-semibold font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}">${freeCount} libres</span>
        </button>
      `;
    }).join('');

    rescheduleDaysContainer.querySelectorAll('.reschedule-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const iso = btn.getAttribute('data-reschedule-day-iso');
        const [y, m, d] = iso.split('-').map(Number);
        selectedRescheduleDate = new Date(y, m - 1, d);
        renderRescheduleCalendar();
      });
    });

    // Render Slots
    const dayOfWeekName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][selectedRescheduleDate.getDay()];
    const dayNumber = selectedRescheduleDate.getDate();
    const monthName = monthsFull[selectedRescheduleDate.getMonth()];

    if (rescheduleSelectedDayTitle) {
      rescheduleSelectedDayTitle.innerText = `2. Horarios Libres (${dayOfWeekName} ${dayNumber} de ${monthName})`;
    }

    const dayAppts = allAppointments.filter(a => {
      if (!a.start_time || a.status === 'CANCELLED' || a.id === _targetRescheduleAppt.id) return false;
      return a.start_time.startsWith(selectedIso);
    });

    const occupiedSlotsGrid = new Set();
    dayAppts.forEach(a => {
      const dur = a.duration_minutes || 30;
      const parts = (a.time_str || '').split(':').map(Number);
      if (parts.length < 2 || isNaN(parts[0])) return;
      const startMin = parts[0] * 60 + parts[1];
      const endMin = startMin + dur;
      defaultSlotsTimes.forEach(t => {
        const tp = t.split(':').map(Number);
        const slotMin = tp[0] * 60 + tp[1];
        if (slotMin >= startMin && slotMin < endMin) occupiedSlotsGrid.add(t);
      });
    });

    const now = new Date();
    const todayIso = formatLocalDate(now);
    const isPastDay = selectedIso < todayIso;
    const isToday = selectedIso === todayIso;
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const freeSlots = defaultSlotsTimes.filter(t => {
      if (occupiedSlotsGrid.has(t)) return false;
      const [h, m] = t.split(':').map(Number);
      if (isPastDay || (isToday && (h < currentHour || (h === currentHour && m <= currentMin)))) return false;
      const slotStartMin = h * 60 + m;
      const slotEndMin = slotStartMin + targetDuration;
      for (const occupied of occupiedSlotsGrid) {
        const op = occupied.split(':').map(Number);
        const oMin = op[0] * 60 + op[1];
        if (slotStartMin < oMin + 30 && slotEndMin > oMin) return false;
      }
      return true;
    });

    if (rescheduleFreeCountBadge) {
      rescheduleFreeCountBadge.innerText = `${freeSlots.length} ${freeSlots.length === 1 ? 'horario libre' : 'horarios libres'}`;
    }

    if (freeSlots.length === 0) {
      rescheduleSlotsGrid.innerHTML = `
        <div class="col-span-full p-4 text-center bg-slate-50 rounded-xl border border-slate-200">
          <p class="text-xs text-slate-500 font-sans">No hay horarios disponibles para este día.</p>
        </div>
      `;
      selectedRescheduleSlot = null;
      if (rescheduleSummaryTime) rescheduleSummaryTime.innerText = 'Sin horario seleccionado';
      return;
    }

    if (!freeSlots.includes(selectedRescheduleSlot)) {
      selectedRescheduleSlot = freeSlots[0];
    }

    const sDayNum = String(selectedRescheduleDate.getDate()).padStart(2, '0');
    const sMonthNum = String(selectedRescheduleDate.getMonth() + 1).padStart(2, '0');
    if (rescheduleSummaryTime) {
      rescheduleSummaryTime.innerText = `${dayOfWeekName} ${sDayNum}/${sMonthNum} a las ${selectedRescheduleSlot} hs`;
    }

    rescheduleSlotsGrid.innerHTML = freeSlots.map(timeStr => {
      const isSelected = selectedRescheduleSlot === timeStr;
      return `
        <button type="button" data-reschedule-slot="${timeStr}" class="reschedule-slot-btn py-2.5 sm:py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all ${isSelected ? 'bg-navy text-white shadow-xs border border-navy' : 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 border border-slate-200 shadow-2xs'}">
          ${timeStr} hs
        </button>
      `;
    }).join('');

    rescheduleSlotsGrid.querySelectorAll('.reschedule-slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedRescheduleSlot = btn.getAttribute('data-reschedule-slot');
        renderRescheduleCalendar();
      });
    });
  }

  // Confirmar Reprogramación
  if (btnConfirmAdminReschedule) {
    btnConfirmAdminReschedule.addEventListener('click', async () => {
      if (!_targetRescheduleAppt || !selectedRescheduleSlot) {
        showToast('Por favor seleccioná un día y horario válido.', 'error');
        return;
      }

      const isoDate = formatLocalDate(selectedRescheduleDate);
      const newStartTimeIso = `${isoDate}T${selectedRescheduleSlot}:00`;

      try {
        btnConfirmAdminReschedule.innerText = 'Reprogramando...';
        btnConfirmAdminReschedule.disabled = true;

        const res = await fetch('/api/v1/booking/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: _targetRescheduleAppt.service_id,
            start_time: newStartTimeIso,
            patient_full_name: _targetRescheduleAppt.patient_name,
            patient_whatsapp: _targetRescheduleAppt.patient_phone,
            reschedule_from_id: _targetRescheduleAppt.id
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          const sDayNum = String(selectedRescheduleDate.getDate()).padStart(2, '0');
          const sMonthNum = String(selectedRescheduleDate.getMonth() + 1).padStart(2, '0');
          const pName = _targetRescheduleAppt.patient_name;
          const sTime = selectedRescheduleSlot;
          closeAdminRescheduleModal();
          showToast(`Turno de ${pName} reprogramado para el ${sDayNum}/${sMonthNum} a las ${sTime} hs y notificado por WhatsApp.`, 'success');
          await fetchDashboardAppointments();
          if (agendaSearchResultsPanel && !agendaSearchResultsPanel.classList.contains('hidden')) {
            handleAgendaGlobalSearch();
          }
        } else {
          showToast(data.detail || 'No se pudo reprogramar el turno.', 'error');
        }
      } catch (err) {
        showToast('Error de conexión al reprogramar el turno.', 'error');
      } finally {
        btnConfirmAdminReschedule.innerText = 'Confirmar Reprogramación';
        btnConfirmAdminReschedule.disabled = false;
      }
    });
  }

  // Delegación de eventos para data-action="admin-reschedule-appt"
  document.addEventListener('click', (e) => {
    const btnReschedule = e.target.closest('[data-action="admin-reschedule-appt"]');
    if (btnReschedule) {
      const apptId = btnReschedule.getAttribute('data-appt-id');
      const pName = btnReschedule.getAttribute('data-patient-name') || 'Paciente';
      const pPhone = btnReschedule.getAttribute('data-patient-phone') || '';
      const sId = btnReschedule.getAttribute('data-service-id') || '';
      const sName = btnReschedule.getAttribute('data-service-name') || 'Especialidad';
      const dur = Number(btnReschedule.getAttribute('data-duration')) || 30;
      const sInfo = btnReschedule.getAttribute('data-slot-info') || '';

      openAdminRescheduleModal({
        id: apptId,
        patient_name: pName,
        patient_phone: pPhone,
        service_id: sId,
        service_name: sName,
        duration_minutes: dur,
        slot_info: sInfo
      });
    }
  });

  // Modal de Bloqueo de Disponibilidad (Admin)
  const btnOpenBlockModal = document.getElementById('btn-open-block-modal');
  const adminBlockModal = document.getElementById('admin-block-modal');
  const btnCloseBlockModal = document.getElementById('btn-close-block-modal');
  const formCreateTimeBlock = document.getElementById('form-create-time-block');
  const blockStartDate = document.getElementById('block-start-date');
  const blockEndDate = document.getElementById('block-end-date');
  const blockHoursContainer = document.getElementById('block-hours-container');
  const blockStartTime = document.getElementById('block-start-time');
  const blockEndTime = document.getElementById('block-end-time');
  const blockReason = document.getElementById('block-reason');
  const blockTypeRadios = document.querySelectorAll('input[name="block-type"]');

  if (btnOpenBlockModal && adminBlockModal) {
    btnOpenBlockModal.addEventListener('click', () => {
      const todayIso = formatLocalDate(new Date());
      if (blockStartDate) blockStartDate.value = todayIso;
      if (blockEndDate) blockEndDate.value = todayIso;
      adminBlockModal.classList.remove('hidden');
    });
  }

  if (btnCloseBlockModal && adminBlockModal) {
    btnCloseBlockModal.addEventListener('click', () => {
      adminBlockModal.classList.add('hidden');
    });
  }

  blockTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'hours') {
        if (blockHoursContainer) blockHoursContainer.classList.remove('hidden');
      } else {
        if (blockHoursContainer) blockHoursContainer.classList.add('hidden');
      }
    });
  });

  if (formCreateTimeBlock && adminBlockModal) {
    formCreateTimeBlock.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sDate = blockStartDate.value;
      const eDate = blockEndDate.value;
      const reason = (blockReason.value || '').trim();
      const isHours = document.querySelector('input[name="block-type"]:checked')?.value === 'hours';

      if (!sDate || !eDate) {
        showToast('Por favor seleccioná las fechas de inicio y fin.', 'error');
        return;
      }

      let startIso, endIso, isAllDay;
      if (isHours) {
        const sTime = blockStartTime.value || '09:00';
        const eTime = blockEndTime.value || '18:00';
        startIso = `${sDate}T${sTime}:00`;
        endIso = `${eDate}T${eTime}:00`;
        isAllDay = false;
      } else {
        startIso = `${sDate}T00:00:00`;
        endIso = `${eDate}T23:59:59`;
        isAllDay = true;
      }

      const submitBtn = document.getElementById('btn-submit-time-block');
      try {
        if (submitBtn) {
          submitBtn.innerText = 'Aplicando bloqueo...';
          submitBtn.disabled = true;
        }

        const res = await fetch('/api/v1/booking/time-blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: startIso,
            end_time: endIso,
            reason: reason,
            is_all_day: isAllDay
          })
        });

        const result = await res.json();
        if (res.ok && result.success) {
          adminBlockModal.classList.add('hidden');
          formCreateTimeBlock.reset();
          showToast('Bloqueo de agenda aplicado exitosamente.', 'success');
          fetchDashboardAppointments();
        } else {
          showToast(result.detail || 'No se pudo aplicar el bloqueo', 'error');
        }
      } catch (err) {
        showToast('Error de conexión al aplicar el bloqueo', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>Aplicar Bloqueo de Agenda</span>
          `;
          submitBtn.disabled = false;
        }
      }
    });
  }

  // 14. Inicialización
  fetchServices();
  fetchDashboardAppointments();
  startDashboardAutoSync();
});
