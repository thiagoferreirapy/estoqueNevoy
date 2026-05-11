import type {
  ProductRow,
  ReservationRow,
  SaleRow,
  ActivityLogRow,
  ReservationStatusDB,
  ReservationSourceDB,
  ActivityTypeDB,
} from "./db-types";

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
  imageUrl: string | null;
  category: string;
  createdAt: string;
};

export type ReservationStatus = ReservationStatusDB;
export type ReservationSource = ReservationSourceDB;

export type Reservation = {
  id: string;
  productId: string;
  customerName: string;
  source: ReservationSource;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  priceAtReservation: number;
};

export type Settings = {
  reservationTtlMinutes: number;
  storeName: string;
  whatsappNumber: string;
};

export type Profile = {
  id: string;
  role: "admin" | "atendente";
  name: string | null;
};

export type Sale = {
  id: string;
  reservationId: string;
  amount: number;
  soldAt: string;
};

export type ActivityLog = {
  id: string;
  type: ActivityTypeDB;
  message: string;
  createdAt: string;
};

// Mapeamento DB (snake_case) → app (camelCase).
// Mantém o resto do código blindado contra mudanças no schema.
export const mapProduct = (r: ProductRow): Product => ({
  id: r.id,
  name: r.name,
  price: Number(r.price),
  stock: r.stock,
  image: r.image,
  imageUrl: r.image_url,
  category: r.category,
  createdAt: r.created_at,
});

export const mapReservation = (r: ReservationRow): Reservation => ({
  id: r.id,
  productId: r.product_id,
  customerName: r.customer_name,
  source: r.source,
  status: r.status,
  expiresAt: r.expires_at,
  createdAt: r.created_at,
  priceAtReservation: Number(r.price_at_reservation),
});

export const mapSale = (r: SaleRow): Sale => ({
  id: r.id,
  reservationId: r.reservation_id,
  amount: Number(r.amount),
  soldAt: r.sold_at,
});

export const mapLog = (r: ActivityLogRow): ActivityLog => ({
  id: r.id,
  type: r.type,
  message: r.message,
  createdAt: r.created_at,
});
