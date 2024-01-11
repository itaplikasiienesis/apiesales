/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const uuid = require("uuid/v4");
 const mssql = require('mssql')
 const bcrypt = require('bcryptjs')
 const xlsx = require('node-xlsx');

 
 module.exports = {
   // GET ALL RESOURCE
   find: async function(req, res) {
     const {
       query: { currentPage, pageSize,kategori,datasource,subdatasource,searchText }
     } = req;
 

     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
       const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";

       let whereClauseKategori = ``;
       let whereClausedatasource = ``;
       let whereClauseSubdatasource = ``;
       let whereClausesearchText = ``;


       if(searchText){
        whereClausesearchText = `AND (mce.telpon LIKE '%${searchText}%' OR mce.email LIKE '%${searchText}%' OR mce.nama LIKE '%${searchText}%' OR mce.no_ktp LIKE '%${searchText}%')`;
       }

       if(kategori){
          whereClauseKategori = `AND mce.kode_kategori_customer = '${kategori}'`;
       }

       if(datasource){
        whereClausedatasource = `AND mce.kode_data_source = '${datasource}'`;    
       }

       if(subdatasource){
        whereClauseSubdatasource = `AND mce.kode_sub_data_source = '${subdatasource}'`;    
       }
 
       let queryCountTable = `SELECT COUNT(1) AS total_rows
       FROM m_customer_enesis mce 
       LEFT JOIN r_provinsi pro ON (pro.kode = mce.kode_provinsi)
       LEFT JOIN r_kabkota kab ON (kab.kode = mce.kode_kabkota)
       LEFT JOIN r_kecamatan kec ON (kec.kode = mce.kode_kecamatan)
       LEFT JOIN r_kelurahan kel ON (kel.kode = mce.kode_kelurahan)
       LEFT JOIN r_datacategory cat ON (cat.kode = mce.kode_kategori_customer)
       LEFT JOIN r_datasource dat ON (dat.kode = mce.kode_data_source)
       LEFT JOIN r_sub_datasource subdat ON (subdat.kode = mce.kode_sub_data_source)
       WHERE mce.isactive='Y' ${whereClause} ${whereClausesearchText} ${whereClauseKategori} ${whereClausedatasource} ${whereClauseSubdatasource}`;
 

       let queryDataTable = `SELECT mce.*,
       CONVERT(int,ROUND(DATEDIFF(hour,mce.tgl_lahir,GETDATE())/8766.0,0)) AS usia,
       pro.nama AS provinsi,
       kab.nama AS kabkota,
       kec.nama AS kecamatan,
       kel.nama AS kelurahan,
       cat.nama AS kategori,
       dat.nama AS datasource,
       subdat.nama AS subdatasource
       FROM m_customer_enesis mce 
       LEFT JOIN r_provinsi pro ON (pro.kode = mce.kode_provinsi)
       LEFT JOIN r_kabkota kab ON (kab.kode = mce.kode_kabkota)
       LEFT JOIN r_kecamatan kec ON (kec.kode = mce.kode_kecamatan)
       LEFT JOIN r_kelurahan kel ON (kel.kode = mce.kode_kelurahan)
       LEFT JOIN r_datacategory cat ON (cat.kode = mce.kode_kategori_customer)
       LEFT JOIN r_datasource dat ON (dat.kode = mce.kode_data_source)
       LEFT JOIN r_sub_datasource subdat ON (subdat.kode = mce.kode_sub_data_source)
       WHERE mce.isactive='Y' ${whereClause} ${whereClausesearchText} ${whereClauseKategori} ${whereClausedatasource} ${whereClauseSubdatasource}
       ORDER BY nama
       OFFSET ${offset} ROWS
       FETCH NEXT ${limit} ROWS ONLY`;


       const totalItems = await request.query(queryCountTable);
       const count = totalItems.recordset[0].total_rows || 0;
 
       request.query(queryDataTable,(err, result) => {
         if (err) {
           return res.error(err);
         }
 
         const rows = result.recordset;
         const meta = paginate(currentPage, count, rows, pageSize);
         /**
          * {
          *    result : data utama,
          *    meta : data tambahan ( optional ),
          *    status : status response ( optional),
          *    message : pesan ( optional )
          * }
          */
         return res.success({
           result: rows,
           meta,
           message: "Fetch data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },

   findAll: async function(req, res) {
    const {
      query: {kategori,datasource,subdatasource,searchText }
    } = req;

    console.log(req.query);

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let whereClauseKategori = ``;
      let whereClausedatasource = ``;
      let whereClauseSubdatasource = ``;
      let whereClausesearchText = ``;


      if(searchText && searchText!='null'){
       whereClausesearchText = `AND (mce.telpon LIKE '%${searchText}%' OR mce.email LIKE '%${searchText}%' 
       OR mce.nama LIKE '%${searchText}%' OR mce.no_ktp LIKE '%${searchText}%')`;
      }

      if(kategori && kategori!='null'){
         whereClauseKategori = `AND mce.kode_kategori_customer = '${kategori}'`;
      }

      if(datasource && datasource!='null'){
       whereClausedatasource = `AND mce.kode_data_source = '${datasource}'`;    
      }

      if(subdatasource && subdatasource!='null'){
       whereClauseSubdatasource = `AND mce.kode_sub_data_source = '${subdatasource}'`;    
      }


      let queryDataTable = `SELECT mce.*,
      CONVERT(int,ROUND(DATEDIFF(hour,mce.tgl_lahir,GETDATE())/8766.0,0)) AS usia,
      pro.nama AS provinsi,
      kab.nama AS kabkota,
      kec.nama AS kecamatan,
      kel.nama AS kelurahan,
      cat.nama AS kategori,
      dat.nama AS datasource,
      subdat.nama AS subdatasource
      FROM m_customer_enesis mce 
      LEFT JOIN r_provinsi pro ON (pro.kode = mce.kode_provinsi)
      LEFT JOIN r_kabkota kab ON (kab.kode = mce.kode_kabkota)
      LEFT JOIN r_kecamatan kec ON (kec.kode = mce.kode_kecamatan)
      LEFT JOIN r_kelurahan kel ON (kel.kode = mce.kode_kelurahan)
      LEFT JOIN r_datacategory cat ON (cat.kode = mce.kode_kategori_customer)
      LEFT JOIN r_datasource dat ON (dat.kode = mce.kode_data_source)
      LEFT JOIN r_sub_datasource subdat ON (subdat.kode = mce.kode_sub_data_source)
      WHERE mce.isactive='Y' ${whereClausesearchText} ${whereClauseKategori} ${whereClausedatasource} ${whereClauseSubdatasource}
      ORDER BY nama`;

      //console.log(queryDataTable);
      request.query(queryDataTable,(err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
   
        return res.success({
          result: rows,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
 
   // GET ONE RESOURCE
   findOne: async function(req, res) {
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let queryDataTable = `SELECT mce.*,
       CONVERT(int,ROUND(DATEDIFF(hour,mce.tgl_lahir,GETDATE())/8766.0,0)) AS usia,
       pro.nama AS provinsi,
       kab.nama AS kabkota,
       kec.nama AS kecamatan,
       kel.nama AS kelurahan,
       cat.nama AS kategori,
       dat.nama AS datasource,
       subdat.nama AS subdatasource
       FROM m_customer_enesis mce 
       LEFT JOIN r_provinsi pro ON (pro.kode = mce.kode_provinsi)
       LEFT JOIN r_kabkota kab ON (kab.kode = mce.kode_kabkota)
       LEFT JOIN r_kecamatan kec ON (kec.kode = mce.kode_kecamatan)
       LEFT JOIN r_kelurahan kel ON (kel.kode = mce.kode_kelurahan)
       LEFT JOIN r_datacategory cat ON (cat.kode = mce.kode_kategori_customer)
       LEFT JOIN r_datasource dat ON (dat.kode = mce.kode_data_source)
       LEFT JOIN r_sub_datasource subdat ON (subdat.kode = mce.kode_sub_data_source)
       WHERE mce.isactive='Y' AND m_customer_enesis_id='${req.param(
         "id"
       )}'`;
 
       request.query(queryDataTable,async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         const row = result.recordset[0];
         return res.success({
           result: row,
           message: "Fetch data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },


   upload: async function (req, res) {
    res.setTimeout(0);
    const {m_user_id} = req.body;
    req.file('excel')
      .upload({
        maxBytes: 150000000
      }, async function whenDone(err, uploadedFiles) {

        await DB.poolConnect;
        const request = DB.pool.request();
        if (err)
        
        return res.error(err);

        if (uploadedFiles.length === 0) {          
          return res.error([], 'Tidak ada file yang diupload!');
        }
        // await DB.poolConnect;
        // const request = DB.pool.request();



        const fd = uploadedFiles[0].fd;
        var obj = xlsx.parse(fd);
        const excel = obj[0].data;

        let validasi = [];  
        for (let i = 1; i < (excel.length - 1); i++) {

          let nama = excel[i][0];
          let tempat_lahir = excel[i][1];
          let tgl_lahir = excel[i][2];
          let jenis_kelamin = excel[i][3];
          let no_hp = excel[i][4] ? excel[i][4].toString().replace(/\s+/g, '') : null;
          let email = excel[i][5];
          let no_ktp = excel[i][6];
          let alamat_lengkap = excel[i][7];
          let kode_provinsi = excel[i][8];
          let kode_kabupaten = excel[i][9];
          let kode_kecamatan = excel[i][10];
          let kode_kelurahan = excel[i][11];
          let rt = excel[i][13];
          let rw = excel[i][12];
          let kode_kategori_customer = excel[i][14]; 
          let kode_data_source = excel[i][15]; 
          let kode_sub_data_source = excel[i][16];
          let brand_reference = excel[i][17];
          
          let cekNomorHP = `SELECT COUNT(1) AS jumlah_data FROM m_customer_enesis WHERE telpon = '${no_hp}'`;
          let datacekNomorHP = await request.query(cekNomorHP);
          let jumlah_data = datacekNomorHP.recordset[0].jumlah_data;

          if(jumlah_data > 0){
            validasi.push(`Nomor HP sudah terdaftar cek baris ke -`,i);
          }

         

        }

        if(validasi.length > 0){

          res.success({
            error:true,
            message: validasi.toString()
          });

        }else{

        for (let i = 1; i < (excel.length - 1); i++) {

          let nama = excel[i][0] ? `'${excel[i][0].toString().replace(/\s+/g, '')}'` : 'NULL';
          let tempat_lahir = excel[i][1] ? `'${excel[i][1].toString().replace(/\s+/g, '')}'` : 'NULL';
          let tgl_lahir = excel[i][2] ? `'${excel[i][2].toString().replace(/\s+/g, '')}'` : 'NULL';
          let jenis_kelamin = excel[i][3] ? `'${excel[i][3].toString().replace(/\s+/g, '')}'` : 'NULL';
          let no_hp = excel[i][4] ? `'${excel[i][4].toString().replace(/\s+/g, '')}'` : 'NULL';
          let email = excel[i][5] ? `'${excel[i][5].toString()}'` : 'NULL';
          let no_ktp = excel[i][6] ? `'${excel[i][6].toString()}'` : 'NULL';
          let alamat_lengkap = excel[i][7] ? `'${excel[i][7].toString()}'` : 'NULL';
          let kode_provinsi = excel[i][8] ? `'${excel[i][8].toString()}'` : 'NULL';
          let kode_kabkota = excel[i][9] ? `'${excel[i][9].toString()}'` : 'NULL';
          let kode_kecamatan = excel[i][10] ? `'${excel[i][10].toString()}'` : 'NULL';
          let kode_kelurahan = excel[i][11] ? `'${excel[i][11].toString()}'` : 'NULL';
          let rt = excel[i][13] ? `'${excel[i][13].toString()}'` : 'NULL';
          let rw = excel[i][12] ? `'${excel[i][12].toString()}'` : 'NULL';
          let kode_kategori_customer = excel[i][14] ? `'${excel[i][14].toString()}'` : 'NULL';
          let kode_data_source = excel[i][15] ? `'${excel[i][15].toString()}'` : 'NULL';
          let kode_sub_data_source = excel[i][16] ? `'${excel[i][16].toString()}'` : 'NULL';
          let brand_reference = excel[i][17] ? `'${excel[i][17].toString()}'` : 'NULL';
          let nama_perusahaan = excel[i][18] ? `'${excel[i][18].toString()}'` : 'NULL';

          let sqlInsert = `INSERT INTO m_customer_enesis
          (nama, no_ktp, tgl_lahir, jenis_kelamin, telpon, email, alamat_lengkap, kode_kategori_customer, kode_data_source, 
          kode_sub_data_source, nama_perusahaan, kode_kelurahan, kode_kecamatan, kode_kabkota, kode_provinsi, rw, rt, tempat_lahir, brand_reference)
          VALUES(${nama}, ${no_ktp}, ${tgl_lahir}, ${jenis_kelamin}, ${no_hp}, ${email}, ${alamat_lengkap}, ${kode_kategori_customer}, 
          ${kode_data_source}, ${kode_sub_data_source}, ${nama_perusahaan}, ${kode_kelurahan}, ${kode_kecamatan}, ${kode_kabkota}, 
          ${kode_provinsi}, ${rw}, ${rt}, ${tempat_lahir}, ${brand_reference})`;

          await request.query(sqlInsert);
          

        }

        //console.log(table);

       // await request.bulk(table)
            
          res.success({
            message: 'Upload file berhasil'
          });
          return true;

        }


      });
  }
 
 };
 