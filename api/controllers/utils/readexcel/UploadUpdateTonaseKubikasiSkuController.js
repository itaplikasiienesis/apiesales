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
           
           let kode_sku = excel[i][0];
           let tonase = Number(excel[i][1]);
           let kubikasi = Number(excel[i][4]);

           console.log('tonase ',tonase);
           console.log('kubikasi ',kubikasi);

           let sqlgetProduk = `SELECT * FROM m_produk where kode_sap='${kode_sku}'`;
           let dataSku = await request.query(sqlgetProduk);
           let sku = dataSku.recordset.length > 0 ? dataSku.recordset[0] : null;

           if(!sku){
               validation.push(`Kode SKU ${kode_sku} tidak dikenali `);
           }else{
               let m_produk_id = sku.m_produk_id;

               let updateData = `UPDATE m_produk SET tonase = ${tonase},kubikasi = ${kubikasi} WHERE m_produk_id = '${m_produk_id}'`;
               console.log(updateData);
               await request.query(updateData);
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
