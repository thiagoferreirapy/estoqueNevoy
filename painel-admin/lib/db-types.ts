export type ReservationStatusDB = "active" | "expired" | "sold" | "cancelled";
export type ReservationSourceDB = "whatsapp" | "atendente";
export type ActivityTypeDB =
  | "reservation_created"
  | "reservation_cancelled"
  | "reservation_expired"
  | "sale_confirmed"
  | "stock_updated"
  | "product_created";

export type ProductRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
  image_url: string | null;
  category: string;
  created_at: string;
};

export type ReservationRow = {
  id: string;
  product_id: string;
  customer_name: string;
  source: ReservationSourceDB;
  status: ReservationStatusDB;
  expires_at: string;
  created_at: string;
  price_at_reservation: number;
};

export type SettingRow = {
  key: string;
  value: unknown;
  updated_at: string;
};

export type SaleRow = {
  id: string;
  reservation_id: string;
  amount: number;
  sold_at: string;
};

export type ActivityLogRow = {
  id: string;
  type: ActivityTypeDB;
  message: string;
  created_at: string;
};
