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
 
   // GET ONE RESOURCE
   findOne: async function(req, res) {
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let queryDataTable = `SELECT COALESCE(bundle_id,console_number) AS bundle_id FROM delivery_order do WHERE do.nomor_do ='${req.param(
         "id"
       )}' AND isactive='Y'`;
 
       request.query(queryDataTable, (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         const row = result.recordset.length > 0 ? result.recordset[0].bundle_id : null;
         let arrayBundle = [];


         if(row){
            arrayBundle.push({
                result:row
            });
         }


         return res.send(arrayBundle);
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
 };
 