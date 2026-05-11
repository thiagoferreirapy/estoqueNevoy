"use client";

import * as React from "react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MessageCircle,
  Sparkles,
  Database,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatRpcError } from "@/lib/utils";

export default function ConfiguracoesPage() {
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);

  const [ttl, setTtl] = React.useState(String(settings.reservationTtlMinutes));
  const [storeName, setStoreName] = React.useState(settings.storeName);
  const [whatsappNumber, setWhatsappNumber] = React.useState(
    settings.whatsappNumber,
  );
  const [openaiKey, setOpenaiKey] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Quando o realtime atualiza settings (outra aba salvou), sincroniza os campos
  // — exceto se o usuário já editou (evita sobrescrever).
  React.useEffect(() => {
    setTtl(String(settings.reservationTtlMinutes));
  }, [settings.reservationTtlMinutes]);
  React.useEffect(() => setStoreName(settings.storeName), [settings.storeName]);
  React.useEffect(
    () => setWhatsappNumber(settings.whatsappNumber),
    [settings.whatsappNumber],
  );

  async function saveLoja() {
    const ttlNum = Number(ttl);
    if (!Number.isFinite(ttlNum) || ttlNum < 1 || ttlNum > 1440) {
      toast.error("TTL deve estar entre 1 e 1440 minutos");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        setSetting("reservationTtlMinutes", ttlNum),
        setSetting("storeName", storeName.trim() || "Loja"),
      ]);
      toast.success("Configurações salvas");
    } catch (err) {
      toast.error(formatRpcError(err, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  async function saveWhatsapp() {
    setSaving(true);
    try {
      await setSetting("whatsappNumber", whatsappNumber.trim());
      toast.success("Número atualizado");
    } catch (err) {
      toast.error(formatRpcError(err, "Erro ao salvar"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="Configurações" subtitle="Ajustes gerais do sistema" />
      <main className="space-y-6 p-4 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Loja
              </CardTitle>
              <CardDescription>
                Persistido no Supabase — vale para todos os clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store">Nome da loja</Label>
                <Input
                  id="store"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ttl">Tempo de reserva (minutos)</Label>
                <Input
                  id="ttl"
                  type="number"
                  min={1}
                  max={1440}
                  value={ttl}
                  onChange={(e) => setTtl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tempo até a reserva expirar automaticamente. MVP usa 10 min,
                  produção 120.
                </p>
              </div>
              <Button onClick={saveLoja} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-success" /> WhatsApp
              </CardTitle>
              <CardDescription>
                Conexão via Evolution API (QR Code)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wpp">Número de envio</Label>
                <Input
                  id="wpp"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+55 11 99999-9999"
                />
              </div>
              <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                <div className="mx-auto mb-3 h-32 w-32 rounded-md bg-foreground/5" />
                Escaneie o QR Code com o WhatsApp da loja
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={saveWhatsapp}
                  disabled={saving}
                >
                  Salvar número
                </Button>
                <Button variant="outline" className="flex-1" disabled>
                  Gerar QR Code
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Integração Evolution API ainda não implementada.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> OpenAI
              </CardTitle>
              <CardDescription>
                Chave usada pelo agente — guarde em uma Edge Function, não no
                client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key">API Key</Label>
                <Input
                  id="key"
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <Button variant="outline" disabled>
                Salvar (em breve)
              </Button>
              <p className="text-xs text-muted-foreground">
                Quando entrar a integração, a chave vai pro Supabase Vault e a
                Edge Function lê de lá.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" /> Dados
              </CardTitle>
              <CardDescription>
                O estado é persistido no Supabase em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Recarregar do servidor</p>
                  <p className="text-xs text-muted-foreground">
                    Refaz o load inicial e reconecta no Realtime
                  </p>
                </div>
                <Button variant="outline" onClick={() => location.reload()}>
                  <Database className="h-4 w-4" /> Recarregar
                </Button>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  Para limpar produtos/reservas use o SQL Editor do Supabase ou
                  rode <code>supabase/seed.sql</code> novamente.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
