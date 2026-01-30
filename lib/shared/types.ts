export type UserRole = 'admin' | 'dispatcher' | 'driver' | 'customer';
export type ShipmentStatus = 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
export type VehicleType = 'truck' | 'van' | 'motorcycle' | 'aircraft';

export interface Profile {
  id: string;
  email: string;
  display_name?: string;
  role: UserRole;
  phone?: string;
  company_id?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  description?: string;
  website?: string;
  logo_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  company_id: string;
  registration_number: string;
  vehicle_type: VehicleType;
  capacity_kg?: number;
  current_driver_id?: string;
  is_active: boolean;
  last_location?: { lat: number; lng: number };
  last_location_updated?: string;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  company_id: string;
  customer_id?: string | null;
  reference_number: string;
  status: ShipmentStatus;
  origin_address: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_address: string;
  dest_lat?: number;
  dest_lng?: number;
  current_location_label?: string;
  current_lat?: number;
  current_lng?: number;
  last_event_at?: string;
  weight_kg?: number;
  description?: string;
  assigned_dispatcher_id?: string;
  assigned_vehicle_id?: string;
  assigned_driver_id?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  created_at: string;
  updated_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  changes?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}
