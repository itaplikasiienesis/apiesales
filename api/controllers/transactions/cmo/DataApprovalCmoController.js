/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const otpGenerator = require('otp-generator');
const bcrypt = require('bcryptjs');


module.exports = {
  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: {currentPage, pageSize,searchText}
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);


      let whereKodeShipto = ``;

      if(searchText){
        whereKodeShipto = `AND ro.kode = '${searchText}'`;
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows FROM data_approval_cmo dac,m_distributor md,r_organisasi ro  
      WHERE dac.m_distributor_id = md.m_distributor_id 
      AND md.r_organisasi_id = ro.r_organisasi_id
      ${whereKodeShipto}`;

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;


      let queryDataTable = `SELECT dac.*,ro.nama AS nama_shipto,ro.kode AS kode_shipto FROM 
      data_approval_cmo dac,m_distributor md,r_organisasi ro  
      WHERE dac.m_distributor_id = md.m_distributor_id
      AND md.r_organisasi_id = ro.r_organisasi_id
      ${whereKodeShipto}
      ORDER BY dac.created DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY`;

      console.log(queryDataTable);

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

  totalApproval: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let jumlahApproval = 0;     
      return res.success({
        data: jumlahApproval
     });

    } catch (err) {
      return res.error(err);
    }
  }
};



function checkRole(userRoles, roles) {
    const isTrue = userRoles.some((e) => roles.includes(e.nama));
    return isTrue;
}
