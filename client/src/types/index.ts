export interface Admin {
  id: number;
  orgName: string;
  email: string;
  status: string;
  createdAt: Date | string;
}

export interface SuperAdmin {
  id: number;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateAdminForm {
  orgName: string;
  email: string;
  password: string;
}

export interface NotificationProps {
  type: 'success' | 'error';
  title: string;
  message: string;
}
