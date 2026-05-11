"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Product, Reservation, ReservationSource } from "./types";
import { mapProduct, mapReservation } from "./types";
import type { ProductRow, ReservationRow } from "./db-types";
import { supabase } from "./supabase";

type ServerState = {
  products: Product[];
  reservations: Reservation[];
  ready: boolean;
  error: string | null;
};

type LocalState = {
  attendantName: string;
};

type Actions = {
  setAttendantName: (name: string) => void;
  init: () => Promise<void>;
  dispose: () => void;
  createReservation: (
    productId: string,
    customerName: string,
    source?: ReservationSource,
  ) => Promise<Reservation>;
  cancelReservation: (id: string) => Promise<void>;
  confirmSale: (id: string) => Promise<void>;
};

const sortByCreatedDesc = <T extends { createdAt: string }>(arr: T[]) =>
  [...arr].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

const upsert = <T extends { id: string }>(arr: T[], item: T): T[] => {
  const idx = arr.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...arr];
  const next = [...arr];
  next[idx] = item;
  return next;
};

let channel: RealtimeChannel | null = null;
let initPromise: Promise<void> | null = null;

export const useStore = create<ServerState & LocalState & Actions>()(
  persist(
    (set, get) => ({
      products: [],
      reservations: [],
      ready: false,
      error: null,
      attendantName: "",

      setAttendantName: (name) => set({ attendantName: name }),

      init: async () => {
        if (get().ready) return;
        if (initPromise) return initPromise;

        initPromise = (async () => {
          try {
            const [products, reservations] = await Promise.all([
              supabase
                .from("products")
                .select("*")
                .order("name", { ascending: true }),
              supabase
                .from("reservations")
                .select("*")
                .order("created_at", { ascending: false }),
            ]);
            if (products.error) throw products.error;
            if (reservations.error) throw reservations.error;

            set({
              products: (products.data ?? []).map(mapProduct),
              reservations: (reservations.data ?? []).map(mapReservation),
              ready: true,
              error: null,
            });

            channel = supabase
              .channel("nevoy-atendente")
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "products" },
                (payload) => {
                  if (payload.eventType === "DELETE") {
                    set((s) => ({
                      products: s.products.filter(
                        (p) => p.id !== (payload.old as ProductRow).id,
                      ),
                    }));
                    return;
                  }
                  set((s) => ({
                    products: upsert(
                      s.products,
                      mapProduct(payload.new as ProductRow),
                    ).sort((a, b) => a.name.localeCompare(b.name)),
                  }));
                },
              )
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "reservations" },
                (payload) => {
                  if (payload.eventType === "DELETE") {
                    set((s) => ({
                      reservations: s.reservations.filter(
                        (r) => r.id !== (payload.old as ReservationRow).id,
                      ),
                    }));
                    return;
                  }
                  set((s) => ({
                    reservations: sortByCreatedDesc(
                      upsert(
                        s.reservations,
                        mapReservation(payload.new as ReservationRow),
                      ),
                    ),
                  }));
                },
              )
              .subscribe();
          } catch (e: unknown) {
            const msg =
              e instanceof Error ? e.message : "Falha ao carregar dados";
            set({ error: msg });
            throw e;
          }
        })();

        try {
          await initPromise;
        } finally {
          initPromise = null;
        }
      },

      dispose: () => {
        if (channel) {
          void supabase.removeChannel(channel);
          channel = null;
        }
        set({ ready: false });
      },

      createReservation: async (
        productId,
        customerName,
        source = "atendente",
      ) => {
        const { data, error } = await supabase.rpc("create_reservation", {
          p_product_id: productId,
          p_customer_name: customerName,
          p_source: source,
        });
        if (error) throw error;
        return mapReservation(data as ReservationRow);
      },

      cancelReservation: async (id) => {
        const { error } = await supabase.rpc("cancel_reservation", {
          p_id: id,
        });
        if (error) throw error;
      },

      confirmSale: async (id) => {
        const { error } = await supabase.rpc("confirm_sale", { p_id: id });
        if (error) throw error;
      },
    }),
    {
      name: "nevoy-atendente-store",
      version: 2,
      partialize: (state) => ({ attendantName: state.attendantName }),
    },
  ),
);
