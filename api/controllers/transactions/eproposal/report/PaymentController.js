const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
module.exports = {


  // GET ALL RESOURCE
  generate: async function (req, res) {
    req.setTimeout(2080000);
    const {
      query: {budget_year,doc_no,
        brand,activity,status_id,division_code,company_code
        }
    } = req;

    try {
      const request = await DBPROP.promise();
      let whereClause = ``;
      console.log(req.query);
    
    if(doc_no){
        whereClause += ` AND pr.doc_no = '${doc_no}'`;
    }

    
    if(budget_year){
        whereClause += ` AND pr.budget_year = ${budget_year}`;
    }

    if(division_code){
        whereClause += ` AND md.division_code = '${division_code}'`;
    }

    if(company_code){
        whereClause += ` AND mc.company_code = '${company_code}'`;
    }

    if(brand){
        whereClause += ` AND pr.brand_text LIKE '%${brand}%'`;
    }
    
    if(activity){
        whereClause += ` AND pa.activity_id = '${activity}'`;
    }
    
    if(status_id){
        whereClause += ` AND pr.status_id = '${status_id}'`;
    }

    

      let queryDataTable = `SELECT p.*, pr.referensi_no, pr.budget_year, pr.is_referensi, mc.company_desc, md.division_desc, 
      md.division_code, mc.company_code, mb.brand_desc, pr.brand_text, pr.doc_no as no_epro, pa.activity_id, pr.status_id,
      sts.status_name AS status
      FROM payment p LEFT JOIN m_company mc ON mc.company_id = p.company_id LEFT JOIN 
      m_division md ON md.division_code = p.division 
      LEFT JOIN proposal pr ON pr.doc_no = p.doc_no 
      LEFT JOIN proposal_budget pb ON pb.proposal_id = pr.proposal_id 
      LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code 
      LEFT JOIN proposal_activity pa ON pa.proposal_id = pr.proposal_id
      LEFT JOIN m_status sts ON pr.status_id = sts.status_id
      WHERE 1=1 ${whereClause} GROUP BY p.bo_number `;
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