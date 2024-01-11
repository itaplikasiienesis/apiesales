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
      query: { company_id,division,budget_year}
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();

      let tahun = budget_year;
      if(!tahun){
        tahun = moment().format('YYYY');
      }
    
      let companyid = Number(company_id);
      let queryDataTable = `SELECT * FROM m_activity WHERE division like '%${division}%' AND active=1 AND year=${tahun}`;

      console.log('budget_year ',budget_year);
      console.log('sasa ',queryDataTable);

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
      query: { currentPage, pageSize, searchText,division }
    } = req;
    console.log("lemparan",currentPage,pageSize,division);
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let whereClause = ``;

      console.log('division ',division);

      
      if (searchText) {
        whereClause = `AND m_activity.activity_code LIKE '%${searchText}%'
        OR m_activity.activity_desc LIKE '%${searchText}%' OR m_company.company_desc LIKE '%${searchText}%'
        OR m_activity.division LIKE '%${searchText}%'`;
      }


      if(division){
        whereClause = `AND m_activity.division = '${division}'`;
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM m_activity 
                            LEFT JOIN m_company ON m_activity.company_id = m_company.company_id 
                            WHERE m_activity.active=1 ${whereClause} `;

      let queryDataTable = `SELECT m_activity.activity_id,m_activity.activity_code,
      m_activity.activity_desc,m_company.company_desc AS company,
      m_activity.division 
      FROM m_activity LEFT JOIN m_company ON m_activity.company_id = m_company.company_id 
      WHERE m_activity.active=1 ${whereClause}
      ORDER BY m_activity.activity_id DESC limit ${offset},${limit}`;

      console.log("TESTT",queryDataTable);
      let result = await request.query(queryCountTable);
      const count = result[0][0].total_rows;
      let [rows, fields] = await request.query(queryDataTable);

      for (let i = 0; i < rows.length; i++) {
          
        rows[i].no = i+1;
        rows[i].budget_per_brand = Number(rows[i].budget_per_brand);
        rows[i].penggunaan_per_brand = Number(rows[i].penggunaan_per_brand);
        rows[i].sisa_per_brand = Number(rows[i].sisa_per_brand);
          
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
      FROM m_activity LEFT JOIN m_company ON m_activity.company_id = m_company.company_id WHERE m_activity.activity_id='${req.param(
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
      activity_code,activity_desc,company_id,division
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let InsertqueryDataTable = `INSERT INTO m_activity
      (activity_code, activity_desc, company_id, division)
      VALUES('${activity_code}', '${activity_desc}',${company_id}, '${division}')`;
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
      activity_code,activity_desc,
      company_id,division,
      activity_id
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      console.log(req.body);


      let updateQueryTable = `UPDATE m_activity
      (activity_code, activity_desc, company_id, division)
      SET activity_code='${activity_code}',
      activity_desc='${activity_desc}',
      company_id='${company_id}'
      division='${division}' WHERE activity_id=${activity_id}`;

      console.log(updateQueryTable);
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

  getByGroupAndYear: async function (req, res) {
    const {
      query: { m_group_id,budget_year}
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();

      let tahun = budget_year;
      if(!tahun){
        tahun = moment().format('YYYY');
      }
    
      let queryDataTable = `SELECT * FROM m_activity WHERE group_id = '${m_group_id}' AND year=${tahun}`;

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




}