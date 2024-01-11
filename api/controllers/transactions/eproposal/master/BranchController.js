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
      query: { region_id }
    } = req;

    // await DBPROP;

    try {
      const request = await DBPROP.promise();
    
      let regionid = Number(region_id);

      let queryDataTable = ``;
      if(regionid == 12){

        queryDataTable = `SELECT * FROM m_branch`;
      
      }else{
        queryDataTable = `SELECT * FROM m_branch WHERE region_id = '${regionid}'`;
      }

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
  }

}