const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
module.exports = {


  // GET ALL RESOURCE
  getby: async function (req, res) {
    const {
      query: { region_id }
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let regionid = Number(region_id);
      let queryDataTable = ``;
      if(regionid==12){

        queryDataTable = `SELECT * FROM m_region`;
      
      }else{
        queryDataTable = `SELECT * FROM m_region WHERE region_id = '${regionid}'`;
      }
      
      
      let [rows, fields] = await request.query(queryDataTable);
      for (let i = 0; i < rows.length; i++) {

        rows[i].no = i+1;

          
      }
      return res.success({
            result: rows,
            message: "Fetch data successfully"
          });
      
    } catch (err) {
      return res.error(err);
    }
  },


  find: async function (req, res) {
    const {
      query: { currentPage, pageSize,searchText }
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let whereClause = ``;
      if (searchText) {
        whereClause = `AND region_desc LIKE '%${searchText}%'
        OR rtd LIKE '%${searchText}%' OR non_rtd LIKE '%${searchText}%'
        OR rtd_asdh LIKE '%${searchText}%'
        OR non_rtd_asdh LIKE '%${searchText}%'
        `;
      }
      let queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM m_region WHERE 1=1 ${whereClause}`;
      console.log(queryCountTable);
      let queryDataTable = `SELECT * FROM m_region WHERE 1=1 ${whereClause} ORDER BY region_id DESC limit ${offset},${limit}`;

      let result = await request.query(queryCountTable);
      const count = result[0][0].total_rows;
      let [rows, fields] = await request.query(queryDataTable);

      for (let i = 0; i < rows.length; i++) {
          
        rows[i].no = i+1;
          
      }

      const meta = paginate(currentPage, count, rows, pageSize);

      
      return res.success({
            result: rows,
            meta,
            message: "Fetch data successfully"
          });
      
    } catch (err) {
      return res.error(err);
    }
  },
  findOne: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = await DBPROP.promise();

      let queryDataTable = `SELECT * FROM m_region WHERE region_id ='${req.param(
        "id"
      )}'`;

      console.log(queryDataTable);
      let [rows, fields] = await request.query(queryDataTable);
      let row = rows[0];

      return res.success({
        result: row,
        message: "Fetch data successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },
  // GET ALL RESOURCE
  create: async function (req, res) {
    const {
      region_desc, rtd, non_rtd, rtd_asdh, non_rtd_asdh
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let InsertqueryDataTable = `INSERT INTO m_region
      (region_desc, rtd, non_rtd, rtd_asdh, non_rtd_asdh)
      VALUES('${region_desc}', '${rtd}', '${non_rtd}', '${rtd_asdh}', '${non_rtd_asdh}')`;
      console.log(InsertqueryDataTable);
      await request.query(InsertqueryDataTable);

      return res.success({
            message: "Create data successfully"
      });
      
    } catch (err) {
      return res.error(err);
    }
  },

  update: async function (req, res) {
    const {
      region_id,
      region_desc, rtd, non_rtd, rtd_asdh, non_rtd_asdh
      
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let updateQueryTable = `UPDATE m_region
      SET region_desc='${region_desc}', rtd='${rtd}', 
      non_rtd='${non_rtd}', rtd_asdh='${rtd_asdh}', 
      non_rtd_asdh='${non_rtd_asdh}'
      WHERE region_id=${region_id}`;

      await request.query(updateQueryTable);
      return res.success({
            message: "Update data successfully"
      });
      
    } catch (err) {
      return res.error(err);
    }
  },

  delete: async function (req, res) {
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      let queryDeleteDataTable = `DELETE FROM m_region WHERE region_id='${req.param(
        "id"
      )}'`;
    
      await request.query(queryDeleteDataTable);
      return res.success({
            message: "Delete data successfully"
      });
      
    } catch (err) {
      return res.error(err);
    }
  },

}