/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * CMOController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

 const xlsx = require('node-xlsx');
 const moment = require('moment');
 const _ = require('lodash');
 const numeral = require('numeral'); 
 module.exports = {
   upload: async function (req, res) {
     res.setTimeout(0);
     //console.log(req.body);
     const {m_user_id} = req.body;
      req.file('excel')
       .upload({
         maxBytes: 150000000
       }, async function whenDone(err, uploadedFiles) {
 
         if (err)
         
         return res.error(err);

         if (uploadedFiles.length === 0) {          
           return res.error([], 'Tidak ada file yang diupload!');
         }
         await DB.poolConnect;
         const request = DB.pool.request();
         const fd = uploadedFiles[0].fd;
         var obj = xlsx.parse(fd);
         const excel = obj[0].data;
         let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
         let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
         let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';


         console.log(statusIntegasi);
         let validation = [];
        for (let i = 1; i < (excel.length); i++) {
            
            let kode_mesin = excel[i][0];
            let kode_detail_mesin = excel[i][1];
            let machine_name = excel[i][2];

            let sqlgetmesin = `SELECT * FROM m_mesin where kode='${kode_mesin}'`;
            let datamesin = await request.query(sqlgetmesin);
            let mesin = datamesin.recordset.length > 0 ? datamesin.recordset[0] : null;

            if(!mesin){
                validation.push(`Kode mesin ${kode_mesin} tidak dikenali `);
            }else{
                let m_mesin_id = mesin.m_mesin_id;

                let cekKode = `SELECT * FROM m_mesin_detail WHERE kode='${kode_detail_mesin}'`;
                let datamesindetail = await request.query(cekKode);
                let mesindetail = datamesindetail.recordset.length > 0 ? datamesindetail.recordset[0] : null;

                if(!mesindetail){

                  let sqlinsertmesin = `INSERT INTO m_mesin_detail
                  (m_mesin_id, kode, nama)
                  VALUES('${m_mesin_id}', '${kode_detail_mesin}', '${machine_name}')`;
                  await request.query(sqlinsertmesin);
                
                }else{
                  console.log('sudah ada');
                }


            }

           
        }

        console.log(validation.length);
        console.log('Error ',validation);
         
 
         res.success({
           message: 'Upload file berhasil'
         });
         return true;
       });
   }
 };
 
 const undefinedCek = (value) => {
   // console.log(value,"ee");
   if (typeof value === 'undefined' || value === "" || value === null || value === NaN) {
     return 0;
   }else{
     
   }
 
   return Math.round(value);
 }
 