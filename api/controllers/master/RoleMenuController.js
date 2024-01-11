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
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM m_role_menu ${whereClause}`;

      let queryDataTable = `SELECT a.*, b.nama as nama_role , c.nama as nama_menu FROM m_role_menu a ${whereClause}
                            LEFT JOIN m_role b ON(b.m_role_id = a.m_role_id)
                            LEFT JOIN m_menu c ON(c.m_menu_id = a.m_menu_id)
                            ORDER BY m_role_menu_id
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

  // GET ONE RESOURCE
  findOne: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT * FROM m_role_menu WHERE m_role_menu_id='${req.param(
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
    const { m_user_id, m_menu_id,m_role_id} = req.body;

    await DB.poolConnect;
    try {
      const id = uuid()
      const request = DB.pool.request();
      const sql = `INSERT INTO m_role_menu
                    (m_role_menu_id,createdby, updatedby,m_menu_id,m_role_id)
                   VALUES (
                    '${id}',
                    '${m_user_id}',
                    '${m_user_id}',
                    '${m_menu_id}',
                    '${m_role_id}'
                  )`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        
        let queryDataTable = `SELECT * FROM m_role_menu WHERE m_role_menu_id ='${id}'`;
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
    const { m_user_id,id, m_menu_id,m_role_id} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE m_role_menu SET updatedby = '${m_user_id}',
                   m_menu_id = '${m_menu_id}',
                   m_role_id = '${m_role_id}'
                   WHERE m_role_menu_id='${id}'`;

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
      const sql = `DELETE FROM m_role_menu WHERE m_role_menu_id='${id}'`;

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
