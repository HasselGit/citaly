document.addEventListener('DOMContentLoaded', () => {
  // 1. Elementos DOM de Pestañas
  const tabPanel = document.getElementById('view-panel');
  const tabReservas = document.getElementById('view-reservas');
  const tabReprogramados = document.getElementById('view-reprogramados');
  const tabWhatsapp = document.getElementById('view-whatsapp');

  const navTabBtns = document.querySelectorAll('.nav-tab-btn');

  // Elementos de Reservas y Agenda
  const reservasNormalView = document.getElementById('reservas-normal-view');
  const reservasAgendaView = document.getElementById('reservas-agenda-view');
  const agendaContainer = document.getElementById('agenda-timeline-container');
  const agendaSlotsSheet = document.getElementById('agenda-slots-sheet');
  const agendaDayPillsContainer = document.getElementById('agenda-day-pills-container');
  const agendaCurrentDayTitle = document.getElementById('agenda-current-day-title');
  const agendaCurrentDayStats = document.getElementById('agenda-current-day-stats');
  const btnToggleFullWeek = document.getElementById('btn-toggle-full-week');

  const reprogramadosListContainer = document.getElementById('reprogramados-list-container');
  const reprogramadosCounterBadge = document.getElementById('reprogramados-counter-badge');
  const badgeCountReprogramados = document.getElementById('badge-count-reprogramados');
  const mobileBadgeReprogramados = document.getElementById('mobile-badge-reprogramados');

  const whatsappLogContainer = document.getElementById('whatsapp-log-container');
  const searchInput = document.getElementById('search-patient-input');
  const searchFilterCard = document.getElementById('search-filter-card');
  const specialtyFilterCard = document.getElementById('specialty-filter-card');
  const timeFilterContainer = document.getElementById('time-filter-container');

  // KPIs
  const metricTotalTurnos = document.getElementById('metric-total-turnos');
  const metricConfirmados = document.getElementById('metric-confirmados');
  const metricPendientes = document.getElementById('metric-pendientes');
  const metricOcupacion = document.getElementById('metric-ocupacion');
  const liveStatusText = document.getElementById('live-status-text');

  // Botones de Modo de Vista
  const btnViewCards = document.getElementById('btn-view-cards');
  const btnViewTable = document.getElementById('btn-view-table');
  const btnViewAgenda = document.getElementById('btn-view-agenda');

  // Filtros de Tiempo
  const filterAllBtn = document.getElementById('filter-all');
  const filterDayBtn = document.getElementById('filter-day');
  const filterWeekBtn = document.getElementById('filter-week');
  const filterMonthBtn = document.getElementById('filter-month');

  const btnCopyPatientLink = document.getElementById('btn-copy-patient-link');
  const btnCopyCardLink = document.getElementById('btn-copy-card-link');
  const btnManualSync = document.getElementById('btn-manual-sync');
  const syncIcon = document.getElementById('sync-icon');
  const toastContainer = document.getElementById('toast-container');

  // Estado Local
  let allAppointments = [];
  let currentFilter = 'all'; // 'all', 'day', 'week', 'month'
  let selectedSpecialty = 'all';
  let currentViewMode = 'agenda'; // 'agenda' (default alta claridad) | 'cards' | 'table'
  let syncInterval = null;
  let selectedAgendaDate = new Date();
  let showFullWeekGrid = false;

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

  // 2. Toast System
  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white';
    const icon = type === 'success' ? '✓' : '⚠️';
    
    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl ${bgClass} text-xs font-bold font-mono transition-all transform translate-y-2 opacity-0 animate-in fade-in duration-200`;
    toast.innerHTML = `
      <span class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">${icon}</span>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // 3. Copiar Link del Consultorio
  function copyPatientLink() {
    const url = window.location.origin + '/';
    navigator.clipboard.writeText(url).then(() => {
      showToast('¡Enlace del consultorio copiado al portapapeles!');
    }).catch(() => {
      showToast('Enlace: ' + url, 'success');
    });
  }

  if (btnCopyPatientLink) btnCopyPatientLink.addEventListener('click', copyPatientLink);
  if (btnCopyCardLink) btnCopyCardLink.addEventListener('click', copyPatientLink);

  // 4. Navegación por Pestañas (SPA Tab Switching)
  function showTab(tabName) {
    if (tabPanel) tabPanel.style.display = tabName === 'panel' ? 'block' : 'none';
    if (tabReservas) tabReservas.style.display = tabName === 'reservas' ? 'block' : 'none';
    if (tabReprogramados) tabReprogramados.style.display = tabName === 'reprogramados' ? 'block' : 'none';
    if (tabWhatsapp) tabWhatsapp.style.display = tabName === 'whatsapp' ? 'block' : 'none';

    updateNavStyles(tabName);

    if (tabName === 'reservas') {
      renderAgenda();
    } else if (tabName === 'reprogramados') {
      renderReprogramados();
    } else if (tabName === 'whatsapp') {
      renderWhatsAppLogs();
    }
  }

  function updateNavStyles(activeTab) {
    navTabBtns.forEach(btn => {
      const tabTarget = btn.getAttribute('data-tab');
      const isDesktop = btn.closest('aside') !== null;
      const isActive = (tabTarget === activeTab);

      if (isDesktop) {
        if (isActive) {
          btn.className = 'nav-tab-btn w-full flex items-center justify-between bg-slate-900 text-white rounded-xl px-4 py-3 font-bold text-sm transition-all shadow-sm';
        } else {
          btn.className = 'nav-tab-btn w-full flex items-center justify-between text-slate-600 hover:bg-slate-100 hover:translate-x-1 transition-all duration-200 rounded-xl px-4 py-3 font-semibold text-sm';
        }
      } else {
        if (isActive) {
          btn.className = 'nav-tab-btn relative flex flex-col items-center p-1 text-amber-600 font-bold';
        } else {
          btn.className = 'nav-tab-btn relative flex flex-col items-center p-1 text-slate-500';
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
        renderSpecialtyPills();
        renderAgenda();
        renderReprogramados();
        renderWhatsAppLogs();
        updateMetrics();
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
      showToast('Datos sincronizados en vivo con Supabase');
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

  // 7. Renderizar Botones de Especialidad
  function renderSpecialtyPills() {
    const specialtyContainer = document.getElementById('specialty-pills-container');
    if (!specialtyContainer) return;

    const specialties = ['all'];
    allAppointments.forEach(a => {
      if (a.service_name && !specialties.includes(a.service_name)) {
        specialties.push(a.service_name);
      }
    });

    specialtyContainer.innerHTML = specialties.map(s => {
      const isSelected = selectedSpecialty === s;
      const label = s === 'all' ? 'Ver Todos' : s;
      const bgClass = isSelected ? 'bg-primary text-white shadow-sm font-bold' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold';
      return `<button data-specialty="${s}" class="specialty-pill-btn px-4 py-2 ${bgClass} text-xs rounded-xl transition-all whitespace-nowrap">${label}</button>`;
    }).join('');

    specialtyContainer.querySelectorAll('.specialty-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedSpecialty = btn.getAttribute('data-specialty');
        renderSpecialtyPills();
        renderAgenda();
      });
    });
  }

  // 8. Filtrar Lista por Tiempo
  function filterByTime(items) {
    if (currentFilter === 'all') return items;

    const now = new Date();
    const todayStr = formatLocalDate(now);

    if (currentFilter === 'day') {
      return items.filter(a => {
        if (!a.start_time) return true;
        return a.start_time.startsWith(todayStr);
      });
    }

    if (currentFilter === 'week') {
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay() || 7;
      startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return items.filter(a => {
        if (!a.start_time) return true;
        const apptDate = new Date(a.start_time);
        return apptDate >= startOfWeek && apptDate <= endOfWeek;
      });
    }

    if (currentFilter === 'month') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      return items.filter(a => {
        if (!a.start_time) return true;
        const apptDate = new Date(a.start_time);
        return apptDate.getMonth() === currentMonth && apptDate.getFullYear() === currentYear;
      });
    }

    return items;
  }

  // 9. Renderizar Agenda General (Switch entre Agenda Semanal, Tarjetas y Tabla)
  function renderAgenda() {
    if (!reservasNormalView || !reservasAgendaView) return;

    if (currentViewMode === 'agenda') {
      reservasNormalView.style.display = 'none';
      reservasAgendaView.style.display = 'block';
      if (searchFilterCard) searchFilterCard.style.display = 'none';
      if (specialtyFilterCard) specialtyFilterCard.style.display = 'none';
      if (timeFilterContainer) timeFilterContainer.style.display = 'none';
      renderWeeklyAgenda();
      return;
    }

    reservasNormalView.style.display = 'block';
    reservasAgendaView.style.display = 'none';
    if (searchFilterCard) searchFilterCard.style.display = 'block';
    if (specialtyFilterCard) specialtyFilterCard.style.display = 'block';
    if (timeFilterContainer) timeFilterContainer.style.display = 'flex';

    let filtered = [...allAppointments];
    filtered = filterByTime(filtered);

    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter(a => a.service_name === selectedSpecialty);
    }

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
          <p class="text-sm font-semibold text-slate-600">No hay turnos registrados con este filtro.</p>
          <p class="text-xs text-slate-400 mt-1">Los turnos agendados por los pacientes aparecerán aquí en vivo.</p>
        </div>
      `;
      return;
    }

    // Modo Vista Tabla
    if (currentViewMode === 'table') {
      agendaContainer.innerHTML = `
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr class="bg-slate-900 text-white font-mono text-[11px] uppercase tracking-wider">
                <th class="py-3 px-4 rounded-l-xl">Paciente</th>
                <th class="py-3 px-4">Tratamiento</th>
                <th class="py-3 px-4">Fecha y Horario</th>
                <th class="py-3 px-4">Duración</th>
                <th class="py-3 px-4 rounded-r-xl">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${filtered.map(a => {
                let statusBadge = `<span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full font-mono text-[11px]">🟢 Confirmado</span>`;
                if (a.status === 'CANCELLED') {
                  statusBadge = `<span class="px-2.5 py-1 bg-red-100 text-red-800 font-bold rounded-full font-mono text-[11px]">🔴 Cancelado</span>`;
                }

                const initials = (a.patient_name || 'P').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                return `
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="py-3.5 px-4 font-bold text-slate-900">
                      <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-extrabold font-mono flex-shrink-0">
                          ${initials}
                        </div>
                        <div>
                          <div class="font-extrabold text-slate-900">${a.patient_name}</div>
                          <div class="text-[11px] text-slate-400 font-normal font-mono">📱 ${a.patient_whatsapp || 'Sin Celular'}</div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3.5 px-4">
                      <span class="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-bold text-[11px] font-mono">${a.service_name}</span>
                    </td>
                    <td class="py-3.5 px-4 font-mono font-bold text-slate-800">
                      📅 ${a.date_formatted} — ⏰ ${a.time_str} hs
                    </td>
                    <td class="py-3.5 px-4 font-mono text-slate-500">
                      ⏱ ${a.duration_minutes || 30} min
                    </td>
                    <td class="py-3.5 px-4">
                      ${statusBadge}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    // Modo Vista Tarjetas
    agendaContainer.innerHTML = filtered.map(a => {
      let statusBadge = `<span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full font-mono inline-flex items-center gap-1 shadow-xs">🟢 Confirmado</span>`;
      let borderClass = 'border-l-emerald-500';

      if (a.status === 'CANCELLED') {
        statusBadge = `<span class="px-2.5 py-1 bg-red-100 text-red-800 text-[11px] font-bold rounded-full font-mono inline-flex items-center gap-1 shadow-xs">🔴 Cancelado</span>`;
        borderClass = 'border-l-red-400 opacity-80';
      }

      const initials = (a.patient_name || 'P').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const cleanPhone = (a.patient_whatsapp || '').replace(/\D/g, '');

      return `
        <div class="glass-card rounded-2xl p-4 md:p-5 border-l-4 ${borderClass} transition-all hover:shadow-md bg-white">
          <div class="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3 overflow-hidden">
              <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-xs font-mono shadow-sm flex-shrink-0">
                ${initials}
              </div>
              <div class="overflow-hidden">
                <h4 class="font-extrabold text-slate-900 text-sm font-display leading-tight truncate">${a.patient_name}</h4>
                ${cleanPhone ? `
                  <a href="https://wa.me/${cleanPhone}" target="_blank" class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline font-mono mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    <span>${a.patient_whatsapp}</span>
                  </a>
                ` : `<span class="text-[11px] text-slate-400 font-mono">Sin celular</span>`}
              </div>
            </div>
            <div class="flex-shrink-0">${statusBadge}</div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg font-bold text-[11px] font-mono">
              ${a.service_name} (${a.duration_minutes || 30} min)
            </span>
            <div class="px-3 py-1 bg-slate-900 text-white rounded-lg font-mono text-[11px] font-bold shadow-sm">
              📅 ${a.date_formatted} • ⏰ ${a.time_str} hs
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 10. Renderizar Agenda Semanal de Alta Claridad (+40 Años Friendly)
  function renderWeeklyAgenda() {
    if (!agendaDayPillsContainer || !agendaSlotsSheet) return;

    const today = new Date();
    const daysToRender = [];
    
    // Generar los próximos 6 días laborales (Lunes a Sábado o desde hoy)
    let temp = new Date(today);
    for (let i = 0; i < 6; i++) {
      daysToRender.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }

    const selectedIso = formatLocalDate(selectedAgendaDate);

    // Renderizar Píldoras Grandes de Días
    agendaDayPillsContainer.innerHTML = daysToRender.map(d => {
      const dIso = formatLocalDate(d);
      const isSelected = (dIso === selectedIso);
      const dayName = daysShort[d.getDay()];
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');

      // Contar turnos ocupados en ese día
      const dayAppts = allAppointments.filter(a => {
        if (!a.start_time || a.status === 'CANCELLED') return false;
        return a.start_time.startsWith(dIso);
      });

      const count = dayAppts.length;
      const countLabel = count === 0 ? 'Libre' : `${count} ${count === 1 ? 'turno' : 'turnos'}`;
      const countBadgeClass = count === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-900 text-white';

      const activeCardClass = isSelected
        ? 'bg-slate-900 text-white shadow-lg border-2 border-slate-900 scale-102'
        : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 shadow-sm';

      return `
        <button data-day-iso="${dIso}" class="agenda-day-btn p-3 rounded-2xl flex flex-col items-center justify-between text-center transition-all ${activeCardClass}">
          <span class="text-[11px] font-extrabold uppercase font-mono tracking-wider ${isSelected ? 'text-amber-400' : 'text-slate-500'}">${dayName}</span>
          <span class="text-xl font-extrabold font-display my-1">${dayNum}/${monthNum}</span>
          <span class="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${isSelected ? 'bg-amber-400 text-slate-900' : countBadgeClass}">
            ${countLabel}
          </span>
        </button>
      `;
    }).join('');

    // Listener para seleccionar día
    agendaDayPillsContainer.querySelectorAll('.agenda-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const iso = btn.getAttribute('data-day-iso');
        const [y, m, d] = iso.split('-').map(Number);
        selectedAgendaDate = new Date(y, m - 1, d);
        renderWeeklyAgenda();
      });
    });

    // Actualizar Encabezado del Día Seleccionado
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
    const freeCount = Math.max(0, defaultSlotsTimes.length - occupiedCount);

    if (agendaCurrentDayStats) {
      agendaCurrentDayStats.innerText = `${occupiedCount} ${occupiedCount === 1 ? 'turno agendado' : 'turnos agendados'} • ${freeCount} horarios disponibles`;
    }

    // Renderizar Grilla de Horarios de Alta Claridad (+40 Años Friendly)
    agendaSlotsSheet.innerHTML = defaultSlotsTimes.map(timeSlot => {
      const appt = dayAppointments.find(a => a.time_str === timeSlot);

      if (appt) {
        // Horario OCUPADO — Alto contraste Titanium Navy
        const cleanPhone = (appt.patient_whatsapp || '').replace(/\D/g, '');
        return `
          <div class="p-4 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800 flex items-center justify-between gap-3 transition-all">
            <div class="flex items-center gap-3.5 overflow-hidden">
              <div class="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 font-mono font-extrabold text-sm border border-amber-500/30 flex-shrink-0">
                ⏰ ${timeSlot} hs
              </div>
              <div class="overflow-hidden">
                <div class="text-base font-extrabold font-display text-white truncate">${appt.patient_name}</div>
                <div class="text-xs text-slate-300 font-sans mt-0.5 truncate">
                  🦷 ${appt.service_name}
                  ${cleanPhone ? `• <a href="https://wa.me/${cleanPhone}" target="_blank" class="text-emerald-400 hover:underline font-mono">📱 ${appt.patient_whatsapp}</a>` : ''}
                </div>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono rounded-full inline-block">
                ● Ocupado
              </span>
            </div>
          </div>
        `;
      } else {
        // Horario DISPONIBLE / LIBRE — Verde menta suave de alta legibilidad
        return `
          <div class="p-4 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100 border-2 border-dashed border-emerald-300 transition-all flex items-center justify-between gap-3">
            <div class="flex items-center gap-3.5">
              <div class="px-3 py-1.5 rounded-xl bg-white text-emerald-900 font-mono font-extrabold text-sm border border-emerald-200 shadow-xs flex-shrink-0">
                ⏰ ${timeSlot} hs
              </div>
              <div>
                <span class="text-sm font-extrabold text-emerald-950 font-display block">🟢 DISPONIBLE / LIBRE</span>
                <span class="text-xs text-emerald-700 font-sans block">Horario disponible para agendar</span>
              </div>
            </div>
            <div class="flex-shrink-0">
              <span class="px-3 py-1 bg-white text-emerald-800 border border-emerald-200 text-xs font-extrabold font-mono rounded-xl shadow-xs">
                Libre
              </span>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  // 11. Renderizar Turnos Reprogramados (Módulo Reprogramados con Auto-Expiración)
  function renderReprogramados() {
    if (!reprogramadosListContainer) return;

    // Filtrar citas que fueron reprogramadas y cuya fecha aún no pasó (auto-expiración)
    const reprogramados = allAppointments.filter(a => {
      return a.was_rescheduled && !a.is_past && a.status !== 'CANCELLED';
    });

    // Actualizar contadores
    const count = reprogramados.length;
    if (reprogramadosCounterBadge) {
      reprogramadosCounterBadge.innerText = `${count} ${count === 1 ? 'Reprogramado Activo' : 'Reprogramados Activos'}`;
    }

    if (badgeCountReprogramados) {
      badgeCountReprogramados.innerText = count;
      badgeCountReprogramados.style.display = count > 0 ? 'inline-block' : 'none';
    }

    if (mobileBadgeReprogramados) {
      mobileBadgeReprogramados.style.display = count > 0 ? 'block' : 'none';
    }

    // Actualizar banner inteligente en Panel General
    const panelAlert = document.getElementById('panel-reprogramados-alert');
    const panelAlertBadge = document.getElementById('panel-alert-count-badge');
    const panelAlertText = document.getElementById('panel-alert-summary-text');
    const btnGotoReprog = document.getElementById('btn-goto-reprogramados');

    if (panelAlert) {
      if (count > 0) {
        panelAlert.style.display = 'flex';
        if (panelAlertBadge) panelAlertBadge.innerText = `${count} ${count === 1 ? 'nuevo' : 'nuevos'}`;
        if (panelAlertText) {
          const first = reprogramados[0];
          panelAlertText.innerText = `${first.patient_name} reprogramó para el ${first.date_formatted} a las ${first.time_formatted} (${first.service_name}).`;
        }
      } else {
        panelAlert.style.display = 'none';
      }
    }

    if (btnGotoReprog && !btnGotoReprog._hasListener) {
      btnGotoReprog._hasListener = true;
      btnGotoReprog.addEventListener('click', () => showTab('reprogramados'));
    }

    if (reprogramados.length === 0) {
      reprogramadosListContainer.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xl mx-auto mb-3">
            🔄
          </div>
          <p class="text-sm font-extrabold text-slate-800 font-display">No hay turnos reprogramados activos</p>
          <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Cuando un paciente cambie la fecha u hora de su turno original, aparecerá aquí destacado y se archivará automáticamente cuando pase la fecha del turno.
          </p>
        </div>
      `;
      return;
    }

    reprogramadosListContainer.innerHTML = reprogramados.map(a => {
      const cleanPhone = (a.patient_whatsapp || '').replace(/\D/g, '');
      return `
        <div class="glass-card rounded-2xl p-5 md:p-6 border-l-4 border-l-amber-500 transition-all hover:shadow-md bg-white">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm font-mono flex-shrink-0">
                🔄
              </div>
              <div>
                <h4 class="font-extrabold text-slate-900 text-base font-display">${a.patient_name}</h4>
                ${cleanPhone ? `
                  <a href="https://wa.me/${cleanPhone}" target="_blank" class="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline font-mono">
                    💬 ${a.patient_whatsapp} (Abrir WhatsApp)
                  </a>
                ` : `<span class="text-xs text-slate-400 font-mono">Sin celular</span>`}
              </div>
            </div>
            <span class="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-full font-mono self-start sm:self-auto border border-amber-300">
              ● Turno Reprogramado
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span class="text-[11px] font-bold text-slate-500 uppercase font-mono block mb-1">Tratamiento</span>
              <span class="text-sm font-extrabold text-slate-900 font-display">${a.service_name} (${a.duration_minutes || 30} min)</span>
            </div>
            <div class="p-3.5 bg-slate-900 text-white rounded-xl shadow-xs">
              <span class="text-[11px] font-bold text-amber-400 uppercase font-mono block mb-1">Nueva Fecha y Horario</span>
              <span class="text-sm font-extrabold text-white font-mono">📅 ${a.date_formatted} • ⏰ ${a.time_formatted}</span>
            </div>
          </div>

          <div class="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <span>💡</span> Este turno se archivará automáticamente cuando pase la fecha del ${a.date_formatted}.
          </div>
        </div>
      `;
    }).join('');
  }

  // 12. Renderizar Logs de WhatsApp
  function renderWhatsAppLogs() {
    if (!whatsappLogContainer) return;

    const logs = [];
    allAppointments.forEach(a => {
      if (a.status === 'SCHEDULED' || a.status === 'CONFIRMED' || a.status === 'REMINDER_SENT') {
        logs.push({
          patient_name: a.patient_name,
          phone: a.patient_whatsapp,
          type: a.was_rescheduled ? 'REPROGRAMACIÓN CONFIRMADA' : (a.status === 'REMINDER_SENT' ? 'RECORDATORIO 24H' : 'CONFIRMACIÓN INMEDIATA'),
          status: 'ENTREGADO ✔',
          time: `${a.date_formatted} a las ${a.time_str} hs`
        });
      }
    });

    if (logs.length === 0) {
      whatsappLogContainer.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p class="text-xs font-semibold text-slate-600">No hay notificaciones enviadas aún.</p>
        </div>
      `;
      return;
    }

    whatsappLogContainer.innerHTML = logs.map(l => `
      <div class="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm font-mono">
            💬
          </div>
          <div>
            <div class="text-xs font-bold text-slate-900 font-mono">${l.type} — ${l.patient_name}</div>
            <div class="text-[11px] text-slate-500 font-mono">📱 ${l.phone}</div>
          </div>
        </div>
        <div class="text-right font-mono">
          <span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md block mb-0.5">${l.status}</span>
          <span class="text-[10px] text-slate-400">${l.time}</span>
        </div>
      </div>
    `).join('');
  }

  // 13. Actualizar KPIs del Dashboard
  function updateMetrics() {
    const total = allAppointments.length;
    const confirmados = allAppointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED' || a.status === 'REMINDER_SENT').length;
    const cancelados = allAppointments.filter(a => a.status === 'CANCELLED').length;
    const activos = total - cancelados;

    if (metricTotalTurnos) metricTotalTurnos.innerText = total;
    if (metricConfirmados) metricConfirmados.innerText = confirmados;
    if (metricPendientes) metricPendientes.innerText = Math.max(0, activos - confirmados);
    
    if (metricOcupacion) {
      const rate = total > 0 ? Math.round((confirmados / total) * 100) : 100;
      metricOcupacion.innerText = `${rate}%`;
    }
  }

  // 14. Listeners de Modo de Vista (Tarjetas / Tabla / Agenda Semanal)
  function setViewMode(mode) {
    currentViewMode = mode;

    [btnViewCards, btnViewTable, btnViewAgenda].forEach(b => {
      if (b) {
        b.classList.remove('bg-primary', 'text-white');
        b.classList.add('text-slate-700');
      }
    });

    if (mode === 'cards' && btnViewCards) {
      btnViewCards.classList.add('bg-primary', 'text-white');
      btnViewCards.classList.remove('text-slate-700');
    } else if (mode === 'table' && btnViewTable) {
      btnViewTable.classList.add('bg-primary', 'text-white');
      btnViewTable.classList.remove('text-slate-700');
    } else if (mode === 'agenda' && btnViewAgenda) {
      btnViewAgenda.classList.add('bg-primary', 'text-white');
      btnViewAgenda.classList.remove('text-slate-700');
    }

    renderAgenda();
  }

  if (btnViewCards) btnViewCards.addEventListener('click', () => setViewMode('cards'));
  if (btnViewTable) btnViewTable.addEventListener('click', () => setViewMode('table'));
  if (btnViewAgenda) btnViewAgenda.addEventListener('click', () => setViewMode('agenda'));

  if (searchInput) searchInput.addEventListener('input', renderAgenda);

  const timeFilterBtns = [
    { btn: filterAllBtn, key: 'all' },
    { btn: filterDayBtn, key: 'day' },
    { btn: filterWeekBtn, key: 'week' },
    { btn: filterMonthBtn, key: 'month' }
  ];

  timeFilterBtns.forEach(({ btn, key }) => {
    if (btn) {
      btn.addEventListener('click', () => {
        timeFilterBtns.forEach(item => {
          if (item.btn) {
            item.btn.classList.remove('bg-primary', 'text-white');
            item.btn.classList.add('bg-white', 'text-slate-700');
          }
        });
        btn.classList.remove('bg-white', 'text-slate-700');
        btn.classList.add('bg-primary', 'text-white');

        currentFilter = key;
        renderAgenda();
      });
    }
  });

  // Inicializar por defecto en Agenda Semanal (+40 friendly)
  setViewMode('agenda');
  fetchDashboardAppointments();
  startDashboardAutoSync();
});
