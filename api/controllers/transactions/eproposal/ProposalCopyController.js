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
    
        const request2 = DB.pool.request();
        const request = await DBPROP.promise();
        const {
          query: {m_user_id,employee_id,proposal_id }
        } = req;
    
        let queryDataTable = `SELECT
        p.status_id,
        p.user_id,
        p.proposal_id,
        p.doc_no AS proposal_no,ms.status_name AS status,
        p.budget_year,p.title,p.proposal_date,
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
        p.status AS status_reverse,
        p.reference_proposal,
        p.biaya_po
        FROM proposal p
        LEFT JOIN m_status ms ON p.status_id = ms.status_id
        LEFT JOIN m_region mr ON mr.region_id = p.region_id
        LEFT JOIN m_company mc ON mc.company_code = p.company_code
        LEFT JOIN m_division mdv ON mdv.division_code = p.division_code and p.company_code = mdv.company_desc
        WHERE p.proposal_id = '${proposal_id}'`;
    
        // console.log(queryDataTable);
        let [rows, fields] = await request.query(queryDataTable);
      
        let row = rows[0];
        let tahun = row.budget_year;
        //console.log(tahun);
    
        let company_id = row.company_id;
        //console.log(company_id);
        let division_code = row.division_code;
        row.mechanism = row.mechanism.replace('*\r','');

        let tahun_sekarang = moment().format('YYYY');


        if(tahun_sekarang==tahun || tahun == '2023'){
        
        // console.log('SAMA');
        // console.log('tahun_sekarang ',tahun_sekarang);
        // console.log('budget_year ',tahun);
    
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
    
        
    
    
        let sqlgetapprovalprogress = `SELECT * FROM v_appr_history WHERE proposal_id = '${proposal_id}' ORDER BY no_appr`;
        let dataapprovalprogress = await request.query(sqlgetapprovalprogress);
        let approvalprogress = dataapprovalprogress[0];
    
        let budget_year = tahun;
        let active = 0;
        let companyfilter = ``;
        if(budget_year==2020){
          active = 0;
          companyfilter = `AND activity.company_id=${company_id}`
        }else{
          active = 1;
        }

        let bulanBerjalan = Number(moment().format('MM'));
    
        let sqlgetbudget = `SELECT 
        pb.proposal_budget_id,
        pb.proposal_budget_id AS budget_id,
        activity.division,
        mbch.branch_code,
        mbch.branch_desc AS branch,
        activity.activity_desc AS activity,
        pb.budget,
        activity.activity_code,
        mb.brand_code,
        mb.brand_code AS brand,
        pb.nilai_so,
        pb.bulan
        FROM proposal_budget pb
        LEFT JOIN m_activity activity ON activity.activity_code = pb.activity_id AND activity.year = '${budget_year}'
        LEFT JOIN m_branch mbch ON mbch.branch_code = pb.branch_code 
        LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code
        LEFT JOIN proposal p ON p.proposal_id = pb.proposal_id 
        WHERE pb.proposal_id = '${proposal_id}'
        AND activity.active = ${active}
        AND activity.year ='${budget_year}'
        AND pb.bulan >= ${bulanBerjalan}
        ${companyfilter}
        ORDER BY pb.bulan
        `;
    
        //GROUP BY pb.activity_id, pb.brand_code, pb.branch_code
        //console.log(sqlgetbudget);
    
        let databudget = await request.query(sqlgetbudget);
        let budget = databudget[0];
    
        let datavariant = [];
        let periode = [];
    
        let jumlah_bulan = [];
    
        for (let index = 0; index < budget.length; index++) {
          jumlah_bulan.push(budget[index].bulan);  
        }
    
        jumlah_bulan = _.uniq(jumlah_bulan);
        
    
        let bulan_arr = "";
        for (const datas of jumlah_bulan) {
          bulan_arr += ",'" + datas + "'"
        }
        bulan_arr = bulan_arr.substring(1);
    
        for (let i = 0; i < budget.length; i++) {
    
          
          let budget_id = budget[i].budget_id;
          let budget_awal = budget[i].budget;
    
    
          let sqlgettotalklaim = `SELECT COALESCE(SUM(total_klaim),0) AS total_klaim 
          FROM klaim_detail WHERE budget_id = '${budget_id}'`;
          let databudgetklaim = await request2.query(sqlgettotalklaim);
          let total_klaim = databudgetklaim.recordset.length > 0 ? databudgetklaim.recordset[0].total_klaim : 0;
    
    
          let sqlgettotalreverse = `SELECT COALESCE(SUM(reverse_amount),0) AS total_reversal 
          FROM proposal_reverse WHERE proposal_budget_id = '${budget_id}'`;
          let databudgetreverse= await request.query(sqlgettotalreverse);
          let total_reversal = databudgetreverse.length > 0 ? databudgetreverse[0][0].total_reversal : 0;
    
          let outstanding_klaim = budget_awal - total_klaim - total_reversal;
    
          //console.log(budget[i].budget);
          
          
          let activity_code = budget[i].activity_code;
          let brand_code = budget[i].brand_code;
          budget[i].division = division_code;
          budget[i].division_code = division_code;
          budget[i].total_klaim = total_klaim;
          budget[i].outstanding_klaim = outstanding_klaim;
          budget[i].jumlah_reversal = outstanding_klaim;
          budget[i].total_reversal = Number(total_reversal);
          let bulan_periode = convertBulan(budget[i].bulan);
          let bulan =  budget[i].bulan;
          budget[i].bulan = bulan_periode;
          periode.push(bulan);        
    
    
          let sqlgetbudgetactivityall = `SELECT COALESCE(SUM(budget),0) as total,m_group.group_name,m_brand.brand_desc 
          FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
          LEFT JOIN m_group ON budget.group_id = m_group.id_group 
          WHERE budget.activity_code = '${activity_code}' 
          ${companyfilter}
          AND budget.year = '${budget_year}'
          AND budget.bulan IN (${bulan_arr})
          AND budget.brand_code = '${brand_code}'`;


          //console.log(sqlgetbudgetactivityall);
          let databudgetactivityall = await request.query(sqlgetbudgetactivityall);
          let budgetactivityall = Number(databudgetactivityall[0][0].total);
    
          //console.log(sqlgetbudget);
    
    
          let sqlgetbudgetperactivityall = `SELECT COALESCE(SUM(budget),0) as total FROM proposal_budget 
          INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id 
          WHERE brand_code ='${brand_code}' AND budget_year = '${budget_year}'
          AND proposal.status_id NOT IN (99)
          ${companyfilter}
          AND proposal_budget.activity_id = '${activity_code}'
          AND proposal_budget.bulan IN (${bulan_arr})`;


          //console.log(sqlgetbudgetperactivityall);
    
    
          let databudgetperactivityall = await request.query(sqlgetbudgetperactivityall);
          let budgetperactivityall = Number(databudgetperactivityall[0][0].total);
    
          let totalBudgetActivity = budgetactivityall - budgetperactivityall;
    
    
          let sqlgetbudgetactivity = `SELECT COALESCE(SUM(budget),0) as total,m_group.group_name,m_brand.brand_desc 
          FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
          LEFT JOIN m_group ON budget.group_id = m_group.id_group 
          WHERE budget.activity_code = '${activity_code}'
          ${companyfilter}
          AND budget.year = '${budget_year}' 
          AND budget.brand_code = '${brand_code}'
          AND budget.bulan = ${bulan}`;


          //console.log(sqlgetbudgetactivity);
          let databudgetactivity = await request.query(sqlgetbudgetactivity);
          let budgetactivity = Number(databudgetactivity[0][0].total);
    
          
    
          let sqlgetbudgetperactivity = `SELECT COALESCE(SUM(budget),0) as total FROM proposal_budget 
          INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id 
          WHERE brand_code ='${brand_code}' 
          AND budget_year = '${budget_year}'
          AND proposal.status_id NOT IN (99)
          AND proposal_budget.bulan = ${bulan}
          ${companyfilter}
          AND proposal_budget.activity_id = '${activity_code}'`;

          //console.log(sqlgetbudgetperactivity);
    
          let databudgetperactivity = await request.query(sqlgetbudgetperactivity);
          let budgetperactivity = Number(databudgetperactivity[0][0].total);
    
    
          let budget_act = budgetactivity - budgetperactivity;
    
          //let budget_act = budgetactivity - totalPerActivity;
          //console.log('budget_act ',budget_act);
    
          let sqlgetbudgetbrand = `SELECT SUM(budget) as total,m_brand.brand_desc 
          FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code  
          WHERE budget.year = '${budget_year}' AND budget.brand_code = '${brand_code}'`;
    
          let databudgetbrand = await request.query(sqlgetbudgetbrand);
          let budgetbrand = Number(databudgetbrand[0][0].total);
    
    
    
          let sqlgetbudgetperbrand = `SELECT sum(budget) as total FROM proposal_budget 
          INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id
          where brand_code = '${brand_code}' AND budget_year = '${budget_year}' AND 
          proposal.status_id NOT IN(99) 
          AND proposal.budget_year='${budget_year}'
          AND proposal_budget.bulan IS NOT NULL`;
    
          //console.log(sqlgetbudgetperbrand);
    
    
          let databudgetperbrand = await request.query(sqlgetbudgetperbrand);
          let budgetperbrand = Number(databudgetperbrand[0][0].total);
          let budget_brand = budgetbrand - budgetperbrand;
    
        
          budget[i].budgetactivity = budget_act;
          budget[i].budgetbrand = budget_brand;
          budget[i].budgettoapprove = budget[i].budget;
          //budget[i].info_budget = info_budget_arr;
          budget[i].totalBudgetActivity = totalBudgetActivity;
    
          let proposal_budget_id = budget[i].proposal_budget_id;
          let sqlproposalbudgetvariant = `SELECT pbv.proposal_budget_variant_id,pbv.proposal_budget_id,pbv.proposal_id,
          pbv.variant_id,mv.variant_desc,mv.package_type,mv.brand_code,mv.jumlah_percentage
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
    
          let periode_desc = [];
          for (let i = 0; i < periode.length; i++) {
            let bulan = periode[i];
            let bulan_desc = convertBulan(bulan);
            periode_desc.push(bulan_desc);
          }
          row.periode = periode;
          row.periode_desc =_.uniq(periode_desc).toString();
    
          //console.log(row);
      
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