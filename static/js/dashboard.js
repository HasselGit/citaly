document.addEventListener('DOMContentLoaded', () => {
  // 1. Elementos DOM
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
  const metricOcupacion = document.getElementById('metric-ocupacion');
  const liveStatusText = document.getElementById('live-status-text');

  const filterAllBtn = document.getElementById('filter-all');
  const filterDayBtn = document.getElementById('filter-day');
  const filterWeekBtn = document.getElementById('filter-week');
  const filterMonthBtn = document.getElementById('filter-month');

  const btnCopyPatientLink = document.getElementById('btn-copy-patient-link');
  const btnCopyCardLink = document.getElementById('btn-copy-card-link');
  const btnManualSync = document.getElementById('btn-manual-sync');
  const syncIcon = document.getElementById('sync-icon');

  const cancelModal = document.getElementById('cancel-modal');
  const btnModalClose = document.getElementById('btn-modal-close');
  const btnModalConfirmCancel = document.getElementById('btn-modal-confirm-cancel');
  const toastContainer = document.getElementById('toast-container');

  let allAppointments = [];
  let currentFilter = 'all'; // 'all', 'day', 'week', 'month'
  let selectedSpecialty = 'all';
  let syncInterval = null;
  let activeCancelToken = null;

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
    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

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
    if (tabWhatsapp) tabWhatsapp.style.display = tabName === 'whatsapp' ? 'block' : 'none';

    updateNavStyles(tabName);
    renderAgenda();
    renderWhatsAppLogs();
  }

  function updateNavStyles(activeTab) {
    navTabBtns.forEach(btn => {
      const tabTarget = btn.getAttribute('data-tab');
      const isDesktop = btn.closest('aside') !== null;
      const isActive = (tabTarget === activeTab);

      if (isDesktop) {
        if (isActive) {
          btn.className = 'nav-tab-btn w-full flex items-center gap-3 bg-slate-900 text-white rounded-xl px-4 py-3 font-bold text-sm transition-all shadow-sm';
        } else {
          btn.className = 'nav-tab-btn w-full flex items-center gap-3 text-slate-600 hover:bg-slate-100 hover:translate-x-1 transition-all duration-200 rounded-xl px-4 py-3 font-semibold text-sm';
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

  // 6. Auto-Sincronización en vivo cada 4 segundos
  function startDashboardAutoSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboardAppointments();
      }
    }, 4000);
  }

  // 7. Renderizar Botones de Especialidad Dinámicos
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

  // 8. Filtrar Lista por Tiempo (Hoy, Semana, Mes, Todos)
  function filterByTime(items) {
    if (currentFilter === 'all') return items;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

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

  // 9. Renderizar Desglose de Turnos (Vista Reservas)
  function renderAgenda() {
    if (!agendaContainer) return;

    let filtered = [...allAppointments];

    // Aplicar filtro de tiempo
    filtered = filterByTime(filtered);

    // Aplicar filtro de especialidad
    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter(a => a.service_name === selectedSpecialty);
    }

    // Aplicar filtro de búsqueda
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
          <p class="text-sm font-semibold text-slate-600">No hay turnos registrados con este filtro.</p>
          <p class="text-xs text-slate-400 mt-1">Los turnos agendados por los pacientes aparecerán aquí en vivo.</p>
        </div>
      `;
      return;
    }

    agendaContainer.innerHTML = filtered.map(a => {
      let statusBadge = '';
      let borderClass = 'border-slate-300 bg-slate-50/60';

      if (a.status === 'SCHEDULED' || a.status === 'CONFIRMED') {
        statusBadge = `<span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1 font-mono">🟢 Confirmado</span>`;
        borderClass = 'border-emerald-500 bg-emerald-50/40';
      } else if (a.status === 'REMINDER_SENT') {
        statusBadge = `<span class="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg flex items-center gap-1 font-mono">🟡 Recordatorio Enviado</span>`;
        borderClass = 'border-amber-500 bg-amber-50/40';
      } else if (a.status === 'CANCELLED') {
        statusBadge = `<span class="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg flex items-center gap-1 font-mono">🔴 Cancelado / Liberado</span>`;
        borderClass = 'border-red-400 bg-red-50/40 opacity-75';
      }

      // Iniciales avatar
      const initials = (a.patient_name || 'P').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      
      // Formatear fecha bonita
      let formattedDate = a.start_time ? a.start_time.split('T')[0] : '';
      if (formattedDate) {
        const parts = formattedDate.split('-');
        if (parts.length === 3) formattedDate = `${parts[2]}/${parts[1]}`;
      }

      const showCancelBtn = a.status !== 'CANCELLED' && a.token_cancellation;

      return `
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border-l-4 ${borderClass} transition-all hover:translate-x-1 bg-white shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-xs font-display flex-shrink-0">
              ${initials}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-slate-900 text-sm font-display">${a.patient_name || 'Paciente'}</span>
                <span class="text-xs font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md font-mono">${a.service_name || 'Especialidad'}</span>
              </div>
              <div class="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                <span>📱 ${a.patient_whatsapp || 'Sin Celular'}</span>
                <span>⏱ ${a.duration_minutes || 30} min</span>
              </div>
            </div>
          </div>

          <div class="sm:ml-auto flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div class="text-right">
              <div class="text-xs font-extrabold text-slate-900 font-mono">📅 ${formattedDate} — ⏰ ${a.time_str || '10:00'} hs</div>
              <div class="mt-1">${statusBadge}</div>
            </div>

            ${showCancelBtn ? `
              <button data-token="${a.token_cancellation}" data-patient="${a.patient_name || 'Paciente'}" data-date="${formattedDate} a las ${a.time_str || '10:00'} hs" class="btn-trigger-cancel px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1">
                <span>❌</span>
                <span>Liberar</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Listener para cancelar cita desde dashboard
    document.querySelectorAll('.btn-trigger-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCancelToken = btn.getAttribute('data-token');
        const pName = btn.getAttribute('data-patient');
        const pDate = btn.getAttribute('data-date');

        const infoEl = document.getElementById('cancel-modal-info');
        if (infoEl) {
          infoEl.innerText = `¿Confirma la cancelación del turno de ${pName} para el ${pDate}? El horario quedará libre de inmediato en la web de reservas.`;
        }
        if (cancelModal) cancelModal.classList.remove('hidden');
      });
    });
  }

  // 10. Confirmación de Cancelación desde Modal
  if (btnModalClose) {
    btnModalClose.addEventListener('click', () => {
      if (cancelModal) cancelModal.classList.add('hidden');
      activeCancelToken = null;
    });
  }

  if (btnModalConfirmCancel) {
    btnModalConfirmCancel.addEventListener('click', async () => {
      if (!activeCancelToken) return;

      try {
        btnModalConfirmCancel.innerText = 'Liberando horario...';
        btnModalConfirmCancel.disabled = true;

        const res = await fetch(`/api/v1/booking/cancel/${activeCancelToken}`, { method: 'POST' });
        const result = await res.json();

        if (result.success) {
          showToast('Turno cancelado y horario liberado exitosamente');
          if (cancelModal) cancelModal.classList.add('hidden');
          activeCancelToken = null;
          fetchDashboardAppointments();
        } else {
          showToast(result.detail || 'Error al cancelar la cita', 'error');
        }
      } catch (e) {
        showToast('Error al conectar con el servidor', 'error');
      } finally {
        btnModalConfirmCancel.innerText = 'Sí, Cancelar y Liberar Horario';
        btnModalConfirmCancel.disabled = false;
      }
    });
  }

  // 11. Renderizar Logs de WhatsApp
  function renderWhatsAppLogs() {
    if (!whatsappLogContainer) return;

    const logs = [];
    allAppointments.forEach(a => {
      if (a.status === 'SCHEDULED' || a.status === 'CONFIRMED' || a.status === 'REMINDER_SENT') {
        let datePart = a.start_time ? a.start_time.split('T')[0] : '';
        if (datePart) {
          const p = datePart.split('-');
          if (p.length === 3) datePart = `${p[2]}/${p[1]}`;
        }

        logs.push({
          patient_name: a.patient_name,
          phone: a.patient_whatsapp,
          type: a.status === 'REMINDER_SENT' ? 'RECORDATORIO 24H' : 'CONFIRMACIÓN INMEDIATA',
          status: 'ENTREGADO ✔',
          time: `${datePart} a las ${a.time_str || '10:00'} hs`
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

  // 12. Actualizar KPIs del Dashboard
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

  // 13. Listeners de Filtros
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

  // Inicializar y encender auto-sync
  fetchDashboardAppointments();
  startDashboardAutoSync();
});
