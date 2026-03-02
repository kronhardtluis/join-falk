export interface ContactData {
  id: number;
  name: string;
  email: string;
  phone: string;
  color: string;
}

export interface ContactFormData {
  id?: number;
  name: string;
  email: string;
  phone: string;
  color?: string;
}

export interface Contact {
  id?: number;
  created_at?: string;
  name: string;
  email: string;
  phone: string;
  color: string;
}
