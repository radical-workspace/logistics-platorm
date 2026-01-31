export type LatLngLike = string | number | null | undefined;

export type PointInput = {
  lat: LatLngLike;
  lng: LatLngLike;
  label?: string | null;
};

export type TrackingMapProps = {
  origin?: PointInput;
  destination?: PointInput;
  lastEvent?: PointInput;
  events?: Array<{
    lat: number | string | null;
    lng: number | string | null;
    type?: string;
    at?: string;
    notes?: string;
  }>;
  status?: string;
  lastUpdateAt?: string | null;
  lastNotes?: string | null;
};
