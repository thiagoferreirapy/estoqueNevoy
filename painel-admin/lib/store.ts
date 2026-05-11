"use client";

import { create } from "zustand";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import type {
  ActivityLog,
  Product,
  Profile,
  Reservation,
  ReservationSource,
  Sale,
  Settings,
} from "./types";
import {
  mapLog,
  mapProduct,
  mapReservation,
  mapSale,
} from "./types";
import type {
  ActivityLogRow,
  ProductRow,
  ReservationRow,
  SaleRow,
  SettingRow,
} from "./db-types";
import { supabase } from "./supabase";

const DEFAULT_SETTINGS: Settings = {
  reservationTtlMinutes: 10,
  storeName: "Loja Centro",
  whatsappNumber: "",
};

type State = {
  session: Session | null;
  profile: Profile | null;
  authReady: boolean;

  products: Product[];
  reservations: Reservation[];
  sales: Sale[];
  logs: ActivityLog[];
  settings: Settings;
  ready: boolean;
  error: string | null;
};

type Actions = {
  initAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  init: () => Promise<void>;
  dispose: () => void;

  createProduct: (p: {
    name: string;
    price: number;
    stock: number;
    image: string;
    imageUrl?: string | null;
    category: string;
  }) => Promise<void>;
  updateProduct: (
    id: string,
    patch: Partial<
      Pick<Product, "name" | "price" | "stock" | "image" | "imageUrl" | "category">
    >,
  ) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (id: string, delta: number) => Promise<void>;

  createReservation: (
    productId: string,
    customerName: string,
    source: ReservationSource,
  ) => Promise<Reservation>;
  cancelReservation: (id: string) => Promise<void>;
  confirmSale: (id: string) => Promise<void>;

  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;

  uploadProductImage: (file: File) => Promise<string>;
  deleteProductImage: (url: string) => Promise<void>;
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

// Mapeia snake_case → camelCase do settings (key/value rows → objeto tipado)
function rowsToSettings(rows: SettingRow[]): Settings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    reservationTtlMinutes:
      Number(map.get("reservation_ttl_minutes")) ||
      DEFAULT_SETTINGS.reservationTtlMinutes,
    storeName: (map.get("store_name") as string) ?? DEFAULT_SETTINGS.storeName,
    whatsappNumber:
      (map.get("whatsapp_number") as string) ?? DEFAULT_SETTINGS.whatsappNumber,
  };
}

const SETTING_KEY_MAP: Record<keyof Settings, string> = {
  reservationTtlMinutes: "reservation_ttl_minutes",
  storeName: "store_name",
  whatsappNumber: "whatsapp_number",
};

// Channel é guardado fora do estado pra não disparar re-renders.
let channel: RealtimeChannel | null = null;
let initPromise: Promise<void> | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, name")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export const useStore = create<State & Actions>()((set, get) => ({
  session: null,
  profile: null,
  authReady: false,

  products: [],
  reservations: [],
  sales: [],
  logs: [],
  settings: DEFAULT_SETTINGS,
  ready: false,
  error: null,

  initAuth: async () => {
    if (get().authReady) return;
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const profile = session ? await loadProfile(session.user.id) : null;
    set({ session, profile, authReady: true });

    if (authSubscription) authSubscription.unsubscribe();
    const sub = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const newProfile = newSession ? await loadProfile(newSession.user.id) : null;
      set({ session: newSession, profile: newProfile });
      // Logout: limpa estado da app e desconecta realtime
      if (!newSession) {
        get().dispose();
        set({ products: [], reservations: [], sales: [], logs: [] });
      }
    });
    authSubscription = sub.data.subscription;
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  init: async () => {
    if (get().ready) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        const [products, reservations, sales, logs, settings] = await Promise.all([
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase.from("reservations").select("*").order("created_at", { ascending: false }),
          supabase.from("sales").select("*").order("sold_at", { ascending: false }),
          supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
          supabase.from("settings").select("*"),
        ]);

        if (products.error) throw products.error;
        if (reservations.error) throw reservations.error;
        if (sales.error) throw sales.error;
        if (logs.error) throw logs.error;
        if (settings.error) throw settings.error;

        set({
          products: (products.data ?? []).map(mapProduct),
          reservations: (reservations.data ?? []).map(mapReservation),
          sales: (sales.data ?? []).map(mapSale),
          logs: (logs.data ?? []).map(mapLog),
          settings: rowsToSettings((settings.data ?? []) as SettingRow[]),
          ready: true,
          error: null,
        });

        channel = supabase
          .channel("nevoy-admin")
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
                products: sortByCreatedDesc(
                  upsert(s.products, mapProduct(payload.new as ProductRow)),
                ),
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
                  upsert(s.reservations, mapReservation(payload.new as ReservationRow)),
                ),
              }));
            },
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "sales" },
            (payload) => {
              if (payload.eventType === "DELETE") {
                set((s) => ({
                  sales: s.sales.filter(
                    (x) => x.id !== (payload.old as SaleRow).id,
                  ),
                }));
                return;
              }
              set((s) => {
                const sale = mapSale(payload.new as SaleRow);
                const idx = s.sales.findIndex((x) => x.id === sale.id);
                if (idx === -1) return { sales: [sale, ...s.sales] };
                const next = [...s.sales];
                next[idx] = sale;
                return { sales: next };
              });
            },
          )
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "activity_logs" },
            (payload) => {
              const log = mapLog(payload.new as ActivityLogRow);
              set((s) => ({ logs: [log, ...s.logs].slice(0, 200) }));
            },
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "settings" },
            async () => {
              const { data } = await supabase.from("settings").select("*");
              if (data) set({ settings: rowsToSettings(data as SettingRow[]) });
            },
          )
          .subscribe();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Falha ao carregar dados";
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

  createProduct: async (p) => {
    const { error } = await supabase.from("products").insert({
      name: p.name,
      price: p.price,
      stock: p.stock,
      image: p.image,
      image_url: p.imageUrl ?? null,
      category: p.category,
    });
    if (error) throw error;
  },

  updateProduct: async (id, patch) => {
    // Converte imageUrl (camel) → image_url (snake) para o DB
    const dbPatch: Record<string, unknown> = { ...patch };
    if ("imageUrl" in dbPatch) {
      dbPatch.image_url = dbPatch.imageUrl;
      delete dbPatch.imageUrl;
    }
    const { error } = await supabase.from("products").update(dbPatch).eq("id", id);
    if (error) throw error;
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  },

  adjustStock: async (id, delta) => {
    const { error } = await supabase.rpc("adjust_stock", {
      p_id: id,
      p_delta: delta,
    });
    if (error) throw error;
  },

  createReservation: async (productId, customerName, source) => {
    const { data, error } = await supabase.rpc("create_reservation", {
      p_product_id: productId,
      p_customer_name: customerName,
      p_source: source,
    });
    if (error) throw error;
    return mapReservation(data as ReservationRow);
  },

  cancelReservation: async (id) => {
    const { error } = await supabase.rpc("cancel_reservation", { p_id: id });
    if (error) throw error;
  },

  confirmSale: async (id) => {
    const { error } = await supabase.rpc("confirm_sale", { p_id: id });
    if (error) throw error;
  },

  setSetting: async (key, value) => {
    const { error } = await supabase.rpc("set_setting", {
      p_key: SETTING_KEY_MAP[key],
      p_value: value,
    });
    if (error) throw error;
  },

  uploadProductImage: async (file) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  },

  deleteProductImage: async (url) => {
    // Extrai o path do final da URL pública
    const marker = "/product-images/";
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = url.slice(idx + marker.length);
    await supabase.storage.from("product-images").remove([path]);
  },
}));
