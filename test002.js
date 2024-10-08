const config = require('config');
const { Pool, Query } = require('pg');

// config constants
const host = config.get('host');
const port = config.get('port');
const dbUSer = config.get('dbUser');
const dbPassword = config.get('dbPassword');
const relations = config.get('relations');

let pools = {};

for (relation of relations) {
  const [database, schema, view] = relation.split('::');
  if (!pools[database]) {
    pools[database] = new Pool({
      host: host,
      user: dbUSer,
      port: port,
      password: dbPassword,
      database: database,
    });
  }
  pools[database].connect(async (err, client) => {
    if (err) throw err;
    //Getting the list of columns, then adjust it
    let sql = `SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${view}' ORDER BY ordinal_position`;
    let cols = await client.query(sql);
    cols = cols.rows.map(r => r.column_name).filter(r => r !== 'geom'); //choose "rows", then its colum_names are listed, and geom is removed.
    //we will add filter if needed
    cols.push(`ST_AsGeoJSON(${schema}.${view}.geom)`);
    // console.log(`columns used: ${cols}`);
    // Then, we will get feature record.
    await client.query('BEGIN');
    sql = `SELECT ${cols.toString()} FROM ${schema}.${view}`;
    cols = await client.query(sql);
    console.log(cols.rows);
    await client.query('COMMIT');
    await client.end();
  });
}
