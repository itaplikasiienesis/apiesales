/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const axios = require("axios");
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
                              FROM r_distribution_channel ${whereClause}`;

      let queryDataTable = `SELECT * FROM r_distribution_channel ${whereClause}
                            ORDER BY r_kendaraan_id
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

      let queryDataTable = `SELECT * FROM r_distribution_channel WHERE r_distribution_channel_id='${req.param(
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

    // GET ONE RESOURCE
  findOneByKode: async function(req, res) {
      await DB.poolConnect;
      try {
        const request = DB.pool.request();
  
        let queryDataTable = `SELECT * FROM r_distribution_channel WHERE kode='${req.param(
          "id"
        )}'`;

        console.log(queryDataTable);
  
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
    const { m_user_id, kode,nama,deskripsi} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `INSERT INTO r_distribution_channel
                    ( r_distribution_channel_id,createdby, 
                    updatedby, kode,nama,deskripsi )
                   VALUES (
                    '${uuid()}',
                    '${m_user_id}',
                    '${m_user_id}',
                    '${kode}',
                    '${nama}',
                    '${deskripsi}'
                  )`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }

        return res.success({
          data: result,
          message: "Insert data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // UPDATE RESOURCE
  update: async function(req, res) {
    const { m_user_id,id,kode,nama,deskripsi} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE r_distribution_channel SET updatedby = '${m_user_id}',
                    nama = '${nama}',
                    kode = '${kode}',
                    deskripsi = '${deskripsi}'
                   WHERE r_kendaraan_id='${id}'`;

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
    const { id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM r_distribution_channel WHERE r_distribution_channel_id='${id}'`;

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

