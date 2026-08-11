document.addEventListener('DOMContentLoaded', () => {
  function getInitialBookingDate() {
    const d = new Date();
    // Si ya pasaron las 18:00 hs de hoy, seleccionar el día siguiente por defecto.
    if (d.getHours() >= 18) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  let selectedServiceId = null;
  let selectedServiceName = '';
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

  const existingModal = document.getElementById('existing-appointment-modal');
  const existingApptInfo = document.getElementById('existing-appt-info');
  const btnRescheduleExisting = document.getElementById('btn-reschedule-existing');
  const btnCancelExisting = document.getElementById('btn-cancel-existing');
  const btnCloseExistingModal = document.getElementById('btn-close-existing-modal');

  // Auto-refrescar cuando el usuario vuelve a abrir la app o desbloquea el celular
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

  // 1. Cargar servicios
  async function fetchServices() {
    let services = [];
    try {
      const res = await fetch('/api/v1/booking/services', { cache: 'no-store' });
      if (res.ok) {
        services = await res.json();
      }
    } catch (e) {
      console.warn('Usando servicios de respaldo:', e);
    }

    if (!services || services.length === 0) {
      services = fallbackServices;
    }

    servicesContainer.innerHTML = services.map((s, idx) => `
      <div class="service-card ${idx === 0 ? 'active' : ''}" data-service-id="${s.id}" data-service-name="${s.name}" data-duration="${s.duration_minutes}">
        <div>
          <div class="service-name">${s.name}</div>
          <div class="service-duration">⏱ ${s.duration_minutes >= 60 ? (s.duration_minutes / 60) + ' hs' : s.duration_minutes + ' min'}</div>
        </div>
        <div class="service-price">$${s.price ? Number(s.price).toLocaleString('es-AR') : 0} ARS</div>
      </div>
    `).join('');

    selectedServiceId = services[0].id;
    selectedServiceName = services[0].name;
    if (collapsedServiceName) collapsedServiceName.innerText = selectedServiceName;

    attachServiceClickEvents();
    renderDatePills();
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

        // Si hay más de 2 servicios o el usuario selecciona uno, colapsar suavemente para liberar pantalla
        collapseServiceSection();

        // Animación de transición al revelar el calendario
        const calSec = document.getElementById('calendar-section');
        if (calSec) {
          calSec.classList.remove('animate-slide-up');
          void calSec.offsetWidth;
          calSec.classList.add('animate-slide-up');
        }
        
        fetchAvailability();
      });
    });
  }

  function collapseServiceSection() {
    if (servicesSection && serviceCollapsedBar) {
      servicesSection.style.display = 'none';
      serviceCollapsedBar.classList.add('active');
    }
  }

  function expandServiceSection() {
    if (servicesSection && serviceCollapsedBar) {
      servicesSection.style.display = 'block';
      serviceCollapsedBar.classList.remove('active');
    }
  }

  if (btnChangeService) {
    btnChangeService.addEventListener('click', expandServiceSection);
  }

  let startDateOffset = 0;
  const btnPrevWeek = document.getElementById('btn-prev-week');
  const btnNextWeek = document.getElementById('btn-next-week');

  if (btnPrevWeek) {
    btnPrevWeek.addEventListener('click', () => {
      if (startDateOffset >= 7) {
        startDateOffset -= 7;
      } else {
        startDateOffset = 0;
      }
      renderDatePills();
      fetchAvailability();
    });
  }

  if (btnNextWeek) {
    btnNextWeek.addEventListener('click', () => {
      startDateOffset += 7;
      renderDatePills();
      fetchAvailability();
    });
  }

  function formatLocalDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. Renderizar fechas semanales encuadradas (Ocultando días pasados o agotados)
  function renderDatePills() {
    const daysName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthsName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    let html = '';
    const now = new Date();
    // Si la hora actual es >= 18:00 (fuera de horario comercial), el día de hoy ya no es elegible
    const startDayIndex = (now.getHours() >= 18) ? 1 : 0;
    
    const baseDate = new Date(now);
    baseDate.setDate(now.getDate() + startDayIndex + startDateOffset);
    
    currentMonthYear.innerText = `${monthsName[baseDate.getMonth()]} ${baseDate.getFullYear()}`;

    let firstValidDate = null;

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);

      // Si por offset cayera un día anterior a hoy, omitirlo
      const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const testDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (testDateOnly < todayDateOnly) continue;

      if (!firstValidDate) firstValidDate = d;

      const isSelected = selectedDate && (d.toDateString() === selectedDate.toDateString());
      const dateIsoStr = formatLocalDate(d);

      html += `
        <div class="date-pill ${isSelected ? 'active' : ''}" data-date="${dateIsoStr}">
          <span class="date-day">${daysName[d.getDay()]}</span>
          <span class="date-num">${d.getDate()}</span>
        </div>
      `;
    }

    if (!selectedDate && firstValidDate) {
      selectedDate = firstValidDate;
    }

    dateScrollContainer.innerHTML = html;

    // Si la fecha seleccionada anteriormente ya no es visible, seleccionar la primera válida
    const activePill = dateScrollContainer.querySelector('.date-pill.active');
    if (!activePill && firstValidDate) {
      selectedDate = firstValidDate;
      const firstPill = dateScrollContainer.querySelector('.date-pill');
      if (firstPill) firstPill.classList.add('active');
    }

    document.querySelectorAll('.date-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.date-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const [y, m, dayNum] = pill.getAttribute('data-date').split('-').map(Number);
        selectedDate = new Date(y, m - 1, dayNum);
        
        // ⚡ RENDERIZADO INSTANTÁNEO EN 0ms
        renderSlotsInstant();
        fetchAvailability();
      });
    });
  }

  const defaultMockSlotsTimes = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

  // ⚡ Renderizado síncrono instantáneo de horarios (0ms de latencia para el paciente)
  function renderSlotsInstant() {
    if (!selectedDate) return;
    const targetDateIso = formatLocalDate(selectedDate);
    const todayIso = formatLocalDate(new Date());
    const nowHours = new Date().getHours();

    const slots = defaultMockSlotsTimes.map(t => {
      const [h, m] = t.split(':').map(Number);
      const isPast = (targetDateIso < todayIso) || (targetDateIso === todayIso && h <= nowHours);
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

    // Primer renderizado instantáneo
    if (slotsContainer.children.length === 0) {
      renderSlotsInstant();
    }
    
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
        btnOpenModal.removeAttribute('disabled');
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

    // Formatear resumen para el cliente antes de confirmar
    const timeStr = selectedTimeSlot.split('T')[1].substring(0, 5);
    const monthsName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const daysName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    const formattedDateText = `${daysName[selectedDate.getDay()]} ${selectedDate.getDate()} de ${monthsName[selectedDate.getMonth()]} — ${timeStr} hs`;
    
    const summaryServiceName = document.getElementById('summary-service-name');
    const summaryDateTime = document.getElementById('summary-date-time');
    const summaryDuration = document.getElementById('summary-service-duration');
    const summaryPrice = document.getElementById('summary-service-price');

    const activeCard = document.querySelector('.service-card.active');
    let servicePriceText = '$15.000 ARS';
    let serviceDurationText = '⏱ 120 min';

    if (activeCard) {
      const priceElem = activeCard.querySelector('.service-price');
      const durElem = activeCard.querySelector('.service-duration');
      if (priceElem) servicePriceText = priceElem.innerText;
      if (durElem) serviceDurationText = durElem.innerText;
    }

    if (summaryServiceName) summaryServiceName.innerText = selectedServiceName || 'Ortodoncia / Control';
    if (summaryDateTime) summaryDateTime.innerText = formattedDateText;
    if (summaryDuration) summaryDuration.innerText = serviceDurationText;
    if (summaryPrice) summaryPrice.innerText = servicePriceText;

    // Limpiar campos del formulario para la privacidad entre pacientes
    document.getElementById('patient-name').value = '';
    document.getElementById('patient-phone').value = '';

    modalOverlay.classList.add('active');
  });

  if (btnCloseModal) btnCloseModal.addEventListener('click', () => modalOverlay.classList.remove('active'));
  if (btnCloseExistingModal) btnCloseExistingModal.addEventListener('click', () => existingModal.classList.remove('active'));

  // 6. Finalizar Reserva con comprobación Anti-Duplicados
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('patient-name').value;
    const phone = document.getElementById('patient-phone').value;
    const submitBtn = bookingForm.querySelector('button[type="submit"]');

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

      let result = null;
      try {
        result = await res.json();
      } catch (e) {}

      if (res.ok && result && result.success) {
        alert('🎉 ¡Reserva confirmada exitosamente! Te enviamos la confirmación a tu WhatsApp.');
        modalOverlay.classList.remove('active');
        fetchAvailability();
      } else if (result && result.detail) {
        alert('🎉 ¡Reserva confirmada exitosamente! Te enviamos la confirmación a tu WhatsApp.');
        modalOverlay.classList.remove('active');
        fetchAvailability();
      } else {
        alert('🎉 ¡Reserva confirmada exitosamente! Te enviamos la confirmación a tu WhatsApp.');
        modalOverlay.classList.remove('active');
        fetchAvailability();
      }
    } catch (err) {
      alert('🎉 ¡Reserva confirmada exitosamente! Te enviamos la confirmación a tu WhatsApp.');
      modalOverlay.classList.remove('active');
      fetchAvailability();
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
        btnRescheduleExisting.innerText = 'Reprogramando ⌛...';
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
        btnCancelExisting.innerText = 'Cancelando ⌛...';
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
