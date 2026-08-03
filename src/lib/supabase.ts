/**
 * REST adapter replacing @supabase/supabase-js.
 * All database operations route through master-backend at http://localhost:5001/api.
 * This module intentionally has NO dependency on @supabase/supabase-js.
 */
import { storeApi } from '@/lib/apiClient';

export const supabaseEnabled = true;

/** Fluent query builder returned by supabase.from(tableName) */
function makeBuilder(tableName: string): any {
  const filters: Record<string, any> = {};
  let orderConfig: string | null = null;

  const builder: any = {
    // ---- SELECT / FILTER ---------------------------------------------------

    select(_fields?: string) {
      return builder;
    },

    eq(column: string, value: any) {
      filters[column] = value;
      return builder;
    },

    neq(column: string, value: any) {
      filters[`neq__${column}`] = value;
      return builder;
    },

    in(column: string, values: any[]) {
      filters[`in__${column}`] = Array.isArray(values) ? values.join(',') : values;
      return builder;
    },

    not(_column: string, _op: string, _value: any) {
      return builder;
    },

    is(_column: string, _value: any) {
      return builder;
    },

    or(_expr: string) {
      return builder;
    },

    ilike(column: string, pattern: string) {
      filters[`ilike__${column}`] = pattern;
      return builder;
    },

    match(obj: Record<string, any>) {
      Object.assign(filters, obj);
      return builder;
    },

    limit(n: number) {
      filters['_limit'] = n;
      return builder;
    },

    range(from: number, to: number) {
      filters['_range'] = `${from},${to}`;
      return builder;
    },

    gte(column: string, value: any) {
      filters[`gte__${column}`] = value;
      return builder;
    },

    lte(column: string, value: any) {
      filters[`lte__${column}`] = value;
      return builder;
    },

    gt(column: string, value: any) {
      filters[`gt__${column}`] = value;
      return builder;
    },

    lt(column: string, value: any) {
      filters[`lt__${column}`] = value;
      return builder;
    },

    // ---- ORDER -------------------------------------------------------------

    order(field: string, opts?: { ascending?: boolean }) {
      orderConfig = `${field}.${opts?.ascending === false ? 'desc' : 'asc'}`;
      return builder;
    },

    // ---- TERMINAL: single & maybeSingle ------------------------------------

    single() {
      return builder.then((res: any) => {
        if (res.error) return res;
        const firstRow = Array.isArray(res.data) ? res.data[0] ?? null : res.data;
        return { data: firstRow, error: null };
      });
    },

    maybeSingle() {
      return builder.then((res: any) => {
        if (res.error) return res;
        const firstRow = Array.isArray(res.data) ? res.data[0] ?? null : res.data;
        return { data: firstRow, error: null };
      });
    },

    // ---- TERMINAL: insert --------------------------------------------------

    insert(rows: any | any[]) {
      const insertPromise = storeApi.insert(tableName, rows);

      const insertBuilder: any = {
        select(_fields?: string) {
          return {
            single() {
              return insertPromise.then((data: any) => {
                const firstRow = Array.isArray(data) ? data[0] ?? null : data;
                return { data: firstRow, error: null };
              }).catch((error: any) => ({ data: null, error }));
            },
            maybeSingle() {
              return insertPromise.then((data: any) => {
                const firstRow = Array.isArray(data) ? data[0] ?? null : data;
                return { data: firstRow, error: null };
              }).catch((error: any) => ({ data: null, error }));
            },
            then(resolve: any, reject?: any) {
              return insertPromise.then((data: any) => {
                const res = { data: Array.isArray(data) ? data : [data], error: null };
                return resolve ? resolve(res) : res;
              }).catch((error: any) => {
                const res = { data: null, error };
                return resolve ? resolve(res) : (reject ? reject(error) : res);
              });
            },
          };
        },
        then(resolve: any, reject?: any) {
          return insertPromise.then((data: any) => {
            const res = { data, error: null };
            return resolve ? resolve(res) : res;
          }).catch((error: any) => {
            const res = { data: null, error };
            return resolve ? resolve(res) : (reject ? reject(error) : res);
          });
        },
        catch(reject: any) {
          return insertBuilder.then(undefined, reject);
        },
      };

      return insertBuilder;
    },

    // ---- TERMINAL: upsert --------------------------------------------------

    upsert(rows: any | any[], _opts?: any) {
      const upsertPromise = (async () => {
        const rowList = Array.isArray(rows) ? rows : [rows];
        const results = [];
        for (const row of rowList) {
          if (row.id) {
            const { id, ...data } = row;
            const res = await storeApi.update(tableName, id, data);
            results.push(res);
          } else {
            const res = await storeApi.insert(tableName, row);
            results.push(res);
          }
        }
        return Array.isArray(rows) ? results : (results[0] ?? null);
      })();

      const upsertBuilder: any = {
        select(_fields?: string) {
          return {
            single() {
              return upsertPromise.then((data: any) => {
                const firstRow = Array.isArray(data) ? data[0] ?? null : data;
                return { data: firstRow, error: null };
              }).catch((error: any) => ({ data: null, error }));
            },
            maybeSingle() {
              return upsertPromise.then((data: any) => {
                const firstRow = Array.isArray(data) ? data[0] ?? null : data;
                return { data: firstRow, error: null };
              }).catch((error: any) => ({ data: null, error }));
            },
            then(resolve: any, reject?: any) {
              return upsertPromise.then((data: any) => {
                const res = { data: Array.isArray(data) ? data : [data], error: null };
                return resolve ? resolve(res) : res;
              }).catch((error: any) => {
                const res = { data: null, error };
                return resolve ? resolve(res) : (reject ? reject(error) : res);
              });
            },
          };
        },
        then(resolve: any, reject?: any) {
          return upsertPromise.then((data: any) => {
            const res = { data, error: null };
            return resolve ? resolve(res) : res;
          }).catch((error: any) => {
            const res = { data: null, error };
            return resolve ? resolve(res) : (reject ? reject(error) : res);
          });
        },
        catch(reject: any) {
          return upsertBuilder.then(undefined, reject);
        },
      };

      return upsertBuilder;
    },

    // ---- TERMINAL: update --------------------------------------------------

    update(updateData: any) {
      const updateFilters: Record<string, any> = {};

      const updateBuilder: any = {
        eq(column: string, value: any) {
          updateFilters[column] = value;
          return updateBuilder;
        },
        neq(column: string, value: any) {
          updateFilters[`neq__${column}`] = value;
          return updateBuilder;
        },
        in(column: string, values: any[]) {
          updateFilters[`in__${column}`] = Array.isArray(values) ? values.join(',') : values;
          return updateBuilder;
        },
        match(obj: Record<string, any>) {
          Object.assign(updateFilters, obj);
          return updateBuilder;
        },
        not() { return updateBuilder; },
        is() { return updateBuilder; },
        select(_fields?: string) { return updateBuilder; },

        then(resolve: any, reject?: any) {
          const keys = Object.keys(updateFilters);
          let updatePromise: Promise<any>;

          if (keys.length === 1 && keys[0] === 'id') {
            updatePromise = storeApi.update(tableName, updateFilters.id, updateData);
          } else {
            updatePromise = storeApi.updateWhere(tableName, updateFilters, updateData);
          }

          return updatePromise
            .then((data: any) => {
              const res = { data, error: null };
              return resolve ? resolve(res) : res;
            })
            .catch((error: any) => {
              const res = { data: null, error };
              return resolve ? resolve(res) : reject ? reject(error) : res;
            });
        },

        catch(reject: any) {
          return updateBuilder.then(undefined, reject);
        },
      };

      return updateBuilder;
    },

    // ---- TERMINAL: delete --------------------------------------------------

    delete() {
      const deleteFilters: Record<string, any> = {};

      const deleteBuilder: any = {
        eq(column: string, value: any) {
          deleteFilters[column] = value;
          return deleteBuilder;
        },
        neq(column: string, value: any) {
          deleteFilters[`neq__${column}`] = value;
          return deleteBuilder;
        },
        in(column: string, values: any[]) {
          deleteFilters[`in__${column}`] = Array.isArray(values) ? values.join(',') : values;
          return deleteBuilder;
        },
        match(obj: Record<string, any>) {
          Object.assign(deleteFilters, obj);
          return deleteBuilder;
        },
        not() { return deleteBuilder; },
        is() { return deleteBuilder; },

        then(resolve: any, reject?: any) {
          const keys = Object.keys(deleteFilters);
          let deletePromise: Promise<any>;

          if (keys.length === 1 && keys[0] === 'id') {
            deletePromise = storeApi.delete(tableName, deleteFilters.id);
          } else {
            deletePromise = (async () => {
              const existingRows = await storeApi.fetch(tableName, deleteFilters);
              if (Array.isArray(existingRows)) {
                for (const row of existingRows) {
                  if (row.id) {
                    await storeApi.delete(tableName, row.id);
                  }
                }
              }
              return { success: true };
            })();
          }

          return deletePromise
            .then((data: any) => {
              const res = { data, error: null };
              return resolve ? resolve(res) : res;
            })
            .catch((error: any) => {
              const res = { data: null, error };
              return resolve ? resolve(res) : reject ? reject(error) : res;
            });
        },

        catch(reject: any) {
          return deleteBuilder.then(undefined, reject);
        },
      };

      return deleteBuilder;
    },

    // ---- Promise protocol --------------------------------------------------

    then(resolve: any, reject?: any) {
      const params: Record<string, any> = { ...filters };
      if (orderConfig) params.order = orderConfig;

      return storeApi
        .fetch(tableName, params)
        .then((data: any) => {
          const res: { data: any; error: null } = { data, error: null };
          return resolve ? resolve(res) : res;
        })
        .catch((error: any) => {
          const res: { data: null; error: any } = { data: null, error };
          return resolve ? resolve(res) : reject ? reject(error) : res;
        });
    },

    catch(reject: any) {
      return builder.then(undefined, reject);
    },
  };

  return builder;
}

// ---------------------------------------------------------------------------

export const supabase: any = {
  from(tableName: string) {
    return makeBuilder(tableName);
  },

  storage: {
    from(_bucket: string) {
      return {
        async upload(path: string, _file: any) {
          return { data: { path }, error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `/uploads/${path}` } };
        },
      };
    },
  },
};
