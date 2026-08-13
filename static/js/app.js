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
    renderInitialServices(fallbackServices);
    renderDatePills();
    renderSlotsInstant();

    try {
      const res = await fetch('/api/v1/booking/services', { cache: 'no-store' });
      if (res.ok) {
        const liveServices = await res.json();
        if (liveServices && liveServices.length > 0) {
          renderInitialServices(liveServices);
        }
      }
    } catch (e) {
      console.warn('Usando servicios predeterminados:', e);
    }

    fetchAvailability();
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

  // 3. Cargar disponibilidad desde la API (parche sin re-renderizar)
  async function fetchAvailability() {
    if (!selectedServiceId) return;
    const dateStr = formatLocalDate(selectedDate);

    try {
      const res = await fetch(`/api/v1/booking/availability?tenant_id=demo-tenant-citaly-001&service_id=${selectedServiceId}&target_date_str=${dateStr}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.slots && data.slots.length > 0) {
          // Parche: actualizar disponibilidad en los pills existentes sin borrar el DOM
          const existingPills = slotsContainer.querySelectorAll('.slot-pill');
          const slotMap = {};
          data.slots.forEach(s => { slotMap[s.start_iso] = s.is_available; });

          existingPills.forEach(pill => {
            const iso = pill.getAttribute('data-iso');
            if (iso && iso in slotMap) {
              if (!slotMap[iso]) {
                // El slot fue tomado: marcarlo como disabled
                pill.classList.remove('available', 'selected');
                pill.classList.add('disabled');
                if (selectedTimeSlot === iso) {
                  selectedTimeSlot = null;
                  if (btnOpenModal) btnOpenModal.disabled = true;
                }
              }
            }
          });

          // Si la API trae slots nuevos que no estaban en el renderizado instantáneo
          // (raro, pero posible), solo entonces re-renderizar completo
          if (data.slots.length !== existingPills.length) {
            renderSlotsHTML(data.slots);
          }
        }
      }
    } catch (e) {
      console.warn('Error al sincronizar horarios desde servidor:', e);
    }
  }


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

    try {
      const checkRes = await fetch(`/api/v1/booking/check-patient?phone=${encodeURIComponent(phone)}&service_id=${selectedServiceId}`);
      const checkData = await checkRes.json();

      if (checkData.has_active_appointment && checkData.appointment) {
        activePatientAppt = checkData.appointment;
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (existingApptInfo) {
          existingApptInfo.innerText = `Hola ${name}, detectamos que ya tienes una cita de ${checkData.appointment.service_name} el ${checkData.appointment.start_time_formatted}. ¿Deseas reprogramarla o cancelarla?`;
        }
        if (existingModal) existingModal.classList.add('active');
        if (submitBtn) {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }
        return;
      }
    } catch (e) {
      console.warn('Check paciente omitido:', e);
    }

    createAppointmentCall(name, phone, submitBtn);
  });

  function showModalError(msg) {
    if (modalErrorBanner && modalErrorText) {
      modalErrorText.innerText = msg;
      modalErrorBanner.style.display = 'block';
    }
  }

  async function createAppointmentCall(name, phone, submitBtn) {
    try {
      const res = await fetch('/api/v1/booking/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: 'demo-tenant-citaly-001',
          service_id: selectedServiceId,
          start_time: selectedTimeSlot,
          patient_full_name: name,
          patient_whatsapp: phone
        })
      });

      let result = null;
      try {
        result = await res.json();
      } catch (jsonErr) {
        console.warn('Respuesta de texto recibida:', jsonErr);
      }

      if ((res.ok && result && result.success) || res.status === 200) {
        const timeStr = selectedTimeSlot ? selectedTimeSlot.split('T')[1].substring(0, 5) : '10:00';
        const dayNum = selectedDate.getDate();
        const monthName = monthsName[selectedDate.getMonth()];
        const dayOfWeekName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][selectedDate.getDay()];
        const formattedDateText = `${dayOfWeekName} ${dayNum} de ${monthName} a las ${timeStr} hs`;

        document.getElementById('success-service-name').innerText = selectedServiceName || 'Ortodoncia / Control';
        document.getElementById('success-date-time').innerText = formattedDateText;
        document.getElementById('success-doctor-name').innerText = 'Dr. Alejandro Pérez';

        modalOverlay.classList.remove('active');
        if (successModal) successModal.classList.add('active');

        selectedTimeSlot = null;
        if (btnOpenModal) btnOpenModal.disabled = true;

        fetchAvailability();
      } else {
        const errDetail = (result && result.detail) ? result.detail : 'Por favor intenta nuevamente en unos momentos.';
        showModalError('No se pudo confirmar la reserva: ' + errDetail);
      }
    } catch (err) {
      console.error('Error al crear reserva:', err);
      showModalError('Hubo una demora de respuesta. Por favor intenta nuevamente.');
    } finally {
      if (submitBtn) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    }
  }

  // 7. Acciones de Reprogramación y Cancelación Instantánea
  if (btnRescheduleExisting) {
    btnRescheduleExisting.addEventListener('click', async () => {
      if (!activePatientAppt || !selectedTimeSlot) {
        alert('Por favor selecciona primero un nuevo día y horario disponible en el calendario.');
        if (existingModal) existingModal.classList.remove('active');
        return;
      }

      try {
        btnRescheduleExisting.innerText = 'Reprogramando...';
        btnRescheduleExisting.disabled = true;

        const res = await fetch('/api/v1/booking/reschedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointment_id: activePatientAppt.id,
            new_start_time: selectedTimeSlot
          })
        });

        const result = await res.json();
        if (result.success) {
          existingModal.classList.remove('active');
          fetchAvailability();
          alert(result.message || 'Turno reprogramado exitosamente.');
        } else {
          alert(result.detail || 'No se pudo reprogramar la cita.');
        }
      } catch (e) {
        alert('Error al reprogramar la cita.');
      } finally {
        btnRescheduleExisting.innerText = 'Reprogramar para la nueva fecha';
        btnRescheduleExisting.disabled = false;
      }
    });
  }

  if (btnCancelExisting) {
    btnCancelExisting.addEventListener('click', async () => {
      if (!activePatientAppt) return;

      try {
        btnCancelExisting.innerText = 'Cancelando...';
        btnCancelExisting.disabled = true;

        const res = await fetch(`/api/v1/booking/cancel/${activePatientAppt.token_cancellation}`, {
          method: 'POST'
        });

        const result = await res.json();
        if (result.success) {
          existingModal.classList.remove('active');
          fetchAvailability();
          alert('Tu cita fue cancelada exitosamente.');
        } else {
          alert(result.detail || 'No se pudo cancelar la cita.');
        }
      } catch (e) {
        alert('Error al cancelar la cita.');
      } finally {
        btnCancelExisting.innerText = 'Cancelar';
        btnCancelExisting.disabled = false;
      }
    });
  }

  // Inicializar
  fetchServices();
});
