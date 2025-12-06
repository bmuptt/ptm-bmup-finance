export interface ExternalUserPayload {
  email: string;
  name: string;
  gender: string;
  birthdate: string;
  role_id: number;
}

export interface ExternalUserDetails {
  id: number;
  email: string | null;
  name: string;
  username: string;
  role: { id: number; name: string };
  active: string;
  registered_at: string;
  contact: unknown | null;
  [key: string]: unknown;
}

