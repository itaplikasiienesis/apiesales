const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
module.exports = {

  
  getby: async function (req, res) {
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let queryDataTable = `SELECT * FROM m_group`;
      console.log(queryDataTable);
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


  getByYearBudgeting: async function (req, res) {
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      let queryDataTable = `SELECT DISTINCT a.id_group AS id,a.group_name AS nama FROM m_group a,budget b WHERE a.id_group = b.group_id AND b.year = ${req.param(
        "budgetYear"
      )}`;
      
      let [rows, fields] = await request.query(queryDataTable);
      return res.success({
            result: rows,
            message: "Fetch data successfully"
          });
      
    } catch (err) {
      return res.error(err);
    }
  },


  getByYearBudgetActivity: async function (req, res) {
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      let queryDataTable = `SELECT DISTINCT group_id AS id,group_name AS nama
      FROM vw_budget_awal_vs_penggunaan_perperiod_pergl  WHERE 1=1 AND active=1 AND budget_year = ${req.param(
        "budgetYear"
      )}`;
      
      let [rows, fields] = await request.query(queryDataTable);
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
        whereClause = `AND group_name LIKE '%${searchText}%'`;
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM m_group WHERE active=1 ${whereClause}`;

      let queryDataTable = `SELECT * FROM m_group WHERE active=1 ${whereClause} ORDER BY id_group DESC limit ${offset},${limit}`;

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

      let queryDataTable = `SELECT * FROM m_group WHERE id_group ='${req.param(
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
        group_name, active
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let statusActive = 1;
      if(active==0){
        statusActive = 0;
      }else{
        statusActive = 1;
      }

      let InsertqueryDataTable = `
      INSERT INTO m_group
      (group_name, active)
      VALUES('${group_name}', ${statusActive})`;
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
        id_group,
        group_name,
        active
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let statusActive = 1;
      if(active==0){
        statusActive = 0;
      }else{
        statusActive = 1;
      }

      let updateQueryTable = `UPDATE m_group
      SET group_name='${group_name}', active='${statusActive}'
      WHERE id_group='${id_group}'`;

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
      let queryDeleteDataTable = `DELETE FROM m_group WHERE id_group='${req.param(
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