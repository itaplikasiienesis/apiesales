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
 const DBEMPLOYEE = require('./../../services/DBEMPLOYEE');

 module.exports = {
   // GET ALL RESOURCE


      findEnesisHR: async function(req, res) {    
        try {
          const {
            query: {employeeId}
          } = req;
    
          let queryDataTable = `select display_name,internal_title from v_headcount vh where employee_id = '${employeeId}'  `;

    
          DBEMPLOYEE.query(queryDataTable, (err, result) => {
            if (err) {
              return res.error(err);
            }    
            const rows = result.rows[0];

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

      findHeadDepartment: async function(req, res) {    
        try {
          const {
            query: {m_department_id}
          } = req;


          console.log(req.query);
    
          let queryDataTable = `SELECT employee_id,display_name,internal_title FROM v_headcount 
          WHERE org_id ='${m_department_id}' ORDER BY grade_interval DESC LIMIT 1`;

          console.log(queryDataTable);
    
          DBEMPLOYEE.query(queryDataTable, (err, result) => {
            if (err) {
              return res.error(err);
            }    
            const rows = result.rows[0];
    
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
 