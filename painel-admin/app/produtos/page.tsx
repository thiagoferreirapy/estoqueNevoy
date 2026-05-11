"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Search, Upload, X, Loader2 } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ProductAvatar } from "@/components/product-avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useStore } from "@/lib/store";
import { formatBRL, formatRpcError } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { toast } from "sonner";

type FormState = {
  name: string;
  price: string;
  stock: string;
  category: string;
  image: string;
  imageUrl: string | null;
};

const empty: FormState = {
  name: "",
  price: "",
  stock: "",
  category: "",
  image: "📦",
  imageUrl: null,
};

const emojiOptions = ["📱", "💻", "🎧", "⌚", "📲", "🖥️", "🖱️", "⌨️", "📦"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

export default function ProdutosPage() {
  const products = useStore((s) => s.products);
  const createProduct = useStore((s) => s.createProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);
  const uploadProductImage = useStore((s) => s.uploadProductImage);
  const deleteProductImage = useStore((s) => s.deleteProductImage);

  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [toDelete, setToDelete] = React.useState<Product | null>(null);
  const [form, setForm] = React.useState<FormState>(empty);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      price: String(p.price),
      stock: String(p.stock),
      category: p.category,
      image: p.image,
      imageUrl: p.imageUrl,
    });
    setOpen(true);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Imagem precisa ter no máximo 4 MB");
      return;
    }
    setUploading(true);
    try {
      const previousUrl = form.imageUrl;
      const url = await uploadProductImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
      // Limpa imagem anterior só DEPOIS de salvar a nova com sucesso
      if (previousUrl) deleteProductImage(previousUrl).catch(() => {});
      toast.success("Imagem enviada");
    } catch (err) {
      toast.error(formatRpcError(err, "Erro ao enviar imagem"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeImage() {
    const url = form.imageUrl;
    setForm((f) => ({ ...f, imageUrl: null }));
    if (url) deleteProductImage(url).catch(() => {});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      category: form.category.trim() || "Geral",
      image: form.image || "📦",
      imageUrl: form.imageUrl,
    };
    if (!payload.name || Number.isNaN(payload.price) || Number.isNaN(payload.stock)) {
      toast.error("Preencha nome, preço e estoque corretamente");
      return;
    }
    try {
      if (editing) {
        await updateProduct(editing.id, payload);
        toast.success("Produto atualizado");
      } else {
        await createProduct(payload);
        toast.success("Produto criado");
      }
      setOpen(false);
    } catch (err) {
      toast.error(formatRpcError(err, "Erro ao salvar"));
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteProduct(toDelete.id);
      if (toDelete.imageUrl) {
        deleteProductImage(toDelete.imageUrl).catch(() => {});
      }
      toast.success("Produto excluído");
    } catch (err) {
      toast.error(formatRpcError(err, "Erro ao excluir"));
    }
  }

  return (
    <>
      <Topbar title="Produtos" subtitle="Catálogo da loja" />
      <main className="space-y-6 p-4 lg:p-8">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Catálogo ({products.length})</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-9 sm:w-64"
                />
              </div>
              <Button onClick={openCreate} className="shrink-0">
                <Plus className="h-4 w-4" /> Novo produto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="group flex flex-col rounded-lg border p-4 transition-colors hover:bg-accent/30"
                >
                  <div className="flex items-start justify-between">
                    <ProductAvatar
                      imageUrl={p.imageUrl}
                      emoji={p.image}
                      alt={p.name}
                      className="h-14 w-14"
                      emojiClassName="text-4xl"
                    />
                    <Badge
                      variant={
                        p.stock === 0
                          ? "destructive"
                          : p.stock <= 2
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {p.stock} un.
                    </Badge>
                  </div>
                  <div className="mt-3 flex-1">
                    <p className="font-medium leading-tight">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.category}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold">{formatBRL(p.price)}</span>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(p)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(p)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClick={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar produto" : "Novo produto"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados do produto" : "Cadastre um novo item no catálogo"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="iPhone 15 Pro"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="5999"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Estoque</Label>
                <Input
                  id="stock"
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="2"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Smartphones"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Emoji (fallback)</Label>
                <Select
                  id="image"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                >
                  {emojiOptions.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto do produto</Label>
              <div className="flex items-center gap-3">
                <ProductAvatar
                  imageUrl={form.imageUrl}
                  emoji={form.image}
                  alt="Preview"
                  className="h-20 w-20 shrink-0"
                  emojiClassName="text-3xl"
                />
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {form.imageUrl ? "Trocar foto" : "Enviar foto"}
                  </Button>
                  {form.imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeImage}
                      className="w-full text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" /> Remover foto (usa emoji)
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG ou WEBP — até 4 MB. Sem foto, mostra o emoji.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editing ? "Salvar" : "Criar produto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Excluir ${toDelete?.name ?? ""}?`}
        description="Essa ação não pode ser desfeita. Se o produto tiver reservas ativas ou histórico de vendas, a exclusão será bloqueada pelo backend."
        confirmLabel="Excluir"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
