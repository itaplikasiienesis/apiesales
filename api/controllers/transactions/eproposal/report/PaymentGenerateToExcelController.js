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
      query: {doc_no,brand_code,division_code,
        approve_start_date,budget_year,activity_code,
        approve_end_date,company_code,last_approve,
        created_start,created_end,
        status_id
        }
    } = req;
    try {
      await DB.poolConnect;
      const request = await DBPROP.promise();
      const requestEsales = DB.pool.request();

      let whereClause = ``;

      let sx = `select getdate() as day`
      let dd = await requestEsales.query(sx);
      // console.log(dd.recordset);

      console.log(req.query);

      if(doc_no){
          
          whereClause +=` AND doc_no ='${doc_no}'`;
      }
  
  
      if(brand_code){
          whereClause += ` AND brand_code ='${brand_code}'`;
      }
  
      if(division_code){
          
          whereClause += ` AND division_code ='${division_code}'`;
      }
      
  
      if(budget_year){
          
          whereClause += ` AND budget_year ='${budget_year}'`;
      }
  
      if(activity_code){
          
          whereClause += ` AND activity_code ='${activity_code}'`;
      }
  
      if(approve_start_date && approve_end_date){
          let startdate = moment(approve_start_date,'YYYY-MM-DD').format('YYYY-MM-DD');
          let enddate = moment(approve_end_date,'YYYY-MM-DD').format('YYYY-MM-DD');
          whereClause += ` AND last_approve BETWEEN '${startdate}' AND '${enddate}'`;
      }
  
      if(created_start && created_end){
          let startdate = moment(created_start,'YYYY-MM-DD').format('YYYY-MM-DD');
          let enddate = moment(created_end,'YYYY-MM-DD').format('YYYY-MM-DD');
          whereClause += ` AND proposal_date BETWEEN '${startdate}' AND '${enddate}'`;
      }
  
  
      if(company_code){
  
          whereClause += ` AND company_code ='${company_code}'`;
      }
  
      if(last_approve){
          let lastapprove = moment(last_approve,'YYYY-MM-DD').format('YYYY-MM-DD');
          whereClause += ` AND last_approve ='${lastapprove}'`;
      }
      
      if(status_id){
          whereClause += ` AND status_id ='${status_id}'`;
      }
      
      console.log("excel.................");
      
        let queryDataTable = `SELECT company_code, 
        division_code, branch_desc, 
        brand_code, doc_no, DATE_FORMAT(proposal_date, "%Y-%m-%d") AS proposal_date, 
        title, budget_year, budget, status_name, activity_code, 
        activity_desc, DATE_FORMAT(start_date, "%Y-%m-%d") AS start_date, DATE_FORMAT(end_date, "%Y-%m-%d") AS end_date, 
        brand_text, status_id, 
        activity_id, DATE_FORMAT(created_date, "%Y-%m-%d") AS created_date , 
        DATE_FORMAT(last_approve, "%Y-%m-%d") AS last_approve, outlet
        FROM vw_logbook WHERE 1=1 ${whereClause}  limit 10`;
        console.log(queryDataTable);
        let [rows, fields] = await request.query(queryDataTable);
  
        let arraydetailsforexcel = [];

        for (let i = 0; i < rows.length; i++) {
          
          console.log(rows[i].doc_no);
        
            let sel = `select b.nomor_proposal,sum(b.total_klaim) as total from klaim a
            inner join klaim_detail b on a.klaim_id = b.klaim_id
            where a.isactive = 'Y'
            and b.nomor_proposal = '${rows[i].doc_no}' and brand = '${rows[i].brand_code}' and branch_desc = '${rows[i].branch_desc}'
            group by b.nomor_proposal,brand,branch_code`
            console.log(sel);
            
            let dt = await requestEsales.query(sel);
            let totalKlaim = dt.recordset.length > 0 ? dt.recordset[0].total : 0;
            
            
         
         
          console.log(totalKlaim);

          let hasilsplit = rows[i].brand_text.split(',');
          let onlyUnique = _.uniq(hasilsplit);
          let nomor = i+1;
          let obj = {
  
            "Nomor" : nomor,
            "Company Code" : rows[i].company_code, 
            "Branch" : rows[i].branch_desc,
            "Branch Code" : rows[i].brand_code,
            "Proposal No" : rows[i].doc_no,
            "Proposal Date" : rows[i].proposal_date, 
            "title" : rows[i].title, 
            "Budget Year" : rows[i].budget_year, 
            "Nominal Budget" : numeral(rows[i].budget).format('0,0'), 
            "Nominal Klaim" : numeral(totalKlaim).format('0,0'), 
            "Status" : rows[i].status_name,
            "Activity Code" : rows[i].activity_code, 
            "Activity" : rows[i].activity_desc,
            "Start Date" : rows[i].start_date, 
            "End Date" : rows[i].end_date, 
            "Brand" : onlyUnique.toString(), 
            "Last Approve" : rows[i].last_approve,
            "Outlet" : rows[i].outlet ? rows[i].outlet : ''
  
          }
  
          arraydetailsforexcel.push(obj);
  
        }
  
        if(arraydetailsforexcel.length > 0){
          let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
          let namafile = 'logbook_'.concat(tglfile).concat('.xlsx');          
          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader('Content-Type', "application/vnd.ms-excel"); //'application/vnd.openxmlformats'
          res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
          res.end(hasilXls, 'binary');
        }else{
  
          return res.error({
            message: "Data tidak ada"
          });
  
        }
      
    } catch (err) {
      return res.error(err);
    }
  },
 


}


