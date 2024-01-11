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

      let queryCountTable = `SELECT COUNT(1) AS total_rows FROM m_transporter_v a
                            ${whereClause}
                            group by a.m_transporter_id,a.nama
                            ORDER BY a.nama `;

      let queryDataTable = `SELECT a.m_transporter_id,a.nama FROM m_transporter_v a
                            ${whereClause}
                            group by a.m_transporter_id,a.nama
                            ORDER BY a.nama `;
      // console.log(queryDataTable);
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

      let queryDataTable = `SELECT * FROM m_transporter_v WHERE m_transporter_id='${req.param(
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


  checkTransporter: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT COUNT(1) AS jumlah FROM m_transporter_v WHERE kode='${req.param(
        "id"
      )}'`;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset;

        if(row.length > 0){
          if(row[0].jumlah > 0){
            return res.success({
              data: true,
              message: "Fetch data successfully"
            });
          }else{
            return res.success({
              data: false,
              message: "Fetch data successfully"
            });
          }
        }else{
          return res.success({
            data: false,
            message: "Fetch data successfully"
          });
        }   
      });
    } catch (err) {
      return res.error(err);
    }
  },
  // CREATE NEW RESOURCE
  // DELETE RESOURCE
  delete: async function(req, res) {
    const { id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM m_transporter WHERE m_transporter_id='${id}'`;

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
  },

  create: async function(req, res) {
    const { id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();


      

      return res.success({
        message: "Delete data successfully"
      });
    } catch (err) {
      return res.error(err);
    }
  }
};
