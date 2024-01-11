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
      query: {user_type_id,employee_id,user_id }
    } = req;
    console.log(req.query);
    // await DBPROP;
    try {
      const request = await DBPROP.promise();


      let queryDataTable = ``;
      console.log(user_type_id);
      if(user_type_id!=3){

        if(user_type_id==1){

          queryDataTable = `SELECT proposal.proposal_id,proposal.doc_no AS proposal_no,proposal_date,title,
          m_status.status_name AS status FROM proposal 
          LEFT JOIN m_status ON proposal.status_id = m_status.status_id 
          WHERE proposal.user_id = '${user_id}'
          ORDER BY doc_no DESC LIMIT 10`;

        }else{

          queryDataTable = `SELECT proposal.proposal_id,proposal.doc_no AS proposal_no,proposal_date,title,
          m_status.status_name AS status FROM proposal 
          LEFT JOIN m_status ON proposal.status_id = m_status.status_id ORDER BY doc_no DESC LIMIT 10`;
        
        }

      
      }else{
          
          queryDataTable = `SELECT proposal.proposal_id,proposal.doc_no AS proposal_no,proposal_date,title FROM proposal_approval LEFT JOIN proposal ON 
          proposal_approval.proposal_id = proposal.proposal_id WHERE proposal.status_id NOT IN(99) 
          AND proposal_approval.flag = 1 AND employee_id = '${employee_id}'`;

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
  },

  getDocno: async function (req, res) {
    const {
      query: {tahun,nomor_proposal}
    } = req;
    console.log(req.query);
    // await DBPROP;
    try {
      const request = await DBPROP.promise();

      let whereTahun = ``;
      if(tahun){
        whereTahun = `AND budget_year = '${tahun}'`
      }

      let whereNomorProposal = ``;
      if(nomor_proposal){
        whereNomorProposal = ` AND doc_no = '${nomor_proposal}'`
      }


      queryDataTable = `SELECT doc_no,title FROM proposal WHERE status_id = 30 ${whereTahun} ${whereNomorProposal}
      ORDER BY created_date DESC`;

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