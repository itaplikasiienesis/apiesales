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
        whereClause = `AND brand_code LIKE '%${searchText}%'
        OR brand_desc LIKE '%${searchText}%' OR company_desc LIKE '%${searchText}%'
        OR division LIKE '%${searchText}%'`;
      }

      let queryCountTable = ``;
      let queryDataTable = ``;
      if(currentPage){

        queryCountTable = `SELECT COUNT(1) AS total_rows
        FROM m_brand LEFT JOIN m_company ON m_brand.company_id = m_company.company_id WHERE 1=1 AND m_brand.active=1 ${whereClause}`;

        queryDataTable = `SELECT brand_id,brand_code,brand_desc,company_desc,division 
        FROM m_brand LEFT JOIN m_company ON m_brand.company_id = m_company.company_id WHERE m_brand.active=1 ${whereClause} 
        ORDER BY brand_id DESC limit ${offset},${limit}`;
        

      }else{

        queryCountTable = `SELECT COUNT(1) AS total_rows
        FROM m_brand LEFT JOIN m_company ON m_brand.company_id = m_company.company_id WHERE 1=1 AND m_brand.active=1 ${whereClause}`;

        queryDataTable = `SELECT brand_id,brand_code,brand_desc,company_desc,division 
        FROM m_brand LEFT JOIN m_company ON m_brand.company_id = m_company.company_id WHERE m_brand.active=1 ${whereClause} 
        ORDER BY brand_id`;

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

      let queryDataTable = `SELECT m_brand.*,m_brand.type_rtd AS rtd
      FROM m_brand LEFT JOIN m_company ON m_brand.company_id = m_company.company_id WHERE m_brand.brand_id='${req.param(
        "id"
      )}'`;

      console.log(queryDataTable);
      let [rows, fields] = await request.query(queryDataTable);
      let row = rows[0];

      let splitdivision = row.division.split(",");


      let division_arr = "";
      for (const datas of splitdivision) {
        division_arr += ",'" + datas + "'"
      }
      division_arr = division_arr.substring(1);
        

      let sqlgetdivision = `select * from m_division where division_code in (${division_arr})`;
      console.log(sqlgetdivision);
      let datadivision = await request.query(sqlgetdivision);
      let division = datadivision[0];
      row.division = division;

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
      brand_code, brand_desc, brand_sap, division, company_id, created_by,type_rtd
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let InsertqueryDataTable = `INSERT INTO m_brand
      (brand_code, brand_desc, brand_sap, division, company_id, created_by, created_date, updated_by, updated_date, type_rtd)
      VALUES('${brand_code}', '${brand_desc}', '${brand_sap}', '${division}','${company_id}','${created_by}', now(), '${created_by}', now(), '${type_rtd}')`;
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
      brand_id,
      brand_code,brand_desc,
      brand_sap,division,
      company_id,
      rtd
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      console.log(req.body);
      let updateQueryTable = `UPDATE m_brand
      SET brand_code='${brand_code}', 
      brand_desc='${brand_desc}', 
      brand_sap='${brand_sap}', 
      division='${division}', 
      company_id='${company_id}',
      type_rtd='${rtd}'
      WHERE brand_id=${brand_id}`;




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
      let queryDeleteDataTable = `DELETE FROM m_brand WHERE brand_id='${req.param(
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


  // GET ALL RESOURCE
  getby: async function (req, res) {
    const {
      query: { division_id }
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let divisionid = Number(division_id);
      let sqlgetdivision = `SELECT * FROM m_division WHERE division_id=${divisionid}`;

      console.log(sqlgetdivision);
      let [rows, fields] = await request.query(sqlgetdivision);
      let division_code = rows.length > 0 ? rows[0].division_code : undefined;

      

      if(division_code){

        let queryDataTable = `SELECT * FROM m_brand mb WHERE division like '%${division_code}%'`;
        console.log(queryDataTable);
        let [rows, fields] = await request.query(queryDataTable);
        for (let i = 0; i < rows.length; i++) {

            rows[i].no = i+1;
    
              
        }
        return res.success({
            result: rows,
            message: "Fetch data successfully"
          });

      }else{
        return res.error({
            message: "Division Code tidak ditemukan"
          });
      }

      
    } catch (err) {
      return res.error(err);
    }
  },

}