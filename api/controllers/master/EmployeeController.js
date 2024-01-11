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
 const DBPORTAL = require('./../../services/DBPORTAL');

 module.exports = {
   // GET ALL RESOURCE


      findDataEmployee: async function(req, res) {    
        try {
          const {
            query: {keyword}
          } = req;

          let whereSearch = ``;
          if(keyword){
            whereSearch = `AND (code like '%${keyword}%')`;
          }
    
          let queryDataTable = `SELECT code as kode,description as nama,uom_code as uom from master_materials WHERE 1=1 ${whereSearch} ORDER BY code`;

          console.log(queryDataTable);
    
          DBPORTAL.query(queryDataTable, (err, result) => {
            if (err) {
              return res.error(err);
            }    
            const rows = result.rows;
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
 }
 