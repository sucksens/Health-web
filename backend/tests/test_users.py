class TestUsersList:
    def test_list_users_as_admin(self, client, admin_headers):
        r = client.get("/api/v1/users", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_list_users_as_regular_user_forbidden(self, client, user_client):
        r = client.get("/api/v1/users", headers=user_client)
        assert r.status_code == 403


class TestUserCreate:
    def test_create_user_by_admin(self, client, admin_headers):
        r = client.post(
            "/api/v1/users",
            headers=admin_headers,
            json={
                "email": "created@test.com",
                "username": "createduser",
                "password": "pass123456",
                "is_active": True,
                "role_ids": [],
            },
        )
        assert r.status_code == 201
        data = r.json()
        assert data["username"] == "createduser"
        assert data["email"] == "created@test.com"

    def test_create_user_forbidden_for_user(self, client, user_client):
        r = client.post(
            "/api/v1/users",
            headers=user_client,
            json={
                "email": "nope@test.com",
                "username": "nope",
                "password": "pass123456",
            },
        )
        assert r.status_code == 403


class TestUserGet:
    def test_get_user_by_admin(self, client, admin_headers):
        r = client.get("/api/v1/users/1", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["username"] == "admin"

    def test_get_nonexistent_user(self, client, admin_headers):
        r = client.get("/api/v1/users/9999", headers=admin_headers)
        assert r.status_code == 404


class TestUserUpdate:
    def test_update_user(self, client, admin_headers):
        r = client.patch(
            "/api/v1/users/1",
            headers=admin_headers,
            json={"first_name": "Admin", "last_name": "Test"},
        )
        assert r.status_code == 200
        assert r.json()["first_name"] == "Admin"
        assert r.json()["last_name"] == "Test"


class TestUserDelete:
    def test_delete_user(self, client, admin_headers):
        reg = client.post(
            "/api/v1/auth/register",
            json={
                "email": "delete@test.com",
                "username": "deleteuser",
                "password": "pass123456",
            },
        )
        user_id = reg.json()["id"]

        r = client.delete(f"/api/v1/users/{user_id}", headers=admin_headers)
        assert r.status_code == 204

    def test_delete_nonexistent_user(self, client, admin_headers):
        r = client.delete("/api/v1/users/9999", headers=admin_headers)
        assert r.status_code == 404


class TestAssignRoles:
    def test_assign_role_to_user(self, client, admin_headers):
        reg = client.post(
            "/api/v1/auth/register",
            json={
                "email": "roletest@test.com",
                "username": "roletest",
                "password": "pass123456",
            },
        )
        user_id = reg.json()["id"]

        r = client.post(
            f"/api/v1/users/{user_id}/roles",
            headers=admin_headers,
            json={"role_ids": [2]},
        )
        assert r.status_code == 200
        role_names = [ro["name"] for ro in r.json()["roles"]]
        assert "manager" in role_names
