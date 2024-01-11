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
const DBPROCUREMENT = require('./../../../services/DBPROCUREMENT'); 
const DBEMPLOYEE = require('./../../../services/DBEMPLOYEE');
 module.exports = {
   // GET ALL RESOURCE
   find: async function (req, res) {
    const {
      query: {currentPage, pageSize,m_user_id,menu}
    } = req;


    // console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let whereClauseUserId = "";
      let whereClauseApproval = "";
      let whereHistoryVendor = "";


      

      if(menu=='list_request'){
       whereClauseUserId = `AND createdby = '${m_user_id}'`;
      }else if(menu=='list_approval'){
        whereClauseApproval = `AND position_approval = '${m_user_id}'`;
      }else if(menu=='list_need_result'){
        whereClauseApproval = `AND position_approval = '${m_user_id}'`;
      }else if(menu=='list_cetak'){
        whereClauseApproval = `AND kode_vendor = '${m_user_id}' AND kode_status = '10'`;
      }
      
      let queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM alt_supplier_v WHERE 1=1 ${whereClauseUserId} ${whereClauseApproval}`;
                           
                            
      let queryDataTable = `SELECT alt_supplier_id,documentno, isactive, 
      created, createdby, updated, updatedby, 
      r_department_id, r_jenis_supplier_id, m_kategori_material_id, 
      objective_tujuan, material_service_name, specification, material_service_code,
      unit_of_measure, minimum_order_quantity, 
      usage_planning, due_date, others_note, kode_status, 
      status, reason,department,jenis_supplier,
      group_material,kategori_material,isexclusive,
      position_approval,purchase_info,nama_vendor
      FROM alt_supplier_v WHERE 1=1 ${whereClauseUserId} ${whereClauseApproval}
      ORDER BY created DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY`;


      if(menu=='list_history' || menu=='list_cetak_history'){

        queryDataTable = `SELECT DISTINCT a.alt_supplier_id,a.documentno, a.isactive, 
        a.created, a.createdby, a.updated, a.updatedby, 
        a.r_department_id, a.r_jenis_supplier_id, a.m_kategori_material_id, 
        CAST(a.objective_tujuan AS VARCHAR) AS objective_tujuan, a.material_service_name, CAST(a.specification AS VARCHAR) AS specification, a.material_service_code,
        a.unit_of_measure, a.minimum_order_quantity, 
        CAST(a.usage_planning AS VARCHAR) AS usage_planning, due_date, CAST(a.others_note AS VARCHAR) AS others_note, a.kode_status, 
        a.status, CAST(a.reason AS VARCHAR) AS reason,a.department,a.jenis_supplier,
        a.group_material,a.kategori_material,a.isexclusive,
        a.position_approval,CAST(a.purchase_info  AS VARCHAR) AS purchase_info,nama_vendor
        FROM alt_supplier_v a JOIN alt_approval_head aah ON a.alt_supplier_id  = aah.alt_supplier_id 
        WHERE 1=1 AND aah.nip = '${m_user_id}'
        ORDER BY a.created DESC
        OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY`;

        queryCountTable = `SELECT DISTINCT COUNT(1) AS total_rows
        FROM alt_supplier_v a JOIN alt_approval_head aah ON a.alt_supplier_id  = aah.alt_supplier_id WHERE 1=1 AND aah.nip = '${m_user_id}'`;

      }

       
      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      console.log(queryDataTable);

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);
        /**
         * {
         *    result : data utama,
         *    meta : data tambahan ( optional ),
         *    status : status response ( optional),
         *    message : pesan ( optional )
         * }
         */
        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  findOne: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT * FROM alt_supplier_v WHERE alt_supplier_id='${req.param(
        "id"
      )}'`;

      console.log(queryDataTable);

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];

        let sqlgetapproval = `SELECT 
        alt_audit_approval_id,nama,
        status,
        convert(varchar, created, 20) AS created,
        createdby,reason,kode_status  
        FROM alt_audit_approval 
        WHERE alt_supplier_id = '${row.alt_supplier_id}' ORDER BY created DESC`;

        // console.log(sqlgetapproval);
        
        let getapproval = await request.query(sqlgetapproval);
        let dataapproval = getapproval.recordset;

        let r_department_id = row.r_department_id;
        let sqlGetHeadNameDepartment = `SELECT display_name,internal_title 
        FROM v_headcount where org_id ='${r_department_id}' order by grade_interval desc limit 1`;


        let getdata = await DBEMPLOYEE.query(sqlGetHeadNameDepartment);
        let data = getdata.rows[0];
        row.head_dept_nama = data.display_name ? data.display_name : 'KOSONG';

        // console.log('data ',data);

        for (let i = 0; i < dataapproval.length; i++) {

              let nomor = i +1;
              dataapproval[i].nomor = nomor;
              let alt_audit_approval_id = dataapproval[i].alt_audit_approval_id;

              let sqlgetresultfile = `SELECT a.alt_audit_approval_id,a.result_noted,b.nama_file,a.link
              FROM alt_supplier_result a 
              LEFT JOIN alt_supplier_result_file b ON(a.alt_audit_approval_id = b.alt_audit_approval_id)
              WHERE a.alt_audit_approval_id='${alt_audit_approval_id}'`;
              console.log('hahaha ',sqlgetresultfile);
              let getfileresult = await request.query(sqlgetresultfile);
              let dataresultfile = getfileresult.recordset;
              for (let j = 0; j < dataresultfile.length; j++) {
                dataresultfile[j].nomor = j+1;
              }
              dataapproval[i].result_files = dataresultfile;
        }

       
        let sqlgetlistpic = `SELECT 
        a.alt_approval_pic_id,
        a.nip,
        a.nama,
        a.department,
        a.status_testing,
        a.istesting,
        a.alt_audit_approval_id,
        a.status_material,
        a.link,
        a.created
        FROM alt_approval_pic_v a
        WHERE a.alt_supplier_id = '${row.alt_supplier_id}' ORDER BY a.created DESC`;

        let getlistpic = await request.query(sqlgetlistpic);
        let datapic = getlistpic.recordset;

        for (let i = 0; i < datapic.length; i++) {
            let nomor = i +1;
            datapic[i].nomor = nomor;   
        }


        let sqlgetlistapproval = `SELECT a.alt_approval_head_id, a.isactive, a.alt_supplier_id, 
        a.nip, a.nama, b.nama AS department,
        CASE WHEN a.isapprove='Y' THEN 'Sudah' ELSE 'Belum' END AS status_approval,
        a.action
        FROM alt_approval_head a
        LEFT JOIN r_department b ON(a.r_department_id = b.r_department_id)
        WHERE a.alt_supplier_id = '${row.alt_supplier_id}' ORDER BY no_appr DESC`;

        // console.log(sqlgetlistapproval);

        let getlistapproval = await request.query(sqlgetlistapproval);
        let datalistapproval = getlistapproval.recordset;

        for (let i = 0; i < datalistapproval.length; i++) {
            let nomor = i +1;
            datalistapproval[i].nomor = nomor;   
        }


        let sqlgetFile = `SELECT * from alt_supplier_document 
        WHERE alt_supplier_id  = '${row.alt_supplier_id}'`;

        let getlistfile = await request.query(sqlgetFile);
        let datafile = getlistfile.recordset;
        for (let i = 0; i < datafile.length; i++) {
          let nomor = i +1;
          datafile[i].nomor = nomor;   
        }


        let sqlGetUploadDesign = `SELECT TOP 1 alt_audit_approval_id from alt_audit_approval aaa 
        WHERE alt_supplier_id = '${row.alt_supplier_id}' ORDER BY created DESC`;

        let getUploadDesign = await request.query(sqlGetUploadDesign);
        let alt_audit_approval_id = getUploadDesign.recordset.length > 0 ? getUploadDesign.recordset[0].alt_audit_approval_id : null;

        row.approvals = dataapproval;
        row.listapproval = datalistapproval;
        row.listpic = datapic;
        row.listfile = datafile;
        row.alt_audit_approval_id = alt_audit_approval_id;


        let sqlGetDataCompanyAndDepartment = `SELECT TOP 1 r_department_id,company_id FROM alt_approval_head aah 
        WHERE alt_supplier_id = '${row.alt_supplier_id}' 
        AND isapprove='N' AND r_department_id IS NOT NULL AND company_id IS NOT NULL`;
        let dataCompanyAndDepartment = await request.query(sqlGetDataCompanyAndDepartment);
        let department_id = dataCompanyAndDepartment.recordset.length > 0 ? dataCompanyAndDepartment.recordset[0].r_department_id : null;
        let company_id = dataCompanyAndDepartment.recordset.length > 0 ? dataCompanyAndDepartment.recordset[0].company_id : null;


        row.r_department_id = department_id ? department_id : row.r_department_id;
        row.company_id = company_id ? company_id : row.company_id;

        console.log('department_id ',department_id);
        console.log('company_id ',company_id);
      

        // console.log(row);

        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  getApproval: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT COUNT(1) AS jumlah_data FROM alt_supplier_v asv WHERE kode_status <> 'RJC' AND position_approval ='${req.param(
        "nip"
      )}'`;

      //console.log(queryDataTable);

      let getdataapproval = await request.query(queryDataTable);
      let dataapproval = getdataapproval.recordset[0].jumlah_data;

      return res.success({
        result: dataapproval,
        message: "Fetch data successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },
  getTesting: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT COUNT(1) AS jumlah_data 
      FROM alt_approval_head aah,alt_supplier alt 
      WHERE aah.isapprove = 'N'
      AND aah.alt_supplier_id = alt.alt_supplier_id
      AND alt.kode_status <> 'RJC'
      AND alt.kode_status IN('3','5','6','9','10','11','14','15','16','17')
      AND aah.nip='${req.param(
        "nip"
      )}'`;

      //console.log(queryDataTable);

      let getdataapproval = await request.query(queryDataTable);
      let dataapproval = getdataapproval.recordset[0].jumlah_data;

      return res.success({
        result: dataapproval,
        message: "Fetch data successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },
   create: async function(req, res) {
    const {alt_supplier_id,m_user_id,selecteddepartment,jenis_supplier,detail_kategori,
      objectives,other,material_service_code,specification,
      uom,moq,usage_planning,due_date,created_name,
      created_email,vendor_code,purchase_info,nama_department,create_alternative_supplier_id,
      company_id,headDepartmentNik,headDepartment,
      iscoa,ismsds,ishalalsertifikat,plant} = JSON.parse(req.body.document);




      let coa = iscoa ? 'Y' : 'N';
      let msds = ismsds ? 'Y' : 'N';
      let halalsertifikat = ishalalsertifikat ? 'Y' : 'N';
      let plant_text = plant ? `'${plant}'` : 'NULL';
      let usage_planning_text = usage_planning ? `'${usage_planning}'` : 'NULL';

      let kode_material = material_service_code;

      let sqlgetMaterialName = `SELECT * FROM master_materials WHERE code = '${kode_material}'`;
      let dataMeterial = await DBPROCUREMENT.query(sqlgetMaterialName);
      let nama_material = dataMeterial.rows.length > 0 ? dataMeterial.rows[0].description : null;
      


      // Mengambil nama vendor
      let sqlgetVendorName = `SELECT * FROM vendors WHERE code = '${vendor_code}'`;
      let dataVendor = await DBPROCUREMENT.query(sqlgetVendorName);
      
      let nama_vendor = dataVendor.rows.length > 0 ? dataVendor.rows[0].company_name : null;
      let kode_vendor = vendor_code;
      

    await DB.poolConnect;
    try {
      req.file('files')
      .upload({
        maxBytes: 550000000
      }, async function whenDone(err, uploadedFiles) {
      const request = DB.pool.request();

      console.log(alt_supplier_id);

      let tahun = moment().format('YYYY');
      let bulan = moment().format('MM');
      let timestamp = moment().unix();


      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

      if(statusIntegasi=='DEV'){
        axios.defaults.baseURL = 'https://esalesdev.enesis.com/api/';
      }else{
        axios.defaults.baseURL = 'https://esales.enesis.com/api/';
      }

      //axios.defaults.baseURL = 'http://localhost:1337/';

      let documentno = tahun.concat('/').concat(bulan).concat('/').concat(timestamp);
      if(alt_supplier_id!='alternative-supplier-create' && alt_supplier_id){


        for (let i = 0; i < uploadedFiles.length; i++) {
            
          let filename = uploadedFiles[i].filename;
          let insertFile = `INSERT INTO alt_supplier_document
          (createdby, updatedby, alt_supplier_id, nama_file)
          VALUES('${m_user_id}', '${m_user_id}', '${alt_supplier_id}', '${filename}')`;
          await request.query(insertFile);

        }
          

          let queryUpdatetData = `UPDATE 
          alt_supplier
          SET updated=getdate(),
          kode_vendor= '${kode_vendor}',
          nama_vendor= '${nama_vendor}', 
          updatedby='${m_user_id}', 
          r_jenis_supplier_id='${jenis_supplier}', 
          m_kategori_material_id='${detail_kategori}', 
          objective_tujuan='${objectives}', 
          purchase_info='${purchase_info}', 
          material_service_name='${nama_material}',
          material_service_code='${kode_material}',
          specification='${specification}', 
          unit_of_measure='${uom}', 
          minimum_order_quantity=${moq},
          usage_planning=${usage_planning_text},
          r_department_id = '${selecteddepartment}',
          due_date='${due_date}', 
          others_note='${other}',
          kode_status='DR',
          status='Revisi Pengajuan',
          iscoa='${coa}',
          ismsds='${msds}',
          ishalalsertifikat='${halalsertifikat}',
          plant=${plant_text}
          WHERE alt_supplier_id='${alt_supplier_id}'`;



          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          let email = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].email}'` : 'NULL';


          let insertPengajuan = `INSERT INTO alt_audit_approval
          (createdby, updatedby, 
          alt_supplier_id, kode_status, status,nama,email)
          VALUES('${m_user_id}','${m_user_id}', '${alt_supplier_id}', 
          'DR', 'Revisi Pengajuan',${nama},${email})`;


          // INSERT AUDIT PENGAJUAN
          await request.query(insertPengajuan);


          // PROSES PEMBENTUKAN APPROVAL SATU DAN 2
          let sqlGetDataApproval = `SELECT nip, nama, nip_sect_head, nama_sect_head, nip_head, nama_head, kode_group_material
          FROM creator_group_material_alt_supplier WHERE nip ='${m_user_id}'`;

          let getDataApproval = await request.query(sqlGetDataApproval);
          let dataapproval = getDataApproval.recordset.length > 0 ? getDataApproval.recordset : null;

          let nip_sect_head = dataapproval.length > 0 ? dataapproval[0].nip_sect_head : null;
          let nip_head = dataapproval.length > 0 ? dataapproval[0].nip_head : null;

          let arrayDataApproval = [];

          if(nip_sect_head){
            arrayDataApproval.push({
              urutan:1,
              username:nip_sect_head,
              action:'Approval Sect. Head Requestor'
            });
          }

  
          if(nip_head){
            arrayDataApproval.push({
              urutan:2,
              username:nip_head,
              action:'Approval Dept. Head Requestor'
            });
          }

          arrayDataApproval.push({
            urutan:4,
            username:'-',
            action:'Receiver 1 Melalukan test dari permintaan requestor atas persetujuan Head Receiver 1'
          });

          // console.log(arrayDataApproval);


          for (let i = 0; i < arrayDataApproval.length; i++) {

              let urutan = arrayDataApproval[i].urutan;
              let username = arrayDataApproval[i].username;
              let action = arrayDataApproval[i].action;

              let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${username}'`;
              let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
              let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : null;
              let email = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].email : null;

              let nama_text = nama ? nama : '?';
              let email_text = email ? email : '?';

              let insertHeadApprove = `INSERT INTO alt_approval_head
              (createdby, updatedby, alt_supplier_id, nip,nama,no_appr,email,action)
              VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}','${username}',
              '${nama_text}',${urutan},'${email_text}','${action}')`;
              await request.query(insertHeadApprove);

              //console.log(insertHeadApprove);
            
          }

            let nama_head_text = headDepartment ? headDepartment : '?';
            let username_head_text = headDepartmentNik ? headDepartmentNik : '?';


            let insertHeadApprove = `INSERT INTO alt_approval_head
            (createdby, updatedby, alt_supplier_id, nip,nama,no_appr,email,action)
            VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}','${username_head_text}',
            '${nama_head_text}',3,'Receiver Head 1','Delegated to team')`;
            await request.query(insertHeadApprove);
              
      
              
            for (let i = 0; i < uploadedFiles.length; i++) {
                
              let filename = uploadedFiles[i].filename;
              let insertFile = `INSERT INTO alt_supplier_document
              (createdby, updatedby, alt_supplier_id, nama_file)
              VALUES('${m_user_id}', '${m_user_id}', '${alt_supplier_id}', '${filename}')`;
              await request.query(insertFile);

            }

          
           console.log(queryUpdatetData);
  
          request.query(queryUpdatetData,async (err, result) => {
          if (err) {
            return res.error(err);
          }
          return res.success({
            message: "Update data successfully"
          });
        });

      }else{


        //GET WORKFLOW APPROVAL

        let sqlGetWorkflowApproval = `SELECT TOP 1 * FROM workflow_alternative_supplier ORDER BY tanggal_berlaku DESC`;
        let getWorkflowApproval = await request.query(sqlGetWorkflowApproval);
        let workflowApproval = getWorkflowApproval.recordset.length > 0 ? getWorkflowApproval.recordset[0] : null;
        let company_id_text = company_id ? `'${company_id}'` : 'NULL';

        if(workflowApproval){
          
          let alt_supplier_id = create_alternative_supplier_id;
          let queryInsertData = `INSERT INTO alt_supplier
          (alt_supplier_id,createdby, updatedby, r_jenis_supplier_id, m_kategori_material_id, objective_tujuan,purchase_info, 
          material_service_name,material_service_code, specification, unit_of_measure, minimum_order_quantity, usage_planning, due_date, 
          others_note,documentno,kode_vendor,nama_vendor,r_department_id,company_id,iscoa,ismsds,ishalalsertifikat,plant)
          VALUES('${alt_supplier_id}','${m_user_id}','${m_user_id}', '${jenis_supplier}', '${detail_kategori}', 
          '${objectives}','${purchase_info}', '${nama_material}', '${kode_material}','${specification}','${uom}', ${moq}, ${usage_planning_text}, 
          '${due_date}', '${other}','${documentno}','${kode_vendor}','${nama_vendor}','${selecteddepartment}',
          ${company_id_text},'${coa}','${msds}','${halalsertifikat}',${plant_text})`;

          console.log(queryInsertData);


          // INSERT HEADER
          await request.query(queryInsertData);


          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${m_user_id}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          let nama = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          let email = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].email}'` : 'NULL';


          let insertPengajuan = `INSERT INTO alt_audit_approval
          (createdby, updatedby, 
          alt_supplier_id, kode_status, status,nama,email)
          VALUES('${m_user_id}','${m_user_id}', '${alt_supplier_id}', 
          'DR', 'Pengajuan',${nama},${email})`;


          // INSERT AUDIT PENGAJUAN
          await request.query(insertPengajuan);


        // PROSES PEMBENTUKAN APPROVAL SATU DAN 2
        let sqlGetDataApproval = `SELECT nip, nama, nip_sect_head, nama_sect_head, nip_head, nama_head, kode_group_material
        FROM creator_group_material_alt_supplier WHERE nip ='${m_user_id}'`;

        let getDataApproval = await request.query(sqlGetDataApproval);
        let dataapproval = getDataApproval.recordset.length > 0 ? getDataApproval.recordset : null;

        let nip_sect_head = dataapproval.length > 0 ? dataapproval[0].nip_sect_head : null;
        let nip_head = dataapproval.length > 0 ? dataapproval[0].nip_head : null;

        let arrayDataApproval = [];

        if(nip_sect_head){
          arrayDataApproval.push({
            urutan:1,
            username:nip_sect_head,
            action:'Approval Sect. Head Requestor'
          });
        }

  
        if(nip_head){
          arrayDataApproval.push({
            urutan:2,
            username:nip_head,
            action:'Approval Dept. Head Requestor'
          });
        }

        arrayDataApproval.push({
          urutan:4,
          username:'-',
          action:'Receiver 1 Melalukan test dari permintaan requestor atas persetujuan Head Receiver 1'
        });

        console.log(arrayDataApproval);


          for (let i = 0; i < arrayDataApproval.length; i++) {

              let urutan = arrayDataApproval[i].urutan;
              let username = arrayDataApproval[i].username;
              let action = arrayDataApproval[i].action;

              let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${username}'`;
              let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
              let nama = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].name : null;
              let email = getNamaByNik.rows.length > 0 ? getNamaByNik.rows[0].email : null;

              let nama_text = nama ? nama : '?';
              let email_text = email ? email : '?';

              let insertHeadApprove = `INSERT INTO alt_approval_head
              (createdby, updatedby, alt_supplier_id, nip,nama,no_appr,email,action)
              VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}','${username}',
              '${nama_text}',${urutan},'${email_text}','${action}')`;
              await request.query(insertHeadApprove);

              //console.log(insertHeadApprove);
            
          }

        let nama_head_text = headDepartment ? headDepartment : '?';
        let username_head_text = headDepartmentNik ? headDepartmentNik : '?';


        let insertHeadApprove = `INSERT INTO alt_approval_head
        (createdby, updatedby, alt_supplier_id, nip,nama,no_appr,email,action)
        VALUES('${m_user_id}','${m_user_id}','${alt_supplier_id}','${username_head_text}',
        '${nama_head_text}',3,'Receiver Head 1','Delegated to team')`;
        await request.query(insertHeadApprove);
          
   
          
        for (let i = 0; i < uploadedFiles.length; i++) {
            
          let filename = uploadedFiles[i].filename;
          let insertFile = `INSERT INTO alt_supplier_document
          (createdby, updatedby, alt_supplier_id, nama_file)
          VALUES('${m_user_id}', '${m_user_id}', '${alt_supplier_id}', '${filename}')`;
          await request.query(insertFile);

        }

        }else{

          return res.error({
            message: `Workflow Department ${nama_department} tidak ditemukan harap setting workflow terlebih dahulu`
          });
        
        }

        return res.success({
          message: "Request successfully"
        });
      }
    });
  } catch (err) {
    return res.error(err);
  }
  },
  getheaddivision: async function(req, res) {
    const {
      query: { nik }
    } = req;
    try {

      let queryDataTable = `select * from master_dept_heads
      where nik ='${nik}'
      and deleted_at is null`;

      //console.log(queryDataTable);
    
      DBPORTAL.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }


        //console.log(result);
        
        const rows = result.rows[0];
        /**
         * {
         *    result : data utama,
         *    meta : data tambahan ( optional ),
         *    status : status response ( optional),
         *    message : pesan ( optional )
         * }
         */
        return res.success({
          result: rows,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
 
  
 };
 



 
 async function uploadFiles(id,files){

  for (const file of files) {
    filenames = file.filename;
    fs.mkdirSync(dokumentPath( 'alternativesupplierdokumen', id), {
        recursive: true
    })
    const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( 'alternativesupplierdokumen', id), file.filename.replace(/\.[^/.]+$/, "")) + '*')
    // console.log(filesamaDir);

    if (filesamaDir.found.length > 0) {
        console.log('isexist file nama sama', filesamaDir.found[0])
        fs.unlinkSync(filesamaDir.found[0])
    }
    // console.log(filesamaDir);
    fs.renameSync(file.fd, path.resolve(dokumentPath( 'alternativesupplierdokumen', id), file.filename))
  }
}