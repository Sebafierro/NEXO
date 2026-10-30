#!/usr/bin/env node
/**
 * Script de importación CSV -> modelo NEXO (M1-M4)
 * Requiere: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (o sesión)
 * Uso: node scripts/importar-datos-csv.mjs --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');

function parseCLP(s) {
  if (s === undefined || s === null) return null;
  let v = String(s).trim();
  if (!v || v === '-' || v === '') return null;
  v = v.replace(/\$/g, '').replace(/\s/g, '');
  v = v.replace(/\./g, ''); // thousand sep
  // handle comma decimal if any
  v = v.replace(/,/g, '.');
  const num = Number(v);
  return isNaN(num) ? null : num;
}

function parseDate(s) {
  if (!s) return null;
  const v = String(s).trim();
  if (!v) return null;
  // dd.mm.yyyy
  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2,'0'), mm = m[2].padStart(2,'0'), yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return v;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log('[CSV-IMPORT] dryRun=', dryRun);
  
  const files = ['data-1.csv','data-2.csv','data-3.csv'];
  for (const f of files) {
    const p = path.join(DATA_DIR, f);
    console.log(`\n=== ${f} ===`);
    if (!fs.existsSync(p)) {
      console.log('NO EXISTE');
      continue;
    }
    const content = fs.readFileSync(p, 'utf8');
    const records = parse(content, { skip_empty_lines: false });
    console.log('filas:', records.length);
    // mostrar resumen
    if (f === 'data-1.csv') {
      records.slice(0,6).forEach((r,i)=>console.log(`D1[${i}]:`, r.join(' | ')));
    } else if (f === 'data-2.csv') {
      records.forEach((r,i)=>console.log(`D2[${i}]:`, r.join(' | ')));
    } else if (f === 'data-3.csv') {
      // key
      records.forEach((r,i)=>{
        if (r.some(c=>String(c).includes('CRISTIAN')||String(c).includes('GRACIELA')||String(c).includes('LIQUIDACIÓN')||String(c).includes('AVENIDA')||String(c).includes('ALEDEA'))) {
          console.log(`D3[${i}]:`, r.join(' | '));
        }
      });
    }
  }
  
  console.log('\n[CSV-IMPORT] Análisis completo. Para importar realmente se requiere configuración Supabase (service_role).');
  console.log('[CSV-IMPORT] Ver docs/importacion_csv/INFORME_IMPORTACION_CSV.md');
}

main();
