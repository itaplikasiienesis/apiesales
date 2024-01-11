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
         const nama_file = uploadedFiles[0].filename;
         const fd = uploadedFiles[0].fd;
         var obj = xlsx.parse(fd);
         const excel = obj[0].data;
         let extentionFile = path.extname(fd);
         let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
         let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
         let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
         
         let nomor_cmo = excel[1][0];
         let nomor_sap = excel[1][1];
         let sku_from = excel[1][2];
         let kode_shipto = excel[1][3];
         let week_from = excel[1][4];
         let tgl_from = excel[1][5];
         let week_to = excel[1][6];
         let tgl_to = excel[1][7];

         let sqlGetSkuFrom = `SELECT * FROM m_produk WHERE kode_sap='${sku_from}'`;
         let dataskufrom = await request.query(sqlGetSkuFrom);

         console.log(nomor_cmo);
         console.log(tgl_to);

         let errorValidation = [];
         let successValidation = [];

         let sqlGetCmo = `SELECT nomor_cmo FROM cmo WHERE isactive='Y' AND
         nomor_cmo='${nomor_cmo}' AND no_sap='${nomor_sap}'`;
         let datacmo = await request.query(sqlGetCmo);

         if (datacmo.recordset.length == 0) {           
           errorValidation.push(`CMO ${nomor_cmo} dan No. SAP ${nomor_sap} Tidak ditemukan`);
         }

         if(dataskufrom.recordset.length==0){
            errorValidation.push(`Kode SKU ${sku_from} tidak valid cek baris ${baris} pada template upload`);
         }
 
          if(errorValidation.length > 0){

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
            
                subject:`Info Reschedule Week SO`,
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
                
                let nomor_cmo = excel[1][0];
                let nomor_sap = excel[1][1];
                let sku_from = excel[1][2];
                let kode_shipto = excel[1][3];
                let week_from = excel[1][4];
                let tgl_from = excel[1][5];
                let week_to = excel[1][6];
                let tgl_to = excel[1][7];
                

                let sqlGetSkuFrom = `SELECT * FROM m_produk WHERE kode_sap='${sku_from}'`;
                let dataskufrom = await request.query(sqlGetSkuFrom);

                let m_produk_id_from = dataskufrom.recordset[0].m_produk_id;


                let sqlgetorderdetail = `SELECT cod.c_orderdetail_id,mp.m_produk_id,cod.qty,co.week_number,c.cmo_id,c.m_distributor_id,
                cod.harga ,cod.harga_nett,cod.total_order,cod.total_order_nett
                FROM c_order co,
                c_orderdetail cod,m_produk mp,cmo c
                WHERE co.cmo_id=c.cmo_id
                AND c.nomor_cmo='${nomor_cmo}' AND c.no_sap='${nomor_sap}'
                AND cod.c_order_id = co.c_order_id
                AND mp.m_produk_id = cod.m_produk_id
                AND mp.m_produk_id = '${m_produk_id_from}'
                AND co.week_number=${week_from}
                AND co.schedule_date='${tgl_from}'`;

                //console.log(sqlgetorderdetail);
                
                let datacmo = await request.query(sqlgetorderdetail);
                if(datacmo.recordset.length > 0){

                    for (let i = 0; i < datacmo.recordset.length; i++) {
  
                        let cmo_id = datacmo.recordset[i].cmo_id;
                        let qty = datacmo.recordset[i].qty;
                        console.log('cmo_id ',cmo_id);
                        console.log('qty ',qty);
                    //     let hargagross = datacmo.recordset[i].harga;
                    //     let harganett = datacmo.recordset[i].harga_nett;
                    //     let total_order_gross = datacmo.recordset[i].total_order;
                    //     let total_order_nett = datacmo.recordset[i].total_order_nett;
                    //     let nomor_cmo = datacmo.recordset[i].nomor_cmo;
                    //     let distributor = datacmo.recordset[i].distributor;
                    //     let week_number = datacmo.recordset[i].week_number;
                        
                    //     let nomor = i+1;


                    //     successValidation.push({
                    //         nomor:nomor,
                    //         sku:sku,
                    //         quantity:qty,
                    //         hargagross:hargagross,
                    //         harganett:harganett,
                    //         total_order_gross:total_order_gross,
                    //         total_order_nett:total_order_nett,
                    //         nomor_cmo:nomor_cmo,
                    //         distributor:distributor,
                    //         week_number:week_number
                    //     });
      

                    //     let c_orderdetail_id = datacmo.recordset[i].c_orderdetail_id;                      
                    //     let sqlUpdate = `UPDATE c_orderdetail 
                    //     SET isactive = 'N' WHERE c_orderdetail_id='${c_orderdetail_id}'`;

                    //     let updatecmodetail = `UPDATE cmo_detail SET isactive='N' 
                    //     WHERE cmo_id='${cmo_id}' AND m_produk_id='${m_produk_id}'`;

                    //     await request.query(sqlUpdate);
                    //     await request.query(updatecmodetail);

                     
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
 