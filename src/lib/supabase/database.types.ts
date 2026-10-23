export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      arrendatarios: {
        Row: {
          apellidos: string
          creado_en: string
          direccion: string | null
          email: string | null
          estado: string
          id: string
          nombres: string
          rut: string | null
          telefono: string | null
          user_id: string | null
        }
        Insert: {
          apellidos: string
          creado_en?: string
          direccion?: string | null
          email?: string | null
          estado?: string
          id?: string
          nombres: string
          rut?: string | null
          telefono?: string | null
          user_id?: string | null
        }
        Update: {
          apellidos?: string
          creado_en?: string
          direccion?: string | null
          email?: string | null
          estado?: string
          id?: string
          nombres?: string
          rut?: string | null
          telefono?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arrendatarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          accion: string
          entidad: string
          entidad_id: string | null
          fecha: string
          id: string
          ip: string | null
          usuario_id: string | null
          valor_anterior: Json | null
          valor_nuevo: Json | null
        }
        Insert: {
          accion: string
          entidad: string
          entidad_id?: string | null
          fecha?: string
          id?: string
          ip?: string | null
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Update: {
          accion?: string
          entidad?: string
          entidad_id?: string | null
          fecha?: string
          id?: string
          ip?: string | null
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      conciliaciones: {
        Row: {
          creado_en: string
          diferencia: number
          estado: string
          id: string
          monto_aplicado: number
          obligacion_id: string
          observacion: string | null
          pago_id: string
          resuelto_en: string
          resuelto_por: string | null
        }
        Insert: {
          creado_en?: string
          diferencia?: number
          estado?: string
          id?: string
          monto_aplicado?: number
          obligacion_id: string
          observacion?: string | null
          pago_id: string
          resuelto_en?: string
          resuelto_por?: string | null
        }
        Update: {
          creado_en?: string
          diferencia?: number
          estado?: string
          id?: string
          monto_aplicado?: number
          obligacion_id?: string
          observacion?: string | null
          pago_id?: string
          resuelto_en?: string
          resuelto_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conciliaciones_obligacion_id_fkey"
            columns: ["obligacion_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliaciones_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliaciones_resuelto_por_fkey"
            columns: ["resuelto_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          arrendatario_id: string
          comision_porcentaje: number | null
          creado_en: string
          dia_vencimiento: number
          estado: string
          fecha_inicio: string
          fecha_termino: string | null
          garantia_meses: number
          id: string
          propiedad_id: string
          valor_arriendo: number
        }
        Insert: {
          arrendatario_id: string
          comision_porcentaje?: number | null
          creado_en?: string
          dia_vencimiento?: number
          estado?: string
          fecha_inicio: string
          fecha_termino?: string | null
          garantia_meses?: number
          id?: string
          propiedad_id: string
          valor_arriendo: number
        }
        Update: {
          arrendatario_id?: string
          comision_porcentaje?: number | null
          creado_en?: string
          dia_vencimiento?: number
          estado?: string
          fecha_inicio?: string
          fecha_termino?: string | null
          garantia_meses?: number
          id?: string
          propiedad_id?: string
          valor_arriendo?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_arrendatario_id_fkey"
            columns: ["arrendatario_id"]
            isOneToOne: false
            referencedRelation: "arrendatarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_servicios: {
        Row: {
          activo: boolean
          creado_en: string
          empresa: string
          id: string
          monto_mensual: number | null
          numero_cliente: string
          numero_cuenta: string | null
          propiedad_id: string
          tipo_servicio: string
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          empresa: string
          id?: string
          monto_mensual?: number | null
          numero_cliente: string
          numero_cuenta?: string | null
          propiedad_id: string
          tipo_servicio: string
        }
        Update: {
          activo?: boolean
          creado_en?: string
          empresa?: string
          id?: string
          monto_mensual?: number | null
          numero_cliente?: string
          numero_cuenta?: string | null
          propiedad_id?: string
          tipo_servicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_servicios_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          archivo_url: string
          bucket: string
          creado_en: string
          entidad_id: string | null
          entidad_tipo: string
          estado: string
          hash_archivo: string | null
          id: string
          nombre: string
          periodo: string | null
          propiedad_id: string | null
          subido_por: string | null
          tipo_documento: string
        }
        Insert: {
          archivo_url: string
          bucket?: string
          creado_en?: string
          entidad_id?: string | null
          entidad_tipo: string
          estado?: string
          hash_archivo?: string | null
          id?: string
          nombre: string
          periodo?: string | null
          propiedad_id?: string | null
          subido_por?: string | null
          tipo_documento: string
        }
        Update: {
          archivo_url?: string
          bucket?: string
          creado_en?: string
          entidad_id?: string | null
          entidad_tipo?: string
          estado?: string
          hash_archivo?: string | null
          id?: string
          nombre?: string
          periodo?: string | null
          propiedad_id?: string | null
          subido_por?: string | null
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      extracciones_documento: {
        Row: {
          confianza_ocr: number | null
          confirmado_en: string | null
          creado_en: string
          datos_crudos: Json | null
          documento_id: string
          empresa_detectada: string | null
          estado: string
          extraida_en: string | null
          fecha_vencimiento: string | null
          id: string
          monto_detectado: number | null
          numero_cliente: string | null
          objetivo: string | null
          resultado_validacion: string | null
          saldo_detectado: number | null
          solicitado_por: string
        }
        Insert: {
          confianza_ocr?: number | null
          confirmado_en?: string | null
          creado_en?: string
          datos_crudos?: Json | null
          documento_id: string
          empresa_detectada?: string | null
          estado?: string
          extraida_en?: string | null
          fecha_vencimiento?: string | null
          id?: string
          monto_detectado?: number | null
          numero_cliente?: string | null
          objetivo?: string | null
          resultado_validacion?: string | null
          saldo_detectado?: number | null
          solicitado_por: string
        }
        Update: {
          confianza_ocr?: number | null
          confirmado_en?: string | null
          creado_en?: string
          datos_crudos?: Json | null
          documento_id?: string
          empresa_detectada?: string | null
          estado?: string
          extraida_en?: string | null
          fecha_vencimiento?: string | null
          id?: string
          monto_detectado?: number | null
          numero_cliente?: string | null
          objetivo?: string | null
          resultado_validacion?: string | null
          saldo_detectado?: number | null
          solicitado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "extracciones_documento_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracciones_documento_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidacion_items: {
        Row: {
          concepto: string | null
          creado_en: string
          id: string
          liquidacion_id: string
          monto: number
          signo: number
          tipo: string
        }
        Insert: {
          concepto?: string | null
          creado_en?: string
          id?: string
          liquidacion_id: string
          monto?: number
          signo?: number
          tipo: string
        }
        Update: {
          concepto?: string | null
          creado_en?: string
          id?: string
          liquidacion_id?: string
          monto?: number
          signo?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_items_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidaciones: {
        Row: {
          aprobado_en: string | null
          aprobado_por: string | null
          arriendo_bruto: number
          comision: number
          contrato_id: string
          creado_en: string
          estado: string
          gastos: number
          generado_por: string | null
          id: string
          neto: number
          observaciones: string | null
          pdf_url: string | null
          periodo: string
          propietario_id: string
        }
        Insert: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          arriendo_bruto?: number
          comision?: number
          contrato_id: string
          creado_en?: string
          estado?: string
          gastos?: number
          generado_por?: string | null
          id?: string
          neto?: number
          observaciones?: string | null
          pdf_url?: string | null
          periodo: string
          propietario_id: string
        }
        Update: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          arriendo_bruto?: number
          comision?: number
          contrato_id?: string
          creado_en?: string
          estado?: string
          gastos?: number
          generado_por?: string | null
          id?: string
          neto?: number
          observaciones?: string | null
          pdf_url?: string | null
          periodo?: string
          propietario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidaciones_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidaciones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidaciones_generado_por_fkey"
            columns: ["generado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidaciones_propietario_id_fkey"
            columns: ["propietario_id"]
            isOneToOne: false
            referencedRelation: "propietarios"
            referencedColumns: ["id"]
          },
        ]
      }
      obligaciones: {
        Row: {
          contrato_id: string
          creado_en: string
          descripcion: string | null
          estado: string
          fecha_vencimiento: string
          id: string
          monto: number
          monto_pagado: number
          periodo: string | null
          propiedad_id: string | null
          saldo: number | null
          tipo: string
        }
        Insert: {
          contrato_id: string
          creado_en?: string
          descripcion?: string | null
          estado?: string
          fecha_vencimiento: string
          id?: string
          monto: number
          monto_pagado?: number
          periodo?: string | null
          propiedad_id?: string | null
          saldo?: number | null
          tipo?: string
        }
        Update: {
          contrato_id?: string
          creado_en?: string
          descripcion?: string | null
          estado?: string
          fecha_vencimiento?: string
          id?: string
          monto?: number
          monto_pagado?: number
          periodo?: string | null
          propiedad_id?: string | null
          saldo?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligaciones_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          creado_en: string
          documento_id: string | null
          estado_validacion: string
          fecha_pago: string
          id: string
          metodo_pago: string | null
          monto: number
          motivo_rechazo: string | null
          obligacion_id: string
          referencia: string | null
          registrado_por: string | null
        }
        Insert: {
          creado_en?: string
          documento_id?: string | null
          estado_validacion?: string
          fecha_pago?: string
          id?: string
          metodo_pago?: string | null
          monto: number
          motivo_rechazo?: string | null
          obligacion_id: string
          referencia?: string | null
          registrado_por?: string | null
        }
        Update: {
          creado_en?: string
          documento_id?: string | null
          estado_validacion?: string
          fecha_pago?: string
          id?: string
          metodo_pago?: string | null
          monto?: number
          motivo_rechazo?: string | null
          obligacion_id?: string
          referencia?: string | null
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_obligacion_id_fkey"
            columns: ["obligacion_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      propiedades: {
        Row: {
          actualizado_en: string
          banos: number | null
          comuna: string | null
          creado_en: string
          direccion: string
          estacionamientos: number | null
          estado: string
          habitaciones: number | null
          id: string
          nombre: string | null
          propietario_id: string
          region: string | null
          superficie_m2: number | null
          tipo: string
          valor_arriendo: number
        }
        Insert: {
          actualizado_en?: string
          banos?: number | null
          comuna?: string | null
          creado_en?: string
          direccion: string
          estacionamientos?: number | null
          estado?: string
          habitaciones?: number | null
          id?: string
          nombre?: string | null
          propietario_id: string
          region?: string | null
          superficie_m2?: number | null
          tipo?: string
          valor_arriendo?: number
        }
        Update: {
          actualizado_en?: string
          banos?: number | null
          comuna?: string | null
          creado_en?: string
          direccion?: string
          estacionamientos?: number | null
          estado?: string
          habitaciones?: number | null
          id?: string
          nombre?: string | null
          propietario_id?: string
          region?: string | null
          superficie_m2?: number | null
          tipo?: string
          valor_arriendo?: number
        }
        Relationships: [
          {
            foreignKeyName: "propiedades_propietario_id_fkey"
            columns: ["propietario_id"]
            isOneToOne: false
            referencedRelation: "propietarios"
            referencedColumns: ["id"]
          },
        ]
      }
      propietarios: {
        Row: {
          apellidos: string
          creado_en: string
          direccion: string | null
          email: string | null
          estado: string
          id: string
          nombres: string
          rut: string | null
          telefono: string | null
          user_id: string | null
        }
        Insert: {
          apellidos: string
          creado_en?: string
          direccion?: string | null
          email?: string | null
          estado?: string
          id?: string
          nombres: string
          rut?: string | null
          telefono?: string | null
          user_id?: string | null
        }
        Update: {
          apellidos?: string
          creado_en?: string
          direccion?: string | null
          email?: string | null
          estado?: string
          id?: string
          nombres?: string
          rut?: string | null
          telefono?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propietarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          actualizado_en: string
          apellidos: string | null
          creado_en: string
          email: string
          id: string
          nombres: string | null
          rol: string
          telefono: string | null
        }
        Insert: {
          actualizado_en?: string
          apellidos?: string | null
          creado_en?: string
          email: string
          id: string
          nombres?: string | null
          rol?: string
          telefono?: string | null
        }
        Update: {
          actualizado_en?: string
          apellidos?: string | null
          creado_en?: string
          email?: string
          id?: string
          nombres?: string | null
          rol?: string
          telefono?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirmar_extraccion_ocr: {
        Args: { p_extraccion_id: string }
        Returns: Json
      }
      es_administrador: { Args: never; Returns: boolean }
      es_arrendatario: { Args: never; Returns: boolean }
      es_arrendatario_de: { Args: { contratos_id: string }; Returns: boolean }
      es_arrendatario_entidad: {
        Args: { entidad_id: string; entidad_tipo: string }
        Returns: boolean
      }
      es_ejecutivo: { Args: never; Returns: boolean }
      es_propietario_de: { Args: { propiedad_id: string }; Returns: boolean }
      es_propietario_de_liquidacion: {
        Args: { propietario_id: string }
        Returns: boolean
      }
      es_propietario_entidad: {
        Args: { entidad_id: string; entidad_tipo: string }
        Returns: boolean
      }
      es_staff: { Args: never; Returns: boolean }
      generar_obligaciones_periodo: {
        Args: { p_periodo: string }
        Returns: Json
      }
      marcar_obligaciones_vencidas: {
        Args: { p_hoy?: string }
        Returns: number
      }
      rol_usuario_jwt: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
