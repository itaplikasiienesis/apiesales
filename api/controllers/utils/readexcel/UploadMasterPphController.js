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
const SendEmail = require('../../../services/SendEmail');
const path = require('path');
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

       for (let i = 1; i < (excel.length); i++) {
            
            let baris = i+1;
            let tipe = excel[i][0];
            let kode = excel[i][1];
            let nama = excel[i][2];
            let persentase = Number(excel[i][3]);
            let sqlGetMasterExisting = `SELECT * FROM r_pajak WHERE tipe = '${tipe}'AND kode='${kode}'`;
            let dataMasterExisting = await request.query(sqlGetMasterExisting);
            let r_pajak_id = dataMasterExisting.recordset.length > 0 ? dataMasterExisting.recordset[0].r_pajak_id : null;

            console.log('baris ',baris);
            console.log('tipe ',tipe);
            console.log('kode ',kode);
            console.log('nama ',nama);
            console.log('persentase ',persentase);


            if(r_pajak_id){

                try {

                    let updateData = `UPDATE r_pajak SET tipe='${tipe}',kode='${kode}',nama='${nama}',persentase=${persentase} WHERE r_pajak_id = '${r_pajak_id}'`;
                    await request.query(updateData);
                    
                } catch (error) {
                    return res.error({
                        message : error
                    });
                }
                 
            }else{
              console.log('NEW INSERT');
               let insertData = `INSERT INTO r_pajak
               (nama, tipe, kode, persentase)
               VALUES('${nama}', '${tipe}', '${kode}', ${persentase})`;
               await request.query(insertData);
            }
   
        }


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
