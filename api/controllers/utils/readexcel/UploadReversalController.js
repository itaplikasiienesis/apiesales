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
const json2xls = require("json2xls");
const DBPORTAL = require("../../../services/DBPORTAL");

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

        let sqlCekKodeProses = `SELECT COUNT(1) AS jumlahData FROM proposal_reverse pr WHERE kode_proses = '${tab}'`;


        let dataCheckKodeProses = await request.query(sqlCekKodeProses);
        let jumlahData = dataCheckKodeProses[0].length > 0 ? dataCheckKodeProses[0][0].jumlahData : null;

        let arrayExcelValidate = [];

        if(jumlahData > 0){

          res.error({
            message: `Kode Proses ${tab} sudah pernah digunakan`
          });


        }else{

        let errorValidation = [];
        let successValidation = [];
        let dataErrorValidation = [];
        console.log('excel.length ',excel.length);
        for (let i = 1; i < (excel.length); i++) {
 
            let baris = i+1;
            let budgetId = excel[i][0];
            let totalReverse = excel[i][1];

            if(budgetId && totalReverse){


              


              let sqlGetBudget = `SELECT pb.proposal_budget_id,pb.budget,pb.branch_code AS branch,
              pb.bulan AS periode,pb.brand_code,pb.activity_id AS activity_code,p.doc_no
              FROM proposal_budget pb,proposal p 
              WHERE pb.proposal_budget_id = ${budgetId}
              AND p.proposal_id = pb.proposal_id`;

              let dataBudget = await request.query(sqlGetBudget);
              let proposal_budget_id = dataBudget[0].length > 0 ? dataBudget[0][0].proposal_budget_id : null;


              let branch = dataBudget[0].length > 0 ? dataBudget[0][0].branch : null;
              let periode = dataBudget[0].length > 0 ? dataBudget[0][0].periode : null;
              let brandCode = dataBudget[0].length > 0 ? dataBudget[0][0].proposal_budget_id : null;
              let activityCode = dataBudget[0].length > 0 ? dataBudget[0][0].brand_code : null;
              let nomorProposal = dataBudget[0].length > 0 ? dataBudget[0][0].doc_no : null;





              let nominalBudgetAwal =  0;
              let nominalKlaimDistributor =  0;
              let nominalKlaimManual =  0;
              let nominalKlaimPo = 0;
              let nominalReversal = 0;
              let sisaBudget = 0;
              let hasilReversal = 0;


              let sqlGetNomorPr = `SELECT COALESCE(SUM(nilai_gr),0) AS jumlahPr FROM data_po_eprop WHERE nomor_proposal = '${nomorProposal}'`;
              let dataPr = await requestdata.query(sqlGetNomorPr);
              let jumlahPr = dataPr.recordset.length > 0 ? dataPr.recordset[0].jumlahPr : 0;

              if(proposal_budget_id){


                let sqlGetDataKlaimDistributor = `SELECT COALESCE(SUM(kd.total_klaim),0) AS total_klaim 
                FROM klaim_detail kd,klaim k 
                WHERE kd.budget_id = '${proposal_budget_id}'
                AND kd.klaim_id = k.klaim_id
                AND k.kode_status NOT IN('RJF','RJC')
                AND k.isactive = 'Y'`;
                let dataKlaimDistributor = await requestdata.query(sqlGetDataKlaimDistributor);



                nominalBudgetAwal = dataBudget[0].length > 0 ? Number(dataBudget[0][0].budget) : 0;
                nominalKlaimDistributor = dataKlaimDistributor.recordset.length > 0 ? dataKlaimDistributor.recordset[0].total_klaim : 0;



                let sqlGetDataKlaimManual = `SELECT COALESCE(SUM(nilai_klaim_manual),0) AS nominal_klaim_manual FROM data_klaim_manual 
                WHERE proposal_budget_id = '${proposal_budget_id}'`;
                let dataKlaimManual = await requestdata.query(sqlGetDataKlaimManual);
                nominalKlaimManual = dataKlaimManual.recordset.length > 0 ? dataKlaimManual.recordset[0].nominal_klaim_manual : 0;


                let sqlGetDataKlaimPo = `SELECT COALESCE(SUM(nilai_gr),0) AS nominal_klaim_po FROM data_po_eprop 
                WHERE proposal_budget_id = '${proposal_budget_id}'`;
                let dataKlaimPo = await requestdata.query(sqlGetDataKlaimPo);
                nominalKlaimPo = dataKlaimPo.recordset.length > 0 ? dataKlaimPo.recordset[0].nominal_klaim_po : 0;

                let sqlGetReversal = `SELECT COALESCE(SUM(reverse_amount),0) AS reverse_amount 
                FROM proposal_reverse pr WHERE proposal_budget_id = ${budgetId}`;

                // console.log(sqlGetBudget);


                let dataReversal = await request.query(sqlGetReversal);
                nominalReversal = dataReversal[0].length > 0 ? Number(dataReversal[0][0].reverse_amount) : 0;

                // sisaBudget = dataProposalBudget.recordset.length > 0 ? dataProposalBudget.recordset[0].sisa_budget : 0;

                sisaBudget = nominalBudgetAwal - nominalKlaimDistributor - nominalKlaimManual - nominalKlaimPo - nominalReversal;
                hasilReversal = sisaBudget - totalReverse;

                console.log('baris ',baris);
                console.log('proposal_budget_id ',proposal_budget_id);
                console.log('sisaBudget ',sisaBudget);
                console.log('sisaBudget ',totalReverse);
                console.log('hasilReversal ',hasilReversal);
                
            
              }

              
              if(hasilReversal < 0 && proposal_budget_id){

                console.log('reject reversal baris ',baris);

                let objectData = {
                  proposal_budget_id : proposal_budget_id,
                  nomor_proposal : nomorProposal,
                  branch : branch,
                  periode : periode,
                  brand_code : brandCode,
                  activity_code : activityCode,
                  budget_awal : Number(nominalBudgetAwal),
                  nominal_klaim_distributor : nominalKlaimDistributor,
                  nominal_klaim_manual : nominalKlaimManual,
                  nominal_klaim_po : nominalKlaimPo,
                  total_reverse : Number(nominalReversal),
                  plan_reversal : totalReverse,
                  sisa_budget : sisaBudget,
                  hasil_reversal : hasilReversal
                }


                let sqlInsertRejectMinus = `INSERT INTO temp_validation_reversal_reject
                (proposal_budget_id,nomor_proposal,branch, brand, activity_code, periode, budget_awal, 
                nominal_klaim_distributor, nominal_klaim_manual, nominal_klaim_po, 
                total_reverse, 
                plan_reversal, sisa_budget, hasil_reversal, kode_proses)
                VALUES('${proposal_budget_id}','${nomorProposal}','${branch}', '${brandCode}', '${activityCode}', 
                ${periode},${Number(nominalBudgetAwal)}, ${nominalKlaimDistributor}, 
                ${nominalKlaimManual}, 
                ${nominalKlaimPo}, ${Number(nominalReversal)}, ${totalReverse}, ${sisaBudget}, ${hasilReversal}, '${tab}')`;

                await requestdata.query(sqlInsertRejectMinus);


                


                errorValidation.push(`Total reversal Budget ID ${budgetId} lebih besar dari sisa budget yang tersedia cek baris ke-${baris} pada data terlampir`)
                dataErrorValidation.push(objectData);

              }


              if(!proposal_budget_id){

                  let reason = `Data proposal Budget ID ${budgetId} tidak ditemukan cek baris ke-${baris}`;
                  errorValidation.push(`Data proposal tidak ditemukan cek baris ke-${baris}`);


                  let varPeriode = periode ? `'${periode}'` : 0;


                  let sqlInsert = `INSERT INTO temp_validation_reversal
                  (temp_validation_reversal_id, nomor_proposal, branch, brand, activity_code, periode, budget_awal, total_klaim, total_reverse,alasan,kode_proses)
                  VALUES(newid(), '${nomorProposal}', '${branch}', '${brandCode}', '${activityCode}',${varPeriode},${nominalBudgetAwal},0, ${totalReverse}, '${reason}','${tab}')`
                  
                  console.log('sqlInsert 1 ',sqlInsert);
                  await requestdata.query(sqlInsert);

              }else{

                if(sisaBudget >= totalReverse){

                  successValidation.push({
                    proposal_budget_id:proposal_budget_id,
                    nomor : i,
                    nomor_proposal:nomorProposal,
                    branch:branch,
                    brand:brandCode,
                    periode:periode,
                    activity_code:activityCode,
                    budget_awal:nominalBudgetAwal,
                    total_reverse:totalReverse
                  });

                } 
              }

              

            }
            
        }

        console.log('errorValidation.length ',errorValidation.length);
        if(errorValidation.length > 0){



          let arraydetailsforexcel = [];

          for (let i = 0; i < dataErrorValidation.length; i++) {

            
            let obj = {
              "NOMOR PROPOSAL": dataErrorValidation[i].nomor_proposal,
              "BRANCH": dataErrorValidation[i].branch,
              "PERIODE": dataErrorValidation[i].periode,
              "BRAND": dataErrorValidation[i].region,
              "ACTIVITY CODE": dataErrorValidation[i].brand_code,
              "BUDGET AWAL": dataErrorValidation[i].activity_code,
              "NOMINAL KLAIM DISTRIBUTOR": dataErrorValidation[i].nominal_klaim_distributor,
              "NOMINAL KLAIM MANUAL": dataErrorValidation[i].nominal_klaim_manual,
              "NOMINAL KLAIM PO": dataErrorValidation[i].nominal_klaim_po,
              "TOTAL REVERSAL": dataErrorValidation[i].total_reverse,
              "SISA BUDGET": dataErrorValidation[i].sisa_budget,
              "PLAN REVERSAL": dataErrorValidation[i].plan_reversal,
              "HASIL REVERSAL": dataErrorValidation[i].hasil_reversal
            };

            arraydetailsforexcel.push(obj);


          }


          console.log('arraydetailsforexcel ',arraydetailsforexcel.length);
    



            let dataemail = [];
            if(statusIntegasi=='DEV'){
           
              dataemail.push('tiasadeputra@loginusa.id');
   
       
            }else{
             
              dataemail.push('tiasadeputra@loginusa.id');
              dataemail.push('farid.hidayat@enesis.com');
              dataemail.push('cynthia.vidyani@enesis.com');
              dataemail.push('ariska.pratiwi@enesis.com');
              dataemail.push('febrian.triyunanta@enesis.com');
              dataemail.push('eunike@enesis.com');
              dataemail.push('jasuman.Sitanggang@enesis.com');
              dataemail.push('priska.ananda@enesis.com@enesis.com');
              dataemail.push('adi.waluyo@enesis.com');
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
            
                subject:`Info Validasi Upload Reversal Budget ${tab}`,
                tanggal:moment().format('YYYY-MM-DD'),
                filename:nama_file,
                details:detailHtml,
                formatfile:extentionFile
      
              }
  
              let attachments =  [{   
                filename: nama_file+extentionFile,
                path: fd // stream this file
              }]


    

              if(successValidation.length > 0){

                let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
                let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
                let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : 'SYSTEM';


                for (let i = 0; i < successValidation.length; i++) {

                  let proposal_budget_id = successValidation[i].proposal_budget_id;
                  let totalReverse = successValidation[i].total_reverse;

                 
                  let sqlinsertReverse = `INSERT INTO proposal_reverse
                  (proposal_budget_id, reverse_amount, reverse_by, m_user_id,kode_proses)
                  VALUES(${proposal_budget_id}, ${totalReverse}, '${nama}', '${m_user_id}','${tab}')`;
                  await request.query(sqlinsertReverse);


                  let sqlUpdateMigrationBudget = `UPDATE proposal_budget SET ismigration = 'N' 
                  WHERE proposal_budget_id='${proposal_budget_id}'`;
                  await request.query(sqlUpdateMigrationBudget);

                  
                }


              }
  
  
              const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'errorvalidation', templateparam: param });
              SendEmail(dataemail.toString(), param.subject, template,null,'EIS', attachments);
  
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
                let budgetId = excel[i][0];
                let totalReverse = excel[i][1];

                if(budgetId && totalReverse){


                    let sqlGetBudget = `SELECT pb.proposal_budget_id,pb.budget
                    FROM proposal_budget pb
                    WHERE pb.proposal_budget_id = ${budgetId}`;
    
              
                    let dataBudget = await request.query(sqlGetBudget);
                    let proposal_budget_id = dataBudget[0].length > 0 ? dataBudget[0][0].proposal_budget_id : null;
        
                    console.log('baris proses ',baris);
                    console.log('proposal_budget_id ',proposal_budget_id);

                    if(proposal_budget_id){


                      let sqlinsertReverse = `INSERT INTO proposal_reverse
                      (proposal_budget_id, reverse_amount, reverse_by, m_user_id,kode_proses)
                      VALUES(${proposal_budget_id}, ${totalReverse}, '${nama}', '${m_user_id}','${tab}')`;
                      await request.query(sqlinsertReverse);


                      let sqlUpdateMigrationBudget = `UPDATE proposal_budget SET ismigration = 'N' 
                      WHERE proposal_budget_id='${proposal_budget_id}'`;
                      await request.query(sqlUpdateMigrationBudget);
          
                    }
                  
                }
            }


            let dataemail = [];
              if(statusIntegasi=='DEV'){
           
                dataemail.push('tiasadeputra@loginusa.id');
         
              }else{
               
                dataemail.push('tiasadeputra@loginusa.id');
                dataemail.push('farid.hidayat@enesis.com');
                dataemail.push('cynthia.vidyani@enesis.com');
                dataemail.push('ariska.pratiwi@enesis.com');
                dataemail.push('febrian.triyunanta@enesis.com');
                dataemail.push('eunike@enesis.com');
                dataemail.push('jasuman.Sitanggang@enesis.com');
                dataemail.push('priska.ananda@enesis.com@enesis.com');
                dataemail.push('adi.waluyo@enesis.com');
                
                
         
              }
              if(dataemail.length > 0){
  
                let detailHtml = '';
                for (const detail of successValidation) {
                  detailHtml += 
                  '<tr>'
                  +`<td>${detail.nomor}</td>`
                  +`<td>${detail.nomor_proposal}</td>`
                  +`<td>${detail.branch}</td>`
                  +`<td>${detail.brand}</td>`
                  +`<td>${detail.periode}</td>`
                  +`<td>${detail.activity_code}</td>`
                  +`<td>${numeral(detail.budget_awal).format("0,00")}</td>`
                  +`<td>${numeral(detail.total_reverse).format("0,00")}</td>`
                  +`</tr>`
                }
  

                console.log(detailHtml);
                const param = {
              
                  subject:`Upload Reversal Budget ${tab} telah dilakukan`,
                  tanggal:moment().format('YYYY-MM-DD'),
                  filename:nama_file,
                  details:detailHtml,
                  formatfile:extentionFile
        
                }
  
                let attachments =  [{   
                  filename: nama_file+extentionFile,
                  path: fd // stream this file
                }]
  
    
                const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'succesvalidationreversalbudget', templateparam: param });
                SendEmail(dataemail.toString(), param.subject, template,null,'EIS', attachments);
  
              
              }

            res.success({
                message: 'Upload file berhasil'
            });
            return true;
        }


      }

      
    });
  }
};


