from datetime import date, timedelta


class TestWeightGoalsCreate:
    def test_create_goal_success(self, client, admin_headers):
        target = (date.today() + timedelta(days=30)).isoformat()
        r = client.post(
            "/api/v1/weight-goals",
            headers=admin_headers,
            json={
                "target_weight_kg": 70.0,
                "start_weight_kg": 80.0,
                "target_date": target,
                "notes": "Test goal",
            },
        )
        assert r.status_code == 201
        data = r.json()
        assert data["target_weight_kg"] == 70.0
        assert data["start_weight_kg"] == 80.0
        assert data["status"] == "active"

    def test_create_goal_replaces_active(self, client, admin_headers):
        target = (date.today() + timedelta(days=30)).isoformat()
        client.post(
            "/api/v1/weight-goals",
            headers=admin_headers,
            json={
                "target_weight_kg": 70.0,
                "start_weight_kg": 80.0,
                "target_date": target,
            },
        )
        r = client.post(
            "/api/v1/weight-goals",
            headers=admin_headers,
            json={
                "target_weight_kg": 72.0,
                "start_weight_kg": 80.0,
                "target_date": target,
            },
        )
        assert r.status_code == 201
        assert r.json()["status"] == "active"

    def test_create_goal_past_date_fails(self, client, admin_headers):
        past = (date.today() - timedelta(days=1)).isoformat()
        r = client.post(
            "/api/v1/weight-goals",
            headers=admin_headers,
            json={
                "target_weight_kg": 70.0,
                "start_weight_kg": 80.0,
                "target_date": past,
            },
        )
        assert r.status_code == 422


class TestWeightGoalsRead:
    def test_list_goals(self, client, admin_headers):
        target = (date.today() + timedelta(days=30)).isoformat()
        client.post(
            "/api/v1/weight-goals",
            headers=admin_headers,
            json={
                "target_weight_kg": 70.0,
                "start_weight_kg": 80.0,
                "target_date": target,
            },
        )
        r = client.get("/api/v1/weight-goals", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_get_active_goal(self, client, admin_headers):
        target = (date.today() + timedelta(days=30)).isoformat()
        client.post(
            "/api/v1/weight-goals",
            headers=admin_headers,
            json={
                "target_weight_kg": 70.0,
                "start_weight_kg": 80.0,
                "target_date": target,
            },
        )
        r = client.get("/api/v1/weight-goals/active", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "active"


class TestWeightGoalsActions:
    def test_achieve_goal(self, client, admin_headers):
        target = (date.today() + timedelta(days=30)).isoformat()
        create = client.post(
            "/api/v1/weight-goals",
            headers=admin_headers,
            json={
                "target_weight_kg": 70.0,
                "start_weight_kg": 80.0,
                "target_date": target,
            },
        )
        goal_id = create.json()["id"]

        r = client.post(
            f"/api/v1/weight-goals/{goal_id}/achieve", headers=admin_headers
        )
        assert r.status_code == 200
        assert r.json()["status"] == "achieved"
        assert r.json()["achieved_at"] is not None

    def test_abandon_goal(self, client, admin_headers):
        target = (date.today() + timedelta(days=30)).isoformat()
        create = client.post(
            "/api/v1/weight-goals",
            headers=admin_headers,
            json={
                "target_weight_kg": 70.0,
                "start_weight_kg": 80.0,
                "target_date": target,
            },
        )
        goal_id = create.json()["id"]

        r = client.post(
            f"/api/v1/weight-goals/{goal_id}/abandon", headers=admin_headers
        )
        assert r.status_code == 200
        assert r.json()["status"] == "abandoned"


class TestWeightGoalsDelete:
    def test_delete_goal(self, client, admin_headers):
        target = (date.today() + timedelta(days=30)).isoformat()
        create = client.post(
            "/api/v1/weight-goals",
            headers=admin_headers,
            json={
                "target_weight_kg": 70.0,
                "start_weight_kg": 80.0,
                "target_date": target,
            },
        )
        goal_id = create.json()["id"]

        r = client.delete(f"/api/v1/weight-goals/{goal_id}", headers=admin_headers)
        assert r.status_code == 204
