/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const uuid = require("uuid/v4");
 const axios = require("axios");
 const UPC = require('upc-generator');
 module.exports = {
   // GET ALL RESOURCE
   find: async function(req, res) {
     const {
       query: { currentPage, pageSize,searchText }
     } = req;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
       const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";

       let filtersearchtext = ``;
       if (searchText) {
         filtersearchtext = `AND plat_number LIKE '%${searchText}%' 
          OR kode_transporter LIKE '%${searchText}%' 
          OR nama_transporter LIKE '%${searchText}%'  
          OR nama_kendaraan LIKE '%${searchText}%'`;
       }

 
       let queryCountTable = `SELECT COUNT(1) AS total_rows
                               FROM m_kendaraan_transporter_v WHERE 1=1 ${filtersearchtext} ${whereClause}`;
 
       let queryDataTable = `SELECT * FROM m_kendaraan_transporter_v WHERE 1=1 ${filtersearchtext} ${whereClause}
                             ORDER BY created desc
                             OFFSET ${offset} ROWS
                             FETCH NEXT ${limit} ROWS ONLY`;
 
       const totalItems = await request.query(queryCountTable);
       const count = totalItems.recordset[0].total_rows || 0;
 
       request.query(queryDataTable, (err, result) => {
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
 
   // GET ONE RESOURCE
   findOne: async function(req, res) {
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let queryDataTable = `SELECT * FROM m_kendaraan_transporter_v 
       WHERE m_kendaraan_transporter_id='${req.param(
         "id"
       )}'`;
 
       request.query(queryDataTable, (err, result) => {
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
  
   // CREATE NEW RESOURCE
   new: async function(req, res) {
     const { m_user_id, m_transporter_id,r_kendaraan_id,plat_number,tahun_produksi, nomor_kir, nomor_stnk} = req.body;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       let upc = new UPC({flagCode: '1'});
       const code = upc.create();


       let param_plat_number = generateParam(plat_number);
       let param_tahun_produksi = generateParam(tahun_produksi);
       let param_nomor_kir = generateParam(nomor_kir);
       let param_nomor_stnk = generateParam(nomor_stnk);
       let param_m_user_id = m_user_id ? m_user_id : `SYSTEM`;


       let nomor_polisi = plat_number.trim();

       let sqlCheckNomorPolisi = `SELECT COUNT(1) AS statusAvailable FROM m_kendaraan_transporter WHERE plat_number = '${nomor_polisi}'`;
       let datakendaraan = await request.query(sqlCheckNomorPolisi);
       let statusAvailable = datakendaraan.recordset[0].statusAvailable;

       if(statusAvailable==0){
        const sql = `INSERT INTO m_kendaraan_transporter
        (createdby,updatedby, m_transporter_id, r_kendaraan_id, plat_number, upc,tahun_produksi, nomor_kir, nomor_stnk)
        VALUES('${param_m_user_id}','${param_m_user_id}', '${m_transporter_id}', '${r_kendaraan_id}', 
        ${param_plat_number}, '${code}',${param_tahun_produksi},${param_nomor_kir},${param_nomor_stnk})`;
  
        request.query(sql, (err, result) => {
          if (err) {
            return res.error(err);
          }
  
          return res.success({
            data: result,
            message: "Input Data Berhasil"
          });
        });
       }else{
        return res.success({
          message: "Input data gagal nomor polisi sudah ada"
        });
       }


     } catch (err) {
       return res.error(err);
     }
   },
 
   // UPDATE RESOURCE
   update: async function(req, res) {
     const { m_user_id,m_kendaraan_transporter_id,m_transporter_id,r_kendaraan_id,plat_number,tahun_produksi, nomor_kir, nomor_stnk} = req.body;
 
     console.log(req.body);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();

       let param_plat_number = generateParamUpdate('plat_number',plat_number);
       let param_tahun_produksi = generateParamUpdate('tahun_produksi',tahun_produksi);
       let param_nomor_kir = generateParamUpdate('nomor_kir',nomor_kir);
       let param_nomor_stnk = generateParamUpdate('nomor_stnk',nomor_stnk);
       let param_m_user_id = m_user_id ? `'${m_user_id}'` : `'SYSTEM'`;
       

       const sql = `UPDATE m_kendaraan_transporter 
                     SET updatedby = ${param_m_user_id},
                     updated=getdate()
                     ${param_plat_number}
                     ${param_tahun_produksi}
                     ${param_nomor_kir}
                     ${param_nomor_stnk}
                    WHERE m_kendaraan_transporter_id='${m_kendaraan_transporter_id}'`;


                    console.log(sql);
 
       request.query(sql, (err, result) => {
         if (err) {
           return res.error(err);
         }
         return res.success({
           data: result,
           message: "Update data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   // DELETE RESOURCE
   delete: async function(req, res) {
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const sql = `DELETE FROM m_kendaraan_transporter WHERE m_kendaraan_transporter_id='${req.param(
        "id"
      )}'`;

       console.log(sql);
 
       request.query(sql, (err, result) => {
         if (err) {
           return res.error(err);
         }
         return res.success({
           data: result,
           message: "Delete data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   }
 };


 function generateParam(param){
  let dataparam = ``;
  if(param){
      dataparam = `'${param}'`;
  }else{
    dataparam = 'NULL';
  }
    return dataparam;
 }



 function generateParamNumeric(param){
  let dataparam = ``;
  if(param){
      dataparam = param;
  }else{
    dataparam = 'NULL';
  }
    return dataparam;
 }


 function generateParamUpdate(namafield,param){
  let dataparam = ``;
  if(param){
      dataparam = `, ${namafield} = '${param}'`;
  }else{
    dataparam = `, ${namafield} = NULL`;
  }
    return dataparam;
 }

 

 