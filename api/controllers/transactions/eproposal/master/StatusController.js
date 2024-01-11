const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
module.exports = {


  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: { brand_id }
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();  
      let queryDataTable = `SELECT * FROM m_status`;
      let [rows, fields] = await request.query(queryDataTable);
      return res.success({
          result: rows,
          message: "Fetch data successfully"
      });
    
    } catch (err) {
      return res.error(err);
    }
  },
}