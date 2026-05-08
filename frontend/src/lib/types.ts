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

export interface BodyMetricOut {
  id: number
  user_id: number
  weight_kg: number
  bmi: number
  waist_cm: number | null
  chest_cm: number | null
  arm_cm: number | null
  recorded_at: string
  created_at: string
}

export interface BodyMetricCreate {
  weight_kg: number
  waist_cm?: number | null
  chest_cm?: number | null
  arm_cm?: number | null
  recorded_at?: string | null
}

export interface BodyMetricUpdate {
  weight_kg?: number | null
  waist_cm?: number | null
  chest_cm?: number | null
  arm_cm?: number | null
  recorded_at?: string | null
}

export interface WeightGoalOut {
  id: number
  user_id: number
  target_weight_kg: number
  start_weight_kg: number
  target_date: string
  status: string
  notes: string | null
  achieved_at: string | null
  created_at: string
  updated_at: string
}

export interface WeightGoalWithProgress extends WeightGoalOut {
  current_weight: number | null
  progress: number | null
  days_remaining: number
  total_change: number | null
  avg_weekly_change: number | null
}

export interface WeightGoalCreate {
  target_weight_kg: number
  start_weight_kg: number
  target_date: string
  notes?: string | null
}

export interface WeightGoalUpdate {
  target_weight_kg?: number | null
  target_date?: string | null
  notes?: string | null
}

export interface WeightGoalDetailResponse {
  goal: WeightGoalWithProgress
  metrics: BodyMetricOut[]
}
