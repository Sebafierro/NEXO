"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subirComprobanteArrendatario as subirComprobante } from "./actions";

export function SubirComprobanteArrendatario({ obligaciones }: { obligaciones: any[] }) {
  const [obligacionId, setObligacionId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setCargando(true);
    formData.set("obligacion_id", obligacionId);
    try {
      await subirComprobante(formData);
    } catch (e: any) {
      // redirect() de Next lanza un error especial (NEXT_REDIRECT) que debe
      // propagarse para que la navegación ocurra; solo mostramos errores reales.
      if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
      setError(e?.message ?? "Error al subir comprobante");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir comprobante</CardTitle>
        <CardDescription>Asocia tu comprobante a la obligación que estás pagando.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="obligacion">Obligación</Label>
            <Select value={obligacionId} onValueChange={setObligacionId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la obligación a pagar" />
              </SelectTrigger>
              <SelectContent>
                {(obligaciones || []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.tipo?.replaceAll("_", " ")} - {o.periodo || o.fecha_vencimiento} - Saldo: ${Number(o.saldo || o.monto).toLocaleString("es-CL")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fecha_pago">Fecha de pago</Label>
              <Input id="fecha_pago" name="fecha_pago" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto">Monto pagado</Label>
              <Input id="monto" name="monto" type="number" step="1" min="1" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="metodo_pago">Método de pago</Label>
              <Select name="metodo_pago" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  <SelectItem value="DEPOSITO">Depósito</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia / N° operación</Label>
              <Input id="referencia" name="referencia" placeholder="Opcional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Comprobante (imagen o PDF)</Label>
            <Input id="file" name="file" type="file" accept="image/*,application/pdf" required />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={cargando || !obligacionId}>
            {cargando ? "Subiendo..." : "Subir comprobante"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
