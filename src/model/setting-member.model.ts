export interface SettingMember {
  id: number;
  user_id: number | null;
  name: string;
  username: string;
  gender: string;
  birthdate: string;
  address: string | null;
  phone: string | null;
  photo: string | null;
  active: boolean;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  email: string | null;
}

export interface SettingMembersResponse {
  success: boolean;
  data: SettingMember[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  message?: string;
}

export interface LoadMoreMembersResponse {
  success: boolean;
  data: SettingMember[];
  meta: {
    nextCursor: number | null;
    hasMore: boolean;
    limit: number;
  };
  message: string;
}