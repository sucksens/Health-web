export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface PermissionOut {
  id: number
  code: string
  description: string | null
  module: string | null
  created_at: string
}

export interface RoleOut {
  id: number
  name: string
  description: string | null
  permissions: PermissionOut[]
  created_at: string
  updated_at: string
}

export interface UserOut {
  id: number
  email: string
  username: string
  first_name: string | null
  last_name: string | null
  height_cm: number | null
  sex: string | null
  is_active: boolean
  must_change_password: boolean
  created_at: string
  roles: RoleOut[]
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface ForceChangePasswordRequest {
  new_password: string
  confirm_password: string
}

export interface AuthUser {
  id: number
  email: string
  username: string
  first_name: string | null
  last_name: string | null
  height_cm: number | null
  sex: string | null
  is_active: boolean
  must_change_password: boolean
  created_at: string
  roles: RoleOut[]
}

export interface RoleCreate {
  name: string
  description?: string
}

export interface RoleUpdate {
  name?: string
  description?: string
}

export interface PermissionCreate {
  code: string
  description?: string
  module?: string
}

export interface UserUpdate {
  email?: string
  username?: string
  first_name?: string | null
  last_name?: string | null
  height_cm?: number | null
  sex?: string | null
  is_active?: boolean
  password?: string
  must_change_password?: boolean
}

export interface UserAdminCreate {
  email: string
  username: string
  password: string
  is_active?: boolean
  role_ids?: number[]
}

export interface AssignRoleRequest {
  role_ids: number[]
}

export interface AssignPermissionsRequest {
  permission_ids: number[]
}

export interface SessionOut {
  id: number
  token_jti: string
  created_at: string
  expires_at: string
  revoked_at: string | null
  is_active: boolean
}

export interface ActivityLogOut {
  id: number
  user_id: number | null
  username: string | null
  action: string
  module: string
  type: string
  details: Record<string, any> | string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}
