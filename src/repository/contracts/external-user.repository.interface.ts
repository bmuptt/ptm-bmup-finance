import { ExternalUserPayload, ExternalUserDetails } from '../../model';

export interface ExternalUserRepositoryInterface {
  createUser(payload: ExternalUserPayload, token?: string): Promise<unknown>;
  getUsersByIds(userIds: number[], token?: string): Promise<ExternalUserDetails[]>;
}

