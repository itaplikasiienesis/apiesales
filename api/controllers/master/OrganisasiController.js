/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const { conforms } = require("lodash");

module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: { currentPage, pageSize }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const requestParent = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";
      
      console.log("limit",limit)
      console.log("offset",offset)

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM r_organisasi ${whereClause}`;

      let queryDataTable = `SELECT a.*, b.nama as nama_parent_organisasi,c.nama as nama_jenis_organisasi  FROM r_organisasi a ${whereClause}
                            LEFT JOIN r_organisasi b ON(b.r_organisasi_id = a.parent_org_id)
                            LEFT JOIN r_jenis_organisasi c ON(c.r_jenis_organisasi_id = a.r_jenis_organisasi_id)
                            ORDER BY r_organisasi_id
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          console.log("err 1",err)
          return res.error(err);
        }

        var rows = await result.recordset;
        
          const meta = paginate(currentPage, count, rows, pageSize);

            return res.success({
              result: rows,
              meta,
              message: "Fetch data successfully"
            });
        })

    } catch (err) {
      return res.error(err);
    }
  },

  // GET ONE RESOURCE
  findOne: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT * FROM r_organisasi WHERE r_organisasi_id='${req.param(
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
    const { m_user_id, r_jenis_organisasi_id,nama,kode} = req.body;
    await DB.poolConnect;
    try {
      const id = uuid()
      const request = DB.pool.request();
      const sql = `INSERT INTO r_organisasi
                    (r_organisasi_id,createdby, updatedby,r_jenis_organisasi_id,nama,kode)
                   VALUES (
                    '${id}',
                    '${m_user_id}',
                    '${m_user_id}',
                    '${r_jenis_organisasi_id}',
                    '${nama}',
                    '${kode}'
                  )`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        let queryDataTable = `SELECT * FROM r_organisasi WHERE r_organisasi_id ='${id}'`;
       
        request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }
        
        const row = result.recordset[0];
        return res.success({
          result: row,
          message: "Insert data successfully"
        });
      });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // UPDATE RESOURCE
  update: async function(req, res) {
    const { m_user_id,id,nama} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE r_organisasi SET updatedby = '${m_user_id}',
                    nama = '${nama}'
                   WHERE r_organisasi_id='${id}'`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        return res.success({
          data: result,
          message: "Update data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // DELETE RESOURCE
  delete: async function(req, res) {
    const { id } = req.query;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM r_organisasi WHERE r_organisasi_id='${id}'`;

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
