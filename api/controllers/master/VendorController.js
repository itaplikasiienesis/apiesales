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
 const DBPROCUREMENT = require('./../../services/DBPROCUREMENT');

 module.exports = {
   // GET ALL RESOURCE


      findDataVendor: async function(req, res) {    
        try {
          const {
            query: {keyword}
          } = req;

          let whereSearch = ``;
          if(keyword){
            whereSearch = `AND (UPPER(code) LIKE UPPER('%${keyword}%') OR UPPER(name) LIKE UPPER('%${keyword}%'))`;
          }
    
          let queryDataTable = `SELECT code as kode,name as nama from vendors WHERE 1=1 ${whereSearch} ORDER BY code`;

          console.log(queryDataTable);
    
          DBPROCUREMENT.query(queryDataTable, (err, result) => {
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
 