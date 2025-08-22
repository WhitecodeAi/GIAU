export interface DemoResponse {
  message: string;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email?: string;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface VerificationRequest {
  aadharNumber?: string;
  voterId?: string;
}

export interface AdditionalRegistrationRequest {
  baseRegistrationId: number;
  productCategoryIds: number[];
  existingProducts: number[];
  selectedProducts: number[];
  areaOfProduction?: string;
  annualProduction?: string;
  annualTurnover?: string;
  turnoverUnit?: string;
  yearsOfProduction?: string;
  productionDetails?: ProductionDetail[];
  additionalInfo?: string;
}

export interface VerificationResponse {
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
  // Additional registration support
  existingRegistrations?: Array<{
    id: number;
    categoryIds: number[];
    categoryNames: string[];
    selectedProductIds: number[];
    existingProductIds: number[];
    registrationDate: string;
  }>;
  availableCategories?: ProductCategory[];
  availableProducts?: Product[];
}

export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  category_id: number;
  description?: string;
  created_at: string;
}

export interface ProductionDetail {
  productId: number;
  productName: string;
  annualProduction: string;
  unit: string;
  areaOfProduction: string;
  yearsOfProduction: string;
  annualTurnover?: string;
  turnoverUnit?: string;
  additionalNotes?: string;
}

export interface UserRegistration {
  id: number;
  user_id: number;
  name: string;
  address: string;
  age: number;
  gender: "male" | "female";
  phone: string;
  email?: string;

  aadhar_number?: string;

  voter_id?: string;
  pan_number?: string;
  product_category_id: number; // Primary category for backward compatibility
  product_category_ids?: number[]; // Multiple categories
  categories?: ProductCategory[]; // Full category objects
  category_names?: string; // Comma-separated category names
  area_of_production?: string;
  annual_production?: string;
  annual_turnover?: string;
  years_of_production?: string;
  production_details?: ProductionDetail[];
  production_summary?: string;
  existing_products?: string;
  selected_products?: string;
  documentUrls?: { [key: string]: string };
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalRegistrations: number;
  totalUsers: number;
  totalProducts: number;
  totalCategories: number;
}
