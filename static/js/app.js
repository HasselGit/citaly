document.addEventListener('DOMContentLoaded', () => {
  function getInitialBookingDate() {
    const d = new Date();
    if (d.getHours() >= 18) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  let selectedServiceId = "s1";
  let selectedServiceName = "Ortodoncia / Control";
  let selectedDate = getInitialBookingDate();
  let selectedTimeSlot = null;
  let activePatientAppt = null;
  let syncInterval = null;

  // ==========================================
  // TEMA OSCURO / CLARO (PRONTOTURNO THEME)
  // ==========================================
  const themeTogglePwa = document.getElementById('theme-toggle-pwa');
  const moonIconPwa = document.getElementById('pwa-theme-icon-moon');
  const sunIconPwa = document.getElementById('pwa-theme-icon-sun');

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-theme');
      if (moonIconPwa) moonIconPwa.style.display = 'none';
      if (sunIconPwa) sunIconPwa.style.display = 'block';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-theme');
      if (moonIconPwa) moonIconPwa.style.display = 'block';
      if (sunIconPwa) sunIconPwa.style.display = 'none';
    }
  }

  const savedTheme = localStorage.getItem('prontoturno_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  if (themeTogglePwa) {
    themeTogglePwa.addEventListener('click', () => {
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('prontoturno_theme', newTheme);
      applyTheme(newTheme);
    });
  }

  const servicesContainer = document.getElementById('services-container');
  const servicesSection = document.getElementById('services-section');
  const serviceCollapsedBar = document.getElementById('service-collapsed-bar');
  const collapsedServiceName = document.getElementById('collapsed-service-name');
  const btnChangeService = document.getElementById('btn-change-service');

  const dateScrollContainer = document.getElementById('date-scroll-container');
  const slotsContainer = document.getElementById('slots-container');
  const currentMonthYear = document.getElementById('current-month-year');
  const btnOpenModal = document.getElementById('btn-open-modal');
  const modalOverlay = document.getElementById('booking-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const bookingForm = document.getElementById('booking-form');

  const modalErrorBanner = document.getElementById('modal-error-banner');
  const modalErrorText = document.getElementById('modal-error-text');

  const successModal = document.getElementById('success-modal');
  const btnCloseSuccessModal = document.getElementById('btn-close-success-modal');

  const existingModal = document.getElementById('existing-appointment-modal');
  const existingApptInfo = document.getElementById('existing-appt-info');
  const btnRescheduleExisting = document.getElementById('btn-reschedule-existing');
  const btnCancelExisting = document.getElementById('btn-cancel-existing');
  const btnCloseExistingModal = document.getElementById('btn-close-existing-modal');

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchAvailability();
    }
  });

  window.addEventListener('focus', () => {
    fetchAvailability();
  });

  const fallbackServices = [
    { id: "s1", name: "Ortodoncia / Control", duration_minutes: 120, price: 15000 },
    { id: "s2", name: "Limpieza & Blanqueamiento", duration_minutes: 45, price: 8000 },
    { id: "s3", name: "Implante Dental & Cirugía", duration_minutes: 90, price: 45000 },
    { id: "s4", name: "Endodoncia / Conducto", duration_minutes: 60, price: 22000 },
    { id: "s5", name: "Extracción Muela de Juicio", duration_minutes: 60, price: 18000 },
    { id: "s6", name: "Consulta & Diagnóstico", duration_minutes: 30, price: 5000 }
  ];

  // Colapsar grilla de servicios
  function collapseServiceSection() {
    if (servicesSection) servicesSection.classList.add('collapsed');
    if (serviceCollapsedBar) serviceCollapsedBar.classList.add('active');
  }

  // Expandir grilla de servicios
  function expandServiceSection() {
    if (servicesSection) servicesSection.classList.remove('collapsed');
    if (serviceCollapsedBar) serviceCollapsedBar.classList.remove('active');
  }

  // Renderizado inicial de servicios
  function renderInitialServices(servicesList) {
    servicesContainer.innerHTML = servicesList.map((s, idx) => `
      <div class="service-card ${idx === 0 ? 'active' : ''}" data-service-id="${s.id}" data-service-name="${s.name}" data-duration="${s.duration_minutes}">
        <div>
          <div class="service-name">${s.name}</div>
          <div class="service-duration">⏱ ${s.duration_minutes >= 60 ? (s.duration_minutes / 60) + ' hs' : s.duration_minutes + ' min'}</div>
        </div>
        <div class="service-price">$${s.price ? Number(s.price).toLocaleString('es-AR') : 0} ARS</div>
      </div>
    `).join('');

    selectedServiceId = servicesList[0].id;
    selectedServiceName = servicesList[0].name;
    if (collapsedServiceName) collapsedServiceName.innerText = selectedServiceName;

    // NO colapsar al inicio — el usuario elige primero
    expandServiceSection();
    attachServiceClickEvents();
  }

  // 1. Cargar servicios desde API
  async function fetchServices() {
    if (!window._isExpressReschedule) {
      renderInitialServices(fallbackServices);
      renderDatePills();
      renderSlotsInstant();
    }

    try {
      const res = await fetch('/api/v1/booking/services', { cache: 'no-store' });
      if (res.ok) {
        const liveServices = await res.json();
        if (liveServices && liveServices.length > 0) {
          if (!window._isExpressReschedule) {
            renderInitialServices(liveServices);
          } else {
            // Sincronizar duración y datos en segundo plano
            const match = liveServices.find(s => s.id === selectedServiceId || s.name.toLowerCase() === (selectedServiceName || '').toLowerCase());
            if (match) {
              selectedServiceId = match.id;
              selectedServiceName = match.name;
              selectedServiceDuration = match.duration_minutes || 30;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Usando servicios predeterminados:', e);
    }

    if (!window._isExpressReschedule) {
      fetchAvailability();
    }
    startAutoSync();
  }

  function attachServiceClickEvents() {
    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.service-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedServiceId = card.getAttribute('data-service-id');
        selectedServiceName = card.getAttribute('data-service-name');

        if (collapsedServiceName) collapsedServiceName.innerText = selectedServiceName;
        collapseServiceSection();

        selectedTimeSlot = null;
        if (btnOpenModal) btnOpenModal.disabled = true;

        renderSlotsInstant();
        fetchAvailability();
      });
    });
  }

  if (btnChangeService) {
    btnChangeService.addEventListener('click', () => {
      expandServiceSection();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function formatLocalDate(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const daysShortName = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const monthsName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  function renderDatePills() {
    dateScrollContainer.innerHTML = '';
    const now = new Date();
    const todayStr = formatLocalDate(now);
    const nowHour = now.getHours();

    let startDateCandidate = new Date(selectedDate);
    if (formatLocalDate(startDateCandidate) === todayStr && nowHour >= 18) {
      startDateCandidate.setDate(startDateCandidate.getDate() + 1);
      selectedDate = new Date(startDateCandidate);
    }

    currentMonthYear.innerText = `${monthsName[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

    let datesToRender = [];
    let tempDate = new Date(selectedDate);

    for (let i = 0; i < 7; i++) {
      const dStr = formatLocalDate(tempDate);
      if (dStr === todayStr && nowHour >= 18) {
        tempDate.setDate(tempDate.getDate() + 1);
        continue;
      }
      datesToRender.push(new Date(tempDate));
      tempDate.setDate(tempDate.getDate() + 1);
    }

    datesToRender.slice(0, 7).forEach((d) => {
      const dayName = daysShortName[d.getDay()];
      const dayNum = d.getDate();
      const dateIso = formatLocalDate(d);
      const isSelected = dateIso === formatLocalDate(selectedDate);

      const pill = document.createElement('div');
      pill.className = `date-pill ${isSelected ? 'active' : ''}`;
      pill.setAttribute('data-date', dateIso);
      pill.innerHTML = `
        <span class="date-day">${dayName}</span>
        <span class="date-num">${dayNum}</span>
      `;

      pill.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.date-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedDate = new Date(d);
        selectedTimeSlot = null;
        if (btnOpenModal) btnOpenModal.disabled = true;

        currentMonthYear.innerText = `${monthsName[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
        renderSlotsInstant();
        fetchAvailability();
      });

      dateScrollContainer.appendChild(pill);
    });
  }

  const btnPrevWeek = document.getElementById('btn-prev-week');
  const btnNextWeek = document.getElementById('btn-next-week');

  if (btnPrevWeek) {
    btnPrevWeek.addEventListener('click', () => {
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 7);
      const today = new Date();
      if (prevDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        selectedDate = prevDate;
        renderDatePills();
        renderSlotsInstant();
        fetchAvailability();
      }
    });
  }

  if (btnNextWeek) {
    btnNextWeek.addEventListener('click', () => {
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 7);
      selectedDate = nextDate;
      renderDatePills();
      renderSlotsInstant();
      fetchAvailability();
    });
  }

  const defaultMockSlotsTimes = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

  function buildSlotsData(dateIso) {
    const now = new Date();
    const isToday = (dateIso === formatLocalDate(now));
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    return defaultMockSlotsTimes.map(t => {
      const [hStr, mStr] = t.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const isPast = isToday && (h < currentHour || (h === currentHour && m <= currentMin));
      return { time_str: t, start_iso: `${dateIso}T${t}:00`, is_available: !isPast };
    });
  }

  // Primer renderizado: crea los pills una única vez
  function initSlotsDOM() {
    const dateIso = formatLocalDate(selectedDate);
    const slots = buildSlotsData(dateIso);
    slotsContainer.innerHTML = slots.map(slot => {
      if (slot.is_available) {
        return `<div class="slot-pill available" data-iso="${slot.start_iso}">${slot.time_str}</div>`;
      } else {
        return `<div class="slot-pill disabled" data-iso="${slot.start_iso}">${slot.time_str}</div>`;
      }
    }).join('');
    attachSlotClickEvents();
  }

  // Actualiza pills SIN destruir el DOM — cero layout shift
  function patchSlotsDOM(slots) {
    const pills = slotsContainer.querySelectorAll('.slot-pill');
    slots.forEach((slot, i) => {
      const pill = pills[i];
      if (!pill) return;
      pill.setAttribute('data-iso', slot.start_iso);
      pill.textContent = slot.time_str;
      // Mantener selección si el mismo horario sigue disponible
      const wasSelected = (selectedTimeSlot === slot.start_iso);
      pill.className = 'slot-pill ' + (slot.is_available ? ('available' + (wasSelected ? ' selected' : '')) : 'disabled');
      if (!slot.is_available && wasSelected) {
        selectedTimeSlot = null;
        if (btnOpenModal) btnOpenModal.disabled = true;
      }
    });
    attachSlotClickEvents();
  }

  function renderSlotsInstant() {
    const dateIso = formatLocalDate(selectedDate);
    const slots = buildSlotsData(dateIso);
    const pills = slotsContainer.querySelectorAll('.slot-pill');
    if (pills.length === slots.length) {
      // Pills ya existen — solo parchear, sin tocar el DOM
      patchSlotsDOM(slots);
    } else {
      // Primera vez o cantidad distinta — crear desde cero
      initSlotsDOM();
    }
  }

  function renderSlotsHTML(slotsList) {
    const pills = slotsContainer.querySelectorAll('.slot-pill');
    if (pills.length === slotsList.length) {
      patchSlotsDOM(slotsList);
    } else {
      slotsContainer.innerHTML = slotsList.map(slot => {
        if (slot.is_available) {
          const isSelectedClass = (selectedTimeSlot === slot.start_iso) ? 'selected' : '';
          return `<div class="slot-pill available ${isSelectedClass}" data-iso="${slot.start_iso}">${slot.time_str}</div>`;
        } else {
          return `<div class="slot-pill disabled" data-iso="${slot.start_iso}">${slot.time_str}</div>`;
        }
      }).join('');
      attachSlotClickEvents();
    }
  }

  // 3. Cargar disponibilidad desde la API — siempre fusiona en los 12 slots fijos, nunca cambia cantidad
  async function fetchAvailability() {
    if (!selectedServiceId) return;
    const dateStr = formatLocalDate(selectedDate);

    try {
      const res = await fetch(`/api/v1/booking/availability?tenant_id=demo-tenant-citaly-001&service_id=${selectedServiceId}&target_date_str=${dateStr}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.slots) {
          // Construir mapa de disponibilidad: start_iso → is_available
          const apiMap = {};
          data.slots.forEach(s => { apiMap[s.start_iso] = s.is_available; });

          // Actualizar solo la clase de cada pill existente — NUNCA cambiar la cantidad
          slotsContainer.querySelectorAll('.slot-pill').forEach(pill => {
            const iso = pill.getAttribute('data-iso');
            if (!iso) return;
            if (iso in apiMap) {
              if (!apiMap[iso]) {
                pill.classList.remove('available', 'selected');
                pill.classList.add('disabled');
                if (selectedTimeSlot === iso) {
                  selectedTimeSlot = null;
                  if (btnOpenModal) btnOpenModal.disabled = true;
                }
              } else {
                if (pill.classList.contains('disabled')) {
                  pill.classList.remove('disabled');
                  pill.classList.add('available');
                }
              }
            }
          });

          attachSlotClickEvents();
        }
      }
    } catch (e) {
      console.warn('Error al sincronizar horarios desde servidor:', e);
    }
  }

  // Auto-sincronización en vivo silenciosa cada 5 segundos
  let liveSlotSyncTimer = null;
  function startLiveSlotSync() {
    if (liveSlotSyncTimer) clearInterval(liveSlotSyncTimer);
    liveSlotSyncTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && selectedServiceId) {
        fetchAvailability();
      }
    }, 5000);
  }
  startLiveSlotSync();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && selectedServiceId) {
      fetchAvailability();
    }
  });



  function attachSlotClickEvents() {
    document.querySelectorAll('.slot-pill.available').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.slot-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');

        selectedTimeSlot = pill.getAttribute('data-iso');
        if (btnOpenModal) btnOpenModal.disabled = false;
      });
    });
  }

  // 4. Auto-Sincronización en Tiempo Real (cada 4 segundos)
  function startAutoSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !modalOverlay.classList.contains('active')) {
        fetchAvailability();
      }
    }, 4000);
  }

  // 5. Modal de Confirmación
  btnOpenModal.addEventListener('click', () => {
    if (!selectedTimeSlot) {
      return;
    }

    if (window._isExpressReschedule && window._expressPatientName) {
      // MODO 1-TAP EXPRESS: Confirmar directamente sin abrir modal ni pedir reingreso de datos
      const pName = window._expressPatientName || 'Paciente';
      const pPhone = window._expressPatientPhone || (document.getElementById('patient-phone') ? document.getElementById('patient-phone').value : '') || '5492302640284';
      btnOpenModal.disabled = true;
      btnOpenModal.innerHTML = `<span>Confirmando cambio de turno...</span>`;
      createAppointmentCall(pName, pPhone, btnOpenModal);
      return;
    }

    if (modalErrorBanner) modalErrorBanner.style.display = 'none';

    const serviceNameEl = document.getElementById('summary-service-name');
    const dateTimeEl = document.getElementById('summary-date-time');

    if (serviceNameEl) serviceNameEl.innerText = selectedServiceName;
    if (dateTimeEl) {
      const parts = selectedTimeSlot.split('T');
      const timePart = parts[1] ? parts[1].substring(0, 5) : '10:00';
      const dayName = daysShortName[selectedDate.getDay()];
      const dayNum = selectedDate.getDate();
      const monthName = monthsName[selectedDate.getMonth()];
      dateTimeEl.innerText = `${dayName} ${dayNum} de ${monthName} — ${timePart} hs`;
    }

    if (modalOverlay) modalOverlay.classList.add('active');
  });

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      if (modalOverlay) modalOverlay.classList.remove('active');
    });
  }

  if (btnCloseSuccessModal) {
    btnCloseSuccessModal.addEventListener('click', () => {
      if (successModal) successModal.classList.remove('active');
    });
  }

  if (btnCloseExistingModal) {
    btnCloseExistingModal.addEventListener('click', () => {
      if (existingModal) existingModal.classList.remove('active');
    });
  }

  // 6. Enviar Formulario de Reserva
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('patient-name').value.trim();
    const phone = document.getElementById('patient-phone').value.trim();
    const submitBtn = document.getElementById('btn-submit-modal');

    if (!name || !phone) return;

    if (submitBtn) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
    }

    if (modalErrorBanner) modalErrorBanner.style.display = 'none';

    try {
      const checkRes = await fetch(`/api/v1/booking/check-patient?phone=${encodeURIComponent(phone)}&service_id=${selectedServiceId}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.has_active_appointment && checkData.appointment) {
          activePatientAppt = checkData.appointment;
          window._pendingRescheduleApptId = checkData.appointment.id;
          window._pendingPatientName = name;
          window._pendingPatientPhone = phone;

          if (modalOverlay) modalOverlay.classList.remove('active');
          if (existingApptInfo) {
            existingApptInfo.innerText = `Hola ${name}, detectamos que ya tenés un turno de ${checkData.appointment.service_name} el ${checkData.appointment.start_time_formatted}. ¿Deseás cambiarlo por este nuevo horario o cancelarlo?`;
          }
          if (existingModal) existingModal.classList.add('active');
          if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Check paciente omitido:', e);
    }

    createAppointmentCall(name, phone, submitBtn);
  });

  function showModalError(msg) {
    if (modalErrorBanner && modalErrorText) {
      let cleanMsg = 'Hubo un inconveniente al procesar la reserva. Por favor intenta nuevamente.';
      if (typeof msg === 'string') {
        cleanMsg = msg;
      } else if (Array.isArray(msg) && msg.length > 0) {
        cleanMsg = msg[0].msg || (typeof msg[0] === 'string' ? msg[0] : JSON.stringify(msg[0]));
      } else if (typeof msg === 'object' && msg !== null) {
        if (typeof msg.detail === 'string') {
          cleanMsg = msg.detail;
        } else if (Array.isArray(msg.detail) && msg.detail.length > 0) {
          cleanMsg = msg.detail[0].msg || JSON.stringify(msg.detail[0]);
        } else if (typeof msg.message === 'string') {
          cleanMsg = msg.message;
        } else {
          cleanMsg = JSON.stringify(msg);
        }
      }
      modalErrorText.innerText = cleanMsg;
      modalErrorBanner.style.display = 'block';
    }
  }

  async function createAppointmentCall(name, phone, submitBtn) {
    try {
      if (modalErrorBanner) modalErrorBanner.style.display = 'none';

      const payload = {
        tenant_id: 'demo-tenant-citaly-001',
        service_id: selectedServiceId,
        start_time: selectedTimeSlot,
        patient_full_name: name,
        patient_whatsapp: phone,
        reschedule_from_token: window._rescheduleToken || null,
        reschedule_from_id: window._rescheduleApptId || null
      };

      const res = await fetch('/api/v1/booking/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let result = null;
      try {
        result = await res.json();
      } catch (jsonErr) {
        console.warn('Respuesta no JSON recibida:', jsonErr);
      }

      if (res.status === 409 && result && result.has_existing_same_service) {
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (existingApptInfo) {
          existingApptInfo.innerText = `Ya tenés un turno de ${result.existing_service_name} el ${result.existing_date_str}. ¿Deseás cambiarlo por este nuevo horario?`;
        }
        window._pendingRescheduleApptId = result.existing_appointment_id;
        window._pendingPatientName = name;
        window._pendingPatientPhone = phone;
        if (existingModal) existingModal.classList.add('active');
        return;
      }

      if ((res.ok && result && result.success) || res.status === 200) {
        const timeStr = selectedTimeSlot ? selectedTimeSlot.split('T')[1].substring(0, 5) : '10:00';
        const dayNum = selectedDate.getDate();
        const monthName = monthsName[selectedDate.getMonth()];
        const dayOfWeekName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][selectedDate.getDay()];
        const formattedDateText = `${dayOfWeekName} ${dayNum} de ${monthName} — ${timeStr} hs`;

        const titleEl = document.getElementById('success-modal-title');
        const descEl = document.getElementById('success-modal-desc');

        if (result && result.was_rescheduled) {
          if (titleEl) titleEl.innerText = '¡Turno Reprogramado con Éxito!';
          if (descEl) descEl.innerText = 'Tu nuevo turno fue registrado con éxito.';
        } else {
          if (titleEl) titleEl.innerText = '¡Turno Agendado con Éxito!';
          if (descEl) descEl.innerText = 'Te esperamos en el consultorio.';
        }

        document.getElementById('success-service-name').innerText = selectedServiceName || 'Ortodoncia / Control';
        document.getElementById('success-date-time').innerText = formattedDateText;
        document.getElementById('success-doctor-name').innerText = 'Dr. Alejandro Pérez';

        modalOverlay.classList.remove('active');
        if (successModal) successModal.classList.add('active');

        // Limpiar estado de reprogramación y horario seleccionado
        window._isExpressReschedule = false;
        window._rescheduleToken = null;
        window._rescheduleApptId = null;
        window._pendingRescheduleApptId = null;
        selectedTimeSlot = null;
        if (btnOpenModal) {
          btnOpenModal.innerHTML = `<span>Confirmar Turno</span>`;
          btnOpenModal.disabled = true;
        }

        const expressBanner = document.getElementById('express-reschedule-banner');
        if (expressBanner) expressBanner.style.display = 'none';

        // Actualizar disponibilidad inmediatamente en vivo
        fetchAvailability();
      } else {
        let errDetail = 'Por favor selecciona otro horario o intenta nuevamente.';
        if (result && result.detail) {
          errDetail = result.detail;
        }
        showModalError(errDetail);
        fetchAvailability();
      }
    } catch (err) {
      console.error('Error al crear reserva:', err);
      showModalError('Hubo una demora de respuesta. Por favor intenta nuevamente.');
    } finally {
      if (submitBtn) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        if (window._isExpressReschedule) {
          submitBtn.innerHTML = `<span>Confirmar Cambio de Turno ✔</span>`;
        }
      }
    }
  }

  if (btnRescheduleExisting) {
    btnRescheduleExisting.addEventListener('click', async () => {
      const apptId = window._pendingRescheduleApptId || (activePatientAppt ? activePatientAppt.id : null);
      if (!apptId || !selectedTimeSlot) {
        if (existingModal) existingModal.classList.remove('active');
        return;
      }

      const pName = window._pendingPatientName || (activePatientAppt ? activePatientAppt.patient_name : '');
      const pPhone = window._pendingPatientPhone || (activePatientAppt ? activePatientAppt.patient_whatsapp : '');

      window._rescheduleApptId = apptId;
      if (existingModal) existingModal.classList.remove('active');
      createAppointmentCall(pName, pPhone, null);
    });
  }

  if (btnCancelExisting) {
    btnCancelExisting.addEventListener('click', async () => {
      const apptId = window._pendingRescheduleApptId || (activePatientAppt ? activePatientAppt.id : null);
      if (!apptId) {
        if (existingModal) existingModal.classList.remove('active');
        return;
      }

      try {
        btnCancelExisting.innerText = 'Cancelando turno...';
        btnCancelExisting.disabled = true;

        const res = await fetch('/api/v1/booking/cancel-by-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointment_id: apptId })
        });

        const result = await res.json();
        if (res.ok && result.success) {
          if (existingModal) existingModal.classList.remove('active');
          window._pendingRescheduleApptId = null;
          activePatientAppt = null;
          fetchAvailability();
          alert('Tu turno anterior fue cancelado exitosamente. El horario quedó liberado.');
        } else {
          alert(result.detail || 'No se pudo cancelar el turno.');
        }
      } catch (e) {
        alert('Error al cancelar el turno. Por favor intenta nuevamente.');
      } finally {
        btnCancelExisting.innerText = '❌ Cancelar mi turno actual';
        btnCancelExisting.disabled = false;
      }
    });
  }

  function activateExpressRescheduleMode(data, token) {
    if (!data) return;
    window._isExpressReschedule = true;
    window._rescheduleToken = token || data.token_cancellation || null;
    window._rescheduleApptId = data.appointment_id || data.id || null;
    window._expressPatientName = data.patient_name || data.full_name || '';
    window._expressPatientPhone = data.patient_whatsapp || data.whatsapp_phone || '';

    if (data.service_id) {
      selectedServiceId = data.service_id;
    }
    if (data.service_name) {
      selectedServiceName = data.service_name;
    }
    if (data.duration_minutes) {
      selectedServiceDuration = data.duration_minutes;
    }

    const inputName = document.getElementById('patient-name');
    const inputPhone = document.getElementById('patient-phone');
    if (inputName && window._expressPatientName) inputName.value = window._expressPatientName;
    if (inputPhone && window._expressPatientPhone) inputPhone.value = window._expressPatientPhone;

    // Configurar banner limpio y claro con todos los datos del turno actual
    const expressBanner = document.getElementById('express-reschedule-banner');
    const expressTitle = document.getElementById('express-greeting-title');
    const expressService = document.getElementById('express-service-name');
    const expressCurrentDt = document.getElementById('express-current-datetime');

    if (expressTitle) {
      expressTitle.innerText = `Reprogramando turno de ${window._expressPatientName || 'Paciente'}`;
    }
    if (expressService) {
      expressService.innerText = `${selectedServiceName || 'Tratamiento'}`;
    }
    if (expressCurrentDt) {
      const dtText = (data.date_formatted && data.time_formatted) ? `${data.date_formatted} a las ${data.time_formatted}` : (data.start_time_formatted || '--/--');
      expressCurrentDt.innerText = dtText;
    }
    if (expressBanner) {
      expressBanner.style.display = 'block';
    }

    // Ocultar sección de consulta por teléfono
    const phoneSection = document.getElementById('phone-lookup-section');
    if (phoneSection) phoneSection.style.display = 'none';

    // Ocultar sección de tarjetas activas
    const activeApptSec = document.getElementById('active-appt-section');
    if (activeApptSec) activeApptSec.style.display = 'none';

    // Ocultar selector de servicios y barra
    if (servicesSection) servicesSection.style.display = 'none';
    if (serviceCollapsedBar) serviceCollapsedBar.style.display = 'none';

    // Desplegar calendario directamente
    const calendarSection = document.getElementById('calendar-section');
    if (calendarSection) calendarSection.style.display = 'block';

    if (btnOpenModal) {
      btnOpenModal.innerHTML = `<span>Confirmar Cambio de Turno ✔</span>`;
      btnOpenModal.disabled = true;
    }

    selectedTimeSlot = null;
    renderDatePills();
    renderSlotsInstant();
    fetchAvailability();
  }

  // Hacer disponible el helper globalmente para el módulo de búsqueda
  window.activateExpressRescheduleMode = activateExpressRescheduleMode;

  const urlParams = new URLSearchParams(window.location.search);
  const paramPhone = urlParams.get('phone');
  let paramRescheduleToken = urlParams.get('reschedule_token') || urlParams.get('token');

  if (!paramRescheduleToken && window.location.pathname.startsWith('/r/')) {
    const parts = window.location.pathname.split('/');
    if (parts.length >= 3 && parts[2]) {
      paramRescheduleToken = parts[2];
    }
  }

  if (paramRescheduleToken) {
    window._rescheduleToken = paramRescheduleToken;
    window._isExpressReschedule = true;

    // Ocultar servicios y teléfono de inmediato para evitar parpadeos
    const phoneSection = document.getElementById('phone-lookup-section');
    if (phoneSection) phoneSection.style.display = 'none';
    if (servicesSection) servicesSection.style.display = 'none';
    if (serviceCollapsedBar) serviceCollapsedBar.style.display = 'none';

    fetch(`/api/v1/booking/appointment/${paramRescheduleToken}`)
      .then(r => r.json())
      .then(data => {
        if (data && (data.patient_name || data.appointment_id)) {
          activateExpressRescheduleMode(data, paramRescheduleToken);
        }
      })
      .catch(e => console.warn('Error pre-cargando paciente reprogramado:', e));
  }

  if (paramPhone && !paramRescheduleToken) {
    const phoneInput = document.getElementById('phone-lookup-input');
    if (phoneInput) {
      phoneInput.value = paramPhone;
      setTimeout(() => {
        const btnLookup = document.getElementById('btn-phone-lookup');
        if (btnLookup) btnLookup.click();
      }, 400);
    }
  }

  // Inicializar
  fetchServices();
});

// ─── Módulo: Consultar mi turno por celular ───────────────────────────────────
(function () {
  const phoneLookupSection = document.getElementById('phone-lookup-section');
  const phoneInput         = document.getElementById('phone-lookup-input');
  const btnLookup          = document.getElementById('btn-phone-lookup');
  const lookupError        = document.getElementById('phone-lookup-error');
  const activeApptSection  = document.getElementById('active-appt-section');

  const elPatientName      = document.getElementById('active-appt-patient-name');
  const elService          = document.getElementById('active-appt-service');
  const elDate             = document.getElementById('active-appt-date');
  const elTime             = document.getElementById('active-appt-time');
  const btnCancel          = document.getElementById('btn-appt-cancel');
  const btnReschedule      = document.getElementById('btn-appt-reschedule');
  const cancelConfirm      = document.getElementById('appt-cancel-confirm');

  if (!btnLookup) return;

  // Estado actual de la cita encontrada
  let currentAppt = null;

  // Mostrar error
  function showError(msg) {
    lookupError.textContent = msg;
    lookupError.style.display = 'block';
  }

  function hideError() {
    lookupError.style.display = 'none';
  }

  // Renderizar tarjetas de turnos activos (Soporte Multiturno)
  function showActiveAppts(apptsList) {
    activeApptSection.innerHTML = '';
    activeApptSection.style.display = 'block';

    apptsList.forEach((appt, idx) => {
      let dateShort = appt.date_formatted || '';
      let timeShort = appt.time_formatted || '';
      if (appt.start_time_iso) {
        const dt = new Date(appt.start_time_iso);
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const hh = String(dt.getHours()).padStart(2, '0');
        const min = String(dt.getMinutes()).padStart(2, '0');
        dateShort = `${dd}/${mm}`;
        timeShort = `${hh}:${min}`;
      }

      const card = document.createElement('div');
      card.className = 'active-appt-card';
      card.style.marginBottom = idx === apptsList.length - 1 ? '0px' : '16px';
      card.innerHTML = `
        <div class="active-appt-header">
          <div class="active-appt-title-group">
            <span class="active-appt-service-name">${appt.service_name}</span>
            <span class="active-appt-patient-name">Paciente: <strong>${appt.patient_name}</strong></span>
          </div>
          <div class="active-appt-badge"><span class="badge-dot"></span> Agendado</div>
        </div>
        <div class="active-appt-datetime">
          <div class="appt-datetime-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="18" y2="10"></line></svg>
            <span>${appt.date_formatted}</span>
          </div>
          <div class="appt-datetime-divider">·</div>
          <div class="appt-datetime-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>${appt.time_formatted} hs</span>
          </div>
        </div>
        <div class="active-appt-actions">
          <button type="button" class="appt-btn-reschedule" data-service-id="${appt.service_id}" data-id="${appt.id}" data-token="${appt.token_cancellation}">
            Reprogramar fecha u horario
          </button>
          <button type="button" class="appt-btn-cancel" data-token="${appt.token_cancellation}" data-dateshort="${dateShort}" data-timeshort="${timeShort}">
            Cancelar turno
          </button>
        </div>
        <div class="cancel-confirm-box" style="display:none; margin-top: 12px; padding: 12px 14px; background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 10px; font-size: 13px; color: #DC2626; font-weight: 600; text-align: center;"></div>
      `;

      // Evento Cancelar individual
      const btnCancelCard = card.querySelector('.appt-btn-cancel');
      const btnRescheduleCard = card.querySelector('.appt-btn-reschedule');
      const confirmBox = card.querySelector('.cancel-confirm-box');

      btnCancelCard.addEventListener('click', async () => {
        btnCancelCard.disabled = true;
        btnCancelCard.textContent = 'Cancelando...';
        try {
          const res = await fetch(`/api/v1/booking/cancel/${appt.token_cancellation}`, { method: 'POST' });
          if (res.ok) {
            btnCancelCard.style.display = 'none';
            btnRescheduleCard.style.display = 'none';
            confirmBox.textContent = `Tu turno del ${dateShort} a las ${timeShort} hs fue cancelado. ¡Gracias por avisarnos!`;
            confirmBox.style.display = 'block';
          } else {
            btnCancelCard.textContent = 'Cancelar turno';
            btnCancelCard.disabled = false;
            showError('No se pudo cancelar. Intentá de nuevo.');
          }
        } catch (e) {
          btnCancelCard.textContent = 'Cancelar turno';
          btnCancelCard.disabled = false;
          showError('Error de conexión al cancelar.');
        }
      });

      // Evento Reprogramar individual — Activa Modo Express 1-Tap
      btnRescheduleCard.addEventListener('click', () => {
        if (typeof window.activateExpressRescheduleMode === 'function') {
          window.activateExpressRescheduleMode(appt, appt.token_cancellation);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      activeApptSection.appendChild(card);
    });
  }

  // Ocultar tarjetas de citas activas
  function hideActiveAppt() {
    activeApptSection.style.display = 'none';
    activeApptSection.innerHTML = '';
  }

  // Consultar turno por celular
  async function lookupAppointment() {
    hideError();
    const phone = (phoneInput.value || '').trim();
    if (!phone || phone.replace(/\D/g, '').length < 6) {
      showError('Ingresá un número de celular válido.');
      return;
    }

    btnLookup.textContent = '...';
    btnLookup.disabled = true;

    try {
      const res = await fetch(`/api/v1/booking/my-appointment?phone=${encodeURIComponent(phone)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Error del servidor');
      const data = await res.json();

      if (data.has_active_appointment && data.appointments && data.appointments.length > 0) {
        showActiveAppts(data.appointments);
        hideError();
      } else {
        hideActiveAppt();
        showError('No encontramos un turno agendado para ese número. ¡Podés solicitar tu turno fácilmente seleccionando un tratamiento abajo!');
      }
    } catch (e) {
      showError('No pudimos conectar con el servidor. Intentá de nuevo.');
    } finally {
      btnLookup.textContent = 'Consultar';
      btnLookup.disabled = false;
    }
  }

  // Enter en el input
  phoneInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lookupAppointment();
  });

  btnLookup.addEventListener('click', lookupAppointment);
})();

