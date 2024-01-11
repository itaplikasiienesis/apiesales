const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
module.exports = {

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
        whereClause = `AND company_code LIKE '%${searchText}%'
        OR company_desc LIKE '%${searchText}%' OR short_name LIKE '%${searchText}%'
        OR title LIKE '%${searchText}%'
        OR currency_code LIKE '%${searchText}%'`;
      }
      let queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM m_company WHERE 1=1 ${whereClause}`;

      let queryDataTable = `SELECT * FROM m_company WHERE 1=1 ${whereClause} ORDER BY company_id DESC limit ${offset},${limit}`;

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

      let queryDataTable = `SELECT * FROM m_company WHERE company_id ='${req.param(
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
  getby: async function (req, res) {
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let queryDataTable = `SELECT * FROM m_company`;

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
  create: async function (req, res) {
    const {
        company_code, company_desc, short_name, title, currency_code
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let InsertqueryDataTable = `INSERT INTO m_company
      (company_code, company_desc, short_name, title, currency_code)
      VALUES('${company_code}', '${company_desc}', '${short_name}', '${title}', '${currency_code}');`;
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
        company_id,
        company_code,
        company_desc,
        short_name,
        title,
        currency_code,
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let updateQueryTable = `UPDATE m_company
      SET company_code='${company_code}', 
      company_desc='${company_desc}', 
      short_name='${short_name}', 
      title='${title}', 
      currency_code='${currency_code}'
      WHERE company_id='${company_id}'`;

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
      let queryDeleteDataTable = `DELETE FROM m_company WHERE company_id='${req.param(
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