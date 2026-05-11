import type {
  ProductRow,
  ReservationRow,
  ReservationStatusDB,
  ReservationSourceDB,
} from "./db-types";

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
  imageUrl: string | null;
  category: string;
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

export const mapProduct = (r: ProductRow): Product => ({
  id: r.id,
  name: r.name,
  price: Number(r.price),
  stock: r.stock,
  image: r.image,
  imageUrl: r.image_url,
  category: r.category,
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
