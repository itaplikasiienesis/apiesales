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
         let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
         let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
         let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';


        for (let i = 1; i < (excel.length); i++) {

            let ship_to = excel[i][0];
            let kode_sap = excel[i][1];
            let gross = excel[i][2];
            let nett = excel[i][3];
            // console.log(ship_to);
            // console.log(kode_sap);
            // console.log(gross);
            // console.log(nett);
            // let kode_channel = excel[i][7]=='Pharma' ? 'Farma' : excel[i][7];
            // let kode_sap = excel[i][10];
            // let nama_produk = excel[i][11].replace('\'','\'\'');
            // let kategori = excel[i][12];
            // let grossprice = Number(excel[i][19]);
            // let netprice = Number(excel[i][22]);

            // cek distributor apakah valid atau ga
            let sqlgetdistributor = `select * from m_distributor_v mdv where kode = '${ship_to}'`;
            let datadistributor = await request.query(sqlgetdistributor);
            let m_distributor_id = datadistributor.recordset.length > 0 ? datadistributor.recordset[0].m_distributor_id : null;
            // console.log(m_distributor_id);

            // cek produk apakah valid atau ga
            let getkodesap = `select * from m_produk mp where kode_sap = '${kode_sap}'`;
            // console.log(getkodesap);
            let datakodesap = await request.query(getkodesap);
            let m_produk_id = datakodesap.recordset.length > 0 ? datakodesap.recordset[0].m_produk_id : null;
            // console.log(m_produk_id);

            if (m_produk_id && m_distributor_id){
              //Proses cek data apakah ada atau kosong
              let sqlgetgrossnet = `SELECT COUNT(1) AS jumlah_data FROM m_pricelist_grossnet WHERE kode_sap = '${kode_sap}' and kode_shipto = '${ship_to}'`;
              let cekdatapricelist = await request.query(sqlgetgrossnet);
              let dataprice = cekdatapricelist.recordset.length > 0 ? cekdatapricelist.recordset[0].jumlah_data : null;
              
              if(dataprice){ // jika ada
                // proses update karena sudah ada
                let updatedata = `update m_pricelist_grossnet set gross = ${gross} , nett = ${nett} 
                where kode_sap = '${kode_sap}' and kode_shipto = '${ship_to}'`;
                console.log(updatedata);
                await request.query(updatedata);
              }else{ // jika kosong
                // proses insert karena belum ada
                let insertdata = `insert into m_pricelist_grossnet (m_produk_id,kode_sap,m_distributor_id,kode_shipto,gross,nett)
                values ('${m_produk_id}','${kode_sap}','${m_distributor_id}','${ship_to}', ${gross} , ${nett} )`;
                console.log(insertdata);
                await request.query(insertdata);
              }
            }

            console.log(i);

        }


        // PROSES INSERT AUDIT PROSES

        let sqlInsertData = `INSERT INTO audit_support
        (kode,nama)
        VALUES('1', 'Update Pricelist Gross Net')`;
        await request.query(sqlInsertData);
         
         res.success({
           message: 'Upload file berhasil'
         });
         return true;
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
 