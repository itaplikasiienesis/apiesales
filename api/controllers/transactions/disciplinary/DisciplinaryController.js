/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const uuid = require("uuid/v4");
 const _ = require("lodash");
 const otpGenerator = require('otp-generator');
 const printf = require("locutus/php/strings/printf");
 const soapRequest = require('easy-soap-request');
 const fs = require('fs');
 const moment = require('moment');
 const xml2js = require('xml2js');
 const api = require("../../../services/API");
 const axios = require('axios');
 
 
 module.exports = {
   // GET ALL RESOURCE
   find: async function (req, res) {
     const {
       query: { currentPage, pageSize,m_user_id }
     } = req;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
       let whereClauseUserId = "";

       if(m_user_id){
        whereClauseUserId = `AND sp.createdby = '${m_user_id}'`;
       }
 
       let queryCountTable = `SELECT COUNT(1) AS total_rows
                               FROM sp WHERE 1=1 ${whereClauseUserId}`;
                            
                             
       let queryDataTable = `SELECT sp.sp_id, sp.isactive, sp.created, sp.createdby, sp.updated,
        sp.updatedby, sp.employee_id, sp.name,
        sp.warning_level, 
        wl.nama AS warning_level_name,
        sp.incident_date, sp.violation, 
        sp.violation_degree,
        vd.nama AS violation_degree_name,
        sp.violation_type,
        vt.nama AS violation_type_name,
        sp.violation_rule, 
        sp.advice_given, 
        sp.sanction_given, 
        sp.note, sp.date_issue, sp.letter_no,
        sp.issue_company_id, sp.issue_by, sp.issue_name, sp.expired_date, sp.kode_status, sp.status
        FROM sp 
        LEFT JOIN r_violation_type vt ON(vt.kode = sp.violation_type)
        LEFT JOIN r_violation_degree vd ON(vd.kode = sp.violation_degree)
        LEFT JOIN r_warning_level wl ON(wl.kode = sp.warning_level)
        WHERE 1=1 ${whereClauseUserId}
        ORDER BY sp.created DESC
        OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY`;
        
       console.log(queryDataTable);
 
       const totalItems = await request.query(queryCountTable);
       const count = totalItems.recordset[0].total_rows || 0;
 
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
 
   // GET ONE RESOURCE
   findOne: async function (req, res) {
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let queryDataTable = `SELECT sp.sp_id, sp.isactive, sp.created, sp.createdby, sp.updated,
       sp.updatedby, sp.employee_id, sp.name,
       sp.warning_level, 
       wl.nama AS warning_level_name,
       sp.incident_date, sp.violation, 
       sp.violation_degree,
       vd.nama AS violation_degree_name,
       sp.violation_type,
       vt.nama AS violation_type_name,
       sp.violation_rule, 
       sp.advice_given, 
       sp.sanction_given, 
       sp.note, sp.date_issue, sp.letter_no,
       sp.issue_company_id, sp.issue_by, sp.issue_name, sp.expired_date, sp.kode_status, 
       sp.status,sp.spv_id,sp.spv_name,sp.jabatan,sp.department
       FROM sp 
       LEFT JOIN r_violation_type vt ON(vt.kode = sp.violation_type)
       LEFT JOIN r_violation_degree vd ON(vd.kode = sp.violation_degree)
       LEFT JOIN r_warning_level wl ON(wl.kode = sp.warning_level) WHERE sp.sp_id='${req.param(
         "id"
       )}'`;
 
       request.query(queryDataTable, (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         const row = result.recordset[0];
         return res.success({
           result: row,
           message: "Fetch data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   // CREATE NEW RESOURCE
   new: async function (req, res) {
     const { 
      m_user_id,
      employe_id,
      warning_level,
      violation,
      violationrule,
      violation_degree,
      sanction_given,
      letter_no,
      date_issue,
      nama,
      incident_date,
      issue_company_id,
      violation_type,
      advice_given,
      note,
      issued_by,
      issue_name,
      expired_date,
      spv_id,
      spv_name,
      jabatan,
      department,
      email_employee,
      email_issueby
    } = req.body;

 
     await DB.poolConnect;
     try {
        const id = uuid()
        const request = DB.pool.request();

        let userinput = m_user_id ? m_user_id : 'SYSTEM';

        let otp = otpGenerator.generate(6, { upperCase: false, alphabets:false, specialChars: false }); // Sementara ini akan diganti dengan response orange


        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

        if(statusIntegasi=='DEV'){
          axios.defaults.baseURL = 'https://esalesdev.enesis.com/api/';
        }else{
          axios.defaults.baseURL = 'https://esales.enesis.com/api/';
        }

        

        let param_violation = violation ? `'${violation.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_violation_rule = violationrule ? `'${violationrule.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_advice_given = advice_given ? `'${advice_given.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_sanction_given = sanction_given ? `'${sanction_given.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_note = note ? `'${note.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_letter_no = letter_no ? param_letter_no : otp;
        let param_violation_degree = violation_degree ? `'${violation_degree.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_violation_type = violation_type ? `'${violation_type.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_spv_id = spv_id ? `'${spv_id.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_spv_name= spv_name ? `'${spv_name.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_jabatan= jabatan ? `'${jabatan.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_department = department ? `'${department.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_email_employee = email_employee ? `'${email_employee.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_email_issueby = email_issueby ? `'${email_issueby.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';

        let sqlgetheadHr = `SELECT kode, 
        nama 
        FROM r_setting_email 
        WHERE kode='SP_HR_HEAD'`;

        let sqlgetsettingemail = await request.query(sqlgetheadHr);
        let dataemailhr = sqlgetsettingemail.length > 0 ? sqlgetsettingemail[0].nama : null;
        let param_email_hr = dataemailhr ? `'${dataemailhr.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        

        const sql = `INSERT INTO sp
        (sp_id,
        createdby,
        updatedby, 
        employee_id, 
        name, 
        warning_level, 
        incident_date, 
        violation, 
        violation_degree, 
        violation_type, 
        violation_rule, 
        advice_given, 
        sanction_given, 
        note, 
        date_issue, 
        letter_no, 
        issue_company_id, 
        issue_by, 
        issue_name, 
        expired_date,
        spv_id,
        spv_name,
        jabatan,
        department,
        email_employee,
        email_issueby,
        email_hr
        )
        VALUES('${id}','${userinput}','${userinput}', '${employe_id}', '${nama}', 
        '${warning_level}', '${incident_date}', ${param_violation}, ${param_violation_degree}, ${param_violation_type}, 
        ${param_violation_rule}, ${param_advice_given}, ${param_sanction_given}, ${param_note}, '${date_issue}', 
        '${param_letter_no}', '${issue_company_id}', '${issued_by}', '${issue_name}', '${expired_date}',
        ${param_spv_id},
        ${param_spv_name},
        ${param_jabatan},
        ${param_department},
        ${param_email_employee},
        ${param_email_issueby},
        ${param_email_hr}
        )`;
    
       request.query(sql, (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         let queryDataTable = `SELECT * FROM sp WHERE sp_id='${id}'`;
           request.query(queryDataTable, (err, result) => {
           if (err) {
             return res.error(err);
           }
           const row = result.recordset[0];


              axios.post(`disciplinary/email/employee`,{
                  sp_id:id
              });

              axios.post(`disciplinary/email/hrhead`,{
                sp_id:id
              });

           return res.success({
             result: row,
             message: "Insert data successfully"
           });
         });
 
       });
     } catch (err) {
       return res.error(err);
     }
   },
  
   // DELETE RESOURCE
   delete: async function (req, res) {
     const { id } = req.query;
 
     console.log("id", req.query)
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const sql = `DELETE FROM sp WHERE sp_id='${id}'`;
 
       request.query(sql, (err, result) => {
         if (err) {
           return res.error(err);
         }
         return res.success({
           data: result,
           message: "Delete data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },

   submitorange: async function (req, res) {
    const { sp_id } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
     

      let xml = fs.readFileSync('soap/disciplinary/ADD_DATA_TO_ORANGE.xml', 'utf-8');
      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

      let sqlGetDataSP = `SELECT sp_id, employee_id, name, 
      warning_level, incident_date, 
      violation, violation_degree, 
      violation_type, violation_rule, advice_given, sanction_given, note, 
      date_issue, 
      letter_no, issue_company_id, issue_by, issue_name, 
      expired_date, kode_status, status
      FROM sp WHERE sp_id = '${sp_id}'`;
      let getdatasp = await request.query(sqlGetDataSP);
      let datasp = getdatasp.recordset.length > 0 ? getdatasp.recordset[0] : null;
      let param_req_employee_id = datasp.issue_by;
      let param_company_id = datasp.issue_company_id;
      let param_employee_id = datasp.employee_id;
      let param_incident_date = moment(datasp.incident_date,'YYYY-MM-DD').format('DD-MM-YYYY');
      let param_violation = datasp.violation;
      let param_effect_violation = datasp.violation_rule;
      let param_advice_given = datasp.advice_given;
      let param_sanction_given = datasp.sanction_given;
      let param_date_issue = moment(datasp.date_issue,'YYYY-MM-DD').format('DD-MM-YYYY');
      let param_note = datasp.note;
      let param_violation_degree = datasp.violation_degree;
      let param_violation_type = datasp.violation_type;
      let param_warning_level = datasp.warning_level;
      let param_expiry_date = moment(datasp.expired_date,'YYYY-MM-DD').format('DD-MM-YYYY');
      let param_issued_by_company_id = datasp.issue_company_id;
      let param_issued_by = datasp.issue_by;

      if(datasp){

          let hasil = replaceParamSumbitToOrange(xml,
          param_req_employee_id,
          param_company_id,
          param_employee_id,
          param_incident_date,
          param_violation,
          param_effect_violation,
          param_advice_given,
          param_sanction_given,
          param_date_issue,
          param_note,
          param_violation_degree,
          param_violation_type,
          param_warning_level,
          param_expiry_date,
          param_issued_by_company_id,
          param_issued_by);
      
          let url = ``;
          if(statusIntegasi=='DEV'){
            url = 'https://hris.enesis.com/enesis-dev/services/EmpDisciplinary?wsdl'; // development
          }else{
            url = 'https://hris.enesis.com/enesis-dev/services/EmpDisciplinary?wsdl'; // production
          }
  
          let sampleHeaders = {
            'user-agent': `Api-Esales`,
            'Content-Type': `application/x-www-form-urlencoded`,
            'soapAction': `""`,
          };

          console.log(hasil);
                      
          let { response } = await soapRequest({ url: url, headers: sampleHeaders,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
          let {body,statusCode } = response;
          console.log(statusCode);

          console.log(body);
          if(statusCode==200){


            xml2js.parseString(body,async function (err, result) {
                          
              let temp = result['soapenv:Envelope']['soapenv:Body'];
              let addEmpDisciplinaryResponse = temp[0].addEmpDisciplinaryResponse;
              let addEmpDisciplinaryReturn = addEmpDisciplinaryResponse[0] ? addEmpDisciplinaryResponse[0].addEmpDisciplinaryReturn : null;

              let cekreturn = addEmpDisciplinaryReturn[0].$ ? addEmpDisciplinaryReturn[0].$['xsi:nil'] == 'true' ? false: false : true ;
              if(cekreturn){
                let letterNo = addEmpDisciplinaryReturn ? addEmpDisciplinaryReturn[0].replace('Successful','').replace('[','').replace(']','') : null;
                const sql = `UPDATE sp SET kode_status='STO',letter_no='${letterNo}',
                status='Confirmated HR'
                WHERE sp_id='${sp_id}'`;
                await request.query(sql);    


                  api.post(`disciplinary/email/posting/employee`,{
                      sp_id:sp_id
                  });

                  api.post(`disciplinary/email/posting/issueby`,{
                    sp_id:sp_id
                  });
  
                return res.success({
                  message: "Confirmated HR successfully"
                });
              }else{
                console.log(err);
                return res.success({
                  message: "Confirmated HR Gagal Karena Employee Beda Department"
                });
              }
            });
          }else{
            
            return res.error({
              message: "Confirmated HR Failed"
            });
          }
  
      }else{
        return res.error({
          message: "SP Tidak Ditemukan"
        });
      }

      
    } catch (err) {
      return res.error(err);
    }
  },

   update: async function (req, res) {
    const {
      action,
      sp_id,
      m_user_id, 
      employe_id,
      warning_level,
      violation,
      violationrule,
      violation_degree,
      sanction_given,
      letter_no,
      date_issue,
      nama,
      incident_date,
      issue_company_id,
      violation_type,
      advice_given,
      note,
      issued_by,
      issue_name,
      expired_date,
      spv_id,
      spv_name,
      jabatan,
      department
   } = req.body;


    await DB.poolConnect;
    try {
        const id = uuid()
        const request = DB.pool.request();
        let updatestatusrev = ``;
        //console.log(req.body);
        if(action=='REV'){
          updatestatusrev = `, kode_status='REV'`;
        }
        let userinput = m_user_id ? m_user_id : 'SYSTEM';

        let param_violation = violation ? `'${violation.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_violation_rule = violationrule ? `'${violationrule.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_advice_given = advice_given ? `'${advice_given.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_sanction_given = sanction_given ? `'${sanction_given.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_note = note ? `'${note.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_violation_degree = violation_degree ? `'${violation_degree.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_violation_type = violation_type ? `'${violation_type.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_spv_id = spv_id ? `'${spv_id.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_spv_name= spv_name ? `'${spv_name.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';

        let param_jabatan = jabatan ? `'${jabatan.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';
        let param_department = department ? `'${department.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`)}'` : 'NULL';

        
        let sqlUpdateSP = `UPDATE sp
        SET updated=getdate(), 
        updatedby='${userinput}', 
        employee_id='${employe_id}', 
        name='${nama}', 
        warning_level='${warning_level}', 
        incident_date='${incident_date}', 
        violation=${param_violation}, 
        violation_degree=${param_violation_degree}, 
        violation_type=${param_violation_type}, 
        violation_rule=${param_violation_rule}, 
        advice_given=${param_advice_given}, 
        sanction_given=${param_sanction_given}, 
        note=${param_note}, 
        date_issue='${date_issue}', 
        letter_no='${letter_no}', 
        issue_company_id='${issue_company_id}', 
        issue_by='${issued_by}', 
        issue_name='${issue_name}', 
        spv_id=${param_spv_id},
        spv_name=${param_spv_name},
        expired_date='${expired_date}',
        jabatan=${param_jabatan},
        department=${param_department}
        ${updatestatusrev}
        WHERE sp_id='${sp_id}'`;

        console.log(sqlUpdateSP);

        request.query(sqlUpdateSP, (err, result) => {
          if (err) {
            return res.error(err);
          }
          return res.success({
            data: result,
            message: "Update data successfully"
          });
        });

    } catch (err) {
      return res.error(err);
    }
  }
 };
 

 function replaceParamSumbitToOrange(xmlTemplate,
  param_req_employee_id,param_company_id,
  param_employee_id,param_incident_date,
  param_violation,param_effect_violation,
  param_advice_given,param_sanction_given,
  param_date_issue,param_note,param_violation_degree,
  param_violation_type,param_warning_level,param_expiry_date,
  param_issued_by_company_id,param_issued_by) {


  return xmlTemplate.replace('param_req_employee_id', param_req_employee_id).replace('param_company_id', param_company_id).
  replace('param_employee_id', param_employee_id).replace('param_incident_date', param_incident_date).replace('param_violation', param_violation).
  replace('param_effect_violation', param_effect_violation).replace('param_advice_given', param_advice_given).
  replace('param_sanction_given', param_sanction_given).replace('param_date_issue', param_date_issue).replace('param_note', param_note).
  replace('param_violation_degree', param_violation_degree).replace('param_violation_type', param_violation_type).
  replace('param_warning_level', param_warning_level).replace('param_expiry_date', param_expiry_date).
  replace('param_issued_by_company_id', param_issued_by_company_id).replace('param_issued_by', param_issued_by);
  
}
