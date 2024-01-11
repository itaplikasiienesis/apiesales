/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const uuid = require("uuid/v4");
 const otpGenerator = require('otp-generator');
 const bcrypt = require('bcryptjs');
 const DBPROP = require("../../../services/DBPROPOSAL");
 
 
 module.exports = {
 
   // GET ONE RESOURCE
   findOne: async function(req, res) {
     await DB.poolConnect;
     
     try {
       const request = DB.pool.request();
       const requesteprop = await DBPROP.promise();

       let queryDataTable = `SELECT mu.m_user_id, mus.username AS user_eprop FROM m_user mu
       LEFT JOIN m_user_sso mus ON(mu.m_user_id = mus.m_user_id) 
       WHERE mu.nik ='${req.param(
         "id"
       )}'`;
       

       //console.log(queryDataTable);
       
       request.query(queryDataTable, async (err, result) => {
         if (err) {
           return res.error(err);
         }

         const row = result.recordset[0];
         let id = req.param("id");
         let dataapproval = []
         if(row){
          let m_user_id = row.m_user_id ? row.m_user_id : null;
          let user_eprop = row.user_eprop ? row.user_eprop : null;
 

          if(user_eprop){
            
            console.log("QUERY 1");
             let sqlgetApprovalEprop = `SELECT  proposal.doc_no AS code,proposal.proposal_id AS idmodul,
             proposal.title AS "desc",proposal.proposal_date AS docdate,proposal.created_by,
             CONCAT('/admin/approve-reject-proposal/detail/aprj/',proposal.proposal_id) AS url_menu,
             'E-Proposal' AS nama_menu FROM proposal_approval
             LEFT JOIN proposal ON proposal_approval.proposal_id = proposal.proposal_id
             LEFT JOIN m_division ON proposal.division_code = m_division.division_code
             LEFT JOIN m_status ON m_status.status_id = proposal.status_id
             WHERE flag = 1
             AND employee_id = '${user_eprop}'
             AND proposal.status_id <> 99
             GROUP BY proposal.proposal_id`;
             
    
             let dataEprop = await requesteprop.query(sqlgetApprovalEprop);
             let epropapprovallist = dataEprop[0]; 
             for (let i = 0; i < epropapprovallist.length; i++) {
                 
                dataapproval.push(epropapprovallist[i]);
                 
             }
    
          }
          
         }else{

          

          if(id){
            console.log("QUERY 2");
            let sqlgetApprovalEprop = `SELECT  proposal.doc_no AS code,proposal.proposal_id AS idmodul,
            proposal.title AS "desc",proposal.proposal_date AS docdate,proposal.created_by,
            CONCAT('/admin/approve-reject-proposal/detail/aprj/',proposal.proposal_id) AS url_menu,
            'E-Proposal' AS nama_menu FROM proposal_approval
            LEFT JOIN proposal ON proposal_approval.proposal_id = proposal.proposal_id
            LEFT JOIN m_division ON proposal.division_code = m_division.division_code
            LEFT JOIN m_status ON m_status.status_id = proposal.status_id
            WHERE flag = 1
            AND employee_id = '${id}'
            AND proposal.status_id <> 99
            GROUP BY proposal.proposal_id`;
   
            let dataEprop = await requesteprop.query(sqlgetApprovalEprop);

            let epropapprovallist = dataEprop[0]; 
            for (let i = 0; i < epropapprovallist.length; i++) {
                
               dataapproval.push(epropapprovallist[i]);
                
            }
          }

         }

         
         let sqlgetRoles = `SELECT mr.nama FROM m_user mu,m_role mr 
         where nik = '${id}' AND mr.m_role_id = mu.role_default_id`;

         let dataroles = await request.query(sqlgetRoles);

         if(dataroles.recordset.find(e => e.nama =='SALESMTREGIONKLAIM') || dataroles.recordset.find(e => e.nama =='SALESGTREGIONKLAIM')){
            
          console.log("QUERY 14");
            let sqlgetklaimdraft = `SELECT TOP 10 nomor_klaim AS code,k.klaim_id as idmodul,
            k.perihal_klaim as "desc",k.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=k.createdby) AS created_by,
            CONCAT('/admin/klaim-proposal/detail-klaim-proposal/',k.klaim_id) AS url_menu,
            'Approve Proposal Klaim' AS nama_menu
            FROM klaim k WHERE k.kode_status = 'DR' AND k.isactive = 'Y' ORDER BY k.created`;

            let dataKlaimNeedVerifikasi = await request.query(sqlgetklaimdraft);

            if(dataKlaimNeedVerifikasi.recordset.length > 0){

              for (let i = 0; i < dataKlaimNeedVerifikasi.recordset.length; i++) {
                  
                  dataapproval.push(dataKlaimNeedVerifikasi.recordset[i]);
                
              }

            }
            
            console.log("QUERY 13");
            let sqlgetklaimkirimdocument = `SELECT TOP 10 nomor_klaim AS code,k.klaim_id as idmodul,
            k.perihal_klaim as "desc",k.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=k.createdby) AS created_by,
            CONCAT('/admin/klaim-proposal/detail-klaim-proposal/',k.klaim_id) AS url_menu,
            'Approve Proposal Klaim' AS nama_menu
            FROM klaim k WHERE k.kode_status = 'MPD' AND k.isactive = 'Y' ORDER BY k.created`;

            let dataKlaimNeedTerimaDocument = await request.query(sqlgetklaimkirimdocument);

            if(dataKlaimNeedTerimaDocument.recordset.length > 0){

              for (let i = 0; i < dataKlaimNeedTerimaDocument.recordset.length; i++) {
                  
                  dataapproval.push(dataKlaimNeedTerimaDocument.recordset[i]);
                
              }

            }

            
            console.log("QUERY 12");
            let sqlgetklaimterimadocument = `SELECT TOP 10 nomor_klaim AS code,k.klaim_id as idmodul,
            k.perihal_klaim as "desc",k.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=k.createdby) AS created_by,
            CONCAT('/admin/klaim-proposal/detail-klaim-proposal/',k.klaim_id) AS url_menu,
            'Approve Proposal Klaim' AS nama_menu
            FROM klaim k WHERE k.kode_status = 'DTA' AND k.isactive = 'Y' ORDER BY k.created`;

            let dataKlaimNeedVerifikasiDocument = await request.query(sqlgetklaimterimadocument);

            if(dataKlaimNeedVerifikasiDocument.recordset.length > 0){

              for (let i = 0; i < dataKlaimNeedVerifikasiDocument.recordset.length; i++) {
                  
                  dataapproval.push(dataKlaimNeedVerifikasiDocument.recordset[i]);
                
              }

            }

          }

          
          if(dataroles.recordset.find(e => e.nama =='RSDH')){
            
            console.log("QUERY 11");
            let sqlgetklaimverifikasidocument = `SELECT TOP 10 nomor_klaim AS code,k.klaim_id as idmodul,
            k.perihal_klaim as "desc",k.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=k.createdby) AS created_by,
            CONCAT('/admin/klaim-proposal/detail-klaim-proposal/',k.klaim_id) AS url_menu,
            'Approve Proposal Klaim' AS nama_menu
            FROM klaim k WHERE k.kode_status = 'DVS' AND k.isactive = 'Y' ORDER BY k.created`;

            let dataKlaimNeedApproveRsm = await request.query(sqlgetklaimverifikasidocument);

            if(dataKlaimNeedApproveRsm.recordset.length > 0){

              for (let i = 0; i < dataKlaimNeedApproveRsm.recordset.length; i++) {
                  
                  dataapproval.push(dataKlaimNeedApproveRsm.recordset[i]);
                
              }

            }

            // FKR

            
            console.log("QUERY 10");
            let sqlGetFkrWaitingRsm = `SELECT nomor_fkr AS code,f.fkr_id as idmodul,concat('Nomor SO :',nomor_so,' Tahun : ',f.tahun,' Bulan : ',f.bulan) as "desc",
            f.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=f.createdby) AS created_by,
            CONCAT('/admin/approve-proses-asdh/detail-fkr-execution/',f.fkr_id) AS url_menu,
            'List FKR' AS nama_menu
            FROM fkr f 
            WHERE f.isactive = 'Y'
            AND kode_status = 'APA'
            AND f.kode_status NOT IN('RJC','Reject')
            AND f.m_distributor_id IN(
            SELECT m_distributor_id FROM m_distributor_profile_v mp,m_user mu 
            WHERE mu.m_user_id = mp.m_user_id
            AND mu.nik = '${id}'
            ) ORDER BY f.created`;


            let dataFkrWaitingRsm = await request.query(sqlGetFkrWaitingRsm);

            if(dataFkrWaitingRsm.recordset.length > 0){

              for (let i = 0; i < dataFkrWaitingRsm.recordset.length; i++) {
                  
                  dataapproval.push(dataFkrWaitingRsm.recordset[i]);
                
              }

            }

          }


          if(dataroles.recordset.find(e => e.nama =='SALESHO3')){
            
            console.log("QUERY 9");
            let sqlgetklaimapprovalsaleshead = `SELECT TOP 10 nomor_klaim AS code,k.klaim_id as idmodul,
            k.perihal_klaim as "desc",k.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=k.createdby) AS created_by,
            CONCAT('/admin/klaim-proposal/detail-klaim-proposal/',k.klaim_id) AS url_menu,
            'Approve Proposal Klaim' AS nama_menu
            FROM klaim k WHERE k.kode_status = 'APR' AND k.isactive = 'Y' ORDER BY k.created`;

            let dataKlaimNeedApprovesaleshead = await request.query(sqlgetklaimapprovalsaleshead);

            if(dataKlaimNeedApprovesaleshead.recordset.length > 0){

              for (let i = 0; i < dataKlaimNeedApprovesaleshead.recordset.length; i++) {
                  
                  dataapproval.push(dataKlaimNeedApprovesaleshead.recordset[i]);
                
              }

            }


            
            console.log("QUERY 8");
            let sqlGetFkrWaitingRsm = `SELECT nomor_fkr AS code,f.fkr_id as idmodul,concat('Nomor SO :',nomor_so,' Tahun : ',f.tahun,' Bulan : ',f.bulan) as "desc",
            f.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=f.createdby) AS created_by,
            CONCAT('/admin/approve-proses-asdh/detail-fkr-execution/',f.fkr_id) AS url_menu,'List FKR' AS nama_menu
            FROM fkr f 
            WHERE f.isactive = 'Y'
            AND kode_status = 'APR'
            AND f.amount >= 0
            AND f.kode_status NOT IN('RJC','Reject')`;


            let dataFkrWaitingRsm = await request.query(sqlGetFkrWaitingRsm);

            if(dataFkrWaitingRsm.recordset.length > 0){

              for (let i = 0; i < dataFkrWaitingRsm.recordset.length; i++) {
                  
                  dataapproval.push(dataFkrWaitingRsm.recordset[i]);
                
              }

            }

            

          }


          if(dataroles.recordset.find(e => e.nama =='SALESHO2')){
            
            console.log("QUERY 7");
            let sqlGetFkrWaitingSalesHeadCsmo = `SELECT nomor_fkr AS code,f.fkr_id as idmodul,concat('Nomor SO :',nomor_so,' Tahun : ',f.tahun,' Bulan : ',f.bulan) as "desc",
            f.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=f.createdby) AS created_by,
            CONCAT('/admin/approve-proses-asdh/detail-fkr-execution/',f.fkr_id) AS url_menu,'List FKR' AS nama_menu
            FROM fkr f 
            WHERE f.isactive = 'Y'
            AND kode_status = 'APS1'
            AND f.nomor_cn IS NULL
            AND f.amount >= 20000000
            AND f.kode_status NOT IN('RJC','Reject')`;


            let dataFkrWaitingSalesHeadCmo = await request.query(sqlGetFkrWaitingSalesHeadCsmo);

            if(dataFkrWaitingSalesHeadCmo.recordset.length > 0){

              for (let i = 0; i < dataFkrWaitingSalesHeadCmo.recordset.length; i++) {
                  
                  dataapproval.push(dataFkrWaitingSalesHeadCmo.recordset[i]);
                
              }

            }

          }


          if(dataroles.recordset.find(e => e.nama =='SALESHO1')){
            
            console.log("QUERY 6");
            let sqlGetFkrWaitingSalesHeadCsmo = `SELECT nomor_fkr AS code,f.fkr_id as idmodul,concat('Nomor SO :',nomor_so,' Tahun : ',f.tahun,' Bulan : ',f.bulan) as "desc",
            f.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=f.createdby) AS created_by,
            CONCAT('/admin/approve-proses-asdh/detail-fkr-execution/',f.fkr_id) AS url_menu,'List FKR' AS nama_menu
            FROM fkr f 
            WHERE f.isactive = 'Y'
            AND kode_status = 'APS2'
            AND f.nomor_cn IS NULL
            AND f.amount >= 500000000
            AND f.kode_status NOT IN('RJC','Reject')`;


            let dataFkrWaitingSalesHeadCmo = await request.query(sqlGetFkrWaitingSalesHeadCsmo);

            if(dataFkrWaitingSalesHeadCmo.recordset.length > 0){

              for (let i = 0; i < dataFkrWaitingSalesHeadCmo.recordset.length; i++) {
                  
                  dataapproval.push(dataFkrWaitingSalesHeadCmo.recordset[i]);
                
              }

            }

          }


          

          if(dataroles.recordset.find(e => e.nama =='ACCOUNTING') || dataroles.recordset.find(e => e.nama =='ACCOUNTING2')){


            let sqlgetklaimverifikasisales = `SELECT TOP 10 nomor_klaim AS code,k.klaim_id as idmodul,
            k.perihal_klaim as "desc",k.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=k.createdby) AS created_by,
            CONCAT('/admin/klaim-proposal/detail-klaim-proposal/',k.klaim_id) AS url_menu,
            'Approve Proposal Klaim' AS nama_menu
            FROM klaim k WHERE k.kode_status = 'VER' AND k.isactive = 'Y' ORDER BY k.created`;

            let dataKlaimNeedVerifikasiAcc = await request.query(sqlgetklaimverifikasisales);

            if(dataKlaimNeedVerifikasiAcc.recordset.length > 0){

              for (let i = 0; i < dataKlaimNeedVerifikasiAcc.recordset.length; i++) {
                  
                  dataapproval.push(dataKlaimNeedVerifikasiAcc.recordset[i]);
                
              }

            }


            
            console.log("QUERY XX");
            let sqlgetklaimterimadocumentasli = `SELECT TOP 10 nomor_klaim AS code,k.klaim_id as idmodul,
            k.perihal_klaim as "desc",k.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=k.createdby) AS created_by,
            CONCAT('/admin/klaim-proposal/detail-klaim-proposal/',k.klaim_id) AS url_menu,
            'Approve Proposal Klaim' AS nama_menu
            FROM klaim k WHERE k.kode_status = 'APN' AND k.isactive = 'Y' ORDER BY k.created`;

            let dataKlaimNeedTerimaDokumenAsli = await request.query(sqlgetklaimterimadocumentasli);

            if(dataKlaimNeedTerimaDokumenAsli.recordset.length > 0){

              for (let i = 0; i < dataKlaimNeedTerimaDokumenAsli.recordset.length; i++) {
                  
                  dataapproval.push(dataKlaimNeedTerimaDokumenAsli.recordset[i]);
                
              }

            }

            
            console.log("QUERY 5");
            let sqlgetklaimverifikasidocumentasli = `SELECT TOP 10 nomor_klaim AS code,k.klaim_id as idmodul,
            k.perihal_klaim as "desc",k.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=k.createdby) AS created_by,
            CONCAT('/admin/klaim-proposal/detail-klaim-proposal/',k.klaim_id) AS url_menu,
            'Approve Proposal Klaim' AS nama_menu
            FROM klaim k WHERE k.kode_status = 'TDF' AND k.isactive = 'Y' ORDER BY k.created`;

            let dataKlaimNeedVerifikasiDokumenAsli = await request.query(sqlgetklaimverifikasidocumentasli);

            if(dataKlaimNeedVerifikasiDokumenAsli.recordset.length > 0){

              for (let i = 0; i < dataKlaimNeedVerifikasiDokumenAsli.recordset.length; i++) {
                  
                  dataapproval.push(dataKlaimNeedVerifikasiDokumenAsli.recordset[i]);
                
              }

            }

            
            console.log("QUERY 3");
            let sqlgetklaimsubmitklaimtosap = `SELECT TOP 10 nomor_klaim AS code,k.klaim_id as idmodul,
            k.perihal_klaim as "desc",k.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=k.createdby) AS created_by,
            CONCAT('/admin/klaim-proposal/detail-klaim-proposal/',k.klaim_id) AS url_menu,
            'Approve Proposal Klaim' AS nama_menu
            FROM klaim k WHERE k.kode_status = 'APF' AND k.isactive = 'Y' ORDER BY k.created`;

            let dataKlaimNeedSubmitklaimtosap = await request.query(sqlgetklaimsubmitklaimtosap);

            if(dataKlaimNeedSubmitklaimtosap.recordset.length > 0){

              for (let i = 0; i < dataKlaimNeedSubmitklaimtosap.recordset.length; i++) {
                  
                  dataapproval.push(dataKlaimNeedSubmitklaimtosap.recordset[i]);
                
              }

            }

          }


          // GET APROVAL FKR.

          if(dataroles.recordset.find(e => e.nama =='ASDH')){
            
            console.log("QUERY 4");
            let sqlGetFkrWaitingASM = `SELECT nomor_fkr AS code,f.fkr_id as idmodul,concat('Nomor SO :',nomor_so,' Tahun : ',f.tahun,' Bulan : ',f.bulan) as "desc",
            f.created as docdate,(SELECT TOP 1 nama FROM m_user mu where mu.m_user_id=f.createdby) AS created_by,
            CONCAT('/admin/approve-proses-asdh/detail-fkr-execution/',f.fkr_id) AS url_menu,'List FKR' AS nama_menu
            FROM fkr f 
            WHERE f.isactive = 'Y'
            AND kode_status = 'DRAFT'
            AND f.kode_status NOT IN('RJC','Reject')
            AND f.m_distributor_id IN(
            SELECT m_distributor_id FROM m_distributor_profile_v mp,m_user mu 
            WHERE mu.m_user_id = mp.m_user_id
            AND mu.nik = '${id}'
            ) ORDER BY f.created`;


            let dataFkrWaitingAsm = await request.query(sqlGetFkrWaitingASM);

            if(dataFkrWaitingAsm.recordset.length > 0){

              for (let i = 0; i < dataFkrWaitingAsm.recordset.length; i++) {
                  
                  dataapproval.push(dataFkrWaitingAsm.recordset[i]);
                
              }

            }


          }

         return res.success({
          result: dataapproval,
          message: "Fetch data successfully"
        });



       });
     } catch (err) {
       return res.error(err);
     }
   },

   findOneEProp: async function(req, res) {
    await DB.poolConnect;
    
    try {
      const request = DB.pool.request();
      const requesteprop = await DBPROP.promise()
      let id = req.param("id");
      let total = 0;
      console.log("ID",id);
      let query = `SELECT proposal.proposal_id,proposal.company_code AS company_id,
      proposal.title AS name,proposal.proposal_date AS docdate,proposal.doc_no,
      proposal.budget_year AS period,m_status.status_name AS status,proposal.total_budget FROM proposal_approval 
      LEFT JOIN proposal ON proposal_approval.proposal_id = proposal.proposal_id
      LEFT JOIN m_division ON proposal.division_code = m_division.division_code 
      LEFT JOIN m_status ON m_status.status_id = proposal.status_id
      WHERE flag = 1 
      AND employee_id = '${id}' 
      AND proposal.status_id <> 99 
      GROUP BY proposal.proposal_id`;
      let data = await requesteprop.query(query);

      if(data[0].length > 0){
        total = data[0].length; 
        return res.success({
          result: total.toString(),
          message: "Fetch data successfully"
        });
      }else{
        return res.success({
          result: '0',
          message: "Fetch data successfully"
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

 };
 