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
                              FROM fkr_detail_eksekusi ${whereClause}`;

      console.log(queryCountTable);

      let queryDataTable = `SELECT * FROM fkr_detail_eksekusi ${whereClause}
                            ORDER BY created desc
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;

      console.log(queryDataTable);

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

      let queryDataTable = `SELECT * FROM fkr_detail_eksekusi WHERE fkr_detail_eksekusi_id='${req.param(
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
  klasifikasi: async function(req, res) {
    const {m_user_id,fkr_detail_id,klasifikasi} = req.body;

    await DB.poolConnect;
    try {

      const request = DB.pool.request();

      let sqlDelete = `DELETE FROM fkr_detail_eksekusi WHERE fkr_detail_id = '${fkr_detail_id}'`;
      await request.query(sqlDelete); 

      for (let i = 0; i < klasifikasi.length; i++) {
        
        let fkr_detail_eksekusi_id = uuid();
        let line = i + 1;
        let quantity = klasifikasi[i].quantity;
        let eksekusi = klasifikasi[i].eksekusi;

        let sqlInsertKlasifikasi = `INSERT INTO fkr_detail_eksekusi
        (fkr_detail_eksekusi_id,createdby, updatedby, line, fkr_detail_id, total_retur, eksekusi)
        VALUES('${fkr_detail_eksekusi_id}','${m_user_id}', '${m_user_id}', ${line}, '${fkr_detail_id}', 
        ${quantity}, '${eksekusi}')`;

        await request.query(sqlInsertKlasifikasi); 
        
      }


      let selectKlasifikasi = `SELECT * FROM fkr_detail_eksekusi WHERE fkr_detail_id='${fkr_detail_id}' ORDER BY line`;
      let dataklasidikasi = await request.query(selectKlasifikasi); 
      let resultklasifikasi = dataklasidikasi.recordset;
      
      return res.success({
        result: resultklasifikasi,
        message: "Fetch data successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },
  update: async function(req, res) {
    const {m_user_id,fkr_detail_eksekusi_id,total_retur,eksekusi} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE fkr_detail_eksekusi
      SET updatedby = '${m_user_id}',
      updated=getdate(),
      total_retur = '${total_retur}',
      eksekusi = '${eksekusi}'
      WHERE fkr_detail_eksekusi_id='${fkr_detail_eksekusi_id}'`;

      request.query(sql,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let selectKlasifikasi = `SELECT * FROM fkr_detail_eksekusi WHERE fkr_detail_eksekusi_id='${fkr_detail_eksekusi_id}'`;
        let dataklasidikasi = await request.query(selectKlasifikasi); 
        let resultklasifikasi = dataklasidikasi.recordset;

        return res.success({
          data: resultklasifikasi,
          message: "Update data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  delete: async function(req, res) {
    const { fkr_detail_eksekusi_id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM fkr_detail_eksekusi WHERE fkr_detail_eksekusi_id='${fkr_detail_eksekusi_id}'`;

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
