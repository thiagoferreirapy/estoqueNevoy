export type ReservationStatusDB = "active" | "expired" | "sold" | "cancelled";
export type ReservationSourceDB = "whatsapp" | "atendente";

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
