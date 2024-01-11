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
 const SendEmail = require('../../../services/SendEmail');
 const path = require('path');
 const _ = require('lodash');
 const fs = require('fs');
 var FormData = require('form-data');
 var axios = require('axios');
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
         await DB.poolConnect;
         const request = DB.pool.request();
         const fd = uploadedFiles[0].fd;
         var obj = xlsx.parse(fd);
         const excel = obj[0].data;
         const nama_file = uploadedFiles[0].filename;
         let extentionFile = path.extname(fd);
         let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
         let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
         let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
         let bulannow = excel[1][1];
         let tahunnow = excel[1][0];
         let errorValidation = [];
         let successValidation = [];

         let sqlGetCmo = `SELECT nomor_cmo FROM cmo WHERE isactive='Y' AND
         tahun=${Number(tahunnow)} AND bulan=${Number(bulannow)} AND flow < 3 AND status not in ('Direject RSM','Direject ASM','Direject DPD','Direject ASDH','Direject DISTRIBUTOR','Direject SALES HEAD')`;
         let datacmo = await request.query(sqlGetCmo);

         for (let i = 0; i < datacmo.recordset.length; i++) {           
           let nomor_cmo = datacmo.recordset[i].nomor_cmo;
           errorValidation.push(`CMO ${nomor_cmo} Masih belum Approved SALES HEAD pastikan Approved terlebih dahulu`); 
         }

        for (let i = 1; i < (excel.length); i++) {
              let sku = excel[i][2];
              let baris = i+1;

              let sqlGetSku = `SELECT * FROM m_produk WHERE kode_sap='${sku}'`;
              let datasku = await request.query(sqlGetSku);


              if(datasku.recordset.length==0){
                  errorValidation.push(`Kode SKU To ${sku} tidak valid cek baris ${baris} pada template upload`);
              }
             
        }

          if(errorValidation.length > 0){

            let dataemail = [];
            if(statusIntegasi=='DEV'){
           
              dataemail.push('tiasadeputra@gmail.com');
              dataemail.push('ilyas.nurrahman74@gmail.com');
             
       
            }else{
             
              dataemail.push('tiasadeputra@gmail.com');
              dataemail.push('indah.kartika@enesis.com');
              dataemail.push('farid.hidayat@enesis.com');
              dataemail.push('harry.budi@enesis.com');
              dataemail.push('ilyas.nurrahman74@gmail.com');
       
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
            
                subject:`Info Validasi SKU Replacement Non Aktif SKU`,
                tanggal:moment().format('YYYY-MM-DD'),
                filename:nama_file,
                details:detailHtml,
                formatfile:extentionFile
      
              }

              let attachments =  [{   
                filename: nama_file+extentionFile,
                path: fd // stream this file
              }]

  
              const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'errorvalidationskureplacement', templateparam: param });
              SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);

            } 

              res.error({
                  message: errorValidation[0].toString()
              });

          }else{


            for (let i = 1; i < (excel.length); i++) {
                
                let tahun = excel[i][0];
                let bulan = excel[i][1];
                let sku = excel[i][2];
                

                let sqlGetSku = `SELECT * FROM m_produk WHERE kode_sap='${sku}'`;
                let datasku = await request.query(sqlGetSku);

                let m_produk_id= datasku.recordset[0].m_produk_id;

                let sqlgetorderdetail = `SELECT cod.c_orderdetail_id,mp.m_produk_id,cod.qty,co.week_number,c.cmo_id,c.m_distributor_id,c.nomor_cmo,
                cod.harga ,cod.harga_nett,cod.total_order,cod.total_order_nett,mdv.nama AS distributor
                FROM c_order co,
                c_orderdetail cod,m_produk mp,cmo c,m_distributor_v mdv
                WHERE co.cmo_id=c.cmo_id
                AND c.tahun=${Number(tahun)} AND c.bulan=${Number(bulan)}
                AND cod.c_order_id = co.c_order_id
                AND mp.m_produk_id = cod.m_produk_id
                AND c.m_distributor_id = mdv.m_distributor_id
                AND mp.m_produk_id = '${m_produk_id}' ORDER BY co.week_number`;

                          
                let datacmo = await request.query(sqlgetorderdetail);
                
                if(datacmo.recordset.length > 0){

                    for (let i = 0; i < datacmo.recordset.length; i++) {
  
                        let cmo_id = datacmo.recordset[i].cmo_id;
                        let qty = datacmo.recordset[i].qty;
                        let hargagross = datacmo.recordset[i].harga;
                        let harganett = datacmo.recordset[i].harga_nett;
                        let total_order_gross = datacmo.recordset[i].total_order;
                        let total_order_nett = datacmo.recordset[i].total_order_nett;
                        let nomor_cmo = datacmo.recordset[i].nomor_cmo;
                        let distributor = datacmo.recordset[i].distributor;
                        let week_number = datacmo.recordset[i].week_number;
                        
                        let nomor = i+1;


                        successValidation.push({
                            nomor:nomor,
                            sku:sku,
                            quantity:qty,
                            hargagross:hargagross,
                            harganett:harganett,
                            total_order_gross:total_order_gross,
                            total_order_nett:total_order_nett,
                            nomor_cmo:nomor_cmo,
                            distributor:distributor,
                            week_number:week_number
                        });
      

                        let c_orderdetail_id = datacmo.recordset[i].c_orderdetail_id;                      
                        let sqlUpdate = `UPDATE c_orderdetail 
                        SET isactive = 'N' WHERE c_orderdetail_id='${c_orderdetail_id}'`;

                        let updatecmodetail = `UPDATE cmo_detail SET isactive='N' 
                        WHERE cmo_id='${cmo_id}' AND m_produk_id='${m_produk_id}'`;

                        await request.query(sqlUpdate);
                        await request.query(updatecmodetail);

                     
                    }

            
                }else{
                    console.log('Produk tidak ada di CMO');
                }


            }
            
            
                if(successValidation.length > 0){

                let dataemail = [];
                if(statusIntegasi=='DEV'){
           
                  dataemail.push('tiasadeputra@gmail.com');
                 
           
                }else{
                 
                  dataemail.push('tiasadeputra@gmail.com');
                  dataemail.push('indah.kartika@enesis.com');
                  dataemail.push('farid.hidayat@enesis.com');
                  dataemail.push('harry.budi@enesis.com');
                  dataemail.push('ilyas.nurrahman74@gmail.com');
           
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
                    +`<td>${detail.sku}</td>`
                    +`<td>${detail.quantity}</td>`
                    +`<td>${numeral(detail.hargagross).format("0,00")}</td>`
                    +`<td>${numeral(detail.harganett).format("0,00")}</td>`
                    +`<td>${numeral(detail.total_order_gross).format("0,00")}</td>`
                    +`<td>${numeral(detail.total_order_nett).format("0,00")}</td>`
                    +`<td>${detail.nomor_cmo}</td>`
                    +`<td>${detail.distributor}</td>`
                    +`<td>${detail.week_number}</td>`
                    +`</tr>`
                    }
    
                    
                    const param = {
                
                    subject:`SKU Replacement Non Aktif Telah Dilakukan`,
                    tanggal:moment().format('YYYY-MM-DD'),
                    filename:nama_file,
                    details:detailHtml,
                    formatfile:extentionFile
            
                    }
    
                    let attachments =  [{   
                    filename: nama_file+extentionFile,
                    path: fd // stream this file
                    }]
    
        
                    const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'succesvalidationskureplacementnonactive', templateparam: param });
                    SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);

    
                
                }

            }

            let sqlInsertData = `INSERT INTO audit_support
            (kode,nama)
            VALUES('6', 'SKU Replacement Non Aktif')`;
            await request.query(sqlInsertData);
            

            res.success({
              message: 'Upload file berhasil'
            });
            return true;

          }
        
       });
   }

   //** BATAS */
 
 };

 
 
 const undefinedCek = (value) => {
   // console.log(value,"ee");
   if (typeof value === 'undefined' || value === "" || value === null || value === NaN) {
     return 0;
   }else{
     
   }
 
   return Math.round(value);
 }
 