export interface MembershipDuesItem {
  id: number;
  member_id: number;
  period_year: number;
  period_month: number;
  amount: number;
  paid_at: string;
  proof_file_path: string | null;
  note: string | null;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string;
}

export interface PayDuesRequest {
  member_id: number;
  period_year: number;
  period_month: number;
  status: 'paid' | 'unpaid';
}

export interface UploadDuesRequest {
  member_id: number;
  period_year: number;
  period_month: number;
  file_path: string;
}