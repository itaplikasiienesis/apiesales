const xlsx = require('node-xlsx');
const uuid = require("uuid/v4");
const moment = require('moment');
const XLS = require('xlsx');
const otpGenerator = require('otp-generator');
const SendEmail = require('../../../services/SendEmail');
const soapRequest = require('easy-soap-request');
const xml2js = require('xml2js');
const Base64 = require('base-64');
const numeral = require('numeral');
const templatePath = () => path.resolve(sails.config.appPath, 'assets', 'templatefkr');
const fs = require("fs");
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
const path = require('path');
const glob = require("glob");
const { log } = require('console');
const { sync } = require('glob');
const { has } = require('lodash');
const ClientSFTP = require('ssh2-sftp-client');
var shell = require('shelljs');
const DBEMPLOYEE = require('../../../services/DBEMPLOYEE');


module.exports = {

    rejectFKR: async function(req, res) {
    const {
        query: {m_user_id,fkr_id}
      } = req;
    await DB.poolConnect;
    let reason = 'Reject';
    try {
          const request = DB.pool.request();
          let sqlgetfkr = `SELECT nomor_fkr FROM fkr murv WHERE fkr_id='${fkr_id}'`;
          let sqlGetRole = `SELECT nama,m_role_id FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;


          let getdatafkr = await request.query(sqlgetfkr);
          let nomor_fkr = getdatafkr.recordset[0].nomor_fkr;
          
          let datarole = await request.query(sqlGetRole);
          let rolename = datarole.recordset[0].nama;
          let m_role_id = datarole.recordset[0].m_role_id;

          let cekdatareject = `SELECT COUNT(1) AS jumlah_data 
          FROM fkr_audit_approve 
          WHERE fkr_id='${fkr_id}' AND createdby='${m_user_id}'`;

          let datareject = await request.query(cekdatareject);
          let jumlah_data = datareject.recordset[0].jumlah_data;

          console.log(jumlah_data);
          if(jumlah_data > 0){

                  let param = {
                    keterangan:'FKR ini sudah diapprove sebelumnya',
                    nomor_fkr:nomor_fkr,
                    favicon:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA25pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpERjk4NDhCOUU5MjQxMUU1ODRFOUZDMDVFNjQ3ODhGMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGMzU1RjE4NjM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGMzU1RjE4NTM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4NmZhNTcwNi04MjJhLTM4NDYtYjE1Mi0zZmQ1MjFmNDJjNDEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6REY5ODQ4QjlFOTI0MTFFNTg0RTlGQzA1RTY0Nzg4RjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5ueJJWAAABa0lEQVR42qTTzSsFURjH8UsshJQSImVBUsQ/YCFlhc1NUcQCxY4Sxd5VpJSULCjqut6FQllgj/JSFMqCUiTKS4zvqd+pY7q7+9SnmTlnnue8zcR5nheIJeLqgh3+tiy0oAJ5+MIl1hB2X1yNTAYSfMntGEGKr70cDehBPW5thymQjHf0IuRL3ME+PlCJGlygCHe2QDeOoyQHseQ8j2l0s4xdFJrGeLxg3ZfcpOR0zGAeBVjAhO6DtsC4NmwWTypwoxHMdJu1/gH1TenaapeQgQMxkYsSZGJY+/PqzDLfvZoCZYhgDtvYxH2UIzeb3YhRPX/bJZwiDZ3YwLmTtAxP3jRIpvrubYFHHZUNc0TVuu/Spl3hU4VsLNolmBjEodO5glrsqYiNRGQjFWd2BiaOMOS8mKSzDusESpGjz/zBJrsFTPSjDz9OW72+gROteQvF7s76/4WQpt+GKo34i2tt8DSe//2Nsf7OfwIMAHxiV63lX25TAAAAAElFTkSuQmCC`,
                    baseurl: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
                    baseurl2: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
                    baseurl3: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
                    baseurl4: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
                    baseurl5: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
                    baseurl6: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */
                  }

            
                  let locationFiles = dokumentPath('fkr','hasbeenapprove');
                  shell.mkdir('-p', locationFiles);
                  let templateHtml = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'isapprovefkr', templateparam: param});
                  fs.writeFileSync(locationFiles+'/'+`${fkr_id}`+".html", templateHtml); 
                  let file = path.join(locationFiles+'/'+`${fkr_id}`+".html");    
                  return res.sendFile(file);
          
              

          }else{

              let sql = `UPDATE fkr SET updated=getdate(),updatedby = '${m_user_id}',
              kode_status = 'RJC',
              status='Reject',reason='${reason}'
              WHERE fkr_id='${fkr_id}'`;
              let sts = `RJC`;
              if(rolename == "ASDH"){
              sts = `APA`
              }else if(rolename == "RSDH"){
              sts = `APR`
              }else if(rolename == "SALESHO3"){
              sts = `APS1`
              }else if(rolename == "SALESHO2"){
              sts = `APS2`
              }else if(rolename == "SALESHO1"){
              sts = `APS3`
              }

              let sqlinsertAudit = `INSERT INTO fkr_audit_approve
                      (createdby,updatedby,fkr_id, m_role_id, actions, kode_status,note)
                      VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', 
                      '${m_role_id}', 'REJECT', '${sts}','${reason}')`;
              await request.query(sql);
              await request.query(sqlinsertAudit);



              let param = {
                keterangan:'FKR ini Berhasil direject',
                nomor_fkr:nomor_fkr,
                favicon:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA25pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpERjk4NDhCOUU5MjQxMUU1ODRFOUZDMDVFNjQ3ODhGMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGMzU1RjE4NjM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGMzU1RjE4NTM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4NmZhNTcwNi04MjJhLTM4NDYtYjE1Mi0zZmQ1MjFmNDJjNDEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6REY5ODQ4QjlFOTI0MTFFNTg0RTlGQzA1RTY0Nzg4RjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5ueJJWAAABa0lEQVR42qTTzSsFURjH8UsshJQSImVBUsQ/YCFlhc1NUcQCxY4Sxd5VpJSULCjqut6FQllgj/JSFMqCUiTKS4zvqd+pY7q7+9SnmTlnnue8zcR5nheIJeLqgh3+tiy0oAJ5+MIl1hB2X1yNTAYSfMntGEGKr70cDehBPW5thymQjHf0IuRL3ME+PlCJGlygCHe2QDeOoyQHseQ8j2l0s4xdFJrGeLxg3ZfcpOR0zGAeBVjAhO6DtsC4NmwWTypwoxHMdJu1/gH1TenaapeQgQMxkYsSZGJY+/PqzDLfvZoCZYhgDtvYxH2UIzeb3YhRPX/bJZwiDZ3YwLmTtAxP3jRIpvrubYFHHZUNc0TVuu/Spl3hU4VsLNolmBjEodO5glrsqYiNRGQjFWd2BiaOMOS8mKSzDusESpGjz/zBJrsFTPSjDz9OW72+gROteQvF7s76/4WQpt+GKo34i2tt8DSe//2Nsf7OfwIMAHxiV63lX25TAAAAAElFTkSuQmCC`,
                baseurl: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
                baseurl2: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
                baseurl3: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
                baseurl4: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
                baseurl5: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
                baseurl6: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */
              }

        
              let locationFiles = dokumentPath('fkr','hasbeenapprove');
              shell.mkdir('-p', locationFiles);
              let templateHtml = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'isapprovefkr', templateparam: param});
              fs.writeFileSync(locationFiles+'/'+`${fkr_id}`+".html", templateHtml); 
              let file = path.join(locationFiles+'/'+`${fkr_id}`+".html");    
              return res.sendFile(file);
      
          }

      }catch(err){
            return res.error(err);
      }
    },

    rejectFkrBaru: async function(req, res) {
      const {
          m_user_id,fkr_id,reason,nik
        } = req.body;

      await DB.poolConnect;
      console.log(req.body);


      try {
          const request = DB.pool.request();
          let sqlgetfkr = `SELECT nomor_fkr,kode_status,eksekusi FROM fkr WHERE fkr_id='${fkr_id}'`;
          let sqlGetRole = `SELECT nama,m_role_id FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
  
  
          let getdatafkr = await request.query(sqlgetfkr);
          let kode_status = getdatafkr.recordset.length > 0 ? getdatafkr.recordset[0].kode_status : null;
          let eksekusi = getdatafkr.recordset.length > 0 ? getdatafkr.recordset[0].eksekusi : null;
          
          let datarole = await request.query(sqlGetRole);
          let rolename = datarole.recordset.length > 0 ? datarole.recordset[0].nama : null;

          if(!kode_status || !eksekusi){
            return res.error({
              message : 'Data FKR invalid harap hubungi IT untuk konfirmasi'
            }); 
          }
  
          console.log('data fkr kode_status : ',kode_status, ' eksekusi : ',eksekusi);


          let sqlGetDataUser = `SELECT display_name 
          FROM person_tbl where person_id = '${nik}'`;

          console.log('sqlGetDataUser ',sqlGetDataUser);
  
  
          let getdata = await DBEMPLOYEE.query(sqlGetDataUser);
          let data = getdata.rows[0];
          let namaUser = data.display_name ? data.display_name : null;

          if(!namaUser || !rolename){
            return res.error({
              message : 'User reject tidak dikenali harap hubungi IT untuk konfirmasi'
            }); 
          }

          if(!reason || reason == ''){
            return res.error({
              message : 'Reason Reject tidak boleh kosong'
            }); 
          }
          if (kode_status == 'WT1') {
            let sql = `UPDATE fkr SET updated=getdate(),updatedby = '${m_user_id}',
            kode_status = 'RJC',
            status='Reject', reason='${reason}'
            WHERE fkr_id='${fkr_id}'`;

            await request.query(sql);
            
            let insertAuditFkr = `INSERT INTO audit_fkr
            (createdby, updatedby, fkr_id, nama, nik, status, reason)
            VALUES('${m_user_id}','${m_user_id}','${fkr_id}','${namaUser}', '${nik}', 
            'Reject By Admin MI', '${reason}')`;
            await request.query(insertAuditFkr);

            let insertProgress = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
            ('${fkr_id}','${m_user_id}','${rolename}','RJC','Reject By Admin MI',getdate())`;
            await request.query(insertProgress);


            return res.success({
              message: 'Sukses Reject'
            });

          }else if (kode_status == 'WT3') {
              
            let statusName = 'Waiting BA Pemusnahan';

            if(eksekusi == 'Over Stock' || eksekusi == 'Product Recall / Delisting' || eksekusi == 'Peralihan MI' || 
              eksekusi == 'Peralihan MI' || eksekusi == 'Pemusnahan Lokal' || eksekusi == 'Pemusnahan Lokal'){
              statusName = 'Waiting Penarikan Barang';
            }else{
              statusName = 'Menunggu Proses Serah terima produk';
            }

            let sql = `UPDATE fkr SET updated=getdate(),
            updatedby = '${m_user_id}',
            kode_status = 'WT2',
            status='${statusName}', isconfirm_dtb = 'N',
            doc_dtb1 = null , doc_dtb2 = null, 
            doc_dtb3 = null, reason='${reason}'
            WHERE fkr_id='${fkr_id}'`;

            await request.query(sql);


            let insertAuditFkr = `INSERT INTO audit_fkr
            (createdby, updatedby, fkr_id, nama, nik, status, reason)
            VALUES('${m_user_id}','${m_user_id}','${fkr_id}','${namaUser}', '${nik}', 
            'Reject By Admin MI', '${reason}')`;
            await request.query(insertAuditFkr);


            let insertProgress = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
            ('${fkr_id}','${m_user_id}','${rolename}','WT2','Reject ADM 1',getdate())`;
            await request.query(insertProgress);


            return res.success({
              message: 'Sukses Reject'
            });

            
          }else if (kode_status == 'WT5') {
            // kenapa gada wt 4 karna WT4 adalah proses GR 

            let statusName = 'Waiting Penarikan Barang';

            if(eksekusi == 'Over Stock' || eksekusi == 'Product Recall / Delisting' || eksekusi == 'Peralihan MI' || 
              eksekusi == 'Peralihan MI' || eksekusi == 'Pemusnahan Lokal' || eksekusi == 'Pemusnahan Lokal'){
              statusName = 'Waiting Penarikan Barang';
            }else{
              statusName = 'Menunggu Proses Serah terima produk';
            }

            let sql = `UPDATE fkr SET updated=getdate(),
            updatedby = '${m_user_id}',
            kode_status = 'WT2',
            status='${statusName}', isconfirm_dtb = 'N',
            doc_dtb1 = null , doc_dtb2 = null, 
            doc_dtb3 = null, reason='${reason}'
            WHERE fkr_id='${fkr_id}'`;

            await request.query(sql);

            let insertAuditFkr = `INSERT INTO audit_fkr
            (createdby, updatedby, fkr_id, nama, nik, status, reason)
            VALUES('${m_user_id}','${m_user_id}','${fkr_id}','${namaUser}', '${nik}', 
            'Reject By Admin MI', '${reason}')`;
            await request.query(insertAuditFkr);


            let insertProgress = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
            ('${fkr_id}','${m_user_id}','${rolename}','WT2','Reject ADM 3',getdate())`;
            await request.query(insertProgress);



            return res.success({
              message: 'Sukses Reject'
            });           

          }else if (kode_status == 'WT7') {
            // kenapa wt6 gada karna WT6 adalah proses dtb upload nrp bukan verifikasi

            let sql = `UPDATE fkr SET updated=getdate(),updatedby = '${m_user_id}',
            kode_status = 'WT6',
            status='Waiting DTB upload NRP & APS', doc_nrp_dtb = null, reason='${reason}'
            WHERE fkr_id='${fkr_id}'`;

            await request.query(sql);
            
            let insertAuditFkr = `INSERT INTO audit_fkr
            (createdby, updatedby, fkr_id, nama, nik, status, reason)
            VALUES('${m_user_id}','${m_user_id}','${fkr_id}','${namaUser}', '${nik}', 
            'Reject By Admin MI', '${reason}')`;
            await request.query(insertAuditFkr);

            let insertProgress = `INSERT INTO fkr_audit_new (fkr_id,m_user_id,rolename,kode_status,status,created) VALUES 
            ('${fkr_id}','${m_user_id}','${rolename}','WT3','Waiting DTB upload NRP & APS',getdate())`;
            await request.query(insertProgress);


            return res.success({
              message: 'Sukses Reject'
            });

          }else if (kode_status == 'PS1') {

            let sql = `UPDATE fkr SET updated=getdate(),updatedby = '${m_user_id}',
            kode_status = 'WT9',
            status='CN Sudah Terbentuk & Menunggu Pengiriman Doc Asli: NRP, APS', 
            nomor_resi = null ,jasa_pengiriman = null ,nama_penerima = null ,
            reason='${reason}'
            WHERE fkr_id='${fkr_id}'`;

            await request.query(sql);

            let insertAuditFkr = `INSERT INTO audit_fkr
            (createdby, updatedby, fkr_id, nama, nik, status, reason)
            VALUES('${m_user_id}','${m_user_id}','${fkr_id}','${namaUser}', '${nik}', 
            'Reject By Admin MI', '${reason}')`;
            await request.query(insertAuditFkr);


            return res.success({
              message: 'Sukses Reject'
            });
            
          }else if (kode_status == 'PS2') {

            let sql = `UPDATE fkr SET updated=getdate(),updatedby = '${m_user_id}',
            kode_status = 'PS1',
            status='Dok Asli Dikirim Dtb, Waiting Penerimaan PT.MI', reason='${reason}'
            WHERE fkr_id='${fkr_id}'`;
            await request.query(sql);


            let insertAuditFkr = `INSERT INTO audit_fkr
            (createdby, updatedby, fkr_id, nama, nik, status, reason)
            VALUES('${m_user_id}','${m_user_id}','${fkr_id}','${namaUser}', '${nik}', 
            'Reject By Admin MI', '${reason}')`;
            await request.query(insertAuditFkr);


            return res.success({
              message: 'Sukses Reject'
            });

            
          }else if(kode_status == 'APA'){

            let sql = `UPDATE fkr SET updated=getdate(),updatedby = '${m_user_id}',
            kode_status = 'RJC',
            status='Reject By RSM', reason='${reason}'
            WHERE fkr_id='${fkr_id}'`;
            await request.query(sql);


            let insertAuditFkr = `INSERT INTO audit_fkr
            (createdby, updatedby, fkr_id, nama, nik, status, reason)
            VALUES('${m_user_id}','${m_user_id}','${fkr_id}','${namaUser}', '${nik}', 
            'Reject By RSM', '${reason}')`;
            await request.query(insertAuditFkr);


            return res.success({
              message: 'Sukses Reject'
            });
          }else if(kode_status == 'DRAFT'){

            let sql = `UPDATE fkr SET updated=getdate(),updatedby = '${m_user_id}',
            kode_status = 'RJC',
            status='Reject By ASM', reason='${reason}'
            WHERE fkr_id='${fkr_id}'`;
            await request.query(sql);


            let insertAuditFkr = `INSERT INTO audit_fkr
            (createdby, updatedby, fkr_id, nama, nik, status, reason)
            VALUES('${m_user_id}','${m_user_id}','${fkr_id}','${namaUser}', '${nik}', 
            'Reject By ASM', '${reason}')`;
            await request.query(insertAuditFkr);


            return res.success({
              message: 'Sukses Reject'
            });
          }else if(kode_status == 'APR'){

            let sql = `UPDATE fkr SET updated=getdate(),updatedby = '${m_user_id}',
            kode_status = 'RJC',
            status='Reject By Sales Head', reason='${reason}'
            WHERE fkr_id='${fkr_id}'`;
            await request.query(sql);


            let insertAuditFkr = `INSERT INTO audit_fkr
            (createdby, updatedby, fkr_id, nama, nik, status, reason)
            VALUES('${m_user_id}','${m_user_id}','${fkr_id}','${namaUser}', '${nik}', 
            'Reject By Sales Head', '${reason}')`;
            await request.query(insertAuditFkr);


            return res.success({
              message: 'Sukses Reject'
            });
          }else if (kode_status == 'APS1'){

            let sql = `UPDATE fkr SET updated=getdate(),updatedby = '${m_user_id}',
            kode_status = 'RJC',
            status='Reject By CSO', reason='${reason}'
            WHERE fkr_id='${fkr_id}'`;
            await request.query(sql);


            let insertAuditFkr = `INSERT INTO audit_fkr
            (createdby, updatedby, fkr_id, nama, nik, status, reason)
            VALUES('${m_user_id}','${m_user_id}','${fkr_id}','${namaUser}', '${nik}', 
            'Reject By CSO', '${reason}')`;
            await request.query(insertAuditFkr);


            return res.success({
              message: 'Sukses Reject'
            });
            
          }else if(kode_status == 'APS2') {

            let sql = `UPDATE fkr SET updated=getdate(),updatedby = '${m_user_id}',
            kode_status = 'RJC',
            status='Reject By CEO', reason='${reason}'
            WHERE fkr_id='${fkr_id}'`;
            await request.query(sql);


            let insertAuditFkr = `INSERT INTO audit_fkr
            (createdby, updatedby, fkr_id, nama, nik, status, reason)
            VALUES('${m_user_id}','${m_user_id}','${fkr_id}','${namaUser}', '${nik}', 
            'Reject By CEO', '${reason}')`;
            await request.query(insertAuditFkr);


            return res.success({
              message: 'Sukses Reject'
            });

          }else {

            return res.error({
              message : 'Flow Reject Belum ditentukan'
            }); 

          }
  
      }catch(err){
          return res.success({
            message: err
          });
      }
  }
  
}