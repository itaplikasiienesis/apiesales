const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
const numeral = require('numeral');
const json2xls = require('json2xls');
const _ = require('lodash');

module.exports = {


  // GET ALL RESOURCE
  generate: async function (req, res) {
    req.setTimeout(2080000);
    const {
      query: {doc_no,brand_code,division_code,
        approve_start_date,budget_year,activity_code,
        approve_end_date,company_code,last_approve,
        created_start,created_end,
        status_id,bulan
        }
    } = req;

    // console.log(req);
    try {
      await DB.poolConnect;
      const request = await DBPROP.promise();
      const requestEsales = DB.pool.request();

      let whereClause = ``;

      let sx = `select getdate() as day`
      let dd = await requestEsales.query(sx);
      // console.log(dd.recordset);

      let bulan_arr = "";
      if(bulan && budget_year > 2021){
        if(bulan.length > 0){
          for (const datas of bulan) {
            bulan_arr += ",'" + datas + "'"
          }
          bulan_arr = bulan_arr.substring(1);
  
          whereClause += `AND bulan IN (${bulan_arr})`;
  
        }
      }

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
          
          if(budget_year==2020){
            whereClause += ` AND c.active = 0`;
          }
          whereClause += ` AND budget_year ='${budget_year}'`;
      }
  
      if(activity_code){
          
          whereClause += ` AND a.activity_code ='${activity_code}'`;
      }
  
      if(approve_start_date && approve_end_date){
          console.log(approve_start_date,approve_end_date)
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
      let active = 0;
      let tablelogbook = `vw_logbook`;
      if(budget_year==2020){
        active = 0;
      }else if(budget_year==2022){
        active = 1;
        tablelogbook = `vw_logbook2`;
      }else{
        active = 1;
      }
      
  
      let queryDataTable = `SELECT DISTINCT company_code, 
      division_code, branch_desc, 
      brand_code, doc_no, DATE_FORMAT(proposal_date, "%Y-%m-%d") AS proposal_date, 
      title, budget_year, budget, status_name, a.activity_code, 
      a.activity_desc, DATE_FORMAT(start_date, "%Y-%m-%d") AS start_date, DATE_FORMAT(end_date, "%Y-%m-%d") AS end_date, 
      brand_text, status_id, 
      a.activity_id, DATE_FORMAT(a.created_date, "%Y-%m-%d") AS created_date , 
      DATE_FORMAT(last_approve, "%Y-%m-%d") AS last_approve, outlet,
      COALESCE(b.created_date,'') as reject_date,
      COALESCE(b.updated_by,'') as reject_by,
      COALESCE(comment,'') as alasan,
      a.proposal_budget_id AS budget_id,
      c.group_name
      FROM ${tablelogbook} a 
      left join history_appr b on a.proposal_id = b.proposal_id and b.status_approval_id = 3
      LEFT JOIN activity c ON (a.activity_id = c.activity_code AND c.active= CASE WHEN a.budget_year=2020 THEN 0 ELSE 1 END AND c.year =a.budget_year)
      WHERE 1=1 ${whereClause}`;

      if(budget_year==2022){

        queryDataTable = `SELECT DISTINCT bulan,company_code, 
        division_code, branch_desc, 
        brand_code, doc_no, DATE_FORMAT(proposal_date, "%Y-%m-%d") AS proposal_date, 
        title, budget_year, budget, status_name, a.activity_code, 
        a.activity_desc, DATE_FORMAT(start_date, "%Y-%m-%d") AS start_date, DATE_FORMAT(end_date, "%Y-%m-%d") AS end_date, 
        brand_text, status_id, 
        a.activity_id, DATE_FORMAT(a.created_date, "%Y-%m-%d") AS created_date , 
        DATE_FORMAT(last_approve, "%Y-%m-%d") AS last_approve, 
        COALESCE(a.last_approve_name ,'') as last_approve_name, outlet,
        COALESCE(b.created_date,'') as reject_date,
        COALESCE(b.updated_by,'') as reject_by,
        COALESCE(comment,'') as alasan,
        a.proposal_budget_id AS budget_id,
        c.group_name,
        a.bulan_desc,
        a.first_approve,
        a.created_by 
        FROM vw_logbook2 a 
        left join history_appr b on a.proposal_id = b.proposal_id and b.status_approval_id = 3
        LEFT JOIN activity c ON (a.activity_id = c.activity_code AND c.active= CASE WHEN a.budget_year=2020 THEN 0 ELSE 1 END AND c.year =a.budget_year)
        WHERE 1=1 ${whereClause}`
      
      }else{
  
        queryDataTable = `SELECT DISTINCT company_code, 
        division_code, branch_desc, 
        brand_code, doc_no, DATE_FORMAT(proposal_date, "%Y-%m-%d") AS proposal_date, 
        title, budget_year, budget, status_name, a.activity_code, 
        a.activity_desc, 
        DATE_FORMAT(start_date, "%Y-%m-%d") AS start_date, DATE_FORMAT(end_date, "%Y-%m-%d") AS end_date, 
        brand_text, status_id, 
        a.activity_id, DATE_FORMAT(a.created_date, "%Y-%m-%d") AS created_date , 
        DATE_FORMAT(last_approve, "%Y-%m-%d") AS last_approve, 
        COALESCE(a.last_approve_name ,'') as last_approve_name , outlet,
        COALESCE(b.created_date,'') as reject_date,
        COALESCE(b.updated_by,'') as reject_by,
        COALESCE(comment,'') as alasan,
        a.proposal_budget_id AS budget_id,
        c.group_name,
        a.first_approve,
        a.created_by
        FROM vw_logbook a 
        left join history_appr b on a.proposal_id = b.proposal_id and b.status_approval_id = 3
        LEFT JOIN activity c ON (a.activity_id = c.activity_code AND c.active= CASE WHEN a.budget_year=2020 THEN 0 ELSE 1 END AND c.year =a.budget_year AND c.year =a.budget_year)
        WHERE 1=1 ${whereClause}`
        
      }


        let [rows, fields] = await request.query(queryDataTable);
  

        if(rows.length > 0){

          let arraydetailsforexcel = [];
          let budgetid = rows.map(function(item) {
            return item['budget_id'];
          });
  
         
  
          let budgetuniqid = _.uniq(budgetid);
          let valueINBudgetId = "";
          for (const datas of budgetuniqid) {
            valueINBudgetId += ",'" + datas + "'";
          }
          valueINBudgetId = valueINBudgetId.substring(1);
  
          let sel = `select b.nomor_proposal,nomor_klaim,sum(b.total_klaim) as total,c.nama,c.channel, 
          CAST(b.budget_id AS bigint) AS budget_id
          from klaim a
          inner join klaim_detail b on a.klaim_id = b.klaim_id
          left join m_distributor_v c on c.m_distributor_id = a.m_distributor_id
          where a.isactive = 'Y'
          and b.budget_id IN(${valueINBudgetId})
          group by b.nomor_proposal,nomor_klaim,c.nama,c.channel,CAST(b.budget_id AS bigint)`;
          console.log("QQQQQQ2",sel);
          let dt = await requestEsales.query(sel);
  
          for (let i = 0; i < dt.recordset.length; i++) {
            dt.recordset[i].budget_id= Number(dt.recordset[i].budget_id);
          }
          
  
  
          //let totalKlaim = dt.recordset.length > 0 ? dt.recordset[0].total : 0;
          // let nomor_klaim = dt.recordset.length > 0 ? dt.recordset[0].nomor_klaim : '';
          // let distributor = dt.recordset.length > 0 ? dt.recordset[0].nama : '';
          // let channel = dt.recordset.length > 0 ? dt.recordset[0].channel : '';
          // let sisa = rows[i].budget - (totalKlaim);
  
          let datarows = [];
          for (let i = 0; i < rows.length; i++) {
  
  
            let dataklaim = dt.recordset.filter( e => e.budget_id == rows[i].budget_id);
  
            let totalklaim = 0;
            let nomor_klaim = '';
            let distributor = '';
            let channel = '';
  
            if(dataklaim.length > 0){
              totalklaim = dataklaim[0].total;
              nomor_klaim = dataklaim[0].nomor_klaim;
              distributor = dataklaim[0].nama;
              channel = dataklaim[0].channel;
              start_date = dataklaim[0].start_date;
              end_date = dataklaim[0].end_date;
              created_by = dataklaim[0].created_by;
              // last_approve_name = dataklaim[0].last_approve_name;
  
              rows[i].nomor_klaim = nomor_klaim;
              rows[i].distributor = distributor;
              rows[i].channel = channel;
              rows[i].start_date = start_date;
              rows[i].end_date = end_date;
              rows[i].created_by = created_by;
              // rows[i].last_approve_name = last_approve_name;
            }
  
              
              let sel = `select b.nomor_proposal,nomor_klaim,sum(b.total_klaim) as total,c.nama,c.channel from klaim a
              inner join klaim_detail b on a.klaim_id = b.klaim_id
              left join m_distributor_v c on c.m_distributor_id = a.m_distributor_id
              where a.isactive = 'Y'
              and b.nomor_proposal = '${rows[i].doc_no}' and brand = '${rows[i].brand_code}' and branch_desc = '${rows[i].branch_desc}'
              group by b.nomor_proposal,nomor_klaim,c.nama,c.channel`
              //console.log(sel);
              
              let dt2 = await requestEsales.query(sel);
              let totalKlaim = dt2.recordset.length > 0 ? dt2.recordset[0].total : 0;
              let sisa = rows[i].budget - (totalKlaim);
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
              "Division" : rows[i].division_code,
              "title" : rows[i].title,
              "Budget Month Period" : rows[i].bulan_desc ? rows[i].bulan_desc : 'Belum Menerapkan Budget Periode',
              "Budget Year" : rows[i].budget_year, 
              "Nominal Budget" : numeral(rows[i].budget).format('0,0'), 
              "Nominal Klaim" : numeral(totalKlaim).format('0,0'), 
              "Sisa Budget" : numeral(sisa).format('0,0'), 
              "Status" : rows[i].status_name,
              "Rejected By" : rows[i].reject_by,
              "Rejected Date" : rows[i].reject_date,
              "Rejected Date" : rows[i].reject_date,
              "Alasan Reject" : rows[i].alasan,
              "Activity Code" : rows[i].activity_code, 
              "First Approval" : rows[i].first_approve,
              "Activity" : rows[i].activity_desc,
              "Start Date" : rows[i].start_date,
              "End Date" : rows[i].end_date,
              "Brand" : onlyUnique.toString(), 
              "Last Approve" : rows[i].last_approve,
              "Last Approve Name" : rows[i].last_approve_name,
              "Nomor Klaim" : rows[i].nomor_klaim,
              "Distibutor" : rows[i].distributor,
              "Channel" : rows[i].channel,
              "Outlet" : rows[i].outlet ? rows[i].outlet : '',
              "Group Name" : rows[i].group_name ? rows[i].group_name : '',
              "Created by" : rows[i].created_by
              
    
            }


            if(rows[i].bulan && rows[i].budget_year > 2021){
                
              obj = {
    
                "Nomor" : nomor,
                "Company Code" : rows[i].company_code, 
                "Branch" : rows[i].branch_desc,
                "Branch Code" : rows[i].brand_code,
                "Proposal No" : rows[i].doc_no,
                "Proposal Date" : rows[i].proposal_date,
                "Division" : rows[i].division_code, 
                "title" : rows[i].title,
                "Budget Month Period" : rows[i].bulan_desc ? rows[i].bulan_desc : 'Belum Menerapkan Budget Periode',
                "Budget Year" : rows[i].budget_year, 
                "Nominal Budget" : numeral(rows[i].budget).format('0,0'), 
                "Nominal Klaim" : numeral(totalKlaim).format('0,0'), 
                "Sisa Budget" : numeral(sisa).format('0,0'), 
                "Status" : rows[i].status_name,
                "Rejected By" : rows[i].reject_by,
                "Rejected Date" : rows[i].reject_date,
                "Rejected Date" : rows[i].reject_date,
                "Alasan Reject" : rows[i].alasan,
                "Activity Code" : rows[i].activity_code, 
                "First Approval" : rows[i].first_approve,
                "Activity" : rows[i].activity_desc,
                "Brand" : onlyUnique.toString(), 
                "Last Approve" : rows[i].last_approve,
                "Last Approve Name" : rows[i].last_approve_name,
                "Nomor Klaim" : rows[i].nomor_klaim,
                "Distibutor" : rows[i].distributor,
                "Channel" : rows[i].channel,
                "Outlet" : rows[i].outlet ? rows[i].outlet : '',
                "Group Name" : rows[i].group_name ? rows[i].group_name : '',
                "Created by" : rows[i].created_by
                
      
              }

            }

            arraydetailsforexcel.push(obj);
    
        }
    
        if(arraydetailsforexcel.length > 0){
              
            return res.success({
                message: "Proses Migrasi data successfully"
            });

          }else{
    
            return res.success({
              message: "Data tidak ada"
            });
    
          }
        }else{

          return res.success({
            message: "Data tidak ada"
          });
        
        }        
      
    } catch (err) {
      console.log('error logbook excel', err)
      return res.error(err);
    }
  },
 


}


