'use client';

import { useState, useTransition } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { UsuarioFormDialog } from './usuario-form-dialog';
import { eliminarUsuario } from './actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatearFecha } from '@/lib/format';
import { ETIQUETA_ROL, ROLES, type Rol } from '@/lib/roles';

type Usuario = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  rol: string;
  creado_en: string;
};

type Props = {
  usuarios: Usuario[];
};

function getEtiquetaRol(rol: string): string {
  const r = rol as Rol;
  if (r in ETIQUETA_ROL) return ETIQUETA_ROL[r];
  return rol;
}

export function UsuariosTable({ usuarios }: Props) {
  const [isPending, startTransition] = useTransition();
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);
  const [usuarioAEditar, setUsuarioAEditar] = useState<Usuario | null>(null);

  function handleEliminar(usuario: Usuario) {
    setUsuarioAEliminar(usuario);
  }

  function confirmarEliminacion() {
    if (!usuarioAEliminar) return;
    startTransition(async () => {
      try {
        await eliminarUsuario(usuarioAEliminar.id);
        setUsuarioAEliminar(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error desconocido');
      }
    });
  }

  function obtenerIniciales(usuario: Usuario) {
    const nombres = usuario.nombres?.trim() || '';
    const apellidos = usuario.apellidos?.trim() || '';
    const partes = [nombres, apellidos].filter(Boolean);
    if (partes.length === 0) {
      return usuario.email.slice(0, 2).toUpperCase();
    }
    return partes
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function getRolColor(rol: string) {
    const r = rol as Rol;
    if (r === ROLES.ADMINISTRADOR) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (r === ROLES.EJECUTIVO) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (r === ROLES.PROPIETARIO) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (r === ROLES.ARRENDATARIO) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    return 'bg-muted text-muted-foreground';
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No hay usuarios registrados.
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {obtenerIniciales(usuario)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {[usuario.nombres, usuario.apellidos].filter(Boolean).join(' ') || 'Sin nombre'}
                        </span>
                        <span className="text-xs text-muted-foreground">{usuario.telefono || 'Sin teléfono'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{usuario.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getRolColor(usuario.rol)}>
                      {getEtiquetaRol(usuario.rol)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatearFecha(usuario.creado_en)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setUsuarioAEditar(usuario)}
                        title="Editar usuario"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEliminar(usuario)}
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!usuarioAEliminar} onOpenChange={(open) => !open && setUsuarioAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la cuenta de{' '}
              <span className="font-semibold">{usuarioAEliminar?.email}</span> (hard delete). No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminacion}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {usuarioAEditar ? (
        <UsuarioFormDialog
          mode="editar"
          usuario={usuarioAEditar}
          open={!!usuarioAEditar}
          onOpenChange={(open) => !open && setUsuarioAEditar(null)}
        />
      ) : null}
    </>
  );
}
