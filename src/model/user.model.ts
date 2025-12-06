// User Profile Interface
export interface UserProfile {
  id: number;
  name: string;
  email: string;
  gender: string;
  birthdate: string;
  photo: string | null;
  active: string;
  role_id: number;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string;
  role: {
    id: number;
    name: string;
    created_by: number;
    created_at: string;
    updated_by: number | null;
    updated_at: string;
  };
  iat: number;
  exp: number;
}

// Menu Interface
export interface Menu {
  id: number;
  key_menu: string;
  name: string;
  order_number: number;
  url: string | null;
  menu_id: number | null;
  active: string;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string;
  children: Menu[];
}

// Auth Response Interface
export interface AuthResponse {
  message: string;
  profile: UserProfile;
  menu: Menu[];
}