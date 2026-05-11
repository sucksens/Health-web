class TestRolesList:
    def test_list_roles_as_admin(self, client, admin_headers):
        r = client.get("/api/v1/roles", headers=admin_headers)
        assert r.status_code == 200
        roles = r.json()
        assert len(roles) == 3
        role_names = {ro["name"] for ro in roles}
        assert role_names == {"admin", "manager", "user"}

    def test_list_roles_forbidden_for_user(self, client, user_client):
        r = client.get("/api/v1/roles", headers=user_client)
        assert r.status_code == 403


class TestRoleCRUD:
    def test_create_role(self, client, admin_headers):
        r = client.post(
            "/api/v1/roles",
            headers=admin_headers,
            json={"name": "auditor", "description": "Solo lectura"},
        )
        assert r.status_code == 201
        assert r.json()["name"] == "auditor"

    def test_get_role(self, client, admin_headers):
        r = client.get("/api/v1/roles/1", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["name"] == "admin"

    def test_update_role(self, client, admin_headers):
        r = client.post(
            "/api/v1/roles",
            headers=admin_headers,
            json={"name": "temp_role", "description": "Temporal"},
        )
        role_id = r.json()["id"]

        r2 = client.patch(
            f"/api/v1/roles/{role_id}",
            headers=admin_headers,
            json={"description": "Actualizado"},
        )
        assert r2.status_code == 200
        assert r2.json()["description"] == "Actualizado"

    def test_delete_role(self, client, admin_headers):
        r = client.post(
            "/api/v1/roles",
            headers=admin_headers,
            json={"name": "to_delete", "description": "Se eliminara"},
        )
        role_id = r.json()["id"]

        r2 = client.delete(f"/api/v1/roles/{role_id}", headers=admin_headers)
        assert r2.status_code == 204


class TestAssignPermissions:
    def test_assign_permissions_to_role(self, client, admin_headers):
        r = client.post(
            "/api/v1/roles",
            headers=admin_headers,
            json={"name": "custom_role", "description": "Rol personalizado"},
        )
        role_id = r.json()["id"]

        r2 = client.post(
            f"/api/v1/roles/{role_id}/permissions",
            headers=admin_headers,
            json={"permission_ids": [1, 2]},
        )
        assert r2.status_code == 200
        perm_codes = {p["code"] for p in r2.json()["permissions"]}
        assert "users:create" in perm_codes
        assert "users:read" in perm_codes
