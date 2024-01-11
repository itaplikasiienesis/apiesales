const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require('uuid/v4');
const moment = require('moment');
const DBPROP = require("../../../services/DBPROPOSAL"); 
const _ = require('lodash');
const fs = require("fs");
const path = require('path');
const glob = require("glob");
const md5 = require('md5');
const numeral = require('numeral');

const strtotime = require('locutus/php/datetime/strtotime'); 
const mt_rand = require('locutus/php/math/mt_rand'); 
const { log } = require("locutus/php/math");
const SendEmailApproval = require('../../../services/SendEmailApproval');

const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
module.exports = {
  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: { currentPage, pageSize,employee_id,searchText}
    } = req;

    // await DBPROP;ar
    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let whereClause = ``;
      
      if (searchText) {
        whereClause = `AND ms.status_name LIKE '%${searchText}%'
        OR p.total_budget LIKE '%${searchText}%' OR p.proposal_date LIKE '%${searchText}%'
        OR p.brand_text LIKE '%${searchText}%'  OR p.doc_no LIKE '%${searchText}%'
        OR p.budget_year LIKE '%${searchText}%' OR p.title LIKE '%${searchText}%'`;
      }

      let queryCountTable = ``;
      let queryDataTable =  ``;
      
      // console.log(employee_id);
      if(employee_id){


        let sqlgetEmployee = `SELECT * FROM employee WHERE employee_id = '${employee_id}'`;
        let dataemployee = await request.query(sqlgetEmployee);
        let employeelst = dataemployee[0];
        let employee = employeelst.length > 0 ? employeelst[0].name : null;

        if(employeelst.length > 0){

          queryDataTable = `SELECT p.proposal_id,ms.status_name AS status,p.total_budget AS budget,
          DATE_FORMAT(p.proposal_date, "%Y-%m-%d") AS documentdate,
          p.brand_text AS brand,p.doc_no AS documentno,p.budget_year AS period,p.title AS name,p.status_id,
          p.start_date,p.end_date,p.biaya_po 
          FROM proposal p LEFT JOIN m_status ms ON p.status_id = ms.status_id  
          WHERE p.created_by='${employee}' ${whereClause}
          ORDER BY p.created_date DESC  limit ${offset},${limit}`;


          queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM proposal p LEFT JOIN m_status ms ON p.status_id = ms.status_id WHERE created_by='${employee}' ${whereClause}`;
                            
        }else{
          
          queryDataTable = `SELECT p.proposal_id,ms.status_name AS status,p.total_budget AS budget,
          DATE_FORMAT(p.proposal_date, "%Y-%m-%d") AS documentdate,
          p.brand_text AS brand,p.doc_no AS documentno,p.budget_year AS period,p.title AS name,p.status_id,
          p.start_date,p.end_date,p.biaya_po 
          FROM proposal p LEFT JOIN m_status ms ON p.status_id = ms.status_id  
          WHERE 1=1 ${whereClause} ORDER BY p.created_date DESC  limit ${offset},${limit}`;
          
          queryCountTable = `SELECT COUNT(1) AS total_rows
          FROM proposal p LEFT JOIN m_status ms ON p.status_id = ms.status_id WHERE 1=1 ${whereClause}`;

        }



      }else{

        queryDataTable = `SELECT p.proposal_id,ms.status_name AS status,p.total_budget AS budget,
        DATE_FORMAT(p.proposal_date, "%Y-%m-%d") AS documentdate,
        p.brand_text AS brand,p.doc_no AS documentno,p.budget_year AS period,p.title AS name,p.status_id,
        p.start_date,p.end_date,p.biaya_po
        FROM proposal p LEFT JOIN m_status ms ON p.status_id = ms.status_id  
        WHERE 1=1 ${whereClause}
        ORDER BY p.created_date DESC limit ${offset},${limit}`;

        queryCountTable = `SELECT COUNT(1) AS total_rows
        FROM proposal p LEFT JOIN m_status ms ON p.status_id = ms.status_id WHERE 1=1 ${whereClause}`;

      }                      


       console.log(queryDataTable);
      // console.log(queryCountTable);
      let result = await request.query(queryCountTable);
      const count = result[0][0].total_rows;
      let [rows, fields] = await request.query(queryDataTable);

      const meta = paginate(currentPage, count, rows, pageSize);

      for (let i = 0; i < rows.length; i++) {
        
          rows[i].no = i+1;
          let documentdate = rows[i].documentdate;
          if(rows[i].documentno=='041105/MI/MT/DEC/2021'){
            console.log(rows[i].documentno);
            console.log(documentdate);      
          }

      }

      return res.success({
            result: rows,
            meta,
            message: "Fetch data successfully"
          });
      
    } catch (err) {
      return res.error(err);
    }
  },

  findOne: async function(req, res) {
    await DB.poolConnect;
    try {

      console.log('AKU TELAH MENDUGA');
      const request2 = DB.pool.request();
      const request = await DBPROP.promise();
      const {
        query: {m_user_id,employee_id }
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
      LEFT JOIN m_division mdv ON mdv.division_code = p.division_code AND mdv.company_id = 3
      WHERE p.proposal_id = '${req.param(
        "id"
      )}'`;

      //console.log(queryDataTable);    
      let [rows, fields] = await request.query(queryDataTable);
    
      let row = rows[0];
      let tahun = row.budget_year;
      //console.log(tahun);

      let company_id = row.company_id;
      //console.log(company_id);
      let division_code = row.division_code;
      row.mechanism = row.mechanism.replace('*\r','');

      let sqlgetexecutor = `SELECT * FROM proposal_executor LEFT JOIN employee ON proposal_executor.employee_id = employee.id WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let dataexecutor = await request.query(sqlgetexecutor);
      let executor = dataexecutor[0];

      let sqlgetdistributor = `SELECT *,nama_distributor AS name FROM proposal_distributor LEFT JOIN distributor ON proposal_distributor.distributor_id = distributor.distributor_id WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let datadistributor = await request.query(sqlgetdistributor);
      let distributor = datadistributor[0];

      let sqlgetemaildistributor = `SELECT * FROM proposal_email_distributor WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let dataemaildistributor = await request.query(sqlgetemaildistributor);
      let emaildistributor = dataemaildistributor[0];
      
      let emaildist = emaildistributor.map(function (item) {
          return item['email_distributor'];
      });
            
      let sqlgetmarkettype= `SELECT pm.proposal_market_id,mmt.* FROM proposal_market pm 
      LEFT JOIN m_market_type mmt ON(pm.market_type_id = mmt.market_type_code)
      WHERE pm.proposal_id = '${req.param(
        "id"
      )}'`;

      let datamarketype = await request.query(sqlgetmarkettype);
      let markettype = datamarketype[0];

      


      let sqlgetapprovalprogress = `SELECT * FROM v_appr_history WHERE proposal_id = '${req.param(
        "id"
      )}' ORDER BY no_appr`;
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
      pb.bulan,
      p.status_id
      FROM proposal_budget pb
      LEFT JOIN m_activity activity ON activity.activity_code = pb.activity_id AND activity.year = '${budget_year}'
      LEFT JOIN m_branch mbch ON mbch.branch_code = pb.branch_code 
      LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code
      LEFT JOIN proposal p ON p.proposal_id = pb.proposal_id 
      WHERE pb.proposal_id = '${req.param(
        "id"
      )}'
      AND activity.active = ${active}
      AND activity.year ='${budget_year}'
      ${companyfilter}
      ORDER BY pb.bulan
      `;
      console.log("cek query 1", sqlgetbudget);

      //GROUP BY pb.activity_id, pb.brand_code, pb.branch_code
      //console.log(sqlgetbudget);

      let databudget = await request.query(sqlgetbudget);
      let budget = databudget[0];
      // console.log("CEK BUDGET : ",budget);

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

      let listReverse = [];
      for (let i = 0; i < budget.length; i++) {

        let total_klaim = 0;
        let outstanding_klaim = 0;
        let total_reversal = 0;
        let budget_id = budget[i].budget_id;
        let budget_awal = budget[i].budget;
        if(budget[i].status_id==30){

          // PROSES CHECK NILAI KLAIM

          // let sqlGetKlaim = `SELECT COALESCE(SUM(kd.total_klaim),0) AS totalKlaim 
          // FROM klaim_detail kd,klaim k 
          // WHERE kd.budget_id = '${budget_id}'
          // AND k.klaim_id = kd.klaim_id
          // AND k.kode_status <> 'RJF'`;'
          let sqlGetKlaim = `select sum(amount) as totalKlaim from eprop_klaim_po ekp where budget_id = '${budget_id}' and isreject != 'Y'`;
          let getDataKlaim= await request2.query(sqlGetKlaim);
          total_klaim = getDataKlaim.recordset.length > 0 ? getDataKlaim.recordset[0].totalKlaim : 0;
          
          
          let sqlgettotalreverse = `SELECT COALESCE(SUM(reverse_amount),0) AS total_reversal 
          FROM proposal_reverse WHERE proposal_budget_id = '${budget_id}'`;
          let databudgetreverse= await request.query(sqlgettotalreverse);
          total_reversal = databudgetreverse.length > 0 ? Number(databudgetreverse[0][0].total_reversal) : 0;
          outstanding_klaim = budget_awal - total_klaim - total_reversal;


          let sqlgetdatareverse = `SELECT * FROM proposal_reverse WHERE proposal_budget_id = '${budget_id}'`;
          let getdatareverse = await request.query(sqlgetdatareverse);
          let datareverse = getdatareverse[0][0];

          if(datareverse){
            listReverse.push(datareverse);
          }

        }

        
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


        // console.log("LOKITT  ",sqlgetbudgetactivityall);
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
        

        let sqlCekReversal = ` SELECT COALESCE(SUM(pr.reverse_amount),0) AS reverse_amount 
        FROM proposal_budget pb,proposal_reverse pr,proposal p 
        WHERE pb.proposal_budget_id = pr.proposal_budget_id
        AND pb.brand_code = '${brand_code}'
        AND pb.activity_id = '${activity_code}'
        AND p.proposal_id = pb.proposal_id
        AND pb.bulan is not null
        AND p.status_id <> 99
        AND p.budget_year = ${budget_year}
        AND pb.bulan = ${bulan}`;

        console.log(sqlCekReversal);

        
        let getdataReversal = await request.query(sqlCekReversal);
        let reversalAmount = getdataReversal[0][0].reverse_amount;


        console.log('reversalAmount ',reversalAmount);


        let databudgetperactivityall = await request.query(sqlgetbudgetperactivityall);
        let budgetperactivityall = Number(databudgetperactivityall[0][0].total);

        let totalBudgetActivity = budgetactivityall - (budgetperactivityall - reversalAmount);


        let sqlgetbudgetactivity = `SELECT COALESCE(SUM(budget),0) as total,m_group.group_name,m_brand.brand_desc 
        FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
        LEFT JOIN m_group ON budget.group_id = m_group.id_group 
        WHERE budget.activity_code = '${activity_code}'
        ${companyfilter}
        AND budget.year = '${budget_year}' 
        AND budget.brand_code = '${brand_code}'
        AND budget.bulan = ${bulan}`;
    
        // console.log("qw 2",sqlgetbudgetactivity);
        let databudgetactivity = await request.query(sqlgetbudgetactivity);
        let budgetactivity = Number(databudgetactivity[0][0].total);
        //console.log("budgetactivity : ".budgetactivity);

        

        let sqlgetbudgetperactivity = `SELECT COALESCE(SUM(budget),0) as total FROM proposal_budget 
        INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id 
        WHERE brand_code ='${brand_code}' 
        AND budget_year = '${budget_year}'
        AND proposal.status_id NOT IN (99)
        AND proposal_budget.bulan = ${bulan}
        ${companyfilter}
        AND proposal_budget.activity_id = '${activity_code}'`;


        let databudgetperactivity = await request.query(sqlgetbudgetperactivity);
        let budgetperactivity = Number(databudgetperactivity[0][0].total);


        let budget_act = budgetactivity - budgetperactivity;

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
      WHERE pbv.proposal_id = '${req.param(
        "id"
      )}'`;



      let datasku= await request.query(sqlgetsku);
      let sku = datasku[0];
       
    //   let sku = _.uniqBy(datavariant,"variant_id");

      let sqlgethistory = `SELECT * FROM v_history WHERE proposal_id = '${req.param(
        "id"
      )}' ORDER BY created_date DESC`;

      let datahistory = await request.query(sqlgethistory);
      let history = datahistory[0];

      let sqlgetfile = `SELECT proposal_file_id AS uid,file AS name,'done' AS status FROM proposal_file WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      
      let sqlgetStatusApprovalByEmployeeId = `SELECT status_approval_id,proposal_approval_id FROM proposal_approval WHERE proposal_id = '${req.param(
        "id"
      )}' AND employee_id = '${employee_id}'`;
      
      let status_approval_id = undefined;
      let proposal_approval_id = undefined;
      if(employee_id){

        let dataapprovalemployee = await request.query(sqlgetStatusApprovalByEmployeeId);
        let approvalemployee = dataapprovalemployee[0];
        status_approval_id = approvalemployee.length > 0 ? approvalemployee[0].status_approval_id : 0;
        proposal_approval_id = approvalemployee.length > 0 ? approvalemployee[0].proposal_approval_id : null;
      }


      row.status_approval_id = status_approval_id;
      row.proposal_approval_id = proposal_approval_id;


      for (let i = 0; i < listReverse.length; i++) {


        let datainfobudget =  budget.find(e => e.proposal_budget_id == listReverse[i].proposal_budget_id);
        // console.log("LIST ISIAN datainfobudget ",datainfobudget);

        let branch_code = datainfobudget.branch_code;
        let branch = datainfobudget.branch;
        let activity = datainfobudget.activity;
        let activity_code = datainfobudget.activity_code;
        let brand_code = datainfobudget.brand_code;
        let brand = datainfobudget.brand;


        listReverse[i].branch_code = branch_code;
        listReverse[i].branch = branch;
        listReverse[i].activity = activity;
        listReverse[i].activity_code = activity_code;
        listReverse[i].brand_code = brand_code;
        listReverse[i].brand = brand;
        
      }

      row.listReverse = listReverse;
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


    } catch (err) {
      return res.error(err);
    }
  },
  create: async function (req, res) {
    const {
      budget_year,user_id,title,region_id,
      division_code,mechanism,kpi,objective,
      total_budget,status_id,sales_target,avg_sales,
      start_date,end_date,background,created_by,
      executor,emaildistributor,budget,markettype,distributor,file,
      referensi_no, old_proposal_id,reference_proposal,biaya_po,nik
    } = JSON.parse(req.body.document);  //di bungkus dalam key document seperti biasa ya yas 
    let fileList = [] // nanti list file yg di upload akan ada di dalam variable ini
    const request2 = DB.pool.request();
    const request = await DBPROP.promise();
    //console.log(JSON.parse(req.body.document));
    let proposal_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);

    // PROSES CEK APAKAH PROPOSAL ID SUDAH ADA ATAU BELUM MENGHINDARI DUPLIKAT DATA
    let sqlgetCekDataProposalId = `SELECT COUNT(1) AS jumlah_data FROM proposal WHERE proposal_id = ${proposal_id}`;
    let dataProposalId = await request.query(sqlgetCekDataProposalId);
    let jumlah_data = dataProposalId[0][0].jumlah_data;


    console.log('division_code ',division_code);
    console.log('budget_year ',budget_year);

    // if((division_code!=='MM' || division_code!=='PR') && budget_year=='2022'){

    //     return res.error({
    //       message: `Budget Year tidak valid`
    //     });
    
    // }else{
    
      if(jumlah_data == 0){


        // console.log('proposal_id ',proposal_id);
        const generatedID = proposal_id; //variable genereatedID dipakai untuk sub folder file tersimpan
        //console.log(status_id);
        var uploadFile = req.file("file");
          uploadFile.upload({maxBytes: 500000000000000},
            async function onUploadComplete(err, files) {
              if (err) {
                let errMsg = err.message
                return res.error(errMsg)
              }
              //console.log('files', files)
              let noFile = 0
              for (const file of files) {
                noFile++
                //isi variable fileList dengan file yg di upload user
                fileList.push({
                      uid: noFile,
                      name: file.filename,
                      status: 'done',
                      url: ''
                })
                //console.log('filename', file.filename) 
                fs.mkdirSync(dokumentPath('dokumenproposal', generatedID), {
                  recursive: true
                })
                const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( 'dokumenproposal', generatedID), file.filename) + '*')
                if (filesamaDir.found.length > 0) {
                    //console.log('isexist file nama sama', filesamaDir.found[0])
                    fs.unlinkSync(filesamaDir.found[0])
                }
                fs.renameSync(file.fd, path.resolve(dokumentPath( 'dokumenproposal', generatedID), file.filename))
              } 

              
              //Proses Copy File pada saat Proses "Copy / Copy Revisi" berlangsung
              //console.log('old_proposal_id', old_proposal_id)
              if (old_proposal_id) {
                const existingFiles = file.filter(x => x.status === 'done')
                for (const objectExistingFile of existingFiles) { 
                  const existingFile = objectExistingFile.name
                  noFile++
                  //isi variable fileList dengan file yg di upload user
                  fileList.push({
                        uid: noFile,
                        name: existingFile,
                        status: 'done',
                        url: ''
                  })
                  //console.log('existingFile', existingFile)
                  const sourceFileToCopy = path.resolve(dokumentPath( 'dokumenproposal', old_proposal_id), existingFile);
                  
                  //buat dirBaru
                  try {
                    fs.mkdirSync(dokumentPath('dokumenproposal', generatedID), {
                      recursive: true
                    })
                  } catch(e) {
                    console.log('abaikan sudah ada');
                  }
                  const destinasiFileBaru = path.resolve(dokumentPath('dokumenproposal', generatedID), existingFile)
                  //delete dlu takut udah ada file nya
                  try {
                    fs.unlinkSync(destinasiFileBaru)
                  } catch(e) {
                    console.log('file ga ada');
                  }

                  //copy file dari origin source ke destination source
                  try {
                    // console.log('zzz', sourceFileToCopy, destinasiFileBaru)
                    fs.copyFileSync(sourceFileToCopy, destinasiFileBaru)
                  } catch(e) {                
                    //ternyata sourceFileToCopy tidak ditemukan, masuk Logic ke dua, dimana kita ambil file dari dir files
                    try {
                      const sourceFileToCopy2 = path.resolve(dokumentPath( 'dokumenproposal', 'files'), existingFile);
                      fs.copyFileSync(sourceFileToCopy2, destinasiFileBaru)
                    } catch(ex) {
                      return res.error({
                        message: 'File yang akan di copy tidak di temukan di sumber aslinya !'
                      });
                    }

                  } 
                }
              }
              
              //console.log('fileList : ', fileList.length);
              //Logic DB
              try {
        
                let brandplossa = false;

                let branchcode = budget.map(function (item) {
                  return item['branch_code'];
                });

                let brandcode = budget.map(function (item) {
                if(item['brand_code']=='PLOSS'){
                      brandplossa = true
                }
                  return item['brand_code'];
                });

                let distributorid = distributor.map(function (item) {
                    return item['distributor_id'];
                });

              
                let valueIN = "";
                for (const datas of brandcode) {
                    valueIN += ",'" + datas + "'"
                }
                              
                valueIN = valueIN.substring(1);

                let errMessage = [];
                let is_referensi = 0;

                //console.log(budget);

                let activity_code = budget.map(function (item) {
                  return item['activity_code'];
                });



                activity_code = _.uniq(activity_code);

                let approval = [];
                for(i = 0 ; i < activity_code.length ; i++){
                  
                  let sqlgetWorkFlowPerActivity = `SELECT * FROM workflow where division = '${division_code}' AND activity LIKE ('%${activity_code[i]}%')`;
                  let dataapproval = await request.query(sqlgetWorkFlowPerActivity);
                  let approvallist = dataapproval[0];
                  approval.push(approvallist[0]);
                  
                }
                approval = _.uniqBy(approval,'workflow_id');
                
                let workflow_correction = [];
                for (let i = 0; i < approval.length; i++) {
                  if(!approval[i]){
                    workflow_correction.push(i);
                  }
                }

                if(approval.length==1 && workflow_correction.length==0){

                    let workflow_id = approval.length > 0 && status_id!=0 ? `'${approval[0].workflow_id}'` : `NULL`;
      
                    let sqlgetlastNumber = `SELECT SUBSTRING(doc_no,1,6) + 1 as last_number
                    from proposal ORDER BY created_date DESC LIMIT 1`;
                    let datalastnumber = await request.query(sqlgetlastNumber);
                    let lastnumber = datalastnumber[0][0].last_number;
              
                    
                    if( lastnumber=='' ||  !lastnumber) {
                      lastnumber = "000001";
                    } else {
                      lastnumber = lastnumber.toString();
                      if( lastnumber.toString().length == 1){
                        lastnumber = "00000".concat(lastnumber);
                      }else if( lastnumber.toString().length == 2){
                        lastnumber = "0000".concat(lastnumber);
                      } else if( lastnumber.length == 3){
                        lastnumber = "000".concat(lastnumber);
                      } else if( lastnumber.length == 4){
                        lastnumber = "00".concat(lastnumber);
                      } else if( lastnumber.length == 5){
                        lastnumber = "0".concat(lastnumber);
              
                      }
                  
                    }

              
                    let companyForDoc = ``;
                    let company_id = ``;
              
                    if(brandplossa){
                      
                      //companyForDoc = 'SEI';
                      let sqlgetCompanyFordoc = `SELECT mc.company_code FROM m_brand
                      JOIN m_company mc ON mc.company_id = m_brand.company_id
                      WHERE brand_code IN (${valueIN}) 
                      GROUP BY m_brand.company_id`;
                      let dataCompanyFordoc = await request.query(sqlgetCompanyFordoc);
                      companyForDoc = dataCompanyFordoc[0][0].company_code;
                
                    }else{
                      let sqlgetCompanyFordoc = `SELECT mc.company_code,mc.company_id FROM m_brand
                      JOIN m_company mc ON mc.company_id = m_brand.company_id
                      WHERE brand_code IN (${valueIN}) 
                      GROUP BY m_brand.company_id`;
                      let dataCompanyFordoc = await request.query(sqlgetCompanyFordoc);
                      companyForDoc = dataCompanyFordoc[0][0].company_code;
                      company_id = dataCompanyFordoc[0][0].company_id;
                    }
              
              
                    let sqlgetCompanycodes = `SELECT mc.company_code FROM m_brand
                    JOIN m_company mc ON mc.company_id = m_brand.company_id
                    WHERE brand_code IN(${valueIN})
                    GROUP BY m_brand.company_id`;
                    let dataCompanyCodes = await request.query(sqlgetCompanycodes);
                    let CompanyCodes = dataCompanyCodes[0][0].company_code;
                
                
                    let brandtext = budget.map(function (item) {
                      return item['brand_code'];
                    });;

                    let uniqbrand = _.uniq(brandtext);

                    // let regiontext = region.map(function (item) {
                    //   return item['region_id'];
                    // });;
                

                    // let uniqregion = _.uniq(regiontext);

                    let uniqregion = region_id;
                    //console.log(sqlgetCompanyFordoc);
                
                    let proposaldate = moment().format('YYYY-MM-DD');
                    let monthproposal = moment().format('MMM').toUpperCase();
                    let documentno = lastnumber+'/'+companyForDoc+'/'+division_code+'/'+monthproposal+'/'+budget_year;
      
                    let totaltarget = 0;
      
                    let startdate = moment(start_date,'YYYY-MM-DD').format('YYYY-MM-DD');
                    let enddate = moment(end_date,'YYYY-MM-DD').format('YYYY-MM-DD');
                

                    let reference_number = `NULL`;
                    if(referensi_no){
                      reference_number = `'${referensi_no}'`;
                    }

                    let reference_proposal_text = `NULL`;
                    if(reference_proposal){
                      reference_proposal_text = `'${reference_proposal}'`;
                    }


                    let biaya_po_text = `'TIDAK'`;
                    if(biaya_po){
                      biaya_po_text = `'${biaya_po}'`;
                    }

                    
                    

                    let status_id_baru = 0
                    if(status_id== 0 ){
                      status_id_baru = 0;
                    }else if(status_id == 10){
                      status_id_baru = 10;
                    }else{
                      status_id_baru = 10;
                    }

                    let companyfilter = ``;
                    let active = 0;
                    if(budget_year==2020){
                      active = 0;
                      companyfilter = `AND activity.company_id='${company_id}'`

                    }else{
                      active = 1;
                    }

                    //console.log('status_id ',status_id_baru);

                    let sqlgetnameCreated = `SELECT name FROM employee WHERE employee_id='${created_by}'`;

                    let datanamecreated = await request.query(sqlgetnameCreated);
                    let datanamecreatedlist = datanamecreated[0];
                    let namecreated = datanamecreatedlist.length > 0 ? datanamecreatedlist[0].name : created_by;


                    let backround_text = background;
                    let kpi_text = kpi;
                    let mechanism_text = mechanism;
                    let objective_text = objective;
                    let title_text = title;

                    // backround_text = backround_text.replace(/'/g,`''`).replace(/,/g,`,,`).replace(/"/g,`""`).replace(/\\/g,`\\`);
                    // kpi_text = kpi_text.replace(/'/g,`''`).replace(/,/g,`,,`).replace(/"/g,`""`).replace(/\\/g,`\\`);
                    // mechanism_text = mechanism_text.replace(/'/g,`''`).replace(/,/g,`,,`).replace(/"/g,`""`).replace(/\\/g,`\\`);
                    // objective_text = objective_text.replace(/'/g,`''`).replace(/,/g,`,,`).replace(/"/g,`""`).replace(/\\/g,`\\`);
                    // let totalbudget = total_budget.toString().replace(/'/g,``);


                    backround_text = backround_text.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`);
                    kpi_text = kpi_text.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`);
                    mechanism_text = mechanism_text.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`);
                    objective_text = objective_text.replace(/'/g,`''`).replace(/"/g,`""`).replace(/\\/g,`\\`);
                    title_text = title_text.replace(/'/g,`''`).replace(/"/g,`"`).replace(/\\/g,`\\`);
                    let totalbudget = total_budget.toString().replace(/'/g,``);




                    let sqlInsertProposal = `INSERT INTO proposal
                    (proposal_id, budget_year, doc_no, title, proposal_date, company_code, division_code, month_proposal, user_id, 
                    region_id,brand_text, total_budget, total_target, sales_target, avg_sales, workflow_id, status_id, 
                    mechanism, kpi, objective, background, is_referensi , created_by, start_date, end_date, created_date, 
                    updated_by, updated_date,referensi_no,reference_proposal,biaya_po)
                    VALUES(${proposal_id}, ${budget_year}, '${documentno}', 
                    '${title_text}', '${proposaldate}', '${CompanyCodes}', '${division_code}', '${monthproposal}', '${user_id}', 
                    '${uniqregion}', '${uniqbrand}', ${Number(totalbudget)},${totaltarget}, ${sales_target}, ${avg_sales}, 
                    ${workflow_id}, '${status_id_baru}', '${mechanism_text}', 
                    '${kpi_text}', '${objective_text}', 
                    '${backround_text}', ${is_referensi}, '${namecreated}', '${startdate}', '${enddate}', 
                    now(), '${namecreated}', now(),${reference_number},${reference_proposal_text},${biaya_po_text})`;
                            
                    // console.log('sampe sini',sqlInsertProposal);

                    await request.query(sqlInsertProposal);
                      
                
                      let email = emaildistributor;
                      let insertEmailDistributor = `INSERT INTO proposal_email_distributor
                      (proposal_id, email_distributor, created_by, created_date)
                      VALUES(${proposal_id},'${email}','${created_by}',now())`;
                      await request.query(insertEmailDistributor);
                      //console.log(insertEmailDistributor);
                
                
                        for (let i = 0; i < executor.length; i++) {
                          
                          let employee_id = executor[i].id;
                          let proposal_executor_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                          let insertProposalExecutor = `INSERT INTO proposal_executor
                          (proposal_executor_id, proposal_id, employee_id, created_by, created_date, updated_by, updated_date)
                          VALUES(${proposal_executor_id}, ${proposal_id},${employee_id},'${created_by}',now(),'${created_by}',now())`;
                          await request.query(insertProposalExecutor);
                          //console.log(insertEmailDistributor);
                          
                        }
                
                
                        let proposal_branch = _.uniqBy(budget,'branch_code');
                        for (let i = 0; i < proposal_branch.length; i++) {
                          
                          let branch_code = proposal_branch[i].branch_code;
                          let sqlgetbranddesc = `SELECT * FROM m_branch WHERE branch_code='${branch_code}'`;
                          let databranch = await request.query(sqlgetbranddesc);
                          let branch = databranch[0][0];
                          let branch_desc = branch.branch_desc;
                          let proposal_branch_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                          let insertProposalBranch = `INSERT INTO proposal_branch
                          (proposal_branch_id, proposal_id, branch_code,branch_desc, created_by, created_date, updated_by, updated_date)
                          VALUES(${proposal_branch_id}, ${proposal_id}, '${branch_code}','${branch_desc}', '${created_by}',now(),'${created_by}',now())`;
                          await request.query(insertProposalBranch);
                          //console.log(insertProposalBranch);
                
                        }
                
                
                        let proposal_activity = _.uniqBy(budget,'activity_code');
                        for (let i = 0; i < proposal_activity.length; i++) {
                          
                          let activity_code = proposal_activity[i].activity_code;
                          let proposal_activity_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                          let insertProposalActivity = `INSERT INTO proposal_activity
                          (proposal_activity_id, proposal_id, activity_id, created_by, created_date, updated_by, updated_date)
                          VALUES(${proposal_activity_id}, ${proposal_id}, '${activity_code}', '${created_by}',now(),'${created_by}',now())`;
                          await request.query(insertProposalActivity);
                          //console.log(insertProposalActivity);
                
                        }
                
                
                        for (let i = 0; i < markettype.length; i++) {
                
                          let market_type_id = markettype[i].market_type_code;
                          let proposal_market_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                          let insertProposalMarket = `INSERT INTO proposal_market
                          (proposal_market_id, proposal_id, market_type_id, created_by, created_date, updated_by, updated_date)
                          VALUES(${proposal_market_id}, ${proposal_id}, '${market_type_id}', '${created_by}',now(),'${created_by}',now())`;
                          await request.query(insertProposalMarket);
                          //console.log(insertProposalMarket);
                
                
                        }
                
                
                        let datavariant = [];
                
                        for (let i = 0; i < budget.length; i++) {
                
                          for (let j = 0; j < budget[i].variant.length; j++) {
                              
                              let data = {
                                variant_id:budget[i].variant[j].variant_id
                              }
                
                              datavariant.push(data);
                            
                          
                          }
                        }
                
                        let proposal_variant = _.uniqBy(datavariant,'variant_id');
                        for (let i = 0; i < proposal_variant.length; i++) {
                
                          let variant_id = proposal_variant[i].variant_id;
                          let proposal_variant_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                          let insertProposalVariant = `INSERT INTO proposal_variant
                          (proposal_variant_id,proposal_id, variant_id, created_by, created_date, updated_by, updated_date)
                          VALUES(${proposal_variant_id}, ${proposal_id}, ${variant_id}, '${created_by}',now(),'${created_by}',now())`;
                          await request.query(insertProposalVariant);
                
                        }
                
                        for (let i = 0; i < distributor.length; i++) {
                
                          let distributor_id = distributor[i].distributor_id;
                          let proposal_distributor_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                          let insertProposalDistributor = `INSERT INTO proposal_distributor
                          (proposal_distributor_id, proposal_id, distributor_id, created_by, created_date, updated_by, updated_date)
                          VALUES(${proposal_distributor_id}, ${proposal_id}, ${distributor_id},'${created_by}',now(),'${created_by}',now())`;
                          //console.log(insertProposalDistributor);
                          await request.query(insertProposalDistributor);
                
                
                        }
                
                        for (let i = 0; i < budget.length; i++) {
                
                          let proposal_budget_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                          let activity_id = budget[i].activity_code;
                          let branch_code = budget[i].branch_code;
                          let brand_code = budget[i].brand_code;
                          let totalbudget = budget[i].budgettoapprove;
                          let nilaiso = budget[i].nilai_so ? budget[i].nilai_so : 0 ;
                          let bulan = deConvertBulan(budget[i].bulan);
                          
                          let insertProposalBudget = `INSERT INTO proposal_budget
                          (proposal_budget_id, proposal_id, activity_id, branch_code, 
                          brand_code, budget, 
                          created_by, created_date, updated_by, updated_date,nilai_so,bulan)
                          VALUES(${proposal_budget_id}, ${proposal_id}, '${activity_id}','${branch_code}', 
                          '${brand_code}',${totalbudget}, 
                          '${created_by}',now(),'${created_by}',now(),${nilaiso},${bulan})`;
                          // console.log(insertProposalBudget);
                          await request.query(insertProposalBudget);
                          for (let j = 0; j < budget[i].variant.length; j++) {
                            
                          
                            let variant_id = budget[i].variant[j].variant_id;
                            let proposal_budget_variant_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                            let insertProposalBudgetVariant = `INSERT INTO proposal_budget_variant
                            (proposal_budget_variant_id, proposal_budget_id, proposal_id, variant_id, created_by, created_date, updated_by, updated_date)
                            VALUES(${proposal_budget_variant_id}, ${proposal_budget_id}, ${proposal_id}, '${variant_id}','${created_by}',now(),'${created_by}',now())`;
                            await request.query(insertProposalBudgetVariant);
                            
                          }            
                
                        }
                        
                        let sqlgetbudgetgroup = `SELECT COALESCE(SUM(budget),0) as total,proposal_budget.brand_code,brand_desc,activity_code,activity_desc,group_id,bulan
                        FROM proposal_budget LEFT JOIN m_activity activity ON proposal_budget.activity_id = activity.activity_code AND activity.active=1 AND activity.year = '${budget_year}'
                        LEFT JOIN m_brand ON proposal_budget.brand_code = m_brand.brand_code WHERE proposal_id = '${proposal_id}' 
                        GROUP BY proposal_budget.brand_code,activity.group_id,bulan`;
                
                        let dataapprovalbudgetgroup = await request.query(sqlgetbudgetgroup);
                        let budgetgroup = dataapprovalbudgetgroup[0];
                
                        for (let i = 0; i < budgetgroup.length; i++) {
                          
                            let diajukan = budgetgroup[i].total;
                            let brand_code = budgetgroup[i].brand_code;
                            let activity_code = budgetgroup[i].activity_code;
                            let bulan = budgetgroup[i].bulan;
                            //let porsibudget = diajukan / bulan_array.length;
                
                            let sqlgetbudgetactivity = `SELECT COALESCE(SUM(budget),0) as total,m_group.group_name,m_brand.brand_desc 
                            FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
                            LEFT JOIN m_group ON budget.group_id = m_group.id_group 
                            WHERE budget.activity_code = '${activity_code}'
                            ${companyfilter}
                            AND budget.year = '${budget_year}' 
                            AND budget.brand_code = '${brand_code}'
                            AND budget.bulan = ${bulan}`;

                            //console.log(sqlgetbudgetactivity);
                            let databudgetactivitys = await request.query(sqlgetbudgetactivity);
                            let budgetactivity = Number(databudgetactivitys[0][0].total);
                

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

                            //console.log('budgetactivity ',budgetactivity);
                            //console.log('budgetperactivity ',budgetperactivity);
                
                            let budgettersedia = (budgetactivity - budgetperactivity) + Number(diajukan);
                            let rasio = (budgetactivity - budgetperactivity);

                            // console.log('budgettersedia ',budgettersedia);
                            // console.log('rasio ',rasio);
                
                            if( rasio < 0 ) {
                
                              let strDiajukan = numeral(diajukan).format('0,0');
                              let strBudgetActivity = numeral(budgettersedia).format('0,0');
                              let bulan_desc = convertBulan(bulan);
                              errMessage.push(`Jumlah Budget yang diajukan (${strDiajukan}) pada brand ${brand_code} dengan Activity ${activity_code} pada periode ${bulan_desc} melebihi nilai budget yang tersedia (${strBudgetActivity}) cek budget activity terlebih dahulu`);               

                            
                            }
                          
                        }


                        
      
                        for (let i = 0; i < fileList.length; i++) {
      
                          //let file = fileList[i].name;
                          //let file = fileList[i].name.replace(/'/g,`''`)
                          // let file = fileList[i].name.replace(/'/g,`''`).replace(/,/g,`,,`);
                          let file = fileList[i].name.replace(/'/g,`''`);
                          let sqlInsertProposalFile = `INSERT INTO proposal_file
                          (proposal_id, file, created_by, created_date, updated_by, updated_date)
                          VALUES(${proposal_id}, '${file}','${created_by}',now(),'${created_by}',now())`;
      
                          // console.log(sqlInsertProposalFile);
                          await request.query(sqlInsertProposalFile);
                
                        }

                        // console.log(errMessage);
              
                        if(errMessage.length > 0 ){
              
                          await request.query(`DELETE FROM proposal WHERE proposal_id='${proposal_id}'`);
                          await request.query(`DELETE FROM proposal_email_distributor WHERE proposal_id='${proposal_id}'`);
                          await request.query(`DELETE FROM proposal_executor WHERE proposal_id='${proposal_id}'`);
                          await request.query(`DELETE FROM proposal_branch WHERE proposal_id='${proposal_id}'`);
                          await request.query(`DELETE FROM proposal_activity WHERE proposal_id='${proposal_id}'`);
                          await request.query(`DELETE FROM proposal_market WHERE proposal_id='${proposal_id}'`);
                          await request.query(`DELETE FROM proposal_variant WHERE proposal_id='${proposal_id}'`);
                          await request.query(`DELETE FROM proposal_distributor WHERE proposal_id='${proposal_id}'`);
                          await request.query(`DELETE FROM proposal_budget WHERE proposal_id='${proposal_id}'`);
                          await request.query(`DELETE FROM proposal_file WHERE proposal_id='${proposal_id}'`);
        
                          return res.error({
                            message: errMessage.toString()
                          });
                        }else{
        
                          if(status_id_baru==10){
        
                              let brandcode_arr = "";
                              for (const datas of brandcode) {
                                brandcode_arr += ",'" + datas + "'"
                              }
                              brandcode_arr = brandcode_arr.substring(1);

                              let branchcode_arr = "";
                              for (const datas of branchcode) {
                                branchcode_arr += ",'" + datas + "'"
                              }
                              branchcode_arr = branchcode_arr.substring(1);

                              

                              // let regioncode_arr = "";
                              // for (const datas of regiontext) {
                              //   regioncode_arr += ",'" + datas + "'"
                              // }
                              // regioncode_arr = regioncode_arr.substring(1);

                              let distributor_arr = "";
                              for (const datas of distributorid) {
                                distributor_arr += ",'" + datas + "'"
                              }
                              distributor_arr = distributor_arr.substring(1);
        
                              let sqlgetWorkflow = `SELECT * FROM v_workflow_position WHERE workflow_id = ${workflow_id} AND ${total_budget} > min_limit AND active = 1 ORDER BY no_appr ASC`;
                              //console.log(sqlgetWorkflow);
                              let dataworkflow = await request.query(sqlgetWorkflow);
                          
                              let workflow = dataworkflow[0];
                              let employee = [];
                              for (let i = 0; i < workflow.length; i++) {

                                let urutkan = i + 1;
                          
                                let type_result = workflow[i].type_result;
                                let no_appr = urutkan;
                                let position_appr = workflow[i].position_desc;
                                let query = workflow[i].query;
                                let script = workflow[i].script;


                                //branch_code:branch_code,

                                
                                if(type_result==='QUERY' && query){
                                  //console.log('masuk sini dong',i);
                                  let position = workflow[i].position_desc;
                                  let replaceParam = {
                                    brandcode_arr: brandcode_arr,
                                    branchcode_arr:branchcode_arr,
                                    division_code:division_code,
                                    distributor_arr:distributor_arr,
                                    position:`'${position}'`,
                                    region_id:region_id
                                  }

                                  //console.log(brandcode_arr);
                                  _.forOwn(replaceParam, function(value, key) {
                                    query = query.replace(new RegExp(`@${key}@`, "g"), value) 
                                  });

                                  // console.log(query);
                                  let data =  await request.query(query);
                                  let employeelist = script=='PROCEDURE' ? data[0][0] : data[0];
                                  for (let j = 0; j < employeelist.length; j++) {
                          
                                    let employee_id = employeelist[j].employee_id;
                                    if(employee_id){
                                      employee.push({
                                        no:i+1,
                                        employee_id:employee_id,
                                        no_appr:no_appr,
                                        position_appr:position_appr
                                      });
                                    }
                                  }
                                }else if(type_result==='FIXED'){
                                  let employee_id = workflow[i].employee_id;
                                  if(employee_id){
                                    employee.push({
                                      no:i+1,
                                      employee_id:employee_id,
                                      no_appr:no_appr,
                                      position_appr:position_appr
                                    });
                                  }
                                }else if(type_result==='JAVASCRIPT'){      
                          
                                  let sqlgetRegion = `SELECT * FROM m_region WHERE region_id=${region_id}`;
                                  let dataregion = await request.query(sqlgetRegion);
                          
                                
                                  let region = dataregion[0];
                                  let rtd = region[0].rtd;
                                  let non_rtd = region[0].non_rtd;
                                
                                
                                  let sqlGetBrandEmployee = `SELECT 
                                  CASE WHEN type_rtd = 'NON RTD' THEN ${non_rtd} WHEN type_rtd = 'RTD' THEN ${rtd} END employee_id, 
                                  ${no_appr} AS no_appr
                                  FROM m_brand WHERE brand_code IN(${brandcode_arr})`;
                                                    
                                  let dataemployee = await request.query(sqlGetBrandEmployee);
                                  let employee_id = dataemployee[0].employee_id;
                                  
                                  if(employee_id){
                                    employee.push({
                                      no:i+1,
                                      employee_id:employee_id,
                                      no_appr:no_appr,
                                      position_appr:position_appr
                                    });
                                  }
                                  
                                }
                                
                              }
                              //console.log('masuk sini dong',employee.length);
        
                              if(employee.length){
                                employee = _.uniqBy(employee,'employee_id');
                                
                                let existingOrder = {};
                                const tranformEmployee = employee.map(data => {
                                  let no_appr = data.no_appr
                                  if (_.isEmpty(existingOrder)) {
                                    no_appr = 1
                                    existingOrder[data.no_appr] = 1
                                  } else {
                                    if (existingOrder[no_appr]) {
                                      no_appr = existingOrder[no_appr]
                                    } else {
                                      no_appr = Object.keys(existingOrder).length + 1;
                                      existingOrder[data.no_appr] = no_appr
                                    }
                                  }
                                  const temp = {
                                    ...data,
                                    no_appr
                                  }
                                  return temp
                                });

                                await request.query(`DELETE FROM proposal_approval WHERE proposal_id='${proposal_id}'`);
                                for (let i = 0; i < tranformEmployee.length; i++) {
                            
                                  let proposal_approval_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                                  let employee_id = tranformEmployee[i].employee_id;
                                  let no_appr = tranformEmployee[i].no_appr;
                                  let position_appr = tranformEmployee[i].position_appr;
                                  let flag = 0
                                  let token = '';
                                  //position_appr == 'PM'|| position_appr == 'PE' || position_appr == 'DIST'
                                  if(no_appr==1){
                                    flag = 1;
                                    token = md5(strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100,200));
                                  } else {
                                      flag = 0;
                                      token = '';
                                  }
                            
                                  let SqlInsertDataEmployeeProposal = `INSERT INTO proposal_approval
                                  (proposal_approval_id, proposal_id, employee_id, status_approval_id,no_appr, flag,token,created_by, created_date, updated_by, updated_date)
                                  VALUES(${proposal_approval_id}, ${proposal_id},'${employee_id}',1,${no_appr},${flag},'${token}','${created_by}',now(),'${created_by}',now())`;
                                  //console.log(SqlInsertDataEmployeeProposal);
                                  await request.query(SqlInsertDataEmployeeProposal);
                                  let sqlupdateProposalStatus = `UPDATE proposal SET total_approval=${tranformEmployee.length},
                                  workflow_id=${workflow_id},status_id=10 
                                  WHERE proposal_id = ${proposal_id}`;
                                  //console.log(sqlupdateProposalStatus);
                                  await request.query(sqlupdateProposalStatus);
                                  
                                }

                                let sqlgetApprovalFirst = `SELECT no_appr FROM proposal_approval WHERE proposal_id='${proposal_id}' ORDER BY no_appr ASC LIMIT 1`;
                                let dataapprovalterkecil = await request.query(sqlgetApprovalFirst);
                                let approvalterkecil = dataapprovalterkecil[0];
                                let no_appr = approvalterkecil.length > 0 ? approvalterkecil[0].no_appr : 1;


                                let deleteDataLock = `DELETE FROM lock_create_eprop WHERE islock = 'Y' AND nip='${nik}'`;
                                await request2.query(deleteDataLock);

                                SendEmailApproval(proposal_id,no_appr);
                                return res.success({
                                  result: proposal_id,
                                  message: "Create Proposal successfully"
                                });
                          
                              }else{
                          
                                await request.query(`DELETE FROM proposal WHERE proposal_id='${proposal_id}'`);
                                await request.query(`DELETE FROM proposal_email_distributor WHERE proposal_id='${proposal_id}'`);
                                await request.query(`DELETE FROM proposal_executor WHERE proposal_id='${proposal_id}'`);
                                await request.query(`DELETE FROM proposal_branch WHERE proposal_id='${proposal_id}'`);
                                await request.query(`DELETE FROM proposal_activity WHERE proposal_id='${proposal_id}'`);
                                await request.query(`DELETE FROM proposal_market WHERE proposal_id='${proposal_id}'`);
                                await request.query(`DELETE FROM proposal_variant WHERE proposal_id='${proposal_id}'`);
                                await request.query(`DELETE FROM proposal_distributor WHERE proposal_id='${proposal_id}'`);
                                await request.query(`DELETE FROM proposal_budget WHERE proposal_id='${proposal_id}'`);
                                await request.query(`DELETE FROM proposal_file WHERE proposal_id='${proposal_id}'`);
                          
                                return res.error({
                                  message: "Workflow tidak terbentuk harap periksa settingan workflow"
                                });
                          
                              }
        
        
                          }else{
                            return res.success({
                              result: proposal_id,
                              message: "Fetch data successfully"
                            });
                          }
                          
                      }
              
                    }else if(approval.length > 1){
                      return res.error({
                        message: `Activity dengan code ${activity_code.toString()} tidak dalam workflow approval yang sama approval tidak dapat dilakukan`
                      });
                    
                    }else{
                      return res.error({
                        message: `Workflow tidak ditemukan`
                      });
        
                    }
          
              } catch (err) {

                console.log(err);

                const request = await DBPROP.promise();

                await request.query(`DELETE FROM proposal WHERE proposal_id='${proposal_id}'`);
                await request.query(`DELETE FROM proposal_email_distributor WHERE proposal_id='${proposal_id}'`);
                await request.query(`DELETE FROM proposal_executor WHERE proposal_id='${proposal_id}'`);
                await request.query(`DELETE FROM proposal_branch WHERE proposal_id='${proposal_id}'`);
                await request.query(`DELETE FROM proposal_activity WHERE proposal_id='${proposal_id}'`);
                await request.query(`DELETE FROM proposal_market WHERE proposal_id='${proposal_id}'`);
                await request.query(`DELETE FROM proposal_variant WHERE proposal_id='${proposal_id}'`);
                await request.query(`DELETE FROM proposal_distributor WHERE proposal_id='${proposal_id}'`);
                await request.query(`DELETE FROM proposal_budget WHERE proposal_id='${proposal_id}'`);
                await request.query(`DELETE FROM proposal_file WHERE proposal_id='${proposal_id}'`);

                // return res.error(err);


                return res.error({
                  message: `Create Proposal belum berhasil disebabkan proses antrian di dalam System. tunggu beberapa detik lalu klik tombol simpan sekali lagi`
                });

              }

          })


    }else{

      return res.error({
        message: `Create Proposal belum berhasil disebabkan proses antrian di dalam System. tunggu beberapa detik lalu klik tombol simpan sekali lagi`
      });

    }

    // }
    
    
  },

  getfile: async function(req, res) {
    //   const user = req.param('user')
    // console.log('s')
      const record = req.param('record')
      const filename = req.param('filename');
      const filesamaDir = glob.GlobSync(path.resolve(dokumentPath('dokumenproposal', record), filename))

      if (filesamaDir.found.length > 0) {
          console.log(filesamaDir.found[0]) 
          var lastItemAkaFilename = path.basename(filesamaDir.found[0])
          return res.download(filesamaDir.found[0], lastItemAkaFilename)
      }
      

      const filesamaDir2 = glob.GlobSync(path.resolve(dokumentPath('dokumenproposal','files'), filename))
      if (filesamaDir2.found.length > 0) {
          console.log(filesamaDir2.found[0]) 
          var lastItemAkaFilename = path.basename(filesamaDir2.found[0])
          return res.download(filesamaDir2.found[0], lastItemAkaFilename)
      }

      return res.error('Failed, File Not Found');
  }, 

  
  checkbudget: async function (req, res) {
    const {
      budget_id,activity_code,activity,branch_code,branch,brand_code,brand,
      variant,budgetactivity,budgetbrand,budgettoapprove,division_code,budget_year,
      start_date,end_date,periode,nik
    } = req.body;

    // console.log(req.body);
    // console.log("kesini checkbudget");

    const requestData = DB.pool.request();




    let sqlCheckStatusLock = `SELECT COUNT(1) AS jumlahData  FROM lock_create_eprop WHERE islock = 'Y' 
    AND nip <> '${nik}' AND activity_code = '${activity_code}'`;
    console.log('sqlCheckStatusLock ',sqlCheckStatusLock);
    let checkStatusLock = await requestData.query(sqlCheckStatusLock);
    let jumlahData = checkStatusLock.recordset.length > 0 ? checkStatusLock.recordset[0].jumlahData : 0;

    if(jumlahData > 0){
      return res.error({
        message: 'Activity sedang digunakan oleh user lain harap tunggu 5 sampai 10 menit kedepan'
      });
    }else{


      try {
        const request = await DBPROP.promise();
  
        let companyfilter = ``;
        let active = 0;
        let company_id = undefined;
        let bulan_array = periode;
        let bulan_arr = "";
        for (const datas of bulan_array) {
          bulan_arr += ",'" + datas + "'"
        }
        bulan_arr = bulan_arr.substring(1);
  
  
        let sqlGetActivity = `SELECT * FROM m_activity ma where activity_code='${activity_code}'`;
        let dataactivitys = await request.query(sqlGetActivity);
        let dataactivity = dataactivitys[0][0];
  
        let listvariant = [];
        if(dataactivity){
  
          let ispercentage = dataactivity.ispercentage;
      
          let sqlGetVariant = `SELECT * FROM m_variant  where variant_id='${variant[0].variant_id}'`;
          let dataaVariants = await request.query(sqlGetVariant);
          let dataVariant = dataaVariants[0][0];
          let jumlah_percentage = dataVariant.jumlah_percentage ? dataVariant.jumlah_percentage : 0;
  
  
  
          if(ispercentage=='Y' && variant.length > 1){
            return res.error({
              message: "Activity Hanya bisa 1 Variant"
            });
          }else{
                  let sqlgetCompanyFordoc = `SELECT mc.company_code,mc.company_id FROM m_brand
                  JOIN m_company mc ON mc.company_id = m_brand.company_id
                  WHERE brand_code IN ('${brand_code}') 
                  GROUP BY m_brand.company_id`;
                  //console.log(sqlgetCompanyFordoc);
  
                  for (let i = 0; i < variant.length; i++) {
  
                    let sqlGetVariant = `SELECT * FROM m_variant  where variant_id='${variant[i].variant_id}'`;
                    let dataaVariants = await request.query(sqlGetVariant);
                    let dataVariant = dataaVariants[0][0];
                    listvariant.push(dataVariant);
                    
                  }
            
                  let dataCompanyFordoc = await request.query(sqlgetCompanyFordoc);
                  company_id = dataCompanyFordoc[0][0].company_id;
            
                  if(budget_year==2020){
                    active = 0;
                    companyfilter = `AND activity.company_id=${company_id}`
                  }else{
                    active = 1;
                  }
            
                  let obj_arr = [];
                  for (let i = 0; i < periode.length; i++) {
                    let bulan = periode[i];
            
                    
                    
                    let sqlgetbudgetactivity = `SELECT COALESCE(SUM(budget),0) as total,m_group.group_name,m_brand.brand_desc 
                    FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
                    LEFT JOIN m_group ON budget.group_id = m_group.id_group 
                    WHERE budget.activity_code = '${activity_code}'
                    ${companyfilter}
                    AND budget.year = '${budget_year}' 
                    AND budget.brand_code = '${brand_code}'
                    AND budget.bulan = ${bulan}`;
                    
  
                    let sqlCekReversal = ` SELECT COALESCE(SUM(pr.reverse_amount),0) AS reverse_amount 
                    FROM proposal_budget pb,proposal_reverse pr,proposal p 
                    WHERE pb.proposal_budget_id = pr.proposal_budget_id
                    AND pb.brand_code = '${brand_code}'
                    AND pb.activity_id = '${activity_code}'
                    AND p.proposal_id = pb.proposal_id
                    AND pb.bulan is not null
                    AND p.status_id <> 99
                    AND p.budget_year = ${budget_year}
                    AND pb.bulan = ${bulan}`;
  
                    // console.log(sqlCekReversal);
  
                    
                    let getdataReversal = await request.query(sqlCekReversal);
                    let reversalAmount = getdataReversal[0][0].reverse_amount;
  
            
            
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
  
  
                    // console.log(sqlgetbudgetperactivity);
            
            
                    let databudgetperactivity = await request.query(sqlgetbudgetperactivity);
                    let budgetperactivity = Number(databudgetperactivity[0][0].total);
                    let sisabudgetperbulan = budgetactivity - (budgetperactivity - reversalAmount);
                  
                  
            
                    let sqlgetbudgetbrand = `SELECT COALESCE(SUM(budget),0) as total,m_brand.brand_desc 
                    FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code  
                    WHERE budget.year = '${budget_year}' AND budget.brand_code = '${brand_code}'`;
                    //console.log(sqlgetbudgetbrand);
            
            
                    let databudgetbrand = await request.query(sqlgetbudgetbrand);
                    let budgetbrand = Number(databudgetbrand[0][0].total);
            
            
                    let sqlgetbudgetperbrand = `SELECT COALESCE(SUM(budget),0) as total FROM proposal_budget 
                    INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id
                    where brand_code = '${brand_code}' AND budget_year = '${budget_year}' AND 
                    proposal.status_id NOT IN(99) 
                    AND proposal.budget_year='${budget_year}'
                    AND proposal_budget.bulan IS NOT NULL`;
            
                    //console.log(sqlgetbudgetperbrand);
            
                    let databudgetperbrand = await request.query(sqlgetbudgetperbrand);
                    let budgetperbrand = Number(databudgetperbrand[0][0].total);
                    let totalbudgetbrand = budgetbrand - budgetperbrand;   
                    let bulan_periode = convertBulan(bulan);
                    
                    let budget_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
                    
            
            
                    let obj = {
                      budget_id: budget_id,
                      activity_code: activity_code,
                      activity: activity,
                      branch_code: branch_code,
                      branch:branch,
                      brand_code:brand_code,
                      brand: brand,
                      variant: listvariant,
                      bulan:bulan_periode,
                      bulan_periode:bulan,
                      budgetactivity: sisabudgetperbulan,
                      budgetbrand: totalbudgetbrand,
                      budgettoapprove: budgettoapprove,
                      ispercentage:ispercentage,
                      jumlah_percentage:jumlah_percentage,
                      division_code:division_code,
                      periode:bulan,
                    }
            
            
            
                    obj_arr.push(obj);
                      
                  }
            
                  let checklimitbudget = [];
                  let checktotalBudgetActivity = 0;
                  for (let i = 0; i < obj_arr.length; i++) {
                    let budgetactivity = obj_arr[i].budgetactivity;
                    let bulan = obj_arr[i].bulan_periode;
            
                    checktotalBudgetActivity = checktotalBudgetActivity + budgetactivity;
                    if(budgetactivity==0){
                      checklimitbudget.push(`Budget Belum tersedia atau budget periode ${moment(bulan,'MM').format('MMMM')} sudah habis`);
                    }
                    
                  }
            
            
                  let sqlgetbudgetactivityall = `SELECT COALESCE(SUM(budget),0) as total,m_group.group_name,m_brand.brand_desc 
                  FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
                  LEFT JOIN m_group ON budget.group_id = m_group.id_group 
                  WHERE budget.activity_code = '${activity_code}' 
                  ${companyfilter}
                  AND budget.year = '${budget_year}'
                  AND budget.bulan IN (${bulan_arr})
                  AND budget.brand_code = '${brand_code}'`;
  
  
                  let sqlCekReversal = ` SELECT COALESCE(SUM(pr.reverse_amount),0) AS reverse_amount 
                  FROM proposal_budget pb,proposal_reverse pr,proposal p 
                  WHERE pb.proposal_budget_id = pr.proposal_budget_id
                  AND pb.brand_code = '${brand_code}'
                  AND pb.activity_id = '${activity_code}'
                  AND p.proposal_id = pb.proposal_id
                  AND pb.bulan is not null
                  AND p.status_id <> 99
                  AND p.budget_year = ${budget_year}
                  AND pb.bulan IN (${bulan_arr})`;
  
                  
                  let getdataReversal = await request.query(sqlCekReversal);
                  let reversalAmount = getdataReversal[0][0].reverse_amount;
  
  
                  // console.log(sqlgetbudgetactivityall);
                  let databudgetactivityall = await request.query(sqlgetbudgetactivityall);
                  let budgetactivityall = Number(databudgetactivityall[0][0].total);
            
                  
            
            
                  let sqlgetbudgetperactivityall = `SELECT COALESCE(SUM(budget),0) as total FROM proposal_budget 
                  INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id 
                  WHERE brand_code ='${brand_code}' AND budget_year = '${budget_year}'
                  AND proposal.status_id NOT IN (99)
                  ${companyfilter}
                  AND proposal_budget.activity_id = '${activity_code}'
                  AND proposal_budget.bulan IN (${bulan_arr})`;
  
  
                  // console.log(sqlgetbudgetperactivityall);
                  let databudgetperactivityall = await request.query(sqlgetbudgetperactivityall);
                  let budgetperactivityall = Number(databudgetperactivityall[0][0].total);
                  let totalBudgetActivity = budgetactivityall - (budgetperactivityall - reversalAmount);
            
            
                  for (let i = 0; i < obj_arr.length; i++) {
                    
                    obj_arr[i].totalBudgetActivity = totalBudgetActivity;
                    
                  }
            
                  obj_arr = _.orderBy(obj_arr, ['periode'], ['asc']);
            
                  
  
                  if(checklimitbudget.length > 0){
                    return res.error({
                      message: checklimitbudget.toString()
                    });
                  }else{

                    if(jumlahData == 0){
                      let insertLockEprop = `INSERT INTO lock_create_eprop
                      (createdby, updatedby, nip, datelock, islock,activity_code)
                      VALUES('${nik}', '${nik}', '${nik}', getdate(), 'Y','${activity_code}')`;
                      await requestData.query(insertLockEprop);
                    }
                    return res.success({
                      result: obj_arr,
                      message: "Create proposal successfully"
                    });
                  }
  
          }
  
        }else{
          return res.error({
            message: "Activity tidak dikenali"
          });
        }
  
      }catch (err) {
        return res.error(err);
      }
      
    }

  },
  dummyCreate: async function (req, res) {
    console.log('req Body ?', JSON.parse(req.body.document))
    var proposal_id = uuid()
    const generatedID = proposal_id.toUpperCase();

    var uploadFile = req.file("file");
      uploadFile.upload({},
        async function onUploadComplete(err, files) {
          if (err) {
            let errMsg = err.message
            return res.error(errMsg)
          }
          console.log('files', files)
          for (const file of files) {
            console.log('filename', file.filename) 
            fs.mkdirSync(dokumentPath( 'dokumenproposal', generatedID), {
              recursive: true
            })
            const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( 'dokumenproposal', generatedID), file.filename) + '*')
            if (filesamaDir.found.length > 0) {
                console.log('isexist file nama sama', filesamaDir.found[0])
                fs.unlinkSync(filesamaDir.found[0])
            }
            fs.renameSync(file.fd, path.resolve(dokumentPath( 'dokumenproposal', generatedID), file.filename))
          } 
          //logic db
    })
    
    return res.success({
      result: 'OK',
      message: "Fetch data successfully"
    });
  },



  generateApproval: async function (req, res) {
    const {
      proposal_id,budget_year,doc_no,proposal_date,user_id,title,region_id,
      company_code,division_code,month_proposal,mechanism,kpi,objective,
      total_budget,total_target,status_id,sales_target,avg_sales,avg_sales_target,
      cost_ratio,brand_text,start_date,end_date,background,created_by,
      created_date,executor,emaildistributor,budget,markettype,distributor,file,
      referensi_no
    } = JSON.parse(req.body.document);
    const request = await DBPROP.promise();

    let activity_code = budget.map(function (item) {
      return item['activity_code'];
    });

    let ActivityvalueIN = "";
    for (const datas of activity_code) {
      ActivityvalueIN += "," + datas + ""
    }
    ActivityvalueIN = ActivityvalueIN.substring(1);

    let sqlgetApproval = `SELECT * FROM workflow where division = '${division_code}' AND activity LIKE ('%${ActivityvalueIN}%')`;

    // console.log(sqlgetApproval);
    let dataapproval = await request.query(sqlgetApproval);
    let approval = dataapproval[0];

    if(approval.length==0){
      let sqlgetApproval = `SELECT * FROM workflow where division = '${division_code}'`;
      // console.log(sqlgetApproval);
      dataapproval = await request.query(sqlgetApproval);
      approval = dataapproval[0];
    }
    // console.log(approval.length);

    let workflow_id = approval.length > 0 && status_id!=0 ? `'${approval[0].workflow_id}'` : `NULL`;
    let brandcode = budget.map(function (item) {
        return item['brand_code'];
    });


    let brandcode_arr = "";
    for (const datas of brandcode) {
      brandcode_arr += ",'" + datas + "'"
    }
    brandcode_arr = brandcode_arr.substring(1);

    let branchcode_arr = "";
    for (const datas of branchcode) {
      branchcode_arr += ",'" + datas + "'"
    }
    branchcode_arr = branchcode_arr.substring(1);

    
    let sqlgetWorkflow = `SELECT * FROM v_workflow_position WHERE active = 1 AND workflow_id = ${workflow_id} AND ${total_budget} > min_limit ORDER BY no_appr ASC`;
    let dataworkflow = await request.query(sqlgetWorkflow);

    let workflow = dataworkflow[0];
    let employee = [];
    for (let i = 0; i < workflow.length; i++) {

      let type_result = workflow[i].type_result;
      let no_appr = workflow[i].no_appr;
      let position_appr = workflow[i].position_desc;
      let query = workflow[i].query;
      let script = workflow[i].script;

      if(type_result==='QUERY' && query){
    
        let position = workflow[i].position_desc;
        let replaceParam = {
          brandcode_arr: brandcode_arr,
          branchcode_arr:branchcode_arr,
          division_code:division_code,
          position:`'${position}'`,
          region_id:region_id
        }
        _.forOwn(replaceParam, function(value, key) {
          query = query.replace(new RegExp(`@${key}@`, "g"), value) 
        });
        console.log('2 ',query);
        let data =  await request.query(query);
        let employeelist = script=='PROCEDURE' ? data[0][0] : data[0];
        for (let j = 0; j < employeelist.length; j++) {

          let employee_id = employeelist[j].employee_id;
          employee.push({
            no:i+1,
            employee_id:employee_id,
            no_appr:no_appr,
            position_appr:position_appr
          });
          
        }
      }else if(type_result==='FIXED'){
        let employee_id = workflow[i].employee_id;
        employee.push({
          no:i+1,
          employee_id:employee_id,
          no_appr:no_appr,
          position_appr:position_appr
        });
      }else if(type_result==='JAVASCRIPT'){
    
        let sqlgetRegion = `SELECT * FROM m_region WHERE region_id=${region_id}`;
        let dataregion = await request.query(sqlgetRegion);

      
        let region = dataregion[0];
        let rtd = region[0].rtd;
        let non_rtd = region[0].non_rtd;
      
      
        let sqlGetBrandEmployee = `SELECT 
        CASE WHEN type_rtd = 'NON RTD' THEN ${non_rtd} WHEN type_rtd = 'RTD' THEN ${rtd} END employee_id, 
        ${no_appr} AS no_appr
        FROM m_brand WHERE brand_code IN(${brandcode_arr})`;
            
        let dataemployee = await request.query(sqlGetBrandEmployee);
        let employee = dataemployee[0].employee_id;
        
        employee.push({
          no:i+1,
          employee_id:employee_id,
          no_appr:no_appr,
          position_appr:position_appr
        });
        
      }
      
    }
    

    if(employee.length){

      employee = _.uniqBy(employee,'employee_id');
      await request.query(`DELETE FROM proposal_approval WHERE proposal_id='${proposal_id}'`);
      for (let i = 0; i < employee.length; i++) {
  
        let proposal_approval_id = strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100000,999999);
        let employee_id = employee[i].employee_id;
        let no_appr = employee[i].no_appr;
        let flag = 0
        let token = '';
        
      //position_appr == 'PM'|| position_appr == 'PE' || position_appr == 'DIST' || 
      if(no_appr==1){
          flag = 1;
          token = md5(strtotime(moment().format('Y-M-D H:m:s')) +''+ mt_rand(100,200));
      } else {
          flag = 0;
          token = '';
      }
  
        let SqlInsertDataEmployeeProposal = `INSERT INTO proposal_approval
        (proposal_approval_id, proposal_id, employee_id, status_approval_id,no_appr, flag,token,created_by, created_date, updated_by, updated_date)
        VALUES(${proposal_approval_id}, ${proposal_id},'${employee_id}',1,${no_appr},${flag},'${token}','${created_by}',now(),'${created_by}',now())`;
        // console.log(SqlInsertDataEmployeeProposal);
        await request.query(SqlInsertDataEmployeeProposal);
        let sqlupdateProposalStatus = `UPDATE proposal SET total_approval=${employee.length},
        workflow_id=${workflow_id},status_id=10 
        WHERE proposal_id = ${proposal_id}`;
        //console.log(sqlupdateProposalStatus);
        await request.query(sqlupdateProposalStatus);
        
      }
    
      return res.success({
        result: proposal_id,
        message: "Create Proposal successfully"
      });

    }else{

      return res.error({
        message: "Workflow tidak terbentuk harap periksa settingan workflow"
      });

    }

  },
  

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