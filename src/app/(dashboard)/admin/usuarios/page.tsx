import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizarRol, ROLES } from '@/lib/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UsuarioFormDialog } from './usuario-form-dialog';
import { UsuariosTable } from './usuarios-table';

export const dynamic = 'force-dynamic';

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (normalizarRol(user?.app_metadata?.rol ?? user?.user_metadata?.rol) !== ROLES.ADMINISTRADOR) {
    redirect('/login');
  }

  const rolFiltro = typeof params.rol === 'string' && params.rol !== 'todos' ? params.rol : null;
  const q = typeof params.q === 'string' ? params.q.trim() : '';

  let query = supabase
    .from('usuarios')
    .select('id, email, nombres, apellidos, telefono, rol, creado_en')
    .order('creado_en', { ascending: false });

  if (rolFiltro) {
    query = query.eq('rol', rolFiltro);
  }

  if (q) {
    query = query.or(`email.ilike.%${q}%,nombres.ilike.%${q}%,apellidos.ilike.%${q}%,telefono.ilike.%${q}%`);
  }

  const { data: usuarios, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administración de usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona usuarios, roles y accesos de la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>
              {usuarios.length} {usuarios.length === 1 ? 'usuario' : 'usuarios'} registrados
            </CardDescription>
          </div>
          <UsuarioFormDialog
            mode="crear"
            trigger={<Button>Agregar usuario</Button>}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:max-w-xs">
              <Input
                name="q"
                placeholder="Buscar por nombre, correo o teléfono"
                defaultValue={q}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select name="rol" defaultValue={rolFiltro ?? 'todos'}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  <SelectItem value={ROLES.ADMINISTRADOR}>Administrador</SelectItem>
                  <SelectItem value={ROLES.EJECUTIVO}>Ejecutivo</SelectItem>
                  <SelectItem value={ROLES.PROPIETARIO}>Propietario</SelectItem>
                  <SelectItem value={ROLES.ARRENDATARIO}>Arrendatario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>

          <UsuariosTable usuarios={usuarios} />
        </CardContent>
      </Card>
    </div>
  );
}
