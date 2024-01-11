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
const DBPROP = require("../../../services/DBPROPOSAL");
const path = require('path');
const SendEmail = require('../../../services/SendEmail');
const _ = require('lodash');
const numeral = require('numeral'); 

module.exports = {
  upload: async function (req, res) {
    res.setTimeout(0);
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

     
        const request = await DBPROP.promise();
        await DB.poolConnect;
        const requestdata = DB.pool.request();
        const fd = uploadedFiles[0].fd;
        const nama_file = uploadedFiles[0].filename;
        let extentionFile = path.extname(fd);
        var obj = xlsx.parse(fd);
        const excel = obj[0].data;
        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await requestdata.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

        let errorValidation = [];
        let successValidation = [];

        console.log('statusIntegasi ',statusIntegasi);

        for (let i = 2; i < (excel.length); i++) {
 
            let baris = i+1;
            let nomorProposal = excel[i][0];
            let titleAwal = excel[i][1];
            let title = excel[i][2];

            console.log('baris ',baris);
            console.log('nomorProposal ',nomorProposal);
            console.log('titleAwal ',titleAwal);
            console.log('title ',title);
        
            let sqlGetBudget = `SELECT p.doc_no FROM proposal p WHERE p.doc_no = '${nomorProposal}'`;
            let dataBudget = await request.query(sqlGetBudget);
            let doc_no = dataBudget[0].length > 0 ? dataBudget[0][0].doc_no : null;


            if(!doc_no){
                errorValidation.push(`Data proposal tidak ditemukan cek baris ke-${baris}`)
            }else{
                successValidation.push({
                    nomor : i,
                    nomor_proposal:nomorProposal,
                    title_awal:titleAwal,
                    title:title
                });
            }    
 
        }


        if(errorValidation.length > 0){


            let dataemail = [];
            if(statusIntegasi=='DEV'){
           
              dataemail.push('tiasadeputra@gmail.com');
   
       
            }else{
             
              dataemail.push('farid.hidayat@enesis.com');
              dataemail.push('cynthia.vidyani@enesis.com');
              dataemail.push('ariska.pratiwi@enesis.com ');
              dataemail.push('tiasadeputra@gmail.com');
              dataemail.push('febrian.triyunanta@enesis.com');
              dataemail.push('grahayuda.prasetya@enesis.com');
              dataemail.push('stefanus.albert@enesis.com');
              dataemail.push('jasuman.Sitanggang@enesis.com');
              
       
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
            
                subject:`Info Update title E-PROP Budget`,
                tanggal:moment().format('YYYY-MM-DD'),
                filename:nama_file,
                details:detailHtml,
                formatfile:extentionFile
      
              }
  
              let attachments =  [{   
                filename: nama_file+extentionFile,
                path: fd // stream this file
              }]
  
  
              const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'errorvalidation', templateparam: param });
              SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);
  
            } 
  
              res.error({
                  message: errorValidation[0].toString()
              });
  
  
        }else{


            let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
            let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
            let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : 'SYSTEM';

            for (let i = 1; i < (excel.length); i++) {
 
              let baris = i+1;
              let nomorProposal = excel[i][0];
              let titleAwal = excel[i][1];
              let title = excel[i][2];
  

              let sqlUpdateTittleBudget = `UPDATE proposal SET title='${title}' WHERE doc_no = '${nomorProposal}'`;
              
              console.log('baris ',baris);
              console.log(sqlUpdateTittleBudget);
              await request.query(sqlUpdateTittleBudget);
     
            }


            let dataemail = [];
              if(statusIntegasi=='DEV'){
           
                dataemail.push('tiasadeputra@gmail.com');
         
              }else{
               
                dataemail.push('farid.hidayat@enesis.com');
                dataemail.push('cynthia.vidyani@enesis.com');
                dataemail.push('ariska.pratiwi@enesis.com');
                dataemail.push('tiasadeputra@gmail.com');
                dataemail.push('febrian.triyunanta@enesis.com');
                dataemail.push('grahayuda.prasetya@enesis.com');
                dataemail.push('stefanus.albert@enesis.com');
                dataemail.push('jasuman.Sitanggang@enesis.com');
         
              }
              if(dataemail.length > 0){
  
                let detailHtml = '';
                for (const detail of successValidation) {
                  detailHtml += 
                  '<tr>'
                  +`<td>${detail.nomor}</td>`
                  +`<td>${detail.nomor_proposal}</td>`
                  +`<td>${detail.title_awal}</td>`
                  +`<td>${detail.title}</td>`
                  +`</tr>`
                }
  

                console.log(detailHtml);
                const param = {
              
                  subject:`Update title E-PROP telah dilakukan`,
                  tanggal:moment().format('YYYY-MM-DD'),
                  filename:nama_file,
                  details:detailHtml,
                  formatfile:extentionFile
        
                }
  
                let attachments =  [{   
                  filename: nama_file+extentionFile,
                  path: fd // stream this file
                }]
  
    
                const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'successvalidationupdatetittle', templateparam: param });
                SendEmail(dataemail.toString(), param.subject, template,null,'EIS', attachments);
  
              
              }

            res.success({
                message: 'Upload file berhasil'
            });
            return true;
        }
        
      
    });
  }
};


