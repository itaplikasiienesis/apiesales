const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
const numeral = require('numeral');
const json2xls = require('json2xls');

module.exports = {


  // GET ALL RESOURCE
  generate: async function (req, res) {
    req.setTimeout(2080000);
    const {
      query: {}
    } = req;
    try {
      await DB.poolConnect;
      const request = await DBPROP.promise();
      const requestEsales = DB.pool.request();


      let deleteQuery = `DELETE FROM logbook_2022`;
      await request.query(deleteQuery);


      let queryReBuilding = `INSERT INTO logbook_2022
                  (proposal_id, proposal_budget_id, bulan, company_code, division_code, branch_desc, brand_code, doc_no, proposal_date, 
                  title, budget_year, budget, status_name, activity_code, activity_desc, start_date, end_date, brand_text, status_id, activity_id, 
                  created_date, last_approve, last_approve_name, outlet, reject_date, reject_by, alasan, budget_id, group_name, bulan_desc, 
                  first_approve, created_by, referensi_no, ismigration)
                  SELECT DISTINCT a.proposal_id,a.proposal_budget_id,bulan,company_code, division_code, branch_desc,
                  brand_code, doc_no, DATE_FORMAT(proposal_date, "%Y-%m-%d") AS proposal_date, title, budget_year, budget, status_name, a.activity_code,
                  a.activity_desc, DATE_FORMAT(start_date, "%Y-%m-%d") AS start_date, DATE_FORMAT(end_date, "%Y-%m-%d") AS end_date, 
                  brand_text, status_id, 
                  a.activity_id, DATE_FORMAT(a.created_date, "%Y-%m-%d") AS created_date , 
                  DATE_FORMAT(last_approve, "%Y-%m-%d") AS last_approve, 
                  COALESCE(a.last_approve_name ,'') as last_approve_name, outlet,
                  (SELECT DATE_FORMAT(hsp.date_approval,'%Y-%m-%d') FROM history_appr hsp WHERE a.proposal_id = hsp.proposal_id ORDER BY hsp.created_date DESC LIMIT 1) AS reject_date,
                  (SELECT hsp.updated_by FROM history_appr hsp WHERE a.proposal_id = hsp.proposal_id ORDER BY hsp.created_date DESC LIMIT 1) AS reject_by,
                  (SELECT hsp.comment FROM history_appr hsp WHERE a.proposal_id = hsp.proposal_id ORDER BY hsp.created_date DESC LIMIT 1) AS alasan,
                  a.proposal_budget_id AS budget_id,
                  c.group_name,
                  a.bulan_desc,
                  a.first_approve,
                  a.created_by,
                  a.referensi_no,
                  'N' AS ismigration 
                  FROM vw_logbook2 a 
                  left join history_appr b on a.proposal_id = b.proposal_id and b.status_approval_id = 3
                  LEFT JOIN activity c ON (a.activity_id = c.activity_code AND c.year = a.budget_year)  
                  WHERE 1=1 AND c.active = 1 AND budget_year ='2022'`;
        await request.query(queryReBuilding);


        let deleteQueryEsales = `DELETE FROM logbook_2022`;
        await requestEsales.query(deleteQueryEsales);


        
      
        return res.success({
            message: "Sinkronisasi data successfully"
        });


      
    } catch (err) {
      return res.error(err);
    }
  },
 


}


