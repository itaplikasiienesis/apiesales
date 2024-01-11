const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../services/DBPROPOSAL");

const strtotime = require('locutus/php/datetime/strtotime'); 
const mt_rand = require('locutus/php/math/mt_rand'); 
const { log } = require("locutus/php/math");
module.exports = {

    findOne: async function(req, res) {
        await DB.poolConnect;
        try {
          const request = await DBPROP.promise();
          const {
            query: {proposal_id }
          } = req;
    
          let queryDataTable = `SELECT
          p.status_id,
          p.user_id,
          p.proposal_id,
          p.doc_no AS reference_proposal,
          p.doc_no AS referensi_no,
          p.doc_no AS proposal_no,
          ms.status_name AS status,
          p.budget_year,p.title,
          p.proposal_date,
          DATE_FORMAT(p.start_date, '%Y-%m-%d') AS period_start,
          DATE_FORMAT(p.end_date, '%Y-%m-%d') AS period_end,
          p.division_code AS division,
          p.region_id,
          p.month_proposal,
          p.division_code,
          p.company_code,
          mdv.division_id,
          mc.company_id,
          mr.region_desc AS region,
          p.total_budget,
          p.total_budget AS budget,
          p.sales_target,
          p.avg_sales AS avarage_sales,
          p.mechanism,
          p.kpi,
          p.objective,
          p.background,
          DATE_FORMAT(p.start_date, '%Y-%m-%d') AS start_date,
          DATE_FORMAT(p.end_date, '%Y-%m-%d') AS end_date,
          p.avg_sales,
          p.sales_target,
          p.created_by,
          p.biaya_po    
          FROM proposal p
          LEFT JOIN m_status ms ON p.status_id = ms.status_id
          LEFT JOIN m_region mr ON mr.region_id = p.region_id
          LEFT JOIN m_company mc ON mc.company_code = p.company_code
          LEFT JOIN m_division mdv ON mdv.division_code = p.division_code AND mdv.company_id = 3
          WHERE p.proposal_id = '${proposal_id}'`;
    
          console.log(queryDataTable);
          console.log('kesini copy revisi');
          let [rows, fields] = await request.query(queryDataTable);
    
          let row = rows[0];
          
          let tahun = row.budget_year;
          let division_code = row.division_code;
          row.mechanism = row.mechanism.replace('*\r','');

    
          let sqlgetexecutor = `SELECT * FROM proposal_executor LEFT JOIN employee ON proposal_executor.employee_id = employee.id WHERE proposal_id = '${proposal_id}'`;
    
          let dataexecutor = await request.query(sqlgetexecutor);
          let executor = dataexecutor[0];
    
    
          let sqlgetdistributor = `SELECT *,nama_distributor AS name FROM proposal_distributor LEFT JOIN distributor ON proposal_distributor.distributor_id = distributor.distributor_id WHERE proposal_id = '${proposal_id}'`;
    
          let datadistributor = await request.query(sqlgetdistributor);
          let distributor = datadistributor[0];
    
          let sqlgetemaildistributor = `SELECT * FROM proposal_email_distributor WHERE proposal_id = '${proposal_id}'`;
    
          let dataemaildistributor = await request.query(sqlgetemaildistributor);
          let emaildistributor = dataemaildistributor[0];
          
          let emaildist = emaildistributor.map(function (item) {
              return item['email_distributor'];
          });
                
          let sqlgetmarkettype= `SELECT pm.proposal_market_id,mmt.* FROM proposal_market pm 
          LEFT JOIN m_market_type mmt ON(pm.market_type_id = mmt.market_type_code)
          WHERE pm.proposal_id = '${proposal_id}'`;
    
          let datamarketype = await request.query(sqlgetmarkettype);
          let markettype = datamarketype[0];
    
    
    
          let sqlgetapprovalprogress = `SELECT * FROM v_appr_history WHERE proposal_id = '${proposal_id}' ORDER BY no_appr ASC`;
          let dataapprovalprogress = await request.query(sqlgetapprovalprogress);
          let approvalprogress = dataapprovalprogress[0];
    
          let bulan_start = Number(moment(row.period_start,'YYYY-MM-DD').format('MM'));
          let bulan_end = Number(moment(row.period_end,'YYYY-MM-DD').format('MM'));
          let bulanBerjalan = Number(moment().format('MM'));
    

          console.log('bulanBerjalan ',Number(bulanBerjalan));
    
          let bulan_array = [];
          for (let i = bulan_start; i <= bulan_end; i++) {
           
              bulan_array.push(i);
            
          }
  

          let bulan_arr = "";
          for (const datas of bulan_array) {
            bulan_arr += ",'" + datas + "'"
          }
          bulan_arr = bulan_arr.substring(1);
  
          let budget_year = tahun;
          let active = 0;
          let companyfilter = ``;
          let tahun_sekarang = moment().format('YYYY');

          if(tahun_sekarang==tahun || tahun == '2023'){

            if(budget_year==2020){
              active = 0;
              companyfilter = `AND activity.company_id='${row.company_id}'`
            }else{
              active = 1;
            }

            let sqlgetbudget = `SELECT 
            pb.proposal_budget_id,
            pb.proposal_budget_id AS budget_id,
            activity.division,
            mbch.branch_code,
            mbch.branch_desc AS branch,
            activity.activity_desc AS activity,
            pb.budget,
            pb.bulan,
            activity.activity_code,
            mb.brand_code,
            mb.brand_code AS brand,
            pb.nilai_so
            FROM proposal_budget pb
            LEFT JOIN m_activity activity ON activity.activity_code = pb.activity_id AND activity.year = '${budget_year}'
            LEFT JOIN m_branch mbch ON mbch.branch_code = pb.branch_code 
            LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code
            LEFT JOIN proposal p ON p.proposal_id = pb.proposal_id 
            WHERE pb.proposal_id = '${proposal_id}'
            AND activity.active = ${active}
            AND pb.bulan >= ${bulanBerjalan}
            ${companyfilter}
            ORDER BY pb.bulan`;

            console.log(sqlgetbudget);

            let databudget = await request.query(sqlgetbudget);
            let budget = databudget[0];
      
            let datavariant = [];
            let info_budget_arr = [];
            let periode = [];
            for (let i = 0; i < budget.length; i++) {
              
              let activity_code = budget[i].activity_code;
              let brand_code = budget[i].brand_code;
              let bulan_periode = convertBulan(budget[i].bulan);
              let bulan =  budget[i].bulan;
              budget[i].bulan = bulan_periode;


              periode.push(bulan);
              // let budget_year = tahun;
              budget[i].division = division_code;
              budget[i].division_code = division_code;
              // let active = 0;
              // let companyfilter = ``;
  
  
              // if(budget_year==2020){
              //   active = 0;
              //   companyfilter = `AND activity.company_id=${company_id}`
              // }else{
              //   active = 1;
              // }
  
  
              let sqlgetbudgetactivityall = `SELECT COALESCE(SUM(budget),0) as total,m_group.group_name,m_brand.brand_desc 
              FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
              LEFT JOIN m_group ON budget.group_id = m_group.id_group 
              LEFT JOIN m_activity activity ON m_group.id_group = activity.group_id AND activity.active=${active} AND activity.year = '${budget_year}'
              WHERE 
              activity.activity_code = '${activity_code}' 
              ${companyfilter}
              AND budget.year = '${budget_year}'
              AND budget.brand_code = '${brand_code}'`;
              //console.log(sqlgetbudgetactivityall);
              let databudgetactivityall = await request.query(sqlgetbudgetactivityall);
              let budgetactivityall = Number(databudgetactivityall[0][0].total);
  
             
  
  
              let sqlgetbudgetperactivityall = `SELECT COALESCE(SUM(budget),0) as total FROM proposal_budget 
              INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id 
              LEFT JOIN m_activity activity ON proposal_budget.activity_id = activity.activity_code AND activity.active=${active} AND activity.year = '${budget_year}'
              WHERE budget_year = '${budget_year}'
              AND proposal_budget.brand_code = '${brand_code}'
              AND proposal.status_id NOT IN (99)
              ${companyfilter}
              AND activity.group_id = (SELECT group_id FROM m_activity activity WHERE activity_code = '${activity_code}' AND activity.year = '${budget_year}' AND active=${active} ${companyfilter})`;
              //console.log(sqlgetbudgetperactivityall);
              let databudgetperactivityall = await request.query(sqlgetbudgetperactivityall);
              let budgetperactivityall = Number(databudgetperactivityall[0][0].total);
              let totalBudgetActivity = budgetactivityall - budgetperactivityall;
  
              
      
              let sqlgetbudgetactivity = `SELECT SUM(budget) as total,m_group.group_name,m_brand.brand_desc 
              FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
              LEFT JOIN m_group ON budget.group_id = m_group.id_group 
              LEFT JOIN m_activity activity ON m_group.id_group = activity.group_id AND activity.active=${active} AND activity.year = '${budget_year}'
              WHERE activity.activity_code = '${activity_code}' 
              ${companyfilter}
              AND budget.year = '${budget_year}' 
              AND budget.bulan = ${bulan}
              AND budget.brand_code = '${brand_code}'`;
              //console.log(sqlgetbudgetactivity);
              let databudgetactivity = await request.query(sqlgetbudgetactivity);
              let budgetactivity = Number(databudgetactivity[0][0].total);
  
  
      
              let sqlgetbudgetperactivity = `SELECT SUM(CASE WHEN nilai_so > 0 THEN nilai_so ELSE budget END) as total FROM proposal_budget 
              INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id 
              LEFT JOIN m_activity activity ON proposal_budget.activity_id = activity.activity_code AND activity.active=${active} AND activity.year = '${budget_year}'
              WHERE brand_code ='${brand_code}' AND budget_year = '${budget_year}' 
              AND proposal.status_id NOT IN (99)
              AND proposal_budget.bulan = ${bulan}
              ${companyfilter}
              AND activity.group_id = (SELECT group_id FROM m_activity activity WHERE activity_code = '${activity_code}' 
              AND activity.year = '${budget_year}' AND active=${active} ${companyfilter})`;
      
              // console.log(sqlgetbudgetperactivity);
      
              let databudgetperactivity = await request.query(sqlgetbudgetperactivity);
              let budgetperactivity = Number(databudgetperactivity[0][0].total);
              let budget_act = budgetactivity - budgetperactivity;
      
              let sqlgetbudgetbrand = `SELECT SUM(budget) as total,m_brand.brand_desc 
              FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code  
              WHERE budget.year = '${budget_year}' AND budget.brand_code = '${brand_code}'`;
      
              let databudgetbrand = await request.query(sqlgetbudgetbrand);
              let budgetbrand = Number(databudgetbrand[0][0].total);
      
      
      
              let sqlgetbudgetperbrand = `SELECT SUM(CASE WHEN nilai_so > 0 THEN nilai_so ELSE budget END) as total FROM proposal_budget 
              INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id
              where brand_code = '${brand_code}' and budget_year = '${budget_year}' and 
              proposal.status_id=30 and proposal.budget_year='${budget_year}'`;
      
              //console.log(sqlgetbudgetperbrand);
      
      
              let databudgetperbrand = await request.query(sqlgetbudgetperbrand);
              let budgetperbrand = Number(databudgetperbrand[0][0].total);
      
              let budget_brand = budgetbrand - budgetperbrand;
      
              budget[i].budgetactivity = budget_act;
              budget[i].budgetbrand = budget_brand;
              budget[i].budgettoapprove = budget[i].budget;
              budget[i].info_budget = info_budget_arr;
              budget[i].totalBudgetActivity = totalBudgetActivity;
              let proposal_budget_id = budget[i].proposal_budget_id;
              let sqlproposalbudgetvariant = `SELECT pbv.proposal_budget_variant_id,pbv.proposal_budget_id,pbv.proposal_id,
              pbv.variant_id,mv.variant_desc,mv.package_type,mv.brand_code
              FROM proposal_budget_variant pbv 
              LEFT JOIN m_variant mv ON(pbv.variant_id = mv.variant_id)
              WHERE pbv.proposal_budget_id = '${proposal_budget_id}'`;
              //console.log(sqlproposalbudgetvariant);
      
              let dataproposalbudgetvariant = await request.query(sqlproposalbudgetvariant);
              let proposalbudgetvariant = dataproposalbudgetvariant[0];
              datavariant.push(proposalbudgetvariant[0])
              budget[i].variant = proposalbudgetvariant;
      
      
              delete budget[i].budget;
            }


            let sqlgetsku = `SELECT pbv.proposal_budget_variant_id,pbv.proposal_budget_id,pbv.proposal_id,
            pbv.variant_id,mv.variant_desc,mv.package_type,mv.brand_code
            FROM proposal_budget_variant pbv
            LEFT JOIN m_variant mv ON(pbv.variant_id = mv.variant_id)
            WHERE pbv.proposal_id = '${proposal_id}'`;
      
      
            
            let datasku= await request.query(sqlgetsku);
            let sku = datasku[0];
             
          //   let sku = _.uniqBy(datavariant,"variant_id");
      
            let sqlgethistory = `SELECT * FROM v_history WHERE proposal_id = '${proposal_id}' ORDER BY created_date DESC`;
      
            let datahistory = await request.query(sqlgethistory);
            let history = datahistory[0];
      
            let sqlgetfile = `SELECT proposal_file_id AS uid,file AS name,'done' AS status FROM proposal_file WHERE proposal_id = '${proposal_id}'`;
      
      
            let datafile = await request.query(sqlgetfile);
            let file = datafile[0];
      
      
              for (let i = 0; i < distributor.length; i++) {
                
                let no = i + 1;
                distributor[i].no = no;
                
              }
      
              for (let i = 0; i < budget.length; i++) {
                
                let no = i + 1;
                budget[i].no = no;
                
              }
      
              for (let i = 0; i < history.length; i++) {
                
                let no = i + 1;
                history[i].no = no;
                
              }
      
              for (let i = 0; i < approvalprogress.length; i++) {
                
                let no = i + 1;
                approvalprogress[i].no = no;
      
                if(approvalprogress[i].flag == 0){
                  approvalprogress[i].status = "Menunggu";
                }else if(approvalprogress[i].flag == 1){
                  approvalprogress[i].status = "Sedang Diproses";
                }else{
                  approvalprogress[i].status = "Selesai";
                }
      
                
              }
      
              let arraysku = [];
              for (let i = 0; i < sku.length; i++) {
                
                let no = i + 1;
                sku[i].no = no;
                let brand_code = sku[i].brand_code;
                let package_type = sku[i].package_type;
                let datasku = brand_code +' '+package_type;
                arraysku.push(datasku)
                
              }
      
      
      
              for (let i = 0; i < sku.length; i++) {
                
                let no = i + 1;
                sku[i].no = no;
       
                
              }
      
      
              for (let i = 0; i < file.length; i++) {
      
                let proposal_id = file[i].proposal_id;
                let no = i + 1;
                file[i].no = no;
                file[i].url = "";
                
              }        
              arraysku = [...new Set(arraysku)];
              emaildist = [...new Set(emaildist)];
              row.sku = arraysku.toString();
              row.variant = sku;
              row.executor = executor;
              row.distributor = distributor;
              row.emaildistributor = emaildist.toString();
              row.approvalprogress = approvalprogress;
              row.budget = budget;
              row.history = history;
              row.file = file;
              row.markettype = markettype;
              row.periode = periode;
      
            return res.success({
              result: row,
              message: "Fetch data successfully"
            });

          }else{

            return res.error({
              message: "Tidak bisa dicopy karena beda periode tahun budget"
            });

          }
    
        } catch (err) {
          return res.error(err);
        }
    }
}



function convertBulan(bulan){

  let periode =  ``;
  if(bulan==1){
    periode='Januari';
  }else if(bulan==2){
    periode='Februari';
  }else if(bulan==3){
    periode='Maret';
  }else if(bulan==4){
    periode='April';
  }else if(bulan==5){
    periode='Mei';
  }else if(bulan==6){
    periode='Juni';
  }else if(bulan==7){
    periode='Juli';
  }else if(bulan==8){
    periode='Agustus';
  }else if(bulan==9){
    periode='September';
  }else if(bulan==10){
    periode='Oktober';
  }else if(bulan==11){
    periode='November';
  }else if(bulan==12){
    periode='Desember';
  }

  return periode;

}

function deConvertBulan(bulan){

  let periode =  1;
  if(bulan.toUpperCase()=='JANUARI'){
    periode=1;
  }else if(bulan.toUpperCase()=='FEBRUARI'){
    periode=2;
  }else if(bulan.toUpperCase()=='MARET'){
    periode=3;
  }else if(bulan.toUpperCase()=='APRIL'){
    periode=4;
  }else if(bulan.toUpperCase()=='MEI'){
    periode=5;
  }else if(bulan.toUpperCase()=='JUNI'){
    periode=6;
  }else if(bulan.toUpperCase()=='JULI'){
    periode=7;
  }else if(bulan.toUpperCase()=='AGUSTUS'){
    periode=8;
  }else if(bulan.toUpperCase()=='SEPTEMBER'){
    periode=9;
  }else if(bulan.toUpperCase()=='OKTOBER'){
    periode=10;
  }else if(bulan.toUpperCase()=='NOVEMBER'){
    periode=11;
  }else if(bulan.toUpperCase()=='DESEMBER'){
    periode=12;
  }

  return periode;

}