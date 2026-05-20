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

export interface RoleOut {
  id: number
  name: string
  description: string | null
  permissions: PermissionOut[]
  created_at: string
  updated_at: string
}

export interface PermissionOut {
  id: number
  code: string
  description: string | null
  module: string | null
  created_at: string
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

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface ForceChangePasswordRequest {
  new_password: string
  confirm_password: string
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

// ── Medical History ──────────────────────────────────────────────────────────

export interface PatientProfileOut {
  id: number
  user_id: number
  date_of_birth: string | null
  allergies: string | null
  chronic_conditions: string | null
  blood_type: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  created_at: string
  updated_at: string
}

export interface PatientProfileUpdate {
  date_of_birth?: string | null
  allergies?: string | null
  chronic_conditions?: string | null
  blood_type?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
}

export interface SpecialtyOut {
  id: number
  user_id: number
  name: string
  created_at: string
}

export interface SpecialtyCreate {
  name: string
}

export interface SpecialtyUpdate {
  name?: string
}

export interface DoctorOut {
  id: number
  user_id: number
  name: string
  specialty_id: number | null
  license_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DoctorCreate {
  name: string
  specialty_id?: number | null
  license_number?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export interface DoctorUpdate {
  name?: string
  specialty_id?: number | null
  license_number?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export interface AppointmentOut {
  id: number
  user_id: number
  doctor_id: number
  date_time: string
  reason: string | null
  location: string | null
  status: string
  post_notes: string | null
  requires_followup: boolean
  followup_date: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentCreate {
  doctor_id: number
  date_time: string
  reason?: string | null
  location?: string | null
}

export interface AppointmentUpdate {
  doctor_id?: number
  date_time?: string
  reason?: string | null
  location?: string | null
  status?: string
  post_notes?: string | null
  requires_followup?: boolean
  followup_date?: string | null
}

export interface MedicationOut {
  id: number
  user_id: number
  generic_name: string
  brand_name: string | null
  presentation: string | null
  concentration: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MedicationCreate {
  generic_name: string
  brand_name?: string | null
  presentation?: string | null
  concentration?: string | null
  notes?: string | null
}

export interface MedicationUpdate {
  generic_name?: string
  brand_name?: string | null
  presentation?: string | null
  concentration?: string | null
  notes?: string | null
}

export interface PrescriptionDetailOut {
  id: number
  prescription_id: number
  medication_id: number | null
  medication_name: string
  dosage: string | null
  frequency: string | null
  duration_days: number | null
  start_date: string | null
  end_date: string | null
  instructions: string | null
  status: string
  scheduled_times: string[] | null
  created_at: string
}

export interface PrescriptionDetailCreate {
  medication_id?: number | null
  medication_name: string
  dosage?: string | null
  frequency?: string | null
  duration_days?: number | null
  start_date?: string | null
  end_date?: string | null
  instructions?: string | null
  scheduled_times?: string[] | null
}

export interface PrescriptionDetailUpdate {
  dosage?: string | null
  frequency?: string | null
  duration_days?: number | null
  start_date?: string | null
  end_date?: string | null
  instructions?: string | null
  status?: string
  scheduled_times?: string[] | null
}

export interface PrescriptionOut {
  id: number
  user_id: number
  appointment_id: number | null
  doctor_id: number
  diagnosis: string | null
  issue_date: string
  valid_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
  details: PrescriptionDetailOut[]
  documents: MedicalDocumentOut[]
}

export interface PrescriptionCreate {
  appointment_id?: number | null
  doctor_id: number
  diagnosis?: string | null
  valid_until?: string | null
  notes?: string | null
  details?: PrescriptionDetailCreate[]
}

export interface PrescriptionUpdate {
  diagnosis?: string | null
  valid_until?: string | null
  notes?: string | null
}

export interface MedicalDocumentOut {
  id: number
  user_id: number
  prescription_id: number | null
  appointment_id: number | null
  filename: string
  doc_type: string
  mime_type: string | null
  file_size: number | null
  created_at: string
}

export interface AdherenceRecordOut {
  id: number
  prescription_detail_id: number | null
  scheduled_time: string
  taken_at: string | null
  status: string
  notes: string | null
  created_at: string
  medication_name: string | null
}

export interface AdherenceRecordCreate {
  prescription_detail_id?: number | null
  medication_name?: string | null
  scheduled_time: string
  notes?: string | null
}

export interface AdherenceRecordUpdate {
  status?: string
  notes?: string | null
  scheduled_time?: string
}

export interface DashboardAlert {
  type: string
  title: string
  message: string
}

export interface AdminStats {
  total_users: number
  active_users: number
  total_appointments: number
  total_prescriptions: number
  total_body_metrics: number
  total_documents: number
}

export interface DashboardSummary {
  latest_metric: BodyMetricOut | null
  active_goal: WeightGoalWithProgress | null
  upcoming_appointments: AppointmentOut[]
  today_adherence: AdherenceRecordOut[]
  today_adherence_rate: number | null
  adherence_rate_7d: number | null
  active_medications_count: number
  pending_doses_today: number
  recent_metrics: BodyMetricOut[]
  alerts: DashboardAlert[]
  admin_stats: AdminStats | null
  latest_bp: BloodPressureOut | null
}

// ── Blood Pressure ──────────────────────────────────────────────────────────

export interface BloodPressureOut {
  id: number
  user_id: number
  systolic: number
  diastolic: number
  heart_rate: number | null
  notes: string | null
  classification: string
  recorded_at: string
  created_at: string
}

export interface BloodPressureCreate {
  systolic: number
  diastolic: number
  heart_rate?: number | null
  notes?: string | null
  recorded_at?: string | null
}

export interface BloodPressureUpdate {
  systolic?: number
  diastolic?: number
  heart_rate?: number | null
  notes?: string | null
  recorded_at?: string | null
}

export interface BloodPressureStatsAvg {
  systolic: number
  diastolic: number
  heart_rate: number | null
}

export interface BloodPressureStats {
  total: number
  avg_7d: BloodPressureStatsAvg | null
  avg_30d: BloodPressureStatsAvg | null
  distribution: Record<string, number>
}

export interface BloodPressureListResponse {
  items: BloodPressureOut[]
  total: number
}
