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
        const requesteprop = await DBPROP.promise();
        const fd = uploadedFiles[0].fd;
        const nama_file = uploadedFiles[0].filename;
        let extentionFile = path.extname(fd);
        var obj = xlsx.parse(fd);
        const excel = obj[0].data;
        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';


        console.log(statusIntegasi);
        let errorValidation = [];
        let successValidation = [];
        for (let i = 1; i < (excel.length); i++) {
            
            let budget_year = excel[i][0];
            let activity_code = excel[i][1];
            let brand_code = excel[i][2];
            let budget = excel[i][4];
            let baris = i + 1;

            // console.log('budget_year ',budget_year);
            console.log('baris ',baris);
            // console.log('group_activity_name ',group_activity_name);
            // console.log('brand_name ',brand_name);
            // console.log('periode_bulan ',periode_bulan);
            // console.log('quarter ',quarter);
            // console.log('budget ',budget);
            // console.log('keterangan ',keterangan);
            


            if(budget > 0){

              let sqlgetactivity = `SELECT * FROM m_activity WHERE activity_code = '${activity_code}' AND year = '${budget_year}'`;
              let dataactivity = await requesteprop.query(sqlgetactivity);
              let activity = dataactivity[0];
  
              let sqlgetbrand = `SELECT * FROM m_brand WHERE active =1 AND brand_code='${brand_code}'`;
              let databrand = await requesteprop.query(sqlgetbrand);
              let brand = databrand[0];
  

              if(activity.length == 0){
                errorValidation.push(`Activity ${activity_code} tidak dikenali disystem cek baris ke ${baris} pada template`);
              }

              if(brand.length == 0){
                errorValidation.push(`Brand ${brand_Code} tidak dikenali disystem cek baris ke ${baris} pada template`);
              }
            }
           
        }

        console.log(errorValidation.length);

        if(errorValidation.length > 0){


          let dataemail = [];
          if(statusIntegasi=='DEV'){
         
            dataemail.push('tiasadeputra@gmail.com');
 
     
          }else{
           
            dataemail.push('tiasadeputra@gmail.com');
            dataemail.push('pradipta.ghusti@enesis.com');
            dataemail.push('jenika.nursamsia@enesis.com');
            
     
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
          
              subject:`Info Validasi Upload Budget E-Proposal`,
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

          console.log('Sukses Upload');


          for (let i = 1; i < (excel.length); i++) {
            


            let budget_year = excel[i][0];
            let activity_code = excel[i][1];
            let brand_code = excel[i][2];
            let periode_bulan = excel[i][3];
            let budget = excel[i][4];
            let keterangan = excel[i][5];

            let baris = i ;

            
            if(budget > 0){


              let sqlgetactivity = `SELECT * FROM m_activity WHERE activity_code = '${activity_code}' AND year = '${budget_year}'`;
              let dataactivity = await requesteprop.query(sqlgetactivity);
              let activity = dataactivity[0][0];

              let group_id = activity.group_id;

              let kuartal = 'Q1';


              if(periode_bulan >= 1 &&  periode_bulan <=3){
                kuartal = 'Q1';
              }else if(periode_bulan >= 4 &&  periode_bulan <=6){
                kuartal = 'Q2';
              }else if(periode_bulan >= 7 &&  periode_bulan <=9){
                kuartal = 'Q3';
              }else if(periode_bulan >= 10 && periode_bulan <=12){
                kuartal = 'Q4';
              }

              
              let sqlInsertBudget = `INSERT INTO budget
              (group_id, brand_code, quarter, budget, year, 
              created_by, bulan,keterangan,activity_code)
              VALUES(${group_id}, '${brand_code}', '${kuartal}',${budget}, ${budget_year}, 
              'System Upload', ${periode_bulan},'${keterangan}','${activity_code}')`;
              await requesteprop.query(sqlInsertBudget);
              
              console.log('baris upload ',baris);


              successValidation.push({
                nomor:baris,
                budget_year:budget_year,
                activity_code:activity_code,
                brand_code:brand_code,
                quarter:kuartal,
                budget:budget,
                periode_bulan:periode_bulan
              });

    
              }





          
          }
  
          if(successValidation.length > 0){

            let dataemail = [];
            if(statusIntegasi=='DEV'){
       
              dataemail.push('tiasadeputra@gmail.com');
             
       
            }else{
             
              dataemail.push('tiasadeputra@gmail.com');
              dataemail.push('pradipta.ghusti@enesis.com');
              dataemail.push('jenika.nursamsia@enesis.com');

       
            }


            if(dataemail.length > 0){

                successValidation = _.uniqBy(successValidation, function (e) {
                  return e.nomor;
                });

                let detailHtml = ''
                for (const detail of successValidation) {
                detailHtml += 
                '<tr>'
                +`<td>${detail.nomor}</td>`
                +`<td>${detail.budget_year}</td>`
                +`<td>${detail.activity_code}</td>`
                +`<td>${detail.brand_code}</td>`
                +`<td>${detail.quarter}</td>`
                +`<td>${detail.periode_bulan}</td>`
                +`<td>${numeral(detail.budget).format("0,00")}</td>`
                +`</tr>`
                }

                
                const param = {
            
                  subject:`Upload Budget Telah Dilakukan`,
                  tanggal:moment().format('YYYY-MM-DD'),
                  filename:nama_file,
                  details:detailHtml,
                  formatfile:extentionFile
        
                }

                let attachments =  [{   
                filename: nama_file+extentionFile,
                path: fd // stream this file
                }]

                const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'successValidationUploadBudget', templateparam: param });
                SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);


            
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
 

