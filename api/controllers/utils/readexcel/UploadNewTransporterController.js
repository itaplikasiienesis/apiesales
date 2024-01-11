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
            let kode = excel[i][0];
            let sqlGetTransporter = `SELECT * FROM m_transporter_v WHERE kode='${kode}'`;
            let dataTransporter = await request.query(sqlGetTransporter);
            let m_transporter_id = dataTransporter.recordset.length > 0 ? dataTransporter.recordset[0].m_transporter_id : null;

            let nama = excel[i][1] ? `'${excel[i][1]}'` : 'NULL';
            let npwp = excel[i][2] ? `'${excel[i][2]}'` : 'NULL';
            let rekening = excel[i][3] ? `'${excel[i][3]}'` : 'NULL';
            let telpon = excel[i][4] ? `'${excel[i][4]}'` : 'NULL';
            let hp = excel[i][5] ? `'${excel[i][5]}'` : 'NULL';
            let email = excel[i][6] ? `'${excel[i][6]}'` : 'NULL';
            let alamat = excel[i][7] ? `'${excel[i][7]}'` : 'NULL';



            if(dataTransporter.recordset.length==0 || m_transporter_id==null){


                try {

                    
                console.log('PROSES INSERT');
                console.log('kode ',kode);
                console.log('nama ',nama);
                console.log('npwp ',npwp);
                console.log('rekening ',rekening);
                // BELUM ADA MAKA LAKUKAN PROSES CREATE
                // CREATE ORGANISASI ID
                let processData = `EXEC sp_createNewTransporter2 ${nama},${kode},${telpon},${hp},${email},${alamat},${npwp},${rekening}`;
                await request.query(processData);
                    
                } catch (error) {
                    return res.error({
                        message : error
                    });
                }

                 
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
