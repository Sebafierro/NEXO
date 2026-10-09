'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Rol } from '@/lib/roles';
import { ROLES } from '@/lib/roles';
import { crearUsuario, actualizarUsuario } from './actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Usuario = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  rol: string;
};

type Props = {
  mode: 'crear' | 'editar';
  usuario?: Usuario;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function UsuarioFormDialog({ mode, usuario, trigger, open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(usuario?.email ?? '');
  const [password, setPassword] = useState('');
  const [nombres, setNombres] = useState(usuario?.nombres ?? '');
  const [apellidos, setApellidos] = useState(usuario?.apellidos ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [rol, setRol] = useState<string>(usuario?.rol ?? ROLES.PROPIETARIO);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (mode === 'crear') {
          await crearUsuario({
            email,
            password,
            nombres: nombres || null,
            apellidos: apellidos || null,
            telefono: telefono || null,
            rol: rol as Rol,
          });
        } else if (usuario) {
          await actualizarUsuario(usuario.id, {
            nombres: nombres || null,
            apellidos: apellidos || null,
            telefono: telefono || null,
            rol: rol as Rol,
          });
        }
        onOpenChange?.(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
    });
  }

  const isCrear = mode === 'crear';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isCrear ? 'Agregar usuario' : 'Editar usuario'}</DialogTitle>
            <DialogDescription>
              {isCrear
                ? 'Crea un usuario con correo y contraseña (sin confirmación por email).'
                : 'Actualiza los datos y rol del usuario.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                required
                disabled={!isCrear}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {isCrear ? (
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nombres">Nombres</Label>
                <Input
                  id="nombres"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input
                  id="apellidos"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rol">Rol</Label>
              <Select value={rol} onValueChange={setRol}>
                <SelectTrigger id="rol">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLES.ADMINISTRADOR}>Administrador</SelectItem>
                  <SelectItem value={ROLES.EJECUTIVO}>Ejecutivo</SelectItem>
                  <SelectItem value={ROLES.PROPIETARIO}>Propietario</SelectItem>
                  <SelectItem value={ROLES.ARRENDATARIO}>Arrendatario</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : isCrear ? 'Crear usuario' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
