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
 const uuid = require("uuid/v4");
 const axios = require('axios');
 const FormData = require('form-data');
 const DBEMPLOYEE = require('.././../../../services/DBEMPLOYEE');

 module.exports = {
   // GET ALL RESOURCE

      find: async function(req, res) {    

        await DB.poolConnect;
        try {
          const {
            query: {keyword}
          } = req;
          const request = DB.pool.request();

          let whereSearch = ``;
          if(keyword){
            whereSearch = `AND (upper(kode) LIKE upper('%${keyword}%') OR upper(nama) LIKE upper('%${keyword}%') OR upper(head_department) LIKE upper('%${keyword}%'))`;
          }

    
        let queryDataTable = `SELECT DISTINCT kode,nama,head_department from data_department WHERE 1 = 1 ${whereSearch}`;

        console.log(queryDataTable);

        let data = await request.query(queryDataTable);
        let rows = data.recordset;

        return res.success({
          result: rows,
          message: "Fetch data successfully"
        });
    
   
        } catch (err) {
          return res.error(err);
        }
      },


      findEmployee: async function(req, res) {    
        try {
          const {
            query: {m_department_id,m_user_id}
          } = req;


        //   console.log(req.query);
    
          // let queryDataTable = `SELECT employee_id,display_name FROM v_headcount vh 
          // WHERE org_id = '${m_department_id}' AND employee_id <> '${m_user_id}'`;


          let queryDataTable = `SELECT "NIK" as employee_id,"Name" as display_name FROM v_hc_proc where "Supervisor ID" = '${m_user_id}'`;

          console.log(queryDataTable);
    
          DBEMPLOYEE.query(queryDataTable, (err, result) => {
            if (err) {
              return res.error(err);
            }    
            const rows = result.rows;
    
            return res.success({
              result: rows,
              message: "Fetch data successfully"
            });
          });
        } catch (err) {
          return res.error(err);
        }
      },


      findEmployeeByNik: async function(req, res) {    
        try {


          let nik = req.param("id");
          let queryDataTable = `SELECT * FROM v_hc_proc where "Supervisor ID" = '${nik}'`;

          DBEMPLOYEE.query(queryDataTable, (err, result) => {
            if (err) {
              return res.error(err);
            }    
            const row = result.rows[0];
            /**
             * {
             *    result : data utama,
             *    meta : data tambahan ( optional ),
             *    status : status response ( optional),
             *    message : pesan ( optional )
             * }
             */
    
            return res.success({
              result: row,
              message: "Fetch data successfully"
            });
          });
        } catch (err) {
          return res.error(err);
        }
      },


      
 }
 