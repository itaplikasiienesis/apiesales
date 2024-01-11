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
 const axios = require('axios');
 const moment = require('moment');
 module.exports = {
   // GET ALL RESOURCE

   send: async function(req, res) {
    const {kategori,datasource,subdatasource,searchText,pesan,channel} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let whereClauseKategori = ``;
      let whereClausedatasource = ``;
      let whereClauseSubdatasource = ``;
      let whereClausesearchText = ``;

      const Userid = 'marketamam2m';
      const Password = 'marketamam2m123';
      const Sender = 'ENESIS';
      const Msisdn = '6285217004359';
      const division ='IT';
      const batchname='Promo';
      const uploadby='SALES Promo';


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


      let queryDataTable = `SELECT DISTINCT (mce.telpon) AS telpon,mce.nama,mce.tgl_lahir
      FROM m_customer_enesis mce
      WHERE mce.isactive='Y'  AND mce.telpon IS NOT NULL ${whereClausesearchText} 
      ${whereClauseKategori} ${whereClausedatasource} ${whereClauseSubdatasource}`;
      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }


        const rows = result.recordset;
        let url = 'https://api.jatismobile.com/index.ashx';
        let validasiSms = [];
        let validasiSmsError = [];
        for (let i = 0; i < rows.length; i++) {
          let telpon = rows[i].telpon;
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

          console.log(message);


          let params = new URLSearchParams()
          params.append('Userid', Userid)
          params.append('Password', Password)
          params.append('Sender', Sender)
          params.append('Msisdn', telpon)
          params.append('message', message);
          params.append('division', division);
          params.append('batchname', batchname);
          params.append('uploadby', uploadby);
  

          
          const config = {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
  
          axios.post(url, params, config)
            .then((result) => {

              validasiSms.push(`Sending ${telpon} successfully`)

            })
            .catch((err) => {
              // Do somthing
              validasiSmsError.push(`Sending ${telpon} Failed ${err}`)
          });
          
        }


        return res.success({
          message: "Sending SMS successfully"
        });
       
      });
    } catch (err) {
      return res.error(err);
    }
  },
 
  
 };
 