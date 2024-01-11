const fs = require('fs');
const path = require('path');
const moment = require('moment');
const puppeteer = require('puppeteer');
const handlebars = require("handlebars");
const direktorihtml = () => path.resolve(sails.config.appPath, 'assets', 'emailtemplate', 'disciplinary');
const axios = require('axios');
const SendEmail = require('../../../../services/SendEmail');

module.exports = {

    forEmployee: async function(req, res) {
        const {sp_id} = req.body;
        await DB.poolConnect;
        try {
          const request = DB.pool.request();

          let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
          let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
          let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
          let dataemail = [];
 

            let queryDataTable = `SELECT a.*,b.nama AS violation_degree_name,
            c.nama AS violation_type_name
            FROM sp a
            LEFT JOIN r_violation_degree b ON(a.violation_degree = b.kode )
            LEFT JOIN r_violation_type c ON(a.violation_type = c.kode)
            WHERE a.sp_id='${sp_id}'`;
        
              request.query(queryDataTable,async (err, result) => {
                if (err) {
                  return res.error(err);
                }

                const row = result.recordset[0];

                if(statusIntegasi=='DEV'){
            
                  dataemail.push('tiasadeputra@gmail.com');
                
                }else{

                  dataemail.push(row.email_employee);
                
                }
      
                if(dataemail.length > 0){

                  let content = fs.readFileSync(path.resolve(direktorihtml(),"emailcreatedisciplinary.html"),"utf-8");      
                  row.baseurl = direktorihtml();
                  row.judul = row.warning_level == '1' ? 'SURAT PERINGATAN I' : row.warning_level == '2' ? 'SURAT PERINGATAN II' : row.warning_level == '3' ?  'SURAT PERINGATAN III' : 'SURAT PERINGATAN TEGURAN LISAN' ;
                  row.perihal = row.warning_level == '1' ? 'SURAT PERINGATAN PERTAMA' : row.warning_level == '2' ? 'SURAT PERINGATAN KEDUA' : row.warning_level == '3' ? 'SURAT PERINGATAN KETIGA' : 'SURAT PERINGATAN TEGURAN LISAN';
                  row.company = row.issue_company_id == 'HI' ? 'PT. Herlina Indah' : row.issue_company_id == 'MI' ? 'PT. Marketama Indah' : row.issue_company_id == 'DRI' ? 'Dunia Rasa Indah' : 'PT Sari Enesis Indah';
                  moment.locale('id')
                  row.hari_sp = moment(row.date_issue,'YYYY-MM-DD').format('dddd');
                  row.tanggal_sp = moment(row.date_issue,'YYYY-MM-DD').format('DD MMMM YYYY');
                  row.warning_level_description = row.warning_level == '1' ? 'ringan' : 'berat';
                  row.expired_date = moment(row.expired_date,'YYYY-MM-DD').format('DD MMMM YYYY');
                  row.incident_date = moment(row.incident_date,'YYYY-MM-DD').format('DD MMMM YYYY');
                                    
                  let template = handlebars.compile(content);
                  let finalHtml = template(row);
                  console.log(row);

                  let subject = `${row.judul} UNTUK ${row.name}`;

                  SendEmail(dataemail.toString(), subject, finalHtml);

  
                }

                return res.success({
                    message: "Process Succesfully"
                });
                                   

                
              });
        } catch (err) {
          return res.error(err);
        }
    
    },
    forHrHead: async function(req, res) {
      const {sp_id} = req.body;
      await DB.poolConnect;
      try {
        const request = DB.pool.request();

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
        let dataemail = [];


          let queryDataTable = `SELECT a.*,b.nama AS violation_degree_name,
          c.nama AS violation_type_name
          FROM sp a
          LEFT JOIN r_violation_degree b ON(a.violation_degree = b.kode )
          LEFT JOIN r_violation_type c ON(a.violation_type = c.kode)
          WHERE a.sp_id='${sp_id}'`;
      
            request.query(queryDataTable,async (err, result) => {
              if (err) {
                return res.error(err);
              }

              const row = result.recordset[0];

              if(statusIntegasi=='DEV'){
          
                dataemail.push('tiasadeputra@loginusa.id');
                row.hrhead_name = 'Tias Ade Putra';
              
              }else{

                let sqlgethrheademail = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC SELECT kode, nama,email 
                FROM r_setting_email 
                WHERE kode='SP_HR_HEAD'`;
                let hremailhead = await request.query(sqlgethrheademail);
                let email = hremailhead.recordset.length > 0 ? hremailhead.recordset[0].email : null;
                let nama = hremailhead.recordset.length > 0 ? hremailhead.recordset[0].nama : null;

                if(nama && email){
                  dataemail.push(email);
                  row.hrhead_name = nama;
                }
              
              }
    
              if(dataemail.length > 0){

                let content = fs.readFileSync(path.resolve(direktorihtml(),"emailcreatedisciplinaryforhrhead.html"),"utf-8");      
                row.baseurl = direktorihtml();
                row.judul = row.warning_level == '1' ? 'SURAT PERINGATAN I' : row.warning_level == '2' ? 'SURAT PERINGATAN II' : row.warning_level == '3' ?  'SURAT PERINGATAN III' : 'SURAT PERINGATAN TEGURAN LISAN' ;
                row.perihal = row.warning_level == '1' ? 'SURAT PERINGATAN PERTAMA' : row.warning_level == '2' ? 'SURAT PERINGATAN KEDUA' : row.warning_level == '3' ? 'SURAT PERINGATAN KETIGA' : 'SURAT PERINGATAN TEGURAN LISAN';
                row.company = row.issue_company_id == 'HI' ? 'PT. Herlina Indah' : row.issue_company_id == 'MI' ? 'PT. Marketama Indah' : row.issue_company_id == 'DRI' ? 'Dunia Rasa Indah' : 'PT Sari Enesis Indah';
                moment.locale('id')
                row.hari_sp = moment(row.date_issue,'YYYY-MM-DD').format('dddd');
                row.tanggal_sp = moment(row.date_issue,'YYYY-MM-DD').format('DD MMMM YYYY');
                row.warning_level_description = row.warning_level == '1' ? 'ringan' : 'berat';
                row.expired_date = moment(row.expired_date,'YYYY-MM-DD').format('DD MMMM YYYY');
                row.incident_date = moment(row.incident_date,'YYYY-MM-DD').format('DD MMMM YYYY');
                                  
                let template = handlebars.compile(content);
                let finalHtml = template(row);
                console.log(row);

                let subject = `${row.judul} UNTUK ${row.name}`;

                SendEmail(dataemail.toString(), subject, finalHtml);


              }

              return res.success({
                  message: "Process Succesfully"
              });
                                 

              
            });
      } catch (err) {
        return res.error(err);
      }
  
  }
    
}



function racikXML(xmlTemplate, param) {

  return xmlTemplate.replace('?', param);

}