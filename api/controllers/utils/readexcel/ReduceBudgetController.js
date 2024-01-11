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
        for (let i = 1; i < (excel.length); i++) {

            let baris = i+1;
            let channel = excel[i][0];
            let branch = excel[i][1];
            let brand = excel[i][2];
            let proposal_no = excel[i][3];
            let nominal_budget = excel[i][4];
            let revisi_budget = excel[i][5];


            let sqlgetbranchcode = `SELECT * FROM m_branch a WHERE branch_desc ='${branch}'`;
            console.log(sqlgetbranchcode);
            let databranchcode = await request.query(sqlgetbranchcode);
            
            let branchcode = databranchcode[0][0].branch_code;

            if(!branchcode){
                console.log(branchcode);
                errorValidation.push(`Activity tidak ditemukan ${activity} status tidak valid cek baris ${baris} pada template upload`);
            }else{
                let sqlgetdetailbudget = `SELECT pb.*,p.total_budget FROM proposal p,proposal_budget pb 
                where p.doc_no ='${proposal_no}' 
                AND pb.proposal_id = p.proposal_id
                AND pb.brand_code = '${brand}'
                AND pb.branch_code = '${branchcode}'
                AND pb.budget = ${nominal_budget}`;
                let datadetailbudget = await request.query(sqlgetdetailbudget);
                let detailbudget = datadetailbudget[0].length > 0 ? datadetailbudget[0][0] : null;

                if(!detailbudget){
                    errorValidation.push(`Budget dengan Kriteria 
                    Proposal No : ${proposal_no} Brand : ${brand} 
                    dan Nominal Original : ${nominal_budget} tidak ditemukan 
                    hal ini mungkin dikarenakan proposal memiliki detail budget yang harus didefinisikan 
                    cek baris ${baris} pada template upload`);
                }


            }
            console.log(baris);
        }
            
        console.log('errorValidation.length  ',errorValidation.length );
        if(errorValidation.length > 0){

          let dataemail = [];
          if(statusIntegasi=='DEV'){
         
            dataemail.push('tiasadeputra@gmail.com');
            dataemail.push('ilyas.nurrahman74@gmail.com');
           
     
          }else{
           
            dataemail.push('hudlori@enesis.com');
            dataemail.push('farid.hidayat@enesis.com');
            dataemail.push('ilyas.nurrahman74@gmail.com');
            dataemail.push('angga.reinaldi@enesis.com');
            dataemail.push('budi.nugraha@enesis.com');
            dataemail.push('tiasadeputra@gmail.com');

          }

          
        if(dataemail.length > 0){

            console.log('errorValidation ',errorValidation);

            let tempError = [];
            for (let i = 0; i < errorValidation.length; i++) {

              let nomor = i + 1;
              let baris = i + 2;
              let errorText = errorValidation[i];

              tempError.push({
                nomor:nomor,
                baris:baris,
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
          
              subject:`Info Validasi Reduce Budget`,
              tanggal:moment().format('YYYY-MM-DD'),
              filename:nama_file,
              details:detailHtml,
              formatfile:extentionFile
    
            }

            let attachments =  [{   
              filename: nama_file,
              path: fd // stream this file
            }]


            const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'errorvalidationreducebudget', templateparam: param });
            SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);

          }
        //console.log(dataactivitycode[0]);
        //console.log(channel,' ',proposal_no,' ',brand,' ',activity,' ',nominal_budget,' ',revisi_budget);
            res.error({
                message: 'Template Tidak Lulus'
            });
        }else{

            for (let i = 1; i < (excel.length); i++) {

                let baris = i+1;
                let channel = excel[i][0];
                let branch = excel[i][1];
                let brand = excel[i][2];
                let proposal_no = excel[i][3];
                let nominal_budget = excel[i][4];
                let revisi_budget = excel[i][5];

                let sqlgetbranchcode = `SELECT * FROM m_branch a WHERE branch_desc ='${branch}'`;
                let databranchcode = await request.query(sqlgetbranchcode);
                let branchcode = databranchcode[0][0].branch_code;
    
                let sqlgetdetailbudget = `SELECT pb.proposal_budget_id,p.proposal_id FROM proposal p,proposal_budget pb 
                where p.doc_no ='${proposal_no}' 
                AND pb.proposal_id = p.proposal_id
                AND pb.brand_code = '${brand}'
                AND pb.branch_code = '${branchcode}'
                AND pb.budget = ${nominal_budget}`;
                let datadetailbudget = await request.query(sqlgetdetailbudget);
                let proposal_budget_id = datadetailbudget[0].length > 0 ? datadetailbudget[0][0].proposal_budget_id : null;
                let proposal_id = datadetailbudget[0].length > 0 ? datadetailbudget[0][0].proposal_id : null;


                let sqlupdateBudgetdetail = `UPDATE proposal_budget SET budget=${revisi_budget} WHERE proposal_budget_id='${proposal_budget_id}'`;
                await request.query(sqlupdateBudgetdetail);

                let sqlgetSumProposal = `SELECT SUM(budget) AS total_budget FROM proposal_budget WHERE proposal_id='${proposal_id}'`;
                let datagetSumProposal = await request.query(sqlgetSumProposal);
                let total_budget = datagetSumProposal[0][0].total_budget

                let sqlupdateBudgetHeader = `UPDATE proposal SET total_budget=${total_budget} WHERE proposal_id='${proposal_id}'`;
                await request.query(sqlupdateBudgetHeader);


                let nomor = i+1;
                console.log(nomor);

                successValidation.push({
                    nomor:nomor,
                    channel:channel,
                    branch:branch,
                    brand:brand,
                    proposal_no:proposal_no,
                    nominal_budget:nominal_budget,
                    revisi_budget:revisi_budget
                });


            }



            if(successValidation.length > 0){

              let dataemail = [];
              if(statusIntegasi=='DEV'){
         
                dataemail.push('tiasadeputra@gmail.com');
               
         
              }else{
               
                dataemail.push('hudlori@enesis.com');
                dataemail.push('farid.hidayat@enesis.com');
                dataemail.push('ilyas.nurrahman74@gmail.com');
                dataemail.push('angga.reinaldi@enesis.com');
                dataemail.push('budi.nugraha@enesis.com');
                dataemail.push('tiasadeputra@gmail.com');
                dataemail.push('grahayuda.prasetya@enesis.com');
                dataemail.push('febrian.triyunanta@enesis.com');
         
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
                  +`<td>${detail.branch}</td>`
                  +`<td>${detail.brand}</td>`
                  +`<td>${detail.proposal_no}</td>`
                  +`<td>${numeral(detail.nominal_budget).format("0,00")}</td>`
                  +`<td>${numeral(detail.revisi_budget).format("0,00")}</td>`
                  +`</tr>`
                  }
  
                  
                  const param = {
              
                    subject:`Reduce Budget Telah Dilakukan`,
                    tanggal:moment().format('YYYY-MM-DD'),
                    filename:nama_file,
                    details:detailHtml,
                    formatfile:extentionFile
          
                  }
  
                  let attachments =  [{   
                  filename: nama_file+extentionFile,
                  path: fd // stream this file
                  }]
  
      
                  const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'succesvalidationreducebudget', templateparam: param });
                  SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);

  
              
              }

          }

            res.success({
                message: 'Upload file berhasil'
            });
            return true;
            
        }

       });
   }
 };
 

