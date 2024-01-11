/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const uuid = require("uuid/v4");
 const mssql = require('mssql')
 const bcrypt = require('bcryptjs')
 const xlsx = require('node-xlsx');
 const SendEmail = require('../../../services/SendEmailBlast');
 const moment = require("moment");
 const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'api/repo', param2, param3);
 const fs = require('fs');
 const path = require('path');
 const glob = require("glob");
 const { default: axios } = require("axios");
 const DBPORTAL = require('./../../../services/DBPORTAL.js');
 const DBEMPLOYEE = require('./../../../services/DBEMPLOYEE.js');
 
 module.exports = {
   // GET ALL RESOURCE
   reject: async function(req, res) {
    const {m_user_id,alt_supplier_id,reason,chairman,receiverhead,created_name,kode_status_now,target_development_date} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

        let reasonUpdate = ``;
        let reasonInsert = ``;


        if(Number(kode_status_now) <= 2 || kode_status_now=='DR'){
          if(reason && reason!=''){
            reasonUpdate = `, reason='${reason}'`;
          }

          if(reason && reason!=''){
            reasonInsert = `'${reason}'`;
         
          }else{
            
            reasonInsert = 'NULL';
         
          }

          let status = `Reject`;
          let deleteApproval = `DELETE FROM alt_approval_head WHERE alt_supplier_id='${alt_supplier_id}'`;
          await request.query(deleteApproval);

          let queryUpdateData = `UPDATE alt_supplier SET kode_status='RJC',
          status='${status}'${reasonUpdate}
          WHERE alt_supplier_id='${alt_supplier_id}'`;

          await request.query(queryUpdateData);


          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
  
          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,reason,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', 'RJC', '${status}', ${reasonInsert},${nama})`;

          console.log(insetAuditApproval);
          await request.query(insetAuditApproval);


          return res.success({
            message: "Reject successfully"
          });

        }else if(Number(kode_status_now) == 7){


          if(reason && reason!=''){
            reasonUpdate = `, reason='${reason}'`;
          }

          if(reason && reason!=''){
            reasonInsert = `'${reason}'`;
        
          }else{
            
            reasonInsert = 'NULL';
        
          }

          let status = `Reject`;
          let deleteApproval = `DELETE FROM alt_approval_head WHERE alt_supplier_id='${alt_supplier_id}'`;
          await request.query(deleteApproval);

          let queryUpdateData = `UPDATE alt_supplier SET kode_status='RJC',
          status='${status}'${reasonUpdate}
          WHERE alt_supplier_id='${alt_supplier_id}'`;

          await request.query(queryUpdateData);


          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
  
          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,reason,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', 'RJC', '${status}', ${reasonInsert},${nama})`;

          console.log(insetAuditApproval);
          await request.query(insetAuditApproval);


          return res.success({
            message: "Reject successfully"
          });



        }
        else{


          if(reason && reason!=''){
            reasonUpdate = `, reason='${reason}'`;
          }

          if(reason && reason!=''){
            reasonInsert = `'${reason}'`;
         
          }else{
            
            reasonInsert = 'NULL';
         
          }


          let kode_status = '2'
          let status = 'Approved Head Receiver 1';

          //DELETE APPROVAL HEAD

          let sqlDeleteApprovalHead = `DELETE FROM alt_approval_head 
          WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr NOT IN('1','2','3','4')`;
          await request.query(sqlDeleteApprovalHead);

          // UPDATE URUTAN 3 APPROVAL
          let updateStatusApprovedHeadKetiga = `UPDATE alt_approval_head
          SET isapprove='N'
          WHERE alt_supplier_id='${alt_supplier_id}' AND no_appr='3'`;
          await request.query(updateStatusApprovedHeadKetiga);

          // UPDATE URUTAN 4 APPROVAL
          let updateStatusApprovedHeadKeempat = `UPDATE alt_approval_head
          SET nip='-',nama='?',isapprove='N',email='?'
          WHERE alt_supplier_id='${alt_supplier_id}' AND no_appr='4'`;
          await request.query(updateStatusApprovedHeadKeempat);


          // DELETE PIC TESTING
          let sqlDeletePicTesting = `DELETE FROM alt_approval_pic 
          WHERE alt_supplier_id = '${alt_supplier_id}'`;
          await request.query(sqlDeletePicTesting);



          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
    
          await request.query(queryUpdateData);


          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';

          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,reason,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', 'RJC', 'Reject', ${reasonInsert},${nama})`;
          await request.query(insetAuditApproval);

          return res.success({
            message: "Reject successfully"
          });



        }

    } catch (err) {
      return res.error(err);
    }
  },
  approve: async function(req, res) {
    const {m_user_id,alt_supplier_id,kode_status_now,pic,r_department_id,company_id,nomor_pr,kode_group_material,target_development_date} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      console.log(req.body);


      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

      let sqlgetjumlahtestingAll = `SELECT COUNT(1) AS jumlah_testing FROM alt_approval_pic aap 
      WHERE alt_supplier_id='${alt_supplier_id}'`;
      let getjumlahtestingAll = await request.query(sqlgetjumlahtestingAll);
      let jumlahtestingAll = getjumlahtestingAll.recordset.length > 0 ? getjumlahtestingAll.recordset[0].jumlah_testing : 0;


      console.log('jumlahtestingAll ',jumlahtestingAll);

      if(kode_status_now=='DR'){


      let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
      WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
      let getapprovalhead = await request.query(sqlgetapprovalhead);
      let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
      let kode_status = '1'
      let status = 'Approved Assproc';

        if(alt_approval_head_id){

        
          //Proses Approve Assproc
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}',
          due_date='${target_development_date}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
    
          await request.query(queryUpdateData);


          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          
          await request.query(updateStatusApprovedHead);




          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';

          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
          await request.query(insetAuditApproval);

        }


        return res.success({
          message: "Approve successfully"
        });

      }else if(kode_status_now=='1'){

        
        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        let kode_status = '2'
        let status = 'Approved Procurement Head';

        if(alt_approval_head_id){

        
          //Proses Approve Assproc
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}',
          due_date='${target_development_date}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
    
          await request.query(queryUpdateData);


          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          
          await request.query(updateStatusApprovedHead);


          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          
          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
          await request.query(insetAuditApproval);
        }

      

        return res.success({
          message: "Approve successfully "
        });

      }else if(kode_status_now=='2'){



        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;

        // console.log('sqlgetapprovalhead ',sqlgetapprovalhead);
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        let kode_status = '3'
        let status = 'Approved Head Receiver 1';

        // console.log('alt_approval_head_id ',alt_approval_head_id);

        if(alt_approval_head_id){

        
          //Proses Approve Assproc
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}',
          head_number=1,
          due_date='${target_development_date}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
          // console.log(queryUpdateData);
    
          await request.query(queryUpdateData);


          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          
          await request.query(updateStatusApprovedHead);


          // CEK DATA SELANJUTNYA UNTUK DIUPDATE NIKNYA SEBAGAI DELEGATE

          let sqlGetDataApprovalSelanjutnya = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
          WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' ORDER BY no_appr ASC`;

        let getDataApprovalSelanjutnya = await request.query(sqlGetDataApprovalSelanjutnya);
        let alt_approval_head_next_id = getDataApprovalSelanjutnya.recordset.length > 0 ? getDataApprovalSelanjutnya.recordset[0].alt_approval_head_id : null;
            
          if(pic){

            console.log('masuk sini untuk insert');

        
            let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${pic}'`;
            console.log(sqlGetNamaByNik);
            let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
            let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : null;
            let email = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].email : null;


                        
            let updateStatusApprovalNext = `UPDATE alt_approval_head
            SET nip='${pic}',nama = '${nama}',email = '${email}'
            WHERE alt_approval_head_id='${alt_approval_head_next_id}'`;
            console.log(updateStatusApprovalNext);
            await request.query(updateStatusApprovalNext);

            let sqlGetNamaByNikSpv = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
            console.log(sqlGetNamaByNikSpv);
            let getNamaByNikSpv = await DBPORTAL.query(sqlGetNamaByNikSpv);
            let namaSpv = getNamaByNikSpv.rows.length > 0 ? getNamaByNikSpv.rows[0].name : null;
            let emailSpv = getNamaByNikSpv.rows.length > 0 ? getNamaByNikSpv.rows[0].email : null;
  
            let insertPic = `INSERT INTO alt_approval_pic
            (createdby, updatedby, alt_supplier_id, nip,nama,
            r_department_id,pic_email,pic_spv_name,
            pic_spv_email,company_id)
            VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}','${pic}',
            '${nama}', '${r_department_id}','${email}','${namaSpv}','${emailSpv}','${company_id}')`;
            await request.query(insertPic);

          
          }



          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          
          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
          await request.query(insetAuditApproval);



        }

        return res.success({
          message: "Approve successfully"
        });

      }else if(kode_status_now=='4'){


        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        let kode_status = '5'
        let status = 'Approved Head Receiver';

        if(alt_approval_head_id){

        
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
    
          await request.query(queryUpdateData);


          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          
          await request.query(updateStatusApprovedHead);


          if(pic){
        
            let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${pic}'`;
            console.log(sqlGetNamaByNik);
            let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
            let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : null;
            let email = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].email : null;
                        

            let sqlGetNamaByNikSpv = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
            console.log(sqlGetNamaByNikSpv);
            let getNamaByNikSpv = await DBPORTAL.query(sqlGetNamaByNikSpv);
            let namaSpv = getNamaByNikSpv.rows.length > 0 ? getNamaByNikSpv.rows[0].name : null;
            let emailSpv = getNamaByNikSpv.rows.length > 0 ? getNamaByNikSpv.rows[0].email : null;
  
            let insertPic = `INSERT INTO alt_approval_pic
            (createdby, updatedby, alt_supplier_id, nip,nama,
            r_department_id,pic_email,pic_spv_name,
            pic_spv_email,company_id)
            VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}','${pic}',
            '${nama}', '${r_department_id}','${email}','${namaSpv}','${emailSpv}','${company_id}')`;
            await request.query(insertPic);


           // MENCARI INFOTMASI JABATAN PIC TESTING
           let sqlGetDeptHead = `SELECT * FROM v_headcount WHERE employee_id = '${pic}' ORDER BY grade_interval DESC LIMIT 1`;
           console.log(sqlGetDeptHead);
           let getDeptHeadByDepartmentId = await DBEMPLOYEE.query(sqlGetDeptHead);
           let internal_title = getDeptHeadByDepartmentId.rows.length > 0 ? getDeptHeadByDepartmentId.rows[0].internal_title : null;


            let nip_text = pic ? `'${pic}'` : 'NULL';
            let nama_text = nama ? `'${nama}'` : 'NULL';
            let action_text = internal_title ? `'Testing ${internal_title}'` : 'NULL';
            let email_text = email ? `'${email}'` : 'NULL';


            let sqlGetNoAppr = `SELECT 
            COALESCE(MAX(no_appr),1) AS no_appr 
            FROM alt_approval_head 
            WHERE alt_supplier_id ='${alt_supplier_id}'`;
            let getdatanoappr = await request.query(sqlGetNoAppr);
            let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
            let no_appr_data = no_appr + 1;


            let insertHead = `INSERT INTO alt_approval_head
            (createdby, updatedby, alt_supplier_id, nip,nama,r_department_id,no_appr,email,action,company_id)
            VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}',
            ${nip_text},${nama_text}, '${r_department_id}',${no_appr_data},${email_text},${action_text},'${company_id}')`;
            await request.query(insertHead);

          
          }
          
        }


        let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
        let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
        let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
        
        let insetAuditApproval = `INSERT INTO alt_audit_approval
        (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
        VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
        await request.query(insetAuditApproval);

        return res.success({
          message: "Approve successfully "
        });

      
      
      }else if(kode_status_now=='5'){

        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        let kode_status = '6'
        let status = 'Approved Head Packing & Design Development';

        if(alt_approval_head_id){

        
          //Proses Approve Assproc
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
    
          await request.query(queryUpdateData);


          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          
          await request.query(updateStatusApprovedHead);

            
          if(pic){

            console.log('masuk sini untuk insert');


            let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${pic}'`;
            console.log(sqlGetNamaByNik);
            let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
            let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : null;
            let email = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].email : null;


            let sqlGetNamaByNikSpv = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
            console.log(sqlGetNamaByNikSpv);
            let getNamaByNikSpv = await DBPORTAL.query(sqlGetNamaByNikSpv);
            let namaSpv = getNamaByNikSpv.rows.length > 0 ? getNamaByNikSpv.rows[0].name : null;
            let emailSpv = getNamaByNikSpv.rows.length > 0 ? getNamaByNikSpv.rows[0].email : null;
  
            let insertPic = `INSERT INTO alt_approval_pic
            (createdby, updatedby, alt_supplier_id, nip,nama,
            r_department_id,pic_email,pic_spv_name,
            pic_spv_email,company_id)
            VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}','${pic}',
            '${nama}', '${r_department_id}','${email}','${namaSpv}','${emailSpv},'${company_id}')`;
            console.log(insertPic);
            await request.query(insertPic);



           // MENCARI DEPT HEAD DEPARTMENT
           let sqlGetDeptHead = `SELECT * FROM v_headcount WHERE employee_id = '${pic}' ORDER BY grade_interval DESC LIMIT 1`;
           console.log(sqlGetDeptHead);
           let getDeptHeadByDepartmentId = await DBEMPLOYEE.query(sqlGetDeptHead);
           let internal_title = getDeptHeadByDepartmentId.rows.length > 0 ? getDeptHeadByDepartmentId.rows[0].internal_title : null;


            let nip_text = pic ? `'${pic}'` : 'NULL';
            let nama_text = nama ? `'${nama}'` : 'NULL';
            let action_text = internal_title ? `'Testing ${internal_title}'` : 'NULL';
            let email_text = email ? `'${email}'` : 'NULL';


            let sqlGetNoAppr = `SELECT 
            COALESCE(MAX(no_appr),1) AS no_appr 
            FROM alt_approval_head 
            WHERE alt_supplier_id ='${alt_supplier_id}'`;
            let getdatanoappr = await request.query(sqlGetNoAppr);
            let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
            let no_appr_data = no_appr + 1;


            let insertHead = `INSERT INTO alt_approval_head
            (createdby, updatedby, alt_supplier_id, nip,nama,r_department_id,no_appr,email,action,company_id)
            VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}',
            ${nip_text},${nama_text}, '${r_department_id}',${no_appr_data},${email_text},${action_text},'${company_id}')`;
            await request.query(insertHead);


          
          }

        let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
        let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
        let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
        
        let insetAuditApproval = `INSERT INTO alt_audit_approval
        (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
        VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
        await request.query(insetAuditApproval);


        }

        return res.success({
          message: "Approve successfully"
        });
      
      
      }else if(kode_status_now=='7'){


        let sqlGetApproveData = `SELECT r_department_id FROM alt_supplier WHERE alt_supplier_id = '${alt_supplier_id}'`;
        let getDataDepartment = await request.query(sqlGetApproveData);
        let r_department_id_now = getDataDepartment.recordset.length > 0 ? getDataDepartment.recordset[0].r_department_id : null;

        console.log('Approve Kode KE 7 r_department_id',r_department_id);
        console.log('r_department_id_now',r_department_id_now);

        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        let kode_status = '8'
        let status = 'Approved Dept Head';

        if(alt_approval_head_id){

          //Proses Approve Assproc
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
          await request.query(queryUpdateData);


          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          await request.query(updateStatusApprovedHead);
            
          if(r_department_id){

            let sqlGetDeptHead = `SELECT * FROM v_headcount WHERE org_id = '${r_department_id}' ORDER BY grade_interval DESC LIMIT 1`;
            let getDeptHeadByDepartmentId = await DBEMPLOYEE.query(sqlGetDeptHead);
            let nip = getDeptHeadByDepartmentId.rows.length > 0 ? getDeptHeadByDepartmentId.rows[0].employee_id : null;
            let nama = getDeptHeadByDepartmentId.rows.length > 0 ? getDeptHeadByDepartmentId.rows[0].display_name : null;
            let internal_title = getDeptHeadByDepartmentId.rows.length > 0 ? getDeptHeadByDepartmentId.rows[0].internal_title : null;


            let nip_text = nip ? `'${nip}'` : 'NULL';
            let nama_text = nama ? `'${nama}'` : 'NULL';
            let action_text = internal_title ? `'Delegated ${internal_title}'` : 'NULL';


            let email = null;
            if(nip){

              let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${nip}'`;
              let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
              email = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].email : null;

            }

            let email_text = email ? `'${email}'` : 'NULL';

            let sqlGetNoAppr = `SELECT 
            COALESCE(MAX(no_appr),1) AS no_appr 
            FROM alt_approval_head 
            WHERE alt_supplier_id ='${alt_supplier_id}'`;
            let getdatanoappr = await request.query(sqlGetNoAppr);
            let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
            let no_appr_data = no_appr + 1;


            let insertHead = `INSERT INTO alt_approval_head
            (createdby, updatedby, alt_supplier_id, nip,nama,r_department_id,no_appr,email,action,company_id)
            VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}',
            ${nip_text},${nama_text}, '${r_department_id}',${no_appr_data},${email_text},${action_text},'${company_id}')`;

            console.log(insertHead);
            await request.query(insertHead);


          
          }else{


            let updateStatusApprovedHead = `UPDATE alt_approval_head
            SET isapprove='Y'
            WHERE alt_approval_head_id='${alt_approval_head_id}'`;
            await request.query(updateStatusApprovedHead);


            // CEK KODE GROUP MATERIAL

            // let status_material = kode_group_material==='1' ? 'Menunggu Upload Design' : 'Entry Nomor PR';
            let status_material = 'Entry Nomor PR';
  
  
            let sqlGetNoAppr = `SELECT 
            COALESCE(MAX(no_appr),1) AS no_appr 
            FROM alt_approval_head 
            WHERE alt_supplier_id ='${alt_supplier_id}'`;
            let getdatanoappr = await request.query(sqlGetNoAppr);
            let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
            let no_appr_data = no_appr + 1;
  
            // PROSES 
            let sqlGetReceiverPertama = `INSERT INTO alt_approval_head
            (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr, email, [action],company_id)
            SELECT '${m_user_id}' AS createdby, '${m_user_id}' AS updatedby, alt_supplier_id, nip, nama, r_department_id, 'N' AS isapprove, 
            alt_audit_approval_id, ${no_appr_data} AS no_appr, email, 
            '${status_material}' AS [action],company_id from alt_approval_head aah WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr = '4'`;
            await request.query(sqlGetReceiverPertama);
  

  
            // kode_status = kode_group_material==='1' ? '9' : '14';
            // status = kode_group_material==='1' ? 'Menunggu Upload Design' : 'Menunggu Entry No PR';

            kode_status = '14';
            status = 'Menunggu Entry No PR';
  
            
            let queryUpdateData = `UPDATE alt_supplier SET 
            kode_status='${kode_status}',
            status='${status}'
            WHERE alt_supplier_id='${alt_supplier_id}'`;
            await request.query(queryUpdateData);
  
  
          }

        let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
        let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
        let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
        
        let insetAuditApproval = `INSERT INTO alt_audit_approval
        (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
        VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}','${status}',${nama})`;
        await request.query(insetAuditApproval);



        }

        return res.success({
          message: "Approve successfully"
        });

      }else if(kode_status_now=='8'){

        // console.log('Approve Kode KE 8',pic);

        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        let kode_status = '9'
        let status = 'Approved Dept Head';


        
        if(alt_approval_head_id){

          //Proses Approve Assproc
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
          await request.query(queryUpdateData);


          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          await request.query(updateStatusApprovedHead);

    
          if(pic){

            let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${pic}'`;
            console.log(sqlGetNamaByNik);
            let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
            let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : null;
            let email = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].email : null;


            let sqlGetNamaByNikSpv = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
            console.log(sqlGetNamaByNikSpv);
            let getNamaByNikSpv = await DBPORTAL.query(sqlGetNamaByNikSpv);
            let namaSpv = getNamaByNikSpv.rows.length > 0 ? getNamaByNikSpv.rows[0].name : null;
            let emailSpv = getNamaByNikSpv.rows.length > 0 ? getNamaByNikSpv.rows[0].email : null;
  
            let insertPic = `INSERT INTO alt_approval_pic
            (createdby, updatedby, alt_supplier_id, nip,nama,
            r_department_id,pic_email,pic_spv_name,
            pic_spv_email,company_id)
            VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}','${pic}',
            '${nama}', '${r_department_id}','${email}','${namaSpv}','${emailSpv}','${company_id}')`;
            console.log(insertPic);
            await request.query(insertPic);



           // MENCARI DEPT HEAD DEPARTMENT
           let sqlGetDeptHead = `SELECT * FROM v_headcount WHERE employee_id = '${pic}' ORDER BY grade_interval DESC LIMIT 1`;
           console.log(sqlGetDeptHead);
           let getDeptHeadByDepartmentId = await DBEMPLOYEE.query(sqlGetDeptHead);
           let internal_title = getDeptHeadByDepartmentId.rows.length > 0 ? getDeptHeadByDepartmentId.rows[0].internal_title : null;


            let nip_text = pic ? `'${pic}'` : 'NULL';
            let nama_text = nama ? `'${nama}'` : 'NULL';
            // let action_text = internal_title ? `'Upload Design By ${internal_title}'` : 'NULL';
            let action_text = internal_title ? `'WO untuk PR kebutuhan trial selanjutnya'` : 'NULL';
           
            let email_text = email ? `'${email}'` : 'NULL';


            let sqlGetNoAppr = `SELECT 
            COALESCE(MAX(no_appr),1) AS no_appr 
            FROM alt_approval_head 
            WHERE alt_supplier_id ='${alt_supplier_id}'`;
            let getdatanoappr = await request.query(sqlGetNoAppr);
            let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
            let no_appr_data = no_appr + 1;

            let insertHead = `INSERT INTO alt_approval_head
            (createdby, updatedby, alt_supplier_id, nip,nama,r_department_id,no_appr,email,action,company_id)
            VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}',
            ${nip_text},${nama_text}, '${r_department_id}',${no_appr_data},${email_text},${action_text},'${company_id}')`;
            await request.query(insertHead);


          
          }


          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          
          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
          await request.query(insetAuditApproval);
  
        
        
        }

          

        return res.success({
          message: "Approve successfully"
        });

      }else if(kode_status_now=='10'){

        
        let kode_status = '11'
        let status = 'Design Sudah dicetak';

        let queryUpdateData = `UPDATE alt_supplier SET 
        kode_status='${kode_status}',
        status='${status}'
        WHERE alt_supplier_id='${alt_supplier_id}'`;
        await request.query(queryUpdateData);


        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;


        let updateStatusApprovedHead = `UPDATE alt_approval_head
        SET isapprove='Y'
        WHERE alt_approval_head_id='${alt_approval_head_id}'`;
        await request.query(updateStatusApprovedHead);

        let sqlGetNamaVendor = `SELECT nama_vendor FROM alt_supplier WHERE alt_supplier_id = '${alt_supplier_id}'`;
        let getNamaVendor = await request.query(sqlGetNamaVendor);
        let nama_vendor = getNamaVendor.recordset.length > 0 ? `'${getNamaVendor.recordset[0].nama_vendor}'` : 'NULL';
        
        let insetAuditApproval = `INSERT INTO alt_audit_approval
        (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
        VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama_vendor})`;
        await request.query(insetAuditApproval);



        let sqlGetNoAppr = `SELECT 
        COALESCE(MAX(no_appr),1) AS no_appr 
        FROM alt_approval_head 
        WHERE alt_supplier_id ='${alt_supplier_id}'`;
        let getdatanoappr = await request.query(sqlGetNoAppr);
        let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
        let no_appr_data = no_appr + 1;


        let sqlGetDataRequestor = `SELECT TOP 1 createdby AS nik
        FROM alt_audit_approval aaa WHERE alt_supplier_id = '${alt_supplier_id}' AND kode_status = 'DR'`;
        let getNikRequestor = await request.query(sqlGetDataRequestor);
        let nik_requestor = getNikRequestor.recordset.length > 0 ? getNikRequestor.recordset[0].nik : 1;

        let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${nik_requestor}'`;
        let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
        let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : null;
        let email = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].email : null;


        // AMBIL REQUESTOR 
        let sqlGetRequestor = `INSERT INTO alt_approval_head
        (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr,email, [action])
        SELECT TOP 1 createdby, updatedby, alt_supplier_id, createdby ,'${nama}' AS nama, r_department_id, 'N' AS isapprove, 
        alt_audit_approval_id, ${no_appr_data} AS no_appr,
        '${email}' AS email, 'Menerima Cetak Design ' AS action 
        FROM alt_audit_approval aaa WHERE alt_supplier_id = '${alt_supplier_id}' AND kode_status = 'DR'`;

        // console.log(sqlGetRequestor);
        await request.query(sqlGetRequestor);

      

        return res.success({
          message: "Approve successfully "
        });

      }else if(kode_status_now=='11'){


        let sqlGetDataHeader = `SELECT head_number FROM alt_supplier
        WHERE alt_supplier_id='${alt_supplier_id}'`;
        let dataHeader = await request.query(sqlGetDataHeader);
        let head_number = dataHeader.recordset.length > 0 ? dataHeader.recordset[0].head_number : 1;
        let nomor_receiver = head_number == 1 ? 5 : 9;
        let head_number_desciption = head_number == 1 ? 1 : 3;


        
        let kode_status = '12'
        let status = 'Art Work Sudah diterima dan perlu diapprove';

        if(head_number==1){
          kode_status = '13';
        }

        let queryUpdateData = `UPDATE alt_supplier SET 
        kode_status='${kode_status}',
        status='${status}'
        WHERE alt_supplier_id='${alt_supplier_id}'`;
        await request.query(queryUpdateData);

        let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
        let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
        let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
        
        let insetAuditApproval = `INSERT INTO alt_audit_approval
        (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
        VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
        await request.query(insetAuditApproval);


        let sqlGetNoAppr = `SELECT 
        COALESCE(MAX(no_appr),1) AS no_appr 
        FROM alt_approval_head 
        WHERE alt_supplier_id ='${alt_supplier_id}'`;
        let getdatanoappr = await request.query(sqlGetNoAppr);
        let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
        let no_appr_data = no_appr + 1;




        // AMBIL HEAD RECEIVER 3
        let sqlGetReceiverPertama = `INSERT INTO alt_approval_head
        (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr, email, [action])
        SELECT '${m_user_id}' AS createdby, '${m_user_id}' AS updatedby, alt_supplier_id, nip, nama, r_department_id, 'N' AS isapprove, 
        alt_audit_approval_id, ${no_appr_data} AS no_appr, email, 
        'Receiver Dept. Head ${head_number_desciption} melakukan approval' AS [action] from alt_approval_head aah WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr = '${nomor_receiver}'`;
        await request.query(sqlGetReceiverPertama);


        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;

        if(alt_approval_head_id){
          
            let updateStatusApprovedHead = `UPDATE alt_approval_head
            SET isapprove='Y'
            WHERE alt_approval_head_id='${alt_approval_head_id}'`;
            await request.query(updateStatusApprovedHead);

        }
        
        return res.success({
          message: "Approve successfully "
        });

      }else if(kode_status_now=='12'){

        
        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        let kode_status = '13'
        let status = 'Approve Receiver Head 3';
        
        if(alt_approval_head_id){

          //Proses Approve Assproc
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
          await request.query(queryUpdateData);


          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          await request.query(updateStatusApprovedHead);


          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          
          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
          await request.query(insetAuditApproval);

          let sqlGetNoAppr = `SELECT 
          COALESCE(MAX(no_appr),1) AS no_appr 
          FROM alt_approval_head 
          WHERE alt_supplier_id ='${alt_supplier_id}'`;
          let getdatanoappr = await request.query(sqlGetNoAppr);
          let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
          let no_appr_data = no_appr + 1;

          // AMBIL HEAD RECEIVER 1  
          let sqlGetReceiverPertama = `INSERT INTO alt_approval_head
          (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr, email, [action],company_id)
          SELECT '${m_user_id}' AS createdby, '${m_user_id}' AS updatedby, alt_supplier_id, nip, nama, r_department_id, 'N' AS isapprove, 
          alt_audit_approval_id, ${no_appr_data} AS no_appr, email, 
          'Receiver Dept. Head 1 melakukan approval' AS [action],company_id from alt_approval_head aah WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr = '8'`;
          await request.query(sqlGetReceiverPertama);

        }

      

        return res.success({
          message: "Approve successfully "
        });

      }else if(kode_status_now=='13'){


        let sqlGetDataHeader = `SELECT head_number FROM alt_supplier
        WHERE alt_supplier_id='${alt_supplier_id}'`;
        let dataHeader = await request.query(sqlGetDataHeader);
        let head_number = dataHeader.recordset.length > 0 ? dataHeader.recordset[0].head_number : 1;
        let nomor_receiver = head_number == 1 ? 4 : 7;


        let kode_status = '14'
        let status = 'Menunggu Entry No PR';

        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        
        if(alt_approval_head_id){

          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          await request.query(updateStatusApprovedHead);


          let sqlGetNoAppr = `SELECT 
          COALESCE(MAX(no_appr),1) AS no_appr 
          FROM alt_approval_head 
          WHERE alt_supplier_id ='${alt_supplier_id}'`;
          let getdatanoappr = await request.query(sqlGetNoAppr);
          let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
          let no_appr_data = no_appr + 1;

          // PROSES 
          let sqlGetReceiverPertama = `INSERT INTO alt_approval_head
          (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr, email, [action],company_id)
          SELECT '${m_user_id}' AS createdby, '${m_user_id}' AS updatedby, alt_supplier_id, nip, nama, r_department_id, 'N' AS isapprove, 
          alt_audit_approval_id, ${no_appr_data} AS no_appr, email, 
          'Entry Nomor PR' AS [action],company_id from alt_approval_head aah WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr = '${nomor_receiver}'`;
          await request.query(sqlGetReceiverPertama);



          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          
          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
          await request.query(insetAuditApproval);


          
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
          await request.query(queryUpdateData);

  
        return res.success({
          message: "Approve successfully "
        });

      }else{

        return res.error({
          message: "Approve gagal"
        });
      
      }

    }else if(kode_status_now=='14'){

      if(!nomor_pr || nomor_pr===''){

        return res.error('Entry gagal nomor PR tidak boleh kosong');

      }else{

        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        
        if(alt_approval_head_id){

          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          await request.query(updateStatusApprovedHead);


          let kode_status = '15'
          let status = 'Menunggu Entry No PO Oleh Requestor';

          
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}',
          nomor_pr='${nomor_pr}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
          console.log(queryUpdateData);
          await request.query(queryUpdateData);

          
          let sqlGetNoAppr = `SELECT 
          COALESCE(MAX(no_appr),1) AS no_appr 
          FROM alt_approval_head 
          WHERE alt_supplier_id ='${alt_supplier_id}'`;
          let getdatanoappr = await request.query(sqlGetNoAppr);
          let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
          let no_appr_data = no_appr + 1;


          let sqlGetDataRequestor = `SELECT TOP 1 createdby AS nik
          FROM alt_audit_approval aaa WHERE alt_supplier_id = '${alt_supplier_id}' AND kode_status = 'DR'`;
          console.log(sqlGetDataRequestor);
          let getNikRequestor = await request.query(sqlGetDataRequestor);
          let nik_requestor = getNikRequestor.recordset.length > 0 ? getNikRequestor.recordset[0].nik : 1;
  
          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${nik_requestor}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : null;
          let email = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].email : null;

          // AMBIL REQUESTOR 
          let sqlGetRequestor = `INSERT INTO alt_approval_head
          (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr,email, [action])
          SELECT TOP 1 createdby, updatedby, alt_supplier_id, createdby ,'${nama}' AS nama, r_department_id, 'N' AS isapprove, 
          alt_audit_approval_id, ${no_appr_data} AS no_appr,
          '${email}' AS email, 'Entry Nomor PO' AS action 
          FROM alt_audit_approval aaa WHERE alt_supplier_id = '${alt_supplier_id}' AND kode_status = 'DR'`;

          console.log(sqlGetRequestor);
          await request.query(sqlGetRequestor);

          let sqlGetNamaByNikaudit = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNikaudit = await DBPORTAL.query(sqlGetNamaByNikaudit);
          let namaaudit = getNamaByNikaudit.rows.length > 0 ? `'${getNamaByNikaudit.rows[0].name}'` : 'NULL';
          
          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${namaaudit})`;
          await request.query(insetAuditApproval);



          return res.success({
            message: "Approve successfully "
          });

        
        }else{
          return res.error({
            message: "Approve gagal"
          });
        }

      }
    }else if(kode_status_now=='15'){

      if(!nomor_pr || nomor_pr===''){

        return res.error('Entry gagal nomor PO tidak boleh kosong');

      }else{

        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        
        if(alt_approval_head_id){

          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          await request.query(updateStatusApprovedHead);


          let kode_status = '16'
          let status = 'Menunggu Entry No GR';

          
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}',
          nomor_po='${nomor_pr}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
          await request.query(queryUpdateData);

          
          let sqlGetNoAppr = `SELECT 
          COALESCE(MAX(no_appr),1) AS no_appr 
          FROM alt_approval_head 
          WHERE alt_supplier_id ='${alt_supplier_id}'`;
          let getdatanoappr = await request.query(sqlGetNoAppr);
          let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
          let no_appr_data = no_appr + 1;

          // PROSES 
          let sqlGetReceiverPertama = `INSERT INTO alt_approval_head
          (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr, email, [action],company_id)
          SELECT '${m_user_id}' AS createdby, '${m_user_id}' AS updatedby, alt_supplier_id, nip, nama, r_department_id, 'N' AS isapprove, 
          alt_audit_approval_id, ${no_appr_data} AS no_appr, email, 
          'Entry Nomor GR' AS [action],company_id from alt_approval_head aah 
          WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr = '4'`;
          await request.query(sqlGetReceiverPertama);



          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          
          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
          await request.query(insetAuditApproval);


          return res.success({
            message: "Approve successfully "
          });

        
        }else{
          return res.error({
            message: "Approve gagal"
          });
        }

      }
    }else if(kode_status_now=='16'){

      if(!nomor_pr || nomor_pr===''){

        return res.error('Entry gagal nomor GR tidak boleh kosong');

      }else{

        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        
        if(alt_approval_head_id){

          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          await request.query(updateStatusApprovedHead);


          let kode_status = '17'
          let status = 'Menunggu Trial Status Oke';

          
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}',
          nomor_gr='${nomor_pr}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
          await request.query(queryUpdateData);

          
          let sqlGetNoAppr = `SELECT 
          COALESCE(MAX(no_appr),1) AS no_appr 
          FROM alt_approval_head 
          WHERE alt_supplier_id ='${alt_supplier_id}'`;
          let getdatanoappr = await request.query(sqlGetNoAppr);
          let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
          let no_appr_data = no_appr + 1;

          // PROSES 
          let sqlGetReceiverPertama = `INSERT INTO alt_approval_head
          (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr, email, [action],company_id)
          SELECT '${m_user_id}' AS createdby, '${m_user_id}' AS updatedby, alt_supplier_id, nip, nama, r_department_id, 'N' AS isapprove, 
          alt_audit_approval_id, ${no_appr_data} AS no_appr, email, 
          'Menunggu Trial Status Oke' AS [action],company_id from alt_approval_head aah 
          WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr = '4'`;
          await request.query(sqlGetReceiverPertama);


          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          
          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
          await request.query(insetAuditApproval);


          return res.success({
            message: "Approve successfully "
          });

        
        }else{
          return res.error({
            message: "Approve gagal"
          });
        }

      }
    }else if(kode_status_now=='17'){

        let sqlGetDataHeader = `SELECT head_number FROM alt_supplier
        WHERE alt_supplier_id='${alt_supplier_id}'`;
        let dataHeader = await request.query(sqlGetDataHeader);
        let head_number = dataHeader.recordset.length > 0 ? dataHeader.recordset[0].head_number : 1;
        let nomor_receiver = head_number == 1 ? 3 : 8;


        let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
        WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
        let getapprovalhead = await request.query(sqlgetapprovalhead);
        let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
        
        if(alt_approval_head_id){

          let updateStatusApprovedHead = `UPDATE alt_approval_head
          SET isapprove='Y'
          WHERE alt_approval_head_id='${alt_approval_head_id}'`;
          await request.query(updateStatusApprovedHead);

          let kode_status = '18'
          let status = 'Menunggu Approval Akhir Head Receiver 1';

          
          let queryUpdateData = `UPDATE alt_supplier SET 
          kode_status='${kode_status}',
          status='${status}'
          WHERE alt_supplier_id='${alt_supplier_id}'`;
          await request.query(queryUpdateData);

          
          let sqlGetNoAppr = `SELECT 
          COALESCE(MAX(no_appr),1) AS no_appr 
          FROM alt_approval_head 
          WHERE alt_supplier_id ='${alt_supplier_id}'`;
          let getdatanoappr = await request.query(sqlGetNoAppr);
          let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
          let no_appr_data = no_appr + 1;

          // AMBIL HEAD RECEIVER 1  
          let sqlGetReceiverPertama = `INSERT INTO alt_approval_head
          (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr, email, [action],company_id)
          SELECT '${m_user_id}' AS createdby, '${m_user_id}' AS updatedby, alt_supplier_id, nip, nama, r_department_id, 'N' AS isapprove, 
          alt_audit_approval_id, ${no_appr_data} AS no_appr, email, 
          'Menunggu Approval Akhir Head Receiver 1' AS [action],company_id from alt_approval_head aah 
          WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr = '${nomor_receiver}'`;
          await request.query(sqlGetReceiverPertama);



          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          
          let insetAuditApproval = `INSERT INTO alt_audit_approval
          (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
          VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
          await request.query(insetAuditApproval);


          return res.success({
            message: "Approve successfully "
          });

        
        }else{
          return res.error({
            message: "Approve gagal"
          });
        }
    }else if(kode_status_now=='18'){

      let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
      WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
      let getapprovalhead = await request.query(sqlgetapprovalhead);
      let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
      
      if(alt_approval_head_id){

        let updateStatusApprovedHead = `UPDATE alt_approval_head
        SET isapprove='Y'
        WHERE alt_approval_head_id='${alt_approval_head_id}'`;
        await request.query(updateStatusApprovedHead);

        let kode_status = '19'
        let status = 'Finish dan Ready to Masspro';

        
        let queryUpdateData = `UPDATE alt_supplier SET 
        kode_status='${kode_status}',
        status='${status}'
        WHERE alt_supplier_id='${alt_supplier_id}'`;
        await request.query(queryUpdateData);

        let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
        let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
        let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
        
        let insetAuditApproval = `INSERT INTO alt_audit_approval
        (createdby, updatedby, alt_supplier_id, kode_status, status,nama)
        VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', '${kode_status}', '${status}',${nama})`;
        await request.query(insetAuditApproval);


        return res.success({
          message: "Approve successfully "
        });

      
      }else{
        return res.error({
          message: "Approve gagal"
        });
      }
  }

    } catch (err) {
      return res.error(err);
    }
  },
  result: async function(req, res) {
    const {m_user_id,alt_supplier_id,result_noted,pic,pic_name,
      r_department_id,created_name,kode_status,alt_audit_approval_id,statusMaterial,link,company_id} = JSON.parse(req.body.document);

    console.log(JSON.parse(req.body.document));

    await DB.poolConnect;
    try {
      req.file('files')
      .upload({
        maxBytes: 150000000
      }, async function whenDone(err, uploadedFiles) {
        const request = DB.pool.request();

              for (let i = 0; i < uploadedFiles.length; i++) {

                let filename = uploadedFiles[i].filename;

                if(filename){

                  let insertFile = `INSERT INTO alt_supplier_result_file
                  (createdby, updatedby, alt_audit_approval_id, nama_file)
                  VALUES('${m_user_id}', '${m_user_id}', 
                  '${alt_audit_approval_id}', '${filename}')`;
                  await request.query(insertFile);
                
                }

            
              }

              let status = 'Testing Result';
              let step = Number(kode_status) + 1;
              console.log('step ',step);


              if(kode_status=='9'){
                status = 'Upload Design'
              }else if(kode_status=='3'){
                status = 'Testing Result Receiver 1'
              }else if(kode_status=='5'){
                status = 'Testing Result Receiver 2'
              }else if(kode_status=='6'){
                status = `Receiver Mengisikan Result dari permintaan requestor`
              }

              let queryUpdateData = `UPDATE alt_supplier SET 
              kode_status='${step}',
              status='${status}'
              WHERE alt_supplier_id='${alt_supplier_id}'`;
              await request.query(queryUpdateData);

              let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
              let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
              let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';


              if(statusIntegasi=='DEV'){
                axios.defaults.baseURL = 'https://esalesdev.enesis.com/api/';
              }else{
                axios.defaults.baseURL = 'https://esales.enesis.com/api/';
              }

              let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
              let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
              let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
              

              // AUDIT ACTION SETIAP PROSES
              let insetAuditApproval = `INSERT INTO alt_audit_approval
              (alt_audit_approval_id,createdby, updatedby, alt_supplier_id, 
              kode_status, status,r_department_id,nama)
              VALUES('${alt_audit_approval_id}','${m_user_id}', '${m_user_id}','${alt_supplier_id}',
              '${kode_status}', '${status}','${r_department_id}',${nama})`;

              await request.query(insetAuditApproval);


              let linkText = link ? `'${link}'` : 'NULL';


              let insertResult = `INSERT INTO alt_supplier_result
              (createdby, updatedby, alt_supplier_id, result_noted,alt_audit_approval_id,link)
              VALUES('${m_user_id}', '${m_user_id}','${alt_supplier_id}', 
              '${result_noted}','${alt_audit_approval_id}',${linkText})`;

              await request.query(insertResult);


              let sqlgetPicTesting = `SELECT * FROM alt_approval_pic aap 
              WHERE alt_supplier_id='${alt_supplier_id}' AND istesting='N' 
              ORDER BY created ASC`;
              let pictesting = await request.query(sqlgetPicTesting);
              let alt_approval_pic_id = pictesting.recordset.length > 0 ? pictesting.recordset[0].alt_approval_pic_id : null;


              let statusMaterialText = statusMaterial ? `'${statusMaterial}'` : 'NULL';
    

              if(alt_approval_pic_id){

                let updatePicSelesaiTesting = `UPDATE alt_approval_pic 
                SET istesting='Y',alt_audit_approval_id='${alt_audit_approval_id}',
                status_material=${statusMaterialText},
                link=${linkText}
                WHERE alt_approval_pic_id='${alt_approval_pic_id}'`;
                await request.query(updatePicSelesaiTesting);

              }


              if(kode_status=='3'){


      

                let sqlGetDataHeader = `SELECT r_department_id FROM alt_supplier
                WHERE alt_supplier_id='${alt_supplier_id}'`;
                let dataHeader = await request.query(sqlGetDataHeader);
                let departmentyangdituju = dataHeader.recordset.length > 0 ? dataHeader.recordset[0].r_department_id : 'KOSONG';

                // MENCARI DEPT HEAD DEPARTMENT
                console.log('r_department_id ',r_department_id);
                if(r_department_id && departmentyangdituju!=r_department_id){


                  let sqlUpdateHeader = `UPDATE alt_supplier SET head_number=2 WHERE alt_supplier_id ='${alt_supplier_id}'`;
                  await request.query(sqlUpdateHeader);

                  let sqlGetDeptHead = `SELECT * FROM v_headcount WHERE org_id = '${r_department_id}' ORDER BY grade_interval DESC LIMIT 1`;
                  let getDeptHeadByDepartmentId = await DBEMPLOYEE.query(sqlGetDeptHead);
                  let nip = getDeptHeadByDepartmentId.rows.length > 0 ? getDeptHeadByDepartmentId.rows[0].employee_id : null;
                  let nama = getDeptHeadByDepartmentId.rows.length > 0 ? getDeptHeadByDepartmentId.rows[0].display_name : null;
                  let internal_title = getDeptHeadByDepartmentId.rows.length > 0 ? getDeptHeadByDepartmentId.rows[0].internal_title : null;


                  let nip_text = nip ? `'${nip}'` : 'NULL';
                  let nama_text = nama ? `'${nama}'` : 'NULL';
                  let action_text = internal_title ? `'Approval ${internal_title}'` : 'NULL';


                  let email = null;
                  if(nip){

                    let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${nip}'`;
                    let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
                    email = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].email : null;

                  }

                  let email_text = email ? `'${email}'` : 'NULL';

                  let sqlGetNoAppr = `SELECT 
                  COALESCE(MAX(no_appr),1) AS no_appr 
                  FROM alt_approval_head 
                  WHERE alt_supplier_id ='${alt_supplier_id}'`;
                  let getdatanoappr = await request.query(sqlGetNoAppr);
                  let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
                  let no_appr_data = no_appr + 1;


                  let insertHead = `INSERT INTO alt_approval_head
                  (createdby, updatedby, alt_supplier_id, nip,nama,r_department_id,no_appr,email,action,company_id)
                  VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}',
                  ${nip_text},${nama_text}, '${r_department_id}',${no_appr_data},${email_text},${action_text},'${company_id}')`;

                  // console.log(insertHead);
                  await request.query(insertHead);
                  

                  let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
                  WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
                  let getapprovalhead = await request.query(sqlgetapprovalhead);
                  let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;

                  if(alt_approval_head_id){

                    let updateStatusApprovedHead = `UPDATE alt_approval_head
                    SET isapprove='Y'
                    WHERE alt_approval_head_id='${alt_approval_head_id}'`;
                    await request.query(updateStatusApprovedHead);
                    
                  }
                

                  return res.success({
                    message: "Testing Result successfully"
                  });

                }else{

                  // DAPARTMENT LAIN TIDAK DIBUTUHKAN

                  let queryUpdateData = `UPDATE alt_supplier SET 
                  kode_status='7',
                  status='Waiting Approval Dept Head Receiver 1'
                  WHERE alt_supplier_id='${alt_supplier_id}'`;
                  await request.query(queryUpdateData);

                  
                  let sqlGetNoAppr = `SELECT 
                  COALESCE(MAX(no_appr),1) AS no_appr 
                  FROM alt_approval_head 
                  WHERE alt_supplier_id ='${alt_supplier_id}'`;
                  let getdatanoappr = await request.query(sqlGetNoAppr);
                  let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
                  let no_appr_data = no_appr + 1;


                  // AMBIL HEAD RECEIVER 1            
                  let sqlGetReceiverPertama = `INSERT INTO alt_approval_head
                  (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr, email, [action])
                  SELECT '${m_user_id}' AS createdby, '${m_user_id}' AS updatedby, alt_supplier_id, nip, nama, r_department_id, 'N' AS isapprove, 
                  alt_audit_approval_id, ${no_appr_data} AS no_appr, email, 
                  'Receiver Dept. Head melakukan approval' AS [action] from alt_approval_head aah WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr = '3'`;
                  await request.query(sqlGetReceiverPertama);
  
        
                  // PROSES UPDATE APPROVAL
  
                  let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
                  WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
                  let getapprovalhead = await request.query(sqlgetapprovalhead);
                  let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;
  
                  if(alt_approval_head_id){
  
                    let updateStatusApprovedHead = `UPDATE alt_approval_head
                    SET isapprove='Y'
                    WHERE alt_approval_head_id='${alt_approval_head_id}'`;
                    await request.query(updateStatusApprovedHead);
                    
                  }
                


                  return res.success({
                    message: "Testing Result successfully Bro"
                  });

                }
              

                
              }else if(kode_status=='5'){


                
                // PROSES UPDATE APPROVAL

                let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
                WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
                let getapprovalhead = await request.query(sqlgetapprovalhead);
                let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;

                if(alt_approval_head_id){

                  let updateStatusApprovedHead = `UPDATE alt_approval_head
                  SET isapprove='Y'
                  WHERE alt_approval_head_id='${alt_approval_head_id}'`;
                  await request.query(updateStatusApprovedHead);
                  

                }


                let sqlGetNoAppr = `SELECT 
                COALESCE(MAX(no_appr),1) AS no_appr 
                FROM alt_approval_head 
                WHERE alt_supplier_id ='${alt_supplier_id}'`;
                let getdatanoappr = await request.query(sqlGetNoAppr);
                let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
                let no_appr_data = no_appr + 1;

                // AMBIL RECEIVER 1
                let sqlGetReceiverPertama = `INSERT INTO alt_approval_head
                (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr, email, [action],company_id)
                SELECT '${m_user_id}' AS createdby, '${m_user_id}' AS updatedby, alt_supplier_id, nip, nama, r_department_id, 'N' AS isapprove, alt_audit_approval_id, ${no_appr_data} AS no_appr, email, 
                'Receiver melakukan result dari permintaan requestor' AS [action],company_id from alt_approval_head aah WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr = '4'`;
                await request.query(sqlGetReceiverPertama);


                let sqlgetNipPic = `SELECT nip,email from alt_approval_head aah WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr = '4'`;
                let dataNipPic = await request.query(sqlgetNipPic);
                let nipPic = dataNipPic.recordset.length > 0 ? dataNipPic.recordset[0].nip : null;
                let email = dataNipPic.recordset.length > 0 ? dataNipPic.recordset[0].email : null;


                let sqlPembetukanDataPic = `
                INSERT INTO alt_approval_pic
                (createdby, updatedby, alt_supplier_id, nip, r_department_id, istesting, alt_audit_approval_id, nama, pic_email, pic_spv_name, pic_spv_email,company_id)
                SELECT '${m_user_id}' AS createdby, '${m_user_id}' AS updatedby, alt_supplier_id, nip, r_department_id,'N' AS istesting, 
                alt_audit_approval_id, nama, pic_email, pic_spv_name, pic_spv_email,company_id
                FROM alt_approval_pic WHERE alt_supplier_id = '${alt_supplier_id}' AND pic_email='${email}' AND nip='${nipPic}'`;
                await request.query(sqlPembetukanDataPic);


                return res.success({
                  message: "Testing Result successfully"
                });

              }else if(kode_status=='6'){

                
                let sqlGetNoAppr = `SELECT 
                COALESCE(MAX(no_appr),1) AS no_appr 
                FROM alt_approval_head 
                WHERE alt_supplier_id ='${alt_supplier_id}'`;
                let getdatanoappr = await request.query(sqlGetNoAppr);
                let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
                let no_appr_data = no_appr + 1;

              
                // AMBIL HEAD RECEIVER 1            
                let sqlGetReceiverPertama = `INSERT INTO alt_approval_head
                (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr, email, [action])
                SELECT '${m_user_id}' AS createdby, '${m_user_id}' AS updatedby, alt_supplier_id, nip, nama, r_department_id, 'N' AS isapprove, 
                alt_audit_approval_id, ${no_appr_data} AS no_appr, email, 
                'Receiver Dept. Head melakukan approval' AS [action] from alt_approval_head aah WHERE alt_supplier_id = '${alt_supplier_id}' AND no_appr = '3'`;
                await request.query(sqlGetReceiverPertama);

      
                // PROSES UPDATE APPROVAL

                let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
                WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
                let getapprovalhead = await request.query(sqlgetapprovalhead);
                let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;

                if(alt_approval_head_id){

                  let updateStatusApprovedHead = `UPDATE alt_approval_head
                  SET isapprove='Y'
                  WHERE alt_approval_head_id='${alt_approval_head_id}'`;
                  await request.query(updateStatusApprovedHead);
                  
                }
              

                return res.success({
                  message: "Testing Result successfully"
                });

                
              }else if(kode_status=='9'){

                // PROSES UPDATE APPROVAL
                let sqlgetapprovalhead = `SELECT TOP 1 alt_approval_head_id FROM alt_approval_head 
                WHERE alt_supplier_id = '${alt_supplier_id}' AND isapprove='N' AND nip='${m_user_id}' ORDER BY no_appr ASC`;
                let getapprovalhead = await request.query(sqlgetapprovalhead);
                let alt_approval_head_id = getapprovalhead.recordset.length > 0 ? getapprovalhead.recordset[0].alt_approval_head_id : null;

                if(alt_approval_head_id){

                  let updateStatusApprovedHead = `UPDATE alt_approval_head
                  SET isapprove='Y'
                  WHERE alt_approval_head_id='${alt_approval_head_id}'`;
                  await request.query(updateStatusApprovedHead);


                  let sqlGetNoAppr = `SELECT 
                  COALESCE(MAX(no_appr),1) AS no_appr 
                  FROM alt_approval_head 
                  WHERE alt_supplier_id ='${alt_supplier_id}'`;
                  let getdatanoappr = await request.query(sqlGetNoAppr);
                  let no_appr = getdatanoappr.recordset.length > 0 ? getdatanoappr.recordset[0].no_appr : 1;
                  let no_appr_data = no_appr + 1;


                  // PROSES PEMBENTUKAN APPROVAL VENDOR
                  let sqlGetVendor = `INSERT INTO alt_approval_head
                  (createdby, updatedby, alt_supplier_id, nip, nama, r_department_id, isapprove, alt_audit_approval_id, no_appr, email, [action],company_id)
                  SELECT kode_vendor AS createdby, kode_vendor AS updatedby, alt_supplier_id, kode_vendor AS nip, nama_vendor as nama, r_department_id, 'N' AS isapprove,null as alt_audit_approval_id, 
                  ${no_appr_data} AS no_appr, null as email,'Vendor Proses Cetak Design' AS [action],company_id from alt_supplier WHERE alt_supplier_id = '${alt_supplier_id}'`;
                  await request.query(sqlGetVendor);
  
                  
                }
              

                return res.success({
                  message: "Upload Result successfully"
                });

              }

    });
    } catch (err) {
      return res.error(err);
    }
  },
  download: async function(req, res) {
    try {

      const alt_audit_approval_id = req.param('alt_audit_approval_id');
      const alt_supplier_id = req.param('alt_supplier_id');

      // console.log('alt_audit_approval_id ',alt_audit_approval_id);
      // console.log('alt_supplier_id ',alt_supplier_id);
      let direktori = `alternativesupplierresult`;
      let id = alt_audit_approval_id;
      if(alt_audit_approval_id){
        direktori = `alternativesupplierresult`;
        id = alt_audit_approval_id;
      }else{
        direktori = `alternativesupplierdokumen`;
        id = alt_supplier_id;
      }

      const nama_file = req.param('nama_file');

      // console.log('direktori ',direktori);
      // console.log('id ',id);
      // console.log('nama_file ',nama_file);
      const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( `${direktori}`, id), nama_file.replace(/\.[^/.]+$/, "")) + '*');
      // console.log(filesamaDir);
      if (filesamaDir.found.length > 0) {
          var lastItemAkaFilename = path.basename(filesamaDir.found[0]);
          console.log(lastItemAkaFilename);
          return res.download(filesamaDir.found[0], lastItemAkaFilename);
      }
      return res.error('Failed, File Not Found');

    } catch (err) {
      return res.error(err);
    }
  }

 };
 


 async function uploadFiles(id,files){

  try {
    for (const file of files) {
      filenames = file.filename;
      fs.mkdirSync(dokumentPath( 'alternativesupplierresult', id), {
          recursive: true
      })
      const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( 'alternativesupplierresult', id), file.filename.replace(/\.[^/.]+$/, "")) + '*')
      console.log(filesamaDir);

      if (filesamaDir.found.length > 0) {
          console.log('isexist file nama sama', filesamaDir.found[0])
          fs.unlinkSync(filesamaDir.found[0])
      }
      // console.log(filesamaDir);
      fs.renameSync(file.fd, path.resolve(dokumentPath( 'alternativesupplierresult', id), file.filename))
    }
    

    return {
      status :true,
      message : 'Upload Data Successfully'
    };

  } catch (error) {
    return {
      status :false,
      message : 'Upload Gagal'
    };
  }
    
}
