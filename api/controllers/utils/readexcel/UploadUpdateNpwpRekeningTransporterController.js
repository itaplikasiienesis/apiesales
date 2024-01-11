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
        const nama_file = uploadedFiles[0].filename;
        let extentionFile = path.extname(fd);
        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

       let errorValidation = [];
       for (let i = 1; i < (excel.length); i++) {
            
            let baris = i+1;
            let kode = excel[i][0];
            let sqlGetTransporter = `SELECT * FROM m_transporter_v WHERE kode='${kode}'`;
            let dataTransporter = await request.query(sqlGetTransporter);
            let m_transporter_id = dataTransporter.recordset.length > 0 ? dataTransporter.recordset[0].m_transporter_id : null;

            let nama = excel[i][1];
            let npwp = excel[i][2];
            let rekening = excel[i][3];

            console.log('kode ',kode);
            console.log('nama ',nama);
            console.log('npwp ',npwp);
            console.log('rekening ',rekening);

            if(dataTransporter.recordset.length==0 || m_transporter_id==null){
                 errorValidation.push(`Kode Transporter ${kode} tidak valid cek baris ${baris} pada template upload`);
            }
   
        }

         if(errorValidation.length > 0){

           let dataemail = [];
           if(statusIntegasi=='DEV'){
          
             dataemail.push('tiasadeputra@gmail.com');
             dataemail.push('ilyas.nurrahman74@gmail.com');
        
      
           }else{
        
             dataemail.push('tiasadeputra@gmail.com');
      
           }

           if(dataemail.length > 0){

             let tempError = [];
             for (let i = 0; i < errorValidation.length; i++) {

               let nomor = i + 1;
               let errorText = errorValidation[i];

               tempError.push({
                 nomor:nomor,
                 errorText:errorText
               });
               
             }

             let detailHtml = ''
             for (const detail of tempError) {
               detailHtml += 
               '<tr>'
               +`<td>${detail.nomor}</td>`
               +`<td>${detail.errorText}</td>`
               +`</tr>`
             }

             const param = {
           
               subject:`Info Validasi Update Rekening Transporter`,
               tanggal:moment().format('YYYY-MM-DD'),
               filename:nama_file,
               details:detailHtml,
               formatfile:extentionFile
     
             }

             let attachments =  [{   
               filename: nama_file+extentionFile,
               path: fd // stream this file
             }]

 
             const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'errorvalidationskureplacement', templateparam: param });
             SendEmail(dataemail.toString(), param.subject, template,null,'EIS', attachments);

           } 

             res.error({
                 message: errorValidation[0].toString()
             });

         }else{


           for (let i = 1; i < (excel.length); i++) {

                let kode = excel[i][0];
                let nama = excel[i][1];
                let npwp = excel[i][2];
                let rekening = excel[i][3];

                let sqlGetTransporter = `SELECT * FROM m_transporter_v WHERE kode='${kode}'`;
                let dataTransporter = await request.query(sqlGetTransporter);
                let m_transporter_id = dataTransporter.recordset.length > 0 ? dataTransporter.recordset[0].m_transporter_id : null;

                let updateData = `UPDATE m_transporter SET npwp='${npwp}',rekening='${rekening}' WHERE m_transporter_id='${m_transporter_id}'`;
                await request.query(updateData);
               
             }



             let sqlInsertData = `INSERT INTO audit_support
             (kode,nama)
             VALUES('8', 'Update Data Transporter')`;
             await request.query(sqlInsertData);
  
             
  
             res.success({
               message: 'Upload file berhasil'
             });
             return true;

           
           }
       
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
