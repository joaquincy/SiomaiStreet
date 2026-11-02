import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

// Real PostgreSQL SQL execution, with minimal stand-ins for Supabase-owned schemas.
// This cannot verify the hosted Storage API, real Auth tokens, or provider RLS behavior.
export async function uploadDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text);
    alter table storage.objects enable row level security;
  `);
  for (const name of ['20261025000000_reviews_and_franchise_applications.sql', '20261026000000_application_security.sql', '20261027000000_application_corrections.sql', '20261102000000_direct_application_uploads.sql']) {
    const sql = await readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');
    // gen_random_uuid is built into PostgreSQL; this test engine needs no pgcrypto extension.
    await db.exec(sql.replace('create extension if not exists pgcrypto;', ''));
  }
  const identifier = value => {
    if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid test SQL identifier');
    return `"${value}"`;
  };
  // Exercise the production repository adapter against SQL, not an in-memory fake.
  const request = async (path, options = {}) => {
    const url = new URL(path, 'https://synthetic.invalid');
    const body = options.body ? JSON.parse(options.body) : null;
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const entries = Object.entries(body || {});
      const sql = `select public.${identifier(url.pathname.split('/').at(-1))}(${entries.map(([key], i) => `${identifier(key)} => $${i + 1}`).join(',')}) as value`;
      return (await db.query(sql, entries.map(([, value]) => value && typeof value === 'object' ? JSON.stringify(value) : value))).rows[0].value;
    }
    const table = identifier(url.pathname.split('/').at(-1));
    const params = [];
    const filters = [];
    for (const [key, filter] of url.searchParams) {
      if (['select','order','limit'].includes(key)) continue;
      const point = filter.indexOf('.'); const operator = { eq: '=', gt: '>', lt: '<' }[filter.slice(0, point)];
      if (!operator) throw new Error('Unsupported test filter');
      params.push(filter.slice(point + 1)); filters.push(`${identifier(key)} ${operator} $${params.length}`);
    }
    const where = filters.length ? ` where ${filters.join(' and ')}` : '';
    if (options.method === 'DELETE') return (await db.query(`delete from public.${table}${where} returning *`, params)).rows;
    if (options.method === 'PATCH') {
      const set = Object.entries(body).map(([key, value]) => { params.push(value); return `${identifier(key)}=$${params.length}`; }).join(',');
      return (await db.query(`update public.${table} set ${set}${where} returning *`, params)).rows;
    }
    const fields = (url.searchParams.get('select') || '*').split(',').map(field => field === '*' ? '*' : identifier(field)).join(',');
    const order = url.searchParams.get('order')?.split('.');
    const limit = Number(url.searchParams.get('limit') || 100);
    return (await db.query(`select ${fields} from public.${table}${where}${order ? ` order by ${identifier(order[0])} ${order[1] === 'desc' ? 'desc' : 'asc'}` : ''} limit ${limit}`, params)).rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value])));
  };
  return { db, request };
}
