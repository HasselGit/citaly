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

  const btnLookupAppt = document.getElementById('btn-lookup-appt');
  const lookupModal = document.getElementById('lookup-modal');
  const lookupForm = document.getElementById('lookup-form');
  const lookupPhone = document.getElementById('lookup-phone');
  const btnCloseLookupModal = document.getElementById('btn-close-lookup-modal');

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchAvailability();
    }
  });

  window.addEventListener('focus', () => {
    fetchAvailability();
  });

  // Modal Consulta Cita
  if (btnLookupAppt && lookupModal) {
    btnLookupAppt.addEventListener('click', () => {
      lookupModal.classList.add('active');
    });
  }

  if (btnCloseLookupModal && lookupModal) {
    btnCloseLookupModal.addEventListener('click', () => {
      lookupModal.classList.remove('active');
    });
  }

  if (lookupForm) {
    lookupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phoneVal = lookupPhone ? lookupPhone.value.trim() : '';
      if (!phoneVal) return;

      try {
        const res = await fetch(`/api/v1/booking/check-patient?phone=${encodeURIComponent(phoneVal)}&service_id=${selectedServiceId}`);
        const data = await res.json();

        if (data.has_active_appointment && data.appointment) {
          activePatientAppt = data.appointment;
          if (lookupModal) lookupModal.classList.remove('active');
          if (existingApptInfo) {
            existingApptInfo.innerText = `Tienes un turno activo para ${data.appointment.service_name} el día ${data.appointment.start_time_formatted}. ¿Deseas reprogramarlo o cancelarlo?`;
          }
          if (existingModal) existingModal.classList.add('active');
        } else {
          alert('No encontramos ninguna cita activa para ese número de celular.');
        }
      } catch (e) {
        alert('Error al consultar el turno.');
      }
    });
  }

  const fallbackServices = [
    { id: "s1", name: "Ortodoncia / Control", duration_minutes: 120, price: 15000 },
    { id: "s2", name: "Limpieza & Blanqueamiento", duration_minutes: 45, price: 8000 },
    { id: "s3", name: "Implante Dental & Cirugía", duration_minutes: 90, price: 45000 },
    { id: "s4", name: "Endodoncia / Conducto", duration_minutes: 60, price: 22000 },
    { id: "s5", name: "Extracción Muela de Juicio", duration_minutes: 60, price: 18000 },
    { id: "s6", name: "Consulta & Diagnóstico", duration_minutes: 30, price: 5000 }
  ];

  // Renderizado instantáneo de servicios iniciales
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

  function startAutoSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAvailability();
      }
    }, 4000);
  }

  function attachServiceClickEvents() {
    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.service-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        selectedServiceId = card.getAttribute('data-service-id');
        selectedServiceName = card.getAttribute('data-service-name');
        if (collapsedServiceName) collapsedServiceName.innerText = selectedServiceName;

        // Auto-colapsar tarjetas
        if (servicesSection) servicesSection.classList.add('collapsed');
        if (serviceCollapsedBar) serviceCollapsedBar.classList.add('active');

        fetchAvailability();
      });
    });
  }

  if (btnChangeService) {
    btnChangeService.addEventListener('click', () => {
      if (servicesSection) servicesSection.classList.remove('collapsed');
      if (serviceCollapsedBar) serviceCollapsedBar.classList.remove('active');
    });
  }

  // 2. Renderizar Píldoras de Fechas Futuras
  const monthsName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  function renderDatePills() {
    if (!dateScrollContainer) return;
    const today = new Date();
    const pills = [];

    for (let i = 0; i < 14; i++) {
      const dateObj = new Date(today);
      dateObj.setDate(today.getDate() + i);

      // Omitir domingos
      if (dateObj.getDay() === 0) continue;

      const isSelected = dateObj.toDateString() === selectedDate.toDateString();
      const dayNum = dateObj.getDate();
      const dayName = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'][dateObj.getDay()];

      pills.push(`
        <div class="date-pill ${isSelected ? 'selected' : ''}" data-date="${dateObj.toISOString()}">
          <span class="date-pill-day-name">${dayName}</span>
          <span class="date-pill-day-number">${dayNum}</span>
        </div>
      `);
    }

    dateScrollContainer.innerHTML = pills.join('');

    if (currentMonthYear) {
      currentMonthYear.innerText = `${monthsName[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    }

    document.querySelectorAll('.date-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.date-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');

        selectedDate = new Date(pill.getAttribute('data-date'));
        if (currentMonthYear) {
          currentMonthYear.innerText = `${monthsName[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
        }

        selectedTimeSlot = null;
        if (btnOpenModal) btnOpenModal.disabled = true;

        fetchAvailability();
      });
    });
  }

  // 3. Renderizar Slots de Horario Instantáneos
  function renderSlotsInstant() {
    if (!slotsContainer) return;
    const hours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

    slotsContainer.innerHTML = hours.map(h => `
      <div class="time-slot" data-time="${h}">
        <span class="time-text">${h}</span>
        <span class="time-status">Disponible</span>
      </div>
    `).join('');

    attachSlotClickEvents();
  }

  // 4. Obtener Disponibilidad Real desde API
  async function fetchAvailability() {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    try {
      const res = await fetch(`/api/v1/booking/availability?tenant_id=demo-tenant-citaly-001&service_id=${selectedServiceId}&target_date_str=${dateStr}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.slots) {
          updateSlotsWithData(data.slots);
        }
      }
    } catch (e) {
      console.warn('Error al obtener disponibilidad:', e);
    }
  }

  function updateSlotsWithData(slotsList) {
    if (!slotsContainer) return;

    slotsContainer.innerHTML = slotsList.map(s => {
      const isAvailable = s.is_available;
      const isSelected = selectedTimeSlot === s.start_iso;

      let slotClass = 'time-slot';
      let statusText = 'Disponible';

      if (!isAvailable) {
        slotClass += ' occupied';
        statusText = 'Ocupado';
      } else if (isSelected) {
        slotClass += ' selected';
        statusText = 'Seleccionado';
      }

      return `
        <div class="${slotClass}" data-start-iso="${s.start_iso}" data-time="${s.time_str}" data-available="${isAvailable}">
          <span class="time-text">${s.time_str}</span>
          <span class="time-status">${statusText}</span>
        </div>
      `;
    }).join('');

    attachSlotClickEvents();
  }

  function attachSlotClickEvents() {
    document.querySelectorAll('.time-slot').forEach(slot => {
      const isAvailable = slot.getAttribute('data-available') !== 'false' && !slot.classList.contains('occupied');

      if (isAvailable) {
        slot.addEventListener('click', () => {
          document.querySelectorAll('.time-slot').forEach(s => {
            if (!s.classList.contains('occupied')) {
              s.classList.remove('selected');
              const statusEl = s.querySelector('.time-status');
              if (statusEl) statusEl.innerText = 'Disponible';
            }
          });

          slot.classList.add('selected');
          const statusEl = slot.querySelector('.time-status');
          if (statusEl) statusEl.innerText = 'Seleccionado';

          selectedTimeSlot = slot.getAttribute('data-start-iso');
          if (btnOpenModal) btnOpenModal.disabled = false;
        });
      }
    });
  }

  // 5. Manejo del Modal de Reserva
  if (btnOpenModal) {
    btnOpenModal.addEventListener('click', () => {
      if (!selectedTimeSlot) return;
      if (modalErrorBanner) modalErrorBanner.style.display = 'none';
      if (modalOverlay) modalOverlay.classList.add('active');
    });
  }

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
  if (bookingForm) {
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

      // Verificar si ya tiene cita activa
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
  }

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

        if (modalOverlay) modalOverlay.classList.remove('active');
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
        btnRescheduleExisting.innerText = 'Reprogramar Cita';
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
