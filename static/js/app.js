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

  // Renderizado instantáneo de servicios iniciales (0ms latency)
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

  function attachServiceClickEvents() {
    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.service-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedServiceId = card.getAttribute('data-service-id');
        selectedServiceName = card.getAttribute('data-service-name');

        if (collapsedServiceName) collapsedServiceName.innerText = selectedServiceName;
        
        selectedTimeSlot = null;
        if (btnOpenModal) btnOpenModal.disabled = true;

        renderSlotsInstant();
        fetchAvailability();
      });
    });
  }

  if (btnChangeService) {
    btnChangeService.addEventListener('click', () => {
      if (servicesSection) servicesSection.style.display = 'block';
      if (serviceCollapsedBar) serviceCollapsedBar.classList.remove('active');
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
    
    // Si la fecha seleccionada es hoy pero ya son las 18:00 hs o más, avanzar a mañana
    if (formatLocalDate(startDateCandidate) === todayStr && nowHour >= 18) {
      startDateCandidate.setDate(startDateCandidate.getDate() + 1);
      selectedDate = new Date(startDateCandidate);
    }

    currentMonthYear.innerText = `${monthsName[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

    let datesToRender = [];
    let tempDate = new Date(selectedDate);

    for (let i = 0; i < 7; i++) {
      const dStr = formatLocalDate(tempDate);
      // Omitir hoy si ya pasaron las 18:00 hs
      if (dStr === todayStr && nowHour >= 18) {
        tempDate.setDate(tempDate.getDate() + 1);
        continue;
      }
      datesToRender.push(new Date(tempDate));
      tempDate.setDate(tempDate.getDate() + 1);
    }

    datesToRender.slice(0, 7).forEach((d, idx) => {
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

      pill.addEventListener('click', () => {
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

  function renderSlotsInstant() {
    const targetDateIso = formatLocalDate(selectedDate);
    const now = new Date();
    const isToday = (targetDateIso === formatLocalDate(now));
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const slots = defaultMockSlotsTimes.map(t => {
      const [hStr, mStr] = t.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      
      const isPast = isToday && (h < currentHour || (h === currentHour && m <= currentMin));
      return {
        time_str: t,
        start_iso: `${targetDateIso}T${t}:00`,
        end_iso: `${targetDateIso}T${t}:30`,
        is_available: !isPast
      };
    });

    slotsContainer.innerHTML = slots.map(slot => {
      if (slot.is_available) {
        const isSelectedClass = (selectedTimeSlot === slot.start_iso) ? 'selected' : '';
        return `<div class="slot-pill available ${isSelectedClass}" data-iso="${slot.start_iso}">${slot.time_str}</div>`;
      } else {
        return `<div class="slot-pill disabled">${slot.time_str}</div>`;
      }
    }).join('');

    attachSlotClickEvents();
  }

  // 3. Cargar disponibilidad desde la API con no-store
  async function fetchAvailability() {
    if (!selectedServiceId) return;
    const dateStr = formatLocalDate(selectedDate);

    try {
      const res = await fetch(`/api/v1/booking/availability?service_id=${selectedServiceId}&target_date_str=${dateStr}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.slots && data.slots.length > 0) {
          slotsContainer.innerHTML = data.slots.map(slot => {
            if (slot.is_available) {
              const isSelectedClass = (selectedTimeSlot === slot.start_iso) ? 'selected' : '';
              return `<div class="slot-pill available ${isSelectedClass}" data-iso="${slot.start_iso}">${slot.time_str}</div>`;
            } else {
              return `<div class="slot-pill disabled">${slot.time_str}</div>`;
            }
          }).join('');

          attachSlotClickEvents();
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

        // Auto-colapsar servicios
        if (servicesSection) servicesSection.style.display = 'none';
        if (serviceCollapsedBar) serviceCollapsedBar.classList.add('active');

        // Scroll al botón de confirmación
        btnOpenModal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  // 4. Auto-Sincronización en Tiempo Real (cada 2.5 segundos)
  function startAutoSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !modalOverlay.classList.contains('active')) {
        fetchAvailability();
      }
    }, 2500);
  }

  // 5. Modal de Confirmación con Resumen Claro y Transparente
  btnOpenModal.addEventListener('click', () => {
    if (!selectedTimeSlot) {
      alert('Por favor, selecciona un horario disponible primero.');
      return;
    }

    const timeStr = selectedTimeSlot.split('T')[1].substring(0, 5);
    const dayNum = selectedDate.getDate();
    const monthName = monthsName[selectedDate.getMonth()];
    const dayOfWeekName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][selectedDate.getDay()];
    
    const formattedDateText = `${dayOfWeekName} ${dayNum} de ${monthName} — ${timeStr} hs`;

    const summaryServiceName = document.getElementById('summary-service-name');
    const summaryDateTime = document.getElementById('summary-date-time');
    const summaryDuration = document.getElementById('summary-service-duration');
    const summaryPrice = document.getElementById('summary-service-price');

    const activeCard = document.querySelector('.service-card.active');
    const serviceDurationText = activeCard ? activeCard.querySelector('.service-duration').innerText : '⏱ 60 min';
    const servicePriceText = activeCard ? activeCard.querySelector('.service-price').innerText : '$15.000 ARS';

    if (summaryServiceName) summaryServiceName.innerText = selectedServiceName || 'Ortodoncia / Control';
    if (summaryDateTime) summaryDateTime.innerText = formattedDateText;
    if (summaryDuration) summaryDuration.innerText = serviceDurationText;
    if (summaryPrice) summaryPrice.innerText = servicePriceText;

    document.getElementById('patient-name').value = '';
    document.getElementById('patient-phone').value = '';

    modalOverlay.classList.add('active');
  });

  if (btnCloseModal) btnCloseModal.addEventListener('click', () => modalOverlay.classList.remove('active'));
  if (btnCloseExistingModal) btnCloseExistingModal.addEventListener('click', () => existingModal.classList.remove('active'));
  if (btnCloseSuccessModal) btnCloseSuccessModal.addEventListener('click', () => {
    if (successModal) successModal.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 6. Finalizar Reserva
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('patient-name').value.trim();
    const phone = document.getElementById('patient-phone').value.trim();
    const submitBtn = document.getElementById('btn-submit-modal');

    if (!name || !phone) {
      alert('Por favor completa tu Nombre y Celular.');
      return;
    }

    if (!selectedTimeSlot) {
      alert('Por favor selecciona un horario de la lista.');
      return;
    }

    if (submitBtn) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
    }

    try {
      const checkRes = await fetch(`/api/v1/booking/check-patient?phone=${encodeURIComponent(phone)}&service_id=${selectedServiceId}`, { cache: 'no-store' });
      const checkData = await checkRes.json();

      if (checkData.has_active_appointment) {
        activePatientAppt = checkData.appointment;
        existingApptInfo.innerText = `Hola ${checkData.appointment.patient_name}, detectamos que ya tienes un turno activo de ${checkData.appointment.service_name} el día ${checkData.appointment.start_time_formatted}. ¿Deseas reprogramarlo para el nuevo día y horario elegido o cancelarlo?`;
        modalOverlay.classList.remove('active');
        existingModal.classList.add('active');

        if (submitBtn) {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }
        return;
      }
    } catch (err) {
      console.warn('Error al verificar turno existente:', err);
    }

    createAppointmentCall(name, phone, submitBtn);
  });

  async function createAppointmentCall(name, phone, submitBtn) {
    try {
      const res = await fetch('/api/v1/booking/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedServiceId,
          start_time: selectedTimeSlot,
          patient_full_name: name,
          patient_whatsapp: phone
        })
      });

      const result = await res.json();

      if (res.ok && result && result.success) {
        const timeStr = selectedTimeSlot.split('T')[1].substring(0, 5);
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
        alert('No se pudo confirmar la reserva: ' + (result.detail || 'Por favor intenta nuevamente.'));
      }
    } catch (err) {
      console.error('Error al crear reserva:', err);
      alert('Ocurrió un error al procesar tu turno. Intenta nuevamente.');
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
      if (!activePatientAppt || !selectedTimeSlot) return;

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
          alert('🔄 ¡Tu cita fue reprogramada con éxito para la nueva fecha!');
          existingModal.classList.remove('active');
          fetchAvailability();
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
          alert('❌ Tu cita anterior fue cancelada y el horario quedó libre.');
          existingModal.classList.remove('active');
          fetchAvailability();
        } else {
          alert(result.detail || 'No se pudo cancelar la cita.');
        }
      } catch (e) {
        alert('Error al cancelar la cita.');
      } finally {
        btnCancelExisting.innerText = 'Cancelar cita y liberar horario';
        btnCancelExisting.disabled = false;
      }
    });
  }

  // Inicializar
  fetchServices();
});
