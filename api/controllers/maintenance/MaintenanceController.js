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
// const SendEmail = require('../../../services/SendEmail');
const path = require('path');
const glob = require('glob');
const templatePath = () => path.resolve(sails.config.appPath, 'assets', 'templateacp');

module.exports = {
    upload_bucket_biding: async function (req, res) {
    res.setTimeout(0);
    console.log("BISMILLAH");
    const {nik} = req.body;
    console.log(req.body);

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
        let errorValidation = [];

        // == LOPPIN PERTAMA UNTUK VALIDASI == //
        for (let i = 1; i < (excel.length); i++) {

            console.log('VALIDATION ',i);
                 
            let kode_transporter = excel[i][1]; console.log("KOLOM A ",kode_transporter); // Kolom A
            let nama_transporter = excel[i][2]; console.log("KOLOM B ",nama_transporter); // Kolom B
            let email = excel[i][3]; console.log("KOLOM C ",email); // Kolom C
            let ring = excel[i][4]; console.log("KOLOM D ",ring); // Kolom D
            let jenis_kendaraan = excel[i][5]; console.log("KOLOM E ",jenis_kendaraan); // Kolom E
            let rute = excel[i][6]; console.log("KOLOM F ",rute); // Kolom F
            let harga = excel[i][8]; console.log("KOLOM G ",harga); // Kolom G
            let valid_from = excel[i][9]; console.log("KOLOM H ",valid_from); // Kolom H
            let valid_until = excel[i][10]; console.log("KOLOM I ",valid_until); // Kolom I
            let quota = excel[i][11] === "-" ? 0 : excel[i][11]; console.log("KOLOM J ",quota); // Kolom J


            if(!kode_transporter){
              errorValidation.push(`KOLOM A PADA BARIS KE '${i}' SALAH FORMAT PERIKSA DATA DITEMPLATE TERLEBIH DAHULU`)
            } 
            if(!nama_transporter){
              errorValidation.push(`KOLOM B PADA BARIS KE '${i}' SALAH FORMAT PERIKSA DATA DITEMPLATE TERLEBIH DAHULU`)
            } 
            if(!email){
              errorValidation.push(`KOLOM C PADA BARIS KE '${i}' SALAH FORMAT PERIKSA DATA DITEMPLATE TERLEBIH DAHULU`)
            } 
            if(!ring){
              errorValidation.push(`KOLOM D PADA BARIS KE '${i}' SALAH FORMAT PERIKSA DATA DITEMPLATE TERLEBIH DAHULU`)
            } 
            if(!jenis_kendaraan){
              errorValidation.push(`KOLOM E PADA BARIS KE '${i}' SALAH FORMAT PERIKSA DATA DITEMPLATE TERLEBIH DAHULU`)
            } 
            if(!rute){
              errorValidation.push(`KOLOM F PADA BARIS KE '${i}' SALAH FORMAT PERIKSA DATA DITEMPLATE TERLEBIH DAHULU`)
            }
            if(!harga){
              errorValidation.push(`KOLOM G PADA BARIS KE '${i}' SALAH FORMAT PERIKSA DATA DITEMPLATE TERLEBIH DAHULU`)
            } 
            if(!valid_from){
              errorValidation.push(`KOLOM H PADA BARIS KE '${i}' SALAH FORMAT PERIKSA DATA DITEMPLATE TERLEBIH DAHULU`)
            } 
            if(!valid_until){
              errorValidation.push(`KOLOM I PADA BARIS KE '${i}' SALAH FORMAT PERIKSA DATA DITEMPLATE TERLEBIH DAHULU`)
            } 
            if(isNaN(quota)){
              errorValidation.push(`KOLOM J PADA BARIS KE '${i}' SALAH FORMAT PERIKSA DATA DITEMPLATE TERLEBIH DAHULU NILAINYA ADALAH ${quota}`)
            }


        }

        console.log('errorValidation length',errorValidation.length);
        if(errorValidation.length > 0){


          res.error({
            message: errorValidation.toString()
          });

        }else{


          for (let i = 1; i < (excel.length); i++) {
                      
            let kode_transporter = excel[i][1]; console.log("KOLOM A ",kode_transporter); // Kolom A
            let nama_transporter = excel[i][2]; console.log("KOLOM B ",nama_transporter); // Kolom B
            let email = excel[i][3]; console.log("KOLOM C ",email); // Kolom C
            let ring = excel[i][4]; console.log("KOLOM D ",ring); // Kolom D
            let jenis_kendaraan = excel[i][5]; console.log("KOLOM E ",jenis_kendaraan); // Kolom E
            let rute = excel[i][6]; console.log("KOLOM F ",rute); // Kolom F
            let harga = excel[i][8]; console.log("KOLOM G ",harga); // Kolom G
            let quota = excel[i][11] === "-" ? 0 : excel[i][11]; console.log("KOLOM J ",quota); // Kolom J


            //  ** PROSES DELETE TERLEBIH DAHULU ATAS BIDING KOMBINASI RUTE & JENIS KENDARAAN ** //
            let deleteBucket = `delete bucket_bidding where rute = '${rute}' and jenis_kendaraan = '${jenis_kendaraan}' ;`;
            console.log("deleteBucket : ",deleteBucket);
            await request.query(deleteBucket);
                

          }            
          
          
            let user = nik ? nik : 'SYSTEM';


            // == LOPPIN KEDUA UNTUK INSER == //
            for (let i = 1; i < (excel.length); i++) {
                      
              let kode_transporter = excel[i][1]; console.log("KOLOM A ",kode_transporter); // Kolom A
              let nama_transporter = excel[i][2]; console.log("KOLOM B ",nama_transporter); // Kolom B
              let email = excel[i][3]; console.log("KOLOM C ",email); // Kolom C
              let ring = excel[i][4]; console.log("KOLOM D ",ring); // Kolom D
              let jenis_kendaraan = excel[i][5]; console.log("KOLOM E ",jenis_kendaraan); // Kolom E
              let rute = excel[i][6]; console.log("KOLOM F ",rute); // Kolom F
              let harga = excel[i][8]; console.log("KOLOM G ",harga); // Kolom G
              let valid_from = `${moment().format('YYYY')}-01-01`;
              let valid_until = moment().endOf('year').format('YYYY-MM-DD');
              let quota = excel[i][11] === "-" ? 0 : excel[i][11]; console.log("KOLOM J ",quota); // Kolom J




              //  ** PROSES INSERT BUCKET BIDING BARU ** //
                let insertBucket = 
                `INSERT INTO bucket_bidding
                (bucket_bidding_id, kode, nama, email, ring, jenis_kendaraan, rute, harga, valid_from, valid_until, qty_pemakaian, createdate, lokasi_pickup, kota_destinasi,createdby,updatedby)
                VALUES
                (newid(), '${kode_transporter}', '${nama_transporter}', '${email}', ${ring}, '${jenis_kendaraan}', '${rute}', ${harga}, 
                '${valid_from}', '${valid_until}', ${quota}, getdate(), '', '', '${user}', '${user}'); `;
                console.log("insertBucket : ",insertBucket);
                await request.query(insertBucket);

              //  ** PROSES INSERT BUCKET BIDING BARU ** //
                let insertTemporaryBucket = 
                `INSERT INTO bucket_bidding_backup
                (bucket_bidding_id, kode, nama, email, ring, jenis_kendaraan, rute, harga, valid_from, valid_until, qty_pemakaian, createdate, lokasi_pickup, kota_destinasi,createdby,updatedby)
                VALUES
                (newid(), '${kode_transporter}', '${nama_transporter}', '${email}', ${ring}, '${jenis_kendaraan}', '${rute}', ${harga}, 
                '${valid_from}', '${valid_until}', ${quota}, getdate(), '', '', '${user}', '${user}'); `;
                // console.log("insertTemporaryBucket : ",insertTemporaryBucket);
                await request.query(insertTemporaryBucket); 

            }  


            console.log("SELESAI LOOPING KEDUA PROSES INSERT BUCKET BIDING !! ");


            let sqlInsertData = `INSERT INTO audit_support
            (createdby,updatedby,kode,nama)
            VALUES('${user}','${user}',7, 'Upload ACP')`;
            console.log(sqlInsertData);
            await request.query(sqlInsertData);

            res.success({
              message: 'Upload file berhasil !! '
            });
            return true;

        }

       
      });
  },

  getTemplatefile: async function(req, res) { 
    const filename = req.param('filename')
    console.log('te', filename)
    // const filepath = dokumentPath(user, 'submitfaktur', record)+'/'+filename

    const filesamaDir = glob.GlobSync(path.resolve(templatePath(), filename + '*'))
    if (filesamaDir.found.length > 0) {
        //console.log(filesamaDir.found[0])

        // return res.send(filesamaDir.found[0]);
        // return res.success('OK');
        var lastItemAkaFilename = path.basename(filesamaDir.found[0])
        return res.download(filesamaDir.found[0], lastItemAkaFilename)
    }
    return res.error('Failed, File Not Found');
  },

  //** BATAS API */
  
};

