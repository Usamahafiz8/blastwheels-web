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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          // If JSON parsing fails, return error with response text
          const text = await response.text();
          return {
            error: text || 'Invalid JSON response',
          };
        }
      } else {
        // Non-JSON response (e.g., plain text error)
        const text = await response.text();
        return {
          error: text || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      if (!response.ok) {
        return {
          error: data.error || data.message || 'An error occurred',
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

  async updateProfile(payload: {
    username?: string;
    email?: string;
    walletAddress?: string;
  }) {
    return this.request<{ user: any }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
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

  async getNativeSuiBalance(walletAddress?: string) {
    const params = walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}` : '';
    return this.request<{
      walletAddress: string;
      balance: string;
      balanceSui: string;
      coinType: string;
    }>(`/sui/native-balance${params}`);
  }

  async getWheelsBalance(walletAddress?: string) {
    const params = walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}` : '';
    return this.request<{
      walletAddress: string;
      balance: string;
      balanceFormatted: string;
      coinType: string;
      coinObjects: number;
    }>(`/sui/wheels-balance${params}`);
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

  async getBlastweelTokenBalance(walletAddress?: string) {
    const params = walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}` : '';
    return this.request<{
      walletAddress: string;
      balance: string;
      coinType: string;
      coinObjects: number;
    }>(`/currency/token-balance${params}`);
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

  async purchaseBlastwheelzAuto(payload: {
    amount: string;
    walletAddress: string;
    txHash?: string;
  }) {
    return this.request<{
      message: string;
      balance?: string;
      transaction?: {
        id: string;
        amount: string;
        type: string;
        status: string;
      };
      treasuryAddress?: string;
      amountInSmallestUnit?: string;
      coinType?: string;
      instructions?: string;
    }>('/currency/purchase-auto', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async withdrawBlastwheelz(payload: {
    amount: string;
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
    }>('/currency/withdraw', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getCurrencyHistory(limit?: number, offset?: number, type?: 'purchase' | 'withdrawal') {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (type) params.append('type', type);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{
      transactions: any[];
      total: number;
      limit: number;
      offset: number;
    }>(`/currency/history${query}`);
  }

  // Car/NFT endpoints
  async getCars(params?: {
    ownerAddress?: string;
    collectionId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.ownerAddress) queryParams.append('ownerAddress', params.ownerAddress);
    if (params?.collectionId) queryParams.append('collectionId', params.collectionId);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<{ cars: any[]; pagination: any }>(`/cars${query}`);
  }

  async getCar(id: string) {
    return this.request<{ car: any }>(`/cars/${id}`);
  }

  async createCar(payload: {
    tokenId: string;
    suiObjectId: string;
    ownerAddress?: string;
    collectionId?: string;
    name: string;
    description?: string;
    imageUrl?: string;
    projectUrl?: string;
    mintNumber?: number;
    alloyRim?: string;
    frontBonnet?: string;
    backBonnet?: string;
    creator?: string;
    metadata?: Record<string, any>;
  }) {
    return this.request<{ message: string; car: any }>('/cars', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async registerMintedCar(payload: {
    tokenId: string;
    suiObjectId: string;
    ownerAddress: string;
    name: string;
    description?: string;
    imageUrl: string;
    projectUrl: string;
    mintNumber: number;
    alloyRim: string;
    frontBonnet: string;
    backBonnet: string;
    creator: string;
    collectionId?: string;
    metadata?: Record<string, any>;
  }) {
    return this.createCar(payload);
  }

  async purchaseCar(id: string, payload: { suiTxHash: string }) {
    return this.request<{
      message: string;
      car: any;
      transaction: {
        id: string;
        suiTxHash: string;
        type: string;
        status: string;
      };
    }>(`/cars/${id}/purchase`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async registerMintedCar(payload: {
    tokenId: string;
    suiObjectId: string;
    ownerAddress: string;
    name: string;
    description?: string;
    imageUrl: string;
    projectUrl: string;
    mintNumber: number;
    alloyRim: string;
    frontBonnet: string;
    backBonnet: string;
    creator: string;
    collectionId?: string;
    metadata?: Record<string, any>;
  }) {
    return this.request<{ message: string; car: any }>('/cars', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Marketplace endpoints (public)
  async getMarketplaceItems(params?: {
    status?: 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT';
    type?: string;
    category?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<{
      items: Array<{
        id: string;
        name: string;
        description: string | null;
        imageUrl: string | null;
        price: string;
        status: string;
        type: string;
        stock: number | null;
        category: string | null;
        soldCount: number;
        createdAt: string;
      }>;
    }>(`/marketplace/items${query}`);
  }

  async getMarketplaceItem(id: string) {
    return this.request<{
      item: {
        id: string;
        name: string;
        description: string | null;
        imageUrl: string | null;
        price: string;
        status: string;
        type: string;
        stock: number | null;
        category: string | null;
        soldCount: number;
        createdAt: string;
      };
    }>(`/marketplace/items/${id}`);
  }

  async purchaseMarketplaceItem(id: string, payload: { quantity?: number }) {
    return this.request<{
      message: string;
      purchase: {
        id: string;
        itemName: string;
        quantity: number;
        totalPrice: number;
        remainingBalance: string;
      };
    }>(`/marketplace/items/${id}/purchase`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Admin marketplace endpoints
  async getAdminMarketplaceItems(params?: {
    status?: 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT';
    type?: string;
    category?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.category) queryParams.append('category', params.category);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<{
      items: Array<{
        id: string;
        name: string;
        description: string | null;
        imageUrl: string | null;
        price: string;
        status: string;
        type: string;
        stock: number | null;
        category: string | null;
        soldCount: number;
        createdBy: string;
        createdAt: string;
        _count: { purchases: number };
      }>;
    }>(`/admin/marketplace-items${query}`);
  }

  async createMarketplaceItem(payload: {
    name: string;
    description?: string;
    imageUrl?: string;
    price: number;
    status?: 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT';
    type?: 'NFT' | 'ITEM' | 'UPGRADE' | 'CURRENCY' | 'OTHER';
    stock?: number;
    category?: string;
    metadata?: Record<string, any>;
  }) {
    return this.request<{
      message: string;
      item: any;
    }>('/admin/marketplace-items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateMarketplaceItem(
    id: string,
    payload: {
      name?: string;
      description?: string;
      imageUrl?: string;
      price?: number;
      status?: 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT';
      type?: 'NFT' | 'ITEM' | 'UPGRADE' | 'CURRENCY' | 'OTHER';
      stock?: number;
      category?: string;
      metadata?: Record<string, any>;
    }
  ) {
    return this.request<{
      message: string;
      item: any;
    }>(`/admin/marketplace-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteMarketplaceItem(id: string) {
    return this.request<{ message: string }>(`/admin/marketplace-items/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

