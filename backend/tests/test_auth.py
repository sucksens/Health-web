class TestRegister:
    def test_register_success(self, client):
        r = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@test.com",
                "username": "newuser",
                "password": "pass123456",
            },
        )
        assert r.status_code == 201
        data = r.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@test.com"
        assert data["is_active"] is True
        assert any(role["name"] == "user" for role in data["roles"])

    def test_register_duplicate_email(self, client):
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "dup@test.com",
                "username": "user1",
                "password": "pass123456",
            },
        )
        r = client.post(
            "/api/v1/auth/register",
            json={
                "email": "dup@test.com",
                "username": "user2",
                "password": "pass123456",
            },
        )
        assert r.status_code == 409

    def test_register_duplicate_username(self, client):
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "a@test.com",
                "username": "sameuser",
                "password": "pass123456",
            },
        )
        r = client.post(
            "/api/v1/auth/register",
            json={
                "email": "b@test.com",
                "username": "sameuser",
                "password": "pass123456",
            },
        )
        assert r.status_code == 409

    def test_register_short_password(self, client):
        r = client.post(
            "/api/v1/auth/register",
            json={
                "email": "short@test.com",
                "username": "shortpw",
                "password": "123",
            },
        )
        assert r.status_code == 422

    def test_register_invalid_email(self, client):
        r = client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "username": "bademail",
                "password": "pass123456",
            },
        )
        assert r.status_code == 422


class TestLogin:
    def test_login_admin_success(self, client):
        r = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client):
        r = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "wrong"},
        )
        assert r.status_code == 401

    def test_login_nonexistent_user(self, client):
        r = client.post(
            "/api/v1/auth/login",
            json={"username": "ghost", "password": "nopassword"},
        )
        assert r.status_code == 401


class TestMe:
    def test_me_authenticated(self, client, admin_headers):
        r = client.get("/api/v1/auth/me", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == "admin"
        assert len(data["roles"]) >= 1

    def test_me_unauthenticated(self, client):
        r = client.get("/api/v1/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, client):
        r = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert r.status_code == 401


class TestRefreshToken:
    def test_refresh_success(self, client):
        r = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        refresh_token = r.json()["refresh_token"]

        r2 = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert r2.status_code == 200
        data = r2.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_revoked_token(self, client):
        r = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        refresh_token = r.json()["refresh_token"]

        client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        r2 = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert r2.status_code == 401

    def test_refresh_invalid_token(self, client):
        r = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
        )
        assert r.status_code == 401


class TestChangePassword:
    def test_change_password_success(self, client, admin_headers):
        r = client.post(
            "/api/v1/auth/change-password",
            headers=admin_headers,
            json={"current_password": "admin123", "new_password": "newpass123456"},
        )
        assert r.status_code == 204

        r2 = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "newpass123456"},
        )
        assert r2.status_code == 200

    def test_change_password_wrong_current(self, client, admin_headers):
        r = client.post(
            "/api/v1/auth/change-password",
            headers=admin_headers,
            json={"current_password": "wrongpassword", "new_password": "newpass123456"},
        )
        assert r.status_code == 400


class TestLogout:
    def test_logout_success(self, client):
        r = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        refresh_token = r.json()["refresh_token"]

        r2 = client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token},
        )
        assert r2.status_code == 204

    def test_logout_all(self, client, admin_headers):
        r = client.post("/api/v1/auth/logout-all", headers=admin_headers)
        assert r.status_code == 204


class TestHealthEndpoint:
    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
