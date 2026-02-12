export interface ServiceTemplate {
  id: number;
  name: string;
  defaultAmount: number;
  isTaxable: boolean;
  billingMethod: 'included_in_rental' | 'charged_separately';
  description?: string;
  category?: string;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  accountId?: number | null;
  account?: {
    id: number;
    accountCode: string;
    accountName: string;
    accountType: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceTemplateFormData {
  name: string;
  defaultAmount: string | number;
  isTaxable: boolean;
  billingMethod: 'included_in_rental' | 'charged_separately';
  description?: string;
  category?: string;
  sortOrder?: number;
  accountId?: number | null;
}

export interface ServiceTemplatesResponse {
  success: boolean;
  data: {
    templates: ServiceTemplate[];
    count: number;
  };
  message?: string;
}

export interface ServiceTemplateResponse {
  success: boolean;
  data: {
    template: ServiceTemplate;
  };
  message?: string;
}

export interface CategoriesResponse {
  success: boolean;
  data: {
    categories: string[];
    count: number;
  };
}
