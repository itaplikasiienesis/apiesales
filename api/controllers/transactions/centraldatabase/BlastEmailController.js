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
 const SendEmail = require('../../../services/SendEmailBlast');
 const moment = require('moment');

 module.exports = {
   // GET ALL RESOURCE

   send: async function(req, res) {

    const {kategori,datasource,subdatasource,searchText,judul,pesan} = JSON.parse(req.body.document);
    await DB.poolConnect;
    try {

      req.file('files')
      .upload({
        maxBytes: 150000000
      }, async function whenDone(err, uploadedFiles) {
        const request = DB.pool.request();
      

  
        // const fd = uploadedFiles[0].fd;
        // const nama_file = uploadedFiles[0].filename;

        // console.log(fd);
        // console.log(nama_file);

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
  
  
        let queryDataTable = `SELECT DISTINCT (mce.email) AS email,mce.nama,mce.tgl_lahir
        FROM m_customer_enesis mce
        WHERE mce.isactive='Y'  AND mce.email IS NOT NULL ${whereClausesearchText} 
        ${whereClauseKategori} ${whereClausedatasource} ${whereClauseSubdatasource}`;
  
        console.log(queryDataTable);
        request.query(queryDataTable,async(err, result) => {
          if (err) {
            return res.error(err);
          }
  
          const rows = result.recordset;
          for (let i = 0; i < rows.length; i++) {
              let email = rows[i].email;
              let nama = rows[i].nama;
              let tgl_lahir = rows[i].tgl_lahir;
  
              let message = pesan;
              let replaceParam = {
                nama: nama,
                tgl_lahir:moment(tgl_lahir,'YYYY-MM-DD').format('DD-MMM')
              }
  
              _.forOwn(replaceParam, function(value, key) {
                message = message.replace(new RegExp(`@${key}@`, "g"), value) 
              });
  
  
              await SendEmail(email,judul,message,null,uploadedFiles);
          }
  
          return res.success({
            result: rows,
            message: "Email Sending successfully"
          });
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
 
  
 };
 