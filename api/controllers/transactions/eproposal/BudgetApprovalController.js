const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../services/DBPROPOSAL");
module.exports = {


  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: { currentPage, pageSize,employee_id }
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM budget_request_appr LEFT JOIN budget_request ON budget_request_appr.budget_request_id = budget_request.budget_request_id 
                            WHERE budget_request_appr.employee_id = '${employee_id}' AND flag = 1
                            ${whereClause}`;

      let queryDataTable = `SELECT id_appr,budget_year,division_code AS from_division,activity_code AS from_activity,brand_code AS from_brand,
      last_budget AS budget_awal,to_division,to_activity,to_brand,jumlah AS budget_penambahan
      FROM budget_request_appr LEFT JOIN budget_request ON budget_request_appr.budget_request_id = budget_request.budget_request_id 
      WHERE budget_request_appr.employee_id = '${employee_id}' AND flag = 1 ORDER BY id_appr DESC limit ${offset},${limit}`;

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

}