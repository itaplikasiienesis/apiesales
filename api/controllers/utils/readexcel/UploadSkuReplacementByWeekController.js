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
       for (let i = 1; i < (excel.length); i++) {

             let tahun = excel[i][0];
             let bulan = excel[i][1];
             let week_number = excel[i][2];
             let kode_shipto = excel[i][3];
             let sku_from = excel[i][4];
             let sku_to = Number(excel[i][5]);
             let baris = i+1;


             let sqlGetShipto = `SELECT * FROM m_distributor_v WHERE kode='${kode_shipto}'`;
             let datashipto = await request.query(sqlGetShipto);

             let sqlGetSkuFrom = `SELECT * FROM m_produk WHERE kode_sap='${sku_from}'`;
             let dataskufrom = await request.query(sqlGetSkuFrom);

             let sqlGetSkuTo = `SELECT * FROM m_produk WHERE kode_sap='${sku_to}'`;
             let dataskuto = await request.query(sqlGetSkuTo);


             let m_distributor_id = datashipto.recordset.length > 0 ? datashipto.recordset[0].m_distributor_id : null;
             let sqlGetCmo = `SELECT * FROM cmo WHERE isactive='Y' AND
             tahun=${Number(tahun)} AND bulan=${Number(bulan)} 
             AND m_distributor_id = '${m_distributor_id}'AND status not in ('Direject RSM','Direject ASM','Direject DPD','Direject ASDH','Direject DISTRIBUTOR','Direject SALES HEAD')`;
             // console.log(sqlGetCmo,"cek deh disini");
             let datacmo = await request.query(sqlGetCmo);

             let sqlGetPricelistGrossNetFrom = `SELECT TOP 1 * FROM m_pricelist_grossnet 
             WHERE kode_shipto='${kode_shipto}' AND kode_sap='${sku_from}' ORDER BY created DESC`;
             let datapricelistfrom = await request.query(sqlGetPricelistGrossNetFrom);

             let sqlGetPricelistGrossNetTo = `SELECT TOP 1 * FROM m_pricelist_grossnet 
             WHERE kode_shipto='${kode_shipto}' AND kode_sap='${sku_to}' ORDER BY created DESC`;
             let datapricelistTo = await request.query(sqlGetPricelistGrossNetTo);


             if(datashipto.recordset.length==0 || m_distributor_id==null){
                 errorValidation.push(`Kode Shipto ${kode_shipto} tidak valid cek baris ${baris} pada template upload`);
             }
   
             if(dataskufrom.recordset.length==0){
                 errorValidation.push(`Kode SKU From ${sku_from} tidak valid cek baris ${baris} pada template upload`);
             }

             if(dataskuto.recordset.length==0){
                 errorValidation.push(`Kode SKU To ${sku_to} tidak valid cek baris ${baris} pada template upload`);
             }

             if(datapricelistfrom.recordset.length==0){
               errorValidation.push(`Pricelist SKU From ${sku_from} tidak ditemukan cek baris ${baris} pada template upload`);
             }

             if(datapricelistTo.recordset.length==0){
               errorValidation.push(`Pricelist SKU To ${sku_to} tidak ditemukan cek baris ${baris} pada template upload`);
             }

             if(datacmo.recordset.length > 0){
               let flow = datacmo.recordset[0].flow;
               let nomor_cmo = datacmo.recordset[0].nomor_cmo;
               console.log('nomor_cmo ',nomor_cmo);
               if(flow < 3){
                 errorValidation.push(`CMO ${nomor_cmo} Masih belum berstatus Approved SALES HEAD maka belum bisa melakukan SKU Replacement cek baris ${baris} pada template upload`);
               }
             }

             if(bulan != bulannow || (tahun != tahunnow)){
               errorValidation.push(`Bulan Tahun tidak berada pada periode yang sama cek baris ${baris} pada template upload pastikan satu template dalam periode yang sama yaitu bulan ${bulannow} dan tahun ${tahunnow}`);
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
           
               subject:`Info Validasi SKU Replacement Per Shipto`,
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
             let week_number = excel[i][2];
             let kode_shipto = excel[i][3];
             let sku_from = excel[i][4];
             let sku_to = Number(excel[i][5]);

             let nomor = i;

             let sqlGetShipto = `SELECT * FROM m_distributor_v WHERE kode='${kode_shipto}'`;
             let datashipto = await request.query(sqlGetShipto);

             let sqlGetSkuFrom = `SELECT * FROM m_produk WHERE kode_sap='${sku_from}'`;
             let dataskufrom = await request.query(sqlGetSkuFrom);

             let sqlGetSkuTo = `SELECT * FROM m_produk WHERE kode_sap='${sku_to}'`;
             let dataskuto = await request.query(sqlGetSkuTo);

             let m_distributor_id = datashipto.recordset[0].m_distributor_id;
             let sqlGetCmo = `SELECT * FROM cmo WHERE isactive='Y' AND
             tahun=${Number(tahun)} AND bulan=${Number(bulan)} 
             AND m_distributor_id = '${m_distributor_id}'`;

            //  console.log(sqlGetCmo);
             let datacmo = await request.query(sqlGetCmo);


             let sqlGetPricelistGrossNetFrom = `SELECT TOP 1 * FROM m_pricelist_grossnet 
             WHERE kode_shipto='${kode_shipto}' AND kode_sap='${sku_from}' ORDER BY created DESC`;
             let datapricelistfrom = await request.query(sqlGetPricelistGrossNetFrom);


             let sqlGetPricelistGrossNetTo = `SELECT TOP 1 * FROM m_pricelist_grossnet 
             WHERE kode_shipto='${kode_shipto}' AND kode_sap='${sku_to}' ORDER BY created DESC`;
             let datapricelistTo = await request.query(sqlGetPricelistGrossNetTo);
             
             if(datacmo.recordset.length > 0){

                   let m_produk_id_from = dataskufrom.recordset[0].m_produk_id;
                   let m_produk_id_to = dataskuto.recordset[0].m_produk_id;
                   
                   let cmo_id = datacmo.recordset[0].cmo_id;
                   let sqlGetOrder = `SELECT cod.c_orderdetail_id,mp.m_produk_id,cod.qty,co.week_number,
                   cod.harga ,cod.harga_nett,cod.total_order,cod.total_order_nett 
                   FROM c_order co, 
                   c_orderdetail cod,m_produk mp
                   WHERE co.cmo_id='${cmo_id}'
                   AND cod.c_order_id = co.c_order_id
                   AND co.week_number = ${week_number}
                   AND mp.m_produk_id = cod.m_produk_id
                   AND mp.m_produk_id = '${m_produk_id_from}' ORDER BY co.week_number`;

                   let dataorder = await request.query(sqlGetOrder);

                   let ListFailedUpdate = [];
                   if(dataorder.recordset.length > 0){

                       let grossFrom = datapricelistfrom.recordset.length > 0 ? datapricelistfrom.recordset[0].gross : 0;
                       let nettFrom = datapricelistfrom.recordset.length > 0 ? datapricelistfrom.recordset[0].nett : 0;

                       let grossTo = datapricelistTo.recordset.length > 0 ? datapricelistTo.recordset[0].gross : 0;
                       let nettTo = datapricelistTo.recordset.length > 0 ? datapricelistTo.recordset[0].nett : 0;

                       for (let i = 0; i < dataorder.recordset.length; i++) {

                         let qty = dataorder.recordset[i].qty;

                         let total_order_grossTo = qty * grossTo;
                         let total_order_nettTo = qty * nettTo;


                         let total_order_grossFrom = qty * grossFrom;
                         let total_order_nettFrom = qty * nettFrom;
           
                         successValidation.push({
                             nomor:nomor,
                             sku_from:sku_from,
                             grossFrom:grossFrom,
                             nettFrom:nettFrom,
                             total_order_grossFrom:total_order_grossFrom,
                             total_order_nettFrom:total_order_nettFrom,
                             sku_to:sku_to,
                             grossTo:grossTo,
                             nettTo:nettTo,
                             total_order_grossTo:total_order_grossTo,
                             total_order_nettTo:total_order_nettTo
                         });
           


                         let c_orderdetail_id = dataorder.recordset[i].c_orderdetail_id;                      
                         let sqlUpdate = `UPDATE c_orderdetail 
                         SET m_produk_id = '${m_produk_id_to}',
                         harga =${grossTo},harga_nett =${nettTo},
                         total_order =${total_order_grossTo},
                         total_order_nett =${total_order_nettTo}
                         WHERE c_orderdetail_id='${c_orderdetail_id}'`;
                         await request.query(sqlUpdate);

                         console.log(sqlUpdate);
                         ListSuccesUpdate.push(sqlUpdate);
                         
                       }

                       let updatecmodetail = `UPDATE cmo_detail SET m_produk_id='${m_produk_id_to}' 
                       WHERE cmo_id='${cmo_id}' AND m_produk_id='${m_produk_id_from}'`;
                       await request.query(updatecmodetail);
                                           

                   }else{
                     ListFailedUpdate.push('Order Tidak Ditemukan');
                   }
               
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
                 +`<td>${detail.sku_from}</td>`
                 +`<td>${numeral(detail.grossFrom).format("0,00")}</td>`
                 +`<td>${numeral(detail.nettFrom).format("0,00")}</td>`
                 +`<td>${numeral(detail.total_order_grossFrom).format("0,00")}</td>`
                 +`<td>${numeral(detail.total_order_nettFrom).format("0,00")}</td>`
                 +`<td>${detail.sku_to}</td>`
                 +`<td>${numeral(detail.grossTo).format("0,00")}</td>`
                 +`<td>${numeral(detail.nettTo).format("0,00")}</td>`
                 +`<td>${numeral(detail.total_order_grossTo).format("0,00")}</td>`
                 +`<td>${numeral(detail.total_order_nettTo).format("0,00")}</td>`
                 +`</tr>`
               }
 

               console.log(detailHtml);
               const param = {
             
                 subject:`SKU Replacement Distributor Pilihan Telah Dilakukan`,
                 tanggal:moment().format('YYYY-MM-DD'),
                 filename:nama_file,
                 details:detailHtml,
                 formatfile:extentionFile
       
               }
 
               let attachments =  [{   
                 filename: nama_file+extentionFile,
                 path: fd // stream this file
               }]
 
   
               const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'succesvalidationskureplacement', templateparam: param });
               SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);

 
             
             }

           }

           let sqlInsertData = `INSERT INTO audit_support
           (kode,nama)
           VALUES('5', 'SKU Replacement Distributor')`;
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
