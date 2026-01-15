export interface Service {
  id?: number;
  name: string;
  amount: number;
  isTaxable: boolean;
  taxAmount?: number; // Calculated on frontend
  totalAmount?: number; // amount + taxAmount (calculated on frontend)
  billingMethod: 'included_in_rental' | 'charged_separately';
  includeInPDC?: boolean; // Frontend only, for PDC generation
  description?: string;
  entityType: 'unit' | 'lease';
  entityId: number;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceFormData {
  name: string;
  amount: string | number;
  isTaxable: boolean;
  billingMethod: 'included_in_rental' | 'charged_separately';
  description?: string;
  includeInPDC?: boolean;
}

export interface ServicesResponse {
  success: boolean;
  data: {
    services: Service[];
    count: number;
  };
  message?: string;
}

export interface ServiceResponse {
  success: boolean;
  data: {
    service: Service;
  };
  message?: string;
}

export interface CopyServicesRequest {
  unitId: number;
  leaseId: number;
}

export interface BulkCreateServicesRequest {
  services: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>[];
  entityType: 'unit' | 'lease';
  entityId: number;
}
