class TestBloodPressureCreate:
    def test_create_reading_success(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 110, "diastolic": 70},
        )
        assert r.status_code == 201
        data = r.json()
        assert data["systolic"] == 110
        assert data["diastolic"] == 70
        assert data["classification"] == "Normal"
        assert data["heart_rate"] is None

    def test_create_reading_with_heart_rate(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 128, "diastolic": 85, "heart_rate": 72},
        )
        assert r.status_code == 201
        data = r.json()
        assert data["heart_rate"] == 72
        assert data["classification"] == "Stage 1"

    def test_create_reading_systolic_le_diastolic(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 80, "diastolic": 120},
        )
        assert r.status_code == 422

    def test_create_reading_invalid_systolic(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 10, "diastolic": 80},
        )
        assert r.status_code == 422

    def test_create_reading_with_notes(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={
                "systolic": 118,
                "diastolic": 76,
                "notes": "Despues de correr",
            },
        )
        assert r.status_code == 201
        assert r.json()["notes"] == "Despues de correr"


class TestBloodPressureClassification:
    def test_normal(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 110, "diastolic": 70},
        )
        assert r.json()["classification"] == "Normal"

    def test_elevated(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 125, "diastolic": 75},
        )
        assert r.json()["classification"] == "Elevated"

    def test_stage1(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 135, "diastolic": 85},
        )
        assert r.json()["classification"] == "Stage 1"

    def test_stage2(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 145, "diastolic": 95},
        )
        assert r.json()["classification"] == "Stage 2"

    def test_crisis(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 185, "diastolic": 125},
        )
        assert r.json()["classification"] == "Crisis"

    def test_low(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 85, "diastolic": 55},
        )
        assert r.json()["classification"] == "Low"

    def test_low_by_systolic(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 85, "diastolic": 70},
        )
        assert r.json()["classification"] == "Low"

    def test_low_by_diastolic(self, client, admin_headers):
        r = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 110, "diastolic": 55},
        )
        assert r.json()["classification"] == "Low"


class TestBloodPressureList:
    def test_list_readings(self, client, admin_headers):
        client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 120, "diastolic": 80},
        )
        r = client.get("/api/v1/blood-pressure", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_get_latest(self, client, admin_headers):
        client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 120, "diastolic": 80},
        )
        client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 130, "diastolic": 85},
        )
        r = client.get("/api/v1/blood-pressure/latest", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["systolic"] == 130


class TestBloodPressureUpdate:
    def test_update_reading(self, client, admin_headers):
        create = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 120, "diastolic": 80},
        )
        reading_id = create.json()["id"]
        r = client.patch(
            f"/api/v1/blood-pressure/{reading_id}",
            headers=admin_headers,
            json={"systolic": 125, "heart_rate": 70},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["systolic"] == 125
        assert data["heart_rate"] == 70
        assert data["classification"] == "Stage 1"


class TestBloodPressureDelete:
    def test_delete_reading(self, client, admin_headers):
        create = client.post(
            "/api/v1/blood-pressure",
            headers=admin_headers,
            json={"systolic": 120, "diastolic": 80},
        )
        reading_id = create.json()["id"]
        r = client.delete(f"/api/v1/blood-pressure/{reading_id}", headers=admin_headers)
        assert r.status_code == 204

    def test_delete_nonexistent_reading(self, client, admin_headers):
        r = client.delete("/api/v1/blood-pressure/9999", headers=admin_headers)
        assert r.status_code == 404

    def test_get_nonexistent_reading(self, client, admin_headers):
        r = client.get("/api/v1/blood-pressure/9999", headers=admin_headers)
        assert r.status_code == 404
