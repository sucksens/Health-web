class TestPermissionsList:
    def test_list_permissions(self, client, admin_headers):
        r = client.get("/api/v1/permissions", headers=admin_headers)
        assert r.status_code == 200
        perms = r.json()
        assert len(perms) >= 15

    def test_filter_permissions_by_module(self, client, admin_headers):
        r = client.get("/api/v1/permissions?module=users", headers=admin_headers)
        assert r.status_code == 200
        for perm in r.json():
            assert perm["module"] == "users"

    def test_list_permissions_forbidden_for_user(self, client, user_client):
        r = client.get("/api/v1/permissions", headers=user_client)
        assert r.status_code == 403


class TestPermissionCreate:
    def test_create_permission(self, client, admin_headers):
        r = client.post(
            "/api/v1/permissions",
            headers=admin_headers,
            json={
                "code": "reports:export",
                "description": "Exportar reportes",
                "module": "reports",
            },
        )
        assert r.status_code == 201
        assert r.json()["code"] == "reports:export"

    def test_create_permission_invalid_code(self, client, admin_headers):
        r = client.post(
            "/api/v1/permissions",
            headers=admin_headers,
            json={
                "code": "invalid-code",
                "description": "Bad code",
                "module": "test",
            },
        )
        assert r.status_code == 422
