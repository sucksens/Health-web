import sys
import time
import json
import subprocess
import requests

BASE = "http://127.0.0.1:8000/api/v1"


def wait_for_server(seconds=8):
    for _ in range(seconds * 4):
        try:
            r = requests.get("http://127.0.0.1:8000/health", timeout=1)
            if r.status_code == 200:
                return True
        except Exception:
            time.sleep(0.25)
    return False


def main():
    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
            "--app-dir",
            "backend",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    try:
        if not wait_for_server():
            proc.terminate()
            _, stderr = proc.communicate(timeout=5)
            print("SERVER FAILED TO START:")
            print(stderr.decode()[-2000:])
            return

        print("Server started OK")

        # TEST 1
        print("\n" + "=" * 60)
        print("TEST 1: LOGIN admin/admin123")
        r = requests.post(
            f"{BASE}/auth/login",
            json={"username": "admin", "password": "admin123"},
            timeout=10,
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        print("PASS")

        # TEST 2
        print("\n" + "=" * 60)
        print("TEST 2: GET /auth/me")
        r = requests.get(f"{BASE}/auth/me", headers=h, timeout=10)
        print(f"Status: {r.status_code}")
        assert r.status_code == 200
        me = r.json()
        print(json.dumps(me, indent=2, ensure_ascii=False))
        assert me["username"] == "admin"
        assert len(me["roles"]) >= 1
        print("PASS")

        # TEST 3
        print("\n" + "=" * 60)
        print("TEST 3: GET /roles")
        r = requests.get(f"{BASE}/roles", headers=h, timeout=10)
        print(f"Status: {r.status_code}")
        assert r.status_code == 200
        roles = r.json()
        for role in roles:
            perms = [p["code"] for p in role["permissions"]]
            print(f"  {role['name']}: {perms}")
        assert len(roles) == 3
        print("PASS")

        # TEST 4
        print("\n" + "=" * 60)
        print("TEST 4: GET /permissions")
        r = requests.get(f"{BASE}/permissions", headers=h, timeout=10)
        print(f"Status: {r.status_code}")
        assert r.status_code == 200
        perms = r.json()
        print(f"Total: {len(perms)} permisos")
        assert len(perms) == 15
        print("PASS")

        # TEST 5
        print("\n" + "=" * 60)
        print("TEST 5: GET /users")
        r = requests.get(f"{BASE}/users", headers=h, timeout=10)
        print(f"Status: {r.status_code}")
        assert r.status_code == 200
        users = r.json()
        for u in users:
            print(
                f"  {u['username']} ({u['email']}) roles={[ro['name'] for ro in u['roles']]}"
            )
        print("PASS")

        # TEST 6
        print("\n" + "=" * 60)
        print("TEST 6: REGISTER testuser@test.com")
        r = requests.post(
            f"{BASE}/auth/register",
            json={
                "email": "testuser@test.com",
                "username": "testuser",
                "password": "test123456",
            },
            timeout=10,
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 201
        new_user = r.json()
        print(
            f"  id={new_user['id']}, roles={[ro['name'] for ro in new_user['roles']]}"
        )
        print("PASS")

        # TEST 7
        print("\n" + "=" * 60)
        print("TEST 7: LOGIN testuser")
        r = requests.post(
            f"{BASE}/auth/login",
            json={"username": "testuser", "password": "test123456"},
            timeout=10,
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 200
        user_token = r.json()["access_token"]
        uh = {"Authorization": f"Bearer {user_token}"}
        print("PASS")

        # TEST 8 - RBAC forbidden
        print("\n" + "=" * 60)
        print("TEST 8: RBAC - user lee roles (DEBE SER 403)")
        r = requests.get(f"{BASE}/roles", headers=uh, timeout=10)
        print(f"Status: {r.status_code}")
        assert r.status_code == 403, f"Expected 403, got {r.status_code}"
        print(f"  {r.json()['detail']}")
        print("PASS")

        # TEST 9 - RBAC forbidden
        print("\n" + "=" * 60)
        print("TEST 9: RBAC - user lee users (DEBE SER 403)")
        r = requests.get(f"{BASE}/users", headers=uh, timeout=10)
        print(f"Status: {r.status_code}")
        assert r.status_code == 403
        print(f"  {r.json()['detail']}")
        print("PASS")

        # TEST 10
        print("\n" + "=" * 60)
        print("TEST 10: Admin asigna rol manager a testuser")
        r = requests.post(
            f"{BASE}/users/{new_user['id']}/roles",
            headers=h,
            json={"role_ids": [2]},
            timeout=10,
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 200
        updated = r.json()
        role_names = [ro["name"] for ro in updated["roles"]]
        print(f"  Roles: {role_names}")
        assert "manager" in role_names
        print("PASS")

        # TEST 11
        print("\n" + "=" * 60)
        print("TEST 11: testuser re-login - permisos manager")
        r = requests.post(
            f"{BASE}/auth/login",
            json={"username": "testuser", "password": "test123456"},
            timeout=10,
        )
        user_token = r.json()["access_token"]
        uh = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(f"{BASE}/auth/me", headers=uh, timeout=10)
        me_data = r.json()
        all_perms = set()
        for role in me_data["roles"]:
            for perm in role["permissions"]:
                all_perms.add(perm["code"])
        print(f"  Permisos: {sorted(all_perms)}")
        assert "expenses:read" in all_perms
        assert "users:read" in all_perms
        print("PASS")

        # TEST 12
        print("\n" + "=" * 60)
        print("TEST 12: Admin crea permiso reports:export")
        r = requests.post(
            f"{BASE}/permissions",
            headers=h,
            json={
                "code": "reports:export",
                "description": "Exportar reportes",
                "module": "reports",
            },
            timeout=10,
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 201
        new_perm = r.json()
        print(f"  {new_perm['code']} (id={new_perm['id']})")
        print("PASS")

        # TEST 13
        print("\n" + "=" * 60)
        print("TEST 13: Admin crea rol auditor")
        r = requests.post(
            f"{BASE}/roles",
            headers=h,
            json={"name": "auditor", "description": "Auditor de solo lectura"},
            timeout=10,
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 201
        new_role = r.json()
        print(f"  {new_role['name']} (id={new_role['id']})")
        print("PASS")

        # TEST 14
        print("\n" + "=" * 60)
        print("TEST 14: Admin asigna permisos a auditor")
        r = requests.post(
            f"{BASE}/roles/{new_role['id']}/permissions",
            headers=h,
            json={"permission_ids": [12, 15]},
            timeout=10,
        )
        print(f"Status: {r.status_code}")
        assert r.status_code == 200
        auditor = r.json()
        print(f"  Permisos: {[p['code'] for p in auditor['permissions']]}")
        print("PASS")

        # TEST 15
        print("\n" + "=" * 60)
        print("TEST 15: Admin elimina testuser")
        r = requests.delete(f"{BASE}/users/{new_user['id']}", headers=h, timeout=10)
        print(f"Status: {r.status_code}")
        assert r.status_code == 204
        print("PASS")

        print("\n" + "=" * 60)
        print("TODOS LOS TESTS PASARON (15/15)")
        print("=" * 60)

    finally:
        proc.terminate()
        proc.wait(timeout=5)


if __name__ == "__main__":
    main()
