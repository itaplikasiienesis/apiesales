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
const axios = require('axios');
const FormData = require('form-data');
module.exports = {
  // GET ALL RESOURCE
  find: async function (req, res) {
    const { query: { currentPage, pageSize } } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM c_invoice_biaya_lain ${whereClause}`;

      let queryDataTable = `SELECT * FROM c_invoice_biaya_lain
                            ORDER BY c_invoice_biaya_lain_id
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

  findByInvoiceId: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT * FROM c_invoice_biaya_lain WHERE c_invoice_id='${req.param(
        "id"
      )}'`;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset;

        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  new: async function (req, res) {
    const { c_invoice_id, m_user_id, keterangan, nominal } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `INSERT INTO c_invoice_biaya_lain ( createdby, updatedby,c_invoice_id, keterangan, nominal ) VALUES ('${m_user_id}','${m_user_id}','${c_invoice_id}','${keterangan}','${nominal}')`;
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
  update: async function (req, res) {
    const { m_user_id, id, keterangan, nominal } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE c_invoice_biaya_lain SET updatedby = '${m_user_id}',
                    nominal = '${nominal}',
                    keterangan = '${keterangan}'
                   WHERE c_invoice_biaya_lain_id='${id}'`;

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
  delete: async function (req, res) {
    const { id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM c_invoice_biaya_lain WHERE c_invoice_biaya_lain_id='${id}'`;

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
