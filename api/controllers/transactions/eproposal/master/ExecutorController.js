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
    
      let queryDataTable = `SELECT * FROM employee LEFT JOIN m_company ON employee.company_id = m_company.company_id WHERE employee.company_id = '${company_id}'`;

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