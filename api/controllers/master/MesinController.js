/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const moment = require("moment");
 const axios = require('axios');
 const FormData = require('form-data');
 module.exports = {
   // GET ALL RESOURCE

   
   find: async function(req, res) {
     const {
       query: { currentPage, pageSize,kode_plant,searchText }
     } = req;
 

    //  console.log('searchKey ',searchText);
    //  console.log('plant ',kode_plant);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
       const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";

       let wherePlant = ``;
       if(kode_plant){
          wherePlant = `AND kode_plant = '${kode_plant}'`;
       }


       let whereClausesearchText = ``;
       if(searchText && searchText!='null'){
        whereClausesearchText = `AND (kode LIKE '%${searchText}%' OR nama LIKE '%${searchText}%' 
        OR kode_plant LIKE '%${searchText}%' OR object_id LIKE '%${searchText}%')`;
       }
 
       let queryCountTable = `SELECT COUNT(1) AS total_rows
                               FROM m_mesin WHERE 1=1 ${whereClause} ${wherePlant} ${whereClausesearchText}`;
 
       let queryDataTable = `SELECT * FROM m_mesin WHERE 1=1 ${whereClause} ${wherePlant} ${whereClausesearchText}
                             ORDER BY kode
                             OFFSET ${offset} ROWS
                             FETCH NEXT ${limit} ROWS ONLY`;
      //console.log(queryDataTable);
 
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


   findAll: async function(req, res) {
    const {
      query: { currentPage, pageSize }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT * FROM m_mesin WHERE isactive = 'Y' ORDER BY kode`;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
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
 
       let queryDataTable = `SELECT * FROM m_mesin WHERE m_mesin_id='${req.param(
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



   findOneDetail: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT * FROM m_mesin_detail WHERE m_mesin_detail_id='${req.param(
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

      // GET ONE RESOURCE
    findDetailMesin: async function(req, res) {
        await DB.poolConnect;
        try {
          const request = DB.pool.request();
    
          let queryDataTable = `SELECT md.*,mm.kode AS kode_sap ,mm.object_id FROM m_mesin_detail md,m_mesin mm 
          WHERE md.m_mesin_id='${req.param(
            "id"
          )}'
          AND mm.m_mesin_id  = md.m_mesin_id`;

          console.log(queryDataTable);
    
          request.query(queryDataTable, (err, result) => {
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

      new: async function(req, res) {
        const {m_user_id,kode,nama,m_mesin_id} = req.body;
    
        await DB.poolConnect;
        try {
          const request = DB.pool.request();

          let user = m_user_id ? m_user_id : 'SYSTEM';

          const sql = `INSERT INTO m_mesin_detail
          (createdby,updatedby, m_mesin_id, kode, nama)
          VALUES('${user}','${user}', '${m_mesin_id}', '${kode}', '${nama}')`;


          console.log(sql);
    
          request.query(sql, (err, result) => {
            if (err) {
              return res.error(err);
            }
            return res.success({
              data: result,
              message: "Insert data successfully"
            });
          });
        } catch (err) {
          return res.error(err);
        }
      },
 
      edit: async function(req, res) {
        const {m_user_id,kode,nama,m_mesin_detail_id} = req.body;
    
        await DB.poolConnect;
        try {
          const request = DB.pool.request();

          let user = m_user_id ? m_user_id : 'SYSTEM';

          const sql = `UPDATE m_mesin_detail SET kode='${kode}',updated=getdate(),updatedby='${user}',
          nama='${nama}' WHERE m_mesin_detail_id = '${m_mesin_detail_id}'`;


          console.log(sql);
    
          request.query(sql, (err, result) => {
            if (err) {
              return res.error(err);
            }
            return res.success({
              data: result,
              message: "Edit data successfully"
            });
          });
        } catch (err) {
          return res.error(err);
        }
      },
 

      delete: async function(req, res) {
        const {m_mesin_detail_id} = req.body;
    
        await DB.poolConnect;
        try {
          const request = DB.pool.request();
          const sql = `DELETE FROM m_mesin_detail WHERE m_mesin_detail_id = '${m_mesin_detail_id}'`;

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
      },


      findDataMesin: async function(req, res) {
        const {
          query: { currentPage, pageSize }
        } = req;
    
        await DB.poolConnect;
        try {
          const request = DB.pool.request();
    
          let queryDataTable = `SELECT DISTINCT kode,nama FROM m_mesin_detail ORDER BY kode`;
    
          request.query(queryDataTable, (err, result) => {
            if (err) {
              return res.error(err);
            }
    
            const rows = result.recordset;
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
              message: "Fetch data successfully"
            });
          });
        } catch (err) {
          return res.error(err);
        }
      },


      findDataMesinLoss: async function(req, res) {
        const {
          query: { plant,bulan_tahun,m_user_id }
        } = req;


        let tahun = moment(bulan_tahun,'YYYYMM').format('YYYY');
        let bulan = moment(bulan_tahun,'YYYYMM').format('MM');
    
        await DB.poolConnect;
        try {
          const request = DB.pool.request();
    
          let queryDataTable = `select distinct a.machine_id, b.machine_name  from oee_rawdatatbl a, oee_machinetbl b
          where a.machine_id=b.machine_id
          and a.plant_id='${plant}'
          and YEAR(a.rundate)= '${tahun}'
          AND MONTH(a.rundate)= '${bulan}'
          order by b.machine_name asc`;


          console.log(queryDataTable);
    
          request.query(queryDataTable, (err, result) => {
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

      
 }
 