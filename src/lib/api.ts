const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || 'An error occurred',
        };
      }

      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async register(payload: {
    walletAddress: string;
    username: string;
    email?: string;
    password?: string;
  }) {
    const response = await this.request<{ user: any; token: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    if (response.data?.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async login(payload: {
    walletAddress?: string;
    email?: string;
    password?: string;
  }) {
    const response = await this.request<{ user: any; token: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    if (response.data?.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  // User endpoints
  async getUsers(page = 1, limit = 20, role?: string, search?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    return this.request<{ users: any[]; pagination: any }>(
      `/users?${params.toString()}`
    );
  }

  async getUser(id: string) {
    return this.request<{ user: any }>(`/users/${id}`);
  }

  async updateUser(id: string, payload: {
    username?: string;
    email?: string;
    password?: string;
    walletAddress?: string;
    role?: string;
    isActive?: boolean;
  }) {
    return this.request<{ user: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteUser(id: string) {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getProfile() {
    return this.request<{ user: any }>('/users/profile');
  }

  async getStats() {
    return this.request<{ stats: any }>('/users/stats');
  }

  async getLeaderboard(limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return this.request<{ leaderboard: any[] }>(`/users/leaderboard${params}`);
  }

  async getGameHistory(page = 1, limit = 20) {
    return this.request<{ sessions: any[]; pagination: any }>(
      `/users/game-history?page=${page}&limit=${limit}`
    );
  }

  // Game endpoints
  async createGame(entryFee: number) {
    return this.request<{ gameSession: any }>('/games/create', {
      method: 'POST',
      body: JSON.stringify({ entryFee }),
    });
  }

  async getGame(id: string) {
    return this.request<{ gameSession: any }>(`/games/${id}`);
  }

  async completeGame(
    id: string,
    payload: { position: number; earnings: number; transactionId?: string }
  ) {
    return this.request<{ gameSession: any }>(`/games/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getActiveGames() {
    return this.request<{ games: any[] }>('/games/active');
  }

  // Sui endpoints
  async getBalance() {
    return this.request<{
      walletAddress: string;
      balance: string;
      coinType: string;
    }>('/sui/balance');
  }

  async getTransaction(txHash: string) {
    return this.request<{ transaction: any }>(`/sui/transaction/${txHash}`);
  }

  async verifyTransaction(payload: {
    txHash: string;
    type: string;
    amount: number;
    metadata?: any;
  }) {
    return this.request<{ transaction: any }>('/sui/verify-transaction', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTransactions(page = 1, limit = 20, type?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (type) params.append('type', type);
    return this.request<{ transactions: any[]; pagination: any }>(
      `/sui/transactions?${params.toString()}`
    );
  }

  // Admin endpoints
  async getAdminUsers(page = 1, limit = 20, role?: string, search?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    return this.request<{ users: any[]; pagination: any }>(
      `/admin/users?${params.toString()}`
    );
  }

  async updateUserAdmin(id: string, payload: { role?: string; isActive?: boolean }) {
    return this.request<{ user: any }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteUserAdmin(id: string) {
    return this.request<{ message: string }>(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getPlatformStats() {
    return this.request<{ stats: any }>('/admin/stats');
  }

  async getAllGames(page = 1, limit = 20, status?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    return this.request<{ games: any[]; pagination: any }>(
      `/admin/games?${params.toString()}`
    );
  }

  // Currency endpoints
  async getBlastwheelzBalance() {
    return this.request<{
      balance: string;
      userId: string;
      username: string;
    }>('/currency/balance');
  }

  async getBlastweelTokenBalance() {
    return this.request<{
      walletAddress: string;
      balance: string;
      coinType: string;
      coinObjects: number;
    }>('/currency/token-balance');
  }

  async purchaseBlastwheelz(payload: {
    amount: string;
    suiTxHash: string;
  }) {
    return this.request<{
      message: string;
      balance: string;
      transaction: {
        id: string;
        amount: string;
        type: string;
        status: string;
      };
    }>('/currency/purchase', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getCurrencyHistory(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{
      transactions: any[];
      total: number;
      limit: number;
      offset: number;
    }>(`/currency/history${query}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

