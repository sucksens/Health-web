class TestBodyMetricsCreate:
    def test_create_metric_requires_height(self, client, user_client):
        r = client.post(
            "/api/v1/body-metrics",
            headers=user_client,
            json={"weight_kg": 75.0},
        )
        assert r.status_code == 422

    def test_create_metric_success(self, client, admin_headers):
        client.patch(
            "/api/v1/users/1",
            headers=admin_headers,
            json={"height_cm": 175.0},
        )

        r = client.post(
            "/api/v1/body-metrics",
            headers=admin_headers,
            json={"weight_kg": 75.0, "waist_cm": 85.0},
        )
        assert r.status_code == 201
        data = r.json()
        assert data["weight_kg"] == 75.0
        assert data["waist_cm"] == 85.0
        assert data["bmi"] > 0

    def test_create_metric_invalid_weight(self, client, admin_headers):
        r = client.post(
            "/api/v1/body-metrics",
            headers=admin_headers,
            json={"weight_kg": 0},
        )
        assert r.status_code == 422


class TestBodyMetricsList:
    def test_list_metrics(self, client, admin_headers):
        client.patch(
            "/api/v1/users/1",
            headers=admin_headers,
            json={"height_cm": 175.0},
        )
        client.post(
            "/api/v1/body-metrics",
            headers=admin_headers,
            json={"weight_kg": 75.0},
        )

        r = client.get("/api/v1/body-metrics", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_get_latest(self, client, admin_headers):
        client.patch(
            "/api/v1/users/1",
            headers=admin_headers,
            json={"height_cm": 175.0},
        )
        client.post(
            "/api/v1/body-metrics",
            headers=admin_headers,
            json={"weight_kg": 75.0},
        )
        client.post(
            "/api/v1/body-metrics",
            headers=admin_headers,
            json={"weight_kg": 74.0},
        )

        r = client.get("/api/v1/body-metrics/latest", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["weight_kg"] == 74.0


class TestBodyMetricsUpdate:
    def test_update_metric(self, client, admin_headers):
        client.patch(
            "/api/v1/users/1",
            headers=admin_headers,
            json={"height_cm": 175.0},
        )
        create = client.post(
            "/api/v1/body-metrics",
            headers=admin_headers,
            json={"weight_kg": 75.0},
        )
        metric_id = create.json()["id"]

        r = client.patch(
            f"/api/v1/body-metrics/{metric_id}",
            headers=admin_headers,
            json={"weight_kg": 73.0},
        )
        assert r.status_code == 200
        assert r.json()["weight_kg"] == 73.0


class TestBodyMetricsDelete:
    def test_delete_metric(self, client, admin_headers):
        client.patch(
            "/api/v1/users/1",
            headers=admin_headers,
            json={"height_cm": 175.0},
        )
        create = client.post(
            "/api/v1/body-metrics",
            headers=admin_headers,
            json={"weight_kg": 75.0},
        )
        metric_id = create.json()["id"]

        r = client.delete(f"/api/v1/body-metrics/{metric_id}", headers=admin_headers)
        assert r.status_code == 204

    def test_delete_nonexistent_metric(self, client, admin_headers):
        r = client.delete("/api/v1/body-metrics/9999", headers=admin_headers)
        assert r.status_code == 404
