// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Compute possible API bases for different hosting environments
function getApiBases(): string[] {
  const bases: string[] = [];
  const primary = API_BASE_URL;
  bases.push(primary);
  // Netlify functions fallback when primary relative "/api" isn't available
  if (primary === "/api") {
    bases.push("/.netlify/functions/api");
  }
  return bases;
}

// Global offline flag to avoid repeated failing fetch attempts
let API_OFFLINE = false;

// Get auth token from localStorage
export function getAuthToken(): string | null {
  const user = localStorage.getItem("user");
  if (!user) return null;
  try {
    const userData = JSON.parse(user);
    return typeof userData.token === "string" ? userData.token : null;
  } catch {
    return null;
  }
}

// Create headers with auth token
function getAuthHeaders(includeContentType = true): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {};

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

// Internal helper to try multiple API base URLs
async function fetchWithFallback(
  endpoint: string,
  options: RequestInit,
): Promise<Response> {
  if (API_OFFLINE) {
    return new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const bases = getApiBases();

  for (const base of bases) {
    const url = `${base}${endpoint}`;
    try {
      const res = await fetch(url, options);
      // If we reached here, network worked; clear offline flag
      API_OFFLINE = false;
      return res;
    } catch {
      // Try next base on network-level failure only
      continue;
    }
  }
  // No base reachable: set offline and return synthetic error response
  API_OFFLINE = true;
  return new Response(JSON.stringify({ error: "Service unavailable" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

// Generic API request function
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  includeContentType = true,
): Promise<T> {
  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(includeContentType),
      ...options.headers,
    },
  };

  const response = await fetchWithFallback(endpoint, config);

  if (response.status === 401 || response.status === 403) {
    let message = "Unauthorized";
    try {
      const data = await response.json();
      message = (data as any)?.error || message;
    } catch {}

    if (/invalid token|access token required/i.test(message)) {
      logout();
      throw new Error("Session expired. Please login again.");
    }
    throw new Error(message);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Please log in again");
    }
    const errorData = await response
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(
      (errorData as any).error || `HTTP error! status: ${response.status}`,
    );
  }

  return response.json();
}

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    return apiRequest<{
      message: string;
      token: string;
      user: { id: number; username: string };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  register: async (username: string, password: string, email?: string) => {
    return apiRequest<{
      message: string;
      token: string;
      user: { id: number; username: string };
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, email }),
    });
  },

  verifyToken: async () => {
    return apiRequest<{
      message: string;
      user: { id: number; username: string };
    }>("/auth/verify");
  },
};

// Products API
export const productsAPI = {
  getCategories: async () => {
    return apiRequest<{
      categories: Array<{
        id: number;
        name: string;
        description?: string;
      }>;
    }>("/products/categories");
  },

  getProducts: async (categoryId?: number) => {
    const endpoint = categoryId
      ? `/products?categoryId=${categoryId}`
      : "/products";
    return apiRequest<{
      products: Array<{
        id: number;
        name: string;
        category_id: number;
        description?: string;
      }>;
    }>(endpoint);
  },

  getProductsByCategories: async (categoryIds: number[]) => {
    if (categoryIds.length === 0) {
      return { products: [] };
    }

    const params = categoryIds.map((id) => `categoryIds=${id}`).join("&");
    return apiRequest<{
      products: Array<{
        id: number;
        name: string;
        category_id: number;
        description?: string;
        category_name?: string;
      }>;
    }>(`/products/by-categories?${params}`);
  },

  getExistingProducts: async () => {
    return apiRequest<{
      existingProducts: Array<{
        id: number;
        name: string;
        category_id: number;
        category_name?: string;
        registration_count?: number;
      }>;
    }>("/products/existing");
  },

  getStatistics: async () => {
    return apiRequest<{
      totalCategories: number;
      totalProducts: number;
      productsByCategory: Array<{
        category_name: string;
        product_count: number;
      }>;
    }>("/products/statistics");
  },
};

// Production detail interface
interface ProductionDetail {
  productId: number;
  productName: string;
  annualProduction: string;
  unit: string;
  areaOfProduction: string;
  yearsOfProduction: string;
  additionalNotes?: string;
}

// Registrations API
export const registrationsAPI = {
  create: async (
    registrationData: {
      name: string;
      address: string;
      age: number;
      gender: "male" | "female";
      phone: string;
      email?: string;
      aadharNumber: string;
      panNumber?: string;
      productCategoryIds: number[];
      existingProducts?: number[];
      selectedProducts?: number[];
      areaOfProduction?: string;
      annualProduction?: string;
      annualTurnover?: number;
      yearsOfProduction?: string;
      productionDetails?: ProductionDetail[];
    },
    documents?: {
      aadharCard?: File;
      panCard?: File;
      proofOfProduction?: File;
      signature?: File;
      photo?: File;
    },
  ) => {
    const formData = new FormData();

    // Add form fields
    Object.entries(registrationData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Send arrays as JSON strings (e.g., "[8,7]")
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    // Add file fields under documents key
    if (documents) {
      Object.entries(documents).forEach(([key, file]) => {
        if (file) {
          // Send files directly with their original names
          formData.append(key, file, file.name);
        }
      });
    }

    // Make request with proper auth headers for FormData
    const token = getAuthToken();
    if (!token) {
      throw new Error("Please log in again");
    }

    const postOnce = async () => {
      const res = await fetchWithFallback(`/registrations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.status === 401 || res.status === 403) {
        let msg = "Unauthorized";
        try {
          const data = await res.json();
          msg = (data as any)?.error || msg;
        } catch {}
        if (/invalid token|access token required/i.test(msg)) {
          logout();
          throw new Error("Session expired. Please login again.");
        }
        throw new Error(msg);
      }

      if (!res.ok) {
        let msg = "Network error";
        try {
          const data = await res.json();
          msg = (data as any)?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      return (await res.json()) as {
        message: string;
        registrationId: number;
        documentPaths?: { [key: string]: string };
      };
    };

    try {
      return await postOnce();
    } catch (err: any) {
      const msg = (err && err.message) || "";
      if (/Failed to fetch|NetworkError/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 1200));
        return await postOnce();
      }
      throw err;
    }
  },

  getUserRegistrations: async () => {
    return apiRequest<
      | {
          registrations?: Array<{
            id: number;
            name: string;
            created_at: string;
            category_name: string;
            existing_products?: string;
            selected_products?: string;
            aadhar_card_path?: string;
            pan_card_path?: string;
            proof_of_production_path?: string;
            signature_path?: string;
            photo_path?: string;
          }>;
        }
      | Array<{
          id: number;
          name: string;
          created_at: string;
          category_name: string;
          existing_products?: string;
          selected_products?: string;
          aadhar_card_path?: string;
          pan_card_path?: string;
          proof_of_production_path?: string;
          signature_path?: string;
          photo_path?: string;
        }>
    >("/registrations/user");
  },

  getAllRegistrations: async (page = 1, limit = 10) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiRequest<{
      registrations: Array<any>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/registrations/all?${params.toString()}`);
  },

  getById: async (id: number) => {
    return apiRequest<any>(`/registrations/${id}`);
  },

  generateReport: async (filters: {
    type?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    return apiRequest<{
      summary: {
        total_registrations: number;
      };
      data: Array<any>;
      generatedAt: string;
      filters: any;
    }>(`/registrations/report?${params.toString()}`);
  },

  verify: async (data: { aadharNumber?: string; voterId?: string }) => {
    return apiRequest<{
      isRegistered: boolean;
      registrationId?: number;
      name?: string;
      registrationDate?: string;
      userData?: {
        name: string;
        address: string;
        age: number;
        gender: "male" | "female";
        phone: string;
        email?: string;
        aadharNumber?: string;
        voterId?: string;
        panNumber?: string;
        documentPaths?: {
          aadharCard?: string;
          panCard?: string;
          proofOfProduction?: string;
          signature?: string;
          photo?: string;
        };
      };
      existingRegistrations?: Array<{
        id: number;
        categoryIds: number[];
        categoryNames: string[];
        selectedProductIds: number[];
        existingProductIds: number[];
        registrationDate: string;
      }>;
      availableCategories?: Array<{
        id: number;
        name: string;
        description?: string;
        created_at: string;
      }>;
      availableProducts?: Array<{
        id: number;
        name: string;
        category_id: number;
        description?: string;
        created_at: string;
      }>;
    }>("/registrations/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  createAdditional: async (data: {
    baseRegistrationId: number;
    productCategoryIds: number[];
    existingProducts: number[];
    selectedProducts: number[];
    areaOfProduction?: string;
    annualProduction?: string;
    annualTurnover?: string;
    turnoverUnit?: string;
    yearsOfProduction?: string;
    productionDetails?: Array<{
      productId: number;
      productName: string;
      annualProduction: string;
      unit: string;
      areaOfProduction: string;
      yearsOfProduction: string;
      annualTurnover?: string;
      turnoverUnit?: string;
      additionalNotes?: string;
    }>;
    additionalInfo?: string;
  }) => {
    return apiRequest<{
      message: string;
      registrationId: number;
      reusedFiles: boolean;
      baseRegistrationId: number;
    }>("/registrations/additional", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// Users API
export const usersAPI = {
  deleteUser: async (userId: number) => {
    return apiRequest<{ message: string }>(`/users/${userId}`, {
      method: "DELETE",
    });
  },
};

// Dashboard API
export const dashboardAPI = {
  getStatistics: async () => {
    try {
      const stats = await apiRequest<{
        totalRegistrations: number;
        totalUsers: number;
        totalProducts: number;
        totalCategories: number;
        totalApplications?: number;
      }>("/dashboard/statistics");

      return stats;
    } catch (_error) {
      return {
        totalRegistrations: 0,
        totalUsers: 0,
        totalProducts: 0,
        totalCategories: 0,
        totalApplications: 0,
      };
    }
  },

  getRecentActivity: async () => {
    try {
      const activity = await apiRequest<
        Array<{
          id: number;
          type: string;
          message: string;
          timestamp: string;
        }>
      >("/dashboard/activity");

      return activity;
    } catch (_error) {
      return [];
    }
  },
};

// Helper function to handle API errors
export function handleAPIError(error: any): string {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (/Failed to fetch/i.test(msg)) {
    return "Network error. Please check your internet connection and try again.";
  }
  if (
    /Invalid token|Access token required|Unauthorized|Forbidden|Session expired/i.test(
      msg,
    )
  ) {
    return "Session expired. Please login again.";
  }
  return msg || "An unexpected error occurred";
}

// Helper function to check if user is authenticated
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

// Helper function to logout
export function logout(): void {
  localStorage.removeItem("user");
  window.location.href = "/";
}
