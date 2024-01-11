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
 
   // DELETE RESOURCE
   cekharga: async function(req, res) {
     const { m_produk_id,kode_channel } = req.body;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const sql = `SELECT * FROM r_harga_satuan_terkecil WHERE m_produk_id='${m_produk_id}' AND kode_channel='${kode_channel}' ORDER BY created DESC`;
 
       request.query(sql,async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         let datanya = result.recordset;

         return res.success({
           data: datanya,
           message: "Data harga"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   }
 };
 