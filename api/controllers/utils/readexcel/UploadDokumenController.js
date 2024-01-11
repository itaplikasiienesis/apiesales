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
 const fs = require('fs');
 var FormData = require('form-data');
 var axios = require('axios');
 
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

           for (let i = 1; i < (excel.length); i++) {
             console.log("test data",excel[i]);
             console.log("length",excel.length);
             if(excel[i].length > 0 && excel[i][0]!= undefined && excel[i][0]!="" && excel[i][0]!=null){
               let nomorDokumenKlaim = excel[i][0];
               console.log("nomorDokumenKlaim",nomorDokumenKlaim);
               let tglPengajuan = excel[i][1];
               let cekKlaim = `select * from klaim k where (nomor_klaim = '${nomorDokumenKlaim}' and kode_status = 'APN') or (nomor_klaim = '${nomorDokumenKlaim}' and kode_status = 'DIRC3') `;
               let dataKlaim = await request.query(cekKlaim);
               console.log("query klaim",cekKlaim);
               console.log("hasil query klaim",dataKlaim.recordset);
               if(dataKlaim.recordset.length > 0){

                 for (let i = 0; i < dataKlaim.recordset.length; i++) {

                     let nomorKlaim = dataKlaim.recordset[i].nomor_klaim;
                     let klaimId = dataKlaim.recordset[i].klaim_id;
                     let nomor = i+1;

                     let updateKlaim = `UPDATE klaim set status = 'Dok. Asli Diserahkan ke Acct MI', kode_status = 'DAD' where nomor_klaim = '${nomorKlaim}' `;
                     console.log("query update",updateKlaim);

                     await request.query(updateKlaim);

                     let insertKlaim = `INSERT INTO audit_klaim
                     (klaim_id, m_user_id, rolename, status)
                     VALUES('${klaimId}', '${m_user_id}','ACCOUNTING', 'Dok. Asli Diserahkan Ke Acct MI')`;
                     await request.query(insertKlaim);

                 
                 }
         
               }else{
                 console.log('KLAIM TIDAK ADA !! ');
                 // res.success({
                 //   message: 'Upload file berhasil sebagian !! '
                 // });
                 
               }
             }
         }

         res.success({
           message: 'Upload file berhasil !! '
         });
         return true;
       
      });
  },
   
   uploadBukti: async function (req, res) {
    res.setTimeout(0);
    console.log('===========BUKTIIIIIIIIIIIIIIIIIIIII===============');
    const {m_user_id} = req.body;

        // ** BACA FILE BUKTI MASUK KE LOGIC BACA EXCEL  */
        // ** START INI BUAT EXCEL */
        req.file('bukti')
        .upload({
          maxBytes: 150000000
        }, async function whenDone(err, uploadedBukti) {
            if (err) {
              console.log('err excel', err)
              return res.error(err);
            }
            if (uploadedBukti.length === 0) {          
              return res.error([], 'Tidak ada file yang diupload!');
            }

            console.log(" ================== LENGTH FILE ================ ",uploadedBukti.length === 0);

            //** start hit api mas fachmi */
            var formData = new FormData();
            formData.append('filepath',`apiesales/repo/SerahTerimaKlaim` ) // key : filepath , value ; folderilyas (lokasi file)
            // formData.append('file', fs.createReadStream(uploadedBukti[0].fd))
            formData.append('file', 
              fs.createReadStream(uploadedBukti[0].fd),
              {
                uri: uploadedBukti[0].fd, 
                type: uploadedBukti[0].type,
                name: uploadedBukti[0].filename,
              }
            ) 

            console.log("========================= CETAKAN 1 ========================= ");
            const headers = {
              ...formData.getHeaders(),
              // "Content-Length": formData.getLengthSync()
            };

            console.log("========================= CETAKAN 2 ========================= ");

            axios.post('https://esales.enesis.com/budgettax/api/fileservice/fileapi/', formData, {headers})        
            .then(async response => {
              console.log("============== UPLOAD BERHASILL =========== !! ",response.data);
            //   //** sebelum finish hit api mas fachmi ambil return data path url penyimpanan */

            console.log('===========MULAI BACA EXCEL===============');
            // **START BACA EXCEL */
             await DB.poolConnect;
             const request = DB.pool.request();
             const fd = uploadedBukti[1].fd;
             var obj = xlsx.parse(fd);
             const excel = obj[0].data;

             console.log(`NOMOR KLAIM LOOPINGAN LENGTH [${excel.length}]`);
             for (let i = 1; i < (excel.length); i++) {
              console.log(`NOMOR KLAIM LOOPINGAN (${i})`);
              if(excel[i].length > 0 && excel[i][0]!= undefined && excel[i][0]!="" && excel[i][0]!=null){
                  let nomorDokumenKlaim = excel[i][0];
                
                  let cekKlaim = `select * from klaim k where nomor_klaim = '${nomorDokumenKlaim}' and kode_status = 'DAD' `;
                  let dataKlaim = await request.query(cekKlaim);
                  
                  if(dataKlaim.recordset.length > 0){

                      console.log(`==========dataKlaim.recordset LENGTH [${dataKlaim.recordset.length}]`);
                      for (let j = 0; j < dataKlaim.recordset.length; j++) {
                          console.log(`==========dataKlaim.recordset (${j})`)

                          let nomorKlaim = dataKlaim.recordset[j].nomor_klaim;
                          let klaimId = dataKlaim.recordset[j].klaim_id;

                          let updateKlaim = `UPDATE klaim set url_tanda_terima = '${response.data}' where nomor_klaim = '${nomorKlaim}'  `;

                          await request.query(updateKlaim);
                      
                      }

              
                  }else{

                    // if (nomorDokumenKlaim !== undefined || nomorDokumenKlaim !== null || nomorDokumenKlaim !== "") {
                      console.log('KLAIM TIDAK ADA !! ');
                    //   res.success({
                    //     message: 'PROSES BERHENTI PADA KLAIM '+nomorDokumenKlaim+' KARNA TIDAK VALID !! '
                    //     // message: 'PROSES BERHENTI PADA KLAIM '
                    //   });
                    //   return true;
                    // }
                  
                      
                  }

              }
            }

            //**FINISH BACA EXCEL */  
              

              res.success({
                message: 'Upload file berhasil'
              });
              return true;
            /////
            }).catch(err => console.log('UPLOADBUKTI>>', err))
        
        });


  },

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
 