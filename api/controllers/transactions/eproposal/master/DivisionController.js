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
      query: { company_id }
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let companyid = Number(company_id);
      let queryDataTable = ``;

      queryDataTable = `SELECT * FROM m_division WHERE active=1`;
      // if(companyid==3){

      //   queryDataTable = `SELECT * FROM m_division`;
      
      // }else{
        
      
      // }
      

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
        whereClause = `AND division_code LIKE '%${searchText}%'
        OR division_desc LIKE '%${searchText}%' OR m_company.company_desc LIKE '%${searchText}%'`;
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM m_division LEFT JOIN m_company ON m_division.company_id = m_company.company_id 
                            WHERE m_division.active=1 ${whereClause}`;

      let queryDataTable = `SELECT *
      FROM m_division 
      LEFT JOIN m_company ON m_division.company_id = m_company.company_id
      WHERE m_division.active=1 ${whereClause} ORDER BY m_division.division_id ASC limit ${offset},${limit}`;

      console.log("sadasda",queryDataTable);
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

      let queryDataTable = `SELECT *
      FROM m_division WHERE division_id='${req.param(
        "id"
      )}'`;

      console.log(queryDataTable);

      let [rows, fields] = await request.query(queryDataTable);
      const row = rows[0];

      return res.success({
        result: row,
        message: "Fetch data successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },
  create: async function (req, res) {
    const {
      division_code, division_desc, company_id, division_sap, budget_awal, company_desc
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let InsertqueryDataTable = `INSERT INTO m_division
      (division_code, division_desc, company_id, division_sap, budget_awal, company_desc,created_date,updated_date)
      VALUES('${division_code}', '${division_desc}', '${company_id}', '${division_sap}', ${budget_awal}, '${company_desc}',now(),now())`;
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
      division_id,division_code, division_desc, company_id, division_sap, budget_awal, company_desc
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let updateQueryTable = `UPDATE m_division
      SET division_code='${division_code}', division_desc='${division_desc}', company_id=${company_id},
      division_sap='${division_sap}', 
      budget_awal=${budget_awal}, 
      updated_by=NULL, updated_date=now(), company_desc='${company_desc}'
      WHERE division_id=${division_id}`;


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

      let queryDeleteDataTable = `DELETE FROM m_activity WHERE m_activity.activity_id='${req.param(
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