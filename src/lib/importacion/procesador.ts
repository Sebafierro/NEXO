"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirRol } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { parsearArchivo } from "./parseador";
import { validarFilas } from "./validador";
import type { ResultadoPrevisualizacion, ResultadoImportacion, FilaError, FilaAdvertencia } from "./types";

function toNumber(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return val;
  const str = String(val).toString().replace(/\./g, "").replace(/,/g, ".");
  const num = Number(str);
  return Number.isNaN(num) ? 0 : num;
}

function normalizarTexto(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function construirDireccion(fila: any): string {
  const direccion = normalizarTexto(fila.DIRECCION);
  const nro = normalizarTexto(fila.NRO || fila.NUMERO);
  if (direccion && nro) {
    // Evitar duplicar si ya viene incluido
    if (direccion.toUpperCase().includes(nro.toUpperCase())) return direccion;
    return `${direccion} ${nro}`.trim();
  }
  return direccion;
}

export async function previsualizarImportacion(formData: FormData): Promise<ResultadoPrevisualizacion> {
  await exigirRol(ROLES.ADMINISTRADOR);

  const archivo = formData.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) {
    return {
      ok: false,
      totalFilas: 0,
      errores: [{ fila: 0, motivo: "Debe seleccionar un archivo .xlsx o .csv" }],
      advertencias: [],
      filas: [],
      columnasDetectadas: [],
      mensaje: "Archivo no válido",
    };
  }

  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const parsed = parsearArchivo(buffer, archivo.name);
    const filasParaValidar = parsed.filas.map((f) => ({ ...f, DIRECCION: construirDireccion(f) }));
    const { errores, advertencias } = validarFilas(filasParaValidar);

    return {
      ok: errores.length === 0,
      totalFilas: filasParaValidar.length,
      errores,
      advertencias,
      filas: filasParaValidar,
      columnasDetectadas: parsed.columnas,
      mensaje: errores.length === 0 ? "Previsualización válida" : "Se encontraron errores en la previsualización",
    };
  } catch (e: any) {
    return {
      ok: false,
      totalFilas: 0,
      errores: [{ fila: 0, motivo: e?.message || "Error al parsear archivo" }],
      advertencias: [],
      filas: [],
      columnasDetectadas: [],
      mensaje: e?.message || "Error al parsear archivo",
    };
  }
}

export async function confirmarImportacion(formData: FormData): Promise<ResultadoImportacion> {
  await exigirRol(ROLES.ADMINISTRADOR);
  const supabaseAdmin = createAdminClient();

  const archivo = formData.get("archivo") as File | null;
  if (!archivo || archivo.size === 0) {
    return {
      ok: false,
      mensaje: "Archivo no válido",
      propietariosCreados: 0,
      propietariosActualizados: 0,
      propiedadesCreadas: 0,
      propiedadesActualizadas: 0,
      arrendatariosCreados: 0,
      arrendatariosActualizados: 0,
      contratosCreados: 0,
      contratosActualizados: 0,
      cuentasServiciosCreadas: 0,
      cuentasServiciosActualizadas: 0,
      errores: [{ fila: 0, motivo: "Debe seleccionar un archivo .xlsx o .csv" }],
      advertencias: [],
    };
  }

  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const parsed = parsearArchivo(buffer, archivo.name);
    const filasProcesar = parsed.filas.map((f) => ({ ...f, DIRECCION: construirDireccion(f) }));
    const { errores, advertencias } = validarFilas(filasProcesar);

    if (errores.length > 0) {
      return {
        ok: false,
        mensaje: "No se puede importar con errores de validación",
        propietariosCreados: 0,
        propietariosActualizados: 0,
        propiedadesCreadas: 0,
        propiedadesActualizadas: 0,
        arrendatariosCreados: 0,
        arrendatariosActualizados: 0,
        contratosCreados: 0,
        contratosActualizados: 0,
        cuentasServiciosCreadas: 0,
        cuentasServiciosActualizadas: 0,
        errores,
        advertencias,
      };
    }

    const resultado: ResultadoImportacion = {
      ok: true,
      mensaje: "Importación completada",
      propietariosCreados: 0,
      propietariosActualizados: 0,
      propiedadesCreadas: 0,
      propiedadesActualizadas: 0,
      arrendatariosCreados: 0,
      arrendatariosActualizados: 0,
      contratosCreados: 0,
      contratosActualizados: 0,
      cuentasServiciosCreadas: 0,
      cuentasServiciosActualizadas: 0,
      errores: [],
      advertencias,
    };

    for (let i = 0; i < filasProcesar.length; i++) {
      const fila: any = filasProcesar[i];
      const filaNum = i + 2;

      const direccion = normalizarTexto(fila.DIRECCION);
      if (!direccion) {
        resultado.errores.push({ fila: filaNum, motivo: "DIRECCIÓN requerida" });
        continue;
      }

      const propietarioNombre = normalizarTexto(fila.PROPIETARIO) || "PROPIETARIO IMPORTADO";
      const [propNombres, ...propApe] = propietarioNombre.split(/\s+/);
      const nombresProp = propNombres || "PROPIETARIO";
      const apellidosProp = propApe.join(" ") || "IMPORTADO";
      const rutProp = normalizarTexto(fila.RUT_PROPIETARIO || fila.RUT) || null;
      const emailProp = normalizarTexto(fila.EMAIL_PROPIETARIO) || null;

      // Buscar o crear propietario
      let propietarioId: string | null = null;
      if (rutProp) {
        const { data: existente } = await supabaseAdmin.from("propietarios").select("id").eq("rut", rutProp).limit(1).maybeSingle();
        if (existente?.id) {
          propietarioId = existente.id;
          resultado.propietariosActualizados++;
        }
      }
      if (!propietarioId) {
        const { data: creado, error } = await supabaseAdmin
          .from("propietarios")
          .insert({ nombres: nombresProp, apellidos: apellidosProp, rut: rutProp, email: emailProp, estado: "ACTIVO" })
          .select("id")
          .single();
        if (creado?.id) {
          propietarioId = creado.id;
          resultado.propietariosCreados++;
        } else if (error) {
          resultado.errores.push({ fila: filaNum, motivo: `Error al crear propietario: ${error.message}` });
          continue;
        }
      } else {
        await supabaseAdmin.from("propietarios").update({ nombres: nombresProp, apellidos: apellidosProp, email: emailProp }).eq("id", propietarioId);
      }

      // Buscar propiedad por dirección (aproximada)
      const { data: propExistente } = await supabaseAdmin
        .from("propiedades")
        .select("id")
        .ilike("direccion", `%${direccion}%`)
        .limit(1)
        .maybeSingle();

      let propiedadId: string | null = null;
      const tipo = normalizarTexto(fila.TIPO) || "DEPARTAMENTO";
      const estadoRaw = normalizarTexto(fila.ESTADO).toUpperCase();
      const estado = estadoRaw.includes("ARR") || estadoRaw.includes("VIG") || estadoRaw.includes("OCUP") ? "ARRENDADA" : "DISPONIBLE";
      const valorArriendo = toNumber(fila.ARRIENDO || fila.VALOR_ARRIENDO);

      if (propExistente?.id) {
        const { error: updErr } = await supabaseAdmin
          .from("propiedades")
          .update({ propietario_id: propietarioId, tipo: ["DEPARTAMENTO", "CASA", "OFICINA", "LOCAL", "BODEGA", "OTRO"].includes(tipo.toUpperCase()) ? tipo.toUpperCase() : "DEPARTAMENTO", estado, valor_arriendo: valorArriendo })
          .eq("id", propExistente.id);
        if (updErr) {
          resultado.errores.push({ fila: filaNum, motivo: `Error al actualizar propiedad: ${updErr.message}` });
          continue;
        }
        propiedadId = propExistente.id;
        resultado.propiedadesActualizadas++;
      } else {
        const { data: propCreada, error: propErr } = await supabaseAdmin
          .from("propiedades")
          .insert({
            propietario_id: propietarioId,
            direccion,
            nombre: normalizarTexto(fila.NOMBRE) || null,
            tipo: ["DEPARTAMENTO", "CASA", "OFICINA", "LOCAL", "BODEGA", "OTRO"].includes(tipo.toUpperCase()) ? tipo.toUpperCase() : "DEPARTAMENTO",
            estado,
            valor_arriendo: valorArriendo,
            comuna: normalizarTexto(fila.COMUNA) || null,
            region: normalizarTexto(fila.REGION) || null,
          })
          .select("id")
          .single();
        if (propErr) {
          resultado.errores.push({ fila: filaNum, motivo: `Error al crear propiedad: ${propErr.message}` });
          continue;
        }
        propiedadId = propCreada?.id || null;
        if (propiedadId) resultado.propiedadesCreadas++;
      }

      // Arrendatario
      const arrendatarioNombre = normalizarTexto(fila.ARRENDATARIO) || normalizarTexto(fila.INQUILINO);
      if (arrendatarioNombre && propiedadId) {
        const [aNombres, ...aApe] = arrendatarioNombre.split(/\s+/);
        const nombresA = aNombres || "ARRENDATARIO";
        const apellidosA = aApe.join(" ") || "IMPORTADO";
        const rutA = normalizarTexto(fila.RUT_ARRENDATARIO) || null;
        const emailA = normalizarTexto(fila.EMAIL_ARRENDATARIO) || null;

        let arrendatarioId: string | null = null;
        if (rutA) {
          const { data: aEx } = await supabaseAdmin.from("arrendatarios").select("id").eq("rut", rutA).limit(1).maybeSingle();
          if (aEx?.id) {
            arrendatarioId = aEx.id;
            resultado.arrendatariosActualizados++;
          }
        }
        if (!arrendatarioId) {
          const { data: aCreado } = await supabaseAdmin
            .from("arrendatarios")
            .insert({ nombres: nombresA, apellidos: apellidosA, rut: rutA, email: emailA, estado: "ACTIVO" })
            .select("id")
            .single();
          if (aCreado?.id) {
            arrendatarioId = aCreado.id;
            resultado.arrendatariosCreados++;
          }
        } else {
          await supabaseAdmin.from("arrendatarios").update({ nombres: nombresA, apellidos: apellidosA, email: emailA }).eq("id", arrendatarioId);
        }

        // Contrato
        if (arrendatarioId) {
          const fechaInicio = normalizarTexto(fila.FECHA_INICIO) || new Date().toISOString().slice(0, 10);
          const fechaTermino = normalizarTexto(fila.FECHA_TERMINO) || null;
          const garantiaMeses = toNumber(fila.GARANTIA || fila.GARANTIA_MESES) || 1;
          const diaVencimiento = Math.min(Math.max(toNumber(fila.DIA_VENCIMIENTO) || 5, 1), 28);
          const comisionPorcentaje = toNumber(fila.COMISION_PORCENTAJE || fila.COMISION) || 0;

          const { data: contratosActivos } = await supabaseAdmin
            .from("contratos")
            .select("id, estado")
            .eq("propiedad_id", propiedadId)
            .in("estado", ["VIGENTE"]);

          if (contratosActivos && contratosActivos.length > 0) {
            resultado.advertencias.push({ fila: filaNum, motivo: "Se detectaron contratos activos para la propiedad; se procede con cautela (upsert/controlado)." });
          }

          const { data: contratoExistente } = await supabaseAdmin
            .from("contratos")
            .select("id")
            .eq("propiedad_id", propiedadId)
            .eq("arrendatario_id", arrendatarioId)
            .limit(1)
            .maybeSingle();

          if (contratoExistente?.id) {
            const { error: cErr } = await supabaseAdmin
              .from("contratos")
              .update({
                fecha_inicio: fechaInicio,
                fecha_termino: fechaTermino || null,
                valor_arriendo: valorArriendo,
                garantia_meses: garantiaMeses,
                dia_vencimiento: diaVencimiento,
                comision_porcentaje: comisionPorcentaje,
                estado: "VIGENTE",
              })
              .eq("id", contratoExistente.id);
            if (cErr) {
              resultado.errores.push({ fila: filaNum, motivo: `Error al actualizar contrato: ${cErr.message}` });
            } else {
              resultado.contratosActualizados++;
            }
          } else {
            const { error: cErr2 } = await supabaseAdmin
              .from("contratos")
              .insert({
                propiedad_id: propiedadId,
                arrendatario_id: arrendatarioId,
                fecha_inicio: fechaInicio,
                fecha_termino: fechaTermino || null,
                valor_arriendo: valorArriendo,
                garantia_meses: garantiaMeses,
                dia_vencimiento: diaVencimiento,
                comision_porcentaje: comisionPorcentaje,
                estado: "VIGENTE",
              });
            if (cErr2) {
              resultado.errores.push({ fila: filaNum, motivo: `Error al crear contrato: ${cErr2.message}` });
            } else {
              resultado.contratosCreados++;
            }
          }
        }
      }

      // Cuentas de servicios
      const numeroCliente = normalizarTexto(fila.NUMERO_CLIENTE || fila.CUENTA_SERVICIO);
      if (numeroCliente && propiedadId) {
        const tipoServicio = normalizarTexto(fila.TIPO_SERVICIO) || "AGUA";
        const empresa = normalizarTexto(fila.EMPRESA) || "SIN_ESPECIFICAR";
        const tipoValido = ["AGUA", "ELECTRICIDAD", "GAS", "GASTOS_COMUNES", "INTERNET", "OTRO"].includes(tipoServicio.toUpperCase()) ? tipoServicio.toUpperCase() : "OTRO";

        const { data: csExist } = await supabaseAdmin
          .from("cuentas_servicios")
          .select("id")
          .eq("propiedad_id", propiedadId)
          .eq("numero_cliente", numeroCliente)
          .limit(1)
          .maybeSingle();

        if (csExist?.id) {
          await supabaseAdmin
            .from("cuentas_servicios")
            .update({ tipo_servicio: tipoValido, empresa, activo: true })
            .eq("id", csExist.id);
          resultado.cuentasServiciosActualizadas++;
        } else {
          const { error: csErr } = await supabaseAdmin
            .from("cuentas_servicios")
            .insert({
              propiedad_id: propiedadId,
              tipo_servicio: tipoValido,
              empresa,
              numero_cliente: numeroCliente,
              activo: true,
            });
          if (csErr) {
            resultado.errores.push({ fila: filaNum, motivo: `Error al crear cuenta de servicio: ${csErr.message}` });
          } else {
            resultado.cuentasServiciosCreadas++;
          }
        }
      }
    }

    if (resultado.errores.length > 0) {
      resultado.ok = false;
      resultado.mensaje = "Importación finalizada con errores";
    }

    return resultado;
  } catch (e: any) {
    return {
      ok: false,
      mensaje: e?.message || "Error en la importación",
      propietariosCreados: 0,
      propietariosActualizados: 0,
      propiedadesCreadas: 0,
      propiedadesActualizadas: 0,
      arrendatariosCreados: 0,
      arrendatariosActualizados: 0,
      contratosCreados: 0,
      contratosActualizados: 0,
      cuentasServiciosCreadas: 0,
      cuentasServiciosActualizadas: 0,
      errores: [{ fila: 0, motivo: e?.message || "Error desconocido" }],
      advertencias: [],
    };
  }
}
