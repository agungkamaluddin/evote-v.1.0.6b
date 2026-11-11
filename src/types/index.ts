export type OrgType = 'OSIS' | 'OSIM';

export type VotingSessionStatus = 'OPEN' | 'PAUSED' | 'CLOSED';

export interface ElectionPeriod {
  id: string;
  year_label: string; // e.g. "2026/2027"
  is_active: boolean;
  organization_type: OrgType;
  school_name: string;
  voting_session_status: VotingSessionStatus;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Candidate {
  id: string;
  period_id: string;
  candidate_number: number;
  leader_name: string;
  vice_leader_name?: string;
  photo_url: string;
  vision: string;
  mission: string[];
  work_programs?: string[];
  motto?: string;
  created_at: string;
}

export type VoterCategory = 'SISWA' | 'GURU' | 'TATA_USAHA';

export interface Student {
  id: string;
  period_id: string;
  nisn: string; // NISN untuk Siswa, atau NIP / NUPTK / ID Pegawai untuk Guru & Staf TU
  pin: string;
  name: string;
  class_name: string; // Kelas untuk Siswa, Mapel / Jabatan untuk Guru, Bagian / Unit untuk Staf TU
  voter_type?: VoterCategory; // 'SISWA' | 'GURU' | 'TATA_USAHA'
  has_voted: boolean;
  voted_at: string | null;
  created_at: string;
}

export interface VoterCategoryStats {
  category: VoterCategory;
  label: string;
  total: number;
  voted: number;
  remaining: number;
  turnout: number;
}

export interface Vote {
  id: string;
  period_id: string;
  candidate_id: string;
  created_at: string;
  // NOTE: student_id is intentionally omitted to guarantee ballot secrecy (Asas LUBER JURDIL)
}

export interface Committee {
  id: string;
  period_id: string;
  name: string;
  sk_number: string;
  role: 'Ketua Panitia' | 'Sekretaris' | 'Bendahara' | 'Seksi Teknis / IT' | 'Pengawas TPS';
  user_id?: string;
  email: string;
  created_at: string;
}

export interface SchoolConfig {
  school_name: string;
  organization_type: OrgType;
  logo_url: string;
  school_address: string;
  principal_name: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  actor: string;
}

export type StaffRole = 'admin' | 'panitia';

export interface AuthStaffUser {
  id: string;
  username: string;
  role: StaffRole;
  name: string;
  sk_number?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: StaffRole;
  sk_number?: string;
  created_at: string;
  is_active: boolean;
}

