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
const sftp = new ClientSFTP();
const ftpconfig = {
  host: "192.168.1.148",
  port:22,
  user: "sapftp",
  password: "sapftp@2020"
}
module.exports = {

    approveFKR: async function(req, res) {
        const {
            query: {m_user_id,fkr_id,reason}
          } = req;
        await DB.poolConnect;

        try {
          const request = DB.pool.request();
          let sqlgetfkr = `SELECT nomor_fkr FROM fkr murv WHERE fkr_id='${fkr_id}'`;  
          let getdatafkr = await request.query(sqlgetfkr);
          let nomor_fkr = getdatafkr.recordset[0].nomor_fkr;

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
            let sqlGetRole = `SELECT nama,m_role_id 
            FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
            
            let datarole = await request.query(sqlGetRole);
            let rolename = datarole.recordset[0].nama;
            let m_role_id = datarole.recordset[0].m_role_id;
      
            let ceknomor_so = `select * from fkr where fkr_id = '${fkr_id}'`;
            let dataso = await request.query(ceknomor_so);
      
            // retur 2021 
            // let nomorso = dataso.recordset[0].nomor_so;
            let nomorso = dataso.recordset[0].nomor_fkr;
      
            //cek satuan terbesar
            let change = `update a set a.satuan = c.satuan
            from fkr_detail a 
            inner join m_produk b on a.m_produk_id = b.m_produk_id
            inner join r_satuan_terbesar c on c.kode_sap = b.kode_sap
            where fkr_id = '${fkr_id}'
            and a.satuan <> c.satuan`;
            await request.query(change);
      
            
            let status = ``;
            let kodestatus = ``;
            let setamount = ``;
            let namastatusaudit=``;
            let kodestatusaudit=``;
            
            if(rolename=='ASDH'){
              status = `, status = 'Waiting RSM'`;
              kodestatus = `, kode_status = 'APA'`;
              namastatusaudit = 'Waiting RSM';
              kodestatusaudit = 'APA';
            }else if(rolename=='RSDH'){
              status = `, status = 'Waiting Sales Head'`;
              kodestatus = `, kode_status = 'APR'`;
              namastatusaudit = 'Waiting Sales Head';
              kodestatusaudit = 'APR';
            }else if(rolename=='LOGISTIK'){
              status = `, status = 'Approved'`;
              kodestatus = `, kode_status = 'APL'`;
              namastatusaudit = 'Approved';
              kodestatusaudit = 'APL';
            }else if(rolename=='ACCOUNTING'){
              status = `, status = 'Approved'`;
              kodestatus = `, kode_status = 'APF'`;
              namastatusaudit = 'Approved';
              kodestatusaudit = 'APF';
            }else if(rolename=='SALESHO1'){
              status = `, status = 'Approved Sales'`;
              kodestatus = `, kode_status = 'APS3'`;
              namastatusaudit = 'Approved Sales';
              kodestatusaudit = 'APS3';
            }
            else if(rolename=='SALESHO2'){
              status = `, status = 'Approved Sales'`;
              kodestatus = `, kode_status = 'APS2'`;
              namastatusaudit = 'Approved Sales';
              kodestatusaudit = 'APS2';
            }
            else if(rolename=='SALESHO3'){
              status = `, status = 'Approved Sales'`;
              kodestatus = `, kode_status = 'APS1'`;
              namastatusaudit = 'Approved Sales';
              kodestatusaudit = 'APS1';
            }else{
              // return res.error('ROLE TIDAK DAPAT MELAKUKAN APPROVE');
            }
      
            if(rolename=='ASDH'){
              let tgl_penarikan = reason
      
              let cektgl = `select DATEADD(day, 14, created),convert(varchar(8),DATEADD(day, 14, created),112)days
              from fkr where fkr_id = '${fkr_id}'
              and convert(varchar(10),DATEADD(day, 14, created),120) <= '${reason}'`
      
              console.log(cektgl);
              let dstgl = await request.query(cektgl);
              if(dstgl.recordset.length == 0){
                return res.error("Minimal tgl Penarikan adalah 14 Hari dari pengajuan");
              }
              // return res.error("Sukses....");
      
              let sql = `UPDATE fkr SET updated=getdate(),
              updatedby = '${m_user_id}', tgl_penarikan = '${reason}',
              status = '${namastatusaudit}' ${kodestatus}
              WHERE fkr_id='${fkr_id}'`;
              //console.log('kodestatus');
              request.query(sql, async (err) => {
                if (err) {
                  return res.error(err);
                }
      
      
                let sqlinsertAudit = `INSERT INTO fkr_audit_approve
                (createdby,updatedby,fkr_id, m_role_id, actions, kode_status,note)
                VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}','${reason}')`;
                await request.query(sqlinsertAudit);
        
                let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
                let datafkr = await request.query(sqlgetfkr);
                const rows = datafkr.recordset;
                let lemparan = buatxml(nomorso,"Waiting Approval RSM");
                let lemparan2 = buatxml2(nomorso,"Waiting Approval RSM");
      
                // console.log(lemparan);
                try {
                  nomorso ? lemparFTP(lemparan2,nomorso) : null;
                  // let responeSoap =  await callSoapApprove(lemparan);
                  // let {body, statusCode } = responeSoap;
                  // console.log(statusCode);
                } catch (error) {
                  
                }
                return res.success({
                  result: rows,
                  message: "Approve FKR successfully"
                });
              });
      
              
            }else if(rolename=='RSDH'){
      
              let sql = `UPDATE fkr SET updated=getdate(),
              updatedby = '${m_user_id}',
              status = '${namastatusaudit}' ${kodestatus}
              WHERE fkr_id='${fkr_id}'`;
              //console.log('kodestatus');
              request.query(sql, async (err) => {
                if (err) {
                  return res.error(err);
                }
      
      
                let sqlinsertAudit = `INSERT INTO fkr_audit_approve
                (createdby,updatedby,fkr_id, m_role_id, actions, kode_status,note)
                VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}','${reason}')`;
                await request.query(sqlinsertAudit);
        
                let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
                let datafkr = await request.query(sqlgetfkr);
                const rows = datafkr.recordset;
      
                let lemparan = buatxml(nomorso,"Waiting Approval Channel Head");
                let lempara2n = buatxml2(nomorso,"Waiting Approval Channel Head");
                console.log(lemparan);
                try {
                  nomorso ? lemparFTP(lemparan2,nomorso) : null;
                  // let responeSoap =  await callSoapApprove(lemparan);
                  // let {body, statusCode } = responeSoap;
                  // console.log(statusCode);
                } catch (error) {
                  
                }
        
                return res.success({
                  result: rows,
                  message: "Approve FKR successfully"
                });
              });
      
      
            }else if(rolename=='SALESHO1' || rolename=='SALESHO2' || rolename=='SALESHO3'){
              let roleOK ='';
              if(rolename=='SALESHO1'){
                roleOK = 'CEO'
              }else if(rolename=='SALESHO2'){
                roleOK = 'COO'
              }else if(rolename=='SALESHO3'){
                roleOK = 'CSMO'
              }
              
      
              let sqlgetnominal = `SELECT nomor_fkr,amount,nomor_so,eksekusi FROM fkr where fkr_id = '${fkr_id}'`;
              let datanominal = await request.query(sqlgetnominal);
              let nominal_approve = datanominal.recordset[0].amount;
              let so_exsist = datanominal.recordset[0].nomor_so;
              let nomor_fkr = datanominal.recordset[0].nomor_fkr;
              let so_jenis = datanominal.recordset[0].eksekusi;
      
              let topapprovement = ``;
              let dataTopApprovement = ``;
              if(nominal_approve > 0){
      
                let slgetTopApprovement = `SELECT mr.nama
                FROM fkr_role_amount_approve fraa
                LEFT JOIN m_role mr ON(mr.m_role_id = fraa.m_role_id)
                WHERE fraa.amount <= ${nominal_approve} 
                ORDER BY fraa.amount DESC`;
      
                dataTopApprovement = await request.query(slgetTopApprovement);
                topapprovement = dataTopApprovement.recordset[0].nama;
              }
              
            if(topapprovement==rolename){
              let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
              let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
              let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
      
              let url = ``;
              let usernamesoap = sails.config.globals.usernamesoap;
              let passwordsoap = sails.config.globals.passwordsoap;
              
              let queryDataTable = `SELECT * FROM fkr_to_sap_v ftsv WHERE fkr_id='${fkr_id}'`;
              console.log(queryDataTable);
              let datafkr = await request.query(queryDataTable);
              let rows = datafkr.recordset;
      
            let datas = []
            let datas2 = []
            for(let i = 0;i< rows.length ; i++){
      
              let btstnk = '';
              // let bulan = pad(rows[i].bulan);
              // let tahun = rows[i].tahun;
              // let periode = tahun.concat(bulan);
              let kodesap = ``;
              let nomor_fkr = rows[i].nomor_fkr;
              // ZCR3	MI Return Over Stock
              // ZCR4	MI Product Recall
              // ZCR5	SO Peralihan ke MI
              // ZCR6	SO Peralihan ke DTB
              // console.log(rows[i].eksekusi);
              if(rows[i].eksekusi == 'Over Stock'){
                btstnk = rows[i].keterangan;
                kodesap = 'ZCR3';
              }else if(rows[i].eksekusi=='Product Recall'){
                btstnk = rows[i].keterangan;
                kodesap = 'ZCR4';
              }else if(rows[i].eksekusi=='Peralihan MI'){
                btstnk = rows[i].keterangan;
                kodesap = 'ZCR5';
              }else if(rows[i].eksekusi=='Peralihan Distributor'){
                btstnk = 'Peralihan'//rows[i].keterangan;
                kodesap = 'ZCR6';
              }else if(rows[i].eksekusi=='Product Recall / Delisting'){
                btstnk = rows[i].keterangan;
                kodesap = 'ZCR4';
              }
      
      
                //console.log(nomor_fkr);
                datas.push({
      
                    KUNNR : rows[i].sold_to,
                    KUNNS : rows[i].ship_to,
                    VTWEG : rows[i].kode_channel,
                    SPART : rows[i].division,
                    AUART : kodesap,
                    BSARK : '2212',
                    MATNR : rows[i].kode_material,
                    VRKME : rows[i].satuan,
                    ABRVW : 'Z1',
                    KWEMNG: rows[i].total_retur,
                    BSTNK : btstnk,
                    VTEXT : nomor_fkr
      
                });
            }
      
      
            let xml = fs.readFileSync('soap/ZFM_WS_SOFKR.xml', 'utf-8');
            let hasil = racikXML(xml, datas, 'ITAB');
            console.log(hasil);
      
           
            let remotePath = ``;
            if(statusIntegasi=='DEV'){
             url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_sofkr/120/zws_sales_sofkr/zbn_sales_sofkr'; // development
             remotePath = '/home/sapftp/esales/fkr/approval/requestdev/'+`${so_exsist}.xml`;
             usernamesoap = sails.config.globals.usernamesoapdev;
             passwordsoap = sails.config.globals.passwordsoapdev;
      
            }else{
              // url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_sofkr/120/zws_sales_sofkr/zbn_sales_sofkr';
             url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_sofkr/300/zws_sales_sofkr/zbn_sales_sofkr'; // production
             remotePath = '/home/sapftp/esales/fkr/approval/request/'+`${so_exsist}.xml`;
             usernamesoap = sails.config.globals.usernamesoap;
             passwordsoap = sails.config.globals.passwordsoap;
              
            }
            // cek so exists
            if(so_exsist){
              let datas = [so_exsist];
              let xml = fs.readFileSync('soap/REQUEST_SOAP.xml', 'utf-8');
              let hasil = racikXMLObject2(xml, datas, 'VBELN');
              console.log(hasil);
              try {
      
                
                //let remotePath = '/home/sapftp/esales/fkr/approval/request/'+`${so_exsist}.xml`;
                let locationFiles = dokumentPath('fkrtemp','requestApprove').replace(/\\/g, '/');
                let dst = dokumentPath('fkrtemp','requestApprove') + '/' +`${so_exsist}.xml`;
                let localPath = dst.replace(/\\/g, '/');
      
                fs.writeFileSync(localPath, hasil);
                let filenames = fs.existsSync(localPath);
                if(filenames){
      
                    await sftp.connect(ftpconfig)
                    .then(() => {
                      return sftp.fastPut(localPath,remotePath);
                    })
                    .then(() => {
                      sftp.end();
                    })
                    .catch(err => {
                      console.error(err.message);
                  });
      
                }
              } catch (error) {
                console.log(error);
              }
              let sts = ``
              console.log("cccccccccccccc",so_jenis);
              if(so_jenis=='Peralihan Distributor'){
                sts = `Waiting BA Peralihan`
              }else if(so_jenis=='Pemusnahan Lokal' || so_jenis=='PEMUSNAHAN'){
                sts = `Waiting BA Pemusnahan`
              }else{
                sts = `Waiting BA Penarikan Barang`
              }
              let sql = `UPDATE fkr 
                      SET updated=getdate(),
                      kode_status = 'WT1', status = '${sts}',
                      updatedby = '${m_user_id}',
                      isconfirm_logistik = 'N'
                      WHERE fkr_id='${fkr_id}'`;
              await request.query(sql);
              // FTP Status
      
              let lemparan2 = buatxml2(so_exsist,sts);
              try {
                lemparFTP(lemparan2,nomorso)
              } catch (error) {
                
              }
      
              let cekUser = `select * from m_user where role_default_id = '4f023218-a611-4ace-9466-238db3f5671f'` //logistik
              let users = await request.query(cekUser);
              users = users.recordset;
              for(let i = 0; i < users.length; i ++){
                  let user =  users[i].m_user_id;
                  insertNotifikasi = `insert into notifikasi_fkr (fkr_id,m_user_id,kode_status,notif_desc)
                  values ('${fkr_id}','${user}','WT2','Menunggu BA Logistik')`;
                  await request.query(insertNotifikasi)
              }
      
              let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
              let datafkr = await request.query(sqlgetfkr);
              let rows = datafkr.recordset;
      
              let sqlinsertAudit = `INSERT INTO fkr_audit_approve
              (createdby,updatedby,fkr_id, m_role_id, actions, kode_status,note)
              VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}','${reason}')`;
              await request.query(sqlinsertAudit);


              
            let param = {
              keterangan:'FKR ini Berhasil diapprove',
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

              const tok = `${usernamesoap}:${passwordsoap}`;
              const hash = Base64.encode(tok);
              const Basic = 'Basic ' + hash;
      
      
              let headers = {
                'Authorization':Basic,
                'user-agent': 'esalesSystem',
                'Content-Type': 'text/xml;charset=UTF-8',
                'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_SOFKR:ZFM_WS_SOFKRRequest',
              };
      
              let { response } = await soapRequest({ url:url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
              let {body, statusCode } = response;
              console.log(" BBBB ",hasil);
              // console.log('statusCode ',statusCode);
              let sqlgetdatafkr = `SELECT nomor_fkr,nomor_fkr as nomor_so,eksekusi FROM fkr WHERE fkr_id='${fkr_id}'`;
              let datafkr2 = await request.query(sqlgetdatafkr);
              let nomor_fkr = datafkr2.recordset.length > 0 ? datafkr2.recordset[0].nomor_fkr : '';
              let nomor_so = datafkr2.recordset.length > 0 ? datafkr2.recordset[0].nomor_so : '';
              let eksekusi = datafkr2.recordset.length > 0 ? datafkr2.recordset[0].eksekusi : '';
              if(datafkr2.recordset.length > 0 ){
                console.log(response.body, statusCode);
                // console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
                if(statusCode==200){
                  console.log("disini...");
                  var parser = new xml2js.Parser({explicitArray : false});
                  parser.parseString(body, async function (err, result) {
                    if (err) {
                      return res.error(err);
                    }
      
                    const VALUE = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_SOFKRResponse'].VALUE;
                    const VBELN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_SOFKRResponse'].VBELN;
                    let nilai_so = Number(VALUE) * 100;
      
                    let setamount= `, amount = ${nilai_so}`;  
                    let setnomorso= `, nomor_so = ${VBELN}`;
      
                    console.log(VBELN, VALUE,"balikan SAP");
                    // return res.error("OKE......")
                    if(VBELN){
      
                      if(rows[0].eksekusi=='Peralihan Distributor'){
                          let dtalihan = await request.query(`select b.kode_pajak,kode,nama,kode_channel from fkr a 
                                          inner join m_distributor_v b on b.m_distributor_id = a.tujuan_retur
                                          where a.fkr_id = '${fkr_id}'`);
                          dtalihan = dtalihan.recordset;
                          let soldTo = dtalihan[0].kode_pajak;
                          let shipTo = dtalihan[0].kode;
                          let kode_channel = dtalihan[0].kode_channel;
                          for(let i = 0;i< rows.length ; i++){
                            datas2.push({
                              KUNNR : soldTo,
                              KUNNS : shipTo,
                              VTWEG : rows[i].kode_channel,
                              SPART : rows[i].division,
                              AUART : 'ZC01',
                              BSARK : "",
                              MATNR : rows[i].kode_material,
                              VRKME : rows[i].satuan,
                              ABRVW : '',
                              KWEMNG: rows[i].total_retur,
                              BSTNK : VBELN,
                              VTEXT : nomor_fkr
                            })
                          }
                          xml = fs.readFileSync('soap/ZFM_WS_SOALIHAN.xml', 'utf-8');
                          let hasil2 = racikXML(xml, datas2, 'ITAB');
                          console.log(hasil2);
                          let url2 = ``;
      
                          if(statusIntegasi=='DEV'){
                            url2 = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_soalihan/120/zws_sales_soalihan/zbn_sales_soalihan`; // development
                           }else{
                            url2 = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_soalihan/300/zws_sales_soalihan/zbn_sales_soalihan`; // production                       
                          }
                          
                          let { response } = await soapRequest({ url:url2, headers: headers,xml:hasil2, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
                          let {body, statusCode } = response;
      
                          console.log('statusCode ',response);
                          var parser = new xml2js.Parser({explicitArray : false});
                          parser.parseString(body, async function (err, result) {
                            if (err) {
                              return res.error(err);
                            }
                            const VALUE = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_SOALIHANResponse'].VALUE;
                            const VBELN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_SOALIHANResponse'].VBELN;
                            console.log(VBELN);
                            if(VBELN){
                              await request.query(`update fkr set nomor_so_alihan = '${VBELN}' where fkr_id = '${fkr_id}'`)
                            }else{
                              return res.error("Tidak dapat nomor SO Alihan...")
                            }
                          });
                          // return res.error("Tidak dapat nomor SO...")
                      }
                      // return res.error("Tidak dapat nomor SO2...")
      
                      let sql = `UPDATE fkr 
                      SET updated=getdate(),
                      updatedby = '${m_user_id}'
                      ${setnomorso}
                      WHERE fkr_id='${fkr_id}'`;
                      await request.query(sql);
                    }else{
                      return res.error("Tidak dapat nomor SO...")
                    }
      
                    const PESAN = 'Success Approve'
                    //result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_APFKRResponse'].PESAN;
                    let sqlgetnominal = `SELECT amount FROM fkr where fkr_id = '${fkr_id}'`;
                    let datanominal = await request.query(sqlgetnominal);
                    let nominal_approve = datanominal.recordset[0].amount;
      
                    let topapprovement = ``;
                    if(nominal_approve > 0){
      
                      let slgetTopApprovement = `SELECT mr.nama
                      FROM fkr_role_amount_approve fraa
                      LEFT JOIN m_role mr ON(mr.m_role_id = fraa.m_role_id)
                      WHERE fraa.amount <= ${nominal_approve} 
                      ORDER BY fraa.amount DESC`;
        
                      let dataTopApprovement = await request.query(slgetTopApprovement);
                      topapprovement = dataTopApprovement.recordset[0].nama;
                    }
                    
      
                    // retur 2021
                    let statusapprove = `On Progress`;
                    let isconfirm_logistik = ``;
                    let insertNotifikasi = ``;
                    let sts = ``
                    if(topapprovement==rolename){
                      isconfirm_logistik = `, isconfirm_logistik = 'N'`
      
                      
                      if(rows[0].eksekusi=='Peralihan Distributor'){
                        sts = `Waiting BA Peralihan`
                      }else{
                        sts = `Waiting BA Penarikan Barang`
                      }
                      // statusapprove = PESAN;
                      statusapprove = sts;
                      kodestatus = `, kode_status = 'WT1'`
                      if(eksekusi == "PEMUSNAHAN"){
                        statusapprove = "BAP Belum Diterima Logistik"
                      }
      
                      let cekUser = `select * from m_user where role_default_id = '4f023218-a611-4ace-9466-238db3f5671f'` //logistik
                      let datas = await request.query(cekUser);
                      datas = datas.recordset;
                      for(let i = 0; i < datas.length; i ++){
                          let user =  datas[i].m_user_id;
                          insertNotifikasi = `insert into notifikasi_fkr (fkr_id,m_user_id,kode_status,notif_desc)
                          values ('${fkr_id}','${user}','WT2','Menunggu BA Logistik')`;
                          await request.query(insertNotifikasi)
                      }
                      
                    }
      
      
                    let sql = `UPDATE fkr SET updated=getdate(),
                    updatedby = '${m_user_id}',
                    status = '${statusapprove}' ${kodestatus} ${isconfirm_logistik}
                    WHERE fkr_id='${fkr_id}'`;
                    
                    console.log(sql,"***********");
                    
                    request.query(sql, async (err) => {
                      if (err) {
                        return res.error(err);
                      }
      
      
                      let sqlinsertAudit = `INSERT INTO fkr_audit_approve
                      (createdby,updatedby,fkr_id, m_role_id, actions, kode_status,note)
                      VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}','${reason}')`;
                      await request.query(sqlinsertAudit);
              
                      let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
                      let datafkr = await request.query(sqlgetfkr);
                      const rows = datafkr.recordset;
      
                      let getdataemail = await request.query(`select email_verifikasi,role from email_klaim  where role = 'LOGISTIK'`);
                      console.log("EMAIL NOTIF RILIS NOMOR SO ",getdataemail);
      
                      let dataemail = []
                      for (let i = 0; i < getdataemail.recordset.length; i++) {
                        
                        dataemail.push(getdataemail.recordset[i].email_verifikasi);
                      
                      }
                      // dataemail.push(['tiasadeputra@gmail.com']);
                      // dataemail.push(['ilyas.nurrahman74@gmail.com']);                
                      if(dataemail.length > 0){
      
      
                        let sqlParam = `SELECT fkr_id,nama_distributor,
                        CONCAT(DateName( month , DateAdd( month , bulan , 0 ) - 1 ),' - ',tahun) AS periode,
                        eksekusi,nomor_so FROM fkr_v  WHERE fkr_id = '${fkr_id}'`
                        let getdataparam = await request.query(sqlParam);
                        let dataparam = getdataparam.recordset[0];
              
      
                        let queryDetail = `SELECT a.fkr_detail_id, 
                        a.isactive, a.created, a.createdby, 
                        a.updated, a.updatedby, a.fkr_id, a.m_produk_id,
                        COALESCE(rst.keterangan,a.satuan) AS satuan,
                        mp.kode AS kode_produk,
                        mp.kode_sap,
                        mp.nama AS nama_barang,
                        a.total_retur, 
                        a.expired_gudang, a.expired_toko, a.damage, a.recall, 
                        a.retur_administratif, a.rusak_di_jalan, a.misspart, a.peralihan,
                        a.repalcement, a.delisting, a.keterangan
                        FROM fkr_detail a
                        LEFT JOIN r_satuan_terkecil rst ON (a.satuan = rst.kode)
                        ,m_produk mp
                        WHERE a.fkr_id='${fkr_id}'
                        AND a.m_produk_id = mp.m_produk_id`;
                        let dataDetails = await request.query(queryDetail);
                        let details = dataDetails.recordset;
                        for (let i = 0; i < details.length; i++) {
                          
                            details[i].nomor = i + 1;
                          
                        }
                        let detailshtml = _generateDetailsApproveEmail(details);
      
                        const param = {
                          subject:'TELAH RILIS SO FKR '+dataparam.nomor_so,
                          distributor:dataparam.nama_distributor,
                          eksekusi:dataparam.eksekusi,
                          periode:dataparam.periode,
                          nomor_so:dataparam.nomor_so,
                          details:detailshtml
                  
                        }
                  
                        const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'fkr_progress2', templateparam: param }); 
                        SendEmail(dataemail.toString(), param.subject, template);
                        
                  
                        }
      

                      try {
                        let px = `select * from fkr where fkr_id = '${fkr_id}'`
                        let dtpx = await request.query(px);
                        dtpx = dtpx.recordset;
      
                        console.log("throw..........")
                        let lemparan2 = buatxml2(dtpx[0].nomor_so,sts);
                        lemparFTP(lemparan2,fkr_id)

                      } catch (error) {
                        console.log(error);
                      }
      
                      let param = {
                        keterangan:'FKR ini Berhasil diapprove',
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

            
                    });
                  
                  });
                }else{
      
                  return res.error(
                   `SAP tidak meresponse status response ${statusCode}`
                  );
                
                }
              }
      
            }else{
      
      
              let sql = `UPDATE fkr SET updated=getdate(),
              updatedby = '${m_user_id}',
              status = 'On Progress' ${kodestatus}
              WHERE fkr_id='${fkr_id}'`;
              
              request.query(sql, async (err) => {
                if (err) {
                  return res.error(err);
                }
      
      
                let sqlinsertAudit = `INSERT INTO fkr_audit_approve
                (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
                VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}')`;
                await request.query(sqlinsertAudit);
        
                let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
                let datafkr = await request.query(sqlgetfkr);
                const rows = datafkr.recordset;
                let dataemail = [];
      
                let slgetTopApprovement = `SELECT mr.nama
                FROM fkr_role_amount_approve fraa
                LEFT JOIN m_role mr ON(mr.m_role_id = fraa.m_role_id)
                WHERE fraa.amount <= ${nominal_approve} 
                ORDER BY fraa.amount DESC`;
  
                console.log(slgetTopApprovement);
      
                let dataTopApprovement = await request.query(slgetTopApprovement);
                let dataarraypapprovement = dataTopApprovement.recordset;
                //topapprovement = dataTopApprovement.recordset[0].nama;
                let position = 0;
                let nextemail = ``;
                for (let i = 0; i < dataarraypapprovement.length; i++){
                    topapprovement = dataTopApprovement.recordset[i].nama;
                    if(topapprovement == rolename){
                      position = i;
                    }
                }
                let q = ``;
                console.log(dataarraypapprovement);
  
                if(position == 1 && dataarraypapprovement.length==3){
                  //email ke dataTopApprovement.recordset[1].nama
                   q = `select kode_channel,email_verifikasi,role,m_user_id from email_klaim where role = 'SALESHO1'`;
      
                }else if(position == 0 && dataarraypapprovement.length==2){
                  //email ke dataTopApprovement.recordset[2].nama
                  q = `select kode_channel,email_verifikasi,role,m_user_id from email_klaim where role = 'SALESHO1'`;
      
                }else if(position == 1 && dataarraypapprovement.length==2){
                  //email ke dataTopApprovement.recordset[2].nama
                  q = `select kode_channel,email_verifikasi,role,m_user_id from email_klaim where role = 'SALESHO2'`;
      
                }else if(position == 2 && dataarraypapprovement.length==3){
                  //email ke dataTopApprovement.recordset[2].nama
                  q = `select kode_channel,email_verifikasi,role,m_user_id from email_klaim where role = 'SALESHO2'`;
                }
  
  
                let emailfkr = await request.query(q);
                const rowz = emailfkr.recordset;
                let user_target = rowz.length > 0 ? emailfkr.recordset[0].m_user_id : null;
                if(rowz.length > 0){
                  for(let i = 0; i < rowz.length; i++){
                    dataemail.push(rowz[i].email_verifikasi)
                  }
                }
      
                // dataemail.push("indra.suandi@enesis.com")
      
                let sqlParam = `SELECT fkr_id,nama_distributor,status,
                CONCAT(DateName( month , DateAdd( month , bulan , 0 ) - 1 ),' - ',tahun) AS periode,nomor_fkr
                eksekusi,nomor_so,amount FROM fkr_v  WHERE fkr_id = '${fkr_id}'`
                let getdataparam = await request.query(sqlParam);
                let dataparam = getdataparam.recordset[0];
                //let nomor_so = dataparam.nomor_so ? dataparam.nomor_so : '';
                let nomor_fkr = dataparam.nomor_fkr ? dataparam.nomor_fkr : '';
      
                let queryDetail = `SELECT a.fkr_detail_id, 
                        a.isactive, a.created, a.createdby, 
                        a.updated, a.updatedby, a.fkr_id, a.m_produk_id,
                        COALESCE(rst.keterangan,a.satuan) AS satuan,
                        mp.kode AS kode_produk,
                        mp.kode_sap,
                        mp.nama AS nama_barang,
                        a.total_retur, 
                        a.expired_gudang, a.expired_toko, a.damage, a.recall, 
                        a.retur_administratif, a.rusak_di_jalan, a.misspart, a.peralihan,
                        a.repalcement, a.delisting, a.keterangan
                        FROM fkr_detail a
                        LEFT JOIN r_satuan_terkecil rst ON (a.satuan = rst.kode)
                        ,m_produk mp
                        WHERE a.fkr_id='${fkr_id}'
                        AND a.m_produk_id = mp.m_produk_id`;
                        let dataDetails = await request.query(queryDetail);
                        let details = dataDetails.recordset;
                for (let i = 0; i < details.length; i++) {
                  
                    details[i].nomor = i + 1;
                  
                }
                let detailshtml = _generateDetailsApproveEmail(details);
      
                const param = {
                  
                  subject:'NEED APPROVAL FKR '+nomor_fkr,
                  distributor:dataparam.nama_distributor,
                  eksekusi:dataparam.eksekusi,
                  periode:dataparam.periode,
                  nominal_so:numeral(dataparam.amount).format('0,0'),
                  status:dataparam.status,
                  details:detailshtml,
                  linkapprove:`https://esales.enesis.com/api/fkr/approve?m_user_id=${user_target}&fkr_id=${fkr_id}`,
                  linkreject:`https://esales.enesis.com/api/fkr/reject?m_user_id=${user_target}&fkr_id=${fkr_id}`          
                }
          
                if(user_target){
                  const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'fkr_progress2', templateparam: param }); 
                  SendEmail(dataemail.toString(), param.subject, template);
                }
      
                let lemparan = buatxml(nomorso,"Waiting Approval "+roleOK);
                console.log(lemparan);
                try {
                  let responeSoap =  await callSoapApprove(lemparan);
                  let {body, statusCode } = responeSoap;
                  console.log(statusCode);
                } catch (error) {
                  
                } 
                
                return res.success({
                  result: rows,
                  message: "Approve FKR successfully"
                });
              });
      
            }
      
      
            }else if(rolename=='FKR LOGISTIK'){
              console.log("Konfirmasi dokumen BAP");
              let sql_fkr = `select b.nama_ship_to,a.nomor_so,a.nomor_fkr,a.r_distribution_channel_id,d.r_region_id 
              ,b.email_verifikasi as emailasdh ,c.email_verifikasi as emaildtb
              ,CONCAT(DateName( month , DateAdd( month , bulan , 0 ) - 1 ),' - ',tahun) AS periode
              from fkr_v a
              left join m_distributor_profile_v b on a.m_distributor_id = b.m_distributor_id
              and b.rolename in ('ASDH','RSDH')
              left join email_distributor c on c.m_distributor_id = a.m_distributor_id
              and tipe = 'FKR'
              left join r_region d on d.kode = b.kode_region
              where a.fkr_id = '${fkr_id}'`;
      
              let data_fkr = await request.query(sql_fkr);
              data_fkr = data_fkr.recordset;
              let channel
              let m_distributor_id 
              let nama_shipto 
              let nomor_so
              let nomor_fkr
              let region_id
              let priode
              let dataemail = [];
      
              if(data_fkr.length > 0){
                channel = data_fkr[0].r_distribution_channel_id;
                m_distributor_id = data_fkr[0].m_distributor_id;
                nama_shipto = data_fkr[0].nama_ship_to;
                nomor_so = data_fkr[0].nomor_so;
                nomor_fkr = data_fkr[0].nomor_fkr;
                region_id = data_fkr[0].r_region_id
                periode = data_fkr[0].periode
                for(let i = 0; i < data_fkr.length ; i++){
                  if(data_fkr[i].emailasdh){
                    dataemail.push(data_fkr[i].emailasdh)
                  }
                  if(data_fkr[i].emaildtb){
                    dataemail.push(data_fkr[i].emaildtb)
                  }
                  
                }
              }
      
              let sql_email = `select * from email_klaim where (r_distribution_channel_id = '${channel}'
              and r_region_id = '${region_id}' and role = 'SALES')
              or role = 'LOGISTIK'`;
      
              console.log(sql_email);
              let data_email = await request.query(sql_email)
              data_email =  data_email.recordset
              if(data_email.length > 0){
                for(let i =0; i< data_email.length; i++){
                  dataemail.push(data_email[i].email_verifikasi)
                }
              }
              //console.log(dataemail);
              
              const param = {
                  
                subject:'DOKUMEN BAP PEMUSNAHAN '+nama_shipto+' TELAH DITERIMA',
                nomor_dokumen:nomor_fkr,
                periode:periode,
                nomor_so:nomor_so,
                distributor:nama_shipto
              }
              
             
              const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'notice_bap_accepted', templateparam: param }); 
              //console.log(template);
              let sqlupdate = `update fkr set status = 'BAP Diterima Logistik' where fkr_id = '${fkr_id}'`;
              request.query(sqlupdate, async (err) => {
                if (err) {
                  return res.error(err);
                }else{
                  SendEmail(dataemail.toString, param.subject, template);
                  //SendEmail("tiasadeputra@gmail.com", param.subject, template);
                  return res.success(
                    "Dokumen BAP telah diterima ...."
                  );
                }
              })
      
  
            }else{
      
      
              let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
              let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
              let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
      
              let usernamesoap = sails.config.globals.usernamesoap;
              let passwordsoap = sails.config.globals.passwordsoap;
          
              let url = ``;
              if(statusIntegasi=='DEV'){
                
                url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_histfkr/120/zws_sales_histfkr/zbn_sales_histfkr'; // development
                usernamesoap = sails.config.globals.usernamesoapdev;
                passwordsoap = sails.config.globals.passwordsoapdev;
          
          
              }else{
      
                url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_histfkr/300/zws_sales_histfkr/zbn_sales_histfkr'; // production
                usernamesoap = sails.config.globals.usernamesoap;
                passwordsoap = sails.config.globals.passwordsoap;
          
              }
      
              // let usernamesoap = sails.config.globals.usernamesoap;
              // let passwordsoap = sails.config.globals.passwordsoap;
              const tok = `${usernamesoap}:${passwordsoap}`;
              const hash = Base64.encode(tok);
              const Basic = 'Basic ' + hash;
      
              
              let headers = {
                'Authorization':Basic,
                'user-agent': 'esalesSystem',
                'Content-Type': 'text/xml;charset=UTF-8',
                'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_SOFKR:ZFM_WS_SOFKRRequest',
              };
      
              let sqlgetdatafkr = `SELECT nomor_so FROM fkr WHERE fkr_id='${fkr_id}'`;
              let datafkr = await request.query(sqlgetdatafkr);
              let nomor_so = datafkr.recordset.length > 0 ? datafkr.recordset[0].nomor_so : '';
      
              if(datafkr.recordset.length > 0 ){
      
                let datas = [nomor_so];
                let xml = fs.readFileSync('soap/ZFM_WS_FKRHIST.xml', 'utf-8');
                let hasil = racikXMLObject(xml, datas, 'VBELN');
                //console.log(hasil);
      
                let { response } = await soapRequest({ url: url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
                let {body, statusCode } = response;
                if(statusCode==200){
                  var parser = new xml2js.Parser({explicitArray : false});
                  parser.parseString(body, async function (err, result) {
                    if (err) {
                      return res.error(err);
                    }
      
      
                    const CN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FKRHISTResponse'].CN;              
      
                    if(CN){
      
                      let sql = `UPDATE fkr SET updated=getdate(),
                      updatedby = '${m_user_id}',
                      nomor_cn = '${CN}' ${kodestatus}
                      WHERE fkr_id='${fkr_id}'`;
                      
                      
                      
                      request.query(sql, async (err) => {
                        if (err) {
                          return res.error(err);
                        }
      
                        let sqlinsertAudit = `INSERT INTO fkr_audit_approve
                        (createdby,updatedby,fkr_id, m_role_id, actions, kode_status)
                        VALUES('${m_user_id}', '${m_user_id}', '${fkr_id}', '${m_role_id}', 'APPROVE', '${kodestatusaudit}')`;
                        await request.query(sqlinsertAudit);
                
                        let sqlgetfkr = `SELECT * FROM fkr_to_sap_v WHERE fkr_id='${fkr_id}'`;
                        let datafkr = await request.query(sqlgetfkr);
                        const rows = datafkr.recordset;
                
                        return res.success({
                          result: rows,
                          message: `Nomor CN ${CN}`
                        });
                      });
        
                    }else{
                        return res.error(
                          "Nomor CN Belum Tersedia"
                        );
                    }
                  
                  });
                }
              }
            }
          }
        } catch (err) {
          return res.error(err);
        }
      }
    
}
function racikXML(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead })
  const addTemplate = jsonArray.map(data => {
    return {item: data}
  })
  const result = builder.buildObject(addTemplate)
  

  return xmlTemplate.replace('?', result)
}
function racikXML2(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead })
    const addTemplate = jsonArray
    const result = builder.buildObject(jsonArray)
    
  
    return xmlTemplate.replace('?', result)
}

function racikXMLObject(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead }) 
  const result = builder.buildObject(jsonArray[0]) 
  return xmlTemplate.replace('?', result)
}
function racikXMLObject2(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead }) 
  const result = builder.buildObject(jsonArray[0]) 
  return xmlTemplate.replace('#', result)
}
function racikXML2Object(xmlTemplate, jsonArray, rootHead, rootSecond) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead }) 
  const result = builder.buildObject(jsonArray[0]) 
  var builder = new xml2js.Builder({headless: true, rootName: rootSecond }) 
  const result1 = builder.buildObject(jsonArray[1]) 
  return xmlTemplate.replace('?', result+result1)
}
function racikXML2Object2(xmlTemplate, jsonArray, rootHead, rootSecond) {
  var builder = new xml2js.Builder({headless: true, rootName: rootHead }) 
  const result = builder.buildObject(jsonArray[0]) 
  var builder = new xml2js.Builder({headless: true, rootName: rootSecond }) 
  const result1 = builder.buildObject(jsonArray[1]) 
  return xmlTemplate.replace('#', result+result1)
}


function pad(d) {
  return (d < 10) ? '0' + d.toString() : d.toString();
}

function base64_encode(file) {
  var bitmap = fs.readFileSync(file);
  return new Buffer(bitmap).toString('base64');
}

async function generateNoFKR(org_id,kode_shipto,today){
  await DB.poolConnect;
  const request = DB.pool.request();
  let nomorFKR = ``
  try {
      // let sqlgetOrg = `SELECT * FROM m_distributor_v WHERE m_distributor_id = '${org_id}'`;
      // let getOrg = await request.query(sqlgetOrg);
      // let dataorg = getOrg.recordset[0];

      queryDataTable = `
      SELECT COUNT(1) + 1 AS totalrows FROM document_number dn,document_number_line dnl 
      WHERE dn.kode='FKR'
      AND dn.document_number_id = dnl.document_number_id
      AND dnl.r_organisasi_id = '${org_id}'`;

      // console.log(queryDataTable);

      let getsequence = await request.query(queryDataTable);
      const row = getsequence.recordset[0];
      let totalrows = pad(row.totalrows);
      let bulan = moment(today,'YYYY-MM-DD').format('MMM');
      let tahun = moment(today,'YYYY-MM-DD').format('YYYY');
      nomorFKR = tahun+"/FKR/"+bulan.toLocaleUpperCase()+"/"+kode_shipto+"/"+totalrows;
     
  } catch (error) {
    console.log(error);
      nomorFKR = '0'
  }

  return nomorFKR
}

function _generateTable(table) {
  if (table.length > 0) {
      const addRowSpan = (column, i, rspan = true, cn = "") => {
          var row = table[i],
              prevRow = table[i - 1],
              td = `<td class="${cn}">${row[column]}</td>`
          if (rspan) {
              if (prevRow && row[column] === prevRow[column]) {
                  td = ``
              } else {
                  var rowspan = 1

                  for (var j = i; j < table.length - 1; j++) {
                      if (table[j][column] === table[j + 1][column]) {
                          rowspan++
                      } else {
                          break
                      }
                  }
                  td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`
              }
          }

          return td
      }

      let content = ""
      for (let i = 0; i < table.length; i++) {
          content = content + `<tr>`
          content = content + addRowSpan("nomor", i, false, "center")
          content = content + addRowSpan("kode_sap", i, false, "left")
          content = content + addRowSpan("kode_produk", i, false, "left")
          content = content + addRowSpan("nama_barang", i, false, "left")
          content = content + addRowSpan("satuan", i, false, "left")
          content = content + addRowSpan("total_retur", i, false, "right")
          content = content + addRowSpan("expired_gudang", i, false, "right")
          content = content + addRowSpan("expired_toko", i, false, "right")
          content = content + addRowSpan("damage", i, false, "right")
          content = content + addRowSpan("recall", i, false, "right")
          content = content + addRowSpan("retur_administratif", i, false, "right")
          content = content + addRowSpan("rusak_di_jalan", i, false, "right")
          content = content + addRowSpan("misspart", i, false, "right")
          content = content + addRowSpan("peralihan", i, false, "right")
          content = content + addRowSpan("repalcement", i, false, "right")
          content = content + addRowSpan("delisting", i, false, "right")
          content = content + addRowSpan("keterangan", i, false, "left")
          content = content + `</tr>`
      }

      return content
  }
  
  return '<tr><td>No Data</td></tr>'
}



function _generateTableProgress(table) {
  if (table.length > 0) {
      const addRowSpan = (column, i, rspan = true, cn = "") => {
          var row = table[i],
              prevRow = table[i - 1],
              td = `<td class="${cn}">${row[column]}</td>`

          if (rspan) {
              if (prevRow && row[column] === prevRow[column]) {
                  td = ``
              } else {
                  var rowspan = 1

                  for (var j = i; j < table.length - 1; j++) {
                      if (table[j][column] === table[j + 1][column]) {
                          rowspan++
                      } else {
                          break
                      }
                  }
                  td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`
              }
          }

          return td
      }

      let content = ""
      for (let i = 0; i < table.length; i++) {
          content = content + `<tr>`
          content = content + addRowSpan("line", i, false,"center")
          content = content + addRowSpan("approval", i, false,"left")
          content = content + addRowSpan("status", i, false, "left")
          content = content + `</tr>`
      }

      return content
  }
  
  return '<tr><td>No Data</td></tr>'
}


function _generateDetailsApproveEmail(table) {
  if (table.length > 0) {
      const addRowSpan = (column, i, rspan = true, cn = "") => {
          var row = table[i],
              prevRow = table[i - 1],
              td = `<td class="${cn}">${row[column]}</td>`

          if (rspan) {
              if (prevRow && row[column] === prevRow[column]) {
                  td = ``
              } else {
                  var rowspan = 1

                  for (var j = i; j < table.length - 1; j++) {
                      if (table[j][column] === table[j + 1][column]) {
                          rowspan++
                      } else {
                          break
                      }
                  }
                  td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`
              }
          }

          return td
      }

      let content = ""
      for (let i = 0; i < table.length; i++) {
          content = content + `<tr>`
          content = content + addRowSpan("kode_produk", i, false,"center")
          content = content + addRowSpan("nama_barang", i, false,"left")
          content = content + addRowSpan("satuan", i, false, "left")
          content = content + addRowSpan("total_retur", i, false, "right")
          content = content + addRowSpan("keterangan", i, false, "right")
          content = content + `</tr>`
      }

      return content
  }
  
  return '<tr><td>No Data</td></tr>'
}


function buatxml(so,layer){
    let xml = fs.readFileSync('soap/ZFM_WS_UPDATEAPP.xml', 'utf-8');
    let datas = [so,layer];

    let hasil = racikXML2Object(xml, datas, 'VBELN','STAGE');
    return hasil
}
function buatxml2(so,layer){
  let xml = fs.readFileSync('soap/REQUEST_SOAP.xml', 'utf-8');
  let datas = [so,layer];

  let hasil = racikXML2Object2(xml, datas, 'VBELN','STAGE');
  return hasil
}


async function callSoapApprove(hasil){


      await DB.poolConnect;
      const request = DB.pool.request();
  
      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;
  
      let url = ``;
      if(statusIntegasi=='DEV'){

        url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_ws_updateapp/120/zws_ws_updateapp/zbn_ws_updateapp`;
        usernamesoap = sails.config.globals.usernamesoapdev;
        passwordsoap = sails.config.globals.passwordsoapdev;

       }else{

        url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_ws_updateapp/300/zws_ws_updateapp/zbn_ws_updateapp`;
        usernamesoap = sails.config.globals.usernamesoap;
        passwordsoap = sails.config.globals.passwordsoap; 

      }
  

      const tok = `${usernamesoap}:${passwordsoap}`;
      const hash = Base64.encode(tok);
      const Basic = 'Basic ' + hash;

      
      let headers = {
        'Authorization':Basic,
        'user-agent': 'esalesSystem',
        'Content-Type': 'text/xml;charset=UTF-8',
        'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_WS_UPDATEAPP:ZFM_WS_UPDATEAPPRequest',
      };
      let { response } = await soapRequest({ url: url, headers: headers,xml:hasil, timeout: 1000000 });

      return response;
}

async function lemparFTP(hasil,fkr_id){
  // console.log(ftpconfig);

    await DB.poolConnect;
    const request = DB.pool.request();
    
    let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
    let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
    let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';


    let remotePath = ``;
    if(statusIntegasi=='DEV'){
      remotePath = '/home/sapftp/esales/fkr/status/requestdev/'+`${fkr_id}.xml`;// development
    }else{
      remotePath = '/home/sapftp/esales/fkr/status/request/'+`${fkr_id}.xml`; // production                       
    }
    //let remotePath = '/home/sapftp/esales/fkr/status/request/'+`${fkr_id}.xml`;
    let locationFiles = dokumentPath('fkrstatus','request').replace(/\\/g, '/');
    let dst = dokumentPath('fkrstatus','request') + '/' +`${fkr_id}.xml`;
    let localPath = dst.replace(/\\/g, '/');
    shell.mkdir('-p', locationFiles);
    console.log(locationFiles+"/"+`${fkr_id}.xml`);
    fs.writeFile(locationFiles+"/"+`${fkr_id}.xml`, hasil,async function (err) {
      if (err) 
      return err;

      await sftp.connect(ftpconfig)
      .then(() => {
        return sftp.fastPut(localPath,remotePath);
      })
      .then(() => {
        sftp.end();
      })
      .catch(err => {
        console.error(err.message);
      });

    })
}