const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
module.exports = {


  // GET ALL RESOURCE
  getby: async function (req, res) {
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let queryDataTable = `SELECT * FROM vw_distributor WHERE approval IS NOT NULL`;

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
      query: { currentPage, pageSize,year }
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM distributor ${whereClause}`;

      let queryDataTable = `SELECT * FROM distributor LEFT JOIN employee ON distributor.approval = employee.employee_id ORDER BY distributor_id DESC limit ${offset},${limit}`;

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

      let queryDataTable = `SELECT * FROM distributor WHERE distributor_id ='${req.param(
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
      nama_distributor, alamat, approval, tipe_distributor
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    
      let InsertqueryDataTable = `INSERT INTO distributor
      (nama_distributor, alamat, approval, tipe_distributor)
      VALUES('${nama_distributor}', '${alamat}', '${approval}', '${tipe_distributor}')`;
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
      distributor_id,
      nama_distributor,
      alamat,
      approval,
      tipe_distributor
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    

      

      let updateQueryTable = `UPDATE distributor
      SET nama_distributor='${nama_distributor}', alamat='${alamat}', 
      approval='${approval}', 
      tipe_distributor='${tipe_distributor}'
      WHERE distributor_id='${distributor_id}'`;

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
      let queryDeleteDataTable = `DELETE FROM m_distributor WHERE distributor_id='${req.param(
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