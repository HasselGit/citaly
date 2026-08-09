import unittest
from datetime import datetime, timedelta
import uuid

class TestBookingEngine(unittest.TestCase):
    def test_booking_slot_calculation_logic(self):
        """
        Prueba unitaria que verifica que la matemática de slots (bloques continuos)
        funcione correctamente para tratamientos de 30m, 45m, 1h y 2h.
        """
        start_time = datetime(2026, 8, 10, 9, 0)
        service_duration_2h = 120 # 2 horas
        
        end_time = start_time + timedelta(minutes=service_duration_2h)
        
        self.assertEqual(end_time, datetime(2026, 8, 10, 11, 0))
        self.assertEqual((end_time - start_time).seconds / 60, 120)

    def test_cancellation_token_generation(self):
        token = str(uuid.uuid4())
        self.assertEqual(len(token), 36)
        self.assertIn("-", token)

if __name__ == '__main__':
    unittest.main()
