/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");

module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: { currentPage, pageSize }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM m_pajak ${whereClause}`;

      let queryDataTable = `SELECT * FROM m_pajak ${whereClause}
                            ORDER BY created desc
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);
        /**
         * {
         *    result : data utama,
         *    meta : data tambahan ( optional ),
         *    status : status response ( optional),
         *    message : pesan ( optional )
         * }
         */
        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // GET ONE RESOURCE
  findOne: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT * FROM m_pajak WHERE m_pajak_id='${req.param(
        "id"
      )}'`;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];
        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // CREATE NEW RESOURCE
  new: async function(req, res) {
    const { m_user_id,kode,nama} = req.body;

    await DB.poolConnect;
    try {

      let jenisorganisasi = await request.query(`SELECT r_jenis_organisasi_id from r_jenis_organisasi WHERE kode='PJK'`);  
      let r_jenis_organisasi_id = jenisorganisasi.rows[0].r_jenis_organisasi_id;
      let r_organisasi_id = uuid()

      const request = DB.pool.request();
      const sql = `INSERT INTO r_organisasi_id
                    ( r_organisasi_id,r_jenis_organisasi_id,createdby, updatedby,kode,nama )
                   VALUES (
                    '${r_organisasi_id}',
                    '${r_jenis_organisasi_id}',
                    '${m_user_id}',
                    '${m_user_id}',
                    '${kode}',
                    '${nama}'
                  )`;

      request.query(sql, (err) => {
        if (err) {
          return res.error(err);
        }

        request.query(`INSERT INTO m_pajak
                       (createdby,updatedby, r_organisasi_id, kode)
                       VALUES('${m_user_id}','${m_user_id}', '${r_organisasi_id}', '${kode}')`, (err, result) => {
            if (err) {
              return res.error(err);
            }

            return res.success({
                data: result,
                message: "Insert data successfully"
              });

        })


      });
    } catch (err) {
      return res.error(err);
    }
  },  // DELETE RESOURCE
  delete: async function(req, res) {
    const { id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM m_pajak WHERE m_pajak_id='${id}'`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        return res.success({
          data: result,
          message: "Delete data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
};
