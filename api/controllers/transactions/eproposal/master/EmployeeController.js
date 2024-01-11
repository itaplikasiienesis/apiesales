const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
const md5 = require('md5');

module.exports = {

  find: async function (req, res) {
    const {
      query: { currentPage, pageSize,searchText }
    } = req;

    // await DBPROP;
    try {

      console.log(currentPage, pageSize);
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let whereClause = ``;
      if (searchText) {
        whereClause = `AND employee_id LIKE '%${searchText}%'
        OR name LIKE '%${searchText}%' OR m_user_type.user_type LIKE '%${searchText}%'
        OR m_company.company_code LIKE '%${searchText}%'
        OR m_company.company_desc LIKE '%${searchText}%'
        OR m_region.region_desc LIKE '%${searchText}%'
        OR email LIKE '%${searchText}%'
        `;
      }
      let queryCountTable =``;
      let queryDataTable =``;
      if(currentPage){

        queryCountTable = `SELECT COUNT(1) AS total_rows
        FROM employee
        LEFT JOIN m_user_type ON employee.user_type_id = m_user_type.user_type_id
        LEFT JOIN m_company ON employee.company_id = m_company.company_id 
        LEFT JOIN m_region ON m_region.region_id = employee.region_id
        WHERE employee.active=1
        ${whereClause}`;

        queryDataTable = `SELECT * FROM employee 
        LEFT JOIN m_user_type ON employee.user_type_id = m_user_type.user_type_id 
        LEFT JOIN m_company ON employee.company_id = m_company.company_id 
        LEFT JOIN m_region ON m_region.region_id = employee.region_id
        WHERE employee.active=1 ${whereClause}
        ORDER BY id DESC limit ${offset},${limit}`;

      }else{


        queryCountTable = `SELECT COUNT(1) AS total_rows
        FROM employee
        LEFT JOIN m_user_type ON employee.user_type_id = m_user_type.user_type_id
        LEFT JOIN m_company ON employee.company_id = m_company.company_id 
        LEFT JOIN m_region ON m_region.region_id = employee.region_id
        WHERE employee.active=1`;

        queryDataTable = `SELECT * FROM employee 
        LEFT JOIN m_user_type ON employee.user_type_id = m_user_type.user_type_id 
        LEFT JOIN m_company ON employee.company_id = m_company.company_id 
        LEFT JOIN m_region ON m_region.region_id = employee.region_id
        WHERE employee.active=1
        ORDER BY employee.name ASC`;


      }

      console.log(queryDataTable);

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

      let queryDataTable = `SELECT * FROM employee WHERE id='${req.param(
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

  create: async function (req, res) {
    const {
      employee_id,name,company_id,nip,user_type_id,region_id,email,password,product_manager,position_appr,allow_upload,open_budget_last_year,open_budget_next_year,
      created_by,executor
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      let passwordemployee = md5(password);
      let InsertqueryDataTable = `INSERT INTO employee
      (employee_id, user_type_id, nip, name, company_id, region_id, password,product_manager, position_appr, email,executor, 
      allow_upload, open_budget_last_year, open_budget_next_year, created_by, created_date, updated_by, updated_date)
      VALUES('${employee_id}', ${user_type_id}, '${nip}', '${name}', ${company_id}, ${region_id}, '${passwordemployee}','${product_manager}',
      '${position_appr}','${email}',${executor},${allow_upload}, ${open_budget_last_year}, ${open_budget_next_year}, '${created_by}', now(),'${created_by}',now())`;
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
      id,employee_id,name,company_id,nip,user_type_id,
      region_id,email,password,position_appr,executor,allow_upload,
      open_budget_last_year,open_budget_next_year,updated_by
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();

      let passwordemployee = md5(password);
    
      let updateQueryTable = `UPDATE employee
      SET employee_id='${employee_id}', 
      user_type_id='${user_type_id}', 
      nip='${nip}', 
      name='${name}', 
      company_id=${company_id}, 
      region_id=${region_id}, 
      password='${passwordemployee}', 
      position_appr='${position_appr}', 
      email='${email}', 
      executor=${executor}, 
      allow_upload=${allow_upload}, 
      open_budget_last_year=${open_budget_last_year}, 
      open_budget_next_year=${open_budget_next_year}, 
      updated_by='${updated_by}', 
      updated_date=now()
      WHERE id=${id}`;

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
      let queryDeleteDataTable = `DELETE FROM employee WHERE id='${req.param(
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


  findAll: async function (req, res) {
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      
      let queryDataTable = `SELECT employee.employee_id,employee.name FROM employee 
      LEFT JOIN m_user_type ON employee.user_type_id = m_user_type.user_type_id 
      LEFT JOIN m_company ON employee.company_id = m_company.company_id 
      LEFT JOIN m_region ON m_region.region_id = employee.region_id
      WHERE employee.active=1
      ORDER BY employee.name ASC`;


      //console.log(queryDataTable);

      let [rows] = await request.query(queryDataTable);

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