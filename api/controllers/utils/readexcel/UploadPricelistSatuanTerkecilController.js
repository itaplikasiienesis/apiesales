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
 const numeral = require('numeral'); 
 
 module.exports = {
   upload: async function (req, res) {
     res.setTimeout(0);
     //console.log(req.body);
     const {m_user_id,version} = req.body;
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


        let errorValidation = [];
        let successValidation = [];
        for (let i = 1; i < (excel.length); i++) {

              let kode_produk = excel[i][0];
              let kode_kemasan = excel[i][1]=='CAN' ? 'KAN' : excel[i][1]=='BT' ? 'BOT' : excel[i][1] == 'JRG' ? 'JER' : excel[i][1]=='PC' ? 'ST' : excel[i][1];
              let harga = excel[i][2];
              let kode_channel = excel[i][3];
              let baris = i+1;
             
              let sqlGetSku = `SELECT * FROM m_produk WHERE kode_sap='${kode_produk}' OR kode='${kode_produk}'`;
              let datasku = await request.query(sqlGetSku);

              let sqlgetchannel = `SELECT * FROM r_distribution_channel rdc WHERE kode=${kode_channel}`;
              let datachannel = await request.query(sqlgetchannel);

              let sqlgetkodekemasan = `SELECT * FROM r_satuan_terkecil WHERE kode='${kode_kemasan}'`;
              let datakemasan = await request.query(sqlgetkodekemasan);


              // if(datasku.recordset.length==0){
              //     errorValidation.push(`Kode Produk ${kode_produk} tidak valid cek baris ${baris} pada template upload`);
              // }
            
              if(datakemasan.recordset.length==0){
                  errorValidation.push(`Kode Kemasan ${kode_kemasan} tidak valid cek baris ${baris} pada template upload`);
              }

              if(datachannel.recordset.length==0){
                  errorValidation.push(`Kode Channel ${kode_channel} tidak valid cek baris ${baris} pada template upload`);
              }
          }

          if(errorValidation.length > 0){

            let dataemail = [];
            if(statusIntegasi=='DEV'){
           
              dataemail.push('tiasadeputra@gmail.com');
   
       
            }else{
             
              dataemail.push('tiasadeputra@gmail.com');
              dataemail.push('sri.utami@enesis.com');
              dataemail.push('ariska.pratiwi@enesis.com');
              dataemail.push('farid.hidayat@enesis.com');
              
       
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
            
                subject:`Info Validasi Upload Harga Satuan Terkecil`,
                tanggal:moment().format('YYYY-MM-DD'),
                filename:nama_file,
                details:detailHtml,
                formatfile:extentionFile
      
              }

              let attachments =  [{   
                filename: nama_file+extentionFile,
                path: fd // stream this file
              }]

  
              const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'errorvalidation', templateparam: param });
              SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);

            } 

              res.error({
                  message: errorValidation[0].toString()
              });

          }else{


            for (let i = 1; i < (excel.length); i++) {

                let kode_produk = excel[i][0];
                let kode_kemasan = excel[i][1]=='CAN' ? 'KAN' : excel[i][1]=='BT' ? 'BOT' : excel[i][1] == 'JRG' ? 'JER' : excel[i][1]=='PC' ? 'ST' : excel[i][1];
                let harga = Number(excel[i][2]);
                let kode_channel = excel[i][3];
                let nomor = i;
                 
                let sqlgetchannel = `SELECT * FROM r_distribution_channel rdc WHERE kode=${kode_channel}`;
                let datachannel = await request.query(sqlgetchannel);
                let channel = datachannel.recordset[0];
                let r_distribution_channel_id = channel.r_distribution_channel_id;
                let nama_channel = channel.nama;

        
                let sqlGetSku = `SELECT * FROM m_produk WHERE kode_sap='${kode_produk}' OR kode='${kode_produk}'`;
                let datasku = await request.query(sqlGetSku);
                let m_produk_id = datasku.recordset.length > 0 ? datasku.recordset[0].m_produk_id : null;

                if(m_produk_id){
                  let sqlInsertData = `INSERT INTO r_harga_satuan_terkecil
                  (m_produk_id, kode_kemasan, harga,kode_channel,r_distribution_channel_id,version)
                  VALUES('${m_produk_id}', '${kode_kemasan}', ${harga},'${kode_channel}','${r_distribution_channel_id}','${version}')`;
                  await request.query(sqlInsertData);
                }
  
                successValidation.push({
                    nomor:nomor,
                    kode_produk:kode_produk,
                    kode_kemasan:kode_kemasan,
                    channel:nama_channel,
                    harga:harga
                });           

    
            
            }           
            
            if(successValidation.length > 0){

              let dataemail = [];
              if(statusIntegasi=='DEV'){
           
                dataemail.push('tiasadeputra@gmail.com');

                
              
              }else{
               
                dataemail.push('tiasadeputra@gmail.com');
                dataemail.push('sri.utami@enesis.com');
                dataemail.push('ariska.pratiwi@enesis.com');
                dataemail.push('farid.hidayat@enesis.com');
                
    
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
                  +`<td>${detail.kode_produk}</td>`
                  +`<td>${detail.kode_kemasan}</td>`
                  +`<td>${detail.channel}</td>`
                  +`<td>${numeral(detail.harga).format("0,00")}</td>`
                  +`</tr>`
                }
  

                const param = {
              
                  subject:`Upload Produk Satuan Terkecil Telah Dilakukan`,
                  tanggal:moment().format('YYYY-MM-DD'),
                  filename:nama_file,
                  details:detailHtml,
                  formatfile:extentionFile
        
                }
  
                let attachments =  [{   
                  filename: nama_file+extentionFile,
                  path: fd // stream this file
                }]
  
    
                const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'succesvalidationuploadhargaterkecil', templateparam: param });
                SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);

  
              
              }

            }

            let sqlInsertData = `INSERT INTO audit_support
            (kode,nama)
            VALUES('2', 'Upload Produk Satuan Terkecil')`;
            await request.query(sqlInsertData);

            res.success({
              message: 'Upload file berhasil'
            });
            return true;


          }
        
        
       });
   }
 };
 
 const undefinedCek = (value) => {
   // console.log(value,"ee");
   if (typeof value === 'undefined' || value === "" || value === null || value === NaN) {
     return 0;
   }else{
     
   }
 
   return Math.round(value);
 }
 