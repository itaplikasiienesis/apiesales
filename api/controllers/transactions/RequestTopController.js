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
                              FROM request_top_v ${whereClause}`;

      let queryDataTable = `SELECT * FROM request_top_v ${whereClause}
                            ORDER BY created DESC
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

      let queryDataTable = `SELECT * FROM request_top_v 
      WHERE request_top_id='${req.param(
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

  prosesTop: async function(req, res) {
    const {m_user_id,request_top_id,action,reason} = req.body;
    
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `SELECT * FROM request_top_v 
      WHERE request_top_id='${request_top_id}'`;


      request.query(sql, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];
        const term_of_payment_id = row.term_of_payment_id;

        let sqlActionTermOfPayment = ``;
        let sqlActionRequestTop = ``;
        if(action=='APPROVE'){
            sqlActionTermOfPayment = `Update term_of_payment SET status='Approved',kode_status='AP',
            updatedby='${m_user_id}',updated=getdate() WHERE term_of_payment_id='${term_of_payment_id}'`;

            sqlActionRequestTop = `Update request_top SET status='Approved',
            updatedby='${m_user_id}',updated=getdate() WHERE request_top_id='${request_top_id}'`;
        }else{
            sqlActionTermOfPayment = `Update term_of_payment SET status='Reject dengan alasan ${reason}',kode_status='AP',
            updatedby='${m_user_id}',updated=getdate() WHERE term_of_payment_id='${term_of_payment_id}'`;

            sqlActionRequestTop = `Update request_top SET status='Reject dengan alasan ${reason}',
            updatedby='${m_user_id}',updated=getdate() WHERE request_top_id='${request_top_id}'`;
        }

        let SqlGetdata =  `SELECT * FROM request_top_v 
        WHERE request_top_id = '${request_top_id}'`;

        await request.query(sqlActionTermOfPayment);
        await request.query(sqlActionRequestTop);

        let dataupdate = await request.query(SqlGetdata);

        return res.success({
          data: dataupdate.recordset[0],
          message: "Process data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
};
