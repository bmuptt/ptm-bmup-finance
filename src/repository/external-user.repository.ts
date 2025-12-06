import httpClient from '../config/axios';
import { ExternalUserPayload, ExternalUserDetails } from '../model';
import { ExternalUserRepositoryInterface } from './contracts/external-user.repository.interface';
import apmAgent from '../config/apm';

class ExternalUserRepository implements ExternalUserRepositoryInterface {
  async createUser(payload: ExternalUserPayload, token?: string): Promise<unknown> {
    // Include token in Cookie header if provided
    // Format: Cookie: token=<value> (for httpOnly and secure cookies)
    const headers: Record<string, string> = {};
    if (token && typeof token === 'string' && token.trim()) {
      headers['Cookie'] = `token=${token}`;
      
      // Token is being forwarded to external service (APM will track this)
    } else {
      // No token provided (APM will capture if this causes errors)
    }

    const response = await httpClient.post('/app-management/user', payload, {
      headers,
    });
    return response?.data ?? response;
  }

  async getUsersByIds(userIds: number[], token?: string): Promise<ExternalUserDetails[]> {
    // Include token in Cookie header if provided
    // Format: Cookie: token=<value> (for httpOnly and secure cookies)
    const headers: Record<string, string> = {};
    if (token && typeof token === 'string' && token.trim()) {
      headers['Cookie'] = `token=${token}`;
      
      // Token is being forwarded to external service (APM will track this)
    } else {
      // No token provided (APM will capture if this causes errors)
    }

    // Deduplicate and sanitize IDs
    const uniqueIds = Array.from(new Set(userIds.filter((id) => typeof id === 'number')));

    const span = apmAgent?.startSpan('external-user.get-details', 'external', 'http', 'GET') ?? null;
    if (span) {
      span.setLabel('ids', uniqueIds.join(','));
      span.setLabel('ids_count', String(uniqueIds.length));
    }

    const response = await httpClient.get('/app-management/user/get-details', {
      params: {
        ids: uniqueIds.join(','),
      },
      headers,
    });

    const users = this.extractUsers(response);

    if (span) {
      span.setLabel('result_count', String(users.length));
      if (users.length > 0) {
        const u = users[0];
        span.setLabel('sample_user_id', String(u?.id ?? 'null'));
        span.setLabel('sample_user_email', String(u?.email ?? 'null'));
      }
      span.end();
    }

    return users;
  }

  private extractUsers(response: unknown): ExternalUserDetails[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return (response as ExternalUserDetails[]).filter((u) => typeof (u as any)?.id === 'number');
    }

    const data = (response as { data?: unknown }).data;

    if (Array.isArray(data)) {
      return (data as ExternalUserDetails[]).filter((u) => typeof (u as any)?.id === 'number');
    }

    // Handle common shape: { success: true, data: [...] }
    const nestedData = (data as { data?: unknown })?.data;
    if (Array.isArray(nestedData)) {
      return (nestedData as ExternalUserDetails[]).filter((u) => typeof (u as any)?.id === 'number');
    }

    const nestedUsers = (data as { users?: unknown })?.users;
    if (Array.isArray(nestedUsers)) {
      return (nestedUsers as ExternalUserDetails[]).filter((u) => typeof (u as any)?.id === 'number');
    }

    const directUsers = (response as { users?: unknown }).users;
    if (Array.isArray(directUsers)) {
      return (directUsers as ExternalUserDetails[]).filter((u) => typeof (u as any)?.id === 'number');
    }

    const resultArray = (data as { result?: unknown })?.result;
    if (Array.isArray(resultArray)) {
      return (resultArray as ExternalUserDetails[]).filter((u) => typeof (u as any)?.id === 'number');
    }

    return [];
  }
}

export default new ExternalUserRepository();
