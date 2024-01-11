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


      findDataMaterial: async function(req, res) {    
        await DB.poolConnect;
        try {
          const {
            query: {keyword,group_kategori}
          } = req;

          const request = DB.pool.request();
          console.log(req.query);


          let getKodeMaterial = `SELECT * FROM r_group_material WHERE r_group_material_id = '${group_kategori}'`;
          let dataMaterialGroup = await request.query(getKodeMaterial);
          let kodeMaterial = dataMaterialGroup.recordset.length > 0 ?  dataMaterialGroup.recordset[0].kode : null;


          let whereSearch = ``;
          if(keyword){
            whereSearch = `AND (code like '%${keyword}%' OR UPPER(description) like UPPER('%${keyword}%'))`;
          }

          let WhereCodeMaterial = '';

          if(kodeMaterial){

            if(kodeMaterial == '1'){
              WhereCodeMaterial = `AND LEFT(code, 1)  = '3'`;
            }else if(kodeMaterial == '2'){
              WhereCodeMaterial = `AND LEFT(code, 1)  = '4'`;
            }else{
              WhereCodeMaterial = `AND LEFT(code, 1)  = '5'`;
            }
          
          }

          let queryDataTable = `SELECT DISTINCT code as kode,description as nama,uom_code as uom from master_materials WHERE 1=1 ${whereSearch} ${WhereCodeMaterial} ORDER BY code LIMIT 10`;
          if(keyword.length > 2 ){
            queryDataTable = `SELECT DISTINCT code as kode,description as nama,uom_code as uom from master_materials WHERE 1=1 ${whereSearch} ${WhereCodeMaterial} ORDER BY code`;
          }

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
 