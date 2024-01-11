const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const path = require('path');
const DBPROP = require("../../../../services/DBPROPOSAL");
const numeral = require('numeral');
const fs = require('fs');
const shell = require('shelljs');
const converter = require('json-2-csv');
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);

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
    try {
      const request = await DBPROP.promise();
      const requestEsales = DB.pool.request();

      let whereClause = ``;

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
      
      let active = 0;
      if(budget_year==2020){
        active = 0;
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
      FROM vw_logbook a 
      left join history_appr b on a.proposal_id = b.proposal_id and b.status_approval_id = 3
      LEFT JOIN activity c ON (a.activity_id = c.activity_code AND c.active= CASE WHEN a.budget_year=2020 THEN 0 ELSE 1 END) 
      WHERE 1=1 ${whereClause} `;

      if(budget_year==2022){

        queryDataTable = `SELECT DISTINCT company_code, 
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
        c.group_name,
        a.bulan_desc,
        a.first_approve
        FROM vw_logbook2 a 
        left join history_appr b on a.proposal_id = b.proposal_id and b.status_approval_id = 3
        LEFT JOIN activity c ON (a.activity_id = c.activity_code AND c.active= CASE WHEN a.budget_year=2020 THEN 0 ELSE 1 END)
        WHERE 1=1 ${whereClause}`
      
      }else{
  
        queryDataTable = `SELECT DISTINCT company_code, 
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
        c.group_name,
        a.first_approve
        FROM vw_logbook a 
        left join history_appr b on a.proposal_id = b.proposal_id and b.status_approval_id = 3
        LEFT JOIN activity c ON (a.activity_id = c.activity_code AND c.active= CASE WHEN a.budget_year=2020 THEN 0 ELSE 1 END)
        WHERE 1=1 ${whereClause}`
        
      }
      
      let [rows] = await request.query(queryDataTable);
      let arraydetailsforexcel = [];

      if(rows.length > 0){
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
        
        let dt = await requestEsales.query(sel);
  
        for (let i = 0; i < dt.recordset.length; i++) {
          dt.recordset[i].budget_id= Number(dt.recordset[i].budget_id);
        }
    
          let datarows = [];
            for (let i = 0; i < rows.length; i++) {
    
              //console.log(i);
    
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
              }
    
              let obj = 
              {
                no : i+1,
                company_code: rows[i].company_code,
                division_code: rows[i].division_code,
                branch_desc: rows[i].branch_desc,
                brand_code: rows[i].brand_code,
                doc_no: rows[i].doc_no,
                proposal_date: rows[i].proposal_date,
                title: rows[i].title,
                budget_year: rows[i].budget_year,
                budget: rows[i].budget,
                status_name: rows[i].status_name,
                activity_code: rows[i].activity_code,
                activity_desc: rows[i].activity_desc,
                start_date: rows[i].start_date,
                end_date: rows[i].end_date,
                brand_text: rows[i].brand_text,
                status_id: rows[i].status_id,
                activity_id: rows[i].activity_id,
                created_date: rows[i].created_date,
                last_approve: rows[i].last_approve,
                outlet: rows[i].outlet,
                reject_date: rows[i].reject_date,
                reject_by: rows[i].reject_by,
                alasan: rows[i].alasan,
                budget_id: rows[i].budget_id,
                totalklaim:totalklaim,
                nomor_klaim:nomor_klaim,
                distributor:distributor,
                channel:channel,
                group_name:rows[i].group_name
              }
              
              datarows.push(obj);
    
            }
  
  
  
          for (let i = 0; i < datarows.length; i++) {
  
   
            let hasilsplit = datarows[i].brand_text ? datarows[i].brand_text.split(',') : null;
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
              "Budget Month Period" : rows[i].bulan_desc,
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
              "Nomor Klaim" : rows[i].nomor_klaim,
              "Distibutor" : rows[i].distributor,
              "Channel" : rows[i].channel,
              "Outlet" : rows[i].outlet ? rows[i].outlet : '',
              "Group Name" : rows[i].group_name ? rows[i].group_name : ''
    
            }
            arraydetailsforexcel.push(obj);
  
          }
  
          
  
          if(arraydetailsforexcel.length > 0){
            let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
            let namafile = 'logbook_'.concat(tglfile).concat('.csv');          
          
    
            converter.json2csv(arraydetailsforexcel, (err, csv) => {
              if (err) {
                  throw err;
              }
          
              // print CSV string
              let locationFiles = dokumentPath('temp','logbook').replace(/\\/g, '/');
              shell.mkdir('-p', locationFiles);
              // write CSV to a file
              fs.writeFileSync(locationFiles+"/"+namafile, csv);
              let filecsv = path.join(locationFiles+'/'+`${namafile}`);
              res.setHeader('Content-Type', 'application/octet-stream'); //'application/vnd.openxmlformats'
              res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
              return res.sendFile(filecsv);
              
          });
    
          }else{
    
            return res.error({
              message: "Data tidak ada"
            });
    
          }
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