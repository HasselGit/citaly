document.addEventListener('DOMContentLoaded', () => {
  let selectedServiceId = null;
  let selectedDate = new Date();
  let selectedTimeSlot = null;

  const servicesContainer = document.getElementById('services-container');
  const dateScrollContainer = document.getElementById('date-scroll-container');
  const slotsContainer = document.getElementById('slots-container');
  const currentMonthYear = document.getElementById('current-month-year');
  const btnOpenModal = document.getElementById('btn-open-modal');
  const modalOverlay = document.getElementById('booking-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const bookingForm = document.getElementById('booking-form');
  const waPreviewBox = document.getElementById('whatsapp-preview-box');
  const waMessageText = document.getElementById('whatsapp-message-text');

  // 1. Cargar servicios
  async function fetchServices() {
    try {
      const res = await fetch('/api/v1/booking/services');
      const services = await res.json();
      
      if (services && services.length > 0) {
        servicesContainer.innerHTML = services.map((s, idx) => `
          <div class="service-card ${idx === 0 ? 'active' : ''}" data-service-id="${s.id}" data-duration="${s.duration_minutes}">
            <div>
              <div class="service-name">${s.name}</div>
              <div class="service-duration">⏱ ${s.duration_minutes >= 60 ? (s.duration_minutes / 60) + ' hs' : s.duration_minutes + ' min'}</div>
            </div>
            <div class="service-price">$${s.price ? Number(s.price).toLocaleString('es-AR') : 0} ARS</div>
          </div>
        `).join('');

        selectedServiceId = services[0].id;
        attachServiceClickEvents();
        fetchAvailability();
      }
    } catch (e) {
      console.error('Error al cargar servicios:', e);
    }
  }

  function attachServiceClickEvents() {
    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.service-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedServiceId = card.getAttribute('data-service-id');
        
        // Animación suave de transición al revelar el calendario
        const calSec = document.getElementById('calendar-section');
        if (calSec) {
          calSec.classList.remove('animate-slide-up');
          void calSec.offsetWidth; // Force reflow
          calSec.classList.add('animate-slide-up');
        }
        
        fetchAvailability();
      });
    });
  }

  // 2. Renderizar fechas semanales
  function renderDatePills() {
    const daysName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthsName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    let html = '';
    const today = new Date();
    currentMonthYear.innerText = `${monthsName[today.getMonth()]} ${today.getFullYear()}`;

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isSelected = d.toDateString() === selectedDate.toDateString();

      html += `
        <div class="date-pill ${isSelected ? 'active' : ''}" data-date="${d.toISOString().split('T')[0]}">
          <span class="date-day">${daysName[d.getDay()]}</span>
          <span class="date-num">${d.getDate()}</span>
        </div>
      `;
    }

    dateScrollContainer.innerHTML = html;

    document.querySelectorAll('.date-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.date-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedDate = new Date(pill.getAttribute('data-date'));
        
        if (slotsContainer) {
          slotsContainer.classList.remove('animate-slide-up');
          void slotsContainer.offsetWidth;
          slotsContainer.classList.add('animate-slide-up');
        }

        fetchAvailability();
      });
    });
  }

  // 3. Cargar disponibilidad desde la API
  async function fetchAvailability() {
    if (!selectedServiceId) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    slotsContainer.innerHTML = `<div style="grid-column: span 3; text-align: center; color: var(--text-muted); font-size: 13px;">Cargando disponibilidad...</div>`;

    try {
      const res = await fetch(`/api/v1/booking/availability?service_id=${selectedServiceId}&target_date_str=${dateStr}`);
      const data = await res.json();

      if (data.slots && data.slots.length > 0) {
        slotsContainer.innerHTML = data.slots.map(slot => {
          if (slot.is_available) {
            return `<div class="slot-pill available" data-iso="${slot.start_iso}">${slot.time_str}</div>`;
          } else {
            return `<div class="slot-pill disabled">${slot.time_str}</div>`;
          }
        }).join('');

        attachSlotClickEvents();
      } else {
        slotsContainer.innerHTML = `<div style="grid-column: span 3; text-align: center; color: var(--text-muted); font-size: 13px;">No hay turnos disponibles para este día.</div>`;
      }
    } catch (e) {
      console.error('Error al cargar disponibilidad:', e);
    }
  }

  function attachSlotClickEvents() {
    document.querySelectorAll('.slot-pill.available').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.slot-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        selectedTimeSlot = pill.getAttribute('data-iso');
        btnOpenModal.removeAttribute('disabled');
        btnOpenModal.style.background = '#0F172A';
      });
    });
  }

  // 4. Modal de Confirmación
  btnOpenModal.addEventListener('click', () => {
    if (!selectedTimeSlot) {
      alert('Por favor, selecciona un horario disponible primero.');
      return;
    }
    // Limpiar campos del formulario para la privacidad entre pacientes
    document.getElementById('patient-name').value = '';
    document.getElementById('patient-phone').value = '';
    waPreviewBox.style.display = 'none';

    modalOverlay.classList.add('active');
  });

  btnCloseModal.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
  });

  const existingModal = document.getElementById('existing-appointment-modal');
  const existingApptInfo = document.getElementById('existing-appt-info');
  const btnRescheduleExisting = document.getElementById('btn-reschedule-existing');
  const btnCancelExisting = document.getElementById('btn-cancel-existing');
  const btnCloseExistingModal = document.getElementById('btn-close-existing-modal');

  let activePatientAppt = null;

  // 5. Finalizar Reserva con comprobación Anti-Duplicados
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('patient-name').value;
    const phone = document.getElementById('patient-phone').value;
    const submitBtn = bookingForm.querySelector('button[type="submit"]');

    if (submitBtn) {
      submitBtn.innerText = 'Procesando Reserva ⌛...';
      submitBtn.disabled = true;
    }

    // Verificar primero si el paciente ya tiene un turno activo para esta especialidad
    try {
      const checkRes = await fetch(`/api/v1/booking/check-patient?phone=${encodeURIComponent(phone)}&service_id=${selectedServiceId}`);
      const checkData = await checkRes.json();

      if (checkData.has_active_appointment) {
        activePatientAppt = checkData.appointment;
        existingApptInfo.innerText = `Hola ${checkData.appointment.patient_name}, detectamos que ya tienes un turno activo de ${checkData.appointment.service_name} el día ${checkData.appointment.start_time_formatted}. ¿Deseas reprogramarlo para el nuevo día y horario elegido o cancelarlo?`;
        modalOverlay.classList.remove('active');
        existingModal.classList.add('active');

        if (submitBtn) {
          submitBtn.innerText = 'Finalizar Reserva de Turno ✔';
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

      if (result.success) {
        alert('🎉 ¡Reserva confirmada exitosamente!');
        modalOverlay.classList.remove('active');
        fetchAvailability();
      } else {
        alert(result.detail || 'Ocurrió un error al procesar la reserva.');
      }
    } catch (err) {
      alert('Ocurrió un error al procesar la reserva. Intenta de nuevo.');
      console.error(err);
    } finally {
      if (submitBtn) {
        submitBtn.innerText = 'Finalizar Reserva de Turno ✔';
        submitBtn.disabled = false;
      }
    }
  }

  // Acciones Modal Cita Existente (Reprogramar / Cancelar)
  if (btnRescheduleExisting) {
    btnRescheduleExisting.addEventListener('click', async () => {
      if (!activePatientAppt) return;
      try {
        const res = await fetch('/api/v1/booking/reschedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointment_id: activePatientAppt.id,
            new_start_time: selectedTimeSlot
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ ' + data.message);
          existingModal.classList.remove('active');
          fetchAvailability();
        }
      } catch (e) {
        alert('Error al reprogramar el turno.');
      }
    });
  }

  if (btnCancelExisting) {
    btnCancelExisting.addEventListener('click', async () => {
      if (!activePatientAppt) return;
      try {
        const res = await fetch(`/api/v1/booking/cancel/${activePatientAppt.token_cancellation}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert('✅ Cita anterior cancelada exitosamente. El horario ha sido liberado.');
          existingModal.classList.remove('active');
          fetchAvailability();
        }
      } catch (e) {
        alert('Error al cancelar el turno.');
      }
    });
  }

  if (btnCloseExistingModal) {
    btnCloseExistingModal.addEventListener('click', () => {
      existingModal.classList.remove('active');
    });
  }

  // Inicialización
  renderDatePills();
  fetchServices();
});
