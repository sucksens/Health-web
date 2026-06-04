from datetime import datetime, timedelta


class TestPatientProfile:
    def test_get_profile_empty(self, client, admin_headers):
        r = client.get("/api/v1/medical-history/profile", headers=admin_headers)
        assert r.status_code == 200
        assert r.json() is None

    def test_upsert_profile_create(self, client, admin_headers):
        r = client.put(
            "/api/v1/medical-history/profile",
            headers=admin_headers,
            json={
                "blood_type": "O+",
                "allergies": "Penicilina",
                "chronic_conditions": "Ninguna",
            },
        )
        assert r.status_code == 200
        assert r.json()["blood_type"] == "O+"
        assert r.json()["allergies"] == "Penicilina"

    def test_upsert_profile_update(self, client, admin_headers):
        client.put(
            "/api/v1/medical-history/profile",
            headers=admin_headers,
            json={"blood_type": "O+"},
        )
        r = client.put(
            "/api/v1/medical-history/profile",
            headers=admin_headers,
            json={"blood_type": "A-"},
        )
        assert r.status_code == 200
        assert r.json()["blood_type"] == "A-"


class TestSpecialties:
    def test_create_specialty(self, client, admin_headers):
        r = client.post(
            "/api/v1/medical-history/specialties",
            headers=admin_headers,
            json={"name": "Cardiologia"},
        )
        assert r.status_code == 201
        assert r.json()["name"] == "Cardiologia"

    def test_list_specialties(self, client, admin_headers):
        client.post(
            "/api/v1/medical-history/specialties",
            headers=admin_headers,
            json={"name": "Neurologia"},
        )
        r = client.get("/api/v1/medical-history/specialties", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_update_specialty(self, client, admin_headers):
        create = client.post(
            "/api/v1/medical-history/specialties",
            headers=admin_headers,
            json={"name": "Cardio"},
        )
        spec_id = create.json()["id"]

        r = client.patch(
            f"/api/v1/medical-history/specialties/{spec_id}",
            headers=admin_headers,
            json={"name": "Cardiologia"},
        )
        assert r.status_code == 200
        assert r.json()["name"] == "Cardiologia"

    def test_delete_specialty(self, client, admin_headers):
        create = client.post(
            "/api/v1/medical-history/specialties",
            headers=admin_headers,
            json={"name": "ToDelete"},
        )
        spec_id = create.json()["id"]

        r = client.delete(
            f"/api/v1/medical-history/specialties/{spec_id}",
            headers=admin_headers,
        )
        assert r.status_code == 204


class TestDoctors:
    def _create_specialty(self, client, headers, name="Cardiologia"):
        r = client.post(
            "/api/v1/medical-history/specialties",
            headers=headers,
            json={"name": name},
        )
        return r.json()["id"]

    def test_create_doctor(self, client, admin_headers):
        spec_id = self._create_specialty(client, admin_headers)
        r = client.post(
            "/api/v1/medical-history/doctors",
            headers=admin_headers,
            json={
                "name": "Dr. House",
                "specialty_ids": [spec_id],
                "phone": "555-1234",
            },
        )
        assert r.status_code == 201
        assert r.json()["name"] == "Dr. House"
        assert spec_id in r.json()["specialty_ids"]

    def test_create_doctor_multiple_specialties(self, client, admin_headers):
        spec1 = self._create_specialty(client, admin_headers, "Cardiologia")
        spec2 = self._create_specialty(client, admin_headers, "Neurologia")
        r = client.post(
            "/api/v1/medical-history/doctors",
            headers=admin_headers,
            json={
                "name": "Dr. Multi",
                "specialty_ids": [spec1, spec2],
            },
        )
        assert r.status_code == 201
        assert set(r.json()["specialty_ids"]) == {spec1, spec2}

    def test_list_doctors(self, client, admin_headers):
        client.post(
            "/api/v1/medical-history/doctors",
            headers=admin_headers,
            json={"name": "Dr. Smith"},
        )
        r = client.get("/api/v1/medical-history/doctors", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_update_doctor(self, client, admin_headers):
        spec_id = self._create_specialty(client, admin_headers)
        create = client.post(
            "/api/v1/medical-history/doctors",
            headers=admin_headers,
            json={"name": "Dr. Old", "specialty_ids": [spec_id]},
        )
        doc_id = create.json()["id"]

        r = client.patch(
            f"/api/v1/medical-history/doctors/{doc_id}",
            headers=admin_headers,
            json={"name": "Dr. New"},
        )
        assert r.status_code == 200
        assert r.json()["name"] == "Dr. New"
        assert spec_id in r.json()["specialty_ids"]

    def test_delete_doctor(self, client, admin_headers):
        create = client.post(
            "/api/v1/medical-history/doctors",
            headers=admin_headers,
            json={"name": "Dr. Delete"},
        )
        doc_id = create.json()["id"]

        r = client.delete(
            f"/api/v1/medical-history/doctors/{doc_id}", headers=admin_headers
        )
        assert r.status_code == 204


class TestAppointments:
    def _create_doctor(self, client, headers):
        r = client.post(
            "/api/v1/medical-history/doctors",
            headers=headers,
            json={"name": "Dr. Test"},
        )
        return r.json()["id"]

    def test_create_appointment(self, client, admin_headers):
        doc_id = self._create_doctor(client, admin_headers)
        future = (datetime.now() + timedelta(days=7)).isoformat()
        r = client.post(
            "/api/v1/medical-history/appointments",
            headers=admin_headers,
            json={
                "doctor_id": doc_id,
                "date_time": future,
                "reason": "Checkup",
            },
        )
        assert r.status_code == 201
        assert r.json()["reason"] == "Checkup"
        assert r.json()["status"] == "pending"

    def test_list_appointments(self, client, admin_headers):
        doc_id = self._create_doctor(client, admin_headers)
        future = (datetime.now() + timedelta(days=7)).isoformat()
        client.post(
            "/api/v1/medical-history/appointments",
            headers=admin_headers,
            json={"doctor_id": doc_id, "date_time": future},
        )
        r = client.get("/api/v1/medical-history/appointments", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_update_appointment_status(self, client, admin_headers):
        doc_id = self._create_doctor(client, admin_headers)
        future = (datetime.now() + timedelta(days=7)).isoformat()
        create = client.post(
            "/api/v1/medical-history/appointments",
            headers=admin_headers,
            json={"doctor_id": doc_id, "date_time": future},
        )
        appt_id = create.json()["id"]

        r = client.patch(
            f"/api/v1/medical-history/appointments/{appt_id}",
            headers=admin_headers,
            json={"status": "completed"},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "completed"

    def test_delete_appointment(self, client, admin_headers):
        doc_id = self._create_doctor(client, admin_headers)
        future = (datetime.now() + timedelta(days=7)).isoformat()
        create = client.post(
            "/api/v1/medical-history/appointments",
            headers=admin_headers,
            json={"doctor_id": doc_id, "date_time": future},
        )
        appt_id = create.json()["id"]

        r = client.delete(
            f"/api/v1/medical-history/appointments/{appt_id}",
            headers=admin_headers,
        )
        assert r.status_code == 204


class TestMedications:
    def test_create_medication(self, client, admin_headers):
        r = client.post(
            "/api/v1/medical-history/medications",
            headers=admin_headers,
            json={"generic_name": "Ibuprofeno", "brand_name": "Advil"},
        )
        assert r.status_code == 201
        assert r.json()["generic_name"] == "Ibuprofeno"

    def test_list_medications(self, client, admin_headers):
        client.post(
            "/api/v1/medical-history/medications",
            headers=admin_headers,
            json={"generic_name": "Paracetamol"},
        )
        r = client.get("/api/v1/medical-history/medications", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_update_medication(self, client, admin_headers):
        create = client.post(
            "/api/v1/medical-history/medications",
            headers=admin_headers,
            json={"generic_name": "Aspirina"},
        )
        med_id = create.json()["id"]

        r = client.patch(
            f"/api/v1/medical-history/medications/{med_id}",
            headers=admin_headers,
            json={"brand_name": "Bayer"},
        )
        assert r.status_code == 200
        assert r.json()["brand_name"] == "Bayer"

    def test_delete_medication(self, client, admin_headers):
        create = client.post(
            "/api/v1/medical-history/medications",
            headers=admin_headers,
            json={"generic_name": "ToDelete"},
        )
        med_id = create.json()["id"]

        r = client.delete(
            f"/api/v1/medical-history/medications/{med_id}",
            headers=admin_headers,
        )
        assert r.status_code == 204


class TestPrescriptions:
    def _create_doctor(self, client, headers):
        r = client.post(
            "/api/v1/medical-history/doctors",
            headers=headers,
            json={"name": "Dr. Rx"},
        )
        return r.json()["id"]

    def test_create_prescription(self, client, admin_headers):
        doc_id = self._create_doctor(client, admin_headers)
        r = client.post(
            "/api/v1/medical-history/prescriptions",
            headers=admin_headers,
            json={
                "doctor_id": doc_id,
                "diagnosis": "Gripe",
                "details": [
                    {
                        "medication_name": "Paracetamol",
                        "dosage": "500mg",
                        "frequency": "8 horas",
                        "duration_days": 5,
                    }
                ],
            },
        )
        assert r.status_code == 201
        assert r.json()["diagnosis"] == "Gripe"
        assert len(r.json()["details"]) == 1

    def test_list_prescriptions(self, client, admin_headers):
        doc_id = self._create_doctor(client, admin_headers)
        client.post(
            "/api/v1/medical-history/prescriptions",
            headers=admin_headers,
            json={"doctor_id": doc_id, "diagnosis": "Test"},
        )
        r = client.get("/api/v1/medical-history/prescriptions", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1
