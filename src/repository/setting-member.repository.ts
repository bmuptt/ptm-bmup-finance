import { AxiosInstance } from 'axios';
import { createHttpClient } from '../config/axios';
import { config } from '../config/environment';
import { SettingMember, SettingMembersResponse, LoadMoreMembersResponse } from '../model';

class SettingMemberRepository {
  private client: AxiosInstance;

  constructor() {
    this.client = createHttpClient(config.API_URL_SETTING);
  }

  async getMembersList(params: {
    search?: string;
    order_field?: string;
    order_dir?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
    token?: string;
  }): Promise<{ data: SettingMember[]; pagination?: SettingMembersResponse['pagination'] }> {
    const { search = '', order_field = 'name', order_dir = 'asc', page = 1, per_page = 10, token } = params;

    const headers: Record<string, string> = {};
    if (token && token.trim()) {
      headers['Cookie'] = `token=${token}`;
    }

    try {
      // Allow response to be either the standard response or a direct array
      const response = await this.client.get<SettingMembersResponse | SettingMember[]>('/setting/members', {
        params: {
          search,
          order_field,
          order_dir,
          page,
          per_page,
          active: 'active',
        },
        headers,
      });

      const body = response.data;
      
      // Case 1: Standard response with data property
      if ('data' in body && Array.isArray(body.data)) {
        return {
          data: body.data,
          pagination: body.pagination
        };
      }
      
      // Case 2: Direct array response
      if (Array.isArray(body)) {
        return { data: body };
      }
      
      return { data: [] };
    } catch (error) {
      return { data: [] };
    }
  }

  async getMembersLoadMore(params: {
    search?: string;
    limit?: number;
    cursor?: number;
    token?: string;
  }): Promise<LoadMoreMembersResponse> {
    const { search, limit = 10, cursor, token } = params;

    const headers: Record<string, string> = {};
    if (token && token.trim()) {
      headers['Cookie'] = `token=${token}`;
    }

    try {
      const response = await this.client.get<LoadMoreMembersResponse>('/setting/members/load-more', {
        params: {
          search,
          limit,
          cursor,
        },
        headers,
      });
      return response.data;
    } catch (error) {
      // Return empty structure in case of error
      return {
        success: false,
        data: [],
        meta: {
          nextCursor: null,
          hasMore: false,
          limit
        },
        message: 'Failed to fetch members'
      };
    }
  }

  async getActiveMembers(params: {
    search?: string;
    order_field?: string;
    order_dir?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
    token?: string;
  }): Promise<SettingMember[]> {
    const result = await this.getMembersList(params);
    return result.data;
  }

  async getMembersByIdsDirect(ids: number[], params?: { order_field?: string; order_dir?: 'asc' | 'desc'; token?: string }): Promise<SettingMember[]> {
    if (!ids.length) return [];
    const headers: Record<string, string> = {};
    if (params?.token && params.token.trim()) {
      headers['Cookie'] = `token=${params.token}`;
      headers['Authorization'] = `Bearer ${params.token}`;
    }
    const query = {
      ids: ids.join(','),
      order_field: params?.order_field ?? 'id',
      order_dir: params?.order_dir ?? 'desc',
    };
    try {
      const response = await this.client.get<{ success?: boolean; data?: SettingMember[] } | SettingMember[]>('/setting/members/by-ids', {
        params: query,
        headers,
      });
      const body = response.data;
      const data: SettingMember[] =
        Array.isArray(body) ? body :
        (body && Array.isArray(body.data) ? body.data : []);
      return data;
    } catch {
      return [];
    }
  }

  async getMembersByIds(ids: number[], token?: string): Promise<SettingMember[]> {
    if (!ids.length) return [];
    
    const direct = await this.getMembersByIdsDirect(ids, token ? { token } : undefined);
    if (direct.length) {
      return direct;
    }
    const allMembers = await this.getActiveMembers({
      page: 1,
      per_page: 10000,
      ...(token ? { token } : {}),
    });

    const idSet = new Set(ids);
    return allMembers.filter(member => idSet.has(member.id));
  }

  async getMemberById(id: number, token?: string): Promise<SettingMember | null> {
    const headers: Record<string, string> = {};
    if (token && token.trim()) {
      headers['Cookie'] = `token=${token}`;
    }

    try {
      const response = await this.client.get<unknown>(`/setting/members/${id}`, {
        headers,
      });

      const body = (response as { data?: unknown }).data;

      // Common shapes:
      // 1) { success: true, data: { ...member } }
      // 2) direct member object
      // 3) { data: { data: { ...member } } }

      if (body && typeof body === 'object') {
        const bodyObj = body as Record<string, unknown>;

        if ('data' in bodyObj && typeof bodyObj['data'] === 'object' && !Array.isArray(bodyObj['data'])) {
          const dataObj = bodyObj['data'] as Record<string, unknown>;
          if ('data' in dataObj && typeof dataObj['data'] === 'object' && !Array.isArray(dataObj['data'])) {
            return dataObj['data'] as SettingMember;
          }
          return dataObj as unknown as SettingMember;
        }

        if ('success' in bodyObj && bodyObj['success'] === true && 'data' in bodyObj && typeof bodyObj['data'] === 'object') {
          return bodyObj['data'] as SettingMember;
        }

        // Fallback to assume body is the member object
        return body as SettingMember;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

export default new SettingMemberRepository();



