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

        let errorValidation = [];
        let successValidation = [];
        for (let i = 1; i < (excel.length); i++) {

            let baris = i+1;
            let nomor_klaim = excel[i][0];
            let nomor_eprop_awal = excel[i][1];
            let nomor_eprop_pengganti = excel[i][2];

            console.log('baris ',baris);
            console.log('nomor_klaim ',nomor_klaim);
            console.log('nomor_eprop_awal ',nomor_eprop_awal);
            console.log('nomor_eprop_pengganti ',nomor_eprop_pengganti);
    
    
            let sqlGetDataKlaim = `SELECT kd.klaim_detail_id FROM klaim k,klaim_detail kd  
            WHERE k.nomor_klaim = '${nomor_klaim}'
            AND k.klaim_id = kd.klaim_id
            AND kd.nomor_proposal = '${nomor_eprop_awal}'`;
            let getDataKlaim = await request.query(sqlGetDataKlaim);
            let dataKlaim = getDataKlaim.recordset;
    
    
            if(dataKlaim.length==0){
                console.log('Ketangkap error');
                errorValidation.push(`Data Klaim dengan nomor klaim ${nomor_klaim} dan nomor proposal awal ${nomor_eprop_awal} tidak ditemukan cek baris ke ${baris} pada template upload`);
            
            }else{

                for (let i = 0; i < dataKlaim.length; i++) {
                    
                    let klaim_detail_id = dataKlaim[i].klaim_detail_id;
                    let sqlUpdateDataKlaimDetail = `UPDATE klaim_detail 
                    SET nomor_proposal_awal='${nomor_eprop_awal}',nomor_proposal='${nomor_eprop_pengganti}'
                    WHERE klaim_detail_id = '${klaim_detail_id}'`;
    
                    let obj = {
                        nomor : i,
                        baris : baris,
                        nomor_klaim : nomor_klaim,
                        nomor_eprop_awal : nomor_eprop_awal,
                        nomor_eprop_pengganti : nomor_eprop_pengganti,
                        sql : sqlUpdateDataKlaimDetail
                    }
    
                    successValidation.push(obj);
                    
    
                }
            }
                
        }

         if(errorValidation.length > 0){

           let dataemail = [];
           if(statusIntegasi=='DEV'){
          
             dataemail.push('tiasadeputra@gmail.com');
            
      
           }else{
            
             dataemail.push('tiasadeputra@gmail.com');
             dataemail.push('priska.ananda@enesis.com');
             dataemail.push('farid.hidayat@enesis.com');
             dataemail.push('cynthia.vidyani@enesis.com');
             dataemail.push('jasuman.Sitanggang@enesis.com');
             dataemail.push('ega.nurlaili@enesis.com');
             dataemail.push('tri.sintya@enesis.com');
             dataemail.push('prasityo.primatama@enesis.com');
             dataemail.push('sri.utami@enesis.com');
             dataemail.push('stefanus.albert@enesis.com');
             dataemail.push('indra.luxca@enesis.com');


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
           
               subject:`Replacement Nomor E-PROP Klaim Distributor Telah Dilakukan`,
               tanggal:moment().format('YYYY-MM-DD'),
               filename:nama_file,
               details:detailHtml,
               formatfile:extentionFile
     
             }

             let attachments =  [{   
               filename: nama_file+extentionFile,
               path: fd // stream this file
             }]

 
             const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'errorvalidationreplaceproposalklaim', templateparam: param });
             SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);

           } 

             res.error({
                 message: errorValidation[0].toString()
             });

         }else{

            console.log('AMAN ',successValidation.length);
            if(successValidation.length > 0){

                for (let i = 0; i < successValidation.length; i++) {
                    let sql = successValidation[i].sql;
                    await request.query(sql);
                }

                let dataemail = [];
                if(statusIntegasi=='DEV'){
             
                    dataemail.push('tiasadeputra@gmail.com');             
           
                }else{
                 
                    dataemail.push('tiasadeputra@gmail.com');
                    dataemail.push('priska.ananda@enesis.com');
                    dataemail.push('farid.hidayat@enesis.com');
                    dataemail.push('cynthia.vidyani@enesis.com');
                    dataemail.push('jasuman.Sitanggang@enesis.com');
                    dataemail.push('ega.nurlaili@enesis.com');
                    dataemail.push('tri.sintya@enesis.com');
                    dataemail.push('prasityo.primatama@enesis.com');
                    dataemail.push('sri.utami@enesis.com');
                    dataemail.push('stefanus.albert@enesis.com');
                    dataemail.push('indra.luxca@enesis.com');
           
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
                    +`<td>${detail.nomor_klaim}</td>`
                    +`<td>${detail.nomor_eprop_awal}</td>`
                    +`<td>${detail.nomor_eprop_pengganti}</td>`
                    +`</tr>`
                  }
    
    
                  console.log(detailHtml);
                  const param = {
                
                    subject:`Replacement Nomor E-PROP Klaim Distributor Telah Dilakukan`,
                    tanggal:moment().format('YYYY-MM-DD'),
                    filename:nama_file,
                    details:detailHtml,
                    formatfile:extentionFile
          
                  }
    
                  let attachments =  [{   
                    filename: nama_file+extentionFile,
                    path: fd // stream this file
                  }]
    
      
                  const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'succesvalidationreplaceproposalklaim', templateparam: param });
                  SendEmail(dataemail.toString(), param.subject, template,null,'ESALES', attachments);
    
                }

                let sqlInsertData = `INSERT INTO audit_support(kode,nama)
                VALUES('RNEPK', 'Replacement Nomor E-PROP Klaim Distributor')`;
                await request.query(sqlInsertData);
                
            }
        }

        res.success({
            message: 'Upload file berhasil'
        });
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
