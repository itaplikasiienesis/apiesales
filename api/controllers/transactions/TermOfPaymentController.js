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
      query: { currentPage, pageSize,m_user_id }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";


      let getRolesUser = `SELECT mr.nama AS role FROM m_user mu
      LEFT JOIN m_role mr ON(mr.m_role_id = mu.role_default_id)
      WHERE mu.m_user_id='${m_user_id}'`;
      let datarole = await request.query(getRolesUser);
      let role = datarole.recordset[0].role;
      let getKodePajak = '';
      if(role=='ACCOUNTING'){
        getKodePajak = `SELECT mp.*,ro.nama FROM m_pajak mp
        LEFT JOIN r_organisasi ro ON(mp.r_organisasi_id = ro.r_organisasi_id) 
        ORDER BY mp.kode`;
      }else if(role=='DISTRIBUTOR'){

        getKodePajak = `SELECT mp.*,ro.nama FROM m_user mu,m_pajak mp
        LEFT JOIN r_organisasi ro ON(mp.r_organisasi_id = ro.r_organisasi_id) 
        WHERE mu.m_user_id = '${m_user_id}'
        AND mp.r_organisasi_id = mu.r_organisasi_id
        ORDER BY mp.kode`;

      }else{

        getKodePajak = `SELECT mp.*,ro.nama FROM m_user mu,
        m_user_organisasi muo,m_pajak mp
        LEFT JOIN r_organisasi ro ON(mp.r_organisasi_id = ro.r_organisasi_id) 
        WHERE mu.m_user_id = muo.m_user_id
        AND mu.m_user_id='${m_user_id}'
        AND mp.r_organisasi_id = muo.r_organisasi_id
        ORDER BY mp.kode`;

      }


      let orgs = await request.query(getKodePajak);
      let organization = orgs.recordset.map(function (item) {
        return item['kode'];
      });

      let valueIN = ""
      let listOrg = ""
      for (const datas of organization) {
        valueIN += ",'" + datas + "'"
      }

      valueIN = valueIN.substring(1)
      listOrg = organization.length > 0 && req.query.filter === undefined ? `AND tr.kode IN (${valueIN})` : "";


      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM term_of_payment tr WHERE 1=1 ${whereClause} ${listOrg}`;

      let queryDataTable = `SELECT tr.*,rt.payment_date,rt.potongan_billing
                            FROM term_of_payment tr
                            LEFT JOIN request_top rt ON(tr.term_of_payment_id = rt.term_of_payment_id) 
                            WHERE 1=1 ${whereClause} ${listOrg}
                            ORDER BY tr.created DESC
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

      let queryDataTable = `SELECT tr.*,rt.payment_date,rt.potongan_billing
      FROM term_of_payment tr
      LEFT JOIN request_top rt ON(tr.term_of_payment_id = rt.term_of_payment_id) WHERE tr.term_of_payment_id='${req.param(
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
    const { m_user_id,kode,nomor_billing,nomor_do,nominal, due_date, status} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `INSERT INTO term_of_payment
                    (term_of_payment_id,createdby, updatedby,kode,nomor_billing,nomor_do,nominal,due_date,status)
                   VALUES (
                    '${uuid()}',
                    '${m_user_id}',
                    '${m_user_id}',
                    '${kode}',
                    '${nomor_billing}',
                    '${nomor_do}',
                    ${nominal},
                    '${due_date}',
                    '${status}'
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
  requestTop: async function(req, res) {
    const { m_user_id,term_of_payment_id, payment_date, potongan_billing} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `INSERT INTO request_top
      (request_top_id,createdby, updatedby, term_of_payment_id, 
      payment_date, potongan_billing)
      VALUES('${uuid()}',
      '${m_user_id}',
      '${m_user_id}', 
      '${term_of_payment_id}', 
      '${payment_date}', 
      ${potongan_billing})`;

      request.query(sql,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let updateStatusTermOfPayment = `UPDATE term_of_payment SET status='Request TOP',kode_status='R' WHERE term_of_payment_id = '${term_of_payment_id}'`;
        await request.query(updateStatusTermOfPayment);

        let SqlGetdata =  `SELECT tr.*,rt.payment_date,rt.potongan_billing
        FROM term_of_payment tr
        LEFT JOIN request_top rt ON(tr.term_of_payment_id = rt.term_of_payment_id) WHERE tr.term_of_payment_id = '${term_of_payment_id}'`;
        let dataupdate = await request.query(SqlGetdata);

        return res.success({
          data: dataupdate.recordset[0],
          message: "Request term of payment successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  calculation: async function(req, res) {
    const {nominal, range} = req.body;
    try {
        
        let value  = (0.5 * range * nominal / 100) / 30;
        console.log(value);
        
        return res.success({
          result: value,
          message: "Calculation successfully"
        });
    } catch (err) {
      return res.error(err);
    }
  },

  // UPDATE RESOURCE
  update: async function(req, res) {
    const { m_user_id,id,kode,nama} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE term_of_payment SET updatedby = '${m_user_id}',
                    kode = '${kode}',
                    nama = '${nama}'
                   WHERE r_jenis_organisasi_id='${id}'`;

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
      const sql = `DELETE FROM term_of_payment WHERE term_of_payment_id='${id}'`;

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
