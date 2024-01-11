const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
module.exports = {


  // GET ALL RESOURCE
  generate: async function (req, res) {
    req.setTimeout(2080000000);
    const {
      query: {doc_no,brand_code,division_code,
        approve_start_date,budget_year,activity_code,
        approve_end_date,company_code,last_approve,
        created_start,created_end,
        status_id,bulan
        }
    } = req;

    //console.log(req.query);


    //** -- OPEN KALO GENERATE EXCELNYA SUDAH SAMA -- */
    if(budget_year == 2022 || budget_year == 2023){

      let viewnya = 'logbook_2022_view';

      if(budget_year==2023){
        viewnya = 'logbook_2023_view';
      }

      try {
        await DBPROD.poolConnect;
        const requestEsales = DBPROD.pool.request();
        const request = await DBPROP.promise();
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
  
          whereClause += ` AND company ='${company_code}'`;
      }
  
      if(last_approve){
          let lastapprove = moment(last_approve,'YYYY-MM-DD').format('YYYY-MM-DD');
          whereClause += ` AND last_approve ='${lastapprove}'`;
      }
      
      if(status_id){
          whereClause += ` AND status_id ='${status_id}'`;
      }


      let queryDataTable = `SELECT id, company as company_code, branch as branch_desc, 
      brand_code, proposal_no as doc_no, proposal_date, division as division_code, title, 
      budget_month_period ,
      case
              when budget_month_period = 1 then 'Januari'
              when budget_month_period = 2 then 'Februari'
              when budget_month_period = 3 then 'Maret'
              when budget_month_period = 4 then 'April'
              when budget_month_period = 5 then 'Mei'
              when budget_month_period = 6 then 'Juni'
              when budget_month_period = 7 then 'Juli'
              when budget_month_period = 8 then 'Agustus'
              when budget_month_period = 9 then 'September'
              when budget_month_period = 10 then 'Oktober'
              when budget_month_period = 11 then 'November'
              when budget_month_period = 12 then 'Desember'
              else 'Invalid Month'
      end AS bulan_desc,
      budget_year, nominal_budget as budget, nominal_klaim, 
      sisa_budget, status as status_name, rejected_by as reject_by, rejected_date as reject_date, alasan_reject as alasan, 
      activity_code as activity_id, first_approval, activity as activity_desc, 
      start_date, end_date, brand as brand_text, last_approve, last_approve_name, nomor_klaim, distributor, channel, outlet, 
      group_name, created_by, budget_id, created as created_date, status_id ,referensi_no
      FROM ${viewnya} where 1=1 ${whereClause}`;


      // let queryDataTable = `SELECT company_code,branch_desc, 
      // brand_code, doc_no, proposal_date,division_code, title, 
      // bulan as budget_month_period ,
      // case
      //         when bulan = 1 then 'Januari'
      //         when bulan = 2 then 'Februari'
      //         when bulan = 3 then 'Maret'
      //         when bulan = 4 then 'April'
      //         when bulan = 5 then 'Mei'
      //         when bulan = 6 then 'Juni'
      //         when bulan = 7 then 'Juli'
      //         when bulan = 8 then 'Agustus'
      //         when bulan = 9 then 'September'
      //         when bulan = 10 then 'Oktober'
      //         when bulan = 11 then 'November'
      //         when bulan = 12 then 'Desember'
      //         else 'Invalid Month'
      // end AS bulan_desc,
      // budget_year, budget, 0 AS nominal_klaim, 
      // 0 AS sisa_budget, status_name, reject_by, reject_date, alasan, 
      // activity_code as activity_id, first_approve ,activity_desc, 
      // start_date, end_date, brand_text, last_approve, last_approve_name,NULL AS nomor_klaim, NULL AS distributor, NULL AS channel, outlet, 
      // group_name, created_by, budget_id, created_date, status_id ,referensi_no
      // FROM logbook_2022 where 1=1 ${whereClause}`;

      // let [rows] = await request.query(queryDataTable);


      console.log(queryDataTable);


      let data = await requestEsales.query(queryDataTable);
      let rows = data.recordset;

      let datarows = [];
      for (let i = 0; i < rows.length; i++) {

        var startDate = moment([budget_year, rows[i].bulan - 1]);
        var endDate = moment(startDate).endOf('month');
  
        obj = 
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
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD'),
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
          totalklaim:rows[i].nominal_klaim,
          nomor_klaim:rows[i].nomor_klaim,
          distributor:rows[i].distributor,
          channel:rows[i].channel,
          group_name:rows[i].group_name,
          referensi_no:rows[i].referensi_no
        }

        datarows.push(obj);  
                
      }

      return res.success({
        result: datarows,
        message: "Fetch data successfully"
      });

      } catch (err) {
        console.log(err);
        return res.error(err);
      }



    }else{
      try {
        await DBPROD.poolConnect;
        const requestEsales = DBPROD.pool.request();
        const request = await DBPROP.promise();
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
        DATE_FORMAT(last_approve, "%Y-%m-%d") AS last_approve, outlet,
        COALESCE(b.created_date,'') as reject_date,
        COALESCE(b.updated_by,'') as reject_by,
        COALESCE(comment,'') as alasan,
        a.proposal_budget_id AS budget_id,
        c.group_name,
        a.bulan_desc
        FROM vw_logbook2 a 
        left join history_appr b on a.proposal_id = b.proposal_id and b.status_approval_id = 3
        LEFT JOIN activity c ON (a.activity_id = c.activity_code AND c.active= CASE WHEN a.budget_year=2020 THEN 0 ELSE 1 END AND c.year =a.budget_year)
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
        c.group_name
        FROM vw_logbook a 
        left join history_appr b on a.proposal_id = b.proposal_id and b.status_approval_id = 3
        LEFT JOIN activity c ON (a.activity_id = c.activity_code AND c.active= CASE WHEN a.budget_year=2020 THEN 0 ELSE 1 END AND c.year =a.budget_year)
        WHERE 1=1 ${whereClause}`
        
      }
  
        
        console.log(queryDataTable);
        let [rows, fields] = await request.query(queryDataTable);
  
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
          //console.log(sel);
          let dt = await requestEsales.query(sel);
    
          for (let i = 0; i < dt.recordset.length; i++) {
            dt.recordset[i].budget_id= Number(dt.recordset[i].budget_id);
          }
        
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
    
             let obj = undefined;
             if(budget_year <= 2021){
  
             obj = 
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
                totalklaim:totalKlaim,
                nomor_klaim:nomor_klaim,
                distributor:distributor,
                channel:channel,
                group_name:rows[i].group_name
              }
  
             
            }else if(rows[i].budget_year > 2021){
  
              var startDate = moment([budget_year, rows[i].bulan - 1]);
              var endDate = moment(startDate).endOf('month');
  
              obj = 
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
                start_date: startDate.format('YYYY-MM-DD'),
                end_date: endDate.format('YYYY-MM-DD'),
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
                totalklaim:totalKlaim,
                nomor_klaim:nomor_klaim,
                distributor:distributor,
                channel:channel,
                group_name:rows[i].group_name
              }
            
            }
  
              
              datarows.push(obj);
    
            }
          
            return res.success({
                result: datarows,
                message: "Fetch data successfully"
            });
        }else{
  
          return res.success({
            result: [],
            message: "Fetch data successfully"
          });
        }
        
      } catch (err) {
        console.log(err);
        return res.error(err);
      }
    }

    
  },
 


}