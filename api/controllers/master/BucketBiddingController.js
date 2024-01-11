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
   find: async function(req, res) {
    const {
        query: { sdate, ndate }
      } = req;
      await DB.poolConnect;
      try {
        const request = DB.pool.request();
        let filterBetween = ``;
        if(sdate && ndate){
          filterBetween = `AND valid_from = '${sdate}' AND valid_until = '${ndate}'`;
        }
  
        let queryDataTable = `SELECT bucket_bidding_id,kode,nama,email,ring,jenis_kendaraan,rute,harga,valid_from,
        valid_until,qty_pemakaian FROM bucket_bidding WHERE 1=1 ${filterBetween} ORDER BY createdate DESC`;
  
        request.query(queryDataTable, async (err, result) => {
          if (err) {
            return res.error(err);
          }
  
          let rows = result.recordset
  
          return res.send(rows);
  
        });
  
  
      } catch (error) {
        console.log(error);
        return res.error(error)
      }
   },
 
   
 };
 