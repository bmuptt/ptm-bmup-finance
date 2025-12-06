import { UserProfile, Menu } from '../model';

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
      menu?: Menu[];
    }
  }
}

export {};
