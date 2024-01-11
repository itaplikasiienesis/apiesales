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
    const {tab,m_user_id} = req.body;
     req.file('excel')
      .upload({
        maxBytes: 150000000
      }, async function whenDone(err, uploadedFiles) {

        if (err)
        
        return res.error(err);

        if (uploadedFiles.length === 0) {          
          return res.error([], 'Tidak ada file yang diupload!');
        }

        let tabNumber = 0;
        const request = await DBPROP.promise();
        await DB.poolConnect;
        const requestdata = DB.pool.request();
        const fd = uploadedFiles[0].fd;
        const nama_file = uploadedFiles[0].filename;
        let extentionFile = path.extname(fd);
        var obj = xlsx.parse(fd);
        const excel = obj[tabNumber].data;
        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await requestdata.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

        let errorValidation = [];
        let errorData = [];
        for (let i = 1; i < (excel.length); i++) {
 
            let baris = i+1;
            let nomorProposal = excel[i][0];
            let branch = excel[i][1];
            let periode = excel[i][2];
            let brandCode = excel[i][3];
            let activityCode = excel[i][4];
            let budgetAwal = excel[i][5];
            let totalReverse = excel[i][6];

            console.log('baris ',baris);
            // console.log('nomorProposal ',nomorProposal);
            // console.log('branch ',branch);
            // console.log('periode ',periode);
            // console.log('brandCode ',brandCode);
            // console.log('activityCode ',activityCode);
            // console.log('budgetAwal ',budgetAwal);
            // console.log('totalReverse ',totalReverse);

            let sqlGetBudget = `SELECT pb.proposal_budget_id FROM proposal_budget pb,proposal p,m_branch mb 
            WHERE pb.bulan = ${periode} AND pb.activity_id = '${activityCode}' 
            AND pb.brand_code = '${brandCode}'
            AND pb.budget = ${budgetAwal}
            AND p.proposal_id = pb.proposal_id
            AND p.doc_no = '${nomorProposal}'
            AND pb.branch_code = mb.branch_code
            AND mb.branch_desc = '${branch}'`;



            let dataBudget = await request.query(sqlGetBudget);
            let proposal_budget_id = dataBudget[0].length > 0 ? dataBudget[0][0].proposal_budget_id : null;


            console.log('proposal_budget_id ',proposal_budget_id);

            if(!proposal_budget_id){

                let reason = `Data proposal tidak ditemukan cek baris ke-${baris}`;
                errorValidation.push(`Data proposal tidak ditemukan cek baris ke-${baris}`);
        
                let sqlInsert = `INSERT INTO temp_validation_reversal
                  (temp_validation_reversal_id, nomor_proposal, branch, brand, activity_code, periode, budget_awal, total_klaim, total_reverse,alasan,kode_proses)
                  VALUES(newid(), '${nomorProposal}', '${branch}', '${brandCode}', '${activityCode}','${periode}',${budgetAwal},0, ${totalReverse}, '${reason}','${tab}')`
                  
                  console.log('sqlInsert 1 ',sqlInsert);
                  await requestdata.query(sqlInsert);

 

            }else{


                let sqlGetKlaimDetail = `SELECT SUM(kd.total_klaim) AS totalKlaim FROM klaim_detail kd,klaim k 
                WHERE kd.budget_id = '${proposal_budget_id}'
                AND k.klaim_id = kd.klaim_id 
                AND k.kode_status <> 'RJF'`;

                let dataTotalKlaim = await requestdata.query(sqlGetKlaimDetail);
                let totalKlaim = dataTotalKlaim.recordset.length > 0 ? dataTotalKlaim.recordset[0].totalKlaim : 0;

                let outstandingKlaim = budgetAwal - totalReverse - totalKlaim;

                if(outstandingKlaim < 0){

                    let reason = `Reversal tidak diizinkan karena budget awal sebesar ${budgetAwal} sudah diklaim sebesar ${totalKlaim} nilai oustanding yang bisa direverse = ${totalReverse} sedangan nilai reverse = ${totalReverse}  baris ke-${baris} pada data file`;
                    errorValidation.push(reason)
                                
                    let sqlInsert = `INSERT INTO temp_validation_reversal
                    (temp_validation_reversal_id, nomor_proposal, branch, brand, activity_code, periode, budget_awal, total_klaim, total_reverse,alasan,kode_proses)
                    VALUES(newid(), '${nomorProposal}', '${branch}', '${brandCode}', '${activityCode}','${periode}',${budgetAwal}, ${totalKlaim}, ${totalReverse}, '${reason}','${tab}')`
                   
                    console.log('sqlInsert 2 ',sqlInsert);
                    await requestdata.query(sqlInsert);
  

                }else{

                    let nama = 'SYSTEM';

                    let sqlinsertReverse = `INSERT INTO proposal_reverse
                    (proposal_budget_id, reverse_amount, reverse_by, m_user_id)
                    VALUES(${proposal_budget_id}, ${totalReverse}, '${nama}', '${m_user_id}')`;
                    await request.query(sqlinsertReverse);
  
  
                    let sqlUpdateMigrationBudget = `UPDATE proposal_budget SET ismigration = 'N' 
                    WHERE proposal_budget_id='${proposal_budget_id}'`;
                    await request.query(sqlUpdateMigrationBudget);


                }
        
            }

           
 
        }


        if(errorValidation.length > 0){


            let dataemail = [];
            if(statusIntegasi=='DEV'){
           
              dataemail.push('tiasadeputra@gmail.com');
   
       
            }else{
             
              dataemail.push('tiasadeputra@gmail.com');
              dataemail.push('farid.hidayat@enesis.com');
              dataemail.push('cynthia.vidyani@enesis.com');
            //   dataemail.push('ariska.pratiwi@enesis.com ');
            //   dataemail.push('febrian.triyunanta@enesis.com');
            //   dataemail.push('grahayuda.prasetya@enesis.com');
            //   dataemail.push('stefanus.albert@enesis.com');
            //   dataemail.push('jasuman.Sitanggang@enesis.com');
              
       
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
            
                subject:`Info Validasi Upload Reversal Budget ${tab}`,
                tanggal:moment().format('YYYY-MM-DD'),
                filename:nama_file,
                details:detailHtml,
                formatfile:extentionFile
      
              }
  
              let attachments =  [{   
                filename: nama_file+extentionFile,
                path: fd // stream this file
              }];



  
  
              const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'errorvalidation', templateparam: param });
              SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);
  
            } 
  
              res.error({
                  message: errorValidation[0].toString()
              });
  
  
        }else{

            res.success({
                message: 'Upload file berhasil'
            });
            return true;
        }        
      
    });
  }
};


