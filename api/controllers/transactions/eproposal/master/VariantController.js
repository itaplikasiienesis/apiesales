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
      query: { brand_id }
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let brandid = Number(brand_id);
      let sqlgetdivision = `SELECT * FROM m_brand WHERE brand_id=${brandid}`;

      let [rows, fields] = await request.query(sqlgetdivision);
      let brand_code = rows.length > 0 ? rows[0].brand_code : undefined;

      

      if(brand_code){

        let queryDataTable = `SELECT variant_id,CONCAT(brand_code,' ',package_type) AS sku,variant_desc FROM m_variant WHERE brand_code = '${brand_code}'`;
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
            message: "Brand Code tidak ditemukan"
          });
      }

      
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
        whereClause = `AND brand_code LIKE '%${searchText}%'
        OR flavour LIKE '%${searchText}%' OR package_type LIKE '%${searchText}%'
        OR packsize LIKE '%${searchText}%'
        OR variant_desc LIKE '%${searchText}%'
        `;
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM m_variant WHERE active=1 
                            ${whereClause}`;

      let queryDataTable = `SELECT * FROM m_variant 
      WHERE active=1 ${whereClause} 
      ORDER BY variant_id DESC limit ${offset},${limit}`;

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

      let queryDataTable = `SELECT * FROM m_variant WHERE variant_id ='${req.param(
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
      brand_id, brand_code, flavour, package_type, packsize, variant_desc, created_by
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let InsertqueryDataTable = `INSERT INTO m_variant
      (brand_id, brand_code, flavour, package_type, packsize, variant_desc, created_by, created_date, updated_by, updated_date)
      VALUES('${brand_id}', '${brand_code}', '${flavour}', '${package_type}', '${packsize}', '${variant_desc}', 
      '${created_by}', now(), '${created_by}', now())`;
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
      variant_id,
      brand_id, 
      brand_code, 
      flavour, 
      package_type, 
      packsize, 
      variant_desc,
      updated_by
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let updateQueryTable = `UPDATE m_variant
      SET brand_id='${brand_id}', brand_code='${brand_code}', 
      flavour='${flavour}', package_type='${package_type}', 
      packsize='${packsize}', variant_desc='${variant_desc}',
      updated_by='${updated_by}',
      updated_date=now()
      WHERE variant_id=${variant_id}`;

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
      let queryDeleteDataTable = `DELETE FROM m_variant WHERE variant_id='${req.param(
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